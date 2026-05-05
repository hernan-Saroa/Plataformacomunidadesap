import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Eye,
  CheckCircle,
  Filter,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  TrendingUp,
  Calendar,
  Mail,
  X,
  ChevronDown
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@esap-mfe/shared-ui/dropdown-menu';
import { toast } from 'sonner';
import { PaginationPremium } from '../shared/PaginationPremium';
import { CreateJobOfferModal } from './CreateJobOfferModal';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ✅ DÍA 5: ResponsiveHeader para headers adaptativos
import { ResponsiveHeader } from '@/components/ui';

type JobStatus = 'active' | 'paused' | 'closed' | 'draft';
type ContractType = 'Tiempo Completo' | 'Medio Tiempo' | 'Por Proyecto' | 'Práctica';

interface JobOffer {
  id: number;
  title: string;
  company: string;
  location: string;
  locationType: 'Presencial' | 'Remoto' | 'Híbrido';
  contractType: ContractType;
  salary: string;
  category: string;
  tags: string[];
  status: JobStatus;
  postedDate: string;
  deadline: string;
  description: string;
  applicationsCount: number;
  viewsCount: number;
  contactEmail: string;
  sedeESAP?: string; // ✅ NUEVO: Sede ESAP que publica la oferta
}

// Mock data
const mockJobs: JobOffer[] = [
  {
    id: 1,
    title: 'Analista de Políticas Públicas',
    company: 'Ministerio del Interior',
    location: 'Bogotá',
    locationType: 'Híbrido',
    contractType: 'Tiempo Completo',
    salary: '$4.500.000 - $6.000.000',
    category: 'Administración Pública',
    tags: ['Políticas Públicas', 'Análisis', 'Gobierno'],
    status: 'active',
    postedDate: '2024-11-20',
    deadline: '2024-12-15',
    description: 'Buscamos profesional para análisis de políticas públicas...',
    applicationsCount: 45,
    viewsCount: 320,
    contactEmail: 'rrhh@mininterior.gov.co'
  },
  {
    id: 2,
    title: 'Coordinador de Proyectos Sociales',
    company: 'Departamento de Planeación',
    location: 'Medellín',
    locationType: 'Presencial',
    contractType: 'Tiempo Completo',
    salary: '$5.000.000 - $7.000.000',
    category: 'Gestión Social',
    tags: ['Proyectos', 'Social', 'Coordinación'],
    status: 'active',
    postedDate: '2024-11-18',
    deadline: '2024-12-10',
    description: 'Coordinador para proyectos de desarrollo social...',
    applicationsCount: 38,
    viewsCount: 280,
    contactEmail: 'proyectos@planeacion.gov.co'
  },
  {
    id: 3,
    title: 'Asesor en Gestión Territorial',
    company: 'Gobernación de Antioquia',
    location: 'Medellín',
    locationType: 'Presencial',
    contractType: 'Por Proyecto',
    salary: '$4.000.000 - $5.500.000',
    category: 'Gestión Territorial',
    tags: ['Territorial', 'Asesoría', 'Gobierno'],
    status: 'active',
    postedDate: '2024-11-15',
    deadline: '2024-12-05',
    description: 'Asesor en gestión territorial para la gobernación...',
    applicationsCount: 28,
    viewsCount: 195,
    contactEmail: 'talento@antioquia.gov.co'
  },
  {
    id: 4,
    title: 'Practicante de Administración Pública',
    company: 'Alcaldía de Bogotá',
    location: 'Bogotá',
    locationType: 'Presencial',
    contractType: 'Práctica',
    salary: '$1.500.000',
    category: 'Prácticas',
    tags: ['Práctica', 'Estudiantes', 'Administración'],
    status: 'active',
    postedDate: '2024-11-22',
    deadline: '2024-12-20',
    description: 'Práctica profesional en administración pública...',
    applicationsCount: 67,
    viewsCount: 450,
    contactEmail: 'practicas@bogota.gov.co'
  },
  {
    id: 5,
    title: 'Consultor en Derecho Público',
    company: 'Contraloría General',
    location: 'Bogotá',
    locationType: 'Remoto',
    contractType: 'Por Proyecto',
    salary: '$6.000.000 - $8.000.000',
    category: 'Derecho Público',
    tags: ['Consultoría', 'Derecho', 'Público'],
    status: 'paused',
    postedDate: '2024-11-10',
    deadline: '2024-11-30',
    description: 'Consultor especializado en derecho público...',
    applicationsCount: 22,
    viewsCount: 180,
    contactEmail: 'consultoria@contraloria.gov.co'
  }
];

