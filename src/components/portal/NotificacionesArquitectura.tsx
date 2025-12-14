/**
 * Componente: Notificaciones desde Arquitectura Empresarial
 * Widget que aparece en el Portal Transaccional mostrando notificaciones de AE
 */

import React, { useState } from 'react';
import { 
  Bell, 
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificacionesArquitecturaProps {
  userRole: string;
}

export function NotificacionesArquitectura({ userRole }: NotificacionesArquitecturaProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'not-001',
      tipo: 'info',
      titulo: 'Nueva versión del Sistema Académico',
      mensaje: 'Se ha actualizado el sistema de gestión académica a la versión 3.0. Revisa las nuevas funcionalidades.',
      fecha: '2025-12-06 09:00',
      leido: false,
      relevantePara: ['Estudiante', 'Docente', 'Administrativo'],
      accion: {
        texto: 'Ver novedades',
        url: '#'
      }
    },
    {
      id: 'not-002',
      tipo: 'warning',
      titulo: 'Capacitación obligatoria en Seguridad',
      mensaje: 'Debes completar el curso de Ciberseguridad Básica antes del 20 de diciembre.',
      fecha: '2025-12-05 14:30',
      leido: false,
      relevantePara: ['Docente', 'Administrativo'],
      accion: {
        texto: 'Ir al curso',
        url: '#'
      }
    },
    {
      id: 'not-003',
      tipo: 'info',
      titulo: 'Mantenimiento programado',
      mensaje: 'Este sábado 14 habrá mantenimiento de 2AM a 6AM. Algunos servicios estarán no disponibles.',
      fecha: '2025-12-04 16:00',
      leido: false,
      relevantePara: ['Estudiante', 'Docente', 'Graduado', 'Administrativo'],
      accion: null
    }
  ]);

  // Filtrar notificaciones relevantes para el rol
  const notificacionesRelevantes = notifications.filter(n => 
    n.relevantePara.includes(userRole)
  );

  const notificacionesNoLeidas = notificacionesRelevantes.filter(n => !n.leido).length;

  const marcarComoLeida = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, leido: true } : n
    ));
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTipoBgColor = (tipo: string) => {
    switch (tipo) {
      case 'info': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {notificacionesNoLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {notificacionesNoLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#003DA5] to-[#0052cc]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Notificaciones de TI</h3>
                    <p className="text-xs text-blue-100">
                      Arquitectura Empresarial
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Lista de notificaciones */}
              <div className="max-h-[500px] overflow-y-auto">
                {notificacionesRelevantes.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No tienes notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {notificacionesRelevantes.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 transition-colors ${
                          !notif.leido ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getTipoBgColor(notif.tipo)} border`}>
                            {getTipoIcon(notif.tipo)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className={`font-semibold text-gray-900 ${!notif.leido ? 'text-blue-900' : ''}`}>
                                {notif.titulo}
                              </h4>
                              {!notif.leido && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notif.mensaje}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>{notif.fecha}</span>
                              </div>
                              {notif.accion && (
                                <a
                                  href={notif.accion.url}
                                  onClick={() => marcarComoLeida(notif.id)}
                                  className="text-xs font-semibold text-[#003DA5] hover:text-[#002d7a] flex items-center gap-1"
                                >
                                  {notif.accion.texto}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notificacionesRelevantes.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setNotifications(notifications.map(n => ({ ...n, leido: true })));
                    }}
                    className="w-full text-sm font-semibold text-[#003DA5] hover:text-[#002d7a] transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
