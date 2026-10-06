# HIVE — PRD Final untuk Metropolis Hackathon

> **Addendum 5 Oktober 2026:** nama produk VIBE. Call Shorts dan saldo gratis kini memakai penyimpanan server, metrik YouTube nyata, dan pengembalian kredit 2× sesuai [PRD Call Shorts](VIBE_SOURCE_CALL_PRD.md). Ini jalur kredit gratis terpisah dari commit–reveal Monad. Larangan nilai uang, stake finansial, token finansial onchain, dan cash-out tetap berlaku.

**Versi:** 2.0, 1 Oktober 2026  
**Status:** spesifikasi build; tidak menyatakan fitur telah terimplementasi  
**Track:** 03 — Social, Attention & Culture  
**Irisan MVP:** Discover Shorts Gaming → Call views → share/komentar komunitas → commit–reveal dan hasil di Monad Testnet

## 1. Inti produk

HIVE menghubungkan **Discover, Prediction, dan Channel Community**. Pengguna menemukan konten menarik, mengambil posisi sebelum hasil diketahui jika tersedia pertanyaan terukur, membahas alasannya, lalu kembali untuk melihat hasil dan rekam jejak. Sebagian video adalah **insight tanpa prediksi**. CTA hanya muncul untuk Call yang terkurasi dan dapat diselesaikan.

Janji produk: **“Temukan lebih awal. Buat prediksimu. Buktikan bersama komunitas.”** Pembeda HIVE adalah **Early & Right**: siapa melihat potensi konten lebih awal dan terbukti benar. Tidak ada stake, taruhan, token, payout, cash-out, atau hadiah finansial pada MVP.

Gaming adalah kategori awal karena komunitas dan bahasa HIVE berakar pada game; satu fokus menjaga kurasi dan percakapan tidak tersebar. Visi jangka panjang mencakup musik, olahraga, dan budaya lain. Contoh prediksi lagu +10.000 views/8 jam atau Argentina vs Brasil menjelaskan visi, **bukan** template yang langsung dibuka dalam demo.

## 2. Kesesuaian dengan Metropolis

Nilai inti HIVE adalah hubungan sosial, partisipasi budaya, dan komunitas, sehingga cocok untuk **Track 03**. Monad **wajib ada dalam perjalanan produk**, bukan integrasi tambahan: pengguna memilih, transaksi commit dikonfirmasi di Monad Testnet sebelum tenggat, pilihan di-reveal setelah penutupan, dan hasil/void diumumkan dengan bukti transaksi. Kontrak membuktikan waktu serta integritas komitmen dan hasil yang diumumkan. Kontrak **tidak memverifikasi angka YouTube** secara trustless.

Rules & Guidelines yang dilampirkan pengguna mensyaratkan produk bekerja di Monad mainnet/testnet, GitHub publik dengan source lengkap, README setup, lisensi open source, atribusi eksternal, riwayat commit dalam masa build, dokumentasi, dan video demo publik **maksimal 3 menit** yang memperlihatkan produk serta interaksi blockchain nyata. Satu submission hanya masuk satu track; penggunaan AI coding tools harus diungkap di README. Kriteria penilaian masing-masing berbobot **20%**: kualitas produk, keunggulan teknis, integrasi Monad, kesesuaian track, dan inovasi/dampak. Aturan dapat diperbarui penyelenggara.

