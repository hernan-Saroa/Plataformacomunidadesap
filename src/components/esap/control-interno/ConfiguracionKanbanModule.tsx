/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE TABLEROS KANBAN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gestión completa de la configuración de tableros Kanban:
 * - Gestión de etapas (crear, modificar, eliminar, reordenar)
 * - Configuración de tiempos SLA por etapa
 * - Límites WIP (Work In Progress)
 * - Colores y estados visuales
 * - Reglas de transición
 * - Notificaciones automáticas
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 16 Enero 2026
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns, Plus, Edit2, Trash2, Save, X, Clock, AlertTriangle,
  GripVertical, Eye, EyeOff, Settings, TrendingUp, Bell,
  ArrowRight, CheckCircle2, Info, Palette, Hash, Timer
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import {
  cargarTablerosKanban,
  crearEtapa,
  actualizarEtapa,
  eliminarEtapa,
  reordenarEtapas,
  LIMITES,
  type EtapaKanban,
  type ConfiguracionTablero
} from '@/services/tableros-kanban.service';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

type VistaConfig = 'etapas' | 'tiempos' | 'limites' | 'transiciones';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionKanbanModule() {
  const [tableros, setTableros] = useState<ConfiguracionTablero[]>([]);
  const [tableroSeleccionado, setTableroSeleccionado] = useState<ConfiguracionTablero | null>(null);
  const [vistaConfig, setVistaConfig] = useState<VistaConfig>('etapas');
  const [cargando, setCargando] = useState(true);
  const [modalEtapa, setModalEtapa] = useState<{ abierto: boolean; etapa?: EtapaKanban; modo: 'crear' | 'editar' }>({
    abierto: false,
    modo: 'crear'
  });

  // Cargar tableros al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const tablerosData = await cargarTablerosKanban();
    setTableros(tablerosData);
    if (tablerosData.length > 0) {
      setTableroSeleccionado(tablerosData[0]);
    }
    setCargando(false);
  };

  // Mostrar loading mientras carga
  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e5da8] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tableros Kanban...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay tableros
  if (!tableroSeleccionado || tableros.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Columns className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No hay tableros Kanban configurados</p>
          <p className="text-sm text-gray-500">Por favor, ejecute las migraciones de base de datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Header con selector de tablero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-gray-900 font-medium mb-1">Configuración de Tableros Kanban</h2>
            <p className="text-sm text-gray-600">Gestión de etapas, tiempos SLA y límites WIP</p>
          </div>
          {authService.hasPermission(Permissions.CONTROL_INTERNO_CONFIGURACIONES_KANBAN_CREATE) && (
          <button
            onClick={() => setModalEtapa({ abierto: true, modo: 'crear' })}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Etapa
          </button>
          )}
        </div>

        {/* Selector de Tablero */}
        <div className="flex gap-3">
          {tableros.map((tablero) => (
            <button
              key={tablero.id}
              onClick={() => setTableroSeleccionado(tablero)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                tableroSeleccionado?.id === tablero.id
                  ? 'border-[#1e5da8] bg-blue-50 text-[#1e5da8]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">{tablero.nombre}</div>
              <div className="text-xs opacity-70">{tablero.etapas.length} etapas</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs de Configuración */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 px-6">
            <TabConfigButton
              active={vistaConfig === 'etapas'}
              onClick={() => setVistaConfig('etapas')}
              icon={<Columns className="w-4 h-4" />}
              label="Gestión de Etapas"
            />
            <TabConfigButton
              active={vistaConfig === 'tiempos'}
              onClick={() => setVistaConfig('tiempos')}
              icon={<Clock className="w-4 h-4" />}
              label="Tiempos SLA"
            />
            <TabConfigButton
              active={vistaConfig === 'limites'}
              onClick={() => setVistaConfig('limites')}
              icon={<Hash className="w-4 h-4" />}
              label="Límites WIP"
            />
            <TabConfigButton
              active={vistaConfig === 'transiciones'}
              onClick={() => setVistaConfig('transiciones')}
              icon={<ArrowRight className="w-4 h-4" />}
              label="Reglas de Transición"
            />
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={vistaConfig}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {vistaConfig === 'etapas' && (
                <VistaGestionEtapas
                  tablero={tableroSeleccionado}
                  onEditarEtapa={(etapa) => setModalEtapa({ abierto: true, etapa, modo: 'editar' })}
                  onReload={cargarDatos}
                />
              )}
              {vistaConfig === 'tiempos' && <VistaTiemposSLA tablero={tableroSeleccionado} onReload={cargarDatos} />}
              {vistaConfig === 'limites' && <VistaLimitesWIP tablero={tableroSeleccionado} onReload={cargarDatos} />}
              {vistaConfig === 'transiciones' && <VistaTransiciones tablero={tableroSeleccionado} onReload={cargarDatos} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Crear/Editar Etapa */}
      {modalEtapa.abierto && (
        <ModalEtapaKanban
          tablero={tableroSeleccionado}
          etapa={modalEtapa.etapa}
          modo={modalEtapa.modo}
          onClose={() => setModalEtapa({ abierto: false, modo: 'crear' })}
          onGuardar={async (etapa) => {
            if (modalEtapa.modo === 'crear') {
              const nuevaEtapa = await crearEtapa(tableroSeleccionado.id, etapa);
              if (nuevaEtapa) {
                toast.success('Etapa creada exitosamente');
                await cargarDatos();
              }
            } else if (modalEtapa.etapa?.id) {
              const etapaActualizada = await actualizarEtapa(tableroSeleccionado.id, modalEtapa.etapa.id, etapa);
              if (etapaActualizada) {
                toast.success('Etapa actualizada exitosamente');
                await cargarDatos();
              }
            }
            setModalEtapa({ abierto: false, modo: 'crear' });
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface TabConfigButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabConfigButton({ active, onClick, icon, label }: TabConfigButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: GESTIÓN DE ETAPAS
// ════════════════════════════════════════════════════════════════════════════

interface VistaGestionEtapasProps {
  tablero: ConfiguracionTablero;
  onEditarEtapa: (etapa: EtapaKanban) => void;
  onReload: () => void;
}

function VistaGestionEtapas({ tablero, onEditarEtapa, onReload }: VistaGestionEtapasProps) {
  const [etapas, setEtapas] = useState(tablero.etapas);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  console.log(tablero)
  // Actualizar etapas cuando cambia el tablero
  useEffect(() => {
    setEtapas(tablero.etapas);
  }, [tablero.etapas]);

  const handleEliminarEtapa = async (etapaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta etapa? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await eliminarEtapa(tablero.id, etapaId);
      toast.success('Etapa eliminada exitosamente');
      onReload();
    } catch (error) {
      // Error ya manejado en eliminarEtapa
    }
  };

  const handleDragStart = (e: React.DragEvent, etapaId: string) => {
    setArrastrando(etapaId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sobreEtapaId: string) => {
    e.preventDefault();
    if (!arrastrando || arrastrando === sobreEtapaId) return;

    const etapasReordenadas = [...etapas];
    const indiceArrastrando = etapasReordenadas.findIndex(e => e.id === arrastrando);
    const indiceSobre = etapasReordenadas.findIndex(e => e.id === sobreEtapaId);

    if (indiceArrastrando !== -1 && indiceSobre !== -1) {
      const [etapaMovida] = etapasReordenadas.splice(indiceArrastrando, 1);
      etapasReordenadas.splice(indiceSobre, 0, etapaMovida);
      setEtapas(etapasReordenadas);
    }
  };

  const handleDragEnd = async () => {
    if (!arrastrando) return;

    const nuevosIds = etapas.map(e => e.id);
    const exito = await reordenarEtapas(tablero.id, nuevosIds);
    
    if (exito) {
      toast.success('Etapas reordenadas exitosamente');
      onReload();
    } else {
      // Revertir cambios si falla
      setEtapas(tablero.etapas);
    }

    setArrastrando(null);
  };

  const moverEtapa = async (etapaId: string, direccion: 'arriba' | 'abajo') => {
    const indice = etapas.findIndex(e => e.id === etapaId);
    if (indice === -1) return;
    
    if (direccion === 'arriba' && indice === 0) return;
    if (direccion === 'abajo' && indice === etapas.length - 1) return;

    const etapasReordenadas = [...etapas];
    const nuevoIndice = direccion === 'arriba' ? indice - 1 : indice + 1;
    
    [etapasReordenadas[indice], etapasReordenadas[nuevoIndice]] = 
    [etapasReordenadas[nuevoIndice], etapasReordenadas[indice]];

    setEtapas(etapasReordenadas);

    const nuevosIds = etapasReordenadas.map(e => e.id);
    const exito = await reordenarEtapas(tablero.id, nuevosIds);
    
    if (exito) {
      toast.success('Orden actualizado');
      onReload();
    } else {
      setEtapas(tablero.etapas);
    }
  };

  const viewBtns = (tipo: string, action: string) => {
    if (authService.isSuperAdmin()) return true
    let permisions = 'NULL'
    if (action == 'edit' && tipo == 'auditorias') permisions = Permissions.CONTROL_INTERNO_CONFIGURACIONES_KANBAN_AUDIT_EDIT
    if (action == 'edit' && tipo == 'planes_mejoramiento') permisions = Permissions.CONTROL_INTERNO_CONFIGURACIONES_KANBAN_PLAN_EDIT
    if (action == 'delete' && tipo == 'auditorias') permisions = Permissions.CONTROL_INTERNO_CONFIGURACIONES_KANBAN_AUDIT_DELETE
    if (action == 'delete' && tipo == 'planes_mejoramiento') permisions = Permissions.CONTROL_INTERNO_CONFIGURACIONES_KANBAN_PLAN_DELETE
    return authService.hasPermission(permisions);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base text-gray-900 font-medium">Etapas del Tablero</h3>
          <p className="text-sm text-gray-600">
            {arrastrando ? (
              <span className="text-[#1e5da8] font-medium">
                ↕️ Arrastrando etapa... suelta para confirmar
              </span>
            ) : (
              <>Arrastra para reordenar • {etapas.length} etapas configuradas</>
            )}
          </p>
        </div>
      </div>

      {/* Lista de Etapas */}
      <div className="space-y-3">
        {etapas.map((etapa, index) => (
          <div
            key={etapa.id}
            draggable
            onDragStart={(e) => handleDragStart(e, etapa.id)}
            onDragOver={(e) => handleDragOver(e, etapa.id)}
            onDragEnd={handleDragEnd}
            className={`bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all ${
              arrastrando === etapa.id ? 'opacity-50 scale-95' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle y Botones de Orden */}
              <div className="flex flex-col gap-1">
                <button 
                  className="mt-1 text-gray-400 hover:text-gray-600 cursor-move"
                  title="Arrastra para reordenar"
                >
                  <GripVertical className="w-5 h-5" />
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moverEtapa(etapa.id, 'arriba')}
                    disabled={index === 0}
                    className="p-0.5 text-gray-400 hover:text-[#1e5da8] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover arriba"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moverEtapa(etapa.id, 'abajo')}
                    disabled={index === etapas.length - 1}
                    className="p-0.5 text-gray-400 hover:text-[#1e5da8] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover abajo"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Color Preview */}
              <div
                className="w-4 h-4 rounded mt-1 flex-shrink-0"
                style={{ backgroundColor: etapa.color }}
              />

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-sm text-gray-900 font-medium">{etapa.nombre}</h4>
                  <span className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-mono">
                    #{index + 1}
                  </span>
                  {!etapa.visible && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      Oculta
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{etapa.descripcion}</p>

                {/* Indicadores */}
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    SLA: {etapa.tiempoSLA} días
                  </div>
                  {etapa.limiteWIP && (
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      WIP: {etapa.limiteWIP} máximo
                    </div>
                  )}
                  {etapa.notificarVencimiento && (
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      Alerta {etapa.diasAnticipacionAlerta} días antes
                    </div>
                  )}
                  {etapa.permitirRetroceso && (
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Permite retroceso
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                { viewBtns(tablero.tipo, 'edit') && (
                <button
                  onClick={() => onEditarEtapa(etapa)}
                  className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                )}
                { viewBtns(tablero.tipo, 'delete') && (
                <button
                  onClick={() => handleEliminarEtapa(etapa.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: TIEMPOS SLA
// ════════════════════════════════════════════════════════════════════════════

interface VistaTiemposSLAProps {
  tablero: ConfiguracionTablero;
  onReload: () => void;
}

function VistaTiemposSLA({ tablero, onReload }: VistaTiemposSLAProps) {
  const [editandoEtapas, setEditandoEtapas] = useState<Record<string, Partial<EtapaKanban>>>({});

  const tiempoTotal = useMemo(() => {
    return tablero.etapas.reduce((acc, etapa) => {
      const etapaEditada = editandoEtapas[etapa.id];
      return acc + (etapaEditada?.tiempoSLA ?? etapa.tiempoSLA);
    }, 0);
  }, [tablero.etapas, editandoEtapas]);

  const handleGuardarEtapa = async (etapa: EtapaKanban) => {
    const cambios = editandoEtapas[etapa.id];
    if (!cambios) return;

    const etapaActualizada = await actualizarEtapa(tablero.id, etapa.id, { ...etapa, ...cambios });
    if (etapaActualizada) {
      toast.success('Tiempos SLA actualizados');
      setEditandoEtapas((prev) => {
        const { [etapa.id]: _, ...rest } = prev;
        return rest;
      });
      onReload();
    }
  };

  const handleCambio = (etapaId: string, campo: keyof EtapaKanban, valor: any) => {
    setEditandoEtapas((prev) => ({
      ...prev,
      [etapaId]: { ...(prev[etapaId] || {}), [campo]: valor }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base text-gray-900 font-medium">Configuración de Tiempos SLA</h3>
          <p className="text-sm text-gray-600">Tiempo total estimado: {tiempoTotal} días hábiles</p>
        </div>
      </div>

      {/* Visualización de Tiempos */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Distribución de Tiempos por Etapa</h4>
        
        <div className="space-y-4">
          {tablero.etapas.map((etapa) => {
            const porcentaje = tiempoTotal > 0 ? (etapa.tiempoSLA / tiempoTotal) * 100 : 0;

            return (
              <div key={etapa.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
                    <span className="text-gray-900">{etapa.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">{etapa.tiempoSLA} días</span>
                    <span className="text-gray-500">({porcentaje.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ 
                      width: `${porcentaje}%`,
                      backgroundColor: etapa.color
                    }}
                  />
                </div>

                {etapa.notificarVencimiento && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                    <Bell className="w-3 h-3" />
                    Alerta {etapa.diasAnticipacionAlerta} días antes del vencimiento
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuración Rápida */}
      <div className="grid grid-cols-2 gap-4">
        {tablero.etapas
          .filter(e => e.tiempoSLA > 0 || e.estado !== 'final')
          .map((etapa) => {
            const valores = { ...etapa, ...(editandoEtapas[etapa.id] || {}) };
            const tieneCambios = !!editandoEtapas[etapa.id];

            return (
              <div key={etapa.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
                    <span className="text-sm text-gray-900 font-medium">{etapa.nombre}</span>
                  </div>
                  {tieneCambios && (
                    <button
                      onClick={() => handleGuardarEtapa(etapa)}
                      className="px-2 py-1 bg-[#1e5da8] text-white rounded text-xs hover:bg-[#1a4d8f] flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Guardar
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tiempo SLA (días) <span className="text-gray-400">(0-365)</span></label>
                    <input
                      type="number"
                      min={LIMITES.TIEMPO_SLA_MIN}
                      max={LIMITES.TIEMPO_SLA_MAX}
                      value={valores.tiempoSLA}
                      onChange={(e) => {
                        const valor = Math.min(Math.max(parseInt(e.target.value) || 0, LIMITES.TIEMPO_SLA_MIN), LIMITES.TIEMPO_SLA_MAX);
                        handleCambio(etapa.id, 'tiempoSLA', valor);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Alerta anticipada (días) <span className="text-gray-400">(0-90)</span></label>
                    <input
                      type="number"
                      min={LIMITES.DIAS_ALERTA_MIN}
                      max={LIMITES.DIAS_ALERTA_MAX}
                      value={valores.diasAnticipacionAlerta}
                      onChange={(e) => {
                        const valor = Math.min(Math.max(parseInt(e.target.value) || 0, LIMITES.DIAS_ALERTA_MIN), LIMITES.DIAS_ALERTA_MAX);
                        handleCambio(etapa.id, 'diasAnticipacionAlerta', valor);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={valores.notificarVencimiento}
                      onChange={(e) => handleCambio(etapa.id, 'notificarVencimiento', e.target.checked)}
                      className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                    />
                    <span className="text-xs text-gray-700">Notificar vencimiento</span>
                  </label>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: LÍMITES WIP
// ════════════════════════════════════════════════════════════════════════════

interface VistaLimitesWIPProps {
  tablero: ConfiguracionTablero;
  onReload: () => void;
}

function VistaLimitesWIP({ tablero, onReload }: VistaLimitesWIPProps) {
  const [editandoEtapas, setEditandoEtapas] = useState<Record<string, Partial<EtapaKanban>>>({});

  const handleGuardarEtapa = async (etapa: EtapaKanban) => {
    const cambios = editandoEtapas[etapa.id];
    if (!cambios) return;

    const etapaActualizada = await actualizarEtapa(tablero.id, etapa.id, { ...etapa, ...cambios });
    if (etapaActualizada) {
      toast.success('Límites WIP actualizados');
      setEditandoEtapas((prev) => {
        const { [etapa.id]: _, ...rest } = prev;
        return rest;
      });
      onReload();
    }
  };

  const handleCambio = (etapaId: string, campo: keyof EtapaKanban, valor: any) => {
    setEditandoEtapas((prev) => ({
      ...prev,
      [etapaId]: { ...(prev[etapaId] || {}), [campo]: valor }
    }));
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base text-gray-900 font-medium">Límites Work In Progress (WIP)</h3>
          <p className="text-sm text-gray-600">Controla la cantidad máxima de elementos por etapa</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-1">¿Qué son los límites WIP?</h4>
          <p className="text-sm text-blue-700">
            Los límites WIP restringen la cantidad de elementos que pueden estar simultáneamente en una etapa,
            ayudando a evitar cuellos de botella y mantener un flujo de trabajo eficiente.
          </p>
        </div>
      </div>

      {/* Configuración de Límites */}
      <div className="grid grid-cols-2 gap-4">
        {tablero.etapas.map((etapa) => {
          const valores = { ...etapa, ...(editandoEtapas[etapa.id] || {}) };
          const tieneCambios = !!editandoEtapas[etapa.id];
          const tieneWIP = valores.limiteWIP !== null && valores.limiteWIP !== undefined;

          return (
            <div key={etapa.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
                  <span className="text-sm text-gray-900 font-medium">{etapa.nombre}</span>
                </div>
                {tieneCambios && (
                  <button
                    onClick={() => handleGuardarEtapa(etapa)}
                    className="px-2 py-1 bg-[#1e5da8] text-white rounded text-xs hover:bg-[#1a4d8f] flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Guardar
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneWIP}
                    onChange={(e) => {
                      const nuevoValor = e.target.checked ? (valores.limiteWIP || 5) : null;
                      handleCambio(etapa.id, 'limiteWIP', nuevoValor);
                    }}
                    className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                  />
                  <span className="text-xs text-gray-700">Aplicar límite WIP</span>
                </label>

                {tieneWIP && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Límite máximo de elementos <span className="text-gray-400">(1-100)</span></label>
                      <input
                        type="number"
                        min={LIMITES.LIMITE_WIP_MIN}
                        max={LIMITES.LIMITE_WIP_MAX}
                        value={valores.limiteWIP || ''}
                        onChange={(e) => {
                          const valor = parseInt(e.target.value) || null;
                          if (valor !== null) {
                            const valorLimitado = Math.min(Math.max(valor, LIMITES.LIMITE_WIP_MIN), LIMITES.LIMITE_WIP_MAX);
                            handleCambio(etapa.id, 'limiteWIP', valorLimitado);
                          } else {
                            handleCambio(etapa.id, 'limiteWIP', null);
                          }
                        }}
                        placeholder="Sin límite"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                      />
                    </div>

                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      El sistema alertará al alcanzar {valores.limiteWIP} elementos
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: REGLAS DE TRANSICIÓN
// ════════════════════════════════════════════════════════════════════════════

interface VistaTransicionesProps {
  tablero: ConfiguracionTablero;
  onReload: () => void;
}

function VistaTransiciones({ tablero, onReload }: VistaTransicionesProps) {
  const [editandoEtapas, setEditandoEtapas] = useState<Record<string, boolean>>({});

  const handleCambioRetroceso = async (etapa: EtapaKanban, permitir: boolean) => {
    const etapaActualizada = await actualizarEtapa(tablero.id, etapa.id, {
      ...etapa,
      permitirRetroceso: permitir
    });

    if (etapaActualizada) {
      toast.success(`Retroceso ${permitir ? 'permitido' : 'bloqueado'} para ${etapa.nombre}`);
      onReload();
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base text-gray-900 font-medium">Reglas de Transición entre Etapas</h3>
          <p className="text-sm text-gray-600">Define qué movimientos están permitidos en el tablero</p>
        </div>
      </div>

      {/* Matriz de Transiciones */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Desde</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Hacia</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Permitir Retroceso</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tablero.etapas.slice(0, -1).map((etapa, index) => {
                const siguienteEtapa = tablero.etapas[index + 1];

                return (
                  <tr key={etapa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
                        <span className="text-sm text-gray-900">{etapa.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: siguienteEtapa.color }} />
                          <span className="text-sm text-gray-900">{siguienteEtapa.nombre}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={etapa.permitirRetroceso}
                          onChange={(e) => handleCambioRetroceso(etapa, e.target.checked)}
                          className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                        etapa.permitirRetroceso 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {etapa.permitirRetroceso ? 'Permitido' : 'Bloqueado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR/EDITAR ETAPA
// ════════════════════════════════════════════════════════════════════════════

interface ModalEtapaKanbanProps {
  tablero: ConfiguracionTablero;
  etapa?: EtapaKanban;
  modo: 'crear' | 'editar';
  onClose: () => void;
  onGuardar: (etapa: EtapaKanban) => void;
}

function ModalEtapaKanban({ tablero, etapa, modo, onClose, onGuardar }: ModalEtapaKanbanProps) {
  const [formData, setFormData] = useState<Partial<EtapaKanban>>(
    etapa || {
      nombre: '',
      descripcion: '',      orden: tablero.etapas.length + 1,      color: '#3B82F6',
      tiempoSLA: 15,
      limiteWIP: null,
      visible: true,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 3,
      estado: 'intermedia',
      permitirRetroceso: true
    }
  );

  const coloresDisponibles = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'
  ];

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title={modo === 'crear' ? 'Nueva Etapa del Kanban' : 'Editar Etapa'}
      size="large"
    >
      <div className="p-6">
        <div className="space-y-4">
          {/* Información Básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Etapa *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Ejecución"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado de la Etapa</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as EtapaKanban['estado'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              >
                <option value="inicial">Inicial</option>
                <option value="intermedia">Intermedia</option>
                <option value="final">Final</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe el propósito de esta etapa..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color de la Etapa</label>
            <div className="flex gap-2">
              {coloresDisponibles.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Tiempos y Límites */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo SLA (días) <span className="text-gray-500 text-xs">(0-365)</span>
              </label>
              <input
                type="number"
                min={LIMITES.TIEMPO_SLA_MIN}
                max={LIMITES.TIEMPO_SLA_MAX}
                value={formData.tiempoSLA}
                onChange={(e) => {
                  const valor = Math.min(Math.max(parseInt(e.target.value) || 0, LIMITES.TIEMPO_SLA_MIN), LIMITES.TIEMPO_SLA_MAX);
                  setFormData({ ...formData, tiempoSLA: valor });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Límite WIP <span className="text-gray-500 text-xs">(1-100)</span>
              </label>
              <input
                type="number"
                min={LIMITES.LIMITE_WIP_MIN}
                max={LIMITES.LIMITE_WIP_MAX}
                value={formData.limiteWIP || ''}
                onChange={(e) => {
                  const valor = e.target.value ? parseInt(e.target.value) : null;
                  if (valor !== null) {
                    const valorLimitado = Math.min(Math.max(valor, LIMITES.LIMITE_WIP_MIN), LIMITES.LIMITE_WIP_MAX);
                    setFormData({ ...formData, limiteWIP: valorLimitado });
                  } else {
                    setFormData({ ...formData, limiteWIP: null });
                  }
                }}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alerta (días antes) <span className="text-gray-500 text-xs">(0-90)</span>
              </label>
              <input
                type="number"
                min={LIMITES.DIAS_ALERTA_MIN}
                max={LIMITES.DIAS_ALERTA_MAX}
                value={formData.diasAnticipacionAlerta}
                onChange={(e) => {
                  const valor = Math.min(Math.max(parseInt(e.target.value) || 0, LIMITES.DIAS_ALERTA_MIN), LIMITES.DIAS_ALERTA_MAX);
                  setFormData({ ...formData, diasAnticipacionAlerta: valor });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visible}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
              />
              <span className="text-sm text-gray-700">Etapa visible en el tablero</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notificarVencimiento}
                onChange={(e) => setFormData({ ...formData, notificarVencimiento: e.target.checked })}
                className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
              />
              <span className="text-sm text-gray-700">Notificar al acercarse el vencimiento</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.permitirRetroceso}
                onChange={(e) => setFormData({ ...formData, permitirRetroceso: e.target.checked })}
                className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
              />
              <span className="text-sm text-gray-700">Permitir retroceder desde etapas posteriores</span>
            </label>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(formData as EtapaKanban)}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {modo === 'crear' ? 'Crear Etapa' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}
