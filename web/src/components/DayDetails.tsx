import React from "react";
import { DailyRow, GridCell } from "../types/ignis";
import { formatInt } from "../lib/kpi";

interface DayDetailsProps {
  dailyRow?: DailyRow | null;
  cells?: GridCell[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  availableDays?: string[];
  lang?: "es" | "en";
}

export const DayDetails: React.FC<DayDetailsProps> = ({
  dailyRow,
  cells,
  selectedDate,
  onSelectDate,
  availableDays = [],
  lang = "es",
}) => {
  if (!selectedDate) {
    return (
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 flex flex-col justify-between h-[580px]">
        <div className="font-bold text-xs uppercase tracking-wider text-ignis-text border-b border-ignis-border pb-2">
          {lang === "es" ? "Ficha de Inspección Diaria" : "Daily Inspection Card"}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center text-ignis-muted px-4">
          <div className="text-xs font-bold text-ignis-text mb-2">
            {lang === "es" ? "Ningún día seleccionado" : "No day selected"}
          </div>
          <p className="text-[11px] leading-relaxed max-w-xs mb-4">
            {lang === "es"
              ? "Hacé clic en cualquier celda activa del calendario mensual para inspeccionar la jornada."
              : "Click on any active cell in the monthly calendar to inspect the day's fire detections."}
          </p>
          <div className="flex flex-wrap gap-1 justify-center max-w-xs">
            {availableDays.slice(-8).map((d) => (
              <button
                key={d}
                onClick={() => onSelectDate(d)}
                className="text-[11px] font-mono bg-ignis-bg border border-ignis-border hover:border-ignis-muted text-ignis-text px-2 py-0.5 rounded transition"
              >
                {d.slice(5)}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] font-mono text-ignis-muted border-t border-ignis-border pt-2 text-center">
          {lang === "es" ? "Serie Armonizada · NASA FIRMS NRT & SP" : "Harmonized Series · NASA FIRMS NRT & SP"}
        </div>
      </div>
    );
  }

  // Celdas activas en el día (si ya fueron cargadas para el mapa)
  const activeCellsOnDay: Array<{
    lat: number;
    lon: number;
    n: number;
    frp_max: number;
    sensores: string[];
    por_sensor?: any;
  }> = [];

  if (cells && cells.length > 0) {
    cells.forEach((cell) => {
      const metric = cell.days && cell.days[selectedDate];
      if (metric && metric.n > 0) {
        activeCellsOnDay.push({
          lat: cell.lat,
          lon: cell.lon,
          n: metric.n,
          frp_max: metric.frp_max,
          sensores: metric.sensores || [],
          por_sensor: metric.por_sensor,
        });
      }
    });
    activeCellsOnDay.sort((a, b) => b.frp_max - a.frp_max);
  }

  const nTotal = dailyRow ? dailyRow.n : activeCellsOnDay.reduce((a, c) => a + c.n, 0);
  const nMod = dailyRow ? dailyRow.m : activeCellsOnDay.filter((c) => c.sensores.includes("MODIS")).length;
  const nVii = dailyRow ? dailyRow.v : activeCellsOnDay.filter((c) => c.sensores.includes("VIIRS")).length;
  const frpSumMW = dailyRow ? Math.round(dailyRow.fm + dailyRow.fv) : 0;
  const bothCells = dailyRow ? dailyRow.am : 0;
  const totalCells = dailyRow ? dailyRow.cd : (activeCellsOnDay.length || 1);
  const pctBoth = totalCells > 0 ? Math.round((bothCells / totalCells) * 100) : 0;

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 flex flex-col h-[580px]">
      <div className="flex justify-between items-center border-b border-ignis-border pb-2">
        <div>
          <div className="text-[10px] uppercase text-ignis-muted font-mono">
            {lang === "es" ? "Jornada analizada" : "Analyzed day"}
          </div>
          <div className="text-base font-bold font-mono text-white">{selectedDate}</div>
        </div>
        <button
          onClick={() => onSelectDate(null)}
          className="text-[11px] font-mono text-ignis-muted hover:text-white px-2 py-1 rounded bg-ignis-bg border border-ignis-border"
        >
          ✕ {lang === "es" ? "Cerrar" : "Close"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 my-3">
        <div className="bg-ignis-bg p-2 rounded border border-ignis-border">
          <div className="text-[10px] uppercase font-mono text-ignis-muted">
            {lang === "es" ? "Detecciones" : "Detections"}
          </div>
          <div className="font-mono text-lg font-bold text-white">{formatInt(nTotal)}</div>
          <div className="text-[10px] font-mono text-ignis-muted mt-0.5">
            MODIS: {formatInt(nMod)} · VIIRS: {formatInt(nVii)}
          </div>
        </div>

        <div className="bg-ignis-bg p-2 rounded border border-ignis-border">
          <div className="text-[10px] uppercase font-mono text-ignis-muted">
            {lang === "es" ? "FRP Radiación" : "FRP Radiation"}
          </div>
          <div className="font-mono text-lg font-bold text-ignis-accent">
            {formatInt(frpSumMW)} <span className="text-xs font-normal text-white">MW</span>
          </div>
          <div className="text-[10px] font-mono text-ignis-muted mt-0.5">
            {bothCells} {lang === "es" ? "celdas coinc." : "coincident cells"} ({pctBoth}%)
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="text-[11px] font-mono text-ignis-muted mb-1.5 flex justify-between">
          <span>{lang === "es" ? "Celdas de Rejilla (0,05°):" : "Grid Cells (0.05°):"}</span>
          <span>{activeCellsOnDay.length > 0 ? `${activeCellsOnDay.length} activas` : `${totalCells} celdas`}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
          {activeCellsOnDay.length === 0 ? (
            <div className="text-center text-ignis-muted py-8 text-[11px]">
              {lang === "es"
                ? "Cargando desglose geoespacial del mapa..."
                : "Loading geospatial breakdown for map..."}
            </div>
          ) : (
            activeCellsOnDay.slice(0, 30).map((c, i) => {
              const isBoth = c.sensores.includes("MODIS") && c.sensores.includes("VIIRS");
              const hasMod = c.sensores.includes("MODIS");
              const provTag = isBoth ? "M+V" : hasMod ? "MOD" : "VII";
              const tagColor = isBoth ? "text-white bg-[#21262D]" : hasMod ? "text-[#D97706] bg-[#271E14]" : "text-[#EA580C] bg-[#2A1810]";

              return (
                <div
                  key={i}
                  className="bg-ignis-bg p-1.5 rounded border border-ignis-border/60 flex justify-between items-center"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${tagColor}`}>
                      {provTag}
                    </span>
                    <span className="text-ignis-text">
                      {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white mr-2">{c.n} focos</span>
                    <span className="text-ignis-muted text-[10px]">{Math.round(c.frp_max)} MW</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="text-[10px] font-mono text-ignis-muted border-t border-ignis-border pt-2 text-center">
        {lang === "es" ? "Armonización Rejilla 0,05° · Centro-Norte Argentina" : "Harmonization Grid 0.05° · Central-Northern Argentina"}
      </div>
    </div>
  );
};
