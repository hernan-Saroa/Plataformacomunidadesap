/**
 * ModalComunicaciones - Modal de gestión de comunicaciones del proceso
 * Diseño corporativo ESAP premium - Estilo Microsoft Teams / Slack
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Textarea } from '../../../ui/textarea';
import {
  MessageSquare, Send, User, Clock,
  CheckCircle, X, Trash2
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner';

interface ModalComunicacionesProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Datos mock de comunicaciones (REDUCIDOS)
const comunicacionesMock = [
  {
    id: 1,
    usuario: 'Usuario Ejemplo',
    rol: 'Abogado',
    mensaje: 'Mensaje de ejemplo para referencia',
    fecha: '22/12/2024 14:35',
    avatar: 'UE',
    tipo: 'update'
  },
];

export function ModalComunicaciones({ isOpen, onClose, expediente }: ModalComunicacionesProps) {
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [comunicaciones, setComunicaciones] = useState<any[]>([]);
  const [responderA, setResponderA] = useState<number | null>(null);

  const handleEnviarMensaje = () => {
    if (!nuevoMensaje.trim()) {
      toast.error('Escribe un mensaje antes de enviar');
      return;
    }

    const nuevaComunicacion = {
      id: Date.now(),
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
    const mensaje = comunicaciones.find(c => c.id === idMensaje);

    setResponderA(idMensaje);
    setNuevoMensaje(`@${nombreUsuario} `);

    // Scroll al input de mensaje
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    toast.info('💬 Modo respuesta activado', {
      description: `Respondiendo a: ${nombreUsuario}`,
      duration: 3000
    });

    // Toast adicional con contexto
    setTimeout(() => {
      toast.info('💡 Consejo', {
        description: 'Tu respuesta se vinculará al mensaje original',
        duration: 2500
      });
    }, 800);
  };

  const handleReaccionar = (idMensaje: number) => {
    const reaccionesDisponibles = [
      { emoji: '👍', nombre: 'Me gusta', color: '#3B82F6' },
      { emoji: '❤️', nombre: 'Me encanta', color: '#EF4444' },
      { emoji: '😊', nombre: 'Positivo', color: '#F59E0B' },
      { emoji: '🎉', nombre: 'Excelente', color: '#8B5CF6' },
      { emoji: '👏', nombre: 'Bien hecho', color: '#10B981' },
      { emoji: '✅', nombre: 'De acuerdo', color: '#059669' },
      { emoji: '⚠️', nombre: 'Importante', color: '#F59E0B' },
      { emoji: '🔔', nombre: 'Atención', color: '#6366F1' }
    ];

    const reaccionSeleccionada = reaccionesDisponibles[Math.floor(Math.random() * reaccionesDisponibles.length)];
    const mensaje = comunicaciones.find(c => c.id === idMensaje);

    // Actualizar el mensaje con la reacción (simulado)
    toast.success(`${reaccionSeleccionada.emoji} Reacción registrada`, {
      description: `"${reaccionSeleccionada.nombre}" al mensaje de ${mensaje?.usuario}`,
      duration: 3000
    });

    // Toast adicional mostrando el conteo
    setTimeout(() => {
      const conteoAleatorio = Math.floor(Math.random() * 5) + 1;
      toast.info('📊 Reacciones del mensaje', {
        description: `${conteoAleatorio} persona(s) reaccionaron a este mensaje`,
        duration: 2500
      });
    }, 1000);
  };

  const handleEliminarComentario = (idMensaje: number) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    setComunicaciones(prev => prev.filter(c => c.id !== idMensaje));
    toast.success('Comentario eliminado');
  };

  const handleAdjuntar = () => {
    toast.info('📎 Abriendo selector de archivos...', {
      description: 'Puedes adjuntar documentos legales al mensaje',
      duration: 2000
    });

    // Crear input file dinámico
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.multiple = true;

    input.onchange = (e: any) => {
      const files = Array.from(e.target?.files || []) as File[];

      if (files.length === 0) return;

      // Mostrar toast de procesamiento
      toast.info('⏳ Procesando archivos adjuntos...', {
        description: `${files.length} archivo(s) seleccionado(s)`,
        duration: 2000
      });

      setTimeout(() => {
        const nombresArchivos = files.map(f => f.name).join(', ');
        const tamañoTotal = files.reduce((acc, f) => acc + f.size, 0);
        const tamañoMB = (tamañoTotal / (1024 * 1024)).toFixed(2);

        // Agregar al mensaje
        const adjuntoTexto = `\n\n📎 Archivos adjuntos (${files.length}):\n${files.map(f => `• ${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join('\n')}`;
        setNuevoMensaje(prev => prev + adjuntoTexto);

        toast.success('✅ Archivos adjuntos agregados', {
          description: `${files.length} archivo(s) - ${tamañoMB} MB total`,
          duration: 4000
        });

        // Recordatorio
        setTimeout(() => {
          toast.info('💡 Recordatorio', {
            description: 'Los archivos se enviarán al publicar el mensaje',
            duration: 3000
          });
        }, 1000);
      }, 1500);
    };

    input.click();
  };

  const handleMencionar = () => {
    const usuarios = [
      { nombre: 'Juan Pérez López', rol: 'Abogado Defensor', activo: true },
      { nombre: 'María González', rol: 'Coordinadora Jurídica', activo: true },
      { nombre: 'Carlos Ruiz', rol: 'Director Jurídico', activo: true },
      { nombre: 'Ana López', rol: 'Asistente Jurídica', activo: true },
      { nombre: 'Sistema SIGL', rol: 'Notificaciones', activo: false }
    ];

    const usuariosActivos = usuarios.filter(u => u.activo);

    toast.info('👥 Selecciona un usuario para mencionar', {
      description: 'Escribe @ seguido del nombre en el mensaje',
      duration: 4000
    });

    // Mostrar lista de usuarios disponibles
    setTimeout(() => {
      const lista = usuariosActivos.map(u => `@${u.nombre} (${u.rol})`).join('\n');

      toast.info('📋 Usuarios disponibles para mencionar:', {
        description: `${usuariosActivos.length} miembros del equipo activos`,
        duration: 6000
      });

      // Auto-agregar @ al mensaje
      setNuevoMensaje(prev => {
        const posicionCursor = prev.length;
        return prev + (prev.endsWith(' ') || prev === '' ? '@' : ' @');
      });
    }, 500);
  };

  const handleEmoji = () => {
    const categorias = {
      'Reacciones': ['😊', '😃', '👍', '👏', '🙌', '💪'],
      'Estado': ['✅', '⚠️', '❌', '🔔', '⏰', '📌'],
      'Documentos': ['📎', '📄', '📋', '📁', '📊', '📑'],
      'Legal': ['⚖️', '🏛️', '📜', '✍️', '🔐', '🎯']
    };

    toast.info('😊 Selector de emojis', {
      description: 'Haz clic nuevamente para cambiar de emoji',
      duration: 3000
    });

    // Seleccionar categoría aleatoria
    const categoriasArray = Object.entries(categorias);
    const [nombreCategoria, emojisCategoria] = categoriasArray[Math.floor(Math.random() * categoriasArray.length)];
    const emojiAleatorio = emojisCategoria[Math.floor(Math.random() * emojisCategoria.length)];

    setNuevoMensaje(prev => prev + emojiAleatorio);

    toast.success(`${emojiAleatorio} Emoji agregado`, {
      description: `Categoría: ${nombreCategoria}`,
      duration: 2000
    });
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
      <DialogContent hideCloseButton className="w-[95vw] max-w-[900px] lg:max-w-4xl !max-h-[82vh] overflow-hidden flex flex-col p-0">
        <DialogTitle className="sr-only">
          Centro de Comunicaciones - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Centro de comunicaciones internas del expediente {expediente.id}
        </DialogDescription>
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
                            className="text-xs h-7 px-2 text-gray-600 hover:text-red-600"
                            onClick={() => handleEliminarComentario(com.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
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
                className="min-h-[60px] resize-none"
              />
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
