/**
 * ModalSubirRespuesta - Modal para subir respuesta oficial a requerimientos de órganos de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, Send, Upload, File, Trash2, CheckCircle, AlertTriangle, Calendar, FileText, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';
import { ModalVistaPreviaRespuesta } from './ModalVistaPreviaRespuesta';

interface ArchivoRespuesta {
  file: File;
  tipo: 'respuesta_principal' | 'anexo' | 'soporte';
  descripcion: string;
}

interface ModalSubirRespuestaProps {
  isOpen: boolean;
  onClose: () => void;
  requerimiento: {
    id: string;
    numeroOficio: string;
    organismo: string;
    asunto: string;
    fechaVencimiento: Date;
    diasRestantes: number;
  };
}

export function ModalSubirRespuesta({
  isOpen,
  onClose,
  requerimiento,
}: ModalSubirRespuestaProps) {
  const [archivos, setArchivos] = useState<ArchivoRespuesta[]>([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<'respuesta_principal' | 'anexo' | 'soporte'>('respuesta_principal');
  const [descripcionArchivo, setDescripcionArchivo] = useState('');
  const [numeroRespuesta, setNumeroRespuesta] = useState('');
  const [fechaRespuesta, setFechaRespuesta] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paso, setPaso] = useState<1 | 2>(1); // Paso 1: Cargar archivos, Paso 2: Confirmar
  
  // Nuevos estados para vista previa
  const [tipoRespuesta, setTipoRespuesta] = useState<'completa' | 'parcial'>('completa');
  const [destinatario, setDestinatario] = useState('');
  const [cargo, setCargo] = useState('');
  const [usarPlantillaOficial, setUsarPlantillaOficial] = useState(true);
  const [contenidoRespuesta, setContenidoRespuesta] = useState('');
  const [showVistaPrevia, setShowVistaPrevia] = useState(false);

  const tiposArchivo = [
    {
      value: 'respuesta_principal' as const,
      label: 'Respuesta Principal',
      descripcion: 'Documento oficial de respuesta al requerimiento',
      icon: '📄',
      color: 'blue',
    },
    {
      value: 'anexo' as const,
      label: 'Anexo',
      descripcion: 'Documentos complementarios y soportes',
      icon: '📎',
      color: 'purple',
    },
    {
      value: 'soporte' as const,
      label: 'Soporte Técnico',
      descripcion: 'Certificaciones, informes técnicos',
      icon: '📊',
      color: 'green',
    },
  ];

  const handleSelectArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño (máximo 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Archivo Muy Grande', {
          description: 'El archivo debe pesar menos de 20MB',
        });
        return;
      }

      // Validar formato (solo PDF, Word, Excel)
      const formatosPermitidos = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!formatosPermitidos.includes(extension)) {
        toast.error('Formato No Permitido', {
          description: 'Solo se permiten archivos PDF, Word y Excel',
        });
        return;
      }

      setArchivoSeleccionado(file);
      
      // Auto-generar descripción según el tipo
      const tipoInfo = tiposArchivo.find(t => t.value === tipoArchivo);
      setDescripcionArchivo(tipoInfo?.label || '');
    }
  };

  const handleAgregarArchivo = () => {
    if (!archivoSeleccionado) {
      toast.error('No hay archivo seleccionado');
      return;
    }

    if (!descripcionArchivo.trim()) {
      toast.error('Debe agregar una descripción al archivo');
      return;
    }

    // Validar que haya solo una respuesta principal
    if (tipoArchivo === 'respuesta_principal') {
      const yaHayPrincipal = archivos.some(a => a.tipo === 'respuesta_principal');
      if (yaHayPrincipal) {
        toast.error('Solo puede haber un documento de respuesta principal');
        return;
      }
    }

    const nuevoArchivo: ArchivoRespuesta = {
      file: archivoSeleccionado,
      tipo: tipoArchivo,
      descripcion: descripcionArchivo,
    };

    setArchivos([...archivos, nuevoArchivo]);
    toast.success(`Archivo agregado: ${archivoSeleccionado.name}`);

    // Limpiar selección
    setArchivoSeleccionado(null);
    setDescripcionArchivo('');
    const input = document.getElementById('file-upload-respuesta') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleRemoverArchivo = (index: number) => {
    const nuevosArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevosArchivos);
    toast.info('Archivo eliminado');
  };

  const handleSubmit = async () => {
    // Validaciones
    if (archivos.length === 0) {
      toast.error('Debe cargar al menos un archivo');
      return;
    }

    const hayRespuestaPrincipal = archivos.some(a => a.tipo === 'respuesta_principal');
    if (!hayRespuestaPrincipal) {
      toast.error('Debe cargar el documento de respuesta principal');
      return;
    }

    if (!numeroRespuesta.trim()) {
      toast.error('Debe ingresar el número de oficio de respuesta');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Respuesta Enviada Exitosamente', {
        description: `La respuesta al requerimiento ${requerimiento.id} ha sido registrada y enviada.`,
      });

      // Limpiar y cerrar
      setArchivos([]);
      setNumeroRespuesta('');
      setObservaciones('');
      setPaso(1);
      onClose();
    } catch (error) {
      toast.error('Error al Enviar Respuesta', {
        description: 'Ocurrió un error. Por favor intente nuevamente.',
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

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'respuesta_principal': return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'anexo': return 'bg-purple-50 border-purple-300 text-purple-800';
      case 'soporte': return 'bg-green-50 border-green-300 text-green-800';
      default: return 'bg-gray-50 border-gray-300 text-gray-800';
    }
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
          />

          {/* Modal Container */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-2xl shadow-2xl z-[9999] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <ModalHeaderClean
              icono={Send}
              colorIcono="blue"
              titulo="Subir Respuesta Oficial"
              subtitulo={`${requerimiento.id} - ${requerimiento.numeroOficio}`}
              onClose={onClose}
            />

            {/* Indicador de Pasos */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    paso === 1 ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {paso === 1 ? '1' : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-semibold ${paso === 1 ? 'text-blue-600' : 'text-green-600'}`}>
                    Cargar Documentos
                  </span>
                </div>
                <div className="w-16 h-0.5 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    paso === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    2
                  </div>
                  <span className={`text-sm font-semibold ${paso === 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Confirmar y Enviar
                  </span>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              
              {/* PASO 1: Cargar Archivos */}
              {paso === 1 && (
                <div className="space-y-6">
                  
                  {/* Información del Requerimiento */}
                  <div className={`p-4 rounded-lg border-2 ${
                    requerimiento.diasRestantes < 0 
                      ? 'bg-red-50 border-red-300'
                      : requerimiento.diasRestantes <= 5
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-green-50 border-green-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                        requerimiento.diasRestantes < 0 
                          ? 'text-red-600'
                          : requerimiento.diasRestantes <= 5
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {requerimiento.asunto}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          <strong>Organismo:</strong> {requerimiento.organismo} •{' '}
                          <strong>Vencimiento:</strong> {requerimiento.fechaVencimiento.toLocaleDateString('es-CO')} •{' '}
                          <strong>Días restantes:</strong> {Math.abs(requerimiento.diasRestantes)} días
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selector de Tipo de Archivo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Tipo de Documento
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {tiposArchivo.map((tipo) => (
                        <button
                          key={tipo.value}
                          type="button"
                          onClick={() => setTipoArchivo(tipo.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            tipoArchivo === tipo.value
                              ? `border-${tipo.color}-600 bg-${tipo.color}-50`
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">{tipo.icon}</div>
                            <p className="text-xs font-bold text-gray-900">{tipo.label}</p>
                            <p className="text-xs text-gray-600 mt-1">{tipo.descripcion}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cargar Archivo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Seleccionar Archivo <span className="text-red-600">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          onChange={handleSelectArchivo}
                          className="hidden"
                          id="file-upload-respuesta"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <label
                          htmlFor="file-upload-respuesta"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="text-sm font-semibold text-gray-700">
                            {archivoSeleccionado ? archivoSeleccionado.name : 'Seleccionar archivo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, Word, Excel (máx. 20MB)
                          </p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Descripción del Archivo <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        value={descripcionArchivo}
                        onChange={(e) => setDescripcionArchivo(e.target.value)}
                        placeholder="Ej: Respuesta oficial requerimiento CGR"
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 outline-none transition-all resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarArchivo}
                        disabled={!archivoSeleccionado || !descripcionArchivo.trim()}
                        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Agregar Archivo
                      </button>
                    </div>
                  </div>

                  {/* Lista de Archivos Agregados */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Archivos Agregados ({archivos.length})
                    </h3>
                    
                    {archivos.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <File className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No hay archivos agregados</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {archivos.map((archivo, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg ${getTipoColor(archivo.tipo)}`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <File className="w-5 h-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {archivo.file.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {archivo.descripcion} • {formatFileSize(archivo.file.size)}
                                </p>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 bg-white rounded-full">
                                {tiposArchivo.find(t => t.value === archivo.tipo)?.icon}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoverArchivo(index)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors ml-2"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaso(2)}
                      disabled={archivos.length === 0}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: Confirmar y Enviar */}
              {paso === 2 && (
                <div className="space-y-6">
                  
                  {/* Datos de la Respuesta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Número de Oficio de Respuesta <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={numeroRespuesta}
                        onChange={(e) => setNumeroRespuesta(e.target.value)}
                        placeholder="Ej: ESAP-OJ-2024-001"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 outline-none transition-all font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Respuesta
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={fechaRespuesta}
                          onChange={(e) => setFechaRespuesta(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones sobre la respuesta..."
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Resumen de Archivos */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      Resumen de Archivos a Enviar ({archivos.length})
                    </h3>
                    <div className="space-y-2">
                      {archivos.map((archivo, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {tiposArchivo.find(t => t.value === archivo.tipo)?.icon} {archivo.file.name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {formatFileSize(archivo.file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirmación */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          Confirmar Envío de Respuesta
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Al confirmar, la respuesta oficial será registrada en el sistema y enviada al órgano de control.
                          Esta acción no se puede deshacer.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      disabled={isSubmitting}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !numeroRespuesta.trim()}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando Respuesta...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Confirmar y Enviar Respuesta
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}