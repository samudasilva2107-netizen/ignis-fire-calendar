# BACKFILL HISTÓRICO — instrucciones para el dev

**Script:** `scripts/backfill_firms.py` (sin dependencias, Python 3.8+)
**Objetivo:** 4 años de serie diaria para que el calendario cumpla el requisito de la autora del desafío: *«cuántos focos tuvo un mes a través de distintos años»*.

---

# 1. Decisiones ya tomadas (no hay que elegir nada)

| Parámetro | Valor | Por qué |
|---|---|---|
| **AOI** | bbox `-68.5, -35.0, -56.0, -22.0` (W,S,E,N) | El mismo que muestra la app: Centro-Norte de Argentina |
| **Rango** | `2023-01-01` → hoy | 3 años completos + 2026 parcial: alcanza para comparar años y para que el p90 tenga sentido |
| **Rejilla** | 0.05° (~5,6 km) | La misma del pipeline actual |
| **Producto FIRMS** | `_SP` (Standard Processing) para todo el histórico | NRT no existe para el archivo: solo cubre los últimos días |
| **Últimos 10 días** | `_NRT` | Ahí SP todavía no está completo |
| **Ventana por request** | 5 días | Es el máximo que acepta la API (DAY_RANGE 1..5) |
| **Suomi-NPP** | excluido | Cesó el 2026-11-02 13:00 UTC |

**Plataformas:** MODIS (Terra+Aqua) desde 2000 · NOAA-20 desde 2018 · NOAA-21 desde 2024-01-17.
Antes de 2024 solo hay MODIS + N20: **el script lo respeta solo**, no pide ventanas imposibles.

**Total: 773 requests · ~13 minutos** (con 1 request/segundo y reintentos).

---

# 2. Cómo se corre

```bash
# 1. La clave, en el entorno (NUNCA en el repo, NUNCA en el código)
export FIRMS_MAP_KEY=xxxxxxxxxxxxx

# 2. Ver el plan sin gastar requests
python3 scripts/backfill_firms.py --dry-run

# 3. Correr de verdad
python3 scripts/backfill_firms.py

# Opcional: si la clave está en un archivo
python3 scripts/backfill_firms.py --key-file ~/.firms-key
```

**Es reanudable:** cada respuesta se guarda en `cache_firms/`. Si se corta, se vuelve a correr y **continúa desde donde quedó** sin volver a pedir lo ya bajado.

**Si aparece un 429** (rate limit): el script espera y reintenta solo. No hay que hacer nada.

---

# 3. Salidas

```
salida_backfill/
├── calendar.json    ← el que consume la app (cells[].days[].{n,frp_max,sensores,por_sensor})
├── kpi.json         ← global + por_anio + por_mes
├── monthly.json     ← índice año/mes → totales (para el selector)
└── harmonized.csv   ← auditoría: una fila por celda-día-sensor
```

Copiar los tres JSON a `web/public/data/`.

---

# 4. Qué tiene que cambiar en la app cuando llegue el histórico

Hoy el calendario está atado a noviembre 2026. Tres cosas puntuales:

### 4.1 Quitar el hardcode del mes
```js
// HOY (mal):
if (selectedMonth !== 11) { /* cartel "sin datos" */ }
const daysInMonth = 30;
const startDayOffset = 6;  // Nov 1 = Domingo

// DESPUÉS (bien):
const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
const firstWeekday = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7; // Lun=0
```

### 4.2 Selector de año real
Los botones 2024/2025 hoy disparan `alert()`. Deben:
- leer `Object.keys(kpi.por_anio)` y **deshabilitarse** para los años sin datos;
- al cambiar de año, re-renderizar calendario + KPIs + serie.

### 4.3 Vista comparativa (lo que pide la autora)
Un selector de **mes** que muestre el **mismo mes en todos los años** disponibles, uno al lado del otro. Con `monthly.json` es directo: `monthly["2023-08"]`, `monthly["2024-08"]`, etc.
**Esa vista es la que responde literalmente "cuántos focos tuvo un mes a través de distintos años".**

### 4.4 p90 real
El cálculo actual (`Math.floor(values.length * 0.9)`) funciona, pero con 4 años de datos conviene calcularlo **por día-del-año** (mismo `MM-DD` en los años disponibles). Ahí la anomalía pasa a significar algo: *"este 12 de agosto estuvo por encima del 90% de los 12 de agosto anteriores"*.

---

# 5. Verificación antes de dar por cerrado

- [ ] `kpi.por_anio` tiene 4 claves (2023, 2024, 2025, 2026)
- [ ] `kpi.global.total` es del orden de **cientos de miles** (no 13.872: eso era una semana)
- [ ] `calendar.days.length` > 1000
- [ ] El calendario abre cualquier mes sin cartel de error
- [ ] El CSV descargado tiene una fila por día con datos
- [ ] El ratio VIIRS/MODIS se mantiene entre **5× y 7×**
- [ ] El p90 marca más de un día por año (si marca uno solo, sigue siendo el cálculo viejo)

---

# 6. Aviso

El backfill **no cambia el AOI ni la metodología**: solo agrega días. Los KPIs de la demo (13.872 · 6,11× · 14,6%) son de la ventana de 8 días y **quedan como referencia de esa ventana**; los nuevos números se calculan solos desde `kpi.json`.

Si el jurado pregunta «¿y en 2023?», la respuesta tiene que salir de `kpi.por_anio["2023"]`, no de la memoria de nadie.
