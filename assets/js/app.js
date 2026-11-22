/**
 * WebGIS Kesesuaian Lahan Kabupaten Luwu v2 - Main Application Entrypoint
 * Handles UI event bindings, layer controls, and initialization
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Map
  try {
    if (window.initMap) {
      window.initMap();
    }
  } catch (err) {
    console.error('Peta gagal dimuat:', err);
    if (window.showFallback) {
      window.showFallback('Peta interaktif gagal dimuat. Tampilan fallback:');
    }
  }

  // 2. Load CSV Tables & Statistics
  if (window.loadAllCSVData) {
    window.loadAllCSVData();
  }

  // 3. Setup UI Controls
  setupLayerControls();
  setupUIInteractions();
  setupDownloadsSection();
});

/**
 * Setup map layer controls (checkboxes, opacity sliders, toggles)
 */
function setupLayerControls() {
  // --- Basemap Selection ---
  const basemapRadios = document.querySelectorAll('input[name="basemap-select"]');
  basemapRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked && window.setBasemap) {
        window.setBasemap(e.target.value);
      }
    });
  });

  // --- Kesesuaian Lahan ---
  const chkKesesuaian = document.getElementById('chk-layer-kesesuaian');
  const sliderKesesuaian = document.getElementById('slider-opacity-kesesuaian');
  const valKesesuaian = document.getElementById('val-opacity-kesesuaian');

  if (chkKesesuaian) {
    chkKesesuaian.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-kesesuaian')) {
        map.setLayoutProperty('layer-kesesuaian', 'visibility', vis);
      }
    });
  }

  if (sliderKesesuaian) {
    sliderKesesuaian.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valKesesuaian) valKesesuaian.textContent = `${Math.round(val * 100)}%`;
      if (map && map.getLayer('layer-kesesuaian')) {
        map.setPaintProperty('layer-kesesuaian', 'fill-opacity', val);
      }
    });
  }

  // --- Pertanian Caution Overlay Toggle ---
  const chkPertanian = document.getElementById('chk-toggle-pertanian');
  if (chkPertanian) {
    chkPertanian.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-kesesuaian-pertanian')) {
        map.setLayoutProperty('layer-kesesuaian-pertanian', 'visibility', vis);
      }
    });
  }

  // --- Kemiringan Lereng ---
  const chkKemiringan = document.getElementById('chk-layer-kemiringan');
  const sliderKemiringan = document.getElementById('slider-opacity-kemiringan');
  const valKemiringan = document.getElementById('val-opacity-kemiringan');

  if (chkKemiringan) {
    chkKemiringan.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await window.loadKemiringanLayer();
      } else {
        if (map && map.getLayer('layer-kemiringan')) {
          map.setLayoutProperty('layer-kemiringan', 'visibility', 'none');
        }
      }
    });
  }

  if (sliderKemiringan) {
    sliderKemiringan.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valKemiringan) valKemiringan.textContent = `${Math.round(val * 100)}%`;
      if (map && map.getLayer('layer-kemiringan')) {
        map.setPaintProperty('layer-kemiringan', 'fill-opacity', val);
      }
    });
  }

  // --- Tutupan Lahan WorldCover ---
  const chkTutupan = document.getElementById('chk-layer-tutupan');
  const sliderTutupan = document.getElementById('slider-opacity-tutupan');
  const valTutupan = document.getElementById('val-opacity-tutupan');

  if (chkTutupan) {
    chkTutupan.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await window.loadTutupanLayer();
      } else {
        if (map && map.getLayer('layer-tutupan')) {
          map.setLayoutProperty('layer-tutupan', 'visibility', 'none');
        }
      }
    });
  }

  if (sliderTutupan) {
    sliderTutupan.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valTutupan) valTutupan.textContent = `${Math.round(val * 100)}%`;
      if (map && map.getLayer('layer-tutupan')) {
        map.setPaintProperty('layer-tutupan', 'fill-opacity', val);
      }
    });
  }

  // --- Jalan Utama OSM ---
  const chkJalan = document.getElementById('chk-layer-jalan');
  if (chkJalan) {
    chkJalan.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-jalan')) {
        map.setLayoutProperty('layer-jalan', 'visibility', vis);
      }
    });
  }

  // --- Sungai dan Anak Sungai OSM ---
  const chkSungai = document.getElementById('chk-layer-sungai');
  if (chkSungai) {
    chkSungai.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-sungai')) {
        map.setLayoutProperty('layer-sungai', 'visibility', vis);
      }
    });
  }

  // --- Bangunan ---
  const chkBangunan = document.getElementById('chk-layer-bangunan');
  if (chkBangunan) {
    chkBangunan.addEventListener('change', (e) => {
      if (e.target.checked) {
        window.handleZoomBuildingCheck();
      } else {
        if (map && map.getLayer('layer-bangunan')) {
          map.setLayoutProperty('layer-bangunan', 'visibility', 'none');
        }
      }
    });
  }

  // --- Pusat Kecamatan Proksi ---
  const chkPusat = document.getElementById('chk-layer-pusat');
  if (chkPusat) {
    chkPusat.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-pusat')) {
        map.setLayoutProperty('layer-pusat', 'visibility', vis);
      }
    });
  }

  // --- Batas Kecamatan & Labels ---
  const chkBatasKec = document.getElementById('chk-layer-batas-kec');
  if (chkBatasKec) {
    chkBatasKec.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-batas-kecamatan')) {
        map.setLayoutProperty('layer-batas-kecamatan', 'visibility', vis);
      }
      // Toggle DOM markers
      const markerEls = document.querySelectorAll('.kecamatan-marker-label');
      markerEls.forEach(el => { el.style.display = e.target.checked ? 'block' : 'none'; });
    });
  }

  // --- Batas Kabupaten Luwu ---
  const chkBatasKab = document.getElementById('chk-layer-batas-kab');
  if (chkBatasKab) {
    chkBatasKab.addEventListener('change', (e) => {
      const vis = e.target.checked ? 'visible' : 'none';
      if (map && map.getLayer('layer-batas-kabupaten')) {
        map.setLayoutProperty('layer-batas-kabupaten', 'visibility', vis);
      }
    });
  }

  // --- Reset View Button ---
  const btnReset = document.getElementById('btn-reset-map');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      window.selectKecamatan('');
    });
  }

  // --- Mode Toggle Buttons (Single vs Swipe) ---
  const btnModeSingle = document.getElementById('btn-mode-single');
  const btnModeSwipe = document.getElementById('btn-mode-swipe');

  if (btnModeSingle) {
    btnModeSingle.addEventListener('click', () => {
      window.setMapMode('single');
    });
  }

  if (btnModeSwipe) {
    btnModeSwipe.addEventListener('click', () => {
      window.setMapMode('swipe');
    });
  }

  // --- Interactive Legend Class Click ---
  const legendItems = document.querySelectorAll('.legend-interactive-item');
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      const kode = parseInt(item.getAttribute('data-kode'));
      if (window.toggleKesesuaianClass) {
        window.toggleKesesuaianClass(kode, item);
      }
    });
  });
}

