/**
 * MODAL EDICIÓN DE PLANTILLA - WORLD CLASS ✨
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * Fase 3: Modal 2/3 - Editor de plantillas de documentos (Oficios/Actas)
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  FileText,
  Upload,
  Eye,
  AlertCircle,
  Info,
  Calendar,
  User,
  Hash,
  ToggleLeft,
  ToggleRight,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PlantillaDocumento {
  id: string;
  nombre: string;
  tipo: 'oficio' | 'acta';
  descripcion: string;
  contenido: string;
  version: string;
  activo: boolean;
  nombreArchivo?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  creadoPor?: string;
}

interface Props {
  plantilla: PlantillaDocumento | null;
  onClose: () => void;
  onGuardar: (plantilla: PlantillaDocumento) => void;
  modo: 'crear' | 'editar';
}

export function ModalEdicionPlantilla({ plantilla, onClose, onGuardar, modo }: Props) {
  const [nombre, setNombre] = useState(plantilla?.nombre || '');
  const [tipo, setTipo] = useState<'oficio' | 'acta'>(plantilla?.tipo || 'oficio');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion || '');
  const [contenido, setContenido] = useState(plantilla?.contenido || '');
  const [version, setVersion] = useState(plantilla?.version || '1.0');
  const [activo, setActivo] = useState(plantilla?.activo ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validación en tiempo real
  const esValido = nombre.trim().length >= 3 && 
                   descripcion.trim().length >= 10 && 
                   contenido.trim().length >= 50;

  const handleGuardar = async () => {
    // Validaciones
    if (nombre.trim().length < 3) {
      toast.error('Nombre muy corto', {
        description: 'El nombre debe tener al menos 3 caracteres'
      });
      return;
    }

    if (descripcion.trim().length < 10) {
      toast.error('Descripción incompleta', {
        description: 'La descripción debe tener al menos 10 caracteres'
      });
      return;
    }

    if (contenido.trim().length < 50) {
      toast.error('Contenido insuficiente', {
        description: 'El contenido debe tener al menos 50 caracteres'
      });
      return;
    }

    setIsLoading(true);

    // Simular guardado
    setTimeout(() => {
      const plantillaActualizada: PlantillaDocumento = {
        id: plantilla?.id || `plantilla-${Date.now()}`,
        nombre: nombre.trim(),
        tipo,
        descripcion: descripcion.trim(),
        contenido: contenido.trim(),
        version,
        activo,
        fechaCreacion: plantilla?.fechaCreacion || new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        creadoPor: plantilla?.creadoPor || 'Usuario Actual'
      };

      onGuardar(plantillaActualizada);
      setIsLoading(false);

      toast.success(
        modo === 'crear' ? 'Plantilla creada' : 'Plantilla actualizada',
        {
          description: `La plantilla "${nombre}" ha sido ${modo === 'crear' ? 'creada' : 'actualizada'} exitosamente`
        }
      );
    }, 1000);
  };

  const handleCargarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const extensionesPermitidas = ['.docx', '.txt', '.html'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!extensionesPermitidas.includes(extension)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos .docx, .txt o .html'
      });
      return;
    }

    // Leer archivo
    const reader = new FileReader();
    reader.onload = (event) => {
      const contenidoArchivo = event.target?.result as string;
      setContenido(contenidoArchivo);
      toast.success('Archivo cargado', {
        description: `Se ha cargado el contenido de "${file.name}"`
      });
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-start justify-center pt-12 p-4 z-[200]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header - Gradiente Corporativo */}
        <div
          className="p-6 border-b"
          style={{
            background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)',
            borderColor: '#E5E7EB'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              >
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modo === 'crear' ? 'Nueva Plantilla' : 'Editar Plantilla'}
                </h2>
                <p className="text-sm text-white/80">
                  {tipo === 'oficio' ? 'Plantilla de Oficio' : 'Plantilla de Acta'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Nombre de la Plantilla <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isLoading}
                placeholder="Ej: Oficio de Citación a Audiencia"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: nombre.trim().length >= 3 ? '#10B981' : '#E5E7EB' }}
              />
              <p className="text-xs mt-1" style={{ color: nombre.trim().length >= 3 ? '#10B981' : '#6B7280' }}>
                {nombre.length}/50 caracteres {nombre.trim().length >= 3 && '✅'}
              </p>
            </div>

            {/* Tipo */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Tipo de Documento <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'oficio' | 'acta')}
                disabled={isLoading || modo === 'editar'}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="oficio">Oficio</option>
                <option value="acta">Acta</option>
              </select>
            </div>
          </div>

          {/* Versión y Estado */}
          <div className="grid grid-cols-2 gap-4">
            {/* Versión */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Versión
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={isLoading}
                placeholder="1.0"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>

            {/* Estado Activo */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Estado
              </label>
              <button
                onClick={() => setActivo(!activo)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border-2 flex items-center gap-3 transition-colors disabled:opacity-40"
                style={{
                  borderColor: activo ? '#10B981' : '#E5E7EB',
                  background: activo ? '#ECFDF5' : '#F9FAFB'
                }}
              >
                {activo ? (
                  <>
                    <ToggleRight className="w-5 h-5" style={{ color: '#10B981' }} />
                    <span className="font-semibold" style={{ color: '#10B981' }}>Plantilla Activa</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" style={{ color: '#6B7280' }} />
                    <span className="font-semibold" style={{ color: '#6B7280' }}>Plantilla Inactiva</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Descripción <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={isLoading}
              placeholder="Describe el propósito y uso de esta plantilla..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none disabled:bg-gray-50 transition-colors"
              style={{ borderColor: descripcion.trim().length >= 10 ? '#10B981' : '#E5E7EB' }}
            />
            <p className="text-xs mt-1" style={{ color: descripcion.trim().length >= 10 ? '#10B981' : '#6B7280' }}>
              {descripcion.length}/500 caracteres (Mínimo 10) {descripcion.trim().length >= 10 && '✅'}
            </p>
          </div>

          {/* Contenido de la Plantilla */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Contenido de la Plantilla <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold border-2 rounded-lg flex items-center gap-2 hover:bg-blue-50 transition-colors disabled:opacity-40"
                  style={{ borderColor: '#003DA5', color: '#003DA5' }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Cargar archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt,.html"
                  onChange={handleCargarArchivo}
                  className="hidden"
                />
                <button
                  onClick={() => setVistaPrevia(!vistaPrevia)}
                  className="px-3 py-1.5 text-xs font-semibold border-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {vistaPrevia ? 'Ocultar' : 'Vista previa'}
                </button>
              </div>
            </div>

            {!vistaPrevia ? (
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                disabled={isLoading}
                placeholder="Escribe aquí el contenido de la plantilla. Puedes usar variables como {{NOMBRE_DENUNCIADO}}, {{NUMERO_PROCESO}}, {{FECHA}}, etc."
                rows={12}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none font-mono text-sm disabled:bg-gray-50 transition-colors"
                style={{ borderColor: contenido.trim().length >= 50 ? '#10B981' : '#E5E7EB' }}
              />
            ) : (
              <div
                className="w-full px-4 py-3 rounded-xl border-2 min-h-[300px] whitespace-pre-wrap text-sm"
                style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
              >
                {contenido || 'Sin contenido para mostrar'}
              </div>
            )}
            
            <p className="text-xs mt-1" style={{ color: contenido.trim().length >= 50 ? '#10B981' : '#6B7280' }}>
              {contenido.length} caracteres (Mínimo 50) {contenido.trim().length >= 50 && '✅'}
            </p>
          </div>

          {/* Información de Variables */}
          <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: '#1E40AF' }}>
                Variables disponibles en plantillas:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#1E40AF' }}>
                <code className="bg-white px-2 py-1 rounded">{'{{NUMERO_PROCESO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{NOMBRE_DENUNCIADO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{IDENTIFICACION}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{CARGO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{FECHA}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{DEPENDENCIA}}'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors disabled:opacity-40"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!esValido || isLoading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: esValido && !isLoading 
                ? 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)'
                : '#9CA3AF'
            }}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {modo === 'crear' ? 'Crear Plantilla' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
