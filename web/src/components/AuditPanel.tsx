import React from "react";

export const AuditPanel: React.FC = () => {
  return (
    <div className="bg-ignis-surface border border-ignis-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
      <div>
        <div className="font-bold text-xs uppercase tracking-wider text-ignis-text mb-1.5">
          Marco del Desafío (Marina Companuchi, CONAE)
        </div>
        <p className="text-ignis-muted mb-2 leading-relaxed">
          «MODIS está saliendo de su vida operativa. Si no hay un método para comparar sus datos, casi 10 años de información histórica se van a perder... Tu desafío es desarrollar un calendario que combine la historia de MODIS con la continuidad de VIIRS, para que al final no importe de qué sensor vino el foco».
        </p>
        <p className="text-ignis-muted leading-relaxed">
          El 14,6% de coincidencia medido en el AOI no es un error de detección: es la prueba empírica de que un píxel de 375 m ve quemas agrícolas, industriales y desmontes chicos que el píxel de 1.000 m de MODIS ignora.
        </p>
      </div>

      <div className="md:border-l md:border-ignis-border md:pl-5">
        <div className="font-bold text-xs uppercase tracking-wider text-ignis-text mb-1.5">
          Límites de Uso y Declaración del Producto
        </div>
        <ul className="text-ignis-muted space-y-1.5">
          <li>• <strong>No estima superficie quemada:</strong> mide calor radiativo puntual (MW), no cicatrices de área quemada (MCD64A1).</li>
          <li>• <strong>No infiere causalidad:</strong> detecta energía térmica sin discernir intencionalidad humana o ignición.</li>
          <li>• <strong>Paso orbital discreto:</strong> las observaciones se registran en sobrevuelos cada ~12 horas, no en continuo.</li>
          <li>• <strong>Criterio de anomalía:</strong> percentil 90 del FRP diario para el mismo día del año.</li>
        </ul>
      </div>
    </div>
  );
};
