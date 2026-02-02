import { motion } from 'motion/react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  FileText,
  Calendar,
  Trash2,
  Eye,
  Filter,
  X,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ====================================
// TIPOS
// ====================================

interface Notificacion {
  id: string;
  tipo: 'info' | 'exito' | 'advertencia' | 'error' | 'recordatorio';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  origen: string;
  accion?: {
    texto: string;
    url: string;
  };
}

type FiltroTipo = 'todos' | 'info' | 'exito' | 'advertencia' | 'error' | 'recordatorio';
type FiltroEstado = 'todos' | 'leidas' | 'no-leidas';

// ====================================
// DATOS MOCK
// ====================================

const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: 'n1',
    tipo: 'recordatorio',
    titulo: 'Seguimiento Trimestral Próximo',
    mensaje: 'El seguimiento trimestral del Plan de Mejoramiento PM-2025-005 vence en 7 días (15 de Octubre).',
    fecha: '2025-10-08T09:00:00',
    leida: false,
    origen: 'Sistema de Seguimiento',
    accion: {
      texto: 'Ir al Seguimiento',
      url: '/seguimiento-plan/PM-2025-005'
    }
  },
  {
    id: 'n2',
    tipo: 'exito',
    titulo: 'Informe Aprobado',
    mensaje: 'El Informe Pormenorizado 2025-S1 ha sido aprobado por el Jefe de OCI.',
    fecha: '2025-09-30T14:22:00',
    leida: true,
    origen: 'Aprobaciones'
  },
  {
    id: 'n3',
    tipo: 'advertencia',
    titulo: 'Plan de Mejoramiento Pendiente',
    mensaje: 'El Plan de Mejoramiento para la auditoría AUD-2025-008 debe ser presentado antes del 28 de Octubre.',
    fecha: '2025-10-05T10:15:00',
    leida: false,
    origen: 'Planes de Mejoramiento',
    accion: {
      texto: 'Formular Plan',
      url: '/formulacion-plan/AUD-2025-008'
    }
  },
  {
    id: 'n4',
    tipo: 'info',
    titulo: 'Nueva Auditoría Programada',
    mensaje: 'Se ha programado la auditoría AUD-2025-012 - Gestión de TI para el 15 de Noviembre.',
    fecha: '2025-10-01T08:30:00',
    leida: true,
    origen: 'Programa Anual'
  },
  {
    id: 'n5',
    tipo: 'error',
    titulo: 'Evidencia Rechazada',
    mensaje: 'La evidencia "Conciliaciones_Ago.pdf" ha sido rechazada. Motivo: Documento incompleto.',
    fecha: '2025-09-28T16:45:00',
    leida: false,
    origen: 'Validación de Evidencias',
    accion: {
      texto: 'Ver Observaciones',
      url: '/seguimiento-plan/PM-2025-005'
    }
  },
  {
    id: 'n6',
    tipo: 'recordatorio',
    titulo: 'Reunión de Apertura Mañana',
    mensaje: 'Reunión de apertura de auditoría AUD-2025-010 programada para mañana a las 10:00 AM.',
    fecha: '2025-10-07T17:00:00',
    leida: false,
    origen: 'Planeación de Auditoría'
  },
  {
    id: 'n7',
    tipo: 'info',
    titulo: 'Documento Cargado',
    mensaje: 'El documento "Plan_Anual_2026.pdf" ha sido cargado en la carpeta Planes Anuales.',
    fecha: '2025-10-06T11:20:00',
    leida: true,
    origen: 'Gestión Documental'
  },
  {
    id: 'n8',
    tipo: 'exito',
    titulo: 'Auditoría Finalizada',
    mensaje: 'La auditoría AUD-2025-007 ha sido completada exitosamente.',
    fecha: '2025-09-25T15:30:00',
    leida: true,
    origen: 'Comunicación'
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const NotificacionesModule: React.FC = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_MOCK);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  // Notificaciones filtradas
  const notificacionesFiltradas = useMemo(() => {
    return notificaciones.filter(n => {
      if (filtroTipo !== 'todos' && n.tipo !== filtroTipo) return false;
      if (filtroEstado === 'leidas' && !n.leida) return false;
      if (filtroEstado === 'no-leidas' && n.leida) return false;
      return true;
    });
  }, [notificaciones, filtroTipo, filtroEstado]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = notificaciones.length;
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    const hoy = new Date().toISOString().split('T')[0];
    const hoyCount = notificaciones.filter(n => n.fecha.split('T')[0] === hoy).length;
    const advertencias = notificaciones.filter(n => n.tipo === 'advertencia' && !n.leida).length;

    return { total, noLeidas, hoyCount, advertencias };
  }, [notificaciones]);

  // Handlers
  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n =>
      n.id === id ? { ...n, leida: true } : n
    ));
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    toast.success('Notificación eliminada');
  };

  const limpiarLeidas = () => {
    setNotificaciones(prev => prev.filter(n => !n.leida));
    toast.success('Notificaciones leídas eliminadas');
  };

  return (
    <Container4K>
      <div className="space-y-6">
        
        {/* HEADER WORLD CLASS */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-2xl p-6 shadow-sm border border-[#E0EDFF]"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#003DA5] to-[#2962FF] rounded-xl flex items-center justify-center shadow-md">
                  <Bell className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                {estadisticas.noLeidas > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#F57C00] rounded-full flex items-center justify-center shadow-md">
                    <span className="text-xs text-white font-bold">{estadisticas.noLeidas}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#003DA5] mb-1">Centro de Notificaciones</h1>
                <p className="text-sm text-gray-600">Alertas y recordatorios del sistema</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={marcarTodasLeidas}
                disabled={estadisticas.noLeidas === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar Todas Leídas
              </button>
              <button
                onClick={limpiarLeidas}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar Leídas
              </button>
            </div>
          </div>
        </motion.div>

        {/* ESTADÍSTICAS WORLD CLASS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#003DA5] to-[#2962FF] rounded-xl p-6 shadow-md border border-[#E0EDFF] text-white"
          >
            <Bell className="w-8 h-8 mb-3 opacity-90" strokeWidth={2} />
            <div className="text-4xl font-bold mb-1">{estadisticas.total}</div>
            <div className="text-sm opacity-90">Total Notificaciones</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-[#E0EDFF]"
          >
            <div className="w-10 h-10 bg-[#E0EDFF] rounded-xl flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-[#003DA5]" strokeWidth={2.5} />
            </div>
            <div className="text-4xl font-bold text-[#003DA5] mb-1">{estadisticas.noLeidas}</div>
            <div className="text-sm text-gray-600">No Leídas</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-[#E0EDFF]"
          >
            <Calendar className="w-8 h-8 text-green-600 mb-3" strokeWidth={2} />
            <div className="text-4xl font-bold text-[#003DA5] mb-1">{estadisticas.hoyCount}</div>
            <div className="text-sm text-gray-600">Hoy</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-[#E0EDFF]"
          >
            <AlertTriangle className="w-8 h-8 text-[#F57C00] mb-3" strokeWidth={2} />
            <div className="text-4xl font-bold text-[#003DA5] mb-1">{estadisticas.advertencias}</div>
            <div className="text-sm text-gray-600">Advertencias Activas</div>
          </motion.div>
        </div>

        {/* FILTROS WORLD CLASS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-5 shadow-sm border border-[#E0EDFF]"
        >
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#003DA5] min-w-fit">
                <Filter className="w-4 h-4" />
                <span>Tipo:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroTipo('todos')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroTipo === 'todos'
                      ? 'bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroTipo('recordatorio')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                    filtroTipo === 'recordatorio'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Recordatorios
                </button>
                <button
                  onClick={() => setFiltroTipo('advertencia')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                    filtroTipo === 'advertencia'
                      ? 'bg-gradient-to-r from-[#F57C00] to-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Advertencias
                </button>
                <button
                  onClick={() => setFiltroTipo('error')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                    filtroTipo === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Errores
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-semibold text-[#003DA5] min-w-fit">Estado:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroEstado === 'todos'
                      ? 'bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFiltroEstado('no-leidas')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroEstado === 'no-leidas'
                      ? 'bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  No Leídas
                </button>
                <button
                  onClick={() => setFiltroEstado('leidas')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroEstado === 'leidas'
                      ? 'bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Leídas
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* LISTA DE NOTIFICACIONES WORLD CLASS */}
        <div className="space-y-3">
          {notificacionesFiltradas.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all ${
                !notif.leida ? 'border-[#003DA5] border-l-4' : 'border-[#E0EDFF]'
              }`}
            >
              <div className={`p-5 ${!notif.leida ? 'bg-gradient-to-r from-[#E0EDFF]/50 to-transparent' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Icono Tipo Chat */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    notif.tipo === 'recordatorio' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    notif.tipo === 'advertencia' ? 'bg-gradient-to-br from-[#F57C00] to-amber-600' :
                    notif.tipo === 'error' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                    notif.tipo === 'exito' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    {notif.tipo === 'recordatorio' && <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />}
                    {notif.tipo === 'advertencia' && <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />}
                    {notif.tipo === 'error' && <X className="w-5 h-5 text-white" strokeWidth={2.5} />}
                    {notif.tipo === 'exito' && <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />}
                    {notif.tipo === 'info' && <Info className="w-5 h-5 text-white" strokeWidth={2.5} />}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${!notif.leida ? 'text-[#003DA5]' : 'text-gray-700'}`}>
                          {notif.titulo}
                        </h3>
                        {!notif.leida && (
                          <div className="w-2 h-2 bg-[#F57C00] rounded-full animate-pulse" />
                        )}
                      </div>
                      <button
                        onClick={() => eliminarNotificacion(notif.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{notif.mensaje}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatFechaRelativa(notif.fecha)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E0EDFF] text-[#003DA5] rounded-lg font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          {notif.origen}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {notif.accion && (
                          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all">
                            {notif.accion.texto}
                          </button>
                        )}
                        {!notif.leida && (
                          <button
                            onClick={() => marcarComoLeida(notif.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar Leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {notificacionesFiltradas.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl p-12 text-center shadow-sm border border-[#E0EDFF]"
            >
              <div className="w-20 h-20 bg-[#E0EDFF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-[#003DA5]" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold text-[#003DA5] mb-2">No hay notificaciones</h3>
              <p className="text-gray-600">No se encontraron notificaciones con los filtros seleccionados</p>
            </motion.div>
          )}
        </div>
      </div>
    </Container4K>
  );
};

// ====================================
// FUNCIONES AUXILIARES
// ====================================

function formatFechaRelativa(fecha: string): string {
  const ahora = new Date();
  const fechaNotif = new Date(fecha);
  const diff = ahora.getTime() - fechaNotif.getTime();
  const minutos = Math.floor(diff / (1000 * 60));
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} minutos`;
  if (horas < 24) return `Hace ${horas} horas`;
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return fechaNotif.toLocaleDateString();
}

export default NotificacionesModule;