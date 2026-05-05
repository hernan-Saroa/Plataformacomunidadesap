/**
 * HELPERS - AUDITORÍA DE CAMBIOS
 * Funciones auxiliares para el módulo de auditoría
 */

import {
  Activity, CheckCircle, Download, Edit, Eye, FileText,
  PlusCircle, Trash2, User
} from 'lucide-react';
import type { TipoAccion } from '../services/auditLogService';

/**
 * Obtener icono según el tipo de acción
 */
export function obtenerIconoAccion(accion: TipoAccion) {
  const iconos: Record<TipoAccion, any> = {
    crear: <PlusCircle className="w-4 h-4" />,
    actualizar: <Edit className="w-4 h-4" />,
    eliminar: <Trash2 className="w-4 h-4" />,
    aprobar: <CheckCircle className="w-4 h-4" />,
    rechazar: <Trash2 className="w-4 h-4" />,
    cambiar_estado: <Activity className="w-4 h-4" />,
    asignar: <User className="w-4 h-4" />,
    validar: <CheckCircle className="w-4 h-4" />,
    generar: <FileText className="w-4 h-4" />,
    exportar: <Download className="w-4 h-4" />,
    consultar: <Eye className="w-4 h-4" />
  };
  return iconos[accion] || <Activity className="w-4 h-4" />;
}

/**
 * Obtener color según el tipo de acción
 */
export function obtenerColorAccion(accion: TipoAccion): string {
  const colores: Record<TipoAccion, string> = {
    crear: '#10B981',
    actualizar: '#F59E0B',
    eliminar: '#DC2626',
    aprobar: '#10B981',
    rechazar: '#DC2626',
    cambiar_estado: '#3B82F6',
    asignar: '#8B5CF6',
    validar: '#10B981',
    generar: '#3B82F6',
    exportar: '#6B7280',
    consultar: '#6B7280'
  };
  return colores[accion] || '#6B7280';
}

/**
 * Obtener color según criticidad
 */
export function obtenerColorCriticidad(criticidad: 'baja' | 'media' | 'alta' | 'critica'): string {
  const colores = {
    baja: '#3B82F6',
    media: '#F59E0B',
    alta: '#EA580C',
    critica: '#DC2626'
  };
  return colores[criticidad];
}

/**
 * Formatear fecha para visualización
 */
export function formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatear duración en formato legible
 */
export function formatearDuracion(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
