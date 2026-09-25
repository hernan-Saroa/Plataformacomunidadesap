import React, { useState } from 'react';
import { authService } from '../services/api/authService';
import LegalizacionComisionado from './LegalizacionComisionado';
import LegalizacionRevision from './LegalizacionRevision';

/**
 * Etapa 9 — Sección "Legalización de Gastos" de ViaticosModulePremium.
 *
 * Decide qué ve cada quien: el comisionado / enlace legaliza (EFDS-1309,
 * travel_expenses:legalizations.view) y el analista revisa y cierra
 * (EFDS-1310, travel_expenses:legalizations.manage). Quien tenga ambos elige.
 */
export default function LegalizacionesSeccion() {
  const admin = Boolean(authService.getCurrentUserSync?.()?.esAdmin);
  const revisa = admin || authService.hasAnyPermission(['travel_expenses:legalizations.manage']);
  const legaliza =
    admin ||
    authService.hasAnyPermission([
      'travel_expenses:legalizations.view',
      'travel_expenses:create_request',
      'travel_expenses:view_own_requests',
    ]);
  const [vista, setVista] = useState<'revision' | 'propias'>(revisa ? 'revision' : 'propias');

  if (revisa && legaliza) {
    return (
      <div className="space-y-3">
        <div role="tablist" className="flex gap-1">
          <button type="button" role="tab" aria-selected={vista === 'revision'} onClick={() => setVista('revision')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vista === 'revision' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Revisión (analista)
          </button>
          <button type="button" role="tab" aria-selected={vista === 'propias'} onClick={() => setVista('propias')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vista === 'propias' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Mis legalizaciones
          </button>
        </div>
        {vista === 'revision' ? <LegalizacionRevision /> : <LegalizacionComisionado />}
      </div>
    );
  }
  return revisa ? <LegalizacionRevision /> : <LegalizacionComisionado />;
}
