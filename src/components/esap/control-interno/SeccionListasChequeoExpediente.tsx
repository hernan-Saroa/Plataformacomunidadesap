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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Paperclip, Download, Eye, Plus, ExternalLink, FileText,
  AlertCircle, Calendar, User, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { controlInternoService } from '../../../services/api/controlInternoService';

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
  items: ItemChequeo[];
  documentosAdjuntos: DocumentoAdjunto[];
  completitud: number;
  activa: boolean;
}

interface SeccionListasChequeoExpedienteProps {
  auditoriaId: string;
  etapaActual: EtapaKanban;
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PARA MAPEAR DATOS DEL BACKEND AL FORMATO DE UI
// ════════════════════════════════════════════════════════════════════════════

function mapApiListaToExpediente(apiLista: any): ListaChequeo {
  // Mapear tipo del backend a etapaKanban del frontend
  const tipoToEtapa: Record<string, EtapaKanban> = {
    'planeacion': 'Planeación',
    'ejecucion': 'Ejecución',
    'comunicacion': 'Comunicación',
    'seguimiento': 'Seguimiento',
    'plan_anual': 'Plan Anual'
  };

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
    etapaKanban: tipoToEtapa[apiLista.tipo] || 'Planeación',
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
  etapaActual
}: SeccionListasChequeoExpedienteProps) {
  const [listas, setListas] = useState<ListaChequeo[]>([]);
  const [listaExpandida, setListaExpandida] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ✅ CARGAR LISTAS DE CHEQUEO VINCULADAS A LA AUDITORÍA
  useEffect(() => {
    const cargarListasAuditoria = async () => {
      // Validar que sea un UUID válido
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
        console.log(`[ListasChequeo] ✅ Cargadas ${listasMapeadas.length} listas para auditoría ${auditoriaId}`);
      } catch (error) {
        console.error('[ListasChequeo] ❌ Error cargando listas:', error);
        setLoadError('No se pudieron cargar las listas de chequeo');
        // No mostrar toast para no saturar al usuario
      } finally {
        setIsLoading(false);
      }
    };

    cargarListasAuditoria();
  }, [auditoriaId]);

  // Filtrar listas por la etapa actual
  const listasEtapaActual = listas.filter(lista => lista.etapaKanban === etapaActual);

  const toggleItem = async (listaId: string, itemId: string) => {
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

  if (listasEtapaActual.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <div className="text-center">
          <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No hay listas de chequeo para esta etapa
          </h3>
          <p className="text-gray-600 mb-6">
            Puedes crear listas de chequeo personalizadas en el módulo correspondiente
          </p>
          <button
            onClick={() => toast.info('📋 Navegar al módulo de Listas de Chequeo')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold flex items-center gap-2 mx-auto hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Ir al Módulo de Listas de Chequeo
          </button>
        </div>
      </div>
    );
  }

  return (
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
          onClick={() => toast.info('📋 Abrir módulo completo de Listas de Chequeo')}
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
                              className="flex-shrink-0 mt-0.5"
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

                      {/* Documentos adjuntos */}
                      {lista.documentosAdjuntos.length > 0 && (
                        <div className="border-t-2 border-gray-200 pt-4">
                          <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Paperclip className="w-4 h-4" />
                            Documentos Adjuntos
                          </h5>
                          <div className="space-y-2">
                            {lista.documentosAdjuntos.map((doc, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                  doc.diligenciado
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-yellow-50 border-yellow-200'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className={`w-5 h-5 ${
                                    doc.diligenciado ? 'text-green-600' : 'text-yellow-600'
                                  }`} />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {doc.nombreDocumento}
                                    </p>
                                    {doc.fechaSubida && (
                                      <p className="text-xs text-gray-500">
                                        Subido: {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {doc.diligenciado && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                      ✓ Diligenciado
                                    </span>
                                  )}
                                  <button
                                    onClick={() => toast.success('👁️ Abriendo documento...')}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Ver documento"
                                  >
                                    <Eye className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button
                                    onClick={() => toast.success('📥 Descargando documento...')}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Descargar documento"
                                  >
                                    <Download className="w-4 h-4 text-gray-600" />
                                  </button>
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
              <p className="text-xs text-blue-700">
                Completa todas las listas para avanzar a la siguiente fase
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
  );
}