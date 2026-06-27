/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPEDIENTES - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de expedientes digitales por auditoría
 * Cada auditoría = 1 expediente con carpetas organizadas por fase
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * 
 * ✨ Características Premium:
 * - Expediente por cada auditoría (identificado por código)
 * - Carpetas organizadas por fase del proceso
 * - Vista de árbol de documentos
 * - Búsqueda por expediente
 * - Carga masiva de documentos
 * - Integración con auditorías
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, FileText, Upload, Download, Search, Eye,
  ChevronRight, ChevronDown, Plus, Filter, Calendar, User,
  Archive, CheckCircle2, AlertCircle, Clock,
  File, FolderCheck, FileCheck, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

// Servicio API
import { controlInternoService } from '../services/api/controlInternoService';
import { auditoriaCoincideVigenciaPlan } from './services/useAuditoriasKanban';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';
import { notificationsService } from '../../../services/api/notificationsService';

// Design System
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModulOCIG } from './HeaderModuloCIG';
import { ModuleHeaderBar } from './ModuleHeaderBar';
import { usePlanAnualVigenciaContextOptional } from './PlanAnualVigenciaContext';

// ✅ FASE 1 DÍA 3: Componentes responsive
import { Container4K } from '@esap-mfe/shared-ui/container-4k';
import { ResponsiveGrid } from '@esap-mfe/shared-ui/responsive-grid';

// ✅ Descarga de Expedientes en ZIP
import { BotonDescargarExpedienteZip } from './DescargarExpedienteZip';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type FaseAuditoria = 
  | 'PLANIFICACION'
  | 'EJECUCION'
  | 'HALLAZGOS'
  | 'COMUNICACION_RESULTADOS'
  | 'SEGUIMIENTO'
  | 'CIERRE';

interface Documento {
  id: string;
  nombre: string;
  nombreArchivo: string;
  tipo: string;            // tipoDocumento (categoria)
  tipoMime: string;        // application/pdf, image/png, etc.
  tamanio: string;         // formateado para UI
  tamanioBytes: number;    // bytes reales
  fechaCreacion: string;
  autor: string;
  fase: FaseAuditoria;
  rutaArchivo?: string;
  descripcion?: string;
}

// Mapeo de MIME types a etiquetas legibles
const TIPO_MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'image/png': 'Imagen PNG',
  'image/jpeg': 'Imagen JPEG',
  'image/gif': 'Imagen GIF',
  'text/plain': 'Texto',
  'text/csv': 'CSV',
};

function getMimeTypeLabel(mimeType: string): string {
  if (TIPO_MIME_LABELS[mimeType]) return TIPO_MIME_LABELS[mimeType];
  if (mimeType.startsWith('image/')) return 'Imagen';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  return 'Archivo';
}

// Formatear tamaño de archivo
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Obtener URL base para archivos
function getFilesBaseUrl(): string {
  const serviceUrl = getServiceUrl('control-institucional');
  return API_MODE === 'gateway' 
    ? `${serviceUrl}/control-institucional/api/v1`
    : serviceUrl;
}

