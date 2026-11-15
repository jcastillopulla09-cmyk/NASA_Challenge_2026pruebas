/**
 * capas_nasa.js — Capas satelitales de la NASA (GIBS) y mapas base abiertos, dentro del
 * selector de capas del mapa (ícono de capas de Leaflet).
 *
 * Fuentes (todas abiertas):
 *  - NASA GIBS (dominio público): MODIS NDVI, SMAP L4 humedad de raíz, GPM IMERG lluvia,
 *    MODIS temperatura de superficie y VIIRS imagen del día.
 *  - OpenStreetMap (ODbL), OpenTopoMap (CC-BY-SA, relieve hecho con SRTM de la NASA)
 *    y Sentinel-2 cloudless 2016 de EOX (CC BY 4.0, datos Copernicus).
 *
 * GIBS publica cada capa en un nivel de mosaico (GoogleMapsCompatible_LevelN). Si el nivel
 * declarado no responde, la capa prueba los otros niveles posibles por sí sola.
 */
(function () {
  'use strict';

  const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

  function fechaISO(diasAtras) {
    const d = new Date(Date.now() - diasAtras * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // Capas NASA: id GIBS, formato, niveles a probar (el primero es el documentado), días de retraso típicos.
  const CAPAS = [
    {
      clave: 'ndvi', id: 'MODIS_Terra_NDVI_8Day', ext: 'png', niveles: [9, 8, 7], retraso: 10,
      emoji: 'sprout', nombre: 'Verdor de cultivos', sensor: 'MODIS Terra NDVI · 8 días · 250 m',
      leyenda: 'Café = suelo pelado o seco · Verde intenso = cultivo vigoroso',
      gradiente: 'linear-gradient(90deg,#c8a165,#e6d27a,#9bc35a,#3d8b2f,#0f5a1e)'
    },
    {
      clave: 'humedad', id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', ext: 'png', niveles: [6, 7, 5, 8], retraso: 5,
      emoji: 'droplets', nombre: 'Humedad del suelo (raíz)', sensor: 'SMAP L4 · 0–100 cm · 9 km',
      leyenda: 'Tonos claros = suelo seco · Tonos intensos = suelo húmedo',
      gradiente: null
    },
    {
      clave: 'lluvia', id: 'IMERG_Precipitation_Rate', ext: 'png', niveles: [6, 7, 5, 8], retraso: 2,
      emoji: 'cloud-rain', nombre: 'Lluvia reciente', sensor: 'GPM IMERG · 30 min · 10 km',
      leyenda: 'Colores = intensidad de la lluvia en ese momento (mm/h)',
      gradiente: null
    },
    {
      clave: 'temp', id: 'MODIS_Terra_Land_Surface_Temp_Day', ext: 'png', niveles: [7, 6, 8], retraso: 2,
      emoji: 'thermometer', nombre: 'Temperatura del suelo (día)', sensor: 'MODIS Terra LST · diaria · 1 km',
      leyenda: 'Azul = frío · Rojo = caliente',
      gradiente: 'linear-gradient(90deg,#2c3e9e,#4ba3d6,#f2e86d,#f08a2b,#b21e1e)'
    }
  ];

  const BASES = [
    {
      clave: 'sentinel', nombre: 'Satélite (Sentinel-2)', emoji: 'satellite',
      url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
      opts: { maxZoom: 19, maxNativeZoom: 15, attribution: 'Sentinel-2 cloudless 2016 © <a href="https://s2maps.eu">EOX</a> (CC BY 4.0), datos Copernicus' }
    },
    {
      clave: 'relieve', nombre: 'Relieve (SRTM)', emoji: 'mountain',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      opts: { maxZoom: 17, attribution: '© OpenStreetMap, SRTM · estilo © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' }
    },
    {
      clave: 'calles', nombre: 'Caminos y comunidades', emoji: 'map',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      opts: { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
    },
    {
      clave: 'viirs', nombre: 'Imagen NASA del día', emoji: 'globe', gibs: true,
      id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', ext: 'jpg', niveles: [9, 8], retraso: 1,
      opts: { maxZoom: 19, attribution: 'NASA GIBS · VIIRS SNPP' }
    }
  ];

  /** Capa GIBS que prueba otro nivel de mosaico si el primero falla. */
  function capaGibs(def, fecha, opciones) {
    let idx = 0;
    let exitos = 0;
    let errores = 0;
    const plantilla = () => `${GIBS}/${def.id}/default/${fecha()}/GoogleMapsCompatible_Level${def.niveles[idx]}/{z}/{y}/{x}.${def.ext}`;
    const capa = L.tileLayer(plantilla(), Object.assign({
      maxZoom: 19,
      maxNativeZoom: def.niveles[0],
      opacity: 0.7,
      attribution: `NASA GIBS · ${def.sensor || def.id}`,
      crossOrigin: true
    }, opciones || {}));
    capa.on('tileload', () => { exitos++; capa.fire('estado', { ok: true }); });
    // GIBS devuelve mosaicos vacíos (200) donde no hay dato; un 404 sin ningún éxito
    // significa que el nivel de mosaico o la fecha no existen para esa capa.
    capa.on('tileerror', () => {
      errores++;
      if (exitos === 0 && errores >= 1 && idx < def.niveles.length - 1) {
        idx++; errores = 0;
        capa.options.maxNativeZoom = def.niveles[idx];
        capa.setUrl(plantilla());
      } else if (exitos === 0 && errores >= 2) {
        capa.fire('estado', { ok: false });
      }
    });
    capa.actualizarFecha = () => { exitos = 0; errores = 0; capa.setUrl(plantilla()); };
    return capa;
  }

  function enlaceWorldview(def, map, fecha) {
    const b = map.getBounds();
    const v = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(n => n.toFixed(3)).join(',');
    return `https://worldview.earthdata.nasa.gov/?v=${v}&l=${def.id},Coastlines_15m&t=${fecha}`;
  }

  /**
   * Monta el selector de capas dentro del mapa (ícono de capas, arriba a la derecha):
   * mapas base abiertos, capas NASA GIBS y capas extra (p. ej. catastro rural del MAG).
   * Debajo del mapa solo aparece una leyenda compacta cuando hay una capa NASA activa.
   */
  function montar(map, contenedor, capasExtra) {
    const estado = { fechaManual: null };
    const fechaDe = def => () => estado.fechaManual || fechaISO(def.retraso);

    const bases = {};
    const basesCtl = {};
    BASES.forEach(b => {
      bases[b.clave] = b.gibs ? capaGibs(b, fechaDe(b), Object.assign({ opacity: 1 }, b.opts)) : L.tileLayer(b.url, b.opts);
      basesCtl[b.nombre] = bases[b.clave];
    });
    const capas = {};
    const overlaysCtl = {};
    const defDeCapa = new Map();
    CAPAS.forEach(c => {
      capas[c.clave] = capaGibs(c, fechaDe(c));
      overlaysCtl[`NASA · ${c.nombre}`] = capas[c.clave];
      defDeCapa.set(capas[c.clave], c);
    });
    Object.entries(capasExtra || {}).forEach(([nombre, capa]) => { if (capa) overlaysCtl[nombre] = capa; });

    // Quita cualquier capa base previa y deja Sentinel-2 por defecto
    map.eachLayer(l => { if (l instanceof L.TileLayer) map.removeLayer(l); });
    bases.sentinel.addTo(map);
    const control = L.control.layers(basesCtl, overlaysCtl, { position: 'topright', collapsed: true }).addTo(map);

    contenedor.hidden = true;
    contenedor.innerHTML = `
      <div class="capas-leyenda">
        <div class="capas-leyenda-txt"><strong id="capas-ley-titulo"></strong><span id="capas-ley-sensor"></span><span id="capas-ley-texto"></span></div>
        <div class="capas-leyenda-ctrl">
          <span class="capas-gradiente" id="capas-gradiente" aria-hidden="true"></span>
          <label>Transparencia <input type="range" id="capas-opacidad" min="20" max="100" value="70" /></label>
          <label class="capas-fecha">Fecha de la imagen <input type="date" id="capas-fecha" max="${fechaISO(0)}" /></label>
          <a id="capas-worldview" target="_blank" rel="noopener">Ver escala oficial en NASA Worldview ↗</a>
          <span class="capas-aviso" id="capas-aviso" role="status"></span>
        </div>
      </div>`;
    const aviso = contenedor.querySelector('#capas-aviso');
    const inpFecha = contenedor.querySelector('#capas-fecha');
    const inpOpac = contenedor.querySelector('#capas-opacidad');
    const linkWv = contenedor.querySelector('#capas-worldview');
    let defActual = null;
    let capaActual = null;

    const pintarLeyenda = () => {
      contenedor.hidden = !defActual;
      if (!defActual) return;
      const f = estado.fechaManual || fechaISO(defActual.retraso);
      contenedor.querySelector('#capas-ley-titulo').textContent = defActual.nombre;
      contenedor.querySelector('#capas-ley-sensor').textContent = `${defActual.sensor} · imagen del ${f}`;
      contenedor.querySelector('#capas-ley-texto').textContent = defActual.leyenda;
      const g = contenedor.querySelector('#capas-gradiente');
      g.hidden = !defActual.gradiente;
      if (defActual.gradiente) g.style.background = defActual.gradiente;
      linkWv.href = enlaceWorldview(defActual, map, f);
    };

    map.on('overlayadd', e => {
      const def = defDeCapa.get(e.layer);
      if (!def) return;
      // Una sola capa NASA a la vez: se entiende mejor y la leyenda es clara
      setTimeout(() => {
        defDeCapa.forEach((d, capa) => { if (capa !== e.layer && map.hasLayer(capa)) map.removeLayer(capa); });
      }, 0);
      defActual = def; capaActual = e.layer;
      aviso.textContent = '';
      capaActual.setOpacity(Number(inpOpac.value) / 100);
      capaActual.off('estado').on('estado', ev => {
        aviso.textContent = ev.ok ? '' : 'Sin imagen para esa fecha (nubes o satélite sin pasar): pruebe otra fecha.';
      });
      // Una capa de 9–10 km no se distingue a zoom de parcela: alejar para que se entienda
      if (['humedad', 'lluvia'].includes(def.clave) && map.getZoom() > 11) map.setZoom(10);
      if (['ndvi', 'temp'].includes(def.clave) && map.getZoom() > 14) map.setZoom(13);
      pintarLeyenda();
    });
    map.on('overlayremove', e => {
      if (e.layer === capaActual) { defActual = null; capaActual = null; pintarLeyenda(); }
    });

    inpOpac.addEventListener('input', () => { if (capaActual) capaActual.setOpacity(Number(inpOpac.value) / 100); });
    inpFecha.addEventListener('change', () => {
      estado.fechaManual = inpFecha.value || null;
      Object.values(capas).forEach(c => c.actualizarFecha());
      if (bases.viirs.actualizarFecha) bases.viirs.actualizarFecha();
      aviso.textContent = '';
      pintarLeyenda();
    });
    map.on('moveend', () => { if (defActual) linkWv.href = enlaceWorldview(defActual, map, estado.fechaManual || fechaISO(defActual.retraso)); });
    estado.control = control;
    return estado;
  }

  window.CapasNASA = { montar, CAPAS, BASES };
})();
