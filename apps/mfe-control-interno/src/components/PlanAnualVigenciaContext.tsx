/**
 * Contexto de vigencia del Plan Anual — selector reutilizable en todos los submódulos.
 */

import { createContext, useContext, useId, type ReactNode } from 'react';
import {
  usePlanAnualVigencia,
  type PlanVigenciaOpcion,
} from './hooks/usePlanAnualVigencia';

export type PlanAnualVigenciaContextValue = ReturnType<typeof usePlanAnualVigencia>;

const PlanAnualVigenciaContext = createContext<PlanAnualVigenciaContextValue | null>(
  null,
);

export function PlanAnualVigenciaProvider({ children }: { children: ReactNode }) {
  const value = usePlanAnualVigencia();
  return (
    <PlanAnualVigenciaContext.Provider value={value}>
      {children}
    </PlanAnualVigenciaContext.Provider>
  );
}

export function usePlanAnualVigenciaContext(): PlanAnualVigenciaContextValue {
  const ctx = useContext(PlanAnualVigenciaContext);
  if (!ctx) {
    throw new Error(
      'usePlanAnualVigenciaContext debe usarse dentro de PlanAnualVigenciaProvider',
    );
  }
  return ctx;
}

/** Hook opcional cuando el módulo puede renderizarse fuera del provider */
export function usePlanAnualVigenciaContextOptional(): PlanAnualVigenciaContextValue | null {
  return useContext(PlanAnualVigenciaContext);
}

const SELECT_CLASS =
  'px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 focus:outline-none focus:border-blue-500 min-w-[140px]';

interface PlanAnualVigenciaSelectorProps {
  className?: string;
  id?: string;
  /** Siempre renderizar como &lt;select&gt; (p. ej. cabeceras de módulo) */
  siempreVisible?: boolean;
}

export function PlanAnualVigenciaSelector({
  className = '',
  id = 'plan-anual-vigencia-select',
  siempreVisible = true,
}: PlanAnualVigenciaSelectorProps) {
  const ctx = usePlanAnualVigenciaContextOptional();
  if (!ctx) return null;

  const { planes, planActivoId, cambiarPlan, loading, vigencia, planActivo } = ctx;

  if (loading) {
    return (
      <span className="text-xs text-gray-500">Cargando…</span>
    );
  }

  const valorSelect = planActivoId ?? planActivo?.id ?? planes[0]?.id ?? '';

  if (planes.length === 0) {
    return (
      <select
        id={id}
        disabled
        className={className || SELECT_CLASS}
        aria-label="Vigencia del plan anual"
      >
        <option>{vigencia}</option>
      </select>
    );
  }

  if (planes.length === 1 && !siempreVisible) {
    const p = planes[0];
    return (
      <span
        className={`px-3 py-1.5 border-2 border-blue-200 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 ${className}`}
      >
        {p.vigencia} - {p.estado} (v{p.version})
      </span>
    );
  }

  return (
    <select
      id={id}
      value={valorSelect}
      onChange={(e) => cambiarPlan(e.target.value)}
      className={className || SELECT_CLASS}
      title="Vigencia del Plan Anual de Auditoría"
      aria-label="Seleccionar vigencia plan anual"
    >
      {planes.map((p: PlanVigenciaOpcion) => (
        <option key={p.id} value={p.id}>
          {p.vigencia} - {p.estado} (v{p.version})
        </option>
      ))}
    </select>
  );
}

/** Bloque etiqueta + selector para cabeceras de módulo */
export function PlanAnualVigenciaHeaderControl({ selectId }: { selectId?: string }) {
  const ctx = usePlanAnualVigenciaContextOptional();
  const generatedId = useId();
  if (!ctx) return null;

  const id = selectId ?? `plan-anual-vigencia-${generatedId.replace(/:/g, '')}`;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <label
        htmlFor={id}
        className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap"
      >
        Vigencia plan anual
      </label>
      <PlanAnualVigenciaSelector id={id} siempreVisible />
    </div>
  );
}
