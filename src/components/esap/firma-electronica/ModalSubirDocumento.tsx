/**
 * ModalSubirDocumento - Modal para Subir Documentos para Firma Electrónica
 * Diseño corporativo ESAP premium
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalSubirDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentoSubido: (documento: any) => void;
}

export function ModalSubirDocumento({ isOpen, onClose, onDocumentoSubido }: ModalSubirDocumentoProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  const tiposDocumento = [
    'Contrato',
    'Convenio',
    'Acta',
    'Resolución',
    'Certificado',
    'Informe',
    'Circular',
    'Memorando',
    'Otro'
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = () => {
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.includes('word') || file.type.includes('document')) {
        setArchivo(file);
        toast.success('📄 Archivo cargado', {
          description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
        });
      } else {
        toast.error('⚠️ Formato no válido', {
          description: 'Solo se aceptan archivos PDF, Word o documentos'
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.includes('word') || file.type.includes('document')) {
        setArchivo(file);
        toast.success('📄 Archivo cargado', {
          description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
        });
      } else {
        toast.error('⚠️ Formato no válido', {
          description: 'Solo se aceptan archivos PDF, Word o documentos'
        });
      }
    }
  };

  const handleSubir = () => {
    // Validaciones
    if (!archivo) {
      toast.error('⚠️ Archivo requerido', {
        description: 'Debes seleccionar un archivo para subir'
      });
      return;
    }

    if (!tipoDocumento) {
      toast.error('⚠️ Tipo de documento requerido', {
        description: 'Debes seleccionar el tipo de documento'
      });
      return;
    }

    // Simular carga
    toast.loading('📤 Subiendo documento...', {
      id: 'subir-documento',
      duration: 2000
    });

    setTimeout(() => {
      const nuevoDocumento = {
        nombre: archivo.name.replace(/\.[^/.]+$/, ''),
        tipo: tipoDocumento,
        tamaño: `${(archivo.size / (1024 * 1024)).toFixed(2)} MB`,
        descripcion
      };

      onDocumentoSubido(nuevoDocumento);

      toast.success('✅ Documento subido exitosamente', {
        id: 'subir-documento',
        description: `${archivo.name} está listo para ser firmado`,
        duration: 4000
      });

      // Limpiar formulario
      setArchivo(null);
      setTipoDocumento('');
      setDescripcion('');
      onClose();
    }, 2000);
  };

  const handleCancelar = () => {
    if (archivo || tipoDocumento || descripcion) {
      if (confirm('⚠️ ¿Estás seguro de cancelar? Se perderán los datos ingresados.')) {
        setArchivo(null);
        setTipoDocumento('');
        setDescripcion('');
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent className="max-w-3xl">
        <DialogDescription className="sr-only">
          Formulario para subir un nuevo documento al sistema de firma electrónica
        </DialogDescription>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#003DA5] to-[#1e5da8]">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black" style={{ color: '#003DA5' }}>
                Subir Documento
              </DialogTitle>
              <p className="text-sm text-gray-600">
                Carga un documento para firma electrónica
              </p>
            </div>
          </div>
          <Button
            onClick={handleCancelar}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Zona de Carga de Archivo */}
          <Card className={`p-8 border-2 border-dashed transition-all ${
            arrastrando 
              ? 'border-blue-500 bg-blue-50' 
              : archivo 
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50'
          }`}>
            {archivo ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h3 className="font-black text-lg text-green-900 mb-2">
                  Archivo Cargado
                </h3>
                <p className="text-sm text-gray-700 mb-1 font-bold">
                  {archivo.name}
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  {(archivo.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setArchivo(null)}
                  className="font-semibold"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cambiar Archivo
                </Button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="text-center"
              >
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="font-black text-lg text-gray-700 mb-2">
                  Arrastra y suelta tu archivo aquí
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  o haz clic en el botón para seleccionar
                </p>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    className="font-bold"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Formatos aceptados: PDF, Word (.doc, .docx)
                </p>
              </div>
            )}
          </Card>

          {/* Información del Documento */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4" style={{ color: '#003DA5' }}>
              Información del Documento
            </h3>

            <div className="space-y-4">
              {/* Tipo de Documento */}
              <div>
                <Label htmlFor="tipoDocumento" className="text-sm font-bold mb-2 block">
                  Tipo de Documento *
                </Label>
                <select
                  id="tipoDocumento"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposDocumento.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción (Opcional) */}
              <div>
                <Label htmlFor="descripcion" className="text-sm font-bold mb-2 block">
                  Descripción <span className="font-normal text-gray-500">(Opcional)</span>
                </Label>
                <Input
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Contrato de prestación de servicios profesionales 2024"
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Información Importante */}
          <Card className="p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900 mb-1">
                  📋 Información Importante
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Una vez subido, podrás firmar el documento electrónicamente</li>
                  <li>Puedes compartir el documento con otras personas para múltiples firmas</li>
                  <li>Todas las firmas quedan registradas con trazabilidad completa</li>
                  <li>El documento original no se modifica, se genera una versión firmada</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Sticky - Botones de Acción */}
        <div className="flex justify-between items-center pt-6 border-t mt-6">
          <div className="text-xs text-gray-500">
            * Campos obligatorios
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelar}
              className="font-semibold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubir}
              disabled={!archivo || !tipoDocumento}
              className="font-bold"
              style={{
                background: archivo && tipoDocumento ? '#003DA5' : '#9CA3AF',
                color: '#FFFFFF',
                cursor: archivo && tipoDocumento ? 'pointer' : 'not-allowed'
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
