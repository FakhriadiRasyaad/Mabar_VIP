'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatRupiah, formatDateTime } from '@/lib/security';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import {
  type DeductionItem,
  DEFAULT_DEDUCTIONS,
  calculateEarningsBreakdown,
} from '@/lib/finance';

interface StatsData {
  totalStars: number;
  activeStars: number;
  totalOrders: number;
  gmv: number;
  platformFee: number;
  pendingOrders: number;
  failedOrders: number;
}

interface StarItem {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  bio: string;
  isActive: boolean;
  createdAt: string;
  catalogCount: number;
  // Financial metrics per star
  totalOrders: number;
  monthlyOrdersCount?: number;
  grossRevenue: number;
  netRevenue: number;
  totalDeductions: number;
  monthlyGross?: number;
  monthlyNet?: number;
  monthlyDeductions?: number;
  weeklyUnwithdrawnGross?: number;
  weeklyUnwithdrawnNet?: number;
  totalPaidOutNet: number;
  pendingPayoutsCount: number;
  bankAccount: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
    isVerified: boolean;
  } | null;
}

interface OrderItem {
  id: string;
  starId: string;
  merchantOrderId: string;
  trackingToken?: string;
  guestDisplayName: string;
  guestAnswers?: Record<string, any>;
  guestMessage?: string;
  amount: number;
  paymentStatus: string;
  queueStatus: string;
  queueNumber: number;
  duitkuReference?: string;
  paidAt: string;
  createdAt: string;
  starName: string;
  starSlug: string;
  catalogName: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface PaymentGatewayConfig {
  active: 'dummy' | 'duitku' | 'midtrans' | 'xendit' | 'manual';
  duitku: {
    merchantCode: string;
    apiKey: string;
    isSandbox: boolean;
  };
  midtrans: {
    serverKey: string;
    clientKey: string;
    isProduction: boolean;
  };
  xendit: {
    secretKey: string;
    publicKey: string;
  };
  manual: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    instructions: string;
  };
}

