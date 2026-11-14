import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dailyPath = path.join(projectRoot, 'public', 'data', 'daily.json');
const kpiPath = path.join(projectRoot, 'public', 'data', 'kpi.json');
const outputPath = path.join(projectRoot, 'src', 'lib', 'ssr-snapshot.ts');

console.log('[prebuild] Generando snapshot SSR desde daily.json y kpi.json...');

if (!fs.existsSync(dailyPath)) {
  console.error(`[prebuild] ERROR: No se encontró ${dailyPath}`);
  process.exit(1);
}

if (!fs.existsSync(kpiPath)) {
  console.error(`[prebuild] ERROR: No se encontró ${kpiPath}`);
  process.exit(1);
}

const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
const kpi = JSON.parse(fs.readFileSync(kpiPath, 'utf8'));

if (typeof kpi.n_celdas_total !== 'number' || kpi.n_celdas_total <= 0) {
  console.error(`[prebuild] ERROR CRÍTICO: kpi.json no contiene el campo obligatorio 'n_celdas_total' (o no es un número positivo válido).`);
  console.error(`[prebuild] Valor recibido: ${JSON.stringify(kpi.n_celdas_total)}`);
  process.exit(1);
}

const n_celdas_total = kpi.n_celdas_total;

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
  soloModis += (r.sm ?? 0);
  soloViirs += (r.sv ?? 0);
  totalCeldasDia += r.cd;
}

const baseTotal = (ambos + soloModis + soloViirs) || totalCeldasDia || 1;
const pctAmbos = Number(((ambos / baseTotal) * 100).toFixed(1));
const pctSoloModis = Number(((soloModis / baseTotal) * 100).toFixed(1));
const pctSoloViirs = Number(((soloViirs / baseTotal) * 100).toFixed(1));

const ratioViirsModis = modisDetecciones > 0 ? Number((viirsDetecciones / modisDetecciones).toFixed(2)) : 0;
const frpTotal = Number((frpModis + frpViirs).toFixed(1));
const frpMedioModis = modisDetecciones > 0 ? Number((frpModis / modisDetecciones).toFixed(2)) : 0;
const frpMedioViirs = viirsDetecciones > 0 ? Number((frpViirs / viirsDetecciones).toFixed(2)) : 0;

const desde = daily[0]?.d || '2000-11-01';
const hasta = daily[daily.length - 1]?.d || '2026-11-13';
const n_dias = daily.length;

const kpis = {
  totalDetecciones,
  modisDetecciones,
  viirsDetecciones,
  ratioViirsModis,
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

const metadata = {
  desde,
  hasta,
  n_dias,
  n_celdas_total,
  total_focos: totalDetecciones,
};

const content = `// AUTO-GENERATED FILE. DO NOT MODIFY MANUALLY.
// Generated during build from web/public/data/daily.json and web/public/data/kpi.json
// To regenerate, run: node scripts/generate-ssr-snapshot.mjs (or npm run prebuild)
import { CalculatedKPIs } from "../types/ignis";

export interface SeriesMetadata {
  desde: string;
  hasta: string;
  n_dias: number;
  n_celdas_total: number;
  total_focos: number;
}

export const SSR_SNAPSHOT_KPIS: CalculatedKPIs = ${JSON.stringify(kpis, null, 2)};

export const SSR_SNAPSHOT_METADATA: SeriesMetadata = ${JSON.stringify(metadata, null, 2)};
`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`[prebuild] Snapshot SSR generado con éxito en ${outputPath}`);
console.log(`[prebuild] Resumen: ${n_dias} días (${desde} a ${hasta}), ${totalDetecciones} focos, FRP ${frpTotal} MW (~${Math.round(frpTotal)}), ${n_celdas_total} celdas`);
