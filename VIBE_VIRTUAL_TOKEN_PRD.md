# VIBE — Addendum saldo virtual

> **Digantikan 5 Oktober 2026:** saldo dan Call Shorts kini memakai server, views YouTube nyata, serta pengembalian kredit 2× sesuai [PRD Call Shorts](VIBE_SOURCE_CALL_PRD.md). Aturan tanpa nilai uang/cash-out tetap berlaku. Isi 4 Oktober di bawah adalah arsip implementasi browser lama.

**Tanggal:** 4 Oktober 2026  
**Dasar:** pengguna memilih saldo awal gratis untuk prediksi, tanpa nilai uang atau cash-out. Addendum ini memperluas simulasi frontend pada PRD Metropolis v2; bukan token onchain atau perubahan kontrak commit–reveal.

## Aturan saldo

- Browser baru mendapat **1.000 VIBE** satu kali. Angka ini adalah keputusan implementasi awal, bukan angka dari PRD v2.
- Nominal default **50 VIBE**. Pilihan memakai bilangan bulat **10–500 VIBE**, maksimum saldo tersedia.
- VIBE adalah kredit partisipasi gratis: tidak dapat dibeli, ditransfer, ditukar, atau dicairkan.
- Kredit dipotong setelah pilihan berhasil disimpan. Satu Call menerima satu pilihan; klik ulang tidak memotong saldo lagi.
- Pilihan hanya diterima pada Call demo berstatus `open`. Status fixture menentukan ketersediaan demo; waktu fixture bukan tenggat blockchain nyata.
- Call `void` mengembalikan seluruh kredit yang digunakan, sekali saja. Hasil benar atau salah tidak menghasilkan hadiah saldo. Rekam jejak tetap mengikuti hasil pilihan.
- Tidak ada top-up, bonus harian, reset saldo, atau mekanisme payout dalam irisan ini. Saat saldo kurang dari 10, pengguna tetap dapat menonton dan berdiskusi.

## Pengalaman pengguna

- Saldo ditampilkan sebagai ikon koin emas, angka saldo, dan nama **VIBE** di Prediksi, Discover, dan header halaman produk. Sifat simulasi serta batas penggunaan dijelaskan pada rincian saldo.
- Detail Call dan konfirmasi Discover menyediakan input nominal, pilihan cepat, validasi saldo, dan status penyimpanan.
- Saldo dapat diklik untuk membuka rincian dan riwayat. Profil menampilkan saldo awal, penggunaan, dan pengembalian.
- Riwayat pilihan sebelum fitur ini dimigrasikan dengan nominal nol; tidak ada biaya retroaktif.
- Penyimpanan gagal atau rusak menampilkan kesalahan dan memblokir pilihan baru. Data lama tidak dihapus otomatis.

## Penyimpanan dan batas implementasi

Saldo, pilihan, dan ledger disimpan bersama pada `vibe-virtual-wallet-v1` di localStorage. Saldo dihitung dari ledger. Penulisan harus berhasil sebelum tampilan menyatakan pilihan berhasil. Web Locks menserialkan pilihan antartab pada browser yang mendukungnya.

Saldo ini **per browser**, belum terikat akun, tidak tersinkron lintas perangkat, dan dapat dimodifikasi melalui alat browser. Menghapus data browser menghapus riwayat serta memungkinkan saldo awal baru. Ini simulasi, bukan ledger server yang tahan manipulasi. Browser tanpa Web Locks belum memiliki jaminan konkurensi antartab.

Tidak ada deployment ERC20, perubahan `HiveCallV2`, transaksi saldo di Monad, maupun potongan saldo pada alur API live. Integrasi saldo akun/server dan aturan penerbitan di luar browser memerlukan spesifikasi lanjutan.

## Kriteria penerimaan

1. Saldo awal tidak bertambah saat reload; pilihan dan saldo bertahan di browser.
2. Konfirmasi nominal valid memotong tepat nominal tersebut; pilihan duplikat tidak memotong lagi.
3. Nominal negatif, pecahan, di luar batas, atau melebihi saldo ditolak.
4. Call tertutup menolak pilihan; Call void mengembalikan kredit satu kali.
5. Pilihan lama tetap tampil dengan saldo awal utuh.
6. Tidak ada hadiah finansial, transaksi saldo onchain, atau cash-out yang ditampilkan.
