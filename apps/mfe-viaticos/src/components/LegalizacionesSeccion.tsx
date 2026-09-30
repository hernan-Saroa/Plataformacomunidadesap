import React, { useState } from 'react';
import { authService } from '../services/api/authService';
import { PERMISO_APROBAR_REVERSION } from '../services/api/legalizacionService';
import LegalizacionComisionado from './LegalizacionComisionado';
import LegalizacionRevision from './LegalizacionRevision';
import ReversionesLegalizacion from './ReversionesLegalizacion';

type Vista = 'revision' | 'propias' | 'reversiones';

/**
 * Etapa 9 — Sección "Legalización de Gastos" de ViaticosModulePremium.
 *
 * Decide qué ve cada quien: el comisionado / enlace legaliza (EFDS-1309,
 * travel_expenses:legalizations.view), el analista revisa y cierra
 * (EFDS-1310, travel_expenses:legalizations.manage) y quien aprueba las
 * reversiones de revisión las resuelve (travel_expenses:legalizations.revert_approval,
 * CONTROL_VIATICOS). Quien tenga más de una vista elige.
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
  const apruebaReversiones = admin || authService.hasAnyPermission([PERMISO_APROBAR_REVERSION]);

  const vistas: Array<{ id: Vista; etiqueta: string }> = [
    ...(revisa ? [{ id: 'revision' as const, etiqueta: 'Revisión (analista)' }] : []),
    ...(legaliza ? [{ id: 'propias' as const, etiqueta: 'Mis legalizaciones' }] : []),
    ...(apruebaReversiones ? [{ id: 'reversiones' as const, etiqueta: 'Reversiones por aprobar' }] : []),
  ];
  const [vista, setVista] = useState<Vista>(vistas[0]?.id ?? 'propias');

  const contenido =
    vista === 'revision' ? <LegalizacionRevision />
      : vista === 'reversiones' ? <ReversionesLegalizacion />
        : <LegalizacionComisionado />;

  if (vistas.length <= 1) return contenido;
  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1">
        {vistas.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} onClick={() => setVista(v.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${vista === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {v.etiqueta}
          </button>
        ))}
      </div>
      {contenido}
    </div>
  );
}
