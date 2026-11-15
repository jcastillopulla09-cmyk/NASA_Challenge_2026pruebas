// datos_embebidos.js — Generado automáticamente desde data/cultivos.json y data/parcelas/*.json
// Garantiza que la demo funcione tanto en servidor como abriendo index.html sin internet.
window.CATALOGO_CULTIVOS = {
  "meta": {
    "version": "1.0.0",
    "fuentes": [
      "FAO-56 (Evapotranspiración del cultivo y coeficientes Kc)",
      "INIAP Ecuador (Guías técnicas de cultivos para Sierra y Costa: Estaciones Santa Catalina y Boliche)",
      "MAG-SIPA Ecuador (Precios referenciales y márgenes brutos aproximados por hectárea)",
      "SIPA-MAG, boletín de precios al productor dic 2025; ESPAC (INEC) 2024–2025 para rendimientos"
    ],
    "unidades": {
      "altitud": "m s.n.m.",
      "ciclo": "días",
      "residuo": "t MS/ha (toneladas de materia seca por hectárea)",
      "credito_n": "kg N/ha dejados para el cultivo siguiente",
      "extraccion_n": "kg N/ha extraídos por cosecha",
      "margen_usd_ha": "USD/ha: rendimiento_t_ha × precio_usd_t − costo_usd_ha (ver campo fuente de cada cultivo)"
    }
  },
  "pausas_familia": {
    "Solanáceas": {
      "anios_min": 3,
      "anios_nematodo": 4,
      "razon": "Globodera pallida (nematodo del quiste), Phytophthora infestans (lancha) y Rhizoctonia solani persisten en el suelo.",
      "mensaje_agricultor": "las plagas del suelo (nematodos y lancha) siguen vivas varios años después de sembrar papa o tomate."
    },
    "Brasicáceas": {
      "anios_min": 4,
      "anios_nematodo": 4,
      "razon": "Plasmodiophora brassicae (hernia de las crucíferas) persiste por años en el suelo.",
      "mensaje_agricultor": "la hernia de la col queda en la tierra hasta por 4 años si se repite brócoli o col."
    },
    "Apiáceas": {
      "anios_min": 3,
      "anios_nematodo": 3,
      "razon": "Alternaria dauci y nematodos agalladores (Meloidogyne).",
      "mensaje_agricultor": "repetir zanahoria multiplica las enfermedades de la raíz y manchas de la hoja."
    },
    "Amarilidáceas": {
      "anios_min": 3,
      "anios_nematodo": 3,
      "razon": "Sclerotium cepivorum (pudrición blanca de la cebolla).",
      "mensaje_agricultor": "el hongo de la pudrición blanca de la cebolla sobrevive 3 años en el lote."
    },
    "Cucurbitáceas": {
      "anios_min": 3,
      "anios_nematodo": 3,
      "razon": "Fusarium oxysporum y complejos virales transmitidos en rastrojo.",
      "mensaje_agricultor": "el hongo que marchita la sandía y el melón permanece activo en el suelo."
    },
    "Fabáceas": {
      "anios_min": 2,
      "anios_nematodo": 2,
      "razon": "Fusarium, Sclerotinia; además se pierde el beneficio de fijación biológica de nitrógeno si se repite seguido.",
      "mensaje_agricultor": "sembrar leguminosas dos años seguidos atrae hongos de raíz y desaprovecha el abono natural que dejaron."
    },
    "Amarantáceas": {
      "anios_min": 2,
      "anios_nematodo": 2,
      "razon": "Peronospora variabilis (mildiu de la quinua).",
      "mensaje_agricultor": "el mildiu de la quinua queda en los rastrojos si se siembra dos años seguidos."
    },
    "Euforbiáceas": {
      "anios_min": 2,
      "anios_nematodo": 2,
      "razon": "Xanthomonas axonopodis (bacteriosis vascular de la yuca) y agotamiento de potasio.",
      "mensaje_agricultor": "repetir yuca agota los nutrientes profundos y propaga la bacteriosis."
    },
    "Poáceas": {
      "anios_min": 1,
      "anios_nematodo": 1,
      "razon": "Baja presión fitosanitaria entre especies distintas; se permite repetir familia una vez con penalización C/N, nunca la misma especie dos veces seguidas.",
      "mensaje_agricultor": "dos cereales de la misma especie seguidos inmovilizan el nitrógeno y empobrecen el suelo."
    },
    "Arroz": {
      "anios_min": 1,
      "anios_nematodo": 1,
      "razon": "Monocultivo frecuente (Pyricularia y malezas resistentes); se penaliza repetir sin rotar con leguminosa.",
      "mensaje_agricultor": "repetir arroz sin rotar con soya o caupí compacta el suelo y multiplica malezas."
    }
  },
  "cultivos": [
    {
      "id": "papa",
      "nombre": "Papa",
      "icono": "🥔",
      "familia": "Solanáceas",
      "raiz_tipo": "Fasciculada, superficial",
      "raiz_estructura": "fasciculada_superficial",
      "alt_min": 2600,
      "alt_max": 3800,
      "ciclo_dias": [
        120,
        150
      ],
      "ciclo_meses": 5,
      "kc": [
        0.5,
        1.15,
        0.75
      ],
      "residuo_t_ha": 1.5,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 120,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "No",
      "permite_pendiente_alta": false,
      "labranza_intensiva": true,
      "es_forrajero": false,
      "rendimiento_qq_ha": 298,
      "margen_usd_ha": 1436,
      "rol_ecologico": "Tubérculo comercial (alta exigencia de suelo)",
      "explicacion_suelo": "Genera buen ingreso pero remueve intensamente el suelo; requiere descanso de 3–4 años para evitar nematodos y lancha.",
      "precio_usd_t": 407,
      "rendimiento_t_ha": 13.5,
      "costo_usd_ha": 4058,
      "estado_economico": "oficial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (papa superchola, 18,47 USD/qq) | Rendimiento: ESPAC 2025 (INEC) | Costo: estimado (costo implícito en el margen anterior del equipo)"
    },
    {
      "id": "maiz_suave",
      "nombre": "Maíz suave (choclo)",
      "icono": "🌽",
      "familia": "Poáceas",
      "raiz_tipo": "Fasciculada, profunda",
      "raiz_estructura": "fasciculada_profunda",
      "alt_min": 2200,
      "alt_max": 3000,
      "ciclo_dias": [
        180,
        240
      ],
      "ciclo_meses": 7,
      "kc": [
        0.3,
        1.15,
        1.05
      ],
      "residuo_t_ha": 6.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1"
      ],
      "tolera_helada": "No",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 110,
      "margen_usd_ha": 1350,
      "rol_ecologico": "Alto aporte de rastrojo y carbono",
      "explicacion_suelo": "Sus raíces profundas exploran el subsuelo y deja 6 t/ha de caña que protegen la tierra o sirven de forraje.",
      "precio_usd_t": 570,
      "rendimiento_t_ha": 4.99,
      "costo_usd_ha": 1494,
      "estado_economico": "parcial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (choclo, 20,67 USD/saco de 80 lb) | Rendimiento: estimado | Costo: estimado (costo implícito en el margen anterior del equipo)"
    },
    {
      "id": "cebada",
      "nombre": "Cebada",
      "icono": "🌾",
      "familia": "Poáceas",
      "raiz_tipo": "Fasciculada",
      "raiz_estructura": "fasciculada_media",
      "alt_min": 2600,
      "alt_max": 3600,
      "ciclo_dias": [
        150,
        180
      ],
      "ciclo_meses": 5,
      "kc": [
        0.3,
        1.15,
        0.25
      ],
      "residuo_t_ha": 4.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": true,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 48,
      "margen_usd_ha": 780,
      "rol_ecologico": "Cereal rústico tolerante a sequía y heladas",
      "explicacion_suelo": "Cubre rápido las laderas contra la erosión, resiste heladas y aprovecha muy bien el nitrógeno dejado por el chocho o el haba.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo: el boletín oficial SIPA-MAG de precios al productor no publica este cultivo; validar con la asociación o feria local"
    },
    {
      "id": "trigo",
      "nombre": "Trigo",
      "icono": "🌾",
      "familia": "Poáceas",
      "raiz_tipo": "Fasciculada",
      "raiz_estructura": "fasciculada_media",
      "alt_min": 2400,
      "alt_max": 3200,
      "ciclo_dias": [
        150,
        180
      ],
      "ciclo_meses": 6,
      "kc": [
        0.3,
        1.15,
        0.25
      ],
      "residuo_t_ha": 4.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 37,
      "margen_usd_ha": 605,
      "rol_ecologico": "Formador de materia orgánica estable",
      "explicacion_suelo": "Deja 4 t/ha de paja con alta relación carbono/nitrógeno que forma humus duradero cuando sigue a una leguminosa.",
      "precio_usd_t": null,
      "rendimiento_t_ha": 1.7,
      "costo_usd_ha": null,
      "estado_economico": "parcial",
      "fuente": "Precio: estimado | Rendimiento: Promedio nacional (dato del equipo) | Costo: estimado"
    },
    {
      "id": "quinua",
      "nombre": "Quinua",
      "icono": "🌿",
      "familia": "Amarantáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 2600,
      "alt_max": 3600,
      "ciclo_dias": [
        150,
        180
      ],
      "ciclo_meses": 6,
      "kc": [
        0.5,
        1.0,
        0.7
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.2,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": true,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 38,
      "margen_usd_ha": 1420,
      "rol_ecologico": "Tolerante a sequía, heladas y suelos andinos",
      "explicacion_suelo": "Con bajo requerimiento hídrico (Kc medio 1.00) y raíz pivotante, rompe el ciclo de plagas de cereales y papa.",
      "estado_economico": "parcial",
      "fuente": "Rendimiento: 0,61 t/ha en Chimborazo, Ministerio de Agricultura y Ganadería 2019 (citado en Castro-Albán et al., Agronomía Mesoamericana 2023) | Precio y costo: estimados por el equipo (no figuran en el boletín SIPA de precios al productor)",
      "rendimiento_t_ha": 0.61
    },
    {
      "id": "chocho",
      "nombre": "Chocho (tarwi)",
      "icono": "🫘",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante, profunda",
      "raiz_estructura": "pivotante_profunda",
      "alt_min": 2600,
      "alt_max": 3600,
      "ciclo_dias": [
        180,
        240
      ],
      "ciclo_meses": 7,
      "kc": [
        0.4,
        1.0,
        0.5
      ],
      "residuo_t_ha": 3.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 50,
      "extraccion_n_kg": 0,
      "siembra": [
        "S1"
      ],
      "tolera_helada": "Moderada",
      "permite_pendiente_alta": true,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 32,
      "margen_usd_ha": 1280,
      "rol_ecologico": "Fijador de Nitrógeno (+50 kg/ha) y raíz descompactadora",
      "explicacion_suelo": "Su raíz pivotante profunda rompe capas duras, fija 50 kg N/ha gratis del aire y sus alcaloides reducen nematodos del suelo.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo: el boletín oficial SIPA-MAG de precios al productor no publica este cultivo; validar con la asociación o feria local"
    },
    {
      "id": "haba",
      "nombre": "Haba",
      "icono": "🫛",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 2600,
      "alt_max": 3600,
      "ciclo_dias": [
        150,
        180
      ],
      "ciclo_meses": 6,
      "kc": [
        0.5,
        1.15,
        1.1
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 40,
      "extraccion_n_kg": 0,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 65,
      "margen_usd_ha": 1320,
      "rol_ecologico": "Fijador de Nitrógeno (+40 kg/ha) tolerante al frío",
      "explicacion_suelo": "Enriquece el suelo con 40 kg N/ha de rápida liberación (baja relación C/N) ideal antes de sembrar cebada, trigo o quinua.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo: el boletín oficial SIPA-MAG de precios al productor no publica este cultivo; validar con la asociación o feria local"
    },
    {
      "id": "arveja",
      "nombre": "Arveja",
      "icono": "🫛",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 2400,
      "alt_max": 3200,
      "ciclo_dias": [
        90,
        120
      ],
      "ciclo_meses": 4,
      "kc": [
        0.5,
        1.15,
        1.1
      ],
      "residuo_t_ha": 1.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 25,
      "extraccion_n_kg": 0,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Moderada",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 55,
      "margen_usd_ha": 1176,
      "rol_ecologico": "Leguminosa de ciclo corto (+25 kg N/ha)",
      "explicacion_suelo": "Cosecha en 3–4 meses ahorrando agua en campañas cortas y dejando +25 kg N/ha disponibles.",
      "precio_usd_t": 772,
      "rendimiento_t_ha": 2.49,
      "costo_usd_ha": 746,
      "estado_economico": "parcial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (arveja tierna, 38,50 USD/bulto de 110 lb) | Rendimiento: estimado | Costo: estimado (costo implícito en el margen anterior del equipo)"
    },
    {
      "id": "frejol_arbustivo",
      "nombre": "Fréjol arbustivo",
      "icono": "🫘",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 1200,
      "alt_max": 2800,
      "ciclo_dias": [
        90,
        110
      ],
      "ciclo_meses": 4,
      "kc": [
        0.4,
        1.15,
        0.35
      ],
      "residuo_t_ha": 1.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 25,
      "extraccion_n_kg": 0,
      "siembra": [
        "S2",
        "C1"
      ],
      "tolera_helada": "No",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 35,
      "margen_usd_ha": 1150,
      "rol_ecologico": "Fijador rápido de Nitrógeno (+25 kg/ha)",
      "explicacion_suelo": "Ideal para valles interandinos; aporta nitrógeno y requiere poca agua al final de su ciclo (Kc 0.35).",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "brocoli",
      "nombre": "Brócoli / col",
      "icono": "🥦",
      "familia": "Brasicáceas",
      "raiz_tipo": "Pivotante, superficial",
      "raiz_estructura": "pivotante_superficial",
      "alt_min": 2400,
      "alt_max": 3200,
      "ciclo_dias": [
        90,
        120
      ],
      "ciclo_meses": 4,
      "kc": [
        0.7,
        1.05,
        0.95
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Moderada",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 280,
      "margen_usd_ha": 1750,
      "rol_ecologico": "Biofumigante natural (glucosinolatos)",
      "explicacion_suelo": "Sus residuos ayudan a reducir hongos de la papa, pero exige 4 años de pausa para evitar la hernia de las coles.",
      "estado_economico": "parcial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (brócoli, 0,32 USD/kg; sipa.agricultura.gob.ec) | Rendimiento y costo: estimados por el equipo",
      "precio_usd_t": 320
    },
    {
      "id": "zanahoria",
      "nombre": "Zanahoria",
      "icono": "🥕",
      "familia": "Apiáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 2200,
      "alt_max": 3200,
      "ciclo_dias": [
        100,
        150
      ],
      "ciclo_meses": 5,
      "kc": [
        0.7,
        1.05,
        0.95
      ],
      "residuo_t_ha": 1.0,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Moderada",
      "permite_pendiente_alta": false,
      "labranza_intensiva": true,
      "es_forrajero": false,
      "rendimiento_qq_ha": 350,
      "margen_usd_ha": 1620,
      "rol_ecologico": "Hortaliza de raíz (alternativa comercial a la papa)",
      "explicacion_suelo": "Rompe ciclos de plagas de Solanáceas y Poáceas, pero deja poco rastrojo y no debe sembrarse en pendientes > 25 %.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "cebolla",
      "nombre": "Cebolla",
      "icono": "🧅",
      "familia": "Amarilidáceas",
      "raiz_tipo": "Fasciculada, superficial",
      "raiz_estructura": "fasciculada_superficial",
      "alt_min": 2000,
      "alt_max": 3200,
      "ciclo_dias": [
        120,
        150
      ],
      "ciclo_meses": 5,
      "kc": [
        0.7,
        1.05,
        0.75
      ],
      "residuo_t_ha": 0.8,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Moderada",
      "permite_pendiente_alta": false,
      "labranza_intensiva": true,
      "es_forrajero": false,
      "rendimiento_qq_ha": 310,
      "margen_usd_ha": 1680,
      "rol_ecologico": "Hortaliza de alto valor comercial",
      "explicacion_suelo": "Sus compuestos azufrados reducen ciertos patógenos, pero aporta muy poca cobertura orgánica al suelo.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "avena_forrajera",
      "nombre": "Avena forrajera (cobertura)",
      "icono": "🌱",
      "familia": "Poáceas",
      "raiz_tipo": "Fasciculada",
      "raiz_estructura": "fasciculada_media",
      "alt_min": 2400,
      "alt_max": 3600,
      "ciclo_dias": [
        90,
        120
      ],
      "ciclo_meses": 4,
      "kc": [
        0.3,
        1.15,
        0.3
      ],
      "residuo_t_ha": 5.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 60,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": true,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 420,
      "margen_usd_ha": 920,
      "rol_ecologico": "Cobertura antierosión y alto valor forrajero",
      "explicacion_suelo": "Amarra el suelo en laderas pronunciadas (> 25 %), aporta 5 t/ha de biomasa y alimenta al ganado en época seca.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "vicia",
      "nombre": "Vicia (abono verde)",
      "icono": "🍀",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 2400,
      "alt_max": 3600,
      "ciclo_dias": [
        90,
        120
      ],
      "ciclo_meses": 4,
      "kc": [
        0.4,
        1.0,
        0.9
      ],
      "residuo_t_ha": 4.0,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 70,
      "extraccion_n_kg": 0,
      "siembra": [
        "S1",
        "S2"
      ],
      "tolera_helada": "Sí",
      "permite_pendiente_alta": true,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 360,
      "margen_usd_ha": 890,
      "rol_ecologico": "Abono verde estrella (+70 kg N/ha y cobertura total)",
      "explicacion_suelo": "Incorporada al suelo inyecta 70 kg N/ha y 1 t/ha de humus estable, regenerando lotes agotados por monocultivo.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "arroz",
      "nombre": "Arroz",
      "icono": "🌾",
      "familia": "Arroz",
      "raiz_tipo": "Fasciculada",
      "raiz_estructura": "fasciculada_superficial",
      "alt_min": 0,
      "alt_max": 1200,
      "ciclo_dias": [
        120,
        150
      ],
      "ciclo_meses": 5,
      "kc": [
        1.05,
        1.2,
        0.9
      ],
      "residuo_t_ha": 5.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 110,
      "siembra": [
        "C1",
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 123,
      "margen_usd_ha": -468,
      "rol_ecologico": "Cereal de alta demanda hídrica (zonas bajas)",
      "explicacion_suelo": "Aporta abundante tamo (5 t/ha), pero su alta demanda de agua exige rotarlo con soya o caupí en verano.",
      "precio_usd_t": 276,
      "rendimiento_t_ha": 5.6,
      "costo_usd_ha": 2014,
      "estado_economico": "oficial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (arroz en cáscara, 25,02 USD/saca de 200 lb) | Rendimiento: ESPAC 2024 (INEC) | Costo: ECOTEC Agrodatos (Quijije 2019), arroz semitecnificado, Samborondón"
    },
    {
      "id": "maiz_duro",
      "nombre": "Maíz duro",
      "icono": "🌽",
      "familia": "Poáceas",
      "raiz_tipo": "Fasciculada, profunda",
      "raiz_estructura": "fasciculada_profunda",
      "alt_min": 0,
      "alt_max": 1500,
      "ciclo_dias": [
        110,
        130
      ],
      "ciclo_meses": 4,
      "kc": [
        0.3,
        1.2,
        0.6
      ],
      "residuo_t_ha": 6.0,
      "coef_humificacion": 0.2,
      "cn_clase": "alto_cn",
      "credito_n_kg": 0,
      "extraccion_n_kg": 110,
      "siembra": [
        "C1",
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 139,
      "margen_usd_ha": 1197,
      "rol_ecologico": "Raíz profunda y máximo aporte de rastrojo (6 t/ha)",
      "explicacion_suelo": "Su rastrojo protege el suelo costero de lluvias intensas, pero necesita una leguminosa previa para no agotar el nitrógeno.",
      "precio_usd_t": 409,
      "rendimiento_t_ha": 6.3,
      "costo_usd_ha": 1380,
      "estado_economico": "oficial",
      "fuente": "Precio: Franja de precios oficial MAG 2026 (promedio 18,53 USD/qq) | Rendimiento: ESPAC 2024 (INEC) | Costo: estimado (costo implícito en el margen anterior del equipo)"
    },
    {
      "id": "soya",
      "nombre": "Soya",
      "icono": "🫘",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 0,
      "alt_max": 1000,
      "ciclo_dias": [
        100,
        120
      ],
      "ciclo_meses": 4,
      "kc": [
        0.4,
        1.15,
        0.5
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 30,
      "extraccion_n_kg": 0,
      "siembra": [
        "C1",
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 58,
      "margen_usd_ha": 1190,
      "rol_ecologico": "Fijador de Nitrógeno (+30 kg/ha) para rotación en Costa",
      "explicacion_suelo": "Corta el ciclo de plagas del maíz y arroz, dejando +30 kg N/ha de rápida mineralización.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "mani",
      "nombre": "Maní",
      "icono": "🥜",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 0,
      "alt_max": 1200,
      "ciclo_dias": [
        120,
        140
      ],
      "ciclo_meses": 5,
      "kc": [
        0.4,
        1.15,
        0.6
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 25,
      "extraccion_n_kg": 0,
      "siembra": [
        "C1",
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 52,
      "margen_usd_ha": 1380,
      "rol_ecologico": "Leguminosa rústica fijadora de N (+25 kg/ha)",
      "explicacion_suelo": "Cubre densamente el suelo reduciendo la evaporación, fija nitrógeno y deja follaje nutritivo.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "yuca",
      "nombre": "Yuca",
      "icono": "🪵",
      "familia": "Euforbiáceas",
      "raiz_tipo": "Tuberosa, profunda",
      "raiz_estructura": "tuberosa_profunda",
      "alt_min": 0,
      "alt_max": 1800,
      "ciclo_dias": [
        300,
        360
      ],
      "ciclo_meses": 10,
      "kc": [
        0.3,
        0.8,
        0.3
      ],
      "residuo_t_ha": 2.5,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 100,
      "siembra": [
        "C1"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 290,
      "margen_usd_ha": 1448,
      "rol_ecologico": "Alta tolerancia a sequía (Kc medio 0.80)",
      "explicacion_suelo": "Resiste meses secos con bajo consumo mensual de agua, aunque exige rotar después con leguminosas para reponer nutrientes.",
      "precio_usd_t": 296,
      "rendimiento_t_ha": 13.15,
      "costo_usd_ha": 2444,
      "estado_economico": "parcial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (20,16 USD/funda de 150 lb) | Rendimiento: estimado | Costo: estimado (costo implícito en el margen anterior del equipo)"
    },
    {
      "id": "sandia",
      "nombre": "Sandía / melón",
      "icono": "🍉",
      "familia": "Cucurbitáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 0,
      "alt_max": 800,
      "ciclo_dias": [
        90,
        100
      ],
      "ciclo_meses": 3,
      "kc": [
        0.4,
        1.0,
        0.75
      ],
      "residuo_t_ha": 1.0,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 90,
      "siembra": [
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 380,
      "margen_usd_ha": 1720,
      "rol_ecologico": "Ciclo corto de alto retorno económico",
      "explicacion_suelo": "Diversifica ingresos en la campaña seca (C2), pero requiere 3 años de pausa para evitar Fusarium.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    },
    {
      "id": "tomate_rinon",
      "nombre": "Tomate riñón",
      "icono": "🍅",
      "familia": "Solanáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_media",
      "alt_min": 0,
      "alt_max": 2400,
      "ciclo_dias": [
        120,
        150
      ],
      "ciclo_meses": 5,
      "kc": [
        0.6,
        1.15,
        0.8
      ],
      "residuo_t_ha": 1.5,
      "coef_humificacion": 0.1,
      "cn_clase": "medio",
      "credito_n_kg": 0,
      "extraccion_n_kg": 110,
      "siembra": [
        "C1",
        "C2",
        "S2"
      ],
      "tolera_helada": "No",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": false,
      "rendimiento_qq_ha": 410,
      "margen_usd_ha": 1950,
      "rol_ecologico": "Hortaliza de alta rentabilidad (exige rotación estricta)",
      "explicacion_suelo": "Comparte familia con la papa (Solanáceas); requiere 3–4 años sin repetir para evitar marchitez y nematodos.",
      "estado_economico": "parcial",
      "fuente": "Precio: Boletín de precios al productor SIPA-MAG, dic 2025 (tomate riñón de invernadero, 7,98 USD/caja de 35 lb = 503 USD/t; sipa.agricultura.gob.ec) | Rendimiento y costo: estimados por el equipo",
      "precio_usd_t": 503
    },
    {
      "id": "caupi",
      "nombre": "Caupí / fréjol de palo",
      "icono": "🫘",
      "familia": "Fabáceas",
      "raiz_tipo": "Pivotante",
      "raiz_estructura": "pivotante_profunda",
      "alt_min": 0,
      "alt_max": 1000,
      "ciclo_dias": [
        70,
        90
      ],
      "ciclo_meses": 3,
      "kc": [
        0.4,
        1.05,
        0.35
      ],
      "residuo_t_ha": 1.5,
      "coef_humificacion": 0.25,
      "cn_clase": "bajo_cn",
      "credito_n_kg": 25,
      "extraccion_n_kg": 0,
      "siembra": [
        "C2"
      ],
      "tolera_helada": "No aplica",
      "permite_pendiente_alta": false,
      "labranza_intensiva": false,
      "es_forrajero": true,
      "rendimiento_qq_ha": 34,
      "margen_usd_ha": 1080,
      "rol_ecologico": "Campeón contra la sequía en Costa (+25 kg N/ha en 80 días)",
      "explicacion_suelo": "Su ciclo ultracorto (70–90 días) y bajo Kc final (0.35) permite cubrir el suelo en verano seco fijando nitrógeno.",
      "estado_economico": "estimado",
      "fuente": "Estimado por el equipo (precio, rendimiento y margen por verificar con MAG-SIPA)"
    }
  ]
};

window.PARCELAS_DEMO = {
  "parcela_licto": {
    "id": "parcela_licto",
    "nombre": "Parcela 1 — Licto (Riobamba, Chimborazo)",
    "region": "Sierra",
    "ubicacion_texto": "Licto, Riobamba, Chimborazo",
    "geometria": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            -78.61253,
            -1.80077
          ],
          [
            -78.61127,
            -1.80077
          ],
          [
            -78.61127,
            -1.80203
          ],
          [
            -78.61253,
            -1.80203
          ],
          [
            -78.61253,
            -1.80077
          ]
        ]
      ]
    },
    "area_ha": 2.0,
    "centroide": {
      "lat": -1.8014,
      "lon": -78.6119
    },
    "terreno": {
      "elev_m": 2882,
      "pendiente_pct": 2.8,
      "pendiente_max_pct": 3.6,
      "orientacion": "E"
    },
    "clima_mensual": [
      {
        "mes": 1,
        "nombre_mes": "Ene",
        "P_mm": 135.5,
        "ET0_mm": 97.7,
        "Tmin_abs": 4.8,
        "Tmed": 12.5
      },
      {
        "mes": 2,
        "nombre_mes": "Feb",
        "P_mm": 145.7,
        "ET0_mm": 89.1,
        "Tmin_abs": 6.2,
        "Tmed": 12.8
      },
      {
        "mes": 3,
        "nombre_mes": "Mar",
        "P_mm": 173.0,
        "ET0_mm": 97.0,
        "Tmin_abs": 6.1,
        "Tmed": 12.6
      },
      {
        "mes": 4,
        "nombre_mes": "Abr",
        "P_mm": 194.2,
        "ET0_mm": 90.0,
        "Tmin_abs": 5.5,
        "Tmed": 12.5
      },
      {
        "mes": 5,
        "nombre_mes": "May",
        "P_mm": 166.9,
        "ET0_mm": 88.6,
        "Tmin_abs": 4.7,
        "Tmed": 12.3
      },
      {
        "mes": 6,
        "nombre_mes": "Jun",
        "P_mm": 155.0,
        "ET0_mm": 81.0,
        "Tmin_abs": 2.9,
        "Tmed": 11.2
      },
      {
        "mes": 7,
        "nombre_mes": "Jul",
        "P_mm": 99.7,
        "ET0_mm": 86.0,
        "Tmin_abs": 2.1,
        "Tmed": 10.8
      },
      {
        "mes": 8,
        "nombre_mes": "Ago",
        "P_mm": 99.5,
        "ET0_mm": 96.2,
        "Tmin_abs": 2.4,
        "Tmed": 11.1
      },
      {
        "mes": 9,
        "nombre_mes": "Sep",
        "P_mm": 65.8,
        "ET0_mm": 102.0,
        "Tmin_abs": 2.0,
        "Tmed": 11.6
      },
      {
        "mes": 10,
        "nombre_mes": "Oct",
        "P_mm": 118.9,
        "ET0_mm": 106.0,
        "Tmin_abs": 3.8,
        "Tmed": 12.5
      },
      {
        "mes": 11,
        "nombre_mes": "Nov",
        "P_mm": 120.3,
        "ET0_mm": 97.9,
        "Tmin_abs": 5.7,
        "Tmed": 12.6
      },
      {
        "mes": 12,
        "nombre_mes": "Dic",
        "P_mm": 139.3,
        "ET0_mm": 98.6,
        "Tmin_abs": 4.7,
        "Tmed": 12.7
      }
    ],
    "anomalia": {
      "fuente": "NASA POWER · PRECTOTCORR",
      "res_km": 50,
      "pct": 120,
      "ventana": "ago–oct 2026",
      "lluvia_reciente_mm": 611,
      "lluvia_normal_mm": 278,
      "anios_referencia": "2001–2025",
      "mensaje": "Su zona viene 120 % más lluviosa que un año normal (ago–oct 2026: 611 mm frente a 278 mm de promedio, NASA POWER, ~50 km). Suelo saturado: revise drenajes, evite labranza con el suelo mojado y vigile hongos (lancha, pudriciones) antes de sembrar. Humedad del suelo SMAP: 0.284 m³/m³ (+2 % frente a su promedio)."
    },
    "suelo": {
      "fuente": "ISRIC SoilGrids 250 m (0–30 cm)",
      "textura": "Franco",
      "arcilla_pct": 21.1,
      "arena_pct": 42.7,
      "ph": 6.3,
      "soc_pct": 4.11,
      "n_gkg": 3.76,
      "editado_por_usuario": false,
      "es_andisol": true
    },
    "ndvi_mensual": [
      {
        "mes": "2022-11",
        "ndvi": 0.47,
        "ndti": 0.092,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2022-12",
        "ndvi": 0.404,
        "ndti": 0.082,
        "n_obs": 9,
        "interpolado": false
      },
      {
        "mes": "2023-01",
        "ndvi": 0.536,
        "ndti": 0.15,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-02",
        "ndvi": 0.459,
        "ndti": 0.187,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-03",
        "ndvi": 0.712,
        "ndti": 0.221,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-04",
        "ndvi": 0.798,
        "ndti": 0.323,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-05",
        "ndvi": 0.745,
        "ndti": 0.288,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2023-06",
        "ndvi": 0.691,
        "ndti": 0.253,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2023-07",
        "ndvi": 0.638,
        "ndti": 0.218,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-08",
        "ndvi": 0.532,
        "ndti": 0.181,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-09",
        "ndvi": 0.538,
        "ndti": 0.174,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2023-10",
        "ndvi": 0.477,
        "ndti": 0.102,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-11",
        "ndvi": 0.475,
        "ndti": 0.133,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-12",
        "ndvi": 0.532,
        "ndti": 0.149,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2024-01",
        "ndvi": 0.589,
        "ndti": 0.165,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2024-02",
        "ndvi": 0.637,
        "ndti": 0.188,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2024-03",
        "ndvi": 0.638,
        "ndti": 0.186,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2024-04",
        "ndvi": 0.661,
        "ndti": 0.231,
        "n_obs": 2,
        "interpolado": false
      },
      {
        "mes": "2024-05",
        "ndvi": 0.678,
        "ndti": 0.235,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2024-06",
        "ndvi": 0.696,
        "ndti": 0.24,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2024-07",
        "ndvi": 0.641,
        "ndti": 0.215,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2024-08",
        "ndvi": 0.587,
        "ndti": 0.191,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2024-09",
        "ndvi": 0.599,
        "ndti": 0.204,
        "n_obs": 24,
        "interpolado": false
      },
      {
        "mes": "2024-10",
        "ndvi": 0.479,
        "ndti": 0.135,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2024-11",
        "ndvi": 0.467,
        "ndti": 0.121,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2024-12",
        "ndvi": 0.483,
        "ndti": 0.141,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2025-01",
        "ndvi": 0.611,
        "ndti": 0.17,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2025-02",
        "ndvi": 0.693,
        "ndti": 0.228,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2025-03",
        "ndvi": 0.775,
        "ndti": 0.287,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2025-04",
        "ndvi": 0.696,
        "ndti": 0.254,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2025-05",
        "ndvi": 0.71,
        "ndti": 0.257,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2025-06",
        "ndvi": 0.724,
        "ndti": 0.259,
        "n_obs": 4,
        "interpolado": false
      },
      {
        "mes": "2025-07",
        "ndvi": 0.72,
        "ndti": 0.268,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2025-08",
        "ndvi": 0.677,
        "ndti": 0.243,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2025-09",
        "ndvi": 0.663,
        "ndti": 0.238,
        "n_obs": 8,
        "interpolado": false
      }
    ],
    "historia_inferida": [
      {
        "anio": 2022,
        "ciclos": 0,
        "meses_cultivo": [],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2023,
        "ciclos": 1,
        "meses_cultivo": [
          3,
          4,
          5,
          6,
          7
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2024,
        "ciclos": 1,
        "meses_cultivo": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2025,
        "ciclos": 1,
        "meses_cultivo": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      }
    ],
    "historia_declarada": [
      "papa",
      "papa"
    ],
    "nematodo_declarado": false,
    "clima_metodo_et0": "Hargreaves FAO-56 (solo temperatura)",
    "smap": {
      "fuente": "NASA SMAP L4 (SPL4SMGP, 9 km) vía AppEEARS",
      "sm_rootzone_m3m3": 0.284,
      "sm_rootzone_promedio_m3m3": 0.279,
      "anomalia_pct": 2,
      "hasta": "2025-11-01"
    },
    "estado_datos": {
      "clima": "NASA POWER 2015–2024 (diario, AG); T corregida +0.7 °C por altitud (celda a 2983.94 m)",
      "anomalia": "NASA POWER PRECTOTCORR, ago–oct 2026 vs 2001–2025",
      "suelo": "ISRIC SoilGrids 250 m (0–30 cm)",
      "ndvi": "HLS Landsat + Sentinel-2 (30 m) vía AppEEARS: 272 observaciones sin nubes, 35 meses",
      "smap": "NASA SMAP L4 (SPL4SMGP, 9 km) vía AppEEARS",
      "terreno": "NASADEM 30 m vía AppEEARS"
    }
  },
  "parcela_guano": {
    "id": "parcela_guano",
    "nombre": "Parcela 2 — Guano / San Andrés (Chimborazo)",
    "region": "Sierra",
    "ubicacion_texto": "San Andrés, Guano, Chimborazo",
    "geometria": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            -78.58843,
            -1.63687
          ],
          [
            -78.58717,
            -1.63687
          ],
          [
            -78.58717,
            -1.63813
          ],
          [
            -78.58843,
            -1.63813
          ],
          [
            -78.58843,
            -1.63687
          ]
        ]
      ]
    },
    "area_ha": 2.0,
    "centroide": {
      "lat": -1.6375,
      "lon": -78.5878
    },
    "terreno": {
      "elev_m": 2506,
      "pendiente_pct": 12.1,
      "pendiente_max_pct": 21.6,
      "orientacion": "SO"
    },
    "clima_mensual": [
      {
        "mes": 1,
        "nombre_mes": "Ene",
        "P_mm": 148.6,
        "ET0_mm": 103.3,
        "Tmin_abs": 6.8,
        "Tmed": 14.8
      },
      {
        "mes": 2,
        "nombre_mes": "Feb",
        "P_mm": 152.7,
        "ET0_mm": 94.6,
        "Tmin_abs": 8.5,
        "Tmed": 15.1
      },
      {
        "mes": 3,
        "nombre_mes": "Mar",
        "P_mm": 183.5,
        "ET0_mm": 103.3,
        "Tmin_abs": 8.2,
        "Tmed": 14.9
      },
      {
        "mes": 4,
        "nombre_mes": "Abr",
        "P_mm": 198.3,
        "ET0_mm": 96.5,
        "Tmin_abs": 8.3,
        "Tmed": 14.9
      },
      {
        "mes": 5,
        "nombre_mes": "May",
        "P_mm": 167.3,
        "ET0_mm": 95.4,
        "Tmin_abs": 7.0,
        "Tmed": 14.6
      },
      {
        "mes": 6,
        "nombre_mes": "Jun",
        "P_mm": 157.4,
        "ET0_mm": 87.8,
        "Tmin_abs": 5.5,
        "Tmed": 13.6
      },
      {
        "mes": 7,
        "nombre_mes": "Jul",
        "P_mm": 99.3,
        "ET0_mm": 93.3,
        "Tmin_abs": 5.0,
        "Tmed": 13.2
      },
      {
        "mes": 8,
        "nombre_mes": "Ago",
        "P_mm": 94.4,
        "ET0_mm": 104.0,
        "Tmin_abs": 4.7,
        "Tmed": 13.5
      },
      {
        "mes": 9,
        "nombre_mes": "Sep",
        "P_mm": 63.5,
        "ET0_mm": 110.4,
        "Tmin_abs": 4.9,
        "Tmed": 14.1
      },
      {
        "mes": 10,
        "nombre_mes": "Oct",
        "P_mm": 121.2,
        "ET0_mm": 113.7,
        "Tmin_abs": 6.4,
        "Tmed": 14.8
      },
      {
        "mes": 11,
        "nombre_mes": "Nov",
        "P_mm": 120.7,
        "ET0_mm": 103.7,
        "Tmin_abs": 7.5,
        "Tmed": 14.9
      },
      {
        "mes": 12,
        "nombre_mes": "Dic",
        "P_mm": 141.4,
        "ET0_mm": 104.4,
        "Tmin_abs": 7.2,
        "Tmed": 14.9
      }
    ],
    "anomalia": {
      "fuente": "NASA POWER · PRECTOTCORR",
      "res_km": 50,
      "pct": 171,
      "ventana": "ago–oct 2026",
      "lluvia_reciente_mm": 730,
      "lluvia_normal_mm": 270,
      "anios_referencia": "2001–2025",
      "mensaje": "Su zona viene 171 % más lluviosa que un año normal (ago–oct 2026: 730 mm frente a 270 mm de promedio, NASA POWER, ~50 km). Suelo saturado: revise drenajes, evite labranza con el suelo mojado y vigile hongos (lancha, pudriciones) antes de sembrar. Humedad del suelo SMAP: 0.307 m³/m³ (+3 % frente a su promedio)."
    },
    "suelo": {
      "fuente": "ISRIC SoilGrids 250 m (0–30 cm)",
      "textura": "Franco",
      "arcilla_pct": 21.7,
      "arena_pct": 41.9,
      "ph": 6.0,
      "soc_pct": 4.34,
      "n_gkg": 3.1,
      "editado_por_usuario": false,
      "es_andisol": true
    },
    "ndvi_mensual": [
      {
        "mes": "2022-11",
        "ndvi": 0.765,
        "ndti": 0.321,
        "n_obs": 25,
        "interpolado": false
      },
      {
        "mes": "2022-12",
        "ndvi": 0.765,
        "ndti": 0.327,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2023-01",
        "ndvi": 0.792,
        "ndti": 0.346,
        "n_obs": 19,
        "interpolado": false
      },
      {
        "mes": "2023-02",
        "ndvi": 0.808,
        "ndti": 0.359,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2023-03",
        "ndvi": 0.819,
        "ndti": 0.372,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2023-04",
        "ndvi": 0.856,
        "ndti": 0.381,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-05",
        "ndvi": 0.655,
        "ndti": 0.247,
        "n_obs": 4,
        "interpolado": false
      },
      {
        "mes": "2023-06",
        "ndvi": 0.802,
        "ndti": 0.351,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2023-07",
        "ndvi": 0.823,
        "ndti": 0.368,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2023-08",
        "ndvi": 0.743,
        "ndti": 0.334,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-09",
        "ndvi": 0.742,
        "ndti": 0.33,
        "n_obs": 14,
        "interpolado": false
      },
      {
        "mes": "2023-10",
        "ndvi": 0.736,
        "ndti": 0.29,
        "n_obs": 9,
        "interpolado": false
      },
      {
        "mes": "2023-11",
        "ndvi": 0.829,
        "ndti": 0.377,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2023-12",
        "ndvi": 0.794,
        "ndti": 0.341,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2024-01",
        "ndvi": 0.835,
        "ndti": 0.376,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2024-02",
        "ndvi": 0.751,
        "ndti": 0.295,
        "n_obs": 15,
        "interpolado": false
      },
      {
        "mes": "2024-03",
        "ndvi": 0.77,
        "ndti": 0.335,
        "n_obs": 16,
        "interpolado": false
      },
      {
        "mes": "2024-04",
        "ndvi": 0.801,
        "ndti": 0.343,
        "n_obs": 2,
        "interpolado": false
      },
      {
        "mes": "2024-05",
        "ndvi": 0.825,
        "ndti": 0.364,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2024-06",
        "ndvi": 0.849,
        "ndti": 0.385,
        "n_obs": 9,
        "interpolado": false
      },
      {
        "mes": "2024-07",
        "ndvi": 0.811,
        "ndti": 0.358,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2024-08",
        "ndvi": 0.773,
        "ndti": 0.331,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2024-09",
        "ndvi": 0.739,
        "ndti": 0.313,
        "n_obs": 25,
        "interpolado": false
      },
      {
        "mes": "2024-10",
        "ndvi": 0.738,
        "ndti": 0.308,
        "n_obs": 30,
        "interpolado": false
      },
      {
        "mes": "2024-11",
        "ndvi": 0.77,
        "ndti": 0.34,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2024-12",
        "ndvi": 0.821,
        "ndti": 0.353,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2025-01",
        "ndvi": 0.851,
        "ndti": 0.37,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2025-02",
        "ndvi": 0.769,
        "ndti": 0.304,
        "n_obs": 0,
        "interpolado": true
      },
      {
        "mes": "2025-03",
        "ndvi": 0.688,
        "ndti": 0.239,
        "n_obs": 5,
        "interpolado": false
      },
      {
        "mes": "2025-04",
        "ndvi": 0.77,
        "ndti": 0.302,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2025-05",
        "ndvi": 0.855,
        "ndti": 0.362,
        "n_obs": 4,
        "interpolado": false
      },
      {
        "mes": "2025-06",
        "ndvi": 0.85,
        "ndti": 0.384,
        "n_obs": 6,
        "interpolado": false
      },
      {
        "mes": "2025-07",
        "ndvi": 0.819,
        "ndti": 0.352,
        "n_obs": 20,
        "interpolado": false
      },
      {
        "mes": "2025-08",
        "ndvi": 0.783,
        "ndti": 0.346,
        "n_obs": 24,
        "interpolado": false
      },
      {
        "mes": "2025-09",
        "ndvi": 0.76,
        "ndti": 0.338,
        "n_obs": 10,
        "interpolado": false
      },
      {
        "mes": "2025-10",
        "ndvi": 0.793,
        "ndti": 0.356,
        "n_obs": 5,
        "interpolado": false
      }
    ],
    "historia_inferida": [
      {
        "anio": 2022,
        "ciclos": 1,
        "meses_cultivo": [
          11,
          12
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2023,
        "ciclos": 1,
        "meses_cultivo": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2024,
        "ciclos": 1,
        "meses_cultivo": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      },
      {
        "anio": 2025,
        "ciclos": 1,
        "meses_cultivo": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "meses_desnudo": [],
        "meses_residuo": []
      }
    ],
    "historia_declarada": [
      "maiz_suave",
      "papa"
    ],
    "nematodo_declarado": false,
    "clima_metodo_et0": "Hargreaves FAO-56 (solo temperatura)",
    "smap": {
      "fuente": "NASA SMAP L4 (SPL4SMGP, 9 km) vía AppEEARS",
      "sm_rootzone_m3m3": 0.307,
      "sm_rootzone_promedio_m3m3": 0.298,
      "anomalia_pct": 3,
      "hasta": "2025-11-01"
    },
    "estado_datos": {
      "clima": "NASA POWER 2015–2024 (diario, AG); T corregida +3.2 °C por altitud (celda a 3003.46 m)",
      "anomalia": "NASA POWER PRECTOTCORR, ago–oct 2026 vs 2001–2025",
      "suelo": "ISRIC SoilGrids 250 m (0–30 cm)",
      "ndvi": "HLS Landsat + Sentinel-2 (30 m) vía AppEEARS: 407 observaciones sin nubes, 36 meses",
      "smap": "NASA SMAP L4 (SPL4SMGP, 9 km) vía AppEEARS",
      "terreno": "NASADEM 30 m vía AppEEARS"
    }
  }
};
