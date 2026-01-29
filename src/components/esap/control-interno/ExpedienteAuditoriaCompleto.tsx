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

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Calendar, Users, Target, Clock, CheckCircle,
  AlertCircle, TrendingUp, Activity, History, FolderOpen,
  FileSearch, Send, Eye, Download, MapPin, Mail, Phone,
  Building2, User, Award, ClipboardCheck, MessageSquare,
  Sparkles, Info, ChevronRight, ChevronDown, Edit2, Trash2,
  Upload, Archive, ExternalLink, Filter, Search, Tag,
  BarChart3, PieChart, LineChart, Loader2, CheckCircle2,
  // Iconos adicionales para actividades mapeadas
  ClipboardList, FileCheck, Shield, Zap, Settings, Database,
  Network, Layers, Box, Package, Grid, List, BookOpen,
  Briefcase, Folder, FileCode, Terminal, Cpu, HardDrive
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { auditoriasApi, notificacionesApi, listasChequeoApi } from './services/api';
import { useCrearNotificacion } from './hooks/useCrearNotificacion';
import { useAuth } from '../../../hooks/useAuth';
import { API_MODE, MICROSERVICE_URLS, getServiceUrl } from '../../../config/environment';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

// Sub-módulos de fases
import { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
import { ModalCargarDocumento } from './ModalCargarDocumento';
import { ModalAgregarHallazgoRapido } from './ModalAgregarHallazgoRapido';
import {
  ActividadesIntegradas,
  ACTIVIDADES_PLANEACION,
  ACTIVIDADES_EJECUCION,
  ACTIVIDADES_COMUNICACION,
  type ActividadAuditoria,
  type ItemChecklist,
} from './ActividadesAuditoriaIntegradas';

// ============ FUNCIÓN HELPER: MAPEAR LISTAS DE CHEQUEO A ACTIVIDADES ============

/**
 * Mapea listas de chequeo de tipo 'ejecucion' a actividades con iconos y colores aleatorios
 */
function mapearListasChequeoAActividades(listasChequeo: any[]): ActividadAuditoria[] {
  // Filtrar solo listas de tipo 'ejecucion'
  const listasEjecucion = listasChequeo.filter(lc => lc.tipo === 'ejecucion' && lc.activa !== false);
  
  // Iconos disponibles
  const iconos = [
    <Target className="w-5 h-5" />,
    <ClipboardList className="w-5 h-5" />,
    <FileText className="w-5 h-5" />,
    <FileCheck className="w-5 h-5" />,
    <Shield className="w-5 h-5" />,
    <Zap className="w-5 h-5" />,
    <Settings className="w-5 h-5" />,
    <Database className="w-5 h-5" />,
    <Network className="w-5 h-5" />,
    <Layers className="w-5 h-5" />,
    <Box className="w-5 h-5" />,
    <Package className="w-5 h-5" />,
    <Grid className="w-5 h-5" />,
    <List className="w-5 h-5" />,
    <BookOpen className="w-5 h-5" />,
    <Briefcase className="w-5 h-5" />,
    <Folder className="w-5 h-5" />,
    <FileCode className="w-5 h-5" />,
    <Terminal className="w-5 h-5" />,
    <Cpu className="w-5 h-5" />,
    <HardDrive className="w-5 h-5" />,
  ];

  // Colores disponibles
  const colores = [
    'amber', 'red', 'indigo', 'blue', 'purple', 'green', 'cyan', 'orange',
    'emerald', 'teal', 'pink', 'rose', 'violet', 'fuchsia', 'sky', 'lime',
    'yellow', 'slate', 'gray', 'zinc', 'stone', 'neutral'
  ];

  // Función para generar un índice determinístico basado en el ID
  const obtenerIndice = (id: string, max: number): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % max;
  };

  return listasEjecucion.map((lista) => {
    const iconoIndex = obtenerIndice(lista.id, iconos.length);
    const colorIndex = obtenerIndice(lista.id + 'color', colores.length);
    
    // Mapear items de la lista a ItemChecklist
    const checklist: ItemChecklist[] = (lista.items || []).map((item: any, index: number) => ({
      id: item.id || `${lista.id}-item-${index}`,
      texto: item.texto || item.criterio || `Item ${index + 1}`,
    }));

    return {
      id: lista.id,
      titulo: lista.nombre || 'Lista de Chequeo',
      descripcion: lista.descripcion || 'Lista de chequeo de ejecución',
      icono: iconos[iconoIndex],
      color: colores[colorIndex],
      checklist: checklist,
    };
  });
}

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
    checklistCompletados?: Record<string, boolean>;
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
  tipoMime?: string; // Tipo MIME del archivo para determinar si es previsualizable
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
  nombre: 'Auditoría Interna de Gestión Financiera y Presupuestal',
  tipo: 'Sede',
  estado: 'ejecucion',
  areaAuditable: 'Dirección Financiera',
  procesoNombre: 'Gestión Presupuestal y Contabilidad',
  nivelRiesgo: 'Alto',
  
  responsableArea: {
    id: 'per-001',
    nombre: 'María Fernanda González Ruiz',
    cargo: 'Directora Financiera',
    email: 'maria.gonzalez@esap.edu.co',
    telefono: '+57 (1) 220-2790 Ext. 1205',
  },
  
  auditorLider: {
    id: 'aud-001',
    nombre: 'Carlos Andrés Ramírez Torres',
    email: 'carlos.ramirez@esap.edu.co',
  },
  
  equipoAuditores: [
    {
      id: 'aud-002',
      nombre: 'Ana María Martínez López',
      rol: 'Auditora Senior',
      email: 'ana.martinez@esap.edu.co',
    },
    {
      id: 'aud-003',
      nombre: 'Pedro Luis Sánchez Mora',
      rol: 'Auditor Junior',
      email: 'pedro.sanchez@esap.edu.co',
    },
  ],
  
  cronograma: {
    fechaCreacion: new Date(2025, 0, 5),
    fechaInicio: new Date(2025, 0, 15),
    fechaFin: new Date(2025, 1, 15),
    duracionDias: 30,
    diasTranscurridos: 12,
  },
  
  progreso: {
    general: 45,
    planeacion: 100,
    ejecucion: 60,
    comunicacion: 0,
  },
  
  estadisticas: {
    totalHallazgos: 12,
    hallazgosCriticos: 2,
    hallazgosMayores: 5,
    hallazgosMenores: 5,
    documentosCargados: 28,
    notificacionesEnviadas: 15,
  },
  
  fechasClave: {
    planeacionInicio: new Date(2025, 0, 15),
    planeacionFin: new Date(2025, 0, 22),
    ejecucionInicio: new Date(2025, 0, 23),
    informePreliminar: new Date(2025, 1, 5),
  },
  
  metadata: {
    creadoPor: 'Carlos Ramírez',
    fechaCreacion: new Date(2025, 0, 5),
    ultimaModificacion: new Date(2025, 0, 27),
    modificadoPor: 'Ana Martínez',
    version: 3,
  },
};

