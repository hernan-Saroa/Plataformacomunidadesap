/**
 * Modal Aprobación/Rechazo - Vista de Aprobadores
 * Confirmación de aprobación o rechazo con comentarios
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ThumbsUp,
  ThumbsDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText
} from 'lucide-react';

interface ModalAprobacionRechazoProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'aprobar' | 'rechazar';
  pta: {
    radicado: string;
    docenteNombre: string;
    horasAsignadas: number;
    horasBase: number;
  };
  onConfirmar: (comentario: string) => void;
}

export function ModalAprobacionRechazo({
  isOpen,
  onClose,
  tipo,
  pta,
  onConfirmar
}: ModalAprobacionRechazoProps) {
  const [comentario, setComentario] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exitoso, setExitoso] = useState(false);

  const handleConfirmar = async () => {
    if (tipo === 'rechazar' && !comentario.trim()) {
      return; // Requiere comentario para rechazar
    }

    setEnviando(true);
    
    // Simular envío
    setTimeout(() => {
      setEnviando(false);
      setExitoso(true);
      
      setTimeout(() => {
        onConfirmar(comentario);
        onClose();
        // Reset states
        setComentario('');
        setConfirmado(false);
        setExitoso(false);
      }, 2000);
    }, 1500);
  };

  if (!isOpen) return null;

  // Pantalla de éxito
  if (exitoso) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15
            }}
            className={`
              w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
              ${tipo === 'aprobar' ? 'bg-green-100' : 'bg-red-100'}
            `}
          >
            {tipo === 'aprobar' ? (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-red-600" />
            )}
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {tipo === 'aprobar' ? '¡PTA Aprobado!' : 'PTA Rechazado'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {tipo === 'aprobar'
              ? 'El docente recibirá una notificación de aprobación.'
              : 'El docente recibirá tus comentarios para realizar los ajustes.'
            }
          </p>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Radicado</div>
            <div className="font-mono font-bold text-gray-900">{pta.radicado}</div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`
          px-6 py-4 flex items-center justify-between text-white
          ${tipo === 'aprobar'
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-red-600 to-red-700'
          }
        `}>
          <div className="flex items-center gap-3">
            {tipo === 'aprobar' ? (
              <ThumbsUp className="w-6 h-6" />
            ) : (
              <ThumbsDown className="w-6 h-6" />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {tipo === 'aprobar' ? 'Aprobar PTA' : 'Rechazar PTA'}
              </h2>
              <p className="text-xs text-white/80">
                Confirma tu decisión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Información del PTA */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Información del PTA</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Radicado:</span>
                <span className="font-mono font-medium text-gray-900">{pta.radicado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Docente:</span>
                <span className="font-medium text-gray-900">{pta.docenteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Horas:</span>
                <span className="font-medium text-gray-900">
                  {pta.horasAsignadas}/{pta.horasBase}h
                </span>
              </div>
            </div>
          </div>

          {/* Mensaje de advertencia/confirmación */}
          {tipo === 'aprobar' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 mb-1">
                    Estás a punto de aprobar este PTA
                  </h4>
                  <p className="text-sm text-green-800">
                    Al aprobar, el PTA pasará al siguiente nivel de aprobación o quedará aprobado si eres el último aprobador.
                    El docente recibirá una notificación.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">
                    Estás a punto de rechazar este PTA
                  </h4>
                  <p className="text-sm text-red-800">
                    El PTA será devuelto al docente para realizar ajustes.
                    Debes especificar los motivos del rechazo para que el docente pueda corregir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campo de comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tipo === 'aprobar' ? 'Comentarios (opcional)' : 'Motivo del rechazo (requerido)'}
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={
                tipo === 'aprobar'
                  ? 'Agrega comentarios adicionales...'
                  : 'Especifica claramente qué debe corregir el docente...'
              }
              className={`
                w-full min-h-[120px] p-3 border-2 rounded-lg resize-none
                focus:outline-none transition-colors
                ${tipo === 'rechazar'
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-green-500'
                }
              `}
            />
            {tipo === 'rechazar' && !comentario.trim() && (
              <p className="text-sm text-red-600 mt-1">
                * El comentario es obligatorio para rechazar
              </p>
            )}
          </div>

          {/* Checkbox de confirmación */}
          <div className={`
            border-2 rounded-xl p-4
            ${tipo === 'aprobar' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
          `}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className={`
                  mt-1 w-5 h-5 border-2 rounded
                  ${tipo === 'aprobar'
                    ? 'text-green-600 border-green-400 focus:ring-green-500'
                    : 'text-red-600 border-red-400 focus:ring-red-500'
                  }
                `}
              />
              <div className="flex-1">
                <p className={`
                  font-medium
                  ${tipo === 'aprobar' ? 'text-green-900' : 'text-red-900'}
                `}>
                  {tipo === 'aprobar'
                    ? 'Confirmo que he revisado el PTA y lo apruebo'
                    : 'Confirmo que he revisado el PTA y lo rechazo'
                  }
                </p>
                <p className={`
                  text-sm mt-1
                  ${tipo === 'aprobar' ? 'text-green-800' : 'text-red-800'}
                `}>
                  {tipo === 'aprobar'
                    ? 'y cuento con la autoridad para aprobar este documento.'
                    : 'y los motivos especificados son claros y accionables.'
                  }
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={enviando}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmar}
            disabled={!confirmado || enviando || (tipo === 'rechazar' && !comentario.trim())}
            className={`
              px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2
              ${tipo === 'aprobar'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-300'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-300'
              }
              text-white disabled:cursor-not-allowed
            `}
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {tipo === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
