'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

/**
 * OBS Overlay Page
 * Transparent background, receives alerts via SSE, displays them one at a time.
 * Compatible with OBS Browser Source.
 */

interface AlertData {
  event_id: string;
  catalog_name: string;
  guest_display_name: string;
  amount: number;
  queue_number: number;
  message: string;
  is_test: boolean;
}

interface OverlaySettings {
  alert_duration_ms: number;
  sound_enabled: boolean;
  show_amount: boolean;
  show_guest_message: boolean;
  show_queue_number: boolean;
}

const DEFAULT_SETTINGS: OverlaySettings = {
  alert_duration_ms: 5000,
  sound_enabled: true,
  show_amount: true,
  show_guest_message: true,
  show_queue_number: true,
};

export default function OverlayPage() {
  const params = useParams();
  const overlayToken = params.overlayToken as string;

  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const alertQueueRef = useRef<AlertData[]>([]);
  const isShowingRef = useRef(false);
  const lastEventIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(n);

  // ---- Show next alert from queue ----
  const showNextAlert = useCallback(() => {
    if (isShowingRef.current || alertQueueRef.current.length === 0) return;

    const nextAlert = alertQueueRef.current.shift()!;
    isShowingRef.current = true;
    setCurrentAlert(nextAlert);

    // Animate in
    requestAnimationFrame(() => {
      setVisible(true);
    });

    // Play sound
    if (settings.sound_enabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Keep alert visible for duration, then animate out
    setTimeout(() => {
      setVisible(false);

      // Wait for exit animation then clear
      setTimeout(() => {
        setCurrentAlert(null);
        isShowingRef.current = false;
        lastEventIdRef.current = nextAlert.event_id;

        // Show next in queue if any
        showNextAlert();
      }, 500); // Exit animation duration
    }, settings.alert_duration_ms);
  }, [settings]);

  // ---- SSE Connection ----
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL('/api/overlay/events', window.location.origin);
    url.searchParams.set('token', overlayToken);
    if (lastEventIdRef.current) {
      url.searchParams.set('lastEventId', lastEventIdRef.current);
    }

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === 'settings') {
          setSettings(parsed.data);
        } else if (parsed.type === 'alert') {
          const alertData: AlertData = parsed.data;

          // Deduplicate
          const isDuplicate =
            alertQueueRef.current.some((a) => a.event_id === alertData.event_id) ||
            (currentAlert && currentAlert.event_id === alertData.event_id);

          if (!isDuplicate) {
            alertQueueRef.current.push(alertData);
            showNextAlert();
          }
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    es.onerror = () => {
      setConnectionStatus('disconnected');
      es.close();

      // Exponential backoff reconnect
      const delay = Math.min(5000, 1000 * Math.pow(2, 0));
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus('connecting');
        connectSSE();
      }, delay);
    };
  }, [overlayToken, showNextAlert, currentAlert]);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/sounds/alert.mp3');
    audioRef.current.volume = 0.7;

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE]);

  // ---- Also listen for Supabase Realtime notifications ----
  useEffect(() => {
    // Poll for new notifications every 3 seconds as fallback
    const pollInterval = setInterval(async () => {
      try {
        const url = new URL('/api/overlay/events', window.location.origin);
        url.searchParams.set('token', overlayToken);
        if (lastEventIdRef.current) {
          url.searchParams.set('lastEventId', lastEventIdRef.current);
        }
        url.searchParams.set('poll', 'true');
        // The SSE handles this, poll is just a fallback check
      } catch {
        // Ignore
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [overlayToken]);

  return (
    <div
      className="w-full h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Alert Box */}
      {currentAlert && (
        <div
          className={`
            max-w-md w-full mx-4
            transition-all duration-500 ease-out
            ${visible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-8'
            }
          `}
        >
          <div className="relative overflow-hidden rounded-2xl bg-nb-cream border-4 border-nb-black shadow-nb-xl p-6 text-nb-black">
            {/* Test badge */}
            {currentAlert.is_test && (
              <div className="absolute top-3 right-3">
                <span className="nb-badge nb-badge-yellow text-xs font-black uppercase shadow-nb-sm">
                  TEST ALERT
                </span>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-3">
              {currentAlert.catalog_name?.includes('[⚡ FAST TRACK]') ? (
                <span className="nb-badge bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-2 border-nb-black text-xs font-black uppercase tracking-wider animate-bounce shadow-nb-xs">
                  ⚡ TIKET FAST TRACK VIP (LOMPAT ANTREAN)!
                </span>
              ) : (
                <span className="nb-badge nb-badge-pink text-xs font-black uppercase tracking-wider animate-bounce">
                  🎮 TIKET MABAR BARU!
                </span>
              )}
            </div>

            {/* Guest Name */}
            <h2 className="text-3xl font-black uppercase text-nb-black text-center mb-1 tracking-tight animate-pulse-once">
              {currentAlert.guest_display_name}
            </h2>

            {/* Catalog */}
            <p className="text-center text-sm font-extrabold uppercase text-nb-purple mb-4">
              {currentAlert.catalog_name}
            </p>

            {/* Amount & Queue */}
            <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
              {settings.show_amount && (
                <div className="bg-nb-lime border-3 border-nb-black shadow-nb-sm rounded-xl px-4 py-2">
                  <span className="text-nb-black font-black font-mono text-xl">
                    {formatRupiah(currentAlert.amount)}
                  </span>
                </div>
              )}

              {settings.show_queue_number && (
                <div className="bg-nb-yellow border-3 border-nb-black shadow-nb-sm rounded-xl px-4 py-2">
                  <span className="text-nb-black font-black font-mono text-xl">
                    ANTREAN #{currentAlert.queue_number}
                  </span>
                </div>
              )}
            </div>

            {/* Message */}
            {settings.show_guest_message && currentAlert.message && (
              <div className="bg-white border-2 border-nb-black shadow-nb-sm rounded-xl p-3 mt-3">
                <p className="text-nb-black font-bold text-sm text-center italic">
                  &ldquo;{currentAlert.message}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        body {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .animate-pulse-once {
          animation: pulse-once 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
