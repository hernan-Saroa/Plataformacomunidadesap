/**
 * ============================================
 * TIMELINE ACTIVIDAD
 * ============================================
 * 
 * Visualización cronológica de actividades de un caso
 */

import { motion } from 'motion/react';
import { 
  FileText, 
  MessageSquare, 
  UserPlus, 
  AlertCircle,
  CheckCircle,
  Upload,
  Download,
  Clock,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';

// ============================================
// TIPOS
// ============================================

export interface Actividad {
  id: string;
  tipo: 'comentario' | 'documento' | 'asignacion' | 'cambio_estado' | 'accion' | 'edicion';
  titulo: string;
  descripcion?: string;
  usuario: {
    nombre: string;
    iniciales: string;
    color: string;
  };
  fecha: Date;
  metadata?: {
    documentoNombre?: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
    responsableAnterior?: string;
    responsableNuevo?: string;
    [key: string]: any;
  };
}

interface TimelineActividadProps {
  actividades: Actividad[];
  mostrarTodo?: boolean;
  limite?: number;
}

// ============================================
// CONFIGURACIÓN DE TIPOS DE ACTIVIDAD
// ============================================

const TIPOS_ACTIVIDAD = {
  comentario: {
    icon: MessageSquare,
    color: '#3B82F6',
    label: 'Comentario',
  },
  documento: {
    icon: FileText,
    color: '#10B981',
    label: 'Documento',
  },
  asignacion: {
    icon: UserPlus,
    color: '#8B5CF6',
    label: 'Asignación',
  },
  cambio_estado: {
    icon: AlertCircle,
    color: '#F59E0B',
    label: 'Cambio de Estado',
  },
  accion: {
    icon: CheckCircle,
    color: '#10B981',
    label: 'Acción',
  },
  edicion: {
    icon: Edit,
    color: '#6B7280',
    label: 'Edición',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function TimelineActividad({
  actividades,
  mostrarTodo = false,
  limite = 10,
}: TimelineActividadProps) {
  const actividadesMostrar = mostrarTodo 
    ? actividades 
    : actividades.slice(0, limite);

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Línea vertical del timeline */}
        <div className="absolute left-[19px] top-6 bottom-0 w-0.5 bg-gray-200" />

        {/* Actividades */}
        <div className="space-y-6">
          {actividadesMostrar.map((actividad, index) => {
            const config = TIPOS_ACTIVIDAD[actividad.tipo];
            const Icon = config.icon;

            return (
              <motion.div
                key={actividad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="flex gap-4">
                  {/* Icono y Avatar */}
                  <div className="flex-shrink-0 relative">
                    <Avatar className="w-10 h-10 border-2 border-white">
                      <AvatarFallback 
                        style={{ backgroundColor: actividad.usuario.color }}
                        className="text-white text-xs font-medium"
                      >
                        {actividad.usuario.iniciales}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Icono de tipo en la esquina */}
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {actividad.titulo}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600">
                                {actividad.usuario.nombre}
                              </span>
                              <span className="text-gray-400">•</span>
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatearFechaRelativa(actividad.fecha)}
                          </div>
                        </div>

                        {/* Descripción */}
                        {actividad.descripcion && (
                          <p className="text-sm text-gray-600 mt-2">
                            {actividad.descripcion}
                          </p>
                        )}

                        {/* Metadata específica por tipo */}
                        {actividad.metadata && (
                          <div className="mt-3 pt-3 border-t">
                            {renderMetadata(actividad.tipo, actividad.metadata)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {!mostrarTodo && actividades.length > limite && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Mostrando {limite} de {actividades.length} actividades
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function formatearFechaRelativa(fecha: Date): string {
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  if (diffDias < 7) return `Hace ${diffDias}d`;
  
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderMetadata(tipo: string, metadata: any) {
  switch (tipo) {
    case 'documento':
      return (
        <div className="flex items-center gap-3 text-sm">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700">
            {metadata.documentoNombre || 'Documento adjunto'}
          </span>
          {metadata.tamanio && (
            <span className="text-gray-500">({metadata.tamanio})</span>
          )}
        </div>
      );

    case 'cambio_estado':
      return (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">
            {metadata.estadoAnterior || 'Estado anterior'}
          </Badge>
          <span className="text-gray-400">→</span>
          <Badge variant="outline" className="text-xs">
            {metadata.estadoNuevo || 'Estado nuevo'}
          </Badge>
        </div>
      );

    case 'asignacion':
      return (
        <div className="text-sm text-gray-600">
          {metadata.responsableAnterior && (
            <span>
              De: <strong>{metadata.responsableAnterior}</strong>
              {' → '}
            </span>
          )}
          A: <strong>{metadata.responsableNuevo || 'Nuevo responsable'}</strong>
        </div>
      );

    default:
      return null;
  }
}

// ============================================
// GENERADOR DE DATOS MOCK
// ============================================

export function generarActividadesMock(): Actividad[] {
  const ahora = new Date();
  
  return [
    {
      id: 'A001',
      tipo: 'cambio_estado',
      titulo: 'Caso movido a "En Proceso"',
      descripcion: 'El caso ha sido actualizado y se ha iniciado el trabajo activo.',
      usuario: {
        nombre: 'Luis Rodríguez',
        iniciales: 'LR',
        color: '#4A90E2',
      },
      fecha: new Date(ahora.getTime() - 2 * 60 * 60 * 1000), // Hace 2 horas
      metadata: {
        estadoAnterior: 'Asignado',
        estadoNuevo: 'En Proceso',
      },
    },
    {
      id: 'A002',
      tipo: 'documento',
      titulo: 'Documento cargado',
      descripcion: 'Se ha adjuntado el escrito de respuesta a la demanda.',
      usuario: {
        nombre: 'Luis Rodríguez',
        iniciales: 'LR',
        color: '#4A90E2',
      },
      fecha: new Date(ahora.getTime() - 5 * 60 * 60 * 1000), // Hace 5 horas
      metadata: {
        documentoNombre: 'Escrito_Respuesta_Demanda.pdf',
        tamanio: '2.4 MB',
      },
    },
    {
      id: 'A003',
      tipo: 'comentario',
      titulo: 'Nuevo comentario',
      descripcion: 'Se requiere analizar jurisprudencia adicional sobre el derecho a la educación en instituciones públicas.',
      usuario: {
        nombre: 'María García',
        iniciales: 'MG',
        color: '#E24A90',
      },
      fecha: new Date(ahora.getTime() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
    },
    {
      id: 'A004',
      tipo: 'asignacion',
      titulo: 'Caso reasignado',
      descripcion: 'El caso ha sido reasignado por cambio de responsabilidades.',
      usuario: {
        nombre: 'Ana Martínez',
        iniciales: 'AM',
        color: '#E2904A',
      },
      fecha: new Date(ahora.getTime() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
      metadata: {
        responsableAnterior: 'Carlos Méndez',
        responsableNuevo: 'Luis Rodríguez',
      },
    },
    {
      id: 'A005',
      tipo: 'accion',
      titulo: 'Reunión con el demandante',
      descripcion: 'Se llevó a cabo reunión para recopilar información adicional sobre el caso.',
      usuario: {
        nombre: 'Luis Rodríguez',
        iniciales: 'LR',
        color: '#4A90E2',
      },
      fecha: new Date(ahora.getTime() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
    },
    {
      id: 'A006',
      tipo: 'documento',
      titulo: 'Documento cargado',
      descripcion: 'Pruebas documentales aportadas por el demandante.',
      usuario: {
        nombre: 'Pedro Sánchez',
        iniciales: 'PS',
        color: '#20B2AA',
      },
      fecha: new Date(ahora.getTime() - 4 * 24 * 60 * 60 * 1000), // Hace 4 días
      metadata: {
        documentoNombre: 'Pruebas_Documentales.zip',
        tamanio: '8.7 MB',
      },
    },
    {
      id: 'A007',
      tipo: 'cambio_estado',
      titulo: 'Caso asignado',
      descripcion: 'El caso ha sido asignado al abogado responsable.',
      usuario: {
        nombre: 'Ana Martínez',
        iniciales: 'AM',
        color: '#E2904A',
      },
      fecha: new Date(ahora.getTime() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
      metadata: {
        estadoAnterior: 'En Revisión',
        estadoNuevo: 'Asignado',
      },
    },
    {
      id: 'A008',
      tipo: 'comentario',
      titulo: 'Caso recibido',
      descripcion: 'Se ha registrado el caso en el sistema y se procederá con la revisión inicial.',
      usuario: {
        nombre: 'Pedro Sánchez',
        iniciales: 'PS',
        color: '#20B2AA',
      },
      fecha: new Date(ahora.getTime() - 6 * 24 * 60 * 60 * 1000), // Hace 6 días
    },
  ];
}
