import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Total Stars
    const { count: totalStars } = await supabase
      .from('stars')
      .select('id', { count: 'exact', head: true });

    const { count: activeStars } = await supabase
      .from('stars')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // 2. Orders & GMV
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('amount')
      .eq('payment_status', 'paid');

    const totalOrdersCount = paidOrders?.length || 0;
    const gmv = (paidOrders || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Platform fee 5%
    const platformFee = Math.round(gmv * 0.05);

    // 3. Pending & Failed orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'pending_payment');

    const { count: failedOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('payment_status', ['payment_failed', 'cancelled']);

    return NextResponse.json({
      totalStars: totalStars || 0,
      activeStars: activeStars || 0,
      totalOrders: totalOrdersCount,
      gmv,
      platformFee,
      pendingOrders: pendingOrders || 0,
      failedOrders: failedOrders || 0,
    });
  } catch (err: unknown) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
