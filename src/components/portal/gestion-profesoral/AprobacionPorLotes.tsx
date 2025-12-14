/**
 * Aprobación Por Lotes - Vista de Aprobadores
 * Permite aprobar múltiples PTAs simultáneamente
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Square,
  ThumbsUp,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface PTASeleccionable {
  id: string;
  radicado: string;
  docenteNombre: string;
  horasAsignadas: number;
  horasBase: number;
}

interface AprobacionPorLotesProps {
  isOpen: boolean;
  onClose: () => void;
  ptas: PTASeleccionable[];
  onAprobar: (ptaIds: string[], comentario: string) => void;
}

export function AprobacionPorLotes({
  isOpen,
  onClose,
  ptas,
  onAprobar
}: AprobacionPorLotesProps) {
  const [ptasSeleccionados, setPtasSeleccionados] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [exitoso, setExitoso] = useState(false);

  const togglePTA = (id: string) => {
    setPtasSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(ptaId => ptaId !== id)
        : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (ptasSeleccionados.length === ptas.length) {
      setPtasSeleccionados([]);
    } else {
      setPtasSeleccionados(ptas.map(p => p.id));
    }
  };

  const handleAprobar = async () => {
    setProcesando(true);
    
    // Simular procesamiento
    setTimeout(() => {
      setProcesando(false);
      setExitoso(true);
      
      setTimeout(() => {
        onAprobar(ptasSeleccionados, comentario);
        onClose();
        // Reset
        setPtasSeleccionados([]);
        setComentario('');
        setConfirmado(false);
        setExitoso(false);
      }, 2000);
    }, 2000);
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
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡{ptasSeleccionados.length} PTAs Aprobados!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Los docentes recibirán notificaciones de aprobación.
          </p>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-900">
              Procesados exitosamente
            </div>
            <div className="text-2xl font-bold text-green-600">
              {ptasSeleccionados.length} PTAs
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pantalla de procesamiento
  if (procesando) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Procesando aprobaciones...
          </h2>
          
          <p className="text-gray-600 mb-6">
            Estamos aprobando {ptasSeleccionados.length} PTAs
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
              />
            </div>
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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ThumbsUp className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Aprobación por Lotes</h2>
              <p className="text-xs text-white/80">
                Aprueba múltiples PTAs simultáneamente
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
          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Aprobación rápida de PTAs
                </h4>
                <p className="text-sm text-blue-800">
                  Selecciona los PTAs que deseas aprobar y agrega un comentario general.
                  Todos los PTAs seleccionados pasarán al siguiente nivel de aprobación.
                </p>
              </div>
            </div>
          </div>

          {/* Selección de todos */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div onClick={toggleTodos} className="cursor-pointer">
                {ptasSeleccionados.length === ptas.length ? (
                  <CheckSquare className="w-5 h-5 text-green-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                )}
              </div>
              <span className="font-medium text-gray-900">
                Seleccionar todos ({ptas.length} PTAs)
              </span>
            </label>
            <span className="text-sm text-gray-600">
              {ptasSeleccionados.length} de {ptas.length} seleccionados
            </span>
          </div>

          {/* Lista de PTAs */}
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {ptas.map((pta) => (
              <motion.div
                key={pta.id}
                whileHover={{ scale: 1.01 }}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${ptasSeleccionados.includes(pta.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
                onClick={() => togglePTA(pta.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {ptasSeleccionados.includes(pta.id) ? (
                      <CheckSquare className="w-5 h-5 text-green-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-gray-600">{pta.radicado}</span>
                      <span className="text-sm text-gray-700">
                        {pta.horasAsignadas}/{pta.horasBase}h
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{pta.docenteNombre}</h4>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Comentario general */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentario general (opcional)
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Agrega un comentario que se enviará a todos los docentes..."
              className="w-full min-h-[100px] p-3 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Advertencia */}
          {ptasSeleccionados.length > 10 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">
                    Aprobación masiva detectada
                  </h4>
                  <p className="text-sm text-amber-800">
                    Estás aprobando {ptasSeleccionados.length} PTAs. Asegúrate de haber revisado todos antes de continuar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox de confirmación */}
          <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-1 w-5 h-5 text-green-600 border-green-400 rounded focus:ring-green-500"
              />
              <div className="flex-1">
                <p className="font-medium text-green-900">
                  Confirmo que he revisado los {ptasSeleccionados.length} PTAs seleccionados
                </p>
                <p className="text-sm text-green-800 mt-1">
                  y los apruebo para pasar al siguiente nivel.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{ptasSeleccionados.length}</span> PTAs seleccionados
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleAprobar}
              disabled={ptasSeleccionados.length === 0 || !confirmado}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              Aprobar {ptasSeleccionados.length} PTAs
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
