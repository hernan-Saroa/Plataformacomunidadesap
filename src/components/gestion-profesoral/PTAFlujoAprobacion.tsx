/**
 * FLUJO DE APROBACIÓN DEL PTA
 * 
 * Componente visual que muestra el estado del PTA en el flujo de aprobación
 * Multinivel: Docente → Director → Programación → Final
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { motion } from 'motion/react';
import {
  User,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  FileText,
  Calendar,
  AlertCircle,
  Bell
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { usePTANotificationsSender } from '../../hooks/usePTANotifications';

interface PTAFlujoAprobacionProps {
  pta: any;
  mostrarDetalle?: boolean;
}

export function PTAFlujoAprobacion({ pta, mostrarDetalle = true }: PTAFlujoAprobacionProps) {
  
  const estado = pta.estado || 'CONSTRUCCION';
  
  // Configuración de los niveles de aprobación
  const niveles = [
    {
      id: 'construccion',
      nombre: 'Construcción',
      nombreCorto: 'Docente',
      icon: User,
      estados: ['CONSTRUCCION'],
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300'
    },
    {
      id: 'enviado',
      nombre: 'Enviado a Aprobación',
      nombreCorto: 'Enviado',
      icon: FileText,
      estados: ['EN_APROBACION'],
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300'
    },
    {
      id: 'director',
      nombre: 'Aprobación Director',
      nombreCorto: 'Director',
      icon: UserCheck,
      estados: ['APROBADO_DIRECTOR', 'RECHAZADO_DIRECTOR'],
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-300'
    },
    {
      id: 'programacion',
      nombre: 'Aprobación Programación',
      nombreCorto: 'Programación',
      icon: CheckCircle,
      estados: ['APROBADO_PROGRAMACION', 'RECHAZADO_PROGRAMACION'],
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300'
    },
    {
      id: 'final',
      nombre: 'PTA Aprobado',
      nombreCorto: 'Aprobado',
      icon: CheckCircle,
      estados: ['APROBADO_FINAL'],
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300'
    }
  ];
  
  // Determinar el nivel actual
  const getNivelActual = () => {
    const nivel = niveles.find(n => n.estados.includes(estado));
    return nivel ? niveles.indexOf(nivel) : 0;
  };
  
  const nivelActual = getNivelActual();
  
  // Determinar si un nivel está completado, activo o pendiente
  const getEstadoNivel = (index: number) => {
    if (index < nivelActual) return 'completado';
    if (index === nivelActual) {
      if (estado.includes('RECHAZADO')) return 'rechazado';
      return 'activo';
    }
    return 'pendiente';
  };
  
  // Obtener información de fechas
  const getFechaEstado = () => {
    if (estado === 'CONSTRUCCION') return pta.fecha_creacion;
    if (estado === 'EN_APROBACION') return pta.fecha_envio_aprobacion;
    if (estado === 'APROBADO_DIRECTOR') return pta.fecha_aprobacion_director;
    if (estado === 'RECHAZADO_DIRECTOR') return pta.fecha_rechazo_director;
    if (estado === 'APROBADO_PROGRAMACION') return pta.fecha_aprobacion_programacion;
    if (estado === 'RECHAZADO_PROGRAMACION') return pta.fecha_rechazo_programacion;
    if (estado === 'APROBADO_FINAL') return pta.fecha_aprobacion_final;
    return null;
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Vista compacta - Barra de progreso */}
      <div className="flex items-center gap-2">
        {niveles.map((nivel, index) => {
          const Icon = nivel.icon;
          const estadoNivel = getEstadoNivel(index);
          
          return (
            <div key={nivel.id} className="flex items-center flex-1">
              {/* Paso */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    estadoNivel === 'completado'
                      ? 'bg-green-600 text-white'
                      : estadoNivel === 'activo'
                      ? `${nivel.bgColor} ${nivel.color} ring-2 ring-offset-2 ${nivel.borderColor}`
                      : estadoNivel === 'rechazado'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {estadoNivel === 'completado' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : estadoNivel === 'rechazado' ? (
                    <XCircle className="w-5 h-5" />
                  ) : estadoNivel === 'activo' ? (
                    <Icon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <p className="text-xs mt-1 text-center text-gray-600 font-medium">
                  {nivel.nombreCorto}
                </p>
              </div>
              
              {/* Conector */}
              {index < niveles.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 -mt-6">
                  <div
                    className={`h-full transition-all ${
                      estadoNivel === 'completado'
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Detalle del estado actual */}
      {mostrarDetalle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 ${
            estado.includes('RECHAZADO')
              ? 'bg-red-50 border-red-500'
              : estado === 'APROBADO_FINAL'
              ? 'bg-green-50 border-green-500'
              : estado === 'CONSTRUCCION'
              ? 'bg-gray-50 border-gray-400'
              : 'bg-blue-50 border-blue-500'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={
                    estado.includes('RECHAZADO')
                      ? 'bg-red-600'
                      : estado === 'APROBADO_FINAL'
                      ? 'bg-green-600'
                      : estado === 'CONSTRUCCION'
                      ? 'bg-gray-600'
                      : 'bg-blue-600'
                  }
                >
                  {estado.replace('_', ' ')}
                </Badge>
                {estado === 'EN_APROBACION' && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendiente
                  </Badge>
                )}
              </div>
              
              <h4 className="font-bold text-gray-900 mb-1">
                {niveles[nivelActual]?.nombre || 'Estado Desconocido'}
              </h4>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(getFechaEstado())}</span>
                </div>
                
                {estado === 'EN_APROBACION' && pta.aprobador_actual && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Revisor: {pta.aprobador_actual}</span>
                  </div>
                )}
              </div>
              
              {/* Observaciones */}
              {(pta.observaciones_director || pta.observaciones_programacion) && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Observaciones:</p>
                      <p className="text-sm text-gray-700">
                        {pta.observaciones_director || pta.observaciones_programacion}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Información de rechazo */}
      {estado.includes('RECHAZADO') && pta.motivo_rechazo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-red-900 mb-1">PTA Rechazado</h4>
              <p className="text-sm text-red-700 mb-2">{pta.motivo_rechazo}</p>
              {pta.rechazado_por && (
                <p className="text-xs text-red-600">
                  Rechazado por: {pta.rechazado_por} • {formatDate(getFechaEstado())}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Mensaje de éxito */}
      {estado === 'APROBADO_FINAL' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-green-900 mb-1">¡PTA Aprobado!</h4>
              <p className="text-sm text-green-700">
                El Plan de Trabajo Académico ha sido aprobado por todas las instancias.
              </p>
              {pta.fecha_aprobacion_final && (
                <p className="text-xs text-green-600 mt-2">
                  Aprobación final: {formatDate(pta.fecha_aprobacion_final)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}