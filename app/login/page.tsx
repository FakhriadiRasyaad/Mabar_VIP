'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register States
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-generate slug when user types display name
  const handleDisplayNameChange = (val: string) => {
    setRegDisplayName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setRegSlug(generated);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      setLoading(false);
      return;
    }

    try {
      // 1. Authenticate via server-side API (reliable, bypasses ad-blockers & sets cookies cleanly)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Email atau password salah. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // Success: navigate to destination
      window.location.href = redirectTo;
    } catch (networkErr) {
      console.warn('Server login fetch failed, falling back to client client:', networkErr);
      // 2. Fallback: try client-side Supabase client
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError(authError.message || 'Email atau password salah. Silakan coba lagi.');
          setLoading(false);
          return;
        }

        window.location.href = redirectTo;
      } catch (clientErr) {
        console.error('All login methods failed:', clientErr);
        setError('Gagal terhubung ke server autentikasi. Pastikan koneksi internet stabil dan coba lagi.');
        setLoading(false);
      }
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          displayName: regDisplayName,
          slug: regSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mendaftarkan akun. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      setSuccess('Akun berhasil dibuat! Sedang menghubungkan ke dashboard kamu...');

      // Auto login immediately
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: regEmail,
        password: regPassword,
      });

      if (!loginError) {
        window.location.href = '/dashboard';
      } else {
        setSuccess('Pendaftaran berhasil! Silakan masuk dengan email dan password baru kamu.');
        setMode('login');
        setEmail(regEmail);
        setPassword('');
        setLoading(false);
      }
    } catch {
      setError('Terjadi kesalahan jaringan saat mendaftar. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nb-white nb-dots px-4 py-12 relative">
      {/* Top Bar Navigation */}
      <div className="absolute top-4 left-4 z-20">
        <Link href="/" className="nb-btn nb-btn-ghost text-xs py-1.5 px-3 font-bold">
          ← Beranda
        </Link>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-16 left-8 hidden lg:block">
        <div className="nb-sticker bg-nb-yellow" style={{ transform: 'rotate(-8deg)' }}>MAIN BARENG! 🎮</div>
      </div>
      <div className="absolute top-24 right-12 hidden lg:block">
        <div className="nb-sticker bg-nb-pink text-white" style={{ transform: 'rotate(5deg)' }}>CUAN INSTAN 💰</div>
      </div>
      <div className="absolute bottom-20 left-16 hidden lg:block">
        <div className="nb-sticker bg-nb-cyan" style={{ transform: 'rotate(3deg)' }}>OBS READY 📺</div>
      </div>

      <div className="w-full max-w-md relative z-10 nb-animate-page mt-8 sm:mt-0">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-14 h-14 bg-nb-yellow border-3 border-nb-black rounded-xl flex items-center justify-center font-heading font-bold text-3xl shadow-nb-md group-hover:translate-y-[-2px] group-hover:shadow-nb-lg transition-all">
              M
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-nb-black uppercase">
              Mabar VIP
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="nb-card-flat bg-nb-cream overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-0">
            <h1 className="font-heading text-2xl font-bold text-nb-black uppercase text-center">
              {mode === 'login' ? 'Masuk ke Dashboard' : 'Daftar Akun Streamer'}
            </h1>
            <p className="text-center text-sm text-nb-gray-500 mt-1">
              {mode === 'login'
                ? 'Kelola katalog mabar, pantau antrean, dan cairkan saldo'
                : 'Buka layanan mabar berbayar dengan URL eksklusif kamu'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 border-3 border-nb-black rounded-xl overflow-hidden shadow-nb-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className={`py-3 text-sm font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-nb-yellow text-nb-black'
                    : 'bg-nb-gray-100 text-nb-gray-500 hover:bg-nb-gray-200'
                }`}
              >
                🔑 Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccess('');
                }}
                className={`py-3 text-sm font-bold uppercase tracking-wide transition-all cursor-pointer border-l-3 border-nb-black ${
                  mode === 'register'
                    ? 'bg-nb-cyan text-nb-black'
                    : 'bg-nb-gray-100 text-nb-gray-500 hover:bg-nb-gray-200'
                }`}
              >
                ✨ Daftar Baru
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-nb-red/10 border-2 border-nb-red rounded-xl text-nb-red text-xs font-semibold flex items-center justify-between shadow-nb-sm">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} className="text-nb-red hover:text-nb-black font-bold text-base cursor-pointer">✕</button>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-nb-lime/20 border-2 border-nb-lime rounded-xl text-nb-gray-700 text-xs font-semibold flex items-center justify-between shadow-nb-sm">
                <span>✅ {success}</span>
                <button onClick={() => setSuccess('')} className="text-nb-gray-600 hover:text-nb-black font-bold text-base cursor-pointer">✕</button>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="star@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="nb-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="nb-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="nb-btn nb-btn-primary w-full text-base"
                >
                  {loading ? '⏳ Memproses...' : 'Masuk ke Dashboard →'}
                </button>

                <div className="pt-2 text-center text-xs text-nb-gray-500">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-nb-purple font-bold underline decoration-2 underline-offset-2 hover:text-nb-pink cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="regDisplayName" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                    Nama Channel Streamer
                  </label>
                  <input
                    id="regDisplayName"
                    type="text"
                    placeholder="Contoh: Jess Gaming"
                    value={regDisplayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    required
                    className="nb-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="regSlug" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                      URL Mabar Kamu
                    </label>
                    <span className="text-[10px] text-nb-purple font-mono font-bold">
                      /{regSlug || 'username'}
                    </span>
                  </div>
                  <input
                    id="regSlug"
                    type="text"
                    placeholder="jess-gaming"
                    value={regSlug}
                    onChange={(e) => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    required
                    className="nb-input font-mono"
                  />
                  <p className="text-[10px] text-nb-gray-400">
                    Link publik: <span className="text-nb-purple font-mono font-bold">mabarvip.com/{regSlug || 'username'}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="regEmail" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                    Email
                  </label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="emailkamu@contoh.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="nb-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="regPassword" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                      Password
                    </label>
                    <input
                      id="regPassword"
                      type="password"
                      placeholder="Min 6 karakter"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="nb-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="regConfirmPassword" className="text-xs font-bold uppercase tracking-wider text-nb-gray-600">
                      Ulangi Password
                    </label>
                    <input
                      id="regConfirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      className="nb-input"
                    />
                  </div>
                </div>

                <div className="p-3 bg-nb-purple/10 border-2 border-nb-purple rounded-xl text-[11px] text-nb-gray-700 font-semibold shadow-nb-sm">
                  ✨ Pendaftaran instan langsung aktif! Kamu otomatis mendapatkan katalog starter & link alert OBS.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="nb-btn nb-btn-secondary w-full text-base"
                >
                  {loading ? '⏳ Mendaftarkan...' : 'Daftar Akun Streamer →'}
                </button>

                <div className="pt-2 text-center text-xs text-nb-gray-500">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-nb-purple font-bold underline decoration-2 underline-offset-2 hover:text-nb-pink cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-nb-gray-400 font-semibold hover:text-nb-purple underline decoration-2 underline-offset-2 decoration-transparent hover:decoration-nb-purple transition-all">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-nb-white nb-dots">
        <div className="nb-card-flat p-8 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <p className="font-heading font-bold uppercase text-nb-gray-500">Memuat...</p>
        </div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
