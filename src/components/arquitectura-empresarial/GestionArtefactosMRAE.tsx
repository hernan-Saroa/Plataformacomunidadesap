/**
 * Gestión de Artefactos MRAE - MinTIC
 * Componente para la gestión completa de artefactos del Marco de Referencia
 * de Arquitectura Empresarial según lineamientos MinTIC
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  Archive,
  Star,
  Share2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

// Tipos de artefactos MRAE
type TipoArtefacto = 
  | 'documento' 
  | 'modelo' 
  | 'matriz' 
  | 'diagrama' 
  | 'catalogo' 
  | 'politica'
  | 'procedimiento'
  | 'inventario';

type EstadoArtefacto = 'borrador' | 'revision' | 'aprobado' | 'publicado' | 'obsoleto';

interface Artefacto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoArtefacto;
  dominio: string;
  descripcion: string;
  version: string;
  estado: EstadoArtefacto;
  fechaCreacion: string;
  fechaActualizacion: string;
  autor: string;
  aprobador?: string;
  fechaAprobacion?: string;
  ubicacion: string;
  tags: string[];
  requisitosAsociados: string[];
  importante: boolean;
  tamano?: string;
  formato?: string;
}

export function GestionArtefactosMRAE() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroDominio, setFiltroDominio] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [vistaActiva, setVistaActiva] = useState<'cuadricula' | 'lista'>('lista');
  const [modalNuevoArtefacto, setModalNuevoArtefacto] = useState(false);
  const [artefactoSeleccionado, setArtefactoSeleccionado] = useState<Artefacto | null>(null);

  // Datos mock de artefactos
  const artefactos: Artefacto[] = [
    {
      id: 'ART-001',
      codigo: 'PETI-2025',
      nombre: 'Plan Estratégico de Tecnologías de la Información 2025-2029',
      tipo: 'documento',
      dominio: 'Estrategia TI',
      descripcion: 'Plan estratégico que define el rumbo de las TI en la institución',
      version: '3.0',
      estado: 'aprobado',
      fechaCreacion: '2024-11-15',
      fechaActualizacion: '2025-03-28',
      autor: 'Juan Pérez - Jefe de TI',
      aprobador: 'María González - Directora Administrativa',
      fechaAprobacion: '2025-03-30',
      ubicacion: '/documentos/estrategia/PETI-2025-v3.pdf',
      tags: ['PETI', 'Estrategia', 'Planeación', 'MinTIC'],
      requisitosAsociados: ['REQ-001'],
      importante: true,
      tamano: '2.4 MB',
      formato: 'PDF'
    },
    {
      id: 'ART-002',
      codigo: 'GOB-TI-001',
      nombre: 'Modelo de Gobierno de TI',
      tipo: 'modelo',
      dominio: 'Estrategia TI',
      descripcion: 'Marco de gobierno y toma de decisiones en TI',
      version: '2.1',
      estado: 'revision',
      fechaCreacion: '2024-10-20',
      fechaActualizacion: '2025-12-01',
      autor: 'Carlos Rodríguez - Arquitecto Empresarial',
      ubicacion: '/modelos/gobierno-ti/modelo-v2.1.pdf',
      tags: ['Gobierno', 'TI', 'Decisiones'],
      requisitosAsociados: ['REQ-002'],
      importante: true,
      tamano: '1.8 MB',
      formato: 'PDF'
    },
    {
      id: 'ART-003',
      codigo: 'CAT-DATOS-V2',
      nombre: 'Catálogo de Datos Institucional',
      tipo: 'catalogo',
      dominio: 'Información',
      descripcion: 'Inventario completo de activos de información de ESAP',
      version: '2.0',
      estado: 'revision',
      fechaCreacion: '2024-09-10',
      fechaActualizacion: '2025-11-25',
      autor: 'Laura Martínez - Arquitecto de Datos',
      ubicacion: '/catalogos/datos/catalogo-v2.xlsx',
      tags: ['Datos', 'Catálogo', 'Inventario'],
      requisitosAsociados: ['REQ-003'],
      importante: true,
      tamano: '856 KB',
      formato: 'Excel'
    },
    {
      id: 'ART-004',
      codigo: 'MOD-DATOS-ER',
      nombre: 'Modelo Entidad-Relación Institucional',
      tipo: 'diagrama',
      dominio: 'Información',
      descripcion: 'Modelo conceptual de datos de la entidad',
      version: '1.5',
      estado: 'borrador',
      fechaCreacion: '2025-01-15',
      fechaActualizacion: '2025-11-30',
      autor: 'Laura Martínez - Arquitecto de Datos',
      ubicacion: '/modelos/datos/er-v1.5.vsdx',
      tags: ['Modelo', 'ER', 'Base de Datos'],
      requisitosAsociados: ['REQ-004'],
      importante: false,
      tamano: '3.2 MB',
      formato: 'Visio'
    },
    {
      id: 'ART-005',
      codigo: 'INV-APP-2025',
      nombre: 'Inventario de Aplicaciones 2025',
      tipo: 'inventario',
      dominio: 'Sistemas de Información',
      descripcion: 'Registro completo de sistemas y aplicaciones institucionales',
      version: '4.0',
      estado: 'publicado',
      fechaCreacion: '2025-02-01',
      fechaActualizacion: '2025-04-28',
      autor: 'Diego Silva - Jefe de Desarrollo',
      aprobador: 'Juan Pérez - Jefe de TI',
      fechaAprobacion: '2025-04-30',
      ubicacion: '/inventarios/aplicaciones/inv-2025-v4.xlsx',
      tags: ['Aplicaciones', 'Inventario', 'Sistemas'],
      requisitosAsociados: ['REQ-005'],
      importante: true,
      tamano: '1.1 MB',
      formato: 'Excel'
    },
    {
      id: 'ART-006',
      codigo: 'CAT-SERV-TI',
      nombre: 'Catálogo de Servicios TI',
      tipo: 'catalogo',
      dominio: 'Servicios Tecnológicos',
      descripcion: 'Catálogo de servicios tecnológicos con niveles de servicio',
      version: '3.2',
      estado: 'aprobado',
      fechaCreacion: '2024-08-10',
      fechaActualizacion: '2025-12-03',
      autor: 'Ana Torres - Coordinadora Infraestructura',
      aprobador: 'Juan Pérez - Jefe de TI',
      fechaAprobacion: '2025-12-05',
      ubicacion: '/catalogos/servicios/catalogo-v3.2.pdf',
      tags: ['Servicios', 'TI', 'SLA'],
      requisitosAsociados: ['REQ-006'],
      importante: true,
      tamano: '2.1 MB',
      formato: 'PDF'
    },
    {
      id: 'ART-007',
      codigo: 'PLAN-CAP-2025',
      nombre: 'Plan de Capacitación Digital 2025',
      tipo: 'documento',
      dominio: 'Uso y Apropiación',
      descripcion: 'Programa de formación en competencias digitales',
      version: '1.0',
      estado: 'revision',
      fechaCreacion: '2025-10-01',
      fechaActualizacion: '2025-11-20',
      autor: 'Patricia Gómez - Talento Humano',
      ubicacion: '/planes/capacitacion/plan-2025.docx',
      tags: ['Capacitación', 'Digital', 'Formación'],
      requisitosAsociados: ['REQ-007'],
      importante: false,
      tamano: '745 KB',
      formato: 'Word'
    },
    {
      id: 'ART-008',
      codigo: 'POL-DATOS-001',
      nombre: 'Política de Calidad de Datos',
      tipo: 'politica',
      dominio: 'Información',
      descripcion: 'Política formal de gestión de calidad de datos',
      version: '1.0',
      estado: 'borrador',
      fechaCreacion: '2025-11-01',
      fechaActualizacion: '2025-12-04',
      autor: 'Laura Martínez - Arquitecto de Datos',
      ubicacion: '/politicas/datos/calidad-v1.pdf',
      tags: ['Política', 'Datos', 'Calidad'],
      requisitosAsociados: ['REQ-004'],
      importante: true,
      tamano: '658 KB',
      formato: 'PDF'
    },
    {
      id: 'ART-009',
      codigo: 'MAT-MAD-NAC',
      nombre: 'Matriz de Madurez AE - Nacional',
      tipo: 'matriz',
      dominio: 'Estrategia TI',
      descripcion: 'Evaluación de madurez de arquitectura empresarial nivel nacional',
      version: '2.0',
      estado: 'aprobado',
      fechaCreacion: '2024-12-01',
      fechaActualizacion: '2025-06-15',
      autor: 'Carlos Rodríguez - Arquitecto Empresarial',
      aprobador: 'Rector Nacional',
      fechaAprobacion: '2025-06-20',
      ubicacion: '/matrices/madurez/nacional-v2.xlsx',
      tags: ['Madurez', 'AE', 'Nacional'],
      requisitosAsociados: ['REQ-008'],
      importante: true,
      tamano: '924 KB',
      formato: 'Excel'
    },
    {
      id: 'ART-010',
      codigo: 'PROC-GEST-CAMB',
      nombre: 'Procedimiento de Gestión de Cambios',
      tipo: 'procedimiento',
      dominio: 'Sistemas de Información',
      descripcion: 'Procedimiento formal para gestión de cambios en sistemas',
      version: '1.2',
      estado: 'publicado',
      fechaCreacion: '2024-05-10',
      fechaActualizacion: '2025-09-12',
      autor: 'Diego Silva - Jefe de Desarrollo',
      aprobador: 'Juan Pérez - Jefe de TI',
      fechaAprobacion: '2025-09-15',
      ubicacion: '/procedimientos/gestion-cambios-v1.2.pdf',
      tags: ['Procedimiento', 'Cambios', 'Desarrollo'],
      requisitosAsociados: [],
      importante: false,
      tamano: '1.3 MB',
      formato: 'PDF'
    }
  ];

  // Filtrar artefactos
  const artefactosFiltrados = artefactos.filter(art => {
    const matchBusqueda = art.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          art.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          art.tags.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase()));
    const matchTipo = filtroTipo === 'todos' || art.tipo === filtroTipo;
    const matchDominio = filtroDominio === 'todos' || art.dominio === filtroDominio;
    const matchEstado = filtroEstado === 'todos' || art.estado === filtroEstado;
    
    return matchBusqueda && matchTipo && matchDominio && matchEstado;
  });

  // Estadísticas
  const stats = {
    total: artefactos.length,
    aprobados: artefactos.filter(a => a.estado === 'aprobado').length,
    enRevision: artefactos.filter(a => a.estado === 'revision').length,
    borradores: artefactos.filter(a => a.estado === 'borrador').length,
    publicados: artefactos.filter(a => a.estado === 'publicado').length
  };

  const getEstadoColor = (estado: EstadoArtefacto) => {
    switch (estado) {
      case 'publicado':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'aprobado':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'revision':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'borrador':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'obsoleto':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: EstadoArtefacto) => {
    switch (estado) {
      case 'publicado':
      case 'aprobado':
        return <CheckCircle className="size-3" />;
      case 'revision':
        return <Clock className="size-3" />;
      case 'borrador':
        return <Edit className="size-3" />;
      case 'obsoleto':
        return <Archive className="size-3" />;
      default:
        return <AlertCircle className="size-3" />;
    }
  };

  const getTipoIcon = (tipo: TipoArtefacto) => {
    switch (tipo) {
      case 'documento':
        return <FileText className="size-5 text-blue-600" />;
      case 'modelo':
        return <FolderOpen className="size-5 text-purple-600" />;
      case 'matriz':
        return <Tag className="size-5 text-green-600" />;
      case 'diagrama':
        return <Share2 className="size-5 text-amber-600" />;
      case 'catalogo':
        return <FolderOpen className="size-5 text-pink-600" />;
      case 'politica':
        return <FileText className="size-5 text-red-600" />;
      case 'procedimiento':
        return <FileText className="size-5 text-indigo-600" />;
      case 'inventario':
        return <Tag className="size-5 text-teal-600" />;
      default:
        return <FileText className="size-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">Gestión de Artefactos MRAE</h2>
          <p className="text-gray-600 mt-1">
            Repositorio de artefactos del Marco de Referencia de Arquitectura Empresarial
          </p>
        </div>
        <Button onClick={() => setModalNuevoArtefacto(true)}>
          <Plus className="size-4 mr-2" />
          Nuevo Artefacto
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl mt-1 text-gray-900">{stats.total}</p>
            </div>
            <FileText className="size-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Publicados</p>
              <p className="text-2xl mt-1 text-green-600">{stats.publicados}</p>
            </div>
            <CheckCircle className="size-8 text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprobados</p>
              <p className="text-2xl mt-1 text-blue-600">{stats.aprobados}</p>
            </div>
            <CheckCircle className="size-8 text-blue-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Revisión</p>
              <p className="text-2xl mt-1 text-amber-600">{stats.enRevision}</p>
            </div>
            <Clock className="size-8 text-amber-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Borradores</p>
              <p className="text-2xl mt-1 text-gray-600">{stats.borradores}</p>
            </div>
            <Edit className="size-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Buscar artefactos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="documento">Documento</SelectItem>
              <SelectItem value="modelo">Modelo</SelectItem>
              <SelectItem value="matriz">Matriz</SelectItem>
              <SelectItem value="diagrama">Diagrama</SelectItem>
              <SelectItem value="catalogo">Catálogo</SelectItem>
              <SelectItem value="politica">Política</SelectItem>
              <SelectItem value="procedimiento">Procedimiento</SelectItem>
              <SelectItem value="inventario">Inventario</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroDominio} onValueChange={setFiltroDominio}>
            <SelectTrigger>
              <SelectValue placeholder="Dominio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los dominios</SelectItem>
              <SelectItem value="Estrategia TI">Estrategia TI</SelectItem>
              <SelectItem value="Información">Información</SelectItem>
              <SelectItem value="Sistemas de Información">Sistemas de Información</SelectItem>
              <SelectItem value="Servicios Tecnológicos">Servicios Tecnológicos</SelectItem>
              <SelectItem value="Uso y Apropiación">Uso y Apropiación</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="revision">En Revisión</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
              <SelectItem value="obsoleto">Obsoleto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Resultados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {artefactosFiltrados.length} artefacto{artefactosFiltrados.length !== 1 ? 's' : ''} encontrado{artefactosFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3">
          {artefactosFiltrados.map((art) => (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icono */}
                  <div className="shrink-0">
                    {getTipoIcon(art.tipo)}
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {art.importante && (
                          <Star className="size-4 text-amber-500 fill-amber-500" />
                        )}
                        <h4 className="text-gray-900">{art.nombre}</h4>
                        <Badge variant="outline" className="text-xs">
                          {art.codigo}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          v{art.version}
                        </Badge>
                        <Badge className={`${getEstadoColor(art.estado)} border text-xs`}>
                          <span className="flex items-center gap-1">
                            {getEstadoIcon(art.estado)}
                            {art.estado.charAt(0).toUpperCase() + art.estado.slice(1)}
                          </span>
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{art.descripcion}</p>

                    <div className="flex items-center gap-6 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Tag className="size-3" />
                        {art.dominio}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="size-3" />
                        {art.autor}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {new Date(art.fechaActualizacion).toLocaleDateString('es-CO')}
                      </span>
                      {art.tamano && (
                        <span className="flex items-center gap-1.5">
                          <FileText className="size-3" />
                          {art.tamano}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {art.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {art.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Aprobación */}
                    {art.aprobador && (
                      <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 inline-flex items-center gap-2">
                        <CheckCircle className="size-3" />
                        Aprobado por {art.aprobador} el {new Date(art.fechaAprobacion!).toLocaleDateString('es-CO')}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm">
                      <Eye className="size-4 mr-2" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="size-4 mr-2" />
                      Descargar
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {artefactosFiltrados.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="size-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron artefactos</p>
                <p className="text-sm text-gray-500 mt-1">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Nuevo Artefacto */}
      <Dialog open={modalNuevoArtefacto} onOpenChange={setModalNuevoArtefacto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Artefacto MRAE</DialogTitle>
            <DialogDescription>
              Registra un nuevo artefacto del Marco de Referencia de Arquitectura Empresarial
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" placeholder="Ej: PETI-2025" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Versión</Label>
                <Input id="version" placeholder="Ej: 1.0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Artefacto</Label>
              <Input id="nombre" placeholder="Nombre descriptivo" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documento">Documento</SelectItem>
                    <SelectItem value="modelo">Modelo</SelectItem>
                    <SelectItem value="matriz">Matriz</SelectItem>
                    <SelectItem value="diagrama">Diagrama</SelectItem>
                    <SelectItem value="catalogo">Catálogo</SelectItem>
                    <SelectItem value="politica">Política</SelectItem>
                    <SelectItem value="procedimiento">Procedimiento</SelectItem>
                    <SelectItem value="inventario">Inventario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dominio">Dominio MRAE</Label>
                <Select>
                  <SelectTrigger id="dominio">
                    <SelectValue placeholder="Seleccionar dominio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estrategia-ti">Estrategia TI</SelectItem>
                    <SelectItem value="informacion">Información</SelectItem>
                    <SelectItem value="sistemas">Sistemas de Información</SelectItem>
                    <SelectItem value="servicios">Servicios Tecnológicos</SelectItem>
                    <SelectItem value="uso">Uso y Apropiación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" placeholder="Descripción del artefacto" rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#003DA5] transition-colors cursor-pointer">
                <Upload className="size-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Haz clic o arrastra un archivo aquí
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Word, Excel, Visio (máx. 10 MB)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNuevoArtefacto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalNuevoArtefacto(false)}>
              Crear Artefacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
