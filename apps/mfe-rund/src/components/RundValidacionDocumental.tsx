import React, { useState } from 'react';
import { FileCheck, CheckCircle, XCircle, AlertCircle, Eye, Search, Filter } from 'lucide-react';
import { SoporteDocumental } from '../types/rund.types';
import { rundService } from '../services/api/rundService';

export const RundValidacionDocumental: React.FC = () => {
  const [soportes, setSoportes] = useState<any[]>([
    {
      idSoporte: '1',
      docenteNombre: 'Carlos Alberto Restrepo',
      numeroDocumento: '1020304050',
      tipoDocumento: 'TITULO_POSGRADO',
      nombreArchivo: 'Doctorado_Administracion_Publica.pdf',
      categoria: 'ACADEMICO',
      estadoValidacion: 'PENDIENTE',
      fechaSubida: '2026-03-28',
    },
    {
      idSoporte: '2',
      docenteNombre: 'Hernando José Vargas',
      numeroDocumento: '79845123',
      tipoDocumento: 'CERTIFICADO_MINCIENCIAS',
      nombreArchivo: 'Reconocimiento_Investigador_Emerito.pdf',
      categoria: 'INVESTIGACION',
      estadoValidacion: 'PENDIENTE',
      fechaSubida: '2026-03-29',
    },
    {
      idSoporte: '3',
      docenteNombre: 'Claudia Patricia Morales',
      numeroDocumento: '52890456',
      tipoDocumento: 'CERTIFICADO_LABORAL',
      nombreArchivo: 'Experiencia_Docente_Universidad_Nacional.pdf',
      categoria: 'LABORAL',
      estadoValidacion: 'PENDIENTE',
      fechaSubida: '2026-03-30',
    },
  ]);

  const handleValidate = async (id: string, estado: 'APROBADO' | 'RECHAZADO' | 'OBSERVADO') => {
    try {
      await rundService.validateSoporte(id, estado);
    } catch (e) {
      // simulate
    }
    setSoportes((prev) =>
      prev.map((s) => (s.idSoporte === id ? { ...s, estadoValidacion: estado } : s)),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Bandeja de Validación Documental RUND</h2>
        <p className="text-xs text-slate-500">Revisión y aprobación de títulos, méritos y certificaciones laborales</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Docente</th>
                <th className="py-3 px-4">Tipo & Documento</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Fecha Subida</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soportes.map((sop) => (
                <tr key={sop.idSoporte} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{sop.docenteNombre}</div>
                    <div className="text-[11px] text-slate-400">CC {sop.numeroDocumento}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{sop.tipoDocumento}</div>
                    <div className="text-[11px] text-blue-600 font-mono flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {sop.nombreArchivo}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {sop.categoria}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{sop.fechaSubida}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        sop.estadoValidacion === 'APROBADO'
                          ? 'bg-emerald-50 text-emerald-700'
                          : sop.estadoValidacion === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {sop.estadoValidacion}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {sop.estadoValidacion === 'PENDIENTE' ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleValidate(sop.idSoporte, 'APROBADO')}
                          title="Aprobar Soporte"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleValidate(sop.idSoporte, 'RECHAZADO')}
                          title="Rechazar Soporte"
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Procesado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
