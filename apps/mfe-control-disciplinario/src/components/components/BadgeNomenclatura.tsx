/**
 * ═══════════════════════════════════════════════════════════════════════
 * BADGE DE NOMENCLATURA - CONTROL INTERNO DISCIPLINARIO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Componente visual para mostrar la nomenclatura única de documentos
 * con diseño corporativo ESAP y diferenciación por tipo de documento
 */

import { Scale, FileText, Archive, FileSignature, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TipoDocumento } from '../utils/nomenclaturaDocumentos';

// ==================== INTERFACES ====================
interface BadgeNomenclaturaProps {
  nomenclatura: string;
  tipo: TipoDocumento;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showCopy?: boolean;
  className?: string;
}

// ==================== CONFIGURACIÓN VISUAL ====================
const CONFIGURACION_TIPOS: Record<TipoDocumento, {
  color: string;
  bgGradient: string;
  bgLight: string;
  borderColor: string;
  icon: any;
  label: string;
}> = {
  AUTO: {
    color: '#8B5CF6',
    bgGradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    bgLight: '#F5F3FF',
    borderColor: '#DDD6FE',
    icon: Scale,
    label: 'Auto'
  },
  OFICIO: {
    color: '#2563EB',
    bgGradient: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
    bgLight: '#EFF6FF',
    borderColor: '#BFDBFE',
    icon: FileText,
    label: 'Oficio'
  },
  EVIDENCIA: {
    color: '#10B981',
    bgGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    bgLight: '#F0FDF4',
    borderColor: '#BBF7D0',
    icon: Archive,
    label: 'Evidencia'
  },
  ACTA: {
    color: '#F59E0B',
    bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
    bgLight: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: FileSignature,
    label: 'Acta'
  }
};

const TAMAÑOS = {
  sm: {
    container: 'px-2 py-1 gap-1',
    text: 'text-xs',
    icon: 'w-3 h-3',
    copyButton: 'w-4 h-4'
  },
  md: {
    container: 'px-3 py-1.5 gap-1.5',
    text: 'text-sm',
    icon: 'w-4 h-4',
    copyButton: 'w-5 h-5'
  },
  lg: {
    container: 'px-4 py-2 gap-2',
    text: 'text-base',
    icon: 'w-5 h-5',
    copyButton: 'w-6 h-6'
  }
};

// ==================== COMPONENTE ====================
export function BadgeNomenclatura({
  nomenclatura,
  tipo,
  size = 'md',
  showIcon = true,
  showCopy = true,
  className = ''
}: BadgeNomenclaturaProps) {
  const [copiado, setCopiado] = useState(false);
  
  const config = CONFIGURACION_TIPOS[tipo];
  const tamaño = TAMAÑOS[size];
  const Icon = config.icon;

  const handleCopiar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(nomenclatura);
      setCopiado(true);
      
      toast.success('Nomenclatura Copiada', {
        description: nomenclatura,
        duration: 2000
      });

      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      toast.error('Error al copiar', {
        description: 'No se pudo copiar la nomenclatura'
      });
    }
  };

  return (
    <div
      className={`inline-flex items-center ${tamaño.container} rounded-lg font-bold border-2 transition-all hover:shadow-md ${className}`}
      style={{
        backgroundColor: config.bgLight,
        borderColor: config.borderColor,
        color: config.color
      }}
      title={`${config.label}: ${nomenclatura}`}
    >
      {/* Icono del tipo de documento */}
      {showIcon && (
        <Icon 
          className={tamaño.icon} 
          style={{ color: config.color }}
        />
      )}

      {/* Nomenclatura */}
      <span className={`${tamaño.text} font-mono tracking-tight`}>
        {nomenclatura}
      </span>

      {/* Botón de copiar */}
      {showCopy && (
        <button
          onClick={handleCopiar}
          className="ml-1 p-0.5 rounded hover:bg-white/50 transition-colors"
          title="Copiar nomenclatura"
        >
          {copiado ? (
            <Check className={tamaño.copyButton} style={{ color: config.color }} />
          ) : (
            <Copy className={tamaño.copyButton} style={{ color: config.color }} />
          )}
        </button>
      )}
    </div>
  );
}

// ==================== VARIANTE COMPACTA ====================
interface BadgeNomenclaturaCompactaProps {
  nomenclatura: string;
  tipo: TipoDocumento;
}

export function BadgeNomenclaturaCompacta({
  nomenclatura,
  tipo
}: BadgeNomenclaturaCompactaProps) {
  const config = CONFIGURACION_TIPOS[tipo];

  return (
    <div
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold"
      style={{
        background: config.bgGradient,
        color: 'white'
      }}
      title={nomenclatura}
    >
      {nomenclatura}
    </div>
  );
}

// ==================== VARIANTE CON TOOLTIP ====================
interface BadgeNomenclaturaTooltipProps {
  nomenclatura: string;
  tipo: TipoDocumento;
  metadata?: {
    procesoId?: string;
    numeroProceso?: string;
    fechaCreacion?: string;
    version?: number;
  };
}

export function BadgeNomenclaturaTooltip({
  nomenclatura,
  tipo,
  metadata
}: BadgeNomenclaturaTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = CONFIGURACION_TIPOS[tipo];
  const Icon = config.icon;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="inline-flex items-center px-3 py-1.5 gap-1.5 rounded-lg font-bold border-2 cursor-pointer transition-all hover:shadow-lg"
        style={{
          backgroundColor: config.bgLight,
          borderColor: config.borderColor,
          color: config.color
        }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-sm font-mono tracking-tight">{nomenclatura}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && metadata && (
        <div 
          className="absolute z-50 top-full left-0 mt-2 p-3 rounded-lg shadow-xl border-2 min-w-[250px] animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: 'white',
            borderColor: config.borderColor
          }}
        >
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: config.borderColor }}>
              <Icon className="w-4 h-4" style={{ color: config.color }} />
              <span className="font-bold" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>

            {metadata.numeroProceso && (
              <div>
                <span className="text-gray-500 font-medium">Proceso:</span>
                <span className="ml-2 font-mono text-gray-900">{metadata.numeroProceso}</span>
              </div>
            )}

            {metadata.fechaCreacion && (
              <div>
                <span className="text-gray-500 font-medium">Creado:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(metadata.fechaCreacion).toLocaleDateString('es-CO')}
                </span>
              </div>
            )}

            {metadata.version && (
              <div>
                <span className="text-gray-500 font-medium">Versión:</span>
                <span className="ml-2 text-gray-900">{metadata.version}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== VARIANTE EN LISTA ====================
interface BadgeNomenclaturaListaProps {
  nomenclaturas: Array<{
    nomenclatura: string;
    tipo: TipoDocumento;
    titulo?: string;
  }>;
  maxVisible?: number;
}

export function BadgeNomenclaturaLista({
  nomenclaturas,
  maxVisible = 3
}: BadgeNomenclaturaListaProps) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  
  const visible = mostrarTodos ? nomenclaturas : nomenclaturas.slice(0, maxVisible);
  const restantes = nomenclaturas.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visible.map((item, index) => (
        <BadgeNomenclatura
          key={index}
          nomenclatura={item.nomenclatura}
          tipo={item.tipo}
          size="sm"
          showIcon={true}
          showCopy={false}
        />
      ))}

      {!mostrarTodos && restantes > 0 && (
        <button
          onClick={() => setMostrarTodos(true)}
          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          +{restantes} más
        </button>
      )}

      {mostrarTodos && nomenclaturas.length > maxVisible && (
        <button
          onClick={() => setMostrarTodos(false)}
          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          Ver menos
        </button>
      )}
    </div>
  );
}
