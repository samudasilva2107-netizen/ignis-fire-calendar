# Método — IGNIS

Este documento explica **cómo** se construye el calendario, **qué decisiones** se tomaron y **qué no se puede afirmar** con este producto. Está pensado para que cualquiera pueda reproducirlo o refutarlo.

---

## 1. El problema

MODIS y VIIRS detectan anomalías térmicas activas, pero sus registros **no son comparables directamente**:

| | MODIS (Terra/Aqua) | VIIRS (NOAA-20/21) |
|---|---|---|
| Resolución a nadir | 1 km × 1 km (1,00 km²) | 375 m × 375 m (0,1406 km²) |
| Canales de detección | 21/22 (3,95 µm) y 31 (11 µm) | I4 (3,74 µm) e I5 (11,45 µm) |
| Confianza | 0–100 continuo | `low` / `nominal` / `high` |
| Paso local aproximado | Terra ~10:30 / ~22:30 · Aqua ~13:30 / ~01:30 | N20 ~12:40 / ~00:40 · N21 ~13:30 / ~01:30 |
| Saturación del canal MIR | banda 21 ~500 K; banda 22 ~331 K | I4 ~367 K |

La diferencia de área de píxel es **7:1**. Eso significa que un mismo frente de fuego puede producir **una** detección en MODIS y **varias** en VIIRS. Sumar conteos sin normalizar produce series que no significan nada.

## 2. Qué hace el pipeline

1. **Descarga** los focos activos de NASA FIRMS (CSV públicos para 1/7 días; API Area para histórico).
2. **Rejilla común** de 0,05° (~5,6 km). Una celda puede contener varios píxeles de ambos sensores.
3. **Agrega por celda-día-sensor**: cantidad de detecciones, FRP máximo, FRP suma, confianza media, día/noche.
4. **Normaliza el FRP por área de píxel** (`MW/km²`), para que MODIS y VIIRS sean comparables en intensidad.
5. **Agrega a celda-día** (todos los sensores juntos) y conserva `por_sensor` como procedencia.
6. **Calcula KPIs en runtime** desde el JSON, nunca hardcodeados: totales, ratio, FRP medio, coincidencia celda-día.

## 3. Las cuatro decisiones que definen el producto

### 3.1 Una rejilla común, no dos capas superpuestas

La mayoría de los tableros muestran dos capas de puntos. Eso no es armonizar: es dibujar. Armonizar implica llevar ambos sensores a una unidad espacial común y declararla.

### 3.2 FRP normalizado por área

El FRP es una magnitud extensiva. Comparar 1,00 km² contra 0,1406 km² sin normalizar sobreestima sistemáticamente a VIIRS.

### 3.3 Sin equivalencia inventada de confianza

**La NASA no define una equivalencia rigurosa** entre el índice continuo de MODIS y las clases discretas de VIIRS: el primero es una media geométrica de pruebas contextuales; el segundo, un árbol de decisión donde `high` señala **saturación del canal I4**, no mayor probabilidad.

Por eso **no fabricamos un número único de confianza**. Reportamos cada sensor con su escala y declaramos el supuesto. Cuando hace falta un filtro operativo, se usa el criterio conservador: MODIS ≥ 30 y VIIRS `nominal` + `high`.

### 3.4 «Sin datos» es un estado, no un cero

Un día sin detecciones puede significar: (a) no hubo fuego, (b) no hubo sobrepaso, (c) hubo nubes densas. El producto de focos activos **no trae máscara de nubes**, así que no se puede distinguir (b) y (c) de (a) con certeza.

**Regla implementada:** si *ninguna* celda del AOI registró detecciones en la jornada, la jornada se marca como **«sin datos confirmados»** (achurado). Si otras celdas sí registraron, las celdas vacías se muestran como «sin fuego».

Es una aproximación, y está declarada como tal.

## 4. Continuidad y Épocas Satelitales: el argumento central

La serie temporal de detección satelital cubre más de dos décadas y media, durante las cuales la constelación fue incorporando sensores con resoluciones geométricas dispares:

