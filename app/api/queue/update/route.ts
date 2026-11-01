import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateQueueStatus, type QueueStatus } from '@/lib/queue';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'star' || !user.starId) {
      return NextResponse.json({ error: 'Tidak memiliki izin (Unauthorized)' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderIds, newStatus } = body as {
      orderId?: string;
      orderIds?: string[];
      newStatus: QueueStatus;
    };

    const targetIds = orderIds && Array.isArray(orderIds) && orderIds.length > 0
      ? orderIds
      : orderId ? [orderId] : [];

    if (targetIds.length === 0 || !newStatus) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify all orders belong to this star
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, star_id, queue_status')
      .in('id', targetIds);

    if (orderError || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    const validOrderIds = orders
      .filter((o) => o.star_id === user.starId)
      .map((o) => o.id);

    if (validOrderIds.length === 0) {
      return NextResponse.json({ error: 'Bukan order milik Anda' }, { status: 403 });
    }

    // Call updateQueueStatus for each order
    const errors: string[] = [];
    for (const id of validOrderIds) {
      const result = await updateQueueStatus(id, newStatus, user.id);
      if (!result.success && result.error) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0 && validOrderIds.length === 1) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newStatus,
      updatedCount: validOrderIds.length - errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Queue update error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
