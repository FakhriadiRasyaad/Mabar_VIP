'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/security';

interface OrderData {
  id: string;
  amount: number;
  guest_display_name: string;
  guest_message: string;
  merchant_order_id: string;
  payment_status: string;
  catalog: {
    name: string;
    description: string;
  };
  star: {
    display_name: string;
    slug: string;
  };
}

function DummySimulatorContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/checkout?orderId=${orderId}&token=${token}`);
        // If not available via GET, fetch basic info directly or fallback to order state
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId, token]);

  const handleSimulatePayment = async (action: 'success' | 'failed') => {
    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/payments/dummy/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          trackingToken: token,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pembayaran dummy.');
      }

      if (action === 'success') {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/pesanan/${token}`);
        }, 1200);
      } else {
        router.push(`/checkout/${orderId}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <Card className="relative max-w-lg w-full border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Mode Dummy Gateway (Duitku Sandbox Simulation)
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-white bg-clip-text text-transparent">
            Simulasi Pembayaran Mabar
          </CardTitle>
          <CardDescription className="text-slate-400">
            Halaman ini mensimulasikan alur pembayaran Duitku untuk pengujian antrean dan overlay real-time.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="text-xl mb-1">🎉 Pembayaran Berhasil Disimulasikan!</div>
              <p className="text-xs text-emerald-400/80">Nomor antrean telah dialokasikan dan notifikasi terkirim ke OBS. Mengalihkan ke tracking antrean...</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span>Order ID</span>
              <span className="font-mono text-xs text-slate-300">{orderId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Metode Simulasi</span>
              <span className="text-white font-medium">QRIS / VA / E-Wallet (Duitku Dummy)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Status Gateway</span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                Menunggu Pembayaran
              </Badge>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={() => handleSimulatePayment('success')}
              disabled={processing || success}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-6 text-base shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {processing && !success ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengalokasikan Antrean...
                </span>
              ) : success ? (
                '✓ Terverifikasi!'
              ) : (
                '💳 Bayar Sekarang (Simulasi Berhasil)'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSimulatePayment('failed')}
              disabled={processing || success}
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
            >
              Simulasi Gagal / Batalkan Pesanan
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Setelah akun Duitku Anda aktif, sistem ini otomatis beralih ke payment gateway resmi tanpa mengubah kode frontend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DummyPaymentSimulatorPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DummySimulatorContent orderId={resolvedParams.orderId} />
    </Suspense>
  );
}
