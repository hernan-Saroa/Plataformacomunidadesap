/**
 * ModalNuevaComunicacion - Modal para ENVIAR correo electrónico
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Estilo Gmail/Outlook - Redactar correo
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail, FileText, User, Calendar, AlertTriangle,
  Upload, X, Send, Paperclip, Loader2, AlertCircle
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
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

export function ModalNuevaComunicacion({ isOpen, onClose, onSubmit, initialData }: ModalNuevaComunicacionProps) {
  const [formData, setFormData] = useState<Partial<NuevaComunicacionData>>(initialData || {});
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Update form data when initialData or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setArchivos([]);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.para?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el destinatario (Para)' });
      return;
    }
    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.para.trim())) {
      toast.error('⚠️ Error de validación', { description: 'El destinatario debe ser un email válido' });
      return;
    }
    // Asunto validation is skipped for reply/forward if the system provides it, but here it's enforced
    if (!formData.asunto?.trim() && !formData.isForward) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el asunto' });
      return;
    }
    if (!formData.cuerpo?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el cuerpo del mensaje' });
      return;
    }

    setEnviando(true);

    try {
      // Preparar CC como array
      const ccArray = formData.cc
        ? formData.cc.split(',').map(e => e.trim()).filter(Boolean)
        : undefined;

      // Convertir archivos a base64 para envío
      const attachmentsBase64 = await Promise.all(
        archivos.map(async (file) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remover el prefijo "data:...;base64,"
              const base64Data = result.split(',')[1];
              resolve(base64Data);
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

      let isSuccess = false;

      // Llamar API real según si es Forward, Reply o Send
      if (formData.isForward && formData.originalCorreoId) {
        // Para Reenviar
        const result = await correosJuridicosService.forwardEmail(
          formData.originalCorreoId,
          formData.para.trim(),
          formData.cuerpo.trim()
        );
        isSuccess = result?.success !== false;
      } else if (formData.isReply && formData.originalCorreoId) {
        // Para Responder (usa endpoint de reply que marca isReplied en el original)
        const result = await correosJuridicosService.replyEmail(
          formData.originalCorreoId,
          formData.cuerpo.trim(),
          attachmentsBase64.length > 0 ? attachmentsBase64 : undefined
        );
        isSuccess = result?.success !== false;
      } else {
        // Para Nuevo correo
        const result = await correosJuridicosService.sendEmail({
          to: formData.para.trim(),
          subject: formData.asunto?.trim() || 'Sin Asunto',
          body: formData.cuerpo.trim(),
          cc: ccArray,
          attachments: attachmentsBase64.length > 0 ? attachmentsBase64 : undefined
        });
        isSuccess = result?.success !== false;
      }

      if (isSuccess) {
        toast.success(formData.isForward ? '✅ Correo reenviado exitosamente' : '✅ Correo enviado exitosamente', {
          description: `Para: ${formData.para}${archivos.length > 0 ? ` (${archivos.length} adjuntos)` : ''}`,
          duration: 4000
        });

        // Callback opcional
        if (onSubmit) {
          onSubmit({
            para: formData.para,
            cc: formData.cc,
            asunto: formData.asunto || '',
            cuerpo: formData.cuerpo,
            archivos,
            isForward: formData.isForward,
            isReply: formData.isReply,
            originalCorreoId: formData.originalCorreoId
          });
        }

        // Resetear formulario
        setFormData({});
        setArchivos([]);
        onClose();
      } else {
        throw new Error('El servidor indicó que no pudo procesar la solicitud');
      }
    } catch (error) {
      console.error('Error enviando/reenviando correo:', error);
      toast.error('❌ Error al procesar el correo', {
        description: 'Por favor intente nuevamente. Verifique que tiene conexión.'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setArchivos([...archivos, ...nuevosArchivos]);
      toast.success(`${nuevosArchivos.length} archivo(s) agregado(s)`);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    const nuevosArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevosArchivos);
  };

  const handleCancel = () => {
    if (formData.asunto || formData.cuerpo || formData.para) {
      setShowCancelConfirm(true);
    } else {
      setFormData({});
      setArchivos([]);
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    setFormData({});
    setArchivos([]);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[650px] lg:max-w-2xl h-[90vh] flex flex-col p-0">
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
          badges={[]}
          onClose={onClose}
        />

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Destinatarios */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <User className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Destinatarios</h3>
                  <p className="text-sm text-gray-600">Correo(s) de destino</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="para" className="text-sm font-bold text-gray-700">
                    Para <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="para"
                    type="email"
                    placeholder="destinatario@ejemplo.com"
                    value={formData.para || ''}
                    onChange={(e) => setFormData({ ...formData, para: e.target.value })}
                    required
                    readOnly={formData.isReply}
                    className={formData.isReply ? "bg-gray-100 cursor-not-allowed text-gray-600" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc" className="text-sm font-bold text-gray-700">
                    CC <span className="text-gray-400 font-normal">(opcional, separar con comas)</span>
                  </Label>
                  <Input
                    id="cc"
                    placeholder="copia1@ejemplo.com, copia2@ejemplo.com"
                    value={formData.cc || ''}
                    onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  />
                </div>
              </div>
            </Card>

            {/* Contenido */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Contenido del Correo</h3>
                  <p className="text-sm text-gray-600">Asunto y mensaje</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asunto" className="text-sm font-bold text-gray-700">
                    Asunto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="asunto"
                    placeholder="Asunto del correo"
                    value={formData.asunto || ''}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuerpo" className="text-sm font-bold text-gray-700">
                    Mensaje <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="cuerpo"
                    placeholder="Escriba aquí el contenido del correo..."
                    value={formData.cuerpo || ''}
                    onChange={(e) => setFormData({ ...formData, cuerpo: e.target.value })}
                    rows={8}
                    required
                    className="resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* Documentos Adjuntos */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <Paperclip className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Archivos Adjuntos</h3>
                  <p className="text-sm text-gray-600">Adjuntar documentos al correo (opcional)</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivos
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  onChange={handleArchivoChange}
                  className="hidden"
                />

                {archivos.length > 0 && (
                  <div className="space-y-2">
                    {archivos.map((archivo, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm text-gray-700 truncate">{archivo.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarArchivo(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Nota informativa */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-blue-900">Información</h4>
                  <p className="text-sm text-blue-800">
                    El correo se enviará desde la cuenta configurada de la Oficina Jurídica (Microsoft 365).
                  </p>
                </div>
              </div>
            </Card>
          </form>
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
            >
              <X className="w-4 h-4 mr-2" />
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
                  Enviar Correo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
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
                ¿Cancelar envío?
              </h3>
              
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderán todos los datos ingresados en el mensaje.
              </p>

              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleConfirmCancel}
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
