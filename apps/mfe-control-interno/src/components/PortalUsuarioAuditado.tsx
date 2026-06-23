/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTAL DEL USUARIO AUDITADO - CONTROL INTERNO DE GESTIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Vista del Portal Transaccional para usuarios que están siendo auditados.
 * Conectado al backend real mediante los endpoints de /auditorias/auditado/*.
 * 
 * Permite a administrativos y docentes:
 * - Ver sus procesos/auditorías activas (reales desde BD)
 * - Consultar el estado de cada auditoría
 * - Adjuntar documentos, pruebas y evidencias
 * - Responder a hallazgos (aceptar / controversia)
 * - Formular acciones correctivas en el Plan de Mejoramiento
 * - Enviar Plan de Mejoramiento a revisión OCI
 * 
 * VERSIÓN: 2.0 - INTEGRACIÓN BACKEND REAL
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, Clock, AlertCircle, CheckCircle2, FileText,
  Upload, Eye, Calendar, User, Download,
  Search, ChevronRight, Paperclip,
  Shield, ClipboardList, ClipboardCheck, Loader2,
  AlertTriangle, RefreshCw, ChevronLeft, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { TooltipGuia } from './TooltipGuia';
import { controlInternoService } from '../services/api/controlInternoService';
import { ModalDetallePlanMejoramiento } from './ModalDetallePlanMejoramiento';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface AuditoriaBackend {
  id: string;
  codigo: string;
  nombre?: string;
  titulo?: string;
  proceso?: string;
  tipo?: string;
  fase?: string;
  estadoKanban?: string;
  estado?: string;
  fechaCreacion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaNotificacion?: string;
  auditorLider?: string | { nombre: string; cargo?: string };
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  areaObjetivo?: string;
  hallazgosDetectados?: number;
  totalHallazgos?: number;
  descripcion?: string;
  objetivo?: string;
}

interface DocumentoBackend {
  id: string;
  nombre: string;
  nombreArchivo?: string;
  tipoDocumento?: string;
  tipoMime?: string;
  tamanioBytes?: number;
  fechaCreacion?: string;
  createdAt?: string;
  subidoPor?: string;
  estado?: string;
  etapa?: string;
  rutaArchivo?: string;
}

interface HallazgoBackend {
  id: string;
  codigo?: string;
  titulo?: string;
  descripcion?: string;
  criticidad?: string;
  gravedad?: string;
  estado?: string;
  recomendaciones?: string | string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TOOLTIPS
// ════════════════════════════════════════════════════════════════════════════

const TOOLTIP_PORTAL_AUDITADO = {
  titulo: 'Portal del Usuario Auditado',
  descripcion: 'Gestiona tus auditorías y responde a los requerimientos del equipo de Control Interno',
  pasos: [
    'Consulta las auditorías en las que estás involucrado y su estado actual',
    'Revisa los hallazgos identificados y las observaciones del auditor',
    'Adjunta los documentos, pruebas y evidencias solicitadas',
    'Formula acciones correctivas en el Plan de Mejoramiento',
    'Envía el Plan de Mejoramiento a revisión de la OCI'
  ],
  tips: [
    'Responde antes de la fecha límite para evitar sanciones o observaciones',
    'Adjunta evidencias claras y organizadas para facilitar la revisión',
    'Formula al menos una acción correctiva por cada hallazgo',
    'Envía el plan a revisión cuando todas las acciones estén formuladas'
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function obtenerTituloAuditoria(a: AuditoriaBackend): string {
  return a.nombre || a.titulo || a.proceso || 'Auditoría sin nombre';
}

function obtenerAuditorLider(a: AuditoriaBackend): string {
  if (typeof a.auditorLider === 'string') return a.auditorLider;
  if (a.auditorLider && typeof a.auditorLider === 'object') return a.auditorLider.nombre;
  return 'No asignado';
}

function obtenerEstado(a: AuditoriaBackend): string {
  return a.estadoKanban || a.fase || a.estado || 'Desconocido';
}

function formatearFecha(fecha?: string): string {
  if (!fecha) return '—';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return fecha;
  }
}

function formatearTamano(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function calcularDiasRestantes(fechaFin?: string): number | null {
  if (!fechaFin) return null;
  try {
    const fin = new Date(fechaFin);
    if (isNaN(fin.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface PortalUsuarioAuditadoProps {
  onVolver: () => void;
}

export function PortalUsuarioAuditado({ onVolver }: PortalUsuarioAuditadoProps) {
  const [auditorias, setAuditorias] = useState<AuditoriaBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaBackend | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState('');

  const cargarAuditorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await controlInternoService.getMisAuditoriasAuditado();
      setAuditorias(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[PortalAuditado] Error cargando auditorías:', err);
      setError(err?.message || 'No se pudieron cargar las auditorías');
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarAuditorias();
  }, [cargarAuditorias]);

  const estadosUnicos = useMemo(() => {
    const set = new Set(auditorias.map(a => obtenerEstado(a)));
    return Array.from(set);
  }, [auditorias]);

  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter(aud => {
      const estado = obtenerEstado(aud);
      const matchEstado = filtroEstado === 'Todas' || estado === filtroEstado;
      const titulo = obtenerTituloAuditoria(aud).toLowerCase();
      const codigo = (aud.codigo || '').toLowerCase();
      const search = busqueda.toLowerCase();
      const matchBusqueda = titulo.includes(search) || codigo.includes(search);
      return matchEstado && matchBusqueda;
    });
  }, [auditorias, filtroEstado, busqueda]);

  const handleVerDetalle = (auditoria: AuditoriaBackend) => {
    setAuditoriaSeleccionada(auditoria);
    setVistaActual('detalle');
  };

  const handleVolverLista = () => {
    setVistaActual('lista');
    setAuditoriaSeleccionada(null);
  };

  if (vistaActual === 'detalle' && auditoriaSeleccionada) {
    return (
      <DetalleAuditoria 
        auditoria={auditoriaSeleccionada}
        onVolver={handleVolverLista}
      />
    );
  }

  const activas = auditorias.filter(a => {
    const e = obtenerEstado(a).toLowerCase();
    return e !== 'finalizada' && e !== 'archivada';
  }).length;
  const finalizadas = auditorias.filter(a => {
    const e = obtenerEstado(a).toLowerCase();
    return e === 'finalizada' || e === 'archivada';
  }).length;
  const conPlanPendiente = auditorias.filter(a => {
    const e = obtenerEstado(a).toLowerCase();
    return e === 'comunicacion' || e === 'comunicación';
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {onVolver && (
            <motion.button
              onClick={onVolver}
              className="inline-flex items-center gap-2 px-3 py-2 mb-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-[#2962FF] hover:text-[#2962FF] font-medium transition-all text-sm group"
              whileHover={{ scale: 1.02, x: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Volver al Dashboard
            </motion.button>
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)' }}
                >
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mis Auditorías</h1>
                  <p className="text-xs text-gray-600">
                    Portal del Usuario Auditado — Control Interno de Gestión
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarAuditorias}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <TooltipGuia {...TOOLTIP_PORTAL_AUDITADO} />
            </div>
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <Card className="p-3 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-600 mb-0.5">Total</p>
                  <p className="text-xl font-bold text-gray-900">{auditorias.length}</p>
                </div>
                <FolderOpen className="w-6 h-6 text-blue-500" />
              </div>
            </Card>

            <Card className="p-3 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-600 mb-0.5">Activas</p>
                  <p className="text-xl font-bold text-gray-900">{activas}</p>
                </div>
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </Card>

            <Card className="p-3 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-600 mb-0.5">Plan pendiente</p>
                  <p className="text-xl font-bold text-gray-900">{conPlanPendiente}</p>
                </div>
                <ClipboardCheck className="w-6 h-6 text-purple-500" />
              </div>
            </Card>

            <Card className="p-3 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-600 mb-0.5">Finalizadas</p>
                  <p className="text-xl font-bold text-gray-900">{finalizadas}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* FILTROS */}
        <Card className="p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o título..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todas las auditorías</option>
              {estadosUnicos.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* ESTADO DE CARGA */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando auditorías...</span>
          </div>
        )}

        {error && !loading && (
          <Card className="p-8">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={cargarAuditorias}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Reintentar
              </button>
            </div>
          </Card>
        )}

        {/* LISTA DE AUDITORÍAS */}
        {!loading && !error && (
          <div className="space-y-3">
            {auditoriasFiltradas.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {auditorias.length === 0 ? 'No tienes auditorías asignadas' : 'Sin resultados'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {auditorias.length === 0
                      ? 'Cuando se te asigne una auditoría, aparecerá aquí'
                      : 'No hay auditorías que coincidan con los filtros'}
                  </p>
                </div>
              </Card>
            ) : (
              auditoriasFiltradas.map((auditoria) => (
                <TarjetaAuditoria
                  key={auditoria.id}
                  auditoria={auditoria}
                  onVerDetalle={handleVerDetalle}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaAuditoriaProps {
  auditoria: AuditoriaBackend;
  onVerDetalle: (auditoria: AuditoriaBackend) => void;
}

function TarjetaAuditoria({ auditoria, onVerDetalle }: TarjetaAuditoriaProps) {
  const estado = obtenerEstado(auditoria);
  const diasRestantes = calcularDiasRestantes(auditoria.fechaFin);
  const esUrgente = diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 5;
  const esVencida = diasRestantes !== null && diasRestantes < 0;

  const estadoColors: Record<string, { bg: string; text: string; border: string }> = {
    'Planeación': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    'Planeacion': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    'Ejecución': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'Ejecucion': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'Comunicación': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    'Comunicacion': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    'Seguimiento': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    'Finalizada': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  };

  const colors = estadoColors[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  const borderColor = esVencida ? '#EF4444' : esUrgente ? '#F59E0B' : '#3B82F6';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="p-4 hover:shadow-lg transition-all cursor-pointer border-l-4"
        style={{ borderLeftColor: borderColor }}
        onClick={() => onVerDetalle(auditoria)}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-gray-600">{auditoria.codigo}</span>
              <Badge className={`${colors.bg} ${colors.text} border ${colors.border} text-[11px]`}>
                {estado}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {obtenerTituloAuditoria(auditoria)}
            </h3>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {obtenerAuditorLider(auditoria)}
              </span>
              {auditoria.areaObjetivo && (
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />
                  {auditoria.areaObjetivo}
                </span>
              )}
              {auditoria.fechaFin && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Hasta: {formatearFecha(auditoria.fechaFin)}
                </span>
              )}
            </div>
          </div>

          {/* FECHA LIMITE Y ACCIONES */}
          <div className="flex items-center gap-3 lg:w-48">
            {diasRestantes !== null && estado !== 'Finalizada' && (
              <div className={`text-center p-2 rounded-lg flex-1 ${
                esVencida ? 'bg-red-50 border border-red-200' :
                esUrgente ? 'bg-amber-50 border border-amber-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                {!esVencida ? (
                  <p className={`text-xs font-medium ${esUrgente ? 'text-amber-700' : 'text-gray-700'}`}>
                    {diasRestantes} días restantes
                  </p>
                ) : (
                  <p className="text-xs text-red-700 font-semibold">
                    Vencida hace {Math.abs(diasRestantes)} días
                  </p>
                )}
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onVerDetalle(auditoria); }}
              className="px-3 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-1 text-xs font-medium whitespace-nowrap"
            >
              Ver Detalle
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: DETALLE DE AUDITORÍA (con backend real)
// ════════════════════════════════════════════════════════════════════════════

interface DetalleAuditoriaProps {
  auditoria: AuditoriaBackend;
  onVolver: () => void;
}

function DetalleAuditoria({ auditoria, onVolver }: DetalleAuditoriaProps) {
  const [tabActiva, setTabActiva] = useState<'documentos' | 'hallazgos' | 'plan'>('documentos');
  const [documentos, setDocumentos] = useState<DocumentoBackend[]>([]);
  const [hallazgos, setHallazgos] = useState<HallazgoBackend[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [planIdAbierto, setPlanIdAbierto] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoadingData(true);
    try {
      const [docsData, hallData, planesData] = await Promise.all([
        controlInternoService.getMisDocumentosAuditoria(auditoria.id).catch(() => []),
        controlInternoService.getMisHallazgosAuditoria(auditoria.id).catch(() => []),
        controlInternoService.getPlanesMejoramientoAuditado(auditoria.id).catch(() => []),
      ]);
      setDocumentos(Array.isArray(docsData) ? docsData : []);
      setHallazgos(Array.isArray(hallData) ? hallData : []);
      setPlanes(Array.isArray(planesData) ? planesData : []);
    } catch (err) {
      console.error('[PortalAuditado] Error cargando datos del detalle:', err);
    } finally {
      setLoadingData(false);
    }
  }, [auditoria.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSubirDocumento = async () => {
    if (!archivoSeleccionado) {
      toast.error('Selecciona un archivo primero');
      return;
    }
    setSubiendoArchivo(true);
    try {
      await controlInternoService.uploadDocumentoAuditado(
        auditoria.id,
        archivoSeleccionado,
        {
          nombre: archivoSeleccionado.name,
          tipoDocumento: 'EVIDENCIA',
          etapa: 'comunicacion',
        }
      );
      toast.success('Documento subido correctamente', {
        description: `${archivoSeleccionado.name} se ha cargado exitosamente`
      });
      setArchivoSeleccionado(null);
      // Recargar documentos
      const docsData = await controlInternoService.getMisDocumentosAuditoria(auditoria.id).catch(() => []);
      setDocumentos(Array.isArray(docsData) ? docsData : []);
    } catch (err: any) {
      toast.error('Error al subir documento', {
        description: err?.message || 'Intenta de nuevo'
      });
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const estado = obtenerEstado(auditoria);

  const tabs = [
    { id: 'documentos' as const, label: 'Documentos', count: documentos.length, icon: FileText },
    { id: 'hallazgos' as const, label: 'Hallazgos', count: hallazgos.length, icon: AlertCircle },
    { id: 'plan' as const, label: 'Plan de mejoramiento', count: planes.length, icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver a Mis Auditorías</span>
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-xs font-mono text-gray-600">{auditoria.codigo}</span>
                <Badge className={`text-[11px] ${
                  estado === 'Comunicación' || estado === 'Comunicacion' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  estado === 'Ejecución' || estado === 'Ejecucion' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  estado === 'Seguimiento' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                  estado === 'Finalizada' ? 'bg-green-100 text-green-800 border border-green-200' :
                  'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  {estado}
                </Badge>
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">
                {obtenerTituloAuditoria(auditoria)}
              </h1>
              {(auditoria.descripcion || auditoria.objetivo) && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {auditoria.descripcion || auditoria.objetivo}
                </p>
              )}
            </div>
          </div>

          {/* INFO RÁPIDA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">Auditor Líder</p>
                <p className="text-xs font-medium text-gray-900 truncate">{obtenerAuditorLider(auditoria)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">Fecha Fin</p>
                <p className="text-xs font-medium text-gray-900">{formatearFecha(auditoria.fechaFin)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Hallazgos</p>
                <p className="text-xs font-medium text-gray-900">{hallazgos.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-500">Documentos</p>
                <p className="text-xs font-medium text-gray-900">{documentos.length}</p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    tabActiva === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      tabActiva === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando datos...</span>
          </div>
        ) : (
          <>
            {tabActiva === 'documentos' && (
              <TabDocumentos 
                documentos={documentos}
                archivoSeleccionado={archivoSeleccionado}
                setArchivoSeleccionado={setArchivoSeleccionado}
                onSubir={handleSubirDocumento}
                subiendo={subiendoArchivo}
              />
            )}

            {tabActiva === 'hallazgos' && (
              <TabHallazgos
                hallazgos={hallazgos}
                auditoriaId={auditoria.id}
                onHallazgoActualizado={cargarDatos}
              />
            )}

            {tabActiva === 'plan' && (
              <TabPlanMejoramiento
                planes={planes}
                auditoriaId={auditoria.id}
                onPlanSeleccionado={(planId) => setPlanIdAbierto(planId)}
                onPlanesActualizados={cargarDatos}
              />
            )}
          </>
        )}
      </div>

      {/* MODAL DETALLE PLAN */}
      {planIdAbierto && (
        <ModalDetallePlanMejoramiento
          planId={planIdAbierto}
          onClose={() => setPlanIdAbierto(null)}
          onPlanActualizado={cargarDatos}
          modoPortal={true}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

function TabDocumentos({ 
  documentos, 
  archivoSeleccionado, 
  setArchivoSeleccionado, 
  onSubir,
  subiendo
}: {
  documentos: DocumentoBackend[];
  archivoSeleccionado: File | null;
  setArchivoSeleccionado: (file: File | null) => void;
  onSubir: () => void;
  subiendo: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* SUBIR DOCUMENTO */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Subir Nuevo Documento</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600 mb-1">
                  {archivoSeleccionado ? archivoSeleccionado.name : 'Arrastra o haz clic para seleccionar'}
                </p>
                <p className="text-[10px] text-gray-500">PDF, Word, Excel, Imagen (máx. 50MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
            </label>
          </div>
          <button
            onClick={onSubir}
            disabled={!archivoSeleccionado || subiendo}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center text-sm self-end"
          >
            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {subiendo ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </Card>

      {/* LISTA DE DOCUMENTOS */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Documentos ({documentos.length})
        </h3>
        {documentos.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay documentos aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre || doc.nombreArchivo || 'Sin nombre'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      {doc.tipoDocumento && <span>{doc.tipoDocumento}</span>}
                      {doc.tamanioBytes && <span>• {formatearTamano(doc.tamanioBytes)}</span>}
                      {(doc.fechaCreacion || doc.createdAt) && (
                        <span>• {formatearFecha(doc.fechaCreacion || doc.createdAt)}</span>
                      )}
                      {doc.subidoPor && <span>• {doc.subidoPor}</span>}
                      {doc.etapa && (
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] px-1 py-0">{doc.etapa}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.estado && (
                    <Badge className={
                      doc.estado === 'aprobado' ? 'bg-green-100 text-green-800 border border-green-200 text-[10px]' :
                      doc.estado === 'rechazado' ? 'bg-red-100 text-red-800 border border-red-200 text-[10px]' :
                      'bg-gray-100 text-gray-800 border border-gray-200 text-[10px]'
                    }>
                      {doc.estado}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB HALLAZGOS
// ════════════════════════════════════════════════════════════════════════════

function TabHallazgos({ 
  hallazgos, 
  auditoriaId,
  onHallazgoActualizado
}: { 
  hallazgos: HallazgoBackend[];
  auditoriaId: string;
  onHallazgoActualizado: () => void;
}) {
  const [procesando, setProcesando] = useState<string | null>(null);

  const handleAceptar = async (hallazgoId: string) => {
    setProcesando(hallazgoId);
    try {
      await controlInternoService.aceptarMiHallazgo(auditoriaId, hallazgoId);
      toast.success('Hallazgo aceptado');
      onHallazgoActualizado();
    } catch (err: any) {
      toast.error('Error al aceptar', { description: err?.message });
    } finally {
      setProcesando(null);
    }
  };

  if (hallazgos.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No se han registrado hallazgos en esta auditoría</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {hallazgos.map((hallazgo) => {
        const criticidad = (hallazgo.criticidad || hallazgo.gravedad || 'MODERADO').toUpperCase();
        const estado = (hallazgo.estado || '').toLowerCase();
        const esNotificado = estado === 'notificado';
        
        return (
          <Card key={hallazgo.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={
                    criticidad === 'ALTA' || criticidad === 'GRAVE' ? 'bg-red-100 text-red-800 border border-red-200 text-[10px]' :
                    criticidad === 'MEDIA' || criticidad === 'MODERADO' ? 'bg-amber-100 text-amber-800 border border-amber-200 text-[10px]' :
                    'bg-yellow-100 text-yellow-800 border border-yellow-200 text-[10px]'
                  }>
                    {criticidad}
                  </Badge>
                  {hallazgo.codigo && (
                    <span className="text-[10px] text-gray-500 font-mono">{hallazgo.codigo}</span>
                  )}
                  {hallazgo.estado && (
                    <Badge className={
                      estado === 'aceptado' ? 'bg-green-100 text-green-800 border border-green-200 text-[10px]' :
                      estado === 'en-controversia' ? 'bg-orange-100 text-orange-800 border border-orange-200 text-[10px]' :
                      'bg-blue-100 text-blue-800 border border-blue-200 text-[10px]'
                    }>
                      {hallazgo.estado}
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {hallazgo.titulo || hallazgo.descripcion?.substring(0, 60) || 'Hallazgo'}
                </h3>
              </div>
            </div>
            {hallazgo.descripcion && (
              <p className="text-xs text-gray-700 mb-2">{hallazgo.descripcion}</p>
            )}
            {hallazgo.recomendaciones && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-gray-600 mb-1">Recomendaciones:</p>
                <p className="text-xs text-blue-700">
                  {Array.isArray(hallazgo.recomendaciones) 
                    ? hallazgo.recomendaciones.join('; ') 
                    : hallazgo.recomendaciones}
                </p>
              </div>
            )}

            {/* Acciones del auditado */}
            {esNotificado && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleAceptar(hallazgo.id)}
                  disabled={procesando === hallazgo.id}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {procesando === hallazgo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Aceptar
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB PLAN DE MEJORAMIENTO
// ════════════════════════════════════════════════════════════════════════════

function TabPlanMejoramiento({
  planes,
  auditoriaId,
  onPlanSeleccionado,
  onPlanesActualizados,
}: {
  planes: any[];
  auditoriaId: string;
  onPlanSeleccionado: (planId: string) => void;
  onPlanesActualizados: () => void;
}) {
  if (planes.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sin Plan de Mejoramiento
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            La OCI aún no ha creado un plan de mejoramiento para esta auditoría.
          </p>
          <p className="text-xs text-gray-500">
            Cuando el equipo de Control Interno cree el plan, aparecerá aquí para que puedas formular las acciones correctivas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {planes.map((plan) => {
        const estado = (plan.estado || '').toUpperCase();
        const codigo = plan.codigo || 'PM-SIN-CÓDIGO';
        const titulo = plan.titulo || plan.nombre || 'Plan de Mejoramiento';
        const totalAcciones = plan.totalAcciones ?? plan.acciones?.length ?? 0;
        const accionesCompletadas = plan.accionesCompletadas ?? 0;
        const porcentaje = plan.porcentajeAvance ?? (totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0);

        const estadoConfig: Record<string, { bg: string; text: string; label: string }> = {
          'BORRADOR': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
          'FORMULACION': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Formulación' },
          'REVISION': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En Revisión OCI' },
          'APROBADO': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' },
          'EN_EJECUCION': { bg: 'bg-green-100', text: 'text-green-700', label: 'En Ejecución' },
          'COMPLETADO': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completado' },
          'RECHAZADO': { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
        };
        const eConf = estadoConfig[estado] || { bg: 'bg-gray-100', text: 'text-gray-700', label: estado };

        const puedeFormular = estado === 'BORRADOR' || estado === 'FORMULACION' || estado === 'RECHAZADO';

        return (
          <Card key={plan.id} className="p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-600">{codigo}</span>
                  <Badge className={`${eConf.bg} ${eConf.text} border text-[10px]`}>
                    {eConf.label}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
              </div>
            </div>

            {/* Progreso */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-600">
                  {accionesCompletadas}/{totalAcciones} acciones completadas
                </span>
                <span className="text-[10px] font-medium text-gray-900">{porcentaje}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all bg-blue-600"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>

            {/* Info adicional */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 mb-3">
              {plan.fechaCreacion && (
                <span>Creado: {formatearFecha(plan.fechaCreacion)}</span>
              )}
              {plan.fechaLimite && (
                <span>Límite: {formatearFecha(plan.fechaLimite)}</span>
              )}
              {plan.areaResponsable && (
                <span>Área: {plan.areaResponsable}</span>
              )}
            </div>

            {/* Mensaje contextual */}
            {puedeFormular && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-amber-800">
                  <strong>Acción requerida:</strong> Debes formular las acciones correctivas para cada hallazgo
                  y luego enviar el plan a revisión de la OCI.
                </p>
              </div>
            )}

            {estado === 'REVISION' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-blue-800">
                  El plan fue enviado a revisión. La OCI lo aprobará o rechazará.
                </p>
              </div>
            )}

            {estado === 'RECHAZADO' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-red-800">
                  <strong>Rechazado por la OCI.</strong> Revisa las observaciones, ajusta las acciones y reenvía.
                </p>
              </div>
            )}

            {/* Botón de acción */}
            <div className="flex gap-2">
              <button
                onClick={() => onPlanSeleccionado(plan.id)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  puedeFormular
                    ? 'bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white hover:shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                {puedeFormular ? 'Formular Acciones Correctivas' : 'Ver Plan'}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}