import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Loader2
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { toast } from 'sonner';
import { useNotificacionesControlInterno } from './hooks/useNotificacionesControlInterno';

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
// FUNCIONES DE MAPEO
// ====================================

/**
 * Mapea el tipo de notificación del backend al tipo de UI
 */
function mapearTipoNotificacion(tipoNotificacion: string): Notificacion['tipo'] {
  const tipoMap: Record<string, Notificacion['tipo']> = {
    'recordatorio_plazo': 'recordatorio',
    'alerta_vencimiento': 'advertencia',
    'rechazo_plan': 'error',
    'validacion_evidencia': 'error',
    'ampliacion_plazo_rechazada': 'error',
    'aprobacion_plan': 'exito',
    'ampliacion_plazo_aprobada': 'exito',
    'hallazgo_identificado': 'advertencia',
    'solicitud_evidencia': 'info',
    'recepcion_documento': 'info',
    'anuncio_auditoria': 'info',
    'controversia_hallazgo': 'advertencia',
    'solicitud_ampliacion_plazo': 'info',
    'otro': 'info',
  };
  return tipoMap[tipoNotificacion] || 'info';
}

/**
 * Obtiene el origen de la notificación basado en el tipo
 */
function obtenerOrigen(tipoNotificacion: string): string {
  const origenMap: Record<string, string> = {
    'anuncio_auditoria': 'Programa Anual',
    'hallazgo_identificado': 'Auditorías',
    'aprobacion_plan': 'Planes de Mejoramiento',
    'rechazo_plan': 'Planes de Mejoramiento',
    'solicitud_ampliacion_plazo': 'Auditorías',
    'ampliacion_plazo_aprobada': 'Auditorías',
    'ampliacion_plazo_rechazada': 'Auditorías',
    'recepcion_documento': 'Gestión Documental',
    'validacion_evidencia': 'Validación de Evidencias',
    'solicitud_evidencia': 'Validación de Evidencias',
    'recordatorio_plazo': 'Sistema de Seguimiento',
    'alerta_vencimiento': 'Sistema de Seguimiento',
    'controversia_hallazgo': 'Auditorías',
  };
  return origenMap[tipoNotificacion] || 'Sistema';
}

/**
 * Convierte una notificación del backend al formato de UI
 */
function mapearNotificacionBackend(notif: any): Notificacion {
  // Asegurarse de usar createdAt del backend (created_at en snake_case)
  const fechaCreacion = notif.createdAt || notif.created_at || notif.fecha;
  
  return {
    id: notif.id,
    tipo: mapearTipoNotificacion(notif.tipoNotificacion),
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: fechaCreacion,
    leida: notif.leida,
    origen: obtenerOrigen(notif.tipoNotificacion),
    accion: notif.accionUrl ? {
      texto: 'Ver Detalles',
      url: notif.accionUrl
    } : undefined
  };
}

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const NotificacionesModule: React.FC = () => {
  const {
    notificaciones: notificacionesBackend,
    loading,
    error,
    cargarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion
  } = useNotificacionesControlInterno();

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  // Mapear notificaciones del backend al formato de UI
  const notificaciones = useMemo(() => {
    return notificacionesBackend.map(mapearNotificacionBackend);
  }, [notificacionesBackend]);

  // Recargar notificaciones periódicamente
  useEffect(() => {
    // Solo crear el interval si hay un usuario autenticado
    if (!notificacionesBackend.length && loading) {
      return; // Esperar a que se carguen las notificaciones iniciales
    }

    const interval = setInterval(() => {
      cargarNotificaciones();
    }, 30000); // Recargar cada 30 segundos

    return () => clearInterval(interval);
    // Solo ejecutar cuando cambie cargarNotificaciones (que depende de user)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargarNotificaciones]);

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
  const handleMarcarComoLeida = async (id: string) => {
    await marcarLeida(id);
  };

  const handleMarcarTodasLeidas = async () => {
    await marcarTodasLeidas();
  };

  const handleEliminarNotificacion = async (id: string) => {
    await eliminarNotificacion(id);
  };

  const handleLimpiarLeidas = async () => {
    // Eliminar todas las notificaciones leídas
    const leidas = notificaciones.filter(n => n.leida);
    for (const notif of leidas) {
      await eliminarNotificacion(notif.id);
    }
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
              <ButtonSIGL variant="secondary" onClick={handleMarcarTodasLeidas} disabled={estadisticas.noLeidas === 0 || loading}>
                <CheckCircle2 className="w-4 h-4" />
                Marcar Todas Leídas
              </ButtonSIGL>
              <ButtonSIGL variant="secondary" onClick={handleLimpiarLeidas} disabled={loading}>
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
          {loading && (
            <CardSIGL>
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
                <p className="text-gray-600">Cargando notificaciones...</p>
              </div>
            </CardSIGL>
          )}

          {error && (
            <CardSIGL>
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-medium">Error al cargar notificaciones</p>
                </div>
                <p className="text-sm text-red-600 mt-2">{error}</p>
                <ButtonSIGL variant="secondary" onClick={cargarNotificaciones} className="mt-4">
                  Reintentar
                </ButtonSIGL>
              </div>
            </CardSIGL>
          )}

          {!loading && !error && notificacionesFiltradas.map((notif, index) => (
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
                          onClick={() => handleEliminarNotificacion(notif.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          disabled={loading}
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
                          {!notif.leida && (
                            <ButtonSIGL
                              variant="secondary"
                              type="button"
                              onClick={() => handleMarcarComoLeida(notif.id)}
                              disabled={loading}
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

          {!loading && !error && notificacionesFiltradas.length === 0 && (
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
  if (!fecha) return 'Fecha no disponible';
  
  const ahora = new Date();
  // Parsear la fecha correctamente, manejando diferentes formatos del backend
  let fechaNotif: Date;
  
  try {
    // Si la fecha viene en formato ISO (con T) o ya es un objeto Date válido
    if (fecha.includes('T')) {
      fechaNotif = new Date(fecha);
    } else if (fecha.includes(' ')) {
      // Formato del backend: "2026-01-16 03:17:40.938797"
      // Convertir a formato ISO reemplazando el espacio con T
      const fechaISO = fecha.replace(' ', 'T');
      fechaNotif = new Date(fechaISO);
    } else {
      fechaNotif = new Date(fecha);
    }
    
    // Validar que la fecha sea válida
    if (isNaN(fechaNotif.getTime())) {
      console.warn('[formatFechaRelativa] Fecha inválida:', fecha);
      return 'Fecha inválida';
    }
    
    const diff = ahora.getTime() - fechaNotif.getTime();
    
    // Si la diferencia es negativa (fecha futura), mostrar la fecha directamente
    if (diff < 0) {
      return fechaNotif.toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(diff / (1000 * 60));
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Solo mostrar "Ahora" si realmente fue hace menos de 1 minuto
    if (minutos < 1) {
      return segundos < 10 ? 'Ahora' : `Hace ${segundos} segundos`;
    }
    if (minutos < 60) {
      return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    }
    if (horas < 24) {
      return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }
    if (dias === 1) {
      return 'Ayer';
    }
    if (dias < 7) {
      return `Hace ${dias} días`;
    }
    if (dias < 30) {
      const semanas = Math.floor(dias / 7);
      return `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
    }
    if (dias < 365) {
      const meses = Math.floor(dias / 30);
      return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }
    
    // Para fechas más antiguas, mostrar la fecha completa
    return fechaNotif.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatFechaRelativa] Error al formatear fecha:', fecha, error);
    return 'Fecha inválida';
  }
}

export default NotificacionesModule;