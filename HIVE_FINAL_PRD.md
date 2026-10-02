# PRD Final — HIVE

> **Dokumen ini telah digantikan** oleh [PRD HIVE untuk Metropolis Hackathon](HIVE_METROPOLIS_FINAL_PRD.md), yang menggabungkan aturan Call, commit–reveal Monad, dan batas scope hackathon.

**Versi:** 1.0 · 1 Oktober 2026  
**Status:** arah produk dan spesifikasi MVP; belum menyatakan fitur telah terimplementasi  
**Produk:** web app sosial untuk menemukan konten, membuat prediksi, dan berdiskusi dalam komunitas

## 1. Ringkasan keputusan

HIVE menghubungkan tiga kegiatan yang biasanya terpisah: **Discover**, **Prediction**, dan **Channel Community**. Pengguna menemukan video atau momen menarik, mengambil posisi sebelum hasilnya diketahui apabila tersedia pertanyaan yang dapat diverifikasi, lalu membahas alasan dan hasilnya bersama komunitas. Sebagian konten hanya menjadi insight dan bahan diskusi; keberadaan prediksi bukan syarat sebuah konten masuk Discover.

**Janji produk:** “Temukan lebih awal. Buat prediksimu. Buktikan bersama komunitas.” HIVE mengutamakan rekam jejak penilaian yang transparan, bukan taruhan atau hadiah finansial.

**Keputusan MVP:** pengalaman tiga pilar harus sudah tersambung, tetapi prediksi yang dinilai otomatis dimulai dari **pertumbuhan view video YouTube publik** dengan dua horizon standar, 6 dan 24 jam. Feed boleh menampilkan topik lain sebagai insight. Prediksi hasil pertandingan, lintas platform, dan template outcome lain menyusul setelah sumber hasil serta aturan resolusinya tervalidasi. Contoh “bertambah 10.000 views dalam 8 jam” menjelaskan visi interaksi, bukan aturan horizon MVP.

## 2. Masalah dan peluang

Orang menemukan video, lagu, kreator, atau momen olahraga di feed; berdebat tentang potensinya di chat; lalu kehilangan konteks ketika hasilnya datang. Poll biasa menunjukkan pilihan saat ini, tetapi jarang menunjukkan **siapa memilih sebelum ramai, berdasarkan apa, dan apakah pilihannya benar**. HIVE memberi satu tautan antara konten, pertanyaan, diskusi, waktu pilihan, hasil, dan riwayat pengguna.

