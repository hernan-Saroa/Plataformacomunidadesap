import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  FileText,
  Users,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface CargaMasivaDocentesProps {
  className?: string;
  onClose?: () => void;
  onComplete?: (data: any) => void;
}

type Step = 'upload' | 'preview' | 'processing' | 'result';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function CargaMasivaDocentes({ className = '', onClose, onComplete }: CargaMasivaDocentesProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState({
    total: 0,
    exitosos: 0,
    errores: 0,
    advertencias: 0
  });

  // Mock validation data
  const mockValidationErrors: ValidationError[] = [
    { row: 3, field: 'email', message: 'Email inválido', severity: 'error' },
    { row: 5, field: 'documento', message: 'Documento duplicado', severity: 'error' },
    { row: 8, field: 'telefono', message: 'Formato de teléfono incorrecto', severity: 'warning' },
    { row: 12, field: 'territorial', message: 'Territorial no encontrada', severity: 'error' }
  ];

  const mockPreviewData = [
    { 
      nombres: 'Juan Carlos', 
      apellidos: 'Pérez Gómez', 
      documento: '1234567890',
      email: 'juan.perez@esap.edu.co',
      territorial: 'Bogotá',
      estado: 'Activo'
    },
    { 
      nombres: 'María Claudia', 
      apellidos: 'López Silva', 
      documento: '0987654321',
      email: 'maria.lopez@esap.edu.co',
      territorial: 'Medellín',
      estado: 'Activo'
    },
    { 
      nombres: 'Carlos Alberto', 
      apellidos: 'Ruiz Pérez', 
      documento: '1122334455',
      email: 'carlos.ruiz@esap.edu.co',
      territorial: 'Cali',
      estado: 'Activo'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileSize(file.size);
      
      // Simular upload
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentStep('preview');
            setValidationErrors(mockValidationErrors);
            setPreviewData(mockPreviewData);
          }, 500);
        }
      }, 200);
    }
  };

  const handleProcess = () => {
    setCurrentStep('processing');
    
    // Simular procesamiento
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setProcessingProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setCurrentStep('result');
          setResults({
            total: 50,
            exitosos: 46,
            errores: 2,
            advertencias: 2
          });
        }, 500);
      }
    }, 100);
  };

  const downloadTemplate = () => {
    // En producción, esto descargaría un archivo Excel
    console.log('Descargando plantilla...');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Carga Masiva de Docentes</h2>
              <p className="text-white/80 text-sm">Importa múltiples docentes desde Excel</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[
              { id: 'upload', label: 'Cargar', icon: Upload },
              { id: 'preview', label: 'Validar', icon: FileText },
              { id: 'processing', label: 'Procesar', icon: Loader2 },
              { id: 'result', label: 'Resultado', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = 
                (currentStep === 'preview' && index < 1) ||
                (currentStep === 'processing' && index < 2) ||
                (currentStep === 'result' && index < 3);
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 ${index !== 0 ? 'ml-2' : ''}`}>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-white text-[#1e5da8]'
                          : isActive
                          ? 'bg-white text-[#1e5da8] ring-4 ring-white/30'
                          : 'bg-white/30 text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{step.label}</span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-all ${
                        isCompleted ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Download Template */}
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">Descarga la Plantilla</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Descarga la plantilla Excel con el formato correcto para la carga masiva.
                        Incluye todos los campos requeridos y ejemplos.
                      </p>
                      <Button onClick={downloadTemplate} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Plantilla Excel
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-[#1e5da8] transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Arrastra tu archivo aquí o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Formatos soportados: Excel (.xlsx, .xls) o CSV
                    </p>
                    <Button className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
                      Seleccionar Archivo
                    </Button>
                  </label>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{fileName}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(fileSize)}</p>
                      </div>
                      <span className="text-sm font-medium text-[#1e5da8]">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </Card>
                )}

                {/* Requirements */}
                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Requisitos del Archivo</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Debe incluir todas las columnas de la plantilla</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Los emails deben ser únicos y válidos (@esap.edu.co)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Los documentos no deben estar duplicados en el sistema</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Las territoriales deben corresponder a las oficiales de ESAP</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Máximo 500 registros por archivo</span>
                    </li>
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Preview & Validation */}
            {currentStep === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Info */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{fileName}</p>
                        <p className="text-sm text-gray-600">{previewData.length} registros encontrados</p>
                      </div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </Card>

                {/* Validation Results */}
                {validationErrors.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-gray-900">
                        Errores y Advertencias ({validationErrors.length})
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {validationErrors.map((error, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            error.severity === 'error'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {error.severity === 'error' ? (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                Fila {error.row} - {error.field}
                              </p>
                              <p className="text-xs text-gray-600">{error.message}</p>
                            </div>
                            <Badge 
                              variant="secondary"
                              className={error.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                            >
                              {error.severity === 'error' ? 'Error' : 'Advertencia'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Preview Table */}
                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Vista Previa (Primeros 3 registros)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2 font-medium text-gray-600">Nombres</th>
                          <th className="text-left p-2 font-medium text-gray-600">Apellidos</th>
                          <th className="text-left p-2 font-medium text-gray-600">Documento</th>
                          <th className="text-left p-2 font-medium text-gray-600">Email</th>
                          <th className="text-left p-2 font-medium text-gray-600">Territorial</th>
                          <th className="text-left p-2 font-medium text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="p-2">{row.nombres}</td>
                            <td className="p-2">{row.apellidos}</td>
                            <td className="p-2">{row.documento}</td>
                            <td className="p-2">{row.email}</td>
                            <td className="p-2">{row.territorial}</td>
                            <td className="p-2">
                              <Badge className="bg-green-100 text-green-700">
                                {row.estado}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {currentStep === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-blue-100 mx-auto mb-6 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#1e5da8] animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Procesando...</h3>
                  <p className="text-gray-600 mb-6">
                    Importando {previewData.length} docentes al sistema
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progreso</span>
                      <span className="text-sm font-bold text-gray-900">{processingProgress}%</span>
                    </div>
                    <Progress value={processingProgress} className="h-3" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Results */}
            {currentStep === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Importación Completada!</h3>
                  <p className="text-gray-600">
                    Se procesaron {results.total} registros
                  </p>
                </div>

                {/* Results Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 text-center">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{results.total}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{results.exitosos}</p>
                    <p className="text-sm text-gray-600">Exitosos</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{results.errores}</p>
                    <p className="text-sm text-gray-600">Errores</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-600">{results.advertencias}</p>
                    <p className="text-sm text-gray-600">Advertencias</p>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Reporte
                  </Button>
                  <Button className="flex-1 bg-[#1e5da8] hover:bg-[#1a4d8f]">
                    <Users className="w-4 h-4 mr-2" />
                    Ver Docentes Importados
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            {currentStep === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcess}
                  className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                  disabled={validationErrors.filter(e => e.severity === 'error').length > 0}
                >
                  Procesar Importación
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {currentStep === 'result' && (
              <Button onClick={onClose} className="ml-auto bg-[#1e5da8] hover:bg-[#1a4d8f]">
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
