# PRD Desain — Neo-Brutalism Design System

**Produk:** Mabar VIP — Platform Main Bareng Berbayar  
**Versi Desain:** 2.0 (Neo-Brutalism Overhaul)  
**Tanggal:** 16 Oktober 2026  
**Status:** Final — Siap Implementasi  
**Stack:** Next.js App Router + Tailwind CSS + shadcn/ui (re-skinned)

---

## 1. Filosofi Desain: Neo-Brutalism

### 1.1 Apa itu Neo-Brutalism?

Neo-Brutalism (disebut juga "New Brutalism" atau "Neo-Brutal") adalah evolusi modern dari desain Brutalis yang menggabungkan:

- **Border tebal & tajam** — Garis outline hitam pekat (2-4px) yang memberi kesan "kartun" dan tegas
- **Shadow solid offset** — Drop shadow bukan blur, melainkan solid box-shadow yang tergeser (4-8px) menciptakan ilusi 3D "tempel stiker"
- **Warna-warna cerah & berani** — Palet warna primer yang kontras tinggi: kuning elektrik, pink panas, cyan neon, hijau lime, ungu terang
- **Background off-white / krem** — Bukan putih steril, tapi hangat dan sedikit "kertas"
- **Tipografi bold & oversized** — Font heading tebal, besar, dan kadang quirky
- **Bentuk geometris mentah** — Tidak ada gradien halus atau glassmorphism; langsung, jujur, dan raw
- **Micro-interactions yang playful** — Hover effects yang terasa "menekan tombol fisik"

### 1.2 Mengapa Neo-Brutalism untuk Mabar VIP?

| Aspek | Alasan |
|-------|--------|
| **Target Audience** | Gamer muda (16-30 tahun) yang menyukai estetika bold dan unik |
| **Diferensiasi** | Sangat berbeda dari platform gaming lain yang biasanya pakai dark glassmorphism |
| **Playfulness** | Cocok dengan konsep "main bareng" yang fun dan kasual |
| **Readability** | Kontras tinggi = mudah dibaca saat di-stream/screen share |
| **Memorability** | Desain yang distinctive dan memorable |

---

## 2. Palet Warna

### 2.1 Warna Primer

| Token | Nama | Hex | Penggunaan |
|-------|------|-----|------------|
| `--nb-black` | Ink Black | `#1A1A2E` | Border, teks utama, shadow |
| `--nb-white` | Paper White | `#FFFEF2` | Background utama |
| `--nb-cream` | Warm Cream | `#FFF8E7` | Background sekunder / card |

### 2.2 Warna Aksen (The "Punchy" Colors)

| Token | Nama | Hex | Preview | Penggunaan Utama |
|-------|------|-----|---------|-----------------|
| `--nb-yellow` | Electric Yellow | `#FFE66D` | 🟡 | Primary CTA, highlight utama, badge "live" |
| `--nb-pink` | Hot Pink | `#FF6B9D` | 🩷 | Secondary CTA, notifikasi, alert |
| `--nb-cyan` | Neon Cyan | `#4ECDC4` | 🩵 | Status sukses, link aktif, antrean aktif |
| `--nb-purple` | Vivid Purple | `#A855F7` | 🟣 | Branding star, premium badge |
| `--nb-orange` | Tangerine | `#FF8A5C` | 🟠 | Warning, harga, earning |
| `--nb-lime` | Acid Lime | `#C5E84D` | 🟢 | Status online, success indicator |
| `--nb-blue` | Electric Blue | `#5B7FFF` | 🔵 | Info, link, overlay setting |
| `--nb-red` | Danger Red | `#FF4757` | 🔴 | Error, destructive action, offline |

### 2.3 Warna Neutral

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--nb-gray-100` | `#F5F5F0` | Background muted |
| `--nb-gray-200` | `#E8E8E0` | Border ringan, divider |
| `--nb-gray-300` | `#D4D4CC` | Disabled state |
| `--nb-gray-400` | `#A0A098` | Placeholder text |
| `--nb-gray-500` | `#6B6B63` | Secondary text |
| `--nb-gray-600` | `#4A4A44` | Body text |
| `--nb-gray-700` | `#2D2D28` | Heading text |

### 2.4 Dark Mode (Inverted Neo-Brutal)

> **Catatan:** Dark mode tetap mempertahankan esensi Neo-Brutalism: border tebal & shadow solid, tapi dengan base gelap.

| Token | Light | Dark |
|-------|-------|------|
| Background | `#FFFEF2` | `#1A1A2E` |
| Card | `#FFF8E7` | `#16213E` |
| Border | `#1A1A2E` | `#FFFEF2` |
| Shadow | `#1A1A2E` | `#0F0F1A` |
| Teks Utama | `#1A1A2E` | `#FFFEF2` |
| Teks Sekunder | `#6B6B63` | `#A0A098` |
| Aksen warna | Sama | Sama (sedikit lebih saturated) |

---

## 3. Tipografi

### 3.1 Font Stack

```
Heading:  "Space Grotesk", sans-serif   → Bold, geometric, modern
Body:     "Inter", sans-serif            → Clean, readable, versatile
Mono:     "JetBrains Mono", monospace    → Kode, nomor antrean, harga
```

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

### 3.2 Skala Tipografi

