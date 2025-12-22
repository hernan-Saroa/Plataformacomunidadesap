/**
 * ============================================
 * MÓDULO: EXPEDIENTE DIGITAL
 * ============================================
 * 
 * Gestión documental centralizada para Control Interno de Gestión
 * RF013 - Repositorio centralizado + organización por proceso
 * 
 * CARACTERÍSTICAS:
 * - Estructura jerárquica de carpetas por proceso
 * - Gestión de documentos con metadatos completos
 * - Búsqueda y filtros avanzados
 * - Visor de documentos integrado
 * - Control de versiones
 * - Historial de cambios
 * 
 * ÚLTIMA ACTUALIZACIÓN: 20 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, File, FileText, Upload, Download, Search,
  Filter, MoreVertical, Eye, Edit, Trash2, Share2, Clock,
  CheckCircle, AlertCircle, ChevronRight, ChevronDown, Calendar,
  User, Tag, ArrowUpDown, Grid, List as ListIcon, Plus, X
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type TipoDocumento =
  | 'Plan Anual'
  | 'Programa Anual'
  | 'Oficio'
  | 'Carta'
  | 'Acta'
  | 'Informe Preliminar'
  | 'Informe Final'
  | 'Lista Chequeo'
  | 'Evidencia'
  | 'Plan Mejoramiento'
  | 'Seguimiento'
  | 'Otro';

type EstadoDocumento = 'Borrador' | 'En Revisión' | 'Aprobado' | 'Archivado';

interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  carpetaId: string;
  procesoId: string;
  procesoNombre: string;
  tamano: number; // bytes
  extension: string;
  estado: EstadoDocumento;
  version: number;
  creadoPor: {
    id: string;
    nombre: string;
    iniciales: string;
  };
  fechaCreacion: string;
  fechaModificacion: string;
  tags: string[];
  descripcion: string;
  auditoriaId?: string;
  url: string;
}

interface Carpeta {
  id: string;
  nombre: string;
  procesoId: string;
  procesoNombre: string;
  color: string;
  icono: string;
  documentosCount: number;
  subcarpetas?: Carpeta[];
  parentId?: string;
}

// ============ DATOS DE PRUEBA ============

const PROCESOS_AUDITORIAS: Carpeta[] = [
  {
    id: 'proc-001',
    nombre: 'Gestión Financiera',
    procesoId: 'GF',
    procesoNombre: 'Gestión Financiera',
    color: '#10B981',
    icono: '💰',
    documentosCount: 23,
    subcarpetas: [
      { id: 'sub-001', nombre: 'Plan Anual 2025', procesoId: 'GF', procesoNombre: 'Gestión Financiera', color: '#10B981', icono: '📋', documentosCount: 5, parentId: 'proc-001' },
      { id: 'sub-002', nombre: 'Auditorías', procesoId: 'GF', procesoNombre: 'Gestión Financiera', color: '#10B981', icono: '🔍', documentosCount: 12, parentId: 'proc-001' },
      { id: 'sub-003', nombre: 'Planes Mejoramiento', procesoId: 'GF', procesoNombre: 'Gestión Financiera', color: '#10B981', icono: '📊', documentosCount: 6, parentId: 'proc-001' }
    ]
  },
  {
    id: 'proc-002',
    nombre: 'Gestión Administrativa',
    procesoId: 'GA',
    procesoNombre: 'Gestión Administrativa',
    color: '#3B82F6',
    icono: '🏢',
    documentosCount: 18,
    subcarpetas: [
      { id: 'sub-004', nombre: 'Plan Anual 2025', procesoId: 'GA', procesoNombre: 'Gestión Administrativa', color: '#3B82F6', icono: '📋', documentosCount: 4, parentId: 'proc-002' },
      { id: 'sub-005', nombre: 'Auditorías', procesoId: 'GA', procesoNombre: 'Gestión Administrativa', color: '#3B82F6', icono: '🔍', documentosCount: 10, parentId: 'proc-002' },
      { id: 'sub-006', nombre: 'Planes Mejoramiento', procesoId: 'GA', procesoNombre: 'Gestión Administrativa', color: '#3B82F6', icono: '📊', documentosCount: 4, parentId: 'proc-002' }
    ]
  },
  {
    id: 'proc-003',
    nombre: 'Gestión Talento Humano',
    procesoId: 'GTH',
    procesoNombre: 'Gestión Talento Humano',
    color: '#8B5CF6',
    icono: '👥',
    documentosCount: 15,
    subcarpetas: [
      { id: 'sub-007', nombre: 'Plan Anual 2025', procesoId: 'GTH', procesoNombre: 'Gestión Talento Humano', color: '#8B5CF6', icono: '📋', documentosCount: 3, parentId: 'proc-003' },
      { id: 'sub-008', nombre: 'Auditorías', procesoId: 'GTH', procesoNombre: 'Gestión Talento Humano', color: '#8B5CF6', icono: '🔍', documentosCount: 8, parentId: 'proc-003' },
      { id: 'sub-009', nombre: 'Planes Mejoramiento', procesoId: 'GTH', procesoNombre: 'Gestión Talento Humano', color: '#8B5CF6', icono: '📊', documentosCount: 4, parentId: 'proc-003' }
    ]
  },
  {
    id: 'proc-004',
    nombre: 'Transformación Digital',
    procesoId: 'TD',
    procesoNombre: 'Transformación Digital',
    color: '#F59E0B',
    icono: '💻',
    documentosCount: 12
  },
  {
    id: 'proc-005',
    nombre: 'Formación para la Vida',
    procesoId: 'FV',
    procesoNombre: 'Formación para la Vida',
    color: '#EC4899',
    icono: '🎓',
    documentosCount: 9
  }
];

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: 'doc-001',
    nombre: 'Plan Anual Control Interno 2025.pdf',
    tipo: 'Plan Anual',
    carpetaId: 'sub-001',
    procesoId: 'GF',
    procesoNombre: 'Gestión Financiera',
    tamano: 2456789,
    extension: 'pdf',
    estado: 'Aprobado',
    version: 3,
    creadoPor: {
      id: 'usr-001',
      nombre: 'Fernando Ávila',
      iniciales: 'FA'
    },
    fechaCreacion: '15/01/2025',
    fechaModificacion: '18/01/2025',
    tags: ['Plan Anual', 'Decreto 648', '2025'],
    descripcion: 'Plan Anual de Control Interno con 5 roles Decreto 648/2017',
    url: '/docs/plan-anual-2025.pdf'
  },
  {
    id: 'doc-002',
    nombre: 'Informe Auditoría Gestión Financiera - Preliminar.docx',
    tipo: 'Informe Preliminar',
    carpetaId: 'sub-002',
    procesoId: 'GF',
    procesoNombre: 'Gestión Financiera',
    tamano: 1234567,
    extension: 'docx',
    estado: 'En Revisión',
    version: 2,
    creadoPor: {
      id: 'usr-002',
      nombre: 'Catalina Rubio',
      iniciales: 'CR'
    },
    fechaCreacion: '10/12/2024',
    fechaModificacion: '15/12/2024',
    tags: ['Informe', 'Gestión Financiera', 'Preliminar'],
    descripcion: 'Informe preliminar de auditoría a procesos financieros',
    auditoriaId: 'AUD-2024-012',
    url: '/docs/informe-preliminar-gf.docx'
  },
  {
    id: 'doc-003',
    nombre: 'Plan Mejoramiento Gestión Financiera.xlsx',
    tipo: 'Plan Mejoramiento',
    carpetaId: 'sub-003',
    procesoId: 'GF',
    procesoNombre: 'Gestión Financiera',
    tamano: 987654,
    extension: 'xlsx',
    estado: 'Aprobado',
    version: 1,
    creadoPor: {
      id: 'usr-003',
      nombre: 'Lucila Villamil',
      iniciales: 'LV'
    },
    fechaCreacion: '20/11/2024',
    fechaModificacion: '25/11/2024',
    tags: ['Plan Mejoramiento', 'Hallazgos', 'Acciones Correctivas'],
    descripcion: 'Plan de mejoramiento con 6 acciones correctivas',
    auditoriaId: 'AUD-2024-012',
    url: '/docs/plan-mejoramiento-gf.xlsx'
  },
  {
    id: 'doc-004',
    nombre: 'Lista Chequeo Control Interno.pdf',
    tipo: 'Lista Chequeo',
    carpetaId: 'sub-002',
    procesoId: 'GF',
    procesoNombre: 'Gestión Financiera',
    tamano: 456789,
    extension: 'pdf',
    estado: 'Aprobado',
    version: 1,
    creadoPor: {
      id: 'usr-001',
      nombre: 'Fernando Ávila',
      iniciales: 'FA'
    },
    fechaCreacion: '05/12/2024',
    fechaModificacion: '05/12/2024',
    tags: ['Lista Chequeo', 'Control Interno'],
    descripcion: 'Lista de chequeo para evaluación de controles',
    auditoriaId: 'AUD-2024-012',
    url: '/docs/lista-chequeo.pdf'
  },
  {
    id: 'doc-005',
    nombre: 'Oficio Apertura Auditoría AUD-2025-001.pdf',
    tipo: 'Oficio',
    carpetaId: 'sub-005',
    procesoId: 'GA',
    procesoNombre: 'Gestión Administrativa',
    tamano: 234567,
    extension: 'pdf',
    estado: 'Aprobado',
    version: 1,
    creadoPor: {
      id: 'usr-002',
      nombre: 'Catalina Rubio',
      iniciales: 'CR'
    },
    fechaCreacion: '02/01/2025',
    fechaModificacion: '02/01/2025',
    tags: ['Oficio', 'Apertura', 'Auditoría'],
    descripcion: 'Oficio de apertura de auditoría a Gestión Administrativa',
    auditoriaId: 'AUD-2025-001',
    url: '/docs/oficio-apertura.pdf'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ExpedienteDigital() {
  const [vista, setVista] = useState<'grid' | 'list'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null);
  const [carpetasAbiertas, setCarpetasAbiertas] = useState<Set<string>>(new Set());
  const [documentos] = useState<Documento[]>(DOCUMENTOS_MOCK);
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | 'Todos'>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumento | 'Todos'>('Todos');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'fecha' | 'tamano'>('fecha');

  // Filtrar documentos
  const documentosFiltrados = documentos.filter(doc => {
    const cumpleBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase()));
    const cumpleTipo = filtroTipo === 'Todos' || doc.tipo === filtroTipo;
    const cumpleEstado = filtroEstado === 'Todos' || doc.estado === filtroEstado;
    const cumpleCarpeta = !carpetaSeleccionada || doc.carpetaId === carpetaSeleccionada.id;
    
    return cumpleBusqueda && cumpleTipo && cumpleEstado && cumpleCarpeta;
  });

  // Ordenar documentos
  const documentosOrdenados = [...documentosFiltrados].sort((a, b) => {
    if (ordenarPor === 'nombre') return a.nombre.localeCompare(b.nombre);
    if (ordenarPor === 'tamano') return b.tamano - a.tamano;
    // Por defecto: fecha
    return new Date(b.fechaModificacion).getTime() - new Date(a.fechaModificacion).getTime();
  });

  const toggleCarpeta = (carpetaId: string) => {
    const nuevasCarpetas = new Set(carpetasAbiertas);
    if (nuevasCarpetas.has(carpetaId)) {
      nuevasCarpetas.delete(carpetaId);
    } else {
      nuevasCarpetas.add(carpetaId);
    }
    setCarpetasAbiertas(nuevasCarpetas);
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDescargar = (doc: Documento) => {
    toast.success(`Descargando: ${doc.nombre}`);
  };

  const handleEliminar = (doc: Documento) => {
    toast.error(`¿Eliminar ${doc.nombre}?`);
  };

  const handleVer = (doc: Documento) => {
    toast.info(`Abriendo: ${doc.nombre}`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-600 mb-1">
            Expediente Digital
          </h1>
          <p className="text-sm text-gray-600">
            Gestión documental centralizada - Control Interno de Gestión
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={vista === 'grid' ? 'default' : 'outline'}
            onClick={() => setVista('grid')}
            className="gap-2"
          >
            <Grid className="w-4 h-4" />
            Cuadrícula
          </Button>
          <Button
            variant={vista === 'list' ? 'default' : 'outline'}
            onClick={() => setVista('list')}
            className="gap-2"
          >
            <ListIcon className="w-4 h-4" />
            Lista
          </Button>
          <Button className="gap-2" style={{ background: '#003DA5' }}>
            <Upload className="w-4 h-4" />
            Subir Documento
          </Button>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, descripción o tags..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Plan Anual">Plan Anual</option>
            <option value="Programa Anual">Programa Anual</option>
            <option value="Oficio">Oficio</option>
            <option value="Informe Preliminar">Informe Preliminar</option>
            <option value="Informe Final">Informe Final</option>
            <option value="Plan Mejoramiento">Plan Mejoramiento</option>
            <option value="Lista Chequeo">Lista Chequeo</option>
            <option value="Evidencia">Evidencia</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="En Revisión">En Revisión</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Archivado">Archivado</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Ordenar por:</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={ordenarPor === 'fecha' ? 'default' : 'outline'}
              onClick={() => setOrdenarPor('fecha')}
            >
              Fecha
            </Button>
            <Button
              size="sm"
              variant={ordenarPor === 'nombre' ? 'default' : 'outline'}
              onClick={() => setOrdenarPor('nombre')}
            >
              Nombre
            </Button>
            <Button
              size="sm"
              variant={ordenarPor === 'tamano' ? 'default' : 'outline'}
              onClick={() => setOrdenarPor('tamano')}
            >
              Tamaño
            </Button>
          </div>
        </div>
      </Card>

      {/* LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SIDEBAR - ÁRBOL DE CARPETAS */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" style={{ color: '#003DA5' }} />
              Procesos Auditables
            </h3>

            <div className="space-y-1">
              {/* Opción "Todos" */}
              <motion.button
                whileHover={{ x: 4 }}
                onClick={() => setCarpetaSeleccionada(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  !carpetaSeleccionada
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>Todos los documentos</span>
                  <Badge className="ml-auto text-xs">{documentos.length}</Badge>
                </div>
              </motion.button>

              {/* Carpetas de procesos */}
              {PROCESOS_AUDITORIAS.map((carpeta) => (
                <div key={carpeta.id}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      setCarpetaSeleccionada(carpeta);
                      if (carpeta.subcarpetas) toggleCarpeta(carpeta.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      carpetaSeleccionada?.id === carpeta.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {carpeta.subcarpetas && (
                        <span>
                          {carpetasAbiertas.has(carpeta.id) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </span>
                      )}
                      <span className="text-base">{carpeta.icono}</span>
                      <span className="truncate flex-1">{carpeta.nombre}</span>
                      <Badge className="text-xs" style={{ background: carpeta.color }}>
                        {carpeta.documentosCount}
                      </Badge>
                    </div>
                  </motion.button>

                  {/* Subcarpetas */}
                  {carpeta.subcarpetas && carpetasAbiertas.has(carpeta.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {carpeta.subcarpetas.map((sub) => (
                        <motion.button
                          key={sub.id}
                          whileHover={{ x: 4 }}
                          onClick={() => setCarpetaSeleccionada(sub)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            carpetaSeleccionada?.id === sub.id
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{sub.icono}</span>
                            <span className="truncate flex-1 text-xs">{sub.nombre}</span>
                            <Badge className="text-xs bg-gray-200 text-gray-700">
                              {sub.documentosCount}
                            </Badge>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ÁREA DE DOCUMENTOS */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Breadcrumb */}
            {carpetaSeleccionada && (
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <button
                  onClick={() => setCarpetaSeleccionada(null)}
                  className="hover:text-blue-600"
                >
                  Inicio
                </button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-900 font-semibold">
                  {carpetaSeleccionada.nombre}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900">
                {carpetaSeleccionada ? carpetaSeleccionada.nombre : 'Todos los documentos'}
              </h2>
              <span className="text-sm text-gray-500">
                {documentosOrdenados.length} documento(s)
              </span>
            </div>

            {/* VISTA CUADRÍCULA */}
            {vista === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {documentosOrdenados.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className="p-4 hover:shadow-lg transition-all border-2 border-gray-200 hover:border-blue-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 rounded-lg bg-blue-50">
                            <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVer(doc)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDescargar(doc)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEliminar(doc)}
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
                          {doc.nombre}
                        </h3>

                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {doc.descripcion}
                        </p>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Tag className="w-3 h-3" />
                            <Badge className="text-xs">{doc.tipo}</Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>{doc.creadoPor.nombre}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{doc.fechaModificacion}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <Badge
                            className={`text-xs ${
                              doc.estado === 'Aprobado'
                                ? 'bg-green-100 text-green-800'
                                : doc.estado === 'En Revisión'
                                ? 'bg-yellow-100 text-yellow-800'
                                : doc.estado === 'Borrador'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {doc.estado}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatearTamano(doc.tamano)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* VISTA LISTA */}
            {vista === 'list' && (
              <div className="space-y-2">
                <AnimatePresence>
                  {documentosOrdenados.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-all border border-gray-200 hover:border-blue-300">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-blue-50 flex-shrink-0">
                            <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">
                              {doc.nombre}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doc.creadoPor.nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {doc.fechaModificacion}
                              </span>
                              <span>{formatearTamano(doc.tamano)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className="text-xs">{doc.tipo}</Badge>
                            <Badge
                              className={`text-xs ${
                                doc.estado === 'Aprobado'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.estado === 'En Revisión'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {doc.estado}
                            </Badge>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVer(doc)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDescargar(doc)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEliminar(doc)}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* ESTADO VACÍO */}
            {documentosOrdenados.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-2">No se encontraron documentos</p>
                <p className="text-sm text-gray-400">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
