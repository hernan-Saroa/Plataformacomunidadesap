/**
 * MÓDULO: CERTIFICADOS LABORALES - SOLO AUTOSERVICIO
 * - Certificados laborales solicitados únicamente por el interesado
 * - El documento se envía automáticamente al correo registrado en la plataforma
 * - Campos: Nombre, Identificación, Tipo vinculación, Fecha vinculación, Cargo, Grado, Dependencia, Salario, Fecha solicitud
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Download,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  QrCode,
  MoreVertical,
  RefreshCw,
  Briefcase,
  Settings,
  Mail
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';

import { PaginationPremium } from '../shared/PaginationPremium';
import { CertificadoDetalleModal } from './CertificadoDetalleModal';
import { GenerarCertificadoModal } from './GenerarCertificadoModal';
import { CertificadoDetallePanel } from './CertificadoDetallePanel';
import React from 'react';
import { EMPLEADOS_ELEGIBLES, DATOS_LABORALES } from '../../data/empleadosElegiblesCertificados';
import { certificadosService } from '../../services/api/certificados.service';

// Tipo de certificado laboral - Solo autoservicio
interface CertificadoLaboral {
  id: string;
  consecutivo: string;
  certificateHash: string;
  qrCode: string;
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
    salario: number;
    email: string; // Email donde se envía el certificado
  };
  estado: 'activo' | 'revocado' | 'expirado';
  fechaSolicitud: string;
  fechaGeneracion: string;
  cantidadEscaneos: number;
  pdfUrl?: string;
  firmante?: {
    nombre: string;
    cargo: string;
    dependencia: string;
  };
}

interface Stats {
  certificadosEmitidos: number;
  certificadosActivos: number;
  escaneosQR: number;
  solicitudesHoy: number;
}

interface CertificadosLaboralesDashboardProps {
  onNavigate?: (vista: string) => void;
  canManageTemplates?: boolean;
}

export function CertificadosLaboralesDashboard({ onNavigate, canManageTemplates = false }: CertificadosLaboralesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cargoFilter, setCargoFilter] = useState<string>('all');
  const [tipoVinculacionFilter, setTipoVinculacionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<Stats>({
    certificadosEmitidos: 0,
    certificadosActivos: 0,
    escaneosQR: 0,
    solicitudesHoy: 0,
  });

  // Estados para modales
  const [selectedCertificado, setSelectedCertificado] = useState<CertificadoLaboral | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isGenerarOpen, setIsGenerarOpen] = useState(false);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);

  // Estado para certificados y loading
  const [certificados, setCertificados] = useState<CertificadoLaboral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Función para cargar certificados (extraída para poder llamarla desde múltiples lugares)
  const fetchCertificados = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('🔄 Cargando certificados desde el backend...');
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (cargoFilter !== 'all') {
        params.cargo = cargoFilter;
      }
      if (tipoVinculacionFilter !== 'all') {
        params.tipoVinculacion = tipoVinculacionFilter;
      }

      const response = await certificadosService.laborales.listar(params);
      const items = Array.isArray(response) ? response : (response.items || []);
      const total = Array.isArray(response) ? items.length : (response.total || 0);
      const serverStats = Array.isArray(response) ? null : response.stats;
      console.log(`✅ Se cargaron ${items.length} certificados`);

      // Transformar datos del backend al formato del componente
      const certificadosTransformados: CertificadoLaboral[] = items.map((cert: any) => ({
        id: cert.id,
        consecutivo: cert.certificate_number,
        certificateHash: cert.verification_code,
        qrCode: cert.verification_code,
        empleado: {
          nombre: cert.full_name,
          documento: cert.id_number,
          cargo: cert.position_category,
          dependencia: cert.department || '',
          tipoVinculacion: cert.career_category,
          fechaVinculacion: cert.hiring_date,
          grado: cert.position_location || '',
          salario: Number(cert.monthly_salary),
          email: 'email@esap.edu.co' // TODO: Obtener email real
        },
        estado: cert.status === 'VALID' ? 'activo' : cert.status === 'REVOKED' ? 'revocado' : 'expirado',
        fechaSolicitud: cert.created_at,
        fechaGeneracion: cert.issuance_timestamp,
        cantidadEscaneos: cert.validation_count || 0,
        pdfUrl: cert.pdf_url,
        firmante: {
          nombre: cert.signer_name,
          cargo: cert.signer_position,
          dependencia: cert.signer_department
        }
      }));

      console.log('📊 Contador de validaciones por certificado:',
        certificadosTransformados.map(c => ({
          consecutivo: c.consecutivo,
          validaciones: c.cantidadEscaneos
        }))
      );

      setCertificados(certificadosTransformados);
      setTotalItems(total);
      setStats({
        certificadosEmitidos: serverStats?.totalEmitidos ?? total,
        certificadosActivos: serverStats?.certificadosActivos ?? certificadosTransformados.filter(cert => cert.estado === 'activo').length,
        escaneosQR: serverStats?.escaneosQR ?? certificadosTransformados.reduce((sum, cert) => sum + cert.cantidadEscaneos, 0),
        solicitudesHoy: serverStats?.solicitudesHoy ?? 1,
      });

      if (showRefreshToast) {
        toast.success('Datos actualizados', {
          description: `Se actualizaron ${certificadosTransformados.length} certificados`
        });
      }
    } catch (err: any) {
      console.error('❌ Error al cargar certificados:', err);
      setError(err.message || 'Error al cargar los certificados');
      toast.error('Error al cargar los certificados');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar certificados al cambiar filtros/paginacion
  useEffect(() => {
    fetchCertificados();
  }, [currentPage, searchQuery, statusFilter, cargoFilter, tipoVinculacionFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, cargoFilter, tipoVinculacionFilter]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCertificados = certificados;

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || cargoFilter !== 'all' || tipoVinculacionFilter !== 'all';
  const puedeConfigurarPlantilla = Boolean(canManageTemplates);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCargoFilter('all');
    setTipoVinculacionFilter('all');
  };

  const handleVerDetalle = (cert: CertificadoLaboral) => {
    // Toggle panel desplegable
    if (expandedCertId === cert.id) {
      setExpandedCertId(null);
    } else {
      setExpandedCertId(cert.id);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activo: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo' },
      revocado: { bg: 'bg-red-100', text: 'text-red-800', label: 'Revocado' },
      expirado: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirado' }
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.activo;
    return (
      <Badge variant="outline" className={`${estilo.bg} ${estilo.text} border-0 text-xs px-2 py-0.5`}>
        {estilo.label}
      </Badge>
    );
  };

  return (
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
              <Briefcase className="w-6 h-6 text-white" strokeWidth={2.5} />
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
              Certificados Laborales
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
            Gestión de certificados laborales solicitados por los empleados. El documento se envía automáticamente al correo registrado en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('validar-qr')}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: '#6B7280',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ECFDF5';
              e.currentTarget.style.borderColor = '#10B981';
              e.currentTarget.style.color = '#10B981';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.color = '#6B7280';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <QrCode className="w-5 h-5" strokeWidth={2} />
            <span>Validar Certificado</span>
          </button>

          <button
            onClick={() => onNavigate?.('configuracion-plantilla')}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: puedeConfigurarPlantilla ? '#6B7280' : '#9CA3AF',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: puedeConfigurarPlantilla ? 1 : 0.9
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F9FAFB';
              e.currentTarget.style.borderColor = '#003DA5';
              e.currentTarget.style.color = '#003DA5';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.color = puedeConfigurarPlantilla ? '#6B7280' : '#9CA3AF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
            <span>{puedeConfigurarPlantilla ? 'Configurar Plantilla' : 'Ver Plantilla'}</span>
          </button>
          
          <button
            onClick={() => fetchCertificados(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: '#10B981',
              border: '2px solid #10B981',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.background = '#F0FDF4';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <RefreshCw className="w-5 h-5" strokeWidth={2} />
            </motion.div>
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          <button
            onClick={() => setIsGenerarOpen(true)}
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
      </motion.div>

      {/* Banner Autoservicio */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#EFF6FF] border-2 border-[#93C5FD] rounded-xl p-5"
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#DBEAFE' }}
          >
            <Mail className="w-5 h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 
              className="font-bold mb-1"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#1E3A8A'
              }}
            >
              📧 Certificados por Autoservicio
            </h3>
            <p 
              className="font-normal text-sm mb-2"
              style={{ color: '#1E3A8A', lineHeight: '20px' }}
            >
              Los certificados laborales solo pueden ser solicitados por el interesado a través del portal de autoservicio. Una vez generado, el documento PDF se envía automáticamente al correo electrónico registrado en la plataforma.
            </p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Empleados Elegibles</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading ? '...' : certificados.length}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-blue-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Docentes Activos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading ? '...' : certificados.filter(cert =>
                      cert.empleado.cargo.toLowerCase().includes('docente')
                    ).length}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-blue-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Administrativos Activos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading ? '...' : certificados.filter(cert =>
                      !cert.empleado.cargo.toLowerCase().includes('docente')
                    ).length}
                  </p>
                </div>
              </div>
            </div>
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
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Buscar por empleado, documento, certificado o cargo..."
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-2 rounded-lg transition-all px-4 py-2"
            style={{
              fontSize: '14px',
              color: '#1F2937',
              borderColor: '#D1D5DB',
              minWidth: '180px',
              height: '44px',
              outline: 'none'
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="revocado">Revocado</option>
            <option value="expirado">Expirado</option>
          </select>

          {/* Filtro Cargo */}
          <select
            value={cargoFilter}
            onChange={(e) => setCargoFilter(e.target.value)}
            className="border-2 rounded-lg transition-all px-4 py-2"
            style={{
              fontSize: '14px',
              color: '#1F2937',
              borderColor: '#D1D5DB',
              minWidth: '180px',
              height: '44px',
              outline: 'none'
            }}
          >
            <option value="all">Todos los cargos</option>
            <option value="Docente Tiempo Completo">Docente Tiempo Completo</option>
            <option value="Coordinador GIT">Coordinador GIT</option>
            <option value="Asistente Administrativo">Asistente Administrativo</option>
          </select>

          {/* Filtro Tipo Vinculación */}
          <select
            value={tipoVinculacionFilter}
            onChange={(e) => setTipoVinculacionFilter(e.target.value)}
            className="border-2 rounded-lg transition-all px-4 py-2"
            style={{
              fontSize: '14px',
              color: '#1F2937',
              borderColor: '#D1D5DB',
              minWidth: '180px',
              height: '44px',
              outline: 'none'
            }}
          >
            <option value="all">Todos los tipos de vinculación</option>
            <option value="Docente Tiempo Completo">Docente Tiempo Completo</option>
            <option value="Coordinador GIT - Planta">Coordinador GIT - Planta</option>
            <option value="Contrato de Prestación de Servicios">Contrato de Prestación de Servicios</option>
          </select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {searchQuery && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Búsqueda: {searchQuery}
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Estado: {statusFilter}
              </Badge>
            )}
            {cargoFilter !== 'all' && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Cargo: {cargoFilter}
              </Badge>
            )}
            {tipoVinculacionFilter !== 'all' && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Tipo Vinculación: {tipoVinculacionFilter}
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-[#003DA5] hover:underline ml-2"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla de Certificados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        {isLoading ? (
          <div className="text-center py-16 px-6">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cargando certificados...
            </h3>
            <p className="text-sm text-gray-600">
              Por favor espera un momento
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-6">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error al cargar certificados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002873] transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : paginatedCertificados.length > 0 ? (
          <>
            {/* Tabla con estructura HTML tradicional para mejor alineación */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        ESTADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        N° CERTIFICADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        EMPLEADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        CARGO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        IDENTIFICACIÓN
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        TIPO VINCULACIÓN
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        DEPENDENCIA
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        GRADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        FECHA SOLICITUD
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        ACCIONES
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCertificados.map((cert) => (
                    <React.Fragment key={cert.id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleVerDetalle(cert)}
                      >
                        {/* Estado */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getEstadoBadge(cert.estado)}
                        </td>

                        {/* N° Certificado */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {cert.consecutivo}
                          </p>
                        </td>

                        {/* Empleado */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-[#003DA5] text-white flex-shrink-0">
                              <AvatarFallback className="bg-[#003DA5] text-white">
                                {cert.empleado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{cert.empleado.nombre}</p>
                              <p className="text-xs text-blue-600 flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                {cert.empleado.email.split('@')[0]}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cargo */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900 font-medium">
                            {cert.empleado.cargo}
                          </p>
                        </td>

                        {/* Identificación */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{cert.empleado.documento}</p>
                        </td>

                        {/* Tipo Vinculación */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">
                            {cert.empleado.tipoVinculacion}
                          </p>
                        </td>

                        {/* Dependencia */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">{cert.empleado.dependencia}</p>
                        </td>

                        {/* Grado */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{cert.empleado.grado}</p>
                        </td>

                        {/* Fecha Solicitud */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {new Date(cert.fechaSolicitud).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(cert.fechaSolicitud).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerDetalle(cert);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-2 rounded-lg text-gray-400 cursor-not-allowed"
                              title="Acciones deshabilitadas temporalmente"
                              disabled
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                          </div>
                        </td>
                      </tr>

                      {/* Panel Desplegable - debajo de la fila */}
                      {expandedCertId === cert.id && (
                        <tr>
                          <td colSpan={10} className="p-0 bg-gray-50">
                            <CertificadoDetallePanel
                              certificado={cert}
                              isOpen={true}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <PaginationPremium
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-6">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron certificados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay certificados laborales en el sistema'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002873] transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Modales */}
      {selectedCertificado && (
        <CertificadoDetalleModal
          certificado={selectedCertificado}
          isOpen={isDetalleOpen}
          onClose={() => {
            setIsDetalleOpen(false);
            setSelectedCertificado(null);
          }}
        />
      )}

      <GenerarCertificadoModal
        isOpen={isGenerarOpen}
        onClose={() => setIsGenerarOpen(false)}
        onSuccess={(nuevoCert) => {
          toast.success('Certificado generado exitosamente');
          setIsGenerarOpen(false);
        }}
        certificados={certificados}
      />
    </div>
  );
}
