/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WIZARD DE GESTIÓN DE OFICIOS - WORLD CLASS ENTERPRISE DESIGN║
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

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Mail, FileText, Download, Upload, CheckCircle, AlertCircle, AlertTriangle,
  Calendar, User, Send, Search, Clock, Paperclip, Eye, Shield,
  Sparkles, Zap, Star, FileCheck, MessageSquare, Building2,
  Info, Tag, File
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { CATEGORIAS_OFICIOS, type CategoriaOficioId, type TipoOficio } from './configuracion/SeccionPlantillasOficiosUnificada';
import { BadgeNomenclatura } from './components/BadgeNomenclatura';
import { generarNomenclatura, previsualizarNomenclatura, type DocumentoNomenclatura } from './utils/nomenclaturaDocumentos';
import { useOficiosConfigurationActive } from '../../../hooks/useOficiosConfiguration';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

// ==================== DATOS MOCK ====================
const TIPOS_OFICIOS_MOCK: TipoOficio[] = [
  {
    id: 'tipo-oficio-1',
    nombre: 'Oficio de Notificación de Auto',
    descripcion: 'Oficio para notificar autos a las partes del proceso disciplinario',
    categoria: 'NOTIFICACION',
    plantilla: {
      id: 'plantilla-of-1',
      nombre: 'Plantilla Notificación Auto Personal',
      descripcion: 'Para notificar autos mediante oficio personal',
      nombreArchivo: 'OFICIO_NOTIFICACION_AUTO_v2024.docx',
      url: '',
      tamano: 0,
      tipoArchivo: 'docx',
      version: '1.5',
      fechaCreacion: '2024-01-10',
      fechaModificacion: '2024-01-10',
      activo: true
    },
    activo: true,
    orden: 1,
    fechaCreacion: '2024-01-10',
    fechaModificacion: '2024-01-10'
  },
  {
    id: 'tipo-oficio-2',
    nombre: 'Oficio de Requerimiento de Información',
    descripcion: 'Oficio para solicitar información a entidades externas',
    categoria: 'COMUNICACION_EXTERNA',
    plantilla: {
      id: 'plantilla-of-2',
      nombre: 'Plantilla Requerimiento Información Estándar',
      descripcion: 'Para solicitar información a entidades del Estado',
      nombreArchivo: 'OFICIO_REQUERIMIENTO_INFO_v2024.docx',
      url: '',
      tamano: 0,
      tipoArchivo: 'docx',
      version: '2.0',
      fechaCreacion: '2024-01-15',
      fechaModificacion: '2024-01-15',
      activo: true
    },
    activo: true,
    orden: 2,
    fechaCreacion: '2024-01-15',
    fechaModificacion: '2024-01-15'
  },
  {
    id: 'tipo-oficio-3',
    nombre: 'Oficio de Citación a Audiencia',
    descripcion: 'Oficio para citar a las partes a audiencias del proceso',
    categoria: 'CITACION',
    plantilla: {
      id: 'plantilla-of-3',
      nombre: 'Plantilla Citación Audiencia',
      descripcion: 'Para citar a audiencias disciplinarias',
      nombreArchivo: 'OFICIO_CITACION_AUDIENCIA_v2024.docx',
      url: '',
      tamano: 0,
      tipoArchivo: 'docx',
      version: '1.8',
      fechaCreacion: '2024-01-20',
      fechaModificacion: '2024-01-20',
      activo: true
    },
    activo: true,
    orden: 3,
    fechaCreacion: '2024-01-20',
    fechaModificacion: '2024-01-20'
  },
  {
    id: 'tipo-oficio-4',
    nombre: 'Oficio Remisorio a Procuraduría',
    descripcion: 'Oficio para remitir expedientes a la Procuraduría General de la Nación',
    categoria: 'COMUNICACION_EXTERNA',
    plantilla: {
      id: 'plantilla-of-4',
      nombre: 'Plantilla Remisión Procuraduría',
      descripcion: 'Para remitir casos a Procuraduría',
      nombreArchivo: 'OFICIO_REMISION_PROCURADURIA_v2024.docx',
      url: '',
      tamano: 0,
      tipoArchivo: 'docx',
      version: '1.3',
      fechaCreacion: '2024-02-01',
      fechaModificacion: '2024-02-01',
      activo: true
    },
    activo: true,
    orden: 4,
    fechaCreacion: '2024-02-01',
    fechaModificacion: '2024-02-01'
  }
];

