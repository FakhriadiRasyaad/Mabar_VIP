import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateEarningsBreakdown,
  DEFAULT_DEDUCTIONS,
  isPayoutAllowedToday,
  type DeductionItem,
} from '@/lib/finance';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedGross = Number(body.amountGross);

    // 1. Strict Day Check: Friday Only
    const schedule = isPayoutAllowedToday();
    if (!schedule.allowed) {
      return NextResponse.json(
        {
          error: `Pengajuan pencairan hanya dapat dilakukan pada hari Jum'at (Hari ini: ${schedule.dayName}). Pencairan diproses setiap hari Senin (${schedule.nextMondayDisbursement}).`,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 2. Check Bank Account
    const { data: bankAccount } = await supabase
      .from('star_bank_accounts')
      .select('*')
      .eq('star_id', user.starId)
      .single();

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Harap lengkapi informasi rekening bank / e-wallet terlebih dahulu sebelum mengajukan pencairan.' },
        { status: 400 }
      );
    }

    // 3. Check Available Gross Earnings
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('amount')
      .eq('star_id', user.starId)
      .eq('payment_status', 'paid');

    const lifetimeGross = (paidOrders || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const { data: previousPayouts } = await supabase
      .from('payout_requests')
      .select('amount_gross, status')
      .eq('star_id', user.starId)
      .in('status', ['pending', 'approved', 'processing', 'completed']);

    const totalRequestedGross = (previousPayouts || []).reduce((acc, curr) => acc + curr.amount_gross, 0);
    const availableGross = Math.max(0, lifetimeGross - totalRequestedGross);

    const amountToWithdraw = requestedGross && requestedGross > 0 ? requestedGross : availableGross;

    if (amountToWithdraw < 50000) {
      return NextResponse.json(
        { error: 'Minimal penarikan saldo adalah Rp 50.000.' },
        { status: 400 }
      );
    }

    if (amountToWithdraw > availableGross) {
      return NextResponse.json(
        { error: `Saldo pendapatan kotor yang tersedia tidak mencukupi (Tersedia: Rp ${availableGross.toLocaleString('id-ID')}).` },
        { status: 400 }
      );
    }

    // 4. Fetch dynamic deductions config
    const { data: settingRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'deductions_config')
      .single();

    const rules: DeductionItem[] = (settingRow?.value as DeductionItem[]) || DEFAULT_DEDUCTIONS;
    const breakdown = calculateEarningsBreakdown(amountToWithdraw, rules);

    // Group deductions
    const platformFee = breakdown.deductions.find((d) => d.id === 'platform_fee')?.calculatedAmount || 0;
    const taxFee = breakdown.deductions.find((d) => d.id.includes('pph') || d.id.includes('tax') || d.id.includes('pajak'))?.calculatedAmount || 0;
    const otherFee = breakdown.totalDeductions - platformFee - taxFee;

    // Next Monday in YYYY-MM-DD
    const jktString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const jktDate = new Date(jktString);
    const nextMonday = new Date(jktDate);
    nextMonday.setDate(jktDate.getDate() + 3); // Friday + 3 days = Monday
    const scheduledDateStr = nextMonday.toISOString().split('T')[0];

    // 5. Insert payout request
    const { data: inserted, error: insertError } = await supabase
      .from('payout_requests')
      .insert({
        star_id: user.starId,
        bank_account_id: bankAccount.id,
        amount_gross: breakdown.grossAmount,
        platform_fee_amount: platformFee,
        tax_amount: taxFee,
        other_deductions_amount: otherFee,
        amount_net: breakdown.netAmount,
        deductions_breakdown: breakdown.deductions,
        status: 'pending',
        scheduled_payout_date: scheduledDateStr,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert payout error:', insertError);
      return NextResponse.json({ error: 'Gagal mengajukan pencairan. Silakan coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      payout: inserted,
      message: `Pengajuan pencairan berhasil! Dana bersih sebesar Rp ${breakdown.netAmount.toLocaleString('id-ID')} dijadwalkan cair pada hari Senin (${schedule.nextMondayDisbursement}).`,
    });
  } catch (err: unknown) {
    console.error('Submit payout error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
