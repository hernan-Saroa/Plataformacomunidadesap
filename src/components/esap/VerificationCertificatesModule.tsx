/**
 * MÓDULO: CERTIFICADOS CON QR ÚNICO PARA VALIDACIÓN
 * - Cada combinación única (graduado + datos + entidad) genera UN certificado con QR único
 * - Si la MISMA combinación vuelve a solicitar → se REUTILIZA el QR existente (no se genera nuevo)
 * - Solo se crea QR nuevo si cambia: graduado, datos o entidad solicitante
 * - Estado "Activo" = QR habilitado para validación pública
 * - Al escanear QR: muestra si está activo + datos completos del certificado
 * - Trazabilidad completa:
 *   • Historial de solicitudes: cuando se pide el certificado
 *   • Historial de escaneos: cuando alguien escanea el QR para VALIDAR autenticidad
 *   • Cada validación registra: IP, ubicación, dispositivo, fecha/hora
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Download,
  FileText,
  Award,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  Mail,
  Building2,
  User,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Hash,
  Monitor,
  TrendingUp,
  Globe,
  MoreVertical,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle,
  History
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import React from 'react';

// Tipo de certificado con QR único (reutilizable por misma combinación)
interface CertificateRequest {
  id: string;
  certificateNumber: string;
  certificateHash: string;
  qrCode: string; // QR único para la combinación graduado+datos+entidad
  graduate: {
    fullName: string;
    document: string;
    program: string;
    graduationDate: string;
  };
  requester: {
    name: string;
    email: string;
    type: 'entidad' | 'graduado'; // Quién solicitó el certificado
    logo?: string;
  };
  status: 'active' | 'revoked' | 'expired'; // Estado del certificado/QR
  firstRequestedAt: string; // Primera vez que se solicitó
  lastRequestedAt: string; // Última solicitud
  generatedAt: string; // Fecha de generación del certificado
  generatedBy: string;
  requestCount: number; // Número de veces que se ha solicitado este mismo certificado
  qrScanCount: number; // Número de veces que se ha escaneado el QR
  viewCount: number;
  downloadCount: number;
  lastActivity: string;
  requestHistory: Array<{
    id: string;
    requestedAt: string;
    requestedBy: string;
    ipAddress: string;
  }>;
  scanHistory: Array<{
    id: string;
    scannedAt: string;
    ipAddress: string;
    location: string;
    userAgent: string;
    verified: boolean;
  }>;
}

// Mantenemos compatibilidad con el nombre antiguo
type CertificateRecord = CertificateRequest;

interface VerificationCertificatesModuleProps {
  onPendingCountChange?: (count: number) => void;
}

export function VerificationCertificatesModule({ onPendingCountChange }: VerificationCertificatesModuleProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState<string>('all');
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para modales
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrPreviewCertificate, setQrPreviewCertificate] = useState<CertificateRecord | null>(null);

  // Mock data: Solicitudes de certificados con trazabilidad completa
  const mockCertificates: CertificateRecord[] = [
    {
      id: 'CERT-001',
      certificateNumber: 'ESAP-CERT-2025-A4E23',
      certificateHash: 'sha256:a7f2c9b8d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
      qrCode: 'QR-XYZ789ABC123',
      graduate: {
        fullName: 'María Fernanda Rodríguez Sánchez',
        document: '1052789456',
        program: 'Administración Pública',
        graduationDate: '2024-06-15'
      },
      requester: {
        name: 'Empresa ABC S.A.S.',
        email: 'rrhh@empresaabc.com',
        type: 'entidad'
      },
      status: 'active',
      firstRequestedAt: '2025-01-10T09:00:00Z',
      lastRequestedAt: '2025-01-11T16:30:00Z',
      generatedAt: '2025-01-10T10:30:00Z',
      generatedBy: 'Admin ESAP',
      requestCount: 3,
      qrScanCount: 8,
      viewCount: 15,
      downloadCount: 3,
      lastActivity: '2025-01-12T14:20:00Z',
      requestHistory: [
        {
          id: 'REQ-001',
          requestedAt: '2025-01-10T09:00:00Z',
          requestedBy: 'Empresa ABC S.A.S.',
          ipAddress: '192.168.1.50'
        },
        {
          id: 'REQ-002',
          requestedAt: '2025-01-10T15:20:00Z',
          requestedBy: 'Empresa ABC S.A.S.',
          ipAddress: '192.168.1.50'
        },
        {
          id: 'REQ-003',
          requestedAt: '2025-01-11T16:30:00Z',
          requestedBy: 'Empresa ABC S.A.S.',
          ipAddress: '192.168.1.50'
        }
      ],
      scanHistory: [
        {
          id: 'SCAN-001',
          scannedAt: '2025-01-12T14:20:00Z',
          ipAddress: '192.168.1.100',
          location: 'Bogotá, Colombia',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          verified: true
        },
        {
          id: 'SCAN-002',
          scannedAt: '2025-01-11T09:15:00Z',
          ipAddress: '192.168.1.101',
          location: 'Medellín, Colombia',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)',
          verified: true
        },
        {
          id: 'SCAN-003',
          scannedAt: '2025-01-10T16:45:00Z',
          ipAddress: '192.168.1.102',
          location: 'Cali, Colombia',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          verified: true
        }
      ]
    },
    {
      id: 'CERT-002',
      certificateNumber: 'ESAP-CERT-2025-D8E54',
      certificateHash: 'sha256:b8c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      qrCode: 'QR-DEF456GHI789',
      graduate: {
        fullName: 'Carlos Andrés Mendoza Pérez',
        document: '1098765432',
        program: 'Ciencia Política',
        graduationDate: '2024-05-20'
      },
      requester: {
        name: 'Carlos Andrés Mendoza Pérez',
        email: 'ca.mendoza@email.com',
        type: 'graduado'
      },
      status: 'active',
      firstRequestedAt: '2025-01-11T14:00:00Z',
      lastRequestedAt: '2025-01-11T14:00:00Z',
      generatedAt: '2025-01-11T15:45:00Z',
      generatedBy: 'Admin ESAP',
      requestCount: 1,
      qrScanCount: 3,
      viewCount: 5,
      downloadCount: 1,
      lastActivity: '2025-01-12T10:30:00Z',
      requestHistory: [
        {
          id: 'REQ-004',
          requestedAt: '2025-01-11T14:00:00Z',
          requestedBy: 'Carlos Andrés Mendoza Pérez',
          ipAddress: '192.168.1.103'
        }
      ],
      scanHistory: [
        {
          id: 'SCAN-004',
          scannedAt: '2025-01-12T10:30:00Z',
          ipAddress: '192.168.1.103',
          location: 'Barranquilla, Colombia',
          userAgent: 'Mozilla/5.0 (Android 11; Mobile)',
          verified: true
        }
      ]
    },
    {
      id: 'CERT-003',
      certificateNumber: 'ESAP-CERT-2025-G5G6N1',
      certificateHash: 'sha256:c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0',
      qrCode: 'QR-JKL012MNO345',
      graduate: {
        fullName: 'Ana Cristina García López',
        document: '1034567890',
        program: 'Gestión Pública',
        graduationDate: '2024-07-10'
      },
      requester: {
        name: 'Universidad XYZ',
        email: 'admisiones@universidadxyz.edu',
        type: 'entidad'
      },
      status: 'active',
      firstRequestedAt: '2025-01-12T08:00:00Z',
      lastRequestedAt: '2025-01-12T11:30:00Z',
      generatedAt: '2025-01-12T09:20:00Z',
      generatedBy: 'Admin ESAP',
      requestCount: 2,
      qrScanCount: 12,
      viewCount: 22,
      downloadCount: 5,
      lastActivity: '2025-01-12T16:00:00Z',
      requestHistory: [
        {
          id: 'REQ-005',
          requestedAt: '2025-01-12T08:00:00Z',
          requestedBy: 'Universidad XYZ',
          ipAddress: '192.168.1.200'
        },
        {
          id: 'REQ-006',
          requestedAt: '2025-01-12T11:30:00Z',
          requestedBy: 'Universidad XYZ',
          ipAddress: '192.168.1.200'
        }
      ],
      scanHistory: [
        {
          id: 'SCAN-005',
          scannedAt: '2025-01-12T16:00:00Z',
          ipAddress: '192.168.1.104',
          location: 'Cartagena, Colombia',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          verified: true
        },
        {
          id: 'SCAN-006',
          scannedAt: '2025-01-12T11:30:00Z',
          ipAddress: '192.168.1.105',
          location: 'Pereira, Colombia',
          userAgent: 'Mozilla/5.0 (Linux; Android 12)',
          verified: true
        }
      ]
    }
  ];

  // Stats calculadas
  const stats = {
    total: mockCertificates.length, // Total de certificados/QR únicos
    active: mockCertificates.filter(c => c.status === 'active').length,
    totalRequests: mockCertificates.reduce((sum, c) => sum + c.requestCount, 0), // Total de solicitudes (incluyendo reutilizaciones)
    totalScans: mockCertificates.reduce((sum, c) => sum + c.qrScanCount, 0),
    totalViews: mockCertificates.reduce((sum, c) => sum + c.viewCount, 0),
    reusedQRs: mockCertificates.filter(c => c.requestCount > 1).length // QRs reutilizados
  };

  // Filtrado
  const filteredCertificates = mockCertificates.filter(cert => {
    const matchesSearch = searchQuery === '' ||
      cert.graduate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.requester.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    const matchesType = requesterTypeFilter === 'all' || cert.requester.type === requesterTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Paginación
  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any; description: string }> = {
      active: {
        label: 'Activo',
        className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle,
        description: 'QR válido para escaneo'
      },
      revoked: {
        label: 'Revocado',
        className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle,
        description: 'Certificado inválido'
      },
      expired: {
        label: 'Expirado',
        className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
        icon: AlertCircle,
        description: 'Fuera de vigencia'
      }
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <div className="space-y-1">
        <Badge className={`${config.className} border hover:${config.className}`}>
          <div className="flex items-center gap-1.5">
            {status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{config.label}</span>
          </div>
        </Badge>
        <p className="text-xs" style={{ color: '#6B7280' }}>{config.description}</p>
      </div>
    );
  };

  const getRequesterTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string; icon: any }> = {
      entidad: {
        label: 'Entidad',
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: Building2
      },
      graduado: {
        label: 'Graduado',
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: User
      }
    };

    const config = typeConfig[type] || typeConfig.entidad;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border text-xs font-medium`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {config.label}
        </div>
      </Badge>
    );
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const handleViewDetails = (cert: CertificateRecord) => {
    setExpandedCertId(expandedCertId === cert.id ? null : cert.id);
  };

  const handleRevokeCertificate = (cert: CertificateRecord) => {
    setSelectedCertificate(cert);
    setIsRevokeModalOpen(true);
  };

  const confirmRevoke = () => {
    toast.success('Certificado Revocado', {
      description: `El certificado ${selectedCertificate?.certificateNumber} ha sido marcado como INVÁLIDO. El QR mostrará advertencia al escanearlo.`
    });
    setIsRevokeModalOpen(false);
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    const { copyToClipboard } = await import('@/utils/browser');
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copiado al portapapeles`);
    } else {
      toast.error('No se pudo copiar. Por favor, cópialo manualmente.');
    }
  };

  const handleViewQR = (cert: CertificateRecord) => {
    setQrPreviewCertificate(cert);
    setIsQrModalOpen(true);
  };

  const getPublicValidationUrl = (qrCode: string) => {
    return `https://esap.edu.co/verificar/${qrCode}`;
  };

  const handleDownloadQR = () => {
    if (!qrPreviewCertificate) return;

    try {
      // Crear un canvas para generar la imagen del QR
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Tamaño del canvas
      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;

      // Fondo blanco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Header con gradiente ESAP
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#003DA5');
      gradient.addColorStop(1, '#0052D9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, 180);

      // Logo ESAP (texto)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ESAP', width / 2, 70);

      ctx.font = '20px Arial';
      ctx.fillText('Escuela Superior de Administración Pública', width / 2, 110);

      ctx.font = 'bold 24px Arial';
      ctx.fillText('Código QR de Validación', width / 2, 150);

      // Área del QR (simulado)
      const qrSize = 400;
      const qrX = (width - qrSize) / 2;
      const qrY = 220;

      // Fondo del QR
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);

      // Border del QR
      ctx.strokeStyle = qrPreviewCertificate.status === 'active' ? '#10B981' : '#9CA3AF';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);

      // Simulación del QR (patrón de cuadrícula)
      const cellSize = 10;
      const cells = qrSize / cellSize;
      ctx.fillStyle = '#000000';

      // Patrón pseudo-aleatorio basado en el código QR
      const seed = qrPreviewCertificate.qrCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          if ((i * j + seed) % 3 === 0) {
            ctx.fillRect(qrX + i * cellSize, qrY + j * cellSize, cellSize - 1, cellSize - 1);
          }
        }
      }

      // Código QR en texto
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(qrPreviewCertificate.qrCode, width / 2, qrY + qrSize + 60);

      // Información del certificado
      const infoY = qrY + qrSize + 110;
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B5563';

      const leftMargin = 80;
      ctx.fillText(`Graduado: ${qrPreviewCertificate.graduate.fullName}`, leftMargin, infoY);
      ctx.fillText(`Documento: ${qrPreviewCertificate.graduate.document}`, leftMargin, infoY + 30);
      ctx.fillText(`Programa: ${qrPreviewCertificate.graduate.program}`, leftMargin, infoY + 60);
      ctx.fillText(`N° Certificado: ${qrPreviewCertificate.certificateNumber}`, leftMargin, infoY + 90);

      // Estado
      const statusY = infoY + 140;
      ctx.font = 'bold 18px Arial';
      if (qrPreviewCertificate.status === 'active') {
        ctx.fillStyle = '#10B981';
        ctx.fillText('✓ CERTIFICADO ACTIVO Y VÁLIDO', leftMargin, statusY);
      } else {
        ctx.fillStyle = '#EF4444';
        ctx.fillText('✗ CERTIFICADO REVOCADO', leftMargin, statusY);
      }

      // URL de validación
      ctx.font = '14px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'center';
      const url = getPublicValidationUrl(qrPreviewCertificate.qrCode);
      ctx.fillText('Valida este certificado en:', width / 2, height - 80);
      ctx.fillStyle = '#003DA5';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(url, width / 2, height - 50);

      // Footer
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '12px Arial';
      ctx.fillText(`Generado el ${new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, width / 2, height - 20);

      // Convertir canvas a blob y descargar
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR-${qrPreviewCertificate.certificateNumber}-${qrPreviewCertificate.graduate.document}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('QR descargado exitosamente', {
          description: `El código QR del certificado ${qrPreviewCertificate.certificateNumber} se ha descargado.`
        });
      }, 'image/png');

    } catch (error) {
      console.error('Error al generar el QR:', error);
      toast.error('Error al descargar el QR', {
        description: 'No se pudo generar la imagen. Intenta nuevamente.'
      });
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRequesterTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || requesterTypeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Descripción específica de verificación */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p
            className="font-normal"
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              color: '#1F2937'
            }}
          >
            Cada combinación única genera <strong>UN certificado con QR único</strong>. Si la misma persona y entidad vuelve a solicitarlo, se <strong>reutiliza el QR existente</strong> (no se genera nuevo).
          </p>
        </div>
      </motion.div>

      <div className="flex justify-end">
        <button
          onClick={() => toast.info('Exportar solicitudes de certificados')}
          className="inline-flex items-center justify-center gap-2 transition-all"
          style={{
            background: '#FFFFFF',
            color: '#003DA5',
            border: '2px solid #003DA5',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F0F6FF';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Download className="w-5 h-5" strokeWidth={2} />
          <span>Exportar</span>
        </button>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">
              🔄 Lógica de QR Único (Reutilizable)
            </h3>
            <p className="text-sm text-gray-700">
              <strong>1)</strong> Se solicita certificado (graduado + entidad) →
              <strong> 2)</strong> Sistema verifica si YA existe esa combinación →
              <strong> 3a)</strong> Si NO existe: genera certificado + QR nuevo ·
              <strong> 3b)</strong> Si SÍ existe: reutiliza QR existente (no genera nuevo)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-4"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#9CA3AF' }}
              />
              <input
                type="text"
                placeholder="Buscar por graduado, solicitante, certificado o código QR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 rounded-lg transition-all"
                style={{
                  paddingLeft: '48px',
                  paddingRight: searchQuery ? '48px' : '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#1F2937',
                  borderColor: '#D1D5DB',
                  height: '44px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#9CA3AF' }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtro Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '150px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#003DA5';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="revoked">Revocados</option>
              <option value="expired">Expirados</option>
            </select>

            {/* Filtro Tipo Solicitante */}
            <select
              value={requesterTypeFilter}
              onChange={(e) => setRequesterTypeFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '180px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#003DA5';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todos los solicitantes</option>
              <option value="entidad">Entidades</option>
              <option value="graduado">Graduados</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                style={{
                  background: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FEE2E2'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FEF2F2';
                }}
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lista de Certificados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="space-y-3"
      >
        {paginatedCertificates.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron solicitudes de certificados
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay solicitudes de certificados procesadas en el sistema'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
                style={{
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header de Tabla */}
            <div className="bg-white rounded-t-xl border border-[#E5E7EB] border-b-0">
              <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold" style={{ color: '#6B7280' }}>
                <div className="col-span-3">GRADUADO</div>
                <div className="col-span-2">SOLICITADO POR</div>
                <div className="col-span-2">QR ÚNICO / ESCANEOS</div>
                <div className="col-span-2">N° CERTIFICADO</div>
                <div className="col-span-2">ESTADO / VALIDACIÓN</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Certificados */}
            {paginatedCertificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Graduado */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback
                            className="text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                          >
                            {cert.graduate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold truncate mb-0.5"
                            style={{ fontSize: '14px', color: '#1F2937' }}
                          >
                            {cert.graduate.fullName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                            <Award className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{cert.graduate.program}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Solicitante */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        {getRequesterTypeBadge(cert.requester.type)}
                        <p className="text-sm font-medium line-clamp-1" style={{ color: '#1F2937' }}>
                          {cert.requester.name}
                        </p>
                      </div>
                    </div>

                    {/* Columna 3: QR Único + Escaneos */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewQR(cert)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 relative"
                          style={{ background: cert.status === 'active' ? '#FEF3C7' : '#F3F4F6', cursor: 'pointer' }}
                          title="Ver código QR único"
                        >
                          <QrCode className="w-5 h-5" style={{ color: cert.status === 'active' ? '#F59E0B' : '#9CA3AF' }} />
                          {cert.requestCount > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {cert.requestCount}
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {cert.qrScanCount} escaneos
                            </p>
                            {cert.status === 'active' && (
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="QR Activo para Validación"></div>
                            )}
                          </div>
                          <p className="text-xs truncate font-mono" style={{ color: '#6B7280' }}>
                            {cert.qrCode}
                          </p>
                          {cert.requestCount > 1 && (
                            <p className="text-xs font-semibold" style={{ color: '#3B82F6' }}>
                              Solicitado {cert.requestCount} veces
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Certificado */}
                    <div className="col-span-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono font-semibold" style={{ color: '#1F2937' }}>
                          {cert.certificateNumber}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {new Date(cert.generatedAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Columna 5: Estado */}
                    <div className="col-span-2">
                      {getStatusBadge(cert.status)}
                    </div>

                    {/* Columna 6: Acciones */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(cert)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedCertId === cert.id ? '#F0F6FF' : '#F9FAFB',
                          color: '#003DA5'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0F6FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = expandedCertId === cert.id ? '#F0F6FF' : '#F9FAFB';
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-lg transition-all"
                            style={{
                              background: '#F9FAFB',
                              color: '#6B7280'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F9FAFB';
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewQR(cert)}>
                            <QrCode className="w-4 h-4 mr-2" />
                            Ver Código QR Único
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(cert.qrCode, 'Código QR')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Código QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(cert.certificateHash, 'Hash')}>
                            <Hash className="w-4 h-4 mr-2" />
                            Copiar Hash
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(cert.certificateNumber, 'Número de certificado')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Número
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info('Descargando certificado...')}>
                            <Download className="w-4 h-4 mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRevokeCertificate(cert)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Revocar Certificado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido - TRAZABILIDAD COMPLETA */}
                <AnimatePresence>
                  {expandedCertId === cert.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden"
                    >
                      <div className="p-6 space-y-4">
                        {/* Título */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#1F2937' }}>
                            <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                            Trazabilidad Completa del Certificado
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
                            ID: {cert.id}
                          </Badge>
                        </div>

                        {/* Grid 2 columnas - Info Graduado y Solicitante */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Info Graduado */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              Información del Graduado
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Nombre Completo</p>
                                  <p className="font-semibold text-gray-900">{cert.graduate.fullName}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Documento</p>
                                  <p className="font-semibold text-gray-900 font-mono">{cert.graduate.document}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Award className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Programa</p>
                                  <p className="font-semibold text-gray-900">{cert.graduate.program}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Graduación</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(cert.graduate.graduationDate).toLocaleDateString('es-CO', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Info Solicitante */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-purple-600" />
                              Información del Solicitante
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                {cert.requester.type === 'entidad' && <Building2 className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                {cert.requester.type === 'graduado' && <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                <div>
                                  <p className="text-xs text-gray-600">Nombre/Razón Social</p>
                                  <p className="font-semibold text-gray-900">{cert.requester.name}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  <p className="font-semibold text-gray-900">{cert.requester.email}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Shield className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Tipo</p>
                                  {getRequesterTypeBadge(cert.requester.type)}
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Solicitud</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(cert.generatedAt).toLocaleString('es-CO')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hash y Seguridad */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-700" />
                            Seguridad y Verificación Digital
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-600 mb-1.5">Hash SHA-256 del Certificado</p>
                              <div className="flex items-center gap-2 bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-mono flex-1 break-all text-gray-900">
                                  {cert.certificateHash}
                                </p>
                                <button
                                  onClick={() => handleCopyToClipboard(cert.certificateHash, 'Hash')}
                                  className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                  title="Copiar hash"
                                >
                                  <Copy className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-600 mb-1.5">Código QR</p>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                  <QrCode className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs font-mono text-gray-900">{cert.qrCode}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1.5">Generado por</p>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <p className="text-xs font-semibold text-gray-900">{cert.generatedBy}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Estadísticas de Uso
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white border border-amber-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
                                <QrCode className="w-5 h-5 text-amber-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.qrScanCount}</p>
                              <p className="text-xs text-gray-600">Escaneos QR</p>
                            </div>
                            <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                                <Eye className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.viewCount}</p>
                              <p className="text-xs text-gray-600">Visualizaciones</p>
                            </div>
                            <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                                <Download className="w-5 h-5 text-green-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.downloadCount}</p>
                              <p className="text-xs text-gray-600">Descargas</p>
                            </div>
                          </div>
                        </div>

                        {/* Historial de Escaneos */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-gray-700" />
                              Historial Completo de Escaneos
                            </h4>
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200 border text-xs">
                              {cert.scanHistory.length} registros
                            </Badge>
                          </div>

                          {cert.scanHistory.length === 0 ? (
                            <div className="text-center py-6">
                              <Monitor className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm text-gray-500">No hay escaneos registrados</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {cert.scanHistory.map((scan, idx) => (
                                <div
                                  key={scan.id}
                                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-blue-700">#{idx + 1}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900">Escaneo {idx + 1}</p>
                                        <p className="text-xs text-gray-500">{formatLastActivity(scan.scannedAt)}</p>
                                      </div>
                                    </div>
                                    {scan.verified ? (
                                      <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verificado
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Fallido
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-start gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Fecha y Hora</p>
                                        <p className="font-semibold text-gray-900">
                                          {new Date(scan.scannedAt).toLocaleString('es-CO', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <Globe className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">IP</p>
                                        <div className="flex items-center gap-1">
                                          <p className="font-semibold text-gray-900 font-mono">{scan.ipAddress}</p>
                                          <button
                                            onClick={() => handleCopyToClipboard(scan.ipAddress, 'IP')}
                                            className="p-0.5 hover:bg-gray-200 rounded"
                                          >
                                            <Copy className="w-3 h-3 text-gray-500" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Ubicación</p>
                                        <p className="font-semibold text-gray-900">{scan.location}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <Monitor className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Dispositivo</p>
                                        <p className="text-gray-700">
                                          {scan.userAgent.includes('Mobile') ? '📱 Móvil' :
                                            scan.userAgent.includes('iPhone') ? '📱 iPhone' :
                                              scan.userAgent.includes('Android') ? '📱 Android' :
                                                scan.userAgent.includes('Windows') ? '💻 Windows' :
                                                  scan.userAgent.includes('Mac') ? '🍎 Mac' : '💻 PC'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="col-span-2 flex items-start gap-1.5 mt-1 pt-2 border-t border-gray-200">
                                      <Monitor className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-gray-600 mb-1">User Agent</p>
                                        <p className="text-xs text-gray-700 font-mono break-all bg-white p-1.5 rounded border border-gray-200">
                                          {scan.userAgent}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Última Actividad */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">Última actividad:</span>
                            <span className="font-semibold text-gray-900">{formatLastActivity(cert.lastActivity)}</span>
                            <span className="text-gray-500">({new Date(cert.lastActivity).toLocaleString('es-CO')})</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* Paginación */}
      {paginatedCertificates.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <PaginationPremium
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCertificates.length}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

      {/* Modal: Revocar Certificado */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Revocar Certificado
            </DialogTitle>
            <DialogDescription>
              Esta acción marcará el certificado como inválido
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedCertificate?.certificateNumber}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Graduado:</strong> {selectedCertificate?.graduate.fullName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Solicitante:</strong> {selectedCertificate?.requester.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Consecuencias de la revocación:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El certificado aparecerá como "REVOCADO" en todas las validaciones</li>
                    <li>Al escanear el QR, mostrará advertencia "❌ CERTIFICADO INVÁLIDO"</li>
                    <li>No se podrán ver los datos del certificado al escanear</li>
                    <li>Se notificará al solicitante automáticamente</li>
                    <li>Esta acción quedará registrada en auditoría con fecha, hora y usuario</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsRevokeModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmRevoke}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <XCircle className="w-4 h-4" />
              Confirmar Revocación
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Código QR Único */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-600" />
              Código QR Único - Validación Pública
            </DialogTitle>
            <DialogDescription>
              Este QR permite que cualquier persona valide la autenticidad del certificado. Cada escaneo queda registrado en el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* QR Placeholder + Estado */}
            <div className={`${qrPreviewCertificate?.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-6`}>
              <div className="flex flex-col items-center text-center">
                {/* QR Placeholder */}
                <div
                  className="w-48 h-48 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: qrPreviewCertificate?.status === 'active' ? '#FFFFFF' : '#F3F4F6',
                    border: `2px solid ${qrPreviewCertificate?.status === 'active' ? '#10B981' : '#D1D5DB'}`
                  }}
                >
                  <div className="text-center p-4">
                    <QrCode
                      className="w-32 h-32 mx-auto mb-2"
                      style={{ color: qrPreviewCertificate?.status === 'active' ? '#10B981' : '#9CA3AF' }}
                    />
                    <p className="text-xs font-mono font-semibold" style={{ color: '#6B7280' }}>
                      {qrPreviewCertificate?.qrCode}
                    </p>
                  </div>
                </div>

                {/* Badge de Estado */}
                {qrPreviewCertificate?.status === 'active' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-semibold text-sm text-green-800">
                      ✅ QR ACTIVO PARA VALIDACIÓN
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-300 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-sm text-red-800">
                      ❌ QR INACTIVO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info del Certificado Solicitado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Datos del Certificado Solicitado
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Graduado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Documento:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.document}</span>
                </div>
                <div>
                  <span className="text-gray-600">Programa:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.program}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fecha de graduación:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {qrPreviewCertificate && new Date(qrPreviewCertificate.graduate.graduationDate).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Número de certificado:</span>
                  <span className="ml-2 font-semibold text-gray-900 font-mono">{qrPreviewCertificate?.certificateNumber}</span>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Solicitado por:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.requester.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({qrPreviewCertificate?.requester.type === 'graduado' ? 'Graduado' : 'Entidad'})</span>
                </div>
                <div>
                  <span className="text-gray-600">Veces solicitado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.requestCount}</span>
                  {qrPreviewCertificate && qrPreviewCertificate.requestCount > 1 && (
                    <span className="ml-2 text-xs font-semibold text-blue-600">
                      (QR reutilizado {qrPreviewCertificate.requestCount - 1} {qrPreviewCertificate.requestCount - 1 === 1 ? 'vez' : 'veces'})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Veces escaneado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.qrScanCount}</span>
                </div>
              </div>
            </div>

            {/* Historial de Solicitudes (si hay múltiples) */}
            {qrPreviewCertificate && qrPreviewCertificate.requestCount > 1 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  Historial de Solicitudes (QR Reutilizado)
                </h4>
                <div className="space-y-3">
                  {qrPreviewCertificate.requestHistory.map((req, index) => (
                    <div key={req.id} className="flex items-start gap-3 text-sm bg-white rounded-lg p-3 border border-purple-100">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 mb-1">{req.requestedBy}</p>
                        <p className="text-gray-600 mb-1">
                          📅 {new Date(req.requestedAt).toLocaleString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-gray-500 font-mono text-xs">🌐 IP: {req.ipAddress}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-700 mt-3 font-medium">
                  💡 Este QR NO se generó nuevamente. Se reutilizó el existente para la misma combinación.
                </p>
              </div>
            )}

            {/* Historial de Validaciones (Escaneos del QR) */}
            {qrPreviewCertificate && qrPreviewCertificate.scanHistory.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-green-600" />
                  Historial de Validaciones ({qrPreviewCertificate.qrScanCount} escaneos)
                </h4>
                <p className="text-xs text-green-800 mb-3">
                  Cada vez que alguien escanea el QR para <strong>validar la autenticidad</strong> del certificado, se registra aquí:
                </p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {qrPreviewCertificate.scanHistory.map((scan, index) => (
                    <div key={scan.id} className="flex items-start gap-3 text-sm bg-white rounded-lg p-4 border border-green-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className={`font-semibold ${scan.verified ? 'text-green-700' : 'text-red-700'}`}>
                            {scan.verified ? '✓ Validación Exitosa' : '✗ Validación Fallida'}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">
                          📅 {new Date(scan.scannedAt).toLocaleString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                        <div className="space-y-1.5 text-gray-600">
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">📍</span>
                            <span className="flex-shrink-0 font-semibold">Ubicación:</span>
                            <span className="break-words">{scan.location}</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">🌐</span>
                            <span className="flex-shrink-0 font-semibold">IP:</span>
                            <span className="font-mono text-xs">{scan.ipAddress}</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">💻</span>
                            <span className="flex-shrink-0 font-semibold">Dispositivo:</span>
                            <span className="break-all text-xs leading-relaxed">{scan.userAgent}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Trazabilidad completa: cada validación queda registrada permanentemente
                  </p>
                </div>
              </div>
            )}

            {/* URL Pública de Validación */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-700" />
                URL Pública de Validación
              </h4>
              <div className="flex items-center gap-2 p-3 bg-white rounded border border-gray-200">
                <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <code className="flex-1 text-xs font-mono text-blue-600 break-all">
                  {qrPreviewCertificate && getPublicValidationUrl(qrPreviewCertificate.qrCode)}
                </code>
                <button
                  onClick={() => qrPreviewCertificate && handleCopyToClipboard(
                    getPublicValidationUrl(qrPreviewCertificate.qrCode),
                    'URL de validación'
                  )}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                🔒 Este QR es <strong>único e irrepetible</strong> para esta combinación de graduado + entidad
              </p>
            </div>

            {/* Explicación de Funcionamiento */}
            {qrPreviewCertificate?.status === 'active' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-2">¿Qué sucede cuando alguien escanea este QR para validar?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Validación Inmediata:</strong> Sistema verifica si el certificado está ACTIVO y es válido</li>
                      <li><strong>Badge Visual:</strong> Muestra "✅ CERTIFICADO ACTIVO Y VÁLIDO" o "❌ CERTIFICADO INVÁLIDO"</li>
                      <li><strong>Datos del Graduado:</strong> Nombre completo, documento, programa y fecha de graduación</li>
                      <li><strong>Datos del Certificado:</strong> Número único, fecha de emisión y solicitante</li>
                      <li><strong>Registro de Validación:</strong> El escaneo queda registrado con IP, ubicación, dispositivo y fecha/hora</li>
                      <li><strong>Comparación:</strong> Permite verificar que los datos coinciden con el documento físico</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {qrPreviewCertificate?.status === 'revoked' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <div className="text-xs text-red-800">
                    <p className="font-semibold mb-2">⚠️ Certificado Revocado</p>
                    <p>Este certificado ha sido marcado como INVÁLIDO. Al escanear el QR, aparecerá un mensaje de advertencia indicando que el certificado NO es válido.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
