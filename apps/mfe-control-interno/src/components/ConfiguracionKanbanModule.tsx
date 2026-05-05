/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE TABLEROS KANBAN - VERSIÓN COMPLETA PROFESIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo completo para configurar todos los aspectos del Kanban:
 * ✅ Gestión de Etapas/Columnas (crear, editar, ordenar, eliminar)
 * ✅ Configuración de SLA por etapa (tiempos esperados + alertas)
 * ✅ Límites WIP (Work In Progress) por columna
 * ✅ Reglas de Transición automática
 * ✅ Colores y estilos personalizados
 * ✅ Notificaciones y alertas configurables
 * ✅ Vista previa en tiempo real
 * 
 * ÚLTIMA ACTUALIZACIÓN: 19 Febrero 2026 - CONECTADO CON BACKEND
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns, Settings, Plus, Edit2, Trash2, Save, X,
  Clock, AlertTriangle, CheckCircle2, Layers, Zap, Bell, Eye, Palette,
  ChevronRight, Info, TrendingUp, Layout, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { HeaderSeccionConfig } from './HeaderSeccionConfig';

// ✅ Hook para conexión con backend
import { useConfiguracionKanban, type EtapaKanbanFrontend as EtapaKanban, type ConfiguracionGeneralKanban as ConfiguracionGeneral } from './services/useConfiguracionKanban';

// ✅ Notificar cambios al KanbanConfigContext
import { notificarCambioConfigKanban, type EtapaSLAConfig } from './context/KanbanConfigContext';
// ════════════════════════════════════════════════════════════════════════════
// HELPER: Sync SLA config to localStorage for KanbanConfigContext
// ════════════════════════════════════════════════════════════════════════════

function sincronizarSLAaLocalStorage(etapas: EtapaKanban[]) {
  const slaMap: Record<string, EtapaSLAConfig> = {};
  etapas.forEach(e => {
    slaMap[e.nombre] = {
      nombre: e.nombre,
      slaDias: e.slaDias,
      alertaPrevia: e.alertaPrevia,
      notificacionesActivas: e.notificacionesActivas,
      limiteWIP: e.limiteWIP,
      color: e.color,
    };
  });
  localStorage.setItem('kanban_sla_config', JSON.stringify(slaMap));
}

