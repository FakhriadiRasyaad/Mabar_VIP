import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateCallback, redactCallbackPayload, type DuitkuCallbackData } from '@/lib/duitku';
import { createAuditLog } from '@/lib/notifications';

/**
 * POST /api/payments/duitku/callback
 *
 * Receives payment notifications from Duitku.
 * This endpoint:
 * 1. Validates the callback signature.
 * 2. Checks idempotency (won't process the same order twice).
 * 3. Calls the atomic allocate_queue_number function on success.
 * 4. Logs everything for audit.
 *
 * MUST respond with "SUCCESS" for Duitku to stop retrying.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let callbackData: DuitkuCallbackData;

  try {
    // Duitku sends callbacks as form-urlencoded or JSON
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      callbackData = await request.json();
    } else {
      const formData = await request.formData();
      callbackData = {
        merchantCode: formData.get('merchantCode') as string || '',
        amount: formData.get('amount') as string || '',
        merchantOrderId: formData.get('merchantOrderId') as string || '',
        productDetail: formData.get('productDetail') as string || '',
        additionalParam: formData.get('additionalParam') as string || '',
        paymentCode: formData.get('paymentCode') as string || '',
        resultCode: formData.get('resultCode') as string || '',
        reference: formData.get('reference') as string || '',
        signature: formData.get('signature') as string || '',
      };
    }
  } catch {
    await createAuditLog({
      action: 'callback_parse_error',
      entityType: 'payment',
      metadata: { error: 'Failed to parse callback body' },
    });
    return new NextResponse('Bad Request', { status: 400 });
  }

  // ---- Validate signature ----
  const validation = validateCallback(callbackData);

  if (!validation.valid) {
    await createAuditLog({
      action: 'callback_invalid_signature',
      entityType: 'payment',
      metadata: {
        merchant_order_id: callbackData.merchantOrderId,
        received_merchant_code: callbackData.merchantCode,
      },
    });
    return new NextResponse('Bad Signature', { status: 400 });
  }

  const { merchantOrderId, amount, reference, resultCode } = callbackData;
  const redactedPayload = redactCallbackPayload(callbackData);

  // ---- Find the order ----
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, catalog_id, star_id, amount, payment_status')
    .eq('merchant_order_id', merchantOrderId)
    .single();

  if (orderError || !order) {
    await createAuditLog({
      action: 'callback_order_not_found',
      entityType: 'payment',
      metadata: {
        merchant_order_id: merchantOrderId,
        reference,
      },
    });
    // Still return success to Duitku to prevent infinite retries
    return new NextResponse('SUCCESS', { status: 200 });
  }

  // ---- Validate amount matches ----
  if (parseInt(amount, 10) !== order.amount) {
    await createAuditLog({
      action: 'callback_amount_mismatch',
      entityType: 'payment',
      entityId: order.id,
      metadata: {
        expected_amount: order.amount,
        received_amount: amount,
        merchant_order_id: merchantOrderId,
      },
    });
    return new NextResponse('Amount Mismatch', { status: 400 });
  }

  // ---- Update payment record ----
  await supabase
    .from('payments')
    .update({
      provider_reference: reference,
      provider_transaction_id: reference,
      status: validation.isSuccess ? 'success' : 'failed',
      callback_payload_redacted: redactedPayload,
      last_callback_at: new Date().toISOString(),
    })
    .eq('order_id', order.id);

  // ---- IDEMPOTENCY CHECK ----
  // If order is already paid, don't process again
  if (order.payment_status === 'paid') {
    await createAuditLog({
      action: 'callback_duplicate_ignored',
      entityType: 'payment',
      entityId: order.id,
      metadata: {
        merchant_order_id: merchantOrderId,
        reference,
        result_code: resultCode,
      },
    });
    return new NextResponse('SUCCESS', { status: 200 });
  }

  // If already failed/expired/cancelled, don't reprocess as success
  if (['payment_failed', 'expired', 'cancelled', 'refunded'].includes(order.payment_status)) {
    await createAuditLog({
      action: 'callback_on_terminal_status',
      entityType: 'payment',
      entityId: order.id,
      metadata: {
        current_status: order.payment_status,
        result_code: resultCode,
        merchant_order_id: merchantOrderId,
      },
    });
    return new NextResponse('SUCCESS', { status: 200 });
  }

  // ---- Process based on result code ----
  if (validation.isSuccess) {
    // ---- PAYMENT SUCCESS ----
    // Use the atomic function to allocate queue number + update status + create notification
    // This runs in a single database transaction to prevent race conditions
    const { data: queueNumber, error: allocError } = await supabase.rpc(
      'allocate_queue_number',
      {
        p_order_id: order.id,
        p_catalog_id: order.catalog_id,
      }
    );

    if (allocError) {
      console.error('Queue allocation error:', allocError);
      await createAuditLog({
        action: 'callback_queue_allocation_failed',
        entityType: 'payment',
        entityId: order.id,
        metadata: {
          error: allocError.message,
          merchant_order_id: merchantOrderId,
        },
      });
      // Return 500 so Duitku retries
      return new NextResponse('Internal Error', { status: 500 });
    }

    // Update duitku_reference on order
    await supabase
      .from('orders')
      .update({ duitku_reference: reference })
      .eq('id', order.id);

    await createAuditLog({
      action: 'payment_confirmed',
      entityType: 'payment',
      entityId: order.id,
      metadata: {
        queue_number: queueNumber,
        merchant_order_id: merchantOrderId,
        reference,
        amount: order.amount,
      },
    });
  } else {
    // ---- PAYMENT FAILED ----
    const newStatus = resultCode === '02' ? 'cancelled' : 'payment_failed';

    await supabase
      .from('orders')
      .update({
        payment_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await createAuditLog({
      action: 'payment_failed',
      entityType: 'payment',
      entityId: order.id,
      metadata: {
        result_code: resultCode,
        new_status: newStatus,
        merchant_order_id: merchantOrderId,
      },
    });
  }

  // Must return SUCCESS for Duitku
  return new NextResponse('SUCCESS', { status: 200 });
}
