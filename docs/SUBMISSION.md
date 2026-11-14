# SUBMISSION — IGNIS I (NASA Space Apps 2026)

La página del proyecto dice **«Vuelva a consultar más tarde para ver cómo este proyecto despega»**.
Eso significa una sola cosa: **la entrega está vacía.** El jurado entra ahí y no ve nada.

El código y los datos están listos. **Lo que falta es el formulario y el video.**

---

# 1. Qué pide la entrega (checklist)

| # | Campo | Estado |
|---|---|---|
| 1 | Título del proyecto | ❌ vacío |
| 2 | Descripción corta (elevator pitch) | ❌ vacío |
| 3 | Descripción completa: qué hace y cómo | ❌ vacío |
| 4 | **Link al proyecto** (demo en Vercel) | ❌ vacío |
| 5 | **Video de presentación** (YouTube/Vimeo) | ❌ **no grabado** |
| 6 | Link al repositorio | ❌ vacío |
| 7 | Datos de NASA utilizados | ❌ vacío |
| 8 | Tags / habilidades | ❌ vacío |

**El video es obligatorio para ser evaluado.** Sin video, el proyecto no entra en la consideración global, por buena que sea la app.

---

# 2. Textos en INGLÉS (el jurado evalúa en inglés)

### 2.1 Project title
```
IGNIS — 26-Year Harmonized Fire Activity Calendar (MODIS + VIIRS)
```

### 2.2 Short description (elevator pitch, ~60 palabras)
```
Twenty-six years of satellite fire records are split between two sensors that cannot be
compared: MODIS (1 km) and VIIRS (375 m). As MODIS retires, that history is about to
break. IGNIS harmonizes both onto a common grid and turns them into a single fire-activity
calendar: pick any area, any month, any year since 2000, and see the trends, the
anomalies, and what each instrument hides.
```

### 2.3 Full description
```
THE PROBLEM

Active-fire records from NASA's MODIS and VIIRS cannot be compared directly: MODIS
resolves 1 km pixels, VIIRS resolves 375 m; they fly at different times, with different
sensitivity and different confidence scales. MODIS is now leaving operational life, and
without a harmonization method almost ten years of continuous fire history would be lost.
Fire managers would be left without a calendar telling them when and where fires happened.

WHAT IGNIS DOES

IGNIS reconciles both sensors onto a common 0.05° grid and exposes them as one
fire-activity calendar. The user selects an area of interest and a month, and the calendar
shows fire activity across [26] years, flagging anomalies against the same day-of-year
climatology. A map and a daily inspection panel allow auditing any cell on any day.

Every number shown in the interface is computed at runtime from the data files, never
hard-coded.

HOW IT WORKS — FOUR DECISIONS

1. Common grid. Both sensors are aggregated to a 0.05° grid (~5.6 km). A single fire front
   may produce one MODIS detection and several VIIRS detections; the grid makes them
   comparable without pretending they are identical.

2. Area-normalized FRP. Fire Radiative Power is an extensive quantity. We normalize per
   pixel area (MW/km²) because the MODIS pixel is 7× larger than the VIIRS pixel.

3. No invented confidence equivalence. MODIS reports a continuous 0–100 confidence; VIIRS
   reports low/nominal/high classes where "high" actually flags sensor saturation, not
   higher probability. NASA defines no rigorous mapping, so we keep both scales and state
   the assumption instead of fabricating a single index.

4. "No data" is a first-class state. A day with zero detections may mean no fire, no
   overpass, or dense cloud. Since this product carries no cloud mask, we refuse to render
   a satellite gap as "no fire": days are marked "no confirmed data".

WHAT WE MEASURED

Over the selected area of interest, the pipeline processed [DETECCIONES] active-fire
detections from [ANIOS] years. VIIRS detects [RATIO]× more detections than MODIS, and only
[COINCIDENCIA]% of cell-days are seen by both sensors. Mean FRP per detection is
[FRP_M] MW for MODIS versus [FRP_V] MW for VIIRS: MODIS only sees large fires, VIIRS also
catches small agricultural and land-clearing burns.

The same dataset contains a visible artifact: raw counts jump sharply when a new satellite
enters service. Our harmonization keeps the instrument identity as provenance, so the jump
can be attributed to the instrument rather than to fire activity.

WHO USES IT

Early-warning services, fire managers, land-use planners and researchers who need a
consistent, auditable time series for an arbitrary region — not a global product they
cannot adapt.

LIMITS WE DECLARE

- No burned-area estimate: active fire measures combustion at overpass time, not scar area
  (that requires MCD64A1 or Sentinel-2).
- No causality: the sensor sees thermal energy, not intent.
- Discrete sampling: each sensor observes ~2 times per day; fires starting and ending
  between overpasses are not recorded.
- No cloud mask in this product: data gaps are approximated with a stated rule.
- Coverage varies by era: before 2012 only MODIS existed, so earlier years have fewer
  instruments — the interface states this per year.

WHAT'S NEXT

Scheduled backfill against the FIRMS API, per-cell validation against burned-area
products, and uncertainty bands on the harmonized series.
```