| Level | Font | Size | Weight | Line Height | Penggunaan |
|-------|------|------|--------|-------------|------------|
| Display | Space Grotesk | 72px / 4.5rem | 700 | 1.0 | Hero headline |
| H1 | Space Grotesk | 48px / 3rem | 700 | 1.1 | Judul halaman |
| H2 | Space Grotesk | 36px / 2.25rem | 700 | 1.15 | Judul section |
| H3 | Space Grotesk | 24px / 1.5rem | 600 | 1.2 | Sub-section |
| H4 | Space Grotesk | 20px / 1.25rem | 600 | 1.3 | Card heading |
| Body Large | Inter | 18px / 1.125rem | 400 | 1.6 | Paragraf utama |
| Body | Inter | 16px / 1rem | 400 | 1.5 | Body text |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | Secondary info |
| Caption | Inter | 12px / 0.75rem | 500 | 1.4 | Label, meta |
| Mono | JetBrains Mono | 14px | 500 | 1.4 | Harga, nomor antrean |

### 3.3 Aturan Tipografi

- **Heading SELALU uppercase** untuk H1 dan Display
- **Letter spacing**: Heading = `-0.02em`, Body = `0`, Uppercase = `0.05em`
- **Tidak ada italic** kecuali untuk quote/testimonial
- **Underline tebal** (3px) untuk link hover, bukan opacity change

---

## 4. Sistem Border & Shadow

### 4.1 Border

```css
/* Border Tokens */
--nb-border-thin:   2px solid var(--nb-black);
--nb-border-medium: 3px solid var(--nb-black);
--nb-border-thick:  4px solid var(--nb-black);

/* Radius — Neo-Brutalism menggunakan sedikit radius, BUKAN sharp 0px */
--nb-radius-sm:  8px;    /* Badge, tag */
--nb-radius-md:  12px;   /* Button, input */
--nb-radius-lg:  16px;   /* Card */
--nb-radius-xl:  20px;   /* Modal, section */
--nb-radius-full: 9999px; /* Avatar, pill badge */
```

> **Penting:** Neo-Brutalism BUKAN flat/boxy total. Gunakan radius kecil-sedang (8-20px) untuk kesan modern tapi tetap tegas.

### 4.2 Shadow (Solid Offset — SIGNATURE ELEMENT)

```css
/* Shadow Tokens — INI YANG MEMBUAT NEO-BRUTALISM BERBEDA */
--nb-shadow-sm:   3px 3px 0px var(--nb-black);
--nb-shadow-md:   5px 5px 0px var(--nb-black);
--nb-shadow-lg:   8px 8px 0px var(--nb-black);
--nb-shadow-xl:   12px 12px 0px var(--nb-black);

/* Colored shadows (untuk komponen spesifik) */
--nb-shadow-yellow: 5px 5px 0px var(--nb-yellow);
--nb-shadow-pink:   5px 5px 0px var(--nb-pink);
--nb-shadow-cyan:   5px 5px 0px var(--nb-cyan);

/* Hover shadow — menyusut saat ditekan */
--nb-shadow-hover: 2px 2px 0px var(--nb-black);
--nb-shadow-active: 1px 1px 0px var(--nb-black);
```

### 4.3 Aturan Shadow

1. **Setiap card, button, dan input WAJIB punya solid shadow**
2. Shadow SELALU ke arah kanan-bawah (positive x, positive y)
3. Blur radius SELALU `0px` (solid, bukan soft)
4. Pada hover → shadow mengecil + komponen translate ke arah shadow (efek "tekan")
5. Pada active/click → shadow hampir hilang + komponen translate penuh

---

## 5. Komponen UI

### 5.1 Button

```
┌─────────────────────────────────┐
│                                 │ ← 3px border hitam
│     BELI SEKARANG — Rp 25K     │ ← Font: Inter Bold, 14-16px
│                                 │
└─────────────────────────────────┘
  ████████████████████████████████  ← 5px solid shadow offset
```

**Variants:**

| Variant | Background | Text | Border | Shadow | Penggunaan |
|---------|-----------|------|--------|--------|------------|
| **Primary** | `--nb-yellow` | `--nb-black` | `--nb-border-medium` | `--nb-shadow-md` | CTA utama |
| **Secondary** | `--nb-cyan` | `--nb-black` | `--nb-border-medium` | `--nb-shadow-md` | CTA sekunder |
| **Danger** | `--nb-red` | `--nb-white` | `--nb-border-medium` | `--nb-shadow-md` | Hapus, batal |
| **Ghost** | `transparent` | `--nb-black` | `--nb-border-thin` | `--nb-shadow-sm` | Aksi minor |
| **Pink** | `--nb-pink` | `--nb-white` | `--nb-border-medium` | `--nb-shadow-md` | Notifikasi CTA |

**Hover & Active States:**

```css
.nb-button {
  transition: all 0.1s ease;
}
.nb-button:hover {
  transform: translate(2px, 2px);
  box-shadow: 3px 3px 0px var(--nb-black); /* shadow mengecil */
}
.nb-button:active {
  transform: translate(4px, 4px);
  box-shadow: 1px 1px 0px var(--nb-black); /* shadow hampir hilang */
}
```

**Sizing:**

| Size | Padding | Font Size | Min Height |
|------|---------|-----------|------------|
| Small | `8px 16px` | 13px | 36px |
| Medium | `12px 24px` | 15px | 44px |
| Large | `16px 32px` | 17px | 52px |
| XL | `20px 40px` | 19px | 60px |

