/**
 * Gestión de Proyectos de Arquitectura Empresarial
 * Sistema completo de proyectos MRAE con carga de documentos, estados y seguimiento
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  BarChart3,
  X,
  Paperclip,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { FormularioNuevoProyecto } from './FormularioNuevoProyecto';

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  dominio: string;
  descripcion: string;
  objetivo: string;
  equipo: string[];
  tamanioEquipo: number;
  duracion: string;
  fechaInicio: string;
  fechaFin: string;
  presupuesto: string;
  sponsor: string;
  estado: 'Planeación' | 'En progreso' | 'En revisión' | 'Completado' | 'En pausa' | 'Cancelado';
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  progreso: number;
  documentos: Documento[];
  artefactosGenerados: string[];
  indicadores: {
    cumplimientoTiempo: number;
    cumplimientoPresupuesto: number;
    calidadEntregables: number;
  };
  riesgos: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaCarga: string;
  cargadoPor: string;
  categoria: 'Planeación' | 'Ejecución' | 'Seguimiento' | 'Cierre' | 'Otro';
}

const DOMINIOS_MRAE = [
  { id: 'todos', nombre: 'Todos los Dominios', icon: BarChart3 },
  { id: 'estrategia-ti', nombre: 'Estrategia TI', icon: Target },
  { id: 'informacion', nombre: 'Información', icon: Database },
  { id: 'sistemas-informacion', nombre: 'Sistemas de Información', icon: Server },
  { id: 'servicios-tecnologicos', nombre: 'Servicios Tecnológicos', icon: Laptop },
  { id: 'uso-apropiacion', nombre: 'Uso y Apropiación', icon: UserCheck }
];

export function ProyectosAE() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dominioFilter, setDominioFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [showNuevoProyecto, setShowNuevoProyecto] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [showDetalleProyecto, setShowDetalleProyecto] = useState(false);

  // Proyectos demo
  const [proyectos, setProyectos] = useState<Proyecto[]>([
    {
      id: 'AE-001',
      codigo: 'AE-001',
      nombre: 'Actualización Marco AE 2025',
      dominio: 'todos',
      descripcion: 'Actualización completa del Marco de Arquitectura Empresarial según lineamientos MinTIC 2025',
      objetivo: 'Actualizar todos los artefactos MRAE para cumplir con los nuevos lineamientos del MinTIC',
      equipo: ['Arquitecto TI', 'Analista de Procesos', 'Consultor AE', 'Líder de Proyecto'],
      tamanioEquipo: 8,
      duracion: 'sept. - mar de 25',
      fechaInicio: '2024-09-01',
      fechaFin: '2025-03-15',
      presupuesto: '$180M',
      sponsor: 'CIO',
      estado: 'En progreso',
      prioridad: 'Crítica',
      progreso: 40,
      documentos: [
        {
          id: 'doc-001',
          nombre: 'Plan de Proyecto AE 2025.pdf',
          tipo: 'PDF',
          tamano: '2.4 MB',
          fechaCarga: '2024-09-15',
          cargadoPor: 'Juan Pérez',
          categoria: 'Planeación'
        },
        {
          id: 'doc-002',
          nombre: 'Lineamientos MinTIC 2025.docx',
          tipo: 'DOCX',
          tamano: '1.8 MB',
          fechaCarga: '2024-09-20',
          cargadoPor: 'María González',
          categoria: 'Planeación'
        }
      ],
      artefactosGenerados: ['PETI', 'Mapa de Ruta', 'Catálogo de Servicios'],
      indicadores: {
        cumplimientoTiempo: 85,
        cumplimientoPresupuesto: 92,
        calidadEntregables: 88
      },
      riesgos: 3,
      fechaCreacion: '2024-08-15',
      ultimaActualizacion: '2024-12-04'
    },
    {
      id: 'AE-002',
      codigo: 'AE-002',
      nombre: 'Implementación Data Catalog',
      dominio: 'informacion',
      descripcion: 'Implementación de catálogo de datos corporativo para mejorar el gobierno de información',
      objetivo: 'Centralizar y documentar todos los activos de información de ESAP',
      equipo: ['DBA', 'Data Steward', 'Analista de Datos'],
      tamanioEquipo: 6,
      duracion: 'oct. - may de 25',
      fechaInicio: '2024-10-01',
      fechaFin: '2025-05-30',
      presupuesto: '$250M',
      sponsor: 'CDO',
      estado: 'En progreso',
      prioridad: 'Alta',
      progreso: 35,
      documentos: [
        {
          id: 'doc-003',
          nombre: 'Arquitectura Data Catalog.pdf',
          tipo: 'PDF',
          tamano: '3.2 MB',
          fechaCarga: '2024-10-10',
          cargadoPor: 'Carlos Ramírez',
          categoria: 'Planeación'
        }
      ],
      artefactosGenerados: ['Diccionario de Datos', 'Modelo de Datos Corporativo'],
      indicadores: {
        cumplimientoTiempo: 78,
        cumplimientoPresupuesto: 85,
        calidadEntregables: 90
      },
      riesgos: 5,
      fechaCreacion: '2024-09-20',
      ultimaActualizacion: '2024-12-03'
    },
    {
      id: 'AE-003',
      codigo: 'AE-003',
      nombre: 'Migración Cloud AWS',
      dominio: 'servicios-tecnologicos',
      descripcion: 'Migración de infraestructura on-premise a AWS Cloud',
      objetivo: 'Reducir costos operativos y mejorar disponibilidad de servicios',
      equipo: ['Cloud Architect', 'DevOps', 'SysAdmin'],
      tamanioEquipo: 10,
      duracion: 'nov. 24 - jun. 25',
      fechaInicio: '2024-11-01',
      fechaFin: '2025-06-30',
      presupuesto: '$420M',
      sponsor: 'CTO',
      estado: 'En progreso',
      prioridad: 'Crítica',
      progreso: 65,
      documentos: [],
      artefactosGenerados: ['Arquitectura Cloud', 'Plan de Migración'],
      indicadores: {
        cumplimientoTiempo: 92,
        cumplimientoPresupuesto: 88,
        calidadEntregables: 95
      },
      riesgos: 2,
      fechaCreacion: '2024-10-15',
      ultimaActualizacion: '2024-12-04'
    },
    {
      id: 'AE-004',
      codigo: 'AE-004',
      nombre: 'Plan de Capacitación Digital',
      dominio: 'uso-apropiacion',
      descripcion: 'Programa de capacitación en herramientas digitales para toda la comunidad ESAP',
      objetivo: 'Aumentar competencias digitales en 80% de la comunidad universitaria',
      equipo: ['Instructor', 'Diseñador Instruccional', 'Coordinador'],
      tamanioEquipo: 5,
      duracion: 'ene. - dic. 25',
      fechaInicio: '2025-01-15',
      fechaFin: '2025-12-31',
      presupuesto: '$150M',
      sponsor: 'Director Académico',
      estado: 'Planeación',
      prioridad: 'Media',
      progreso: 15,
      documentos: [],
      artefactosGenerados: ['Plan de Capacitación', 'Material Didáctico'],
      indicadores: {
        cumplimientoTiempo: 100,
        cumplimientoPresupuesto: 100,
        calidadEntregables: 85
      },
      riesgos: 1,
      fechaCreacion: '2024-12-01',
      ultimaActualizacion: '2024-12-04'
    }
  ]);

  // Filtrado de proyectos
  const proyectosFiltrados = proyectos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDominio = dominioFilter === 'todos' || p.dominio === dominioFilter;
    const matchEstado = estadoFilter === 'todos' || p.estado === estadoFilter;
    return matchSearch && matchDominio && matchEstado;
  });

  // Estadísticas
  const stats = {
    total: proyectos.length,
    enProgreso: proyectos.filter(p => p.estado === 'En progreso').length,
    completados: proyectos.filter(p => p.estado === 'Completado').length,
    planeacion: proyectos.filter(p => p.estado === 'Planeación').length,
    progresoPromedio: Math.round(proyectos.reduce((acc, p) => acc + p.progreso, 0) / proyectos.length)
  };

  const handleNuevoProyecto = () => {
    setShowNuevoProyecto(true);
  };

  const handleVerDetalle = (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setShowDetalleProyecto(true);
  };

  const handleCargarDocumento = (proyectoId: string) => {
    // Simular carga de documento
    toast.success('Documento cargado exitosamente');
  };

  const handleCrearProyecto = (data: any) => {
    // Crear nuevo proyecto
    const nuevoProyecto: Proyecto = {
      id: data.codigo,
      codigo: data.codigo,
      nombre: data.nombre,
      dominio: data.dominio,
      descripcion: data.descripcion,
      objetivo: data.objetivo,
      equipo: data.equipoSeleccionado || [],
      tamanioEquipo: data.tamanioEquipo || 0,
      duracion: `${new Date(data.fechaInicio).toLocaleDateString('es', { month: 'short' })} - ${new Date(data.fechaFin).toLocaleDateString('es', { month: 'short', year: '2-digit' })}`,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      presupuesto: data.presupuesto,
      sponsor: data.sponsor,
      estado: 'Planeación',
      prioridad: data.prioridad,
      progreso: 0,
      documentos: [],
      artefactosGenerados: data.artefactosObjetivo || [],
      indicadores: {
        cumplimientoTiempo: 100,
        cumplimientoPresupuesto: 100,
        calidadEntregables: 100
      },
      riesgos: 0,
      fechaCreacion: new Date().toISOString().split('T')[0],
      ultimaActualizacion: new Date().toISOString().split('T')[0]
    };
    
    setProyectos([...proyectos, nuevoProyecto]);
    setShowNuevoProyecto(false);
    toast.success('¡Proyecto creado exitosamente!');
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      'Planeación': 'bg-gray-100 text-gray-700 border border-gray-300',
      'En progreso': 'bg-blue-100 text-blue-700 border border-blue-300',
      'En revisión': 'bg-purple-100 text-purple-700 border border-purple-300',
      'Completado': 'bg-green-100 text-green-700 border border-green-300',
      'En pausa': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      'Cancelado': 'bg-red-100 text-red-700 border border-red-300'
    };
    return badges[estado] || badges['En progreso'];
  };

  const getPrioridadBadge = (prioridad: string) => {
    const badges = {
      'Baja': 'bg-blue-500 text-white',
      'Media': 'bg-yellow-500 text-white',
      'Alta': 'bg-orange-500 text-white',
      'Crítica': 'bg-red-500 text-white'
    };
    return badges[prioridad] || badges['Media'];
  };

  const getDominioInfo = (dominioId: string) => {
    const dominio = DOMINIOS_MRAE.find(d => d.id === dominioId);
    return dominio || DOMINIOS_MRAE[0];
  };

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Proyectos</h3>
          <p className="text-xs text-gray-500 mt-1">Todos los dominios</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.enProgreso}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">En Progreso</h3>
          <p className="text-xs text-gray-500 mt-1">Proyectos activos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.completados}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Completados</h3>
          <p className="text-xs text-gray-500 mt-1">Finalizados exitosamente</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.progresoPromedio}%</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Progreso Promedio</h3>
          <p className="text-xs text-gray-500 mt-1">Todos los proyectos</p>
        </motion.div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar proyectos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-3">
            <select
              value={dominioFilter}
              onChange={(e) => setDominioFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              {DOMINIOS_MRAE.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              <option value="todos">Todos los Estados</option>
              <option value="Planeación">Planeación</option>
              <option value="En progreso">En Progreso</option>
              <option value="En revisión">En Revisión</option>
              <option value="Completado">Completado</option>
            </select>

            <button
              onClick={handleNuevoProyecto}
              className="px-6 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Proyecto
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="grid grid-cols-1 gap-5">
        {proyectosFiltrados.map((proyecto, index) => {
          const dominioInfo = getDominioInfo(proyecto.dominio);
          const IconDominio = dominioInfo.icon;

          return (
            <motion.div
              key={proyecto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6">
                {/* Header del Proyecto */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <IconDominio className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                          {proyecto.codigo}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPrioridadBadge(proyecto.prioridad)}`}>
                          {proyecto.prioridad}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getEstadoBadge(proyecto.estado)}`}>
                          {proyecto.estado}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        {proyecto.nombre}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {proyecto.descripcion}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <IconDominio className="w-4 h-4" />
                          <span className="font-medium">{dominioInfo.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{proyecto.tamanioEquipo} personas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{proyecto.duracion}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">{proyecto.presupuesto}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerDetalle(proyecto)}
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
                      onClick={() => handleCargarDocumento(proyecto.id)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Cargar documento"
                    >
                      <Upload className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Progreso */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-700">Avance del proyecto</span>
                    <span className="font-black text-gray-900">{proyecto.progreso}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${proyecto.progreso}%` }}
                    />
                  </div>
                </div>

                {/* Footer con Indicadores */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Cumplimiento Tiempo</div>
                    <div className="text-lg font-black text-green-600">
                      {proyecto.indicadores.cumplimientoTiempo}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Cumplimiento Presupuesto</div>
                    <div className="text-lg font-black text-blue-600">
                      {proyecto.indicadores.cumplimientoPresupuesto}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Calidad</div>
                    <div className="text-lg font-black text-purple-600">
                      {proyecto.indicadores.calidadEntregables}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Documentos</div>
                    <div className="text-lg font-black text-gray-900">
                      {proyecto.documentos.length}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal de Detalle de Proyecto */}
      <AnimatePresence>
        {showDetalleProyecto && selectedProyecto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetalleProyecto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6 rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                        {selectedProyecto.codigo}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black mb-2">{selectedProyecto.nombre}</h2>
                    <p className="text-blue-100">{selectedProyecto.descripcion}</p>
                  </div>
                  <button
                    onClick={() => setShowDetalleProyecto(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6">
                {/* Información General */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4">Información General</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Dominio MRAE</div>
                      <div className="font-bold text-gray-900">{getDominioInfo(selectedProyecto.dominio).nombre}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Sponsor</div>
                      <div className="font-bold text-gray-900">{selectedProyecto.sponsor}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Presupuesto</div>
                      <div className="font-bold text-gray-900">{selectedProyecto.presupuesto}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Equipo</div>
                      <div className="font-bold text-gray-900">{selectedProyecto.tamanioEquipo} personas</div>
                    </div>
                  </div>
                </div>

                {/* Documentos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-gray-900">Documentos del Proyecto</h3>
                    <button
                      onClick={() => handleCargarDocumento(selectedProyecto.id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Cargar Documento
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedProyecto.documentos.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <File className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{doc.nombre}</div>
                            <div className="text-sm text-gray-600">
                              {doc.tipo} • {doc.tamano} • {doc.categoria}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-white rounded-lg transition-colors">
                            <Download className="w-5 h-5 text-gray-600" />
                          </button>
                          <button className="p-2 hover:bg-white rounded-lg transition-colors">
                            <Eye className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedProyecto.documentos.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No hay documentos cargados aún
                      </div>
                    )}
                  </div>
                </div>

                {/* Artefactos Generados */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4">Artefactos MRAE Generados</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProyecto.artefactosGenerados.map((artefacto, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-semibold text-sm">
                        {artefacto}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Nuevo Proyecto */}
      <AnimatePresence>
        {showNuevoProyecto && (
          <FormularioNuevoProyecto
            onClose={() => setShowNuevoProyecto(false)}
            onSubmit={handleCrearProyecto}
          />
        )}
      </AnimatePresence>
    </div>
  );
}