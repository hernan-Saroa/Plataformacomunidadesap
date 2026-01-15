/**
 * ModalRespuestaOrgano - Elaboración de respuesta al órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Textarea } from '../../../ui/textarea';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import {
  Send, X, FileText, CheckCircle, AlertCircle, Upload, Eye,
  Mail, Calendar, User, Building2, Clock, Save, Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ModalRespuestaOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  organismoNombre: string;
}

export function ModalRespuestaOrgano({
  isOpen,
  onClose,
  requerimientoId,
  organismoNombre
}: ModalRespuestaOrganoProps) {
  const [contenidoRespuesta, setContenidoRespuesta] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [cargo, setCargo] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState('completa');
  const [documentosAdjuntos, setDocumentosAdjuntos] = useState<string[]>([]);

  // Template de respuesta
  const aplicarTemplate = () => {
    const template = `Bogotá D.C., ${new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}

Señor(a)
${destinatario || '[NOMBRE DEL DESTINATARIO]'}
${cargo || '[CARGO]'}
${organismoNombre}

Ref: ${requerimientoId}
     Asunto: Respuesta a requerimiento

Respetado(a) señor(a):

En atención al oficio de la referencia, mediante el cual solicita [DESCRIBIR LA SOLICITUD], me permito dar respuesta en los siguientes términos:

[CONTENIDO DE LA RESPUESTA]

1. ANTECEDENTES
[Describir el contexto y antecedentes relevantes]

2. RESPUESTA A LO SOLICITADO
[Responder punto por punto lo requerido]

3. CONCLUSIONES
[Síntesis de la respuesta]

Para mayor información, se adjuntan los siguientes documentos:
- [Listar documentos adjuntos]

Cualquier información adicional que requiera, estamos atentos.

Atentamente,

[FIRMA]
[NOMBRE Y CARGO DEL FIRMANTE]
Escuela Superior de Administración Pública - ESAP`;

    setContenidoRespuesta(template);
    toast.success('Template aplicado', {
      description: 'Plantilla de respuesta cargada correctamente',
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const handleGuardarBorrador = () => {
    toast.success('Borrador guardado', {
      description: 'La respuesta ha sido guardada como borrador',
      icon: <Save className="w-4 h-4" />
    });
  };

  const handleEnviarRespuesta = () => {
    if (!contenidoRespuesta.trim()) {
      toast.error('Contenido requerido', {
        description: 'Debe escribir el contenido de la respuesta',
        icon: <AlertCircle className="w-4 h-4" />
      });
      return;
    }

    toast.success('Respuesta enviada', {
      description: 'La respuesta ha sido enviada al órgano de control',
      icon: <Send className="w-4 h-4" />
    });
    
    // Cerrar modal después de enviar
    setTimeout(() => onClose(), 1500);
  };

  const handleAdjuntarDocumento = () => {
    const nuevoDoc = `Documento_${Date.now()}.pdf`;
    setDocumentosAdjuntos([...documentosAdjuntos, nuevoDoc]);
    toast.success('Documento adjuntado', {
      description: nuevoDoc,
      icon: <Upload className="w-4 h-4" />
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          Elaborar Respuesta al Requerimiento {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para elaborar y enviar respuesta oficial al requerimiento {requerimientoId} del órgano de control {organismoNombre}.
        </DialogDescription>
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 border-2 border-green-200 rounded-lg">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Elaborar Respuesta</h2>
              <p className="text-sm text-gray-600">{requerimientoId} • {organismoNombre}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          
          {/* INFORMACIÓN DEL REQUERIMIENTO */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 flex-1">
                <p className="font-bold mb-1">📋 Información del Requerimiento</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-700 mt-2">
                  <div>
                    <span className="font-semibold">Radicado:</span> {requerimientoId}
                  </div>
                  <div>
                    <span className="font-semibold">Órgano:</span> {organismoNombre}
                  </div>
                  <div>
                    <span className="font-semibold">Plazo:</span> 5 días restantes ⏰
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TIPO DE RESPUESTA */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">Tipo de Respuesta</label>
            <Select value={tipoRespuesta} onValueChange={setTipoRespuesta}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completa">✅ Respuesta Completa</SelectItem>
                <SelectItem value="parcial">⚠️ Respuesta Parcial (requiere información adicional)</SelectItem>
                <SelectItem value="termino">⏰ Solicitud de Ampliación de Término</SelectItem>
                <SelectItem value="impedimento">🚫 Impedimento Legal para Responder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DATOS DEL DESTINATARIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                <User className="w-4 h-4 text-gray-600" />
                Destinatario
              </label>
              <Input
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="Nombre completo del funcionario"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                <Building2 className="w-4 h-4 text-gray-600" />
                Cargo
              </label>
              <Input
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej: Director de Control Fiscal"
              />
            </div>
          </div>

          {/* BOTÓN PARA APLICAR TEMPLATE */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={aplicarTemplate}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Aplicar Template Oficial
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info('Vista previa de respuesta')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Vista Previa
            </Button>
          </div>

          {/* EDITOR DE CONTENIDO */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <Mail className="w-4 h-4 text-gray-600" />
              Contenido de la Respuesta
            </label>
            <Textarea
              value={contenidoRespuesta}
              onChange={(e) => setContenidoRespuesta(e.target.value)}
              placeholder="Escriba aquí el contenido de la respuesta oficial al órgano de control..."
              rows={16}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              {contenidoRespuesta.length} caracteres • Se recomienda usar el template oficial
            </p>
          </div>

          {/* DOCUMENTOS ADJUNTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                <Upload className="w-4 h-4 text-gray-600" />
                Documentos Adjuntos ({documentosAdjuntos.length})
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdjuntarDocumento}
              >
                <Upload className="w-3 h-3 mr-1" />
                Adjuntar
              </Button>
            </div>

            {documentosAdjuntos.length > 0 ? (
              <div className="space-y-2">
                {documentosAdjuntos.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-900">{doc}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentosAdjuntos(documentosAdjuntos.filter((_, i) => i !== idx));
                        toast.info('Documento removido');
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay documentos adjuntos</p>
                <p className="text-xs text-gray-400 mt-1">
                  Los documentos de soporte fortalecen la respuesta
                </p>
              </div>
            )}
          </div>

          {/* CHECKLIST DE VERIFICACIÓN */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-bold text-sm text-yellow-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              ✅ Checklist de Verificación antes de Enviar
            </p>
            <div className="space-y-2 text-xs text-yellow-800">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>La respuesta responde TODOS los puntos solicitados en el requerimiento</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>Se adjuntan los documentos de soporte necesarios</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>La redacción es clara, precisa y profesional</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>Los datos y cifras están verificados con las áreas técnicas</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>El formato cumple con los estándares institucionales</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
                <span>La respuesta se envía dentro del término legal</span>
              </label>
            </div>
          </div>

          {/* INFORMACIÓN LEGAL */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900">
                <p className="font-bold mb-1">⚖️ Consideraciones Legales:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-700">
                  <li>La respuesta debe ser completa, veraz y oportuna</li>
                  <li>El incumplimiento del término puede generar sanciones institucionales</li>
                  <li>Toda información suministrada debe estar soportada documentalmente</li>
                  <li>La respuesta debe ser firmada por el funcionario competente</li>
                  <li>Se recomienda conservar constancia de entrega al órgano de control</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGuardarBorrador}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info('Exportando documento...')}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              onClick={handleEnviarRespuesta}
              style={{ background: '#10B981' }}
              className="text-white"
              disabled={!contenidoRespuesta.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Respuesta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

