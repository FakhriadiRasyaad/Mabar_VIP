'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatRupiah } from '@/lib/security';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import { POPULAR_BANKS, type DeductionItem, type CalculatedDeduction } from '@/lib/finance';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_holder_name: string;
  is_verified: boolean;
}

interface PayoutRequest {
  id: string;
  amount_gross: number;
  platform_fee_amount: number;
  tax_amount: number;
  other_deductions_amount: number;
  amount_net: number;
  deductions_breakdown: CalculatedDeduction[];
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  scheduled_payout_date: string;
  created_at: string;
}

interface ScheduleInfo {
  allowed: boolean;
  dayName: string;
  nextFridayDate: string;
  nextMondayDisbursement: string;
}

interface EarningsData {
  lifetimeGross: number;
  lifetimeNet: number;
  lifetimeTotalDeductions: number;
  lifetimeBreakdown: {
    grossAmount: number;
    totalDeductions: number;
    netAmount: number;
    deductions: CalculatedDeduction[];
  };
  monthlyGross: number;
  monthlyNet: number;
  monthlyTotalDeductions: number;
  monthlyOrdersCount: number;
  weeklyUnwithdrawnGross: number;
  weeklyUnwithdrawnNet: number;
  availableGross: number;
  availableBreakdown: {
    grossAmount: number;
    totalDeductions: number;
    netAmount: number;
    deductions: CalculatedDeduction[];
  };
  bankAccount: BankAccount | null;
  payoutRequests: PayoutRequest[];
  scheduleInfo: ScheduleInfo;
  activeTaxRules: DeductionItem[];
}