### 5.2 Card

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │
│  │     [IMAGE / ILLUSTRATION]   │    │ ← Image area (optional)
│  └──────────────────────────────┘    │
│                                      │
│  KATALOG: VALORANT RANK PUSH         │ ← H4, uppercase
│  ─────────────────────────────────   │ ← Divider 2px
│  Main bareng push rank bareng pro    │ ← Body text
│  player dari Immortal ke Radiant.    │
│                                      │
│  ┌─────────┐  ┌──────────────────┐   │
│  │ Rp 50K  │  │ PESAN SEKARANG → │   │ ← Mono price + CTA button
│  └─────────┘  └──────────────────┘   │
│                ████████████████████   │
└──────────────────────────────────────┘
  ██████████████████████████████████████  ← Solid shadow
```

**Card Tokens:**
```css
.nb-card {
  background: var(--nb-cream);
  border: 3px solid var(--nb-black);
  border-radius: var(--nb-radius-lg);
  box-shadow: var(--nb-shadow-md);
  padding: 24px;
  transition: all 0.15s ease;
}
.nb-card:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--nb-shadow-hover);
}
```

**Card Variants:**

| Variant | Background | Accent | Penggunaan |
|---------|-----------|--------|------------|
| Default | `--nb-cream` | none | Card umum |
| Highlighted | `--nb-yellow` | none | Featured katalog |
| Pink | `--nb-pink` (light tint) | `--nb-pink` border top 6px | Notifikasi baru |
| Cyan | `--nb-cyan` (light tint) | `--nb-cyan` border left 6px | Status aktif |
| Purple | `--nb-purple` (light tint) | `--nb-purple` | Star profile card |

### 5.3 Input & Form Fields

```
  NAMA IN-GAME
  ┌──────────────────────────────────┐
  │  Masukkan Riot ID kamu...        │ ← Placeholder
  └──────────────────────────────────┘
    ██████████████████████████████████  ← Shadow
```

```css
.nb-input {
  background: var(--nb-white);
  border: 2px solid var(--nb-black);
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-sm);
  padding: 12px 16px;
  font-family: Inter, sans-serif;
  font-size: 15px;
  transition: all 0.15s ease;
}
.nb-input:focus {
  box-shadow: var(--nb-shadow-md);
  border-color: var(--nb-cyan);
  outline: none;
  transform: translate(-1px, -1px); /* sedikit "angkat" */
}
.nb-input::placeholder {
  color: var(--nb-gray-400);
}
```

**Label:** Inter 13px, font-weight 600, uppercase, letter-spacing 0.05em, margin-bottom 6px

### 5.4 Badge & Tag

```css
.nb-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 2px solid var(--nb-black);
  border-radius: var(--nb-radius-full);
  font-family: Inter, sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 2px 2px 0px var(--nb-black);
}
```

| Variant | Background | Penggunaan |
|---------|-----------|------------|
| Live | `--nb-red` + animasi pulse | Star sedang live |
| Menunggu | `--nb-yellow` | Status antrean waiting |
| Dipanggil | `--nb-blue` | Status invited |
| Sedang Main | `--nb-cyan` | Status in_room |
| Selesai | `--nb-lime` | Status completed |
| Baru | `--nb-pink` | Notifikasi baru |
| Premium | `--nb-purple` | Badge premium |

### 5.5 Navigation Bar (Top — Public Pages)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [M] MABAR VIP              Profil Demo   [DASHBOARD →]     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
  ████████████████████████████████████████████████████████████  ← Shadow bawah 4px
```

```css
.nb-navbar {
  background: var(--nb-white);
  border-bottom: 3px solid var(--nb-black);
  box-shadow: 0 4px 0px var(--nb-black);
  padding: 0 24px;
  height: 72px;
}
```

- Logo: "M" dalam kotak berwarna `--nb-yellow` dengan border hitam + shadow
- Nama brand: Space Grotesk Bold, uppercase
- Nav links: Inter Semi-Bold, hover → underline tebal 3px warna `--nb-cyan`
- CTA button: Primary button style (kuning + shadow)

### 5.6 Sidebar Navigation (Admin & Dashboard)

```
┌────────────────────┐
│                    │
│  [Avatar]          │
│  STAR NAME         │  ← Space Grotesk Bold
│  @slug             │  ← Caption, cyan
│                    │
│  ════════════════  │  ← Divider 2px
│                    │
│  ■ Ringkasan       │  ← Active: bg yellow, shadow
│  □ Katalog         │
│  □ Antrean         │
│  □ Notifikasi      │
│  □ Overlay         │
│  □ Rekening        │
│                    │
│  ════════════════  │
│                    │
│  [LOGOUT]          │  ← Danger ghost button
│                    │
└────────────────────┘
████████████████████████  ← Shadow kanan 4px
```

```css
.nb-sidebar {
  width: 260px;
  background: var(--nb-cream);
  border-right: 3px solid var(--nb-black);
  box-shadow: 4px 0 0px var(--nb-black);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}

.nb-sidebar-item {
  padding: 10px 16px;
  border-radius: var(--nb-radius-md);
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.1s ease;
  border: 2px solid transparent;
}
.nb-sidebar-item:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-black);
}
.nb-sidebar-item.active {
  background: var(--nb-yellow);
  border: 2px solid var(--nb-black);
  box-shadow: var(--nb-shadow-sm);
}
```

### 5.7 Table