// ==================== INTERFACES ====================
interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface ProcesoCompleto {
  id?: string;
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  etapaActual: string;
  cedula: string;
  noticiaOrigen: string;
}

interface OficioGenerado {
  id: string;
  numero: string;
  tipo: string;
  fecha: string;
  destinatario: string;
  asunto: string;
  estado: string;
}

interface WizardOficiosWorldClassProps {
  proceso: ProcesoCompleto;
  onClose: () => void;
  onOficioCreado?: (oficio: any) => void;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function WizardOficiosWorldClass({
  proceso,
  onClose,
  onOficioCreado
}: WizardOficiosWorldClassProps) {
  // Estados del Wizard
  const [paso, setPaso] = useState(1);
  const [vistaActual, setVistaActual] = useState<'wizard' | 'lista'>('wizard');

  // Estados del Paso 1
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoOficio | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaOficioId | 'todas'>('todas');
  const [plantillaDescargada, setPlantillaDescargada] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // ✅ Estados de Nomenclatura
  const [nomenclaturaGenerada, setNomenclaturaGenerada] = useState<DocumentoNomenclatura | null>(null);

  // Estados del Paso 2
  const [fechaOficio, setFechaOficio] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Estados del Paso 3
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [observacionesAdjunto, setObservacionesAdjunto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Oficios Generados - se cargan desde el backend
  const [oficiosGenerados, setOficiosGenerados] = useState<OficioGenerado[]>([]);

  // Hook para obtener configuraciones de oficios del backend
  const { configurations: tiposOficiosBackend, loading: loadingTipos, refetch: recargarTipos } = useOficiosConfigurationActive();

  // Efecto para cargar datos al montar
  useEffect(() => {
    console.log('🔵 [WizardOficiosWorldClass] Montado, recargando tipos...');
    recargarTipos();
  }, []);

  // Efecto para cargar oficios generados del proceso
  useEffect(() => {
    const cargarOficiosGenerados = async () => {
      if (proceso?.id) {
        try {
          console.log('🔵 [WizardOficiosWorldClass] Cargando oficios del proceso:', proceso.id);
          const oficios = await disciplinaryService.getOficios(proceso.id);
          console.log('✅ [WizardOficiosWorldClass] Oficios cargados:', oficios.length);
          
          // Mapear los documentos al formato de oficios generados
          const oficiosMapeados: OficioGenerado[] = oficios.map((oficio: any) => ({
            id: oficio.id,
            numero: oficio.nombre || `Oficio-${oficio.id}`,
            tipo: oficio.descripcion || 'Oficio',
            fecha: oficio.fechaCarga ? new Date(oficio.fechaCarga).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            destinatario: oficio.destinatario || 'No especificado',
            asunto: oficio.asunto || oficio.descripcion || 'Sin asunto',
            estado: 'generado'
          }));
          
          setOficiosGenerados(oficiosMapeados);
        } catch (error) {
          console.error('❌ [WizardOficiosWorldClass] Error cargando oficios:', error);
        }
      }
    };
    
    cargarOficiosGenerados();
  }, [proceso?.id]);

  // Combinar datos mock con datos del backend - SOLO ACTIVOS
  const tiposOficios = useMemo(() => {
    if (tiposOficiosBackend.length > 0) {
      // Filtrar solo activos y mapear
      return tiposOficiosBackend
        .filter((config: any) => config.estado === 'activo')
        .map((config: any) => ({
          id: config.id,
          nombre: config.codigo || config.nombre, // Usar código como nombre si existe
          descripcion: config.descripcion_plantilla || config.descripcion || `Tipo de oficio: ${config.tipo}`,
          categoria: mapStageToCategoria(config.stage),
          plantilla: config.plantilla ? {
            id: config.id,
            nombre: config.nombre_plantilla || 'Plantilla',
            descripcion: config.descripcion_plantilla || '',
            nombreArchivo: config.nombre_plantilla || 'plantilla.docx',
            url: config.plantilla,
            tamano: 0,
            tipoArchivo: 'docx',
            version: config.version_plantilla || '1.0',
            fechaCreacion: config.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            fechaModificacion: config.updatedAt?.split('T')[0] || '',
            activo: config.estado_plantilla === 'activo'
          } : null,
          activo: config.estado === 'activo',
          orden: config.orden,
          codigo: config.codigo, // Guardar código para mostrar
          fechaCreacion: config.createdAt?.split('T')[0] || '',
          fechaModificacion: config.updatedAt?.split('T')[0] || ''
        }));
    }
    // Si no hay datos del backend, usar mocks (solo activos)
    return TIPOS_OFICIOS_MOCK.filter(t => t.activo);
  }, [tiposOficiosBackend]);

  // Función para mapear stage a categoría
  function mapStageToCategoria(stage: string | null): CategoriaOficioId {
    if (!stage) return 'COMUNICACION_EXTERNA';
    const stageMap: Record<string, CategoriaOficioId> = {
      'INDAGACION_PREVIA': 'NOTIFICACION',
      'INVESTIGACION': 'COMUNICACION_EXTERNA',
      'JUZGAMIENTO': 'CITACION'
    };
    return stageMap[stage] || 'COMUNICACION_EXTERNA';
  }

  // ==================== EFECTOS ====================
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFechaOficio(today);
  }, []);

