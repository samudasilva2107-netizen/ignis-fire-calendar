# BASES PARA EL DEV — IGNIS
### Documento autoritativo. Si algo acá contradice al manual de NotebookLM, **gana este documento**.

**Generado:** 13/11/2026 · **Fuente de verdad:** `scripts/ingest_firms.py` sobre NASA FIRMS.

---

# REGLA 0 — De dónde salen los números

> **NotebookLM no calcula: recombina los documentos que le cargás.** Por eso inventó «85.000 focos en el Delta del Paraná, en 2024» a partir de números reales puestos en otro contexto.
>
> **Los números de la app salen del pipeline. Nunca del cuaderno, nunca escritos a mano en el copy.**

**Consecuencia técnica obligatoria:** los KPI se **calculan en runtime** desde `calendar.json` / `kpi.json`. Si están hardcodeados, van a quedar mal en cuanto cambie el AOI o entre el histórico.

---

# 1. El AOI oficial de la demo

| Campo | Valor |
|---|---|
| Nombre | Región Centro-Norte de Argentina |
| Bounding box | `-68.5, -35.0, -56.0, -22.0` (minlon, minlat, maxlon, maxlat) |
| Ventana de datos | **2026-11-05 → 2026-11-12** (8 días) |
| Rejilla de armonización | **0,05°** (~5,6 km) |
| Plataformas | MODIS: **Terra (T) + Aqua (A)** · VIIRS: **NOAA-20 (N20) + NOAA-21 (N21)** |
| Suomi-NPP | **Excluido**: cesó el 2026-11-02 13:00 UTC (alerta NASA Earthdata) |

⚠️ **La ventana son 8 días, no un año.** Cuando corra el backfill histórico, la ventana cambia y todos los KPI se recalculan. Por eso no se hardcodean.

---

# 2. KPIs oficiales (esta ventana, este AOI)

```json
{
  "detecciones_totales": 13872,
  "modis": 1952,
  "viirs": 11920,
  "ratio_viirs_modis": 6.11,
  "frp_total_mw": 292140.7,
  "frp_modis_mw": 95309.5,
  "frp_viirs_mw": 196831.2,
  "frp_medio_mw": { "modis": 48.83, "viirs": 16.51 },
  "coincidencia_celda_dia": {
    "ambos_pct": 14.6,
    "solo_modis_pct": 16.2,
    "solo_viirs_pct": 69.2
  }
}
```

Archivo completo: **`data/kpi.json`**. La app lo importa; no lo transcribe.

### Para el total regional (referencia, no es el AOI de la app)

Sudamérica, misma ventana: **152.726 detecciones** (20.733 MODIS / 131.993 VIIRS), ratio **6,37×**, FRP **2.014.597 MW**, coincidencia **13,1%**.
Si el texto lo menciona, tiene que decir **«Sudamérica, 8 días»** — nunca «el Delta» ni «2024».

---

# 3. Contrato REAL de `calendar.json`

```json
{
  "step_deg": 0.05,
  "days": ["2026-11-05", "...", "2026-11-12"],
  "cells": [
    {
      "lat": -32.125,
      "lon": -58.125,
      "days": {
        "2026-11-05": { "n": 3, "frp_max": 21.85, "sensores": ["MODIS", "VIIRS"] }
      }
    }
  ]
}
```

**Trampa que ya rompió una versión del contrato:** `days` aparece **dos veces** y son tipos distintos.

| Ubicación | Tipo | Contenido |
|---|---|---|
| Raíz | `array<string>` | Lista ordenada de fechas (eje del calendario) |
| Dentro de cada celda | `object` indexado por fecha | Métricas de esa celda ese día |

Renombrar en el código: `daysRoot` y `cell.days`. **No usar el mismo nombre para ambos.**

---

# 4. Fórmulas de los KPI (calcular en runtime)

