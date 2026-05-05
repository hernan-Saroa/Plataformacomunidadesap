/**
 * APROBACIONES Y NOTIFICACIONES COMPLETO
 * Módulo consolidado que integra:
 * - Aprobaciones Pendientes (flujos de aprobación)
 * - Sistema de Notificaciones (alertas y recordatorios)
 * - Bandeja de Entrada Unificada
 * 
 * FLUJO: Solicitud → Revisión → Aprobación/Rechazo → Notificación
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle, Bell, Inbox, Clock, AlertTriangle, ThumbsUp,
  ThumbsDown, Eye, X, Search, Filter, Calendar, User,
  FileText, ListChecks, Target, Send, MessageSquare,
  ChevronRight, Hash, Flag, Shield, AlertCircle, Info,
  Zap, Plus, Settings, Archive, Trash2, RefreshCw
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ⭐ IMPORTAR COMPONENTES CRÍTICOS
import { SistemaRecordatorios } from './SistemaRecordatorios';
import { WorkflowAprobacion } from './WorkflowAprobacion';

// ============ TIPOS ============

type TabPrincipal = 'aprobaciones' | 'notificaciones' | 'bandeja';
type TipoAprobacion = 'plan-mejoramiento' | 'informe' | 'hallazgo' | 'programa-auditoria' | 'documento';
type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado' | 'devuelto';
type PrioridadAprobacion = 'alta' | 'media' | 'baja';
type TipoNotificacion = 'alerta' | 'recordatorio' | 'info' | 'aprobacion' | 'vencimiento';
type EstadoNotificacion = 'no-leida' | 'leida' | 'archivada';

interface SolicitudAprobacion {
  id: string;
  codigo: string;
  tipo: TipoAprobacion;
  titulo: string;
  descripcion: string;
  solicitante: string;
  aprobador: string;
  fechaSolicitud: string;
  fechaLimite: string;
  estado: EstadoAprobacion;
  prioridad: PrioridadAprobacion;
  documentoAsociado: string;
  observaciones: string;
  fechaRespuesta: string | null;
  motivoRechazo: string | null;
}

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  fecha: string;
  estado: EstadoNotificacion;
  prioridad: PrioridadAprobacion;
  origen: string;
  accion: string | null;
  enlace: string | null;
}

// ============ DATOS - APROBACIONES ============

const APROBACIONES_EJEMPLO: SolicitudAprobacion[] = [
  {
    id: 'apr-001',
    codigo: 'APR-2025-001',
    tipo: 'plan-mejoramiento',
    titulo: 'Aprobación Plan de Mejoramiento - Seguridad BD',
    descripcion: 'Plan para implementar autenticación de doble factor en bases de datos',
    solicitante: 'Director de TI',
    aprobador: 'Jefe OCI',
    fechaSolicitud: '2025-01-18',
    fechaLimite: '2025-01-25',
    estado: 'pendiente',
    prioridad: 'alta',
    documentoAsociado: 'PLAN-2025-002',
    observaciones: 'Plan crítico para seguridad de información',
    fechaRespuesta: null,
    motivoRechazo: null
  },
  {
    id: 'apr-002',
    codigo: 'APR-2025-002',
    tipo: 'informe',
    titulo: 'Aprobación Informe Especial Contratación',
    descripcion: 'Informe especial sobre hallazgos en proceso de contratación directa',
    solicitante: 'Andrea Ramírez',
    aprobador: 'Jefe OCI',
    fechaSolicitud: '2025-01-20',
    fechaLimite: '2025-01-27',
    estado: 'pendiente',
    prioridad: 'alta',
    documentoAsociado: 'INF-ESP-CONT-2025',
    observaciones: 'Requiere revisión urgente',
    fechaRespuesta: null,
    motivoRechazo: null
  }
];

// ============ DATOS - NOTIFICACIONES ============

const NOTIFICACIONES_EJEMPLO: Notificacion[] = [
  {
    id: 'not-001',
    tipo: 'alerta',
    titulo: 'Acción de mejoramiento próxima a vencer',
    mensaje: 'La acción ACC-001-02 "Sistema de alertas PQRS" vence el 28 de febrero',
    fecha: '2025-01-21 09:00',
    estado: 'no-leida',
    prioridad: 'alta',
    origen: 'Sistema de Seguimiento',
    accion: 'Ver acción',
    enlace: '/acciones/ACC-001-02'
  },
  {
    id: 'not-002',
    tipo: 'aprobacion',
    titulo: 'Nueva solicitud de aprobación',
    mensaje: 'El Director de TI solicita aprobación del Plan-2025-002',
    fecha: '2025-01-18 14:30',
    estado: 'no-leida',
    prioridad: 'alta',
    origen: 'Módulo de Aprobaciones',
    accion: 'Revisar',
    enlace: '/aprobaciones/APR-2025-001'
  }
];

// ============ UTILIDADES ============

const getTipoAprobacionInfo = (tipo: TipoAprobacion) => {
  const info = {
    'plan-mejoramiento': { label: 'Plan Mejoramiento', color: '#3B82F6', icono: <ListChecks className="w-4 h-4" /> },
    'informe': { label: 'Informe', color: '#8B5CF6', icono: <FileText className="w-4 h-4" /> },
    'hallazgo': { label: 'Hallazgo', color: '#F59E0B', icono: <AlertTriangle className="w-4 h-4" /> },
    'programa-auditoria': { label: 'Programa', color: '#10B981', icono: <Target className="w-4 h-4" /> },
    'documento': { label: 'Documento', color: '#6B7280', icono: <FileText className="w-4 h-4" /> }
  };
  return info[tipo];
};

const getEstadoAprobacionInfo = (estado: EstadoAprobacion) => {
  const info = {
    'pendiente': { label: 'Pendiente', color: '#F59E0B', icono: <Clock className="w-4 h-4" /> },
    'aprobado': { label: 'Aprobado', color: '#10B981', icono: <ThumbsUp className="w-4 h-4" /> },
    'rechazado': { label: 'Rechazado', color: '#EF4444', icono: <ThumbsDown className="w-4 h-4" /> },
    'devuelto': { label: 'Devuelto', color: '#8B5CF6', icono: <RefreshCw className="w-4 h-4" /> }
  };
  return info[estado];
};

const getTipoNotificacionInfo = (tipo: TipoNotificacion) => {
  const info = {
    'alerta': { label: 'Alerta', color: '#EF4444', icono: <AlertCircle className="w-5 h-5" /> },
    'recordatorio': { label: 'Recordatorio', color: '#F59E0B', icono: <Clock className="w-5 h-5" /> },
    'info': { label: 'Información', color: '#3B82F6', icono: <Info className="w-5 h-5" /> },
    'aprobacion': { label: 'Aprobación', color: '#8B5CF6', icono: <CheckCircle className="w-5 h-5" /> },
    'vencimiento': { label: 'Vencimiento', color: '#F59E0B', icono: <Flag className="w-5 h-5" /> }
  };
  return info[tipo];
};

const getPrioridadColor = (prioridad: PrioridadAprobacion) => {
  const colores = {
    'alta': '#EF4444',
    'media': '#F59E0B',
    'baja': '#10B981'
  };
  return colores[prioridad];
};

const calcularDiasRestantes = (fechaLimite: string) => {
  const hoy = new Date();
  const limite = new Date(fechaLimite);
  const diff = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ============ COMPONENTE PRINCIPAL ============

export function AprobacionesYNotificacionesCompleto() {
  const [tabActivo, setTabActivo] = useState<TabPrincipal>('aprobaciones');

  return (
    <div className="space-y-6">
      {/* ACCIONES PRINCIPALES */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Archive className="w-4 h-4 mr-2" />
          Archivar
        </Button>
        <Button style={{ background: '#003DA5' }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* FLUJO VISUAL */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'aprobaciones' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('aprobaciones')}
            >
              <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'aprobaciones' ? 'text-white' : 'text-green-600'}`} />
              <p className="font-bold text-sm">1. Aprobaciones</p>
              <p className="text-xs opacity-80">Flujos</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'notificaciones' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('notificaciones')}
            >
              <Bell className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'notificaciones' ? 'text-white' : 'text-orange-600'}`} />
              <p className="font-bold text-sm">2. Notificaciones</p>
              <p className="text-xs opacity-80">Alertas</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'bandeja' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('bandeja')}
            >
              <Inbox className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'bandeja' ? 'text-white' : 'text-blue-600'}`} />
              <p className="font-bold text-sm">3. Bandeja</p>
              <p className="text-xs opacity-80">Unificada</p>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTENIDO SEGÚN TAB */}
      <AnimatePresence mode="wait">
        {tabActivo === 'aprobaciones' && <TabAprobaciones />}
        {tabActivo === 'notificaciones' && <TabNotificaciones />}
        {tabActivo === 'bandeja' && <TabBandeja />}
      </AnimatePresence>
    </div>
  );
}

// ============ TAB 1: APROBACIONES ============

function TabAprobaciones() {
  const [aprobaciones] = useState(APROBACIONES_EJEMPLO);
  const [filtroEstado, setFiltroEstado] = useState<EstadoAprobacion | 'todos'>('todos');

  const aprobacionesFiltradas = aprobaciones.filter(a => 
    filtroEstado === 'todos' || a.estado === filtroEstado
  );

  const estadisticas = {
    total: aprobaciones.length,
    pendientes: aprobaciones.filter(a => a.estado === 'pendiente').length,
    aprobadas: aprobaciones.filter(a => a.estado === 'aprobado').length,
    urgentes: aprobaciones.filter(a => a.prioridad === 'alta' && a.estado === 'pendiente').length
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Pendientes</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.pendientes}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Aprobadas</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.aprobadas}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#EF4444', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Urgentes</p>
          <p className="text-3xl font-black" style={{ color: '#EF4444' }}>{estadisticas.urgentes}</p>
        </Card>
      </div>

      {/* FILTRO */}
      <Card className="p-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <Filter className="w-4 h-4 inline mr-1" />
          Filtrar por estado
        </label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobadas</option>
          <option value="rechazado">Rechazadas</option>
          <option value="devuelto">Devueltas</option>
        </select>
      </Card>

      {/* ⭐ WORKFLOW DE APROBACIÓN - COMPONENTE CRÍTICO INTEGRADO */}
      <div className="my-6">
        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Workflow de Aprobación
              </h3>
              <p className="text-sm text-gray-600">
                Visualización del flujo de aprobación multinivel con historial completo
              </p>
            </div>
          </div>
          <WorkflowAprobacion />
        </Card>
      </div>

      {/* LISTA DE APROBACIONES */}
      <div className="space-y-4">
        {aprobacionesFiltradas.map(aprobacion => (
          <CardAprobacion key={aprobacion.id} aprobacion={aprobacion} />
        ))}
      </div>
    </motion.div>
  );
}

function CardAprobacion({ aprobacion }: { aprobacion: SolicitudAprobacion }) {
  const tipoInfo = getTipoAprobacionInfo(aprobacion.tipo);
  const estadoInfo = getEstadoAprobacionInfo(aprobacion.estado);
  const diasRestantes = calcularDiasRestantes(aprobacion.fechaLimite);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{aprobacion.codigo}</Badge>
            <Badge style={{ background: tipoInfo.color, color: 'white' }}>
              {tipoInfo.icono}
              <span className="ml-1">{tipoInfo.label}</span>
            </Badge>
            <Badge style={{ background: estadoInfo.color, color: 'white' }}>
              {estadoInfo.icono}
              <span className="ml-1">{estadoInfo.label}</span>
            </Badge>
            <Badge style={{ background: getPrioridadColor(aprobacion.prioridad), color: 'white' }}>
              {aprobacion.prioridad.toUpperCase()}
            </Badge>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{aprobacion.titulo}</h3>
          <p className="text-sm text-gray-600 mb-3">{aprobacion.descripcion}</p>
        </div>
        {aprobacion.estado === 'pendiente' && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => toast.success('Solicitud aprobada')}>
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.error('Solicitud rechazada')}>
              <ThumbsDown className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <InfoField label="Solicitante" value={aprobacion.solicitante} />
        <InfoField label="Aprobador" value={aprobacion.aprobador} />
        <InfoField label="Fecha Solicitud" value={aprobacion.fechaSolicitud} />
        <InfoField 
          label="Días Restantes" 
          value={diasRestantes > 0 ? `${diasRestantes} días` : 'Vencido'}
          highlight={diasRestantes <= 3}
        />
      </div>

      {aprobacion.observaciones && (
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <p><strong>Observaciones:</strong> {aprobacion.observaciones}</p>
        </div>
      )}

      {aprobacion.motivoRechazo && (
        <div className="text-xs text-red-600 bg-red-50 p-3 rounded mt-2">
          <p><strong>Motivo:</strong> {aprobacion.motivoRechazo}</p>
        </div>
      )}
    </Card>
  );
}

// ============ TAB 2: NOTIFICACIONES ============

function TabNotificaciones() {
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_EJEMPLO);
  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacion | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotificacion | 'todos'>('todos');

  const notificacionesFiltradas = notificaciones.filter(n => {
    const matchTipo = filtroTipo === 'todos' || n.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todos' || n.estado === filtroEstado;
    return matchTipo && matchEstado;
  });

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n =>
      n.id === id ? { ...n, estado: 'leida' as EstadoNotificacion } : n
    ));
    toast.success('Notificación marcada como leída');
  };

  const archivar = (id: string) => {
    setNotificaciones(prev => prev.map(n =>
      n.id === id ? { ...n, estado: 'archivada' as EstadoNotificacion } : n
    ));
    toast.success('Notificación archivada');
  };

  const estadisticas = {
    total: notificaciones.length,
    noLeidas: notificaciones.filter(n => n.estado === 'no-leida').length,
    alertas: notificaciones.filter(n => n.tipo === 'alerta').length,
    urgentes: notificaciones.filter(n => n.prioridad === 'alta' && n.estado === 'no-leida').length
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">No Leídas</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.noLeidas}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#EF4444', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Alertas</p>
          <p className="text-3xl font-black" style={{ color: '#EF4444' }}>{estadisticas.alertas}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#DC2626', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Urgentes</p>
          <p className="text-3xl font-black" style={{ color: '#DC2626' }}>{estadisticas.urgentes}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="alerta">Alertas</option>
              <option value="recordatorio">Recordatorios</option>
              <option value="info">Información</option>
              <option value="aprobacion">Aprobaciones</option>
              <option value="vencimiento">Vencimientos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="no-leida">No leídas</option>
              <option value="leida">Leídas</option>
              <option value="archivada">Archivadas</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ⭐ SISTEMA DE RECORDATORIOS - COMPONENTE CRÍTICO INTEGRADO */}
      <div className="my-6">
        <Card className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Sistema de Recordatorios Automáticos
              </h3>
              <p className="text-sm text-gray-600">
                Gestión inteligente de recordatorios para auditorías, planes y acciones
              </p>
            </div>
          </div>
          <SistemaRecordatorios />
        </Card>
      </div>

      {/* LISTA DE NOTIFICACIONES */}
      <div className="space-y-3">
        {notificacionesFiltradas.map(notificacion => (
          <CardNotificacion 
            key={notificacion.id} 
            notificacion={notificacion}
            onMarcarLeida={marcarComoLeida}
            onArchivar={archivar}
          />
        ))}
      </div>
    </motion.div>
  );
}

function CardNotificacion({ notificacion, onMarcarLeida, onArchivar }: any) {
  const tipoInfo = getTipoNotificacionInfo(notificacion.tipo);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-lg border-2 transition-all ${
        notificacion.estado === 'no-leida' 
          ? 'border-blue-300 bg-blue-50' 
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: tipoInfo.color + '20', color: tipoInfo.color }}
        >
          {tipoInfo.icono}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge style={{ background: tipoInfo.color, color: 'white' }} className="text-xs">
                  {tipoInfo.label}
                </Badge>
                {notificacion.prioridad === 'alta' && (
                  <Badge style={{ background: '#EF4444', color: 'white' }} className="text-xs">
                    URGENTE
                  </Badge>
                )}
                {notificacion.estado === 'no-leida' && (
                  <Badge style={{ background: '#3B82F6', color: 'white' }} className="text-xs">
                    NUEVA
                  </Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-gray-900">{notificacion.titulo}</h4>
              <p className="text-sm text-gray-600 mt-1">{notificacion.mensaje}</p>
            </div>

            <div className="flex gap-1">
              {notificacion.estado === 'no-leida' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onMarcarLeida(notificacion.id)}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onArchivar(notificacion.id)}
              >
                <Archive className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{notificacion.fecha}</span>
              <span>•</span>
              <span>{notificacion.origen}</span>
            </div>

            {notificacion.accion && (
              <Button variant="outline" size="sm" style={{ fontSize: '11px' }}>
                {notificacion.accion}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ TAB 3: BANDEJA UNIFICADA ============

function TabBandeja() {
  const [aprobaciones] = useState(APROBACIONES_EJEMPLO.filter(a => a.estado === 'pendiente'));
  const [notificaciones] = useState(NOTIFICACIONES_EJEMPLO.filter(n => n.estado === 'no-leida'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Bandeja de Entrada Unificada
        </h3>

        <div className="space-y-6">
          {/* APROBACIONES PENDIENTES */}
          {aprobaciones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                <h4 className="font-black text-gray-900">
                  Aprobaciones Pendientes ({aprobaciones.length})
                </h4>
              </div>
              <div className="space-y-2">
                {aprobaciones.slice(0, 3).map(apr => (
                  <div key={apr.id} className="p-3 border-2 border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-sm">{apr.titulo}</p>
                        <p className="text-xs text-gray-600">{apr.solicitante} • {apr.fechaSolicitud}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICACIONES NO LEÍDAS */}
          {notificaciones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <h4 className="font-black text-gray-900">
                  Notificaciones No Leídas ({notificaciones.length})
                </h4>
              </div>
              <div className="space-y-2">
                {notificaciones.slice(0, 3).map(not => {
                  const tipoInfo = getTipoNotificacionInfo(not.tipo);
                  return (
                    <div key={not.id} className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-start gap-2">
                        <div style={{ color: tipoInfo.color }}>{tipoInfo.icono}</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{not.titulo}</p>
                          <p className="text-xs text-gray-600">{not.mensaje}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {aprobaciones.length === 0 && notificaciones.length === 0 && (
            <div className="text-center py-12">
              <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay elementos pendientes</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTES AUXILIARES ============

function InfoField({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}