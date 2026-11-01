'use client';

import { useEffect, useState } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/security';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';

interface NotificationItem {
  id: string;
  order_id: string | null;
  event_type: string;
  payload: {
    catalog_name?: string;
    guest_display_name?: string;
    amount?: number;
    queue_number?: number;
    message?: string;
    is_test?: boolean;
  };
  is_test: boolean;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setError(data.error || 'Gagal memuat notifikasi');
      }
    } catch {
      setError('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch {
      console.error('Failed to mark notifications as read');
    }
  };

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-nb-cream border-3 border-nb-black rounded-2xl p-6 shadow-nb-md">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-bold text-nb-black hover:text-nb-purple transition-colors mb-2"
            >
              ← KEMBALI KE DASHBOARD
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-nb-black">
                Notifikasi Pesanan
              </h1>
              {unreadCount > 0 && (
                <span className="nb-badge nb-badge-pink animate-bounce">
                  {unreadCount} BARU
                </span>
              )}
            </div>
            <p className="text-nb-gray-600 text-sm mt-1">
              Catatan riwayat transaksi mabar masuk & pemicu live stream alert.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ThemeToggle />
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="nb-btn nb-btn-cyan text-xs py-2 px-3"
              >
                ✓ Tandai Dibaca
              </button>
            )}
            <button
              type="button"
              onClick={fetchNotifications}
              disabled={loading}
              className="nb-btn nb-btn-yellow text-xs py-2 px-3"
            >
              🔄 Refresh
            </button>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red text-nb-black font-bold text-sm shadow-nb-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-nb-black border-t-nb-yellow rounded-full animate-spin mx-auto mb-3" />
            <p className="text-nb-gray-600 font-bold text-sm">Memuat notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="nb-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-3xl mx-auto mb-4">
              🔔
            </div>
            <h3 className="text-xl font-extrabold text-nb-black uppercase">Belum Ada Notifikasi</h3>
            <p className="text-nb-gray-600 text-sm mt-2 max-w-md mx-auto">
              Setiap kali penonton stream berhasil membayar tiket mabar, notifikasi dan nomor antrean akan otomatis tercatat di sini secara real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const isUnread = !notif.read_at;
              const payload = notif.payload || {};

              return (
                <div
                  key={notif.id}
                  className={`border-3 border-nb-black rounded-2xl p-4 sm:p-5 transition-all duration-150 ${
                    isUnread
                      ? 'bg-nb-yellow/30 shadow-nb-md hover:translate-x-1'
                      : 'bg-white shadow-nb-sm hover:shadow-nb-md hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl border-3 border-nb-black flex items-center justify-center text-2xl shrink-0 shadow-nb-sm ${
                        notif.is_test ? 'bg-nb-cyan' : isUnread ? 'bg-nb-pink' : 'bg-nb-lime'
                      }`}
                    >
                      {notif.is_test ? '🧪' : '🎉'}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-nb-black">
                            {payload.guest_display_name || 'Penonton'}
                          </span>
                          <span className="text-xs text-nb-gray-600">
                            membeli tiket mabar{' '}
                            <strong className="text-nb-black">{payload.catalog_name || 'Mabar'}</strong>
                          </span>
                          {payload.queue_number && (
                            <span className="nb-badge nb-badge-yellow text-xs font-mono font-bold">
                              Antrean #{payload.queue_number}
                            </span>
                          )}
                          {isUnread && (
                            <span className="nb-badge nb-badge-pink text-[10px] font-bold">
                              NEW
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-nb-gray-500 shrink-0">
                          {formatDateTime(notif.created_at)}
                        </span>
                      </div>

                      {payload.message && (
                        <p className="text-xs text-nb-gray-700 bg-nb-cream border-2 border-nb-black/20 rounded-lg p-2 font-medium italic mt-2">
                          &ldquo;{payload.message}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-2 text-xs">
                        {payload.amount && (
                          <span className="text-nb-black font-extrabold font-mono bg-nb-lime/50 border border-nb-black px-2 py-0.5 rounded-md">
                            {formatRupiah(payload.amount)}
                          </span>
                        )}
                        {notif.is_test && (
                          <span className="nb-badge nb-badge-cyan text-[10px]">
                            Tes Alert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
