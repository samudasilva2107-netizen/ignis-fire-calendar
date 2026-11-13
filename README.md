# IGNIS — Calendario de Actividad de Incendios

Armonización de focos de incendio **MODIS** y **VIIRS** en un calendario de actividad.
NASA Space Apps Challenge 2026 · sede **Bahía Blanca** (virtual) · 14-15 de noviembre.

## El problema, medido

Los registros satelitales de incendios no son comparables entre sí. Lo medimos con datos reales de FIRMS (7 días, Argentina):

| Métrica | Valor |
|---|---|
| Focos detectados por MODIS | **2.303** |
| Focos detectados por VIIRS | **7.697** |
| Ratio VIIRS/MODIS | **3,34×** |
| Celdas-día detectadas por **ambos** sensores | **13,5 %** |
| Celdas-día **solo MODIS** | 23,5 % |
| Celdas-día **solo VIIRS** | 63,1 % |

En Sudamérica el patrón se repite: 20.733 vs 65.247 focos (3,15×) y solo **14,7 %** de coincidencia.

**Conclusión:** usar un solo sensor implica perder entre el 20 % y el 60 % de lo que ve el otro. No es ruido: es diferencia de resolución espacial (1 km vs 375 m), hora de sobrevuelo y escala de confianza.

## Arranque rápido

Sin dependencias externas, sin API key. Solo Python 3.8+.

```bash
python3 scripts/ingest_firms.py --region South_America --days 7 --bbox -55.1 -73.6 -21.7 -53.6
```

Salidas en `salida/`:

- `harmonized.csv` — una fila por celda-día-sensor, con variables unificadas
- `calendar.json` — matriz día × celda, lista para la vista de calendario
- `resumen.txt` — números comparativos para el pitch

### Parámetros

| Flag | Default | Descripción |
|---|---|---|
| `--region` | `South_America` | Región FIRMS (`South_America`, `Global`) |
| `--days` | `7` | Ventana de descarga (1 o 7) |
| `--step` | `0.05` | Tamaño de celda en grados (~5,6 km) |
| `--bbox` | — | `MINLAT MINLON MAXLAT MAXLON` para recortar |
| `--outdir` | `salida` | Carpeta de salida |

## Decisiones de armonización

1. **Rejilla común** de 0,05° (~5,6 km). Unifica el píxel de 1 km de MODIS con el de 375 m de VIIRS.
2. **FRP normalizado**: se compara `frp_density_MW_km2` (MW por km² de píxel), no el FRP crudo. MODIS: 1,00 km² · VIIRS: 0,1406 km².
3. **Confianza unificada**: MODIS 0-100 numérica; VIIRS `low/nominal/high` → 30/60/90.
4. **"Sin cobertura" ≠ "sin incendio"**: el calendario marca la ausencia de datos como estado propio, no como cero.
5. **Día local solar**, no UTC, para la agregación diaria.

## Estructura

```
scripts/ingest_firms.py          ingesta + armonización (funcional)
data/samples/calendar.json       muestra real (2.867 celdas, 7 días AR)
data/samples/harmonized_head.csv muestra del esquema de salida
docs/prompt-pack.md              cuaderno NotebookLM: fuentes oficiales + prompts
docs/resumen-corrida-argentina.txt  salida completa de la corrida de referencia
web/                             app Next.js (calendario + mapa + comparador)
```

## Fuentes de datos

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — CSV públicos, sin clave
- [FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/area/) — históricos con `MAP_KEY` gratuito
- [Ficha VNP14IMG](https://lpdaac.usgs.gov/products/vnp14imgv001/) — VIIRS 375 m
- [Ficha MOD14A1](https://lpdaac.usgs.gov/products/mod14a1v061/) — MODIS 1 km
- [GWIS / JRC](https://gwis.jrc.ec.europa.eu/) — sistema global de información de incendios

## Variables de entorno

Ninguna para la demo. Para históricos, `FIRMS_MAP_KEY` **solo del lado del servidor** (nunca `NEXT_PUBLIC_`). Ver `.env.example`.

## Equipo

IGNIS · NASA Space Apps Challenge 2026 — Bahía Blanca.
