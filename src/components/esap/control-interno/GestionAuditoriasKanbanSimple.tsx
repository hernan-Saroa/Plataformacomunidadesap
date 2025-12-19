/**
 * GESTIÓN DE AUDITORÍAS - STUB SIMPLE
 * Versión simplificada para evitar errores de dependencias
 */

import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { ClipboardCheck, Plus } from 'lucide-react';

export function GestionAuditoriasKanbanSimple() {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7" style={{ color: '#F97316' }} />
            Gestión de Auditorías
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Sistema de gestión de auditorías del control interno
          </p>
        </div>

        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Auditoría
        </Button>
      </div>

      {/* CONTENIDO */}
      <Card className="p-8">
        <div className="text-center">
          <ClipboardCheck className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Sistema de Auditorías
          </h3>
          <p className="text-gray-600 mb-4">
            Módulo para gestión completa de auditorías con vista Kanban
          </p>
          <p className="text-sm text-gray-500">
            Este módulo está siendo cargado. Si ves este mensaje, por favor recarga la página.
          </p>
        </div>
      </Card>
    </div>
  );
}
