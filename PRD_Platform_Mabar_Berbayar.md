# PRD --- Platform Main Bareng Berbayar

**Versi:** 1.1\
**Tanggal:** 15 Oktober 2026\
**Status:** Draft implementasi untuk AI coding agent (Antigravity)\
**Bahasa produk:** Indonesia\
**Nama produk:** Belum ditentukan

------------------------------------------------------------------------

## 1. Ringkasan Produk

Platform ini memungkinkan streamer/creator ("Star") membuka layanan
**main bareng (mabar) berbayar**. Guest dapat memilih katalog mabar,
mengisi data yang diminta Star, membayar melalui Duitku, lalu masuk ke
antrean. Guest tidak perlu membuat akun.

Setiap pembelian yang berhasil dibayar harus memicu **notifikasi
pembelian ke Star**, termasuk: 1. Notifikasi di dashboard Star. 2.
Notifikasi visual overlay di layar/live stream Star, dengan pengalaman
mirip alert donasi seperti Saweria. 3. Pembaruan antrean secara
real-time.

Overlay harus dapat ditampilkan sebagai browser source di OBS atau
software streaming lain yang mendukung Browser Source. Overlay tidak
boleh menampilkan data sensitif seperti nomor telepon, alamat email,
token pelacakan, atau informasi pembayaran rahasia.

## 2. Tujuan dan Prinsip

-   Guest dapat membeli layanan tanpa registrasi.
-   Star dapat membuat katalog berbayar dan mengelola antrean.
-   Pembelian yang benar-benar terkonfirmasi dibayar memicu notifikasi
    secara real-time.
-   Star dapat memasang URL overlay di OBS sebagai Browser Source.
-   Superadmin mengelola Star, transaksi, konfigurasi pembayaran, biaya
    platform, dan audit.
-   Sistem aman, responsif, mudah digunakan, dan konsisten di desktop
    maupun mobile.

## 3. Role dan Hak Akses

### 3.1 Guest / Pembeli

-   Tidak membutuhkan akun.
-   Melihat halaman Star, katalog, harga, deskripsi, dan status antrean.
-   Mengisi input yang diwajibkan Star pada katalog.
-   Membuat pesanan dan membayar via Duitku.
-   Melihat status pembayaran dan posisi antrean melalui URL pelacakan
    rahasia.
-   Tidak dapat mengakses dashboard Star atau Superadmin.

### 3.2 Star / Streamer

-   Login dengan akun.
-   Mengatur profil publik dan slug URL.
-   Membuat, mengedit, mengaktifkan, menonaktifkan, dan menghapus/arsip
    katalog.
-   Mengunggah gambar sampul katalog sendiri.
-   Menentukan harga dan field input yang perlu diisi Guest.
-   Melihat dan mengelola pesanan/antrean untuk katalog miliknya.
-   Mendapat notifikasi pembelian baru pada dashboard.
-   Mengatur dan menguji overlay notifikasi stream.
-   Menghasilkan atau merotasi URL/token overlay secara aman.
-   Tidak boleh melihat data Star lain.

### 3.3 Superadmin / Developer

-   Mengelola akun Star dan status aktif/nonaktif.
-   Melihat transaksi dan status pembayaran.
-   Mengatur konfigurasi Duitku melalui environment variables/secret
    management yang aman.
-   Mengatur biaya platform/komisi dan parameter global.
-   Melihat log sistem, callback pembayaran, notifikasi, dan audit.
-   Tidak mengakses rahasia pembayaran Guest kecuali benar-benar
    diperlukan untuk dukungan operasional.

## 4. URL dan Navigasi

Gunakan slug publik yang unik untuk tiap Star. Contoh struktur:

-   `/[starSlug]` --- profil dan katalog publik Star.
-   `/[starSlug]/antrian` --- antrean publik Star atau ringkasan
    antrean.
-   `/[starSlug]/antrian/[catalogSlug]` --- detail katalog dan antrean
    katalog.
