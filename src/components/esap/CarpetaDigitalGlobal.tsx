/**
 * CARPETA DIGITAL GLOBAL - DISEÑO EXACTO ESAP
 * Sistema de gestión documental según diseño oficial
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen,
  FileText,
  Search,
  Upload,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Star,
  Download,
  Share2,
  Trash2,
  Eye,
  Award,
  GraduationCap,
  Archive,
  Image as ImageIcon,
  File,
  Filter,
  List,
  Grid,
  Folder
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { DocumentoVistaCompleta } from './DocumentoVistaCompleta';

interface DocumentoUsuario {
  id: string;
  nombre: string;
  tipo: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  categoria: 'personal' | 'academico' | 'laboral' | 'certificados' | 'otros';
  tamaño: number;
  fechaSubida: string;
  estado: 'completo' | 'pendiente' | 'vencido';
  subidoPor: string;
  favorito: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  cedula: string;
  roles: Array<{ name: string }>;
  status: string;
  asignacionesSedes?: Array<{
    unidad?: {
      nombre?: string;
      nivel?: string;
    };
  }>;
}

interface CarpetaDigitalGlobalProps {
  usuarios: Usuario[];
}

type VistaActual = 'carpetas' | 'archivos';
type CategoriaTab = 'todos' | 'personal' | 'academico' | 'certificados' | 'laboral' | 'otros';

const CATEGORIES = [
  { id: 'personal', name: 'Personal', icon: User, color: '#3B82F6' },
  { id: 'academico', name: 'Académico', icon: GraduationCap, color: '#10B981' },
  { id: 'certificados', name: 'Certificados', icon: Award, color: '#8B5CF6' },
  { id: 'laboral', name: 'Laboral', icon: FileText, color: '#F59E0B' },
  { id: 'otros', name: 'Otros', icon: Archive, color: '#6B7280' }
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'jpg':
    case 'png': return ImageIcon;
    case 'docx': return FileText;
    case 'xlsx': return FileText;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case 'pdf': return '#EF4444';
    case 'jpg':
    case 'png': return '#8B5CF6';
    case 'docx': return '#3B82F6';
    case 'xlsx': return '#10B981';
    default: return '#6B7280';
  }
};

const formatFecha = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return `Hace ${Math.floor(diffDays / 30)} meses`;
};

const getInitials = (nombre: string) => {
  if (!nombre) return 'NN';
  const parts = nombre.split(' ');
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
};

export function CarpetaDigitalGlobal({ usuarios }: CarpetaDigitalGlobalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [vistaActual, setVistaActual] = useState<VistaActual>('carpetas');
  const [carpetaAbierta, setCarpetaAbierta] = useState<any | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<DocumentoUsuario | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaTab>('todos');
  const [seccionExpandida, setSeccionExpandida] = useState(true);
  const [documentoEnVistaCompleta, setDocumentoEnVistaCompleta] = useState<DocumentoUsuario | null>(null);

  // Generar documentos mock
  const usuariosConDocumentos = useMemo(() => {
    return usuarios.map(usuario => {
      const numDocs = Math.floor(Math.random() * 20) + 5;
      const categorias: Array<'personal' | 'academico' | 'laboral' | 'certificados' | 'otros'> = 
        ['personal', 'academico', 'laboral', 'certificados', 'otros'];
      const estados: Array<'completo' | 'pendiente' | 'vencido'> = 
        ['completo', 'completo', 'completo', 'pendiente', 'vencido'];
      const tiposArchivo: Array<'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'> = 
        ['pdf', 'pdf', 'pdf', 'jpg', 'docx', 'xlsx'];
      const nombresArchivo = [
        'Cédula de Ciudadanía', 'Diploma Profesional', 'Certificado Laboral', 
        'Hoja de Vida', 'Acta de Grado', 'Certificado Python',
        'Referencias Laborales', 'Título Bachiller', 'Certificado Inglés',
        'Contrato de Trabajo', 'Foto Documento', 'Carta de Recomendación'
      ];
      
      const documentos: DocumentoUsuario[] = Array.from({ length: numDocs }, (_, i) => {
        const tipo = tiposArchivo[Math.floor(Math.random() * tiposArchivo.length)];
        const categoria = categorias[Math.floor(Math.random() * categorias.length)];
        const nombre = nombresArchivo[Math.floor(Math.random() * nombresArchivo.length)];
        
        return {
          id: `doc-${usuario.id}-${i}`,
          nombre: `${nombre}.${tipo}`,
          tipo,
          categoria,
          tamaño: Math.floor(Math.random() * 5000000) + 100000,
          fechaSubida: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          estado: estados[Math.floor(Math.random() * estados.length)],
          subidoPor: Math.random() > 0.5 ? 'Usuario' : 'Admin Sistema',
          favorito: Math.random() > 0.8
        };
      });

      const porCategoria = {
        personal: documentos.filter(d => d.categoria === 'personal').length,
        academico: documentos.filter(d => d.categoria === 'academico').length,
        laboral: documentos.filter(d => d.categoria === 'laboral').length,
        certificados: documentos.filter(d => d.categoria === 'certificados').length,
        otros: documentos.filter(d => d.categoria === 'otros').length,
      };

      const porEstado = {
        completo: documentos.filter(d => d.estado === 'completo').length,
        pendiente: documentos.filter(d => d.estado === 'pendiente').length,
        vencido: documentos.filter(d => d.estado === 'vencido').length,
      };

      return {
        ...usuario,
        documentos,
        totalDocumentos: documentos.length,
        porCategoria,
        porEstado,
      };
    });
  }, [usuarios]);

  // Filtrar carpetas
  const carpetasFiltradas = useMemo(() => {
    if (vistaActual === 'archivos') return [];
    
    return usuariosConDocumentos.filter(usuario => {
      const matchSearch = searchTerm === '' || 
        (usuario.nombre && usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (usuario.cedula && usuario.cedula.includes(searchTerm)) ||
        (usuario.email && usuario.email.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchSearch;
    });
  }, [usuariosConDocumentos, searchTerm, vistaActual]);

  // Filtrar archivos por categoría
  const archivosFiltrados = useMemo(() => {
    if (vistaActual === 'carpetas' || !carpetaAbierta) return [];
    
    let archivos = carpetaAbierta.documentos;

    if (categoriaActiva !== 'todos') {
      archivos = archivos.filter((doc: DocumentoUsuario) => doc.categoria === categoriaActiva);
    }

    if (searchTerm !== '') {
      archivos = archivos.filter((doc: DocumentoUsuario) => 
        doc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return archivos;
  }, [carpetaAbierta, categoriaActiva, searchTerm, vistaActual]);

  // Estadísticas globales (para vista de carpetas)
  const estadisticasGlobales = useMemo(() => {
    const totalDocs = usuariosConDocumentos.reduce((sum, u) => sum + u.totalDocumentos, 0);
    const totalCompletos = usuariosConDocumentos.reduce((sum, u) => sum + u.porEstado.completo, 0);
    const totalPendientes = usuariosConDocumentos.reduce((sum, u) => sum + u.porEstado.pendiente, 0);
    const totalVencidos = usuariosConDocumentos.reduce((sum, u) => sum + u.porEstado.vencido, 0);
    const totalRechazados = Math.floor(totalVencidos * 0.7); // Simular rechazados

    // Contar tipos de formatos únicos
    const formatosSet = new Set<string>();
    usuariosConDocumentos.forEach(u => {
      u.documentos.forEach((d: DocumentoUsuario) => formatosSet.add(d.tipo));
    });

    return {
      carpetas: usuariosConDocumentos.length,
      documentos: totalDocs,
      formatos: formatosSet.size,
      completos: totalCompletos,
      rechazados: totalRechazados,
      vencidos: totalVencidos,
    };
  }, [usuariosConDocumentos]);

  // Estadísticas de carpeta individual
  const estadisticasCarpeta = useMemo(() => {
    if (!carpetaAbierta) return { total: 0, validados: 0, pendientes: 0 };
    
    const docs = carpetaAbierta.documentos;
    return {
      total: docs.length,
      validados: docs.filter((d: DocumentoUsuario) => d.estado === 'completo').length,
      pendientes: docs.filter((d: DocumentoUsuario) => d.estado === 'pendiente').length,
    };
  }, [carpetaAbierta]);

  // Contadores por categoría
  const contadoresCategorias = useMemo(() => {
    if (!carpetaAbierta) return {};
    
    const docs = carpetaAbierta.documentos;
    return {
      todos: docs.length,
      personal: docs.filter((d: DocumentoUsuario) => d.categoria === 'personal').length,
      academico: docs.filter((d: DocumentoUsuario) => d.categoria === 'academico').length,
      certificados: docs.filter((d: DocumentoUsuario) => d.categoria === 'certificados').length,
      laboral: docs.filter((d: DocumentoUsuario) => d.categoria === 'laboral').length,
      otros: docs.filter((d: DocumentoUsuario) => d.categoria === 'otros').length,
    };
  }, [carpetaAbierta]);

  const abrirCarpeta = (usuario: any) => {
    setCarpetaAbierta(usuario);
    setVistaActual('archivos');
    setSearchTerm('');
    setCategoriaActiva('todos');
    setArchivoSeleccionado(null);
  };

  const volverACarpetas = () => {
    setCarpetaAbierta(null);
    setVistaActual('carpetas');
    setSearchTerm('');
    setArchivoSeleccionado(null);
  };

  const handleDownload = (doc: DocumentoUsuario) => {
    toast.success(`Descargando ${doc.nombre}`);
  };

  const handleValidate = (doc: DocumentoUsuario) => {
    toast.success(`${doc.nombre} validado correctamente`);
  };

  const handleToggleFavorite = (doc: DocumentoUsuario) => {
    toast.success(doc.favorito ? 'Eliminado de favoritos' : 'Agregado a favoritos');
  };

  const handleShare = (doc: DocumentoUsuario) => {
    toast.success(`Enlace de ${doc.nombre} copiado al portapapeles`);
  };

  const handleDelete = (doc: DocumentoUsuario) => {
    toast.success(`${doc.nombre} eliminado correctamente`);
  };

  // VISTA DE CARPETAS (Lista principal)
  if (vistaActual === 'carpetas') {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* Contenido de Carpeta Digital */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 text-gray-900" style={{ color: '#111827' }}>
            {/* Estadísticas en fila */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 text-gray-900" style={{ color: '#111827' }}>
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Carpeta</p>
                  <p className="text-2xl font-bold text-gray-900">{estadisticasGlobales.carpetas}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">Documentos</p>
                  <p className="text-2xl font-bold text-blue-600">{estadisticasGlobales.documentos}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-600 mb-1">Formatos</p>
                  <p className="text-2xl font-bold text-purple-600">{estadisticasGlobales.formatos}</p>
                </div>
                <div>
                  <p className="text-xs text-[#1e5da8] mb-1">Completos</p>
                  <p className="text-2xl font-bold text-[#1e5da8]">{estadisticasGlobales.completos}</p>
                </div>
                <div>
                  <p className="text-xs text-orange-600 mb-1">Rechazados</p>
                  <p className="text-2xl font-bold text-orange-600">{estadisticasGlobales.rechazados}</p>
                </div>
                <div>
                  <p className="text-xs text-red-600 mb-1">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{estadisticasGlobales.vencidos}</p>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda y filtros */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar carpetas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-[--esap-primary] focus:border-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
            </div>

            {/* Tabla de carpetas */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Documentos</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Modificado</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carpetasFiltradas.length > 0 ? (
                    carpetasFiltradas.map((usuario) => (
                      <tr
                        key={usuario.id}
                        onClick={() => abrirCarpeta(usuario)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                              <p className="text-xs text-gray-500">{usuario.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{usuario.totalDocumentos} archivos</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {usuario.porEstado.completo > 0 && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                {usuario.porEstado.completo}
                              </Badge>
                            )}
                            {usuario.porEstado.pendiente > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs px-2 py-0.5">
                                {usuario.porEstado.pendiente}
                              </Badge>
                            )}
                            {usuario.porEstado.vencido > 0 && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-2 py-0.5">
                                {usuario.porEstado.vencido}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">Hace {Math.floor(Math.random() * 7) + 1} días</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirCarpeta(usuario);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors inline-flex"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-900 mb-1">No hay carpetas</h3>
                        <p className="text-sm text-gray-600">Ajusta los filtros de búsqueda</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA INTERNA DE ARCHIVOS
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header azul ESAP */}
      <div className="bg-[--esap-primary] px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={volverACarpetas}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 text-gray-900">
              <FolderOpen className="w-5 h-5" />
              <div className="flex items-center gap-2 text-sm">
                <span>Carpeta Digital</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium">{carpetaAbierta?.nombre || 'Usuario'}</span>
                <ChevronRight className="w-4 h-4" />
                <span>CC</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{estadisticasCarpeta.total}</p>
              <p className="text-xs opacity-90 text-gray-900">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{estadisticasCarpeta.validados}</p>
              <p className="text-xs opacity-90 text-gray-900">Validados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{estadisticasCarpeta.pendientes}</p>
              <p className="text-xs opacity-90 text-gray-900">Pendientes</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-300 flex items-center justify-center font-bold text-[--esap-primary]">
              {getInitials(carpetaAbierta?.nombre || 'NN')}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido blanco */}
      <div className="flex-1 overflow-hidden flex bg-white text-gray-900" style={{ color: '#111827' }}>
        <div className={`flex-1 flex flex-col transition-all ${archivoSeleccionado ? 'mr-0' : ''}`}>
          {/* Avatar y nombre del usuario */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg">
                {getInitials(carpetaAbierta?.nombre || 'NN')}
              </div>
              <div>
                <p className="font-semibold text-gray-900" style={{ color: '#111827' }}>{carpetaAbierta?.nombre || 'Usuario'}</p>
                <p className="text-sm text-gray-900" style={{ color: '#111827' }}>{carpetaAbierta?.cedula ? `CC ${carpetaAbierta.cedula}` : 'Sin documento'}</p>
              </div>
            </div>
          </div>

          {/* Tabs de categorías */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center gap-2 overflow-x-auto py-3">
              <button
                onClick={() => setCategoriaActiva('todos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  categoriaActiva === 'todos'
                    ? 'bg-blue-100 text-[--esap-primary] border border-[--esap-primary]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Todos</span>
                <span className="text-xs">{contadoresCategorias.todos || 0}</span>
              </button>

              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id as CategoriaTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    categoriaActiva === cat.id
                      ? 'bg-blue-100 text-[--esap-primary] border border-[--esap-primary]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {React.createElement(cat.icon, { className: 'w-4 h-4' })}
                  <span>{cat.name}</span>
                  <span className="text-xs">{contadoresCategorias[cat.id as keyof typeof contadoresCategorias] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Barra de búsqueda y botón subir */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[--esap-primary] focus:border-transparent bg-white"
              />
            </div>

            <button
              onClick={() => toast.info('Función de subir próximamente')}
              className="flex items-center gap-2 px-4 py-2 bg-[--esap-primary] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Documento</span>
            </button>
          </div>

          {/* Contenido de archivos */}
          <div className="flex-1 overflow-auto">
            {archivosFiltrados.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600">Tamaño</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600">Estado</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600">Modificado</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {archivosFiltrados.map((doc: DocumentoUsuario) => (
                    <tr
                      key={doc.id}
                      onDoubleClick={() => setDocumentoEnVistaCompleta(doc)}
                      onClick={() => setArchivoSeleccionado(doc)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        archivoSeleccionado?.id === doc.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {React.createElement(getFileIcon(doc.tipo), {
                            className: 'w-5 h-5 flex-shrink-0',
                            style: { color: getFileColor(doc.tipo) }
                          })}
                          <span className="text-sm font-medium text-gray-900">{doc.nombre}</span>
                          {doc.favorito && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{formatSize(doc.tamaño)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {doc.estado === 'completo' && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            Validado
                          </Badge>
                        )}
                        {doc.estado === 'pendiente' && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            Pendiente
                          </Badge>
                        )}
                        {doc.estado === 'vencido' && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            Vencido
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{formatFecha(doc.fechaSubida)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors inline-flex"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setArchivoSeleccionado(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(doc)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Compartir
                            </DropdownMenuItem>
                            {doc.estado !== 'completo' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleValidate(doc)}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-[#1e5da8]" />
                                  Validar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(doc)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No hay documentos</h3>
                  <p className="text-sm text-gray-600 mb-6">Aún no se han subido documentos</p>
                  <button
                    onClick={() => toast.info('Función de subir próximamente')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[--esap-primary] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir Primer Documento</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de previsualización lateral */}
        <AnimatePresence>
          {archivoSeleccionado && (
            <DocumentPreviewPanel 
              documento={archivoSeleccionado}
              onClose={() => setArchivoSeleccionado(null)}
              onDownload={() => handleDownload(archivoSeleccionado)}
              onValidate={() => {
                handleValidate(archivoSeleccionado);
                setArchivoSeleccionado({ ...archivoSeleccionado, estado: 'completo' });
              }}
              onToggleFavorite={() => {
                handleToggleFavorite(archivoSeleccionado);
                setArchivoSeleccionado({ ...archivoSeleccionado, favorito: !archivoSeleccionado.favorito });
              }}
              onShare={() => handleShare(archivoSeleccionado)}
              onDelete={() => {
                handleDelete(archivoSeleccionado);
                setArchivoSeleccionado(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Vista Completa */}
      <AnimatePresence>
        {documentoEnVistaCompleta && (
          <DocumentoVistaCompleta
            documento={documentoEnVistaCompleta}
            onClose={() => setDocumentoEnVistaCompleta(null)}
            onAprobar={() => {
              handleValidate(documentoEnVistaCompleta);
              if (archivoSeleccionado?.id === documentoEnVistaCompleta.id) {
                setArchivoSeleccionado({ ...documentoEnVistaCompleta, estado: 'completo' });
              }
              setDocumentoEnVistaCompleta(null);
            }}
            onRechazar={() => {
              toast.info(`${documentoEnVistaCompleta.nombre} ha sido rechazado`);
              setDocumentoEnVistaCompleta(null);
            }}
            onDownload={() => handleDownload(documentoEnVistaCompleta)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}