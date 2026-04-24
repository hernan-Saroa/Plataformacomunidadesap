/**
 * Catálogo único de etapas del Kanban de auditorías OCI.
 * Lo consumen las columnas del tablero y el modal de cambio de estado.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  ClipboardCheck,
  Target,
  MessageSquare,
  History,
  CheckCircle,
  Columns3,
} from 'lucide-react';

export const ESTADOS_AUDITORIA_ORDEN = [
  'Plan Anual',
  'Planeación',
  'Ejecución',
  'Comunicación',
  'Seguimiento',
  'Finalizada',
] as const;

export type EstadoAuditoria = (typeof ESTADOS_AUDITORIA_ORDEN)[number];

export interface AuditoriaKanbanEtapaDef {
  id: EstadoAuditoria;
  /** Texto en columna del tablero y en el modal */
  titulo: string;
  descripcion: string;
  diasEstimados: number;
  accentColor: string;
}

export const AUDITORIA_KANBAN_ETAPAS: readonly AuditoriaKanbanEtapaDef[] = [
  {
    id: 'Plan Anual',
    titulo: 'Programa Anual',
    descripcion: 'Auditoría programada en plan anual',
    diasEstimados: 15,
    accentColor: '#003DA5',
  },
  {
    id: 'Planeación',
    titulo: 'Planeación',
    descripcion: 'Definición de objetivos y alcance',
    diasEstimados: 30,
    accentColor: '#7C3AED',
  },
  {
    id: 'Ejecución',
    titulo: 'Ejecución',
    descripcion: 'Recopilación de evidencias y pruebas',
    diasEstimados: 60,
    accentColor: '#0891B2',
  },
  {
    id: 'Comunicación',
    titulo: 'Comunicación',
    descripcion: 'Elaboración y envío de informes',
    diasEstimados: 15,
    accentColor: '#F97316',
  },
  {
    id: 'Seguimiento',
    titulo: 'Seguimiento',
    descripcion: 'Monitoreo de hallazgos y planes',
    diasEstimados: 30,
    accentColor: '#EAB308',
  },
  {
    id: 'Finalizada',
    titulo: 'Finalizada',
    descripcion: 'Auditoría completada (requiere documento de cierre)',
    diasEstimados: 0,
    accentColor: '#16A34A',
  },
] as const;

const ICON_POR_ESTADO: Record<EstadoAuditoria, LucideIcon> = {
  'Plan Anual': Calendar,
  Planeación: ClipboardCheck,
  Ejecución: Target,
  Comunicación: MessageSquare,
  Seguimiento: History,
  Finalizada: CheckCircle,
};

export function esEstadoAuditoria(valor: string): valor is EstadoAuditoria {
  return (ESTADOS_AUDITORIA_ORDEN as readonly string[]).includes(valor);
}

/** Ícono para columnas del tablero (respeta color dinámico si se pasa override). */
export function iconoParaEstadoAuditoria(id: EstadoAuditoria, color: string) {
  const Icon = ICON_POR_ESTADO[id] ?? Columns3;
  return <Icon className="w-4 h-4" style={{ color }} />;
}

export interface KanbanColumnaAuditoria {
  id: EstadoAuditoria;
  titulo: string;
  count: number;
  icono: JSX.Element;
  diasEstimados: number;
  accentColor: string;
}

export function columnasKanbanDesdeCatalogo(): KanbanColumnaAuditoria[] {
  return AUDITORIA_KANBAN_ETAPAS.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    count: 0,
    icono: iconoParaEstadoAuditoria(e.id, e.accentColor),
    diasEstimados: e.diasEstimados,
    accentColor: e.accentColor,
  }));
}

export interface EtapaKanbanConfigInput {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  slaDias: number;
}

/**
 * Construye las etapas efectivas (tablero + modal) desde configuración dinámica.
 * Si no hay configuración válida, retorna el catálogo por defecto.
 */
export function construirEtapasKanbanAuditoria(
  etapasConfig: EtapaKanbanConfigInput[] | undefined,
): AuditoriaKanbanEtapaDef[] {
  if (!etapasConfig || etapasConfig.length === 0) {
    return [...AUDITORIA_KANBAN_ETAPAS];
  }

  const etapas = etapasConfig
    .filter((etapa) => esEstadoAuditoria(etapa.id))
    .sort((a, b) => a.orden - b.orden)
    .map((etapa) => {
      const base = AUDITORIA_KANBAN_ETAPAS.find((item) => item.id === etapa.id);
      return {
        id: etapa.id as EstadoAuditoria,
        titulo: etapa.nombre,
        descripcion: base?.descripcion ?? `Gestión de etapa ${etapa.nombre}`,
        diasEstimados: etapa.slaDias,
        accentColor: etapa.color,
      } satisfies AuditoriaKanbanEtapaDef;
    });

  return etapas.length > 0 ? etapas : [...AUDITORIA_KANBAN_ETAPAS];
}

/**
 * Normaliza texto de backend/UI al estado canónico del catálogo.
 */
export function normalizarTextoEstadoAuditoria(raw: string | undefined): EstadoAuditoria {
  if (!raw) return 'Planeación';
  const trimmed = raw.trim();
  if (esEstadoAuditoria(trimmed)) return trimmed;

  const n = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    n.includes('plan anual') ||
    n.includes('plan-anual') ||
    n.includes('programa anual') ||
    n === 'backlog' ||
    (n.includes('pendiente') && n.includes('plan'))
  ) {
    return 'Plan Anual';
  }
  if (n.includes('seguimiento')) return 'Seguimiento';
  if (n.includes('finaliz') || n.includes('cerrado') || n === 'cerrada') return 'Finalizada';
  if (n.includes('comunicacion') || n.includes('informe')) return 'Comunicación';
  if (n.includes('ejecucion')) return 'Ejecución';
  if (n.includes('planeacion') || n.includes('planificacion')) return 'Planeación';

  return 'Planeación';
}
