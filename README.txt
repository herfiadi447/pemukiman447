WEBGIS KESESUAIAN PERMUKIMAN LUWU | VERSI 2 | 22 November 2026
Penyaringan awal; bukan penetapan resmi, persetujuan lokasi atau RTRW. Tidak ada validasi lapangan. Kabupaten Luwu ID7317, 22 kecamatan, bukan Luwu Utara/Timur.

CRS: overlay dan jarak EPSG:32751; grid 40 m. Statistik luas memakai Lambert azimuthal equal-area WGS84, pusat 120,15 BT, 3,16 LS: +proj=laea +lat_0=-3.16 +lon_0=120.15 +datum=WGS84 +units=m +no_defs. Luas batas kabupaten 289842,5798 ha equal-area dibanding 290315,9652 ha UTM (+0,16333%); melampaui 0,1% sehingga luas-sama dipakai. Perbandingan luas tiap kelas tercantum di tabel/perbandingan_proyeksi.csv. Luas di atribut berasal dari vektor belum disederhanakan sebelum GeoJSON dibulatkan.

PARAMETER DAN AHP
Parameter numerik dalam tabel/parameter.json, metodologi rinci dalam tabel/metodologi.csv. Skor dan bobot 10 kriteria dari Tabel 1 dan 2 Ambarwulan dkk. (2022); hanya 5 kriteria dipakai sebagai ADAPTASI: lereng 0,445415; jalan 0,295879; pusat 0,136970; elevasi 0,091347; sungai 0,030389. Submatriks Tabel 1 menurut urutan lereng,jalan,pusat,elevasi,sungai = [[1,2,4,5,9],[1/2,1,3,4,8],[1/4,1/3,1,2,6],[1/5,1/4,1/2,1,5],[1/9,1/8,1/6,1/5,1]]. Eigenvector, lambda maks 5,19805136, CI 0,04951284, RI(5)=1,12, CR 0,04420789; CR < 0,1. Normalisasi bobot jurnal cetak = 0,41071681; 0,29732787; 0,15453132; 0,11084405; 0,02657995. Asli untuk Sukabumi berasal dari 5 pakar, bukan preferensi Luwu.
Pemeriksaan mandiri terhadap matriks 10x10 tercetak, eigenvalue 10,46490732; CI (n=10) 0,05165637; CR dengan RI 1,49 = 0,03466870. Artikel melaporkan lambda 10,73453477, n=5, CI 0,081614974 dan CR 0,054775151. Nilai eigen/CR dan vektor eigen matriks cetak tidak cocok dengan laporan jurnal; penyebabnya tidak diketahui. Narasi artikel menyebut skor jalan tertinggi 50–500 m, tetapi Tabel 2 memberi skor 10 untuk <50 m; model mengikuti tabel. Deskripsi teks jarak sungai juga berbeda dari Tabel 2; tabel dipakai. Teks pusat satu kali menyebut m, Tabel 2 menyebut km; km dipakai.

Kelas skor ASSUMSI: N [0,2,5), S3 [2,5,5), S2 [5,7,5), S1 [7,5,10]; kendala lereng ≥45%, elevasi ≥2000 m, atau sungai <100 m. Empat kelas + kendala + tidak dinilai = enam kategori tampilan. 0 ha kategori N adalah hasil, bukan kesalahan hilangnya legenda. WorldCover tidak diberi bobot. Kolom skor_v1 dan label 'Skor v1' pada tutupan_lahan_kelas hanya catatan dari model lama, TIDAK dipakai versi 2. Kode 50/80/90/95 dan sel disentuh bangunan dikecualikan dari penilaian; 90/95 adalah asumsi konservatif. Kode 40 tetap diberi penanda kehati-hatian; bukan persetujuan alih fungsi. Pedoman PU 41/2007 juga mencantumkan 0–25% dan menghindari pertanian/penyangga; karena model ini menilai sebagian lereng 25–<45% dan pertanian, ia tidak boleh diklaim memenuhi pedoman itu.

Proksi pusat: atribut center_lon/center_lat COD untuk 22 kecamatan. Pusat geometris Belopa digunakan pula sebagai proksi pusat Kabupaten Luwu; bukan lokasi gedung pemerintahan yang telah diverifikasi. Jarak jalan dan sungai adalah jarak lurus dari sel raster 40 m ke garis OSM yang dirasterisasi; ketelitian jarak terbatas grid dan cakupan jaringan. Jaringan luar batas yang tidak termuat dapat membuat jarak dekat tepi terlalu besar. Sungai hanya river/stream; buffer 100 m adalah asumsi menyederhanakan garis tengah, BUKAN garis sempadan sah. Jalan hanya trunk/primary/secondary/tertiary, asumsi pemetaan jalan utama. WorldCover di sini versi penyajian 40 m dari produk 10 m, bukan observasi detail 10 m. DEM Copernicus GLO-30 adalah model permukaan, tidak sama dengan kontur rupabumi jurnal.

LUAS DAN DENOMINATOR
S1 20,339.4839 ha; S2 83,229.0904 ha; S3 67,849.6337 ha; N 0.0000 ha; kendala 90,610.5546 ha; tidak dinilai 27,813.8141 ha. Jumlah 289,842.576694 ha; gabungan kecamatan 289,842.576880 ha; selisih -0.000187 ha. Luas batas kabupaten lebih besar dari gabungan kecamatan sekitar 0,003 ha. Kolom persen_luas_kecamatan = luas kelas / luas seluruh kecamatan; persen_dari_dinilai = luas S1/S2/S3/N / jumlah luas S1–N, kosong untuk kendala/tidak dinilai. Komponen tidak dinilai saling eksklusif: WC 50,80,90,95 lebih dahulu; lalu bangunan di luar keempatnya; nodata; tepi tidak terwakili grid. Rincian per kecamatan dan persen kabupaten ada di tabel/komponen_tidak_dinilai.csv.

