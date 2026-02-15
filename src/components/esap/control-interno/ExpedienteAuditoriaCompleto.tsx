/**
 * ============================================
 * EXPEDIENTE COMPLETO DE AUDITORÍA
 * ============================================
 * 
 * Modal principal que muestra el detalle completo de una auditoría
 * a través de todas sus fases del proceso de auditoría interna.
 * 
 * BASADO EN:
 * - EM-PT-004: Auditorías Internas V3
 * - RF004-RF009: Proceso completo de auditoría
 * - CIG_DOCUMENTO_MAESTRO_CONDENSADO.md
 * 
 * FUNCIONALIDADES:
 * 
 * 📋 TAB 1: INFORMACIÓN GENERAL
 * - Datos básicos de la auditoría (código, nombre, área, tipo)
 * - Estado actual y progreso general
 * - Equipo auditor y responsables
 * - Cronograma y fechas clave
 * - Indicadores de cumplimiento
 * 
 * 🎯 TAB 2: FASE PLANEACIÓN (RF005)
 * - Estudios preliminares
 * - Solicitud de información
 * - Reunión de apertura
 * - Documentos de planeación
 * - Progreso de actividades
 * 
 * ⚡ TAB 3: FASE EJECUCIÓN (RF006-RF008)
 * - Listas de chequeo digitales (RF007)
 * - Registro de hallazgos (RF008)
 * - Evidencias fotográficas y documentales
 * - Entrevistas y reuniones
 * - Reunión de cierre
 * 
 * 📄 TAB 4: FASE COMUNICACIÓN (RF009)
 * - Informe preliminar
 * - Controversias (si aplica)
 * - Informe final
 * - Informe ejecutivo
 * - Plan de mejoramiento generado
 * 
 * 📂 TAB 5: DOCUMENTACIÓN
 * - Repositorio centralizado de todos los documentos
 * - Clasificación por tipo y fase
 * - Metadatos y versiones
 * - Descarga masiva
 * 
 * 📊 TAB 6: HISTORIAL Y AUDITORÍA
 * - Timeline de eventos
 * - Log de cambios (compliance)
 * - Notificaciones enviadas
 * - Registro de acciones
 * 
 * INTEGRACIÓN:
 * - Kanban de Control Interno → Abre este modal
 * - PlaneacionAuditoriaModule → Tab detallado
 * - EjecucionAuditoriaModule → Tab detallado
 * - ComunicacionAuditoriaModule → Tab detallado
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Calendar, Users, Target, Clock, CheckCircle,
  AlertCircle, TrendingUp, Activity, History, FolderOpen,
  FileSearch, Send, Eye, Download, MapPin, Mail, Phone,
  Building2, User, Award, ClipboardCheck, MessageSquare,
  Sparkles, Info, ChevronRight, ChevronDown, Edit2, Trash2,
  Upload, Archive, ExternalLink, Filter, Search, Tag,
  BarChart3, PieChart, LineChart
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

// Sub-módulos de fases
import { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
import { ModalCargarDocumento } from './ModalCargarDocumento';
import {
  ActividadesIntegradas,
  ACTIVIDADES_PLANEACION,
  ACTIVIDADES_EJECUCION,
  ACTIVIDADES_COMUNICACION,
} from './ActividadesAuditoriaIntegradas';

// Secciones de Hallazgos y Tareas
import { SeccionHallazgosExpediente } from './SeccionHallazgosExpediente';
import { SeccionTareasExpediente } from './SeccionTareasExpediente';

// ============ TIPOS ============

type EstadoAuditoria = 'planeacion' | 'ejecucion' | 'comunicacion' | 'seguimiento' | 'finalizada';
type TipoAuditoria = 'Sede' | 'Territorial' | 'Especial';
type NivelRiesgo = 'Alto' | 'Medio' | 'Bajo';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  estado: EstadoAuditoria;
  areaAuditable: string;
  procesoNombre: string;
  nivelRiesgo: NivelRiesgo;
  
  // Responsables
  responsableArea: {
    id: string;
    nombre: string;
    cargo: string;
    email: string;
    telefono?: string;
  };
  
  auditorLider: {
    id: string;
    nombre: string;
    email: string;
    foto?: string;
  };
  
  equipoAuditores: {
    id: string;
    nombre: string;
    rol: string;
    email: string;
    foto?: string;
  }[];
  
  // Cronograma
  cronograma: {
    fechaCreacion: Date;
    fechaInicio: Date;
    fechaFin: Date;
    fechaFinReal?: Date;
    duracionDias: number;
    diasTranscurridos: number;
  };
  
  // Progreso
  progreso: {
    general: number; // 0-100
    planeacion: number;
    ejecucion: number;
    comunicacion: number;
  };
  
  // Estadísticas
  estadisticas: {
    totalHallazgos: number;
    hallazgosCriticos: number;
    hallazgosMayores: number;
    hallazgosMenores: number;
    documentosCargados: number;
    notificacionesEnviadas: number;
  };
  
  // Fechas clave
  fechasClave: {
    planeacionInicio?: Date;
    planeacionFin?: Date;
    ejecucionInicio?: Date;
    ejecucionFin?: Date;
    comunicacionInicio?: Date;
    comunicacionFin?: Date;
    informePreliminar?: Date;
    informeFinal?: Date;
  };
  
  // Metadata
  metadata: {
    creadoPor: string;
    fechaCreacion: Date;
    ultimaModificacion: Date;
    modificadoPor: string;
    version: number;
  };
}

interface DocumentoExpediente {
  id: string;
  nombre: string;
  tipo: 'Oficio' | 'Carta' | 'Acta' | 'Informe' | 'Evidencia' | 'Lista-Chequeo' | 'Otro';
  fase: 'planeacion' | 'ejecucion' | 'comunicacion';
  fechaCarga: Date;
  cargadoPor: string;
  size: string;
  url?: string;
  version?: number;
  descripcion?: string;
}

interface EventoHistorial {
  id: string;
  tipo: 'accion' | 'cambio-estado' | 'notificacion' | 'documento' | 'comentario';
  titulo: string;
  descripcion: string;
  usuario: string;
  fecha: Date;
  icono?: React.ReactNode;
  color?: string;
}

// ============ DATOS DE EJEMPLO ============

const AUDITORIA_EJEMPLO: Auditoria = {
  id: 'aud-001',
  codigo: 'AUD-2025-001',
  nombre: 'Auditoría de Gestión Académica',
  tipo: 'Sede',
  estado: 'ejecucion',
  areaAuditable: 'Dirección Académica Nacional',
  procesoNombre: 'Gestión Académica',
  nivelRiesgo: 'Alto',
  
  responsableArea: {
    id: 'u1',
    nombre: 'María González',
    cargo: 'Directora Académica',
    email: 'mgonzalez@esap.edu.co',
    telefono: '+57 300 123 4567'
  },
  
  auditorLider: {
    id: 'u2',
    nombre: 'Carlos Rodríguez',
    email: 'crodriguez@esap.edu.co',
    foto: undefined
  },
  
  equipoAuditores: [
    {
      id: 'u3',
      nombre: 'Ana Martínez',
      rol: 'Auditor Senior',
      email: 'amartinez@esap.edu.co',
      foto: undefined
    },
    {
      id: 'u4',
      nombre: 'Luis Pérez',
      rol: 'Auditor Junior',
      email: 'lperez@esap.edu.co',
      foto: undefined
    }
  ],
  
  cronograma: {
    fechaCreacion: new Date('2025-01-01'),
    fechaInicio: new Date('2025-01-15'),
    fechaFin: new Date('2025-02-28'),
    fechaFinReal: undefined,
    duracionDias: 45,
    diasTranscurridos: 25
  },
  
  progreso: {
    general: 65,
    planeacion: 100,
    ejecucion: 60,
    comunicacion: 0
  },
  
  estadisticas: {
    totalHallazgos: 8,
    hallazgosCriticos: 2,
    hallazgosMayores: 3,
    hallazgosMenores: 3,
    documentosCargados: 12,
    notificacionesEnviadas: 5
  },
  
  fechasClave: {
    planeacionInicio: new Date('2025-01-15'),
    planeacionFin: new Date('2025-01-22'),
    ejecucionInicio: new Date('2025-01-23'),
    ejecucionFin: undefined,
    comunicacionInicio: undefined,
    comunicacionFin: undefined,
    informePreliminar: undefined,
    informeFinal: undefined
  },
  
  metadata: {
    creadoPor: 'Carlos Rodríguez',
    fechaCreacion: new Date('2025-01-10'),
    ultimaModificacion: new Date('2025-02-09'),
    modificadoPor: 'Carlos Rodríguez',
    version: 1
  }
};

const DOCUMENTOS_EJEMPLO: DocumentoExpediente[] = [
  {
    id: 'doc-001',
    nombre: 'Programa de Auditoría 2025.pdf',
    tipo: 'Informe',
    fase: 'planeacion',
    fechaCarga: new Date('2025-01-15'),
    cargadoPor: 'Carlos Rodríguez',
    size: '2.5 MB',
    version: 1,
    descripcion: 'Programa anual de auditorías'
  },
  {
    id: 'doc-002',
    nombre: 'Acta Reunión Apertura.pdf',
    tipo: 'Acta',
    fase: 'planeacion',
    fechaCarga: new Date('2025-01-16'),
    cargadoPor: 'Carlos Rodríguez',
    size: '1.2 MB',
    version: 1,
    descripcion: 'Acta de reunión de apertura'
  },
  {
    id: 'doc-003',
    nombre: 'Lista de Chequeo - Gestión Académica.pdf',
    tipo: 'Lista-Chequeo',
    fase: 'ejecucion',
    fechaCarga: new Date('2025-01-25'),
    cargadoPor: 'Ana Martínez',
    size: '3.8 MB',
    version: 1,
    descripcion: 'Lista de chequeo aplicada'
  }
];

const HISTORIAL_EJEMPLO: EventoHistorial[] = [
  {
    id: 'evt-001',
    tipo: 'cambio-estado',
    titulo: 'Auditoría iniciada',
    descripcion: 'Se inició la auditoría de Gestión Académica',
    usuario: 'Carlos Rodríguez',
    fecha: new Date('2025-01-15T08:00:00'),
    icono: <CheckCircle className="w-5 h-5" />,
    color: '#10b981'
  },
  {
    id: 'evt-002',
    tipo: 'documento',
    titulo: 'Documento cargado',
    descripcion: 'Se cargó el Programa de Auditoría',
    usuario: 'Carlos Rodríguez',
    fecha: new Date('2025-01-15T09:30:00'),
    icono: <FileText className="w-5 h-5" />,
    color: '#3b82f6'
  },
  {
    id: 'evt-003',
    tipo: 'notificacion',
    titulo: 'Notificación enviada',
    descripcion: 'Se envió notificación al área auditada',
    usuario: 'Sistema',
    fecha: new Date('2025-01-15T10:00:00'),
    icono: <Send className="w-5 h-5" />,
    color: '#8b5cf6'
  }
];

// ============ COMPONENTE PRINCIPAL ============

interface ExpedienteAuditoriaCompletoProps {
  auditoriaId?: string;
  isOpen: boolean;
  onClose: () => void;
  tabInicial?: string;
}

export function ExpedienteAuditoriaCompleto({
  auditoriaId,
  isOpen,
  onClose,
  tabInicial = 'general',
}: ExpedienteAuditoriaCompletoProps) {
  // Estado
  const [auditoria] = useState<Auditoria>(AUDITORIA_EJEMPLO);
  const [documentos] = useState<DocumentoExpediente[]>(DOCUMENTOS_EJEMPLO);
  const [historial] = useState<EventoHistorial[]>(HISTORIAL_EJEMPLO);
  
  // ✅ AUTO-DETECCIÓN: Si no se especifica tab, detectar según el estado de la auditoría
  const getTabAutomatico = () => {
    if (tabInicial !== 'general') return tabInicial;
    
    // Si el estado es Planeación, Ejecución o Comunicación, abrir directamente ese tab
    const estadoLowerCase = auditoria.estado.toLowerCase();
    if (estadoLowerCase === 'planeación' || estadoLowerCase === 'planeacion') return 'planeacion';
    if (estadoLowerCase === 'ejecución' || estadoLowerCase === 'ejecucion') return 'ejecucion';
    if (estadoLowerCase === 'comunicación' || estadoLowerCase === 'comunicacion') return 'comunicacion';
    
    return 'general';
  };
  
  const [activeTab, setActiveTab] = useState(getTabAutomatico());
  const [mostrarDetalles, setMostrarDetalles] = useState(true);
  const [filtroDocumentos, setFiltroDocumentos] = useState<string>('todos');

  // Cálculos
  const diasRestantes = useMemo(() => {
    if (!auditoria.cronograma?.fechaFin) return 0;
    const hoy = new Date();
    const fin = new Date(auditoria.cronograma.fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria.cronograma?.fechaFin]);

  const progresoTiempo = useMemo(() => {
    if (!auditoria.cronograma?.diasTranscurridos || !auditoria.cronograma?.duracionDias) return 0;
    return Math.round(
      (auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100
    );
  }, [auditoria.cronograma]);

  const documentosFiltrados = useMemo(() => {
    if (filtroDocumentos === 'todos') return documentos;
    return documentos.filter((doc) => doc.fase === filtroDocumentos);
  }, [documentos, filtroDocumentos]);

  // Funciones
  const exportarExpediente = () => {
    toast.success('Exportando expediente completo...', {
      description: 'Se generará un PDF con toda la información de la auditoría',
    });
  };

  const archivarAuditoria = () => {
    toast.info('Archivar auditoría', {
      description: 'Funcionalidad en desarrollo',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[110]" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-6 overflow-y-auto pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col my-auto pointer-events-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-white">
                    Expediente de Auditoría
                  </h2>
                  <p className="text-sm text-blue-100">
                    {auditoria.codigo} - {auditoria.nombre}
                  </p>
                </div>
              </div>

              {/* Metadatos rápidos */}
              <div className="flex items-center gap-6 text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{auditoria.areaAuditable}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{auditoria.tipo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{diasRestantes} días restantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>{auditoria.progreso.general}% completado</span>
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-2">
              <ButtonSIGL
                variant="ghost"
                size="sm"
                onClick={exportarExpediente}
                className="text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </ButtonSIGL>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Indicadores de estado */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BadgeSIGL
                  variant={
                    auditoria.estado === 'finalizada'
                      ? 'success'
                      : auditoria.estado === 'ejecucion'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {auditoria.estado === 'planeacion' && '🎯 Planeación'}
                  {auditoria.estado === 'ejecucion' && '⚡ Ejecución'}
                  {auditoria.estado === 'comunicacion' && '📄 Comunicación'}
                  {auditoria.estado === 'seguimiento' && '🔍 Seguimiento'}
                  {auditoria.estado === 'finalizada' && '✅ Finalizada'}
                </BadgeSIGL>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Nivel de Riesgo:</span>
                  <BadgeSIGL
                    variant={
                      auditoria.nivelRiesgo === 'Alto'
                        ? 'danger'
                        : auditoria.nivelRiesgo === 'Medio'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {auditoria.nivelRiesgo}
                  </BadgeSIGL>
                </div>

                {auditoria.estadisticas.totalHallazgos > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>
                      {auditoria.estadisticas.totalHallazgos} hallazgos identificados
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de progreso mini */}
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">Progreso general:</div>
                <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{ width: `${auditoria.progreso.general}%` }}
                  />
                </div>
                <span className="text-sm text-gray-900 w-10 text-right">
                  {auditoria.progreso.general}%
                </span>
              </div>
            </div>
          </div>

          {/* Tabs y contenido */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 pt-4 border-b border-gray-200">
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="general" className="gap-2">
                    <Info className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="planeacion" className="gap-2">
                    <FileSearch className="w-4 h-4" />
                    Planeación
                  </TabsTrigger>
                  <TabsTrigger value="ejecucion" className="gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Ejecución
                  </TabsTrigger>
                  <TabsTrigger value="comunicacion" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Comunicación
                  </TabsTrigger>
                  <TabsTrigger value="documentacion" className="gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Documentación
                    {documentos.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {documentos.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="historial" className="gap-2">
                    <History className="w-4 h-4" />
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* TAB 1: GENERAL */}
                <TabsContent value="general" className="mt-0">
                  <TabGeneral auditoria={auditoria} />
                </TabsContent>

                {/* TAB 2: PLANEACIÓN */}
                <TabsContent value="planeacion" className="mt-0">
                  <TabPlaneacion auditoria={auditoria} />
                </TabsContent>

                {/* TAB 3: EJECUCIÓN */}
                <TabsContent value="ejecucion" className="mt-0">
                  <TabEjecucion auditoria={auditoria} />
                </TabsContent>

                {/* TAB 4: COMUNICACIÓN */}
                <TabsContent value="comunicacion" className="mt-0">
                  <TabComunicacion auditoria={auditoria} />
                </TabsContent>

                {/* TAB 5: DOCUMENTACIÓN */}
                <TabsContent value="documentacion" className="mt-0">
                  <TabDocumentacion
                    documentos={documentosFiltrados}
                    filtro={filtroDocumentos}
                    onFiltroChange={setFiltroDocumentos}
                  />
                </TabsContent>

                {/* TAB 6: HISTORIAL */}
                <TabsContent value="historial" className="mt-0">
                  <TabHistorial eventos={historial} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ============ TABS INDIVIDUALES ============

// TAB 1: GENERAL
function TabGeneral({ auditoria }: { auditoria: Auditoria }) {
  return (
    <div className="space-y-6">
      {/* Resumen ejecutivo */}
      <CardSIGL>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg text-gray-900">Resumen Ejecutivo</h3>
          <ButtonSIGL variant="ghost" size="sm">
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </ButtonSIGL>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna 1: Información básica */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Código de Auditoría
              </label>
              <p className="text-sm text-gray-900 mt-1">{auditoria.codigo}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Área Auditable
              </label>
              <p className="text-sm text-gray-900 mt-1">{auditoria.areaAuditable}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Proceso
              </label>
              <p className="text-sm text-gray-900 mt-1">{auditoria.procesoNombre}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">
                Tipo de Auditoría
              </label>
              <div className="mt-1">
                <BadgeSIGL variant="neutral">{auditoria.tipo}</BadgeSIGL>
              </div>
            </div>
          </div>

          {/* Columna 2: Responsable del área */}
          <div className="space-y-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Responsable del Área Auditada
            </label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {auditoria.responsableArea.nombre}
                  </p>
                  <p className="text-xs text-gray-500">{auditoria.responsableArea.cargo}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs">{auditoria.responsableArea.email}</span>
                </div>
                {auditoria.responsableArea.telefono && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs">{auditoria.responsableArea.telefono}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna 3: Equipo auditor */}
          <div className="space-y-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Equipo Auditor
            </label>
            <div className="space-y-3">
              {/* Auditor Líder */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-700 uppercase tracking-wide">
                    Auditor Líder
                  </span>
                </div>
                <p className="text-sm text-gray-900">{auditoria.auditorLider.nombre}</p>
                <p className="text-xs text-gray-500 mt-1">{auditoria.auditorLider.email}</p>
              </div>

              {/* Equipo */}
              {auditoria.equipoAuditores.map((auditor) => (
                <div key={auditor.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-900">{auditor.nombre}</p>
                  <p className="text-xs text-gray-500">{auditor.rol}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Cronograma */}
      <CardSIGL>
        <h3 className="text-lg text-gray-900 mb-4">Cronograma y Plazos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-600 uppercase tracking-wide">
                Fecha Inicio
              </span>
            </div>
            <p className="text-lg text-gray-900">
              {new Date(auditoria.cronograma.fechaInicio).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-gray-600 uppercase tracking-wide">
                Fecha Fin Estimada
              </span>
            </div>
            <p className="text-lg text-gray-900">
              {new Date(auditoria.cronograma.fechaFin).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-xs text-gray-600 uppercase tracking-wide">
                Duración Total
              </span>
            </div>
            <p className="text-lg text-gray-900">
              {auditoria.cronograma.duracionDias} días
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-xs text-gray-600 uppercase tracking-wide">
                Días Transcurridos
              </span>
            </div>
            <p className="text-lg text-gray-900">
              {auditoria.cronograma.diasTranscurridos} / {auditoria.cronograma.duracionDias}
            </p>
          </div>
        </div>

        {/* Barra de progreso temporal */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Avance temporal</span>
            <span className="text-sm text-gray-900">
              {Math.round(
                (auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100
              )}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
              style={{
                width: `${
                  (auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100
                }%`,
              }}
            />
          </div>
        </div>
      </CardSIGL>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSIGL>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-700">Hallazgos Identificados</h3>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl text-gray-900 mb-4">
            {auditoria.estadisticas.totalHallazgos}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600">● Críticos</span>
              <span className="text-gray-900">{auditoria.estadisticas.hallazgosCriticos}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-600">● Mayores</span>
              <span className="text-gray-900">{auditoria.estadisticas.hallazgosMayores}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-600">● Menores</span>
              <span className="text-gray-900">{auditoria.estadisticas.hallazgosMenores}</span>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-700">Documentos</h3>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl text-gray-900 mb-2">
            {auditoria.estadisticas.documentosCargados}
          </p>
          <p className="text-sm text-gray-500">archivos en el expediente</p>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-700">Notificaciones</h3>
            <Send className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl text-gray-900 mb-2">
            {auditoria.estadisticas.notificacionesEnviadas}
          </p>
          <p className="text-sm text-gray-500">enviadas al área auditada</p>
        </CardSIGL>
      </div>

      {/* Progreso por fases */}
      <CardSIGL>
        <h3 className="text-lg text-gray-900 mb-4">Progreso por Fases</h3>
        <div className="space-y-4">
          {/* Planeación */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-700">Planeación</span>
              </div>
              <span className="text-sm text-gray-900">{auditoria.progreso.planeacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${auditoria.progreso.planeacion}%` }}
              />
            </div>
          </div>

          {/* Ejecución */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-700">Ejecución</span>
              </div>
              <span className="text-sm text-gray-900">{auditoria.progreso.ejecucion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all"
                style={{ width: `${auditoria.progreso.ejecucion}%` }}
              />
            </div>
          </div>

          {/* Comunicación */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Comunicación</span>
              </div>
              <span className="text-sm text-gray-900">{auditoria.progreso.comunicacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${auditoria.progreso.comunicacion}%` }}
              />
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}

// TAB 2: PLANEACIÓN
function TabPlaneacion({ auditoria }: { auditoria: Auditoria }) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm text-purple-900">
              <strong>Fase de Planeación</strong> - Gestión integrada de actividades
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Completa las 3 actividades para avanzar a la fase de Ejecución
            </p>
          </div>
        </div>
      </div>

      <ActividadesIntegradas
        actividades={ACTIVIDADES_PLANEACION}
        faseTitulo="Planeación"
        faseColor="#9333ea"
        estadoRequerido="Planeación"
        estadoActual={auditoria.estado}
      />
    </div>
  );
}

// TAB 3: EJECUCIÓN
function TabEjecucion({ auditoria }: { auditoria: Auditoria }) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm text-amber-900">
              <strong>Fase de Ejecución</strong> - Gestión de hallazgos, tareas y actividades
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Registra hallazgos, gestiona tareas y completa actividades para avanzar a Comunicación
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN: HALLAZGOS */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-5">
        <SeccionHallazgosExpediente auditoriaId={auditoria.id} />
      </div>

      {/* SECCIÓN: TAREAS Y ACTIVIDADES */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <SeccionTareasExpediente auditoriaId={auditoria.id} />
      </div>

      {/* ACTIVIDADES DE LA FASE (Sistema anterior) */}
      <ActividadesIntegradas
        actividades={ACTIVIDADES_EJECUCION}
        faseTitulo="Ejecución"
        faseColor="#f59e0b"
        estadoRequerido="Ejecución"
        estadoActual={auditoria.estado}
      />
    </div>
  );
}

// TAB 4: COMUNICACIÓN
function TabComunicacion({ auditoria }: { auditoria: Auditoria }) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm text-green-900">
              <strong>Fase de Comunicación</strong> - Gestión integrada de actividades
            </p>
            <p className="text-xs text-green-700 mt-1">
              Completa las 3 actividades para avanzar a la fase de Seguimiento
            </p>
          </div>
        </div>
      </div>

      <ActividadesIntegradas
        actividades={ACTIVIDADES_COMUNICACION}
        faseTitulo="Comunicación"
        faseColor="#10b981"
        estadoRequerido="Comunicación"
        estadoActual={auditoria.estado}
      />
    </div>
  );
}

// TAB 5: DOCUMENTACIÓN
function TabDocumentacion({
  documentos,
  filtro,
  onFiltroChange,
}: {
  documentos: DocumentoExpediente[];
  filtro: string;
  onFiltroChange: (filtro: string) => void;
}) {
  const [modalCargarDocumento, setModalCargarDocumento] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">Filtrar por fase:</span>
            <div className="flex gap-2">
              {['todos', 'planeacion', 'ejecucion', 'comunicacion'].map((f) => (
                <button
                  key={f}
                  onClick={() => onFiltroChange(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    filtro === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <ButtonSIGL 
            variant="primary" 
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => setModalCargarDocumento(true)}
          >
            Cargar Documento
          </ButtonSIGL>
        </div>

        {/* Lista de documentos */}
        <div className="space-y-2">
          {documentos.map((doc) => (
            <CardSIGL key={doc.id} className="!p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-gray-900 truncate">{doc.nombre}</p>
                    {doc.version && (
                      <BadgeSIGL variant="neutral" className="!text-xs">
                        v{doc.version}
                      </BadgeSIGL>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{doc.tipo}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>{new Date(doc.fechaCarga).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{doc.cargadoPor}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </CardSIGL>
          ))}
        </div>

        {documentos.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay documentos en esta categoría</p>
          </div>
        )}
      </div>

      {/* MODAL CARGAR DOCUMENTO */}
      {modalCargarDocumento && (
        <ModalCargarDocumento
          onClose={() => setModalCargarDocumento(false)}
          onGuardar={(documento) => {
            // TODO: Agregar el documento a la lista
            toast.success('Documento cargado exitosamente', {
              description: `${documento.nombre} agregado al expediente`,
            });
            setModalCargarDocumento(false);
          }}
        />
      )}
    </>
  );
}

// TAB 6: HISTORIAL
function TabHistorial({ eventos }: { eventos: EventoHistorial[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-700">Timeline de Actividad</h3>
        <span className="text-xs text-gray-500">{eventos.length} eventos registrados</span>
      </div>

      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Eventos */}
        <div className="space-y-4">
          {eventos.map((evento, index) => (
            <div key={evento.id} className="relative flex gap-4">
              {/* Icono */}
              <div
                className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${evento.color}20`,
                  color: evento.color,
                }}
              >
                {evento.icono}
              </div>

              {/* Contenido */}
              <CardSIGL className="flex-1 !p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-900">{evento.titulo}</p>
                    <p className="text-xs text-gray-500 mt-1">{evento.descripcion}</p>
                  </div>
                  <BadgeSIGL variant="neutral" className="!text-xs">
                    {evento.tipo}
                  </BadgeSIGL>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {evento.usuario}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(evento.fecha).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </CardSIGL>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}