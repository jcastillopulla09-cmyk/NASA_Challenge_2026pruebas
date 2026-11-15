# CSV de AppEEARS

## Pedido (Point Sample) — nombre sugerido `allpawinay_sierra`
- **Coordenadas:** subir `puntos_pedido2.csv` (centro de Licto y Guano + 4 vecinos a ~55 m para la pendiente).
- **Fechas:** 11-01-2022 a 11-01-2025.
- **Capas:**
  - HLSL30 (Land Surface Reflectance): B04, B05, B06, B07, Fmask
  - HLSS30 (Land Surface Reflectance): B04, B8A, B11, B12, Fmask
  - SPL4SMGP (SMAP): Geophysical_Data_sm_rootzone
  - NASADEM_NC: NASADEM_HGT (elevación)

## Cuando llegue el correo
Copie aquí los archivos `*-results.csv` y corra `python scripts/generar_parcelas.py`.
Cada punto se asigna a la parcela cuyo centroide esté a menos de 1 km.

## Estado (15 nov 2026): pedido `allpawinay-sierra` recibido y cargado
- `allpawinay-sierra-HLSL30-020-results.csv` (Landsat 8/9) y `allpawinay-sierra-HLSS30-020-results.csv` (Sentinel-2): tal como los entregó AppEEARS.
- `allpawinay-sierra-NASADEM-NC-001-results.csv`: elevación de los 10 puntos, tal como llegó.
- `allpawinay-sierra-SPL4SMGP-008-results-diario.csv`: SMAP L4 `sm_rootzone`. El original es cada 3 horas (87 760 filas, 7 MB);
  aquí va el **promedio diario del punto central** de cada parcela. Los 5 puntos de cada parcela caen en el mismo
  píxel de 9 km (diferencia 0,0), así que no se pierde información espacial.
- Resultado: 679 observaciones HLS sin nubes (Licto 272, Guano 407), 35–36 meses de NDVI/NDTI por parcela.