-   `/checkout/[orderId]` --- instruksi/status checkout.
-   `/pesanan/[trackingToken]` --- status dan posisi antrean Guest.
-   `/login` --- login Star/Admin.
-   `/dashboard` --- dashboard Star.
-   `/dashboard/katalog` --- pengelolaan katalog.
-   `/dashboard/antrian` --- pengelolaan antrean/pesanan.
-   `/dashboard/notifikasi` --- pengaturan notifikasi dan overlay.
-   `/admin` --- area Superadmin.
-   `/overlay/[publicOverlayId]` --- tampilan overlay transparan untuk
    OBS.

URL overlay harus menggunakan token acak yang sulit ditebak. Perlakukan
URL overlay sebagai secret: siapa pun yang memilikinya berpotensi dapat
menampilkan alert Star. Jangan menggunakan ID database berurutan sebagai
token.

## 5. Ruang Lingkup MVP

### Termasuk

-   Autentikasi Star dan Superadmin.
-   Profil publik Star dan katalog.
-   Field input katalog yang dapat dikonfigurasi Star.
-   Upload gambar katalog.
-   Checkout Guest tanpa akun.
-   Integrasi Duitku.
-   Verifikasi pembayaran melalui callback server-side.
-   Antrean per katalog.
-   Halaman pelacakan pesanan Guest.
-   Notifikasi pembelian pada dashboard Star.
-   Live overlay notifikasi pembelian yang kompatibel dengan OBS Browser
    Source.
-   Pengaturan overlay dasar: URL overlay, preview/test alert, durasi
    tampil, dan pilihan suara on/off.
-   Dashboard Star dan Superadmin.
-   Audit log minimum untuk transaksi dan aksi penting.

### Tidak termasuk dalam MVP (kecuali diputuskan kemudian)

-   Payout otomatis ke rekening Star.
-   Aplikasi mobile native.
-   Sistem membership/subscription.
-   Multi-currency.
-   Chat antara Guest dan Star.
-   Sistem refund otomatis penuh.
-   Efek visual/suara yang kompleks atau marketplace tema overlay.
-   Integrasi platform streaming khusus melalui API akun Twitch/YouTube;
    MVP memakai browser source.

## 6. Alur Utama Produk

### 6.1 Alur pembelian Guest

1.  Guest membuka halaman publik Star.
2.  Guest memilih katalog mabar.
3.  Sistem menampilkan deskripsi, harga, field yang wajib diisi, dan
    informasi antrean.
4.  Guest mengisi field yang diminta, misalnya nickname, ID game,
    server, pesan untuk streamer, atau catatan.
5.  Server membuat order dengan status awal `pending_payment` dan token
    tracking acak.
6.  Guest diarahkan ke metode pembayaran Duitku.
7.  Sistem menunggu callback Duitku dan memverifikasi signature serta
    status transaksi di server.
8.  Hanya setelah pembayaran terverifikasi sukses, order menjadi `paid`
    dan nomor antrean dialokasikan secara atomik.
9.  Sistem menyimpan event notifikasi dan menerbitkan event real-time
    untuk dashboard Star dan overlay.
10. Guest melihat status paid dan nomor antrean melalui halaman
    tracking.

### 6.2 Alur Star

1.  Star login dan membuat katalog.
2.  Star mengatur nama, deskripsi, harga, gambar sampul, serta field
    Guest.
3.  Star membuka halaman pengaturan notifikasi dan menyalin URL overlay.
4.  Star menambahkan URL overlay sebagai Browser Source di OBS.
5.  Star dapat mengirim test alert untuk memastikan overlay dan audio
    bekerja.
6.  Saat order terkonfirmasi dibayar, dashboard Star dan overlay
    menampilkan alert baru.
7.  Star memproses antrean dan mengubah status sesuai alur kerja.

### 6.3 Alur Superadmin

1.  Superadmin login dengan role terverifikasi di server.
2.  Superadmin melihat ringkasan order, transaksi, status callback, dan
    notifikasi.
3.  Superadmin dapat menonaktifkan Star/katalog jika diperlukan.
4.  Perubahan penting tercatat di audit log.

