/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WIZARD DE CREACIÓN DE AUTOS - WORLD CLASS ENTERPRISE DESIGN ║
 * ║  Control Interno Disciplinario - ESAP                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * 🏆 WORLD CLASS FEATURES:
 * ✅ Premium visual design con glassmorphism
 * ✅ Micro-interacciones sofisticadas
 * ✅ Responsive inteligente sin sacrificar estética
 * ✅ Animaciones fluidas y profesionales
 * ✅ Sistema de spacing perfecto
 * ✅ Tipografía enterprise-grade
 * ✅ Feedback visual instantáneo
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Check, Scale, FileText, Download,
  Upload, AlertCircle, CheckCircle, Info, File, Calendar, User,
  Paperclip, Eye, Search, Clock, Sparkles, Send, AlertTriangle,
  FileCheck, Zap, Shield, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ETAPAS_PROCESO, type EtapaProcesoId, type TipoAuto, type PlantillaArchivo } from './configuracion/SeccionPlantillasAutosUnificada';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

// ==================== DATOS MOCK ====================
const TIPOS_AUTOS_MOCK: TipoAuto[] = [
  {
    id: 'tipo-auto-1',
    nombre: 'Auto de Apertura de Investigación Disciplinaria',
    descripcion: 'Auto mediante el cual se ordena la apertura de la investigación disciplinaria formal',
    etapa: 'INVESTIGACION',
    plantilla: {
      id: 'plantilla-1-1',
      nombre: 'Plantilla Auto Apertura Estándar',
      descripcion: 'Plantilla oficial ESAP para auto de apertura de investigación disciplinaria',
      nombreArchivo: 'AUTO_APERTURA_INVESTIGACION_v2024.docx',
      tipoArchivo: 'docx',
      version: '2.0',
      fechaCreacion: '2024-01-15',
      activo: true
    },
    activo: true,
    orden: 1,
    fechaCreacion: '2024-01-15',
    fechaModificacion: '2024-01-15'
  },
  {
    id: 'tipo-auto-2',
    nombre: 'Auto de Formulación de Cargos',
    descripcion: 'Auto mediante el cual se formulan los cargos al investigado',
    etapa: 'CARGOS',
    plantilla: {
      id: 'plantilla-2-1',
      nombre: 'Plantilla Formulación Cargos Estándar',
      descripcion: 'Plantilla oficial para formulación de cargos disciplinarios',
      nombreArchivo: 'AUTO_FORMULACION_CARGOS_v2024.docx',
      tipoArchivo: 'docx',
      version: '2.0',
      fechaCreacion: '2024-01-15',
      activo: true
    },
    activo: true,
    orden: 2,
    fechaCreacion: '2024-01-15',
    fechaModificacion: '2024-01-15'
  },
  {
    id: 'tipo-auto-3',
    nombre: 'Auto de Archivo Definitivo',
    descripcion: 'Auto mediante el cual se ordena el archivo definitivo de la investigación',
    etapa: 'INVESTIGACION',
    plantilla: {
      id: 'plantilla-3-1',
      nombre: 'Plantilla Archivo Definitivo',
      descripcion: 'Plantilla para archivo definitivo de investigación disciplinaria',
      nombreArchivo: 'AUTO_ARCHIVO_DEFINITIVO_v2024.docx',
      tipoArchivo: 'docx',
      version: '1.5',
      fechaCreacion: '2024-01-15',
      activo: true
    },
    activo: true,
    orden: 3,
    fechaCreacion: '2024-01-15',
    fechaModificacion: '2024-01-15'
  }
];

// ==================== INTERFACES ====================
interface ProcesoCompleto {
  id: string;
  numeroProceso: string;
  etapaActual: string;
  denunciado: {
    nombre: string;
    numeroIdentificacion: string;
  };
}

interface AutoGenerado {
  id: string;
  numero: string;
  tipo: string;
  fecha: string;
  estado: string;
  etapa: string;
  profesional: string;
  observaciones: string;
  archivoAdjunto?: { nombre: string; tamano: string };
}

