/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL: OBSERVACIONES Y COMENTARIOS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Permite registrar observaciones, comentarios y seguimiento detallado
 * de cada actividad del Plan Anual.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, MessageSquare, Send, User, Calendar, Edit2, Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface Observacion {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
  tipo: 'comentario' | 'alerta' | 'aprobacion';
}

interface ModalObservacionesProps {
  isOpen: boolean;
  onClose: () => void;
  actividadNombre: string;
  observaciones: Observacion[];
  onAgregarObservacion: (observacion: Omit<Observacion, 'id'>) => void;
  onEliminarObservacion: (observacionId: string) => void;
  usuarioActual: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ModalObservaciones({
  isOpen,
  onClose,
  actividadNombre,
  observaciones,
  onAgregarObservacion,
  onEliminarObservacion,
  usuarioActual
}: ModalObservacionesProps) {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'comentario' | 'alerta' | 'aprobacion'>('comentario');

  if (!isOpen) return null;

  // Handler: Agregar observación
  const handleAgregar = () => {
    if (!nuevoComentario.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    const nuevaObservacion: Omit<Observacion, 'id'> = {
      texto: nuevoComentario,
      autor: usuarioActual,
      fecha: new Date().toISOString(),
      tipo: tipoSeleccionado
    };

    onAgregarObservacion(nuevaObservacion);
    setNuevoComentario('');
    toast.success('Observación agregada');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Observaciones y Comentarios</h2>
              <p className="text-purple-100 text-sm mt-1">{actividadNombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Formulario de nueva observación */}
          <div className="mb-6 p-5 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Agregar Observación</h3>
            
            {/* Selector de tipo */}
            <div className="mb-3 flex gap-2">
              {[
                { valor: 'comentario' as const, label: 'Comentario', color: 'blue' },
                { valor: 'alerta' as const, label: 'Alerta', color: 'orange' },
                { valor: 'aprobacion' as const, label: 'Aprobación', color: 'green' }
              ].map((tipo) => (
                <button
                  key={tipo.valor}
                  onClick={() => setTipoSeleccionado(tipo.valor)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    tipoSeleccionado === tipo.valor
                      ? `bg-${tipo.color}-600 text-white shadow-md`
                      : `bg-${tipo.color}-50 text-${tipo.color}-700 hover:bg-${tipo.color}-100`
                  }`}
                >
                  {tipo.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe tu observación aquí..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none mb-3"
            />

            {/* Botón enviar */}
            <button
              onClick={handleAgregar}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              Agregar Observación
            </button>
          </div>

          {/* Lista de observaciones */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Historial de Observaciones ({observaciones.length})
            </h3>

            {observaciones.length === 0 ? (
              <div className="p-8 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay observaciones registradas</p>
                <p className="text-sm text-gray-500 mt-1">
                  Agrega comentarios para documentar el seguimiento de la actividad
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {observaciones
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .map((obs) => (
                    <div
                      key={obs.id}
                      className={`border-2 rounded-lg p-4 ${
                        obs.tipo === 'alerta' ? 'border-orange-200 bg-orange-50' :
                        obs.tipo === 'aprobacion' ? 'border-green-200 bg-green-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                            {obs.autor.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{obs.autor}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(obs.fecha).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            obs.tipo === 'alerta' ? 'bg-orange-200 text-orange-800' :
                            obs.tipo === 'aprobacion' ? 'bg-green-200 text-green-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {obs.tipo.charAt(0).toUpperCase() + obs.tipo.slice(1)}
                          </span>
                          {obs.autor === usuarioActual && (
                            <button
                              onClick={() => {
                                onEliminarObservacion(obs.id);
                                toast.success('Observación eliminada');
                              }}
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 text-sm leading-relaxed">{obs.texto}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