## 7. Kebutuhan Fungsional

### FR-01 --- Profil dan katalog publik

-   Setiap Star memiliki slug unik.
-   Halaman publik hanya menampilkan katalog yang aktif dan dapat
    dibeli.
-   Harga ditampilkan jelas dalam Rupiah.
-   Setiap katalog memiliki status aktif/nonaktif.
-   Antrean dan nomor antrean tidak boleh tertukar antar katalog.

### FR-02 --- Input kustom Guest

-   Star dapat menambah field seperti text, textarea, number, dan
    pilihan dropdown.
-   Field dapat memiliki label, placeholder, required, urutan, serta
    batas panjang.
-   Validasi dilakukan di client dan server.
-   Jangan mengizinkan HTML/script sebagai input.
-   Simpan jawaban field sebagai data terstruktur terkait order.

### FR-03 --- Gambar katalog

-   Star dapat mengunggah, mengganti, melihat preview, dan menghapus
    gambar katalog.
-   Gunakan Supabase Storage dengan kebijakan akses yang sesuai.
-   Format yang diizinkan: JPEG, PNG, WebP.
-   Batas ukuran awal: 5 MB per gambar.
-   Validasi MIME type dan ukuran file di server.
-   Simpan storage path di database; hindari mengandalkan URL publik
    permanen jika bucket privat lebih sesuai.
-   Star hanya boleh mengubah file miliknya sendiri.

### FR-04 --- Order dan pembayaran

-   Buat order di server dengan nominal yang berasal dari database,
    bukan nilai harga dari browser.
-   Gunakan ID order unik dan reference Duitku yang unik.
-   Verifikasi signature callback Duitku di server sesuai dokumentasi
    Duitku.
-   Callback harus idempotent: callback berulang tidak boleh membuat
    antrean atau alert ganda.
-   Validasi merchant/order reference, nominal, dan status transaksi.
-   Jangan pernah mempercayai redirect browser sebagai bukti pembayaran.
-   Simpan status callback dan error yang relevan untuk audit, tanpa
    mencatat secret.
-   Status minimum: `pending_payment`, `paid`, `payment_failed`,
    `expired`, `cancelled`, `refunded` (refund jika didukung proses
    operasional).
-   Rahasia API Duitku wajib berada di environment variables/secret
    manager, tidak pernah dikirim ke browser atau disimpan di
    repository.

### FR-05 --- Nomor antrean

-   Antrean terpisah per katalog secara default.
-   Nomor antrean dialokasikan hanya setelah pembayaran terverifikasi
    sukses.
-   Alokasi nomor antrean harus atomik/transaction-safe agar dua
    pembayaran bersamaan tidak memperoleh nomor sama.
-   Urutan antrean ditentukan oleh waktu pembayaran terkonfirmasi di
    server, dengan aturan tie-breaker yang konsisten.
-   Perubahan status antrean harus tercatat sebagai event.
-   Rekomendasi status: `waiting`, `invited`, `in_room`, `completed`,
    `skipped`, `cancelled`.
-   Jangan menghapus riwayat order yang telah dibayar secara permanen.

### FR-06 --- Halaman tracking Guest

-   Guest mengakses pesanan melalui token rahasia berentropi tinggi.
-   Tampilkan status pembayaran, nomor antrean, status antrean, nama
    katalog, dan perkiraan antrean di depan jika tersedia.
-   Jangan mewajibkan login.
-   Jangan mengekspos data Guest lain.
-   Token tracking tidak boleh ditebak dan jangan dicatat utuh pada log
    analitik.
-   Sediakan status yang jelas jika pembayaran belum terkonfirmasi.

### FR-07 --- Notifikasi pembelian di dashboard Star

-   Dashboard menerima notifikasi secara real-time setelah order `paid`.
-   Notifikasi menampilkan nama/nickname Guest, nama katalog, harga,
    nomor antrean, dan pesan yang memang diizinkan untuk ditampilkan.
