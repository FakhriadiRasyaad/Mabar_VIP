import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ starId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const { starId } = await params;
    const body = await request.json();
    const { is_active } = body;

    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from('stars')
      .update({
        is_active: Boolean(is_active),
        updated_at: new Date().toISOString(),
      })
      .eq('id', starId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, star: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
