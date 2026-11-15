/**
 * app.js — Capa C: Controlador interactivo de interfaz, mapa satelital Leaflet + Leaflet.draw,
 * gráficos Chart.js (balance hídrico 36m + historial HLS NDVI/NDTI) y explicabilidad NASA.
 * Alineado con RotaSat — Guía de estilo visual.
 */
(function () {
  'use strict';

  const HA_POR_CUADRA = 0.7056; // 1 cuadra ecuatoriana (84m x 84m) ≈ 0.7056 hectáreas

  const state = {
    catalogo: null,
    parcelasOriginales: {},
    parcelasActivas: {},
    parcelaActualId: 'parcela_licto',
    sliders: {
      agua: 3,
      suelo: 3,
      ganar: 3
    },
    opciones: {
      escenarioLluviaPct: 0,
      conRiego: false,
      retiraForraje: false,
      priorizarForraje: false
    },
    ultimoResultado: null,
    rotacionSeleccionadaGraficoId: 'recomendada_1',
    tarjetasTecnicas: {},
    map: null,
    drawnItems: null,
    activePolygonLayer: null,
    chartBalance: null,
    chartHLS: null
  };

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function haACuadras(ha) {
    return (Number(ha || 0) / HA_POR_CUADRA).toFixed(1);
  }

  function haAM2(ha) {
    return Math.round(Number(ha || 0) * 10000);
  }

  /**
   * Formatea números con espacio fino en miles (ej. 2 950) según la guía de estilo
   */
  function fmtMiles(num, decimales) {
    const n = Number(num || 0);
    const fixed = decimales !== undefined ? n.toFixed(decimales) : String(Math.round(n));
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
    return parts.join('.');
  }

  function refrescarIconosLucide() {
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    }
  }

  function configurarDefaultsChartJS() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Public Sans', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6B6450';
    Chart.defaults.borderColor = '#D6CDB4';
    if (Chart.defaults.plugins && Chart.defaults.plugins.legend && Chart.defaults.plugins.legend.labels) {
      Chart.defaults.plugins.legend.labels.boxWidth = 12;
    }
    if (Chart.defaults.elements && Chart.defaults.elements.line) {
      Chart.defaults.elements.line.tension = 0.25;
    }
    if (Chart.defaults.elements && Chart.defaults.elements.point) {
      Chart.defaults.elements.point.radius = 0;
    }
  }

  /**
   * Calcula el área geodésica aproximada en hectáreas de un polígono LatLng de Leaflet
   */
  function calcularAreaPoligonoHa(latlngs) {
    if (!latlngs || latlngs.length < 3) return 1.5;
    const R = 6378137;
    let areaM2 = 0;
    const n = latlngs.length;
    for (let i = 0; i < n; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % n];
      const x1 = (p1.lng * Math.PI) / 180;
      const y1 = (p1.lat * Math.PI) / 180;
      const x2 = (p2.lng * Math.PI) / 180;
      const y2 = (p2.lat * Math.PI) / 180;
      areaM2 += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2));
    }
    areaM2 = (Math.abs(areaM2) * R * R) / 2.0;
    return Math.max(0.2, Number((areaM2 / 10000).toFixed(2)));
  }

  /**
   * Inicializa los datos desde js/datos_embebidos.js
   */
  function cargarDatosIniciales() {
    if (window.CATALOGO_CULTIVOS && window.PARCELAS_DEMO) {
      state.catalogo = clonar(window.CATALOGO_CULTIVOS);
      for (const [id, p] of Object.entries(window.PARCELAS_DEMO)) {
        state.parcelasOriginales[id] = clonar(p);
        state.parcelasActivas[id] = clonar(p);
      }
      return Promise.resolve();
    }
    return Promise.all([
      fetch('data/cultivos.json').then(r => r.json()),
      fetch('data/parcelas/parcela_licto.json').then(r => r.json()),
      fetch('data/parcelas/parcela_guano.json').then(r => r.json())
    ]).then(([cat, p1, p2]) => {
      state.catalogo = cat;
      [p1, p2].forEach(p => {
        state.parcelasOriginales[p.id] = clonar(p);
        state.parcelasActivas[p.id] = clonar(p);
      });
    });
  }

  function obtenerParcelaActual() {
    return state.parcelasActivas[state.parcelaActualId];
  }

  /**
   * Inicializa el mapa Leaflet con mapas base abiertos, capas NASA GIBS y Leaflet.draw
   */
  function inicializarMapa() {
    const mapEl = document.getElementById('mapa-parcela');
    if (!mapEl || typeof L === 'undefined') return;

    const parcela = obtenerParcelaActual();
    const lat = parcela.centroide?.lat ?? -1.7848;
    const lon = parcela.centroide?.lon ?? -78.6125;

    const osmCalle = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    state.wmsCatastro = L.tileLayer.wms(
      'https://geoportal.agricultura.gob.ec/sigtierras/catastro_rural/wms',
      {
        layers: 'catastro_rural',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.65,
        attribution: 'SIGTIERRAS · MAG Ecuador'
      }
    );

    state.map = L.map('mapa-parcela', {
      center: [lat, lon],
      zoom: 16,
      layers: [osmCalle]
    });

    // Selector de capas en el mapa: mapas base abiertos, capas NASA GIBS y catastro rural del MAG
    const panelCapas = document.getElementById('capas-nasa');
    if (window.CapasNASA && panelCapas) {
      state.capasNasa = window.CapasNASA.montar(state.map, panelCapas, {
        'Catastro rural MAG (SIGTIERRAS)': state.wmsCatastro
      });
    } else {
      L.control.layers({ 'Caminos y comunidades (OSM)': osmCalle },
        { 'Catastro rural MAG (SIGTIERRAS)': state.wmsCatastro }, { position: 'topright' }).addTo(state.map);
    }

    state.drawnItems = new L.FeatureGroup();
    state.map.addLayer(state.drawnItems);

    if (L.Control && L.Control.Draw) {
      if (L.drawLocal) {
        L.drawLocal.draw.toolbar.actions = { title: 'Cancelar dibujo del lote', text: 'Cancelar' };
        L.drawLocal.draw.toolbar.finish = { title: 'Terminar y cerrar el lote', text: 'Terminar lote' };
        L.drawLocal.draw.toolbar.undo = { title: 'Borrar la última esquina marcada', text: 'Borrar punto' };
        L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar polígono (marcar esquinas de tu lote)';
        L.drawLocal.draw.toolbar.buttons.rectangle = 'Dibujar rectángulo (arrastrar en diagonal)';
        L.drawLocal.draw.handlers.polygon.tooltip = {
          start: 'Haz clic en la 1.ª esquina de tu terreno.',
          cont: 'Haz clic en la siguiente esquina.',
          end: 'Haz clic en el primer punto o doble clic para cerrar.'
        };
        L.drawLocal.draw.handlers.rectangle.tooltip = {
          start: 'Haz clic en una esquina y arrastra para formar el rectángulo.'
        };
        L.drawLocal.edit.toolbar.actions.save = { title: 'Guardar los nuevos bordes del lote', text: 'Guardar cambios' };
        L.drawLocal.edit.toolbar.actions.cancel = { title: 'Cancelar y descartar cambios', text: 'Cancelar' };
        L.drawLocal.edit.toolbar.actions.clearAll = { title: 'Limpiar todo', text: 'Limpiar' };
        L.drawLocal.edit.toolbar.buttons.edit = 'Editar bordes del lote (mover esquinas)';
        L.drawLocal.edit.toolbar.buttons.editDisabled = 'No hay lote en el mapa para editar';
        L.drawLocal.edit.handlers.edit.tooltip = {
          text: 'Arrastra los círculos blancos para ajustar las esquinas de tu terreno.',
          subtext: 'Pulsa «Guardar cambios» cuando termines.'
        };
      }

      const drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#A6512B',
              weight: 3,
              fillOpacity: 0.28
            }
          },
          rectangle: {
            showArea: true,
            shapeOptions: {
              color: '#A6512B',
              weight: 3,
              fillOpacity: 0.28
            }
          },
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false
        },
        edit: {
          featureGroup: state.drawnItems,
          remove: false
        }
      });
      state.drawControl = drawControl;
      state.map.addControl(drawControl);

      const syncToolbarPressedStates = (modo) => {
        const btnPoly = document.getElementById('btn-guided-draw');
        const btnRect = document.getElementById('btn-draw-rectangle');
        const btnEdit = document.getElementById('btn-edit-layers');
        const btnEditTxt = document.getElementById('btn-edit-layers-text');
        const btnFinish = document.getElementById('btn-finish-draw');
        const btnUndo = document.getElementById('btn-undo-draw');
        const btnSaveEdit = document.getElementById('btn-save-edit');
        if (btnPoly) btnPoly.setAttribute('aria-pressed', modo === 'polygon' ? 'true' : 'false');
        if (btnRect) btnRect.setAttribute('aria-pressed', modo === 'rectangle' ? 'true' : 'false');
        if (btnEdit) btnEdit.setAttribute('aria-pressed', modo === 'edit' ? 'true' : 'false');
        if (btnEditTxt) btnEditTxt.textContent = modo === 'edit' ? 'Guardar bordes' : 'Editar bordes';
        if (btnFinish) btnFinish.hidden = modo !== 'polygon';
        if (btnUndo) btnUndo.hidden = modo !== 'polygon';
        if (btnSaveEdit) btnSaveEdit.hidden = modo !== 'edit';
      };

      state.map.on(L.Draw.Event.DRAWSTART, function (e) {
        state.guidedVertices = [];
        state.activeDrawType = e.layerType || 'polygon';
        state.rectStartLatLng = null;
        syncToolbarPressedStates(state.activeDrawType);
        document.body.classList.add('guided-drawing-active');
        const banner = document.getElementById('guided-draw-banner');
        const tooltip = document.getElementById('guided-draw-tooltip');
        const txt = document.getElementById('guided-draw-banner-text');
        const live = document.getElementById('guided-draw-live-area');
        if (txt) {
          txt.textContent = state.activeDrawType === 'rectangle'
            ? 'Haz clic en una esquina de tu terreno y arrastra en diagonal para formar el rectángulo.'
            : 'Haz clic en las esquinas de tu terreno. Doble clic o clic en el primer punto para terminar.';
        }
        if (live) live.textContent = 'Área en vivo: 0 m² (0.0 cuadras)';
        if (banner) banner.hidden = false;
        if (tooltip) tooltip.hidden = false;
      });

      state.map.on(L.Draw.Event.DRAWVERTEX, function (e) {
        const layers = (e.layers && e.layers.getLayers && e.layers.getLayers()) || [];
        state.guidedVertices = layers.map(m => m.getLatLng());
      });

      state.map.on(L.Draw.Event.DRAWSTOP, function () {
        state.guidedVertices = [];
        state.activeDrawType = null;
        state.rectStartLatLng = null;
        syncToolbarPressedStates(null);
        document.body.classList.remove('guided-drawing-active');
        const banner = document.getElementById('guided-draw-banner');
        const tooltip = document.getElementById('guided-draw-tooltip');
        if (banner) banner.hidden = true;
        if (tooltip) tooltip.hidden = true;
      });

      state.map.on(L.Draw.Event.EDITSTART, function () {
        state.activeDrawType = 'edit';
        syncToolbarPressedStates('edit');
        document.body.classList.add('guided-drawing-active');
        const banner = document.getElementById('guided-draw-banner');
        const txt = document.getElementById('guided-draw-banner-text');
        const live = document.getElementById('guided-draw-live-area');
        const p = obtenerParcelaActual();
        if (txt) {
          txt.textContent = 'Modo edición: arrastra los círculos blancos en las esquinas del lote y pulsa «Guardar cambios».';
        }
        if (live && p) {
          live.textContent = `Área actual: ${fmtMiles(haAM2(p.area_ha))} m² (~${haACuadras(p.area_ha)} cuadras)`;
        }
        if (banner) banner.hidden = false;
      });

      state.map.on(L.Draw.Event.EDITVERTEX, function () {
        const live = document.getElementById('guided-draw-live-area');
        const capa = state.drawnItems && state.drawnItems.getLayers()[0];
        if (!capa || !live || typeof capa.getLatLngs !== 'function') return;
        const raw = capa.getLatLngs();
        const pts = Array.isArray(raw[0]) ? raw[0] : raw;
        if (pts && pts.length >= 3) {
          const ha = calcularAreaPoligonoHa(pts);
          live.textContent = `Nueva área: ${fmtMiles(haAM2(ha))} m² (~${haACuadras(ha)} cuadras)`;
        }
      });

      state.map.on(L.Draw.Event.EDITSTOP, function () {
        state.activeDrawType = null;
        syncToolbarPressedStates(null);
        document.body.classList.remove('guided-drawing-active');
        const banner = document.getElementById('guided-draw-banner');
        if (banner) banner.hidden = true;
      });

      state.map.on(L.Draw.Event.EDITED, function (e) {
        const layers = e.layers;
        layers.eachLayer(function (layer) {
          if (typeof layer.getLatLngs !== 'function') return;
          const raw = layer.getLatLngs();
          const latlngs = Array.isArray(raw[0]) ? raw[0] : raw;
          if (!latlngs || latlngs.length < 3) return;
          const centro = layer.getBounds().getCenter();
          const p = obtenerParcelaActual();
          p.area_ha = calcularAreaPoligonoHa(latlngs);
          p.centroide = { lat: Number(centro.lat.toFixed(5)), lon: Number(centro.lng.toFixed(5)) };
          p.geometria = {
            type: 'Polygon',
            coordinates: [
              latlngs.map(pt => [Number(pt.lng.toFixed(5)), Number(pt.lat.toFixed(5))])
                .concat([[Number(latlngs[0].lng.toFixed(5)), Number(latlngs[0].lat.toFixed(5))]])
            ]
          };
          layer.setPopupContent(crearPopupParcelaHtml(p));
          sincronizarControlesPaso2ConParcela();
          actualizarTodo();
          cargarDatosLoteEnVivo(p, layer);
        });
      });

      state.map.on('mousedown', function (e) {
        if (state.activeDrawType === 'rectangle' && e.latlng) {
          state.rectStartLatLng = e.latlng;
        }
      });

      state.map.on('mousemove', function (e) {
        const tooltip = document.getElementById('guided-draw-tooltip');
        const live = document.getElementById('guided-draw-live-area');
        if (!tooltip || tooltip.hidden) return;
        if (e.containerPoint) {
          tooltip.style.left = `${e.containerPoint.x}px`;
          tooltip.style.top = `${e.containerPoint.y}px`;
        }
        if (state.activeDrawType === 'rectangle') {
          if (state.rectStartLatLng && e.latlng) {
            const a = state.rectStartLatLng;
            const b = e.latlng;
            const rectPts = [
              { lat: a.lat, lng: a.lng },
              { lat: a.lat, lng: b.lng },
              { lat: b.lat, lng: b.lng },
              { lat: b.lat, lng: a.lng }
            ];
            const ha = calcularAreaPoligonoHa(rectPts);
            const m2 = fmtMiles(haAM2(ha));
            const cuad = haACuadras(ha);
            if (live) live.textContent = `Área en vivo: ${m2} m² (~${cuad} cuadras)`;
            tooltip.textContent = `Rectángulo: ${m2} m² (~${cuad} cuadras) · Suelta para crear`;
          } else {
            tooltip.textContent = 'Haz clic y arrastra para dibujar el rectángulo';
          }
          return;
        }
        const pts = (state.guidedVertices || []).concat([e.latlng]);
        if (pts.length >= 3) {
          const ha = calcularAreaPoligonoHa(pts);
          const m2 = fmtMiles(haAM2(ha));
          const cuad = haACuadras(ha);
          if (live) live.textContent = `Área en vivo: ${m2} m² (~${cuad} cuadras)`;
          tooltip.textContent = `${m2} m² (~${cuad} cuadras) · Doble clic para cerrar`;
        } else {
          tooltip.textContent = pts.length === 1
            ? 'Haz clic en la 1.ª esquina de tu terreno'
            : 'Marca al menos 3 esquinas · Doble clic para terminar';
        }
      });

      state.map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        state.drawnItems.clearLayers();
        state.drawnItems.addLayer(layer);

        const latlngs = layer.getLatLngs()[0] || [];
        const centro = layer.getBounds().getCenter();
        const dentro = parcelaQueContiene(centro.lat, centro.lng);
        if (dentro) {
          // El lote cae en una parcela con historial satelital de AppEEARS: se usa esa, con su NDVI real
          seleccionarParcelaPorId(dentro);
          const pd = obtenerParcelaActual();
          pd.area_ha = calcularAreaPoligonoHa(latlngs);
          actualizarTodo();
          return;
        }
        const lote = crearLoteDibujado(obtenerParcelaActual(), latlngs, centro);
        state.parcelasActivas[lote.id] = lote;
        state.parcelasOriginales[lote.id] = clonar(lote);
        state.parcelaActualId = lote.id;
        state.rotacionSeleccionadaGraficoId = 'recomendada_1';

        sincronizarControlesPaso2ConParcela();
        layer.bindPopup(crearPopupParcelaHtml(lote)).openPopup();
        actualizarTodo();
        cargarDatosLoteEnVivo(lote, layer);
      });
    }

    dibujarPoligonoParcelaActual(true);
  }

  function crearPopupParcelaHtml(parcela) {
    const cuadras = haACuadras(parcela.area_ha);
    return `
      <div style="font-family: 'Public Sans', sans-serif; min-width: 210px; color: #2B2A22;">
        <strong style="font-size: 0.92rem; color: #3E4A1E;">${parcela.nombre}</strong>
        <div style="font-size: 0.82rem; color: #5A5440; margin-top: 4px; font-variant-numeric: tabular-nums;">
          Ubicación: ${parcela.ubicacion_texto}<br/>
          Superficie: <b>${fmtMiles(haAM2(parcela.area_ha))} m²</b> (${cuadras} cuadras)<br/>
          Altitud: <b>${fmtMiles(parcela.terreno.elev_m)} m s.n.m.</b> · Pendiente: <b>${parcela.terreno.pendiente_pct} %</b><br/>
          Suelo: <b>${parcela.suelo.textura}</b> (SOC: ${parcela.suelo.soc_pct} %, pH ${parcela.suelo.ph})
        </div>
      </div>
    `;
  }

  /**
   * Lote dibujado por el usuario: parte de la parcela de demo seleccionada solo como respaldo
   * y marca TODO como pendiente hasta que respondan los datos en vivo (js/datos_vivo.js).
   */
  /** Devuelve el id de la parcela precalculada (con historial satelital) que contiene el punto, o null. */
  function parcelaQueContiene(lat, lon) {
    for (const [id, p] of Object.entries(state.parcelasOriginales)) {
      if (id === 'lote_dibujado' || !p.geometria || !p.geometria.coordinates) continue;
      const anillo = p.geometria.coordinates[0] || [];
      let dentro = false;
      for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) dentro = !dentro;
      }
      if (dentro) return id;
      // tolerancia: a menos de 150 m del centroide también cuenta (el lote dibujado puede ser más grande)
      const c = p.centroide || {};
      if (typeof c.lat === 'number') {
        const dx = (lon - c.lon) * 111320 * Math.cos(lat * Math.PI / 180), dy = (lat - c.lat) * 111320;
        if (Math.hypot(dx, dy) < 150) return id;
      }
    }
    return null;
  }

  /** Crea un lote nuevo en un punto cualquiera (sin dibujar) y pide sus datos en vivo. */
  function abrirLoteEnPunto(lat, lon, ladoM) {
    const dentro = parcelaQueContiene(lat, lon);
    if (dentro) { seleccionarParcelaPorId(dentro); return; }
    const lado = ladoM || 140;
    const dlat = lado / 2 / 111320, dlon = lado / 2 / (111320 * Math.cos(lat * Math.PI / 180));
    const latlngs = [
      { lat: lat + dlat, lng: lon - dlon }, { lat: lat + dlat, lng: lon + dlon },
      { lat: lat - dlat, lng: lon + dlon }, { lat: lat - dlat, lng: lon - dlon }
    ];
    const lote = crearLoteDibujado(obtenerParcelaActual(), latlngs, { lat, lng: lon });
    state.parcelasActivas[lote.id] = lote;
    state.parcelasOriginales[lote.id] = clonar(lote);
    state.parcelaActualId = lote.id;
    state.rotacionSeleccionadaGraficoId = 'recomendada_1';
    sincronizarControlesPaso2ConParcela();
    dibujarPoligonoParcelaActual(true);
    actualizarTodo();
    const capa = state.drawnItems && state.drawnItems.getLayers()[0];
    cargarDatosLoteEnVivo(lote, capa || null);
  }

  function crearLoteDibujado(base, latlngs, center) {
    const lat = Number(center.lat.toFixed(5)), lon = Number(center.lng.toFixed(5));
    const lote = clonar(base);
    lote.id = 'lote_dibujado';
    lote.nombre = 'Lote dibujado por el usuario';
    lote.ubicacion_texto = `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;
    lote.area_ha = calcularAreaPoligonoHa(latlngs);
    lote.centroide = { lat, lon };
    lote.geometria = {
      type: 'Polygon',
      coordinates: [latlngs.map(pt => [Number(pt.lng.toFixed(5)), Number(pt.lat.toFixed(5))])
        .concat(latlngs.length ? [[Number(latlngs[0].lng.toFixed(5)), Number(latlngs[0].lat.toFixed(5))]] : [])]
    };
    const cargando = 'EJEMPLO (consultando datos en vivo; mientras tanto, valores de la parcela de demo)';
    lote.estado_datos = {
      clima: cargando, anomalia: cargando, suelo: cargando, terreno: cargando
    };
    lote.anomalia = Object.assign({}, lote.anomalia, { fuente: 'EJEMPLO (consultando NASA POWER…)' });
    lote.suelo = Object.assign({}, lote.suelo, { fuente: 'EJEMPLO (consultando SoilGrids…)', editado_por_usuario: false });
    lote.ndvi_mensual = [];
    lote.historia_inferida = [];
    lote.historia_declarada = ['', ''];
    lote.nematodo_declarado = false;
    delete lote.smap;
    return lote;
  }

  function mostrarEstadoDatosVivo(filas, mensaje) {
    const el = document.getElementById('estado-datos-vivo');
    if (!el) return;
    el.hidden = false;
    const icono = v => `<i data-lucide="${v === null ? 'loader-circle' : (v ? 'circle-check' : 'triangle-alert')}" class="icono${v === null ? ' girando' : ''}" aria-hidden="true"></i>`;
    el.innerHTML = `<strong>${mensaje}</strong><ul>` +
      filas.map(f => `<li>${icono(f.ok)} ${f.texto}</li>`).join('') + '</ul>';
    refrescarIconosLucide();
  }

  async function cargarDatosLoteEnVivo(lote, layer) {
    if (!window.DatosVivo) return;
    const token = (state.tokenLote = (state.tokenLote || 0) + 1);
    const filas = {
      terreno: { texto: 'Altitud y pendiente · SRTM 30 m (OpenTopoData / Open-Elevation / Open-Meteo)', ok: null },
      clima: { texto: 'Clima 2015–actualidad · NASA POWER', ok: null },
      anomalia: { texto: 'Anomalía de lluvia · NASA POWER', ok: null },
      suelo: { texto: 'Suelo · ISRIC SoilGrids 250 m', ok: null }
    };
    const pintar = msg => mostrarEstadoDatosVivo(Object.values(filas), msg);
    pintar('Consultando datos de la NASA para su lote…');

    const r = await window.DatosVivo.cargar(lote.centroide.lat, lote.centroide.lon, (fuente, ok) => {
      if (token !== state.tokenLote || !filas[fuente]) return;
      filas[fuente].ok = ok;
      pintar('Consultando datos de la NASA para su lote…');
    });
    if (token !== state.tokenLote) return; // el usuario dibujó otro lote mientras tanto

    const p = state.parcelasActivas[lote.id];
    if (!p) return;
    const falla = 'EJEMPLO (no respondió el servicio; se mantienen valores de la parcela de demo)';
    if (r.terreno && !r.terreno.aproximado) {
      const { fuente, ...t } = r.terreno;
      Object.assign(p.terreno, t);
      p.region = r.region || p.region;
      p.estado_datos.terreno = `${fuente || 'SRTM 30 m'}, 5 puntos`;
    } else if (r.terreno) {
      p.terreno.elev_m = r.terreno.elev_m;
      p.region = r.region || p.region;
      p.estado_datos.terreno = 'EJEMPLO: altitud aproximada de la celda NASA POWER (~50 km); pendiente no verificada';
    } else { p.estado_datos.terreno = falla; }
    if (r.clima) {
      p.clima_mensual = r.clima.meses;
      p.clima_metodo_et0 = r.clima.metodoEt0;
      const per = r.clima.periodo || '2015–actualidad';
      filas.clima.texto = `Clima ${per} · NASA POWER`;
      p.estado_datos.clima = `NASA POWER ${per} (diario, AG); T corregida ${r.clima.dT >= 0 ? '+' : ''}${r.clima.dT.toFixed(1)} °C por altitud`;
    } else { p.estado_datos.clima = falla; }
    if (r.anomalia) {
      p.anomalia = r.anomalia;
      p.estado_datos.anomalia = `NASA POWER PRECTOTCORR, ${r.anomalia.ventana} vs ${r.anomalia.anios_referencia}`;
    } else { p.estado_datos.anomalia = falla; p.anomalia.fuente = falla; }
    if (r.suelo) {
      p.suelo = r.suelo;
      p.estado_datos.suelo = 'ISRIC SoilGrids 250 m (0–30 cm)';
    } else { p.estado_datos.suelo = falla; p.suelo.fuente = falla; }
    delete p.satelite_nasa;
    if (p.agricultor && !p.agricultor.editado_tierra) {
      p.agricultor.tipo_tierra = inferirTipoTierraSimple(p.suelo && p.suelo.textura);
    }
    asegurarEsquemaDual(p);
    state.parcelasOriginales[lote.id] = clonar(p);

    const nOk = ['terreno', 'clima', 'anomalia', 'suelo'].filter(k => r[k] && !(k === 'terreno' && r[k].aproximado)).length;
    pintar(nOk === 4
      ? 'Listo: su lote ya usa datos reales de la NASA y SoilGrids.'
      : `Se cargaron ${nOk} de 4 fuentes; lo demás queda marcado como EJEMPLO.`);
    sincronizarControlesPaso2ConParcela();
    if (layer) layer.setPopupContent(crearPopupParcelaHtml(p));
    actualizarTodo();
  }

  function dibujarPoligonoParcelaActual(centrar) {
    if (!state.map || !state.drawnItems) return;
    const parcela = obtenerParcelaActual();
    state.drawnItems.clearLayers();

    const coords = (parcela.geometria && parcela.geometria.coordinates && parcela.geometria.coordinates[0]) || [];
    if (coords.length > 0) {
      const latlngs = coords.map(par => [par[1], par[0]]);
      const pend = parcela.terreno.pendiente_pct;
      const colorBorde = pend > 25
        ? '#9B2C1F'
        : (pend >= 12 ? '#B7791F' : '#4F6B1F');

      const poly = L.polygon(latlngs, {
        color: colorBorde,
        weight: 3,
        dashArray: pend >= 12 ? '6, 4' : null,
        fillColor: colorBorde,
        fillOpacity: 0.24
      });

      poly.bindPopup(crearPopupParcelaHtml(parcela));
      state.drawnItems.addLayer(poly);

      if (centrar) {
        state.map.fitBounds(poly.getBounds(), { padding: [45, 45], maxZoom: 16 });
      }
    }
  }

  /**
   * Renderiza la tarjeta de monitoreo hidrológico GPM IMERG + SMAP L4 en el Hero
   */
  function renderizarBannerAnomalia(parcela, pesos) {
    const anom = parcela.anomalia || { pct: 0, ventana: 'trimestre actual', mensaje: '' };
    const titleEl = document.getElementById('anomaly-title');
    const msgEl = document.getElementById('anomaly-message');
    const pillSensorEl = document.getElementById('anomaly-sensor-pill');
    const pillWeightEl = document.getElementById('anomaly-weight-pill');
    const stateBadgeEl = document.getElementById('anomaly-state-badge');

    const esSeco = anom.pct < -15 || state.opciones.escenarioLluviaPct <= -15;
    const esHumedo = !esSeco && anom.pct > 50;
    const signo = anom.pct > 0 ? '+' : '';

    if (stateBadgeEl) {
      stateBadgeEl.className = (esSeco || esHumedo) ? 'estado riesgo' : 'estado ok';
      stateBadgeEl.textContent = esSeco ? 'Alto · Sequía' : (esHumedo ? 'Alto · Exceso de lluvia' : 'Bajo · Normal');
    }

    if (titleEl) {
      titleEl.textContent = esSeco
        ? `Anomalía de sequía (${signo}${anom.pct} % en ${anom.ventana})`
        : (esHumedo
          ? `Anomalía de exceso de lluvia (${signo}${anom.pct} % en ${anom.ventana})`
          : `Monitoreo hidrológico (${signo}${anom.pct} % en ${anom.ventana})`);
    }
    if (msgEl) {
      msgEl.textContent = anom.mensaje;
    }
    if (pillSensorEl) {
      pillSensorEl.innerHTML = `${anom.fuente || 'NASA GPM IMERG + SMAP'} (<span class="tabular-nums">${anom.res_km || 10}</span> <span class="unidad">km</span>)`;
    }
    if (pillWeightEl) {
      const pct = Math.round((pesos ? pesos.w_h2o : 0.33) * 100);
      pillWeightEl.innerHTML = pesos && pesos.ajusteSequiaAplicado
        ? `<span class="tabular-nums">${pct}</span> <span class="unidad">% del IRR (ajuste ×1.3)</span>`
        : `<span class="tabular-nums">${pct}</span> <span class="unidad">% del IRR</span>`;
    }
  }

  function esEjemplo(parcela, campo) {
    const e = parcela && parcela.estado_datos;
    return !!(e && typeof e[campo] === 'string' && e[campo].startsWith('EJEMPLO'));
  }

  function sinDato(parcela, campo) {
    const e = parcela && parcela.estado_datos;
    return !!(e && typeof e[campo] === 'string' && e[campo].startsWith('SIN DATO'));
  }

  function marcarFuente(id, parcela, campo, textoReal) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.dataset.textoReal) el.dataset.textoReal = textoReal || el.textContent;
    const ejemplo = esEjemplo(parcela, campo);
    const falta = sinDato(parcela, campo);
    el.textContent = ejemplo ? `Ejemplo · ${el.dataset.textoReal}` : (falta ? `Sin dato · ${el.dataset.textoReal}` : el.dataset.textoReal);
    el.classList.toggle('tag-ejemplo', ejemplo || falta);
    el.title = (parcela.estado_datos && parcela.estado_datos[campo]) || '';
  }

  /**
   * Renderiza la ficha biofísica y el semáforo de vulnerabilidades del Paso 1
   */
  function renderizarParcelaActiva(parcela) {
    const el = document.getElementById('parcela-activa');
    if (!el) return;
    // La etiqueta de historial satelital solo aplica a los lotes con pedido en NASA AppEEARS
    let etiqueta = '';
    if (window.AyudaAgricultor && window.AyudaAgricultor.esParcelaSatelital(parcela)) {
      const conSat = (parcela.ndvi_mensual || []).length > 0 && !esEjemplo(parcela, 'ndvi');
      etiqueta = conSat
        ? '<span class="pill-sat ok"><i data-lucide="satellite" class="icono"></i> Con historial satelital HLS (NASA AppEEARS)</span>'
        : '<span class="pill-sat warn"><i data-lucide="satellite" class="icono"></i> Historial satelital pedido a NASA AppEEARS</span>';
    }
    el.innerHTML = `<strong>${parcela.nombre}</strong> <span class="unidad">· ${parcela.ubicacion_texto || ''}</span> ${etiqueta}`;
  }


  /** Pide el pronóstico de 7 días del lote una sola vez por ubicación y vuelve a pintar al llegar. */
  function solicitarPronostico(parcela) {
    const card = document.getElementById('pronostico-card');
    if (!window.Pronostico || !card || !parcela.centroide) return;
    const clave = `${parcela.centroide.lat},${parcela.centroide.lon}`;
    if (state.pronosticoClave === clave) {
      card.innerHTML = window.Pronostico.tarjeta(state.pronostico, state.pronosticoError);
      return;
    }
    if (state.pronosticoPidiendo === clave) return;
    state.pronosticoPidiendo = clave;
    card.innerHTML = window.Pronostico.tarjeta(null);
    window.Pronostico.cargar(parcela.centroide.lat, parcela.centroide.lon, parcela.terreno?.elev_m)
      .then(p => { state.pronostico = p; state.pronosticoError = false; })
      .catch(() => { state.pronostico = null; state.pronosticoError = true; })
      .finally(() => {
        state.pronosticoClave = clave;
        state.pronosticoPidiendo = null;
        const actual = obtenerParcelaActual();
        if (actual && `${actual.centroide?.lat},${actual.centroide?.lon}` === clave) actualizarTodo();
      });
  }

  function renderizarPaso1Terreno(parcela) {
    renderizarParcelaActiva(parcela);
    marcarFuente('tag-elev', parcela, 'terreno');
    marcarFuente('tag-pend', parcela, 'terreno');
    marcarFuente('tag-clima', parcela, 'clima');
    marcarFuente('tag-historia', parcela, 'ndvi');

    const tagBal = document.getElementById('tag-chart-balance');
    if (tagBal) tagBal.hidden = !esEjemplo(parcela, 'clima');
    const esSat = window.AyudaAgricultor ? window.AyudaAgricultor.esParcelaSatelital(parcela) : true;
    const tagHist = document.getElementById('tag-historia');
    if (tagHist) tagHist.hidden = !esSat;
    const cardHls = document.getElementById('chart-hls-ndvi')?.closest('.chart-card');
    if (cardHls) cardHls.hidden = !esSat;
    const tagHls = document.getElementById('tag-chart-hls');
    if (tagHls) {
      tagHls.hidden = !(esEjemplo(parcela, 'ndvi') || sinDato(parcela, 'ndvi'));
      tagHls.textContent = sinDato(parcela, 'ndvi')
        ? 'Lote nuevo: el historial satelital se pide a AppEEARS (tarda horas)'
        : 'Ejemplo: sin CSV satelital';
    }

    const cuadras = haACuadras(parcela.area_ha);
    document.getElementById('kpi-area-val').innerHTML = `${fmtMiles(haAM2(parcela.area_ha))} <span class="unidad">m²</span>`;
    document.getElementById('kpi-area-sub').textContent = `(~${cuadras} cuadras)`;

    document.getElementById('kpi-elev-val').innerHTML = `${fmtMiles(parcela.terreno.elev_m)} <span class="unidad">m s.n.m.</span>`;
    document.getElementById('kpi-elev-sub').textContent = `Región ${parcela.region} · ${parcela.terreno.orientacion}`;

    document.getElementById('kpi-pend-val').innerHTML = `${parcela.terreno.pendiente_pct} <span class="unidad">% media</span>`;
    document.getElementById('kpi-pend-sub').innerHTML = `Máx. ${parcela.terreno.pendiente_max_pct} <span class="unidad">% (f=${window.BalanceMotor.factorPendiente(parcela.terreno.pendiente_pct)})</span>`;

    const lluviaAnual = (parcela.clima_mensual || []).reduce((acc, m) => acc + m.P_mm, 0);
    const et0Anual = (parcela.clima_mensual || []).reduce((acc, m) => acc + m.ET0_mm, 0);
    const factorEsc = 1 + (state.opciones.escenarioLluviaPct || 0) / 100;
    const lluviaEscenario = Math.round(lluviaAnual * factorEsc);

    document.getElementById('kpi-clima-val').innerHTML = `${fmtMiles(lluviaEscenario)} <span class="unidad">mm/año</span>`;
    document.getElementById('kpi-clima-sub').innerHTML = `${fmtMiles(Math.round(et0Anual))} <span class="unidad">mm/año</span>`;
    const conExtra = (parcela.clima_mensual || []).filter(m => m.Rs_MJ !== undefined);
    const elExtra = document.getElementById('kpi-nasa-extra');
    if (elExtra) {
      if (conExtra.length === 12) {
        const prom = k => conExtra.reduce((a, m) => a + m[k], 0) / 12;
        elExtra.innerHTML = `${prom('Rs_MJ').toFixed(1)} <span class="unidad">MJ/m²·día</span> · ${prom('Viento_ms').toFixed(1)} <span class="unidad">m/s</span> · ${Math.round(prom('HR_pct'))} <span class="unidad">% HR</span>`;
        elExtra.title = parcela.clima_metodo_et0 || '';
      } else {
        elExtra.innerHTML = '<span class="unidad">sin dato: ET₀ solo con temperatura (Hargreaves)</span>';
        elExtra.title = parcela.clima_metodo_et0 || 'Hargreaves FAO-56';
      }
    }

    // Semáforo de vulnerabilidades con texto explícito ("Bajo", "Medio", "Alto")
    const vulnContainer = document.getElementById('vuln-badges-container');
    const badges = [];

    if (parcela.terreno.pendiente_pct > 25) {
      badges.push({
        clase: 'riesgo',
        texto: `Alto · Erosión crítica (pendiente ${parcela.terreno.pendiente_pct} % > 25 %): descartada labranza intensiva`
      });
    } else if (parcela.terreno.pendiente_pct >= 12) {
      badges.push({
        clase: 'alerta',
        texto: `Medio · Ladera moderada (${parcela.terreno.pendiente_pct} %): requiere surcos en contorno y rastrojo`
      });
    } else {
      badges.push({
        clase: 'ok',
        texto: `Bajo · Relieve suave (${parcela.terreno.pendiente_pct} %): baja pérdida por escorrentía`
      });
    }

    const minAbs = Math.min(...(parcela.clima_mensual || []).map(m => m.Tmin_abs));
    if (minAbs < 0) {
      badges.push({
        clase: 'riesgo',
        texto: `Alto · Helada severa (Tmin absoluta ${minAbs} °C en verano): excluidos cultivos sensibles`
      });
    } else if (minAbs < 2.0) {
      badges.push({
        clase: 'alerta',
        texto: `Medio · Enfriamiento nocturno (Tmin ${minAbs} °C en jun–ago): resguardar floración`
      });
    } else {
      badges.push({
        clase: 'ok',
        texto: `Bajo · Sin riesgo de helada (Tmin mínima ${minAbs} °C)`
      });
    }

    const mesesDesnudo = (parcela.ndvi_mensual || []).filter(m => m.ndvi < 0.25).length;
    const totalObs = (parcela.ndvi_mensual || []).length || 24;
    if (!(parcela.ndvi_mensual || []).length) {
      badges.push({
        clase: 'alerta',
        texto: 'Sin dato · Historial de suelo desnudo (HLS) no disponible para este lote'
      });
    } else if (mesesDesnudo >= 8) {
      badges.push({
        clase: 'alerta',
        texto: `Medio · Suelo desnudo frecuente: ${mesesDesnudo} de ${totalObs} meses con NDVI < 0.25`
      });
    } else {
      badges.push({
        clase: 'ok',
        texto: `Bajo · Buena cobertura vegetal histórica (${totalObs - mesesDesnudo}/${totalObs} meses cubiertos)`
      });
    }

    const badgesHtml = badges
      .map(b => `<span class="estado ${b.clase}">${b.texto}</span>`)
      .join('');
    const AY = window.AyudaAgricultor;
    if (AY) {
      const clavePron = `${parcela.centroide?.lat},${parcela.centroide?.lon}`;
      const pron = state.pronosticoClave === clavePron ? state.pronostico : null;
      const avisos = AY.advertenciasLote(parcela, state.opciones)
        .concat(window.Pronostico ? window.Pronostico.avisos(pron) : []);
      solicitarPronostico(parcela);
      state.avisosLote = avisos;
      vulnContainer.innerHTML = AY.listaDetalleAdvertencias(avisos);
      AY.activarListaDetalle(vulnContainer);
      const resumen = document.getElementById('resumen-riesgos');
      if (resumen) resumen.innerHTML = AY.resumenRiesgos(avisos);
      const cnt = document.getElementById('cuenta-avisos');
      if (cnt) cnt.textContent = avisos.filter(x => x.clase === 'riesgo' || x.clase === 'alerta').length;
      const medEl = document.getElementById('medidores-lote');
      if (medEl) medEl.innerHTML = AY.medidoresLote(parcela, state.opciones);
      const tabEl = document.getElementById('tabla-clima-tecnica');
      if (tabEl) tabEl.innerHTML = AY.tablaClimaTecnica(parcela, state.opciones);
    } else {
      vulnContainer.innerHTML = badgesHtml;
    }

    const vulnMirror = document.getElementById('vuln-badges-mirror');
    if (vulnMirror) vulnMirror.innerHTML = badgesHtml;

    // Actualizar tarjeta "Parcela en memoria" y badge de vulnerabilidades en la barra lateral
    const sbNombre = document.getElementById('sidebar-parcela-nombre');
    const sbArea = document.getElementById('sidebar-parcela-area');
    const sbElev = document.getElementById('sidebar-parcela-elev');
    const sbPend = document.getElementById('sidebar-parcela-pend');
    if (sbNombre) sbNombre.textContent = parcela.nombre || 'Parcela activa';
    if (sbArea) sbArea.textContent = `${fmtMiles(haAM2(parcela.area_ha))} m²`;
    if (sbElev) sbElev.textContent = `${fmtMiles(parcela.terreno.elev_m)} m`;
    if (sbPend) sbPend.textContent = `${parcela.terreno.pendiente_pct} %`;

    const sbVuln = document.getElementById('sidebar-vuln-badge');
    if (sbVuln) {
      const fuenteNivel = state.avisosLote || badges;
      const tieneAlto = fuenteNivel.some(b => b.clase === 'riesgo');
      const tieneMedio = fuenteNivel.some(b => b.clase === 'alerta');
      const nivel = tieneAlto ? 'Alto' : (tieneMedio ? 'Medio' : 'Bajo');
      const claseExtra = tieneAlto ? '' : (tieneMedio ? ' medio' : ' bajo');
      sbVuln.className = `sidebar-badge-status${claseExtra}`;
      sbVuln.innerHTML = `<span class="status-dot" aria-hidden="true"></span>${nivel}`;
    }
  }

  const MAPA_TIERRA_SIMPLE = {
    arenosa: { etiqueta: 'Arenosa', textura: 'Arenoso', soc_pct: 1.4 },
    negra_franca: { etiqueta: 'Negra / Franca', textura: 'Franco', soc_pct: 3.2 },
    arcillosa: { etiqueta: 'Arcillosa', textura: 'Arcilloso', soc_pct: 2.2 }
  };

  function inferirTipoTierraSimple(textura) {
    const t = String(textura || '').toLowerCase();
    if (t.includes('arenos')) return 'arenosa';
    if (t.includes('arcillos')) return 'arcillosa';
    return 'negra_franca';
  }

  /**
   * Garantiza el modelo dual unificado (agricultor + satelite_nasa + tecnico) sin alterar datos previos
   */
  function asegurarEsquemaDual(parcela) {
    if (!parcela) return parcela;
    if (!parcela.satelite_nasa) {
      parcela.satelite_nasa = {
        suelo_soilgrids: clonar(parcela.suelo || {}),
        terreno_srtm: clonar(parcela.terreno || {})
      };
    }
    if (!parcela.agricultor) {
      parcela.agricultor = {
        tipo_tierra: inferirTipoTierraSimple(parcela.suelo && parcela.suelo.textura),
        historia_cultivos: clonar(parcela.historia_declarada || ['papa', 'papa']),
        vio_nematodos: Boolean(parcela.nematodo_declarado),
        manejo_rastrojo: state.opciones.retiraForraje ? 'retirar_ganado' : 'dejar_en_suelo',
        prioridades: clonar(state.sliders)
      };
    }
    if (!parcela.tecnico) {
      parcela.tecnico = {
        suelo_laboratorio: { textura: null, soc_pct: null, ph: null },
        terreno_verificado: { pendiente_pct: null },
        notas_campo: ''
      };
    }
    return parcela;
  }

  /**
   * Resuelve valores efectivos para el motor: Técnico > Base Agricultor / Satélite NASA
   */
  function aplicarDatosEfectivos(parcela) {
    asegurarEsquemaDual(parcela);
    const baseSuelo = parcela.satelite_nasa.suelo_soilgrids || {};
    const baseTerreno = parcela.satelite_nasa.terreno_srtm || {};
    const mapAg = MAPA_TIERRA_SIMPLE[parcela.agricultor.tipo_tierra] || MAPA_TIERRA_SIMPLE.negra_franca;
    const lab = parcela.tecnico.suelo_laboratorio || {};
    const campo = parcela.tecnico.terreno_verificado || {};

    parcela.suelo.textura = lab.textura || (parcela.agricultor.editado_tierra ? mapAg.textura : (baseSuelo.textura || mapAg.textura));
    parcela.suelo.soc_pct = lab.soc_pct !== null && lab.soc_pct !== undefined
      ? lab.soc_pct
      : (parcela.agricultor.editado_tierra ? mapAg.soc_pct : (baseSuelo.soc_pct ?? mapAg.soc_pct));
    parcela.suelo.ph = lab.ph !== null && lab.ph !== undefined ? lab.ph : (baseSuelo.ph ?? 6.0);
    parcela.suelo.editado_por_usuario = Boolean(lab.textura || lab.soc_pct !== null || lab.ph !== null || parcela.agricultor.editado_tierra);

    parcela.terreno.pendiente_pct = campo.pendiente_pct !== null && campo.pendiente_pct !== undefined
      ? campo.pendiente_pct
      : (baseTerreno.pendiente_pct ?? parcela.terreno.pendiente_pct);

    parcela.historia_declarada = clonar(parcela.agricultor.historia_cultivos);
    parcela.nematodo_declarado = Boolean(parcela.agricultor.vio_nematodos);
  }

  function construirJsonCombinado(parcela) {
    asegurarEsquemaDual(parcela);
    return {
      id: parcela.id,
      nombre: parcela.nombre,
      ubicacion: {
        texto: parcela.ubicacion_texto,
        centroide: parcela.centroide,
        area_ha: parcela.area_ha
      },
      agricultor: parcela.agricultor,
      satelite_nasa: parcela.satelite_nasa,
      tecnico: parcela.tecnico,
      estado_efectivo_motor: {
        suelo: parcela.suelo,
        terreno: parcela.terreno,
        historia_declarada: parcela.historia_declarada,
        nematodo_declarado: parcela.nematodo_declarado,
        sliders: state.sliders,
        opciones: state.opciones
      }
    };
  }

  const TEXTO_PRIORIDAD = ['', 'Poco', 'Algo', 'Normal', 'Bastante', 'Mucho'];

  function pintarPrioSlider(wrap, val) {
    const key = wrap.getAttribute('data-simple-slider');
    const inp = wrap.querySelector('.prio-slider');
    if (!inp) return;
    inp.value = String(val);
    inp.style.setProperty('--lleno', `${((val - 1) / 4) * 100}%`);
    inp.setAttribute('aria-valuetext', TEXTO_PRIORIDAD[val]);
    const txt = wrap.querySelector('.prio-texto');
    if (txt) txt.textContent = TEXTO_PRIORIDAD[val];
    const ic = wrap.querySelector('.prio-iconos');
    if (ic) ic.innerHTML = [1, 2, 3, 4, 5].map(n => `<span class="prio-seg${n <= val ? ' lleno' : ''}"></span>`).join('');
    wrap.dataset.nivel = String(val);
  }

  function sincronizarBotonesPrioridadSimple() {
    document.querySelectorAll('.prio-slider-wrap[data-simple-slider]').forEach(wrap => {
      const key = wrap.getAttribute('data-simple-slider');
      pintarPrioSlider(wrap, Math.max(1, Math.min(5, Number(state.sliders[key] || 3))));
    });
    document.querySelectorAll('.priority-btn-group[data-simple-slider]').forEach(group => {
      const key = group.getAttribute('data-simple-slider');
      const val = Number(state.sliders[key] || 3);
      const targetVal = val <= 2 ? 1 : (val >= 4 ? 5 : 3);
      group.querySelectorAll('.prio-btn').forEach(btn => {
        const bVal = Number(btn.getAttribute('data-val'));
        btn.classList.toggle('activo', bVal === targetVal);
      });
    });
  }

  /**
   * Pobla los selectores e inputs del Paso 2 (Vista Agricultor + Vista Técnico)
   */
  function sincronizarControlesPaso2ConParcela() {
    const parcela = obtenerParcelaActual();
    aplicarDatosEfectivos(parcela);

    // Sincronizar tarjetas simples de tipo de tierra (Agricultor)
    const tipoSimple = parcela.agricultor.tipo_tierra || 'negra_franca';
    document.querySelectorAll('.soil-simple-btn[data-soil-simple]').forEach(btn => {
      const activo = btn.getAttribute('data-soil-simple') === tipoSimple;
      btn.classList.toggle('activo', activo);
      btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });

    // Sincronizar resumen protegido para el Técnico
    const summaryEl = document.getElementById('tech-farmer-summary');
    if (summaryEl) {
      const etiquetaTierra = (MAPA_TIERRA_SIMPLE[tipoSimple] || MAPA_TIERRA_SIMPLE.negra_franca).etiqueta;
      const nemTxt = parcela.agricultor.vio_nematodos ? 'Sí reportó plagas/nematodos' : 'Sin plagas reportadas';
      const rastTxt = parcela.agricultor.manejo_rastrojo === 'retirar_ganado' ? 'Retira rastrojo' : 'Deja rastrojo en suelo';
      summaryEl.textContent = `Base declarada por el agricultor (protegida): Tierra ${etiquetaTierra} · ${nemTxt} · ${rastTxt}.`;
    }

    const selTextura = document.getElementById('input-suelo-textura');
    const inpSoc = document.getElementById('input-suelo-soc');
    const inpPh = document.getElementById('input-suelo-ph');
    const inpPend = document.getElementById('input-tecnico-pendiente');
    const inpNotas = document.getElementById('input-tecnico-notas');
    const badgeOrigen = document.getElementById('soil-origin-badge');

    if (selTextura) selTextura.value = parcela.suelo.textura || 'Franco';
    if (inpSoc) inpSoc.value = parcela.suelo.soc_pct ?? 2.5;
    if (inpPh) inpPh.value = parcela.suelo.ph ?? 6.0;
    if (inpPend) {
      const pendTec = parcela.tecnico && parcela.tecnico.terreno_verificado && parcela.tecnico.terreno_verificado.pendiente_pct;
      inpPend.value = pendTec !== null && pendTec !== undefined ? pendTec : '';
    }
    if (inpNotas) {
      inpNotas.value = (parcela.tecnico && parcela.tecnico.notas_campo) || '';
    }

    if (badgeOrigen) {
      const lab = (parcela.tecnico && parcela.tecnico.suelo_laboratorio) || {};
      if (lab.textura || lab.soc_pct !== null || lab.ph !== null) {
        badgeOrigen.textContent = 'Calibrado con laboratorio (Técnico)';
        badgeOrigen.className = 'estado alerta solo-tecnico';
      } else if (parcela.agricultor.editado_tierra) {
        badgeOrigen.textContent = 'Estimado desde selección del agricultor';
        badgeOrigen.className = 'estado ok solo-tecnico';
      } else {
        badgeOrigen.textContent = parcela.suelo.fuente || 'ISRIC SoilGrids 250 m';
        badgeOrigen.className = 'mono solo-tecnico';
      }
    }

    const selHist1 = document.getElementById('select-historia-1');
    const selHist2 = document.getElementById('select-historia-2');
    if (selHist1 && selHist2 && state.catalogo) {
      const opcionesHtml = state.catalogo.cultivos
        .map(c => `<option value="${c.id}">${c.nombre} (${c.familia})</option>`)
        .join('');
      selHist1.innerHTML = opcionesHtml;
      selHist2.innerHTML = opcionesHtml;

      const h1 = (parcela.historia_declarada && parcela.historia_declarada[0]) || 'papa';
      const h2 = (parcela.historia_declarada && parcela.historia_declarada[1]) || h1;
      selHist1.value = h1;
      selHist2.value = h2;
    }

    const chkNem = document.getElementById('check-nematodo');
    if (chkNem) {
      chkNem.checked = Boolean(parcela.nematodo_declarado);
    }

    const sliderAgua = document.getElementById('slider-agua');
    const sliderSuelo = document.getElementById('slider-suelo');
    const sliderGanar = document.getElementById('slider-ganar');
    if (sliderAgua) sliderAgua.value = String(state.sliders.agua);
    if (sliderSuelo) sliderSuelo.value = String(state.sliders.suelo);
    if (sliderGanar) sliderGanar.value = String(state.sliders.ganar);
    sincronizarBotonesPrioridadSimple();
  }

  /**
   * Construye dinámicamente las viñetas de "¿Por qué sugerimos esta rotación?"
   * en función de las especies reales de la secuencia (leguminosas, familias botánicas,
   * arquitectura radicular y demanda hídrica) y del cultivo previo de la parcela.
   */
  function construirRazonesPorQueSugerimos(rot, parcela) {
    const cultivos = rot.cultivos || [];
    if (!cultivos.length) return [];

    const catalogoLista = (state.catalogo && state.catalogo.cultivos) || [];
    const histIds = (parcela && parcela.historia_declarada) || ['papa'];
    const cultivoPrevio = catalogoLista.find(c => c.id === histIds[0]) || { nombre: 'Papa', familia: 'Solanáceas' };

    const razones = [];

    // 1. Ruptura del ciclo de plagas según familia previa y familias reales de la rotación
    const familiasRot = [...new Set(cultivos.map(c => c.familia))];
    const nombresRot = cultivos.map(c => c.nombre.toLowerCase()).join(', ');
    const repiteFamPreviaAnio1 = cultivos[0] && cultivos[0].familia === cultivoPrevio.familia;

    if (!repiteFamPreviaAnio1) {
      razones.push(
        `Rompe el ciclo de plagas y enfermedades de las ${cultivoPrevio.familia.toLowerCase()} (${cultivoPrevio.nombre.toLowerCase()}) al alternar ${familiasRot.length} familias distintas (${nombresRot}).`
      );
    } else {
      razones.push(
        `Diversifica la parcela alternando ${nombresRot} para reducir la presión de plagas específicas del suelo.`
      );
    }

    // 2. Fijación biológica de nitrógeno y materia orgánica (solo habla de nitrógeno si hay leguminosas reales)
    const leguminosas = cultivos.filter(c => c.familia === 'Fabáceas' || (c.credito_n_kg && c.credito_n_kg > 0));
    if (leguminosas.length > 0) {
      const nombresLeg = [...new Set(leguminosas.map(c => c.nombre.toLowerCase()))].join(' y ');
      const siguienteCultivo = (() => {
        const idxLeg = cultivos.findIndex(c => c.familia === 'Fabáceas' || (c.credito_n_kg && c.credito_n_kg > 0));
        return idxLeg >= 0 && cultivos[idxLeg + 1] ? cultivos[idxLeg + 1].nombre.toLowerCase() : null;
      })();
      razones.push(
        siguienteCultivo
          ? `Fija nitrógeno atmosférico con ${nombresLeg}, mejorando la materia orgánica y dejando nutrientes listos para la siembra de ${siguienteCultivo}.`
          : `Fija nitrógeno atmosférico mediante ${nombresLeg}, mejorando la materia orgánica y recuperando la fertilidad natural de la tierra.`
      );
    } else {
      const rastrojoT = (rot.detalles && rot.detalles.materiaOrganica && rot.detalles.materiaOrganica.biomasaResiduoTHa) || 0;
      razones.push(
        rastrojoT > 3
          ? `Incorpora abundante rastrojo vegetal de ${nombresRot} que protege la estructura y esponjosidad del suelo.`
          : `Alterna coberturas de ${nombresRot} para mantener el suelo protegido frente a la erosión.`
      );
    }

    // 3. Optimización hídrica y exploración radicular según las raíces y demanda reales de la secuencia
    const raicesUnicas = [...new Set(cultivos.map(c => c.raiz_tipo).filter(Boolean))];
    const cobAgua = (rot.balanceHidrico && rot.balanceHidrico.coberturaAguaPct) || 0;
    const cultivoMenorAgua = cultivos.slice().sort((a, b) => (a.kc_medio || 0.8) - (b.kc_medio || 0.8))[0];

    if (cobAgua >= 75) {
      razones.push(
        `Optimiza el uso hídrico en la temporada seca con especies rústicas como ${cultivoMenorAgua.nombre.toLowerCase()}` +
        (raicesUnicas.length > 1 ? ` y combina raíces (${raicesUnicas.join(' y ')}) que aprovechan la humedad a distintas profundidades.` : '.')
      );
    } else {
      razones.push(
        raicesUnicas.length > 1
          ? `Combina distintas profundidades de raíz (${raicesUnicas.join(' y ')}) entre ${nombresRot} para aprovechar mejor la humedad y no compactar la tierra.`
          : `Ajusta los ciclos de ${nombresRot} a los meses de mayor lluvia de la zona para reducir la necesidad de riego.`
      );
    }

    return razones;
  }

  /**
   * Renderiza las tarjetas comparativas del Paso 3 (Top 3 recomendadas + práctica actual)
   */
  function renderizarTarjetasRotacion(resultado, parcela) {
    const grid = document.getElementById('rotations-cards-grid');
    if (!grid) return;

    const metaBar = document.getElementById('engine-meta-bar');
    if (metaBar) {
      const p = resultado.pesosAplicados;
      metaBar.innerHTML = `
        <div>
          Evaluadas <strong class="tabular-nums">${resultado.totalSecuenciasEvaluadas}</strong> secuencias válidas de 3 años
          (<span class="tabular-nums">${resultado.cultivosAptos.length}</span> cultivos aptos en este piso térmico,
          <span class="tabular-nums">${resultado.cultivosVetados.length}</span> descartados).
        </div>
        <div class="tabular-nums mono">
          Pesos IRR: Agua ${Math.round(p.w_h2o * 100)} % ·
          Nitrógeno ${Math.round(p.w_n * 100)} % ·
          Materia orgánica ${Math.round(p.w_mos * 100)} % ·
          Rentabilidad ${Math.round(p.w_rent * 100)} %
        </div>
      `;
    }

    const todasLasTarjetas = [...resultado.recomendadas, resultado.actual];
    const areaHa = parcela.area_ha || 1.0;
    const modoGlobalTec = document.body.classList.contains('modo-tecnico');
    const hayAlgunaTecnica = modoGlobalTec || todasLasTarjetas.some(r => Boolean(state.tarjetasTecnicas[r.id]));

    const chartsGrid = document.getElementById('charts-grid-rotaciones');
    if (chartsGrid) {
      chartsGrid.hidden = false; // vive en la pestañita «Gráficos NASA»
      if (hayAlgunaTecnica) {
        setTimeout(() => {
          if (state.chartBalance) state.chartBalance.resize();
          if (state.chartHLS) state.chartHLS.resize();
        }, 40);
      }
    }

    grid.innerHTML = todasLasTarjetas.map((rot) => {
      const isTechnicalMode = modoGlobalTec || Boolean(state.tarjetasTecnicas[rot.id]);
      const esSeleccionadaGrafico = rot.id === state.rotacionSeleccionadaGraficoId;
      const clasesCard = [
        'rotation-card',
        rot.rango === 1 ? 'rank-1' : '',
        rot.esActual ? 'actual-card' : '',
        isTechnicalMode && esSeleccionadaGrafico ? 'selected-for-chart' : ''
      ].filter(Boolean).join(' ');

      const tituloAmigable = rot.esActual
        ? 'Su práctica actual (sin rotación)'
        : rot.titulo.replace(/^Estrategia\s+(\d+)/i, 'Opción $1');

      const anosCortos = ['Año 1', 'Año 2', 'Año 3'];
      const anosEtiquetas = ['Año 1 (2026–2027)', 'Año 2 (2027–2028)', 'Año 3 (2028–2029)'];
      const ingresoTotalLoteAnual = Math.round(rot.detalles.rentabilidad.margenAnualPromedioUsdHa * areaHa);

      // Vista Simple: Receta (solo años y cultivo)
      const AYr = window.AyudaAgricultor;
      const recetaSimpleHtml = rot.cultivos.map((c, i) => {
        const mej = AYr ? AYr.mejoresMeses(AYr.calendarioSiembra(c, parcela, state.opciones), 1)[0] : null;
        return `
        <div class="rot-simple-step">
          <span class="year-label">${anosCortos[i]}</span>
          <strong>${c.nombre}</strong>
          ${mej ? `<span class="rot-mes-siembra"><i data-lucide="calendar" class="icono" aria-hidden="true"></i> Siembre en ${AYr.MESES_LARGOS[mej.mes - 1]}</span>` : ''}
        </div>
      `;
      }).join('');

      // Vista Simple: Beneficios resumidos en lenguaje cotidiano
      const cobAgua = rot.balanceHidrico.coberturaAguaPct;
      const textoAguaSimple = cobAgua >= 85
        ? 'Cubierto casi en su totalidad por lluvia'
        : (cobAgua >= 60 ? 'Buena parte cubierta por lluvia; poco riego de apoyo' : 'Necesita riego de apoyo en meses secos');
      const tieneLeguminosa = rot.cultivos.some(c => c.familia === 'Fabáceas');
      const textoSueloSimple = tieneLeguminosa
        ? 'Abono natural por leguminosas'
        : 'Sin aporte de abono natural (desgasta el suelo)';

      // Vista Simple: Solo advertencias prácticas de campo (sin menciones a SoilGrids/250 m/satélites)
      const riesgosPracticos = (rot.explicacion.riesgosLocales || [])
        .filter(r => !/SoilGrids|250\s*m|NASA|satelital/i.test(r))
        .slice(0, 2);

      // Explicabilidad dinámica para Opción 1, Opción 2 y Opción 3
      const razonesSugerencia = !rot.esActual
        ? construirRazonesPorQueSugerimos(rot, parcela)
        : [];

      const alertaFitoHtml = rot.violaReglasFitosanitarias
        ? `<div class="estado riesgo" style="padding:6px 10px;">
             Alto · ${rot.motivoRiesgoFitosanitario}
           </div>
           <details class="aviso-acciones aviso-acciones-suelto" open>
             <summary><i data-lucide="list-checks" class="icono" aria-hidden="true"></i> ¿Qué puede hacer?</summary>
             <ul>
               <li>Cambie a una de las opciones recomendadas: alternan familias y cortan el ciclo de plagas.</li>
               <li>Si va a repetir, use semilla sana o certificada y arranque las plantas que rebrotan solas.</li>
               <li>Revise las raíces al cosechar: si ve "bolitas" (nematodos), deje descansar el lote 3 o 4 años de esa familia.</li>
             </ul>
           </details>`
        : '';

      // Vista Técnica: Secuencia completa, IRR, barras de subíndices, 5 puntos NASA
      let panelTecnicoHtml = '';
      if (isTechnicalMode) {
        const timelineTecnicoHtml = rot.cultivos.map((c, i) => {
          const signoN = c.credito_n_kg > 0
            ? `<span style="color:var(--ok); font-weight:600;">+${c.credito_n_kg} <span class="unidad">kg N/ha</span></span>`
            : `<span style="color:var(--alerta);">-${c.extraccion_n_kg} <span class="unidad">kg N/ha</span></span>`;
          return `
            <div class="year-node">
              <span class="year-label">${anosEtiquetas[i]}</span>
              <div class="crop-name-row"><span>${c.nombre}</span></div>
              <span class="crop-family-tag">${c.familia}</span>
              <div class="crop-meta-mini">
                Raíz: ${c.raiz_tipo}<br/>
                Balance N: ${signoN}<br/>
                Margen: <b>$${fmtMiles(c.margen_usd_ha || 0)}</b> <span class="unidad">/ha</span>${c.estado_economico === 'oficial' ? '' : ' <span class="tag-ejemplo" title="' + (c.fuente || '') + '">estimado</span>'}
              </div>
            </div>
          `;
        }).join('');

        const wAguaPct = Math.round(rot.subindices.agua * 100);
        const wNitPct = Math.round(rot.subindices.nitrogeno * 100);
        const wMosPct = Math.round(rot.subindices.materiaOrganica * 100);
        const wRentPct = Math.round(rot.subindices.rentabilidad * 100);
        const p = rot.pesos || resultado.pesosAplicados;

        panelTecnicoHtml = `
          <div class="rot-tech-panel">
            <div class="rot-tech-weights tabular-nums mono">
              <strong>Puntaje IRR: ${rot.irr.toFixed(2)}</strong> (${rot.irrPct}/100) ·
              Pesos: Agua ${Math.round(p.w_h2o * 100)}% · Nitrógeno ${Math.round(p.w_n * 100)}% · MOS ${Math.round(p.w_mos * 100)}% · Rentabilidad ${Math.round(p.w_rent * 100)}%
            </div>

            <div class="timeline-3y">${timelineTecnicoHtml}</div>

            <div class="subindices-bars">
              <div class="subbar-item">
                <div class="subbar-head">
                  <span><i data-lucide="droplet" class="icono"></i> Agua cubierta por lluvia</span>
                  <span class="tabular-nums">${rot.balanceHidrico.coberturaAguaPct} <span class="unidad">%</span> (I_H2O ${rot.subindices.agua.toFixed(2)})</span>
                </div>
                <div class="subbar-track"><div class="subbar-fill agua" style="width:${wAguaPct}%"></div></div>
                <div class="subbar-translation">Déficit 3 años: <b>${fmtMiles(rot.balanceHidrico.deficitTotal)}</b> <span class="unidad">mm</span> (${rot.balanceHidrico.mesesConDeficit} meses secos)</div>
              </div>

              <div class="subbar-item">
                <div class="subbar-head">
                  <span><i data-lucide="sprout" class="icono"></i> Balance de nitrógeno</span>
                  <span class="tabular-nums">${rot.detalles.nitrogeno.balanceNetoKgHa >= 0 ? '+' : ''}${rot.detalles.nitrogeno.balanceNetoKgHa} <span class="unidad">kg N/ha</span> (I_N ${rot.subindices.nitrogeno.toFixed(2)})</span>
                </div>
                <div class="subbar-track"><div class="subbar-fill nitrogeno" style="width:${wNitPct}%"></div></div>
                <div class="subbar-translation">Fijación por leguminosas: <b>+${rot.detalles.nitrogeno.creditosKgHa}</b> <span class="unidad">kg N/ha</span></div>
              </div>

              <div class="subbar-item">
                <div class="subbar-head">
                  <span><i data-lucide="flask-conical" class="icono"></i> Materia orgánica y suelo</span>
                  <span class="tabular-nums">${rot.detalles.materiaOrganica.humusEstableTHa} <span class="unidad">t/ha humus</span> (I_MOS ${rot.subindices.materiaOrganica.toFixed(2)})</span>
                </div>
                <div class="subbar-track"><div class="subbar-fill mos" style="width:${wMosPct}%"></div></div>
                <div class="subbar-translation">Biomasa de rastrojo: <b>${rot.detalles.materiaOrganica.biomasaResiduoTHa}</b> <span class="unidad">t MS/ha en 3 años</span></div>
              </div>

              <div class="subbar-item">
                <div class="subbar-head">
                  <span><i data-lucide="coins" class="icono"></i> Margen bruto estimado</span>
                  <span class="tabular-nums">$${fmtMiles(rot.detalles.rentabilidad.margenAnualPromedioUsdHa)} <span class="unidad">/ha/año</span> (I_rent ${rot.subindices.rentabilidad.toFixed(2)})</span>
                </div>
                <div class="subbar-track"><div class="subbar-fill rent" style="width:${wRentPct}%"></div></div>
                <div class="subbar-translation">En el lote (${fmtMiles(haAM2(areaHa))} <span class="unidad">m²</span>): <b>~$${fmtMiles(ingresoTotalLoteAnual)}</b> <span class="unidad">USD/año</span></div>
              </div>
            </div>

            <div class="explain-5-box">
              <p class="explain-summary-text">
                <strong>1. Por qué se sugiere:</strong> ${rot.explicacion.porQue}
              </p>
              <div class="explain-details-body">
                <div class="explain-block">
                  <h4><i data-lucide="satellite" class="icono"></i> 2. Evidencia satelital NASA y de suelo</h4>
                  <ul>${rot.explicacion.evidenciaNasa.map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="explain-block">
                  <h4><i data-lucide="wheat" class="icono"></i> 3. Beneficios cuantificados</h4>
                  <ul>${rot.explicacion.beneficios.map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="explain-block">
                  <h4><i data-lucide="flask-conical" class="icono"></i> 4. Lagunas de información</h4>
                  <ul>${rot.explicacion.lagunasInfo.map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="explain-block">
                  <h4><i data-lucide="shield-check" class="icono"></i> 5. Riesgos que requieren validación local</h4>
                  <ul>${rot.explicacion.riesgosLocales.map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
              </div>
            </div>

            <button type="button" class="btn-sec btn-ver-grafico" data-select-rot="${rot.id}">
              <i data-lucide="droplet" class="icono"></i>
              <span>${esSeleccionadaGrafico ? 'Mostrando en el gráfico hídrico de 36 meses' : 'Ver balance hídrico de 36 meses'}</span>
            </button>
          </div>
        `;
      }

      return `
        <article class="${clasesCard}" data-rot-id="${rot.id}">
          <div class="rot-card-header">
            <div class="rot-title-group">
              <span class="estado ${rot.semaforo.color}">
                ${rot.semaforo.etiqueta}
              </span>
              <h3 class="rot-card-title">${isTechnicalMode ? rot.titulo : tituloAmigable}</h3>
            </div>
            ${isTechnicalMode ? `
              <div class="irr-score-badge">
                <div class="irr-score-num">${rot.irr.toFixed(2)}</div>
                <div class="irr-score-label">IRR (${rot.irrPct} <span class="unidad">/ 100</span>)</div>
              </div>
            ` : ''}
          </div>

          ${alertaFitoHtml}

          ${!isTechnicalMode ? `
            <div class="rot-simple-medidores">
              ${window.AyudaAgricultor ? window.AyudaAgricultor.circulo({
                titulo: rot.esActual ? 'Su práctica actual' : 'Qué tan buena es para su lote',
                pct: rot.irrPct,
                color: rot.irrPct >= 70 ? 'ok' : (rot.irrPct >= 50 ? 'alerta' : 'riesgo'),
                centro: `${rot.irrPct}`,
                texto: rot.irrPct >= 70 ? 'Muy buena opción' : (rot.irrPct >= 50 ? 'Opción regular' : 'Opción débil')
              }) : ''}
              <div class="rot-mini-barras">
                ${[['droplet', 'Agua', rot.subindices.agua], ['sprout', 'Tierra', (rot.subindices.nitrogeno + rot.subindices.materiaOrganica) / 2], ['coins', 'Ganancia', rot.subindices.rentabilidad]]
                  .map(([ic, et, v]) => {
                    const pc = Math.round(Math.max(0, Math.min(1, v)) * 100);
                    const cl = pc >= 70 ? 'ok' : (pc >= 45 ? 'alerta' : 'riesgo');
                    return `<div class="rot-mini-barra" role="img" aria-label="${et}: ${pc} de 100">
                      <span class="rot-mini-et"><i data-lucide="${ic}" class="icono" aria-hidden="true"></i> ${et}</span>
                      <span class="rot-mini-pista"><span class="rot-mini-lleno ${cl}" style="width:${pc}%"></span></span>
                    </div>`;
                  }).join('')}
              </div>
            </div>

            <div class="rot-simple-recipe">${recetaSimpleHtml}</div>

            <div class="rot-simple-profit">
              <span class="rot-simple-profit-label">
                <i data-lucide="coins" class="icono"></i>
                <span>Ganancia estimada en ${fmtMiles(haAM2(areaHa))} m²</span>
              </span>
              <span class="rot-simple-profit-val tabular-nums">~$${fmtMiles(ingresoTotalLoteAnual)} USD/año</span>
            </div>

            <ul class="rot-simple-bullets">
              <li><i data-lucide="droplet" class="icono"></i><span><strong>Agua:</strong> ${textoAguaSimple}</span></li>
              <li><i data-lucide="sprout" class="icono"></i><span><strong>Suelo:</strong> ${textoSueloSimple}</span></li>
            </ul>

            ${!rot.esActual && razonesSugerencia.length ? `
              <div class="rot-simple-why">
                <strong><i data-lucide="check-circle-2" class="icono"></i> ¿Por qué sugerimos esta rotación?</strong>
                <ul>
                  ${razonesSugerencia.map(razon => `<li>${razon}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${riesgosPracticos.length ? `
              <div class="rot-simple-risks">
                <strong>Recomendaciones prácticas en campo:</strong>
                <ul>${riesgosPracticos.map(r => `<li>${r}</li>`).join('')}</ul>
              </div>
            ` : ''}
          ` : ''}

          ${panelTecnicoHtml}

          <div class="card-footer-actions">
            ${window.AyudaAgricultor ? `
              <a class="btn-whatsapp" target="_blank" rel="noopener"
                 href="${window.AyudaAgricultor.enlaceWhatsApp(window.AyudaAgricultor.textoPlanWhatsApp({ parcela, rot, areaHa, opciones: state.opciones, avisos: state.avisosLote }))}"
                 aria-label="Enviar este plan por WhatsApp">
                <i data-lucide="message-circle" class="icono" aria-hidden="true"></i> Enviar por WhatsApp
              </a>` : ''}
            ${window.AyudaAgricultor && window.AyudaAgricultor.puedeHablar() ? `
              <button type="button" class="btn-escuchar" data-escuchar-rot="${rot.id}" aria-label="Escuchar esta opción en voz alta">
                <i data-lucide="volume-2" class="icono" aria-hidden="true"></i> Escuchar
              </button>` : ''}
            ${!modoGlobalTec ? `
              <button type="button" class="btn-sec btn-toggle-tecnico" data-toggle-tech="${rot.id}" aria-expanded="${isTechnicalMode ? 'true' : 'false'}">
                <i data-lucide="satellite" class="icono"></i>
                <span>${isTechnicalMode ? 'Ocultar reporte técnico' : 'Ver reporte técnico (NASA)'}</span>
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-toggle-tech]').forEach(btn => {
      btn.addEventListener('click', function () {
        const rotId = this.getAttribute('data-toggle-tech');
        state.tarjetasTecnicas[rotId] = !state.tarjetasTecnicas[rotId];
        renderizarTarjetasRotacion(state.ultimoResultado, obtenerParcelaActual());
        actualizarGraficoBalance36m();
      });
    });

    grid.querySelectorAll('[data-escuchar-rot]').forEach(btn => {
      btn.addEventListener('click', function () {
        const rot = todasLasTarjetas.find(r => r.id === this.getAttribute('data-escuchar-rot'));
        if (!rot || !window.AyudaAgricultor) return;
        const titulo = rot.esActual ? 'Su práctica actual' : rot.titulo.replace(/^Estrategia\s+(\d+)/i, 'Opción $1');
        const pasos = rot.cultivos.map((c, i) => `año ${i + 1}, ${c.nombre}`).join('; ');
        const ganancia = Math.round(rot.detalles.rentabilidad.margenAnualPromedioUsdHa * areaHa);
        const riesgos = (rot.explicacion.riesgosLocales || []).filter(r => !/SoilGrids|250\s*m|NASA|satelital/i.test(r)).slice(0, 2).join(' ');
        window.AyudaAgricultor.leer(
          `${titulo}. Puntaje ${rot.irrPct} de 100. Siembre: ${pasos}. ` +
          `Ganancia estimada: unos ${ganancia} dólares al año en su lote. ` +
          `La lluvia cubre el ${rot.balanceHidrico.coberturaAguaPct} por ciento del agua que necesita. ${riesgos}`, this);
      });
    });

    grid.querySelectorAll('[data-select-rot]').forEach(btn => {
      btn.addEventListener('click', function () {
        state.rotacionSeleccionadaGraficoId = this.getAttribute('data-select-rot');
        renderizarTarjetasRotacion(state.ultimoResultado, obtenerParcelaActual());
        actualizarGraficoBalance36m();
      });
    });

    refrescarIconosLucide();
  }

  /**
   * Renderiza el Gráfico 1: Balance hídrico mensual a 36 meses con la paleta oficial
   */
  function actualizarGraficoBalance36m() {
    if (typeof Chart === 'undefined' || !state.ultimoResultado) return;
    const canvas = document.getElementById('chart-balance-36m');
    if (!canvas) return;

    const todas = [...state.ultimoResultado.recomendadas, state.ultimoResultado.actual];
    const rot = todas.find(r => r.id === state.rotacionSeleccionadaGraficoId) || todas[0];
    if (!rot || !rot.balanceHidrico || !rot.balanceHidrico.meses36) return;

    const meses = rot.balanceHidrico.meses36;
    const labels = meses.map(m => `${m.etiqueta} (${m.sueloDesnudo ? 'Descanso' : m.cultivoNombre.split(' ')[0]})`);
    const dataPef = meses.map(m => m.Pef_mm);
    const dataETc = meses.map(m => m.ETc_mm);
    const dataDeficit = meses.map(m => m.deficit_mm);

    const subtituloEl = document.getElementById('chart-balance-subtitle');
    if (subtituloEl) {
      subtituloEl.innerHTML = `Estrategia activa: <strong>${rot.titulo} (${rot.cultivos.map(c => c.nombre).join(' → ')})</strong> · Suelo descubierto: <b class="tabular-nums">${rot.balanceHidrico.mesesSinCobertura}/36</b> <span class="unidad">meses</span> · Déficit acumulado: <b class="tabular-nums">${fmtMiles(rot.balanceHidrico.deficitTotal)}</b> <span class="unidad">mm</span>`;
    }

    if (state.chartBalance) {
      state.chartBalance.destroy();
    }

    state.chartBalance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Demanda ETc (mm/mes)',
            data: dataETc,
            borderColor: '#B7791F',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 0
          },
          {
            type: 'bar',
            label: 'Lluvia efectiva Pef (mm/mes)',
            data: dataPef,
            backgroundColor: '#6F8A9A',
            borderWidth: 0
          },
          {
            type: 'bar',
            label: 'Déficit de riego (mm/mes)',
            data: dataDeficit,
            backgroundColor: '#9B2C1F',
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              afterBody: function (items) {
                const idx = items[0].dataIndex;
                const info = meses[idx];
                return `Estado del lote: ${info.sueloDesnudo ? 'Suelo descubierto / descanso' : `${info.cultivoNombre} (etapa ${info.etapa}, Kc=${info.kc})`}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 18,
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#D6CDB4',
              lineWidth: 1
            },
            ticks: {
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            },
            title: {
              display: true,
              text: 'Agua mensual (mm)',
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            }
          }
        }
      }
    });
  }

  /**
   * Renderiza el Gráfico 2: Serie histórica satelital HLS con la paleta oficial
   */
  function actualizarGraficoHLS(parcela) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('chart-hls-ndvi');
    if (!canvas) return;

    const serie = parcela.ndvi_mensual || [];
    const labels = serie.map(x => x.mes);
    const dataNdvi = serie.map(x => x.ndvi);
    const dataNdti = serie.map(x => x.ndti);
    const umbralDesnudo = serie.map(() => 0.25);

    if (state.chartHLS) {
      state.chartHLS.destroy();
    }

    state.chartHLS = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: esEjemplo(parcela, 'ndvi') ? 'NDVI de ejemplo (sin CSV satelital)' : 'NDVI (vegetación)',
            data: dataNdvi,
            borderColor: '#3E4A1E',
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false,
            tension: 0.25,
            pointRadius: 0
          },
          {
            label: 'NDTI (rastrojo / labranza)',
            data: dataNdti,
            borderColor: '#A6512B',
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false,
            tension: 0.25,
            pointRadius: 0
          },
          {
            label: 'Umbral de suelo desnudo (0.25)',
            data: umbralDesnudo,
            borderColor: '#9B2C1F',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 11 }
            }
          },
          y: {
            min: 0,
            max: 1.0,
            grid: {
              color: '#D6CDB4',
              lineWidth: 1
            },
            ticks: {
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            },
            title: {
              display: true,
              text: 'Índice espectral (0 a 1)',
              color: '#6B6450',
              font: { family: "'Public Sans', sans-serif", size: 12 }
            }
          }
        }
      }
    });
  }

  /**
   * Renderiza el inspector de cultivos descartados con etiquetas de estado
   */
  function renderizarCultivosVetados(resultado) {
    const cont = document.getElementById('vetados-grid-container');
    const countBadge = document.getElementById('vetados-count-badge');
    if (!cont) return;

    const vetados = resultado.cultivosVetados || [];
    if (countBadge) {
      countBadge.textContent = `${vetados.length} cultivos descartados`;
    }
    const cntV = document.getElementById('cuenta-vetados');
    if (cntV) cntV.textContent = vetados.length;

    const ordenados = vetados.slice().sort((a, b) => {
      if (a.tipoVeto === b.tipoVeto) return 0;
      return a.tipoVeto === 'fitosanitario' ? -1 : 1;
    });

    const idsVetados = new Set(vetados.map(v => v.cultivo.id));
    const sugeribles = (resultado.cultivosAptos || []).filter(c => !idsVetados.has(c.id));
    const soloAltitud = ordenados.filter(it => it.razones.length && it.razones.every(r => /^Altitud fuera de rango/i.test(r)));
    const resto = ordenados.filter(it => !soloAltitud.includes(it));
    const elevLote = obtenerParcelaActual()?.terreno?.elev_m;
    const tarjetaAltitud = soloAltitud.length ? `
      <div class="vetado-item vetado-grupo">
        <div class="vetado-head">
          <span><i data-lucide="mountain-snow" class="icono" aria-hidden="true"></i> No se dan a ${fmtMiles(elevLote)} m de altura</span>
          <span class="estado alerta solo-tecnico">Medio · Límite altitudinal</span>
        </div>
        <p class="vetado-chips">${soloAltitud.map(it => `<span class="chip-cultivo" title="${it.razones[0]}">${it.cultivo.nombre}</span>`).join('')}</p>
        <details class="aviso-acciones">
          <summary><i data-lucide="list-checks" class="icono" aria-hidden="true"></i> ¿Qué puede hacer?</summary>
          <ul>
            <li>La altura no se puede cambiar: elija entre los cultivos que sí se dan aquí (${sugeribles.slice(0, 6).map(c => c.nombre).join(', ')}${sugeribles.length > 6 ? '…' : ''}).</li>
            <li>Pregunte en INIAP o al técnico por variedades adaptadas a su piso de altura.</li>
          </ul>
        </details>
      </div>` : '';

    cont.innerHTML = tarjetaAltitud + resto.map(item => {
      const c = item.cultivo;
      const etiquetaTipo = item.tipoVeto === 'fitosanitario'
        ? '<span class="estado riesgo">Alto · Pausa fitosanitaria</span>'
        : '<span class="estado alerta">Medio · Límite biofísico</span>';

      const rem = window.AyudaAgricultor
        ? window.AyudaAgricultor.remediosVeto(item.razones, c, sugeribles)
        : null;
      return `
        <div class="vetado-item">
          <div class="vetado-head">
            <span><i data-lucide="wheat" class="icono"></i> ${c.nombre} <small class="unidad">(${c.familia})</small></span>
            ${etiquetaTipo}
          </div>
          ${rem ? `<p class="vetado-motivo"><i data-lucide="ban" class="icono" aria-hidden="true"></i> ${rem.motivo}</p>` : ''}
          <p class="vetado-reason">${item.razones.join(' ')}</p>
          ${rem ? `
            <details class="aviso-acciones">
              <summary><i data-lucide="list-checks" class="icono" aria-hidden="true"></i> ¿Qué puede hacer?</summary>
              <ul>${rem.acciones.map(a => `<li>${a}</li>`).join('')}</ul>
            </details>` : ''}
        </div>
      `;
    }).join('');

    refrescarIconosLucide();
  }

  /**
   * Ejecuta el motor agronómico completo y actualiza toda la interfaz
   */
  function actualizarTodo() {
    const parcela = obtenerParcelaActual();
    if (!parcela || !state.catalogo) return;

    const resultado = window.AgronomiaMotor.recomendar(
      parcela,
      state.catalogo,
      state.sliders,
      state.opciones
    );
    state.ultimoResultado = resultado;

    const p = resultado.pesosAplicados;
    document.getElementById('badge-peso-agua').textContent = `${Math.round(p.w_h2o * 100)} % del índice`;
    document.getElementById('badge-peso-suelo').textContent = `${Math.round((p.w_n + p.w_mos) * 100)} % del índice`;
    document.getElementById('badge-peso-ganar').textContent = `${Math.round(p.w_rent * 100)} % del índice`;

    renderizarBannerAnomalia(parcela, p);
    renderizarPaso1Terreno(parcela);
    renderizarTarjetasRotacion(resultado, parcela);
    actualizarGraficoBalance36m();
    actualizarGraficoHLS(parcela);
    renderizarCultivosVetados(resultado);
    renderizarCalendarioSiembra(resultado, parcela);
    renderizarPanelInforme(resultado, parcela);
    refrescarIconosLucide();
  }

  /**
   * Paso 4: lista de revisión (qué falta) y opciones del informe PDF.
   */
  function renderizarPanelInforme(resultado, parcela) {
    const lista = document.getElementById('informe-lista');
    if (!lista) return;
    asegurarEsquemaDual(parcela);
    const est = parcela.estado_datos || {};
    const real = c => typeof est[c] === 'string' && !/^EJEMPLO|^sin dato/i.test(est[c]);
    const hist = (parcela.historia_declarada || []).filter(Boolean);
    const items = [
      { ok: true, txt: `Lote ubicado: ${parcela.nombre} (${parcela.area_ha} ha)`, ir: 'tab-terreno:lote-mapa' },
      { ok: Boolean(parcela.agricultor && parcela.agricultor.editado_tierra), txt: 'Tipo de tierra confirmado por usted', pend: 'Se usa el dato de ISRIC SoilGrids', ir: 'tab-terreno:lote-tierra' },
      { ok: hist.length === 2, txt: 'Cultivos de los últimos 2 años', pend: 'Indique qué sembró en 2024 y 2025', ir: 'tab-terreno:lote-tierra' },
      { ok: Boolean(state.prioridadesTocadas), txt: 'Sus prioridades (agua, tierra, ganancia)', pend: 'Se usan valores normales', ir: 'tab-rotaciones' },
      { ok: real('clima'), txt: 'Clima NASA POWER del lote', pend: 'Clima de ejemplo', dato: true },
      { ok: real('suelo'), txt: 'Suelo ISRIC SoilGrids del lote', pend: 'Suelo de ejemplo', dato: true },
      { ok: real('terreno'), txt: 'Altitud y pendiente SRTM/NASADEM', pend: 'Terreno de ejemplo hasta recibir NASADEM (AppEEARS)', dato: true },
      ...(window.AyudaAgricultor && window.AyudaAgricultor.esParcelaSatelital(parcela)
        ? [{ ok: real('ndvi'), txt: 'Historial satelital HLS (NDVI)', pend: 'Pedido a NASA AppEEARS; llega en horas', dato: true }]
        : [])
    ];
    const hechos = items.filter(i => i.ok).length;
    const pct = Math.round(100 * hechos / items.length);
    const prog = document.getElementById('informe-progreso');
    if (prog) prog.textContent = `${hechos} de ${items.length}`;
    const barra = document.getElementById('informe-barra-lleno');
    if (barra) barra.style.width = `${pct}%`;
    lista.innerHTML = items.map(i => `
      <li class="${i.ok ? 'hecho' : (i.dato ? 'dato-pendiente' : 'pendiente')}">
        <i data-lucide="${i.ok ? 'circle-check' : (i.dato ? 'satellite' : 'circle')}" class="icono informe-icono" aria-hidden="true"></i>
        <span class="informe-txt"><strong>${i.txt}</strong>${i.ok ? '' : `<small>${i.pend}</small>`}</span>
        ${!i.ok && i.ir ? `<button type="button" class="btn-link-sm informe-ir" data-tab-go="${i.ir}">Completar</button>` : ''}
      </li>`).join('');
    lista.querySelectorAll('[data-tab-go]').forEach(b => b.addEventListener('click', () => {
      const t = b.getAttribute('data-tab-go');
      const [tab, sub] = t.split(':');
      document.querySelector(`.sidebar-item[data-tab-target="${tab}"]`)?.click();
      if (sub) document.querySelector(`.subtab[data-subtab="${sub}"]`)?.click();
    }));

    const ops = document.getElementById('informe-opciones-lista');
    if (ops) {
      const todas = [...resultado.recomendadas, resultado.actual].slice().sort((x, y) => y.irrPct - x.irrPct);
      const mejor = todas[0];
      if (!state.informeRotId || !todas.some(r => r.id === state.informeRotId)) state.informeRotId = mejor?.id;
      ops.innerHTML = todas.map(r => {
        const nivel = r.irrPct >= 70 ? 'ok' : (r.irrPct >= 50 ? 'alerta' : 'riesgo');
        const nombre = r.esActual ? 'Su práctica actual' : r.titulo.replace(/^Estrategia\s+(\d+)/i, 'Opción $1').replace(/\s+—.*$/, '');
        return `
        <label class="informe-opcion${r.id === state.informeRotId ? ' activo' : ''}${r === mejor ? ' mejor' : ''}">
          <input type="radio" name="informe-rot" value="${r.id}" ${r.id === state.informeRotId ? 'checked' : ''} />
          <span class="informe-opcion-cuerpo">
            <span class="informe-opcion-titulo"><strong>${nombre}</strong>${r === mejor ? '<span class="sello-mejor"><i data-lucide="star" class="icono" aria-hidden="true"></i> Le conviene más</span>' : ''}</span>
            <small>${r.cultivos.map(c => c.nombre).join(' → ')}</small>
            <span class="conveniencia" role="img" aria-label="Le conviene en un ${r.irrPct} por ciento">
              <span class="conveniencia-pista"><span class="conveniencia-lleno ${nivel}" style="width:${r.irrPct}%"></span></span>
              <b class="tabular-nums">${r.irrPct} %</b>
            </span>
          </span>
        </label>`;
      }).join('');
      ops.querySelectorAll('input[name="informe-rot"]').forEach(inp => inp.addEventListener('change', () => {
        state.informeRotId = inp.value;
        ops.querySelectorAll('.informe-opcion').forEach(l => l.classList.toggle('activo', l.querySelector('input').checked));
      }));
    }
  }

  /**
   * ¿Cuándo sembrar? Calendario de 12 meses por cultivo de las opciones recomendadas,
   * con la climatología NASA POWER del lote (lluvia, ET0 y heladas).
   */
  function renderizarCalendarioSiembra(resultado, parcela) {
    const cont = document.getElementById('calendario-filas');
    const AY = window.AyudaAgricultor;
    if (!cont || !AY) return;
    const vistos = new Set();
    const cultivos = [];
    (resultado.recomendadas || []).forEach(r => r.cultivos.forEach(c => {
      if (!vistos.has(c.id)) { vistos.add(c.id); cultivos.push(c); }
    }));
    const filas = cultivos.slice(0, 8).map(c => {
      const cal = AY.calendarioSiembra(c, parcela, state.opciones);
      return cal ? AY.filaCalendario(c, cal) : '';
    }).join('');
    cont.innerHTML = filas || '<p class="cal-ayuda">Sin datos de clima para este lote todavía.</p>';
    const det = document.getElementById('cal-detalle');
    if (det) det.textContent = '';
    cont.querySelectorAll('.cal-celda').forEach(cel => {
      cel.setAttribute('tabindex', '0');
      const mostrar = () => { if (det) det.textContent = cel.getAttribute('title'); };
      cel.addEventListener('click', mostrar);
      cel.addEventListener('focus', mostrar);
    });
  }

  function seleccionarParcelaPorId(nuevoId) {
    if (!state.parcelasActivas[nuevoId]) return;
    state.parcelaActualId = nuevoId;
    state.rotacionSeleccionadaGraficoId = 'recomendada_1';
    state.tokenLote = (state.tokenLote || 0) + 1;
    const estVivo = document.getElementById('estado-datos-vivo');
    if (estVivo) estVivo.hidden = true;

    sincronizarControlesPaso2ConParcela();
    dibujarPoligonoParcelaActual(true);
    actualizarTodo();
  }

  function configurarPanelUbicacion() {
    const selProv = document.getElementById('select-provincia');
    const selCanton = document.getElementById('select-canton');
    const selParroquia = document.getElementById('select-parroquia');
    const inpBuscar = document.getElementById('input-buscar-ubicacion');
    const btnBuscar = document.getElementById('btn-buscar-ubicacion');
    const btnMiUbicacion = document.getElementById('btn-mi-ubicacion');
    const statusEl = document.getElementById('location-search-status');

    const dpa = window.ECUADOR_DPA || {};
    const centrosProv = window.ECUADOR_PROVINCIAS_CENTRO || {};
    const parcelasMap = window.PARCELA_POR_UBICACION || {};

    if (!selProv || !selCanton || !selParroquia) return;

    const setStatus = (texto) => {
      if (statusEl) statusEl.textContent = texto;
    };

    const centrarEnUbicacion = async (prov, canton, parr) => {
      const clave = `${prov}|${canton}|${parr}`;
      if (parcelasMap[clave]) {
        seleccionarParcelaPorId(parcelasMap[clave]);
        setStatus(`Ubicación encontrada: ${parr}, ${canton} (${prov}).`);
        return;
      }

      setStatus(`Ubicando ${parr}, ${canton}...`);
      const parrLimpia = parr.replace(/\s*\(urbana\)/i, '');
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${parrLimpia}, ${canton}, ${prov}, Ecuador`)}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = Number(data[0].lat);
          const lon = Number(data[0].lon);
          if (state.map) state.map.setView([lat, lon], 14);
          abrirLoteEnPunto(lat, lon);
          setStatus(`Ubicación encontrada: ${parr}, ${canton} (${prov}). Lote nuevo con datos en vivo.`);
          return;
        }
      } catch (e) {
        // Respaldo al centroide provincial si no hay red
      }

      if (centrosProv[prov] && state.map) {
        state.map.setView(centrosProv[prov], 10);
      }
      setStatus(`Ubicación encontrada: ${parr}, ${canton} (${prov}).`);
    };

    // Poblar las 24 provincias del Ecuador en orden alfabético
    Object.keys(dpa).sort().forEach(prov => {
      const opt = document.createElement('option');
      opt.value = prov;
      opt.textContent = prov;
      selProv.appendChild(opt);
    });

    // Cascada: Provincia -> Cantón
    selProv.addEventListener('change', () => {
      const prov = selProv.value;
      selCanton.innerHTML = '<option value="">Cantón</option>';
      selParroquia.innerHTML = '<option value="">Parroquia</option>';
      selParroquia.disabled = true;

      if (!prov || !dpa[prov]) {
        selCanton.disabled = true;
        return;
      }

      Object.keys(dpa[prov]).sort().forEach(canton => {
        const opt = document.createElement('option');
        opt.value = canton;
        opt.textContent = canton;
        selCanton.appendChild(opt);
      });
      selCanton.disabled = false;
    });

    // Cascada: Cantón -> Parroquia
    selCanton.addEventListener('change', () => {
      const prov = selProv.value;
      const canton = selCanton.value;
      selParroquia.innerHTML = '<option value="">Parroquia</option>';

      if (!prov || !canton || !dpa[prov][canton]) {
        selParroquia.disabled = true;
        return;
      }

      dpa[prov][canton].slice().sort().forEach(parr => {
        const opt = document.createElement('option');
        opt.value = parr;
        opt.textContent = parr;
        selParroquia.appendChild(opt);
      });
      selParroquia.disabled = false;
    });

    // Selección final de Parroquia
    selParroquia.addEventListener('change', () => {
      const prov = selProv.value;
      const canton = selCanton.value;
      const parr = selParroquia.value;
      if (!prov || !canton || !parr) return;
      centrarEnUbicacion(prov, canton, parr);
    });

    // Búsqueda libre (por coordenadas "lat, lon", coincidencia en las 24 provincias o Nominatim)
    const ejecutarBusqueda = async () => {
      const q = (inpBuscar && inpBuscar.value || '').trim();
      if (!q) {
        setStatus('Ingrese un lugar, dirección o coordenadas.');
        return;
      }

      const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
      if (coordMatch) {
        const lat = Number(coordMatch[1]);
        const lon = Number(coordMatch[2]);
        if (state.map) state.map.setView([lat, lon], 15);
        abrirLoteEnPunto(lat, lon);
        setStatus(parcelaQueContiene(lat, lon)
          ? 'Ubicación encontrada: parcela con historial satelital de AppEEARS.'
          : 'Ubicación encontrada. Lote nuevo: datos de clima, suelo y relieve en vivo.');
        return;
      }

      const qNorm = q.toLowerCase();
      for (const [prov, cantones] of Object.entries(dpa)) {
        for (const [canton, parroquias] of Object.entries(cantones)) {
          for (const parr of parroquias) {
            if (`${parr} ${canton} ${prov}`.toLowerCase().includes(qNorm)) {
              await centrarEnUbicacion(prov, canton, parr);
              return;
            }
          }
        }
      }

      setStatus('Buscando ubicación...');
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q + ', Ecuador')}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = Number(data[0].lat);
          const lon = Number(data[0].lon);
          if (state.map) state.map.setView([lat, lon], 15);
          abrirLoteEnPunto(lat, lon);
          setStatus('Ubicación encontrada. Lote nuevo con datos en vivo.');
        } else {
          setStatus('No se encontraron resultados para esa dirección.');
        }
      } catch (e) {
        setStatus('No se pudo consultar el servicio de direcciones.');
      }
    };

    if (btnBuscar) {
      btnBuscar.addEventListener('click', ejecutarBusqueda);
    }
    if (inpBuscar) {
      inpBuscar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          ejecutarBusqueda();
        }
      });
    }

    if (btnMiUbicacion) {
      btnMiUbicacion.addEventListener('click', () => {
        if (!navigator.geolocation) {
          setStatus('Geolocalización no disponible en este navegador.');
          return;
        }
        setStatus('Obteniendo ubicación actual...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (state.map) {
              state.map.setView([latitude, longitude], 18);
            }
            if (inpBuscar) {
              inpBuscar.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            }
            abrirLoteEnPunto(latitude, longitude, 50);
            setStatus('Ubicación GPS activa: lote sugerido de 50×50 m (2 500 m²) con datos de la NASA en vivo.');
          },
          () => {
            setStatus('No se pudo acceder a la ubicación actual.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  }

  /**
   * Configura la navegación tipo Single Page Application (Vertical Tabs) en la barra lateral
   */
  function configurarSidebarTabs() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const btnToggle = document.getElementById('btn-sidebar-toggle');
    const tabButtons = document.querySelectorAll('.sidebar-item[data-tab-target]');
    const tabPanels = document.querySelectorAll('[data-tab-panel]');

    function activarPestana(targetIdCompleto) {
      if (!targetIdCompleto) return;
      const [targetId, subId] = String(targetIdCompleto).split(':');
      if (subId) activarSubpestana(subId);

      tabButtons.forEach(btn => {
        const esActivo = btn.getAttribute('data-tab-target') === targetId;
        btn.classList.toggle('activo', esActivo);
        btn.setAttribute('aria-selected', esActivo ? 'true' : 'false');
      });

      tabPanels.forEach(panel => {
        const esActivo = panel.id === targetId;
        panel.classList.toggle('activo', esActivo);
        panel.hidden = !esActivo;
      });

      if (sidebarNav) {
        sidebarNav.classList.remove('abierto');
      }
      if (btnToggle) {
        btnToggle.setAttribute('aria-expanded', 'false');
      }

      if (targetId === 'tab-terreno' && state.map && !document.getElementById('sp-lote-mapa')?.hidden) {
        setTimeout(() => {
          state.map.invalidateSize();
          dibujarPoligonoParcelaActual(false);
        }, 60);
      }

      if (targetId === 'tab-rotaciones') {
        setTimeout(() => {
          if (state.chartBalance) state.chartBalance.resize();
          if (state.chartHLS) state.chartHLS.resize();
        }, 60);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activarPestana(btn.getAttribute('data-tab-target'));
      });
    });

    // Pestañitas internas (Mi lote, Mi plan de siembra, Datos NASA)
    function activarSubpestana(subId) {
      const btn = document.querySelector(`.subtab[data-subtab="${subId}"]`);
      if (!btn) return;
      const grupo = btn.closest('[data-subtabs]');
      grupo.querySelectorAll('.subtab').forEach(b => {
        const on = b === btn;
        b.classList.toggle('activo', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (subId === 'lote-mapa' && state.map) {
        setTimeout(() => { state.map.invalidateSize(); dibujarPoligonoParcelaActual(false); }, 60);
      }
      if (subId === 'plan-graficos') {
        setTimeout(() => {
          if (state.chartBalance) state.chartBalance.resize();
          if (state.chartHLS) state.chartHLS.resize();
        }, 60);
      }
    }
    document.querySelectorAll('[data-subtabs]').forEach(grupo => {
      const botones = Array.from(grupo.querySelectorAll('.subtab'));
      botones.forEach((b, i) => {
        b.tabIndex = b.classList.contains('activo') ? 0 : -1;
        b.addEventListener('click', () => activarSubpestana(b.getAttribute('data-subtab')));
        b.addEventListener('keydown', e => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const sig = botones[(i + (e.key === 'ArrowRight' ? 1 : botones.length - 1)) % botones.length];
          sig.focus();
          activarSubpestana(sig.getAttribute('data-subtab'));
        });
      });
    });

    document.querySelectorAll('[data-tab-go]').forEach(el => {
      el.addEventListener('click', (e) => {
        const targetId = el.getAttribute('data-tab-go');
        if (targetId) {
          e.preventDefault();
          activarPestana(targetId);
        }
      });
    });

    if (btnToggle && sidebarNav) {
      btnToggle.addEventListener('click', () => {
        const abierto = sidebarNav.classList.toggle('abierto');
        btnToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      });
    }

    const btnExportar = document.getElementById('btn-exportar-parcela');
    if (btnExportar) {
      btnExportar.addEventListener('click', () => {
        const parcela = obtenerParcelaActual();
        const combinado = construirJsonCombinado(parcela);
        const blob = new Blob([JSON.stringify(combinado, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${parcela.id || 'parcela'}_combinado.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    const btnAdminReset = document.getElementById('btn-admin-reset');
    if (btnAdminReset) {
      btnAdminReset.addEventListener('click', () => {
        Object.keys(state.parcelasOriginales).forEach(id => {
          state.parcelasActivas[id] = clonar(state.parcelasOriginales[id]);
        });
        state.sliders = { agua: 3, suelo: 3, ganar: 3 };
        state.opciones.escenarioLluviaPct = 0;
        state.opciones.retiraForraje = false;
        state.opciones.priorizarForraje = false;

        const sliderAgua = document.getElementById('slider-agua');
        const sliderSuelo = document.getElementById('slider-suelo');
        const sliderGanar = document.getElementById('slider-ganar');
        const sliderEsc = document.getElementById('slider-escenario-lluvia');
        const badgeEsc = document.getElementById('badge-escenario-lluvia');
        const chkForraje = document.getElementById('check-retira-forraje');

        if (sliderAgua) sliderAgua.value = '3';
        if (sliderSuelo) sliderSuelo.value = '3';
        if (sliderGanar) sliderGanar.value = '3';
        if (sliderEsc) sliderEsc.value = '0';
        if (badgeEsc) badgeEsc.textContent = '0 % (climatología normal)';
        if (chkForraje) chkForraje.checked = false;

        sincronizarControlesPaso2ConParcela();
        actualizarTodo();
        dibujarPoligonoParcelaActual(true);
      });
    }
  }

  /**
   * Configura la transición segura entre Modo Simple (Agricultor) y Modo Avanzado (Técnico)
   */
  function configurarModoDual() {
    const btnModo = document.getElementById('btn-modo-usuario');
    const txtModo = document.getElementById('btn-modo-usuario-texto');
    const confirmBar = document.getElementById('confirm-modo-tecnico');
    const bannerActivo = document.getElementById('banner-modo-tecnico');
    const btnConfirmar = document.getElementById('btn-confirmar-tecnico');
    const btnCancelar = document.getElementById('btn-cancelar-tecnico');
    const btnSalir = document.getElementById('btn-salir-tecnico');

    function setModoTecnico(activo) {
      document.body.classList.toggle('modo-tecnico', activo);
      if (btnModo) btnModo.setAttribute('aria-pressed', activo ? 'true' : 'false');
      if (txtModo) txtModo.textContent = activo ? 'Modo Técnico activo' : 'Vista: Agricultor · Modo técnico';
      if (confirmBar) confirmBar.hidden = true;
      if (bannerActivo) bannerActivo.hidden = !activo;
      sincronizarControlesPaso2ConParcela();
      if (state.ultimoResultado) {
        renderizarTarjetasRotacion(state.ultimoResultado, obtenerParcelaActual());
      }
    }

    if (btnModo) {
      btnModo.addEventListener('click', () => {
        if (document.body.classList.contains('modo-tecnico')) {
          setModoTecnico(false);
        } else if (confirmBar) {
          confirmBar.hidden = !confirmBar.hidden;
        }
      });
    }
    if (btnConfirmar) btnConfirmar.addEventListener('click', () => setModoTecnico(true));
    if (btnCancelar && confirmBar) btnCancelar.addEventListener('click', () => { confirmBar.hidden = true; });
    if (btnSalir) btnSalir.addEventListener('click', () => setModoTecnico(false));

    // Modo Simple: tarjetas de tipo de tierra del agricultor
    document.querySelectorAll('.soil-simple-btn[data-soil-simple]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.agricultor.tipo_tierra = btn.getAttribute('data-soil-simple');
        p.agricultor.editado_tierra = true;
        sincronizarControlesPaso2ConParcela();
        actualizarTodo();
      });
    });

    // Modo Simple: barritas deslizables (1–5) sincronizadas con los pesos IRR
    document.querySelectorAll('.prio-slider-wrap[data-simple-slider]').forEach(wrap => {
      const key = wrap.getAttribute('data-simple-slider');
      const inp = wrap.querySelector('.prio-slider');
      if (!inp) return;
      inp.addEventListener('input', () => pintarPrioSlider(wrap, Number(inp.value) || 3));
      inp.addEventListener('change', () => {
        const val = Number(inp.value) || 3;
        state.sliders[key] = val;
        state.prioridadesTocadas = true;
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.agricultor.prioridades[key] = val;
        sincronizarControlesPaso2ConParcela();
        actualizarTodo();
      });
    });

    // Modo Simple: botones Poco / Normal / Mucho sincronizados con sliders IRR
    document.querySelectorAll('.priority-btn-group[data-simple-slider]').forEach(group => {
      const key = group.getAttribute('data-simple-slider');
      group.querySelectorAll('.prio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.getAttribute('data-val')) || 3;
          state.sliders[key] = val;
          const p = obtenerParcelaActual();
          asegurarEsquemaDual(p);
          p.agricultor.prioridades[key] = val;
          sincronizarControlesPaso2ConParcela();
          actualizarTodo();
        });
      });
    });

    // Modo Técnico: pendiente verificada en campo y notas técnicas
    const inpPend = document.getElementById('input-tecnico-pendiente');
    if (inpPend) {
      inpPend.addEventListener('change', () => {
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.tecnico.terreno_verificado.pendiente_pct = inpPend.value === '' ? null : Number(inpPend.value);
        sincronizarControlesPaso2ConParcela();
        dibujarPoligonoParcelaActual(false);
        actualizarTodo();
      });
    }

    const inpNotas = document.getElementById('input-tecnico-notas');
    if (inpNotas) {
      inpNotas.addEventListener('input', () => {
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.tecnico.notas_campo = inpNotas.value;
      });
    }

    const btnLimpiarTec = document.getElementById('btn-limpiar-tecnico');
    if (btnLimpiarTec) {
      btnLimpiarTec.addEventListener('click', () => {
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.tecnico.suelo_laboratorio = { textura: null, soc_pct: null, ph: null };
        p.tecnico.terreno_verificado = { pendiente_pct: null };
        p.tecnico.notas_campo = '';
        sincronizarControlesPaso2ConParcela();
        dibujarPoligonoParcelaActual(false);
        actualizarTodo();
      });
    }
  }

  /**
   * Configura las herramientas SIG, UX en campo (Dibujar polígono, Dibujar rectángulo, Editar bordes, GPS),
   * sensores en tierra, drones y capas visuales
   */
  function configurarHerramientasSIG() {
    const btnGuidedDraw = document.getElementById('btn-guided-draw');
    const btnDrawRectangle = document.getElementById('btn-draw-rectangle');
    const btnEditLayers = document.getElementById('btn-edit-layers');
    const btnFinishDraw = document.getElementById('btn-finish-draw');
    const btnUndoDraw = document.getElementById('btn-undo-draw');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCancelGuided = document.getElementById('btn-cancel-guided');
    const banner = document.getElementById('guided-draw-banner');

    function clickLeafletDrawButton(selector) {
      const el = document.querySelector(`#mapa-parcela ${selector}`);
      if (el) {
        el.click();
        return true;
      }
      return false;
    }

    function cancelarAccionLeafletDrawActiva() {
      const cancelBtn = document.querySelector(
        '#mapa-parcela .leaflet-draw-actions li a[title*="Cancelar"]'
      );
      if (cancelBtn) {
        cancelBtn.click();
      }
      document.body.classList.remove('guided-drawing-active');
      if (banner) banner.hidden = true;
    }

    if (btnFinishDraw) {
      btnFinishDraw.addEventListener('click', () => {
        clickLeafletDrawButton('.leaflet-draw-actions li a[title*="Terminar"]');
      });
    }

    if (btnUndoDraw) {
      btnUndoDraw.addEventListener('click', () => {
        clickLeafletDrawButton('.leaflet-draw-actions li a[title*="Borrar"]');
      });
    }

    if (btnSaveEdit) {
      btnSaveEdit.addEventListener('click', () => {
        clickLeafletDrawButton('.leaflet-draw-actions li a[title*="Guardar"]');
      });
    }

    // 1. Botón "Dibujar polígono"
    if (btnGuidedDraw) {
      btnGuidedDraw.addEventListener('click', () => {
        if (state.activeDrawType === 'polygon') {
          cancelarAccionLeafletDrawActiva();
          return;
        }
        cancelarAccionLeafletDrawActiva();
        clickLeafletDrawButton('.leaflet-draw-draw-polygon');
      });
    }

    // 2. Botón "Dibujar rectángulo"
    if (btnDrawRectangle) {
      btnDrawRectangle.addEventListener('click', () => {
        if (state.activeDrawType === 'rectangle') {
          cancelarAccionLeafletDrawActiva();
          return;
        }
        cancelarAccionLeafletDrawActiva();
        clickLeafletDrawButton('.leaflet-draw-draw-rectangle');
      });
    }

    // 3. Botón "Editar bordes" (Edit layers)
    if (btnEditLayers) {
      btnEditLayers.addEventListener('click', () => {
        if (state.activeDrawType === 'edit') {
          // Si ya está editando, al pulsar de nuevo guarda los cambios
          const saveBtn = document.querySelector(
            '#mapa-parcela .leaflet-draw-actions li a[title*="Guardar"]'
          );
          if (saveBtn) {
            saveBtn.click();
          } else {
            cancelarAccionLeafletDrawActiva();
          }
          return;
        }
        cancelarAccionLeafletDrawActiva();
        clickLeafletDrawButton('.leaflet-draw-edit-edit');
      });
    }

    if (btnCancelGuided) {
      btnCancelGuided.addEventListener('click', () => {
        cancelarAccionLeafletDrawActiva();
      });
    }

    // 4. Geolocalización activa en campo (50×50 m = 2 500 m²)
    const btnGps50m = document.getElementById('btn-gps-50m');
    if (btnGps50m) {
      btnGps50m.addEventListener('click', () => {
        const statusEl = document.getElementById('ubicacion-status');
        if (!navigator.geolocation) {
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.textContent = 'Geolocalización no disponible en este navegador.';
          }
          return;
        }
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = 'Obteniendo señal GPS de alta precisión en campo...';
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (state.map) {
              state.map.setView([latitude, longitude], 18);
            }
            abrirLoteEnPunto(latitude, longitude, 50);
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.textContent = 'GPS centrado: lote sugerido de 50×50 m (2 500 m²). Puedes usar «Editar bordes» para ajustar sus esquinas.';
            }
          },
          () => {
            const p = obtenerParcelaActual();
            const lat = p && p.centroide ? p.centroide.lat : 0.0412;
            const lon = p && p.centroide ? p.centroide.lon : -78.1425;
            if (state.map) {
              state.map.setView([lat, lon], 18);
            }
            abrirLoteEnPunto(lat, lon, 50);
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.textContent = 'Permiso GPS no concedido: se trazó parcela de 50×50 m (2 500 m²) en la vista actual.';
            }
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }

    // 5. Nodos de sensores georreferenciados en tierra (LoRa / telemetría local)
    const btnAddSensor = document.getElementById('btn-add-sensor');
    const btnRemoveSensor = document.getElementById('btn-remove-sensor');
    const sensorPanel = document.getElementById('sensor-node-panel');
    const sensorCoordsLabel = document.getElementById('sensor-node-coords');
    const inpSensorLluvia = document.getElementById('sensor-lluvia-mm');
    const inpSensorSoc = document.getElementById('sensor-soc-pct');
    const inpSensorPh = document.getElementById('sensor-ph');

    function sincronizarInputsSensorConParcela(p) {
      if (!p) return;
      const lluviaAnual = (p.clima_mensual || []).reduce((acc, m) => acc + (m.precip_mm || 0), 0);
      if (inpSensorLluvia) inpSensorLluvia.value = Math.round(lluviaAnual);
      if (inpSensorSoc) inpSensorSoc.value = Number(p.suelo.soc_pct || 0).toFixed(2);
      if (inpSensorPh) inpSensorPh.value = Number(p.suelo.ph || 0).toFixed(1);
    }

    function aplicarTelemetriaSensorLocal() {
      const p = obtenerParcelaActual();
      if (!p) return;
      asegurarEsquemaDual(p);

      // Calibrar lluvia de NASA POWER con el pluviómetro local
      const nuevaLluvia = inpSensorLluvia ? parseFloat(inpSensorLluvia.value) : NaN;
      if (!isNaN(nuevaLluvia) && nuevaLluvia >= 0 && Array.isArray(p.clima_mensual)) {
        const lluviaActual = p.clima_mensual.reduce((acc, m) => acc + (m.precip_mm || 0), 0);
        if (lluviaActual > 0) {
          const factor = nuevaLluvia / lluviaActual;
          p.clima_mensual.forEach((m) => {
            m.precip_mm = Math.round(m.precip_mm * factor * 10) / 10;
          });
        }
      }

      // Sobrescribir SOC y pH de SoilGrids con sonda en tierra
      const nuevoSoc = inpSensorSoc ? parseFloat(inpSensorSoc.value) : NaN;
      if (!isNaN(nuevoSoc) && nuevoSoc > 0) {
        p.tecnico.suelo_laboratorio.soc_pct = nuevoSoc;
      }
      const nuevoPh = inpSensorPh ? parseFloat(inpSensorPh.value) : NaN;
      if (!isNaN(nuevoPh) && nuevoPh >= 3.5 && nuevoPh <= 9.5) {
        p.tecnico.suelo_laboratorio.ph = nuevoPh;
      }

      p.sensor_local_activo = true;
      sincronizarControlesPaso2ConParcela();
      actualizarTodo();
    }

    if (btnAddSensor) {
      btnAddSensor.addEventListener('click', () => {
        if (!state.map) return;
        const p = obtenerParcelaActual();
        const lat = p.centroide ? p.centroide.lat : 0.0412;
        const lon = p.centroide ? p.centroide.lon : -78.1425;

        if (state.sensorMarker) {
          state.map.removeLayer(state.sensorMarker);
        }

        const iconSensor = L.divIcon({
          className: 'sensor-pin-wrapper',
          html: '<div class="sensor-pin" title="Arrastra el nodo sensor dentro de tu parcela"><i data-lucide="radio" class="icono"></i></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        state.sensorMarker = L.marker([lat, lon], {
          draggable: true,
          icon: iconSensor
        }).addTo(state.map);

        state.sensorMarker.bindPopup(
          '<strong>Nodo sensor LoRa en tierra</strong><br>Arrastra para ubicarlo en el lote. Calibra NASA POWER y SoilGrids.'
        ).openPopup();
        refrescarIconosLucide();

        if (sensorCoordsLabel) {
          sensorCoordsLabel.textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
        sincronizarInputsSensorConParcela(p);
        if (sensorPanel) sensorPanel.hidden = false;

        state.sensorMarker.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          if (sensorCoordsLabel) {
            sensorCoordsLabel.textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
          }
          aplicarTelemetriaSensorLocal();
        });
      });
    }

    if (btnRemoveSensor) {
      btnRemoveSensor.addEventListener('click', () => {
        if (state.sensorMarker && state.map) {
          state.map.removeLayer(state.sensorMarker);
          state.sensorMarker = null;
        }
        if (sensorPanel) sensorPanel.hidden = true;
        const p = obtenerParcelaActual();
        if (p) p.sensor_local_activo = false;
        actualizarTodo();
      });
    }

    [inpSensorLluvia, inpSensorSoc, inpSensorPh].forEach((inp) => {
      if (inp) {
        inp.addEventListener('change', aplicarTelemetriaSensorLocal);
      }
    });

    // 7. Importación de rutas/polígonos de drones (KML / GeoJSON)
    const inpImportDrone = document.getElementById('input-import-drone');
    if (inpImportDrone) {
      inpImportDrone.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEv) => {
          const texto = String(loadEv.target.result || '');
          let coords = [];
          let ndviDron = null;

          try {
            if (file.name.toLowerCase().endsWith('.kml') || texto.trim().startsWith('<')) {
              const match = texto.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
              if (match && match[1]) {
                const pares = match[1].trim().split(/\s+/);
                coords = pares
                  .map((par) => {
                    const partes = par.split(',');
                    const lon = parseFloat(partes[0]);
                    const lat = parseFloat(partes[1]);
                    return !isNaN(lat) && !isNaN(lon) ? { lat, lng: lon } : null;
                  })
                  .filter(Boolean);
              }
            } else {
              const geo = JSON.parse(texto);
              const feature = geo.type === 'FeatureCollection'
                ? (geo.features && geo.features[0])
                : geo.type === 'Feature'
                  ? geo
                  : { geometry: geo, properties: {} };

              if (feature && feature.properties && typeof feature.properties.ndvi === 'number') {
                ndviDron = feature.properties.ndvi;
              }

              const geom = feature && feature.geometry ? feature.geometry : geo;
              let ring = [];
              if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
                ring = geom.coordinates[0];
              } else if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates[0] && geom.coordinates[0][0]) {
                ring = geom.coordinates[0][0];
              } else if (geom.type === 'LineString' && geom.coordinates) {
                ring = geom.coordinates;
              }
              coords = ring
                .map((pt) => ({ lat: Number(pt[1]), lng: Number(pt[0]) }))
                .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));
            }
          } catch (err) {
            console.warn('Error leyendo archivo de dron:', err);
          }

          if (coords.length >= 3) {
            if (
              coords.length > 3 &&
              Math.abs(coords[0].lat - coords[coords.length - 1].lat) < 1e-6 &&
              Math.abs(coords[0].lng - coords[coords.length - 1].lng) < 1e-6
            ) {
              coords.pop();
            }

            const latCentro = coords.reduce((acc, c) => acc + c.lat, 0) / coords.length;
            const lonCentro = coords.reduce((acc, c) => acc + c.lng, 0) / coords.length;
            const lote = crearLoteDibujado(obtenerParcelaActual(), coords, { lat: latCentro, lng: lonCentro });
            lote.nombre = `Vuelo Dron: ${file.name.replace(/\.[^.]+$/, '')}`;

            if (ndviDron !== null) {
              const mesesBase = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
              lote.ndvi_mensual = mesesBase.map((mes) => ({ mes, ndvi: Number(ndviDron.toFixed(2)) }));
              lote.estado_datos.ndvi = 'Vuelo de dron importado (KML/GeoJSON)';
            }

            asegurarEsquemaDual(lote);
            state.parcelasActivas[lote.id] = lote;
            state.parcelasOriginales[lote.id] = clonar(lote);
            state.parcelaActualId = lote.id;

            dibujarPoligonoParcelaActual(true);
            sincronizarControlesPaso2ConParcela();
            actualizarTodo();
            const capa = state.drawnItems && state.drawnItems.getLayers()[0];
            cargarDatosLoteEnVivo(lote, capa || null);
          }
          inpImportDrone.value = '';
        };
        reader.readAsText(file);
      });
    }
  }

  /**
   * Configura todos los eventos de botones, sliders e inputs
   */
  function configurarAyudasAccesibles() {
    const btnLetra = document.getElementById('btn-letra-grande');
    const aplicarLetra = on => {
      document.documentElement.classList.toggle('letra-grande', on);
      if (btnLetra) btnLetra.setAttribute('aria-pressed', on ? 'true' : 'false');
      setTimeout(() => {
        if (state.map) state.map.invalidateSize();
        if (state.chartBalance) state.chartBalance.resize();
        if (state.chartHLS) state.chartHLS.resize();
      }, 60);
    };
    let guardada = false;
    try { guardada = localStorage.getItem('rotasat_letra_grande') === '1'; } catch (e) { guardada = false; }
    aplicarLetra(guardada);
    if (btnLetra) {
      btnLetra.addEventListener('click', () => {
        const on = !document.documentElement.classList.contains('letra-grande');
        aplicarLetra(on);
        try { localStorage.setItem('rotasat_letra_grande', on ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      });
    }

    const btnAvisos = document.getElementById('btn-escuchar-avisos');
    if (btnAvisos) {
      if (!window.AyudaAgricultor || !window.AyudaAgricultor.puedeHablar()) {
        btnAvisos.hidden = true;
      } else {
        btnAvisos.addEventListener('click', function () {
          window.AyudaAgricultor.leer(window.AyudaAgricultor.textoAdvertencias(state.avisosLote || []), this);
        });
      }
    }
  }

  function configurarInformePDF() {
    const btn = document.getElementById('btn-descargar-pdf');
    const estado = document.getElementById('informe-estado');
    if (!btn) return;
    if (!window.InformePDF || !window.InformePDF.disponible()) {
      btn.disabled = true;
      if (estado) estado.textContent = 'No se pudo cargar el generador de PDF en este navegador.';
      return;
    }
    btn.addEventListener('click', async () => {
      const parcela = obtenerParcelaActual();
      if (!state.ultimoResultado) return;
      btn.disabled = true;
      const textoOriginal = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-circle" class="icono girando" aria-hidden="true"></i> Preparando su informe…'; refrescarIconosLucide();
      try {
        await window.InformePDF.descargar({
          parcela,
          resultado: state.ultimoResultado,
          rotElegidaId: state.informeRotId,
          opciones: state.opciones,
          sliders: state.sliders,
          avisos: state.avisosLote || [],
          catalogo: state.catalogo,
          nombreAgricultor: (document.getElementById('informe-nombre')?.value || '').trim(),
          pronostico: state.pronosticoClave === `${parcela.centroide?.lat},${parcela.centroide?.lon}` ? state.pronostico : null
        });
        if (estado) estado.textContent = 'Listo: el PDF se guardó en su carpeta de Descargas.';
      } catch (e) {
        console.error(e);
        if (estado) estado.textContent = 'No se pudo crear el PDF. Intente de nuevo.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
        refrescarIconosLucide();
      }
    });
  }

  function configurarEventos() {
    configurarAyudasAccesibles();
    configurarInformePDF();
    const chkRiego = document.getElementById('check-tiene-riego');
    if (chkRiego) {
      chkRiego.checked = Boolean(state.opciones.conRiego);
      chkRiego.addEventListener('change', () => {
        state.opciones.conRiego = chkRiego.checked;
        actualizarTodo();
      });
    }
    configurarSidebarTabs();
    configurarModoDual();
    configurarPanelUbicacion();
    configurarHerramientasSIG();

    const onSoilChange = () => {
      const p = obtenerParcelaActual();
      asegurarEsquemaDual(p);
      p.tecnico.suelo_laboratorio.textura = document.getElementById('input-suelo-textura').value;
      p.tecnico.suelo_laboratorio.soc_pct = Number(document.getElementById('input-suelo-soc').value) || 1.5;
      p.tecnico.suelo_laboratorio.ph = Number(document.getElementById('input-suelo-ph').value) || 6.0;
      sincronizarControlesPaso2ConParcela();
      actualizarTodo();
    };

    ['input-suelo-textura', 'input-suelo-soc', 'input-suelo-ph'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', onSoilChange);
    });

    const btnResetSuelo = document.getElementById('btn-reset-parcela');
    if (btnResetSuelo) {
      btnResetSuelo.addEventListener('click', () => {
        const id = state.parcelaActualId;
        state.parcelasActivas[id] = clonar(state.parcelasOriginales[id]);
        sincronizarControlesPaso2ConParcela();
        dibujarPoligonoParcelaActual(true);
        actualizarTodo();
      });
    }

    const onHistoriaChange = () => {
      const p = obtenerParcelaActual();
      asegurarEsquemaDual(p);
      const h1 = document.getElementById('select-historia-1').value;
      const h2 = document.getElementById('select-historia-2').value;
      p.agricultor.historia_cultivos = [h1, h2];
      p.agricultor.vio_nematodos = document.getElementById('check-nematodo').checked;
      sincronizarControlesPaso2ConParcela();
      actualizarTodo();
    };

    ['select-historia-1', 'select-historia-2', 'check-nematodo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', onHistoriaChange);
    });

    const bindSlider = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        state.sliders[key] = Number(this.value);
        sincronizarBotonesPrioridadSimple();
        actualizarTodo();
      });
    };
    bindSlider('slider-agua', 'agua');
    bindSlider('slider-suelo', 'suelo');
    bindSlider('slider-ganar', 'ganar');

    const sliderEsc = document.getElementById('slider-escenario-lluvia');
    const badgeEsc = document.getElementById('badge-escenario-lluvia');
    if (sliderEsc) {
      sliderEsc.addEventListener('input', function () {
        const val = Number(this.value);
        state.opciones.escenarioLluviaPct = val;
        if (badgeEsc) {
          badgeEsc.textContent = val === 0
            ? '0 % (climatología normal)'
            : `${val > 0 ? '+' : ''}${val} % de lluvia`;
        }
        actualizarTodo();
      });
    }

    const chkForraje = document.getElementById('check-retira-forraje');
    if (chkForraje) {
      chkForraje.addEventListener('change', function () {
        const p = obtenerParcelaActual();
        asegurarEsquemaDual(p);
        p.agricultor.manejo_rastrojo = this.checked ? 'retirar_ganado' : 'dejar_en_suelo';
        state.opciones.retiraForraje = this.checked;
        state.opciones.priorizarForraje = this.checked;
        sincronizarControlesPaso2ConParcela();
        actualizarTodo();
      });
    }

    // Marcar paso activo al navegar
    document.querySelectorAll('.paso, .nav-link').forEach(link => {
      link.addEventListener('click', function () {
        const href = this.getAttribute('href');
        if (!href || !href.startsWith('#paso-')) return;
        document.querySelectorAll('.paso').forEach(p => {
          p.classList.toggle('activo', p.getAttribute('href') === href);
        });
        document.querySelectorAll('.nav-link').forEach(n => {
          n.classList.toggle('activo', n.getAttribute('href') === href);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    configurarDefaultsChartJS();
    refrescarIconosLucide();
    cargarDatosIniciales()
      .then(() => {
        sincronizarControlesPaso2ConParcela();
        inicializarMapa();
        configurarEventos();
        actualizarTodo();
      })
      .catch(err => {
        console.error('Error inicializando la aplicación:', err);
      });
  });
})();
