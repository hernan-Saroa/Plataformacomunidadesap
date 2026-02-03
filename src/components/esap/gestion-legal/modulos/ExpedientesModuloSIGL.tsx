/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPEDIENTES - SISTEMA INTEGRADO DE GESTIÓN LEGAL (SIGL)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de expedientes electrónicos para Gestión Legal
 * Cada proceso legal = 1 expediente con documentación organizada por tipo
 * 
 * VERSIÓN: 1.0 - SIGL
 * ÚLTIMA ACTUALIZACIÓN: 13 Enero 2026
 * 
 * ✨ Características:
 * - Expediente por cada proceso legal (Defensa Judicial, Juzgamiento, etc.)
 * - Carpetas organizadas por tipo de documento
 * - Vista de árbol de documentos
 * - Búsqueda por expediente
 * - Carga de documentos
 * - Integración con todos los módulos de Gestión Legal
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, FileText, Upload, Download, Search, Eye,
  ChevronRight, ChevronDown, Plus, Filter, Calendar, User,
  Archive, CheckCircle2, AlertCircle, Clock,
  File, FolderCheck, FileCheck, Scale, Gavel, FileQuestion,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalExpedienteConsulta } from './ModalExpedienteConsulta';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';
import { ModalSIGL } from '../design-system/ModalSIGL';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TipoProceso = 
  | 'DEFENSA_JUDICIAL'
  | 'JUZGAMIENTO'
  | 'ASESORIA'
  | 'PROCESOS_COACTIVOS'
  | 'ORGANOS_CONTROL'
  | 'OTRO';

type TipoDocumento = 
  | 'DEMANDA'
  | 'CONTESTACION'
  | 'PRUEBAS'
  | 'AUTOS'
  | 'SENTENCIAS'
  | 'TUTELAS'
  | 'RECURSOS'
  | 'CONCEPTOS'
  | 'ACTAS'
  | 'NOTIFICACIONES'
  | 'OFICIOS'
  | 'OTROS';

interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  tipoArchivo: string;
  tamanio: string;
  fechaCreacion: string;
  autor: string;
}

interface Expediente {
  id: string;
  radicado: string;
  nombreProceso: string;
  tipoProceso: TipoProceso;
  fechaInicio: string;
  fechaActualizacion: string;
  estado: 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO';
  responsable: string;
  totalDocumentos: number;
  documentos: Documento[];
}

type VistaActual = 'expedientes' | 'estadisticas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TIPOS DE DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_DOCUMENTO = [
  {
    id: 'DEMANDA' as TipoDocumento,
    nombre: 'Demandas',
    descripcion: 'Demandas presentadas contra ESAP',
    color: 'red',
    icon: Scale
  },
  {
    id: 'CONTESTACION' as TipoDocumento,
    nombre: 'Contestaciones',
    descripcion: 'Contestaciones y respuestas a demandas',
    color: 'blue',
    icon: FileText
  },
  {
    id: 'PRUEBAS' as TipoDocumento,
    nombre: 'Pruebas',
    descripcion: 'Documentos probatorios, evidencias, anexos',
    color: 'green',
    icon: FolderCheck
  },
  {
    id: 'AUTOS' as TipoDocumento,
    nombre: 'Autos',
    descripcion: 'Autos judiciales, providencias, decretos',
    color: 'violet',
    icon: Gavel
  },
  {
    id: 'SENTENCIAS' as TipoDocumento,
    nombre: 'Sentencias y Fallos',
    descripcion: 'Sentencias finales y fallos definitivos',
    color: 'purple',
    icon: Gavel
  },
  {
    id: 'TUTELAS' as TipoDocumento,
    nombre: 'Tutelas',
    descripcion: 'Acciones de tutela y respuestas',
    color: 'orange',
    icon: AlertCircle
  },
  {
    id: 'RECURSOS' as TipoDocumento,
    nombre: 'Recursos',
    descripcion: 'Recursos de apelación, reposición, casación',
    color: 'indigo',
    icon: FileCheck
  },
  {
    id: 'CONCEPTOS' as TipoDocumento,
    nombre: 'Conceptos Jurídicos',
    descripcion: 'Conceptos, memoriales, alegatos',
    color: 'cyan',
    icon: FileQuestion
  },
  {
    id: 'ACTAS' as TipoDocumento,
    nombre: 'Actas',
    descripcion: 'Actas de audiencias, reuniones, diligencias',
    color: 'yellow',
    icon: FileText
  },
  {
    id: 'NOTIFICACIONES' as TipoDocumento,
    nombre: 'Notificaciones',
    descripcion: 'Notificaciones judiciales y extrajudiciales',
    color: 'pink',
    icon: Archive
  },
  {
    id: 'OFICIOS' as TipoDocumento,
    nombre: 'Oficios',
    descripcion: 'Oficios enviados y recibidos',
    color: 'teal',
    icon: File
  },
  {
    id: 'OTROS' as TipoDocumento,
    nombre: 'Otros Documentos',
    descripcion: 'Documentos varios no clasificados',
    color: 'gray',
    icon: File
  }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK (REDUCIDOS PARA OPTIMIZACIÓN)
