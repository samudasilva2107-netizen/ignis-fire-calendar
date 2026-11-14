// AUTO-GENERATED FILE. DO NOT MODIFY MANUALLY.
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

export const SSR_SNAPSHOT_KPIS: CalculatedKPIs = {
  "totalDetecciones": 8757997,
  "modisDetecciones": 2201939,
  "viirsDetecciones": 6556058,
  "ratioViirsModis": 2.98,
  "frpTotal": 184650648.6,
  "frpModis": 106775045.4,
  "frpViirs": 77875603.2,
  "frpMedioModis": 48.49,
  "frpMedioViirs": 11.88,
  "coincidencia": {
    "ambos": 409333,
    "soloModis": 811164,
    "soloViirs": 1361489,
    "pctAmbos": 15.9,
    "pctSoloModis": 31.4,
    "pctSoloViirs": 52.7
  }
};

export const SSR_SNAPSHOT_METADATA: SeriesMetadata = {
  "desde": "2000-11-01",
  "hasta": "2026-11-13",
  "n_dias": 9383,
  "n_celdas_total": 54438,
  "total_focos": 8757997
};
