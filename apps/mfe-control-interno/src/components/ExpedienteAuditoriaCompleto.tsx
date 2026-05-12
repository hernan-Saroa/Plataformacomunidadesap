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

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileText, Calendar, Users, Target, Clock, CheckCircle,
  AlertCircle, TrendingUp, Activity, History, FolderOpen,
  FileSearch, Send, Eye, Download, MapPin, Mail, Phone,
  Building2, User, Award, ClipboardCheck, MessageSquare,
  Sparkles, Info, ChevronRight, ChevronDown, Edit2, Trash2,
  Upload, Archive, ExternalLink, Filter, Search, Tag,
  BarChart3, PieChart, LineChart, CheckSquare, Paperclip, BookOpen,
  Lightbulb, Flag
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { notificationsService } from '../../services/api/notificationsService';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';

// Sub-módulos
import { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
import { ModalCargarDocumento } from './ModalCargarDocumento';
import { ActividadesIntegradas } from './ActividadesAuditoriaIntegradas';
import { ComunicacionAuditoriaModule } from './ComunicacionAuditoriaModule';
import { SeccionHallazgosExpediente } from './SeccionHallazgosExpediente';
import { ModalReunionApertura, ModalReunionCierre } from './ModalReunionAperturaCierre';
import { SeccionTareasExpediente } from './SeccionTareasExpediente';
import { SeccionListasChequeoExpediente } from './SeccionListasChequeoExpediente';

// Servicio API
import { controlInternoService } from '../../../services/api/controlInternoService';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';
import { exportarPDFInformeEjecutivo } from './services/exportarPDFInformeCierreEjecutivo';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, type ConfiguracionDocumento } from './services/pdfESAPHeader';

// ============ TIPOS ============

