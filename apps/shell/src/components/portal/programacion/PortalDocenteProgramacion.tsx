import { lazy, Suspense } from 'react';

interface Props {
  onBack: () => void;
}

/**
 * EFDS-1938 — Monta la vista del docente del módulo de Programación Académica,
 * expuesta por el MFE como `programacion_academica/Portal`. Igual que el PTA, el
 * shell solo la carga como remote; toda la lógica vive en el MFE, que resuelve al
 * docente por el token en el backend.
 */
const ProgramacionPortalRemote = lazy(async () => {
  const mod: any = await import('programacion_academica/Portal');
  const component = mod?.default || mod?.PortalDocenteProgramacion;
  if (!component) throw new Error('No se pudo resolver programacion_academica/Portal');
  return { default: component };
});

export function PortalDocenteProgramacion({ onBack }: Props) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        ← Volver
      </button>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando tu programación…</div>}>
        <ProgramacionPortalRemote />
      </Suspense>
    </div>
  );
}
