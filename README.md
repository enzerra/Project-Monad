# HIVE Metropolis

HIVE menghubungkan Discover, Prediction, dan Community untuk konten Gaming. Repositori ini adalah **implementasi baru** untuk Metropolis Track 03. Konsep dan aturan produk ada di [PRD](HIVE_METROPOLIS_FINAL_PRD.md).

## Status saat ini

- Frontend interaktif memakai **fixtures berlabel demo** dan menyimpan pilihan/komentar hanya di browser.
- `contracts/HiveCallV2.sol` adalah kontrak commit–reveal untuk Monad yang dibangun dan diuji dengan Foundry; alamat deployment belum ada.
- Halaman Result yang berlabel demo **bukan bukti transaksi atau snapshot YouTube nyata**.
- Kode integrasi Privy, relayer, database, API YouTube, dan proof live tersedia, tetapi **belum diaktifkan atau diuji end-to-end** karena kredensial belum tersedia.

## Jalankan lokal

Memerlukan Node.js 22.15+ dan [Foundry](https://getfoundry.sh/getting-started/installation/) (`forge` tersedia di PATH).

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
npm run compile:contract
```

### Kontrak Foundry

`npm run test:contract` menguji 12 kasus commit–reveal dan resolusi. `npm run compile:contract` menghasilkan ABI dan bytecode di `out/HiveCallV2.sol/HiveCallV2.json`. Skrip deploy Foundry menolak chain selain Monad Testnet (10143). RPC yang dipakai adalah `https://testnet-rpc.monad.xyz`.

Untuk setiap Call, komitmen mengikat chain ID, alamat kontrak, Call ID, wallet, pilihan Ya/Tidak, nonce wallet, dan salt acak. Otorisasi relayer ditandatangani wallet melalui `personal_sign` dan memiliki deadline sendiri. Kontrak menerima satu komitmen per wallet/Call; reveal baru dapat dilakukan setelah penutupan efektif. Tally resmi tersedia setelah semua pilihan terungkap atau batas reveal terlewati. Hasil memakai snapshot yang waktu observasinya berada dalam 30 menit sejak evaluasi. Resolver tetap merupakan pihak tepercaya untuk angka dan waktu snapshot YouTube; hash di chain tidak mengubah API menjadi oracle trustless.

## Alur demo lokal

1. Buka `/` untuk masuk langsung ke Discover. Bandingkan video insight dan video dengan Call.
2. Pilih Ya/Tidak pada Call di samping video. Status pilihan demo disimpan **lokal**; tidak ada transaksi blockchain.
3. Buka Predictions untuk melihat kumpulan Call, lalu bagikan Call yang sama ke channel Community dan tulis pesan.
4. Buka hasil Call Speedrun untuk melihat skenario Result. Angka dan outcome pada layar itu adalah fixture.

## Arsitektur target

- Next.js/React untuk antarmuka dan API.
- Privy Google login dan embedded wallet; tanda tangan otorisasi eksplisit per Call.
- Kontrak V2 di Monad Testnet untuk commit, closeEarly, reveal, tally, resolve/void. `foundry.toml`, tes Solidity di `test/foundry`, dan skrip deploy di `script` menjadi sumber build kontrak. Skrip aplikasi membaca ABI/bytecode dari `out/HiveCallV2.sol/HiveCallV2.json`.
- Relayer HIVE membayar gas; resolver mengambil angka YouTube Data API. Bukti waktu pilihan dan hasil onchain tidak membuktikan kebenaran sumber YouTube secara trustless.
- Data sosial dan snapshot operasional disimpan offchain; event kontrak dapat diindeks Envio setelah alur inti stabil.

## Mengaktifkan alur live

1. Buat aplikasi Privy dengan Google login dan embedded EVM wallet. Salin app ID dan verification key ke `.env.local`.
2. Buat proyek Supabase baru dan jalankan [migrasi SQL](supabase/migrations/202610020001_hive_metropolis.sql). Simpan URL dan service-role key hanya di server.
3. Aktifkan YouTube Data API v3 dan buat API key. Operator harus memeriksa video Gaming, hak kurasi, dan status Shorts sebelum membuat Call.
4. Buat wallet operator khusus Testnet, isi `RELAYER_PRIVATE_KEY`, dan beri MON Testnet. Wallet ini menjadi owner, keeper, resolver, dan pembayar gas.
5. Buat kunci enkripsi pilihan 32 byte, misalnya `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, lalu isi `CHOICE_ENCRYPTION_KEY`. Simpan cadangan aman; tanpa kunci ini pilihan tidak bisa di-reveal.
6. Isi `OPERATOR_API_KEY` acak yang kuat. Jalankan `npm run compile:contract` dan `npm run test:contract`. Untuk deploy Foundry, masukkan `RELAYER_PRIVATE_KEY` ke environment terminal yang menjalankan Forge, lalu jalankan `npm run deploy:contract`. Ambil alamat dari output/broadcast Foundry dan isi `NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS`. Jangan deploy sebelum kredensial dan gas Testnet siap.
7. Terbitkan Call nyata: `npm run create:call -- VIDEO_ID TARGET_VIEWS 6 "Judul" "Kreator"`. Skrip membaca baseline YouTube, membuat Call onchain, lalu menyimpan rekamannya di database. Jika database gagal setelah transaksi sukses, rekonsiliasi manual dari hash transaksi diperlukan.
8. Jalankan operator tick tiap 1–5 menit dengan `POST /api/operator/tick` dan header `Authorization: Bearer <OPERATOR_API_KEY>`. Tick mengambil snapshot, menutup dini pada 50% jarak baseline–target, melakukan reveal, lalu resolve atau void. Sumber yang gagal akan dicoba ulang sampai jendela evaluasi 30 menit berakhir. Gunakan scheduler server yang tepercaya; jangan mengekspos kunci operator ke browser.
9. Di halaman Predictions, “Call nyata” membuka `/live/calls/{id}`. Pengguna login, menandatangani digest spesifik Call, dan melihat hash commit setelah receipt sukses. Halaman yang sama menampilkan snapshot serta hash resolve/void.

`.env.example` adalah daftar variabel, bukan kredensial berfungsi. Mode demo tetap ditandai secara eksplisit meski alur live diaktifkan.

### Batasan operasional

- Relayer mempunyai plafon 200.000 gas per commit dan batas jumlah commit harian (`MAX_DAILY_COMMITS`, default 50). API juga membatasi 5 intent per akun dan 20 per IP per 24 jam. Multi-akun dan IP bersama tetap dapat mengganggu pembatasan; monitor sebelum membuka beta.
- Operator menyimpan pilihan terenkripsi dan dapat melihat plaintext saat reveal. Kerahasiaan terhadap operator **tidak dijamin**. Kontrak membuktikan komitmen dan hasil yang diumumkan, sedangkan kebenaran angka YouTube tetap bergantung pada API dan operator.
- Jika snapshot YouTube tidak tersedia selama jendela hasil 30 menit, tick mem-void Call. Penurunan views sebelum resolusi juga memicu void `metric_correction`; kontrak menolak resolve di bawah baseline atau angka closeEarly. Bukti snapshot menyertakan waktu, angka, sumber, dan hash. Koreksi views setelah resolusi memerlukan kebijakan sengketa manusia; belum otomatis.
- Endpoint operator belum memiliki antrean terdistribusi atau rekonsiliasi transaksi otomatis. Jalankan satu worker; periksa status database dan chain setelah gangguan jaringan. Jangan gunakan live mode publik sebelum audit operasional ini.
- Reputasi Early & Right, Wilson lower bound, dan leaderboard bersyarat belum dihubungkan ke data onchain. Belum ada submission yang dapat mengklaim fitur itu berjalan.
- `npm audit --omit=dev` saat ini melaporkan advisory pada dependency transitif wallet, termasuk satu tingkat tinggi (`ws`). Tinjau dan perbarui rantai dependency sebelum publikasi. Build juga memberi peringatan optional peer `@farcaster/mini-app-solana` dari Privy; build tetap selesai.
- Channel dan komentar live belum tersambung ke database; halaman Community yang ada tetap demo lokal.

## Persiapan submission

Sebelum submission: deploy kontrak dan aplikasi, catat chain ID/alamat/hash contoh, uji dua akun end-to-end, siapkan demo publik ≤3 menit, lisensi/atribusi, dokumentasi deploy, serta isi portal. **Belum ada alamat kontrak untuk dicantumkan.**

## Atribusi dan asal kode

Kode aplikasi dalam repositori ini dibuat sebagai proyek baru selama Metropolis. Repo HIVE lama dipakai hanya sebagai referensi produk; tidak ada file kode atau aset yang dipindahkan ke sini. Dependency open source tercantum di `package.json` dan `package-lock.json`. Dua cuplikan video berlisensi CC BY 3.0 dipakai untuk demo Discover; sumber, kredit, dan lisensinya dicatat di [ASSETS.md](ASSETS.md).

AI coding tools digunakan untuk membantu penulisan kode, dokumentasi, dan peninjauan. Semua hasilnya perlu diuji dan ditinjau manusia sebelum submission.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
