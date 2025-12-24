/**
 * TarjetaKanbanProfesionalSIGL - Tarjeta Kanban PROFESIONAL
 * DISEÑO COHERENTE con Control Interno Disciplinario y Control Interno de Gestión
 * Tarjetas detalladas, robustas y visualmente profesionales
 */

import { Calendar, FileText, Clock, Eye, Edit, FileCheck, AlertCircle, User, Building } from 'lucide-react';
import { SIGL_COLORS } from './tokens';
import { BadgeSIGL } from './BadgeSIGL';

interface TarjetaKanbanProfesionalSIGLProps {
  // Identificación
  radicado: string;
  tipo: string;
  tipoBadgeColor?: string;
  
  // Título principal
  titulo: string;
  
  // Información de personas
  responsable: {
    nombre: string;
    cargo?: string;
    avatarUrl?: string;
  };
  
  // Información adicional (demandante, jurisdicción, etc.)
  informacionAdicional?: Array<{
    label: string;
    valor: string;
    icono?: any;
  }>;
  
  // Badges de estado
  estadoBadges?: Array<{ 
    texto: string; 
    color: string;
    variante?: 'solido' | 'outlined';
  }>;
  
  // Métricas grandes
  metricas: {
    dias: number;
    documentos: number;
    porcentajeTiempo: number;
  };
  
  // Última actuación
  ultimaActuacion: string;
  
  // Estilo
  colorBorde: string;
  
  // Acciones
  onVer: () => void;
  onEditar?: () => void;
  onNotas?: () => void;
  onAuditoria?: () => void;
}

export function TarjetaKanbanProfesionalSIGL({
  radicado,
  tipo,
  tipoBadgeColor = SIGL_COLORS.primary,
  titulo,
  responsable,
  informacionAdicional = [],
  estadoBadges = [],
  metricas,
  ultimaActuacion,
  colorBorde,
  onVer,
  onEditar,
  onNotas,
  onAuditoria,
}: TarjetaKanbanProfesionalSIGLProps) {
  // Iniciales del responsable para avatar
  const iniciales = responsable.nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all mb-4 overflow-hidden border"
      style={{ borderColor: SIGL_COLORS.border }}
    >
      {/* Header: Radicado + Tipo */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <div className="flex items-center gap-2">
          <FileCheck size={16} style={{ color: SIGL_COLORS.textMuted }} />
          <span className="text-sm font-bold" style={{ color: SIGL_COLORS.textPrimary }}>
            {radicado}
          </span>
        </div>
        <BadgeSIGL variant="custom" color={tipoBadgeColor} size="sm">
          <span className="text-xs font-semibold">{tipo}</span>
        </BadgeSIGL>
      </div>

      {/* Borde de color superior */}
      <div className="h-1" style={{ backgroundColor: colorBorde }} />

      {/* Título del Caso */}
      <div className="px-4 py-3 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <h3 className="text-sm font-bold leading-snug" style={{ color: SIGL_COLORS.textPrimary }}>
          {titulo}
        </h3>
      </div>

      {/* Responsable Principal */}
      <div className="px-4 py-3 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} style={{ color: SIGL_COLORS.textMuted }} />
          <span className="text-xs font-semibold" style={{ color: SIGL_COLORS.textSecondary }}>
            Responsable
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: colorBorde }}
          >
            {iniciales}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: SIGL_COLORS.textPrimary }}>
              {responsable.nombre}
            </p>
            {responsable.cargo && (
              <p className="text-xs" style={{ color: SIGL_COLORS.textMuted }}>
                {responsable.cargo}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      {informacionAdicional.length > 0 && (
        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: SIGL_COLORS.border }}>
          {informacionAdicional.map((info, idx) => (
            <div key={idx} className="flex items-start gap-2">
              {info.icono && <info.icono size={14} style={{ color: SIGL_COLORS.textMuted }} className="mt-0.5 flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: SIGL_COLORS.textSecondary }}>
                  {info.label}
                </p>
                <p className="text-xs" style={{ color: SIGL_COLORS.textPrimary }}>
                  {info.valor}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges de Estado */}
      {estadoBadges.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: SIGL_COLORS.border }}>
          <div className="flex flex-wrap gap-2">
            {estadoBadges.map((badge, idx) => (
              <BadgeSIGL 
                key={idx} 
                variant={badge.variante === 'outlined' ? 'outline' : 'custom'} 
                color={badge.color} 
                size="sm"
              >
                <span className="text-xs font-semibold">{badge.texto}</span>
              </BadgeSIGL>
            ))}
          </div>
        </div>
      )}

      {/* Métricas GRANDES - Estilo profesional */}
      <div className="px-4 py-4 border-b grid grid-cols-3 gap-3" style={{ borderColor: SIGL_COLORS.border }}>
        {/* Días */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={14} style={{ color: SIGL_COLORS.textMuted }} />
            <span className="text-xs font-medium" style={{ color: SIGL_COLORS.textMuted }}>
              Días
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.dias}
          </p>
        </div>

        {/* Documentos */}
        <div className="text-center border-l border-r" style={{ borderColor: SIGL_COLORS.border }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <FileText size={14} style={{ color: SIGL_COLORS.textMuted }} />
            <span className="text-xs font-medium" style={{ color: SIGL_COLORS.textMuted }}>
              Docs
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.documentos}
          </p>
        </div>

        {/* Tiempo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock size={14} style={{ color: SIGL_COLORS.textMuted }} />
            <span className="text-xs font-medium" style={{ color: SIGL_COLORS.textMuted }}>
              Tiempo
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.porcentajeTiempo}%
          </p>
        </div>
      </div>

      {/* Última Actuación */}
      <div className="px-4 py-3 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <p className="text-xs font-bold mb-2" style={{ color: SIGL_COLORS.textSecondary }}>
          Última actuación:
        </p>
        <p className="text-xs leading-relaxed" style={{ color: SIGL_COLORS.textPrimary }}>
          {ultimaActuacion}
        </p>
      </div>

      {/* Botones de Acción - Profesionales */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onVer}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: SIGL_COLORS.primary }}
          >
            <Eye size={14} />
            <span>Ver</span>
          </button>
          {onEditar && (
            <button
              onClick={onEditar}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-colors border"
              style={{ 
                borderColor: SIGL_COLORS.border,
                color: SIGL_COLORS.textPrimary,
                backgroundColor: 'white',
              }}
            >
              <Edit size={14} />
              <span>Editar</span>
            </button>
          )}
        </div>

        {/* Acciones secundarias */}
        {(onNotas || onAuditoria) && (
          <div className="flex items-center gap-2">
            {onNotas && (
              <button
                onClick={onNotas}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ 
                  color: SIGL_COLORS.textSecondary,
                  backgroundColor: '#f8fafc',
                }}
              >
                <FileText size={12} />
                <span>Notas</span>
              </button>
            )}
            {onAuditoria && (
              <button
                onClick={onAuditoria}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ 
                  color: SIGL_COLORS.textSecondary,
                  backgroundColor: '#f8fafc',
                }}
              >
                <AlertCircle size={12} />
                <span>Auditoría</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
