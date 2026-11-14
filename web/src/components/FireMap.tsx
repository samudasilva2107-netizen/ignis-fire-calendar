"use client";

import React, { useEffect, useRef, useState } from "react";
import { GridCell } from "../types/ignis";
import "leaflet/dist/leaflet.css";

interface FireMapProps {
  cells: GridCell[];
  days?: string[];
  selectedDate: string | null;
  onSelectCell?: (cell: GridCell) => void;
}

function getFRPColor(frp: number): string {
  if (frp <= 0) return "#1E232A";
  if (frp <= 50) return "#D97706";
  if (frp <= 250) return "#EA580C";
  if (frp <= 1000) return "#DC2626";
  return "#991B1B";
}

export const FireMap: React.FC<FireMapProps> = ({
  cells,
  days,
  selectedDate,
  onSelectCell,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mapMode, setMapMode] = useState<"unified" | "provenance">("unified");
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let L: any;
    let map: any;

    const initMap = async () => {
      try {
        L = await import("leaflet");

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        map = L.map(mapContainerRef.current, {
          center: [-28.5, -62.0],
          zoom: 5.5,
          minZoom: 4,
          maxZoom: 12,
          attributionControl: true,
          preferCanvas: true,
        });

        const cartoKey =
          process.env.NEXT_PUBLIC_CARTO_KEY ||
          process.env.NEXT_PUBLIC_CARTO_API_KEY ||
          "";
        const cartoUrl = cartoKey
          ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
          : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
        const cartoLayer = L.tileLayer(cartoUrl, {
          subdomains: "abcd",
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Fallback a Esri Dark Canvas si fallara CARTO
        cartoLayer.on("tileerror", () => {
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            { maxZoom: 16 }
          ).addTo(map);
        });

        layerGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        renderCircles(L, map);
      } catch (err: any) {
        console.error("Error al inicializar mapa en Leaflet:", err);
        setMapError(err?.message || "No se pudo cargar el mapa");
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !mapInstanceRef.current || !layerGroupRef.current) return;

    import("leaflet").then((L) => {
      renderCircles(L, mapInstanceRef.current);
    });
  }, [cells, selectedDate, mapMode, mounted]);

  const renderCircles = (L: any, map: any) => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    // Si no hay fecha específica seleccionada, mostramos hasta 1.200 celdas activas
    // para mantener 60 fps en dispositivos móviles y conexiones lentas sin saturar la CPU
    const targetCells = selectedDate
      ? cells.filter((c) => c.days && c.days[selectedDate])
      : cells.slice(0, 1200);

    // Yield to the browser render loop so Leaflet canvas never blocks calendar matrix interaction
    requestAnimationFrame(() => {
      if (!layerGroupRef.current) return;

      targetCells.forEach((cell) => {
        const relevantDays = selectedDate
          ? [cell.days[selectedDate]].filter(Boolean)
          : Object.values(cell.days);

        if (relevantDays.length === 0) return;

        let cellDetections = 0;
        let cellMaxFRP = 0;
        const allSensors = new Set<string>();

        relevantDays.forEach((d) => {
          cellDetections += d.n;
          cellMaxFRP = Math.max(cellMaxFRP, d.frp_max);
          d.sensores.forEach((s) => allSensors.add(s));
        });

        if (cellDetections === 0) return;

        const hasModis = allSensors.has("MODIS");
        const hasViirs = allSensors.has("VIIRS");
        const isBoth = hasModis && hasViirs;

        let color = getFRPColor(cellMaxFRP);
        if (mapMode === "provenance") {
          if (isBoth) color = "#F0F6FC"; // Ambos: blanco brillante (doble confirmación)
          else if (hasModis) color = "#D97706"; // Solo MODIS: ámbar oficial
          else color = "#EA580C"; // Solo VIIRS: naranja acento oficial
        }

        const radius = Math.min(Math.max(Math.sqrt(cellDetections) * 2200, 2500), 12000);

        const circle = L.circle([cell.lat, cell.lon], {
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          weight: 1,
          radius: radius,
        });

        const provenanceLabel = isBoth
          ? "MODIS + VIIRS (Coincidencia)"
          : hasModis
          ? "Solo MODIS (1 km)"
          : "Solo VIIRS (375 m)";

        const popupContent = `
          <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; padding: 4px;">
            <div style="font-weight: 700; color: #FFF; margin-bottom: 4px;">Celda (${cell.lat.toFixed(3)}, ${cell.lon.toFixed(3)})</div>
            <div style="color: #8B949E;">${selectedDate ? "Fecha: " + selectedDate : "Ventana acumulada"}</div>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid #30363D;"/>
            <div><strong>Detecciones:</strong> ${cellDetections}</div>
            <div><strong>FRP Máx:</strong> ${cellMaxFRP.toFixed(1)} MW</div>
            <div><strong>Procedencia:</strong> ${provenanceLabel}</div>
          </div>
        `;

        circle.bindPopup(popupContent);
        if (onSelectCell) {
          circle.on("click", () => onSelectCell(cell));
        }

        circle.addTo(layerGroupRef.current);
      });
    });
  };

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-3 flex flex-col min-h-[480px]">
      <div className="flex justify-between items-center pb-2 border-b border-ignis-border">
        <div>
          <span className="font-bold text-xs uppercase tracking-wider text-ignis-text">
            Serie Única Armonizada (Rejilla 0,05°)
          </span>
          <span className="font-mono text-xs text-ignis-muted ml-2">
            {selectedDate
              ? `[Día: ${selectedDate}]`
              : `[Ventana completa: ${days && days.length > 0 ? `${days.length} días` : 'Serie histórica'}]`}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setMapMode("unified")}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              mapMode === "unified"
                ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                : "bg-ignis-surface text-ignis-muted border border-ignis-border hover:bg-[#21262D]"
            }`}
          >
            Serie Armonizada
          </button>
          <button
            onClick={() => setMapMode("provenance")}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
              mapMode === "provenance"
                ? "bg-[#21262D] text-white border border-ignis-accent font-bold"
                : "bg-ignis-surface text-ignis-muted border border-ignis-border hover:bg-[#21262D]"
            }`}
          >
            Auditoría Sensor
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[480px] w-full rounded border border-ignis-border overflow-hidden my-2">
        {mapError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-mono text-ignis-muted bg-[#12161c]">
            <div className="text-xs font-bold text-ignis-accent uppercase tracking-wider mb-2">
              MAPA NO DISPONIBLE
            </div>
            <div className="text-[11px] max-w-sm">
              No se pudo inicializar la librería cartográfica en este entorno.
            </div>
            <div className="text-[10px] text-ignis-muted/70 mt-2">{mapError}</div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}
      </div>

      <div className="flex justify-between items-center text-[11px] font-mono text-ignis-muted pt-1">
        <div>
          {mapMode === "unified" ? (
            <span>Vista: Magnitud unificada FRP (escala oficial). Círculos proporcionales a radiación MW.</span>
          ) : (
            <span>
              Auditoría: <span style={{ color: "#D97706" }}>● Solo MODIS</span> ·{" "}
              <span style={{ color: "#EA580C" }}>● Solo VIIRS</span> ·{" "}
              <span style={{ color: "#F0F6FC" }}>● Ambos sensores</span>
            </span>
          )}
        </div>
        <div>Centro-Norte Argentina · Esri Dark Canvas</div>
      </div>
    </div>
  );
};
