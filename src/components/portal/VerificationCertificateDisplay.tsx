import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  Share2, 
  CheckCircle, 
  Calendar, 
  User, 
  FileText, 
  Award,
  Copy,
  Mail,
  MessageSquare,
  X,
  Shield,
  Hash,
  Building2,
  ShieldCheck,
  Lock,
  FileCheck,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { VerificationCertificate } from '../../types';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '@/utils/browser';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { QRCodeSVG } from 'qrcode.react';
import esapLogo from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface VerificationCertificateDisplayProps {
  certificate: VerificationCertificate;
  onClose?: () => void;
}

export function VerificationCertificateDisplay({ certificate, onClose }: VerificationCertificateDisplayProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Scroll to top when certificate is displayed
  useEffect(() => {
    // Scroll the container to top
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Also scroll the window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Lock body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle ESC key to close certificate (premium UX)
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  // Handle scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setShowScrollTop(containerRef.current.scrollTop > 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDownload = async () => {
    /**
     * FUNCIONALIDAD DE DESCARGA DE CERTIFICADO PDF
     * ============================================
     * En producción, este botón generaría un PDF real con:
     * - Logo de ESAP
     * - Datos completos del graduado y certificado
     * - Código QR embebido
     * - Firma digital certificada por ONAC (con metadatos PAdES)
     * - Diseño profesional con marca de agua de seguridad
     * 
     * Librerías sugeridas para producción:
     * - jsPDF + html2canvas (para capturar el diseño visual)
     * - pdfmake (para construcción programática del PDF)
     * - PDF-LIB (para firma digital y metadatos avanzados)
     * 
     * Proceso de generación en producción:
     * 1. Capturar el contenido visual del certificado
     * 2. Generar PDF con diseño profesional
     * 3. Agregar firma digital certificada (ONAC)
     * 4. Agregar metadatos de seguridad (PAdES)
     * 5. Enviar por email al solicitante
     * 6. Guardar registro en base de datos
     */
    
    setIsDownloading(true);
    
    // Simular proceso de generación de PDF (2 segundos)
    toast.loading('Generando certificado PDF con firma digital...', { id: 'pdf-generation' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulación de descarga exitosa
    toast.success('¡Certificado descargado exitosamente!', { 
      id: 'pdf-generation',
      description: `Archivo: Certificado_${certificate.graduate.fullName.replace(/\s+/g, '_')}.pdf`
    });
    
    // Notificación de envío por email
    toast.info('📧 El certificado ha sido enviado a tu correo electrónico', {
      description: `Enviado a: ${certificate.requester.email}`,
      duration: 5000
    });
    
    // Simulación de descarga del archivo
    // En producción, aquí se descargaría el PDF real
    const pdfUrl = `data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmo...`; // Mock base64
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Certificado_ESAP_${certificate.certificateNumber}.pdf`;
    // link.click(); // Descomentar en producción
    
    setIsDownloading(false);
    
    // Analytics o tracking (opcional)
    console.log('📊 Certificado descargado:', {
      certificateNumber: certificate.certificateNumber,
      graduateName: certificate.graduate.fullName,
      requesterEmail: certificate.requester.email,
      timestamp: new Date().toISOString()
    });
  };

  const handleShare = async () => {
    /**
     * FUNCIONALIDAD DE COMPARTIR CERTIFICADO
     * =======================================
     * Este botón permite compartir el enlace de verificación mediante:
     * 1. Web Share API (nativo en dispositivos móviles)
     * 2. Copiar al portapapeles (fallback)
     * 3. Opciones de compartir por email, WhatsApp, etc.
     */
    
    const shareUrl = `${window.location.origin}/verificar-certificado/${certificate.qrCode}`;
    const shareTitle = `Certificado de Verificación - ${certificate.graduate.fullName}`;
    const shareText = `Certificado de Verificación de Título ESAP\n\nGraduado: ${certificate.graduate.fullName}\nPrograma: ${certificate.graduate.programName}\nTítulo: ${certificate.graduate.titleType}\n\nVerificar autenticidad en:`;
    
    // Intentar usar Web Share API (disponible en móviles modernos)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        
        toast.success('¡Compartido exitosamente!', {
          description: 'El enlace ha sido compartido'
        });
        
        return;
      } catch (error: any) {
        // Usuario canceló o error en la compartición
        if (error.name !== 'AbortError') {
          console.error('Error al compartir:', error);
        }
      }
    }
    
    // Fallback: Copiar al portapapeles
    try {
      await copyToClipboard(shareUrl);
      
      toast.success('✓ Enlace de verificación copiado al portapapeles', {
        description: 'Pega el enlace donde quieras compartirlo',
        duration: 4000,
        action: {
          label: 'Ver opciones',
          onClick: () => {
            // Mostrar opciones adicionales de compartir
            toast.info('Opciones de compartir', {
              description: (
                <div className="space-y-2 mt-2">
                  <a 
                    href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`}
                    className="block px-3 py-2 bg-blue-100 text-blue-900 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📧 Compartir por Email
                  </a>
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`}
                    className="block px-3 py-2 bg-green-100 text-green-900 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💬 Compartir por WhatsApp
                  </a>
                </div>
              ),
              duration: 10000
            });
          }
        }
      });
      
      // Analytics o tracking
      console.log('📊 Enlace compartido:', {
        certificateNumber: certificate.certificateNumber,
        shareUrl: shareUrl,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      toast.error('No se pudo copiar el enlace', {
        description: 'Por favor, copia manualmente la URL de verificación'
      });
    }
  };

  const verificationUrl = `${window.location.origin}/verificar-certificado/${certificate.qrCode}`;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Solo cerrar si se hace clic directamente en el backdrop, no en sus hijos
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div className="min-h-screen flex items-start justify-center px-4 pt-12 pb-8 cursor-auto" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-5xl w-full relative cursor-auto">
          {/* Botón flotante de cerrar premium - Esquina superior derecha del certificado */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 md:-top-4 md:-right-4 z-[60] w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 shadow-2xl hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 group"
              aria-label="Cerrar certificado"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Cerrar (ESC)
              </span>
            </button>
          )}

          {/* Top Indicator Badge */}
          <div className="flex items-center justify-center mb-3">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border-2 border-white/50">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Certificado Oficial de Verificación de Título
              </p>
            </div>
          </div>

          <Card className="border-4 border-[#1e5da8] shadow-2xl bg-white">
            {/* Official Header with Logo */}
            <div className="bg-gradient-to-r from-[#1e5da8] to-[#154a85] px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-xl p-3 shadow-lg">
                  <img src={esapLogo} alt="ESAP Logo" className="h-16 w-auto" />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold tracking-wide">
                    ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                  </h1>
                  <p className="text-blue-100 text-sm mt-1 tracking-wider">
                    ESAP • República de Colombia
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                <Shield className="w-5 h-5 text-white" />
                <span className="text-white text-xs font-bold">OFICIAL</span>
              </div>
            </div>
          </div>

          {/* Certificate Body */}
          <div ref={certificateRef} className="relative bg-white">
            {/* Decorative Border Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1e5da8] via-amber-500 to-[#1e5da8]"></div>
              <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#1e5da8] via-amber-500 to-[#1e5da8]"></div>
            </div>

            <div className="px-8 py-10 sm:px-12 sm:py-12">
              {/* Certificate Title */}
              <div className="text-center mb-10">
                <div className="inline-block">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#1e5da8]"></div>
                    <Award className="w-10 h-10 text-amber-500" strokeWidth={2} />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#1e5da8]"></div>
                  </div>
                  <h2 className="text-3xl font-bold text-[#1e5da8] tracking-wide mb-2">
                    CERTIFICADO DE VALIDACIÓN DE TÍTULO
                  </h2>
                  <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                </div>
                <p className="text-sm text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
                  La Escuela Superior de Administración Pública certifica la autenticidad 
                  del siguiente título académico expedido por esta institución
                </p>
              </div>

              {/* Academic Information Card */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border-2 border-[#1e5da8]/20 p-8 mb-8 shadow-sm">
                <div className="space-y-6">
                  {/* Graduate Name - Highlighted */}
                  <div className="text-center pb-6 border-b-2 border-[#1e5da8]/10">
                    <p className="text-sm text-gray-600 mb-2 uppercase tracking-wider">Se certifica que</p>
                    <h3 className="text-3xl font-bold text-[#1e5da8] mb-1">
                      {certificate.graduate.fullName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Identificado(a) con documento No. <span className="font-mono font-bold text-gray-800">{certificate.graduate.documentNumber}</span>
                    </p>
                  </div>

                  {/* Academic Program */}
                  <div className="bg-white rounded-xl border border-[#1e5da8]/20 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#1e5da8] to-[#154a85] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Programa Académico</p>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{certificate.graduate.programName}</h4>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                            <Building2 className="w-4 h-4" />
                            {certificate.graduate.titleType}
                          </span>
                          {certificate.graduate.honors && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg font-semibold">
                              <Award className="w-4 h-4" />
                              {certificate.graduate.honors}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates and Details Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-[#1e5da8]" />
                        <p className="text-xs text-gray-600 uppercase tracking-wider">Fecha de Grado</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {new Date(certificate.graduate.graduationDate).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Hash className="w-5 h-5 text-[#1e5da8]" />
                        <p className="text-xs text-gray-600 uppercase tracking-wider">Número de Diploma</p>
                      </div>
                      <p className="text-lg font-mono font-bold text-gray-900">
                        {certificate.graduate.diplomaNumber}
                      </p>
                    </div>

                    {certificate.graduate.gpa && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <Award className="w-5 h-5 text-[#1e5da8]" />
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Promedio Académico</p>
                        </div>
                        <p className="text-lg font-bold text-[#1e5da8]">
                          {certificate.graduate.gpa.toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-[#1e5da8]" />
                        <p className="text-xs text-gray-600 uppercase tracking-wider">Tipo de Solicitante</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 capitalize">
                        {certificate.requester.type === 'graduado' ? 'Graduado' : 'Empresa'}
                      </p>
                    </div>
                  </div>

                  {/* Official Statement */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2 text-lg">Certificación Oficial</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          La <strong>Escuela Superior de Administración Pública (ESAP)</strong> certifica que el título académico 
                          mencionado es auténtico, ha sido debidamente registrado y expedido conforme a las normas vigentes. 
                          Este documento cuenta con verificación digital mediante código QR único.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code and Verification Section */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* QR Code */}
                <div className="md:col-span-1">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-[#1e5da8]/20 p-6 text-center h-full flex flex-col">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Hash className="w-5 h-5 text-[#1e5da8]" />
                      <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Código QR</h4>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="inline-block p-4 bg-white rounded-xl border-2 border-[#1e5da8]/30 shadow-sm">
                        <QRCodeSVG
                          value={verificationUrl}
                          size={160}
                          level="H"
                          includeMargin={true}
                          fgColor="#1e5da8"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                      Escanea para verificar autenticidad en tiempo real
                    </p>
                  </div>
                </div>

                {/* Certificate Metadata */}
                <div className="md:col-span-2">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-[#1e5da8]/20 p-6 h-full">
                    <h4 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#1e5da8]" />
                      <span className="text-sm uppercase tracking-wide">Información de Validación</span>
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                        <div className="w-2 h-2 bg-[#1e5da8] rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Número de Certificado</p>
                          <p className="font-mono font-bold text-gray-900">{certificate.certificateNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                        <div className="w-2 h-2 bg-[#1e5da8] rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Código de Validación</p>
                          <p className="font-mono font-bold text-gray-900 text-sm break-all">{certificate.qrCode}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                        <div className="w-2 h-2 bg-[#1e5da8] rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Fecha de Emisión</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(certificate.generatedAt).toLocaleDateString('es-CO', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Estado del Certificado</p>
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-bold text-sm">
                            <CheckCircle className="w-4 h-4" />
                            {certificate.status === 'active' ? 'Activo y Válido' : certificate.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification URL */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-[#1e5da8]/20 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#1e5da8] rounded-lg flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">URL de Verificación Pública</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-3 rounded-lg border-2 border-gray-200 text-xs font-mono text-gray-700 overflow-x-auto">
                    {verificationUrl}
                  </code>
                  <Button
                    onClick={handleShare}
                    size="sm"
                    className="flex-shrink-0 bg-[#1e5da8] hover:bg-[#174a87]"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Digital Signature Section - ONAC */}
              <div className="mt-8 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border-2 border-emerald-300 p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
                      Certificado Digital con Firma Electrónica
                      <Lock className="w-5 h-5 text-emerald-700" />
                    </h4>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      Este documento PDF incluye una <strong>firma digital certificada</strong> emitida por una 
                      entidad certificadora avalada por el <strong>ONAC</strong> (Organismo Nacional de Acreditación de Colombia)
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Digital Certificate Info */}
                  <div className="bg-white/80 backdrop-blur rounded-xl border border-emerald-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      <h5 className="font-bold text-gray-900 text-sm">Información de la Firma Digital</h5>
                    </div>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Emisor:</span> Entidad Certificadora ONAC
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Algoritmo:</span> RSA 4096 bits + SHA-256
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Estándar:</span> ISO/IEC 27001:2013
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Validez:</span> Permanente
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ONAC Accreditation */}
                  <div className="bg-white/80 backdrop-blur rounded-xl border border-emerald-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <h5 className="font-bold text-gray-900 text-sm">Acreditación ONAC</h5>
                    </div>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Organismo:</span> ONAC Colombia
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Norma:</span> ISO/IEC 17065:2012
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Ley:</span> Ley 527 de 1999 (Firma Digital)
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-semibold">Decreto:</span> 2364 de 2012
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-emerald-100 border border-emerald-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 leading-relaxed">
                      <p className="font-semibold mb-1">Garantía de Autenticidad e Integridad</p>
                      <p>
                        La firma digital garantiza que el documento no ha sido alterado desde su emisión 
                        y certifica la identidad de ESAP como emisor oficial. El PDF descargado incluye 
                        metadatos de firma electrónica verificables mediante Adobe Reader, Foxit Reader 
                        o cualquier lector PDF compatible con firmas digitales según estándar PAdES.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-300"></div>
                  <span className="text-xs font-mono font-bold text-emerald-700 px-3 py-1 bg-emerald-100 rounded-full">
                    CERTIFICADO DIGITAL ONAC
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-300"></div>
                </div>
              </div>

              {/* Legal Notice and Footer */}
              <div className="mt-8 pt-6 border-t-2 border-[#1e5da8]/10">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-amber-900 mb-2 text-sm">Validez Legal y Autenticidad</h5>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Este certificado es un documento oficial emitido por la Escuela Superior de Administración Pública (ESAP) 
                        con <strong>firma digital certificada por ONAC</strong>, lo que le otorga plena validez legal según 
                        la Ley 527 de 1999 y el Decreto 2364 de 2012. La autenticidad puede ser verificada en cualquier momento 
                        mediante el código QR, la URL proporcionada, o validando la firma digital en el PDF. 
                        <strong> No contiene datos de contacto para protección de información personal.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-xs text-gray-600 leading-relaxed max-w-3xl mx-auto">
                    Para cualquier consulta o verificación adicional, puede contactar directamente con la 
                    <strong> Oficina de Registro y Control Académico de ESAP</strong>. 
                    Este documento ha sido generado de forma automatizada por el Sistema de Verificación de Títulos Graduados.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <div className="h-px w-12 bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs text-gray-700 font-semibold">Documento Digital con Firma Electrónica Certificada</p>
                    </div>
                    <div className="h-px w-12 bg-gray-300"></div>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {certificate.id} • Generado: {new Date(certificate.generatedAt).toISOString().split('T')[0]}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    ✓ Certificado digital ONAC incluido en el PDF
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 px-8 py-6 border-t-4 border-emerald-500">
            <div className="flex items-center justify-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">
                El PDF incluye firma digital certificada por ONAC
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Descargar PDF con Firma Digital
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 border-2 border-[#1e5da8] text-[#1e5da8] hover:bg-[#1e5da8] hover:text-white"
                size="lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Compartir Enlace
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="hover:bg-gray-200"
                  size="lg"
                >
                  Cerrar
                </Button>
              )}
            </div>
          </div>
          </Card>
        </div>
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-[#1e5da8] hover:bg-[#174a87] text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 z-10 group"
          aria-label="Volver al inicio"
        >
          <ArrowUp className="w-6 h-6" />
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Volver al inicio
          </span>
        </button>
      )}
    </div>
  );
}