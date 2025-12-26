/**
 * ModalComunicaciones - Modal de gestión de comunicaciones del proceso
 * Diseño corporativo ESAP premium - Estilo Microsoft Teams / Slack
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Textarea } from '../../../ui/textarea';
import { 
  MessageSquare, Send, Paperclip, User, Clock,
  CheckCircle, X, Smile, AtSign
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalComunicacionesProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Datos mock de comunicaciones
const comunicacionesMock = [
  {
    id: 1,
    usuario: 'Juan Pérez López',
    rol: 'Abogado Defensor',
    mensaje: 'Se recibió notificación del juzgado con auto admisorio. Procedemos a contestar la demanda en los próximos 10 días según el término legal.',
    fecha: '22/12/2024 14:35',
    avatar: 'JP',
    tipo: 'update'
  },
  {
    id: 2,
    usuario: 'María González',
    rol: 'Coordinadora Jurídica',
    mensaje: '@Juan Pérez ¿Ya revisaste los precedentes jurisprudenciales? Necesitamos incluirlos en la contestación.',
    fecha: '22/12/2024 10:20',
    avatar: 'MG',
    tipo: 'mention'
  },
  {
    id: 3,
    usuario: 'Carlos Ruiz',
    rol: 'Director Jurídico',
    mensaje: 'Aprobada la estrategia de defensa propuesta. Por favor proceder con la contestación y mantenerme informado del avance.',
    fecha: '21/12/2024 16:45',
    avatar: 'CR',
    tipo: 'approval'
  },
  {
    id: 4,
    usuario: 'Sistema SIGL',
    rol: 'Notificación Automática',
    mensaje: '⚠️ ALERTA: Quedan 18 días para vencimiento del término de contestación de la demanda.',
    fecha: '20/12/2024 09:00',
    avatar: 'SI',
    tipo: 'alert'
  },
  {
    id: 5,
    usuario: 'Ana López',
    rol: 'Asistente Jurídica',
    mensaje: 'Adjunto documentación de respaldo para la contestación: certificados laborales, contratos y actos administrativos. Todo listo para revisión.',
    fecha: '19/12/2024 15:30',
    avatar: 'AL',
    tipo: 'attachment'
  }
];

export function ModalComunicaciones({ isOpen, onClose, expediente }: ModalComunicacionesProps) {
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [comunicaciones, setComunicaciones] = useState(comunicacionesMock);
  const [responderA, setResponderA] = useState<number | null>(null);

  const handleEnviarMensaje = () => {
    if (!nuevoMensaje.trim()) {
      toast.error('Escribe un mensaje antes de enviar');
      return;
    }

    const nuevaComunicacion = {
      id: comunicaciones.length + 1,
      usuario: expediente.abogadoAsignado,
      rol: 'Abogado Defensor',
      mensaje: responderA 
        ? `↩️ Respondiendo a ${comunicaciones.find(c => c.id === responderA)?.usuario}: ${nuevoMensaje}`
        : nuevoMensaje,
      fecha: new Date().toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2),
      tipo: 'message',
      respuestaA: responderA
    };

    setComunicaciones([nuevaComunicacion, ...comunicaciones]);
    setNuevoMensaje('');
    setResponderA(null);
    toast.success('Mensaje enviado exitosamente');
  };

  const handleResponder = (idMensaje: number, nombreUsuario: string) => {
    setResponderA(idMensaje);
    setNuevoMensaje(`@${nombreUsuario} `);
    toast.info(`Respondiendo a ${nombreUsuario}`);
  };

  const handleReaccionar = (idMensaje: number) => {
    const reacciones = ['👍', '❤️', '😊', '🎉', '👏'];
    const reaccionAleatoria = reacciones[Math.floor(Math.random() * reacciones.length)];
    toast.success(`Reaccionaste con ${reaccionAleatoria} al mensaje`);
  };

  const handleAdjuntar = () => {
    toast.info('📎 Función de adjuntar archivo - En desarrollo');
  };

  const handleMencionar = () => {
    const usuarios = ['Juan Pérez López', 'María González', 'Carlos Ruiz', 'Ana López'];
    const menuUsuarios = usuarios.map(u => `@${u}`).join(', ');
    toast.info(`Usuarios disponibles: ${menuUsuarios}`, { duration: 5000 });
  };

  const handleEmoji = () => {
    const emojis = ['😊', '👍', '❤️', '🎉', '✅', '⚠️', '📎', '🔔'];
    const emojiAleatorio = emojis[Math.floor(Math.random() * emojis.length)];
    setNuevoMensaje(prev => prev + emojiAleatorio);
    toast.success(`Emoji ${emojiAleatorio} agregado`);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'alert':
        return { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️' };
      case 'approval':
        return { bg: '#D1FAE5', border: '#10B981', icon: '✅' };
      case 'mention':
        return { bg: '#DBEAFE', border: '#3B82F6', icon: '🔔' };
      case 'attachment':
        return { bg: '#E0E7FF', border: '#6366F1', icon: '📎' };
      default:
        return { bg: '#F3F4F6', border: '#D1D5DB', icon: '💬' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header Sticky */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Comunicaciones del Proceso
                  </DialogTitle>
                  <p className="text-sm text-gray-600">{expediente.id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 font-semibold">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {comunicaciones.length} mensajes
                </Badge>
              </div>
            </div>

            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido con scroll - Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {/* Info del expediente */}
          <Card className="p-3 mb-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900">Demandante: {expediente.demandante}</p>
                <p className="text-xs text-blue-700">Profesional: {expediente.abogadoAsignado}</p>
              </div>
            </div>
          </Card>

          {/* Lista de comunicaciones */}
          <div className="space-y-3">
            {comunicaciones.map((com) => {
              const tipoStyle = getTipoColor(com.tipo);
              const esAlerta = com.tipo === 'alert';
              
              return (
                <Card 
                  key={com.id} 
                  className={`p-4 ${esAlerta ? 'shadow-md' : ''}`}
                  style={{ 
                    background: esAlerta ? tipoStyle.bg : '#FFFFFF',
                    border: esAlerta ? `2px solid ${tipoStyle.border}` : '1px solid #E5E7EB'
                  }}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback 
                        className="text-sm font-bold"
                        style={{ 
                          background: esAlerta ? tipoStyle.border : '#E0EDFF', 
                          color: esAlerta ? '#FFFFFF' : '#003DA5' 
                        }}
                      >
                        {com.avatar}
                      </AvatarFallback>
                    </Avatar>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header del mensaje */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{com.usuario}</span>
                          <Badge variant="outline" className="text-xs">
                            {com.rol}
                          </Badge>
                          {com.tipo !== 'message' && (
                            <span className="text-xs">{tipoStyle.icon}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {com.fecha}
                        </span>
                      </div>

                      {/* Mensaje */}
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {com.mensaje}
                      </p>

                      {/* Acciones del mensaje */}
                      {com.tipo !== 'alert' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-xs h-7 px-2 text-gray-600 hover:text-blue-600"
                            onClick={() => handleResponder(com.id, com.usuario)}
                          >
                            💬 Responder
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-xs h-7 px-2 text-gray-600 hover:text-blue-600"
                            onClick={() => handleReaccionar(com.id)}
                          >
                            👍 Reaccionar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Mensaje de inicio */}
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">
              Inicio de las comunicaciones del proceso
            </p>
          </div>
        </div>

        {/* Footer con input de nuevo mensaje */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          {/* Indicador de respuesta activa */}
          {responderA && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-900">
                  Respondiendo a <strong>{comunicaciones.find(c => c.id === responderA)?.usuario}</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setResponderA(null);
                  setNuevoMensaje('');
                  toast.info('Respuesta cancelada');
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Sugerencias rápidas */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-600">Respuestas rápidas:</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-7"
              onClick={() => setNuevoMensaje('Recibido, procederé de inmediato.')}
            >
              ✅ Recibido
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-7"
              onClick={() => setNuevoMensaje('Necesito más información para proceder.')}
            >
              ❓ Más info
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-7"
              onClick={() => setNuevoMensaje('Documento revisado y aprobado.')}
            >
              👍 Aprobado
            </Button>
          </div>

          {/* Input de mensaje */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder="Escribe un mensaje sobre este proceso judicial..."
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviarMensaje();
                  }
                }}
                className="min-h-[60px] resize-none pr-24"
              />
              
              {/* Botones flotantes dentro del textarea */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  title="Adjuntar archivo"
                  onClick={handleAdjuntar}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  title="Mencionar usuario"
                  onClick={handleMencionar}
                >
                  <AtSign className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  title="Emoji"
                  onClick={handleEmoji}
                >
                  <Smile className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleEnviarMensaje}
              disabled={!nuevoMensaje.trim()}
              className="h-[60px] px-6 font-bold"
              style={{ 
                background: nuevoMensaje.trim() ? '#003DA5' : '#E5E7EB', 
                color: nuevoMensaje.trim() ? '#FFFFFF' : '#9CA3AF' 
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 Usa <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> para enviar y <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Shift + Enter</kbd> para nueva línea
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}