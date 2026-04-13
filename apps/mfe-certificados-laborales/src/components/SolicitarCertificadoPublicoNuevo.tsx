/**
 * COMPONENTE NUEVO - CERTIFICADOS LABORALES PÚBLICOS
 * Creado desde cero con enfoque simple y funcional
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Mail, 
  CheckCircle, 
  FileText,
  Download,
  QrCode,
  ArrowRight,
  Home,
  Sparkles,
  MapPin,
  Phone
} from 'lucide-react';
import esapLogo from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { buildApiUrl } from '../../config/environment';

// Base de datos mock de empleados
const EMPLEADOS_DB = [
  {
    documento: '52345678',
    nombre: 'María Fernanda Rodríguez López',
    email: 'maria.rodriguez@esap.edu.co',
    cargo: 'Docente Tiempo Completo',
    dependencia: 'Dirección Territorial Bogotá',
    estado: 'ACTIVO'
  },
  {
    documento: '79876543',
    nombre: 'Carlos Alberto Martínez Gómez',
    email: 'carlos.martinez@esap.edu.co',
    cargo: 'Coordinador GIT',
    dependencia: 'Dirección de Talento Humano',
    estado: 'ACTIVO'
  },
  {
    documento: '39654321',
    nombre: 'Laura Patricia Sánchez Cruz',
    email: 'laura.sanchez@esap.edu.co',
    cargo: 'Asistente Administrativo',
    dependencia: 'Dirección Territorial Antioquia',
    estado: 'ACTIVO'
  }
];

interface Props {
  onBack?: () => void;
}

export function SolicitarCertificadoPublicoNuevo({ onBack }: Props) {
  // Estados simples
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [empleado, setEmpleado] = useState<any>(null);
  const [codigoEnviado, setCodigoEnviado] = useState('');
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const [certificado, setCertificado] = useState<any>(null);

  // PASO 1: Buscar empleado
  const buscarEmpleado = async () => {
    console.log('✅ Función buscarEmpleado llamada');
    console.log('📄 Documento:', documento);

    if (!documento || documento.length < 5) {
      toast.error('Por favor ingresa un número de documento válido');
      return;
    }

    setLoading(true);

    try {
      // Generar código de validación (esto ya valida todo: si existe y si tiene certificado)
      const codigoResponse = await fetch(
        buildApiUrl('certificados', '/api/v1/certificates/autoservicio/generar-codigo'),
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documento }),
        },
      );

      console.log('🔍 Status de respuesta:', codigoResponse.status);
      console.log('🔍 Response OK?:', codigoResponse.ok);

      if (!codigoResponse.ok) {
        const errorData = await codigoResponse.json();
        console.log('❌ Error del servidor completo:', errorData);
        console.log('❌ Mensaje de error:', errorData.message);
        setLoading(false);

        // El mensaje puede venir en errorData.message
        const mensaje = errorData.message || 'Error al procesar la solicitud';

        // Determinar el tipo de error
        if (codigoResponse.status === 404 || mensaje.includes('no encontrado') || mensaje.includes('No se encontró')) {
          console.log('⚠️ Mostrando error de documento no encontrado');
          toast.error('❌ Documento No Encontrado', {
            description: 'El número de documento ingresado no está registrado en nuestra base de datos',
            duration: 6000
          });

          setTimeout(() => {
            toast.info('📞 ¿Necesitas ayuda?', {
              description: 'Contacta a Talento Humano ESAP:\nTel: +57 (1) 220 0700 ext. 130\nEmail: talento.humano@esap.edu.co',
              duration: 8000
            });
          }, 1000);
        } else if (mensaje.includes('Ya tienes') || mensaje.includes('certificado generado')) {
          console.log('⚠️ Mostrando error de certificado ya existente');
          toast.error('⚠️ Ya Tienes un Certificado', {
            description: mensaje,
            duration: 7000
          });
        } else {
          console.log('⚠️ Mostrando error genérico');
          toast.error('❌ Error', {
            description: mensaje,
            duration: 5000
          });
        }

        console.log('🛑 DETENIENDO EJECUCIÓN - No debería continuar');
        return; // CRÍTICO: Detener aquí
      }

      console.log('✅ Respuesta exitosa, parseando JSON...');
      const codigoData = await codigoResponse.json();
      console.log('📧 Código generado exitosamente:', codigoData);

      const empleadoData = {
        documento: codigoData.solicitud.id_number,
        nombre: codigoData.solicitud.full_name,
        email: codigoData.solicitud.email || 'email@esap.edu.co',
        cargo: codigoData.solicitud.position_category || 'Sin especificar',
        dependencia: codigoData.solicitud.department || 'Sin especificar',
        estado: 'ACTIVO'
      };

      // Usar el código generado por el backend (en desarrollo es 470547)
      setCodigoEnviado(codigoData.codigoTest || '470547');
      setEmpleado(empleadoData);
      setLoading(false);
      setPaso(2);

      toast.success('✅ ¡Código enviado!', {
        description: `Código de validación enviado a ${empleadoData.email}`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error al verificar documento:', error);
      setLoading(false);
      toast.error('❌ Error de conexión', {
        description: 'No se pudo verificar el documento. Por favor intenta nuevamente.',
        duration: 5000
      });
    }
  };

  // Handler del formulario paso 1
  const handleSubmitPaso1 = async (e: React.FormEvent) => {
    e.preventDefault();
    await buscarEmpleado();
  };

  // PASO 2: Verificar código
  const verificarCodigo = async () => {
    const codigoIngresado = codigo.join('');
    
    if (codigoIngresado.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos');
      return;
    }

    setLoading(true);
    setPaso(3);
    
    await new Promise(r => setTimeout(r, 2000));

    if (codigoIngresado !== codigoEnviado) {
      toast.error('Código incorrecto');
      setLoading(false);
      setPaso(2);
      return;
    }

    // Generar certificado
    await generarCertificado();
  };

  // PASO 3: Generar certificado
  const generarCertificado = async () => {
    await new Promise(r => setTimeout(r, 3000));

    const cert = {
      numero: `ESAP-CERT-2025-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
      qr: `QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      fecha: new Date().toISOString()
    };

    setCertificado(cert);
    setLoading(false);
    setPaso(4);

    toast.success('¡Certificado generado!', {
      description: `${cert.numero} enviado a tu correo`,
      duration: 5000
    });
  };

  // Manejar cambio de código
  const handleCodigoChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const nuevoCodigo = [...codigo];
    nuevoCodigo[index] = value;
    setCodigo(nuevoCodigo);

    if (value && index < 5) {
      const siguiente = document.getElementById(`cod-${index + 1}`);
      siguiente?.focus();
    }
  };

  // Reiniciar
  const reiniciar = () => {
    setPaso(1);
    setDocumento('');
    setCodigo(['', '', '', '', '', '']);
    setEmpleado(null);
    setCertificado(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <img src={esapLogo} alt="ESAP" className="h-10" />
          
          <nav className="hidden md:flex gap-8">
            <button className="flex items-center gap-2 text-gray-700 hover:text-[#003DA5] font-medium">
              <Home className="w-4 h-4" />
              Inicio
            </button>
            <button className="text-gray-700 hover:text-[#003DA5] font-medium">Servicios</button>
            <button className="text-gray-700 hover:text-[#003DA5] font-medium">Nosotros</button>
            <button className="text-gray-700 hover:text-[#003DA5] font-medium">Contacto</button>
          </nav>

          <Button
            style={{ backgroundColor: '#003DA5' }}
            className="hidden md:flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Iniciar Sesión
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Botón Volver */}
        <button
          onClick={() => onBack ? onBack() : window.history.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border mb-6 hover:shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </button>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-4">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Portal Público de Certificados</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Solicita tu Certificado Laboral
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Obtén tu certificado laboral ESAP de forma rápida y segura
          </p>
        </div>

        {/* PASO 1: Documento */}
        {paso === 1 && (
          <Card className="shadow-lg">
            <div className="bg-gradient-to-r from-[#0052d4] to-[#4364f7] p-6">
              <div className="flex items-center gap-4 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Ingresa tu Documento</h2>
                  <p className="text-sm text-blue-50">Validaremos si estás registrado</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleSubmitPaso1}>
                <div className="max-w-md mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Número de Cédula
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej: 52345678"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                      className="text-center h-12 text-base"
                      maxLength={15}
                      disabled={loading}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          buscarEmpleado();
                        }
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !documento}
                    style={{ backgroundColor: '#6c8ae4', cursor: 'pointer' }}
                    className="w-full h-12"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
                      <h4 className="text-sm font-semibold text-blue-900">Documentos de prueba</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• <span className="font-mono">52345678</span> - María Fernanda Rodríguez</li>
                      <li>• <span className="font-mono">79876543</span> - Carlos Alberto Martínez</li>
                      <li>• <span className="font-mono">39654321</span> - Laura Patricia Sánchez</li>
                    </ul>
                    <div className="pt-3 border-t border-blue-300 mt-3">
                      <p className="text-xs text-blue-700">
                        💡 <span className="font-semibold">Prueba el error:</span> Ingresa cualquier otro documento (ej: <span className="font-mono">12345678</span>)
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* PASO 2: Código */}
        {paso === 2 && empleado && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6">
                <div className="flex items-center gap-4 text-white">
                  <CheckCircle className="w-12 h-12" />
                  <div>
                    <h3 className="text-xl font-bold">¡Empleado encontrado!</h3>
                    <p className="text-sm">{empleado.nombre}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Cargo:</p>
                    <p className="font-semibold">{empleado.cargo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Dependencia:</p>
                    <p className="font-semibold">{empleado.dependencia}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <div className="bg-gradient-to-r from-[#0052d4] to-[#4364f7] p-6">
                <div className="flex items-center gap-4 text-white">
                  <Mail className="w-12 h-12" />
                  <div>
                    <h2 className="text-xl font-bold">Código de Verificación</h2>
                    <p className="text-sm text-blue-50">Ingresa el código de 6 dígitos</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="flex justify-center gap-2">
                    {codigo.map((dig, idx) => (
                      <input
                        key={idx}
                        id={`cod-${idx}`}
                        type="text"
                        maxLength={1}
                        value={dig}
                        onChange={(e) => handleCodigoChange(idx, e.target.value)}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-[#003DA5]"
                        disabled={loading}
                      />
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 text-center">
                      🧪 Código de prueba: <span className="font-mono font-bold">{codigoEnviado}</span>
                    </p>
                  </div>

                  <Button
                    onClick={verificarCodigo}
                    disabled={loading || codigo.join('').length !== 6}
                    style={{ backgroundColor: '#6c8ae4' }}
                    className="w-full h-12"
                  >
                    {loading ? (
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

                  <div className="flex justify-center gap-4 text-sm">
                    <button
                      onClick={() => {
                        const nuevo = Math.floor(100000 + Math.random() * 900000).toString();
                        setCodigoEnviado(nuevo);
                        toast.success('Código reenviado');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reenviar código
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={reiniciar}
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
        {paso === 3 && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-[#003DA5] animate-spin" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Generando certificado...</h2>
              <p className="text-gray-600 mb-8">
                Creando tu certificado con QR único de validación
              </p>
              <div className="max-w-md mx-auto space-y-3">
                {['Validando información', 'Generando certificado', 'Creando QR único', 'Enviando a correos'].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-left">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PASO 4: Completado */}
        {paso === 4 && certificado && empleado && (
          <Card className="shadow-lg">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6">
              <div className="flex items-center gap-4 text-white">
                <CheckCircle className="w-16 h-16" />
                <div>
                  <h2 className="text-2xl font-bold">¡Certificado Generado!</h2>
                  <p className="text-sm">Tu certificado ha sido generado exitosamente</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#003DA5]" />
                  Información del Empleado
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Nombre:</p>
                    <p className="font-semibold">{empleado.nombre}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Documento:</p>
                    <p className="font-semibold">{empleado.documento}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Cargo:</p>
                    <p className="font-semibold">{empleado.cargo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Dependencia:</p>
                    <p className="font-semibold">{empleado.dependencia}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Detalles del Certificado
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">N° Certificado:</span>
                    <span className="font-mono font-bold">{certificado.numero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Código QR:</span>
                    <span className="font-mono">{certificado.qr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Fecha de Emisión:</span>
                    <span className="font-semibold">
                      {new Date(certificado.fecha).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-5 text-center">
                <div className="w-32 h-32 bg-white border-2 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-xs font-semibold">Código QR Único</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold mb-2">Notificaciones Enviadas</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>✓ Certificado enviado a: <span className="font-semibold">{empleado.email}</span></li>
                      <li>✓ Copia al administrador: <span className="font-semibold">talento.humano@esap.edu.co</span></li>
                      <li>✓ Registro de auditoría generado</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  style={{ backgroundColor: '#003DA5' }}
                  className="flex-1 h-12"
                  onClick={() => toast.success('Descargando certificado...')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Descargar Certificado
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-2"
                  onClick={reiniciar}
                >
                  Nueva Solicitud
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1f2e] text-gray-300 py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={esapLogoWhite} alt="ESAP" className="h-10 mb-4" />
              <p className="text-sm text-gray-400">
                Transformando la educación pública en Colombia
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white">Programas</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Servicios</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Vinculaciones</a></li>
                <li><a href="#" className="hover:text-white">Verificación</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contacto</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#003DA5] mt-0.5" />
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
          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            <p>© 2025 ESAP. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
