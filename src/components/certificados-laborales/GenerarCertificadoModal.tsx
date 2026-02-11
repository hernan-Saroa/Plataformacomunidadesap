import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Database,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { EMPLEADOS_ELEGIBLES, getDatosLaboralesCompletos, DATOS_LABORALES } from '../../data/empleadosElegiblesCertificados';

interface GenerarCertificadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (certificado: any) => void;
}

interface EmpleadoElegible {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  cargo: string;
  dependencia: string;
  tipoVinculacion: string;
  fechaVinculacion: string;
  grado: string;
  salario: number;
  estado: 'ACTIVO' | 'INACTIVO';
  datosCompletos: boolean;
}

// Transformar datos de MOCK_USERS a formato de empleados elegibles
const empleadosElegibles: EmpleadoElegible[] = (EMPLEADOS_ELEGIBLES || []).map(user => {
  const datosLaborales = DATOS_LABORALES ? DATOS_LABORALES[user.id] : undefined;
  const datosCompletos = !!datosLaborales && datosLaborales.salario > 0;
  
  return {
    id: user.id,
    nombre: `${user.firstName} ${user.lastName}`,
    documento: user.document,
    email: user.email,
    cargo: datosLaborales?.cargo || 'Sin cargo asignado',
    dependencia: datosLaborales?.dependencia || user.location,
    tipoVinculacion: datosLaborales?.tipoVinculacion || 'Por definir',
    fechaVinculacion: datosLaborales?.fechaVinculacion || '',
    grado: datosLaborales?.grado || 'Sin grado',
    salario: datosLaborales?.salario || 0,
    estado: user.status === 'active' ? 'ACTIVO' : 'INACTIVO',
    datosCompletos
  };
});