  // ==================== FUNCIONES ====================
  const handleSeleccionarTipo = (tipo: TipoOficio) => {
    setTipoSeleccionado(tipo);
    setPlantillaDescargada(false);
  };

  const handleDescargarPlantilla = async () => {
    // Verificar si hay plantilla disponible (del backend o local)
    const tienePlantillaBackend = tipoSeleccionado?.plantilla?.url && tipoSeleccionado?.plantilla?.activo !== false;
    const tienePlantillaLocal = tipoSeleccionado?.plantilla;
    
    if (!tipoSeleccionado?.plantilla) {
      toast.error('No hay plantilla disponible para descargar');
      return;
    }

    setDescargando(true);

    try {
      // Si tiene plantilla del backend, descargar usando el servicio igual que en configuraciones
      if (tienePlantillaBackend && tipoSeleccionado?.plantilla?.url) {
        // Usar getFileUrl para procesar la URL (igual que en configuraciones)
        const urlProcesada = disciplinaryService.getFileUrl(tipoSeleccionado.plantilla.url);
        const nombreArchivo = tipoSeleccionado.plantilla.nombreArchivo || 'plantilla.docx';
        
        // Usar downloadFileFromUrl igual que en SeccionPlantillasAutosUnificada
        await disciplinaryService.downloadFileFromUrl(urlProcesada, nombreArchivo);
        
        toast.success('Plantilla descargada correctamente', {
          description: nombreArchivo,
          duration: 3000,
        });
      } else if (tienePlantillaLocal && tipoSeleccionado?.plantilla) {
        // Simular descarga para plantillas locales (mock)
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Plantilla descargada correctamente', {
          description: tipoSeleccionado.plantilla.nombreArchivo,
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
      toast.error('Debes seleccionar un tipo de oficio');
      return;
    }
    if (paso === 2) {
      if (!fechaOficio) {
        toast.error('Debes ingresar la fecha del oficio');
        return;
      }
      if (!destinatario || destinatario.length < 3) {
        toast.error('Debes ingresar un destinatario válido');
        return;
      }
      if (!asunto || asunto.length < 10) {
        toast.error('El asunto debe tener al menos 10 caracteres');
        return;
      }
    }
    if (paso === 3 && !archivoAdjunto) {
      toast.error('Debes adjuntar el archivo del oficio');
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
      // Validar que sea PDF (MIME type y extensión)
      const allowedMimeTypes = ['application/pdf'];
      const allowedExtensions = ['.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedMimeTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        toast.error('Tipo de archivo no permitido', {
          description: 'Para Oficios solo se permiten archivos PDF'
        });
        // Limpiar el input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSubiendo(true);
      setTimeout(() => {
        setArchivoAdjunto(file);
        setSubiendo(false);
        toast.success('Archivo cargado correctamente');
      }, 600);
    }
  };

