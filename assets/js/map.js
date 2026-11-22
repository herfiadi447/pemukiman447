/**
 * WebGIS Kesesuaian Lahan Kabupaten Luwu v2 - Map Controller
 * MapLibre GL JS 4.7.1 Implementation (Offline / No Basemap)
 */

let map = null;
let compA = null;
let mapB = null;
let mapCompare = null;
let currentBasemap = 'peta-jalan';
let activeKesesuaianCodes = [1, 2, 3, 4, 5, 6];
let activeKemiringanCodes = [1, 2, 3, 4];
let activeTutupanCodes = [10, 20, 30, 40, 50, 60, 80, 90, 95];

// Basemap Definitions
const BASEMAP_SOURCES = {
  'source-basemap-google-street': {
    type: 'raster',
    tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
    tileSize: 256,
    maxzoom: 20,
    attribution: '© Google'
  },
  'source-basemap-peta-jalan': {
    type: 'raster',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxzoom: 19,
    attribution: '© OpenStreetMap contributors'
  },
  'source-basemap-google-satelit': {
    type: 'raster',
    tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
    tileSize: 256,
    maxzoom: 20,
    attribution: '© Google'
  },
  'source-basemap-google-hybrid': {
    type: 'raster',
    tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
    tileSize: 256,
    maxzoom: 20,
    attribution: '© Google'
  }
};

const BASEMAP_LAYERS = [
  {
    id: 'layer-basemap-google-street',
    type: 'raster',
    source: 'source-basemap-google-street',
    layout: { visibility: 'none' }
  },
  {
    id: 'layer-basemap-peta-jalan',
    type: 'raster',
    source: 'source-basemap-peta-jalan',
    layout: { visibility: 'visible' }
  },
  {
    id: 'layer-basemap-google-satelit',
    type: 'raster',
    source: 'source-basemap-google-satelit',
    layout: { visibility: 'none' }
  },
  {
    id: 'layer-basemap-google-hybrid',
    type: 'raster',
    source: 'source-basemap-google-hybrid',
    layout: { visibility: 'none' }
  }
];

// Data Cache
const cache = {
  batasKabupaten: null,
  batasKecamatan: null,
  pusatPendekatan: null,
  kesesuaian: null,
  kemiringan: null,
  tutupan: null,
  bangunan: {}, // keyed by kecamatan
  loadedBangunanAll: false
};

const markers = [];

/**
 * Cek dukungan WebGL (maplibregl.supported() sudah dihapus di MapLibre v4)
 */
function webglTersedia() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Initialize Primary Map
 */
function initMap() {
  if (!webglTersedia()) {
    showFallback('WebGL tidak aktif di browser ini, sehingga peta interaktif tidak dapat ditampilkan. Tampilan fallback:');
    return;
  }

  const mapStyle = {
    version: 8,
    sources: { ...BASEMAP_SOURCES },
    layers: [
      {
        id: 'bg-layer',
        type: 'background',
        paint: {
          'background-color': '#f8fafc'
        }
      },
      ...BASEMAP_LAYERS
    ]
  };

  map = new maplibregl.Map({
    container: 'map',
    style: mapStyle,
    bounds: CONFIG.bounds,
    fitBoundsOptions: { padding: 30 },
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-left');

  map.on('load', async () => {
    setupInitialData();
  });

  map.on('error', (e) => {
    console.warn('MapLibre event error:', e);
  });

  // Watch zoom level for bangunan layer
  map.on('zoomend', () => {
    handleZoomBuildingCheck();
  });
}

/**
 * Normalizes GeoJSON features (unpacking GeometryCollections if any)
 */
function normalizeGeoJSON(geojson) {
  if (!geojson || !geojson.features) return geojson;
  const newFeatures = [];
  for (const feat of geojson.features) {
    if (feat.geometry && feat.geometry.type === 'GeometryCollection') {
      for (const subGeom of feat.geometry.geometries) {
        newFeatures.push({
          type: 'Feature',
          properties: { ...feat.properties },
          geometry: subGeom
        });
      }
    } else {
      newFeatures.push(feat);
    }
  }
  return {
    type: 'FeatureCollection',
    features: newFeatures
  };
}

/**
 * Progress bar updater
 */
function updateProgress(percent, text) {
  const wrap = document.getElementById('map-progress-wrap');
  const bar = document.getElementById('map-progress-bar');
  const txt = document.getElementById('map-progress-text');
  if (!wrap || !bar || !txt) return;

  if (percent >= 100) {
    bar.style.width = '100%';
    txt.textContent = text || 'Selesai';
    setTimeout(() => {
      wrap.style.opacity = '0';
      setTimeout(() => { wrap.style.display = 'none'; }, 400);
    }, 600);
  } else {
    wrap.style.display = 'flex';
    wrap.style.opacity = '1';
    bar.style.width = percent + '%';
    txt.textContent = text || `${Math.round(percent)}%`;
  }
}

/**
 * Fetch with error handling
 */
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`Gagal memuat ${url}:`, err);
    throw err;
  }
}

