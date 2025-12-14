/**
 * SISTEMA DE TOOLTIPS CONTEXTUALES - PTA
 * Tooltips explicativos para cada concepto del PTA
 */

import { HelpCircle, Info, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { Badge } from '../../ui/badge';

interface TooltipInfo {
  title: string;
  description: string;
  example?: string;
  reference?: string;
  type?: 'info' | 'warning' | 'error';
}

// Base de conocimiento de tooltips del PTA
export const TOOLTIPS_PTA: Record<string, TooltipInfo> = {
  // CONCEPTOS GENERALES
  'horas-base': {
    title: 'Horas Base del PTA',
    description: 'Total de horas laborales asignadas al docente según su tipo de contrato. Todas las actividades del PTA deben sumar exactamente estas horas.',
    example: '1600h para docente Tiempo Completo, 800h para Medio Tiempo',
    reference: 'Circular Dispositiva 003/2025',
    type: 'info'
  },
  
  'docencia-sagrada': {
    title: 'Docencia es SAGRADA',
    description: 'El componente de Docencia NUNCA se reduce en el prorrateo. Es el único componente intocable porque representa el compromiso académico directo con estudiantes.',
    example: 'Si tienes 600h de Docencia, siempre permanecerán 600h, sin importar el prorrateo',
    reference: 'Política institucional ESAP',
    type: 'warning'
  },

  'prorrateo': {
    title: 'Prorrateo Automático',
    description: 'Cuando la suma de actividades excede las Horas Base, el sistema reduce proporcionalmente SOLO Investigación, Extensión y Complementarias, manteniendo Docencia intacta.',
    example: 'Si excedes 200h: Inv/Ext/Comp se reducen × 0.75 (factor proporcional)',
    reference: 'Algoritmo institucional ESAP',
    type: 'warning'
  },

  // COMPONENTES
  'componente-docencia': {
    title: 'Componente Docencia',
    description: 'Actividades de enseñanza directa: asignaturas, seminarios, opciones de grado, tutorías. Sin tope máximo. Incluye preparación, ejecución y evaluación.',
    example: 'Gestión Pública I (3 créd, 2 grupos) = 384h',
    reference: 'Art. 5 Circular 003/2025',
    type: 'info'
  },

  'componente-investigacion': {
    title: 'Componente Investigación',
    description: 'Actividades de investigación formal y aplicada. Tope máximo: 50% del PTA. Incluye proyectos formales y necesidades del servicio (excluyentes entre sí).',
    example: 'Máximo 800h para PTA de 1600h',
    reference: 'Art. 6 Circular 003/2025',
    type: 'info'
  },

  'componente-extension': {
    title: 'Componente Extensión',
    description: 'Actividades de proyección social: capacitación, procesos de selección, fortalecimiento territorial, laboratorio de innovación, alto gobierno. Tope máximo: 25% del PTA.',
    example: 'Máximo 400h para PTA de 1600h',
    reference: 'Art. 7 Circular 003/2025',
    type: 'info'
  },

  'componente-complementarias': {
    title: 'Componente Complementarias',
    description: 'Actividades de apoyo institucional: gestión académica, actualización docente, participación en cuerpos colegiados. Tope máximo: 25% del PTA. 29 actividades disponibles.',
    example: 'Máximo 400h para PTA de 1600h',
    reference: 'Art. 8 Circular 003/2025',
    type: 'info'
  },

  // REGLAS
  'pre-requisito-3-creditos': {
    title: 'Pre-requisito: Asignatura ≥3 Créditos',
    description: 'Para desbloquear Investigación, Extensión y Complementarias, debes registrar primero AL MENOS UNA asignatura de mínimo 3 créditos en Docencia.',
    example: 'Gestión Pública I (3 créd) desbloquea todos los demás componentes',
    reference: 'Regla RN-PTA-002',
    type: 'warning'
  },

  'exclusion-mutua-inv': {
    title: 'Exclusión Mutua en Investigación',
    description: 'NO puedes tener simultáneamente Proyecto Formal Y Necesidad del Servicio. Debes elegir UNO u OTRO, no ambos.',
    example: 'Si tienes Proyecto Formal, no puedes agregar Necesidad del Servicio',
    reference: 'Regla RN-INV-001',
    type: 'error'
  },

  'tope-50-investigacion': {
    title: 'Tope 50% - Investigación',
    description: 'Las horas de Investigación no pueden exceder el 50% de tus Horas Base totales. Este es un límite DURO que bloquea el envío del PTA si se excede.',
    example: 'Para PTA 1600h: máximo 800h de Investigación',
    reference: 'Regla RN-INV-002',
    type: 'error'
  },

  'tope-25-extension': {
    title: 'Tope 25% - Extensión',
    description: 'Las horas de Extensión no pueden exceder el 25% de tus Horas Base totales.',
    example: 'Para PTA 1600h: máximo 400h de Extensión',
    reference: 'Regla RN-EXT-001',
    type: 'error'
  },

  'tope-25-complementarias': {
    title: 'Tope 25% - Complementarias',
    description: 'Las horas de Complementarias no pueden exceder el 25% de tus Horas Base totales.',
    example: 'Para PTA 1600h: máximo 400h de Complementarias',
    reference: 'Regla RN-COMP-001',
    type: 'error'
  },

  // CÁLCULOS
  'calculo-horas-ap': {
    title: 'Cálculo: Administración Pública (AP)',
    description: 'Asignaturas de Administración Pública: 64 horas fijas × 3 = 192h por grupo, sin importar el número de créditos.',
    example: 'AP 3 créd = 192h, AP 4 créd = 192h (mismo cálculo)',
    reference: 'Fórmula K15 Excel v9',
    type: 'info'
  },

  'calculo-horas-economia': {
    title: 'Cálculo: Economía Pública',
    description: 'Asignaturas de Economía Pública: 64 horas fijas × 3 = 192h por grupo.',
    example: 'Economía Pública 3 créd = 192h',
    reference: 'Fórmula K15 Excel v9',
    type: 'info'
  },

  'calculo-horas-maestria': {
    title: 'Cálculo: Maestría',
    description: 'Asignaturas de Maestría: Créditos × 12 × 3 = Total por grupo',
    example: 'Maestría 3 créd: 3 × 12 × 3 = 108h',
    reference: 'Fórmula K15 Excel v9',
    type: 'info'
  },

  'calculo-horas-general': {
    title: 'Cálculo: Otros Programas',
    description: 'Para otros programas: Créditos × 16 × 3 = Total por grupo',
    example: 'Programa general 3 créd: 3 × 16 × 3 = 144h',
    reference: 'Fórmula K15 Excel v9',
    type: 'info'
  },

  'factor-x3': {
    title: 'Factor ×3 en Docencia',
    description: 'Todas las horas de clase se multiplican por 3 para incluir: preparación (1x), ejecución (1x) y evaluación/retroalimentación (1x).',
    example: '64h clase × 3 = 192h totales (incluye prep + clase + evaluación)',
    reference: 'Metodología ESAP',
    type: 'info'
  },

  // CASOS ESPECIALES
  'seminario-enfasis': {
    title: 'Caso Especial: Seminario de Énfasis',
    description: 'Seminario de Énfasis tiene asignación fija de 128 horas × 3 = 384h, independiente de créditos.',
    example: 'Seminario de Énfasis = 384h fijas',
    reference: 'Caso especial Excel v9',
    type: 'info'
  },

  'opciones-grado': {
    title: 'Caso Especial: Opciones de Grado AP',
    description: 'Opciones de Grado AP tiene asignación fija de 20 horas totales, sin aplicar factor ×3.',
    example: 'Opciones de Grado AP = 20h fijas',
    reference: 'Caso especial Excel v9',
    type: 'info'
  },

  // ESTADOS
  'estado-borrador': {
    title: 'Estado: En Construcción',
    description: 'El PTA está en modo edición. Puedes agregar, modificar y eliminar actividades libremente.',
    example: 'Estado inicial al crear un PTA',
    type: 'info'
  },

  'estado-revision': {
    title: 'Estado: En Revisión',
    description: 'El PTA fue enviado y está siendo revisado por el jefe inmediato. No puedes editarlo.',
    example: 'Después de hacer clic en "Enviar a Aprobación"',
    type: 'warning'
  },

  'puede-enviar': {
    title: 'Listo para Enviar',
    description: 'Tu PTA cumple todas las validaciones DURAS y puede ser enviado a aprobación. Las advertencias no bloquean el envío.',
    example: 'Sin errores rojos = puede enviar ✓',
    type: 'info'
  }
};

interface PTATooltipProps {
  id: keyof typeof TOOLTIPS_PTA;
  children?: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function PTATooltip({ id, children, className = '', side = 'top' }: PTATooltipProps) {
  const info = TOOLTIPS_PTA[id];
  
  if (!info) {
    console.warn(`Tooltip "${id}" no encontrado`);
    return <>{children}</>;
  }

  const getIcon = () => {
    switch (info.type) {
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      default:
        return <Info className="w-3 h-3 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (info.type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button className={`inline-flex items-center ${className}`}>
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={`max-w-sm p-4 ${getBgColor()} border-2`}
        >
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start gap-2">
              {getIcon()}
              <div className="flex-1">
                <div className="font-semibold text-sm">{info.title}</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-700 leading-relaxed">
              {info.description}
            </p>

            {/* Example */}
            {info.example && (
              <div className="bg-white/50 p-2 rounded text-xs">
                <div className="font-medium text-gray-600 mb-1">Ejemplo:</div>
                <div className="text-gray-700">{info.example}</div>
              </div>
            )}

            {/* Reference */}
            {info.reference && (
              <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-2">
                📖 {info.reference}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente para badge con tooltip
interface BadgeWithTooltipProps {
  tooltipId: keyof typeof TOOLTIPS_PTA;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  className?: string;
}

export function BadgeWithTooltip({ tooltipId, children, variant = 'outline', className = '' }: BadgeWithTooltipProps) {
  return (
    <PTATooltip id={tooltipId}>
      <Badge variant={variant} className={`cursor-help ${className}`}>
        {children}
      </Badge>
    </PTATooltip>
  );
}

// Componente para texto con tooltip inline
interface TextWithTooltipProps {
  tooltipId: keyof typeof TOOLTIPS_PTA;
  children: React.ReactNode;
  className?: string;
}

export function TextWithTooltip({ tooltipId, children, className = '' }: TextWithTooltipProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
      <PTATooltip id={tooltipId} />
    </span>
  );
}
