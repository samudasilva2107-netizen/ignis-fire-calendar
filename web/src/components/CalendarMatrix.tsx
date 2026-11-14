import React, { useState, useMemo } from "react";
import { DailyRow, EraPlatform } from "../types/ignis";
import { formatInt, formatWindowShort } from "../lib/kpi";

interface CalendarMatrixProps {
  daily: DailyRow[];
  eras?: Record<string, EraPlatform> | null;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  lang?: "es" | "en";
}

function getFRPColor(frp: number): string {
  if (frp <= 0) return "#1E232A";
  if (frp <= 50) return "#D97706";
  if (frp <= 250) return "#EA580C";
  if (frp <= 1000) return "#DC2626";
  return "#991B1B";
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const CalendarMatrix: React.FC<CalendarMatrixProps> = ({
  daily,
  eras,
  selectedDate,
  onSelectDate,
  selectedYear,
  onSelectYear,
  lang = "es",
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "interannual">("month");

  // Precomputación ultra-eficiente O(daily) para renderizado instantáneo
  const { dailyStats, anomalies, availableYears, allDays } = useMemo(() => {
    const stats: Record<string, { n: number; maxFRP: number }> = {};
    const daysSet = new Set<string>();
    const yearsSet = new Set<number>();

    daily.forEach((r) => {
      daysSet.add(r.d);
      const y = parseInt(r.d.slice(0, 4), 10);
      if (!isNaN(y)) yearsSet.add(y);
      stats[r.d] = {
        n: r.n,
        maxFRP: Math.round(r.fm + r.fv),
      };
    });

    // Agrupación por día-del-año (MM-DD) para percentil climatológico (Sección 5 de METHOD.md)
    const doyGroups: Record<string, number[]> = {};
    Object.entries(stats).forEach(([dt, s]) => {
      const mmdd = dt.slice(5);
      if (!doyGroups[mmdd]) doyGroups[mmdd] = [];
      doyGroups[mmdd].push(s.maxFRP);
    });

    const doyThresholds: Record<string, number> = {};
    Object.entries(doyGroups).forEach(([mmdd, vals]) => {
      vals.sort((a, b) => a - b);
      const idx = Math.floor(vals.length * 0.9);
      doyThresholds[mmdd] = vals[idx] || 0;
    });

    const isMultiYear = yearsSet.size >= 3;
    const anomalyMap: Record<string, boolean> = {};

    if (isMultiYear) {
      Object.entries(stats).forEach(([dt, s]) => {
        const mmdd = dt.slice(5);
        const th = doyThresholds[mmdd] ?? 0;
        anomalyMap[dt] = s.maxFRP >= th && s.maxFRP > 0;
      });
    } else {
      const frpValues = Object.values(stats).map((s) => s.maxFRP).sort((a, b) => a - b);
      const p90Index = Math.floor(frpValues.length * 0.9);
      const p90Threshold = frpValues[p90Index] || 0;
      Object.entries(stats).forEach(([dt, s]) => {
        anomalyMap[dt] = s.maxFRP >= p90Threshold && s.maxFRP > 0;
      });
    }

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      dailyStats: stats,
      anomalies: anomalyMap,
      availableYears: years.length > 0 ? years : [2026],
      allDays: Array.from(daysSet).sort(),
    };
  }, [daily]);

  const monthNames = lang === "es" ? MONTH_NAMES_ES : MONTH_NAMES_EN;

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-ignis-border pb-3 gap-3">
        <div>
          <div className="font-bold text-xs uppercase tracking-wider text-ignis-text">
            {lang === "es" ? "Matriz de Calendario de Actividad" : "Fire Activity Calendar Matrix"}
          </div>
          <div className="text-[11px] text-ignis-muted mt-0.5">
            {lang === "es"
              ? "Armonización histórica multianual: tendencias, anomalías (p90) y estacionalidad de fuego"
              : "Multi-year historical harmonization: trends, p90 anomalies and fire seasonality"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              {lang === "es" ? "Vista Mensual" : "Monthly View"}
            </button>
            <button
              onClick={() => setCalendarViewMode("interannual")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                calendarViewMode === "interannual"
                  ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                  : "text-ignis-muted hover:text-white"
              }`}
            >
              {lang === "es" ? "Comparativa Interanual" : "Interannual Comparison"}
            </button>
          </div>

          {/* Selector de Año dinámico (26 años soportados sin hardcode) */}
          <div className="flex items-center gap-1 bg-ignis-bg px-2 py-0.5 rounded-md border border-ignis-border">
            <span className="text-[10px] font-mono text-ignis-muted uppercase">
              {lang === "es" ? "Año:" : "Year:"}
            </span>
            <select
              value={selectedYear}
              onChange={(e) => onSelectYear(Number(e.target.value))}
              className="bg-transparent text-[11px] font-mono text-white font-bold outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-[#161B22] text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-2.5 py-1 bg-ignis-surface border border-ignis-border rounded-md text-[11px] font-mono text-ignis-text"
          >
            {monthNames.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name} {idx === 10 ? (lang === "es" ? "(Ventana activa)" : "(Active window)") : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leyenda técnica oficial */}
      <div className="flex flex-wrap justify-between items-center my-2.5 text-[11px] text-ignis-muted gap-2">
        <div className="flex flex-wrap gap-3 items-center">
          <span>{lang === "es" ? "Escala FRP:" : "FRP Scale:"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#1E232A]"></span> 0 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#D97706]"></span> ≤ 50 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#EA580C]"></span> ≤ 250 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC2626]"></span> ≤ 1000 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-[#991B1B]"></span> &gt; 1000 MW</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] stripe-nodata border border-ignis-border"></span> {lang === "es" ? "Sin datos" : "No data"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] border border-dashed border-ignis-accent"></span> {lang === "es" ? "Anomalía p90" : "p90 Anomaly"}</span>
        </div>

        {selectedDate && (
          <button
            onClick={() => onSelectDate(null)}
            className="text-[11px] font-mono text-ignis-accent hover:underline"
          >
            {lang === "es" ? "Ver ventana completa" : "View full window"} ({formatWindowShort(allDays)})
          </button>
        )}
      </div>

      {/* Contenedor dinámico */}
      {calendarViewMode === "interannual" ? (
        <div className="mt-3">
          <div className="font-mono text-xs text-ignis-muted mb-2.5 flex justify-between items-center">
            <span>
              {lang === "es"
                ? `COMPARATIVA INTERANUAL DE ${monthNames[selectedMonth - 1]?.toUpperCase()} A TRAVÉS DE LOS AÑOS:`
                : `INTERANNUAL COMPARISON FOR ${monthNames[selectedMonth - 1]?.toUpperCase()} ACROSS YEARS:`}
            </span>
            <span className="text-[10px] text-ignis-muted">
              {availableYears.length} {lang === "es" ? "años registrados" : "recorded years"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {availableYears.map((y) => {
              const mPrefix = String(selectedMonth).padStart(2, "0");
              const prefix = `${y}-${mPrefix}`;
              const daysInMonthYear = allDays.filter((d) => d.startsWith(prefix));
              let foci = 0;
              let maxFRP = 0;

              const era = eras ? eras[String(y)] : null;
              const isSoloModis = era ? era.solo_modis : y < 2012;
              const platCount = era ? era.n_plataformas : (y < 2012 ? 1 : (y < 2018 ? 2 : (y < 2024 ? 3 : 4)));
              const platTooltip = era
                ? Object.keys(era.plataformas).join(", ")
                : (isSoloModis ? "MODIS (Terra/Aqua)" : "MODIS + VIIRS");

              if (daysInMonthYear.length > 0) {
                daysInMonthYear.forEach((dt) => {
                  const s = dailyStats[dt];
                  if (s) {
                    foci += s.n;
                    maxFRP = Math.max(maxFRP, s.maxFRP);
                  }
                });

                return (
                  <div
                    key={y}
                    onClick={() => {
                      onSelectYear(y);
                      setCalendarViewMode("month");
                    }}
                    className={`bg-[#1c2128] border rounded p-2.5 cursor-pointer hover:border-ignis-accent transition flex flex-col justify-between ${
                      selectedYear === y ? "border-ignis-accent ring-1 ring-ignis-accent" : "border-ignis-border"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-mono font-bold text-white">{y}</span>
                        <span
                          title={`Plataformas satelitales: ${platTooltip}`}
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                            isSoloModis
                              ? "bg-[#271E14] text-[#D97706] border-[#D97706]/40"
                              : "bg-[#21262D] text-ignis-muted border-ignis-border"
                          }`}
                        >
                          {platCount} plat.
                        </span>
                      </div>
                      <div className="font-mono text-base font-bold text-white mt-1">
                        {formatInt(foci)}
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-ignis-border/40">
                      <div className="text-[9px] font-mono text-ignis-muted">
                        {daysInMonthYear.length}d · {Math.round(maxFRP)} MW
                      </div>
                      {isSoloModis && (
                        <div className="text-[8px] font-mono text-[#D97706] mt-0.5 leading-tight">
                          {lang === "es" ? "sólo MODIS: sin VIIRS" : "MODIS only: no VIIRS"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={y} className="stripe-nodata border border-ignis-border rounded p-2.5 opacity-60">
                    <div className="text-[10px] uppercase font-mono text-ignis-muted">{y}</div>
                    <div className="font-mono text-xs font-bold text-ignis-muted mt-1">
                      {lang === "es" ? "Sin datos" : "No data"}
                    </div>
                  </div>
                );
              }
            })}
          </div>

          <div className="mt-3 text-[11px] font-mono text-ignis-muted bg-ignis-bg p-2.5 rounded border border-ignis-border flex flex-col sm:flex-row justify-between gap-2">
            <div>
              {lang === "es"
                ? "Esta vista responde textualmente la pregunta de Marina Companuchi: «cuántos focos tuvo un mes a través de distintos años»."
                : "This view directly answers Marina Companuchi's question: «how many fire foci occurred in a specific month across different years»."}
            </div>
            <div className="text-[#D97706]">
              {lang === "es"
                ? "Nota: Años < 2012 reflejan sólo MODIS (1 km). Los escalones en 2012, 2018 y 2024 corresponden a nuevas plataformas, no a más fuego."
                : "Note: Years < 2012 reflect MODIS only (1 km). Steps in 2012, 2018 and 2024 reflect new satellite instruments, not more fire."}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px] text-ignis-muted py-1 border-t border-ignis-border/60">
            {(lang === "es" ? ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]).map(
              (dayName) => (
                <div key={dayName}>{dayName}</div>
              )
            )}
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
              const dayStat = dailyStats[dayStr];
              const hasData = Boolean(dayStat && dayStat.n > 0);
              const isSelected = selectedDate === dayStr;
              const isAnomaly = anomalies[dayStr];

              if (hasData) {
                const dayFoci = dayStat ? dayStat.n : 0;
                const maxFRP = dayStat ? dayStat.maxFRP : 0;
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
                      <div className="font-mono text-[10px] text-ignis-muted">{formatInt(maxFRP)} MW</div>
                    </div>
                  </button>
                );
              } else {
                return (
                  <div
                    key={dayStr}
                    className="h-[76px] stripe-nodata border border-ignis-border/50 rounded-[2px] p-2 flex flex-col justify-between opacity-60 cursor-not-allowed"
                    title={lang === "es" ? "Sin datos satelitales en esta fecha" : "No satellite data on this date"}
                  >
                    <span className="font-mono text-xs text-ignis-muted">{dayNum}</span>
                    <span className="font-mono text-[10px] text-ignis-muted">{lang === "es" ? "Sin datos" : "No data"}</span>
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
