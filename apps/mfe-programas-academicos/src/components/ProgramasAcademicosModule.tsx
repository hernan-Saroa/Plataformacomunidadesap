import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  Users,
  BookOpen,
  Building2,
  MapPin,
  Award,
  Calendar,
  FileText,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Container4K, ResponsiveHeader } from '@esap-mfe/shared-ui';
import { toast, Toaster } from 'sonner';
import { PaginationPremium } from './shared/PaginationPremium';
import { CreateProgramaModal } from './CreateProgramaModal';
import { PROGRAMAS_ESAP, SEDES_ESAP } from '../data/oferta-academica-esap';
import { useAuth } from '../hooks';

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos

type NivelFormacion = 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado';
type Modalidad = 'Presencial' | 'Virtual' | 'Distancia' | 'Dual';
type Estado = 'Activo' | 'Inactivo' | 'En Trámite' | 'Suspendido';
type Jornada = 'Diurna' | 'Nocturna' | 'Mixta' | 'Flexible';

interface ProgramaAcademico {
  id: number;
  codigo: string;
  nombre: string;
  nivelFormacion: NivelFormacion;
  modalidad: Modalidad;
  jornada: Jornada;
  duracionSemestres: number;
  creditos: number;
  sede: string;
  facultad: string;
  estado: Estado;
  registroCalificado: {
    numero: string;
    fechaEmision: string;
    vigencia: string;
  };
  acreditacion?: {
    tipo: 'Alta Calidad' | 'Internacional';
    vigencia: string;
  };
  descripcion: string;
  perfilEgresado: string;
  requisitosIngreso: string[];
  costoMatricula: number;
  estudiantesActivos: number;
  graduados: number;
  docentesAsignados: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

// Mock data
const mockProgramas: ProgramaAcademico[] = [
  {
    id: 1,
    codigo: 'PRE-ECO-001',
    nombre: 'Economía Pública',
    nivelFormacion: 'Pregrado',
    modalidad: 'Presencial',
    jornada: 'Diurna',
    duracionSemestres: 10,
    creditos: 160,
    sede: 'Bogotá',
    facultad: 'Facultad de Pregrado',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2022-001',
      fechaEmision: '2022-01-15',
      vigencia: '2029-01-15'
    },
    acreditacion: {
      tipo: 'Alta Calidad',
      vigencia: '2028-06-30'
    },
    descripcion: 'Programa profesional de Economía Pública enfocado en el análisis económico del sector público',
    perfilEgresado: 'Profesional capacitado en análisis económico y políticas públicas',
    requisitosIngreso: ['Título de bachiller', 'Pruebas Saber 11', 'Entrevista'],
    costoMatricula: 3800000,
    estudiantesActivos: 420,
    graduados: 980,
    docentesAsignados: 28,
    fechaCreacion: '2008-02-01',
    ultimaActualizacion: '2024-11-20'
  },
  {
    id: 2,
    codigo: 'PRE-APT-002',
    nombre: 'Administración Pública Territorial',
    nivelFormacion: 'Pregrado',
    modalidad: 'Distancia',
    jornada: 'Flexible',
    duracionSemestres: 10,
    creditos: 160,
    sede: 'Bogotá',
    facultad: 'Facultad de Pregrado',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2021-045',
      fechaEmision: '2021-06-10',
      vigencia: '2028-06-10'
    },
    descripcion: 'Programa de Administración Pública con énfasis en gestión territorial y gobiernos locales',
    perfilEgresado: 'Profesional en administración pública territorial con capacidad de gestión en entidades territoriales',
    requisitosIngreso: ['Título de bachiller', 'Pruebas Saber 11'],
    costoMatricula: 3200000,
    estudiantesActivos: 580,
    graduados: 1450,
    docentesAsignados: 32,
    fechaCreacion: '2010-08-15',
    ultimaActualizacion: '2024-10-05'
  },
  {
    id: 3,
    codigo: 'PRE-APN-003',
    nombre: 'Administración Pública - Jornada Nocturna',
    nivelFormacion: 'Pregrado',
    modalidad: 'Presencial',
    jornada: 'Nocturna',
    duracionSemestres: 10,
    creditos: 160,
    sede: 'Bogotá',
    facultad: 'Facultad de Pregrado',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2020-089',
      fechaEmision: '2020-03-20',
      vigencia: '2027-03-20'
    },
    descripcion: 'Programa profesional de Administración Pública en jornada nocturna para estudiantes que trabajan',
    perfilEgresado: 'Administrador público con competencias en gestión del Estado y políticas públicas',
    requisitosIngreso: ['Título de bachiller', 'Pruebas Saber 11'],
    costoMatricula: 3500000,
    estudiantesActivos: 350,
    graduados: 890,
    docentesAsignados: 25,
    fechaCreacion: '2012-01-10',
    ultimaActualizacion: '2024-09-12'
  },
  {
    id: 4,
    codigo: 'PRE-APD-004',
    nombre: 'Administración Pública - Jornada Diurna',
    nivelFormacion: 'Pregrado',
    modalidad: 'Presencial',
    jornada: 'Diurna',
    duracionSemestres: 10,
    creditos: 160,
    sede: 'Bogotá',
    facultad: 'Facultad de Pregrado',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2019-012',
      fechaEmision: '2019-05-08',
      vigencia: '2026-05-08'
    },
    acreditacion: {
      tipo: 'Alta Calidad',
      vigencia: '2029-12-31'
    },
    descripcion: 'Programa profesional de Administración Pública en jornada diurna con énfasis en gestión estatal',
    perfilEgresado: 'Profesional en administración pública con capacidad de liderazgo en el sector público',
    requisitosIngreso: ['Título de bachiller', 'Pruebas Saber 11', 'Entrevista'],
    costoMatricula: 3500000,
    estudiantesActivos: 520,
    graduados: 1680,
    docentesAsignados: 35,
    fechaCreacion: '2005-09-01',
    ultimaActualizacion: '2024-11-15'
  },
  {
    id: 5,
    codigo: 'MAE-DH-001',
    nombre: 'Maestría en Derechos Humanos',
    nivelFormacion: 'Maestría',
    modalidad: 'Distancia',
    jornada: 'Flexible',
    duracionSemestres: 4,
    creditos: 50,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2023-156',
      fechaEmision: '2023-11-12',
      vigencia: '2030-11-12'
    },
    acreditacion: {
      tipo: 'Alta Calidad',
      vigencia: '2029-06-30'
    },
    descripcion: 'Maestría de alta calidad en Derechos Humanos con enfoque en políticas públicas',
    perfilEgresado: 'Magíster con capacidad para diseñar e implementar políticas de derechos humanos',
    requisitosIngreso: ['Título profesional', 'Prueba de admisión', 'Proyecto de investigación'],
    costoMatricula: 11500000,
    estudiantesActivos: 95,
    graduados: 180,
    docentesAsignados: 22,
    fechaCreacion: '2015-02-20',
    ultimaActualizacion: '2024-08-30'
  },
  {
    id: 6,
    codigo: 'MAE-AP-002',
    nombre: 'Maestría en Administración Pública',
    nivelFormacion: 'Maestría',
    modalidad: 'Presencial',
    jornada: 'Nocturna',
    duracionSemestres: 4,
    creditos: 52,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2022-078',
      fechaEmision: '2022-10-01',
      vigencia: '2029-10-01'
    },
    acreditacion: {
      tipo: 'Alta Calidad',
      vigencia: '2030-12-31'
    },
    descripcion: 'Maestría en Administración Pública con énfasis en gestión y modernización del Estado',
    perfilEgresado: 'Magíster en gestión pública con capacidades investigativas y de alto nivel directivo',
    requisitosIngreso: ['Título profesional', 'Experiencia laboral 2 años', 'Prueba de admisión'],
    costoMatricula: 12000000,
    estudiantesActivos: 125,
    graduados: 340,
    docentesAsignados: 28,
    fechaCreacion: '2010-11-01',
    ultimaActualizacion: '2024-11-28'
  },
  {
    id: 7,
    codigo: 'ESP-GP-001',
    nombre: 'Especialización en Gestión Pública',
    nivelFormacion: 'Especialización',
    modalidad: 'Virtual',
    jornada: 'Flexible',
    duracionSemestres: 2,
    creditos: 30,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2023-089',
      fechaEmision: '2023-03-15',
      vigencia: '2030-03-15'
    },
    descripcion: 'Especialización virtual en Gestión Pública orientada a funcionarios del Estado',
    perfilEgresado: 'Especialista en gestión de entidades públicas con competencias gerenciales',
    requisitosIngreso: ['Título profesional', 'Experiencia en sector público'],
    costoMatricula: 8500000,
    estudiantesActivos: 180,
    graduados: 520,
    docentesAsignados: 18,
    fechaCreacion: '2016-08-10',
    ultimaActualizacion: '2024-10-20'
  },
  {
    id: 8,
    codigo: 'ESP-FP-002',
    nombre: 'Especialización en Finanzas Públicas',
    nivelFormacion: 'Especialización',
    modalidad: 'Distancia',
    jornada: 'Flexible',
    duracionSemestres: 2,
    creditos: 32,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2022-145',
      fechaEmision: '2022-07-20',
      vigencia: '2029-07-20'
    },
    descripcion: 'Especialización en gestión y administración de finanzas del sector público',
    perfilEgresado: 'Especialista en finanzas públicas con capacidad de planeación y control fiscal',
    requisitosIngreso: ['Título profesional en áreas económicas o administrativas', 'Experiencia laboral'],
    costoMatricula: 9200000,
    estudiantesActivos: 145,
    graduados: 380,
    docentesAsignados: 20,
    fechaCreacion: '2014-03-01',
    ultimaActualizacion: '2024-09-15'
  },
  {
    id: 9,
    codigo: 'ESP-GS-003',
    nombre: 'Especialización en Gerencia Social',
    nivelFormacion: 'Especialización',
    modalidad: 'Virtual',
    jornada: 'Flexible',
    duracionSemestres: 2,
    creditos: 30,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2023-067',
      fechaEmision: '2023-05-10',
      vigencia: '2030-05-10'
    },
    descripcion: 'Especialización virtual en Gerencia Social para gestión de programas sociales del Estado',
    perfilEgresado: 'Especialista en diseño y gestión de políticas y programas sociales',
    requisitosIngreso: ['Título profesional', 'Experiencia en proyectos sociales'],
    costoMatricula: 8800000,
    estudiantesActivos: 165,
    graduados: 290,
    docentesAsignados: 16,
    fechaCreacion: '2017-01-20',
    ultimaActualizacion: '2024-11-05'
  },
  {
    id: 10,
    codigo: 'ESP-PD-004',
    nombre: 'Especialización en Proyectos de Desarrollo',
    nivelFormacion: 'Especialización',
    modalidad: 'Distancia',
    jornada: 'Flexible',
    duracionSemestres: 2,
    creditos: 32,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2021-198',
      fechaEmision: '2021-09-25',
      vigencia: '2028-09-25'
    },
    descripcion: 'Especialización en formulación y gestión de proyectos de desarrollo regional y local',
    perfilEgresado: 'Especialista en formulación, evaluación y gestión de proyectos de desarrollo',
    requisitosIngreso: ['Título profesional', 'Experiencia en gestión de proyectos'],
    costoMatricula: 9000000,
    estudiantesActivos: 155,
    graduados: 410,
    docentesAsignados: 19,
    fechaCreacion: '2013-06-15',
    ultimaActualizacion: '2024-08-18'
  },
  {
    id: 11,
    codigo: 'ESP-ADE-005',
    nombre: 'Especialización en Alta Dirección del Estado',
    nivelFormacion: 'Especialización',
    modalidad: 'Presencial',
    jornada: 'Nocturna',
    duracionSemestres: 2,
    creditos: 35,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2023-023',
      fechaEmision: '2023-02-18',
      vigencia: '2030-02-18'
    },
    acreditacion: {
      tipo: 'Alta Calidad',
      vigencia: '2029-12-31'
    },
    descripcion: 'Especialización de alta calidad orientada a altos directivos del sector público',
    perfilEgresado: 'Especialista en alta gerencia pública con competencias estratégicas y de liderazgo',
    requisitosIngreso: ['Título profesional', 'Cargo directivo en sector público', 'Entrevista'],
    costoMatricula: 12500000,
    estudiantesActivos: 75,
    graduados: 185,
    docentesAsignados: 25,
    fechaCreacion: '2011-10-05',
    ultimaActualizacion: '2024-11-22'
  },
  {
    id: 12,
    codigo: 'ESP-GPDU-006',
    nombre: 'Especialización en Gestión y Planificación del Desarrollo Urbano y Regional',
    nivelFormacion: 'Especialización',
    modalidad: 'Distancia',
    jornada: 'Flexible',
    duracionSemestres: 2,
    creditos: 32,
    sede: 'Bogotá',
    facultad: 'Facultad de Postgrados',
    estado: 'Activo',
    registroCalificado: {
      numero: 'RC-2022-112',
      fechaEmision: '2022-04-30',
      vigencia: '2029-04-30'
    },
    descripcion: 'Especialización en planificación territorial y desarrollo urbano sostenible',
    perfilEgresado: 'Especialista en gestión territorial con capacidad en ordenamiento y desarrollo regional',
    requisitosIngreso: ['Título profesional en áreas afines', 'Experiencia en planeación territorial'],
    costoMatricula: 9500000,
    estudiantesActivos: 110,
    graduados: 245,
    docentesAsignados: 17,
    fechaCreacion: '2015-09-12',
    ultimaActualizacion: '2024-10-08'
  }
];

