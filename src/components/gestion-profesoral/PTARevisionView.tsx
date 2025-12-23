/**
 * VISTA UNIFICADA DE REVISIÓN DEL PTA
 * 
 * Componente que integra:
 * - Resumen visual del PTA
 * - Flujo de aprobación
 * - Historial completo
 * - Vista de aprobación (para directores/coordinadores)
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { Eye, History, CheckSquare, X } from 'lucide-react';
import { Button } from '../ui/button';
import { PTAResumenVisual } from './PTAResumenVisual';
import { PTAFlujoAprobacion } from './PTAFlujoAprobacion';
import { PTAHistorialAprobacion } from './PTAHistorialAprobacion';
import { PTAAprobacionView } from './PTAAprobacionView';

interface PTARevisionViewProps {
  pta: any;
  docente?: any;
  modo: 'visualizacion' | 'aprobacion';
  rol?: 'director' | 'programacion';
  onAprobar?: (ptaId: string, observaciones: string) => void;
  onRechazar?: (ptaId: string, motivo: string, observaciones: string) => void;
  onCerrar?: () => void;
}

export function PTARevisionView({
  pta,
  docente,
  modo,
  rol,
  onAprobar,
  onRechazar,
  onCerrar
}: PTARevisionViewProps) {
  
  const [vistaActiva, setVistaActiva] = useState<'resumen' | 'historial' | 'aprobacion'>(
    modo === 'aprobacion' ? 'aprobacion' : 'resumen'
  );
  
  // Si es modo aprobación, mostrar directamente la vista de aprobación
  if (modo === 'aprobacion' && rol && onAprobar && onRechazar) {
    return (
      <PTAAprobacionView
        pta={pta}
        docente={docente}
        rol={rol}
        onAprobar={onAprobar}
        onRechazar={onRechazar}
        onCancelar={onCerrar}
      />
    );
  }
  
  // Modo visualización
  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setVistaActiva('resumen')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              vistaActiva === 'resumen'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            Resumen
          </button>
          
          <button
            onClick={() => setVistaActiva('historial')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              vistaActiva === 'historial'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </div>
        
        {onCerrar && (
          <Button variant="ghost" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
        )}
      </div>
      
      {/* Flujo de aprobación (siempre visible) */}
      <PTAFlujoAprobacion pta={pta} mostrarDetalle={true} />
      
      {/* Contenido según vista activa */}
      {vistaActiva === 'resumen' && (
        <PTAResumenVisual pta={pta} docente={docente} />
      )}
      
      {vistaActiva === 'historial' && (
        <PTAHistorialAprobacion pta={pta} />
      )}
    </div>
  );
}
