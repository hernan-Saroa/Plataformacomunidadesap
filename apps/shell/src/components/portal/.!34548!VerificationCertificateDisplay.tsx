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
