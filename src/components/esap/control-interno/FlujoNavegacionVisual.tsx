/**
 * COMPONENTE DE FLUJO DE NAVEGACIÓN VISUAL
 * Muestra dónde está el usuario en el flujo RF001 → RF002 → RF003 → RF004
 * Versión minimalista que complementa el menú lateral sin duplicarlo
 */

import { motion } from 'motion/react';
import { Target, Database, CalendarDays, FileSearch, ArrowRight, CheckCircle2 } from 'lucide-react';

interface FlujoNavegacionVisualProps {
  seccionActiva: 'plan-anual' | 'universo-auditorias' | 'programa-anual' | 'plan-individual';
  onNavegar?: (seccion: string) => void;
  mostrarNumeros?: boolean;
}

export function FlujoNavegacionVisual({ 
  seccionActiva, 
  onNavegar,
  mostrarNumeros = false 
}: FlujoNavegacionVisualProps) {
  
  const etapas = [
    {
      id: 'plan-anual',
      rf: 'RF001',
      titulo: 'Plan Anual',
      icono: Target,
      color: '#3B82F6',
      numero: 1
    },
    {
      id: 'universo-auditorias',
      rf: 'RF002',
      titulo: 'Universo',
      icono: Database,
      color: '#F97316',
      numero: 2
    },
    {
      id: 'programa-anual',
      rf: 'RF003',
      titulo: 'Programa Anual',
      icono: CalendarDays,
      color: '#10B981',
      numero: 3
    },
    {
      id: 'plan-individual',
      rf: 'RF004',
      titulo: 'Plan Individual',
      icono: FileSearch,
      color: '#8B5CF6',
      numero: 4
    }
  ];

  const indexActivo = etapas.findIndex(e => e.id === seccionActiva);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-gray-200">
      {/* Título del flujo */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Flujo de Planificación
        </span>
      </div>

      {/* Stepper horizontal compacto */}
      <div className="flex items-center justify-between gap-1">
        {etapas.map((etapa, index) => {
          const Icono = etapa.icono;
          const estaActiva = etapa.id === seccionActiva;
          const completada = index < indexActivo;

          return (
            <div key={etapa.id} className="flex items-center flex-1">
              {/* Etapa - Versión compacta */}
              <motion.button
                whileHover={onNavegar ? { scale: 1.05 } : {}}
                whileTap={onNavegar ? { scale: 0.95 } : {}}
                onClick={() => onNavegar && onNavegar(etapa.id)}
                disabled={!onNavegar}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all flex-1 ${
                  onNavegar ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: estaActiva ? `${etapa.color}15` : 'transparent',
                  border: estaActiva ? `2px solid ${etapa.color}` : '2px solid transparent'
                }}
              >
                {/* Icono compacto */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: estaActiva || completada ? etapa.color : '#E5E7EB',
                    color: '#FFFFFF'
                  }}
                >
                  {completada && !estaActiva ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icono className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Texto minimalista - solo RF */}
                <span 
                  className="text-[10px] font-bold"
                  style={{ color: estaActiva || completada ? etapa.color : '#9CA3AF' }}
                >
                  {etapa.rf}
                </span>
              </motion.button>

              {/* Flecha de conexión */}
              {index < etapas.length - 1 && (
                <ArrowRight
                  className="w-4 h-4 mx-0.5 flex-shrink-0"
                  style={{ color: index < indexActivo ? etapa.color : '#D1D5DB' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}