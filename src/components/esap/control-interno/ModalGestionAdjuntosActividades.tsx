/**
 * MODAL DE GESTIÓN DE ARCHIVOS ADJUNTOS PARA ACTIVIDADES DEL PLAN ANUAL
 * Permite adjuntar evidencias de cumplimiento a las actividades
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Paperclip, Upload, Trash2, Eye, FileText, CheckCircle2, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Tipos
interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

interface Actividad {
  id: number;
  nombre: string;
  adjuntos?: ArchivoAdjunto[];
  observacionesCumplimiento?: string;
}

interface ModalGestionAdjuntosProps {
  actividad: Actividad;
  onCerrar: () => void;
  onActualizar: (adjuntos: ArchivoAdjunto[], observaciones: string) => void;
}

export function ModalGestionAdjuntos({ actividad, onCerrar, onActualizar }: ModalGestionAdjuntosProps) {
  const [adjuntos, setAdjuntos] = useState<ArchivoAdjunto[]>(actividad.adjuntos || []);
  const [observaciones, setObservaciones] = useState<string>(actividad.observacionesCumplimiento || '');
  const [cargando, setCargando] = useState(false);
  let fileInputRef: HTMLInputElement | null = null;

  const formatearTamaño = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleAgregarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;

    setCargando(true);

    // Simular carga de archivos (en producción, aquí se subirían al servidor)
    const nuevosAdjuntos: ArchivoAdjunto[] = Array.from(archivos).map(archivo => ({
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: archivo.name,
      tipo: archivo.type || 'application/octet-stream',
      tamaño: archivo.size,
      fechaCarga: new Date().toISOString(),
      cargadoPor: 'Usuario Actual',
      url: URL.createObjectURL(archivo) // En producción, esto vendría del backend
    }));

    setTimeout(() => {
      setAdjuntos([...adjuntos, ...nuevosAdjuntos]);
      setCargando(false);
      toast.success(`${nuevosAdjuntos.length} archivo(s) agregado(s)`);
    }, 800);
  };

  const handleEliminarArchivo = (id: string) => {
    setAdjuntos(adjuntos.filter(adj => adj.id !== id));
    toast.success('Archivo eliminado');
  };

  const handleGuardar = () => {
    onActualizar(adjuntos, observaciones);
    onCerrar();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#DBEAFE' }}>
                <Paperclip className="w-6 h-6" style={{ color: '#2962FF' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Archivos adjuntos
                </h2>
                <p className="text-sm text-gray-600 mt-1 max-w-lg truncate">
                  {actividad.nombre}
                </p>
              </div>
            </div>
            <button onClick={onCerrar} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {/* Zona de carga */}
          <div className="mb-6">
            <input
              ref={(ref) => { fileInputRef = ref; }}
              type="file"
              multiple
              onChange={handleAgregarArchivo}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
            />
            <button
              onClick={() => fileInputRef?.click()}
              disabled={cargando}
              className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 mb-1">
                    {cargando ? 'Cargando archivos...' : 'Haz clic para seleccionar archivos'}
                  </p>
                  <p className="text-sm text-gray-600">
                    PDF, Word, Excel, imágenes, ZIP (máx. 10 MB por archivo)
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Lista de archivos */}
          {adjuntos.length > 0 ? (
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Archivos adjuntos ({adjuntos.length})
              </h3>
              {adjuntos.map((archivo) => (
                <div
                  key={archivo.id}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{archivo.nombre}</p>
                      <p className="text-xs text-gray-600">
                        {formatearTamaño(archivo.tamaño)} • {new Date(archivo.fechaCarga).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {archivo.url && (
                      <button
                        onClick={() => window.open(archivo.url, '_blank')}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Ver archivo"
                      >
                        <Eye className="w-5 h-5 text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminarArchivo(archivo.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Paperclip className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Sin archivos adjuntos</p>
              <p className="text-sm text-gray-600">
                Adjunta evidencias de cumplimiento de esta actividad
              </p>
            </div>
          )}

          {/* Observaciones de Cumplimiento */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
            <label className="block font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">📝</span>
              Observaciones sobre el cumplimiento
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe las acciones realizadas, resultados obtenidos, dificultades encontradas o cualquier observación relevante sobre el cumplimiento de esta actividad..."
              rows={5}
            />
            <p className="text-xs text-gray-600 mt-2">
              Estas observaciones complementan los archivos adjuntos y proporcionan contexto sobre el cumplimiento de la actividad.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {adjuntos.length > 0 && (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <strong>{adjuntos.length} archivo(s)</strong> listo(s) para guardar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="px-6 py-2.5 rounded-lg font-bold text-white transition-colors"
              style={{ background: '#003DA5' }}
            >
              <Check className="w-4 h-4 inline mr-2" />
              Guardar archivos
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}