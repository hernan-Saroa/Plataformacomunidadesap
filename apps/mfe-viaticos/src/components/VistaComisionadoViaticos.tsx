import React, { useState } from 'react';
import { Plane, Receipt } from 'lucide-react';
import ComisionadoInbox from './ComisionadoInbox';
import LegalizacionComisionado from './LegalizacionComisionado';

export interface VistaComisionadoViaticosProps {
  vistaInicial?: 'comisiones' | 'legalizaciones';
}

/**
 * Vista integral del funcionario Comisionado en el módulo de Viáticos y Gastos de Viaje.
 *
 * Permite al comisionado:
 * 1. Consultar y monitorear todas las solicitudes creadas a su nombre institucional (Formato GF-FO-023).
 * 2. Cargar y remitir la legalización de gastos y cumplido de actividades (Formato GF-FO-032 / EFDS-1309).
 */
export default function VistaComisionadoViaticos({
  vistaInicial = 'comisiones',
}: VistaComisionadoViaticosProps) {
  const [vista, setVista] = useState<'comisiones' | 'legalizaciones'>(vistaInicial);

  return (
    <div className="space-y-4">
      {/* ── SELECTOR DE VISTAS (TABS) ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div role="tablist" className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'comisiones'}
            onClick={() => setVista('comisiones')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              vista === 'comisiones'
                ? 'bg-[#003DA5] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Mis Comisiones de Servicios</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={vista === 'legalizaciones'}
            onClick={() => setVista('legalizaciones')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              vista === 'legalizaciones'
                ? 'bg-[#003DA5] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Legalización de Gastos (GF-FO-032)</span>
          </button>
        </div>
      </div>

      {/* ── CONTENIDO ACTIVO ── */}
      {vista === 'comisiones' ? (
        <ComisionadoInbox onIrALegalizacion={() => setVista('legalizaciones')} />
      ) : (
        <LegalizacionComisionado />
      )}
    </div>
  );
}
