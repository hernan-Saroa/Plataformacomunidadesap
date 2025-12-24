import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  FileText,
  Users,
  Calendar,
  Trash2,
  Eye,
  Filter,
  X
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { toast } from 'sonner';

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
    origen: 'Informes de Ley'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg relative">
                  <Bell className="w-6 h-6 text-white" />
                  {estadisticas.noLeidas > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{estadisticas.noLeidas}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Centro de Notificaciones</h1>
                  <p className="text-sm text-gray-500">Alertas y recordatorios del sistema</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <ButtonSIGL variant="default" onClick={marcarTodasLeidas} disabled={estadisticas.noLeidas === 0}>
                <CheckCircle2 className="w-4 h-4" />
                Marcar Todas Leídas
              </ButtonSIGL>
              <ButtonSIGL variant="default" onClick={limpiarLeidas}>
                <Trash2 className="w-4 h-4" />
                Limpiar Leídas
              </ButtonSIGL>
            </div>
          </div>
        </motion.div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSIGL>
            <div className="p-6">
              <Bell className="w-8 h-8 text-violet-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.total}</div>
              <div className="text-sm text-gray-600">Total Notificaciones</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.noLeidas}</div>
              <div className="text-sm text-gray-600">No Leídas</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <Calendar className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.hoyCount}</div>
              <div className="text-sm text-gray-600">Hoy</div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{estadisticas.advertencias}</div>
              <div className="text-sm text-gray-600">Advertencias Activas</div>
            </div>
          </CardSIGL>
        </div>

        {/* FILTROS */}
        <CardSIGL>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Tipo:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltroTipo('todos')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      filtroTipo === 'todos'
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroTipo('recordatorio')}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                      filtroTipo === 'recordatorio'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    Recordatorios
                  </button>
                  <button
                    onClick={() => setFiltroTipo('advertencia')}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                      filtroTipo === 'advertencia'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Advertencias
                  </button>
                  <button
                    onClick={() => setFiltroTipo('error')}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                      filtroTipo === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    Errores
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltroEstado('todos')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      filtroEstado === 'todos'
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFiltroEstado('no-leidas')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      filtroEstado === 'no-leidas'
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    No Leídas
                  </button>
                  <button
                    onClick={() => setFiltroEstado('leidas')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      filtroEstado === 'leidas'
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Leídas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardSIGL>

        {/* LISTA DE NOTIFICACIONES */}
        <div className="space-y-2">
          {notificacionesFiltradas.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <CardSIGL>
                <div className={`p-6 ${!notif.leida ? 'bg-violet-50' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notif.tipo === 'recordatorio' ? 'bg-blue-100' :
                      notif.tipo === 'advertencia' ? 'bg-yellow-100' :
                      notif.tipo === 'error' ? 'bg-red-100' :
                      notif.tipo === 'exito' ? 'bg-green-100' :
                      'bg-gray-100'
                    }`}>
                      {notif.tipo === 'recordatorio' && <Clock className="w-5 h-5 text-blue-600" />}
                      {notif.tipo === 'advertencia' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                      {notif.tipo === 'error' && <X className="w-5 h-5 text-red-600" />}
                      {notif.tipo === 'exito' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {notif.tipo === 'info' && <Info className="w-5 h-5 text-gray-600" />}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-semibold ${!notif.leida ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notif.titulo}
                          </h3>
                          {!notif.leida && (
                            <div className="w-2 h-2 bg-violet-500 rounded-full" />
                          )}
                        </div>
                        <button
                          onClick={() => eliminarNotificacion(notif.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{notif.mensaje}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {formatFechaRelativa(notif.fecha)}
                          </span>
                          <span className="text-gray-500">
                            <FileText className="w-4 h-4 inline mr-1" />
                            {notif.origen}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {notif.accion && (
                            <ButtonSIGL variant="primary">
                              {notif.accion.texto}
                            </ButtonSIGL>
                          )}
                          {!notif.leida && (
                            <ButtonSIGL
                              variant="default"
                              onClick={() => marcarComoLeida(notif.id)}
                            >
                              Marcar como Leída
                            </ButtonSIGL>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardSIGL>
            </motion.div>
          ))}

          {notificacionesFiltradas.length === 0 && (
            <CardSIGL>
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay notificaciones</h3>
                <p className="text-gray-600">No se encontraron notificaciones con los filtros seleccionados</p>
              </div>
            </CardSIGL>
          )}
        </div>
      </div>
    </div>
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