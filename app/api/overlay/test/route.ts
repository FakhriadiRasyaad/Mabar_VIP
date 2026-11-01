import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStar } from '@/lib/auth';
import { createTestNotification } from '@/lib/notifications';

/**
 * POST /api/overlay/test
 * Sends a test alert to the Star's overlay.
 * Does NOT create an order, modify queue, or affect sales statistics.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireStar();

    const result = await createTestNotification(user.starId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test alert berhasil dikirim!',
    });
  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim test alert.' },
      { status: 500 }
    );
  }
}
