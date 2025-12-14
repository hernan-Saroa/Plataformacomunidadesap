/**
 * Sistema de Gestión de Artefactos MRAE - MinTIC Colombia
 * Catálogo completo de artefactos por dominio con gestión documental
 */

import React, { useState } from 'react';
import {
  FileText,
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  X,
  Calendar,
  User,
  Tag,
  Layers,
  GitBranch,
  FileCheck,
  FolderOpen,
  Plus,
  BarChart3,
  TrendingUp,
  AlertCircle as Alert,
  BookOpen,
  Share2,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Artefacto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  dominio: string;
  categoria: string;
  estado: 'No iniciado' | 'En desarrollo' | 'En revisión' | 'Aprobado' | 'Publicado' | 'Obsoleto';
  version: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  responsable: string;
  aprobador: string;
  documentos: DocumentoArtefacto[];
  relacionadoCon: string[];
  porcentajeCompletitud: number;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  nivelMadurez: number;
  cumpleMinTIC: boolean;
}

interface DocumentoArtefacto {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  version: string;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

const DOMINIOS_MRAE = [
  {
    id: 'todos',
    nombre: 'Todos los Dominios',
    icon: Layers,
    color: 'from-gray-500 to-gray-600',
    count: 0
  },
  {
    id: 'estrategia-ti',
    nombre: 'Estrategia TI',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    count: 12
  },
  {
    id: 'informacion',
    nombre: 'Información',
    icon: Database,
    color: 'from-purple-500 to-purple-600',
    count: 15
  },
  {
    id: 'sistemas-informacion',
    nombre: 'Sistemas de Información',
    icon: Server,
    color: 'from-green-500 to-green-600',
    count: 18
  },
  {
    id: 'servicios-tecnologicos',
    nombre: 'Servicios Tecnológicos',
    icon: Laptop,
    color: 'from-orange-500 to-orange-600',
    count: 14
  },
  {
    id: 'uso-apropiacion',
    nombre: 'Uso y Apropiación',
    icon: UserCheck,
    color: 'from-pink-500 to-pink-600',
    count: 10
  }
];

const CATEGORIAS_ARTEFACTOS = [
  { id: 'todos', nombre: 'Todas las Categorías' },
  { id: 'estrategico', nombre: 'Estratégico' },
  { id: 'arquitectura', nombre: 'Arquitectura' },
  { id: 'gobierno', nombre: 'Gobierno y Políticas' },
  { id: 'catalogo', nombre: 'Catálogos' },
  { id: 'inventario', nombre: 'Inventarios' },
  { id: 'modelo', nombre: 'Modelos' },
  { id: 'matriz', nombre: 'Matrices' },
  { id: 'plan', nombre: 'Planes' },
  { id: 'procedimiento', nombre: 'Procedimientos' }
];

export function ArtefactosMRAE() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dominioFilter, setDominioFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [vistaActiva, setVistaActiva] = useState<'grid' | 'lista'>('grid');
  const [showNuevoArtefacto, setShowNuevoArtefacto] = useState(false);
  const [selectedArtefacto, setSelectedArtefacto] = useState<Artefacto | null>(null);
  const [showDetalleArtefacto, setShowDetalleArtefacto] = useState(false);

