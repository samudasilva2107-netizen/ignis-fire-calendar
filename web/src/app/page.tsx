"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { KPICards } from "../components/KPICards";
import { CalendarMatrix } from "../components/CalendarMatrix";
import { DayDetails } from "../components/DayDetails";
import { AuditPanel } from "../components/AuditPanel";
import { CalendarContract } from "../types/ignis";
import { calculateKPIsFromCalendar } from "../lib/kpi";

import calendarJson from "../../public/data/calendar.json";

const FireMap = dynamic(
  () => import("../components/FireMap").then((mod) => mod.FireMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-5 h-[580px] flex items-center justify-center text-ignis-muted font-mono text-xs">
        Cargando mapa geoespacial...
      </div>
    ),
  }
);

export default function Home() {
  const calendarData = calendarJson as unknown as CalendarContract;

  // Runtime calculation of authoritative KPIs
  const kpis = useMemo(() => {
    return calculateKPIsFromCalendar(calendarData);
  }, [calendarData]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Exportar Analytics CSV (M1: denominador unificado · M2: BOM + Blob para Excel Windows)
  const handleExportCSV = () => {
    const days = calendarData.days || [];
    const rows = [
      ["fecha", "n_total", "n_modis", "n_viirs", "frp_max_MW", "frp_sum_MW", "coincidencia_ambos_pct", "celdas_activas"]
    ];

    days.forEach((d) => {
      let nTotal = 0, nMod = 0, nVii = 0;
      let frpMax = 0, frpSum = 0;
      let both = 0, onlyMod = 0, onlyVii = 0;

      calendarData.cells.forEach((c) => {
        const m = c.days[d];
        if (m && m.n > 0) {
          nTotal += m.n;
          frpMax = Math.max(frpMax, m.frp_max);
          if (m.por_sensor) {
            if (m.por_sensor.MODIS) {
              nMod += m.por_sensor.MODIS.n;
              frpSum += m.por_sensor.MODIS.frp_sum;
            }
            if (m.por_sensor.VIIRS) {
              nVii += m.por_sensor.VIIRS.n;
              frpSum += m.por_sensor.VIIRS.frp_sum;
            }
          }
          const hasM = m.sensores && m.sensores.includes("MODIS");
          const hasV = m.sensores && m.sensores.includes("VIIRS");
          if (hasM && hasV) both++;
          else if (hasM) onlyMod++;
          else if (hasV) onlyVii++;
        }
      });

      // M1: Mismo denominador oficial del KPI y la pantalla
      const totCellDays = both + onlyMod + onlyVii;
      const pct = totCellDays > 0 ? (both / totCellDays * 100).toFixed(1) : "0.0";
      rows.push([d, String(nTotal), String(nMod), String(nVii), frpMax.toFixed(2), frpSum.toFixed(2), pct, String(totCellDays)]);
    });

    // M2: BOM UTF-8 (\ufeff) + Blob + ObjectURL
    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ignis_analytics_serie_armonizada.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ignis-bg">
      <Navbar days={calendarData.days} onExportCSV={handleExportCSV} />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 space-y-4">
        {/* 1. KPIs en runtime */}
        <section aria-label="KPIs oficiales">
          <KPICards kpis={kpis} totalCeldas={calendarData.cells.length} />
        </section>

        {/* 2. Matriz de Calendario de Actividad (12 meses / días / p90) */}
        <section aria-label="Matriz de Calendario de Actividad">
          <CalendarMatrix
            calendar={calendarData}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </section>

        {/* 3. Mapa y Ficha de Inspección */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Mapa y ficha de inspección">
          <div className="lg:col-span-2">
            <FireMap
              cells={calendarData.cells}
              days={calendarData.days}
              selectedDate={selectedDate}
            />
          </div>
          <div className="lg:col-span-1">
            <DayDetails
              calendar={calendarData}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        </section>

        {/* 4. Resumen Metodológico y Límites */}
        <section aria-label="Marco oficial">
          <AuditPanel />
        </section>
      </main>

      <footer className="border-t border-ignis-border bg-ignis-surface py-3 px-6 text-center text-[11px] font-mono text-ignis-muted flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>IGNIS · Calendario de Actividad de Incendios · Sede Bahía Blanca</div>
        <div>
          Fuente: NASA FIRMS (MODIS C6.1 / VIIRS C2) · NRT · Ventana:{" "}
          {calendarData.days?.[0]} a {calendarData.days?.[calendarData.days.length - 1]} ({calendarData.days?.length} días)
        </div>
      </footer>
    </div>
  );
}