export default function SuperadminDashboardClient({ userEmail }: { userEmail: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'stars' | 'gateways' | 'taxes' | 'orders' | 'audit' | 'settings'>('overview');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [stars, setStars] = useState<StarItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingGateways, setSavingGateways] = useState(false);
  const [savingTaxes, setSavingTaxes] = useState(false);
  const [message, setMessage] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Transaction Filters & Modal State
  const [selectedStarFilter, setSelectedStarFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OrderItem | null>(null);

  // Payment Gateway Configuration
  const [activeGateway, setActiveGateway] = useState<'dummy' | 'duitku' | 'midtrans' | 'xendit' | 'manual'>('dummy');
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>({
    active: 'dummy',
    duitku: {
      merchantCode: '',
      apiKey: '',
      isSandbox: true,
    },
    midtrans: {
      serverKey: '',
      clientKey: '',
      isProduction: false,
    },
    xendit: {
      secretKey: '',
      publicKey: '',
    },
    manual: {
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountName: 'PT Mabar VIP Indonesia',
      instructions: 'Transfer tepat sesuai nominal dan unggah bukti transfer ke WhatsApp admin.',
    },
  });

  // Dynamic Taxes and Deductions
  const [deductions, setDeductions] = useState<DeductionItem[]>(DEFAULT_DEDUCTIONS);
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxType, setNewTaxType] = useState<'percentage' | 'fixed'>('percentage');
  const [newTaxValue, setNewTaxValue] = useState('2.5');
  const [newTaxDesc, setNewTaxDesc] = useState('');

  // Tax Simulation Calculator
  const [simAmount, setSimAmount] = useState('100000');

  // General Settings
  const [feePercent, setFeePercent] = useState('5');
  const [alertDuration, setAlertDuration] = useState('5000');
  const [maxMsgLength, setMaxMsgLength] = useState('200');
  const [expiryMinutes, setExpiryMinutes] = useState('60');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'stars') {
        const res = await fetch('/api/admin/stars');
        const data = await res.json();
        setStars(data.stars || []);
      } else if (activeTab === 'gateways' || activeTab === 'taxes' || activeTab === 'settings') {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.active_payment_gateway) {
            setActiveGateway(data.settings.active_payment_gateway);
          }
          if (data.settings.payment_gateway_config) {
            setGatewayConfig(data.settings.payment_gateway_config);
          }
          if (data.settings.deductions_config && Array.isArray(data.settings.deductions_config)) {
            setDeductions(data.settings.deductions_config);
          }
          if (data.settings.platform_fee_percentage) setFeePercent(String(data.settings.platform_fee_percentage));
          if (data.settings.default_alert_duration_ms) setAlertDuration(String(data.settings.default_alert_duration_ms));
          if (data.settings.max_guest_message_length) setMaxMsgLength(String(data.settings.max_guest_message_length));
          if (data.settings.default_order_expiry_minutes) setExpiryMinutes(String(data.settings.default_order_expiry_minutes));
        }
      } else if (activeTab === 'orders') {
        const [ordersRes, starsRes] = await Promise.all([
          fetch('/api/admin/orders'),
          stars.length === 0 ? fetch('/api/admin/stars') : Promise.resolve(null),
        ]);
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
        if (starsRes) {
          const starsData = await starsRes.json();
          setStars(starsData.stars || []);
        }
      } else if (activeTab === 'audit') {
        const res = await fetch('/api/admin/audit-logs');
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleToggleStarStatus = async (star: StarItem) => {
    try {
      const res = await fetch(`/api/admin/stars/${star.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !star.isActive }),
      });
      if (res.ok) {
        setStars((prev) =>
          prev.map((s) => (s.id === star.id ? { ...s, isActive: !s.isActive } : s))
        );
      }
    } catch {
      console.error('Failed to toggle star status');
    }
  };

  // Save Payment Gateway Configuration
  const handleSavePaymentGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateways(true);
    setMessage('');

    try {
      const updatedConfig = {
        ...gatewayConfig,
        active: activeGateway,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_payment_gateway: activeGateway,
          payment_gateway_config: updatedConfig,
        }),
      });

      if (res.ok) {
        setMessage('Konfigurasi payment gateway berhasil disimpan! Transaksi checkout baru akan langsung diarahkan ke gateway ini.');
      } else {
        setMessage('Gagal menyimpan konfigurasi payment gateway');
      }
    } catch {
      setMessage('Terjadi kesalahan saat menyimpan payment gateway');
    } finally {
      setSavingGateways(false);
    }
  };

  // Add Custom Deduction / Tax item manually
  const handleAddCustomTax = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName) return;

    const newItem: DeductionItem = {
      id: `tax_${Date.now()}`,
      name: newTaxName,
      type: newTaxType,
      value: parseFloat(newTaxValue) || 0,
      description: newTaxDesc || 'Regulasi penyesuaian potongan manual oleh Admin',
      is_active: true,
    };

    setDeductions((prev) => [...prev, newItem]);
    setNewTaxName('');
    setNewTaxValue('2.5');
    setNewTaxDesc('');
    setShowAddTaxModal(false);
  };

  // Delete deduction item
  const handleDeleteDeduction = (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus point potongan ini?')) return;
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  // Toggle deduction item status
  const handleToggleDeduction = (id: string) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_active: !d.is_active } : d))
    );
  };

  // Save all tax and deduction rules to database
  const handleSaveTaxes = async () => {
    setSavingTaxes(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deductions_config: deductions,
        }),
      });

      if (res.ok) {
        setMessage('Aturan pajak & potongan berhasil diperbarui! Perhitungan bagi hasil seluruh Star langsung disesuaikan.');
      } else {
        setMessage('Gagal menyimpan aturan pajak');
      }
    } catch {
      setMessage('Terjadi kesalahan saat menyimpan aturan pajak');
    } finally {
      setSavingTaxes(false);
    }
  };

  // General settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_fee_percentage: parseFloat(feePercent),
          default_alert_duration_ms: parseInt(alertDuration, 10),
          max_guest_message_length: parseInt(maxMsgLength, 10),
          default_order_expiry_minutes: parseInt(expiryMinutes, 10),
        }),
      });

      if (res.ok) {
        setMessage('Pengaturan platform berhasil disimpan!');
      } else {
        setMessage('Gagal menyimpan pengaturan');
      }
    } catch {
      setMessage('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  // Live tax simulation calculation
  const simulationBreakdown = useMemo(() => {
    const gross = parseFloat(simAmount) || 0;
    return calculateEarningsBreakdown(gross, deductions);
  }, [simAmount, deductions]);

  // Aggregate stats from stars list
  const totalStarGross = useMemo(() => stars.reduce((sum, s) => sum + s.grossRevenue, 0), [stars]);
  const totalStarNet = useMemo(() => stars.reduce((sum, s) => sum + s.netRevenue, 0), [stars]);
  const totalStarDeductions = useMemo(() => stars.reduce((sum, s) => sum + s.totalDeductions, 0), [stars]);

  // Orders count per star lookup
  const starOrdersCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      map[o.starId] = (map[o.starId] || 0) + 1;
    });
    return map;
  }, [orders]);

  // Filtered orders list based on selected star, status, and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Star filter
      if (selectedStarFilter !== 'all' && o.starId !== selectedStarFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && o.paymentStatus !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = o.merchantOrderId?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q);
        const matchBuyer = o.guestDisplayName?.toLowerCase().includes(q);
        const matchStar = o.starName?.toLowerCase().includes(q) || o.starSlug?.toLowerCase().includes(q);
        const matchCatalog = o.catalogName?.toLowerCase().includes(q);
        const matchAnswers = JSON.stringify(o.guestAnswers || {}).toLowerCase().includes(q);
        if (!matchId && !matchBuyer && !matchStar && !matchCatalog && !matchAnswers) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedStarFilter, statusFilter, searchQuery]);

  // Current filtered star object (if specific star selected)
  const currentFilteredStar = useMemo(() => {
    if (selectedStarFilter === 'all') return null;
    return stars.find((s) => s.id === selectedStarFilter) || null;
  }, [stars, selectedStarFilter]);

  // Filter metrics
  const filterMetrics = useMemo(() => {
    const total = filteredOrders.length;
    const paidOrders = filteredOrders.filter((o) => o.paymentStatus === 'paid');
    const totalPaidRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const inQueueCount = paidOrders.filter((o) => ['waiting', 'invited', 'in_room'].includes(o.queueStatus)).length;
    const completedCount = paidOrders.filter((o) => o.queueStatus === 'completed').length;
    return {
      total,
      paidCount: paidOrders.length,
      totalPaidRevenue,
      inQueueCount,
      completedCount,
    };
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots flex flex-col md:flex-row font-sans">
      {/* PROFESSIONAL LEFT SIDEBAR - NEO-BRUTALISM */}
      <aside className="w-full md:w-64 lg:w-72 shrink-0 bg-nb-cream border-b-3 md:border-b-0 md:border-r-3 border-nb-black md:min-h-screen flex flex-col justify-between md:sticky md:top-0 z-40 shadow-nb-md">
        <div className="p-5 space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm flex items-center justify-center text-xl font-black shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black uppercase tracking-tight text-nb-black">Mabar VIP</h1>
                  <span className="nb-badge nb-badge-pink text-[9px] py-0 px-1 font-bold">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-nb-gray-600 font-mono font-bold">Control Center</p>
              </div>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-2 rounded-xl bg-white border-2 border-nb-black shadow-nb-sm text-nb-black font-black text-sm"
              aria-label="Toggle Navigation Menu"
            >
              {mobileSidebarOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Navigation Links (Left Sidebar) */}
          <div className={`space-y-1.5 ${mobileSidebarOpen ? 'block' : 'hidden md:block'}`}>
            <span className="text-[10px] font-black text-nb-gray-500 uppercase tracking-wider px-3 block mb-2 font-mono">
              Navigasi Superadmin
            </span>

            {[
              { id: 'overview', label: 'Ringkasan Platform', icon: '📊' },
              { id: 'stars', label: 'Pendapatan Star', icon: '⭐', count: stars.length },
              { id: 'orders', label: 'Seluruh Transaksi', icon: '📦', count: orders.length },
              { id: 'gateways', label: 'Payment Gateway', icon: '💳', badge: activeGateway },
              { id: 'taxes', label: 'Pajak & Potongan', icon: '🏛️' },
              { id: 'audit', label: 'Audit Logs', icon: '🛡️' },
              { id: 'settings', label: 'Parameter Sistem', icon: '⚙️' },
            ].map((nav) => {
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    setActiveTab(nav.id as any);
                    setMessage('');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-nb-yellow border-2 border-nb-black shadow-nb-sm text-nb-black font-extrabold translate-x-1'
                      : 'text-nb-gray-700 hover:text-nb-black hover:bg-white hover:border-2 hover:border-nb-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{nav.icon}</span>
                    <span className="tracking-tight">{nav.label}</span>
                  </div>
                  {nav.count !== undefined && (
                    <span className={`text-[10px] py-0 px-1.5 font-bold rounded border ${isActive ? 'bg-nb-black text-white border-nb-black' : 'bg-white text-nb-black border-nb-black/30'}`}>
                      {nav.count}
                    </span>
                  )}
                  {nav.badge && (
                    <span className="text-[9px] py-0 px-1 uppercase font-mono font-bold bg-nb-cyan text-nb-black border border-nb-black rounded">
                      {nav.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className={`p-5 border-t-2 border-nb-black/10 space-y-3.5 ${mobileSidebarOpen ? 'block' : 'hidden md:block'}`}>
          <div className="p-3 rounded-xl bg-white border-2 border-nb-black shadow-nb-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-nb-purple/30 border border-nb-black text-nb-black flex items-center justify-center font-bold text-xs shrink-0">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-nb-gray-500 block font-bold">Superadmin Active</span>
              <p className="text-xs text-nb-black font-mono font-bold truncate">{userEmail}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Link href="/dashboard" className="w-full block">
              <button
                type="button"
                className="w-full nb-btn nb-btn-cyan text-xs py-2 px-3 justify-start gap-2 font-bold"
              >
                <span>🎮</span>
                <span>Dashboard Streamer →</span>
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle className="flex-1 justify-center" />
              <LogoutButton />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-nb-gray-500 font-mono font-bold pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-nb-lime border border-nb-black animate-pulse" />
              Live Online
            </span>
            <span>Mabar VIP v2.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 space-y-6">
        {/* Top Header inside main view */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-3 border-nb-black">
          <div>
            <div className="flex items-center gap-2 text-xs text-nb-gray-600 mb-1 font-bold">
              <span>Superadmin</span>
              <span>/</span>
              <span className="text-nb-purple uppercase font-mono font-black">{activeTab}</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-nb-black">
              {activeTab === 'overview' && '📊 Ringkasan Ekosistem Platform'}
              {activeTab === 'stars' && '⭐ Ringkasan Pendapatan Setiap Star'}
              {activeTab === 'orders' && '📦 Seluruh Transaksi & Filter Khusus Star'}
              {activeTab === 'gateways' && '💳 Dynamic Payment Gateway'}
              {activeTab === 'taxes' && '🏛️ Manajemen Pajak & Potongan Dinamis'}
              {activeTab === 'audit' && '🛡️ Log Keamanan & Audit Sistem'}
              {activeTab === 'settings' && '⚙️ Konfigurasi Parameter Platform'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={loadData}
              className="nb-btn nb-btn-yellow text-xs py-2 px-3 font-bold"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold border-3 border-nb-black shadow-nb-sm flex items-center justify-between ${
            message.includes('berhasil')
              ? 'bg-nb-lime/50 text-nb-black'
              : 'bg-nb-red/20 text-nb-black'
          }`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-nb-black hover:opacity-75 font-black text-sm px-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Memuat metrik platform...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-2xl mb-3">
                        💰
                      </div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Gross Merchandise Value (GMV)</p>
                      <p className="text-white text-3xl font-black font-mono mt-1">{formatRupiah(stats?.gmv || 0)}</p>
                      <p className="text-emerald-400 text-xs mt-2 font-medium">Total perputaran mabar</p>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-2xl mb-3">
                        📈
                      </div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Platform Fee Revenue (5%)</p>
                      <p className="text-white text-3xl font-black font-mono mt-1">{formatRupiah(stats?.platformFee || 0)}</p>
                      <p className="text-purple-400 text-xs mt-2 font-medium">Bagi hasil sistem</p>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-2xl mb-3">
                        🎮
                      </div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Transaksi Lunas</p>
                      <p className="text-white text-3xl font-black mt-1">{stats?.totalOrders || 0}</p>
                      <p className="text-blue-400 text-xs mt-2 font-medium">Pesanan berhasil terverifikasi</p>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-2xl mb-3">
                        ⭐
                      </div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Streamer / Star Aktif</p>
                      <p className="text-white text-3xl font-black mt-1">
                        {stats?.activeStars || 0} <span className="text-lg font-normal text-slate-500">/ {stats?.totalStars || 0}</span>
                      </p>
                      <p className="text-amber-400 text-xs mt-2 font-medium">Kreator gaming terdaftar</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-3">
                  <h3 className="font-bold text-white text-lg">Status Ekosistem Mabar VIP</h3>
                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs text-slate-400">Order Menunggu Pembayaran</span>
                      <p className="text-2xl font-bold text-yellow-300 mt-1">{stats?.pendingOrders || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs text-slate-400">Order Gagal / Dibatalkan</span>
                      <p className="text-2xl font-bold text-red-400 mt-1">{stats?.failedOrders || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs text-slate-400">Payment Gateway Aktif Saat Ini</span>
                      <p className="text-sm font-semibold text-emerald-400 mt-2 uppercase font-mono">
                        {activeGateway} Mode
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: RINGKASAN & PENDAPATAN SETIAP STAR */}
        {activeTab === 'stars' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">⭐ Ringkasan Pendapatan Setiap Star</h2>
                <p className="text-slate-400 text-xs">
                  Pantau omset kotor, akumulasi potongan pajak, dan pendapatan bersih yang menjadi hak masing-masing streamer.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={loadData} className="border-white/10 bg-white/5 text-xs text-slate-300">
                🔄 Refresh Data
              </Button>
            </div>

            {/* Financial Summary Aggregate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardContent className="pt-5">
                  <span className="text-xs text-slate-400">Total Omset Kotor Seluruh Star</span>
                  <p className="text-2xl font-black font-mono text-white mt-1">{formatRupiah(totalStarGross)}</p>
                </CardContent>
              </Card>
              <Card className="border-rose-500/20 bg-rose-950/20 backdrop-blur-xl">
                <CardContent className="pt-5">
                  <span className="text-xs text-rose-300">Total Potongan (Pajak + Fee)</span>
                  <p className="text-2xl font-black font-mono text-rose-400 mt-1">{formatRupiah(totalStarDeductions)}</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl">
                <CardContent className="pt-5">
                  <span className="text-xs text-emerald-300">Total Pendapatan Bersih Star</span>
                  <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{formatRupiah(totalStarNet)}</p>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Memuat data pendapatan streamer...</p>
              </div>
            ) : stars.length === 0 ? (
              <p className="text-slate-400 py-10 text-center">Belum ada streamer terdaftar.</p>
            ) : (
              <div className="space-y-4">
                {stars.map((star) => (
                  <Card key={star.id} className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Star Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white text-xl shrink-0">
                            {star.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-lg">{star.displayName}</h3>
                              <Badge
                                variant="outline"
                                className={star.isActive
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-xs'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30 text-xs'}
                              >
                                {star.isActive ? '● Aktif' : '○ Suspend'}
                              </Badge>
                              {star.pendingPayoutsCount > 0 && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                                  ⏳ {star.pendingPayoutsCount} Pengajuan Cair
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Slug: /{star.slug} · {star.catalogCount} Layanan Mabar
                            </p>

                            {/* Bank Details */}
                            <div className="mt-3 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                              {star.bankAccount ? (
                                <span className="text-slate-300">
                                  🏦 <strong className="text-white">{star.bankAccount.bankName}</strong> ·{' '}
                                  <span className="font-mono text-purple-300">{star.bankAccount.accountNumber}</span> a.n{' '}
                                  <strong className="text-white">{star.bankAccount.accountHolderName}</strong>
                                </span>
                              ) : (
                                <span className="text-amber-400/80">⚠️ Rekening bank belum diisi oleh Star</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financial Figures: Weekly unwithdrawn, 1 Month, and Lifetime */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                          {/* 1. Saldo Siap Cair Mingguan (Reset ke 0 saat ditarik) */}
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Siap Cair (Mingguan)</span>
                              <Badge className="bg-emerald-500 text-white text-[9px] py-0 px-1 font-bold">Reset Rp 0</Badge>
                            </div>
                            <span className="text-base font-bold text-emerald-300 font-mono block">
                              {formatRupiah(star.weeklyUnwithdrawnNet || 0)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kotor: {formatRupiah(star.weeklyUnwithdrawnGross || 0)}
                            </span>
                          </div>

                          {/* 2. 1 Bulan (30 Hari) */}
                          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block mb-1">
                              1 Bulan (30 Hari)
                            </span>
                            <span className="text-base font-bold text-purple-200 font-mono block">
                              {formatRupiah(star.monthlyNet || 0)} <span className="text-xs font-normal text-purple-300">(Bersih)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kotor: {formatRupiah(star.monthlyGross || 0)} · {star.monthlyOrdersCount || 0} ord
                            </span>
                          </div>

                          {/* 3. Seluruh Durasi (All-Time) */}
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                              Seluruh Durasi (All-Time)
                            </span>
                            <span className="text-base font-bold text-white font-mono block">
                              {formatRupiah(star.netRevenue)} <span className="text-xs font-normal text-slate-400">(Bersih)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kotor: {formatRupiah(star.grossRevenue)} · {star.totalOrders} ord
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStarFilter(star.id);
                              setActiveTab('orders');
                            }}
                            className="w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs flex items-center justify-center gap-1 font-semibold"
                          >
                            🔍 Transaksi ({star.totalOrders})
                          </Button>
                          <Link href={`/${star.slug}`} target="_blank" className="w-full">
                            <Button size="sm" variant="outline" className="w-full border-white/10 hover:bg-white/10 text-xs text-slate-300">
                              Katalog Publik ↗
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant={star.isActive ? 'outline' : 'default'}
                            onClick={() => handleToggleStarStatus(star)}
                            className={`w-full text-xs ${
                              star.isActive
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {star.isActive ? 'Suspend Star' : 'Aktifkan Star'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SELURUH TRANSAKSI DENGAN FILTER PER STAR */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">📦 Seluruh Transaksi & Filter Khusus Star</h2>
                <p className="text-slate-400 text-xs">
                  Filter transaksi berdasarkan streamer tertentu (Star A / Star B) dan periksa detail jawaban akun pembeli.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={loadData} className="border-white/10 bg-white/5 text-xs text-slate-300">
                🔄 Refresh Transaksi
              </Button>
            </div>

            {/* Quick Star Filter Pills */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Pilih Star untuk Difilter:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedStarFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStarFilter === 'all'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-400'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>🌟 Semua Star</span>
                  <Badge variant="outline" className="border-white/20 text-[10px] py-0 px-1.5 bg-black/30">
                    {orders.length}
                  </Badge>
                </button>

                {stars.map((s) => {
                  const count = starOrdersCountMap[s.id] || 0;
                  const isSelected = selectedStarFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStarFilter(s.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-400'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-pink-400" />
                      <span>{s.displayName}</span>
                      <Badge variant="outline" className="border-white/20 text-[10px] py-0 px-1.5 bg-black/30">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Controls Bar */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-400">Pilih Dropdown Star</Label>
                    <select
                      value={selectedStarFilter}
                      onChange={(e) => setSelectedStarFilter(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs"
                    >
                      <option value="all">🌟 Tampilkan Semua Star ({orders.length} order)</option>
                      {stars.map((s) => (
                        <option key={s.id} value={s.id}>
                          ⭐ {s.displayName} ({starOrdersCountMap[s.id] || 0} order)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-400">Status Pembayaran</Label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs"
                    >
                      <option value="all">Semua Status Pembayaran</option>
                      <option value="paid">✅ Lunas (Paid)</option>
                      <option value="pending_payment">⏳ Menunggu (Pending Payment)</option>
                      <option value="payment_failed">❌ Gagal / Batal</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-400">Cari Cepat</Label>
                    <Input
                      placeholder="Cari ID Pesanan, Pembeli, Nickname..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mt-1 bg-slate-900 border-white/10 text-white text-xs placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Star Focus Summary Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-base">
                  {currentFilteredStar ? currentFilteredStar.displayName.charAt(0) : '🌟'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {currentFilteredStar ? `Transaksi Khusus: ${currentFilteredStar.displayName}` : 'Seluruh Transaksi Ekosistem Platform'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentFilteredStar ? `Menampilkan pesanan mabar milik /${currentFilteredStar.slug}` : 'Semua transaksi dari seluruh streamer yang terdaftar'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 text-[10px] block font-sans">Total Order</span>
                  <strong className="text-white">{filterMetrics.total} transaksi</strong>
                </div>
                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 text-[10px] block font-sans">Omset Lunas</span>
                  <strong className="text-emerald-300">{formatRupiah(filterMetrics.totalPaidRevenue)}</strong>
                </div>
                <div className="bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
                  <span className="text-purple-300 text-[10px] block font-sans">Dalam Antrean</span>
                  <strong className="text-purple-200">{filterMetrics.inQueueCount} antre</strong>
                </div>
                {selectedStarFilter !== 'all' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStarFilter('all')}
                    className="border-white/10 hover:bg-white/10 text-xs text-slate-300"
                  >
                    ✕ Reset Filter
                  </Button>
                )}
              </div>
            </div>

            {/* Table of Orders */}
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Memuat transaksi...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-slate-400 py-12 text-center text-sm">
                Tidak ada transaksi yang cocok dengan filter yang dipilih.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Streamer</th>
                      <th className="p-3.5">Pembeli</th>
                      <th className="p-3.5">Katalog Layanan</th>
                      <th className="p-3.5">Nominal</th>
                      <th className="p-3.5">Status Bayar</th>
                      <th className="p-3.5">Status Antrean</th>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOrders.map((ord) => {
                      // Extract in-game nickname if exists in guestAnswers
                      const gameNickname =
                        ord.guestAnswers?.in_game_nickname ||
                        ord.guestAnswers?.nickname ||
                        ord.guestAnswers?.game_id ||
                        null;

                      return (
                        <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 font-mono text-purple-300">
                            {ord.merchantOrderId || ord.id.slice(0, 8)}
                          </td>
                          <td className="p-3.5">
                            <span
                              onClick={() => setSelectedStarFilter(ord.starId)}
                              className="font-semibold text-white hover:text-purple-300 cursor-pointer transition-colors"
                              title="Klik untuk filter khusus Star ini"
                            >
                              ⭐ {ord.starName}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-200 font-medium block">{ord.guestDisplayName}</span>
                            {gameNickname && (
                              <span className="text-[10px] text-purple-400 font-mono block">
                                IGN: {String(gameNickname)}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400">{ord.catalogName}</td>
                          <td className="p-3.5 font-mono font-bold text-amber-300">
                            {formatRupiah(ord.amount)}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              className={ord.paymentStatus === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : ord.paymentStatus === 'pending_payment'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                : 'bg-red-500/20 text-red-300 border-red-500/30'}
                            >
                              {ord.paymentStatus}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            {ord.queueNumber ? (
                              <span className="font-mono font-bold text-purple-300">
                                #{ord.queueNumber} ({ord.queueStatus})
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono">
                            {formatDateTime(ord.paidAt || ord.createdAt)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrderForDetail(ord)}
                              className="border-white/10 hover:bg-white/10 text-xs text-purple-300 py-1 px-2.5 h-auto"
                            >
                              🔍 Detail
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Transaction Detail Modal */}
            {selectedOrderForDetail && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                          {selectedOrderForDetail.starName}
                        </Badge>
                        <span className="font-mono text-xs text-slate-400">
                          Order ID: {selectedOrderForDetail.merchantOrderId}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mt-1">Detail Transaksi & Akun Mabar</h3>
                    </div>
                    <button
                      onClick={() => setSelectedOrderForDetail(null)}
                      className="text-slate-400 hover:text-white text-lg p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Section 1: Buyer & In-Game Info */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      🎮 Data Akun Pembeli / Pemain
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Nama Display:</span>
                        <strong className="text-white text-sm">{selectedOrderForDetail.guestDisplayName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Layanan Katalog:</span>
                        <strong className="text-white text-sm">{selectedOrderForDetail.catalogName}</strong>
                      </div>
                    </div>

                    {/* Answers Form Fields */}
                    {selectedOrderForDetail.guestAnswers && Object.keys(selectedOrderForDetail.guestAnswers).length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-slate-500 block text-xs mb-1.5">Informasi Formulir Game:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedOrderForDetail.guestAnswers).map(([k, v]) => (
                            <div key={k} className="p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                              <span className="text-slate-400 text-[10px] block capitalize">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <strong className="text-white font-mono">{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guest Message */}
                    {selectedOrderForDetail.guestMessage && (
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-slate-500 block text-xs mb-1">Pesan untuk Streamer:</span>
                        <p className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 italic">
                          &ldquo;{selectedOrderForDetail.guestMessage}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Payment & Queue Details */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      💳 Status Finansial & Antrean
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Nominal:</span>
                        <strong className="text-amber-300 font-mono text-base font-bold">
                          {formatRupiah(selectedOrderForDetail.amount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Status Pembayaran:</span>
                        <Badge
                          className={selectedOrderForDetail.paymentStatus === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}
                        >
                          {selectedOrderForDetail.paymentStatus}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Nomor Antrean:</span>
                        <strong className="text-purple-300 font-mono text-base font-bold">
                          {selectedOrderForDetail.queueNumber ? `#${selectedOrderForDetail.queueNumber}` : '-'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Status Antrean:</span>
                        <span className="text-white font-semibold capitalize font-mono">
                          {selectedOrderForDetail.queueStatus}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 space-y-1 font-mono">
                      <p>Waktu Order: {formatDateTime(selectedOrderForDetail.createdAt)}</p>
                      {selectedOrderForDetail.paidAt && (
                        <p className="text-emerald-400">Waktu Lunas: {formatDateTime(selectedOrderForDetail.paidAt)}</p>
                      )}
                      {selectedOrderForDetail.duitkuReference && (
                        <p>Reference Gateway: {selectedOrderForDetail.duitkuReference}</p>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between pt-2">
                    {selectedOrderForDetail.trackingToken ? (
                      <Link
                        href={`/pesanan/${selectedOrderForDetail.trackingToken}`}
                        target="_blank"
                        className="text-xs text-purple-300 hover:text-purple-200 underline"
                      >
                        Buka Halaman Tracking Pesanan ↗
                      </Link>
                    ) : <span />}
                    <Button
                      onClick={() => setSelectedOrderForDetail(null)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DYNAMIC PAYMENT GATEWAY MANAGEMENT */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">💳 Pengaturan Dynamic Payment Gateway</h2>
              <p className="text-slate-400 text-xs">
                Ganti dan kelola payment gateway yang aktif secara instan tanpa perlu redeploy codingan.
              </p>
            </div>

            <form onSubmit={handleSavePaymentGateway} className="space-y-6">
              {/* Gateway Provider Selector */}
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Pilih Payment Gateway yang Aktif Digunakan</CardTitle>
                  <CardDescription className="text-slate-400">
                    Sistem akan menggunakan gateway yang kamu centang untuk seluruh transaksi checkout penonton.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'dummy',
                        name: '🧪 Dummy Simulator (Rekomendasi Uji Coba)',
                        desc: 'Bebas biaya, QRIS simulator & verifikasi instan tanpa perlu akun resmi.',
                        badge: 'Test Mode',
                      },
                      {
                        id: 'duitku',
                        name: '💳 Duitku.com',
                        desc: 'QRIS real-time, Virtual Account Bank (BCA, Mandiri, BRI, BNI), E-Wallet.',
                        badge: 'Produksi / Sandbox',
                      },
                      {
                        id: 'midtrans',
                        name: '🚀 Midtrans Snap / Core',
                        desc: 'Gateway terkemuka GoTo Group dengan dukungan GoPay, ShopeePay & VA.',
                        badge: 'Enterprise',
                      },
                      {
                        id: 'xendit',
                        name: '⚡ Xendit Invoice',
                        desc: 'Link invoice checkout otomatis dengan notifikasi real-time webhook.',
                        badge: 'Modern',
                      },
                      {
                        id: 'manual',
                        name: '📝 Transfer Manual Rekening Admin',
                        desc: 'Instruksi transfer ke rekening bank admin / konfirmasi bukti transfer WhatsApp.',
                        badge: 'Tanpa Fee Pihak Ketiga',
                      },
                    ].map((provider) => (
                      <div
                        key={provider.id}
                        onClick={() => setActiveGateway(provider.id as any)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                          activeGateway === provider.id
                            ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white">{provider.name}</span>
                          {activeGateway === provider.id && (
                            <Badge className="bg-rose-500 text-white text-[10px]">Aktif Digunakan</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{provider.desc}</p>
                        <Badge variant="outline" className="mt-3 text-[10px] border-white/10 text-slate-400">
                          {provider.badge}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Duitku Credentials */}
              <Card className={`border-white/10 bg-white/5 backdrop-blur-xl ${activeGateway === 'duitku' ? 'border-rose-500/40' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>⚙️ Kredensial Akun Duitku.com</span>
                    {activeGateway === 'duitku' && <Badge className="bg-rose-500 text-white text-xs">Sedang Dipakai</Badge>}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Masukkan Merchant Code dan API Key dari dashboard Duitku Merchant kamu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Merchant Code Duitku</Label>
                      <Input
                        type="text"
                        placeholder="Contoh: D12345"
                        value={gatewayConfig.duitku?.merchantCode || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            duitku: { ...gatewayConfig.duitku, merchantCode: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Merchant API Key</Label>
                      <Input
                        type="password"
                        placeholder="Masukkan API Key Duitku..."
                        value={gatewayConfig.duitku?.apiKey || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            duitku: { ...gatewayConfig.duitku, apiKey: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">URL Callback untuk didaftarkan di Duitku:</p>
                    <p className="font-mono text-purple-300 select-all">https://namadomainkamu.com/api/payments/callback</p>
                  </div>
                </CardContent>
              </Card>

              {/* Midtrans Credentials */}
              <Card className={`border-white/10 bg-white/5 backdrop-blur-xl ${activeGateway === 'midtrans' ? 'border-rose-500/40' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>⚙️ Kredensial Midtrans Snap</span>
                    {activeGateway === 'midtrans' && <Badge className="bg-rose-500 text-white text-xs">Sedang Dipakai</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Server Key</Label>
                      <Input
                        type="password"
                        placeholder="SB-Mid-server-..."
                        value={gatewayConfig.midtrans?.serverKey || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            midtrans: { ...gatewayConfig.midtrans, serverKey: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Client Key</Label>
                      <Input
                        type="text"
                        placeholder="SB-Mid-client-..."
                        value={gatewayConfig.midtrans?.clientKey || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            midtrans: { ...gatewayConfig.midtrans, clientKey: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Transfer Information */}
              <Card className={`border-white/10 bg-white/5 backdrop-blur-xl ${activeGateway === 'manual' ? 'border-rose-500/40' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>⚙️ Rekening Admin Transfer Manual</span>
                    {activeGateway === 'manual' && <Badge className="bg-rose-500 text-white text-xs">Sedang Dipakai</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Nama Bank</Label>
                      <Input
                        type="text"
                        value={gatewayConfig.manual?.bankName || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            manual: { ...gatewayConfig.manual, bankName: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Nomor Rekening</Label>
                      <Input
                        type="text"
                        value={gatewayConfig.manual?.accountNumber || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            manual: { ...gatewayConfig.manual, accountNumber: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Atas Nama Pemilik</Label>
                      <Input
                        type="text"
                        value={gatewayConfig.manual?.accountName || ''}
                        onChange={(e) =>
                          setGatewayConfig({
                            ...gatewayConfig,
                            manual: { ...gatewayConfig.manual, accountName: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={savingGateways}
                className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-6 text-base shadow-xl shadow-rose-900/30"
              >
                {savingGateways ? 'Menyimpan Payment Gateway...' : '💾 Simpan & Terapkan Payment Gateway Ini'}
              </Button>
            </form>
          </div>
        )}

        {/* TAB 5: PAJAK & POTONGAN DINAMIS */}
        {activeTab === 'taxes' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">🏛️ Pengaturan Pajak & Potongan Lainnya</h2>
                <p className="text-slate-400 text-xs">
                  Sesuaikan potongan pajak pemerintah (PPh 21, PPN dll) dan biaya operasional secara dinamis dari UI tanpa mengubah codingan.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddTaxModal(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  ➕ Tambah Point Potongan Baru
                </Button>
                <Button
                  onClick={handleSaveTaxes}
                  disabled={savingTaxes}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {savingTaxes ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </Button>
              </div>
            </div>

            {/* Modal: Tambah Point Pajak Baru */}
            {showAddTaxModal && (
              <Card className="border-purple-500/40 bg-purple-950/30 backdrop-blur-xl p-4">
                <CardHeader>
                  <CardTitle className="text-base text-white">Tambah Point Pajak / Potongan Baru (Manual)</CardTitle>
                  <CardDescription className="text-slate-400">
                    Definisikan kategori potongan baru sesuai aturan undang-undang / regulasi terkini.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCustomTax} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-300 text-xs">Nama Point Pajak / Potongan</Label>
                        <Input
                          placeholder="Contoh: Pajak PPh 21 Streamer"
                          value={newTaxName}
                          onChange={(e) => setNewTaxName(e.target.value)}
                          required
                          className="mt-1 bg-slate-900 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-xs">Tipe Perhitungan</Label>
                        <select
                          value={newTaxType}
                          onChange={(e) => setNewTaxType(e.target.value as any)}
                          className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm"
                        >
                          <option value="percentage">Persentase (%)</option>
                          <option value="fixed">Nominal Tetap (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-xs">
                          Nilai {newTaxType === 'percentage' ? '(%)' : '(Rp)'}
                        </Label>
                        <Input
                          type="number"
                          step={newTaxType === 'percentage' ? '0.1' : '500'}
                          placeholder={newTaxType === 'percentage' ? 'Contoh: 2.5' : 'Contoh: 2500'}
                          value={newTaxValue}
                          onChange={(e) => setNewTaxValue(e.target.value)}
                          required
                          className="mt-1 bg-slate-900 border-white/10 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Keterangan / Landasan Aturan Hukum</Label>
                      <Input
                        placeholder="Contoh: Sesuai UU HPP No 7 Tahun 2021 & PMK terkait pajak penghasilan kreator"
                        value={newTaxDesc}
                        onChange={(e) => setNewTaxDesc(e.target.value)}
                        className="mt-1 bg-slate-900 border-white/10 text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddTaxModal(false)}
                        className="border-white/10 text-slate-300"
                      >
                        Batal
                      </Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white">
                        Tambahkan ke Daftar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* List of Active & Configured Deductions */}
            <div className="space-y-3">
              {deductions.map((item, idx) => (
                <Card key={item.id} className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{item.name}</h4>
                          <Badge
                            variant="outline"
                            className={item.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs'
                              : 'bg-slate-700 text-slate-400 border-slate-600 text-xs'}
                          >
                            {item.is_active ? '● Aktif Diterapkan' : '○ Dinonaktifkan'}
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {item.type === 'percentage' ? `${item.value}%` : formatRupiah(item.value)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant={item.is_active ? 'outline' : 'default'}
                        onClick={() => handleToggleDeduction(item.id)}
                        className={`text-xs ${
                          item.is_active
                            ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDeduction(item.id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                      >
                        Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Live Interactive Simulator Calculator */}
            <Card className="border-blue-500/30 bg-blue-950/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-base text-blue-300 flex items-center gap-2">
                  <span>🧮 Live Simulator Perhitungan Pajak & Pendapatan Star</span>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Uji coba simulasi nominal pendapatan kotor untuk melihat rincian potongan otomatis yang akan diterima Star di rekening.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-xs">
                  <Label className="text-slate-300 text-xs">Simulasi Pendapatan Kotor (Rp)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="mt-1 bg-slate-900 border-white/10 text-white font-mono"
                  />
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>Pendapatan Kotor:</span>
                    <span>{formatRupiah(simulationBreakdown.grossAmount)}</span>
                  </div>
                  <div className="border-t border-white/10 my-2" />
                  {simulationBreakdown.deductions.map((d) => (
                    <div key={d.id} className="flex justify-between text-slate-400">
                      <span>• {d.name} {d.type === 'percentage' && `(${d.rate}%)`}:</span>
                      <span className="text-red-400 font-mono">- {formatRupiah(d.calculatedAmount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 my-2" />
                  <div className="flex justify-between text-sm font-bold text-emerald-400">
                    <span>Estimasi Diterima Bersih Oleh Star:</span>
                    <span className="font-mono text-base">{formatRupiah(simulationBreakdown.netAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Log Keamanan & Audit Sistem</h2>
                <p className="text-slate-400 text-xs">Pencatatan webhook pembayaran, race condition preventer, dan event alokasi antrean.</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadData} className="border-white/10 bg-white/5 text-xs text-slate-300">
                🔄 Refresh
              </Button>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Memuat audit log...</p>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-slate-400 py-10 text-center">Belum ada riwayat audit log.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-slate-200 font-mono text-[11px]">
                          {log.action}
                        </Badge>
                        <span className="text-slate-400">entity: <b>{log.entity_type}</b></span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="font-mono text-slate-400 text-[11px] truncate max-w-xl">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px] font-mono shrink-0">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: GENERAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Konfigurasi Parameter Platform</CardTitle>
                <CardDescription className="text-slate-400">
                  Ubah parameter bisnis, fee, dan batasan durasi mabar global.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Biaya Platform / Platform Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono"
                    />
                    <p className="text-[11px] text-slate-400">Persentase potongan sistem untuk operasional mabar.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Durasi Default Alert Pop-up OBS (milidetik)</Label>
                    <Input
                      type="number"
                      step="1000"
                      min="1000"
                      max="30000"
                      value={alertDuration}
                      onChange={(e) => setAlertDuration(e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono"
                    />
                    <p className="text-[11px] text-slate-400">5000 ms = 5 detik durasi pop-up mabar muncul di OBS.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Batas Maksimal Pesan Penonton (Karakter)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="500"
                      value={maxMsgLength}
                      onChange={(e) => setMaxMsgLength(e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Batas Waktu Kedaluwarsa Pesanan (Menit)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={expiryMinutes}
                      onChange={(e) => setExpiryMinutes(e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold py-5 cursor-pointer"
                  >
                    {savingSettings ? 'Menyimpan...' : 'Simpan Parameter Platform'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
