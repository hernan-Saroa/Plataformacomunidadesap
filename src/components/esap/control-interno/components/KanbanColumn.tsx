/**
 * ═════════════════════════════════════════════════════════════════════════
 * COLUMNA KANBAN - DISEÑO OFICIAL OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Columna para el tablero Kanban de auditorías
 * Soporte para drag & drop con react-dnd
 * 
 * Estados: Backlog, Planeación, Ejecución, Comunicación, Cerrado
 * 
 * @version 2.0
 */

import React from 'react';
import { Plus, Download } from 'lucide-react';
import { ESAP_COLORS, getKanbanColumnColor, type EstadoKanban } from '../utils/esapThemeOCIG';
import { AuditoriaCard, type AuditoriaCardData } from './AuditoriaCard';
import { toast } from 'sonner';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

interface KanbanColumnProps {
  estado: EstadoKanban;
  titulo: string;
  count: number;
  auditorias: AuditoriaCardData[];
  onAgregarNueva?: () => void;
  onOpenAuditoria?: (id: string) => void;
  onDrop?: (auditoriaId: string, nuevoEstado: EstadoKanban) => void;
  onExportar?: (estado: EstadoKanban) => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE COLUMNAS
// ═════════════════════════════════════════════════════════════════════════

const COLUMN_CONFIG: Record<EstadoKanban, { bg: string; border: string; textColor: string }> = {
  backlog: {
    bg: '#E8F4F8',
    border: '#2E86AB',
    textColor: '#1B4F72',
  },
  planeacion: {
    bg: '#FEF9E7',
    border: '#F39C12',
    textColor: '#875A12',
  },
  ejecucion: {
    bg: '#D4EFDF',
    border: '#27AE60',
    textColor: '#196F3D',
  },
  comunicacion: {
    bg: '#FADBD8',
    border: '#E74C3C',
    textColor: '#922B21',
  },
  cerrado: {
    bg: '#D5D8DC',
    border: '#6C757D',
    textColor: '#2C3E50',
  },
};

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function KanbanColumn({
  estado,
  titulo,
  count,
  auditorias,
  onAgregarNueva,
  onOpenAuditoria,
  onDrop,
  onExportar,
  className = '',
}: KanbanColumnProps) {
  
  const config = COLUMN_CONFIG[estado];

  const handleExportarColumna = () => {
    if (onExportar) {
      onExportar(estado);
    } else {
      toast.success(`Exportando ${titulo}`, {
        description: `${count} auditorías en esta columna`,
        duration: 2000,
      });
    }
  };

  // Handlers para drag & drop (simulado - implementar con react-dnd)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-blue-400');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
    
    const auditoriaId = e.dataTransfer.getData('auditoriaId');
    if (auditoriaId && onDrop) {
      onDrop(auditoriaId, estado);
    }
  };

  return (
    <div 
      className={`flex flex-col min-w-[300px] ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* HEADER DE COLUMNA */}
      <div 
        className="rounded-t-lg px-4 py-3 border-b-2 flex items-center justify-between"
        style={{ 
          backgroundColor: config.bg,
          borderColor: config.border,
        }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: config.textColor }}>
            {titulo}
          </h3>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              color: config.textColor,
            }}
          >
            {count}
          </span>
        </div>
        {/* Botón exportar columna */}
        <button
          onClick={handleExportarColumna}
          className="p-1.5 rounded hover:bg-white/50 transition-colors"
          title={`Exportar ${titulo}`}
        >
          <Download className="w-4 h-4" style={{ color: config.textColor }} />
        </button>
      </div>

      {/* ÁREA DE TARJETAS */}
      <div 
        className="flex-1 p-3 space-y-3 min-h-[400px] rounded-b-lg"
        style={{ backgroundColor: config.bg }}
      >
        {auditorias.map((auditoria) => (
          <div
            key={auditoria.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('auditoriaId', auditoria.id);
              e.currentTarget.classList.add('opacity-50');
            }}
            onDragEnd={(e) => {
              e.currentTarget.classList.remove('opacity-50');
            }}
          >
            <AuditoriaCard
              auditoria={auditoria}
              onOpen={onOpenAuditoria}
            />
          </div>
        ))}

        {/* BOTÓN AGREGAR NUEVA */}
        {onAgregarNueva && (
          <button
            onClick={onAgregarNueva}
            className="w-full py-3 border-2 border-dashed rounded-lg text-sm font-medium transition-all hover:bg-white/50"
            style={{ 
              borderColor: config.border,
              color: config.textColor,
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default KanbanColumn;