/**
 * Setup general UI interactions (accordions, mobile navigation)
 */
function setupUIInteractions() {
  // Mobile Nav Toggle
  const btnMobile = document.getElementById('btn-mobile-nav');
  const nav = document.querySelector('header nav');
  if (btnMobile && nav) {
    btnMobile.addEventListener('click', () => {
      nav.classList.toggle('mobile-active');
    });
  }

  // Accordion Toggle
  const accordions = document.querySelectorAll('.accordion');
  accordions.forEach(acc => {
    const header = acc.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        acc.classList.toggle('open');
        const icon = header.querySelector('.accordion-icon');
        if (icon) {
          icon.textContent = acc.classList.contains('open') ? '▲' : '▼';
        }
      });
    }
  });

  // Floating map panel collapse toggle
  const btnTogglePanel = document.getElementById('btn-toggle-floating-panel');
  const panelBody = document.getElementById('map-panel-body');
  if (btnTogglePanel && panelBody) {
    btnTogglePanel.addEventListener('click', () => {
      const isCollapsed = panelBody.style.display === 'none';
      panelBody.style.display = isCollapsed ? 'flex' : 'none';
      btnTogglePanel.textContent = isCollapsed ? '−' : '+';
    });
  }

  // Floating map left panel collapse toggle
  const btnToggleLeftPanel = document.getElementById('btn-toggle-left-panel');
  const leftPanelBody = document.getElementById('map-left-panel-body');
  if (btnToggleLeftPanel && leftPanelBody) {
    btnToggleLeftPanel.addEventListener('click', () => {
      const isCollapsed = leftPanelBody.style.display === 'none';
      leftPanelBody.style.display = isCollapsed ? 'flex' : 'none';
      btnToggleLeftPanel.textContent = isCollapsed ? '−' : '+';
    });
  }

  // Floating map right panel tab switching
  const tabBtns = document.querySelectorAll('.panel-tab-btn');
  const tabContents = document.querySelectorAll('.panel-tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const target = document.getElementById(targetId);
      if (target) {
        target.classList.add('active');
        target.style.display = 'block';
      }
    });
  });

  // Basemap button toggle for click / touch
  const btnBasemap = document.getElementById('btn-toggle-basemap');
  const boxBasemap = document.getElementById('basemap-control-box');
  if (btnBasemap && boxBasemap) {
    btnBasemap.addEventListener('click', (e) => {
      e.stopPropagation();
      boxBasemap.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!boxBasemap.contains(e.target)) {
        boxBasemap.classList.remove('active');
      }
    });
  }
}

