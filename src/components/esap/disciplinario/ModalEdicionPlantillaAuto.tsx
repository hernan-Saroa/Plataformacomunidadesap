/**
 * MODAL EDICIÓN DE PLANTILLA DE AUTO - WORLD CLASS ✨
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * Fase 3: Modal 3/3 - Editor especializado de plantillas de Autos Disciplinarios
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  Scale,
  Upload,
  Eye,
  AlertCircle,
  Info,
  Calendar,
  FileText,
  Hash,
  ToggleLeft,
  ToggleRight,
  Gavel,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PlantillaAuto {
  id: string;
  nombre: string;
  tipoAuto: string; // "apertura_indagacion" | "apertura_investigacion" | "pliego_cargos" | etc.
  descripcion: string;
  contenido: string;
  fundamentoLegal: string;
  etapaProcesal: string;
  version: string;
  activo: boolean;
  nombreArchivo?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  creadoPor?: string;
}

interface Props {
  plantilla: PlantillaAuto | null;
  onClose: () => void;
  onGuardar: (plantilla: PlantillaAuto) => void;
  modo: 'crear' | 'editar';
}

const TIPOS_AUTO = [
  { value: 'apertura_indagacion', label: 'Auto de Apertura de Indagación Preliminar' },
  { value: 'apertura_investigacion', label: 'Auto de Apertura de Investigación Disciplinaria' },
  { value: 'pliego_cargos', label: 'Auto de Formulación de Pliego de Cargos' },
  { value: 'citacion_audiencia', label: 'Auto de Citación a Audiencia' },
  { value: 'fallo_primera_instancia', label: 'Auto de Fallo de Primera Instancia' },
  { value: 'archivo', label: 'Auto de Archivo' },
  { value: 'pruebas', label: 'Auto de Decreto de Pruebas' },
  { value: 'suspension_provisional', label: 'Auto de Suspensión Provisional' },
  { value: 'medida_aseguramiento', label: 'Auto de Medida de Aseguramiento' },
  { value: 'otro', label: 'Otro tipo de Auto' }
];

const ETAPAS_PROCESALES = [
  'Valoración',
  'Indagación Preliminar',
  'Investigación Disciplinaria',
  'Juzgamiento',
  'Segunda Instancia'
];

export function ModalEdicionPlantillaAuto({ plantilla, onClose, onGuardar, modo }: Props) {
  const [nombre, setNombre] = useState(plantilla?.nombre || '');
  const [tipoAuto, setTipoAuto] = useState(plantilla?.tipoAuto || '');
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion || '');
  const [contenido, setContenido] = useState(plantilla?.contenido || '');
  const [fundamentoLegal, setFundamentoLegal] = useState(plantilla?.fundamentoLegal || '');
  const [etapaProcesal, setEtapaProcesal] = useState(plantilla?.etapaProcesal || '');
  const [version, setVersion] = useState(plantilla?.version || '1.0');
  const [activo, setActivo] = useState(plantilla?.activo ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validación en tiempo real
  const esValido = nombre.trim().length >= 5 && 
                   tipoAuto.trim() !== '' &&
                   descripcion.trim().length >= 15 && 
                   contenido.trim().length >= 100 &&
                   fundamentoLegal.trim().length >= 10 &&
                   etapaProcesal.trim() !== '';

  const handleGuardar = async () => {
    // Validaciones detalladas
    if (nombre.trim().length < 5) {
      toast.error('Nombre muy corto', {
        description: 'El nombre debe tener al menos 5 caracteres'
      });
      return;
    }

    if (!tipoAuto) {
      toast.error('Tipo de auto requerido', {
        description: 'Debes seleccionar el tipo de auto disciplinario'
      });
      return;
    }

    if (descripcion.trim().length < 15) {
      toast.error('Descripción incompleta', {
        description: 'La descripción debe tener al menos 15 caracteres'
      });
      return;
    }

    if (fundamentoLegal.trim().length < 10) {
      toast.error('Fundamento legal incompleto', {
        description: 'El fundamento legal debe tener al menos 10 caracteres'
      });
      return;
    }

    if (contenido.trim().length < 100) {
      toast.error('Contenido insuficiente', {
        description: 'El contenido del auto debe tener al menos 100 caracteres'
      });
      return;
    }

    if (!etapaProcesal) {
      toast.error('Etapa procesal requerida', {
        description: 'Debes seleccionar la etapa procesal correspondiente'
      });
      return;
    }

    setIsLoading(true);

    // Simular guardado
    setTimeout(() => {
      const plantillaActualizada: PlantillaAuto = {
        id: plantilla?.id || `auto-${Date.now()}`,
        nombre: nombre.trim(),
        tipoAuto,
        descripcion: descripcion.trim(),
        contenido: contenido.trim(),
        fundamentoLegal: fundamentoLegal.trim(),
        etapaProcesal,
        version,
        activo,
        fechaCreacion: plantilla?.fechaCreacion || new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        creadoPor: plantilla?.creadoPor || 'Usuario Actual'
      };

      onGuardar(plantillaActualizada);
      setIsLoading(false);

      toast.success(
        modo === 'crear' ? 'Plantilla de auto creada' : 'Plantilla actualizada',
        {
          description: `La plantilla "${nombre}" ha sido ${modo === 'crear' ? 'creada' : 'actualizada'} exitosamente`
        }
      );
    }, 1200);
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
      className="fixed inset-0 flex items-start justify-center pt-8 p-4 z-[200]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
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
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modo === 'crear' ? 'Nueva Plantilla de Auto' : 'Editar Plantilla de Auto'}
                </h2>
                <p className="text-sm text-white/80">
                  Plantilla de Auto Disciplinario
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
          {/* Alerta informativa */}
          <div className="p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#2563EB' }}>
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: '#1E40AF' }}>
                Plantilla de Auto Disciplinario
              </p>
              <p className="text-xs" style={{ color: '#1E40AF' }}>
                Los autos disciplinarios son decisiones de trámite que ordenan actuaciones procesales durante el desarrollo 
                del proceso disciplinario. Deben fundamentarse legalmente según el Código Disciplinario Único (Ley 1952 de 2019).
              </p>
            </div>
          </div>

          {/* Información básica - Grid de 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="col-span-2">
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Nombre de la Plantilla <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isLoading}
                placeholder="Ej: Auto de Apertura de Investigación - Estándar"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: nombre.trim().length >= 5 ? '#10B981' : '#E5E7EB' }}
              />
              <p className="text-xs mt-1" style={{ color: nombre.trim().length >= 5 ? '#10B981' : '#6B7280' }}>
                {nombre.length}/100 caracteres (Mínimo 5) {nombre.trim().length >= 5 && '✅'}
              </p>
            </div>

            {/* Tipo de Auto */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Tipo de Auto <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={tipoAuto}
                onChange={(e) => setTipoAuto(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: tipoAuto ? '#10B981' : '#E5E7EB' }}
              >
                <option value="">Selecciona un tipo...</option>
                {TIPOS_AUTO.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            {/* Etapa Procesal */}
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Etapa Procesal <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={etapaProcesal}
                onChange={(e) => setEtapaProcesal(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] disabled:bg-gray-50 transition-colors"
                style={{ borderColor: etapaProcesal ? '#10B981' : '#E5E7EB' }}
              >
                <option value="">Selecciona una etapa...</option>
                {ETAPAS_PROCESALES.map(etapa => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </select>
            </div>

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
              placeholder="Describe el propósito, casos de uso y características de esta plantilla de auto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none disabled:bg-gray-50 transition-colors"
              style={{ borderColor: descripcion.trim().length >= 15 ? '#10B981' : '#E5E7EB' }}
            />
            <p className="text-xs mt-1" style={{ color: descripcion.trim().length >= 15 ? '#10B981' : '#6B7280' }}>
              {descripcion.length}/500 caracteres (Mínimo 15) {descripcion.trim().length >= 15 && '✅'}
            </p>
          </div>

          {/* Fundamento Legal */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase flex items-center gap-2" style={{ color: '#4B5563' }}>
              <Gavel className="w-4 h-4" />
              Fundamento Legal <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={fundamentoLegal}
              onChange={(e) => setFundamentoLegal(e.target.value)}
              disabled={isLoading}
              placeholder="Ej: Ley 1952 de 2019 - Código Disciplinario Único, artículos 150, 151, 152..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none disabled:bg-gray-50 transition-colors"
              style={{ borderColor: fundamentoLegal.trim().length >= 10 ? '#10B981' : '#E5E7EB' }}
            />
            <p className="text-xs mt-1" style={{ color: fundamentoLegal.trim().length >= 10 ? '#10B981' : '#6B7280' }}>
              {fundamentoLegal.length}/300 caracteres (Mínimo 10) {fundamentoLegal.trim().length >= 10 && '✅'}
            </p>
          </div>

          {/* Contenido del Auto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold uppercase flex items-center gap-2" style={{ color: '#4B5563' }}>
                <BookOpen className="w-4 h-4" />
                Contenido del Auto <span style={{ color: '#DC2626' }}>*</span>
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
                  {vistaPrevia ? 'Editor' : 'Vista previa'}
                </button>
              </div>
            </div>

            {!vistaPrevia ? (
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                disabled={isLoading}
                placeholder="Escribe aquí el contenido del auto. Usa variables como {{NUMERO_PROCESO}}, {{NOMBRE_DENUNCIADO}}, {{IDENTIFICACION}}, {{CARGO}}, {{DEPENDENCIA}}, {{FECHA}}, {{HECHOS}}, {{FUNDAMENTO_LEGAL}}, etc."
                rows={14}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] resize-none font-mono text-sm disabled:bg-gray-50 transition-colors"
                style={{ borderColor: contenido.trim().length >= 100 ? '#10B981' : '#E5E7EB' }}
              />
            ) : (
              <div
                className="w-full px-4 py-3 rounded-xl border-2 min-h-[350px] whitespace-pre-wrap text-sm"
                style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
              >
                {contenido || 'Sin contenido para mostrar'}
              </div>
            )}
            
            <p className="text-xs mt-1" style={{ color: contenido.trim().length >= 100 ? '#10B981' : '#6B7280' }}>
              {contenido.length} caracteres (Mínimo 100) {contenido.trim().length >= 100 && '✅'}
            </p>
          </div>

          {/* Información de Variables */}
          <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: '#92400E' }}>
                Variables disponibles en plantillas de autos:
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: '#92400E' }}>
                <code className="bg-white px-2 py-1 rounded">{'{{NUMERO_PROCESO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{NOMBRE_DENUNCIADO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{IDENTIFICACION}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{CARGO}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{DEPENDENCIA}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{FECHA}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{HECHOS}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{FUNDAMENTO_LEGAL}}'}</code>
                <code className="bg-white px-2 py-1 rounded">{'{{ETAPA_PROCESAL}}'}</code>
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
