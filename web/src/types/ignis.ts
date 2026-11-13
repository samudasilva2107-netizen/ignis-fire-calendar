export interface SensorBreakdown {
  n: number;
  frp_sum: number;
  frp_max: number;
}

export interface CellDayMetric {
  n: number;
  frp_max: number;
  sensores: string[];
  por_sensor?: Record<string, SensorBreakdown>;
}

export interface GridCell {
  lat: number;
  lon: number;
  days: Record<string, CellDayMetric>; // cell.days
}

export interface CalendarContract {
  step_deg: number;
  days: string[]; // daysRoot
  cells: GridCell[];
}

export interface DailyRow {
  d: string;   // "2026-11-05"
  n: number;   // detecciones totales
  m: number;   // MODIS
  v: number;   // VIIRS
  fm: number;  // FRP suma MODIS (MW)
  fv: number;  // FRP suma VIIRS (MW)
  am: number;  // celdas-día con ambos sensores
  cd: number;  // celdas-día totales
}

export interface EraPlatform {
  plataformas: Record<string, number>;
  n_plataformas: number;
  solo_modis: boolean;
}

export interface CalculatedKPIs {
  totalDetecciones: number;
  modisDetecciones: number;
  viirsDetecciones: number;
  ratioViirsModis: number;
  frpTotal: number;
  frpModis: number;
  frpViirs: number;
  frpMedioModis: number;
  frpMedioViirs: number;
  coincidencia: {
    ambos: number;
    soloModis: number;
    soloViirs: number;
    pctAmbos: number;
    pctSoloModis: number;
    pctSoloViirs: number;
  };
}