interface Expediente {
  id: string;
  codigoAuditoria: string;
  nombreAuditoria: string;
  tipoAuditoria: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
  responsable: string;
  totalDocumentos: number;
  documentos: Documento[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE FASES
// ════════════════════════════════════════════════════════════════════════════

const FASES_AUDITORIA = [
  {
    id: 'PLANIFICACION' as FaseAuditoria,
    nombre: 'Planificación',
    descripcion: 'Programa de auditoría, memorando de asignación, alcance',
    color: 'blue',
    icon: FileText
  },
  {
    id: 'EJECUCION' as FaseAuditoria,
    nombre: 'Ejecución',
    descripcion: 'Papeles de trabajo, evidencias, entrevistas',
    color: 'green',
    icon: FolderOpen
  },
  {
    id: 'HALLAZGOS' as FaseAuditoria,
    nombre: 'Hallazgos',
    descripcion: 'Matriz de hallazgos, observaciones, validaciones',
    color: 'orange',
    icon: AlertCircle
  },
  {
    id: 'COMUNICACION_RESULTADOS' as FaseAuditoria,
    nombre: 'Comunicación de Resultados',
    descripcion: 'Informe final, acta de cierre, respuestas',
    color: 'purple',
    icon: FileCheck
  },
  {
    id: 'SEGUIMIENTO' as FaseAuditoria,
    nombre: 'Seguimiento',
    descripcion: 'Planes de mejoramiento, avances, verificaciones',
    color: 'cyan',
    icon: Clock
  },
  {
    id: 'CIERRE' as FaseAuditoria,
    nombre: 'Cierre',
    descripcion: 'Acta de cierre definitivo, certificaciones',
    color: 'gray',
    icon: Archive
  }
];

// ════════════════════════════════════════════════════════════════════════════
// MAPEO DE FASE BACKEND A FRONTEND
// ════════════════════════════════════════════════════════════════════════════

// Mapea los estados del backend a los estados de expediente
function mapEstadoAuditoria(fase: string, estadoKanban?: string): 'ABIERTO' | 'EN_PROCESO' | 'CERRADO' {
  if (estadoKanban === 'Finalizada' || fase === 'CIERRE' || fase === 'cierre') {
    return 'CERRADO';
  }
  if (fase === 'PLANIFICACION' || fase === 'planificacion' || estadoKanban === 'Programa Anual' || estadoKanban === 'Planeación') {
    return 'ABIERTO';
  }
  return 'EN_PROCESO';
}

// Mapea la etapa del documento del backend a FaseAuditoria
function mapEtapaToFase(etapa: string): FaseAuditoria {
  const mapa: Record<string, FaseAuditoria> = {
    'planificacion': 'PLANIFICACION',
    'PLANIFICACION': 'PLANIFICACION',
    'Planeación': 'PLANIFICACION',
    'Programa Anual': 'PLANIFICACION',
    'ejecucion': 'EJECUCION',
    'EJECUCION': 'EJECUCION',
    'Ejecución': 'EJECUCION',
    'hallazgos': 'HALLAZGOS',
    'HALLAZGOS': 'HALLAZGOS',
    'comunicacion': 'COMUNICACION_RESULTADOS',
    'COMUNICACION_RESULTADOS': 'COMUNICACION_RESULTADOS',
    'Comunicación': 'COMUNICACION_RESULTADOS',
    'seguimiento': 'SEGUIMIENTO',
    'SEGUIMIENTO': 'SEGUIMIENTO',
    'Seguimiento': 'SEGUIMIENTO',
    'cierre': 'CIERRE',
    'CIERRE': 'CIERRE',
    'Finalizada': 'CIERRE'
  };
  return mapa[etapa] || 'PLANIFICACION';
}

// Convierte datos del backend a la interfaz Documento
function mapDocumentoBackend(doc: any): Documento {
  const tamanioBytes = doc.tamanio || doc.size || 0;
  return {
    id: doc.id,
    nombre: doc.nombre || doc.nombreArchivo || 'Sin nombre',
    nombreArchivo: doc.nombreArchivo || doc.nombre || 'archivo',
    tipo: doc.tipoDocumento || doc.tipo || 'otro',
    tipoMime: doc.tipoMime || doc.mimeType || 'application/octet-stream',
    tamanio: formatFileSize(tamanioBytes),
    tamanioBytes: tamanioBytes,
    fechaCreacion: doc.fechaCreacion?.split('T')[0] || doc.createdAt?.split('T')[0] || '',
    autor: doc.subidoPor || doc.creadoPor || 'Sistema',
    fase: mapEtapaToFase(doc.etapa || 'PLANIFICACION'),
    rutaArchivo: doc.ruta || doc.rutaArchivo,
    descripcion: doc.descripcion
  };
}

/** Evidencias de hallazgos (evidencia_documento) */
function mapEvidenciaBackend(ev: any): Documento {
  const baseUrl = getFilesBaseUrl();
  const tamanioBytes = Number(ev.tamanioBytes) || 0;
  return {
    id: ev.id,
    nombre: ev.nombre || ev.nombreArchivoOriginal || 'Evidencia',
    nombreArchivo: ev.nombreArchivoOriginal || ev.nombre || 'evidencia',
    tipo: 'evidencia_hallazgo',
    tipoMime: ev.tipoMime || 'application/octet-stream',
    tamanio: formatFileSize(tamanioBytes),
    tamanioBytes,
    fechaCreacion: (ev.fechaSubida || ev.createdAt || '').split('T')[0],
    autor: ev.subidoPor || 'Sistema',
    fase: 'HALLAZGOS',
    rutaArchivo: `${baseUrl}/evidencias/${ev.id}/download`,
    descripcion: ev.descripcion || '📎 Evidencia de hallazgo',
  };
}

// Convierte datos del backend de auditoría a la interfaz Expediente
function mapAuditoriaToExpediente(auditoria: any, documentos: Documento[]): Expediente {
  // ✅ Resolver nombre del responsable (auditorLider puede ser objeto, UUID string, o nombre)
  let nombreResponsable = 'Sin asignar';
  
  if (auditoria.auditorLider) {
    if (typeof auditoria.auditorLider === 'object' && auditoria.auditorLider.nombre) {
      // Caso 1: auditorLider es objeto { nombre, cargo, iniciales }
      nombreResponsable = auditoria.auditorLider.nombre;
    } else if (typeof auditoria.auditorLider === 'string') {
      // Caso 2: auditorLider es string - verificar si es UUID o nombre real
      const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auditoria.auditorLider);
      if (!esUUID) {
        // Es un nombre directo
        nombreResponsable = auditoria.auditorLider;
      }
      // Si es UUID, se queda como 'Sin asignar' y se intenta resolver abajo
    }
  }
  
  // Fallback: intentar otros campos disponibles en el backend
  if (nombreResponsable === 'Sin asignar') {
    if (auditoria.auditorLiderNombre) {
      nombreResponsable = auditoria.auditorLiderNombre;
    } else if (auditoria.responsable && typeof auditoria.responsable === 'string') {
      const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(auditoria.responsable);
      if (!esUUID) {
        nombreResponsable = auditoria.responsable;
      }
    } else if (auditoria.responsableArea?.nombre) {
      nombreResponsable = auditoria.responsableArea.nombre;
    } else if (auditoria.equipoAuditores?.length > 0) {
      const primerAuditor = auditoria.equipoAuditores[0];
      if (typeof primerAuditor === 'object' && primerAuditor.nombre) {
        nombreResponsable = primerAuditor.nombre;
      } else if (typeof primerAuditor === 'string') {
        const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(primerAuditor);
        if (!esUUID) nombreResponsable = primerAuditor;
      }
    }
  }

  return {
    id: auditoria.id,
    codigoAuditoria: auditoria.codigo || `AU-${auditoria.id.slice(0, 8).toUpperCase()}`,
    nombreAuditoria: auditoria.nombre || auditoria.objetivoGeneral || 'Sin nombre',
    tipoAuditoria: auditoria.tipoAuditoria || auditoria.tipo || 'Auditoría',
    fechaInicio: auditoria.fechaInicio?.split('T')[0] || auditoria.createdAt?.split('T')[0] || '',
    fechaFin: auditoria.fechaFin?.split('T')[0],
    estado: mapEstadoAuditoria(auditoria.fase, auditoria.estadoKanban),
    responsable: nombreResponsable,
    totalDocumentos: documentos.length,
    documentos: documentos
  };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ExpedientesModulePremium() {
  const vigenciaCtx = usePlanAnualVigenciaContextOptional();
  const vigenciaActiva = vigenciaCtx?.vigencia;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeaderBar
        title="Expedientes"
        subtitle={`Archivo digital organizado por fases de auditoría${vigenciaActiva ? ` · Vigencia ${vigenciaActiva}` : ''}`}
        icon={<FolderOpen className="w-5 h-5 text-white" />}
        color="#0891B2"
      />

      {/* Contenido directo sin navegación por tabs */}
      <VistaExpedientes />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EXPEDIENTES POR AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

function VistaExpedientes() {
  const vigenciaContext = usePlanAnualVigenciaContextOptional();
  const vigencia = vigenciaContext?.vigencia;
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ABIERTO' | 'EN_PROCESO' | 'CERRADO'>('TODOS');
  const [expedienteExpandido, setExpedienteExpandido] = useState<string | null>(null);
  
  // ✅ Estado para datos reales del backend
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Cargar auditorías del backend
  const cargarExpedientes = useCallback(async () => {
    setCargando(true);
    setError(null);
    
    try {
      // 1. Auditorías de la vigencia del plan anual (mismo criterio que Kanban OCI / Planes)
      const filtrosVigencia =
        vigencia != null
          ? { planAnualVigencia: vigencia, year: vigencia }
          : undefined;
      const auditoriasResp = await controlInternoService.getAuditorias(filtrosVigencia);
      let auditorias = Array.isArray(auditoriasResp) ? auditoriasResp : [];
      if (vigencia != null) {
        auditorias = auditorias.filter((a: any) =>
          auditoriaCoincideVigenciaPlan(a, vigencia),
        );
      }

      // 2. Para cada auditoría, cargar sus documentos
      const expedientesConDocs = await Promise.all(
        auditorias.map(async (auditoria: any) => {
          const documentos: Documento[] = [];

          try {
            const [docsBackend, evidenciasBackend] = await Promise.all([
              controlInternoService.getDocumentosByAuditoria(auditoria.id).catch(() => []),
              controlInternoService.getEvidenciasByAuditoria(auditoria.id).catch(() => []),
            ]);
            const docs = (Array.isArray(docsBackend) ? docsBackend : []).map(mapDocumentoBackend);
            const ids = new Set(docs.map((d) => d.id));
            const evids = (Array.isArray(evidenciasBackend) ? evidenciasBackend : [])
              .map(mapEvidenciaBackend)
              .filter((e) => !ids.has(e.id));
            documentos.push(...docs, ...evids);
          } catch {
            // Si falla el endpoint de docs, continuar sin ellos
          }

          // ✅ Inyectar documento de cierre desde el campo JSONB de la auditoría
          // (no está en la tabla documentos — se guarda aparte en /finalizar)
          const dc = auditoria.documentoCierre || auditoria.documento_cierre;
          if (dc?.url) {
            const baseUrl = getFilesBaseUrl();
            documentos.unshift({
              id: 'doc-cierre-' + auditoria.id,
              nombre: dc.nombre || 'Documento de Cierre',
              nombreArchivo: dc.nombre || 'documento_cierre',
              tipo: 'cierre',
              tipoMime: dc.tipo || 'application/pdf',
              tamanio: dc.tamano ? formatFileSize(dc.tamano) : 'N/A',
              tamanioBytes: dc.tamano || 0,
              fechaCreacion: (dc.fechaCarga || auditoria.fechaFinalizacion || auditoria.updatedAt || '')
                .split('T')[0],
              autor: dc.cargadoPor || auditoria.finalizadaPor || 'Sistema',
              fase: 'CIERRE' as FaseAuditoria,
              rutaArchivo: dc.url?.startsWith('http') ? dc.url : `${baseUrl}${dc.url}`,
              descripcion: `📌 Documento de cierre oficial${auditoria.observacionesCierre ? ': ' + auditoria.observacionesCierre : ''}`,
            });
          }

          return mapAuditoriaToExpediente(auditoria, documentos);
        })
      );
      
      setExpedientes(expedientesConDocs);
    } catch (err: any) {
      console.error('Error cargando expedientes:', err);
      setError(err.message || 'Error al cargar los expedientes');
    } finally {
      setCargando(false);
    }
  }, [vigencia]);

  // Cargar al montar
  useEffect(() => {
    cargarExpedientes();
  }, [cargarExpedientes]);

  const expedientesFiltrados = useMemo(() => {
    let resultado = expedientes;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(exp =>
        exp.codigoAuditoria.toLowerCase().includes(search) ||
        exp.nombreAuditoria.toLowerCase().includes(search)
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(exp => exp.estado === filtroEstado);
    }

    return resultado;
  }, [expedientes, busqueda, filtroEstado]);

  const estadisticas = useMemo(() => {
    const total = expedientes.length;
    const abiertos = expedientes.filter(e => e.estado === 'ABIERTO').length;
    const enProceso = expedientes.filter(e => e.estado === 'EN_PROCESO').length;
    const cerrados = expedientes.filter(e => e.estado === 'CERRADO').length;
    const totalDocs = expedientes.reduce((acc, exp) => acc + exp.totalDocumentos, 0);

    return { total, abiertos, enProceso, cerrados, totalDocs };
  }, [expedientes]);

  return (
    <Container4K className="py-6">
      {/* Dashboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Expedientes por Auditoría</h2>
            <p className="text-[11px] text-gray-500">Cada auditoría tiene su expediente digital organizado por fases</p>
          </div>
        </div>

        {/* KPIs - Alineados con diseño de referencia Auditorías OCI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Folder className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900 leading-none">{estadisticas.total}</p>
              <p className="text-[10px] text-gray-500">Total Expedientes</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-black text-green-700 leading-none">{estadisticas.abiertos}</p>
              <p className="text-[10px] text-gray-500">Abiertos</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-black text-amber-700 leading-none">{estadisticas.enProceso}</p>
              <p className="text-[10px] text-gray-500">En Proceso</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-700 leading-none">{estadisticas.cerrados}</p>
              <p className="text-[10px] text-gray-500">Cerrados</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-black text-purple-700 leading-none">{estadisticas.totalDocs}</p>
              <p className="text-[10px] text-gray-500">Documentos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por código de auditoría o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2">
            <FilterButton
              active={filtroEstado === 'TODOS'}
              onClick={() => setFiltroEstado('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroEstado === 'ABIERTO'}
              onClick={() => setFiltroEstado('ABIERTO')}
              label="Abiertos"
              count={estadisticas.abiertos}
              color="green"
            />
            <FilterButton
              active={filtroEstado === 'EN_PROCESO'}
              onClick={() => setFiltroEstado('EN_PROCESO')}
              label="En Proceso"
              count={estadisticas.enProceso}
              color="yellow"
            />
            <FilterButton
              active={filtroEstado === 'CERRADO'}
              onClick={() => setFiltroEstado('CERRADO')}
              label="Cerrados"
              count={estadisticas.cerrados}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Lista de Expedientes */}
      <div className="space-y-4">
        {/* Estado de carga */}
        {cargando && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#1e5da8] animate-spin mb-4" />
              <p className="text-gray-600">Cargando expedientes...</p>
            </div>
          </div>
        )}

        {/* Estado de error */}
        {error && !cargando && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
            <div className="flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">Error al cargar expedientes</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={cargarExpedientes}
                className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Sin expedientes */}
        {!cargando && !error && expedientesFiltrados.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <Folder className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-900 font-medium mb-2">No hay expedientes</p>
              <p className="text-gray-600 text-sm">
                {busqueda || filtroEstado !== 'TODOS' 
                  ? 'No se encontraron expedientes con los filtros aplicados' 
                  : 'No hay auditorías registradas aún'
                }
              </p>
            </div>
          </div>
        )}

        {/* Lista de expedientes */}
        {!cargando && !error && expedientesFiltrados.map((expediente) => (
          <CardExpediente
            key={expediente.id}
            expediente={expediente}
            expandido={expedienteExpandido === expediente.id}
            onToggleExpand={() => setExpedienteExpandido(
              expedienteExpandido === expediente.id ? null : expediente.id
            )}
            onRefresh={cargarExpedientes}
          />
        ))}
      </div>
    </Container4K>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD EXPEDIENTE
// ════════════════════════════════════════════════════════════════════════════

interface CardExpedienteProps {
  expediente: Expediente;
  expandido: boolean;
  onToggleExpand: () => void;
  onRefresh?: () => void;
}

function CardExpediente({ expediente, expandido, onToggleExpand, onRefresh }: CardExpedienteProps) {
  const [modalCargar, setModalCargar] = useState(false);
  
  const estadoConfig = {
    ABIERTO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Abierto' },
    EN_PROCESO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Proceso' },
    CERRADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cerrado' }
  };

  const config = estadoConfig[expediente.estado];

  // Agrupar documentos por fase
  const documentosPorFase = useMemo(() => {
    const grupos: Record<FaseAuditoria, Documento[]> = {
      PLANIFICACION: [],
      EJECUCION: [],
      HALLAZGOS: [],
      COMUNICACION_RESULTADOS: [],
      SEGUIMIENTO: [],
      CIERRE: []
    };

    expediente.documentos.forEach(doc => {
      grupos[doc.fase].push(doc);
    });

    return grupos;
  }, [expediente.documentos]);

  const handleCargarDocumento = () => {
    setModalCargar(true);
    
    toast.info('Abrir cargador de documentos', {
      description: `Expediente ${expediente.codigoAuditoria}`,
      duration: 2000,
    });

    console.log('📤 Cargar documento al expediente:', {
      expedienteId: expediente.id,
      codigoAuditoria: expediente.codigoAuditoria,
      nombreAuditoria: expediente.nombreAuditoria,
      estado: expediente.estado,
      documentosActuales: expediente.totalDocumentos,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header del Expediente */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] rounded-xl flex items-center justify-center flex-shrink-0">
                <Folder className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg text-gray-900 font-medium">{expediente.codigoAuditoria}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{expediente.nombreAuditoria}</p>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 text-gray-900">{expediente.tipoAuditoria}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <span className="ml-2 text-gray-900">{expediente.responsable}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <span className="ml-2 text-gray-900">{expediente.fechaInicio}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos:</span>
                    <span className="ml-2 text-gray-900 font-medium">{expediente.totalDocumentos}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleCargarDocumento}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Cargar
              </button>
              <BotonDescargarExpedienteZip expediente={expediente} />
              <button
                onClick={onToggleExpand}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
              >
                {expandido ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ocultar Carpetas
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Ver Carpetas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estructura de Carpetas por Fase */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Estructura del Expediente por Fases</h4>

                <div className="space-y-3">
                  {FASES_AUDITORIA.map((fase) => {
                    const docs = documentosPorFase[fase.id];
                    const Icon = fase.icon;

                    return (
                      <CarpetaFase
                        key={fase.id}
                        fase={fase}
                        documentos={docs}
                        icon={<Icon className="w-5 h-5" />}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal Cargar Documento */}
      {modalCargar && (
        <ModalCargarDocumento
          expediente={expediente}
          onClose={() => setModalCargar(false)}
          onCargar={() => {
            setModalCargar(false);
            toast.success('Documento cargado exitosamente');
            // Refrescar la lista para mostrar el nuevo documento
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARPETA FASE
// ════════════════════════════════════════════════════════════════════════════

interface CarpetaFaseProps {
  fase: typeof FASES_AUDITORIA[0];
  documentos: Documento[];
  icon: React.ReactNode;
}

function CarpetaFase({ fase, documentos, icon }: CarpetaFaseProps) {
  const [expandido, setExpandido] = useState(false);
  const [documentoVisualizando, setDocumentoVisualizando] = useState<Documento | null>(null);

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const colorClass = colorClasses[fase.color as keyof typeof colorClasses];

  const handleVerDocumento = (doc: Documento) => {
    setDocumentoVisualizando(doc);
  };

  const handleDescargarDocumento = async (doc: Documento, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseUrl = getFilesBaseUrl();
    const downloadUrl = doc.tipo === 'evidencia_hallazgo'
      ? `${baseUrl}/evidencias/${doc.id}/download`
      : doc.tipo === 'cierre'
        ? (doc.rutaArchivo || '')
        : `${baseUrl}/documentos/${doc.id}/download`;
    if (!downloadUrl) return;
    try {
      const res = await fetch(downloadUrl, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nombre || doc.nombreArchivo || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Descarga iniciada', { description: doc.nombre || doc.nombreArchivo, duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar');
    }
  };

  return (
    <>
      <div className={`rounded-lg border ${colorClass}`}>
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full p-4 flex items-center justify-between hover:bg-opacity-70 transition-all"
        >
          <div className="flex items-center gap-3">
            {expandido ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            <div className="text-left">
              <div className="font-medium text-sm">{fase.nombre}</div>
              <div className="text-xs opacity-80">{fase.descripcion}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-60 rounded">
              {documentos.length} documentos
            </span>
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-current border-opacity-20"
            >
              <div className="p-4 bg-white bg-opacity-50">
                {documentos.length === 0 ? (
                  <div className="text-center py-8 text-sm opacity-60">
                    <File className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No hay documentos en esta fase
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{doc.nombre || doc.nombreArchivo}</div>
                            <div className="text-xs text-gray-600">
                              <span className="text-blue-600 font-medium">{getMimeTypeLabel(doc.tipoMime)}</span>
                              {' • '}{doc.tamanio} • {doc.fechaCreacion} • {doc.autor}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVerDocumento(doc)}
                            className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDescargarDocumento(doc, e)}
                            className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded transition-colors"
                            title="Descargar documento"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Ver Documento */}
      {documentoVisualizando && (
        <ModalVerDocumento
          documento={documentoVisualizando}
          fase={fase}
          onClose={() => setDocumentoVisualizando(null)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'yellow' | 'gray';
}

function FilterButton({ active, onClick, label, count, color = 'gray' }: FilterButtonProps) {
  const colorClasses = {
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoProps {
  expediente: Expediente;
  onClose: () => void;
  onCargar: () => void;
}

function ModalCargarDocumento({ expediente, onClose, onCargar }: ModalCargarDocumentoProps) {
  const [fase, setFase] = useState<FaseAuditoria>('PLANIFICACION');
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      // Auto-completar nombre si está vacío
      if (!nombreDocumento.trim()) {
        setNombreDocumento(file.name.replace(/\.[^/.]+$/, '')); // Sin extensión
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setArchivo(file);
      if (!nombreDocumento.trim()) {
        setNombreDocumento(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCargar = async () => {
    // Validaciones
    if (!archivo) {
      toast.error('Selecciona un archivo para cargar');
      return;
    }
    if (!nombreDocumento.trim()) {
      toast.error('El nombre del documento es obligatorio');
      return;
    }

    setCargando(true);
    setProgreso(0);

    try {
      // Llamar al backend real
      // Convertir fase a minúsculas para el backend
      const etapaBackend = fase.toLowerCase();
      
      await controlInternoService.createDocumento(
        archivo,
        {
          nombre: nombreDocumento.trim(),
          descripcion: descripcion.trim() || undefined,
          tipoDocumento: 'documento_auditoria',
          etapa: etapaBackend,
          auditoriaId: expediente.id,
          subidoPor: expediente.responsable,
        },
        (progress) => setProgreso(progress)
      );

      // 🚀 DISPARAR EVENTO AL BACKEND
      try {
        await notificationsService.triggerEvent('EVT-DOC-001', {
          auditoriaId: expediente.id,
          auditoriaCodigo: expediente.codigoAuditoria,
          tituloCustom: 'Nuevo Documento Cargado',
          mensajeCustom: `Se ha cargado el documento ${nombreDocumento.trim()} en el expediente ${expediente.codigoAuditoria}.`,
          url_accion: '/control-interno/expedientes',
        });
      } catch (e) {
        console.error('Error disparando notificación:', e);
      }

      toast.success('Documento Cargado Exitosamente', {
        description: `${nombreDocumento} agregado a ${FASES_AUDITORIA.find(f => f.id === fase)?.nombre}`,
        duration: 4000,
      });

      onCargar();
    } catch (error: any) {
      console.error('Error al cargar documento:', error);
      toast.error('Error al cargar el documento', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Cargar Documento al Expediente</h3>
          <p className="text-sm text-blue-100 mt-1">{expediente.codigoAuditoria} - {expediente.nombreAuditoria}</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información del Expediente */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Expediente:</span>
                  <span className="ml-2 text-blue-900">{expediente.codigoAuditoria}</span>
                </div>
                <span className="text-blue-400">•</span>
                <div>
                  <span className="text-blue-700 font-medium">Estado:</span>
                  <span className="ml-2 text-blue-900">{expediente.estado}</span>
                </div>
                <span className="text-blue-400">•</span>
                <div>
                  <span className="text-blue-700 font-medium">Docs actuales:</span>
                  <span className="ml-2 text-blue-900 font-semibold">{expediente.totalDocumentos}</span>
                </div>
              </div>
            </div>

            {/* Selección de Fase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fase del Proceso <span className="text-red-500">*</span>
              </label>
              <select
                value={fase}
                onChange={(e) => setFase(e.target.value as FaseAuditoria)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              >
                {FASES_AUDITORIA.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nombre} - {f.descripcion}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecciona la fase a la que pertenece este documento
              </p>
            </div>

            {/* Nombre del Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombreDocumento}
                onChange={(e) => setNombreDocumento(e.target.value)}
                placeholder="Ej: Programa de Auditoría AU-2025-001.pdf"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción / Notas
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Información adicional sobre este documento (opcional)"
              />
            </div>

            {/* Selector de Archivo REAL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.csv"
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  archivo 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-[#1e5da8]'
                }`}
              >
                {archivo ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCheck className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm text-gray-900 font-medium">{archivo.name}</p>
                      <p className="text-xs text-gray-600">{formatFileSize(archivo.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchivo(null);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Haz clic para seleccionar o arrastra el archivo aquí
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, Word, Excel, PowerPoint, imágenes - hasta 50MB
                    </p>
                  </>
                )}
              </div>
              
              {/* Barra de progreso */}
              {cargando && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Subiendo archivo...</span>
                    <span>{progreso}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#1e5da8] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              disabled={cargando || !archivo}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar Documento
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VER DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVerDocumentoProps {
  documento: Documento;
  fase: typeof FASES_AUDITORIA[0];
  onClose: () => void;
}

function ModalVerDocumento({ documento, fase, onClose }: ModalVerDocumentoProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = getFilesBaseUrl();
  const previewUrl = documento.tipo === 'evidencia_hallazgo'
    ? `${baseUrl}/evidencias/${documento.id}/preview`
    : documento.tipo === 'cierre'
      ? (documento.rutaArchivo || '')
      : `${baseUrl}/documentos/${documento.id}/preview`;
  const downloadUrl = documento.tipo === 'evidencia_hallazgo'
    ? `${baseUrl}/evidencias/${documento.id}/download`
    : documento.tipo === 'cierre'
      ? (documento.rutaArchivo || '')
      : `${baseUrl}/documentos/${documento.id}/download`;

  const tipoMime = documento.tipoMime || 'application/octet-stream';
  const canPreview = tipoMime.startsWith('application/pdf') ||
                     tipoMime.startsWith('image/');

  const isOfficeDoc = tipoMime.includes('word') ||
                      tipoMime.includes('excel') ||
                      tipoMime.includes('spreadsheet') ||
                      tipoMime.includes('powerpoint') ||
                      tipoMime.includes('presentation');

  const handleDownload = async () => {
    try {
      const res = await fetch(downloadUrl, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = documento.nombre || documento.nombreArchivo || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Descarga iniciada', { description: documento.nombre || documento.nombreArchivo, duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar');
    }
  };

  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl z-10 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-medium">Vista Previa del Documento</h3>
              <p className="text-sm text-blue-100 mt-1">{documento.nombre || documento.nombreArchivo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info del documento */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-600">Fase:</span>
              <span className="ml-2 text-gray-900 font-medium">{fase.nombre}</span>
            </div>
            <div>
              <span className="text-gray-600">Tipo:</span>
              <span className="ml-2 text-gray-900 font-medium">{getMimeTypeLabel(tipoMime)}</span>
            </div>
            <div>
              <span className="text-gray-600">Tamaño:</span>
              <span className="ml-2 text-gray-900 font-medium">{documento.tamanio}</span>
            </div>
            <div>
              <span className="text-gray-600">Fecha:</span>
              <span className="ml-2 text-gray-900 font-medium">{documento.fechaCreacion}</span>
            </div>
            {documento.autor && (
              <div>
                <span className="text-gray-600">Autor:</span>
                <span className="ml-2 text-gray-900 font-medium">{documento.autor}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vista Previa */}
        <div className="flex-1 overflow-hidden min-h-[500px]">
          {canPreview ? (
            // PDF o Imagen: usar iframe/embed
            <div className="w-full h-full relative">
              {cargando && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-[#1e5da8] mx-auto animate-spin mb-2" />
                    <p className="text-sm text-gray-600">Cargando documento...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center p-6">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-700 mb-4">{error}</p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-colors text-sm"
                    >
                      Descargar archivo
                    </button>
                  </div>
                </div>
              )}
              {tipoMime.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={documento.nombre}
                  className="w-full h-full object-contain p-4"
                  onLoad={() => setCargando(false)}
                  onError={() => {
                    setCargando(false);
                    setError('No se pudo cargar la imagen');
                  }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  onLoad={() => setCargando(false)}
                  onError={() => {
                    setCargando(false);
                    setError('No se pudo cargar el documento');
                  }}
                  title={`Vista previa: ${documento.nombre}`}
                />
              )}
            </div>
          ) : isOfficeDoc ? (
            // Archivos Office: mostrar info y opciones
            <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
              <FileText className="w-20 h-20 text-[#1e5da8] mb-4" />
              <h4 className="text-lg text-gray-900 font-medium mb-2">
                Documento de {getMimeTypeLabel(tipoMime)}
              </h4>
              <p className="text-sm text-amber-700 font-medium mb-6 text-center max-w-md">
                Este tipo de archivo no se puede previsualizar. Descárguelo para abrirlo con la aplicación correspondiente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
            </div>
          ) : (
            // Otros archivos: solo descargar
            <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
              <File className="w-20 h-20 text-gray-400 mb-4" />
              <h4 className="text-lg text-gray-900 font-medium mb-2">
                {getMimeTypeLabel(tipoMime)}
              </h4>
              <p className="text-sm text-amber-700 font-medium mb-6 text-center max-w-md">
                Este tipo no se puede visualizar. Descargue el archivo para verlo.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-colors text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar archivo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              ID: {documento.id}
            </div>
            <div className="flex gap-3">
              {canPreview && (
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Abrir en nueva pestaña
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BOTÓN DESCARGAR ZIP - Importado desde DescargarExpedienteZip.tsx
// ════════════════════════════════════════════════════════════════════════════
// El componente BotonDescargarExpedienteZip está importado arriba ↑