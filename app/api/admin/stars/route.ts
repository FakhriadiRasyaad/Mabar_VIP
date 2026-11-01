import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateEarningsBreakdown, DEFAULT_DEDUCTIONS, type DeductionItem } from '@/lib/finance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Fetch active deduction rules
    const { data: settingRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deductions_config')
      .single();

    const rules: DeductionItem[] = (settingRow?.value as DeductionItem[]) || DEFAULT_DEDUCTIONS;

    // 2. Fetch all stars
    const { data: stars, error } = await supabase
      .from('stars')
      .select(`
        id,
        user_id,
        slug,
        display_name,
        bio,
        is_active,
        created_at,
        profiles (
          display_name
        ),
        catalogs (
          id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Fetch all paid orders
    const { data: orders } = await supabase
      .from('orders')
      .select('star_id, amount, paid_at, created_at')
      .eq('payment_status', 'paid');

    // 4. Fetch bank accounts
    const { data: bankAccounts } = await supabase
      .from('star_bank_accounts')
      .select('*');

    // 5. Fetch payout requests
    const { data: payouts } = await supabase
      .from('payout_requests')
      .select('star_id, amount_gross, amount_net, status');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Map revenue, monthly, and weekly unwithdrawn per star
    const formatted = (stars || []).map((s: any) => {
      const starOrders = (orders || []).filter((o) => o.star_id === s.id);
      const grossRevenue = starOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const orderCount = starOrders.length;

      // Lifetime breakdown
      const breakdown = calculateEarningsBreakdown(grossRevenue, rules);

      // Monthly breakdown (30 days)
      const monthlyOrders = starOrders.filter((o) => {
        const d = new Date(o.paid_at || o.created_at);
        return d >= thirtyDaysAgo;
      });
      const monthlyGross = monthlyOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const monthlyBreakdown = calculateEarningsBreakdown(monthlyGross, rules);

      // Weekly Unwithdrawn Balance: Resets to 0 whenever Star withdraws
      const starPayouts = (payouts || []).filter((p) => p.star_id === s.id);
      const totalRequestedGross = starPayouts
        .filter((p) => ['pending', 'approved', 'processing', 'completed'].includes(p.status))
        .reduce((sum, p) => sum + (p.amount_gross || 0), 0);

      const weeklyUnwithdrawnGross = Math.max(0, grossRevenue - totalRequestedGross);
      const weeklyUnwithdrawnBreakdown = calculateEarningsBreakdown(weeklyUnwithdrawnGross, rules);

      const totalPaidOutNet = starPayouts
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount_net || 0), 0);
      const pendingPayoutsCount = starPayouts.filter((p) => p.status === 'pending').length;

      const bank = (bankAccounts || []).find((b) => b.star_id === s.id);

      return {
        id: s.id,
        userId: s.user_id,
        slug: s.slug,
        displayName: s.display_name,
        bio: s.bio,
        isActive: s.is_active,
        createdAt: s.created_at,
        catalogCount: s.catalogs?.length || 0,

        // Order count
        totalOrders: orderCount,
        monthlyOrdersCount: monthlyOrders.length,

        // Lifetime (Seluruh Durasi)
        grossRevenue,
        netRevenue: breakdown.netAmount,
        totalDeductions: breakdown.totalDeductions,

        // 1 Bulan (30 Hari)
        monthlyGross,
        monthlyNet: monthlyBreakdown.netAmount,
        monthlyDeductions: monthlyBreakdown.totalDeductions,

        // Kolom Baru: Saldo Mingguan Siap Cair (Reset ke 0 saat narik uang)
        weeklyUnwithdrawnGross,
        weeklyUnwithdrawnNet: weeklyUnwithdrawnBreakdown.netAmount,

        // Payout info
        totalPaidOutNet,
        pendingPayoutsCount,
        bankAccount: bank
          ? {
              bankName: bank.bank_name,
              bankCode: bank.bank_code,
              accountNumber: bank.account_number,
              accountHolderName: bank.account_holder_name,
              isVerified: bank.is_verified,
            }
          : null,
      };
    });

    return NextResponse.json({ stars: formatted, deductionRules: rules });
  } catch (err: unknown) {
    console.error('Admin stars error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
