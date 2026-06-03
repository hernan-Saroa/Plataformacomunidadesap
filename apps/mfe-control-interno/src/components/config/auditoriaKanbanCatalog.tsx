/**
 * Catálogo de helper functions para el Kanban de auditorías OCI.
 * Este catálogo ahora es dinámico y delega la verdad absoluta a la base de datos.
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

export type EstadoAuditoria = string;

export interface AuditoriaKanbanEtapaDef {
  id: EstadoAuditoria;
  titulo: string;
  descripcion: string;
  diasEstimados: number;
  accentColor: string;
}

export function esEstadoAuditoria(valor: string): boolean {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/** Ícono dinámico basado en el nombre de la etapa. */
export function iconoParaEstadoAuditoria(id: EstadoAuditoria, color?: string) {
  const n = (id || '').toLowerCase();
  let Icon = Columns3;
  if (n.includes('anual')) Icon = Calendar;
  else if (n.includes('plan')) Icon = ClipboardCheck;
  else if (n.includes('ejec')) Icon = Target;
  else if (n.includes('comun') || n.includes('inf')) Icon = MessageSquare;
  else if (n.includes('final') || n.includes('cerr')) Icon = CheckCircle;
  else if (n.includes('segui')) Icon = History;
  
  return <Icon className="w-4 h-4" style={color ? { color } : undefined} />;
}

export interface KanbanColumnaAuditoria {
  id: EstadoAuditoria;
  titulo: string;
  count: number;
  icono: JSX.Element;
  diasEstimados: number;
  accentColor: string;
}

export interface EtapaKanbanConfigInput {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  slaDias: number;
}

/**
 * Normaliza texto de backend/UI al estado canónico (dinámico pero con fallbacks básicos para legacy)
 */
export function normalizarTextoEstadoAuditoria(raw: string | undefined): EstadoAuditoria {
  if (!raw) return 'Planeación';
  const trimmed = raw.trim();

  const n = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (n.includes('plan anual') || n.includes('programa anual') || n === 'backlog') return 'Programa Anual';
  if (n.includes('finaliz') || n.includes('cerrado') || n === 'cerrada') return 'Finalizada';
  if (n.includes('comunicacion') || n.includes('informe')) return 'Comunicación';
  if (n.includes('ejecucion')) return 'Ejecución';
  if (n.includes('planeacion') || n.includes('planificacion')) return 'Planeación';

  return trimmed; // Si es dinámico nuevo, se retorna tal cual
}