  // Artefactos demo basados en MRAE MinTIC
  const [artefactos, setArtefactos] = useState<Artefacto[]>([
    {
      id: 'ART-001',
      codigo: 'PETI-2025',
      nombre: 'Plan Estratégico de TI 2025-2028',
      descripcion: 'Plan Estratégico de Tecnologías de Información que define la hoja de ruta tecnológica de ESAP para el período 2025-2028',
      dominio: 'estrategia-ti',
      categoria: 'estrategico',
      estado: 'En desarrollo',
      version: '2.1',
      fechaCreacion: '2024-08-15',
      fechaActualizacion: '2024-12-04',
      responsable: 'Juan Pérez - Arquitecto TI',
      aprobador: 'CIO - Director TI',
      documentos: [
        {
          id: 'doc-001',
          nombre: 'PETI_2025-2028_v2.1.pdf',
          tipo: 'PDF',
          tamano: '4.2 MB',
          version: '2.1',
          fechaCarga: '2024-12-04',
          cargadoPor: 'Juan Pérez'
        },
        {
          id: 'doc-002',
          nombre: 'PETI_Anexo_Financiero.xlsx',
          tipo: 'XLSX',
          tamano: '1.8 MB',
          version: '2.1',
          fechaCarga: '2024-12-04',
          cargadoPor: 'María González'
        }
      ],
      relacionadoCon: ['ART-002', 'ART-003'],
      porcentajeCompletitud: 75,
      prioridad: 'Crítica',
      nivelMadurez: 4,
      cumpleMinTIC: true
    },
    {
      id: 'ART-002',
      codigo: 'MAPA-RUTA-2025',
      nombre: 'Mapa de Ruta Tecnológico',
      descripcion: 'Mapa de ruta que define las iniciativas tecnológicas priorizadas para los próximos 3 años',
      dominio: 'estrategia-ti',
      categoria: 'estrategico',
      estado: 'Aprobado',
      version: '1.0',
      fechaCreacion: '2024-09-01',
      fechaActualizacion: '2024-11-20',
      responsable: 'Carlos Ramírez - Consultor AE',
      aprobador: 'CIO - Director TI',
      documentos: [
        {
          id: 'doc-003',
          nombre: 'Mapa_Ruta_Tecnologico_2025.pdf',
          tipo: 'PDF',
          tamano: '2.5 MB',
          version: '1.0',
          fechaCarga: '2024-11-20',
          cargadoPor: 'Carlos Ramírez'
        }
      ],
      relacionadoCon: ['ART-001'],
      porcentajeCompletitud: 100,
      prioridad: 'Alta',
      nivelMadurez: 5,
      cumpleMinTIC: true
    },
    {
      id: 'ART-003',
      codigo: 'CAT-SERVICIOS-TI',
      nombre: 'Catálogo de Servicios TI',
      descripcion: 'Catálogo completo de servicios tecnológicos ofrecidos por la Dirección de TI a toda la organización',
      dominio: 'servicios-tecnologicos',
      categoria: 'catalogo',
      estado: 'En revisión',
      version: '3.2',
      fechaCreacion: '2023-05-10',
      fechaActualizacion: '2024-12-01',
      responsable: 'Ana Martínez - Líder Servicios TI',
      aprobador: 'CTO - Director Técnico',
      documentos: [
        {
          id: 'doc-004',
          nombre: 'Catalogo_Servicios_TI_v3.2.pdf',
          tipo: 'PDF',
          tamano: '5.1 MB',
          version: '3.2',
          fechaCarga: '2024-12-01',
          cargadoPor: 'Ana Martínez'
        }
      ],
      relacionadoCon: ['ART-005', 'ART-008'],
      porcentajeCompletitud: 92,
      prioridad: 'Alta',
      nivelMadurez: 4,
      cumpleMinTIC: true
    },
    {
      id: 'ART-004',
      codigo: 'ARQ-DATOS-CORP',
      nombre: 'Arquitectura de Información Corporativa',
      descripcion: 'Modelo de arquitectura de información que define la estructura de datos, flujos y gobierno',
      dominio: 'informacion',
      categoria: 'arquitectura',
      estado: 'En desarrollo',
      version: '1.5',
      fechaCreacion: '2024-06-01',
      fechaActualizacion: '2024-12-03',
      responsable: 'Laura Sánchez - Arquitecto de Datos',
      aprobador: 'CDO - Chief Data Officer',
      documentos: [
        {
          id: 'doc-005',
          nombre: 'Arquitectura_Informacion_v1.5.pdf',
          tipo: 'PDF',
          tamano: '6.8 MB',
          version: '1.5',
          fechaCarga: '2024-12-03',
          cargadoPor: 'Laura Sánchez'
        }
      ],
      relacionadoCon: ['ART-006', 'ART-007'],
      porcentajeCompletitud: 65,
      prioridad: 'Crítica',
      nivelMadurez: 3,
      cumpleMinTIC: false
    },
    {
      id: 'ART-005',
      codigo: 'INV-APLICACIONES',
      nombre: 'Inventario de Aplicaciones',
      descripcion: 'Inventario completo de todas las aplicaciones y sistemas de información en operación',
      dominio: 'sistemas-informacion',
      categoria: 'inventario',
      estado: 'Publicado',
      version: '4.0',
      fechaCreacion: '2023-01-15',
      fechaActualizacion: '2024-11-30',
      responsable: 'Roberto Torres - Analista Sistemas',
      aprobador: 'Gerente de Aplicaciones',
      documentos: [
        {
          id: 'doc-006',
          nombre: 'Inventario_Aplicaciones_2024.xlsx',
          tipo: 'XLSX',
          tamano: '2.2 MB',
          version: '4.0',
          fechaCarga: '2024-11-30',
          cargadoPor: 'Roberto Torres'
        }
      ],
      relacionadoCon: ['ART-003', 'ART-009'],
      porcentajeCompletitud: 100,
      prioridad: 'Media',
      nivelMadurez: 4,
      cumpleMinTIC: true
    },
    {
      id: 'ART-006',
      codigo: 'DICT-DATOS',
      nombre: 'Diccionario de Datos Corporativo',
      descripcion: 'Diccionario de datos que documenta todas las entidades, atributos y relaciones del modelo de datos',
      dominio: 'informacion',
      categoria: 'catalogo',
      estado: 'En desarrollo',
      version: '2.0',
      fechaCreacion: '2024-07-01',
      fechaActualizacion: '2024-12-02',
      responsable: 'Patricia López - DBA Senior',
      aprobador: 'CDO - Chief Data Officer',
      documentos: [
        {
          id: 'doc-007',
          nombre: 'Diccionario_Datos_v2.0.xlsx',
          tipo: 'XLSX',
          tamano: '3.5 MB',
          version: '2.0',
          fechaCarga: '2024-12-02',
          cargadoPor: 'Patricia López'
        }
      ],
      relacionadoCon: ['ART-004'],
      porcentajeCompletitud: 58,
      prioridad: 'Alta',
      nivelMadurez: 3,
      cumpleMinTIC: false
    },
    {
      id: 'ART-007',
      codigo: 'POL-GOB-DATOS',
      nombre: 'Políticas de Gobierno de Datos',
      descripcion: 'Conjunto de políticas y lineamientos para el gobierno y gestión de datos institucionales',
      dominio: 'informacion',
      categoria: 'gobierno',
      estado: 'Aprobado',
      version: '1.0',
      fechaCreacion: '2024-03-01',
      fechaActualizacion: '2024-10-15',
      responsable: 'Diana Vargas - Data Steward',
      aprobador: 'CDO - Chief Data Officer',
      documentos: [
        {
          id: 'doc-008',
          nombre: 'Politicas_Gobierno_Datos_v1.0.pdf',
          tipo: 'PDF',
          tamano: '1.9 MB',
          version: '1.0',
          fechaCarga: '2024-10-15',
          cargadoPor: 'Diana Vargas'
        }
      ],
      relacionadoCon: ['ART-004', 'ART-006'],
      porcentajeCompletitud: 100,
      prioridad: 'Crítica',
      nivelMadurez: 5,
      cumpleMinTIC: true
    },
    {
      id: 'ART-008',
      codigo: 'ARQ-TECNOLOGICA',
      nombre: 'Arquitectura Tecnológica',
      descripcion: 'Modelo de arquitectura tecnológica que define la infraestructura, plataformas y servicios',
      dominio: 'servicios-tecnologicos',
      categoria: 'arquitectura',
      estado: 'En revisión',
      version: '2.5',
      fechaCreacion: '2023-11-01',
      fechaActualizacion: '2024-11-28',
      responsable: 'Miguel Ángel Ruiz - Arquitecto Cloud',
      aprobador: 'CTO - Director Técnico',
      documentos: [
        {
          id: 'doc-009',
          nombre: 'Arquitectura_Tecnologica_v2.5.pdf',
          tipo: 'PDF',
          tamano: '7.2 MB',
          version: '2.5',
          fechaCarga: '2024-11-28',
          cargadoPor: 'Miguel Ángel Ruiz'
        }
      ],
      relacionadoCon: ['ART-003'],
      porcentajeCompletitud: 88,
      prioridad: 'Alta',
      nivelMadurez: 4,
      cumpleMinTIC: true
    },
    {
      id: 'ART-009',
      codigo: 'MATRIZ-PROC-APP',
      nombre: 'Matriz Procesos vs Aplicaciones',
      descripcion: 'Matriz de trazabilidad que relaciona los procesos de negocio con las aplicaciones que los soportan',
      dominio: 'sistemas-informacion',
      categoria: 'matriz',
      estado: 'Publicado',
      version: '1.8',
      fechaCreacion: '2023-08-01',
      fechaActualizacion: '2024-11-25',
      responsable: 'Andrés Castro - Analista de Procesos',
      aprobador: 'Gerente de Procesos',
      documentos: [
        {
          id: 'doc-010',
          nombre: 'Matriz_Procesos_Aplicaciones_v1.8.xlsx',
          tipo: 'XLSX',
          tamano: '2.8 MB',
          version: '1.8',
          fechaCarga: '2024-11-25',
          cargadoPor: 'Andrés Castro'
        }
      ],
      relacionadoCon: ['ART-005'],
      porcentajeCompletitud: 100,
      prioridad: 'Media',
      nivelMadurez: 4,
      cumpleMinTIC: true
    },
    {
      id: 'ART-010',
      codigo: 'PLAN-CAPACIT',
      nombre: 'Plan de Capacitación Digital',
      descripcion: 'Plan anual de capacitación en competencias digitales para toda la comunidad ESAP',
      dominio: 'uso-apropiacion',
      categoria: 'plan',
      estado: 'No iniciado',
      version: '0.1',
      fechaCreacion: '2024-12-01',
      fechaActualizacion: '2024-12-01',
      responsable: 'Claudia Hernández - Coordinadora Capacitación',
      aprobador: 'Director Académico',
      documentos: [],
      relacionadoCon: [],
      porcentajeCompletitud: 10,
      prioridad: 'Media',
      nivelMadurez: 1,
      cumpleMinTIC: false
    }
  ]);