```ts
// desde calendar.json
const totalDetecciones = cells.reduce((s, c) =>
  s + Object.values(c.days).reduce((a, d) => a + d.n, 0), 0);

const frpTotal = cells.reduce((s, c) =>
  s + Object.values(c.days).reduce((a, d) => a + d.frp_max, 0), 0);

// por sensor: requiere el campo por sensor (ver §5)
const ambos      = cellDays.filter(d => d.sensores.length === 2).length;
const soloModis  = cellDays.filter(d => d.sensores.length === 1 && d.sensores[0] === 'MODIS').length;
const soloViirs  = cellDays.filter(d => d.sensores.length === 1 && d.sensores[0] === 'VIIRS').length;
const pctCoinc   = ambos / (ambos + soloModis + soloViirs) * 100;
```

**Si el JSON no alcanza para un KPI, se usa `kpi.json`.** No se estima.

---

# 5. Lo que hay que agregar al pipeline (pedido al dev)

El `calendar.json` actual **no distingue el conteo por sensor dentro de una celda**: `n` es el total y `sensores` solo dice cuáles vieron esa celda. Para calcular `ratio` y `frp_medio` en runtime hace falta:

```json
"days": {
  "2026-11-05": {
    "n": 3, "frp_max": 21.85,
    "sensores": ["MODIS", "VIIRS"],
    "por_sensor": {
      "MODIS": { "n": 1, "frp_sum": 21.85 },
      "VIIRS": { "n": 2, "frp_sum": 0.0 }
    }
  }
}
```

Ya está calculado en `harmonized.csv` (una fila por celda-día-sensor). Es un cambio de 10 líneas en el generador de `calendar.json`.

---

# 6. Los 4 números prohibidos

Si aparecen en el código, en el copy o en el pitch, están mal:

| ❌ | ✅ Correcto |
|---|---|
| `4.281.940 MW` | **292.141 MW** (AOI) / 2.014.597 MW (Sudamérica) |
| `85.000 focos` | **13.872** (AOI) / 152.726 (Sudamérica) |
| `42,3%` de coincidencia | **14,6%** (AOI) / 13,1% (Sudamérica) |
| `13,5%` de coincidencia | ídem |
| «año 2024» | **5 al 12 de noviembre de 2026** |
| «Delta del Paraná» | **Centro-Norte de Argentina** |

⚠️ El 42,3% fue un **bug mío**: contaba las dos plataformas VIIRS (N20 y N21) como si fueran «dos sensores distintos», inflando la coincidencia. Ya está corregido en `scripts/ingest_firms.py`.

---

# 7. Las 3 vistas y sus estados (cerrado, no agregar)

| Vista | Qué muestra | Estado vacío | Estado sin datos |
|---|---|---|---|
| **Calendario** | Matriz 12 meses × 7 días, color por `frp_max` escala log `ln(FRP+1)/ln(5001)` | Celdas neutras (0 focos) | **Achurado diagonal** |
| **Mapa** | Leaflet + CARTO dark, un círculo por celda | Mapa base sin capas | — |
| **Ficha del día** | Tabla de celdas del día + % de coincidencia | «Seleccioná una fecha» | «Sin datos confirmados» |

**Regla del estado «sin datos»:** si **ninguna** celda del AOI registró detecciones ese día → achurado. Si otras celdas sí → color neutro (sin fuego). **Nunca** atribuir a nubosidad: el CSV de FIRMS no trae ese canal.

---

# 8. Lo que NO se puede afirmar (y el jurado va a preguntar)

- ❌ Superficie quemada → para eso es **MCD64A1** o Sentinel-2.
- ❌ Causa o intencionalidad → el sensor ve calor, no intención.
- ❌ Hora de ignición o extinción → pasadas cada 12 h.
- ❌ «Día sin cobertura por nubes» → no hay máscara de nubes en el producto.

---

# 9. Cómo regenerar todo

```bash
# AOI de la demo (Centro-Norte Argentina)
python3 scripts/ingest_firms.py --region South_America --days 7 \
  --bbox -35.0 -68.5 -22.0 -56.0 --outdir salida

# Referencia regional
python3 scripts/ingest_firms.py --region South_America --days 7 --outdir salida_sa
```

Salidas: `harmonized.csv`, `calendar.json`, `kpi.json`, `resumen.txt`.
Sin dependencias externas. Los CSV de FIRMS son públicos (no requieren MAP_KEY para 1 o 7 días).
