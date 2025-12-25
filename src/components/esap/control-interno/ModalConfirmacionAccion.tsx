/**
 * ==============================================
 * MODAL DE CONFIRMACIÓN DE ACCIONES
 * ==============================================
 * 
 * Modal genérico de confirmación para acciones críticas
 * - Archivar auditorías
 * - Eliminar auditorías
 * - Confirmación con comentario opcional/obligatorio
 * - Diseño visual según tipo de acción
 */

import { useState } from 'react';
import { X, Archive, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
  territorial: string;
}

type TipoAccion = 'archivar' | 'eliminar';

interface ModalConfirmacionAccionProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
  tipoAccion: TipoAccion;
  onConfirmar: (auditoriaId: string, comentario?: string) => void;
}

const CONFIGURACION_ACCIONES = {
  archivar: {
    titulo: 'Archivar Auditoría',
    icono: Archive,
    colorPrincipal: '#F97316',
    colorFondo: '#FFF7ED',
    colorBorde: '#FB923C',
    descripcion: 'La auditoría se moverá al archivo histórico y ya no será visible en los tableros activos.',
    advertencia: 'Esta acción puede revertirse posteriormente desde el archivo histórico.',
    pregunta: '¿Está seguro de archivar esta auditoría?',
    requiereComentario: false,
    textoCancelar: 'No, mantener activa',
    textoConfirmar: 'Sí, archivar',
    iconoBoton: Archive
  },
  eliminar: {
    titulo: 'Eliminar Auditoría',
    icono: Trash2,
    colorPrincipal: '#DC2626',
    colorFondo: '#FEF2F2',
    colorBorde: '#EF4444',
    descripcion: 'La auditoría y todos sus datos asociados serán eliminados permanentemente del sistema.',
    advertencia: '⚠️ ADVERTENCIA: Esta acción NO se puede deshacer. Se perderán todos los documentos, notas, historial y evidencias.',
    pregunta: '¿Está completamente seguro de eliminar esta auditoría?',
    requiereComentario: true,
    textoCancelar: 'No, cancelar',
    textoConfirmar: 'Sí, eliminar permanentemente',
    iconoBoton: Trash2
  }
};

export function ModalConfirmacionAccion({
  isOpen,
  onClose,
  auditoria,
  tipoAccion,
  onConfirmar
}: ModalConfirmacionAccionProps) {
  const [comentario, setComentario] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  if (!isOpen || !auditoria) return null;

  const config = CONFIGURACION_ACCIONES[tipoAccion];
  const IconoAccion = config.icono;
  const IconoBoton = config.iconoBoton;

  const requiereConfirmacionTexto = tipoAccion === 'eliminar';
  const textoConfirmacionRequerido = 'ELIMINAR';

  const handleConfirmar = () => {
    // Validaciones
    if (config.requiereComentario && !comentario.trim()) {
      toast.error('Error de validación', {
        description: 'Debe ingresar un comentario explicando el motivo de la acción'
      });
      return;
    }

    if (requiereConfirmacionTexto && confirmacionTexto !== textoConfirmacionRequerido) {
      toast.error('Error de validación', {
        description: `Debe escribir "${textoConfirmacionRequerido}" para confirmar la eliminación`
      });
      return;
    }

    onConfirmar(auditoria.id, comentario.trim() || undefined);
    handleCerrar();
  };

  const handleCerrar = () => {
    setComentario('');
    setConfirmacionTexto('');
    onClose();
  };

  const puedeConfirmar = requiereConfirmacionTexto 
    ? confirmacionTexto === textoConfirmacionRequerido && (!config.requiereComentario || comentario.trim().length > 0)
    : !config.requiereComentario || comentario.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[111] p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div 
          className="p-6 border-b"
          style={{ 
            backgroundColor: config.colorFondo,
            borderBottomColor: config.colorBorde
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: config.colorPrincipal + '20' }}
              >
                <IconoAccion 
                  className="w-6 h-6" 
                  style={{ color: config.colorPrincipal }}
                />
              </div>
              <div>
                <h2 
                  className="text-xl font-black"
                  style={{ color: config.colorPrincipal }}
                >
                  {config.titulo}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {config.pregunta}
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Información de la auditoría */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Auditoría afectada:
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Código:</span> {auditoria.codigo}
                  </p>
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-semibold">Título:</span> {auditoria.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {auditoria.estado}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {auditoria.territorial}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción y advertencia */}
          <div className="space-y-3">
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: config.colorFondo,
                borderColor: config.colorBorde
              }}
            >
              <p className="text-sm text-gray-700">
                {config.descripcion}
              </p>
            </div>

            <div 
              className={`p-4 rounded-lg border-2 ${
                tipoAccion === 'eliminar' 
                  ? 'bg-red-50 border-red-300' 
                  : 'bg-yellow-50 border-yellow-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle 
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    tipoAccion === 'eliminar' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                />
                <p className={`text-sm font-semibold ${
                  tipoAccion === 'eliminar' ? 'text-red-900' : 'text-yellow-900'
                }`}>
                  {config.advertencia}
                </p>
              </div>
            </div>
          </div>

          {/* Comentario (si es requerido u opcional) */}
          {(config.requiereComentario || tipoAccion === 'archivar') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Comentario {config.requiereComentario ? '(Obligatorio)' : '(Opcional)'}
                </label>
                {config.requiereComentario && (
                  <span className="text-xs text-red-600">*</span>
                )}
              </div>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={`Explique el motivo de ${tipoAccion === 'archivar' ? 'archivar' : 'eliminar'} esta auditoría...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-gray-500">
                {comentario.length}/300 caracteres
              </p>
            </div>
          )}

          {/* Confirmación por texto (solo para eliminar) */}
          {requiereConfirmacionTexto && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Confirmación de eliminación
                </label>
                <span className="text-xs text-red-600">* Obligatorio</span>
              </div>
              <p className="text-sm text-gray-600">
                Para confirmar la eliminación permanente, escriba{' '}
                <code className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono font-bold">
                  {textoConfirmacionRequerido}
                </code>
                {' '}en el campo de abajo:
              </p>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value.toUpperCase())}
                placeholder="Escriba ELIMINAR para confirmar"
                className={`
                  w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm font-mono
                  ${confirmacionTexto === textoConfirmacionRequerido 
                    ? 'border-green-500 bg-green-50 focus:ring-green-500' 
                    : 'border-red-300 focus:ring-red-500'
                  }
                `}
              />
              {confirmacionTexto && confirmacionTexto !== textoConfirmacionRequerido && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  El texto no coincide. Debe escribir exactamente "{textoConfirmacionRequerido}"
                </p>
              )}
              {confirmacionTexto === textoConfirmacionRequerido && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Confirmación correcta
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCerrar}
            >
              {config.textoCancelar}
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!puedeConfirmar}
              style={{ 
                backgroundColor: puedeConfirmar ? config.colorPrincipal : '#D1D5DB',
                color: '#FFFFFF'
              }}
            >
              <IconoBoton className="w-4 h-4 mr-2" />
              {config.textoConfirmar}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}