  // Filtrado de artefactos
  const artefactosFiltrados = artefactos.filter(a => {
    const matchSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDominio = dominioFilter === 'todos' || a.dominio === dominioFilter;
    const matchEstado = estadoFilter === 'todos' || a.estado === estadoFilter;
    const matchCategoria = categoriaFilter === 'todos' || a.categoria === categoriaFilter;
    return matchSearch && matchDominio && matchEstado && matchCategoria;
  });

  // Estadísticas
  const stats = {
    total: artefactos.length,
    aprobados: artefactos.filter(a => a.estado === 'Aprobado').length,
    publicados: artefactos.filter(a => a.estado === 'Publicado').length,
    enDesarrollo: artefactos.filter(a => a.estado === 'En desarrollo').length,
    cumplimientoMRAE: Math.round((artefactos.filter(a => a.cumpleMinTIC).length / artefactos.length) * 100),
    completitudPromedio: Math.round(artefactos.reduce((acc, a) => acc + a.porcentajeCompletitud, 0) / artefactos.length)
  };

  const handleVerDetalle = (artefacto: Artefacto) => {
    setSelectedArtefacto(artefacto);
    setShowDetalleArtefacto(true);
  };

  const handleCargarDocumento = (artefactoId: string) => {
    toast.success('Documento cargado exitosamente');
  };

