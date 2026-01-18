import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, AlertCircle, Award, Calendar, User, Loader2, Building2, UserCircle, Mail, FileText, CheckCircle, Shield, Sparkles, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';
import { VerificationCertificateDisplay } from './VerificationCertificateDisplay';
import { VerificationCertificate } from '../../types';
import { PublicNavbar } from './PublicNavbar';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import graduadosService, { type CertificadoGraduado } from '../../services/api/graduados.service';

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
 * 
 * ✅ COORDINADO CON BACKOFFICE: 
 * Este servicio consulta directamente el módulo de "Gestión de Graduados" del backoffice
 */

export function PublicTitleVerification({ onBack, onLoginClick }: PublicTitleVerificationProps) {
  // Form states
  const [graduateDocumentNumber, setGraduateDocumentNumber] = useState('');
  const [graduateDocumentIssueDate, setGraduateDocumentIssueDate] = useState('');
  const [graduateLastName, setGraduateLastName] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterType, setRequesterType] = useState<'empresa' | 'graduado'>('graduado');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<VerificationCertificate | null>(null);
  const [reviewRequestCreated, setReviewRequestCreated] = useState(false);

  const mapCertificado = (
    certificado: CertificadoGraduado,
    requester: { name: string; email: string; type: 'empresa' | 'graduado' }
  ): VerificationCertificate => {
    const statusMap: VerificationCertificate['status'] =
      certificado.status === 'REVOKED'
        ? 'revoked'
        : certificado.status === 'EXPIRED'
          ? 'expired'
          : 'active';

    const nowIso = new Date().toISOString();

    return {
      id: certificado.id,
      certificateNumber: certificado.certificateNumber,
      qrCode: certificado.verificationCode,
      qrUrl: `${window.location.origin}/verificar-certificado/${certificado.verificationCode}`,
      graduate: {
        documentNumber: certificado.idNumber,
        documentIssueDate: '',
        fullName: certificado.fullName,
        titleType: certificado.degreeTitle || certificado.programType || certificado.programName,
        programName: certificado.programName,
        diplomaNumber: certificado.diplomaNumber || '',
        graduationDate: certificado.graduationDate,
      },
      requester,
      status: statusMap,
      generatedAt: certificado.issueDate || nowIso,
      viewCount: 0,
      qrScanCount: 0,
      scanHistory: [],
      createdAt: certificado.issueDate || nowIso,
      updatedAt: certificado.issueDate || nowIso,
      certificatePdfUrl: certificado.pdfUrl || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!graduateDocumentNumber) {
      toast.error('Por favor ingresa el numero de cedula del graduado');
      return;
    }
    if (!graduateDocumentIssueDate) {
      toast.error('Por favor ingresa la fecha de grado del graduado');
      return;
    }
    if (!graduateLastName) {
      toast.error('Por favor ingresa el apellido del graduado');
      return;
    }
    if (!requesterName) {
      toast.error('Por favor ingresa tu nombre o el de tu empresa');
      return;
    }
    if (!requesterEmail) {
      toast.error('Por favor ingresa tu correo electronico');
      return;
    }

    // Validacion de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      toast.error('Por favor ingresa un correo electronico valido');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await graduadosService.autoservicio.solicitarCertificado({
        idNumber: graduateDocumentNumber,
        graduationDate: graduateDocumentIssueDate,
        lastName: graduateLastName,
        requesterType: requesterType === 'empresa' ? 'COMPANY' : 'GRADUATE',
        requesterName,
        requesterEmail,
      });

      if (!response.existe) {
        setReviewRequestCreated(true);
        setGeneratedCertificate(null);
        toast.info('Solicitud de revision creada', {
          description:
            response.mensaje ||
            'No se encontro el graduado en nuestra base de datos. Se ha generado una solicitud de revision manual (48-72 horas).',
        });
        return;
      }

      if (!response.certificado) {
        throw new Error('No se pudo generar el certificado. Intenta nuevamente.');
      }

      const certificate = mapCertificado(response.certificado, {
        name: requesterName,
        email: requesterEmail,
        type: requesterType,
      });

      setGeneratedCertificate(certificate);
      setReviewRequestCreated(false);
      toast.success('Certificado generado exitosamente');
    } catch (error: any) {
      console.error('Error al solicitar certificado:', error);
      toast.error('Error al generar el certificado', {
        description: error?.message || 'Por favor intenta nuevamente',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGraduateDocumentNumber('');
    setGraduateDocumentIssueDate('');
    setGraduateLastName('');
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
                      <p className="text-sm text-gray-600 font-medium">Fecha de Grado</p>
                      <p className="font-bold text-lg text-gray-900">{new Date(graduateDocumentIssueDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">Apellido</p>
                      <p className="font-bold text-lg text-gray-900">{graduateLastName}</p>
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
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">🏛️ Institucional</h4>
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
            <span className="font-semibold text-blue-900">Certificación Oficial de Títulos</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Certificación de Títulos<br/>
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

                    <div className="space-y-2">
                      <Label htmlFor="documentIssueDate" className="text-base font-semibold text-gray-900">
                        Fecha de Grado <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                        <Input
                          id="documentIssueDate"
                          type="date"
                          value={graduateDocumentIssueDate}
                          onChange={(e) => setGraduateDocumentIssueDate(e.target.value)}
                          className="h-12 text-base pl-12 border-2 focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graduateLastName" className="text-base font-semibold text-gray-900">
                      Apellido <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="graduateLastName"
                      type="text"
                      value={graduateLastName}
                      onChange={(e) => setGraduateLastName(e.target.value)}
                      placeholder="Ej: Rodríguez"
                      className="h-12 text-base border-2 focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20"
                      required
                    />
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
                          <span>Verifica que el número de cédula, la fecha de grado y el apellido sean correctos</span>
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
                    <div className="grid sm:grid-cols-3 gap-4 mb-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Cédula</p>
                        <p className="font-mono font-bold text-lg text-gray-900">52987654</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Fecha de Grado</p>
                        <p className="font-bold text-lg text-gray-900">2024-12-01</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-emerald-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Apellido</p>
                        <p className="font-bold text-lg text-gray-900">Rodríguez Gutiérrez</p>
                      </div>
                    </div>
                    <p className="text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Laura Marcela Rodríguez Gutiérrez - Administración Pública Territorial
                    </p>
                  </div>

                  {/* EJEMPLO NO EXITOSO */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-6">
                    <h4 className="font-bold mb-3 text-lg flex items-center gap-2 text-orange-800">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      ❌ Prueba con estos datos (CASO NO EXITOSO)
                    </h4>
                    <div className="grid sm:grid-cols-3 gap-4 mb-3">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-orange-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Cédula</p>
                        <p className="font-mono font-bold text-lg text-gray-900">9999999999</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-orange-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Fecha de Grado</p>
                        <p className="font-bold text-lg text-gray-900">2015-12-10</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-orange-300">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Apellido</p>
                        <p className="font-bold text-lg text-gray-900">NoExiste</p>
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
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">🏛️ Institucional</h4>
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





