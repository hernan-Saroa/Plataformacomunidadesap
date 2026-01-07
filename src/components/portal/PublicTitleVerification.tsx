import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, AlertCircle, Award, User, Loader2, Building2, UserCircle, Mail, FileText, CheckCircle, Shield, Sparkles, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';
import { VerificationCertificateDisplay } from './VerificationCertificateDisplay';
import { VerificationCertificate } from '../../types';
import { PublicNavbar } from './PublicNavbar';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { simularEnvioCorreo } from '../../utils/emailTemplates';
import graduadosService from '../../services/api/graduados.service';

interface PublicTitleVerificationProps {
  onBack: () => void;
  onLoginClick?: () => void;
}

/**
 * LÓGICA DE NEGOCIO - VERIFICACIÓN DE TÍTULOS ESAP
 *
 * Regla fundamental:
 * - TODOS los registros en la base de datos son graduados (Pregrado, Especialización o Maestría)
 * - NO existe el caso de una persona en BD que NO esté graduada
 *
 * Flujos:
 * 1. Si el graduado ESTÁ en la BD → Certificado generado INSTANTÁNEAMENTE
 * 2. Si el graduado NO está en la BD → Solicitud de revisión manual (48-72 horas)
 *
 * En el flujo 2, el equipo administrativo revisa registros históricos y:
 * - Si encuentra al graduado → Lo agrega a BD y genera certificado
 * - Si NO lo encuentra → Informa al solicitante que no es graduado ESAP
 */

