/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPEDIENTES - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de expedientes digitales por auditoría
 * Cada auditoría = 1 expediente con carpetas organizadas por fase
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * 
 * ✨ Características Premium:
 * - Expediente por cada auditoría (identificado por código)
 * - Carpetas organizadas por fase del proceso
 * - Vista de árbol de documentos
 * - Búsqueda por expediente
 * - Carga masiva de documentos
 * - Integración con auditorías
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, FileText, Upload, Download, Search, Eye,
  ChevronRight, ChevronDown, Plus, Filter, Calendar, User,
  Archive, CheckCircle2, AlertCircle, Clock,
  File, FolderCheck, FileCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from './HeaderModuloCIG';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type FaseAuditoria = 
  | 'PLANIFICACION'
  | 'EJECUCION'
  | 'HALLAZGOS'
  | 'COMUNICACION_RESULTADOS'
  | 'SEGUIMIENTO'
  | 'CIERRE';

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: string;
  fechaCreacion: string;
  autor: string;
  fase: FaseAuditoria;
}

interface Expediente {
  id: string;
  codigoAuditoria: string;
  nombreAuditoria: string;
  tipoAuditoria: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
  responsable: string;
  totalDocumentos: number;
  documentos: Documento[];
}

type VistaActual = 'expedientes' | 'estadisticas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE FASES
// ════════════════════════════════════════════════════════════════════════════