  const handleCrearOficio = async () => {
    if (!tipoSeleccionado) {
      toast.error('Debes seleccionar un tipo de oficio');
      return;
    }
    if (!archivoAdjunto) {
      toast.error('Debes adjuntar el archivo del oficio');
      return;
    }

    setGuardando(true);

    try {
      // ✅ Subir archivo primero
      toast.info('Subiendo archivo...', { duration: 2000 });
      const uploadResult = await disciplinaryService.uploadFile(archivoAdjunto, 'OFICIO');
      const documentUrl = uploadResult.url || uploadResult.filename;
      console.log('✅ Archivo subido, documentUrl:', documentUrl);

      // ✅ Crear el oficio en el backend
      const oficioCreado = await disciplinaryService.createOficio(
        proceso.id || proceso.numeroProceso, // Usar el ID real del proceso o el número como fallback
        {
          nombre: tipoSeleccionado.nombre,
          destinatario: destinatario,
          asunto: asunto,
          descripcion: observaciones,
          etapa: tipoSeleccionado.categoria,
          categoria: tipoSeleccionado.categoria,
          usuarioCarga: 'Sistema'
        },
        archivoAdjunto
      );

      toast.success('Oficio creado exitosamente', {
        description: `${oficioCreado?.id || 'Oficio'} - ${tipoSeleccionado.nombre}`,
        duration: 4000,
      });
      
      // Actualizar la lista de oficios generados
      const nuevoOficio: OficioGenerado = {
        id: oficioCreado?.id || `oficio-${Date.now()}`,
        numero: oficioCreado?.id || `Oficio-${Date.now()}`,
        tipo: tipoSeleccionado.nombre,
        fecha: fechaOficio,
        destinatario: destinatario,
        asunto: asunto,
        estado: 'generado'
      };
      setOficiosGenerados(prev => [nuevoOficio, ...prev]);
      
      if (onOficioCreado) {
        onOficioCreado({
          tipo: tipoSeleccionado.nombre,
          id: oficioCreado?.id,
          fecha: fechaOficio,
          destinatario,
          asunto,
          observaciones,
          archivo: archivoAdjunto.name
        });
      }
      
      // ✅ Reiniciar el formulario sin cerrar el modal
      resetearWizard();
      // Cambiar a la vista de lista para ver el nuevo oficio
      setVistaActual('lista');
    } catch (error) {
      console.error('Error al crear oficio:', error);
      toast.error('No se pudo crear el oficio', {
        description: 'Verifica que el proceso exista en backend y vuelve a intentar'
      });
    } finally {
      setGuardando(false);
    }
  };

  const resetearWizard = () => {
    setPaso(1);
    setTipoSeleccionado(null);
    setFechaOficio(new Date().toISOString().split('T')[0]);
    setDestinatario('');
    setAsunto('');
    setObservaciones('');
    setArchivoAdjunto(null);
    setObservacionesAdjunto('');
    setPlantillaDescargada(false);
    setBusqueda('');
    setFiltroCategoria('todas');
    setNomenclaturaGenerada(null); // ✅ Resetear nomenclatura
  };

  const handleNuevoOficio = () => {
    resetearWizard();
    setVistaActual('wizard');
  };

