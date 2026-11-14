"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../components/Navbar";
import { KPICards } from "../components/KPICards";
import { CalendarMatrix } from "../components/CalendarMatrix";
import { DayDetails } from "../components/DayDetails";
import { AuditPanel } from "../components/AuditPanel";
import { DailyRow, EraPlatform, GridCell, CalculatedKPIs } from "../types/ignis";
import { calculateKPIsFromDaily, formatInt } from "../lib/kpi";

interface KPIMetaContract {
  aoi?: {
    desde?: string;
    hasta?: string;
    n_dias?: number;
    grain_deg?: number;
    bbox_W_S_E_N?: number[];
  };
  global?: {
    total?: number;
    modis?: number;
    viirs?: number;
    ratio?: number;
    frp_total_mw?: number;
    frp_modis_mw?: number;
    frp_viirs_mw?: number;
    frp_medio_modis?: number;
    frp_medio_viirs?: number;
  };
  n_celdas_total?: number;
  coincidencia_celda_dia?: {
    ambos?: number;
    ambos_pct?: number;
    total_celdas_dia?: number;
  };
}

const INITIAL_KPIS: CalculatedKPIs = {
  totalDetecciones: 8757997,
  modisDetecciones: 2201939,
  viirsDetecciones: 6556058,
  ratioViirsModis: 2.98,
  frpTotal: 184650645.6,
  frpModis: 106775045.5,
  frpViirs: 77875600.1,
  frpMedioModis: 48.49,
  frpMedioViirs: 11.88,
  coincidencia: {
    ambos: 409333,
    soloModis: 809720,
    soloViirs: 1362933,
    pctAmbos: 15.9,
    pctSoloModis: 31.4,
    pctSoloViirs: 52.7,
  },
};

const FireMap = dynamic(
  () => import("../components/FireMap").then((mod) => mod.FireMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-ignis-surface border border-ignis-border rounded-lg p-3 flex flex-col h-[580px]">
        <div className="flex justify-between items-center pb-2 border-b border-ignis-border">
          <div className="font-bold text-xs uppercase tracking-wider text-ignis-text">
            Serie Única Armonizada (Rejilla 0,05°)
          </div>
          <div className="flex gap-1">
            <div className="px-2.5 py-1 rounded text-[11px] font-mono bg-ignis-surface text-ignis-muted border border-ignis-border">
              Serie Armonizada
            </div>
            <div className="px-2.5 py-1 rounded text-[11px] font-mono bg-ignis-surface text-ignis-muted border border-ignis-border">
              Auditoría Sensor
            </div>
          </div>
        </div>

        <div className="relative flex-1 w-full rounded border border-ignis-border bg-[#12161c] my-2 flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="w-5 h-5 border-2 border-ignis-accent border-t-transparent rounded-full animate-spin mb-2" />
          <div className="text-xs font-bold text-ignis-text uppercase tracking-wider mb-1">
            Lienzo Cartográfico Geoespacial
          </div>
          <div className="text-[11px] text-ignis-muted max-w-sm">
            Inicializando capas satelitales (Leaflet Canvas 2D · No bloqueante)...
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono text-ignis-muted pt-1">
          <div>Vista: Magnitud unificada FRP (escala oficial)</div>
          <div>Centro-Norte Argentina · Esri Dark Canvas</div>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [eras, setEras] = useState<Record<string, EraPlatform> | null>(null);
  const [kpiMeta, setKpiMeta] = useState<KPIMetaContract | null>(null);
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
    if (!daily || daily.length === 0) return INITIAL_KPIS;
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

  // Al elegir un día, el año activo tiene que seguirlo: si no, el mapa y la ficha
  // buscan las celdas del día en el archivo del año equivocado y quedan vacíos.
  const handleSelectDate = (d: string | null) => {
    setSelectedDate(d);
    if (d) {
      const y = Number(d.slice(0, 4));
      if (y && y !== selectedYear) setSelectedYear(y);
    }
  };

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
          <KPICards
            kpis={kpis}
            totalCeldas={kpiMeta?.n_celdas_total || 54438}
          />
        </section>

        {/* 2. Matriz de Calendario de Actividad (Multi-año / 12 meses / p90 / Épocas) */}
        <section aria-label="Matriz de Calendario de Actividad">
          <CalendarMatrix
            daily={daily || []}
            eras={eras}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
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

        {/* 4. Límites declarados del producto (los números de la UI salen del dato) */}
        <section aria-label="Límites del producto">
          <AuditPanel lang={lang} />
        </section>
      </main>

      <footer className="border-t border-ignis-border bg-ignis-surface py-3 px-6 text-center text-[11px] font-mono text-ignis-muted flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          {lang === "es"
            ? "IGNIS · Calendario de Actividad de Incendios · Sede Bahía Blanca"
            : "IGNIS · Fire Activity Calendar · Bahía Blanca Local Event"}
        </div>
        <div>
          {(() => {
            const desde = daily && daily.length > 0 ? daily[0].d : (kpiMeta?.aoi?.desde || "2000-11-01");
            const hasta = daily && daily.length > 0 ? daily[daily.length - 1].d : (kpiMeta?.aoi?.hasta || "2026-11-13");
            const totalFocos = kpis ? kpis.totalDetecciones : (kpiMeta?.global?.total || 8757997);
            return lang === "es"
              ? `Serie: ${desde} → ${hasta} (${formatInt(totalFocos)} focos)`
              : `Series: ${desde} → ${hasta} (${formatInt(totalFocos)} foci)`;
          })()}
        </div>
      </footer>
    </div>
  );
}
