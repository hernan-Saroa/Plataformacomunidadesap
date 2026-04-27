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
  ArrowUp,
  MapPin,
  Phone
} from 'lucide-react';
import { VerificationCertificate } from '../../types/index';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/browser';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import graduadosService from '../../services/api/graduados.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { buildServiceAssetUrl } from '../../config/environment';
import headerImg from '../../assets/graduation-certificates/img_primera.png';
import footerImg from '../../assets/graduation-certificates/img_segunda.png';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { ESAPLogo } from '../assets/ESAPLogo';

interface VerificationCertificateDisplayProps {
  certificate: VerificationCertificate;
  onClose?: () => void;
}

export function VerificationCertificateDisplay({ certificate, onClose }: VerificationCertificateDisplayProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const lastEmailSentRef = useRef<string | null>(null);
  const lastEmailAttemptRef = useRef<string | null>(null);

  const formatDateOnly = (value?: string) => {
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

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateLong = (value?: string) => {
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
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Bogota',
      });
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    });
  };

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

  const generatePdfFromTemplate = async () => {
    if (!pdfTemplateRef.current) {
      throw new Error('No se pudo preparar la plantilla del certificado.');
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(pdfTemplateRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 816,
      windowHeight: 1056,
      imageTimeout: 0,
    });

    const pdf = new jsPDF({
      unit: 'px',
      format: [816, 1056],
      orientation: 'portrait',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056, '', 'FAST');

    const fileName = `Certificado_ESAP_${certificate.certificateNumber}.pdf`;
    return { pdf, fileName };
  };

  const downloadBlobAsFile = (pdfBlob: Blob) => {
    const fileName = `Certificado_ESAP_${certificate.certificateNumber}.pdf`;
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getPublicPdfUrl = () => {
    const pdfUrl = certificate.certificatePdfUrl?.trim();
    if (pdfUrl) {
      return buildServiceAssetUrl('registro-academico', pdfUrl);
    }

    const certificateNumber = certificate.certificateNumber?.trim();
    if (!certificateNumber) {
      return null;
    }

    return buildServiceAssetUrl(
      'registro-academico',
      `/uploads/graduation-certificates/${encodeURIComponent(certificateNumber)}.pdf`
    );
  };

  const descargarPdfPorRutaPublica = async (): Promise<Blob> => {
    const publicPdfUrl = getPublicPdfUrl();
    if (!publicPdfUrl) {
      throw new Error('No se encontr� una ruta p�blica para descargar el certificado.');
    }

    const response = await fetch(publicPdfUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`No se pudo descargar el certificado (${response.status}).`);
    }

    return response.blob();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    toast.loading('Descargando certificado PDF...', { id: 'pdf-generation' });

    try {
      // Registrar la descarga (no bloquea la descarga si falla)
      if (certificate?.id) {
        try {
          await graduadosService.descargas.registrar(certificate.id, {
            skipErrorToast: true,
          });
        } catch (error) {
          console.warn('No se pudo registrar la descarga:', error);
        }
      }

      let pdfBlob: Blob;

      try {
        // Intento principal por endpoint de descarga
        pdfBlob = await graduadosService.certificados.descargarPDF(certificate.id, {
          skipErrorToast: true,
        });
      } catch (downloadError: any) {
        const status = Number(downloadError?.status);

        // Fallback robusto para autoservicio publico sin JWT
        if (status === 401 || status === 403 || status === 404) {
          pdfBlob = await descargarPdfPorRutaPublica();
        } else {
          throw downloadError;
        }
      }

      downloadBlobAsFile(pdfBlob);

      toast.success('Certificado descargado exitosamente!', {
        id: 'pdf-generation',
        description: `Archivo: Certificado_ESAP_${certificate.certificateNumber}.pdf`
      });
    } catch (error: any) {
      console.error('Error al descargar certificado:', error);
      toast.error('Error al descargar certificado', {
        id: 'pdf-generation',
        description: error.message || 'Por favor intenta de nuevo'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const enviarCertificadoPorEmail = async () => {
    const destinatario = certificate.requester?.email;
    if (!destinatario) {
      return;
    }

    if (lastEmailAttemptRef.current === certificate.certificateNumber) {
      return;
    }
    lastEmailAttemptRef.current = certificate.certificateNumber;

    setIsSendingEmail(true);
    toast.loading('Enviando certificado por correo...', { id: 'auto-email-certificate' });

    try {
      await graduadosService.certificados.reenviar(certificate.id);

      lastEmailSentRef.current = certificate.certificateNumber;
      toast.success('Certificado enviado por correo', {
        id: 'auto-email-certificate',
        description: `Se envio a ${destinatario}`,
        duration: 4000,
      });
    } catch (error: any) {
      console.error('Error al enviar certificado por correo:', error);
      toast.error('No se pudo enviar el certificado por correo', {
        id: 'auto-email-certificate',
        description: error?.message || 'Intenta nuevamente',
        duration: 5000,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // NOTA: El backend ya envia el correo automaticamente al crear el certificado
  // en solicitarCertificadoLanding -> notifyCertificateDelivery
  // Por eso eliminamos el useEffect que llamaba a enviarCertificadoPorEmail()
  // para evitar enviar correos duplicados.

  const handleCopyVerificationUrl = async () => {
    const shareUrl = `${window.location.origin}/verificar-certificado/${certificate.qrCode}`;

    try {
      const copied = await copyToClipboard(shareUrl);

      if (!copied) {
        throw new Error('No se pudo copiar al portapapeles');
      }

      toast.success('Enlace copiado', {
        description: 'La URL de verificación fue copiada al portapapeles',
        duration: 3500,
      });
    } catch (error) {
      console.error('Error al copiar enlace de verificación:', error);
      toast.error('No se pudo copiar el enlace', {
        description: 'Por favor, copia manualmente la URL de verificación',
      });
    }
  };

  const verificationUrl = `${window.location.origin}/verificar-certificado/${certificate.qrCode}`;
  const templateFechaExpedicion = formatDateLong(certificate.generatedAt);
  const templateLugarFecha = `Bogotá D.C. ${formatDateLong(certificate.graduate.graduationDate)}`;
  const templateRegistroFolio = certificate.graduate.diplomaNumber || 'N/A';
  const templateTitulo = certificate.graduate.titleType || certificate.graduate.programName;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Solo cerrar si se hace clic directamente en el backdrop, no en sus hijos
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-transparent backdrop-blur-md z-50 overflow-y-auto cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div className="fixed left-[-9999px] top-0 opacity-0 pointer-events-none">
        <div
          ref={pdfTemplateRef}
          style={{
            width: '816px',
            height: '1056px',
            backgroundColor: '#ffffff',
            fontFamily: '"Times New Roman", "Liberation Serif", "DejaVu Serif", Times, serif',
            fontSize: '11pt',
            lineHeight: '1.45',
            color: '#000000',
            padding: '45px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <img
              src={headerImg}
              alt="Función Pública"
              style={{ width: '58%', height: 'auto', maxHeight: '68px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right', fontSize: '9pt', marginTop: '8px' }}>
              <strong>Código para validaciones:</strong> {certificate.qrCode}
            </div>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '30px', fontSize: '10.5pt' }}>
            Bogotá, D.C., {templateFechaExpedicion}
          </div>

          <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', marginBottom: '18px', textTransform: 'uppercase' }}>
            Escuela Superior de Administración Pública - ESAP
          </div>

          <div style={{ textAlign: 'center', fontSize: '12.5pt', fontWeight: 'bold', marginBottom: '28px' }}>
            Verificación de título
          </div>

          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '28px' }}>
            A QUIEN INTERESE
          </div>

          <div style={{ textAlign: 'justify', marginBottom: '28px', padding: '0 15px' }}>
            <p style={{ marginBottom: '18px' }}>
              De conformidad con los registros en el Sistema de Control Académico de la Escuela Superior de
              Administración Pública -ESAP-, nos permitimos informar la verificación del siguiente título académico:
            </p>
          </div>

          <table style={{ width: '92%', borderCollapse: 'collapse', margin: '28px auto' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '40%', verticalAlign: 'middle' }}>
                  Título otorgado:
                </td>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', verticalAlign: 'middle' }}>
                  {templateTitulo}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5', verticalAlign: 'middle' }}>
                  Nombres y apellidos del egresado graduado:
                </td>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', verticalAlign: 'middle' }}>
                  {certificate.graduate.fullName}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5', verticalAlign: 'middle' }}>
                  Número de documento de identificación:
                </td>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', verticalAlign: 'middle' }}>
                  CC {certificate.graduate.documentNumber}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5', verticalAlign: 'middle' }}>
                  Lugar y fecha de expedición del título:
                </td>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', verticalAlign: 'middle' }}>
                  {templateLugarFecha}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5', verticalAlign: 'middle' }}>
                  Registro – Folio - Libro:
                </td>
                <td style={{ padding: '6px 8px', border: '1px solid #000000', fontSize: '10pt', verticalAlign: 'middle' }}>
                  {templateRegistroFolio}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '16px', padding: '0 15px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ marginBottom: '12px' }}>Cordialmente,</p>
              <div style={{ marginTop: '22px', fontWeight: 'bold', fontSize: '10.5pt' }}>
                Dirección Técnica Registro y Control
              </div>
            </div>
            {/* Código QR de validación */}
            <div style={{ textAlign: 'center', marginLeft: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeSVG
                value={verificationUrl}
                size={105}
                level="H"
                includeMargin={false}
                fgColor="#000000"
              />
              <div style={{ marginTop: '6px', maxWidth: '108px', fontSize: '7pt', lineHeight: '1.2' }}>
                Escanee y verifique el certificado
              </div>
            </div>
          </div>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '9pt', fontWeight: 'bold' }}>
            Puede validar la autenticidad de esta verificación en<br />
            <a href={verificationUrl} style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
              {verificationUrl}
            </a>
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '15px' }}>
            <img
              src={footerImg}
              alt="Pie de página ESAP"
              style={{ width: '100%', height: 'auto', maxHeight: '113px', objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>
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
            {/* <div className="bg-gradient-to-r from-[#1e5da8] to-[#154a85] px-8 py-6"> */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-xl p-3 shadow-lg">
                  <ESAPLogo variant="color" className="h-16 w-auto" />
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
                          {formatDateOnly(certificate.graduate.graduationDate)}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-[#1e5da8]" />
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Tipo de Solicitante</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900 capitalize">
                          {certificate.requester.type === 'graduado' ? 'Graduado' : 'Empresa'}
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
                        <div
                          className="w-full max-w-full rounded-xl border-2 border-[#1e5da8]/30 bg-white p-3 shadow-sm sm:p-4"
                          style={{ width: 'min(100%, 273px)' }}
                        >
                          <QRCodeCanvas
                            value={verificationUrl}
                            size={512}
                            level="H"
                            includeMargin={true}
                            fgColor="#1e5da8"
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                        Escanee y verifique el certificado
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
                              {formatDateOnly(certificate.generatedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Estado del Certificado</p>
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-bold text-sm">
                              <CheckCircle className="w-4 h-4" />
                              {certificate.status === 'active' ? 'Válido' : certificate.status}
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
                      onClick={handleCopyVerificationUrl}
                      size="sm"
                      className="flex-shrink-0 bg-[#1e5da8] hover:bg-[#174a87]"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
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
                  onClick={handleCopyVerificationUrl}
                  variant="outline"
                  className="flex-1 border-2 border-[#1e5da8] text-[#1e5da8] hover:bg-[#1e5da8] hover:text-white"
                  size="lg"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copiar URL
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

      {/* Footer Corporativo ESAP */}
      <footer
        className="bg-[#1e5da8] text-white py-4 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-white/20">
            <div className="mb-6 md:mb-0 flex items-start gap-4">
              <ESAPLogo variant="white" className="h-14" />
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
            <div>
              <p className="text-sm font-semibold mb-3">Síguenos:</p>
              <div className="flex gap-3">
                {[
                  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                  "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
                  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                  "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z",
                  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                ].map((path, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Institucional</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {["Acerca de ESAP","Misión y Visión","Directivos","Sedes y Regionales","Trabaje con Nosotros","Rendición de Cuentas"].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">📚 Académico</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {["Programas de Pregrado","Programas Pregrado","Educación Continua","Investigación","Biblioteca Virtual","Calendario Académico"].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Servicios</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {["Portal Transaccional","Certificados","PQRS","Notificaciones Judiciales","Trámites y Servicios","Soporte Técnico"].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {["Políticas de Privacidad","Términos y Condiciones","Tratamiento de Datos","Transparencia","Mapa del Sitio","Accesibilidad"].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
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
                  <p className="text-xs mb-1">Lunes a Viernes</p>
                  <p className="text-xs">8:00 AM - 5:00 PM</p>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
            <p>© 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Última actualización: 13 de enero de 2025
            </p>
          </div>
        </div>
      </footer>

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