-   Ada indikator jumlah notifikasi belum dibaca.
-   Star dapat menandai notifikasi sebagai dibaca.
-   Riwayat notifikasi tetap tersedia jika Star sedang offline ketika
    pembayaran terjadi.
-   Jangan membuat notifikasi baru jika callback pembayaran yang sama
    diproses ulang.

### FR-08 --- Stream Alert Overlay (fitur wajib)

Tujuan: setiap pembelian berhasil memunculkan alert visual pada layar
live streamer seperti alert donasi.

#### Perilaku overlay

-   Overlay berbasis web, latar transparan, dapat digunakan sebagai OBS
    Browser Source.
-   Overlay menerima event baru secara real-time tanpa perlu reload
    manual.
-   Ketika pembelian sukses, alert tampil dengan animasi masuk, bertahan
    sesuai durasi pengaturan, lalu menghilang dengan animasi keluar.
-   Antrean alert harus ditampilkan satu per satu; alert baru tidak
    boleh menimpa alert yang sedang berjalan.
-   Jika beberapa pembelian masuk bersamaan, semua alert dimasukkan ke
    queue overlay dengan urutan yang konsisten.
-   Jika koneksi real-time terputus, overlay mencoba reconnect otomatis.
-   Saat reconnect, jangan memutar ulang semua alert lama. Ambil event
    baru yang belum ditampilkan berdasarkan cursor/ID event atau aturan
    delivery yang terdokumentasi.
-   Sediakan tombol/fitur "Test Alert" di dashboard Star yang
    menghasilkan alert uji tanpa membuat order atau mengubah antrean.
-   Test alert harus dibedakan dari transaksi asli dan tidak boleh masuk
    ke laporan penjualan.
-   Overlay tidak menampilkan data sensitif.
-   Overlay dapat menampilkan minimal: "Pembelian Baru!", nickname
    Guest, nama katalog, pesan singkat Guest (jika diaktifkan), nominal
    pembayaran, dan nomor antrean.
-   Star dapat mengaktifkan/menonaktifkan suara alert dan memilih durasi
    tampil. MVP boleh menyediakan satu suara default.
-   Pastikan overlay responsif dan tidak membutuhkan interaksi
    mouse/keyboard ketika berjalan di OBS.

#### Pengaturan overlay

-   URL overlay unik per Star dengan token rahasia yang dapat dirotasi.
-   Tampilkan instruksi pemasangan Browser Source di dashboard.
-   Sediakan preview/test alert.
-   Pengaturan dasar: durasi alert, suara on/off, tampilkan nominal
    on/off, tampilkan pesan Guest on/off, tampilkan nomor antrean
    on/off.
-   Jika URL overlay dirotasi, URL lama harus langsung tidak berlaku.
-   Jangan memasukkan kredensial Supabase service role atau rahasia
    server ke URL/client.
-   Batasi data event yang dapat diakses overlay agar hanya data yang
    diperlukan untuk menampilkan alert Star tersebut.

#### Integrasi teknis yang disarankan

-   Gunakan Supabase Realtime atau channel event server-side yang
    terautentikasi/terbatas.
-   Jangan membuat tabel transaksi dapat dibaca secara publik hanya demi
    overlay.
-   Lebih aman menggunakan endpoint/channel khusus yang memvalidasi
    token overlay lalu hanya mengirim payload alert yang sudah
    disanitasi.
-   Pertimbangkan pola outbox: saat transaksi database menandai order
    paid, buat event notifikasi dalam transaksi yang sama;
    worker/handler mengirimkan event setelah commit. Pastikan delivery
    idempotent.
-   Jika infrastruktur MVP tidak memiliki worker, gunakan mekanisme
    database event/outbox dan consumer yang sederhana, dengan retry
    serta status delivery yang dapat dipantau.
-   Payload event minimum: `event_id`, `star_id`, `order_id` internal
    (jangan tampilkan ke layar), `catalog_name`, `guest_display_name`,
    `amount`, `queue_number`, `message`, `created_at`, `is_test`.
-   Pastikan event asli hanya dibuat setelah status paid berhasil
    diverifikasi.
