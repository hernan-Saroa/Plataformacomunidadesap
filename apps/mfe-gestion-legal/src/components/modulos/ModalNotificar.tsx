/**
 * ModalNotificar - Modal para enviar notificaciones sobre expedientes
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Header azul corporativo con gradiente
 * ✅ Diseño limpio tipo SAP Fiori
 * ✅ Destinatarios dinámicos filtrados por rol del usuario actual
 * ✅ Correos reales desde el servicio de autenticación
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
  Bell, X, Send, Mail,
  Users, AlertCircle
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { legalService } from '../../../../services/api/legal.service';

interface AbogadoDisponible {
  nombre: string;
  rol: string;
}

interface ModalNotificarProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
  abogadosDisponibles?: AbogadoDisponible[];
  rolUsuarioActual?: string;
}

const MONITOREO_ROLE = 'MONITOREO_GESTION_LEGAL';
const JEFE_ROLE = 'JEFE_GESTION_LEGAL';
const RESUELVE_ROLE = 'RESUELVE_GESTION_LEGAL';

export function ModalNotificar({ isOpen, onClose, expediente, abogadosDisponibles = [], rolUsuarioActual = '' }: ModalNotificarProps) {
  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState<string[]>([]);
  const [asunto, setAsunto] = useState(`Expediente ${expediente.id} - Actualización`);
  const [mensaje, setMensaje] = useState('');
  const [enviarPorEmail, setEnviarPorEmail] = useState(true);
  const [enviarPorSistema, setEnviarPorSistema] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const JEFE_ROL_ID = 'jefe-gestion-legal-rol';

  const destinatarios = useMemo(() => {
    const esMonitoreo = rolUsuarioActual === MONITOREO_ROLE;
    const esJefe = rolUsuarioActual === JEFE_ROLE;
    const esResuelve = rolUsuarioActual === RESUELVE_ROLE;

    const jefeEntry = {
      id: JEFE_ROL_ID,
      nombre: 'Jefe de Gestión Legal',
      cargo: 'Rol institucional',
      email: 'Notificación a usuarios con rol JEFE_GESTION_LEGAL',
      avatar: 'JL',
      esJefe: true,
    };

    // RESUELVE: solo puede notificar al Jefe
    if (esResuelve) {
      return [jefeEntry];
    }

    let abogadosFiltrados = abogadosDisponibles.filter(
      a => a.nombre && a.nombre.trim() !== '' && a.nombre.toLowerCase() !== 'sin asignar'
    );

    // MONITOREO y JEFE: solo el abogado principal del caso
    if (esMonitoreo || esJefe) {
      abogadosFiltrados = abogadosFiltrados.filter(a => a.rol === 'Abogado del caso');
    }

    const abogados = abogadosFiltrados.map((a, idx) => ({
      id: `abogado-${idx}`,
      nombre: a.nombre,
      cargo: esJefe ? 'RESUELVE_GESTION_LEGAL' : a.rol,
      email: 'Notificación vía backend (RESUELVE_GESTION_LEGAL)',
      avatar: a.nombre.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      esJefe: false,
    }));

    // JEFE: solo puede notificar al abogado
    if (esJefe) {
      return abogados;
    }

    // MONITOREO (y otros): abogado + jefe
    return [...abogados, jefeEntry];
  }, [abogadosDisponibles, rolUsuarioActual]);

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
    const jefeSeleccionado = seleccionados.some(s => s.id === JEFE_ROL_ID);
    const abogadosSeleccionados = seleccionados.filter(s => s.id !== JEFE_ROL_ID);
    const expedienteId = (expediente as any).uuid || (expediente as any).id;
    const resultados: string[] = [];
    const errores: string[] = [];

    try {
      // Notificar al Jefe de Gestión Legal vía rol (backend resuelve usuarios y envía email + in-app)
      if (jefeSeleccionado) {
        try {
          await legalService.notifyExpedienteToRole(expedienteId, {
            roleCode: 'JEFE_GESTION_LEGAL',
            asunto,
            mensaje,
            enviarEmail: enviarPorEmail,
            enviarSistema: enviarPorSistema,
            radicado: expediente.id,
            etapa: expediente.etapa,
          });
          resultados.push('Jefe de Gestión Legal');
        } catch (err) {
          console.error('Error notificando al Jefe:', err);
          errores.push('Jefe de Gestión Legal');
        }
      }

      // Notificar al/los abogado(s) vía rol RESUELVE_GESTION_LEGAL
      // El backend resuelve los usuarios reales y envía email + in-app
      if (abogadosSeleccionados.length > 0) {
        try {
          await legalService.notifyExpedienteToRole(expedienteId, {
            roleCode: 'RESUELVE_GESTION_LEGAL',
            asunto,
            mensaje,
            enviarEmail: enviarPorEmail,
            enviarSistema: enviarPorSistema,
            radicado: expediente.id,
            etapa: expediente.etapa,
          });
          resultados.push('Abogado del caso');
        } catch (err) {
          console.error('Error notificando al abogado:', err);
          errores.push('Abogado del caso');
        }
      }

      // Mostrar resultados
      if (resultados.length > 0) {
        toast.success(`✅ Notificación enviada a: ${resultados.join(', ')}`, { duration: 4000 });
      }
      if (errores.length > 0) {
        toast.error(`❌ Error notificando a: ${errores.join(', ')}`, { duration: 5000 });
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
