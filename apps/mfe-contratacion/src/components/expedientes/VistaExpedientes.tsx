import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Search, ShieldCheck } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Cargando } from '../shared/PiezasPanel';
import { ProcesoResumen } from '../../types';
import { PanelAuditoria } from '../auditoria/PanelAuditoria';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Expedientes electrónicos — tab propio del módulo (EFDS-1186).
 *
 * Va en el menú y no dentro del detalle del proceso porque el expediente se
 * consulta también sin estar trabajando un proceso: es lo que abre un
 * organismo de control, y llegar a él pasando por la lista, el detalle y un
 * botón lo escondía. Es el mismo lugar que ocupa en control interno y en
 * gestión legal.
 */
export function VistaExpedientes() {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    contratacionService
      .listarProcesos()
      .then((p) => setProcesos(p))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return procesos;
    return procesos.filter(
      (p) =>
        p.radicado.toLowerCase().includes(q) ||
        p.objeto.toLowerCase().includes(q) ||
        p.expediente?.numeroExpediente.toLowerCase().includes(q),
    );
  }, [procesos, busqueda]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#0891B215' }}
          >
            <FolderOpen className="w-5 h-5" style={{ color: '#0891B2' }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold m-0" style={{ color: '#0891B2' }}>
              Expedientes electrónicos
            </h2>
            <p className="text-[12.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              El expediente de cada proceso, completo y sin editar. Trae las actividades
              trabajadas, los documentos con su huella de integridad, el historial de
              supervisión, las modificaciones y toda la trazabilidad.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-4 py-3 border-b border-gray-100">
          <label className="relative block">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por radicado, objeto o número de expediente"
              aria-label="Buscar expedientes"
              className="w-full text-[12.5px] rounded-lg border border-gray-200 bg-white
                pl-9 pr-3 py-2 text-slate-700 placeholder:text-slate-400
                focus:outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/20"
            />
          </label>
        </div>

        {cargando ? (
          <Cargando filas={4} />
        ) : error ? (
          <p className="text-xs text-red-600 m-0 px-4 py-6 text-center">{error}</p>
        ) : filtrados.length === 0 ? (
          <p className="text-xs text-slate-500 m-0 px-4 py-6 text-center">
            {busqueda ? 'Ningún expediente coincide con la búsqueda' : 'Todavía no hay procesos'}
          </p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-gray-100">
            {filtrados.map((p) => (
              <li key={p.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-bold text-slate-800">{p.radicado}</span>
                      {p.expediente && (
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {p.expediente.numeroExpediente}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 truncate">{p.objeto}</p>
                    <p className="text-[10.5px] text-slate-400 m-0 mt-0.5">
                      {p.modalidadNombre ?? '—'}
                      {p.valorEstimado ? ` · ${formatoPesos.format(p.valorEstimado)}` : ''}
                      {` · Etapa ${p.etapa} de 10`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAbierto((v) => (v === p.id ? null : p.id))}
                    aria-expanded={abierto === p.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]
                      font-bold border transition-colors flex-shrink-0
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40 ${
                        abierto === p.id
                          ? 'bg-[#0891B2]/10 border-[#0891B2]/30 text-[#0891B2]'
                          : 'bg-white border-gray-200 text-slate-600 hover:border-[#0891B2]/30 hover:text-[#0891B2]'
                      }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    {abierto === p.id ? 'Cerrar' : 'Consultar'}
                  </button>
                </div>

                {abierto === p.id && (
                  <div className="border-t border-gray-100 bg-slate-50/50">
                    <PanelAuditoria procesoId={p.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
