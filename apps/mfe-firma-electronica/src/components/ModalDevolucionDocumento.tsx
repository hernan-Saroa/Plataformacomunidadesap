/**
 * ModalDevolucionDocumento - Modal para Devolver Documentos con Comentarios
 * Permite al usuario rechazar y devolver documentos con observaciones
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { X, XCircle, Send, AlertCircle, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ModalDevolucionDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onDevolucionEnviada: (comentarios: string) => void;
}

export function ModalDevolucionDocumento({
  isOpen,
  onClose,
  documento,
  onDevolucionEnviada
}: ModalDevolucionDocumentoProps) {
  const [comentarios, setComentarios] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const motivosComunes = [
    'Información incompleta',
    'Datos incorrectos',
    'Requiere modificaciones',
    'Falta documentación adjunta',
    'No corresponde a mi área',
    'Otro motivo'
  ];

  const handleEnviar = () => {
    if (!motivo) {
      toast.error('⚠️ Selecciona un motivo', {
        description: 'Debes seleccionar un motivo de devolución'
      });
      return;
    }

    if (!comentarios.trim()) {
      toast.error('⚠️ Comentarios requeridos', {
        description: 'Debes agregar comentarios explicando el motivo de la devolución'
      });
      return;
    }

    if (comentarios.trim().length < 20) {
      toast.error('⚠️ Comentarios muy cortos', {
        description: 'Los comentarios deben tener al menos 20 caracteres'
      });
      return;
    }

    setEnviando(true);
    toast.loading('📤 Enviando devolución...', { id: 'devolucion', duration: 2500 });

    setTimeout(() => {
      console.log('📤 DOCUMENTO DEVUELTO:');
      console.log('Documento:', documento.id);
      console.log('Motivo:', motivo);
      console.log('Comentarios:', comentarios);
      console.log('Remitente:', documento.remitente);

      toast.success('✅ Documento devuelto exitosamente', {
        id: 'devolucion',
        description: `Se notificó a ${documento.remitente} sobre tu devolución`,
        duration: 5000
      });

      onDevolucionEnviada(comentarios);
      
      // Limpiar formulario
      setComentarios('');
      setMotivo('');
      setEnviando(false);
    }, 2500);
  };

  const handleCancelar = () => {
    if (motivo || comentarios.trim()) {
      if (confirm('⚠️ ¿Estás seguro de cancelar? Se perderá la información ingresada.')) {
        setComentarios('');
        setMotivo('');
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Modal para devolver el documento {documento.nombre} con comentarios
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white/20">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">
                  Devolver Documento con Comentarios
                </DialogTitle>
                <p className="text-sm text-red-100 mt-1">
                  Explica el motivo de la devolución para que el remitente pueda corregir
                </p>
              </div>
            </div>
            <Button
              onClick={handleCancelar}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              disabled={enviando}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información del Documento */}
          <Card className="p-5 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  📄 Documento a devolver
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Nombre:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.nombre}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">ID:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.id}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Remitente:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.remitente}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Cargo:</span>
                    <span className="ml-2 font-bold text-blue-900">{documento.cargoRemitente}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Advertencia */}
          <Card className="p-4 bg-red-50 border-2 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900 mb-1">
                  ⚠️ Importante antes de devolver
                </p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>El remitente será notificado inmediatamente sobre la devolución</li>
                  <li>Tus comentarios serán visibles para el remitente</li>
                  <li>El documento volverá al remitente para correcciones</li>
                  <li>Debes proporcionar comentarios claros y específicos</li>
                  <li>Esta acción es definitiva y quedará registrada</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Motivo de Devolución */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
              Motivo de Devolución *
            </h3>
            <Label className="text-sm text-gray-600 mb-3 block">
              Selecciona el motivo principal de la devolución
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {motivosComunes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  disabled={enviando}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all text-left ${
                    motivo === m
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50'
                  } ${enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {motivo === m ? '✓ ' : ''}{m}
                </button>
              ))}
            </div>
          </Card>

          {/* Comentarios Detallados */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
              Comentarios Detallados *
            </h3>
            <Label htmlFor="comentarios" className="text-sm text-gray-600 mb-2 block">
              Explica detalladamente el motivo de la devolución. Sé específico sobre qué debe corregirse o completarse.
            </Label>
            <textarea
              id="comentarios"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Ej: El documento presenta las siguientes observaciones:&#10;1. En la cláusula tercera, falta especificar el plazo de ejecución.&#10;2. El valor del contrato no coincide con el presupuesto aprobado.&#10;3. Falta anexar el certificado de disponibilidad presupuestal.&#10;&#10;Por favor, corregir estos puntos y reenviar el documento."
              rows={8}
              disabled={enviando}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {comentarios.length} / 1000 caracteres • Mínimo 20 caracteres
              </p>
              {comentarios.length >= 20 && (
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Comentario suficiente
                </p>
              )}
            </div>
          </Card>

          {/* Resumen */}
          <Card className="p-5 bg-orange-50 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-900 mb-2">
                  📊 Resumen de Devolución
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-orange-700">Documento:</span>
                    <span className="ml-2 font-bold text-orange-900">{documento.id}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Se notificará a:</span>
                    <span className="ml-2 font-bold text-orange-900">{documento.remitente}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Motivo:</span>
                    <span className="ml-2 font-bold text-orange-900">{motivo || 'No seleccionado'}</span>
                  </div>
                  <div>
                    <span className="text-orange-700">Método:</span>
                    <span className="ml-2 font-bold text-orange-900">Correo electrónico</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Sticky */}
        <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            * Campos obligatorios
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={enviando}
              className="font-semibold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={!motivo || !comentarios.trim() || comentarios.length < 20 || enviando}
              className="font-bold"
              style={{
                background: motivo && comentarios.trim() && comentarios.length >= 20 && !enviando ? '#EF4444' : '#9CA3AF',
                color: '#FFFFFF',
                cursor: motivo && comentarios.trim() && comentarios.length >= 20 && !enviando ? 'pointer' : 'not-allowed'
              }}
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Devolver Documento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
