/**
 * DIRECTORIO DOCENTE - MÓDULO UNIFICADO
 * 
 * Centraliza TODOS los docentes de ESAP:
 * - Docentes de Planta (263 integrados)
 * - Docentes Hora Cátedra
 * - Aspirantes a Convocatorias
 * - Seleccionados en Convocatorias
 * - No Seleccionados
 * 
 * Incluye Carpeta Digital individual para cada docente
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  Download,
  Upload,
  UserPlus,
  FolderOpen,
  FileText,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  GraduationCap,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  TrendingUp,
  Eye
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { DigitalFolderSection } from '../esap/DigitalFolderSection';
import { TODOS_LOS_DOCENTES_ESAP } from '../../data/docentesESAPCompleto';
import { TODOS_LOS_DOCENTES } from '../../data/docentesGestionProfesoral';
import { 
  TODOS_LOS_CANDIDATOS, 
  CANDIDATOS_PENDIENTES,
  CANDIDATOS_SELECCIONADOS,
  CANDIDATOS_NO_SELECCIONADOS,
  getConvocatoriaById 
} from '../../data/convocatoriasData';
import { toast } from 'sonner@2.0.3';

// Tipos de docente
export type TipoDocente = 'planta' | 'catedra' | 'aspirante' | 'seleccionado' | 'no-seleccionado';
export type EstadoDocente = 'active' | 'inactive' | 'pending' | 'rejected';

interface DocenteDirectorio {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  tipoDocente: TipoDocente;
  estado: EstadoDocente;
  categoria?: string; // Titular, Asociado, Asistente, Auxiliar
  formacion?: string; // Doctorado, Maestría, Especialización
  vinculacion?: string; // Carrera1, Carrera2, Ocasional, etc.
  territorial?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  convocatoria?: {
    id: string;
    nombre: string;
    año: number;
  };
  fechaIngreso?: string;
  horasCatedra?: number;
  avatar?: string;
  lastLogin?: string;
}

export function DirectorioDocenteModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoDocente | 'all'>('all');
  const [estadoFilter, setEstadoFilter] = useState<EstadoDocente | 'all'>('all');
  const [territorialFilter, setTerritorialFilter] = useState<string>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocente, setSelectedDocente] = useState<DocenteDirectorio | null>(null);
  const [viewMode, setViewMode] = useState<'directorio' | 'carpeta-digital'>('directorio');
  
  const itemsPerPage = 10;

  // ============================================================================
  // UNIFICACIÓN DE TODOS LOS DOCENTES
  // ============================================================================
  
  const allDocentes: DocenteDirectorio[] = useMemo(() => {
    const docentes: DocenteDirectorio[] = [];

    // 1. DOCENTES DE PLANTA (263 integrados de ESAP)
    TODOS_LOS_DOCENTES_ESAP.forEach(doc => {
      const categoriaRole = doc.roles.find(r => r.code.startsWith('DOC_'));
      docentes.push({
        id: doc.id,
        personId: doc.personId,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        tipoDocente: 'planta',
        estado: doc.status === 'active' ? 'active' : 'inactive',
        categoria: categoriaRole?.name.replace('Docente ', ''),
        vinculacion: 'Planta',
        territorial: doc.sedes[0] ? {
          id: doc.sedes[0].id,
          nombre: doc.sedes[0].nombre,
          codigo: doc.sedes[0].codigo
        } : undefined,
        fechaIngreso: doc.enrollmentDate,
        avatar: doc.avatar,
        lastLogin: doc.lastLogin
      });
    });

    // 2. DOCENTES HORA CÁTEDRA (de Gestión Profesoral)
    TODOS_LOS_DOCENTES.forEach(doc => {
      // Evitar duplicados (si ya existe en planta)
      if (!docentes.find(d => d.documentNumber === doc.documentNumber)) {
        // Extraer sede/territorial
        const territorial = doc.sedes && doc.sedes[0] ? {
          id: doc.sedes[0].id,
          nombre: doc.sedes[0].nombre,
          codigo: doc.sedes[0].codigo
        } : undefined;

        docentes.push({
          id: doc.id,
          personId: doc.personId || doc.id,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phone: doc.phone || '+57 300 000 0000',
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          tipoDocente: 'catedra',
          estado: doc.status === 'active' ? 'active' : 'inactive',
          categoria: undefined, // UserWithSedes no tiene este campo
          formacion: undefined, // UserWithSedes no tiene este campo
          vinculacion: 'Hora Cátedra',
          territorial: territorial,
          horasCatedra: undefined, // UserWithSedes no tiene este campo
          fechaIngreso: doc.enrollmentDate,
          avatar: undefined
        });
      }
    });

    // 3. ASPIRANTES Y CANDIDATOS EN EVALUACIÓN (de datos centralizados)
    CANDIDATOS_PENDIENTES.forEach(cand => {
      // Evitar duplicados
      if (!docentes.find(d => d.documentNumber === cand.documentNumber)) {
        const convocatoria = getConvocatoriaById(cand.convocatoriaId);
        const estado: EstadoDocente = 
          cand.estado === 'pendiente' ? 'pending' :
          cand.estado === 'en-evaluacion' ? 'pending' : 'inactive';

        docentes.push({
          id: cand.id,
          personId: cand.personId,
          firstName: cand.firstName,
          lastName: cand.lastName,
          email: cand.email,
          phone: cand.phone,
          documentType: cand.documentType,
          documentNumber: cand.documentNumber,
          tipoDocente: 'aspirante',
          estado: estado,
          formacion: cand.formacion,
          convocatoria: convocatoria ? {
            id: convocatoria.id,
            nombre: convocatoria.titulo,
            año: convocatoria.año
          } : undefined,
          territorial: convocatoria?.territorial,
          avatar: cand.avatar
        });
      }
    });

    // 4. SELECCIONADOS EN CONVOCATORIAS (de datos centralizados)
    CANDIDATOS_SELECCIONADOS.forEach(cand => {
      // Evitar duplicados
      if (!docentes.find(d => d.documentNumber === cand.documentNumber)) {
        const convocatoria = getConvocatoriaById(cand.convocatoriaId);

        docentes.push({
          id: cand.id,
          personId: cand.personId,
          firstName: cand.firstName,
          lastName: cand.lastName,
          email: cand.email,
          phone: cand.phone,
          documentType: cand.documentType,
          documentNumber: cand.documentNumber,
          tipoDocente: 'seleccionado',
          estado: 'active',
          formacion: cand.formacion,
          vinculacion: 'Ocasional',
          convocatoria: convocatoria ? {
            id: convocatoria.id,
            nombre: convocatoria.titulo,
            año: convocatoria.año
          } : undefined,
          territorial: convocatoria?.territorial,
          avatar: cand.avatar
        });
      }
    });

    // 5. NO SELECCIONADOS EN CONVOCATORIAS (de datos centralizados)
    CANDIDATOS_NO_SELECCIONADOS.forEach(cand => {
      // Evitar duplicados
      if (!docentes.find(d => d.documentNumber === cand.documentNumber)) {
        const convocatoria = getConvocatoriaById(cand.convocatoriaId);

        docentes.push({
          id: cand.id,
          personId: cand.personId,
          firstName: cand.firstName,
          lastName: cand.lastName,
          email: cand.email,
          phone: cand.phone,
          documentType: cand.documentType,
          documentNumber: cand.documentNumber,
          tipoDocente: 'no-seleccionado',
          estado: 'rejected',
          formacion: cand.formacion,
          convocatoria: convocatoria ? {
            id: convocatoria.id,
            nombre: convocatoria.titulo,
            año: convocatoria.año
          } : undefined,
          territorial: convocatoria?.territorial,
          avatar: cand.avatar
        });
      }
    });

    return docentes;
  }, []);

  // ============================================================================
  // FILTRADO Y BÚSQUEDA
  // ============================================================================

  const filteredDocentes = useMemo(() => {
    return allDocentes.filter(docente => {
      const matchesSearch = searchQuery === '' ||
        `${docente.firstName} ${docente.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (docente.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (docente.documentNumber || '').includes(searchQuery);

      const matchesTipo = tipoFilter === 'all' || docente.tipoDocente === tipoFilter;
      const matchesEstado = estadoFilter === 'all' || docente.estado === estadoFilter;
      const matchesTerritorial = territorialFilter === 'all' || 
        docente.territorial?.id === territorialFilter;
      const matchesCategoria = categoriaFilter === 'all' || 
        docente.categoria === categoriaFilter;

      return matchesSearch && matchesTipo && matchesEstado && matchesTerritorial && matchesCategoria;
    });
  }, [allDocentes, searchQuery, tipoFilter, estadoFilter, territorialFilter, categoriaFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredDocentes.length / itemsPerPage);
  const paginatedDocentes = filteredDocentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  const stats = useMemo(() => {
    return {
      total: allDocentes.length,
      planta: allDocentes.filter(d => d.tipoDocente === 'planta').length,
      catedra: allDocentes.filter(d => d.tipoDocente === 'catedra').length,
      aspirantes: allDocentes.filter(d => d.tipoDocente === 'aspirante').length,
      seleccionados: allDocentes.filter(d => d.tipoDocente === 'seleccionado').length,
      noSeleccionados: allDocentes.filter(d => d.tipoDocente === 'no-seleccionado').length,
      activos: allDocentes.filter(d => d.estado === 'active').length
    };
  }, [allDocentes]);

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  const getTipoBadge = (tipo: TipoDocente) => {
    const config = {
      planta: { label: 'Planta', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      catedra: { label: 'Hora Cátedra', className: 'bg-purple-100 text-purple-700 border-purple-300' },
      aspirante: { label: 'Aspirante', className: 'bg-amber-100 text-amber-700 border-amber-300' },
      seleccionado: { label: 'Seleccionado', className: 'bg-green-100 text-green-700 border-green-300' },
      'no-seleccionado': { label: 'No Seleccionado', className: 'bg-gray-100 text-gray-700 border-gray-300' }
    };
    return config[tipo];
  };

  const getEstadoBadge = (estado: EstadoDocente) => {
    const config = {
      active: { label: 'Activo', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
      inactive: { label: 'Inactivo', className: 'bg-gray-50 text-gray-700 border-gray-200', icon: XCircle },
      pending: { label: 'Pendiente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
      rejected: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle }
    };
    const conf = config[estado];
    const Icon = conf.icon;
    return (
      <Badge className={`${conf.className} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {conf.label}
      </Badge>
    );
  };

  const handleVerCarpeta = (docente: DocenteDirectorio) => {
    setSelectedDocente(docente);
    setViewMode('carpeta-digital');
  };

  const handleExportar = () => {
    toast.success('Exportando Directorio', {
      description: `Se está generando el archivo con ${filteredDocentes.length} docentes.`
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTipoFilter('all');
    setEstadoFilter('all');
    setTerritorialFilter('all');
    setCategoriaFilter('all');
    setCurrentPage(1);
  };

  // ============================================================================
  // VISTA: CARPETA DIGITAL
  // ============================================================================

  if (viewMode === 'carpeta-digital' && selectedDocente) {
    return (
      <DigitalFolderSection
        onBack={() => {
          setViewMode('directorio');
          setSelectedDocente(null);
        }}
        initialUserId={selectedDocente.id}
        users={allDocentes.map(d => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          document: d.documentNumber,
          email: d.email,
          avatar: d.avatar
        }))}
        canUpload={true}
      />
    );
  }

  // ============================================================================
  // VISTA: DIRECTORIO PRINCIPAL
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
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
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Directorio Docente
            </h1>
          </div>
          <p className="text-gray-600">
            Directorio unificado de docentes: Planta, Hora Cátedra, Aspirantes y Convocatorias
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportar}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
          >
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>
      </motion.div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600">Total Docentes</p>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.planta}</p>
          <p className="text-sm text-blue-600">Planta</p>
        </Card>

        <Card className="p-4 border-purple-200 bg-purple-50">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.catedra}</p>
          <p className="text-sm text-purple-600">Hora Cátedra</p>
        </Card>

        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.aspirantes}</p>
          <p className="text-sm text-amber-600">Aspirantes</p>
        </Card>

        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.seleccionados}</p>
          <p className="text-sm text-green-600">Seleccionados</p>
        </Card>

        <Card className="p-4 border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-700">{stats.noSeleccionados}</p>
          <p className="text-sm text-gray-600">No Seleccionados</p>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtro Tipo */}
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los tipos</option>
            <option value="planta">Planta</option>
            <option value="catedra">Hora Cátedra</option>
            <option value="aspirante">Aspirantes</option>
            <option value="seleccionado">Seleccionados</option>
            <option value="no-seleccionado">No Seleccionados</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="pending">Pendientes</option>
            <option value="rejected">Rechazados</option>
          </select>

          {/* Limpiar Filtros */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Limpiar Filtros
          </button>
        </div>
      </Card>

      {/* Tabla de Docentes */}
      <Card>
        <div className="border-b px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Lista de Docentes</h2>
              <p className="text-sm text-gray-600">
                Mostrando {paginatedDocentes.length} de {filteredDocentes.length} docentes
              </p>
            </div>
            <Badge variant="outline" className="font-semibold">
              Total: {filteredDocentes.length}
            </Badge>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Docente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territorial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDocentes.map((docente) => {
                const tipoBadge = getTipoBadge(docente.tipoDocente);
                return (
                  <tr key={docente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={docente.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {docente.firstName[0]}{docente.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {docente.firstName} {docente.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{docente.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{docente.documentType}</p>
                      <p className="text-sm text-gray-500">{docente.documentNumber}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${tipoBadge.className} border`}>
                        {tipoBadge.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(docente.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {docente.territorial ? (
                        <div>
                          <p className="text-sm text-gray-900">{docente.territorial.nombre}</p>
                          <p className="text-xs text-gray-500">{docente.territorial.codigo}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {docente.categoria ? (
                        <Badge variant="outline">{docente.categoria}</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleVerCarpeta(docente)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Carpeta Digital
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden divide-y divide-gray-200">
          {paginatedDocentes.map((docente) => {
            const tipoBadge = getTipoBadge(docente.tipoDocente);
            return (
              <div key={docente.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={docente.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {docente.firstName[0]}{docente.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {docente.firstName} {docente.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{docente.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {docente.documentType} {docente.documentNumber}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`${tipoBadge.className} border text-xs`}>
                    {tipoBadge.label}
                  </Badge>
                  {getEstadoBadge(docente.estado)}
                  {docente.categoria && (
                    <Badge variant="outline" className="text-xs">{docente.categoria}</Badge>
                  )}
                </div>

                {docente.territorial && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{docente.territorial.nombre}</span>
                  </div>
                )}

                <button
                  onClick={() => handleVerCarpeta(docente)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FolderOpen className="w-4 h-4" />
                  Ver Carpeta Digital
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredDocentes.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron docentes
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta ajustar los filtros de búsqueda
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Limpiar Filtros
            </button>
          </div>
        )}

        {/* Paginación */}
        {filteredDocentes.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <PaginationPremium
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredDocentes.length}
            />
          </div>
        )}
      </Card>
    </div>
  );
}