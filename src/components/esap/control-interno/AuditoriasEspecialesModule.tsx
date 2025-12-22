/**
 * ============================================
 * RF018: AUDITORÍAS ESPECIALES (AD-HOC)
 * ============================================
 * 
 * Sistema de gestión de auditorías especiales no programadas
 * Auditorías de emergencia, solicitudes externas y casos extraordinarios
 * 
 * CARACTERÍSTICAS:
 * - Creación rápida de auditorías no programadas
 * - Workflow de autorización acelerado
 * - Priorización y clasificación
 * - Seguimiento diferenciado
 * - Reportes expeditos
 * - Integración con sistema regular
 * 
 * TIPOS DE AUDITORÍAS ESPECIALES:
 * 1. Denuncias / Irregularidades
 * 2. Solicitud de entes de control
 * 3. Auditoría de emergencia
 * 4. Seguimiento urgente
 * 5. Revisión específica
 * 
 * WORKFLOW:
 * 1. Solicitud y justificación
 * 2. Aprobación Jefe OCI
 * 3. Asignación de equipo
 * 4. Ejecución rápida
 * 5. Informe expedito
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Zap,
  FileWarning,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Filter,
  Search,
  Calendar,
  Target,
  AlertCircle,
  TrendingUp,
  Send,
  Upload,
  Download,
  MessageSquare,
  Shield,
  Flag,
  Activity
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL } from '../gestion-legal/design-system/Input';
import { TextareaSIGL } from '../gestion-legal/design-system/TextareaSIGL';
import { toast } from 'sonner';

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
}

// ====================================
// DATOS MOCK
// ====================================

const AUDITORIAS_ESPECIALES: AuditoriaEspecial[] = [
  {
    id: 'esp-001',
    codigo: 'AUD-ESP-2025-001',
    tipo: 'denuncia',
    titulo: 'Revisión de procesos de contratación - Denuncia anónima',
    descripcion: 'Auditoría solicitada por denuncia anónima sobre irregularidades en proceso de contratación',
    justificacion: 'Denuncia recibida a través del canal ético sobre posibles irregularidades en contratación directa',
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
    documentosAdjuntos: ['denuncia_anonima.pdf', 'contratos_revision.xlsx']
  },
  {
    id: 'esp-002',
    codigo: 'AUD-ESP-2025-002',
    tipo: 'ente_control',
    titulo: 'Auditoría Contraloría - Ejecución presupuestal 2024',
    descripcion: 'Solicitud de Contraloría General para revisión de ejecución presupuestal',
    justificacion: 'Requerimiento oficial CGR mediante oficio No. 2025-0245',
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
    documentosAdjuntos: ['oficio_cgr_2025_0245.pdf']
  },
  {
    id: 'esp-003',
    codigo: 'AUD-ESP-2025-003',
    tipo: 'emergencia',
    titulo: 'Auditoría emergente - Fuga de información',
    descripcion: 'Revisión urgente por presunta fuga de información confidencial',
    justificacion: 'Incidente de seguridad reportado - Nivel crítico',
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
    documentosAdjuntos: ['incidente_seguridad.pdf']
  },
  {
    id: 'esp-004',
    codigo: 'AUD-ESP-2025-004',
    tipo: 'seguimiento_urgente',
    titulo: 'Seguimiento urgente - Plan de Mejoramiento vencido',
    descripcion: 'Revisión de plan de mejoramiento con acciones vencidas no ejecutadas',
    justificacion: 'Plan de mejoramiento PM-2024-008 con 6 meses de retraso',
    prioridad: 'alta',
    areaObjetivo: 'Dirección Talento Humano',
    solicitante: 'Jefe OCI',
    fechaSolicitud: '2025-12-18',
    estado: 'en_aprobacion',
    equipoAsignado: [],
    documentosAdjuntos: ['plan_mejoramiento_pm_2024_008.pdf']
  },
  {
    id: 'esp-005',
    codigo: 'AUD-ESP-2025-005',
    tipo: 'revision_especifica',
    titulo: 'Revisión específica - Gastos de viaje territoriales',
    descripcion: 'Auditoría puntual sobre gastos de viaje de las territoriales',
    justificacion: 'Desviaciones detectadas en análisis preliminar de ejecución presupuestal',
    prioridad: 'media',
    areaObjetivo: 'Territoriales (Todas)',
    solicitante: 'Subdirector Administrativo',
    fechaSolicitud: '2025-12-19',
    estado: 'solicitud_pendiente',
    equipoAsignado: [],
    documentosAdjuntos: ['analisis_preliminar_gastos.xlsx']
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function AuditoriasEspecialesModule() {
  const [vistaActiva, setVistaActiva] = useState<'listado' | 'estadisticas'>('listado');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaEspecial | null>(null);

  const auditoriasFiltradas = useMemo(() => {
    return AUDITORIAS_ESPECIALES.filter(auditoria => {
      const matchEstado = filtroEstado === 'todos' || auditoria.estado === filtroEstado;
      const matchPrioridad = filtroPrioridad === 'todos' || auditoria.prioridad === filtroPrioridad;
      const matchBusqueda = auditoria.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           auditoria.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           auditoria.areaObjetivo.toLowerCase().includes(busqueda.toLowerCase());
      return matchEstado && matchPrioridad && matchBusqueda;
    });
  }, [filtroEstado, filtroPrioridad, busqueda]);

  const estadisticas = useMemo(() => {
    return {
      total: AUDITORIAS_ESPECIALES.length,
      criticas: AUDITORIAS_ESPECIALES.filter(a => a.prioridad === 'critica').length,
      enEjecucion: AUDITORIAS_ESPECIALES.filter(a => a.estado === 'en_ejecucion').length,
      pendientesAprobacion: AUDITORIAS_ESPECIALES.filter(a => a.estado === 'en_aprobacion' || a.estado === 'solicitud_pendiente').length,
      completadas: AUDITORIAS_ESPECIALES.filter(a => a.estado === 'completada').length
    };
  }, []);

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
            <ButtonSIGL variant="primary" onClick={() => setModalNuevaAbierto(true)}>
              <Plus className="w-4 h-4" />
              Nueva Auditoría Especial
            </ButtonSIGL>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-900">{estadisticas.total}</div>
              <div className="text-xs text-blue-700">Total Especiales</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-900">{estadisticas.criticas}</div>
              <div className="text-xs text-red-700">Prioridad Crítica</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-900">{estadisticas.enEjecucion}</div>
              <div className="text-xs text-yellow-700">En Ejecución</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-900">{estadisticas.pendientesAprobacion}</div>
              <div className="text-xs text-purple-700">Pendientes Aprobación</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-900">{estadisticas.completadas}</div>
              <div className="text-xs text-green-700">Completadas</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <ButtonSIGL
              variant={vistaActiva === 'listado' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('listado')}
            >
              <FileWarning className="w-4 h-4" />
              Listado
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'estadisticas' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('estadisticas')}
            >
              <TrendingUp className="w-4 h-4" />
              Estadísticas
            </ButtonSIGL>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {vistaActiva === 'listado' && (
            <motion.div
              key="listado"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ListadoAuditorias
                auditorias={auditoriasFiltradas}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                filtroEstado={filtroEstado}
                setFiltroEstado={setFiltroEstado}
                filtroPrioridad={filtroPrioridad}
                setFiltroPrioridad={setFiltroPrioridad}
                onVerDetalle={(auditoria) => {
                  setAuditoriaSeleccionada(auditoria);
                  setModalDetalleAbierto(true);
                }}
              />
            </motion.div>
          )}

          {vistaActiva === 'estadisticas' && (
            <motion.div
              key="estadisticas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <EstadisticasAuditorias auditorias={AUDITORIAS_ESPECIALES} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Nueva Auditoría */}
        {modalNuevaAbierto && (
          <ModalNuevaAuditoria
            onClose={() => setModalNuevaAbierto(false)}
            onCrear={(data) => {
              toast.success('Auditoría especial creada exitosamente');
              setModalNuevaAbierto(false);
            }}
          />
        )}

        {/* Modal Detalle */}
        {modalDetalleAbierto && auditoriaSeleccionada && (
          <ModalDetalleAuditoria
            auditoria={auditoriaSeleccionada}
            onClose={() => setModalDetalleAbierto(false)}
          />
        )}
      </div>
    </div>
  );
}

