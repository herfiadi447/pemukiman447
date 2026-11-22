# WebGIS Kesesuaian Lahan Kabupaten Luwu v2 - Redesign Progress

Branch: `redesign-atlas`  
Basis Desain: Stitch Export (`REDESIGN/` - Cartographic Atlas)

## Status Checklist

- [x] **Fase 0: Persiapan & Audit**
  - [x] Branch `redesign-atlas` dibuat
  - [x] Verifikasi library: MapLibre GL JS 4.7.1, Chart.js 4.4.2, PapaParse 5.4.1 (semua lokal)
  - [x] Audit integritas file: CSS/JS/HTML syntax valid, no unclosed tags
  - [x] Struktur redesign dibaca (`DESIGN.md`, `code.html` untuk peta, statistik, sumber/unduhan)

- [x] **Fase 1: Basemap Google Street** (Commit `4a910c2`)
  - [x] Tambahkan opsi Google Street: `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`
  - [x] Urutan radio: Google Street, Peta Jalan (OSM), Google Satelit, Google Hybrid
  - [x] Default: Peta Jalan (OSM)
  - [x] Basemap di layer paling bawah (di bawah seluruh layer tematik)
  - [x] Ganti basemap tidak mereset opasitas, layer aktif, filter legenda, atau posisi peta
  - [x] Dukungan Mode Swipe (Kesesuaian vs Kemiringan) dengan basemap
  - [x] Atribusi "© Google" di bagian Sumber & Lisensi

- [ ] **Fase 2: Redesign Bertahap**
  - [x] **2a: Design System & CSS Variables**
    - [x] Palet warna kertas hangat (`#F5F2EA`), perkamen (`#ECE7DC`), kertas inset (`#FAF8F3`)
    - [x] Tipografi: Noto Serif (judul), IBM Plex Sans (body), JetBrains Mono (data/koordinat)
    - [x] Hairline borders (`#D6CEBE`), interior grid (`#C4BAA5`), tinta pekat (`#141B17`, `#1F2A24`)
    - [x] Shape: 0px border-radius, no soft shadow, no glow/neon/glassmorphism
    - [x] Penyelarasan warna kelas peta (S1 `#1B6B4A`, S2 `#8CC084`, S3 `#F2C95C`, Kendala `#B8574E`, TD `#C9C9C4`)
  - [x] **2b: Navigasi + Header Section + Strip Peringatan**
    - [x] Top bar institutional atlas (logo box, judul, status koordinat WGS84 / UTM 51S)
    - [x] Strip peringatan teknis kartografi (bukan RTRW)
    - [x] Section headers bergaya plate kartografis dengan registration mark `+`
    - [x] Nav link aktif state
  - [x] **2c: Peta Interaktif + Panel Mengambang + Statistik + Sensitivitas**
    - [x] Layout peta dengan North Arrow cartouche & datum WGS84 / Zone 51S
    - [x] Kartu angka kunci kiri melayang ("Neraca Kesesuaian Lahan" dengan stacked rule bar)
    - [x] Panel kanan mengambang bertab (Lapisan, Legenda, Basemap)
    - [x] Alternating graphic scale bar 1:50.000 di pojok kanan bawah
    - [x] Panel Statistik: 4 blok metrik kunci, diagram batang luas, tabel tabular, validasi box
    - [x] Panel Sensitivitas: callout box metode OAT dengan 2 blok figur tegas (bobot vs batas kelas)
  - [x] **2d: Sumber, Lisensi & Unduhan + Metodologi**
    - [x] Metodologi: 8 keterbatasan model diubah menjadi format accordion rapi (isi teks tidak diubah)
    - [x] Sumber & Lisensi: pernyataan hak cipta dataset asal diubah menjadi format tabel terstruktur
    - [x] Bagian Unduhan: callout peringatan hukum batasan (bukan PKKPR/RTRW)
    - [x] Kartu unduhan data GIS dan peta PDF dengan metadata ukuran dan format
  - [x] **2e: Uji Responsif (390px, 768px, 1440px)**
    - [x] Penyesuaian panel mengambang jadi bottom sheet pada mobile (<768px)
    - [x] Header technical strip disesuaikan untuk layar sempit (390px)
    - [x] Penyesuaian grid metrik 2-kolom dan 1-kolom pada perangkat genggam
    - [x] Tabel tabular memiliki container scroll horizontal (`.table-responsive`)
    - [x] Navigasi mobile dropdown dengan hamburger toggle (`#btn-mobile-nav`)

- [x] **Fase 3: Verifikasi Komprehensif & Perbaikan Bug**
  - [x] Verifikasi browser headless via subagent pada `http://localhost:8088/`
  - [x] Peta MapLibre GL 4.7.1 termuat sempurna dengan 4 basemap (Google Street, OSM, Google Satelit, Google Hybrid)
  - [x] Perbaikan error Mode Swipe: `mapCompare._update()` diganti dengan `compA.resize()` & `mapB.resize()`
  - [x] Dropdown kecamatan, reset zoom, slider opasitas, dan interaksi legenda teruji 100%
  - [x] Panel statistik, matriks sensitivitas, accordion metodologi, dan kartu unduhan teruji 100%
  - [x] Tampilan mobile (390px) responsif dan stabil tanpa layout breaking

- [x] **Fase 4: Perbaikan Layout, Stacking Overlay & Tipografi Kartografi**
  - [x] **Header & Nav Bar Rapi**: Tinggi fixed 64px, menu 1 baris tanpa wrapping tidak rata, ellipsis subjudul, WGS 84 disembunyikan di <1280px, hamburger menu responsif di <1024px.
  - [x] **Pemisahan Toolbar Peta dari Sticky Header**: Implementasi `--header-h: 96px` dengan `scroll-padding-top` dan `scroll-margin-top` pada semua section anchor sehingga toolbar kontrol peta tampil utuh dan bebas dari tumpukan header.
  - [x] **Penataan Overlay Kiri Peta**: Penyatuan Cartouche Arah & Kartu Neraca Kesesuaian ke dalam kontainer vertikal tunggal `.map-left-overlay-stack`. Default collapse (`+`/`−`) pada layar <1440px.
  - [x] **Relokasi Kontrol Navigasi MapLibre**: Dipindahkan ke pojok kiri bawah (`bottom-left`) sehingga bebas dari tabrakan dengan kartu overlay kiri.
  - [x] **Pengurangan Kepadatan Label Kecamatan**: Label toponimi disembunyikan di zoom level kabupaten (< 9.8), dan ditampilkan dengan gaya toponimi kartografis bersih ber-halo perkamen tipis (`#F5F2EA`) saat diperbesar (zoom in) atau kecamatan difokuskan.
  - [x] **Verifikasi Browser Multi-Resolusi**: Uji visual dan fungsional di 1920px, 1440px, 1280px, dan mobile 390px menghasilkan 0 JavaScript error.

---
*Dokumen ini diperbarui setiap akhir sub-fase.*
