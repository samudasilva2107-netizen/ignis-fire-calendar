# PLAN PARA EL DEV — 13/11, antes del sábado

Ordenado por prioridad. Lo que está en rojo, si no se hace, rompe la demo.

---

# 0. Traer los cambios del repo

```bash
git pull origin main
```

Trae dos commits nuevos: `b2c8330` y el siguiente (`eras.json` + `daily.json` con coincidencia).

**El script `scripts/backfill_firms.py` cambió.** No lo pises con tu copia local.

---

# 🔴 1. Backfill completo: 2000 → hoy (26 años)

```bash
export FIRMS_MAP_KEY=<la del correo de NASA>

# 1) Ver el plan (no gasta requests, no necesita clave)
python3 scripts/backfill_firms.py --dry-run
#    -> 3.838 requests, ~64 min

# 2) Correr
python3 scripts/backfill_firms.py --split-year
```

**Qué cambió respecto de la corrida anterior:**

| Cambio | Por qué |
|---|---|
| Arranca en **2000-11-01** (no 2023) | MODIS tiene archivo desde nov-2000: 26 años en vez de 4 |
| Agrega **Suomi-NPP** como plataforma histórica (2012-01-20 → 2026-11-02) | Aporta al archivo aunque esté cesado hoy |
| `--split-year` | **GitHub rechaza archivos > 100 MB**: un solo `calendar.json` de 26 años pesaría 300+ MB |
| Genera **`daily.json`** | Es lo que la UI debe consumir: ~655 KB para 9.509 días |
| Genera **`eras.json`** | Qué plataformas aportaron en cada año (para declararlo en pantalla) |

**Salidas esperadas en `salida_backfill/`:**

```
daily.json              ~655 KB     ← la UI consume esto
monthly.json            ~300 KB
kpi.json                ~20 KB
eras.json               ~2 KB
calendar-2001.json      ~5-15 MB    ← uno por año, para el mapa
calendar-2002.json
...
calendar-2026.json
calendar.json           NO lo subas: queda fuera del repo
```

**Cómo commitear:**

```bash
mkdir -p web/public/data
cp salida_backfill/daily.json salida_backfill/monthly.json \
   salida_backfill/kpi.json salida_backfill/eras.json web/public/data/
cp salida_backfill/calendar-20*.json web/public/data/
git add web/public/data/
git commit -m "data: backfill 2000-2026 (26 años) + agregados diarios"
git push
```

⚠️ **No lo pongas en el pipeline de deploy.** Si el backfill corre en cada build: cada deploy tarda 64 minutos y el día que la API falle publicás el calendario vacío. Se corre **una vez**, se commitea, y el deploy solo levanta los archivos.

---

# 🔴 2. El fix del front (lo más importante)

## El problema medido

`web/src/app/page.tsx` es `"use client"` y hace:

```tsx
import calendarJson from "../../public/data/calendar.json";   // 58 MB
```

Eso mete el JSON **dentro del JavaScript de la página**. Medido en la URL de Vercel:

```
chunk app/page-*.js → 52.443 KB (52 MB)
con brotli         →  6.976 KB transferidos
```

Los 7 MB se bajan, pero el navegador tiene que **parsear 52 MB de JavaScript**. Con 26 años serían ~300 MB: **no carga, ni en una notebook**.

## El fix

### 2.1 Borrar el import

```tsx
// ELIMINAR
import calendarJson from "../../public/data/calendar.json";
```

### 2.2 Tipos

```tsx
type DailyRow = {
  d: string;   // "2026-11-05"
  n: number;   // detecciones totales
  m: number;   // MODIS
  v: number;   // VIIRS
  fm: number;  // FRP suma MODIS (MW)
  fv: number;  // FRP suma VIIRS (MW)
  am: number;  // celdas-día con ambos sensores
  cd: number;  // celdas-día totales
};
```

### 2.3 Cargar el agregado diario

```tsx
const [daily, setDaily] = useState<DailyRow[] | null>(null);

useEffect(() => {
  fetch("/data/daily.json")
    .then(r => r.json())
    .then(setDaily)
    .catch(() => setDaily([]));   // estado de error explícito
}, []);
```

### 2.4 KPIs calculados desde `daily`

```tsx
const kpis = useMemo(() => {
  if (!daily?.length) return null;
  const a = daily.reduce((acc, r) => ({
    n: acc.n + r.n, m: acc.m + r.m, v: acc.v + r.v,
    fm: acc.fm + r.fm, fv: acc.fv + r.fv,
    am: acc.am + r.am, cd: acc.cd + r.cd,
  }), { n: 0, m: 0, v: 0, fm: 0, fv: 0, am: 0, cd: 0 });
  return {
    ...a,
    ratio: a.m ? a.v / a.m : 0,
    pctCoincidencia: a.cd ? (a.am / a.cd) * 100 : 0,
    frpMedioM: a.m ? a.fm / a.m : 0,
    frpMedioV: a.v ? a.fv / a.v : 0,
  };
}, [daily]);
```

### 2.5 El detalle por celda, sólo cuando se pide

```tsx
const [yearData, setYearData] = useState<Record<string, Cell[]>>({});

useEffect(() => {
  if (!selectedYear || yearData[selectedYear]) return;
  fetch(`/data/calendar-${selectedYear}.json`)
    .then(r => r.json())
    .then(d => setYearData(prev => ({ ...prev, [selectedYear]: d.cells })));
}, [selectedYear, yearData]);
```