// ====================================
// SUB-COMPONENTE: LISTADO
// ====================================

const ListadoAuditorias: React.FC<{
  auditorias: AuditoriaEspecial[];
  busqueda: string;
  setBusqueda: (valor: string) => void;
  filtroEstado: string;
  setFiltroEstado: (valor: string) => void;
  filtroPrioridad: string;
  setFiltroPrioridad: (valor: string) => void;
  onVerDetalle: (auditoria: AuditoriaEspecial) => void;
}> = ({ auditorias, busqueda, setBusqueda, filtroEstado, setFiltroEstado, filtroPrioridad, setFiltroPrioridad, onVerDetalle }) => {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <CardSIGL>
        <div className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <InputSIGL
                type="text"
                placeholder="Buscar auditorías especiales..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="solicitud_pendiente">Solicitud Pendiente</option>
              <option value="en_aprobacion">En Aprobación</option>
              <option value="aprobada">Aprobada</option>
              <option value="en_ejecucion">En Ejecución</option>
              <option value="completada">Completada</option>
            </select>
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todas las prioridades</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </CardSIGL>

      {/* Listado */}
      <div className="space-y-3">
        {auditorias.map((auditoria, index) => (
          <motion.div
            key={auditoria.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CardSIGL>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      auditoria.prioridad === 'critica' ? 'bg-red-100' :
                      auditoria.prioridad === 'alta' ? 'bg-orange-100' :
                      auditoria.prioridad === 'media' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {auditoria.tipo === 'denuncia' && <AlertTriangle className={`w-6 h-6 ${
                        auditoria.prioridad === 'critica' ? 'text-red-600' :
                        auditoria.prioridad === 'alta' ? 'text-orange-600' :
                        auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />}
                      {auditoria.tipo === 'ente_control' && <Shield className={`w-6 h-6 ${
                        auditoria.prioridad === 'critica' ? 'text-red-600' :
                        auditoria.prioridad === 'alta' ? 'text-orange-600' :
                        auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />}
                      {auditoria.tipo === 'emergencia' && <Zap className={`w-6 h-6 ${
                        auditoria.prioridad === 'critica' ? 'text-red-600' :
                        auditoria.prioridad === 'alta' ? 'text-orange-600' :
                        auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />}
                      {auditoria.tipo === 'seguimiento_urgente' && <Clock className={`w-6 h-6 ${
                        auditoria.prioridad === 'critica' ? 'text-red-600' :
                        auditoria.prioridad === 'alta' ? 'text-orange-600' :
                        auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />}
                      {auditoria.tipo === 'revision_especifica' && <Target className={`w-6 h-6 ${
                        auditoria.prioridad === 'critica' ? 'text-red-600' :
                        auditoria.prioridad === 'alta' ? 'text-orange-600' :
                        auditoria.prioridad === 'media' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{auditoria.titulo}</h3>
                        <BadgeSIGL variant={
                          auditoria.prioridad === 'critica' ? 'danger' :
                          auditoria.prioridad === 'alta' ? 'warning' :
                          auditoria.prioridad === 'media' ? 'info' : 'default'
                        }>
                          {auditoria.prioridad.toUpperCase()}
                        </BadgeSIGL>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{auditoria.descripcion}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Target className="w-4 h-4" />
                          <span className="font-medium">Código:</span> {auditoria.codigo}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
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

                  <div className="flex flex-col items-end gap-2">
                    <BadgeSIGL variant={
                      auditoria.estado === 'completada' ? 'success' :
                      auditoria.estado === 'en_ejecucion' ? 'info' :
                      auditoria.estado === 'aprobada' ? 'success' :
                      auditoria.estado === 'rechazada' ? 'danger' :
                      'warning'
                    }>
                      {auditoria.estado.replace(/_/g, ' ').toUpperCase()}
                    </BadgeSIGL>
                    <ButtonSIGL variant="default" onClick={() => onVerDetalle(auditoria)}>
                      <Eye className="w-4 h-4" />
                      Ver Detalle
                    </ButtonSIGL>
                  </div>
                </div>

                {auditoria.hallazgosEncontrados !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-900">
                        {auditoria.hallazgosEncontrados} hallazgos encontrados
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ====================================
// SUB-COMPONENTE: ESTADÍSTICAS
// ====================================

const EstadisticasAuditorias: React.FC<{ auditorias: AuditoriaEspecial[] }> = ({ auditorias }) => {
  const estadisticasPorTipo = useMemo(() => {
    const tipos: Record<TipoAuditoriaEspecial, number> = {
      denuncia: 0,
      ente_control: 0,
      emergencia: 0,
      seguimiento_urgente: 0,
      revision_especifica: 0
    };
    auditorias.forEach(a => tipos[a.tipo]++);
    return tipos;
  }, [auditorias]);

  return (
    <div className="space-y-4">
      <CardSIGL>
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Auditorías por Tipo</h3>
          <div className="space-y-3">
            {Object.entries(estadisticasPorTipo).map(([tipo, cantidad]) => (
              <div key={tipo} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{tipo.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(cantidad / auditorias.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{cantidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>
    </div>
  );
};

// ====================================
// MODAL: NUEVA AUDITORÍA
// ====================================

const ModalNuevaAuditoria: React.FC<{
  onClose: () => void;
  onCrear: (data: any) => void;
}> = ({ onClose, onCrear }) => {
  const [tipo, setTipo] = useState<TipoAuditoriaEspecial>('denuncia');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [areaObjetivo, setAreaObjetivo] = useState('');

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Nueva Auditoría Especial"
      size="large"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Auditoría *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAuditoriaEspecial)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="denuncia">Denuncia / Irregularidad</option>
              <option value="ente_control">Solicitud Ente de Control</option>
              <option value="emergencia">Auditoría de Emergencia</option>
              <option value="seguimiento_urgente">Seguimiento Urgente</option>
              <option value="revision_especifica">Revisión Específica</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad *
            </label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Prioridad)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título *
          </label>
          <InputSIGL
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título breve y descriptivo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área Objetivo *
          </label>
          <InputSIGL
            type="text"
            value={areaObjetivo}
            onChange={(e) => setAreaObjetivo(e.target.value)}
            placeholder="Área o dependencia a auditar"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción *
          </label>
          <TextareaSIGL
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción detallada de la auditoría"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Justificación *
          </label>
          <TextareaSIGL
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Justificación y motivo de la auditoría especial"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => onCrear({ tipo, titulo, descripcion, justificacion, prioridad, areaObjetivo })}
            disabled={!titulo || !descripcion || !justificacion || !areaObjetivo}
          >
            <Send className="w-4 h-4" />
            Enviar Solicitud
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: DETALLE AUDITORÍA
// ====================================

const ModalDetalleAuditoria: React.FC<{
  auditoria: AuditoriaEspecial;
  onClose: () => void;
}> = ({ auditoria, onClose }) => {
  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Detalle Auditoría Especial"
      size="large"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-blue-900">{auditoria.codigo}</p>
            <BadgeSIGL variant={
              auditoria.prioridad === 'critica' ? 'danger' :
              auditoria.prioridad === 'alta' ? 'warning' : 'info'
            }>
              {auditoria.prioridad.toUpperCase()}
            </BadgeSIGL>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">{auditoria.titulo}</h3>
          <p className="text-sm text-gray-700">{auditoria.descripcion}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Tipo:</span>
            <p className="text-gray-900 capitalize">{auditoria.tipo.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Estado:</span>
            <p className="text-gray-900 capitalize">{auditoria.estado.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Área Objetivo:</span>
            <p className="text-gray-900">{auditoria.areaObjetivo}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Solicitante:</span>
            <p className="text-gray-900">{auditoria.solicitante}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Fecha Solicitud:</span>
            <p className="text-gray-900">{new Date(auditoria.fechaSolicitud).toLocaleDateString()}</p>
          </div>
          {auditoria.liderAsignado && (
            <div>
              <span className="font-medium text-gray-700">Líder Asignado:</span>
              <p className="text-gray-900">{auditoria.liderAsignado}</p>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Justificación</h4>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
            {auditoria.justificacion}
          </p>
        </div>

        {auditoria.equipoAsignado.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Equipo Asignado</h4>
            <div className="flex flex-wrap gap-2">
              {auditoria.equipoAsignado.map((miembro, index) => (
                <BadgeSIGL key={index} variant="info">
                  <Users className="w-3 h-3" />
                  {miembro}
                </BadgeSIGL>
              ))}
            </div>
          </div>
        )}

        {auditoria.documentosAdjuntos && auditoria.documentosAdjuntos.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Documentos Adjuntos</h4>
            <div className="space-y-2">
              {auditoria.documentosAdjuntos.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{doc}</span>
                  <ButtonSIGL variant="default">
                    <Download className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

export default AuditoriasEspecialesModule;
