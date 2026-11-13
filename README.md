# IGNIS — Calendario de Actividad de Incendios Armonizado

**Harmonized Fire Activity Calendar** · NASA Space Apps Challenge 2026 · Bahía Blanca (virtual)

[Español](#español) · [English](#english)

---

## Español

### El problema

Los registros satelitales de focos de incendio están partidos entre dos sensores que **no son comparables directamente**: MODIS (1 km) y VIIRS (375 m) tienen distinta resolución espacial, distinta sensibilidad y distinto horario de observación.

Como MODIS está saliendo de su vida operativa, **sin un método de armonización se pierden casi diez años de historia de incendios**. Es el problema planteado por la autora del desafío (Marina Companuchi, CONAE): *«si no hay un método para comparar sus datos, casi 10 años de información histórica se van a perder»*.

### Lo que medimos

Centro-Norte de Argentina, 8 días (2026-11-05 → 2026-11-12), rejilla de 0,05°:

| Métrica | Valor |
|---|---|
| Detecciones totales | **13.872** |
| MODIS (Terra + Aqua) | 1.952 · FRP 95.309 MW |
| VIIRS (NOAA-20 + NOAA-21) | 11.920 · FRP 196.831 MW |
| Ratio VIIRS / MODIS | **6,11×** |
| FRP total | 292.141 MW |
| FRP medio por detección | MODIS **48,8 MW** · VIIRS **16,5 MW** |
| Celdas-día detectadas por ambos | **14,6 %** |
| Celdas-día solo MODIS | 16,2 % |
| Celdas-día solo VIIRS | 69,2 % |

**Lectura:** no es que un sensor vea «más» que el otro — **ven cosas distintas**. VIIRS detecta quemas agrícolas e industriales pequeñas; MODIS solo ve los incendios grandes (su FRP medio por detección es 3× mayor). Por eso sumar sus conteos es un error conceptual, no un detalle de calibración.

> ⚠️ **La coincidencia depende del AOI y de la ventana**: no es un valor universal del proyecto.

### Arranque rápido

```bash
# Requiere Python 3.8+. Sin dependencias externas.
python3 scripts/ingest_firms.py --region South_America --days 7 \
  --bbox -35.0 -68.5 -22.0 -56.0

# Backfill histórico multianual (requiere MAP_KEY gratuito de FIRMS)
export FIRMS_MAP_KEY=xxxxxxxx
python3 scripts/backfill_firms.py --dry-run    # muestra el plan, no gasta requests
python3 scripts/backfill_firms.py              # ~773 requests, ~13 min
```

Salidas: `harmonized.csv`, `calendar.json`, `kpi.json`, `monthly.json`.

### Decisiones metodológicas

1. **Rejilla común** de 0,05° (~5,6 km): unifica el píxel de 1 km con el de 375 m.
2. **FRP normalizado por área de píxel** (`MW/km²`), no FRP crudo. MODIS: 1,00 km² · VIIRS: 0,1406 km².
3. **Sin equivalencia inventada de confianza.** MODIS usa 0–100; VIIRS usa `low/nominal/high`. La NASA no define una equivalencia rigurosa: reportamos cada sensor con su escala y declaramos el supuesto.
4. **«Sin datos» es un estado propio**, distinto de «sin fuego». Un día sin cobertura satelital no es un día sin incendios.
5. **Agregación diaria en UTC**, declarada en la interfaz.
6. **Suomi-NPP excluido**: cesó transmisiones el 2026-11-02 13:00 UTC (alerta oficial NASA Earthdata). VIIRS se construye con NOAA-20 + NOAA-21.

### Límites declarados

- **No mide superficie quemada.** Para eso: MCD64A1 o Sentinel-2.
- **No infiere causas** ni intencionalidad: detecta energía térmica.
- **Paso orbital discreto**: cada sensor pasa ~2 veces al día; los incendios que se inician y extinguen entre pasadas no se registran.
- **Sin máscara de nubes** en este producto: el vacío de datos se aproxima con una regla explícita, no se infiere nubosidad.

Detalle completo en [`docs/METHOD.md`](docs/METHOD.md).

### Cómo verificar antes de publicar

```bash
python3 scripts/validate_standalone.py ignis-demo.html
```

Si no devuelve `exit 0`, el HTML no se muestra: detecta datos ausentes, credenciales embebidas, tiles sin clave, emojis, gradientes, `alert()` y números prohibidos.

---

## English

### The problem

Satellite fire records are split between two sensors that **cannot be compared directly**: MODIS (1 km) and VIIRS (375 m) differ in spatial resolution, sensitivity and overpass time. As MODIS leaves operational life, **without a harmonization method almost ten years of fire history are lost**.

### What we measured

North-Central Argentina, 8 days (2026-11-05 → 2026-11-12), 0.05° grid:

| Metric | Value |
|---|---|
| Total detections | **13,872** |
| MODIS (Terra + Aqua) | 1,952 · 95,309 MW |
| VIIRS (NOAA-20 + NOAA-21) | 11,920 · 196,831 MW |
| VIIRS / MODIS ratio | **6.11×** |
| Total FRP | 292,141 MW |
| Mean FRP per detection | MODIS **48.8 MW** · VIIRS **16.5 MW** |
| Cell-days seen by both sensors | **14.6 %** |

**Reading:** it is not that one sensor «sees more» — **they see different things**. VIIRS catches small agricultural and industrial burns; MODIS only sees large fires (mean FRP per detection is 3× higher). Summing their counts is a conceptual error, not a calibration detail.

### Quick start

```bash
python3 scripts/ingest_firms.py --region South_America --days 7 \
  --bbox -35.0 -68.5 -22.0 -56.0
```

Python 3.8+, no external dependencies. Public FIRMS CSVs need no key for 1- or 7-day windows; the historical backfill requires a free FIRMS `MAP_KEY`.

### Method decisions

1. **Common 0.05° grid** (~5.6 km) reconciling 1 km and 375 m pixels.
2. **FRP normalized by pixel area** (`MW/km²`) instead of raw FRP.
3. **No invented confidence equivalence.** MODIS uses 0–100, VIIRS uses `low/nominal/high`; NASA defines no rigorous mapping, so each sensor keeps its own scale and the assumption is stated.
4. **«No data» is a first-class state**, distinct from «no fire».
5. **Daily aggregation in UTC**, declared in the UI.
6. **Suomi-NPP excluded**: transmissions ceased 2026-11-02 13:00 UTC (NASA Earthdata alert). VIIRS uses NOAA-20 + NOAA-21.

### Declared limits

No burned-area estimate · no causality inference · discrete overpasses (~2/day) · no cloud mask in this product.

---

## Estructura / Repository layout

```
scripts/
  ingest_firms.py            ingesta + armonización (CSV públicos, sin clave)
  backfill_firms.py          backfill histórico multianual (FIRMS Area API)
  validate_standalone.py     validador del HTML standalone (corre en CI)
data/
  samples/calendar.json      muestra versionada que usa la demo
docs/
  METHOD.md                  método, fórmulas, citas y límites
  DATA-CONTRACT.md           contrato del JSON y trampas conocidas
  prompt-pack.md             cuaderno de fuentes oficiales y prompts
web/                         aplicación Next.js (calendario, mapa, ficha)
```

## Datos y créditos / Data & credits

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — focos activos MODIS C6.1 y VIIRS C2
- [NASA Earthdata](https://urs.earthdata.nasa.gov/) — acceso e imágenes
- Desafío / Challenge: **NASA Space Apps Challenge 2026**, autora **Marina Companuchi (CONAE)**

## Licencia / License

MIT — ver [LICENSE](LICENSE).