### 2.4 NASA data used
```
NASA FIRMS — MODIS Collection 6.1 active fire (MOD14/MYD14) and VIIRS Collection 2
active fire (VNP14IMG, 375 m) from NOAA-20, NOAA-21 and Suomi-NPP (2012–2026 archive).
NASA Earthdata for access and documentation. Suomi-NPP product delivery ceased on
2026-11-02 13:00 UTC, as documented in the official NASA Earthdata alert.
```

### 2.5 Links
```
Demo:    https://ignis-fire-calendar.vercel.app
Repo:    https://github.com/samudasilva2107-netizen/ignis-fire-calendar
Video:   [pegar acá la URL de YouTube cuando esté grabado]
```

### 2.6 Tags / skills
```
Earth Science · Data Analysis · Data Visualization · Software · Web Development ·
Agriculture · Disaster Response · Satellites
```

---

# 3. Versión en ESPAÑOL (para la comunidad local y las redes)

### 3.1 Título
```
IGNIS — Calendario de Actividad de Incendios Armonizado (MODIS + VIIRS, 2000-2026)
```

### 3.2 Descripción corta
```
Veintiséis años de registros satelitales de incendios están partidos entre dos sensores que
no se pueden comparar: MODIS (1 km) y VIIRS (375 m). Con MODIS saliendo de servicio, esa
historia está a punto de cortarse. IGNIS los armoniza en una rejilla común y los convierte
en un solo calendario de actividad: elegís un área, un mes y un año desde 2000, y ves las
tendencias, las anomalías y qué oculta cada instrumento.
```

### 3.3 Descripción completa (resumen de 6 líneas)
```
El problema: MODIS se jubila y sin armonización se pierden casi diez años de historia.
Lo que hace IGNIS: lleva ambos sensores a una rejilla de 0,05° y los muestra como una
serie única, con calendario multianual, mapa y auditoría por celda-día.
Las cuatro decisiones: rejilla común · FRP normalizado por área de píxel · sin equivalencia
inventada de confianza · «sin datos» como estado propio.
Lo medido: [DETECCIONES] detecciones en [ANIOS] años; VIIRS detecta [RATIO]× más; solo el
[COINCIDENCIA]% de las celdas-día coinciden.
Los límites: no mide área quemada, no infiere causas, muestreo discreto, sin máscara de nubes.
Para quién: alerta temprana, gestión de emergencias, ordenamiento territorial e investigación.
```

---

# 4. ⚠️ Los 6 números que hay que actualizar cuando termine el backfill

El texto de arriba queda escrito con el AOI y la ventana **actuales (4 años)**. Cuando termine
la corrida de 26 años, reemplazá en el bloque en inglés:

| Placeholder | De dónde sale | Valor actual |
|---|---|---|
| `[DETECCIONES]` | `daily.json` → suma de `n` | 1.360.075 |
| `[ANIOS]` | años distintos en `daily.json` | 4 → **26** |
| `[RATIO]` | suma `v` / suma `m` | 5,5× |
| `[COINCIDENCIA]` | suma `am` / suma (`am+sm+sv`) | 18,0% |
| `[FRP_M]` | suma `fm` / suma `m` | 42,79 MW |
| `[FRP_V]` | suma `fv` / suma `v` | 11,60 MW |

**Regla:** si un número no sale de `daily.json`, no va en el texto.

---

# 5. Guion del video (3 minutos, en inglés con subtítulos)

| Tiempo | Qué se dice | Qué se muestra |
|---|---|---|
| 0:00 | *"Twenty-six years of satellite fire records. Two sensors that cannot be compared. And one of them is about to switch off."* | Pantalla del proyecto, luego el gráfico de 26 años |
| 0:20 | *"MODIS sees 1-kilometre pixels. VIIRS sees 375 metres. Different sensitivity, different clocks, different confidence scales. If nobody reconciles them, ten years of fire history disappear."* | Zoom a una zona con ambos sensores |
| 0:45 | *"IGNIS puts both on one grid, normalizes the fire radiative power per pixel, and refuses to invent a confidence scale NASA never defined."* | Las cuatro decisiones en texto |
| 1:20 | *"Pick a region and a month. Here are 26 years of the same month, side by side."* | Comparativa interanual |
| 1:50 | *"The steps you see are not more fires — they are new instruments. That is exactly the artifact this project exists to expose."* | El salto 2023→2024 y los escalones |
| 2:20 | *"And a day with no data is not a day without fire. We mark it as such."* | Celdas achuradas |
| 2:40 | *"The demo, the data and the method are open. IGNIS: it doesn't matter which sensor the fire came from. What matters is the pattern."* | Logo + URL + repo |

**Grabalo en castellano y subtitulá en inglés**, o grabá directo en inglés. Lo importante: **que exista**.

---

# 6. Lo que NO hay que escribir

- ❌ «Nadie lo hizo antes» → es falso y verificable: GWIS, EFFIS, GFED4s y ESA Fire CCI publican series armonizadas.
- ✅ «Esto existe en la investigación, pero no como herramienta abierta por AOI con estados de cobertura explícitos».
- ❌ «Precisión validada» → no hay validación de campo.
- ❌ Cualquier número que no salga de `daily.json`.
- ❌ «Tiempo real» → el producto es NRT con latencia de horas; decí «near-real-time».
