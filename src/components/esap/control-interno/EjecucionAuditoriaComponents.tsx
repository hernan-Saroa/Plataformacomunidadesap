/**
 * ============================================
 * COMPONENTES AUXILIARES - EJECUCIÓN
 * ============================================
 * 
 * Componentes de apoyo para EjecucionAuditoriaModule
 * - Dashboard
 * - Secciones especializadas
 * - Formularios
 */

import { useState } from 'react';
import {
  ClipboardCheck, AlertTriangle, Camera, Calendar, Users, CheckCircle,
  TrendingUp, Upload, Download, Eye, Edit2, Trash2, Plus, Save,
  PlayCircle, AlertCircle, X, ChevronRight, FileText, Shield
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';

// Importar tipos (deben estar disponibles)
type RespuestaChequeo = 'cumple' | 'no-cumple' | 'parcial' | 'no-aplica';
type GravedadHallazgo = 'leve' | 'moderado' | 'grave';

// ============ DASHBOARD DE EJECUCIÓN ============

interface DashboardEjecucionProps {
  auditoria: any;
  listasAplicadas: any[];
  hallazgos: any[];
  evidencias: any[];
  actividades: any[];
  reunionCierre: any;
  progresoGeneral: number;
  puedeAvanzar: boolean;
  onAvanzar: () => void;
}

export function DashboardEjecucion({
  listasAplicadas,
  hallazgos,
  evidencias,
  actividades,
  reunionCierre,
  progresoGeneral,
  puedeAvanzar,
  onAvanzar,
}: DashboardEjecucionProps) {
  const estadisticas = {
    listas: listasAplicadas.length,
    hallazgosLeves: hallazgos.filter(h => h.gravedad === 'leve').length,
    hallazgosModerados: hallazgos.filter(h => h.gravedad === 'moderado').length,
    hallazgosGraves: hallazgos.filter(h => h.gravedad === 'grave').length,
    evidencias: evidencias.length,
    actividadesCompletadas: actividades.filter(a => a.estado === 'completada').length,
    actividadesTotal: actividades.length,
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSIGL>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Listas Aplicadas</p>
              <p className="text-3xl text-gray-900">{estadisticas.listas}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Hallazgos</p>
              <p className="text-3xl text-gray-900">{hallazgos.length}</p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-yellow-600">Leves: {estadisticas.hallazgosLeves}</span>
                <span className="text-orange-600">Mod: {estadisticas.hallazgosModerados}</span>
                <span className="text-red-600">Graves: {estadisticas.hallazgosGraves}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Evidencias</p>
              <p className="text-3xl text-gray-900">{estadisticas.evidencias}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Actividades</p>
              <p className="text-3xl text-gray-900">
                {estadisticas.actividadesCompletadas}/{estadisticas.actividadesTotal}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardSIGL>
      </div>

      {/* Progreso por área */}
      <CardSIGL>
        <h3 className="text-sm text-gray-900 mb-4">Estado de Avance por Componente</h3>
        <div className="space-y-4">
          {[
            {
              nombre: 'Listas de Chequeo',
              completado: listasAplicadas.length > 0,
              descripcion: `${listasAplicadas.length} lista(s) aplicada(s)`,
            },
            {
              nombre: 'Hallazgos Identificados',
              completado: hallazgos.length > 0 && hallazgos.every(h => h.estado === 'validado'),
              descripcion: `${hallazgos.length} hallazgo(s) identificado(s)`,
            },
            {
              nombre: 'Evidencias Recopiladas',
              completado: evidencias.length >= 3,
              descripcion: `${evidencias.length} evidencia(s) cargada(s)`,
            },
            {
              nombre: 'Actividades de Campo',
              completado: actividades.every(a => a.estado === 'completada'),
              descripcion: `${estadisticas.actividadesCompletadas}/${estadisticas.actividadesTotal} completadas`,
            },
            {
              nombre: 'Reunión de Cierre',
              completado: reunionCierre.programada && reunionCierre.actaFirmada,
              descripcion: reunionCierre.programada ? 'Programada y acta firmada' : 'Pendiente',
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.completado ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {item.completado ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{item.nombre}</p>
                <p className="text-xs text-gray-600">{item.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </CardSIGL>

      {/* Botón de avance */}
      {puedeAvanzar && (
        <CardSIGL className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-gray-900 mb-1">
                  <strong>¡Fase de Ejecución Completada!</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Todas las actividades han sido completadas. Puede avanzar a la fase de Comunicación.
                </p>
              </div>
            </div>
            <ButtonSIGL variant="primary" onClick={onAvanzar}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Avanzar
            </ButtonSIGL>
          </div>
        </CardSIGL>
      )}
    </div>
  );
}

// ============ SECCIÓN LISTAS DE CHEQUEO ============

interface SeccionListasChequeoProps {
  listasAplicadas: any[];
  listaActual: any;
  onSeleccionarLista: (lista: any) => void;
  onAplicarNuevaLista: () => void;
  onResponderItem: (listaId: string, itemId: string, respuesta: RespuestaChequeo, observaciones?: string) => void;
}

export function SeccionListasChequeo({
  listasAplicadas,
  listaActual,
  onSeleccionarLista,
  onAplicarNuevaLista,
  onResponderItem,
}: SeccionListasChequeoProps) {
  const [itemEditando, setItemEditando] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const handleResponder = (listaId: string, itemId: string, respuesta: RespuestaChequeo) => {
    onResponderItem(listaId, itemId, respuesta, observaciones);
    setItemEditando(null);
    setObservaciones('');
  };

  // Función para navegar a la biblioteca de listas de chequeo
  const navegarBiblioteca = () => {
    // Disparar evento global para que ControlInternoFull lo capture
    window.dispatchEvent(new CustomEvent('navegarModuloControlInterno', { 
      detail: { seccion: 'listas-chequeo' } 
    }));
  };

  if (listasAplicadas.length === 0) {
    return (
      <CardSIGL>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg text-gray-900 mb-2">No hay listas de chequeo aplicadas</h3>
          <p className="text-sm text-gray-600 mb-6">
            Vaya a la Biblioteca de Listas de Chequeo para crear y gestionar sus listas
          </p>
          <ButtonSIGL variant="primary" onClick={navegarBiblioteca}>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Ir a Biblioteca de Listas
          </ButtonSIGL>
        </div>
      </CardSIGL>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar - Listas disponibles */}
      <div className="lg:col-span-1">
        <CardSIGL>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-900">Listas Aplicadas</h3>
            <ButtonSIGL variant="secondary" onClick={onAplicarNuevaLista} className="text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Nueva
            </ButtonSIGL>
          </div>

          <div className="space-y-2">
            {listasAplicadas.map(lista => (
              <button
                key={lista.id}
                onClick={() => onSeleccionarLista(lista)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  listaActual?.id === lista.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm text-gray-900 mb-1">{lista.nombre}</p>
                <p className="text-xs text-gray-600 mb-2">{lista.proceso}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {lista.itemsCompletados}/{lista.totalItems}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${(lista.itemsCompletados / lista.totalItems) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardSIGL>
      </div>

      {/* Área principal - Items de la lista */}
      <div className="lg:col-span-2">
        {listaActual ? (
          <CardSIGL>
            <div className="mb-6">
              <h2 className="text-lg text-gray-900 mb-2">{listaActual.nombre}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Proceso: {listaActual.proceso}</span>
                <span>Versión: {listaActual.version}</span>
                <span>
                  Progreso: {listaActual.itemsCompletados}/{listaActual.totalItems}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {listaActual.items.map((item: any) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.respuesta
                      ? item.respuesta === 'cumple'
                        ? 'border-green-200 bg-green-50'
                        : item.respuesta === 'no-cumple'
                        ? 'border-red-200 bg-red-50'
                        : item.respuesta === 'parcial'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.numero}</span>
                        <span className="text-sm text-gray-900">{item.criterio}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{item.descripcion}</p>
                      {item.normaReferencia && (
                        <p className="text-xs text-gray-500">
                          Norma: {item.normaReferencia}
                        </p>
                      )}
                    </div>
                  </div>

                  {itemEditando === item.id ? (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="grid grid-cols-4 gap-2">
                        {(['cumple', 'no-cumple', 'parcial', 'no-aplica'] as RespuestaChequeo[]).map(resp => (
                          <button
                            key={resp}
                            onClick={() => handleResponder(listaActual.id, item.id, resp)}
                            className={`px-3 py-2 text-xs rounded-lg border-2 transition-all ${
                              resp === 'cumple'
                                ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                                : resp === 'no-cumple'
                                ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                                : resp === 'parcial'
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'border-gray-500 bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {resp === 'cumple' && 'Cumple'}
                            {resp === 'no-cumple' && 'No Cumple'}
                            {resp === 'parcial' && 'Parcial'}
                            {resp === 'no-aplica' && 'No Aplica'}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        placeholder="Observaciones (opcional)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                      />
                      <button
                        onClick={() => setItemEditando(null)}
                        className="text-xs text-gray-600 hover:text-gray-900"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-3 border-t">
                      {item.respuesta ? (
                        <div className="flex-1">
                          <BadgeSIGL
                            variant={
                              item.respuesta === 'cumple'
                                ? 'success'
                                : item.respuesta === 'no-cumple'
                                ? 'danger'
                                : item.respuesta === 'parcial'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {item.respuesta === 'cumple' && 'Cumple'}
                            {item.respuesta === 'no-cumple' && 'No Cumple'}
                            {item.respuesta === 'parcial' && 'Cumple Parcialmente'}
                            {item.respuesta === 'no-aplica' && 'No Aplica'}
                          </BadgeSIGL>
                          {item.observaciones && (
                            <p className="text-xs text-gray-600 mt-2">{item.observaciones}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Sin respuesta</span>
                      )}
                      <button
                        onClick={() => {
                          setItemEditando(item.id);
                          setObservaciones(item.observaciones || '');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {item.respuesta ? 'Editar' : 'Responder'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardSIGL>
        ) : (
          <CardSIGL>
            <div className="text-center py-12 text-gray-500">
              Seleccione una lista de chequeo para ver sus items
            </div>
          </CardSIGL>
        )}
      </div>
    </div>
  );
}

// ============ SECCIÓN HALLAZGOS ============

interface SeccionHallazgosProps {
  hallazgos: any[];
  evidencias: any[];
  onNuevoHallazgo: () => void;
  onSeleccionarHallazgo: (hallazgo: any) => void;
  onValidarHallazgo: (id: string) => void;
}

export function SeccionHallazgos({
  hallazgos,
  onNuevoHallazgo,
  onValidarHallazgo,
}: SeccionHallazgosProps) {
  if (hallazgos.length === 0) {
    return (
      <CardSIGL>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg text-gray-900 mb-2">No hay hallazgos registrados</h3>
          <p className="text-sm text-gray-600 mb-6">
            Registre los hallazgos identificados durante la ejecución de la auditoría
          </p>
          <ButtonSIGL variant="primary" onClick={onNuevoHallazgo}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Hallazgo
          </ButtonSIGL>
        </div>
      </CardSIGL>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-gray-900">Hallazgos Identificados ({hallazgos.length})</h3>
        <ButtonSIGL variant="primary" onClick={onNuevoHallazgo}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Hallazgo
        </ButtonSIGL>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {hallazgos.map(hallazgo => (
          <CardSIGL key={hallazgo.id}>
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  hallazgo.gravedad === 'grave'
                    ? 'bg-red-100'
                    : hallazgo.gravedad === 'moderado'
                    ? 'bg-orange-100'
                    : 'bg-yellow-100'
                }`}
              >
                <AlertTriangle
                  className={`w-6 h-6 ${
                    hallazgo.gravedad === 'grave'
                      ? 'text-red-600'
                      : hallazgo.gravedad === 'moderado'
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{hallazgo.numero}</span>
                      <BadgeSIGL
                        variant={
                          hallazgo.gravedad === 'grave'
                            ? 'danger'
                            : hallazgo.gravedad === 'moderado'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {hallazgo.gravedad}
                      </BadgeSIGL>
                      <BadgeSIGL variant={hallazgo.estado === 'validado' ? 'success' : 'default'}>
                        {hallazgo.estado}
                      </BadgeSIGL>
                    </div>
                    <h4 className="text-sm text-gray-900 mb-1">{hallazgo.titulo}</h4>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">{hallazgo.descripcion}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Causas:</p>
                    <ul className="space-y-1">
                      {hallazgo.causas.map((causa: string, idx: number) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          {causa}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Recomendaciones:</p>
                    <ul className="space-y-1">
                      {hallazgo.recomendaciones.map((rec: string, idx: number) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {hallazgo.estado !== 'validado' && (
                  <div className="mt-4 pt-4 border-t">
                    <ButtonSIGL
                      variant="primary"
                      onClick={() => onValidarHallazgo(hallazgo.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validar Hallazgo
                    </ButtonSIGL>
                  </div>
                )}
              </div>
            </div>
          </CardSIGL>
        ))}
      </div>
    </div>
  );
}

// [CONTINÚA... Los demás componentes SeccionEvidencias, SeccionCronograma, SeccionReunionCierre y Formularios seguirán el mismo patrón]