export default function StarRekeningPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Bank Form State
  const [bankCode, setBankCode] = useState('BCA');
  const [bankName, setBankName] = useState('Bank Central Asia (BCA)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/star/earnings');
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json.bankAccount) {
          setBankCode(json.bankAccount.bank_code);
          setBankName(json.bankAccount.bank_name);
          setAccountNumber(json.bankAccount.account_number);
          setAccountHolderName(json.bankAccount.account_holder_name);
        }
      } else {
        setErrorMsg(json.error || 'Gagal memuat data keuangan');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBankChange = (code: string) => {
    setBankCode(code);
    const bank = POPULAR_BANKS.find((b) => b.code === code);
    if (bank) {
      setBankName(bank.name);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/star/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode,
          bankName,
          accountNumber,
          accountHolderName,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Informasi rekening berhasil disimpan!');
        fetchData();
      } else {
        setErrorMsg(json.error || 'Gagal menyimpan rekening');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!data?.bankAccount) {
      setErrorMsg('Lengkapi rekening terlebih dahulu sebelum meminta pencairan');
      return;
    }
    if (
      !confirm(
        'Apakah kamu yakin ingin mengajukan pencairan seluruh saldo yang tersedia? Setelah diajukan, saldo siap cair mingguan akan kembali menjadi Rp 0.'
      )
    ) {
      return;
    }

    setRequestingPayout(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/star/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountGross: data.availableGross,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(
          json.message ||
            'Pengajuan pencairan berhasil terkirim! Saldo siap cair mingguan telah diperbarui.'
        );
        fetchData();
      } else {
        setErrorMsg(json.error || 'Gagal mengajukan pencairan');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memproses pencairan');
    } finally {
      setRequestingPayout(false);
    }
  };

  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots pb-16">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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
              💳 Rekening & Pendapatan Bersih
            </h1>
            <p className="text-nb-gray-600 text-sm mt-1">
              Pantau rincian pendapatan bersih (setelah potongan pajak & platform), performa 1 bulan, dan penarikan mingguan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-nb-red/20 border-3 border-nb-red text-nb-black font-bold text-sm shadow-nb-sm flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => setErrorMsg('')}
              className="font-bold text-base hover:text-nb-red px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-nb-lime/40 border-3 border-nb-black text-nb-black font-bold text-sm shadow-nb-sm flex items-center justify-between">
            <span>✅ {successMsg}</span>
            <button
              onClick={() => setSuccessMsg('')}
              className="font-bold text-base hover:opacity-75 px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Highlight Cards: 3 Durations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. KOLOM BARU: Saldo Siap Cair Mingguan (Reset ke 0 saat ditarik) */}
          <div className="nb-card p-6 bg-nb-yellow/40 hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="nb-badge nb-badge-lime text-[11px] font-extrabold">
                🔄 SIKLUS MINGGUAN
              </span>
              <span className="text-[11px] font-mono font-bold text-nb-black bg-white px-2 py-0.5 rounded border border-nb-black">
                Reset Rp 0 saat ditarik
              </span>
            </div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-nb-gray-700">
              Saldo Siap Ditarik (Minggu Ini)
            </div>
            <div className="text-3xl font-black font-mono text-nb-black mt-1">
              {formatRupiah(data?.weeklyUnwithdrawnNet || 0)}
            </div>
            <div className="text-xs text-nb-gray-700 mt-4 pt-3 border-t-2 border-nb-black/10 space-y-1">
              <div className="flex justify-between font-mono">
                <span>Kotor Belum Ditarik:</span>
                <span className="font-bold text-nb-black">
                  {formatRupiah(data?.weeklyUnwithdrawnGross || 0)}
                </span>
              </div>
              <p className="text-[11px] text-nb-black/80 font-bold mt-2">
                💡 Setiap penarikan diajukan, saldo ini otomatis kembali ke Rp 0.
              </p>
            </div>
          </div>

          {/* 2. Pendapatan 1 Bulan Terakhir (30 Hari) */}
          <div className="nb-card p-6 bg-nb-cyan/20 hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="nb-badge nb-badge-cyan text-[11px] font-extrabold">
                📅 30 HARI TERAKHIR
              </span>
              <span className="text-[11px] font-mono font-bold text-nb-black bg-white px-2 py-0.5 rounded border border-nb-black">
                {data?.monthlyOrdersCount || 0} order
              </span>
            </div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-nb-gray-700">
              Pendapatan Bersih (1 Bulan)
            </div>
            <div className="text-3xl font-black font-mono text-nb-black mt-1">
              {formatRupiah(data?.monthlyNet || 0)}
            </div>
            <div className="text-xs text-nb-gray-700 mt-4 pt-3 border-t-2 border-nb-black/10 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Kotor 1 Bulan:</span>
                <span className="font-bold text-nb-black">
                  {formatRupiah(data?.monthlyGross || 0)}
                </span>
              </div>
              <div className="flex justify-between text-nb-red font-bold">
                <span>Potongan Pajak & Fee:</span>
                <span>- {formatRupiah(data?.monthlyTotalDeductions || 0)}</span>
              </div>
            </div>
          </div>

          {/* 3. Pendapatan Seluruh Durasi (Lifetime) */}
          <div className="nb-card p-6 bg-nb-purple/20 hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="nb-badge nb-badge-purple text-[11px] font-extrabold">
                ⭐ ALL-TIME
              </span>
              <span className="text-[11px] font-mono font-bold text-nb-black bg-white px-2 py-0.5 rounded border border-nb-black">
                Total Akumulasi
              </span>
            </div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-nb-gray-700">
              Total Bersih Diterima Star
            </div>
            <div className="text-3xl font-black font-mono text-nb-black mt-1">
              {formatRupiah(data?.lifetimeNet || 0)}
            </div>
            <div className="text-xs text-nb-gray-700 mt-4 pt-3 border-t-2 border-nb-black/10 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Total Kotor:</span>
                <span className="font-bold text-nb-black">
                  {formatRupiah(data?.lifetimeGross || 0)}
                </span>
              </div>
              <div className="flex justify-between text-nb-red font-bold">
                <span>Pajak & Fee Terpotong:</span>
                <span>- {formatRupiah(data?.lifetimeTotalDeductions || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Alert Banner */}
        <div className="nb-card p-6 bg-nb-cream">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm text-3xl flex items-center justify-center shrink-0">
              📅
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-lg uppercase tracking-tight text-nb-black">
                Aturan Jadwal Penarikan Dana Mingguan
              </h3>
              <p className="text-sm text-nb-gray-700 mt-1">
                Penarikan dana <strong className="text-nb-black bg-nb-yellow px-1 rounded">hanya dibuka setiap hari JUM&apos;AT</strong>. Dana yang diajukan akan{' '}
                <strong className="text-nb-black bg-nb-lime px-1 rounded">cair ke rekening kamu pada hari SENIN</strong> berikutnya.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="nb-badge bg-white border-2 border-nb-black text-xs font-bold font-mono">
                  Hari ini: {data?.scheduleInfo?.dayName || '...'}
                </span>
                {data?.scheduleInfo?.allowed ? (
                  <span className="nb-badge nb-badge-lime animate-bounce text-xs font-bold">
                    ✨ Pengajuan DIBUKA Hari Ini!
                  </span>
                ) : (
                  <span className="text-xs font-bold text-nb-gray-600">
                    Jum&apos;at berikutnya:{' '}
                    <strong className="text-nb-black font-mono">{data?.scheduleInfo?.nextFridayDate}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Earnings & Payout vs Bank Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Earnings Breakdown & Payout Button */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tax & Deduction Breakdown Box */}
            <div className="nb-card p-6">
              <div className="flex items-center justify-between pb-3 border-b-2 border-nb-black/10 flex-wrap gap-2">
                <h3 className="text-lg font-extrabold uppercase text-nb-black flex items-center gap-2">
                  <span>📊 Rincian Potongan Pajak & Nilai Bersih</span>
                </h3>
                <span className="nb-badge nb-badge-lime text-xs font-bold">
                  Transparan & Otomatis
                </span>
              </div>
              <p className="text-xs text-nb-gray-600 mt-1 mb-4">
                Dihitung otomatis dari saldo kotor siap tarik minggu ini sesuai aturan perpajakan.
              </p>

              <div className="space-y-3 bg-white p-5 rounded-2xl border-3 border-nb-black shadow-nb-sm">
                <div className="flex justify-between items-center text-sm font-bold text-nb-black">
                  <span>Saldo Kotor Siap Ditarik Minggu Ini:</span>
                  <span className="font-mono text-base">
                    {formatRupiah(data?.weeklyUnwithdrawnGross || 0)}
                  </span>
                </div>

                <div className="border-t-2 border-dashed border-nb-black/20 my-2" />

                {/* Active Deductions List */}
                {data?.availableBreakdown?.deductions?.map((d) => (
                  <div key={d.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-bold text-nb-black">
                        {d.name} {d.type === 'percentage' && `(${d.rate}%)`}
                      </p>
                      <p className="text-xs text-nb-gray-500">{d.description}</p>
                    </div>
                    <span className="text-nb-red font-bold font-mono">
                      - {formatRupiah(d.calculatedAmount)}
                    </span>
                  </div>
                ))}

                {(!data?.availableBreakdown?.deductions ||
                  data.availableBreakdown.deductions.length === 0) && (
                  <p className="text-xs text-nb-gray-400 italic">Tidak ada potongan aktif.</p>
                )}

                <div className="border-t-2 border-nb-black my-2" />

                <div className="flex justify-between items-center pt-1">
                  <div>
                    <span className="font-extrabold text-base text-nb-black uppercase">
                      Dana Bersih yang Diterima Star:
                    </span>
                    <p className="text-xs text-nb-gray-500 font-medium">
                      Bersih tanpa potongan tambahan lagi
                    </p>
                  </div>
                  <span className="text-2xl font-black font-mono text-nb-black bg-nb-lime/50 border-2 border-nb-black px-3 py-1 rounded-xl shadow-nb-sm">
                    {formatRupiah(data?.weeklyUnwithdrawnNet || 0)}
                  </span>
                </div>
              </div>

              {/* Request Payout Action */}
              <div className="pt-5">
                <button
                  type="button"
                  onClick={handleRequestPayout}
                  disabled={
                    loading ||
                    requestingPayout ||
                    !data?.scheduleInfo?.allowed ||
                    (data?.weeklyUnwithdrawnGross || 0) < 50000 ||
                    !data?.bankAccount
                  }
                  className="w-full nb-btn nb-btn-primary py-4 text-base font-extrabold shadow-nb-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestingPayout ? (
                    'Memproses Penarikan...'
                  ) : (data?.weeklyUnwithdrawnGross || 0) === 0 ? (
                    'Saldo Siap Cair Rp 0 (Sudah Ditarik)'
                  ) : !data?.scheduleInfo?.allowed ? (
                    `🔒 Penarikan Hanya Hari Jum'at (Buka: ${data?.scheduleInfo?.nextFridayDate})`
                  ) : (data?.weeklyUnwithdrawnGross || 0) < 50000 ? (
                    'Minimal Penarikan Rp 50.000'
                  ) : !data?.bankAccount ? (
                    'Simpan Rekening Dulu untuk Menarik Saldo'
                  ) : (
                    `Ajukan Penarikan Bersih ${formatRupiah(data?.weeklyUnwithdrawnNet || 0)} Sekarang`
                  )}
                </button>
                <p className="text-xs text-center font-bold text-nb-gray-600 mt-2">
                  Jadwal transfer pencairan:{' '}
                  <strong className="text-nb-black font-mono">
                    Hari Senin ({data?.scheduleInfo?.nextMondayDisbursement})
                  </strong>
                </p>
              </div>
            </div>

            {/* Payout History */}
            <div className="nb-card p-6">
              <h3 className="text-lg font-extrabold uppercase text-nb-black mb-1">
                📜 Riwayat Penarikan Dana Mingguan
              </h3>
              <p className="text-xs text-nb-gray-600 mb-4">
                Daftar seluruh pengajuan pencairan mingguan yang telah diproses.
              </p>

              {data?.payoutRequests && data.payoutRequests.length > 0 ? (
                <div className="overflow-x-auto border-3 border-nb-black rounded-2xl shadow-nb-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase bg-nb-cream border-b-2 border-nb-black text-nb-black font-extrabold">
                      <tr>
                        <th className="px-4 py-3">Tanggal Diajukan</th>
                        <th className="px-4 py-3">Jumlah Bersih</th>
                        <th className="px-4 py-3">Jadwal Transfer</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-nb-black/10 bg-white">
                      {data.payoutRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-nb-cream/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">
                            {new Date(req.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-nb-black">
                            {formatRupiah(req.amount_net)}
                            <span className="block text-[11px] font-normal text-nb-gray-500 font-sans">
                              Kotor: {formatRupiah(req.amount_gross)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-xs text-nb-purple">
                            {req.scheduled_payout_date || 'Hari Senin'}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'completed' && (
                              <span className="nb-badge nb-badge-lime text-[11px]">
                                Tuntas Cair
                              </span>
                            )}
                            {req.status === 'approved' && (
                              <span className="nb-badge nb-badge-cyan text-[11px]">
                                Antre Transfer
                              </span>
                            )}
                            {req.status === 'pending' && (
                              <span className="nb-badge nb-badge-yellow text-[11px]">
                                Menunggu Senin
                              </span>
                            )}
                            {req.status === 'processing' && (
                              <span className="nb-badge nb-badge-purple text-[11px]">
                                Sedang Transfer
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="nb-badge nb-badge-pink text-[11px]">
                                Ditolak
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-nb-gray-500 font-bold text-sm bg-white border-2 border-dashed border-nb-black/20 rounded-xl">
                  Belum ada riwayat penarikan dana.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Bank Account Form */}
          <div className="space-y-6">
            <div className="nb-card p-6">
              <h3 className="text-lg font-extrabold uppercase text-nb-black mb-1">
                🏦 Rekening Pencairan
              </h3>
              <p className="text-xs text-nb-gray-600 mb-4">
                Data rekening bank atau e-wallet tempat dana mabar kamu akan ditransfer setiap hari Senin.
              </p>

              <form onSubmit={handleSaveBank} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                    Bank atau E-Wallet
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className="nb-input w-full bg-white font-medium"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                    Nomor Rekening / E-Wallet
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="nb-input w-full font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nb-black mb-1">
                    Nama Pemilik (Sesuai Akun)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: BUDI SANTOSO"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    required
                    className="nb-input w-full uppercase font-bold"
                  />
                </div>

                <div className="p-3 bg-nb-yellow/40 border-2 border-nb-black rounded-xl text-xs text-nb-black font-semibold">
                  💡 Pastikan nama pemilik rekening sama persis dengan akun bank/e-wallet untuk mencegah kegagalan transfer BI-FAST.
                </div>

                <button
                  type="submit"
                  disabled={savingBank}
                  className="w-full nb-btn nb-btn-primary text-sm py-3"
                >
                  {savingBank ? 'Menyimpan...' : 'Simpan Rekening'}
                </button>
              </form>
            </div>

            {/* Information FAQ Card */}
            <div className="nb-card p-6 bg-nb-cream">
              <h3 className="text-sm font-extrabold uppercase text-nb-black mb-3">
                💡 FAQ Pencairan Dana
              </h3>
              <div className="text-xs text-nb-gray-700 space-y-3 font-medium">
                <div>
                  <strong className="text-nb-black block mb-0.5">
                    Kenapa hanya bisa cair di hari Jum&apos;at?
                  </strong>
                  Sistem pencairan batching dilakukan di hari Jum&apos;at agar seluruh rekonsiliasi transaksi game dan audit pajak terverifikasi dengan rapi.
                </div>
                <div className="border-t border-nb-black/10 pt-2">
                  <strong className="text-nb-black block mb-0.5">
                    Kapan saldo siap tarik kembali ke Rp 0?
                  </strong>
                  Begitu kamu menekan &quot;Ajukan Penarikan Bersih&quot;, saldo siap tarik mingguan akan menjadi Rp 0, dan dana masuk ke antrean transfer hari Senin.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
