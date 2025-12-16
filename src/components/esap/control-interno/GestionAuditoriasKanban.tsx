/**
 * GESTIÓN DE AUDITORÍAS COMPLETA CON KANBAN
 * Módulo consolidado que integra:
 * - Gestión de Auditorías
 * - Auditorías Territoriales
 * - Plan Individual de Auditoría
 * - Etapas: Planeación, Ejecución, Comunicación
 * - Listas de Chequeo
 * 
 * VISTA PRINCIPAL: Kanban Visual con Drag & Drop
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ClipboardCheck, Plus, Search, Filter, Calendar as CalendarIcon,
  Table as TableIcon, Map, LayoutGrid, Eye, Edit, Trash2,
  Users, Clock, AlertCircle, CheckCircle, FileText, PlayCircle,
  Send, Target, MapPin, Building2, Download, Upload, MoreVertical,
  Flag, TrendingUp, XCircle, ChevronRight, X, Save, Settings,
  List, Layers, Hash, User, FolderOpen, CheckSquare, AlertTriangle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type EstadoAuditoria = 'por-programar' | 'planeacion' | 'ejecucion' | 'comunicacion' | 'finalizada';
type TipoAuditoria = 'gestion' | 'financiera' | 'cumplimiento' | 'ti' | 'territorial';
type VistaActiva = 'kanban' | 'tabla' | 'calendario' | 'territoriales';
type TabDetalle = 'informacion' | 'plan-individual' | 'etapas' | 'listas-chequeo' | 'hallazgos' | 'documentos';
type SubtabEtapa = 'planeacion' | 'ejecucion' | 'comunicacion';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  estado: EstadoAuditoria;
  areaAuditada: string;
  sede?: string; // Para territoriales
  liderAuditoria: string;
  equipoAuditor: string[];
  fechaInicio: string;
  fechaFin: string;
  progreso: number; // 0-100
  prioridad: 'alta' | 'media' | 'baja';
  objetivoGeneral: string;
  alcance: string;
  hallazgos: number;
  alertas: string[];
  documentos: number;
  ultimaActualizacion: string;
}

interface ColumnaKanban {
  id: EstadoAuditoria;
  titulo: string;
  color: string;
  icono: JSX.Element;
  descripcion: string;
}

// ============ DATOS - AUDITORÍAS ============

const AUDITORIAS_EJEMPLO: Auditoria[] = [
  {
    id: 'aud-001',
    codigo: 'AUD-2025-001',
    nombre: 'Auditoría de Gestión - Dirección Académica',
    tipo: 'gestion',
    estado: 'ejecucion',
    areaAuditada: 'Dirección Académica',
    liderAuditoria: 'María González',
    equipoAuditor: ['Juan Pérez', 'Ana Martínez'],
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-14',
    progreso: 65,
    prioridad: 'alta',
    objetivoGeneral: 'Evaluar la eficiencia y eficacia de los procesos académicos',
    alcance: 'Procesos de admisión, matrícula, y seguimiento académico',
    hallazgos: 3,
    alertas: [],
    documentos: 12,
    ultimaActualizacion: '2025-01-20'
  },
  {
    id: 'aud-002',
    codigo: 'AUD-2025-002',
    nombre: 'Auditoría Financiera - Presupuesto 2024',
    tipo: 'financiera',
    estado: 'planeacion',
    areaAuditada: 'Dirección Financiera',
    liderAuditoria: 'Carlos Rodríguez',
    equipoAuditor: ['Laura Silva', 'Pedro Castro', 'Diana López'],
    fechaInicio: '2025-02-01',
    fechaFin: '2025-03-17',
    progreso: 25,
    prioridad: 'alta',
    objetivoGeneral: 'Verificar la correcta ejecución presupuestal del año 2024',
    alcance: 'Ingresos, gastos, y balance financiero',
    hallazgos: 0,
    alertas: ['Reunión de apertura pendiente'],
    documentos: 5,
    ultimaActualizacion: '2025-01-18'
  },
  {
    id: 'aud-003',
    codigo: 'AUD-2025-003',
    nombre: 'Auditoría de Cumplimiento - Contratación',
    tipo: 'cumplimiento',
    estado: 'comunicacion',
    areaAuditada: 'Oficina Jurídica',
    liderAuditoria: 'Andrea Ramírez',
    equipoAuditor: ['Jorge Mendoza'],
    fechaInicio: '2024-12-01',
    fechaFin: '2024-12-20',
    progreso: 90,
    prioridad: 'media',
    objetivoGeneral: 'Verificar cumplimiento de normativa de contratación pública',
    alcance: 'Procesos de contratación del último trimestre 2024',
    hallazgos: 5,
    alertas: ['Informe final en revisión'],
    documentos: 28,
    ultimaActualizacion: '2025-01-10'
  },
  {
    id: 'aud-004',
    codigo: 'AUD-2025-T01',
    nombre: 'Auditoría Territorial - Antioquia',
    tipo: 'territorial',
    estado: 'por-programar',
    areaAuditada: 'Territorial Antioquia',
    sede: 'Antioquia',
    liderAuditoria: 'Roberto Vargas',
    equipoAuditor: ['Camila Ortiz', 'Felipe Gómez'],
    fechaInicio: '2025-03-01',
    fechaFin: '2025-03-05',
    progreso: 0,
    prioridad: 'media',
    objetivoGeneral: 'Evaluar gestión administrativa y académica de la territorial',
    alcance: 'Procesos misionales y de apoyo',
    hallazgos: 0,
    alertas: [],
    documentos: 0,
    ultimaActualizacion: '2025-01-05'
  },
  {
    id: 'aud-005',
    codigo: 'AUD-2025-004',
    nombre: 'Auditoría de Sistemas - Infraestructura TI',
    tipo: 'ti',
    estado: 'ejecucion',
    areaAuditada: 'Dirección de TI',
    liderAuditoria: 'Andrés Sánchez',
    equipoAuditor: ['Natalia Ruiz', 'Miguel Torres'],
    fechaInicio: '2025-01-10',
    fechaFin: '2025-02-04',
    progreso: 50,
    prioridad: 'alta',
    objetivoGeneral: 'Evaluar controles de seguridad y disponibilidad de sistemas',
    alcance: 'Infraestructura, seguridad, y respaldo de información',
    hallazgos: 2,
    alertas: ['Hallazgo crítico en seguridad'],
    documentos: 15,
    ultimaActualizacion: '2025-01-19'
  },
  {
    id: 'aud-006',
    codigo: 'AUD-2025-005',
    nombre: 'Auditoría de Gestión - Talento Humano',
    tipo: 'gestion',
    estado: 'finalizada',
    areaAuditada: 'Dirección de Talento Humano',
    liderAuditoria: 'Patricia Morales',
    equipoAuditor: ['Luis Herrera'],
    fechaInicio: '2024-11-01',
    fechaFin: '2024-11-30',
    progreso: 100,
    prioridad: 'baja',
    objetivoGeneral: 'Evaluar procesos de selección y bienestar laboral',
    alcance: 'Vinculación, capacitación, y bienestar',
    hallazgos: 4,
    alertas: [],
    documentos: 22,
    ultimaActualizacion: '2024-12-05'
  },
  {
    id: 'aud-007',
    codigo: 'AUD-2025-T02',
    nombre: 'Auditoría Territorial - Valle del Cauca',
    tipo: 'territorial',
    estado: 'planeacion',
    areaAuditada: 'Territorial Valle del Cauca',
    sede: 'Valle del Cauca',
    liderAuditoria: 'Sandra Mejía',
    equipoAuditor: ['Diego Parra', 'Carolina Ríos'],
    fechaInicio: '2025-02-10',
    fechaFin: '2025-02-14',
    progreso: 15,
    prioridad: 'media',
    objetivoGeneral: 'Evaluar gestión territorial y cumplimiento de objetivos',
    alcance: 'Procesos académicos y administrativos',
    hallazgos: 0,
    alertas: [],
    documentos: 3,
    ultimaActualizacion: '2025-01-15'
  },
  {
    id: 'aud-008',
    codigo: 'AUD-2025-006',
    nombre: 'Auditoría de Cumplimiento - PQRS',
    tipo: 'cumplimiento',
    estado: 'por-programar',
    areaAuditada: 'Atención al Ciudadano',
    liderAuditoria: 'Por asignar',
    equipoAuditor: [],
    fechaInicio: '2025-04-01',
    fechaFin: '2025-04-20',
    progreso: 0,
    prioridad: 'baja',
    objetivoGeneral: 'Verificar atención oportuna de PQRS',
    alcance: 'Sistema de PQRS del año 2024',
    hallazgos: 0,
    alertas: [],
    documentos: 0,
    ultimaActualizacion: '2025-01-08'
  }
];

// ============ CONFIGURACIÓN COLUMNAS KANBAN ============

const COLUMNAS_KANBAN: ColumnaKanban[] = [
  {
    id: 'por-programar',
    titulo: 'Por Programar',
    color: '#6B7280',
    icono: <Clock className="w-5 h-5" />,
    descripcion: 'Auditorías pendientes de iniciar'
  },
  {
    id: 'planeacion',
    titulo: 'Planeación',
    color: '#3B82F6',
    icono: <CalendarIcon className="w-5 h-5" />,
    descripcion: 'Preparación y reunión de apertura'
  },
  {
    id: 'ejecucion',
    titulo: 'Ejecución',
    color: '#F59E0B',
    icono: <PlayCircle className="w-5 h-5" />,
    descripcion: 'Aplicación de pruebas y evidencias'
  },
  {
    id: 'comunicacion',
    titulo: 'Comunicación',
    color: '#8B5CF6',
    icono: <Send className="w-5 h-5" />,
    descripcion: 'Informe y reunión de cierre'
  },
  {
    id: 'finalizada',
    titulo: 'Finalizada',
    color: '#10B981',
    icono: <CheckCircle className="w-5 h-5" />,
    descripcion: 'Auditorías completadas'
  }
];

// ============ UTILIDADES ============

const getTipoAuditoriaInfo = (tipo: TipoAuditoria) => {
  const info = {
    gestion: { label: 'Gestión', color: '#3B82F6', icono: '📊' },
    financiera: { label: 'Financiera', color: '#10B981', icono: '💰' },
    cumplimiento: { label: 'Cumplimiento', color: '#F59E0B', icono: '⚖️' },
    ti: { label: 'Sistemas TI', color: '#8B5CF6', icono: '💻' },
    territorial: { label: 'Territorial', color: '#EC4899', icono: '🗺️' }
  };
  return info[tipo];
};

const getPrioridadColor = (prioridad: 'alta' | 'media' | 'baja') => {
  const colores = {
    alta: '#EF4444',
    media: '#F59E0B',
    baja: '#10B981'
  };
  return colores[prioridad];
};

// ============ COMPONENTE PRINCIPAL ============

export function GestionAuditoriasKanban() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>(AUDITORIAS_EJEMPLO);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoAuditoria | 'todos'>('todos');
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<Auditoria | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Filtrar auditorías
  const auditoriasFiltradas = auditorias.filter(aud => {
    const matchBusqueda = aud.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          aud.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          aud.areaAuditada.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || aud.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  // Mover auditoría (Drag & Drop)
  const moverAuditoria = (auditoriaId: string, nuevoEstado: EstadoAuditoria) => {
    setAuditorias(prev => prev.map(aud =>
      aud.id === auditoriaId ? { ...aud, estado: nuevoEstado } : aud
    ));
    toast.success('Auditoría movida exitosamente');
  };

  const abrirDetalle = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setMostrarDetalle(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7" style={{ color: '#F97316' }} />
              Gestión de Auditorías Completa
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Vista Kanban • Planificación • Ejecución • Seguimiento Integral
            </p>
          </div>

          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Auditoría
          </Button>
        </div>

        {/* BARRA DE HERRAMIENTAS */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar auditorías..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filtro por tipo */}
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los tipos</option>
                <option value="gestion">Auditoría de Gestión</option>
                <option value="financiera">Auditoría Financiera</option>
                <option value="cumplimiento">Auditoría de Cumplimiento</option>
                <option value="ti">Auditoría de Sistemas TI</option>
                <option value="territorial">Auditoría Territorial</option>
              </select>
            </div>

            {/* Selector de vista */}
            <div className="flex gap-2">
              <Button
                variant={vistaActiva === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActiva('kanban')}
                className="flex-1"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={vistaActiva === 'tabla' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActiva('tabla')}
                className="flex-1"
              >
                <TableIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={vistaActiva === 'calendario' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActiva('calendario')}
                className="flex-1"
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={vistaActiva === 'territoriales' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActiva('territoriales')}
                className="flex-1"
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            {COLUMNAS_KANBAN.map(col => {
              const count = auditoriasFiltradas.filter(a => a.estado === col.id).length;
              return (
                <div
                  key={col.id}
                  className="p-3 rounded-lg border-2"
                  style={{ borderColor: col.color, background: col.color + '10' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div style={{ color: col.color }}>{col.icono}</div>
                    <span className="text-xs font-bold text-gray-600">{col.titulo}</span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: col.color }}>{count}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* CONTENIDO SEGÚN VISTA */}
        <AnimatePresence mode="wait">
          {vistaActiva === 'kanban' && (
            <VistaKanban
              auditorias={auditoriasFiltradas}
              onMoverAuditoria={moverAuditoria}
              onAbrirDetalle={abrirDetalle}
            />
          )}
          {vistaActiva === 'tabla' && (
            <VistaTabla
              auditorias={auditoriasFiltradas}
              onAbrirDetalle={abrirDetalle}
            />
          )}
          {vistaActiva === 'calendario' && (
            <VistaCalendario auditorias={auditoriasFiltradas} />
          )}
          {vistaActiva === 'territoriales' && (
            <VistaTerritoriales
              auditorias={auditoriasFiltradas.filter(a => a.tipo === 'territorial')}
              onAbrirDetalle={abrirDetalle}
            />
          )}
        </AnimatePresence>

        {/* MODAL DETALLE */}
        <AnimatePresence>
          {mostrarDetalle && auditoriaSeleccionada && (
            <ModalDetalleAuditoria
              auditoria={auditoriaSeleccionada}
              onCerrar={() => setMostrarDetalle(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}

// ============ VISTA KANBAN ============

interface VistaKanbanProps {
  auditorias: Auditoria[];
  onMoverAuditoria: (id: string, estado: EstadoAuditoria) => void;
  onAbrirDetalle: (auditoria: Auditoria) => void;
}

function VistaKanban({ auditorias, onMoverAuditoria, onAbrirDetalle }: VistaKanbanProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
    >
      {COLUMNAS_KANBAN.map(columna => {
        const auditoriasColumna = auditorias.filter(a => a.estado === columna.id);
        return (
          <ColumnaKanban
            key={columna.id}
            columna={columna}
            auditorias={auditoriasColumna}
            onDrop={(auditoriaId) => onMoverAuditoria(auditoriaId, columna.id)}
            onAbrirDetalle={onAbrirDetalle}
          />
        );
      })}
    </motion.div>
  );
}

// ============ COLUMNA KANBAN ============

interface ColumnaKanbanProps {
  columna: ColumnaKanban;
  auditorias: Auditoria[];
  onDrop: (auditoriaId: string) => void;
  onAbrirDetalle: (auditoria: Auditoria) => void;
}

function ColumnaKanban({ columna, auditorias, onDrop, onAbrirDetalle }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'AUDITORIA',
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop}
      className={`rounded-xl border-2 transition-all ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Header de columna */}
      <div className="p-4 border-b-2" style={{ borderColor: columna.color, background: columna.color + '15' }}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ color: columna.color }}>{columna.icono}</div>
          <h3 className="font-black text-gray-900">{columna.titulo}</h3>
          <Badge style={{ background: columna.color, color: 'white' }}>
            {auditorias.length}
          </Badge>
        </div>
        <p className="text-xs text-gray-600">{columna.descripcion}</p>
      </div>

      {/* Cards de auditorías */}
      <div className="p-3 space-y-3">
        {auditorias.map(auditoria => (
          <CardAuditoria
            key={auditoria.id}
            auditoria={auditoria}
            onAbrirDetalle={onAbrirDetalle}
          />
        ))}

        {auditorias.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No hay auditorías</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CARD AUDITORÍA (Draggable) ============

interface CardAuditoriaProps {
  auditoria: Auditoria;
  onAbrirDetalle: (auditoria: Auditoria) => void;
}

function CardAuditoria({ auditoria, onAbrirDetalle }: CardAuditoriaProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'AUDITORIA',
    item: { id: auditoria.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  const tipoInfo = getTipoAuditoriaInfo(auditoria.tipo);

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="bg-white p-3 rounded-lg border-2 border-gray-200 cursor-move hover:border-blue-300 transition-all"
      onClick={() => onAbrirDetalle(auditoria)}
    >
      {/* Header del card */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <Badge variant="outline" className="mb-1 text-xs">
            {auditoria.codigo}
          </Badge>
          <h4 className="font-bold text-sm text-gray-900 line-clamp-2">
            {auditoria.nombre}
          </h4>
        </div>
        <div className="text-xl ml-2">{tipoInfo.icono}</div>
      </div>

      {/* Tipo y sede */}
      <div className="flex flex-wrap gap-1 mb-2">
        <Badge
          style={{ background: tipoInfo.color + '20', color: tipoInfo.color }}
          className="text-xs"
        >
          {tipoInfo.label}
        </Badge>
        {auditoria.sede && (
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            {auditoria.sede}
          </Badge>
        )}
      </div>

      {/* Área auditada */}
      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
        <Building2 className="w-3 h-3" />
        {auditoria.areaAuditada}
      </p>

      {/* Líder */}
      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
        <User className="w-3 h-3" />
        {auditoria.liderAuditoria}
      </p>

      {/* Progreso */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-700">Progreso</span>
          <span className="text-xs font-bold text-gray-900">{auditoria.progreso}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${auditoria.progreso}%`,
              background: auditoria.progreso === 100 ? '#10B981' : '#3B82F6'
            }}
          />
        </div>
      </div>

      {/* Fechas */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
        <Clock className="w-3 h-3" />
        <span>{auditoria.fechaInicio} → {auditoria.fechaFin}</span>
      </div>

      {/* Indicadores */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {auditoria.hallazgos > 0 && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {auditoria.hallazgos}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {auditoria.documentos}
          </Badge>
        </div>
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: getPrioridadColor(auditoria.prioridad) }}
          title={`Prioridad ${auditoria.prioridad}`}
        />
      </div>

      {/* Alertas */}
      {auditoria.alertas.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {auditoria.alertas[0]}
        </div>
      )}
    </motion.div>
  );
}

// ============ VISTA TABLA ============

function VistaTabla({ auditorias, onAbrirDetalle }: { auditorias: Auditoria[], onAbrirDetalle: (a: Auditoria) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Líder</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Progreso</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Hallazgos</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {auditorias.map((aud, idx) => {
                const tipoInfo = getTipoAuditoriaInfo(aud.tipo);
                const estadoInfo = COLUMNAS_KANBAN.find(c => c.id === aud.estado);
                return (
                  <tr key={aud.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => onAbrirDetalle(aud)}>
                    <td className="px-4 py-3 text-sm font-mono">{aud.codigo}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{aud.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: tipoInfo.color + '20', color: tipoInfo.color }}>
                        {tipoInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: estadoInfo?.color, color: 'white' }}>
                        {estadoInfo?.titulo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{aud.liderAuditoria}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${aud.progreso}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{aud.progreso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {aud.hallazgos > 0 ? (
                        <Badge variant="outline" style={{ color: '#EF4444' }}>
                          {aud.hallazgos}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA CALENDARIO (Placeholder) ============

function VistaCalendario({ auditorias }: { auditorias: Auditoria[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-12 text-center">
        <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Vista Calendario</h3>
        <p className="text-sm text-gray-600 mb-4">
          Próximamente: Visualización de auditorías en calendario mensual/semanal
        </p>
        <p className="text-sm text-gray-500">
          {auditorias.length} auditorías en el rango seleccionado
        </p>
      </Card>
    </motion.div>
  );
}

// ============ VISTA TERRITORIALES ============

function VistaTerritoriales({ auditorias, onAbrirDetalle }: { auditorias: Auditoria[], onAbrirDetalle: (a: Auditoria) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" style={{ color: '#EC4899' }} />
          Auditorías Territoriales (16 Sedes)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auditorias.map(aud => (
            <div
              key={aud.id}
              className="p-4 border-2 border-pink-200 rounded-xl hover:border-pink-400 cursor-pointer transition-all"
              onClick={() => onAbrirDetalle(aud)}
              style={{ background: '#FDF2F8' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: '#EC4899' }} />
                <h4 className="font-bold text-gray-900">{aud.sede}</h4>
              </div>
              <p className="text-sm text-gray-700 mb-2">{aud.nombre}</p>
              <Badge variant="outline">{aud.codigo}</Badge>
            </div>
          ))}
        </div>

        {auditorias.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No hay auditorías territoriales en el filtro actual</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============ MODAL DETALLE AUDITORÍA ============

function ModalDetalleAuditoria({ auditoria, onCerrar }: { auditoria: Auditoria, onCerrar: () => void }) {
  const [tabActivo, setTabActivo] = useState<TabDetalle>('informacion');
  const [subtabEtapa, setSubtabEtapa] = useState<SubtabEtapa>('planeacion');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{auditoria.codigo}</Badge>
                <Badge style={{ background: getTipoAuditoriaInfo(auditoria.tipo).color, color: 'white' }}>
                  {getTipoAuditoriaInfo(auditoria.tipo).label}
                </Badge>
                <Badge style={{ background: COLUMNAS_KANBAN.find(c => c.id === auditoria.estado)?.color, color: 'white' }}>
                  {COLUMNAS_KANBAN.find(c => c.id === auditoria.estado)?.titulo}
                </Badge>
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{auditoria.nombre}</h2>
              <p className="text-sm text-gray-600">{auditoria.areaAuditada}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onCerrar}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progreso */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Progreso General</span>
              <span className="text-sm font-black text-gray-900">{auditoria.progreso}%</span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border">
              <div
                className="h-full transition-all"
                style={{
                  width: `${auditoria.progreso}%`,
                  background: 'linear-gradient(to right, #3B82F6, #8B5CF6)'
                }}
              />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b bg-gray-50 px-6 overflow-x-auto">
          <div className="flex gap-1">
            <TabButtonDetalle
              active={tabActivo === 'informacion'}
              onClick={() => setTabActivo('informacion')}
              icon={<FileText className="w-4 h-4" />}
              label="Información"
            />
            <TabButtonDetalle
              active={tabActivo === 'plan-individual'}
              onClick={() => setTabActivo('plan-individual')}
              icon={<Target className="w-4 h-4" />}
              label="Plan Individual"
            />
            <TabButtonDetalle
              active={tabActivo === 'etapas'}
              onClick={() => setTabActivo('etapas')}
              icon={<Layers className="w-4 h-4" />}
              label="Etapas"
            />
            <TabButtonDetalle
              active={tabActivo === 'listas-chequeo'}
              onClick={() => setTabActivo('listas-chequeo')}
              icon={<CheckSquare className="w-4 h-4" />}
              label="Listas Chequeo"
            />
            <TabButtonDetalle
              active={tabActivo === 'hallazgos'}
              onClick={() => setTabActivo('hallazgos')}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Hallazgos"
              badge={auditoria.hallazgos}
            />
            <TabButtonDetalle
              active={tabActivo === 'documentos'}
              onClick={() => setTabActivo('documentos')}
              icon={<FolderOpen className="w-4 h-4" />}
              label="Documentos"
              badge={auditoria.documentos}
            />
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {tabActivo === 'informacion' && <TabInformacion auditoria={auditoria} />}
            {tabActivo === 'plan-individual' && <TabPlanIndividual auditoria={auditoria} />}
            {tabActivo === 'etapas' && (
              <TabEtapas
                auditoria={auditoria}
                subtabActivo={subtabEtapa}
                onSubtabChange={setSubtabEtapa}
              />
            )}
            {tabActivo === 'listas-chequeo' && <TabListasChequeo auditoria={auditoria} />}
            {tabActivo === 'hallazgos' && <TabHallazgos auditoria={auditoria} />}
            {tabActivo === 'documentos' && <TabDocumentos auditoria={auditoria} />}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Última actualización: {auditoria.ultimaActualizacion}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
            <Button style={{ background: '#003DA5' }}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Componente auxiliar para tabs del detalle
function TabButtonDetalle({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
        active ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
      {badge > 0 && (
        <Badge style={{ background: '#EF4444', color: 'white' }}>{badge}</Badge>
      )}
    </button>
  );
}

// ============ TABS DEL MODAL (Placeholders por ahora) ============

function TabInformacion({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoField label="Código" value={auditoria.codigo} />
        <InfoField label="Tipo" value={getTipoAuditoriaInfo(auditoria.tipo).label} />
        <InfoField label="Área Auditada" value={auditoria.areaAuditada} />
        <InfoField label="Líder de Auditoría" value={auditoria.liderAuditoria} />
        <InfoField label="Fecha Inicio" value={auditoria.fechaInicio} />
        <InfoField label="Fecha Fin" value={auditoria.fechaFin} />
        <div className="md:col-span-2">
          <InfoField label="Objetivo General" value={auditoria.objetivoGeneral} />
        </div>
        <div className="md:col-span-2">
          <InfoField label="Alcance" value={auditoria.alcance} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2">Equipo Auditor</label>
          <div className="flex flex-wrap gap-2">
            {auditoria.equipoAuditor.map((miembro, idx) => (
              <Badge key={idx} variant="outline">
                <User className="w-3 h-3 mr-1" />
                {miembro}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InfoField({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">{value}</p>
    </div>
  );
}

function TabPlanIndividual({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className="p-6 text-center">
        <Target className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Plan Individual de Auditoría</h3>
        <p className="text-sm text-gray-600 mb-4">
          Documento completo con objetivos, metodología y recursos
        </p>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Ver/Editar PIA
        </Button>
      </Card>
    </motion.div>
  );
}

function TabEtapas({ auditoria, subtabActivo, onSubtabChange }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-2 mb-4">
        <Button
          variant={subtabActivo === 'planeacion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSubtabChange('planeacion')}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Planeación
        </Button>
        <Button
          variant={subtabActivo === 'ejecucion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSubtabChange('ejecucion')}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Ejecución
        </Button>
        <Button
          variant={subtabActivo === 'comunicacion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSubtabChange('comunicacion')}
        >
          <Send className="w-4 h-4 mr-2" />
          Comunicación
        </Button>
      </div>
      <Card className="p-6 text-center">
        <p className="text-sm text-gray-600">
          Contenido de la etapa: <strong>{subtabActivo}</strong>
        </p>
      </Card>
    </motion.div>
  );
}

function TabListasChequeo({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className="p-6 text-center">
        <CheckSquare className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Listas de Chequeo</h3>
        <p className="text-sm text-gray-600">
          Listas de verificación estándar según tipo de auditoría
        </p>
      </Card>
    </motion.div>
  );
}

function TabHallazgos({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Hallazgos de esta Auditoría ({auditoria.hallazgos})
        </h3>
        <p className="text-sm text-gray-600">
          Hallazgos detectados durante la ejecución de la auditoría
        </p>
      </Card>
    </motion.div>
  );
}

function TabDocumentos({ auditoria }: { auditoria: Auditoria }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          Documentos ({auditoria.documentos})
        </h3>
        <p className="text-sm text-gray-600">
          Actas, memorandos, evidencias e informes asociados
        </p>
      </Card>
    </motion.div>
  );
}
