import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDuitkuPayment, isDummyPaymentMode } from '@/lib/duitku';
import {
  validateDisplayName,
  validateGuestMessage,
  validateGuestAnswers,
  sanitizeWithLimit,
} from '@/lib/validation';
import { generateToken, generateMerchantOrderId } from '@/lib/security';
import { createAuditLog } from '@/lib/notifications';
import { parseCatalogBundles, parseCatalogFastTrack } from '@/lib/bundles';

/**
 * POST /api/checkout
 * Creates an order and initiates Duitku payment.
 * Guest does NOT need an account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catalogId, bundleId, isFastTrack, guestDisplayName, guestMessage, guestAnswers, email } = body;

    // ---- Validate required fields ----
    if (!catalogId || !guestDisplayName || !email) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Pastikan semua field wajib sudah diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ---- Fetch catalog with fields from database ----
    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .select(`
        id,
        star_id,
        name,
        description,
        price_amount,
        is_active,
        slug,
        catalog_fields (
          id,
          label,
          field_key,
          field_type,
          is_required,
          options,
          validation_rules
        )
      `)
      .eq('id', catalogId)
      .single();

    if (catalogError || !catalog) {
      return NextResponse.json(
        { error: 'Katalog tidak ditemukan.' },
        { status: 404 }
      );
    }

    // ---- Check catalog is active ----
    if (!catalog.is_active) {
      return NextResponse.json(
        { error: 'Katalog ini sedang tidak tersedia.' },
        { status: 400 }
      );
    }

    // ---- Check star is active ----
    const { data: star } = await supabase
      .from('stars')
      .select('id, is_active, display_name')
      .eq('id', catalog.star_id)
      .single();

    if (!star || !star.is_active) {
      return NextResponse.json(
        { error: 'Star tidak tersedia saat ini.' },
        { status: 400 }
      );
    }

    // ---- Validate guest display name ----
    const nameValidation = validateDisplayName(guestDisplayName);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.errors[0].message, errors: nameValidation.errors },
        { status: 400 }
      );
    }

    // ---- Validate guest message ----
    const messageValidation = validateGuestMessage(guestMessage || '');
    if (!messageValidation.valid) {
      return NextResponse.json(
        { error: messageValidation.errors[0].message, errors: messageValidation.errors },
        { status: 400 }
      );
    }

    // ---- Validate guest answers against catalog fields ----
    const fields = (catalog.catalog_fields || []).map((f: Record<string, unknown>) => ({
      field_key: f.field_key as string,
      label: f.label as string,
      field_type: f.field_type as string,
      is_required: f.is_required as boolean,
      options: f.options as string[] | null,
      validation_rules: f.validation_rules as Record<string, number> | null,
    }));

    const answersValidation = validateGuestAnswers(guestAnswers || {}, fields);
    if (!answersValidation.valid) {
      return NextResponse.json(
        { error: answersValidation.errors[0].message, errors: answersValidation.errors },
        { status: 400 }
      );
    }

    // ---- Sanitize inputs ----
    const sanitizedName = sanitizeWithLimit(guestDisplayName, 50);
    const sanitizedMessage = sanitizeWithLimit(guestMessage || '', 200);
    const sanitizedAnswers: Record<string, any> = {};
    for (const [key, value] of Object.entries(guestAnswers || {})) {
      sanitizedAnswers[key] = sanitizeWithLimit(String(value), 500);
    }

    // ---- Determine price and bundle metadata ----
    let amount = catalog.price_amount;
    const availableBundles = parseCatalogBundles(catalog);

    if (bundleId && bundleId !== 'base') {
      const matchedBundle = availableBundles.find((b) => b.id === bundleId);
      if (matchedBundle) {
        amount = matchedBundle.price;
        sanitizedAnswers._bundle = {
          id: matchedBundle.id,
          name: matchedBundle.name,
          match_count: matchedBundle.match_count,
          price: matchedBundle.price,
        };
      }
    } else {
      sanitizedAnswers._bundle = {
        id: 'base',
        name: '1 Match',
        match_count: 1,
        price: catalog.price_amount,
      };
    }

    // ---- Determine Fast Track metadata & fee ----
    const fastTrackConfig = parseCatalogFastTrack(catalog);
    const hasFastTrack = Boolean(isFastTrack && fastTrackConfig.enabled);
    const fastTrackFee = hasFastTrack ? fastTrackConfig.fee : 0;

    if (hasFastTrack) {
      amount += fastTrackFee;
      sanitizedAnswers._fast_track = {
        enabled: true,
        fee: fastTrackFee,
      };
    }

    const merchantOrderId = generateMerchantOrderId();
    const trackingToken = generateToken(32);
    const expiryMinutes = parseInt(process.env.ORDER_EXPIRY_MINUTES || '60', 10);

    // ---- Create order ----
    const baseOrderPayload = {
      star_id: catalog.star_id,
      catalog_id: catalog.id,
      guest_display_name: sanitizedName,
      guest_answers: sanitizedAnswers,
      guest_message: sanitizedMessage,
      amount,
      currency: 'IDR',
      payment_status: 'pending_payment',
      tracking_token: trackingToken,
      merchant_order_id: merchantOrderId,
      expires_at: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
    };

    let { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...baseOrderPayload,
        is_fast_track: hasFastTrack,
        fast_track_fee: fastTrackFee,
      })
      .select('id')
      .single();

    // Fallback if is_fast_track column hasn't been migrated yet in DB
    if (orderError && orderError.message?.includes('column')) {
      const fallbackInsert = await supabase
        .from('orders')
        .insert(baseOrderPayload)
        .select('id')
        .single();
      order = fallbackInsert.data;
      orderError = fallbackInsert.error;
    }

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json(
        { error: 'Gagal membuat pesanan. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    // ---- Create payment record ----
    const { error: paymentRecordError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'duitku',
        amount,
        status: 'pending',
      });

    if (paymentRecordError) {
      console.error('Failed to create payment record:', paymentRecordError);
    }

    // ---- Read Payment Gateway Configuration from Database ----
    const { data: dbGatewaySetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'active_payment_gateway')
      .single();

    const activeGateway = (dbGatewaySetting?.value as string) || (isDummyPaymentMode() ? 'dummy' : 'duitku');

    // ---- Payment Gateway Handling ----
    let paymentUrl: string;
    let duitkuReference: string;

    if (activeGateway === 'dummy') {
      duitkuReference = `DUMMY-${merchantOrderId}`;
      paymentUrl = `/checkout/${order.id}/bayar-dummy?token=${trackingToken}`;

      // Update order with dummy reference
      await supabase
        .from('orders')
        .update({ duitku_reference: duitkuReference })
        .eq('id', order.id);

      // Update payment record with dummy reference
      await supabase
        .from('payments')
        .update({ provider: 'dummy', provider_reference: duitkuReference })
        .eq('order_id', order.id);
    } else {
      try {
        const duitkuResponse = await createDuitkuPayment({
          merchantOrderId,
          paymentAmount: amount,
          productDetails: `Mabar: ${catalog.name}${hasFastTrack ? ' [⚡ FAST TRACK]' : ''} - ${star.display_name}`,
          email,
          expiryPeriod: expiryMinutes,
        });

        paymentUrl = duitkuResponse.paymentUrl;
        duitkuReference = duitkuResponse.reference;

        // Update order with reference
        await supabase
          .from('orders')
          .update({ duitku_reference: duitkuReference })
          .eq('id', order.id);

        // Update payment record with reference
        await supabase
          .from('payments')
          .update({ provider: activeGateway, provider_reference: duitkuReference })
          .eq('order_id', order.id);
      } catch (duitkuError) {
        console.error('Duitku API error:', duitkuError);

        // Mark order as failed
        await supabase
          .from('orders')
          .update({ payment_status: 'payment_failed' })
          .eq('id', order.id);

        return NextResponse.json(
          { error: 'Gagal menghubungi payment gateway. Silakan coba lagi.' },
          { status: 502 }
        );
      }
    }

    // ---- Audit log ----
    await createAuditLog({
      action: 'order_created',
      entityType: 'order',
      entityId: order.id,
      metadata: {
        catalog_id: catalog.id,
        star_id: catalog.star_id,
        amount,
        merchant_order_id: merchantOrderId,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      trackingToken,
      paymentUrl,
      merchantOrderId,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
