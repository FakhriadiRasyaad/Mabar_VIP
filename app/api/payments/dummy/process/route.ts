import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/notifications';

/**
 * POST /api/payments/dummy/process
 * Dummy payment simulator processor for development & sandbox testing.
 * Runs the exact same atomic queue allocation & notification flow as the real Duitku callback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, trackingToken, action } = body;

    if (!orderId || !trackingToken || !['success', 'failed'].includes(action)) {
      return NextResponse.json(
        { error: 'Parameter tidak valid.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch order and verify tracking token
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, catalog_id, star_id, amount, payment_status, tracking_token, merchant_order_id')
      .eq('id', orderId)
      .eq('tracking_token', trackingToken)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan atau token tidak valid.' },
        { status: 404 }
      );
    }

    // Idempotency check: already processed
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Pesanan sudah lunas.',
        trackingToken: order.tracking_token,
      });
    }

    if (['payment_failed', 'expired', 'cancelled'].includes(order.payment_status)) {
      return NextResponse.json(
        { error: `Pesanan sudah dalam status: ${order.payment_status}` },
        { status: 400 }
      );
    }

    if (action === 'success') {
      // Execute atomic queue allocation function (single PostgreSQL transaction)
      const { data: queueNumber, error: allocError } = await supabase.rpc(
        'allocate_queue_number',
        {
          p_order_id: order.id,
          p_catalog_id: order.catalog_id,
        }
      );

      if (allocError) {
        console.error('Dummy queue allocation error:', allocError);
        return NextResponse.json(
          { error: 'Gagal mengalokasikan nomor antrean.' },
          { status: 500 }
        );
      }

      // Update payment record
      await supabase
        .from('payments')
        .update({
          status: 'success',
          last_callback_at: new Date().toISOString(),
          callback_payload_redacted: {
            mode: 'dummy_simulator',
            order_id: order.id,
            timestamp: new Date().toISOString(),
          },
        })
        .eq('order_id', order.id);

      // Audit log
      await createAuditLog({
        action: 'payment_confirmed_dummy',
        entityType: 'payment',
        entityId: order.id,
        metadata: {
          queue_number: queueNumber,
          merchant_order_id: order.merchant_order_id,
          amount: order.amount,
          mode: 'dummy_simulator',
        },
      });

      return NextResponse.json({
        success: true,
        queueNumber,
        trackingToken: order.tracking_token,
      });
    } else {
      // Simulated payment failure
      await supabase
        .from('orders')
        .update({
          payment_status: 'payment_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          last_callback_at: new Date().toISOString(),
        })
        .eq('order_id', order.id);

      await createAuditLog({
        action: 'payment_failed_dummy',
        entityType: 'payment',
        entityId: order.id,
        metadata: {
          merchant_order_id: order.merchant_order_id,
          mode: 'dummy_simulator',
        },
      });

      return NextResponse.json({
        success: false,
        message: 'Pembayaran simulasi dibatalkan atau gagal.',
        trackingToken: order.tracking_token,
      });
    }
  } catch (error) {
    console.error('Dummy payment process error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