## 2.6 Qué archivo usa cada vista

| Vista | Archivo | Peso |
|---|---|---|
| KPIs · calendario mensual · comparativa interanual · serie temporal | **`daily.json`** | ~655 KB |
| Coincidencia por año/mes, si se quiere desglose | `kpi.json` | ~20 KB |
| Qué plataformas había cada año | `eras.json` | ~2 KB |
| Mapa del año seleccionado | `calendar-YYYY.json` | 5-15 MB (lazy) |
| Ficha de día / auditoría por celda | `calendar-YYYY.json` | idem |

**Regla:** el calendario, los KPIs y la comparativa **no necesitan las celdas**. Con `daily.json` alcanza. Las celdas son solo para el mapa y la auditoría.

## 2.7 El standalone también

`ignis-demo.html` embebe todo. Con 26 años serían 300+ MB: **no se puede generar así**.

**Decisión:** el standalone embebe **`daily.json` completo + las celdas de los últimos 12 meses**. Sirve como respaldo de la demo (calendario y KPIs de 26 años funcionando) y el mapa cubre el último año. Declararlo en el pie: *«standalone: agregados de 26 años + mapa del último año»*.

---

# 🟠 3. Declarar las épocas (lo que pidió Samuel)

Con 26 años hay un hecho que **hay que mostrar, no esconder**: antes de 2012 sólo existía MODIS.

## 3.1 Leer `eras.json`

```json
{
  "2005": { "plataformas": { "MODIS (Terra/Aqua)": 18234 }, "n_plataformas": 1, "solo_modis": true },
  "2020": { "plataformas": { "MODIS (Terra/Aqua)": 41200, "VIIRS Suomi-NPP": 91000, "VIIRS NOAA-20": 88000 }, "n_plataformas": 3 },
  "2026": { "plataformas": { "MODIS (Terra/Aqua)": 18724, "VIIRS NOAA-20": 61000, "VIIRS NOAA-21": 58769 }, "n_plataformas": 3 }
}
```

## 3.2 Dónde mostrarlo

1. **Comparativa interanual**: badge en cada tarjeta de año con la cantidad de plataformas (`1 plataforma` / `3 plataformas`), y un tooltip con el detalle. Un año con `solo_modis: true` lleva además una nota fija: *«sólo MODIS: sin VIIRS en esta época»*.
2. **Pie de página**: *«Serie 2000-2026 · MODIS desde 2000 · VIIRS desde 2012 (Suomi-NPP), 2018 (NOAA-20) y 2024 (NOAA-21)»*.
3. **Página de método**: una tabla año → plataformas activas. Y la frase que convierte el problema en argumento:
   > «Los escalones del gráfico en 2002, 2012, 2018 y 2024 no son más incendios: son instrumentos nuevos. Ese es exactamente el artefacto que este proyecto existe para corregir.»
4. **Selector de año**: se genera desde los años presentes en `daily.json` (no hardcodear 2023-2026).

---

# 🟡 4. Los cuatro pendientes menores

| # | Qué | Cómo |
|---|---|---|
| 4.1 | **No hay inglés** | `web/src/i18n/{es,en}.ts` + selector en el navbar. Traducir etiquetas, **nunca los números**. Y el README ya está bilingüe: falta la UI y `docs/METHOD.md` |
| 4.2 | **«Ventana completa: 8 días» hardcodeado** en `FireMap.tsx` y en el standalone | derivar de `daily[0].d` y `daily[daily.length-1].d` |
| 4.3 | **Clave de CARTO como literal** en `FireMap.tsx` | sólo `process.env.NEXT_PUBLIC_CARTO_KEY`; en el standalone, placeholder que inyecta el generador. Y **restringirla por dominio** en el panel de CARTO |
| 4.4 | **Dos copias del calendario** en el repo | `data/calendar.json` (671 KB, 8 días viejos) → borrar. La buena es `web/public/data/` |

---

# ✅ 5. Criterio de aceptación

Antes de decir "listo":

- [ ] `python3 scripts/validate_standalone.py ignis-demo.html` → **exit 0**
- [ ] El chunk de `app/page` pesa **< 500 KB** (hoy: 52 MB)
- [ ] `daily.json` está en `web/public/data/` y pesa **< 1 MB**
- [ ] Hay **26 años** en el selector y ninguno dice "Pendiente"
- [ ] La comparativa interanual muestra el **mismo mes en 26 años**, con badge de plataformas
- [ ] Los años anteriores a 2012 muestran la nota **«sólo MODIS»**
- [ ] El pie declara el rango completo y las plataformas por época
- [ ] **Con el wifi apagado**: calendario, KPIs y comparativa funcionan; el mapa muestra "no disponible"
- [ ] `git log` tiene el backfill commiteado (los JSON en el repo, no generados en el build)
- [ ] Una captura de la comparativa interanual con datos reales

---

# 6. Si no llegás con todo

Orden de sacrificio, de lo que se puede perder a lo que no:

1. Se puede perder: inglés de la UI (queda el README bilingüe)
2. Se puede perder: mapa con lazy-load (dejar solo el año 2026 embebido)
3. Se puede perder: la serie temporal
4. **NO se puede perder**: `daily.json` en vez del import · la comparativa interanual con los años reales · la declaración de épocas

**Si el tiempo se acaba:** 26 años con `daily.json` y la declaración de épocas **es** el proyecto. El mapa es decoración.
