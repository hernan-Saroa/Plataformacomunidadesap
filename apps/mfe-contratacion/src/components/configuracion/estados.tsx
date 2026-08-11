import React from 'react';
import { Check, Circle, AlertTriangle, Diamond, X, Ban } from 'lucide-react';

import { ActividadAplicable } from '../../types';

/**
 * En qué punto de la configuración está una actividad.
 *
 * Cada estado lleva su propia forma además del color: distinguirlos solo por
 * tono deja la pantalla ilegible para quien no percibe el rojo o el verde, y
 * esto es justo la información que el administrador viene a buscar.
 */
export enum EstadoActividad {
  SinConfigurar = 'SIN_CONFIGURAR',
  Incompleta = 'INCOMPLETA',
  Configurada = 'CONFIGURADA',
  ConExcepciones = 'CON_EXCEPCIONES',
  ConErrores = 'CON_ERRORES',
  NoAplica = 'NO_APLICA',
}

export const DESCRIPCION_ESTADO: Record<EstadoActividad, string> = {
  [EstadoActividad.SinConfigurar]: 'Sin formulario definido todavía',
  [EstadoActividad.Incompleta]: 'Tiene formulario pero ninguna regla lo valida',
  [EstadoActividad.Configurada]: 'Configurada',
  [EstadoActividad.ConExcepciones]: 'Alguna modalidad se desvía de la regla general',
  [EstadoActividad.ConErrores]: 'Alguna regla apunta a un campo que ya no existe',
  [EstadoActividad.NoAplica]: 'No aplica a esta modalidad',
};

const PINTA: Record<EstadoActividad, { Icono: typeof Check; clase: string }> = {
  [EstadoActividad.SinConfigurar]: { Icono: Circle, clase: 'text-gray-300' },
  [EstadoActividad.Incompleta]: { Icono: AlertTriangle, clase: 'text-amber-600' },
  [EstadoActividad.Configurada]: { Icono: Check, clase: 'text-emerald-600' },
  [EstadoActividad.ConExcepciones]: { Icono: Diamond, clase: 'text-[#003DA5]' },
  [EstadoActividad.ConErrores]: { Icono: X, clase: 'text-red-600' },
  [EstadoActividad.NoAplica]: { Icono: Ban, clase: 'text-gray-300' },
};

export function IconoEstado({ estado, className }: { estado: EstadoActividad; className?: string }) {
  const { Icono, clase } = PINTA[estado];
  return (
    <span title={DESCRIPCION_ESTADO[estado]} className={clase}>
      <Icono className={className ?? 'w-4 h-4'} aria-hidden />
      <span className="sr-only">{DESCRIPCION_ESTADO[estado]}</span>
    </span>
  );
}

/**
 * Estado de una actividad a partir de lo que hay configurado.
 *
 * `ConErrores` no se deduce aquí: exige comparar cada regla contra los campos
 * vigentes, y eso lo resuelve la vista de detalle, que ya tiene ambos datos.
 */
export function estadoDe(actividad: ActividadAplicable): EstadoActividad {
  if (!actividad.aplica) return EstadoActividad.NoAplica;
  // Sin formulario no hay nada que configurar todavía: distinguirlo de "tiene
  // formulario y nadie le puso reglas" es lo que dice dónde falta trabajo.
  if ((actividad.campos ?? 0) === 0) return EstadoActividad.SinConfigurar;
  if ((actividad.reglas ?? 0) === 0) return EstadoActividad.Incompleta;
  if ((actividad.reglasPropias ?? 0) > 0) return EstadoActividad.ConExcepciones;
  return EstadoActividad.Configurada;
}

/** Leyenda de los estados, para que los símbolos no haya que adivinarlos. */
export function LeyendaEstados() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-600">
      {(
        [
          EstadoActividad.Configurada,
          EstadoActividad.ConExcepciones,
          EstadoActividad.Incompleta,
          EstadoActividad.SinConfigurar,
          EstadoActividad.ConErrores,
          EstadoActividad.NoAplica,
        ] as const
      ).map((estado) => (
        <span key={estado} className="flex items-center gap-1.5">
          <IconoEstado estado={estado} className="w-3.5 h-3.5" />
          {DESCRIPCION_ESTADO[estado]}
        </span>
      ))}
    </div>
  );
}
