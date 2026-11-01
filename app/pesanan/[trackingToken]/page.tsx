import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDateTime } from '@/lib/security';
import { QUEUE_STATUS_LABELS } from '@/lib/queue';
import { isOrderFastTrack, sortWaitingQueue } from '@/lib/bundles';

import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ trackingToken: string }>;
}

export default async function OrderTrackingPage({ params }: Props) {
  const { trackingToken } = await params;

  // Use admin client to bypass RLS (guest has no auth session)
  const supabase = createAdminClient();

  // Fetch order by tracking token
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      catalog_id,
      guest_display_name,
      guest_answers,
      amount,
      payment_status,
      queue_status,
      queue_number,
      paid_at,
      created_at,
      expires_at,
      catalog:catalogs (
        name,
        slug
      ),
      star:stars (
        display_name,
        slug
      )
    `)
    .eq('tracking_token', trackingToken)
    .single();

  if (error || !order) {
    notFound();
  }

  const isFastTrack = isOrderFastTrack(order);

  // Get position in queue if paid taking Fast Track into account
  let positionInQueue: number | null = null;
  if (order.payment_status === 'paid' && order.queue_number && order.catalog_id) {
    const { data: waitingOrders } = await supabase
      .from('orders')
      .select('id, queue_number, guest_answers')
      .eq('catalog_id', order.catalog_id)
      .eq('payment_status', 'paid')
      .in('queue_status', ['waiting', 'invited']);

    if (waitingOrders && waitingOrders.length > 0) {
      const sorted = sortWaitingQueue(waitingOrders);
      const myIdx = sorted.findIndex((o) => o.id === order.id);
      positionInQueue = myIdx !== -1 ? myIdx + 1 : 1;
    } else {
      positionInQueue = 1;
    }
  }

  const catalog = order.catalog as unknown as { name: string; slug: string };
  const star = order.star as unknown as { display_name: string; slug: string };

  const isPaid = order.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-nb-black/10">
          <Link
            href={star ? `/${star.slug}` : '/'}
            className="text-xs font-black uppercase text-nb-black hover:text-nb-purple transition-colors inline-block"
          >
            ← KEMBALI KE STREAMER
          </Link>
          <ThemeToggle />
        </div>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-nb-black">
            Status Tiket Mabar
          </h1>
          <p className="text-xs font-bold text-nb-gray-600 mt-1 uppercase font-mono">
            {star?.display_name} · {catalog?.name}
          </p>
        </div>

        {/* Queue Stamp Box (if paid) */}
        {isPaid && order.queue_number ? (
          <div className="nb-card p-8 text-center bg-nb-yellow/30">
            <div className="inline-block mb-3">
              <span className="nb-badge nb-badge-lime text-xs font-black uppercase">
                🎉 TIKET AKTIF & TERVERIFIKASI
              </span>
            </div>

            <div className="w-28 h-28 mx-auto rounded-3xl bg-nb-yellow border-4 border-nb-black shadow-nb-md flex flex-col items-center justify-center font-mono my-3">
              <span className="text-xs uppercase font-extrabold text-nb-black tracking-wider">
                NOMOR
              </span>
              <span className="text-4xl font-black text-nb-black leading-none">
                #{order.queue_number}
              </span>
            </div>

            {order.queue_status && (
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span className="nb-badge nb-badge-cyan text-sm font-black uppercase">
                  STATUS:{' '}
                  {QUEUE_STATUS_LABELS[
                    order.queue_status as keyof typeof QUEUE_STATUS_LABELS
                  ] || order.queue_status}
                </span>
                {isFastTrack && (
                  <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-2 border-nb-black text-sm font-black uppercase shadow-nb-xs animate-pulse">
                    ⚡ FAST TRACK
                  </span>
                )}
              </div>
            )}

            {isFastTrack && (
              <div className="mt-3 p-2.5 rounded-xl bg-nb-yellow border-2 border-nb-black text-xs font-black uppercase text-[#1A1A2E] tracking-wide shadow-nb-xs">
                ⚡ TIKET FAST TRACK VIP AKTIF (PRIORITAS DEPAN)
              </div>
            )}

            {positionInQueue !== null && order.queue_status === 'waiting' && (
              <p className="text-sm font-bold text-nb-black mt-3">
                {positionInQueue === 1
                  ? isFastTrack
                    ? '⚡ Giliranmu berikutnya dengan Fast Track! Bersiaplah di Discord / Game.'
                    : '🔥 Giliranmu berikutnya! Bersiaplah di Discord / Game.'
                  : isFastTrack
                  ? `⚡ Jalur Cepat: Antreanmu diprioritaskan di depan! Tinggal ${positionInQueue - 1} pemain di depanmu.`
                  : `⏳ Masih ada ${positionInQueue - 1} pemain di depan antreanmu.`}
              </p>
            )}
          </div>
        ) : (
          <div className="nb-card p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-3xl mx-auto mb-3">
              ⏳
            </div>
            <h3 className="text-lg font-black uppercase text-nb-black">
              Menunggu Konfirmasi Pembayaran
            </h3>
            <p className="text-xs text-nb-gray-600 mt-1">
              Nomor antrean akan terbit seketika pembayaran kamu terverifikasi.
            </p>
          </div>
        )}

        {/* Order Details */}
        <div className="nb-card p-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-nb-black pb-3 mb-3 border-b-2 border-nb-black/10">
            Rincian Pesanan
          </h2>

          <div className="space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Nama Pemain:</span>
              <span className="text-nb-black font-extrabold">{order.guest_display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Layanan:</span>
              <span className="text-nb-black font-extrabold">{catalog?.name}</span>
            </div>
            {Boolean((order.guest_answers as any)?._bundle?.name) && (
              <div className="flex justify-between items-center">
                <span className="text-nb-gray-500 uppercase">Paket Mabar:</span>
                <span className="nb-badge bg-nb-yellow text-[#1A1A2E] text-[10px] font-black">
                  📦 {(order.guest_answers as any)._bundle.name} ({(order.guest_answers as any)._bundle.match_count} Match)
                </span>
              </div>
            )}
            {isFastTrack && (
              <div className="flex justify-between items-center">
                <span className="text-nb-gray-500 uppercase">Prioritas Antrean:</span>
                <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border border-black font-black text-[10px]">
                  ⚡ FAST TRACK (+Lompat Antrean)
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Streamer:</span>
              <span className="text-nb-black font-extrabold">{star?.display_name}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-nb-black/10 pt-2 font-mono">
              <span className="text-nb-gray-600 uppercase font-extrabold">Total Biaya:</span>
              <span className="text-sm font-black text-nb-black bg-nb-lime/50 px-2 py-0.5 rounded border border-nb-black">
                {formatRupiah(order.amount)}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-nb-black/10 text-center">
            <p className="text-[11px] text-nb-gray-500 font-medium">
              Simpan halaman ini untuk memantau panggilan streamer selama live streaming berlangsung.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
