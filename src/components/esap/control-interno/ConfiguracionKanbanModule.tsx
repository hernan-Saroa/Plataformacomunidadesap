/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE TABLEROS KANBAN - VERSIÓN SIMPLIFICADA
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Settings, Columns } from 'lucide-react';

export function ConfiguracionKanbanModule() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] p-3 rounded-lg">
            <Columns className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl text-gray-900 font-bold">Configuración de Tableros Kanban</h2>
            <p className="text-sm text-gray-600">Gestión de etapas, tiempos SLA y límites WIP</p>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-blue-50 border-l-4 border-[#2962FF] p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#2962FF]" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Configuración de Kanban</h3>
              <p className="text-sm text-gray-600">
                Módulo disponible próximamente. Aquí podrás gestionar las etapas, configurar tiempos SLA,
                establecer límites WIP y definir reglas de transición para tus tableros Kanban.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder para futuras funcionalidades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Gestión de Etapas</h3>
          <p className="text-sm text-gray-600">Crear, editar y reordenar etapas del tablero</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Tiempos SLA</h3>
          <p className="text-sm text-gray-600">Configurar tiempos de respuesta y alertas</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Límites WIP</h3>
          <p className="text-sm text-gray-600">Establecer límites de trabajo en progreso</p>
        </div>
      </div>
    </div>
  );
}
