/**
 * ============================================
 * MODAL CAMBIAR ESTADO AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Modal para cambiar el estado de una auditoría con workflow
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { ArrowRight, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type EstadoAuditoria = 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento' | 'Finalizada';

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: EstadoAuditoria;
}

interface ModalCambiarEstadoAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  onCambiarEstado: (nuevoEstado: EstadoAuditoria, justificacion: string) => void;
}

// ============ ESTADOS DISPONIBLES ============

const ESTADOS: { id: EstadoAuditoria; nombre: string; descripcion: string; icono: React.ReactNode; color: string }[] = [
  {
    id: 'Planeación',
    nombre: 'Planeación',
    descripcion: 'Definición de alcance, objetivos y metodología',
    icono: <FileText className="w-5 h-5" />,
    color: 'bg-purple-500'
  },
  {
    id: 'Ejecución',
    nombre: 'Ejecución',
    descripcion: 'Trabajo de campo y recolección de evidencias',
    icono: <Clock className="w-5 h-5" />,
    color: 'bg-blue-500'
  },
  {
    id: 'Comunicación',
    nombre: 'Comunicación',
    descripcion: 'Elaboración y presentación de informe',
    icono: <FileText className="w-5 h-5" />,
    color: 'bg-orange-500'
  },
  {
    id: 'Seguimiento',
    nombre: 'Seguimiento',
    descripcion: 'Monitoreo de acciones correctivas',
    icono: <AlertCircle className="w-5 h-5" />,
    color: 'bg-amber-500'
  },
  {
    id: 'Finalizada',
    nombre: 'Finalizada',
    descripcion: 'Auditoría completada y cerrada',
    icono: <CheckCircle className="w-5 h-5" />,
    color: 'bg-green-500'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalCambiarEstadoAuditoriaWorldClass({
  isOpen,
  onClose,
  auditoria,
  onCambiarEstado
}: ModalCambiarEstadoAuditoriaProps) {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoAuditoria | null>(null);
  const [justificacion, setJustificacion] = useState('');

  if (!auditoria) return null;

  const estadoActual = ESTADOS.find(e => e.id === auditoria.estado);
  const estadoNuevo = ESTADOS.find(e => e.id === nuevoEstado);

  // Badges dinámicos
  const badges = [
    {
      label: `Estado actual: ${auditoria.estado}`,
      variant: 'info' as const
    }
  ];

  const handleCambiar = () => {
    if (!nuevoEstado) {
      toast.error('Debes seleccionar un nuevo estado');
      return;
    }

    if (nuevoEstado === auditoria.estado) {
      toast.error('El nuevo estado debe ser diferente al actual');
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Debes proporcionar una justificación');
      return;
    }

    onCambiarEstado(nuevoEstado, justificacion);
    toast.success('Estado actualizado correctamente', {
      description: `La auditoría pasó de ${auditoria.estado} a ${nuevoEstado}`
    });
    onClose();
    setNuevoEstado(null);
    setJustificacion('');
  };

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo="Cambiar Estado de Auditoría"
      codigo={auditoria.codigo}
      icono={<ArrowRight className="w-6 h-6" />}
      badges={badges}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCambiar}
            disabled={!nuevoEstado || !justificacion.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Cambiar Estado
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Flujo de estados */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            Cambio de Estado
          </h3>
          
          <div className="flex items-center justify-center gap-4">
            {/* Estado actual */}
            {estadoActual && (
              <div className="flex items-center gap-2">
                <div className={`p-3 ${estadoActual.color} text-white rounded-lg`}>
                  {estadoActual.icono}
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Estado Actual</p>
                  <p className="text-sm text-gray-900 font-medium">{estadoActual.nombre}</p>
                </div>
              </div>
            )}

            {/* Flecha */}
            <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

            {/* Nuevo estado */}
            {estadoNuevo ? (
              <div className="flex items-center gap-2">
                <div className={`p-3 ${estadoNuevo.color} text-white rounded-lg`}>
                  {estadoNuevo.icono}
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Nuevo Estado</p>
                  <p className="text-sm text-gray-900 font-medium">{estadoNuevo.nombre}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <div className="p-3 bg-gray-300 text-white rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Nuevo Estado</p>
                  <p className="text-sm text-gray-900 font-medium">Selecciona abajo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selección de nuevo estado */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Selecciona el Nuevo Estado
          </label>
          <div className="space-y-2">
            {ESTADOS.map((estado) => (
              <button
                key={estado.id}
                onClick={() => setNuevoEstado(estado.id)}
                disabled={estado.id === auditoria.estado}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${nuevoEstado === estado.id
                    ? 'border-blue-500 bg-blue-50'
                    : estado.id === auditoria.estado
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${estado.color} text-white rounded-lg`}>
                    {estado.icono}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {estado.nombre}
                      </p>
                      {estado.id === auditoria.estado && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {estado.descripcion}
                    </p>
                  </div>
                  {nuevoEstado === estado.id && (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Justificación */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Justificación del Cambio <span className="text-red-500">*</span>
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explica el motivo del cambio de estado..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            Esta justificación quedará registrada en el historial de la auditoría
          </p>
        </div>
      </div>
    </ModalWorldClass>
  );
}
