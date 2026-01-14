/**
 * ConfiguracionesSIGL - Módulo de Configuraciones SIGL
 * Permite configurar estados, columnas y tiempos de todos los tableros Kanban
 * DISEÑO 100% COHERENTE CON EL ESTÁNDAR DEL PROYECTO (Modal Comunicaciones del Proceso)
 * CONECTADO A CONTEXT API - Los cambios afectan a todos los módulos de Gestión Legal
 */

import { useState } from 'react';
import { Settings, Clock, LayoutGrid, Save, RotateCcw, Plus, Trash2, GripVertical, AlertCircle, Scale, X, CheckCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ✅ Importar Context API
import {
  useConfiguracionesSIGL,
  casosPorEstado,
  EstadoKanban,
  ConfiguracionModulo,
  TipoProcesoJudicial,
  ConfiguracionTiempo
} from '../config/ConfiguracionesSIGLContext';

// ============ COMPONENTE PRINCIPAL ============

export function ConfiguracionesSIGL() {
  // ✅ Usar Context API en lugar de useState local
  const {
    configuraciones,
    cambiosPendientes,
    setCambiosPendientes,
    actualizarConfiguraciones,
    guardarConfiguraciones,
    restablecerDefecto
  } = useConfiguracionesSIGL();

  const [moduloActivo, setModuloActivo] = useState<string>('defensa-judicial');

  // Estados para modales
  const [showModalAgregarEstado, setShowModalAgregarEstado] = useState(false);
  const [showModalEliminarEstado, setShowModalEliminarEstado] = useState(false);
  const [estadoAEliminar, setEstadoAEliminar] = useState<EstadoKanban | null>(null);
  const [showModalAgregarTipoProceso, setShowModalAgregarTipoProceso] = useState(false);
  const [showModalEliminarTipoProceso, setShowModalEliminarTipoProceso] = useState(false);
  const [tipoProcesoAEliminar, setTipoProcesoAEliminar] = useState<TipoProcesoJudicial | null>(null);

  const moduloActual = configuraciones.find(m => m.id === moduloActivo);

  // ============ FUNCIONES DE ESTADOS ============

  const agregarEstado = () => {
    setShowModalAgregarEstado(true);
  };

  const confirmarAgregarEstado = () => {
    if (!moduloActual) return;

    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      orden: moduloActual.estados.length + 1,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: [...m.estados, nuevoEstado] }
        : m
    ));
    setShowModalAgregarEstado(false);

    toast.success('Estado agregado correctamente', {
      description: 'Se ha agregado un nuevo estado al tablero Kanban',
      duration: 3000
    });
  };

  const solicitarEliminarEstado = (estadoId: string) => {
    const estado = moduloActual?.estados.find(e => e.id === estadoId);
    if (estado) {
      setEstadoAEliminar(estado);
      setShowModalEliminarEstado(true);
    }
  };

  const confirmarEliminarEstado = () => {
    if (!estadoAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: m.estados.filter(e => e.id !== estadoAEliminar.id) }
        : m
    ));
    setShowModalEliminarEstado(false);

    toast.success('Estado eliminado correctamente', {
      description: `"${estadoAEliminar.nombre}" ha sido eliminado del tablero Kanban`,
      duration: 3000
    });

    setEstadoAEliminar(null);
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          estados: m.estados.map(e =>
            e.id === estadoId ? { ...e, ...cambios } : e
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE TIEMPOS ============

  const agregarTiempo = () => {
    if (!moduloActual) return;

    const nuevoTiempo: ConfiguracionTiempo = {
      id: `tiempo-${Date.now()}`,
      tipo: 'Nuevo Término',
      dias: 10,
      alertaDias: 3,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiempos: [...m.tiempos, nuevoTiempo] }
        : m
    ));
  };

  const eliminarTiempo = (tiempoId: string) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiempos: m.tiempos.filter(t => t.id !== tiempoId) }
        : m
    ));
  };

  const actualizarTiempo = (tiempoId: string, cambios: Partial<ConfiguracionTiempo>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiempos: m.tiempos.map(t =>
            t.id === tiempoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE TIPOS DE PROCESOS ============

  const agregarTipoProceso = () => {
    setShowModalAgregarTipoProceso(true);
  };

  const confirmarAgregarTipoProceso = () => {
    if (!moduloActual || !moduloActual.tiposProcesos) return;

    const nuevoTipo: TipoProcesoJudicial = {
      id: `tipo-${Date.now()}`,
      nombre: 'Nuevo Tipo de Proceso',
      descripcion: 'Descripción del nuevo tipo de proceso judicial',
      plazo: 10,
      alertaDias: 3,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposProcesos: [...(m.tiposProcesos || []), nuevoTipo] }
        : m
    ));
    setShowModalAgregarTipoProceso(false);

    toast.success('Tipo de proceso agregado correctamente', {
      description: 'Se ha agregado un nuevo tipo de proceso judicial',
      duration: 3000
    });
  };

  const solicitarEliminarTipoProceso = (tipoId: string) => {
    const tipo = moduloActual?.tiposProcesos?.find(t => t.id === tipoId);
    if (tipo) {
      setTipoProcesoAEliminar(tipo);
      setShowModalEliminarTipoProceso(true);
    }
  };

  const confirmarEliminarTipoProceso = () => {
    if (!tipoProcesoAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposProcesos: (m.tiposProcesos || []).filter(t => t.id !== tipoProcesoAEliminar.id) }
        : m
    ));
    setShowModalEliminarTipoProceso(false);

    toast.success('Tipo de proceso eliminado correctamente', {
      description: `"${tipoProcesoAEliminar.nombre}" ha sido eliminado de los tipos de procesos judiciales`,
      duration: 3000
    });

    setTipoProcesoAEliminar(null);
  };

  const actualizarTipoProceso = (tipoId: string, cambios: Partial<TipoProcesoJudicial>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiposProcesos: (m.tiposProcesos || []).map(t =>
            t.id === tipoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
  };

  // ============ DRAG AND DROP ============

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const moduloIndex = configuraciones.findIndex(m => m.id === moduloActivo);
    if (moduloIndex < 0) return;

    const estados = [...configuraciones[moduloIndex].estados];
    const oldIndex = estados.findIndex(e => e.id === active.id);
    const newIndex = estados.findIndex(e => e.id === over.id);

    const reorderedEstados = arrayMove(estados, oldIndex, newIndex);

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })) }
        : m
    ));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <Settings size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Configuraciones SIGL
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Gestiona estados, columnas y tiempos de todos los tableros Kanban
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {cambiosPendientes && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Cambios sin guardar</span>
                <span className="sm:hidden">Sin guardar</span>
              </span>
            )}
            <button
              onClick={restablecerDefecto}
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              onClick={guardarConfiguraciones}
              disabled={!cambiosPendientes}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
                boxShadow: cambiosPendientes ? '0 2px 4px rgba(41, 98, 255, 0.2)' : 'none'
              }}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar Cambios</span>
              <span className="sm:hidden">Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar de Módulos */}
        <div className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
              Módulos Kanban
            </h3>
            <div className="space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {configuraciones.map((modulo) => (
                <button
                  key={modulo.id}
                  onClick={() => setModuloActivo(modulo.id)}
                  className={`flex-shrink-0 lg:w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal ${moduloActivo === modulo.id
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{modulo.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-6 hidden lg:flex">
                    <span className="text-xs text-gray-500">
                      {modulo.estados.filter(e => e.activo).length} estados
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {modulo.tiempos.filter(t => t.activo).length} términos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {moduloActual && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Configuración de Estados/Columnas Kanban */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        Estados / Columnas Kanban
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Define las columnas que aparecerán en el tablero Kanban de {moduloActual.nombre}
                      </p>
                    </div>
                    <button
                      onClick={agregarEstado}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                        boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar</span>
                    </button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={moduloActual.estados.map(e => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {moduloActual.estados.map((estado, index) => (
                          <EstadoSortable
                            key={estado.id}
                            estado={estado}
                            index={index}
                            onUpdate={actualizarEstado}
                            onDelete={solicitarEliminarEstado}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              {/* Configuración de Tipos de Procesos Judiciales - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposProcesos && moduloActual.tiposProcesos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Procesos Judiciales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de procesos que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <button
                        onClick={agregarTipoProceso}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                          boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Tipo</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {moduloActual.tiposProcesos.map((tipo) => (
                        <div
                          key={tipo.id}
                          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          {/* Fila 1: Nombre + Eliminar */}
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={tipo.nombre}
                              onChange={(e) => actualizarTipoProceso(tipo.id, { nombre: e.target.value })}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre del tipo de proceso"
                            />
                            <button
                              onClick={() => solicitarEliminarTipoProceso(tipo.id)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Fila 2: Descripción */}
                          <div className="mb-3">
                            <textarea
                              value={tipo.descripcion}
                              onChange={(e) => actualizarTipoProceso(tipo.id, { descripcion: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Descripción del tipo de proceso..."
                              rows={2}
                            />
                          </div>

                          {/* Fila 3: Plazo + Alerta + Activo */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {/* Plazo */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Plazo:
                              </label>
                              <input
                                type="number"
                                value={tipo.plazo}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { plazo: parseInt(e.target.value) || 0 })}
                                className="w-14 sm:w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                              <span className="text-xs sm:text-sm text-gray-600">días</span>
                            </div>

                            {/* Alerta */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Alerta:
                              </label>
                              <input
                                type="number"
                                value={tipo.alertaDias}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { alertaDias: parseInt(e.target.value) || 0 })}
                                className="w-14 sm:w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">días antes</span>
                              <span className="text-xs text-gray-600 sm:hidden">d.a.</span>
                            </div>

                            {/* Toggle Activo */}
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                              <input
                                type="checkbox"
                                checked={tipo.activo}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                Activo
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Info adicional */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Información Importante
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Los cambios afectarán todos los expedientes del módulo {moduloActual.nombre}</li>
                        <li>• Las alertas se enviarán automáticamente según los días configurados</li>
                        <li>• Los estados inactivos no aparecerán en el tablero Kanban</li>
                        <li>• El orden de los estados se puede cambiar arrastrándolos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALES DE CONFIRMACIÓN */}

      {/* Modal: Agregar Estado */}
      {showModalAgregarEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo estado al tablero Kanban de {moduloActual?.nombre}?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarEstado(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo estado con el nombre "Nuevo Estado" que podrá personalizar posteriormente.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarEstado(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarEstado}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Estado */}
      {showModalEliminarEstado && estadoAEliminar && (() => {
        // Obtener cantidad de casos asignados al estado
        const cantidadCasos = casosPorEstado[moduloActivo]?.[estadoAEliminar.id] || 0;
        const puedeEliminar = cantidadCasos === 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Eliminar Estado / Columna Kanban</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Verificando si es posible eliminar el estado
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalEliminarEstado(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Información del estado */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Estado: "{estadoAEliminar.nombre}"
                  </p>
                  <p className="text-xs text-gray-600">
                    Módulo: {moduloActual?.nombre}
                  </p>
                </div>

                {/* Validación de casos asignados */}
                {!puedeEliminar ? (
                  // ❌ NO SE PUEDE ELIMINAR - Hay casos asignados
                  <>
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-900 mb-2">
                            ⚠️ No se puede eliminar este estado
                          </p>
                          <p className="text-sm text-red-800 mb-3">
                            Esta columna tiene <strong>{cantidadCasos} {cantidadCasos === 1 ? 'caso' : 'casos'} asignado{cantidadCasos === 1 ? '' : 's'}</strong> actualmente.
                          </p>
                          <div className="bg-white border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-900 mb-2">
                              Para poder eliminar este estado debe:
                            </p>
                            <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside">
                              <li>Mover todos los casos a otro estado</li>
                              <li>Verificar que la columna esté completamente vacía</li>
                              <li>Intentar eliminar nuevamente</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowModalEliminarEstado(false)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                          boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                        }}
                      >
                        Entendido
                      </button>
                    </div>
                  </>
                ) : (
                  // ✅ SÍ SE PUEDE ELIMINAR - Columna vacía
                  <>
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-green-900 mb-1">
                            ✓ Estado vacío - Se puede eliminar
                          </p>
                          <p className="text-xs text-green-800">
                            Esta columna no tiene casos asignados. Es seguro eliminarla.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-800">
                        <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. El estado "{estadoAEliminar.nombre}" será eliminado permanentemente del tablero Kanban de {moduloActual?.nombre}.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowModalEliminarEstado(false)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarEliminarEstado}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                      >
                        Eliminar Estado
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Agregar Tipo de Proceso */}
      {showModalAgregarTipoProceso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Tipo de Proceso</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de proceso judicial?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarTipoProceso(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo tipo de proceso con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nueva Demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarTipoProceso(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarTipoProceso}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Tipo de Proceso */}
      {showModalEliminarTipoProceso && tipoProcesoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Proceso</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de proceso?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarTipoProceso(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Tipo: "{tipoProcesoAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {tipoProcesoAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de nueva demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarTipoProceso(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarTipoProceso}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE ESTADO SORTABLE ============

function EstadoSortable({ estado, index, onUpdate, onDelete }: { estado: EstadoKanban, index: number, onUpdate: (estadoId: string, cambios: Partial<EstadoKanban>) => void, onDelete: (estadoId: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: estado.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      {/* Fila 1: Drag + Orden + Nombre + Eliminar + Activo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
        </div>

        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
          {index + 1}
        </div>

        <input
          type="text"
          value={estado.nombre}
          onChange={(e) => onUpdate(estado.id, { nombre: e.target.value })}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del estado"
        />

        {/* Toggle Activo */}
        <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Activo</span>
        </label>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(estado.id);
          }}
          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}