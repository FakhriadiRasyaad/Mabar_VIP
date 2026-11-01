'use client';

import { useEffect, useState, useRef } from 'react';
import { formatRupiah } from '@/lib/security';
import { CatalogBundle, calculateBundleSavings, parseCatalogFastTrack } from '@/lib/bundles';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';

interface CatalogField {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  sort_order: number;
}

interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  clean_description?: string;
  price_amount: number;
  cover_image_path?: string | null;
  bundles?: CatalogBundle[];
  max_slots?: number;
  fast_track?: { enabled: boolean; fee: number };
  fast_track_enabled?: boolean;
  fast_track_fee?: number;
  is_active: boolean;
  created_at: string;
  catalog_fields: CatalogField[];
}

export default function CatalogManagementPage() {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('5000');
  const [maxSlots, setMaxSlots] = useState<number>(4);
  const [coverImagePath, setCoverImagePath] = useState<string>('');
  const [bundles, setBundles] = useState<CatalogBundle[]>([]);
  const [fastTrackEnabled, setFastTrackEnabled] = useState<boolean>(true);
  const [fastTrackFee, setFastTrackFee] = useState<string>('10000');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogs');
      const data = await res.json();
      if (res.ok) {
        setCatalogs(data.catalogs || []);
      } else {
        setError(data.error || 'Gagal memuat katalog');
      }
    } catch {
      setError('Gagal memuat katalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const openCreateModal = () => {
    setEditingCatalog(null);
    setName('');
    setSlug('');
    setDescription('');
    setPriceAmount('5000');
    setMaxSlots(4);
    setCoverImagePath('');
    setFastTrackEnabled(true);
    setFastTrackFee('10000');
    setBundles([
      {
        id: `bundle-${Date.now()}`,
        name: 'Paket 6 Match',
        match_count: 6,
        price: 25000,
        badge: 'Hemat 5K 🔥',
      },
    ]);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingCatalog(item);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.clean_description || item.description || '');
    setPriceAmount(String(item.price_amount));
    setMaxSlots(item.max_slots || 4);
    setCoverImagePath(item.cover_image_path || '');
    setBundles(item.bundles && item.bundles.length > 0 ? item.bundles : []);
    const ft = parseCatalogFastTrack(item);
    setFastTrackEnabled(ft.enabled);
    setFastTrackFee(String(ft.fee));
    setError('');
    setShowModal(true);
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengupload foto.');
      }

      setCoverImagePath(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal upload foto.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Bundle handlers
  const handleAddBundle = () => {
    const basePrice = parseInt(priceAmount, 10) || 5000;
    const defaultCount = (bundles.length + 1) * 3;
    const calculatedPrice = Math.round(basePrice * defaultCount * 0.85); // 15% diskon otomatis

    setBundles([
      ...bundles,
      {
        id: `bundle-${Date.now()}`,
        name: `Paket ${defaultCount} Match`,
        match_count: defaultCount,
        price: calculatedPrice,
        badge: 'Hemat ' + formatRupiah(basePrice * defaultCount - calculatedPrice),
      },
    ]);
  };

  const handleApplyPresetBundle = (matchCount: number, bundlePrice: number, name: string, badge: string) => {
    const existingIdx = bundles.findIndex((b) => b.match_count === matchCount);
    if (existingIdx !== -1) {
      const updated = [...bundles];
      updated[existingIdx] = {
        ...updated[existingIdx],
        name,
        price: bundlePrice,
        badge,
      };
      setBundles(updated);
    } else {
      setBundles([
        ...bundles,
        {
          id: `bundle-${Date.now()}-${matchCount}`,
          name,
          match_count: matchCount,
          price: bundlePrice,
          badge,
        },
      ]);
    }
  };

  const handleUpdateBundle = (index: number, field: keyof CatalogBundle, value: any) => {
    const updated = [...bundles];
    updated[index] = { ...updated[index], [field]: value };
    setBundles(updated);
  };

  const handleRemoveBundle = (index: number) => {
    setBundles(bundles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const parsedPrice = parseInt(priceAmount, 10);
    if (!parsedPrice || parsedPrice <= 0) {
      setError('Harga tiket per match harus lebih besar dari 0.');
      setSubmitting(false);
      return;
    }

    try {
      if (editingCatalog) {
        // Update existing catalog
        const res = await fetch(`/api/catalogs/${editingCatalog.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            price_amount: parsedPrice,
            cover_image_path: coverImagePath || null,
            bundles,
            max_slots: maxSlots,
            fast_track_enabled: fastTrackEnabled,
            fast_track_fee: parseInt(fastTrackFee, 10) || 10000,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal mengupdate katalog');
        }
        setSuccess('Katalog, paket bundling, dan pengaturan fast track berhasil diperbarui!');
      } else {
        // Create new catalog
        const res = await fetch('/api/catalogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            slug,
            description,
            price_amount: parsedPrice,
            cover_image_path: coverImagePath || null,
            bundles,
            max_slots: maxSlots,
            fast_track_enabled: fastTrackEnabled,
            fast_track_fee: parseInt(fastTrackFee, 10) || 10000,
            is_active: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal menambahkan katalog');
        }
        setSuccess('Layanan mabar baru berhasil ditambahkan!');
      }

      setShowModal(false);
      await fetchCatalogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (catalog: CatalogItem) => {
    try {
      const res = await fetch(`/api/catalogs/${catalog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !catalog.is_active }),
      });
      if (res.ok) {
        await fetchCatalogs();
      }
    } catch {
      setError('Gagal mengubah status aktif katalog');
    }
  };

  const handleDeleteCatalog = async (catalogId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus katalog mabar ini?')) return;

    try {
      const res = await fetch(`/api/catalogs/${catalogId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCatalogs();
      }
    } catch {
      setError('Gagal menghapus katalog');
    }
  };

  const basePriceNum = parseInt(priceAmount, 10) || 0;

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
              Katalog Layanan Mabar
            </h1>
            <p className="text-nb-gray-600 text-sm mt-1">
              Atur game, foto cover, harga satuan per match, dan paket bundling mabar (Contoh: 1 match 5K, 6 match 25K).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle />
            <button
              type="button"
              onClick={openCreateModal}
              className="nb-btn nb-btn-primary text-sm py-2.5 px-4 font-black"
            >
              + TAMBAH LAYANAN
            </button>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red text-nb-black font-bold text-sm shadow-nb-sm">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-nb-lime/30 border-3 border-nb-black text-nb-black font-bold text-sm shadow-nb-sm">
            ✅ {success}
          </div>
        )}

        {/* Modal Tambah / Edit Katalog */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div className="max-w-2xl w-full bg-nb-cream border-4 border-nb-black rounded-2xl shadow-nb-xl p-6 relative my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-nb-black/10">
                <div>
                  <h3 className="text-xl font-extrabold uppercase text-nb-black">
                    {editingCatalog ? 'Edit Layanan Mabar & Bundling' : 'Tambah Layanan Mabar Baru'}
                  </h3>
                  <p className="text-xs text-nb-gray-500 font-semibold mt-0.5">
                    Lengkapi foto cover, harga satuan, dan diskon paket bundling untuk menarik lebih banyak penonton.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg bg-nb-pink border-2 border-nb-black font-extrabold text-sm flex items-center justify-center hover:bg-nb-red transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. FOTO COVER */}
                <div className="p-4 rounded-xl bg-nb-white border-2 border-nb-black space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase tracking-wider text-nb-black">
                      📸 Foto Cover Game / Thumbnail Katalog
                    </label>
                    <span className="text-[11px] font-bold text-nb-purple">Format: JPG, PNG, WEBP (Max 5MB)</span>
                  </div>

                  {coverImagePath ? (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-nb-cream border-2 border-nb-black">
                      <div className="w-24 h-24 rounded-lg border-2 border-nb-black overflow-hidden relative bg-nb-black/5 shrink-0 shadow-nb-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImagePath}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold text-nb-black break-all font-mono">
                          {coverImagePath}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="nb-btn nb-btn-ghost text-xs py-1 px-3"
                          >
                            Ganti Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverImagePath('')}
                            className="nb-btn nb-btn-danger text-xs py-1 px-3"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-3 border-dashed border-nb-black rounded-xl p-6 text-center bg-nb-cream/50 hover:bg-nb-yellow/20 transition-colors cursor-pointer"
                    >
                      <div className="text-3xl mb-1">🖼️</div>
                      <p className="text-sm font-black uppercase text-nb-black">
                        {uploadingImage ? 'Sedang Mengupload...' : 'Klik untuk Upload Foto Katalog'}
                      </p>
                      <p className="text-xs text-nb-gray-500 font-bold mt-1">
                        Tampilkan gambar hero game (Valorant, MLBB, Roblox, dll) agar katalog Anda terlihat profesional.
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </div>

                {/* 2. INFORMASI GAME */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="catName" className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                      Nama Layanan / Game
                    </label>
                    <input
                      id="catName"
                      placeholder="Contoh: Mabar Valorant Ranked"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!editingCatalog && !slug) {
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-|-$/g, '')
                          );
                        }
                      }}
                      required
                      className="nb-input w-full font-bold"
                    />
                  </div>

                  <div>
                    <label htmlFor="catSlug" className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                      URL Slug
                    </label>
                    <input
                      id="catSlug"
                      placeholder="mabar-valorant-ranked"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={Boolean(editingCatalog)}
                      required
                      className="nb-input w-full font-mono text-sm disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* 3. HARGA SATUAN (BASE PRICE) */}
                <div className="p-4 rounded-xl bg-nb-yellow/30 border-2 border-nb-black space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="catPrice" className="block text-xs font-black uppercase tracking-wider text-nb-black">
                      💰 Harga Satuan Tiket (1 Match / 1 Sesi)
                    </label>
                    <span className="nb-badge nb-badge-lime text-[11px] font-mono font-bold">Base Price</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-black text-xl text-nb-black">Rp</span>
                    <input
                      id="catPrice"
                      type="number"
                      min="1000"
                      step="500"
                      placeholder="5000"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      required
                      className="nb-input w-full font-mono text-xl font-black"
                    />
                  </div>
                  <p className="text-xs text-nb-gray-600 font-semibold">
                    Ini adalah harga dasar untuk penonton yang hanya ingin membeli 1 match mabar.
                  </p>
                </div>

                {/* 3.5 KUOTA PEMAIN SEKALI MAIN (PARTY CAPACITY) */}
                <div className="p-4 rounded-xl bg-nb-cyan/20 border-2 border-nb-black space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="catMaxSlots" className="block text-xs font-black uppercase tracking-wider text-nb-black flex items-center gap-1.5">
                        <span>👥</span> Kuota Pemain Sekali Main (VIP Party Slots)
                      </label>
                      <p className="text-[11px] text-nb-gray-600 font-semibold mt-0.5">
                        Berapa banyak penonton VIP yang bisa bermain bersama Anda dalam 1 match/sesi game ini?
                      </p>
                    </div>
                    <span className="nb-badge nb-badge-cyan text-xs font-mono font-black">
                      {maxSlots} VIP / Match
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMaxSlots((prev) => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-nb-cream border-2 border-nb-black text-xl font-black text-nb-black hover:bg-nb-yellow active:translate-y-0.5 transition-all flex items-center justify-center shrink-0 shadow-nb-sm"
                    >
                      -
                    </button>
                    <input
                      id="catMaxSlots"
                      type="number"
                      min="1"
                      max="10"
                      value={maxSlots}
                      onChange={(e) => setMaxSlots(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                      required
                      className="nb-input text-center font-mono text-xl font-black w-24"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxSlots((prev) => Math.min(10, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-nb-cream border-2 border-nb-black text-xl font-black text-nb-black hover:bg-nb-yellow active:translate-y-0.5 transition-all flex items-center justify-center shrink-0 shadow-nb-sm"
                    >
                      +
                    </button>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                      {[
                        { label: '1v1 / Solo', slots: 1 },
                        { label: 'Duo (2)', slots: 2 },
                        { label: 'Trio (3)', slots: 3 },
                        { label: 'MLBB / Valo (4)', slots: 4 },
                        { label: 'Party 5', slots: 5 },
                      ].map((preset) => (
                        <button
                          key={preset.slots}
                          type="button"
                          onClick={() => setMaxSlots(preset.slots)}
                          className={`text-[10px] font-extrabold uppercase py-1 px-2 rounded-lg border border-nb-black transition-all ${
                            maxSlots === preset.slots
                              ? 'bg-nb-yellow text-[#1A1A2E] shadow-nb-sm scale-105 font-black border-2'
                              : 'bg-nb-cream text-nb-black hover:bg-nb-yellow/60'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-nb-black bg-nb-cream/90 border border-nb-black/30 rounded-lg p-2.5 font-medium">
                    💡 <b>Contoh:</b> Untuk <b>Mobile Legends / Valorant</b>, streamer biasanya 1 orang + <b>4 slot VIP penonton</b>. Jika game 1v1 (Tekken/E-Football), cukup <b>1 slot</b>. Anda juga bisa menambah/mengurangi kuota ini saat live stream di tab Antrean.
                  </div>
                </div>

                {/* 4. PAKET BUNDLING (FITUR BUNDLING) */}
                <div className="p-4 rounded-xl bg-nb-white border-2 border-nb-black space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-nb-black flex items-center gap-1.5">
                        <span>📦</span> Paket Bundling Mabar (Beli Borongan Lebih Hemat)
                      </h4>
                      <p className="text-[11px] text-nb-gray-500 font-bold mt-0.5">
                        Contoh: 1 Match Rp 5.000, tapi beli 6 Match Rp 25.000 (Hemat Rp 5.000)!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBundle}
                      className="nb-btn nb-btn-secondary text-xs py-1.5 px-3 font-bold"
                    >
                      + Tambah Paket Manual
                    </button>
                  </div>

                  {/* Quick Preset Bundles */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-1 border-t border-b border-nb-black/10">
                    <span className="text-[11px] font-black uppercase text-nb-black">💡 Pasang Contoh Cepat:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetBundle(6, 25000, 'Paket 6 Match', 'Hemat 5K 🔥')}
                      className="text-[11px] font-black uppercase py-1 px-2.5 rounded-lg border-2 border-nb-black bg-nb-yellow hover:scale-105 active:scale-95 transition-all text-[#1A1A2E] shadow-nb-xs"
                    >
                      🔥 6 Match = Rp 25.000 (Hemat 5K)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = Math.round(basePriceNum * 3 * 0.9);
                        handleApplyPresetBundle(3, p > 0 ? p : 13500, 'Paket 3 Match', 'Hemat 10%');
                      }}
                      className="text-[11px] font-bold uppercase py-1 px-2 rounded-lg border border-nb-black bg-nb-cream hover:bg-nb-yellow/50 transition-all text-nb-black"
                    >
                      ⚡ 3 Match (10% OFF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = Math.round(basePriceNum * 10 * 0.8);
                        handleApplyPresetBundle(10, p > 0 ? p : 40000, 'Paket 10 Match', 'Super Hemat 20%');
                      }}
                      className="text-[11px] font-bold uppercase py-1 px-2 rounded-lg border border-nb-black bg-nb-cream hover:bg-nb-yellow/50 transition-all text-nb-black"
                    >
                      🏆 10 Match (20% OFF)
                    </button>
                  </div>

                  {bundles.length === 0 ? (
                    <div className="p-4 rounded-lg bg-nb-cream/60 border border-nb-black/20 text-center text-xs font-bold text-nb-gray-500">
                      Belum ada paket bundling. Klik tombol preset di atas atau tombol <strong>&ldquo;+ Tambah Paket Manual&rdquo;</strong>.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bundles.map((bundle, idx) => {
                        const savings = calculateBundleSavings(basePriceNum, bundle);
                        return (
                          <div
                            key={bundle.id || idx}
                            className="p-3.5 rounded-xl bg-nb-cream border-2 border-nb-black shadow-nb-sm space-y-2 relative"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="nb-badge nb-badge-cyan text-[10px] font-black uppercase">
                                Paket #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBundle(idx)}
                                className="text-nb-red hover:underline text-xs font-black"
                              >
                                ✕ Hapus
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                              <div className="sm:col-span-5">
                                <label className="block text-[10px] font-bold uppercase text-nb-black mb-1">
                                  Nama Paket
                                </label>
                                <input
                                  type="text"
                                  value={bundle.name}
                                  placeholder="Contoh: Paket 6 Match"
                                  onChange={(e) => handleUpdateBundle(idx, 'name', e.target.value)}
                                  className="nb-input py-1.5 px-2 text-xs font-bold w-full"
                                  required
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold uppercase text-nb-black mb-1">
                                  Total Match
                                </label>
                                <input
                                  type="number"
                                  min="2"
                                  value={bundle.match_count}
                                  onChange={(e) =>
                                    handleUpdateBundle(idx, 'match_count', parseInt(e.target.value, 10) || 1)
                                  }
                                  className="nb-input py-1.5 px-2 text-xs font-mono font-bold w-full"
                                  required
                                />
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-[10px] font-bold uppercase text-nb-black mb-1">
                                  Harga Paket (Rp)
                                </label>
                                <input
                                  type="number"
                                  min="1000"
                                  step="500"
                                  value={bundle.price}
                                  onChange={(e) =>
                                    handleUpdateBundle(idx, 'price', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="nb-input py-1.5 px-2 text-xs font-mono font-black w-full"
                                  required
                                />
                              </div>
                            </div>

                            {/* Savings preview */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-nb-black/10 font-bold flex-wrap gap-1">
                              <span className="text-nb-gray-600">
                                Normal: {bundle.match_count}x {formatRupiah(basePriceNum)} ={' '}
                                <span className="line-through">{formatRupiah(savings.normalTotal)}</span>
                              </span>
                              {savings.savings > 0 ? (
                                <span className="nb-badge nb-badge-lime text-[10px] font-black">
                                  HEMAT {formatRupiah(savings.savings)} ({savings.discountPercent}% OFF)
                                </span>
                              ) : (
                                <span className="text-nb-gray-500">
                                  {formatRupiah(savings.pricePerMatch)} / match
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4.5 PENGATURAN FAST TRACK (LOMPAT ANTREAN) */}
                <div className="p-5 rounded-2xl bg-nb-white border-3 border-nb-black shadow-nb-md space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b-2 border-nb-black/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-nb-yellow border-2 border-nb-black shadow-nb-xs flex items-center justify-center text-xl shrink-0 text-[#1A1A2E]">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-nb-black flex items-center gap-1.5">
                          Fitur Fast Track VIP (Lompat Antrean Langsung)
                        </h4>
                        <p className="text-xs text-nb-gray-600 font-semibold mt-0.5">
                          Penonton yang beli Fast Track akan otomatis naik langsung ke urutan teratas antrean live stream.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fastTrackEnabled}
                        onChange={(e) => setFastTrackEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-nb-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-nb-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-nb-white after:border-2 after:border-nb-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nb-yellow border-2 border-nb-black"></div>
                      <span className="ml-2.5 text-xs font-black uppercase text-nb-black">
                        {fastTrackEnabled ? '⚡ FAST TRACK AKTIF' : 'NONAKTIF'}
                      </span>
                    </label>
                  </div>

                  {fastTrackEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-nb-cream p-3 rounded-xl border-2 border-nb-black">
                        <label htmlFor="catFastTrackFee" className="text-xs font-black uppercase text-nb-black flex items-center gap-1.5">
                          <span>💰</span> Biaya Tambahan Fast Track:
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-nb-black">+Rp</span>
                          <input
                            id="catFastTrackFee"
                            type="number"
                            min="1000"
                            step="1000"
                            value={fastTrackFee}
                            onChange={(e) => setFastTrackFee(e.target.value)}
                            className="nb-input py-1.5 px-3 text-sm font-mono font-black w-36"
                            required={fastTrackEnabled}
                          />
                        </div>
                      </div>

                      {/* Quick fee presets */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-nb-gray-600 uppercase">Pilihan Cepat:</span>
                        {[5000, 10000, 15000, 20000, 25000].map((feePreset) => {
                          const isSelected = fastTrackFee === String(feePreset);
                          return (
                            <button
                              key={feePreset}
                              type="button"
                              onClick={() => setFastTrackFee(String(feePreset))}
                              className={`text-xs font-extrabold uppercase py-1 px-3 rounded-lg border-2 border-nb-black transition-all ${
                                isSelected
                                  ? 'bg-nb-yellow text-[#1A1A2E] font-black shadow-nb-xs scale-105'
                                  : 'bg-nb-cream text-nb-black hover:bg-nb-yellow/40'
                              }`}
                            >
                              +{formatRupiah(feePreset)}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-xs text-nb-black bg-nb-cream border-2 border-nb-black rounded-xl p-3 font-medium leading-relaxed">
                        🚀 <b>Cara Kerja Fast Track:</b> Penonton dapat mencentang opsi Fast Track saat memesan tiket. Setelah pembayaran selesai, tiket mereka otomatis diberi badge <b>⚡ FAST TRACK</b> dan langsung diletakkan di <b>posisi paling atas antrean</b> sebelum antrean penonton reguler!
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. DESKRIPSI & ATURAN */}
                <div>
                  <label htmlFor="catDesc" className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                    Deskripsi / Aturan Match
                  </label>
                  <textarea
                    id="catDesc"
                    placeholder="Contoh: 1 match ranked. Wajib open mic Discord dan rank minimal Gold."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="nb-input w-full resize-none font-medium"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t-2 border-nb-black/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="nb-btn nb-btn-ghost text-xs py-2 px-4"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="nb-btn nb-btn-primary text-xs py-2 px-5 font-black"
                  >
                    {submitting ? 'Menyimpan...' : editingCatalog ? 'Simpan Perubahan' : 'Buat Layanan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Catalog List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-nb-black border-t-nb-yellow rounded-full animate-spin mx-auto mb-3" />
            <p className="text-nb-gray-600 font-bold text-sm">Memuat katalog mabar...</p>
          </div>
        ) : catalogs.length === 0 ? (
          <div className="nb-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-3xl mx-auto mb-4">
              🎯
            </div>
            <h3 className="text-xl font-extrabold uppercase text-nb-black">Belum Ada Layanan Mabar</h3>
            <p className="text-nb-gray-600 text-sm mt-2 max-w-md mx-auto mb-6">
              Mulai buat layanan mabar game pertama Anda untuk membuka antrean berbayar kepada penonton stream Anda.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="nb-btn nb-btn-primary text-sm font-black"
            >
              + Tambah Layanan Mabar
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {catalogs.map((item) => (
              <div
                key={item.id}
                className="nb-card flex flex-col justify-between p-6 hover:translate-x-0.5 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start gap-4">
                    {/* Cover Photo */}
                    <div className="w-20 h-20 rounded-xl border-2 border-nb-black bg-nb-yellow flex items-center justify-center overflow-hidden shrink-0 shadow-nb-sm">
                      {item.cover_image_path ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.cover_image_path}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">🎮</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-xl font-extrabold uppercase text-nb-black truncate">
                          {item.name}
                        </h3>
                        <span
                          className={`nb-badge text-xs font-bold ${
                            item.is_active ? 'nb-badge-lime' : 'nb-badge-yellow'
                          }`}
                        >
                          {item.is_active ? '● BUKA' : '○ TUTUP'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-nb-purple">
                        slug: /{item.slug}
                      </span>

                      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-black text-nb-black font-mono">
                          {formatRupiah(item.price_amount)}
                        </span>
                        <span className="text-[11px] font-bold text-nb-gray-500 uppercase">
                          / 1 match
                        </span>
                        <span className="nb-badge bg-nb-cyan text-nb-black border-2 border-nb-black font-extrabold text-[10px] py-0.5 px-2">
                          👥 {item.max_slots || 4} VIP Slots
                        </span>
                        {(() => {
                          const ft = item.fast_track || parseCatalogFastTrack(item);
                          return ft.enabled ? (
                            <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-2 border-nb-black font-black text-[10px] py-0.5 px-2 shadow-nb-xs flex items-center gap-1">
                              ⚡ Fast Track (+{formatRupiah(ft.fee)})
                            </span>
                          ) : (
                            <span className="nb-badge bg-nb-gray-200 text-nb-gray-600 border border-nb-black text-[10px] py-0.5 px-2 font-bold">
                              Fast Track Off
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <p className="text-nb-gray-700 text-sm mt-3 line-clamp-2">
                    {item.clean_description || item.description || 'Tidak ada deskripsi.'}
                  </p>

                  {/* Bundles Badge List */}
                  {item.bundles && item.bundles.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-nb-cream border-2 border-nb-black/20 space-y-1">
                      <div className="text-[10px] font-black uppercase text-nb-purple flex items-center gap-1">
                        <span>📦</span> Pilihan Paket Bundling ({item.bundles.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.bundles.map((b) => (
                          <span
                            key={b.id}
                            className="nb-badge bg-nb-yellow text-[#1A1A2E] text-[11px] font-bold"
                          >
                            {b.name}: {formatRupiah(b.price)} {b.badge ? `(${b.badge})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fields list */}
                  <div className="p-3 rounded-xl bg-white border-2 border-nb-black mt-3 shadow-nb-sm">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-nb-gray-600 mb-2">
                      Formulir Pemain ({(item.catalog_fields || []).length} Field)
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {(item.catalog_fields || []).length > 0 ? (
                        (item.catalog_fields || []).map((f) => (
                          <span
                            key={f.id}
                            className="px-2 py-0.5 rounded-md bg-nb-cream border border-nb-black text-nb-black font-semibold text-xs"
                          >
                            {f.label} {f.is_required && <span className="text-nb-red">*</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-nb-gray-400 italic">
                          Formulir default (In-Game Name & Kontak)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-nb-black/10 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="nb-btn nb-btn-ghost text-xs py-2 px-3 font-bold"
                    >
                      ✏️ Edit / Paket
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`nb-btn text-xs py-2 px-3 font-bold ${
                        item.is_active ? 'nb-btn-ghost' : 'nb-btn-cyan'
                      }`}
                    >
                      {item.is_active ? '⏸️ Tutup' : '▶️ Buka'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCatalog(item.id)}
                    className="nb-btn nb-btn-danger text-xs py-2 px-3 font-bold"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
