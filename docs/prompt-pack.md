# Cuaderno NotebookLM — IGNIS / Space Apps 2026
## Paquete de prompts y fuentes oficiales (auditable + dise\u00f1o de interfaces + ESP32)

**Uso:** copiá cada bloque tal cual. Los prompts están escritos para que NotebookLM **no invente**: exigen cita, versión del producto y fecha.

---

# BLOQUE 0 — Prompt de arranque (pegar PRIMERO, como nota del cuaderno)

```
REGLAS DEL CUADERNO (obligatorias para todas las respuestas):

1. Cada afirmación numérica debe ir con cita del documento fuente y la sección/página.
2. Si un dato no está en las fuentes cargadas, respondé exactamente: "NO ESTÁ EN LAS FUENTES".
   No completes con conocimiento general.
3. Distinguí siempre: DATO (textual de la fuente) / INFERENCIA (deducción tuya) / SUPUESTO.
4. Cuando dos productos tengan unidades o escalas distintas, mostralas en tabla comparativa
   antes de proponer cualquier armonización.
5. Toda resolución espacial va en metros Y en grados. Toda hora va en UTC Y en hora solar local.
6. Prohibido usar cifras de blogs, Wikipedia o papers sin DOI. Solo fuentes oficiales cargadas.
7. Si hay conflicto entre dos fuentes, listá ambas y decí cuál es más reciente y por qué.
8. Al final de cada respuesta, agregá: "FALTANTES: " con la lista de datos que faltaría
   para responder con certeza.
```

---

# BLOQUE A — Prompts para ENCONTRAR fuentes (Discover sources / búsqueda web)

Pegá uno por vez en el buscador de fuentes de NotebookLM o en Google.

**A1 — Núcleo del desafío**
```
NASA FIRMS active fire data MODIS MOD14 Collection 6.1 user guide official
NASA FIRMS VIIRS 375m I-band active fire product user guide VNP14IMG official
```

**A2 — Comparabilidad entre sensores**
```
MODIS vs VIIRS active fire detection comparison harmonization peer reviewed DOI
VIIRS 375 m active fire product validation MODIS 1 km overpass differences
```

**A3 — Calendario / estacionalidad de incendios**
```
Global Fire Emissions Database GFED4s monthly burned area official documentation
ESA Fire CCI climate change initiative fire disturbance dataset documentation
GWIS Global Wildfire Information System JRC data documentation
```

**A4 — Confianza y falsos positivos**
```
MODIS active fire confidence classes 0-100 false alarm agricultural burning
VIIRS confidence low nominal high classification fire product
gas flare volcano false positive MODIS active fire type field
```

**A5 — API y formatos**
```
FIRMS API area CSV endpoint parameters MAP_KEY documentation official
FIRMS active fire data attributes latitude longitude brightness scan track acq_date acq_time
```

**A6 — Para el módulo terrestre**
```
low cost PM2.5 sensor wildfire smoke validation satellite active fire ground truth study DOI
PurpleAir sensor network satellite fire detection validation calibration
ESP32 PMS5003 MQ-7 wildfire smoke node calibration humidity correction
```

**A7 — Diseño de interfaz de datos ambientales**
```
wildfire monitoring dashboard UI calendar heatmap design data visualization best practices
NASA Earthdata visualization guidelines color palettes fire products accessibility
```

---

# BLOQUE B — URLs oficiales verificadas (cargar a mano)

Verificado el 12/11/2026. Las marcadas **[403]** bloquean el acceso automático pero abren bien en el navegador.

| # | Fuente | URL |
|---|---|---|
| 1 | **FIRMS — portal** | https://firms.modaps.eosdis.nasa.gov/ |
| 2 | **FIRMS — API área (CSV)** | https://firms.modaps.eosdis.nasa.gov/api/area/ |
| 3 | **FIRMS — pedir MAP_KEY** | https://firms.modaps.eosdis.nasa.gov/api/map_key/ |
| 4 | **FIRMS — FAQ oficial** | https://www.earthdata.nasa.gov/data/tools/firms/faq **[403]** |
| 5 | **VIIRS I-band active fire (descripción)** | https://earthdata.nasa.gov/earth-observation-data/near-real-time/firms/viirs-i-band-active-fire-data |
| 6 | **Earthdata Login (obligatorio)** | https://urs.earthdata.nasa.gov/ |
| 7 | **VNP14IMG — producto VIIRS 375 m** | https://lpdaac.usgs.gov/products/vnp14imgv001/ **[403]** |
| 8 | **MOD14A1 — producto MODIS 1 km** | https://lpdaac.usgs.gov/products/mod14a1v061/ **[403]** |
| 9 | **GWIS — JRC (sistema global)** | https://gwis.jrc.ec.europa.eu/ |
| 10 | **EFFIS — incendios Europa** | https://forest-fire.emergency.copernicus.eu/ |
| 11 | **Copernicus EMS** | https://emergency.copernicus.eu/ |
| 12 | **NASA Worldview (imágenes)** | https://worldview.earthdata.nasa.gov/ |
| 13 | **NASA GIBS API (tiles)** | https://nasa-gibs.github.io/gibs-api-docs/ |
| 14 | **GFED4s — emisiones y área quemada** | https://www.globalfiredata.org/ |
| 15 | **ESA Fire CCI** | https://climate.esa.int/en/projects/fire/ |

