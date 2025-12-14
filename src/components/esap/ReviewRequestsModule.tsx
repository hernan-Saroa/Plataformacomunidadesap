/**
 * MÓDULO: SOLICITUDES DE REVISIÓN
 * - Gestión de solicitudes de verificación de graduados no encontrados
 * - Formato de TABLA con columnas igual a Casos Pendientes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  Mail, 
  Hash,
  TrendingUp, 
  RefreshCw, 
  MessageSquare,
  Award, 
  X,
  MoreVertical,
  Copy,
  Shield
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import type { ReviewRequest, ReviewRequestStats } from '../../types';

export function ReviewRequestsModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para modal de revisión
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [resolution, setResolution] = useState<'graduate_found' | 'graduate_not_found' | 'invalid_data' | 'duplicate_request'>('graduate_found');

  // Mock data
  const mockStats: ReviewRequestStats = {
    total: 24,
    pending: 8,
    underReview: 5,
    approved: 9,
    rejected: 2,
    avgResolutionTime: 4.5
  };

  const mockRequests: ReviewRequest[] = [
    {
      id: '1',
      requestNumber: 'REV-2024-001',
      graduateDocumentNumber: '1234567890',
      graduateDocumentIssueDate: '2015-05-20',
      requester: {
        name: 'Tech Solutions S.A.S.',
        email: 'rrhh@techsolutions.com',
        type: 'empresa'
      },
      status: 'pending',
      createdAt: '2024-11-13T10:30:00Z'
    },
    {
      id: '2',
      requestNumber: 'REV-2024-002',
      graduateDocumentNumber: '9876543210',
      graduateDocumentIssueDate: '2018-03-15',
      requester: {
        name: 'Juan Carlos Pérez',
        email: 'jc.perez@email.com',
        type: 'graduado'
      },
      status: 'under_review',
      createdAt: '2024-11-12T14:20:00Z',
      reviewedBy: 'USR-001',
      reviewerName: 'Admin ESAP'
    },
    {
      id: '3',
      requestNumber: 'REV-2024-003',
      graduateDocumentNumber: '1122334455',
      graduateDocumentIssueDate: '2020-07-10',
      requester: {
        name: 'Consulting Group Ltda',
        email: 'info@consultinggroup.com',
        type: 'empresa'
      },
      status: 'approved',
      createdAt: '2024-11-10T09:15:00Z',
      reviewedAt: '2024-11-11T11:30:00Z',
      reviewedBy: 'USR-001',
      reviewerName: 'Admin ESAP',
      resolution: 'graduate_found',
      reviewNotes: 'Graduado encontrado en el sistema. Certificado generado exitosamente.',
      certificateGenerated: true,
      certificateId: 'CERT-2024-ABC123'
    },
    {
      id: '4',
      requestNumber: 'REV-2024-004',
      graduateDocumentNumber: '5544332211',
      graduateDocumentIssueDate: '2010-12-05',
      requester: {
        name: 'María Fernanda Gómez',
        email: 'mf.gomez@email.com',
        type: 'graduado'
      },
      status: 'rejected',
      createdAt: '2024-11-09T16:45:00Z',
      reviewedAt: '2024-11-09T18:20:00Z',
      reviewedBy: 'USR-002',
      reviewerName: 'Coordinador Académico',
      resolution: 'graduate_not_found',
      reviewNotes: 'No se encontró registro del graduado en la base de datos institucional.'
    },
    {
      id: '5',
      requestNumber: 'REV-2024-005',
      graduateDocumentNumber: '7788990011',
      graduateDocumentIssueDate: '2019-08-22',
      requester: {
        name: 'Global Services Inc',
        email: 'hr@globalservices.com',
        type: 'empresa'
      },
      status: 'pending',
      createdAt: '2024-11-13T08:00:00Z'
    }
  ];

  // Funciones auxiliares
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
      under_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: RefreshCw },
      approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border px-2.5 py-1 flex items-center gap-1.5`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
    );
  };

  const getRequesterTypeIcon = (type: string) => {
    return type === 'empresa' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getRequesterTypeBadge = (type: string) => {
    const isCompany = type === 'empresa';
    return (
      <Badge className={`${isCompany ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-blue-100 text-blue-800 border-blue-300'} border text-xs`}>
        {isCompany ? 'Empresa' : 'Graduado'}
      </Badge>
    );
  };

  const getResolutionBadge = (resolution?: string) => {
    if (!resolution) return null;

    const resolutionConfig = {
      graduate_found: { label: 'Graduado Encontrado', color: 'bg-green-50 text-green-700 border-green-200' },
      graduate_not_found: { label: 'No Encontrado', color: 'bg-red-50 text-red-700 border-red-200' },
      invalid_data: { label: 'Datos Inválidos', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      duplicate_request: { label: 'Solicitud Duplicada', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    };

    const config = resolutionConfig[resolution as keyof typeof resolutionConfig];
    if (!config) return null;

    return (
      <Badge className={`${config.color} border px-2 py-1 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const calculateTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Hace menos de 1 hora';
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  const filteredRequests = mockRequests.filter(request => {
    const matchesSearch = 
      request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.graduateDocumentNumber.includes(searchQuery) ||
      request.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requester.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleViewDetails = (request: ReviewRequest) => {
    setExpandedRequestId(expandedRequestId === request.id ? null : request.id);
  };

  const handleStartReview = (request: ReviewRequest) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
    setReviewNotes('');
    setResolution('graduate_found');
  };

  const handleSubmitReview = () => {
    if (!reviewNotes.trim()) {
      toast.error('Por favor ingresa notas de revisión');
      return;
    }

    toast.success('Revisión completada exitosamente');
    setShowReviewModal(false);
    setSelectedRequest(null);
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estadísticas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {/* Card 1: Total */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Total
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {mockStats.total}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Solicitudes
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
              >
                <FileText className="w-7 h-7 text-white" />
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
                  {mockStats.pending}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Sin revisar
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

        {/* Card 3: En Revisión */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  En Revisión
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {mockStats.underReview}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  En proceso
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}
              >
                <RefreshCw className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 4: Aprobadas */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Aprobadas
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {mockStats.approved}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Resueltas
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

        {/* Card 5: Tiempo Promedio */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Tiempo Promedio
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {mockStats.avgResolutionTime}h
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Resolución
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
              >
                <TrendingUp className="w-7 h-7 text-white" />
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
                placeholder="Buscar por número, cédula, nombre o email..."
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
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
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

      {/* Lista de Solicitudes - FORMATO TABLA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        {paginatedRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron solicitudes
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay solicitudes en este momento'}
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
                <div className="col-span-3">SOLICITUD / SOLICITANTE</div>
                <div className="col-span-2">GRADUADO BUSCADO</div>
                <div className="col-span-2">FECHA EXPEDICIÓN</div>
                <div className="col-span-2">ESTADO</div>
                <div className="col-span-2">TIEMPO</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Solicitudes */}
            {paginatedRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Solicitud / Solicitante (3 cols) */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback
                            className="text-white font-semibold text-sm"
                            style={{ 
                              background: request.requester.type === 'empresa' 
                                ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' 
                                : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' 
                            }}
                          >
                            {request.requester.type === 'empresa' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate" style={{ color: '#1F2937' }}>
                            {request.requester.name}
                          </h3>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            {request.requestNumber}
                          </p>
                          <p className="text-xs truncate flex items-center gap-1" style={{ color: '#6B7280' }}>
                            <Mail className="w-3 h-3" />
                            {request.requester.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Graduado Buscado (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                          <p className="text-sm font-mono font-semibold truncate" style={{ color: '#1F2937' }}>
                            {request.graduateDocumentNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Fecha Expedición (2 cols) */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F3F4F6' }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1F2937' }}>
                            {new Date(request.graduateDocumentIssueDate).toLocaleDateString('es-CO')}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            Expedición
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Estado (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1.5">
                        {getStatusBadge(request.status)}
                        {getRequesterTypeBadge(request.requester.type)}
                      </div>
                    </div>

                    {/* Columna 5: Tiempo (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                          {calculateTimeSince(request.createdAt)}
                        </p>
                        {request.reviewerName && (
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {request.reviewerName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 6: Acciones (1 col) */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedRequestId === request.id ? '#003DA5' : '#F3F4F6',
                          color: expandedRequestId === request.id ? '#FFFFFF' : '#6B7280'
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
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStartReview(request)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Revisar Solicitud
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(request.graduateDocumentNumber, 'Cédula')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Cédula
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(request.requestNumber, 'Número de solicitud')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Número de Solicitud
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido - Detalles Completos */}
                <AnimatePresence>
                  {expandedRequestId === request.id && (
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
                            Detalles Completos de la Solicitud
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
                            {request.requestNumber}
                          </Badge>
                        </div>

                        {/* Grid 2 columnas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Info del Graduado Buscado */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Hash className="w-4 h-4 text-blue-600" />
                              Graduado Buscado
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                <Hash className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Cédula</p>
                                  <p className="font-semibold text-gray-900 font-mono">{request.graduateDocumentNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Expedición</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(request.graduateDocumentIssueDate).toLocaleDateString('es-CO', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Info del Solicitante */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              {getRequesterTypeIcon(request.requester.type)}
                              Solicitante
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                {request.requester.type === 'empresa' ? <Building2 className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" /> : <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                <div>
                                  <p className="text-xs text-gray-600">Nombre</p>
                                  <p className="font-semibold text-gray-900">{request.requester.name}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  <p className="font-semibold text-gray-900">{request.requester.email}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Tipo</p>
                                {getRequesterTypeBadge(request.requester.type)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Detalles de Revisión */}
                        {request.reviewedAt && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-gray-700" />
                              Detalles de Revisión
                            </h4>
                            <div className="space-y-2 text-sm">
                              {request.reviewerName && (
                                <div>
                                  <span className="text-gray-600">Revisado por:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{request.reviewerName}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="ml-2 font-semibold text-gray-900">{formatDate(request.reviewedAt)}</span>
                              </div>
                              {request.resolution && (
                                <div className="mt-2">
                                  {getResolutionBadge(request.resolution)}
                                </div>
                              )}
                              {request.reviewNotes && (
                                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                  <p className="text-xs text-gray-700">{request.reviewNotes}</p>
                                </div>
                              )}
                              {request.certificateGenerated && request.certificateId && (
                                <div className="mt-2 p-2 bg-green-100 rounded border border-green-300 flex items-center gap-2">
                                  <Award className="w-4 h-4 text-green-700" />
                                  <span className="text-xs text-green-800 font-semibold">
                                    Certificado generado: {request.certificateId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-700" />
                            Línea de Tiempo
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Solicitud creada</span>
                              <span className="font-semibold text-gray-900">
                                {formatDate(request.createdAt)}
                              </span>
                            </div>
                            {request.reviewedAt && (
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                <span className="text-gray-600">Revisión completada</span>
                                <span className="font-semibold text-gray-900">
                                  {formatDate(request.reviewedAt)}
                                </span>
                              </div>
                            )}
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
      {paginatedRequests.length > 0 && (
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

      {/* Modal: Revisar Solicitud */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Revisar Solicitud
            </DialogTitle>
            <DialogDescription>
              Completa la revisión de la solicitud de verificación
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedRequest?.requestNumber}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Cédula buscada:</strong> {selectedRequest?.graduateDocumentNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Solicitante:</strong> {selectedRequest?.requester.name}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Resolución *
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as any)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm focus:border-[#003DA5]"
              >
                <option value="graduate_found">Graduado Encontrado</option>
                <option value="graduate_not_found">Graduado No Encontrado</option>
                <option value="invalid_data">Datos Inválidos</option>
                <option value="duplicate_request">Solicitud Duplicada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Notas de Revisión *
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe los hallazgos de la revisión..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-[#003DA5]"
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Al completar la revisión:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Se notificará al solicitante</li>
                    <li>El estado cambiará según la resolución</li>
                    <li>Esta acción quedará registrada en auditoría</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitReview}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <CheckCircle className="w-4 h-4" />
              Completar Revisión
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
