/**
 * ============================================
 * RF018: AUDITORÍAS ESPECIALES - COMPLETO
 * ============================================
 * 
 * Sistema completo de gestión de auditorías especiales
 * no programadas con workflow de aprobación acelerado
 * 
 * VERSIÓN COMPLETA CON:
 * - Wizard de creación integrado
 * - Modal de detalle completo
 * - Vista de estadísticas con Recharts
 * - Workflow de aprobación
 * - Gestión de estados
 * - Acciones rápidas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025 - 22:00 COT
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Zap, FileWarning, Clock, Users, CheckCircle2,
  XCircle, Eye, Plus, Filter, Search, Calendar, Target,
  AlertCircle, TrendingUp, Send, Upload, Download,
  MessageSquare, Shield, Flag, Activity, Edit, Trash2,
  Check, X, ArrowRight, Bell, FileText, BarChart3
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { WizardAuditoriaEspecial } from './WizardAuditoriaEspecial';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

// ====================================
// TIPOS
// ====================================

type TipoAuditoriaEspecial = 
  | 'denuncia'
  | 'ente_control'
  | 'emergencia'
  | 'seguimiento_urgente'
  | 'revision_especifica';

type EstadoAuditoriaEspecial =
  | 'solicitud_pendiente'
  | 'en_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'en_ejecucion'
  | 'completada'
  | 'cancelada';

type Prioridad = 'critica' | 'alta' | 'media' | 'baja';

interface AuditoriaEspecial {
  id: string;
  codigo: string;
  tipo: TipoAuditoriaEspecial;
  titulo: string;
  descripcion: string;
  justificacion: string;
  prioridad: Prioridad;
  areaObjetivo: string;
  solicitante: string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  estado: EstadoAuditoriaEspecial;
  equipoAsignado: string[];
  liderAsignado?: string;
  hallazgosEncontrados?: number;
  observaciones?: string;
  documentosAdjuntos?: string[];
  aprobadoPor?: string;
  rechazadoPor?: string;
  motivoRechazo?: string;
}

// ====================================
// CONFIGURACIÓN
// ====================================

const TIPOS_CONFIG = {
  denuncia: { label: 'Denuncia', color: '#DC2626', icon: AlertTriangle },
  ente_control: { label: 'Ente Control', color: '#EA580C', icon: Shield },
  emergencia: { label: 'Emergencia', color: '#DC2626', icon: Zap },
  seguimiento_urgente: { label: 'Seguimiento', color: '#F59E0B', icon: Flag },
  revision_especifica: { label: 'Revisión', color: '#3B82F6', icon: Target }
};

const ESTADOS_CONFIG = {
  solicitud_pendiente: { label: 'Pendiente', color: '#9CA3AF', icon: Clock },
  en_aprobacion: { label: 'En Aprobación', color: '#F59E0B', icon: MessageSquare },
  aprobada: { label: 'Aprobada', color: '#10B981', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', color: '#DC2626', icon: XCircle },
  en_ejecucion: { label: 'En Ejecución', color: '#3B82F6', icon: Activity },
  completada: { label: 'Completada', color: '#10B981', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: '#6B7280', icon: XCircle }
};

const COLORES_GRAFICO = ['#3B82F6', '#10B981', '#F59E0B', '#DC2626', '#8B5CF6'];

// ====================================
// DATOS MOCK
// ====================================

const AUDITORIAS_MOCK: AuditoriaEspecial[] = [
  {
    id: 'esp-001',
    codigo: 'AUD-ESP-2025-001',
    tipo: 'denuncia',
    titulo: 'Revisión de procesos de contratación - Denuncia anónima',
    descripcion: 'Auditoría solicitada por denuncia anónima sobre irregularidades en proceso de contratación',
    justificacion: 'Denuncia recibida a través del canal ético sobre posibles irregularidades en contratación directa del proceso CON-2024-045',
    prioridad: 'critica',
    areaObjetivo: 'Dirección Administrativa - Contratación',
    solicitante: 'Jefe OCI',
    fechaSolicitud: '2025-12-15',
    fechaAprobacion: '2025-12-16',
    fechaInicio: '2025-12-18',
    fechaFinEstimada: '2025-12-28',
    estado: 'en_ejecucion',
    equipoAsignado: ['Fernando Ávila', 'Laura Ramírez'],
    liderAsignado: 'Fernando Ávila',
    hallazgosEncontrados: 3,
    documentosAdjuntos: ['denuncia_anonima.pdf', 'contratos_revision.xlsx'],
    aprobadoPor: 'Jefe OCI'
  },
  {
    id: 'esp-002',
    codigo: 'AUD-ESP-2025-002',
    tipo: 'ente_control',
    titulo: 'Auditoría Contraloría - Ejecución presupuestal 2024',
    descripcion: 'Solicitud de Contraloría General para revisión de ejecución presupuestal',
    justificacion: 'Requerimiento oficial CGR mediante oficio No. 2025-0245 del 8 de diciembre de 2025',
    prioridad: 'alta',
    areaObjetivo: 'Dirección Financiera',
    solicitante: 'Contraloría General de la República',
    fechaSolicitud: '2025-12-10',
    fechaAprobacion: '2025-12-10',
    fechaInicio: '2025-12-12',
    fechaFinEstimada: '2026-01-15',
    estado: 'en_ejecucion',
    equipoAsignado: ['Carlos Méndez', 'Ana Rodríguez', 'Luis Vargas'],
    liderAsignado: 'Carlos Méndez',
    documentosAdjuntos: ['oficio_cgr_2025_0245.pdf', 'ejecucion_presupuestal_2024.xlsx'],
    aprobadoPor: 'Director General'
  },
  {
    id: 'esp-003',
    codigo: 'AUD-ESP-2025-003',
    tipo: 'emergencia',
    titulo: 'Auditoría emergente - Fuga de información',
    descripcion: 'Revisión urgente por presunta fuga de información confidencial',
    justificación: 'Incidente de seguridad reportado - Nivel crítico. Información sensible de estudiantes comprometida',
    prioridad: 'critica',
    areaObjetivo: 'Dirección de Tecnología',
    solicitante: 'Director General',
    fechaSolicitud: '2025-12-20',
    fechaAprobacion: '2025-12-20',
    fechaInicio: '2025-12-20',
    fechaFinEstimada: '2025-12-22',
    estado: 'en_ejecucion',
    equipoAsignado: ['Fernando Ávila', 'Carlos Méndez'],
    liderAsignado: 'Fernando Ávila',
    hallazgosEncontrados: 5,
    documentosAdjuntos: ['incidente_seguridad.pdf', 'log_accesos.txt'],
    aprobadoPor: 'Director General'
  },
  {
    id: 'esp-004',
    codigo: 'AUD-ESP-2025-004',
    tipo: 'seguimiento_urgente',
    titulo: 'Seguimiento urgente - Plan de Mejoramiento vencido',
    descripcion: 'Revisión de plan de mejoramiento con acciones vencidas no ejecutadas',
    justificacion: 'Plan de mejoramiento PM-2024-008 con 6 meses de retraso. Se requiere verificación urgente del estado real',
    prioridad: 'alta',
    areaObjetivo: 'Dirección Talento Humano',
    solicitante: 'Jefe OCI',
    fechaSolicitud: '2025-12-18',
    estado: 'en_aprobacion',
    equipoAsignado: [],
    documentosAdjuntos: ['plan_mejoramiento_pm_2024_008.pdf', 'seguimiento_anterior.pdf']
  },
  {
    id: 'esp-005',
    codigo: 'AUD-ESP-2025-005',
    tipo: 'revision_especifica',
    titulo: 'Revisión específica - Gastos de viaje territoriales',
    descripción: 'Auditoría puntual sobre gastos de viaje de las territoriales',
    justificacion: 'Desviaciones detectadas en análisis preliminar de ejecución presupuestal del rubro de comisiones',
    prioridad: 'media',
    areaObjetivo: 'Territoriales (Todas)',
    solicitante: 'Subdirector Administrativo',
    fechaSolicitud: '2025-12-19',
    estado: 'solicitud_pendiente',
    equipoAsignado: [],
    documentosAdjuntos: ['analisis_preliminar_gastos.xlsx', 'comparativo_territoriales.pdf']
  },
  {
    id: 'esp-006',
    codigo: 'AUD-ESP-2025-006',
    tipo: 'denuncia',
    titulo: 'Denuncia - Conflicto de interés en licitación',
    descripcion: 'Denuncia sobre posible conflicto de interés en proceso de licitación pública',
    justificacion: 'Denuncia anónima recibida señalando posible conflicto de interés en proceso LIC-2025-012',
    prioridad: 'critica',
    areaObjetivo: 'Dirección Administrativa',
    solicitante: 'Jefe OCI',
    fechaSolicitud: '2025-12-21',
    estado: 'solicitud_pendiente',
    equipoAsignado: [],
    documentosAdjuntos: ['denuncia_conflicto.pdf']
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function AuditoriasEspecialesModuleCompleto() {
  const [vistaActiva, setVistaActiva] = useState<'listado' | 'estadisticas'>('listado');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaEspecial | null>(null);
  const [auditorias, setAuditorias] = useState<AuditoriaEspecial[]>(AUDITORIAS_MOCK);

  // Filtros
  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter(auditoria => {
      const matchEstado = filtroEstado === 'todos' || auditoria.estado === filtroEstado;
      const matchPrioridad = filtroPrioridad === 'todos' || auditoria.prioridad === filtroPrioridad;
      const matchTipo = filtroTipo === 'todos' || auditoria.tipo === filtroTipo;
      const matchBusqueda = auditoria.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           auditoria.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           auditoria.areaObjetivo.toLowerCase().includes(busqueda.toLowerCase());
      return matchEstado && matchPrioridad && matchTipo && matchBusqueda;
    });
  }, [auditorias, filtroEstado, filtroPrioridad, filtroTipo, busqueda]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: auditorias.length,
      criticas: auditorias.filter(a => a.prioridad === 'critica').length,
      enEjecucion: auditorias.filter(a => a.estado === 'en_ejecucion').length,
      pendientesAprobacion: auditorias.filter(a => a.estado === 'en_aprobacion' || a.estado === 'solicitud_pendiente').length,
      completadas: auditorias.filter(a => a.estado === 'completada').length
    };
  }, [auditorias]);

  // Handlers
  const handleAprobar = (id: string) => {
    setAuditorias(auditorias.map(a => 
      a.id === id 
        ? { ...a, estado: 'aprobada', fechaAprobacion: new Date().toISOString().split('T')[0], aprobadoPor: 'Jefe OCI' }
        : a
    ));
    toast.success('Auditoría aprobada exitosamente');
  };

  const handleRechazar = (id: string, motivo: string) => {
    setAuditorias(auditorias.map(a => 
      a.id === id 
        ? { ...a, estado: 'rechazada', rechazadoPor: 'Jefe OCI', motivoRechazo: motivo }
        : a
    ));
    toast.error('Auditoría rechazada');
  };

  const handleIniciar = (id: string) => {
    setAuditorias(auditorias.map(a => 
      a.id === id 
        ? { ...a, estado: 'en_ejecucion', fechaInicio: new Date().toISOString().split('T')[0] }
        : a
    ));
    toast.success('Auditoría iniciada');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Auditorías Especiales</h1>
                <p className="text-sm text-gray-500">
                  Gestión de auditorías no programadas y casos extraordinarios
                </p>
              </div>
            </div>
            <Button onClick={() => setModalNuevaAbierto(true)} style={{ background: '#DC2626' }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Auditoría Especial
            </Button>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 border-l-4 border-l-blue-600">
              <div className="text-2xl font-bold text-blue-900">{estadisticas.total}</div>
              <div className="text-xs text-blue-700">Total Especiales</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-red-600">
              <div className="text-2xl font-bold text-red-900">{estadisticas.criticas}</div>
              <div className="text-xs text-red-700">Prioridad Crítica</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-yellow-600">
              <div className="text-2xl font-bold text-yellow-900">{estadisticas.enEjecucion}</div>
              <div className="text-xs text-yellow-700">En Ejecución</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-purple-600">
              <div className="text-2xl font-bold text-purple-900">{estadisticas.pendientesAprobacion}</div>
              <div className="text-xs text-purple-700">Pendientes Aprobación</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-green-600">
              <div className="text-2xl font-bold text-green-900">{estadisticas.completadas}</div>
              <div className="text-xs text-green-700">Completadas</div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b">
            <button
              onClick={() => setVistaActiva('listado')}
              className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                vistaActiva === 'listado'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileWarning className="w-4 h-4 inline mr-2" />
              Listado ({auditorias.length})
            </button>
            <button
              onClick={() => setVistaActiva('estadisticas')}
              className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                vistaActiva === 'estadisticas'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Estadísticas
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {vistaActiva === 'listado' && (
            <VistaListado
              auditorias={auditoriasFiltradas}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              filtroPrioridad={filtroPrioridad}
              setFiltroPrioridad={setFiltroPrioridad}
              filtroTipo={filtroTipo}
              setFiltroTipo={setFiltroTipo}
              onVerDetalle={(auditoria) => {
                setAuditoriaSeleccionada(auditoria);
                setModalDetalleAbierto(true);
              }}
              onAprobar={handleAprobar}
              onRechazar={handleRechazar}
              onIniciar={handleIniciar}
            />
          )}

          {vistaActiva === 'estadisticas' && (
            <VistaEstadisticas auditorias={auditorias} />
          )}
        </AnimatePresence>

        {/* Modal Nueva Auditoría */}
        <AnimatePresence>
          {modalNuevaAbierto && (
            <WizardAuditoriaEspecial
              onClose={() => setModalNuevaAbierto(false)}
              onSubmit={(data) => {
                const nuevaAuditoria: AuditoriaEspecial = {
                  id: `esp-${Date.now()}`,
                  codigo: `AUD-ESP-2025-${String(auditorias.length + 1).padStart(3, '0')}`,
                  tipo: data.tipo as TipoAuditoriaEspecial,
                  titulo: data.titulo,
                  descripcion: data.descripcion,
                  justificacion: data.justificacion,
                  prioridad: data.prioridad,
                  areaObjetivo: data.areaObjetivo,
                  solicitante: data.solicitante || 'Jefe OCI',
                  fechaSolicitud: new Date().toISOString().split('T')[0],
                  fechaInicio: data.fechaInicioEstimada,
                  fechaFinEstimada: data.fechaInicioEstimada,
                  estado: (data.tipo === 'denuncia' || data.tipo === 'ente_control' || data.tipo === 'emergencia')
                    ? 'aprobada'
                    : 'en_aprobacion',
                  equipoAsignado: data.equipoAsignado,
                  liderAsignado: data.liderAsignado,
                  documentosAdjuntos: data.documentosAdjuntos.map(f => f.name)
                };
                
                setAuditorias([...auditorias, nuevaAuditoria]);
                setModalNuevaAbierto(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* Modal Detalle */}
        <AnimatePresence>
          {modalDetalleAbierto && auditoriaSeleccionada && (
            <ModalDetalle
              auditoria={auditoriaSeleccionada}
              onClose={() => setModalDetalleAbierto(false)}
              onAprobar={handleAprobar}
              onRechazar={handleRechazar}
              onIniciar={handleIniciar}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ====================================
// VISTA: LISTADO
// ====================================

function VistaListado({
  auditorias,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  filtroPrioridad,
  setFiltroPrioridad,
  filtroTipo,
  setFiltroTipo,
  onVerDetalle,
  onAprobar,
  onRechazar,
  onIniciar
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar auditorías..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="todos">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(TIPOS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Listado */}
      <div className="space-y-3">
        {auditorias.length === 0 ? (
          <Card className="p-12 text-center">
            <FileWarning className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No se encontraron auditorías especiales</p>
          </Card>
        ) : (
          auditorias.map((auditoria: AuditoriaEspecial, index: number) => (
            <motion.div
              key={auditoria.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icono */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      auditoria.prioridad === 'critica' ? 'bg-red-100' :
                      auditoria.prioridad === 'alta' ? 'bg-orange-100' :
                      auditoria.prioridad === 'media' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {React.createElement(TIPOS_CONFIG[auditoria.tipo].icon, {
                        className: `w-6 h-6 ${
                          auditoria.prioridad === 'critica' ? 'text-red-600' :
                          auditoria.prioridad === 'alta' ? 'text-orange-600' :
                          auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                        }`
                      })}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{auditoria.titulo}</h3>
                        <Badge style={{
                          background: auditoria.prioridad === 'critica' ? '#DC2626' :
                                    auditoria.prioridad === 'alta' ? '#EA580C' :
                                    auditoria.prioridad === 'media' ? '#F59E0B' : '#3B82F6',
                          color: 'white'
                        }}>
                          {auditoria.prioridad.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {TIPOS_CONFIG[auditoria.tipo].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{auditoria.descripcion}</p>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Target className="w-4 h-4" />
                          <span className="font-medium">Código:</span> {auditoria.codigo}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">Área:</span> {auditoria.areaObjetivo}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Solicitud:</span> {new Date(auditoria.fechaSolicitud).toLocaleDateString()}
                        </div>
                        {auditoria.liderAsignado && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">Líder:</span> {auditoria.liderAsignado}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge style={{
                      background: ESTADOS_CONFIG[auditoria.estado].color,
                      color: 'white'
                    }}>
                      {ESTADOS_CONFIG[auditoria.estado].label}
                    </Badge>
                    
                    <div className="flex gap-2">
                      {(auditoria.estado === 'solicitud_pendiente' || auditoria.estado === 'en_aprobacion') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => onAprobar(auditoria.id)}
                            style={{ background: '#10B981' }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const motivo = prompt('Motivo del rechazo:');
                              if (motivo) onRechazar(auditoria.id, motivo);
                            }}
                            style={{ background: '#DC2626' }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {auditoria.estado === 'aprobada' && (
                        <Button
                          size="sm"
                          onClick={() => onIniciar(auditoria.id)}
                          style={{ background: '#3B82F6' }}
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerDetalle(auditoria)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {auditoria.hallazgosEncontrados !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-bold text-orange-900">
                        {auditoria.hallazgosEncontrados} hallazgos encontrados
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ====================================
// VISTA: ESTADÍSTICAS
// ====================================

function VistaEstadisticas({ auditorias }: { auditorias: AuditoriaEspecial[] }) {
  const datosPorTipo = Object.keys(TIPOS_CONFIG).map(tipo => ({
    name: TIPOS_CONFIG[tipo as TipoAuditoriaEspecial].label,
    cantidad: auditorias.filter(a => a.tipo === tipo).length
  }));

  const datosPorEstado = Object.keys(ESTADOS_CONFIG).map(estado => ({
    name: ESTADOS_CONFIG[estado as EstadoAuditoriaEspecial].label,
    cantidad: auditorias.filter(a => a.estado === estado).length
  }));

  const datosPorPrioridad = [
    { name: 'Crítica', value: auditorias.filter(a => a.prioridad === 'critica').length },
    { name: 'Alta', value: auditorias.filter(a => a.prioridad === 'alta').length },
    { name: 'Media', value: auditorias.filter(a => a.prioridad === 'media').length },
    { name: 'Baja', value: auditorias.filter(a => a.prioridad === 'baja').length }
  ].filter(d => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico por Tipo */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Auditorías por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico por Estado */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Distribución por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={datosPorEstado.filter(d => d.cantidad > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.cantidad}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {datosPorEstado.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORES_GRAFICO[index % COLORES_GRAFICO.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico por Prioridad */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Distribución por Prioridad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={datosPorPrioridad}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {datosPorPrioridad.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.name === 'Crítica' ? '#DC2626' :
                    entry.name === 'Alta' ? '#EA580C' :
                    entry.name === 'Media' ? '#F59E0B' : '#3B82F6'
                  } />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </Card>

        {/* Resumen Ejecutivo */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Resumen Ejecutivo</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Total de auditorías especiales:</span>
              <span className="text-2xl font-black text-blue-600">{auditorias.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Prioridad crítica:</span>
              <span className="text-2xl font-black text-red-600">
                {auditorias.filter(a => a.prioridad === 'critica').length}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">En ejecución:</span>
              <span className="text-2xl font-black text-yellow-600">
                {auditorias.filter(a => a.estado === 'en_ejecucion').length}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Hallazgos totales:</span>
              <span className="text-2xl font-black text-orange-600">
                {auditorias.reduce((sum, a) => sum + (a.hallazgosEncontrados || 0), 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Pendientes aprobación:</span>
              <span className="text-2xl font-black text-purple-600">
                {auditorias.filter(a => a.estado === 'en_aprobacion' || a.estado === 'solicitud_pendiente').length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// ====================================
// MODAL: DETALLE
// ====================================

function ModalDetalle({ auditoria, onClose, onAprobar, onRechazar, onIniciar }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-600 to-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Detalle Auditoría Especial</h2>
              <p className="text-sm text-orange-100">{auditoria.codigo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Información Principal */}
          <Card className="p-4 border-2" style={{ borderColor: TIPOS_CONFIG[auditoria.tipo].color }}>
            <div className="flex items-start gap-4">
              {React.createElement(TIPOS_CONFIG[auditoria.tipo].icon, {
                className: 'w-8 h-8',
                style: { color: TIPOS_CONFIG[auditoria.tipo].color }
              })}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{auditoria.titulo}</h3>
                  <Badge style={{
                    background: auditoria.prioridad === 'critica' ? '#DC2626' :
                              auditoria.prioridad === 'alta' ? '#EA580C' :
                              auditoria.prioridad === 'media' ? '#F59E0B' : '#3B82F6',
                    color: 'white'
                  }}>
                    {auditoria.prioridad.toUpperCase()}
                  </Badge>
                  <Badge style={{ background: ESTADOS_CONFIG[auditoria.estado].color, color: 'white' }}>
                    {ESTADOS_CONFIG[auditoria.estado].label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{auditoria.descripcion}</p>
              </div>
            </div>
          </Card>

          {/* Datos Generales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
              <p className="text-gray-900">{TIPOS_CONFIG[auditoria.tipo].label}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Área Objetivo</label>
              <p className="text-gray-900">{auditoria.areaObjetivo}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Solicitante</label>
              <p className="text-gray-900">{auditoria.solicitante}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Fecha Solicitud</label>
              <p className="text-gray-900">{new Date(auditoria.fechaSolicitud).toLocaleDateString()}</p>
            </div>
            {auditoria.fechaAprobacion && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Fecha Aprobación</label>
                <p className="text-gray-900">{new Date(auditoria.fechaAprobacion).toLocaleDateString()}</p>
              </div>
            )}
            {auditoria.aprobadoPor && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Aprobado Por</label>
                <p className="text-gray-900">{auditoria.aprobadoPor}</p>
              </div>
            )}
          </div>

          {/* Justificación */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Justificación</h4>
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-700">{auditoria.justificacion}</p>
            </Card>
          </div>

          {/* Equipo */}
          {auditoria.equipoAsignado.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Equipo Asignado</h4>
              <div className="flex flex-wrap gap-2">
                {auditoria.liderAsignado && (
                  <Badge style={{ background: '#DC2626', color: 'white' }}>
                    <Users className="w-3 h-3 mr-1" />
                    Líder: {auditoria.liderAsignado}
                  </Badge>
                )}
                {auditoria.equipoAsignado.map((miembro: string, idx: number) => (
                  <Badge key={idx} variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {miembro}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Documentos */}
          {auditoria.documentosAdjuntos && auditoria.documentosAdjuntos.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Documentos Adjuntos</h4>
              <div className="space-y-2">
                {auditoria.documentosAdjuntos.map((doc: string, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{doc}</span>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hallazgos */}
          {auditoria.hallazgosEncontrados !== undefined && (
            <Card className="p-4 bg-orange-50 border-2 border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-orange-900">
                  {auditoria.hallazgosEncontrados} hallazgos encontrados
                </span>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            {(auditoria.estado === 'solicitud_pendiente' || auditoria.estado === 'en_aprobacion') && (
              <>
                <Button
                  onClick={() => {
                    onAprobar(auditoria.id);
                    onClose();
                  }}
                  style={{ background: '#10B981' }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  onClick={() => {
                    const motivo = prompt('Motivo del rechazo:');
                    if (motivo) {
                      onRechazar(auditoria.id, motivo);
                      onClose();
                    }
                  }}
                  style={{ background: '#DC2626' }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </>
            )}
            {auditoria.estado === 'aprobada' && (
              <Button
                onClick={() => {
                  onIniciar(auditoria.id);
                  onClose();
                }}
                style={{ background: '#3B82F6' }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Iniciar Auditoría
              </Button>
            )}
          </div>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
