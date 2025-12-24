/**
 * ============================================
 * NOTIFICACIONES - Control Interno Disciplinario
 * ============================================
 * 
 * Centro de notificaciones, alertas y recordatorios
 * Diseño unificado con Proceso de Auditoría
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell, AlertTriangle, Calendar, Clock, Info, Mail, MessageSquare,
  CheckCircle, X, Eye, Trash2, Filter, Search
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { HeaderModuloCIG } from '../control-interno/HeaderModuloCIG';

// ============ TIPOS ============

interface Notificacion {
  id: string;
  tipo: 'alerta' | 'recordatorio' | 'vencimiento' | 'sistema' | 'aprobacion';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  prioridad: 'alta' | 'media' | 'baja';
  origen: string;
  accionable?: boolean;
}

// ============ DATOS MOCK ============

const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'alerta',
    titulo: 'Informe Pormenorizado próximo a vencer',
    mensaje: 'El Informe Pormenorizado debe ser enviado antes del 28 de febrero. Quedan 4 días para el vencimiento.',
    fecha: '2025-01-24T10:30:00',
    leida: false,
    prioridad: 'alta',
    origen: 'Sistema de Informes',
    accionable: true
  },
  {
    id: '2',
    tipo: 'recordatorio',
    titulo: 'Reunión de seguimiento programada',
    mensaje: 'Reunión de seguimiento a procesos disciplinarios programada para el 30 de enero a las 10:00 AM.',
    fecha: '2025-01-24T09:00:00',
    leida: false,
    prioridad: 'media',
    origen: 'Calendario',
    accionable: true
  },
  {
    id: '3',
    tipo: 'vencimiento',
    titulo: 'Plan Anual de Auditoría vencido',
    mensaje: 'El Plan Anual de Auditoría debió ser entregado el 31 de enero. Se requiere acción inmediata.',
    fecha: '2025-01-23T14:00:00',
    leida: true,
    prioridad: 'alta',
    origen: 'Sistema de Informes',
    accionable: true
  },
  {
    id: '4',
    tipo: 'sistema',
    titulo: 'Actualización del sistema disponible',
    mensaje: 'Nueva versión del módulo de Control Interno Disciplinario disponible con mejoras de seguridad.',
    fecha: '2025-01-22T16:45:00',
    leida: true,
    prioridad: 'baja',
    origen: 'Administrador',
    accionable: false
  },
  {
    id: '5',
    tipo: 'aprobacion',
    titulo: 'Solicitud de aprobación pendiente',
    mensaje: 'El proceso PD-2025-0025 requiere su aprobación para continuar a la siguiente etapa.',
    fecha: '2025-01-24T08:15:00',
    leida: false,
    prioridad: 'alta',
    origen: 'Gestión de Procesos',
    accionable: true
  },
  {
    id: '6',
    tipo: 'recordatorio',
    titulo: 'Documento pendiente de firma',
    mensaje: 'El Acta 001-2025 está pendiente de su firma digital.',
    fecha: '2025-01-23T11:20:00',
    leida: false,
    prioridad: 'media',
    origen: 'Gestión Documental',
    accionable: true
  },
  {
    id: '7',
    tipo: 'alerta',
    titulo: 'Término procesal próximo a vencer',
    mensaje: 'El término para presentar descargos en el proceso PD-2025-0018 vence en 2 días hábiles.',
    fecha: '2025-01-23T09:30:00',
    leida: true,
    prioridad: 'alta',
    origen: 'Términos y Alertas',
    accionable: true
  },
  {
    id: '8',
    tipo: 'sistema',
    titulo: 'Backup completado exitosamente',
    mensaje: 'El backup automático del sistema se completó exitosamente el 22 de enero a las 2:00 AM.',
    fecha: '2025-01-22T02:00:00',
    leida: true,
    prioridad: 'baja',
    origen: 'Sistema',
    accionable: false
  },
  {
    id: '9',
    tipo: 'recordatorio',
    titulo: 'Revisión de expedientes programada',
    mensaje: 'Revisión mensual de expedientes electrónicos programada para mañana a las 3:00 PM.',
    fecha: '2025-01-23T15:00:00',
    leida: false,
    prioridad: 'media',
    origen: 'Expediente Electrónico',
    accionable: false
  },
  {
    id: '10',
    tipo: 'alerta',
    titulo: 'Nuevo proceso disciplinario asignado',
    mensaje: 'Se le ha asignado el proceso PD-2025-0042 para valoración inicial.',
    fecha: '2025-01-24T07:45:00',
    leida: false,
    prioridad: 'alta',
    origen: 'Gestión de Procesos',
    accionable: true
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function NotificacionesModule() {
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_MOCK);
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('Todas');
  const [mostrarSoloNoLeidas, setMostrarSoloNoLeidas] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const getIconoNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return <AlertTriangle className="w-5 h-5" />;
      case 'recordatorio': return <Calendar className="w-5 h-5" />;
      case 'vencimiento': return <Clock className="w-5 h-5" />;
      case 'sistema': return <Info className="w-5 h-5" />;
      case 'aprobacion': return <CheckCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColorNotificacion = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return '#ef4444';
      case 'media': return '#f59e0b';
      case 'baja': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const marcarComoLeida = (id: string) => {
    setNotificaciones(notificaciones.map(n => 
      n.id === id ? { ...n, leida: true } : n
    ));
    toast.success('Notificación marcada como leída');
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(notificaciones.filter(n => n.id !== id));
    toast.success('Notificación eliminada');
  };

  // Estadísticas
  const totalNotificaciones = notificaciones.length;
  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const prioridadAlta = notificaciones.filter(n => n.prioridad === 'alta').length;
  const accionables = notificaciones.filter(n => n.accionable).length;

  // Filtrado
  let notificacionesFiltradas = notificaciones;
  if (mostrarSoloNoLeidas) {
    notificacionesFiltradas = notificacionesFiltradas.filter(n => !n.leida);
  }
  if (filtroTipo !== 'Todos') {
    notificacionesFiltradas = notificacionesFiltradas.filter(n => n.tipo === filtroTipo.toLowerCase());
  }
  if (filtroPrioridad !== 'Todas') {
    notificacionesFiltradas = notificacionesFiltradas.filter(n => n.prioridad === filtroPrioridad.toLowerCase());
  }
  if (busqueda) {
    notificacionesFiltradas = notificacionesFiltradas.filter(n => 
      n.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.mensaje.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Unificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <HeaderModuloCIG
          titulo="Centro de Notificaciones"
          subtitulo="Alertas, recordatorios y comunicaciones del sistema"
        />
      </div>

      {/* Barra de Estadísticas */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              titulo="Total" 
              valor={totalNotificaciones} 
              icono={<Bell className="w-5 h-5" />} 
              color="#1e5da8" 
            />
            <StatCard 
              titulo="No Leídas" 
              valor={noLeidas} 
              icono={<Mail className="w-5 h-5" />} 
              color="#ef4444" 
            />
            <StatCard 
              titulo="Prioridad Alta" 
              valor={prioridadAlta} 
              icono={<AlertTriangle className="w-5 h-5" />} 
              color="#f59e0b" 
            />
            <StatCard 
              titulo="Accionables" 
              valor={accionables} 
              icono={<CheckCircle className="w-5 h-5" />} 
              color="#10b981" 
            />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar notificaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Todos los tipos</option>
            <option>Alerta</option>
            <option>Recordatorio</option>
            <option>Vencimiento</option>
            <option>Sistema</option>
            <option>Aprobacion</option>
          </select>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Todas las prioridades</option>
            <option>Alta</option>
            <option>Media</option>
            <option>Baja</option>
          </select>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarSoloNoLeidas}
              onChange={(e) => setMostrarSoloNoLeidas(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Mostrar solo no leídas
          </label>
          <ButtonSIGL variant="outline" size="sm" onClick={marcarTodasComoLeidas}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </ButtonSIGL>
        </div>

        {/* Lista de Notificaciones */}
        <div className="space-y-3">
          {notificacionesFiltradas.length === 0 ? (
            <CardSIGL className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay notificaciones que mostrar</p>
            </CardSIGL>
          ) : (
            notificacionesFiltradas.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardSIGL
                  className={`p-5 transition-all hover:shadow-lg ${
                    !notif.leida ? 'bg-blue-50 border-blue-200 border-l-4' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: getColorNotificacion(notif.prioridad) }}
                    >
                      {getIconoNotificacion(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm text-gray-900 font-semibold flex items-center gap-2">
                          {notif.titulo}
                          {!notif.leida && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notif.mensaje}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(notif.fecha).toLocaleString('es-ES')}</span>
                        </div>
                        <span>•</span>
                        <span>{notif.origen}</span>
                        <span>•</span>
                        <BadgeSIGL 
                          variant="outline" 
                          size="sm"
                          style={{
                            borderColor: getColorNotificacion(notif.prioridad),
                            color: getColorNotificacion(notif.prioridad)
                          }}
                        >
                          {notif.prioridad}
                        </BadgeSIGL>
                        {notif.accionable && (
                          <>
                            <span>•</span>
                            <BadgeSIGL variant="outline" size="sm">Accionable</BadgeSIGL>
                          </>
                        )}
                      </div>
                      {notif.accionable && (
                        <div className="flex gap-2 mt-3">
                          <ButtonSIGL variant="default" size="sm">
                            Ver Detalles
                          </ButtonSIGL>
                          <ButtonSIGL variant="outline" size="sm">
                            Tomar Acción
                          </ButtonSIGL>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.leida && (
                        <button
                          onClick={() => marcarComoLeida(notif.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Marcar como leída"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      <button
                        onClick={() => eliminarNotificacion(notif.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardSIGL>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============ COMPONENTE: STAT CARD ============

function StatCard({
  titulo,
  valor,
  icono,
  color
}: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icono}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{titulo}</p>
          <p className="text-xl font-bold text-gray-900">{valor}</p>
        </div>
      </div>
    </div>
  );
}
