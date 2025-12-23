import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Search,
  Download,
  CheckCircle,
  Clock,
  TrendingUp,
  Edit,
  AlertCircle,
  User,
  Building2,
  Calendar,
  Eye,
  MoreVertical,
  Send
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';

// Importar nuevos tipos y configuraciones oficiales
import { ESTADOS_PTA, EstadoPTA } from '../../data/ptaEstadosYFlujo';

// Importar mock data
import { ptasMock } from '../../mock-data/profesoral-mock-completo';
import { ptaDemoAjustesSolicitados } from '../../data/ptaDemoAjustesSolicitados';
import { ptasDemoPorEstado, esPTADemo, getEstiloBordeDemo } from '../../data/ptasDemoPorEstado';

// Importar nuevos componentes
import { PTAFormModal } from './PTAFormModal';
import { PTARevisionModal } from './PTARevisionModal';
import { PTADetallesModal } from './PTADetallesModal';
import { VisualizadorPTAAjustes } from './VisualizadorPTAAjustes';
import { ModalAprobacionExitosa } from './ModalAprobacionExitosa';
import { ModalEnviarPTA } from './ModalEnviarPTA';
import { ModalVistaGeneralPTA } from './ModalVistaGeneralPTA';

interface PTAsListProps {
  className?: string;
}