/**
 * Load Initial Layers: Boundaries, Road, River, Pusat, and 22 Kesesuaian files
 */
async function setupInitialData() {
  updateProgress(5, 'Memuat batas wilayah dan jaringan...');

  try {
    // 1. Load Batas & Infrastruktur
    const [batasKab, batasKec, jalan, sungai, pusat] = await Promise.all([
      fetchJSON('data/batas_kabupaten.geojson'),
      fetchJSON('data/batas_kecamatan.geojson'),
      fetchJSON('data/jalan.geojson'),
      fetchJSON('data/sungai.geojson'),
      fetchJSON('data/pusat_pendekatan.geojson')
    ]);

    cache.batasKabupaten = normalizeGeoJSON(batasKab);
    cache.batasKecamatan = normalizeGeoJSON(batasKec);
    cache.pusatPendekatan = pusat;

    // Add boundaries sources
    map.addSource('source-batas-kabupaten', { type: 'geojson', data: cache.batasKabupaten });
    map.addSource('source-batas-kecamatan', { type: 'geojson', data: cache.batasKecamatan });
    map.addSource('source-jalan', { type: 'geojson', data: jalan });
    map.addSource('source-sungai', { type: 'geojson', data: sungai });
    map.addSource('source-pusat', { type: 'geojson', data: pusat });

    updateProgress(20, 'Memuat 22 data kesesuaian lahan kecamatan...');

    // 2. Load 22 Kesesuaian files concurrently with progress updates
    const kesesuaianLayerDef = CONFIG.layers.find(l => l.id === 'kesesuaian');
    const paths = kesesuaianLayerDef.path;
    let loadedCount = 0;
    const allKesesuaianFeatures = [];

    // Batch download
    const fetchPromises = paths.map(async (p) => {
      try {
        const data = await fetchJSON(p);
        if (data && data.features) {
          allKesesuaianFeatures.push(...data.features);
        }
        loadedCount++;
        const pct = 20 + (loadedCount / paths.length) * 75;
        updateProgress(pct, `Kesesuaian: ${loadedCount}/${paths.length} kecamatan...`);
      } catch (e) {
        console.warn(`Gagal memuat kesesuaian ${p}:`, e);
      }
    });

    await Promise.all(fetchPromises);

    cache.kesesuaian = {
      type: 'FeatureCollection',
      features: allKesesuaianFeatures
    };

    map.addSource('source-kesesuaian', {
      type: 'geojson',
      data: cache.kesesuaian
    });

    // 3. Add Map Layers in proper z-order
    // Kesesuaian fill
    map.addLayer({
      id: 'layer-kesesuaian',
      type: 'fill',
      source: 'source-kesesuaian',
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': [
          'match', ['get', 'kode_kelas'],
          1, '#1B6B4A',
          2, '#8CC084',
          3, '#F2C95C',
          4, '#e38c53',
          5, '#B8574E',
          6, '#C9C9C4',
          '#C9C9C4'
        ],
        'fill-opacity': 0.82
      }
    });

    // Kesesuaian pertanian outline overlay
    map.addLayer({
      id: 'layer-kesesuaian-pertanian',
      type: 'line',
      source: 'source-kesesuaian',
      layout: { visibility: 'visible' },
      filter: ['!=', ['get', 'pertanian'], ''],
      paint: {
        'line-color': '#c026d3',
        'line-width': 1.8,
        'line-dasharray': [2, 1]
      }
    });

    // Sungai
    map.addLayer({
      id: 'layer-sungai',
      type: 'line',
      source: 'source-sungai',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': '#0284c7',
        'line-width': ['match', ['get', 'jenis'], 'river', 2.0, 1.2],
        'line-opacity': 0.9
      }
    });

    // Jalan
    map.addLayer({
      id: 'layer-jalan',
      type: 'line',
      source: 'source-jalan',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': '#334155',
        'line-width': [
          'match', ['get', 'jenis'],
          'trunk', 3.0,
          'primary', 2.2,
          'secondary', 1.6,
          'tertiary', 1.1,
          1.1
        ],
        'line-opacity': 0.85
      }
    });

    // Batas Kecamatan Line
    map.addLayer({
      id: 'layer-batas-kecamatan',
      type: 'line',
      source: 'source-batas-kecamatan',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': '#64748b',
        'line-width': 1.2,
        'line-dasharray': [3, 2]
      }
    });

    // Batas Kabupaten Line
    map.addLayer({
      id: 'layer-batas-kabupaten',
      type: 'line',
      source: 'source-batas-kabupaten',
      layout: { visibility: 'visible' },
      paint: {
        'line-color': '#1e293b',
        'line-width': 2.5
      }
    });

    // Pusat Kecamatan Point
    map.addLayer({
      id: 'layer-pusat',
      type: 'circle',
      source: 'source-pusat',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': '#8a4ea8',
        'circle-radius': 5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5
      }
    });

    // Add DOM markers for kecamatan labels
    createKecamatanLabels(pusat);

    // Setup interactive popups and cursor
    setupPopups();

    updateProgress(100, 'Peta dan kesesuaian lahan siap!');
  } catch (err) {
    console.error('Error saat setup initial data:', err);
    updateProgress(100, 'Terjadi kendala saat memuat beberapa data.');
  }
}

