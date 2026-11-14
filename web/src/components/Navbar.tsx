import React from "react";
import { Download } from "lucide-react";
import { formatWindowShort } from "../lib/kpi";

interface NavbarProps {
  days?: string[];
  lang?: "es" | "en";
  onToggleLang?: (lang: "es" | "en") => void;
  onExportCSV?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ days, lang = "es", onToggleLang, onExportCSV }) => {
  return (
    <header className="h-14 bg-ignis-surface border-b border-ignis-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-ignis-accent text-black font-mono font-bold text-xs flex items-center justify-center rounded-[2px]">
          IG
        </div>
        <div>
          <div className="font-bold text-sm tracking-wide text-ignis-text">
            {lang === "es" ? "IGNIS — CALENDARIO DE ACTIVIDAD DE INCENDIOS" : "IGNIS — FIRE ACTIVITY CALENDAR"}
          </div>
          <div className="text-[11px] text-ignis-muted font-mono">
            {lang === "es" ? "CONAE · NASA SPACE APPS 2026 · SERIE ARMONIZADA MODIS / VIIRS" : "CONAE · NASA SPACE APPS 2026 · HARMONIZED MODIS / VIIRS SERIES"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block text-[11px] font-mono text-ignis-muted text-right">
          <div>{lang === "es" ? "AOI: Centro-Norte Argentina (-68.5,-35.0,-56.0,-22.0)" : "AOI: Central-Northern Argentina (-68.5,-35.0,-56.0,-22.0)"}</div>
          <div>{lang === "es" ? "Rejilla: 0,05° (~5,6 km)" : "Grid: 0.05° (~5.6 km)"} · {lang === "es" ? "Ventana" : "Window"}: {formatWindowShort(days, lang)}</div>
        </div>

        <div className="flex bg-ignis-bg border border-ignis-border rounded p-0.5 font-mono text-[11px]">
          <button
            onClick={() => onToggleLang?.("es")}
            className={`px-1.5 py-0.5 rounded transition ${lang === "es" ? "bg-[#21262D] text-white font-bold" : "text-ignis-muted hover:text-white"}`}
          >
            ES
          </button>
          <button
            onClick={() => onToggleLang?.("en")}
            className={`px-1.5 py-0.5 rounded transition ${lang === "en" ? "bg-[#21262D] text-white font-bold" : "text-ignis-muted hover:text-white"}`}
          >
            EN
          </button>
        </div>

        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ignis-surface border border-ignis-border hover:bg-[#21262D] hover:border-ignis-muted rounded-md text-[11px] font-mono text-ignis-text transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === "es" ? "Descargar Analytics (CSV)" : "Download Analytics (CSV)"}</span>
          </button>
        )}
      </div>
    </header>
  );
};
