/**
 * SISTEMA DE NOTIFICACIONES - PLAN ANUAL DE AUDITORÍA
 * Alertas automáticas y recordatorios por vencimiento
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { useNotifications } from '../NotificationsContext';

interface Actividad {
  id: string;
  nombre: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
  porcentajeAvance: number;
}

interface Rol {
  id: number;
  nombre: string;
  color: string;
  actividades: Actividad[];
}

interface Notificacion {
  id: string;
  tipo: 'critico' | 'advertencia' | 'info' | 'exito';
  titulo: string;
  mensaje: string;
  actividad: Actividad;
  rolNombre: string;
  rolColor: string;
  diasRestantes: number;
  fechaCreacion: Date;
}

interface NotificacionesPlanAnualProps {
  roles: Rol[];
  onActualizarActividad?: (rolId: number, actividadId: string, nuevoEstado: string) => void;
}

export function NotificacionesPlanAnual({ roles, onActualizarActividad }: NotificacionesPlanAnualProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarPanel, setMostrarPanel] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');
  
  // Hook del contexto global de notificaciones
  const { addNotifications } = useNotifications();

  // Generar notificaciones automáticamente
  useEffect(() => {
    const nuevasNotificaciones: Notificacion[] = [];
    const hoy = new Date();

    roles.forEach((rol) => {
      rol.actividades.forEach((actividad) => {
        const fechaFin = new Date(actividad.fechaFin);
        const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        // Notificación CRÍTICA: Actividad retrasada
        if (diasRestantes < 0 && actividad.estado !== 'completada') {
          nuevasNotificaciones.push({
            id: `${actividad.id}-retrasada`,
            tipo: 'critico',
            titulo: '🚨 Actividad Vencida',
            mensaje: `La actividad "${actividad.nombre}" está retrasada ${Math.abs(diasRestantes)} días.`,
            actividad,
            rolNombre: rol.nombre,
            rolColor: rol.color,
            diasRestantes,
            fechaCreacion: new Date()
          });
        }

        // Notificación ADVERTENCIA: Vence en 7 días o menos
        if (diasRestantes >= 0 && diasRestantes <= 7 && actividad.estado !== 'completada') {
          nuevasNotificaciones.push({
            id: `${actividad.id}-proxima`,
            tipo: 'advertencia',
            titulo: '⚠️ Vencimiento Próximo',
            mensaje: `La actividad "${actividad.nombre}" vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}.`,
            actividad,
            rolNombre: rol.nombre,
            rolColor: rol.color,
            diasRestantes,
            fechaCreacion: new Date()
          });
        }

        // Notificación INFO: Bajo avance
        if (diasRestantes > 0 && diasRestantes <= 15 && actividad.porcentajeAvance < 50 && actividad.estado === 'en-progreso') {
          nuevasNotificaciones.push({
            id: `${actividad.id}-bajo-avance`,
            tipo: 'info',
            titulo: 'ℹ️ Avance Bajo',
            mensaje: `La actividad "${actividad.nombre}" tiene ${actividad.porcentajeAvance}% de avance y vence en ${diasRestantes} días.`,
            actividad,
            rolNombre: rol.nombre,
            rolColor: rol.color,
            diasRestantes,
            fechaCreacion: new Date()
          });
        }

        // Notificación ÉXITO: Completada recientemente
        if (actividad.estado === 'completada' && actividad.porcentajeAvance === 100) {
          const fechaInicio = new Date(actividad.fechaInicio);
          const diasDesdeInicio = Math.ceil((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diasDesdeInicio <= 7) {
            nuevasNotificaciones.push({
              id: `${actividad.id}-completada`,
              tipo: 'exito',
              titulo: '✅ Actividad Completada',
              mensaje: `La actividad "${actividad.nombre}" fue completada exitosamente.`,
              actividad,
              rolNombre: rol.nombre,
              rolColor: rol.color,
              diasRestantes,
              fechaCreacion: new Date()
            });
          }
        }
      });
    });

    // Ordenar por prioridad (crítico > advertencia > info > éxito) y días restantes
    nuevasNotificaciones.sort((a, b) => {
      const prioridad = { critico: 0, advertencia: 1, info: 2, exito: 3 };
      if (prioridad[a.tipo] !== prioridad[b.tipo]) {
        return prioridad[a.tipo] - prioridad[b.tipo];
      }
      return a.diasRestantes - b.diasRestantes;
    });

    setNotificaciones(nuevasNotificaciones);

    // 🔔 ENVIAR NOTIFICACIONES AL SISTEMA GLOBAL
    // Convertir notificaciones locales al formato global
    const notificacionesGlobales = nuevasNotificaciones.map(notif => {
      // Mapeo de prioridad
      const prioridadMap: Record<string, 'Baja' | 'Media' | 'Alta' | 'Crítica'> = {
        'exito': 'Baja',
        'info': 'Media',
        'advertencia': 'Alta',
        'critico': 'Crítica'
      };

      // Mapeo de iconos
      const iconoMap: Record<string, string> = {
        'critico': 'AlertTriangle',
        'advertencia': 'AlertCircle',
        'info': 'Info',
        'exito': 'CheckCircle'
      };

      // Mapeo de colores
      const colorMap: Record<string, string> = {
        'critico': '#DC2626',
        'advertencia': '#D97706',
        'info': '#2563EB',
        'exito': '#059669'
      };

      return {
        tipo_notificacion: `plan_anual_${notif.tipo}`,
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        descripcion_corta: `${notif.rolNombre} - ${notif.actividad.nombre}`,
        icono: iconoMap[notif.tipo] || 'Bell',
        color: colorMap[notif.tipo] || '#6B7280',
        prioridad: prioridadMap[notif.tipo] || 'Media',
        categoria: 'control-interno',
        tiene_accion: true,
        texto_boton_accion: 'Ver en Plan Anual',
        url_accion: '/backoffice/control-interno/plan-anual',
        modulo_origen: 'Plan Anual de Auditoría',
        datos_adicionales: {
          rolNombre: notif.rolNombre,
          rolColor: notif.rolColor,
          actividad: notif.actividad,
          diasRestantes: notif.diasRestantes
        }
      };
    });

    // Solo enviar notificaciones críticas y de advertencia al panel global
    const notificacionesCriticas = notificacionesGlobales.filter(
      n => n.prioridad === 'Crítica' || n.prioridad === 'Alta'
    );

    if (notificacionesCriticas.length > 0) {
      addNotifications(notificacionesCriticas);
    }
  }, [roles, addNotifications]);

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'critico': return <AlertTriangle className="w-5 h-5" />;
      case 'advertencia': return <AlertCircle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      case 'exito': return <CheckCircle2 className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'critico': return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      case 'advertencia': return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'info': return { bg: '#DBEAFE', color: '#2563EB', border: '#93C5FD' };
      case 'exito': return { bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' };
      default: return { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
    }
  };

  const notificacionesFiltradas = filtroTipo === 'todas' 
    ? notificaciones 
    : notificaciones.filter(n => n.tipo === filtroTipo);

  const contadores = {
    critico: notificaciones.filter(n => n.tipo === 'critico').length,
    advertencia: notificaciones.filter(n => n.tipo === 'advertencia').length,
    info: notificaciones.filter(n => n.tipo === 'info').length,
    exito: notificaciones.filter(n => n.tipo === 'exito').length
  };

  return (
    <div className="space-y-4">
      {/* BOTÓN DE NOTIFICACIONES */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <button
          onClick={() => setMostrarPanel(!mostrarPanel)}
          className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border-2 hover:shadow-lg transition-all w-full sm:w-auto"
          style={{ 
            background: (contadores.critico + contadores.advertencia) > 0 ? '#FEF2F2' : '#FFFFFF',
            borderColor: (contadores.critico + contadores.advertencia) > 0 ? '#DC2626' : '#E5E7EB'
          }}
        >
          <div className="relative">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: (contadores.critico + contadores.advertencia) > 0 ? '#DC2626' : '#F97316' }} />
            {(contadores.critico + contadores.advertencia) > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs font-black flex items-center justify-center"
                style={{ background: '#EF4444', color: '#FFFFFF' }}
              >
                {contadores.critico + contadores.advertencia}
              </span>
            )}
          </div>
          <div className="text-left flex-1">
            <p className="text-xs sm:text-sm font-bold" style={{ color: (contadores.critico + contadores.advertencia) > 0 ? '#DC2626' : '#1F2937' }}>
              Notificaciones y Alertas
            </p>
            <p className="text-[10px] sm:text-xs" style={{ color: '#6B7280' }}>
              {notificaciones.length} notificación{notificaciones.length !== 1 ? 'es' : ''}
            </p>
          </div>
          {mostrarPanel ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#6B7280' }} />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#6B7280' }} />
          )}
        </button>
      </motion.div>

      {/* PANEL DE NOTIFICACIONES */}
      <AnimatePresence>
        {mostrarPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 space-y-4"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              {/* CONTADORES Y FILTROS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroTipo('todas')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      filtroTipo === 'todas' ? 'shadow-md' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      background: filtroTipo === 'todas' ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      border: filtroTipo === 'todas' ? '2px solid #D1D5DB' : '2px solid #E5E7EB'
                    }}
                  >
                    Todas ({notificaciones.length})
                  </button>
                  {contadores.critico > 0 && (
                    <button
                      onClick={() => setFiltroTipo('critico')}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        filtroTipo === 'critico' ? 'shadow-md' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: filtroTipo === 'critico' ? '#FEE2E2' : '#FFFFFF',
                        color: '#DC2626',
                        border: filtroTipo === 'critico' ? '2px solid #FCA5A5' : '2px solid #E5E7EB'
                      }}
                    >
                      Críticas ({contadores.critico})
                    </button>
                  )}
                  {contadores.advertencia > 0 && (
                    <button
                      onClick={() => setFiltroTipo('advertencia')}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        filtroTipo === 'advertencia' ? 'shadow-md' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: filtroTipo === 'advertencia' ? '#FEF3C7' : '#FFFFFF',
                        color: '#D97706',
                        border: filtroTipo === 'advertencia' ? '2px solid #FCD34D' : '2px solid #E5E7EB'
                      }}
                    >
                      Advertencias ({contadores.advertencia})
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA DE NOTIFICACIONES */}
              {notificacionesFiltradas.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" style={{ color: '#10B981' }} />
                  <p className="text-sm sm:text-base font-bold" style={{ color: '#1F2937' }}>
                    ¡Todo está bajo control! 🎉
                  </p>
                  <p className="text-xs sm:text-sm mt-1" style={{ color: '#6B7280' }}>
                    No hay notificaciones de este tipo
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificacionesFiltradas.map((notif, index) => {
                    const colores = getColorTipo(notif.tipo);
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 sm:p-4 rounded-xl border-2"
                        style={{
                          background: colores.bg,
                          borderColor: colores.border
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{ background: '#FFFFFF', color: colores.color }}
                          >
                            {getIconoTipo(notif.tipo)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h4 className="text-sm sm:text-base font-bold mb-1" style={{ color: colores.color }}>
                                  {notif.titulo}
                                </h4>
                                <p className="text-xs sm:text-sm" style={{ color: '#1F2937' }}>
                                  {notif.mensaje}
                                </p>
                              </div>
                              <Badge
                                className="text-xs self-start"
                                style={{
                                  background: notif.rolColor + '20',
                                  color: notif.rolColor
                                }}
                              >
                                {notif.rolNombre}
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs" style={{ color: '#6B7280' }}>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{notif.actividad.responsable}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  Vence: {new Date(notif.actividad.fechaFin).toLocaleDateString('es-CO', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              </div>
                              {notif.tipo !== 'exito' && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    {notif.diasRestantes < 0
                                      ? `${Math.abs(notif.diasRestantes)} días de retraso`
                                      : `${notif.diasRestantes} días restantes`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Barra de progreso */}
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: '#6B7280' }}>Avance de la actividad</span>
                                <span className="font-bold" style={{ color: notif.rolColor }}>
                                  {notif.actividad.porcentajeAvance}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full" style={{ background: '#FFFFFF' }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    background: notif.rolColor,
                                    width: `${notif.actividad.porcentajeAvance}%`
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}