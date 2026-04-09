/**
 * ============================================
 * HEADER UNIFICADO - CONTROL INTERNO DE GESTIÓN
 * ============================================
 * 
 * Componente reutilizable para encabezados del módulo OCI
 * Diseño mandatorio basado en Dashboard Kanban Operativo
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import React from 'react';

interface HeaderModuloCIGProps {
  titulo: string;
  subtitulo: string;
  accionesPersonalizadas?: React.ReactNode;
}

export function HeaderModuloCIG({
  titulo, 
  subtitulo, 
  accionesPersonalizadas 
}: HeaderModuloCIGProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-4">
      <div className="flex-1">
        <h2 
          className="font-black leading-tight text-xl sm:text-2xl"
          style={{ color: '#F97316' }}
        >
          {titulo}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
          {subtitulo}
        </p>
      </div>

      {/* Acciones personalizadas (botones, filtros, etc.) */}
      {accionesPersonalizadas && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {accionesPersonalizadas}
        </div>
      )}
    </div>
  );
}

// Compatibilidad con imports previos escritos con el typo original.
export const HeaderModulOCIG = HeaderModuloCIG;
