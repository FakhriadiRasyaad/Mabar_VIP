'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@/lib/security';
import ThemeToggle from '@/components/ThemeToggle';
import {
  parseCatalogBundles,
  getCleanDescription,
  CatalogBundle,
  calculateBundleSavings,
  parseCatalogFastTrack,
} from '@/lib/bundles';

interface CatalogField {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  options: string[];
  sort_order: number;
}

interface Catalog {
  id: string;
  name: string;
  description: string;
  clean_description?: string;
  price_amount: number;
  cover_image_path: string | null;
  slug: string;
  star_id: string;
  bundles?: CatalogBundle[];
  fast_track_enabled?: boolean;
  fast_track_fee?: number;
  catalog_fields: CatalogField[];
}

interface Star {
  id: string;
  display_name: string;
  slug: string;
}

export default function CatalogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [star, setStar] = useState<Star | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Bundle & Fast Track selection
  const [selectedBundleId, setSelectedBundleId] = useState<string>('base');
  const [isFastTrack, setIsFastTrack] = useState<boolean>(false);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const starSlug = params.starSlug as string;
  const catalogSlug = params.catalogSlug as string;

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch star
      const { data: starData } = await supabase
        .from('stars')
        .select('id, display_name, slug')
        .eq('slug', starSlug)
        .eq('is_active', true)
        .single();

      if (!starData) {
        setLoading(false);
        return;
      }
      setStar(starData);

      // Fetch catalog with fields
      const { data: catalogData } = await supabase
        .from('catalogs')
        .select(`
          id, name, description, price_amount, cover_image_path, slug, star_id,
          catalog_fields (
            id, field_key, label, field_type, placeholder, is_required, options, sort_order
          )
        `)
        .eq('star_id', starData.id)
        .eq('slug', catalogSlug)
        .eq('is_active', true)
        .single();

      if (catalogData) {
        const bundles = parseCatalogBundles(catalogData);
        const clean_description = getCleanDescription(catalogData.description);
        const sortedFields = (catalogData.catalog_fields || []).sort(
          (a: CatalogField, b: CatalogField) => a.sort_order - b.sort_order
        );

        setCatalog({
          ...catalogData,
          bundles,
          clean_description,
          catalog_fields: sortedFields,
        } as Catalog);
      }
      setLoading(false);
    }
    load();
  }, [starSlug, catalogSlug]);

  const fastTrackConfig = catalog ? parseCatalogFastTrack(catalog) : { enabled: false, fee: 10000 };
  const selectedBundle = catalog?.bundles?.find((b) => b.id === selectedBundleId);
  const currentPrice = selectedBundle ? selectedBundle.price : catalog?.price_amount || 0;
  const currentName = selectedBundle ? selectedBundle.name : '1 Match';
  const fastTrackFee = isFastTrack && fastTrackConfig.enabled ? fastTrackConfig.fee : 0;
  const finalPrice = currentPrice + fastTrackFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: catalog!.id,
          bundleId: selectedBundleId,
          isFastTrack: isFastTrack && fastTrackConfig.enabled,
          guestDisplayName: guestName,
          guestMessage,
          guestAnswers: answers,
          email: guestEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errs: Record<string, string> = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            errs[err.field] = err.message;
          });
          setFieldErrors(errs);
        }
        setError(data.error || 'Terjadi kesalahan saat memproses pesanan.');
        setSubmitting(false);
        return;
      }

      // Redirect to payment URL
      if (data.paymentUrl) {
        sessionStorage.setItem(`tracking_${data.orderId}`, data.trackingToken);
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/checkout/${data.orderId}`);
      }
    } catch {
      setError('Gagal terhubung ke server. Silakan coba lagi.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nb-white flex items-center justify-center nb-dots">
        <div className="w-10 h-10 border-4 border-nb-black border-t-nb-yellow rounded-full animate-spin" />
      </div>
    );
  }

  if (!star || !catalog) {
    return (
      <div className="min-h-screen bg-nb-white nb-dots flex items-center justify-center p-4">
        <div className="nb-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-black uppercase text-nb-black">
            Layanan Tidak Ditemukan
          </h2>
          <p className="text-nb-gray-600 text-sm mt-2">
            Katalog mabar ini mungkin telah dinonaktifkan atau dihapus oleh streamer.
          </p>
          <div className="mt-6">
            <Link href="/" className="nb-btn nb-btn-primary text-xs py-2 px-4 font-bold">
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availableBundles = catalog.bundles || [];

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase font-mono">
            <Link href={`/${star.slug}`} className="text-nb-black hover:text-nb-purple transition-colors">
              {star.display_name}
            </Link>
            <span className="text-nb-gray-400">/</span>
            <span className="text-nb-purple">{catalog.name}</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Catalog Info Banner */}
        <div className="nb-card overflow-hidden bg-nb-cream">
          <div className="h-48 sm:h-56 bg-nb-yellow border-b-3 border-nb-black flex items-center justify-center relative overflow-hidden">
            {catalog.cover_image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={catalog.cover_image_path}
                alt={catalog.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-7xl">🕹️</span>
            )}
            <div className="absolute top-3 right-3">
              <span className="nb-badge nb-badge-lime font-mono font-black text-sm sm:text-base shadow-nb-sm">
                Mulai {formatRupiah(catalog.price_amount)}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-nb-black">
                  {catalog.name}
                </h1>
                <p className="text-xs font-mono font-bold text-nb-gray-500 uppercase mt-0.5">
                  Host: {star.display_name}
                </p>
              </div>
            </div>

            {catalog.clean_description && (
              <p className="text-nb-gray-700 text-sm mt-3 font-medium whitespace-pre-line">
                {catalog.clean_description}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Bundle Selector */}
        {availableBundles.length > 0 && (
          <div className="nb-card p-6 bg-nb-cream space-y-4">
            <div>
              <h2 className="text-lg font-black uppercase text-nb-black flex items-center gap-2">
                <span>📦</span> PILIH PAKET MABAR (HEMAT BUNDLING)
              </h2>
              <p className="text-xs text-nb-gray-600 font-semibold mt-0.5">
                Pilih apakah ingin main 1 match santai atau ambil paket borongan dengan harga lebih hemat!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Base 1 Match */}
              <div
                onClick={() => setSelectedBundleId('base')}
                className={`p-4 rounded-xl border-3 transition-all cursor-pointer relative ${
                  selectedBundleId === 'base'
                    ? 'border-nb-black bg-nb-yellow text-[#1A1A2E] shadow-nb-md translate-x-[-1px] translate-y-[-1px]'
                    : 'border-nb-black/30 bg-nb-white text-nb-black hover:border-nb-black shadow-nb-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    selectedBundleId === 'base' ? 'text-[#1A1A2E]' : 'text-nb-black'
                  }`}>
                    1 Match / Sesi
                  </span>
                  <input
                    type="radio"
                    name="bundleSelector"
                    checked={selectedBundleId === 'base'}
                    onChange={() => setSelectedBundleId('base')}
                    className="accent-nb-purple"
                  />
                </div>
                <div className={`text-xl font-mono font-black ${
                  selectedBundleId === 'base' ? 'text-[#1A1A2E]' : 'text-nb-black'
                }`}>
                  {formatRupiah(catalog.price_amount)}
                </div>
                <div className={`text-[11px] font-bold mt-1 ${
                  selectedBundleId === 'base' ? 'text-[#1A1A2E]/80' : 'text-nb-gray-600'
                }`}>
                  1x slot tiket antrean mabar
                </div>
              </div>

              {/* Bundle Options */}
              {availableBundles.map((b) => {
                const savings = calculateBundleSavings(catalog.price_amount, b);
                const isSelected = selectedBundleId === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBundleId(b.id)}
                    className={`p-4 rounded-xl border-3 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-nb-black bg-nb-yellow text-[#1A1A2E] shadow-nb-md translate-x-[-1px] translate-y-[-1px]'
                        : 'border-nb-black/30 bg-nb-white text-nb-black hover:border-nb-black shadow-nb-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black uppercase tracking-wider truncate ${
                        isSelected ? 'text-[#1A1A2E]' : 'text-nb-black'
                      }`}>
                        {b.name}
                      </span>
                      <input
                        type="radio"
                        name="bundleSelector"
                        checked={isSelected}
                        onChange={() => setSelectedBundleId(b.id)}
                        className="accent-nb-purple"
                      />
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className={`text-xl font-mono font-black ${
                        isSelected ? 'text-[#1A1A2E]' : 'text-nb-black'
                      }`}>
                        {formatRupiah(b.price)}
                      </span>
                      {savings.normalTotal > b.price && (
                        <span className={`text-xs line-through font-mono ${
                          isSelected ? 'text-[#1A1A2E]/60' : 'text-nb-gray-500'
                        }`}>
                          {formatRupiah(savings.normalTotal)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1 text-[11px] font-bold">
                      <span className={isSelected ? 'text-[#1A1A2E]/80' : 'text-nb-gray-600'}>
                        {b.match_count} Match ({formatRupiah(savings.pricePerMatch)}/match)
                      </span>
                      {b.badge ? (
                        <span className="nb-badge bg-nb-purple text-white text-[10px] py-0 px-1.5 font-bold">
                          {b.badge}
                        </span>
                      ) : savings.savings > 0 ? (
                        <span className="nb-badge bg-nb-lime text-[#1A1A2E] text-[10px] py-0 px-1.5 font-black">
                          HEMAT {formatRupiah(savings.savings)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Checkout Form */}
        <div className="nb-card p-6 sm:p-8">
          <div className="pb-4 mb-6 border-b-2 border-nb-black/10">
            <h2 className="text-xl font-black uppercase text-nb-black flex items-center gap-2">
              <span>📝</span> FORMULIR PEMAIN & PEMBAYARAN
            </h2>
            <p className="text-xs text-nb-gray-600 mt-1 font-medium">
              Isi data di bawah ini untuk mendaftar antrean live stream.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red text-nb-black font-bold text-sm shadow-nb-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Guest Name */}
            <div>
              <label htmlFor="guestName" className="block text-xs font-black uppercase tracking-wider text-nb-black mb-1">
                Nama Kamu (In-Game Nickname) <span className="text-nb-red">*</span>
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Contoh: Fakhriadi / ReynaGod"
                maxLength={50}
                required
                className="nb-input w-full font-bold"
              />
              {fieldErrors.displayName && (
                <p className="text-nb-red text-xs font-bold mt-1">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            {/* Guest Email */}
            <div>
              <label htmlFor="guestEmail" className="block text-xs font-black uppercase tracking-wider text-nb-black mb-1">
                Email Aktif <span className="text-nb-red">*</span>
              </label>
              <input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="nama@email.com (tiket & update antrean dikirim ke sini)"
                required
                className="nb-input w-full font-medium"
              />
              {fieldErrors.email && (
                <p className="text-nb-red text-xs font-bold mt-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Custom Catalog Fields */}
            {catalog.catalog_fields.map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-black uppercase tracking-wider text-nb-black mb-1">
                  {field.label} {field.is_required && <span className="text-nb-red">*</span>}
                </label>

                {field.field_type === 'text' && (
                  <input
                    type="text"
                    value={answers[field.field_key] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [field.field_key]: e.target.value })
                    }
                    placeholder={field.placeholder || `Masukkan ${field.label}`}
                    required={field.is_required}
                    className="nb-input w-full font-medium"
                  />
                )}

                {field.field_type === 'textarea' && (
                  <textarea
                    value={answers[field.field_key] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [field.field_key]: e.target.value })
                    }
                    placeholder={field.placeholder || `Masukkan ${field.label}`}
                    required={field.is_required}
                    rows={2}
                    className="nb-input w-full resize-none font-medium"
                  />
                )}

                {field.field_type === 'dropdown' && (
                  <select
                    value={answers[field.field_key] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [field.field_key]: e.target.value })
                    }
                    required={field.is_required}
                    className="nb-input w-full font-bold cursor-pointer"
                  >
                    <option value="">-- Pilih {field.label} --</option>
                    {field.options.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {fieldErrors[field.field_key] && (
                  <p className="text-nb-red text-xs font-bold mt-1">
                    {fieldErrors[field.field_key]}
                  </p>
                )}
              </div>
            ))}

            {/* Guest Message */}
            <div>
              <label htmlFor="guestMessage" className="block text-xs font-black uppercase tracking-wider text-nb-black mb-1">
                Pesan untuk Streamer (Muncul di Live Stream)
              </label>
              <textarea
                id="guestMessage"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                placeholder="Tulis pesan semangat, request role, atau salam untuk penonton stream..."
                maxLength={200}
                rows={3}
                className="nb-input w-full resize-none font-medium"
              />
              <p className="text-nb-gray-500 text-[11px] text-right font-mono mt-1">
                {guestMessage.length}/200
              </p>
            </div>

            {/* FAST TRACK VIP TOGGLE CARD */}
            {fastTrackConfig.enabled && (
              <div
                onClick={() => setIsFastTrack(!isFastTrack)}
                className={`p-4 rounded-2xl border-3 transition-all cursor-pointer select-none relative ${
                  isFastTrack
                    ? 'bg-nb-yellow text-[#1A1A2E] border-nb-black shadow-nb-md scale-[1.01]'
                    : 'bg-nb-cream text-nb-black border-nb-black/40 hover:border-nb-black shadow-nb-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nb-purple text-white border-2 border-nb-black shadow-nb-xs flex items-center justify-center text-xl shrink-0 mt-0.5">
                      ⚡
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-heading font-black text-sm uppercase ${
                          isFastTrack ? 'text-[#1A1A2E]' : 'text-nb-black'
                        }`}>
                          Jalur Cepat Fast Track VIP
                        </span>
                        <span className="nb-badge bg-nb-black text-nb-yellow border border-nb-black text-[10px] font-black uppercase font-mono">
                          +{formatRupiah(fastTrackConfig.fee)}
                        </span>
                      </div>
                      <p className={`text-xs font-bold mt-1 ${
                        isFastTrack ? 'text-[#1A1A2E]/90' : 'text-nb-gray-600'
                      }`}>
                        🚀 <b>Lompat Antrean!</b> Antrean Anda otomatis diprioritaskan di <b>posisi teratas</b> dan dipanggil lebih dulu sebelum antrean reguler!
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isFastTrack}
                    onChange={(e) => setIsFastTrack(e.target.checked)}
                    className="w-5 h-5 accent-nb-purple rounded cursor-pointer mt-1"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-xl bg-nb-cream border-3 border-nb-black shadow-nb-sm space-y-2">
              <div className="flex justify-between text-xs font-bold text-nb-gray-600">
                <span>LAYANAN MABAR</span>
                <span className="text-nb-black uppercase font-extrabold">{catalog.name}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-nb-gray-600">
                <span>PILIHAN PAKET</span>
                <span className="text-nb-purple font-mono uppercase font-black">
                  {currentName} ({formatRupiah(currentPrice)})
                </span>
              </div>
              {isFastTrack && fastTrackConfig.enabled && (
                <div className="flex justify-between items-center text-xs font-bold bg-nb-yellow text-[#1A1A2E] px-3 py-1.5 rounded-lg border-2 border-nb-black shadow-nb-xs">
                  <span className="flex items-center gap-1 font-black">
                    <span>⚡</span> FAST TRACK VIP (Lompat Antrean)
                  </span>
                  <span className="font-mono font-black">+{formatRupiah(fastTrackConfig.fee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-extrabold text-nb-black pt-2 border-t-2 border-nb-black/10">
                <span>TOTAL PEMBAYARAN</span>
                <span className="text-xl font-mono font-black text-nb-black bg-nb-lime/50 border border-nb-black px-2 py-0.5 rounded-md">
                  {formatRupiah(finalPrice)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full nb-btn nb-btn-primary py-4 text-base font-black uppercase tracking-wider shadow-nb-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'MEMPROSES TRANSAKSI...' : `BAYAR ${formatRupiah(finalPrice)} SEKARANG`}
            </button>

            <p className="text-center text-nb-gray-500 text-[11px] font-medium">
              🔒 Pembayaran aman otomatis diverifikasi & nomor antrean langsung terbit.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
