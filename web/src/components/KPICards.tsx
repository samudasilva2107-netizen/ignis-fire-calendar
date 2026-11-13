import React from "react";
import { CalculatedKPIs } from "../types/ignis";
import { formatInt } from "../lib/kpi";

interface KPICardsProps {
  kpis: CalculatedKPIs;
  totalCeldas: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, totalCeldas }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Detecciones Totales */}
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ignis-muted mb-1.5">
          Detecciones Totales
        </div>
        <div className="text-[28px] font-bold font-mono text-ignis-text leading-none">
          {formatInt(kpis.totalDetecciones)}
        </div>
        <div className="text-[11px] font-mono text-ignis-muted mt-2">
          MODIS: {formatInt(kpis.modisDetecciones)} · VIIRS: {formatInt(kpis.viirsDetecciones)}
        </div>
      </div>

      {/* 2. Ratio VIIRS / MODIS */}
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ignis-muted mb-1.5">
          Ratio VIIRS / MODIS
        </div>
        <div className="text-[28px] font-bold font-mono text-ignis-text leading-none">
          {kpis.ratioViirsModis}×
        </div>
        <div className="text-[11px] font-mono text-ignis-muted mt-2">
          Resolución: 375 m vs 1.000 m
        </div>
      </div>

      {/* 3. Coincidencia en AOI */}
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ignis-muted mb-1.5">
          Coincidencia en AOI
        </div>
        <div className="text-[28px] font-bold font-mono text-ignis-text leading-none">
          {kpis.coincidencia.pctAmbos}%
        </div>
        <div className="text-[11px] font-mono text-ignis-muted mt-2">
          VIIRS solo: {kpis.coincidencia.pctSoloViirs}% · MODIS solo: {kpis.coincidencia.pctSoloModis}%
        </div>
      </div>

      {/* 4. FRP Total & Medio */}
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ignis-muted mb-1.5">
          FRP Total & Medio
        </div>
        <div className="text-[28px] font-bold font-mono text-ignis-text leading-none">
          {formatInt(kpis.frpTotal)} <span className="text-sm font-normal text-ignis-muted">MW</span>
        </div>
        <div className="text-[11px] font-mono text-ignis-muted mt-2">
          Medio: MODIS {kpis.frpMedioModis} MW · VIIRS {kpis.frpMedioViirs} MW
        </div>
      </div>

      {/* 5. Celdas Armonizadas */}
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-ignis-muted mb-1.5">
          Celdas Armonizadas
        </div>
        <div className="text-[28px] font-bold font-mono text-ignis-text leading-none">
          {formatInt(totalCeldas)}
        </div>
        <div className="text-[11px] font-mono text-ignis-muted mt-2">
          Rejilla común 0,05° (~5,6 km)
        </div>
      </div>
    </div>
  );
};
