/**
 * ModalResponderCorreo - Modal dedicado para RESPONDER correos
 * Pre-carga el remitente original como destinatario (editable, admite múltiples
 * destinatarios y CC/CCO opcionales), asunto con "RE:" y cuerpo citado.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Reply, Paperclip, X, Send, Loader2, AlertCircle, User
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { ModalHeaderClean } from './ModalHeaderClean';
import { correosJuridicosService } from '../../../../services/api/legal.service';
import { EmailTagInput, EMAIL_REGEX } from './EmailTagInput';

export interface CorreoOriginalData {
  id: string;
  remitenteEmail: string;
  remitenteNombre: string;
  asunto: string;
  fechaRecepcion: Date | string;
  cuerpoHtml?: string;
  cuerpoTexto?: string;
}

interface ModalResponderCorreoProps {
  isOpen: boolean;
  onClose: () => void;
  correoOriginal: CorreoOriginalData | null;
  onSuccess?: () => void;
}

export function ModalResponderCorreo({ isOpen, onClose, correoOriginal, onSuccess }: ModalResponderCorreoProps) {
  const [cuerpo, setCuerpo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [paraEmails, setParaEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Construir cuerpo citado y precargar destinatario cuando se abre el modal
  useEffect(() => {
    if (isOpen && correoOriginal) {
      const fecha = new Date(correoOriginal.fechaRecepcion).toLocaleString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const citaHtml = `\n\n---\n\nEl ${fecha}, ${correoOriginal.remitenteNombre || correoOriginal.remitenteEmail} escribió:\n\n${correoOriginal.cuerpoTexto || '(sin contenido)'}`;
      setCuerpo(citaHtml);
      setArchivos([]);
      setParaEmails(correoOriginal.remitenteEmail ? [correoOriginal.remitenteEmail] : []);
      setCcEmails([]);
      setBccEmails([]);
      setShowCc(false);
      setShowBcc(false);
    }
  }, [isOpen, correoOriginal?.id]);

  const asuntoPrecargado = correoOriginal
    ? (correoOriginal.asunto.startsWith('RE:') ? correoOriginal.asunto : `RE: ${correoOriginal.asunto}`)
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correoOriginal) return;

    // Extraer solo la parte nueva del cuerpo (lo que escribió el usuario arriba de la cita)
    const cuerpoCompleto = cuerpo.trim();
    if (!cuerpoCompleto || cuerpoCompleto === '') {
      toast.error('⚠️ Error de validación', { description: 'Debe escribir un mensaje antes de enviar' });
      return;
    }

    if (paraEmails.length === 0) {
      toast.error('⚠️ Error de validación', { description: 'Debe indicar al menos un destinatario' });
      return;
    }

    const invalidosPara = paraEmails.filter((em) => !EMAIL_REGEX.test(em));
    const invalidosCc = ccEmails.filter((em) => !EMAIL_REGEX.test(em));
    const invalidosBcc = bccEmails.filter((em) => !EMAIL_REGEX.test(em));
    if (invalidosPara.length > 0 || invalidosCc.length > 0 || invalidosBcc.length > 0) {
      toast.error('⚠️ Error de validación', { description: 'Hay direcciones de correo inválidas' });
      return;
    }

    setEnviando(true);
    try {
      const attachmentsBase64 = await Promise.all(
        archivos.map(async (file) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
          });
          return {
            name: file.name,
            contentBytes: base64,
            contentType: file.type || 'application/octet-stream'
          };
        })
      );

      // Construir HTML completo con cita del original
      const fecha = new Date(correoOriginal.fechaRecepcion).toLocaleString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Separar la respuesta del usuario de la cita
      const separadorCita = '\n\n---\n\n';
      const indiceSeparador = cuerpo.indexOf(separadorCita);
      const respuestaUsuario = indiceSeparador > -1
        ? cuerpo.substring(0, indiceSeparador).trim()
        : cuerpo.trim();

      const cuerpoHtmlFinal = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  ${respuestaUsuario.replace(/\n/g, '<br/>')}
  <br/><br/>
  <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;"/>
  <p style="color: #666; font-size: 12px;">
    <strong>El ${fecha}, ${correoOriginal.remitenteNombre || correoOriginal.remitenteEmail} escribió:</strong>
  </p>
  <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0; color: #555;">
    ${correoOriginal.cuerpoHtml || correoOriginal.cuerpoTexto || '(sin contenido)'}
  </blockquote>
</div>`;

      const result = await correosJuridicosService.replyEmail(
        correoOriginal.id,
        cuerpoHtmlFinal,
        attachmentsBase64.length > 0 ? attachmentsBase64 : undefined,
        paraEmails,
        ccEmails.length > 0 ? ccEmails : undefined,
        bccEmails.length > 0 ? bccEmails : undefined
      );

      if (result?.success !== false) {
        toast.success('✅ Respuesta enviada exitosamente', {
          description: `Para: ${paraEmails.join(', ')}`,
          duration: 4000
        });
        setCuerpo('');
        setArchivos([]);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error('El servidor indicó que no pudo procesar la solicitud');
      }
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      toast.error('❌ Error al enviar la respuesta', {
        description: 'Por favor intente nuevamente.'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevos = Array.from(e.target.files);
      setArchivos(prev => [...prev, ...nuevos]);
      toast.success(`${nuevos.length} archivo(s) agregado(s)`);
    }
  };

  const handleCancel = () => {
    const separadorCita = '\n\n---\n\n';
    const indiceSeparador = cuerpo.indexOf(separadorCita);
    const respuestaUsuario = indiceSeparador > -1
      ? cuerpo.substring(0, indiceSeparador).trim()
      : cuerpo.trim();

    if (respuestaUsuario || archivos.length > 0) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    setCuerpo('');
    setArchivos([]);
    onClose();
  };

  if (!correoOriginal) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[650px] lg:max-w-2xl h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Responder Correo</DialogTitle>
          <DialogDescription className="sr-only">
            Responder al correo de {correoOriginal.remitenteNombre || correoOriginal.remitenteEmail}
          </DialogDescription>

          {/* HEADER */}
          <ModalHeaderClean
            icono={Reply}
            titulo={`Respondiendo a: ${correoOriginal.remitenteNombre || correoOriginal.remitenteEmail}`}
            subtitulo={asuntoPrecargado}
            colorIcono="green"
            badges={[]}
            onClose={onClose}
          />

          {/* CONTENIDO */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Destinatarios */}
              <Card className="p-4 bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Destinatarios</h3>
                      <p className="text-xs text-gray-500">Puede agregar más destinatarios además del remitente original</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        CC
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        CCO
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="para-respuesta" className="text-sm font-bold text-gray-700">Para</Label>
                  <EmailTagInput
                    id="para-respuesta"
                    emails={paraEmails}
                    onEmailsChange={setParaEmails}
                    placeholder="destinatario@ejemplo.com"
                  />
                </div>
                {showCc && (
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="cc-respuesta" className="text-sm font-bold text-gray-700">CC</Label>
                    <EmailTagInput
                      id="cc-respuesta"
                      emails={ccEmails}
                      onEmailsChange={setCcEmails}
                      placeholder="cc@ejemplo.com"
                    />
                  </div>
                )}
                {showBcc && (
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="cco-respuesta" className="text-sm font-bold text-gray-700">CCO</Label>
                    <EmailTagInput
                      id="cco-respuesta"
                      emails={bccEmails}
                      onEmailsChange={setBccEmails}
                      placeholder="cco@ejemplo.com"
                    />
                  </div>
                )}
                <div className="space-y-2 mt-3">
                  <Label className="text-sm font-bold text-gray-700">Asunto</Label>
                  <Input
                    value={asuntoPrecargado}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed text-gray-600"
                  />
                </div>
              </Card>

              {/* Cuerpo del mensaje */}
              <Card className="p-4 bg-gray-50 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="cuerpo-respuesta" className="text-sm font-bold text-gray-700">
                    Mensaje <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (escriba su respuesta arriba de la línea de separación)
                    </span>
                  </Label>
                  <Textarea
                    id="cuerpo-respuesta"
                    value={cuerpo}
                    onChange={(e) => setCuerpo(e.target.value)}
                    rows={12}
                    required
                    className="resize-none font-mono text-sm"
                    placeholder="Escriba aquí su respuesta..."
                  />
                </div>
              </Card>

              {/* Adjuntos */}
              <Card className="p-4 bg-gray-50 border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                  <Paperclip className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Archivos Adjuntos</h3>
                    <p className="text-xs text-gray-500">Opcional</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('reply-file-upload')?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Seleccionar Archivos
                </Button>
                <input
                  id="reply-file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={handleArchivoChange}
                  className="hidden"
                />
                {archivos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {archivos.map((archivo, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm text-gray-700 truncate">{archivo.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchivos(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </form>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              La respuesta quedará registrada en "Respondidos"
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={enviando}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={enviando}
                style={{ background: '#059669', color: '#FFFFFF' }}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Respuesta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de cancelación */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent
          hideCloseButton
          className="p-0 overflow-hidden border-none shadow-2xl z-[10002] rounded-2xl mx-auto"
          style={{ width: '380px', maxWidth: '380px' }}
        >
          <div className="bg-white overflow-hidden w-full">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-orange-50 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-all duration-300 shadow-sm border border-orange-100">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                ¿Cancelar respuesta?
              </h3>
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderá el texto ingresado en la respuesta.
              </p>
              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleConfirmCancel}
                  className="w-full py-8 !bg-red-600 hover:!bg-red-700 !text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-[0.98] text-lg border-none"
                >
                  Sí, cancelar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-6 rounded-xl font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  No, continuar escribiendo
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
