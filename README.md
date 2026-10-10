# VIBE Metropolis

VIBE menghubungkan Discover, Prediction, dan Community untuk konten Gaming, Sports, dan Crypto. Repositori ini adalah **implementasi baru** untuk Metropolis Track 03. Konsep dan aturan produk ada di [PRD](HIVE_METROPOLIS_FINAL_PRD.md).

Nama produk yang tampil kepada pengguna adalah **VIBE**. Beberapa nama teknis lama (`HiveCallV2`, tabel `hive_*`, domain tanda tangan `HIVE_CHOICE_V2`, dan kunci localStorage) tetap dipertahankan agar kontrak, data, dan pilihan demo yang sudah ada tetap kompatibel. Logo VIBE berasal dari aset pemilik proyek dan tercatat di [ASSETS.md](ASSETS.md).

## Status saat ini

- Saldo gratis **1.000 VIBE per akun Privy** saat integrasi dikonfigurasi (sesi cookie pada mode lokal), nominal **10–500 VIBE per Call**. Benar mengembalikan **2×** nominal; void mengembalikan nominal sekali. Saldo/Call/bukti tersimpan atomik di Supabase atau SQLite lokal. Aturan: [PRD Call Shorts](VIBE_SOURCE_CALL_PRD.md).
- Discover/Prediksi memakai Shorts dan metrik YouTube nyata. Call dibuka setelah dua pemeriksaan minimal 30 menit dan pertumbuhan positif. Komentar/Community tetap lokal.
- `contracts/HiveCallV2.sol` adalah kontrak commit–reveal untuk Monad yang dibangun dan diuji dengan Foundry; alamat deployment belum ada.
- Call Shorts menampilkan bukti pemeriksaan YouTube dan riwayat saldo; tidak mengklaim proof onchain. Call fixture lama menjadi arsip demo dan tidak menerima kredit server.
- Branch `feat/google-auth-supabase` sudah digabung. Root provider menyinkronkan profil Google ke `hive_users`. API memverifikasi JWT Privy; saldo mengikuti DID akun dan bisa dibuka lintas perangkat. Kredensial lokal harus diisi sebelum login/database live bisa diuji. Relayer/Monad terpisah. Data saldo lama tidak diimpor atau dihapus.
- Profil dan Upload adalah halaman terpisah. Upload mendukung preview MP4/WebM, judul, caption, kategori dan hashtag; file publik tersimpan di Supabase Storage, maksimal 40 MB. Intro otomatis masuk Discover; saldo dan pengiriman Call/upload memerlukan login.

## Deploy dan submission

