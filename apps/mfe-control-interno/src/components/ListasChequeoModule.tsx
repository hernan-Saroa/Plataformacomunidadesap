/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LISTAS DE CHEQUEO - MÓDULO COMPLETO ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema completo de gestión de listas de chequeo vinculadas al Kanban.
 * 
 * FUNCIONALIDADES:
 * ✅ Biblioteca de Documentos: Repositorio de plantillas y documentos oficiales
 * ✅ Gestión de Listas de Chequeo: Crear, editar, eliminar listas
 * ✅ Vinculación con Kanban: Asociar listas a etapas (Planeación, Ejecución, etc.)
 * ✅ Adjuntar Documentos: Vincular plantillas de la biblioteca a cada lista
 * ✅ Múltiples listas por tarea/etapa
 * ✅ Seguimiento de completitud
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, Download, Trash2, Edit2, Plus, CheckSquare,
  FolderOpen, File, CheckCircle2, Clock, AlertCircle, Search,
  Filter, X, Save, Paperclip, List, Calendar, Users, Eye, ChevronDown, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { HeaderModulOCIG } from './HeaderModuloCIG';
import { ModuleHeaderBar } from './ModuleHeaderBar';
import { usePlanAnualVigenciaContextOptional } from './PlanAnualVigenciaContext';
import { controlInternoService, ListaChequeo as ListaChequeoService } from '../services/api/controlInternoService';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';
import { useConfiguracionKanban } from './services/useConfiguracionKanban';
import { useAuth } from '../../../hooks/useAuth';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE URLs PARA DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la URL base para documentos del backend
 * En modo gateway: {api-gateway}/control-institucional/api/v1/documentos
 * En modo direct (desarrollo local): http://localhost:3007/documentos
 */
const getDocumentosBaseUrl = () => {
  if (API_MODE === 'gateway') {
    return `${getServiceUrl('control-institucional')}/control-institucional/api/v1/documentos`;
  }
  // En modo direct, usar URL directa al microservicio
  return `${getServiceUrl('control-institucional')}/documentos`;
};

