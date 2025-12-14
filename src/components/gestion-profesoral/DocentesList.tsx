import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DocenteFormModal } from './DocenteFormModal';
import { DocenteFichaModal } from './DocenteFichaModal';

// Importar mock data
import { docentesMock, territorialesESAP, departamentosAcademicos } from '../../mock-data/docentes-mock';

interface DocentesListProps {
  className?: string;
}

export function DocentesList({ className = '' }: DocentesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('todos');
  const [filtroEscalafon, setFiltroEscalafon] = useState<string>('todos');
  const [vistaActual, setVistaActual] = useState<'tarjetas' | 'tabla'>('tarjetas');
  
  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Estado local de docentes
  const [docentes, setDocentes] = useState(docentesMock);

  // Filtrar docentes según criterios
  const docentesFiltrados = docentes.filter(docente => {
    const matchSearch = 
      docente.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docente.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docente.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docente.documento.includes(searchQuery);

    const matchEstado = filtroEstado === 'todos' || docente.estado === filtroEstado;
    const matchTerritorial = filtroTerritorial === 'todos' || docente.territorial === filtroTerritorial;
    const matchEscalafon = filtroEscalafon === 'todos' || docente.categoria_escalafon === filtroEscalafon;

    return matchSearch && matchEstado && matchTerritorial && matchEscalafon;
  });

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Licencia':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Retirado':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEscalafonColor = (categoria: string) => {
    switch (categoria) {
      case 'Titular':
        return 'bg-[#1e5da8] text-white';
      case 'Asociado':
        return 'bg-[#2a6dbd] text-white';
      case 'Asistente':
        return 'bg-[#4a8fd6] text-white';
      case 'Auxiliar':
        return 'bg-[#7ab3e8] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getInitials = (nombres: string, apellidos: string) => {
    return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  const handleNuevoDocente = () => {
    setDocenteSeleccionado(null);
    setModoEdicion(false);
    setIsFormModalOpen(true);
  };

  const handleEditarDocente = (docente: any) => {
    setDocenteSeleccionado(docente);
    setModoEdicion(true);
    setIsFormModalOpen(true);
  };

  const handleVerPerfil = (docente: any) => {
    setDocenteSeleccionado(docente);
    setIsFichaModalOpen(true);
  };

  const handleEliminarDocente = (docente: any) => {
    if (confirm(`¿Estás seguro de eliminar a ${docente.nombres} ${docente.apellidos}?`)) {
      setDocentes(prev => prev.filter(d => d.id !== docente.id));
      toast.success('Docente eliminado exitosamente');
    }
  };

  const handleSuccessForm = (docenteData: any) => {
    if (modoEdicion) {
      // Actualizar docente existente
      setDocentes(prev => prev.map(d => d.id === docenteData.id ? docenteData : d));
    } else {
      // Agregar nuevo docente
      setDocentes(prev => [docenteData, ...prev]);
    }
  };

  const handleImportar = () => {
    toast.info('Función de importación en desarrollo', {
      description: 'Próximamente podrás importar docentes desde Excel'
    });
  };

  const handleExportar = () => {
    toast.success('Exportando docentes', {
      description: `Se exportarán ${docentesFiltrados.length} docentes a Excel`
    });
    // En producción: generar archivo Excel
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Docentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {docentesFiltrados.length} docentes encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImportar}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportar}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]" onClick={handleNuevoDocente}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Docente
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, cédula o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Licencia">Licencia</option>
            <option value="Retirado">Retirado</option>
          </select>

          {/* Filtro Territorial */}
          <select
            value={filtroTerritorial}
            onChange={(e) => setFiltroTerritorial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todas las territoriales</option>
            {territorialesESAP.slice(0, 8).map(territorial => (
              <option key={territorial} value={territorial}>{territorial}</option>
            ))}
          </select>

          {/* Filtro Escalafón */}
          <select
            value={filtroEscalafon}
            onChange={(e) => setFiltroEscalafon(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todos los escalafones</option>
            <option value="Titular">Titular</option>
            <option value="Asociado">Asociado</option>
            <option value="Asistente">Asistente</option>
            <option value="Auxiliar">Auxiliar</option>
          </select>
        </div>

        {/* Active Filters */}
        {(filtroEstado !== 'todos' || filtroTerritorial !== 'todos' || filtroEscalafon !== 'todos') && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {filtroEstado !== 'todos' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Estado: {filtroEstado}
                <button onClick={() => setFiltroEstado('todos')} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                  ×
                </button>
              </Badge>
            )}
            {filtroTerritorial !== 'todos' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Territorial: {filtroTerritorial}
                <button onClick={() => setFiltroTerritorial('todos')} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                  ×
                </button>
              </Badge>
            )}
            {filtroEscalafon !== 'todos' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Escalafón: {filtroEscalafon}
                <button onClick={() => setFiltroEscalafon('todos')} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Docentes Grid */}
      <AnimatePresence mode="popLayout">
        {docentesFiltrados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron docentes</h3>
              <p className="text-gray-600">Intenta ajustar los filtros o la búsqueda</p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docentesFiltrados.map((docente, index) => (
              <motion.div
                key={docente.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="p-6 hover:shadow-lg transition-shadow group">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={docente.foto_url} alt={`${docente.nombres} ${docente.apellidos}`} />
                        <AvatarFallback className="bg-[#1e5da8] text-white">
                          {getInitials(docente.nombres, docente.apellidos)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {docente.nombres} {docente.apellidos}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">CC: {docente.documento}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          Ver PTA
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={getEstadoBadgeColor(docente.estado)}>
                      {docente.estado}
                    </Badge>
                    <Badge className={getEscalafonColor(docente.categoria_escalafon)}>
                      {docente.categoria_escalafon}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{docente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{docente.telefono}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{docente.territorial}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <GraduationCap className="w-3 h-3" />
                        <span>Formación</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {docente.formacion_academica[docente.formacion_academica.length - 1]?.nivel || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Experiencia</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {docente.experiencia_docente_anos} años
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleVerPerfil(docente)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Perfil
                    </Button>
                    <Button size="sm" className="w-full bg-[#1e5da8] hover:bg-[#1a4d8f]" onClick={() => handleEditarDocente(docente)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <DocenteFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setDocenteSeleccionado(null);
        }}
        docente={modoEdicion ? docenteSeleccionado : undefined}
        onSuccess={handleSuccessForm}
      />

      <DocenteFichaModal
        isOpen={isFichaModalOpen}
        onClose={() => {
          setIsFichaModalOpen(false);
          setDocenteSeleccionado(null);
        }}
        docente={docenteSeleccionado}
        onEdit={() => {
          setIsFichaModalOpen(false);
          setIsFormModalOpen(true);
          setModoEdicion(true);
        }}
      />
    </div>
  );
}