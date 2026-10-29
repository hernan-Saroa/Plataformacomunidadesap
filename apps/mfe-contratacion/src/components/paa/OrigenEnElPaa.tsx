import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Lock } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { OrigenPaaDelProceso } from '../../types';
import { DECISION, TIPO_REVISION, fechaCorta } from './formato';

const TIPO_APLICACION: Record<string, string> = {
  CREACION: 'Nació de',
  ACTUALIZACION: 'Actualizado desde',
  MIGRACION: 'Migrado a',
};

/**
 * De qué línea del PAA sale el proceso y qué le ha hecho el PAA desde entonces.
 *
 * Es lo que permite reconstruir con qué información nació y qué cambió después:
 * la línea con su versión y su año, cada actualización con lo que se aplicó, y
 * cada revisión con su decisión. Los procesos creados antes de que existiera el
 * PAA en la plataforma no tienen origen, y no se muestra nada.
 */
export function OrigenEnElPaa({ procesoId, version }: { procesoId: string; version?: unknown }) {
  const [origen, setOrigen] = useState<OrigenPaaDelProceso | null>(null);

  useEffect(() => {
    let vigente = true;
    contratacionService.paa
      .origenDelProceso(procesoId)
      .then((o) => vigente && setOrigen(o))
      .catch(() => vigente && setOrigen(null));
    return () => {
      vigente = false;
    };
  }, [procesoId, version]);

  if (!origen?.tieneOrigen || !origen.linea) return null;
  const { linea } = origen;
  const pendientes = origen.revisiones.filter((r) => r.estado === 'PENDIENTE');

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden" aria-label="Origen en el PAA">
      <h3 className="m-0 px-4 py-3 border-b border-gray-100 text-sm font-bold text-slate-900 flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-emerald-700" aria-hidden="true" />
        Origen en el Plan de Adquisiciones
      </h3>
      <div className="px-4 py-3 space-y-2">
        <p className="m-0 text-sm">
          <span className="font-mono font-bold text-[#003DA5]">{linea.codigo}</span> · {linea.region}
        </p>
        <p className="m-0 text-xs text-gray-500">
          PAA {linea.anio} · versión {linea.version.numero}
          {linea.version.estado !== 'ACTIVA' && ' (ya no es la activa)'}
          {!linea.vigente && ' · vigencia anterior'}
        </p>

        {origen.bloqueado && (
          <p className="m-0 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Detenido hasta que se decida la revisión por cambio del PAA.
          </p>
        )}
        {pendientes.map((r) => (
          <p key={r.id} className="m-0 text-xs text-amber-800">
            Revisión pendiente: {TIPO_REVISION[r.tipo]} · la decide {r.responsable?.nombre ?? 'quien pueda decidir revisiones del PAA'}
          </p>
        ))}

        <details className="text-xs">
          <summary className="cursor-pointer font-bold text-slate-600">Historial ({origen.aplicaciones.length + origen.revisiones.length})</summary>
          <ul className="cambios-paa m-0 mt-2 space-y-2">
            {origen.aplicaciones.map((a) => (
              <li key={a.id} className="text-slate-700">
                <span className="font-bold">{TIPO_APLICACION[a.tipo]}</span> {a.codigoDestino} (PAA {a.anioDestino} v{a.versionDestino})
                {a.codigoOrigen && a.tipo === 'MIGRACION' && ` desde ${a.codigoOrigen} (${a.anioOrigen})`}
                <span className="block text-gray-500">
                  {fechaCorta(a.aplicadoAt)} · {a.aplicadoPor ?? 'Sistema'}
                  {a.tipo !== 'CREACION' &&
                    ` · aplicado: ${a.campos.filter((c) => c.aplicado).map((c) => c.etiqueta).join(', ') || 'nada'}`}
                </span>
              </li>
            ))}
            {origen.revisiones
              .filter((r) => r.estado === 'RESUELTA')
              .map((r) => (
                <li key={r.id} className="text-slate-700">
                  <span className="font-bold">{TIPO_REVISION[r.tipo]}</span> → {DECISION[r.decision!].etiqueta}
                  <span className="block text-gray-500">
                    {fechaCorta(r.decididaAt)} · {r.decididaPor} · «{r.justificacion}»
                  </span>
                </li>
              ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