/**
 * Creates accessible, crisp DOM markers for kecamatan labels
 */
function createKecamatanLabels(pusatGeoJSON) {
  if (!pusatGeoJSON || !pusatGeoJSON.features) return;
  // Clear previous
  markers.forEach(m => m.remove());
  markers.length = 0;

  for (const feat of pusatGeoJSON.features) {
    const coords = feat.geometry.coordinates;
    const name = feat.properties.kecamatan;

    const el = document.createElement('div');
    el.className = 'kecamatan-marker-label';
    el.textContent = name;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Pilih kecamatan ${name}`);
    el.title = `Klik untuk fokus ke Kecamatan ${name}`;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectKecamatan(name);
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);

    markers.push(marker);
  }
}

/**
 * Lazy load Kemiringan Lereng layer
 */
async function loadKemiringanLayer() {
  if (cache.kemiringan) {
    if (!map.getSource('source-kemiringan')) {
      addKemiringanLayersToMap(map);
    } else {
      map.setLayoutProperty('layer-kemiringan', 'visibility', 'visible');
    }
    return;
  }

  updateProgress(10, 'Memuat data kemiringan lereng (22 kecamatan)...');
  const layerDef = CONFIG.layers.find(l => l.id === 'kemiringan_kelas');
  const paths = layerDef.path;
  const allFeatures = [];
  let loaded = 0;

  await Promise.all(paths.map(async (p) => {
    try {
      const data = await fetchJSON(p);
      if (data && data.features) allFeatures.push(...data.features);
      loaded++;
      updateProgress(10 + (loaded / paths.length) * 85, `Kemiringan: ${loaded}/${paths.length}...`);
    } catch (e) {
      console.warn(`Gagal memuat kemiringan ${p}:`, e);
    }
  }));

  cache.kemiringan = {
    type: 'FeatureCollection',
    features: allFeatures
  };

  addKemiringanLayersToMap(map);
  updateProgress(100, 'Layer kemiringan siap!');
}

function addKemiringanLayersToMap(targetMap) {
  if (!targetMap.getSource('source-kemiringan')) {
    targetMap.addSource('source-kemiringan', {
      type: 'geojson',
      data: cache.kemiringan
    });
  }

  if (!targetMap.getLayer('layer-kemiringan')) {
    targetMap.addLayer({
      id: 'layer-kemiringan',
      type: 'fill',
      source: 'source-kemiringan',
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': [
          'match', ['get', 'kode_kelas'],
          1, '#19734b',
          2, '#8ebf71',
          3, '#f4d16f',
          4, '#b74643',
          '#bebebe'
        ],
        'fill-opacity': 0.8
      }
    }, 'layer-jalan'); // place under roads
  } else {
    targetMap.setLayoutProperty('layer-kemiringan', 'visibility', 'visible');
  }
}

/**
 * Lazy load Tutupan Lahan WorldCover layer
 */
async function loadTutupanLayer() {
  if (cache.tutupan) {
    if (!map.getSource('source-tutupan')) {
      addTutupanLayersToMap(map);
    } else {
      map.setLayoutProperty('layer-tutupan', 'visibility', 'visible');
    }
    return;
  }

  updateProgress(10, 'Memuat tutupan lahan ESA WorldCover 2021...');
  const layerDef = CONFIG.layers.find(l => l.id === 'tutupan_lahan_kelas');
  const paths = layerDef.path;
  const allFeatures = [];
  let loaded = 0;

  await Promise.all(paths.map(async (p) => {
    try {
      const data = await fetchJSON(p);
      if (data && data.features) allFeatures.push(...data.features);
      loaded++;
      updateProgress(10 + (loaded / paths.length) * 85, `Tutupan Lahan: ${loaded}/${paths.length}...`);
    } catch (e) {
      console.warn(`Gagal memuat tutupan ${p}:`, e);
    }
  }));

  cache.tutupan = {
    type: 'FeatureCollection',
    features: allFeatures
  };

  addTutupanLayersToMap(map);
  updateProgress(100, 'Layer tutupan lahan siap!');
}

function addTutupanLayersToMap(targetMap) {
  if (!targetMap.getSource('source-tutupan')) {
    targetMap.addSource('source-tutupan', {
      type: 'geojson',
      data: cache.tutupan
    });
  }

  if (!targetMap.getLayer('layer-tutupan')) {
    targetMap.addLayer({
      id: 'layer-tutupan',
      type: 'fill',
      source: 'source-tutupan',
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': [
          'match', ['get', 'kode_worldcover'],
          10, '#006400',
          20, '#ffbb22',
          30, '#ffff4c',
          40, '#f096ff',
          50, '#fa0000',
          60, '#b4b4b4',
          80, '#0064c8',
          90, '#0096a0',
          95, '#00cf75',
          '#bebebe'
        ],
        'fill-opacity': 0.8
      }
    }, 'layer-jalan');
  } else {
    targetMap.setLayoutProperty('layer-tutupan', 'visibility', 'visible');
  }
}

/**
 * Handle Bangunan layer: load per kecamatan or when zoom >= 12
 */
async function loadBangunanForKecamatan(kecName) {
  if (!kecName) return;
  const layerDef = CONFIG.layers.find(l => l.id === 'bangunan');
  const kecEntry = layerDef.index_kecamatan.find(k => k.kecamatan.toLowerCase() === kecName.toLowerCase());
  if (!kecEntry) return;

  if (cache.bangunan[kecName]) {
    renderBangunanData();
    return;
  }

  updateProgress(30, `Memuat bangunan ${kecName}...`);
  try {
    const data = await fetchJSON(kecEntry.path);
    cache.bangunan[kecName] = data.features || [];
    renderBangunanData();
    updateProgress(100, `Bangunan ${kecName} termuat`);
  } catch (err) {
    console.error(`Gagal memuat bangunan ${kecName}:`, err);
  }
}

async function handleZoomBuildingCheck() {
  const chk = document.getElementById('chk-layer-bangunan');
  if (!chk || !chk.checked) return;

  const currentZoom = map.getZoom();
  const select = document.getElementById('select-kecamatan-map');
  const selectedKec = select ? select.value : '';

  if (selectedKec) {
    loadBangunanForKecamatan(selectedKec);
  } else if (currentZoom >= 12) {
    // Load for visible area or all
    if (!cache.loadedBangunanAll) {
      loadAllBuildingsProgressive();
    }
  }
}

async function loadAllBuildingsProgressive() {
  cache.loadedBangunanAll = true;
  updateProgress(15, 'Memuat seluruh layer bangunan (zoom >= 12)...');
  const layerDef = CONFIG.layers.find(l => l.id === 'bangunan');
  const items = layerDef.index_kecamatan;
  let loaded = 0;

  for (const it of items) {
    if (!cache.bangunan[it.kecamatan]) {
      try {
        const d = await fetchJSON(it.path);
        cache.bangunan[it.kecamatan] = d.features || [];
      } catch (e) {
        console.warn(`Gagal memuat bangunan ${it.kecamatan}:`, e);
      }
    }
    loaded++;
    updateProgress(15 + (loaded / items.length) * 80, `Bangunan: ${loaded}/${items.length}...`);
  }

  renderBangunanData();
  updateProgress(100, 'Semua data bangunan siap!');
}

function renderBangunanData() {
  let combinedFeatures = [];
  const select = document.getElementById('select-kecamatan-map');
  const selectedKec = select ? select.value : '';

  if (selectedKec && cache.bangunan[selectedKec]) {
    combinedFeatures = cache.bangunan[selectedKec];
  } else {
    for (const k in cache.bangunan) {
      combinedFeatures.push(...cache.bangunan[k]);
    }
  }

  const fc = {
    type: 'FeatureCollection',
    features: combinedFeatures
  };

  if (!map.getSource('source-bangunan')) {
    map.addSource('source-bangunan', {
      type: 'geojson',
      data: fc
    });

    map.addLayer({
      id: 'layer-bangunan',
      type: 'fill',
      source: 'source-bangunan',
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': '#7b6f6f',
        'fill-opacity': 0.85
      }
    }, 'layer-jalan');
  } else {
    map.getSource('source-bangunan').setData(fc);
    map.setLayoutProperty('layer-bangunan', 'visibility', 'visible');
  }
}

/**
 * Popups setup
 */
function setupPopups() {
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '320px'
  });

  const interactiveLayers = [
    'layer-kesesuaian',
    'layer-kemiringan',
    'layer-tutupan',
    'layer-bangunan',
    'layer-jalan',
    'layer-sungai',
    'layer-pusat',
    'layer-batas-kecamatan'
  ];

  map.on('click', (e) => {
    const existingLayers = interactiveLayers.filter(id => map.getLayer(id));
    const features = map.queryRenderedFeatures(e.point, { layers: existingLayers });
    if (!features.length) return;

    const feat = features[0];
    const props = feat.properties;
    const layerId = feat.layer.id;
    let html = '';

    if (layerId === 'layer-kesesuaian') {
      const kode = props.kode_kelas;
      const nama = props.nama_kelas || '';
      const luas = Number(props.luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const persen = Number(props.persen || 0).toFixed(2);
      const kec = props.kecamatan || '';
      const pert = props.pertanian;
      const komp = props.komponen;

      let colorHex = '#bebebe';
      if (kode === 1) colorHex = '#19734b';
      else if (kode === 2) colorHex = '#8ebf71';
      else if (kode === 3) colorHex = '#f4d16f';
      else if (kode === 4) colorHex = '#e38c53';
      else if (kode === 5) colorHex = '#b74643';

      html = `
        <div class="popup-title" style="border-left: 4px solid ${colorHex}; padding-left: 8px;">
          ${nama}
        </div>
        <table class="popup-table">
          <tr><td>Kecamatan</td><td>${kec}</td></tr>
          <tr><td>Luas</td><td>${luas} ha</td></tr>
          <tr><td>Proporsi</td><td>${persen}% (luas kecamatan)</td></tr>
          ${komp ? `<tr><td>Komponen</td><td>${komp}</td></tr>` : ''}
        </table>
        ${pert ? `<div class="popup-badge" style="background:#fdf2f8; color:#9d174d; border:1px solid #fbcfe8;">⚠️ ${pert}</div>` : ''}
        <div class="popup-disclaimer">
          *Catatan: % di atas adalah persentase terhadap luas seluruh kecamatan utuh; persen dari lahan dinilai (S1–S3) tercantum pada panel statistik.
        </div>
      `;
    } else if (layerId === 'layer-kemiringan') {
      const nama = props.nama_kelas || '';
      const skor = props.skor !== undefined ? props.skor : '-';
      const luas = Number(props.luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const persen = Number(props.persen || 0).toFixed(2);
      const kec = props.kecamatan || '';

      html = `
        <div class="popup-title">${nama}</div>
        <table class="popup-table">
          <tr><td>Kecamatan</td><td>${kec}</td></tr>
          <tr><td>Skor Model</td><td>${skor}</td></tr>
          <tr><td>Luas</td><td>${luas} ha</td></tr>
          <tr><td>Proporsi</td><td>${persen}%</td></tr>
        </table>
      `;
    } else if (layerId === 'layer-tutupan') {
      // JANGAN MENAMPILKAN skor_v1 atau label Skor v1
      const namaWc = props.nama_worldcover || 'Tutupan Lahan';
      const kodeWc = props.kode_worldcover || '';
      const luas = Number(props.luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const persen = Number(props.persen || 0).toFixed(2);
      const kec = props.kecamatan || '';

      html = `
        <div class="popup-title">${namaWc}</div>
        <table class="popup-table">
          <tr><td>Kecamatan</td><td>${kec}</td></tr>
          <tr><td>Kode WorldCover</td><td>${kodeWc}</td></tr>
          <tr><td>Luas</td><td>${luas} ha</td></tr>
          <tr><td>Proporsi</td><td>${persen}%</td></tr>
        </table>
        <div class="popup-disclaimer">Tutupan lahan ESA WorldCover 2021 (masker, tanpa bobot).</div>
      `;
    } else if (layerId === 'layer-jalan') {
      const jenis = props.jenis || 'Jalan';
      const nama = props.nama ? props.nama.trim() : '';

      html = `
        <div class="popup-title">Jaringan Jalan OSM</div>
        <table class="popup-table">
          <tr><td>Jenis</td><td>${jenis}</td></tr>
          ${nama ? `<tr><td>Nama</td><td>${nama}</td></tr>` : ''}
        </table>
      `;
    } else if (layerId === 'layer-sungai') {
      const jenis = props.jenis || 'Sungai/Saluran';
      const nama = props.nama ? props.nama.trim() : '';

      html = `
        <div class="popup-title">Jaringan Sungai & Alur Air OSM</div>
        <table class="popup-table">
          <tr><td>Jenis</td><td>${jenis}</td></tr>
          ${nama ? `<tr><td>Nama</td><td>${nama}</td></tr>` : ''}
        </table>
        <div class="popup-disclaimer">Buffer 100 m adalah asumsi teknis garis tengah raster, bukan sempadan hukum sah.</div>
      `;
    } else if (layerId === 'layer-pusat') {
      const kec = props.kecamatan || '';
      const ket = props.keterangan || '';

      html = `
        <div class="popup-title">Pusat Kecamatan (Proksi)</div>
        <table class="popup-table">
          <tr><td>Kecamatan</td><td>${kec}</td></tr>
          <tr><td>Keterangan</td><td>${ket}</td></tr>
        </table>
      `;
    } else if (layerId === 'layer-bangunan') {
      const kec = props.kecamatan || '';
      html = `
        <div class="popup-title">Jejak Bangunan (Overture / OSM)</div>
        <table class="popup-table">
          <tr><td>Kecamatan</td><td>${kec}</td></tr>
        </table>
      `;
    } else if (layerId === 'layer-batas-kecamatan') {
      const nama = props.nama || '';
      const kode = props.kode || '';
      const luas = Number(props.luas_ha || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      html = `
        <div class="popup-title">Batas Kecamatan ${nama}</div>
        <table class="popup-table">
          <tr><td>Kode BPS</td><td>${kode}</td></tr>
          <tr><td>Luas Equal-Area</td><td>${luas} ha</td></tr>
        </table>
      `;
    }

    if (html) {
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    }
  });

  // Change cursor to pointer over features
  map.on('mousemove', (e) => {
    const existingLayers = interactiveLayers.filter(id => map.getLayer(id));
    const features = map.queryRenderedFeatures(e.point, { layers: existingLayers });
    map.getCanvas().style.cursor = features.length ? 'pointer' : '';
  });
}

/**
 * Filter Kesesuaian classes via interactive legend click
 */
function toggleKesesuaianClass(kode, element) {
  const idx = activeKesesuaianCodes.indexOf(kode);
  if (idx > -1) {
    if (activeKesesuaianCodes.length === 1) return; // keep at least 1
    activeKesesuaianCodes.splice(idx, 1);
    element.classList.add('dimmed');
  } else {
    activeKesesuaianCodes.push(kode);
    element.classList.remove('dimmed');
  }

  if (map && map.getLayer('layer-kesesuaian')) {
    applyKesesuaianFilter();
  }
}

function applyKesesuaianFilter() {
  const select = document.getElementById('select-kecamatan-map');
  const selectedKec = select ? select.value : '';

  const classFilter = ['in', ['get', 'kode_kelas'], ['literal', activeKesesuaianCodes]];
  if (selectedKec) {
    map.setFilter('layer-kesesuaian', ['all', classFilter, ['==', ['get', 'kecamatan'], selectedKec]]);
    map.setFilter('layer-kesesuaian-pertanian', ['all', ['!=', ['get', 'pertanian'], ''], ['==', ['get', 'kecamatan'], selectedKec]]);
  } else {
    map.setFilter('layer-kesesuaian', classFilter);
    map.setFilter('layer-kesesuaian-pertanian', ['!=', ['get', 'pertanian'], '']);
  }
}

/**
 * Zoom and filter to selected kecamatan
 */
function selectKecamatan(kecName) {
  const mapSelect = document.getElementById('select-kecamatan-map');
  const statsSelect = document.getElementById('select-kecamatan-stats');
  if (mapSelect) mapSelect.value = kecName;
  if (statsSelect) statsSelect.value = kecName;

  if (!kecName) {
    // Reset to full kabupaten bounds
    map.fitBounds(CONFIG.bounds, { padding: 30, duration: 1200 });
    applyKesesuaianFilter();

    if (map.getLayer('layer-kemiringan')) {
      map.setFilter('layer-kemiringan', null);
    }
    if (map.getLayer('layer-tutupan')) {
      map.setFilter('layer-tutupan', null);
    }
  } else {
    const bounds = CONFIG.kecamatanBounds[kecName];
    if (bounds) {
      map.fitBounds(bounds, { padding: 45, duration: 1200 });
    }

    applyKesesuaianFilter();

    if (map.getLayer('layer-kemiringan')) {
      map.setFilter('layer-kemiringan', ['==', ['get', 'kecamatan'], kecName]);
    }
    if (map.getLayer('layer-tutupan')) {
      map.setFilter('layer-tutupan', ['==', ['get', 'kecamatan'], kecName]);
    }

    // If bangunan is checked, load that kecamatan
    const chkBangunan = document.getElementById('chk-layer-bangunan');
    if (chkBangunan && chkBangunan.checked) {
      loadBangunanForKecamatan(kecName);
    }
  }

  // Update statistics
  if (window.updateStatisticsPanel) {
    window.updateStatisticsPanel(kecName);
  }
}

/**
 * Toggle between Single Map mode and Swipe Compare mode
 */
async function setMapMode(mode) {
  const btnSingle = document.getElementById('btn-mode-single');
  const btnSwipe = document.getElementById('btn-mode-swipe');
  const singleMapEl = document.getElementById('map');
  const compContainer = document.getElementById('comparison-container');
  const floatingPanel = document.getElementById('map-floating-panel');

  if (mode === 'swipe') {
    btnSingle.classList.remove('active');
    btnSwipe.classList.add('active');

    // Make sure Kemiringan is loaded
    await loadKemiringanLayer();

    singleMapEl.style.display = 'none';
    compContainer.style.display = 'block';

    if (!mapB) {
      initMapCompare();
    } else {
      if (compA) compA.resize();
      if (mapB) mapB.resize();
    }
  } else {
    btnSwipe.classList.remove('active');
    btnSingle.classList.add('active');

    if (compContainer) compContainer.style.display = 'none';
    if (singleMapEl) singleMapEl.style.display = 'block';

    map.resize();
  }
}

function initMapCompare() {
  const getCompareStyle = (bgId) => ({
    version: 8,
    sources: { ...BASEMAP_SOURCES },
    layers: [
      {
        id: bgId,
        type: 'background',
        paint: { 'background-color': '#f8fafc' }
      },
      ...BASEMAP_LAYERS.map(l => ({
        ...l,
        layout: { visibility: l.id === ('layer-basemap-' + currentBasemap) ? 'visible' : 'none' }
      }))
    ]
  });

  compA = new maplibregl.Map({
    container: 'comp-map-a',
    style: getCompareStyle('bg-layer-a'),
    bounds: CONFIG.bounds,
    fitBoundsOptions: { padding: 30 },
    attributionControl: false
  });

  mapB = new maplibregl.Map({
    container: 'comp-map-b',
    style: getCompareStyle('bg-layer-b'),
    bounds: CONFIG.bounds,
    fitBoundsOptions: { padding: 30 },
    attributionControl: false
  });

  compA.on('load', () => {
    // Add Kesesuaian to map A
    compA.addSource('source-kesesuaian-a', { type: 'geojson', data: cache.kesesuaian });
    compA.addSource('source-batas-kab-a', { type: 'geojson', data: cache.batasKabupaten });
    compA.addSource('source-batas-kec-a', { type: 'geojson', data: cache.batasKecamatan });

    compA.addLayer({
      id: 'layer-kesesuaian-a',
      type: 'fill',
      source: 'source-kesesuaian-a',
      paint: {
        'fill-color': [
          'match', ['get', 'kode_kelas'],
          1, '#1B6B4A',
          2, '#8CC084',
          3, '#F2C95C',
          4, '#e38c53',
          5, '#B8574E',
          6, '#C9C9C4',
          '#C9C9C4'
        ],
        'fill-opacity': 0.85
      }
    });

    compA.addLayer({
      id: 'layer-batas-kec-a',
      type: 'line',
      source: 'source-batas-kec-a',
      paint: { 'line-color': '#64748b', 'line-width': 1.2, 'line-dasharray': [3, 2] }
    });
    compA.addLayer({
      id: 'layer-batas-kab-a',
      type: 'line',
      source: 'source-batas-kab-a',
      paint: { 'line-color': '#1e293b', 'line-width': 2.5 }
    });
  });

  mapB.on('load', () => {
    // Add Kemiringan to map B
    mapB.addSource('source-kemiringan-b', { type: 'geojson', data: cache.kemiringan });
    mapB.addSource('source-batas-kab-b', { type: 'geojson', data: cache.batasKabupaten });
    mapB.addSource('source-batas-kec-b', { type: 'geojson', data: cache.batasKecamatan });

    mapB.addLayer({
      id: 'layer-kemiringan-b',
      type: 'fill',
      source: 'source-kemiringan-b',
      paint: {
        'fill-color': [
          'match', ['get', 'kode_kelas'],
          1, '#19734b',
          2, '#8ebf71',
          3, '#f4d16f',
          4, '#b74643',
          '#bebebe'
        ],
        'fill-opacity': 0.85
      }
    });

    mapB.addLayer({
      id: 'layer-batas-kec-b',
      type: 'line',
      source: 'source-batas-kec-b',
      paint: { 'line-color': '#64748b', 'line-width': 1.2, 'line-dasharray': [3, 2] }
    });
    mapB.addLayer({
      id: 'layer-batas-kab-b',
      type: 'line',
      source: 'source-batas-kab-b',
      paint: { 'line-color': '#1e293b', 'line-width': 2.5 }
    });
  });

  mapCompare = new maplibregl.Compare(compA, mapB, '#comparison-container', {});
}

/**
 * Fallback display if WebGL fails
 */
function showFallback(msg) {
  const mapEl = document.getElementById('map');
  const fallback = document.getElementById('map-fallback');
  const fallbackMsg = document.getElementById('map-fallback-msg');
  if (mapEl) mapEl.style.display = 'none';
  if (fallback) {
    fallback.style.display = 'block';
    if (fallbackMsg && msg) fallbackMsg.textContent = msg;
  }
}

/**
 * Switch active basemap across main map and swipe maps
 */
function setBasemap(basemapKey) {
  currentBasemap = basemapKey;
  const allKeys = ['google-street', 'peta-jalan', 'google-satelit', 'google-hybrid'];

  [map, compA, mapB].forEach(m => {
    if (!m) return;
    allKeys.forEach(k => {
      const lid = 'layer-basemap-' + k;
      if (m.getLayer(lid)) {
        m.setLayoutProperty(lid, 'visibility', k === basemapKey ? 'visible' : 'none');
      }
    });
  });
}

// Export functions to global scope
window.initMap = initMap;
window.setBasemap = setBasemap;
window.showFallback = showFallback;
window.selectKecamatan = selectKecamatan;
window.setMapMode = setMapMode;
window.toggleKesesuaianClass = toggleKesesuaianClass;
window.loadKemiringanLayer = loadKemiringanLayer;
window.loadTutupanLayer = loadTutupanLayer;
window.loadBangunanForKecamatan = loadBangunanForKecamatan;
window.handleZoomBuildingCheck = handleZoomBuildingCheck;
