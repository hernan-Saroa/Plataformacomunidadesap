/**
 * ═════════════════════════════════════════════════════════════════════════
 * CARD DE AUDITORÍA - DISEÑO OFICIAL OCI
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Componente de tarjeta para el tablero Kanban de auditorías
 * Basado en especificaciones de PROMPT_FIGMA_OCI_COMPLETO.md
 * 
 * Dimensiones: 280px ancho, altura variable
 * Padding: 16px
 * Border-radius: 8px
 * 
 * @version 2.0
 */

import React from 'react';
import { User, Calendar, AlertCircle, Users } from 'lucide-react';
import { 
  ESAP_COLORS, 
  ESAP_CLASSES, 
  getSemaforoClass,
  getSemaforoPorDias,
  calcularDiasRestantes,
  getTextoAlerta,
  type EstadoKanban 
} from '../utils/esapThemeOCI';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

export interface AuditoriaCardData {
  id: string;
  codigo: string;                    // Ej: AUD-2025-007
  nombre: string;                    // Ej: Auditoría Gestión Financiera
  tipo: string;                      // Ej: SEDE CENTRAL, TERRITORIAL
  responsable: {
    nombre: string;                  // Ej: Catalina Rubio
    cargo: string;                   // Ej: Auditor Líder
    avatar?: string;
  };
  fechaInicio: string;               // ISO date
  fechaFin: string;                  // ISO date
  progreso: number;                  // 0-100
  equipoCount?: number;              // Número de integrantes adicionales
  etiquetas?: string[];              // Ej: ['SEDE CENTRAL', 'Urgente']
  estado: EstadoKanban;
}

interface AuditoriaCardProps {
  auditoria: AuditoriaCardData;
  onOpen?: (id: string) => void;
  isDragging?: boolean;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function AuditoriaCard({ 
  auditoria, 
  onOpen,
  isDragging = false,
  className = ''
}: AuditoriaCardProps) {
  
  const diasRestantes = calcularDiasRestantes(auditoria.fechaFin);
  const textoAlerta = getTextoAlerta(diasRestantes);
  const semaforoClass = getSemaforoClass(auditoria.progreso);
  const colorSemaforo = getSemaforoPorDias(diasRestantes);

  const handleClick = () => {
    if (onOpen) {
      onOpen(auditoria.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        w-[280px] bg-white rounded-lg border border-gray-200 p-4
        shadow-sm transition-all cursor-pointer
        ${isDragging 
          ? 'opacity-80 shadow-xl border-[#2874A6] border-2 rotate-2' 
          : 'hover:shadow-md hover:border-[#2E86AB]'
        }
        ${className}
      `}
    >
      {/* HEADER: Código + Semáforo */}
      <div className="flex items-start justify-between mb-3">
        <div className="font-mono text-sm font-semibold text-[#1B4F72]">
          {auditoria.codigo}
        </div>
        <div 
          className={`w-3 h-3 rounded-full ${
            colorSemaforo === 'verde' ? 'bg-[#27AE60]' :
            colorSemaforo === 'amarillo' ? 'bg-[#F39C12]' :
            'bg-[#E74C3C]'
          }`}
          title={`Estado: ${colorSemaforo}`}
        />
      </div>

      {/* TÍTULO */}
      <h4 className="text-sm font-semibold text-[#2C3E50] mb-3 line-clamp-2 min-h-[40px]">
        {auditoria.nombre}
      </h4>

      {/* SEPARADOR */}
      <div className="h-px bg-gray-200 mb-3" />

      {/* RESPONSABLE */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1B4F72] to-[#2874A6] flex items-center justify-center text-white text-xs font-semibold">
            {auditoria.responsable.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <span className="text-sm text-[#2C3E50] font-medium">
            {auditoria.responsable.nombre}
          </span>
        </div>
        <div className="text-xs text-[#6C757D] ml-8">
          {auditoria.responsable.cargo}
        </div>
      </div>

      {/* SEPARADOR */}
      <div className="h-px bg-gray-200 mb-3" />

      {/* FECHAS */}
      <div className="flex items-center gap-2 mb-2 text-xs text-[#6C757D]">
        <Calendar className="w-4 h-4" />
        <span>
          {formatFecha(auditoria.fechaInicio)} - {formatFecha(auditoria.fechaFin)}
        </span>
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#6C757D]">Progreso</span>
          <span className="text-xs font-semibold text-[#2C3E50]">{auditoria.progreso}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              auditoria.progreso >= 80 ? 'bg-[#27AE60]' :
              auditoria.progreso >= 50 ? 'bg-[#F39C12]' :
              'bg-[#E74C3C]'
            }`}
            style={{ width: `${auditoria.progreso}%` }}
          />
        </div>
      </div>

      {/* SEPARADOR */}
      <div className="h-px bg-gray-200 mb-3" />

      {/* FOOTER: Etiquetas + Equipo */}
      <div className="flex items-center justify-between">
        {/* Etiqueta de tipo */}
        <div className="flex items-center gap-1">
          <span className="text-xs px-2 py-0.5 rounded bg-[#E8F4F8] text-[#1B4F72] font-medium uppercase tracking-wide">
            {auditoria.tipo}
          </span>
        </div>

        {/* Contador de equipo */}
        {auditoria.equipoCount && auditoria.equipoCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#6C757D]">
            <Users className="w-4 h-4" />
            <span>+{auditoria.equipoCount}</span>
          </div>
        )}
      </div>

      {/* ALERTA DE VENCIMIENTO */}
      {textoAlerta && (
        <>
          <div className="h-px bg-gray-200 mt-3 mb-2" />
          <div className={`
            flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded
            ${diasRestantes <= 2 ? 'bg-[#FADBD8] text-[#E74C3C]' : 'bg-[#FEF9E7] text-[#F39C12]'}
          `}>
            <AlertCircle className="w-4 h-4" />
            <span>{textoAlerta}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════════════

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${meses[date.getMonth()]}`;
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default AuditoriaCard;
