/**
 * ConfiguracionesSIGL - Módulo de Configuraciones SIGL
 * Permite configurar estados, columnas y tiempos de todos los tableros Kanban
 * DISEÑO 100% COHERENTE CON CONTROL DISCIPLINARIO Y GESTIÓN LEGAL
 */

import { useState } from 'react';
import { Settings, Clock, LayoutGrid, Palette, Save, RotateCcw, Plus, Trash2, GripVertical, AlertCircle, Scale } from 'lucide-react';
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
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
}

interface ConfiguracionTiempo {
  id: string;
  tipo: string;
  dias: number;
  alertaDias: number;
  activo: boolean;
}

interface ConfiguracionModulo {
  id: string;
  nombre: string;
  estados: EstadoKanban[];
  tiempos: ConfiguracionTiempo[];
  tiposProcesos?: TipoProcesoJudicial[];
}

interface TipoProcesoJudicial {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// ============ DATOS INICIALES ============

const configuracionesIniciales: ConfiguracionModulo[] = [
  {
    id: 'defensa-judicial',
    nombre: 'Defensa Judicial',
    estados: [
      { id: 'radicado', nombre: 'Radicado', color: '#3B82F6', orden: 1, activo: true },
      { id: 'en-estudio', nombre: 'En Estudio', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'contestacion', nombre: 'Contestación', color: '#F59E0B', orden: 3, activo: true },
      { id: 'pruebas', nombre: 'Pruebas', color: '#06B6D4', orden: 4, activo: true },
      { id: 'alegatos', nombre: 'Alegatos', color: '#EC4899', orden: 5, activo: true },
      { id: 'sentencia', nombre: 'Sentencia', color: '#10B981', orden: 6, activo: true },
      { id: 'archivo', nombre: 'Archivo', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'estudio-inicial', tipo: 'Estudio Inicial', dias: 5, alertaDias: 2, activo: true },
      { id: 'contestacion-demanda', tipo: 'Contestación Demanda', dias: 30, alertaDias: 7, activo: true },
      { id: 'presentacion-pruebas', tipo: 'Presentación Pruebas', dias: 20, alertaDias: 5, activo: true },
      { id: 'alegatos-conclusion', tipo: 'Alegatos de Conclusión', dias: 15, alertaDias: 3, activo: true },
    ],
    tiposProcesos: [
      { id: 'reparacion-directa', nombre: 'Reparación Directa', descripcion: 'Acción para obtener indemnización de perjuicios causados por hecho, omisión, operación administrativa u ocupación temporal o permanente de inmueble.', activo: true },
      { id: 'nulidad-restablecimiento', nombre: 'Nulidad y Restablecimiento del Derecho', descripcion: 'Acción para declarar la nulidad de un acto administrativo y restablecer el derecho afectado.', activo: true },
      { id: 'accion-grupo', nombre: 'Acción de Grupo', descripcion: 'Acción interpuesta por un grupo de personas para obtener el reconocimiento y pago de indemnización de perjuicios.', activo: true },
      { id: 'accion-popular', nombre: 'Acción Popular', descripcion: 'Acción para la protección de los derechos e intereses colectivos.', activo: true },
      { id: 'controversias-contractuales', nombre: 'Controversias Contractuales', descripcion: 'Acción para resolver controversias surgidas de contratos estatales.', activo: true },
      { id: 'tutela', nombre: 'Tutela', descripcion: 'Acción para la protección inmediata de derechos fundamentales.', activo: true },
      { id: 'proceso-ejecutivo', nombre: 'Proceso Ejecutivo', descripcion: 'Proceso para el cobro de obligaciones claras, expresas y exigibles.', activo: true },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otros tipos de procesos judiciales no categorizados.', activo: true },
    ],
  },
  {
    id: 'juzgamiento',
    nombre: 'Juzgamiento Disciplinario',
    estados: [
      { id: 'queja', nombre: 'Queja', color: '#3B82F6', orden: 1, activo: true },
      { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'investigacion', nombre: 'Investigación', color: '#F59E0B', orden: 3, activo: true },
      { id: 'pliego-cargos', nombre: 'Pliego de Cargos', color: '#EF4444', orden: 4, activo: true },
      { id: 'descargos', nombre: 'Descargos', color: '#EC4899', orden: 5, activo: true },
      { id: 'fallo', nombre: 'Fallo', color: '#10B981', orden: 6, activo: true },
      { id: 'archivo', nombre: 'Archivo', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'indagacion-preliminar', tipo: 'Indagación Preliminar', dias: 6, alertaDias: 2, activo: true },
      { id: 'investigacion-disciplinaria', tipo: 'Investigación Disciplinaria', dias: 6, alertaDias: 2, activo: true },
      { id: 'descargos-investigado', tipo: 'Descargos Investigado', dias: 10, alertaDias: 3, activo: true },
      { id: 'fallo-primera-instancia', tipo: 'Fallo Primera Instancia', dias: 30, alertaDias: 7, activo: true },
    ],
  },
  {
    id: 'asesoria',
    nombre: 'Asesoría Jurídica',
    estados: [
      { id: 'recibida', nombre: 'Recibida', color: '#3B82F6', orden: 1, activo: true },
      { id: 'en-analisis', nombre: 'En Análisis', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'revision-supervisor', nombre: 'Revisión Supervisor', color: '#F59E0B', orden: 3, activo: true },
      { id: 'concepto-emitido', nombre: 'Concepto Emitido', color: '#10B981', orden: 4, activo: true },
      { id: 'archivo', nombre: 'Archivo', color: '#6B7280', orden: 5, activo: true },
    ],
    tiempos: [
      { id: 'analisis-inicial', tipo: 'Análisis Inicial', dias: 3, alertaDias: 1, activo: true },
      { id: 'emision-concepto', tipo: 'Emisión Concepto', dias: 10, alertaDias: 3, activo: true },
      { id: 'revision-superior', tipo: 'Revisión Superior', dias: 5, alertaDias: 2, activo: true },
    ],
  },
  {
    id: 'procesos-coactivos',
    nombre: 'Procesos Coactivos',
    estados: [
      { id: 'mandamiento-pago', nombre: 'Mandamiento de Pago', color: '#3B82F6', orden: 1, activo: true },
      { id: 'notificacion', nombre: 'Notificación', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'excepciones', nombre: 'Excepciones', color: '#F59E0B', orden: 3, activo: true },
      { id: 'embargo', nombre: 'Embargo', color: '#EF4444', orden: 4, activo: true },
      { id: 'remate', nombre: 'Remate', color: '#EC4899', orden: 5, activo: true },
      { id: 'pago', nombre: 'Pago', color: '#10B981', orden: 6, activo: true },
      { id: 'terminado', nombre: 'Terminado', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'mandamiento-pago', tipo: 'Mandamiento de Pago', dias: 10, alertaDias: 3, activo: true },
      { id: 'notificacion-deudor', tipo: 'Notificación Deudor', dias: 15, alertaDias: 5, activo: true },
      { id: 'respuesta-excepciones', tipo: 'Respuesta Excepciones', dias: 10, alertaDias: 3, activo: true },
      { id: 'proceso-embargo', tipo: 'Proceso Embargo', dias: 30, alertaDias: 7, activo: true },
    ],
  },
];

// ============ COLORES PREDEFINIDOS ============

const coloresPredefinidos = [
  { nombre: 'Azul', hex: '#3B82F6' },
  { nombre: 'Púrpura', hex: '#8B5CF6' },
  { nombre: 'Naranja', hex: '#F59E0B' },
  { nombre: 'Rojo', hex: '#EF4444' },
  { nombre: 'Rosa', hex: '#EC4899' },
  { nombre: 'Verde', hex: '#10B981' },
  { nombre: 'Cian', hex: '#06B6D4' },
  { nombre: 'Gris', hex: '#6B7280' },
  { nombre: 'Amarillo', hex: '#FBBF24' },
  { nombre: 'Índigo', hex: '#6366F1' },
];

// ============ COMPONENTE PRINCIPAL ============

export function ConfiguracionesSIGL() {
  const [moduloActivo, setModuloActivo] = useState<string>('defensa-judicial');
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(configuracionesIniciales);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  const moduloActual = configuraciones.find(m => m.id === moduloActivo);

  // ============ FUNCIONES DE ESTADOS ============

  const agregarEstado = () => {
    if (!moduloActual) return;
    
    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      orden: moduloActual.estados.length + 1,
      activo: true,
    };

    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, estados: [...m.estados, nuevoEstado] }
        : m
    ));
    setCambiosPendientes(true);
  };

  const eliminarEstado = (estadoId: string) => {
    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, estados: m.estados.filter(e => e.id !== estadoId) }
        : m
    ));
    setCambiosPendientes(true);
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { 
            ...m, 
            estados: m.estados.map(e => 
              e.id === estadoId ? { ...e, ...cambios } : e
            )
          }
        : m
    ));
    setCambiosPendientes(true);
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

    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, tiempos: [...m.tiempos, nuevoTiempo] }
        : m
    ));
    setCambiosPendientes(true);
  };

  const eliminarTiempo = (tiempoId: string) => {
    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, tiempos: m.tiempos.filter(t => t.id !== tiempoId) }
        : m
    ));
    setCambiosPendientes(true);
  };

  const actualizarTiempo = (tiempoId: string, cambios: Partial<ConfiguracionTiempo>) => {
    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { 
            ...m, 
            tiempos: m.tiempos.map(t => 
              t.id === tiempoId ? { ...t, ...cambios } : t
            )
          }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE TIPOS DE PROCESOS ============

  const agregarTipoProceso = () => {
    if (!moduloActual || !moduloActual.tiposProcesos) return;
    
    const nuevoTipo: TipoProcesoJudicial = {
      id: `tipo-${Date.now()}`,
      nombre: 'Nuevo Tipo de Proceso',
      descripcion: 'Descripción del nuevo tipo de proceso judicial',
      activo: true,
    };

    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, tiposProcesos: [...(m.tiposProcesos || []), nuevoTipo] }
        : m
    ));
    setCambiosPendientes(true);
  };

  const eliminarTipoProceso = (tipoId: string) => {
    const tipoAEliminar = moduloActual?.tiposProcesos?.find(t => t.id === tipoId);
    
    if (!tipoAEliminar) return;

    // Confirmación antes de eliminar
    if (confirm(`¿Está seguro de eliminar el tipo de proceso "${tipoAEliminar.nombre}"?\n\nEsta acción no se puede deshacer y afectará los formularios de nueva demanda.`)) {
      setConfiguraciones(prev => prev.map(m => 
        m.id === moduloActivo 
          ? { ...m, tiposProcesos: (m.tiposProcesos || []).filter(t => t.id !== tipoId) }
          : m
      ));
      setCambiosPendientes(true);
      
      toast.success('Tipo de proceso eliminado', {
        description: `"${tipoAEliminar.nombre}" ha sido eliminado correctamente`,
        duration: 3000
      });
    }
  };

  const actualizarTipoProceso = (tipoId: string, cambios: Partial<TipoProcesoJudicial>) => {
    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { 
            ...m, 
            tiposProcesos: (m.tiposProcesos || []).map(t => 
              t.id === tipoId ? { ...t, ...cambios } : t
            )
          }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ GUARDAR Y RESTABLECER ============

  const guardarConfiguraciones = () => {
    // Aquí se guardaría en backend
    toast.success('Configuraciones guardadas correctamente');
    setCambiosPendientes(false);
  };

  const restablecerDefecto = () => {
    if (confirm('¿Está seguro de restablecer las configuraciones por defecto? Se perderán todos los cambios.')) {
      setConfiguraciones(configuracionesIniciales);
      setCambiosPendientes(false);
      toast.success('Configuraciones restablecidas a valores por defecto');
    }
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

    setConfiguraciones(prev => prev.map(m => 
      m.id === moduloActivo 
        ? { ...m, estados: reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })) }
        : m
    ));
    setCambiosPendientes(true);
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
              <BadgeSIGL variant="warning">
                <AlertCircle className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Cambios sin guardar</span>
                <span className="sm:hidden">Sin guardar</span>
              </BadgeSIGL>
            )}
            <ButtonSIGL variant="outline" onClick={restablecerDefecto} size="sm">
              <RotateCcw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Restablecer</span>
            </ButtonSIGL>
            <ButtonSIGL 
              variant="default" 
              onClick={guardarConfiguraciones}
              disabled={!cambiosPendientes}
              size="sm"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Guardar Cambios</span>
              <span className="sm:hidden">Guardar</span>
            </ButtonSIGL>
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
                  className={`flex-shrink-0 lg:w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal ${
                    moduloActivo === modulo.id
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
              <CardSIGL>
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
                    <ButtonSIGL variant="default" size="sm" onClick={agregarEstado}>
                      <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Agregar</span>
                    </ButtonSIGL>
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
                            onDelete={eliminarEstado}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </CardSIGL>

              {/* Configuración de Tiempos y Términos */}
              <CardSIGL>
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        Tiempos y Términos
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Configura los plazos legales y alertas automáticas para {moduloActual.nombre}
                      </p>
                    </div>
                    <ButtonSIGL variant="default" size="sm" onClick={agregarTiempo}>
                      <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Agregar</span>
                    </ButtonSIGL>
                  </div>

                  <div className="space-y-3">
                    {moduloActual.tiempos.map((tiempo) => (
                      <div 
                        key={tiempo.id}
                        className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        {/* Fila 1: Tipo de Término + Eliminar */}
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            value={tiempo.tipo}
                            onChange={(e) => actualizarTiempo(tiempo.id, { tipo: e.target.value })}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tipo de término"
                          />
                          <button
                            onClick={() => eliminarTiempo(tiempo.id)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fila 2: Días + Alerta + Activo */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          {/* Días */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                              Plazo:
                            </label>
                            <input
                              type="number"
                              value={tiempo.dias}
                              onChange={(e) => actualizarTiempo(tiempo.id, { dias: parseInt(e.target.value) || 0 })}
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
                              value={tiempo.alertaDias}
                              onChange={(e) => actualizarTiempo(tiempo.id, { alertaDias: parseInt(e.target.value) || 0 })}
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
                              checked={tiempo.activo}
                              onChange={(e) => actualizarTiempo(tiempo.id, { activo: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700">Activo</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardSIGL>

              {/* Configuración de Tipos de Procesos Judiciales - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposProcesos && moduloActual.tiposProcesos.length > 0 && (
                <CardSIGL>
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
                              onClick={() => eliminarTipoProceso(tipo.id)}
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

                          {/* Fila 3: Toggle Activo */}
                          <div className="flex items-center justify-end">
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tipo.activo}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                {tipo.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardSIGL>
              )}

              {/* Info adicional */}
              <CardSIGL>
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
              </CardSIGL>
            </div>
          )}
        </div>
      </div>
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
      {...attributes}
      {...listeners}
    >
      {/* Fila 1: Drag + Orden + Nombre + Eliminar (Mobile) */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-0">
        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 cursor-move flex-shrink-0" />
        
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

        <button
          onClick={() => onDelete(estado.id)}
          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Fila 2: Color + Preview + Activo */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={estado.color}
            onChange={(e) => onUpdate(estado.id, { color: e.target.value })}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-gray-300 cursor-pointer flex-shrink-0"
          />
          <select
            value={estado.color}
            onChange={(e) => onUpdate(estado.id, { color: e.target.value })}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {coloresPredefinidos.map(color => (
              <option key={color.hex} value={color.hex}>
                {color.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div 
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm font-semibold"
          style={{ backgroundColor: estado.color }}
        >
          Preview
        </div>

        {/* Toggle Activo */}
        <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm text-gray-700">Activo</span>
        </label>
      </div>
    </div>
  );
}