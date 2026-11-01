import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-nb-white text-nb-black nb-dots relative overflow-hidden">
      {/* ====== NAVBAR ====== */}
      <nav className="nb-navbar relative z-20 flex items-center justify-between max-w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-nb-yellow border-3 border-nb-black rounded-xl flex items-center justify-center font-heading font-bold text-2xl shadow-nb-sm group-hover:translate-y-[-2px] group-hover:shadow-nb-md transition-all">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xl tracking-tight text-nb-black uppercase">
              Mabar VIP
            </span>
            <span className="text-[10px] tracking-widest uppercase text-nb-gray-500 font-semibold">
              Gaming · Streamer · Monetisasi
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/demo-star">
            <button className="nb-btn nb-btn-ghost nb-btn-sm hidden sm:inline-flex">
              Profil Demo
            </button>
          </Link>
          <Link href="/login">
            <button className="nb-btn nb-btn-primary nb-btn-sm">
              Dashboard →
            </button>
          </Link>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-16 lg:pt-20">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Sticker tag */}
            <div className="inline-block">
              <span className="nb-sticker" style={{ transform: 'rotate(-2deg)' }}>
                🎮 Platform #1 untuk Gamer & Streamer
              </span>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] uppercase">
              Main Bareng Fans,{' '}
              <span className="nb-highlight">
                Antrean Rapi
              </span>{' '}
              &{' '}
              <span className="relative inline-block">
                <span className="relative z-10">Cuan Instan.</span>
                <span className="absolute bottom-1 left-0 w-full h-4 bg-nb-pink opacity-40 -z-0" />
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-nb-gray-600 max-w-2xl leading-relaxed font-sans">
              Tinggalkan cara manual transfer & catat antrean di chat live stream. Mabar VIP menyediakan katalog mabar, pembayaran otomatis via QRIS/VA, alokasi nomor antrean real-time, dan alert pop-up interaktif langsung di layar OBS.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <Link href="/demo-star">
                <button className="nb-btn nb-btn-primary nb-btn-xl w-full sm:w-auto">
                  Coba Alur Checkout Guest →
                </button>
              </Link>
              <Link href="/login">
                <button className="nb-btn nb-btn-ghost nb-btn-lg w-full sm:w-auto">
                  Kelola Dashboard
                </button>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-sm text-nb-gray-500 font-semibold">
              <div className="flex items-center gap-2">
                <span className="nb-badge bg-nb-lime" style={{ padding: '2px 8px', fontSize: '10px' }}>✓</span>
                Tanpa Registrasi
              </div>
              <div className="flex items-center gap-2">
                <span className="nb-badge bg-nb-cyan" style={{ padding: '2px 8px', fontSize: '10px' }}>✓</span>
                Anti-Spam
              </div>
              <div className="flex items-center gap-2">
                <span className="nb-badge bg-nb-purple text-white" style={{ padding: '2px 8px', fontSize: '10px' }}>✓</span>
                OBS Ready
              </div>
            </div>
          </div>

          {/* Right: Mockup Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              {/* Decorative floating stickers */}
              <div className="absolute -top-6 -right-4 z-20 nb-sticker bg-nb-pink text-white" style={{ transform: 'rotate(5deg)' }}>
                LIVE 🔴
              </div>
              <div className="absolute -bottom-4 -left-4 z-20 nb-sticker bg-nb-cyan" style={{ transform: 'rotate(-4deg)' }}>
                REALTIME ⚡
              </div>

              {/* Main preview card */}
              <div className="nb-card-flat p-0 overflow-hidden nb-animate-float" style={{ animationDuration: '6s' }}>
                {/* Card header */}
                <div className="px-6 py-4 border-b-3 border-nb-black flex items-center justify-between bg-nb-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-nb-purple border-2 border-nb-black shadow-nb-sm flex items-center justify-center font-bold text-white text-sm">
                      DS
                    </div>
                    <div>
                      <div className="font-heading font-bold text-sm text-nb-black">Demo Streamer</div>
                      <div className="text-xs text-nb-gray-500 font-semibold">Sedang Live di YouTube</div>
                    </div>
                  </div>
                  <span className="nb-badge bg-nb-red text-white text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-white nb-animate-pulse inline-block mr-1" />
                    LIVE
                  </span>
                </div>

                {/* Card body */}
                <div className="p-6 space-y-4 bg-nb-cream">
                  {/* Alert preview - Explicit bright yellow background with sharp dark text */}
                  <div className="p-4 rounded-2xl bg-nb-yellow border-3 border-nb-black shadow-nb-sm text-left">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-heading font-black uppercase tracking-wider text-[#1A1A2E]">
                        OBS Alert Pop-up
                      </span>
                      <span className="nb-badge bg-nb-purple text-white text-[10px] font-mono font-bold" style={{ padding: '2px 8px', boxShadow: 'none' }}>
                        Antrean #04
                      </span>
                    </div>
                    <div className="font-black text-[#1A1A2E] text-base leading-snug">
                      Fakhriadi baru saja join Mabar Valorant!
                    </div>
                    <p className="text-xs font-bold text-[#2D2D28] mt-1">
                      &ldquo;Gaskeun bang, pick Reyna ya!&rdquo;
                    </p>
                  </div>

                  {/* Queue snapshot */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider flex justify-between">
                      <span className="text-nb-black">Antrean Saat Ini</span>
                      <span className="text-nb-purple font-mono font-bold">3 Pemain</span>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="p-2.5 rounded-xl bg-nb-white border-2 border-nb-black shadow-nb-sm flex items-center justify-between">
                        <span className="text-nb-black font-bold">#01 Rizky</span>
                        <span className="nb-badge bg-nb-cyan text-[10px] font-bold" style={{ padding: '2px 8px', boxShadow: 'none' }}>Sedang Main</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-nb-white border-2 border-nb-black shadow-nb-sm flex items-center justify-between">
                        <span className="text-nb-black font-bold">#02 Arya</span>
                        <span className="nb-badge bg-nb-blue text-white text-[10px] font-bold" style={{ padding: '2px 8px', boxShadow: 'none' }}>Dipanggil</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-nb-white border-2 border-nb-black shadow-nb-sm flex items-center justify-between">
                        <span className="text-nb-black font-bold">#03 Brandon</span>
                        <span className="nb-badge bg-nb-yellow text-[10px] font-bold" style={{ padding: '2px 8px', boxShadow: 'none' }}>Menunggu</span>
                      </div>
                    </div>
                  </div>

                  <Link href="/demo-star/antrian" className="block">
                    <button className="nb-btn nb-btn-ghost nb-btn-sm w-full text-xs font-bold">
                      Lihat Antrean Publik Realtime →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== MARQUEE BANNER ====== */}
        <div className="mt-20 -mx-6 nb-marquee">
          <div className="nb-marquee-content">
            <span>★ Katalog Fleksibel</span>
            <span>★ Pembayaran Otomatis</span>
            <span>★ Antrean Real-Time</span>
            <span>★ OBS Overlay Alert</span>
            <span>★ Anti Double Queue</span>
            <span>★ QRIS & VA Ready</span>
            <span>★ Katalog Fleksibel</span>
            <span>★ Pembayaran Otomatis</span>
            <span>★ Antrean Real-Time</span>
            <span>★ OBS Overlay Alert</span>
            <span>★ Anti Double Queue</span>
            <span>★ QRIS & VA Ready</span>
          </div>
        </div>

        {/* ====== FEATURE GRID ====== */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          <div className="nb-card p-8 space-y-4">
            <div className="nb-icon-box bg-nb-yellow">
              🎯
            </div>
            <h3 className="font-heading text-xl font-bold text-nb-black uppercase">Katalog Fleksibel & Dinamis</h3>
            <div className="nb-zigzag" style={{ margin: '12px 0' }} />
            <p className="text-sm text-nb-gray-600 leading-relaxed">
              Atur harga game per match atau paket. Tambahkan field khusus seperti Nickname, Riot ID, Rank, atau catatan tanpa perlu setup rumit.
            </p>
          </div>

          <div className="nb-card p-8 space-y-4" style={{ borderColor: 'var(--color-nb-pink)' }}>
            <div className="nb-icon-box bg-nb-pink text-white">
              ⚡
            </div>
            <h3 className="font-heading text-xl font-bold text-nb-black uppercase">Alokasi Antrean Atomik</h3>
            <div className="nb-zigzag" style={{ margin: '12px 0' }} />
            <p className="text-sm text-nb-gray-600 leading-relaxed">
              Didukung PostgreSQL atomic sequence. Dijamin tidak ada nomor antrean ganda meski puluhan penonton checkout di detik yang sama.
            </p>
          </div>

          <div className="nb-card p-8 space-y-4" style={{ borderColor: 'var(--color-nb-cyan)' }}>
            <div className="nb-icon-box bg-nb-cyan">
              📺
            </div>
            <h3 className="font-heading text-xl font-bold text-nb-black uppercase">OBS Overlay Tanpa Lag</h3>
            <div className="nb-zigzag" style={{ margin: '12px 0' }} />
            <p className="text-sm text-nb-gray-600 leading-relaxed">
              Cukup tempel URL Browser Source ke OBS. Alert pop-up muncul otomatis dengan audio chime dan animasi mulus saat order terverifikasi.
            </p>
          </div>
        </div>

        {/* ====== HOW IT WORKS ====== */}
        <div className="mt-24 text-center">
          <div className="inline-block mb-8">
            <span className="nb-sticker bg-nb-cyan" style={{ transform: 'rotate(-1deg)', fontSize: '16px', padding: '8px 24px' }}>
              CARA KERJA
            </span>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '01', icon: '🎯', title: 'Buat Katalog', desc: 'Star bikin daftar layanan mabar dengan harga & deskripsi' },
              { step: '02', icon: '💳', title: 'Guest Checkout', desc: 'Fans pilih katalog, isi data, bayar via QRIS/VA/e-wallet' },
              { step: '03', icon: '🔔', title: 'Alert Masuk', desc: 'Notifikasi pop-up langsung muncul di OBS overlay Star' },
              { step: '04', icon: '🎮', title: 'Main Bareng!', desc: 'Star panggil fans sesuai nomor antrean, mulai mabar!' },
            ].map((item) => (
              <div key={item.step} className="nb-card-flat p-6 space-y-3 text-center relative">
                <div className="absolute -top-3 -left-2">
                  <span className="font-mono font-bold text-3xl text-nb-purple">{item.step}</span>
                </div>
                <div className="text-4xl mt-2">{item.icon}</div>
                <h4 className="font-heading font-bold text-base uppercase">{item.title}</h4>
                <p className="text-xs text-nb-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ====== FOOTER ====== */}
      <footer className="relative z-10 border-t-3 border-nb-black bg-nb-cream px-6 py-8 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-nb-gray-500">
          <p className="font-semibold">© 2026 Mabar VIP Platform. Terintegrasi dengan Duitku & Supabase Realtime.</p>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/login" className="hover:text-nb-purple transition-colors underline decoration-2 underline-offset-4 decoration-transparent hover:decoration-nb-purple">
              Login Streamer
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Theme Toggle (always visible on screen) */}
      <div className="fixed bottom-6 right-6 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