-   Gunakan fallback/reconnect dan jangan membocorkan token tracking
    Guest ke overlay.

### FR-09 --- Dashboard Star

-   Ringkasan penjualan dan pesanan.
-   Pengelolaan katalog, field, gambar, antrean, notifikasi, dan
    overlay.
-   Star hanya dapat mengakses data miliknya.
-   Perubahan status order harus tervalidasi dan tercatat.

### FR-10 --- Dashboard Superadmin

-   Ringkasan transaksi, jumlah order, Star aktif, dan error pembayaran.
-   Cari/filter order berdasarkan status, tanggal, Star, dan reference
    transaksi.
-   Kelola status Star dan katalog.
-   Lihat log callback, event overlay, dan audit.
-   Akses administratif dilindungi role check server-side.

## 8. Aturan Bisnis

1.  Satu Guest dapat checkout tanpa akun.
2.  Order tidak masuk antrean aktif sebelum pembayaran sukses
    terverifikasi.
3.  Satu order hanya memperoleh satu nomor antrean.
4.  Satu order hanya menghasilkan satu alert pembelian asli, meskipun
    callback datang berulang.
5.  Alert test tidak mengubah order, pembayaran, saldo, statistik
    penjualan, atau antrean.
6.  Nominal order dihitung server-side berdasarkan harga katalog saat
    checkout.
7.  Jika katalog dinonaktifkan setelah order dibuat, order yang sudah
    dibuat tetap mengikuti kebijakan order yang eksplisit; rekomendasi:
    order pending tetap dapat dibayar sampai kedaluwarsa, tetapi tidak
    menerima checkout baru.
8.  Star hanya boleh melihat/mengubah katalog, order, notifikasi, dan
    pengaturan overlay miliknya.
9.  Semua waktu disimpan dalam UTC dan ditampilkan dalam zona waktu
    lokal yang sesuai (default Asia/Jakarta).
10. Komisi platform dan payout belum ditetapkan; implementasi harus
    membuat konfigurasi fleksibel dan tidak mengasumsikan payout
    otomatis.

## 9. Model Data Awal

Gunakan UUID untuk primary key kecuali ada alasan teknis kuat.

### `profiles`

-   `id` UUID, referensi ke Supabase Auth user.
-   `display_name`
-   `role` (`star` atau `superadmin`)
-   `created_at`, `updated_at`

### `stars`

-   `id`
-   `user_id`
-   `slug` unique
-   `display_name`
-   `bio`
-   `avatar_path`
-   `is_active`
-   `created_at`, `updated_at`

### `catalogs`

-   `id`
-   `star_id`
-   `slug`
-   `name`
-   `description`
-   `price_amount` integer dalam IDR
-   `cover_image_path`
-   `is_active`
-   `created_at`, `updated_at`

Constraint unique yang direkomendasikan: `(star_id, slug)`.

### `catalog_fields`

-   `id`
-   `catalog_id`
-   `label`
-   `field_key`
-   `field_type`
-   `placeholder`
-   `is_required`
-   `options` JSONB untuk pilihan
-   `validation_rules` JSONB
-   `sort_order`

### `orders`

-   `id`
-   `star_id`
-   `catalog_id`
-   `guest_display_name`
-   `guest_answers` JSONB
-   `guest_message`
-   `amount`
-   `currency` default `IDR`
-   `payment_status`
-   `queue_status`
-   `queue_number` nullable sebelum paid
-   `tracking_token_hash` atau token yang disimpan dengan strategi aman
-   `paid_at`
-   `created_at`, `updated_at`

### `payments`

-   `id`
-   `order_id`
-   `provider` (Duitku)
-   `provider_reference`
-   `provider_transaction_id`
-   `amount`
-   `status`
-   `callback_payload_redacted` JSONB
-   `last_callback_at`
-   `created_at`, `updated_at`

### `queue_counters`

-   `catalog_id` unique
-   `last_queue_number`
-   `updated_at`

### `queue_events`

