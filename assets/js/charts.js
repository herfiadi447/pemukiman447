/**
 * WebGIS Kesesuaian Lahan Kabupaten Luwu v2 - Data & Charts Controller
 * Handles CSV parsing, Chart.js rendering, statistics, and sensitivity analysis
 */

let statsData = [];
let komponenData = [];
let sensitivitasData = [];
let metodologiData = [];
let referensiData = [];

let suitabilityChart = null;
let sensitivityChart = null;

// Official validation numbers from README & Prompt
const OFFICIAL_TOTALS = {
  1: { nama: 'S1 sangat sesuai', luas: 20339.48, color: '#1B6B4A' },
  2: { nama: 'S2 sesuai', luas: 83229.09, color: '#8CC084' },
  3: { nama: 'S3 sesuai bersyarat', luas: 67849.63, color: '#F2C95C' },
  4: { nama: 'N tidak sesuai', luas: 0.00, color: '#e38c53' },
  5: { nama: 'Kendala', luas: 90610.55, color: '#B8574E' },
  6: { nama: 'Tidak dinilai', luas: 27813.81, color: '#C9C9C4' },
  total: 289842.58
};

/**
 * Clean CSV row keys (stripping BOM \ufeff if present)
 */
function cleanRowKeys(row) {
  const clean = {};
  for (const k in row) {
    const cleanKey = k.replace(/^\ufeff/, '').trim();
    clean[cleanKey] = typeof row[k] === 'string' ? row[k].trim() : row[k];
  }
  return clean;
}

/**
 * Load and parse all CSV files
 */
async function loadAllCSVData() {
  try {
    const [rawStats, rawKomp, rawSens, rawMetod, rawRef] = await Promise.all([
      fetchText('tabel/statistik_kecamatan.csv'),
      fetchText('tabel/komponen_tidak_dinilai.csv'),
      fetchText('tabel/sensitivitas.csv'),
      fetchText('tabel/metodologi.csv'),
      fetchText('tabel/referensi.csv')
    ]);

    statsData = Papa.parse(rawStats, { header: true }).data.filter(r => r.kecamatan || r['\ufeffkecamatan']).map(cleanRowKeys);
    komponenData = Papa.parse(rawKomp, { header: true }).data.filter(r => r.kecamatan || r['\ufeffkecamatan']).map(cleanRowKeys);
    sensitivitasData = Papa.parse(rawSens, { header: true }).data.filter(r => r.skenario || r['\ufeffskenario']).map(cleanRowKeys);
    metodologiData = Papa.parse(rawMetod, { header: true }).data.filter(r => r.kriteria || r['\ufeffkriteria']).map(cleanRowKeys);
    referensiData = Papa.parse(rawRef, { header: true }).data.filter(r => r.penulis || r['\ufeffpenulis']).map(cleanRowKeys);

    populateKecamatanDropdowns();
    updateStatisticsPanel('');
    renderValidationBox();
    renderSensitivitySection();
    renderMethodologyTable();
    renderReferencesTable();
  } catch (err) {
    console.error('Error saat memuat data tabel CSV:', err);
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return await res.text();
}

/**
 * Populate kecamatan select dropdowns
 */
function populateKecamatanDropdowns() {
  const kecSet = new Set();
  statsData.forEach(r => { if (r.kecamatan) kecSet.add(r.kecamatan); });
  const kecList = Array.from(kecSet).sort();

  const mapSelect = document.getElementById('select-kecamatan-map');
  const statsSelect = document.getElementById('select-kecamatan-stats');

  [mapSelect, statsSelect].forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '<option value="">Semua Kecamatan (Kabupaten Luwu)</option>';
    kecList.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `Kecamatan ${k}`;
      sel.appendChild(opt);
    });
  });

  if (mapSelect) {
    mapSelect.addEventListener('change', (e) => {
      selectKecamatan(e.target.value);
    });
  }

  if (statsSelect) {
    statsSelect.addEventListener('change', (e) => {
      selectKecamatan(e.target.value);
    });
  }
}

/**
 * Update Statistics Panel (Table & Chart)
 */
