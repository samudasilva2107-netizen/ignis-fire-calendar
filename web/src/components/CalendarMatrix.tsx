import React, { useState, useMemo } from "react";
import { CalendarContract } from "../types/ignis";
import { formatInt, formatWindowShort } from "../lib/kpi";

interface CalendarMatrixProps {
  calendar: CalendarContract;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

function getFRPColor(frp: number): string {
  if (frp <= 0) return "#1E232A";
  if (frp <= 50) return "#D97706";
  if (frp <= 250) return "#EA580C";
  if (frp <= 1000) return "#DC2626";
  return "#991B1B";
}

export const CalendarMatrix: React.FC<CalendarMatrixProps> = ({
  calendar,
  selectedDate,
  onSelectDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "interannual">("month");

  // Cálculo del percentil 90 para detección de anomalías
  const { dailyFRP, anomalies } = useMemo(() => {
    const days = calendar.days || [];
    const frpMap: Record<string, number> = {};

    days.forEach((d) => {
      frpMap[d] = 0;
      calendar.cells.forEach((c) => {
        const m = c.days[d];
        if (m) frpMap[d] += m.frp_max;
      });
    });

    const values = Object.values(frpMap).sort((a, b) => a - b);
    const p90Index = Math.floor(values.length * 0.9);
    const p90Threshold = values[p90Index] || 0;

    const anomalyMap: Record<string, boolean> = {};
    Object.keys(frpMap).forEach((d) => {
      anomalyMap[d] = frpMap[d] >= p90Threshold && frpMap[d] > 0;
    });

    return { dailyFRP: frpMap, anomalies: anomalyMap };
  }, [calendar]);

  // Años soportados y disponibles en runtime
  const supportedYears = [2026, 2025, 2024, 2023];
  const availableYears = useMemo(() => {
    return Array.from(new Set((calendar.days || []).map((d) => parseInt(d.slice(0, 4), 10)))).sort((a, b) => b - a);
  }, [calendar.days]);

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-ignis-border pb-3 gap-3">
        <div>
          <div className="font-bold text-xs uppercase tracking-wider text-ignis-text">
            Matriz de Calendario de Actividad
          </div>
          <div className="text-[11px] text-ignis-muted mt-0.5">
            Armonización histórica multianual: tendencias, anomalías (p90) y estacionalidad de fuego
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Modo de Vista */}
          <div className="flex gap-1 bg-ignis-bg p-0.5 rounded-md border border-ignis-border">
            <button
              onClick={() => setCalendarViewMode("month")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                calendarViewMode === "month"
                  ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                  : "text-ignis-muted hover:text-white"
              }`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setCalendarViewMode("interannual")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                calendarViewMode === "interannual"
                  ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                  : "text-ignis-muted hover:text-white"
              }`}
            >
              Comparativa Interanual
            </button>
          </div>

