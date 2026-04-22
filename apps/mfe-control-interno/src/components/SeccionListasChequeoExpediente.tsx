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
import {
  CheckSquare, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Paperclip, Download, ExternalLink, FileText, Upload, X,
  AlertCircle, Calendar, User, Loader2, CheckCircle
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
    responsable: item.responsable || item.usuario_completado || undefined,
    fechaCompletado: item.fecha_completado || item.fechaCompletado || undefined,
    observaciones: item.observaciones || undefined
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
  const [modalUpload, setModalUpload] = useState<{ listaId: string; doc: DocumentoAdjunto } | null>(null);

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
      const listasApi = await controlInternoService.getListasAplicadas(auditoriaId);
      const listasMapeadas = (listasApi || []).map(mapApiListaToExpediente);
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

  const handleDescargarDoc = async (urlOrId: string) => {
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
      link.download = 'documento';
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
      <div className="space-y-4">
        {listasEtapaActual.map((lista) => {
          // ✅ VALIDACIÓN: Solo permitir completar items de la etapa actual
          const esEtapaActual = lista.etapaKanban === etapaActual;
          
          return (
            <div
              key={lista.id}
              className={`bg-white rounded-xl border-2 overflow-hidden hover:border-blue-300 transition-all ${
                esEtapaActual ? 'border-gray-200' : 'border-gray-300 opacity-70'
              }`}
            >
              {/* Header de la lista */}
              <div className={`px-5 py-4 border-b-2 border-gray-200 ${
                esEtapaActual ? 'bg-gray-50' : 'bg-gray-100'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => setListaExpandida(listaExpandida === lista.id ? null : lista.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {listaExpandida === lista.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-gray-900">{lista.nombre}</h4>
                          {!esEtapaActual && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-md border border-orange-300">
                              🔒 Solo lectura
                            </span>
                          )}
                        </div>
                        {!esEtapaActual && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            ⚠️ Solo puedes completar listas de la etapa actual: {etapaActual}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 ml-9">{lista.descripcion}</p>
                  </div>

                  {/* Indicador de completitud */}
                  <div className="text-center ml-4">
                    <div className={`text-3xl font-black mb-1 ${
                      esEtapaActual ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {lista.completitud}%
                    </div>
                    <div className="text-xs text-gray-500">Completitud</div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-4 ml-9">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>
                      {lista.items.filter(i => i.completado).length} / {lista.items.length} items completados
                    </span>
                    {lista.documentosAdjuntos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {lista.documentosAdjuntos.length} documento(s)
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-500"
                      style={{ width: `${lista.completitud}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Contenido expandible */}
              <AnimatePresence>
                {listaExpandida === lista.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      {/* Items de chequeo */}
                      <div className="space-y-2">
                        {lista.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                              item.completado
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <button
                              onClick={() => toggleItem(lista.id, item.id)}
                              className={`flex-shrink-0 mt-0.5 ${readOnly ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                              disabled={readOnly}
                            >
                              {item.completado ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${
                                item.completado 
                                  ? 'text-gray-600 line-through' 
                                  : 'text-gray-900 font-medium'
                              }`}>
                                {item.texto}
                              </p>

                              {(item.responsable || item.fechaCompletado || item.observaciones) && (
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                  {item.responsable && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {item.responsable}
                                    </div>
                                  )}
                                  {item.fechaCompletado && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(item.fechaCompletado).toLocaleDateString('es-CO')}
                                    </div>
                                  )}
                                  {item.observaciones && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <AlertCircle className="w-3 h-3" />
                                      {item.observaciones}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── Plantillas requeridas de la lista ── */}
                      {lista.documentosAdjuntos.length > 0 && (
                        <div className="mt-1 pt-4 border-t-2 border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Paperclip className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-bold text-gray-800">Plantillas requeridas</span>
                            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {lista.documentosAdjuntos.filter(d => d.diligenciado).length}/{lista.documentosAdjuntos.length} completadas
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lista.documentosAdjuntos.map((doc, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                  doc.diligenciado
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                                }`}
                              >
                                {/* Icono estado */}
                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                                  doc.diligenciado ? 'bg-emerald-100' : 'bg-slate-100'
                                }`}>
                                  {doc.diligenciado
                                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    : <FileText className="w-5 h-5 text-slate-400" />
                                  }
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.nombreDocumento}</p>
                                  {doc.diligenciado && doc.fechaSubida ? (
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                      ✓ Subida el {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">Descarga, diligencia y sube el documento</p>
                                  )}
                                </div>
                                {/* Acciones */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={() => doc.documentoBibliotecaId && handleDescargarDoc(doc.documentoBibliotecaId)}
                                    disabled={!doc.documentoBibliotecaId}
                                    className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                                    title="Descargar plantilla vacía"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Plantilla
                                  </button>
                                  {doc.diligenciado && doc.archivoSubidoUrl ? (
                                    <button
                                      onClick={() => handleDescargarDoc(doc.archivoSubidoUrl!)}
                                      className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      title="Descargar documento diligenciado"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Diligenciado
                                    </button>
                                  ) : !readOnly ? (
                                    <button
                                      onClick={() => setModalUpload({ listaId: lista.id, doc })}
                                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      title="Subir documento diligenciado"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      Subir
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
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
        onSubido={() => {
          setModalUpload(null);
          cargarListasAuditoria();
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
  onSubido: () => void;
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
      await controlInternoService.createDocumento(archivo, {
        nombre: doc.nombreDocumento,
        descripcion: '',
        tipoDocumento: 'plantilla',
        auditoriaId,
        documentoBibliotecaId: doc.documentoBibliotecaId,
      });
      toast.success('Documento subido correctamente');
      onSubido();
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-indigo-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Subir documento diligenciado</h2>
                <p className="text-indigo-200 text-xs mt-0.5 truncate max-w-xs">{doc.nombreDocumento}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              arrastrando
                ? 'border-indigo-400 bg-indigo-50'
                : archivo
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50'
            }`}
          >
            {archivo ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="font-bold text-gray-900">{archivo.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(archivo.size)} · {archivo.name.split('.').pop()?.toUpperCase()}</p>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm transition-colors"
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-bold text-gray-700">Arrastra el archivo aquí</p>
                <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                <label className="inline-block px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer text-sm transition-colors">
                  Seleccionar archivo
                  <input
                    type="file"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f); }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  />
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Se asociará a la plantilla &ldquo;{doc.nombreDocumento}&rdquo; en esta auditoría.
          </p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!archivo || subiendo}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {subiendo ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}