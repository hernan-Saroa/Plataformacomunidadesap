/**
 * PORTAL PÚBLICO: SOLICITUD DE CERTIFICADOS LABORALES ESAP
 * 
 * Flujo de Solicitud:
 * 1. Usuario ingresa número de documento
 * 2. Sistema valida si existe en la base de datos
 * 3. Si existe, envía código de 6 dígitos al correo
 * 4. Usuario ingresa código de verificación
 * 5. Si es correcto:
 *    - Se genera el certificado con QR único
 *    - Se envía al correo del usuario
 *    - Se envía al correo del administrador
 *    - Se genera log del evento
 * 
 * Diseño Premium de Nivel Empresarial
 */

import React, { useState } from 'react';
import {
  FileText,
  CheckCircle,
  Mail,
  Shield,
  QrCode,
  ArrowRight,
  Loader2,
  AlertCircle,
  Phone,
  Globe,
  ArrowLeft,
  X,
  Camera,
  Hash,
  Download,
  User,
  Building2,
  Briefcase,
  Sparkles,
  MapPin,
  Calendar,
  Info,
  Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import esapLogo from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

// Tipos de datos
interface EmpleadoDB {
  documento: string;
  nombre: string;
  email: string;
  cargo: string;
  dependencia: string;
  tipoVinculacion: string;
  fechaVinculacion: string;
  grado: string;
  salario: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

interface CertificadoGenerado {
  consecutivo: string;
  qrCode: string;
  fechaGeneracion: string;
  pdfUrl: string;
  hash: string;
}

interface SolicitarCertificadoPublicoProps {
  onBack?: () => void;
}

// Mock de empleados en base de datos
const mockEmpleadosDB: EmpleadoDB[] = [
  {
    documento: '52345678',
    nombre: 'María Fernanda Rodríguez López',
    email: 'maria.rodriguez@esap.edu.co',
    cargo: 'Docente Tiempo Completo',
    dependencia: 'Dirección Territorial Bogotá',
    tipoVinculacion: 'Docente Tiempo Completo',
    fechaVinculacion: '2018-03-15',
    grado: 'Maestría en Educación',
    salario: 4567890,
    estado: 'ACTIVO'
  },
  {
    documento: '79876543',
    nombre: 'Carlos Alberto Martínez Gómez',
    email: 'carlos.martinez@esap.edu.co',
    cargo: 'Coordinador GIT',
    dependencia: 'Dirección de Talento Humano',
    tipoVinculacion: 'Coordinador GIT - Planta',
    fechaVinculacion: '2015-06-01',
    grado: 'Especialización en Gestión Pública',
    salario: 6234500,
    estado: 'ACTIVO'
  },
  {
    documento: '39654321',
    nombre: 'Laura Patricia Sánchez Cruz',
    email: 'laura.sanchez@esap.edu.co',
    cargo: 'Asistente Administrativo',
    dependencia: 'Dirección Territorial Antioquia',
    tipoVinculacion: 'Contrato de Prestación de Servicios',
    fechaVinculacion: '2022-01-10',
    grado: 'Profesional en Administración',
    salario: 3500000,
    estado: 'ACTIVO'
  }
];

export function SolicitarCertificadoPublico({ onBack }: SolicitarCertificadoPublicoProps) {
  console.log('🚀 COMPONENTE SolicitarCertificadoPublico MONTADO - Versión actualizada');
  
  // Estados del flujo
  const [step, setStep] = useState<'documento' | 'codigo' | 'generando' | 'completado'>('documento');
  const [documento, setDocumento] = useState('');
  const [codigoVerificacion, setCodigoVerificacion] = useState(['', '', '', '', '', '']);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<EmpleadoDB | null>(null);
  const [certificadoGenerado, setCertificadoGenerado] = useState<CertificadoGenerado | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState('');
  
  // Estados para validación QR flotante
  const [showValidacionQR, setShowValidacionQR] = useState(false);
  const [validacionMethod, setValidacionMethod] = useState<'qr' | 'codigo'>('qr');
  const [codigoValidacion, setCodigoValidacion] = useState('');

  // Paso 1: Buscar empleado por documento
  const handleBuscarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍🔍🔍 FUNCIÓN handleBuscarEmpleado EJECUTADA 🔍🔍🔍');
    console.log('📋 Documento ingresado:', documento);
    
    if (!documento || documento.length < 5) {
      console.log('⚠️ Documento inválido - mostrando toast');
      toast.error('Documento inválido', {
        description: 'Por favor ingresa un número de documento válido',
        duration: 3000
      });
      return;
    }

    console.log('✅ Documento válido, iniciando búsqueda...');
    setIsLoading(true);

    // Simular búsqueda en base de datos
    await new Promise(resolve => setTimeout(resolve, 1500));

    const empleado = mockEmpleadosDB.find(emp => emp.documento === documento);
    
    console.log('📋 Empleado encontrado:', empleado);
    console.log('📋 Documento buscado:', documento);

    if (!empleado) {
      setIsLoading(false);
      
      console.log('❌❌❌ NO ENCONTRADO - Mostrando toasts de error ❌❌❌');
      
      // Toast de error principal
      toast.error('❌ Empleado no encontrado', {
        description: 'El número de documento ingresado no está registrado en nuestra base de datos de empleados ESAP.',
        duration: 7000
      });
      
      console.log('✅ Toast de error principal mostrado');
      
      // Toast de información de contacto automático (después de 1 segundo)
      setTimeout(() => {
        console.log('📞📞📞 Mostrando toast de contacto 📞📞📞');
        toast.info('📞 Contacta a Recursos Humanos', {
          description: 'Teléfono: +57 (1) 220 0700 ext. 130\nCorreo: talento.humano@esap.edu.co',
          duration: 10000
        });
        console.log('✅ Toast de contacto mostrado');
      }, 1000);
      
      return;
    }

    if (empleado.estado === 'INACTIVO') {
      setIsLoading(false);
      toast.error('Empleado inactivo', {
        description: 'No es posible generar certificados para empleados inactivos',
        duration: 4000
      });
      return;
    }

    // Generar código de verificación de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoEnviado(codigo);
    setEmpleadoEncontrado(empleado);

    setIsLoading(false);
    setStep('codigo');

    toast.success('¡Empleado encontrado!', {
      description: `Código de verificación enviado a ${empleado.email}`,
      duration: 5000
    });
  };

  // Paso 2: Verificar código de 6 dígitos
  const handleVerificarCodigo = async () => {
    const codigoIngresado = codigoVerificacion.join('');

    if (codigoIngresado.length !== 6) {
      toast.error('Código incompleto', {
        description: 'Por favor ingresa los 6 dígitos del código',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    setStep('generando');

    // Simular verificación
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (codigoIngresado !== codigoEnviado) {
      setIsLoading(false);
      setStep('codigo');
      toast.error('Código incorrecto', {
        description: 'El código ingresado no es válido. Inténtalo nuevamente.',
        duration: 4000
      });
      return;
    }

    // Paso 3: Generar certificado
    await generarCertificado();
  };

  // Paso 3: Generar certificado
  const generarCertificado = async () => {
    // Simular generación de certificado
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nuevoCertificado: CertificadoGenerado = {
      consecutivo: `ESAP-CERT-2025-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
      qrCode: `QR-LAB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      fechaGeneracion: new Date().toISOString(),
      pdfUrl: '/certificados/cert-new.pdf',
      hash: `sha256:${Math.random().toString(36).substring(2, 15)}`
    };

    setCertificadoGenerado(nuevoCertificado);
    setIsLoading(false);
    setStep('completado');

    // Log del evento (en producción se registraría en base de datos)
    console.log('LOG CERTIFICADO GENERADO:', {
      certificado: nuevoCertificado,
      empleado: empleadoEncontrado,
      fechaSolicitud: new Date().toISOString(),
      tipo: 'AUTOSERVICIO',
      emailEnviadoA: [empleadoEncontrado?.email, 'talento.humano@esap.edu.co']
    });

    toast.success('¡Certificado generado exitosamente!', {
      description: `${nuevoCertificado.consecutivo} enviado a tu correo`,
      duration: 5000
    });
  };

  // Reenviar código
  const handleReenviarCodigo = () => {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoEnviado(codigo);
    toast.success('Código reenviado', {
      description: `Nuevo código enviado a ${empleadoEncontrado?.email}`,
      duration: 4000
    });
  };

  // Reiniciar flujo
  const handleNuevaSolicitud = () => {
    setStep('documento');
    setDocumento('');
    setCodigoVerificacion(['', '', '', '', '', '']);
    setEmpleadoEncontrado(null);
    setCertificadoGenerado(null);
    setCodigoEnviado('');
  };

  // Manejar input de código de verificación
  const handleCodigoChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newCodigo = [...codigoVerificacion];
    newCodigo[index] = value;
    setCodigoVerificacion(newCodigo);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      const nextInput = document.getElementById(`codigo-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Manejar backspace
  const handleCodigoKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codigoVerificacion[index] && index > 0) {
      const prevInput = document.getElementById(`codigo-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Validar QR
  const handleValidarQR = async () => {
    if (validacionMethod === 'codigo' && !codigoValidacion) {
      toast.error('Ingresa el código del certificado');
      return;
    }

    toast.loading('Validando certificado...', { id: 'validar' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setShowValidacionQR(false);
    setCodigoValidacion('');
    
    toast.success('Certificado válido', {
      id: 'validar',
      description: 'El certificado es auténtico y está activo',
      duration: 4000
    });
  };

  // Volver al portal
  const handleVolverPortal = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header Fijo Premium */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={esapLogo} alt="ESAP" className="h-10" />
            </div>

            {/* Navegación */}
            <nav className="hidden md:flex items-center gap-8">
              <button className="flex items-center gap-2 text-gray-700 hover:text-[#003DA5] transition-colors font-medium">
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button className="text-gray-700 hover:text-[#003DA5] transition-colors font-medium">
                Servicios
              </button>
              <button className="text-gray-700 hover:text-[#003DA5] transition-colors font-medium">
                Nosotros
              </button>
              <button className="text-gray-700 hover:text-[#003DA5] transition-colors font-medium">
                Contacto
              </button>
            </nav>

            {/* Botón Iniciar Sesión */}
            <Button
              style={{ backgroundColor: '#003DA5' }}
              className="hidden md:flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <User className="w-4 h-4" />
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-4xl">
        {/* Botón Volver al Inicio */}
        <button
          onClick={handleVolverPortal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:shadow-sm mb-6 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        {/* Hero Section */}
        <div className="text-center mb-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-4">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Portal Público de Certificados</span>
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3">
            Solicita tu Certificado Laboral
          </h1>

          {/* Descripción */}
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Verifica la autenticidad de certificados laborales emitidos por la ESAP mediante código QR o número de certificado
          </p>
        </div>

        {/* Contenido Principal */}
        <div>
          {/* PASO 1: Ingresar Documento */}
          {step === 'documento' && (
            <div>
              <Card className="border-0 shadow-lg overflow-hidden">
                {/* Header Azul con Degradado */}
                <div className="bg-gradient-to-r from-[#0052d4] to-[#4364f7] p-6">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold mb-1">Ingresa tu Número de Documento</h2>
                      <p className="text-sm text-blue-50">Validaremos si estás registrado en nuestra base de datos</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleBuscarEmpleado} className="max-w-md mx-auto space-y-6">
                    {/* Input Número de Cédula */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Número de Cédula
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 52345678"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                        className="text-center h-12 text-base border-gray-300 focus:border-[#003DA5] focus:ring-[#003DA5]"
                        maxLength={15}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Botón Continuar */}
                    <Button
                      type="submit"
                      disabled={isLoading || !documento}
                      style={{ backgroundColor: '#6c8ae4' }}
                      className="w-full h-12 text-base hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </Button>

                    {/* Documentos de Prueba */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <h4 className="text-sm font-semibold text-blue-900">Documentos de prueba</h4>
                      </div>
                      <ul className="space-y-1 text-sm text-blue-800 mb-3">
                        <li>• <span className="font-mono">52345678</span> - María Fernanda Rodríguez</li>
                        <li>• <span className="font-mono">79876543</span> - Carlos Alberto Martínez</li>
                        <li>• <span className="font-mono">39654321</span> - Laura Patricia Sánchez</li>
                      </ul>
                      <div className="pt-3 border-t border-blue-300">
                        <p className="text-xs text-blue-700">
                          💡 <span className="font-semibold">Prueba el flujo de error:</span> Ingresa cualquier otro documento (ej: <span className="font-mono">12345678</span>) para ver el mensaje de contacto con Recursos Humanos.
                        </p>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PASO 2: Verificar Código */}
          {step === 'codigo' && (
            <div className="space-y-6">
              {/* Card de Empleado Encontrado */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6">
                  <div className="flex items-start gap-4 text-white">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3">¡Empleado encontrado!</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-emerald-100">Nombre:</p>
                          <p className="font-semibold">{empleadoEncontrado?.nombre}</p>
                        </div>
                        <div>
                          <p className="text-emerald-100">Cargo:</p>
                          <p className="font-semibold">{empleadoEncontrado?.cargo}</p>
                        </div>
                        <div>
                          <p className="text-emerald-100">Dependencia:</p>
                          <p className="font-semibold">{empleadoEncontrado?.dependencia}</p>
                        </div>
                        <div>
                          <p className="text-emerald-100">Email:</p>
                          <p className="font-semibold">{empleadoEncontrado?.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card de Código de Verificación */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-[#0052d4] to-[#4364f7] p-6">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold mb-1">Código de Verificación</h2>
                      <p className="text-sm text-blue-50">Ingresa el código de 6 dígitos enviado a tu correo</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8">
                  <div className="max-w-md mx-auto space-y-6">
                    {/* Inputs de código */}
                    <div className="flex justify-center gap-2">
                      {codigoVerificacion.map((digit, index) => (
                        <input
                          key={index}
                          id={`codigo-${index}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodigoChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodigoKeyDown(index, e)}
                          className="w-10 h-12 md:w-12 md:h-14 text-center text-xl md:text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 transition-all"
                          disabled={isLoading}
                        />
                      ))}
                    </div>

                    {/* Código de prueba */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800 text-center">
                        🧪 Código de prueba: <span className="font-mono font-bold">{codigoEnviado}</span>
                      </p>
                    </div>

                    {/* Botón Verificar */}
                    <Button
                      onClick={handleVerificarCodigo}
                      disabled={isLoading || codigoVerificacion.join('').length !== 6}
                      style={{ backgroundColor: '#6c8ae4' }}
                      className="w-full h-12 text-base hover:opacity-90 transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Verificar Código
                          <CheckCircle className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>

                    {/* Botones secundarios */}
                    <div className="flex justify-center gap-4 text-sm">
                      <button
                        onClick={handleReenviarCodigo}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Reenviar código
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        onClick={handleNuevaSolicitud}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Cambiar documento
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PASO 3: Generando */}
          {step === 'generando' && (
            <div>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-10 h-10 text-[#003DA5] animate-spin" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    Generando tu certificado...
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Estamos creando tu certificado laboral con QR único de validación
                  </p>
                  
                  {/* Progress steps */}
                  <div className="max-w-md mx-auto space-y-3">
                    {[
                      'Validando información',
                      'Generando certificado',
                      'Creando QR único',
                      'Enviando a correos'
                    ].map((text, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 text-left"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-700">{text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PASO 4: Completado */}
          {step === 'completado' && certificadoGenerado && (
            <div>
              <Card className="border-0 shadow-lg overflow-hidden">
                {/* Header Verde de Éxito */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">¡Certificado Generado!</h2>
                      <p className="text-sm text-emerald-50">Tu certificado laboral ha sido generado exitosamente</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Datos del empleado */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-[#003DA5]" />
                      Información del Empleado
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 font-medium mb-1">Nombre:</p>
                        <p className="font-semibold text-gray-900">{empleadoEncontrado?.nombre}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium mb-1">Documento:</p>
                        <p className="font-semibold text-gray-900">{empleadoEncontrado?.documento}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium mb-1">Cargo:</p>
                        <p className="font-semibold text-gray-900">{empleadoEncontrado?.cargo}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium mb-1">Dependencia:</p>
                        <p className="font-semibold text-gray-900">{empleadoEncontrado?.dependencia}</p>
                      </div>
                    </div>
                  </div>

                  {/* Datos del certificado */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      Detalles del Certificado
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">N° Certificado:</span>
                        <span className="text-gray-900 font-mono font-bold">
                          {certificadoGenerado.consecutivo}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Código QR:</span>
                        <span className="text-gray-900 font-mono">
                          {certificadoGenerado.qrCode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Fecha de Emisión:</span>
                        <span className="text-gray-900 font-semibold">
                          {new Date(certificadoGenerado.fechaGeneracion).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR y Hash */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 text-center">
                      <div className="w-32 h-32 bg-white border-2 border-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-xs font-semibold text-gray-900">Código QR Único</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">
                        Hash de Verificación
                      </h4>
                      <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">
                        {certificadoGenerado.hash}
                      </p>
                    </div>
                  </div>

                  {/* Notificaciones enviadas */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-2">
                          Notificaciones Enviadas
                        </h4>
                        <ul className="text-xs text-gray-700 space-y-1">
                          <li>✓ Certificado enviado a: <span className="font-semibold">{empleadoEncontrado?.email}</span></li>
                          <li>✓ Copia al administrador: <span className="font-semibold">talento.humano@esap.edu.co</span></li>
                          <li>✓ Registro de auditoría generado</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      style={{ backgroundColor: '#003DA5' }}
                      className="flex-1 h-12 text-base hover:opacity-90 transition-all"
                      onClick={() => toast.success('Descargando certificado...')}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Certificado
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 text-base border-2"
                      onClick={handleNuevaSolicitud}
                    >
                      Nueva Solicitud
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer Oscuro Premium */}
      <footer className="bg-[#1a1f2e] text-gray-300 py-12 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <img src={esapLogoWhite} alt="ESAP" className="h-10 mb-4" />
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Transformando la educación pública en Colombia con tecnología de clase mundial.
              </p>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h3 className="text-white font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-semibold mb-4">Servicios</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certificados Laborales</a></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contacto</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-0.5" />
                  <span>Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#003DA5]" />
                  <span>+57 (1) 220 0700</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#003DA5]" />
                  <span>info@esap.edu.co</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            <p>© 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Modal Flotante: Validar QR */}
      {showValidacionQR && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowValidacionQR(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Validar Certificado
              </h3>
              <button
                onClick={() => setShowValidacionQR(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setValidacionMethod('qr')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
                  validacionMethod === 'qr'
                    ? 'bg-[#003DA5] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Camera className="w-4 h-4 inline mr-2" />
                Escanear QR
              </button>
              <button
                onClick={() => setValidacionMethod('codigo')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
                  validacionMethod === 'codigo'
                    ? 'bg-[#003DA5] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Hash className="w-4 h-4 inline mr-2" />
                Ingresar Código
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {validacionMethod === 'qr' ? (
                <div className="text-center py-8">
                  <div className="w-40 h-40 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Coloca el código QR del certificado frente a la cámara
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Código del Certificado
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: ESAP-CERT-2025-04E23"
                    value={codigoValidacion}
                    onChange={(e) => setCodigoValidacion(e.target.value)}
                    className="h-12 text-center font-mono"
                  />
                </div>
              )}

              <Button
                onClick={handleValidarQR}
                style={{ backgroundColor: '#003DA5' }}
                className="w-full h-12 hover:opacity-90 transition-all"
                disabled={validacionMethod === 'codigo' && !codigoValidacion}
              >
                <Shield className="w-5 h-5 mr-2" />
                Validar Certificado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Flotante: Validar Certificado */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowValidacionQR(true)}
          style={{ backgroundColor: '#003DA5' }}
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 p-0"
          title="Validar Certificado"
        >
          <QrCode className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}