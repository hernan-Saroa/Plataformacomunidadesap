import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PublicNavbar } from './PublicNavbar';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  User,
  Shield,
  ArrowLeft,
  Loader2,
  QrCode,
  Mail,
  Lock,
  Send,
  Eye,
  Printer,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { simularEnvioCorreo } from '../../utils/emailTemplates';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface SolicitarCertificadoLaboralProps {
  onBack: () => void;
  onLoginClick: () => void;
}

interface EmpleadoData {
  tipo_documento: string;
  numero_documento: string;
  nombre_completo: string;
  tipo_vinculacion: 'Administrativo' | 'Docente Planta' | 'Docente Cátedra' | 'Docente Ocasional';
  cargo: string;
  dependencia: string;
  fecha_vinculacion: string;
  estado: 'Activo' | 'Retirado';
  correo_institucional: string;
  correo_personal: string;
  salario_actual: number;
}

interface CertificadoGenerado {
  numero_radicado: string;
  tipo_certificado: string;
  fecha_generacion: string;
  cargo: string;
  dependencia: string;
  fecha_vinculacion: string;
  salario_actual: number;
  qr_code: string;
  nombre_completo: string;
}

// Función para enmascarar correo (Habeas Data)
// Muestra: 2 caracteres iniciales + asteriscos + 6 caracteres finales
const enmascararCorreo = (correo: string): string => {
  if (!correo || correo.length < 10) return correo;
  
  const [usuario, dominio] = correo.split('@');
  
  if (!usuario || !dominio) return correo;
  
  // Tomar 2 primeros caracteres del usuario
  const inicio = usuario.substring(0, 2);
  
  // Calcular cuántos asteriscos poner en el medio
  const cantidadAsteriscos = Math.max(usuario.length - 8, 3); // Mínimo 3 asteriscos
  const asteriscos = '*'.repeat(cantidadAsteriscos);
  
  // Tomar últimos 6 caracteres (del usuario + @ + parte del dominio)
  const final = correo.substring(correo.length - 6);
  
  return `${inicio}${asteriscos}${final}`;
};

// Mock de base de datos de empleados (Administrativos y Docentes)
const BASE_DATOS_EMPLEADOS: EmpleadoData[] = [
  {
    tipo_documento: 'CC',
    numero_documento: '1234567890',
    nombre_completo: 'Juan Carlos Pérez González',
    tipo_vinculacion: 'Administrativo',
    cargo: 'Coordinador de Talento Humano',
    dependencia: 'Dirección Nacional - Talento Humano',
    fecha_vinculacion: '2018-03-15',
    estado: 'Activo',
    correo_institucional: 'juan.perez@esap.edu.co',
    correo_personal: 'jcperez@gmail.com',
    salario_actual: 5800000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '9876543210',
    nombre_completo: 'Ana María López Rodríguez',
    tipo_vinculacion: 'Docente Planta',
    cargo: 'Docente Tiempo Completo',
    dependencia: 'Facultad de Pregrado - Administración Pública',
    fecha_vinculacion: '2015-02-01',
    estado: 'Activo',
    correo_institucional: 'ana.lopez@esap.edu.co',
    correo_personal: 'amlopez@hotmail.com',
    salario_actual: 6500000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '5555555555',
    nombre_completo: 'Carlos Andrés Martínez Díaz',
    tipo_vinculacion: 'Docente Cátedra',
    cargo: 'Docente Cátedra',
    dependencia: 'Facultad de Posgrados - Especialización en Gestión Pública',
    fecha_vinculacion: '2020-08-01',
    estado: 'Activo',
    correo_institucional: 'carlos.martinez@esap.edu.co',
    correo_personal: 'cmartinez@yahoo.com',
    salario_actual: 3200000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1111111111',
    nombre_completo: 'María Fernanda Gómez Castro',
    tipo_vinculacion: 'Administrativo',
    cargo: 'Asistente Administrativo',
    dependencia: 'Territorial Antioquia - Sede Medellín',
    fecha_vinculacion: '2022-01-10',
    estado: 'Activo',
    correo_institucional: 'maria.gomez@esap.edu.co',
    correo_personal: 'mfgomez@outlook.com',
    salario_actual: 2800000
  }
];

type Paso = 'ingreso-documento' | 'validacion-codigo' | 'certificado-generado';

