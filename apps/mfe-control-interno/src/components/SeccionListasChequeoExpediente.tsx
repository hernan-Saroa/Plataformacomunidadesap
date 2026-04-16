/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SECCIÓN LISTAS DE CHEQUEO - EXPEDIENTE DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente integrado que muestra y gestiona las listas de chequeo
 * vinculadas a la auditoría actual según su etapa en el Kanban.
 * 
 * FUNCIONALIDADES:
 * ✅ Mostrar listas de chequeo de la etapa actual
 * ✅ Completar items de las listas
 * ✅ Adjuntar documentos diligenciados
 * ✅ Ver documentos de la biblioteca
 * ✅ Progreso visual por lista
 * ✅ Navegación al módulo completo de listas
 * 
 * INTEGRACIÓN:
 * - Se usa en ExpedienteAuditoriaCompleto (tabs de cada fase)
 * - Conecta con el módulo ListasChequeoModule
 * - Sincroniza con el estado global de la auditoría
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import {
  CheckSquare, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Paperclip, Download, ExternalLink, FileText, Upload, X,
  AlertCircle, Calendar, User, Loader2, CheckCircle, ClipboardList, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const getDocumentosBaseUrl = () => {
  if (API_MODE === 'gateway') return '/services/control-institucional/api/v1/documentos';
  return `${getServiceUrl('control-institucional')}/documentos`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EtapaKanban = 'Plan Anual' | 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento';

interface ItemChequeo {
  id: string;
  texto: string;
  completado: boolean;
  responsable?: string;
  fechaCompletado?: string;
  observaciones?: string;
  documentoBibliotecaId?: string;
  documentoNombre?: string;
  archivoSubidoId?: string;
  archivoSubidoNombre?: string;
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
  etapaKanban: EtapaKanban;
  etapaKanbanId?: string;
  items: ItemChequeo[];
  documentosAdjuntos: DocumentoAdjunto[];
  completitud: number;
  activa: boolean;
}

interface SeccionListasChequeoExpedienteProps {
  auditoriaId: string;
  etapaActual: EtapaKanban;
  readOnly?: boolean; // ✅ Modo solo lectura (deshabilita edición)
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PARA MAPEAR DATOS DEL BACKEND AL FORMATO DE UI
// ════════════════════════════════════════════════════════════════════════════

function mapApiListaToExpediente(apiLista: any): ListaChequeo {
  // Preferir etapaNombreKanban del backend (viene del registro de la etapa real del Kanban).
  // Fallback: mapear desde el campo tipo para compatibilidad con datos anteriores.
  const VALID_STAGES: EtapaKanban[] = ['Plan Anual', 'Planeación', 'Ejecución', 'Comunicación', 'Seguimiento'];

  const tipoToEtapa: Record<string, EtapaKanban> = {
    'planeacion': 'Planeación',
    'PLANEACION': 'Planeación',
    'ejecucion': 'Ejecución',
    'EJECUCION': 'Ejecución',
    'comunicacion': 'Comunicación',
    'COMUNICACION': 'Comunicación',
    'seguimiento': 'Seguimiento',
    'SEGUIMIENTO': 'Seguimiento',
    'plan_anual': 'Plan Anual',
    'PLAN_ANUAL': 'Plan Anual'
  };

  // etapaNombreKanban viene directamente del Kanban configurado
  const etapaNombreRaw: string = apiLista.etapaNombreKanban || '';
  const etapaFromKanban = VALID_STAGES.find(s => s === etapaNombreRaw) ||
                          VALID_STAGES.find(s => s.toLowerCase() === etapaNombreRaw.toLowerCase());
  const etapaKanban: EtapaKanban = etapaFromKanban || tipoToEtapa[apiLista.tipo] || 'Planeación';

  const items: ItemChequeo[] = (apiLista.items || []).map((item: any, idx: number) => ({
    id: item.id?.toString() || `item-${idx}`,
    texto: item.texto || item.nombre || '',
    completado: item.completado || item.checked || false,
    responsable: item.responsable || item.completadoPor || item.usuario_completado || undefined,
    fechaCompletado: item.fecha_completado || item.fechaCompletado || undefined,
    observaciones: item.observaciones || undefined,
    documentoBibliotecaId: item.documentoBibliotecaId || undefined,
    documentoNombre: item.documentoNombre || item.documentoNombre || undefined,
  }));

  const documentosAdjuntos: DocumentoAdjunto[] = (apiLista.documentos || []).map((doc: any) => ({
    documentoBibliotecaId: doc.id?.toString() || '',
    nombreDocumento: doc.nombre || doc.nombreDocumento || '',
    diligenciado: doc.diligenciado || doc.completado || false,
    archivoSubidoUrl: doc.url || doc.archivoUrl || undefined,
    fechaSubida: doc.fecha_subida || doc.fechaSubida || undefined
  }));

  const itemsCompletados = items.filter(i => i.completado).length;
  const completitud = items.length > 0 ? Math.round((itemsCompletados / items.length) * 100) : 0;

  return {
    id: apiLista.id?.toString() || '',
    nombre: apiLista.nombre || '',
    descripcion: apiLista.descripcion || '',
    etapaKanban,
    etapaKanbanId: apiLista.etapaKanbanId?.toString() || undefined,
    items,
    documentosAdjuntos,
    completitud,
    activa: apiLista.activa !== false
  };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function SeccionListasChequeoExpediente({
  auditoriaId,
  etapaActual,
  readOnly = false
}: SeccionListasChequeoExpedienteProps) {
  const [listas, setListas] = useState<ListaChequeo[]>([]);
  const [listaExpandida, setListaExpandida] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalUpload, setModalUpload] = useState<{ listaId: string; doc: DocumentoAdjunto; itemId?: string } | null>(null);

  // ✅ CARGAR LISTAS DE CHEQUEO VINCULADAS A LA AUDITORÍA
  const cargarListasAuditoria = useCallback(async () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!auditoriaId || !uuidRegex.test(auditoriaId)) {
      console.warn(`[ListasChequeo] auditoriaId inválido: ${auditoriaId}`);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      // Cargar listas y documentos subidos en paralelo
      const [listasApi, docsSubidos] = await Promise.all([
        controlInternoService.getListasAplicadas(auditoriaId),
        controlInternoService.getDocumentosByAuditoria(auditoriaId).catch(() => [] as any[]),
      ]);

      // Construir mapa: documentoBibliotecaId → documento subido
      const docPorBibliotecaId = new Map<string, { id: string; nombre: string }>();
      for (const d of (docsSubidos || [])) {
        if (d.documentoBibliotecaId) {
          docPorBibliotecaId.set(d.documentoBibliotecaId, {
            id: d.id,
            nombre: d.nombreArchivo || d.nombre || d.nombreDocumento || '',
          });
        }
      }

      const listasMapeadas = (listasApi || []).map((apiLista: any) => {
        const lista = mapApiListaToExpediente(apiLista);
        // Para cada ítem que tenga plantilla, buscar si ya fue subido
        lista.items = lista.items.map(item => {
          if (item.documentoBibliotecaId && !item.archivoSubidoId) {
            const docSubido = docPorBibliotecaId.get(item.documentoBibliotecaId);
            if (docSubido) {
              return { ...item, archivoSubidoId: docSubido.id, archivoSubidoNombre: docSubido.nombre };
            }
          }
          return item;
        });
        return lista;
      });

      setListas(listasMapeadas);
    } catch (error) {
      console.error('[ListasChequeo] ❌ Error cargando listas:', error);
      setLoadError('No se pudieron cargar las listas de chequeo');
    } finally {
      setIsLoading(false);
    }
  }, [auditoriaId]);

  useEffect(() => {
    cargarListasAuditoria();
  }, [cargarListasAuditoria]);

  const handleDescargarDoc = async (urlOrId: string, nombre?: string) => {
    const baseUrl = getDocumentosBaseUrl();
    const url = urlOrId.startsWith('http') || urlOrId.startsWith('/')
      ? urlOrId
      : `${baseUrl}/${urlOrId}/download`;
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    try {
      const res = await fetch(fullUrl, { headers: getDefaultHeaders() });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Descarga iniciada');
    } catch (e) {
      toast.error('No se pudo descargar el documento');
    }
  };

  // Filtrar listas por la etapa actual. Si no hay coincidencias el componente retorna null.
  const listasEtapaActual = listas.filter(lista => lista.etapaKanban === etapaActual);

  const toggleItem = async (listaId: string, itemId: string) => {
    // ✅ VALIDACIÓN: No permitir edición en modo solo lectura
    if (readOnly) {
      toast.info('👁️ Solo lectura', {
        description: 'Esta lista es solo para visualización. No se puede editar.',
        duration: 3000
      });
      return;
    }

    // ✅ VALIDACIÓN: Solo permitir toggle si la lista pertenece a la etapa actual
    const lista = listas.find(l => l.id === listaId);
    if (!lista) return;
    
    if (lista.etapaKanban !== etapaActual) {
      toast.error('🔒 Acción no permitida', {
        description: `Solo puedes completar listas de la etapa actual: ${etapaActual}`,
        duration: 4000
      });
      return;
    }

    const item = lista.items.find(i => i.id === itemId);
    if (!item) return;

    const nuevoEstado = !item.completado;
    const fechaCompletado = nuevoEstado ? new Date().toISOString().split('T')[0] : undefined;

    // Actualizar UI optimistamente
    setListas(prev => prev.map(l => {
      if (l.id === listaId) {
        const nuevosItems = l.items.map(i => {
          if (i.id === itemId) {
            return {
              ...i,
              completado: nuevoEstado,
              fechaCompletado,
              responsable: nuevoEstado ? 'Usuario Actual' : i.responsable
            };
          }
          return i;
        });

        const itemsCompletados = nuevosItems.filter(i => i.completado).length;
        const completitud = Math.round((itemsCompletados / nuevosItems.length) * 100);

        return { ...l, items: nuevosItems, completitud };
      }
      return l;
    }));

    // Llamar al backend con auditoriaId para guardar estado específico
    try {
      await controlInternoService.actualizarItemLista(listaId, itemId, {
        completado: nuevoEstado,
        fechaCompletado,
        responsable: nuevoEstado ? 'Usuario Actual' : undefined,
        auditoriaId // ✅ Enviar auditoriaId para guardar estado específico de esta auditoría
      });

      toast.success(
        nuevoEstado 
          ? '✅ Item marcado como completado' 
          : '⭕ Item marcado como pendiente'
      );
    } catch (error) {
      console.error('[ListasChequeo] Error actualizando item:', error);
      // Revertir cambio en caso de error
      setListas(prev => prev.map(l => {
        if (l.id === listaId) {
          const nuevosItems = l.items.map(i => {
            if (i.id === itemId) {
              return { ...i, completado: !nuevoEstado };
            }
            return i;
          });
          const itemsCompletados = nuevosItems.filter(i => i.completado).length;
          const completitud = Math.round((itemsCompletados / nuevosItems.length) * 100);
          return { ...l, items: nuevosItems, completitud };
        }
        return l;
      }));
      toast.error('Error al actualizar', {
        description: 'No se pudo guardar el cambio. Intente nuevamente.'
      });
    }
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Cargando listas de chequeo...
          </h3>
          <p className="text-gray-600">
            Obteniendo listas vinculadas a esta auditoría
          </p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (loadError) {
    return (
      <div className="bg-white rounded-xl border-2 border-red-200 p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">
            Error al cargar listas
          </h3>
          <p className="text-red-600 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const navegarAModuloListasChequeo = () => {
    window.dispatchEvent(new CustomEvent('navegarModuloControlInterno', {
      detail: { seccion: 'listas-chequeo', auditoriaId }
    }));
  };

  if (listasEtapaActual.length === 0) {
    return null;
  }

  const etapaBorderColors: Record<EtapaKanban, string> = {
    'Plan Anual': 'border-gray-200',
    'Planeación': 'border-blue-200',
    'Ejecución': 'border-amber-200',
    'Comunicación': 'border-green-200',
    'Seguimiento': 'border-indigo-200'
  };

  return (
    <div className={`bg-white border-2 ${etapaBorderColors[etapaActual]} rounded-lg p-4`}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Listas de Chequeo - {etapaActual}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {listasEtapaActual.length} lista(s) configurada(s) para esta etapa
          </p>
        </div>
        <button
          onClick={navegarAModuloListasChequeo}
          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver Todas las Listas
        </button>
      </div>

      {/* Listas de Chequeo */}
      <div className="space-y-3">
        {listasEtapaActual.map((lista) => {
          const esEtapaActual = lista.etapaKanban === etapaActual;
          const expanded = listaExpandida === lista.id;
          const itemsTotal = lista.items.length;
          const itemsDone = lista.items.filter(i => i.completado).length;
          const docsTotal = lista.documentosAdjuntos.length;
          const docsDone = lista.documentosAdjuntos.filter(d => d.diligenciado).length;
          const pct = lista.completitud;

          // Ring color by progress
          const ringColor = pct === 100 ? 'text-emerald-500' : pct > 50 ? 'text-blue-500' : pct > 0 ? 'text-amber-500' : 'text-gray-300';

          return (
            <div
              key={lista.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                expanded
                  ? 'border-blue-300 shadow-md shadow-blue-100'
                  : esEtapaActual
                  ? 'border-gray-200 hover:border-blue-200 hover:shadow-sm'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {/* ── HEADER del acordeón ── */}
              <button
                type="button"
                onClick={() => setListaExpandida(expanded ? null : lista.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  expanded ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Ring de progreso */}
                <div className="relative flex-shrink-0 w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : pct > 0 ? '#f59e0b' : '#e5e7eb'}
                      strokeWidth="3"
                      strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${ringColor}`}>
                    {pct}%
                  </span>
                </div>

                {/* Título y meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-gray-900 truncate">{lista.nombre}</h4>
                    {pct === 100 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        ✓ Completa
                      </span>
                    )}
                    {!esEtapaActual && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                        🔒 Solo lectura
                      </span>
                    )}
                  </div>
                  {lista.descripcion && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{lista.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {itemsTotal > 0 && (
                      <span className={`flex items-center gap-1 text-xs font-semibold ${
                        itemsDone === itemsTotal ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <CheckSquare className="w-3 h-3" />
                        {itemsDone}/{itemsTotal} ítems
                      </span>
                    )}
                    {docsTotal > 0 && (
                      <span className={`flex items-center gap-1 text-xs font-semibold ${
                        docsDone === docsTotal ? 'text-emerald-600' : 'text-blue-500'
                      }`}>
                        <Paperclip className="w-3 h-3" />
                        {docsDone}/{docsTotal} plantillas
                      </span>
                    )}
                    {itemsTotal === 0 && docsTotal === 0 && (
                      <span className="text-xs text-gray-400 italic">Sin ítems configurados</span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  expanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {expanded
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />
                  }
                </div>
              </button>

              {/* ── CONTENIDO expandible ── */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 pt-3 space-y-3 bg-white border-t border-gray-100">

                      {/* ÍTEMS DE CHEQUEO */}
                      {itemsTotal > 0 ? (
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Ítems de verificación</p>
                          {lista.items.map((item, idx) => {
                            const tieneDoc = !!item.documentoBibliotecaId;
                            const docSubido = !!item.archivoSubidoId;
                            // Si tiene doc requerido y no está subido, no permite completar
                            const bloqueado = tieneDoc && !docSubido && !item.completado;

                            return (
                            <div
                              key={item.id}
                              className={`group rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
                                item.completado
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : bloqueado
                                  ? 'bg-amber-50 border-amber-200'
                                  : readOnly
                                  ? 'bg-gray-50 border-gray-200'
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                              }`}
                            >
                              {/* Fila principal */}
                              <div
                                className={`flex items-center gap-3 px-4 py-3 ${!readOnly && !bloqueado ? 'cursor-pointer' : bloqueado ? 'cursor-not-allowed' : ''}`}
                                onClick={() => {
                                  if (readOnly) return;
                                  if (bloqueado) {
                                    toast.warning('Sube el documento antes de completar este ítem', { duration: 3000 });
                                    return;
                                  }
                                  toggleItem(lista.id, item.id);
                                }}
                              >
                                {/* Badge número */}
                                <div className="flex-shrink-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                                    item.completado
                                      ? 'bg-emerald-500 text-white'
                                      : bloqueado
                                      ? 'bg-amber-400 text-white'
                                      : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                                  }`}>
                                    {item.completado ? '✓' : bloqueado ? '!' : idx + 1}
                                  </div>
                                </div>

                                {/* Texto */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold leading-snug ${
                                    item.completado ? 'text-gray-400 line-through' : 'text-gray-800'
                                  }`}>
                                    {item.texto}
                                  </p>
                                  {bloqueado && (
                                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                                      Sube el documento requerido para completar
                                    </p>
                                  )}
                                  {(item.responsable || item.fechaCompletado) && (
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                                      {item.responsable && (
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.responsable}</span>
                                      )}
                                      {item.fechaCompletado && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(item.fechaCompletado).toLocaleDateString('es-CO')}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Checkbox visual */}
                                {!readOnly && (
                                  <div className="flex-shrink-0">
                                    {item.completado
                                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                      : bloqueado
                                      ? <AlertCircle className="w-5 h-5 text-amber-400" />
                                      : <Circle className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                    }
                                  </div>
                                )}
                              </div>

                              {/* Banda de plantilla */}
                              {tieneDoc && (
                                <div className={`mx-4 mb-3 rounded-xl border overflow-hidden transition-colors ${
                                  docSubido ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'
                                }`}>
                                  {/* Fila info */}
                                  <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                      docSubido ? 'bg-emerald-100' : 'bg-blue-100'
                                    }`}>
                                      <FileText className={`w-4 h-4 ${docSubido ? 'text-emerald-600' : 'text-blue-600'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-bold truncate ${docSubido ? 'text-emerald-800' : 'text-blue-800'}`}>
                                        {item.archivoSubidoNombre || item.documentoNombre || 'Plantilla adjunta'}
                                      </p>
                                      <p className={`text-xs ${docSubido ? 'text-emerald-600' : 'text-blue-500'}`}>
                                        {docSubido ? '✓ Documento diligenciado subido' : 'Descarga, diligencia y sube para completar el ítem'}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Fila botones */}
                                  <div className="flex items-center gap-2 px-3 pb-3">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDescargarDoc(item.documentoBibliotecaId!, item.documentoNombre); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Descargar plantilla
                                    </button>
                                    {docSubido ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleDescargarDoc(item.archivoSubidoId!, item.archivoSubidoNombre); }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Ver diligenciado
                                        </button>
                                        {!readOnly && (
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (!confirm('¿Eliminar el documento subido?')) return;
                                              try {
                                                await controlInternoService.deleteDocumento(item.archivoSubidoId!);
                                                setListas(prev => prev.map(l => {
                                                  if (l.id !== lista.id) return l;
                                                  return { ...l, items: l.items.map(i =>
                                                    i.id === item.id ? { ...i, archivoSubidoId: undefined, archivoSubidoNombre: undefined } : i
                                                  )};
                                                }));
                                                toast.success('Documento eliminado');
                                              } catch {
                                                toast.error('No se pudo eliminar el documento');
                                              }
                                            }}
                                            className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                            title="Eliminar documento subido"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </>
                                    ) : !readOnly ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setModalUpload({
                                            listaId: lista.id,
                                            itemId: item.id,
                                            doc: {
                                              documentoBibliotecaId: item.documentoBibliotecaId!,
                                              nombreDocumento: item.documentoNombre || item.texto,
                                              diligenciado: false,
                                            }
                                          });
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        Subir diligenciado
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-dashed border-gray-300">
                          <ClipboardList className="w-5 h-5 text-gray-300 flex-shrink-0" />
                          <p className="text-sm text-gray-400 italic">Esta lista no tiene ítems de verificación configurados</p>
                        </div>
                      )}

                      {/* PLANTILLAS REQUERIDAS */}
                      {docsTotal > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plantillas requeridas</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              docsDone === docsTotal
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {docsDone}/{docsTotal}
                            </span>
                          </div>
                          {lista.documentosAdjuntos.map((doc, idx) => (
                            <div
                              key={idx}
                              className={`rounded-xl border-2 transition-all duration-150 overflow-hidden ${
                                doc.diligenciado
                                  ? 'border-emerald-200 bg-emerald-50'
                                  : 'border-blue-100 bg-white hover:border-blue-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 p-3.5">
                                {/* Icono */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                  doc.diligenciado ? 'bg-emerald-100' : 'bg-blue-50'
                                }`}>
                                  {doc.diligenciado
                                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    : <FileText className="w-5 h-5 text-blue-400" />
                                  }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{doc.nombreDocumento}</p>
                                  {doc.diligenciado && doc.fechaSubida ? (
                                    <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Subida el {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Descarga la plantilla, diligénciala y súbela
                                    </p>
                                  )}
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => doc.documentoBibliotecaId && handleDescargarDoc(doc.documentoBibliotecaId, doc.nombreDocumento)}
                                    disabled={!doc.documentoBibliotecaId}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors disabled:opacity-40"
                                    title="Descargar plantilla vacía"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Plantilla
                                  </button>
                                  {doc.diligenciado && doc.archivoSubidoUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDescargarDoc(doc.archivoSubidoUrl!, doc.nombreDocumento)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                                      title="Descargar diligenciado"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Diligenciado
                                    </button>
                                  ) : !readOnly ? (
                                    <button
                                      type="button"
                                      onClick={() => setModalUpload({ listaId: lista.id, doc })}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                                      title="Subir documento diligenciado"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      Subir
                                    </button>
                                  ) : null}
                                </div>
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
          );
        })}
      </div>

      {/* Footer con acciones */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Progreso de la etapa {etapaActual}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-blue-600">
              {Math.round(
                listasEtapaActual.reduce((sum, l) => sum + l.completitud, 0) / listasEtapaActual.length
              )}%
            </div>
            <div className="text-xs text-blue-700">Completitud total</div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal subir documento diligenciado */}
    {modalUpload && (
      <ModalSubirPlantilla
        auditoriaId={auditoriaId}
        doc={modalUpload.doc}
        onClose={() => setModalUpload(null)}
        onSubido={(docId, nombre) => {
          // Si viene de un ítem → actualizar el ítem localmente sin recargar
          if (modalUpload.itemId && docId) {
            setListas(prev => prev.map(lista => {
              if (lista.id !== modalUpload.listaId) return lista;
              return {
                ...lista,
                items: lista.items.map(item =>
                  item.id === modalUpload.itemId
                    ? { ...item, archivoSubidoId: docId, archivoSubidoNombre: nombre || item.documentoNombre }
                    : item
                )
              };
            }));
          } else {
            cargarListasAuditoria();
          }
          setModalUpload(null);
        }}
      />
    )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL SUBIR PLANTILLA DILIGENCIADA
// ════════════════════════════════════════════════════════════════════════════

function ModalSubirPlantilla({
  auditoriaId,
  doc,
  onClose,
  onSubido,
}: {
  auditoriaId: string;
  doc: DocumentoAdjunto;
  onClose: () => void;
  onSubido: (docId?: string, nombre?: string) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setArrastrando(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setArrastrando(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setArchivo(f);
  };

  const submit = async () => {
    if (!archivo) { toast.error('Selecciona un archivo'); return; }
    setSubiendo(true);
    try {
      const creado = await controlInternoService.createDocumento(archivo, {
        nombre: doc.nombreDocumento,
        descripcion: '',
        tipoDocumento: 'plantilla',
        auditoriaId,
        documentoBibliotecaId: doc.documentoBibliotecaId,
      });
      toast.success('Documento subido correctamente');
      onSubido(creado?.id, doc.nombreDocumento);
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        hideCloseButton
        className="p-0 sm:p-0 gap-0 border-0 overflow-hidden rounded-2xl shadow-2xl"
        style={{ width: '580px', maxWidth: 'calc(100vw - 32px)' }}
      >
        <DialogTitle className="sr-only">Subir documento diligenciado</DialogTitle>

        {/* Header */}
        <div style={{ flexShrink: 0, backgroundColor: '#1d4ed8', color: 'white', padding: '20px 24px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>Subir documento diligenciado</h2>
                <p style={{ fontSize: 12, color: '#bfdbfe', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombreDocumento}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 160px)' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${arrastrando ? '#2563eb' : archivo ? '#10b981' : '#d1d5db'}`,
              borderRadius: 12,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: arrastrando ? '#eff6ff' : archivo ? '#f0fdf4' : '#f9fafb',
              transition: 'all 0.15s',
            }}
          >
            {archivo ? (
              <div className="space-y-3">
                <div style={{ width: 56, height: 56, backgroundColor: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <FileText className="w-7 h-7" style={{ color: '#059669' }} />
                </div>
                <p style={{ fontWeight: 700, color: '#111827', margin: '8px 0 0' }}>{archivo.name}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{formatFileSize(archivo.size)} · {archivo.name.split('.').pop()?.toUpperCase()}</p>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  style={{ marginTop: 12, padding: '6px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div style={{ width: 56, height: 56, backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <Upload className="w-7 h-7" style={{ color: '#9ca3af' }} />
                </div>
                <p style={{ fontWeight: 700, color: '#374151', margin: '8px 0 0' }}>Arrastra el archivo aquí</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>o haz clic para seleccionar</p>
                <label style={{ display: 'inline-block', marginTop: 8, padding: '8px 20px', backgroundColor: '#2563eb', color: 'white', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Seleccionar archivo
                  <input
                    type="file"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f); }}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  />
                </label>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>
            Se asociará a la plantilla &ldquo;{doc.nombreDocumento}&rdquo; en esta auditoría.
          </p>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '10px', border: '2px solid #d1d5db', borderRadius: 12, fontWeight: 700, color: '#374151', backgroundColor: 'white', cursor: 'pointer', fontSize: 14 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!archivo || subiendo}
            style={{
              flex: 1, padding: '10px', backgroundColor: !archivo || subiendo ? '#93c5fd' : '#2563eb',
              color: 'white', border: 'none', borderRadius: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: !archivo || subiendo ? 'not-allowed' : 'pointer', fontSize: 14
            }}
          >
            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {subiendo ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}