const resolveDocumentoUrl = (rawUrl?: string | null): string => {
  if (!rawUrl) return '';
  if (/^(https?:|blob:|data:)/i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith('/control-institucional/api/v1/')) {
    return `${getServiceUrl('control-institucional')}${rawUrl}`;
  }
  if (rawUrl.startsWith('/services/control-institucional/api/v1/')) {
    return `${getServiceUrl('control-institucional')}${rawUrl.replace(/^\/services/, '')}`;
  }
  return `${window.location.origin}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
};

const getDocumentoFileHeaders = (): HeadersInit => ({
  ...getDefaultHeaders(),
  Accept: 'application/pdf,image/*,application/octet-stream',
});

/**
 * Formatea bytes a KB/MB/GB legible
 */
const formatFileSize = (bytes: number | string): string => {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Obtiene etiqueta legible del tipo MIME
 */
const getMimeTypeLabel = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'text/plain': 'TXT',
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR'
  };
  return mimeMap[mimeType] || mimeType?.split('/')[1]?.toUpperCase() || 'FILE';
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/** Excluye registros legacy sin vigencia y los de otro año */
function filtrarRegistrosPorVigencia<T extends Record<string, unknown>>(
  items: T[],
  vigencia: number,
): T[] {
  return items.filter((item) => {
    const v = item.planAnualVigencia ?? item.plan_anual_vigencia;
    if (v == null || v === '') return false;
    return Number(v) === vigencia;
  });
}

type EtapaKanban = 'PLANEACION' | 'EJECUCION' | 'COMUNICACION' | 'SEGUIMIENTO' | 'CIERRE';

type CategoriaDocumento = 'PLANTILLA' | 'OFICIO' | 'ACTA' | 'LISTA_CHEQUEO' | 'INFORME' | 'EVIDENCIA' | 'FORMATO' | 'GUIA' | 'OTRO';

interface DocumentoBiblioteca {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaDocumento;
  /** ✅ Nombre dinámico de la etapa (puede ser cualquier nombre personalizado) */
  etapaKanban?: string;
  /** ID de etapa_kanban - estable aunque cambie el nombre */
  etapaKanbanId?: string;
  /** Nombre de la etapa al momento de guardar (snapshot) */
  etapaNombreKanban?: string;
  auditoriaId?: string | null; // Auditoría asociada (opcional)
  archivoUrl: string;
  urlPreview: string;  // URL del endpoint /documentos/{id}/preview
  urlDownload: string; // URL del endpoint /documentos/{id}/download
  fechaSubida: string;
  subidoPor: string;
  tamano: string;
  extension: string;
  tipoMime: string;    // MIME type real del archivo
  nombreArchivo: string; // Nombre original del archivo con extensión
  descargas: number;
  file?: File;
}

interface ItemChequeo {
  id: string;
  texto: string;
  completado: boolean;
  responsable?: string;
  fechaCompletado?: string;
  observaciones?: string;
  // ✅ PLANTILLA ASOCIADA (OPCIONAL)
  plantillaAsociada?: {
    documentoBibliotecaId: string;
    nombreDocumento: string;
  };
}

interface DocumentoAdjunto {
  documentoBibliotecaId: string;
  nombreDocumento: string;
  diligenciado: boolean;
  archivoSubidoUrl?: string;
  fechaSubida?: string;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  descripcion: string;
  /** ✅ Nombre dinámico de la etapa (puede ser cualquier nombre personalizado) */
  etapaKanban: string;
  /** ✅ ID de la etapa (UUID) - Estable aunque cambie el nombre */
  etapaKanbanId?: string;
  /** ✅ Nombre de la etapa al momento de guardar (snapshot) */
  etapaNombreKanban?: string;
  items: ItemChequeo[];
  documentosAdjuntos: DocumentoAdjunto[]; // Plantillas necesarias (opcional)
  creadoPor: string;
  fechaCreacion: string;
  ultimaModificacion: string;
  completitud: number; // 0-100%
  activa: boolean;
  // ✅ VINCULACIÓN DIRECTA CON AUDITORÍAS OCI
  auditoriaId?: string; // ID de la auditoría a la que pertenece esta lista
  auditoriaCodigoNombre?: string; // Código y nombre legible (ej: "AUD-2026-001 - Auditoría Contabilidad")
  fasesImpactadas?: {
    planeacion: boolean; // Impacta fase de Planeación
    ejecucion: boolean; // Impacta fase de Ejecución
    comunicacion: boolean; // Impacta fase de Comunicación
    seguimiento: boolean; // Impacta fase de Seguimiento
  };
  // ✅ COMPATIBILIDAD BACKEND: Campos booleanos para fases
  fasePlaneacion?: boolean;
  faseEjecucion?: boolean;
  faseComunicacion?: boolean;
  faseSeguimiento?: boolean;
  // ✅ CAMPOS PARA GESTIÓN DOCUMENTAL (LEGACY - mantener compatibilidad)
  etapaProceso?: string; // Etapa del proceso donde se usa esta lista
  auditoriaAsignada?: string; // Auditoría específica asignada
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES - ETAPAS DEL KANBAN DE AUDITORÍAS OCID (DEPRECATED - usar hook)
// ════════════════════════════════════════════════════════════════════════════

// ✅ NOTA: Esta constante se mantiene como fallback, pero se recomienda usar
// las etapas cargadas dinámicamente desde el hook useConfiguracionKanban
const ETAPAS_KANBAN_AUDITORIA_FALLBACK = [
  { value: 'Planeación', label: 'Planeación' },
  { value: 'Ejecución', label: 'Ejecución' },
  { value: 'Comunicación', label: 'Comunicación' }
] as const;

/** Normaliza para comparar etiquetas de etapa Kanban / estado auditoría */
function normalizarEtapaTexto(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Plantilla de biblioteca aplicable a la etapa seleccionada (por UUID o nombre) */
function documentoAplicaEtapa(
  doc: DocumentoBiblioteca,
  etapaId: string,
  etapas: { value: string; label: string }[],
): boolean {
  if (!etapaId) return true;
  if (doc.etapaKanbanId && doc.etapaKanbanId === etapaId) return true;
  const etapaSel = etapas.find((e) => e.value === etapaId);
  const nombreFiltro = normalizarEtapaTexto(etapaSel?.label || '');
  if (!nombreFiltro) return true;
  const candidatos = [doc.etapaNombreKanban, doc.etapaKanban].filter(Boolean) as string[];
  return candidatos.some((nombre) => {
    const n = normalizarEtapaTexto(nombre);
    return (
      n === nombreFiltro ||
      n.includes(nombreFiltro) ||
      nombreFiltro.includes(n)
    );
  });
}

/** Solo Planeación, Ejecución, Comunicación (listas de chequeo no aplican a Plan Anual, Seguimiento ni Finalizada) */
function esNombreEtapaListaChequeoCore(nombre: string): boolean {
  const n = normalizarEtapaTexto(nombre);
  return n.includes('planeac') || n.includes('planificac') || n.includes('ejecuc') || n.includes('comunicac');
}

function filtrarEtapasListaChequeo(
  etapas: { value: string; label: string }[],
): { value: string; label: string }[] {
  return etapas.filter((e) => esNombreEtapaListaChequeoCore(e.label));
}

function buildEtapasListaChequeo(
  etapasDisponibles?: { value: string; label: string }[],
): { value: string; label: string }[] {
  const base =
    etapasDisponibles && etapasDisponibles.length > 0
      ? etapasDisponibles
      : ETAPAS_KANBAN_AUDITORIA_FALLBACK.map((e) => ({
          value: String(e.value),
          label: e.label,
        }));
  const filtradas = filtrarEtapasListaChequeo(base);
  return filtradas.length > 0 ? filtradas : base;
}

function estadoAuditoriaOCIG(aud: any): string {
  return String(aud?.estado ?? aud?.estadoKanban ?? '').trim();
}

function auditoriaPermiteListaChequeo(aud: any): boolean {
  return esNombreEtapaListaChequeoCore(estadoAuditoriaOCIG(aud));
}

function resolverEtapaOpcionParaAuditoria(
  etapasListaChequeo: { value: string; label: string }[],
  estadoAuditoria: string,
): { value: string; label: string } | undefined {
  if (!estadoAuditoria) return undefined;
  return etapasListaChequeo.find(
    (e) => normalizarEtapaTexto(e.label) === normalizarEtapaTexto(estadoAuditoria),
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAPEADORES API -> UI
// ════════════════════════════════════════════════════════════════════════════

const mapApiTipoToCategoria = (tipo?: string): CategoriaDocumento => {
  const t = (tipo || '').toString().trim().toUpperCase();
  if (t.includes('OFICIO')) return 'OFICIO';
  if (t.includes('ACTA')) return 'ACTA';
  if (t.includes('LISTA')) return 'LISTA_CHEQUEO';
  if (t.includes('INFORME')) return 'INFORME';
  if (t.includes('EVIDENCIA')) return 'EVIDENCIA';
  if (t.includes('FORMATO')) return 'FORMATO';
  if (t.includes('GUIA')) return 'GUIA';
  if (t.includes('PLANTILLA')) return 'PLANTILLA';
  return 'OTRO';
};

const mapCategoriaToApiTipo = (categoria: CategoriaDocumento): string => {
  switch (categoria) {
    case 'PLANTILLA':
      return 'plantilla';
    case 'OFICIO':
      return 'oficio';
    case 'ACTA':
      return 'acta';
    case 'LISTA_CHEQUEO':
      return 'lista_chequeo';
    case 'INFORME':
      return 'informe';
    case 'EVIDENCIA':
      return 'evidencia';
    case 'FORMATO':
      return 'formato';
    case 'GUIA':
      return 'guia';
    default:
      return 'otro';
  }
};

const mapApiDocumentoToBiblioteca = (doc: any): DocumentoBiblioteca => {
  const fecha = doc?.createdAt || doc?.fechaSubida || new Date().toISOString();
  const nombre = doc?.nombre || doc?.titulo || 'Documento sin nombre';
  const descripcion = doc?.descripcion || '';
  const tipo = doc?.tipoDocumento || doc?.tipo || doc?.categoria || '';
  const tipoMime = doc?.tipoMime || doc?.mimeType || 'application/octet-stream';
  const nombreArchivo = doc?.nombreArchivo || nombre;
  const docId = doc?.id || `doc-${Date.now()}`;
  
  // Construir URLs reales del backend para preview/download
  const baseUrl = getDocumentosBaseUrl();
  const urlPreview = `${baseUrl}/${docId}/preview`;
  const urlDownload = `${baseUrl}/${docId}/download`;
  
  // Extraer extensión del tipoMime o del nombreArchivo
  const ext = getMimeTypeLabel(tipoMime);
  
  // Formatear tamaño desde tamanioBytes
  const tamano = doc?.tamanioBytes 
    ? formatFileSize(doc.tamanioBytes)
    : doc?.tamano || doc?.fileSizeFormatted || 'N/A';
  
  // ✅ NO MAPEAR NADA - Las etapas son dinámicas y vienen del backend
  // Solo tomar los valores que vienen del backend directamente
  const etapaKanban = doc?.etapaNombreKanban || doc?.etapa_kanban_nombre || undefined;
  const etapaNombreKanban = doc?.etapaNombreKanban || doc?.etapa_kanban_nombre || undefined;
  
  return {
    id: docId,
    nombre,
    descripcion,
    categoria: mapApiTipoToCategoria(tipo),
    etapaKanban,
    etapaKanbanId: doc?.etapaKanbanId || doc?.etapa_kanban_id || undefined,
    etapaNombreKanban,
    auditoriaId: doc?.auditoriaId ?? doc?.auditoria_id ?? doc?.visibleAuditoriaId ?? doc?.visible_auditoria_id ?? null,
    archivoUrl: doc?.archivoUrl || doc?.url || doc?.fileUrl || doc?.rutaArchivo || '#',
    urlPreview,
    urlDownload,
    fechaSubida: typeof fecha === 'string' ? fecha : new Date(fecha).toISOString(),
    subidoPor: doc?.subidoPor || doc?.createdBy || doc?.usuario || 'Sistema',
    tamano,
    extension: ext,
    tipoMime,
    nombreArchivo,
    descargas: Number(doc?.descargas || doc?.downloads || 0)
  };
};

const mapApiListaToUI = (lista: any): ListaChequeo => {
  const items = Array.isArray(lista?.items)
    ? lista.items.map((it: any) => ({
        id: it?.id || `item-${Date.now()}`,
        texto: it?.texto || it?.pregunta || '',
        completado: it?.completado || false,
        responsable: it?.responsable || undefined,
        fechaCompletado: it?.fechaCompletado || undefined,
        observaciones: it?.observaciones || undefined,
        plantillaAsociada: (it?.documentoBibliotecaId || it?.plantillaAsociadaId)
          ? {
              documentoBibliotecaId: it.documentoBibliotecaId || it.plantillaAsociadaId,
              nombreDocumento: it.documentoNombre || it.nombreDocumento || it.plantillaNombre || ''
            }
          : undefined
      }))
    : [];
  
  // ✅ NO MAPEAR - Usar directamente el nombre de la etapa que viene del backend
  // PRIORIDAD: etapaNombreKanban (nombre real guardado) > tipo (para compatibilidad legacy)
  const etapa = lista?.etapaNombreKanban || lista?.tipo || 'Sin etapa';

  // ✅ Reconstruir fasesImpactadas desde los campos del backend
  // Si el backend tiene los campos específicos de fase, usarlos; si no, inferir del tipo
  const tipoLower = (lista?.tipo || '').toLowerCase();
  const fasesImpactadas = {
    planeacion: lista?.fasePlaneacion ?? (tipoLower === 'planeacion'),
    ejecucion: lista?.faseEjecucion ?? (tipoLower === 'ejecucion'),
    comunicacion: lista?.faseComunicacion ?? (tipoLower === 'comunicacion'),
    seguimiento: lista?.faseSeguimiento ?? (tipoLower === 'seguimiento')
  };

  return {
    id: lista?.id || `lista-${Date.now()}`,
    nombre: lista?.nombre || 'Lista sin nombre',
    descripcion: lista?.descripcion || '',
    etapaKanban: etapa,
    items,
    documentosAdjuntos: lista?.documentosAdjuntos || [],
    creadoPor: lista?.creadoPor || lista?.createdBy || 'Sistema',
    fechaCreacion: lista?.createdAt || lista?.fechaCreacion || new Date().toISOString(),
    ultimaModificacion: lista?.updatedAt || lista?.ultimaModificacion || new Date().toISOString(),
    completitud: lista?.completitud || lista?.cumplimiento || (items.length > 0 ? Math.round(items.filter((i: any) => i.completado).length / items.length * 100) : 0),
    activa: lista?.activa !== false,
    auditoriaId: lista?.auditoriaId,
    auditoriaCodigoNombre: lista?.nombreAuditoria || lista?.auditoriaCodigoNombre,
    fasesImpactadas,
    // ✅ PRESERVAR ID y nombre de etapa kanban del backend
    etapaKanbanId: lista?.etapaKanbanId,
    etapaNombreKanban: lista?.etapaNombreKanban,
    // ✅ PRESERVAR campos booleanos de fases (para compatibilidad backend)
    fasePlaneacion: lista?.fasePlaneacion,
    faseEjecucion: lista?.faseEjecucion,
    faseComunicacion: lista?.faseComunicacion,
    faseSeguimiento: lista?.faseSeguimiento,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

type TabActiva = 'BIBLIOTECA' | 'LISTAS_CHEQUEO';

export interface ListasChequeoModuleProps {
  /** Tab activo (modo controlado desde padre) */
  tabActiva?: TabActiva;
  /** Callback cuando cambia el tab (modo controlado) */
  onTabChange?: (tab: TabActiva) => void;
  /** @deprecated usar tabActiva/onTabChange */
  tabInicial?: TabActiva;
  /** Auditoría a enfocar (filtrar listas aplicadas a esta auditoría) */
  auditoriaIdFoco?: string;
  /** Llamar cuando la navegación programática ya fue aplicada */
  onNavegacionAplicada?: () => void;
}

export function ListasChequeoModule({ tabActiva: tabActivaProp, onTabChange, tabInicial, auditoriaIdFoco, onNavegacionAplicada }: ListasChequeoModuleProps = {}) {
  const vigenciaCtx = usePlanAnualVigenciaContextOptional();
  const vigenciaPlan = vigenciaCtx?.vigencia ?? new Date().getFullYear();
  const planAnualId = vigenciaCtx?.planActivoId ?? undefined;

  const [tabActivaInterno, setTabActivaInterno] = useState<TabActiva>('BIBLIOTECA');
  const esControlado = tabActivaProp !== undefined && onTabChange !== undefined;
  const tabActiva = esControlado ? tabActivaProp : tabActivaInterno;
  const setTabActiva = esControlado ? onTabChange : setTabActivaInterno;

  useEffect(() => { onNavegacionAplicada?.(); }, []);
  const [documentosBiblioteca, setDocumentosBiblioteca] = useState<DocumentoBiblioteca[]>([]);
  const [listasBackend, setListasBackend] = useState<ListaChequeo[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ✅ CARGAR ETAPAS DINÁMICAS DESDE CONFIGURACIÓN
  const { etapas: etapasKanban, loading: loadingEtapas } = useConfiguracionKanban();
  
  // ✅ Etapas permitidas para listas de chequeo: solo Planeación, Ejecución, Comunicación
  const etapasParaListas = useMemo(() => {
    const mapped = etapasKanban.map((etapa) => ({
      value: etapa.id,
      label: etapa.nombre,
    }));
    return buildEtapasListaChequeo(mapped);
  }, [etapasKanban]);

  useEffect(() => {
    let cancelled = false;
    const cargarDatos = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const filtrosVigencia = { planAnualVigencia: vigenciaPlan };
        const [docsApi, listasApi, auditoriasApi] = await Promise.all([
          controlInternoService.getDocumentos({
            bibliotecaOnly: true,
            ...filtrosVigencia,
          }),
          controlInternoService.getListasChequeo(filtrosVigencia),
          controlInternoService.getAuditorias({
            year: vigenciaPlan,
            light: true,
            activasOnly: true,
          }),
        ]);
        if (cancelled) return;

        const docsFiltrados = Array.isArray(docsApi)
          ? filtrarRegistrosPorVigencia(docsApi, vigenciaPlan)
          : [];
        setDocumentosBiblioteca(docsFiltrados.map(mapApiDocumentoToBiblioteca));

        const listasFiltradas = Array.isArray(listasApi)
          ? filtrarRegistrosPorVigencia(listasApi, vigenciaPlan)
          : [];
        setListasBackend(listasFiltradas.map(mapApiListaToUI));
        if (Array.isArray(auditoriasApi)) {
          setAuditorias(auditoriasApi);
        } else {
          setAuditorias([]);
        }
      } catch (error) {
        console.error('Error cargando biblioteca/listas desde backend:', error);
        setDocumentosBiblioteca([]);
        setListasBackend([]);
        setAuditorias([]);
        setLoadError('No se pudieron cargar los datos desde el backend.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    cargarDatos();
    return () => {
      cancelled = true;
    };
  }, [vigenciaPlan, planAnualId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeaderBar
        title="Biblioteca"
        subtitle="Plantillas, requisitos y documentos oficiales"
        icon={<FileText className="w-5 h-5 text-white" />}
        color="#6366F1"
      />

      <div className="p-3">
        {/* Tabs - en el área de contenido */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
            <button
              onClick={() => setTabActiva('BIBLIOTECA')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                tabActiva === 'BIBLIOTECA' ? 'bg-[#1e5da8] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Biblioteca de Plantillas
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'BIBLIOTECA' ? 'bg-white/20' : 'bg-gray-200'
              }`}>{documentosBiblioteca.length}</span>
            </button>
            <button
              onClick={() => setTabActiva('LISTAS_CHEQUEO')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                tabActiva === 'LISTAS_CHEQUEO' ? 'bg-[#1e5da8] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Listas de Chequeo
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'LISTAS_CHEQUEO' ? 'bg-white/20' : 'bg-gray-200'
              }`}>{listasBackend.length}</span>
            </button>
          </div>
        </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tabActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tabActiva === 'BIBLIOTECA' && (
            <BibliotecaDocumentos 
              documentos={documentosBiblioteca}
              setDocumentos={setDocumentosBiblioteca}
              auditorias={auditorias}
              isLoading={isLoading}
              loadError={loadError}
              etapasDisponibles={etapasParaListas}
              planAnualVigencia={vigenciaPlan}
              planAnualId={planAnualId}
            />
          )}
          {tabActiva === 'LISTAS_CHEQUEO' && (
            <GestionListasChequeo 
              documentosBiblioteca={documentosBiblioteca}
              etapasDisponibles={etapasParaListas}
              auditorias={auditorias}
              listasIniciales={listasBackend}
              isLoading={isLoading}
              loadError={loadError}
              auditoriaIdFoco={auditoriaIdFoco}
              planAnualVigencia={vigenciaPlan}
              planAnualId={planAnualId}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: BIBLIOTECA DE DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

interface BibliotecaDocumentosProps {
  documentos: DocumentoBiblioteca[];
  setDocumentos: React.Dispatch<React.SetStateAction<DocumentoBiblioteca[]>>;
  auditorias?: any[];
  isLoading: boolean;
  loadError: string | null;
  /** Etapas dinámicas desde configuración Kanban */
  etapasDisponibles?: { value: string; label: string }[];
  planAnualVigencia?: number;
  planAnualId?: string;
}

const ETAPAS_ORDEN: EtapaKanban[] = ['PLANEACION', 'EJECUCION', 'COMUNICACION', 'SEGUIMIENTO', 'CIERRE'];
const ETAPA_LABEL: Record<string, string> = {
  PLANEACION: 'Planeación',
  EJECUCION: 'Ejecución',
  COMUNICACION: 'Comunicación',
  SEGUIMIENTO: 'Seguimiento',
  CIERRE: 'Cierre',
};

function BibliotecaDocumentos({
  documentos,
  setDocumentos,
  auditorias = [],
  isLoading,
  loadError,
  etapasDisponibles,
  planAnualVigencia,
  planAnualId,
}: BibliotecaDocumentosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODOS');
  const [mostrarModalSubir, setMostrarModalSubir] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<DocumentoBiblioteca | null>(null);
  const [documentoEliminar, setDocumentoEliminar] = useState<DocumentoBiblioteca | null>(null);
  const [documentoAEditar, setDocumentoAEditar] = useState<DocumentoBiblioteca | null>(null);
  const sinDatosBackend = documentos.length === 0 && busqueda.trim() === '' && filtroCategoria === 'TODOS' && filtroEtapa === 'TODOS';

  // ✅ ETAPAS DINÁMICAS: No usar mapeos hardcodeados
  const etapasActivas: { value: string; label: string }[] = (etapasDisponibles && etapasDisponibles.length > 0) ? etapasDisponibles : [...ETAPAS_KANBAN_AUDITORIA_FALLBACK];

  const documentosFiltrados = documentos.filter(doc => {
    const q = busqueda.toLowerCase();
    const nombreSafe = (doc.nombre ?? '').toLowerCase();
    const descSafe = (doc.descripcion ?? '').toLowerCase();
    const cumpleBusqueda = nombreSafe.includes(q) || descSafe.includes(q);
    const cumpleCategoria = filtroCategoria === 'TODOS' || doc.categoria === filtroCategoria;
    
    // ✅ FILTRAR POR UUID DE ETAPA O POR NOMBRE (para compatibilidad)
    const cumpleEtapa = filtroEtapa === 'TODOS' ||
      doc.etapaKanbanId === filtroEtapa ||
      doc.etapaNombreKanban === etapasActivas.find(e => e.value === filtroEtapa)?.label ||
      doc.etapaKanban === etapasActivas.find(e => e.value === filtroEtapa)?.label;
    
    return cumpleBusqueda && cumpleCategoria && cumpleEtapa;
  });

  // ✅ AGRUPAR POR ETAPAS DINÁMICAS USANDO UUID
  const documentosPorEtapa = etapasActivas.reduce((acc, etapa) => {
    const etapaId = etapa.value; // UUID
    const etapaLabel = etapa.label; // Nombre actual
    
    // Buscar documentos que pertenecen a esta etapa (por ID o por nombre)
    const docs = documentosFiltrados.filter(d =>
      d.etapaKanbanId === etapaId ||
      d.etapaNombreKanban === etapaLabel ||
      d.etapaKanban === etapaLabel
    );
    
    if (docs.length > 0) {
      acc.push({ etapa: etapaId, label: etapaLabel, docs });
    }
    return acc;
  }, [] as { etapa: string; label: string; docs: DocumentoBiblioteca[] }[]);
  
  // ✅ DOCUMENTOS SIN ETAPA O CON ETAPA NO RECONOCIDA
  const etapasIdsSet = new Set(etapasActivas.map(e => e.value));
  const etapasNombresSet = new Set(etapasActivas.map(e => e.label));
  const docsSinEtapa = documentosFiltrados.filter(d => 
    !d.etapaKanbanId || 
    (!etapasIdsSet.has(d.etapaKanbanId) && 
     !etapasNombresSet.has(d.etapaNombreKanban || '') &&
     !etapasNombresSet.has(d.etapaKanban || ''))
  );
  if (docsSinEtapa.length > 0) documentosPorEtapa.push({ etapa: 'OTROS', label: 'Otros', docs: docsSinEtapa });

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: DESCARGAR DOCUMENTO (con token para evitar 401)
  // ═══════════════════════════════════════════════════════════════════
  const handleDescargar = async (documento: DocumentoBiblioteca) => {
    try {
      const dl = documento.urlDownload ?? '';
      const url = resolveDocumentoUrl(dl);
      const res = await fetch(url, { headers: getDocumentoFileHeaders() });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'No autorizado. Inicia sesión nuevamente.' : `Error ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = documento.nombreArchivo || `${documento.nombre ?? 'documento'}.${(documento.extension ?? 'bin').toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDocumentos(prev =>
        prev.map(doc => doc.id === documento.id ? { ...doc, descargas: doc.descargas + 1 } : doc)
      );

      toast.success('✅ Descarga iniciada', {
        description: `Se está descargando: ${documento.nombreArchivo || documento.nombre}`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error al descargar documento:', error);
      toast.error('❌ Error al descargar', {
        description: error instanceof Error ? error.message : 'No se pudo iniciar la descarga',
        duration: 4000
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: VISTA PREVIA
  // ═══════════════════════════════════════════════════════════════════
  const handleVistaPrevia = (documento: DocumentoBiblioteca) => {
    setDocumentoVistaPrevia(documento);
  };

  const handleEliminar = (documento: DocumentoBiblioteca) => {
    setDocumentoEliminar(documento);
  };

  const confirmarEliminacion = async () => {
    if (!documentoEliminar) return;
    try {
      await controlInternoService.deleteDocumento(documentoEliminar.id);
      setDocumentos(prev => prev.filter(d => d.id !== documentoEliminar.id));
      toast.success('🗑️ Documento eliminado', { description: `Se eliminó "${documentoEliminar.nombre}" de la biblioteca`, duration: 4000 });
      setDocumentoEliminar(null);
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('❌ No se pudo eliminar el documento');
    }
  };

  const handleEditar = (documento: DocumentoBiblioteca) => {
    setDocumentoAEditar(documento);
  };

  const confirmarEdicion = async (data: {
    nombre: string;
    descripcion: string;
    categoria?: CategoriaDocumento;
    etapaKanban?: string;
    etapaKanbanId?: string;
    etapaNombreKanban?: string;
    auditoriaId?: string | null;
  }) => {
    if (!documentoAEditar) return;
    try {
      const updatePayload: Record<string, any> = { 
        nombre: data.nombre, 
        descripcion: data.descripcion 
      };
      
      if (data.categoria) updatePayload.tipoDocumento = mapCategoriaToApiTipo(data.categoria);
      
      // ✅ ETAPA LEGACY: Ignorar (el backend moderno usa etapaKanbanId)
      updatePayload.etapa = undefined;
      
      // ✅ ETAPA DINÁMICA: Enviar UUID y snapshot del nombre
      if (data.etapaKanbanId) {
        updatePayload.etapaKanbanId = data.etapaKanbanId;
        updatePayload.etapaNombreKanban = data.etapaNombreKanban || data.etapaKanban;
      }
      
      console.log('🔍 [DEBUG EDIT DOC] ===== EDITAR DOCUMENTO =====');
      console.log('🔍 [DEBUG EDIT DOC] Etapa:', data.etapaNombreKanban || data.etapaKanban);
      console.log('🔍 [DEBUG EDIT DOC] UUID etapa:', data.etapaKanbanId);
      console.log('🔍 [DEBUG EDIT DOC] Payload:', updatePayload);
      
      // Plantillas: visibleAuditoriaId indica para qué auditoría se muestra (null=todas)
      if (data.auditoriaId !== undefined) updatePayload.visibleAuditoriaId = data.auditoriaId || null;
      
      await controlInternoService.updateDocumento(documentoAEditar.id, updatePayload);
      setDocumentos(prev => prev.map(d => d.id === documentoAEditar.id ? { ...d, ...data } : d));
      toast.success('✅ Documento actualizado', { description: `"${data.nombre}" actualizado correctamente`, duration: 4000 });
      setDocumentoAEditar(null);
    } catch (error) {
      console.error('Error actualizando documento:', error);
      toast.error('❌ No se pudo actualizar el documento');
    }
  };

  const handleSubirDocumento = async (nuevoDocumento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File; auditoriaId?: string; etapaKanbanId?: string; etapaNombreKanban?: string }) => {
    try {
      // ✅ ETAPA LEGACY: Enviar undefined (el backend moderno usa etapaKanbanId)
      // No usar mapeo hardcodeado porque no funciona con etapas personalizadas
      const etapaBackend = undefined;
      
      console.log('🔍 [DEBUG UPLOAD] ===== SUBIR DOCUMENTO =====');
      console.log('🔍 [DEBUG UPLOAD] Documento recibido del modal:', nuevoDocumento);
      console.log('🔍 [DEBUG UPLOAD] Etapa:', nuevoDocumento.etapaNombreKanban || nuevoDocumento.etapaKanban);
      console.log('🔍 [DEBUG UPLOAD] UUID etapa:', nuevoDocumento.etapaKanbanId);
      console.log('🔍 [DEBUG UPLOAD] Payload completo:', {
        nombre: nuevoDocumento.nombre,
        etapa: etapaBackend,
        etapaKanbanId: nuevoDocumento.etapaKanbanId,
        etapaNombreKanban: nuevoDocumento.etapaNombreKanban,
        tipoDocumento: mapCategoriaToApiTipo(nuevoDocumento.categoria),
        subidoPor: nuevoDocumento.subidoPor
      });
      
      // Plantillas: auditoriaId=null, visibleAuditoriaId=para qué auditoría se muestra (null=todas)
      const creado = await controlInternoService.createDocumento(nuevoDocumento.file, {
        nombre: nuevoDocumento.nombre,
        descripcion: nuevoDocumento.descripcion,
        tipoDocumento: mapCategoriaToApiTipo(nuevoDocumento.categoria),
        etapa: etapaBackend, // ⚠️ LEGACY - El backend DEBE ignorar esto
        etapaKanbanId: nuevoDocumento.etapaKanbanId, // ✅ REFERENCIA PRINCIPAL (UUID)
        etapaNombreKanban: nuevoDocumento.etapaNombreKanban, // ✅ SNAPSHOT del nombre
        subidoPor: nuevoDocumento.subidoPor,
        ...(nuevoDocumento.auditoriaId && { visibleAuditoriaId: nuevoDocumento.auditoriaId }),
        ...(planAnualVigencia != null ? { planAnualVigencia } : {}),
        ...(planAnualId ? { planAnualId } : {}),
      });
      const documentoCompleto: DocumentoBiblioteca = mapApiDocumentoToBiblioteca(creado);
      setDocumentos(prev => [documentoCompleto, ...prev]);
      setMostrarModalSubir(false);
      toast.success('✅ Documento subido exitosamente', { description: `"${documentoCompleto.nombre}" se agregó a la biblioteca`, duration: 4000 });
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error('❌ No se pudo subir el documento al backend');
    }
  };

  return (
    <div className="p-3 w-full">
      {/* Header - Alineado con Auditorías OCI */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Biblioteca de Plantillas</h2>
            <p className="text-[11px] text-gray-500">
              Repositorio de plantillas y documentos oficiales · vigencia {planAnualVigencia ?? '—'}
            </p>
          </div>
          <button
            onClick={() => setMostrarModalSubir(true)}
            className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <Upload className="w-4 h-4" />
            Subir Documento
          </button>
        </div>

        {/* Estadísticas - Patrón Kanban referencia */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900 leading-none">{documentos.length}</p>
              <p className="text-[10px] text-gray-500">Total Documentos</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <File className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-black text-green-700 leading-none">{documentos.filter(d => d.categoria === 'PLANTILLA').length}</p>
              <p className="text-[10px] text-gray-500">Plantillas</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-black text-purple-700 leading-none">{documentos.filter(d => d.categoria === 'OFICIO').length}</p>
              <p className="text-[10px] text-gray-500">Oficios</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-black text-amber-700 leading-none">{documentos.filter(d => d.categoria === 'FORMATO').length}</p>
              <p className="text-[10px] text-gray-500">Formatos</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Download className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-black text-red-700 leading-none">{documentos.reduce((sum, d) => sum + d.descargas, 0)}</p>
              <p className="text-[10px] text-gray-500">Descargas Totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plantilla..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:border-blue-500 focus:outline-none"
          >
            <option value="TODOS">Todas las etapas</option>
            {etapasActivas.map(etapa => (
              <option key={etapa.value} value={etapa.value}>
                {etapa.label}
              </option>
            ))}
          </select>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:border-blue-500 focus:outline-none"
          >
            <option value="TODOS">Todas las categorías</option>
            <option value="OFICIO">Oficios</option>
            <option value="ACTA">Actas</option>
            <option value="LISTA_CHEQUEO">Listas de Chequeo</option>
            <option value="INFORME">Informes</option>
            <option value="EVIDENCIA">Evidencias</option>
            <option value="PLANTILLA">Plantillas</option>
            <option value="FORMATO">Formatos</option>
            <option value="GUIA">Guías</option>
            <option value="OTRO">Otros</option>
          </select>
        </div>
        <p className="mt-3 text-sm text-gray-500 font-medium">{documentosFiltrados.length} resultados</p>
      </div>

      {/* Lista de Documentos agrupada por etapa */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900">
            Documentos Disponibles ({documentosFiltrados.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-pulse" />
            <p className="text-blue-700 font-semibold">Cargando documentos desde backend...</p>
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-700 font-semibold">{loadError}</p>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">
              {sinDatosBackend ? 'No hay documentos cargados en el backend' : 'No se encontraron documentos con ese filtro'}
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-gray-200">
            {documentosPorEtapa.map(({ etapa, label, docs }) => (
              <div key={etapa}>
                <div className="px-6 py-3 bg-gray-100 border-b border-gray-200">
                  <h3 className="text-base font-black text-gray-800">
                    {label} – {docs.length} plantilla{docs.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {docs.map((doc) => (
                    <TarjetaDocumento
                      key={doc.id}
                      documento={doc}
                      onEliminar={handleEliminar}
                      onDescargar={handleDescargar}
                      onVistaPrevia={handleVistaPrevia}
                      onEditar={handleEditar}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Vista Previa */}
      {documentoVistaPrevia && (
        <ModalVistaPrevia
          documento={documentoVistaPrevia}
          onClose={() => setDocumentoVistaPrevia(null)}
        />
      )}

      {/* Modal Eliminar */}
      {documentoEliminar && (
        <ModalEliminar
          documento={documentoEliminar}
          onClose={() => setDocumentoEliminar(null)}
          onConfirmar={confirmarEliminacion}
        />
      )}

      {/* Modal Subir / Editar Documento (unificado) */}
      {(mostrarModalSubir || documentoAEditar) && (
        <ModalSubirDocumento
          onClose={() => { setMostrarModalSubir(false); setDocumentoAEditar(null); }}
          onSubir={handleSubirDocumento}
          onEditar={documentoAEditar ? confirmarEdicion : undefined}
          documentoEditar={documentoAEditar ?? undefined}
          auditorias={auditorias}
          etapasDisponibles={etapasActivas}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TARJETA BIBLIOTECA: solo descargar y vista previa (no subir/editar/eliminar)
// ════════════════════════════════════════════════════════════════════════════

function TarjetaDocumentoBiblioteca({
  documento,
  onDescargar,
  onVistaPrevia,
}: {
  documento: DocumentoBiblioteca;
  onDescargar: (documento: DocumentoBiblioteca) => void;
  onVistaPrevia: (documento: DocumentoBiblioteca) => void;
}) {
  const colorCategoria = {
    'PLANTILLA': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'OFICIO': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'ACTA': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'LISTA_CHEQUEO': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    'INFORME': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    'EVIDENCIA': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'FORMATO': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'GUIA': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'OTRO': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  }[documento.categoria];

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${colorCategoria.bg}`}>
              <File className={`w-5 h-5 ${colorCategoria.text}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-gray-900">{documento.nombre}</h3>
              <p className="text-sm text-gray-600">{documento.descripcion}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
            <span className={`px-3 py-1 rounded-lg font-bold ${colorCategoria.bg} ${colorCategoria.text}`}>
              {documento.categoria}
            </span>
            {documento.etapaKanban && (
              <span className="px-3 py-1 rounded-lg font-bold bg-purple-100 text-purple-700">
                📎 {documento.etapaNombreKanban || documento.etapaKanban}
              </span>
            )}
            <span className="text-gray-600"><strong>Tamaño:</strong> {documento.tamano}</span>
            <span className="text-gray-600"><strong>Tipo:</strong> {documento.extension}</span>
          </div>
        </div>
        <div className="flex gap-2 ml-6">
          <button onClick={() => onDescargar(documento)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg" title="Descargar">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => onVistaPrevia(documento)} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg" title="Vista previa">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TARJETA DOCUMENTO (para otros contextos con editar/eliminar)
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaDocumentoProps {
  documento: DocumentoBiblioteca;
  onEliminar: (documento: DocumentoBiblioteca) => void;
  onDescargar: (documento: DocumentoBiblioteca) => void;
  onVistaPrevia: (documento: DocumentoBiblioteca) => void;
  onEditar?: (documento: DocumentoBiblioteca) => void;
}

function TarjetaDocumento({ documento, onEliminar, onDescargar, onVistaPrevia, onEditar }: TarjetaDocumentoProps) {
  const colorCategoria = {
    'PLANTILLA': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'OFICIO': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'ACTA': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'LISTA_CHEQUEO': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    'INFORME': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    'EVIDENCIA': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'FORMATO': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'GUIA': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'OTRO': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  }[documento.categoria];

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${colorCategoria.bg}`}>
              <File className={`w-5 h-5 ${colorCategoria.text}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-gray-900">{documento.nombre}</h3>
              <p className="text-sm text-gray-600">{documento.descripcion}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
            <span className={`px-3 py-1 rounded-lg font-bold ${colorCategoria.bg} ${colorCategoria.text}`}>
              {documento.categoria}
            </span>
            {documento.etapaKanban && (
              <span className="px-3 py-1 rounded-lg font-bold bg-purple-100 text-purple-700">
                📎 {documento.etapaNombreKanban || documento.etapaKanban}
              </span>
            )}
            <span className="text-gray-600">
              <strong>Tamaño:</strong> {documento.tamano}
            </span>
            <span className="text-gray-600">
              <strong>Tipo:</strong> {documento.extension}
            </span>
            <span className="text-gray-600">
              <strong>Subido:</strong> {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
            </span>
            <span className="text-gray-600">
              <strong>Por:</strong> {documento.subidoPor}
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Download className="w-4 h-4" />
              <strong>{documento.descargas}</strong> descargas
            </span>
          </div>
        </div>

        <div className="flex gap-2 ml-6">
          {onEditar && (
            <button
              onClick={() => onEditar(documento)}
              className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onDescargar(documento)}
            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
            title="Descargar"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => onVistaPrevia(documento)}
            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            title="Vista previa"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEliminar(documento)}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: GESTIÓN DE LISTAS DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface GestionListasChequeoProps {
  documentosBiblioteca: DocumentoBiblioteca[];
  auditorias: any[];
  listasIniciales: ListaChequeo[];
  isLoading: boolean;
  loadError: string | null;
  /** Al filtrar desde expediente/Comunicación, mostrar solo listas de esta auditoría */
  auditoriaIdFoco?: string;
  /** ✅ Etapas dinámicas desde configuración de Kanban */
  etapasDisponibles?: { value: string; label: string }[];
  planAnualVigencia?: number;
  planAnualId?: string;
}

function GestionListasChequeo({
  documentosBiblioteca,
  auditorias,
  listasIniciales,
  isLoading,
  loadError,
  auditoriaIdFoco,
  etapasDisponibles,
  planAnualVigencia,
  planAnualId,
}: GestionListasChequeoProps) {
  const { user } = useAuth();
  const [listas, setListas] = useState<ListaChequeo[]>(listasIniciales || []);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODOS');
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [listaSeleccionada, setListaSeleccionada] = useState<ListaChequeo | null>(null);
  const [listaAEditar, setListaAEditar] = useState<ListaChequeo | null>(null);
  const [listaADuplicar, setListaADuplicar] = useState<ListaChequeo | null>(null);
  const [listaAEliminar, setListaAEliminar] = useState<ListaChequeo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // ✅ OBTENER AUDITORÍA FOCO Y SU FASE ACTUAL
  const auditoriaFoco = auditoriaIdFoco ? auditorias.find((a: any) => (a?.id ?? '') === auditoriaIdFoco) : null;

  useEffect(() => {
    setListas(listasIniciales || []);
  }, [listasIniciales]);

  // ✅ AUTO-FILTRAR POR FASE ACTUAL DE LA AUDITORÍA
  useEffect(() => {
    if (auditoriaFoco && etapasDisponibles) {
      // ✅ BUSCAR LA ETAPA POR NOMBRE DINÁMICO (sin mapeos hardcodeados)
      const estadoAuditoria = auditoriaFoco.estado || '';
      
      // Buscar en etapas configuradas por nombre (case-insensitive)
      const etapaEncontrada = etapasDisponibles.find(e => 
        e.label.toLowerCase() === estadoAuditoria.toLowerCase() ||
        e.label === estadoAuditoria
      );

      if (etapaEncontrada) {
        setFiltroEtapa(etapaEncontrada.value); // ✅ Usar UUID de la etapa
        console.log('🔍 [AUTO-FILTRO] Auditoría:', auditoriaFoco.codigo, '| Estado:', auditoriaFoco.estado, '| Etapa UUID:', etapaEncontrada.value, '| Filtro aplicado:', etapaEncontrada.label);
      } else {
        // Si no se encuentra la etapa, mostrar todas
        setFiltroEtapa('TODOS');
        console.warn('⚠️ [AUTO-FILTRO] No se encontró etapa para estado:', auditoriaFoco.estado, '| Mostrando todas');
      }
    }
  }, [auditoriaFoco, etapasDisponibles]);

  // ✅ ELIMINAR LISTA DE CHEQUEO (Backend conectado)
  const handleEliminarLista = async () => {
    if (!listaAEliminar) return;
    setEliminando(true);
    try {
      await controlInternoService.deleteListaChequeo(listaAEliminar.id);
      setListas(prev => prev.filter(l => l.id !== listaAEliminar.id));
      toast.success('Lista eliminada exitosamente', {
        description: `"${listaAEliminar.nombre}" ha sido eliminada del sistema`
      });
      setListaAEliminar(null);
    } catch (error) {
      console.error('Error eliminando lista:', error);
      toast.error('Error al eliminar la lista', {
        description: 'No se pudo eliminar del backend. Intente nuevamente.'
      });
    } finally {
      setEliminando(false);
    }
  };

  // ✅ EDITAR LISTA DE CHEQUEO (Backend conectado)
  const handleGuardarEdicion = async (listaEditada: Partial<ListaChequeo>) => {
    if (!listaAEditar) return;
    try {
      // ✅ TIPO LEGACY: Mantener 'planeacion' por defecto (el backend moderno usa etapaKanbanId)
      const tipo: ListaChequeoService['tipo'] = 'planeacion';

      // ✅ VALIDAR Y SANITIZAR auditoriaId (debe ser UUID válido o undefined)
      const auditoriaIdSanitized = listaEditada.auditoriaId && typeof listaEditada.auditoriaId === 'string'
        ? listaEditada.auditoriaId
        : undefined;

      // ✅ FASES LEGACY: Usar directamente los campos booleanos (deprecated - el backend usa etapaKanbanId)
      const fases = {
        fasePlaneacion: listaEditada.fasePlaneacion || false,
        faseEjecucion: listaEditada.faseEjecucion || false,
        faseComunicacion: listaEditada.faseComunicacion || false,
        faseSeguimiento: listaEditada.faseSeguimiento || false,
      };

      console.log('🔍 [DEBUG EDIT] ===== EDITAR LISTA CHEQUEO =====');
      console.log('🔍 [DEBUG EDIT] Etapa seleccionada:', listaEditada.etapaNombreKanban || listaEditada.etapaKanban);
      console.log('🔍 [DEBUG EDIT] UUID etapa:', listaEditada.etapaKanbanId);
      console.log('🔍 [DEBUG EDIT] Payload:', {
        nombre: listaEditada.nombre,
        tipo,
        etapaKanbanId: listaEditada.etapaKanbanId,
        etapaNombreKanban: listaEditada.etapaNombreKanban || listaEditada.etapaKanban,
        ...fases
      });

      const actualizada = await controlInternoService.updateListaChequeo(listaAEditar.id, {
        nombre: listaEditada.nombre,
        descripcion: listaEditada.descripcion,
        tipo,
        activa: listaEditada.activa ?? true,
        // ✅ ITEMS ACTUALIZADOS
        items: (listaEditada.items || []).map((item, idx) => ({
          texto: String(item.texto || ''),
          categoria: 'General',
          obligatorio: true,
          orden: Number(idx) + 1,
          ...(item.plantillaAsociada ? {
            documentoBibliotecaId: item.plantillaAsociada.documentoBibliotecaId,
            documentoNombre: item.plantillaAsociada.nombreDocumento
          } : {})
        })),
        // ✅ VINCULACIÓN CON AUDITORÍA
        auditoriaId: auditoriaIdSanitized,
        nombreAuditoria: listaEditada.auditoriaCodigoNombre || undefined,
        // ✅ ETAPA KANBAN DINÁMICA (UUID estable) - ESTO ES LO IMPORTANTE
        etapaKanbanId: listaEditada.etapaKanbanId,
        // ✅ NOMBRE DE ETAPA (snapshot para display)
        etapaNombreKanban: listaEditada.etapaNombreKanban || listaEditada.etapaKanban,
        // ✅ FASES LEGACY (el backend moderno NO debería usar estos campos)
        ...fases,
      });

      setListas(prev => prev.map(l => 
        l.id === listaAEditar.id ? mapApiListaToUI(actualizada) : l
      ));
      setListaAEditar(null);
      toast.success('Lista actualizada exitosamente', {
        description: `"${listaEditada.nombre}" guardada en backend`
      });
    } catch (error) {
      console.error('Error actualizando lista:', error);
      toast.error('Error al actualizar', {
        description: 'No se pudo guardar los cambios. Intente nuevamente.'
      });
    }
  };

  // ✅ FILTRO COMBINADO: Etapa + Auditoría específica
  const listasFiltradas = listas.filter(lista => {
    // ✅ FILTRAR POR UUID DE ETAPA O POR NOMBRE (para compatibilidad con datos legacy)
    const cumpleFiltroEtapa = filtroEtapa === 'TODOS' ||
      lista.etapaKanbanId === filtroEtapa ||
      lista.etapaNombreKanban === etapasDisponibles?.find(e => e.value === filtroEtapa)?.label ||
      lista.etapaKanban === etapasDisponibles?.find(e => e.value === filtroEtapa)?.label;
    
    // Si hay auditoriaIdFoco, filtrar solo listas de esa auditoría
    const cumpleFiltroAuditoria = auditoriaIdFoco 
      ? lista.auditoriaId === auditoriaIdFoco 
      : true;

    // Filtro por auditor (solo puede ver las listas creadas por él mismo)
    const esJefeOciSuperadmin = user?.roles?.some(r => ['superadmin', 'jefe_oci', 'admin'].includes(r)) || false;
    const nombreCompleto = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const cumpleFiltroAuditor = esJefeOciSuperadmin ||
      lista.creadoPor === nombreCompleto ||
      lista.creadoPor === user?.email ||
      lista.creadoPor === 'Usuario Actual' ||
      lista.creadoPor === user?.id ||
      (lista.creadoPor && lista.creadoPor !== 'Sistema' && user?.firstName && lista.creadoPor.includes(user.firstName));
    
    console.log(`[DEBUG LISTAS FILTRADAS] Lista: ${lista.nombre} (${lista.id})`, {
      etapaKanban: lista.etapaKanban,
      etapaKanbanId: lista.etapaKanbanId,
      etapaNombreKanban: lista.etapaNombreKanban,
      auditoriaId: lista.auditoriaId,
      creadoPor: lista.creadoPor,
      filtroEtapa,
      auditoriaIdFoco,
      esJefeOciSuperadmin,
      nombreCompleto,
      cumpleFiltroEtapa,
      cumpleFiltroAuditoria,
      cumpleFiltroAuditor,
      pasoFiltros: cumpleFiltroEtapa && cumpleFiltroAuditoria && cumpleFiltroAuditor
    });

    return cumpleFiltroEtapa && cumpleFiltroAuditoria && cumpleFiltroAuditor;
  });

  const estadisticas = {
    totalListas: listas.length,
    planeacion: listas.filter(l => {
      const e = normalizarEtapaTexto(l.etapaKanban || l.etapaNombreKanban || '');
      return e.includes('planeac') || e.includes('planificac');
    }).length,
    ejecucion: listas.filter(l => {
      const e = normalizarEtapaTexto(l.etapaKanban || l.etapaNombreKanban || '');
      return e.includes('ejecuc');
    }).length,
    comunicacion: listas.filter(l => {
      const e = normalizarEtapaTexto(l.etapaKanban || l.etapaNombreKanban || '');
      return e.includes('comunicac');
    }).length,
    completitudPromedio: listas.length > 0
      ? Math.round(listas.reduce((sum, l) => sum + l.completitud, 0) / listas.length)
      : 0
  };

  // ✅ FUNCIONALIDAD REAL: Crear nueva lista de chequeo
  const handleCrearLista = async (nuevaLista: Partial<ListaChequeo>) => {
    const listaCompleta: ListaChequeo = {
      id: `lista-${Date.now()}`,
      nombre: nuevaLista.nombre || 'Nueva Lista',
      descripcion: nuevaLista.descripcion || '',
      etapaKanban: nuevaLista.etapaKanban || 'PLANEACION',
      items: nuevaLista.items || [],
      documentosAdjuntos: nuevaLista.documentosAdjuntos || [],
      creadoPor: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario Actual',
      fechaCreacion: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString(),
      completitud: 0,
      activa: true,
      // ✅ VINCULACIÓN CON AUDITORÍAS OCI
      auditoriaId: nuevaLista.auditoriaId,
      auditoriaCodigoNombre: nuevaLista.auditoriaCodigoNombre,
      fasesImpactadas: nuevaLista.fasesImpactadas,
      // ✅ ETAPA KANBAN DINÁMICA
      etapaKanbanId: nuevaLista.etapaKanbanId,
      etapaNombreKanban: nuevaLista.etapaNombreKanban,
      // ✅ FASES BOOLEANAS
      fasePlaneacion: nuevaLista.fasePlaneacion,
      faseEjecucion: nuevaLista.faseEjecucion,
      faseComunicacion: nuevaLista.faseComunicacion,
      faseSeguimiento: nuevaLista.faseSeguimiento,
      // ✅ LEGACY: GESTIÓN DOCUMENTAL (mantener compatibilidad)
      etapaProceso: nuevaLista.etapaProceso,
      auditoriaAsignada: nuevaLista.auditoriaAsignada
    };

    try {
      // ✅ TIPO LEGACY: Usar 'planeacion' por defecto (el backend moderno usa etapaKanbanId)
      const tipo: ListaChequeoService['tipo'] = 'planeacion';

      // ✅ CÓDIGO: Usar el nombre de la etapa para el código (si no hay ID, usar tipo legacy)
      const etapaParaCodigo = listaCompleta.etapaNombreKanban || listaCompleta.etapaKanban || 'ETAPA';
      const codigoLista = `LC-${etapaParaCodigo.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

      // ✅ VALIDAR Y SANITIZAR auditoriaId (debe ser UUID válido o undefined)
      const auditoriaIdSanitized = listaCompleta.auditoriaId && typeof listaCompleta.auditoriaId === 'string'
        ? listaCompleta.auditoriaId
        : undefined;

      // ✅ FASES: Usar directamente los campos booleanos que vienen del modal
      const fases = {
        fasePlaneacion: listaCompleta.fasePlaneacion || false,
        faseEjecucion: listaCompleta.faseEjecucion || false,
        faseComunicacion: listaCompleta.faseComunicacion || false,
        faseSeguimiento: listaCompleta.faseSeguimiento || false,
      };

      console.log('🔍 [DEBUG CREATE] ===== CREAR LISTA CHEQUEO =====');
      console.log('🔍 [DEBUG CREATE] Etapa seleccionada:', listaCompleta.etapaNombreKanban || listaCompleta.etapaKanban);
      console.log('🔍 [DEBUG CREATE] UUID etapa:', listaCompleta.etapaKanbanId);
      console.log('🔍 [DEBUG CREATE] Tipo legacy (deprecado):', tipo);
      console.log('🔍 [DEBUG CREATE] Lista completa recibida:', {
        fasePlaneacion: listaCompleta.fasePlaneacion,
        faseEjecucion: listaCompleta.faseEjecucion,
        faseComunicacion: listaCompleta.faseComunicacion,
        faseSeguimiento: listaCompleta.faseSeguimiento,
      });
      console.log('🔍 [DEBUG CREATE] Fases a enviar al backend:', fases);
      console.log('🔍 [DEBUG CREATE] Payload completo:', {
        codigo: codigoLista,
        nombre: listaCompleta.nombre,
        tipo,
        etapaKanbanId: listaCompleta.etapaKanbanId,
        etapaNombreKanban: listaCompleta.etapaNombreKanban,
        ...fases
      });

      const creadaApi = await controlInternoService.createListaChequeo({
        codigo: codigoLista,
        nombre: listaCompleta.nombre,
        descripcion: listaCompleta.descripcion || '',
        tipo,
        categoria: 'biblioteca',
        activa: true,
        ...(planAnualVigencia != null ? { planAnualVigencia } : {}),
        ...(planAnualId ? { planAnualId } : {}),
        items: (listaCompleta.items || []).map((item, idx) => ({
          texto: String(item.texto || ''),
          categoria: 'General',
          obligatorio: true,
          orden: Number(idx) + 1,
          ...(item.plantillaAsociada ? {
            documentoBibliotecaId: item.plantillaAsociada.documentoBibliotecaId,
            documentoNombre: item.plantillaAsociada.nombreDocumento
          } : {})
        })),
        // ✅ VINCULACIÓN CON AUDITORÍA
        auditoriaId: auditoriaIdSanitized,
        nombreAuditoria: listaCompleta.auditoriaCodigoNombre || undefined,
        // ✅ ID DE ETAPA (UUID estable) - ESTO ES LO IMPORTANTE
        etapaKanbanId: listaCompleta.etapaKanbanId,
        // ✅ NOMBRE DE ETAPA (snapshot para display)
        etapaNombreKanban: listaCompleta.etapaNombreKanban || listaCompleta.etapaKanban,
        // ✅ CREADOR
        createdBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Usuario Actual',
        creadoPor: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Usuario Actual',
        // ✅ FASES DINÁMICAS según la etapa seleccionada
        ...fases,
      });

      setListas(prev => [mapApiListaToUI(creadaApi), ...prev]);
      setMostrarModalCrear(false);
      toast.success('✅ Lista de chequeo creada exitosamente', {
        description: `"${listaCompleta.nombre}" guardada en backend`,
        duration: 5000
      });
      return;
    } catch (error) {
      console.error('❌ Error creando lista en backend:', error);
      
      // Mostrar error detallado
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('❌ Error al crear la lista', {
        description: errorMsg,
        duration: 7000
      });
    }
  };

  return (
    <div className="p-3 w-full">
      {/* Banner: contexto de auditoría cuando se navega desde expediente/Comunicación */}
      {auditoriaIdFoco && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">
                📋 Listas de Chequeo de la Auditoría
              </p>
              <p className="text-base font-black text-blue-800 mb-2">
                {auditoriaFoco
                  ? [auditoriaFoco.codigo, auditoriaFoco.nombre].filter(Boolean).join(' - ') || 'Auditoría seleccionada'
                  : 'Auditoría seleccionada'}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">
                  Fase Actual: {auditoriaFoco?.estado || 'No definida'}
                </span>
                <span className="text-xs text-blue-700">
                  • Mostrando solo listas de esta fase
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Gestión de Listas de Chequeo
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Crea y administra listas vinculadas al Kanban · vigencia {planAnualVigencia ?? '—'}
            </p>
          </div>
          <button
            onClick={() => setMostrarModalCrear(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nueva Lista de Chequeo
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-700">Total Listas</span>
            <List className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-700">{estadisticas.totalListas}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-green-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-green-700">Planeación</span>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-green-700">{estadisticas.planeacion}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-purple-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-purple-700">Ejecución</span>
            <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700">{estadisticas.ejecucion}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-orange-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-orange-700">Comunicación</span>
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-orange-700">{estadisticas.comunicacion}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-red-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-red-700">Completitud Prom.</span>
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-700">{estadisticas.completitudPromedio}%</p>
        </div>
      </div>

      {/* Filtro por Etapa */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-xs sm:text-sm font-bold text-gray-700">Filtrar por Etapa:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* ✅ BOTÓN "TODAS" */}
            <button
              onClick={() => setFiltroEtapa('TODOS')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'TODOS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {/* ✅ BOTONES DINÁMICOS DESDE CONFIGURACIÓN KANBAN */}
            {etapasDisponibles && etapasDisponibles.length > 0 ? (
              etapasDisponibles.map((etapa, index) => {
                // Colores dinámicos basados en el índice
                const colores = [
                  'bg-green-600',    // 0: Primera etapa (ej: Planeación)
                  'bg-purple-600',   // 1: Segunda etapa (ej: Ejecución)
                  'bg-orange-600',   // 2: Tercera etapa (ej: Comunicación)
                  'bg-blue-600',     // 3: Cuarta etapa (ej: Seguimiento)
                  'bg-red-600',      // 4: Quinta etapa (ej: Cierre)
                  'bg-pink-600',     // 5+
                  'bg-indigo-600',
                  'bg-yellow-600',
                ];
                const colorActivo = colores[index % colores.length];
                
                return (
                  <button
                    key={etapa.value}
                    onClick={() => setFiltroEtapa(etapa.value)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      filtroEtapa === etapa.value
                        ? `${colorActivo} text-white`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {etapa.label}
                  </button>
                );
              })
            ) : (
              // Fallback si no hay etapas configuradas
              <>
                <button
                  onClick={() => setFiltroEtapa('PLANEACION')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    filtroEtapa === 'PLANEACION'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Planeación
                </button>
                <button
                  onClick={() => setFiltroEtapa('EJECUCION')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    filtroEtapa === 'EJECUCION'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ejecución
                </button>
                <button
                  onClick={() => setFiltroEtapa('COMUNICACION')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    filtroEtapa === 'COMUNICACION'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Comunicación
                </button>
              </>
            )}
          </div>
        </div>
        {auditoriaIdFoco && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              ℹ️ <strong>Filtro automático activo:</strong> Se muestran solo las listas de la fase actual de la auditoría. Puedes cambiar el filtro manualmente si necesitas ver otras fases.
            </p>
          </div>
        )}
      </div>

      {/* Lista de Listas de Chequeo */}
      <div className="space-y-3">
        {!isLoading && !loadError && listasFiltradas.map((lista) => (
          <TarjetaListaChequeo
            key={lista.id}
            lista={lista}
            onVer={() => setListaSeleccionada(lista)}
            onEditar={(l) => setListaAEditar(l)}
            onEliminar={(l) => setListaAEliminar(l)}
            onDuplicar={(l) => setListaADuplicar(l)}
          />
        ))}
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-pulse" />
          <p className="text-blue-700 font-semibold">Cargando listas de chequeo desde backend...</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="bg-white rounded-xl border-2 border-red-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-700 font-semibold">{loadError}</p>
        </div>
      )}

      {listasFiltradas.length === 0 && !isLoading && !loadError && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">
            {listas.length === 0
              ? 'No hay listas de chequeo cargadas en el backend'
              : 'No hay listas de chequeo para esta etapa'}
          </p>
        </div>
      )}

      {/* ✅ MODAL CREAR NUEVA LISTA */}
      {mostrarModalCrear && (
        <ModalCrearListaChequeo
          onClose={() => setMostrarModalCrear(false)}
          onCrear={handleCrearLista}
          documentosBiblioteca={documentosBiblioteca}
          auditorias={auditorias}
          etapasDisponibles={etapasDisponibles}
        />
      )}

      {/* Modal Ver Detalle */}
      {listaSeleccionada && (
        <ModalDetalleListaChequeo
          lista={listaSeleccionada}
          onClose={() => setListaSeleccionada(null)}
        />
      )}

      {/* ✅ MODAL EDITAR LISTA (reutiliza modal crear) */}
      {listaAEditar && (
        <ModalCrearListaChequeo
          onClose={() => setListaAEditar(null)}
          onCrear={handleGuardarEdicion}
          documentosBiblioteca={documentosBiblioteca}
          auditorias={auditorias}
          listaEditar={listaAEditar}
          etapasDisponibles={etapasDisponibles}
        />
      )}

      {/* ✅ MODAL DUPLICAR LISTA (reutiliza modal crear) */}
      {listaADuplicar && (
        <ModalCrearListaChequeo
          onClose={() => setListaADuplicar(null)}
          onCrear={async (nuevaLista) => {
            await handleCrearLista(nuevaLista);
            setListaADuplicar(null);
          }}
          documentosBiblioteca={documentosBiblioteca}
          auditorias={auditorias}
          listaDuplicar={listaADuplicar}
          etapasDisponibles={etapasDisponibles}
        />
      )}

      {/* ✅ MODAL CONFIRMAR ELIMINACIÓN */}
      {listaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Eliminación</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              ¿Está seguro de eliminar la lista de chequeo <strong>"{listaAEliminar.nombre}"</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setListaAEliminar(null)}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarLista}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {eliminando ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE LISTA DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaListaChequeoProps {
  lista: ListaChequeo;
  onVer: () => void;
  onEditar: (lista: ListaChequeo) => void;
  onEliminar: (lista: ListaChequeo) => void;
  onDuplicar: (lista: ListaChequeo) => void;
}

function TarjetaListaChequeo({ lista, onVer, onEditar, onEliminar, onDuplicar }: TarjetaListaChequeoProps) {
  const colorEtapa = {
    'PLANEACION': { bg: 'bg-green-100', text: 'text-green-700' },
    'EJECUCION': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'COMUNICACION': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    'SEGUIMIENTO': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'CIERRE': { bg: 'bg-red-100', text: 'text-red-700' }
  }[lista.etapaKanban] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  const itemsCompletados = lista.items.filter(i => i.completado).length;
  const totalItems = lista.items.length;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-400 transition-all">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h3 className="text-lg sm:text-xl font-black text-gray-900">{lista.nombre}</h3>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${colorEtapa.bg} ${colorEtapa.text}`}>
                {lista.etapaKanban}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">{lista.descripcion}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500">Creado por:</span>
                <p className="font-semibold text-gray-900 break-words">{lista.creadoPor}</p>
              </div>
              <div>
                <span className="text-gray-500">Fecha creación:</span>
                <p className="font-semibold text-gray-900">
                  {new Date(lista.fechaCreacion).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Items completados:</span>
                <p className="font-semibold text-gray-900">{itemsCompletados} / {totalItems}</p>
              </div>
              <div>
                <span className="text-gray-500">Documentos adjuntos:</span>
                <p className="font-semibold text-gray-900">{lista.documentosAdjuntos.length}</p>
              </div>
            </div>
          </div>

          <div className="text-center sm:ml-6 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
            <div className="text-3xl sm:text-4xl font-black text-blue-600 sm:mb-1">{lista.completitud}%</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Completitud</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-500"
            style={{ width: `${lista.completitud}%` }}
          ></div>
        </div>

        {/* ✅ VINCULACIÓN CON AUDITORÍA OCI */}
        {lista.auditoriaId && lista.auditoriaCodigoNombre && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-purple-900">🔗 Vinculada a Auditoría OCI:</p>
                <p className="text-sm font-black text-purple-700 truncate">{lista.auditoriaCodigoNombre}</p>
              </div>
            </div>
            
            {/* Fases impactadas */}
            {lista.fasesImpactadas && Object.values(lista.fasesImpactadas).some(v => v) && (
              <div className="mt-2">
                <p className="text-xs font-bold text-gray-700 mb-1.5">📊 Fases impactadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {lista.fasesImpactadas.planeacion && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                      📋 Planeación
                    </span>
                  )}
                  {lista.fasesImpactadas.ejecucion && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      🔍 Ejecución
                    </span>
                  )}
                  {lista.fasesImpactadas.comunicacion && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      📢 Comunicación
                    </span>
                  )}
                  {lista.fasesImpactadas.seguimiento && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                      👁️ Seguimiento
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documentos adjuntos preview */}
        {lista.documentosAdjuntos.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Documentos:</span>
            {lista.documentosAdjuntos.map((doc, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  doc.diligenciado
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {doc.nombreDocumento} {doc.diligenciado && '✓'}
              </span>
            ))}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onVer}
            className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Ver Detalle
          </button>
          <button
            onClick={() => onDuplicar(lista)}
            className="sm:flex-shrink-0 px-3 sm:px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            title="Duplicar lista"
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Duplicar</span>
          </button>
          <button
            onClick={() => onEditar(lista)}
            className="sm:flex-shrink-0 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Editar</span>
          </button>
          <button
            onClick={() => onEliminar(lista)}
            className="sm:flex-shrink-0 px-3 sm:px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 flex items-center gap-1.5 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SELECTOR: AUDITORÍA CON BUSQUEDA (lista cargada desde el backend)
// ════════════════════════════════════════════════════════════════════════════

function SelectorAuditoriaListaChequeo({
  auditorias,
  value,
  onChange,
  disabled,
  placeholder = 'Buscar por código, nombre o fase…',
}: {
  auditorias: any[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const seleccionada = auditorias.find((a) => (a?.id ?? '') === value);

  const updatePosition = useCallback(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleScroll = () => setOpen(false);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popup = document.getElementById('selector-auditoria-lista-chequeo-popup');
      if (popup?.contains(e.target as Node)) return;
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return auditorias;
    return auditorias.filter((a) => {
      const cod = String(a.codigo ?? '').toLowerCase();
      const tit = String(a.titulo ?? a.nombre ?? '').toLowerCase();
      const est = estadoAuditoriaOCIG(a).toLowerCase();
      const id = String(a.id ?? '').toLowerCase();
      return (
        cod.includes(q) ||
        tit.includes(q) ||
        est.includes(q) ||
        id.includes(q)
      );
    });
  }, [auditorias, busqueda]);

  const textoSeleccion = seleccionada
    ? `${seleccionada.codigo} · ${seleccionada.titulo || seleccionada.nombre || 'Sin título'} · ${estadoAuditoriaOCIG(seleccionada)}`
    : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex gap-2 items-stretch">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-semibold bg-white text-left flex items-center justify-between gap-2 min-h-[44px] hover:border-purple-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          <span className={`truncate ${seleccionada ? 'text-gray-900' : 'text-gray-500'}`}>
            {textoSeleccion}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {seleccionada && !disabled && (
          <button
            type="button"
            title="Quitar auditoría"
            onClick={() => {
              onChange('');
              setBusqueda('');
            }}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-semibold shrink-0"
          >
            Quitar
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div
            id="selector-auditoria-lista-chequeo-popup"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 100000,
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[min(360px,70vh)]"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar por código, título o fase Kanban…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 px-1">
                Solo auditorías registradas en el sistema ({auditorias.length} disponibles
                {filtradas.length !== auditorias.length ? ` · ${filtradas.length} coinciden` : ''})
              </p>
            </div>
            <ul className="overflow-y-auto overscroll-contain p-1">
              {filtradas.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-gray-500">
                  No hay coincidencias. Pruebe otro término.
                </li>
              ) : (
                filtradas.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(a.id);
                        setOpen(false);
                        setBusqueda('');
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        value === a.id
                          ? 'bg-purple-100 text-purple-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <span className="font-mono text-xs text-purple-700">{a.codigo}</span>
                      <span className="block font-medium truncate">
                        {a.titulo || a.nombre || 'Sin título'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Fase Kanban: {estadoAuditoriaOCIG(a)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR NUEVA LISTA DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCrearListaChequeoProps {
  onClose: () => void;
  onCrear: (lista: Partial<ListaChequeo>) => void;
  documentosBiblioteca: DocumentoBiblioteca[];
  auditorias: any[]; // Auditorías del Plan Anual
  listaEditar?: ListaChequeo; // ✅ Para modo edición
  listaDuplicar?: ListaChequeo; // ✅ Para modo duplicar
  /** ✅ Etapas dinámicas desde configuración de Kanban */
  etapasDisponibles?: { value: string; label: string }[];
}

function ModalCrearListaChequeo({ onClose, onCrear, documentosBiblioteca, auditorias, listaEditar, listaDuplicar, etapasDisponibles }: ModalCrearListaChequeoProps) {
  const modoEdicion = !!listaEditar;
  const baseLista = listaEditar || listaDuplicar;
  
  const [nombre, setNombre] = useState(baseLista ? (listaDuplicar ? `Copia de ${baseLista.nombre}` : baseLista.nombre) : '');
  const [descripcion, setDescripcion] = useState(baseLista?.descripcion || '');
  
  // ✅ Solo Planeación / Ejecución / Comunicación (no Seguimiento, Cierre, Plan Anual, etc.)
  const etapasListaChequeo = buildEtapasListaChequeo(etapasDisponibles);
  
  const [etapaKanbanId, setEtapaKanbanId] = useState<string>(() => {
    if (baseLista && !listaDuplicar) {
      if (baseLista.etapaKanbanId) {
        return baseLista.etapaKanbanId;
      }
      if (baseLista.etapaNombreKanban) {
        const etapaEncontrada = etapasListaChequeo.find(e => e.label === baseLista.etapaNombreKanban);
        if (etapaEncontrada) return etapaEncontrada.value;
      }
      if (baseLista.etapaKanban) {
        const etapaEncontrada = etapasListaChequeo.find(e => 
          e.label === baseLista.etapaKanban || 
          e.value === baseLista.etapaKanban
        );
        if (etapaEncontrada) return etapaEncontrada.value;
      }
    }
    return '';
  });
  
  const [items, setItems] = useState<ItemChequeo[]>(() => {
    if (!baseLista?.items) return [];
    if (listaDuplicar) {
      // Al duplicar, reiniciamos IDs y estado de completado
      return baseLista.items.map(item => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        completado: false,
        fechaCompletado: undefined,
        responsable: undefined,
        observaciones: undefined
      }));
    }
    return baseLista.items;
  });
  
  const [nuevoItemTexto, setNuevoItemTexto] = useState('');
  const [plantillaItemActual, setPlantillaItemActual] = useState<string>(''); // Plantilla para el ítem que se está creando
  const [filtroEtapaModal, setFiltroEtapaModal] = useState<string>(''); // Filtro de etapa para las plantillas
  
  // ✅ VINCULACIÓN CON AUDITORÍAS OCI
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(listaEditar?.auditoriaId || '');
  
  // ✅ LEGACY: Configuración de auditoría (mantener compatibilidad)
  const [etapaProceso, setEtapaProceso] = useState(listaEditar?.etapaProceso || '');
  const [auditoriaAsignada, setAuditoriaAsignada] = useState(listaEditar?.auditoriaAsignada || '');

  const auditoriasElegibles = useMemo(
    () => (auditorias || []).filter((a) => auditoriaPermiteListaChequeo(a)),
    [auditorias],
  );

  /** En edición, incluir la auditoría ya vinculada aunque su fase ya no sea elegible para nuevas listas */
  const auditoriasParaSelector = useMemo(() => {
    const ids = new Set(auditoriasElegibles.map((a) => a.id));
    const extraId = listaEditar?.auditoriaId;
    if (extraId && !ids.has(extraId)) {
      const extra = (auditorias || []).find((a) => a.id === extraId);
      if (extra) return [...auditoriasElegibles, extra];
    }
    return auditoriasElegibles;
  }, [auditoriasElegibles, auditorias, listaEditar?.auditoriaId]);

  const auditoriaActual = auditorias.find((a) => a.id === auditoriaSeleccionada);
  const etapaAcordeAuditoria = auditoriaSeleccionada
    ? resolverEtapaOpcionParaAuditoria(
        etapasListaChequeo,
        estadoAuditoriaOCIG(auditoriaActual),
      )
    : undefined;

  const opcionesEtapaKanban = useMemo(() => {
    if (!auditoriaSeleccionada) {
      return [{ value: '', label: '— Seleccione primero una auditoría —' }];
    }
    const baseOpciones = [
      { value: '', label: '— Seleccione una etapa —' },
      ...etapasListaChequeo
    ];
    if (modoEdicion && listaEditar?.etapaKanbanId) {
      const found = etapasListaChequeo.find((e) => e.value === listaEditar.etapaKanbanId);
      if (found) return baseOpciones;
      return [
        ...baseOpciones,
        {
          value: listaEditar.etapaKanbanId,
          label:
            listaEditar.etapaNombreKanban ||
            String(listaEditar.etapaKanban || 'Etapa registrada'),
        },
      ];
    }
    return baseOpciones;
  }, [
    auditoriaSeleccionada,
    etapasListaChequeo,
    modoEdicion,
    listaEditar?.etapaKanbanId,
    listaEditar?.etapaNombreKanban,
    listaEditar?.etapaKanban,
  ]);

  const etapaKanbanBloqueada = false;

  useEffect(() => {
    if (!auditoriaSeleccionada) {
      setEtapaKanbanId('');
      setFiltroEtapaModal('');
      setPlantillaItemActual('');
    }
  }, [auditoriaSeleccionada]);

  const etapaFiltroPlantillas = filtroEtapaModal || etapaKanbanId;

  const plantillasParaItems = useMemo(
    () =>
      documentosBiblioteca.filter((doc) =>
        documentoAplicaEtapa(doc, etapaFiltroPlantillas, etapasListaChequeo),
      ),
    [documentosBiblioteca, etapaFiltroPlantillas, etapasListaChequeo],
  );

  const handleAgregarItem = () => {
    if (!nuevoItemTexto.trim()) return;

    // Buscar info de la plantilla si se seleccionó
    let plantillaInfo = undefined;
    if (plantillaItemActual) {
      const doc = documentosBiblioteca.find(d => d.id === plantillaItemActual);
      if (doc) {
        plantillaInfo = {
          documentoBibliotecaId: doc.id,
          nombreDocumento: doc.nombre
        };
      }
    }

    const nuevoItem: ItemChequeo = {
      id: `item-${Date.now()}`,
      texto: nuevoItemTexto,
      completado: false,
      plantillaAsociada: plantillaInfo
    };

    setItems(prev => [...prev, nuevoItem]);
    setNuevoItemTexto('');
    setPlantillaItemActual(''); // Limpiar plantilla seleccionada
  };

  const handleEliminarItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleActualizarPlantillaItem = (itemId: string, plantillaId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (!plantillaId) {
          // Si no hay plantilla, quitar la asociación
          const { plantillaAsociada, ...rest } = item;
          return rest as ItemChequeo;
        } else {
          // Buscar info de la plantilla
          const doc = documentosBiblioteca.find(d => d.id === plantillaId);
          if (doc) {
            return {
              ...item,
              plantillaAsociada: {
                documentoBibliotecaId: doc.id,
                nombreDocumento: doc.nombre
              }
            };
          }
        }
      }
      return item;
    }));
  };

  const handleSubmit = () => {
    if (!nombre.trim()) {
      toast.error('❌ El nombre de la lista es obligatorio');
      return;
    }

    // ✅ VALIDACIÓN: Auditoría es OBLIGATORIA
    if (!auditoriaSeleccionada) {
      toast.error('❌ Debes vincular la lista a una auditoría. Es obligatorio.', {
        description: 'Selecciona una auditoría del Plan Anual para continuar',
        duration: 5000
      });
      return;
    }

    const audValidar = auditorias.find((a) => a.id === auditoriaSeleccionada);
    if (!audValidar) {
      toast.error('❌ Auditoría no encontrada');
      return;
    }
    if (!modoEdicion && !auditoriaPermiteListaChequeo(audValidar)) {
      toast.error('❌ Auditoría no elegible', {
        description:
          'Solo puedes crear listas cuando la auditoría está en etapa Planeación, Ejecución o Comunicación (Kanban OCI).',
        duration: 6000,
      });
      return;
    }
    if (!etapaKanbanId.trim()) {
      toast.error('❌ Etapa requerida', {
        description: 'Selecciona una etapa del Kanban (Planeación, Ejecución o Comunicación).',
        duration: 5000,
      });
      return;
    }

    const etapaSeleccionada = etapasListaChequeo.find(e => e.value === etapaKanbanId);
    const nombreEtapa = etapaSeleccionada?.label || 'Sin etapa';
    const ne = normalizarEtapaTexto(nombreEtapa);

    const fases = {
      fasePlaneacion: ne.includes('planeac'),
      faseEjecucion: ne.includes('ejecuc'),
      faseComunicacion: ne.includes('comunicac'),
      faseSeguimiento: false,
    };

    console.log('🔍 [DEBUG MODAL] ===== SUBMIT handleSubmit =====');
    console.log('🔍 [DEBUG MODAL] Etapa seleccionada:', nombreEtapa, '(ID:', etapaKanbanId, ')');
    console.log('🔍 [DEBUG MODAL] Usando etapaKanbanId (dinámico), NO campos booleanos hardcoded');

    // Buscar info completa de la auditoría seleccionada
    let auditoriaInfo = undefined;
    if (auditoriaSeleccionada) {
      const auditoria =auditorias.find(a => a.id === auditoriaSeleccionada);
      if (auditoria) {
        auditoriaInfo = {
          auditoriaId: auditoria.id,
          auditoriaCodigoNombre: `${auditoria.codigo} - ${auditoria.titulo || auditoria.nombre || 'Sin título'}`,
          // ✅ Fases como estructura legible para UI (ahora todos en false)
          fasesImpactadas: {
            planeacion: fases.fasePlaneacion,
            ejecucion: fases.faseEjecucion,
            comunicacion: fases.faseComunicacion,
            seguimiento: fases.faseSeguimiento,
          }
        };
      }
    }

    const listaACrear = {
      nombre,
      descripcion,
      etapaKanban: nombreEtapa, // Guardar nombre legible para UI
      etapaKanbanId, // ✅ ID estable de la etapa (UUID)
      etapaNombreKanban: nombreEtapa, // ✅ Snapshot del nombre para el backend
      items, // Items ya tienen sus plantillas asociadas
      documentosAdjuntos: [], // Ya no se usan documentos separados
      // ✅ VINCULACIÓN CON AUDITORÍAS OCI
      ...auditoriaInfo,
      // ✅ FASES BOOLEANAS (compatibilidad backend) - pasarlas directamente  
      ...fases,
      // ✅ LEGACY: GESTIÓN DOCUMENTAL (mantener compatibilidad)
      etapaProceso: etapaProceso || undefined,
      auditoriaAsignada: auditoriaAsignada || undefined
    };

    console.log('🔍 [DEBUG MODAL] Lista a crear FINAL:', listaACrear);
    console.log('🔍 [DEBUG MODAL] ===================================');

    console.log('🔍 [DEBUG MODAL] Objeto enviado a onCrear:', listaACrear);

    onCrear(listaACrear);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl sm:text-2xl font-black">
                {modoEdicion ? 'Editar Lista de Chequeo' : 'Nueva Lista de Chequeo'}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                {modoEdicion 
                  ? 'Modifica los datos de la lista de verificación'
                  : 'Crea una lista de verificación personalizada para tus auditorías'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Formulario - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Nombre de la Lista <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Planeación - Auditoría Financiera"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de esta lista de chequeo..."
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN: VINCULACIÓN CON AUDITORÍAS OCI */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-purple-900">🔗 Vinculación con Auditorías OCI</h3>
            </div>
            <p className="text-xs text-purple-700 mb-4">
              <strong>🔴 OBLIGATORIO:</strong> Vincula esta lista a una auditoría específica del Plan Anual y define qué fases impactará. Esto garantiza trazabilidad completa y actualización automática del progreso de la auditoría.
            </p>

            <div className="space-y-4">
              {/* Selector de Auditoría */}
              <div className="bg-white rounded-lg p-3 border-2 border-red-300 bg-red-50">
                <label className="block text-xs font-bold text-gray-900 mb-2">
                  🎯 Auditoría OCI <span className="text-red-600">*OBLIGATORIO*</span>
                </label>
                <p className="text-[11px] text-gray-600 mb-2">
                  Busque entre las auditorías ya cargadas del backend (misma lista que en Auditorías OCI).
                </p>
                <SelectorAuditoriaListaChequeo
                  auditorias={auditoriasParaSelector}
                  value={auditoriaSeleccionada}
                  onChange={setAuditoriaSeleccionada}
                  disabled={auditoriasParaSelector.length === 0}
                  placeholder="Elegir auditoría en Planeación, Ejecución o Comunicación…"
                />
                {auditorias.length === 0 && (
                  <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded border border-orange-200">
                    ⚠️ No hay auditorías creadas en el Plan Anual. Crea primero una auditoría para vincularla.
                  </p>
                )}
                {!modoEdicion && auditorias.length > 0 && auditoriasElegibles.length === 0 && (
                  <p className="text-xs text-amber-800 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                    No hay auditorías en etapa Planeación, Ejecución o Comunicación. Avanza la auditoría en el Kanban de Auditorías OCI para poder crear una lista de chequeo.
                  </p>
                )}
              </div>



              {/* Indicador si no hay auditoría seleccionada */}
              {!auditoriaSeleccionada && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      <strong>⚠️ REQUERIDO:</strong> Debes seleccionar una auditoría del Plan Anual. La vinculación es obligatoria para garantizar la trazabilidad y control de las auditorías OCIG.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Etapa Kanban: 3 opciones permitidas (Planeación, Ejecución, Comunicación) */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Etapa del Kanban <span className="text-red-600">*</span>
            </label>
            <select
              value={etapaKanbanId}
              onChange={(e) => {
                const v = e.target.value;
                setEtapaKanbanId(v);
                setFiltroEtapaModal(v);
                setPlantillaItemActual('');
              }}
              disabled={!auditoriaSeleccionada || etapaKanbanBloqueada}
              className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white font-semibold text-gray-800 disabled:bg-slate-100 disabled:text-slate-700"
            >
              {opcionesEtapaKanban.map((etapa) => (
                <option key={etapa.value || 'placeholder'} value={etapa.value}>
                  {etapa.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {!auditoriaSeleccionada
                ? 'Seleccione primero la auditoría para habilitar las etapas permitidas (Planeación, Ejecución o Comunicación).'
                : 'Puede elegir Planeación, Ejecución o Comunicación (no tiene que coincidir con la fase actual del Kanban).'
              }
            </p>
          </div>

          {/* Items de Verificación con Plantillas Asociadas */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Items de Verificación
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Cada ítem puede tener una plantilla asociada (opcional), filtrada por etapa y vigencia del plan anual.
            </p>
            {plantillasParaItems.length === 0 && etapaFiltroPlantillas && (
              <p className="text-xs text-amber-700 mb-3">
                No hay plantillas en biblioteca para esta etapa y vigencia. Suba plantillas en la pestaña Biblioteca.
              </p>
            )}

            {/* Agregar nuevo item */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4 space-y-3">
              <input
                type="text"
                value={nuevoItemTexto}
                onChange={(e) => setNuevoItemTexto(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAgregarItem()}
                placeholder="Escribe el ítem de verificación..."
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              
              {/* Selector de plantilla para el ítem */}
              <div className="space-y-2">
                {/* Filtro por etapa */}
                {etapasListaChequeo.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <select
                      value={filtroEtapaModal || etapaKanbanId}
                      onChange={(e) => {
                        setFiltroEtapaModal(e.target.value);
                        setPlantillaItemActual('');
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-600"
                    >
                      {etapasListaChequeo.map((etapa) => (
                        <option key={etapa.value} value={etapa.value}>{etapa.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Selector de plantilla filtrada */}
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <select
                    value={plantillaItemActual}
                    onChange={(e) => setPlantillaItemActual(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Sin plantilla asociada</option>
                    {plantillasParaItems.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          📄 {doc.nombre} ({doc.categoria})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleAgregarItem}
                disabled={!nuevoItemTexto.trim()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Ítem {plantillaItemActual && '+ Plantilla'}
              </button>
            </div>

            {/* Lista de items con sus plantillas */}
            {items.length > 0 && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-3 space-y-3 max-h-96 overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white p-3 rounded-lg border-2 border-gray-200 space-y-2"
                  >
                    {/* Ítem principal */}
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-semibold break-words">{item.texto}</p>
                        
                        {/* Plantilla asociada */}
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <select
                              value={item.plantillaAsociada?.documentoBibliotecaId || ''}
                              onChange={(e) => handleActualizarPlantillaItem(item.id, e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                            >
                              <option value="">Sin plantilla</option>
                              {plantillasParaItems.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                  📄 {doc.nombre} {doc.etapaNombreKanban || doc.etapaKanban ? `• ${doc.etapaNombreKanban || doc.etapaKanban}` : ''} ({doc.categoria})
                                </option>
                              ))}
                            </select>
                          </div>
                          {item.plantillaAsociada && (
                            <p className="text-xs text-green-600 mt-1 ml-5">
                              ✅ Plantilla: {item.plantillaAsociada.nombreDocumento}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarItem(item.id)}
                        className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">
                  Aún no has agregado items de verificación
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-4 sm:p-6 rounded-b-xl flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm sm:text-base"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {modoEdicion ? 'Guardar Cambios' : 'Crear Lista de Chequeo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VER DETALLE DE LISTA
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetalleListaChequeoProps {
  lista: ListaChequeo;
  onClose: () => void;
}

function ModalDetalleListaChequeo({ lista, onClose }: ModalDetalleListaChequeoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl sm:text-2xl font-black break-words">{lista.nombre}</h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">{lista.descripcion}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Información General */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Etapa:</span>
                <p className="font-bold text-gray-900">{lista.etapaKanban}</p>
              </div>
              <div>
                <span className="text-gray-600">Creado por:</span>
                <p className="font-bold text-gray-900 break-words">{lista.creadoPor}</p>
              </div>
              <div>
                <span className="text-gray-600">Fecha creación:</span>
                <p className="font-bold text-gray-900">
                  {new Date(lista.fechaCreacion).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Completitud:</span>
                <p className="font-bold text-blue-600">{lista.completitud}%</p>
              </div>
            </div>
          </div>

          {/* Items de Verificación */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Items de Verificación ({lista.items.length})
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {lista.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    item.completado
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-gray-200">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{item.texto}</p>
                      {item.responsable && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          <strong>Responsable:</strong> {item.responsable}
                        </p>
                      )}
                      {item.observaciones && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          <strong>Observaciones:</strong> {item.observaciones}
                        </p>
                      )}
                    </div>
                    {item.completado && (
                      <CheckCircle2 className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-4 sm:p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors text-sm sm:text-base"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VISTA PREVIA DE DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVistaPreviaProps {
  documento: DocumentoBiblioteca;
  onClose: () => void;
}

function ModalVistaPrevia({ documento, onClose }: ModalVistaPreviaProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documento.urlPreview) return;
    const url = resolveDocumentoUrl(documento.urlPreview);
    let revoked = false;
    setLoading(true);
    setError(null);
    fetch(url, { headers: getDocumentoFileHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(e => {
        if (!revoked) setError(e instanceof Error ? e.message : 'Error al cargar');
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });
    return () => {
      revoked = true;
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [documento.urlPreview]);

  const handleDescargarDesdeModal = useCallback(async () => {
    if (!documento.urlDownload) return;
    try {
      const url = resolveDocumentoUrl(documento.urlDownload);
      const res = await fetch(url, { headers: getDocumentoFileHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = u;
      link.download = documento.nombreArchivo || documento.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(u);
      toast.success('Descarga iniciada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    }
  }, [documento.urlDownload, documento.nombreArchivo, documento.nombre]);

  const srcParaPreview = documento.tipoMime?.startsWith('image/') || documento.tipoMime === 'application/pdf' ? blobUrl : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-black break-words">{documento.nombre}</h2>
              <p className="text-sm text-blue-100 mt-1">{documento.descripcion}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información General */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 text-xs">Categoría:</span>
                <p className="font-bold text-gray-900">{documento.categoria}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Subido por:</span>
                <p className="font-bold text-gray-900 break-words">{documento.subidoPor}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Fecha subida:</span>
                <p className="font-bold text-gray-900">
                  {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tamaño:</span>
                <p className="font-bold text-gray-900">{documento.tamano}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tipo:</span>
                <p className="font-bold text-gray-900">{documento.extension}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Descargas:</span>
                <p className="font-bold text-gray-900">{documento.descargas}</p>
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vista Previa
            </h3>
            <div className="flex items-center justify-center bg-white rounded-lg p-4 min-h-[200px]">
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Cargando...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={handleDescargarDesdeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Descargar archivo
                  </button>
                </div>
              ) : documento.tipoMime?.startsWith('image/') && srcParaPreview ? (
                <img
                  src={srcParaPreview}
                  alt={documento.nombre}
                  className="max-w-full max-h-96 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,...';
                  }}
                />
              ) : documento.tipoMime === 'application/pdf' && srcParaPreview ? (
                <iframe
                  src={srcParaPreview}
                  className="w-full h-96 border-0 rounded"
                  title={`Vista previa de ${documento.nombre}`}
                />
              ) : documento.tipoMime?.includes('word') || documento.tipoMime?.includes('excel') || documento.tipoMime?.includes('powerpoint') || documento.tipoMime?.includes('sheet') || documento.tipoMime?.includes('presentation') ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-amber-700 font-medium mb-4">Este tipo no se puede visualizar.</p>
                  <p className="text-sm text-gray-600 mb-4">Descargue el archivo para verlo.</p>
                  <button
                    onClick={handleDescargarDesdeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Descargar para ver
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-amber-700 font-medium mb-4">Este tipo no se puede visualizar.</p>
                  <p className="text-sm text-gray-600 mb-4">Descargue el archivo para verlo. Tipo: {documento.tipoMime || 'Desconocido'}</p>
                  <button
                    onClick={handleDescargarDesdeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Descargar archivo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: ELIMINAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalEliminarProps {
  documento: DocumentoBiblioteca;
  onClose: () => void;
  onConfirmar: () => void;
}

function ModalEliminar({ documento, onClose, onConfirmar }: ModalEliminarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Eliminar Documento</h2>
                  <p className="text-sm text-red-100 mt-1">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Advertencia */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">¿Confirmar eliminación?</h3>
                <p className="text-sm text-red-700">
                  Estás a punto de eliminar permanentemente este documento de la biblioteca. 
                  Esta acción no se puede revertir.
                </p>
              </div>
            </div>
          </div>

          {/* Información del Documento */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <File className="w-5 h-5 text-blue-600" />
              Información del Documento
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 text-xs">Nombre:</span>
                <p className="font-bold text-gray-900">{documento.nombre}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Categoría:</span>
                <p className="font-bold text-gray-900">{documento.categoria}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Subido por:</span>
                <p className="font-bold text-gray-900 break-words">{documento.subidoPor}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Fecha subida:</span>
                <p className="font-bold text-gray-900">
                  {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tamaño:</span>
                <p className="font-bold text-gray-900">{documento.tamano}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Descargas:</span>
                <p className="font-bold text-gray-900">{documento.descargas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Sí, Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: SUBIR / EDITAR DOCUMENTO (unificado)
// ════════════════════════════════════════════════════════════════════════════

interface ModalSubirDocumentoProps {
  onClose: () => void;
  onSubir: (documento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File; auditoriaId?: string; etapaKanbanId?: string; etapaNombreKanban?: string }) => void;
  onEditar?: (data: { nombre: string; descripcion: string; categoria?: CategoriaDocumento; etapaKanban?: string; etapaKanbanId?: string; etapaNombreKanban?: string; auditoriaId?: string | null }) => void;
  documentoEditar?: DocumentoBiblioteca;
  auditorias?: any[];
  /** Etapas dinámicas desde configuración Kanban (value = UUID, label = nombre) */
  etapasDisponibles?: { value: string; label: string }[];
}

function parseVersionNormativa(desc: string): { version: string; normativa: string } {
  let version = 'v1.0';
  let normativa = '';
  const versionMatch = desc.match(/Versión:\s*([^\n|]+)/i);
  const normativaMatch = desc.match(/Normativa:\s*([^\n|]+)/i);
  if (versionMatch) version = versionMatch[1].trim();
  if (normativaMatch) normativa = normativaMatch[1].trim();
  return { version, normativa };
}

function ModalSubirDocumento({ onClose, onSubir, onEditar, documentoEditar, auditorias = [], etapasDisponibles }: ModalSubirDocumentoProps) {
  const esEdicion = !!documentoEditar && !!onEditar;
  const { version: v0, normativa: n0 } = documentoEditar?.descripcion ? parseVersionNormativa(documentoEditar.descripcion) : { version: 'v1.0', normativa: '' };
  const [nombre, setNombre] = useState(documentoEditar?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(documentoEditar?.descripcion ?? '');
  const [categoria, setCategoria] = useState<CategoriaDocumento>(documentoEditar?.categoria ?? 'PLANTILLA');
  // etapaKanbanId guarda el UUID de la etapa (estable aunque cambie el nombre)
  // Para edición: inicializar con el ID guardado o buscar por enum
  const _NOMBRE_A_ETAPA_INIT: Record<string, EtapaKanban> = { 'Planeación': 'PLANEACION', 'Ejecución': 'EJECUCION', 'Comunicación': 'COMUNICACION', 'Seguimiento': 'SEGUIMIENTO', 'Cierre': 'CIERRE' };
  const initialEtapaId = documentoEditar?.etapaKanbanId ||
    (() => {
      const etapasInit = (etapasDisponibles && etapasDisponibles.length > 0) ? etapasDisponibles : [...ETAPAS_KANBAN_AUDITORIA_FALLBACK];
      console.log('🔍 [DEBUG MODAL INIT] etapasDisponibles recibidas:', etapasDisponibles);
      console.log('🔍 [DEBUG MODAL INIT] etapasInit:', etapasInit);
      const firstValue = etapasInit[0]?.value || '';
      console.log('🔍 [DEBUG MODAL INIT] initialEtapaId calculado:', firstValue);
      return etapasInit.find(e => _NOMBRE_A_ETAPA_INIT[e.label] === documentoEditar?.etapaKanban)?.value ||
             firstValue;
    })();
  const [etapaKanbanId, setEtapaKanbanId] = useState<string>(initialEtapaId);
  console.log('🔍 [DEBUG MODAL INIT] Estado inicial etapaKanbanId:', etapaKanbanId);

  // ✅ Si las etapas reales (UUID) cargan después de que el modal ya abrió,
  // sincronizar el valor seleccionado para no quedar con el string del fallback ('Planeación').
  useEffect(() => {
    if (!etapasDisponibles || etapasDisponibles.length === 0) return;
    const estaEnLista = etapasDisponibles.some(e => e.value === etapaKanbanId);
    if (!estaEnLista) {
      // El valor actual no es un UUID válido de la lista cargada → resetear al primero
      setEtapaKanbanId(etapasDisponibles[0].value);
    }
  }, [etapasDisponibles]);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [version, setVersion] = useState(v0 || 'v1.0');
  const [normativa, setNormativa] = useState(n0 || '');
  const [auditoriaAsociada, setAuditoriaAsociada] = useState<string>(documentoEditar?.auditoriaId ?? '');

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
    }
  };

  // Manejar drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setArchivo(file);
    }
  };

  // Función para obtener tamaño legible
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Función para obtener extensión
  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  // Validar y subir o editar
  const handleSubmit = () => {
    if (esEdicion) {
      let descFinal = descripcion;
      if (version || normativa) {
        const partes = [];
        if (version) partes.push(`Versión: ${version}`);
        if (normativa) partes.push(`Normativa: ${normativa}`);
        if (partes.length) descFinal = (descFinal ? descFinal + '\n\n' : '') + partes.join(' | ');
      }
      // ✅ OBTENER NOMBRE DE LA ETAPA SELECCIONADA (dinámico, sin mapeos)
      const etapasEd = (etapasDisponibles && etapasDisponibles.length > 0) ? etapasDisponibles : [...ETAPAS_KANBAN_AUDITORIA_FALLBACK];
      const etapaSeleccionada = etapasEd.find(e => e.value === etapaKanbanId);
      const nombreEtapaEdicion = etapaSeleccionada?.label || documentoEditar!.etapaKanban;

      console.log('🔍 [DEBUG MODAL EDIT] Enviando a confirmarEdicion:', {
        etapaKanban: nombreEtapaEdicion,
        etapaKanbanId: etapaKanbanId,
        etapaNombreKanban: nombreEtapaEdicion
      });

      onEditar?.({
        nombre: nombre.trim() || documentoEditar!.nombre,
        descripcion: descFinal,
        categoria,
        etapaKanban: nombreEtapaEdicion, // ✅ Nombre dinámico de la etapa (para UI)
        etapaKanbanId: etapaKanbanId, // ✅ UUID estable (para backend)
        etapaNombreKanban: nombreEtapaEdicion, // ✅ Snapshot del nombre (para backend)
        auditoriaId: auditoriaAsociada || null
      });
      onClose();
      return;
    }

    if (!archivo) {
      toast.error('❌ Debes seleccionar un archivo');
      return;
    }

    const archivoUrl = URL.createObjectURL(archivo);
    const nombreDocumento = nombre.trim() || archivo.name.replace(/\.[^/.]+$/, '');
    const tipoMime = archivo.type || 'application/octet-stream';
    let descFinal = descripcion;
    if (version || normativa) {
      const partes = [];
      if (version) partes.push(`Versión: ${version}`);
      if (normativa) partes.push(`Normativa: ${normativa}`);
      if (partes.length) descFinal = (descFinal ? descFinal + '\n\n' : '') + partes.join(' | ');
    }

    const nuevoDocumento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File; auditoriaId?: string; etapaKanbanId?: string; etapaNombreKanban?: string } = (() => {
      const etapasSubmit = (etapasDisponibles && etapasDisponibles.length > 0) ? etapasDisponibles : [...ETAPAS_KANBAN_AUDITORIA_FALLBACK];
      const etapaObj = etapasSubmit.find(e => e.value === etapaKanbanId);
      // Si no se encuentra por UUID, puede que sea el fallback con el nombre como value
      const etapaNombreKanban = etapaObj?.label || etapaKanbanId || undefined;
      const etapaIdFinal = etapaObj ? etapaObj.value : undefined;

      console.log('🔍 [DEBUG MODAL SUBMIT] etapaKanbanId actual:', etapaKanbanId);
      console.log('🔍 [DEBUG MODAL SUBMIT] etapaNombreKanban:', etapaNombreKanban);
      console.log('🔍 [DEBUG MODAL SUBMIT] etapaIdFinal:', etapaIdFinal);

      return {
        nombre: nombreDocumento,
        descripcion: descFinal,
        categoria,
        etapaKanban: etapaKanbanId as any, // campo legacy ignorado por backend
        etapaKanbanId: etapaIdFinal,
        etapaNombreKanban,
        archivoUrl,
        urlPreview: archivoUrl,
        urlDownload: archivoUrl,
        fechaSubida: new Date().toISOString(),
        subidoPor: 'Usuario Actual',
        tamano: formatFileSize(archivo!.size),
        extension: getMimeTypeLabel(tipoMime),
        tipoMime,
        nombreArchivo: archivo!.name,
        file: archivo!,
        ...(auditoriaAsociada && { auditoriaId: auditoriaAsociada })
      };
    })();

    onSubir(nuevoDocumento);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className={`flex-shrink-0 bg-gradient-to-r text-white p-6 rounded-t-xl ${esEdicion ? 'from-purple-600 to-purple-700' : 'from-blue-600 to-blue-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {esEdicion ? <Edit2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black">{esEdicion ? 'Editar Documento' : 'Subir Documento'}</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    {esEdicion ? 'Modifica los datos del documento (nombre, descripción, auditoría asociada)' : 'Agrega un nuevo documento a la biblioteca'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Nombre (editable en ambos modos; en crear se sobreescribe si hay archivo) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Nombre del documento</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: EXPLICACION DE UNIVERSO DE AUDITORIA"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Zona de Drag & Drop - solo en modo crear */}
          {!esEdicion && (
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Archivo <span className="text-red-600">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                arrastrando
                  ? 'border-blue-500 bg-blue-50'
                  : archivo
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {archivo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <File className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{archivo.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(archivo.size)} • {getFileExtension(archivo.name)}
                    </p>
                  </div>
                  <button
                    onClick={() => setArchivo(null)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Eliminar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      Arrastra tu archivo aquí
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      o haz click para seleccionar
                    </p>
                  </div>
                  <label className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-colors">
                    Seleccionar Archivo
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos soportados: PDF, Word, Excel, PowerPoint, Imágenes
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* En modo edición: mostrar archivo actual */}
          {esEdicion && documentoEditar && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-bold text-gray-700">Archivo actual</p>
              <p className="text-gray-600">{documentoEditar.nombreArchivo} ({documentoEditar.tamano})</p>
              <p className="text-xs text-gray-500">No se puede cambiar el archivo. Para reemplazarlo, elimina y sube uno nuevo.</p>
            </div>
          )}

          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tipo de Documento <span className="text-red-600">*</span>
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="OFICIO">Oficio</option>
              <option value="ACTA">Acta</option>
              <option value="LISTA_CHEQUEO">Lista de Chequeo</option>
              <option value="INFORME">Informe</option>
              <option value="EVIDENCIA">Evidencia</option>
              <option value="PLANTILLA">Plantilla</option>
              <option value="FORMATO">Formato</option>
              <option value="GUIA">Guía</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          {/* Etapa del Kanban */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Etapa <span className="text-red-600">*</span>
            </label>
            {(() => {
              const etapasModal = (etapasDisponibles && etapasDisponibles.length > 0)
                ? etapasDisponibles
                : [...ETAPAS_KANBAN_AUDITORIA_FALLBACK];
              return (
            <div className="flex gap-3">
              <select
                value={etapaKanbanId}
                onChange={(e) => setEtapaKanbanId(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
              >
                {etapasModal.map(etapa => (
                  <option key={etapa.value} value={etapa.value}>
                    {etapa.label}
                  </option>
                ))}
              </select>
              <div className="px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 font-semibold text-gray-600 min-w-[100px] flex items-center justify-center" title="Formato (del archivo)">
                {archivo ? getFileExtension(archivo.name) : '—'}
              </div>
            </div>
              );
            })()}
          </div>

          {/* Campos adicionales (Versión, Normativa, Auditoría) - disponibles para todas las etapas P-E-C */}
          <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Versión</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="Ej: v1.0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Normativa</label>
                  <input
                    type="text"
                    value={normativa}
                    onChange={(e) => setNormativa(e.target.value)}
                    placeholder="Ej: Guía DAFP v6 §4.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Auditoría asociada (opcional)</label>
                <select
                  value={auditoriaAsociada}
                  onChange={(e) => setAuditoriaAsociada(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                >
                  <option value="">General (disponible para todas las auditorías)</option>
                  {auditorias?.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo || a.nombre} {a.nombre ? `- ${a.nombre}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Si seleccionas una auditoría específica, la plantilla solo aparecerá asociada a ella.</p>
              </div>
          </>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe brevemente el contenido del documento..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!esEdicion && !archivo}
            className={`flex-1 px-6 py-3 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              esEdicion
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50'
            }`}
          >
            {esEdicion ? <Save className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            {esEdicion ? 'Guardar cambios' : 'Subir Documento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
