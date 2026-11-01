import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settingsMap: Record<string, any> = {};
    (settings || []).forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Superadmin only' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Body contains key-value pairs to upsert
    for (const [key, value] of Object.entries(body)) {
      await supabase
        .from('platform_settings')
        .upsert({
          key,
          value,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
