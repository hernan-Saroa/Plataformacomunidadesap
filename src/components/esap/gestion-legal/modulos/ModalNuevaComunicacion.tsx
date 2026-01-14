/**
 * ModalNuevaComunicacion - Modal para ENVIAR correo electrónico
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Estilo Gmail/Outlook - Redactar correo
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Mail, FileText, User, Calendar, AlertTriangle,
  Upload, X, Send, Paperclip, Loader2
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { ModalHeaderClean } from './ModalHeaderClean';
import { correosJuridicosService } from '../../../../services/api/legal.service';

interface ModalNuevaComunicacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NuevaComunicacionData) => void;
}

export interface NuevaComunicacionData {
  para: string;
  cc?: string;
  asunto: string;
  cuerpo: string;
  archivos?: File[];
}

export function ModalNuevaComunicacion({ isOpen, onClose, onSubmit }: ModalNuevaComunicacionProps) {
  const [formData, setFormData] = useState<Partial<NuevaComunicacionData>>({});
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);

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
    if (!formData.asunto?.trim()) {
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

      // Llamar API real
      const result = await correosJuridicosService.sendEmail({
        to: formData.para.trim(),
        subject: formData.asunto.trim(),
        body: formData.cuerpo.trim(),
        cc: ccArray,
        attachments: attachmentsBase64.length > 0 ? attachmentsBase64 : undefined
      });

      // El API puede devolver { success: true } o simplemente no lanzar error
      const isSuccess = result?.success !== false;

      if (isSuccess) {
        toast.success('✅ Correo enviado exitosamente', {
          description: `Para: ${formData.para}${archivos.length > 0 ? ` (${archivos.length} adjuntos)` : ''}`,
          duration: 4000
        });

        // Callback opcional
        if (onSubmit) {
          onSubmit({
            para: formData.para,
            cc: formData.cc,
            asunto: formData.asunto,
            cuerpo: formData.cuerpo,
            archivos
          });
        }

        // Resetear formulario
        setFormData({});
        setArchivos([]);
        onClose();
      } else {
        throw new Error('El servidor indicó que no pudo enviar el correo');
      }
    } catch (error) {
      console.error('Error enviando correo:', error);
      toast.error('❌ Error al enviar el correo', {
        description: 'Por favor intente nuevamente. Verifique que tiene permisos Mail.Send en Azure.'
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
      if (!window.confirm('¿Está seguro que desea cancelar? Se perderán los datos ingresados.')) {
        return;
      }
    }
    setFormData({});
    setArchivos([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-2xl h-[90vh] flex flex-col p-0">
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
  );
}