type EstadoAuditoria = 'planeacion' | 'ejecucion' | 'comunicacion' | 'seguimiento' | 'finalizada';
type TipoAuditoria = 'Sede' | 'Territorial' | 'Especial';
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
    if (fase === 'revision' || fase === 'completada') {
      return { general: progreso, planeacion: 100, ejecucion: 100, comunicacion: progreso };
    }

    return { general: progreso, planeacion: progreso, ejecucion: 0, comunicacion: 0 };
  };

  // ✅ CORREGIDO: Inicializar como null para evitar renderizar con datos MOCK
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  // ✅ CONECTADO AL BACKEND: Documentos se cargan del backend
  const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([]);
  // Ref para guardar el doc de cierre y re-inyectarlo en cada recarga
  const documentoCierreRef = useRef<DocumentoExpediente | null>(null);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  // ✅ Iniciar en loading=true si hay auditoriaId
  const [loading, setLoading] = useState(!!auditoriaId);
  const [error, setError] = useState<string | null>(null);
  const [recargarTrigger, setRecargarTrigger] = useState(0);
  
  // ✅ Cargar datos del backend cuando se abre el modal
  useEffect(() => {
    const cargarAuditoria = async () => {
      if (!isOpen || !auditoriaId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await controlInternoService.getAuditoriaById(auditoriaId);
        
        // Mapear datos del backend a la estructura del frontend
        const progresoFases = calcularProgresoPorFases(data.fase, data.progreso);

        const auditoriaBackend: Auditoria = {
          id: data.id,
          codigo: data.codigo,
          nombre: data.nombre,
          territorial: data.territorial || data.sede || undefined,
          tipo: (data.tipo === 'Regular' || data.tipo === 'Sede') ? 'Sede' : 
                data.tipo === 'Territorial' ? 'Territorial' : 'Especial' as TipoAuditoria,
          // Priorizar estadoKanban (Seguimiento vs Finalizada) sobre fase (ambos son COMPLETADA)
          estado: mapearEstado(data.estadoKanban || data.fase),
          areaAuditable: data.areaObjetivo || data.territorial || 'Sin área definida',
          procesoNombre: data.procesoAuditado || data.nombre,
          nivelRiesgo: (data.riesgoKanban || 'Medio') as NivelRiesgo,
          
          responsableArea: {
            id: String(data.auditorLiderId || '1'),
            nombre: data.responsableAreaNombre || data.responsable || 'Sin responsable',
            cargo: data.responsableAreaCargo || 'Responsable',
            email: `responsable@esap.edu.co`,
            telefono: undefined,
          },
          
          auditorLider: {
            id: String(data.auditorLiderId || '1'),
            nombre: data.auditorLider?.nombre || 'Sin auditor líder',
            email: 'auditor@esap.edu.co',
            foto: undefined,
          },
          
          equipoAuditores: Array.isArray(data.equipoAuditores) 
            ? data.equipoAuditores.map((eq: any) => ({
                id: eq.id || String(eq.personaId),
                nombre: eq.nombreCompleto || eq.nombre || 'Auditor',
                rol: eq.rol || 'Auditor',
                email: 'auditor@esap.edu.co',
                foto: undefined,
              }))
            : [],
          
          cronograma: {
            fechaCreacion: new Date(data.createdAt || data.fechaInicio),
            fechaInicio: new Date(data.fechaInicio),
            fechaFin: new Date(data.fechaFin),
            fechaFinReal: data.fechaFinReal ? new Date(data.fechaFinReal) : undefined,
            duracionDias: calcularDiasDuracion(data.fechaInicio, data.fechaFin),
            diasTranscurridos: calcularDiasTranscurridos(data.fechaInicio),
          },
          
          progreso: progresoFases,
          
          estadisticas: {
            totalHallazgos: data.hallazgos || 0,
            hallazgosCriticos: 0,
            hallazgosMayores: 0,
            hallazgosMenores: data.hallazgos || 0,
            documentosCargados: data.totalDocumentos || 0,
            notificacionesEnviadas: 0,
          },
          
          fechasClave: {
            planeacionInicio: new Date(data.fechaInicio),
            planeacionFin: undefined,
            ejecucionInicio: undefined,
            ejecucionFin: undefined,
            comunicacionInicio: undefined,
            comunicacionFin: undefined,
            informePreliminar: undefined,
            informeFinal: undefined,
          },
          
          metadata: {
            creadoPor: 'Sistema',
            fechaCreacion: new Date(data.createdAt || data.fechaInicio),
            ultimaModificacion: new Date(data.updatedAt || Date.now()),
            modificadoPor: 'Sistema',
            version: 1,
          },
          
          // Checklist de actividades del proceso
          checklistCompletados: data.checklistCompletados || {},
        };
        
        setAuditoria(auditoriaBackend);
        
        // ✅ Cargar documentos de la auditoría desde el backend
        const documentosFinales: DocumentoExpediente[] = [];

        try {
          const documentosData = await controlInternoService.getDocumentosByAuditoria(auditoriaId);
          const documentosMapeados = mapearDocumentosBackend(documentosData);
          documentosFinales.push(...documentosMapeados);
        } catch (docErr) {
          console.error('Error cargando documentos:', docErr);
        }

        // ✅ Si existe documento de cierre, agregarlo SIEMPRE al inicio
        // PRIORIDAD: auditoriaDataInicial (del Kanban, siempre actualizado) > data (de getAuditoriaById)
        const documentoCierre = 
          auditoriaDataInicial?.documentoCierre ||
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
        console.log(`[Expediente] ✅ Cargados ${documentosFinales.length} documentos (cierre: ${!!documentoCierre})`);
        
        // ✅ Cargar historial de la auditoría desde el backend
        try {
          const historialData = await controlInternoService.getHistorialAuditoria(auditoriaId);
          const historialMapeado = mapearHistorialBackend(historialData);
          setHistorial(historialMapeado);
        } catch (histErr) {
          console.error('Error cargando historial:', histErr);
          // Si falla el historial, no bloquear - simplemente mostrar vacío
          setHistorial([]);
        }
      } catch (err: any) {
        console.error('Error cargando auditoría:', err);
        setError(err.message || 'Error desconocido');
        // Mantener los datos de ejemplo en caso de error
      } finally {
        setLoading(false);
      }
    };
    
    cargarAuditoria();
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
    }));
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
      const documentosData = await controlInternoService.getDocumentosByAuditoria(auditoriaId);
      const documentosMapeados = mapearDocumentosBackend(documentosData);
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
          auditoriaCodigo: auditoria?.codigo || `AUD-${auditoriaId.substring(0,4)}`,
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
  function mapearEstado(fase: string): EstadoAuditoria {
    const mapeo: Record<string, EstadoAuditoria> = {
      'planeacion': 'planeacion',
      'Planeación': 'planeacion',
      'en-curso': 'ejecucion',
      'Ejecución': 'ejecucion',
      'revision': 'comunicacion',
      'Comunicación': 'comunicacion',
      'completada': 'finalizada',
      'Seguimiento': 'seguimiento',
      'seguimiento': 'seguimiento',
      'Finalizada': 'finalizada',
    };
    return mapeo[fase] || 'planeacion';
  }
  
  function calcularDiasDuracion(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  function calcularDiasTranscurridos(fechaInicio: string): number {
    const inicio = new Date(fechaInicio);
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
        ['RESPONSABLE DEL ÁREA'],
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
        ['Planeación', `${auditoria.progreso.planeacion}%`, auditoria.progreso.planeacion === 100 ? 'Completada' : 'En progreso'],
        ['Ejecución', `${auditoria.progreso.ejecucion}%`, auditoria.progreso.ejecucion === 100 ? 'Completada' : 'En progreso'],
        ['Comunicación', `${auditoria.progreso.comunicacion}%`, auditoria.progreso.comunicacion > 0 ? 'En progreso' : 'Pendiente'],
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
        didParseCell: function(data: any) {
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
        didParseCell: function(data: any) {
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

  // ✅ Si está cargando o no hay auditoria, mostrar loading
  if (loading || !auditoria) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          hideCloseButton
          className="w-[92vw] max-w-[1073px] lg:max-w-6xl h-[95vh] flex flex-col p-0 items-center justify-center"
        >
          <DialogTitle className="sr-only">Cargando expediente</DialogTitle>
          <DialogDescription className="sr-only">Cargando datos de la auditoría</DialogDescription>
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Cargando expediente de auditoría...</p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        hideCloseButton
        className="w-[92vw] max-w-[1073px] lg:max-w-6xl h-[95vh] flex flex-col p-0"
      >
        <DialogTitle className="sr-only">
          Expediente de Auditoría {auditoria.codigo}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Visualización completa del expediente con 6 tabs: General, Planeación, Ejecución, Comunicación, Documentación e Historial
        </DialogDescription>

        {/* ═════════════════════════════════════════════════════════════════
            HEADER GRADIENTE - SEGÚN ESTÁNDAR WIZARD WORLD CLASS
            ═════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Icono con glassmorphism - SEGÚN ESTÁNDAR */}
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  {/* Título - SEGÚN ESTÁNDAR: text-xl font-black */}
                  <h2 className="text-xl font-black text-white">
                    Expediente de Auditoría
                  </h2>
                  {/* Subtítulo - SEGÚN ESTÁNDAR: text-sm text-blue-100 */}
                  <p className="text-sm text-blue-100">
                    {auditoria.codigo} · {auditoria.nombre}
                  </p>
                </div>
              </div>
              
              {/* BADGES INFORMATIVOS - SEGÚN ESTÁNDAR: Mínimo 2-3 badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/20 text-white font-bold border border-white/30">
                  <Building2 className="w-3 h-3 mr-1" />
                  {auditoria.areaAuditable}
                </Badge>
                <Badge className="bg-white text-blue-700 font-bold">
                  {auditoria.progreso.general}% completado
                </Badge>
                <Badge className="bg-green-500 text-white font-bold">
                  <FileText className="w-3 h-3 mr-1" />
                  {documentos.length} documentos
                </Badge>
                {auditoria.estadisticas.totalHallazgos > 0 && (
                  <Badge className="bg-red-500 text-white font-bold">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {auditoria.estadisticas.totalHallazgos} hallazgos
                  </Badge>
                )}
              </div>
            </div>

            {/* BOTÓN CERRAR - SEGÚN ESTÁNDAR: variant="ghost" hover:bg-white/20 */}
            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-4 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            TABS PERSONALIZADOS (No está en estándar, pero se mantiene)
            ═════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 border-b bg-gray-50">
          <div className="flex overflow-x-auto px-6 scrollbar-hide">
            {(PESTANAS_BASE.filter((p) => p.id !== 'finalizada' || auditoria?.estado === 'finalizada')).map((pestana) => {
              const Icon = pestana.icon;
              const isActive = activeTab === pestana.id;
              
              return (
                <button
                  key={pestana.id}
                  onClick={() => setActiveTab(pestana.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap
                    ${isActive 
                      ? 'border-blue-600 text-blue-700 font-bold' 
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="text-sm">{pestana.label}</span>
                  {pestana.id === 'documentacion' && documentos.length > 0 && (
                    <Badge className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold">
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && <TabGeneral auditoria={auditoria} readOnly={auditoria.estado === 'finalizada'} />}
              {activeTab === 'planeacion' && (
                <TabPlaneacion 
                  auditoria={auditoria} 
                  checklistCompletados={auditoria.checklistCompletados}
                  onToggleChecklist={auditoria.estado === 'finalizada' ? undefined : handleToggleChecklist}
                  readOnly={auditoria.estado === 'finalizada'}
                />
              )}
              {activeTab === 'ejecucion' && (
                <TabEjecucion 
                  auditoria={auditoria}
                  checklistCompletados={auditoria.checklistCompletados}
                  onToggleChecklist={auditoria.estado === 'finalizada' ? undefined : handleToggleChecklist}
                  readOnly={auditoria.estado === 'finalizada'}
                />
              )}
              {activeTab === 'comunicacion' && (
                <TabComunicacion 
                  auditoria={auditoria}
                  checklistCompletados={auditoria.checklistCompletados}
                  onToggleChecklist={auditoria.estado === 'finalizada' ? undefined : handleToggleChecklist}
                  onComunicacionCompletada={() => {
                setRecargarTrigger(t => t + 1);
                onComunicacionCompletadaProp?.();
              }}
                  readOnly={auditoria.estado === 'finalizada'}
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
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            FOOTER - SEGÚN ESTÁNDAR WIZARD WORLD CLASS
            ═════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 bg-linear-to-r from-gray-50 to-white border-t-2 border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* ACCIONES PRIMARIAS - SEGÚN ESTÁNDAR */}
            <div className="flex items-center gap-3">

              
              {/* MÉTRICAS EN DESKTOP - SEGÚN ESTÁNDAR: hidden md:block */}
              <div className="text-xs text-gray-600 hidden md:block">
                <strong className="font-black" style={{ color: '#003DA5' }}>
                  {(PESTANAS_BASE.find(p => p.id === activeTab) || PESTANAS_BASE[0])?.label}
                </strong> · 
                <strong className="text-green-600"> {auditoria.progreso.general}% completado</strong> · 
                <strong className="text-orange-600"> {diasRestantes} días restantes</strong>
                {auditoria.estadisticas.totalHallazgos > 0 && (
                  <> · <strong className="text-red-600"> {auditoria.estadisticas.totalHallazgos} hallazgos</strong></>
                )}
              </div>
            </div>

            {/* ACCIONES SECUNDARIAS - SEGÚN ESTÁNDAR */}
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
                className="font-bold text-xs"
                onClick={generarInformePDF}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Generar Informe
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════

function TabGeneral({ auditoria, readOnly }: { auditoria: Auditoria; readOnly?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Resumen ejecutivo */}
      <Card className="p-4 border-l-4 border-l-blue-600">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Resumen Ejecutivo</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-700 mb-0.5">Código</p>
              <p className="text-sm font-bold text-gray-900">{auditoria.codigo}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 mb-0.5">Área Auditable</p>
              <p className="text-sm font-bold text-gray-900">{auditoria.areaAuditable}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 mb-0.5">Tipo</p>
              <Badge className="bg-blue-100 text-blue-700 font-bold">{auditoria.tipo}</Badge>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Responsable del Área</p>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-gray-900">{auditoria.responsableArea.nombre}</p>
              </div>
              <p className="text-xs text-gray-600 mb-2">{auditoria.responsableArea.cargo}</p>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Mail className="w-3 h-3" />
                <span>{auditoria.responsableArea.email}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Equipo Auditor</p>
            <div className="space-y-2">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Award className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-700 font-bold">Líder</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{auditoria.auditorLider.nombre}</p>
              </div>
              {auditoria.equipoAuditores.map((a) => (
                <div key={a.id} className="bg-gray-50 rounded-lg p-2 border">
                  <p className="text-sm font-bold text-gray-900">{a.nombre}</p>
                  <p className="text-xs text-gray-600">{a.rol}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Cronograma */}
      <Card className="p-4 border-l-4 border-l-purple-600">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Cronograma y Plazos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-700">Inicio</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Date(auditoria.cronograma.fechaInicio).toLocaleDateString('es-CO')}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-gray-700">Fin Estimado</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Date(auditoria.cronograma.fechaFin).toLocaleDateString('es-CO')}
            </p>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-gray-700">Duración</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{auditoria.cronograma.duracionDias} días</p>
          </div>

          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-gray-700">Transcurridos</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {auditoria.cronograma.diasTranscurridos} / {auditoria.cronograma.duracionDias}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Avance temporal</span>
            <span className="text-xs font-bold text-gray-900">
              {Math.round((auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div
              className="h-full bg-linear-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(auditoria.cronograma.diasTranscurridos / auditoria.cronograma.duracionDias) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 border-l-4 border-l-red-600 bg-red-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Hallazgos</span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 mb-2">{auditoria.estadisticas.totalHallazgos}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-red-700 font-bold">Críticos</span>
              <span className="font-bold">{auditoria.estadisticas.hallazgosCriticos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600 font-bold">Mayores</span>
              <span className="font-bold">{auditoria.estadisticas.hallazgosMayores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600 font-bold">Menores</span>
              <span className="font-bold">{auditoria.estadisticas.hallazgosMenores}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Documentos</span>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 mb-1">{auditoria.estadisticas.documentosCargados}</p>
          <p className="text-xs text-blue-700 font-bold">archivos en expediente</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-600 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Notificaciones</span>
            <Send className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-gray-900 mb-1">{auditoria.estadisticas.notificacionesEnviadas}</p>
          <p className="text-xs text-green-700 font-bold">enviadas</p>
        </Card>
      </div>

      {/* Progreso por fases */}
      <Card className="p-4 border-l-4 border-l-indigo-600">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Progreso por Fases</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-gray-700">Planeación</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{auditoria.progreso.planeacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-full bg-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${auditoria.progreso.planeacion}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-gray-700">Ejecución</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{auditoria.progreso.ejecucion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-full bg-amber-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${auditoria.progreso.ejecucion}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-gray-700">Comunicación</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{auditoria.progreso.comunicacion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-full bg-green-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${auditoria.progreso.comunicacion}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// TAB 2: PLANEACIÓN
interface TabFaseProps {
  auditoria: Auditoria;
  checklistCompletados?: Record<string, boolean>;
  onToggleChecklist?: (id: string, completado: boolean) => void;
  onComunicacionCompletada?: () => void;
  readOnly?: boolean;
}

function TabPlaneacion({ auditoria, readOnly }: TabFaseProps) {
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
      <SeccionListasChequeoExpediente 
        auditoriaId={auditoria.id} 
        etapaActual="Planeación" 
        readOnly={readOnly}
      />
    </div>
  );
}

// TAB 3: EJECUCIÓN
function TabEjecucion({ auditoria, checklistCompletados, onToggleChecklist, readOnly }: TabFaseProps) {
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
      <Card className="p-3 border-l-4 border-l-amber-600 bg-amber-50">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">Fase de Ejecución</p>
            <p className="text-xs text-amber-700">Reunión apertura, lista de chequeo, reunión cierre, hallazgos</p>
          </div>
        </div>
      </Card>

      {/* 1. REUNIÓN DE APERTURA */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Reunión de Apertura</h3>
              {reunionApertura && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registrado
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {reunionApertura ? `Fecha: ${fechaReunion(reunionApertura)} - ${reunionApertura.modalidad || ''}` : 'Kick-off oficial con el área auditada'}
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAperturaOpen(true)}
              className="font-medium"
            >
              <Users className="w-4 h-4 mr-2" />
              {reunionApertura ? 'Editar Reunión' : 'Registrar Reunión'}
            </Button>
          )}
        </div>
      </div>

      {/* 2. LISTAS DE CHEQUEO DE EJECUCIÓN */}
      <SeccionListasChequeoExpediente 
        auditoriaId={auditoria.id} 
        etapaActual="Ejecución" 
        readOnly={readOnly}
      />

      {/* 3. REUNIÓN DE CIERRE */}
      <div className="bg-white border-2 border-emerald-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Reunión de Cierre</h3>
              {reunionCierre && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registrado
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {reunionCierre ? `Fecha: ${fechaReunion(reunionCierre)} - ${reunionCierre.modalidad || ''}` : 'Cierre con el área auditada y firma de acta'}
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalCierreOpen(true)}
              className="font-medium"
            >
              <Users className="w-4 h-4 mr-2" />
              {reunionCierre ? 'Editar Reunión' : 'Registrar Reunión'}
            </Button>
          )}
        </div>
      </div>

      {/* 4. HALLAZGOS (Preliminar e Identificados) */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-5">
        <SeccionHallazgosExpediente
          auditoriaId={auditoria.id}
          auditoriaNombre={auditoria.nombre || auditoria.codigo}
          permitirTipoPreliminar
        />
      </div>

      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
        <SeccionTareasExpediente auditoriaId={auditoria.id} />
      </div>

      {/* DOCUMENTOS DE EJECUCIÓN (al final) */}

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
function TabComunicacion({ auditoria, onComunicacionCompletada, readOnly }: TabFaseProps) {
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
      
      {/* LISTAS DE CHEQUEO DE COMUNICACIÓN */}
      <SeccionListasChequeoExpediente 
        auditoriaId={auditoria.id} 
        etapaActual="Comunicación" 
        readOnly={readOnly}
      />

      {/* MÓDULO DE COMUNICACIÓN */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-4">
        <ComunicacionAuditoriaModule
          auditoriaId={auditoria.id}
          auditoriaInfo={{ codigo: auditoria.codigo, nombre: auditoria.nombre }}
          estadoAuditoria={auditoria.estado}
          embedded
          onComunicacionCompletada={onComunicacionCompletada}
          readOnly={readOnly}
        />
      </div>
      {/* DOCUMENTOS DE COMUNICACIÓN (al final) */}
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
          auditoriaInfo={{ codigo: auditoria.codigo, nombre: auditoria.nombre }}
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
    try {
      const url = doc.urlPreview.startsWith('http') ? doc.urlPreview : `${window.location.origin}${doc.urlPreview}`;
      const res = await fetch(url, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success('Documento abierto');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al abrir documento');
    }
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
                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      <Badge className="text-xs">{doc.tipo}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                      </span>
                      <span>{doc.size}</span>
                      <span>{doc.cargadoPor}</span>
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
                      >
                        <Eye className="w-3 h-3" />
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
}

/** Tab Finalizada: Preliminar, Final y Ejecutivo se generan por la plataforma. Documento de Cierre se sube en Seguimiento. */
function TabFinalizada({ auditoriaId, auditoria, documentos }: TabFinalizadaProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [planes, setPlanes] = useState<any[]>([]);
  const [hallazgos, setHallazgos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      setLoading(true);
      try {
        const [resCierre, planesData, hallazgosData, planIndData] = await Promise.all([
          controlInternoService.getResumenEjecutivoCierre(auditoriaId).catch(() => null),
          controlInternoService.getPlanesMejoramientoByAuditoria(auditoriaId).catch(() => []),
          controlInternoService.getHallazgosByAuditoria(auditoriaId).catch(() => []),
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
  }, [auditoriaId]);

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
        const d = new Date(fecha);
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
        rol: a.rol || a.cargo || 'Equipo Auditor'
      }));

      // Formatear criterios para evitar [object Object]
      const criteriosFormateados = ((auditoriaCompleta as any).criterios?.length > 0)
        ? (auditoriaCompleta as any).criterios.map((c: any) => c.descripcion || c.nombre || c).join('\n')
        : ((auditoriaCompleta as any).normatividad || planFrescos?.criterios?.map((c: any) => c.descripcion || c.nombre).join('\n') || '');

      const auditoriaParaPdf = {
        ...auditoriaCompleta,
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
