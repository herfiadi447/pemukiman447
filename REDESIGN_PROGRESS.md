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
  - [ ] **2d: Sumber, Lisensi & Unduhan + Metodologi**
    - [ ] Format tabel untuk lisensi data dan atribusi
    - [ ] Kartu unduhan dengan metadata ukuran dan format
    - [ ] Metodologi: 8 keterbatasan model sebagai accordion rapi
  - [ ] **2e: Uji Responsif (390px, 768px, 1440px)**
    - [ ] Penyesuaian panel mengambang jadi bottom sheet pada mobile
    - [ ] Grid tabel scrollable horizontal di layar sempit

---
*Dokumen ini diperbarui setiap akhir sub-fase.*