export function PTAsList({ className = '' }: PTAsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('2025-I');
  
  // Estado para modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isDetallesModalOpen, setIsDetallesModalOpen] = useState(false);
  const [isVisualizadorDemoOpen, setIsVisualizadorDemoOpen] = useState(false);
  const [isAprobacionExitosaOpen, setIsAprobacionExitosaOpen] = useState(false);
  const [isVistaGeneralOpen, setIsVistaGeneralOpen] = useState(false);
  const [ptaSeleccionado, setPtaSeleccionado] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado local de PTAs - incluir TODOS los PTAs demo
  const ptaDemoConverted = {
    id: ptaDemoAjustesSolicitados.id,
    codigo: '🔴 ' + ptaDemoAjustesSolicitados.id,
    docente_nombre: '🔴 DEMO: ' + ptaDemoAjustesSolicitados.docenteNombre,
    estado: 'ajustes_solicitados',
    periodo_nombre: ptaDemoAjustesSolicitados.periodo,
    territorial: ptaDemoAjustesSolicitados.territorial,
    departamento: ptaDemoAjustesSolicitados.facultad,
    componente_ensenanza: { horas: ptaDemoAjustesSolicitados.horasDocencia, porcentaje: 50 },
    componente_investigacion: { horas: ptaDemoAjustesSolicitados.horasInvestigacion, porcentaje: 27.5 },
    componente_extension: { horas: ptaDemoAjustesSolicitados.horasExtension, porcentaje: 16 },
    componente_apoyo_institucional: { horas: ptaDemoAjustesSolicitados.horasAdministrativo, porcentaje: 19 },
    created_at: ptaDemoAjustesSolicitados.fechaCreacion,
    fecha_envio: '2024-11-15T09:00:00Z',
    cumplimiento_global: 0,
    esDemo: true
  };
  
  const [ptas, setPtas] = useState([...ptasDemoPorEstado, ptaDemoConverted, ...ptasMock]);

  // Filtrar PTAs
  const ptasFiltrados = ptas.filter(pta => {
    const matchSearch = 
      pta.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pta.docente_nombre.toLowerCase().includes(searchQuery.toLowerCase());

    const matchEstado = filtroEstado === 'todos' || pta.estado === filtroEstado;
    const matchPeriodo = pta.periodo_nombre === filtroPeriodo;

    return matchSearch && matchEstado && matchPeriodo;
  });

  const getEstadoConfig = (estado: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
      'borrador': {
        label: 'Borrador',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100 border-gray-200',
        icon: Edit
      },
      'en_revision': {
        label: 'En Revisión',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100 border-blue-200',
        icon: Clock
      },
      'ajustes_solicitados': {
        label: 'Ajustes Solicitados',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100 border-amber-200',
        icon: AlertCircle
      },
      'aprobado': {
        label: 'Aprobado',
        color: 'text-green-700',
        bgColor: 'bg-green-100 border-green-200',
        icon: CheckCircle
      },
      'ejecutado': {
        label: 'Ejecutado',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100 border-purple-200',
        icon: CheckCircle
      }
    };

    return configs[estado] || configs['borrador'];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handlers
  const handleNuevoPTA = () => {
    setPtaSeleccionado(null);
    setModoEdicion(false);
    setIsFormModalOpen(true);
  };

  const handleEditarPTA = (pta: any) => {
    setPtaSeleccionado(pta);
    setModoEdicion(true);
    setIsFormModalOpen(true);
  };

  const handleRevisarPTA = (pta: any) => {
    setPtaSeleccionado(pta);
    setIsRevisionModalOpen(true);
  };

  const handleEnviarARevision = (pta: any) => {
    console.log('🚀 handleEnviarARevision llamado con:', pta);
    // Convertir el PTA al formato esperado por el modal
    const ptaParaModal = {
      id: pta.id,
      codigo: pta.codigo,
      docente: {
        nombre: pta.docente_nombre || 'Docente',
        email: `${pta.docente_nombre?.toLowerCase().replace(/ /g, '.').replace(/🔴/g, '').replace(/demo:/g, '').trim()}@esap.edu.co` || 'docente@esap.edu.co',
        documento: 'CC 123456789',
        programa: pta.departamento || 'Programa Académico'
      },
      periodo: pta.periodo_nombre || '2025-I',
      estado: 'BORRADOR',
      fecha_creacion: pta.created_at 
        ? new Date(pta.created_at).toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'N/A',
      horas_totales: (pta.componente_ensenanza?.horas || 0) + 
                     (pta.componente_investigacion?.horas || 0) + 
                     (pta.componente_extension?.horas || 0) + 
                     (pta.componente_apoyo_institucional?.horas || 0),
      horas_programables: 800
    };
    
    console.log('✅ PTA convertido:', ptaParaModal);
    setPtaSeleccionado(ptaParaModal);
    console.log('🔥 Abriendo modal ModalVistaGeneralPTA');
    setIsVistaGeneralOpen(true);
  };
  
  const handleConfirmarEnvio = (ptaModal: any) => {
    // Actualizar el estado del PTA en la lista
    setPtas(prev => prev.map(p => 
      p.id === ptaModal.id 
        ? { ...p, estado: 'en_revision', fecha_envio: new Date().toISOString() }
        : p
    ));
    toast.success(`PTA ${ptaModal.codigo} enviado exitosamente a revisión`);
    setIsVistaGeneralOpen(false);
  };

  const handleSuccessForm = (ptaData: any) => {
    if (modoEdicion) {
      setPtas(prev => prev.map(p => p.id === ptaData.id ? ptaData : p));
      toast.success('PTA actualizado exitosamente');
    } else {
      setPtas(prev => [ptaData, ...prev]);
      toast.success('PTA creado exitosamente');
    }
  };

  const handleAprobarPTA = (data: any) => {
    setPtas(prev => prev.map(p => 
      p.id === data.pta_id 
        ? { 
            ...p, 
            estado: 'aprobado', 
            fecha_aprobacion: new Date().toISOString(),
            comentarios_revision: data.comentarios
          }
        : p
    ));
    setIsAprobacionExitosaOpen(true);
  };

  const handleRechazarPTA = (data: any) => {
    setPtas(prev => prev.map(p => 
      p.id === data.pta_id 
        ? { 
            ...p, 
            estado: 'borrador',
            comentarios_revision: data.comentarios
          }
        : p
    ));
  };

  const handleSolicitarAjustes = (data: any) => {
    setPtas(prev => prev.map(p => 
      p.id === data.pta_id 
        ? { 
            ...p, 
            estado: 'ajustes_solicitados',
            comentarios_revision: data.comentarios
          }
        : p
    ));
  };

  const handleDescargarPDF = (pta: any) => {
    toast.info(`Generando PDF del PTA ${pta.codigo}...`);
  };

  const handleVerDetalles = (pta: any) => {
    if (pta.esDemo) {
      // Si es el PTA demo, abrir el visualizador especial
      setIsVisualizadorDemoOpen(true);
    } else {
      // Si no, abrir el modal normal de detalles
      setPtaSeleccionado(pta);
      setIsDetallesModalOpen(true);
    }
  };

  const handleAprobarDirecto = (pta: any) => {
    console.log('🔍 handleAprobarDirecto llamado con PTA:', pta);
    
    const ptaAprobado = {
      ...pta,
      estado: 'aprobado',
      fecha_aprobacion: new Date().toISOString(),
      periodo: pta.periodo_nombre || '2025-I',
      docente: {
        nombre: pta.docente_nombre || 'Docente',
        email: `${pta.docente_nombre?.toLowerCase().replace(/ /g, '.').replace(/🔴/g, '').replace(/demo:/g, '').trim()}@esap.edu.co` || 'docente@esap.edu.co',
        documento: 'CC 123456789',
        programa: pta.departamento || 'Programa Académico'
      }
    };

    console.log('✅ PTA aprobado:', ptaAprobado);

    setPtas(prev => prev.map(p => 
      p.id === pta.id ? ptaAprobado : p
    ));
    
    setPtaSeleccionado(ptaAprobado);
    console.log('🚀 Abriendo modal de aprobación exitosa');
    setIsAprobacionExitosaOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Planes de Trabajo Académico (PTA)
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {ptasFiltrados.length} PTAs en el periodo {filtroPeriodo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]" onClick={handleNuevoPTA}>
            <FileText className="w-4 h-4 mr-2" />
            Crear PTA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total PTAs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">145</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#1e5da8]" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-600 mt-1">104</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Revisión</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">26</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cumplimiento</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">78.5%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por código o docente..."
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
            <option value="borrador">Borrador</option>
            <option value="en_revision">En Revisión</option>
            <option value="ajustes_solicitados">Ajustes Solicitados</option>
            <option value="aprobado">Aprobado</option>
            <option value="ejecutado">Ejecutado</option>
          </select>

          {/* Filtro Periodo */}
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="2025-I">2025-I</option>
            <option value="2024-II">2024-II</option>
            <option value="2024-I">2024-I</option>
          </select>
        </div>
      </Card>

      {/* PTAs List */}
      <AnimatePresence mode="popLayout">
        {ptasFiltrados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron PTAs</h3>
              <p className="text-gray-600">Intenta ajustar los filtros o la búsqueda</p>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {ptasFiltrados.map((pta, index) => {
              const estadoConfig = getEstadoConfig(pta.estado);
              const IconEstado = estadoConfig.icon;
              const esDemo = esPTADemo(pta);
              const claseBordeDemo = esDemo ? getEstiloBordeDemo() : '';

              return (
                <motion.div
                  key={pta.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card className={`p-6 hover:shadow-lg transition-shadow group ${claseBordeDemo}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Left Section - Info */}
                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{pta.codigo}</h3>
                              <Badge className={`${estadoConfig.bgColor} ${estadoConfig.color} flex items-center gap-1`}>
                                <IconEstado className="w-3 h-3" />
                                {estadoConfig.label}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span className="font-medium">{pta.docente_nombre}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 className="w-4 h-4" />
                                <span>{pta.territorial} - {pta.departamento}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Periodo: {pta.periodo_nombre}</span>
                              </div>
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
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              {pta.estado === 'borrador' && (
                                <DropdownMenuItem>
                                  <Send className="w-4 h-4 mr-2" />
                                  Enviar a Revisión
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Distribution */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Enseñanza</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-lg font-bold text-gray-900">{pta.componente_ensenanza.horas}h</p>
                              <p className="text-sm text-gray-600">({pta.componente_ensenanza.porcentaje}%)</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Investigación</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-lg font-bold text-gray-900">{pta.componente_investigacion.horas}h</p>
                              <p className="text-sm text-gray-600">({pta.componente_investigacion.porcentaje}%)</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Extensión</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-lg font-bold text-gray-900">{pta.componente_extension.horas}h</p>
                              <p className="text-sm text-gray-600">({pta.componente_extension.porcentaje}%)</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Apoyo Inst.</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-lg font-bold text-gray-900">{pta.componente_apoyo_institucional.horas}h</p>
                              <p className="text-sm text-gray-600">({pta.componente_apoyo_institucional.porcentaje}%)</p>
                            </div>
                          </div>
                        </div>

                        {/* Progress (only for approved) */}
                        {pta.estado === 'aprobado' && pta.cumplimiento_global && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-gray-600">Cumplimiento Global</p>
                              <p className="text-sm font-bold text-gray-900">{pta.cumplimiento_global}%</p>
                            </div>
                            <Progress value={pta.cumplimiento_global} className="h-2" />
                          </div>
                        )}
                      </div>

                      {/* Right Section - Actions & Dates */}
                      <div className="lg:w-48 space-y-4">
                        {/* Dates */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-600">Creado</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(pta.created_at)}</p>
                          </div>
                          {pta.fecha_envio && (
                            <div>
                              <p className="text-xs text-gray-600">Enviado</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(pta.fecha_envio)}</p>
                            </div>
                          )}
                          {pta.fecha_aprobacion && (
                            <div>
                              <p className="text-xs text-gray-600">Aprobado</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(pta.fecha_aprobacion)}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          {/* Botón Ver Detalles - siempre visible */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full" 
                            onClick={() => handleVerDetalles(pta)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Detalles
                          </Button>

                          {/* Botón Enviar - solo para borradores */}
                          {pta.estado === 'borrador' && (
                            <Button 
                              size="sm" 
                              className="w-full bg-[#1e5da8] hover:bg-[#1a4d8f]"
                              onClick={() => handleEnviarARevision(pta)}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Enviar
                            </Button>
                          )}

                          {/* Botón Revisar - solo para PTAs en revisión */}
                          {pta.estado === 'en_revision' && (
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="w-full"
                              onClick={() => handleRevisarPTA(pta)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Revisar
                            </Button>
                          )}

                          {/* Botón Aprobar - para PTAs en revisión o con ajustes solicitados */}
                          {(pta.estado === 'en_revision' || pta.estado === 'ajustes_solicitados') && (
                            <Button 
                              size="sm" 
                              className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => handleAprobarDirecto(pta)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <PTAFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleSuccessForm}
        pta={ptaSeleccionado}
        modo={modoEdicion ? 'editar' : 'crear'}
      />
      
      <PTARevisionModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        pta={ptaSeleccionado}
        onAprobar={handleAprobarPTA}
        onRechazar={handleRechazarPTA}
        onSolicitarAjustes={handleSolicitarAjustes}
      />
      
      <PTADetallesModal
        isOpen={isDetallesModalOpen}
        onClose={() => setIsDetallesModalOpen(false)}
        pta={ptaSeleccionado}
      />
      
      <VisualizadorPTAAjustes
        isOpen={isVisualizadorDemoOpen}
        onClose={() => setIsVisualizadorDemoOpen(false)}
        pta={ptaDemoConverted}
      />
      
      <ModalAprobacionExitosa
        isOpen={isAprobacionExitosaOpen}
        onClose={() => setIsAprobacionExitosaOpen(false)}
        pta={ptaSeleccionado}
      />
      
      <ModalVistaGeneralPTA
        isOpen={isVistaGeneralOpen}
        onClose={() => setIsVistaGeneralOpen(false)}
        pta={ptaSeleccionado}
        onEnviar={handleConfirmarEnvio}
      />
    </div>
  );
}