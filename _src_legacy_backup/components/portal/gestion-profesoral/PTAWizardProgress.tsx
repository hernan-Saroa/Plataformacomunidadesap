// Componente de Wizard de Progreso para el PTA
// Inspirado en UX de clase mundial (Notion, Linear, Figma)

import { Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ComponenteProgreso {
  id: string;
  nombre: string;
  horas: number;
  horasMaximas?: number;
  completado: boolean;
  enCurso: boolean;
  pendiente: boolean;
  color: string;
  emoji: string;
}

interface PTAWizardProgressProps {
  componentesProgreso: ComponenteProgreso[];
  onClickComponente: (id: string) => void;
}

export function PTAWizardProgress({ componentesProgreso, onClickComponente }: PTAWizardProgressProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* Título */}
      <h3 className="text-sm font-medium text-gray-700 mb-4">Progreso de tu PTA</h3>
      
      {/* Wizard Visual */}
      <div className="relative">
        {/* Línea de conexión */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-[#003DA5] transition-all duration-500"
            style={{ 
              width: `${(componentesProgreso.filter(c => c.completado).length / componentesProgreso.length) * 100}%` 
            }}
          />
        </div>
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {componentesProgreso.map((componente, index) => {
            const isLast = index === componentesProgreso.length - 1;
            
            return (
              <div 
                key={componente.id}
                className="flex flex-col items-center flex-1"
              >
                {/* Círculo del paso */}
                <button
                  onClick={() => onClickComponente(componente.id)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 mb-2 relative z-10
                    ${componente.completado 
                      ? 'bg-[#003DA5] text-white shadow-lg' 
                      : componente.enCurso
                      ? 'bg-white border-2 border-[#003DA5] text-[#003DA5]'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                    }
                    hover:scale-110 hover:shadow-xl
                  `}
                >
                  {componente.completado ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{componente.emoji}</span>
                  )}
                </button>
                
                {/* Nombre del componente */}
                <div className="text-center">
                  <p className={`
                    text-xs font-medium mb-1
                    ${componente.completado || componente.enCurso
                      ? 'text-gray-900'
                      : 'text-gray-500'
                    }
                  `}>
                    {componente.nombre}
                  </p>
                  
                  {/* Horas y estado */}
                  {componente.completado ? (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ {componente.horas}h
                    </p>
                  ) : componente.enCurso ? (
                    <p className="text-xs text-[#003DA5] font-medium">
                      ● {componente.horas}h
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      ○ {componente.horas}h
                    </p>
                  )}
                  
                  {/* Estado descriptivo */}
                  <p className={`
                    text-xs mt-1
                    ${componente.completado 
                      ? 'text-green-600' 
                      : componente.enCurso
                      ? 'text-[#003DA5]'
                      : 'text-gray-400'
                    }
                  `}>
                    {componente.completado ? 'Completo' : componente.enCurso ? 'En curso' : 'Pendiente'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mensaje de ayuda contextual */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3"
      >
        <p className="text-sm text-blue-900">
          <span className="font-medium">💡 Tip:</span> Haz clic en cualquier componente para editarlo directamente.
        </p>
      </motion.div>
    </div>
  );
}
