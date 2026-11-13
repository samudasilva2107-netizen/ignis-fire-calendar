# Contrato de datos

## `calendar.json`

```json
{
  "step_deg": 0.05,
  "days": ["2026-11-05", "..."],
  "cells": [
    {
      "lat": -32.125,
      "lon": -58.125,
      "days": {
        "2026-11-05": {
          "n": 3,
          "frp_max": 21.85,
          "sensores": ["MODIS", "VIIRS"],
          "por_sensor": {
            "MODIS": { "n": 1, "frp_sum": 21.85, "frp_max": 21.85 },
            "VIIRS": { "n": 2, "frp_sum": 0.4,  "frp_max": 0.25 }
          }
        }
      }
    }
  ]
}
```

### Trampas conocidas

1. **`days` aparece dos veces y son tipos distintos.**
   - En la **raíz**: `array<string>` — lista ordenada de fechas, eje del calendario.
   - Dentro de cada **celda**: `object` indexado por fecha.
   Usar nombres distintos en el código (`daysRoot` / `cell.days`).
2. **`n` es el total de la celda-día**, sumando ambos sensores. El desglose está en `por_sensor`.
3. **`frp_max` es un máximo, no una suma.** Para totales usar `por_sensor[*].frp_sum`.
4. **`sensores`** dice *quién vio esa celda*, no cuántos focos vio cada uno.
5. **Una celda ausente no es cero**: significa que ningún sensor registró detección ahí ese día.

## `kpi.json`

Salida del backfill; contiene `aoi`, `global`, `coincidencia_celda_dia`, `por_anio` y `por_mes`.

**Regla:** la app calcula sus KPIs en runtime desde `calendar.json`. `kpi.json` es para la vista interanual y para verificación, no para copiar números al copy.

## `monthly.json`

```json
{ "months": ["2026-11"], "totales": { "2026-11": { "modis": 1952, "viirs": 11920, "total": 13872 } } }
```

## Reglas de la interfaz

- Los números **nunca** se hardcodean en el HTML: se derivan del JSON.
- Los textos de ventana («8 días», «5–12 nov») se derivan de `days[0]` y `days[-1]`.
- Toda vista declara su unidad: FRP en MW, conteos en detecciones, área en km².
- Los KPI de coincidencia se rotulan **«coincidencia del AOI seleccionado»**.
