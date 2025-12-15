/**
 * COMPONENTE DE ACCIONES RÁPIDAS DE FLUJO
 * Botones contextuales que facilitan la navegación entre módulos
 */

import { ArrowRight, Database, CalendarDays, FileSearch, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface AccionesRapidaFlujoProps {
  seccionActual: 'plan-anual' | 'universo-auditorias' | 'programa-anual' | 'plan-individual';
  onNavegar: (seccion: string) => void;
  contadores?: {
    universoProcesos?: number;
    auditoriasProgramadas?: number;
    planesIndividuales?: number;
    procesosPendientesImportar?: number;
  };
}

export function AccionesRapidaFlujo({ 
  seccionActual, 
  onNavegar,
  contadores = {}
}: AccionesRapidaFlujoProps) {
  
  // Acciones según la sección actual
  const getAcciones = () => {
    switch (seccionActual) {
      case 'plan-anual':
        return [
          {
            label: 'Ver Universo de Auditorías',
            descripcion: `${contadores.universoProcesos || 1234} procesos catalogados`,
            icono: Database,
            color: '#F97316',
            destino: 'universo-auditorias'
          },
          {
            label: 'Ir a Programa Anual',
            descripcion: `${contadores.auditoriasProgramadas || 0} auditorías programadas`,
            icono: CalendarDays,
            color: '#10B981',
            destino: 'programa-anual'
          }
        ];
      
      case 'universo-auditorias':
        return [
          {
            label: 'Importar a Programa Anual',
            descripcion: 'Selecciona procesos para programar auditorías',
            icono: CalendarDays,
            color: '#10B981',
            destino: 'programa-anual',
            destacado: true
          }
        ];
      
      case 'programa-anual':
        return [
          {
            label: 'Crear Plan Individual',
            descripcion: 'Define el plan detallado de una auditoría',
            icono: FileSearch,
            color: '#8B5CF6',
            destino: 'plan-individual',
            destacado: true
          }
        ];
      
      case 'plan-individual':
        return [
          {
            label: 'Volver a Programa Anual',
            descripcion: `${contadores.auditoriasProgramadas || 0} auditorías programadas`,
            icono: CalendarDays,
            color: '#10B981',
            destino: 'programa-anual'
          }
        ];
      
      default:
        return [];
    }
  };

  const acciones = getAcciones();

  if (acciones.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {acciones.map((accion, index) => {
        const Icono = accion.icono;
        
        return (
          <div
            key={index}
            className="group rounded-xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg"
            style={{
              borderColor: accion.destacado ? accion.color : '#E5E7EB',
              backgroundColor: accion.destacado ? `${accion.color}10` : '#FFFFFF'
            }}
            onClick={() => onNavegar(accion.destino)}
          >
            <div className="flex items-start gap-4">
              {/* Icono */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: `${accion.color}20`,
                  color: accion.color
                }}
              >
                <Icono className="w-6 h-6" />
              </div>

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold" style={{ color: '#1F2937' }}>
                    {accion.label}
                  </h3>
                  {accion.destacado && (
                    <Badge
                      className="text-xs px-2 py-0.5"
                      style={{ backgroundColor: accion.color, color: '#FFFFFF' }}
                    >
                      Siguiente paso
                    </Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {accion.descripcion}
                </p>
              </div>

              {/* Flecha */}
              <ArrowRight
                className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: accion.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