Tenggat pada Terms yang dilampirkan: **13 Oktober 2026, 23.59 ET = 14 Oktober 2026, 10.59 WIB**; dashboard juga menampilkan 14 Oktober 10.59 GMT+7. Periksa portal sebelum submit karena timestamp portal yang menentukan. [Ringkasan publik Metropolis](https://www.risein.com/monad/monad-metropolis-hackathon) mengonfirmasi track dan tanggal umum; rincian jam di sini berasal dari lampiran pengguna.

## 3. Pengguna dan masalah

Penonton menemukan video lebih awal, fan berdebat tentang potensinya di chat, lalu kehilangan konteks saat hasil datang. Poll biasa tidak membuktikan kapan seseorang memilih atau bagaimana hasilnya. HIVE menyatukan konten, pertanyaan, pilihan, percakapan, waktu, snapshot, dan hasil.

| Peran | Kebutuhan | Nilai MVP |
|---|---|---|
| Penonton Gaming | Menemukan konten tanpa kewajiban memilih | Feed insight dan Call |
| Pengamat tren/fan | Menyatakan pendapat sebelum ramai | Pilihan terkunci, bukti waktu, Early & Right |
| Anggota komunitas | Membagikan alasan dan bereaksi | Channel publik, kartu share, komentar per Call |
| Kurator | Menjaga kualitas Call dan hasil | Snapshot, aturan, resolver, void, audit |

## 4. Model tiga pilar

- **Content:** video sumber, kreator, konteks, topik, status embed, dan status editorial: `insight`, `predictable`, `resolved story`.
- **Call:** pertanyaan Ya/Tidak terkurasi pada satu Content, dengan baseline, target absolut, sumber, horizon, waktu, versi aturan, snapshot, status, dan bukti. MVP maksimal satu Call aktif per video.
- **Channel:** ruang publik bertema Gaming. Kartu share menunjuk Content/Call **yang sama**, bukan salinan prediksi; statusnya mengikuti objek asal.
- **Choice:** satu pilihan per akun dan wallet per Call, terikat pada commit dan reveal.

Alur: `Content → Call opsional → Choice → Result → diskusi/replay`. Channel dapat mengirim orang ke Call, dan Call dapat dibagikan ke channel. Video insight tetap menyediakan tonton, simpan, dan diskusi tanpa CTA prediksi palsu.

## 5. Alur dan layar

1. **Landing → Discover:** publik dapat melihat feed, detail, hasil, dan channel publik. Login Google diperlukan untuk memilih, menyimpan, atau berkomentar. Home setelah login adalah Discover.
2. **Discover:** feed Shorts Gaming terkurasi mencampur insight, Call terbuka, dan cerita hasil. Kartu Call menampilkan pertanyaan serta tenggat, kartu insight tidak memiliki CTA prediksi.
3. **Content/Call Detail:** video via embed/tautan sumber, konteks, baseline, target akhir, tenggat pilihan, waktu evaluasi, aturan penutupan dini, sumber data, dan diskusi.
4. **Choice:** pengguna memilih Ya/Tidak dan memberi otorisasi spesifik per Call. `pending` berubah menjadi `locked` hanya setelah transaksi commit sah dikonfirmasi sebelum penutupan. Tampilkan block time dan explorer link. Tally peserta lain tersembunyi sampai reveal selesai.
5. **Channel:** pengguna membagikan Call yang sama; pembaca membuka kartu dan dapat memilih selama Call terbuka. Komentar melekat pada Call.
6. **Result:** pengguna kembali melalui feed/channel/profil untuk melihat snapshot, hasil atau void, bukti transaksi, dan perubahan riwayat.

Navigasi: **Discover · Predictions · Community · Profile**. Layar pendukung: Landing, Content/Call, Result/Proof, Settings/Wallet, Operator Console. Status kosong, pending, gagal, expired, dan void wajib jujur. Mobile diprioritaskan; alur inti juga dapat dipakai dengan keyboard.

## 6. Aturan Call Gaming

MVP memakai **YouTube Shorts publik kategori Gaming**. Pertanyaan kanonik: apakah `statistics.viewCount` dari YouTube Data API mencapai `targetViews` saat evaluasi. Copy “Naik ≥10.000 views dalam 6 jam?” harus disertai angka konkret di detail, misalnya **baseline 12.000 → target 22.000 views**. Jangan membiarkan pengguna menebak apakah target relatif atau absolut.

Hanya kurator menerbitkan Call. `videoId`, `baselineViews`, `targetViews`, `openedAt`, `scheduledClosesAt`, `evaluationAt`, `revealDeadline`, sumber, dan versi aturan dikunci sebelum terbit. Horizon **6 atau 24 jam**; pilihan terjadwal tutup pada 25% pertama horizon: **90 menit** atau **6 jam**. Dua snapshot pra-terbit berjarak ≥30 menit dipakai untuk kalibrasi; target harus melebihi baseline dan punya alasan. Parameter Call aktif tidak dapat diubah.

**Penutupan dini:** ketika snapshot API mencapai `baselineViews + 0,5 × (targetViews − baselineViews)` sebelum tenggat terjadwal, keeper mengirim `closeEarly` onchain dengan hash snapshot. Ini adalah **50% jarak dari baseline ke target**, bukan 50% angka target mentah yang dapat langsung terlampaui saat Call dibuka. Penutupan dini **tidak membuat Call void**; pilihan sah tetap dievaluasi pada horizon semula. Jika target penuh telah tercapai saat baru terdeteksi, tutup dini dan catat keterlambatan deteksi. Kontrak memakai block transaksi close sebagai batas efektif; commit yang mined sebelumnya tetap sah. UI tidak mengklaim penutupan berlaku surut.

Pada `evaluationAt = openedAt + horizon`, resolver memakai snapshot API pertama yang valid pada/ setelah waktu tersebut dalam jendela maksimal **30 menit**. Hasil **Ya** bila `viewCount ≥ targetViews`, selain itu **Tidak**. Proof menampilkan angka, waktu snapshot aktual, target, video, status sumber, versi aturan, dan hash transaksi. Ini adalah angka API saat pemeriksaan, bukan angka yang dijamin tepat pada detik tenggat. [Dokumentasi YouTube](https://developers.google.com/youtube/v3/docs/videos), [videos.list](https://developers.google.com/youtube/v3/docs/videos/list).

Sebelum beta terbuka, amati **≥20 Shorts Gaming** selama 6/24 jam untuk membandingkan angka API dan halaman YouTube, lag, koreksi, serta ketersediaan embed. Bila sumber tidak andal, tahan penerbitan dan ubah aturan **untuk Call berikutnya** dengan versi baru. Ikuti aturan atribusi, embed, penyimpanan, dan penyegaran data YouTube. [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies).

## 7. Commit–reveal di Monad

**Keputusan wajib: commit–reveal sungguhan.** Kontrak V2 menyimpan hash pilihan yang terikat ke `chainId`, alamat kontrak, `callId`, wallet, pilihan, nonce, dan salt acak. Pilihan plaintext tidak dikirim ke chain selama voting terbuka. Pengguna menandatangani otorisasi commit **per Call**; relayer HIVE membayar gas dan mengirim transaksi. Kontrak memeriksa tanda tangan, nonce, deadline, dan satu commit per wallet/Call. Backend juga membatasi satu pilihan per akun/Call. Klik atau transaksi pending bukan bukti locked.

HIVE menyimpan pilihan dan salt terenkripsi di server untuk reveal otomatis. Kontrak **menolak reveal sebelum `effectiveClosesAt`**, termasuk setelah closeEarly, dan memverifikasi hash. Relayer melakukan reveal setelah penutupan, dengan retry idempoten; pengguna dapat memicu retry. `revealDeadline` dikunci saat publikasi dan minimal satu jam setelah penutupan terjadwal, sehingga closeEarly tidak memperpendek janji waktu retry. Reveal individu yang gagal sampai batas berstatus `unrevealed` dan tidak masuk tally/reputasi; gangguan massal meng-void seluruh Call. Tally resmi tampil saat semua pilihan sah terungkap atau deadline reveal lewat.

**Operator mengetahui plaintext sebelum reveal** karena mengelola data terenkripsi dan proses otomatis. Privasi yang dijanjikan adalah terhadap pengguna lain dan pembaca chain, bukan operator. Audit log, API, analytics, dan backup agar pilihan tidak bocor. Resolver menandatangani snapshot/keputusan; kontrak menolak resolve sebelum `evaluationAt` dan hasil kedua, serta mencatat void/cancel dengan hash alasan. Klaim pitch yang tepat: **waktu komitmen, pilihan yang tidak dapat diganti, dan hasil yang diumumkan dapat diperiksa onchain**. Kebenaran metrik YouTube tetap mengandalkan sumber API dan operator.

Kontrak lama `HivePulse.sol` pada proyek HIVE terdahulu belum memenuhi gate reveal dan otorisasi relayer; perlu kontrak **V2, tes, dan deployment baru**. Migrasi database yang sudah berjalan tidak diubah; tambahkan migrasi Call, commit, snapshot, audit, dan reputasi.

## 8. Wallet, gas, dan anti-abuse

Google adalah auth utama; wallet EVM ditautkan ke akun. **Tanda tangan eksplisit per Call adalah default hackathon.** Privy embedded wallet adalah kandidat, tetapi integrasi Monad dan signer harus diuji. Delegasi 24 jam/maksimal lima Call per hari baru boleh dirilis bila pembatasan kontrak, chain, metode, nonce, expiry, dan pencabutan benar-benar ditegakkan di provider **dan** kontrak. Gas dibayar relayer HIVE, bukan asumsi bahwa provider mensponsorinya. [Privy authentication](https://docs.privy.io/authentication), [delegated signer](https://docs.privy.io/wallets/using-wallets/signers/delegate-wallet), [wallet policies](https://docs.privy.io/security/wallet-infrastructure/policy-and-controls).

Guardrail awal yang dapat dikonfigurasi: **1** commit per Call per akun dan wallet; maksimal **5** commit sponsor per akun/24 jam, **20** per IP/24 jam, **3** wallet baru per IP/24 jam, **200** transaksi sponsor global/hari, dan plafon gas harian dalam MON testnet. Anggaran menghitung commit, reveal, closeEarly, resolve, dan retry. Jika plafon habis, hentikan sebelum tanda tangan serta jelaskan bahwa pilihan belum terkunci. Gunakan idempotency key dan monitoring pending.

Google + wallet **tidak membuktikan satu manusia**. Multi-akun dapat melakukan hedging Ya/Tidak. IP dan rate limit hanya mengurangi abuse; leaderboard memerlukan sampel minimum serta review anomali. Jangan mengklaim sybil resistance lebih kuat daripada mekanisme yang benar-benar berjalan.

## 9. Reputasi dan leaderboard

Waktu Choice adalah **block timestamp commit sah**. Label Early memakai 20% **jendela terjadwal**, bukan penutupan aktual, supaya closeEarly tidak mengubah label secara retroaktif. Batas Early: **18 menit** setelah buka untuk Call 6 jam; **72 menit** untuk 24 jam. Early yang salah tetap salah.

Profil menampilkan `benar / semua Call sah`, `Early & Right / semua Call sah`, `benar / semua Early Call sah`, dan ukuran sampel. Void, cancelled, dan unrevealed tidak masuk penyebut tetapi tetap terlihat di riwayat. Brier score tidak dipakai karena input hanya Ya/Tidak, bukan probabilitas.

Leaderboard resmi mensyaratkan akun berusia **≥24 jam**, **≥20 Call sah selesai**, **≥5 Early Call sah**, dan lolos review anti-abuse. Urutan memakai **Wilson lower bound 95%** untuk `Early & Right / semua Call sah`; Wilson lower bound akurasi menjadi tie-breaker. Rasio mentah dan ukuran sampel selalu tampil. **Leaderboard dapat kosong saat beta baru mulai**; jangan isi dengan bot atau angka sintetis.

## 10. Status dan kasus tepi

Status Call: `draft → open → closed → revealing → pending_result → resolved/void`; `cancelled` hanya sebelum commit sah pertama. Transisi idempoten dan diaudit.

| Kasus | Aturan |
|---|---|
| Ambang 50% jarak atau target penuh tercapai sebelum scheduled close | `closeEarly` onchain; tetap evaluasi pada horizon, bukan void |
| API gagal sampai 30 menit setelah evaluasi | Void `source_unavailable`; tidak ada hasil buatan |
| Views turun akibat koreksi sebelum hasil | Void `metric_correction`; tampilkan snapshot terkait |
| Video privat/dihapus | Void jika sumber hasil tak dapat diperiksa |
| Embed gagal tetapi sumber/API masih valid | Call berjalan, sediakan tautan YouTube |
| Salah terbit sebelum commit | Cancel dengan alasan; setelah commit gunakan void |
| Commit mined setelah penutupan | `failed/expired`, bukan locked |
| Reveal individu gagal | Retry, lalu `unrevealed` setelah deadline |
| Reveal sistemik gagal | Void `system_integrity_void` |
| Angka direvisi setelah hasil sah | Jangan resettle diam-diam; tandai dasar snapshot historis |

Hasil/void onchain menyertakan hash alasan dan proof publik. Call void tidak mengubah reputasi.

## 11. Scope Community dan non-goals

MVP cukup **satu atau sedikit channel publik Gaming terkurasi**, kartu share Content/Call, dan komentar per Call. Operator dapat menyembunyikan spam dengan log tindakan. Ini membuktikan hubungan antarpilar tanpa membangun aplikasi chat penuh.

Roadmap: nested thread, channel privat, DM, notifikasi kaya, laporan/moderasi lengkap, feed algoritmik, sumber TikTok/Instagram, prediksi musik, dan prediksi pertandingan. TikTok Display API membutuhkan izin serta otorisasi untuk daftar video; pengalaman feed ala TikTok tidak berarti akses bebas ke semua video. [TikTok Display API](https://developers.tiktok.com/docs/en/display-api-get-started). Prediksi bola memerlukan sumber skor yang disepakati dan aturan 90 menit/extra time, penundaan, dan pembatalan sebelum diterbitkan.

Model Human → Squad → Hive serta Arena tujuh fase dari konsep sebelumnya adalah kemungkinan mode kompetisi lain; tidak menjadi prasyarat Call atau channel pada MVP. Di luar scope juga: prediksi resmi buatan semua pengguna, engagement palsu, upload ulang video pihak ketiga, taruhan, market, token, dan klaim oracle YouTube trustless.

## 12. Supply, demo, dan paket submission

Siapkan **≥6 kandidat Shorts Gaming** dengan snapshot awal, target operasional **3 Call aktif**, setidaknya satu hasil yang matang untuk demo, serta insight tanpa Call. Kurator memeriksa ulang angka tepat sebelum publikasi. Bila tidak ada Call aktif, tampilkan empty state dan hasil lama. Jangan membuat view, komentar, anggota, atau hasil palsu.

**Demo video ≤3 menit:** 0:00–0:25 masalah dan feed insight/Call; 0:25–1:15 pilihan dan transaksi commit nyata di Monad explorer; 1:15–1:45 share kartu ke channel dan buka Call yang sama; 1:45–2:35 Call lain yang sudah matang, reveal, hasil, snapshot, proof; 2:35–3:00 Early & Right dan batas klaim onchain. Dua Call berbeda boleh dipakai agar video tidak menunggu enam jam, tetapi keduanya harus nyata.

README mencantumkan alamat kontrak, chain ID, hash contoh, setup/deployment, lisensi, atribusi, bagian pra-hackathon yang digunakan kembali, dan pengungkapan AI coding tools. Repo publik, video publik, serta formulir portal diselesaikan sebelum tenggat.

## 13. Metrik dan gerbang rilis

| Metrik | Target pemeriksaan awal |
|---|---|
| Pemahaman | 5/5 penguji baru membedakan insight/Call dan menemukan proof tanpa bantuan |
| Aktivasi | Median ≤5 menit dari login ke commit sah pertama pada penguji yang mencoba Call |
| Kembali memilih | ≥25% akun dengan Call sah membuat Call kedua dalam 7 hari; sertakan jumlah absolut |
| Integritas | 0 perubahan setelah lock, 0 commit ganda dinilai, 0 tally bocor, 0 hasil tanpa snapshot valid |
| Resolusi | Rasio void <10%; bila sampel <30, laporkan jumlah, bukan klaim stabil |
| Tiga pilar | Ukur Discover→Call, Call→share channel, channel→Call, dan kembali ke hasil |
| Sumber dan operasi | ≥20 kandidat dipantau; 100% Call punya baseline, rule version, alasan target, dan proof |

**Gerbang build:** tes kontrak V2 untuk deadline, closeEarly, nonce, double commit, reveal gate, unrevealed, void, resolve sekali; dua akun riil end-to-end; pengamatan API 6/24 jam; uji plafon relayer dan status kosong/void. **Gerbang submission:** produk live, transaksi Monad terverifikasi, demo ≤3 menit, GitHub publik lengkap, dan portal menerima submission.

## 14. Urutan build

1. Spike YouTube snapshot dan wallet–Monad–relayer; kontrak V2 beserta tes menjadi **jalur kritis pertama**.
2. Selesaikan commit–reveal, closeEarly, resolver, dan proof page dengan transaksi dua akun nyata.
3. Bangun model Content–Call–Channel, feed insight/CTA, kurasi, dan kartu share sederhana.
4. Tambahkan profil, reputasi, guardrail gas, edge states, dan observabilitas operator.
5. Uji sumber, rekam demo asli, audit README/lisensi/atribusi, dan submit.

**Definisi selesai:** pengguna menemukan Shorts Gaming, membuat pilihan yang dikomit pada Monad sebelum tenggat, membagikan Call yang sama ke channel, lalu melihat reveal serta hasil/void dengan sumber dan transaksi. Fitur lain tidak boleh menunda irisan ini.

## 15. Audit aturan dan strategi bounty (2 Oktober 2026)

**Status kepatuhan:** konsep dan scope PRD selaras dengan deskripsi Track 03 dalam Terms yang dilampirkan. **Submission belum dapat dinyatakan memenuhi aturan** sampai produk benar-benar dideploy di Monad, transaksi dan demo nyata tersedia, repo publik lengkap, dokumen/lisensi/atribusi/riwayat build siap, serta formulir portal diterima. Jika memakai kode HIVE yang dibuat sebelum 1 September 2026, README wajib mengidentifikasinya dan menunjukkan fungsi baru yang substansial selama jendela hackathon. Periksa Terms dan tiap halaman bounty di portal saat memilih serta submit; penyelenggara dapat memperbaruinya.

**Satu primary track: Social, Attention & Culture.** Dashboard yang dilampirkan menyatakan boleh memilih beberapa sponsor bounty, tetapi setiap bounty punya syarat dan track sendiri. Nominal `$30.000` pada track adalah pool track menurut Terms (`$10.000` untuk masing-masing tiga pemenang), bukan hadiah otomatis per proyek. Tidak ada keharusan HIVE memakai token atau mekanisme ownership finansial untuk masuk Track 03 menurut definisi Terms; pitch perlu menekankan komunitas dan partisipasi budaya yang terbukti dalam produk.

| Prioritas | Bounty dari dashboard pengguna | Kecocokan dan syarat yang harus dibuktikan |
|---|---|---|
| Utama setelah alur inti stabil | **Best Use of Envio**, all tracks, $1.000 | Indeks event `Committed`, `Revealed`, `ClosedEarly`, `Resolved/Voided` dari kontrak HIVE; halaman proof/profil benar-benar membaca data hasil indeks. Sekadar memasang SDK tidak cukup. [Envio HyperIndex](https://docs.envio.dev/docs/quickstart) |
| Utama bila provider dipilih | **Privy!**, all tracks, $5.000 | Privy dipakai untuk embedded wallet dan signing/otorisasi Call di aplikasi yang berjalan; **login saja tidak memenuhi** deskripsi bounty. Uji integrasi Monad dan consent per Call sebelum mengklaim eligible. [Privy signer](https://docs.privy.io/wallets/using-wallets/signers/delegate-wallet) |
| Alternatif Privy | **Best Use of Dynamic**, all tracks, $5.000 | Dynamic SDK menjadi lapisan auth/wallet/signing yang benar-benar dipakai. Pilih **satu** wallet stack utama; memasang Dynamic dan Privy sekaligus hanya demi dua bounty menambah risiko integrasi. [Dynamic embedded transaction UI](https://docs.dynamic.xyz/wallets/embedded-wallets/embedded-transaction-ui) |
| Cadangan jika sudah dipakai nyata | **Best Projects using Alchemy**, all tracks, $1.000 kredit | Gunakan layanan Alchemy untuk kebutuhan operasional Monad yang nyata dan tunjukkan perannya; jenis hadiah adalah **kredit**, bukan uang tunai. |
| Opsi lanjut | **Best workflow with CRE**, all tracks, $3.000 | CRE dapat mengorkestrasi polling/snapshot/resolusi bila workflow sungguhan berjalan atau disimulasikan sesuai syarat bounty. Tidak mengubah fakta bahwa sumber YouTube tetap dipercaya; jangan menambahkannya sebelum resolver dasar stabil. |
| Bersyarat identitas tim | **Best Community Team Project**, all tracks, $5.000 | Relevan hanya bila tim memenuhi definisi “team from Metropolis community supporters” pada halaman bounty. Keikutsertaan Discord saja belum dapat diasumsikan cukup. |
| Tidak disarankan untuk scope ini | **Best Mera-Powered UX**, all tracks, $2.500 | Menuntut Mera sebagai **seluruh account layer**, tanpa seed phrase, extension, atau custody backend. Ini mengganti desain Google + Privy/Dynamic, jadi bukan tambahan kecil. |

Bounty payments/trading (Agora, Kuru, Perpl, Aurora liquidity), identitas aset Cleanverse, Nansen, dan AI model (KIMI/Hunyuan/Qwen) tidak menambah nilai inti HIVE dalam batas waktu ini atau memiliki syarat track yang berbeda. Tidak perlu mengejarnya hanya untuk memperbanyak pilihan. **Urutan keputusan:** selesaikan commit–reveal Monad → pilih Privy *atau* Dynamic jika layak → tambahkan Envio hanya bila eventnya benar-benar menggerakkan proof/profil → pilih bounty yang telah terbukti saat submit.
