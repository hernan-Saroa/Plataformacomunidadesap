/**
 * ModalComentariosOrgano - Gestión de comentarios y actuaciones
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Textarea } from '../../../ui/textarea';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import {
  MessageSquare, X, Send, Paperclip, AlertCircle, CheckCircle,
  Clock, User, TrendingUp, Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Comentario {
  id: string;
  usuario: string;
  cargo: string;
  contenido: string;
  fecha: Date;
  tipo: 'actuacion' | 'comentario' | 'alerta';
}

interface ModalComentariosOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
}

export function ModalComentariosOrgano({
  isOpen,
  onClose,
  requerimientoId
}: ModalComentariosOrganoProps) {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoComentario, setTipoComentario] = useState<'actuacion' | 'comentario' | 'alerta'>('comentario');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Mock data de comentarios
  const comentariosMock: Comentario[] = [
    {
      id: 'com-001',
      usuario: 'Dra. María Fernández',
      cargo: 'Jefa Área Jurídica',
      contenido: 'Requerimiento recibido y revisado. Se solicita información a las áreas de Contratación y Financiera para consolidar respuesta.',
      fecha: new Date('2024-12-11T09:30:00'),
      tipo: 'actuacion'
    },
    {
      id: 'com-002',
      usuario: 'Área de Contratación',
      cargo: 'Coordinador',
      contenido: 'Se envía certificación de contratos suscritos en 2024. Total: 45 contratos por valor de $2.300 millones. Adjunto Excel consolidado.',
      fecha: new Date('2024-12-12T14:15:00'),
      tipo: 'comentario'
    },
    {
      id: 'com-003',
      usuario: 'Área Financiera',
      cargo: 'Contador',
      contenido: 'Se remite certificación presupuestal del cuarto trimestre 2024. Todos los compromisos están debidamente respaldados presupuestalmente.',
      fecha: new Date('2024-12-13T10:45:00'),
      tipo: 'comentario'
    },
    {
      id: 'com-004',
      usuario: 'Sistema SIGL',
      cargo: 'Automatización',
      contenido: '⚠️ ALERTA: Quedan 5 días hábiles para vencimiento del término legal de respuesta. Se recomienda priorizar este requerimiento.',
      fecha: new Date('2024-12-15T08:00:00'),
      tipo: 'alerta'
    },
    {
      id: 'com-005',
      usuario: 'Dra. María Fernández',
      cargo: 'Jefa Área Jurídica',
      contenido: 'Información consolidada. Se inicia redacción de proyecto de respuesta. Fecha estimada de finalización: 18 de diciembre.',
      fecha: new Date('2024-12-15T16:30:00'),
      tipo: 'actuacion'
    },
    {
      id: 'com-006',
      usuario: 'Dr. Carlos Méndez',
      cargo: 'Asesor Jurídico',
      contenido: 'Revisé el proyecto de respuesta. Incluye toda la información solicitada y está técnicamente bien fundamentado. Listo para firma del Director Jurídico.',
      fecha: new Date('2024-12-16T11:20:00'),
      tipo: 'comentario'
    }
  ];

  // Filtrar comentarios
  const comentariosFiltrados = filtroTipo === 'todos' 
    ? comentariosMock 
    : comentariosMock.filter(c => c.tipo === filtroTipo);

  const getTipoConfig = (tipo: string) => {
    switch(tipo) {
      case 'actuacion':
        return { 
          icon: <CheckCircle className="w-4 h-4" />, 
          color: '#10B981', 
          bg: '#D1FAE5', 
          label: 'Actuación' 
        };
      case 'alerta':
        return { 
          icon: <AlertCircle className="w-4 h-4" />, 
          color: '#F59E0B', 
          bg: '#FEF3C7', 
          label: 'Alerta' 
        };
      default:
        return { 
          icon: <MessageSquare className="w-4 h-4" />, 
          color: '#3B82F6', 
          bg: '#DBEAFE', 
          label: 'Comentario' 
        };
    }
  };

  const handleEnviarComentario = () => {
    if (!nuevoComentario.trim()) {
      toast.error('Comentario vacío', {
        description: 'Debe escribir un comentario',
        icon: <AlertCircle className="w-4 h-4" />
      });
      return;
    }

    toast.success('Comentario agregado', {
      description: 'El comentario ha sido registrado en el expediente',
      icon: <MessageSquare className="w-4 h-4" />
    });

    setNuevoComentario('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[750px] lg:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          Comentarios y Actuaciones del Requerimiento {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Historial de comentarios, actuaciones y alertas del requerimiento {requerimientoId} con toda la trazabilidad de las gestiones realizadas.
        </DialogDescription>
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Comentarios y Actuaciones</h2>
              <p className="text-sm text-gray-600">{requerimientoId} • {comentariosFiltrados.length} registros</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          
          {/* INFORMACIÓN */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">💡 Sobre los Comentarios:</p>
                <p className="text-xs text-blue-700">
                  Este espacio registra TODA la trazabilidad del requerimiento: actuaciones formales, comentarios de coordinación, 
                  alertas automáticas y notas internas. Todo queda documentado en el historial del expediente.
                </p>
              </div>
            </div>
          </div>

          {/* AGREGAR NUEVO COMENTARIO */}
          <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-gray-900 flex-1">✍️ Agregar Comentario o Actuación</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={tipoComentario === 'comentario' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('comentario')}
                  className="text-xs"
                >
                  💬 Comentario
                </Button>
                <Button
                  variant={tipoComentario === 'actuacion' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('actuacion')}
                  className="text-xs"
                  style={tipoComentario === 'actuacion' ? { background: '#10B981' } : {}}
                >
                  ✅ Actuación
                </Button>
                <Button
                  variant={tipoComentario === 'alerta' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoComentario('alerta')}
                  className="text-xs"
                  style={tipoComentario === 'alerta' ? { background: '#F59E0B' } : {}}
                >
                  ⚠️ Alerta
                </Button>
              </div>
            </div>
            
            <Textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder={
                tipoComentario === 'actuacion' 
                  ? 'Describe la actuación realizada (Ej: "Se solicitó información al área de contratación")' 
                  : tipoComentario === 'alerta'
                  ? 'Describe la alerta o advertencia (Ej: "Se requiere coordinación urgente con el área financiera")'
                  : 'Escribe tu comentario o nota interna sobre el requerimiento...'
              }
              rows={4}
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {nuevoComentario.length} caracteres
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Función de adjuntar archivo')}
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  Adjuntar
                </Button>
                <Button
                  onClick={handleEnviarComentario}
                  size="sm"
                  style={{ background: '#003DA5' }}
                  className="text-white"
                  disabled={!nuevoComentario.trim()}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Publicar {tipoComentario === 'actuacion' ? 'Actuación' : tipoComentario === 'alerta' ? 'Alerta' : 'Comentario'}
                </Button>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-bold text-gray-900">Filtrar por tipo:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filtroTipo === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('todos')}
                className="text-xs"
              >
                Todos ({comentariosMock.length})
              </Button>
              <Button
                variant={filtroTipo === 'actuacion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('actuacion')}
                className="text-xs"
                style={filtroTipo === 'actuacion' ? { background: '#10B981' } : {}}
              >
                ✅ Actuaciones ({comentariosMock.filter(c => c.tipo === 'actuacion').length})
              </Button>
              <Button
                variant={filtroTipo === 'comentario' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('comentario')}
                className="text-xs"
              >
                💬 Comentarios ({comentariosMock.filter(c => c.tipo === 'comentario').length})
              </Button>
              <Button
                variant={filtroTipo === 'alerta' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('alerta')}
                className="text-xs"
                style={filtroTipo === 'alerta' ? { background: '#F59E0B' } : {}}
              >
                ⚠️ Alertas ({comentariosMock.filter(c => c.tipo === 'alerta').length})
              </Button>
            </div>
          </div>

          {/* TIMELINE DE COMENTARIOS */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              Historial ({comentariosFiltrados.length})
            </h3>

            {comentariosFiltrados.length > 0 ? (
              <div className="space-y-3">
                {comentariosFiltrados.map((comentario, idx) => {
                  const config = getTipoConfig(comentario.tipo);
                  return (
                    <div key={comentario.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md"
                          style={{ backgroundColor: config.bg }}
                        >
                          <div style={{ color: config.color }}>
                            {config.icon}
                          </div>
                        </div>
                        {idx < comentariosFiltrados.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-gray-300 mt-2" />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <div 
                          className="p-4 rounded-lg border-2"
                          style={{ 
                            backgroundColor: config.bg,
                            borderColor: config.color 
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback 
                                  className="text-xs font-bold"
                                  style={{ backgroundColor: config.color, color: '#FFFFFF' }}
                                >
                                  {comentario.usuario.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{comentario.usuario}</p>
                                <p className="text-xs text-gray-600">{comentario.cargo}</p>
                              </div>
                            </div>
                            <Badge 
                              className="text-xs"
                              style={{ backgroundColor: config.color, color: '#FFFFFF' }}
                            >
                              {config.label}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-800 mb-2">{comentario.contenido}</p>

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>
                              {comentario.fecha.toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                              {' '}a las{' '}
                              {comentario.fecha.toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">No hay comentarios de este tipo</p>
                <p className="text-xs text-gray-500 mt-1">
                  Cambia el filtro para ver otros tipos de registros
                </p>
              </div>
            )}
          </div>

          {/* ESTADÍSTICAS */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-900">
                {comentariosMock.filter(c => c.tipo === 'actuacion').length}
              </p>
              <p className="text-xs text-green-700">Actuaciones</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <MessageSquare className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-900">
                {comentariosMock.filter(c => c.tipo === 'comentario').length}
              </p>
              <p className="text-xs text-blue-700">Comentarios</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-900">
                {comentariosMock.filter(c => c.tipo === 'alerta').length}
              </p>
              <p className="text-xs text-yellow-700">Alertas</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => toast.info('Exportando historial...')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Exportar Historial
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}