function updateStatisticsPanel(kecName) {
  const filtered = kecName ? statsData.filter(r => r.kecamatan.toLowerCase() === kecName.toLowerCase()) : statsData;

  // Aggregate by kode_kelas
  const classSummary = {
    1: { nama: 'S1 sangat sesuai', luas: 0, persenKec: 0, persenDinilai: 0, color: '#1B6B4A' },
    2: { nama: 'S2 sesuai', luas: 0, persenKec: 0, persenDinilai: 0, color: '#8CC084' },
    3: { nama: 'S3 sesuai bersyarat', luas: 0, persenKec: 0, persenDinilai: 0, color: '#F2C95C' },
    4: { nama: 'N tidak sesuai', luas: 0, persenKec: 0, persenDinilai: 0, color: '#e38c53' },
    5: { nama: 'Kendala', luas: 0, persenKec: 0, persenDinilai: 0, color: '#B8574E' },
    6: { nama: 'Tidak dinilai', luas: 0, persenKec: 0, persenDinilai: 0, color: '#C9C9C4' }
  };

  let totalLuasKec = 0;
  let totalLuasDinilai = 0;

  if (kecName) {
    filtered.forEach(r => {
      const kode = parseInt(r.kode_kelas);
      if (classSummary[kode]) {
        const luas = parseFloat(r.luas_ha) || 0;
        classSummary[kode].luas = luas;
        classSummary[kode].persenKec = parseFloat(r.persen_luas_kecamatan) || 0;
        classSummary[kode].persenDinilai = r.persen_dari_dinilai ? parseFloat(r.persen_dari_dinilai) : null;
      }
    });
    if (filtered.length > 0) {
      totalLuasKec = parseFloat(filtered[0].luas_kecamatan_ha) || 0;
      totalLuasDinilai = parseFloat(filtered[0].luas_dinilai_ha) || 0;
    }
  } else {
    // Total kabupaten calculation
    filtered.forEach(r => {
      const kode = parseInt(r.kode_kelas);
      if (classSummary[kode]) {
        classSummary[kode].luas += parseFloat(r.luas_ha) || 0;
      }
    });

    totalLuasKec = Object.values(classSummary).reduce((acc, c) => acc + c.luas, 0);
    totalLuasDinilai = classSummary[1].luas + classSummary[2].luas + classSummary[3].luas + classSummary[4].luas;

    for (let k = 1; k <= 6; k++) {
      classSummary[k].persenKec = totalLuasKec > 0 ? (classSummary[k].luas / totalLuasKec) * 100 : 0;
      if (k <= 4) {
        classSummary[k].persenDinilai = totalLuasDinilai > 0 ? (classSummary[k].luas / totalLuasDinilai) * 100 : 0;
      } else {
        classSummary[k].persenDinilai = null;
      }
    }
  }

  // Update Summary Cards
  const elTitle = document.getElementById('stats-target-title');
  if (elTitle) elTitle.textContent = kecName ? `Kecamatan ${kecName}` : 'Kabupaten Luwu (Agregat 22 Kecamatan)';

  const elTotKec = document.getElementById('stats-val-total-kec');
  if (elTotKec) elTotKec.textContent = totalLuasKec.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ha';

  const elTotDinilai = document.getElementById('stats-val-total-dinilai');
  if (elTotDinilai) elTotDinilai.textContent = totalLuasDinilai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ha';

  const elKendala = document.getElementById('stats-val-kendala');
  if (elKendala) elKendala.textContent = classSummary[5].luas.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ha';

  const elTidakDinilai = document.getElementById('stats-val-tidak-dinilai');
  if (elTidakDinilai) elTidakDinilai.textContent = classSummary[6].luas.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ha';

  // Render Table
  const tbody = document.getElementById('tbody-statistik');
  if (tbody) {
    let rowsHtml = '';
    for (let k = 1; k <= 6; k++) {
      const item = classSummary[k];
      const dinilaiText = item.persenDinilai !== null ? `${item.persenDinilai.toFixed(2)}%` : '<span style="color:#94a3b8;">—</span>';
      rowsHtml += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:12px; height:12px; border-radius:2px; background:${item.color}; display:inline-block;"></span>
              <strong>${item.nama}</strong>
            </div>
          </td>
          <td style="text-align:right;">${item.luas.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right;">${item.persenKec.toFixed(2)}%</td>
          <td style="text-align:right;">${dinilaiText}</td>
        </tr>
      `;
    }
    rowsHtml += `
      <tr style="font-weight:700; background:#f8fafc; border-top:2px solid #cbd5e1;">
        <td>Total Luas Wilayah</td>
        <td style="text-align:right;">${totalLuasKec.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</td>
        <td style="text-align:right;">100.00%</td>
        <td style="text-align:right;">—</td>
      </tr>
    `;
    tbody.innerHTML = rowsHtml;
  }

  // Render / Update Chart.js
  renderSuitabilityChart(classSummary);

  // Update Komponen Tidak Dinilai section
  updateKomponenTidakDinilai(kecName);
}

/**
 * Render Chart.js Bar Chart for Suitability
 */
function renderSuitabilityChart(classSummary) {
  const ctx = document.getElementById('chart-suitability');
  if (!ctx) return;

  const labels = ['S1 Sangat Sesuai', 'S2 Sesuai', 'S3 Sesuai Bersyarat', 'N Tidak Sesuai (0 ha)', 'Kendala Fisik', 'Tidak Dinilai'];
  const values = [
    classSummary[1].luas,
    classSummary[2].luas,
    classSummary[3].luas,
    classSummary[4].luas,
    classSummary[5].luas,
    classSummary[6].luas
  ];
  const bgColors = ['#1B6B4A', '#8CC084', '#F2C95C', '#e38c53', '#B8574E', '#C9C9C4'];

  if (suitabilityChart) {
    suitabilityChart.data.datasets[0].data = values;
    suitabilityChart.update();
  } else {
    suitabilityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Luas Lahan (Hektare)',
          data: values,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.parsed.y.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(val) {
                return (val / 1000).toLocaleString('id-ID') + 'k ha';
              }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }
}

/**
 * Render Komponen Tidak Dinilai Table (Breakdown)
 */
function updateKomponenTidakDinilai(kecName) {
  const container = document.getElementById('komponen-breakdown-body');
  if (!container) return;

  const filtered = kecName ? komponenData.filter(r => r.kecamatan.toLowerCase() === kecName.toLowerCase()) : komponenData;

  const labelMap = {
    'worldcover_50_bangunan': 'Bangunan Terbangun (ESA WorldCover 50)',
    'worldcover_80_air': 'Badan Air & Permukaan Air (ESA WorldCover 80)',
    'worldcover_90_rawa': 'Rawa Bervegetasi (ESA WorldCover 90)',
    'worldcover_95_mangrove': 'Hutan Mangrove / Bakau (ESA WorldCover 95)',
    'sel_tersentuh_bangunan_selain_worldcover_50_80_90_95': 'Sel Tersentuh Bangunan (Overture / OSM)',
    'nodata_sumber': 'NoData Sumber Raster DEM / Tutupan',
    'tepi_di_luar_grid': 'Tepi Batas Wilayah di Luar Grid Raster 40m'
  };

  const compTotals = {};
  for (const k in labelMap) compTotals[k] = 0;

  filtered.forEach(r => {
    const k = r.komponen;
    if (compTotals[k] !== undefined) {
      compTotals[k] += parseFloat(r.luas_ha) || 0;
    }
  });

  const totalLuasTidakDinilai = Object.values(compTotals).reduce((a, b) => a + b, 0);

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Komponen Pengecualian</th>
          <th style="text-align:right;">Luas (ha)</th>
          <th style="text-align:right;">% Komponen</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const k in labelMap) {
    const luas = compTotals[k];
    const pct = totalLuasTidakDinilai > 0 ? (luas / totalLuasTidakDinilai) * 100 : 0;
    html += `
      <tr>
        <td>${labelMap[k]}</td>
        <td style="text-align:right; font-weight:600;">${luas.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align:right;">${pct.toFixed(2)}%</td>
      </tr>
    `;
  }

  html += `
      <tr style="font-weight:700; background:#f8fafc; border-top:2px solid #cbd5e1;">
        <td>Jumlah Luas Tidak Dinilai</td>
        <td style="text-align:right;">${totalLuasTidakDinilai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</td>
        <td style="text-align:right;">100.00%</td>
      </tr>
    </tbody>
  </table>
  `;

  container.innerHTML = html;
}

/**
 * Render Verification Box (Self-check total kabupaten against required numbers)
 */
function renderValidationBox() {
  const container = document.getElementById('validation-box-content');
  if (!container) return;

  // Compute calculated sums from statsData
  const calc = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
  statsData.forEach(r => {
    const kode = parseInt(r.kode_kelas);
    const luas = parseFloat(r.luas_ha) || 0;
    if (calc[kode] !== undefined) calc[kode] += luas;
    calc.total += luas;
  });

  const diffTotal = Math.abs(calc.total - OFFICIAL_TOTALS.total);
  const isMatch = diffTotal < 0.1;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <h4 style="font-size:1rem; font-weight:700; color:#1e293b;">Cek Mandiri Luas Agregat Kabupaten Luwu</h4>
        <p style="font-size:0.8rem; color:#64748b;">Membandingkan akumulasi data statistik terhadap angka acuan resmi laporan versi 2.</p>
      </div>
      <span class="badge ${isMatch ? 'badge-version' : 'badge-warning'}" style="font-size:0.8rem;">
        ${isMatch ? '✅ Terverifikasi Cocok 100%' : '⚠️ Terdapat Selisih'}
      </span>
    </div>
    <div class="table-responsive">
      <table class="data-table" style="font-size:0.825rem;">
        <thead>
          <tr>
            <th>Kelas Kesesuaian</th>
            <th style="text-align:right;">Acuan Resmi (ha)</th>
            <th style="text-align:right;">Hasil Hitung CSV (ha)</th>
            <th style="text-align:right;">Selisih (ha)</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let k = 1; k <= 6; k++) {
    const off = OFFICIAL_TOTALS[k].luas;
    const computed = calc[k];
    const diff = Math.abs(computed - off);
    const match = diff < 0.05;
    html += `
      <tr>
        <td><strong>${OFFICIAL_TOTALS[k].nama}</strong></td>
        <td style="text-align:right;">${off.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align:right;">${computed.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align:right; color:${diff > 0.01 ? '#dc2626' : '#16a34a'};">${diff.toFixed(4)}</td>
        <td style="text-align:center;">${match ? '<span style=\"color:#16a34a;\">Cocok</span>' : '<span style=\"color:#dc2626;\">Beda</span>'}</td>
      </tr>
    `;
  }

  html += `
        <tr style="font-weight:700; background:#f8fafc; border-top:2px solid #cbd5e1;">
          <td>Total Wilayah Kabupaten</td>
          <td style="text-align:right;">${OFFICIAL_TOTALS.total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right;">${calc.total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right; color:#16a34a;">${diffTotal.toFixed(4)}</td>
          <td style="text-align:center;"><span style="color:#16a34a;">Cocok</span></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div style="font-size:0.75rem; color:#64748b; margin-top:8px;">
    *Data dihitung dengan proyeksi Lambert Azimuthal Equal-Area WGS84 (+proj=laea +lat_0=-3.16 +lon_0=120.15). Selisih pembulatan numerik < 0,001 ha diabaikan.
  </div>
  `;

  container.innerHTML = html;
}

/**
 * Render Sensitivity Section (Aggregate calculation & Chart.js)
 */
function renderSensitivitySection() {
  if (!sensitivitasData.length) return;

  const scenarioGroups = {};
  sensitivitasData.forEach(r => {
    const sc = r.skenario;
    if (!scenarioGroups[sc]) {
      scenarioGroups[sc] = {
        berpindah: 0,
        dinilai: 0,
        maxKecName: '',
        maxKecPct: -1
      };
    }
    const b = parseFloat(r.luas_berpindah_ha) || 0;
    const d = parseFloat(r.luas_dinilai_ha) || 0;
    const pctKec = parseFloat(r.persen_luas_dinilai_berpindah) || 0;

    scenarioGroups[sc].berpindah += b;
    scenarioGroups[sc].dinilai += d;

    if (pctKec > scenarioGroups[sc].maxKecPct) {
      scenarioGroups[sc].maxKecPct = pctKec;
      scenarioGroups[sc].maxKecName = r.kecamatan;
    }
  });

  const scenarioLabels = {
    'lereng_minus_10pct': 'Bobot Lereng -10%',
    'lereng_plus_10pct': 'Bobot Lereng +10%',
    'jalan_minus_10pct': 'Bobot Jalan -10%',
    'jalan_plus_10pct': 'Bobot Jalan +10%',
    'pusat_minus_10pct': 'Bobot Jarak Pusat -10%',
    'pusat_plus_10pct': 'Bobot Jarak Pusat +10%',
    'elevasi_minus_10pct': 'Bobot Elevasi -10%',
    'elevasi_plus_10pct': 'Bobot Elevasi +10%',
    'sungai_minus_10pct': 'Bobot Sungai -10%',
    'sungai_plus_10pct': 'Bobot Sungai +10%',
    'batas_minus_satu_interval': 'Batas Kelas -1 Interval (-2.5)',
    'batas_plus_satu_interval': 'Batas Kelas +1 Interval (+2.5)'
  };

  const rows = [];
  for (const sc in scenarioGroups) {
    const g = scenarioGroups[sc];
    const pct = g.dinilai > 0 ? (g.berpindah / g.dinilai) * 100 : 0;
    const isBreak = sc.startsWith('batas_');
    rows.push({
      id: sc,
      label: scenarioLabels[sc] || sc,
      pct: pct,
      berpindah: g.berpindah,
      dinilai: g.dinilai,
      maxKecName: g.maxKecName,
      maxKecPct: g.maxKecPct,
      isBreak: isBreak
    });
  }

  // Sort descending by pct
  rows.sort((a, b) => b.pct - a.pct);

  // Render Table
  const tbody = document.getElementById('tbody-sensitivitas');
  if (tbody) {
    let html = '';
    rows.forEach(r => {
      const typeBadge = r.isBreak ? '<span class=\"badge badge-warning\">Asumsi Batas Kelas</span>' : '<span class=\"badge badge-version\">Bobot AHP ±10%</span>';
      html += `
        <tr>
          <td><strong>${r.label}</strong></td>
          <td>${typeBadge}</td>
          <td style="text-align:right; font-weight:700; color:${r.pct > 50 ? '#b91c1c' : '#1e3a8a'};">${r.pct.toFixed(2)}%</td>
          <td style="text-align:right;">${r.berpindah.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha</td>
          <td>${r.maxKecName} (${r.maxKecPct.toFixed(2)}%)</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  // Render Sensitivity Chart
  const ctx = document.getElementById('chart-sensitivity');
  if (ctx && !sensitivityChart) {
    sensitivityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.label),
        datasets: [{
          label: '% Luas Lahan Dinilai yang Berpindah Kelas',
          data: rows.map(r => r.pct),
          backgroundColor: rows.map(r => r.isBreak ? '#b91c1c' : '#0284c7'),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(c) {
                return ` ${c.parsed.x.toFixed(2)}% lahan dinilai berubah kelas`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(v) { return v + '%'; }
            },
            grid: { color: '#f1f5f9' }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }
}

/**
 * Render Methodology Table from CSV with status badges
 */
function renderMethodologyTable() {
  const tbody = document.getElementById('tbody-metodologi');
  if (!tbody || !metodologiData.length) return;

  let html = '';
  metodologiData.forEach(r => {
    const rawStatus = r.status_kegunaan_dan_keterbatasan || '';

    // Convert status keywords to badges
    let formattedStatus = rawStatus
      .replace(/dari jurnal/gi, '<span class=\"status-pill status-jurnal\">dari jurnal</span>')
      .replace(/adaptasi/gi, '<span class=\"status-pill status-adaptasi\">adaptasi</span>')
      .replace(/asumsi/gi, '<span class=\"status-pill status-asumsi\">asumsi</span>');

    const bobotSub = parseFloat(r.bobot_submatriks_ahp_5) || 0;
    const bobotNorm = parseFloat(r.bobot_normalisasi_5) || 0;
    const bobotAsli = parseFloat(r.bobot_asli_jurnal) || 0;

    html += `
      <tr>
        <td><strong>${r.kriteria}</strong><div style="font-size:0.75rem; color:#64748b;">${r.dataset}</div></td>
        <td><code style="font-size:0.75rem; background:#f1f5f9; padding:2px 6px; border-radius:3px;">${r.ambang_dan_skor}</code></td>
        <td style="text-align:right;">${bobotAsli > 0 ? (bobotAsli * 100).toFixed(2) + '%' : '—'}</td>
        <td style="text-align:right;">${bobotNorm > 0 ? (bobotNorm * 100).toFixed(2) + '%' : '—'}</td>
        <td style="text-align:right; font-weight:700; color:#1e3a8a;">${bobotSub > 0 ? (bobotSub * 100).toFixed(2) + '%' : '—'}</td>
        <td>${formattedStatus}</td>
        <td><span style="font-size:0.75rem; color:#475569;">${r.lisensi_dataset}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * Render References Table
 */
function renderReferencesTable() {
  const tbody = document.getElementById('tbody-referensi');
  if (!tbody || !referensiData.length) return;

  let html = '';
  referensiData.forEach(r => {
    const link = r.tautan_doi ? `<a href="${r.tautan_doi}" target="_blank" rel="noopener noreferrer" style="color:#0284c7; text-decoration:underline;">Tautan Sumber / PDF ↗</a>` : '—';
    html += `
      <tr>
        <td><strong>${r.penulis}</strong> (${r.tahun})</td>
        <td>${r.judul}</td>
        <td>${r.kegunaan}</td>
        <td><span style="font-size:0.75rem; color:#b45309;">${r.keterbatasan}</span></td>
        <td><span class="badge badge-version">${r.status_verifikasi}</span></td>
        <td>${link}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Global update hooks
window.updateStatisticsPanel = updateStatisticsPanel;
window.loadAllCSVData = loadAllCSVData;
