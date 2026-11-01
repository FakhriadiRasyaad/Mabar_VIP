import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateEarningsBreakdown,
  DEFAULT_DEDUCTIONS,
  isPayoutAllowedToday,
  type DeductionItem,
} from '@/lib/finance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch all paid orders for this star
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('amount, paid_at, created_at')
      .eq('star_id', user.starId)
      .eq('payment_status', 'paid');

    const lifetimeGross = (paidOrders || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // 2. Fetch active deductions config from platform_settings
    const { data: settingRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deductions_config')
      .single();

    const deductionRules: DeductionItem[] =
      (settingRow?.value as DeductionItem[]) || DEFAULT_DEDUCTIONS;

    // 3. Compute Lifetime net breakdown
    const lifetimeBreakdown = calculateEarningsBreakdown(lifetimeGross, deductionRules);

    // 4. Compute 1-Month (Last 30 Days) earnings
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyOrders = (paidOrders || []).filter((o) => {
      const orderDate = new Date(o.paid_at || o.created_at);
      return orderDate >= thirtyDaysAgo;
    });

    const monthlyGross = monthlyOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const monthlyBreakdown = calculateEarningsBreakdown(monthlyGross, deductionRules);

    // 5. Fetch payout requests to calculate Weekly Unwithdrawn Balance
    const { data: payoutRequests } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('star_id', user.starId)
      .order('created_at', { ascending: false });

    // Sum of requested gross in active or completed payouts
    const totalRequestedGross = (payoutRequests || [])
      .filter((p) => ['pending', 'approved', 'processing', 'completed'].includes(p.status))
      .reduce((acc, curr) => acc + curr.amount_gross, 0);

    // Weekly accumulator: resets to 0 when Star requests a payout!
    const weeklyUnwithdrawnGross = Math.max(0, lifetimeGross - totalRequestedGross);
    const weeklyUnwithdrawnBreakdown = calculateEarningsBreakdown(weeklyUnwithdrawnGross, deductionRules);

    // Total net actually received/paid out so far
    const totalPaidOutNet = (payoutRequests || [])
      .filter((p) => p.status === 'completed')
      .reduce((acc, curr) => acc + (curr.amount_net || 0), 0);

    const pendingPayoutNet = (payoutRequests || [])
      .filter((p) => ['pending', 'approved', 'processing'].includes(p.status))
      .reduce((acc, curr) => acc + (curr.amount_net || 0), 0);

    // 6. Fetch bank account
    const { data: bankAccount } = await supabase
      .from('star_bank_accounts')
      .select('*')
      .eq('star_id', user.starId)
      .single();

    // 7. Schedule check (Friday withdrawal, Monday disbursement)
    const scheduleInfo = isPayoutAllowedToday();

    return NextResponse.json({
      // Lifetime / Seluruh Durasi
      lifetimeGross,
      lifetimeNet: lifetimeBreakdown.netAmount,
      lifetimeTotalDeductions: lifetimeBreakdown.totalDeductions,
      lifetimeBreakdown,

      // 1 Bulan (30 Hari Terakhir)
      monthlyGross,
      monthlyNet: monthlyBreakdown.netAmount,
      monthlyTotalDeductions: monthlyBreakdown.totalDeductions,
      monthlyBreakdown,
      monthlyOrdersCount: monthlyOrders.length,

      // Kolom Baru: Saldo Mingguan Siap Cair (Reset ke 0 setiap kali narik)
      weeklyUnwithdrawnGross,
      weeklyUnwithdrawnNet: weeklyUnwithdrawnBreakdown.netAmount,
      availableGross: weeklyUnwithdrawnGross,
      availableBreakdown: weeklyUnwithdrawnBreakdown,

      // Payouts history
      totalPaidOutNet,
      pendingPayoutNet,
      payoutRequests: payoutRequests || [],

      // Bank & schedule
      bankAccount: bankAccount || null,
      scheduleInfo,
      activeTaxRules: deductionRules,
    });
  } catch (err: unknown) {
    console.error('Earnings error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
