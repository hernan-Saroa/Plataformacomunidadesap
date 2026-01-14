/**
 * ModalNotificar - Modal para enviar notificaciones sobre expedientes
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Header azul corporativo con gradiente
 * ✅ Diseño limpio tipo SAP Fiori
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Checkbox } from '../../../ui/checkbox';
import { Label } from '../../../ui/label';
import { 
  Bell, X, Send, User, Mail, MessageSquare, 
  CheckCircle, Users, AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalNotificarProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Lista de usuarios mock para notificar
const usuariosDisponibles = [
  { id: 1, nombre: 'Dr. Juan Pérez López', cargo: 'Coordinador Legal', email: 'juan.perez@esap.gov.co', avatar: 'JP' },
  { id: 2, nombre: 'Dra. María González', cargo: 'Abogada Senior', email: 'maria.gonzalez@esap.gov.co', avatar: 'MG' },
  { id: 3, nombre: 'Dr. Carlos Ramírez', cargo: 'Abogado Junior', email: 'carlos.ramirez@esap.gov.co', avatar: 'CR' },
  { id: 4, nombre: 'Dra. Ana López', cargo: 'Asesora Jurídica', email: 'ana.lopez@esap.gov.co', avatar: 'AL' },
  { id: 5, nombre: 'Dra. Patricia Rojas', cargo: 'Directora Oficina Jurídica', email: 'patricia.rojas@esap.gov.co', avatar: 'PR' },
];

export function ModalNotificar({ isOpen, onClose, expediente }: ModalNotificarProps) {
  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState<number[]>([]);
  const [asunto, setAsunto] = useState(`Expediente ${expediente.id} - Actualización`);
  const [mensaje, setMensaje] = useState('');
  const [enviarPorEmail, setEnviarPorEmail] = useState(true);
  const [enviarPorSistema, setEnviarPorSistema] = useState(true);
  const [conCopiaExpediente, setConCopiaExpediente] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const toggleDestinatario = (id: number) => {
    if (destinatariosSeleccionados.includes(id)) {
      setDestinatariosSeleccionados(destinatariosSeleccionados.filter(d => d !== id));
    } else {
      setDestinatariosSeleccionados([...destinatariosSeleccionados, id]);
    }
  };

  const seleccionarTodos = () => {
    if (destinatariosSeleccionados.length === usuariosDisponibles.length) {
      setDestinatariosSeleccionados([]);
    } else {
      setDestinatariosSeleccionados(usuariosDisponibles.map(u => u.id));
    }
  };

  const handleEnviar = () => {
    if (destinatariosSeleccionados.length === 0) {
      toast.error('⚠️ Selecciona al menos un destinatario', {
        description: 'Debes seleccionar a quién enviar la notificación'
      });
      return;
    }

    if (!mensaje.trim()) {
      toast.error('⚠️ Escribe un mensaje', {
        description: 'El mensaje de la notificación no puede estar vacío'
      });
      return;
    }

    setEnviando(true);

    // Simular envío
    setTimeout(() => {
      const destinatarios = usuariosDisponibles.filter(u => destinatariosSeleccionados.includes(u.id));
      
      toast.success('✅ Notificación enviada exitosamente', {
        description: `Enviado a ${destinatarios.length} destinatario(s)`,
        duration: 4000
      });

      // Log para trazabilidad
      console.log('📧 NOTIFICACIÓN ENVIADA:', {
        expediente: expediente.id,
        asunto,
        mensaje,
        destinatarios: destinatarios.map(d => ({ nombre: d.nombre, email: d.email })),
        canales: {
          email: enviarPorEmail,
          sistema: enviarPorSistema
        },
        conCopia: conCopiaExpediente,
        fecha: new Date().toISOString()
      });

      // Mostrar detalles del envío
      setTimeout(() => {
        if (enviarPorEmail) {
          toast.info('📨 Emails enviados', {
            description: `${destinatarios.length} correo(s) electrónico(s) enviado(s)`,
            duration: 3000
          });
        }
        if (enviarPorSistema) {
          toast.info('🔔 Notificaciones internas', {
            description: `${destinatarios.length} notificación(es) en el sistema`,
            duration: 3000
          });
        }
      }, 1500);

      setEnviando(false);
      onClose();
      
      // Resetear formulario
      setTimeout(() => {
        setDestinatariosSeleccionados([]);
        setMensaje('');
        setAsunto(`Expediente ${expediente.id} - Actualización`);
      }, 500);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Enviar Notificación - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Enviar notificación sobre el expediente {expediente.id}
        </DialogDescription>

        {/* ==================== HEADER LIMPIO Y USABLE ==================== */}
        <ModalHeaderClean
          titulo="Enviar Notificación"
          subtitulo={`Notificar sobre expediente ${expediente.id}`}
          icono={Bell}
          colorIcono="blue"
          badgePrincipal={expediente.etapa}
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <Users className="w-3 h-3 mr-1" />
                {destinatariosSeleccionados.length} destinatarios
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* ==================== CONTENIDO ==================== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Asunto */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              📋 Asunto de la notificación
            </Label>
            <Input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto de la notificación..."
              className="font-semibold"
            />
          </div>

          {/* Mensaje */}
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              ✍️ Mensaje
            </Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe el mensaje que deseas enviar sobre el expediente..."
              className="min-h-[120px] font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">
              {mensaje.length} caracteres
            </p>
          </div>

          {/* Destinatarios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-bold text-gray-700">
                👥 Destinatarios ({destinatariosSeleccionados.length} seleccionados)
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={seleccionarTodos}
                className="text-xs font-bold"
                style={{ borderColor: '#2962FF', color: '#2962FF' }}
              >
                {destinatariosSeleccionados.length === usuariosDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usuariosDisponibles.map((usuario) => {
                const isSelected = destinatariosSeleccionados.includes(usuario.id);
                return (
                  <Card 
                    key={usuario.id} 
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-2 bg-blue-50' : 'border-2 border-transparent'
                    }`}
                    style={isSelected ? { borderColor: '#2962FF' } : {}}
                    onClick={() => toggleDestinatario(usuario.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDestinatario(usuario.id)}
                        className="mt-1"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: '#2962FF', color: '#FFFFFF' }}
                        >
                          <span className="text-xs font-black">{usuario.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{usuario.nombre}</p>
                          <p className="text-xs text-gray-600 truncate">{usuario.cargo}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {usuario.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Opciones de envío */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <Label className="text-sm font-bold mb-3 block" style={{ color: '#2962FF' }}>
              ⚙️ Opciones de envío
            </Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="email"
                  checked={enviarPorEmail}
                  onCheckedChange={(checked) => setEnviarPorEmail(checked as boolean)}
                />
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  📧 Enviar por correo electrónico
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sistema"
                  checked={enviarPorSistema}
                  onCheckedChange={(checked) => setEnviarPorSistema(checked as boolean)}
                />
                <Label htmlFor="sistema" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  🔔 Notificación en el sistema
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="copia"
                  checked={conCopiaExpediente}
                  onCheckedChange={(checked) => setConCopiaExpediente(checked as boolean)}
                />
                <Label htmlFor="copia" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  📎 Adjuntar resumen del expediente
                </Label>
              </div>
            </div>
          </Card>

          {/* Alerta informativa */}
          <Card className="p-3 bg-amber-50 border-amber-300">
            <p className="text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Las notificaciones quedarán registradas en el historial del expediente para efectos de trazabilidad.
            </p>
          </Card>
        </div>

        {/* ==================== FOOTER STICKY CON BOTONES ==================== */}
        <div 
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{ 
            borderTopColor: '#2962FF',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" onClick={onClose} className="font-bold">
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={enviando}
              className="font-bold text-white"
              style={{ background: '#2962FF' }}
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Enviar Notificación
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}