-   `id`
-   `order_id`
-   `actor_user_id` nullable
-   `event_type`
-   `previous_status`
-   `new_status`
-   `metadata` JSONB
-   `created_at`

### `notifications`

-   `id`
-   `star_id`
-   `order_id` nullable untuk test event
-   `event_type`
-   `payload` JSONB yang telah disanitasi
-   `is_test`
-   `read_at`
-   `created_at`

### `overlay_settings`

-   `id`
-   `star_id` unique
-   `overlay_token_hash` atau mekanisme token aman
-   `alert_duration_ms`
-   `sound_enabled`
-   `show_amount`
-   `show_guest_message`
-   `show_queue_number`
-   `created_at`, `updated_at`

### `notification_deliveries`

-   `id`
-   `notification_id`
-   `channel` (`dashboard`, `overlay`)
-   `status` (`pending`, `sent`, `failed`)
-   `attempt_count`
-   `last_error_code`
-   `sent_at`
-   `created_at`, `updated_at`

### `platform_settings`

-   `key`
-   `value` JSONB
-   `updated_by`
-   `updated_at`

### `audit_logs`

-   `id`
-   `actor_user_id`
-   `action`
-   `entity_type`
-   `entity_id`
-   `metadata` JSONB
-   `created_at`

Tambahkan index pada foreign key, `payment_status`, `queue_status`,
`created_at`, `provider_reference`, serta kolom pencarian yang relevan.
Hindari menyimpan data sensitif yang tidak diperlukan.

## 10. Keamanan dan Privasi

-   Aktifkan Supabase Row Level Security (RLS) untuk tabel yang diakses
    client.
-   Validasi role dan kepemilikan di server; jangan hanya menyembunyikan
    menu di UI.
-   Jangan pernah mengekspos service role key, Duitku merchant key, atau
    secret lain ke client.
-   Endpoint callback Duitku wajib memverifikasi signature sesuai
    dokumentasi provider.
-   Terapkan rate limiting pada checkout, tracking, login, test alert,
    dan endpoint overlay.
-   Sanitasi semua teks Guest sebelum dirender; cegah XSS.
-   Batasi panjang pesan Guest dan nickname.
-   Jangan tampilkan tracking token, email, nomor telepon, jawaban
    privat, atau payload callback di overlay.
-   Token overlay harus berentropi tinggi, dapat dirotasi, dan disimpan
    dengan hash jika arsitektur memungkinkan.
-   Gunakan HTTPS di production.
-   Jangan mengirim secret melalui query parameter yang dapat tercatat
    di log, jika dapat menggunakan mekanisme token/path yang lebih aman.
-   Terapkan validasi server-side terhadap harga, katalog aktif,
    kepemilikan Star, status order, dan semua perubahan antrean.
-   Simpan audit untuk perubahan role, status Star, status order, dan
    konfigurasi pembayaran.
-   Jangan log kredensial, signature lengkap, atau data pribadi
    berlebihan.

## 11. Kebutuhan Nonfungsional

-   UI responsif dan aksesibel.
-   Dashboard dan antrean memperbarui data tanpa reload manual.
-   Overlay dapat berjalan stabil di browser Chromium/OBS Browser
    Source.
-   Notifikasi tidak hilang permanen ketika Star offline; riwayat
    tersedia di dashboard.
-   Pembayaran dan pemberian nomor antrean tahan terhadap callback
    duplikat dan request bersamaan.
-   Pesan error mudah dipahami dan tidak membocorkan detail internal.
-   Ada logging untuk kegagalan pembayaran, delivery notifikasi, dan
    koneksi real-time.
-   Kode modular, typed, mudah diuji, dan tidak menaruh business logic
    penting hanya di komponen UI.

## 12. Stack Teknis yang Direkomendasikan

-   **Frontend/backend:** Next.js App Router + TypeScript.
-   **UI:** Tailwind CSS dan shadcn/ui atau komponen konsisten yang
    setara.
-   **Database, auth, realtime, storage:** Supabase (PostgreSQL, Auth,
    Realtime, Storage).
