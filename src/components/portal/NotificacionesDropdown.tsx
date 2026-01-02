/**
 * ════════════════════════════════════════════════════════════════════════════
 * NOTIFICACIONES DROPDOWN - SISTEMA SIGL
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Dropdown de notificaciones del Sistema Integral de Gestión Legal (SIGL)
 * Se activa desde el icono de campana (Bell) en el navbar.
 * 
 * CARACTERÍSTICAS:
 * - Notificaciones por módulo (Defensa Judicial, Juzgamiento, Órganos Control, etc.)
 * - Alertas de términos vencidos y urgentes
 * - Asignaciones de nuevos casos
 * - Actualizaciones de procesos
 * - Marcar como leída / Eliminar
 * - Navegación directa al elemento
 * 
 * ÚLTIMA ACTUALIZACIÓN: 29 Diciembre 2024
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
  Clock,
  Scale,
  Gavel,
  Building2,
  FileText,
  UserPlus,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner@2.0.3';

interface Notificacion {
  id: string;
  modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO' | 'ORGANOS_CONTROL' | 'ASESORIA' | 'TERMINOS' | 'SISTEMA';
  tipo: 'urgente' | 'vencido' | 'asignacion' | 'actualizacion' | 'info';
  titulo: string;
  descripcion?: string;
  fecha: Date;
  leida: boolean;
  accion?: {
    label: string;
    path: string;
  };
}

// Mock data - Notificaciones de ejemplo del SIGL
const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: 'not-001',
    modulo: 'TERMINOS',
    tipo: 'vencido',
    titulo: 'Término vencido: PJ-2024-001',
    descripcion: 'El plazo para presentar contestación de demanda venció hace 2 días',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    leida: false,
    accion: {
      label: 'Ver proceso',
      path: '/gestion-legal/defensa-judicial'
    }
  },
  {
    id: 'not-002',
    modulo: 'ORGANOS_CONTROL',
    tipo: 'urgente',
    titulo: 'Requerimiento urgente CGR',
    descripcion: 'REQ-CGR-2024-001 vence en 2 días. Requiere respuesta inmediata',
    fecha: new Date(Date.now() - 3 * 60 * 60 * 1000),
    leida: false,
    accion: {
      label: 'Responder',
      path: '/gestion-legal/organos-control'
    }
  },
  {
    id: 'not-003',
    modulo: 'JUZGAMIENTO',
    tipo: 'asignacion',
    titulo: 'Nuevo proceso disciplinario asignado',
    descripcion: 'PD-2024-089 - Presunta irregularidad en contratación',
    fecha: new Date(Date.now() - 5 * 60 * 60 * 1000),
    leida: false,
    accion: {
      label: 'Ver expediente',
      path: '/gestion-legal/juzgamiento'
    }
  },
  {
    id: 'not-004',
    modulo: 'DEFENSA_JUDICIAL',
    tipo: 'actualizacion',
    titulo: 'Audiencia programada',
    descripcion: 'PJ-2024-045 - Audiencia el 05/01/2025 a las 10:00 AM',
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    leida: false,
    accion: {
      label: 'Ver detalles',
      path: '/gestion-legal/defensa-judicial'
    }
  },
  {
    id: 'not-005',
    modulo: 'TERMINOS',
    tipo: 'urgente',
    titulo: '5 términos por vencer esta semana',
    descripcion: 'Revisa el módulo de Términos e Informes para priorizar',
    fecha: new Date(Date.now() - 6 * 60 * 60 * 1000),
    leida: false,
    accion: {
      label: 'Ver términos',
      path: '/gestion-legal/terminos-informes'
    }
  },
  {
    id: 'not-006',
    modulo: 'ASESORIA',
    tipo: 'asignacion',
    titulo: 'Nueva solicitud de concepto jurídico',
    descripcion: 'CONC-2024-156 - Viabilidad jurídica de contrato',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    leida: true,
    accion: {
      label: 'Ver solicitud',
      path: '/gestion-legal/asesoria-juridica'
    }
  },
  {
    id: 'not-007',
    modulo: 'SISTEMA',
    tipo: 'info',
    titulo: 'Actualización del sistema',
    descripcion: 'SIGL v5.0 - Nuevas funcionalidades disponibles',
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    leida: true
  }
];

export function NotificacionesDropdown() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_MOCK);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev =>
      prev.map(n => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev =>
      prev.map(n => ({ ...n, leida: true }))
    );
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    toast.info('Notificación eliminada');
  };

  const handleAccion = (notificacion: Notificacion) => {
    marcarComoLeida(notificacion.id);
    if (notificacion.accion) {
      toast.info(`Navegando a ${notificacion.accion.label}`, {
        description: notificacion.titulo
      });
      // Aquí se podría implementar navegación real
    }
  };

  const getIconoModulo = (modulo: Notificacion['modulo']) => {
    switch (modulo) {
      case 'DEFENSA_JUDICIAL':
        return <Scale className="w-4 h-4 text-blue-600" />;
      case 'JUZGAMIENTO':
        return <Gavel className="w-4 h-4 text-purple-600" />;
      case 'ORGANOS_CONTROL':
        return <Building2 className="w-4 h-4 text-green-600" />;
      case 'ASESORIA':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'TERMINOS':
        return <Clock className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getIconoTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'vencido':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'urgente':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'asignacion':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'actualizacion':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorTipo = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'vencido':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'urgente':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'asignacion':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'actualizacion':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      default:
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };

  const getNombreModulo = (modulo: Notificacion['modulo']) => {
    switch (modulo) {
      case 'DEFENSA_JUDICIAL':
        return 'Defensa Judicial';
      case 'JUZGAMIENTO':
        return 'Juzgamiento';
      case 'ORGANOS_CONTROL':
        return 'Órganos de Control';
      case 'ASESORIA':
        return 'Asesoría Jurídica';
      case 'TERMINOS':
        return 'Términos e Informes';
      default:
        return 'Sistema';
    }
  };

  const formatearFecha = (fecha: Date): string => {
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (horas < 1) return 'Hace un momento';
    if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#003DA5]" />
            <h3 className="font-black text-gray-900">Notificaciones SIGL</h3>
          </div>
          {noLeidas > 0 && (
            <Badge className="bg-red-500 text-white font-bold">
              {noLeidas} {noLeidas === 1 ? 'nueva' : 'nuevas'}
            </Badge>
          )}
        </div>

        {noLeidas > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={marcarTodasComoLeidas}
            className="w-full justify-start text-xs text-[#003DA5] hover:bg-blue-50 h-8 font-semibold"
          >
            <Check className="w-3 h-3 mr-1" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Lista de Notificaciones */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {notificaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">No tienes notificaciones</p>
              <p className="text-xs text-gray-500 mt-1">
                Aquí aparecerán alertas de términos, asignaciones y actualizaciones
              </p>
            </div>
          ) : (
            notificaciones.map((notificacion) => (
              <motion.div
                key={notificacion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`relative p-3 rounded-lg border transition-all duration-200 cursor-pointer ${ 
                  notificacion.leida
                    ? 'bg-white border-gray-200 hover:bg-gray-50'
                    : getColorTipo(notificacion.tipo)
                } ${!notificacion.leida ? 'shadow-sm' : ''}`}
                onClick={() => handleAccion(notificacion)}
              >
                {/* Indicador de no leída */}
                {!notificacion.leida && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icono de tipo */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getIconoTipo(notificacion.tipo)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Badge de módulo */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {getIconoModulo(notificacion.modulo)}
                      <span className="text-xs font-bold text-gray-600">
                        {getNombreModulo(notificacion.modulo)}
                      </span>
                    </div>

                    <p className={`text-sm ${!notificacion.leida ? 'font-bold' : 'font-semibold'} text-gray-900 mb-1`}>
                      {notificacion.titulo}
                    </p>
                    
                    {notificacion.descripcion && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {notificacion.descripcion}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatearFecha(notificacion.fecha)}
                      </p>
                      
                      {notificacion.accion && (
                        <span className="text-xs font-semibold text-[#003DA5]">
                          {notificacion.accion.label} →
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {!notificacion.leida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarComoLeida(notificacion.id);
                        }}
                        title="Marcar como leída"
                      >
                        <Check className="w-3 h-3 text-gray-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarNotificacion(notificacion.id);
                      }}
                      title="Eliminar"
                    >
                      <X className="w-3 h-3 text-gray-600 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - Estadísticas y Ver todas */}
      {notificaciones.length > 0 && (
        <>
          <Separator />
          
          {/* Estadísticas rápidas */}
          <div className="p-3 bg-gray-50 border-t">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center p-2 bg-white rounded border">
                <p className="text-lg font-bold text-red-600">
                  {notificaciones.filter(n => n.tipo === 'vencido').length}
                </p>
                <p className="text-xs text-gray-600">Vencidos</p>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <p className="text-lg font-bold text-orange-600">
                  {notificaciones.filter(n => n.tipo === 'urgente').length}
                </p>
                <p className="text-xs text-gray-600">Urgentes</p>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <p className="text-lg font-bold text-blue-600">
                  {notificaciones.filter(n => n.tipo === 'asignacion').length}
                </p>
                <p className="text-xs text-gray-600">Nuevos</p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <Button
              variant="ghost"
              className="w-full justify-between text-sm text-[#003DA5] hover:bg-blue-50 font-semibold"
              onClick={() => toast.info('Navegando a todas las notificaciones')}
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Ver todas las notificaciones
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}