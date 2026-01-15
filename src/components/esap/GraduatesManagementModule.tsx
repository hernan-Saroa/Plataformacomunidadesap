/**
 * MÓDULO: GESTIÓN DE GRADUADOS Y VERIFICACIÓN DE TÍTULOS
 * - Lista de usuarios con rol "Graduado" del sistema
 * - Mismo diseño que el módulo de Usuarios
 * - Generación de certificados de verificación de títulos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Search, 
  Filter, 
  X, 
  MoreVertical, 
  ChevronDown, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Clock, 
  Shield,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  QrCode,
  Lock,
  Unlock,
  GraduationCap,
  Award,
  BadgeCheck,
  Send,
  AlertTriangle,
  Building2  // ✅ NUEVO: Para filtro de sedes
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';
import { MOCK_USERS_WITH_SEDES as MOCK_USERS } from '../../data/mockUsersWithSedes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import React from 'react';
import { ValidarCertificadoGrado } from './registro-academico/ValidarCertificadoGrado';

export function GraduatesManagementModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all'); // ✅ NUEVO: Filtro por sede
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [mostrarValidador, setMostrarValidador] = useState(false); // ✅ NUEVO: Estado para vista de validación

  // Estados para modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerifyTitleModalOpen, setIsVerifyTitleModalOpen] = useState(false);
  const [isGenerateCertModalOpen, setIsGenerateCertModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[0] | null>(null);

  // Estados para formularios
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    document: '',
    program: '',
    location: ''
  });

  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });

  const [certForm, setCertForm] = useState({
    includeQR: true,
    includeDigitalSignature: true,
    format: 'pdf' as 'pdf' | 'docx'
  });

  // Filtrar solo usuarios con rol "Graduado"
  const graduatesOnly = MOCK_USERS.filter(user => 
    user.roles.some(role => role.name === 'Graduado')
  );

  // Stats calculadas
  const stats = {
    total: graduatesOnly.length,
    active: graduatesOnly.filter(u => u.status === 'active').length,
    blocked: graduatesOnly.filter(u => u.status === 'blocked').length,
    growth: 8.5
  };

  // Filtros únicos para los selectores
  const uniquePrograms = Array.from(new Set(graduatesOnly.filter(u => u.program).map(u => u.program!)));
  const uniqueLocations = Array.from(new Set(graduatesOnly.map(u => u.location)));

  // Filtrado
  const filteredUsers = graduatesOnly.filter(user => {
    const matchesSearch = searchQuery === '' ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.document.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesProgram = programFilter === 'all' || user.program === programFilter;
    const matchesLocation = locationFilter === 'all' || user.location === locationFilter;
    
    // ✅ NUEVO: Filtro por sede (basado en asignacionesSedes)
    const matchesSede = sedeFilter === 'all' || 
      (user.asignacionesSedes && user.asignacionesSedes.some(asig => asig.nombreSede === sedeFilter));
    
    return matchesSearch && matchesStatus && matchesProgram && matchesLocation && matchesSede;
  });

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      active: { 
        label: 'Activo', 
        className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle
      },
      blocked: { 
        label: 'Bloqueado', 
        className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle
      },
      inactive: { 
        label: 'Inactivo', 
        className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
        icon: AlertCircle
      }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };

  const getRoleBadge = (roleName: string, roleColor: string) => {
    const colorConfig: Record<string, string> = {
      blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
      purple: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
      green: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
      orange: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
      red: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]'
    };
    
    return (
      <Badge className={`${colorConfig[roleColor] || colorConfig.blue} border text-xs font-medium`}>
        {roleName}
      </Badge>
    );
  };

  const getEnrollmentBadge = (method: 'qr' | 'manual' | 'massive') => {
    const methodConfig: Record<string, { label: string; className: string; icon: any }> = {
      qr: { 
        label: 'QR Code', 
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: QrCode
      },
      manual: { 
        label: 'Manual', 
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: UserPlus
      },
      massive: { 
        label: 'Carga Masiva', 
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
        icon: Upload
      }
    };
    
    const config = methodConfig[method];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
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

  const handleEdit = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      document: user.document,
      program: user.program || '',
      location: user.location
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (user: typeof MOCK_USERS[0]) => {
    setExpandedUserId(expandedUserId === user.id ? null : user.id);
  };

  const handleBlockUser = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setIsBlockModalOpen(true);
  };

  const handleActivateUser = (user: typeof MOCK_USERS[0]) => {
    toast.success('Graduado Activado', { 
      description: `${user.firstName} ${user.lastName} ha sido activado exitosamente.`
    });
  };

  const handleVerifyTitle = (user?: typeof MOCK_USERS[0]) => {
    // ✅ NUEVO: Abrir vista completa de validación de certificados de grado
    setMostrarValidador(true);
  };

  const handleGenerateCertificate = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setIsGenerateCertModalOpen(true);
  };

  const handleSendEmail = (user: typeof MOCK_USERS[0]) => {
    setSelectedUser(user);
    setEmailForm({
      subject: `Información importante para graduado - ${user.firstName} ${user.lastName}`,
      message: ''
    });
    setIsEmailModalOpen(true);
  };

  // Handlers para confirmar acciones en modales
  const confirmEdit = () => {
    toast.success('Graduado Actualizado', {
      description: `Los datos de ${editForm.firstName} ${editForm.lastName} han sido actualizados exitosamente.`
    });
    setIsEditModalOpen(false);
  };

  const confirmDelete = () => {
    toast.success('Graduado Eliminado', {
      description: `Se eliminó: ${selectedUser?.firstName} ${selectedUser?.lastName}`
    });
    setIsDeleteModalOpen(false);
  };

  const confirmBlock = () => {
    toast.success('Graduado Bloqueado', {
      description: `${selectedUser?.firstName} ${selectedUser?.lastName} ha sido bloqueado exitosamente.`
    });
    setIsBlockModalOpen(false);
  };

  const confirmVerifyTitle = () => {
    toast.success('Certificado Verificado', {
      description: `El certificado de ${selectedUser?.firstName} ${selectedUser?.lastName} ha sido verificado exitosamente.`
    });
    setIsVerifyTitleModalOpen(false);
  };

  const confirmGenerateCertificate = () => {
    toast.success('Certificado Generado', {
      description: `Certificado de ${selectedUser?.firstName} ${selectedUser?.lastName} generado en formato ${certForm.format.toUpperCase()}.`
    });
    setIsGenerateCertModalOpen(false);
  };

  const confirmSendEmail = () => {
    toast.success('Email Enviado', {
      description: `Email enviado exitosamente a ${selectedUser?.email}`
    });
    setIsEmailModalOpen(false);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProgramFilter('all');
    setLocationFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || programFilter !== 'all' || locationFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* ✅ Modal de Validador de Certificados */}
      <ValidarCertificadoGrado 
        isOpen={mostrarValidador} 
        onClose={() => setMostrarValidador(false)} 
      />

      {/* Header - Según especificaciones Figma */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 
              className="font-bold tracking-tight"
              style={{
                fontSize: '32px',
                lineHeight: '40px',
                letterSpacing: '-0.25px',
                color: '#1F2937'
              }}
            >
              Gestión de Graduados
            </h1>
          </div>
          <p 
            className="font-normal"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6B7280'
            }}
          >
            Administra graduados y genera certificados de verificación de títulos
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => toast.info('Exportar graduados')}
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

          <button
            onClick={() => handleVerifyTitle()}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#003DA5',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#002D7A';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 61, 165, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#003DA5';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <BadgeCheck className="w-5 h-5" strokeWidth={2} />
            <span>Verificar Certificado</span>
          </button>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
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
                placeholder="Buscar por nombre, correo o documento..."
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
              <option value="blocked">Bloqueados</option>
              <option value="inactive">Inactivos</option>
            </select>

            {/* Filtro Programa */}
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
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
              <option value="all">Todos los programas</option>
              {uniquePrograms.map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>

            {/* ✅ NUEVO: Filtro por Sede */}
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
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
              <option value="all">Todas las sedes</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Medellín">Medellín</option>
              <option value="Cali">Cali</option>
              <option value="Barranquilla">Barranquilla</option>
              <option value="Bucaramanga">Bucaramanga</option>
              <option value="Cartagena">Cartagena</option>
            </select>

            {/* Filtro Ubicación */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
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
              <option value="all">Todas las ubicaciones</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
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

      {/* Lista de Graduados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        {paginatedUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron graduados
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay graduados registrados en el sistema'}
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
                <div className="col-span-2">FECHA DE GRADO</div>
                <div className="col-span-2">CERTIFICADOS</div>
                <div className="col-span-2">PROGRAMA</div>
                <div className="col-span-2">ESTADO</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Graduados */}
            {paginatedUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal con Columnas */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Graduado (Avatar + Nombre + Contacto) */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback 
                            className="text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
                          >
                            {user.firstName[0]}{user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-semibold truncate mb-0.5"
                            style={{ fontSize: '14px', color: '#1F2937' }}
                          >
                            {user.firstName} {user.lastName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Fecha de Grado */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F0F6FF' }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: '#003DA5' }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#6B7280' }}>
                            Graduado
                          </p>
                          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {user.roles.find(r => r.name === 'Graduado')?.since 
                              ? new Date(user.roles.find(r => r.name === 'Graduado')!.since).toLocaleDateString('es-CO', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Certificados Descargados */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#ECFDF5' }}
                        >
                          <Award className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#6B7280' }}>
                            Descargas
                          </p>
                          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {Math.floor(Math.random() * 15) + 1} veces
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Programa */}
                    <div className="col-span-2">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#6B7280' }} />
                        <p className="text-sm font-medium line-clamp-2" style={{ color: '#1F2937' }}>
                          {user.program || 'No especificado'}
                        </p>
                      </div>
                    </div>

                    {/* Columna 5: Estado */}
                    <div className="col-span-2">
                      {getStatusBadge(user.status)}
                    </div>

                    {/* Columna 6: Acciones */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedUserId === user.id ? '#F0F6FF' : '#F9FAFB',
                          color: '#003DA5'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0F6FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = expandedUserId === user.id ? '#F0F6FF' : '#F9FAFB';
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
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVerifyTitle(user)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            Verificar Certificado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateCertificate(user)}>
                            <Award className="w-4 h-4 mr-2" />
                            Generar Certificado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Enviar Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleBlockUser(user)}>
                              <Lock className="w-4 h-4 mr-2" />
                              Bloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivateUser(user)}>
                              <Unlock className="w-4 h-4 mr-2" />
                              Activar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido */}
                <AnimatePresence>
                  {expandedUserId === user.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden"
                    >
                      {/* Grid de 3 columnas con información completa del graduado */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Documento
                          </p>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.document}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Teléfono
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.phone}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Ubicación
                          </p>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.location}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Última actividad
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatLastActivity(user.lastActivity)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Método de Enrolamiento
                          </p>
                          {getEnrollmentBadge(user.enrollmentMethod)}
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Roles en el Sistema
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, idx) => (
                              <React.Fragment key={idx}>
                                {getRoleBadge(role.name, role.color)}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Documentos en Carpeta
                          </p>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.documentsCount} archivos
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Fecha de Enrolamiento
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {new Date(user.enrollmentDate).toLocaleDateString('es-CO', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Creado por
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.createdBy || 'Autoservicio'}
                            </p>
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
      {paginatedUsers.length > 0 && (
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
            totalItems={filteredUsers.length}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

      {/* ==================== MODALES ==================== */}

      {/* Modal: Editar Graduado */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" style={{ color: '#003DA5' }} />
              Editar Graduado
            </DialogTitle>
            <DialogDescription>
              Actualiza la información del graduado {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Nombre</Label>
              <Input
                id="edit-firstName"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                placeholder="Nombre del graduado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Apellido</Label>
              <Input
                id="edit-lastName"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                placeholder="Apellido del graduado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-document">Documento</Label>
              <Input
                id="edit-document"
                value={editForm.document}
                onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}
                placeholder="Número de documento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+57 300 1234567"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-program">Programa Académico</Label>
              <select
                id="edit-program"
                value={editForm.program}
                onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: '#D1D5DB' }}
              >
                <option value="">Seleccionar programa</option>
                {uniquePrograms.map(prog => (
                  <option key={prog} value={prog}>{prog}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Ubicación</Label>
              <select
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: '#D1D5DB' }}
              >
                <option value="">Seleccionar ubicación</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmEdit}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              Guardar Cambios
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Verificar Certificado */}
      <Dialog open={isVerifyTitleModalOpen} onOpenChange={setIsVerifyTitleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5" style={{ color: '#10B981' }} />
              Verificar Certificado de Título
            </DialogTitle>
            <DialogDescription>
              Confirma la verificación del certificado de {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 mt-0.5" style={{ color: '#003DA5' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Información del Certificado
                  </p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Graduado:</strong> {selectedUser?.firstName} {selectedUser?.lastName}</p>
                    <p><strong>Documento:</strong> {selectedUser?.document}</p>
                    <p><strong>Programa:</strong> {selectedUser?.program}</p>
                    <p><strong>Fecha de Grado:</strong> {selectedUser?.roles.find(r => r.name === 'Graduado')?.since 
                      ? new Date(selectedUser.roles.find(r => r.name === 'Graduado')!.since).toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Estado de Verificación
                  </p>
                  <p className="text-sm text-gray-600">
                    Al confirmar, se generará un certificado de verificación oficial que podrá ser descargado por el graduado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsVerifyTitleModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmVerifyTitle}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <BadgeCheck className="w-4 h-4" />
              Verificar Certificado
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Generar Certificado */}
      <Dialog open={isGenerateCertModalOpen} onOpenChange={setIsGenerateCertModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" style={{ color: '#003DA5' }} />
              Generar Certificado de Graduación
            </DialogTitle>
            <DialogDescription>
              Configura las opciones del certificado para {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Graduado</p>
                  <p className="font-semibold text-gray-900">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Programa</p>
                  <p className="font-semibold text-gray-900">{selectedUser?.program}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Documento</p>
                  <p className="font-semibold text-gray-900">{selectedUser?.document}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Fecha de Grado</p>
                  <p className="font-semibold text-gray-900">
                    {selectedUser?.roles.find(r => r.name === 'Graduado')?.since 
                      ? new Date(selectedUser.roles.find(r => r.name === 'Graduado')!.since).toLocaleDateString('es-CO', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Formato del Certificado</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCertForm({ ...certForm, format: 'pdf' })}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    certForm.format === 'pdf' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  PDF
                </button>
                <button
                  onClick={() => setCertForm({ ...certForm, format: 'docx' })}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    certForm.format === 'docx' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  DOCX
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Opciones Adicionales</Label>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="includeQR"
                  checked={certForm.includeQR}
                  onChange={(e) => setCertForm({ ...certForm, includeQR: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: '#003DA5' }}
                />
                <label htmlFor="includeQR" className="flex-1 text-sm cursor-pointer">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Incluir Código QR de Verificación</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Permite verificar la autenticidad del certificado escaneando el código QR
                  </p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="includeSignature"
                  checked={certForm.includeDigitalSignature}
                  onChange={(e) => setCertForm({ ...certForm, includeDigitalSignature: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: '#003DA5' }}
                />
                <label htmlFor="includeSignature" className="flex-1 text-sm cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Incluir Firma Digital</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Agrega firma digital oficial de ESAP para mayor seguridad
                  </p>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsGenerateCertModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmGenerateCertificate}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4" />
              Generar Certificado
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Email */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
              Enviar Email a Graduado
            </DialogTitle>
            <DialogDescription>
              Envía un correo electrónico a {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" style={{ color: '#003DA5' }} />
                <span className="font-medium text-gray-900">Para:</span>
                <span className="text-gray-700">{selectedUser?.firstName} {selectedUser?.lastName}</span>
                <span className="text-gray-500">({selectedUser?.email})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Asunto</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Asunto del correo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Mensaje</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Escribe tu mensaje aquí..."
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <p className="text-xs text-amber-800">
                  El correo será enviado desde la cuenta oficial de ESAP y quedará registrado en el historial de comunicaciones del graduado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmSendEmail}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Send className="w-4 h-4" />
              Enviar Email
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Bloquear Graduado */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Bloquear Graduado
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas bloquear a este graduado?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Documento:</strong> {selectedUser?.document}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Consecuencias del bloqueo:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El graduado no podrá acceder al portal</li>
                    <li>No podrá descargar certificados</li>
                    <li>Se suspenderán todas sus sesiones activas</li>
                    <li>Podrás revertir esta acción en cualquier momento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsBlockModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmBlock}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <Lock className="w-4 h-4" />
              Confirmar Bloqueo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Eliminar Graduado */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Eliminar Graduado
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás completamente seguro?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Programa:</strong> {selectedUser?.program}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Documento:</strong> {selectedUser?.document}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-red-700" />
                <div className="text-xs text-red-900">
                  <p className="font-semibold mb-1">⚠️ ADVERTENCIA: Esta acción es PERMANENTE</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Se eliminarán todos los datos del graduado</li>
                    <li>Se borrarán todos sus certificados</li>
                    <li>Se perderá el historial completo</li>
                    <li>Esta acción NO puede revertirse</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Definitivamente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}