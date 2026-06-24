/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPEDIENTE COMPLETO DE AUDITORÍA - WIZARD WORLD CLASS STANDARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ DISEÑO SEGÚN /WIZARD_WORLD_CLASS_STANDARD.md
 * ✅ Dialog de shadcn/ui (no overlay custom)
 * ✅ Header gradiente from-blue-600 to-blue-700
 * ✅ Tabs personalizados con scroll horizontal
 * ✅ Footer con métricas según estándar
 * ✅ Tarjetas según diseño estándar
 * 
 * FUNCIONALIDADES MANTENIDAS (100%):
 * - 6 tabs: General, Planeación, Ejecución, Comunicación, Documentación, Historial
 * - Auto-detección de tab según estado
 * - Integración con sub-módulos
 * - Exportar expediente
 * - Todas las funciones y cálculos
 * 
 * REFERENCIA: WIZARD_WORLD_CLASS_STANDARD.md
 * ÚLTIMA ACTUALIZACIÓN: 17 Febrero 2026
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Activity,
  AlertCircle,
  Archive,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSearch,
  FileText,
  Filter,
  Flag,
  FolderOpen,
  History,
  Info,
  Lightbulb,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  UserPlus,
  X,
  XCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { notificationsService } from '../../services/api/notificationsService';

// UI Components
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@esap-mfe/shared-ui/dialog';

// Design System

// Sub-módulos
import { ComunicacionAuditoriaModule } from './ComunicacionAuditoriaModule';
import { ModalCargarDocumento } from './ModalCargarDocumento';
import { ModalReunionApertura, ModalReunionCierre } from './ModalReunionAperturaCierre';
import { SeccionDocumentosPorEtapa } from './SeccionDocumentosPorEtapa';
import { SeccionHallazgosExpediente } from './SeccionHallazgosExpediente';
import { SeccionListasChequeoExpediente } from './SeccionListasChequeoExpediente';
import { SeccionTareasExpediente } from './SeccionTareasExpediente';

// Servicio API
import { API_MODE, getDefaultHeaders, getServiceUrl } from '../../../config/environment';
import { controlInternoService, type Hallazgo } from '../../../services/api/controlInternoService';
import { configuracionesProfesionalesOCIApi, auditoriasApi } from './services/api';
import { exportarPDFInformeEjecutivo } from './services/exportarPDFInformeCierreEjecutivo';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, type ConfiguracionDocumento } from './services/pdfESAPHeader';
import { estructuraService } from '../../services/estructuraService';

// ============ TIPOS ============

type EstadoAuditoria = 'planeacion' | 'ejecucion' | 'comunicacion' | 'seguimiento' | 'finalizada';
type TipoAuditoria = 'Regular' | 'Territorial' | 'Especial';
type NivelRiesgo = 'Alto' | 'Medio' | 'Bajo';
type TabActiva = 'general' | 'planeacion' | 'ejecucion' | 'comunicacion' | 'seguimiento' | 'documentacion' | 'historial' | 'finalizada';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  territorial?: string;
  tipo: TipoAuditoria;
  estado: EstadoAuditoria;
  areaAuditable: string;
  procesoNombre: string;
  nivelRiesgo: NivelRiesgo;
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
  cronograma: {
    fechaCreacion: Date;
    fechaInicio: Date;
    fechaFin: Date;
    fechaFinReal?: Date;
    duracionDias: number;
    diasTranscurridos: number;
  };
  progreso: {
    general: number;
    planeacion: number;
    ejecucion: number;
    comunicacion: number;
  };
  estadisticas: {
    totalHallazgos: number;
    hallazgosCriticos: number;
    hallazgosGraves: number;
    hallazgosModerados: number;
    hallazgosLeves: number;
    hallazgosBorrador: number;
    hallazgosMayores: number;
    hallazgosMenores: number;
    documentosCargados: number;
    notificacionesEnviadas: number;
  };
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
  metadata: {
    creadoPor: string;
    fechaCreacion: Date;
    ultimaModificacion: Date;
    modificadoPor: string;
    version: number;
  };

  // Campos del formulario de creación
  descripcion?: string;
  alcance?: string;
  metodologia?: string;
  observacionesAdicionales?: string;
  calificacionRiesgo?: string;
  sede?: string;
  presupuestoEstimado?: string;
  objetivos?: string[];
  criteriosAuditoria?: string[];
  normatividadAplicable?: string[];
  riesgosIdentificados?: string[];
  controlesAplicar?: string[];

  // Estado de actividades del proceso (checklist)
  checklistCompletados?: Record<string, boolean>;
}

interface DocumentoExpediente {
  id: string;
  nombre: string;
  tipo: 'Oficio' | 'Carta' | 'Acta' | 'Informe' | 'Evidencia' | 'Lista-Chequeo' | 'Plantilla' | 'Otro';
  fase: 'planeacion' | 'ejecucion' | 'comunicacion';
  fechaCarga: Date;
  cargadoPor: string;
  size: string;
  tipoMime?: string;   // application/pdf, image/png, etc.
  urlPreview?: string; // URL para vista previa
  urlDownload?: string; // URL para descarga
  version?: number;
  descripcion?: string;
  origenListaChequeo?: boolean; // Si fue cargado desde lista de chequeo
  documentoBibliotecaId?: string | null; // Plantilla de biblioteca asociada
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

// ═══════════════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO
// ═══════════════════════════════════════════════════════════════════════════

const AUDITORIA_EJEMPLO: Auditoria = {
  id: 'aud-001',
  codigo: 'AUD-2026-001',
  nombre: 'Auditoría de Gestión Académica',
  tipo: 'Regular',
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
    { id: 'u3', nombre: 'Ana Martínez', rol: 'Auditor Senior', email: 'amartinez@esap.edu.co', foto: undefined },
    { id: 'u4', nombre: 'Luis Pérez', rol: 'Auditor Junior', email: 'lperez@esap.edu.co', foto: undefined }
  ],
  cronograma: {
    fechaCreacion: new Date('2026-01-01'),
    fechaInicio: new Date('2026-01-15'),
    fechaFin: new Date('2026-03-15'),
    fechaFinReal: undefined,
    duracionDias: 60,
    diasTranscurridos: 32
  },
  progreso: { general: 68, planeacion: 100, ejecucion: 65, comunicacion: 0 },
  estadisticas: {
    totalHallazgos: 8,
    hallazgosCriticos: 2,
    hallazgosMayores: 3,
    hallazgosMenores: 3,
    documentosCargados: 12,
    notificacionesEnviadas: 5
  },
  fechasClave: {
    planeacionInicio: new Date('2026-01-15'),
    planeacionFin: new Date('2026-01-22'),
    ejecucionInicio: new Date('2026-01-23')
  },
  metadata: {
    creadoPor: 'Carlos Rodríguez',
    fechaCreacion: new Date('2026-01-10'),
    ultimaModificacion: new Date('2026-02-17'),
    modificadoPor: 'Carlos Rodríguez',
    version: 1
  },

  // Checklist de actividades (vacío por defecto)
  checklistCompletados: {}
};

const DOCUMENTOS_EJEMPLO: DocumentoExpediente[] = [
  {
    id: 'doc-001', nombre: 'Programa de Auditoría 2026.pdf', tipo: 'Informe', fase: 'planeacion',
    fechaCarga: new Date('2026-01-15'), cargadoPor: 'Carlos Rodríguez', size: '2.5 MB', version: 1
  },
  {
    id: 'doc-002', nombre: 'Acta Reunión Apertura.pdf', tipo: 'Acta', fase: 'planeacion',
    fechaCarga: new Date('2026-01-16'), cargadoPor: 'Carlos Rodríguez', size: '1.2 MB', version: 1
  },
  {
    id: 'doc-003', nombre: 'Lista de Chequeo.pdf', tipo: 'Lista-Chequeo', fase: 'ejecucion',
    fechaCarga: new Date('2026-01-25'), cargadoPor: 'Ana Martínez', size: '3.8 MB', version: 1
  }
];