export function GenerarCertificadoModal({ isOpen, onClose, onSuccess }: GenerarCertificadoModalProps) {
  const [step, setStep] = useState<'buscar' | 'validar' | 'generar' | 'success'>('buscar');
  const [searchTerm, setSearchTerm] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoElegible | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [configuracion, setConfiguracion] = useState({
    incluyeSalario: true,
    incluyeHistorial: false,
    tipoDocumento: 'estandar'
  });

  const empleadosFiltrados = empleadosElegibles.filter(emp =>
    emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.documento.includes(searchTerm)
  );

  const handleSelectEmpleado = (empleado: EmpleadoElegible) => {
    setEmpleadoSeleccionado(empleado);
    setStep('validar');
  };

  const handleValidarYGenerar = async () => {
    if (!empleadoSeleccionado) return;

    setStep('generar');
    setIsGenerating(true);

    // Toast de inicio
    toast.loading('Generando certificado...', {
      description: 'Por favor espera mientras procesamos la información',
      id: 'generar-cert'
    });

    // Simular generación de certificado
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nuevoCertificado = {
      id: `CERT-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      consecutivo: `${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-2025-TH`,
      empleado: {
        nombre: empleadoSeleccionado.nombre,
        documento: empleadoSeleccionado.documento,
        cargo: empleadoSeleccionado.cargo,
        dependencia: empleadoSeleccionado.dependencia,
        tipoVinculacion: empleadoSeleccionado.tipoVinculacion,
        fechaVinculacion: empleadoSeleccionado.fechaVinculacion,
        grado: empleadoSeleccionado.grado,
        salario: empleadoSeleccionado.salario
      },
      estado: 'GENERADO' as const,
      tipoSolicitud: 'MANUAL' as const,
      fechaSolicitud: new Date().toISOString(),
      fechaGeneracion: new Date().toISOString(),
      solicitante: {
        nombre: 'Admin Talento Humano',
        tipo: 'manual' as const
      },
      pdfUrl: '/certificados/new.pdf'
    };

    setIsGenerating(false);
    setStep('success');

    // Toast de éxito
    toast.success('¡Certificado generado exitosamente!', {
      description: `${nuevoCertificado.consecutivo} listo para descargar`,
      id: 'generar-cert',
      duration: 4000
    });

    setTimeout(() => {
      onSuccess(nuevoCertificado);
      handleReset();
    }, 2000);
  };

  const handleReset = () => {
    setStep('buscar');
    setSearchTerm('');
    setEmpleadoSeleccionado(null);
    setConfiguracion({
      incluyeSalario: true,
      incluyeHistorial: false,
      tipoDocumento: 'estandar'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={step !== 'generar' ? onClose : undefined}
      />

      {/* Modal - Mobile Optimized */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header - Sticky */}
          <div className="bg-[#003DA5] px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
                <h2 className="text-white text-base sm:text-xl font-semibold truncate">
                  Generar Certificado Laboral
                </h2>
              </div>
              {step !== 'generar' && (
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 -mr-2 flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {/* Step 1: Buscar Empleado */}
            {step === 'buscar' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="search" className="text-sm sm:text-base mb-2">Buscar Empleado</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Buscar por nombre o documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {empleadosFiltrados.length > 0 ? (
                    empleadosFiltrados.map((empleado) => (
                      <Card
                        key={empleado.id}
                        className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-[#003DA5]"
                        onClick={() => handleSelectEmpleado(empleado)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${
                              empleado.estado === 'ACTIVO' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <User className={`w-6 h-6 ${
                                empleado.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="text-gray-900">{empleado.nombre}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600">CC {empleado.documento}</span>
                                <span className="text-sm text-gray-500">{empleado.cargo}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{empleado.dependencia}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {empleado.estado === 'ACTIVO' ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Activo
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                                Inactivo
                              </span>
                            )}
                            {!empleado.datosCompletos && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Datos incompletos
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No se encontraron empleados</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Intenta con otro término de búsqueda
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Validar y Configurar */}
            {step === 'validar' && empleadoSeleccionado && (
              <div className="space-y-6">
                {/* Resumen del Empleado */}
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#003DA5]" />
                    Datos del Empleado
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Nombre Completo</label>
                      <p className="text-gray-900 font-medium">{empleadoSeleccionado.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Número de Identificación</label>
                      <p className="text-gray-900 font-medium">{empleadoSeleccionado.documento}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Cargo</label>
                      <p className="text-gray-900">{empleadoSeleccionado.cargo}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tipo de Vinculación</label>
                      <p className="text-gray-900">{empleadoSeleccionado.tipoVinculacion}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Fecha de Vinculación</label>
                      <p className="text-gray-900">
                        {new Date(empleadoSeleccionado.fechaVinculacion).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Grado</label>
                      <p className="text-gray-900">{empleadoSeleccionado.grado}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Dependencia</label>
                      <p className="text-gray-900">{empleadoSeleccionado.dependencia}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Salario</label>
                      <p className="text-gray-900 font-semibold flex items-center gap-1">
                        {empleadoSeleccionado.salario > 0 ? (
                          <>
                            <DollarSign className="w-4 h-4 text-green-600" />
                            ${empleadoSeleccionado.salario.toLocaleString('es-CO')} COP
                          </>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            No disponible
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Validaciones */}
                {!empleadoSeleccionado.datosCompletos && (
                  <Card className="p-6 border-yellow-300 bg-yellow-50">
                    <div className="flex gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-gray-900">Datos Incompletos</h4>
                        <p className="text-gray-700 text-sm mt-1">
                          Este empleado tiene datos incompletos en el sistema. El certificado se generará con la información disponible.
                        </p>
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                          <li>Falta información salarial actualizada</li>
                          <li>Sin fecha de último ascenso registrada</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                )}

                {empleadoSeleccionado.estado === 'INACTIVO' && (
                  <Card className="p-6 border-orange-300 bg-orange-50">
                    <div className="flex gap-3">
                      <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-gray-900">Empleado Inactivo</h4>
                        <p className="text-gray-700 text-sm mt-1">
                          Este empleado está marcado como inactivo. Se generará un certificado histórico con información hasta la fecha de retiro.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Configuración del Certificado */}
                <Card className="p-6">
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#003DA5]" />
                    Configuración del Certificado
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tipo">Tipo de Certificado</Label>
                      <Select 
                        value={configuracion.tipoDocumento} 
                        onValueChange={(value) => setConfiguracion({...configuracion, tipoDocumento: value})}
                      >
                        <SelectTrigger id="tipo" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estandar">Certificado Laboral Estándar</SelectItem>
                          <SelectItem value="con_salario">Con Información Salarial Detallada</SelectItem>
                          <SelectItem value="historico">Histórico Completo</SelectItem>
                          <SelectItem value="bancario">Para Trámites Bancarios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="salario"
                          checked={configuracion.incluyeSalario}
                          onCheckedChange={(checked) => 
                            setConfiguracion({...configuracion, incluyeSalario: checked as boolean})
                          }
                        />
                        <label
                          htmlFor="salario"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Incluir información salarial
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="historial"
                          checked={configuracion.incluyeHistorial}
                          onCheckedChange={(checked) => 
                            setConfiguracion({...configuracion, incluyeHistorial: checked as boolean})
                          }
                        />
                        <label
                          htmlFor="historial"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Incluir historial de cargos y ascensos
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Step 3: Generando */}
            {step === 'generar' && (
              <div className="py-12 text-center">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-[#003DA5] animate-spin" />
                </div>
                <h3 className="text-gray-900 text-xl mb-2">Generando Certificado</h3>
                <p className="text-gray-600">
                  Estamos procesando la información y generando el PDF...
                </p>
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Validando datos del empleado
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 text-blue-500 mr-2 animate-spin" />
                    Generando documento PDF
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                    Aplicando firma electrónica
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="py-12 text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-gray-900 text-xl mb-2">¡Certificado Generado!</h3>
                <p className="text-gray-600">
                  El certificado ha sido generado exitosamente y está listo para descargar.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
            <div className="flex justify-between">
              {step === 'validar' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('buscar');
                      setEmpleadoSeleccionado(null);
                    }}
                  >
                    Atrás
                  </Button>
                  <Button
                    className="bg-[#003DA5] hover:bg-[#002873]"
                    onClick={handleValidarYGenerar}
                  >
                    Generar Certificado
                  </Button>
                </>
              )}
              {step === 'buscar' && (
                <Button variant="outline" onClick={onClose} className="ml-auto">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}