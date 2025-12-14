/**
 * MODAL SUBIR DOCUMENTO - RF003
 * Sistema completo de gestión documental con drag & drop
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, Upload, FileText, File, Image, FileSpreadsheet,
  Trash2, Check, AlertCircle, Paperclip
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface ModalSubirDocumentoProps {
  proceso: any;
  onClose: () => void;
  onConfirm: (documentos: DocumentoNuevo[]) => void;
}

interface DocumentoNuevo {
  archivo: File;
  etapaAsociada: string;
  tipoDocumento: string;
  descripcion: string;
}

const ETAPAS_DISPONIBLES = [
  'Radicación',
  'Valoración',
  'Inhibitorio',
  'Indagación Preliminar',
  'Investigación',
  'Juzgamiento',
  'Fallo',
  'Recurso de Apelación',
  'Ejecutoria'
];

const TIPOS_DOCUMENTO = [
  'Auto',
  'Notificación',
  'Prueba Documental',
  'Declaración',
  'Oficio',
  'Respuesta',
  'Descargos',
  'Recurso',
  'Otro'
];

export function ModalSubirDocumento({ proceso, onClose, onConfirm }: ModalSubirDocumentoProps) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(proceso.etapaActual || 'Valoración');
  const [tipoDocumento, setTipoDocumento] = useState('Auto');
  const [descripcion, setDescripcion] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    agregarArchivos(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      agregarArchivos(files);
    }
  };

  const agregarArchivos = (nuevosArchivos: File[]) => {
    // Validar tipos de archivo permitidos
    const permitidos = ['application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'application/vnd.ms-excel',
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                       'image/jpeg', 'image/png', 'image/jpg'];
    
    const archivosValidos = nuevosArchivos.filter(archivo => {
      // Validar tipo
      if (!permitidos.includes(archivo.type)) {
        toast.error(`Archivo no permitido: ${archivo.name}`, {
          description: 'Solo se permiten PDF, Word, Excel e imágenes'
        });
        return false;
      }
      
      // Validar tamaño (máx 10MB)
      if (archivo.size > 10 * 1024 * 1024) {
        toast.error(`Archivo muy grande: ${archivo.name}`, {
          description: 'El tamaño máximo es 10MB'
        });
        return false;
      }
      
      return true;
    });

    setArchivos([...archivos, ...archivosValidos]);
  };

  const eliminarArchivo = (index: number) => {
    setArchivos(archivos.filter((_, i) => i !== index));
  };

  const handleConfirmar = () => {
    if (archivos.length === 0) {
      toast.error('Debes seleccionar al menos un archivo');
      return;
    }

    const documentos: DocumentoNuevo[] = archivos.map(archivo => ({
      archivo,
      etapaAsociada: etapaSeleccionada,
      tipoDocumento,
      descripcion
    }));

    onConfirm(documentos);
  };

  const getIconoArchivo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-6 h-6 text-red-600" />;
    if (tipo.includes('word')) return <File className="w-6 h-6 text-blue-600" />;
    if (tipo.includes('sheet') || tipo.includes('excel')) return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
    if (tipo.includes('image')) return <Image className="w-6 h-6 text-purple-600" />;
    return <File className="w-6 h-6 text-gray-600" />;
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[250]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#003DA5' }}>
                Adjuntar Documentos al Expediente
              </h2>
              <p className="text-sm text-gray-600">
                {proceso.numeroProceso} • {proceso.denunciado.nombre}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Zona de drag & drop */}
          <div>
            <label className="block font-semibold mb-3 text-gray-900">
              Archivos a Adjuntar <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              `}
            >
              <Upload className={`
                w-12 h-12 mx-auto mb-4
                ${isDragging ? 'text-blue-600' : 'text-gray-400'}
              `} />
              
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {isDragging ? '¡Suelta los archivos aquí!' : 'Arrastra y suelta archivos aquí'}
              </p>
              
              <p className="text-sm text-gray-600 mb-4">
                o haz click para seleccionar
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                type="button"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Seleccionar Archivos
              </Button>

              <p className="text-xs text-gray-500 mt-4">
                Formatos permitidos: PDF, Word, Excel, Imágenes (JPG, PNG)
                <br />
                Tamaño máximo por archivo: 10MB
              </p>
            </div>
          </div>

          {/* Lista de archivos seleccionados */}
          {archivos.length > 0 && (
            <div>
              <label className="block font-semibold mb-3 text-gray-900">
                Archivos Seleccionados ({archivos.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {archivos.map((archivo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {getIconoArchivo(archivo.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {archivo.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatearTamano(archivo.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarArchivo(index)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Etapa Asociada */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Etapa Procesal Asociada <span className="text-red-500">*</span>
            </label>
            <select
              value={etapaSeleccionada}
              onChange={(e) => setEtapaSeleccionada(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
            >
              {ETAPAS_DISPONIBLES.map((etapa) => (
                <option key={etapa} value={etapa}>
                  {etapa}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Los documentos se organizarán por etapa procesal en el expediente
            </p>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Tipo de Documento <span className="text-red-500">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Descripción / Observaciones (Opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Respuesta de Talento Humano con información laboral del denunciado..."
              className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Info sobre registro automático */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">
                  Registro Automático
                </p>
                <p className="text-sm text-blue-700">
                  El sistema registrará automáticamente:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside mt-2 space-y-1">
                  <li>Usuario que carga el documento</li>
                  <li>Fecha y hora exacta de carga</li>
                  <li>Etapa procesal asociada</li>
                  <li>Tipo de documento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            className="flex-1"
            style={{ background: '#10B981', color: '#FFFFFF' }}
            disabled={archivos.length === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Adjuntar {archivos.length > 0 && `(${archivos.length})`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
