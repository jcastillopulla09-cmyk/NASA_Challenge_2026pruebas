/**
 * ayuda_agricultor.js — Ayudas visuales y prácticas para el agricultor.
 *
 *  - Medidores fáciles de leer: barra de colores con marcador y círculo que se llena.
 *  - "¿Qué puede hacer?": acciones concretas para cada advertencia del lote y para
 *    cada cultivo descartado (altitud, pendiente, helada, pausa de familia).
 *  - Lectura en voz alta (Web Speech API del navegador, voz en español).
 *
 * No calcula nada nuevo: solo traduce a lenguaje de campo los datos de NASA POWER,
 * SRTM/NASADEM, HLS e ISRIC SoilGrids que ya usa el motor.
 */
(function () {
  'use strict';

  // Solo estos lotes tienen pedido de historial satelital (HLS, SMAP, NASADEM) en NASA AppEEARS
  const PARCELAS_SATELITALES = ['parcela_licto', 'parcela_guano'];
  const esParcelaSatelital = p => Boolean(p && PARCELAS_SATELITALES.includes(p.id));

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------------------------------------------------------------------------
  // 1. Medidores
  // ---------------------------------------------------------------------------

  /**
   * Barra de colores con marcador.
   * zonas: [{hasta, color: 'ok'|'alerta'|'riesgo'|'info', texto}] en orden creciente.
   */
  function barra({ id, titulo, icono, valor, min, max, zonas, unidad, valorTexto }) {
    const v = Math.max(min, Math.min(max, Number(valor)));
    const pct = ((v - min) / (max - min)) * 100;
    let desde = min;
    const segmentos = zonas.map(z => {
      const ancho = ((Math.min(z.hasta, max) - desde) / (max - min)) * 100;
      desde = Math.min(z.hasta, max);
      return `<span class="medidor-seg ${z.color}" style="width:${ancho.toFixed(2)}%"></span>`;
    }).join('');
    // El límite pertenece a la zona siguiente (12 % ya es ladera), igual que en advertenciasLote
    const zona = zonas.find(z => Number(valor) < z.hasta) || zonas[zonas.length - 1];
    return `
      <div class="medidor" ${id ? `id="${id}"` : ''} role="img"
           aria-label="${esc(titulo)}: ${esc(valorTexto || (valor + ' ' + (unidad || '')))}, ${esc(zona.texto)}">
        <div class="medidor-cabeza">
          <span class="medidor-titulo">${icono ? `<i data-lucide="${icono}" class="icono medidor-ico" aria-hidden="true"></i>` : ''}${esc(titulo)}</span>
          <span class="medidor-valor tabular-nums">${esc(valorTexto || `${valor} ${unidad || ''}`)}</span>
        </div>
        <div class="medidor-pista" aria-hidden="true">
          ${segmentos}
          <span class="medidor-marca" style="left:${pct.toFixed(1)}%"></span>
        </div>
        <div class="medidor-veredicto ${zona.color}">${esc(zona.texto)}</div>
      </div>`;
  }

  /** Círculo que se llena (0–100). */
  function circulo({ titulo, icono, pct, color, centro, texto }) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    return `
      <div class="medidor-circulo" role="img" aria-label="${esc(titulo)}: ${esc(centro)}. ${esc(texto)}">
        <div class="anillo ${color}" style="--p:${p}">
          <span class="anillo-centro">${icono ? `<i data-lucide="${icono}" class="icono anillo-ico" aria-hidden="true"></i>` : ''}<b class="tabular-nums">${esc(centro)}</b></span>
        </div>
        <div class="anillo-texto"><strong>${esc(titulo)}</strong><span>${esc(texto)}</span></div>
      </div>`;
  }

  /** Panel de medidores del lote a partir de los datos de la parcela. */
  function medidoresLote(parcela, opciones) {
    const clima = parcela.clima_mensual || [];
    const factorEsc = 1 + ((opciones && opciones.escenarioLluviaPct) || 0) / 100;
    const lluvia = clima.reduce((a, m) => a + m.P_mm, 0) * factorEsc;
    const et0 = clima.reduce((a, m) => a + m.ET0_mm, 0);
    const cubre = et0 > 0 ? Math.round(100 * lluvia / et0) : 0;
    const tmin = clima.length ? Math.min(...clima.map(m => m.Tmin_abs)) : null;
    const pend = Number(parcela.terreno?.pendiente_pct ?? 0);
    const elev = Number(parcela.terreno?.elev_m ?? 0);
    const ph = Number(parcela.suelo?.ph);

    const html = [];
    html.push(barra({
      titulo: 'Inclinación del terreno', icono: 'mountain', valor: pend, min: 0, max: 40, unidad: '%',
      valorTexto: `${pend} %`,
      zonas: [
        { hasta: 12, color: 'ok', texto: 'Plano o casi plano: fácil de trabajar' },
        { hasta: 25.01, color: 'alerta', texto: 'Ladera: siembre en curvas de nivel' },
        { hasta: 40, color: 'riesgo', texto: 'Muy empinado: la lluvia se lleva la tierra' }
      ]
    }));
    html.push(barra({
      titulo: 'Altura del lote', icono: 'mountain-snow', valor: elev, min: 0, max: 4500, unidad: 'm',
      valorTexto: `${elev.toLocaleString('es-EC')} m`,
      zonas: [
        { hasta: 1200, color: 'info', texto: 'Zona cálida (Costa / Amazonía)' },
        { hasta: 2500, color: 'ok', texto: 'Valle templado' },
        { hasta: 3500, color: 'ok', texto: 'Sierra fría: papa, haba, cebada, quinua' },
        { hasta: 4500, color: 'alerta', texto: 'Páramo: pocos cultivos aguantan' }
      ]
    }));
    // Tierra: agua que guarda (FAO-56 Tabla 19, 50 cm de raíz) y materia orgánica (carbono)
    const textura = parcela.suelo?.textura || 'Franco';
    const props = (window.BalanceMotor && window.BalanceMotor.propiedadesTextura)
      ? window.BalanceMotor.propiedadesTextura(textura) : { taw: 0.155 };
    const aguaMm = Math.round(props.taw * 500);
    html.push(barra({
      titulo: `Agua que guarda su tierra (${textura.toLowerCase()})`, icono: 'droplets', valor: aguaMm, min: 0, max: 100, unidad: 'mm',
      valorTexto: `${aguaMm} mm`,
      zonas: [
        { hasta: 50, color: 'alerta', texto: 'Guarda poca agua: riegue seguido y en poca cantidad' },
        { hasta: 70, color: 'ok', texto: 'Guarda agua en cantidad media' },
        { hasta: 100, color: 'ok', texto: 'Guarda bien el agua entre lluvias' }
      ]
    }));
    // Humedad en la zona de raíces medida por SMAP (solo lotes con serie de NASA AppEEARS)
    const sm = parcela.smap && Number(parcela.smap.sm_rootzone_m3m3);
    if (Number.isFinite(sm) && sm > 0) {
      const pct = Math.round(sm * 1000) / 10;
      const an = Number(parcela.smap.anomalia_pct) || 0;
      html.push(barra({
        titulo: 'Humedad en las raíces (satélite SMAP)', icono: 'waves', valor: pct, min: 0, max: 50, unidad: '%',
        valorTexto: `${pct} %`,
        zonas: [
          { hasta: 15, color: 'alerta', texto: 'Suelo seco en la zona de raíces' },
          { hasta: 35, color: 'ok', texto: `Humedad adecuada (${an >= 0 ? '+' : ''}${an} % frente a su promedio de 3 años)` },
          { hasta: 50, color: 'info', texto: 'Suelo muy húmedo: cuide el drenaje' }
        ]
      }));
    }
    const socV = Number(parcela.suelo?.soc_pct);
    if (Number.isFinite(socV) && socV > 0) {
      html.push(barra({
        titulo: 'Materia orgánica (carbono)', icono: 'leaf', valor: socV, min: 0, max: 8, unidad: '%',
        valorTexto: `${socV} %`,
        zonas: [
          { hasta: 2, color: 'alerta', texto: 'Tierra pobre: añada abono orgánico' },
          { hasta: 4, color: 'ok', texto: 'Buena materia orgánica' },
          { hasta: 8, color: 'ok', texto: 'Tierra negra y rica en materia orgánica' }
        ]
      }));
    }
    if (Number.isFinite(ph) && ph > 0) {
      html.push(barra({
        titulo: 'Acidez de la tierra (pH)', icono: 'flask-conical', valor: ph, min: 4, max: 9, unidad: '',
        valorTexto: `pH ${ph}`,
        zonas: [
          { hasta: 5.5, color: 'alerta', texto: 'Tierra ácida: haga análisis antes de encalar' },
          { hasta: 7.51, color: 'ok', texto: 'Acidez buena para la mayoría de cultivos' },
          { hasta: 9, color: 'alerta', texto: 'Tierra alcalina: añada abono orgánico' }
        ]
      }));
    }

    const circulos = [];
    if (et0 > 0) {
      circulos.push(circulo({
        titulo: 'Agua de lluvia', icono: 'droplet', pct: Math.min(100, cubre),
        color: cubre >= 85 ? 'ok' : (cubre >= 60 ? 'alerta' : 'riesgo'),
        centro: `${Math.min(cubre, 999)} %`,
        texto: cubre >= 100 ? 'Llueve lo que la tierra necesita o más'
          : cubre >= 60 ? 'La lluvia cubre buena parte; poco riego de apoyo'
            : 'Falta agua: necesitará riego en meses secos'
      }));
    }
    if (tmin !== null) {
      // 0 % = 6 °C o más (sin riesgo) · 100 % = -4 °C o menos (helada fuerte)
      const riesgo = Math.max(0, Math.min(100, (6 - tmin) * 10));
      circulos.push(circulo({
        titulo: 'Riesgo de helada', icono: 'snowflake', pct: riesgo,
        color: tmin < 0 ? 'riesgo' : (tmin < 2 ? 'alerta' : 'ok'),
        centro: `${tmin} °C`,
        texto: tmin < 0 ? 'Hay noches bajo cero: cuide la floración'
          : tmin < 2 ? 'Noches muy frías en meses secos'
            : 'Sin heladas en los últimos 10 años'
      }));
    }
    return `<div class="medidores-barras">${html.join('')}</div>` +
      (circulos.length ? `<div class="medidores-circulos">${circulos.join('')}</div>` : '');
  }

  // ---------------------------------------------------------------------------
  // 2. ¿Qué puede hacer? — advertencias del lote
  // ---------------------------------------------------------------------------

  /** Lista de advertencias con nivel, explicación sencilla y acciones. */
  function advertenciasLote(parcela, opciones) {
    const out = [];
    const clima = parcela.clima_mensual || [];
    const pend = Number(parcela.terreno?.pendiente_pct ?? 0);
    const tmin = clima.length ? Math.min(...clima.map(m => m.Tmin_abs)) : null;
    const factorEsc = 1 + ((opciones && opciones.escenarioLluviaPct) || 0) / 100;
    const lluvia = clima.reduce((a, m) => a + m.P_mm, 0) * factorEsc;
    const et0 = clima.reduce((a, m) => a + m.ET0_mm, 0);
    const cubre = et0 > 0 ? Math.round(100 * lluvia / et0) : null;
    const secos = clima.filter(m => m.P_mm * factorEsc < 0.5 * m.ET0_mm).map(m => m.nombre_mes);
    const ph = Number(parcela.suelo?.ph);
    const soc = Number(parcela.suelo?.soc_pct);
    const anom = parcela.anomalia || {};
    const ndvi = parcela.ndvi_mensual || [];
    const est = parcela.estado_datos || {};
    const fTer = est.terreno || 'SRTM/NASADEM 30 m';
    const fCli = est.clima || 'NASA POWER 2015–2024 (AG)';
    const fSue = (parcela.suelo && parcela.suelo.fuente) || 'ISRIC SoilGrids 250 m';
    const metodo = parcela.clima_metodo_et0 || 'Hargreaves FAO-56';

    // Pendiente
    if (pend > 25) {
      out.push({
        clase: 'riesgo', icono: 'mountain', titulo: `Terreno muy empinado (${pend} %)`,
        tecnico: `Pendiente media ${pend} % (máx. ${parcela.terreno?.pendiente_max_pct ?? '?'} %) · fuente: ${fTer} · umbral > 25 %: filtro duro, se excluye labranza intensiva; factor de escorrentía f = ${pend > 25 ? 'alto' : 'medio'}.`,
        porque: 'Con lluvia fuerte se va la capa buena de la tierra. Por eso no recomendamos arar a fondo.',
        acciones: [
          'Haga zanjas de infiltración o terrazas siguiendo la curva del cerro (de lado a lado, nunca de arriba a abajo).',
          'Siembre barreras vivas cada 10–15 m: pasto, sigse, aliso o chocho en fila.',
          'No queme ni saque el rastrojo: déjelo encima como cobija del suelo.',
          'Prefiera cultivos que cubren el suelo: avena con vicia, chocho, quinua o cebada.'
        ]
      });
    } else if (pend >= 12) {
      out.push({
        clase: 'alerta', icono: 'mountain', titulo: `Ladera moderada (${pend} %)`,
        tecnico: `Pendiente media ${pend} % (máx. ${parcela.terreno?.pendiente_max_pct ?? '?'} %) · fuente: ${fTer} · rango 12–25 %: se exige labranza en contorno y cobertura (rastrojo).`,
        porque: 'La lluvia puede arrastrar tierra si los surcos van hacia abajo.',
        acciones: [
          'Haga los surcos atravesados a la pendiente (en curvas de nivel).',
          'Ponga una barrera viva de pasto o chocho cada 15–20 m.',
          'Deje el rastrojo sobre el suelo después de cosechar.'
        ]
      });
    } else {
      out.push({ clase: 'ok', icono: 'mountain', titulo: `Terreno plano (${pend} %)`, porque: 'Poca pérdida de tierra por lluvia.', acciones: [] });
    }

    // Heladas
    if (tmin !== null && tmin < 0) {
      out.push({
        clase: 'riesgo', icono: 'snowflake', titulo: `Heladas (hasta ${tmin} °C)`,
        tecnico: `Tmin absoluta mensual ${tmin} °C (corregida por altitud −6,5 °C/km) · fuente: ${fCli} · umbral < 0 °C: se excluyen cultivos con tolera_helada = No si el ciclo cruza esos meses.`,
        porque: 'Las noches despejadas de junio a agosto queman hojas y flores de cultivos delicados.',
        acciones: [
          'Ajuste la fecha de siembra para que la floración no caiga en junio–agosto.',
          'Use cultivos o variedades que aguantan frío: haba, cebada, chocho, quinua, papas nativas.',
          'Si tiene riego, moje el suelo la tarde antes de una noche despejada: la tierra húmeda guarda calor.',
          'Siga la alerta de heladas del INAMHI en la radio o en su celular.'
        ]
      });
    } else if (tmin !== null && tmin < 2) {
      out.push({
        clase: 'alerta', icono: 'snowflake', titulo: `Noches muy frías (${tmin} °C)`,
        tecnico: `Tmin absoluta ${tmin} °C en ${clima.filter(m => m.Tmin_abs < 2).map(m => m.nombre_mes).join(', ') || '—'} · fuente: ${fCli} · rango 0–2 °C: riesgo en floración de cultivos de tolerancia moderada.`,
        porque: 'En los meses secos la temperatura puede bajar casi a cero.',
        acciones: [
          'Evite que la floración coincida con julio y agosto.',
          'Esté atento a las noches sin nubes: son las más frías.'
        ]
      });
    } else if (tmin !== null) {
      out.push({ clase: 'ok', icono: 'snowflake', titulo: 'Sin heladas', porque: `La mínima en 10 años fue ${tmin} °C.`, acciones: [] });
    }

    // Agua
    if (cubre !== null && cubre < 60) {
      out.push({
        clase: 'riesgo', icono: 'droplet', titulo: 'Falta agua de lluvia',
        tecnico: `Lluvia anual ${Math.round(lluvia)} mm vs ET₀ ${Math.round(et0)} mm (${metodo}) · cobertura ${cubre} % · meses con P < 0,5·ET₀: ${secos.join(', ') || '—'} · fuente: ${fCli}.`,
        porque: `La lluvia cubre solo ${cubre} % de lo que el suelo pierde al año.` + (secos.length ? ` Meses más secos: ${secos.join(', ')}.` : ''),
        acciones: [
          'Siembre al comenzar las lluvias para aprovechar la humedad.',
          'Prefiera cultivos que aguantan seco: quinua, chocho, cebada.',
          'Cubra el suelo con rastrojo o paja: guarda la humedad.',
          'Si puede, guarde agua de lluvia en un reservorio o use riego por goteo o aspersión en su turno.'
        ]
      });
    } else if (cubre !== null && cubre < 85) {
      out.push({
        clase: 'alerta', icono: 'droplet', titulo: 'Algunos meses secos',
        tecnico: `Lluvia anual ${Math.round(lluvia)} mm vs ET₀ ${Math.round(et0)} mm (${metodo}) · cobertura ${cubre} % · meses con P < 0,5·ET₀: ${secos.join(', ') || '—'}.`,
        porque: `La lluvia cubre ${cubre} % de la demanda.` + (secos.length ? ` Meses más secos: ${secos.join(', ')}.` : ''),
        acciones: [
          'Asegure su turno de riego para esos meses.',
          'No deje el suelo pelado: el rastrojo encima ahorra agua.'
        ]
      });
    }

    // Lluvia reciente fuera de lo normal (anomalía NASA POWER)
    if (typeof anom.pct === 'number' && anom.pct > 50) {
      out.push({
        clase: 'riesgo', icono: 'cloud-rain', titulo: `Llovió mucho más de lo normal (+${anom.pct} %)`,
        tecnico: `Anomalía PRECTOTCORR ${anom.ventana}: ${anom.lluvia_reciente_mm} mm vs normal ${anom.lluvia_normal_mm} mm (${anom.anios_referencia}) · ${anom.fuente || 'NASA POWER'} ~${anom.res_km || 50} km · umbral > +50 %.`,
        porque: `En ${anom.ventana || 'los últimos meses'} llovió mucho más que en un año normal. El suelo puede estar encharcado.`,
        acciones: [
          'Abra zanjas o canales para sacar el agua que se empoza.',
          'Siembre en camellones o surcos altos.',
          'No are con el suelo mojado: se compacta y se daña.',
          'Use semilla sana y revise seguido si aparece lancha o pudrición.'
        ]
      });
    } else if (typeof anom.pct === 'number' && anom.pct < -15) {
      out.push({
        clase: 'alerta', icono: 'sun', titulo: `Temporada más seca de lo normal (${anom.pct} %)`,
        tecnico: `Anomalía PRECTOTCORR ${anom.ventana}: ${anom.lluvia_reciente_mm} mm vs normal ${anom.lluvia_normal_mm} mm (${anom.anios_referencia}) · umbral < −15 %: se refuerza el peso hídrico del IRR.`,
        porque: `En ${anom.ventana || 'los últimos meses'} llovió menos que en un año normal.`,
        acciones: [
          'Espere a que el suelo tenga humedad antes de sembrar.',
          'Dé prioridad a cultivos que aguantan seco y cubra el suelo con rastrojo.'
        ]
      });
    }

    // Acidez
    if (Number.isFinite(ph) && ph > 0 && ph < 5.5) {
      out.push({
        clase: 'alerta', icono: 'flask-conical', titulo: `Tierra ácida (pH ${ph})`,
        tecnico: `pH(H₂O) ${ph} ponderado 0–30 cm · fuente: ${fSue} · umbral < 5,5: riesgo de Al intercambiable y fijación de P; dosis de cal según análisis (no por SoilGrids).`,
        porque: 'Las plantas aprovechan menos el fósforo y el calcio.',
        acciones: [
          'Haga un análisis de suelo (INIAP o laboratorio agrícola) antes de comprar cal.',
          'Si el análisis lo pide, ponga cal agrícola o dolomita 1 a 2 meses antes de sembrar.',
          'Añada compost o estiércol bien descompuesto.',
          'La papa y el chocho toleran bien la tierra algo ácida.'
        ]
      });
    } else if (Number.isFinite(ph) && ph > 7.5) {
      out.push({
        clase: 'alerta', icono: 'flask-conical', titulo: `Tierra alcalina (pH ${ph})`,
        tecnico: `pH(H₂O) ${ph} ponderado 0–30 cm · fuente: ${fSue} · umbral > 7,5: menor disponibilidad de Fe, Zn, Mn y P.`,
        porque: 'Pueden faltar hierro y zinc: las hojas se ponen amarillas.',
        acciones: [
          'Añada abono orgánico o compost cada siembra.',
          'Consulte a un técnico antes de usar azufre agrícola.'
        ]
      });
    }

    // Materia orgánica
    if (Number.isFinite(soc) && soc > 0 && soc < 2) {
      out.push({
        clase: 'alerta', icono: 'sprout', titulo: 'Poca materia orgánica',
        tecnico: `Carbono orgánico ${soc} % (0–30 cm) · fuente: ${fSue} · umbral < 2 %; N total ${parcela.suelo?.n_gkg ?? '?'} g/kg.`,
        porque: `El carbono del suelo es ${soc} %: la tierra guarda poca agua y poco abono.`,
        acciones: [
          'Incorpore estiércol curado o compost.',
          'Siembre abonos verdes (vicia, chocho) y no queme el rastrojo.'
        ]
      });
    }

    // Suelo desnudo (HLS)
    if (!ndvi.length && esParcelaSatelital(parcela)) {
      out.push({
        clase: 'info', icono: 'satellite', titulo: 'Sin historial satelital de este lote',
        tecnico: `HLS (HLSL30/HLSS30) NDVI/NDTI 30 m no cargado: se solicita por AppEEARS (Point Sample). Estado: ${est.ndvi || 'sin dato'}.`,
        porque: 'Las fotos del satélite de este lote todavía no están cargadas.',
        acciones: ['Cuéntenos en el Paso 2 qué sembró los últimos 2 años: así cuidamos que no vuelvan las plagas.']
      });
    } else if (ndvi.length) {
      const desnudo = ndvi.filter(m => m.ndvi < 0.25).length;
      if (desnudo >= 8) {
        out.push({
          clase: 'alerta', icono: 'satellite', titulo: `Suelo pelado muchos meses (${desnudo} de ${ndvi.length})`,
          tecnico: `${desnudo}/${ndvi.length} observaciones mensuales con NDVI < 0,25 · HLS Landsat 8/9 + Sentinel-2, 30 m, Fmask aplicado · estado: ${est.ndvi || '—'}.`,
        porque: 'El satélite vio el lote sin plantas muchos meses. Así la lluvia y el viento se llevan la tierra.',
          acciones: [
            'Entre cosecha y siembra, ponga avena con vicia como cobertura.',
            'Deje el rastrojo en el lote en vez de quemarlo.'
          ]
        });
      }
    }
    return out;
  }

  /** Tarjeta corta junto al mapa: cuántos cuidados hay y enlace a «Riesgos y qué hacer». */
  function resumenRiesgos(lista) {
    const graves = lista.filter(a => a.clase === 'riesgo');
    const medios = lista.filter(a => a.clase === 'alerta');
    const clase = graves.length ? 'riesgo' : (medios.length ? 'alerta' : 'ok');
    const titulo = graves.length || medios.length
      ? `${graves.length ? `${graves.length} ${graves.length === 1 ? 'cuidado' : 'cuidados'}` : ''}${graves.length && medios.length ? ' y ' : ''}${medios.length ? `${medios.length} ${medios.length === 1 ? 'aviso' : 'avisos'}` : ''} en su lote`
      : 'Su lote no tiene advertencias importantes';
    const lista3 = graves.concat(medios).slice(0, 3)
      .map(a => `<li><i data-lucide="${a.icono}" class="icono" aria-hidden="true"></i> ${esc(a.titulo)}</li>`).join('');
    return `
      <span class="resumen-cabeza ${clase}">
        <span class="resumen-semaforo" aria-hidden="true"></span>
        <strong>${titulo}</strong>
      </span>
      ${lista3 ? `<ul class="resumen-lista">${lista3}</ul>` : ''}
      <span class="resumen-accion">Ver qué hacer →</span>`;
  }

  /**
   * Advertencias en formato lista + detalle: a la izquierda un botón por advertencia,
   * a la derecha el porqué y las acciones de la elegida. Todo cabe en una pantalla.
   */
  function listaDetalleAdvertencias(lista) {
    const orden = { riesgo: 0, alerta: 1, info: 2, ok: 3 };
    const nivel = { riesgo: 'Cuidado', alerta: 'Atención', info: 'Dato', ok: 'Bien' };
    const items = lista.slice().sort((a, b) => orden[a.clase] - orden[b.clase]);
    if (!items.length) return '<p class="cal-ayuda">Sin advertencias para este lote.</p>';
    const botones = items.map((a, i) => `
      <button type="button" class="aviso-md-btn ${a.clase}${i === 0 ? ' activo' : ''}" role="tab"
              id="aviso-tab-${i}" aria-controls="aviso-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
        <i data-lucide="${a.icono}" class="icono aviso-md-ico" aria-hidden="true"></i>
        <span class="aviso-md-txt"><span class="aviso-nivel">${nivel[a.clase]}</span><strong>${esc(a.titulo)}</strong></span>
      </button>`).join('');
    const paneles = items.map((a, i) => `
      <div class="aviso-md-panel aviso-agro ${a.clase}" role="tabpanel" id="aviso-panel-${i}" aria-labelledby="aviso-tab-${i}"${i === 0 ? '' : ' hidden'}>
        <div class="aviso-cabeza">
          <i data-lucide="${a.icono}" class="icono aviso-ico" aria-hidden="true"></i>
          <div class="aviso-titulos"><span class="aviso-nivel">${nivel[a.clase]}</span><strong>${esc(a.titulo)}</strong></div>
        </div>
        ${a.porque ? `<p class="aviso-porque">${esc(a.porque)}</p>` : ''}
        ${a.tecnico ? `<p class="aviso-tecnico solo-tecnico"><i data-lucide="ruler" class="icono" aria-hidden="true"></i> ${esc(a.tecnico)}</p>` : ''}
        ${a.acciones.length ? `
          <div class="aviso-acciones aviso-acciones-fijas">
            <p class="aviso-acciones-titulo"><i data-lucide="list-checks" class="icono" aria-hidden="true"></i> ¿Qué puede hacer?</p>
            <ul>${a.acciones.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>` : '<p class="aviso-porque">No necesita hacer nada especial.</p>'}
      </div>`).join('');
    return `<div class="avisos-md">
      <div class="avisos-md-lista" role="tablist" aria-orientation="vertical" aria-label="Advertencias">${botones}</div>
      <div class="avisos-md-detalle">${paneles}</div>
    </div>`;
  }

  function activarListaDetalle(raiz) {
    const btns = Array.from(raiz.querySelectorAll('.aviso-md-btn'));
    const elegir = b => btns.forEach(x => {
      const on = x === b;
      x.classList.toggle('activo', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      const pn = raiz.querySelector('#' + x.getAttribute('aria-controls'));
      if (pn) pn.hidden = !on;
    });
    btns.forEach((b, i) => {
      b.addEventListener('click', () => elegir(b));
      b.addEventListener('keydown', e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const sig = btns[(i + d + btns.length) % btns.length];
        sig.focus(); elegir(sig);
      });
    });
  }

  function tarjetasAdvertencias(lista, opciones) {
    const abrirTodo = Boolean(opciones && opciones.abrir);
    const orden = { riesgo: 0, alerta: 1, info: 2, ok: 3 };
    const nivel = { riesgo: 'Cuidado', alerta: 'Atención', info: 'Dato', ok: 'Bien' };
    return lista.slice().sort((a, b) => orden[a.clase] - orden[b.clase]).map(a => `
      <div class="aviso-agro ${a.clase}">
        <div class="aviso-cabeza">
          <i data-lucide="${a.icono}" class="icono aviso-ico" aria-hidden="true"></i>
          <div class="aviso-titulos">
            <span class="aviso-nivel">${nivel[a.clase]}</span>
            <strong>${esc(a.titulo)}</strong>
          </div>
        </div>
        ${a.porque ? `<p class="aviso-porque">${esc(a.porque)}</p>` : ''}
        ${a.tecnico ? `<p class="aviso-tecnico solo-tecnico"><i data-lucide="ruler" class="icono" aria-hidden="true"></i> ${esc(a.tecnico)}</p>` : ''}
        ${a.acciones.length ? `
          <details class="aviso-acciones" ${a.clase === 'riesgo' || (abrirTodo && a.clase === 'alerta') ? 'open' : ''}>
            <summary><i data-lucide="list-checks" class="icono" aria-hidden="true"></i> ¿Qué puede hacer?</summary>
            <ul>${a.acciones.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          </details>` : ''}
      </div>`).join('');
  }

  // ---------------------------------------------------------------------------
  // 3. ¿Qué puede hacer? — cultivos descartados
  // ---------------------------------------------------------------------------

  function remediosVeto(razones, cultivo, aptos) {
    const texto = (razones || []).join(' ');
    const sugeridos = (aptos || []).slice(0, 4).map(c => c.nombre).join(', ');
    const acc = [];
    let motivo = null; // el primer motivo encontrado manda (altura > pendiente > helada > pausa)
    if (/Altitud fuera de rango/i.test(texto)) {
      motivo = motivo || 'No se da a esta altura';
      acc.push(`La altura no se puede cambiar. Mejor siembre algo que sí se da aquí${sugeridos ? `: ${sugeridos}` : ''}.`);
      acc.push('Pregunte en INIAP o al técnico por variedades adaptadas a su zona.');
    }
    if (/erosión|pendiente/i.test(texto)) {
      motivo = motivo || 'Terreno muy empinado';
      acc.push('Si hace terrazas o zanjas de infiltración, podrá trabajar el suelo con menos riesgo.');
      acc.push('Mientras tanto, siembre cultivos que cubren el suelo (avena con vicia, chocho, quinua).');
    }
    if (/helada/i.test(texto)) {
      motivo = motivo || 'Se quema con la helada';
      acc.push(`Cambie la fecha de siembra para que ${cultivo.nombre.toLowerCase()} no florezca en los meses de helada.`);
      acc.push('Busque una variedad resistente al frío o siembre en la parte baja y protegida del lote.');
    }
    const pausa = texto.match(/requiere (\d+) años de descanso|pausa mínima: (\d+) años/i);
    if (/Pausa fitosanitaria|plagas del suelo|No recomendamos/i.test(texto)) {
      motivo = motivo || 'La tierra necesita descansar de esta familia';
      const n = pausa ? (pausa[1] || pausa[2]) : null;
      acc.push(`Espere${n ? ` ${n} años` : ''} antes de volver a sembrar ${cultivo.familia.toLowerCase()} en este lote.`);
      acc.push('Mientras tanto siembre una leguminosa (haba, chocho, arveja) o un cereal: cortan el ciclo de las plagas.');
      acc.push('Arranque las plantas que rebrotan solas (papas "huachas"): ahí se esconden plagas y lancha.');
      acc.push('Cuando vuelva a sembrar, use semilla sana o certificada.');
    } else if (/repetir/i.test(texto)) {
      motivo = motivo || 'No repita el mismo cultivo';
      acc.push('Alterne con un cultivo de otra familia este año y vuelva a sembrarlo después.');
    }
    if (!acc.length) acc.push('Consulte con el técnico de su zona antes de sembrarlo.');
    return { motivo: motivo || 'No conviene este año', acciones: acc };
  }

  // ---------------------------------------------------------------------------
  // 4. Lectura en voz alta
  // ---------------------------------------------------------------------------

  let vozEs = null;
  function elegirVoz() {
    if (!('speechSynthesis' in window)) return null;
    const voces = window.speechSynthesis.getVoices() || [];
    vozEs = voces.find(v => /es[-_]EC/i.test(v.lang)) || voces.find(v => /es[-_](419|MX|CO|PE|US)/i.test(v.lang))
      || voces.find(v => /^es/i.test(v.lang)) || null;
    return vozEs;
  }
  if ('speechSynthesis' in window) {
    elegirVoz();
    window.speechSynthesis.onvoiceschanged = elegirVoz;
  }

  function puedeHablar() { return 'speechSynthesis' in window; }

  function leer(texto, boton) {
    if (!puedeHablar()) return false;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      document.querySelectorAll('.btn-escuchar.hablando').forEach(b => b.classList.remove('hablando'));
      if (boton && boton.dataset.leyendo === '1') { boton.dataset.leyendo = '0'; return true; }
    }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = (vozEs && vozEs.lang) || 'es-EC';
    if (vozEs) u.voice = vozEs;
    u.rate = 0.92;
    if (boton) {
      boton.classList.add('hablando'); boton.dataset.leyendo = '1';
      u.onend = u.onerror = () => { boton.classList.remove('hablando'); boton.dataset.leyendo = '0'; };
    }
    synth.speak(u);
    return true;
  }

  function textoAdvertencias(lista) {
    const graves = lista.filter(a => a.clase === 'riesgo' || a.clase === 'alerta');
    if (!graves.length) return 'Su lote no tiene advertencias importantes.';
    return graves.map(a => `${a.titulo}. ${a.porque} Qué puede hacer: ${a.acciones.join(' ')}`).join(' ');
  }


  // ---------------------------------------------------------------------------
  // 5. ¿Cuándo sembrar? — calendario de 12 meses con el clima de NASA POWER
  // ---------------------------------------------------------------------------

  const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const GRANOS_SECOS = ['cebada', 'trigo', 'quinua', 'maiz_suave', 'maiz_duro', 'frejol_arbustivo', 'chocho', 'soya', 'mani', 'arroz'];

  /**
   * Evalúa sembrar `cultivo` en cada mes del año con la climatología mensual del lote.
   * Agua: lluvia efectiva (80 %) frente a ETc = Kc·ET0 en cada mes del ciclo.
   * Helada: Tmin absoluta < 0 °C en el ciclo (si no tolera) o en floración (si tolera a medias).
   * Cosecha: lluvia > 1,5·ET0 en el mes de cosecha de granos secos (el grano se pudre o germina).
   * conRiego: si el agricultor tiene riego, el déficit de agua baja de "evitar" a "con riego".
   */
  function calendarioSiembra(cultivo, parcela, opciones) {
    const clima = parcela.clima_mensual || [];
    if (clima.length !== 12) return null;
    const factor = 1 + ((opciones && opciones.escenarioLluviaPct) || 0) / 100;
    const conRiego = Boolean(opciones && opciones.conRiego);
    const n = Math.max(1, Math.round(cultivo.ciclo_meses || 5));
    const kc = cultivo.kc || [0.5, 1.05, 0.7];
    const tolera = String(cultivo.tolera_helada || 'No');
    const res = [];
    for (let inicio = 1; inicio <= 12; inicio++) {
      let etc = 0, cubierto = 0, heladaGrave = false, heladaFlor = false;
      const meses = [];
      for (let i = 0; i < n; i++) {
        const m = ((inicio - 1 + i) % 12) + 1;
        const c = clima[m - 1];
        meses.push(m);
        const fr = n === 1 ? 0.5 : i / (n - 1);
        const k = fr < 0.25 ? kc[0] : (fr <= 0.75 ? kc[1] : kc[2]);
        const dem = k * c.ET0_mm;
        const pef = 0.8 * c.P_mm * factor;
        etc += dem;
        cubierto += Math.min(pef, dem);
        if (c.Tmin_abs < 0) {
          if (tolera === 'No') heladaGrave = true;
          else if (tolera === 'Moderada' && fr >= 0.35 && fr <= 0.8) heladaFlor = true;
        }
      }
      const cob = etc > 0 ? Math.round(100 * cubierto / etc) : 100;
      const cSiembra = clima[inicio - 1];
      const secoAlSembrar = cSiembra.P_mm * factor < 0.4 * cSiembra.ET0_mm;
      const mCosecha = meses[meses.length - 1];
      const cCosecha = clima[mCosecha - 1];
      const cosechaMojada = GRANOS_SECOS.includes(cultivo.id) && cCosecha.P_mm * factor > 1.5 * cCosecha.ET0_mm;

      let nivel = 'ok';
      const motivos = [];
      if (heladaGrave) { nivel = 'riesgo'; motivos.push('helada durante el cultivo'); }
      if (heladaFlor) { nivel = nivel === 'ok' ? 'alerta' : nivel; motivos.push('helada en la floración'); }
      if (cob < 55) {
        if (conRiego) { nivel = nivel === 'ok' ? 'alerta' : nivel; motivos.push(`necesita riego (lluvia cubre ${cob} %)`); }
        else { nivel = 'riesgo'; motivos.push(`muy seco (lluvia cubre ${cob} %)`); }
      } else if (cob < 75) {
        nivel = nivel === 'ok' ? 'alerta' : nivel; motivos.push(`algo seco (lluvia cubre ${cob} %)`);
      }
      if (secoAlSembrar && !conRiego) { nivel = nivel === 'ok' ? 'alerta' : nivel; motivos.push('suelo seco para germinar'); }
      if (cosechaMojada) { nivel = nivel === 'ok' ? 'alerta' : nivel; motivos.push(`cosecha con mucha lluvia en ${MESES_LARGOS[mCosecha - 1]}`); }
      if (!motivos.length) motivos.push(`buena lluvia (cubre ${Math.min(cob, 100)} %) y sin heladas`);
      res.push({ mes: inicio, nivel, cobertura: cob, cosecha: mCosecha, motivo: motivos.join('; ') });
    }
    return res;
  }

  /** Meses recomendados (los "ok" con mayor cobertura de lluvia). */
  function mejoresMeses(cal, max) {
    if (!cal) return [];
    const orden = { ok: 0, alerta: 1, riesgo: 2 };
    return cal.slice().sort((a, b) => (orden[a.nivel] - orden[b.nivel]) || (b.cobertura - a.cobertura))
      .filter(x => x.nivel !== 'riesgo').slice(0, max || 2);
  }

  function filaCalendario(cultivo, cal) {
    const mejores = mejoresMeses(cal, 2);
    const resumen = mejores.length
      ? `Mejor: <b>${mejores.map(x => MESES_LARGOS[x.mes - 1]).join(' o ')}</b> · cosecha en ${MESES_LARGOS[mejores[0].cosecha - 1]}`
      : '<b>Ningún mes es seguro sin riego</b>';
    const etiqueta = { ok: 'buen mes', alerta: 'posible con cuidado', riesgo: 'evitar' };
    const celdas = cal.map(x => `
      <span class="cal-celda ${x.nivel}" title="${MESES_LARGOS[x.mes - 1]}: ${etiqueta[x.nivel]} — ${esc(x.motivo)}"
            aria-label="Sembrar en ${MESES_LARGOS[x.mes - 1]}: ${etiqueta[x.nivel]}, ${esc(x.motivo)}" role="img">
        <span class="cal-mes">${MESES_CORTOS[x.mes - 1].charAt(0)}</span>
        <span class="cal-pct solo-tecnico">${Math.min(x.cobertura, 999)}%</span>
      </span>`).join('');
    return `
      <div class="cal-fila">
        <div class="cal-nombre"><strong>${esc(cultivo.nombre)}</strong><span>${resumen}</span></div>
        <div class="cal-celdas">${celdas}</div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // 6. Compartir por WhatsApp
  // ---------------------------------------------------------------------------

  function textoPlanWhatsApp({ parcela, rot, areaHa, opciones, avisos }) {
    const lineas = [];
    lineas.push(`🌱 *Plan de siembra RotaSat* — ${parcela.nombre || 'mi lote'} (${areaHa} ha, ${parcela.terreno?.elev_m ?? '?'} m)`);
    lineas.push('');
    lineas.push(`*${rot.esActual ? 'Práctica actual' : rot.titulo.replace(/^Estrategia\s+(\d+)/i, 'Opción $1')}* · puntaje ${rot.irrPct}/100`);
    rot.cultivos.forEach((c, i) => {
      const mej = mejoresMeses(calendarioSiembra(c, parcela, opciones), 1)[0];
      lineas.push(`• Año ${i + 1}: *${c.nombre}*${mej ? ` — sembrar en ${MESES_LARGOS[mej.mes - 1]}` : ''}`);
    });
    lineas.push('');
    lineas.push(`💰 Ganancia estimada: ~$${Math.round(rot.detalles.rentabilidad.margenAnualPromedioUsdHa * areaHa)} al año (precios MAG-SIPA)`);
    lineas.push(`💧 La lluvia cubre el ${rot.balanceHidrico.coberturaAguaPct} % del agua que necesita`);
    const graves = (avisos || []).filter(a => a.clase === 'riesgo' || a.clase === 'alerta').slice(0, 3);
    if (graves.length) {
      lineas.push('');
      lineas.push('⚠️ *Cuidados:*');
      graves.forEach(a => lineas.push(`• ${a.titulo}: ${a.acciones[0] || a.porque}`));
    }
    lineas.push('');
    lineas.push('Datos: NASA POWER, SRTM y satélites HLS + ISRIC SoilGrids. Confirme con el técnico de su zona.');
    return lineas.join('\n');
  }

  function enlaceWhatsApp(texto) {
    return 'https://wa.me/?text=' + encodeURIComponent(texto);
  }

  // ---------------------------------------------------------------------------
  // 7. Tabla técnica: climatología mensual NASA POWER del lote
  // ---------------------------------------------------------------------------
  function tablaClimaTecnica(parcela, opciones) {
    const cl = parcela.clima_mensual || [];
    if (cl.length !== 12) return '<p class="cal-ayuda">Sin climatología mensual para este lote.</p>';
    const f = 1 + ((opciones && opciones.escenarioLluviaPct) || 0) / 100;
    const extra = cl.every(m => m.Rs_MJ !== undefined);
    const tot = k => cl.reduce((a, m) => a + m[k], 0);
    const fila = m => {
      const p = m.P_mm * f, bal = p - m.ET0_mm;
      return `<tr>
        <th scope="row">${m.nombre_mes}</th>
        <td>${p.toFixed(0)}</td><td>${m.ET0_mm.toFixed(0)}</td>
        <td class="${bal < 0 ? 'neg' : 'pos'}">${bal >= 0 ? '+' : ''}${bal.toFixed(0)}</td>
        <td>${m.Tmed.toFixed(1)}</td><td class="${m.Tmin_abs < 0 ? 'neg' : (m.Tmin_abs < 2 ? 'aviso' : '')}">${m.Tmin_abs.toFixed(1)}</td>
        ${extra ? `<td>${m.Rs_MJ.toFixed(1)}</td><td>${m.Viento_ms.toFixed(1)}</td><td>${m.HR_pct}</td>` : ''}
      </tr>`;
    };
    const est = parcela.estado_datos || {};
    return `
      <div class="tabla-scroll">
        <table class="tabla-clima tabular-nums">
          <thead><tr>
            <th scope="col">Mes</th><th scope="col">P (mm)</th><th scope="col">ET₀ (mm)</th><th scope="col">P − ET₀</th>
            <th scope="col">Tmed (°C)</th><th scope="col">Tmin abs (°C)</th>
            ${extra ? '<th scope="col">Rs (MJ/m²·d)</th><th scope="col">Viento 2 m (m/s)</th><th scope="col">HR (%)</th>' : ''}
          </tr></thead>
          <tbody>${cl.map(fila).join('')}</tbody>
          <tfoot><tr>
            <th scope="row">Año</th><td>${(tot('P_mm') * f).toFixed(0)}</td><td>${tot('ET0_mm').toFixed(0)}</td>
            <td>${(tot('P_mm') * f - tot('ET0_mm')).toFixed(0)}</td><td colspan="${extra ? 5 : 2}"></td>
          </tr></tfoot>
        </table>
      </div>
      <p class="tabla-nota">Fuente: ${esc(est.clima || 'NASA POWER')} · ET₀: ${esc(parcela.clima_metodo_et0 || 'Hargreaves FAO-56')}${f !== 1 ? ` · escenario de lluvia ${f > 1 ? '+' : ''}${Math.round((f - 1) * 100)} %` : ''}.</p>`;
  }

  window.AyudaAgricultor = {
    barra, circulo, medidoresLote, advertenciasLote, tarjetasAdvertencias, resumenRiesgos, listaDetalleAdvertencias, activarListaDetalle,
    remediosVeto, leer, puedeHablar, textoAdvertencias,
    calendarioSiembra, mejoresMeses, filaCalendario, esParcelaSatelital, textoPlanWhatsApp, enlaceWhatsApp, MESES_LARGOS, tablaClimaTecnica
  };
})();
