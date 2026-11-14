import { CalendarContract, CalculatedKPIs, DailyRow } from "../types/ignis";

/**
 * Calcula en tiempo de ejecución todos los KPIs desde daily.json (655 KB en vez de 60 MB)
 * Reduce el bundle y el First Load JS a menos de 500 KB instantáneos.
 */
export function calculateKPIsFromDaily(daily: DailyRow[]): CalculatedKPIs {
  let totalDetecciones = 0;
  let modisDetecciones = 0;
  let viirsDetecciones = 0;
  let frpModis = 0;
  let frpViirs = 0;
  let ambos = 0;
  let soloModis = 0;
  let soloViirs = 0;
  let totalCeldasDia = 0;

  for (const r of daily) {
    totalDetecciones += r.n;
    modisDetecciones += r.m;
    viirsDetecciones += r.v;
    frpModis += r.fm;
    frpViirs += r.fv;
    ambos += r.am;
    soloModis += r.sm ?? 0;
    soloViirs += r.sv ?? 0;
    totalCeldasDia += r.cd;
  }

  // Base unificada (ambos + soloModis + soloViirs, o totalCeldasDia)
  const baseTotal = (ambos + soloModis + soloViirs) || totalCeldasDia || 1;
  const pctAmbos = Number(((ambos / baseTotal) * 100).toFixed(1));
  const pctSoloModis = Number(((soloModis / baseTotal) * 100).toFixed(1));
  const pctSoloViirs = Number(((soloViirs / baseTotal) * 100).toFixed(1));

  const ratio = modisDetecciones > 0 ? Number((viirsDetecciones / modisDetecciones).toFixed(2)) : 0;
  const frpTotal = Number((frpModis + frpViirs).toFixed(1));
  const frpMedioModis = modisDetecciones > 0 ? Number((frpModis / modisDetecciones).toFixed(2)) : 0;
  const frpMedioViirs = viirsDetecciones > 0 ? Number((frpViirs / viirsDetecciones).toFixed(2)) : 0;

  return {
    totalDetecciones,
    modisDetecciones,
    viirsDetecciones,
    ratioViirsModis: ratio,
    frpTotal,
    frpModis: Number(frpModis.toFixed(1)),
    frpViirs: Number(frpViirs.toFixed(1)),
    frpMedioModis,
    frpMedioViirs,
    coincidencia: {
      ambos,
      soloModis,
      soloViirs,
      pctAmbos,
      pctSoloModis,
      pctSoloViirs,
    },
  };
}

/**
 * Calcula en tiempo de ejecución todos los KPIs desde calendar.json
 * Regla 0 & Sección 4 de BASES-DEV.md:
 * NINGÚN número sale escrito a mano en el copy; todo se deriva de los datos reales.
 */
export function calculateKPIsFromCalendar(calendar: CalendarContract): CalculatedKPIs {
  const { cells } = calendar;

  let totalDetecciones = 0;
  let modisDetecciones = 0;
  let viirsDetecciones = 0;
  let frpModis = 0;
  let frpViirs = 0;

  let ambos = 0;
  let soloModis = 0;
  let soloViirs = 0;

  for (const cell of cells) {
    for (const d of Object.values(cell.days)) {
      totalDetecciones += d.n;

      if (d.por_sensor) {
        if (d.por_sensor.MODIS) {
          modisDetecciones += d.por_sensor.MODIS.n;
          frpModis += d.por_sensor.MODIS.frp_sum;
        }
        if (d.por_sensor.VIIRS) {
          viirsDetecciones += d.por_sensor.VIIRS.n;
          frpViirs += d.por_sensor.VIIRS.frp_sum;
        }
      } else {
        // Fallback si por_sensor no estuviera presente
        if (d.sensores.includes("MODIS") && !d.sensores.includes("VIIRS")) {
          modisDetecciones += d.n;
        } else if (d.sensores.includes("VIIRS") && !d.sensores.includes("MODIS")) {
          viirsDetecciones += d.n;
        }
      }

      const sensores = d.sensores || [];
      if (sensores.length > 1) {
        ambos += 1;
      } else if (sensores.includes("MODIS")) {
        soloModis += 1;
      } else if (sensores.includes("VIIRS")) {
        soloViirs += 1;
      }
    }
  }

  const totCeldasDia = ambos + soloModis + soloViirs || 1;
  const pctAmbos = (ambos / totCeldasDia) * 100;
  const pctSoloModis = (soloModis / totCeldasDia) * 100;
  const pctSoloViirs = (soloViirs / totCeldasDia) * 100;

  const ratioViirsModis = modisDetecciones > 0 ? viirsDetecciones / modisDetecciones : 0;
  const frpMedioModis = modisDetecciones > 0 ? frpModis / modisDetecciones : 0;
  const frpMedioViirs = viirsDetecciones > 0 ? frpViirs / viirsDetecciones : 0;
  const frpTotal = frpModis + frpViirs;

  return {
    totalDetecciones,
    modisDetecciones,
    viirsDetecciones,
    ratioViirsModis: Number(ratioViirsModis.toFixed(2)),
    frpTotal: Number(frpTotal.toFixed(1)),
    frpModis: Number(frpModis.toFixed(1)),
    frpViirs: Number(frpViirs.toFixed(1)),
    frpMedioModis: Number(frpMedioModis.toFixed(2)),
    frpMedioViirs: Number(frpMedioViirs.toFixed(2)),
    coincidencia: {
      ambos,
      soloModis,
      soloViirs,
      pctAmbos: Number(pctAmbos.toFixed(1)),
      pctSoloModis: Number(pctSoloModis.toFixed(1)),
      pctSoloViirs: Number(pctSoloViirs.toFixed(1)),
    },
  };
}

/**
 * Formatea un entero con punto como separador de miles (estándar oficial IGNIS / es-AR)
 * 100% determinístico en SSR y cliente, eliminando errores de hidratación de React.
 */
export function formatInt(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return "0";
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Deriva dinámicamente el rótulo de ventana temporal desde el array de fechas (CALENDAR.days)
 * Ej: ["2026-11-05", ..., "2026-11-12"] -> "5–12 nov 2026"
 */
export function formatWindowShort(days?: string[]): string {
  if (!days || days.length === 0) return "Sin datos";
  const d0 = days[0];
  const dEnd = days[days.length - 1];
  if (d0 === dEnd) return d0;
  const p0 = d0.split("-");
  const pEnd = dEnd.split("-");
  const months = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (p0[0] === pEnd[0] && p0[1] === pEnd[1]) {
    return `${parseInt(p0[2], 10)}–${parseInt(pEnd[2], 10)} ${months[parseInt(p0[1], 10)]} ${p0[0]}`;
  }
  return `${d0} a ${dEnd}`;
}
