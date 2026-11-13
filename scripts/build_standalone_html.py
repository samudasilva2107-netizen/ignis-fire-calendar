import json
import os

def generate_analyst_dashboard():
    with open("data/calendar.json", "r", encoding="utf-8") as f:
        cal_data = json.load(f)

    cal_json_str = json.dumps(cal_data, ensure_ascii=False)
    carto_key = os.environ.get("NEXT_PUBLIC_CARTO_KEY") or os.environ.get("NEXT_PUBLIC_CARTO_API_KEY", "cb1_4iou_1_ac2dff443ff050beb7a80e54")

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IGNIS — Calendario de Actividad de Incendios</title>
  
  <!-- Leaflet CSS y JS local desde vendor/ con fallback -->
  <link rel="stylesheet" href="vendor/leaflet/leaflet.css" onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';" />
  <script src="vendor/leaflet/leaflet.js"></script>
  <script>
    if (typeof L === 'undefined') {{
      document.write('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\\/script>');
    }}
  </script>

  <style>
    /* Sistema de diseño autoritativo IGNIS (BASES-DEV / REVISIÓN V3) */
    :root {{
      --bg: #0D1117;
      --surface: #161B22;
      --border: #30363D;
      --text: #F0F6FC;
      --text-muted: #8B949E;
      --accent: #EA580C;
      --font-mono: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }}

    /* Estado sin datos: achurado oficial a 45° */
    .stripe-nodata {{
      background-color: var(--surface);
      background-image: repeating-linear-gradient(
        45deg,
        var(--surface),
        var(--surface) 4px,
        var(--border) 4px,
        var(--border) 5.5px
      );
    }}

    .font-mono {{ font-family: var(--font-mono); }}
    .text-muted {{ color: var(--text-muted); }}

    /* Header plano de 56px sin blur ni gradientes */
    header {{
      height: 56px;
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }}

    .card {{
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }}

    .btn {{
      background-color: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }}
    .btn:hover:not(:disabled) {{
      background-color: #21262D;
      border-color: #8B949E;
    }}
    .btn-active {{
      background-color: #21262D;
      border-color: var(--accent);
      color: #FFF;
      font-weight: 700;
    }}
    .btn:disabled {{
      opacity: 0.4;
      cursor: not-allowed;
    }}

    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }}
    @media (max-width: 1024px) {{
      .kpi-grid {{ grid-template-columns: repeat(2, 1fr); }}
    }}
    @media (max-width: 640px) {{
      .kpi-grid {{ grid-template-columns: 1fr; }}
    }}

    .kpi-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }}
    .aoi-header-info {{
      font-size: 11px;
      text-align: right;
      display: none;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }}
    @media (min-width: 768px) {{
      .aoi-header-info {{
        display: block;
      }}
    }}
    .kpi-val {{
      font-family: var(--font-mono);
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.1;
    }}
    .kpi-sub {{
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
      font-family: var(--font-mono);
    }}

    /* Matriz de calendario */
    .cal-grid {{
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-top: 12px;
    }}
    .cal-cell {{
      height: 76px;
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 2px;
      padding: 6px 8px;
      cursor: pointer;
      text-align: left;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.15s;
    }}
    .cal-cell:hover {{
      border-color: #8B949E;
    }}
    .cal-cell.selected {{
      border: 2px solid var(--accent) !important;
      background-color: #1c2128;
    }}
    .cal-cell.anomaly {{
      border: 1.5px dashed var(--accent);
    }}

    /* Leaflet popup */
    .leaflet-popup-content-wrapper {{
      background: var(--surface) !important;
      color: var(--text) !important;
      border: 1px solid var(--border) !important;
      border-radius: 6px !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
    }}
    .leaflet-popup-tip {{
      background: var(--surface) !important;
    }}

    /* Scrollbar */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: var(--bg); }}
    ::-webkit-scrollbar-thumb {{ background: var(--border); border-radius: 3px; }}
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 24px; height: 24px; background-color: var(--accent); color: #000; font-family: var(--font-mono); font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; border-radius: 2px;">
        IG
      </div>
      <div>
        <div style="font-weight: 700; font-size: 14px; letter-spacing: 0.03em; color: var(--text);">
          IGNIS — CALENDARIO DE ACTIVIDAD DE INCENDIOS
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
          CONAE · NASA SPACE APPS 2026 · SERIE ARMONIZADA MODIS / VIIRS
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 16px;">
      <div class="aoi-header-info">
        AOI: Centro-Norte Argentina (-68.5,-35.0,-56.0,-22.0)<br/>
        Rejilla: 0,05° (~5,6 km) · <span id="aoi-window-text">Ventana en carga...</span>
      </div>
      <button class="btn" onclick="exportAnalyticsCSV()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Descargar Analytics (CSV)
      </button>
    </div>
  </header>

  <!-- Contenedor principal -->
  <main style="padding: 20px 24px; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">

    <!-- 1. Fila de KPIs (5 cifras en fila compacta calculadas en RUNTIME) -->
    <section class="kpi-grid" id="kpi-row">
      <!-- Calculado en runtime -->
    </section>

    <!-- 2. Calendario de Actividad (Multi-año y Multi-mes) -->
    <section class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
        <div>
          <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
            Matriz de Calendario de Actividad
          </div>
          <div class="text-muted" style="font-size: 11px; margin-top: 2px;">
            Armonización histórica multianual: tendencias, anomalías (p90) y estacionalidad de fuego
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- Selector de Modo de Vista del Calendario -->
          <div style="display: flex; gap: 4px; background: #0D1117; padding: 2px; border-radius: 6px; border: 1px solid var(--border);">
            <button id="btn-view-month" class="btn btn-active" style="padding: 3px 8px;" onclick="setCalendarView('month')">Vista Mensual</button>
            <button id="btn-view-interannual" class="btn" style="padding: 3px 8px;" onclick="setCalendarView('interannual')">Comparativa Interanual</button>
          </div>

          <!-- Selector de Año (M3: renderizado dinámico con disabled + tooltip) -->
          <div id="year-buttons-container" style="display: flex; gap: 4px; background: #0D1117; padding: 2px; border-radius: 6px; border: 1px solid var(--border);">
            <!-- Generado dinámicamente según availableYears -->
          </div>

          <!-- Selector de Mes dinámico -->
          <select id="month-select" class="btn" onchange="changeMonth(this.value)" style="padding: 4px 8px;">
            <option value="11" selected>Noviembre (Ventana activa)</option>
            <option value="10">Octubre</option>
            <option value="9">Septiembre</option>
            <option value="8">Agosto</option>
            <option value="7">Julio (Caso Chilecito)</option>
            <option value="6">Junio</option>
            <option value="5">Mayo</option>
            <option value="4">Abril</option>
            <option value="3">Marzo</option>
            <option value="2">Febrero</option>
            <option value="1">Enero</option>
          </select>
        </div>
      </div>

      <!-- Leyenda técnica -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px;" class="text-muted">
        <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
          <span>Escala FRP:</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #1E232A; border-radius: 2px;"></span> 0 MW</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #D97706; border-radius: 2px;"></span> ≤ 50 MW</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #EA580C; border-radius: 2px;"></span> ≤ 250 MW</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #DC2626; border-radius: 2px;"></span> ≤ 1000 MW</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: #991B1B; border-radius: 2px;"></span> &gt; 1000 MW</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px;" class="stripe-nodata"></span> Sin datos</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border: 1.5px dashed var(--accent); border-radius: 2px;"></span> Anomalía p90</span>
        </div>

        <button id="btn-reset-day" class="btn" style="display: none; padding: 2px 8px;" onclick="selectDay(null)">
          Ver ventana completa
        </button>
      </div>

      <!-- Contenedor dinámico del calendario -->
      <div id="calendar-view-container">
        <!-- Renderizado dinámicamente: Vista mensual o Comparativa interanual -->
      </div>
    </section>

    <!-- 3. Mapa y Ficha de Inspección -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
      
      <!-- Mapa Leaflet con CARTO basemap key del usuario -->
      <section class="card" style="display: flex; flex-direction: column; height: 580px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <span style="font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
              Serie Única Armonizada (Focos en Rejilla 0,05°)
            </span>
            <span id="map-active-label" class="font-mono text-muted" style="font-size: 11px; margin-left: 8px;"></span>
          </div>

          <!-- Selector de procedencia (provenance como vista secundaria) -->
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-active" id="btn-mode-unified" onclick="setMapMode('unified')">Serie Armonizada</button>
            <button class="btn" id="btn-mode-provenance" onclick="setMapMode('provenance')">Auditoría Sensor</button>
          </div>
        </div>

        <div id="map" style="flex: 1; border-radius: 6px; border: 1px solid var(--border); width: 100%;"></div>

        <!-- Barra inferior del mapa -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; font-family: var(--font-mono);" class="text-muted">
          <div id="provenance-legend">
            <span>Vista: Magnitud unificada FRP (escala oficial). Círculos proporcionales a radiación MW.</span>
          </div>
          <div>Centro-Norte Argentina · CARTO Dark Matter</div>
        </div>
      </section>

      <!-- Ficha del Día y Top Celdas -->
      <section class="card" style="display: flex; flex-direction: column; height: 580px; padding: 16px;" id="day-sheet">
        <!-- Inyectado por JS -->
      </section>
    </div>

    <!-- 4. Resumen Metodológico Oficial (Marco CONAE / NASA FIRMS) -->
    <section class="card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px;">
      <div>
        <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; color: var(--text);">
          Marco del Desafío (Marina Companuchi, CONAE)
        </div>
        <p class="text-muted" style="margin-bottom: 8px; line-height: 1.6;">
          «MODIS está saliendo de su vida operativa. Si no hay un método para comparar sus datos, casi 10 años de información histórica se van a perder... Tu desafío es desarrollar un calendario que combine la historia de MODIS con la continuidad de VIIRS, para que al final no importe de qué sensor vino el foco».
        </p>
        <p class="text-muted" style="line-height: 1.6;">
          El 14,6% de coincidencia medido en el AOI no es un error de detección: es la prueba empírica de que un píxel de 375 m ve quemas agrícolas, industriales y desmontes chicos que el píxel de 1.000 m de MODIS ignora.
        </p>
      </div>

      <div style="border-left: 1px solid var(--border); padding-left: 20px;">
        <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; color: var(--text);">
          Límites de Uso y Declaración del Producto
        </div>
        <ul class="text-muted" style="list-style: none; display: flex; flex-direction: column; gap: 5px;">
          <li>• <strong>No estima superficie quemada:</strong> mide calor radiativo puntual (MW), no cicatrices (MCD64A1).</li>
          <li>• <strong>No infiere causalidad:</strong> detecta energía térmica sin discernir intencionalidad o ignición.</li>
          <li>• <strong>Paso orbital discreto:</strong> las observaciones se registran en sobrevuelos cada ~12 horas.</li>
          <li>• <strong>Criterio de anomalía:</strong> percentil 90 del FRP diario para el mismo día del año.</li>
        </ul>
      </div>
    </section>

  </main>

  <footer style="border-top: 1px solid var(--border); background-color: var(--surface); padding: 14px 24px; text-align: center; font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); display: flex; justify-content: space-between;">
    <div>IGNIS · Calendario de Actividad de Incendios · Sede Bahía Blanca</div>
    <div id="footer-source-info">Fuente: NASA FIRMS (MODIS C6.1 / VIIRS C2) · NRT</div>
  </footer>

  <!-- Lógica y Datos Embebidos en Runtime -->
  <script>
    const CARTO_API_KEY = "{carto_key}";
    const CALENDAR = {cal_json_str};
    const supportedYears = ["2026", "2025", "2024", "2023"];
    const availableYears = Array.from(new Set((CALENDAR.days || []).map(d => d.slice(0, 4)))).sort().reverse();

    function renderYearButtons() {{
      const container = document.getElementById("year-buttons-container");
      if (!container) return;
      container.innerHTML = supportedYears.map(y => {{
        const hasData = availableYears.includes(y);
        const isSelected = selectedYear === parseInt(y, 10);
        if (hasData) {{
          return `<button class="btn ${{isSelected ? 'btn-active' : ''}}" style="padding: 3px 8px;" onclick="changeYear(${{y}})">${{y}}</button>`;
        }} else {{
          return `<button class="btn" style="padding: 3px 8px;" disabled title="Año ${{y}}: backfill histórico pendiente">${{y}}</button>`;
        }}
      }}).join("");
    }}

    let selectedDay = null;
    let selectedYear = 2026;
    let selectedMonth = 11;
    let calendarViewMode = "month"; // "month" | "interannual"
    let mapMode = "unified"; // "unified" | "provenance"
    let map = null;
    let mapLayer = null;

    // Fórmulas oficiales en RUNTIME
    function computeKPIs() {{
      const cells = CALENDAR.cells || [];
      let totalDetecciones = 0;
      let modisDetecciones = 0;
      let viirsDetecciones = 0;
      let frpModis = 0;
      let frpViirs = 0;
      let ambos = 0, soloModis = 0, soloViirs = 0;

      cells.forEach(c => {{
        Object.values(c.days).forEach(d => {{
          totalDetecciones += d.n;
          if (d.por_sensor) {{
            if (d.por_sensor.MODIS) {{
              modisDetecciones += d.por_sensor.MODIS.n;
              frpModis += d.por_sensor.MODIS.frp_sum;
            }}
            if (d.por_sensor.VIIRS) {{
              viirsDetecciones += d.por_sensor.VIIRS.n;
              frpViirs += d.por_sensor.VIIRS.frp_sum;
            }}
          }}
          const s = d.sensores || [];
          if (s.length > 1) ambos++;
          else if (s.includes("MODIS")) soloModis++;
          else if (s.includes("VIIRS")) soloViirs++;
        }});
      }});

      const totCD = ambos + soloModis + soloViirs || 1;
      const pctAmbos = (ambos / totCD) * 100;
      const pctSoloMod = (soloModis / totCD) * 100;
      const pctSoloVii = (soloViirs / totCD) * 100;
      const ratio = modisDetecciones > 0 ? (viirsDetecciones / modisDetecciones) : 0;
      const frpTotal = frpModis + frpViirs;
      const frpMedioMod = modisDetecciones > 0 ? (frpModis / modisDetecciones) : 0;
      const frpMedioVii = viirsDetecciones > 0 ? (frpViirs / viirsDetecciones) : 0;

      return {{
        totalDetecciones,
        modisDetecciones,
        viirsDetecciones,
        ratio: ratio.toFixed(2),
        frpTotal: Math.round(frpTotal),
        frpMedioMod: frpMedioMod.toFixed(2),
        frpMedioVii: frpMedioVii.toFixed(2),
        pctAmbos: pctAmbos.toFixed(1),
        pctSoloMod: pctSoloMod.toFixed(1),
        pctSoloVii: pctSoloVii.toFixed(1),
        totalCeldas: cells.length
      }};
    }}

    function getFRPColor(frp) {{
      if (frp <= 0) return "#1E232A";
      if (frp <= 50) return "#D97706";
      if (frp <= 250) return "#EA580C";
      if (frp <= 1000) return "#DC2626";
      return "#991B1B";
    }}

    function renderKPIs() {{
      const k = computeKPIs();
      const el = document.getElementById("kpi-row");
      el.innerHTML = `
        <div class="card">
          <div class="kpi-label">Detecciones Totales</div>
          <div class="kpi-val">${{k.totalDetecciones.toLocaleString()}}</div>
          <div class="kpi-sub">MODIS: ${{k.modisDetecciones.toLocaleString()}} · VIIRS: ${{k.viirsDetecciones.toLocaleString()}}</div>
        </div>

        <div class="card">
          <div class="kpi-label">Ratio VIIRS / MODIS</div>
          <div class="kpi-val">${{k.ratio}}×</div>
          <div class="kpi-sub">Resolución: 375 m vs 1.000 m</div>
        </div>

        <div class="card">
          <div class="kpi-label">Coincidencia en AOI</div>
          <div class="kpi-val">${{k.pctAmbos}}%</div>
          <div class="kpi-sub">VIIRS solo: ${{k.pctSoloVii}}% · MODIS solo: ${{k.pctSoloMod}}%</div>
        </div>

        <div class="card">
          <div class="kpi-label">FRP Total & Medio</div>
          <div class="kpi-val">${{k.frpTotal.toLocaleString()}} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">MW</span></div>
          <div class="kpi-sub">Medio: MODIS ${{k.frpMedioMod}} MW · VIIRS ${{k.frpMedioVii}} MW</div>
        </div>

        <div class="card">
          <div class="kpi-label">Celdas Armonizadas</div>
          <div class="kpi-val">${{k.totalCeldas.toLocaleString()}}</div>
          <div class="kpi-sub">Rejilla común 0,05° (~5,6 km)</div>
        </div>
      `;
    }}

    // Cálculo del percentil 90 para anomalías
    function computeDailyAnomalies() {{
      const days = CALENDAR.days || [];
      const dailyFRP = {{}};

      days.forEach(d => {{
        dailyFRP[d] = 0;
        CALENDAR.cells.forEach(c => {{
          const m = c.days[d];
          if (m) dailyFRP[d] += m.frp_max;
        }});
      }});

      const values = Object.values(dailyFRP).sort((a, b) => a - b);
      const p90Index = Math.floor(values.length * 0.9);
      const p90Threshold = values[p90Index] || 0;

      const anomalies = {{}};
      Object.keys(dailyFRP).forEach(d => {{
        anomalies[d] = dailyFRP[d] >= p90Threshold && dailyFRP[d] > 0;
      }});

      return {{ dailyFRP, anomalies, p90Threshold }};
    }}

    function renderCalendar() {{
      const container = document.getElementById("calendar-view-container");
      const {{ dailyFRP, anomalies }} = computeDailyAnomalies();

      if (calendarViewMode === "interannual") {{
        // Vista comparativa interanual del mes a través de los años (requisito formal de Marina Companuchi)
        const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const mName = monthNames[selectedMonth];
        const mPrefix = String(selectedMonth).padStart(2, "0");

        const cardsHtml = supportedYears.map(y => {{
          const prefix = `${{y}}-${{mPrefix}}`;
          const daysInMonthYear = (CALENDAR.days || []).filter(d => d.startsWith(prefix));
          let foci = 0;
          let maxFRP = 0;

          if (daysInMonthYear.length > 0) {{
            CALENDAR.cells.forEach(c => {{
              daysInMonthYear.forEach(dt => {{
                const m = c.days[dt];
                if (m) {{
                  foci += m.n;
                  maxFRP = Math.max(maxFRP, m.frp_max);
                }}
              }});
            }});
            return `
              <div class="card" style="border-color: var(--accent); background: #1c2128;">
                <div class="kpi-label">Año ${{y}} (${{mName}})</div>
                <div class="kpi-val">${{foci.toLocaleString()}}</div>
                <div class="kpi-sub">${{daysInMonthYear.length}} días auditados · ${{Math.round(maxFRP)}} MW máx</div>
              </div>
            `;
          }} else if (availableYears.includes(y)) {{
            return `
              <div class="card" style="border-color: var(--border); background: var(--surface);">
                <div class="kpi-label">Año ${{y}} (${{mName}})</div>
                <div class="kpi-val" style="color: var(--text-muted);">0</div>
                <div class="kpi-sub">0 focos registrados</div>
              </div>
            `;
          }} else {{
            return `
              <div class="card stripe-nodata" style="opacity: 0.65;">
                <div class="kpi-label">Año ${{y}} (${{mName}})</div>
                <div class="kpi-val" style="color: var(--text-muted); font-size: 20px;">Pendiente</div>
                <div class="kpi-sub">python3 scripts/backfill_firms.py</div>
              </div>
            `;
          }}
        }}).join("");

        container.innerHTML = `
          <div style="margin-top: 14px;">
            <div style="font-family: var(--font-mono); font-size: 12px; margin-bottom: 12px; color: var(--text-muted);">
              COMPARATIVA INTERANUAL DEL MES DE <strong style="color: #FFF;">${{mName.toUpperCase()}}</strong> A TRAVÉS DE LOS AÑOS:
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              ${{cardsHtml}}
            </div>

            <div style="margin-top: 12px; font-family: var(--font-mono); font-size: 11px;" class="text-muted">
              Esta vista responde literalmente el mandato del brief: <em>«cuántos focos tuvo un mes particular a través de diferentes años»</em>.
              Al completar el backfill histórico con <code style="color: var(--accent);">python3 scripts/backfill_firms.py</code> se pueblan automáticamente los años históricos disponibles.
            </div>
          </div>
        `;
        return;
      }}

      // VISTA MENSUAL DINÁMICA (4.1: Quitar hardcode de días y offsets)
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      // Lun=0, Mar=1 ... Dom=6
      const firstWeekday = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;

      let monthHtml = `
        <div style="grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 10px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-align: center; display: grid;">
          <div>LUN</div><div>MAR</div><div>MIÉ</div><div>JUE</div><div>VIE</div><div>SÁB</div><div>DOM</div>
        </div>
        <div class="cal-grid">
      `;

      // Offset inicial
      for (let i = 0; i < firstWeekday; i++) {{
        monthHtml += `<div style="height: 76px; opacity: 0.15; border-radius: 2px;" class="stripe-nodata"></div>`;
      }}

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {{
        const dayStr = `${{selectedYear}}-${{String(selectedMonth).padStart(2, "0")}}-${{String(dayNum).padStart(2, "0")}}`;
        const hasData = CALENDAR.days.includes(dayStr);
        const isSelected = selectedDay === dayStr;
        const isAnomaly = anomalies[dayStr];

        if (hasData) {{
          let dayFoci = 0;
          let maxFRP = 0;
          CALENDAR.cells.forEach(c => {{
            const m = c.days[dayStr];
            if (m) {{
              dayFoci += m.n;
              maxFRP = Math.max(maxFRP, m.frp_max);
            }}
          }});

          const color = getFRPColor(maxFRP);

          monthHtml += `
            <div class="cal-cell ${{isSelected ? 'selected' : ''}} ${{isAnomaly ? 'anomaly' : ''}}" onclick="selectDay('${{dayStr}}')">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span class="font-mono" style="font-size: 11px; font-weight: 700; color: #FFF;">${{dayNum}}</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                  ${{isAnomaly ? '<span style="font-size: 9px; font-family: var(--font-mono); color: var(--accent); font-weight: bold;">p90</span>' : ''}}
                  <span style="width: 8px; height: 8px; border-radius: 2px; background-color: ${{color}};"></span>
                </div>
              </div>
              <div>
                <div class="font-mono" style="font-size: 14px; font-weight: 700; color: #FFF;">${{dayFoci.toLocaleString()}}</div>
                <div class="font-mono text-muted" style="font-size: 10px;">${{Math.round(maxFRP)}} MW máx</div>
              </div>
            </div>
          `;
        }} else {{
          monthHtml += `
            <div class="cal-cell stripe-nodata" style="opacity: 0.6; cursor: not-allowed;" title="Sin datos satelitales en esta fecha">
              <span class="font-mono text-muted" style="font-size: 11px;">${{dayNum}}</span>
              <span class="font-mono text-muted" style="font-size: 10px;">Sin datos</span>
            </div>
          `;
        }}
      }}

      monthHtml += `</div>`;
      container.innerHTML = monthHtml;
      document.getElementById("btn-reset-day").style.display = selectedDay ? "inline-flex" : "none";
    }}

    function changeMonth(val) {{
      selectedMonth = parseInt(val, 10);
      renderCalendar();
    }}

    function changeYear(y) {{
      selectedYear = y;
      renderYearButtons();
      renderCalendar();
    }}

    function setCalendarView(mode) {{
      calendarViewMode = mode;
      document.getElementById("btn-view-month").className = mode === "month" ? "btn btn-active" : "btn";
      document.getElementById("btn-view-interannual").className = mode === "interannual" ? "btn btn-active" : "btn";
      renderCalendar();
    }}

    function selectDay(d) {{
      selectedDay = d;
      renderCalendar();
      renderMap();
      renderDaySheet();
    }}

    function formatWindow(days) {{
      if (!days || days.length === 0) return "Sin datos";
      const d0 = days[0];
      const dEnd = days[days.length - 1];
      const p0 = d0.split("-");
      const pEnd = dEnd.split("-");
      const months = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      if (p0[0] === pEnd[0] && p0[1] === pEnd[1]) {{
        return `${{parseInt(p0[2], 10)}}–${{parseInt(pEnd[2], 10)}} ${{months[parseInt(p0[1], 10)]}} ${{p0[0]}}`;
      }}
      return `${{d0}} a ${{dEnd}}`;
    }}

    function setMapMode(mode) {{
      mapMode = mode;
      document.getElementById("btn-mode-unified").className = mode === "unified" ? "btn btn-active" : "btn";
      document.getElementById("btn-mode-provenance").className = mode === "provenance" ? "btn btn-active" : "btn";
      document.getElementById("provenance-legend").innerHTML = mode === "unified"
        ? "<span>Vista: Magnitud unificada FRP (escala oficial). Círculos proporcionales a radiación MW.</span>"
        : "<span>Auditoría de Procedencia: <span style='color: #D97706;'>● Solo MODIS</span> · <span style='color: #EA580C;'>● Solo VIIRS</span> · <span style='color: #F0F6FC;'>● Ambos sensores</span></span>";
      renderMap();
    }}

    function initMap() {{
      const mapEl = document.getElementById("map");
      if (!mapEl) return;

      try {{
        if (typeof L === "undefined") {{
          throw new Error("Librería Leaflet no disponible en vendor/leaflet/leaflet.js");
        }}

        map = L.map("map", {{
          center: [-28.5, -62.0],
          zoom: 5.5,
          minZoom: 4,
          maxZoom: 12,
          attributionControl: true
        }});

        // Usando la clave de CARTO provista por el usuario (parámetro oficial ?key=)
        const cartoUrl = "https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png?key=" + CARTO_API_KEY;
        
        const cartoLayer = L.tileLayer(cartoUrl, {{
          subdomains: "abcd",
          maxZoom: 19,
          attribution: '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
        }}).addTo(map);

        // Fallback a Esri en caso de fallo de red
        cartoLayer.on("tileerror", function() {{
          console.warn("CARTO tile error, activando fallback Esri Dark Canvas");
          L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{{z}}/{{y}}/{{x}}", {{
            maxZoom: 16
          }}).addTo(map);
        }});

        mapLayer = L.layerGroup().addTo(map);
        renderMap();
      }} catch (err) {{
        console.error("Error al inicializar visor cartográfico:", err);
        mapEl.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-family: var(--font-mono); text-align: center; padding: 20px; background: #12161c;">
            <div style="font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 6px;">MAPA NO DISPONIBLE</div>
            <div style="font-size: 11px;">No se pudo inicializar la librería cartográfica (offline sin vendor/leaflet o recurso bloqueado).</div>
            <div style="font-size: 10px; margin-top: 8px; opacity: 0.7;">${{err.message || ""}}</div>
          </div>
        `;
      }}
    }}

    function renderMap() {{
      if (!mapLayer) return;
      mapLayer.clearLayers();

      const totalDays = (CALENDAR.days || []).length;
      const label = document.getElementById("map-active-label");
      label.innerText = selectedDay ? `[Día seleccionado: ${{selectedDay}}]` : `[Ventana completa: ${{totalDays}} días]`;

      CALENDAR.cells.forEach(cell => {{
        const relevant = selectedDay ? [cell.days[selectedDay]].filter(Boolean) : Object.values(cell.days);
        if (relevant.length === 0) return;

        let n = 0;
        let frp = 0;
        const sensors = new Set();

        relevant.forEach(d => {{
          n += d.n;
          frp = Math.max(frp, d.frp_max);
          d.sensores.forEach(s => sensors.add(s));
        }});

        if (n === 0) return;

        const isBoth = sensors.has("MODIS") && sensors.has("VIIRS");
        const isModis = sensors.has("MODIS");

        let color = getFRPColor(frp);
        if (mapMode === "provenance") {{
          if (isBoth) color = "#F0F6FC";
          else if (isModis) color = "#D97706";
          else color = "#EA580C";
        }}

        const radius = Math.min(Math.max(Math.sqrt(n) * 2200, 2500), 12000);

        const circle = L.circle([cell.lat, cell.lon], {{
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          weight: 1,
          radius: radius
        }});

        circle.bindPopup(`
          <div style="font-family: var(--font-mono); font-size: 11px; padding: 4px;">
            <div style="font-weight: 700; color: #FFF; margin-bottom: 4px;">Celda (${{cell.lat.toFixed(3)}}, ${{cell.lon.toFixed(3)}})</div>
            <div style="color: var(--text-muted);">${{selectedDay ? "Fecha: " + selectedDay : "Ventana acumulada"}}</div>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid var(--border);"/>
            <div><strong>Detecciones:</strong> ${{n}}</div>
            <div><strong>FRP Máx:</strong> ${{frp.toFixed(1)}} MW</div>
            <div><strong>Procedencia:</strong> ${{isBoth ? 'MODIS + VIIRS (Coincidencia)' : (isModis ? 'Solo MODIS (1 km)' : 'Solo VIIRS (375 m)')}}</div>
          </div>
        `);

        circle.addTo(mapLayer);
      }});
    }}

    function renderDaySheet() {{
      const el = document.getElementById("day-sheet");

      if (!selectedDay) {{
        el.innerHTML = `
          <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            Ficha de Inspección Diaria
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); padding: 20px;">
            <div style="font-size: 12px; margin-bottom: 8px; color: var(--text);">Ningún día seleccionado</div>
            <div style="font-size: 11px; line-height: 1.5; max-width: 240px;">
              Hacé clic en cualquier celda activa del calendario mensual (5 al 12 de noviembre) para inspeccionar la jornada.
            </div>
          </div>
        `;
        return;
      }}

      const activeCells = [];
      let totalDetections = 0;
      let maxFRP = 0;
      let modCount = 0, viiCount = 0;
      let bothCount = 0, onlyMod = 0, onlyVii = 0;

      CALENDAR.cells.forEach(c => {{
        const m = c.days[selectedDay];
        if (m && m.n > 0) {{
          activeCells.push({{ lat: c.lat, lon: c.lon, n: m.n, frp_max: m.frp_max, sensores: m.sensores, por_sensor: m.por_sensor }});
          totalDetections += m.n;
          maxFRP = Math.max(maxFRP, m.frp_max);
          if (m.por_sensor) {{
            if (m.por_sensor.MODIS) modCount += m.por_sensor.MODIS.n;
            if (m.por_sensor.VIIRS) viiCount += m.por_sensor.VIIRS.n;
          }}
          const hasM = m.sensores.includes("MODIS");
          const hasV = m.sensores.includes("VIIRS");
          if (hasM && hasV) bothCount++;
          else if (hasM) onlyMod++;
          else if (hasV) onlyVii++;
        }}
      }});

      activeCells.sort((a, b) => b.frp_max - a.frp_max);
      const totCeldas = bothCount + onlyMod + onlyVii || 1;
      const pctBoth = Math.round((bothCount / totCeldas) * 100);

      el.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <div>
            <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-family: var(--font-mono);">Jornada analizada</div>
            <div style="font-size: 16px; font-weight: 700; font-family: var(--font-mono); color: #FFF;">${{selectedDay}}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">Coincidencia día</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--accent);">${{pctBoth}}%</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 12px 0;">
          <div style="background: var(--bg); border: 1px solid var(--border); padding: 8px; border-radius: 4px;">
            <div class="kpi-label" style="font-size: 9px; margin: 0;">Focos</div>
            <div class="font-mono" style="font-size: 16px; font-weight: 700;">${{totalDetections}}</div>
            <div class="font-mono text-muted" style="font-size: 9px;">M: ${{modCount}} · V: ${{viiCount}}</div>
          </div>
          <div style="background: var(--bg); border: 1px solid var(--border); padding: 8px; border-radius: 4px;">
            <div class="kpi-label" style="font-size: 9px; margin: 0;">FRP Máx</div>
            <div class="font-mono" style="font-size: 16px; font-weight: 700; color: var(--accent);">${{Math.round(maxFRP)}} MW</div>
            <div class="font-mono text-muted" style="font-size: 9px;">${{activeCells.length}} celdas</div>
          </div>
          <div style="background: var(--bg); border: 1px solid var(--border); padding: 8px; border-radius: 4px;">
            <div class="kpi-label" style="font-size: 9px; margin: 0;">Ambos sen.</div>
            <div class="font-mono" style="font-size: 16px; font-weight: 700;">${{bothCount}}</div>
            <div class="font-mono text-muted" style="font-size: 9px;">M: ${{onlyMod}} · V: ${{onlyVii}}</div>
          </div>
        </div>

        <div style="font-size: 11px; text-transform: uppercase; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>Top Celdas Activas (0,05°)</span>
          <span>FRP Máx</span>
        </div>

        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px;">
          ${{activeCells.slice(0, 40).map(c => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; font-family: var(--font-mono); font-size: 11px;">
              <div>
                <div style="color: #FFF;">${{c.lat.toFixed(3)}}, ${{c.lon.toFixed(3)}}</div>
                <div style="font-size: 9px; color: var(--text-muted);">${{c.sensores.join(" + ")}} · ${{c.n}} focos</div>
              </div>
              <div style="font-weight: 700; color: var(--accent);">${{c.frp_max.toFixed(1)}} MW</div>
            </div>
          `).join("")}}
        </div>
      `;
    }}

    // M1 & M2: Exportación CSV con BOM (\ufeff), Blob y denominador oficial unificado
    function exportAnalyticsCSV() {{
      const days = CALENDAR.days || [];
      const rows = [["fecha", "n_total", "n_modis", "n_viirs", "frp_max_MW", "frp_sum_MW", "coincidencia_ambos_pct", "celdas_activas"]];

      days.forEach(d => {{
        let nTotal = 0, nMod = 0, nVii = 0;
        let frpMax = 0, frpSum = 0;
        let both = 0, onlyMod = 0, onlyVii = 0;

        CALENDAR.cells.forEach(c => {{
          const m = c.days[d];
          if (m && m.n > 0) {{
            nTotal += m.n;
            frpMax = Math.max(frpMax, m.frp_max);
            if (m.por_sensor) {{
              if (m.por_sensor.MODIS) {{ nMod += m.por_sensor.MODIS.n; frpSum += m.por_sensor.MODIS.frp_sum; }}
              if (m.por_sensor.VIIRS) {{ nVii += m.por_sensor.VIIRS.n; frpSum += m.por_sensor.VIIRS.frp_sum; }}
            }}
            const hasM = m.sensores && m.sensores.includes("MODIS");
            const hasV = m.sensores && m.sensores.includes("VIIRS");
            if (hasM && hasV) both++;
            else if (hasM) onlyMod++;
            else if (hasV) onlyVii++;
          }}
        }});

        // M1: Mismo denominador oficial del KPI y de la pantalla: ambos / (ambos + soloMODIS + soloVIIRS)
        const totCellDays = both + onlyMod + onlyVii;
        const pctCoincidencia = totCellDays > 0 ? (both / totCellDays * 100).toFixed(1) : "0.0";
        rows.push([d, nTotal, nMod, nVii, frpMax.toFixed(2), frpSum.toFixed(2), pctCoincidencia, totCellDays]);
      }});

      // M2: BOM UTF-8 (\ufeff) + Blob + ObjectURL para compatibilidad total con Excel en Windows
      const csvStr = "\\uFEFF" + rows.map(r => r.join(",")).join("\\r\\n");
      const blob = new Blob([csvStr], {{ type: "text/csv;charset=utf-8;" }});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "ignis_analytics_serie_armonizada.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }}

    window.addEventListener("DOMContentLoaded", () => {{
      renderKPIs();
      renderYearButtons();
      renderCalendar();
      renderDaySheet();
      initMap();

      const winLabel = formatWindow(CALENDAR.days);
      const totalDays = (CALENDAR.days || []).length;
      const d0 = CALENDAR.days ? CALENDAR.days[0] : "";
      const dEnd = CALENDAR.days ? CALENDAR.days[CALENDAR.days.length - 1] : "";

      const aoiWinEl = document.getElementById("aoi-window-text");
      if (aoiWinEl) aoiWinEl.innerText = `Ventana: ${{winLabel}}`;

      const resetBtn = document.getElementById("btn-reset-day");
      if (resetBtn) resetBtn.innerText = `Ver ventana completa (${{winLabel}})`;

      const mapLabel = document.getElementById("map-active-label");
      if (mapLabel) mapLabel.innerText = `[Ventana completa: ${{totalDays}} días]`;

      const footerInfo = document.getElementById("footer-source-info");
      if (footerInfo && totalDays > 0) {{
        footerInfo.innerText = `Fuente: NASA FIRMS (MODIS C6.1 / VIIRS C2) · NRT · Ventana: ${{d0}} a ${{dEnd}} (${{totalDays}} días)`;
      }}
    }});
  </script>
</body>
</html>
"""

    with open("ignis-demo.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Rebuilt ignis-demo.html with M1, M2, M3 and CARTO API key")

    with open("ignis-dev-pack/ignis-demo.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Updated ignis-dev-pack/ignis-demo.html")

if __name__ == "__main__":
    generate_analyst_dashboard()
