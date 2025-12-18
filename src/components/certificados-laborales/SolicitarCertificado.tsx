/**
 * Componente de Autoservicio para Solicitud de Certificados Laborales
 * Permite a los empleados solicitar su certificado ingresando su documento
 * y validando con un código enviado por email
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Send,
  Check,
  AlertCircle,
  Mail,
  User,
  Shield,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { certificadosService } from '../../services/api/certificados.service';
import { VisorPDFCertificado } from './VisorPDFCertificado';

type Paso = 'documento' | 'codigo' | 'completado';

export function SolicitarCertificado() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('documento');
  const [documento, setDocumento] = useState('');
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [codigoTest, setCodigoTest] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [certificadoGenerado, setCertificadoGenerado] = useState<any | null>(null);
  const [mostrarVisor, setMostrarVisor] = useState(false);

  // ============================================
  // PASO 1: Verificar Documento
  // ============================================
  const handleVerificarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documento.trim()) {
      toast.error('Por favor ingresa tu número de documento');
      return;
    }

    setIsLoading(true);

    try {
      const response = await certificadosService.autoservicio.verificarDocumento(documento);

      if (!response.existe) {
        toast.error('Documento no encontrado', {
          description: 'No se encontró ningún registro con este documento en el sistema',
        });
        return;
      }

      if (response.tieneCertificado) {
        toast.info('Ya tienes un certificado generado', {
          description: 'Puedes visualizarlo o descargarlo',
          duration: 4000,
        });
        // Convertir el certificado existente al formato esperado por el visor
        setCertificadoGenerado(convertirCertificadoParaVisor(response.certificado));
        setPaso('completado');
        return;
      }

      // Si no tiene certificado, generar código de validación
      const codigoResponse = await certificadosService.autoservicio.generarCodigoValidacion(documento);

      setEmail(codigoResponse.email);
      setCodigoTest(codigoResponse.codigoTest);
      setPaso('codigo');

      toast.success('Código de validación enviado', {
        description: `Se envió un código al correo ${codigoResponse.email}`,
        duration: 5000,
      });

      // En desarrollo, mostrar el código en consola
      if (codigoResponse.codigoTest) {
        console.log('🔑 Código de validación:', codigoResponse.codigoTest);
        toast.info(`Código de desarrollo: ${codigoResponse.codigoTest}`, {
          description: 'Este código solo se muestra en ambiente de desarrollo',
          duration: 8000,
        });
      }
    } catch (error: any) {
      console.error('Error al verificar documento:', error);
      toast.error('Error', {
        description: error.response?.data?.message || error.message || 'No se pudo verificar el documento',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PASO 2: Validar Código y Generar Certificado
  // ============================================
  const handleValidarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      toast.error('Por favor ingresa el código de validación');
      return;
    }

    setIsLoading(true);

    try {
      const response = await certificadosService.autoservicio.validarCodigoYGenerarCertificado(
        documento,
        codigo
      );

      toast.success('¡Certificado generado exitosamente!', {
        description: 'Tu certificado laboral ha sido generado',
        duration: 4000,
      });

      // Convertir el certificado al formato esperado por el visor
      setCertificadoGenerado(convertirCertificadoParaVisor(response.certificado));
      setPaso('completado');
    } catch (error: any) {
      console.error('Error al validar código:', error);
      toast.error('Error', {
        description: error.response?.data?.message || error.message || 'Código de validación incorrecto',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Convertir certificado del backend al formato del visor
  // ============================================
  const convertirCertificadoParaVisor = (cert: any) => {
    return {
      consecutivo: cert.certificate_number || cert.consecutivo || 'N/A',
      certificateHash: cert.verification_code,
      qrCode: cert.verification_code,
      empleado: {
        nombre: cert.full_name,
        documento: cert.id_number,
        email: email || 'No disponible',
        tipoVinculacion: cert.career_category,
        fechaVinculacion: cert.hiring_date,
        cargo: cert.position_category,
        grado: cert.position_category,
        dependencia: cert.department || 'No especificado',
        salario: cert.monthly_salary,
        salarioTexto: cert.salary_text,
      },
      fechaSolicitud: cert.issue_date || cert.issuance_timestamp,
      fechaGeneracion: cert.issue_date || cert.issuance_timestamp,
      estado: cert.status,
      firmante: {
        nombre: cert.signer_name || 'Firmante no disponible',
        cargo: cert.signer_position || 'Cargo no disponible',
        dependencia: cert.signer_department || 'Dependencia no disponible',
      },
      position_location: cert.position_location,
      department: cert.department,
      campus: cert.campus,
      signer_name: cert.signer_name,
      signer_position: cert.signer_position,
      signer_department: cert.signer_department,
    };
  };

  // ============================================
  // Acciones finales
  // ============================================
  const handleVerCertificado = () => {
    setMostrarVisor(true);
  };

  const handleVolverInicio = () => {
    navigate('/');
  };

  const handleNuevaSolicitud = () => {
    setDocumento('');
    setCodigo('');
    setEmail('');
    setCodigoTest(undefined);
    setCertificadoGenerado(null);
    setPaso('documento');
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <FileText className="w-12 h-12 text-white" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Solicitud de Certificado Laboral
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Obtén tu certificado laboral de forma rápida y segura
              </p>
            </motion.div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 py-8 mb-16">
          <AnimatePresence mode="wait">
            {/* PASO 1: Ingresar Documento */}
            {paso === 'documento' && (
              <motion.div
                key="paso-documento"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 shadow-2xl">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-[#003DA5]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Verificación de Identidad
                    </h2>
                    <p className="text-gray-600">
                      Ingresa tu número de documento para verificar tu información
                    </p>
                  </div>

                  <form onSubmit={handleVerificarDocumento} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Número de Documento
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 1234567890"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        className="w-full text-lg"
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#003DA5] hover:bg-[#002873] text-white py-6 text-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Continuar
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Información segura</p>
                        <p>
                          Tus datos están protegidos y solo se usan para verificar tu identidad
                          y generar tu certificado laboral.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* PASO 2: Ingresar Código de Validación */}
            {paso === 'codigo' && (
              <motion.div
                key="paso-codigo"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 shadow-2xl">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Código de Validación
                    </h2>
                    <p className="text-gray-600">
                      Ingresa el código que enviamos a tu correo
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {email}
                    </p>
                  </div>

                  <form onSubmit={handleValidarCodigo} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Código de 6 dígitos
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 470547"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className="w-full text-lg text-center tracking-widest"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>

                    {codigoTest && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-semibold mb-1">Modo de desarrollo</p>
                            <p>Código de prueba: <span className="font-mono font-bold">{codigoTest}</span></p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPaso('documento')}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Atrás
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Validar y Generar
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* PASO 3: Certificado Generado */}
            {paso === 'completado' && certificadoGenerado && (
              <motion.div
                key="paso-completado"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="p-8 shadow-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="inline-block mb-4"
                    >
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-16 h-16 text-green-600" strokeWidth={2.5} />
                      </div>
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      ¡Certificado Generado!
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Tu certificado laboral ha sido generado exitosamente
                    </p>
                  </div>

                  {/* Información del Certificado */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Nombre Completo
                        </label>
                        <p className="text-base font-semibold text-gray-900">
                          {certificadoGenerado.empleado.nombre}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Documento
                        </label>
                        <p className="text-base font-semibold text-gray-900">
                          {certificadoGenerado.empleado.documento}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Número de Certificado
                        </label>
                        <p className="text-base font-mono font-semibold text-gray-900">
                          {certificadoGenerado.consecutivo}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          Código de Verificación
                        </label>
                        <p className="text-sm font-mono text-gray-600 break-all">
                          {certificadoGenerado.certificateHash}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleVerCertificado}
                      className="w-full bg-[#003DA5] hover:bg-[#002873] text-white py-6 text-lg"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Ver y Descargar Certificado
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleNuevaSolicitud}
                        variant="outline"
                        className="flex-1"
                      >
                        Nueva Solicitud
                      </Button>
                      <Button
                        onClick={handleVolverInicio}
                        variant="outline"
                        className="flex-1"
                      >
                        Volver al Inicio
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Visor de Certificado */}
      {certificadoGenerado && (
        <VisorPDFCertificado
          isOpen={mostrarVisor}
          onClose={() => setMostrarVisor(false)}
          certificado={certificadoGenerado}
        />
      )}
    </>
  );
}