Website MVP: [VIBE di Railway](https://web-production-5e33e.up.railway.app). Deploy publik telah lulus healthcheck dan pemeriksaan API pengunjung pada 9 Oktober 2026. Uji login Google, dua akun, upload dan hasil Call nyata masih diperlukan sebelum submission.

Ikuti [panduan Railway](docs/RAILWAY_DEPLOYMENT.md) dan [checklist submission](docs/SUBMISSION_CHECKLIST.md). `railway.json` menyiapkan satu server Node 22 yang tetap aktif, build produksi, pemeriksaan konfigurasi saat start, dan healthcheck `/api/health`. Konfigurasi Privy, Supabase, YouTube dan origin HTTPS wajib untuk deployment ini. Kredensial tidak disertakan dalam repo.

Preflight lokal: `npm run check:deploy:local`. Pemeriksaan ini membaca schema/state/bucket Supabase dan metrik YouTube; tidak menggantikan uji login Google, upload dan pilihan Call pada domain publik. Website deployment dan kontrak Monad adalah dua gate terpisah.

## Jalankan lokal

Memerlukan Node.js 22.15+ dan [Foundry](https://getfoundry.sh/getting-started/installation/) (`forge` tersedia di PATH).

```sh
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Buka <http://localhost:3000>. Biarkan variabel pada `.env.local` kosong untuk mode demo. Jangan menaruh private key atau API key di variabel `NEXT_PUBLIC_` atau commit ke Git.

Jika `YOUTUBE_API_KEY` diisi, Discover menampilkan 20 Shorts publik terkurasi dari Gaming, Sports, dan Crypto. Server memeriksa judul, kreator, izin embed, durasi, orientasi, dan views melalui YouTube Data API; pemutaran memakai player resmi. Collector memeriksa views setiap 30 detik, dan penerbitan Call memakai dua pemeriksaan berjarak minimal 30 menit. API gagal menampilkan opsi mencoba lagi tanpa metrik buatan. Angka dapat tetap sama sampai YouTube memperbarui data. Jangan menaruh key pada `.env.example`.

### Penyimpanan server dan collector

#### Aktifkan Google login dan Supabase

1. Jalankan migrasi yang belum diterapkan secara berurutan di Supabase SQL Editor: `202610020001_hive_metropolis.sql`, `202610020002_commit_deadline.sql`, `202610030001_hive_users.sql`, lalu `202610060001_vibe_source_state.sql`. Semua ada di `supabase/migrations/`.
2. Isi `.env.local`: `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_VERIFICATION_KEY` (PEM publik), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Pertahankan `YOUTUBE_API_KEY`. Aktifkan Google pada Privy dan izinkan origin lokal/deployment di dashboard Privy.
3. Restart `npm run dev`. Buka Profil → Masuk Google, atau tombol login pada panel Call/saldo. Verifikasi satu baris `hive_users` untuk DID yang sama saat login ulang.
4. Setelah login, saldo awal diberikan sekali per DID. Akun sama di perangkat lain membuka saldo/riwayat yang sama. Logout segera menyembunyikan saldo akun; pengunjung tetap dapat melihat Shorts dan Call tanpa mendapat kredit.

`hive_vibe_state` menyimpan snapshot engine dan ledger dalam JSONB. RPC `hive_commit_vibe_state` mengunci satu baris, membandingkan revision, dan menolak penulisan lama; server mengulang transisi setelah konflik. RLS aktif, akses tabel/fungsi hanya untuk service role. API mengambil DID dari JWT, bukan body atau alamat wallet yang dikirim browser. Metadata profil dari browser hanya untuk tampilan dan tidak membuktikan kepemilikan email/wallet.

Adapter snapshot tunggal ini cocok untuk MVP kecil; seluruh saldo dibaca/diperiksa saat transisi. Sebelum trafik besar, pisahkan wallet/ledger/Call ke tabel dengan transaksi PostgreSQL per akun. Jika Supabase gagal atau konfigurasinya setengah terisi, saldo tidak dialihkan diam-diam ke SQLite. Data sesi lokal lama tetap di `.vibe-data/` dan tidak otomatis menjadi saldo akun Google. Supabase baru mulai kalibrasi sendiri.

Supabase tidak menjalankan collector dengan sendirinya. Tetap gunakan host Node yang hidup untuk polling/evaluasi 30 detik; tidak perlu volume SQLite pada mode Supabase. Tes lokal memakai JWT bertanda tangan dan transport DB terkendali; ini bukan klaim bahwa Google OAuth/proyek Supabase live sudah diuji.

#### Mode sesi lokal

Tanpa konfigurasi Privy maupun Supabase, Node.js 22.15+ menyediakan `node:sqlite` (masih experimental pada versi ini). Development menyimpan `.vibe-data/vibe.sqlite`, diabaikan Git. Production mode lokal wajib `VIBE_STORE_PATH` pada volume persisten dan satu host Node yang terus hidup. Jangan gunakan filesystem sementara/serverless untuk timer dan saldo ini.

`src/instrumentation.ts` memeriksa API setiap 30 detik, termasuk saat tab ditutup. Saldo, kalibrasi, Call, dan hasil bertahan saat restart. Server yang mati sampai melewati jendela evaluasi 30 menit memicu void/refund, bukan hasil dari views terlambat. Cadangkan database menggunakan backup SQLite yang konsisten dengan WAL.

Player mencoba autoplay dengan suara. Jika browser memblokirnya, player melanjutkan tanpa suara dan tombol play dapat dipakai untuk mengaktifkan suara. Kontrol pemutaran VIBE hanya play/pause; branding dan elemen asli player YouTube tetap mengikuti aturan YouTube.

```sh
npm run typecheck
npm run lint
npm run build
npm run test:contract
npm run compile:contract
```

### Kontrak Foundry

`npm run test:contract` menguji 12 kasus commit–reveal dan resolusi. `npm run compile:contract` menghasilkan ABI dan bytecode di `out/HiveCallV2.sol/HiveCallV2.json`. Skrip deploy Foundry menolak chain selain Monad Testnet (10143). RPC yang dipakai adalah `https://testnet-rpc.monad.xyz`.

Untuk setiap Call, komitmen mengikat chain ID, alamat kontrak, Call ID, wallet, pilihan Ya/Tidak, nonce wallet, dan salt acak. Otorisasi relayer ditandatangani wallet melalui `personal_sign` dan memiliki deadline sendiri. Kontrak menerima satu komitmen per wallet/Call; reveal baru dapat dilakukan setelah penutupan efektif. Tally resmi tersedia setelah semua pilihan terungkap atau batas reveal terlewati. Hasil memakai snapshot yang waktu observasinya berada dalam 30 menit sejak evaluasi. Resolver tetap merupakan pihak tepercaya untuk angka dan waktu snapshot YouTube; hash di chain tidak mengubah API menjadi oracle trustless.

## Alur Call Shorts lokal

1. Isi key API YouTube dan jalankan server. Buka Discover. Setelah pengamatan 30 menit dan pertumbuhan positif, Call muncul pada maksimum satu video per kategori; Prediksi menunjukkan status pengamatan selama menunggu.
2. Ketuk Call di dock mobile atau katalog. Pilih Ya/Tidak dengan nominal 50 VIBE; potensi kembali 100 ditampilkan sebelum konfirmasi. Saldo dan pilihan disimpan di server, tanpa transaksi blockchain.
3. Buka Predictions untuk melihat kumpulan Call, lalu bagikan Call yang sama ke channel Community dan tulis pesan.
4. Pada evaluasi 6 jam: pilihan benar menerima 2×, salah tidak menerima pengembalian, void menerima refund. Bukti dan riwayat tersedia di detail/profil. Hasil live belum boleh diklaim sebelum evaluasi nyata; tes memakai waktu terkontrol.

## Arsitektur target

- Next.js/React untuk antarmuka dan API.
- Privy Google login dan embedded wallet; tanda tangan otorisasi eksplisit per Call.
- Kontrak V2 di Monad Testnet untuk commit, closeEarly, reveal, tally, resolve/void. `foundry.toml`, tes Solidity di `test/foundry`, dan skrip deploy di `script` menjadi sumber build kontrak. Skrip aplikasi membaca ABI/bytecode dari `out/HiveCallV2.sol/HiveCallV2.json`.
- Relayer VIBE membayar gas; resolver mengambil angka YouTube Data API. Bukti waktu pilihan dan hasil onchain tidak membuktikan kebenaran sumber YouTube secara trustless.
- Data sosial dan snapshot operasional disimpan offchain; event kontrak dapat diindeks Envio setelah alur inti stabil.

## Mengaktifkan alur live

1. Buat aplikasi Privy dengan Google login dan embedded EVM wallet. Salin app ID dan verification key ke `.env.local`.
2. Buat proyek Supabase baru dan jalankan [migrasi SQL](supabase/migrations/202610020001_hive_metropolis.sql). Simpan URL dan service-role key hanya di server.
3. Aktifkan YouTube Data API v3 dan buat API key. Operator harus memeriksa video dari kategori Gaming, Sports, atau Crypto, hak kurasi, dan status Shorts sebelum membuat Call.
4. Buat wallet operator khusus Testnet, isi `RELAYER_PRIVATE_KEY`, dan beri MON Testnet. Wallet ini menjadi owner, keeper, resolver, dan pembayar gas.
5. Buat kunci enkripsi pilihan 32 byte, misalnya `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, lalu isi `CHOICE_ENCRYPTION_KEY`. Simpan cadangan aman; tanpa kunci ini pilihan tidak bisa di-reveal.
6. Isi `OPERATOR_API_KEY` acak yang kuat. Jalankan `npm run compile:contract` dan `npm run test:contract`. Jalankan `npm run deploy:contract`; skrip membaca `.env.local`, menyimpan hash sebelum menunggu receipt, memverifikasi bytecode/peran, dan mengisi `NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS`. Bukti lokal berada di `.vibe-data/monad-deployment.json`. Jangan deploy sebelum kredensial dan gas Testnet siap.
7. Terbitkan Call nyata: `npm run create:call -- VIDEO_ID TARGET_VIEWS 6 "Judul" "Kreator"`. Skrip membaca baseline YouTube, membuat Call onchain, lalu menyimpan rekamannya di database. Jika database gagal setelah transaksi sukses, rekonsiliasi manual dari hash transaksi diperlukan.
8. Jalankan operator tick tiap 1–5 menit dengan `POST /api/operator/tick` dan header `Authorization: Bearer <OPERATOR_API_KEY>`. Tick mengambil snapshot, menutup dini pada 50% jarak baseline–target, melakukan reveal, lalu resolve atau void. Sumber yang gagal akan dicoba ulang sampai jendela evaluasi 30 menit berakhir. Di Railway production, instrumentation menjalankan keeper ini otomatis setiap menit. Jangan menjalankan scheduler tambahan atau mengekspos kunci operator ke browser.
9. Di halaman Predictions, “Buktikan pilihanmu” membuka `/live/calls/{id}`. Pengguna login, menandatangani digest spesifik Call, dan melihat hash commit setelah receipt sukses. Halaman yang sama menampilkan snapshot serta hash resolve/void.

`.env.example` adalah daftar variabel, bukan kredensial berfungsi. Mode demo tetap ditandai secara eksplisit meski alur live diaktifkan.

### Batasan operasional

- Relayer mengestimasi gas per transaksi dan mempunyai batas jumlah commit harian (`MAX_DAILY_COMMITS`, default 50). API juga membatasi 5 intent per akun dan 20 per IP per 24 jam. Multi-akun dan IP bersama tetap dapat mengganggu pembatasan; monitor sebelum membuka beta.
- Operator menyimpan pilihan terenkripsi dan dapat melihat plaintext saat reveal. Kerahasiaan terhadap operator **tidak dijamin**. Kontrak membuktikan komitmen dan hasil yang diumumkan, sedangkan kebenaran angka YouTube tetap bergantung pada API dan operator.
- Jika snapshot YouTube tidak tersedia selama jendela hasil 30 menit, tick mem-void Call. Penurunan views sebelum resolusi juga memicu void `metric_correction`; kontrak menolak resolve di bawah baseline atau angka closeEarly. Bukti snapshot menyertakan waktu, angka, sumber, dan hash. Koreksi views setelah resolusi memerlukan kebijakan sengketa manusia; belum otomatis.
- Operator mempunyai antrean transaksi dalam satu proses, tick tanpa overlap, dan rekonsiliasi commit/reveal serta status terminal dari chain. Ini bukan antrean terdistribusi: jalankan satu replica/worker dan periksa hash setelah gangguan jaringan. Pembuatan Call menyimpan bukti transaksi untuk rekonsiliasi manual bila penulisan database gagal.
- Reputasi Early & Right, Wilson lower bound, dan leaderboard bersyarat belum dihubungkan ke data onchain. Belum ada submission yang dapat mengklaim fitur itu berjalan.
- Pemeriksaan `npm audit --omit=dev` pada 9 Oktober 2026 melaporkan 23 advisory tingkat sedang, tanpa tingkat tinggi/kritis. `ws` 8.x dipatok ke versi patched melalui override. Privy 3.46.0 dipatok untuk rilis yang diuji; konektor Farcaster/Solana opsional tidak dipakai dan dikecualikan dari bundle. Advisory transitif wallet yang tersisa perlu ditinjau sebelum beta besar; jalankan audit lagi untuk rilis berikutnya. Audit dependency development masih memiliki temuan tingkat tinggi/kritis dan tidak boleh dianggap bersih.
- Channel dan komentar live belum tersambung ke database; halaman Community yang ada tetap demo lokal.

## Persiapan submission

Sebelum submission: deploy kontrak dan aplikasi, catat chain ID/alamat/hash contoh, uji dua akun end-to-end, siapkan demo publik ≤3 menit, lisensi/atribusi, dokumentasi deploy, serta isi portal. Kontrak Monad Testnet saat ini: **0x1a4914ec33c242b8fc781b3780c4bb0ab9bc09a5**. Bukti dan acceptance yang tersisa dicatat di [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md).

## Atribusi dan asal kode

Kode aplikasi dalam repositori ini dibuat sebagai proyek baru selama Metropolis. Repo HIVE lama dipakai hanya sebagai referensi produk; tidak ada file kode atau aset yang dipindahkan ke sini. Dependency open source tercantum di `package.json` dan `package-lock.json`. Discover memakai 20 YouTube Shorts pilihan (7 Gaming, 7 Sports, 6 Crypto) melalui player resmi. API memeriksa status publik, izin embed, durasi maksimal 3 menit, dan rasio vertikal sebelum menampilkan klip. Saat API gagal, feed menampilkan opsi mencoba lagi. Dua cuplikan CC BY 3.0 lama tetap tersimpan sebagai aset demo Prediksi; seluruh sumber dan kredit dicatat di [ASSETS.md](ASSETS.md).

AI coding tools digunakan untuk membantu penulisan kode, dokumentasi, dan peninjauan. Semua hasilnya perlu diuji dan ditinjau manusia sebelum submission.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