const DOCUMENTOS_EJEMPLO: DocumentoExpediente[] = [
  {
    id: 'doc-001',
    nombre: 'Oficio de Anuncio de Auditoría',
    tipo: 'Oficio',
    fase: 'planeacion',
    fechaCarga: new Date(2025, 0, 15),
    cargadoPor: 'Carlos Ramírez',
    size: '245 KB',
    version: 1,
  },
  {
    id: 'doc-002',
    nombre: 'Carta de Compromiso - Responsable del Área',
    tipo: 'Carta',
    fase: 'planeacion',
    fechaCarga: new Date(2025, 0, 15),
    cargadoPor: 'Carlos Ramírez',
    size: '180 KB',
    version: 1,
  },
  {
    id: 'doc-003',
    nombre: 'Acta de Reunión de Apertura',
    tipo: 'Acta',
    fase: 'planeacion',
    fechaCarga: new Date(2025, 0, 22),
    cargadoPor: 'Ana Martínez',
    size: '520 KB',
    version: 2,
  },
  {
    id: 'doc-004',
    nombre: 'Lista de Chequeo - Gestión Presupuestal',
    tipo: 'Lista-Chequeo',
    fase: 'ejecucion',
    fechaCarga: new Date(2025, 0, 25),
    cargadoPor: 'Pedro Sánchez',
    size: '340 KB',
    version: 1,
  },
  {
    id: 'doc-005',
    nombre: 'Evidencia Fotográfica - Archivo Documental',
    tipo: 'Evidencia',
    fase: 'ejecucion',
    fechaCarga: new Date(2025, 0, 26),
    cargadoPor: 'Ana Martínez',
    size: '2.3 MB',
  },
];

const HISTORIAL_EJEMPLO: EventoHistorial[] = [
  {
    id: 'evt-001',
    tipo: 'accion',
    titulo: 'Auditoría creada',
    descripcion: 'Se creó la auditoría en el sistema',
    usuario: 'Carlos Ramírez',
    fecha: new Date(2025, 0, 5, 10, 30),
    icono: <Sparkles className="w-4 h-4" />,
    color: '#10B981',
  },
  {
    id: 'evt-002',
    tipo: 'notificacion',
    titulo: 'Notificación enviada',
    descripcion: 'Oficio de anuncio enviado a María González',
    usuario: 'Sistema',
    fecha: new Date(2025, 0, 15, 9, 15),
    icono: <Mail className="w-4 h-4" />,
    color: '#3B82F6',
  },
  {
    id: 'evt-003',
    tipo: 'cambio-estado',
    titulo: 'Cambio a Planeación',
    descripcion: 'La auditoría inició la fase de planeación',
    usuario: 'Carlos Ramírez',
    fecha: new Date(2025, 0, 15, 14, 0),
    icono: <Activity className="w-4 h-4" />,
    color: '#8B5CF6',
  },
  {
    id: 'evt-004',
    tipo: 'documento',
    titulo: 'Documento cargado',
    descripcion: 'Acta de Reunión de Apertura (v2)',
    usuario: 'Ana Martínez',
    fecha: new Date(2025, 0, 22, 16, 45),
    icono: <Upload className="w-4 h-4" />,
    color: '#F59E0B',
  },
  {
    id: 'evt-005',
    tipo: 'cambio-estado',
    titulo: 'Cambio a Ejecución',
    descripcion: 'Planeación completada. Inicio de ejecución',
    usuario: 'Carlos Ramírez',
    fecha: new Date(2025, 0, 23, 8, 0),
    icono: <CheckCircle className="w-4 h-4" />,
    color: '#10B981',
  },
  {
    id: 'evt-006',
    tipo: 'comentario',
    titulo: 'Comentario agregado',
    descripcion: 'Hallazgo crítico identificado en manejo presupuestal',
    usuario: 'Pedro Sánchez',
    fecha: new Date(2025, 0, 26, 11, 20),
    icono: <MessageSquare className="w-4 h-4" />,
    color: '#EF4444',
  },
];

// ============ FUNCIONES HELPER ============

// Función para parsear fechas en formato DD/MM/YYYY
function parseFechaDDMMYYYY(fechaStr: string): Date {
  if (!fechaStr) return new Date();
  
  const partes = fechaStr.split('/');
  if (partes.length === 3) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Los meses en JS son 0-indexed
    const anio = parseInt(partes[2], 10);
    return new Date(anio, mes, dia);
  }
  
  // Si no es formato DD/MM/YYYY, intentar parsear como fecha ISO
  return new Date(fechaStr);
}

