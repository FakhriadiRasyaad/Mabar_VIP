import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: bankAccount } = await supabase
      .from('star_bank_accounts')
      .select('*')
      .eq('star_id', user.starId)
      .single();

    return NextResponse.json({ bankAccount: bankAccount || null });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankName, accountNumber, accountHolderName } = body;

    if (!bankName || !accountNumber || !accountHolderName) {
      return NextResponse.json({ error: 'Semua informasi rekening wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: saved, error } = await supabase
      .from('star_bank_accounts')
      .upsert(
        {
          star_id: user.starId,
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_holder_name: accountHolderName.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'star_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bankAccount: saved });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
