import { requireStar, getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatRupiah } from '@/lib/security';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import { calculateEarningsBreakdown, DEFAULT_DEDUCTIONS, type DeductionItem } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role === 'superadmin') {
    redirect('/admin');
  }

  const user = await requireStar();
  const supabase = createAdminClient();

  // Fetch star info
  const { data: star } = await supabase
    .from('stars')
    .select('id, display_name, slug')
    .eq('id', user.starId)
    .single();

  // Fetch deduction rules
  const { data: settingRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'deductions_config')
    .single();
  const deductionRules: DeductionItem[] =
    (settingRow?.value as DeductionItem[]) || DEFAULT_DEDUCTIONS;

  // Fetch all paid orders with timestamps
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('id, amount, paid_at, created_at')
    .eq('star_id', user.starId)
    .eq('payment_status', 'paid');

  const totalOrders = paidOrders?.length || 0;
  const lifetimeGross = (paidOrders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const lifetimeBreakdown = calculateEarningsBreakdown(lifetimeGross, deductionRules);

  // 1 Bulan (30 Hari Terakhir)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthlyOrders = (paidOrders || []).filter((o) => {
    const d = new Date(o.paid_at || o.created_at);
    return d >= thirtyDaysAgo;
  });
  const monthlyGross = monthlyOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const monthlyBreakdown = calculateEarningsBreakdown(monthlyGross, deductionRules);

  // Payout requests to calculate weekly unwithdrawn balance (resets to 0 upon withdrawal)
  const { data: payoutRequests } = await supabase
    .from('payout_requests')
    .select('amount_gross, status')
    .eq('star_id', user.starId);

  const totalRequestedGross = (payoutRequests || [])
    .filter((p) => ['pending', 'approved', 'processing', 'completed'].includes(p.status))
    .reduce((sum, p) => sum + (p.amount_gross || 0), 0);

  const weeklyUnwithdrawnGross = Math.max(0, lifetimeGross - totalRequestedGross);
  const weeklyUnwithdrawnBreakdown = calculateEarningsBreakdown(weeklyUnwithdrawnGross, deductionRules);

  // Active queue
  const { count: activeQueue } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('star_id', user.starId)
    .eq('payment_status', 'paid')
    .in('queue_status', ['waiting', 'invited', 'in_room']);

  const { count: catalogCount } = await supabase
    .from('catalogs')
    .select('id', { count: 'exact', head: true })
    .eq('star_id', user.starId)
    .eq('is_active', true);

  const { count: unreadNotifs } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('star_id', user.starId)
    .is('read_at', null)
    .eq('is_test', false);

  const stats = [
    {
      label: 'Saldo Siap Ditarik (Mingguan)',
      value: formatRupiah(weeklyUnwithdrawnBreakdown.netAmount),
      subValue: `Kotor: ${formatRupiah(weeklyUnwithdrawnGross)} · Reset Rp 0 saat ditarik`,
      icon: '💵',
      bgColor: 'bg-nb-lime',
      highlight: true,
    },
    {
      label: 'Pendapatan Bersih (1 Bulan)',
      value: formatRupiah(monthlyBreakdown.netAmount),
      subValue: `Kotor: ${formatRupiah(monthlyGross)} (30 hari)`,
      icon: '📈',
      bgColor: 'bg-nb-pink',
    },
    {
      label: 'Total Bersih (Seluruh Durasi)',
      value: formatRupiah(lifetimeBreakdown.netAmount),
      subValue: `Kotor: ${formatRupiah(lifetimeGross)} (All-time)`,
      icon: '💰',
      bgColor: 'bg-nb-yellow',
    },
    {
      label: 'Order & Antrean Aktif',
      value: `${totalOrders} Order`,
      subValue: `${activeQueue || 0} sedang mengantre`,
      icon: '🎮',
      bgColor: 'bg-nb-cyan',
    },
  ];

  const navItems = [
    { label: 'Katalog', href: '/dashboard/katalog', icon: '🎯', description: 'Kelola layanan mabar', color: 'bg-nb-yellow' },
    { label: 'Antrean', href: '/dashboard/antrian', icon: '📋', description: 'Kelola antrean pemain', color: 'bg-nb-cyan' },
    { label: 'Rekening & Pencairan', href: '/dashboard/rekening', icon: '💳', description: 'Kelola rekening, rincian pajak & saldo', color: 'bg-nb-orange' },
    { label: 'Notifikasi', href: '/dashboard/notifikasi', icon: '🔔', description: 'Lihat pembelian masuk', badge: unreadNotifs || undefined, color: 'bg-nb-pink' },
    { label: 'Overlay', href: '/dashboard/overlay', icon: '🎬', description: 'Pengaturan alert stream', color: 'bg-nb-purple' },
  ];

  return (
    <div className="min-h-screen bg-nb-white nb-dots">
      {/* Navbar */}
      <nav className="nb-navbar flex items-center justify-between max-w-full relative z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-nb-yellow border-2 border-nb-black rounded-lg flex items-center justify-center font-heading font-bold text-xl shadow-nb-sm">
              M
            </div>
          </Link>
          <div>
            <h1 className="font-heading font-bold text-lg uppercase">
              Halo, {star?.display_name || 'Star'}! 👋
            </h1>
            <p className="text-xs text-nb-gray-500 font-semibold">
              Dashboard · <span className="text-nb-purple font-mono">/{star?.slug}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href={`/${star?.slug}`}>
            <button className="nb-btn nb-btn-ghost nb-btn-sm hidden sm:inline-flex text-xs">
              Halaman Publik →
            </button>
          </Link>
          <LogoutButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 nb-animate-page">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`nb-card-flat p-5 ${stat.highlight ? 'border-nb-lime bg-nb-lime/10' : 'bg-nb-cream'}`}
              style={stat.highlight ? { borderColor: '#C5E84D' } : undefined}
            >
              <div className={`nb-icon-box ${stat.bgColor} mb-3`} style={{ width: '40px', height: '40px', fontSize: '20px' }}>
                {stat.icon}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-nb-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-nb-black">{stat.value}</p>
              {stat.subValue && (
                <p className="text-[11px] mt-1 font-mono text-nb-gray-400">{stat.subValue}</p>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="mb-4">
          <span className="nb-sticker bg-nb-purple text-white" style={{ transform: 'rotate(-1deg)' }}>
            MENU DASHBOARD
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="nb-card p-5 flex items-center gap-4 cursor-pointer group">
                <div className={`nb-icon-box ${item.color}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base uppercase text-nb-black group-hover:text-nb-purple transition-colors">
                      {item.label}
                    </h3>
                    {item.badge && (
                      <span className="nb-badge bg-nb-red text-white text-[10px]" style={{ padding: '2px 8px', boxShadow: 'none' }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-nb-gray-500">{item.description}</p>
                </div>
                <span className="text-nb-gray-400 group-hover:text-nb-purple text-xl transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