const FASES_AUDITORIA = [
  {
    id: 'PLANIFICACION' as FaseAuditoria,
    nombre: 'Planificación',
    descripcion: 'Programa de auditoría, memorando de asignación, alcance',
    color: 'blue',
    icon: FileText
  },
  {
    id: 'EJECUCION' as FaseAuditoria,
    nombre: 'Ejecución',
    descripcion: 'Papeles de trabajo, evidencias, entrevistas',
    color: 'green',
    icon: FolderOpen
  },
  {
    id: 'HALLAZGOS' as FaseAuditoria,
    nombre: 'Hallazgos',
    descripcion: 'Matriz de hallazgos, observaciones, validaciones',
    color: 'orange',
    icon: AlertCircle
  },
  {
    id: 'COMUNICACION_RESULTADOS' as FaseAuditoria,
    nombre: 'Comunicación de Resultados',
    descripcion: 'Informe final, acta de cierre, respuestas',
    color: 'purple',
    icon: FileCheck
  },
  {
    id: 'SEGUIMIENTO' as FaseAuditoria,
    nombre: 'Seguimiento',
    descripcion: 'Planes de mejoramiento, avances, verificaciones',
    color: 'cyan',
    icon: Clock
  },
  {
    id: 'CIERRE' as FaseAuditoria,
    nombre: 'Cierre',
    descripcion: 'Acta de cierre definitivo, certificaciones',
    color: 'gray',
    icon: Archive
  }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: 'exp-1',
    codigoAuditoria: 'AU-2025-001',
    nombreAuditoria: 'Auditoría Gestión Contractual',
    tipoAuditoria: 'Auditoría de Gestión',
    fechaInicio: '2025-01-15',
    estado: 'EN_PROCESO',
    responsable: 'Fernando Ávila',
    totalDocumentos: 18,
    documentos: [
      // PLANIFICACIÓN
      { id: 'd1', nombre: 'Programa de Auditoría AU-2025-001.pdf', tipo: 'PDF', tamanio: '1.2 MB', fechaCreacion: '2025-01-15', autor: 'Fernando Ávila', fase: 'PLANIFICACION' },
      { id: 'd2', nombre: 'Memorando de Asignación.pdf', tipo: 'PDF', tamanio: '345 KB', fechaCreacion: '2025-01-15', autor: 'Fernando Ávila', fase: 'PLANIFICACION' },
      { id: 'd3', nombre: 'Alcance y Objetivos.docx', tipo: 'DOCX', tamanio: '89 KB', fechaCreacion: '2025-01-16', autor: 'Fernando Ávila', fase: 'PLANIFICACION' },
      
      // EJECUCIÓN
      { id: 'd4', nombre: 'Papeles de Trabajo - Semana 1.xlsx', tipo: 'XLSX', tamanio: '2.4 MB', fechaCreacion: '2025-01-22', autor: 'María Rodríguez', fase: 'EJECUCION' },
      { id: 'd5', nombre: 'Evidencia Contratos Vigentes.pdf', tipo: 'PDF', tamanio: '5.6 MB', fechaCreacion: '2025-01-25', autor: 'Carlos Gómez', fase: 'EJECUCION' },
      { id: 'd6', nombre: 'Acta Entrevista Director Jurídico.pdf', tipo: 'PDF', tamanio: '678 KB', fechaCreacion: '2025-01-28', autor: 'Fernando Ávila', fase: 'EJECUCION' },
      { id: 'd7', nombre: 'Papeles de Trabajo - Semana 2.xlsx', tipo: 'XLSX', tamanio: '3.1 MB', fechaCreacion: '2025-02-05', autor: 'María Rodríguez', fase: 'EJECUCION' },
      
      // HALLAZGOS
      { id: 'd8', nombre: 'Matriz de Hallazgos Preliminar.xlsx', tipo: 'XLSX', tamanio: '1.8 MB', fechaCreacion: '2025-02-10', autor: 'Fernando Ávila', fase: 'HALLAZGOS' },
      { id: 'd9', nombre: 'Hallazgo H-001 Evidencias.pdf', tipo: 'PDF', tamanio: '4.2 MB', fechaCreacion: '2025-02-12', autor: 'María Rodríguez', fase: 'HALLAZGOS' },
      { id: 'd10', nombre: 'Respuesta Auditado Hallazgo H-001.pdf', tipo: 'PDF', tamanio: '890 KB', fechaCreacion: '2025-02-15', autor: 'Sistema', fase: 'HALLAZGOS' },
      
      // COMUNICACIÓN
      { id: 'd11', nombre: 'Informe Final AU-2025-001.pdf', tipo: 'PDF', tamanio: '3.5 MB', fechaCreacion: '2025-02-20', autor: 'Fernando Ávila', fase: 'COMUNICACION_RESULTADOS' },
      { id: 'd12', nombre: 'Acta Reunión Cierre.pdf', tipo: 'PDF', tamanio: '567 KB', fechaCreacion: '2025-02-22', autor: 'Fernando Ávila', fase: 'COMUNICACION_RESULTADOS' }
    ]
  },
  {
    id: 'exp-2',
    codigoAuditoria: 'AU-2024-012',
    nombreAuditoria: 'Auditoría Control Interno Contable',
    tipoAuditoria: 'Auditoría de Cumplimiento',
    fechaInicio: '2024-09-10',
    fechaFin: '2024-12-20',
    estado: 'CERRADO',
    responsable: 'María Rodríguez',
    totalDocumentos: 24,
    documentos: [
      { id: 'd13', nombre: 'Programa de Auditoría AU-2024-012.pdf', tipo: 'PDF', tamanio: '1.1 MB', fechaCreacion: '2024-09-10', autor: 'María Rodríguez', fase: 'PLANIFICACION' },
      { id: 'd14', nombre: 'Informe Final AU-2024-012.pdf', tipo: 'PDF', tamanio: '4.8 MB', fechaCreacion: '2024-12-15', autor: 'María Rodríguez', fase: 'COMUNICACION_RESULTADOS' },
      { id: 'd15', nombre: 'Acta de Cierre Definitivo.pdf', tipo: 'PDF', tamanio: '445 KB', fechaCreacion: '2024-12-20', autor: 'María Rodríguez', fase: 'CIERRE' }
    ]
  },
  {
    id: 'exp-3',
    codigoAuditoria: 'AU-2025-003',
    nombreAuditoria: 'Auditoría Talento Humano',
    tipoAuditoria: 'Auditoría de Gestión',
    fechaInicio: '2025-02-01',
    estado: 'ABIERTO',
    responsable: 'Carlos Gómez',
    totalDocumentos: 6,
    documentos: [
      { id: 'd16', nombre: 'Programa de Auditoría AU-2025-003.pdf', tipo: 'PDF', tamanio: '980 KB', fechaCreacion: '2025-02-01', autor: 'Carlos Gómez', fase: 'PLANIFICACION' },
      { id: 'd17', nombre: 'Memorando de Asignación.pdf', tipo: 'PDF', tamanio: '234 KB', fechaCreacion: '2025-02-01', autor: 'Carlos Gómez', fase: 'PLANIFICACION' }
    ]
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ExpedientesModulePremium() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('expedientes');

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG
        titulo="Expedientes"
        subtitulo="Control Interno de Gestión"
      />

      {/* Navegación */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="mx-auto px-8 max-w-[1920px]">
          <div className="flex gap-1">
            <TabButton
              active={vistaActiva === 'expedientes'}
              onClick={() => setVistaActiva('expedientes')}
              icon={<Folder className="w-4 h-4" />}
              label="Expedientes por Auditoría"
              badge={EXPEDIENTES_MOCK.length.toString()}
            />
            <TabButton
              active={vistaActiva === 'estadisticas'}
              onClick={() => setVistaActiva('estadisticas')}
              icon={<Archive className="w-4 h-4" />}
              label="Estadísticas"
            />
          </div>
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
        relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active 
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EXPEDIENTES POR AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

function VistaExpedientes() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ABIERTO' | 'EN_PROCESO' | 'CERRADO'>('TODOS');
  const [expedienteExpandido, setExpedienteExpandido] = useState<string | null>(null);

  const expedientesFiltrados = useMemo(() => {
    let resultado = EXPEDIENTES_MOCK;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(exp =>
        exp.codigoAuditoria.toLowerCase().includes(search) ||
        exp.nombreAuditoria.toLowerCase().includes(search)
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(exp => exp.estado === filtroEstado);
    }

    return resultado;
  }, [busqueda, filtroEstado]);

  const estadisticas = useMemo(() => {
    const total = EXPEDIENTES_MOCK.length;
    const abiertos = EXPEDIENTES_MOCK.filter(e => e.estado === 'ABIERTO').length;
    const enProceso = EXPEDIENTES_MOCK.filter(e => e.estado === 'EN_PROCESO').length;
    const cerrados = EXPEDIENTES_MOCK.filter(e => e.estado === 'CERRADO').length;
    const totalDocs = EXPEDIENTES_MOCK.reduce((acc, exp) => acc + exp.totalDocumentos, 0);

    return { total, abiertos, enProceso, cerrados, totalDocs };
  }, []);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl text-gray-900 font-medium mb-1">Expedientes por Auditoría</h2>
            <p className="text-sm text-gray-600">Cada auditoría tiene su expediente digital organizado por fases</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Total Expedientes</div>
            <div className="text-2xl font-semibold text-blue-900">{estadisticas.total}</div>
            <div className="text-xs text-blue-600 mt-1">Auditorías</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Abiertos</div>
            <div className="text-2xl font-semibold text-green-900">{estadisticas.abiertos}</div>
            <div className="text-xs text-green-600 mt-1">Planificación</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-xs text-yellow-700 mb-1">En Proceso</div>
            <div className="text-2xl font-semibold text-yellow-900">{estadisticas.enProceso}</div>
            <div className="text-xs text-yellow-600 mt-1">Ejecución</div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-700 mb-1">Cerrados</div>
            <div className="text-2xl font-semibold text-gray-900">{estadisticas.cerrados}</div>
            <div className="text-xs text-gray-600 mt-1">Finalizados</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="text-xs text-purple-700 mb-1">Documentos</div>
            <div className="text-2xl font-semibold text-purple-900">{estadisticas.totalDocs}</div>
            <div className="text-xs text-purple-600 mt-1">Total archivados</div>
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por código de auditoría o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2">
            <FilterButton
              active={filtroEstado === 'TODOS'}
              onClick={() => setFiltroEstado('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroEstado === 'ABIERTO'}
              onClick={() => setFiltroEstado('ABIERTO')}
              label="Abiertos"
              count={estadisticas.abiertos}
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
              active={filtroEstado === 'CERRADO'}
              onClick={() => setFiltroEstado('CERRADO')}
              label="Cerrados"
              count={estadisticas.cerrados}
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
      </div>
    </div>
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
    ABIERTO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Abierto' },
    EN_PROCESO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Proceso' },
    CERRADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cerrado' }
  };

  const config = estadoConfig[expediente.estado];

  // Agrupar documentos por fase
  const documentosPorFase = useMemo(() => {
    const grupos: Record<FaseAuditoria, Documento[]> = {
      PLANIFICACION: [],
      EJECUCION: [],
      HALLAZGOS: [],
      COMUNICACION_RESULTADOS: [],
      SEGUIMIENTO: [],
      CIERRE: []
    };

    expediente.documentos.forEach(doc => {
      grupos[doc.fase].push(doc);
    });

    return grupos;
  }, [expediente.documentos]);

  const handleCargarDocumento = () => {
    setModalCargar(true);
    
    toast.info('Abrir cargador de documentos', {
      description: `Expediente ${expediente.codigoAuditoria}`,
      duration: 2000,
    });

    console.log('📤 Cargar documento al expediente:', {
      expedienteId: expediente.id,
      codigoAuditoria: expediente.codigoAuditoria,
      nombreAuditoria: expediente.nombreAuditoria,
      estado: expediente.estado,
      documentosActuales: expediente.totalDocumentos,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header del Expediente */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] rounded-xl flex items-center justify-center flex-shrink-0">
                <Folder className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg text-gray-900 font-medium">{expediente.codigoAuditoria}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{expediente.nombreAuditoria}</p>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 text-gray-900">{expediente.tipoAuditoria}</span>
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

            <div className="flex gap-2">
              <button 
                onClick={handleCargarDocumento}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Cargar
              </button>
              <button
                onClick={onToggleExpand}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
              >
                {expandido ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ocultar Carpetas
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Ver Carpetas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estructura de Carpetas por Fase */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Estructura del Expediente por Fases</h4>

                <div className="space-y-3">
                  {FASES_AUDITORIA.map((fase) => {
                    const docs = documentosPorFase[fase.id];
                    const Icon = fase.icon;

                    return (
                      <CarpetaFase
                        key={fase.id}
                        fase={fase}
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
          onCargar={() => {
            setModalCargar(false);
            toast.success('Documento cargado exitosamente');
          }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARPETA FASE
// ════════════════════════════════════════════════════════════════════════════

interface CarpetaFaseProps {
  fase: typeof FASES_AUDITORIA[0];
  documentos: Documento[];
  icon: React.ReactNode;
}

function CarpetaFase({ fase, documentos, icon }: CarpetaFaseProps) {
  const [expandido, setExpandido] = useState(false);
  const [documentoVisualizando, setDocumentoVisualizando] = useState<Documento | null>(null);

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const colorClass = colorClasses[fase.color as keyof typeof colorClasses];

  const handleVerDocumento = (doc: Documento) => {
    setDocumentoVisualizando(doc);
    
    toast.info('Visualizar documento', {
      description: doc.nombre,
      duration: 2000,
    });

    console.log('👁️ Ver documento:', {
      documentoId: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      tamanio: doc.tamanio,
      fase: doc.fase,
      faseNombre: fase.nombre,
      autor: doc.autor,
      fechaCreacion: doc.fechaCreacion,
      accion: 'visualizar',
      timestamp: new Date().toISOString()
    });

    // En producción: abrir visor de documentos o nueva pestaña
    // window.open(`/api/expedientes/documentos/${doc.id}/preview`, '_blank');
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
      tipo: doc.tipo,
      tamanio: doc.tamanio,
      fase: doc.fase,
      faseNombre: fase.nombre,
      autor: doc.autor,
      fechaCreacion: doc.fechaCreacion,
      accion: 'descargar',
      urlDescarga: `/api/expedientes/documentos/${doc.id}/download`,
      timestamp: new Date().toISOString()
    });

  };

  return (
    <>
      <div className={`rounded-lg border ${colorClass}`}>
        <button
          onClick={() => setExpandido(!expandido)}
          className="w-full p-4 flex items-center justify-between hover:bg-opacity-70 transition-all"
        >
          <div className="flex items-center gap-3">
            {expandido ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            <div className="text-left">
              <div className="font-medium text-sm">{fase.nombre}</div>
              <div className="text-xs opacity-80">{fase.descripcion}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-60 rounded">
              {documentos.length} documentos
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
              <div className="p-4 bg-white bg-opacity-50">
                {documentos.length === 0 ? (
                  <div className="text-center py-8 text-sm opacity-60">
                    <File className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No hay documentos en esta fase
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{doc.nombre}</div>
                            <div className="text-xs text-gray-600">
                              {doc.tamanio} • {doc.fechaCreacion} • {doc.autor}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVerDocumento(doc)}
                            className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDescargarDocumento(doc, e)}
                            className="p-2 text-gray-600 hover:text-[#1e5da8] hover:bg-blue-50 rounded transition-colors"
                            title="Descargar documento"
                          >
                            <Download className="w-4 h-4" />
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

      {/* Modal Ver Documento */}
      {documentoVisualizando && (
        <ModalVerDocumento
          documento={documentoVisualizando}
          fase={fase}
          onClose={() => setDocumentoVisualizando(null)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

function VistaEstadisticas() {
  const stats = useMemo(() => {
    const totalDocs = EXPEDIENTES_MOCK.reduce((acc, exp) => acc + exp.totalDocumentos, 0);
    const docsPorFase: Record<FaseAuditoria, number> = {
      PLANIFICACION: 0,
      EJECUCION: 0,
      HALLAZGOS: 0,
      COMUNICACION_RESULTADOS: 0,
      SEGUIMIENTO: 0,
      CIERRE: 0
    };

    EXPEDIENTES_MOCK.forEach(exp => {
      exp.documentos.forEach(doc => {
        docsPorFase[doc.fase]++;
      });
    });

    return { totalDocs, docsPorFase };
  }, []);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl text-gray-900 font-medium mb-6">Estadísticas de Expedientes</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Total Documentos</div>
            <div className="text-2xl font-semibold text-blue-900">{stats.totalDocs}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Expedientes Activos</div>
            <div className="text-2xl font-semibold text-green-900">{EXPEDIENTES_MOCK.filter(e => e.estado !== 'CERRADO').length}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="text-xs text-purple-700 mb-1">Promedio Docs/Expediente</div>
            <div className="text-2xl font-semibold text-purple-900">{Math.round(stats.totalDocs / EXPEDIENTES_MOCK.length)}</div>
          </div>
        </div>

        <h3 className="text-sm font-medium text-gray-900 mb-4">Documentos por Fase</h3>
        <div className="space-y-3">
          {FASES_AUDITORIA.map(fase => {
            const count = stats.docsPorFase[fase.id];
            const porcentaje = stats.totalDocs > 0 ? Math.round((count / stats.totalDocs) * 100) : 0;

            return (
              <div key={fase.id} className="flex items-center gap-4">
                <div className="w-48 text-sm text-gray-700">{fase.nombre}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] h-full transition-all"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <div className="w-20 text-sm text-gray-900 text-right font-medium">{count} ({porcentaje}%)</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'yellow' | 'gray';
}

function FilterButton({ active, onClick, label, count, color = 'gray' }: FilterButtonProps) {
  const colorClasses = {
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoProps {
  expediente: Expediente;
  onClose: () => void;
  onCargar: () => void;
}

function ModalCargarDocumento({ expediente, onClose, onCargar }: ModalCargarDocumentoProps) {
  const [fase, setFase] = useState<FaseAuditoria>('PLANIFICACION');
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleCargar = () => {
    // Validaciones
    if (!nombreDocumento.trim()) {
      toast.error('El nombre del documento es obligatorio');
      return;
    }

    // Simular carga del documento
    toast.success('Documento Cargado Exitosamente', {
      description: `${nombreDocumento} agregado a ${FASES_AUDITORIA.find(f => f.id === fase)?.nombre}`,
      duration: 4000,
    });

    console.log('📤 Cargar documento al expediente:', {
      expedienteId: expediente.id,
      codigoAuditoria: expediente.codigoAuditoria,
      nombreAuditoria: expediente.nombreAuditoria,
      documento: {
        nombre: nombreDocumento,
        fase: fase,
        faseNombre: FASES_AUDITORIA.find(f => f.id === fase)?.nombre,
        descripcion,
        fechaCarga: new Date().toISOString(),
        usuario: expediente.responsable
      },
      timestamp: new Date().toISOString()
    });

    // En producción: llamar al backend para cargar el documento
    // POST /api/expedientes/${expediente.id}/documentos
    // FormData con archivo + metadatos

    onCargar();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Cargar Documento al Expediente</h3>
          <p className="text-sm text-blue-100 mt-1">{expediente.codigoAuditoria} - {expediente.nombreAuditoria}</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información del Expediente */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Expediente:</span>
                  <span className="ml-2 text-blue-900">{expediente.codigoAuditoria}</span>
                </div>
                <span className="text-blue-400">•</span>
                <div>
                  <span className="text-blue-700 font-medium">Estado:</span>
                  <span className="ml-2 text-blue-900">{expediente.estado}</span>
                </div>
                <span className="text-blue-400">•</span>
                <div>
                  <span className="text-blue-700 font-medium">Docs actuales:</span>
                  <span className="ml-2 text-blue-900 font-semibold">{expediente.totalDocumentos}</span>
                </div>
              </div>
            </div>

            {/* Selección de Fase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fase del Proceso <span className="text-red-500">*</span>
              </label>
              <select
                value={fase}
                onChange={(e) => setFase(e.target.value as FaseAuditoria)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              >
                {FASES_AUDITORIA.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nombre} - {f.descripcion}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecciona la fase a la que pertenece este documento
              </p>
            </div>

            {/* Nombre del Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombreDocumento}
                onChange={(e) => setNombreDocumento(e.target.value)}
                placeholder="Ej: Programa de Auditoría AU-2025-001.pdf"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción / Notas
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Información adicional sobre este documento (opcional)"
              />
            </div>

            {/* Selector de Archivo (simulado) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Haz clic para seleccionar o arrastra el archivo aquí
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, XLSX, hasta 50MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Cargar Documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VER DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVerDocumentoProps {
  documento: Documento;
  fase: typeof FASES_AUDITORIA[0];
  onClose: () => void;
}

function ModalVerDocumento({ documento, fase, onClose }: ModalVerDocumentoProps) {
  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Vista Previa del Documento</h3>
          <p className="text-sm text-blue-100 mt-1">{documento.nombre}</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información del Documento */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-700 mb-1">Fase del Proceso</div>
                <div className="text-sm text-blue-900 font-medium">{fase.nombre}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-700 mb-1">Tipo de Documento</div>
                <div className="text-sm text-blue-900 font-medium">{documento.tipo}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-700 mb-1">Tamaño</div>
                <div className="text-sm text-blue-900 font-medium">{documento.tamanio}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-700 mb-1">Fecha de Creación</div>
                <div className="text-sm text-blue-900 font-medium">{documento.fechaCreacion}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 col-span-2">
                <div className="text-xs text-blue-700 mb-1">Autor</div>
                <div className="text-sm text-blue-900 font-medium">{documento.autor}</div>
              </div>
            </div>

            {/* Simulación de Vista Previa */}
            <div className="border-2 border-gray-200 rounded-lg bg-gray-50 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <FileText className="w-20 h-20 text-gray-400 mb-4" />
              <h4 className="text-lg text-gray-900 font-medium mb-2">Vista Previa del Documento</h4>
              <p className="text-sm text-gray-600 mb-4 max-w-md">
                En producción, aquí se mostrará el visor de documentos integrado para visualizar PDFs, Word, Excel, etc.
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-left max-w-md">
                <p className="text-xs text-gray-600 mb-2">Endpoint de integración:</p>
                <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  GET /api/expedientes/documentos/{documento.id}/preview
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              ID: {documento.id}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  toast.success('Descargando documento', {
                    description: `${documento.nombre} (${documento.tamanio})`,
                    duration: 3000,
                  });
                  console.log('⬇️ Descargar desde modal:', {
                    documentoId: documento.id,
                    nombre: documento.nombre,
                    timestamp: new Date().toISOString()
                  });
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}