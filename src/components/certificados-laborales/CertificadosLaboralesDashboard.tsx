/**
 * MÓDULO: CERTIFICADOS LABORALES - SOLO AUTOSERVICIO
 * - Certificados laborales solicitados únicamente por el interesado
 * - El documento se envía automáticamente al correo registrado en la plataforma
 * - Campos: Nombre, Identificación, Tipo vinculación, Fecha vinculación, Cargo, Grado, Dependencia, Salario, Fecha solicitud
 */

import { useState } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { CertificadoDetalleModal } from './CertificadoDetalleModal';
import { GenerarCertificadoModal } from './GenerarCertificadoModal';
import { CertificadoDetallePanel } from './CertificadoDetallePanel';
import React from 'react';
import { EMPLEADOS_ELEGIBLES, DATOS_LABORALES } from '../../data/empleadosElegiblesCertificados';

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
}

interface Stats {
  certificadosEmitidos: number;
  certificadosActivos: number;
  escaneosQR: number;
  solicitudesHoy: number;
}

export function CertificadosLaboralesDashboard({ onNavigate }: { onNavigate?: (vista: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cargoFilter, setCargoFilter] = useState<string>('all');
  const [tipoVinculacionFilter, setTipoVinculacionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para modales
  const [selectedCertificado, setSelectedCertificado] = useState<CertificadoLaboral | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isGenerarOpen, setIsGenerarOpen] = useState(false);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);

  // Mock data: Certificados laborales - Solo autoservicio
  // SINCRONIZADO con usuarios reales del módulo de usuarios
  // Generamos certificados para TODOS los empleados elegibles
  const mockCertificados: CertificadoLaboral[] = EMPLEADOS_ELEGIBLES
    .filter(empleado => DATOS_LABORALES[empleado.id]) // Solo empleados con datos laborales
    .map((empleado, index) => {
      const datosLaborales = DATOS_LABORALES[empleado.id];
      const fechaSolicitud = new Date(2025, 0, 8 + index); // Fechas escalonadas desde enero 8
      const fechaGeneracion = new Date(fechaSolicitud.getTime() + 90 * 60000); // +90 minutos
      
      return {
        id: `CERT-LAB-${String(index + 1).padStart(3, '0')}`,
        consecutivo: `ESAP-CERT-2025-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        certificateHash: `sha256:lab${String(index + 1).padStart(3, '0')}hash`,
        qrCode: `QR-LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        empleado: {
          nombre: `${empleado.firstName} ${empleado.lastName}`,
          documento: empleado.document,
          cargo: datosLaborales.cargo,
          dependencia: datosLaborales.dependencia,
          tipoVinculacion: datosLaborales.tipoVinculacion,
          fechaVinculacion: datosLaborales.fechaVinculacion,
          grado: datosLaborales.grado,
          salario: datosLaborales.salario,
          email: empleado.email
        },
        estado: (index % 15 === 0 ? 'revocado' : index % 10 === 0 ? 'expirado' : 'activo') as 'activo' | 'revocado' | 'expirado',
        fechaSolicitud: fechaSolicitud.toISOString(),
        fechaGeneracion: fechaGeneracion.toISOString(),
        cantidadEscaneos: Math.floor(Math.random() * 20) + 1,
        pdfUrl: `/certificados/${String(index + 1).padStart(3, '0')}-2025.pdf`
      };
    });

  const stats: Stats = {
    certificadosEmitidos: mockCertificados.length,
    certificadosActivos: mockCertificados.filter(cert => cert.estado === 'activo').length,
    escaneosQR: mockCertificados.reduce((total, cert) => total + cert.cantidadEscaneos, 0),
    solicitudesHoy: 1
  };

  // Filtros
  const filteredCertificados = mockCertificados.filter(cert => {
    const matchesSearch = 
      cert.empleado.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.empleado.documento.includes(searchQuery) ||
      cert.consecutivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.empleado.cargo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || cert.estado === statusFilter;
    const matchesCargo = cargoFilter === 'all' || cert.empleado.cargo === cargoFilter;
    const matchesTipoVinculacion = tipoVinculacionFilter === 'all' || cert.empleado.tipoVinculacion === tipoVinculacionFilter;
    
    return matchesSearch && matchesStatus && matchesCargo && matchesTipoVinculacion;
  });

  // Paginación
  const totalPages = Math.ceil(filteredCertificados.length / itemsPerPage);
  const paginatedCertificados = filteredCertificados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || cargoFilter !== 'all' || tipoVinculacionFilter !== 'all';

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
              color: '#6B7280',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
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
              e.currentTarget.style.color = '#6B7280';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
            <span>Configurar Plantilla</span>
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
                  <p className="text-lg font-bold text-gray-900">{EMPLEADOS_ELEGIBLES.length}</p>
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
                    {EMPLEADOS_ELEGIBLES.filter(emp => 
                      emp.roles.some(role => role.name === 'Docente')
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
                    {EMPLEADOS_ELEGIBLES.filter(emp => 
                      emp.roles.some(role => role.name === 'Administrativo') &&
                      !emp.roles.some(role => role.name === 'Docente')
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
        {paginatedCertificados.length > 0 ? (
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => toast.info('Descargar PDF')}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Descargar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('Ver QR')}>
                                  <QrCode className="w-4 h-4 mr-2" />
                                  Ver código QR
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('Reenviar email')}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Reenviar email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => toast.warning('Revocar certificado')}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Revocar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                  totalItems={filteredCertificados.length}
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
      />
    </div>
  );
}