          {/* Selector de Año dinámico (M3: disabled + tooltip para años sin datos) */}
          <div className="flex gap-1 bg-ignis-bg p-0.5 rounded-md border border-ignis-border">
            {supportedYears.map((y) => {
              const hasData = availableYears.includes(y);
              return (
                <button
                  key={y}
                  disabled={!hasData}
                  onClick={() => hasData && setSelectedYear(y)}
                  title={hasData ? `Año ${y}` : `Año ${y}: backfill histórico pendiente`}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    selectedYear === y
                      ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                      : hasData
                      ? "text-ignis-muted hover:text-white"
                      : "text-ignis-muted opacity-40 cursor-not-allowed"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>

          {/* Selector de Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-2.5 py-1 bg-ignis-surface border border-ignis-border rounded-md text-[11px] font-mono text-ignis-text"
          >
            <option value={11}>Noviembre (Ventana activa)</option>
            <option value={10}>Octubre</option>
            <option value={9}>Septiembre</option>
            <option value={8}>Agosto</option>
            <option value={7}>Julio (Caso Chilecito)</option>
            <option value={6}>Junio</option>
            <option value={5}>Mayo</option>
            <option value={4}>Abril</option>
            <option value={3}>Marzo</option>
            <option value={2}>Febrero</option>
            <option value={1}>Enero</option>
          </select>
        </div>
      </div>

      {/* Leyenda técnica oficial */}
      <div className="flex flex-wrap justify-between items-center my-2.5 text-[11px] text-ignis-muted gap-2">
        <div className="flex flex-wrap gap-3 items-center">
          <span>Escala FRP:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#1E232A]"></span> 0 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#D97706]"></span> ≤ 50 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#EA580C]"></span> ≤ 250 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC2626]"></span> ≤ 1000 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#991B1B]"></span> &gt; 1000 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] stripe-nodata border border-ignis-border"></span> Sin datos</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] border border-dashed border-ignis-accent"></span> Anomalía p90</span>
        </div>

        {selectedDate && (
          <button
            onClick={() => onSelectDate(null)}
            className="text-[11px] font-mono text-ignis-accent hover:underline"
          >
            Ver ventana completa ({formatWindowShort(calendar.days)})
          </button>
        )}
      </div>

      {/* Contenedor dinámico */}
      {calendarViewMode === "interannual" ? (
        <div className="mt-3">
          <div className="font-mono text-xs text-ignis-muted mb-2.5">
            COMPARATIVA INTERANUAL DEL MES SELECCIONADO A TRAVÉS DE LOS AÑOS:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {supportedYears.map((y) => {
              const mPrefix = String(selectedMonth).padStart(2, "0");
              const prefix = `${y}-${mPrefix}`;
              const daysInMonthYear = (calendar.days || []).filter((d) => d.startsWith(prefix));
              let foci = 0;
              let maxFRP = 0;

              if (daysInMonthYear.length > 0) {
                calendar.cells.forEach((c) => {
                  daysInMonthYear.forEach((dt) => {
                    const m = c.days[dt];
                    if (m) {
                      foci += m.n;
                      maxFRP = Math.max(maxFRP, m.frp_max);
                    }
                  });
                });

                return (
                  <div key={y} className="bg-[#1c2128] border border-ignis-accent rounded p-3">
                    <div className="text-[10px] uppercase font-mono text-ignis-muted">Año {y}</div>
                    <div className="font-mono text-xl font-bold text-white mt-1">{formatInt(foci)}</div>
                    <div className="text-[10px] font-mono text-ignis-muted mt-1">
                      {daysInMonthYear.length} días · {Math.round(maxFRP)} MW máx
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={y} className="stripe-nodata border border-ignis-border rounded p-3 opacity-60">
                    <div className="text-[10px] uppercase font-mono text-ignis-muted">Año {y}</div>
                    <div className="font-mono text-sm font-bold text-ignis-muted mt-1">Pendiente</div>
                    <div className="text-[10px] font-mono text-ignis-muted mt-1">Requiere backfill SP</div>
                  </div>
                );
              }
            })}
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-ignis-muted">
            Esta vista responde textualmente la pregunta de Marina Companuchi: <em>«cuántos focos tuvo un mes a través de distintos años»</em>.
          </div>
        </div>
      ) : (
        <>
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] text-ignis-muted py-1 border-t border-ignis-border/60">
            <div>LUN</div><div>MAR</div><div>MIÉ</div><div>JUE</div><div>VIE</div><div>SÁB</div><div>DOM</div>
          </div>

          {/* Rejilla mensual dinámica */}
          <div className="grid grid-cols-7 gap-1.5 mt-1">
            {/* Offset dinámico de inicio de mes */}
            {Array.from({
              length: (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7,
            }).map((_, i) => (
              <div key={`offset-${i}`} className="h-[76px] stripe-nodata opacity-20 rounded-[2px]"></div>
            ))}

            {/* Días del mes dinámicos */}
            {Array.from({
              length: new Date(selectedYear, selectedMonth, 0).getDate(),
            }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const hasData = calendar.days.includes(dayStr);
              const isSelected = selectedDate === dayStr;
              const isAnomaly = anomalies[dayStr];

              if (hasData) {
                let dayFoci = 0;
                let maxFRP = 0;
                calendar.cells.forEach((c) => {
                  const m = c.days[dayStr];
                  if (m) {
                    dayFoci += m.n;
                    maxFRP = Math.max(maxFRP, m.frp_max);
                  }
                });

                const color = getFRPColor(maxFRP);

                return (
                  <button
                    key={dayStr}
                    onClick={() => onSelectDate(isSelected ? null : dayStr)}
                    className={`h-[76px] bg-ignis-surface border rounded-[2px] p-2 flex flex-col justify-between text-left transition ${
                      isSelected
                        ? "border-ignis-accent ring-1 ring-ignis-accent bg-[#1c2128]"
                        : isAnomaly
                        ? "border-dashed border-ignis-accent"
                        : "border-ignis-border hover:border-ignis-muted"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-mono text-xs font-bold text-white">{dayNum}</span>
                      <div className="flex items-center gap-1">
                        {isAnomaly && (
                          <span className="text-[9px] font-mono font-bold text-ignis-accent">p90</span>
                        )}
                        <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: color }}></span>
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-sm font-bold text-white">{formatInt(dayFoci)}</div>
                      <div className="font-mono text-[10px] text-ignis-muted">{formatInt(maxFRP)} MW máx</div>
                    </div>
                  </button>
                );
              } else {
                return (
                  <div
                    key={dayStr}
                    className="h-[76px] stripe-nodata border border-ignis-border/50 rounded-[2px] p-2 flex flex-col justify-between opacity-60 cursor-not-allowed"
                    title="Sin datos satelitales en esta fecha"
                  >
                    <span className="font-mono text-xs text-ignis-muted">{dayNum}</span>
                    <span className="font-mono text-[10px] text-ignis-muted">Sin datos</span>
                  </div>
                );
              }
            })}
          </div>
        </>
      )}
    </div>
  );
};
