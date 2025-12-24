/**
 * TarjetaKanbanCompactaSIGL - Tarjeta Kanban EXACTAMENTE como en las imágenes
 * Más compacta, profesional y limpia
 */

import { Calendar, FileText, Clock, Eye, Edit } from 'lucide-react';
import { SIGL_COLORS } from './tokens';
import { BadgeSIGL } from './BadgeSIGL';

interface TarjetaKanbanCompactaSIGLProps {
  radicado: string;
  tipo: string;
  tipoBadgeColor?: string;
  responsable: string;
  avatarUrl?: string;
  titulo: string;
  estadoBadges?: Array<{ texto: string; color: string }>;
  metricas: {
    dias: number;
    documentos: number;
    porcentajeTiempo: number;
  };
  ultimaActuacion: string;
  colorBorde: string;
  onVer: () => void;
  onEditar?: () => void;
}

export function TarjetaKanbanCompactaSIGL({
  radicado,
  tipo,
  tipoBadgeColor = SIGL_COLORS.primary,
  responsable,
  avatarUrl,
  titulo,
  estadoBadges = [],
  metricas,
  ultimaActuacion,
  colorBorde,
  onVer,
  onEditar,
}: TarjetaKanbanCompactaSIGLProps) {
  // Iniciales del responsable para avatar
  const iniciales = responsable
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all mb-3 overflow-hidden border-l-4"
      style={{ borderLeftColor: colorBorde }}
    >
      {/* Header compacto: Radicado + Badge */}
      <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <span className="text-xs font-semibold" style={{ color: SIGL_COLORS.textSecondary }}>
          {radicado}
        </span>
        <BadgeSIGL variant="custom" color={tipoBadgeColor} size="sm">
          <span className="text-xs">{tipo}</span>
        </BadgeSIGL>
      </div>

      {/* Responsable con avatar */}
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: colorBorde }}
        >
          {iniciales}
        </div>
        <span className="text-xs font-medium truncate" style={{ color: SIGL_COLORS.textPrimary }}>
          {responsable}
        </span>
      </div>

      {/* Título + Badges */}
      <div className="px-3 py-2 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <h4 className="text-xs font-semibold mb-2 line-clamp-2" style={{ color: SIGL_COLORS.textPrimary }}>
          {titulo}
        </h4>
        {estadoBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {estadoBadges.map((badge, idx) => (
              <BadgeSIGL key={idx} variant="custom" color={badge.color} size="sm">
                <span className="text-xs">{badge.texto}</span>
              </BadgeSIGL>
            ))}
          </div>
        )}
      </div>

      {/* Métricas en fila horizontal */}
      <div className="px-3 py-2 border-b flex items-center justify-between text-xs" style={{ borderColor: SIGL_COLORS.border }}>
        <div className="flex items-center gap-1">
          <Calendar size={12} style={{ color: SIGL_COLORS.textMuted }} />
          <span className="font-semibold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.dias}
          </span>
          <span style={{ color: SIGL_COLORS.textMuted }}>días</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText size={12} style={{ color: SIGL_COLORS.textMuted }} />
          <span className="font-semibold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.documentos}
          </span>
          <span style={{ color: SIGL_COLORS.textMuted }}>docs</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} style={{ color: SIGL_COLORS.textMuted }} />
          <span className="font-semibold" style={{ color: SIGL_COLORS.textPrimary }}>
            {metricas.porcentajeTiempo}%
          </span>
        </div>
      </div>

      {/* Última actuación */}
      <div className="px-3 py-2 border-b" style={{ borderColor: SIGL_COLORS.border }}>
        <p className="text-xs font-semibold mb-1" style={{ color: SIGL_COLORS.textSecondary }}>
          Última actuación:
        </p>
        <p className="text-xs line-clamp-2" style={{ color: SIGL_COLORS.textPrimary }}>
          {ultimaActuacion}
        </p>
      </div>

      {/* Botones de acción compactos */}
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={onVer}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: SIGL_COLORS.primary }}
        >
          <Eye size={12} />
          <span>Ver</span>
        </button>
        {onEditar && (
          <button
            onClick={onEditar}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors border"
            style={{ 
              borderColor: SIGL_COLORS.border,
              color: SIGL_COLORS.textSecondary,
              backgroundColor: 'white',
            }}
          >
            <Edit size={12} />
            <span>Editar</span>
          </button>
        )}
      </div>
    </div>
  );
}
