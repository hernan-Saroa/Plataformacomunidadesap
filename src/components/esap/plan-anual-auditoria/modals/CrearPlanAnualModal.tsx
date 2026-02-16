import React, { useState } from 'react';
import { ROLES_DECRETO_648_OFICIALES } from '../constants/rolesDecreto648Oficial';

interface CrearPlanAnualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (planData: NuevoPlanAnualData) => void;
}

export interface NuevoPlanAnualData {
  vigencia: number;
  version: string;
  fechaCreacion: string;
  estado: 'Borrador' | 'Enviado_Aprobacion' | 'Aprobado' | 'Rechazado';
  creadoPor: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  observaciones?: string;
}

export function CrearPlanAnualModal({ isOpen, onClose, onCrear }: CrearPlanAnualModalProps) {
  const [vigencia, setVigencia] = useState<number>(new Date().getFullYear());
  const [version, setVersion] = useState<string>('V.1.0');
  const [observaciones, setObservaciones] = useState<string>('');

  const handleCrear = () => {
    const nuevoPlan: NuevoPlanAnualData = {
      vigencia,
      version,
      fechaCreacion: new Date().toISOString(),
      estado: 'Borrador',
      creadoPor: 'Mario Oswaldo Bernal', // En producción viene del contexto de usuario
      observaciones
    };

    onCrear(nuevoPlan);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Crear Plan Anual OCIG</h2>
              <p className="text-white/80 text-base mt-1">Decreto 648/2017 - 5 Roles y 22 Actividades</p>
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
          {/* Información del Plan */}
          <div className="space-y-6">
            {/* Vigencia */}
            <div>
              <label className="block text-[#003DA5] font-semibold text-base mb-2">
                Vigencia *
              </label>
              <select
                value={vigencia}
                onChange={(e) => setVigencia(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-[#003DA5] focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">Año fiscal para el cual se crea el plan</p>
            </div>

            {/* Versión */}
            <div>
              <label className="block text-[#003DA5] font-semibold text-base mb-2">
                Versión *
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ej: V.1.0"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-[#003DA5] focus:outline-none"
              />
              <p className="text-sm text-gray-500 mt-1">Formato: V.X.Y (mayor.menor)</p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-[#003DA5] font-semibold text-base mb-2">
                Observaciones Iniciales
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Contexto o notas sobre la creación de este plan..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-[#003DA5] focus:outline-none resize-none"
              />
            </div>

            {/* Vista previa - Estructura del plan */}
            <div className="bg-[#E0EDFF] rounded-lg p-6 space-y-4">
              <h3 className="text-[#003DA5] font-bold text-lg">Vista Previa - Estructura del Plan</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-gray-700">Vigencia:</span>
                  <span className="font-bold text-[#003DA5]">{vigencia}</span>
                </div>
                
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-gray-700">Versión:</span>
                  <span className="font-bold text-[#003DA5]">{version}</span>
                </div>
                
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-gray-700">Estado Inicial:</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    📝 Borrador
                  </span>
                </div>

                <div className="border-t-2 border-white/50 pt-3 mt-3">
                  <p className="font-semibold text-gray-700 mb-2">Contenido del plan:</p>
                  <ul className="space-y-2">
                    {ROLES_DECRETO_648_OFICIALES.map(rol => (
                      <li key={rol.numero} className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{rol.icono}</span>
                        <span className="font-medium">{rol.nombre}</span>
                        <span className="text-gray-500">({rol.actividades.length} actividades)</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t-2 border-white/50 pt-3 mt-3">
                  <p className="text-sm text-gray-600">
                    <strong>Total:</strong> 5 Roles • 22 Actividades (Decreto 648/2017)
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso importante */}
            <div className="bg-[#FFF4E6] border-l-4 border-[#F57C00] p-4 rounded">
              <div className="flex gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-bold text-[#F57C00] text-base mb-1">Importante</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• El plan se creará en estado <strong>Borrador</strong></li>
                    <li>• Podrás editar todas las actividades antes de enviarlo a aprobación</li>
                    <li>• El Jefe de OCIG debe <strong>aprobar</strong> el plan antes de su ejecución</li>
                    <li>• Una vez aprobado, los cambios requerirán una nueva versión</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-100 px-8 py-5 bg-gray-50 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleCrear}
            disabled={!vigencia || !version.trim()}
            className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-[#003DA5] to-[#2962FF] rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Plan Anual
          </button>
        </div>
      </div>
    </div>
  );
}