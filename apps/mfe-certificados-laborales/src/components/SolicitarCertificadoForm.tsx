import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Eye
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { toast } from 'sonner';
import { validarEmpleadoEnBD, generarCertificadoAutomatico } from '../../lib/api/certificadosAPI';

interface FormData {
  tipoDocumento: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
  telefono: string;
  tipoCertificado: string;
  motivoSolicitud: string;
}

interface SolicitudResult {
  estado: 'GENERADO' | 'PENDIENTE_VALIDACION';
  mensaje: string;
  certificado?: {
    id: string;
    consecutivo: string;
    qrCode: string;
    pdfUrl: string;
  };
  radicado?: string;
}

export function SolicitarCertificadoForm() {
  const [formData, setFormData] = useState<FormData>({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    email: '',
    telefono: '',
    tipoCertificado: 'LABORAL_GENERAL',
    motivoSolicitud: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<SolicitudResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.numeroDocumento || !formData.primerNombre || !formData.primerApellido || !formData.email) {
      toast.error('Campos obligatorios incompletos');
      return;
    }

    setIsLoading(true);

    try {
      // Simular llamada al Web Service de RRHH para validar existencia
      await new Promise(resolve => setTimeout(resolve, 2000));

      // VALIDACIÓN AUTOMÁTICA CONTRA BASE DE DATOS
      const empleadoExiste = await validarEmpleadoEnBD(formData.numeroDocumento);

      if (empleadoExiste.existe) {
        // ✅ EMPLEADO EXISTE → GENERAR CERTIFICADO AUTOMÁTICAMENTE
        const certificado = await generarCertificadoAutomatico({
          ...formData,
          datosEmpleado: empleadoExiste.datos
        });

        setResultado({
          estado: 'GENERADO',
          mensaje: '¡Certificado generado exitosamente!',
          certificado: {
            id: certificado.id,
            consecutivo: certificado.consecutivo,
            qrCode: certificado.qrCode,
            pdfUrl: certificado.pdfUrl
          }
        });

        toast.success('Certificado generado', {
          description: 'Tu certificado ha sido generado y está listo para descargar',
          duration: 5000,
        });

      } else {
        // ❌ EMPLEADO NO EXISTE → PENDIENTE VALIDACIÓN MANUAL
        const radicado = `CL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        setResultado({
          estado: 'PENDIENTE_VALIDACION',
          mensaje: 'Tu solicitud está en revisión',
          radicado: radicado
        });

        toast.info('Solicitud recibida', {
          description: 'Tu solicitud será revisada por el área de Talento Humano',
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      toast.error('Error al procesar tu solicitud', {
        description: 'Por favor intenta nuevamente o contacta al área de Talento Humano'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescargarPDF = () => {
    if (resultado?.certificado?.pdfUrl) {
      // Simular descarga
      toast.success('Descargando certificado...', {
        description: 'El archivo PDF se descargará en unos segundos'
      });
      
      // En producción:
      // window.open(resultado.certificado.pdfUrl, '_blank');
    }
  };

  const handleVerCertificado = () => {
    if (resultado?.certificado?.pdfUrl) {
      toast.info('Abriendo certificado...', {
        description: 'Se abrirá en una nueva ventana'
      });
      
      // En producción:
      // window.open(resultado.certificado.pdfUrl, '_blank');
    }
  };

  const handleNuevaSolicitud = () => {
    setResultado(null);
    setFormData({
      tipoDocumento: 'CC',
      numeroDocumento: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      email: '',
      telefono: '',
      tipoCertificado: 'LABORAL_GENERAL',
      motivoSolicitud: ''
    });
  };

  // Si ya hay resultado, mostrar pantalla de resultado
  if (resultado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="p-4 sm:p-6 md:p-8 border-2">
            {resultado.estado === 'GENERADO' ? (
              // ✅ CERTIFICADO GENERADO
              <>
                <div className="text-center mb-6 sm:mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                  </motion.div>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    ¡Certificado Generado!
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 px-2">
                    Tu certificado laboral ha sido generado exitosamente
                  </p>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Consecutivo</p>
                      <p className="font-bold text-sm sm:text-base text-gray-900">{resultado.certificado?.consecutivo}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Código QR</p>
                      <p className="font-mono text-xs sm:text-sm text-gray-900 truncate">{resultado.certificado?.qrCode}</p>
                    </div>
                  </div>

                  {/* QR Code Visual */}
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg flex justify-center">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl sm:text-6xl mb-2">📱</div>
                        <p className="text-xs sm:text-sm text-gray-600">Código QR</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Escaneable</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Button 
                    onClick={handleDescargarPDF}
                    className="w-full min-h-[48px]"
                    style={{ background: '#003DA5' }}
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Descargar Certificado PDF
                  </Button>

                  <Button 
                    onClick={handleVerCertificado}
                    variant="outline"
                    className="w-full min-h-[48px]"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Ver Certificado
                  </Button>

                  <Button 
                    onClick={handleNuevaSolicitud}
                    variant="ghost"
                    className="w-full min-h-[48px]"
                  >
                    Solicitar Otro Certificado
                  </Button>
                </div>

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Importante:</strong> Este certificado cuenta con un código QR único que puede ser verificado en cualquier momento.
                  </p>
                </div>
              </>
            ) : (
              // ⏳ PENDIENTE VALIDACIÓN
              <>
                <div className="text-center mb-6 sm:mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center"
                  >
                    <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
                  </motion.div>
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Solicitud en Revisión
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 px-2">
                    Tu solicitud será validada manualmente por el área de Talento Humano
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">Radicado de Solicitud</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{resultado.radicado}</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Validación de Datos</p>
                      <p className="text-xs sm:text-sm text-gray-600">Verificaremos tu información con nuestro sistema de RRHH</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Generación del Certificado</p>
                      <p className="text-xs sm:text-sm text-gray-600">Una vez validado, generaremos tu certificado automáticamente</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                      <span className="text-blue-600 font-bold text-sm">3</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Notificación</p>
                      <p className="text-xs sm:text-sm text-gray-600">Te enviaremos un correo cuando esté listo</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleNuevaSolicitud}
                  className="w-full min-h-[48px]"
                  style={{ background: '#003DA5' }}
                >
                  Solicitar Otro Certificado
                </Button>

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>Tiempo estimado:</strong> 1-2 días hábiles. Recibirás un correo a <strong className="break-words">{formData.email}</strong> cuando tu certificado esté listo.
                  </p>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // Formulario de solicitud
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
          >
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 px-4">
            Solicitar Certificado Laboral
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Completa el formulario para solicitar tu certificado. Si tus datos están registrados, 
            <strong> lo generaremos de manera inmediata</strong>.
          </p>
        </div>

        {/* Alerta informativa */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 sm:mb-6"
        >
          <Card className="p-3 sm:p-4 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">
                  Generación Automática
                </p>
                <p className="text-xs sm:text-sm text-blue-800">
                  Si tus datos están registrados en nuestro sistema, el certificado se generará <strong>automáticamente con un código QR único</strong>. 
                  En caso contrario, tu solicitud quedará pendiente para validación manual.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Formulario */}
        <Card className="p-8 border-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección: Identificación */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#003DA5]" />
                Datos de Identificación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
                  <select
                    id="tipoDocumento"
                    name="tipoDocumento"
                    value={formData.tipoDocumento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                    required
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="numeroDocumento">Número de Documento *</Label>
                  <Input
                    id="numeroDocumento"
                    name="numeroDocumento"
                    value={formData.numeroDocumento}
                    onChange={handleInputChange}
                    placeholder="1234567890"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sección: Datos Personales */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#003DA5]" />
                Datos Personales
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primerNombre">Primer Nombre *</Label>
                  <Input
                    id="primerNombre"
                    name="primerNombre"
                    value={formData.primerNombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="segundoNombre">Segundo Nombre</Label>
                  <Input
                    id="segundoNombre"
                    name="segundoNombre"
                    value={formData.segundoNombre}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="primerApellido">Primer Apellido *</Label>
                  <Input
                    id="primerApellido"
                    name="primerApellido"
                    value={formData.primerApellido}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="segundoApellido">Segundo Apellido</Label>
                  <Input
                    id="segundoApellido"
                    name="segundoApellido"
                    value={formData.segundoApellido}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Contacto */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#003DA5]" />
                Información de Contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ejemplo@correo.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="3001234567"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Tipo de Certificado */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#003DA5]" />
                Tipo de Certificado
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tipoCertificado">Selecciona el tipo *</Label>
                  <select
                    id="tipoCertificado"
                    name="tipoCertificado"
                    value={formData.tipoCertificado}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                    required
                  >
                    <option value="LABORAL_GENERAL">Certificado Laboral General</option>
                    <option value="SALARIOS">Certificado de Ingresos y Retenciones</option>
                    <option value="TIEMPO_SERVICIO">Certificado de Tiempo de Servicio</option>
                    <option value="VACACIONES">Certificado de Vacaciones</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="motivoSolicitud">Motivo de la Solicitud</Label>
                  <textarea
                    id="motivoSolicitud"
                    name="motivoSolicitud"
                    value={formData.motivoSolicitud}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
                    placeholder="Opcional: Describe brevemente para qué necesitas el certificado"
                  />
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-lg"
                style={{ background: '#003DA5' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Procesando solicitud...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Solicitar Certificado
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer informativo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-sm text-gray-600"
        >
          <p>
            ¿Tienes problemas? Contacta a Talento Humano: <strong>talento.humano@esap.edu.co</strong>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}