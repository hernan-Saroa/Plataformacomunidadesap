/**
 * ============================================
 * TARJETA DE CASO - KANBAN
 * ============================================
 * 
 * Tarjeta arrastrable de caso individual en el Kanban
 * - Información esencial visible
 * - Avatares de responsables y colaboradores
 * - Indicadores de prioridad y plazos
 * - Acciones rápidas
 */

import {
  Clock,
  AlertTriangle,
  Eye,
  MoreVertical,
  Users,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

// ============================================
// TIPOS
// ============================================

interface Caso {
  id: string;
  radicado: string;
  asunto: string;
  prioridad: string;
  responsable: {
    id: string;
    nombre: string;
    iniciales: string;
    color: string;
    rol: string;
  };
  colaboradores?: Array<{
    id: string;
    nombre: string;
    iniciales: string;
    color: string;
  }>;
  fechaVencimiento: Date;
  diasRestantes: number;
  progreso: number;
  etiquetas?: string[];
  comentarios?: number;
  documentos?: number;
}

interface TarjetaCasoKanbanProps {
  caso: Caso;
  onDragStart: (casoId: string) => void;
  onVerDetalle: (caso: Caso) => void;
  onAsignarResponsable: (casoId: string, nuevoResponsableId: string) => void;
  estaArrastrando: boolean;
}

// ============================================
// UTILIDADES
// ============================================

const getPrioridadConfig = (prioridad: string) => {
  const configs = {
    critica: { color: '#DC2626', bg: '#FEF2F2', label: 'Crítica' },
    alta: { color: '#EA580C', bg: '#FFF7ED', label: 'Alta' },
    media: { color: '#F59E0B', bg: '#FFFBEB', label: 'Media' },
    baja: { color: '#10B981', bg: '#F0FDF4', label: 'Baja' },
  };
  return configs[prioridad as keyof typeof configs] || configs.media;
};

const getEstadoVencimiento = (diasRestantes: number) => {
  if (diasRestantes < 0) {
    return {
      color: '#DC2626',
      bg: '#FEF2F2',
      label: `Vencido hace ${Math.abs(diasRestantes)} días`,
      icono: '🚨',
    };
  }
  if (diasRestantes <= 3) {
    return {
      color: '#EA580C',
      bg: '#FFF7ED',
      label: `${diasRestantes} días restantes`,
      icono: '⚠️',
    };
  }
  if (diasRestantes <= 7) {
    return {
      color: '#F59E0B',
      bg: '#FFFBEB',
      label: `${diasRestantes} días restantes`,
      icono: '⏰',
    };
  }
  return {
    color: '#10B981',
    bg: '#F0FDF4',
    label: `${diasRestantes} días restantes`,
    icono: '✓',
  };
};

// ============================================
// COMPONENTE
// ============================================

export function TarjetaCasoKanban({
  caso,
  onDragStart,
  onVerDetalle,
  onAsignarResponsable,
  estaArrastrando,
}: TarjetaCasoKanbanProps) {
  const prioridadConfig = getPrioridadConfig(caso.prioridad);
  const vencimientoConfig = getEstadoVencimiento(caso.diasRestantes);

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(caso.id)}
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-lg group ${
        estaArrastrando ? 'opacity-50 scale-95' : ''
      }`}
    >
      <CardContent className="p-4">
        {/* Header: Radicado y Prioridad */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                {caso.radicado}
              </Badge>
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: prioridadConfig.bg,
                  color: prioridadConfig.color,
                  border: `1px solid ${prioridadConfig.color}20`,
                }}
              >
                {prioridadConfig.label}
              </Badge>
            </div>
          </div>

          {/* Menú de Acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVerDetalle(caso)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="w-4 h-4 mr-2" />
                Reasignar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Asunto */}
        <h4 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2">
          {caso.asunto}
        </h4>

        {/* Alerta de Vencimiento */}
        {caso.diasRestantes <= 7 && (
          <div
            className="flex items-center gap-2 p-2 rounded-lg mb-3 text-xs"
            style={{
              backgroundColor: vencimientoConfig.bg,
              color: vencimientoConfig.color,
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{vencimientoConfig.label}</span>
          </div>
        )}

        {/* Barra de Progreso */}
        {caso.progreso > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progreso</span>
              <span className="font-semibold text-gray-900">{caso.progreso}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${caso.progreso}%` }}
              />
            </div>
          </div>
        )}

        {/* Etiquetas */}
        {caso.etiquetas && caso.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {caso.etiquetas.slice(0, 2).map((etiqueta, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs"
              >
                {etiqueta}
              </Badge>
            ))}
            {caso.etiquetas.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{caso.etiquetas.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Footer: Responsable y Métricas */}
        <div className="flex items-center justify-between pt-3 border-t">
          {/* Responsable */}
          <div className="flex items-center gap-2">
            <Avatar
              className="w-8 h-8"
              style={{ backgroundColor: caso.responsable.color }}
            >
              <AvatarFallback className="text-xs text-white font-medium">
                {caso.responsable.iniciales}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs">
              <div className="font-medium text-gray-900">
                {caso.responsable.nombre}
              </div>
              <div className="text-gray-500">{caso.responsable.rol}</div>
            </div>
          </div>

          {/* Métricas */}
          <div className="flex items-center gap-3 text-gray-500">
            {(caso.comentarios ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">{caso.comentarios}</span>
              </div>
            )}
            {(caso.documentos ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-4 h-4" />
                <span className="text-xs">{caso.documentos}</span>
              </div>
            )}
          </div>
        </div>

        {/* Colaboradores */}
        {caso.colaboradores && caso.colaboradores.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Users className="w-4 h-4 text-gray-400" />
            <div className="flex -space-x-2">
              {caso.colaboradores.slice(0, 3).map((colaborador) => (
                <Avatar
                  key={colaborador.id}
                  className="w-6 h-6 border-2 border-white"
                  style={{ backgroundColor: colaborador.color }}
                >
                  <AvatarFallback className="text-xs text-white">
                    {colaborador.iniciales}
                  </AvatarFallback>
                </Avatar>
              ))}
              {caso.colaboradores.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{caso.colaboradores.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