// Función para calcular duración en días entre dos fechas
function calcularDuracionDias(fechaInicio: string | Date | undefined, fechaFin: string | Date | undefined): number | null {
  if (!fechaInicio || !fechaFin) return null;
  
  const inicio = typeof fechaInicio === 'string' && fechaInicio.includes('/')
    ? parseFechaDDMMYYYY(fechaInicio)
    : new Date(fechaInicio);
  const fin = typeof fechaFin === 'string' && fechaFin.includes('/')
    ? parseFechaDDMMYYYY(fechaFin)
    : new Date(fechaFin);
  
  const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

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
  // Hooks para notificaciones
  const { notificarDocumentoSubidoAuditoria } = useCrearNotificacion();
  const { user } = useAuth();
  
  // Estado
  const [auditoria, setAuditoria] = useState<Auditoria>(AUDITORIA_EJEMPLO);
  const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([]);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [checklistCompletados, setChecklistCompletados] = useState<Record<string, boolean>>({});
  // Estado para listas de chequeo
  const [listasChequeo, setListasChequeo] = useState<any[]>([]);
  const [loadingListasChequeo, setLoadingListasChequeo] = useState(false);
    // Fetch de listas de chequeo desde backend usando el servicio
    useEffect(() => {
      if (!isOpen) return;
      setLoadingListasChequeo(true);
      listasChequeoApi.getAll()
        .then(response => {
          if (response.success && response.data) {
            setListasChequeo(Array.isArray(response.data) ? response.data : []);
          } else {
            console.error('Error al obtener listas de chequeo:', response.error);
            toast.error(response.error || 'Error al cargar listas de chequeo');
            setListasChequeo([]);
          }
        })
        .catch(err => {
          console.error('Error al cargar listas de chequeo:', err);
          toast.error('Error al cargar listas de chequeo');
          setListasChequeo([]);
        })
        .finally(() => setLoadingListasChequeo(false));
    }, [isOpen]);
  
  // ✅ AUTO-DETECCIÓN: Si no se especifica tab, detectar según el estado de la auditoría
  const getTabAutomatico = (estadoActual: EstadoAuditoria) => {
    if (tabInicial !== 'general') return tabInicial;
    
    // Si el estado es Planeación, Ejecución o Comunicación, abrir directamente ese tab
    const estadoLowerCase = estadoActual.toLowerCase();
    if (estadoLowerCase === 'planeación' || estadoLowerCase === 'planeacion') return 'planeacion';
    if (estadoLowerCase === 'ejecución' || estadoLowerCase === 'ejecucion') return 'ejecucion';
    if (estadoLowerCase === 'comunicación' || estadoLowerCase === 'comunicacion') return 'comunicacion';
    
    return 'general';
  };
  
  const [activeTab, setActiveTab] = useState('general');
  
  // Actualizar tab cuando cambie el estado de la auditoría
  useEffect(() => {
    if (auditoria.id && auditoria.id !== AUDITORIA_EJEMPLO.id) {
      setActiveTab(getTabAutomatico(auditoria.estado));
    }
  }, [auditoria.estado, auditoria.id]);
  const [mostrarDetalles, setMostrarDetalles] = useState(true);
  const [filtroDocumentos, setFiltroDocumentos] = useState<string>('todos');
  const [modalCargarDocumento, setModalCargarDocumento] = useState(false);

  // Cargar datos de la auditoría desde la BD
  useEffect(() => {
    if (!isOpen || !auditoriaId) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Cargar auditoría
        const response = await auditoriasApi.getById(auditoriaId);
        if (response.success && response.data) {
          const aud = response.data;
          
          const audAny = aud as any;
          
          // Mapear auditor líder - manejar diferentes estructuras del backend
          let auditorLiderMapeado = {
            id: '',
            nombre: '',
            email: '',
            foto: undefined as string | undefined,
          };
          
          if (audAny.auditorLider && typeof audAny.auditorLider === 'object') {
            // Si viene como objeto auditorLider
            auditorLiderMapeado = {
              id: audAny.auditorLider.numeroIdentificacion || audAny.auditorLider.id || '',
              nombre: audAny.auditorLider.nombre || '',
              email: audAny.auditorLider.email || audAny.auditorLider.correo || '',
              foto: audAny.auditorLider.foto,
            };
          } else if (audAny.auditorLiderNombre) {
            // Si viene como campos separados
            auditorLiderMapeado = {
              id: audAny.auditorLiderId || '',
              nombre: audAny.auditorLiderNombre,
              email: audAny.auditorLiderEmail || '',
              foto: audAny.auditorLiderFoto,
            };
          }
          
          // Mapear datos de BD al formato del componente
          const auditoriaMapeada: Auditoria = {
            id: aud.id,
            codigo: aud.codigo || '',
            nombre: audAny.nombre || audAny.titulo || '',
            tipo: (audAny.tipo || 'Sede') as TipoAuditoria,
            estado: (audAny.estadoKanban?.toLowerCase() || audAny.fase?.toLowerCase() || audAny.estado?.toLowerCase() || 'planeacion') as EstadoAuditoria,
            areaAuditable: audAny.territorial || audAny.areaAuditable || '',
            procesoNombre: audAny.procesoAuditado || audAny.procesoNombre || '',
            nivelRiesgo: (audAny.riesgoKanban || audAny.riesgo || audAny.nivelRiesgo || 'Medio') as NivelRiesgo,
            responsableArea: {
              id: audAny.responsableAreaId || '',
              nombre: audAny.responsableAreaNombre || '',
              cargo: audAny.responsableAreaCargo || '',
              email: audAny.responsableAreaEmail || '',
              telefono: audAny.responsableAreaTelefono,
            },
            auditorLider: auditorLiderMapeado,
            equipoAuditores: Array.isArray(audAny.equipoAuditores) 
              ? audAny.equipoAuditores.map((eq: any) => {
                  // Si es un string, crear objeto básico
                  if (typeof eq === 'string') {
                    return {
                      id: '',
                      nombre: eq,
                      rol: 'Auditor',
                      email: '',
                      foto: undefined,
                    };
                  }
                  // Si es un objeto, mapear normalmente
                  return {
                    id: eq.id || '',
                    nombre: eq.nombre || '',
                    rol: eq.rol || 'Auditor',
                    email: eq.email || eq.correo || '',
                    foto: eq.foto,
                  };
                })
              : [],
            cronograma: {
              fechaCreacion: audAny.fechaCreacion ? (typeof audAny.fechaCreacion === 'string' && audAny.fechaCreacion.includes('/') 
                ? parseFechaDDMMYYYY(audAny.fechaCreacion) 
                : new Date(audAny.fechaCreacion)) : new Date(),
              fechaInicio: audAny.fechaInicio ? (typeof audAny.fechaInicio === 'string' && audAny.fechaInicio.includes('/') 
                ? parseFechaDDMMYYYY(audAny.fechaInicio) 
                : new Date(audAny.fechaInicio)) : new Date(),
              fechaFin: audAny.fechaFin ? (typeof audAny.fechaFin === 'string' && audAny.fechaFin.includes('/') 
                ? parseFechaDDMMYYYY(audAny.fechaFin) 
                : new Date(audAny.fechaFin)) : new Date(),
              fechaFinReal: audAny.fechaFinReal ? (typeof audAny.fechaFinReal === 'string' && audAny.fechaFinReal.includes('/') 
                ? parseFechaDDMMYYYY(audAny.fechaFinReal) 
                : new Date(audAny.fechaFinReal)) : undefined,
              duracionDias: audAny.duracionDias || calcularDuracionDias(audAny.fechaInicio, audAny.fechaFin) || 30,
              diasTranscurridos: audAny.diasTranscurridos || 0,
            },
            progreso: {
              // El progreso se calculará dinámicamente basado en actividades completadas
              // Por ahora usamos el valor del backend como fallback
              general: audAny.progreso || 0,
              planeacion: audAny.progresoPlaneacion || 0,
              ejecucion: audAny.progresoEjecucion || 0,
              comunicacion: audAny.progresoComunicacion || 0,
            },
            estadisticas: {
              totalHallazgos: audAny.hallazgos || 0,
              hallazgosCriticos: audAny.hallazgosCriticos || 0,
              hallazgosMayores: audAny.hallazgosMayores || 0,
              hallazgosMenores: audAny.hallazgosMenores || 0,
              documentosCargados: audAny.documentos || 0, // Usar el valor del backend como inicial
              notificacionesEnviadas: audAny.notificacionesEnviadas || 0,
            },
            fechasClave: {
              planeacionInicio: audAny.fechaPlaneacionInicio ? new Date(audAny.fechaPlaneacionInicio) : undefined,
              planeacionFin: audAny.fechaPlaneacionFin ? new Date(audAny.fechaPlaneacionFin) : undefined,
              ejecucionInicio: audAny.fechaEjecucionInicio ? new Date(audAny.fechaEjecucionInicio) : undefined,
              ejecucionFin: audAny.fechaEjecucionFin ? new Date(audAny.fechaEjecucionFin) : undefined,
              comunicacionInicio: audAny.fechaComunicacionInicio ? new Date(audAny.fechaComunicacionInicio) : undefined,
              comunicacionFin: audAny.fechaComunicacionFin ? new Date(audAny.fechaComunicacionFin) : undefined,
              informePreliminar: audAny.fechaInformePreliminar ? new Date(audAny.fechaInformePreliminar) : undefined,
              informeFinal: audAny.fechaInformeFinal ? new Date(audAny.fechaInformeFinal) : undefined,
            },
            metadata: {
              creadoPor: audAny.creadoPor || '',
              fechaCreacion: audAny.fechaCreacion ? new Date(audAny.fechaCreacion) : new Date(),
              ultimaModificacion: audAny.updatedAt ? new Date(audAny.updatedAt) : new Date(),
              modificadoPor: audAny.actualizadoPor || '',
              version: audAny.version || 1,
              checklistCompletados: audAny.checklistCompletados || {},
            },
          };
          
          setAuditoria(auditoriaMapeada);
          
          // Cargar estado de checkboxes si existe (actualizar el estado que usan los tabs)
          if (audAny.checklistCompletados && typeof audAny.checklistCompletados === 'object') {
            setChecklistCompletados(audAny.checklistCompletados);
          } else {
            // Si no hay datos guardados, inicializar con objeto vacío
            setChecklistCompletados({});
          }
        } else {
          toast.error('Error al cargar la auditoría', {
            description: response.error || 'No se pudo obtener la información de la auditoría',
          });
        }
      } catch (error) {
        console.error('Error al cargar auditoría:', error);
        toast.error('Error al cargar la auditoría', {
          description: error instanceof Error ? error.message : 'Error desconocido',
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [isOpen, auditoriaId]);

  // Cargar documentos de la auditoría
  // Esperar a que la auditoría se cargue primero para tener el valor correcto del backend
  useEffect(() => {
    if (!isOpen || !auditoriaId || !auditoria.id || auditoria.id === AUDITORIA_EJEMPLO.id) return;

    const cargarDocumentos = async () => {
      setLoadingDocumentos(true);
      try {
        const docs = await controlInternoService.getDocumentosByAuditoria(auditoriaId);
        
        // Validar que docs sea un array
        const documentosArray = Array.isArray(docs) ? docs : [];
        
        // Mapear documentos de BD al formato del componente
        const documentosMapeados: DocumentoExpediente[] = documentosArray.map((doc: any) => ({
          id: doc.id,
          nombre: doc.nombre || doc.nombreArchivo,
          tipo: doc.tipoDocumento || 'otro',
          fase: (doc.etapa || 'planeacion') as 'planeacion' | 'ejecucion' | 'comunicacion',
          fechaCarga: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          cargadoPor: doc.subidoPor || '',
          size: doc.tamanioBytes ? `${(doc.tamanioBytes / 1024).toFixed(0)} KB` : '0 KB',
          version: doc.version || 1,
          tipoMime: doc.tipoMime, // Incluir tipo MIME para determinar si es previsualizable
        }));
        
        setDocumentos(documentosMapeados);
        
        // Actualizar estadísticas de documentos
        // Usar siempre el máximo entre el valor del backend y el de la API
        // Esto previene que se sobrescriba un valor positivo del backend con 0 de la API
        setAuditoria(prev => {
          const cantidadDocumentosAPI = documentosMapeados.length;
          const valorBackend = prev.estadisticas.documentosCargados;
          
          // Siempre usar el máximo entre ambos valores
          const cantidadFinal = Math.max(valorBackend, cantidadDocumentosAPI);
          
          return {
            ...prev,
            estadisticas: {
              ...prev.estadisticas,
              documentosCargados: cantidadFinal,
            },
          };
        });
      } catch (error) {
        console.error('[ExpedienteAuditoria] Error al cargar documentos:', error);
        // No mostrar toast de error para no saturar, solo log en consola
        // El valor del backend se mantiene
      } finally {
        setLoadingDocumentos(false);
      }
    };

    cargarDocumentos();
  }, [isOpen, auditoriaId, auditoria.id]);

  // Cargar notificaciones relacionadas con la auditoría
  // Espera a que los documentos estén cargados para poder relacionar por evidenciaId
  useEffect(() => {
    if (!isOpen || !auditoriaId || !user?.id) return;

    const cargarNotificaciones = async () => {
      try {
        // Obtener TODAS las notificaciones del sistema para contar las relacionadas con esta auditoría
        let todasNotificaciones: any[] = [];
        
        // Intentar obtener todas las notificaciones del sistema
        try {
          const responseTodas = await notificacionesApi.obtenerTodas();
          if (responseTodas.success && responseTodas.data) {
            todasNotificaciones = responseTodas.data;
          }
        } catch (err) {
          // Si falla obtenerTodas, intentar obtener todas las notificaciones de todos los usuarios
          // como fallback, obtener las del usuario actual (pero el backend debería permitir obtenerTodas)
          console.warn('No se pudieron obtener todas las notificaciones, intentando por usuario:', err);
          try {
            const response = await notificacionesApi.obtenerPorUsuario(user.id.toString());
            if (response.success && response.data) {
              todasNotificaciones = response.data;
            }
          } catch (err2) {
            console.error('Error al obtener notificaciones:', err2);
            return;
          }
        }
        
        if (todasNotificaciones.length === 0) {
          return;
        }
        
        // Crear Set con IDs de documentos de esta auditoría (usar documentos ya cargados)
        const documentosIds = new Set(documentos.map(doc => doc.id));
        
        // También agregar evidenciaIds si están disponibles en los documentos
        documentos.forEach(doc => {
          // Si el documento tiene un ID de evidencia relacionado, agregarlo también
          if ((doc as any).evidenciaId) {
            documentosIds.add((doc as any).evidenciaId);
          }
        });
        
        // Filtrar notificaciones relacionadas con esta auditoría
        const notificacionesRelacionadas = todasNotificaciones.filter((notif: any) => {
          // 1. Notificaciones directamente relacionadas con la auditoría
          if (notif.metadata?.auditoriaId === auditoriaId) {
            return true;
          }
          
          // 2. Notificaciones relacionadas con documentos de esta auditoría (por evidenciaId)
          if (notif.metadata?.evidenciaId && documentosIds.has(notif.metadata.evidenciaId)) {
            return true;
          }
          
          // 3. Notificaciones relacionadas por documentoId (si coincide con algún documento)
          if (notif.metadata?.documentoId && documentosIds.has(notif.metadata.documentoId)) {
            return true;
          }
          
          return false;
        });

        // Actualizar estadísticas de notificaciones
        setAuditoria(prev => ({
          ...prev,
          estadisticas: {
            ...prev.estadisticas,
            notificacionesEnviadas: notificacionesRelacionadas.length,
          },
        }));
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        // No mostrar toast de error para no saturar al usuario
      }
    };

    cargarNotificaciones();
  }, [isOpen, auditoriaId, documentos, auditoria.estadisticas.documentosCargados, user?.id]);

  // Generar historial desde cambios en la auditoría y documentos
  useEffect(() => {
    if (!auditoria.id) return;

    const generarHistorial = () => {
      const eventos: EventoHistorial[] = [];

      // Evento de creación
      if (auditoria.metadata.fechaCreacion) {
        eventos.push({
          id: 'evt-creacion',
          tipo: 'accion',
          titulo: 'Auditoría creada',
          descripcion: `Se creó la auditoría ${auditoria.codigo}`,
          usuario: auditoria.metadata.creadoPor,
          fecha: auditoria.metadata.fechaCreacion,
          icono: <Sparkles className="w-4 h-4" />,
          color: '#10B981',
        });
      }

      // Eventos de documentos
      documentos.forEach((doc, index) => {
        eventos.push({
          id: `evt-doc-${doc.id}`,
          tipo: 'documento',
          titulo: 'Documento cargado',
          descripcion: `${doc.nombre} (${doc.tipo})`,
          usuario: doc.cargadoPor,
          fecha: doc.fechaCarga,
          icono: <Upload className="w-4 h-4" />,
          color: '#F59E0B',
        });
      });

      // Evento de última modificación
      if (auditoria.metadata.ultimaModificacion) {
        eventos.push({
          id: 'evt-modificacion',
          tipo: 'accion',
          titulo: 'Auditoría actualizada',
          descripcion: `Última modificación realizada`,
          usuario: auditoria.metadata.modificadoPor,
          fecha: auditoria.metadata.ultimaModificacion,
          icono: <Edit2 className="w-4 h-4" />,
          color: '#3B82F6',
        });
      }

      // Ordenar por fecha descendente
      eventos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      
      setHistorial(eventos);
    };

    generarHistorial();
  }, [auditoria, documentos]);

  // Cálculos
  const diasRestantes = useMemo(() => {
    const hoy = new Date();
    const fin = new Date(auditoria.cronograma.fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria.cronograma.fechaFin]);

  // Calcular días transcurridos basado en fecha actual vs fecha inicio
  const diasTranscurridosCalculados = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(auditoria.cronograma.fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    
    if (hoy < inicio) return 0;
    
    const diff = Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(diff, auditoria.cronograma.duracionDias);
  }, [auditoria.cronograma.fechaInicio, auditoria.cronograma.duracionDias]);

  const progresoTiempo = useMemo(() => {
    return Math.round(
      (diasTranscurridosCalculados / auditoria.cronograma.duracionDias) * 100
    );
  }, [diasTranscurridosCalculados, auditoria.cronograma.duracionDias]);

  // Función helper para filtrar items no deseados
  const filtrarItemsNoDeseados = (items: any[]) => {
    return items.filter(item => {
      const categoria = (item.categoria || '').toLowerCase();
      const texto = (item.texto || '').toLowerCase();
      // Filtrar items que contengan "informes" o "socialización"
      return !categoria.includes('informes') && 
             !categoria.includes('socialización') && 
             !categoria.includes('socializacion') &&
             !texto.includes('informe preliminar') &&
             !texto.includes('informe final') &&
             !texto.includes('socializado') &&
             !texto.includes('socialización');
    });
  };

  // Calcular progreso real basado en actividades completadas y listas de chequeo
  const progresoReal = useMemo(() => {
    // Contar actividades completadas por fase
    const contarCompletadas = (actividades: typeof ACTIVIDADES_PLANEACION) => {
      let totalItems = 0;
      let completados = 0;
      
      actividades.forEach(actividad => {
        actividad.checklist.forEach(item => {
          totalItems++;
          if (checklistCompletados[item.id]) {
            completados++;
          }
        });
      });
      
      return totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;
    };

    // Contar items de listas de chequeo completados por fase
    const contarListasChequeo = (tipo: string) => {
      const listasFiltradas = listasChequeo.filter(lc => lc.tipo === tipo);
      let totalItems = 0;
      let completados = 0;

      listasFiltradas.forEach(lista => {
        if (lista.items && Array.isArray(lista.items)) {
          const itemsFiltrados = filtrarItemsNoDeseados(lista.items);
          itemsFiltrados.forEach(item => {
            totalItems++;
            if (checklistCompletados[item.id]) {
              completados++;
            }
          });
        }
      });

      return totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;
    };

    // Calcular progreso combinando actividades y listas de chequeo
    const progresoPlaneacionActividades = contarCompletadas(ACTIVIDADES_PLANEACION);
    const progresoPlaneacionListas = contarListasChequeo('planeacion');
    const progresoPlaneacion = listasChequeo.filter(lc => lc.tipo === 'planeacion').length > 0
      ? Math.round((progresoPlaneacionActividades + progresoPlaneacionListas) / 2)
      : progresoPlaneacionActividades;

    // Para ejecución, solo usamos las listas de chequeo mapeadas (no ACTIVIDADES_EJECUCION hardcoded)
    const actividadesEjecucionMapeadas = mapearListasChequeoAActividades(listasChequeo);
    const progresoEjecucionActividades = actividadesEjecucionMapeadas.length > 0 
      ? contarCompletadas(actividadesEjecucionMapeadas)
      : 0;
    const progresoEjecucionListas = contarListasChequeo('ejecucion');
    const progresoEjecucion = listasChequeo.filter(lc => lc.tipo === 'ejecucion').length > 0
      ? Math.round((progresoEjecucionActividades + progresoEjecucionListas) / 2)
      : progresoEjecucionActividades;

    const progresoComunicacionActividades = contarCompletadas(ACTIVIDADES_COMUNICACION);
    const progresoComunicacionListas = contarListasChequeo('comunicacion');
    const progresoComunicacion = listasChequeo.filter(lc => lc.tipo === 'comunicacion').length > 0
      ? Math.round((progresoComunicacionActividades + progresoComunicacionListas) / 2)
      : progresoComunicacionActividades;

    // Progreso general: promedio ponderado (Planeación: 30%, Ejecución: 50%, Comunicación: 20%)
    const progresoGeneral = Math.round(
      progresoPlaneacion * 0.3 + 
      progresoEjecucion * 0.5 + 
      progresoComunicacion * 0.2
    );

    return {
      general: progresoGeneral,
      planeacion: progresoPlaneacion,
      ejecucion: progresoEjecucion,
      comunicacion: progresoComunicacion,
    };
  }, [checklistCompletados, listasChequeo]);

  // Usar progreso real si hay actividades completadas, sino usar el del backend
  const progresoMostrar = useMemo(() => {
    const tieneActividadesCompletadas = Object.keys(checklistCompletados).length > 0;
    return tieneActividadesCompletadas ? progresoReal : auditoria.progreso;
  }, [progresoReal, auditoria.progreso, checklistCompletados]);

  const documentosFiltrados = useMemo(() => {
    if (filtroDocumentos === 'todos') return documentos;
    return documentos.filter((doc) => doc.fase === filtroDocumentos);
  }, [documentos, filtroDocumentos]);

  // Funciones de guardado
  const handleGuardarDocumento = async (documento: any, documentoCompleto?: any) => {
    if (!auditoriaId) return;

    try {
      // Recargar documentos
      const docs = await controlInternoService.getDocumentosByAuditoria(auditoriaId);
      const documentosMapeados: DocumentoExpediente[] = docs.map((doc: any) => ({
        id: doc.id,
        nombre: doc.nombre || doc.nombreArchivo,
        tipo: doc.tipoDocumento || 'otro',
        fase: (doc.etapa || 'planeacion') as 'planeacion' | 'ejecucion' | 'comunicacion',
        fechaCarga: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        cargadoPor: doc.subidoPor || '',
        size: doc.tamanioBytes ? `${(doc.tamanioBytes / 1024).toFixed(0)} KB` : '0 KB',
        version: doc.version || 1,
        tipoMime: doc.tipoMime, // Incluir tipo MIME para determinar si es previsualizable
      }));
      setDocumentos(documentosMapeados);
      
      // Actualizar estadísticas de documentos
      setAuditoria(prev => ({
        ...prev,
        estadisticas: {
          ...prev.estadisticas,
          documentosCargados: documentosMapeados.length,
        },
      }));
      
      // ============ NOTIFICACIONES: Documento Subido ============
      if (documentoCompleto?.id && auditoria.codigo && user?.id) {
        try {
          await notificarDocumentoSubidoAuditoria(
            documentoCompleto.id,
            documento.nombre || documentoCompleto.nombre || 'Documento',
            auditoriaId,
            auditoria.codigo,
            user.id
          );
        } catch (notifError) {
          // No fallar la carga si las notificaciones fallan
          console.error('Error al enviar notificaciones:', notifError);
        }
      }
      
      toast.success('Documento cargado exitosamente', {
        description: `${documento.nombre} agregado al expediente`,
      });
      
      setModalCargarDocumento(false);
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast.error('Error al guardar documento', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  const handleActualizarPlaneacion = async (datos: {
    fechaReunionApertura?: Date;
    alcance?: string;
    observaciones?: string;
  }) => {
    if (!auditoriaId) return;

    try {
      const updateData: any = {};
      if (datos.fechaReunionApertura) {
        updateData.fechaReunionApertura = datos.fechaReunionApertura.toISOString();
      }
      if (datos.alcance) {
        updateData.alcance = datos.alcance;
      }
      if (datos.observaciones) {
        updateData.observacionesAdicionales = datos.observaciones;
      }

      const response = await auditoriasApi.update(auditoriaId, updateData);
      if (response.success) {
        toast.success('Datos de planeación actualizados', {
          description: 'Los cambios se guardaron correctamente en la base de datos',
        });
        // Recargar auditoría
        const audResponse = await auditoriasApi.getById(auditoriaId);
        if (audResponse.success && audResponse.data) {
          // Actualizar estado local (simplificado, se puede mejorar)
          setAuditoria(prev => ({
            ...prev,
            fechasClave: {
              ...prev.fechasClave,
              planeacionInicio: datos.fechaReunionApertura || prev.fechasClave.planeacionInicio,
            },
          }));
        }
      } else {
        throw new Error(response.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error al actualizar planeación:', error);
      toast.error('Error al guardar datos', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

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
      <div className="fixed inset-0 z-[111] flex items-start justify-center p-4 pt-20 overflow-y-auto pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col my-4 pointer-events-auto"
        >
          {/* Indicador de carga */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600">Cargando expediente...</p>
              </div>
            </div>
          )}
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
                  <span>{progresoMostrar.general}% completado</span>
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
                    style={{ width: `${progresoMostrar.general}%` }}
                  />
                </div>
                <span className="text-sm text-gray-900 w-10 text-right">
                  {progresoMostrar.general}%
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
                  <TabGeneral 
                    auditoria={auditoria} 
                    progreso={progresoMostrar}
                    diasTranscurridos={diasTranscurridosCalculados}
                    progresoTiempo={progresoTiempo}
                  />
                </TabsContent>

                {/* TAB 2: PLANEACIÓN */}
                <TabsContent value="planeacion" className="mt-0">
                  <TabPlaneacion 
                    auditoria={auditoria} 
                    onGuardar={handleActualizarPlaneacion}
                    auditoriaId={auditoriaId}
                    checklistCompletados={checklistCompletados}
                    onChecklistChange={(checklist) => setChecklistCompletados(checklist)}
                    listasChequeo={listasChequeo}
                    loadingListasChequeo={loadingListasChequeo}
                  />
                </TabsContent>

                {/* TAB 3: EJECUCIÓN */}
                <TabsContent value="ejecucion" className="mt-0">
                  <TabEjecucion 
                    auditoria={auditoria}
                    auditoriaId={auditoriaId}
                    checklistCompletados={checklistCompletados}
                    onChecklistChange={(checklist) => setChecklistCompletados(checklist)}
                    listasChequeo={listasChequeo}
                    loadingListasChequeo={loadingListasChequeo}
                  />
                </TabsContent>

                {/* TAB 4: COMUNICACIÓN */}
                <TabsContent value="comunicacion" className="mt-0">
                  <TabComunicacion 
                    auditoria={auditoria}
                    auditoriaId={auditoriaId}
                    checklistCompletados={checklistCompletados}
                    onChecklistChange={(checklist) => setChecklistCompletados(checklist)}
                    listasChequeo={listasChequeo}
                    loadingListasChequeo={loadingListasChequeo}
                  />
                </TabsContent>

                {/* TAB 5: DOCUMENTACIÓN */}
                <TabsContent value="documentacion" className="mt-0">
                  <TabDocumentacion
                    documentos={documentosFiltrados}
                    filtro={filtroDocumentos}
                    onFiltroChange={setFiltroDocumentos}
                    onGuardar={handleGuardarDocumento}
                    loading={loadingDocumentos}
                    auditoriaId={auditoriaId}
                    codigoAuditoria={auditoria.codigo}
                    onRefreshDocumentos={async () => {
                      if (!auditoriaId) return;
                      setLoadingDocumentos(true);
                      try {
                        const docs = await controlInternoService.getDocumentosByAuditoria(auditoriaId);
                        const documentosMapeados: DocumentoExpediente[] = docs.map((doc: any) => ({
                          id: doc.id,
                          nombre: doc.nombre || doc.nombreArchivo,
                          tipo: doc.tipoDocumento || 'otro',
                          fase: (doc.etapa || 'planeacion') as 'planeacion' | 'ejecucion' | 'comunicacion',
                          fechaCarga: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                          cargadoPor: doc.subidoPor || '',
                          size: doc.tamanioBytes ? `${(doc.tamanioBytes / 1024).toFixed(0)} KB` : '0 KB',
                          version: doc.version || 1,
                          tipoMime: doc.tipoMime, // Incluir tipo MIME para determinar si es previsualizable
                        }));
                        setDocumentos(documentosMapeados);
                      } catch (error) {
                        console.error('Error al recargar documentos:', error);
                        toast.error('Error al recargar documentos');
                      } finally {
                        setLoadingDocumentos(false);
                      }
                    }}
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
function TabGeneral({ 
  auditoria, 
  progreso,
  diasTranscurridos,
  progresoTiempo
}: { 
  auditoria: Auditoria;
  progreso: { general: number; planeacion: number; ejecucion: number; comunicacion: number };
  diasTranscurridos: number;
  progresoTiempo: number;
}) {
  return (
    <div className="space-y-6 max-h-[calc(100vh-28rem)] overflow-y-auto pr-2">
      {/* Resumen ejecutivo */}
      <CardSIGL>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg text-gray-900">Resumen Ejecutivo</h3>
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

          {/* Columna 3: Auditor Líder y Equipo auditor */}
          <div className="space-y-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Auditor Líder
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              {auditoria.auditorLider.nombre ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate font-semibold">
                      {auditoria.auditorLider.nombre}
                    </p>
                    {auditoria.auditorLider.email && (
                      <p className="text-xs text-gray-500 mt-1">{auditoria.auditorLider.email}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 italic">
                      No asignado
                    </p>
                  </div>
                </div>
              )}
            </div>

            {auditoria.equipoAuditores.length > 0 && (
              <>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Equipo Auditor
                </label>
                <div className="space-y-3">
                  {auditoria.equipoAuditores.map((auditor) => (
                    <div key={auditor.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{auditor.nombre}</p>
                      <p className="text-xs text-gray-500">{auditor.rol}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
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
              {diasTranscurridos} / {auditoria.cronograma.duracionDias}
            </p>
          </div>
        </div>

        {/* Barra de progreso temporal */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Avance temporal</span>
            <span className="text-sm text-gray-900">
              {progresoTiempo}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
              style={{
                width: `${progresoTiempo}%`,
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
              <span className="text-sm text-gray-900">{progreso.planeacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${progreso.planeacion}%` }}
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
              <span className="text-sm text-gray-900">{progreso.ejecucion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all"
                style={{ width: `${progreso.ejecucion}%` }}
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
              <span className="text-sm text-gray-900">{progreso.comunicacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${progreso.comunicacion}%` }}
              />
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}

// TAB 2: PLANEACIÓN
function TabPlaneacion({ 
  auditoria, 
  onGuardar,
  auditoriaId,
  checklistCompletados,
  onChecklistChange,
  listasChequeo,
  loadingListasChequeo,
}: { 
  auditoria: Auditoria;
  onGuardar?: (datos: { fechaReunionApertura?: Date; alcance?: string; observaciones?: string }) => void;
  auditoriaId?: string;
  checklistCompletados?: Record<string, boolean>;
  onChecklistChange?: (checklist: Record<string, boolean>) => void;
  listasChequeo: any[];
  loadingListasChequeo: boolean;
}) {
  // Verificar si la fase está enviada/completada y no se puede editar
  const puedeEditar = auditoria.estado !== 'ejecucion' && auditoria.estado !== 'comunicacion' && auditoria.estado !== 'seguimiento' && auditoria.estado !== 'finalizada';

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
        faseColor="purple"
        estadoRequerido="Planeación"
        estadoActual={auditoria.estado}
        auditoriaId={puedeEditar ? auditoriaId : undefined}
        checklistInicial={checklistCompletados}
        onChecklistChange={puedeEditar ? onChecklistChange : undefined}
      />
    </div>
  );
}

// TAB 3: EJECUCIÓN
function TabEjecucion({ 
  auditoria,
  auditoriaId,
  checklistCompletados,
  onChecklistChange,
  listasChequeo,
  loadingListasChequeo
}: {
  auditoria: Auditoria;
  auditoriaId?: string;
  checklistCompletados?: Record<string, boolean>;
  onChecklistChange?: (checklist: Record<string, boolean>) => void;
  listasChequeo: any[];
  loadingListasChequeo: boolean;
}) {
  // Verificar si la fase está enviada/completada y no se puede editar
  const puedeEditar = auditoria.estado !== 'comunicacion' && auditoria.estado !== 'seguimiento' && auditoria.estado !== 'finalizada';
  
  // Estado para el modal de agregar hallazgos
  const [modalHallazgoAbierto, setModalHallazgoAbierto] = useState(false);

  // Mapear listas de chequeo a actividades
  const actividadesEjecucion = useMemo(() => {
    if (loadingListasChequeo || !listasChequeo || listasChequeo.length === 0) {
      return [];
    }
    return mapearListasChequeoAActividades(listasChequeo);
  }, [listasChequeo, loadingListasChequeo]);

  // Si no hay actividades mapeadas, mostrar mensaje de carga o vacío
  if (loadingListasChequeo) {
    return (
      <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="ml-3 text-gray-600">Cargando actividades de ejecución...</span>
        </div>
      </div>
    );
  }

  if (actividadesEjecucion.length === 0) {
    return (
      <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm text-amber-900">
                <strong>Fase de Ejecución</strong> - Gestión integrada de actividades
              </p>
              <p className="text-xs text-amber-700 mt-1">
                No hay listas de chequeo de ejecución disponibles. Crea listas de chequeo en la configuración.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto">
      {/* Banner informativo con botón de hallazgos */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm text-amber-900">
                <strong>Fase de Ejecución</strong> - Gestión integrada de actividades
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Completa las {actividadesEjecucion.length} actividades para avanzar a la fase de Comunicación
              </p>
            </div>
          </div>
          
          {/* Botón para agregar hallazgos - Solo visible cuando la auditoría está en Ejecución */}
          {auditoria.estado === 'Ejecución' && auditoriaId && authService.hasPermission(Permissions.CONTROL_INTERNO_HALLAZGOS_CREATE) && (
            <ButtonSIGL
              onClick={() => setModalHallazgoAbierto(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Registrar Hallazgo
            </ButtonSIGL>
          )}
        </div>
      </div>

      {/* Modal de agregar hallazgo */}
      {auditoriaId && (
        <ModalAgregarHallazgoRapido
          isOpen={modalHallazgoAbierto}
          onClose={() => setModalHallazgoAbierto(false)}
          auditoriaId={auditoriaId}
          codigoAuditoria={auditoria.codigo}
          onHallazgoCreado={() => {
            toast.success('Hallazgo registrado', {
              description: 'El hallazgo ha sido registrado exitosamente',
            });
          }}
        />
      )}

      <ActividadesIntegradas
        actividades={actividadesEjecucion}
        faseTitulo="Ejecución"
        faseColor="amber"
        estadoRequerido="Ejecución"
        estadoActual={auditoria.estado}
        auditoriaId={puedeEditar ? auditoriaId : undefined}
        checklistInicial={checklistCompletados}
        onChecklistChange={puedeEditar ? onChecklistChange : undefined}
      />
    </div>
  );
}

// TAB 4: COMUNICACIÓN
function TabComunicacion({ 
  auditoria,
  auditoriaId,
  checklistCompletados,
  onChecklistChange,
  listasChequeo,
  loadingListasChequeo,
}: { 
  auditoria: Auditoria;
  auditoriaId?: string;
  checklistCompletados?: Record<string, boolean>;
  onChecklistChange?: (checklist: Record<string, boolean>) => void;
  listasChequeo: any[];
  loadingListasChequeo: boolean;
}) {
  // Verificar si la fase está enviada/completada y no se puede editar
  const puedeEditar = auditoria.estado !== 'seguimiento' && auditoria.estado !== 'finalizada';

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
              Completa las 3 actividades para finalizar la auditoría
            </p>
          </div>
        </div>
      </div>

      <ActividadesIntegradas
        actividades={ACTIVIDADES_COMUNICACION}
        faseTitulo="Comunicación"
        faseColor="green"
        estadoRequerido="Comunicación"
        estadoActual={auditoria.estado}
        auditoriaId={puedeEditar ? auditoriaId : undefined}
        checklistInicial={checklistCompletados}
        onChecklistChange={puedeEditar ? onChecklistChange : undefined}
      />
    </div>
  );
}

// TAB 5: DOCUMENTACIÓN
function TabDocumentacion({
  documentos,
  filtro,
  onFiltroChange,
  onGuardar,
  loading,
  auditoriaId,
  codigoAuditoria,
  onRefreshDocumentos,
}: {
  documentos: DocumentoExpediente[];
  filtro: string;
  onFiltroChange: (filtro: string) => void;
  onGuardar?: (documento: any, documentoCompleto?: any) => void;
  loading?: boolean;
  auditoriaId?: string;
  codigoAuditoria?: string;
  onRefreshDocumentos?: () => Promise<void>;
}) {
  const [modalCargarDocumento, setModalCargarDocumento] = useState(false);

  // Construir URL base de la API (usando la misma lógica que el servicio)
  const getApiBaseUrl = () => {
    // Usar las funciones de environment.ts para mantener consistencia
    if (API_MODE === 'gateway') {
      const baseUrl = getServiceUrl('control-institucional');
      return `${baseUrl}/control-institucional/api/v1`;
    } else {
      return MICROSERVICE_URLS['control-institucional'];
    }
  };

  // Handler para ver documento
  const handleVerDocumento = async (doc: DocumentoExpediente) => {
    try {
      // Verificar si es previsualizable usando el tipoMime del documento
      const tipoMime = doc.tipoMime?.toLowerCase() || '';
      const esPrevisualizable = tipoMime.startsWith('image/') || 
                                tipoMime === 'application/pdf' || 
                                tipoMime.includes('pdf');
      
      if (esPrevisualizable) {
        // Abrir preview para imágenes y PDFs
        const apiBaseUrl = getApiBaseUrl();
        const token = localStorage.getItem('esap_access_token') || localStorage.getItem('esap_auth_token');
        const url = `${apiBaseUrl}/documentos/${doc.id}/preview`;
        
        if (token) {
          window.open(`${url}?token=${token}`, '_blank');
        } else {
          window.open(url, '_blank');
        }
        
        toast.success('Abriendo documento', {
          description: doc.nombre
        });
      } else {
        // Para Word, Excel, etc., descargar directamente
        toast.info('Descargando archivo', {
          description: 'Este tipo de archivo se descarga directamente. Solo se pueden previsualizar imágenes y PDFs.'
        });
        await handleDescargarDocumento(doc);
      }
    } catch (error: any) {
      console.error('Error al abrir documento:', error);
      
      // Si el error es específico de que no se puede previsualizar, descargar automáticamente
      if (error.message?.includes('no se puede previsualizar') || 
          error.response?.data?.message?.includes('no se puede previsualizar')) {
        toast.info('Descargando archivo', {
          description: 'Este tipo de archivo se descarga directamente'
        });
        await handleDescargarDocumento(doc);
      } else {
        // Si no tenemos tipoMime, intentar obtenerlo del documento
        if (!doc.tipoMime) {
          try {
            const documentoCompleto = await controlInternoService.getDocumentoById(doc.id);
            const tipoMimeCompleto = documentoCompleto.tipoMime?.toLowerCase() || '';
            const esPrevisualizable = tipoMimeCompleto.startsWith('image/') || 
                                      tipoMimeCompleto === 'application/pdf' || 
                                      tipoMimeCompleto.includes('pdf');
            
            if (esPrevisualizable) {
              const apiBaseUrl = getApiBaseUrl();
              const token = localStorage.getItem('esap_access_token') || localStorage.getItem('esap_auth_token');
              const url = `${apiBaseUrl}/documentos/${doc.id}/preview`;
              
              if (token) {
                window.open(`${url}?token=${token}`, '_blank');
              } else {
                window.open(url, '_blank');
              }
              return;
            }
          } catch (err) {
            // Si falla, continuar con la descarga
          }
        }
        
        // Si no se puede previsualizar, descargar
        toast.info('Descargando archivo', {
          description: 'Este tipo de archivo se descarga directamente'
        });
        await handleDescargarDocumento(doc);
      }
    }
  };

  // Handler para descargar documento
  const handleDescargarDocumento = async (doc: DocumentoExpediente) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('esap_access_token') || localStorage.getItem('esap_auth_token');
      const url = `${apiBaseUrl}/documentos/${doc.id}/download`;
      
      toast.loading('Descargando documento...', { id: `download-${doc.id}` });
      
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nombre;
      
      // Agregar token si existe
      if (token) {
        link.href = `${url}?token=${token}`;
      }
      
      // Agregar headers con fetch para manejar la descarga
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('Descarga completada', {
        id: `download-${doc.id}`,
        description: doc.nombre
      });
    } catch (error: any) {
      console.error('Error al descargar documento:', error);
      toast.error('Error al descargar', {
        id: `download-${doc.id}`,
        description: error.message || 'No se pudo descargar el documento'
      });
    }
  };

  // Handler para eliminar documento
  const handleEliminarDocumento = async (doc: DocumentoExpediente) => {
    // Confirmar eliminación
    const confirmar = window.confirm(
      `¿Está seguro de que desea eliminar el documento "${doc.nombre}"?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmar) return;
    
    try {
      toast.loading('Eliminando documento...', { id: `delete-${doc.id}` });
      
      await controlInternoService.deleteDocumento(doc.id);
      
      toast.success('Documento eliminado', {
        id: `delete-${doc.id}`,
        description: `${doc.nombre} ha sido eliminado`
      });
      
      // Recargar documentos
      if (onRefreshDocumentos) {
        await onRefreshDocumentos();
      }
    } catch (error: any) {
      console.error('Error al eliminar documento:', error);
      toast.error('Error al eliminar', {
        id: `delete-${doc.id}`,
        description: error.message || 'No se pudo eliminar el documento'
      });
    }
  };

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

          {/* Botón Cargar Documento - Requiere permiso de edición */}
          {authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_EDIT) && (
            <ButtonSIGL 
              variant="primary" 
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => setModalCargarDocumento(true)}
            >
              Cargar Documento
            </ButtonSIGL>
          )}
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
                  {/* Botón Ver - Siempre visible (solo lectura) */}
                  <button 
                    onClick={() => handleVerDocumento(doc)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Ver documento"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Botón Descargar - Siempre visible (solo lectura) */}
                  <button 
                    onClick={() => handleDescargarDocumento(doc)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Descargar documento"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Botón Eliminar - Requiere permiso de edición */}
                  {authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_EDIT) && (
                    <button 
                      onClick={() => handleEliminarDocumento(doc)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors hover:bg-red-50"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    </button>
                  )}
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
      {modalCargarDocumento && auditoriaId && (
        <ModalCargarDocumento
          auditoriaId={auditoriaId}
          codigoAuditoria={codigoAuditoria}
          onClose={() => setModalCargarDocumento(false)}
          onGuardar={(documento, documentoCompleto) => {
            if (onGuardar) {
              onGuardar(documento, documentoCompleto);
            }
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