const HISTORIAL_EJEMPLO: EventoHistorial[] = [
  {
    id: 'evt-001', tipo: 'cambio-estado', titulo: 'Auditoría iniciada',
    descripcion: 'Se inició la auditoría de Gestión Académica', usuario: 'Carlos Rodríguez',
    fecha: new Date('2026-01-15T08:00:00'), icono: <CheckCircle className="w-5 h-5" />, color: '#10b981'
  },
  {
    id: 'evt-002', tipo: 'documento', titulo: 'Documento cargado',
    descripcion: 'Se cargó el Programa de Auditoría', usuario: 'Carlos Rodríguez',
    fecha: new Date('2026-01-15T09:30:00'), icono: <FileText className="w-5 h-5" />, color: '#3b82f6'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TABS
// ═══════════════════════════════════════════════════════════════════════════

const PESTANAS_BASE: { id: TabActiva; label: string; icon: typeof Info }[] = [
  { id: 'general', label: 'General', icon: Info },
  { id: 'planeacion', label: 'Planeación', icon: FileSearch },
  { id: 'ejecucion', label: 'Ejecución', icon: ClipboardCheck },
  { id: 'comunicacion', label: 'Comunicación', icon: FileText },
  { id: 'seguimiento', label: 'Seguimiento', icon: BookOpen },
  { id: 'finalizada', label: 'Finalizada', icon: CheckCircle },
  { id: 'documentacion', label: 'Documentación', icon: FolderOpen },
  { id: 'historial', label: 'Historial', icon: History },
];

/** Orden de avance en el Kanban OCI */
const ORDEN_FASES_EXPEDIENTE: EstadoAuditoria[] = [
  'planeacion',
  'ejecucion',
  'comunicacion',
  'seguimiento',
  'finalizada',
];

const parseLocalDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  const dateStr = String(dateInput).trim();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
};

const TAB_REQUIERE_FASE: Partial<Record<TabActiva, EstadoAuditoria>> = {
  planeacion: 'planeacion',
  ejecucion: 'ejecucion',
  comunicacion: 'comunicacion',
  seguimiento: 'seguimiento',
  finalizada: 'finalizada',
};

function indiceFaseExpediente(estado: EstadoAuditoria): number {
  const i = ORDEN_FASES_EXPEDIENTE.indexOf(estado);
  return i >= 0 ? i : 0;
}

/** General, Documentación e Historial siempre; fases futuras ocultas */
function pestanaVisibleParaFase(tabId: TabActiva, estadoActual: EstadoAuditoria): boolean {
  if (tabId === 'general' || tabId === 'documentacion' || tabId === 'historial') {
    return true;
  }
  const faseTab = TAB_REQUIERE_FASE[tabId];
  if (!faseTab) return true;
  if (tabId === 'finalizada') return estadoActual === 'finalizada';
  return indiceFaseExpediente(estadoActual) >= indiceFaseExpediente(faseTab);
}

function filtrarPestanasPorEstado(
  estadoActual: EstadoAuditoria | undefined,
): typeof PESTANAS_BASE {
  if (!estadoActual) {
    return PESTANAS_BASE.filter((p) =>
      ['general', 'documentacion', 'historial'].includes(p.id),
    );
  }
  // Auditoría cerrada: todas las pestañas (consulta histórica por fase)
  if (estadoActual === 'finalizada') {
    return [...PESTANAS_BASE];
  }
  return PESTANAS_BASE.filter((p) => pestanaVisibleParaFase(p.id, estadoActual));
}

/**
 * Modal expediente: sin animación fade-in (evita quedar en opacity 0) y centrado real.
 */
/** World-class: 60vw wide, 95vh tall – maximizes usable space */
const ESTILO_MODAL_EXPEDIENTE: CSSProperties = {
  width: '60vw',
  maxWidth: '60vw',
  height: '95vh',
  maxHeight: '95vh',
  minHeight: 480,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  top: '2.5vh',
  padding: 0,
};

/** Complementa size="expediente" del Dialog */
const CLASE_MODAL_EXPEDIENTE = [
  '!w-[60vw] !max-w-[60vw] h-[95vh] !max-h-[95vh]',
  'gap-0 !p-0 flex flex-col min-h-0 overflow-hidden rounded-xl shadow-2xl border-0',
  'bg-white text-gray-900 opacity-100',
  'animate-none data-[state=open]:animate-none data-[state=closed]:animate-none',
  'data-[state=open]:opacity-100 data-[state=open]:zoom-in-100',
].join(' ');

// Cache en memoria para profesionales OCI (evita GET en cada apertura de expediente)
let cacheProfesionalesOCI: { data: any[]; ts: number } | null = null;
const CACHE_PROFESIONALES_MS = 5 * 60 * 1000;

function agruparEvidenciasPorHallazgo(evidencias: any[]): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  for (const ev of evidencias || []) {
    const hid = ev.hallazgoId || ev.hallazgo_id || ev.hallazgo?.id;
    if (!hid) continue;
    const key = String(hid);
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface ExpedienteAuditoriaCompletoProps {
  auditoriaId?: string;
  auditoriaDataInicial?: any; // Objeto completo de la auditoría (incluye documentoCierre)
  isOpen: boolean;
  onClose: () => void;
  tabInicial?: string;
  /** Se llama cuando se finaliza Comunicación (pasa a Seguimiento). Permite al padre recargar el Kanban. */
  onComunicacionCompletada?: () => void;
}

export function ExpedienteAuditoriaCompleto({
  auditoriaId,
  auditoriaDataInicial,
  isOpen,
  onClose,
  tabInicial = 'general',
  onComunicacionCompletada: onComunicacionCompletadaProp,
}: ExpedienteAuditoriaCompletoProps) {
  const normalizarFaseBackend = (faseRaw: string | undefined | null): string => {
    const fase = (faseRaw || '').toString().trim().toLowerCase();
    const mapeo: Record<string, string> = {
      'planeacion': 'planeacion',
      'planeación': 'planeacion',
      'ejecucion': 'en-curso',
      'ejecución': 'en-curso',
      'en-curso': 'en-curso',
      'en curso': 'en-curso',
      'comunicacion': 'revision',
      'comunicación': 'revision',
      'revision': 'revision',
      'revisión': 'revision',
      'seguimiento': 'completada',
      'finalizada': 'completada',
      'completada': 'completada',
    };
    return mapeo[fase] || fase;
  };

  const calcularProgresoPorFases = (
    faseRaw: string | undefined | null,
    progresoRaw: number | undefined | null
  ) => {
    const progreso = Math.max(0, Math.min(Number(progresoRaw || 0), 100));
    const fase = normalizarFaseBackend(faseRaw);

    if (fase === 'planeacion') {
      return { general: progreso, planeacion: progreso, ejecucion: 0, comunicacion: 0 };
    }
    if (fase === 'en-curso') {
      return { general: progreso, planeacion: 100, ejecucion: progreso, comunicacion: 0 };
    }
    if (fase === 'revision') {
      return { general: progreso, planeacion: 100, ejecucion: 100, comunicacion: progreso };
    }
    if (fase === 'completada') {
      return { general: 100, planeacion: 100, ejecucion: 100, comunicacion: 100 };
    }

    return { general: progreso, planeacion: progreso, ejecucion: 0, comunicacion: 0 };
  };

  // ✅ CORREGIDO: Inicializar como null para evitar renderizar con datos MOCK
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  // ✅ CONECTADO AL BACKEND: Documentos se cargan del backend
  const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([]);
  // Ref para guardar el doc de cierre y re-inyectarlo en cada recarga
  const documentoCierreRef = useRef<DocumentoExpediente | null>(null);
  const auditoriaDataInicialRef = useRef<any>(null);
  const cargaEnCursoRef = useRef<string | null>(null);
  const [hallazgosExpediente, setHallazgosExpediente] = useState<Hallazgo[]>([]);
  const [evidenciasPorHallazgoExpediente, setEvidenciasPorHallazgoExpediente] = useState<
    Record<string, any[]>
  >({});
  const [documentosBackendRaw, setDocumentosBackendRaw] = useState<any[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  /** Bloqueo total solo si aún no hay datos para mostrar */
  const [loading, setLoading] = useState(false);
  /** Sincronización en segundo plano (con vista previa del Kanban visible) */
  const [refreshing, setRefreshing] = useState(false);
  /** true cuando terminó la carga inicial/recarga (evita pasar precarga vacía a hijos) */
  const [expedienteListo, setExpedienteListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recargarTrigger, setRecargarTrigger] = useState(0);

  /** Vista previa instantánea con datos que ya trae la tarjeta del Kanban */
  const construirAuditoriaDesdeKanban = (card: any): Auditoria => {
    const progresoFases = calcularProgresoPorFases(card.fase, card.progreso);
    const estadoKanban = card.estadoKanban || card.estado || card.fase || '';
    const e = String(estadoKanban).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let estado: EstadoAuditoria = 'planeacion';
    if (e.includes('ejecucion') || e.includes('en curso')) estado = 'ejecucion';
    else if (e.includes('comunicacion') || e.includes('revision')) estado = 'comunicacion';
    else if (e.includes('seguimiento')) estado = 'seguimiento';
    else if (e.includes('finalizada') || e.includes('completada')) estado = 'finalizada';

    return {
      id: card.id,
      codigo: card.codigo || `AUD-${String(card.id || '').slice(0, 8)}`,
      nombre: card.titulo || card.nombre || card.descripcion || 'Auditoría',
      territorial: card.territorial,
      tipo: mapearTipoAuditoria(card.tipo),
      estado,
      areaAuditable: card.areaObjetivo || card.territorial || 'Sin área definida',
      procesoNombre: card.areaObjetivo || card.titulo || '',
      nivelRiesgo: (card.riesgo || card.riesgoKanban || 'Medio') as NivelRiesgo,
      responsableArea: {
        id: '1',
        nombre: card.responsableAreaNombre || 'Sin responsable asignado',
        cargo: card.responsableAreaCargo || 'Responsable',
        email: card.responsableAreaEmail || 'Sin email',
      },
      auditorLider: {
        id: '1',
        nombre: typeof card.auditorLider === 'string' ? card.auditorLider : card.auditorLider?.nombre || 'Sin auditor líder',
        email: '',
      },
      equipoAuditores: [],
      cronograma: {
        fechaCreacion: parseLocalDate(card.fechaInicio || Date.now()),
        fechaInicio: parseLocalDate(card.fechaInicio || Date.now()),
        fechaFin: parseLocalDate(card.fechaFin || Date.now()),
        duracionDias: 0,
        diasTranscurridos: 0,
      },
      progreso: progresoFases,
      estadisticas: {
        totalHallazgos: Number(card.hallazgos) || 0,
        hallazgosCriticos: 0,
        hallazgosGraves: 0,
        hallazgosModerados: 0,
        hallazgosLeves: 0,
        hallazgosBorrador: Number(card.hallazgos) || 0,
        hallazgosMayores: 0,
        hallazgosMenores: Number(card.hallazgos) || 0,
        documentosCargados: Number(card.documentos) || 0,
        notificacionesEnviadas: 0,
      },
      fechasClave: {
        planeacionInicio: card.fechaInicio ? parseLocalDate(card.fechaInicio) : undefined,
      },
      metadata: {
        creadoPor: 'Sistema',
        fechaCreacion: new Date(),
        ultimaModificacion: new Date(),
        modificadoPor: 'Sistema',
        version: 1,
      },
      checklistCompletados: card.checklistCompletados || {},
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    if (auditoriaDataInicial) {
      auditoriaDataInicialRef.current = auditoriaDataInicial;
      setAuditoria(construirAuditoriaDesdeKanban(auditoriaDataInicial));
    }
  }, [isOpen, auditoriaId, auditoriaDataInicial]);

  // ✅ Cargar datos del backend cuando se abre el modal (paralelo + sin bloquear por profesionales)
  useEffect(() => {
    if (!isOpen) {
      setAuditoria(null);
      setDocumentos([]);
      setHistorial([]);
      setHallazgosExpediente([]);
      setEvidenciasPorHallazgoExpediente({});
      setDocumentosBackendRaw([]);
      documentoCierreRef.current = null;
      auditoriaDataInicialRef.current = null;
      cargaEnCursoRef.current = null;
      setLoading(false);
      setRefreshing(false);
      setExpedienteListo(false);
      setError(null);
      return;
    }
    if (!auditoriaId) return;

    setExpedienteListo(false);

    const claveCarga = `${auditoriaId}:${recargarTrigger}`;
    if (cargaEnCursoRef.current === claveCarga) return;
    cargaEnCursoRef.current = claveCarga;

    let cancelled = false;

    const cargarAuditoria = async () => {
      const snapshotInicial = auditoriaDataInicialRef.current;
      const snapshotKanban = snapshotInicial
        ? construirAuditoriaDesdeKanban(snapshotInicial)
        : null;
      if (snapshotKanban && !cancelled) {
        setAuditoria(snapshotKanban);
      }
      if (snapshotKanban) {
        setRefreshing(true);
        setLoading(false);
      } else {
        setLoading(true);
        setRefreshing(false);
      }
      setError(null);

      try {
        const [data, hallazgosData, historialData] = await Promise.all([
          controlInternoService.getAuditoriaById(auditoriaId),
          controlInternoService.getHallazgosByAuditoria(auditoriaId).catch(() => []),
          controlInternoService.getHistorialAuditoria(auditoriaId).catch(() => []),
        ]);
        if (cancelled) return;

        // Mapear datos del backend a la estructura del frontend
        const progresoFases = calcularProgresoPorFases(data.fase, data.progreso);

        const auditoriaBackend: Auditoria = {
          id: data.id,
          codigo: data.codigo,
          nombre: data.nombre,
          territorial: data.territorial || data.sede || undefined,
          tipo: mapearTipoAuditoria(data.tipo),
          // Priorizar estadoKanban (Seguimiento vs Finalizada) sobre fase (ambos son COMPLETADA)
          estado: mapearEstado(data.estadoKanban || data.fase),
          areaAuditable: data.areaObjetivo || data.territorial || 'Sin área definida',
          procesoNombre: data.procesoAuditado || data.nombre,
          nivelRiesgo: (data.riesgoKanban || 'Medio') as NivelRiesgo,

          responsableArea: {
            id: String(data.auditorLiderId || '1'),
            nombre: data.responsableAreaNombre || 'Sin responsable asignado',
            cargo: data.responsableAreaCargo || 'Responsable',
            email: data.responsableAreaEmail || 'Sin email',
            telefono: undefined,
          },

          auditorLider: {
            id: String(data.auditorLiderId || '1'),
            nombre: data.auditorLider?.nombre || data.auditorLider || 'Sin auditor líder',
            email: data.auditorLider?.email || data.auditorLiderEmail || data.emailAuditorLider || 'auditor@esap.edu.co',
            foto: undefined,
          },

          equipoAuditores: Array.isArray(data.equipoAuditores)
            ? data.equipoAuditores.map((eq: any) => ({
              id: eq.id || String(eq.personaId || eq.idTercero || '1'),
              nombre: eq.nombreCompleto || eq.nombre || (typeof eq === 'string' ? eq : 'Auditor'),
              rol: eq.rol || 'Auditor',
              email: eq.email || eq.correo || 'auditor@esap.edu.co',
              foto: undefined,
            }))
            : [],

          cronograma: {
            fechaCreacion: parseLocalDate(data.createdAt || data.fechaInicio),
            fechaInicio: parseLocalDate(data.fechaInicio),
            fechaFin: parseLocalDate(data.fechaFin),
            fechaFinReal: data.fechaFinReal ? parseLocalDate(data.fechaFinReal) : undefined,
            duracionDias: calcularDiasDuracion(data.fechaInicio, data.fechaFin),
            diasTranscurridos: calcularDiasTranscurridos(data.fechaInicio),
          },

          progreso: progresoFases,

          estadisticas: {
            totalHallazgos: data.hallazgos || 0,
            hallazgosCriticos: 0,
            hallazgosGraves: 0,
            hallazgosModerados: 0,
            hallazgosLeves: 0,
            hallazgosBorrador: data.hallazgos || 0,
            hallazgosMayores: 0,
            hallazgosMenores: data.hallazgos || 0,
            documentosCargados: data.totalDocumentos || 0,
            notificacionesEnviadas: 0,
          },

          fechasClave: {
            planeacionInicio: parseLocalDate(data.fechaInicio),
            planeacionFin: data.fechaFinPlaneacion ? parseLocalDate(data.fechaFinPlaneacion) : undefined,
            ejecucionInicio: data.fechaInicioEjecucion ? parseLocalDate(data.fechaInicioEjecucion) : undefined,
            ejecucionFin: data.fechaFinEjecucion ? parseLocalDate(data.fechaFinEjecucion) : undefined,
            comunicacionInicio: data.fechaInicioComunicacion ? parseLocalDate(data.fechaInicioComunicacion) : undefined,
            comunicacionFin: data.fechaFin ? parseLocalDate(data.fechaFin) : undefined,
            informePreliminar: undefined,
            informeFinal: undefined,
          },

          metadata: {
            creadoPor: data.responsable || 'Sistema',
            fechaCreacion: new Date(data.createdAt || data.fechaInicio),
            ultimaModificacion: new Date(data.updatedAt || Date.now()),
            modificadoPor: 'Sistema',
            version: 1,
          },

          // ✅ Campos del formulario de creación
          descripcion: data.descripcion || '',
          alcance: data.alcance || '',
          metodologia: data.metodologia || '',
          observacionesAdicionales: data.observacionesAdicionales || '',
          calificacionRiesgo: data.calificacionRiesgo || '',
          sede: data.sede || '',
          presupuestoEstimado: data.presupuestoEstimado || '',
          objetivos: Array.isArray(data.objetivos)
            ? data.objetivos.map((o: any) => typeof o === 'string' ? o : o.descripcion || o.texto || o.nombre || '')
            : [],
          criteriosAuditoria: Array.isArray(data.criterios)
            ? data.criterios.map((c: any) => typeof c === 'string' ? c : c.criterio || c.descripcion || c.texto || c.nombre || '')
            : [],
          normatividadAplicable: Array.isArray(data.normatividadAplicable)
            ? data.normatividadAplicable
            : [],
          riesgosIdentificados: Array.isArray(data.riesgosIdentificados)
            ? data.riesgosIdentificados
            : [],
          controlesAplicar: Array.isArray(data.controlesAplicar)
            ? data.controlesAplicar
            : [],

          // Checklist de actividades del proceso
          checklistCompletados: data.checklistCompletados || {},
        };

        if (cancelled) return;
        setAuditoria(auditoriaBackend);

        if (Array.isArray(hallazgosData)) {
          setHallazgosExpediente(hallazgosData as Hallazgo[]);
        }

        const documentosFinales: DocumentoExpediente[] = [];
        try {
          const { documentos: docsYevidencias, evidenciasRaw, documentosBackendRaw: docsRaw } =
            await cargarDocumentosYevidencias(auditoriaId);
          if (!cancelled) {
            documentosFinales.push(...docsYevidencias);
            setDocumentosBackendRaw(Array.isArray(docsRaw) ? docsRaw : []);
            setEvidenciasPorHallazgoExpediente(agruparEvidenciasPorHallazgo(evidenciasRaw));
          }
        } catch (docErr) {
          console.error('Error cargando documentos:', docErr);
        }
        if (cancelled) return;

        // ✅ Si existe documento de cierre, agregarlo SIEMPRE al inicio
        // PRIORIDAD: snapshot Kanban > data (de getAuditoriaById)
        const documentoCierre =
          snapshotInicial?.documentoCierre ||
          data.documentoCierre ||
          data.documento_cierre;
        if (documentoCierre && documentoCierre.url) {
          const serviceUrl = getServiceUrl('control-institucional');
          const baseUrl = API_MODE === 'gateway'
            ? `${serviceUrl}/control-institucional/api/v1`
            : serviceUrl;

          const docCierreEntry: DocumentoExpediente = {
            id: 'doc-cierre',
            nombre: documentoCierre.nombre || 'Documento de Cierre',
            tipo: 'Informe',
            fase: 'comunicacion',
            fechaCarga: new Date(documentoCierre.fechaCarga || data.fechaFinalizacion || Date.now()),
            cargadoPor: documentoCierre.cargadoPor || data.finalizadaPor || 'Sistema',
            size: documentoCierre.tamano ? `${Math.round(documentoCierre.tamano / 1024)} KB` : 'N/A',
            tipoMime: documentoCierre.tipo || 'application/pdf',
            urlDownload: documentoCierre.url?.startsWith('http')
              ? documentoCierre.url
              : `${baseUrl}${documentoCierre.url}`,
            urlPreview: documentoCierre.url?.startsWith('http')
              ? documentoCierre.url
              : `${baseUrl}${documentoCierre.url}`,
            version: 1,
            descripcion: `📌 Documento de cierre oficial de la auditoría${data.observacionesCierre ? ': ' + data.observacionesCierre : ''}`,
          };
          documentoCierreRef.current = docCierreEntry;
          documentosFinales.unshift(docCierreEntry);
        }

        setDocumentos(documentosFinales);

        if (Array.isArray(hallazgosData)) {
          const criticos = hallazgosData.filter((h) => h.categoria === 'critico').length;
          const graves = hallazgosData.filter((h) => h.categoria === 'grave').length;
          const moderados = hallazgosData.filter((h) => h.categoria === 'moderado').length;
          const leves = hallazgosData.filter((h) => h.categoria === 'leve').length;
          const borradores = hallazgosData.filter((h) => h.categoria === 'borrador' || !h.categoria).length;

          setAuditoria((prev) =>
            prev
              ? {
                ...prev,
                estadisticas: {
                  ...prev.estadisticas,
                  totalHallazgos: hallazgosData.length,
                  hallazgosCriticos: criticos,
                  hallazgosGraves: graves,
                  hallazgosModerados: moderados,
                  hallazgosLeves: leves,
                  hallazgosBorrador: borradores,
                  hallazgosMayores: graves,
                  hallazgosMenores: leves + moderados,
                },
              }
              : null,
          );
        }

        setHistorial(
          Array.isArray(historialData) ? mapearHistorialBackend(historialData) : [],
        );

        // Emails de profesionales: en segundo plano (cache 5 min, no bloquea la UI)
        void (async () => {
          try {
            let profs: any[] = [];
            const ahora = Date.now();
            if (
              cacheProfesionalesOCI &&
              ahora - cacheProfesionalesOCI.ts < CACHE_PROFESIONALES_MS
            ) {
              profs = cacheProfesionalesOCI.data;
            } else {
              const profsRes = await configuracionesProfesionalesOCIApi.getAll(true);
              profs = Array.isArray(profsRes.data)
                ? profsRes.data
                : Array.isArray(profsRes)
                  ? profsRes
                  : [];
              if (profs.length > 0) {
                cacheProfesionalesOCI = { data: profs, ts: ahora };
              }
            }
            if (profs.length === 0) return;

            setAuditoria((prev) => {
              if (!prev) return null;
              const matchProf = (pId: string, pNombre: string) => {
                const n = (pNombre || '').toLowerCase().trim();
                return profs.find((p: any) => {
                  if (pId && pId !== '1' && (p.idTercero == pId || p.id == pId || p.identificacion == pId))
                    return true;
                  const pName = (p.nombre || p.persona?.nombre || p.nom_largo || p.nombreCompleto || '')
                    .toLowerCase()
                    .trim();
                  if (!pName || !n) return false;
                  if (pName === n || pName.includes(n) || n.includes(pName)) return true;
                  const tP = pName.split(/\s+/).filter((t: string) => t.length > 2);
                  const tN = n.split(/\s+/).filter((t: string) => t.length > 2);
                  return tP.filter((t: string) => tN.includes(t)).length >= 2;
                });
              };
              const foundLider = matchProf(prev.auditorLider.id, prev.auditorLider.nombre);
              const emailLider =
                foundLider?.email || foundLider?.persona?.email || prev.auditorLider.email;
              const equipoEnriquecido = prev.equipoAuditores.map((aud) => {
                const found = matchProf(aud.id, aud.nombre);
                return { ...aud, email: found?.email || found?.persona?.email || aud.email };
              });
              return {
                ...prev,
                auditorLider: { ...prev.auditorLider, email: emailLider },
                equipoAuditores: equipoEnriquecido,
              };
            });
          } catch (err) {
            console.error('Error enriqueciendo correos de profesionales:', err);
          }
        })();
      } catch (err: any) {
        console.error('Error cargando auditoría:', err);
        if (!cancelled) setError(err?.message || 'Error desconocido');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          setExpedienteListo(true);
          if (cargaEnCursoRef.current === claveCarga) {
            cargaEnCursoRef.current = null;
          }
        }
      }
    };

    void cargarAuditoria();
    return () => {
      cancelled = true;
    };
  }, [isOpen, auditoriaId, recargarTrigger]);

  // ✅ Función para mapear historial del backend al formato del frontend
  function mapearHistorialBackend(data: any[]): EventoHistorial[] {
    const iconosPorTipo: Record<string, React.ReactNode> = {
      'creacion': <CheckCircle className="w-5 h-5" />,
      'cambio_estado': <Activity className="w-5 h-5" />,
      'asignacion': <Users className="w-5 h-5" />,
      'actualizacion': <Edit2 className="w-5 h-5" />,
      'documento': <FileText className="w-5 h-5" />,
      'hallazgo': <AlertCircle className="w-5 h-5" />,
      'nota': <MessageSquare className="w-5 h-5" />,
      'aprobacion': <CheckSquare className="w-5 h-5" />,
      'finalizacion': <Award className="w-5 h-5" />,
      'eliminacion': <Trash2 className="w-5 h-5" />,
      'archivo': <Archive className="w-5 h-5" />,
      'ampliacion_plazo': <Clock className="w-5 h-5" />,
    };

    const coloresPorTipo: Record<string, string> = {
      'creacion': '#10b981',
      'cambio_estado': '#3b82f6',
      'asignacion': '#8b5cf6',
      'actualizacion': '#f59e0b',
      'documento': '#06b6d4',
      'hallazgo': '#ef4444',
      'nota': '#6366f1',
      'aprobacion': '#22c55e',
      'finalizacion': '#059669',
      'eliminacion': '#dc2626',
      'archivo': '#64748b',
      'ampliacion_plazo': '#f97316',
    };

    return data.map((evento: any) => ({
      id: evento.id,
      tipo: mapearTipoEvento(evento.tipo),
      titulo: evento.accion || evento.titulo || 'Evento',
      descripcion: evento.descripcion || '',
      usuario: evento.usuario || 'Sistema',
      fecha: new Date(evento.fecha + 'T' + (evento.hora || '00:00:00')),
      icono: iconosPorTipo[evento.tipo] || <Activity className="w-5 h-5" />,
      color: coloresPorTipo[evento.tipo] || '#6b7280',
    }));
  }

  function mapearTipoEvento(tipo: string): EventoHistorial['tipo'] {
    const mapeo: Record<string, EventoHistorial['tipo']> = {
      'creacion': 'accion',
      'cambio_estado': 'cambio-estado',
      'asignacion': 'accion',
      'actualizacion': 'accion',
      'documento': 'documento',
      'hallazgo': 'accion',
      'nota': 'comentario',
      'aprobacion': 'accion',
      'finalizacion': 'cambio-estado',
      'eliminacion': 'accion',
      'archivo': 'documento',
      'ampliacion_plazo': 'notificacion',
    };
    return mapeo[tipo] || 'accion';
  }

  // ✅ Función para mapear documentos del backend al formato del frontend
  function mapearDocumentosBackend(data: any[]): DocumentoExpediente[] {
    // Construir base URL para documentos
    const baseUrl = getDocumentosBaseUrl();

    return (data || []).map((doc: any) => ({
      id: doc.id,
      nombre: doc.nombre || doc.nombreArchivo || 'Sin nombre',
      tipo: mapearTipoDocumento(doc.tipoDocumento || doc.tipo),
      fase: mapearFaseDocumento(doc.etapa || doc.fase),
      fechaCarga: new Date(doc.fechaCarga || doc.createdAt || Date.now()),
      cargadoPor: doc.subidoPor || doc.cargadoPor || 'Sistema',
      size: doc.tamanio || doc.size || formatFileSize(Number(doc.tamanioBytes) || 0),
      tipoMime: doc.tipoMime || 'application/octet-stream',
      urlPreview: `${baseUrl}/documentos/${doc.id}/preview`,
      urlDownload: `${baseUrl}/documentos/${doc.id}/download`,
      version: doc.version || 1,
      descripcion: doc.descripcion,
      origenListaChequeo: (doc.tipoDocumento === 'lista_chequeo') || !!doc.documentoBibliotecaId,
      documentoBibliotecaId: doc.documentoBibliotecaId || null,
    }));
  }

  /** Evidencias de hallazgos/acciones (tabla evidencia_documento, no documentos) */
  function mapearEvidenciasBackend(data: any[]): DocumentoExpediente[] {
    const baseUrl = getDocumentosBaseUrl();
    return (data || []).map((ev: any) => ({
      id: ev.id,
      nombre: ev.nombre || ev.nombreArchivoOriginal || 'Evidencia',
      tipo: 'Evidencia' as DocumentoExpediente['tipo'],
      fase: 'ejecucion' as DocumentoExpediente['fase'],
      fechaCarga: new Date(ev.fechaSubida || ev.createdAt || Date.now()),
      cargadoPor: ev.subidoPor || 'Sistema',
      size: formatFileSize(Number(ev.tamanioBytes) || 0),
      tipoMime: ev.tipoMime || 'application/octet-stream',
      urlPreview: `${baseUrl}/evidencias/${ev.id}/preview`,
      urlDownload: `${baseUrl}/evidencias/${ev.id}/download`,
      version: 1,
      descripcion:
        ev.descripcion ||
        (ev.hallazgoId ? '📎 Evidencia de hallazgo' : '📎 Evidencia adjunta'),
    }));
  }

  async function cargarDocumentosYevidencias(auditoriaIdParam: string): Promise<{
    documentos: DocumentoExpediente[];
    evidenciasRaw: any[];
    documentosBackendRaw: any[];
  }> {
    const [documentosData, evidenciasData] = await Promise.all([
      controlInternoService.getDocumentosByAuditoria(auditoriaIdParam).catch(() => []),
      controlInternoService.getEvidenciasByAuditoria(auditoriaIdParam).catch(() => []),
    ]);
    const docsRaw = Array.isArray(documentosData) ? documentosData : [];
    const evidenciasRaw = Array.isArray(evidenciasData) ? evidenciasData : [];
    const documentosMapeados = mapearDocumentosBackend(docsRaw);
    const evidenciasMapeadas = mapearEvidenciasBackend(evidenciasRaw);
    const ids = new Set(documentosMapeados.map((d) => d.id));
    const evidenciasSinDuplicar = evidenciasMapeadas.filter((e) => !ids.has(e.id));
    return {
      documentos: [...documentosMapeados, ...evidenciasSinDuplicar],
      evidenciasRaw,
      documentosBackendRaw: docsRaw,
    };
  }

  // ✅ Obtener URL base del servicio de documentos
  function getDocumentosBaseUrl(): string {
    const serviceUrl = getServiceUrl('control-institucional');
    return API_MODE === 'gateway'
      ? `${serviceUrl}/control-institucional/api/v1`
      : serviceUrl;
  }

  function mapearTipoDocumento(tipo: string): DocumentoExpediente['tipo'] {
    const mapeo: Record<string, DocumentoExpediente['tipo']> = {
      'oficio': 'Oficio',
      'Oficio': 'Oficio',
      'carta': 'Carta',
      'Carta': 'Carta',
      'acta': 'Acta',
      'Acta': 'Acta',
      'informe': 'Informe',
      'Informe': 'Informe',
      'evidencia': 'Evidencia',
      'Evidencia': 'Evidencia',
      'lista-chequeo': 'Lista-Chequeo',
      'Lista-Chequeo': 'Lista-Chequeo',
      'lista_chequeo': 'Lista-Chequeo',
      'plantilla': 'Plantilla',
      'Plantilla': 'Plantilla',
    };
    return mapeo[tipo] || 'Otro';
  }

  function mapearFaseDocumento(fase: string): DocumentoExpediente['fase'] {
    const mapeo: Record<string, DocumentoExpediente['fase']> = {
      'planeacion': 'planeacion',
      'Planeación': 'planeacion',
      'ejecucion': 'ejecucion',
      'Ejecución': 'ejecucion',
      'comunicacion': 'comunicacion',
      'Comunicación': 'comunicacion',
    };
    return mapeo[fase] || 'planeacion';
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ✅ Función para recargar documentos desde el backend
  const recargarDocumentos = async () => {
    if (!auditoriaId) return;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(auditoriaId)) return;

    setLoadingDocumentos(true);
    try {
      const { documentos: documentosMapeados, evidenciasRaw, documentosBackendRaw: docsRaw } =
        await cargarDocumentosYevidencias(auditoriaId);
      setDocumentosBackendRaw(docsRaw);
      setEvidenciasPorHallazgoExpediente(agruparEvidenciasPorHallazgo(evidenciasRaw));
      // ✅ Re-inyectar el documento de cierre al inicio si existe
      if (documentoCierreRef.current) {
        documentosMapeados.unshift(documentoCierreRef.current);
      }
      setDocumentos(documentosMapeados);
    } catch (err) {
      console.error('Error recargando documentos:', err);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  // ✅ Función para subir un documento al backend
  const subirDocumento = async (
    file: File,
    metadata: { nombre: string; descripcion?: string; tipoDocumento: string; etapa: string }
  ): Promise<boolean> => {
    if (!auditoriaId) return false;

    try {
      await controlInternoService.createDocumento(file, {
        nombre: metadata.nombre,
        descripcion: metadata.descripcion,
        tipoDocumento: metadata.tipoDocumento,
        etapa: metadata.etapa,
        auditoriaId: auditoriaId,
      });

      // 🚀 DISPARAR EVENTO AL BACKEND
      try {
        await notificationsService.triggerEvent('EVT-DOC-001', {
          auditoriaId: auditoriaId,
          auditoriaCodigo: auditoria?.codigo || `AUD-${auditoriaId.substring(0, 4)}`,
          tituloCustom: 'Nuevo Documento Cargado',
          mensajeCustom: `Se ha cargado el documento ${metadata.nombre} en el expediente ${auditoria?.codigo || ''}.`,
          url_accion: '/control-interno/auditorias-oci',
        });
      } catch (e) {
        console.error('Error disparando notificación:', e);
      }

      // Recargar documentos después de subir
      await recargarDocumentos();
      return true;
    } catch (err) {
      console.error('Error subiendo documento:', err);
      return false;
    }
  };

  // ✅ Función para actualizar checklist de actividades en el backend
  const handleToggleChecklist = async (itemId: string, completado: boolean) => {
    // ✅ Guardia: no ejecutar si no hay auditoría cargada
    if (!auditoria) return;

    // Actualizar estado local inmediatamente (optimistic update)
    const nuevoChecklist = {
      ...auditoria.checklistCompletados,
      [itemId]: completado,
    };
    setAuditoria(prev => prev ? ({
      ...prev,
      checklistCompletados: nuevoChecklist,
    }) : null);

    // Si es un UUID válido (auditoría real), guardar en backend
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(auditoria.id)) {
      try {
        await controlInternoService.updateAuditoria(auditoria.id, {
          checklistCompletados: nuevoChecklist,
        });
      } catch (err) {
        console.error('Error actualizando checklist:', err);
      }
    }
  };

  // Funciones auxiliares para mapeo

  /**
   * Mapea el tipo de auditoría del backend/Kanban al formato del Expediente.
   * Respeta el valor original configurado en la creación de la auditoría.
   * Backend enum: Regular | Territorial | Especial
   */
  function mapearTipoAuditoria(tipo?: string): TipoAuditoria {
    if (!tipo) return 'Regular';
    const t = tipo.toLowerCase().trim();
    if (t === 'territorial') return 'Territorial';
    if (t === 'especial') return 'Especial';
    // 'regular', 'sede', 'gestión', 'cumplimiento', etc. → Regular
    return 'Regular';
  }

  function mapearEstado(fase: string): EstadoAuditoria {
    const e = String(fase || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (e.includes('plan anual') || e.includes('planeacion')) return 'planeacion';
    if (e.includes('ejecucion') || e.includes('en curso') || e === 'en-curso') return 'ejecucion';
    if (e.includes('comunicacion') || e.includes('revision')) return 'comunicacion';
    if (e.includes('seguimiento')) return 'seguimiento';
    if (e.includes('finalizada') || e.includes('completada')) return 'finalizada';
    return 'planeacion';
  }

  function calcularDiasDuracion(fechaInicio: string, fechaFin: string): number {
    const inicio = parseLocalDate(fechaInicio);
    const fin = parseLocalDate(fechaFin);
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  function calcularDiasTranscurridos(fechaInicio: string): number {
    const inicio = parseLocalDate(fechaInicio);
    const hoy = new Date();
    return Math.max(0, Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // ✅ AUTO-DETECCIÓN: Si no se especifica tab, detectar según el estado de la auditoría
  const getTabAutomatico = () => {
    if (tabInicial !== 'general') return tabInicial as TabActiva;
    // ✅ Guardia: si no hay auditoría, devolver tab por defecto
    if (!auditoria) return 'general';
    const estadoLower = auditoria.estado.toLowerCase();
    if (estadoLower === 'planeación' || estadoLower === 'planeacion') return 'planeacion';
    if (estadoLower === 'ejecución' || estadoLower === 'ejecucion') return 'ejecucion';
    if (estadoLower === 'comunicación' || estadoLower === 'comunicacion') return 'comunicacion';
    if (estadoLower === 'seguimiento') return 'seguimiento';
    if (estadoLower === 'finalizada') return 'finalizada';
    return 'general';
  };

  const [activeTab, setActiveTab] = useState<TabActiva>(getTabAutomatico());
  const [filtroDocumentos, setFiltroDocumentos] = useState<string>('todos');
  const wasOpenRef = useRef(false);

  // Solo aplicar tab automático al ABRIR el modal; no sobrescribir cuando el usuario ya eligió una pestaña
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened && isOpen) {
      const tab = tabInicial && tabInicial !== 'general' ? (tabInicial as TabActiva) : getTabAutomatico();
      setActiveTab(tab);
    }
  }, [isOpen, tabInicial, auditoria?.estado]);

  const pestanasVisibles = useMemo(
    () => filtrarPestanasPorEstado(auditoria?.estado),
    [auditoria?.estado],
  );

  // Si la pestaña activa quedó oculta (ej. Comunicación estando en Planeación), volver a una válida
  useEffect(() => {
    if (!auditoria?.estado || pestanasVisibles.length === 0) return;
    const ids = new Set(pestanasVisibles.map((p) => p.id));
    if (!ids.has(activeTab)) {
      const preferida =
        pestanasVisibles.find((p) => p.id === getTabAutomatico())?.id ??
        pestanasVisibles.find((p) => p.id === 'planeacion')?.id ??
        pestanasVisibles[0]?.id ??
        'general';
      setActiveTab(preferida);
    }
  }, [auditoria?.estado, pestanasVisibles, activeTab]);

  // Cuando la auditoría pasa a Finalizada (ej. tras aprobar informe cierre), ir al tab Finalizada
  useEffect(() => {
    if (auditoria?.estado === 'finalizada') {
      setActiveTab('finalizada');
    }
  }, [auditoria?.estado]);

  // Al cargar la auditoría, seleccionar tab según estado (ej. Seguimiento si está en seguimiento)
  const hasAppliedTabFromAuditoriaRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAppliedTabFromAuditoriaRef.current = false;
      return;
    }
    if (!auditoria) return;
    if (hasAppliedTabFromAuditoriaRef.current) return;
    hasAppliedTabFromAuditoriaRef.current = true;
    const tab = getTabAutomatico();
    setActiveTab(tab);
  }, [isOpen, auditoria?.id, auditoria?.estado]);

  const diasRestantes = useMemo(() => {
    if (!auditoria?.cronograma?.fechaFin) return 0;
    const hoy = new Date();
    const fin = new Date(auditoria.cronograma.fechaFin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [auditoria?.cronograma?.fechaFin]);

  const documentosFiltrados = useMemo(() => {
    if (filtroDocumentos === 'todos') return documentos;
    return documentos.filter((doc) => doc.fase === filtroDocumentos);
  }, [documentos, filtroDocumentos]);

  const exportarExpedienteExcel = () => {
    if (!auditoria) {
      toast.error('❌ Error', { description: 'No hay auditoría cargada para exportar' });
      return;
    }
    try {
      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');

      // Hoja 1: Información General
      const infoGeneral = [
        ['EXPEDIENTE DE AUDITORÍA - ESAP'],
        [''],
        ['INFORMACIÓN GENERAL'],
        ['Código', auditoria.codigo],
        ['Nombre', auditoria.nombre],
        ['Tipo', auditoria.tipo],
        ['Estado', auditoria.estado.toUpperCase()],
        ['Área Auditable', auditoria.areaAuditable],
        ['Proceso', auditoria.procesoNombre],
        ['Nivel de Riesgo', auditoria.nivelRiesgo],
        [''],
        ['CRONOGRAMA'],
        ['Fecha Inicio', auditoria.cronograma?.fechaInicio || 'N/A'],
        ['Fecha Fin', auditoria.cronograma?.fechaFin || 'N/A'],
        [''],
        ['RESPONSABLE DEL ÁREA AUDITADA'],
        ['Nombre', auditoria.responsableArea.nombre],
        ['Cargo', auditoria.responsableArea.cargo],
        ['Email', auditoria.responsableArea.email],
        [''],
        ['AUDITOR LÍDER'],
        ['Nombre', auditoria.auditorLider.nombre],
        ['Email', auditoria.auditorLider.email],
      ];

      // Hoja 2: Equipo Auditor
      const equipoData = [
        ['ROL', 'NOMBRE', 'EMAIL'],
        ['Auditor Líder', auditoria.auditorLider.nombre, auditoria.auditorLider.email],
        ...auditoria.equipoAuditores.map(a => [a.rol, a.nombre, a.email])
      ];

      // Hoja 3: Progreso
      const progresoData = [
        ['FASE', 'AVANCE', 'ESTADO'],
        ['Planeación', `${auditoria.progreso.planeacion}%`, auditoria.progreso.planeacion === 100 ? 'Completada' : 'En progreso'],
        ['Ejecución', `${auditoria.progreso.ejecucion}%`, auditoria.progreso.ejecucion === 100 ? 'Completada' : 'En progreso'],
        ['Comunicación', `${auditoria.progreso.comunicacion}%`, auditoria.progreso.comunicacion > 0 ? 'En progreso' : 'Pendiente'],
        ['GENERAL', `${auditoria.progreso.general}%`, '']
      ];

      // Hoja 4: Estadísticas (Hallazgos)
      const hallazgosData = [
        ['TIPO DE HALLAZGO', 'CANTIDAD'],
        ['Críticos', auditoria.estadisticas.hallazgosCriticos],
        ['Mayores', auditoria.estadisticas.hallazgosMayores],
        ['Menores', auditoria.estadisticas.hallazgosMenores],
        ['TOTAL', auditoria.estadisticas.totalHallazgos]
      ];

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.aoa_to_sheet(infoGeneral);
      XLSX.utils.book_append_sheet(wb, ws1, 'Información General');

      const ws2 = XLSX.utils.aoa_to_sheet(equipoData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Equipo Auditor');

      const ws3 = XLSX.utils.aoa_to_sheet(progresoData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Progreso');

      const ws4 = XLSX.utils.aoa_to_sheet(hallazgosData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Hallazgos');

      // Descargar
      XLSX.writeFile(wb, `Expediente_${auditoria.codigo}_${año}${mes}${dia}.xlsx`);

      toast.success('✅ Excel exportado exitosamente', {
        description: `Archivo: Expediente_${auditoria.codigo}_${año}${mes}${dia}.xlsx`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('⚠️ Error al exportar Excel', {
        description: 'Ocurrió un error al crear el archivo Excel',
        duration: 4000
      });
    }
  };

  const generarInformePDF = () => {
    // ✅ Guardia: no generar PDF si no hay auditoría
    if (!auditoria) {
      toast.error('❌ Error', { description: 'No hay auditoría cargada para generar el informe' });
      return;
    }
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const configAvance: ConfiguracionDocumento = {
        codigo: 'EM-FO-003',
        version: 2,
        fecha: '24/02/2025',
        titulo: 'INFORME DE AVANCE DE AUDITORÍA',
        proceso: 'EVALUACIÓN CONTROL Y MEJORA'
      };

      let yPos = dibujarEncabezadoInstitucional(doc, configAvance, 10);
      yPos += 5;

      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const consecutivo = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      const nomenclatura = `ESAP-DN-OCI-IF-${consecutivo}-${año}`;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Código: ${nomenclatura}`, pageWidth / 2, yPos, { align: 'center' });
      doc.text(`Fecha: ${dia}/${mes}/${año}`, pageWidth / 2, yPos + 5, { align: 'center' });

      yPos += 15;

      // Sección 1: Información General
      doc.setFillColor(0, 61, 165);
      doc.rect(14, yPos, pageWidth - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. INFORMACIÓN GENERAL', 16, yPos + 5);

      yPos += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);

      const infoGeneral = [
        ['Código:', auditoria.codigo],
        ['Nombre:', auditoria.nombre],
        ['Tipo:', auditoria.tipo],
        ['Estado:', auditoria.estado.toUpperCase()],
        ['Área:', auditoria.areaAuditable],
        ['Proceso:', auditoria.procesoNombre],
        ['Riesgo:', auditoria.nivelRiesgo]
      ];

      autoTable(doc, {
        startY: yPos,
        body: infoGeneral,
        theme: 'grid',
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [240, 240, 240] },
          1: { cellWidth: 130 }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Sección 2: Equipo Auditor
      doc.setFillColor(0, 61, 165);
      doc.rect(14, yPos, pageWidth - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('2. EQUIPO AUDITOR', 16, yPos + 5);

      yPos += 12;

      const equipoData = [
        ['Auditor Líder', auditoria.auditorLider.nombre, auditoria.auditorLider.email],
        ...auditoria.equipoAuditores.map(a => [a.rol, a.nombre, a.email])
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Rol', 'Nombre', 'Email']],
        body: equipoData,
        theme: 'grid',
        headStyles: { fillColor: [0, 61, 165], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Sección 3: Progreso
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(0, 61, 165);
      doc.rect(14, yPos, pageWidth - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('3. PROGRESO POR FASES', 16, yPos + 5);

      yPos += 12;

      const progresoData = [
        ['Planeación', `${auditoria.progreso.planeacion}%`, (auditoria.progreso.planeacion === 100 || auditoria.estado === 'finalizada') ? 'Completada' : 'En progreso'],
        ['Ejecución', `${auditoria.progreso.ejecucion}%`, (auditoria.progreso.ejecucion === 100 || auditoria.estado === 'finalizada') ? 'Completada' : 'En progreso'],
        ['Comunicación', `${auditoria.progreso.comunicacion}%`, (auditoria.progreso.comunicacion === 100 || auditoria.estado === 'finalizada') ? 'Completada' : auditoria.progreso.comunicacion > 0 ? 'En progreso' : 'Pendiente'],
        ['GENERAL', `${auditoria.progreso.general}%`, '']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Fase', 'Avance', 'Estado']],
        body: progresoData,
        theme: 'grid',
        headStyles: { fillColor: [0, 61, 165], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 80 }
        },
        didParseCell: function (data: any) {
          if (data.row.index === 3 && data.section === 'body') {
            data.cell.styles.fillColor = [0, 61, 165];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Sección 4: Hallazgos
      doc.setFillColor(0, 61, 165);
      doc.rect(14, yPos, pageWidth - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('4. HALLAZGOS', 16, yPos + 5);

      yPos += 12;

      const hallazgosData = [
        ['Críticos', auditoria.estadisticas.hallazgosCriticos.toString()],
        ['Mayores', auditoria.estadisticas.hallazgosMayores.toString()],
        ['Menores', auditoria.estadisticas.hallazgosMenores.toString()],
        ['TOTAL', auditoria.estadisticas.totalHallazgos.toString()]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Tipo', 'Cantidad']],
        body: hallazgosData,
        theme: 'grid',
        headStyles: { fillColor: [0, 61, 165], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 80, halign: 'center', fontStyle: 'bold', fontSize: 11 }
        },
        didParseCell: function (data: any) {
          if (data.row.index === 3 && data.section === 'body') {
            data.cell.styles.fillColor = [239, 68, 68];
            data.cell.styles.textColor = 255;
          }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Pie de página institucional
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarPieInstitucional(doc, i, true);
      }

      doc.save(`Informe_Avance_${auditoria.codigo}_${año}${mes}${dia}.pdf`);

      toast.success('✅ Informe generado exitosamente', {
        description: `PDF descargado: Informe_Avance_${auditoria.codigo}_${año}${mes}${dia}.pdf`,
        duration: 4000
      });

    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('⚠️ Error al generar informe', {
        description: error instanceof Error ? error.message : 'Ocurrió un error al crear el PDF. Por favor intenta nuevamente',
        duration: 4000
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size="expediente"
        hideCloseButton
        className={CLASE_MODAL_EXPEDIENTE}
        style={ESTILO_MODAL_EXPEDIENTE}
      >
        <DialogTitle className="sr-only">
          Expediente de Auditoría {auditoria?.codigo || auditoriaId || ''}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Visualización completa del expediente con pestañas por fase
        </DialogDescription>

        <div className="flex flex-col flex-1 min-h-0 h-full w-full relative overflow-hidden">
          {loading && !auditoria && (
            <div
              className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-white rounded-xl"
              role="status"
              aria-live="polite"
            >
              <div className="w-11 h-11 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-700">Cargando expediente…</p>
              {error && <p className="text-red-600 text-sm px-6 text-center">{error}</p>}
            </div>
          )}

          {!auditoria && !loading && error && (
            <div className="flex flex-1 min-h-[280px] items-center justify-center p-8 text-center text-red-600">
              {error}
            </div>
          )}

          {auditoria && (
            <>
              {/* ═════════════════════════════════════════════════════════════════
            HEADER WORLD-CLASS — Fondo blanco limpio (estilo ModalHeaderClean)
            ═════════════════════════════════════════════════════════════════ */}
              <div className="shrink-0 bg-white border-b border-gray-200 px-6 sm:px-8 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      {/* Icono con borde suave */}
                      <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-sm flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        {/* Título: text-xl font-black */}
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            {auditoria.codigo} · {auditoria.nombre}
                          </h2>
                          {refreshing && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold animate-pulse border border-blue-100">
                              <Activity className="w-3.5 h-3.5" />
                              Sincronizando
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          Expediente de Auditoría
                        </p>
                      </div>
                    </div>

                    {/* Barra de progreso inline + Badges outline */}
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-4 py-1 shadow-sm">
                        <div className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Progreso</div>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${auditoria.progreso.general}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700">{auditoria.progreso.general}%</span>
                      </div>

                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-700 font-bold py-1 px-2.5 text-xs">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {auditoria.areaAuditable}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 font-bold py-1 px-2.5 text-xs">
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        {documentos.length} documentos
                      </Badge>
                      {auditoria.estadisticas.totalHallazgos > 0 && (
                        <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 font-bold py-1 px-2.5 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                          {auditoria.estadisticas.totalHallazgos} hallazgos
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    {/* BOTÓN CERRAR - Minimalista hover bg-gray-100 */}
                    <Button
                      onClick={onClose}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full w-8 h-8"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════════
            TABS WORLD CLASS - Pill style con bg-gray-100
            ═════════════════════════════════════════════════════════════════ */}
              <div className="shrink-0 border-b border-gray-100 bg-white px-6 sm:px-8 py-3">
                <div className="flex justify-start items-center p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide shadow-inner gap-1">
                  {pestanasVisibles.map((pestana) => {
                    const Icon = pestana.icon;
                    const isActive = activeTab === pestana.id;

                    return (
                      <button
                        key={pestana.id}
                        type="button"
                        onClick={() => setActiveTab(pestana.id)}
                        className={`
                          shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm font-semibold
                          ${isActive
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>{pestana.label}</span>
                        {pestana.id === 'documentacion' && documentos.length > 0 && (
                          <Badge className={`ml-1.5 text-[10px] px-1.5 py-0 min-w-[20px] ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                            {documentos.length}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════════
            CONTENIDO PRINCIPAL - SEGÚN ESTÁNDAR: flex-1 overflow-y-auto
            ═════════════════════════════════════════════════════════════════ */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 sm:px-8 py-5 sm:py-6 bg-gray-50/30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    className="min-h-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'general' && (
                      <TabGeneral
                        auditoria={auditoria}
                        readOnly={auditoria.estado === 'finalizada'}
                        onAuditoriaUpdated={(auditoriaActualizada) => setAuditoria(auditoriaActualizada)}
                        onReload={() => setRecargarTrigger((prev) => prev + 1)}
                      />
                    )}
                    {activeTab === 'planeacion' && (
                      <TabPlaneacion
                        auditoria={auditoria}
                        readOnly={auditoria.estado === 'finalizada'}
                        documentosAuditoriaBackend={
                          expedienteListo ? documentosBackendRaw : undefined
                        }
                      />
                    )}
                    {activeTab === 'ejecucion' && (
                      <TabEjecucion
                        auditoria={auditoria}
                        onRecargarDocumentos={recargarDocumentos}
                        onRecargarAuditoria={() => setRecargarTrigger(t => t + 1)}
                        readOnly={auditoria.estado === 'finalizada'}
                        hallazgosPrecargados={expedienteListo ? hallazgosExpediente : undefined}
                        evidenciasPorHallazgoPrecargadas={
                          expedienteListo ? evidenciasPorHallazgoExpediente : undefined
                        }
                        documentosAuditoriaBackend={
                          expedienteListo ? documentosBackendRaw : undefined
                        }
                      />
                    )}
                    {activeTab === 'comunicacion' && (
                      <TabComunicacion
                        auditoria={auditoria}
                        onComunicacionCompletada={() => {
                          setRecargarTrigger(t => t + 1);
                          setActiveTab('seguimiento');
                          onComunicacionCompletadaProp?.();
                        }}
                        readOnly={auditoria.estado === 'finalizada'}
                        documentosAuditoriaBackend={
                          expedienteListo ? documentosBackendRaw : undefined
                        }
                      />
                    )}
                    {activeTab === 'seguimiento' && (
                      <TabSeguimiento
                        auditoria={auditoria}
                        documentos={documentos}
                        onSubirDocumento={subirDocumento}
                        onRecargarDocumentos={recargarDocumentos}
                        onComunicacionCompletada={() => {
                          setRecargarTrigger(t => t + 1);
                          onComunicacionCompletadaProp?.();
                        }}
                        readOnly={auditoria.estado === 'finalizada'}
                      />
                    )}
                    {activeTab === 'documentacion' && (
                      <TabDocumentacion
                        documentos={documentosFiltrados}
                        filtro={filtroDocumentos}
                        onFiltroChange={setFiltroDocumentos}
                        auditoriaId={auditoria.id}
                        loading={loadingDocumentos}
                        onSubirDocumento={auditoria.estado === 'finalizada' ? undefined : subirDocumento}
                        onRecargar={recargarDocumentos}
                        readOnly={auditoria.estado === 'finalizada'}
                      />
                    )}
                    {activeTab === 'historial' && <TabHistorial eventos={historial} />}
                    {activeTab === 'finalizada' && (
                      <TabFinalizada
                        auditoriaId={auditoria.id}
                        auditoria={auditoria}
                        documentos={documentos}
                        hallazgosPrecargados={expedienteListo ? hallazgosExpediente : undefined}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ═════════════════════════════════════════════════════════════════
            FOOTER - SEGÚN ESTÁNDAR WIZARD WORLD CLASS
            ═════════════════════════════════════════════════════════════════ */}
              <div className="shrink-0 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 px-4 sm:px-6 py-1.5 sm:py-2 relative z-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* IZQUIERDA: MÉTRICAS */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-[11px] sm:text-xs text-gray-600 leading-snug">
                      <strong className="font-black" style={{ color: '#003DA5' }}>
                        {(pestanasVisibles.find((p) => p.id === activeTab) || pestanasVisibles[0])?.label}
                      </strong> ·
                      <strong className="text-green-600"> {auditoria.progreso.general}% completado</strong> ·
                      <strong className="text-orange-600"> {diasRestantes} días restantes</strong>
                      {auditoria.estadisticas.totalHallazgos > 0 && (
                        <> · <strong className="text-red-600"> {auditoria.estadisticas.totalHallazgos} hallazgos</strong></>
                      )}
                    </div>
                  </div>

                  {/* DERECHA: ACCIÓN PRINCIPAL */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generarInformePDF}
                    className="font-bold text-xs border-blue-600 text-blue-700 hover:bg-[#003DA5] shrink-0 self-start sm:self-center px-2.5"
                    style={{ minHeight: 0, height: '28px' }}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Generar Informe
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════

function TabGeneral({
  auditoria,
  readOnly,
  onReload,
  onAuditoriaUpdated,
}: {
  auditoria: Auditoria;
  readOnly?: boolean;
  onReload?: () => void;
  onAuditoriaUpdated?: (auditoria: Auditoria) => void;
}) {
  const iniciales = (nombre: string) => {
    const parts = (nombre || '').split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0]?.[0] || '?').toUpperCase();
  };

  // â•â•â• EDICIÍ“N INLINE â•â•â•
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    nombre: auditoria.nombre || '',
    descripcion: auditoria.descripcion || '',
    alcance: auditoria.alcance || '',
    metodologia: auditoria.metodologia || '',
    presupuestoEstimado: auditoria.presupuestoEstimado || '',
    observacionesAdicionales: auditoria.observacionesAdicionales || '',
    objetivos: auditoria.objetivos || [],
    criteriosAuditoria: auditoria.criteriosAuditoria || [],
    normatividadAplicable: auditoria.normatividadAplicable || [],
    riesgosIdentificados: auditoria.riesgosIdentificados || [],
    controlesAplicar: auditoria.controlesAplicar || [],
    areaAuditable: auditoria.areaAuditable || '',
    procesoAuditado: auditoria.procesoNombre || '', // mapped to procesoNombre in UI
    territorial: auditoria.territorial || '',
    tipo: auditoria.tipo || '',
    nivelRiesgo: auditoria.nivelRiesgo || '',
    calificacionRiesgo: auditoria.calificacionRiesgo || '',
    responsableAreaNombre: auditoria.responsableArea?.nombre || '',
    responsableAreaCargo: auditoria.responsableArea?.cargo || '',
    responsableAreaEmail: auditoria.responsableArea?.email || '',
  });

  // ✅ Sincronizar editData cuando llegan datos reales del backend
  useEffect(() => {
    if (isEditing) return; // No sobreescribir si el usuario está editando
    setEditData({
      nombre: auditoria.nombre || '',
      descripcion: auditoria.descripcion || '',
      alcance: auditoria.alcance || '',
      metodologia: auditoria.metodologia || '',
      presupuestoEstimado: auditoria.presupuestoEstimado || '',
      observacionesAdicionales: auditoria.observacionesAdicionales || '',
      objetivos: auditoria.objetivos || [],
      criteriosAuditoria: auditoria.criteriosAuditoria || [],
      normatividadAplicable: auditoria.normatividadAplicable || [],
      riesgosIdentificados: auditoria.riesgosIdentificados || [],
      controlesAplicar: auditoria.controlesAplicar || [],
      areaAuditable: auditoria.areaAuditable || '',
      procesoAuditado: auditoria.procesoNombre || '',
      territorial: auditoria.territorial || '',
      tipo: auditoria.tipo || '',
      nivelRiesgo: auditoria.nivelRiesgo || '',
      calificacionRiesgo: auditoria.calificacionRiesgo || '',
      responsableAreaNombre: auditoria.responsableArea?.nombre || '',
      responsableAreaCargo: auditoria.responsableArea?.cargo || '',
      responsableAreaEmail: auditoria.responsableArea?.email || '',
    });
  }, [auditoria.id, auditoria.descripcion, auditoria.alcance, auditoria.metodologia, auditoria.objetivos?.length]);
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  // Seccionales/territoriales cargadas desde Estructura Organizacional
  const [seccionalesExpediente, setSeccionalesExpediente] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    const cargarSeccionales = async () => {
      try {
        const seccionales = await estructuraService.obtenerSeccionales();
        if (seccionales && seccionales.length > 0) {
          setSeccionalesExpediente(seccionales.map((s: any) => ({ id: s.id, nombre: s.nombre })));
        }
      } catch (error) {
        console.warn('[TabGeneral] No se pudieron cargar seccionales:', error);
      }
    };
    cargarSeccionales();
  }, []);

  // Autocompletado del Responsable del Área Auditada
  const [busquedaResponsable, setBusquedaResponsable] = useState('');
  const [mostrarSugerenciasResponsable, setMostrarSugerenciasResponsable] = useState(false);
  const [resultadosResponsable, setResultadosResponsable] = useState<any[]>([]);
  const [buscandoResponsable, setBuscandoResponsable] = useState(false);
  const [personasPrecargadas, setPersonasPrecargadas] = useState<any[]>([]);

  // Precargar personas al activar el modo de edición
  useEffect(() => {
    if (!isEditing) return;
    const precargarPersonas = async () => {
      try {
        const resp = await auditoriasApi.getAllAuditados(300);
        if (resp.success && Array.isArray(resp.data)) {
          const list = resp.data.map((p: any) => ({
            idPersona: String(p.idPersona ?? p.id ?? ''),
            nombre: p.nombre ?? '',
            email: p.email ?? '',
            cargo: p.cargo,
            numeroIdentificacion: p.numeroIdentificacion,
            isAuditorBackend: p.isAuditor ?? false,
            roles: p.roles ?? null,
          }));
          setPersonasPrecargadas(list);
          setResultadosResponsable(list);
        }
      } catch (err) {
        console.warn('[TabGeneral] No se pudieron precargar personas:', err);
      }
    };
    precargarPersonas();
  }, [isEditing]);

  // Filtrado y búsqueda dinámica
  useEffect(() => {
    if (!isEditing) return;
    const q = busquedaResponsable.trim();

    if (q.length === 0) {
      setResultadosResponsable(personasPrecargadas);
      setBuscandoResponsable(false);
      return;
    }

    const qLower = q.toLowerCase();
    const filtradosLocal = personasPrecargadas.filter(
      (p) =>
        (p.nombre?.toLowerCase().includes(qLower) ||
        p.email?.toLowerCase().includes(qLower) ||
        (p.numeroIdentificacion ?? '').includes(q))
    );
    setResultadosResponsable(filtradosLocal);

    if (q.length < 2) return;

    let cancelado = false;
    setBuscandoResponsable(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await auditoriasApi.searchAuditados(q);
        if (cancelado) return;
        if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
          const fetched = resp.data.map((p: any) => ({
            idPersona: String(p.idPersona ?? p.id ?? ''),
            nombre: p.nombre ?? '',
            email: p.email ?? '',
            cargo: p.cargo,
            numeroIdentificacion: p.numeroIdentificacion,
            isAuditorBackend: p.isAuditor ?? false,
            roles: p.roles ?? null,
          }));
          setResultadosResponsable(fetched);
        }
      } catch (err) {
        if (!cancelado) {
          console.warn('[TabGeneral] Error buscando personas:', err);
        }
      } finally {
        if (!cancelado) setBuscandoResponsable(false);
      }
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [busquedaResponsable, personasPrecargadas, isEditing]);

  const handleSelectResponsable = (persona: any) => {
    setEditData(prev => ({
      ...prev,
      responsableAreaNombre: persona.nombre,
      responsableAreaCargo: persona.cargo || 'Responsable',
      responsableAreaEmail: persona.email,
    }));
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddToArray = (field: string) => {
    const val = (newItem[field] || '').trim();
    if (!val) return;
    setEditData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[] || []), val],
    }));
    setNewItem(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveFromArray = (field: string, index: number) => {
    setEditData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_: string, i: number) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const auditoriaGuardada = await controlInternoService.updateAuditoria(auditoria.id, editData);
      const toTextArray = (value: any): string[] =>
        Array.isArray(value)
          ? value
            .map((item) =>
              typeof item === 'string'
                ? item
                : item?.descripcion || item?.criterio || item?.texto || item?.nombre || '',
            )
            .filter(Boolean)
          : [];
      const objetivosGuardados = toTextArray(auditoriaGuardada?.objetivos);
      const criteriosGuardados = toTextArray(auditoriaGuardada?.criterios);

      onAuditoriaUpdated?.({
        ...auditoria,
        nombre: auditoriaGuardada?.nombre ?? editData.nombre ?? auditoria.nombre,
        territorial: auditoriaGuardada?.territorial || auditoriaGuardada?.sede || editData.territorial || auditoria.territorial,
        tipo: (editData.tipo || auditoriaGuardada?.tipo || auditoria.tipo) as TipoAuditoria,
        areaAuditable: auditoriaGuardada?.areaObjetivo || editData.areaAuditable || auditoria.areaAuditable,
        procesoNombre: auditoriaGuardada?.procesoAuditado || editData.procesoAuditado || auditoria.procesoNombre,
        nivelRiesgo: (auditoriaGuardada?.riesgoKanban || editData.nivelRiesgo || auditoria.nivelRiesgo) as NivelRiesgo,
        responsableArea: {
          ...auditoria.responsableArea,
          nombre: auditoriaGuardada?.responsableAreaNombre || editData.responsableAreaNombre || auditoria.responsableArea.nombre,
          cargo: auditoriaGuardada?.responsableAreaCargo || editData.responsableAreaCargo || auditoria.responsableArea.cargo,
          email: auditoriaGuardada?.responsableAreaEmail || editData.responsableAreaEmail || auditoria.responsableArea.email,
        },
        descripcion: auditoriaGuardada?.descripcion ?? editData.descripcion ?? auditoria.descripcion,
        alcance: auditoriaGuardada?.alcance ?? editData.alcance ?? auditoria.alcance,
        metodologia: auditoriaGuardada?.metodologia ?? editData.metodologia ?? auditoria.metodologia,
        presupuestoEstimado: auditoriaGuardada?.presupuestoEstimado ?? editData.presupuestoEstimado ?? auditoria.presupuestoEstimado,
        observacionesAdicionales: auditoriaGuardada?.observacionesAdicionales ?? editData.observacionesAdicionales ?? auditoria.observacionesAdicionales,
        calificacionRiesgo: auditoriaGuardada?.calificacionRiesgo ?? editData.calificacionRiesgo ?? auditoria.calificacionRiesgo,
        objetivos: objetivosGuardados.length ? objetivosGuardados : editData.objetivos,
        criteriosAuditoria: criteriosGuardados.length ? criteriosGuardados : editData.criteriosAuditoria,
        normatividadAplicable: Array.isArray(auditoriaGuardada?.normatividadAplicable)
          ? auditoriaGuardada.normatividadAplicable
          : editData.normatividadAplicable,
        riesgosIdentificados: Array.isArray(auditoriaGuardada?.riesgosIdentificados)
          ? auditoriaGuardada.riesgosIdentificados
          : editData.riesgosIdentificados,
        controlesAplicar: Array.isArray(auditoriaGuardada?.controlesAplicar)
          ? auditoriaGuardada.controlesAplicar
          : editData.controlesAplicar,
        metadata: {
          ...auditoria.metadata,
          ultimaModificacion: auditoriaGuardada?.updatedAt ? new Date(auditoriaGuardada.updatedAt) : new Date(),
        },
      });
      toast.success('✅ Auditoría actualizada', { description: 'Los cambios fueron guardados exitosamente' });
      setIsEditing(false);
      if (onReload) onReload();
    } catch (err) {
      console.error('Error guardando:', err);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      nombre: auditoria.nombre || '',
      descripcion: auditoria.descripcion || '',
      alcance: auditoria.alcance || '',
      metodologia: auditoria.metodologia || '',
      presupuestoEstimado: auditoria.presupuestoEstimado || '',
      observacionesAdicionales: auditoria.observacionesAdicionales || '',
      objetivos: auditoria.objetivos || [],
      criteriosAuditoria: auditoria.criteriosAuditoria || [],
      normatividadAplicable: auditoria.normatividadAplicable || [],
      riesgosIdentificados: auditoria.riesgosIdentificados || [],
      controlesAplicar: auditoria.controlesAplicar || [],
      areaAuditable: auditoria.areaAuditable || '',
      procesoAuditado: auditoria.procesoNombre || '',
      territorial: auditoria.territorial || '',
      tipo: auditoria.tipo || '',
      nivelRiesgo: auditoria.nivelRiesgo || '',
      calificacionRiesgo: auditoria.calificacionRiesgo || '',
      responsableAreaNombre: auditoria.responsableArea?.nombre || '',
      responsableAreaCargo: auditoria.responsableArea?.cargo || '',
      responsableAreaEmail: auditoria.responsableArea?.email || '',
    });
    setIsEditing(false);
  };

  // â•â•â• REASIGNAR AUDITOR â•â•â•
  const [showReasignar, setShowReasignar] = useState(false);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [selectedProfId, setSelectedProfId] = useState('');
  const [reasignando, setReasignando] = useState(false);

  const cargarProfesionales = async () => {
    try {
      const data = await configuracionesProfesionalesOCIApi.getProfesionalesOCI();
      const arr = Array.isArray(data) ? data : (data as any)?.data || [];
      const limpios = arr
        .map((p: any) => {
          const nombre = p.nombreCompleto ||
            (p.persona ? `${p.persona.nombre || ''} ${p.persona.apellido || ''}`.trim() : '') ||
            p.nombre || '';
          return {
            ...p,
            _nombre: nombre,
            _cargo: p.cargo || p.rol || 'Profesional OCI',
            _email: p.email || p.persona?.email || '',
          };
        })
        .filter((p: any) => {
          const n = p._nombre.trim();
          return n && n !== 'Sin nombre' && n.length > 2;
        });
      setProfesionales(limpios);
    } catch {
      toast.error('No se pudieron cargar profesionales');
    }
  };

  const handleReasignar = async () => {
    if (!selectedProfId) return;
    setReasignando(true);
    try {
      const prof = profesionales.find((p: any) => String(p.id) === selectedProfId);
      const nombre = prof?._nombre || 'Auditor';
      const email = prof?._email || '';

      await controlInternoService.updateAuditoria(auditoria.id, {
        auditorLiderId: selectedProfId,
        auditorLider: nombre,
        auditorLiderEmail: email,
      });

      toast.success('✅ Auditor Líder reasignado', {
        description: `Asignado a ${nombre}`,
      });
      setShowReasignar(false);
      if (onReload) onReload();
    } catch (err) {
      console.error('Error reasignando auditor:', err);
      toast.error('Error al reasignar auditor');
    } finally {
      setReasignando(false);
    }
  };

  // ═══ GESTIONAR EQUIPO AUDITOR ═══
  const [showReasignarEquipo, setShowReasignarEquipo] = useState(false);
  const [selectedEquipoProfId, setSelectedEquipoProfId] = useState('');
  const [reasignandoEquipo, setReasignandoEquipo] = useState(false);

  const handleAgregarEquipo = async () => {
    if (!selectedEquipoProfId) return;
    setReasignandoEquipo(true);
    try {
      const prof = profesionales.find((p: any) => String(p.id) === selectedEquipoProfId);
      const nombre = prof?._nombre || 'Auditor';
      const cargo = prof?._cargo || 'Auditor';
      
      const nuevoMiembro = {
        id: String(prof?.id || Date.now()),
        nombre: nombre,
        rol: cargo
      };
      
      const nuevoEquipo = [...auditoria.equipoAuditores, nuevoMiembro];

      await controlInternoService.updateAuditoria(auditoria.id, {
        equipoAuditores: nuevoEquipo
      });

      toast.success('✅ Auditor agregado al equipo', {
        description: `Se agregó a ${nombre}`,
      });
      setShowReasignarEquipo(false);
      setSelectedEquipoProfId('');
      if (onReload) onReload();
    } catch (err) {
      console.error('Error agregando al equipo:', err);
      toast.error('Error al agregar al equipo');
    } finally {
      setReasignandoEquipo(false);
    }
  };

  const avanceTemporal = auditoria.cronograma.duracionDias > 0
    ? Math.min(100, Math.round((auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100))
    : 0;

  // Helper para renderizar un campo editable de texto
  const renderEditableField = (label: string, field: string, value: string, multiline = false) => (
    <div className={`flex ${multiline ? 'flex-col gap-1' : 'items-start sm:items-center justify-between gap-3'} py-2 border-b border-gray-50`}>
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      {isEditing ? (
        multiline ? (
          <textarea
            className="text-xs text-gray-900 w-full border border-gray-200 rounded-md px-2.5 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none bg-white"
            rows={3}
            value={editData[field as keyof typeof editData] as string || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        ) : (
          <input
            className="text-xs font-bold text-gray-900 text-right border border-gray-200 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 flex-1 min-w-0 bg-white"
            value={editData[field as keyof typeof editData] as string || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        )
      ) : (
        <span className={`text-xs font-bold text-gray-900 ${multiline ? '' : 'text-right flex-1 min-w-0 truncate'}`}>
          {value || <span className="text-gray-300 italic font-normal">Sin definir</span>}
        </span>
      )}
    </div>
  );

  // Helper para renderizar un array editable con chips
  const renderEditableArray = (label: string, field: string, items: string[], color: string) => (
    <div className="py-3 border-b border-gray-50">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length > 0 ? items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${color}`}>
            {item}
            {isEditing && (
              <button type="button" onClick={() => handleRemoveFromArray(field, i)} className="ml-0.5 hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        )) : (
          <span className="text-xs text-gray-300 italic">Sin registros</span>
        )}
      </div>
      {isEditing && (
        <div className="flex items-center gap-1.5">
          <input
            className="flex-1 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
            placeholder={`Agregar ${label.toLowerCase()}...`}
            value={newItem[field] || ''}
            onChange={(e) => setNewItem(prev => ({ ...prev, [field]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddToArray(field)}
          />
          <Button size="sm" variant="outline" onClick={() => handleAddToArray(field)} className="h-7 px-2 text-xs">+</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ——————— RESUMEN EJECUTIVO (full width, 5 cols) ——————— */}
      <Card className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-200">
        <h3 className="text-xs font-black text-blue-800 mb-4 flex items-center gap-2 tracking-wider uppercase">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Resumen Ejecutivo
          {!readOnly && (
            <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">
              {isEditing ? (
                <>
                  <button onClick={handleCancel} disabled={saving}
                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancelar edición">
                    <XCircle className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="p-1 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                    title="Guardar cambios">
                    {saving ? <span className="animate-spin text-xs">⏳</span> : <Save className="w-4.5 h-4.5" />}
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors"
                  title="Editar Auditoría">
                  <Pencil className="w-4.5 h-4.5" />
                </button>
              )}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-[11px] text-gray-500 mb-1 font-medium">Territorial</p>
            {isEditing ? (
              <select
                value={editData.territorial}
                onChange={(e) => handleFieldChange('territorial', e.target.value)}
                className="text-sm font-bold text-gray-900 border border-gray-200 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-full"
              >
                <option value="">— Seleccionar —</option>
                <option value="Sede Central">🏛️ Sede Central</option>
                {seccionalesExpediente.map((s) => (
                  <option key={s.id} value={s.nombre}>📍 {s.nombre}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-bold text-gray-900">{auditoria.territorial || auditoria.sede || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1 font-medium">Tipo de Auditoría</p>
            <p className="text-sm font-bold text-gray-900">{auditoria.tipo}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1 font-medium">Periodo</p>
            <p className="text-sm font-bold text-gray-900">
              {new Date(auditoria.cronograma.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              {' – '}
              {new Date(auditoria.cronograma.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1 font-medium">Nivel de Riesgo</p>
            <Badge
              variant="outline"
              className={`font-bold text-xs border-2 ${
                auditoria.nivelRiesgo === 'Alto' ? 'border-red-400 text-red-700 bg-red-50' :
                auditoria.nivelRiesgo === 'Medio' ? 'border-amber-400 text-amber-700 bg-amber-50' :
                auditoria.nivelRiesgo === 'Bajo' ? 'border-green-400 text-green-700 bg-green-50' :
                'border-gray-200 text-gray-500 bg-gray-50'
              }`}
            >
              {auditoria.nivelRiesgo || 'No evaluado'}
            </Badge>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1 font-medium">Avance General</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{
                color: auditoria.progreso.general >= 80 ? '#16a34a' : auditoria.progreso.general >= 40 ? '#2563eb' : '#d97706',
              }}>{auditoria.progreso.general}%</span>
              <div className="flex-1 h-2.5 bg-white/80 rounded-full overflow-hidden border border-gray-200">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: auditoria.progreso.general >= 80 ? '#22c55e' : auditoria.progreso.general >= 40 ? '#3b82f6' : '#f59e0b',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${auditoria.progreso.general}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══════ FILA 1: Datos + Auditor + Cronograma (3 cols) ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* COL 1: Datos del Proceso */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <FileText className="w-4 h-4 text-blue-600" />
            Datos del Proceso
          </h4>
          <div className="space-y-0 flex-1">
            {[
              { label: 'Código', value: auditoria.codigo },
            ].map((item) => (
              <div key={item.label} className="flex items-start sm:items-center justify-between gap-3 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 shrink-0">{item.label}</span>
                <span className="text-sm font-bold text-gray-900 text-right flex-1 min-w-0 truncate">{item.value}</span>
              </div>
            ))}
            {renderEditableField('Nombre', 'nombre', auditoria.nombre)}
            {renderEditableField('Área Auditable', 'areaAuditable', auditoria.areaAuditable || '')}
            {renderEditableField('Proceso Auditado', 'procesoAuditado', auditoria.procesoNombre || '')}
            {/* Territorial - Dropdown dinámico desde Estructura Organizacional */}
            <div className="flex items-start sm:items-center justify-between gap-3 py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500 shrink-0">Territorial</span>
              {isEditing ? (
                <select
                  value={editData.territorial}
                  onChange={(e) => handleFieldChange('territorial', e.target.value)}
                  className="text-xs font-bold text-gray-900 text-right border border-gray-200 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 flex-1 min-w-0 bg-white"
                >
                  <option value="">— Seleccionar —</option>
                  <option value="Sede Central">🏛️ Sede Central</option>
                  {seccionalesExpediente.map((s) => (
                    <option key={s.id} value={s.nombre}>📍 {s.nombre}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-gray-900 text-right flex-1 min-w-0 truncate">
                  {auditoria.territorial || <span className="text-gray-300 italic font-normal">Sin definir</span>}
                </span>
              )}
            </div>
            {renderEditableField('Tipo de Auditoría', 'tipo', auditoria.tipo || '')}
            <div className="flex items-start sm:items-center justify-between gap-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 shrink-0">Duración</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 text-right flex-1 min-w-0 break-words">{auditoria.cronograma.duracionDias} días ({auditoria.cronograma.diasTranscurridos} transcurridos)</span>
            </div>
            <div className="flex items-start sm:items-center justify-between gap-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 shrink-0">Estado</span>
              <Badge style={{ background: '#003DA5', color: '#fff' }} className="text-xs font-bold text-right">
                {auditoria.estado.charAt(0).toUpperCase() + auditoria.estado.slice(1)}
              </Badge>
            </div>
            {renderEditableField('Nivel de Riesgo', 'nivelRiesgo', auditoria.nivelRiesgo || '')}
            {renderEditableField('Presupuesto Estimado', 'presupuestoEstimado', auditoria.presupuestoEstimado || '')}
          </div>

          {/* Responsable del Área Auditada */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-[11px] text-gray-400 font-bold tracking-wider uppercase mb-2">Responsable del Área Auditada</p>
            {isEditing ? (
              <div className="space-y-2">
                {editData.responsableAreaNombre ? (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {(editData.responsableAreaNombre || '')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join('')
                          .toUpperCase() || 'RA'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-gray-900 truncate">
                          {editData.responsableAreaNombre}
                        </p>
                        <p className="text-[11px] text-gray-600 truncate">
                          {editData.responsableAreaEmail}
                        </p>
                        {editData.responsableAreaCargo && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {editData.responsableAreaCargo}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditData(prev => ({
                          ...prev,
                          responsableAreaNombre: '',
                          responsableAreaCargo: '',
                          responsableAreaEmail: '',
                        }));
                        setBusquedaResponsable('');
                        setMostrarSugerenciasResponsable(true);
                      }}
                      className="shrink-0 text-[10px] text-red-600 hover:text-red-800 transition-colors font-bold mt-0.5"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por nombre, correo o cédula..."
                      value={busquedaResponsable}
                      onChange={(e) => {
                        setBusquedaResponsable(e.target.value);
                        setMostrarSugerenciasResponsable(true);
                      }}
                      onFocus={() => {
                        setMostrarSugerenciasResponsable(true);
                      }}
                      onBlur={() => setTimeout(() => setMostrarSugerenciasResponsable(false), 250)}
                      className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                      autoComplete="off"
                    />
                    {buscandoResponsable && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {mostrarSugerenciasResponsable && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        <div className="px-2.5 py-1 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            {busquedaResponsable.trim()
                              ? `${resultadosResponsable.length} resultado(s)`
                              : `— Seleccione una persona (${resultadosResponsable.length}) —`}
                          </span>
                        </div>

                        {!buscandoResponsable && resultadosResponsable.length === 0 && (
                          <div className="px-2.5 py-3 text-center text-xs text-gray-500">
                            {busquedaResponsable.trim()
                              ? 'No se encontraron personas.'
                              : 'No hay personas disponibles.'}
                          </div>
                        )}

                        {resultadosResponsable.map((p) => {
                          if (!p) return null;
                          return (
                            <button
                              key={p.idPersona}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                handleSelectResponsable(p);
                                setBusquedaResponsable('');
                                setMostrarSugerenciasResponsable(false);
                              }}
                              className="w-full text-left px-2.5 py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors flex flex-col gap-0.5"
                            >
                              <span className="text-xs font-bold text-gray-900">{p.nombre}</span>
                              <span className="text-[10px] text-gray-500">{p.email} {p.numeroIdentificacion ? `- CC ${p.numeroIdentificacion}` : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                    {iniciales(auditoria.responsableArea.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{auditoria.responsableArea.nombre}</p>
                    <p className="text-xs text-gray-500">{auditoria.responsableArea.cargo}</p>
                  </div>
                </div>
                <div className="ml-[46px] space-y-0.5">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {auditoria.responsableArea.email || <span className="italic">Sin email</span>}
                  </p>
                  {auditoria.responsableArea.telefono && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {auditoria.responsableArea.telefono}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
        {/* COL 2: Auditor Líder + Equipo */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <Award className="w-4 h-4 text-purple-600" />
            Auditor Líder Asignado
          </h4>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff' }}>
              {iniciales(auditoria.auditorLider.nombre)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{auditoria.auditorLider.nombre}</p>
              <p className="text-xs text-gray-500">Auditor Líder – OCI</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" />
                {auditoria.auditorLider.email}
              </p>
            </div>
          </div>

          {/* Equipo */}
          <p className="text-[11px] text-gray-400 font-bold tracking-wider uppercase mb-3">
            Equipo Auditor ({auditoria.equipoAuditores.length})
          </p>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[180px]">
            {auditoria.equipoAuditores.map((m) => (
              <div key={m.id} className="flex items-center gap-2 py-1.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {iniciales(m.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{m.nombre}</p>
                  <p className="text-[11px] text-gray-400">{m.rol}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reasignar Lider y Gestionar Equipo */}
          <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
            {/* Lider */}
            {showReasignar ? (
              <div className="space-y-2">
                <select
                  className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 bg-white focus:ring-2 focus:ring-blue-500/30"
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                >
                  <option value="">Seleccionar profesional...</option>
                  {profesionales.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p._nombre} — {p._cargo}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setShowReasignar(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1 text-xs h-8 bg-blue-600 text-white" onClick={handleReasignar} disabled={!selectedProfId || reasignando}>
                    {reasignando ? 'Reasignando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => { cargarProfesionales(); setShowReasignar(true); setShowReasignarEquipo(false); }}
                disabled={readOnly}
              >
                <Users className="w-3.5 h-3.5" />
                Reasignar Auditor Líder
              </Button>
            )}

            {/* Equipo */}
            {showReasignarEquipo ? (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <select
                  className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 bg-white focus:ring-2 focus:ring-blue-500/30"
                  value={selectedEquipoProfId}
                  onChange={(e) => setSelectedEquipoProfId(e.target.value)}
                >
                  <option value="">Seleccionar para el equipo...</option>
                  {profesionales.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p._nombre} — {p._cargo}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setShowReasignarEquipo(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1 text-xs h-8 bg-blue-600 text-white" onClick={handleAgregarEquipo} disabled={!selectedEquipoProfId || reasignandoEquipo}>
                    {reasignandoEquipo ? 'Agregando...' : 'Agregar al equipo'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs border-dashed"
                onClick={() => { cargarProfesionales(); setShowReasignarEquipo(true); setShowReasignar(false); }}
                disabled={readOnly}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Agregar al Equipo
              </Button>
            )}
          </div>
        </Card>

        {/* COL 3: Cronograma y Progreso */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <Calendar className="w-4 h-4 text-green-600" />
            Cronograma y Progreso
          </h4>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-blue-50/60 rounded-lg border border-blue-100">
              <p className="text-[10px] text-gray-400 font-medium mb-1">Inicio</p>
              <p className="text-xs font-black text-gray-900">
                {new Date(auditoria.cronograma.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50/60 rounded-lg border border-purple-100">
              <p className="text-[10px] text-gray-400 font-medium mb-1">Fin Estimado</p>
              <p className="text-xs font-black text-gray-900">
                {new Date(auditoria.cronograma.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Avance temporal */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Avance temporal</span>
              <span className="text-xs font-black text-gray-900">{avanceTemporal}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${avanceTemporal}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {auditoria.cronograma.diasTranscurridos} de {auditoria.cronograma.duracionDias} días transcurridos
            </p>
          </div>

          {/* Progreso por fases */}
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 font-bold tracking-wider uppercase mb-3">Progreso por Fases</p>
            <div className="space-y-3">
              {[
                { label: 'Planeación', value: auditoria.progreso.planeacion, color: '#8b5cf6', icon: FileSearch },
                { label: 'Ejecución', value: auditoria.progreso.ejecucion, color: '#f59e0b', icon: ClipboardCheck },
                { label: 'Comunicación', value: auditoria.progreso.comunicacion, color: '#22c55e', icon: Send },
              ].map((fase) => (
                <div key={fase.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center gap-1.5">
                      <fase.icon className="w-3 h-3" style={{ color: fase.color }} />
                      {fase.label}
                    </span>
                    <span className="text-xs font-black text-gray-900">{fase.value}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: fase.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${fase.value}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini stats inline */}
          <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black text-red-600">{auditoria.estadisticas.totalHallazgos}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Hallazgos</p>
            </div>
            <div>
              <p className="text-lg font-black text-blue-600">{auditoria.estadisticas.documentosCargados}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Docs</p>
            </div>
            <div>
              <p className="text-lg font-black text-green-600">{auditoria.estadisticas.notificacionesEnviadas}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Notif.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* â•â•â•â•â•â•â• FILA 2: Descripción + Alcance y Metodología (2 cols) â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Descripción + Observaciones */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <FileText className="w-4 h-4 text-indigo-600" />
            Descripción y Observaciones
          </h4>
          {renderEditableField('Descripción', 'descripcion', auditoria.descripcion || '', true)}
          {renderEditableField('Observaciones Adicionales', 'observacionesAdicionales', auditoria.observacionesAdicionales || '', true)}
        </Card>

        {/* Alcance y Metodología */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <Target className="w-4 h-4 text-emerald-600" />
            Alcance y Metodología
          </h4>
          {renderEditableField('Alcance', 'alcance', auditoria.alcance || '', true)}
          {renderEditableField('Metodología', 'metodologia', auditoria.metodologia || '', true)}
          {renderEditableField('Calificación de Riesgo', 'calificacionRiesgo', auditoria.calificacionRiesgo || '')}
        </Card>
      </div>

      {/* â•â•â•â•â•â•â• FILA 3: Objetivos + Criterios + Normatividad (3 cols) â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Objetivos */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
            <Flag className="w-4 h-4 text-blue-600" />
            Objetivos ({(isEditing ? editData.objetivos : auditoria.objetivos)?.length || 0})
          </h4>
          {renderEditableArray('Objetivos de la Auditoría', 'objetivos', isEditing ? editData.objetivos : auditoria.objetivos || [], 'bg-blue-50 text-blue-700')}
        </Card>

        {/* Criterios */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
            <CheckSquare className="w-4 h-4 text-purple-600" />
            Criterios ({(isEditing ? editData.criteriosAuditoria : auditoria.criteriosAuditoria)?.length || 0})
          </h4>
          {renderEditableArray('Criterios de Auditoría', 'criteriosAuditoria', isEditing ? editData.criteriosAuditoria : auditoria.criteriosAuditoria || [], 'bg-purple-50 text-purple-700')}
        </Card>

        {/* Normatividad */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
            <BookOpen className="w-4 h-4 text-amber-600" />
            Normatividad ({(isEditing ? editData.normatividadAplicable : auditoria.normatividadAplicable)?.length || 0})
          </h4>
          {renderEditableArray('Normatividad Aplicable', 'normatividadAplicable', isEditing ? editData.normatividadAplicable : auditoria.normatividadAplicable || [], 'bg-amber-50 text-amber-700')}
        </Card>
      </div>

      {/* â•â•â•â•â•â•â• FILA 4: Riesgos + Controles (2 cols) â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Riesgos */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Riesgos Identificados ({(isEditing ? editData.riesgosIdentificados : auditoria.riesgosIdentificados)?.length || 0})
          </h4>
          {renderEditableArray('Riesgos', 'riesgosIdentificados', isEditing ? editData.riesgosIdentificados : auditoria.riesgosIdentificados || [], 'bg-red-50 text-red-700')}
        </Card>

        {/* Controles */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-2 tracking-wider uppercase">
            <Activity className="w-4 h-4 text-green-600" />
            Controles a Aplicar ({(isEditing ? editData.controlesAplicar : auditoria.controlesAplicar)?.length || 0})
          </h4>
          {renderEditableArray('Controles', 'controlesAplicar', isEditing ? editData.controlesAplicar : auditoria.controlesAplicar || [], 'bg-green-50 text-green-700')}
        </Card>
      </div>

      {/* â•â•â•â•â•â•â• FILA 5: Fechas Clave + Estadísticas + Metadata (3 cols) â•â•â•â•â•â•â• */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Fechas Clave y Hitos */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <Clock className="w-4 h-4 text-amber-600" />
            Fechas Clave e Hitos
          </h4>
          <div className="space-y-0">
            {[
              { label: 'Creación Auditoría', date: auditoria.cronograma.fechaCreacion },
              { label: 'Inicio Planeación', date: auditoria.fechasClave.planeacionInicio },
              { label: 'Fin Planeación', date: auditoria.fechasClave.planeacionFin },
              { label: 'Inicio Ejecución', date: auditoria.fechasClave.ejecucionInicio },
              { label: 'Fin Ejecución', date: auditoria.fechasClave.ejecucionFin },
              { label: 'Inicio Comunicación', date: auditoria.fechasClave.comunicacionInicio },
              { label: 'Fin Comunicación', date: auditoria.fechasClave.comunicacionFin },
              { label: 'Informe Preliminar', date: auditoria.fechasClave.informePreliminar },
              { label: 'Informe Final', date: auditoria.fechasClave.informeFinal },
              { label: 'Fecha Fin Real', date: auditoria.cronograma.fechaFinReal },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className={`text-xs font-bold ${item.date ? 'text-gray-900' : 'text-gray-300'}`}>
                  {item.date
                    ? new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Pendiente'
                  }
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Estadísticas Detalladas */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <BarChart3 className="w-4 h-4 text-red-600" />
            Estadísticas de Hallazgos
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-red-50/60 rounded-lg border border-red-100">
              <p className="text-2xl font-black text-red-600">{auditoria.estadisticas.totalHallazgos}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Total Hallazgos</p>
            </div>
            <div className="text-center p-3 bg-blue-50/60 rounded-lg border border-blue-100">
              <p className="text-2xl font-black text-blue-600">{auditoria.estadisticas.documentosCargados}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Documentos</p>
            </div>
          </div>
          <div className="space-y-0">
            {[
              { label: 'Hallazgos Críticos', value: auditoria.estadisticas.hallazgosCriticos, color: 'text-red-600 bg-red-50' },
              { label: 'Hallazgos Graves', value: auditoria.estadisticas.hallazgosGraves, color: 'text-orange-600 bg-orange-50' },
              { label: 'Hallazgos Moderados', value: auditoria.estadisticas.hallazgosModerados, color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Hallazgos Leves', value: auditoria.estadisticas.hallazgosLeves, color: 'text-blue-600 bg-blue-50' },
              { label: 'Por clasificar', value: auditoria.estadisticas.hallazgosBorrador, color: 'text-gray-600 bg-gray-50' },
              { label: 'Notificaciones Enviadas', value: auditoria.estadisticas.notificacionesEnviadas, color: 'text-green-600 bg-green-50' },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-xs text-gray-600">{item.label}</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Metadata del Registro */}
        <Card className="p-5">
          <h4 className="text-xs font-black text-gray-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
            <Info className="w-4 h-4 text-gray-500" />
            Metadata del Registro
          </h4>
          <div className="space-y-0">
            {[
              { label: 'Creado por', value: auditoria.metadata.creadoPor },
              { label: 'Fecha de Creación', value: new Date(auditoria.metadata.fechaCreacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Última Modificación', value: new Date(auditoria.metadata.ultimaModificacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Modificado por', value: auditoria.metadata.modificadoPor },
              { label: 'Versión', value: `v${auditoria.metadata.version}` },
              { label: 'ID Interno', value: auditoria.id },
            ].map((item, i, arr) => (
              <div key={item.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className="text-xs font-bold text-gray-900 text-right max-w-[60%] truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Checklist status */}
          {auditoria.checklistCompletados && Object.keys(auditoria.checklistCompletados).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 font-bold tracking-wider uppercase mb-2">Actividades Completadas</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-green-600">
                  {Object.values(auditoria.checklistCompletados).filter(Boolean).length}
                </span>
                <span className="text-xs text-gray-400">de</span>
                <span className="text-sm font-black text-gray-700">
                  {Object.keys(auditoria.checklistCompletados).length}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden ml-2">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${Math.round((Object.values(auditoria.checklistCompletados).filter(Boolean).length / Math.max(1, Object.keys(auditoria.checklistCompletados).length)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// TAB 2: PLANEACIÓN
interface DatosCompartidosExpediente {
  hallazgosPrecargados?: Hallazgo[];
  evidenciasPorHallazgoPrecargadas?: Record<string, any[]>;
  documentosAuditoriaBackend?: any[];
}

interface TabFaseProps extends DatosCompartidosExpediente {
  auditoria: Auditoria;
  checklistCompletados?: Record<string, boolean>;
  onToggleChecklist?: (id: string, completado: boolean) => void;
  onComunicacionCompletada?: () => void;
  onRecargarDocumentos?: () => Promise<void> | void;
  onRecargarAuditoria?: () => void;
  readOnly?: boolean;
}

function TabPlaneacion({
  auditoria,
  readOnly,
  documentosAuditoriaBackend,
}: TabFaseProps) {
  return (
    <div className="space-y-4">
      <Card className="p-3 border-l-4 border-l-blue-600 bg-blue-50">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-blue-900">Fase de Planeación</p>
            <p className="text-xs text-blue-700">Lista de chequeo y documentos de planeación</p>
          </div>
        </div>
      </Card>
      <SeccionDocumentosPorEtapa
        auditoriaId={auditoria.id}
        etapa="planeacion"
      />
      <SeccionListasChequeoExpediente
        auditoriaId={auditoria.id}
        etapaActual="Planeación"
        readOnly={readOnly}
        documentosAuditoriaPrecargados={documentosAuditoriaBackend}
      />
    </div>
  );
}

// TAB 3: EJECUCIÓN
function TabEjecucion({
  auditoria,
  onRecargarDocumentos,
  onRecargarAuditoria,
  readOnly,
  hallazgosPrecargados,
  evidenciasPorHallazgoPrecargadas,
  documentosAuditoriaBackend,
}: TabFaseProps) {
  const [seccionEjecucionActiva, setSeccionEjecucionActiva] = useState<'hallazgos' | 'tareas'>('hallazgos');
  const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [reunionApertura, setReunionApertura] = useState<any | null>(null);
  const [reunionCierre, setReunionCierre] = useState<any | null>(null);

  const cargarReuniones = async () => {
    if (!auditoria.id) return;
    try {
      const [apertura, cierre] = await Promise.all([
        controlInternoService.getReunionApertura(auditoria.id).catch(() => null),
        controlInternoService.getReunionCierre(auditoria.id).catch(() => null),
      ]);
      setReunionApertura(apertura && typeof apertura === 'object' && apertura.id ? apertura : null);
      setReunionCierre(cierre && typeof cierre === 'object' && cierre.id ? cierre : null);
    } catch {
      setReunionApertura(null);
      setReunionCierre(null);
    }
  };

  useEffect(() => {
    cargarReuniones();
  }, [auditoria.id]);

  const fechaReunion = (r: any) => {
    if (!r?.fecha) return null;
    const d = typeof r.fecha === 'string' ? new Date(r.fecha) : r.fecha;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <Card className="p-2 border-l-4 border-l-amber-600 bg-amber-50">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs font-bold text-amber-900">Fase de Ejecución:</span>
            <span className="text-[11px] text-amber-700">Reunión apertura, lista de chequeo, reunión cierre y hallazgos</span>
          </div>
        </div>
      </Card>

      {/* Grid de Reuniones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. REUNIÓN DE APERTURA */}
        <div className="bg-white border border-green-200 hover:border-green-300 rounded-lg p-2.5 px-3 flex items-center justify-between transition-colors">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-900 truncate">Reunión de Apertura</h3>
              {reunionApertura && (
                <Badge variant="default" className="bg-green-600 text-[10px] px-1 py-0 h-4 flex items-center shrink-0">
                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  Registrado
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {reunionApertura ? `Fecha: ${fechaReunion(reunionApertura)} - ${reunionApertura.modalidad || ''}` : 'Kick-off oficial con el área auditada'}
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAperturaOpen(true)}
              className="font-bold text-[10px] h-7 px-2.5 py-0 border-gray-300 hover:bg-[#003DA5] text-gray-700 shrink-0"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              {reunionApertura ? 'Editar' : 'Registrar'}
            </Button>
          )}
        </div>

        {/* 2. REUNIÓN DE CIERRE */}
        <div className="bg-white border border-emerald-200 hover:border-emerald-300 rounded-lg p-2.5 px-3 flex items-center justify-between transition-colors">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-900 truncate">Reunión de Cierre</h3>
              {reunionCierre && (
                <Badge variant="default" className="bg-green-600 text-[10px] px-1 py-0 h-4 flex items-center shrink-0">
                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  Registrado
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {reunionCierre ? `Fecha: ${fechaReunion(reunionCierre)} - ${reunionCierre.modalidad || ''}` : 'Cierre y firma de acta'}
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalCierreOpen(true)}
              className="font-bold text-[10px] h-7 px-2.5 py-0 border-gray-300 hover:bg-[#003DA5] text-gray-700 shrink-0"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              {reunionCierre ? 'Editar' : 'Registrar'}
            </Button>
          )}
        </div>
      </div>

      {/* 3. HALLAZGOS Y TAREAS (Unificado con tabs) */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {/* Tabs internas */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <button
            onClick={() => setSeccionEjecucionActiva('hallazgos')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              seccionEjecucionActiva === 'hallazgos'
                ? 'text-red-700 bg-white border-b-2 border-red-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Hallazgos de Auditoría
          </button>
          <button
            onClick={() => setSeccionEjecucionActiva('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              seccionEjecucionActiva === 'tareas'
                ? 'text-blue-700 bg-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Tareas y Actividades
          </button>
        </div>
        {/* Contenido */}
        <div className="p-5">
          {seccionEjecucionActiva === 'hallazgos' ? (
            <SeccionHallazgosExpediente
              auditoriaId={auditoria.id}
              auditoriaNombre={auditoria.nombre || auditoria.codigo}
              permitirTipoPreliminar
              onEvidenciasActualizadas={onRecargarDocumentos}
              onHallazgosActualizados={onRecargarAuditoria}
              hallazgosPrecargados={hallazgosPrecargados}
              evidenciasPorHallazgoPrecargadas={evidenciasPorHallazgoPrecargadas}
            />
          ) : (
            <SeccionTareasExpediente auditoriaId={auditoria.id} />
          )}
        </div>
      </div>

      {/* 5. DOCUMENTOS DE EJECUCIÓN */}
      <SeccionDocumentosPorEtapa
        auditoriaId={auditoria.id}
        etapa="ejecucion"
      />

      {/* 6. LISTAS DE CHEQUEO DE EJECUCIÓN (al final) */}
      <SeccionListasChequeoExpediente
        auditoriaId={auditoria.id}
        etapaActual="Ejecución"
        readOnly={readOnly}
        documentosAuditoriaPrecargados={documentosAuditoriaBackend}
      />

      <ModalReunionApertura
        isOpen={modalAperturaOpen}
        onClose={() => setModalAperturaOpen(false)}
        auditoriaId={auditoria.id}
        auditoriaNombre={auditoria.nombre || auditoria.codigo}
        reunionExistente={reunionApertura}
        onSuccess={cargarReuniones}
      />
      <ModalReunionCierre
        isOpen={modalCierreOpen}
        onClose={() => setModalCierreOpen(false)}
        auditoriaId={auditoria.id}
        auditoriaNombre={auditoria.nombre || auditoria.codigo}
        reunionExistente={reunionCierre}
        onSuccess={cargarReuniones}
      />
    </div>
  );
}

// TAB 4: COMUNICACIÓN — Mismo patrón que Planeación/Ejecución: Card + contenido. Flujo: Informe Preliminar, Gestión Hallazgos, Decisión, Plan Mejoramiento
function TabComunicacion({
  auditoria,
  onComunicacionCompletada,
  readOnly,
  documentosAuditoriaBackend,
}: TabFaseProps) {
  return (
    <div className="space-y-4">
      <Card className="p-3 border-l-4 border-l-green-600 bg-green-50">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-900">Fase de Comunicación</p>
            <p className="text-xs text-green-700">Informes y comunicación de resultados</p>
          </div>
        </div>
      </Card>

      {/* MÓDULO DE COMUNICACIÓN */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-4">
        <ComunicacionAuditoriaModule
          auditoriaId={auditoria.id}
          auditoriaInfo={auditoria}
          estadoAuditoria={auditoria.estado}
          embedded
          onComunicacionCompletada={onComunicacionCompletada}
          readOnly={readOnly}
        />
      </div>
      {/* DOCUMENTOS DE COMUNICACIÓN */}
      <SeccionDocumentosPorEtapa
        auditoriaId={auditoria.id}
        etapa="comunicacion"
      />
      {/* LISTAS DE CHEQUEO DE COMUNICACIÓN (al final) */}
      <SeccionListasChequeoExpediente
        auditoriaId={auditoria.id}
        etapaActual="Comunicación"
        readOnly={readOnly}
        documentosAuditoriaPrecargados={documentosAuditoriaBackend}
      />
    </div>
  );
}

// Tab Seguimiento: Verificación de Cumplimiento + Informe de Cierre (mismo nivel que Comunicación)
function TabSeguimiento({
  auditoria,
  documentos = [],
  onSubirDocumento,
  onRecargarDocumentos,
  onComunicacionCompletada,
  readOnly,
}: TabFaseProps & {
  documentos?: DocumentoExpediente[];
  onSubirDocumento?: (file: File, metadata: { nombre: string; tipoDocumento: string; etapa: string }) => Promise<boolean>;
  onRecargarDocumentos?: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-3 border-l-4 border-l-indigo-600 bg-indigo-50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-bold text-indigo-900">Seguimiento y Cierre</p>
            <p className="text-xs text-indigo-700">Verificación de cumplimiento del plan e informe de cierre</p>
          </div>
        </div>
      </Card>
      <div className="bg-white border-2 border-indigo-200 rounded-lg p-4">
        <ComunicacionAuditoriaModule
          auditoriaId={auditoria.id}
          auditoriaInfo={auditoria}
          estadoAuditoria="Seguimiento"
          soloSeguimiento
          embedded
          documentos={documentos}
          onSubirDocumento={onSubirDocumento}
          onRecargarDocumentos={onRecargarDocumentos}
          onComunicacionCompletada={onComunicacionCompletada}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function TabDocumentacion({
  documentos,
  filtro,
  onFiltroChange,
  auditoriaId,
  loading,
  onSubirDocumento,
  onRecargar,
  readOnly,
}: {
  documentos: DocumentoExpediente[];
  filtro: string;
  onFiltroChange: (filtro: string) => void;
  auditoriaId: string;
  loading?: boolean;
  onSubirDocumento?: (file: File, metadata: { nombre: string; descripcion?: string; tipoDocumento: string; etapa: string }) => Promise<boolean>;
  onRecargar: () => void;
  readOnly?: boolean;
}) {
  const [modalCargar, setModalCargar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  // Estado para preview inline
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nombre: string; tipoMime: string } | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);

  const handleDescargarDoc = async (doc: DocumentoExpediente) => {
    if (!doc.urlDownload) return;
    try {
      const url = doc.urlDownload.startsWith('http') ? doc.urlDownload : `${window.location.origin}${doc.urlDownload}`;
      const res = await fetch(url, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Descarga iniciada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    }
  };

  const handleVerDoc = async (doc: DocumentoExpediente) => {
    if (!doc.urlPreview) return;
    setCargandoPreview(true);
    try {
      const url = doc.urlPreview.startsWith('http') ? doc.urlPreview : `${window.location.origin}${doc.urlPreview}`;
      const res = await fetch(url, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewDoc({
        url: blobUrl,
        nombre: doc.nombre || 'Documento',
        tipoMime: doc.tipoMime || 'application/pdf'
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al abrir documento');
    } finally {
      setCargandoPreview(false);
    }
  };

  const cerrarPreview = () => {
    if (previewDoc) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
  };

  // ✅ Manejar subida de documento conectada al backend
  const handleSubirDocumento = async (docData: any) => {
    if (!onSubirDocumento || readOnly) return;
    if (!docData.archivo) {
      toast.error('❌ Error', { description: 'Selecciona un archivo para subir' });
      return;
    }

    setSubiendo(true);
    try {
      const success = await onSubirDocumento(docData.archivo, {
        nombre: docData.nombre || docData.archivo.name,
        descripcion: docData.descripcion,
        tipoDocumento: docData.tipo || 'Otro',
        etapa: docData.fase || 'planeacion',
      });

      if (success) {
        toast.success('✅ Documento subido', {
          description: `${docData.nombre || docData.archivo.name} agregado al expediente`,
          duration: 3000
        });
        setModalCargar(false);
      } else {
        toast.error('❌ Error al subir', {
          description: 'No se pudo subir el documento. Intenta de nuevo.',
          duration: 4000
        });
      }
    } catch (err) {
      console.error('Error subiendo documento:', err);
      toast.error('❌ Error al subir', {
        description: 'Ocurrió un error inesperado',
        duration: 4000
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filtro}
              onChange={(e) => onFiltroChange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-semibold"
            >
              <option value="todos">Todos</option>
              <option value="planeacion">Planeación</option>
              <option value="ejecucion">Ejecución</option>
              <option value="comunicacion">Comunicación</option>
            </select>
            {/* Botón refrescar */}
            <Button
              size="sm"
              variant="outline"
              onClick={onRecargar}
              disabled={loading}
              className="font-semibold"
            >
              <Activity className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
          {!readOnly && (
            <Button
              size="sm"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              className="font-bold"
              onClick={() => setModalCargar(true)}
              disabled={subiendo}
            >
              <Upload className="w-3 h-3 mr-1" />
              {subiendo ? 'Subiendo...' : 'Cargar Documento'}
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-gray-500">Cargando documentos...</p>
          </Card>
        ) : documentos.length === 0 ? (
          <Card className="p-8 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-bold text-gray-500">No hay documentos</p>
            <p className="text-xs text-gray-400 mt-1">Sube archivos para comenzar</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {documentos.map((doc) => (
              <Card key={doc.id} className="p-4 border-l-4 border-l-blue-600 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-bold text-gray-900 truncate">{doc.nombre}</h5>
                      {doc.version && (
                        <Badge className="text-xs font-bold bg-gray-100 text-gray-700">v{doc.version}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                      <Badge className="text-xs">{doc.tipo}</Badge>
                      {/* Badge de Fase con color */}
                      <Badge className="text-[10px] font-bold" style={{
                        background: doc.fase === 'planeacion' ? '#EDE9FE' : doc.fase === 'ejecucion' ? '#DBEAFE' : '#D1FAE5',
                        color: doc.fase === 'planeacion' ? '#6D28D9' : doc.fase === 'ejecucion' ? '#1D4ED8' : '#047857',
                        border: `1px solid ${doc.fase === 'planeacion' ? '#C4B5FD' : doc.fase === 'ejecucion' ? '#93C5FD' : '#6EE7B7'}`,
                      }}>
                        {doc.fase === 'planeacion' ? 'Planeación' : doc.fase === 'ejecucion' ? 'Ejecución' : 'Comunicación'}
                      </Badge>
                      {/* Indicador Lista de Chequeo */}
                      {doc.origenListaChequeo && (
                        <Badge className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                          <CheckSquare className="w-2.5 h-2.5 mr-0.5" />
                          Lista de Chequeo
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                      </span>
                      <span>{doc.size}</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc.cargadoPor}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Botón Ver - solo para PDFs e imágenes */}
                    {doc.tipoMime && (doc.tipoMime.startsWith('application/pdf') || doc.tipoMime.startsWith('image/')) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleVerDoc(doc)}
                        title="Ver documento"
                        disabled={cargandoPreview}
                      >
                        <Eye className={`w-3 h-3 ${cargandoPreview ? 'animate-pulse' : ''}`} />
                      </Button>
                    )}
                    {/* Botón Descargar - siempre disponible */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDescargarDoc(doc)}
                      title="Descargar"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modalCargar && (
        <ModalCargarDocumento
          onClose={() => setModalCargar(false)}
          onGuardar={handleSubirDocumento}
          loading={subiendo}
        />
      )}

      {/* ═══ Modal de Previsualización de Documento ═══ */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={cerrarPreview}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Contenido */}
          <div
            className="relative w-[90vw] h-[88vh] max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{previewDoc.nombre}</h3>
                  <p className="text-[10px] text-blue-200">Vista previa del documento</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Botón abrir en nueva pestaña */}
                <button
                  onClick={() => window.open(previewDoc.url, '_blank')}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4 text-white" />
                </button>
                {/* Botón cerrar */}
                <button
                  onClick={cerrarPreview}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-red-500/80 transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Contenido del documento */}
            <div className="flex-1 bg-gray-100 overflow-hidden">
              {previewDoc.tipoMime.startsWith('application/pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full border-0"
                  title={previewDoc.nombre}
                />
              ) : previewDoc.tipoMime.startsWith('image/') ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.nombre}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">
                      Vista previa no disponible para este tipo de archivo
                    </p>
                    <button
                      onClick={() => window.open(previewDoc.url, '_blank')}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Abrir en nueva pestaña
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabHistorial({ eventos }: { eventos: EventoHistorial[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Timeline de Actividad</h3>
        <span className="text-xs font-bold text-gray-600">{eventos.length} eventos</span>
      </div>

      {eventos.length === 0 ? (
        <Card className="p-8 text-center">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-bold text-gray-500">Sin eventos</p>
          <p className="text-xs text-gray-400 mt-1">No hay actividad registrada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {eventos.map((evento) => (
            <Card key={evento.id} className="p-4 border-l-4 hover:shadow-md transition-all" style={{ borderLeftColor: evento.color }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${evento.color}20` }}>
                  <div style={{ color: evento.color }}>{evento.icono}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-sm font-bold text-gray-900">{evento.titulo}</h5>
                      <p className="text-sm text-gray-700 mt-1">{evento.descripcion}</p>
                    </div>
                    <Badge className="text-xs font-bold">{evento.tipo}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {evento.usuario}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(evento.fecha).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB FINALIZADA — Panel de auditoría cerrada (inmutable)
// Resumen ejecutivo, acciones del plan, lecciones, recomendaciones, trazabilidad, descargas
// ═══════════════════════════════════════════════════════════════════════════

interface TabFinalizadaProps {
  auditoriaId: string;
  auditoria: Auditoria;
  documentos: DocumentoExpediente[];
  hallazgosPrecargados?: Hallazgo[];
}

/** Tab Finalizada: Preliminar, Final y Ejecutivo se generan por la plataforma. Documento de Cierre se sube en Seguimiento. */
function TabFinalizada({ auditoriaId, auditoria, documentos, hallazgosPrecargados }: TabFinalizadaProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [planes, setPlanes] = useState<any[]>([]);
  const [hallazgos, setHallazgos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const hallazgosPromise =
          hallazgosPrecargados !== undefined
            ? Promise.resolve(hallazgosPrecargados)
            : controlInternoService.getHallazgosByAuditoria(auditoriaId).catch(() => []);

        const [resCierre, planesData, hallazgosData, planIndData] = await Promise.all([
          controlInternoService.getResumenEjecutivoCierre(auditoriaId).catch(() => null),
          controlInternoService.getPlanesMejoramientoByAuditoria(auditoriaId).catch(() => []),
          hallazgosPromise,
          controlInternoService.getPlanIndividualByAuditoria(auditoriaId).catch(() => null),
        ]);
        if (!cancelled) {
          setResumen(resCierre);
          setPlanes(Array.isArray(planesData) ? planesData : []);
          setHallazgos(Array.isArray(hallazgosData) ? hallazgosData : []);
          (window as any).planIndividualActual = planIndData;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [auditoriaId, hallazgosPrecargados]);

  const todasLasAcciones = useMemo(() => {
    const out: { planCodigo: string; accion: any }[] = [];
    for (const plan of planes) {
      for (const accion of plan.acciones || []) {
        out.push({ planCodigo: plan.codigo || plan.id, accion });
      }
    }
    return out;
  }, [planes]);

  const conteoHallazgos = useMemo(() => {
    let ratificados = 0, retirados = 0, aceptados = 0;
    for (const h of hallazgos) {
      const d = (h.decisionAuditor || h.estado || '').toLowerCase();
      if (d === 'ratificado' || d === 'modificado') ratificados++;
      else if (d === 'retirado') retirados++;
      else if (d === 'aceptado') aceptados++;
    }
    return { ratificados, retirados, aceptados, total: hallazgos.length };
  }, [hallazgos]);

  const docCierre = useMemo(() => documentos.find(d => d.id.startsWith('doc-cierre') || /cierre|informe\s*de\s*cierre/i.test(d.nombre)), [documentos]);
  const docEjecutivo = useMemo(() => documentos.find(d => /ejecutivo|informe\s*ejecutivo/i.test(d.nombre)), [documentos]);

  const descargarDoc = async (doc: DocumentoExpediente) => {
    const url = doc.urlDownload || (doc as any).url;
    if (!url) {
      toast.error('No hay enlace de descarga para este documento');
      return;
    }
    try {
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      const res = await fetch(fullUrl, { headers: getDefaultHeaders() });
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('El archivo no está disponible en el servidor. Use "Generar / Descargar Informe de Cierre" o "Generar / Descargar Informe Ejecutivo" para obtener el PDF.');
          return;
        }
        throw new Error(res.statusText);
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.nombre || 'documento';
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Descarga iniciada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    }
  };

  const construirAuditoriaPdfData = () => {
    const fechaInicioPdf = resumen?.fechaInicio || auditoria.cronograma?.fechaInicio;
    const fechaFinPdf = resumen?.fechaFin || auditoria.cronograma?.fechaFin;
    const vigenciaExpediente = (auditoria as any).año || (auditoria as any).vigencia || (auditoria.codigo?.split('-')[1]);
    const territorialAuditoria = auditoria.territorial || (auditoria as any).sede || 'Antioquia';

    return {
      codigo: resumen?.codigo || auditoria.codigo,
      nombre: resumen?.nombre || auditoria.nombre,
      tipo: auditoria.tipo,
      estado: auditoria.estado,
      areaAuditable: auditoria.areaAuditable,
      procesoNombre: auditoria.procesoNombre,
      nivelRiesgo: auditoria.nivelRiesgo,
      territorial: territorialAuditoria,
      año: vigenciaExpediente || new Date().getFullYear(),
      auditorLider: auditoria.auditorLider?.nombre || '—',
      auditorLiderEmail: auditoria.auditorLider?.email || '—',
      responsableArea: {
        nombre: auditoria.responsableArea?.nombre,
        cargo: auditoria.responsableArea?.cargo,
        email: auditoria.responsableArea?.email,
        telefono: auditoria.responsableArea?.telefono,
      },
      equipoAuditores: (auditoria.equipoAuditores || []).map((a) => ({
        nombre: a.nombre,
        rol: a.rol,
        email: a.email,
      })),
      cronograma: {
        fechaInicio: fechaInicioPdf,
        fechaFin: fechaFinPdf,
        fechaCreacion: auditoria.cronograma?.fechaCreacion,
        fechaFinReal: auditoria.cronograma?.fechaFinReal,
        duracionDias: auditoria.cronograma?.duracionDias,
        diasTranscurridos: auditoria.cronograma?.diasTranscurridos,
      },
      progreso: {
        general: auditoria.progreso?.general ?? 0,
      },
      estadisticas: {
        totalHallazgos: auditoria.estadisticas?.totalHallazgos ?? 0,
        hallazgosCriticos: auditoria.estadisticas?.hallazgosCriticos ?? 0,
        hallazgosMayores: auditoria.estadisticas?.hallazgosMayores ?? 0,
        hallazgosMenores: auditoria.estadisticas?.hallazgosMenores ?? 0,
        documentosCargados: auditoria.estadisticas?.documentosCargados ?? 0,
        notificacionesEnviadas: auditoria.estadisticas?.notificacionesEnviadas ?? 0,
      },
      metadata: {
        creadoPor: auditoria.metadata?.creadoPor,
        ultimaModificacion: auditoria.metadata?.ultimaModificacion,
        modificadoPor: auditoria.metadata?.modificadoPor,
      },
      objetivo: (auditoria as any).objetivo || (auditoria as any).objetivoGeneral || (auditoria as any).objetivo_general || '',
      objetivos: ((auditoria as any).objetivos?.length > 0)
        ? (auditoria as any).objetivos.map((o: any) => o.descripcion || o.nombre || o)
        : ((auditoria as any).objetivoGeneral || (auditoria as any).objetivo_general || (auditoria as any).proposito || (window as any).planIndividualActual?.objetivos?.map((o: any) => o.descripcion || o.nombre) || []),
      alcance: auditoria.alcance || (auditoria as any).alcanceAuditoria || (auditoria as any).alcance_auditoria || (auditoria as any).cobertura || (window as any).planIndividualActual?.alcance || '',
      criterios: ((auditoria as any).criterios?.length > 0)
        ? (auditoria as any).criterios.map((c: any) => c.descripcion || c.nombre || c)
        : ((auditoria as any).criteriosAuditoria?.map((c: any) => c.nombre || c.descripcion) || (auditoria as any).normatividad || (window as any).planIndividualActual?.criterios?.map((c: any) => c.descripcion || c.nombre) || []),
    };
  };

  const generarYDescargarEjecutivo = async () => {
    try {
      setLoading(true);
      const [auditoriaCompleta, planFrescos] = await Promise.all([
        controlInternoService.getAuditoriaById(auditoriaId),
        controlInternoService.getPlanIndividualByAuditoria(auditoriaId).catch(() => null)
      ]);

      if (planFrescos) {
        (window as any).planIndividualActual = planFrescos;
      }

      // --- LÓGICA DE FORMATEO EXACTA ---
      const territorial = auditoriaCompleta.sede?.nombre || auditoriaCompleta.territorial || 'Sede Central';
      // Usando inicio/fin que son los campos reales
      const fInicio = auditoriaCompleta.cronograma?.inicio || auditoriaCompleta.cronograma?.fechaInicio || (auditoriaCompleta as any).fechaInicio;
      const fFin = auditoriaCompleta.cronograma?.fin || auditoriaCompleta.cronograma?.fechaFin || (auditoriaCompleta as any).fechaFin;

      const formatearFechaLarga = (fecha: any) => {
        if (!fecha) return '—';
        const d = parseLocalDate(fecha);
        if (isNaN(d.getTime())) return '—';
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
      };

      const rangoFechas = (fInicio && fFin)
        ? `${formatearFechaLarga(fInicio)} – ${formatearFechaLarga(fFin)}`
        : (fInicio ? formatearFechaLarga(fInicio) : '—');

      const periodoInicio = resumen?.fechaInicio || (auditoriaCompleta as any).fechaInicio;
      const periodoFin = resumen?.fechaFin || (auditoriaCompleta as any).fechaFin;
      const periodoAuditoria = (periodoInicio && periodoFin)
        ? `${formatearFechaLarga(periodoInicio)} – ${formatearFechaLarga(periodoFin)}`
        : (periodoInicio ? formatearFechaLarga(periodoInicio) : rangoFechas);

      const equipoAuditores = (auditoriaCompleta.equipoAuditores || []).map((a: any) => ({
        nombre: a.nombre || a.nombreCompleto || 'Auditor',
        rol: a.rol || a.cargo || 'Equipo Auditor',
        email: a.email || a.correo || '—'
      }));

      // ✅ ENRIQUECIMIENTO DE EMAILS PARA EL PDF
      try {
        const profsRes = await configuracionesProfesionalesOCIApi.getAll(true);
        const profs = Array.isArray(profsRes.data) ? profsRes.data : (Array.isArray(profsRes) ? profsRes : []);

        if (profs.length > 0) {
          const matchProf = (nombre: string) => {
            const n = (nombre || '').toLowerCase().trim();
            return profs.find(p => {
              const pName = (p.nombre || p.persona?.nombre || p.nom_largo || p.nombreCompleto || '').toLowerCase().trim();
              if (!pName || !n) return false;
              if (pName === n || pName.includes(n) || n.includes(pName)) return true;
              const tP = pName.split(/\s+/).filter(t => t.length > 2);
              const tN = n.split(/\s+/).filter(t => t.length > 2);
              return tP.filter(t => tN.includes(t)).length >= 2;
            });
          };

          // Líder
          const lNombre = auditoriaCompleta.auditorLider?.nombre || auditoriaCompleta.auditorLider || '';
          const foundL = matchProf(lNombre);
          if (foundL) {
            (auditoriaCompleta as any).auditorLiderEmail = foundL.email || foundL.persona?.email;
          }

          // Equipo
          equipoAuditores.forEach((aud: any) => {
            if (!aud.email || aud.email === '—') {
              const found = matchProf(aud.nombre);
              if (found) aud.email = found.email || found.persona?.email;
            }
          });
        }
      } catch (err) {
        console.error('Error enriqueciendo PDF:', err);
      }

      // Formatear criterios para evitar [object Object]
      const criteriosFormateados = ((auditoriaCompleta as any).criterios?.length > 0)
        ? (auditoriaCompleta as any).criterios.map((c: any) => c.descripcion || c.nombre || c).join('\n')
        : ((auditoriaCompleta as any).normatividad || planFrescos?.criterios?.map((c: any) => c.descripcion || c.nombre).join('\n') || '');

      const auditoriaParaPdf = {
        ...auditoriaCompleta,
        auditorLiderEmail: (auditoriaCompleta as any).auditorLiderEmail || auditoria.auditorLider?.email,
        territorial: territorial,
        rangoFechas: rangoFechas,
        periodoAuditoria: periodoAuditoria,
        equipoAuditores: equipoAuditores,
        criterios: criteriosFormateados,
        objetivo: auditoriaCompleta.objetivo || auditoriaCompleta.objetivoGeneral || (auditoriaCompleta as any).objetivo_general || '',
        objetivos: (auditoriaCompleta.objetivos?.length > 0)
          ? auditoriaCompleta.objetivos.map((o: any) => o.descripcion || o.nombre || o)
          : (auditoriaCompleta.objetivoGeneral || (auditoriaCompleta as any).objetivo_general || planFrescos?.objetivos?.map((o: any) => o.descripcion || o.nombre) || []),
        alcance: auditoriaCompleta.alcance || auditoriaCompleta.alcanceAuditoria || (auditoriaCompleta as any).alcance_auditoria || planFrescos?.alcance || '',
      };

      const datos = {
        auditoria: auditoriaParaPdf,
        resumen: resumen ? { ...resumen } : null,
        planes: planes,
        hallazgos: hallazgos.map((h: any) => ({
          id: h.id,
          codigo: h.codigo,
          titulo: h.titulo,
          descripcion: h.descripcion || h.condicion || '',
          gravedad: h.gravedad,
          decisionAuditor: h.decisionAuditor,
          estado: h.estado,
          criterioIncumplido: h.criterioIncumplido || h.criterio || '',
          causas: Array.isArray(h.causas) ? h.causas : [h.causas].filter(Boolean),
          efectos: Array.isArray(h.efectos) ? h.efectos : [h.efectos].filter(Boolean),
          recomendaciones: Array.isArray(h.recomendaciones) ? h.recomendaciones : [h.recomendaciones].filter(Boolean),
        })),
      };
      await exportarPDFInformeEjecutivo(datos);
      toast.success('Informe ejecutivo descargado');
    } catch (e: any) {
      toast.error(e?.message || 'Error al generar el PDF');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Clock className="w-8 h-8 animate-pulse mr-2" />
        Cargando resumen de cierre…
      </div>
    );
  }

  const fechaInicio = resumen?.fechaInicio || auditoria.cronograma?.fechaInicio;
  const fechaFin = resumen?.fechaFin || auditoria.cronograma?.fechaFin;
  const fechasStr = [fechaInicio, fechaFin].map(d => d instanceof Date ? d.toLocaleDateString('es-CO') : (d || '').toString().split('T')[0]).filter(Boolean).join(' – ');
  const planCodigo = resumen?.planVinculado || resumen?.planCodigo || planes[0]?.codigo || planes[0]?.id || '—';
  const cumplidas = todasLasAcciones.filter(({ accion }) => (String(accion.estadoVerificacionOci || '').toLowerCase() === 'cumplida')).length;
  const parciales = todasLasAcciones.filter(({ accion }) => (String(accion.estadoVerificacionOci || '').toLowerCase() === 'parcial')).length;

  return (
    <div className="space-y-6">
      {/* Banner Auditoría Finalizada */}
      <Card className="p-4 border-l-4 border-l-green-600 bg-green-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Flag className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-green-900">Auditoría Finalizada</h2>
            <p className="text-sm text-green-700">Expediente inmutable · Plan {planCodigo} completado</p>
          </div>
        </div>
      </Card>

      {/* Resumen ejecutivo */}
      <Card className="p-4 border-l-4 border-l-blue-600 bg-blue-50/50">
        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Resumen ejecutivo</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Auditoría</dt><dd className="font-bold text-gray-900">{resumen?.codigo || auditoria.codigo}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Nombre</dt><dd className="font-bold text-gray-900">{resumen?.nombre || auditoria.nombre}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Auditor Líder</dt><dd className="font-bold text-gray-900">{auditoria.auditorLider?.nombre || '—'}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Período</dt><dd className="font-bold text-gray-900">{fechasStr || '—'}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Plan vinculado</dt><dd className="font-bold text-gray-900">{planCodigo}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Total hallazgos</dt><dd className="font-bold text-gray-900">{conteoHallazgos.total}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Ratificados</dt><dd className="font-bold text-gray-900">{conteoHallazgos.ratificados}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Retirados</dt><dd className="font-bold text-gray-900">{conteoHallazgos.retirados}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Aceptados</dt><dd className="font-bold text-gray-900">{conteoHallazgos.aceptados}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Acciones de mejora</dt><dd className="font-bold text-gray-900">{todasLasAcciones.length}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Cumplidas</dt><dd className="font-bold text-green-700">{cumplidas}</dd></div>
          <div className="flex justify-between md:block"><dt className="text-gray-600 font-medium">Parciales</dt><dd className="font-bold text-amber-700">{parciales}</dd></div>
        </dl>
      </Card>

      {/* Acciones del plan — estado final */}
      {todasLasAcciones.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Acciones del plan — estado final</h3>
          <div className="space-y-4">
            {todasLasAcciones.map(({ planCodigo: codigoPlan, accion }, idx) => {
              const estado = String(accion.estadoVerificacionOci || '').toLowerCase();
              const esCumplida = estado === 'cumplida';
              const esParcial = estado === 'parcial';
              const fechaFinAccion = accion.fechaFin ? (typeof accion.fechaFin === 'string' ? accion.fechaFin.split('T')[0] : accion.fechaFin) : '—';
              return (
                <Card key={accion.id} className={`p-4 border-l-4 ${esCumplida ? 'border-l-green-600 bg-green-50/50' : esParcial ? 'border-l-amber-500 bg-amber-50/50' : 'border-l-gray-400 bg-gray-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</div>
                      <div>
                        <p className="font-medium text-gray-900">{accion.descripcion}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{accion.responsable || '—'}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fechaFinAccion}</span>
                          <span>Plan: {codigoPlan}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={esCumplida ? 'bg-green-100 text-green-800' : esParcial ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}>
                      Verificada: {estado === 'cumplida' ? 'Cumplida' : estado === 'parcial' ? 'Parcial' : estado === 'incumplida' ? 'Incumplida' : '—'}
                    </Badge>
                  </div>
                  {(accion.observacionOci || accion.evidenciaVerificada) && (
                    <div className="mt-2 pl-11 text-sm text-gray-600 flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="italic">{accion.observacionOci || accion.evidenciaVerificada}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Lecciones aprendidas */}
      {(resumen?.leccionesAprendidas || '') && (
        <Card className="p-4 border-l-4 border-l-violet-500 bg-violet-50/50">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-violet-700" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Lecciones aprendidas</h3>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{resumen.leccionesAprendidas}</p>
        </Card>
      )}

      {/* Recomendaciones */}
      {(resumen?.recomendacionesFuturasAuditorias || '') && (
        <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recomendaciones</h3>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{resumen.recomendacionesFuturasAuditorias}</p>
        </Card>
      )}

      {/* Trazabilidad de hallazgos */}
      {hallazgos.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Trazabilidad de hallazgos</h3>
          <div className="space-y-3">
            {hallazgos.map((h) => {
              const decision = (h.decisionAuditor || h.estado || '').toLowerCase();
              const label = decision === 'ratificado' || decision === 'modificado' ? 'RATIFICADO' : decision === 'retirado' ? 'RETIRADO' : decision === 'aceptado' ? 'ACEPTADO' : (h.estado || 'Sin decisión').toUpperCase();
              return (
                <Card key={h.id} className="p-4 border-l-4 border-l-red-200 bg-red-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{h.codigo || h.id} — {label}</p>
                      <p className="text-sm text-gray-700 mt-1">{h.titulo || h.descripcion || '—'}</p>
                      {(h.fundamentacionTecnica || (h as any).fundamentacion) && (
                        <p className="text-xs text-gray-600 mt-2 italic">{(h as any).fundamentacionTecnica || (h as any).fundamentacion}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {(h as any).auditorValido || (h as any).decisionPor || auditoria.auditorLider?.nombre || '—'}
                      {(h as any).fechaDecision && <span> · {(h as any).fechaDecision.toString().split('T')[0]}</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones descarga — Preliminar, Final, Cierre y Ejecutivo se generan por la plataforma */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        {docEjecutivo ? (
          <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50" onClick={() => descargarDoc(docEjecutivo)}>
            <Download className="w-4 h-4 mr-2" />
            Informe Ejecutivo
          </Button>
        ) : (
          <>
            <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50" onClick={generarYDescargarEjecutivo}>
              <FileText className="w-4 h-4 mr-2" />
              Generar / Descargar Informe Ejecutivo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
