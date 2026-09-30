import React from 'react';
import {
  Activity,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FilePen,
  UserPlus,
  Workflow,
} from 'lucide-react';

import { Momento, Situacion } from './situacionDelProceso';

/**
 * Cómo se ve cada momento, igual en el listado, el tablero y la ficha.
 *
 * Ámbar para lo que está parado esperando a alguien del equipo, azul para lo
 * que avanza, verde para lo que ya salió y rojo solo para lo negado.
 */
export const RASGOS_DEL_MOMENTO: Record<
  Momento,
  { etiqueta: string; clase: string; color: string; Icono: typeof Activity }
> = {
  redaccion: {
    etiqueta: 'En redacción',
    clase: 'bg-amber-50 text-amber-700',
    color: 'text-amber-700',
    Icono: FilePen,
  },
  asignacion: {
    etiqueta: 'Por asignar',
    clase: 'bg-amber-50 text-amber-700',
    color: 'text-amber-700',
    Icono: UserPlus,
  },
  revision: {
    etiqueta: 'En revisión',
    clase: 'bg-blue-50 text-[#003DA5]',
    color: 'text-[#003DA5]',
    Icono: ClipboardCheck,
  },
  tramite: {
    etiqueta: 'En trámite',
    clase: 'bg-blue-50 text-[#003DA5]',
    color: 'text-[#003DA5]',
    Icono: Workflow,
  },
  ejecucion: {
    etiqueta: 'En ejecución',
    clase: 'bg-emerald-50 text-emerald-700',
    color: 'text-emerald-700',
    Icono: Activity,
  },
  terminado: {
    etiqueta: 'Terminado',
    clase: 'bg-emerald-50 text-emerald-700',
    color: 'text-emerald-700',
    Icono: CheckCircle2,
  },
  negado: {
    etiqueta: 'Negado',
    clase: 'bg-red-50 text-red-700',
    color: 'text-red-700',
    Icono: Ban,
  },
};

/** Lo que pasa y a quién le toca, en una línea. */
export function lineaDeLaSituacion(s: Situacion): string {
  if (s.teToca) return `Te toca: ${s.titulo}`;
  return s.quien ? `${s.titulo} · ${s.quien}` : s.titulo;
}

/**
 * El verbo del botón que lleva al proceso.
 *
 * Dice qué va a hacer quien lo pulsa. A quien no le toca nada, el proceso se
 * consulta: ofrecerle «Revisar» a quien no puede decidir lo lleva a un
 * formulario bloqueado.
 */
export function verboDeLaSituacion(s: Situacion): string {
  if (!s.teToca) return 'Consultar';
  switch (s.momento) {
    case 'redaccion':
      return s.titulo.startsWith('Corregir') ? 'Corregir' : 'Diligenciar';
    case 'asignacion':
      return s.titulo.startsWith('Recibir') ? 'Recibir' : 'Asignar';
    case 'revision':
      return 'Revisar';
    default:
      return 'Trabajar';
  }
}
