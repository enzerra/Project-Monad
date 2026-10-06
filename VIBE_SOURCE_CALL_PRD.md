# VIBE — Call Shorts dan saldo server

Tanggal: 5 Oktober 2026. Pengguna menyetujui saldo gratis, hasil dari views YouTube nyata, dan pengembalian tetap 2× untuk pilihan benar. Ini menggantikan aturan saldo browser/tanpa hadiah kredit di addendum 4 Oktober. VIBE tidak mempunyai nilai uang, pembelian, transfer, token onchain, atau cash-out.

## Saldo dan identitas

- Server memberi 1.000 VIBE sekali per sesi anonim. Nominal bulat 10–500 VIBE; default 50.
- Cookie HttpOnly, SameSite=Lax, Secure dalam production mengenali sesi. Belum ada login/sinkronisasi lintas perangkat. Menghapus cookie memutus akses ke saldo sesi tersebut.
- SQLite menyimpan saldo, pilihan, Call, dan bukti. Debit/hasil/hadiah berada dalam transaksi atomik. Duplikat ditolak. Client tidak dapat menentukan saldo, target, hasil, atau multiplier.
- Benar: kredit kembali = 2 × nominal, termasuk nominal awal. Contoh 1.000 → pasang 50 → 950 → benar → 1.050. Salah: tetap 950. Void: kembali 1.000.
- Settlement, reward, atau refund hanya sekali setelah polling ulang, restart, maupun request bersamaan.
- Saldo/riwayat browser lama tidak diimpor karena data tersebut tidak tepercaya. Arsip lokal tidak dihapus; Call fixture tidak menerima kredit server.

## Penerbitan Call

- Hanya 20 Shorts terkurasi. Dua observasi API nyata harus berjarak minimal 30 menit, dengan pertumbuhan views positif.
- Maksimal satu Call aktif per kategori Gaming, Sports, dan Crypto. Pilih kandidat dengan proyeksi kenaikan terbesar; tidak semua Shorts mempunyai Call.
- Horizon awal 6 jam. Proyeksi = ceil((views kedua − views pertama) × 6 jam / jarak observasi). Target = baseline + max(100, proyeksi). Proyeksi bukan peluang atau harga pasar.
- Baseline, target, dua observasi kalibrasi, waktu buka/tutup/evaluasi, multiplier 2, dan ruleVersion dibekukan saat Call diterbitkan.
- Pilihan tutup setelah 90 menit atau dini saat views mencapai baseline + ceil((target − baseline) / 2).
- Server memeriksa status, tenggat, saldo, dan views segar (maksimum 90 detik) saat konfirmasi. Pilihan ditolak tanpa debit jika sumber usang.

## Data dan evaluasi

- Worker Node memeriksa YouTube setiap 30 detik. UI saldo/Call memuat snapshot server setiap 15 detik; pill views video setiap 30 detik. Tidak ada interpolasi atau pertambahan views buatan.
- Angka dapat tetap sama sampai YouTube melaporkan pembaruan. Ini polling data nyata, bukan stream yang dijamin setiap detik.
- Hasil memakai observasi valid pertama pada/setelah evaluasi, maksimal 30 menit terlambat. Views ≥ target = Ya; views < target = Tidak. Snapshot sebelum tenggat tidak dapat menyelesaikan Call.
- API gagal: pertahankan angka terakhir dan waktu observasinya. Tunggu dalam jendela evaluasi. Setelah habis tanpa bukti valid, void dan refund.
- Views saat evaluasi di bawah puncak yang pernah diamati juga void karena koreksi metrik.
- Bukti menyimpan video ID, views, waktu observasi, sumber, target, ruleVersion, dan SHA-256. Ini pemeriksaan oleh server tepercaya, bukan oracle trustless atau proof Monad. Polling berikutnya tidak mengubah hasil final.

## Operasional

- Memerlukan Node.js 22.15+ dengan node:sqlite (experimental pada Node versi ini).
- Development memakai .vibe-data/vibe.sqlite, diabaikan Git. Production wajib VIBE_STORE_PATH pada volume persisten dan satu host Node yang terus hidup; bukan filesystem sementara/serverless.
- Collector pada src/instrumentation.ts berjalan saat tab ditutup selama server hidup. Restart mempertahankan saldo, kalibrasi, Call, dan settlement.
- Jika server mati hingga lewat jendela hasil tanpa snapshot, Call void; tidak merekonstruksi views historis dari angka sekarang.
- Cadangkan SQLite menggunakan mekanisme backup SQLite yang konsisten dengan WAL. Backend saldo menolak production tanpa path persisten.
- Jalur commit–reveal HiveCallV2/Privy/Supabase/relayer tetap terpisah dan belum dikonfigurasi. Saldo gratis ini tidak menandatangani transaksi blockchain.
- Community/komentar tetap tersimpan lokal. Tidak ada klaim chat tersinkron antaruser.

## Verifikasi

Tes mencakup debit/duplikat/overspend, tenggat, early close, kedua sisi hasil, target tepat tercapai, hadiah sekali, source outage, koreksi views, rollback SQLite, restart penyimpanan, origin request, dan isolasi sesi. Tes hasil 6 jam memakai waktu terkontrol; hasil live tidak diklaim sebelum evaluasi nyata.
