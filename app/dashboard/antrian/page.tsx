'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRupiah, formatDateTime } from '@/lib/security';
import { parseCatalogSlots, isOrderFastTrack, sortWaitingQueue } from '@/lib/bundles';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';

interface OrderItem {
  id: string;
  catalog_id: string;
  guest_display_name: string;
  guest_message: string;
  guest_answers: Record<string, any>;
  amount: number;
  queue_number: number;
  queue_status: 'waiting' | 'invited' | 'in_room' | 'completed' | 'skipped' | 'cancelled';
  paid_at: string;
  created_at: string;
  is_fast_track?: boolean;
  fast_track_fee?: number;
  catalog?: {
    name: string;
  };
}

interface CatalogOption {
  id: string;
  name: string;
  max_slots: number;
  description?: string | null;
  cover_image_path?: string | null;
}

export default function QueueManagementPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('all');
  const [activeRoomCatalogId, setActiveRoomCatalogId] = useState<string>('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [quotaUpdating, setQuotaUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch catalogs belonging to current authenticated star via API
    let myCats: CatalogOption[] = [];
    try {
      const catRes = await fetch('/api/catalogs');
      const catData = await catRes.json();
      if (catRes.ok && Array.isArray(catData.catalogs)) {
        myCats = catData.catalogs.map((c: any) => ({
          id: c.id,
          name: c.name,
          max_slots: c.max_slots || parseCatalogSlots(c),
          description: c.description,
          cover_image_path: c.cover_image_path,
        }));
        setCatalogs(myCats);

        // Keep active room catalog or default to first
        setActiveRoomCatalogId((prev) => {
          if (prev && myCats.some((c) => c.id === prev)) return prev;
          return myCats.length > 0 ? myCats[0].id : '';
        });
      }
    } catch (e) {
      console.error('Error fetching star catalogs:', e);
    }

    const catIds = myCats.map((c) => c.id);
    if (catIds.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Fetch orders paid
    const statuses =
      activeTab === 'active'
        ? ['waiting', 'invited', 'in_room', 'skipped']
        : ['completed', 'cancelled'];

    let query = supabase
      .from('orders')
      .select(`
        id,
        catalog_id,
        guest_display_name,
        guest_message,
        guest_answers,
        amount,
        queue_number,
        queue_status,
        paid_at,
        created_at,
        catalogs (
          name
        )
      `)
      .eq('payment_status', 'paid')
      .in('queue_status', statuses)
      .order('queue_number', { ascending: true });

    if (selectedCatalogId !== 'all') {
      query = query.eq('catalog_id', selectedCatalogId);
    } else {
      query = query.in('catalog_id', catIds);
    }

    const { data, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('Fetch orders error:', fetchErr);
      setError('Gagal memuat daftar antrean.');
    } else {
      const formatted = (data || []).map((o: any) => ({
        ...o,
        is_fast_track: isOrderFastTrack(o),
        catalog: o.catalogs,
      }));
      setOrders(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, selectedCatalogId]);

  // Update single order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/queue/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah status antrean.');
      }

      await fetchOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setUpdatingId(null);
    }
  };

  // Batch update multiple orders simultaneously
  const handleBatchUpdateStatus = async (orderIds: string[], newStatus: string, label: string) => {
    if (orderIds.length === 0) return;
    setBatchLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/queue/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui status secara bersamaan.');
      }

      setSuccessMsg(`Berhasil: ${label} untuk ${orderIds.length} pemain!`);
      await fetchOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat batch update');
    } finally {
      setBatchLoading(false);
    }
  };

  // Update catalog party quota (max_slots)
  const handleUpdateQuota = async (catalogId: string, newQuota: number) => {
    if (newQuota < 1 || newQuota > 10) return;
    setQuotaUpdating(true);
    setError('');
    setSuccessMsg('');

    // Optimistic UI update
    setCatalogs((prev) =>
      prev.map((c) => (c.id === catalogId ? { ...c, max_slots: newQuota } : c))
    );

    try {
      const res = await fetch(`/api/catalogs/${catalogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_slots: newQuota }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah kuota sekali main');
      }

      setSuccessMsg(`Kuota sekali main berhasil diubah menjadi ${newQuota} VIP Slots!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui kuota di server');
      fetchOrders();
    } finally {
      setQuotaUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <span className="nb-badge nb-badge-yellow">⏳ MENUNGGU</span>;
      case 'invited':
        return <span className="nb-badge nb-badge-cyan">📢 DIPANGGIL</span>;
      case 'in_room':
        return <span className="nb-badge nb-badge-lime animate-pulse">🎮 MAIN</span>;
      case 'completed':
        return <span className="nb-badge bg-nb-gray-200 border-2 border-nb-black text-nb-black">✅ SELESAI</span>;
      case 'skipped':
        return <span className="nb-badge nb-badge-orange">⏭️ DILEWATI</span>;
      default:
        return <span className="nb-badge bg-white border-2 border-nb-black">{status}</span>;
    }
  };

  // Active room catalog determination
  const currentRoomCatalog =
    catalogs.find((c) => c.id === (selectedCatalogId !== 'all' ? selectedCatalogId : activeRoomCatalogId)) ||
    catalogs[0];

  const currentRoomQuota = currentRoomCatalog?.max_slots || 4;

  // Filter orders belonging to the active room catalog
  const roomInGame = orders.filter(
    (o) => o.catalog_id === currentRoomCatalog?.id && o.queue_status === 'in_room'
  );
  const roomInvited = orders.filter(
    (o) => o.catalog_id === currentRoomCatalog?.id && o.queue_status === 'invited'
  );
  const rawRoomWaiting = orders.filter(
    (o) => o.catalog_id === currentRoomCatalog?.id && o.queue_status === 'waiting'
  );
  // Prioritize Fast Track players to the front of the queue
  const roomWaiting = sortWaitingQueue(rawRoomWaiting);

  const roomOccupiedCount = roomInGame.length + roomInvited.length;
  const roomEmptySlotsCount = Math.max(0, currentRoomQuota - roomOccupiedCount);
  const isFullPartyInGame = roomInGame.length >= currentRoomQuota;

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
              Manajemen Antrean & Room Party VIP
            </h1>
            <p className="text-nb-gray-600 text-sm mt-1">
              Pantau visual box party, atur kuota main bareng, panggil penonton, dan update status game secara live.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle />
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="nb-btn nb-btn-secondary text-xs py-2 px-3"
            >
              🔄 Refresh Antrean
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Success or Error alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red text-nb-black font-bold text-sm shadow-nb-sm">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-nb-lime/30 border-3 border-nb-black text-nb-black font-bold text-sm shadow-nb-sm">
            ✅ {successMsg}
          </div>
        )}

        {/* ======================================================== */}
        {/* VISUAL BOX PARTY ARENA MABAR VIP (REAL-TIME GAME ROOM) */}
        {/* ======================================================== */}
        {currentRoomCatalog && activeTab === 'active' && (
          <div className="nb-card p-6 bg-gradient-to-br from-nb-cream via-white to-nb-yellow/15 border-4 border-nb-black shadow-nb-lg relative overflow-hidden">
            {/* Top decorative stripe */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b-3 border-nb-black">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="nb-badge nb-badge-purple text-xs font-black uppercase tracking-wider">
                    🎮 ARENA LIVE ROOM PARTY
                  </span>
                  {isFullPartyInGame ? (
                    <span className="nb-badge nb-badge-lime text-xs font-black animate-pulse">
                      🔥 ROOM PENUH ({currentRoomQuota}/{currentRoomQuota} SEDANG BERMAIN)
                    </span>
                  ) : roomInGame.length > 0 ? (
                    <span className="nb-badge nb-badge-cyan text-xs font-black">
                      ⚡ {roomInGame.length} MAIN BARENG · {roomEmptySlotsCount} SLOT KOSONG
                    </span>
                  ) : (
                    <span className="nb-badge nb-badge-yellow text-xs font-black">
                      🟢 {roomEmptySlotsCount} SLOT VIP KOSONG
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black uppercase text-nb-black flex items-center gap-2">
                  <span>{currentRoomCatalog.name}</span>
                </h2>
                <p className="text-xs text-nb-gray-600 font-bold mt-0.5">
                  Visualisasi party sekali main untuk game ini. Streamer bersama penonton VIP di dalam arena.
                </p>
              </div>

              {/* Game Selector & Quota Adjuster */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Catalog Switcher if multiple */}
                {catalogs.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-nb-white border-2 border-nb-black rounded-xl p-1 shadow-nb-sm">
                    {catalogs.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveRoomCatalogId(cat.id);
                          if (selectedCatalogId !== 'all') setSelectedCatalogId(cat.id);
                        }}
                        className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
                          currentRoomCatalog.id === cat.id
                            ? 'bg-nb-yellow text-[#1A1A2E] border border-nb-black shadow-nb-sm'
                            : 'text-nb-black hover:bg-nb-yellow/40'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quota +/- Controller */}
                <div className="flex items-center gap-2 bg-nb-white border-3 border-nb-black rounded-xl p-1.5 shadow-nb-sm">
                  <span className="text-[11px] font-black uppercase tracking-wider text-nb-black pl-2">
                    👥 Kuota VIP:
                  </span>
                  <button
                    type="button"
                    disabled={currentRoomQuota <= 1 || quotaUpdating}
                    onClick={() => handleUpdateQuota(currentRoomCatalog.id, currentRoomQuota - 1)}
                    className="w-8 h-8 rounded-lg bg-nb-pink border-2 border-nb-black text-lg font-black text-nb-black hover:bg-nb-red active:scale-95 disabled:opacity-40 flex items-center justify-center transition-all"
                    title="Kurangi 1 kuota VIP"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-base px-2 text-nb-black">
                    {currentRoomQuota} Slot
                  </span>
                  <button
                    type="button"
                    disabled={currentRoomQuota >= 10 || quotaUpdating}
                    onClick={() => handleUpdateQuota(currentRoomCatalog.id, currentRoomQuota + 1)}
                    className="w-8 h-8 rounded-lg bg-nb-lime border-2 border-nb-black text-lg font-black text-nb-black hover:bg-green-400 active:scale-95 disabled:opacity-40 flex items-center justify-center transition-all"
                    title="Tambah 1 kuota VIP"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Box Party Slots Grid */}
            <div className="pt-6">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  currentRoomQuota <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
                } gap-4`}
              >
                {Array.from({ length: currentRoomQuota }).map((_, slotIdx) => {
                  // Determine what occupies this slot
                  const inGamePlayer = roomInGame[slotIdx];
                  const invitedIdx = slotIdx - roomInGame.length;
                  const invitedPlayer = !inGamePlayer && invitedIdx >= 0 ? roomInvited[invitedIdx] : null;
                  const isOccupied = Boolean(inGamePlayer || invitedPlayer);

                  // If empty slot, find corresponding waiting player to suggest
                  const emptyOrderIdx = slotIdx - roomInGame.length - roomInvited.length;
                  const nextWaitingPlayer =
                    !isOccupied && emptyOrderIdx >= 0 ? roomWaiting[emptyOrderIdx] : null;

                  if (inGamePlayer) {
                    // 1. IN-GAME PLAYER BOX (SEDANG BERMAIN)
                    return (
                      <div
                        key={inGamePlayer.id}
                        className="p-4 rounded-2xl bg-nb-lime/25 border-3 border-nb-black shadow-nb-md flex flex-col justify-between gap-3 relative overflow-hidden transition-all transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="nb-badge bg-nb-black text-white text-[10px] font-mono font-black">
                            SLOT #{slotIdx + 1}
                          </span>
                          <span className="nb-badge nb-badge-lime text-[10px] font-black animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-600 animate-ping inline-block" />
                            🎮 SEDANG MAIN
                          </span>
                        </div>

                        <div className="space-y-1 my-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">👤</span>
                            <span className="font-heading font-black text-lg text-nb-black truncate">
                              {inGamePlayer.guest_display_name}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-nb-purple">
                            Urutan #{inGamePlayer.queue_number}
                          </div>

                          {/* Nickname/In-Game Details */}
                          {inGamePlayer.guest_answers && (
                            <div className="text-[11px] font-mono text-nb-black bg-white/80 border border-nb-black/30 rounded-md p-1.5 truncate">
                              🎮 {inGamePlayer.guest_answers.nickname || inGamePlayer.guest_answers.game_id || 'ID Terdaftar'}
                            </div>
                          )}

                          {Boolean((inGamePlayer.guest_answers as any)?._bundle) && (
                            <span className="inline-block nb-badge bg-nb-yellow text-[#1A1A2E] text-[10px] font-black">
                              📦 {(inGamePlayer.guest_answers as any)._bundle.name || 'Paket Bundling'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={updatingId === inGamePlayer.id}
                          onClick={() => handleUpdateStatus(inGamePlayer.id, 'completed')}
                          className="nb-btn nb-btn-primary w-full text-xs py-2 font-black"
                        >
                          ✅ Selesai Game
                        </button>
                      </div>
                    );
                  }

                  if (invitedPlayer) {
                    // 2. INVITED PLAYER BOX (DIPANGGIL / MENUNGGU MASUK ROOM)
                    return (
                      <div
                        key={invitedPlayer.id}
                        className="p-4 rounded-2xl bg-nb-yellow/35 border-3 border-nb-black shadow-nb-md flex flex-col justify-between gap-3 relative transition-all transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="nb-badge bg-nb-black text-white text-[10px] font-mono font-black">
                            SLOT #{slotIdx + 1}
                          </span>
                          <span className="nb-badge nb-badge-cyan text-[10px] font-black">
                            📢 MENUNGGU MASUK
                          </span>
                        </div>

                        <div className="space-y-1 my-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">⏳</span>
                            <span className="font-heading font-black text-lg text-nb-black truncate">
                              {invitedPlayer.guest_display_name}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-nb-purple">
                            Urutan #{invitedPlayer.queue_number}
                          </div>

                          {invitedPlayer.guest_answers && (
                            <div className="text-[11px] font-mono text-nb-black bg-white/80 border border-nb-black/30 rounded-md p-1.5 truncate">
                              🎮 {invitedPlayer.guest_answers.nickname || invitedPlayer.guest_answers.game_id || 'ID Terdaftar'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={updatingId === invitedPlayer.id}
                            onClick={() => handleUpdateStatus(invitedPlayer.id, 'in_room')}
                            className="nb-btn nb-btn-lime flex-1 text-xs py-2 font-black"
                          >
                            🎮 Mulai Main
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === invitedPlayer.id}
                            onClick={() => handleUpdateStatus(invitedPlayer.id, 'skipped')}
                            className="nb-btn nb-btn-ghost bg-white text-xs py-2 px-2.5 font-bold"
                            title="Lewati pemain ini"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // 3. EMPTY SLOT BOX (KOSONG)
                  return (
                    <div
                      key={`empty-${slotIdx}`}
                      className="p-4 rounded-2xl bg-nb-cream/40 border-3 border-dashed border-nb-black/60 hover:border-nb-black hover:bg-nb-cream flex flex-col justify-between gap-3 transition-all min-h-[180px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="nb-badge bg-nb-white text-nb-black border border-nb-black text-[10px] font-mono font-bold">
                          SLOT #{slotIdx + 1}
                        </span>
                        <span className="nb-badge bg-nb-lime text-[#1A1A2E] border border-nb-black text-[10px] font-black">
                          🟢 KOSONG
                        </span>
                      </div>

                      <div className="text-center py-2 space-y-1">
                        <div className="text-3xl opacity-80">🪑</div>
                        <div className="font-heading font-black text-sm uppercase text-nb-black">
                          Slot Kosong
                        </div>
                        <p className="text-[11px] text-nb-black/70 font-bold">
                          Tersedia untuk 1 penonton VIP
                        </p>
                      </div>

                      {nextWaitingPlayer ? (
                        <button
                          type="button"
                          disabled={updatingId === nextWaitingPlayer.id}
                          onClick={() => handleUpdateStatus(nextWaitingPlayer.id, 'invited')}
                          className={`nb-btn w-full text-[11px] py-1.5 px-2 font-black truncate shadow-nb-xs ${
                            isOrderFastTrack(nextWaitingPlayer)
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-2 border-nb-black animate-pulse'
                              : 'nb-btn-cyan'
                          }`}
                          title={`Panggil #${nextWaitingPlayer.queue_number} ${nextWaitingPlayer.guest_display_name}${
                            isOrderFastTrack(nextWaitingPlayer) ? ' (⚡ FAST TRACK VIP)' : ''
                          }`}
                        >
                          {isOrderFastTrack(nextWaitingPlayer) ? '⚡ ' : '📢 '}Panggil #{nextWaitingPlayer.queue_number} {nextWaitingPlayer.guest_display_name} {isOrderFastTrack(nextWaitingPlayer) ? '(Fast Track)' : ''}
                        </button>
                      ) : (
                        <div className="text-[10px] text-center font-bold text-nb-gray-400 italic py-1">
                          Antrean habis
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* QUICK BATCH ACTIONS BAR */}
              <div className="mt-5 p-3.5 rounded-xl bg-nb-black text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-bold text-nb-cream flex items-center gap-2">
                  <span>⚡</span>
                  <span>
                    Aksi Cepat Room ({currentRoomCatalog.name}):{' '}
                    <b>{roomInGame.length} Main</b> · <b>{roomInvited.length} Dipanggil</b> ·{' '}
                    <b>{roomEmptySlotsCount} Kosong</b>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Batch Mulai Main Semua Terpanggil */}
                  {roomInvited.length > 0 && (
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() =>
                        handleBatchUpdateStatus(
                          roomInvited.map((o) => o.id),
                          'in_room',
                          'Mulai Main (Semua Masuk Room)'
                        )
                      }
                      className="nb-btn nb-btn-lime text-xs py-2 px-3.5 font-black animate-bounce shadow-nb-sm"
                    >
                      ▶️ Mulai Main Semua Terpanggil ({roomInvited.length} Pemain)
                    </button>
                  )}

                  {/* Batch Panggil Pengisi Slot Kosong */}
                  {roomEmptySlotsCount > 0 && roomWaiting.length > 0 && (
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() => {
                        const targetInvites = roomWaiting
                          .slice(0, roomEmptySlotsCount)
                          .map((o) => o.id);
                        handleBatchUpdateStatus(
                          targetInvites,
                          'invited',
                          'Panggil Antrean Isi Slot'
                        );
                      }}
                      className="nb-btn nb-btn-yellow text-xs py-2 px-3 font-black shadow-nb-sm"
                    >
                      📢 Panggil {Math.min(roomEmptySlotsCount, roomWaiting.length)} Antrean (Isi Semua Slot Kosong)
                    </button>
                  )}

                  {/* Batch Selesai Game Semua */}
                  {roomInGame.length > 0 && (
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() =>
                        handleBatchUpdateStatus(
                          roomInGame.map((o) => o.id),
                          'completed',
                          'Selesai Game'
                        )
                      }
                      className="nb-btn nb-btn-primary text-xs py-2 px-3 font-black shadow-nb-sm"
                    >
                      ✅ Selesai Game Semua ({roomInGame.length} Pemain)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex gap-3 text-sm flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`nb-btn text-xs py-2.5 px-4 cursor-pointer ${
              activeTab === 'active' ? 'nb-btn-primary shadow-nb-md' : 'nb-btn-ghost bg-white'
            }`}
          >
            🔥 Antrean Aktif ({orders.filter((o) => ['waiting', 'invited', 'in_room'].includes(o.queue_status)).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`nb-btn text-xs py-2.5 px-4 cursor-pointer ${
              activeTab === 'history' ? 'nb-btn-primary shadow-nb-md' : 'nb-btn-ghost bg-white'
            }`}
          >
            📋 Riwayat Selesai / Dilewati
          </button>
        </div>

        {/* Catalog Selector Filter */}
        {catalogs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-4 rounded-2xl bg-nb-cream border-3 border-nb-black shadow-nb-sm">
            <span className="text-xs font-extrabold uppercase tracking-wider text-nb-black mr-1 flex items-center gap-1.5">
              <span>🎯</span> Filter Daftar Tabel:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCatalogId('all')}
              className={`nb-badge cursor-pointer text-xs py-1.5 px-3 transition-transform ${
                selectedCatalogId === 'all'
                  ? 'nb-badge-yellow shadow-nb-sm font-extrabold scale-105'
                  : 'bg-nb-white text-nb-black border-2 border-nb-black hover:bg-nb-yellow/40'
              }`}
            >
              Semua Layanan
            </button>
            {catalogs.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCatalogId(cat.id);
                  setActiveRoomCatalogId(cat.id);
                }}
                className={`nb-badge cursor-pointer text-xs py-1.5 px-3 transition-transform ${
                  selectedCatalogId === cat.id
                    ? 'nb-badge-cyan shadow-nb-sm font-extrabold scale-105'
                    : 'bg-nb-white text-nb-black border-2 border-nb-black hover:bg-nb-yellow/40'
                }`}
              >
                🎮 {cat.name} ({cat.max_slots} VIP)
              </button>
            ))}
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-nb-black border-t-nb-yellow rounded-full animate-spin mx-auto mb-3" />
            <p className="text-nb-gray-600 font-bold text-sm">Memuat antrean...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="nb-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-3xl mx-auto mb-4">
              🎮
            </div>
            <h3 className="text-xl font-extrabold uppercase text-nb-black">
              {activeTab === 'active' ? 'Tidak Ada Antrean Aktif' : 'Belum Ada Riwayat Selesai'}
            </h3>
            <p className="text-nb-gray-600 text-sm mt-2 max-w-md mx-auto">
              {activeTab === 'active'
                ? 'Ketika ada penonton stream yang checkout dan membayar tiket mabar, urutan antrean mereka akan otomatis terpajang di sini.'
                : 'Pemain yang telah Anda tandai sebagai "Selesai Game" akan diarsipkan di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="nb-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left: Queue Number & Guest Info */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-[10px] uppercase font-bold text-nb-black tracking-wider">
                      NO
                    </span>
                    <span className="text-2xl font-black text-nb-black leading-none">
                      #{order.queue_number}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-lg text-nb-black">
                        {order.guest_display_name}
                      </span>
                      {getStatusBadge(order.queue_status)}
                      <span className="text-xs font-bold text-nb-purple">
                        · {order.catalog?.name || 'Katalog'}
                      </span>
                      {Boolean((order.guest_answers as any)?._bundle) && (
                        <span className="nb-badge bg-nb-yellow text-[#1A1A2E] text-xs font-black">
                          📦 {(order.guest_answers as any)._bundle.name || `${(order.guest_answers as any)._bundle.match_count} Match`}
                        </span>
                      )}
                      {isOrderFastTrack(order) && (
                        <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-2 border-nb-black text-xs font-black shadow-nb-xs flex items-center gap-1 animate-pulse">
                          ⚡ FAST TRACK VIP
                        </span>
                      )}
                    </div>

                    {/* Dynamic form answers */}
                    {order.guest_answers && Object.keys(order.guest_answers).filter((k) => k !== '_bundle').length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                        {Object.entries(order.guest_answers)
                          .filter(([key]) => key !== '_bundle')
                          .map(([key, val]) => (
                            <span
                              key={key}
                              className="px-2 py-0.5 rounded-md bg-white border border-nb-black text-nb-black font-mono font-medium"
                            >
                              <b className="capitalize text-nb-purple">{key}:</b> {String(val)}
                            </span>
                          ))}
                      </div>
                    )}

                    {order.guest_message && (
                      <p className="text-xs text-nb-gray-700 bg-white border border-nb-black/20 rounded-md p-2 italic pt-1 mt-1">
                        &ldquo;{order.guest_message}&rdquo;
                      </p>
                    )}

                    <div className="text-[11px] font-mono text-nb-gray-600 pt-1">
                      Dibayar: {formatDateTime(order.paid_at || order.created_at)} ·{' '}
                      <span className="font-bold text-nb-black bg-nb-lime/50 px-1.5 py-0.5 rounded border border-nb-black">
                        {formatRupiah(order.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-wrap md:shrink-0 justify-end">
                  {/* If waiting -> Invite */}
                  {order.queue_status === 'waiting' && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'invited')}
                      className="nb-btn nb-btn-cyan text-xs py-2 px-3.5"
                    >
                      📢 Panggil Pemain
                    </button>
                  )}

                  {/* If invited -> In Room */}
                  {order.queue_status === 'invited' && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'in_room')}
                      className="nb-btn nb-btn-lime text-xs py-2 px-3.5"
                    >
                      🎮 Mulai Main (In Room)
                    </button>
                  )}

                  {/* If in_room -> Completed */}
                  {order.queue_status === 'in_room' && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      className="nb-btn nb-btn-primary text-xs py-2 px-3.5"
                    >
                      ✅ Selesai Game
                    </button>
                  )}

                  {/* Skip button for waiting or invited */}
                  {['waiting', 'invited'].includes(order.queue_status) && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'skipped')}
                      className="nb-btn nb-btn-ghost text-xs py-2 px-3 bg-white"
                    >
                      ⏭️ Lewati
                    </button>
                  )}

                  {/* Re-queue button for skipped */}
                  {order.queue_status === 'skipped' && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'waiting')}
                      className="nb-btn nb-btn-yellow text-xs py-2 px-3"
                    >
                      🔄 Masukkan Kembali
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
