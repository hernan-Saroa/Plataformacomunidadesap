import React, { useState } from 'react';
import AnalystInbox from './AnalystInbox';
import LegalizacionRevision from './LegalizacionRevision';
import { authService } from '../services/api/authService';

/**
 * Vista del analista de viáticos.
 *
 * ViaticosModulePremium le muestra al analista solo su bandeja (AnalystInbox),
 * sin menú. La revisión de legalizaciones (EFDS-1310) se agrega como segunda
 * pestaña; la bandeja se muestra tal cual, sin cambios.
 */
export default function VistaAnalistaViaticos() {
  const revisa = authService.hasAnyPermission(['travel_expenses:legalizations.manage']);
  const [vista, setVista] = useState<'solicitudes' | 'legalizaciones'>('solicitudes');

  if (!revisa) return <AnalystInbox />;

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1">
        <button type="button" role="tab" aria-selected={vista === 'solicitudes'} onClick={() => setVista('solicitudes')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vista === 'solicitudes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          Solicitudes asignadas
        </button>
        <button type="button" role="tab" aria-selected={vista === 'legalizaciones'} onClick={() => setVista('legalizaciones')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vista === 'legalizaciones' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          Legalizaciones
        </button>
      </div>
      {vista === 'solicitudes' ? <AnalystInbox /> : <LegalizacionRevision />}
    </div>
  );
}