| Época | Plataformas Activas | Resolución Mínima | Sensores Operativos |
|---|---|---|---|
| **2000 – 2002** | Terra (MODIS) | 1.000 m | Sólo MODIS (1 plataforma) |
| **2002 – 2012** | Terra + Aqua (MODIS) | 1.000 m | MODIS bicúspide (2 plataformas) |
| **2012 – 2018** | Terra + Aqua + Suomi-NPP | 375 m | MODIS + VIIRS (3 plataformas) |
| **2018 – 2024** | Terra + Aqua + NPP + NOAA-20 | 375 m | MODIS + VIIRS (4 plataformas) |
| **2024 – 2026** | Terra + Aqua + NPP + N20 + NOAA-21 | 375 m | MODIS + VIIRS (5 plataformas) |

> **Principio de interpretación:** *«Los escalones del gráfico en 2002, 2012, 2018 y 2024 no son más incendios: son instrumentos nuevos. Ese es exactamente el artefacto que este proyecto existe para corregir.»*

MODIS está saliendo de su vida operativa. Suomi-NPP **cesó transmisiones el 2026-11-02 a las 13:00 UTC** (alerta oficial de NASA Earthdata), lo que deja a VIIRS con dos plataformas principales (NOAA-20 y NOAA-21).

Una serie que mezcle sensores sin armonizar **se corta** en ese punto y genera saltos artificiales. Una serie armonizada sobre rejilla común, con FRP normalizado y procedencia conservada, **continúa**: cada punto sigue siendo comparable aunque cambie el instrumento que lo produjo.

Ese es el objetivo de la autora del desafío: *«que al final no importe si un foco vino de un sensor o del otro; el foco real está en las tendencias, anomalías y patrones»*.

## 5. Detección de anomalías

- **Con ventana corta (demo, 8 días):** percentil 90 del FRP diario de la ventana. Con 8 valores, el p90 por rango más cercano coincide casi siempre con el día máximo: es una marca informativa, no estadística.
- **Con histórico (backfill):** el criterio correcto es el **percentil 90 del mismo día-del-año** a través de los años disponibles. Ahí la anomalía significa: *«este 12 de agosto estuvo por encima del 90 % de los 12 de agosto anteriores»*.

## 6. Qué NO se puede afirmar

| No se puede | Por qué | Qué usar en su lugar |
|---|---|---|
| Superficie quemada | El foco activo mide combustión instantánea | MCD64A1 (mensual) o Sentinel-2 |
| Causa o intencionalidad | El sensor ve calor, no intención | Cruce con uso del suelo y registros de quema autorizada |
| Hora exacta de ignición/extinción | Sobrepasos cada ~12 h | Observación continua en superficie |
| «Día sin incendios» a partir de cero detecciones | Puede haber nubosidad o falta de pasada | Estado «sin datos confirmados» |
| Precisión validada contra campo | No hay validación de campo en este producto | Mencionar como limitación |

## 7. Citas

1. **Giglio, L., Schroeder, W., Justice, C. O.** — *The Collection 6 MODIS active fire detection algorithm and fire products*, Remote Sensing of Environment (2016). Producto MOD14/MYD14, confianza 0–100.
2. **Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. A.** — *The New VIIRS 375 m active fire detection data product*, Remote Sensing of Environment (2014). Producto VNP14IMG, clases `low/nominal/high`.
3. **Wooster, M. J. et al.** — Fire Radiative Power (FRP) retrieval from MIR radiance; base de la fórmula de FRP usada en ambos productos.
4. **GWIS / EFFIS (Joint Research Centre, Comisión Europea)** y **GFED4s** (Global Fire Emissions Database) — antecedentes de series armonizadas y de estadística estacional de incendios a escala global.
5. **NASA Earthdata** — *Suomi NPP Observations to Cease on November 2, 2026* (alerta oficial, actualizada 14/10/2026).

## 8. Antecedentes y honestidad sobre la novedad

El método de armonizar productos de fuego **no es nuevo**: GWIS, EFFIS, GFED4s y ESA Fire CCI publican series multianuales corregidas por cambio de sensor.

Lo que **no** existe como producto abierto es la combinación que ofrece IGNIS:

- focos activos (no área quemada),
- para un **área de interés arbitraria**,
- con **estado de cobertura explícito** por celda-día,
- y **procedencia por sensor** conservada para auditoría.

> **Frase correcta para presentar:** «esto existe en la investigación, pero no como herramienta abierta por AOI con estados de cobertura explícitos. No inventamos el método: construimos la herramienta que faltaba».

**Nunca** afirmar que nadie lo hizo antes: es falso y verificable en un minuto.