SENSITIVITAS
Bobot satu per satu dikali 0,9/1,1 lalu dinormalisasi kembali. Batas tiap kelas 2,5/5/7,5 digeser sekaligus -2,5 dan +2,5 (satu interval), asumsi eksplisit. Perubahan diukur dari vektor piksel yang tidak disederhanakan setelah intersection kecamatan; pembagi adalah luas dinilai tanpa kendala/tidak dinilai. Angka kecil sedikit melebihi 100% karena toleransi geometri.
- lereng_minus_10pct: 4.2725% lahan dinilai berubah; kecamatan terpeka Belopa Utara (27.054%)
- lereng_plus_10pct: 1.1325% lahan dinilai berubah; kecamatan terpeka Bua (2.846%)
- jalan_minus_10pct: 2.2527% lahan dinilai berubah; kecamatan terpeka Lamasi (14.623%)
- jalan_plus_10pct: 4.5681% lahan dinilai berubah; kecamatan terpeka Belopa Utara (27.054%)
- pusat_minus_10pct: 2.8408% lahan dinilai berubah; kecamatan terpeka Belopa Utara (27.054%)
- pusat_plus_10pct: 0.0018% lahan dinilai berubah; kecamatan terpeka Walenrang Barat (0.025%)
- elevasi_minus_10pct: 3.3746% lahan dinilai berubah; kecamatan terpeka Belopa Utara (27.054%)
- elevasi_plus_10pct: 0.8504% lahan dinilai berubah; kecamatan terpeka Walenrang Utara (2.462%)
- sungai_minus_10pct: 0.0000% lahan dinilai berubah; tidak ada kecamatan yang berubah (0.000%)
- sungai_plus_10pct: 0.0000% lahan dinilai berubah; tidak ada kecamatan yang berubah (0.000%)
- batas_minus_satu_interval: 88.1346% lahan dinilai berubah; kecamatan terpeka Latimojong (100.000%)
- batas_plus_satu_interval: 99.9946% lahan dinilai berubah; kecamatan terpeka Ponrang Selatan (100.000%)

GEOMETRI DAN BATAS
Semua GeoJSON EPSG:4326 enam desimal, tidak disederhanakan/tidak ada poligon dibuang. Semua diperiksa: 134696 fitur, 0 tidak valid; bangunan 133816 WKB identik versi 1. Pembulatan GeoJSON hasil mengubah jumlah luas -0,013303 ha dibanding geometri analisis, bukan luas hilang karena pembuangan. Batas COD penyedia sudah digeneralisasi 7,5 m. Pembanding BIG/Satu Peta 22 kecamatan: 154038 simpul vs COD 12191, luas-sama 290209,9268 ha dibanding 289842,5769 ha (+367,3499 ha). Metadata tidak menyatakan lisensi bebas yang jelas; produk turunan komersial memerlukan izin pemilik data. Batas BIG tidak mengganti COD.

BATASAN
Tanpa validasi lapangan dan tanpa RTRW, kawasan hutan/lindung, status hak lahan, banjir/longsor/gempa, tanah, geologi, mata air, sempadan legal, serta air bersih. PU 20/PRT/M/2007 belum terverifikasi; Arfiansyah dkk. 2024 bagian metodologi teks asli diperiksa melalui PDF penerbit https://mdpi-res.com/d_attachment/sustainability/sustainability-16-05767/article_deploy/sustainability-16-05767.pdf. Keppres 32/1990 Pasal 16 terbaca; status hukum terkini belum dikaji. Hasil tidak boleh dipakai sendiri untuk perizinan.

OTOMASI: tabel/parameter.json memusatkan ambang dan bobot. proses_ulang_model.py mengulang raster dan polygonize/dissolve/intersect di QGIS menggunakan berkas input proyek ini. Skrip mengulang raster, vektor, statistik luas-sama dan sensitivitas. Ekspor layout, GeoJSON, SHP dan ZIP belum otomatis. Perhitungan raster diulang dari parameter yang sama dan 0 dari 4.242.108 sel berbeda; skrip penuh belum diuji dari awal hingga akhir.

UKURAN: seluruh isi arsip versi 1 140480919 byte sebelum kompresi. GeoJSON versi 1 136281278 byte; versi 2 114525122 byte. Bangunan versi 1 48408584 byte; versi 2 42765102 byte. Daftar tiap file ada di daftar_file.txt.

Untuk menjalankan skrip: ekstrak arsip, buka proyek QGIS versi 2 di komputer sumber, ubah tabel/parameter.json pada folder hasil ekstraksi, lalu jalankan dari konsol QGIS dengan runpy.run_path(path_lengkap_skrip). Data raster dan vektor sumber masih diperlukan di folder proyek semula. Ekspor peta/GeoJSON/SHP/ZIP tetap perlu proses terpisah.

UNDUHAN REVISI TERBARU: downloads/hasil_revisi_terbaru.zip memuat seluruh rilis versi 2, berkas analisis, dan salinan proyek QGIS. Proyek QGIS memerlukan sumber pada komputer asal; file GeoJSON dan SHP di dalam arsip dapat dibaca terpisah. Arsip ini tidak memuat batas BIG pembanding karena lisensinya tidak jelas.
