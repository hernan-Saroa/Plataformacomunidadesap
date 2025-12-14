import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  GraduationCap, 
  Eye, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  ChevronDown, 
  X,
  FileText, 
  Award, 
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  UserCheck,
  Users,
  BookOpen
} from 'lucide-react';
import { PersonDetailsModalV2 } from './PersonDetailsModalV2';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';

interface Graduate {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: 'Graduado';
  programa: string;
  estado: 'Graduado';
  fechaIngreso: string;
  fechaGrado: string;
  documento: string;
  direccion: string;
  ciudad: string;
  promedio: number;
  tituloObtenido: string;
  modalidadGrado: string;
  certificateDownloads?: number;
}

// Mock data
const mockGraduates: Graduate[] = [
  {
    id: 'GRAD-001',
    nombre: 'María Fernanda',
    apellido: 'Rodríguez Sánchez',
    email: 'mf.rodriguez@esap.edu.co',
    telefono: '+57 300 123 4567',
    rol: 'Graduado',
    programa: 'Administración Pública',
    estado: 'Graduado',
    fechaIngreso: '2021-02-01',
    fechaGrado: '2024-06-15',
    documento: '1052789456',
    direccion: 'Calle 45 #23-67',
    ciudad: 'Bogotá',
    promedio: 4.7,
    tituloObtenido: 'Profesional en Administración Pública',
    modalidadGrado: 'Trabajo de Grado',
    certificateDownloads: 12
  },
  {
    id: 'GRAD-002',
    nombre: 'Carlos Andrés',
    apellido: 'Mendoza Pérez',
    email: 'ca.mendoza@esap.edu.co',
    telefono: '+57 310 987 6543',
    rol: 'Graduado',
    programa: 'Ciencia Política',
    estado: 'Graduado',
    fechaIngreso: '2020-08-01',
    fechaGrado: '2024-05-20',
    documento: '1098765432',
    direccion: 'Carrera 12 #45-78',
    ciudad: 'Medellín',
    promedio: 4.5,
    tituloObtenido: 'Profesional en Ciencia Política',
    modalidadGrado: 'Práctica Profesional',
    certificateDownloads: 8
  },
  {
    id: 'GRAD-003',
    nombre: 'Ana Cristina',
    apellido: 'García López',
    email: 'ac.garcia@esap.edu.co',
    telefono: '+57 320 456 7890',
    rol: 'Graduado',
    programa: 'Gestión Pública',
    estado: 'Graduado',
    fechaIngreso: '2021-01-15',
    fechaGrado: '2024-07-10',
    documento: '1034567890',
    direccion: 'Avenida 15 #89-23',
    ciudad: 'Cali',
    promedio: 4.8,
    tituloObtenido: 'Profesional en Gestión Pública',
    modalidadGrado: 'Monografía',
    certificateDownloads: 15
  },
  {
    id: 'GRAD-004',
    nombre: 'Luis Fernando',
    apellido: 'Torres Ramírez',
    email: 'lf.torres@esap.edu.co',
    telefono: '+57 315 234 5678',
    rol: 'Graduado',
    programa: 'Derecho Público',
    estado: 'Graduado',
    fechaIngreso: '2020-02-01',
    fechaGrado: '2024-01-20',
    documento: '1078901234',
    direccion: 'Calle 78 #12-34',
    ciudad: 'Barranquilla',
    promedio: 4.6,
    tituloObtenido: 'Profesional en Derecho Público',
    modalidadGrado: 'Trabajo de Grado',
    certificateDownloads: 10
  },
  {
    id: 'GRAD-005',
    nombre: 'Diana Carolina',
    apellido: 'Martínez Silva',
    email: 'dc.martinez@esap.edu.co',
    telefono: '+57 318 765 4321',
    rol: 'Graduado',
    programa: 'Economía Pública',
    estado: 'Graduado',
    fechaIngreso: '2021-08-01',
    fechaGrado: '2024-08-15',
    documento: '1045678901',
    direccion: 'Carrera 25 #67-89',
    ciudad: 'Cartagena',
    promedio: 4.9,
    tituloObtenido: 'Profesional en Economía Pública',
    modalidadGrado: 'Investigación',
    certificateDownloads: 20
  }
];