// ════════════════════════════════════════════════════════════════════════════

const EXPEDIENTES_MOCK: Expediente[] = [
  // Ejemplo mínimo de expediente para referencia
  {
    id: 'exp-dj-001',
    radicado: 'PJ-2025-001',
    nombreProceso: 'Proceso de Ejemplo',
    tipoProceso: 'DEFENSA_JUDICIAL',
    fechaInicio: '2024-10-15',
    fechaActualizacion: '2025-01-12',
    estado: 'EN_PROCESO',
    responsable: 'Abogado Responsable',
    totalDocumentos: 3,
    documentos: [
      { id: 'd1', nombre: 'Documento 1.pdf', tipo: 'DEMANDA', tipoArchivo: 'PDF', tamanio: '1.2 MB', fechaCreacion: '2024-10-15', autor: 'Usuario' },
    ]
  },
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ExpedientesModuloSIGL() {
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();
  
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('expedientes');

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'EXP-999',
      codigo: 'EXP-DJ-2024-999',
      nombre: 'Expediente Demanda Laboral - Juan Pérez vs ESAP',
      tipo: 'Expediente',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-01T16:30:00'),
      usuarioArchivo: 'Dr. Carlos Mendoza',
      motivoArchivo: 'Proceso finalizado con sentencia favorable. Todos los documentos digitalizados y respaldados en sistema central',
      metadatos: {
        'Radicado': 'PJ-2023-045',
        'Tipo Proceso': 'Defensa Judicial - Laboral',
        'Total Documentos': '47',
        'Sentencia': 'Favorable a ESAP',
        'Fecha Finalización': '01/12/2024',
        'Responsable': 'Dr. Carlos Mendoza García'
      }
    }
  ]);

  // ✅ Función para restaurar un expediente archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando expediente:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Expediente restaurado exitosamente');
  };

  // ✅ Función para eliminar permanentemente un expediente
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente expediente:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Expediente eliminado permanentemente');
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Expedientes Electrónicos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Sistema Integrado de Gestión Legal (SIGL v5.0)
          </p>
        </div>

        {/* Navegación Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <TabButton
            active={vistaActiva === 'expedientes'}
            onClick={() => setVistaActiva('expedientes')}
            icon={<Folder className="w-4 h-4" />}
            label="Expedientes por Proceso"
            badge={EXPEDIENTES_MOCK.length.toString()}
          />
          <TabButton
            active={vistaActiva === 'estadisticas'}
            onClick={() => setVistaActiva('estadisticas')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Estadísticas"
          />
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {vistaActiva === 'expedientes' && <VistaExpedientes />}
          {vistaActiva === 'estadisticas' && <VistaEstadisticas />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 sm:px-6 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active 
          ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EXPEDIENTES POR PROCESO
// ════════════════════════════════════════════════════════════════════════════

function VistaExpedientes() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO'>('TODOS');
  const [expedienteExpandido, setExpedienteExpandido] = useState<string | null>(null);

  const expedientesFiltrados = useMemo(() => {
    let resultado = EXPEDIENTES_MOCK;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(exp =>
        exp.radicado.toLowerCase().includes(search) ||
        exp.nombreProceso.toLowerCase().includes(search)
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(exp => exp.estado === filtroEstado);
    }

    return resultado;
  }, [busqueda, filtroEstado]);

  const estadisticas = useMemo(() => {
    const total = EXPEDIENTES_MOCK.length;
    const activos = EXPEDIENTES_MOCK.filter(e => e.estado === 'ACTIVO').length;
    const enProceso = EXPEDIENTES_MOCK.filter(e => e.estado === 'EN_PROCESO').length;
    const finalizados = EXPEDIENTES_MOCK.filter(e => e.estado === 'FINALIZADO').length;
    const totalDocs = EXPEDIENTES_MOCK.reduce((acc, exp) => acc + exp.totalDocumentos, 0);

    return { total, activos, enProceso, finalizados, totalDocs };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por radicado o nombre del proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={filtroEstado === 'TODOS'}
              onClick={() => setFiltroEstado('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroEstado === 'ACTIVO'}
              onClick={() => setFiltroEstado('ACTIVO')}
              label="Activos"
              count={estadisticas.activos}
              color="green"
            />
            <FilterButton
              active={filtroEstado === 'EN_PROCESO'}
              onClick={() => setFiltroEstado('EN_PROCESO')}
              label="En Proceso"
              count={estadisticas.enProceso}
              color="yellow"
            />
            <FilterButton
              active={filtroEstado === 'FINALIZADO'}
              onClick={() => setFiltroEstado('FINALIZADO')}
              label="Finalizados"
              count={estadisticas.finalizados}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Lista de Expedientes */}
      <div className="space-y-4">
        {expedientesFiltrados.map((expediente) => (
          <CardExpediente
            key={expediente.id}
            expediente={expediente}
            expandido={expedienteExpandido === expediente.id}
            onToggleExpand={() => setExpedienteExpandido(
              expedienteExpandido === expediente.id ? null : expediente.id
            )}
          />
        ))}

        {expedientesFiltrados.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No se encontraron expedientes con los filtros seleccionados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FILTER BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'yellow' | 'gray';
}