**Prioridad de carga:** 1, 2, 3, 5, 7, 8, 9, 14. Con esas ocho el cuaderno ya responde el 90%.

---

# BLOQUE C — Prompts de EXTRACCIÓN TÉCNICA (el motor del proyecto)

**C1 — Ficha comparativa de productos**
```
Extraé de las fuentes una tabla con una fila por producto (MODIS MOD14/MYD14,
VIIRS VNP14IMG 375 m, VIIRS 750 m) y estas columnas:
sensor / satélite / resolución espacial (m y grados) / tamaño de píxel en el nadir /
hora de paso local aproximada / frecuencia / escala de confianza y qué significa cada valor /
unidades de temperatura de brillo / unidades de FRP / archivo de origen / fecha de inicio del archivo.
Cada celda con cita. Si un valor no está en las fuentes, escribí NO ESTÁ.
```

**C2 — Esquema exacto del CSV de FIRMS**
```
Listá todas las columnas del CSV de FIRMS para MODIS y para VIIRS, en orden,
con tipo de dato, unidad, rango válido y significado. Incluí qué valores puede tomar
"type", "daynight", "confidence" y "version". Citar la fuente de cada columna.
```

**C3 — Por qué no son comparables**
```
Enumerá, con cita, todas las diferencias que impiden comparar directamente MODIS 1 km
con VIIRS 375 m: tamaño de píxel, temperatura de brillo mínima detectable,
hora de sobrevuelo, sensibilidad a fuegos pequeños, efecto de nubosidad,
ángulo de visión, saturación del sensor. Para cada una, indicá el efecto esperado
sobre el conteo de focos (sobreestima / subestima / no afecta).
```

**C4 — Confianza: cómo unificar escalas**
```
Con las fuentes cargadas, proponé una tabla de equivalencia entre la confianza
0-100 de MODIS y las clases low/nominal/high de VIIRS. Justificá cada corte con cita.
Si las fuentes no permiten una equivalencia rigurosa, decilo explícitamente
y proponé la alternativa más defendible (p. ej. usar solo nominal+high en ambos).
```

**C5 — FRP comparable**
```
¿Cómo se calcula el FRP en MODIS y en VIIRS según las fuentes? ¿Son directamente
comparables en MW? ¿Qué corrección hace falta por diferencia de área de píxel?
Mostrá la fórmula si está en la fuente y citá dónde.
```

**C6 — Cobertura temporal (esto decide si el calendario es honesto)**
```
Armá una línea de tiempo con la fecha de inicio y fin de cada archivo:
MODIS Terra, MODIS Aqua, VIIRS Suomi-NPP, VIIRS NOAA-20. Indicá en qué años
NO hay datos de cada sensor. Explicá qué artefactos aparecerían en un gráfico
de tendencia si no se corrige por cobertura.
```

**C7 — Definición operativa de "evento de incendio"**
```
Con las fuentes: ¿cómo se agrupan focos dispersos en un mismo incendio?
¿Existe en la documentación oficial un criterio de agrupamiento espacial o temporal?
Si no existe, proponé dos criterios defendibles (distancia y ventana temporal)
y decí cuál usarías para un calendario diario.
```

---

# BLOQUE D — Prompts para DISEÑO DE INTERFAZ PRECISA

**D1 — Contrato de datos por vista (antes de dibujar nada)**
```
Definí el contrato de datos de cada vista de la app, en formato:
vista / propósito / dato de entrada (nombre, tipo, unidad) / transformación /
salida visual / estados (vacío, cargando, error, sin cobertura satelital) /
acción del usuario.
Vistas mínimas: 1) selector de área de interés, 2) calendario de actividad,
3) serie temporal, 4) mapa de focos, 5) ficha de un día, 6) comparación entre sensores.
```

**D2 — Calendario de actividad (la vista central del desafío)**
```
Especificá el calendario de actividad de incendios con este nivel de detalle:
tipo de gráfico, ejes, granularidad (día/mes/año), codificación de color
(qué variable y qué escala), qué pasa cuando hay dos sensores en el mismo día,
cómo se marca "sin cobertura", leyenda, tooltip con campos exactos,
y cómo se resalta un "período crítico" detectado.
```

