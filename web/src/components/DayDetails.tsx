import React from "react";
import { CalendarContract } from "../types/ignis";

interface DayDetailsProps {
  calendar: CalendarContract;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export const DayDetails: React.FC<DayDetailsProps> = ({
  calendar,
  selectedDate,
  onSelectDate,
}) => {
  if (!selectedDate) {
    return (
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 flex flex-col justify-between h-[580px]">
        <div className="font-bold text-xs uppercase tracking-wider text-ignis-text border-b border-ignis-border pb-2">
          Ficha de Inspección Diaria
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center text-ignis-muted px-4">
          <div className="text-xs font-bold text-ignis-text mb-2">Ningún día seleccionado</div>
          <p className="text-[11px] leading-relaxed max-w-xs mb-4">
            Hacé clic en cualquier celda activa del calendario mensual (5 al 12 de noviembre) para inspeccionar la jornada.
          </p>
          <div className="flex flex-wrap gap-1 justify-center max-w-xs">
            {calendar.days.map((d) => (
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
          Serie Armonizada · NASA FIRMS NRT
        </div>
      </div>
    );
  }

  const activeCellsOnDay: Array<{
    lat: number;
    lon: number;
    n: number;
    frp_max: number;
    sensores: string[];
    por_sensor?: any;
  }> = [];

  let totalDetections = 0;
  let maxFRP = 0;
  let modCount = 0;
  let viiCount = 0;
  let bothCount = 0;
  let onlyMod = 0;
  let onlyVii = 0;

  calendar.cells.forEach((cell) => {
    const metric = cell.days[selectedDate];
    if (metric && metric.n > 0) {
      activeCellsOnDay.push({
        lat: cell.lat,
        lon: cell.lon,
        n: metric.n,
        frp_max: metric.frp_max,
        sensores: metric.sensores,
        por_sensor: metric.por_sensor,
      });

      totalDetections += metric.n;
      maxFRP = Math.max(maxFRP, metric.frp_max);

      if (metric.por_sensor) {
        if (metric.por_sensor.MODIS) modCount += metric.por_sensor.MODIS.n;
        if (metric.por_sensor.VIIRS) viiCount += metric.por_sensor.VIIRS.n;
      }

      const hasM = metric.sensores.includes("MODIS");
      const hasV = metric.sensores.includes("VIIRS");
      if (hasM && hasV) bothCount++;
      else if (hasM) onlyMod++;
      else if (hasV) onlyVii++;
    }
  });

  activeCellsOnDay.sort((a, b) => b.frp_max - a.frp_max);
  const totCeldas = bothCount + onlyMod + onlyVii || 1;
  const pctBoth = Math.round((bothCount / totCeldas) * 100);

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 flex flex-col h-[580px]">
      <div className="flex justify-between items-center border-b border-ignis-border pb-2">
        <div>
          <div className="text-[10px] uppercase text-ignis-muted font-mono">Jornada analizada</div>
          <div className="text-base font-bold font-mono text-white">{selectedDate}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-ignis-muted font-mono">Coincidencia día</div>
          <div className="text-sm font-bold font-mono text-ignis-accent">{pctBoth}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 my-3">
        <div className="bg-ignis-bg border border-ignis-border p-2 rounded">
          <div className="text-[9px] uppercase text-ignis-muted font-mono">Focos</div>
          <div className="text-sm font-bold font-mono text-white">{totalDetections}</div>
          <div className="text-[9px] font-mono text-ignis-muted">M: {modCount} · V: {viiCount}</div>
        </div>
        <div className="bg-ignis-bg border border-ignis-border p-2 rounded">
          <div className="text-[9px] uppercase text-ignis-muted font-mono">FRP Máx</div>
          <div className="text-sm font-bold font-mono text-ignis-accent">{Math.round(maxFRP)} MW</div>
          <div className="text-[9px] font-mono text-ignis-muted">{activeCellsOnDay.length} celdas</div>
        </div>
        <div className="bg-ignis-bg border border-ignis-border p-2 rounded">
          <div className="text-[9px] uppercase text-ignis-muted font-mono">Ambos sen.</div>
          <div className="text-sm font-bold font-mono text-white">{bothCount}</div>
          <div className="text-[9px] font-mono text-ignis-muted">M: {onlyMod} · V: {onlyVii}</div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] font-mono uppercase text-ignis-muted mb-1.5">
        <span>Top Celdas Activas (0,05°)</span>
        <span>FRP Máx</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {activeCellsOnDay.slice(0, 40).map((c, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center p-1.5 bg-ignis-bg border border-ignis-border rounded text-[11px] font-mono"
          >
            <div>
              <div className="text-white font-medium">{c.lat.toFixed(3)}, {c.lon.toFixed(3)}</div>
              <div className="text-[9px] text-ignis-muted">{c.sensores.join(" + ")} · {c.n} focos</div>
            </div>
            <div className="font-bold text-ignis-accent">{c.frp_max.toFixed(1)} MW</div>
          </div>
        ))}
      </div>
    </div>
  );
};