export function JobBoardManagementModulePremium() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [sedeESAPFilter, setSedeESAPFilter] = useState<string>('all'); // ✅ NUEVO: Filtro por sede ESAP
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const itemsPerPage = 10;

  // Stats
  const stats = {
    totalJobs: mockJobs.length,
    activeJobs: mockJobs.filter(j => j.status === 'active').length,
    totalApplications: mockJobs.reduce((acc, j) => acc + j.applicationsCount, 0),
    totalViews: mockJobs.reduce((acc, j) => acc + j.viewsCount, 0)
  };

  // Filtros únicos
  const locations = Array.from(new Set(mockJobs.map(j => j.location)));
  const contractTypes = Array.from(new Set(mockJobs.map(j => j.contractType)));
  const sedeESAPs = Array.from(new Set(mockJobs.map(j => j.sedeESAP).filter(sede => sede !== undefined)));

  // Filtrado
  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || job.location === locationFilter;
    const matchesContract = contractFilter === 'all' || job.contractType === contractFilter;
    const matchesSedeESAP = sedeESAPFilter === 'all' || job.sedeESAP === sedeESAPFilter;
    
    return matchesSearch && matchesStatus && matchesLocation && matchesContract && matchesSedeESAP;
  });

  // Paginación
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: JobStatus) => {
    const statusConfig = {
      active: { label: 'Activa', className: 'bg-green-100 text-green-700 border-green-300' },
      paused: { label: 'Pausada', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      closed: { label: 'Cerrada', className: 'bg-gray-100 text-gray-700 border-gray-300' },
      draft: { label: 'Borrador', className: 'bg-blue-100 text-blue-700 border-blue-300' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.className} hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {config.label}
        </div>
      </Badge>
    );
  };

  const getLocationTypeBadge = (type: string) => {
    const typeConfig: Record<string, string> = {
      'Presencial': 'bg-blue-100 text-blue-700',
      'Remoto': 'bg-purple-100 text-purple-700',
      'Híbrido': 'bg-indigo-100 text-indigo-700'
    };
    return <Badge className={typeConfig[type] || 'bg-gray-100 text-gray-700'}>{type}</Badge>;
  };

  const handleEdit = (job: JobOffer) => {
    toast.info('Editar Oferta', { description: `Editando: ${job.title}` });
  };

  const handleDelete = (job: JobOffer) => {
    toast.success('Oferta Eliminada', { description: `Se eliminó: ${job.title}` });
  };

  const handleViewApplications = (job: JobOffer) => {
    toast.info('Ver Aplicaciones', { description: `${job.applicationsCount} aplicaciones` });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLocationFilter('all');
    setContractFilter('all');
    setSedeESAPFilter('all'); // ✅ NUEVO: Limpiar filtro por sede ESAP
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || locationFilter !== 'all' || contractFilter !== 'all' || sedeESAPFilter !== 'all'; // ✅ NUEVO: Incluir filtro por sede ESAP

  return (
    <Container4K className="space-y-6">
      {/* Header */}
      <ResponsiveHeader
        title="Bolsa de Empleo"
        subtitle="Gestiona ofertas laborales para graduados y estudiantes ESAP"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">Crear Oferta</span>
          </button>
        }
      />

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título, empresa o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="paused">Pausadas</option>
              <option value="closed">Cerradas</option>
              <option value="draft">Borradores</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las ubicaciones</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los contratos</option>
              {contractTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={sedeESAPFilter}
              onChange={(e) => setSedeESAPFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las sedes ESAP</option>
              {sedeESAPs.map(sede => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Filtros activos:</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Estado: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Ubicación: {locationFilter}
                <button onClick={() => setLocationFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {contractFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Contrato: {contractFilter}
                <button onClick={() => setContractFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {sedeESAPFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Sede ESAP: {sedeESAPFilter}
                <button onClick={() => setSedeESAPFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#003DA5] hover:underline ml-auto"
            >
              Limpiar todos
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg">Ofertas Laborales</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mostrando {paginatedJobs.length} de {filteredJobs.length} ofertas
                </p>
              </div>
              <Badge variant="outline" className="font-semibold">
                Total: {filteredJobs.length}
              </Badge>
            </div>
          </div>

          {/* Vista Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Oferta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Salario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <AnimatePresence mode="popLayout">
                  {paginatedJobs.map((job, index) => (
                    <React.Fragment key={job.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                              {job.title}
                            </p>
                            <p className="text-xs text-gray-500">{job.category}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{job.company}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {job.location}
                            </div>
                            {getLocationTypeBadge(job.locationType)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{job.salary}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {getStatusBadge(job.status)}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Users className="w-3.5 h-3.5" />
                              {job.applicationsCount}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewApplications(job)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  Ver Aplicaciones
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(job)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Oferta
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(job)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar Oferta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                              className="p-2 hover:bg-[#003DA5] hover:text-white rounded-lg transition-all"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedJobId === job.id ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {expandedJobId === job.id && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={6} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-b-2 border-[#003DA5]/20 p-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3">Información</h4>
                                    <div className="space-y-2 text-sm">
                                      <p className="text-gray-700">{job.description}</p>
                                      <div className="flex items-center gap-2 pt-2 text-xs text-gray-600">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Publicado: {new Date(job.postedDate).toLocaleDateString('es-CO')}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Cierre: {new Date(job.deadline).toLocaleDateString('es-CO')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3">Contacto</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-900">{job.contactEmail}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 pt-2">
                                        {job.tags.map((tag) => (
                                          <Badge key={`${job.id}-${tag}`} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {paginatedJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm">{job.title}</h3>
                      <p className="text-xs text-gray-500">{job.company}</p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {job.applicationsCount}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {getLocationTypeBadge(job.locationType)}
                    <Badge variant="outline" className="text-xs">{job.contractType}</Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredJobs.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No se encontraron ofertas</h3>
              <p className="text-sm text-gray-600 mb-6">
                {hasActiveFilters ? 'Intenta ajustar los filtros' : 'Aún no hay ofertas publicadas'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors font-semibold text-sm"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          )}

          {/* Paginación */}
          {filteredJobs.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredJobs.length}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal para Crear Oferta */}
      {showCreateModal && (
        <CreateJobOfferModal onClose={() => setShowCreateModal(false)} />
      )}
    </Container4K>
  );
}