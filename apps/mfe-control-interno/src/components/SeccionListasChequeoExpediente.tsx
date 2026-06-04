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
  AlertCircle, Calendar, User, Loader2, CheckCircle, Trash2, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';
import { useAuth } from '../../../hooks/useAuth';

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

/** UUID del documento diligenciado subido a la auditoría (para descarga/eliminación). */
const UUID_DOC_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extraerIdDocumentoSubido(archivoSubidoUrl?: string): string | null {
  if (!archivoSubidoUrl?.trim()) return null;
  const t = archivoSubidoUrl.trim();
  if (UUID_DOC_RE.test(t)) return t;
  const m = t.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EtapaKanban = 'Programa Anual' | 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento';

interface ItemChequeo {
  id: string;
  texto: string;
  completado: boolean;
  responsable?: string;
  fechaCompletado?: string;
  observaciones?: string;
  documentoBibliotecaId?: string;
  documentoNombre?: string;
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

interface DocumentoAuditoriaSubido {
  documentoBibliotecaId?: string | null;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SeccionListasChequeoExpedienteProps {
  auditoriaId: string;
  etapaActual: EtapaKanban;
  readOnly?: boolean; // ✅ Modo solo lectura (deshabilita edición)
  /** Documentos de auditoría ya cargados por el expediente (evita GET duplicado) */
  documentosAuditoriaPrecargados?: DocumentoAuditoriaSubido[];
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PARA MAPEAR DATOS DEL BACKEND AL FORMATO DE UI
// ════════════════════════════════════════════════════════════════════════════

function mapApiListaToExpediente(
  apiLista: any,
  documentosSubidosPorBiblioteca: Record<string, { id: string; fecha?: string }>
): ListaChequeo {
  // Preferir etapaNombreKanban del backend (viene del registro de la etapa real del Kanban).
  // Fallback: mapear desde el campo tipo para compatibilidad con datos anteriores.
  const VALID_STAGES: EtapaKanban[] = ['Programa Anual', 'Planeación', 'Ejecución', 'Comunicación', 'Seguimiento'];

  const tipoToEtapa: Record<string, EtapaKanban> = {
    'planeacion': 'Planeación',
    'PLANEACION': 'Planeación',
    'ejecucion': 'Ejecución',
    'EJECUCION': 'Ejecución',
    'comunicacion': 'Comunicación',
    'COMUNICACION': 'Comunicación',
    'seguimiento': 'Seguimiento',
    'SEGUIMIENTO': 'Seguimiento',
    'plan_anual': 'Programa Anual',
    'PLAN_ANUAL': 'Programa Anual'
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
    observaciones: item.observaciones || undefined,
    documentoBibliotecaId: item.documentoBibliotecaId || undefined,
    documentoNombre: item.documentoNombre || undefined
  }));

  const documentosRaw = apiLista.documentosAdjuntos
    || apiLista.documentosRequeridos
    || apiLista.plantillas
    || apiLista.documentos
    || [];

  const documentosDesdeLista: DocumentoAdjunto[] = documentosRaw.map((doc: any, idx: number) => {
    const documentoBibliotecaId = (
      doc.documentoBibliotecaId
      || doc.bibliotecaId
      || doc.documentoId
      || doc.id
      || ''
    ).toString();

    const subido = documentoBibliotecaId
      ? documentosSubidosPorBiblioteca[documentoBibliotecaId]
      : undefined;

    return {
      documentoBibliotecaId,
      nombreDocumento: doc.nombreDocumento || doc.nombre || doc.titulo || `Documento ${idx + 1}`,
      diligenciado: Boolean(
      doc.diligenciado
      || doc.completado
      || doc.subido
      || doc.archivoSubidoUrl
      || doc.urlDocumentoSubido
      || doc.archivoUrl
      || doc.url
      || subido
      ),
      archivoSubidoUrl:
        doc.archivoSubidoUrl
        || doc.urlDocumentoSubido
        || doc.archivoUrl
        || doc.url
        || subido?.id
        || undefined,
      fechaSubida: doc.fecha_subida || doc.fechaSubida || doc.updatedAt || subido?.fecha || undefined
    };
  });

  const documentosDesdeItems: DocumentoAdjunto[] = items
    .filter(item => item.documentoBibliotecaId)
    .map((item) => {
      const documentoBibliotecaId = item.documentoBibliotecaId!;
      const subido = documentosSubidosPorBiblioteca[documentoBibliotecaId];
      return {
        documentoBibliotecaId,
        nombreDocumento: item.documentoNombre || item.texto,
        diligenciado: Boolean(subido),
        archivoSubidoUrl: subido?.id,
        fechaSubida: subido?.fecha
      };
    });

  const documentosAdjuntos = [...documentosDesdeLista];
  documentosDesdeItems.forEach((docItem) => {
    if (!documentosAdjuntos.some(d => d.documentoBibliotecaId === docItem.documentoBibliotecaId)) {
      documentosAdjuntos.push(docItem);
    }
  });

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
  readOnly = false,
  documentosAuditoriaPrecargados,
}: SeccionListasChequeoExpedienteProps) {
  const { user } = useAuth();
  const [listas, setListas] = useState<ListaChequeo[]>([]);
  const [listaExpandida, setListaExpandida] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalUpload, setModalUpload] = useState<{ listaId: string; doc: DocumentoAdjunto } | null>(null);
  const [eliminandoDocId, setEliminandoDocId] = useState<string | null>(null);

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

      // Cruzar con documentos ya subidos para marcar plantillas diligenciadas
      const documentosAuditoria = documentosAuditoriaPrecargados !== undefined
        ? documentosAuditoriaPrecargados
        : ((await controlInternoService.getDocumentosByAuditoria(auditoriaId).catch(() => [])) as DocumentoAuditoriaSubido[]);

      const documentosSubidosPorBiblioteca = (documentosAuditoria || []).reduce((acc, doc) => {
        if (!doc.documentoBibliotecaId) return acc;
        const key = String(doc.documentoBibliotecaId);
        const actual = acc[key];
        const fechaDoc = doc.updatedAt || doc.createdAt;
        if (!actual) {
          acc[key] = { id: String(doc.id || ''), fecha: fechaDoc };
          return acc;
        }
        const actualTime = new Date(actual.fecha || 0).getTime();
        const nuevoTime = new Date(fechaDoc || 0).getTime();
        if (nuevoTime >= actualTime) {
          acc[key] = { id: String(doc.id || actual.id), fecha: fechaDoc };
        }
        return acc;
      }, {} as Record<string, { id: string; fecha?: string }>);

      const listasMapeadas = (listasApi || []).map((listaApi: any) =>
        mapApiListaToExpediente(listaApi, documentosSubidosPorBiblioteca)
      );
      setListas(listasMapeadas);
      if (listasMapeadas.length > 0) {
        setListaExpandida(prev => prev ?? listasMapeadas[0].id);
      }
    } catch (error) {
      console.error('[ListasChequeo] ❌ Error cargando listas:', error);
      setLoadError('No se pudieron cargar las listas de chequeo');
    } finally {
      setIsLoading(false);
    }
  }, [auditoriaId, documentosAuditoriaPrecargados]);

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

  const handleEliminarDiligenciado = useCallback(
    async (doc: DocumentoAdjunto) => {
      if (readOnly) return;
      const id = extraerIdDocumentoSubido(doc.archivoSubidoUrl);
      if (!id) {
        toast.error('No se pudo identificar el documento subido para eliminarlo.');
        return;
      }
      if (!window.confirm('¿Eliminar el documento diligenciado? Podrás subir otro archivo después.')) return;
      setEliminandoDocId(id);
      try {
        await controlInternoService.deleteDocumento(id);
        toast.success('Documento eliminado. Puedes subir uno nuevo.');
        await cargarListasAuditoria();
      } catch (e) {
        console.error(e);
        toast.error('No se pudo eliminar el documento');
      } finally {
        setEliminandoDocId(null);
      }
    },
    [readOnly, cargarListasAuditoria]
  );

  // Filtrar listas por la etapa actual y por auditor. Si no hay coincidencias el componente retorna UI para generarlas.
  const listasEtapaActual = listas.filter(lista => {
    const esEtapaActual = lista.etapaKanban === etapaActual;
    const esJefeOciSuperadmin = user?.roles?.some(r => ['superadmin', 'jefe_oci', 'admin'].includes(r)) || false;
    const nombreCompleto = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const cumpleAuditor = esJefeOciSuperadmin ||
      lista.creadoPor === nombreCompleto ||
      lista.creadoPor === user?.email ||
      lista.creadoPor === 'Usuario Actual' ||
      lista.creadoPor === user?.id ||
      (lista.creadoPor && lista.creadoPor !== 'Sistema' && user?.firstName && lista.creadoPor.includes(user.firstName));
    return esEtapaActual && cumpleAuditor;
  });

  /** Si el ítem exige plantilla, solo puede completarse cuando ya está subida/diligenciada en esta auditoría. */
  const plantillaEstaDiligenciada = (lista: ListaChequeo, bibliotecaId?: string): boolean => {
    if (!bibliotecaId) return true;
    const doc = lista.documentosAdjuntos.find(d => d.documentoBibliotecaId === bibliotecaId);
    return Boolean(doc?.diligenciado);
  };

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

    if (
      nuevoEstado
      && item.documentoBibliotecaId
      && !plantillaEstaDiligenciada(lista, item.documentoBibliotecaId)
    ) {
      toast.error('Plantilla pendiente', {
        description: 'Sube el documento diligenciado en «Plantillas requeridas» antes de marcar este ítem como completado.',
        duration: 5000
      });
      return;
    }
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

  const etapaBorderColors: Record<EtapaKanban, string> = {
    'Programa Anual': 'border-gray-200',
    'Planeación': 'border-blue-200',
    'Ejecución': 'border-amber-200',
    'Comunicación': 'border-green-200',
    'Seguimiento': 'border-indigo-200'
  };

  if (listasEtapaActual.length === 0) {
    return (
      <div className={`bg-white border-2 ${etapaBorderColors[etapaActual] || 'border-gray-200'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-gray-400" />
              Listas de Chequeo - {etapaActual}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              No hay listas de chequeo configuradas para esta etapa.
            </p>
          </div>
          <button
            onClick={navegarAModuloListasChequeo}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generar Lista de Chequeo
          </button>
        </div>
      </div>
    );
  }

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
                        {lista.items.map((item) => {
                          const bloqueadoSinPlantilla =
                            Boolean(item.documentoBibliotecaId)
                            && !plantillaEstaDiligenciada(lista, item.documentoBibliotecaId)
                            && !item.completado;
                          return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                              item.completado
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(lista.id, item.id)}
                              className={`flex-shrink-0 mt-0.5 ${
                                readOnly || bloqueadoSinPlantilla
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer'
                              }`}
                              disabled={readOnly || bloqueadoSinPlantilla}
                              title={
                                bloqueadoSinPlantilla
                                  ? 'Sube primero la plantilla diligenciada en «Plantillas requeridas»'
                                  : undefined
                              }
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
                              {bloqueadoSinPlantilla && (
                                <p className="text-xs text-amber-700 mt-2">
                                  Sube la plantilla diligenciada abajo («Plantillas requeridas») para poder completar este ítem.
                                </p>
                              )}
                            </div>

                            {item.documentoBibliotecaId && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDescargarDoc(item.documentoBibliotecaId!)}
                                  className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                  title="Descargar plantilla del ítem"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Plantilla
                                </button>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>

                      {/* ── Plantillas requeridas de la lista ── */}
                      {lista.documentosAdjuntos.length > 0 ? (
                        <div className="mt-1 pt-4 border-t-2 border-gray-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Paperclip className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-bold text-gray-800">Plantillas requeridas</span>
                            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {lista.documentosAdjuntos.filter(d => d.diligenciado).length}/{lista.documentosAdjuntos.length} completadas
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lista.documentosAdjuntos.map((doc, idx) => {
                              const idDocSubido = extraerIdDocumentoSubido(doc.archivoSubidoUrl);
                              return (
                              <div
                                key={`${doc.documentoBibliotecaId || doc.nombreDocumento}-${idx}`}
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
                                  {(() => {
                                    const itemsAsociados = lista.items
                                      .filter(i => i.documentoBibliotecaId === doc.documentoBibliotecaId)
                                      .map(i => i.texto);
                                    if (itemsAsociados.length === 0) return null;
                                    return (
                                      <p className="text-xs text-indigo-700 mt-0.5 truncate">
                                        Item(s): {itemsAsociados.join(' • ')}
                                      </p>
                                    );
                                  })()}
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
                                  ) : null}
                                  {!readOnly && doc.diligenciado && idDocSubido ? (
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarDiligenciado(doc)}
                                      disabled={eliminandoDocId === idDocSubido}
                                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                      title="Quitar archivo subido para poder cargar otro"
                                    >
                                      {eliminandoDocId === idDocSubido ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                      Eliminar
                                    </button>
                                  ) : null}
                                  {!doc.diligenciado && !readOnly ? (
                                    <button
                                      onClick={() => setModalUpload({ listaId: lista.id, doc })}
                                      className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
                                      title="Subir documento diligenciado"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      Subir
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );})}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 pt-4 border-t-2 border-gray-100">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <div>
                              <p className="text-sm font-semibold text-amber-800">
                                Esta lista no tiene plantilla configurada
                              </p>
                              <p className="text-xs text-amber-700">
                                Puedes subir un soporte manual mientras se configura la plantilla.
                              </p>
                            </div>
                            {!readOnly && (
                              <button
                                onClick={() => setModalUpload({
                                  listaId: lista.id,
                                  doc: {
                                    documentoBibliotecaId: '',
                                    nombreDocumento: `Soporte - ${lista.nombre}`,
                                    diligenciado: false
                                  }
                                })}
                                className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
                                title="Subir documento de soporte"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Subir soporte
                              </button>
                            )}
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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-blue-700 text-white px-6 py-5" style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Subir documento diligenciado</h2>
                <p className="text-blue-100 text-xs mt-0.5 truncate max-w-xs" style={{ color: '#DBEAFE' }}>{doc.nombreDocumento}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors">
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
                : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
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
                <p className="font-bold text-gray-800">Arrastra el archivo aquí</p>
                <p className="text-sm text-gray-600">o haz clic para seleccionar</p>
                <label
                  className="inline-block px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold cursor-pointer text-sm transition-colors shadow-sm"
                  style={{ backgroundColor: '#003DA5', color: '#FFFFFF', border: '1px solid #1D4ED8' }}
                >
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
          <p className="text-xs text-gray-600 text-center">
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
            className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
          >
            <Upload className="w-4 h-4" />
            {subiendo ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}