export function ProgramasAcademicosModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [nivelFilter, setNivelFilter] = useState<string>('all');
  const [modalidadFilter, setModalidadFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [expandedProgramaId, setExpandedProgramaId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [programaToEdit, setProgramaToEdit] = useState<ProgramaAcademico | null>(null);
  const itemsPerPage = 10;
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  // Stats
  const stats = {
    totalProgramas: mockProgramas.length,
    activos: mockProgramas.filter(p => p.estado === 'Activo').length,
    totalEstudiantes: mockProgramas.reduce((acc, p) => acc + p.estudiantesActivos, 0),
    totalGraduados: mockProgramas.reduce((acc, p) => acc + p.graduados, 0)
  };

  // Filtros únicos
  const niveles = Array.from(new Set(mockProgramas.map(p => p.nivelFormacion)));
  const modalidades = Array.from(new Set(mockProgramas.map(p => p.modalidad)));
  const sedes = Array.from(new Set(mockProgramas.map(p => p.sede)));

  // Filtrado
  const filteredProgramas = mockProgramas.filter(programa => {
    const matchesSearch = searchQuery === '' ||
      programa.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      programa.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      programa.facultad.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNivel = nivelFilter === 'all' || programa.nivelFormacion === nivelFilter;
    const matchesModalidad = modalidadFilter === 'all' || programa.modalidad === modalidadFilter;
    const matchesSede = sedeFilter === 'all' || programa.sede === sedeFilter;
    const matchesEstado = estadoFilter === 'all' || programa.estado === estadoFilter;
    
    return matchesSearch && matchesNivel && matchesModalidad && matchesSede && matchesEstado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProgramas.length / itemsPerPage);
  const paginatedProgramas = filteredProgramas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getEstadoBadge = (estado: Estado) => {
    const estadoConfig = {
      'Activo': { className: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      'Inactivo': { className: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle },
      'En Trámite': { className: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
      'Suspendido': { className: 'bg-red-100 text-red-700 border-red-300', icon: X }
    };
    
    const config = estadoConfig[estado];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} hover:${config.className} border`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {estado}
        </div>
      </Badge>
    );
  };

  const getNivelBadge = (nivel: NivelFormacion) => {
    const nivelColors: Record<NivelFormacion, string> = {
      'Pregrado': 'bg-blue-100 text-blue-700',
      'Especialización': 'bg-orange-100 text-orange-700',
      'Maestría': 'bg-pink-100 text-pink-700',
      'Doctorado': 'bg-red-100 text-red-700'
    };
    return <Badge className={nivelColors[nivel]}>{nivel}</Badge>;
  };

  const handleEdit = (programa: ProgramaAcademico) => {
    setProgramaToEdit(programa);
    setShowCreateModal(true);
  };

  const handleDelete = (programa: ProgramaAcademico) => {
    toast.success('Programa Eliminado', { description: `Se eliminó: ${programa.nombre}` });
  };

  const handleView = (programa: ProgramaAcademico) => {
    toast.info('Ver Programa', { description: `Viendo: ${programa.nombre}` });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setNivelFilter('all');
    setModalidadFilter('all');
    setSedeFilter('all');
    setEstadoFilter('all');
  };

  const hasActiveFilters = searchQuery || nivelFilter !== 'all' || modalidadFilter !== 'all' || sedeFilter !== 'all' || estadoFilter !== 'all';

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setProgramaToEdit(null);
  };

  return (
    <>
    <Toaster position="top-right" richColors />
    <Container4K className="space-y-6">
      {/* Header - DÍA 5: ResponsiveHeader */}
      <ResponsiveHeader
        title="Programas Académicos"
        description="Gestiona los programas académicos de todas las sedes ESAP"
        icon={GraduationCap}
        primaryAction={{
          label: "Crear Programa",
          icon: Plus,
          onClick: () => setShowCreateModal(true),
          variant: "primary"
        }}
      />

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o facultad..."
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
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los niveles</option>
              {niveles.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>

            <select
              value={modalidadFilter}
              onChange={(e) => setModalidadFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las modalidades</option>
              {modalidades.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>

            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las sedes</option>
              {sedes.map(sede => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="En Trámite">En Trámite</option>
              <option value="Suspendido">Suspendido</option>
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
            {nivelFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Nivel: {nivelFilter}
                <button onClick={() => setNivelFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {modalidadFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Modalidad: {modalidadFilter}
                <button onClick={() => setModalidadFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {sedeFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Sede: {sedeFilter}
                <button onClick={() => setSedeFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {estadoFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Estado: {estadoFilter}
                <button onClick={() => setEstadoFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
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
                <h2 className="font-black text-gray-900 text-lg">Programas Académicos</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mostrando {paginatedProgramas.length} de {filteredProgramas.length} programas
                </p>
              </div>
              <Badge variant="outline" className="font-semibold">
                Total: {filteredProgramas.length}
              </Badge>
            </div>
          </div>

          {/* Vista Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Programa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Estudiantes
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
                  {paginatedProgramas.map((programa, index) => (
                    <React.Fragment key={`programa-fragment-${programa.id}`}>
                      <motion.tr
                        key={`programa-${programa.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                              {programa.nombre}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{programa.codigo}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getNivelBadge(programa.nivelFormacion)}
                            <p className="text-xs text-gray-500">{programa.modalidad}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{programa.sede}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{programa.estudiantesActivos}</span>
                            </div>
                            <p className="text-xs text-gray-500">{programa.graduados} graduados</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {getEstadoBadge(programa.estado)}
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
                                <DropdownMenuItem onClick={() => handleView(programa)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(programa)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Programa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(programa)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar Programa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={() => setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id)}
                              className="p-2 hover:bg-[#003DA5] hover:text-white rounded-lg transition-all"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedProgramaId === programa.id ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {expandedProgramaId === programa.id && (
                        <motion.tr
                          key={`programa-expanded-${programa.id}`}
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
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[#003DA5]" />
                                      Información Académica
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <p className="text-gray-700"><span className="font-semibold">Duración:</span> {programa.duracionSemestres} semestres ({programa.creditos} créditos)</p>
                                      <p className="text-gray-700"><span className="font-semibold">Jornada:</span> {programa.jornada}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Facultad:</span> {programa.facultad}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Costo matrícula:</span> ${programa.costoMatricula.toLocaleString()}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Docentes:</span> {programa.docentesAsignados}</p>
                                    </div>
                                  </div>

                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <Award className="w-4 h-4 text-[#003DA5]" />
                                      Registro y Acreditación
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <p className="text-gray-700"><span className="font-semibold">Reg. Calificado:</span> {programa.registroCalificado.numero}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Vigencia RC:</span> {new Date(programa.registroCalificado.vigencia).toLocaleDateString('es-CO')}</p>
                                      {programa.acreditacion && (
                                        <>
                                          <p className="text-gray-700"><span className="font-semibold">Acreditación:</span> {programa.acreditacion.tipo}</p>
                                          <p className="text-gray-700"><span className="font-semibold">Vigencia:</span> {new Date(programa.acreditacion.vigencia).toLocaleDateString('es-CO')}</p>
                                        </>
                                      )}
                                      <p className="text-gray-700"><span className="font-semibold">Creación:</span> {new Date(programa.fechaCreacion).toLocaleDateString('es-CO')}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
                                  <h4 className="font-black text-gray-900 text-sm mb-2">Descripción</h4>
                                  <p className="text-sm text-gray-700">{programa.descripcion}</p>
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
              {paginatedProgramas.map((programa, index) => (
                <motion.div
                  key={programa.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm">{programa.nombre}</h3>
                      <p className="text-xs text-gray-500 font-mono">{programa.codigo}</p>
                    </div>
                    {getEstadoBadge(programa.estado)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {programa.sede}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {programa.estudiantesActivos}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {getNivelBadge(programa.nivelFormacion)}
                    <Badge variant="outline" className="text-xs">{programa.modalidad}</Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredProgramas.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No se encontraron programas</h3>
              <p className="text-sm text-gray-600 mb-6">
                {hasActiveFilters ? 'Intenta ajustar los filtros' : 'Aún no hay programas registrados'}
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
          {filteredProgramas.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredProgramas.length}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal para Crear/Editar Programa */}
      {showCreateModal && (
        <CreateProgramaModal 
          onClose={handleCloseModal}
          programaToEdit={programaToEdit}
        />
      )}
    </Container4K>
    </>
  );
}
