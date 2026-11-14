"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { KPICards } from "../components/KPICards";
import { CalendarMatrix } from "../components/CalendarMatrix";
import { DayDetails } from "../components/DayDetails";
import { AuditPanel } from "../components/AuditPanel";
import { DailyRow, EraPlatform, GridCell } from "../types/ignis";
import { calculateKPIsFromDaily, formatWindowShort } from "../lib/kpi";

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
  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [eras, setEras] = useState<Record<string, EraPlatform> | null>(null);
  const [kpiMeta, setKpiMeta] = useState<{ n_celdas_total?: number } | null>(null);
  const [yearCells, setYearCells] = useState<Record<string, GridCell[]>>({});
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lang, setLang] = useState<"es" | "en">("es");

  // 1. Cargar el agregado diario, épocas y metadata de KPIs (Fix 2.3 de PLAN-DEV.md)
  useEffect(() => {
    fetch("/data/daily.json")
      .then((r) => r.json())
      .then(setDaily)
      .catch((err) => {
        console.error("Error al cargar daily.json:", err);
        setDaily([]);
      });

    fetch("/data/eras.json")
      .then((r) => r.json())
      .then(setEras)
      .catch(() => setEras({}));

    fetch("/data/kpi.json")
      .then((r) => r.json())
      .then(setKpiMeta)
      .catch(() => null);
  }, []);

  // 2. Lazy loading de celdas por año solo cuando se requiere para el mapa (Fix 2.5)
  useEffect(() => {
    const yr = String(selectedYear);
    if (!selectedYear || yearCells[yr]) return;

    fetch(`/data/calendar-${yr}.json`)
      .then((r) => r.json())
      .then((d) => {
        setYearCells((prev) => ({ ...prev, [yr]: d.cells || [] }));
      })
      .catch(() => {
        setYearCells((prev) => ({ ...prev, [yr]: [] }));
      });
  }, [selectedYear, yearCells]);

  // 3. KPIs calculados ultra-rápidos desde daily (Fix 2.4)
  const kpis = useMemo(() => {
    if (!daily || daily.length === 0) return null;
    return calculateKPIsFromDaily(daily);
  }, [daily]);

  // Días disponibles
  const availableDays = useMemo(() => {
    return daily ? daily.map((r) => r.d) : [];
  }, [daily]);

  // Fila diaria seleccionada
  const selectedDailyRow = useMemo(() => {
    if (!selectedDate || !daily) return null;
    return daily.find((r) => r.d === selectedDate) || null;
  }, [selectedDate, daily]);

  // Celdas del año activo
  const activeCells = useMemo(() => {
    return yearCells[String(selectedYear)] || [];
  }, [selectedYear, yearCells]);

  // Exportar Analytics CSV (M1: denominador unificado · M2: BOM + Blob para Excel Windows)
  const handleExportCSV = () => {
    if (!daily || daily.length === 0) return;
    const rows = [
      ["fecha", "n_total", "n_modis", "n_viirs", "frp_suma_modis_MW", "frp_suma_viirs_MW", "coincidencia_ambos_celdas", "total_celdas_dia"]
    ];

    daily.forEach((r) => {
      rows.push([
        r.d,
        String(r.n),
        String(r.m),
        String(r.v),
        String(r.fm),
        String(r.fv),
        String(r.am),
        String(r.cd),
      ]);
    });

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ignis_analytics_serie_armonizada_${availableDays.length}_dias.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ignis-bg">
      <Navbar
        days={availableDays}
        lang={lang}
        onToggleLang={setLang}
        onExportCSV={handleExportCSV}
      />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 space-y-4">
        {/* 1. KPIs en runtime */}
        <section aria-label="KPIs oficiales">
          {kpis ? (
            <KPICards
              kpis={kpis}
              totalCeldas={kpiMeta?.n_celdas_total || 35738}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-ignis-surface border border-ignis-border rounded-lg p-4 h-24 animate-pulse"
                />
              ))}
            </div>
          )}
        </section>

        {/* 2. Matriz de Calendario de Actividad (Multi-año / 12 meses / p90 / Épocas) */}
        <section aria-label="Matriz de Calendario de Actividad">
          <CalendarMatrix
            daily={daily || []}
            eras={eras}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            lang={lang}
          />
        </section>

        {/* 3. Mapa y Ficha de Inspección */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Mapa y ficha de inspección">
          <div className="lg:col-span-2">
            <FireMap
              cells={activeCells}
              days={availableDays}
              selectedDate={selectedDate}
            />
          </div>
          <div className="lg:col-span-1">
            <DayDetails
              dailyRow={selectedDailyRow}
              cells={activeCells}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              availableDays={availableDays}
              lang={lang}
            />
          </div>
        </section>

        {/* 4. Resumen Metodológico y Épocas Satelitales */}
        <section aria-label="Marco oficial">
          <AuditPanel />
        </section>
      </main>

      <footer className="border-t border-ignis-border bg-ignis-surface py-3 px-6 text-center text-[11px] font-mono text-ignis-muted flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          {lang === "es"
            ? "IGNIS · Calendario de Actividad de Incendios · Sede Bahía Blanca"
            : "IGNIS · Fire Activity Calendar · Bahía Blanca Local Event"}
        </div>
        <div>
          {lang === "es"
            ? "Serie 2000-2026 · MODIS desde 2000 · VIIRS desde 2012 (Suomi-NPP), 2018 (NOAA-20) y 2024 (NOAA-21)"
            : "Series 2000-2026 · MODIS since 2000 · VIIRS since 2012 (Suomi-NPP), 2018 (NOAA-20) and 2024 (NOAA-21)"}
        </div>
      </footer>
    </div>
  );
}
