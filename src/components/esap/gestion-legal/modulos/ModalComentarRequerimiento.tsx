/**
 * ModalComentarRequerimiento - Modal para agregar comentarios internos a requerimientos
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, MessageSquare, Send, Paperclip, File, Trash2, User, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';

interface Comentario {
  id: string;
  usuario: string;
  fecha: Date;
  contenido: string;
  tipo: 'interno' | 'oficial';
  archivos?: { nombre: string; size: number }[];
}

interface ModalComentarRequerimientoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  requerimientoAsunto: string;
}

export function ModalComentarRequerimiento({
  isOpen,
  onClose,
  requerimientoId,
  requerimientoAsunto,
}: ModalComentarRequerimientoProps) {
  const [comentario, setComentario] = useState('');
  const [tipoComentario, setTipoComentario] = useState<'interno' | 'oficial'>('interno');
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock de comentarios existentes
  const [comentariosExistentes] = useState<Comentario[]>([
    {
      id: '1',
      usuario: 'Dra. María Fernández',
      fecha: new Date('2024-12-20T10:30:00'),
      contenido: 'Solicité información complementaria al área de Contratación. Esperando respuesta para consolidar datos.',
      tipo: 'interno',
    },
    {
      id: '2',
      usuario: 'Dr. Carlos Pérez',
      fecha: new Date('2024-12-21T14:15:00'),
      contenido: 'Revisé la normatividad aplicable. El término para responder vence el 8 de enero. Prioridad alta.',
      tipo: 'interno',
    },
  ]);

  const handleSelectArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      
      // Validar tamaño (máximo 10MB por archivo)
      const archivosGrandes = nuevosArchivos.filter(f => f.size > 10 * 1024 * 1024);
      if (archivosGrandes.length > 0) {
        toast.error('Archivos Muy Grandes', {
          description: `Los archivos deben pesar menos de 10MB. ${archivosGrandes.length} archivo(s) exceden el límite.`,
        });
        return;
      }

      setArchivosAdjuntos([...archivosAdjuntos, ...nuevosArchivos]);
      toast.success(`${nuevosArchivos.length} archivo(s) agregado(s)`);
    }
  };

  const handleRemoverArchivo = (index: number) => {
    const nuevosArchivos = archivosAdjuntos.filter((_, i) => i !== index);
    setArchivosAdjuntos(nuevosArchivos);
    toast.info('Archivo eliminado');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comentario.trim()) {
      toast.error('Comentario Vacío', {
        description: 'Debe escribir un comentario antes de enviar',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 1200));

      // En producción:
      // await agregarComentarioRequerimiento({
      //   requerimientoId,
      //   comentario,
      //   tipo: tipoComentario,
      //   archivos: archivosAdjuntos
      // });

      toast.success('Comentario Agregado', {
        description: `Comentario ${tipoComentario} registrado exitosamente en el requerimiento ${requerimientoId}`,
      });

      // Limpiar formulario
      setComentario('');
      setArchivosAdjuntos([]);
      onClose();
    } catch (error) {
      toast.error('Error al Guardar', {
        description: 'No se pudo agregar el comentario. Intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-[15vh] -translate-x-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[70vh] overflow-y-auto"
          >
            {/* Header */}
            <ModalHeaderClean
              icono={MessageSquare}
              colorIcono="orange"
              titulo="Agregar Comentario"
              subtitulo={`${requerimientoId} - ${requerimientoAsunto}`}
              onClose={onClose}
            />

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Tipo de Comentario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tipo de Comentario
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoComentario('interno')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tipoComentario === 'interno'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        tipoComentario === 'interno' ? 'border-blue-600' : 'border-gray-400'
                      }`}>
                        {tipoComentario === 'interno' && (
                          <div className="w-3 h-3 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Comentario Interno</p>
                        <p className="text-xs text-gray-600">Solo visible para el equipo jurídico</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoComentario('oficial')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tipoComentario === 'oficial'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        tipoComentario === 'oficial' ? 'border-orange-600' : 'border-gray-400'
                      }`}>
                        {tipoComentario === 'oficial' && (
                          <div className="w-3 h-3 rounded-full bg-orange-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Comentario Oficial</p>
                        <p className="text-xs text-gray-600">Quedará en el expediente</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Área de Comentario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comentario <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Escriba su comentario aquí..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 outline-none transition-all resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  {comentario.length} caracteres
                </p>
              </div>

              {/* Adjuntar Archivos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Archivos Adjuntos (Opcional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleSelectArchivos}
                    className="hidden"
                    id="file-upload-comentario"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="file-upload-comentario"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Paperclip className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">
                      Click para seleccionar archivos
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                    </p>
                  </label>
                </div>

                {/* Lista de Archivos Adjuntos */}
                {archivosAdjuntos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivosAdjuntos.map((archivo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {archivo.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatFileSize(archivo.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverArchivo(index)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comentarios Anteriores */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Comentarios Anteriores ({comentariosExistentes.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comentariosExistentes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No hay comentarios registrados
                    </p>
                  ) : (
                    comentariosExistentes.map((com) => (
                      <div
                        key={com.id}
                        className={`p-4 rounded-lg border-2 ${
                          com.tipo === 'interno'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-orange-50 border-orange-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-bold text-gray-900">
                              {com.usuario}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                com.tipo === 'interno'
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-orange-200 text-orange-800'
                              }`}
                            >
                              {com.tipo === 'interno' ? 'Interno' : 'Oficial'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {com.fecha.toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{com.contenido}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Advertencia si es oficial */}
              {tipoComentario === 'oficial' && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-900">
                        Comentario Oficial
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        Este comentario quedará registrado en el expediente oficial del requerimiento
                        y podrá ser consultado en auditorías e informes de gestión.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !comentario.trim()}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Agregar Comentario
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}