  const handleDescargarDocumento = (documento: DocumentoArtefacto) => {
    toast.success(`Descargando ${documento.nombre}`);
  };

  const getDominioInfo = (dominioId: string) => {
    return DOMINIOS_MRAE.find(d => d.id === dominioId) || DOMINIOS_MRAE[0];
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      'No iniciado': 'bg-gray-100 text-gray-700 border border-gray-300',
      'En desarrollo': 'bg-blue-100 text-blue-700 border border-blue-300',
      'En revisión': 'bg-purple-100 text-purple-700 border border-purple-300',
      'Aprobado': 'bg-green-100 text-green-700 border border-green-300',
      'Publicado': 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      'Obsoleto': 'bg-red-100 text-red-700 border border-red-300'
    };
    return badges[estado] || badges['En desarrollo'];
  };

  const getEstadoIcon = (estado: string) => {
    const icons = {
      'No iniciado': Clock,
      'En desarrollo': Edit,
      'En revisión': Eye,
      'Aprobado': CheckCircle,
      'Publicado': FileCheck,
      'Obsoleto': XCircle
    };
    return icons[estado] || Clock;
  };

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Artefactos</h3>
          <p className="text-xs text-gray-500 mt-1">Catálogo completo MRAE</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.aprobados}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Aprobados</h3>
          <p className="text-xs text-gray-500 mt-1">Validados oficialmente</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.publicados}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Publicados</h3>
          <p className="text-xs text-gray-500 mt-1">Disponibles</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.cumplimientoMRAE}%</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Cumplimiento MRAE</h3>
          <p className="text-xs text-gray-500 mt-1">Conformidad MinTIC</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.completitudPromedio}%</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Completitud Promedio</h3>
          <p className="text-xs text-gray-500 mt-1">Nivel de documentación</p>
        </motion.div>
      </div>

      {/* Filtros por Dominio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Filtrar por Dominio MRAE</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOMINIOS_MRAE.map(dominio => {
            const Icon = dominio.icon;
            const isActive = dominioFilter === dominio.id;
            const count = dominio.id === 'todos' 
              ? artefactos.length 
              : artefactos.filter(a => a.dominio === dominio.id).length;

            return (
              <button
                key={dominio.id}
                onClick={() => setDominioFilter(dominio.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-[#003DA5] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2 bg-gradient-to-br ${dominio.color} rounded-lg mb-2 mx-auto w-fit`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-900 mb-1">{dominio.nombre}</div>
                  <div className="text-lg font-black text-gray-900">{count}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Búsqueda y Acciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar artefactos por nombre, código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros adicionales */}
          <div className="flex gap-3">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              <option value="todos">Todos los Estados</option>
              <option value="No iniciado">No Iniciado</option>
              <option value="En desarrollo">En Desarrollo</option>
              <option value="En revisión">En Revisión</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Publicado">Publicado</option>
            </select>

            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              {CATEGORIAS_ARTEFACTOS.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>

            <button
              onClick={() => setShowNuevoArtefacto(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Artefacto
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Artefactos */}
      <div className="grid grid-cols-1 gap-5">
        {artefactosFiltrados.map((artefacto, index) => {
          const dominioInfo = getDominioInfo(artefacto.dominio);
          const IconDominio = dominioInfo.icon;
          const EstadoIcon = getEstadoIcon(artefacto.estado);

          return (
            <motion.div
              key={artefacto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 bg-gradient-to-br ${dominioInfo.color} rounded-xl`}>
                      <IconDominio className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                          {artefacto.codigo}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getEstadoBadge(artefacto.estado)}`}>
                          <EstadoIcon className="w-3 h-3 inline mr-1" />
                          {artefacto.estado}
                        </span>
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                          v{artefacto.version}
                        </span>
                        {artefacto.cumpleMinTIC && (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Cumple MRAE
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        {artefacto.nombre}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {artefacto.descripcion}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <IconDominio className="w-4 h-4" />
                          <span className="font-medium">{dominioInfo.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          <span>{artefacto.responsable}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(artefacto.fechaActualizacion).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{artefacto.documentos.length} documentos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerDetalle(artefacto)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleCargarDocumento(artefacto.id)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Cargar documento"
                    >
                      <Upload className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Progreso de Completitud */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-700">Completitud del artefacto</span>
                    <span className="font-black text-gray-900">{artefacto.porcentajeCompletitud}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        artefacto.porcentajeCompletitud === 100
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : artefacto.porcentajeCompletitud >= 70
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600'
                          : 'bg-gradient-to-r from-orange-500 to-amber-600'
                      }`}
                      style={{ width: `${artefacto.porcentajeCompletitud}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Categoría</div>
                    <div className="text-sm font-bold text-gray-900 capitalize">
                      {CATEGORIAS_ARTEFACTOS.find(c => c.id === artefacto.categoria)?.nombre || artefacto.categoria}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Nivel Madurez</div>
                    <div className="text-lg font-black text-purple-600">
                      {artefacto.nivelMadurez}/5
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Prioridad</div>
                    <div className={`text-sm font-bold ${
                      artefacto.prioridad === 'Crítica' ? 'text-red-600' :
                      artefacto.prioridad === 'Alta' ? 'text-orange-600' :
                      artefacto.prioridad === 'Media' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {artefacto.prioridad}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Relaciones</div>
                    <div className="text-lg font-black text-gray-900">
                      {artefacto.relacionadoCon.length}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {artefactosFiltrados.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron artefactos</h3>
            <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Modal de Detalle del Artefacto */}
      <AnimatePresence>
        {showDetalleArtefacto && selectedArtefacto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetalleArtefacto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6 rounded-t-2xl z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                        {selectedArtefacto.codigo}
                      </span>
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                        v{selectedArtefacto.version}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black mb-2">{selectedArtefacto.nombre}</h2>
                    <p className="text-blue-100">{selectedArtefacto.descripcion}</p>
                  </div>
                  <button
                    onClick={() => setShowDetalleArtefacto(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6">
                {/* Información del Artefacto */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4">Información del Artefacto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Dominio MRAE</div>
                      <div className="font-bold text-gray-900">{getDominioInfo(selectedArtefacto.dominio).nombre}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Categoría</div>
                      <div className="font-bold text-gray-900 capitalize">
                        {CATEGORIAS_ARTEFACTOS.find(c => c.id === selectedArtefacto.categoria)?.nombre}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Responsable</div>
                      <div className="font-bold text-gray-900">{selectedArtefacto.responsable}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Aprobador</div>
                      <div className="font-bold text-gray-900">{selectedArtefacto.aprobador}</div>
                    </div>
                  </div>
                </div>

                {/* Documentos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-gray-900">Documentos ({selectedArtefacto.documentos.length})</h3>
                    <button
                      onClick={() => handleCargarDocumento(selectedArtefacto.id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Cargar Documento
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedArtefacto.documentos.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{doc.nombre}</div>
                            <div className="text-sm text-gray-600">
                              {doc.tipo} • {doc.tamano} • v{doc.version} • {doc.cargadoPor}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDescargarDocumento(doc)}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                          >
                            <Download className="w-5 h-5 text-gray-600" />
                          </button>
                          <button className="p-2 hover:bg-white rounded-lg transition-colors">
                            <Eye className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedArtefacto.documentos.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay documentos cargados aún
                      </div>
                    )}
                  </div>
                </div>

                {/* Relaciones */}
                {selectedArtefacto.relacionadoCon.length > 0 && (
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-4">Artefactos Relacionados</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedArtefacto.relacionadoCon.map(relId => {
                        const artefactoRel = artefactos.find(a => a.id === relId);
                        return artefactoRel ? (
                          <span key={relId} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg font-semibold text-sm flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {artefactoRel.codigo}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}