-   **Pembayaran:** Duitku.
-   **Hosting:** Vercel atau platform Node.js yang mendukung
    route/cron/worker sesuai kebutuhan.
-   **Repository:** Git dengan `.env.example` tanpa nilai rahasia.
-   **Testing:** unit/integration test untuk pembayaran, callback
    idempotency, alokasi antrean, otorisasi, dan event overlay.

AI coding agent harus memeriksa versi package dan dokumentasi resmi
terbaru sebelum implementasi integrasi eksternal. Jangan mengarang
endpoint Duitku atau API Supabase yang belum diverifikasi.

## 13. Struktur Proyek Next.js yang Disarankan

``` text
app/
  (public)/
    [starSlug]/
      page.tsx
      antrian/page.tsx
      antrian/[catalogSlug]/page.tsx
    checkout/[orderId]/page.tsx
    pesanan/[trackingToken]/page.tsx
  (auth)/
    login/page.tsx
  dashboard/
    page.tsx
    katalog/page.tsx
    antrian/page.tsx
    notifikasi/page.tsx
    overlay/page.tsx
  admin/
    page.tsx
  overlay/[overlayToken]/
    page.tsx
  api/
    checkout/route.ts
    payments/duitku/callback/route.ts
    overlay/test/route.ts
    overlay/events/route.ts
components/
  catalog/
  checkout/
  queue/
  notifications/
  overlay/
  dashboard/
lib/
  auth/
  duitku/
  supabase/
  queue/
  notifications/
  validation/
  security/
supabase/
  migrations/
  seed.sql
tests/
```

Struktur ini panduan, bukan kewajiban. Sesuaikan dengan versi Next.js
dan Supabase yang dipakai, tetapi pertahankan pemisahan domain, akses
server, dan UI.

## 14. Acceptance Criteria

### Pembelian dan antrean

-   Guest dapat membeli tanpa membuat akun.
-   Order pending tidak mendapat nomor antrean.
-   Callback pembayaran valid membuat order menjadi paid tepat satu
    kali.
-   Callback duplikat tidak membuat nomor antrean atau notifikasi ganda.
-   Dua callback paralel tidak menghasilkan nomor antrean duplikat pada
    katalog yang sama.
-   Callback invalid tidak mengubah status order.

### Notifikasi dashboard

-   Setelah order dibayar dan diverifikasi, notifikasi muncul di
    dashboard Star yang benar.
-   Star offline dapat melihat notifikasi saat login kembali.
-   Star A tidak dapat membaca notifikasi Star B.
-   Event yang sama tidak diduplikasi oleh callback ulang.

### Overlay stream

-   Star dapat menyalin URL overlay dan menambahkannya ke OBS Browser
    Source.
-   Test alert muncul di overlay tanpa membuat order/penjualan/antrean.
-   Pembelian sukses menghasilkan satu alert visual pada overlay Star
    yang tepat.
-   Alert bertumpuk masuk antrean dan tampil satu per satu.
-   Overlay dapat reconnect setelah jaringan putus.
-   Pengaturan durasi, suara, dan opsi tampilan diterapkan.
-   Token overlay yang dirotasi membatalkan token lama.
-   Tidak ada data sensitif pada payload atau tampilan overlay.
-   Overlay tidak mengakses tabel order secara publik tanpa pembatasan.

### Keamanan

-   Guest tidak dapat melihat pesanan orang lain tanpa token tracking
    yang benar.
-   Star tidak dapat mengubah data Star lain.
-   Role Superadmin diperiksa server-side.
-   Secret tidak ada di source code, browser bundle, atau log.

## 15. Skenario Pengujian Kritis

1.  Callback Duitku sukses yang sama dikirim tiga kali.
2.  Callback palsu dengan nominal berbeda.
3.  Dua pembayaran pada katalog yang sama dikonfirmasi hampir bersamaan.
4.  Star offline ketika pembayaran masuk, lalu kembali online.
5.  Koneksi overlay putus ketika alert berlangsung.
6.  Lima pembelian terjadi hampir bersamaan dan seluruh alert tampil
    berurutan.