interface WizardCrearAutoWorldClassProps {
  proceso: ProcesoCompleto;
  onClose: () => void;
  onAutoCreado?: (auto: any) => void;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function WizardCrearAutoWorldClass({
  proceso,
  onClose,
  onAutoCreado
}: WizardCrearAutoWorldClassProps) {
  // Estados del Wizard
  const [paso, setPaso] = useState(1);
  const [vistaActual, setVistaActual] = useState<'wizard' | 'lista'>('wizard');

  // Estados del Paso 1
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAuto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaProcesoId | 'todas'>('todas');
  const [plantillaDescargada, setPlantillaDescargada] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // Estados del Paso 2
  const [fechaAuto, setFechaAuto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Estados del Paso 3
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [observacionesAdjunto, setObservacionesAdjunto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Autos Generados
  const [autosGenerados, setAutosGenerados] = useState<AutoGenerado[]>([]);
  const [cargandoAutos, setCargandoAutos] = useState(false);

  // Estados de Tipos de Auto desde el backend
  const [loadingTiposAuto, setLoadingTiposAuto] = useState(false);
  const [tiposAuto, setTiposAuto] = useState<TipoAuto[]>(TIPOS_AUTOS_MOCK);

  // Referencia a los tipos de auto (usa el estado o fallback)
  const tiposAutos = tiposAuto;

  // ==================== FUNCIONES AUXILIARES ====================
  const cargarAutosGenerados = async () => {
    if (!proceso?.id) return;
    setCargandoAutos(true);
    try {
      const autos = await disciplinaryService.getAutosByProceso(proceso.id);
      const mapped: AutoGenerado[] = (autos || []).map((auto: any) => ({
        id: auto.id,
        numero: auto.numero || 'Sin número',
        tipo: auto.tipo || 'AUTO',
        fecha: auto.createdAt ? new Date(auto.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        estado: auto.estado || 'BORRADOR',
        etapa: auto.process?.currentKanbanStage || '',
        profesional: auto.process?.abogadoAsignadoNombre || '',
        observaciones: auto.comentarios || '',
        archivoAdjunto: auto.documentName ? { nombre: auto.documentName, tamano: auto.documentSize ? `${(auto.documentSize / 1024).toFixed(0)} KB` : '' } : undefined,
      }));
      setAutosGenerados(mapped);
    } catch (error) {
      console.error('Error cargando autos generados:', error);
    } finally {
      setCargandoAutos(false);
    }
  };

  // ==================== EFECTOS ====================
  
  // Cargar tipos de auto desde el backend
  useEffect(() => {
    cargarTiposAuto();
  }, []);

  const cargarTiposAuto = async () => {
    setLoadingTiposAuto(true);
    try {
      // Cargar autos parametrizados desde el backend
      const response = await disciplinaryService.getAutosConfigurationActive();
      
      // Verificar que la respuesta es un array válido
      const autosConfig = Array.isArray(response) ? response : [];
      
      if (autosConfig.length > 0) {
        // Mapear los datos del backend al formato del componente
        // Asegurar que cada ID sea único
        const tiposMapeados: TipoAuto[] = autosConfig.map((config, index) => ({
          id: config?.id || config?.tipo || `auto-${config?.tipo}-${index}`,
          nombre: config?.nombre || 'Sin nombre',
          descripcion: config?.descripcion_plantilla || config?.plantilla || `Tipo de auto: ${config?.nombre || 'desconocido'}`,
          etapa: (config?.stage as EtapaProcesoId) || 'INVESTIGACION',
          plantilla: null, // Se填充 con datos de plantilla si existen
          activo: config?.estado === 'activo',
          orden: config?.orden || index,
          fechaCreacion: config?.createdAt || new Date().toISOString(),
          fechaModificacion: config?.updatedAt || new Date().toISOString(),
          tipo: config?.tipo || undefined, // ✅ Tipo del backend para crear autos
          // ✅ Campos de plantilla desde autos_configuration
          plantillaUrl: config?.plantilla || null,
          nombre_plantilla: config?.nombre_plantilla || null,
          descripcion_plantilla: config?.descripcion_plantilla || null,
          version_plantilla: config?.version_plantilla || null,
          estado_plantilla: config?.estado_plantilla || null
        }));
        
        // Ordenar por orden
        tiposMapeados.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        
        setTiposAuto(tiposMapeados);
      } else {
        // No hay datos en el backend, usar fallback
        setTiposAuto(TIPOS_AUTOS_MOCK);
      }
    } catch (error) {
      console.error('Error cargando tipos de auto:', error);
      // Si falla, usar los tipos por defecto - NO romper la app
      setTiposAuto(TIPOS_AUTOS_MOCK);
    } finally {
      setLoadingTiposAuto(false);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFechaAuto(today);
    // Cargar autos existentes del proceso
    cargarAutosGenerados();
  }, [proceso?.id]);

  // ==================== FUNCIONES ====================
  const handleSeleccionarTipo = (tipo: TipoAuto) => {
    setTipoSeleccionado(tipo);
    setPlantillaDescargada(false);
  };

  const handleDescargarPlantilla = async () => {
    // Verificar si hay plantilla disponible (del backend o local)
    const tienePlantillaBackend = tipoSeleccionado?.plantillaUrl && tipoSeleccionado?.estado_plantilla === 'activo';
    const tienePlantillaLocal = tipoSeleccionado?.plantilla;
    
    if (!tienePlantillaBackend && !tienePlantillaLocal) {
      toast.error('No hay plantilla disponible para descargar');
      return;
    }

    setDescargando(true);

    try {
      // Si tiene plantilla del backend, descargar desde la URL
      if (tienePlantillaBackend && tipoSeleccionado?.plantillaUrl) {
        // Abrir la URL de la plantilla en una nueva pestaña para descargar
        window.open(tipoSeleccionado.plantillaUrl, '_blank');
        
        toast.success('Plantilla descargada correctamente', {
          description: tipoSeleccionado.nombre_plantilla || 'Plantilla del servidor',
          duration: 3000,
        });
      } else if (tienePlantillaLocal) {
        // Simular descarga para plantillas locales (mock)
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Plantilla descargada correctamente', {
          description: tipoSeleccionado.plantilla?.nombreArchivo,
          duration: 3000,
        });
      }

      setPlantillaDescargada(true);
    } catch (error) {
      console.error('Error al descargar plantilla:', error);
      toast.error('Error al descargar la plantilla');
    } finally {
      setDescargando(false);
    }
  };

  const handleSiguiente = () => {
    if (paso === 1 && !tipoSeleccionado) {
      toast.error('Debes seleccionar un tipo de auto');
      return;
    }
    if (paso === 2) {
      if (!fechaAuto) {
        toast.error('Debes ingresar la fecha del auto');
        return;
      }
      if (observaciones.length < 10) {
        toast.error('Las observaciones deben tener al menos 10 caracteres');
        return;
      }
    }
    if (paso === 3 && !archivoAdjunto) {
      toast.error('Debes adjuntar el archivo del auto');
      return;
    }
    setPaso(paso + 1);
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubiendo(true);
      setTimeout(() => {
        setArchivoAdjunto(file);
        setSubiendo(false);
        toast.success('Archivo cargado correctamente');
      }, 600);
    }
  };

  const handleCrearAuto = async () => {
    if (!tipoSeleccionado) {
      toast.error('Debes seleccionar un tipo de auto');
      return;
    }
    if (!fechaAuto) {
      toast.error('Debes ingresar la fecha del auto');
      return;
    }
    if (!archivoAdjunto) {
      toast.error('Debes adjuntar el archivo del auto');
      return;
    }

    try {
      setGuardando(true);

      // ✅ Función auxiliar para mapear nombre a tipo de auto del backend
      const mapNombreToAutoType = (nombre: string): string => {
        const n = nombre.toUpperCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .trim();

        // Mapeo directo por coincidencia parcial
        if (n.includes('APERTURA') && n.includes('INVESTIGACION')) return 'AUTO_APERTURA_INVESTIGACION';
        if (n.includes('APERTURA') && n.includes('INDAGACION')) return 'AUTO_APERTURA_INDAGACION';
        if (n.includes('INDAGACION') && n.includes('PRELIMINAR')) return 'AUTO_INDAGACION_PRELIMINAR';
        if (n.includes('APERTURA')) return 'AUTO_APERTURA';
        if (n.includes('FORMULACION') && n.includes('PLIEGO')) return 'AUTO_FORMULACION_PLIEGO';
        if (n.includes('PLIEGO') && n.includes('CARGOS')) return 'PLIEGO_CARGOS';
        if (n.includes('CIERRE')) return 'AUTO_CIERRE';
        if (n.includes('ARCHIVO')) return 'AUTO_ARCHIVO';
        if (n.includes('FALLO') && n.includes('SANCION')) return 'FALLO_SANCION';
        if (n.includes('FALLO') && n.includes('ABSOLUTORIO')) return 'FALLO_ABSOLUTORIO';
        if (n.includes('RESOLUCION')) return 'RESOLUCION';
        // Fallback: intentar convertir a snake_case
        return nombre.toUpperCase().replace(/\s+/g, '_')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      };

      // ✅Obtener el tipo de auto del backend directamente
      // Si el tipo viene del backend (con campo 'tipo'), usarlo directamente
      // Sino, usar la función de mapeo por nombre
      const tipoAutoValue = tipoSeleccionado.tipo || mapNombreToAutoType(tipoSeleccionado.nombre);

      // ✅ PASO 1: Subir el archivo primero para obtener documentUrl
      // El backend necesita el archivo en disco para estampar el consecutivo en el PDF
      let documentUrl: string | undefined;
      if (archivoAdjunto) {
        toast.info('Subiendo archivo...', { duration: 2000 });
        const uploadResult = await disciplinaryService.uploadFile(archivoAdjunto);
        documentUrl = uploadResult.url || uploadResult.filename;
        console.log('✅ Archivo subido, documentUrl:', documentUrl);
      }

      // ✅ PASO 2: Crear el auto con el documentUrl para que el backend pueda estampar el consecutivo
      const autoCreado = await disciplinaryService.crearAuto({
        processId: proceso.id,
        tipoAuto: tipoAutoValue,
        contenidoHtml: `<p>${observaciones || 'Auto generado desde wizard'}</p>`,
        comentarios: observacionesAdjunto || observaciones,
        documentUrl: documentUrl,
        documentName: archivoAdjunto.name,
        documentType: archivoAdjunto.type,
        documentSize: archivoAdjunto.size
      });

      toast.success('Auto creado exitosamente', {
        description: autoCreado.numero || `Se ha generado el auto ${tipoSeleccionado.nombre}`,
        duration: 4000,
      });

      if (onAutoCreado) {
        onAutoCreado(autoCreado);
      }

      // ✅ Recargar la lista de autos y cambiar a vista lista
      await cargarAutosGenerados();
      setVistaActual('lista');
    } catch (error) {
      console.error('Error al crear auto:', error);
      toast.error('No se pudo crear el auto', {
        description: 'Verifica que el proceso exista en backend y vuelve a intentar'
      });
    } finally {
      setGuardando(false);
    }
  };

  const resetearWizard = () => {
    setPaso(1);
    setTipoSeleccionado(null);
    setFechaAuto(new Date().toISOString().split('T')[0]);
    setFechaVencimiento('');
    setObservaciones('');
    setArchivoAdjunto(null);
    setObservacionesAdjunto('');
    setPlantillaDescargada(false);
    setBusqueda('');
    setFiltroEtapa('todas');
  };

  const handleNuevoAuto = () => {
    resetearWizard();
    setVistaActual('wizard');
  };

  const tiposFiltrados = tiposAutos.filter(tipo => {
    const cumpleFiltroEtapa = filtroEtapa === 'todas' || tipo.etapa === filtroEtapa;
    const cumpleBusqueda = tipo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      tipo.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    // Permitir autos con o sin plantilla (los del backend pueden no tener plantilla)
    return cumpleFiltroEtapa && cumpleBusqueda;
  });

  // ==================== RENDER ====================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[150] p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        transition={{ type: 'spring', duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* ==================== HEADER PREMIUM ==================== */}
        <div className="relative overflow-hidden">
          {/* Gradient Background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 50%, #001E5C 100%)'
            }}
          />

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Content */}
          <div className="relative px-6 sm:px-8 py-5 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Icon Container con Glassmorphism */}
                <div
                  className="p-3 rounded-2xl backdrop-blur-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Scale className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Gestión de Autos y Providencias
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-blue-100 font-medium">
                      {proceso.numeroProceso}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-blue-300" />
                    <p className="text-sm text-blue-100 font-medium hidden sm:block">
                      {proceso.denunciado.nombre}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================== TABS PREMIUM ==================== */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="px-6 sm:px-8 pt-4">
            <div className="flex gap-2">
              <button
                onClick={handleNuevoAuto}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${vistaActual === 'wizard'
                  ? 'text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${vistaActual === 'wizard' ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Crear Nuevo Auto</span>
                  <span className="sm:hidden">Nuevo Auto</span>
                </div>
                {vistaActual === 'wizard' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-t-2xl -z-10 shadow-lg"
                    initial={false}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </button>

              <button
                onClick={() => setVistaActual('lista')}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${vistaActual === 'lista'
                  ? 'text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Autos Generados</span>
                  <span className="sm:hidden">Lista</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vistaActual === 'lista'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {autosGenerados.length}
                  </span>
                </div>
                {vistaActual === 'lista' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-t-2xl -z-10 shadow-lg"
                    initial={false}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ==================== CONTENIDO ==================== */}
        <div className="flex-1 overflow-y-auto">
          {vistaActual === 'wizard' ? (
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {/* Indicador de Progreso Premium */}
              <div className="mb-8 sm:mb-10">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    {[
                      { num: 1, label: 'Seleccionar Tipo', icon: Search },
                      { num: 2, label: 'Información', icon: FileCheck },
                      { num: 3, label: 'Adjuntar Archivo', icon: Upload },
                      { num: 4, label: 'Confirmar', icon: Shield }
                    ].map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = paso > step.num;
                      const isCurrent = paso === step.num;
                      const isPending = paso < step.num;

                      return (
                        <div key={step.num} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            {/* Circle */}
                            <motion.div
                              initial={false}
                              animate={{
                                scale: isCurrent ? 1.1 : 1,
                                rotate: isCompleted ? 360 : 0
                              }}
                              transition={{ duration: 0.5 }}
                              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 ${isCompleted
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                                : isCurrent
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/40'
                                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                                }`}
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                              ) : (
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                              )}

                              {/* Pulse Ring para paso actual */}
                              {isCurrent && (
                                <motion.div
                                  className="absolute inset-0 rounded-2xl border-2 border-blue-600"
                                  initial={{ scale: 1, opacity: 0.5 }}
                                  animate={{ scale: 1.3, opacity: 0 }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                              )}
                            </motion.div>

                            {/* Label */}
                            <p className={`text-xs sm:text-sm font-bold mt-2.5 text-center transition-colors duration-300 hidden sm:block ${isCurrent ? 'text-blue-700' : isPending ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                              {step.label}
                            </p>
                          </div>

                          {/* Connector Line */}
                          {idx < 3 && (
                            <div className="relative flex-1 h-1 mx-2 sm:mx-3">
                              <div className="absolute inset-0 bg-gray-200 rounded-full" />
                              <motion.div
                                className={`absolute inset-0 rounded-full ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-200'
                                  }`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: isCompleted ? 1 : 0 }}
                                transition={{ duration: 0.5 }}
                                style={{ transformOrigin: 'left' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ==================== PASO 1: SELECCIONAR TIPO ==================== */}
              <AnimatePresence mode="wait">
                {paso === 1 && (
                  <motion.div
                    key="paso1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-6xl mx-auto space-y-6"
                  >
                    {/* Info Box Premium */}
                    <div
                      className="relative overflow-hidden rounded-2xl p-5"
                      style={{
                        background: 'linear-gradient(135deg, #EBF4FF 0%, #E0EFFF 100%)',
                        border: '1px solid rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-blue-600/10">
                          <Info className="w-5 h-5 text-blue-700" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-900 mb-2">
                            Información del Proceso
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-blue-700 font-semibold">Proceso:</span>
                              <span className="ml-1.5 text-blue-900 font-bold">{proceso.numeroProceso}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-blue-700 font-semibold">Etapa:</span>
                              <span className="ml-1.5 text-blue-900 font-bold">{proceso.etapaActual}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm sm:col-span-1 col-span-1">
                              <span className="text-blue-700 font-semibold">Investigado:</span>
                              <span className="ml-1.5 text-blue-900 font-bold">{proceso.denunciado.nombre}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filtros Premium */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Buscar tipo de auto..."
                          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-medium placeholder:text-gray-400 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                      <select
                        value={filtroEtapa}
                        onChange={(e) => setFiltroEtapa(e.target.value as EtapaProcesoId | 'todas')}
                        className="px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-semibold bg-white shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <option value="todas">📋 Todas las Etapas</option>
                        {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[]).map((key) => (
                          <option key={key} value={key}>
                            {ETAPAS_PROCESO[key].nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Grid de Tipos Premium */}
                    {loadingTiposAuto ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          Cargando tipos de autos...
                        </p>
                        <p className="text-sm text-gray-500">
                          Obteniendo configuración del servidor
                        </p>
                      </div>
                    ) : tiposFiltrados.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          No se encontraron tipos de autos
                        </p>
                        <p className="text-sm text-gray-500">
                          Configura tipos de autos en el módulo de Configuración
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {tiposFiltrados.map((tipo) => {
                          const etapa = ETAPAS_PROCESO[tipo.etapa] || { nombre: 'Etapa Desconocida', color: '#6B7280', icon: FileText };

                          const Icon = etapa.icon;
                          const seleccionado = tipoSeleccionado?.id === tipo.id;

                          return (
                            <motion.div
                              key={tipo.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ y: -4, transition: { duration: 0.2 } }}
                              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${seleccionado
                                ? 'shadow-2xl shadow-blue-500/20 ring-2 ring-blue-600'
                                : 'shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-gray-300'
                                }`}
                              style={{
                                background: seleccionado
                                  ? 'linear-gradient(135deg, #EBF4FF 0%, #FFFFFF 100%)'
                                  : '#FFFFFF'
                              }}
                            >
                              {/* Contenido Principal */}
                              <div
                                onClick={() => handleSeleccionarTipo(tipo)}
                                className="p-5"
                              >
                                <div className="flex items-start gap-4">
                                  {/* Icon Badge */}
                                  <div
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${seleccionado ? 'scale-110' : 'group-hover:scale-105'
                                      }`}
                                    style={{
                                      background: `linear-gradient(135deg, ${etapa.color} 0%, ${etapa.color}DD 100%)`,
                                      boxShadow: `0 8px 16px ${etapa.color}40`
                                    }}
                                  >
                                    <Icon className="w-7 h-7 text-white" />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <h3 className="text-sm font-black text-gray-900 leading-tight pr-2">
                                        {tipo.nombre}
                                      </h3>
                                      {seleccionado && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="flex-shrink-0"
                                        >
                                          <CheckCircle className="w-6 h-6 text-blue-600" />
                                        </motion.div>
                                      )}
                                    </div>

                                    <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">
                                      {tipo.descripcion}
                                    </p>

                                    <div className="flex items-center gap-2">
                                      <span
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: etapa.color }}
                                      >
                                        {etapa.nombre}
                                      </span>
                                      {/* Mostrar estado de plantilla del backend */}
                                      {tipo.estado_plantilla === 'activo' ? (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">
                                          ✓ Plantilla activa {tipo.version_plantilla ? `v${tipo.version_plantilla}` : ''}
                                        </span>
                                      ) : tipo.plantilla ? (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">
                                          v{tipo.plantilla.version}
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">
                                          Sin plantilla
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Sección de Descarga de Plantilla */}
                              {seleccionado && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t-2 border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-blue-100">
                                        <FileText className="w-4 h-4 text-blue-700" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                          {/* Mostrar nombre de plantilla del backend o local */}
                                          {tipo.nombre_plantilla || tipo.plantilla?.nombreArchivo || 'Sin archivo adjunto'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {/* Mostrar descripción de plantilla del backend o mensaje por defecto */}
                                          {tipo.descripcion_plantilla || tipo.plantilla?.descripcion || 'El archivo se adjuntará en el siguiente paso'}
                                        </p>
                                        {/* Mostrar estado de plantilla */}
                                        {tipo.estado_plantilla && tipo.estado_plantilla !== 'activo' && (
                                          <p className="text-xs text-red-600 font-semibold mt-1">
                                            ⚠️ Plantilla inactiva
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDescargarPlantilla();
                                      }}
                                      // Deshabilitar si está descargando O si no hay plantilla disponible
                                      disabled={descargando || (!tipoSeleccionado?.plantillaUrl && !tipoSeleccionado?.plantilla)}
                                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${plantillaDescargada
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900'
                                        }`}
                                    >
                                      {descargando ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          <span className="hidden sm:inline">Descargando...</span>
                                        </>
                                      ) : plantillaDescargada ? (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          <span className="hidden sm:inline">Descargada</span>
                                          <span className="sm:hidden">✓</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-4 h-4" />
                                          <span className="hidden sm:inline">Descargar</span>
                                          <span className="sm:hidden">Descargar</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {plantillaDescargada && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg"
                                    >
                                      <p className="text-xs font-semibold text-green-800 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5" />
                                        Plantilla lista para diligenciar. Completa el formulario mientras trabajas en el documento.
                                      </p>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}

                              {/* Glow Effect on Hover */}
                              {!seleccionado && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ==================== PASO 2: INFORMACIÓN ==================== */}
                {paso === 2 && tipoSeleccionado && (
                  <motion.div
                    key="paso2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    {/* Tipo Seleccionado */}
                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-green-600/10">
                          <CheckCircle className="w-5 h-5 text-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-900 mb-1">
                            Tipo de Auto Seleccionado
                          </p>
                          <p className="text-base font-black text-green-900">
                            {tipoSeleccionado.nombre}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Formulario Premium */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                        {/* Fecha del Auto */}
                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Fecha del Auto
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={fechaAuto}
                            onChange={(e) => setFechaAuto(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-medium shadow-sm"
                          />
                        </div>

                        {/* Fecha de Vencimiento */}
                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            Fecha de Vencimiento
                            <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="date"
                            value={fechaVencimiento}
                            onChange={(e) => setFechaVencimiento(e.target.value)}
                            min={fechaAuto}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-medium shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-blue-600" />
                          Observaciones del Auto
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          rows={6}
                          placeholder="Describe el contexto, motivación, consideraciones legales o cualquier información relevante sobre este auto..."
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-medium resize-none shadow-sm"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs font-semibold ${observaciones.length < 10 ? 'text-gray-400' : 'text-green-600'
                            }`}>
                            {observaciones.length} caracteres {observaciones.length < 10 && '(mínimo 10)'}
                          </p>
                          {observaciones.length >= 10 && (
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Observaciones válidas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== PASO 3: ADJUNTAR ==================== */}
                {paso === 3 && tipoSeleccionado && (
                  <motion.div
                    key="paso3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    {/* Alerta de Descarga */}
                    {!plantillaDescargada && (
                      <div
                        className="rounded-2xl p-5"
                        style={{
                          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 rounded-xl bg-amber-600/10">
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900 mb-1">
                              Recuerda descargar la plantilla
                            </p>
                            <p className="text-xs text-amber-800">
                              Asegúrate de haber descargado y diligenciado la plantilla oficial antes de adjuntar el archivo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload Area Premium */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      {!archivoAdjunto ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer group hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300"
                        >
                          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-10 h-10 text-blue-600" />
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-2">
                            {subiendo ? 'Cargando archivo...' : 'Arrastra o haz clic para subir'}
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            Formatos soportados: .doc, .docx, .pdf
                          </p>
                          {subiendo && (
                            <div className="w-48 h-1.5 mx-auto bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-blue-600 to-blue-800"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="space-y-4"
                        >
                          {/* Archivo Cargado */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-green-600/10">
                                <File className="w-6 h-6 text-green-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-green-900 mb-1 truncate">
                                  {archivoAdjunto.name}
                                </p>
                                <p className="text-xs text-green-700">
                                  {(archivoAdjunto.size / 1024).toFixed(2)} KB • Cargado correctamente
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setArchivoAdjunto(null);
                                  setObservacionesAdjunto('');
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <X className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          </div>

                          {/* Observaciones del Adjunto */}
                          <div>
                            <label className="text-sm font-bold text-gray-900 mb-2 block">
                              Notas sobre el archivo (Opcional)
                            </label>
                            <textarea
                              value={observacionesAdjunto}
                              onChange={(e) => setObservacionesAdjunto(e.target.value)}
                              rows={3}
                              placeholder="Agrega notas adicionales sobre el archivo adjuntado..."
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                          </div>
                        </motion.div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ==================== PASO 4: CONFIRMAR ==================== */}
                {paso === 4 && tipoSeleccionado && archivoAdjunto && (
                  <motion.div
                    key="paso4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto space-y-6"
                  >
                    {/* Success Header */}
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-green-600/10">
                          <Shield className="w-8 h-8 text-green-700" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-green-900 mb-1">
                            ✅ Todo listo para crear el auto
                          </p>
                          <p className="text-sm text-green-700 font-medium">
                            Revisa cuidadosamente la información antes de confirmar
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resumen Premium */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                          <Star className="w-5 h-5 text-blue-600" />
                          Resumen del Auto
                        </h3>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">PROCESO</p>
                            <p className="text-sm font-black text-gray-900">{proceso.numeroProceso}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">ETAPA</p>
                            <p className="text-sm font-black text-gray-900">{proceso.etapaActual}</p>
                          </div>
                        </div>

                        {/* Tipo de Auto */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                          <p className="text-xs font-semibold text-blue-700 mb-2">TIPO DE AUTO</p>
                          <p className="text-base font-black text-blue-900">{tipoSeleccionado.nombre}</p>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              FECHA DEL AUTO
                            </p>
                            <p className="text-sm font-black text-gray-900">{fechaAuto}</p>
                          </div>
                          {fechaVencimiento && (
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                VENCIMIENTO
                              </p>
                              <p className="text-sm font-black text-gray-900">{fechaVencimiento}</p>
                            </div>
                          )}
                        </div>

                        {/* Observaciones */}
                        {observaciones && (
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                            <p className="text-xs font-semibold text-amber-700 mb-2">OBSERVACIONES</p>
                            <p className="text-sm text-amber-900 leading-relaxed">{observaciones}</p>
                          </div>
                        )}

                        {/* Archivo */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-xl bg-green-600/10">
                              <Paperclip className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">ARCHIVO ADJUNTO</p>
                              <p className="text-sm font-black text-green-900">{archivoAdjunto.name}</p>
                              <p className="text-xs text-green-700 mt-0.5">
                                {(archivoAdjunto.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          {observacionesAdjunto && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs text-green-800 italic">{observacionesAdjunto}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ==================== VISTA LISTA ==================== */
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {cargandoAutos ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                    <FileText className="w-8 h-8 text-blue-300" />
                  </div>
                  <p className="text-sm text-gray-500">Cargando autos...</p>
                </div>
              ) : autosGenerados.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    Aún no has creado ningún auto
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Crea tu primer auto para este proceso
                  </p>
                  <button
                    onClick={handleNuevoAuto}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Crear Primer Auto
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Botón Crear Nuevo */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleNuevoAuto}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Crear Nuevo Auto
                    </button>
                  </div>

                  {/* Lista de Autos */}
                  {autosGenerados.map((auto) => {
                    const estadoColors: Record<string, { bg: string; text: string; border: string }> = {
                      'BORRADOR': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
                      'REVISION_JEFE': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
                      'APROBADO': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
                      'FIRMADO': { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
                      'NOTIFICADO': { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
                      'DEVUELTO': { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
                    };
                    const colors = estadoColors[auto.estado] || { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };

                    return (
                      <div
                        key={auto.id}
                        className="bg-white border-2 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                        style={{ borderColor: colors.border + '80' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl" style={{ background: colors.bg }}>
                              <FileText className="w-5 h-5" style={{ color: colors.text }} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-sm">{auto.numero}</p>
                              <p className="text-xs text-gray-500">{auto.tipo?.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{auto.fecha}</span>
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                            >
                              {auto.estado?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        {auto.archivoAdjunto && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <Paperclip className="w-3 h-3" />
                            <span>{auto.archivoAdjunto.nombre}</span>
                            {auto.archivoAdjunto.tamano && <span>({auto.archivoAdjunto.tamano})</span>}
                          </div>
                        )}
                        {auto.observaciones && (
                          <p className="mt-2 text-xs text-gray-500 italic truncate">{auto.observaciones}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== FOOTER PREMIUM ==================== */}
        {vistaActual === 'wizard' && (
          <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Botón Anterior */}
              <div>
                {paso > 1 && (
                  <button
                    onClick={handleAnterior}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-sm border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>

                {paso < 4 ? (
                  <button
                    onClick={handleSiguiente}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrearAuto}
                    disabled={guardando}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    <Send className="w-4 h-4" />
                    <span>{guardando ? 'Guardando...' : 'Crear Auto'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
