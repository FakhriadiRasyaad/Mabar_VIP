import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@/lib/security';
import ThemeToggle from '@/components/ThemeToggle';
import { parseCatalogBundles, getCleanDescription, parseCatalogFastTrack } from '@/lib/bundles';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ starSlug: string }>;
}

export default async function StarPublicPage({ params }: Props) {
  const { starSlug } = await params;
  const supabase = await createClient();

  // Fetch star by slug
  const { data: star } = await supabase
    .from('stars')
    .select('id, slug, display_name, bio, avatar_path, is_active')
    .eq('slug', starSlug)
    .eq('is_active', true)
    .single();

  if (!star) {
    notFound();
  }

  // Fetch active catalogs
  const { data: catalogs } = await supabase
    .from('catalogs')
    .select('id, slug, name, description, price_amount, cover_image_path, is_active')
    .eq('star_id', star.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // Get queue counts for each catalog
  const catalogIds = (catalogs || []).map((c) => c.id);
  const { data: queueData } =
    catalogIds.length > 0
      ? await supabase
          .from('orders')
          .select('catalog_id')
          .in('catalog_id', catalogIds)
          .eq('payment_status', 'paid')
          .in('queue_status', ['waiting', 'invited', 'in_room'])
      : { data: [] };

  const queueCounts: Record<string, number> = {};
  (queueData || []).forEach((q) => {
    queueCounts[q.catalog_id] = (queueCounts[q.catalog_id] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/"
            className="nb-btn nb-btn-ghost text-xs py-1.5 px-3 font-bold"
          >
            ← Beranda
          </Link>
          <ThemeToggle />
        </div>

        {/* Star Profile Header */}
        <div className="nb-card p-8 text-center relative overflow-hidden bg-nb-cream">
          <div className="w-24 h-24 mx-auto rounded-full bg-nb-yellow border-4 border-nb-black shadow-nb-md flex items-center justify-center text-nb-black text-4xl font-black mb-4">
            {star.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="inline-block mb-2">
            <span className="nb-badge nb-badge-purple text-xs font-black uppercase tracking-wider">
              ⭐ STREAMER VERIFIED
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-nb-black mb-2">
            {star.display_name}
          </h1>
          {star.bio && (
            <p className="text-nb-gray-700 text-base max-w-lg mx-auto font-medium mb-4">
              {star.bio}
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Link
              href={`/${star.slug}/antrian`}
              className="nb-btn nb-btn-cyan text-xs py-2 px-4 font-bold"
            >
              📋 LIHAT LIVE ANTREAN
            </Link>
          </div>
        </div>

        {/* Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black uppercase text-nb-black flex items-center gap-2">
              <span>🎮</span> PILIH TIKET MABAR
            </h2>
            <span className="nb-badge bg-white border-2 border-nb-black text-xs font-bold font-mono">
              {catalogs?.length || 0} LAYANAN
            </span>
          </div>

          {!catalogs || catalogs.length === 0 ? (
            <div className="nb-card text-center py-16 px-6">
              <div className="text-5xl mb-3">🎮</div>
              <h3 className="text-xl font-black uppercase text-nb-black">
                Belum Ada Layanan Mabar
              </h3>
              <p className="text-nb-gray-600 text-sm mt-2 max-w-md mx-auto">
                Streamer ini belum membuka slot antrean mabar saat ini. Silakan cek kembali nanti saat sesi streaming dimulai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {catalogs.map((catalog) => (
                <div
                  key={catalog.id}
                  className="nb-card flex flex-col justify-between overflow-hidden group hover:translate-x-0.5 hover:-translate-y-0.5"
                >
                  {/* Cover Header */}
                  <div className="h-40 bg-nb-yellow border-b-3 border-nb-black flex items-center justify-center relative overflow-hidden">
                    {catalog.cover_image_path ? (
                      <div
                        className="absolute inset-0 bg-center bg-cover"
                        style={{ backgroundImage: `url(${catalog.cover_image_path})` }}
                      />
                    ) : (
                      <span className="text-6xl group-hover:scale-110 transition-transform duration-200">
                        🕹️
                      </span>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="nb-badge nb-badge-lime font-mono font-black text-sm shadow-nb-sm">
                        {formatRupiah(catalog.price_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold uppercase text-nb-black group-hover:text-nb-purple transition-colors">
                        {catalog.name}
                      </h3>
                      {catalog.description && (
                        <p className="text-nb-gray-600 text-sm mt-2 line-clamp-2 font-medium">
                          {getCleanDescription(catalog.description)}
                        </p>
                      )}

                      {/* Bundles & Fast Track Highlights */}
                      {(() => {
                        const bundles = parseCatalogBundles(catalog);
                        const ft = parseCatalogFastTrack(catalog);
                        if (bundles.length === 0 && !ft.enabled) return null;
                        return (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {bundles.map((b) => (
                              <span
                                key={b.id}
                                className="nb-badge bg-nb-yellow text-[#1A1A2E] text-[10px] font-bold"
                              >
                                📦 {b.name}: {formatRupiah(b.price)} {b.badge ? `(${b.badge})` : ''}
                              </span>
                            ))}
                            {ft.enabled && (
                              <span className="nb-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border border-black text-[10px] font-black flex items-center gap-1 shadow-nb-xs">
                                ⚡ Fast Track (+{formatRupiah(ft.fee)})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-4 border-t-2 border-nb-black/10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-nb-black">
                        <span className="w-2.5 h-2.5 rounded-full bg-nb-cyan border border-nb-black animate-ping" />
                        <span>{queueCounts[catalog.id] || 0} dalam antrean</span>
                      </div>

                      <Link
                        href={`/${star.slug}/antrian/${catalog.slug}`}
                        className="nb-btn nb-btn-primary text-xs py-2 px-4 font-bold"
                      >
                        PESAN SEKARANG →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
