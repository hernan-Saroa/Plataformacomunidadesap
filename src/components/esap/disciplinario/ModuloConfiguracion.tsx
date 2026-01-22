/**
 * Módulo de Configuración - Control Interno Disciplinario
 * Configuración integral del sistema disciplinario con diseño Kanban
 * COHERENTE CON EL MÓDULO DE CONTROL DISCIPLINARIO
 */

import { useState } from 'react';
import { 
  Settings, Clock, LayoutGrid, Save, RotateCcw, Plus, Trash2, GripVertical, 
  AlertCircle, X, CheckCircle, Users, Bell, Target, AlertTriangle, Calendar,
  Mail, Zap
} from 'lucide-react';
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
import { toast } from 'sonner@2.0.3';

// ============ INTERFACES ============

interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  dias: number; // ✅ Tiempo estándar en días
  alertaDias: number; // ✅ Días antes para alertar
  orden: number;
  activo: boolean;
}

interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  activo: boolean;
}

interface ConfiguracionNotificaciones {
  vencimiento7dias: boolean;
  vencimiento3dias: boolean;
  vencimiento1dia: boolean;
  procesoVencido: boolean;
  asignacionProceso: boolean;
  cambioEtapa: boolean;
  aprobacionRequerida: boolean;
  resumenDiario: boolean;
  resumenSemanal: boolean;
}

interface ConfiguracionAlertas {
  porcentajeRiesgo: number;
  porcentajeCritico: number;
  capacidadAlerta: number;
  diasAnticipacion: number;
}

// ============ CONFIGURACIONES POR DEFECTO ============