export function PublicTitleVerification({ onBack, onLoginClick }: PublicTitleVerificationProps) {
  const formatDateOnly = (value: string) => {
    if (!value) {
      return '';
    }

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      const parsed = new Date(year, month, day, 12, 0, 0);
      return parsed.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    if (value.includes('/')) {
      const [dayRaw, monthRaw, yearRaw] = value.split('/').map((segment) => segment.trim());
      const day = Number(dayRaw);
      const month = Number(monthRaw) - 1;
      const year = Number(yearRaw);
      const parsed = new Date(year, month, day, 12, 0, 0);
      return parsed.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return value;
  };

  // Form states
  const [graduateDocumentNumber, setGraduateDocumentNumber] = useState('');
  const [graduateDocumentIssueDate, setGraduateDocumentIssueDate] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterType, setRequesterType] = useState<'empresa' | 'graduado'>('graduado');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<VerificationCertificate | null>(null);
  const [reviewRequestCreated, setReviewRequestCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!graduateDocumentNumber) {
      toast.error('Por favor ingresa el número de cédula del graduado');
      return;
    }
    if (!requesterName) {
      toast.error('Por favor ingresa tu nombre o el de tu empresa');
      return;
    }
    if (!requesterEmail) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      toast.error('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsGenerating(true);
    setReviewRequestCreated(false);

    try {
      const respuesta = await graduadosService.autoservicio.solicitarCertificado({
        idNumber: graduateDocumentNumber,
        ...(graduateDocumentIssueDate ? { idIssueDate: graduateDocumentIssueDate } : {}),
        requesterType: requesterType === 'graduado' ? 'GRADUATE' : 'COMPANY',
        requesterName,
        requesterEmail,
      });
      console.log('Respuesta solicitarCertificado:', respuesta);

      if (!respuesta) {
        setIsGenerating(false);
        toast.error('No se recibió respuesta del servicio');
        return;
      }

      if (respuesta.existe && !respuesta.certificado) {
        setIsGenerating(false);
        toast.error('Respuesta incompleta del servicio', {
          description: 'El graduado existe, pero no llegó el certificado.',
        });
        return;
      }

      if (!respuesta.existe || !respuesta.certificado) {
        // Graduado NO encontrado - Crear solicitud de revision manual
        // LOGICA DE NEGOCIO: Todos en la BD estan graduados (Pregrado/Especializacion/Maestria)
        // Si NO esta en BD -> Solicitud de revision manual (48-72h)
        setIsGenerating(false);
        setReviewRequestCreated(true);

        toast.info('Solicitud de revision creada', {
          description: respuesta?.mensaje || 'No se encontro el graduado en nuestra base de datos. Se ha generado una solicitud de revision manual (48-72 horas).'
        });

        // Enviar correo de confirmacion de solicitud de revision
        const numeroSolicitud = 'REV-2025-' + Math.floor(1000 + Math.random() * 9000);
        simularEnvioCorreo('verificacion-titulo-revision', {
          nombreCompleto: requesterName,
          correoDestino: requesterEmail,
          consecutivoCertificado: numeroSolicitud,
          datosAdicionales: {
            nombreGraduado: 'Datos proporcionados',
            documentoGraduado: graduateDocumentNumber
          }
        });

        return;
      }

      const certificado = respuesta.certificado;

      const certificate: VerificationCertificate = {
        id: certificado.id,
        certificateNumber: certificado.certificateNumber,
        qrCode: certificado.verificationCode,
        qrUrl: `${window.location.origin}/verificar-certificado/${certificado.verificationCode}`,

        graduate: {
          documentNumber: certificado.idNumber,
          documentIssueDate: graduateDocumentIssueDate,
          fullName: certificado.fullName,
          titleType: certificado.programType,
          programName: certificado.programName,
          diplomaNumber: certificado.diplomaNumber || '',
          graduationDate: certificado.graduationDate,
        },

        requester: {
          name: requesterName,
          email: requesterEmail,
          type: requesterType,
        },

        status:
          certificado.status === 'VALID'
            ? 'active'
            : certificado.status === 'REVOKED'
              ? 'revoked'
              : 'expired',
        generatedAt: certificado.issueDate || new Date().toISOString(),
        viewCount: 0,
        qrScanCount: 0,
        scanHistory: [],
        certificatePdfUrl: certificado.pdfUrl,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setGeneratedCertificate(certificate);
      setIsGenerating(false);
      toast.success(respuesta.mensaje || 'Certificado generado exitosamente');

      // Enviar correo con el certificado generado
      simularEnvioCorreo('verificacion-titulo-generado', {
        nombreCompleto: requesterName,
        correoDestino: requesterEmail,
        consecutivoCertificado: certificate.certificateNumber,
        urlValidacion: certificate.qrUrl,
        datosAdicionales: {
          nombreGraduado: certificado.fullName,
          programa: certificado.programName,
          tipoTitulo: certificado.programType,
          fechaGraduacion: new Date(certificado.graduationDate).toLocaleDateString('es-CO')
        }
      });
    } catch (error: any) {
      setIsGenerating(false);
      console.error('Error al verificar graduado:', error);
      toast.error('Error al verificar graduado', {
        description: error.response?.data?.message || error.message || 'Por favor intenta de nuevo'
      });
    }
  };

  const handleReset = () => {
    setGraduateDocumentNumber('');
    setGraduateDocumentIssueDate('');
    setRequesterName('');
    setRequesterEmail('');
    setRequesterType('graduado');
    setGeneratedCertificate(null);
    setReviewRequestCreated(false);
  };

  // Si hay un certificado generado, mostrarlo
  if (generatedCertificate) {
    return (
      <VerificationCertificateDisplay 
        certificate={generatedCertificate}
        onClose={handleReset}
      />
    );
  }

  // Si se creó una solicitud de revisión, mostrar confirmación
  if (reviewRequestCreated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* ✅ Navbar Superior Completo */}
        <PublicNavbar 
          onLoginClick={() => onLoginClick?.()} 
          onNavigateToHome={onBack}
        />
        
        {/* Header/Navbar espaciado */}
        <div className="h-20" />

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          {/* Botón Volver Premium */}
          <motion.button
            onClick={onBack}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 text-gray-700 hover:text-[#1e5da8] hover:border-[#1e5da8] hover:shadow-lg mb-8 transition-all font-medium min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al Inicio</span>
          </motion.button>

          {/* Card Premium con Animación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              {/* Header con Degradado */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">Solicitud de Revisión Creada</h2>
                    <p className="text-amber-50">Tiempo estimado: 48-72 horas</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 space-y-6">
                {/* ¿Qué sucedió? */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    ¿Qué sucedió?
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    No encontramos el registro del graduado con la cédula <span className="font-mono font-bold text-[#1e5da8]">{graduateDocumentNumber}</span> en nuestra base de datos de graduados ESAP.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Hemos generado una <strong>solicitud de revisión manual</strong> que será evaluada por nuestro equipo administrativo en las próximas <strong className="text-amber-600">48 a 72 horas</strong>.
                  </p>
                </div>

                {/* Datos de la Solicitud */}
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#1e5da8]" />
                    Datos de tu Solicitud
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Cédula Consultada</p>
                      <p className="font-mono font-bold text-lg text-gray-900">{graduateDocumentNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Fecha de Expedición</p>
                      <p className="font-bold text-lg text-gray-900">
                        {formatDateOnly(graduateDocumentIssueDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Solicitante</p>
                      <p className="font-bold text-lg text-gray-900">{requesterName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Email de Contacto</p>
                      <p className="font-bold text-lg text-[#1e5da8] break-all">{requesterEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Próximos Pasos */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-3 text-lg">Próximos Pasos</p>
                      <ul className="space-y-2.5">
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Te enviaremos un correo de confirmación a <strong className="text-gray-900">{requesterEmail}</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Nuestro equipo revisará la solicitud en las próximas <strong className="text-amber-600">48 a 72 horas</strong></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Recibirás una notificación con el resultado de la revisión</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700">Si el graduado es encontrado en registros históricos, generaremos el certificado automáticamente</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 h-12 text-base border-2 hover:border-[#1e5da8] hover:text-[#1e5da8]"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Nueva Solicitud
                  </Button>
                  <Button
                    onClick={onBack}
                    style={{ backgroundColor: '#1e5da8' }}
                    className="flex-1 h-12 text-base hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver al Inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>

        {/* Footer Premium */}
        <footer className="bg-gray-900 text-gray-300 py-16 lg:py-20 mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              
              {/* Brand */}
              <div>
                <img src={esapLogoWhite} alt="ESAP" className="h-12 mb-6" />
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Transformando la educación pública en Colombia con tecnología de clase mundial.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                </div>
              </div>

              {/* Enlaces Rápidos */}
              <div>
                <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Programas Académicos</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
                </ul>
              </div>

              {/* Servicios */}
              <div>
                <h3 className="text-white font-bold mb-4">Servicios</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Campus Virtual</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
                </ul>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-white font-bold mb-4">Contacto</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-1" />
                    <span className="text-sm">Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                    <span className="text-sm">+57 (1) 220 0700</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                    <span className="text-sm">info@esap.edu.co</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                <a href="#" className="hover:text-white transition-colors">Términos</a>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ✅ Navbar Superior Completo */}
      <PublicNavbar 
        onLoginClick={() => onLoginClick?.()} 
        onNavigateToHome={onBack}
      />
      
      {/* Header/Navbar espaciado */}
      <div className="h-20" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl">
        {/* Botón Volver Premium */}
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 text-gray-700 hover:text-[#1e5da8] hover:border-[#1e5da8] hover:shadow-lg mb-8 transition-all font-medium min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver al Inicio</span>
        </motion.button>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Verificación Oficial de Títulos</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Verificación de Títulos<br/>
            <span className="text-[#1e5da8]">Graduados ESAP</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Obtén un certificado oficial de verificación con código QR en segundos
          </p>
        </motion.div>

        {/* Main Card con animación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-[#1e5da8] to-blue-600 p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Solicitud de Certificado</h2>
                  <p className="text-blue-100">Ingresa los datos del graduado</p>
                </div>
              </div>
            </div>

            <CardContent className="p-8">
              {/* Info Banner Premium */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-8"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-2 text-lg">¿Cómo funciona?</p>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Verifica títulos académicos de graduados ESAP (Pregrado, Especialización y Maestría). 
                      El certificado incluye un código QR único para validación.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700"><strong>Certificado instantáneo</strong> si el graduado está en nuestra base de datos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Si NO está registrado, se crea solicitud de revisión manual <strong>(48-72h)</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Enviado por correo electrónico en formato PDF con código QR verificable</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Graduate Information */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-[#1e5da8]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Información del Graduado</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="graduateDocument" className="text-base font-semibold text-gray-900">
                        Número de Cédula <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="graduateDocument"
                        type="text"
                        value={graduateDocumentNumber}
                        onChange={(e) => setGraduateDocumentNumber(e.target.value)}
                        placeholder="Ej: 1234567890"
                        className="h-12 text-base border-2 focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Requester Information */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Información del Solicitante</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-gray-900">
                      Tipo de Solicitante <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        onClick={() => setRequesterType('graduado')}
                        variant={requesterType === 'graduado' ? 'default' : 'outline'}
                        className={`h-14 text-base border-2 transition-all ${
                          requesterType === 'graduado' 
                            ? 'bg-[#1e5da8] border-[#1e5da8] hover:bg-[#1a4d8f] shadow-lg' 
                            : 'hover:border-[#1e5da8] hover:text-[#1e5da8]'
                        }`}
                      >
                        <UserCircle className="w-5 h-5 mr-2" />
                        Soy Graduado
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setRequesterType('empresa')}
                        variant={requesterType === 'empresa' ? 'default' : 'outline'}
                        className={`h-14 text-base border-2 transition-all ${
                          requesterType === 'empresa' 
                            ? 'bg-[#1e5da8] border-[#1e5da8] hover:bg-[#1a4d8f] shadow-lg' 
                            : 'hover:border-[#1e5da8] hover:text-[#1e5da8]'
                        }`}
                      >
                        <Building2 className="w-5 h-5 mr-2" />
                        Soy Empresa
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="requesterName" className="text-base font-semibold text-gray-900">
                        {requesterType === 'empresa' ? 'Nombre de la Empresa' : 'Nombre Completo'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="requesterName"
                        type="text"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        placeholder={requesterType === 'empresa' ? 'Ej: Empresa ABC S.A.S.' : 'Ej: María Fernanda Rodríguez'}
                        className="h-12 text-base border-2 focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requesterEmail" className="text-base font-semibold text-gray-900">
                        Correo Electrónico <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                        <Input
                          id="requesterEmail"
                          type="email"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="h-12 text-base pl-12 border-2 focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20"
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        El certificado será enviado a este correo
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Important Notice */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-2 text-lg">Importante</p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold mt-0.5">•</span>
                          <span>Verifica que el número de cédula y la fecha de expedición sean correctos</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold mt-0.5">•</span>
                          <span>Si el graduado está en nuestra base de datos, el certificado se generará <strong>instantáneamente</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold mt-0.5">•</span>
                          <span>Si NO está registrado, se creará una solicitud de revisión manual (48-72 horas)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Submit Button Premium */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="pt-4"
                >
                  <Button
                    type="submit"
                    disabled={isGenerating}
                    style={{ backgroundColor: '#1e5da8' }}
                    className="w-full h-14 text-lg font-bold hover:opacity-90 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Generando Certificado...
                      </>
                    ) : (
                      <>
                        <Award className="w-6 h-6 mr-3" />
                        Solicitar Certificado de Verificación
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Example Data Section */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-12 pt-8 border-t-2 border-gray-200"
              >
                <div className="space-y-4">
                  {/* EJEMPLO EXITOSO */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-6">
                    <h4 className="font-bold mb-3 text-lg flex items-center gap-2 text-emerald-800">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      ✅ Prueba con estos datos de ejemplo (CASO EXITOSO)
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 mb-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Cédula</p>
                        <p className="font-mono font-bold text-lg text-gray-900">1012345678</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Fecha de Expedición</p>
                        <p className="font-bold text-lg text-gray-900">2010-05-15</p>
                      </div>
                    </div>
                    <p className="text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      MARÍA FERNANDA RODRÍGUEZ GÓMEZ - Pregrado en Administración Pública Territorial
                    </p>
                  </div>

                  {/* EJEMPLO NO EXITOSO */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-6">
                    <h4 className="font-bold mb-3 text-lg flex items-center gap-2 text-orange-800">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      ❌ Prueba con estos datos (CASO NO EXITOSO)
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4 mb-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-orange-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Cédula</p>
                        <p className="font-mono font-bold text-lg text-gray-900">9876543210</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-orange-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Fecha de Expedición</p>
                        <p className="font-bold text-lg text-gray-900">2010-06-20</p>
                      </div>
                    </div>
                    <p className="text-sm text-orange-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Este graduado NO está registrado - Se creará solicitud de revisión manual (48-72h)
                    </p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer Premium */}
      <footer className="bg-gray-900 text-gray-300 py-16 lg:py-20 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Brand */}
            <div>
              <img src={esapLogoWhite} alt="ESAP" className="h-12 mb-6" />
              <p className="text-gray-400 mb-6 leading-relaxed">
                Transformando la educación pública en Colombia con tecnología de clase mundial.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas Académicos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
              </ul>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-bold mb-4">Servicios</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Campus Virtual</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-white font-bold mb-4">Contacto</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-1" />
                  <span className="text-sm">Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">+57 (1) 220 0700</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">info@esap.edu.co</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
