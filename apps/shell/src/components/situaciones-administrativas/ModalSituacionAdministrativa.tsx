/**
 * Modal para Crear/Editar Situación Administrativa - ESAP PTA
 * Implementa REQ-MOD-PTA-004 punto 6
 */

import React, { useState, useEffect } from 'react';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { AlertCircle, FileText, X } from 'lucide-react';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';
import {
  TipoSituacionAdministrativa,
  ImpactoDisponibilidad,
  LABELS_TIPO_SITUACION,
} from '../../types/situacionesAdministrativas';
import { situacionesAdministrativasService } from '../../services/situacionesAdministrativasService';
import { toast } from 'sonner';

interface ModalSituacionAdministrativaProps {
  docenteId: string;
  docenteNombre: string;
  docenteEmail: string;
  territorialId: string;
  territorialNombre: string;
  usuarioActual: {
    id: string;
    nombre: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export const ModalSituacionAdministrativa: React.FC<ModalSituacionAdministrativaProps> = ({
  docenteId,
  docenteNombre,
  docenteEmail,
  territorialId,
  territorialNombre,
  usuarioActual,
  onClose,
  onSuccess,
}) => {
  const [tipo, setTipo] = useState<TipoSituacionAdministrativa>('COMISION_ESTUDIOS');
  const [descripcion, setDescripcion] = useState('');
  const [motivoDetallado, setMotivoDetallado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [impactoDisponibilidad, setImpactoDisponibilidad] =
    useState<ImpactoDisponibilidad>('PARCIAL');
  const [porcentajeDisponibilidad, setPorcentajeDisponibilidad] = useState(50);
  const [afectaDocencia, setAfectaDocencia] = useState(true);
  const [afectaInvestigacion, setAfectaInvestigacion] = useState(false);
  const [afectaExtension, setAfectaExtension] = useState(false);
  const [afectaAdministrativo, setAfectaAdministrativo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Ajustar automáticamente el porcentaje según el impacto
  useEffect(() => {
    if (impactoDisponibilidad === 'TOTAL') {
      setPorcentajeDisponibilidad(0);
    } else if (impactoDisponibilidad === 'NINGUNO') {
      setPorcentajeDisponibilidad(100);
    } else {
      setPorcentajeDisponibilidad(50);
    }
  }, [impactoDisponibilidad]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validaciones
    if (!tipo || !descripcion || !fechaInicio || !fechaFin) {
      setErrorMsg('Todos los campos obligatorios deben estar completos');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin <= inicio) {
      setErrorMsg('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    if (!afectaDocencia && !afectaInvestigacion && !afectaExtension && !afectaAdministrativo) {
      setErrorMsg('Debe seleccionar al menos un componente afectado');
      return;
    }

    setIsLoading(true);

    try {
      situacionesAdministrativasService.crearSituacion(
        docenteId,
        docenteNombre,
        docenteEmail,
        territorialId,
        territorialNombre,
        tipo,
        descripcion,
        inicio,
        fin,
        impactoDisponibilidad,
        porcentajeDisponibilidad,
        afectaDocencia,
        afectaInvestigacion,
        afectaExtension,
        afectaAdministrativo,
        usuarioActual.nombre,
        motivoDetallado || undefined
      );

      toast.success('Situación administrativa creada exitosamente', {
        description: 'Se han generado las alertas correspondientes',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      setErrorMsg('Error al crear la situación administrativa');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeaderClean
          title="Nueva Situación Administrativa"
          subtitle={`Registrar situación para ${docenteNombre}`}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Información del Docente */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Docente:</span>
                  <p className="text-slate-900">{docenteNombre}</p>
                </div>
                <div>
                  <span className="text-slate-600">Territorial:</span>
                  <p className="text-slate-900">{territorialNombre}</p>
                </div>
              </div>
            </div>

            {/* Tipo de Situación */}
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Tipo de Situación <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSituacionAdministrativa)}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                required
              >
                {Object.entries(LABELS_TIPO_SITUACION).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción Breve */}
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Descripción Breve <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Comisión de estudios para Maestría en España"
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                required
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">{descripcion.length}/200 caracteres</p>
            </div>

            {/* Motivo Detallado */}
            <div>
              <label className="block text-sm text-slate-700 mb-2">Motivo Detallado</label>
              <textarea
                value={motivoDetallado}
                onChange={(e) => setMotivoDetallado(e.target.value)}
                placeholder="Describa el motivo completo de la situación administrativa..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors resize-none"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 mt-1">{motivoDetallado.length}/500 caracteres</p>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-2">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">
                  Fecha de Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Impacto en Disponibilidad */}
            <div>
              <label className="block text-sm text-slate-700 mb-3">
                Impacto en Disponibilidad <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setImpactoDisponibilidad('NINGUNO')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    impactoDisponibilidad === 'NINGUNO'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-slate-900 mb-1">Ninguno</div>
                  <div className="text-xs text-slate-600">100% disponible</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImpactoDisponibilidad('PARCIAL')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    impactoDisponibilidad === 'PARCIAL'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-slate-900 mb-1">Parcial</div>
                  <div className="text-xs text-slate-600">Disponibilidad reducida</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImpactoDisponibilidad('TOTAL')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    impactoDisponibilidad === 'TOTAL'
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-slate-900 mb-1">Total</div>
                  <div className="text-xs text-slate-600">0% disponible</div>
                </button>
              </div>

              {/* Slider de Porcentaje (solo visible si es PARCIAL) */}
              {impactoDisponibilidad === 'PARCIAL' && (
                <div className="mt-4">
                  <label className="block text-sm text-slate-700 mb-2">
                    Porcentaje de Disponibilidad: {porcentajeDisponibilidad}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={porcentajeDisponibilidad}
                    onChange={(e) => setPorcentajeDisponibilidad(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Componentes Afectados */}
            <div>
              <label className="block text-sm text-slate-700 mb-3">
                Componentes del PTA Afectados <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={afectaDocencia}
                    onChange={(e) => setAfectaDocencia(e.target.checked)}
                    className="w-5 h-5 text-[#2962FF] rounded"
                  />
                  <span className="text-slate-900">Docencia</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={afectaInvestigacion}
                    onChange={(e) => setAfectaInvestigacion(e.target.checked)}
                    className="w-5 h-5 text-[#2962FF] rounded"
                  />
                  <span className="text-slate-900">Investigación</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={afectaExtension}
                    onChange={(e) => setAfectaExtension(e.target.checked)}
                    className="w-5 h-5 text-[#2962FF] rounded"
                  />
                  <span className="text-slate-900">Extensión</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={afectaAdministrativo}
                    onChange={(e) => setAfectaAdministrativo(e.target.checked)}
                    className="w-5 h-5 text-[#2962FF] rounded"
                  />
                  <span className="text-slate-900">Complementarias (incl. Académico-Administrativas)</span>
                </label>
              </div>
            </div>

            {/* Alerta Informativa */}
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="mb-2">
                    <strong>Importante:</strong> Al registrar esta situación:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    <li>Se generarán alertas automáticas para coordinadores y directores</li>
                    <li>
                      Se notificará a Talento Humano para actualización en el sistema de nómina
                    </li>
                    <li>Se afectará la disponibilidad del docente para asignación de PTA</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm text-red-900">{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end mt-6 pt-6 border-t-2 border-slate-100">
            <ButtonSIGL variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Situación'}
            </ButtonSIGL>
          </div>
        </form>
      </div>
    </div>
  );
};
