/**
 * ============================================
 * WORKFLOW VISUAL CASO
 * ============================================
 * 
 * Visualización del flujo de trabajo de un caso legal
 * con indicadores de progreso, plazos y estado actual
 */

import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';

// ============================================
// TIPOS
// ============================================

type EstadoCaso = 
  | 'inicial' 
  | 'en_revision' 
  | 'asignado' 
  | 'en_proceso' 
  | 'requiere_accion'
  | 'pendiente_aprobacion'
  | 'finalizado'
  | 'archivado';

interface HistorialEtapa {
  etapa: EstadoCaso;
  fechaInicio: Date;
  fechaFin?: Date;
  duracionDias?: number;
  usuario: {
    nombre: string;
    iniciales: string;
    color: string;
  };
  observaciones?: string;
  cumplePlazos?: 'excelente' | 'bueno' | 'aceptable' | 'retrasado';
}

interface WorkflowVisualCasoProps {
  estadoActual: EstadoCaso;
  moduloId: string;
  historial: HistorialEtapa[];
  fechaInicio: Date;
  fechaVencimiento?: Date;
  diasRestantes?: number;
}

// ============================================
// CONFIGURACIÓN DE ESTADOS
// ============================================

const ESTADOS_CONFIG: Record<EstadoCaso, {
  label: string;
  color: string;
  icon: typeof Circle;
  descripcion: string;
}> = {
  inicial: {
    label: 'Inicial',
    color: '#94A3B8',
    icon: Circle,
    descripcion: 'Caso recibido, pendiente de revisión',
  },
  en_revision: {
    label: 'En Revisión',
    color: '#3B82F6',
    icon: Clock,
    descripcion: 'En proceso de análisis inicial',
  },
  asignado: {
    label: 'Asignado',
    color: '#8B5CF6',
    icon: User,
    descripcion: 'Asignado a responsable',
  },
  en_proceso: {
    label: 'En Proceso',
    color: '#F59E0B',
    icon: TrendingUp,
    descripcion: 'En desarrollo activo',
  },
  requiere_accion: {
    label: 'Requiere Acción',
    color: '#EF4444',
    icon: AlertTriangle,
    descripcion: 'Requiere atención inmediata',
  },
  pendiente_aprobacion: {
    label: 'Pendiente Aprobación',
    color: '#F97316',
    icon: Clock,
    descripcion: 'Esperando aprobación',
  },
  finalizado: {
    label: 'Finalizado',
    color: '#10B981',
    icon: CheckCircle2,
    descripcion: 'Caso completado exitosamente',
  },
  archivado: {
    label: 'Archivado',
    color: '#6B7280',
    icon: CheckCircle2,
    descripcion: 'Caso archivado',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function WorkflowVisualCaso({
  estadoActual,
  historial,
  fechaInicio,
  fechaVencimiento,
  diasRestantes,
}: WorkflowVisualCasoProps) {
  
  // Calcular progreso general
  const estadosOrden: EstadoCaso[] = [
    'inicial',
    'en_revision',
    'asignado',
    'en_proceso',
    'pendiente_aprobacion',
    'finalizado',
  ];

  const indiceActual = estadosOrden.indexOf(estadoActual);
  const progreso = indiceActual >= 0 ? ((indiceActual + 1) / estadosOrden.length) * 100 : 0;

  // Calcular duración total
  const duracionTotal = historial.reduce((sum, etapa) => sum + (etapa.duracionDias || 0), 0);

  // Determinar si hay retrasos
  const tieneRetrasos = historial.some(etapa => etapa.cumplePlazos === 'retrasado');

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Estado del Caso</span>
            <Badge 
              style={{ 
                backgroundColor: ESTADOS_CONFIG[estadoActual].color,
                color: 'white',
              }}
            >
              {ESTADOS_CONFIG[estadoActual].label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Progreso */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-600">Progreso General</span>
              <span className="font-medium">{Math.round(progreso)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: ESTADOS_CONFIG[estadoActual].color }}
              />
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-gray-500 mb-1">Fecha Inicio</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {fechaInicio.toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'short' 
                  })}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Duración</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{duracionTotal} días</span>
              </div>
            </div>

            {diasRestantes !== undefined && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Días Restantes</div>
                <div className="flex items-center gap-2">
                  <AlertTriangle 
                    className={`w-4 h-4 ${
                      diasRestantes < 5 ? 'text-red-500' : 
                      diasRestantes < 10 ? 'text-orange-500' : 
                      'text-green-500'
                    }`} 
                  />
                  <span className={`text-sm font-medium ${
                    diasRestantes < 5 ? 'text-red-600' : 
                    diasRestantes < 10 ? 'text-orange-600' : 
                    'text-green-600'
                  }`}>
                    {diasRestantes} días
                  </span>
                </div>
              </div>
            )}
          </div>

          {tieneRetrasos && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-900 text-sm">
                  Atención: Retrasos Detectados
                </div>
                <div className="text-red-700 text-xs mt-1">
                  Algunas etapas han excedido los plazos establecidos
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline de Etapas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Etapas */}
            <div className="space-y-6">
              {historial.map((etapa, index) => {
                const config = ESTADOS_CONFIG[etapa.etapa];
                const Icon = config.icon;
                const esFinalizada = !!etapa.fechaFin;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-12"
                  >
                    {/* Icono */}
                    <div
                      className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white"
                      style={{ 
                        borderColor: config.color,
                        color: config.color,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Contenido */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {config.label}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {config.descripcion}
                          </p>
                        </div>
                        
                        {etapa.cumplePlazos && (
                          <Badge
                            variant={
                              etapa.cumplePlazos === 'excelente' || etapa.cumplePlazos === 'bueno' 
                                ? 'default' 
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {etapa.cumplePlazos === 'excelente' && '⭐ Excelente'}
                            {etapa.cumplePlazos === 'bueno' && '✓ Bueno'}
                            {etapa.cumplePlazos === 'aceptable' && '⚠ Aceptable'}
                            {etapa.cumplePlazos === 'retrasado' && '❌ Retrasado'}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Inicio:</span>
                          <span className="ml-2 font-medium">
                            {etapa.fechaInicio.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {etapa.fechaFin && (
                          <div>
                            <span className="text-gray-500">Fin:</span>
                            <span className="ml-2 font-medium">
                              {etapa.fechaFin.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}

                        {etapa.duracionDias !== undefined && (
                          <div>
                            <span className="text-gray-500">Duración:</span>
                            <span className="ml-2 font-medium">
                              {etapa.duracionDias} {etapa.duracionDias === 1 ? 'día' : 'días'}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-gray-500">Responsable:</span>
                          <span className="ml-2 font-medium">
                            {etapa.usuario.nombre}
                          </span>
                        </div>
                      </div>

                      {etapa.observaciones && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600 italic">
                            {etapa.observaciones}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
