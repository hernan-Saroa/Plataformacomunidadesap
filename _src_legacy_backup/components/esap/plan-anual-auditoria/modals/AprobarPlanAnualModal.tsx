import React, { useState } from 'react';

interface AprobarPlanAnualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAprobar: (decision: 'Aprobado' | 'Rechazado', observaciones: string) => void;
  planInfo: {
    vigencia: number;
    version: string;
    creadoPor: string;
    fechaCreacion: string;
  };
}

export function AprobarPlanAnualModal({ isOpen, onClose, onAprobar, planInfo }: AprobarPlanAnualModalProps) {
  const [observaciones, setObservaciones] = useState<string>('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState<'Aprobado' | 'Rechazado' | null>(null);

  const handleDecision = (decision: 'Aprobado' | 'Rechazado') => {
    setMostrarConfirmacion(decision);
  };

  const confirmarDecision = () => {
    if (mostrarConfirmacion) {
      onAprobar(mostrarConfirmacion, observaciones);
      onClose();
      setMostrarConfirmacion(null);
      setObservaciones('');
    }
  };

  const cancelarConfirmacion = () => {
    setMostrarConfirmacion(null);
  };

  if (!isOpen) return null;

  if (mostrarConfirmacion) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
          <div className={`px-8 py-6 ${mostrarConfirmacion === 'Aprobado' ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
            <h2 className="text-2xl font-bold text-white">
              {mostrarConfirmacion === 'Aprobado' ? '✅ Confirmar Aprobación' : '❌ Confirmar Rechazo'}
            </h2>
          </div>

          <div className="px-8 py-6 space-y-4">
            <p className="text-base text-gray-700">
              {mostrarConfirmacion === 'Aprobado' 
                ? '¿Está seguro de aprobar el Plan Anual OCI? Esta acción permitirá su ejecución inmediata.'
                : '¿Está seguro de rechazar el Plan Anual OCI? El plan volverá a estado Borrador para correcciones.'
              }
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Vigencia:</span>
                <span className="font-bold text-[#003DA5]">{planInfo.vigencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Versión:</span>
                <span className="font-bold text-[#003DA5]">{planInfo.version}</span>
              </div>
              {observaciones && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-600">Observaciones:</span>
                  <p className="text-gray-700 mt-1">{observaciones}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t-2 border-gray-100 px-8 py-5 bg-gray-50 flex items-center justify-end gap-4">
            <button
              onClick={cancelarConfirmacion}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDecision}
              className={`px-8 py-3 text-base font-semibold text-white rounded-lg hover:shadow-lg transition-all ${
                mostrarConfirmacion === 'Aprobado'
                  ? 'bg-gradient-to-r from-green-600 to-green-500'
                  : 'bg-gradient-to-r from-red-600 to-red-500'
              }`}
            >
              {mostrarConfirmacion === 'Aprobado' ? 'Sí, Aprobar' : 'Sí, Rechazar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Aprobar Plan Anual OCI</h2>
              <p className="text-white/80 text-base mt-1">Revisión y decisión del Jefe de OCI</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors text-2xl font-light leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {/* Información del Plan */}
            <div className="bg-[#E0EDFF] rounded-lg p-6 space-y-3">
              <h3 className="text-[#003DA5] font-bold text-lg mb-4">Información del Plan</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Vigencia</p>
                  <p className="text-2xl font-bold text-[#003DA5]">{planInfo.vigencia}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Versión</p>
                  <p className="text-2xl font-bold text-[#003DA5]">{planInfo.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Creado Por</p>
                  <p className="text-base font-medium text-gray-800">{planInfo.creadoPor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Fecha Creación</p>
                  <p className="text-base font-medium text-gray-800">
                    {new Date(planInfo.fechaCreacion).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Estadísticas del Plan */}
            <div className="bg-white border-2 border-[#E0EDFF] rounded-lg p-6">
              <h3 className="text-[#003DA5] font-bold text-lg mb-4">Contenido del Plan</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#E0EDFF] rounded-lg p-4">
                  <p className="text-4xl font-bold text-[#003DA5]">5</p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">Roles Obligatorios</p>
                </div>
                <div className="bg-[#E0EDFF] rounded-lg p-4">
                  <p className="text-4xl font-bold text-[#003DA5]">22</p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">Actividades Fijas</p>
                </div>
                <div className="bg-[#E0EDFF] rounded-lg p-4">
                  <p className="text-4xl font-bold text-[#003DA5]">100%</p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">Decreto 648/2017</p>
                </div>
              </div>
            </div>

            {/* Observaciones de la Aprobación/Rechazo */}
            <div>
              <label className="block text-[#003DA5] font-semibold text-base mb-2">
                Observaciones *
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ingrese sus observaciones sobre la decisión de aprobación o rechazo..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-[#003DA5] focus:outline-none resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">Requerido para aprobación o rechazo</p>
            </div>

            {/* Aviso de Responsabilidad */}
            <div className="bg-[#FFF4E6] border-l-4 border-[#F57C00] p-4 rounded">
              <div className="flex gap-3">
                <span className="text-2xl">📋</span>
                <div className="flex-1">
                  <h4 className="font-bold text-[#F57C00] text-base mb-1">Responsabilidad del Jefe OCI</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Aprobar:</strong> El plan queda vigente y en ejecución inmediata</li>
                    <li>• <strong>Rechazar:</strong> El plan vuelve a Borrador para correcciones</li>
                    <li>• La decisión quedará registrada con fecha y hora exacta</li>
                    <li>• Las observaciones son obligatorias y quedan en el historial</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Botones de Decisión */}
        <div className="border-t-2 border-gray-100 px-8 py-5 bg-gray-50 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision('Rechazado')}
              disabled={!observaciones.trim()}
              className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ❌ Rechazar Plan
            </button>
            
            <button
              onClick={() => handleDecision('Aprobado')}
              disabled={!observaciones.trim()}
              className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Aprobar Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
