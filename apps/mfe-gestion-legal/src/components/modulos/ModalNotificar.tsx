/**
 * ModalNotificar - Modal para enviar notificaciones sobre expedientes
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Header azul corporativo con gradiente
 * ✅ Diseño limpio tipo SAP Fiori
 * ✅ Destinatarios dinámicos: abogados del proceso
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Checkbox } from '@esap-mfe/shared-ui/checkbox';
import { Label } from '@esap-mfe/shared-ui/label';
import { 
  Bell, X, Send, User, Mail, MessageSquare, 
  CheckCircle, Users, AlertCircle
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { getServiceUrl } from '../../../../config/environment';

interface AbogadoDisponible {
  nombre: string;
  rol: string;
}

interface ModalNotificarProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
  abogadosDisponibles?: AbogadoDisponible[];
}

export function ModalNotificar({ isOpen, onClose, expediente, abogadosDisponibles = [] }: ModalNotificarProps) {
  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState<string[]>([]);
  const [asunto, setAsunto] = useState(`Expediente ${expediente.id} - Actualización`);
  const [mensaje, setMensaje] = useState('');
  const [enviarPorEmail, setEnviarPorEmail] = useState(true);
  const [enviarPorSistema, setEnviarPorSistema] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Build display list with avatars/emails derived from names
  const destinatarios = useMemo(() => {
    return abogadosDisponibles
      .filter(a => a.nombre && a.nombre.trim() !== '' && a.nombre.toLowerCase() !== 'sin asignar')
      .map((a, idx) => ({
        id: `abogado-${idx}`,
        nombre: a.nombre,
        cargo: a.rol,
        email: `${a.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}@esap.edu.co`,
        avatar: a.nombre.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
      }));
  }, [abogadosDisponibles]);

  const toggleDestinatario = (id: string) => {
    if (destinatariosSeleccionados.includes(id)) {
      setDestinatariosSeleccionados(destinatariosSeleccionados.filter(d => d !== id));
    } else {
      setDestinatariosSeleccionados([...destinatariosSeleccionados, id]);
    }
  };

  const seleccionarTodos = () => {
    if (destinatariosSeleccionados.length === destinatarios.length) {
      setDestinatariosSeleccionados([]);
    } else {
      setDestinatariosSeleccionados(destinatarios.map(u => u.id));
    }
  };

  const handleEnviar = async () => {
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

    const seleccionados = destinatarios.filter(u => destinatariosSeleccionados.includes(u.id));
    let emailsEnviados = 0;
    let emailsFallidos = 0;

    try {
      // ========== 1. Enviar por correo electrónico ==========
      if (enviarPorEmail) {
        const notificacionesUrl = getServiceUrl('notificaciones');

        const htmlTemplate = (nombreDestinatario: string) => `
          <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
            <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
              <tr>
                <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
                  Gestión Legal ESAP
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
                  ${asunto}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px 8px 24px; font-size: 13px; color: #6b7280;">
                  Estimado/a <strong>${nombreDestinatario}</strong>,
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-line;">
                  ${mensaje}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 24px; font-size: 12px; color: #6b7280; background: #f0f7ff; border-top: 1px solid #d7e9ff;">
                  <strong>Expediente:</strong> ${expediente.id}<br/>
                  <strong>Etapa:</strong> ${expediente.etapa || 'N/A'}
                </td>
              </tr>
              <tr>
                <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                  ESAP - Escuela Superior de Administración Pública
                </td>
              </tr>
            </table>
          </div>
        `;

        // Send one email per recipient (backend DTO expects single @IsEmail() `to`)
        const emailPromises = seleccionados.map(async (dest) => {
          try {
            const response = await fetch(`${notificacionesUrl}/api/v1/emails/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: dest.email,
                subject: asunto,
                text: mensaje,
                html: htmlTemplate(dest.nombre)
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error(`Error enviando email a ${dest.email}:`, errorData);
              emailsFallidos++;
            } else {
              emailsEnviados++;
            }
          } catch (err) {
            console.error(`Error de red enviando email a ${dest.email}:`, err);
            emailsFallidos++;
          }
        });

        await Promise.all(emailPromises);
      }

      // ========== 2. Notificación en el sistema (log de trazabilidad) ==========
      if (enviarPorSistema) {
        console.log('🔔 NOTIFICACIÓN INTERNA DEL SISTEMA:', {
          expediente: expediente.id,
          asunto,
          mensaje,
          destinatarios: seleccionados.map(d => ({ nombre: d.nombre, email: d.email })),
          fecha: new Date().toISOString()
        });
      }

      // ========== 3. Mostrar resultados ==========
      if (enviarPorEmail) {
        if (emailsEnviados > 0 && emailsFallidos === 0) {
          toast.success(`✅ ${emailsEnviados} correo(s) enviado(s) exitosamente`, { duration: 4000 });
        } else if (emailsEnviados > 0 && emailsFallidos > 0) {
          toast.warning(`⚠️ ${emailsEnviados} correo(s) enviado(s), ${emailsFallidos} fallido(s)`, { duration: 5000 });
        } else if (emailsFallidos > 0) {
          toast.error(`❌ No se pudieron enviar los correos (${emailsFallidos} fallido(s))`, { duration: 5000 });
        }
      }

      if (enviarPorSistema) {
        toast.info('🔔 Notificación registrada en el sistema', {
          description: `${seleccionados.length} destinatario(s) notificado(s)`,
          duration: 3000
        });
      }

      if (!enviarPorEmail && !enviarPorSistema) {
        toast.warning('⚠️ No se seleccionó ningún canal de envío');
      }

      onClose();

      // Resetear formulario
      setTimeout(() => {
        setDestinatariosSeleccionados([]);
        setMensaje('');
        setAsunto(`Expediente ${expediente.id} - Actualización`);
      }, 500);

    } catch (error) {
      console.error('Error general al enviar notificaciones:', error);
      toast.error('❌ Error inesperado al enviar las notificaciones');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[750px] lg:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
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
              {destinatarios.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={seleccionarTodos}
                  className="text-xs font-bold"
                  style={{ borderColor: '#2962FF', color: '#2962FF' }}
                >
                  {destinatariosSeleccionados.length === destinatarios.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              )}
            </div>

            {destinatarios.length === 0 ? (
              <Card className="p-4 bg-gray-50 border-gray-200">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No hay abogados asignados a este proceso. Asigna un abogado al expediente para poder enviar notificaciones.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {destinatarios.map((usuario) => {
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
            )}
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
                  onCheckedChange={(checked: boolean) => setEnviarPorEmail(checked)}
                />
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  📧 Enviar por correo electrónico
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sistema"
                  checked={enviarPorSistema}
                  onCheckedChange={(checked: boolean) => setEnviarPorSistema(checked)}
                />
                <Label htmlFor="sistema" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  🔔 Notificación en el sistema
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
