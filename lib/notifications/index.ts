import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Notification utilities.
 * Handles creation, delivery tracking, and realtime event publishing.
 */

export interface NotificationPayload {
  catalog_name: string;
  guest_display_name: string;
  amount: number;
  queue_number: number;
  message: string;
  is_test: boolean;
}

/**
 * Create a test alert notification for a Star.
 * Does NOT create an order, modify queue, or affect sales statistics.
 */
export async function createTestNotification(
  starId: string
): Promise<{ success: boolean; notification?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();

  const payload: NotificationPayload = {
    catalog_name: 'Test Katalog',
    guest_display_name: 'Test Guest',
    amount: 25000,
    queue_number: 99,
    message: 'Ini adalah test alert! 🎮',
    is_test: true,
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      star_id: starId,
      order_id: null,
      event_type: 'test_alert',
      payload,
      is_test: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal membuat test notification' };
  }

  // Create delivery records
  await supabase.from('notification_deliveries').insert([
    {
      notification_id: data.id,
      channel: 'dashboard',
      status: 'pending',
    },
    {
      notification_id: data.id,
      channel: 'overlay',
      status: 'pending',
    },
  ]);

  return { success: true, notification: data };
}

/**
 * Mark notifications as read for a Star.
 */
export async function markNotificationsRead(
  notificationIds: string[],
  starId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notificationIds)
    .eq('star_id', starId)
    .is('read_at', null);

  if (error) {
    return { success: false, error: 'Gagal menandai notifikasi sebagai dibaca' };
  }

  return { success: true };
}

/**
 * Get unread notification count for a Star.
 */
export async function getUnreadCount(starId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('star_id', starId)
    .is('read_at', null)
    .eq('is_test', false);

  return count || 0;
}

/**
 * Create audit log entry.
 */
export async function createAuditLog(params: {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('audit_logs').insert({
    actor_user_id: params.actorUserId || null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata: params.metadata || {},
  });
}
