'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';

interface OverlaySettings {
  id: string;
  star_id: string;
  overlay_token: string;
  alert_duration_ms: number;
  sound_enabled: boolean;
  show_amount: boolean;
  show_guest_message: boolean;
  show_queue_number: boolean;
}

export default function OverlaySettingsPage() {
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: star } = await supabase
      .from('stars')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!star) return;

    const { data } = await supabase
      .from('overlay_settings')
      .select('*')
      .eq('star_id', star.id)
      .single();

    if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase
      .from('overlay_settings')
      .update({
        alert_duration_ms: settings.alert_duration_ms,
        sound_enabled: settings.sound_enabled,
        show_amount: settings.show_amount,
        show_guest_message: settings.show_guest_message,
        show_queue_number: settings.show_queue_number,
      })
      .eq('id', settings.id);

    if (error) {
      setMessage('Gagal menyimpan pengaturan');
    } else {
      setMessage('Pengaturan berhasil disimpan!');
    }
    setSaving(false);
  }

  async function handleTestAlert() {
    setTestingSend(true);
    setMessage('');

    try {
      const res = await fetch('/api/overlay/test', { method: 'POST' });
      const data = await res.json();
      setMessage(
        data.success ? '🎉 Test alert berhasil dikirim ke browser source OBS!' : data.error || 'Gagal mengirim test alert'
      );
    } catch {
      setMessage('Gagal mengirim test alert');
    }
    setTestingSend(false);
  }

  async function handleRotateToken() {
    if (!confirm('Token lama akan langsung tidak berlaku dan overlay OBS wajib diganti. Lanjutkan?')) return;

    setMessage('');
    const supabase = createClient();
    const newToken = crypto.randomUUID() + '-' + crypto.randomUUID();

    const { error } = await supabase
      .from('overlay_settings')
      .update({ overlay_token: newToken })
      .eq('id', settings?.id);

    if (error) {
      setMessage('Gagal merotasi token');
    } else {
      setSettings((s) => (s ? { ...s, overlay_token: newToken } : null));
      setMessage('Token overlay berhasil dirotasi!');
    }
  }

  const overlayUrl =
    typeof window !== 'undefined' && settings
      ? `${window.location.origin}/overlay/${settings.overlay_token}`
      : '';

  const handleCopyUrl = () => {
    if (overlayUrl) {
      navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nb-white flex items-center justify-center nb-dots">
        <div className="w-10 h-10 border-4 border-nb-black border-t-nb-yellow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-nb-cream border-3 border-nb-black rounded-2xl p-6 shadow-nb-md">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-bold text-nb-black hover:text-nb-purple transition-colors mb-2"
            >
              ← KEMBALI KE DASHBOARD
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-nb-black">
              Pengaturan OBS Overlay
            </h1>
            <p className="text-nb-gray-600 text-sm mt-1">
              Pasang widget alert live streaming untuk pop-up tiket mabar dan suara notifikasi.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border-3 border-nb-black font-bold text-sm shadow-nb-sm flex items-center justify-between ${
              message.includes('berhasil') || message.includes('dikirim')
                ? 'bg-nb-lime/50 text-nb-black'
                : 'bg-nb-red/20 text-nb-black'
            }`}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="font-bold text-base hover:opacity-75 px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {!settings ? (
          <div className="nb-card text-center py-16 px-6">
            <p className="text-nb-gray-600 font-bold">
              Overlay belum dikonfigurasi. Hubungi admin untuk setup akun star.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overlay URL */}
            <div className="nb-card p-6">
              <h3 className="text-lg font-extrabold uppercase text-nb-black mb-1 flex items-center gap-2">
                <span>🔗 URL Browser Source OBS</span>
              </h3>
              <p className="text-xs text-nb-gray-600 mb-4">
                Salin tautan ini dan masukkan ke OBS Studio / Streamlabs sebagai Browser Source.
              </p>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={overlayUrl}
                    className="nb-input flex-1 font-mono text-sm bg-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="nb-btn nb-btn-primary text-xs py-2 px-4 shrink-0 font-bold"
                  >
                    {copied ? '✓ TERSALIN!' : '📋 SALIN'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-nb-cyan/20 border-3 border-nb-black shadow-nb-sm">
                  <p className="text-xs font-black uppercase text-nb-black mb-2">
                    📌 Cara Pasang di OBS Studio:
                  </p>
                  <ol className="text-xs text-nb-gray-700 space-y-1 list-decimal list-inside font-medium">
                    <li>Buka OBS Studio di PC Anda</li>
                    <li>Klik <strong>+</strong> pada panel <strong>Sources</strong> → pilih <strong>Browser</strong></li>
                    <li>Tempelkan URL di atas ke field <strong>URL</strong></li>
                    <li>Set <strong>Width: 800</strong>, <strong>Height: 600</strong></li>
                    <li>Centang <strong>&ldquo;Shutdown source when not visible&rdquo;</strong></li>
                    <li>Klik <strong>OK</strong> dan atur posisi kotak alert di kanvas stream</li>
                  </ol>
                </div>

                <div className="flex gap-3 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={testingSend}
                    className="nb-btn nb-btn-secondary text-xs py-2.5 px-4"
                  >
                    {testingSend ? '⏳ Mengirim...' : '🔔 Tes Alert Stream'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateToken}
                    className="nb-btn nb-btn-danger text-xs py-2.5 px-3"
                  >
                    🔄 Rotasi Token
                  </button>
                </div>
              </div>
            </div>

            {/* Alert Settings */}
            <div className="nb-card p-6">
              <h3 className="text-lg font-extrabold uppercase text-nb-black mb-1">
                ⚙️ Preferensi Tampilan Alert
              </h3>
              <p className="text-xs text-nb-gray-600 mb-6">
                Sesuaikan durasi dan elemen yang ingin ditampilkan pada overlay streaming.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                    Durasi Alert (Detik)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={settings.alert_duration_ms / 1000}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alert_duration_ms: Math.max(
                          2000,
                          Math.min(30000, Number(e.target.value) * 1000)
                        ),
                      })
                    }
                    className="nb-input w-36 font-mono font-bold text-base"
                  />
                  <p className="text-[11px] text-nb-gray-500 mt-1">
                    Rentang: 2 - 30 detik (default: 8 detik)
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t-2 border-nb-black/10">
                  {[
                    {
                      key: 'sound_enabled' as const,
                      label: 'Suara Efek Alert',
                      desc: 'Bunyikan audio koin/fanfare saat penonton mendaftar',
                    },
                    {
                      key: 'show_amount' as const,
                      label: 'Tampilkan Nominal Tiket',
                      desc: 'Tampilkan nominal harga tiket di popup alert',
                    },
                    {
                      key: 'show_guest_message' as const,
                      label: 'Tampilkan Pesan Penonton',
                      desc: 'Tampilkan ucapan/pesan singkat penonton stream',
                    },
                    {
                      key: 'show_queue_number' as const,
                      label: 'Tampilkan Nomor Antrean',
                      desc: 'Tampilkan badge nomor antrean penonton',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-nb-black shadow-nb-sm"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-nb-black">{item.label}</p>
                        <p className="text-xs text-nb-gray-600 font-medium">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(e) =>
                          setSettings({ ...settings, [item.key]: e.target.checked })
                        }
                        className="w-6 h-6 border-2 border-nb-black rounded accent-nb-yellow cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full nb-btn nb-btn-primary text-sm py-3 mt-4 font-extrabold"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan Overlay'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