```
┌──────┬──────────────┬────────────┬────────────┬──────────┐
│  #   │  PELANGGAN   │  KATALOG   │   TOTAL    │  STATUS  │ ← Header row (bg: --nb-black, text: --nb-white)
├──────┼──────────────┼────────────┼────────────┼──────────┤
│  01  │  Rizky       │  Valorant  │  Rp 50K    │ [Paid]   │ ← Row striped (cream / white)
├──────┼──────────────┼────────────┼────────────┼──────────┤
│  02  │  Arya        │  MLBB      │  Rp 35K    │ [Pending]│
└──────┴──────────────┴────────────┴────────────┴──────────┘
  ████████████████████████████████████████████████████████████
```

```css
.nb-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 3px solid var(--nb-black);
  border-radius: var(--nb-radius-lg);
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
}
.nb-table thead {
  background: var(--nb-black);
  color: var(--nb-white);
}
.nb-table th {
  padding: 14px 16px;
  text-align: left;
  font-family: Inter, sans-serif;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.nb-table td {
  padding: 14px 16px;
  border-top: 2px solid var(--nb-black);
  font-size: 14px;
}
.nb-table tbody tr:nth-child(even) {
  background: var(--nb-gray-100);
}
.nb-table tbody tr:hover {
  background: var(--nb-yellow);
  transition: background 0.1s ease;
}
```

### 5.8 Modal / Dialog

```
╔══════════════════════════════════════════╗
║                                          ║ ← Border 4px hitam
║  KONFIRMASI PEMBAYARAN                   ║ ← H3, uppercase
║  ═══════════════════════════════════════  ║
║                                          ║
║  Apakah kamu yakin ingin melanjutkan     ║
║  pembayaran sebesar Rp 50.000?           ║
║                                          ║
║  ┌──────────┐  ┌────────────────────┐    ║
║  │  BATAL   │  │  YA, BAYAR →       │    ║
║  └──────────┘  └────────────────────┘    ║
║                  ████████████████████    ║
║                                          ║
╚══════════════════════════════════════════╝
  ████████████████████████████████████████████
```

- Background: `--nb-white`
- Border: 4px solid `--nb-black`
- Shadow: `--nb-shadow-xl` (12px 12px)
- Overlay/backdrop: `rgba(26, 26, 46, 0.6)` + `backdrop-filter: blur(4px)`
- Border-radius: `--nb-radius-xl`

### 5.9 Toast / Alert Notification

```
  ┌─────────────────────────────────────┐
  │  ✓  Pembayaran berhasil diterima!   │ ← bg: --nb-lime, border hitam
  └─────────────────────────────────────┘
    █████████████████████████████████████
```

| Type | Background | Icon | Border Accent |
|------|-----------|------|---------------|
| Success | `--nb-lime` | ✓ | `--nb-black` |
| Error | `--nb-red` | ✕ | `--nb-black` |
| Warning | `--nb-orange` | ⚠ | `--nb-black` |
| Info | `--nb-blue` | ℹ | `--nb-black` |

### 5.10 Avatar

```css
.nb-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--nb-radius-full);
  border: 3px solid var(--nb-black);
  box-shadow: var(--nb-shadow-sm);
  object-fit: cover;
}
.nb-avatar-lg {
  width: 80px;
  height: 80px;
  border: 4px solid var(--nb-black);
  box-shadow: var(--nb-shadow-md);
}
```

---

## 6. Layout & Grid

### 6.1 Container

```css
.nb-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .nb-container {
    padding: 0 16px;
  }
}
```

### 6.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR (72px, full width)                          │
├────────────┬────────────────────────────────────────┤
│            │                                        │
│  SIDEBAR   │              MAIN CONTENT              │
│  (260px)   │         (flex-1, scrollable)           │
│            │                                        │
│  Sticky    │  ┌────────────────────────────────┐    │
│  left      │  │  Page Content Cards, Tables    │    │
│            │  └────────────────────────────────┘    │
│            │    ████████████████████████████████    │
│            │                                        │
│            │                                        │
├────────────┴────────────────────────────────────────┤
```

```css
.nb-dashboard-layout {
  display: flex;
  min-height: 100vh;
}
.nb-dashboard-main {
  flex: 1;
  padding: 32px;
  background: var(--nb-white);
  overflow-y: auto;
}
```

### 6.3 Public Page Layout

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR (full width)                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│                  HERO SECTION                       │
│              (centered, max-w-3xl)                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│     │CARD 1│  │CARD 2│  │CARD 3│  │CARD 4│        │
│     └──────┘  └──────┘  └──────┘  └──────┘        │
│       ██████    ██████    ██████    ██████          │
│                                                     │
│     Grid: 1 col mobile, 2 col tablet, 3-4 col desktop│
├─────────────────────────────────────────────────────┤
│  FOOTER                                             │
└─────────────────────────────────────────────────────┘
```

### 6.4 Spacing Scale

| Token | Value | Penggunaan |
|-------|-------|------------|
| `--nb-space-1` | 4px | Micro gap |
| `--nb-space-2` | 8px | Badge padding, tight gap |
| `--nb-space-3` | 12px | Input padding, between related items |
| `--nb-space-4` | 16px | Card padding (compact), nav items |
| `--nb-space-5` | 20px | - |
| `--nb-space-6` | 24px | Card padding (default), section gap |
| `--nb-space-8` | 32px | Section padding, main content padding |
| `--nb-space-10` | 40px | Large section gap |
| `--nb-space-12` | 48px | Hero padding |
| `--nb-space-16` | 64px | Between major sections |
| `--nb-space-20` | 80px | Hero top padding |

---

## 7. Animasi & Micro-Interactions

### 7.1 Prinsip Animasi

