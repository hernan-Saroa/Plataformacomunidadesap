/**
 * UNIVERSO DE AUDITORÍAS - VERSIÓN INTEGRADA
 * Wrapper que agrega funcionalidad de integración con Context API
 */

import { useState, useEffect } from 'react';
import { CheckSquare, ArrowRight, CalendarDays } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { useControlInterno, ProcesoUniverso } from './ControlInternoContext';
import { UniversoAuditorias as UniversoOriginal } from './UniversoAuditorias';
import { AccionesRapidaFlujo } from './AccionesRapidaFlujo';

export function UniversoAuditoriasIntegrado({ onNavegar }: { onNavegar: (seccion: string) => void }) {
  const context = useControlInterno();
  const [procesosSeleccionados, setProcesosSeleccionados] = useState<string[]>([]);
  const [mostrarAcciones, setMostrarAcciones] = useState(true);

  // Inicializar datos del universo en el contexto si está vacío
  useEffect(() => {
    if (context.universoProcesos.length === 0) {
      // Mock data de procesos
      const procesosMock: ProcesoUniverso[] = [
        {
          id: '1',
          codigo: 'UNI-FIN-001',
          proceso: 'Gestión Financiera',
          macroproceso: 'Gestión de Recursos',
          tipoProceso: 'Apoyo',
          tipoSede: 'Sede Principal',
          nivelRiesgo: 'CRÍTICO',
          añoPriorizacion: 'Año 1',
          responsable: 'Sandra Montero',
          estado: 'Disponible'
        },
        {
          id: '2',
          codigo: 'UNI-CON-001',
          proceso: 'Gestión Contractual',
          macroproceso: 'Gestión de Recursos',
          tipoProceso: 'Apoyo',
          tipoSede: 'Sede Principal',
          nivelRiesgo: 'CRÍTICO',
          añoPriorizacion: 'Año 1',
          responsable: 'Fernando Ávila',
          estado: 'Disponible'
        },
        {
          id: '3',
          codigo: 'UNI-TH-001',
          proceso: 'Gestión de Talento Humano',
          macroproceso: 'Gestión de Recursos',
          tipoProceso: 'Apoyo',
          tipoSede: 'Sede Principal',
          nivelRiesgo: 'MEDIO',
          añoPriorizacion: 'Año 2-3',
          responsable: 'William Ramírez',
          estado: 'Disponible'
        },
        {
          id: '4',
          codigo: 'UNI-ADM-001',
          proceso: 'Gestión Administrativa',
          macroproceso: 'Gestión de Recursos',
          tipoProceso: 'Apoyo',
          tipoSede: 'Territorial',
          territorial: 'Antioquia',
          nivelRiesgo: 'ALTO',
          añoPriorizacion: 'Año 1-2',
          responsable: 'Catalina Rubio',
          estado: 'Disponible'
        },
        {
          id: '5',
          codigo: 'UNI-ACA-001',
          proceso: 'Gestión de Programas Académicos',
          macroproceso: 'Gestión Académica',
          tipoProceso: 'Misional',
          tipoSede: 'Sede Principal',
          nivelRiesgo: 'MEDIO',
          añoPriorizacion: 'Año 2-3',
          responsable: 'Nubia Pimiento',
          estado: 'Disponible'
        }
      ];
      context.setUniversoProcesos(procesosMock);
    }
  }, []);

  const handleImportarAPrograma = () => {
    if (procesosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un proceso para importar');
      return;
    }

    // Importar usando el método del contexto
    context.importarAPrograma(procesosSeleccionados);
    
    toast.success(`${procesosSeleccionados.length} proceso(s) importado(s) al Programa Anual`, {
      description: 'Redirigiendo al Programa Anual...',
      duration: 3000
    });

    // Limpiar selección
    setProcesosSeleccionados([]);

    // Navegar al Programa Anual después de 1 segundo
    setTimeout(() => {
      onNavegar('programa-anual');
    }, 1000);
  };

  const procesosDisponibles = context.universoProcesos.filter(p => p.estado === 'Disponible');

  return (
    <div className="space-y-6">
      {/* Acciones Rápidas */}
      {mostrarAcciones && (
        <AccionesRapidaFlujo
          seccionActual="universo-auditorias"
          onNavegar={onNavegar}
          contadores={{
            universoProcesos: context.universoProcesos.length,
            auditoriasProgramadas: context.auditoriasProgramadas.length,
            procesosPendientesImportar: procesosDisponibles.length
          }}
        />
      )}

      {/* Panel de Selección e Importación */}
      {procesosDisponibles.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#EFF6FF', border: '2px solid #3B82F6' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CheckSquare className="w-6 h-6" style={{ color: '#3B82F6' }} />
                <h3 className="font-bold text-lg" style={{ color: '#1E40AF' }}>
                  Importar Procesos al Programa Anual
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: '#1E40AF' }}>
                Selecciona los procesos que deseas programar para auditoría en el Programa Anual {context.añoFiscalActivo}.
              </p>

              {/* Lista de procesos disponibles */}
              <div className="space-y-2">
                {procesosDisponibles.slice(0, 5).map((proceso) => (
                  <label
                    key={proceso.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
                    style={{
                      backgroundColor: procesosSeleccionados.includes(proceso.id) ? '#DBEAFE' : '#FFFFFF',
                      border: procesosSeleccionados.includes(proceso.id) ? '2px solid #3B82F6' : '2px solid #E5E7EB'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={procesosSeleccionados.includes(proceso.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setProcesosSeleccionados([...procesosSeleccionados, proceso.id]);
                        } else {
                          setProcesosSeleccionados(procesosSeleccionados.filter(id => id !== proceso.id));
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>
                          {proceso.proceso}
                        </span>
                        <Badge
                          style={{
                            backgroundColor: proceso.nivelRiesgo === 'CRÍTICO' ? '#DC2626' :
                              proceso.nivelRiesgo === 'ALTO' ? '#F59E0B' :
                              proceso.nivelRiesgo === 'MEDIO' ? '#3B82F6' : '#10B981',
                            color: '#FFFFFF'
                          }}
                        >
                          {proceso.nivelRiesgo}
                        </Badge>
                      </div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>
                        {proceso.codigo} • {proceso.tipoProceso} • {proceso.responsable}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {procesosDisponibles.length > 5 && (
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  + {procesosDisponibles.length - 5} procesos más disponibles
                </p>
              )}
            </div>

            {/* Botón de Importar */}
            <div className="flex flex-col items-end gap-3">
              {procesosSeleccionados.length > 0 && (
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#DBEAFE' }}
                >
                  <div className="text-2xl font-bold" style={{ color: '#1E40AF' }}>
                    {procesosSeleccionados.length}
                  </div>
                  <div className="text-xs" style={{ color: '#1E40AF' }}>
                    Seleccionados
                  </div>
                </div>
              )}

              <Button
                onClick={handleImportarAPrograma}
                disabled={procesosSeleccionados.length === 0}
                className="gap-2"
                style={{
                  backgroundColor: procesosSeleccionados.length > 0 ? '#10B981' : '#9CA3AF',
                  color: '#FFFFFF'
                }}
              >
                <CalendarDays className="w-5 h-5" />
                Importar a Programa Anual
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Original */}
      <UniversoOriginal />

      {/* Información de Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB' }}>
          <div className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            {context.universoProcesos.length}
          </div>
          <div className="text-sm" style={{ color: '#6B7280' }}>
            Total Procesos Catalogados
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#ECFDF5', border: '2px solid #10B981' }}>
          <div className="text-2xl font-bold" style={{ color: '#065F46' }}>
            {procesosDisponibles.length}
          </div>
          <div className="text-sm" style={{ color: '#065F46' }}>
            Disponibles para Importar
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '2px solid #3B82F6' }}>
          <div className="text-2xl font-bold" style={{ color: '#1E40AF' }}>
            {context.auditoriasProgramadas.length}
          </div>
          <div className="text-sm" style={{ color: '#1E40AF' }}>
            Ya Programadas
          </div>
        </div>
      </div>
    </div>
  );
}
