/**
 * HISTORIAL DE APROBACIÓN DEL PTA
 * 
 * Muestra el historial completo de cambios de estado,
 * aprobaciones, rechazos y observaciones
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { motion } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Send,
  Calendar,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface EventoHistorial {
  id: string;
  tipo: 'creacion' | 'envio' | 'aprobacion' | 'rechazo';
  estado: string;
  fecha: string;
  usuario: string;
  rolUsuario: string;
  observaciones?: string;
  motivoRechazo?: string;
}

interface PTAHistorialAprobacionProps {
  pta: any;
}

export function PTAHistorialAprobacion({ pta }: PTAHistorialAprobacionProps) {
  
  // Construir historial desde los datos del PTA
  const construirHistorial = (): EventoHistorial[] => {
    const eventos: EventoHistorial[] = [];
    
    // Creación
    if (pta.fecha_creacion) {
      eventos.push({
        id: 'creacion',
        tipo: 'creacion',
        estado: 'CONSTRUCCION',
        fecha: pta.fecha_creacion,
        usuario: pta.docente_nombre || 'Docente',
        rolUsuario: 'Docente'
      });
    }
    
    // Envío a aprobación
    if (pta.fecha_envio_aprobacion) {
      eventos.push({
        id: 'envio',
        tipo: 'envio',
        estado: 'EN_APROBACION',
        fecha: pta.fecha_envio_aprobacion,
        usuario: pta.docente_nombre || 'Docente',
        rolUsuario: 'Docente'
      });
    }
    
    // Aprobación/Rechazo por Director
    if (pta.fecha_aprobacion_director) {
      eventos.push({
        id: 'aprobacion-director',
        tipo: 'aprobacion',
        estado: 'APROBADO_DIRECTOR',
        fecha: pta.fecha_aprobacion_director,
        usuario: pta.aprobado_por_director || 'Director Territorial',
        rolUsuario: 'Director Territorial',
        observaciones: pta.observaciones_director
      });
    }
    
    if (pta.fecha_rechazo_director) {
      eventos.push({
        id: 'rechazo-director',
        tipo: 'rechazo',
        estado: 'RECHAZADO_DIRECTOR',
        fecha: pta.fecha_rechazo_director,
        usuario: pta.rechazado_por_director || 'Director Territorial',
        rolUsuario: 'Director Territorial',
        motivoRechazo: pta.motivo_rechazo_director,
        observaciones: pta.observaciones_director
      });
    }
    
    // Aprobación/Rechazo por Programación
    if (pta.fecha_aprobacion_programacion) {
      eventos.push({
        id: 'aprobacion-programacion',
        tipo: 'aprobacion',
        estado: 'APROBADO_PROGRAMACION',
        fecha: pta.fecha_aprobacion_programacion,
        usuario: pta.aprobado_por_programacion || 'Coordinador de Programación',
        rolUsuario: 'Programación Académica',
        observaciones: pta.observaciones_programacion
      });
    }
    
    if (pta.fecha_rechazo_programacion) {
      eventos.push({
        id: 'rechazo-programacion',
        tipo: 'rechazo',
        estado: 'RECHAZADO_PROGRAMACION',
        fecha: pta.fecha_rechazo_programacion,
        usuario: pta.rechazado_por_programacion || 'Coordinador de Programación',
        rolUsuario: 'Programación Académica',
        motivoRechazo: pta.motivo_rechazo_programacion,
        observaciones: pta.observaciones_programacion
      });
    }
    
    // Aprobación final
    if (pta.fecha_aprobacion_final) {
      eventos.push({
        id: 'aprobacion-final',
        tipo: 'aprobacion',
        estado: 'APROBADO_FINAL',
        fecha: pta.fecha_aprobacion_final,
        usuario: pta.aprobado_por_final || 'Sistema',
        rolUsuario: 'Sistema'
      });
    }
    
    // Ordenar por fecha (más reciente primero)
    return eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };
  
  const historial = construirHistorial();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getIconoEvento = (tipo: string) => {
    switch (tipo) {
      case 'creacion':
        return FileText;
      case 'envio':
        return Send;
      case 'aprobacion':
        return CheckCircle;
      case 'rechazo':
        return XCircle;
      default:
        return Clock;
    }
  };
  
  const getColorEvento = (tipo: string) => {
    switch (tipo) {
      case 'creacion':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-300'
        };
      case 'envio':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600',
          border: 'border-blue-300'
        };
      case 'aprobacion':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600',
          border: 'border-green-300'
        };
      case 'rechazo':
        return {
          bg: 'bg-red-100',
          text: 'text-red-600',
          border: 'border-red-300'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-300'
        };
    }
  };
  
  const getTituloEvento = (evento: EventoHistorial) => {
    switch (evento.tipo) {
      case 'creacion':
        return 'PTA Creado';
      case 'envio':
        return 'PTA Enviado a Aprobación';
      case 'aprobacion':
        if (evento.estado === 'APROBADO_FINAL') return 'PTA Aprobado Finalmente';
        if (evento.estado === 'APROBADO_PROGRAMACION') return 'Aprobado por Programación';
        if (evento.estado === 'APROBADO_DIRECTOR') return 'Aprobado por Director';
        return 'PTA Aprobado';
      case 'rechazo':
        if (evento.estado === 'RECHAZADO_PROGRAMACION') return 'Rechazado por Programación';
        if (evento.estado === 'RECHAZADO_DIRECTOR') return 'Rechazado por Director';
        return 'PTA Rechazado';
      default:
        return evento.estado;
    }
  };
  
  if (historial.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay historial disponible</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-600" />
        Historial de Aprobación
      </h3>
      
      <div className="space-y-4">
        {historial.map((evento, index) => {
          const Icono = getIconoEvento(evento.tipo);
          const colores = getColorEvento(evento.tipo);
          
          return (
            <motion.div
              key={evento.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Línea conectora */}
              {index < historial.length - 1 && (
                <div className="absolute left-6 top-14 w-0.5 h-full bg-gray-200 -z-10" />
              )}
              
              <div className="flex gap-4">
                {/* Icono */}
                <div className={`w-12 h-12 rounded-full ${colores.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icono className={`w-6 h-6 ${colores.text}`} />
                </div>
                
                {/* Contenido */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {getTituloEvento(evento)}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{evento.usuario}</span>
                        </div>
                        <span>•</span>
                        <span>{evento.rolUsuario}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`${colores.bg} ${colores.text} border-${colores.border}`}>
                        {evento.estado.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(evento.fecha)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Motivo de rechazo */}
                  {evento.motivoRechazo && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Motivo del Rechazo
                      </p>
                      <p className="text-sm text-red-700">{evento.motivoRechazo}</p>
                    </div>
                  )}
                  
                  {/* Observaciones */}
                  {evento.observaciones && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Observaciones
                      </p>
                      <p className="text-sm text-gray-700">{evento.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Resumen */}
      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {historial.length}
            </p>
            <p className="text-sm text-gray-600">Total de Eventos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {historial.filter(e => e.tipo === 'aprobacion').length}
            </p>
            <p className="text-sm text-gray-600">Aprobaciones</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {historial.filter(e => e.tipo === 'rechazo').length}
            </p>
            <p className="text-sm text-gray-600">Rechazos</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
