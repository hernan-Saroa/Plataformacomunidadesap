/**
 * MÓDULO: CASOS PENDIENTES DE VERIFICACIÓN
 * - Gestión de casos donde el usuario no está en la base de datos al escanear QR
 * - Plazo de revisión: 48-72 horas
 * - Formato de TABLA con columnas igual a Graduados
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  QrCode,
  Mail,
  User,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Globe,
  AlertTriangle,
  UserPlus,
  Ban,
  MessageSquare,
  MoreVertical,
  Copy
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import React from 'react';

// Tipo de caso pendiente
interface PendingCase {
  id: string;
  caseNumber: string;
  scannedAt: string;
  userInfo: {
    attemptedName?: string;
    attemptedDocument?: string;
    attemptedEmail?: string;
  };
  scanData: {
    ipAddress: string;
    location: string;
    userAgent: string;
    qrCode: string;
  };
  certificateAttempted?: {
    certificateNumber: string;
    graduateName: string;
  };
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  notes: string;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  resolution?: 'added_to_database' | 'false_positive' | 'fraud_attempt';
}

export function PendingVerificationCasesModule() {
  // Estados principales
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para modales
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<PendingCase | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Mock data
  const mockCases: PendingCase[] = [
    {
      id: 'PC001',
      caseNumber: 'CASO-2024-001',
      scannedAt: '2024-11-25T10:30:00',
      userInfo: {
        attemptedName: 'Juan Carlos Pérez',
        attemptedDocument: '1234567890',
        attemptedEmail: 'jperez@email.com'
      },
      scanData: {
        ipAddress: '192.168.1.100',
        location: 'Bogotá, Colombia',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        qrCode: 'QR-2024-ABC123'
      },
      certificateAttempted: {
        certificateNumber: 'CERT-2024-0123',
        graduateName: 'María López'
      },
      status: 'pending',
      priority: 'high',
      notes: 'Usuario intentó verificar certificado que no le corresponde',
      createdAt: '2024-11-25T10:30:00',
      expiresAt: '2024-11-27T10:30:00'
    },
    {
      id: 'PC002',
      caseNumber: 'CASO-2024-002',
      scannedAt: '2024-11-24T15:45:00',
      userInfo: {
        attemptedName: 'Ana María García',
        attemptedDocument: '9876543210',
        attemptedEmail: 'agarcia@email.com'
      },
      scanData: {
        ipAddress: '200.75.120.50',
        location: 'Medellín, Colombia',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        qrCode: 'QR-2024-XYZ789'
      },
      status: 'under_review',
      priority: 'medium',
      assignedTo: 'Carlos Admin',
      notes: 'Graduada no encontrada en sistema - verificar con Registro Académico',
      createdAt: '2024-11-24T15:45:00',
      expiresAt: '2024-11-26T15:45:00'
    },
    {
      id: 'PC003',
      caseNumber: 'CASO-2024-003',
      scannedAt: '2024-11-23T09:15:00',
      userInfo: {
        attemptedName: 'Pedro Rodríguez',
        attemptedDocument: '5555666677',
        attemptedEmail: 'prodriguez@email.com'
      },
      scanData: {
        ipAddress: '190.25.30.120',
        location: 'Cali, Colombia',
        userAgent: 'Mozilla/5.0 (Android 13; Mobile)',
        qrCode: 'QR-2024-DEF456'
      },
      status: 'resolved',
      priority: 'low',
      assignedTo: 'María Admin',
      notes: 'Usuario agregado exitosamente a la base de datos',
      createdAt: '2024-11-23T09:15:00',
      expiresAt: '2024-11-25T09:15:00',
      resolvedAt: '2024-11-24T14:30:00',
      resolution: 'added_to_database'
    },
    {
      id: 'PC004',
      caseNumber: 'CASO-2024-004',
      scannedAt: '2024-11-22T16:20:00',
      userInfo: {
        attemptedDocument: '1111222233'
      },
      scanData: {
        ipAddress: '172.16.50.80',
        location: 'Barranquilla, Colombia',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        qrCode: 'QR-2024-GHI789'
      },
      status: 'rejected',
      priority: 'high',
      assignedTo: 'Admin Sistema',
      notes: 'Intento de fraude detectado - documentación falsa',
      createdAt: '2024-11-22T16:20:00',
      expiresAt: '2024-11-24T16:20:00',
      resolvedAt: '2024-11-22T18:00:00',
      resolution: 'fraud_attempt'
    }
  ];

  const [cases] = useState<PendingCase[]>(mockCases);

  // Estadísticas
  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status === 'pending').length,
    underReview: cases.filter(c => c.status === 'under_review').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    rejected: cases.filter(c => c.status === 'rejected').length,
    highPriority: cases.filter(c => c.priority === 'high' && c.status !== 'resolved' && c.status !== 'rejected').length
  };

  // Funciones auxiliares
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      pending: {
        label: 'Pendiente',
        className: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
        icon: Clock
      },
      under_review: {
        label: 'En Revisión',
        className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#3B82F6]',
        icon: AlertCircle
      },
      resolved: {
        label: 'Resuelto',
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle
      },
      rejected: {
        label: 'Rechazado',
        className: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
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

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      high: {
        label: 'Alta',
        className: 'bg-red-100 text-red-700 border-red-300'
      },
      medium: {
        label: 'Media',
        className: 'bg-amber-100 text-amber-700 border-amber-300'
      },
      low: {
        label: 'Baja',
        className: 'bg-green-100 text-green-700 border-green-300'
      }
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return (
      <Badge className={`${config.className} border text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return 'Hace menos de 1 hora';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return { text: 'Vencido', color: 'text-red-600' };
    if (diffHours < 24) return { text: `${diffHours}h restantes`, color: 'text-red-600' };
    if (diffHours < 48) return { text: `${diffHours}h restantes`, color: 'text-amber-600' };
    return { text: `${diffHours}h restantes`, color: 'text-green-600' };
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

  // Filtros
  const filteredCases = cases.filter(c => {
    const matchesSearch = !searchQuery ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userInfo.attemptedName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userInfo.attemptedDocument?.includes(searchQuery) ||
      c.scanData.ipAddress.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Paginación
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleViewDetails = (caseItem: PendingCase) => {
    setExpandedCaseId(expandedCaseId === caseItem.id ? null : caseItem.id);
  };

  const handleResolveCase = (caseItem: PendingCase) => {
    setSelectedCase(caseItem);
    setResolutionNotes('');
    setIsResolveModalOpen(true);
  };

  const handleRejectCase = (caseItem: PendingCase) => {
    setSelectedCase(caseItem);
    setResolutionNotes('');
    setIsRejectModalOpen(true);
  };

  const confirmResolveCase = () => {
    if (!resolutionNotes.trim()) {
      toast.error('Debes agregar notas de resolución');
      return;
    }

    toast.success(`Caso ${selectedCase?.caseNumber} resuelto - Usuario agregado a la base de datos`);
    setIsResolveModalOpen(false);
    setSelectedCase(null);
    setResolutionNotes('');
  };

  const confirmRejectCase = () => {
    if (!resolutionNotes.trim()) {
      toast.error('Debes agregar el motivo del rechazo');
      return;
    }

    toast.success(`Caso ${selectedCase?.caseNumber} rechazado`);
    setIsRejectModalOpen(false);
    setSelectedCase(null);
    setResolutionNotes('');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estadísticas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Total Casos */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Total de Casos
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.total}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Todos los registros
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}
              >
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Pendientes */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Pendientes
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.pending}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Requieren atención
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
              >
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: Resueltos */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Resueltos
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.resolved}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Usuarios agregados
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 4: Prioridad Alta */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Prioridad Alta
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.highPriority}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Urgentes
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
              >
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filtros y Búsqueda */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border-2 p-6"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
              Filtros de Búsqueda
            </h2>
            {hasActiveFilters && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                Filtros activos
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[250px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: '#6B7280' }}
              />
              <input
                type="text"
                placeholder="Buscar por caso, documento, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 rounded-lg text-sm transition-all"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#1F2937',
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
            </div>

            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '180px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#003DA5';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="under_review">En Revisión</option>
              <option value="resolved">Resueltos</option>
              <option value="rejected">Rechazados</option>
            </select>

            {/* Filtro de Prioridad */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '150px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#003DA5';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
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

      {/* Lista de Casos - FORMATO TABLA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        {paginatedCases.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron casos
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay casos pendientes en este momento'}
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
                <div className="col-span-3">CASO / USUARIO</div>
                <div className="col-span-2">UBICACIÓN / IP</div>
                <div className="col-span-2">QR ESCANEADO</div>
                <div className="col-span-2">ESTADO</div>
                <div className="col-span-2">TIEMPO</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Casos */}
            {paginatedCases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Caso / Usuario (3 cols) */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback
                            className="text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                          >
                            <AlertCircle className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate" style={{ color: '#1F2937' }}>
                            {caseItem.userInfo.attemptedName || 'Usuario Desconocido'}
                          </h3>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            {caseItem.caseNumber}
                          </p>
                          {caseItem.userInfo.attemptedDocument && (
                            <p className="text-xs font-mono truncate" style={{ color: '#6B7280' }}>
                              Doc: {caseItem.userInfo.attemptedDocument}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Ubicación / IP (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                          <p className="text-sm truncate" style={{ color: '#1F2937' }}>
                            {caseItem.scanData.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                          <p className="text-xs font-mono truncate" style={{ color: '#6B7280' }}>
                            {caseItem.scanData.ipAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: QR Escaneado (2 cols) */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F3F4F6' }}
                        >
                          <QrCode className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate" style={{ color: '#1F2937' }}>
                            {caseItem.scanData.qrCode}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            {formatTimeAgo(caseItem.scannedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Estado (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1.5">
                        {getStatusBadge(caseItem.status)}
                        {getPriorityBadge(caseItem.priority)}
                      </div>
                    </div>

                    {/* Columna 5: Tiempo (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        {caseItem.status !== 'resolved' && caseItem.status !== 'rejected' ? (
                          <p className={`text-sm font-semibold ${getTimeRemaining(caseItem.expiresAt).color}`}>
                            ⏱️ {getTimeRemaining(caseItem.expiresAt).text}
                          </p>
                        ) : (
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            {caseItem.status === 'resolved' ? '✅ Resuelto' : '❌ Rechazado'}
                          </p>
                        )}
                        {caseItem.assignedTo && (
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {caseItem.assignedTo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 6: Acciones (1 col) */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(caseItem)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedCaseId === caseItem.id ? '#003DA5' : '#F3F4F6',
                          color: expandedCaseId === caseItem.id ? '#FFFFFF' : '#6B7280'
                        }}
                        title="Ver detalles"
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
                          {(caseItem.status === 'pending' || caseItem.status === 'under_review') && (
                            <>
                              <DropdownMenuItem onClick={() => handleResolveCase(caseItem)}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Resolver - Agregar Usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRejectCase(caseItem)}
                                className="text-red-600"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Rechazar Caso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(caseItem.scanData.ipAddress, 'IP')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar IP
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(caseItem.caseNumber, 'Número de caso')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Número de Caso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido - Detalles Completos */}
                <AnimatePresence>
                  {expandedCaseId === caseItem.id && (
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
                            Detalles Completos del Caso
                          </h3>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs">
                            {caseItem.caseNumber}
                          </Badge>
                        </div>

                        {/* Grid 2 columnas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Info del Usuario */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600" />
                              Información del Usuario
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              {caseItem.userInfo.attemptedName && (
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-gray-600">Nombre</p>
                                    <p className="font-semibold text-gray-900">{caseItem.userInfo.attemptedName}</p>
                                  </div>
                                </div>
                              )}
                              {caseItem.userInfo.attemptedDocument && (
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-gray-600">Documento</p>
                                    <p className="font-semibold text-gray-900 font-mono">{caseItem.userInfo.attemptedDocument}</p>
                                  </div>
                                </div>
                              )}
                              {caseItem.userInfo.attemptedEmail && (
                                <div className="flex items-start gap-2">
                                  <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-gray-600">Email</p>
                                    <p className="font-semibold text-gray-900">{caseItem.userInfo.attemptedEmail}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha del Escaneo</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(caseItem.scannedAt).toLocaleString('es-CO', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Datos del Escaneo */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-orange-600" />
                              Datos Técnicos del Escaneo
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                <Globe className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600">Dirección IP</p>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900 font-mono">{caseItem.scanData.ipAddress}</p>
                                    <button
                                      onClick={() => handleCopyToClipboard(caseItem.scanData.ipAddress, 'IP')}
                                      className="p-1 hover:bg-orange-100 rounded"
                                    >
                                      <Copy className="w-3 h-3 text-gray-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Ubicación</p>
                                  <p className="font-semibold text-gray-900">{caseItem.scanData.location}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <QrCode className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Código QR</p>
                                  <p className="font-semibold text-gray-900 font-mono">{caseItem.scanData.qrCode}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Certificado Intentado - ALERTA */}
                        {caseItem.certificateAttempted && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              ⚠️ Intentó Verificar Certificado Ajeno
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Certificado</p>
                                <p className="font-semibold text-gray-900 font-mono">{caseItem.certificateAttempted.certificateNumber}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Graduado Legítimo</p>
                                <p className="font-semibold text-gray-900">{caseItem.certificateAttempted.graduateName}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notas */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-700" />
                            Notas del Caso
                          </h4>
                          <p className="text-sm text-gray-900 bg-white p-3 rounded border border-gray-200">
                            {caseItem.notes}
                          </p>
                        </div>

                        {/* Timeline */}
                        {caseItem.resolvedAt && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-green-600" />
                              Resolución
                            </h4>
                            <div className="space-y-2 text-sm">
                              {caseItem.assignedTo && (
                                <div>
                                  <span className="text-gray-600">Resuelto por:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{caseItem.assignedTo}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {new Date(caseItem.resolvedAt).toLocaleString('es-CO')}
                                </span>
                              </div>
                              {caseItem.resolution && (
                                <div>
                                  <span className="text-gray-600">Resultado:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {caseItem.resolution === 'added_to_database' && 'Usuario agregado a la base de datos'}
                                    {caseItem.resolution === 'false_positive' && 'Falso positivo'}
                                    {caseItem.resolution === 'fraud_attempt' && 'Intento de fraude detectado'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
      {paginatedCases.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <PaginationPremium
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

      {/* Modal: Resolver Caso */}
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Resolver Caso - Agregar Usuario
            </DialogTitle>
            <DialogDescription>
              El usuario será agregado a la base de datos y el caso se cerrará
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedCase?.caseNumber}
                  </p>
                  {selectedCase?.userInfo.attemptedName && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Usuario:</strong> {selectedCase.userInfo.attemptedName}
                    </p>
                  )}
                  {selectedCase?.userInfo.attemptedDocument && (
                    <p className="text-sm text-gray-600">
                      <strong>Documento:</strong> {selectedCase.userInfo.attemptedDocument}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Notas de Resolución *
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe cómo se verificó la identidad del usuario..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-[#003DA5]"
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Al resolver este caso:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El usuario será agregado a la base de datos</li>
                    <li>Se enviará notificación al usuario</li>
                    <li>El caso se marcará como "Resuelto"</li>
                    <li>Esta acción quedará registrada en auditoría</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmResolveCase}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <UserPlus className="w-4 h-4" />
              Agregar Usuario
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rechazar Caso */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Rechazar Caso
            </DialogTitle>
            <DialogDescription>
              El caso se cerrará sin agregar el usuario a la base de datos
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedCase?.caseNumber}
                  </p>
                  {selectedCase?.userInfo.attemptedName && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Usuario:</strong> {selectedCase.userInfo.attemptedName}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <strong>IP:</strong> {selectedCase?.scanData.ipAddress}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Motivo del Rechazo *
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explica por qué se rechaza este caso..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-[#003DA5]"
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Al rechazar este caso:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El usuario NO será agregado a la base de datos</li>
                    <li>El caso se marcará como "Rechazado"</li>
                    <li>Se bloqueará la IP si es necesario</li>
                    <li>Esta acción quedará registrada en auditoría</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmRejectCase}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#EF4444', color: '#FFFFFF' }}
            >
              <Ban className="w-4 h-4" />
              Rechazar Caso
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