**D3 — Tokens de diseño**
```
Proponé un sistema visual para una app científica de incendios:
paleta (con HEX) que no conflictúe con las paletas de fuego estándar,
tipografía, escala de espaciado, radios, sombras, estados de foco,
y cómo garantizar contraste accesible (WCAG AA) sobre fondo oscuro.
Justificá la elección de color para no falsear la lectura del dato.
```

**D4 — Mockup textual de alta precisión**
```
Generá el mockup en ASCII/texto de la pantalla principal, con grilla explícita
(columnas, anchos, alturas), etiquetas exactas en español, y anotaciones
de qué dato alimenta cada bloque. Sin adjetivos: solo estructura.
```

**D5 — Coherencia narrativa para el pitch**
```
Escribí los 5 títulos de pantalla y los 3 mensajes clave que debe entender
un jurado no técnico en 90 segundos. Cada mensaje debe estar respaldado por un dato
de las fuentes, citado.
```

---

# BLOQUE E — Módulo ESP32 (validación terrestre)

**E1 — Alcance honesto**
```
Con las fuentes cargadas: ¿qué puede aportar una red de sensores terrestres de bajo costo
a un sistema de focos satelitales? Enumerá usos válidos y límites, con cita.
Incluí específicamente: validación de detecciones, detección de humo en superficie,
falsos positivos por quema agrícola, y cobertura entre sobrevuelos.
```

**E2 — Selección de sensores**
```
Para un nodo ESP32 de exterior orientado a humo de incendio, compará estos sensores
con especificaciones de hoja de datos: PMS5003/PMS7003 (PM1/PM2.5/PM10),
MQ-7 (CO), BME280 o SHT31 (T/RH/P), MLX90614 (IR de superficie).
Para cada uno: magnitud, rango, resolución, tiempo de respuesta, deriva,
sensibilidad a humedad, consumo y precio de referencia. Marcá lo que no esté en las fuentes.
```

**E3 — Protocolo de comparación satélite vs suelo**
```
Diseñá un protocolo para comparar una detección satelital con una lectura terrestre:
ventana temporal alrededor del paso del satélite, radio de búsqueda,
variables a comparar, criterio de coincidencia (éxito/fallo/dudoso)
y cómo reportar el resultado. Todo justificado con las fuentes.
```

**E4 — Plan B (crítico para un hackathon)**
```
Si el nodo físico falla el día del evento, ¿qué hace la app igual?
Proponé el modo degradado: datos pregrabados, simulador de nodo,
y cómo se declara en la interfaz que el dato es simulado.
```

---

# BLOQUE F — Prompt maestro de ARMONIZACIÓN (el corazón técnico)

```
Diseñá el pipeline de armonización de focos de incendio, paso por paso, con estas reglas:
1. Una rejilla espacial común (proponé tamaño en grados y en km, justificá con la
   resolución de los sensores).
2. Agregación temporal diaria en hora local solar, no UTC, explicando el efecto.
3. Variables por celda-día: presencia, cantidad de focos, FRP máximo, FRP suma,
   FRP normalizado por área, confianza unificada, día/noche, sensor de origen.
4. Tratamiento explícito de "sin cobertura" distinto de "sin incendio".
5. Criterio de detección de "período crítico" (propone percentil o z-score y justificá).
6. Lista de los 5 errores que arruinarían el resultado y cómo se evita cada uno.
Cada paso con la fuente que lo respalda o la marca de INFERENCIA.
```

---

# BLOQUE G — Verificación antes del sábado (preguntas de control)

Hacelas al cuaderno el viernes, si contesta bien, está listo:

1. «¿Cuál es la resolución espacial exacta de MODIS y de VIIRS y de dónde sale ese dato?»
2. «¿Por qué un mismo incendio puede dar 1 foco en MODIS y 5 en VIIRS?»
3. «¿Qué significa `confidence = 80` en MODIS y qué significa `h` en VIIRS?»
4. «¿Desde qué año hay datos de cada sensor y qué años no tienen cobertura?»
5. «¿Qué columnas trae el CSV de FIRMS y en qué unidades?»
6. «¿Qué no se puede afirmar con estos datos y por qué?»

Si alguna respuesta dice «NO ESTÁ EN LAS FUENTES», **falta cargar una fuente**, no está mal el cuaderno.

---

# Advertencias

- **No cargues blogs ni Wikipedia.** NotebookLM cita lo que le das: si le das basura, cita basura con tono seguro.
- **12 a 20 fuentes es mejor que 80.** Más fuentes, respuestas más vagas.
- **Renombrá cada fuente** con un nombre claro (`MODIS_C61_UserGuide`, `FIRMS_API`, `VNP14IMG_UG`) antes de subirla: así las citas se leen.
- **El nodo ESP32 es bonus, no columna vertebral.** En 48 h el jurado evalúa la app. Si el hardware falla y no hay plan B, resta.
- **Guardá cada respuesta buena como nota** en el cuaderno: el sábado vas a querer el texto, no la conversación.