/**
 * Setup Downloads Section based on CONFIG.RELEASE_URL
 */
function setupDownloadsSection() {
  const container = document.getElementById('download-cards-container');
  if (!container) return;

  const downloads = [
    {
      nama: 'Peta Kesesuaian Lahan A4 (PDF)',
      desc: 'Peta tematik tata letak siap cetak format A4 dengan legenda lengkap.',
      path: 'downloads/peta_kesesuaian.pdf',
      format: 'PDF',
      ukuran: '811 KB',
      icon: '📄'
    },
    {
      nama: 'Paket Data Spasial & Gaya QGIS (ZIP)',
      desc: 'Kumpulan shapefile (SHP) batas, kesesuaian, jalan, sungai, serta gaya simbologi QGIS (.qml).',
      path: 'downloads/data_gis.zip',
      format: 'ZIP',
      ukuran: '2.93 MB',
      icon: '📦'
    }
  ];

  // Only show hasil_revisi_terbaru if RELEASE_URL is provided
  if (CONFIG.RELEASE_URL && CONFIG.RELEASE_URL.trim() !== '') {
    downloads.unshift({
      nama: 'Semua Hasil Analisis Revisi Terbaru v2 (ZIP)',
      desc: 'Paket lengkap berkas proyek QGIS, raster, vektor GeoJSON/SHP, dan skrip otomasi.',
      path: CONFIG.RELEASE_URL,
      format: 'ZIP / Rilis',
      ukuran: 'Eksternal',
      icon: '🚀'
    });
  }

  let html = '';
  downloads.forEach(d => {
    html += `
      <div class="download-card">
        <div>
          <div class="download-icon">${d.icon}</div>
          <h3 class="download-title">${d.nama}</h3>
          <p class="download-desc">${d.desc}</p>
          <span class="download-size-badge">${d.format} • ${d.ukuran}</span>
        </div>
        <a href="${d.path}" download class="btn-download">
          Unduh Berkas ⬇
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
}
