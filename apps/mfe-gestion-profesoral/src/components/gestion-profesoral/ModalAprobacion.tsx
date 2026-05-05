/**
 * MODAL DE APROBACIÓN/RECHAZO - ESAP
 * 
 * Permite a los aprobadores (Coordinador, Director, Subdirector)
 * aprobar o rechazar un PTA con observaciones opcionales.
 */

import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

// ============================================================================
// TIPOS
// ============================================================================

export type AccionAprobacion = 'aprobar' | 'rechazar';

interface ModalAprobacionProps {
  isOpen: boolean;
  onClose: () => void;
  accion: AccionAprobacion;
  ptaInfo: {
    id: string;
    docenteNombre: string;
    periodoAcademico: string;
  };
  nivelAprobador: 1 | 2 | 3;
  onConfirmar: (observaciones: string) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ModalAprobacion({
  isOpen,
  onClose,
  accion,
  ptaInfo,
  nivelAprobador,
  onConfirmar
}: ModalAprobacionProps) {
  const [observaciones, setObservaciones] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  if (!isOpen) return null;

  const esAprobacion = accion === 'aprobar';
  const nivelLabel = {
    1: 'Coordinador de Programa',
    2: 'Director de Escuela',
    3: 'Subdirector Académico'
  }[nivelAprobador];

  const siguienteNivel = nivelAprobador < 3 ? nivelAprobador + 1 : null;
  const siguienteNivelLabel = siguienteNivel ? {
    2: 'Director de Escuela',
    3: 'Subdirector Académico'
  }[siguienteNivel as 2 | 3] : null;

  const handleConfirmar = () => {
    if (accion === 'rechazar' && observaciones.trim() === '') {
      alert('Debes proporcionar observaciones al rechazar un PTA');
      return;
    }

    onConfirmar(observaciones);
    handleClose();
  };

  const handleClose = () => {
    setObservaciones('');
    setConfirmado(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <ModalHeaderClean
          title={esAprobacion ? '✓ Aprobar Plan de Trabajo Académico' : '✗ Rechazar Plan de Trabajo Académico'}
          subtitle={`${ptaInfo.docenteNombre} • Período ${ptaInfo.periodoAcademico}`}
          onClose={handleClose}
        />

        <div className="p-6">
          {/* Información del Aprobador */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${esAprobacion ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                {esAprobacion ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {esAprobacion ? 'Aprobación' : 'Rechazo'} - Nivel {nivelAprobador}
                </h3>
                <p className="text-sm text-gray-600">{nivelLabel}</p>
              </div>
            </div>

            {esAprobacion && siguienteNivelLabel && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Siguiente paso:</span> El PTA será enviado a{' '}
                  <span className="font-semibold text-green-700">{siguienteNivelLabel}</span> para su aprobación.
                </p>
              </div>
            )}

            {esAprobacion && !siguienteNivelLabel && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">Este es el último nivel de aprobación.</span> El PTA quedará
                    completamente aprobado y el docente será notificado.
                  </p>
                </div>
              </div>
            )}

            {!esAprobacion && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    El PTA será devuelto al docente <span className="font-semibold">{ptaInfo.docenteNombre}</span> para
                    que realice los ajustes necesarios según tus observaciones.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Campo de Observaciones */}
          <div className="mb-6">
            <label className="block mb-2">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  Observaciones {!esAprobacion && <span className="text-red-600">*</span>}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {esAprobacion
                  ? 'Puedes agregar comentarios o recomendaciones (opcional)'
                  : 'Especifica los motivos del rechazo y qué ajustes debe realizar el docente'}
              </p>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={
                esAprobacion
                  ? 'Ejemplo: El plan está bien estructurado. Recomiendo dar prioridad a las actividades de investigación...'
                  : 'Ejemplo: El porcentaje de investigación (50%) es muy alto para tu tipo de vinculación. Se requiere mayor dedicación a docencia...'
              }
              rows={6}
              className={`w-full px-4 py-3 border ${
                !esAprobacion && observaciones.trim() === ''
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } rounded-lg resize-none`}
            />
            {!esAprobacion && (
              <p className="text-sm text-gray-500 mt-1">
                {observaciones.length}/500 caracteres
              </p>
            )}
          </div>

          {/* Checkbox de Confirmación */}
          <div className={`${esAprobacion ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 mb-6`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className={`mt-1 w-5 h-5 ${esAprobacion ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'} rounded`}
              />
              <div className="flex-1">
                <p className={`font-medium ${esAprobacion ? 'text-green-900' : 'text-red-900'}`}>
                  {esAprobacion
                    ? 'Confirmo que he revisado el PTA completo y apruebo su contenido'
                    : 'Confirmo que he revisado el PTA y rechazo su contenido por los motivos especificados'}
                </p>
                <p className={`text-sm ${esAprobacion ? 'text-green-700' : 'text-red-700'} mt-1`}>
                  Esta acción quedará registrada en el sistema con tu nombre, fecha y hora.
                </p>
              </div>
            </label>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!confirmado || (!esAprobacion && observaciones.trim() === '')}
              className={`px-6 py-2.5 ${
                esAprobacion
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="w-5 h-5" />
              {esAprobacion ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
