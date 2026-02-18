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
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns, Settings, Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown,
  Clock, AlertTriangle, CheckCircle2, Layers, Zap, Bell, Eye, Palette,
  ChevronRight, Info, TrendingUp, Layout
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface EtapaKanban {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  limiteWIP: number;
  slaDias: number;
  slaHoras: number;
  alertaPrevia: number; // Días antes de vencer el SLA para alertar
  notificacionesActivas: boolean;
  esInicial: boolean;
  esFinal: boolean;
  reglaTransicionAutomatica: boolean;
  condicionTransicion?: string;
}

interface ConfiguracionGeneral {
  mostrarContadores: boolean;
  mostrarTiempos: boolean;
  alertasSLA: boolean;
  alertasWIP: boolean;
  transicionesAutomaticas: boolean;
  compactarVista: boolean;
  mostrarAvatar: boolean;
  permitirDragDrop: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK INICIALES - CONFIGURACIÓN ACTUAL DEL KANBAN
// ════════════════════════════════════════════════════════════════════════════

const ETAPAS_INICIALES: EtapaKanban[] = [
  {
    id: 'etapa-1',
    nombre: 'Plan Anual',
    descripcion: 'Auditorías planificadas en el programa anual',
    orden: 1,
    color: '#10B981', // Verde
    limiteWIP: 20,
    slaDias: 30,
    slaHoras: 0,
    alertaPrevia: 7,
    notificacionesActivas: true,
    esInicial: true,
    esFinal: false,
    reglaTransicionAutomatica: false
  },
  {
    id: 'etapa-2',
    nombre: 'Planeación',
    descripcion: 'Planeación detallada de la auditoría',
    orden: 2,
    color: '#3B82F6', // Azul
    limiteWIP: 8,
    slaDias: 15,
    slaHoras: 0,
    alertaPrevia: 3,
    notificacionesActivas: true,
    esInicial: false,
    esFinal: false,
    reglaTransicionAutomatica: true,
    condicionTransicion: 'Todos los documentos de planeación aprobados'
  },
  {
    id: 'etapa-3',
    nombre: 'Ejecución',
    descripcion: 'Ejecución del trabajo de campo',
    orden: 3,
    color: '#8B5CF6', // Morado
    limiteWIP: 6,
    slaDias: 30,
    slaHoras: 0,
    alertaPrevia: 5,
    notificacionesActivas: true,
    esInicial: false,
    esFinal: false,
    reglaTransicionAutomatica: false
  },
  {
    id: 'etapa-4',
    nombre: 'Comunicación',
    descripcion: 'Elaboración y comunicación del informe',
    orden: 4,
    color: '#F59E0B', // Amarillo
    limiteWIP: 5,
    slaDias: 10,
    slaHoras: 0,
    alertaPrevia: 2,
    notificacionesActivas: true,
    esInicial: false,
    esFinal: false,
    reglaTransicionAutomatica: true,
    condicionTransicion: 'Informe firmado y notificado'
  },
  {
    id: 'etapa-5',
    nombre: 'Seguimiento',
    descripcion: 'Seguimiento a planes de mejoramiento',
    orden: 5,
    color: '#06B6D4', // Cyan
    limiteWIP: 10,
    slaDias: 90,
    slaHoras: 0,
    alertaPrevia: 15,
    notificacionesActivas: true,
    esInicial: false,
    esFinal: false,
    reglaTransicionAutomatica: false
  },
  {
    id: 'etapa-6',
    nombre: 'Cierre',
    descripcion: 'Auditorías completadas y cerradas',
    orden: 6,
    color: '#EF4444', // Rojo
    limiteWIP: 999,
    slaDias: 5,
    slaHoras: 0,
    alertaPrevia: 1,
    notificacionesActivas: false,
    esInicial: false,
    esFinal: true,
    reglaTransicionAutomatica: false
  }
];

const CONFIG_GENERAL_INICIAL: ConfiguracionGeneral = {
  mostrarContadores: true,
  mostrarTiempos: true,
  alertasSLA: true,
  alertasWIP: true,
  transicionesAutomaticas: true,
  compactarVista: false,
  mostrarAvatar: true,
  permitirDragDrop: true
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionKanbanModule() {
  const [etapas, setEtapas] = useState<EtapaKanban[]>(ETAPAS_INICIALES);
  const [configGeneral, setConfigGeneral] = useState<ConfiguracionGeneral>(CONFIG_GENERAL_INICIAL);
  const [etapaEditando, setEtapaEditando] = useState<EtapaKanban | null>(null);
  const [mostrarModalEtapa, setMostrarModalEtapa] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [tabActiva, setTabActiva] = useState<'etapas' | 'general' | 'reglas'>('etapas');

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS - ETAPAS
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

  const handleGuardarEtapa = (etapa: EtapaKanban) => {
    const existe = etapas.find(e => e.id === etapa.id);
    
    if (existe) {
      setEtapas(etapas.map(e => e.id === etapa.id ? etapa : e));
      toast.success('✅ Etapa actualizada exitosamente');
    } else {
      setEtapas([...etapas, etapa]);
      toast.success('✅ Etapa creada exitosamente');
    }
    
    setMostrarModalEtapa(false);
    setEtapaEditando(null);
  };

  const handleEliminarEtapa = (id: string) => {
    const etapa = etapas.find(e => e.id === id);
    
    if (etapa?.esInicial || etapa?.esFinal) {
      toast.error('❌ No se puede eliminar una etapa inicial o final');
      return;
    }
    
    setEtapas(etapas.filter(e => e.id !== id));
    toast.success('✅ Etapa eliminada exitosamente');
  };

  const handleMoverEtapa = (id: string, direccion: 'arriba' | 'abajo') => {
    const index = etapas.findIndex(e => e.id === id);
    if (index === -1) return;

    const nuevasEtapas = [...etapas];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;

    if (nuevoIndex < 0 || nuevoIndex >= etapas.length) return;

    // Intercambiar
    [nuevasEtapas[index], nuevasEtapas[nuevoIndex]] = [nuevasEtapas[nuevoIndex], nuevasEtapas[index]];

    // Reordenar números
    nuevasEtapas.forEach((etapa, idx) => {
      etapa.orden = idx + 1;
    });

    setEtapas(nuevasEtapas);
    toast.success('✅ Orden actualizado');
  };

  const handleGuardarConfiguracion = () => {
    toast.success('💾 Configuración guardada exitosamente', {
      description: 'Los cambios se aplicarán en el tablero Kanban'
    });
  };

  const handleRestaurarDefecto = () => {
    setEtapas(ETAPAS_INICIALES);
    setConfigGeneral(CONFIG_GENERAL_INICIAL);
    toast.info('🔄 Configuración restaurada a valores por defecto');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Columns className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Configuración del Kanban
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Personaliza etapas, SLA, límites WIP y reglas de transición
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
              className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-600 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm"
            >
              <Eye className="w-4 h-4" />
              {mostrarVistaPrevia ? 'Ocultar' : 'Vista Previa'}
            </button>
            <button
              onClick={handleRestaurarDefecto}
              className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-yellow-600 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              Restaurar
            </button>
            <button
              onClick={handleGuardarConfiguracion}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg text-sm"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200">
          <button
            onClick={() => setTabActiva('etapas')}
            className={`px-4 py-3 font-bold text-sm transition-all flex items-center gap-2 border-b-2 -mb-0.5 ${
              tabActiva === 'etapas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Gestión de Etapas
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {etapas.length}
            </span>
          </button>
          <button
            onClick={() => setTabActiva('general')}
            className={`px-4 py-3 font-bold text-sm transition-all flex items-center gap-2 border-b-2 -mb-0.5 ${
              tabActiva === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Config. General
          </button>
          <button
            onClick={() => setTabActiva('reglas')}
            className={`px-4 py-3 font-bold text-sm transition-all flex items-center gap-2 border-b-2 -mb-0.5 ${
              tabActiva === 'reglas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            Reglas y Alertas
          </button>
        </div>
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
            onMover={handleMoverEtapa}
          />
        )}
        {tabActiva === 'general' && (
          <TabGeneral
            key="general"
            config={configGeneral}
            onChange={setConfigGeneral}
          />
        )}
        {tabActiva === 'reglas' && (
          <TabReglas
            key="reglas"
            etapas={etapas}
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
  onMover: (id: string, direccion: 'arriba' | 'abajo') => void;
}

function TabEtapas({ etapas, onAgregar, onEditar, onEliminar, onMover }: TabEtapasProps) {
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
        {etapas.map((etapa, index) => (
          <div
            key={etapa.id}
            className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-400 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Orden */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onMover(etapa.id, 'arriba')}
                  disabled={index === 0}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-center font-bold text-gray-900 text-sm">
                  {etapa.orden}
                </span>
                <button
                  onClick={() => onMover(etapa.id, 'abajo')}
                  disabled={index === etapas.length - 1}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-4 h-4 text-gray-600" />
                </button>
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
// TAB: CONFIGURACIÓN GENERAL
// ════════════════════════════════════════════════════════════════════════════

interface TabGeneralProps {
  config: ConfiguracionGeneral;
  onChange: (config: ConfiguracionGeneral) => void;
}

function TabGeneral({ config, onChange }: TabGeneralProps) {
  const handleToggle = (key: keyof ConfiguracionGeneral) => {
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Visualización */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" />
          Opciones de Visualización
        </h3>
        <div className="space-y-4">
          <SwitchConfig
            label="Mostrar contadores de tarjetas"
            description="Muestra el número de auditorías en cada columna"
            checked={config.mostrarContadores}
            onChange={() => handleToggle('mostrarContadores')}
          />
          <SwitchConfig
            label="Mostrar tiempos transcurridos"
            description="Muestra cuánto tiempo lleva una auditoría en cada fase"
            checked={config.mostrarTiempos}
            onChange={() => handleToggle('mostrarTiempos')}
          />
          <SwitchConfig
            label="Vista compactada"
            description="Reduce el espaciado para ver más información en pantalla"
            checked={config.compactarVista}
            onChange={() => handleToggle('compactarVista')}
          />
          <SwitchConfig
            label="Mostrar avatar del auditor"
            description="Muestra la inicial o foto del auditor asignado"
            checked={config.mostrarAvatar}
            onChange={() => handleToggle('mostrarAvatar')}
          />
        </div>
      </div>

      {/* Alertas y Notificaciones */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-600" />
          Alertas y Notificaciones
        </h3>
        <div className="space-y-4">
          <SwitchConfig
            label="Alertas de SLA"
            description="Notifica cuando una auditoría está próxima a vencer su SLA"
            checked={config.alertasSLA}
            onChange={() => handleToggle('alertasSLA')}
          />
          <SwitchConfig
            label="Alertas de límite WIP"
            description="Alerta cuando una columna alcanza su límite de trabajo en progreso"
            checked={config.alertasWIP}
            onChange={() => handleToggle('alertasWIP')}
          />
        </div>
      </div>

      {/* Comportamiento */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Comportamiento del Kanban
        </h3>
        <div className="space-y-4">
          <SwitchConfig
            label="Transiciones automáticas"
            description="Mueve automáticamente las tarjetas cuando se cumplen las condiciones configuradas"
            checked={config.transicionesAutomaticas}
            onChange={() => handleToggle('transicionesAutomaticas')}
          />
          <SwitchConfig
            label="Permitir arrastrar y soltar"
            description="Habilita mover tarjetas entre columnas con drag & drop"
            checked={config.permitirDragDrop}
            onChange={() => handleToggle('permitirDragDrop')}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: REGLAS Y ALERTAS
// ════════════════════════════════════════════════════════════════════════════

interface TabReglasProps {
  etapas: EtapaKanban[];
}

function TabReglas({ etapas }: TabReglasProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Resumen de SLAs */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Resumen de SLA por Etapa
        </h3>
        <div className="space-y-3">
          {etapas.map((etapa) => (
            <div key={etapa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: etapa.color }}
                />
                <span className="font-bold text-gray-900">{etapa.nombre}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">SLA: </span>
                  <span className="font-bold text-blue-600">
                    {etapa.slaDias}d {etapa.slaHoras > 0 && `${etapa.slaHoras}h`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Alerta: </span>
                  <span className="font-bold text-yellow-600">{etapa.alertaPrevia}d antes</span>
                </div>
                {etapa.notificacionesActivas ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reglas de transición */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Reglas de Transición Automática
        </h3>
        <div className="space-y-3">
          {etapas.filter(e => e.reglaTransicionAutomatica).map((etapa) => (
            <div key={etapa.id} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-gray-900 mb-1">
                    {etapa.nombre} → Siguiente etapa
                  </div>
                  <div className="text-sm text-gray-700">
                    <strong>Condición:</strong> {etapa.condicionTransicion}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {etapas.filter(e => e.reglaTransicionAutomatica).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No hay reglas de transición automática configuradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Límites WIP */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Límites WIP (Work In Progress)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {etapas.map((etapa) => (
            <div key={etapa.id} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-black text-blue-600 mb-1">
                {etapa.limiteWIP === 999 ? '∞' : etapa.limiteWIP}
              </div>
              <div className="text-xs text-gray-600">{etapa.nombre}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-600 p-3 rounded">
          <div className="flex items-start gap-2 text-sm text-yellow-800">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Los límites WIP ayudan a controlar la carga de trabajo y evitar cuellos de botella.
              Cuando una columna alcanza su límite, se mostrará una alerta visual.
            </p>
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
