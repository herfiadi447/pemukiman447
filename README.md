# WebGIS Kesesuaian Lahan Permukiman Kabupaten Luwu (Versi 2)

Aplikasi WebGIS statis mandiri (HTML, CSS, JS murni tanpa build tool) untuk visualisasi hasil analisis spasial kesesuaian lahan permukiman di Kabupaten Luwu, Provinsi Sulawesi Selatan (Versi 2, Rilis 22 November 2026).

## Fitur Utama

- **Peta Interaktif:** Berbasis MapLibre GL JS 4.7.1 tanpa basemap eksternal (latar polos), kontrol layer, opasitas, label kecamatan, dan mode perbandingan geser (swipe compare).
- **Statistik & Grafik:** Bar chart interaktif per kelas kesesuaian dan tabel rincian persentase luas wilayah vs lahan dinilai.
- **Analisis Sensitivitas:** Evaluasi dampak variasi bobot parameter AHP (+/-10%) dan pergeseran batas kelas (+/-1 interval).
- **Transparansi Metodologi:** Pemetaan kriteria berdasar data metodologi dengan lencana status (dari jurnal, adaptasi, asumsi), detail matriks AHP 5x5, dan evaluasi keterbatasan.
- **Unduhan Data:** Dokumen peta siap cetak format PDF dan arsip data spasial SHP/QGIS.

## Menjalankan Proyek Secara Lokal

Tidak memerlukan instalasi package manager atau build tools. Cukup gunakan server HTTP lokal, misalnya:

`ash
# Masuk ke direktori webgis_luwu
cd webgis_luwu

# Jalankan server HTTP bawaan Python
python -m http.server 8000
`

Buka peramban pada alamat http://localhost:8000.

## Status dan Keterbatasan Penting

> **PERINGATAN RESMI:** Hasil analisis ini merupakan penyaringan awal akademis, BUKAN penetapan resmi perizinan, kesesuaian ruang (PKKPR), atau Rencana Tata Ruang Wilayah (RTRW). Tidak dilakukan validasi lapangan dalam kajian ini.

1. **Pedoman PU 41/2007:** Model memberi skor pada lereng 25-<45% sehingga tidak memenuhi batasan teknis kemiringan permukiman 0-25%.
2. **Buffer Sungai:** Buffer 100 m lurus alur air merupakan asumsi penyederhanaan raster, bukan sempadan hukum sah.
3. **Pusat Kecamatan:** Menggunakan proksi titik tengah wilayah (centroid geografis), bukan lokasi kantor pemerintahan terverifikasi.
4. **Data DEM:** Menggunakan Copernicus DEM 30 m yang merupakan model permukaan kanopi (DSM), bukan elevasi tanah murni (DTM).
5. **Ketiadaan Data Tertentu:** Kajian belum memasukkan zonasi RTRW legal, kawasan hutan, peta kerawanan banjir, gempa, sesar aktif, longsor, geologi, dan jenis tanah.

## Penyusun

**Herfiadi Reski Alviansyah**
