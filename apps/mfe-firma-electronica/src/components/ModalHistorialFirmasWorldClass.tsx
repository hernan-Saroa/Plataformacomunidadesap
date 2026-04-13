/**
 * ModalHistorialFirmasWorldClass - Modal World-Class de Historial
 * Diseño premium tipo Comunicaciones del Proceso
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  X, History, CheckCircle, Clock, User, Calendar, Download, FileText,
  Share2, Upload, Eye, AlertCircle, Mail, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ModalHistorialFirmasWorldClassProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
}

// Función auxiliar para obtener iniciales
const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Función para obtener color del avatar basado en el nombre
const getAvatarColor = (name: string): string => {
  const colors = [
    '#003DA5', // Azul ESAP
    '#1e5da8', // Azul medio
    '#2a6dbd', // Azul claro
    '#F57C00', // Naranja
    '#10B981', // Verde
    '#8B5CF6', // Púrpura
    '#EC4899', // Rosa
    '#06B6D4', // Cyan
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ModalHistorialFirmasWorldClass({ isOpen, onClose, documento }: ModalHistorialFirmasWorldClassProps) {
  const handleDescargarHistorial = () => {
    toast.loading('📥 Generando reporte de historial...', {
      id: 'descargar-historial',
      duration: 2000
    });

    setTimeout(() => {
      toast.success('✅ Reporte descargado', {
        id: 'descargar-historial',
        description: `Historial_${documento.id}.pdf descargado exitosamente`,
        duration: 3000
      });
    }, 2000);
  };

  const getEventoConfig = (accion: string) => {
    if (accion.toLowerCase().includes('firmado') || accion.toLowerCase().includes('firma')) {
      return {
        icon: CheckCircle,
        bg: 'bg-green-50',
        border: 'border-green-200',
        iconColor: 'text-green-600',
        badge: 'bg-green-100 text-green-700',
        label: 'Firmado'
      };
    }
    if (accion.toLowerCase().includes('compartido') || accion.toLowerCase().includes('envio')) {
      return {
        icon: Share2,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconColor: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
        label: 'Compartido'
      };
    }
    if (accion.toLowerCase().includes('cargado') || accion.toLowerCase().includes('subido')) {
      return {
        icon: Upload,
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        iconColor: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-700',
        label: 'Cargado'
      };
    }
    if (accion.toLowerCase().includes('visualizado') || accion.toLowerCase().includes('visto')) {
      return {
        icon: Eye,
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconColor: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-700',
        label: 'Visualizado'
      };
    }
    return {
      icon: FileText,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      iconColor: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-700',
      label: 'Evento'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Historial completo de firmas y trazabilidad del documento {documento.nombre}
        </DialogDescription>

        {/* Header Premium - Estilo Comunicaciones */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <History className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Historial de Firmas
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  {documento.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarHistorial}
                size="sm"
                variant="outline"
                className="font-medium"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info del Documento */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-white border border-blue-200">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900 mb-1">
                {documento.nombre}
              </h3>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-semibold text-gray-900">{documento.tipo}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600">Tamaño:</span>
                  <span className="font-semibold text-gray-900">{documento.tamaño}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600">Cargado:</span>
                  <span className="font-semibold text-gray-900">{documento.fechaCarga}</span>
                </div>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700 font-bold">
              {documento.historial.length} eventos
            </Badge>
          </div>
        </div>

        {/* Contenido Scrollable - Timeline Estilo Comunicaciones */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {documento.historial.map((evento: any, idx: number) => {
              const config = getEventoConfig(evento.accion);
              const IconoEvento = config.icon;
              const initials = getInitials(evento.usuario);
              const avatarColor = getAvatarColor(evento.usuario);
              const isLast = idx === documento.historial.length - 1;

              return (
                <div key={idx} className="relative">
                  {/* Línea conectora */}
                  {!isLast && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}

                  {/* Card del Evento - Estilo Comunicaciones */}
                  <div className={`relative flex gap-3 group`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative z-10">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-sm"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <Card className={`border-2 ${config.border} ${config.bg} hover:shadow-md transition-all`}>
                        <div className="p-4">
                          {/* Header del Evento */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${config.badge} font-bold text-xs`}>
                                {config.label.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {evento.fecha} • {evento.hora}
                              </span>
                            </div>
                            <div className={`p-1.5 rounded ${config.bg}`}>
                              <IconoEvento className={`w-3.5 h-3.5 ${config.iconColor}`} />
                            </div>
                          </div>

                          {/* Usuario */}
                          <div className="mb-2">
                            <p className="font-bold text-sm text-gray-900">{evento.usuario}</p>
                          </div>

                          {/* Acción */}
                          <div className="text-sm text-gray-700">
                            <p>{evento.accion}</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mensaje de Fin del Historial */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Inicio del historial
            </div>
          </div>
        </div>

        {/* Footer con Estadísticas */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-600">Total eventos:</span>
                <span className="font-bold text-gray-900 ml-2">{documento.historial.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Firmantes:</span>
                <span className="font-bold text-gray-900 ml-2">
                  {documento.firmasCompletadas}/{documento.firmasRequeridas}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <Badge className="ml-2 bg-blue-100 text-blue-700 font-bold">
                  {documento.estado === 'firmado' ? 'Completado' : 
                   documento.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                </Badge>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="font-medium"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