const ESTADOS_KANBAN_DEFECTO: EstadoKanban[] = [
  { id: 'recepcion', nombre: 'Recepción', color: '#3B82F6', dias: 3, alertaDias: 1, orden: 1, activo: true },
  { id: 'valoracion', nombre: 'Valoración', color: '#F59E0B', dias: 10, alertaDias: 3, orden: 2, activo: true },
  { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', dias: 40, alertaDias: 10, orden: 3, activo: true },
  { id: 'investigacion', nombre: 'Investigación', color: '#EC4899', dias: 60, alertaDias: 15, orden: 4, activo: true },
  { id: 'juzgamiento', nombre: 'Juzgamiento', color: '#06B6D4', dias: 50, alertaDias: 10, orden: 5, activo: true },
  { id: 'fallo', nombre: 'Fallo', color: '#10B981', dias: 10, alertaDias: 3, orden: 6, activo: true },
];

const CARGOS_DEFECTO: Cargo[] = [
  { id: 'especializado', nombre: 'PROFESIONAL ESPECIALIZADO', capacidad: 12, activo: true },
  { id: 'universitario', nombre: 'PROFESIONAL UNIVERSITARIO', capacidad: 10, activo: true },
  { id: 'senior', nombre: 'PROFESIONAL SENIOR', capacidad: 15, activo: true },
  { id: 'coordinador', nombre: 'COORDINADOR', capacidad: 8, activo: true },
];

const NOTIFICACIONES_DEFECTO: ConfiguracionNotificaciones = {
  vencimiento7dias: true,
  vencimiento3dias: true,
  vencimiento1dia: true,
  procesoVencido: true,
  asignacionProceso: true,
  cambioEtapa: true,
  aprobacionRequerida: false,
  resumenDiario: true,
  resumenSemanal: true,
};

const ALERTAS_DEFECTO: ConfiguracionAlertas = {
  porcentajeRiesgo: 85,
  porcentajeCritico: 95,
  capacidadAlerta: 90,
  diasAnticipacion: 7,
};

// ============ COMPONENTE PRINCIPAL ============

export function ModuloConfiguracion() {
  // Estados
  const [estadosKanban, setEstadosKanban] = useState<EstadoKanban[]>(ESTADOS_KANBAN_DEFECTO);
  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_DEFECTO);
  const [notificaciones, setNotificaciones] = useState<ConfiguracionNotificaciones>(NOTIFICACIONES_DEFECTO);
  const [alertas, setAlertas] = useState<ConfiguracionAlertas>(ALERTAS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Estados para modales
  const [showModalAgregarEstado, setShowModalAgregarEstado] = useState(false);
  const [showModalEliminarEstado, setShowModalEliminarEstado] = useState(false);
  const [estadoAEliminar, setEstadoAEliminar] = useState<EstadoKanban | null>(null);

  // ============ FUNCIONES DE ESTADOS KANBAN ============

  const agregarEstado = () => {
    setShowModalAgregarEstado(true);
  };

  const confirmarAgregarEstado = () => {
    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      dias: 10,
      alertaDias: 3,
      orden: estadosKanban.length + 1,
      activo: true,
    };

    setEstadosKanban([...estadosKanban, nuevoEstado]);
    setCambiosPendientes(true);
    setShowModalAgregarEstado(false);
    
    toast.success('Estado agregado correctamente', {
      description: 'Se ha agregado un nuevo estado al tablero Kanban',
      duration: 3000
    });
  };

  const solicitarEliminarEstado = (estadoId: string) => {
    const estado = estadosKanban.find(e => e.id === estadoId);
    if (estado) {
      setEstadoAEliminar(estado);
      setShowModalEliminarEstado(true);
    }
  };

  const confirmarEliminarEstado = () => {
    if (!estadoAEliminar) return;

    setEstadosKanban(estadosKanban.filter(e => e.id !== estadoAEliminar.id));
    setCambiosPendientes(true);
    setShowModalEliminarEstado(false);
    
    toast.success('Estado eliminado correctamente', {
      description: `"${estadoAEliminar.nombre}" ha sido eliminado del tablero Kanban`,
      duration: 3000
    });
    
    setEstadoAEliminar(null);
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    setEstadosKanban(estadosKanban.map(e => 
      e.id === estadoId ? { ...e, ...cambios } : e
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE CARGOS ============

  const agregarCargo = () => {
    const nuevoCargo: Cargo = {
      id: `cargo-${Date.now()}`,
      nombre: 'NUEVO CARGO',
      capacidad: 10,
      activo: true,
    };
    setCargos([...cargos, nuevoCargo]);
    setCambiosPendientes(true);
    toast.success('Cargo agregado correctamente');
  };

  const eliminarCargo = (cargoId: string) => {
    setCargos(cargos.filter(c => c.id !== cargoId));
    setCambiosPendientes(true);
    toast.success('Cargo eliminado correctamente');
  };

  const actualizarCargo = (cargoId: string, cambios: Partial<Cargo>) => {
    setCargos(cargos.map(c => 
      c.id === cargoId ? { ...c, ...cambios } : c
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES PRINCIPALES ============

  const guardarConfiguraciones = () => {
    try {
      const configuracion = {
        estadosKanban,
        cargos,
        notificaciones,
        alertas,
        alertasProgramadas,
        fechaActualizacion: new Date().toISOString()
      };
      
      localStorage.setItem('disciplinario-configuracion', JSON.stringify(configuracion));
      setCambiosPendientes(false);
      
      toast.success('Configuraciones guardadas correctamente', {
        description: 'Los cambios se han aplicado al sistema disciplinario',
        duration: 3000
      });
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer la configuración a valores por defecto? Esta acción no se puede deshacer.')) {
      setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
      setCargos(CARGOS_DEFECTO);
      setNotificaciones(NOTIFICACIONES_DEFECTO);
      setAlertas(ALERTAS_DEFECTO);
      setAlertasProgramadas(ALERTAS_PROGRAMADAS_DEFECTO);
      setCambiosPendientes(true);
      
      toast.success('Configuraciones restablecidas', {
        description: 'Se han restaurado los valores por defecto',
        duration: 3000
      });
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

    const oldIndex = estadosKanban.findIndex(e => e.id === active.id);
    const newIndex = estadosKanban.findIndex(e => e.id === over.id);

    const reorderedEstados = arrayMove(estadosKanban, oldIndex, newIndex);

    setEstadosKanban(reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })));
    setCambiosPendientes(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <Settings size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Configuración del Sistema
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Parámetros y ajustes del módulo disciplinario
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
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 1. ESTADOS KANBAN - Diseño de SIGL */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                    Estados / Columnas Kanban
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Define las columnas que aparecerán en el tablero Kanban del módulo disciplinario
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
                  <span>Agregar Estado</span>
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={estadosKanban.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {estadosKanban.map((estado, index) => (
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

          {/* 3. CAPACIDAD POR CARGO */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#10B981' }} />
                    Capacidad por Cargo
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Número máximo de procesos que puede gestionar cada tipo de profesional
                  </p>
                </div>
                <button
                  onClick={agregarCargo}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Cargo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cargos.map((cargo) => (
                  <div key={cargo.id} className="p-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-white">
                    <div className="mb-3">
                      <input
                        type="text"
                        value={cargo.nombre}
                        onChange={(e) => actualizarCargo(cargo.id, { nombre: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 text-sm font-bold uppercase border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre del cargo"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-semibold text-gray-700 mb-1 block text-center">
                        Capacidad Máxima
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={cargo.capacidad}
                        onChange={(e) => actualizarCargo(cargo.id, { capacidad: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ color: '#003DA5' }}
                      />
                      <p className="text-xs text-center mt-2 text-gray-600">
                        procesos máximo
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cargo.activo}
                          onChange={(e) => actualizarCargo(cargo.id, { activo: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-gray-700">Activo</span>
                      </label>
                      
                      <button
                        onClick={() => eliminarCargo(cargo.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">Recordatorio:</span> Estas son configuraciones de capacidad. Los usuarios se crean únicamente desde{' '}
                      <span className="font-bold">Administración de Personas → Roles y Permisos</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. NOTIFICACIONES */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F59E0B' }} />
                  Notificaciones
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Configura las alertas automáticas del sistema
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alertas de Vencimiento */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                    Alertas de Vencimiento
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: 'vencimiento7dias', label: '7 días antes del vencimiento' },
                      { key: 'vencimiento3dias', label: '3 días antes del vencimiento' },
                      { key: 'vencimiento1dia', label: '1 día antes del vencimiento' },
                      { key: 'procesoVencido', label: 'Proceso vencido (inmediato)' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                          onChange={(e) => {
                            setNotificaciones({
                              ...notificaciones,
                              [item.key]: e.target.checked
                            });
                            setCambiosPendientes(true);
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notificaciones de Proceso */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                    Notificaciones de Proceso
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: 'asignacionProceso', label: 'Asignación de nuevo proceso' },
                      { key: 'cambioEtapa', label: 'Cambio de etapa' },
                      { key: 'aprobacionRequerida', label: 'Aprobación requerida' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                          onChange={(e) => {
                            setNotificaciones({
                              ...notificaciones,
                              [item.key]: e.target.checked
                            });
                            setCambiosPendientes(true);
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Resúmenes */}
                <div className="p-4 rounded-lg bg-gray-50 md:col-span-2">
                  <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                    Resúmenes Automáticos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'resumenDiario', label: 'Resumen diario (8:00 AM)' },
                      { key: 'resumenSemanal', label: 'Resumen semanal (Lunes 8:00 AM)' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                          onChange={(e) => {
                            setNotificaciones({
                              ...notificaciones,
                              [item.key]: e.target.checked
                            });
                            setCambiosPendientes(true);
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. PARÁMETROS DE ALERTAS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#DC2626' }} />
                  Parámetros de Alertas y Semáforo
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Configure el sistema de semáforo que indica el estado de avance de cada proceso
                </p>
              </div>

              {/* Explicación Visual del Semáforo */}
              <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  ¿Cómo funciona el semáforo de procesos?
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  El sistema calcula automáticamente el <strong>% de tiempo consumido</strong> de cada proceso según los días configurados en cada estado. 
                  Ejemplo: Si un estado dura 10 días y ya pasaron 8 días, el proceso ha consumido el <strong>80%</strong> del tiempo.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Verde */}
                  <div className="bg-white rounded-lg p-4 border-2 border-green-400">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-green-500"></div>
                      <span className="font-bold text-green-800">VERDE - Normal</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      El proceso va a tiempo. Tiempo consumido es <strong>menor al {alertas.porcentajeRiesgo}%</strong>
                    </p>
                    <div className="mt-2 text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                      Ejemplo: 0% - {alertas.porcentajeRiesgo - 1}% consumido
                    </div>
                  </div>

                  {/* Amarillo */}
                  <div className="bg-white rounded-lg p-4 border-2 border-amber-400">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500"></div>
                      <span className="font-bold text-amber-800">AMARILLO - Alerta</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      El proceso está cerca de vencerse. Tiempo consumido entre <strong>{alertas.porcentajeRiesgo}% y {alertas.porcentajeCritico - 1}%</strong>
                    </p>
                    <div className="mt-2 text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      Ejemplo: {alertas.porcentajeRiesgo}% - {alertas.porcentajeCritico - 1}% consumido
                    </div>
                  </div>

                  {/* Rojo */}
                  <div className="bg-white rounded-lg p-4 border-2 border-red-400">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-red-500"></div>
                      <span className="font-bold text-red-800">ROJO - Crítico</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      El proceso está vencido o crítico. Tiempo consumido es <strong>mayor o igual al {alertas.porcentajeCritico}%</strong>
                    </p>
                    <div className="mt-2 text-xs font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                      Ejemplo: {alertas.porcentajeCritico}% - 100%+ consumido
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de Umbrales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Umbral Amarillo */}
                <div className="p-5 rounded-lg bg-amber-50 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          Umbral de Riesgo (Amarillo)
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-200 text-amber-900">
                          {alertas.porcentajeRiesgo}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={alertas.porcentajeRiesgo}
                    onChange={(e) => {
                      const nuevoValor = parseInt(e.target.value);
                      // Asegurar que el amarillo sea menor que el rojo
                      if (nuevoValor < alertas.porcentajeCritico) {
                        setAlertas({
                          ...alertas,
                          porcentajeRiesgo: nuevoValor
                        });
                        setCambiosPendientes(true);
                      }
                    }}
                    className="w-full h-2 bg-gradient-to-r from-green-200 via-amber-300 to-amber-500 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-3 p-3 bg-white rounded border border-amber-300">
                    <p className="text-xs text-gray-700">
                      <strong>Se activa cuando:</strong> Un proceso ha consumido el <strong>{alertas.porcentajeRiesgo}%</strong> del tiempo asignado a su etapa actual.
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      📍 <strong>Ejemplo práctico:</strong> Si una etapa dura 10 días, el semáforo se pondrá amarillo al día {Math.ceil((alertas.porcentajeRiesgo / 100) * 10)}.
                    </p>
                  </div>
                </div>

                {/* Umbral Rojo */}
                <div className="p-5 rounded-lg bg-red-50 border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          Umbral Crítico (Rojo)
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-200 text-red-900">
                          {alertas.porcentajeCritico}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={alertas.porcentajeCritico}
                    onChange={(e) => {
                      const nuevoValor = parseInt(e.target.value);
                      // Asegurar que el rojo sea mayor que el amarillo
                      if (nuevoValor > alertas.porcentajeRiesgo) {
                        setAlertas({
                          ...alertas,
                          porcentajeCritico: nuevoValor
                        });
                        setCambiosPendientes(true);
                      }
                    }}
                    className="w-full h-2 bg-gradient-to-r from-amber-300 via-red-400 to-red-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-3 p-3 bg-white rounded border border-red-300">
                    <p className="text-xs text-gray-700">
                      <strong>Se activa cuando:</strong> Un proceso ha consumido el <strong>{alertas.porcentajeCritico}%</strong> del tiempo asignado a su etapa actual.
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      📍 <strong>Ejemplo práctico:</strong> Si una etapa dura 10 días, el semáforo se pondrá rojo al día {Math.ceil((alertas.porcentajeCritico / 100) * 10)}.
                    </p>
                  </div>
                </div>

                {/* Alerta de Capacidad */}
                <div className="p-5 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          Alerta de Capacidad
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-200 text-blue-900">
                          {alertas.capacidadAlerta}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={alertas.capacidadAlerta}
                    onChange={(e) => {
                      setAlertas({
                        ...alertas,
                        capacidadAlerta: parseInt(e.target.value)
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-full h-2 bg-gradient-to-r from-green-200 via-blue-300 to-blue-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                    <p className="text-xs text-gray-700">
                      <strong>Se activa cuando:</strong> Un profesional alcanza el <strong>{alertas.capacidadAlerta}%</strong> de su capacidad máxima de procesos asignados.
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      📍 <strong>Ejemplo práctico:</strong> Si un profesional puede tener 10 procesos, recibirá alerta al tener {Math.ceil((alertas.capacidadAlerta / 100) * 10)} procesos asignados.
                    </p>
                  </div>
                </div>

                {/* Días de Anticipación */}
                <div className="p-5 rounded-lg bg-purple-50 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          Anticipación de Notificaciones
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-purple-200 text-purple-900">
                          {alertas.diasAnticipacion} días
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={alertas.diasAnticipacion}
                    onChange={(e) => {
                      setAlertas({
                        ...alertas,
                        diasAnticipacion: parseInt(e.target.value)
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-full h-2 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-3 p-3 bg-white rounded border border-purple-300">
                    <p className="text-xs text-gray-700">
                      <strong>Se usa para:</strong> Enviar notificaciones automáticas <strong>{alertas.diasAnticipacion} días antes</strong> de que un proceso llegue a su fecha de vencimiento.
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      📍 <strong>Ejemplo práctico:</strong> Si un proceso vence el 20 de enero, se enviará notificación el {new Date(new Date('2025-01-20').getTime() - alertas.diasAnticipacion * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulación en Tiempo Real */}
              <div className="mt-6 p-5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gray-700" />
                  Simulación: ¿Cómo se verá en el sistema?
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Con tu configuración actual, así se comportará el semáforo en un proceso de <strong>Investigación (60 días)</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-green-500"></div>
                      <span className="text-xs font-bold text-green-800">Días 1 - {Math.floor((alertas.porcentajeRiesgo / 100) * 60)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo VERDE - El proceso va normal
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500"></div>
                      <span className="text-xs font-bold text-amber-800">Días {Math.floor((alertas.porcentajeRiesgo / 100) * 60)} - {Math.floor((alertas.porcentajeCritico / 100) * 60)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo AMARILLO - Requiere atención
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-red-500"></div>
                      <span className="text-xs font-bold text-red-800">Días {Math.floor((alertas.porcentajeCritico / 100) * 60)} - 60+</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo ROJO - Acción urgente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Final */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Información Importante
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Los cambios afectarán todos los procesos del módulo disciplinario</li>
                    <li>• Las alertas se enviarán automáticamente según los días configurados</li>
                    <li>• Los estados inactivos no aparecerán en el tablero Kanban</li>
                    <li>• El orden de los estados se puede cambiar arrastrándolos</li>
                    <li>• Los cambios en capacidad afectan la asignación automática de procesos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALES */}
      
      {/* Modal: Agregar Estado */}
      {showModalAgregarEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo estado al tablero Kanban?
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
      {showModalEliminarEstado && estadoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar este estado?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarEstado(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Estado: "{estadoAEliminar.nombre}"
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. El estado "{estadoAEliminar.nombre}" será eliminado permanentemente del tablero Kanban.
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE ESTADO SORTABLE ============

function EstadoSortable({ estado, index, onUpdate, onDelete }: { 
  estado: EstadoKanban; 
  index: number; 
  onUpdate: (estadoId: string, cambios: Partial<EstadoKanban>) => void; 
  onDelete: (estadoId: string) => void;
}) {
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
      className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200"
    >
      {/* Fila 1: Drag + Orden + Nombre */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
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
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del estado"
        />

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

      {/* Fila 2: Color + Días + Alerta + Activo */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700">
            Color:
          </label>
          <input
            type="color"
            value={estado.color}
            onChange={(e) => onUpdate(estado.id, { color: e.target.value })}
            className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>

        {/* Días estándar */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <label className="text-xs font-semibold text-gray-700">
            Días:
          </label>
          <input
            type="number"
            min="1"
            value={estado.dias}
            onChange={(e) => onUpdate(estado.id, { dias: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alerta */}
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <label className="text-xs font-semibold text-gray-700">
            Alerta:
          </label>
          <input
            type="number"
            min="1"
            value={estado.alertaDias}
            onChange={(e) => onUpdate(estado.id, { alertaDias: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">d.a.</span>
        </div>

        {/* Toggle Activo */}
        <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Activo</span>
        </label>
      </div>
    </div>
  );
}