7.  Star merotasi URL overlay saat browser source lama masih terbuka.
8.  Guest mengirim nickname/pesan berisi HTML atau script.
9.  Star mencoba mengakses order atau file Storage milik Star lain.
10. Test alert dipicu berulang dan tidak memengaruhi statistik
    transaksi.
11. Katalog dinonaktifkan ketika ada order pending.
12. Callback diterima setelah order kedaluwarsa atau sudah diproses.

## 16. Keputusan yang Masih Perlu Dikonfirmasi

-   Nama produk, logo, dan identitas visual.
-   Model komisi platform dan payout Star.
-   Apakah antrean publik menampilkan nickname penuh atau versi yang
    disamarkan.
-   Apakah alert menampilkan nominal secara default.
-   Durasi alert default dan opsi suara.
-   Kebijakan refund, pembatalan, dan pembayaran terlambat.
-   Apakah satu katalog punya jam operasional atau kuota maksimum.
-   Apakah Star dapat mengatur tampilan overlay (warna, font, animasi)
    pada fase berikutnya.

Jika belum ada keputusan, gunakan default yang aman dan dokumentasikan
sebagai konfigurasi, jangan menghambat pembangunan MVP.

## 17. Urutan Implementasi untuk Antigravity

Implementasikan secara bertahap, jangan membangun seluruh fitur
sekaligus:

1.  Inspeksi repository yang tersedia dan laporkan stack/struktur
    sebelum mengubah file. Jangan menimpa pekerjaan yang sudah ada.
2.  Siapkan schema database, migrations, RLS, seed data, dan
    `.env.example`.
3.  Bangun auth serta otorisasi Star/Superadmin.
4.  Bangun profil publik dan CRUD katalog termasuk upload gambar.
5.  Bangun checkout/order dan integrasi Duitku di server.
6.  Implementasikan callback Duitku dengan signature validation,
    idempotency, dan logging.
7.  Implementasikan alokasi nomor antrean atomik dan halaman tracking
    Guest.
8.  Implementasikan notifikasi dashboard menggunakan event yang tercatat
    di database.
9.  Implementasikan overlay transparan OBS, URL/token aman, realtime
    event, queue alert, test alert, suara, pengaturan, dan reconnect.
10. Bangun dashboard Star dan Superadmin.
11. Tulis unit/integration tests untuk semua alur pembayaran, antrean,
    akses data, dan overlay.
12. Jalankan lint, typecheck, tests, dan build; perbaiki error sebelum
    menyatakan selesai.

### Instruksi kerja untuk AI coding agent

-   Mulai dengan merangkum repository dan rencana implementasi.
-   Implementasikan satu tahap pada satu waktu, prioritaskan alur
    end-to-end yang aman.
-   Jangan mengganti teknologi atau menghapus fitur existing tanpa
    alasan dan konfirmasi.
-   Jangan menandai fitur selesai jika belum diuji.
-   Jika kredensial Duitku/Supabase belum tersedia, buat integrasi
    berbasis environment variables dan jelaskan cara mengujinya dalam
    mode sandbox.
-   Jangan hardcode secret atau data transaksi palsu sebagai
    implementasi final.
-   Setelah setiap tahap, laporkan file yang dibuat/diubah, migrasi yang
    diperlukan, environment variables, hasil test, dan pekerjaan yang
    belum selesai.

## 18. Definition of Done

MVP dianggap selesai jika: - Guest dapat membuat dan membayar order. -
Callback Duitku terverifikasi dan idempotent. - Antrean konsisten dan
tidak memiliki nomor ganda. - Star dapat mengelola katalog dan
antrean. - Dashboard menampilkan notifikasi pembelian. - Overlay OBS
menampilkan alert pembelian real-time dan test alert. - RLS/otorisasi
mencegah akses silang antar-Star. - Test penting, lint, typecheck, dan
build berhasil. - README menjelaskan setup lokal, environment variables,
migrasi database, callback Duitku, serta pemasangan overlay di OBS.
