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
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { toast } from 'sonner@2.0.3';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ✅ DÍA 5: ResponsiveHeader para headers adaptativos
import { ResponsiveHeader } from '@/components/ui';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface EtapaKanban {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  tiempoSLA: number; // días
  limiteWIP: number | null; // null = sin límite
  visible: boolean;
  notificarVencimiento: boolean;
  diasAnticipacionAlerta: number;
  estado: 'inicial' | 'intermedia' | 'final';
  permitirRetroceso: boolean;
}

interface ConfiguracionTablero {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'auditorias' | 'planes_mejoramiento';
  etapas: EtapaKanban[];
  activo: boolean;
}

type VistaConfig = 'etapas' | 'tiempos' | 'limites' | 'transiciones';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - CONFIGURACIÓN ACTUAL
// ════════════════════════════════════════════════════════════════════════════

const TABLEROS_MOCK: ConfiguracionTablero[] = [
  {
    id: 'kanban-auditorias',
    nombre: 'Tablero de Auditorías',
    descripcion: 'Gestión del ciclo completo de auditorías',
    tipo: 'auditorias',
    activo: true,
    etapas: [
      {
        id: 'etapa-1',
        nombre: 'Planificación',
        descripcion: 'Definición de alcance y programa de auditoría',
        orden: 1,
        color: '#3B82F6',
        tiempoSLA: 15,
        limiteWIP: null,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 3,
        estado: 'inicial',
        permitirRetroceso: false
      },
      {
        id: 'etapa-2',
        nombre: 'Ejecución',
        descripcion: 'Levantamiento de información y papeles de trabajo',
        orden: 2,
        color: '#10B981',
        tiempoSLA: 30,
        limiteWIP: 5,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 5,
        estado: 'intermedia',
        permitirRetroceso: true
      },
      {
        id: 'etapa-3',
        nombre: 'Comunicación Preliminar',
        descripcion: 'Presentación de hallazgos preliminares',
        orden: 3,
        color: '#F59E0B',
        tiempoSLA: 10,
        limiteWIP: 3,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 2,
        estado: 'intermedia',
        permitirRetroceso: true
      },
      {
        id: 'etapa-4',
        nombre: 'Respuesta del Auditado',
        descripcion: 'Recepción y análisis de respuestas',
        orden: 4,
        color: '#8B5CF6',
        tiempoSLA: 15,
        limiteWIP: null,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 3,
        estado: 'intermedia',
        permitirRetroceso: false
      },
      {
        id: 'etapa-5',
        nombre: 'Informe Final',
        descripcion: 'Elaboración del informe final de auditoría',
        orden: 5,
        color: '#EC4899',
        tiempoSLA: 10,
        limiteWIP: 2,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 2,
        estado: 'intermedia',
        permitirRetroceso: false
      },
      {
        id: 'etapa-6',
        nombre: 'Finalizada',
        descripcion: 'Auditoría completada y documentada',
        orden: 6,
        color: '#6B7280',
        tiempoSLA: 0,
        limiteWIP: null,
        visible: true,
        notificarVencimiento: false,
        diasAnticipacionAlerta: 0,
        estado: 'final',
        permitirRetroceso: false
      }
    ]
  },
  {
    id: 'kanban-planes',
    nombre: 'Tablero de Planes de Mejoramiento',
    descripcion: 'Seguimiento a acciones correctivas',
    tipo: 'planes_mejoramiento',
    activo: true,
    etapas: [
      {
        id: 'plan-1',
        nombre: 'Formulación',
        descripcion: 'Diseño del plan de mejoramiento',
        orden: 1,
        color: '#3B82F6',
        tiempoSLA: 10,
        limiteWIP: null,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 2,
        estado: 'inicial',
        permitirRetroceso: false
      },
      {
        id: 'plan-2',
        nombre: 'Aprobación',
        descripcion: 'Validación y aprobación del plan',
        orden: 2,
        color: '#F59E0B',
        tiempoSLA: 5,
        limiteWIP: 3,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 1,
        estado: 'intermedia',
        permitirRetroceso: true
      },
      {
        id: 'plan-3',
        nombre: 'En Ejecución',
        descripcion: 'Implementación de acciones correctivas',
        orden: 3,
        color: '#10B981',
        tiempoSLA: 60,
        limiteWIP: 8,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 10,
        estado: 'intermedia',
        permitirRetroceso: true
      },
      {
        id: 'plan-4',
        nombre: 'En Seguimiento',
        descripcion: 'Verificación de cumplimiento',
        orden: 4,
        color: '#8B5CF6',
        tiempoSLA: 15,
        limiteWIP: 5,
        visible: true,
        notificarVencimiento: true,
        diasAnticipacionAlerta: 3,
        estado: 'intermedia',
        permitirRetroceso: true
      },
      {
        id: 'plan-5',
        nombre: 'Cumplido',
        descripcion: 'Plan completado exitosamente',
        orden: 5,
        color: '#22C55E',
        tiempoSLA: 0,
        limiteWIP: null,
        visible: true,
        notificarVencimiento: false,
        diasAnticipacionAlerta: 0,
        estado: 'final',
        permitirRetroceso: false
      }
    ]
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionKanbanModule() {
  const [tableroSeleccionado, setTableroSeleccionado] = useState<ConfiguracionTablero>(TABLEROS_MOCK[0]);
  const [vistaConfig, setVistaConfig] = useState<VistaConfig>('etapas');
  const [modalEtapa, setModalEtapa] = useState<{ abierto: boolean; etapa?: EtapaKanban; modo: 'crear' | 'editar' }>({
    abierto: false,
    modo: 'crear'
  });

  return (
    <Container4K>
      {/* Header con selector de tablero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-gray-900 font-medium mb-1">Configuración de Tableros Kanban</h2>
            <p className="text-sm text-gray-600">Gestión de etapas, tiempos SLA y límites WIP</p>
          </div>

          <button
            onClick={() => setModalEtapa({ abierto: true, modo: 'crear' })}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Etapa
          </button>
        </div>

        {/* Selector de Tablero */}
        <div className="flex gap-3">
          {TABLEROS_MOCK.map((tablero) => (
            <button
              key={tablero.id}
              onClick={() => setTableroSeleccionado(tablero)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                tableroSeleccionado.id === tablero.id
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
                />
              )}
              {vistaConfig === 'tiempos' && <VistaTiemposSLA tablero={tableroSeleccionado} />}
              {vistaConfig === 'limites' && <VistaLimitesWIP tablero={tableroSeleccionado} />}
              {vistaConfig === 'transiciones' && <VistaTransiciones tablero={tableroSeleccionado} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Crear/Editar Etapa */}
      {modalEtapa.abierto && (
        <ModalEtapaKanban
          etapa={modalEtapa.etapa}
          modo={modalEtapa.modo}
          onClose={() => setModalEtapa({ abierto: false, modo: 'crear' })}
          onGuardar={(etapa) => {
            toast.success(
              modalEtapa.modo === 'crear' ? 'Etapa creada exitosamente' : 'Etapa actualizada exitosamente'
            );
            setModalEtapa({ abierto: false, modo: 'crear' });
          }}
        />
      )}
    </Container4K>
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
}

function VistaGestionEtapas({ tablero, onEditarEtapa }: VistaGestionEtapasProps) {
  const [etapas, setEtapas] = useState(tablero.etapas);

  const eliminarEtapa = (etapaId: string) => {
    if (confirm('¿Estás seguro de eliminar esta etapa? Esta acción no se puede deshacer.')) {
      setEtapas(etapas.filter(e => e.id !== etapaId));
      toast.success('Etapa eliminada exitosamente');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base text-gray-900 font-medium">Etapas del Tablero</h3>
          <p className="text-sm text-gray-600">Arrastra para reordenar • {etapas.length} etapas configuradas</p>
        </div>
      </div>

      {/* Lista de Etapas */}
      <div className="space-y-3">
        {etapas.map((etapa, index) => (
          <div
            key={etapa.id}
            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <button className="mt-1 text-gray-400 hover:text-gray-600 cursor-move">
                <GripVertical className="w-5 h-5" />
              </button>

              {/* Color Preview */}
              <div
                className="w-4 h-4 rounded mt-1 flex-shrink-0"
                style={{ backgroundColor: etapa.color }}
              />

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-sm text-gray-900 font-medium">{etapa.nombre}</h4>
                  <span className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs">
                    Orden {etapa.orden}
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
                <button
                  onClick={() => onEditarEtapa(etapa)}
                  className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => eliminarEtapa(etapa.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

function VistaTiemposSLA({ tablero }: { tablero: ConfiguracionTablero }) {
  const tiempoTotal = useMemo(() => {
    return tablero.etapas.reduce((acc, etapa) => acc + etapa.tiempoSLA, 0);
  }, [tablero.etapas]);

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
          .filter(e => e.tiempoSLA > 0)
          .map((etapa) => (
            <div key={etapa.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
                  <span className="text-sm text-gray-900 font-medium">{etapa.nombre}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tiempo SLA (días)</label>
                  <input
                    type="number"
                    defaultValue={etapa.tiempoSLA}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alerta anticipada (días)</label>
                  <input
                    type="number"
                    defaultValue={etapa.diasAnticipacionAlerta}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={etapa.notificarVencimiento}
                    className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                  />
                  <span className="text-xs text-gray-700">Notificar vencimiento</span>
                </label>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: LÍMITES WIP
// ════════════════════════════════════════════════════════════════════════════

function VistaLimitesWIP({ tablero }: { tablero: ConfiguracionTablero }) {
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
        {tablero.etapas.map((etapa) => (
          <div key={etapa.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: etapa.color }} />
              <span className="text-sm text-gray-900 font-medium">{etapa.nombre}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Límite máximo de elementos</label>
                <input
                  type="number"
                  defaultValue={etapa.limiteWIP || ''}
                  placeholder="Sin límite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={etapa.limiteWIP !== null}
                  className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                />
                <span className="text-xs text-gray-700">Aplicar límite WIP</span>
              </label>

              {etapa.limiteWIP && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  El sistema alertará al alcanzar {etapa.limiteWIP} elementos
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: REGLAS DE TRANSICIÓN
// ════════════════════════════════════════════════════════════════════════════

function VistaTransiciones({ tablero }: { tablero: ConfiguracionTablero }) {
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
                          defaultChecked={etapa.permitirRetroceso}
                          className="w-4 h-4 text-[#1e5da8] border-gray-300 rounded focus:ring-[#1e5da8]"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Permitido
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
  etapa?: EtapaKanban;
  modo: 'crear' | 'editar';
  onClose: () => void;
  onGuardar: (etapa: EtapaKanban) => void;
}

function ModalEtapaKanban({ etapa, modo, onClose, onGuardar }: ModalEtapaKanbanProps) {
  const [formData, setFormData] = useState<Partial<EtapaKanban>>(
    etapa || {
      nombre: '',
      descripcion: '',
      color: '#3B82F6',
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiempo SLA (días)</label>
              <input
                type="number"
                value={formData.tiempoSLA}
                onChange={(e) => setFormData({ ...formData, tiempoSLA: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Límite WIP</label>
              <input
                type="number"
                value={formData.limiteWIP || ''}
                onChange={(e) => setFormData({ ...formData, limiteWIP: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alerta (días antes)</label>
              <input
                type="number"
                value={formData.diasAnticipacionAlerta}
                onChange={(e) => setFormData({ ...formData, diasAnticipacionAlerta: parseInt(e.target.value) })}
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