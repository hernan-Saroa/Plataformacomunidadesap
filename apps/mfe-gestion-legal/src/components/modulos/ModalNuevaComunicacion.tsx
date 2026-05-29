/**
 * ModalNuevaComunicacion - Modal para ENVIAR correo electrónico
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Estilo Gmail/Outlook — destinatarios ilimitados con chips
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { toast } from 'sonner';
import {
  Mail, FileText, User,
  Upload, X, Send, Paperclip, Loader2, AlertCircle, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { ModalHeaderClean } from './ModalHeaderClean';
import { correosJuridicosService } from '../../../../services/api/legal.service';

interface ModalNuevaComunicacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NuevaComunicacionData) => void;
  initialData?: Partial<NuevaComunicacionData>;
}

export interface NuevaComunicacionData {
  para: string;
  cc?: string;
  asunto: string;
  cuerpo: string;
  archivos?: File[];
  isForward?: boolean;
  isReply?: boolean;
  originalCorreoId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Chip de email individual ──────────────────────────────────────────────────
function EmailChip({
  email,
  onRemove,
  readOnly = false,
}: {
  email: string;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const valid = EMAIL_REGEX.test(email);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border select-none ${
        valid
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-red-50 text-red-700 border-red-300'
      }`}
    >
      {email}
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
          aria-label={`Eliminar ${email}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ── Campo de destinatarios tipo Outlook ───────────────────────────────────────
function EmailTagInput({
  id,
  emails,
  onEmailsChange,
  placeholder = 'nombre@ejemplo.com',
  readOnly = false,
}: {
  id: string;
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commitInput = (raw: string) => {
    const trimmed = raw.trim().replace(/[,;]+$/, '').trim();
    if (!trimmed) return;
    if (!emails.includes(trimmed)) {
      onEmailsChange([...emails, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
      e.preventDefault();
      commitInput(inputValue);
      return;
    }
    // Backspace sobre campo vacío → elimina el último chip
    if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      onEmailsChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const candidates = pasted.split(/[,;\s\n\r]+/).map((s) => s.trim()).filter(Boolean);
    const newEmails = [...emails];
    for (const c of candidates) {
      if (!newEmails.includes(c)) newEmails.push(c);
    }
    onEmailsChange(newEmails);
    setInputValue('');
  };

  const handleBlur = () => {
    commitInput(inputValue);
    setFocused(false);
  };

  const removeEmail = (idx: number) => {
    onEmailsChange(emails.filter((_, i) => i !== idx));
  };

  const invalidCount = emails.filter((e) => !EMAIL_REGEX.test(e)).length;

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        onClick={() => !readOnly && inputRef.current?.focus()}
        className={`min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-md border bg-white cursor-text transition-colors ${
          readOnly
            ? 'bg-gray-100 cursor-not-allowed border-gray-200'
            : focused
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {emails.map((email, idx) => (
          <EmailChip key={idx} email={email} onRemove={() => removeEmail(idx)} readOnly={readOnly} />
        ))}
        {!readOnly && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder={emails.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[180px] outline-none text-sm bg-transparent placeholder:text-gray-400 text-gray-900"
          />
        )}
      </div>
      {invalidCount > 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {invalidCount} dirección{invalidCount > 1 ? 'es inválidas' : ' inválida'} (se resaltan en rojo)
        </p>
      )}
      {!readOnly && (
        <p className="text-xs text-gray-400">
          Presione <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Enter</kbd>,{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">,</kbd> o{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Tab</kbd>{' '}
          para agregar · Pegue múltiples correos a la vez
        </p>
      )}
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────
export function ModalNuevaComunicacion({ isOpen, onClose, onSubmit, initialData }: ModalNuevaComunicacionProps) {
  const [originalBody, setOriginalBody] = useState<string>('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [paraEmails, setParaEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [isForward, setIsForward] = useState(false);
  const [isReply, setIsReply] = useState(false);
  const [originalCorreoId, setOriginalCorreoId] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [requestReadReceipt, setRequestReadReceipt] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setArchivos(initialData?.archivos || []);
    setShowCc(false);
    setRequestReadReceipt(true);

    if (initialData?.isForward) {
      setOriginalBody(initialData.cuerpo || '');
      setCuerpo('');
    } else {
      setOriginalBody('');
      setCuerpo(initialData?.cuerpo || '');
    }

    setAsunto(initialData?.asunto || '');
    setIsForward(!!initialData?.isForward);
    setIsReply(!!initialData?.isReply);
    setOriginalCorreoId(initialData?.originalCorreoId);

    // Para: si viene un valor, inicializar como chip
    const paraRaw = initialData?.para?.trim();
    setParaEmails(paraRaw ? [paraRaw] : []);

    // CC: puede venir como string separado por comas
    const ccRaw = initialData?.cc?.trim();
    if (ccRaw) {
      setCcEmails(ccRaw.split(',').map((e) => e.trim()).filter(Boolean));
      setShowCc(true);
    } else {
      setCcEmails([]);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paraEmails.length === 0) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar al menos un destinatario (Para)' });
      return;
    }
    const invalidPara = paraEmails.filter((em) => !EMAIL_REGEX.test(em));
    if (invalidPara.length > 0) {
      toast.error('⚠️ Emails inválidos', {
        description: `Corrija las direcciones resaltadas en rojo: ${invalidPara.join(', ')}`,
      });
      return;
    }
    const invalidCc = ccEmails.filter((em) => !EMAIL_REGEX.test(em));
    if (invalidCc.length > 0) {
      toast.error('⚠️ Emails de CC inválidos', {
        description: `Corrija: ${invalidCc.join(', ')}`,
      });
      return;
    }
    if (!asunto.trim() && !isForward) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el asunto' });
      return;
    }
    if (!cuerpo.trim() && !isForward) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el cuerpo del mensaje' });
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
          return { name: file.name, contentBytes: base64, contentType: file.type || 'application/octet-stream' };
        })
      );

      let isSuccess = false;

      if (isForward && originalCorreoId) {
        // Para reenvío: Graph sólo admite un destinatario principal en forwardEmail
        const result = await correosJuridicosService.forwardEmail(
          originalCorreoId,
          paraEmails.join(','),
          cuerpo.trim(),
          attachmentsBase64.length > 0 ? attachmentsBase64 : undefined
        );
        isSuccess = result?.success !== false;
      } else if (isReply && originalCorreoId) {
        const result = await correosJuridicosService.replyEmail(
          originalCorreoId,
          cuerpo.trim(),
          attachmentsBase64.length > 0 ? attachmentsBase64 : undefined
        );
        isSuccess = result?.success !== false;
      } else {
        const result = await correosJuridicosService.sendEmail({
          to: paraEmails.length === 1 ? paraEmails[0] : paraEmails,
          subject: asunto.trim() || 'Sin Asunto',
          body: cuerpo.trim(),
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          attachments: attachmentsBase64.length > 0 ? attachmentsBase64 : undefined,
          requestReadReceipt,
          requestDeliveryReceipt: requestReadReceipt,
        });
        isSuccess = result?.success !== false;
      }

      if (isSuccess) {
        const destinatariosLabel =
          paraEmails.length === 1
            ? paraEmails[0]
            : `${paraEmails[0]} y ${paraEmails.length - 1} más`;

        toast.success(isForward ? '✅ Correo reenviado exitosamente' : '✅ Correo enviado exitosamente', {
          description: `Para: ${destinatariosLabel}${archivos.length > 0 ? ` · ${archivos.length} adjunto(s)` : ''}`,
          duration: 4000,
        });

        if (onSubmit) {
          onSubmit({
            para: paraEmails.join(', '),
            cc: ccEmails.join(', ') || undefined,
            asunto,
            cuerpo,
            archivos,
            isForward,
            isReply,
            originalCorreoId,
          });
        }

        // Reset
        setParaEmails([]);
        setCcEmails([]);
        setAsunto('');
        setCuerpo('');
        setArchivos([]);
        setShowCc(false);
        onClose();
      } else {
        throw new Error('El servidor indicó que no pudo procesar la solicitud');
      }
    } catch (error) {
      console.error('Error enviando correo:', error);
      toast.error('❌ Error al procesar el correo', {
        description: 'Por favor intente nuevamente. Verifique que tiene conexión.',
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevos = Array.from(e.target.files);
      setArchivos((prev) => [...prev, ...nuevos]);
      toast.success(`${nuevos.length} archivo(s) agregado(s)`);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const hayContenido = paraEmails.length > 0 || asunto || cuerpo;

  const handleCancel = () => {
    if (hayContenido) {
      setShowCancelConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setParaEmails([]);
    setCcEmails([]);
    setAsunto('');
    setCuerpo('');
    setArchivos([]);
    setShowCc(false);
    setShowCancelConfirm(false);
    onClose();
  };

  const totalDestinatarios = paraEmails.length + ccEmails.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[680px] h-[92vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Nueva Comunicación</DialogTitle>
          <DialogDescription className="sr-only">
            Enviar correo electrónico desde la Oficina Jurídica
          </DialogDescription>

          {/* HEADER */}
          <ModalHeaderClean
            icono={Mail}
            titulo="Redactar Correo"
            subtitulo="Enviar correo electrónico desde la Oficina Jurídica"
            colorIcono="blue"
            badges={
              totalDestinatarios > 0
                ? [{ texto: `${totalDestinatarios} destinatario${totalDestinatarios > 1 ? 's' : ''}`, color: 'azul' }]
                : []
            }
            onClose={onClose}
          />

          {/* CONTENIDO */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Destinatarios ── */}
              <Card className="p-4 bg-white border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Destinatarios</h3>
                    <p className="text-xs text-gray-500">Ilimitados — Enter, coma o Tab para confirmar cada uno</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Para */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Para <span className="text-red-500">*</span>
                        {paraEmails.length > 0 && (
                          <span className="ml-2 text-blue-600 font-normal normal-case">
                            ({paraEmails.length} correo{paraEmails.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </Label>
                      {!showCc && !isReply && (
                        <button
                          type="button"
                          onClick={() => setShowCc(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                        >
                          <ChevronDown className="w-3 h-3" />
                          CC
                        </button>
                      )}
                    </div>
                    <EmailTagInput
                      id="para"
                      emails={paraEmails}
                      onEmailsChange={setParaEmails}
                      placeholder="destinatario@ejemplo.com"
                      readOnly={isReply}
                    />
                  </div>

                  {/* CC expandible */}
                  {showCc && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          CC
                          {ccEmails.length > 0 && (
                            <span className="ml-2 text-gray-500 font-normal normal-case">
                              ({ccEmails.length} correo{ccEmails.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </Label>
                        {ccEmails.length === 0 && (
                          <button
                            type="button"
                            onClick={() => setShowCc(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                          >
                            <ChevronUp className="w-3 h-3" />
                            Ocultar CC
                          </button>
                        )}
                      </div>
                      <EmailTagInput
                        id="cc"
                        emails={ccEmails}
                        onEmailsChange={setCcEmails}
                        placeholder="copia@ejemplo.com"
                      />
                    </div>
                  )}

                  {/* Resumen destinatarios cuando hay muchos */}
                  {paraEmails.length > 3 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">
                        📬 {paraEmails.length} destinatarios en "Para"
                        {ccEmails.length > 0 ? ` + ${ccEmails.length} en CC` : ''}
                        {' '}— el correo se enviará a todos.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── Contenido ── */}
              <Card className="p-4 bg-white border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Contenido</h3>
                    <p className="text-xs text-gray-500">Asunto y cuerpo del mensaje</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Asunto */}
                  <div className="space-y-1.5">
                    <Label htmlFor="asunto" className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Asunto {!isForward && <span className="text-red-500">*</span>}
                    </Label>
                    <input
                      id="asunto"
                      type="text"
                      placeholder="Asunto del correo"
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Cuerpo */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cuerpo" className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      {isForward ? 'Comentario (opcional)' : <>Mensaje <span className="text-red-500">*</span></>}
                    </Label>
                    <Textarea
                      id="cuerpo"
                      placeholder={
                        isForward
                          ? 'Escriba un comentario adicional al reenvío (opcional)...'
                          : 'Escriba aquí el contenido del correo...'
                      }
                      value={cuerpo}
                      onChange={(e) => setCuerpo(e.target.value)}
                      rows={isForward ? 4 : 9}
                      className="resize-none"
                    />
                  </div>

                  {/* Cuerpo original (solo reenvíos) */}
                  {isForward && originalBody && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo original incluido</p>
                      <div
                        className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 max-h-40 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: originalBody }}
                      />
                      <p className="text-xs text-gray-400">Los adjuntos del correo original también se incluirán.</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── Adjuntos ── */}
              <Card className="p-4 bg-white border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Paperclip className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm">Archivos Adjuntos</h3>
                    <p className="text-xs text-gray-500">
                      {archivos.length === 0 ? 'Sin adjuntos' : `${archivos.length} archivo(s) seleccionado(s)`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => document.getElementById('file-upload-modal')?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                  <input
                    id="file-upload-modal"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={handleArchivoChange}
                    className="hidden"
                  />
                </div>

                {archivos.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {archivos.map((archivo, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md border border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{archivo.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            ({(archivo.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => handleEliminarArchivo(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* ── Opciones de envío ── */}
              {!isReply && !isForward && (
                <Card className="p-4 bg-white border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Opciones de envío</h3>
                      <p className="text-xs text-gray-500">Configura el seguimiento del correo</p>
                    </div>
                  </div>

                  <label
                    htmlFor="request-receipt"
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      requestReadReceipt
                        ? 'bg-violet-50 border-violet-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      id="request-receipt"
                      type="checkbox"
                      checked={requestReadReceipt}
                      onChange={(e) => setRequestReadReceipt(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        Solicitar confirmación de entrega y lectura
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Recibirás un correo automático cuando el destinatario reciba y abra este mensaje
                        (equivalente al "acuse de recibido" de Outlook).
                      </p>
                    </div>
                  </label>
                </Card>
              )}

              {/* Nota informativa */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  El correo se enviará desde la cuenta configurada de la Oficina Jurídica (Microsoft 365).
                  {paraEmails.length > 1 && ' Todos los destinatarios en "Para" recibirán el mensaje.'}
                </p>
              </div>
            </form>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="text-red-500 font-bold">*</span> campos obligatorios
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={enviando}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={enviando}
                style={{ background: '#2962FF', color: '#FFFFFF' }}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar{paraEmails.length > 1 ? ` (${paraEmails.length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmación cancelación ── */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent
          hideCloseButton
          className="p-0 overflow-hidden border-none shadow-2xl z-[10002] rounded-2xl mx-auto"
          style={{ width: '380px', maxWidth: '380px' }}
        >
          <div className="bg-white overflow-hidden w-full">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-red-600" />
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-orange-50 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-all duration-300 shadow-sm border border-orange-100">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                ¿Cancelar envío?
              </h3>
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderán todos los datos ingresados en el mensaje.
              </p>
              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={resetAndClose}
                  className="w-full py-8 !bg-red-600 hover:!bg-red-700 !text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-[0.98] text-lg border-none"
                >
                  Sí, cancelar envío
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
