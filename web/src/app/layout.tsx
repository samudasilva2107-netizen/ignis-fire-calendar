import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGNIS — Calendario de Actividad de Incendios",
  description: "Armonización satelital de focos MODIS y VIIRS · NASA Space Apps Challenge 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-ignis-dark text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