1. **Cepat & snappy** — Duration 100-200ms, ease-out
2. **Efek "tombol fisik"** — Transform translate + shadow shrink
3. **Tidak ada animasi tanpa tujuan** — Setiap animasi harus memberi feedback
4. **Reduce motion respected** — `prefers-reduced-motion: reduce` harus diimplementasi

### 7.2 Transition Tokens

```css
--nb-transition-fast:    all 0.1s ease;
--nb-transition-normal:  all 0.15s ease;
--nb-transition-slow:    all 0.25s ease-out;
--nb-transition-bounce:  all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 7.3 Animasi Spesifik

#### Button Press Effect
```css
.nb-button:hover {
  transform: translate(2px, 2px);
  box-shadow: 3px 3px 0px var(--nb-black);
}
.nb-button:active {
  transform: translate(4px, 4px);
  box-shadow: 1px 1px 0px var(--nb-black);
}
```

#### Card Hover Lift
```css
.nb-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0px var(--nb-black);
}
```

#### Notification Slide-In
```css
@keyframes nb-slide-in-right {
  from {
    transform: translateX(100%) rotate(3deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
}
.nb-notification-enter {
  animation: nb-slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### Badge Bounce
```css
@keyframes nb-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.nb-badge-new {
  animation: nb-bounce 0.6s ease-in-out 3; /* bounce 3 kali */
}
```

#### Live Pulse (untuk badge LIVE)
```css
@keyframes nb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.nb-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--nb-red);
  animation: nb-pulse 1.5s ease-in-out infinite;
}
```

#### Page Transition
```css
@keyframes nb-page-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.nb-page {
  animation: nb-page-in 0.25s ease-out;
}
```

#### OBS Overlay Alert Animation
```css
@keyframes nb-alert-drop {
  0% {
    transform: translateY(-120%) rotate(-5deg) scale(0.9);
    opacity: 0;
  }
  60% {
    transform: translateY(8px) rotate(1deg) scale(1.02);
    opacity: 1;
  }
  80% {
    transform: translateY(-3px) rotate(-0.5deg) scale(1);
  }
  100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
}
@keyframes nb-alert-exit {
  to {
    transform: translateY(-120%) rotate(5deg) scale(0.9);
    opacity: 0;
  }
}
```

---

## 8. Desain Per Halaman

### 8.1 Landing Page (`/`)

**Hero Section:**
- Background: `--nb-white` dengan pattern dots (`--nb-gray-200`) — grid dot 20px spacing
- Headline: Display size, "MAIN BARENG FANS," + aksen warna `--nb-yellow` highlight box
- Sub-text: Body Large, `--nb-gray-600`
- CTA: 2 button — Primary (kuning) + Ghost (outlined)
- Mockup card: Card besar dengan antrean preview, border 4px, shadow 8px

**Feature Grid (3 kolom):**
- Setiap card: ikon besar (emoji dalam kotak berwarna) + heading + deskripsi
- Card warna-warni: Card 1 = aksen kuning, Card 2 = aksen pink, Card 3 = aksen cyan
- Hover: card "terangkat" (shadow membesar)

**Dot Pattern Background:**
```css
.nb-dot-pattern {
  background-image: radial-gradient(var(--nb-gray-200) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
}
```

### 8.2 Login & Register (`/login`)

**Layout:** Centered card (max-width: 440px) di atas background dot pattern

```
     ┌────────────────────────────────────┐
     │                                    │
     │  [M] MABAR VIP                     │
     │                                    │
     │  ┌──────────┬──────────┐           │  ← Tab switcher (border hitam)
     │  │  MASUK   │ DAFTAR   │           │
     │  └──────────┴──────────┘           │
     │                                    │
     │  EMAIL                             │
     │  ┌────────────────────────────┐    │
     │  │  email@contoh.com         │    │
     │  └────────────────────────────┘    │
     │    ████████████████████████████    │
     │                                    │
     │  PASSWORD                          │
     │  ┌────────────────────────────┐    │
     │  │  ••••••••                 │    │
     │  └────────────────────────────┘    │
     │    ████████████████████████████    │
     │                                    │
     │  ┌────────────────────────────┐    │
     │  │      MASUK SEKARANG →     │    │
     │  └────────────────────────────┘    │
     │    ████████████████████████████    │
     │                                    │
     └────────────────────────────────────┘
       ████████████████████████████████████
```

- Tab switcher: 2 tab, active tab = `--nb-yellow` bg + border hitam, inactive = `--nb-gray-100`
- Form validation error: border merah + label error text merah + icon ✕

### 8.3 Profil Publik Star (`/[starSlug]`)

**Header Area:**
```
┌──────────────────────────────────────────────┐
│                                              │
│  [AVATAR 80px]  DEMO STREAMER               │
│                 @demo-star    [● LIVE]       │
│                                              │
│  Main bareng dengan streamer favorit kamu!   │
│                                              │
└──────────────────────────────────────────────┘
  ████████████████████████████████████████████████
```

- Background: `--nb-purple` (light tint) atau warna custom star
- Avatar: `nb-avatar-lg` dengan border warna aksen
- Badge LIVE: animasi pulse

**Katalog Grid:**
- Grid 2 kolom (desktop), 1 kolom (mobile)
- Setiap card: gambar cover, judul katalog, harga (mono font), status badge, CTA button
- Card aktif: border warna + shadow colored
- Card nonaktif: grayscale + opacity 0.6

### 8.4 Dashboard Star (`/dashboard`)

**Sidebar (left, 260px):**
Menu items:
1. 📊 Ringkasan (overview stats)
2. 📦 Katalog (CRUD)
3. 👥 Antrean (per katalog)
4. 🔔 Notifikasi
5. 📺 Overlay (OBS settings)
6. 🏦 Rekening (bank account & payouts)

**Ringkasan Page:**
- Grid stat cards (2x2 desktop, 1 col mobile):
  - Total Pendapatan Bulan Ini (kotor) — bg: `--nb-orange` tint
  - Total Pendapatan Bersih — bg: `--nb-lime` tint
  - Total Order Bulan Ini — bg: `--nb-cyan` tint
  - Saldo Belum Ditarik — bg: `--nb-yellow` tint
- Stat card: angka besar (JetBrains Mono Bold 32px), label kecil uppercase

**Katalog Page:**
- Daftar card katalog dalam grid
- Setiap card: thumbnail, nama, harga, status toggle, action buttons (edit, hapus)
- Form create/edit: modal atau page baru
- Upload gambar: drag & drop area dengan border dashed 3px + bg dotted

**Antrean Page:**
- Dropdown filter: pilih katalog
- Table antrean: nomor, nama, status badge (color-coded), timestamp, action buttons
- Status flow buttons: Menunggu → Dipanggil → Sedang Main → Selesai
- Setiap status change = button klik dengan warna sesuai

**Notifikasi Page:**
- List items dengan border-left 4px warna aksen
- Notifikasi baru: bg `--nb-pink` tint + badge "BARU"
- Notifikasi dibaca: bg `--nb-gray-100`
- Klik = expand detail

**Overlay Page:**
- Preview kotak OBS overlay (rasio 16:9) dengan border hitam
- URL token field (readonly, dengan tombol copy + regenerate)
- Settings: toggle show/hide fields, slider durasi, pilih suara alert
- Test alert button: `--nb-pink` bg

**Rekening Page:**
- Form input rekening (nama bank, nomor rekening, nama pemilik)
- Info box (bg: `--nb-blue` tint):
  - "Penarikan hanya bisa dilakukan setiap hari Jum'at"
  - "Dana cair di hari Senin"
- Tabel riwayat penarikan
- Summary card: Pendapatan Bersih (setelah pajak & potongan)

### 8.5 Admin Dashboard (`/admin`)

**Sidebar (left, 280px):**
Menu items:
1. 📊 Dashboard Overview
2. 👤 Manajemen Star
3. 💳 Transaksi (filterable per star)
4. ⭐ Ringkasan Star (earnings per star)
5. 🏦 Payment Gateway
6. 💰 Pajak & Potongan
7. 📋 Audit Log
8. ⚙️ Pengaturan

**Dashboard Overview:**
- Stat cards: Total Revenue, Active Stars, Orders Today, Pending Payouts
- Quick charts (simple bar/line) dengan border hitam

**Manajemen Star:**
- Table: Nama, Email, Status (active/inactive toggle), Total Earnings, Action
- Add/Edit Star modal

**Transaksi:**
- Filter dropdown: Pilih Star (All / Star A / Star B / ...)
- Filter by date range
- Table: ID, Star, Guest, Katalog, Amount, Status Badge, Timestamp
- Export option

**Ringkasan Star:**
- Card per star: avatar, nama, total revenue, net earnings, pending withdrawal
- Klik untuk detail: breakdown bulanan, chart pendapatan

**Payment Gateway:**
- Form: pilih provider (dropdown), API key, merchant code, environment toggle
- Card preview: "Saat ini menggunakan: Duitku (Sandbox)"
- Multiple gateway support

**Pajak & Potongan:**
- Table existing rules: Nama Potongan, Persentase/Nominal, Status (aktif/nonaktif)
- Tombol "Tambah Potongan Baru" → modal form
- Built-in: PPh 21, Platform Fee
- Custom: Admin bisa tambah manual (nama + persentase)
- Live simulator: input nominal → hitung potongan → tampilkan nett
- Info box: "Peraturan pajak selalu berubah. Ubah di sini tanpa perlu coding."

### 8.6 Checkout Page (`/checkout/[orderId]`)

**Layout:** Single column, centered (max-w: 520px)

```
┌────────────────────────────────────────┐
│                                        │
│  CHECKOUT                              │
│  ═══════════════════════════════════   │
│                                        │
│  Katalog: Valorant Rank Push           │
│  Star: Demo Streamer                   │
│  Harga: Rp 50.000                      │
│                                        │
│  ═══════════════════════════════════   │
│                                        │
│  NAMA IN-GAME                          │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  PESAN UNTUK STAR (opsional)          │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │    BAYAR SEKARANG — Rp 50K →  │    │
│  └────────────────────────────────┘    │
│    ████████████████████████████████    │
│                                        │
└────────────────────────────────────────┘
  ████████████████████████████████████████
```

### 8.7 OBS Overlay (`/overlay/[overlayToken]`)

**Background:** Transparan (untuk browser source OBS)

**Alert Card:**
```
     ┌─────────────────────────────────────────┐
     │                                         │
     │   🎮  FAKHRIADI BERGABUNG!             │  ← bg: --nb-yellow, border 4px hitam
     │       Valorant Rank Push — Rp 50K       │
     │       "Gaskeun bang, pick Reyna ya!"     │
     │                                         │
     │       ANTREAN #04                        │  ← JetBrains Mono Bold, --nb-purple bg
     │                                         │
     └─────────────────────────────────────────┘
       █████████████████████████████████████████
```

- Alert masuk dari atas: `nb-alert-drop` animation
- Card: bg `--nb-yellow` (atau bisa custom per star), border 4px hitam, shadow 8px
- Keluar setelah durasi: `nb-alert-exit` animation
- Nomor antrean: badge pill dengan bg warna `--nb-purple`
- Audio: chime sound saat alert muncul

### 8.8 Tracking Pesanan (`/pesanan/[trackingToken]`)

- Card centered (max-width: 480px)
- Status timeline: vertikal, titik-titik berwarna per step
- Setiap step: ikon + label + timestamp
  - ⏳ Menunggu Pembayaran → `--nb-orange`
  - ✅ Dibayar → `--nb-lime`
  - 📢 Dipanggil → `--nb-blue`
  - 🎮 Sedang Main → `--nb-cyan`
  - ✓ Selesai → `--nb-lime` (solid)

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| `mobile` | < 640px | Single column, sidebar → bottom sheet/hamburger, smaller type scale |
| `tablet` | 640-1024px | 2 column grid, compact sidebar |
| `desktop` | 1024-1280px | Full layout, sidebar visible |
| `wide` | > 1280px | Centered container, extra spacing |

### 9.1 Mobile Adaptations

- **Sidebar** → Hamburger menu (slide dari kiri) dengan overlay gelap
- **Tables** → Horizontal scroll atau card list view
- **Stat cards** → Stack vertikal
- **Shadow** → Dikurangi ke `--nb-shadow-sm` untuk menghemat ruang
- **Font size** → Display: 48px, H1: 36px, H2: 28px

---

## 10. Dekoratif & Elemen Khas

### 10.1 Dot Pattern Background
```css
.nb-dots {
  background-image: radial-gradient(var(--nb-gray-200) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
}
```
Digunakan pada: Hero section, login page background, empty states

### 10.2 Sticker Labels

Elemen dekoratif yang terlihat "ditempel" miring di card atau section:
```css
.nb-sticker {
  display: inline-block;
  padding: 6px 16px;
  background: var(--nb-yellow);
  border: 2px solid var(--nb-black);
  box-shadow: 2px 2px 0px var(--nb-black);
  transform: rotate(-3deg);
  font-family: "Space Grotesk", sans-serif;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
}
```
Digunakan pada: "BARU!", "POPULER", "LIVE", "PROMO"

### 10.3 Divider Zigzag

Bukan garis lurus biasa, tapi pattern zigzag:
```css
.nb-zigzag {
  height: 12px;
  background: repeating-linear-gradient(
    -45deg,
    var(--nb-black),
    var(--nb-black) 4px,
    transparent 4px,
    transparent 8px
  );
  margin: 32px 0;
}
```

### 10.4 Highlight Box (text highlight)

Text penting diberi kotak warna di belakangnya (seperti marker):
```css
.nb-highlight {
  padding: 2px 8px;
  background: var(--nb-yellow);
  border: 2px solid var(--nb-black);
  display: inline;
  line-height: 2;
}
```

### 10.5 Marquee Text (scrolling banner — opsional)
```css
@keyframes nb-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.nb-marquee {
  display: flex;
  overflow: hidden;
  background: var(--nb-black);
  color: var(--nb-yellow);
  padding: 8px 0;
  border-top: 2px solid var(--nb-black);
  border-bottom: 2px solid var(--nb-black);
}
.nb-marquee-content {
  display: flex;
  animation: nb-marquee 20s linear infinite;
  white-space: nowrap;
  gap: 48px;
  font-family: "Space Grotesk", sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```
Digunakan pada: Banner promo, footer dekoratif

---

## 11. Iconografi

### 11.1 Style

- **Stroke icons, bukan filled** — Weight 2-2.5px
- Library: **Lucide Icons** (sudah terinstall)
- Size: 20px (inline), 24px (standalone), 32px (header)
- Warna: inherit dari teks parent

### 11.2 Custom Icon Treatment

Ikon dalam kotak berwarna (untuk feature cards dan nav):
```css
.nb-icon-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--nb-black);
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-sm);
  font-size: 24px;
}
```

---

## 12. Implementasi Teknis (Tailwind CSS Token Mapping)

### 12.1 Tailwind Theme Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        nb: {
          black: '#1A1A2E',
          white: '#FFFEF2',
          cream: '#FFF8E7',
          yellow: '#FFE66D',
          pink: '#FF6B9D',
          cyan: '#4ECDC4',
          purple: '#A855F7',
          orange: '#FF8A5C',
          lime: '#C5E84D',
          blue: '#5B7FFF',
          red: '#FF4757',
          gray: {
            100: '#F5F5F0',
            200: '#E8E8E0',
            300: '#D4D4CC',
            400: '#A0A098',
            500: '#6B6B63',
            600: '#4A4A44',
            700: '#2D2D28',
          },
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'nb-sm': '3px 3px 0px #1A1A2E',
        'nb-md': '5px 5px 0px #1A1A2E',
        'nb-lg': '8px 8px 0px #1A1A2E',
        'nb-xl': '12px 12px 0px #1A1A2E',
        'nb-hover': '2px 2px 0px #1A1A2E',
        'nb-active': '1px 1px 0px #1A1A2E',
        'nb-yellow': '5px 5px 0px #FFE66D',
        'nb-pink': '5px 5px 0px #FF6B9D',
        'nb-cyan': '5px 5px 0px #4ECDC4',
      },
      borderWidth: {
        'nb': '2px',
        'nb-3': '3px',
        'nb-4': '4px',
      },
      borderRadius: {
        'nb-sm': '8px',
        'nb-md': '12px',
        'nb-lg': '16px',
        'nb-xl': '20px',
      },
    },
  },
};
```

### 12.2 CSS Custom Properties (globals.css override)

```css
@layer base {
  :root {
    /* Neo-Brutalism Tokens */
    --nb-black: #1A1A2E;
    --nb-white: #FFFEF2;
    --nb-cream: #FFF8E7;
    --nb-yellow: #FFE66D;
    --nb-pink: #FF6B9D;
    --nb-cyan: #4ECDC4;
    --nb-purple: #A855F7;
    --nb-orange: #FF8A5C;
    --nb-lime: #C5E84D;
    --nb-blue: #5B7FFF;
    --nb-red: #FF4757;
    
    /* Override shadcn vars to match Neo-Brutalism */
    --background: var(--nb-white);
    --foreground: var(--nb-black);
    --card: var(--nb-cream);
    --card-foreground: var(--nb-black);
    --primary: var(--nb-yellow);
    --primary-foreground: var(--nb-black);
    --secondary: var(--nb-cyan);
    --secondary-foreground: var(--nb-black);
    --accent: var(--nb-pink);
    --accent-foreground: var(--nb-white);
    --destructive: var(--nb-red);
    --border: var(--nb-black);
    --input: var(--nb-black);
    --ring: var(--nb-cyan);
    --radius: 12px;
  }
}
```

### 12.3 shadcn/ui Component Overrides

Semua komponen shadcn/ui harus di-override dengan class Neo-Brutalism:

| shadcn Component | Override |
|-----------------|----------|
| `Button` | Tambah `border-nb-3 border-nb-black shadow-nb-md` + hover/active states |
| `Card` | Tambah `border-nb-3 border-nb-black shadow-nb-md bg-nb-cream` |
| `Input` | Tambah `border-nb border-nb-black shadow-nb-sm focus:shadow-nb-md` |
| `Badge` | Tambah `border-nb border-nb-black shadow-[2px_2px_0px] font-bold uppercase` |
| `Dialog` | Tambah `border-nb-4 border-nb-black shadow-nb-xl` |
| `Select` | Tambah `border-nb border-nb-black shadow-nb-sm` |
| `Table` | Override header bg, row striping, border styles |
| `Tabs` | Active tab = `bg-nb-yellow`, border hitam |

---

## 13. Accessibility Checklist

| Item | Implementasi |
|------|-------------|
| Color contrast | Semua teks utama ≥ 4.5:1 (WCAG AA) |
| Focus states | Border `--nb-cyan` 3px + shadow, visible di keyboard nav |
| Touch targets | Minimum 44x44px untuk mobile |
| Alt text | Semua gambar punya alt descriptive |
| Semantic HTML | `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` |
| ARIA labels | Semua interactive elements punya label |
| Reduced motion | `prefers-reduced-motion: reduce` → disable animasi |
| Screen reader | Badge status text, live region untuk notifikasi |

---

## 14. Referensi Visual

### 14.1 Inspirasi Neo-Brutalism

- **Gumroad** — Contoh Neo-Brutalism yang sukses di produk SaaS
- **Figma Community Neo-Brutal Kits** — Referensi komponen
- **Dribbble "Neo Brutalism"** — Tren visual terkini
- **Notion Calendar** — Penggunaan border & shadow yang clean

### 14.2 Prinsip Kunci yang Harus Diingat

1. ✅ **Border hitam tebal** di SETIAP komponen interaktif
2. ✅ **Shadow solid offset** (bukan blur!) di card, button, input
3. ✅ **Warna cerah & berani** — jangan takut pakai kuning, pink, cyan
4. ✅ **Background off-white** — bukan putih murni
5. ✅ **Hover = "tekan tombol"** — translate + shadow shrink
6. ✅ **Tipografi bold & besar** — Space Grotesk untuk heading
7. ✅ **Dot pattern** sebagai background texture
8. ❌ **JANGAN** pakai gradien blur, glassmorphism, atau neumorphism
9. ❌ **JANGAN** pakai shadow dengan blur (blur radius harus 0)
10. ❌ **JANGAN** pakai warna pastel lembut — harus PUNCHY

---

## 15. Checklist Implementasi

- [ ] Setup font imports (Space Grotesk, Inter, JetBrains Mono)
- [ ] Update `globals.css` dengan token Neo-Brutalism
- [ ] Override semua komponen shadcn/ui
- [ ] Redesign Landing Page (`/`)
- [ ] Redesign Login Page (`/login`)
- [ ] Redesign Dashboard Star — Sidebar + semua tab
- [ ] Redesign Admin Dashboard — Sidebar + semua section
- [ ] Redesign Profil Publik Star (`/[starSlug]`)
- [ ] Redesign Checkout Page
- [ ] Redesign Tracking Pesanan
- [ ] Update OBS Overlay alert style
- [ ] Implement dot pattern backgrounds
- [ ] Implement sticker labels
- [ ] Implement responsive mobile adaptations
- [ ] Test semua hover/active states
- [ ] Test dark mode consistency
- [ ] Test accessibility (contrast, focus, screen reader)
- [ ] Test mobile responsiveness

---

*Dokumen ini adalah panduan desain lengkap untuk transformasi visual Mabar VIP ke estetika Neo-Brutalism. Setiap komponen dan halaman harus mengikuti spesifikasi di atas untuk memastikan konsistensi visual di seluruh platform.*
