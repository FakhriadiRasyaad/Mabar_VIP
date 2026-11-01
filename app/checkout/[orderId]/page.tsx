import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, formatDateTime } from '@/lib/security';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function CheckoutStatusPage({ params }: Props) {
  const { orderId } = await params;

  // Use admin client to bypass RLS for guest order status
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminSupabase = createAdminClient();

  const { data: order, error } = await adminSupabase
    .from('orders')
    .select(`
      id,
      guest_display_name,
      guest_answers,
      amount,
      payment_status,
      tracking_token,
      merchant_order_id,
      created_at,
      expires_at,
      catalog:catalogs ( name ),
      star:stars ( display_name )
    `)
    .eq('merchant_order_id', orderId)
    .single();

  if (error || !order) {
    notFound();
  }

  const catalog = order.catalog as unknown as { name: string };
  const star = order.star as unknown as { display_name: string };

  const isPending = order.payment_status === 'pending_payment';
  const isPaid = order.payment_status === 'paid';
  const isFailed = ['payment_failed', 'expired', 'cancelled'].includes(order.payment_status);

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex justify-end mb-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md nb-card p-8 bg-nb-cream">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-4xl mb-4">
            {isPending ? '⏳' : isPaid ? '🎉' : '❌'}
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-nb-black">
            {isPending
              ? 'Menunggu Pembayaran'
              : isPaid
              ? 'Pembayaran Berhasil!'
              : 'Pembayaran Gagal'}
          </h1>
          <p className="text-xs font-mono font-bold text-nb-gray-500 mt-1">
            Order ID: {order.merchant_order_id}
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border-2 border-nb-black shadow-nb-sm space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Layanan Mabar</span>
              <span className="text-nb-black font-extrabold">{catalog?.name}</span>
            </div>
            {Boolean((order.guest_answers as any)?._bundle) && (
              <div className="flex justify-between items-center">
                <span className="text-nb-gray-500 uppercase">Paket Mabar</span>
                <span className="nb-badge bg-nb-yellow text-[#1A1A2E] text-[10px] font-black">
                  📦 {(order.guest_answers as any)._bundle.name || `${(order.guest_answers as any)._bundle.match_count} Match`}
                </span>
              </div>
            )}
            {Boolean((order.guest_answers as any)?._fast_track?.enabled) && (
              <div className="flex justify-between items-center">
                <span className="text-nb-gray-500 uppercase">Jalur Antrean</span>
                <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border border-black font-black text-[10px]">
                  ⚡ FAST TRACK VIP
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Streamer</span>
              <span className="text-nb-black font-extrabold">{star?.display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nb-gray-500 uppercase">Nama Pemain</span>
              <span className="text-nb-black font-extrabold">{order.guest_display_name}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-nb-black/10 pt-2 font-mono">
              <span className="text-nb-gray-700 font-extrabold uppercase">Total Bayar</span>
              <span className="text-base font-black text-nb-black bg-nb-lime/50 px-2 py-0.5 rounded border border-nb-black">
                {formatRupiah(order.amount)}
              </span>
            </div>
          </div>

          {isPaid && order.tracking_token && (
            <div className="p-4 rounded-xl bg-nb-lime/40 border-3 border-nb-black shadow-nb-sm text-center space-y-3">
              <p className="text-xs font-black uppercase text-nb-black">
                Nomor Antrean Anda Telah Terbit!
              </p>
              <Link
                href={`/pesanan/${order.tracking_token}`}
                className="nb-btn nb-btn-primary w-full text-xs py-2.5 font-black uppercase tracking-wider block"
              >
                Buka Pelacak Antrean Live →
              </Link>
            </div>
          )}

          {isPending && (
            <div className="p-4 rounded-xl bg-nb-yellow/40 border-3 border-nb-black shadow-nb-sm text-center">
              <p className="text-xs font-bold text-nb-black">
                Silakan selesaikan pembayaran sebelum:{' '}
                <strong className="block mt-1 font-mono">
                  {order.expires_at ? formatDateTime(order.expires_at) : 'Batas Waktu Berakhir'}
                </strong>
              </p>
            </div>
          )}

          {isFailed && (
            <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red shadow-nb-sm text-center">
              <p className="text-xs font-bold text-nb-black">
                Pembayaran tidak berhasil atau telah kedaluwarsa. Silakan pesan ulang tiket mabar.
              </p>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs font-bold text-nb-black hover:text-nb-purple transition-colors uppercase"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