export function GraduateVerificationModulePremium() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGraduate, setSelectedGraduate] = useState<Graduate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterModalidad, setFilterModalidad] = useState<string>('all');
  const [expandedGraduateId, setExpandedGraduateId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const stats = {
    totalGraduados: mockGraduates.length,
    promedioGeneral: (mockGraduates.reduce((acc, g) => acc + g.promedio, 0) / mockGraduates.length).toFixed(1),
    certificadosDescargados: mockGraduates.reduce((acc, g) => acc + (g.certificateDownloads || 0), 0),
    graduadosRecientes: mockGraduates.filter(g => {
      const gradYear = new Date(g.fechaGrado).getFullYear();
      return gradYear === 2024;
    }).length
  };

  // Programas únicos
  const programs = Array.from(new Set(mockGraduates.map(g => g.programa)));
  
  // Años únicos
  const years = Array.from(new Set(mockGraduates.map(g => new Date(g.fechaGrado).getFullYear()))).sort((a, b) => b - a);

  // Modalidades únicas
  const modalidades = Array.from(new Set(mockGraduates.map(g => g.modalidadGrado)));

  // Filtrado
  const filteredGraduates = mockGraduates.filter(graduate => {
    const matchesSearch = searchQuery === '' || 
      graduate.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      graduate.apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      graduate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      graduate.documento.includes(searchQuery);
    
    const matchesProgram = filterProgram === 'all' || graduate.programa === filterProgram;
    
    const matchesYear = filterYear === 'all' || new Date(graduate.fechaGrado).getFullYear().toString() === filterYear;
    
    const matchesModalidad = filterModalidad === 'all' || graduate.modalidadGrado === filterModalidad;
    
    return matchesSearch && matchesProgram && matchesYear && matchesModalidad;
  });

  // Paginación
  const totalPages = Math.ceil(filteredGraduates.length / itemsPerPage);
  const paginatedGraduates = filteredGraduates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewDetails = (graduate: Graduate) => {
    setSelectedGraduate(graduate);
    setShowDetailsModal(true);
  };

  const handleDownloadCertificate = (graduate: Graduate) => {
    toast.success('Certificado Generado', {
      description: `Descargando certificado de ${graduate.nombre} ${graduate.apellido}`
    });
  };

  const handleExportGraduates = () => {
    toast.info('Exportando graduados', {
      description: 'Descargando archivo Excel con información de graduados...'
    });
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const getPromedioColor = (promedio: number) => {
    if (promedio >= 4.5) return 'text-green-600 bg-green-100';
    if (promedio >= 4.0) return 'text-blue-600 bg-blue-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterProgram('all');
    setFilterYear('all');
    setFilterModalidad('all');
  };

  const hasActiveFilters = searchQuery || filterProgram !== 'all' || filterYear !== 'all' || filterModalidad !== 'all';

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
          <h1 className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-[--esap-gray-900] tracking-tight">
            Graduados
          </h1>
          <p className="text-xs lg:text-[11px] xl:text-xs text-[--esap-gray-600]">
            Gestión y verificación de graduados de ESAP
          </p>
        </div>

        <button
          onClick={handleExportGraduates}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm">Exportar</span>
        </button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Graduados */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">{stats.totalGraduados}</p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">Total Graduados</p>
          </motion.div>

          {/* Promedio General */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
                <Award className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">{stats.promedioGeneral}</p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">Promedio General</p>
          </motion.div>

          {/* Certificados */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 flex-shrink-0">
                <FileText className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">{stats.certificadosDescargados}</p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">Certificados</p>
          </motion.div>

          {/* Graduados 2024 */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">{stats.graduadosRecientes}</p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">Graduados 2024</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o documento..."
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

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {/* Filtro por Programa */}
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los programas</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>

            {/* Filtro por Año */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los años</option>
              {years.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>

            {/* Filtro por Modalidad */}
            <select
              value={filterModalidad}
              onChange={(e) => setFilterModalidad(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las modalidades</option>
              {modalidades.map(modalidad => (
                <option key={modalidad} value={modalidad}>{modalidad}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros activos */}
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
            {filterProgram !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Programa: {filterProgram}
                <button onClick={() => setFilterProgram('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterYear !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Año: {filterYear}
                <button onClick={() => setFilterYear('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterModalidad !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Modalidad: {filterModalidad}
                <button onClick={() => setFilterModalidad('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
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

      {/* Tabla Premium de Graduados - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          {/* Header de Tabla */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg">Lista de Graduados</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mostrando {paginatedGraduates.length} de {filteredGraduates.length} graduados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Total: {filteredGraduates.length}
                </Badge>
              </div>
            </div>
          </div>

          {/* Vista Desktop - Tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Graduado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Programa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Fecha Grado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Promedio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Modalidad
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <AnimatePresence mode="popLayout">
                  {paginatedGraduates.map((graduate, index) => (
                    <React.Fragment key={`graduate-fragment-${graduate.id}`}>
                      <motion.tr
                        key={`graduate-row-${graduate.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedGraduateId(expandedGraduateId === graduate.id ? null : graduate.id)}
                      >
                        {/* Graduado */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border-2 border-gray-200">
                              <AvatarFallback className="bg-gradient-to-br from-[#003DA5] to-[#0052cc] text-white font-bold text-sm">
                                {getInitials(graduate.nombre, graduate.apellido)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                                {graduate.nombre} {graduate.apellido}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                CC {graduate.documento}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Programa */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900 font-medium">
                              {graduate.programa}
                            </span>
                          </div>
                        </td>

                        {/* Fecha Grado */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {new Date(graduate.fechaGrado).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Promedio */}
                        <td className="px-6 py-4">
                          <Badge className={`${getPromedioColor(graduate.promedio)} font-bold`}>
                            {graduate.promedio.toFixed(1)}
                          </Badge>
                        </td>

                        {/* Modalidad */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{graduate.modalidadGrado}</span>
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewDetails(graduate)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Perfil Completo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadCertificate(graduate)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Descargar Certificado
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Ver Documentos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={() => setExpandedGraduateId(expandedGraduateId === graduate.id ? null : graduate.id)}
                              className="p-2 hover:bg-[#003DA5] hover:text-white rounded-lg transition-all"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedGraduateId === graduate.id ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Detalle Expandido */}
                      <AnimatePresence>
                        {expandedGraduateId === graduate.id && (
                          <motion.tr
                            key={`${graduate.id}-expanded`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={6} className="px-0 py-0">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-b-2 border-[#003DA5]/20 p-6">
                                  <div className="grid md:grid-cols-3 gap-4">
                                    {/* Información Personal */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                      <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[#003DA5]" />
                                        Información Personal
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-xs">
                                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                                          <span className="text-gray-900">{graduate.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                                          <span className="text-gray-900">{graduate.telefono}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                          <span className="text-gray-900">{graduate.ciudad}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Información Académica */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                      <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-[#003DA5]" />
                                        Información Académica
                                      </h4>
                                      <div className="space-y-2 text-xs">
                                        <div>
                                          <span className="text-gray-600">Título:</span>
                                          <p className="text-gray-900 font-medium">{graduate.tituloObtenido}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Modalidad:</span>
                                          <p className="text-gray-900 font-medium">{graduate.modalidadGrado}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Ingreso:</span>
                                          <p className="text-gray-900 font-medium">
                                            {new Date(graduate.fechaIngreso).toLocaleDateString('es-CO')}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                      <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-[#003DA5]" />
                                        Estadísticas
                                      </h4>
                                      <div className="space-y-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                          <span className="text-xs text-gray-600">Certificados descargados</span>
                                          <p className="text-xl font-black text-[#003DA5]">
                                            {graduate.certificateDownloads || 0}
                                          </p>
                                        </div>
                                        <button 
                                          onClick={() => handleDownloadCertificate(graduate)}
                                          className="w-full py-2 bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2"
                                        >
                                          <Download className="w-4 h-4" />
                                          Descargar Certificado
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {paginatedGraduates.map((graduate, index) => (
                <motion.div
                  key={graduate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-12 h-12 border-2 border-gray-200 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#003DA5] to-[#0052cc] text-white font-bold">
                        {getInitials(graduate.nombre, graduate.apellido)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {graduate.nombre} {graduate.apellido}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">CC {graduate.documento}</p>
                      <div className="mt-2">
                        <Badge className={`${getPromedioColor(graduate.promedio)} font-bold text-xs`}>
                          Promedio: {graduate.promedio.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(graduate)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadCertificate(graduate)}>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Certificado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-900 font-medium">{graduate.programa}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">
                        Graduado: {new Date(graduate.fechaGrado).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredGraduates.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No se encontraron graduados</h3>
              <p className="text-sm text-gray-600 mb-6">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay graduados registrados en el sistema'}
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

          {/* Paginación Premium */}
          {filteredGraduates.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredGraduates.length}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal de Detalles */}
      {showDetailsModal && selectedGraduate && (
        <PersonDetailsModalV2
          person={{
            ...selectedGraduate,
            imageUrl: undefined,
            tipo: 'Graduado'
          }}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}