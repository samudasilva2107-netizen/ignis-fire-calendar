import React from "react";

/**
 * Declaración de límites del producto.
 *
 * Nota: el bloque "Marco del Desafío" se retiró de la interfaz. Citaba a la autora
 * del desafío y mostraba un porcentaje de coincidencia hardcodeado (14,6%) que ya
 * no coincidía con el KPI calculado en runtime. Ese texto vive en docs/METHOD.md y
 * en la submission del proyecto. Regla: cualquier número que se muestre en la UI
 * sale de daily.json, nunca del copy.
 */
export const AuditPanel: React.FC<{ lang?: "es" | "en" }> = ({ lang = "es" }) => {
  const t =
    lang === "es"
      ? {
          title: "Límites de Uso y Declaración del Producto",
          items: [
            ["No estima superficie quemada:", "mide calor radiativo puntual (MW), no cicatrices de área quemada (MCD64A1)."],
            ["No infiere causalidad:", "detecta energía térmica sin discernir intencionalidad humana o ignición."],
            ["Paso orbital discreto:", "las observaciones se registran en sobrevuelos cada ~12 horas, no en continuo."],
            ["Criterio de anomalía:", "percentil 90 del FRP diario para el mismo día del año."],
            ["Día sin datos ≠ día sin fuego:", "sin máscara de nubes en este producto, el vacío se marca como dato no confirmado."],
          ],
        }
      : {
          title: "Usage Limits and Product Declaration",
          items: [
            ["Does not estimate burned area:", "it measures instantaneous radiative heat (MW), not burned scars (MCD64A1)."],
            ["Does not infer causality:", "it detects thermal energy without discerning human intent or ignition."],
            ["Discrete orbital sampling:", "observations come from overpasses roughly every 12 hours, not continuously."],
            ["Anomaly criterion:", "90th percentile of daily FRP for the same day of the year."],
            ["No data ≠ no fire:", "this product carries no cloud mask, so gaps are marked as unconfirmed data."],
          ],
        };

  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 text-xs">
      <div className="font-bold text-xs uppercase tracking-wider text-ignis-text mb-1.5">
        {t.title}
      </div>
      <ul className="text-ignis-muted space-y-1.5 md:grid md:grid-cols-2 md:gap-x-6 md:space-y-0">
        {t.items.map(([label, body]) => (
          <li key={label}>
            • <strong>{label}</strong> {body}
          </li>
        ))}
      </ul>
    </div>
  );
};
