/**
 * MÓDULO: GESTIÓN DE ENROLAMIENTOS
 * Sistema completo de enrolamiento administrativo y auditoría
 * - Enrolamiento individual (1 a 1)
 * - Enrolamiento masivo (CSV/Excel)
 * - Auditoría completa
 * - Notificaciones a coordinadores
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  Upload,
  FileSpreadsheet,
  History,
  Bell,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  FileText,
  MoreVertical,
  QrCode,  // NUEVO: Icono para QR
  Building2, MapPin  // ✅ NUEVO: Para filtro de sedes
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@esap-mfe/shared-ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { CreateUserManualModal } from './CreateUserManualModal';
import { MassEnrollmentModal } from './MassEnrollmentModal';
import { EnrollmentAuditModal } from './EnrollmentAuditModal';
import { GenerateEnrollmentQRModal } from './GenerateEnrollmentQRModal';  // NUEVO: Modal de QR

// Mock data - Registros de enrolamiento
const MOCK_ENROLLMENTS = [
  {
    id: '1',
    type: 'MASIVO',
    loteCode: 'LOTE_2025_11_23_104530_045',
    fileName: 'Nuevos_Estudiantes_2025A.xlsx',
    adminName: 'María González',
    adminRole: 'Coordinador OTIC',
    date: '2025-11-23T10:45:30',
    totalRecords: 142,
    successful: 142,
    failed: 0,
    warnings: 3,
    processTime: 18,
    status: 'COMPLETADO',
    programs: {
      'Administración Pública': 85,
      'Maestría en Gobierno': 32,
      'Ciencias Políticas': 18,
      'Personal Administrativo': 7
    }
  },
  {
    id: '2',
    type: 'INDIVIDUAL',
    document: '123456789',
    userName: 'Juan Carlos García López',
    userEmail: 'juan.garcia@esap.edu.co',
    userRole: 'Estudiante Pregrado',
    program: 'Ciencias Políticas',
    sede: 'Bogotá',
    adminName: 'Carlos Méndez',
    adminRole: 'Registros Académicos',
    date: '2025-11-23T09:23:15',
    status: 'COMPLETADO',
    enrollmentMethod: 'CODIGO_CORREO'
  },
  {
    id: '3',
    type: 'MASIVO',
    loteCode: 'LOTE_2025_11_22_153020_023',
    fileName: 'Docentes_Catedra_2025.csv',
    adminName: 'Laura Díaz',
    adminRole: 'Talento Humano',
    date: '2025-11-22T15:30:20',
    totalRecords: 45,
    successful: 42,
    failed: 3,
    warnings: 5,
    processTime: 12,
    status: 'PARCIAL',
    programs: {
      'Docente Cátedra': 42
    }
  },
  {
    id: '4',
    type: 'INDIVIDUAL',
    document: '987654321',
    userName: 'María Elena Rodríguez',
    userEmail: 'maria.rodriguez@esap.edu.co',
    userRole: 'Docente Tiempo Completo',
    program: 'Administración Pública',
    sede: 'Bogotá',
    adminName: 'María González',
    adminRole: 'Coordinador OTIC',
    date: '2025-11-22T14:10:00',
    status: 'PENDIENTE',
    enrollmentMethod: 'CODIGO_CORREO'
  }
];

export function EnrollmentManagementModule() {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'notifications'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMassModal, setShowMassModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);  // NUEVO: Estado para modal QR
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all'); // ✅ NUEVO: Filtro por sede
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const stats = {
    totalEnrollments: MOCK_ENROLLMENTS.length,
    pendingEnrollments: MOCK_ENROLLMENTS.filter(e => e.status === 'PENDIENTE').length,
    completedToday: MOCK_ENROLLMENTS.filter(e => {
      const today = new Date().toDateString();
      return new Date(e.date).toDateString() === today;
    }).length,
    totalUsersEnrolled: MOCK_ENROLLMENTS.reduce((sum, e) => {
      if (e.type === 'MASIVO') return sum + (e.successful || 0);
      if (e.type === 'INDIVIDUAL') return sum + 1;
      return sum;
    }, 0)
  };

  // Filtrado
  const filteredEnrollments = MOCK_ENROLLMENTS.filter(enrollment => {
    const matchesSearch = searchQuery === '' ||
      enrollment.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (enrollment.type === 'MASIVO' && enrollment.loteCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (enrollment.type === 'INDIVIDUAL' && enrollment.document.includes(searchQuery));
    
    const matchesType = typeFilter === 'all' || enrollment.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
    const matchesSede = sedeFilter === 'all' || (enrollment.type === 'INDIVIDUAL' && enrollment.sede === sedeFilter);
    
    return matchesSearch && matchesType && matchesStatus && matchesSede;
  });

  // Paginación
  const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
  const paginatedEnrollments = filteredEnrollments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      COMPLETADO: { label: 'Completado', className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]' },
      PENDIENTE: { label: 'Pendiente', className: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]' },
      PARCIAL: { label: 'Parcial', className: 'bg-[#FFF7ED] text-[#C2410C] border-[#FB923C]' },
      FALLIDO: { label: 'Fallido', className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]' }
    };
    
    const { label, className } = config[status] || config.PENDIENTE;
    return <Badge className={`${className} border`}>{label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      INDIVIDUAL: { label: '1 a 1', className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]' },
      MASIVO: { label: 'Masivo', className: 'bg-[#F0FDF4] text-[#065F46] border-[#10B981]' }
    };
    
    const { label, className } = config[type] || config.INDIVIDUAL;
    return <Badge className={`${className} border`}>{label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
    <Toaster position="bottom-right" richColors />
    <div className="space-y-6">
      {/* Header */}
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
              <UserPlus className="w-6 h-6 text-white" strokeWidth={2.5} />
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
              Gestión de Enrolamientos
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
            Enrolamiento individual, masivo y auditoría completa del sistema
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowQRModal(true)}
            className="inline-flex items-center gap-2 transition-all"
            style={{
              background: '#10B981',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#059669';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#10B981';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <QrCode className="w-5 h-5" strokeWidth={2} />
            <span>Generar QR</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: '#003DA5',
              border: '2px solid #003DA5',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <UserPlus className="w-5 h-5" strokeWidth={2} />
            <span>Crear 1 a 1</span>
          </button>

          <button
            onClick={() => setShowMassModal(true)}
            className="inline-flex items-center gap-2 transition-all"
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
            <Upload className="w-5 h-5" strokeWidth={2} />
            <span>Carga Masiva</span>
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-1"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'overview' 
                ? 'bg-[#003DA5] text-white' 
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Registro de Enrolamientos</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'audit' 
                ? 'bg-[#003DA5] text-white' 
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="w-4 h-4" />
              <span>Auditoría</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'notifications' 
                ? 'bg-[#003DA5] text-white' 
                : 'text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              <span>Notificaciones</span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Contenido según Tab Activo */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filtros y Búsqueda */}
            <Card className="p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: '#9CA3AF' }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar por administrador, lote o documento..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border-2 rounded-lg transition-all"
                      style={{
                        paddingLeft: '48px',
                        paddingRight: '16px',
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
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm"
                    style={{ height: '44px' }}
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="INDIVIDUAL">Individual (1 a 1)</option>
                    <option value="MASIVO">Masivo</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm"
                    style={{ height: '44px' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="COMPLETADO">Completado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="FALLIDO">Fallido</option>
                  </select>

                  <select
                    value={sedeFilter}
                    onChange={(e) => setSedeFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm"
                    style={{ height: '44px' }}
                  >
                    <option value="all">Todas las sedes</option>
                    <option value="Bogotá">Bogotá</option>
                    <option value="Medellín">Medellín</option>
                    <option value="Cali">Cali</option>
                    <option value="Barranquilla">Barranquilla</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Tabla de Enrolamientos */}
            <Card className="overflow-hidden">
              <div 
                className="border-b px-6 py-4"
                style={{
                  background: '#F9FAFB',
                  borderBottom: '2px solid #E5E7EB'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 
                      className="font-bold"
                      style={{
                        fontSize: '18px',
                        lineHeight: '24px',
                        color: '#1F2937'
                      }}
                    >
                      Registro de Enrolamientos
                    </h2>
                    <p 
                      className="mt-0.5"
                      style={{
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280'
                      }}
                    >
                      Mostrando {paginatedEnrollments.length} de {filteredEnrollments.length} registros
                    </p>
                  </div>
                  <button
                    onClick={() => toast.info('Exportar', { description: 'Generando reporte...' })}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-all"
                  >
                    <Download className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Exportar</span>
                  </button>
                </div>
              </div>

              {/* Vista Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead 
                    style={{
                      background: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB'
                    }}
                  >
                    <tr>
                      <th className="text-left font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Tipo
                      </th>
                      <th className="text-left font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Detalle
                      </th>
                      <th className="text-left font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Responsable
                      </th>
                      <th className="text-left font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Fecha
                      </th>
                      <th className="text-left font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Estado
                      </th>
                      <th className="text-right font-semibold uppercase px-6 py-4" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ background: '#FFFFFF' }}>
                    <AnimatePresence mode="popLayout">
                      {paginatedEnrollments.map((enrollment, index) => (
                        <motion.tr
                          key={enrollment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="group"
                          style={{
                            borderBottom: '1px solid #E5E7EB',
                            transition: 'background 150ms ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                          }}
                        >
                          <td className="px-6 py-4">
                            {getTypeBadge(enrollment.type)}
                          </td>

                          <td className="px-6 py-4">
                            {enrollment.type === 'MASIVO' ? (
                              <div>
                                <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                                  {enrollment.loteCode}
                                </p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>
                                  {enrollment.fileName} • {enrollment.successful}/{enrollment.totalRecords} exitosos
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                                  {enrollment.userName}
                                </p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>
                                  {enrollment.document} • {enrollment.userRole}
                                </p>
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                                {enrollment.adminName}
                              </p>
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                {enrollment.adminRole}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#4B5563' }}>
                                {formatDate(enrollment.date)}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {getStatusBadge(enrollment.status)}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setShowAuditModal(true);
                                }}
                                className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                              >
                                <Eye className="w-4 h-4" style={{ color: '#6B7280' }} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {filteredEnrollments.length > 0 && (
                <div 
                  className="px-6 py-4"
                  style={{
                    borderTop: '1px solid #E5E7EB',
                    background: '#F9FAFB'
                  }}
                >
                  <PaginationPremium
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredEnrollments.length}
                  />
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-8 text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: '#F3F4F6' }}
              >
                <History className="w-8 h-8" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '18px', color: '#1F2937' }}>
                Auditoría Completa
              </h3>
              <p className="mb-6" style={{ fontSize: '14px', color: '#6B7280' }}>
                Registro detallado de todas las acciones administrativas
              </p>
              <button
                onClick={() => toast.info('Auditoría', { description: 'Módulo de auditoría próximamente' })}
                className="px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                Ver Registro de Auditoría
              </button>
            </Card>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-8 text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: '#F3F4F6' }}
              >
                <Bell className="w-8 h-8" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '18px', color: '#1F2937' }}>
                Centro de Notificaciones
              </h3>
              <p className="mb-6" style={{ fontSize: '14px', color: '#6B7280' }}>
                Notificaciones automáticas a coordinadores de programa
              </p>
              <button
                onClick={() => toast.info('Notificaciones', { description: 'Sistema de notificaciones próximamente' })}
                className="px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                Ver Notificaciones
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales */}
      {showCreateModal && (
        <CreateUserManualModal onClose={() => setShowCreateModal(false)} />
      )}
      
      {showMassModal && (
        <MassEnrollmentModal onClose={() => setShowMassModal(false)} />
      )}

      {showAuditModal && selectedEnrollment && (
        <EnrollmentAuditModal 
          enrollment={selectedEnrollment}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedEnrollment(null);
          }} 
        />
      )}

      {showQRModal && selectedEnrollment && (
        <GenerateEnrollmentQRModal 
          open={showQRModal}
          onOpenChange={setShowQRModal}
        />
      )}
    </div>
    </>
  );
}