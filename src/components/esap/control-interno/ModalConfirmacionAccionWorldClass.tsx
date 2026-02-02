/**
 * ============================================
 * MODAL CONFIRMACIÓN ACCIÓN - WORLD CLASS
 * ============================================
 * 
 * Modal genérico de confirmación para acciones críticas
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { AlertTriangle, Trash2, Archive, CheckCircle, XCircle } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';

// ============ TIPOS ============

type TipoAccion = 'eliminar' | 'archivar' | 'aprobar' | 'rechazar' | 'custom';

interface ModalConfirmacionAccionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  tipo?: TipoAccion;
  titulo?: string;
  mensaje?: string;
  descripcion?: string; // Agregado - línea adicional debajo del mensaje
  textoConfirmar?: string;
  textoCancelar?: string;
  itemAfectado?: string;
  peligroso?: boolean;
}

// ============ CONFIGURACIONES POR TIPO ============

const CONFIGURACIONES: Record<TipoAccion, {
  titulo: string;
  icono: React.ReactNode;
  color: string;
  textoConfirmar: string;
  variant: 'danger' | 'warning' | 'primary' | 'success';
}> = {
  eliminar: {
    titulo: 'Confirmar Eliminación',
    icono: <Trash2 className="w-6 h-6" />,
    color: 'from-red-600 to-red-700',
    textoConfirmar: 'Eliminar',
    variant: 'danger'
  },
  archivar: {
    titulo: 'Confirmar Archivado',
    icono: <Archive className="w-6 h-6" />,
    color: 'from-orange-600 to-orange-700',
    textoConfirmar: 'Archivar',
    variant: 'warning'
  },
  aprobar: {
    titulo: 'Confirmar Aprobación',
    icono: <CheckCircle className="w-6 h-6" />,
    color: 'from-green-600 to-green-700',
    textoConfirmar: 'Aprobar',
    variant: 'success'
  },
  rechazar: {
    titulo: 'Confirmar Rechazo',
    icono: <XCircle className="w-6 h-6" />,
    color: 'from-red-600 to-red-700',
    textoConfirmar: 'Rechazar',
    variant: 'danger'
  },
  custom: {
    titulo: 'Confirmar Acción',
    icono: <AlertTriangle className="w-6 h-6" />,
    color: 'from-blue-600 to-blue-700',
    textoConfirmar: 'Confirmar',
    variant: 'primary'
  }
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalConfirmacionAccionWorldClass({
  isOpen,
  onClose,
  onConfirmar,
  tipo = 'custom',
  titulo,
  mensaje,
  descripcion, // Agregado - línea adicional debajo del mensaje
  textoConfirmar,
  textoCancelar = 'Cancelar',
  itemAfectado,
  peligroso = false
}: ModalConfirmacionAccionProps) {
  
  // Validación defensiva: asegurar que el tipo existe en configuraciones
  const tipoValido: TipoAccion = CONFIGURACIONES[tipo] ? tipo : 'custom';
  const config = CONFIGURACIONES[tipoValido];
  
  const tituloFinal = titulo || config.titulo;
  const textoConfirmarFinal = textoConfirmar || config.textoConfirmar;
  const esPeligroso = peligroso || tipo === 'eliminar' || tipo === 'rechazar';

  // Mensaje predeterminado según tipo
  const getMensajePredeterminado = () => {
    switch (tipo) {
      case 'eliminar':
        return `¿Estás seguro de que deseas eliminar ${itemAfectado || 'este elemento'}? Esta acción no se puede deshacer.`;
      case 'archivar':
        return `¿Deseas archivar ${itemAfectado || 'este elemento'}? Podrás restaurarlo más tarde desde el archivo.`;
      case 'aprobar':
        return `¿Confirmas que deseas aprobar ${itemAfectado || 'este elemento'}?`;
      case 'rechazar':
        return `¿Estás seguro de que deseas rechazar ${itemAfectado || 'este elemento'}?`;
      default:
        return mensaje || '¿Deseas confirmar esta acción?';
    }
  };

  const mensajeFinal = mensaje || getMensajePredeterminado();

  // Badges según peligrosidad
  const badges = esPeligroso
    ? [{ label: 'Acción irreversible', icon: <AlertTriangle className="w-3.5 h-3.5" />, variant: config.variant }]
    : [];

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo={tituloFinal}
      icono={config.icono}
      badges={badges}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {textoCancelar}
          </button>
          <button
            onClick={() => {
              onConfirmar();
              onClose();
            }}
            className={`
              px-6 py-2 bg-gradient-to-r ${config.color} text-white rounded-lg 
              hover:shadow-lg transition-all flex items-center gap-2
            `}
          >
            {config.icono}
            {textoConfirmarFinal}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Mensaje principal */}
        <div className={`
          p-4 rounded-lg border-2
          ${esPeligroso 
            ? 'bg-red-50 border-red-200' 
            : 'bg-blue-50 border-blue-200'
          }
        `}>
          <p className="text-sm text-gray-700 leading-relaxed">
            {mensajeFinal}
          </p>
        </div>

        {/* Descripción adicional (si se proporciona) */}
        {descripcion && (
          <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {descripcion}
            </p>
          </div>
        )}

        {/* Item afectado (si se proporciona) */}
        {itemAfectado && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium mb-1">
              Elemento afectado:
            </p>
            <p className="text-sm text-gray-900 font-medium">
              {itemAfectado}
            </p>
          </div>
        )}

        {/* Advertencia adicional si es peligroso */}
        {esPeligroso && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-900 font-medium">
                Ten en cuenta:
              </p>
              <ul className="text-xs text-amber-800 mt-2 space-y-1 list-disc list-inside">
                <li>Esta acción no se puede deshacer</li>
                <li>Los datos eliminados no podrán recuperarse</li>
                <li>Verifica que sea la acción correcta antes de continuar</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </ModalWorldClass>
  );
}

// ============ EXPORTS ADICIONALES (Hooks de ayuda) ============

/**
 * Hook para manejar confirmaciones fácilmente
 */
import { useState } from 'react';

export function useConfirmacion() {
  const [isOpen, setIsOpen] = useState(false);
  const [callback, setCallback] = useState<(() => void) | null>(null);

  const confirmar = (accion: () => void) => {
    setCallback(() => accion);
    setIsOpen(true);
  };

  const handleConfirmar = () => {
    if (callback) {
      callback();
    }
    setIsOpen(false);
    setCallback(null);
  };

  const handleCancelar = () => {
    setIsOpen(false);
    setCallback(null);
  };

  return {
    isOpen,
    confirmar,
    handleConfirmar,
    handleCancelar
  };
}

// ============ EJEMPLO DE USO ============

/*
// En tu componente:
import { useConfirmacion, ModalConfirmacionAccionWorldClass } from './ModalConfirmacionAccionWorldClass';

function MiComponente() {
  const confirmacion = useConfirmacion();

  const eliminarAuditoria = (id: string) => {
    confirmacion.confirmar(() => {
      // Lógica de eliminación
      console.log('Eliminando', id);
    });
  };

  return (
    <>
      <button onClick={() => eliminarAuditoria('aud-123')}>
        Eliminar
      </button>

      <ModalConfirmacionAccionWorldClass
        isOpen={confirmacion.isOpen}
        onClose={confirmacion.handleCancelar}
        onConfirmar={confirmacion.handleConfirmar}
        tipo="eliminar"
        itemAfectado="Auditoría AUD-2025-001"
      />
    </>
  );
}
*/