export function SolicitarCertificadoLaboral({ onBack, onLoginClick }: SolicitarCertificadoLaboralProps) {
  // Estados del flujo
  const [pasoActual, setPasoActual] = useState<Paso>('ingreso-documento');
  
  // Paso 1: Ingreso de documento
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<EmpleadoData | null>(null);
  
  // Paso 2: Validación de código (6 dígitos individuales)
  const [digitosCodigo, setDigitosCodigo] = useState<string[]>(['', '', '', '', '', '']);
  const [codigoEnviado, setCodigoEnviado] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState<number>(300); // 5 minutos = 300 segundos
  const [codigoExpirado, setCodigoExpirado] = useState(false);
  
  // Paso 3: Certificado generado
  const [certificadoGenerado, setCertificadoGenerado] = useState<CertificadoGenerado | null>(null);

  // Efecto para el contador regresivo del código
  useEffect(() => {
    if (pasoActual !== 'validacion-codigo') return;
    
    const interval = setInterval(() => {
      setTiempoRestante((prevTiempo) => {
        if (prevTiempo <= 1) {
          setCodigoExpirado(true);
          toast.error('El código ha expirado', {
            description: 'Por favor solicita un nuevo código',
            duration: 5000
          });
          clearInterval(interval);
          return 0;
        }
        return prevTiempo - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pasoActual]);

  // Formatear tiempo restante (mm:ss)
  const formatearTiempo = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

  // Handler para cambio de dígito individual
  const handleDigitoChange = (index: number, valor: string) => {
    // Solo permitir un dígito
    const nuevoValor = valor.replace(/\D/g, '').slice(0, 1);
    
    const nuevosDigitos = [...digitosCodigo];
    nuevosDigitos[index] = nuevoValor;
    setDigitosCodigo(nuevosDigitos);

    // Auto-focus al siguiente input si se ingresó un dígito
    if (nuevoValor && index < 5) {
      const siguienteInput = document.getElementById(`digito-${index + 1}`);
      if (siguienteInput) {
        (siguienteInput as HTMLInputElement).focus();
      }
    }
  };

  // Handler para tecla de retroceso
  const handleDigitoKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitosCodigo[index] && index > 0) {
      // Si el campo está vacío y presiona backspace, ir al anterior
      const anteriorInput = document.getElementById(`digito-${index - 1}`);
      if (anteriorInput) {
        (anteriorInput as HTMLInputElement).focus();
      }
    }
  };

  // PASO 1: Buscar empleado y enviar código
  const handleBuscarEmpleado = async () => {
    // Validaciones
    if (!tipoDocumento || !numeroDocumento) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (numeroDocumento.length < 6) {
      toast.error('El número de documento debe tener al menos 6 dígitos');
      return;
    }

    setBuscandoEmpleado(true);

    // Simular búsqueda en base de datos
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Buscar empleado en base de datos
    const empleado = BASE_DATOS_EMPLEADOS.find(
      emp => emp.tipo_documento === tipoDocumento && emp.numero_documento === numeroDocumento
    );

    setBuscandoEmpleado(false);

    if (!empleado) {
      toast.error('No se encontró registro en la base de datos de ESAP');
      return;
    }

    if (empleado.estado !== 'Activo') {
      toast.error('Tu vinculación no está activa. Contacta a Talento Humano.');
      return;
    }

    // Generar código de validación
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoEnviado(codigo);
    setEmpleadoEncontrado(empleado);

    // Simular envío de correo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success(`Código enviado a ${empleado.correo_institucional}`, {
      description: `Por seguridad, revisa tu bandeja de entrada`,
      duration: 5000
    });

    // Mostrar el código en consola para pruebas
    console.log('🔐 CÓDIGO DE VALIDACIÓN:', codigo);
    console.log('📧 Enviado a:', empleado.correo_institucional);

    // Enviar correo con diseño HTML profesional
    simularEnvioCorreo('certificado-codigo', {
      nombreCompleto: empleado.nombre_completo,
      codigo: codigo,
      correoDestino: empleado.correo_institucional,
      tiempoExpiracion: '5 minutos'
    });

    // Avanzar al siguiente paso
    setPasoActual('validacion-codigo');
  };

  // PASO 2: Validar código y generar certificado
  const handleValidarCodigo = async () => {
    const codigoValidacion = digitosCodigo.join('');
    if (codigoValidacion.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    setValidandoCodigo(true);
    
    // Simular validación
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (codigoValidacion !== codigoEnviado) {
      setValidandoCodigo(false);
      toast.error('Código incorrecto. Verifica e intenta nuevamente.');
      return;
    }

    // Código correcto - Generar certificado
    toast.success('¡Código validado correctamente!');
    
    // Simular generación de certificado
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!empleadoEncontrado) return;

    const numeroRadicado = `${Math.floor(100 + Math.random() * 900)}-${new Date().getFullYear()}-TH`;
    const qrCode = `QR-CERT-${numeroRadicado}`;

    const certificado: CertificadoGenerado = {
      numero_radicado: numeroRadicado,
      tipo_certificado: 'Certificado Laboral General',
      fecha_generacion: new Date().toISOString().split('T')[0],
      cargo: empleadoEncontrado.cargo,
      dependencia: empleadoEncontrado.dependencia,
      fecha_vinculacion: empleadoEncontrado.fecha_vinculacion,
      salario_actual: empleadoEncontrado.salario_actual,
      qr_code: qrCode,
      nombre_completo: empleadoEncontrado.nombre_completo
    };

    setCertificadoGenerado(certificado);
    setValidandoCodigo(false);

    toast.success('¡Certificado generado exitosamente!', {
      description: 'Se ha enviado una copia a tu correo registrado',
      duration: 5000
    });

    // Enviar correo con el certificado generado
    simularEnvioCorreo('certificado-generado', {
      nombreCompleto: empleadoEncontrado.nombre_completo,
      correoDestino: empleadoEncontrado.correo_institucional,
      consecutivoCertificado: numeroRadicado,
      urlValidacion: `https://esap.edu.co/verificar/${numeroRadicado}`
    });

    // Avanzar al paso final
    setPasoActual('certificado-generado');
  };

  // Reenviar código
  const handleReenviarCodigo = async () => {
    if (!empleadoEncontrado) return;

    setReenviandoCodigo(true);
    
    // Generar nuevo código
    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Simular reenvío
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCodigoEnviado(nuevoCodigo);
    setReenviandoCodigo(false);
    
    // Reiniciar contador y estado de expiración
    setTiempoRestante(300); // 5 minutos nuevamente
    setCodigoExpirado(false);
    
    // Limpiar inputs de código
    setDigitosCodigo(['', '', '', '', '', '']);
    
    toast.success('Código reenviado a tu correo', {
      description: empleadoEncontrado.correo_institucional
    });

    console.log('🔐 NUEVO CÓDIGO:', nuevoCodigo);
  };

  // Handlers de certificado generado
  const handleDescargar = () => {
    toast.success('Descargando certificado en PDF...', {
      description: 'El archivo se guardará en tu carpeta de descargas'
    });
  };

  const handleImprimir = () => {
    toast.info('Abriendo vista de impresión...');
  };

  const handleNuevaSolicitud = () => {
    // Reset todo
    setPasoActual('ingreso-documento');
    setTipoDocumento('');
    setNumeroDocumento('');
    setDigitosCodigo(['', '', '', '', '', '']);
    setCodigoEnviado('');
    setEmpleadoEncontrado(null);
    setCertificadoGenerado(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar Público Flotante */}
      <PublicNavbar onLoginClick={onLoginClick} onNavigateToHome={onBack} />

      {/* Main Content */}
      <div className="pt-24 sm:pt-28 pb-20">
        {/* Botón Volver */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <motion.button
            onClick={onBack}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#1e5da8] border-2 border-gray-200 hover:border-[#1e5da8] text-gray-700 hover:text-white transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Volver al Inicio</span>
          </motion.button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              Servicio Público
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Certificados Laborales
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Solicita tu certificado laboral de forma rápida y segura. 
              Validamos tu identidad mediante código enviado a tu correo registrado.
            </p>
          </motion.div>

          {/* Indicador de pasos */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4">
              {/* Paso 1 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActual === 'ingreso-documento' 
                    ? 'bg-[#003DA5] text-white scale-110 shadow-lg' 
                    : 'bg-green-500 text-white'
                }`}>
                  {pasoActual !== 'ingreso-documento' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActual === 'ingreso-documento' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Documento
                </span>
              </div>

              <div className="w-12 sm:w-24 h-0.5 bg-gray-300" />

              {/* Paso 2 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActual === 'validacion-codigo' 
                    ? 'bg-[#003DA5] text-white scale-110 shadow-lg' 
                    : pasoActual === 'certificado-generado'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {pasoActual === 'certificado-generado' ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActual === 'validacion-codigo' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Validación
                </span>
              </div>

              <div className="w-12 sm:w-24 h-0.5 bg-gray-300" />

              {/* Paso 3 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActual === 'certificado-generado' 
                    ? 'bg-[#003DA5] text-white scale-110 shadow-lg' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  3
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActual === 'certificado-generado' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Certificado
                </span>
              </div>
            </div>
          </div>

          {/* PASO 1: Ingreso de Documento */}
          <AnimatePresence mode="wait">
            {pasoActual === 'ingreso-documento' && (
              <motion.div
                key="paso1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-xl flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">Paso 1: Identifícate</h2>
                        <p className="text-sm text-gray-600">Ingresa tu documento de identidad</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Tipo de Documento */}
                      <div>
                        <Label htmlFor="tipo-documento" className="text-sm font-semibold text-gray-700 mb-2 block">
                          Tipo de Documento *
                        </Label>
                        <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                          <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder="Selecciona el tipo de documento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                            <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                            <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                            <SelectItem value="PP">Pasaporte (PP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Número de Documento */}
                      <div>
                        <Label htmlFor="numero-documento" className="text-sm font-semibold text-gray-700 mb-2 block">
                          Número de Documento *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="numero-documento"
                            type="text"
                            placeholder="Ej: 1234567890"
                            value={numeroDocumento}
                            onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))}
                            className="h-12 pl-10 border-2"
                            maxLength={15}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleBuscarEmpleado();
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Solo números, sin puntos ni espacios
                        </p>
                      </div>

                      {/* Botón Continuar */}
                      <Button
                        onClick={handleBuscarEmpleado}
                        disabled={buscandoEmpleado}
                        className="w-full h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold text-base shadow-lg"
                      >
                        {buscandoEmpleado ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Buscando en base de datos...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Continuar
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Información de ayuda */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">¿Quiénes pueden solicitar?</p>
                          <ul className="space-y-1 text-blue-700">
                            <li>• Personal administrativo activo de ESAP</li>
                            <li>• Docentes de planta, ocasionales y de cátedra</li>
                            <li>• Debes estar registrado en nuestra base de datos</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Datos de prueba */}
                <Card className="mt-6 bg-gray-50 border-2 border-gray-300">
                  <CardContent className="p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-gray-600" />
                      Datos de Prueba para Testing
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><strong>Administrativo:</strong> CC 1234567890</p>
                      <p><strong>Docente Planta:</strong> CC 9876543210</p>
                      <p><strong>Docente Cátedra:</strong> CC 5555555555</p>
                      <p><strong>Asistente:</strong> CC 1111111111</p>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 El código de validación se mostrará en la consola del navegador
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* PASO 2: Validación de Código */}
            {pasoActual === 'validacion-codigo' && empleadoEncontrado && (
              <motion.div
                key="paso2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">Paso 2: Valida tu identidad</h2>
                        <p className="text-sm text-gray-600">Ingresa el código enviado a tu correo</p>
                      </div>
                    </div>

                    {/* Datos del empleado */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-green-900 mb-2">¡Registro encontrado!</p>
                          <div className="space-y-1 text-sm text-green-800">
                            <p className="break-words"><strong>Nombre:</strong> {empleadoEncontrado.nombre_completo}</p>
                            <p className="break-words"><strong>Cargo:</strong> {empleadoEncontrado.cargo}</p>
                            <p className="break-words"><strong>Tipo:</strong> {empleadoEncontrado.tipo_vinculacion}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info de código enviado */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm flex-1 min-w-0">
                          <p className="font-semibold text-blue-900 mb-1">
                            Código enviado a tu correo
                          </p>
                          <div className="bg-white border border-blue-300 rounded-lg px-3 py-2 inline-flex items-center gap-2 max-w-full overflow-hidden">
                            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="font-mono text-blue-900 font-bold break-all">
                              {enmascararCorreo(empleadoEncontrado.correo_institucional)}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-3 break-words">
                            Revisa tu bandeja de entrada (o spam). El código tiene 6 dígitos.
                          </p>
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            📧 Por protección de datos personales, solo mostramos parte de tu correo
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Input de código - 6 dígitos individuales */}
                    <div className="mb-6">
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Código de Validación *
                      </Label>
                      <div className="flex gap-2 sm:gap-3 justify-center">
                        {digitosCodigo.map((digito, index) => (
                          <Input
                            key={index}
                            id={`digito-${index}`}
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={digito}
                            onChange={(e) => handleDigitoChange(index, e.target.value)}
                            onKeyDown={(e) => handleDigitoKeyDown(index, e)}
                            className="h-14 w-12 sm:h-16 sm:w-14 border-2 text-center text-2xl sm:text-3xl font-bold focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
                            maxLength={1}
                            autoFocus={index === 0}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Ingresa el código de 6 dígitos enviado a tu correo
                      </p>
                    </div>

                    {/* Botones */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleValidarCodigo}
                        disabled={validandoCodigo || digitosCodigo.some(digito => digito === '') || codigoExpirado}
                        className="w-full h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validandoCodigo ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Validando y generando certificado...
                          </>
                        ) : codigoExpirado ? (
                          <>
                            <XCircle className="w-5 h-5 mr-2" />
                            Código Expirado
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Validar y Generar Certificado
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleReenviarCodigo}
                        disabled={reenviandoCodigo || !codigoExpirado}
                        variant="outline"
                        className="w-full h-10 border-2"
                      >
                        {reenviandoCodigo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reenviando...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            {codigoExpirado ? 'Solicitar Nuevo Código' : 'Reenviar Código'}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Código de prueba visible */}
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>🔐 Código de prueba:</strong> <span className="font-mono font-bold text-lg">{codigoEnviado}</span>
                        <br />
                        <span className="text-xs">(En producción, este código solo se enviaría al correo)</span>
                      </p>
                    </div>

                    {/* Contador regresivo */}
                    {!codigoExpirado && (
                      <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-600" />
                          <p className="text-sm text-gray-700">
                            Código expira en: <strong>{formatearTiempo(tiempoRestante)}</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* PASO 3: Certificado Generado */}
            {pasoActual === 'certificado-generado' && certificadoGenerado && empleadoEncontrado && (
              <motion.div
                key="paso3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Mensaje de éxito */}
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-900 mb-2">
                          ¡Certificado Generado Exitosamente!
                        </h3>
                        <p className="text-green-700 mb-3">
                          Tu certificado laboral ha sido generado y está listo para descargar.
                          Se ha enviado una copia a tu correo <strong>{empleadoEncontrado.correo_institucional}</strong>
                        </p>
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <Calendar className="w-4 h-4" />
                          <span>Generado el {new Date(certificadoGenerado.fecha_generacion).toLocaleDateString('es-CO', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vista del certificado */}
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-8">
                    {/* Header del certificado */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">
                        CERTIFICADO LABORAL
                      </h3>
                      <p className="text-sm text-gray-600">
                        Escuela Superior de Administración Pública - ESAP
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Firmado Digitalmente
                        </Badge>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          {certificadoGenerado.numero_radicado}
                        </Badge>
                      </div>
                    </div>

                    {/* Contenido del certificado */}
                    <div className="space-y-6">
                      {/* Datos del empleado */}
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-[#003DA5]" />
                          Información del Empleado
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Nombre Completo</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.nombre_completo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Documento</p>
                            <p className="font-bold text-gray-900">
                              {empleadoEncontrado.tipo_documento} {empleadoEncontrado.numero_documento}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Cargo Actual</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.cargo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Tipo de Vinculación</p>
                            <p className="font-bold text-gray-900">{empleadoEncontrado.tipo_vinculacion}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Dependencia</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.dependencia}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Fecha de Vinculación</p>
                            <p className="font-bold text-gray-900">
                              {new Date(certificadoGenerado.fecha_vinculacion).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-gray-600 mb-1">Salario Actual</p>
                            <p className="font-bold text-gray-900">
                              ${certificadoGenerado.salario_actual.toLocaleString('es-CO')} COP
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Código QR y validación */}
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <div className="w-32 h-32 bg-white rounded-lg border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
                            <QrCode className="w-20 h-20 text-blue-600" />
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <h4 className="font-bold text-gray-900 mb-2">Código de Validación</h4>
                            <p className="text-sm text-gray-700 mb-3">
                              Este certificado cuenta con firma electrónica y código QR único para validación pública.
                            </p>
                            <p className="font-mono font-bold text-blue-700">{certificadoGenerado.qr_code}</p>
                          </div>
                        </div>
                      </div>

                      {/* Firma digital */}
                      <div className="text-center pt-6 border-t-2 border-gray-200">
                        <div className="inline-block">
                          <div className="w-48 h-1 bg-gray-900 mb-2 mx-auto"></div>
                          <p className="font-bold text-gray-900 text-sm">Dirección de Talento Humano</p>
                          <p className="text-xs text-gray-600">Escuela Superior de Administración Pública</p>
                          <p className="text-xs text-gray-500 mt-2">Firma Electrónica</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleDescargar}
                    className="flex-1 h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold shadow-lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Descargar PDF
                  </Button>
                  <Button
                    onClick={handleImprimir}
                    variant="outline"
                    className="flex-1 h-12 border-2 font-bold"
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={handleNuevaSolicitud}
                    variant="outline"
                    className="flex-1 h-12 border-2 font-bold"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Nueva Solicitud
                  </Button>
                </div>

                {/* Info adicional */}
                <Card className="bg-gray-50 border-2 border-gray-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold mb-2">Validez del Certificado</p>
                        <ul className="space-y-1">
                          <li>✓ Este certificado tiene validez legal para trámites oficiales</li>
                          <li>✓ Código QR validable en cualquier momento</li>
                          <li>✓ Firma electrónica con trazabilidad completa</li>
                          <li>✓ Copia enviada a tu correo institucional registrado</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Corporativo ESAP */}
      <footer className="bg-[#1e5da8] text-white py-12 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header del Footer */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-white/20">
            {/* Logo y Descripción */}
            <div className="mb-6 md:mb-0 flex items-start gap-4">
              <img src={esapLogoWhite} alt="ESAP" className="h-14" />
              <div>
                <h3 className="text-xl font-bold mb-1">Escuela Superior de Administración Pública</h3>
                <p className="text-sm text-blue-100 mb-2">Formando líderes de excelencia al servicio del Estado y la sociedad colombiana desde 1958.</p>
                <div className="flex gap-2 text-xs text-blue-100">
                  <span className="px-2 py-1 bg-white/10 rounded">Educación Pública de Calidad</span>
                  <span className="px-2 py-1 bg-white/10 rounded">Acreditación de Alta Calidad</span>
                  <span className="px-2 py-1 bg-white/10 rounded">Investigación e Innovación</span>
                </div>
              </div>
            </div>

            {/* Redes Sociales */}
            <div>
              <p className="text-sm font-semibold mb-3">Síguenos:</p>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Columnas de Enlaces */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
            {/* INSTITUCIONAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">🏛��� Institucional</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Acerca de ESAP</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Misión y Visión</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Directivos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sedes y Regionales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trabaje con Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rendición de Cuentas</a></li>
              </ul>
            </div>

            {/* ACADÉMICO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">📚 Académico</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Programas de Pregrado</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas Pregrado</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Educación Continua</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biblioteca Virtual</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Calendario Académico</a></li>
              </ul>
            </div>

            {/* SERVICIOS */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">⚙️ Servicios</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Portal Transaccional</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certificados</a></li>
                <li><a href="#" className="hover:text-white transition-colors">PQRS</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Notificaciones Judiciales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trámites y Servicios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
              </ul>
            </div>

            {/* LEGAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">⚖️ Legal</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Políticas de Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tratamiento de Datos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Transparencia</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mapa del Sitio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Accesibilidad</a></li>
              </ul>
            </div>

            {/* CONTACTO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">📞 Contacto</h4>
              <ul className="space-y-3 text-sm text-blue-100">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Sede Principal: Bogotá<br />Diagonal 40 No. 46A - 37<br />Bogotá D.C., Colombia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>(601) 220 0700</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Línea Nacional gratuita:<br />01 8000 110 119</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>correspondencia@esap.edu.co</span>
                </li>
                <li>
                  <p className="text-xs mb-1">🕐 Lunes a Viernes</p>
                  <p className="text-xs">8:00 AM - 5:00 PM</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
            <p>© 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Última actualización: 13 de enero de 2025
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}