function FilterButton({ active, onClick, label, count, color }: FilterButtonProps) {
  const colorClasses = {
    green: 'border-green-300 bg-green-50 text-green-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    gray: 'border-gray-300 bg-gray-50 text-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap
        ${active 
          ? color 
            ? colorClasses[color]
            : 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD EXPEDIENTE
// ════════════════════════════════════════════════════════════════════════════

interface CardExpedienteProps {
  expediente: Expediente;
  expandido: boolean;
  onToggleExpand: () => void;
}

function CardExpediente({ expediente, expandido, onToggleExpand }: CardExpedienteProps) {
  const [modalCargar, setModalCargar] = useState(false);
  
  const estadoConfig = {
    ACTIVO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activo' },
    EN_PROCESO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Proceso' },
    FINALIZADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Finalizado' }
  };

  const tipoProcesoConfig = {
    DEFENSA_JUDICIAL: { label: 'Defensa Judicial', icon: Scale, color: '#10B981' },
    JUZGAMIENTO: { label: 'Juzgamiento', icon: Gavel, color: '#DC2626' },
    ASESORIA: { label: 'Asesoría Jurídica', icon: FileQuestion, color: '#8B5CF6' },
    PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', icon: FileText, color: '#F59E0B' },
    ORGANOS_CONTROL: { label: 'Órganos Control', icon: Archive, color: '#2563EB' },
    OTRO: { label: 'Otro', icon: File, color: '#6B7280' }
  };

  const config = estadoConfig[expediente.estado];
  const tipoConfig = tipoProcesoConfig[expediente.tipoProceso];
  const TipoIcon = tipoConfig.icon;

  // Agrupar documentos por tipo
  const documentosPorTipo = useMemo(() => {
    const grupos: Record<TipoDocumento, Documento[]> = {
      DEMANDA: [],
      CONTESTACION: [],
      PRUEBAS: [],
      AUTOS: [],
      SENTENCIAS: [],
      TUTELAS: [],
      RECURSOS: [],
      CONCEPTOS: [],
      ACTAS: [],
      NOTIFICACIONES: [],
      OFICIOS: [],
      OTROS: []
    };

    expediente.documentos.forEach(doc => {
      grupos[doc.tipo].push(doc);
    });

    return grupos;
  }, [expediente.documentos]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header del Expediente */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${tipoConfig.color}, ${tipoConfig.color}dd)` }}
              >
                <TipoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h3 className="text-base sm:text-lg text-gray-900 font-medium">{expediente.radicado}</h3>
                  <span className={`px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{expediente.nombreProceso}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 text-gray-900">{tipoConfig.label}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <span className="ml-2 text-gray-900">{expediente.responsable}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <span className="ml-2 text-gray-900">{expediente.fechaInicio}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos:</span>
                    <span className="ml-2 text-gray-900 font-medium">{expediente.totalDocumentos}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setModalCargar(true);
                  toast.info('Cargar documento al expediente', {
                    description: expediente.radicado
                  });
                }}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Cargar
              </button>
              <button
                onClick={onToggleExpand}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {expandido ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Ocultar</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="hidden sm:inline">Ver Carpetas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estructura de Carpetas por Tipo de Documento */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="p-4 sm:p-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Documentos por Tipo</h4>

                <div className="space-y-3">
                  {TIPOS_DOCUMENTO.map((tipoDoc) => {
                    const docs = documentosPorTipo[tipoDoc.id];
                    const Icon = tipoDoc.icon;

                    return (
                      <CarpetaTipoDocumento
                        key={tipoDoc.id}
                        tipoDocumento={tipoDoc}
                        documentos={docs}
                        icon={<Icon className="w-5 h-5" />}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal Cargar Documento */}
      {modalCargar && (
        <ModalCargarDocumento
          expediente={expediente}
          onClose={() => setModalCargar(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARPETA TIPO DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface CarpetaTipoDocumentoProps {
  tipoDocumento: typeof TIPOS_DOCUMENTO[0];
  documentos: Documento[];
  icon: React.ReactNode;
}

function CarpetaTipoDocumento({ tipoDocumento, documentos, icon }: CarpetaTipoDocumentoProps) {
  const [expandido, setExpandido] = useState(false);

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const colorClass = colorClasses[tipoDocumento.color as keyof typeof colorClasses];

  const handleVerDocumento = (doc: Documento) => {
    toast.info('Visualizar documento', {
      description: doc.nombre,
      duration: 2000,
    });

    console.log('👁️ Ver documento:', {
      documentoId: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      tamanio: doc.tamanio,
      tipoDocumento: tipoDocumento.nombre
    });
  };

  const handleDescargarDocumento = (doc: Documento, e: React.MouseEvent) => {
    e.stopPropagation();
    
    toast.success('Descargando documento', {
      description: `${doc.nombre} (${doc.tamanio})`,
      duration: 3000,
    });

    console.log('⬇️ Descargar documento:', {
      documentoId: doc.id,
      nombre: doc.nombre,
      accion: 'descargar'
    });
  };

  return (
    <div className={`rounded-lg border ${colorClass}`}>
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-opacity-70 transition-all"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {expandido ? <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" /> : <Folder className="w-4 h-4 sm:w-5 sm:h-5" />}
          <div className="text-left">
            <div className="font-medium text-xs sm:text-sm">{tipoDocumento.nombre}</div>
            <div className="text-xs opacity-80 hidden sm:block">{tipoDocumento.descripcion}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium px-2 py-0.5 sm:py-1 bg-white bg-opacity-60 rounded">
            {documentos.length}
          </span>
          {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-current border-opacity-20"
          >
            <div className="p-3 sm:p-4 bg-white bg-opacity-50">
              {documentos.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm opacity-60">
                  <File className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-40" />
                  No hay documentos de este tipo
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{doc.tamanio}</span>
                            <span>•</span>
                            <span>{doc.fechaCreacion}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{doc.autor}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleVerDocumento(doc)}
                          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Ver documento"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => handleDescargarDocumento(doc, e)}
                          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CARGAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

function ModalCargarDocumento({
  expediente,
  onClose
}: {
  expediente: Expediente;
  onClose: () => void;
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('OTROS');

  const handleCargar = () => {
    toast.success('Documento cargado exitosamente', {
      description: `Agregado al expediente ${expediente.radicado}`,
      duration: 3000
    });
    onClose();
  };

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title={`Cargar Documento - ${expediente.radicado}`}
      size="medium"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            {expediente.nombreProceso}
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5]"
            >
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#003DA5] transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Arrastra un archivo o <span className="text-[#003DA5] font-medium">explora</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX (Máx. 10 MB)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCargar}
            className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all"
          >
            Cargar Documento
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

function VistaEstadisticas() {
  const estadisticasPorTipo = useMemo(() => {
    const stats: Record<TipoProceso, { total: number; docs: number }> = {
      DEFENSA_JUDICIAL: { total: 0, docs: 0 },
      JUZGAMIENTO: { total: 0, docs: 0 },
      ASESORIA: { total: 0, docs: 0 },
      PROCESOS_COACTIVOS: { total: 0, docs: 0 },
      ORGANOS_CONTROL: { total: 0, docs: 0 },
      OTRO: { total: 0, docs: 0 }
    };

    EXPEDIENTES_MOCK.forEach(exp => {
      stats[exp.tipoProceso].total++;
      stats[exp.tipoProceso].docs += exp.totalDocumentos;
    });

    return stats;
  }, []);

  const estadisticasPorTipoDoc = useMemo(() => {
    const stats: Record<TipoDocumento, number> = {
      DEMANDA: 0,
      CONTESTACION: 0,
      PRUEBAS: 0,
      AUTOS: 0,
      SENTENCIAS: 0,
      TUTELAS: 0,
      RECURSOS: 0,
      CONCEPTOS: 0,
      ACTAS: 0,
      NOTIFICACIONES: 0,
      OFICIOS: 0,
      OTROS: 0
    };

    EXPEDIENTES_MOCK.forEach(exp => {
      exp.documentos.forEach(doc => {
        stats[doc.tipo]++;
      });
    });

    return stats;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Estadísticas Generales
        </h2>
        
        {/* Estadísticas por Tipo de Proceso */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Expedientes por Tipo de Proceso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(estadisticasPorTipo) as [TipoProceso, typeof estadisticasPorTipo[TipoProceso]][]).map(([tipo, stats]) => {
              const tipoConfig = {
                DEFENSA_JUDICIAL: { label: 'Defensa Judicial', color: '#10B981' },
                JUZGAMIENTO: { label: 'Juzgamiento', color: '#DC2626' },
                ASESORIA: { label: 'Asesoría Jurídica', color: '#8B5CF6' },
                PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', color: '#F59E0B' },
                ORGANOS_CONTROL: { label: 'Órganos Control', color: '#2563EB' },
                OTRO: { label: 'Otro', color: '#6B7280' }
              }[tipo];

              return (
                <div key={tipo} className="p-4 rounded-lg border-2" style={{ borderColor: `${tipoConfig.color}40`, background: `${tipoConfig.color}10` }}>
                  <p className="text-sm font-medium text-gray-700">{tipoConfig.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: tipoConfig.color }}>{stats.total}</p>
                  <p className="text-xs text-gray-600 mt-1">{stats.docs} documentos</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estadísticas por Tipo de Documento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Documentos por Tipo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Object.entries(estadisticasPorTipoDoc) as [TipoDocumento, number][]).map(([tipo, cantidad]) => {
              const tipoConfig = TIPOS_DOCUMENTO.find(t => t.id === tipo);
              if (!tipoConfig) return null;

              return (
                <div key={tipo} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 truncate">{tipoConfig.nombre}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{cantidad}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}