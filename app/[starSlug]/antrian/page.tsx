import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@/lib/security';
import { parseCatalogSlots, isOrderFastTrack, sortWaitingQueue } from '@/lib/bundles';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ starSlug: string }>;
}

export default async function StarQueuePage({ params }: Props) {
  const { starSlug } = await params;
  const supabase = await createClient();

  // Fetch star
  const { data: star } = await supabase
    .from('stars')
    .select('id, slug, display_name')
    .eq('slug', starSlug)
    .eq('is_active', true)
    .single();

  if (!star) notFound();

  // Fetch catalogs with description to parse max_slots
  const { data: catalogs } = await supabase
    .from('catalogs')
    .select('id, slug, name, price_amount, is_active, description, cover_image_path')
    .eq('star_id', star.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // Fetch queue for each catalog
  const catalogIds = (catalogs || []).map((c) => c.id);
  const { data: queueOrders } =
    catalogIds.length > 0
      ? await supabase
          .from('orders')
          .select('id, catalog_id, guest_display_name, queue_number, queue_status, guest_answers')
          .in('catalog_id', catalogIds)
          .eq('payment_status', 'paid')
          .in('queue_status', ['waiting', 'invited', 'in_room'])
          .order('queue_number', { ascending: true })
      : { data: [] };

  interface QueueOrder {
    id: string;
    catalog_id: string;
    guest_display_name: string;
    queue_number: number | null;
    queue_status: string;
    guest_answers?: Record<string, any>;
    is_fast_track?: boolean;
  }

  const ordersByCatalog: Record<string, QueueOrder[]> = {};
  ((queueOrders || []) as any[]).forEach((o) => {
    if (!ordersByCatalog[o.catalog_id]) ordersByCatalog[o.catalog_id] = [];
    ordersByCatalog[o.catalog_id].push({
      ...o,
      is_fast_track: isOrderFastTrack(o),
    });
  });

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="nb-card p-6 sm:p-8 bg-nb-cream">
          <Link
            href={`/${star.slug}`}
            className="inline-flex items-center gap-1 text-xs font-black uppercase text-nb-black hover:text-nb-purple transition-colors mb-2"
          >
            ← KEMBALI KE PROFIL {star.display_name.toUpperCase()}
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-nb-black">
                Live Antrean & Room Party VIP
              </h1>
              <p className="text-nb-gray-600 text-sm mt-1 font-medium">
                Pantau visual room mabar dan urutan giliran kamu secara real-time bersama {star.display_name}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="nb-badge nb-badge-lime animate-pulse text-xs font-black">
                ● LIVE STREAM ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Catalogs & Queue Lists */}
        {!catalogs || catalogs.length === 0 ? (
          <div className="nb-card text-center py-16 px-6">
            <p className="text-nb-gray-600 font-bold">Belum ada layanan mabar aktif.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {catalogs.map((catalog) => {
              const allOrders = ordersByCatalog[catalog.id] || [];
              const maxSlots = parseCatalogSlots(catalog);

              const inRoomOrders = allOrders.filter((o) => o.queue_status === 'in_room');
              const invitedOrders = allOrders.filter((o) => o.queue_status === 'invited');
              const rawWaitingOrders = allOrders.filter((o) => o.queue_status === 'waiting');
              const waitingOrders = sortWaitingQueue(rawWaitingOrders);

              const emptySlotsCount = Math.max(0, maxSlots - (inRoomOrders.length + invitedOrders.length));
              const isFullParty = inRoomOrders.length >= maxSlots;

              return (
                <div key={catalog.id} className="nb-card p-6 sm:p-7 space-y-6">
                  {/* Catalog Header */}
                  <div className="flex items-start justify-between pb-4 border-b-3 border-nb-black flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {catalog.cover_image_path && (
                        <div className="w-16 h-16 rounded-xl border-2 border-nb-black overflow-hidden bg-nb-yellow shrink-0 shadow-nb-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={catalog.cover_image_path}
                            alt={catalog.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="text-xl sm:text-2xl font-black uppercase text-nb-black">
                            {catalog.name}
                          </h2>
                          <span className="nb-badge bg-nb-cyan text-nb-black border border-nb-black text-xs font-extrabold">
                            👥 {maxSlots} VIP Slots / Match
                          </span>
                        </div>
                        <span className="text-xs text-nb-gray-600 font-bold">
                          {allOrders.length} penonton terdaftar · {waitingOrders.length} masih antre
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="nb-badge nb-badge-lime font-mono font-bold text-sm">
                        {formatRupiah(catalog.price_amount)}
                      </span>
                      <Link
                        href={`/${star.slug}/antrian/${catalog.slug}`}
                        className="nb-btn nb-btn-primary text-xs py-2 px-4 font-black"
                      >
                        + Ikut Antre VIP
                      </Link>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* VISUAL ARENA BOX PARTY FOR SPECTATORS */}
                  {/* ======================================================== */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-nb-cream/70 border-3 border-nb-black shadow-nb-sm space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-nb-black flex items-center gap-1.5">
                          <span>🎮</span> Status Room Live Sesi Ini:
                        </span>
                        {isFullParty ? (
                          <span className="nb-badge nb-badge-lime text-[11px] font-black animate-pulse">
                            🔥 FULL PARTY (4/4 SEDANG BERMAIN)
                          </span>
                        ) : inRoomOrders.length > 0 ? (
                          <span className="nb-badge nb-badge-cyan text-[11px] font-black">
                            ⚡ {inRoomOrders.length} Main · {emptySlotsCount} Slot Kosong
                          </span>
                        ) : (
                          <span className="nb-badge nb-badge-yellow text-[11px] font-black">
                            🟢 {emptySlotsCount} Slot Kosong Tersedia
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-nb-gray-500">
                        Kapasitas Sekali Main: <b>{maxSlots} VIP</b>
                      </span>
                    </div>

                    {/* Party Boxes Grid */}
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${
                        maxSlots <= 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'
                      } gap-3`}
                    >
                      {Array.from({ length: maxSlots }).map((_, slotIdx) => {
                        const inGame = inRoomOrders[slotIdx];
                        const invitedIdx = slotIdx - inRoomOrders.length;
                        const invited = !inGame && invitedIdx >= 0 ? invitedOrders[invitedIdx] : null;

                        if (inGame) {
                          return (
                            <div
                              key={inGame.id}
                              className="p-3.5 rounded-xl bg-nb-lime/25 border-2 border-nb-black shadow-nb-sm flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="nb-badge bg-nb-black text-white text-[9px] font-mono font-black">
                                  SLOT #{slotIdx + 1}
                                </span>
                                <span className="nb-badge nb-badge-lime text-[9px] font-black animate-pulse">
                                  🎮 SEDANG MAIN
                                </span>
                              </div>
                              <div className="py-1">
                                <div className="font-heading font-black text-sm text-nb-black truncate">
                                  {inGame.guest_display_name}
                                </div>
                                <div className="text-[11px] font-mono font-bold text-nb-purple">
                                  Urutan #{inGame.queue_number}
                                </div>
                              </div>
                              <div className="text-[10px] font-bold text-nb-gray-600 bg-white/80 border border-nb-black/20 rounded px-1.5 py-0.5 truncate">
                                Di dalam match
                              </div>
                            </div>
                          );
                        }

                        if (invited) {
                          return (
                            <div
                              key={invited.id}
                              className="p-3.5 rounded-xl bg-nb-yellow/30 border-2 border-nb-black shadow-nb-sm flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="nb-badge bg-nb-black text-white text-[9px] font-mono font-black">
                                  SLOT #{slotIdx + 1}
                                </span>
                                <span className="nb-badge nb-badge-cyan text-[9px] font-black">
                                  📢 DIPANGGIL
                                </span>
                              </div>
                              <div className="py-1">
                                <div className="font-heading font-black text-sm text-nb-black truncate">
                                  {invited.guest_display_name}
                                </div>
                                <div className="text-[11px] font-mono font-bold text-nb-purple">
                                  Urutan #{invited.queue_number}
                                </div>
                              </div>
                              <div className="text-[10px] font-bold text-nb-gray-600 bg-white/80 border border-nb-black/20 rounded px-1.5 py-0.5 truncate">
                                Masuk ke room
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`public-empty-${slotIdx}`}
                            className="p-3.5 rounded-xl bg-white border-2 border-dashed border-nb-black/30 flex flex-col items-center justify-center text-center gap-1 min-h-[110px]"
                          >
                            <span className="nb-badge bg-nb-gray-100 border border-nb-black text-[9px] font-mono font-bold">
                              SLOT #{slotIdx + 1}
                            </span>
                            <span className="text-xl opacity-60">🪑</span>
                            <span className="text-xs font-black text-nb-gray-600 uppercase">
                              🟢 Slot Kosong
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* WAITING QUEUE LIST */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-nb-black mb-3 flex items-center gap-1.5">
                      <span>📋</span> Antrean Berikutnya Yang Menunggu ({waitingOrders.length} Pemain):
                    </h3>

                    {waitingOrders.length === 0 ? (
                      <div className="p-4 text-center bg-white border-2 border-dashed border-nb-black/20 rounded-xl">
                        <p className="text-xs font-bold text-nb-gray-500 uppercase">
                          Semua antrean saat ini sudah masuk ke dalam room arena!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waitingOrders.map((order) => (
                          <div
                            key={order.id}
                            className={`flex items-center justify-between gap-4 p-3 rounded-xl border-2 border-nb-black transition-all ${
                              order.is_fast_track
                                ? 'bg-nb-yellow/20 border-nb-black shadow-nb-md scale-[1.01]'
                                : 'bg-nb-white shadow-nb-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl border-2 border-nb-black font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                                  order.is_fast_track
                                    ? 'bg-nb-yellow text-[#1A1A2E] shadow-nb-xs'
                                    : 'bg-nb-cream text-nb-black'
                                }`}
                              >
                                #{order.queue_number}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-nb-black">
                                  {order.guest_display_name}
                                </span>
                                {Boolean((order.guest_answers as any)?._bundle) && (
                                  <span className="nb-badge bg-nb-yellow text-[#1A1A2E] text-[10px] font-bold">
                                    📦 {(order.guest_answers as any)._bundle.name || 'Paket'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {order.is_fast_track ? (
                              <span className="nb-badge bg-nb-yellow text-[#1A1A2E] border-2 border-nb-black text-xs font-black shadow-nb-xs flex items-center gap-1 animate-pulse">
                                ⚡ FAST TRACK VIP (PRIORITAS)
                              </span>
                            ) : (
                              <span className="nb-badge nb-badge-yellow text-xs font-bold">
                                ⏳ Giliran Menunggu
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
