import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Image as ImageIcon, File, Check, AlertCircle,
  IdCard, GraduationCap, FileCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadData) => void;
}

interface UploadData {
  category: 'personal' | 'academic' | 'certification';
  file: File;
  name: string;
  description: string;
}

export function UploadDocumentModal({ isOpen, onClose, onUpload }: UploadDocumentModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'personal' | 'academic' | 'certification' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const categories = [
    {
      id: 'personal' as const,
      label: 'Documentos Personales',
      description: 'Cédula, RUT, Libreta Militar, etc.',
      icon: IdCard,
      color: '#1e5da8',
      bgColor: '#eff6ff',
    },
    {
      id: 'academic' as const,
      label: 'Documentos Académicos',
      description: 'Diplomas, Actas, Certificados académicos',
      icon: GraduationCap,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      id: 'certification' as const,
      label: 'Certificaciones',
      description: 'Certificados profesionales, cursos',
      icon: FileCheck,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
  ];

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos PDF, JPG, PNG y DOC',
      });
      return;
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      toast.error('Archivo demasiado grande', {
        description: 'El tamaño máximo permitido es 5MB',
      });
      return;
    }

    setSelectedFile(file);
    if (!documentName) {
      setDocumentName(file.name);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast.error('Selecciona una categoría', {
        description: 'Debes seleccionar la categoría del documento',
      });
      return;
    }

    if (!selectedFile) {
      toast.error('Selecciona un archivo', {
        description: 'Debes seleccionar un archivo para cargar',
      });
      return;
    }

    if (!documentName.trim()) {
      toast.error('Ingresa un nombre', {
        description: 'Debes ingresar un nombre para el documento',
      });
      return;
    }

    setIsUploading(true);

    // Simular carga
    await new Promise(resolve => setTimeout(resolve, 2000));

    onUpload({
      category: selectedCategory,
      file: selectedFile,
      name: documentName,
      description: description,
    });

    toast.success('Documento cargado exitosamente', {
      description: `${documentName} ha sido agregado a la carpeta digital`,
    });

    setIsUploading(false);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedFile(null);
    setDocumentName('');
    setDescription('');
    setIsUploading(false);
    onClose();
  };

  const getFileIcon = (file: File | null) => {
    if (!file) return File;
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type === 'application/pdf') return FileText;
    return File;
  };

  const FileIcon = getFileIcon(selectedFile);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Cargar Nuevo Documento</h2>
                  <p className="text-sm text-blue-100">Selecciona la categoría y sube el archivo</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Seleccionar Categoría */}
            <div>
              <label className="block font-bold text-gray-900 mb-3">
                1. Selecciona la Categoría del Documento
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all text-left
                        ${isSelected 
                          ? 'border-current shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      style={{
                        backgroundColor: isSelected ? category.bgColor : 'white',
                        borderColor: isSelected ? category.color : undefined,
                      }}
                    >
                      {isSelected && (
                        <div 
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: isSelected ? category.color : category.bgColor }}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={{ color: isSelected ? 'white' : category.color }}
                        />
                      </div>
                      
                      <h3 
                        className="font-bold mb-1 text-sm"
                        style={{ color: isSelected ? category.color : '#111827' }}
                      >
                        {category.label}
                      </h3>
                      <p className="text-xs text-gray-600">{category.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Cargar Archivo */}
            <div>
              <label className="block font-bold text-gray-900 mb-3">
                2. Selecciona el Archivo
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 transition-all
                  ${dragActive 
                    ? 'border-[#1e5da8] bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileInputChange}
                />

                {selectedFile ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-8 h-8 text-[#1e5da8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer block text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 mb-1">
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-600">
                      PDF, JPG, PNG o DOC (máx. 5MB)
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Step 3: Información del Documento */}
            <div className="space-y-4">
              <label className="block font-bold text-gray-900 mb-3">
                3. Información del Documento
              </label>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Documento *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ej: Cédula de Ciudadanía"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agrega una descripción o notas adicionales..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Información Importante</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Los documentos se almacenan de forma segura</li>
                  <li>Tamaño máximo por archivo: 5MB</li>
                  <li>Formatos permitidos: PDF, JPG, PNG, DOC</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isUploading || !selectedCategory || !selectedFile}
                className="px-6 py-3 bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Cargar Documento
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}