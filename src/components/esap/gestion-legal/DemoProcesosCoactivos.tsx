/**
 * DemoProcesosCoactivos - Demo standalone del módulo de Procesos Coactivos
 * Para pruebas y demostración de funcionalidades
 */

import { ProcesosCoactivosView } from './ProcesosCoactivosView';
import { ArrowLeft } from 'lucide-react';

interface DemoProcesosCoactivosProps {
  onVolver?: () => void;
}

export function DemoProcesosCoactivos({ onVolver }: DemoProcesosCoactivosProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header de Demo */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onVolver && (
            <button
              onClick={onVolver}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">DEMO - Módulo de Procesos Coactivos</h1>
            <p className="text-sm text-red-100">Sistema Integrado de Gestión Legal (SIGL) - ESAP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">Usuario: Demo Legal</p>
          <p className="text-xs text-red-100">gestion.legal@esap.edu.co</p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <ProcesosCoactivosView />
      </div>

      {/* Footer de Instrucciones */}
      <div className="bg-blue-50 border-t-2 border-blue-200 px-6 py-3">
        <p className="text-sm text-blue-900">
          <strong>🎯 Instrucciones:</strong> Haz clic en los botones de las tarjetas para abrir modales funcionales. 
          <strong className="ml-2">📋 Expediente</strong> muestra el detalle completo, 
          <strong className="ml-2">💳 Pago</strong> permite registrar pagos y acuerdos, 
          <strong className="ml-2">➕ Nuevo Proceso</strong> crea procesos coactivos en 3 pasos.
        </p>
      </div>
    </div>
  );
}