Format video pendek cocok sebagai pintu masuk: YouTube melaporkan lebih dari 200 miliar penayangan Shorts harian dan menyoroti peran komunitas penggemar dalam membentuk budaya konten. Itu mendukung pilihan format, tetapi bukan bukti bahwa pengguna akan rutin membuat prediksi; beta harus menguji perilaku tersebut. [Sumber: YouTube](https://blog.youtube/news-and-events/neal-mohan-cannes-2025/).

## 3. Target pengguna dan pekerjaan utama

| Pengguna | Kebutuhan | Nilai HIVE |
|---|---|---|
| Penjelajah konten | Menemukan hal menarik tanpa komitmen | Feed video dan insight yang bisa ditonton tanpa memprediksi |
| Pengamat tren dan fan | Menyatakan keyakinan sebelum hasil diketahui | Call dengan tenggat, aturan, dan riwayat yang jelas |
| Anggota komunitas | Membagikan temuan dan memperdebatkan alasan | Channel dengan tautan langsung ke konten dan Call |
| Kurator/operator | Menjaga kualitas pertanyaan dan sumber hasil | Konsol kurasi, pemeriksaan data, moderasi, dan audit |

Pengguna boleh berhenti pada salah satu kegiatan. Membaca channel, menonton insight, dan mengikuti hasil tidak boleh mengharuskan pengguna membuat prediksi.

## 4. Model produk: tiga pilar, satu objek bersama

**Content** adalah objek bersama yang memuat sumber video, kreator, topik, konteks, status pemutaran, serta diskusi terkait. Content dapat berjenis:

- **Insight:** konten untuk ditonton, disimpan, dibagikan, dan dibahas. Tidak ada CTA prediksi.
- **Predictable:** konten dengan satu atau lebih *Call* terkurasi. CTA menampilkan pertanyaan dan tenggat. MVP membatasi satu Call aktif per video agar pilihan mudah dipahami.
- **Resolved story:** konten yang Call-nya selesai atau void. Ringkasan hasil menjadi alasan untuk kembali dan dapat dibagikan.

**Call** adalah pertanyaan yang terikat ke Content tetapi memiliki identitas dan aturan sendiri: kalimat pertanyaan, pilihan, sumber hasil, baseline, target, waktu buka/tutup/evaluasi, versi aturan, status, dan bukti resolusi. **Channel** adalah ruang komunitas bertopik. Sebuah Content atau Call dapat dibagikan ke channel sebagai referensi yang sama, bukan disalin menjadi prediksi baru.

Hubungan utamanya: `Content → Call opsional → pilihan pengguna → hasil → percakapan/replay`. Channel dapat mengarahkan anggota ke Content; halaman Content dapat mengarahkan ke percakapan channel yang relevan. Tombol CTA selalu mengarah ke **Call yang tepat**, bukan ke halaman prediksi generik.

## 5. Alur pengguna

1. **Masuk:** landing menjelaskan tiga pilar. Pengunjung bisa melihat Discover, detail publik, hasil, dan channel publik. Login diperlukan untuk memilih, mengirim pesan, mengikuti channel, atau menyimpan konten.
2. **Discover:** feed video vertikal menampilkan kreator, sumber, ringkasan konteks, tombol diskusi/bagikan, dan CTA prediksi **hanya jika ada Call terbuka**. Video insight diberi label editorial yang sederhana; jangan memasang tombol prediksi yang tidak berfungsi.
3. **Buka detail:** pengguna melihat video melalui player resmi/tautan sumber, alasan konten dipilih, Call terkait bila ada, serta percakapan yang membahasnya.
4. **Buat prediksi:** detail Call menunjukkan kalimat yang tidak ambigu, baseline, target, pilihan Ya/Tidak, kapan pilihan ditutup, kapan hasil diperiksa, dan sumber data. Pengguna mengonfirmasi satu pilihan. Status “terkunci” baru muncul setelah penyimpanan/komitmen berhasil.
5. **Bahas dan bagikan:** pengguna dapat membagikan kartu Content atau Call ke channel. Pesan memuat tautan, pertanyaan, dan status terbaru. Orang lain masuk ke halaman yang sama dan dapat ikut memilih selama jendela masih terbuka.
6. **Kembali untuk hasil:** notifikasi internal mengantar ke hasil dan halaman bukti. Riwayat memperlihatkan pilihan, waktu, hasil, dan Call yang void. Percakapan dapat berlanjut setelah hasil.

Jika pengguna melihat konten yang belum punya Call, tindakan yang tersedia tetap bermakna: tonton, simpan, bagikan, dan diskusikan. Usulan topik prediksi boleh dikirim untuk kurasi; pengguna tidak menerbitkan Call resmi langsung pada MVP.

## 6. Discover

Discover adalah pintu masuk utama setelah login. Feed awal **dikurasi**, bukan dijanjikan sebagai algoritme rekomendasi personal. Komposisinya sengaja mencampur insight, Call terbuka, dan cerita hasil agar tidak kosong ketika tidak ada prediksi baru. Setiap kartu harus membedakan sumber konten, status prediksi, dan waktu dengan jelas.

MVP memakai video YouTube publik melalui integrasi yang diizinkan, bukan mengunggah ulang file kreator. `videos.list` menyediakan metadata, `statistics.viewCount`, dan status embed. Video yang tak dapat diputar dalam embed tetap menyediakan tautan ke sumber, dan Call hanya berjalan bila data hasilnya memenuhi aturan. [Sumber: YouTube Data API](https://developers.google.com/youtube/v3/docs/videos), [videos.list](https://developers.google.com/youtube/v3/docs/videos/list).

Tampilan yang terasa seperti feed TikTok **tidak berarti akses bebas ke semua konten TikTok**. Display API TikTok untuk daftar video memerlukan otorisasi pengguna dan izin aplikasi; embed memiliki mekanisme tersendiri. Perluasan sumber konten diputuskan per platform setelah pemeriksaan akses, atribusi, dan ketersediaan metrik. [Sumber: TikTok Display API](https://developers.tiktok.com/docs/en/display-api-get-started), [TikTok Embed](https://developers.tiktok.com/docs/en/embed-videos).

## 7. Prediction: aturan MVP

### 7.1 Template awal

Pertanyaan standar: **“Apakah video ini mencapai setidaknya X views menurut YouTube Data API saat pemeriksaan HIVE pada T?”** UI boleh menyederhanakan menjadi “Naik ≥10.000 views dalam 6 jam?” bila detail Call tetap menampilkan baseline numerik, target akhir, waktu pemeriksaan, dan definisi sumber. Gunakan target akhir (`baseline + kenaikan`) untuk evaluasi. Waktu disimpan sebagai UTC; UI menampilkan waktu lokal.

Horizon MVP adalah **6 atau 24 jam**. Kurator mengunci video ID, baseline API, target, waktu buka, waktu tutup pilihan, waktu evaluasi, metode resolusi, dan versi aturan sebelum publikasi. Hanya Call yang memiliki data awal memadai dan target yang belum tercapai yang boleh terbit. Jendela pilihan menutup pada 25% pertama horizon: 90 menit untuk 6 jam dan 6 jam untuk 24 jam. Ini adalah parameter MVP yang harus diuji; kurator tidak boleh mengubahnya pada Call aktif.

Satu akun memiliki satu pilihan Ya/Tidak per Call. Pilihan dikunci sebelum tenggat dan tidak dapat diganti. HIVE tidak menampilkan tally pilihan orang lain saat Call masih terbuka agar pengguna tidak sekadar mengikuti mayoritas. Jika onchain commit–reveal dipakai, detail otorisasi, kegagalan transaksi, dan reveal harus mengikuti spesifikasi teknis tersendiri; UI tidak boleh mengaku “onchain” untuk pilihan yang hanya tersimpan di database.

### 7.2 Resolusi dan integritas

Resolver mengambil snapshot API pertama yang valid pada/ setelah waktu evaluasi dalam jendela maksimal 30 menit. **Ya** jika `viewCount ≥ target`; **Tidak** jika kurang dari target. Halaman bukti menampilkan sumber, waktu pengambilan, angka, target, versi aturan, dan status keputusan. `viewCount` adalah angka API pada waktu pemeriksaan, bukan klaim jumlah yang tepat pada detik tenggat. YouTube dapat mengubah definisi metrik; setiap Call mempertahankan aturan dan konteks sumber yang berlaku ketika terbit. [Sumber: YouTube Data API](https://developers.google.com/youtube/v3/docs/videos).

Call menjadi **void**, bukan dipaksa menjadi Ya/Tidak, jika video dihapus/privat, data tak tersedia dalam jendela, angka turun karena koreksi signifikan, target sudah tercapai sebelum pilihan ditutup, atau ada kegagalan sistemik yang merusak integritas pilihan. Call yang salah diterbitkan dapat dibatalkan sebelum ada pilihan sah; setelah itu kesalahan dicatat sebagai void. Semua alasan terlihat dalam riwayat.

Prediksi pertandingan sepak bola adalah **template tahap berikutnya**. Video bola di Discover hanyalah konteks; hasil pertandingan harus berasal dari sumber skor resmi/berlisensi yang dipilih sebelum Call terbit. Atur terlebih dahulu apakah yang diprediksi hasil 90 menit, extra time, atau pemenang keseluruhan; juga atur penundaan dan pembatalan. Jangan menyelesaikan prediksi pertandingan dari isi video atau penilaian moderator semata.

### 7.3 Reputasi

Profil menampilkan jumlah Call valid, benar, salah, void, dan **Early & Right**: pilihan yang dibuat pada 20% pertama jendela pilihan dan kemudian benar. Sampel selalu ditampilkan; 3/3 tidak dipresentasikan setara dengan 300/400. Ranking resmi memerlukan ambang sampel dan pemeriksaan anti-abuse. Kecepatan tanpa ketepatan tidak mendapat skor keberhasilan. Hasil void tidak masuk penyebut akurasi.

## 8. Channel Community

Channel adalah ruang berbasis minat, misalnya kreator lokal, musik, atau sepak bola. Di dalamnya anggota bisa berbagi Content/Call, menulis alasan, bertanya, dan menanggapi hasil. Pesan yang menyematkan Call harus memperbarui statusnya secara langsung atau tertaut ke status terbaru; jangan membekukan angka target atau hasil dalam teks kartu yang dapat menjadi usang.

MVP cukup memiliki channel publik terkurasi, thread pesan, kartu berbagi, moderasi dasar, dan notifikasi balasan/hasil. Aturan anti-spam: batas kiriman, pelaporan, penghapusan oleh moderator dengan audit, serta pembatasan tautan berulang. Channel tidak memiliki hak untuk mengubah pertanyaan atau hasil Call. Diskusi boleh bebas, tetapi informasi yang belum seharusnya terlihat—seperti tally selama jendela pilihan—tidak ditampilkan oleh sistem.

**Human → Squad → Hive** dari konsep kompetisi sebelumnya dapat menjadi lapisan identitas dan organisasi komunitas pada tahap selanjutnya. Pada MVP ini, channel adalah ruang percakapan, bukan Squad kompetitif atau Hive yang memberikan bobot suara. Match tujuh fase dan scoring antar-Hive tidak dicampur diam-diam ke alur prediksi konten; jika diaktifkan kembali, itu memerlukan PRD mode kompetisi tersendiri.

## 9. Navigasi dan layar utama

| Layar | Tujuan dan tindakan utama |
|---|---|
| Public Landing | Menjelaskan HIVE, contoh alur, masuk atau jelajahi |
| Discover | Menonton, membuka Call opsional, menyimpan, berbagi |
| Content Detail | Melihat sumber, konteks, Call terkait, dan diskusi |
| Predictions | Menemukan Call terbuka/selesai dan memfilter status |
| Call Detail & Result | Memilih, memantau tenggat, memeriksa bukti dan hasil |
| Channels | Menemukan channel dan melihat percakapan |
| Channel Detail | Mengirim pesan, berbagi konten/Call, mengikuti diskusi |
| Profile | Riwayat, Early & Right, ukuran sampel, kontribusi komunitas |
| Settings | Akun, notifikasi, privasi, dan wallet bila diaktifkan |
| Operator Console | Kurasi, moderasi, snapshot, resolusi, void, audit |

Navigasi konsumen utama: **Discover · Predictions · Channels · Profile**. Pengguna selalu dapat kembali dari kartu channel ke Content/Call asal dan sebaliknya. Mobile diprioritaskan, tetapi alur inti juga harus dapat digunakan dengan keyboard dan pembaca layar.

## 10. Identitas, Web3, dan batas sistem

Login awal memakai Google agar tindakan sosial mudah dimulai. Wallet dan Monad berada di lapisan bukti pilihan, bukan syarat menonton atau membaca. Bila protokol onchain siap, catatan onchain membuktikan komitmen pilihan sebelum tenggat dan hasil yang diumumkan HIVE; **kontrak tidak otomatis membuktikan kebenaran angka YouTube atau skor pertandingan**. Resolver, sumber data, dan bukti pengambilan harus terlihat. Jangan menyebut pilihan “terverifikasi onchain” sebelum transaksi benar-benar berhasil.

MVP tidak memakai stake, taruhan, token, payout, atau hadiah bernilai uang. Satu akun dan wallet per pilihan bukan jaminan satu manusia: gunakan rate limit, ambang ranking, audit anomali, dan biaya sponsor yang dibatasi. Kebijakan data platform, masa simpan snapshot, atribusi kreator, serta cara embed harus diperiksa sebelum beta publik; YouTube menetapkan aturan penyimpanan dan penyegaran data API. [Sumber: YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies).

**Batas data:** database aplikasi menyimpan Content, Channel, pesan, profil, kurasi, dan status operasional. Layanan resolver menyimpan aturan Call, snapshot dan alasan keputusan. Kontrak, bila diaktifkan, menyimpan bukti komitmen/hasil yang memang diperlukan; tidak menyimpan video atau pesan channel. Semua endpoint publik hanya menampilkan informasi sesuai status Call.

## 11. Scope MVP, lanjutan, dan non-goals

**Harus ada pada MVP:** Discover dengan insight dan konten ber-CTA, detail konten, Call Ya/Tidak yang dapat diselesaikan nyata, hasil dan bukti, channel publik dengan kartu berbagi, profil/riwayat, auth, operator console minimal, moderasi, serta pengukuran funnel. Keberhasilan MVP menuntut satu perjalanan lengkap `Discover → Call → share/discuss → result`, bukan tiga layar yang berdiri sendiri.

**Tahap berikutnya:** template pertandingan, kategori musik dan olahraga yang memiliki sumber teruji, dukungan TikTok/Instagram sesuai akses platform, channel privat, notifikasi lebih kaya, reputasi komunitas, dan mode kompetisi Squad/Hive. Perluasan tidak boleh mengubah aturan Call yang sudah terbit.

**Di luar MVP:** unggah ulang konten pihak ketiga, feed algoritmik berbasis AI, pembuatan Call resmi bebas oleh semua pengguna, prediksi tanpa sumber hasil, betting/market/stake, hadiah finansial, klaim oracle trustless untuk data web, dan pertandingan kompetitif tujuh fase sebagai alur utama.

## 12. Metrik dan kriteria penerimaan beta

| Pertanyaan | Metrik awal |
|---|---|
| Apakah tiga pilar benar-benar tersambung? | Persentase sesi Discover yang membuka Call atau channel; persentase Call yang dibagikan ke channel; kunjungan dari channel kembali ke Call |
| Apakah prediksi menjadi kebiasaan? | Pengguna dengan ≥2 Call valid dalam 7 hari; laporkan pembilang dan penyebut |
| Apakah pengguna kembali untuk hasil? | Persentase pembuat Call yang membuka halaman hasil dalam 48 jam setelah resolusi |
| Apakah konten insight tetap bernilai? | Buka detail, simpan, dan diskusi pada konten tanpa Call |
| Apakah sistem dapat dipercaya? | Rasio void beserta alasan; snapshot valid; sengketa; 0 perubahan pilihan setelah lock |
| Apakah komunitas hidup? | Jumlah channel dengan percakapan dua arah oleh manusia nyata; bukan hanya pesan operator |

Angka target baru ditetapkan setelah cohort beta dan volume Call diketahui. Uji penerimaan minimal: pengguna baru dapat membedakan insight vs Call; satu Call nyata bisa dipilih sebelum tenggat dan ditolak sesudahnya; hasil cocok dengan aturan terkunci; status void jelas; kartu yang dibagikan ke channel membuka Call yang sama; profil tidak menghitung Call void sebagai salah; video yang gagal embed masih memiliki fallback yang jujur.

## 13. Risiko dan keputusan produk

1. **Feed sepi:** siapkan stok insight dan kandidat Call terkurasi; jangan mengisi dengan engagement palsu.
2. **Target terlalu mudah/sulit:** pakai dua snapshot awal, catat alasan target, pantau distribusi Ya/Tidak, dan perbaiki hanya Call berikutnya.
3. **Komunitas sepi:** mulai dari sedikit channel bertema jelas; ukur percakapan dua arah sebelum menambah channel.
4. **Hasil sulit dipercaya:** tampilkan aturan dan waktu snapshot; void bila sumber gagal, tanpa jawaban buatan.
5. **Ekspansi terlalu cepat:** setiap template outcome baru wajib memiliki sumber, kasus tepi, resolver, dan uji sebelum CTA-nya diterbitkan.
6. **Penyalahgunaan ranking/gas:** rate limit, sampel minimum, audit operator, dan plafon transaksi sponsor.

## 14. Urutan build yang disarankan

1. Validasi 20–30 kandidat video YouTube: ketersediaan embed, pembaruan `viewCount`, dan kualitas target 6/24 jam.
2. Bangun model Content–Call–Channel dan konsol kurasi; siapkan insight serta beberapa Call yang benar-benar akan selesai.
3. Selesaikan alur pilihan, resolver, void, dan halaman bukti sebelum mengaktifkan ranking.
4. Sambungkan kartu berbagi ke channel, notifikasi hasil, dan riwayat profil.
5. Uji perjalanan lengkap dengan pengguna nyata; ukur apakah mereka memahami CTA, membuat pilihan kedua, dan kembali untuk hasil.
6. Tambahkan bukti Monad sesuai kontrak dan izin wallet yang sudah diuji; perluas kategori hanya setelah template awal stabil.

**Definisi selesai:** seorang pengguna dapat menemukan video, memahami mengapa ada atau tidak ada prediksi, mengunci pilihan yang sah, membahasnya di channel, dan memeriksa hasil beserta sumbernya. Seluruh status gagal dan void harus terlihat secara jujur.
