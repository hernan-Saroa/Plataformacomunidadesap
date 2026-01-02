/**
 * ModalNuevaComunicacion - Modal para registrar nueva comunicación
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Formulario completo con clasificación automática
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { 
  Mail, FileText, Gavel, Building2, User, Calendar, AlertTriangle,
  Upload, X, Send, Paperclip, Sparkles
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';

type TipoComunicacion = 'JUDICIAL' | 'CORREO' | 'OFICIO';

interface ModalNuevaComunicacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: NuevaComunicacionData) => void;
}

export interface NuevaComunicacionData {
  tipo: TipoComunicacion;
  tipoProceso?: string;
  asunto: string;
  descripcion: string;
  remitente: string;
  despachoOrigen?: string;
  radicadoExterno?: string;
  urgente: boolean;
  documentosAdjuntos?: File[];
}

export function ModalNuevaComunicacion({ isOpen, onClose, onSubmit }: ModalNuevaComunicacionProps) {
  const [formData, setFormData] = useState<Partial<NuevaComunicacionData>>({
    tipo: 'JUDICIAL',
    urgente: false
  });
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.asunto?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el asunto' });
      return;
    }
    if (!formData.remitente?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar el remitente' });
      return;
    }
    if (!formData.descripcion?.trim()) {
      toast.error('⚠️ Error de validación', { description: 'Debe ingresar la descripción' });
      return;
    }

    setEnviando(true);
    
    try {
      // Simulación de envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const nuevaComunicacion: NuevaComunicacionData = {
        tipo: formData.tipo || 'JUDICIAL',
        tipoProceso: formData.tipoProceso,
        asunto: formData.asunto!,
        descripcion: formData.descripcion!,
        remitente: formData.remitente!,
        despachoOrigen: formData.despachoOrigen,
        radicadoExterno: formData.radicadoExterno,
        urgente: formData.urgente || false,
        documentosAdjuntos: archivos
      };

      if (onSubmit) {
        onSubmit(nuevaComunicacion);
      }

      const tipoLabel = {
        JUDICIAL: 'JUD',
        CORREO: 'COR',
        OFICIO: 'OFI'
      }[nuevaComunicacion.tipo];

      const consecutivo = `${tipoLabel}-2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      
      toast.success('✅ Comunicación Registrada', {
        description: `${consecutivo} - ${formData.asunto}`,
        duration: 4000
      });

      // Simulación de clasificación IA
      setTimeout(() => {
        toast.info('🤖 Clasificación Automática', {
          description: 'IA ha clasificado la comunicación y sugiere derivarla al módulo correspondiente',
          duration: 3000
        });
      }, 2000);

      // Resetear formulario
      setFormData({
        tipo: 'JUDICIAL',
        urgente: false
      });
      setArchivos([]);
      
      onClose();
    } catch (error) {
      toast.error('❌ Error al registrar comunicación', {
        description: 'Por favor intente nuevamente'
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
    if (formData.asunto || formData.descripcion) {
      if (!window.confirm('¿Está seguro que desea cancelar? Se perderán los datos ingresados.')) {
        return;
      }
    }
    setFormData({
      tipo: 'JUDICIAL',
      urgente: false
    });
    setArchivos([]);
    onClose();
  };

  const getTipoIcon = () => {
    switch (formData.tipo) {
      case 'JUDICIAL': return Gavel;
      case 'CORREO': return Mail;
      case 'OFICIO': return FileText;
      default: return Mail;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Nueva Comunicación</DialogTitle>
          <DialogDescription>Registrar nueva comunicación jurídica</DialogDescription>
        </DialogHeader>

        {/* HEADER LIMPIO ESAP 2025 */}
        <ModalHeaderClean
          icono={getTipoIcon()}
          titulo="Nueva Comunicación"
          subtitulo="Registrar comunicación jurídica entrante"
          colorIcono="blue"
          onClose={onClose}
        />

        {/* CONTENIDO */}
        <div className="p-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Comunicación */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Tipo de Comunicación</h3>
                  <p className="text-sm text-gray-600">Clasificación automática habilitada</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-bold text-gray-700">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoComunicacion })}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JUDICIAL">⚖️ Judicial (Juzgados)</SelectItem>
                      <SelectItem value="CORREO">📧 Correo Electrónico</SelectItem>
                      <SelectItem value="OFICIO">📄 Oficio Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo === 'JUDICIAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="tipoProceso" className="text-sm font-bold text-gray-700">
                      Tipo de Proceso
                    </Label>
                    <Select
                      value={formData.tipoProceso}
                      onValueChange={(value) => setFormData({ ...formData, tipoProceso: value })}
                    >
                      <SelectTrigger id="tipoProceso">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Acción Popular">Acción Popular</SelectItem>
                        <SelectItem value="NRD">Nulidad y Restablecimiento</SelectItem>
                        <SelectItem value="Laboral">Laboral</SelectItem>
                        <SelectItem value="Tutela">Tutela</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgente"
                  checked={formData.urgente}
                  onChange={(e) => setFormData({ ...formData, urgente: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="urgente" className="text-sm font-bold text-gray-700 cursor-pointer">
                  🔴 Marcar como urgente
                </Label>
              </div>
            </Card>

            {/* Información del Remitente */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Información del Remitente</h3>
                  <p className="text-sm text-gray-600">Origen de la comunicación</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remitente" className="text-sm font-bold text-gray-700">
                    Remitente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="remitente"
                    placeholder="Ej: Juzgado 10 Administrativo de Bogotá"
                    value={formData.remitente || ''}
                    onChange={(e) => setFormData({ ...formData, remitente: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="despacho" className="text-sm font-bold text-gray-700">
                      Despacho de Origen
                    </Label>
                    <Input
                      id="despacho"
                      placeholder="Ej: Juzgado 10 Admin. Bogotá"
                      value={formData.despachoOrigen || ''}
                      onChange={(e) => setFormData({ ...formData, despachoOrigen: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="radicado" className="text-sm font-bold text-gray-700">
                      Radicado Externo
                    </Label>
                    <Input
                      id="radicado"
                      placeholder="Ej: 25000-33-10-001-2024-00234-00"
                      value={formData.radicadoExterno || ''}
                      onChange={(e) => setFormData({ ...formData, radicadoExterno: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Contenido */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">Contenido de la Comunicación</h3>
                  <p className="text-sm text-gray-600">Asunto y descripción detallada</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asunto" className="text-sm font-bold text-gray-700">
                    Asunto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="asunto"
                    placeholder="Asunto de la comunicación"
                    value={formData.asunto || ''}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="text-sm font-bold text-gray-700">
                    Descripción <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describa el contenido de la comunicación..."
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={6}
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
                  <h3 className="font-bold text-gray-900">Documentos Adjuntos</h3>
                  <p className="text-sm text-gray-600">Adjuntar archivos relacionados</p>
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
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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

            {/* Información */}
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-900">Clasificación Automática IA</h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc pl-5">
                    <li>El sistema analizará el contenido y sugerirá el módulo destino</li>
                    <li>Las comunicaciones urgentes se priorizan automáticamente</li>
                    <li>Se notificará al responsable correspondiente</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={enviando}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando}
                className="gap-2"
                style={{ background: '#2962FF', color: '#FFFFFF' }}
              >
                {enviando ? (
                  <>
                    <Calendar className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Registrar Comunicación
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
