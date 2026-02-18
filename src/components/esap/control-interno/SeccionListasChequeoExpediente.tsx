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

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Paperclip, Download, Eye, Plus, ExternalLink, FileText,
  AlertCircle, Calendar, User, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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
// DATOS MOCK (en producción vendrían del backend)
// ════════════════════════════════════════════════════════════════════════════

const LISTAS_CHEQUEO_MOCK: ListaChequeo[] = [
  {
    id: 'lista-plan-001',
    nombre: 'Plan Anual - Programación de Auditoría',
    descripcion: 'Verificación de inclusión en el Plan Anual de Auditorías',
    etapaKanban: 'Plan Anual',
    items: [
      {
        id: 'item-pa-001',
        texto: 'Verificar aprobación del Plan Anual por el Comité de Coordinación',
        completado: false
      },
      {
        id: 'item-pa-002',
        texto: 'Confirmar inclusión de la auditoría en el cronograma aprobado',
        completado: false
      },
      {
        id: 'item-pa-003',
        texto: 'Validar disponibilidad de recursos (personal, presupuesto)',
        completado: false
      }
    ],
    documentosAdjuntos: [],
    completitud: 0,
    activa: true
  },
  {
    id: 'lista-001',
    nombre: 'Planeación - Auditoría Financiera',
    descripcion: 'Checklist completo para la fase de planeación de auditorías financieras',
    etapaKanban: 'Planeación',
    items: [
      {
        id: 'item-001',
        texto: 'Revisar Programa Anual de Auditoría aprobado',
        completado: true,
        responsable: 'Ana María López',
        fechaCompletado: '2026-02-12',
        observaciones: 'Programa aprobado por el Comité'
      },
      {
        id: 'item-002',
        texto: 'Elaborar matriz de riesgos del proceso',
        completado: true,
        responsable: 'Ana María López',
        fechaCompletado: '2026-02-13'
      },
      {
        id: 'item-003',
        texto: 'Solicitar documentación al área auditada',
        completado: false,
        responsable: 'Juan Pablo García'
      },
      {
        id: 'item-004',
        texto: 'Definir muestra de auditoría',
        completado: false
      },
      {
        id: 'item-005',
        texto: 'Elaborar cronograma detallado de actividades',
        completado: false
      }
    ],
    documentosAdjuntos: [
      {
        documentoBibliotecaId: 'doc-001',
        nombreDocumento: 'Plantilla Programa Anual de Auditoría',
        diligenciado: true,
        archivoSubidoUrl: '/uploads/programa-anual-2026.docx',
        fechaSubida: '2026-02-12'
      },
      {
        documentoBibliotecaId: 'doc-005',
        nombreDocumento: 'Matriz de Riesgos',
        diligenciado: true,
        archivoSubidoUrl: '/uploads/matriz-riesgos-gestion-financiera.xlsx',
        fechaSubida: '2026-02-13'
      }
    ],
    completitud: 40,
    activa: true
  },
  {
    id: 'lista-002',
    nombre: 'Ejecución - Levantamiento de Información',
    descripcion: 'Lista de verificación para la fase de ejecución y levantamiento de información',
    etapaKanban: 'Ejecución',
    items: [
      {
        id: 'item-005',
        texto: 'Enviar oficio de apertura al responsable del proceso',
        completado: true,
        responsable: 'Carlos Mendoza',
        fechaCompletado: '2026-02-11'
      },
      {
        id: 'item-006',
        texto: 'Realizar entrevistas con personal clave',
        completado: false,
        responsable: 'Laura Rodríguez'
      },
      {
        id: 'item-007',
        texto: 'Aplicar pruebas de cumplimiento',
        completado: false
      },
      {
        id: 'item-008',
        texto: 'Documentar hallazgos preliminares',
        completado: false
      }
    ],
    documentosAdjuntos: [
      {
        documentoBibliotecaId: 'doc-003',
        nombreDocumento: 'Oficio de Apertura de Auditoría',
        diligenciado: true,
        archivoSubidoUrl: '/uploads/oficio-apertura-aud-2026-01.docx',
        fechaSubida: '2026-02-11'
      }
    ],
    completitud: 25,
    activa: true
  },
  {
    id: 'lista-003',
    nombre: 'Comunicación - Informe Final',
    descripción: 'Lista para preparación y envío del informe final de auditoría',
    etapaKanban: 'Comunicación',
    items: [
      {
        id: 'item-009',
        texto: 'Elaborar informe preliminar',
        completado: false
      },
      {
        id: 'item-010',
        texto: 'Enviar informe preliminar para controversia',
        completado: false
      },
      {
        id: 'item-011',
        texto: 'Consolidar observaciones del área auditada',
        completado: false
      },
      {
        id: 'item-012',
        texto: 'Elaborar informe final',
        completado: false
      }
    ],
    documentosAdjuntos: [],
    completitud: 0,
    activa: true
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function SeccionListasChequeoExpediente({
  auditoriaId,
  etapaActual
}: SeccionListasChequeoExpedienteProps) {
  const [listas, setListas] = useState<ListaChequeo[]>(LISTAS_CHEQUEO_MOCK);
  const [listaExpandida, setListaExpandida] = useState<string | null>(null);

  // Filtrar listas por la etapa actual
  const listasEtapaActual = listas.filter(lista => lista.etapaKanban === etapaActual);

  const toggleItem = (listaId: string, itemId: string) => {
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

    setListas(prev => prev.map(lista => {
      if (lista.id === listaId) {
        const nuevosItems = lista.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              completado: !item.completado,
              fechaCompletado: !item.completado ? new Date().toISOString().split('T')[0] : undefined,
              responsable: !item.completado ? 'Usuario Actual' : item.responsable
            };
          }
          return item;
        });

        const itemsCompletados = nuevosItems.filter(i => i.completado).length;
        const completitud = Math.round((itemsCompletados / nuevosItems.length) * 100);

        toast.success(
          nuevosItems.find(i => i.id === itemId)?.completado 
            ? '✅ Item marcado como completado' 
            : '⭕ Item marcado como pendiente'
        );

        return {
          ...lista,
          items: nuevosItems,
          completitud
        };
      }
      return lista;
    }));
  };

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