import React, { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { DatosDelPaaEnEstudioPrevio } from '../../types';
import { valorPaa } from '../paa/formato';

interface Props {
  procesoId: string;
  /** Cambia cuando se recarga el estudio previo: una versión nueva del PAA puede haber movido la línea. */
  version?: unknown;
}

/**
 * Lo que la 3.1 muestra de su línea del PAA, aparte de los campos que el PAA
 * ya llena (objeto, línea, plazo, responsable).
 *
 * Qué columnas salen lo decide cada región por vigencia en Configuración →
 * Plan de Adquisiciones → Campos del formulario («En la 3.1»). Es de solo
 * lectura: los valores son los de la versión aplicada al proceso y solo
 * cambian con una versión nueva del PAA.
 */
export function DatosDelPaa({ procesoId, version }: Props) {
  const [datos, setDatos] = useState<DatosDelPaaEnEstudioPrevio | null>(null);

  useEffect(() => {
    let vigente = true;
    contratacionService.paa
      .datosParaEstudioPrevio(procesoId)
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setDatos(null));
    return () => {
      vigente = false;
    };
  }, [procesoId, version]);

  if (!datos?.tieneOrigen || !datos.linea || datos.campos.length === 0) return null;
  const { linea } = datos;

  return (
    <section aria-labelledby="sec-datos-paa">
      {/* Mismo encabezado que las secciones del formulario, para que se lea como una más. */}
      <h4
        id="sec-datos-paa"
        className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wide text-[#003DA5] m-0 mb-2.5
          pb-1.5 leading-relaxed border-b border-gray-200"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
        Datos del PAA
      </h4>
      <p className="text-xs text-slate-500 m-0 mb-2.5 leading-relaxed">
        <span className="font-mono font-bold">{linea.codigo}</span> · PAA {linea.anio} · versión {linea.version}.
        Solo lectura: vienen de la línea del PAA y cambian únicamente con una versión nueva.
      </p>
      <dl className="m-0 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {datos.campos.map((c) => (
          <div key={c.clave} className="min-w-0">
            <dt className="text-xs font-bold text-slate-500 m-0">{c.etiqueta}</dt>
            <dd className="text-sm text-slate-800 m-0 mt-0.5 break-words">{valorPaa(c.clave, c.valor)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
