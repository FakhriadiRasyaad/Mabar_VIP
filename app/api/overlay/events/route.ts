import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/overlay/events?token=<overlayToken>&lastEventId=<uuid>
 *
 * Server-Sent Events (SSE) endpoint for overlay alerts.
 * Validates overlay token, then streams new notification events.
 * Uses Supabase Realtime under the hood but exposes via SSE for OBS compatibility.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const lastEventId = request.nextUrl.searchParams.get('lastEventId');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // ---- Validate overlay token ----
  const { data: settings, error: settingsError } = await supabase
    .from('overlay_settings')
    .select('id, star_id, alert_duration_ms, sound_enabled, show_amount, show_guest_message, show_queue_number')
    .eq('overlay_token', token)
    .single();

  if (settingsError || !settings) {
    return NextResponse.json({ error: 'Invalid overlay token' }, { status: 403 });
  }

  const starId = settings.star_id;

  // ---- Setup SSE stream ----
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial settings
      const settingsEvent = `data: ${JSON.stringify({
        type: 'settings',
        data: {
          alert_duration_ms: settings.alert_duration_ms,
          sound_enabled: settings.sound_enabled,
          show_amount: settings.show_amount,
          show_guest_message: settings.show_guest_message,
          show_queue_number: settings.show_queue_number,
        },
      })}\n\n`;
      controller.enqueue(encoder.encode(settingsEvent));

      // Fetch missed events since lastEventId
      if (lastEventId) {
        const { data: missedEvents } = await supabase
          .from('notifications')
          .select('id, payload, is_test, created_at')
          .eq('star_id', starId)
          .gt('id', lastEventId)
          .order('created_at', { ascending: true })
          .limit(20);

        if (missedEvents && missedEvents.length > 0) {
          for (const event of missedEvents) {
            const eventData = `id: ${event.id}\ndata: ${JSON.stringify({
              type: 'alert',
              data: {
                event_id: event.id,
                ...event.payload,
                is_test: event.is_test,
              },
            })}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          }
        }
      }

      // Subscribe to new notifications via polling
      // In production, this would use Supabase Realtime channels
      // For MVP, we use polling with a reasonable interval
      const intervalId = setInterval(async () => {
        try {
          const { data: newEvents } = await supabase
            .from('notifications')
            .select('id, payload, is_test, created_at')
            .eq('star_id', starId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (newEvents && newEvents.length > 0) {
            // Send heartbeat
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          }
        } catch {
          // Connection might be closed
          clearInterval(intervalId);
        }
      }, 5000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