function sincronizarEtapasTableroLocalStorage(etapas: EtapaKanban[]) {
  const etapasOrdenadas = [...etapas]
    .sort((a, b) => a.orden - b.orden)
    .map((e) => ({
      id: e.nombre,
      nombre: e.nombre,
      orden: e.orden,
      color: e.color,
      slaDias: e.slaDias,
    }));

  localStorage.setItem('kanban_etapas_config', JSON.stringify(etapasOrdenadas));
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionKanbanModule() {
  // ✅ Usar hook para conectar con backend
  const {
    tableroId,
    etapas,
    configGeneral,
    loading,
    error,
    crearEtapa,
    actualizarEtapa,
    eliminarEtapa,
    actualizarConfigGeneral,
    recargarDatos,
  } = useConfiguracionKanban();

  const [etapaEditando, setEtapaEditando] = useState<EtapaKanban | null>(null);
  const [mostrarModalEtapa, setMostrarModalEtapa] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [tabActiva, setTabActiva] = useState<'etapas' | 'general' | 'reglas'>('etapas');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (etapas.length > 0) {
      sincronizarSLAaLocalStorage(etapas);
      sincronizarEtapasTableroLocalStorage(etapas);
      notificarCambioConfigKanban();
    }
  }, [etapas]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS - ETAPAS (conectados al backend)
  // ════════════════════════════════════════════════════════════════════════════

  const handleAgregarEtapa = () => {
    setEtapaEditando({
      id: `etapa-${Date.now()}`,
      nombre: '',
      descripcion: '',
      orden: etapas.length + 1,
      color: '#6B7280',
      limiteWIP: 5,
      slaDias: 15,
      slaHoras: 0,
      alertaPrevia: 3,
      notificacionesActivas: true,
      esInicial: false,
      esFinal: false,
      reglaTransicionAutomatica: false
    });
    setMostrarModalEtapa(true);
  };

  const handleEditarEtapa = (etapa: EtapaKanban) => {
    setEtapaEditando({ ...etapa });
    setMostrarModalEtapa(true);
  };

  const handleGuardarEtapa = async (etapa: EtapaKanban) => {
    setGuardando(true);
    try {
      const existe = etapas.find(e => e.id === etapa.id);
      
      if (existe) {
        // Actualizar etapa existente en el backend
        await actualizarEtapa(etapa.id, etapa);
      } else {
        // Crear nueva etapa en el backend
        await crearEtapa(etapa);
      }
      
      setMostrarModalEtapa(false);
      setEtapaEditando(null);
    } catch (error) {
      console.error('Error guardando etapa:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarEtapa = async (id: string) => {
    const etapa = etapas.find(e => e.id === id);
    
    if (etapa?.esInicial || etapa?.esFinal) {
      toast.error('❌ No se puede eliminar una etapa inicial o final');
      return;
    }
    
    await eliminarEtapa(id);
  };

  const handleGuardarConfiguracion = () => {
    recargarDatos();
    // Sync SLA config to localStorage for KanbanConfigContext
    sincronizarSLAaLocalStorage(etapas);
    sincronizarEtapasTableroLocalStorage(etapas);
    notificarCambioConfigKanban();
    toast.success('💾 Configuración sincronizada', {
      description: 'Los cambios se aplicarán en el tablero Kanban'
    });
  };

  const handleRestaurarDefecto = () => {
    recargarDatos();
    sincronizarSLAaLocalStorage(etapas);
    sincronizarEtapasTableroLocalStorage(etapas);
    notificarCambioConfigKanban();
    toast.info('🔄 Configuración recargada desde el servidor');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ESTADOS DE CARGA Y ERROR
  // ════════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="w-full h-full p-3 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando configuración del Kanban...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full p-3 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div>
            <p className="text-gray-900 font-semibold">Error cargando configuración</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
          <button
            onClick={recargarDatos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <HeaderSeccionConfig
        icon={<Columns className="w-full h-full" />}
        titulo="Configuración del Kanban"
        subtitulo="Personaliza etapas, SLA, límites WIP y reglas de transición"
      >
        {tableroId && (
          <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
            Conectado
          </span>
        )}
        <button
          onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
          className="px-3 py-1.5 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          {mostrarVistaPrevia ? 'Ocultar' : 'Vista Previa'}
        </button>
        <button
          onClick={handleRestaurarDefecto}
          className="px-3 py-1.5 bg-white border border-gray-300 hover:border-yellow-500 text-gray-700 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          Restaurar
        </button>
        <button
          onClick={handleGuardarConfiguracion}
          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-sm text-xs"
        >
          <Save className="w-3.5 h-3.5" />
          Guardar
        </button>
      </HeaderSeccionConfig>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-5">
        <button
          onClick={() => setTabActiva('etapas')}
          className={`flex-1 px-4 py-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 rounded-lg ${
            tabActiva === 'etapas'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Gestión de Etapas
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
            {etapas.length}
          </span>
        </button>
        <button
          onClick={() => setTabActiva('general')}
          className={`flex-1 px-4 py-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 rounded-lg ${
            tabActiva === 'general'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Config. General
        </button>
        <button
          onClick={() => setTabActiva('reglas')}
          className={`flex-1 px-4 py-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 rounded-lg ${
            tabActiva === 'reglas'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Reglas y Alertas
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO POR TAB */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {tabActiva === 'etapas' && (
          <TabEtapas
            key="etapas"
            etapas={etapas}
            onAgregar={handleAgregarEtapa}
            onEditar={handleEditarEtapa}
            onEliminar={handleEliminarEtapa}
          />
        )}
        {tabActiva === 'general' && (
          <TabGeneral
            key="general"
            config={configGeneral}
            onChange={actualizarConfigGeneral}
          />
        )}
        {tabActiva === 'reglas' && (
          <TabReglas
            key="reglas"
            etapas={etapas}
            onActualizarEtapa={actualizarEtapa}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VISTA PREVIA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mostrarVistaPrevia && (
        <VistaPrevia
          etapas={etapas}
          config={configGeneral}
          onCerrar={() => setMostrarVistaPrevia(false)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL EDICIÓN DE ETAPA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mostrarModalEtapa && etapaEditando && (
        <ModalEtapa
          etapa={etapaEditando}
          onGuardar={handleGuardarEtapa}
          onCerrar={() => {
            setMostrarModalEtapa(false);
            setEtapaEditando(null);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: GESTIÓN DE ETAPAS
// ════════════════════════════════════════════════════════════════════════════

interface TabEtapasProps {
  etapas: EtapaKanban[];
  onAgregar: () => void;
  onEditar: (etapa: EtapaKanban) => void;
  onEliminar: (id: string) => void;
}

function TabEtapas({ etapas, onAgregar, onEditar, onEliminar }: TabEtapasProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={onAgregar}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar Etapa
        </button>
      </div>

      {/* Lista de etapas */}
      <div className="space-y-3">
        {etapas.map((etapa) => (
          <div
            key={etapa.id}
            className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-400 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Orden */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Orden
                </span>
                <span className="text-center font-bold text-gray-900 text-sm min-w-8 px-2 py-1 bg-gray-100 rounded-md">
                  {etapa.orden}
                </span>
              </div>

              {/* Información */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: etapa.color }}
                  />
                  <h3 className="text-lg font-black text-gray-900">{etapa.nombre}</h3>
                  {etapa.esInicial && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                      INICIAL
                    </span>
                  )}
                  {etapa.esFinal && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                      FINAL
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{etapa.descripcion}</p>

                {/* Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="text-xs text-blue-600 font-semibold">Límite WIP</div>
                    <div className="text-lg font-black text-blue-700">{etapa.limiteWIP}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2">
                    <div className="text-xs text-purple-600 font-semibold">SLA</div>
                    <div className="text-lg font-black text-purple-700">
                      {etapa.slaDias}d {etapa.slaHoras > 0 && `${etapa.slaHoras}h`}
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xs text-yellow-600 font-semibold">Alerta Previa</div>
                    <div className="text-lg font-black text-yellow-700">{etapa.alertaPrevia}d</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xs text-green-600 font-semibold">Estado</div>
                    <div className="text-xs font-bold text-green-700">
                      {etapa.notificacionesActivas ? '✓ Activo' : '✗ Inactivo'}
                    </div>
                  </div>
                </div>

                {/* Transición automática */}
                {etapa.reglaTransicionAutomatica && (
                  <div className="mt-3 bg-blue-50 border-l-4 border-blue-600 p-2 rounded">
                    <div className="flex items-center gap-2 text-xs text-blue-800">
                      <Zap className="w-3 h-3" />
                      <strong>Transición automática:</strong> {etapa.condicionTransicion}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => onEditar(etapa)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </button>
                <button
                  onClick={() => onEliminar(etapa.id)}
                  disabled={etapa.esInicial || etapa.esFinal}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong className="block mb-1">Consejos de Configuración:</strong>
            <ul className="list-disc list-inside space-y-1">
              <li>El <strong>Límite WIP</strong> controla cuántas auditorías pueden estar en esa etapa simultáneamente</li>
              <li>El <strong>SLA</strong> define el tiempo esperado para completar esa fase</li>
              <li>La <strong>Alerta Previa</strong> notificará días antes de vencer el SLA</li>
              <li>Las etapas marcadas como <strong>Inicial</strong> o <strong>Final</strong> no se pueden eliminar</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: CONFIGURACIÓN GENERAL (REFACTORED — toggles funcionales)
// ════════════════════════════════════════════════════════════════════════════

interface TabGeneralProps {
  config: ConfiguracionGeneral;
  onChange: (config: ConfiguracionGeneral) => void;
}

function TabGeneral({ config, onChange }: TabGeneralProps) {
  const handleToggle = (key: keyof ConfiguracionGeneral) => {
    const nueva = { ...config, [key]: !config[key] };
    onChange(nueva);
    // Notificar al Kanban inmediatamente
    notificarCambioConfigKanban();
    toast.success(`✅ ${!config[key] ? 'Activado' : 'Desactivado'}`, {
      description: 'El cambio se refleja en el tablero Kanban'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Visualización — Toggles que SÍ controlan el Kanban */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" />
          Opciones de Visualización del Kanban
        </h3>
        <p className="text-sm text-gray-500 mb-4">Estos ajustes se aplican en tiempo real al tablero de Auditorías OCI.</p>
        <div className="space-y-4">
          <SwitchConfig
            label="Mostrar contadores de tarjetas"
            description="Muestra el número de auditorías en cada columna del Kanban"
            checked={config.mostrarContadores}
            onChange={() => handleToggle('mostrarContadores')}
          />
          <SwitchConfig
            label="Mostrar tiempos transcurridos"
            description="Muestra cuántos días lleva cada auditoría en su etapa actual (con semáforo SLA)"
            checked={config.mostrarTiempos}
            onChange={() => handleToggle('mostrarTiempos')}
          />
          <SwitchConfig
            label="Vista compactada"
            description="Reduce el tamaño de las tarjetas para ver más auditorías en pantalla"
            checked={config.compactarVista}
            onChange={() => handleToggle('compactarVista')}
          />
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>¿Cómo funcionan estos ajustes?</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Contadores:</strong> Muestra u oculta el badge con la cantidad de auditorías en cada columna</li>
              <li><strong>Tiempos:</strong> Agrega un indicador con los días transcurridos y el semáforo SLA en cada tarjeta</li>
              <li><strong>Vista compactada:</strong> Reduce padding y tamaño de fuente para mostrar más información</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: REGLAS Y ALERTAS (REFACTORED — SLA/WIP/Alertas editables)
// ════════════════════════════════════════════════════════════════════════════

interface TabReglasProps {
  etapas: EtapaKanban[];
  onActualizarEtapa?: (id: string, datos: Partial<EtapaKanban>) => Promise<EtapaKanban | null>;
}

function TabReglas({ etapas, onActualizarEtapa }: TabReglasProps) {
  const [editandoSLA, setEditandoSLA] = useState<string | null>(null);
  const [valoresSLA, setValoresSLA] = useState<{ slaDias: number; alertaPrevia: number; limiteWIP: number }>({ slaDias: 0, alertaPrevia: 0, limiteWIP: 5 });
  const [guardandoSLA, setGuardandoSLA] = useState(false);

  const iniciarEdicionSLA = (etapa: EtapaKanban) => {
    setEditandoSLA(etapa.id);
    setValoresSLA({
      slaDias: etapa.slaDias,
      alertaPrevia: etapa.alertaPrevia,
      limiteWIP: etapa.limiteWIP >= 999 ? 999 : etapa.limiteWIP,
    });
  };

  const guardarSLA = async (etapaId: string) => {
    if (!onActualizarEtapa) return;
    setGuardandoSLA(true);
    try {
      await onActualizarEtapa(etapaId, {
        slaDias: valoresSLA.slaDias,
        alertaPrevia: valoresSLA.alertaPrevia,
        limiteWIP: valoresSLA.limiteWIP,
      });
      // Sync to localStorage for KanbanConfigContext
      sincronizarSLAaLocalStorage(etapas.map(e =>
        e.id === etapaId ? { ...e, slaDias: valoresSLA.slaDias, alertaPrevia: valoresSLA.alertaPrevia, limiteWIP: valoresSLA.limiteWIP } : e
      ));
      notificarCambioConfigKanban();
      setEditandoSLA(null);
    } catch {
      toast.error('Error al guardar SLA');
    } finally {
      setGuardandoSLA(false);
    }
  };

  const toggleNotificaciones = async (etapa: EtapaKanban) => {
    if (!onActualizarEtapa) return;
    await onActualizarEtapa(etapa.id, {
      notificacionesActivas: !etapa.notificacionesActivas,
    });
    sincronizarSLAaLocalStorage(etapas.map(e =>
      e.id === etapa.id ? { ...e, notificacionesActivas: !e.notificacionesActivas } : e
    ));
    notificarCambioConfigKanban();
    toast.success(etapa.notificacionesActivas ? '🔕 Notificaciones desactivadas' : '🔔 Notificaciones activadas', {
      description: etapa.nombre,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ═══ SLA y ALERTAS por etapa — EDITABLE ═══ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            SLA y Alertas por Etapa
          </h3>
          <span className="text-xs text-gray-500 bg-green-50 text-green-700 px-2 py-1 rounded-full font-semibold border border-green-200">
            ✓ Conectado al Kanban
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Click en <strong>Editar</strong> para ajustar el SLA, la alerta previa y el límite WIP de cada etapa. Los cambios se reflejan en el semáforo del tablero Kanban.
        </p>

        <div className="space-y-3">
          {etapas.map((etapa) => (
            <div
              key={etapa.id}
              className={`rounded-lg border-2 transition-all ${
                editandoSLA === etapa.id
                  ? 'border-blue-400 bg-blue-50/50 shadow-md'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              {editandoSLA === etapa.id ? (
                /* ═══ MODO EDICIÓN ═══ */
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
                    <span className="font-bold text-gray-900">{etapa.nombre}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">Editando</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">SLA (Días)</label>
                      <input
                        type="number"
                        min="0"
                        value={valoresSLA.slaDias}
                        onChange={(e) => setValoresSLA(prev => ({ ...prev, slaDias: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold text-blue-700 bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Tiempo máximo en esta etapa</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Alerta (Días antes)</label>
                      <input
                        type="number"
                        min="0"
                        value={valoresSLA.alertaPrevia}
                        onChange={(e) => setValoresSLA(prev => ({ ...prev, alertaPrevia: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:outline-none font-semibold text-yellow-700 bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Días antes para alertar</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Límite WIP</label>
                      <input
                        type="number"
                        min="1"
                        value={valoresSLA.limiteWIP >= 999 ? '' : valoresSLA.limiteWIP}
                        onChange={(e) => setValoresSLA(prev => ({ ...prev, limiteWIP: parseInt(e.target.value) || 999 }))}
                        placeholder="∞"
                        className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none font-semibold text-purple-700 bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Máx auditorías simultáneas</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarSLA(etapa.id)}
                      disabled={guardandoSLA}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {guardandoSLA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoSLA(null)}
                      className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ═══ MODO LECTURA ═══ */
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
                    <span className="font-bold text-gray-900">{etapa.nombre}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <span className="text-gray-400 text-xs block">SLA</span>
                      <span className="font-bold text-blue-600">{etapa.slaDias}d</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 text-xs block">Alerta</span>
                      <span className="font-bold text-yellow-600">{etapa.alertaPrevia}d</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 text-xs block">WIP</span>
                      <span className="font-bold text-purple-600">{etapa.limiteWIP >= 999 ? '∞' : etapa.limiteWIP}</span>
                    </div>
                    <button
                      onClick={() => toggleNotificaciones(etapa)}
                      title={etapa.notificacionesActivas ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        etapa.notificacionesActivas
                          ? 'bg-green-100 hover:bg-green-200 text-green-600'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-400'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => iniciarEdicionSLA(etapa)}
                      className="px-3 py-1.5 bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FLUJO DE ETAPAS — Visual ═══ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-purple-600" />
          Flujo de Etapas del Kanban
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Las auditorías avanzan secuencialmente por estas etapas. El SLA define el tiempo máximo esperado en cada una.
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {etapas.map((etapa, idx) => (
            <div key={etapa.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-white border-2 rounded-xl p-3 text-center min-w-[120px] shadow-sm"
                   style={{ borderColor: etapa.color }}>
                <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white font-bold text-sm"
                     style={{ backgroundColor: etapa.color }}>
                  {idx + 1}
                </div>
                <p className="text-xs font-bold text-gray-900">{etapa.nombre}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{etapa.slaDias}d SLA</p>
              </div>
              {idx < etapas.length - 1 && (
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" /> Dentro del SLA
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Próximo a vencer
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> SLA vencido
          </span>
        </div>
      </div>

      {/* ═══ INFO ═══ */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>¿Cómo funciona el semáforo SLA?</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Verde:</strong> La auditoría está dentro del tiempo esperado (SLA)</li>
              <li><strong>Amarillo:</strong> Faltan pocos días para vencer el SLA (según la alerta previa configurada)</li>
              <li><strong>Rojo:</strong> El SLA ya venció — la auditoría ha excedido el tiempo esperado en esa etapa</li>
              <li><strong>WIP:</strong> Cuando una columna alcanza su límite, se muestra una alerta visual en el tablero</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SWITCH DE CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface SwitchConfigProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function SwitchConfig({ label, description, checked, onChange }: SwitchConfigProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="font-bold text-gray-900 mb-1">{label}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR/CREAR ETAPA
// ════════════════════════════════════════════════════════════════════════════

interface ModalEtapaProps {
  etapa: EtapaKanban;
  onGuardar: (etapa: EtapaKanban) => void;
  onCerrar: () => void;
}

function ModalEtapa({ etapa, onGuardar, onCerrar }: ModalEtapaProps) {
  const [form, setForm] = useState(etapa);

  const COLORES_PREDEFINIDOS = [
    { nombre: 'Verde', valor: '#10B981' },
    { nombre: 'Azul', valor: '#3B82F6' },
    { nombre: 'Morado', valor: '#8B5CF6' },
    { nombre: 'Amarillo', valor: '#F59E0B' },
    { nombre: 'Cyan', valor: '#06B6D4' },
    { nombre: 'Rojo', valor: '#EF4444' },
    { nombre: 'Rosa', valor: '#EC4899' },
    { nombre: 'Gris', valor: '#6B7280' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.nombre.trim()) {
      toast.error('❌ El nombre de la etapa es obligatorio');
      return;
    }
    
    onGuardar(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {etapa.nombre ? 'Editar Etapa' : 'Nueva Etapa'}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Configura los parámetros de la etapa del Kanban
                </p>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6 space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Nombre de la Etapa <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Planeación"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe el propósito de esta etapa..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Color de la Etapa
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {COLORES_PREDEFINIDOS.map((color) => (
                  <button
                    key={color.valor}
                    type="button"
                    onClick={() => setForm({ ...form, color: color.valor })}
                    className={`w-full aspect-square rounded-lg transition-all ${
                      form.color === color.valor
                        ? 'ring-4 ring-blue-600 ring-offset-2'
                        : 'hover:ring-2 hover:ring-gray-300'
                    }`}
                    style={{ backgroundColor: color.valor }}
                    title={color.nombre}
                  />
                ))}
              </div>
            </div>

            {/* Grid de configuraciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Límite WIP */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Límite WIP
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.limiteWIP}
                  onChange={(e) => setForm({ ...form, limiteWIP: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Número máximo de auditorías en esta etapa</p>
              </div>

              {/* SLA Días */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  SLA (Días)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.slaDias}
                  onChange={(e) => setForm({ ...form, slaDias: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Tiempo esperado en días</p>
              </div>

              {/* SLA Horas */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  SLA (Horas adicionales)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={form.slaHoras}
                  onChange={(e) => setForm({ ...form, slaHoras: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Horas adicionales (0-23)</p>
              </div>

              {/* Alerta Previa */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Alerta Previa (Días)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.alertaPrevia}
                  onChange={(e) => setForm({ ...form, alertaPrevia: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Días antes de vencer para alertar</p>
              </div>
            </div>

            {/* Opciones especiales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-900">Notificaciones activas</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, notificacionesActivas: !form.notificacionesActivas })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    form.notificacionesActivas ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      form.notificacionesActivas ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-900">Transición automática</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reglaTransicionAutomatica: !form.reglaTransicionAutomatica })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    form.reglaTransicionAutomatica ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      form.reglaTransicionAutomatica ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {form.reglaTransicionAutomatica && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Condición para transición
                  </label>
                  <input
                    type="text"
                    value={form.condicionTransicion || ''}
                    onChange={(e) => setForm({ ...form, condicionTransicion: e.target.value })}
                    placeholder="Ej: Todos los hallazgos documentados"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Save className="w-5 h-5" />
              Guardar Etapa
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PREVIA DEL KANBAN
// ════════════════════════════════════════════════════════════════════════════

interface VistaPreviaProps {
  etapas: EtapaKanban[];
  config: ConfiguracionGeneral;
  onCerrar: () => void;
}

function VistaPrevia({ etapas, config, onCerrar }: VistaPreviaProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layout className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-black">Vista Previa del Kanban</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Así se verá el tablero con la configuración actual
                </p>
              </div>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Kanban Preview */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {etapas.map((etapa) => (
              <div
                key={etapa.id}
                className="flex-shrink-0 w-80 bg-white rounded-xl border-2 border-gray-200"
              >
                {/* Columna Header */}
                <div
                  className="p-4 rounded-t-xl"
                  style={{ backgroundColor: `${etapa.color}20` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: etapa.color }}
                      />
                      <h3 className="font-black text-gray-900">{etapa.nombre}</h3>
                    </div>
                    {config.mostrarContadores && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                        0
                      </span>
                    )}
                  </div>
                  {config.mostrarTiempos && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>SLA: {etapa.slaDias}d</span>
                      <span className="text-gray-400">|</span>
                      <span>WIP: 0/{etapa.limiteWIP}</span>
                    </div>
                  )}
                </div>

                {/* Tarjeta de ejemplo */}
                <div className="p-4">
                  <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-3">
                    <div className="font-semibold text-gray-900 text-sm mb-2">
                      Ejemplo de Auditoría
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Proceso de Gestión Presupuestal
                    </div>
                    {config.mostrarAvatar && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          JD
                        </div>
                        <span className="text-xs text-gray-600">Juan Díaz</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl">
          <button
            onClick={onCerrar}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
          >
            Cerrar Vista Previa
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
