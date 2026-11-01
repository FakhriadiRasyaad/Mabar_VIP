import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const starId = searchParams.get('starId');

    const supabase = createAdminClient();

    let query = supabase
      .from('orders')
      .select(`
        id,
        star_id,
        merchant_order_id,
        tracking_token,
        guest_display_name,
        guest_answers,
        guest_message,
        amount,
        payment_status,
        queue_status,
        queue_number,
        duitku_reference,
        paid_at,
        created_at,
        stars (
          id,
          display_name,
          slug
        ),
        catalogs (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (starId && starId !== 'all') {
      query = query.eq('star_id', starId);
    }

    const { data: orders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (orders || []).map((o: any) => ({
      id: o.id,
      starId: o.star_id,
      merchantOrderId: o.merchant_order_id,
      trackingToken: o.tracking_token,
      guestDisplayName: o.guest_display_name,
      guestAnswers: o.guest_answers || {},
      guestMessage: o.guest_message || '',
      amount: o.amount,
      paymentStatus: o.payment_status,
      queueStatus: o.queue_status,
      queueNumber: o.queue_number,
      duitkuReference: o.duitku_reference || '',
      paidAt: o.paid_at,
      createdAt: o.created_at,
      starName: o.stars?.display_name || 'Star',
      starSlug: o.stars?.slug || '',
      catalogName: o.catalogs?.name || 'Katalog',
    }));

    return NextResponse.json({ orders: formatted });
  } catch (err: unknown) {
    console.error('Admin orders error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