  const tiposFiltrados = tiposOficios.filter(tipo => {
    const cumpleFiltroCategoria = filtroCategoria === 'todas' || tipo.categoria === filtroCategoria;
    const cumpleBusqueda = tipo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                           tipo.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltroCategoria && cumpleBusqueda;
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
          {/* Gradient Background - Verde/Esmeralda para Oficios */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)'
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
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Gestión de Oficios
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-emerald-100 font-medium">
                      {proceso.numeroProceso}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-emerald-300" />
                    <p className="text-sm text-emerald-100 font-medium hidden sm:block">
                      {proceso.denunciado?.nombre || 'Cargando...'}
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
                onClick={handleNuevoOficio}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${
                  vistaActual === 'wizard'
                    ? 'text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${vistaActual === 'wizard' ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Crear Nuevo Oficio</span>
                  <span className="sm:hidden">Nuevo Oficio</span>
                </div>
                {vistaActual === 'wizard' && (
                  <motion.div
                    layoutId="activeTabOficio"
                    className="absolute inset-0 bg-white rounded-t-2xl -z-10 shadow-lg"
                    initial={false}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </button>
              
              <button
                onClick={() => setVistaActual('lista')}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${
                  vistaActual === 'lista'
                    ? 'text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Oficios Generados</span>
                  <span className="sm:hidden">Lista</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    vistaActual === 'lista' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {oficiosGenerados.length}
                  </span>
                </div>
                {vistaActual === 'lista' && (
                  <motion.div
                    layoutId="activeTabOficio"
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
                      { num: 2, label: 'Información', icon: MessageSquare },
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
                            <motion.div
                              initial={false}
                              animate={{
                                scale: isCurrent ? 1.1 : 1,
                                rotate: isCompleted ? 360 : 0
                              }}
                              transition={{ duration: 0.5 }}
                              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                                  : isCurrent
                                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-xl shadow-emerald-500/40'
                                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                              ) : (
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                              )}
                              
                              {isCurrent && (
                                <motion.div
                                  className="absolute inset-0 rounded-2xl border-2 border-emerald-600"
                                  initial={{ scale: 1, opacity: 0.5 }}
                                  animate={{ scale: 1.3, opacity: 0 }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                              )}
                            </motion.div>
                            
                            <p className={`text-xs sm:text-sm font-bold mt-2.5 text-center transition-colors duration-300 hidden sm:block ${
                              isCurrent ? 'text-emerald-700' : isPending ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {step.label}
                            </p>
                          </div>
                          
                          {idx < 3 && (
                            <div className="relative flex-1 h-1 mx-2 sm:mx-3">
                              <div className="absolute inset-0 bg-gray-200 rounded-full" />
                              <motion.div
                                className={`absolute inset-0 rounded-full ${
                                  isCompleted ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-200'
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
                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                        border: '1px solid rgba(5, 150, 105, 0.2)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-emerald-600/10">
                          <Info className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-emerald-900 mb-2">
                            Información del Proceso
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-emerald-700 font-semibold">Proceso:</span>
                              <span className="ml-1.5 text-emerald-900 font-bold">{proceso.numeroProceso}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-emerald-700 font-semibold">Etapa:</span>
                              <span className="ml-1.5 text-emerald-900 font-bold">{proceso.etapaActual}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm sm:col-span-1 col-span-1">
                              <span className="text-emerald-700 font-semibold">Investigado:</span>
                              <span className="ml-1.5 text-emerald-900 font-bold">{proceso.denunciado?.nombre || 'Cargando...'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filtros Premium */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                        <input
                          type="text"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Buscar tipo de oficio..."
                          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium placeholder:text-gray-400 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                      <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value as CategoriaOficioId | 'todas')}
                        className="px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-semibold bg-white shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <option value="todas">📋 Todas las Categorías</option>
                        {(Object.keys(CATEGORIAS_OFICIOS) as CategoriaOficioId[]).map((key) => (
                          <option key={key} value={key}>
                            {CATEGORIAS_OFICIOS[key].nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Grid de Tipos Premium */}
                    {loadingTipos ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium text-gray-600">Cargando tipos de oficios...</p>
                      </div>
                    ) : tiposFiltrados.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          No se encontraron tipos de oficios
                        </p>
                        <p className="text-sm text-gray-500">
                          Configura tipos de oficios en el módulo de Configuración
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {tiposFiltrados.map((tipo) => {
                          const categoria = CATEGORIAS_OFICIOS[tipo.categoria] || { nombre: 'Otro', color: '#6B7280', icon: FileText };
                          
                          const Icon = categoria.icon;
                          const seleccionado = tipoSeleccionado?.id === tipo.id;
                          const tienePlantilla = !!tipo.plantilla;

                          return (
                            <motion.div
                              key={tipo.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ y: -4, transition: { duration: 0.2 } }}
                              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                                seleccionado
                                  ? 'shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-600'
                                  : 'shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-gray-300'
                              }`}
                              style={{
                                background: seleccionado 
                                  ? 'linear-gradient(135deg, #D1FAE5 0%, #FFFFFF 100%)'
                                  : '#FFFFFF'
                              }}
                            >
                              {/* Contenido Principal */}
                              <div 
                                onClick={() => handleSeleccionarTipo(tipo)}
                                className="p-5"
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                                      seleccionado ? 'scale-110' : 'group-hover:scale-105'
                                    }`}
                                    style={{ 
                                      background: `linear-gradient(135deg, ${categoria.color} 0%, ${categoria.color}DD 100%)`,
                                      boxShadow: `0 8px 16px ${categoria.color}40`
                                    }}
                                  >
                                    <Icon className="w-7 h-7 text-white" />
                                  </div>

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
                                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                                        </motion.div>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">
                                      {tipo.descripcion}
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: categoria.color }}
                                      >
                                        {categoria.nombre}
                                      </span>
                                      {tipo.plantilla ? (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">
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
                              {seleccionado && tipo.plantilla ? (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t-2 border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-green-50/50 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-emerald-100">
                                        <FileText className="w-4 h-4 text-emerald-700" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                          {tipo.plantilla.nombreArchivo}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {tipo.plantilla.descripcion}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDescargarPlantilla();
                                      }}
                                      disabled={descargando}
                                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                                        plantillaDescargada
                                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                                          : 'bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900'
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
                                      className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                                    >
                                      <p className="text-xs font-semibold text-emerald-800 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5" />
                                        Plantilla lista para diligenciar. Completa el formulario mientras trabajas en el documento.
                                      </p>
                                    </motion.div>
                                  )}

                                  {/* ✅ NUEVO: Vista Previa de Nomenclatura */}
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-100">
                                          <Tag className="w-4 h-4 text-blue-700" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900 mb-0.5">
                                            Nomenclatura Asignada:
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Se generará automáticamente al crear el oficio
                                          </p>
                                        </div>
                                      </div>
                                      <BadgeNomenclatura 
                                        nomenclatura={previsualizarNomenclatura('OFICIO')}
                                        tipo="OFICIO"
                                        size="sm"
                                        showIcon={true}
                                        showCopy={false}
                                      />
                                    </div>
                                  </motion.div>
                                </motion.div>
                              ) : seleccionado && !tipo.plantilla ? (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t-2 border-amber-100 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-amber-100">
                                        <AlertCircle className="w-4 h-4 text-amber-700" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                          Sin plantilla configurada
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Este tipo de oficio no tiene plantilla asociada. Puede crear el oficio sin usar plantilla.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-100">
                                          <Tag className="w-4 h-4 text-blue-700" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900 mb-0.5">
                                            Nomenclatura Asignada:
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Se generará automáticamente al crear el oficio
                                          </p>
                                        </div>
                                      </div>
                                      <BadgeNomenclatura 
                                        nomenclatura={previsualizarNomenclatura('OFICIO')}
                                        tipo="OFICIO"
                                        size="sm"
                                        showIcon={true}
                                        showCopy={false}
                                      />
                                    </div>
                                  </motion.div>
                                </motion.div>
                              ) : null}

                              {!seleccionado && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5" />
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
                    <div 
                      className="rounded-2xl p-5"
                      style={{
                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                        border: '1px solid rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-emerald-600/10">
                          <CheckCircle className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-900 mb-1">
                            Tipo de Oficio Seleccionado
                          </p>
                          <p className="text-base font-black text-emerald-900">
                            {tipoSeleccionado.nombre}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      <div className="space-y-5">
                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            Fecha del Oficio
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={fechaOficio}
                            onChange={(e) => setFechaOficio(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            Destinatario
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={destinatario}
                            onChange={(e) => setDestinatario(e.target.value)}
                            placeholder="Nombre completo del destinatario..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            Asunto
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={asunto}
                            onChange={(e) => setAsunto(e.target.value)}
                            placeholder="Asunto del oficio..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium shadow-sm"
                          />
                          {asunto && asunto.length < 10 && (
                            <p className="text-xs text-amber-600 mt-1 font-semibold">
                              Mínimo 10 caracteres ({asunto.length}/10)
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            Observaciones
                            <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                          </label>
                          <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={5}
                            placeholder="Notas adicionales sobre el oficio..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium resize-none shadow-sm"
                          />
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

                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      {!archivoAdjunto ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all duration-300"
                        >
                          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-10 h-10 text-emerald-600" />
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-2">
                            {subiendo ? 'Cargando archivo...' : 'Arrastra o haz clic para subir'}
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            Formatos soportados: .pdf
                          </p>
                          {subiendo && (
                            <div className="w-48 h-1.5 mx-auto bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-800"
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
                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-emerald-600/10">
                                <FileText className="w-6 h-6 text-emerald-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-emerald-900 mb-1 truncate">
                                  {archivoAdjunto.name}
                                </p>
                                <p className="text-xs text-emerald-700">
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

                          <div>
                            <label className="text-sm font-bold text-gray-900 mb-2 block">
                              Notas sobre el archivo (Opcional)
                            </label>
                            <textarea
                              value={observacionesAdjunto}
                              onChange={(e) => setObservacionesAdjunto(e.target.value)}
                              rows={3}
                              placeholder="Agrega notas adicionales sobre el archivo adjuntado..."
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                          </div>
                        </motion.div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
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
                    <div 
                      className="rounded-2xl p-6"
                      style={{
                        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                        border: '1px solid rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-600/10">
                          <Shield className="w-8 h-8 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-emerald-900 mb-1">
                            ✅ Todo listo para crear el oficio
                          </p>
                          <p className="text-sm text-emerald-700 font-medium">
                            Revisa cuidadosamente la información antes de confirmar
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                          <Star className="w-5 h-5 text-emerald-600" />
                          Resumen del Oficio
                        </h3>
                      </div>
                      
                      <div className="p-6 space-y-6">
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

                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
                          <p className="text-xs font-semibold text-emerald-700 mb-2">TIPO DE OFICIO</p>
                          <p className="text-base font-black text-emerald-900">{tipoSeleccionado.nombre}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              FECHA
                            </p>
                            <p className="text-sm font-black text-gray-900">{fechaOficio}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              DESTINATARIO
                            </p>
                            <p className="text-sm font-black text-gray-900">{destinatario}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                          <p className="text-xs font-semibold text-blue-700 mb-2">ASUNTO</p>
                          <p className="text-sm text-blue-900 font-bold">{asunto}</p>
                        </div>

                        {observaciones && (
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                            <p className="text-xs font-semibold text-amber-700 mb-2">OBSERVACIONES</p>
                            <p className="text-sm text-amber-900 leading-relaxed">{observaciones}</p>
                          </div>
                        )}

                        {/* ✅ NUEVO: Nomenclatura que se generará */}
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                NOMENCLATURA ASIGNADA
                              </p>
                              <p className="text-sm text-blue-800 font-medium mb-1">
                                Se generará al confirmar la creación
                              </p>
                              <p className="text-xs text-blue-600">
                                Formato: OF-NNN-{new Date().getFullYear()}
                              </p>
                            </div>
                            <BadgeNomenclatura 
                              nomenclatura={previsualizarNomenclatura('OFICIO')}
                              tipo="OFICIO"
                              size="md"
                              showIcon={true}
                              showCopy={false}
                            />
                          </div>
                        </div>

                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-xl bg-emerald-600/10">
                              <Paperclip className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-emerald-700 mb-1">ARCHIVO ADJUNTO</p>
                              <p className="text-sm font-black text-emerald-900">{archivoAdjunto.name}</p>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                {(archivoAdjunto.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          {observacionesAdjunto && (
                            <div className="mt-3 pt-3 border-t border-emerald-200">
                              <p className="text-xs text-emerald-800 italic">{observacionesAdjunto}</p>
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
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {oficiosGenerados.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    Aún no has creado ningún oficio
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Crea tu primer oficio para este proceso
                  </p>
                  <button
                    onClick={handleNuevoOficio}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Crear Primer Oficio
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header de la lista */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <Mail className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900">
                            Oficios del Proceso
                          </h3>
                          <p className="text-sm text-gray-600">
                            {oficiosGenerados.length} oficio{oficiosGenerados.length !== 1 ? 's' : ''} generado{oficiosGenerados.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de oficios */}
                  <div className="grid gap-3">
                    {oficiosGenerados.map((oficio, index) => (
                      <motion.div
                        key={oficio.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                            <FileText className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {oficio.tipo}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {oficio.numero}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex-shrink-0">
                                {oficio.estado === 'generado' ? 'Generado' : oficio.estado}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Fecha:</span>
                                <span className="ml-1 font-medium text-gray-900">{oficio.fecha}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Destinatario:</span>
                                <span className="ml-1 font-medium text-gray-900 truncate">{oficio.destinatario}</span>
                              </div>
                            </div>
                            
                            {oficio.asunto && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-500">Asunto:</span>
                                <p className="text-xs text-gray-900 font-medium mt-0.5 line-clamp-2">
                                  {oficio.asunto}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== FOOTER PREMIUM ==================== */}
        {vistaActual === 'wizard' && (
          <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                {paso > 1 && (
                  <button
                    onClick={handleAnterior}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <X className="w-4 h-4 rotate-90" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

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
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                  >
                    <span>Siguiente</span>
                    <X className="w-4 h-4 -rotate-90" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrearOficio}
                    disabled={guardando}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                  >
                    <Send className="w-4 h-4" />
                    <span>{guardando ? 'Guardando...' : 'Crear Oficio'}</span>
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
