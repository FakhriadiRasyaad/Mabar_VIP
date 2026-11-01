import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Queue management utilities.
 * All queue operations use the admin client (service role) for atomic operations.
 */

export type QueueStatus = 'waiting' | 'invited' | 'in_room' | 'completed' | 'skipped' | 'cancelled';

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Menunggu',
  invited: 'Diundang',
  in_room: 'Dalam Room',
  completed: 'Selesai',
  skipped: 'Dilewati',
  cancelled: 'Dibatalkan',
};

/**
 * Valid queue status transitions.
 * Key = current status, Value = array of allowed next statuses.
 */
export const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ['invited', 'skipped', 'cancelled'],
  invited: ['in_room', 'skipped', 'cancelled'],
  in_room: ['completed', 'skipped', 'cancelled'],
  completed: [],
  skipped: ['waiting'], // Can re-queue a skipped order
  cancelled: [],
};

/**
 * Check if a queue status transition is valid.
 */
export function isValidTransition(from: QueueStatus, to: QueueStatus): boolean {
  return QUEUE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Update queue status for an order.
 * Validates the transition and creates a queue event.
 */
export async function updateQueueStatus(
  orderId: string,
  newStatus: QueueStatus,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Fetch current order
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, queue_status, payment_status, star_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Order tidak ditemukan' };
  }

  if (order.payment_status !== 'paid') {
    return { success: false, error: 'Order belum dibayar' };
  }

  if (!order.queue_status) {
    return { success: false, error: 'Order belum memiliki status antrean' };
  }

  const currentStatus = order.queue_status as QueueStatus;

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Tidak dapat mengubah status dari "${QUEUE_STATUS_LABELS[currentStatus]}" ke "${QUEUE_STATUS_LABELS[newStatus]}"`,
    };
  }

  // Update order queue status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      queue_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    return { success: false, error: 'Gagal memperbarui status antrean' };
  }

  // Create queue event
  await supabase.from('queue_events').insert({
    order_id: orderId,
    actor_user_id: actorUserId || null,
    event_type: 'status_change',
    previous_status: currentStatus,
    new_status: newStatus,
    metadata: {
      changed_at: new Date().toISOString(),
    },
  });

  return { success: true };
}

/**
 * Get queue info for a catalog (current count, last number, etc).
 */
export async function getQueueInfo(catalogId: string) {
  const supabase = createAdminClient();

  const [counterResult, activeResult] = await Promise.all([
    supabase
      .from('queue_counters')
      .select('last_queue_number')
      .eq('catalog_id', catalogId)
      .single(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('catalog_id', catalogId)
      .eq('payment_status', 'paid')
      .in('queue_status', ['waiting', 'invited', 'in_room']),
  ]);

  return {
    lastQueueNumber: counterResult.data?.last_queue_number || 0,
    activeInQueue: activeResult.count || 0,
  };
}
