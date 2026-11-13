import React from "react";
import { Download } from "lucide-react";
import { formatWindowShort } from "../lib/kpi";

interface NavbarProps {
  days?: string[];
  onExportCSV?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ days, onExportCSV }) => {
  return (
    <header className="h-14 bg-ignis-surface border-b border-ignis-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-ignis-accent text-black font-mono font-bold text-xs flex items-center justify-center rounded-[2px]">
          IG
        </div>
        <div>
          <div className="font-bold text-sm tracking-wide text-ignis-text">
            IGNIS — CALENDARIO DE ACTIVIDAD DE INCENDIOS
          </div>
          <div className="text-[11px] text-ignis-muted font-mono">
            CONAE · NASA SPACE APPS 2026 · SERIE ARMONIZADA MODIS / VIIRS
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block text-[11px] font-mono text-ignis-muted text-right">
          <div>AOI: Centro-Norte Argentina (-68.5,-35.0,-56.0,-22.0)</div>
          <div>Rejilla: 0,05° (~5,6 km) · Ventana: {formatWindowShort(days)}</div>
        </div>

        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ignis-surface border border-ignis-border hover:bg-[#21262D] hover:border-ignis-muted rounded-md text-[11px] font-mono text-ignis-text transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Analytics (CSV)</span>
          </button>
        )}
      </div>
    </header>
  );
};
