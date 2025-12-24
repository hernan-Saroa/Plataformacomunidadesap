/**
 * ============================================
 * HEADER DETALLE AUDITORÍA - CONTROL INTERNO DE GESTIÓN
 * ============================================
 * 
 * Header específico para vistas de detalle de auditorías
 * Muestra información de la auditoría actual
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import React from 'react';
import { Eye, Calendar } from 'lucide-react';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';

interface HeaderAuditoriaCIGProps {
  auditoria: {
    codigo: string;
    nombre: string;
    auditorLider: string;
    fechaInicio: string;
    fechaFin: string;
  };
  onVerExpediente?: () => void;
}

export function HeaderModuloCIG({ auditoria, onVerExpediente }: HeaderAuditoriaCIGProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 
              className="font-black leading-tight text-2xl"
              style={{ color: '#F97316' }}
            >
              {auditoria.codigo} - {auditoria.nombre}
            </h2>
            <BadgeSIGL variant="success" size="sm">Activa</BadgeSIGL>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{auditoria.auditorLider}</span>
            </div>
            <span>•</span>
            <span>{auditoria.fechaInicio} - {auditoria.fechaFin}</span>
          </div>
        </div>
        {onVerExpediente && (
          <div className="flex gap-2">
            <button 
              onClick={onVerExpediente}
              className="px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5"
              style={{ 
                background: '#F97316', 
                color: '#FFFFFF' 
              }}
            >
              <Eye className="w-4 h-4" />
              Ver Expediente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
