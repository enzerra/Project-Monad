# HIVE Metropolis

HIVE menghubungkan Discover, Prediction, dan Community untuk konten Gaming. Repositori ini adalah **implementasi baru** untuk Metropolis Track 03. Konsep dan aturan produk ada di [PRD](HIVE_METROPOLIS_FINAL_PRD.md).

## Status saat ini

- Frontend interaktif memakai **fixtures berlabel demo** dan menyimpan pilihan/komentar hanya di browser.
- `contracts/HiveCallV2.sol` adalah implementasi awal protokol commit–reveal untuk Monad; alamat deployment belum ada.
- Halaman Result yang berlabel demo **bukan bukti transaksi atau snapshot YouTube nyata**.
- Kode integrasi Privy, relayer, database, API YouTube, dan proof live tersedia, tetapi **belum diaktifkan atau diuji end-to-end** karena kredensial belum tersedia.

## Jalankan lokal

Memerlukan Node.js 22.15+.

```sh
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Buka <http://localhost:3000>. Biarkan variabel pada `.env.local` kosong untuk mode demo. Jangan menaruh private key atau API key di variabel `NEXT_PUBLIC_` atau commit ke Git.

```sh
npm run typecheck
npm run lint
npm run build
npm run test:contract
```

## Alur demo lokal

1. Landing → Discover. Bandingkan kartu insight dan kartu yang mempunyai Call.
2. Buka `Satu detik sebelum clutch...` → `Buat prediksi` → pilih Ya/Tidak.
3. Lihat status pending lalu locked **lokal**. Tidak ada transaksi blockchain.
4. Bagikan ke Community; kartu membuka Call yang sama dan komentar dapat ditambah.
5. Buka `Speedrun...` untuk melihat skenario Result. Angka dan outcome pada layar itu adalah fixture.

## Arsitektur target

- Next.js/React untuk antarmuka dan API.
- Privy Google login dan embedded wallet; tanda tangan otorisasi eksplisit per Call.
- Kontrak V2 di Monad Testnet untuk commit, closeEarly, reveal, resolve/void.
- Relayer HIVE membayar gas; resolver mengambil angka YouTube Data API. Bukti waktu pilihan dan hasil onchain tidak membuktikan kebenaran sumber YouTube secara trustless.
- Data sosial dan snapshot operasional disimpan offchain; event kontrak dapat diindeks Envio setelah alur inti stabil.

## Mengaktifkan alur live

1. Buat aplikasi Privy dengan Google login dan embedded EVM wallet. Salin app ID dan verification key ke `.env.local`.
2. Buat proyek Supabase baru dan jalankan [migrasi SQL](supabase/migrations/202610020001_hive_metropolis.sql). Simpan URL dan service-role key hanya di server.
3. Aktifkan YouTube Data API v3 dan buat API key. Operator harus memeriksa video Gaming, hak kurasi, dan status Shorts sebelum membuat Call.
4. Buat wallet operator khusus Testnet, isi `RELAYER_PRIVATE_KEY`, dan beri MON Testnet. Wallet ini menjadi owner, keeper, resolver, dan pembayar gas.
5. Buat kunci enkripsi pilihan 32 byte, misalnya `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, lalu isi `CHOICE_ENCRYPTION_KEY`. Simpan cadangan aman; tanpa kunci ini pilihan tidak bisa di-reveal.
6. Isi `OPERATOR_API_KEY` acak yang kuat. Deploy kontrak dengan `npm run deploy:contract`, lalu isi `NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS` dari output.
7. Terbitkan Call nyata: `npm run create:call -- VIDEO_ID TARGET_VIEWS 6 "Judul" "Kreator"`. Skrip membaca baseline YouTube, membuat Call onchain, lalu menyimpan rekamannya di database. Jika database gagal setelah transaksi sukses, rekonsiliasi manual dari hash transaksi diperlukan.
8. Jalankan operator tick tiap 1–5 menit dengan `POST /api/operator/tick` dan header `Authorization: Bearer <OPERATOR_API_KEY>`. Tick mengambil snapshot, menutup dini pada 50% jarak baseline–target, melakukan reveal, lalu resolve atau void. Gunakan scheduler server yang tepercaya; jangan mengekspos kunci operator ke browser.
9. Di halaman Predictions, “Call nyata” membuka `/live/calls/{id}`. Pengguna login, menandatangani digest spesifik Call, dan melihat hash commit setelah receipt sukses. Halaman yang sama menampilkan snapshot serta hash resolve/void.

`.env.example` adalah daftar variabel, bukan kredensial berfungsi. Mode demo tetap ditandai secara eksplisit meski alur live diaktifkan.

### Batasan operasional

- Relayer mempunyai plafon 200.000 gas per commit dan batas jumlah commit harian (`MAX_DAILY_COMMITS`, default 50). API juga membatasi 5 intent per akun dan 20 per IP per 24 jam. Multi-akun dan IP bersama tetap dapat mengganggu pembatasan; monitor sebelum membuka beta.
- Operator menyimpan pilihan terenkripsi dan dapat melihat plaintext saat reveal. Kerahasiaan terhadap operator **tidak dijamin**. Kontrak membuktikan komitmen dan hasil yang diumumkan, sedangkan kebenaran angka YouTube tetap bergantung pada API dan operator.
- Jika snapshot YouTube gagal atau jendela hasil 15 menit lewat, tick mem-void Call. Bukti snapshot menyertakan waktu, angka, sumber, dan hash. Koreksi views setelah resolusi memerlukan kebijakan sengketa manusia; belum otomatis.
- Endpoint operator belum memiliki antrean terdistribusi atau rekonsiliasi transaksi otomatis. Jalankan satu worker; periksa status database dan chain setelah gangguan jaringan. Jangan gunakan live mode publik sebelum audit operasional ini.
- Reputasi Early & Right, Wilson lower bound, dan leaderboard bersyarat belum dihubungkan ke data onchain. Belum ada submission yang dapat mengklaim fitur itu berjalan.

## Persiapan submission

Sebelum submission: deploy kontrak dan aplikasi, catat chain ID/alamat/hash contoh, uji dua akun end-to-end, siapkan demo publik ≤3 menit, lisensi/atribusi, dokumentasi deploy, serta isi portal. **Belum ada alamat kontrak untuk dicantumkan.**

## Atribusi dan asal kode

Kode aplikasi dalam repositori ini dibuat sebagai proyek baru selama Metropolis. Repo HIVE lama dipakai hanya sebagai referensi produk; tidak ada file kode atau aset yang dipindahkan ke sini. Dependency open source tercantum di `package.json` dan `package-lock.json`. Ilustrasi media pada frontend dibuat dengan CSS; tidak ada video atau gambar kreator yang diunggah ulang.

AI coding tools digunakan untuk membantu penulisan kode, dokumentasi, dan peninjauan. Semua hasilnya perlu diuji dan ditinjau manusia sebelum submission.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
