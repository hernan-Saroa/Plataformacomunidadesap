import { useState } from 'react';
import { X, Upload, FileText, Check, Eye, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';

interface UploadCVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadCVModal({ isOpen, onClose }: UploadCVModalProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Mock - CV existente
  const [existingCV, setExistingCV] = useState<{
    name: string;
    uploadDate: string;
    size: number;
  } | null>({
    name: 'CV_Juan_Perez_2025.pdf',
    uploadDate: '15 Nov 2025',
    size: 2.3,
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5MB');
      return;
    }

    setCvFile(file);
    toast.success('Archivo seleccionado correctamente');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!cvFile) {
      toast.error('Selecciona un archivo para subir');
      return;
    }

    setIsUploading(true);

    // Simular carga
    setTimeout(() => {
      setExistingCV({
        name: cvFile.name,
        uploadDate: new Date().toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        size: cvFile.size / 1024 / 1024,
      });
      setCvFile(null);
      setIsUploading(false);
      toast.success('¡Hoja de vida actualizada exitosamente!', {
        description: 'Tu CV estará disponible para todas tus aplicaciones.',
        duration: 4000,
      });
      onClose();
    }, 2000);
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de eliminar tu hoja de vida?')) {
      setExistingCV(null);
      toast.info('Hoja de vida eliminada', {
        description: 'Deberás subir un nuevo CV para aplicar a ofertas.',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900">Gestionar Hoja de Vida</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sube tu CV para aplicar rápidamente a ofertas laborales
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* CV Existente */}
          {existingCV && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <h3 className="font-semibold text-green-900">CV Actual</h3>
                  </div>
                  <p className="text-sm text-green-700 font-medium truncate">
                    {existingCV.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Subido el {existingCV.uploadDate} • {existingCV.size.toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-700 hover:text-green-800 hover:bg-green-100"
                    onClick={() => toast.info('Vista previa', { description: 'Función en desarrollo' })}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              {existingCV ? 'Actualizar Hoja de Vida' : 'Subir Hoja de Vida'}
            </h3>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive
                  ? 'border-[#003DA5] bg-blue-50'
                  : cvFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="cv-upload-main"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {cvFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="w-6 h-6" />
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-700">
                      {cvFile.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCvFile(null)}
                  >
                    Seleccionar otro archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-gray-700 mb-1">
                      Arrastra tu CV aquí o{' '}
                      <label
                        htmlFor="cv-upload-main"
                        className="text-[#003DA5] font-semibold cursor-pointer hover:underline"
                      >
                        selecciona un archivo
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">
                      Solo archivos PDF, máximo 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Recomendaciones para tu CV
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Incluye información de contacto actualizada</li>
              <li>• Destaca tu experiencia relevante en el sector público</li>
              <li>• Menciona tu formación académica en ESAP</li>
              <li>• Formato PDF profesional, máximo 2-3 páginas</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              className="flex-1 bg-[#003DA5] hover:bg-[#002d7a] gap-2"
              disabled={!cvFile || isUploading}
            >
              {isUploading ? (
                'Subiendo...'
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {existingCV ? 'Actualizar CV' : 'Subir CV'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
