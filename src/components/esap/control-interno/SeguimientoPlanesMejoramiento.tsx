/**
 * RF012 - SEGUIMIENTO A PLANES DE MEJORAMIENTO
 * Integración Fase 2 COMPLETA: Vinculación con RF010, notificaciones y documentos automáticos
 * Sistema integral de monitoreo, validación de evidencias y alertas
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import { useControlInterno } from './ControlInternoContext';
import {
  Activity, Bell, CheckCircle2, XCircle, Clock, AlertTriangle,
  TrendingUp, Eye, Upload, Download, Calendar, User, FileText,
  MessageSquare, Shield, Search, Filter, ChevronDown, ChevronUp,
  Paperclip, Flag, Award, BarChart3, Zap, RefreshCw, Send,
  CheckSquare, AlertCircle, Target, Sparkles, ThumbsUp, ThumbsDown,
  FileCheck, X, Save, Edit, History, Play, Pause, PlayCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type EstadoAccion = 'Pendiente' | 'En Proceso' | 'Cumplida' | 'Vencida' | 'Verificada';
type EstadoSemaforo = 'verde' | 'amarillo' | 'rojo';
type EstadoValidacion = 'Pendiente Validación' | 'Aceptado' | 'Con Observaciones' | 'Rechazado';

interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaCarga: string;
  horaCarga: string;
  cargadoPor: string;
  cargoUsuario: string;
  descripcion: string;
  url?: string;
  
  // Validación de evidencias
  estadoValidacion: EstadoValidacion;
  validadoPor?: string;
  cargoValidador?: string;
  fechaValidacion?: string;
  horaValidacion?: string;
  comentariosValidacion?: string;
  requiereAclaracion: boolean;
  aclaracionSolicitada?: string;
  aclaracionRespuesta?: string;
}

// ============ SISTEMA PROPIO DE NOTIFICACIONES ELIMINADO ============
// Se usa el servicio centralizado NotificacionesService (RF015)
// Las notificaciones trimestrales ahora se envían desde RF015
// Los recordatorios automáticos (7 días antes) se envían desde RF015
// Las solicitudes de evidencia se envían desde RF015

interface AlertaVencimiento {
  id: string;
  accionId: string;
  codigoAccion: string;
  diasRestantes: number;
  fechaVencimiento: string;
  nivelAlerta: 'info' | 'warning' | 'danger';
  notificada: boolean;
  fechaNotificacion?: string;
}

interface VerificacionEfectividad {
  id: string;
  accionId: string;
  fechaVerificacion: string;
  verificadoPor: string;
  cargo: string;
  hallazgoRecurrente: boolean;
  efectividad: 'Efectiva' | 'Parcialmente Efectiva' | 'No Efectiva';
  observaciones: string;
  recomendaciones?: string;
  requiereAccionAdicional: boolean;
}

interface AccionSeguimiento {
  id: string;
  codigo: string;
  planMejoramientoId: string;
  codigoPlan: string;
  hallazgoAsociado: string;
  hallazgoId?: string; // ← INTEGRACIÓN: ID del hallazgo en RF010
  descripcion: string;
  tipo: 'Preventiva' | 'Correctiva' | 'Mejora';
  
  // Responsables
  responsable: string;
  cargo: string;
  email: string;
  telefono: string;
  
  // Fechas
  fechaInicio: string;
  fechaFin: string;
  fechaVerificacion: string;
  fechaCumplimiento?: string;
  
  // Estado y seguimiento
  estado: EstadoAccion;
  estadoSemaforo: EstadoSemaforo;
  porcentajeAvance: number;
  diasRestantes: number;
  diasVencidos?: number;
  
  // Evidencias y validación
  evidencias: Evidencia[];
  evidenciasAceptadas: number;
  evidenciasConObservaciones: number;
  evidenciasPendientes: number;
  
  // Indicadores
  indicadorCumplimiento: string;
  valorIndicador?: string;
  metaIndicador?: string;
  
  // Verificación
  verificacionEfectividad?: VerificacionEfectividad;
  
  // Observaciones
  observaciones: string;
  ultimaActualizacion: string;
}

interface PlanSeguimiento {
  id: string;
  codigo: string;
  codigoAuditoria: string;
  procesoAuditable: string;
  areaResponsable: string;
  jefeArea: string;
  
  // Acciones
  acciones: AccionSeguimiento[];
  totalAcciones: number;
  accionesCumplidas: number;
  accionesEnProceso: number;
  accionesPendientes: number;
  accionesVencidas: number;
  
  // Avance global
  porcentajeAvanceGlobal: number;
  estadoGeneral: EstadoSemaforo;
  
  // Evidencias
  totalEvidencias: number;
  evidenciasValidadas: number;
  evidenciasPendientesValidacion: number;
  
  // Alertas y notificaciones
  alertasActivas: AlertaVencimiento[];
  notificacionesTrimestrales: NotificacionTrimestral[];
  
  // Fechas
  fechaAprobacion: string;
  fechaInicioSeguimiento: string;
  ultimaActualizacion: string;
}

// ============ DATOS MOCK ============

const MOCK_EVIDENCIAS: Evidencia[] = [
  {
    id: 'ev-001',
    nombre: 'Lista_Chequeo_Estudios_Previos_v1.pdf',
    tipo: 'PDF',
    tamano: '1.2 MB',
    fechaCarga: '2025-04-15',
    horaCarga: '10:30',
    cargadoPor: 'Pedro Gómez Ruiz',
    cargoUsuario: 'Profesional Especializado Contratación',
    descripcion: 'Lista de chequeo implementada para verificación de estudios previos',
    estadoValidacion: 'Aceptado',
    validadoPor: 'Carlos Martínez López',
    cargoValidador: 'Jefe Oficina Control Interno',
    fechaValidacion: '2025-04-16',
    horaValidacion: '14:20',
    comentariosValidacion: 'La lista de chequeo cumple con todos los requisitos normativos. Se aprueba.',
    requiereAclaracion: false
  },
  {
    id: 'ev-002',
    nombre: 'Acta_Socializacion_Lista_Chequeo.pdf',
    tipo: 'PDF',
    tamano: '856 KB',
    fechaCarga: '2025-04-18',
    horaCarga: '09:15',
    cargadoPor: 'Pedro Gómez Ruiz',
    cargoUsuario: 'Profesional Especializado Contratación',
    descripcion: 'Acta de socialización de nueva lista de chequeo con equipo de contratación',
    estadoValidacion: 'Con Observaciones',
    validadoPor: 'Ana García Torres',
    cargoValidador: 'Auditora Senior OCI',
    fechaValidacion: '2025-04-19',
    horaValidacion: '11:45',
    comentariosValidacion: 'El acta debe incluir las firmas de todos los participantes. Por favor complementar.',
    requiereAclaracion: true,
    aclaracionSolicitada: 'Adjuntar versión del acta con firmas escaneadas de los 8 participantes',
    aclaracionRespuesta: 'Se adjuntará versión complementada el 22/04/2025'
  },
  {
    id: 'ev-003',
    nombre: 'Listado_Contratos_Verificados.xlsx',
    tipo: 'Excel',
    tamano: '245 KB',
    fechaCarga: '2025-04-20',
    horaCarga: '16:30',
    cargadoPor: 'Laura Martínez Silva',
    cargoUsuario: 'Profesional Universitario Contratación',
    descripcion: 'Reporte de contratos elaborados con nueva lista de chequeo (Marzo-Abril 2025)',
    estadoValidacion: 'Pendiente Validación',
    requiereAclaracion: false
  }
];

const MOCK_ACCIONES: AccionSeguimiento[] = [
  {
    id: 'acc-001',
    codigo: 'ACC-001-PM-2025-001',
    planMejoramientoId: 'pm-001',
    codigoPlan: 'PM-2025-001',
    hallazgoAsociado: 'H-2025-001',
    descripcion: 'Diseñar e implementar lista de chequeo obligatoria para estudios previos',
    tipo: 'Correctiva',
    responsable: 'Pedro Gómez Ruiz',
    cargo: 'Profesional Especializado Contratación',
    email: 'pedro.gomez@esap.edu.co',
    telefono: '601-2345678 ext. 102',
    fechaInicio: '2025-03-15',
    fechaFin: '2025-04-30',
    fechaVerificacion: '2025-05-15',
    fechaCumplimiento: '2025-04-22',
    estado: 'Cumplida',
    estadoSemaforo: 'verde',
    porcentajeAvance: 100,
    diasRestantes: 0,
    evidencias: MOCK_EVIDENCIAS,
    evidenciasAceptadas: 1,
    evidenciasConObservaciones: 1,
    evidenciasPendientes: 1,
    indicadorCumplimiento: '100% de estudios previos elaborados con lista de chequeo diligenciada',
    valorIndicador: '100%',
    metaIndicador: '100%',
    observaciones: 'Acción completada satisfactoriamente. Pendiente complementar acta de socialización.',
    ultimaActualizacion: '2025-04-22'
  },
  {
    id: 'acc-002',
    codigo: 'ACC-002-PM-2025-001',
    planMejoramientoId: 'pm-001',
    codigoPlan: 'PM-2025-001',
    hallazgoAsociado: 'H-2025-001',
    descripcion: 'Programa de capacitación para equipo de contratación',
    tipo: 'Preventiva',
    responsable: 'Laura Martínez Silva',
    cargo: 'Profesional Universitario Contratación',
    email: 'laura.martinez@esap.edu.co',
    telefono: '601-2345678 ext. 103',
    fechaInicio: '2025-03-20',
    fechaFin: '2025-04-15',
    fechaVerificacion: '2025-04-20',
    estado: 'En Proceso',
    estadoSemaforo: 'amarillo',
    porcentajeAvance: 65,
    diasRestantes: 8,
    evidencias: [],
    evidenciasAceptadas: 0,
    evidenciasConObservaciones: 0,
    evidenciasPendientes: 0,
    indicadorCumplimiento: '100% del equipo de contratación capacitado y certificado',
    valorIndicador: '62.5%',
    metaIndicador: '100%',
    observaciones: 'Se han realizado 5 de 8 sesiones programadas. Se reprogramó última sesión.',
    ultimaActualizacion: '2025-04-18'
  },
  {
    id: 'acc-003',
    codigo: 'ACC-003-PM-2025-001',
    planMejoramientoId: 'pm-001',
    codigoPlan: 'PM-2025-001',
    hallazgoAsociado: 'H-2025-001',
    descripcion: 'Establecer mecanismo de revisión técnica especializada',
    tipo: 'Correctiva',
    responsable: 'Carlos Ramírez Ortiz',
    cargo: 'Asesor Jurídico Senior',
    email: 'carlos.ramirez@esap.edu.co',
    telefono: '601-2345678 ext. 104',
    fechaInicio: '2025-03-25',
    fechaFin: '2025-05-10',
    fechaVerificacion: '2025-05-20',
    estado: 'En Proceso',
    estadoSemaforo: 'verde',
    porcentajeAvance: 45,
    diasRestantes: 27,
    evidencias: [],
    evidenciasAceptadas: 0,
    evidenciasConObservaciones: 0,
    evidenciasPendientes: 0,
    indicadorCumplimiento: '100% de estudios previos con revisión técnica documentada',
    observaciones: 'Se está elaborando el protocolo de revisión técnica',
    ultimaActualizacion: '2025-04-10'
  },
  {
    id: 'acc-004',
    codigo: 'ACC-004-PM-2025-001',
    planMejoramientoId: 'pm-001',
    codigoPlan: 'PM-2025-001',
    hallazgoAsociado: 'H-2025-002',
    descripcion: 'Optimizar flujo de aprobaciones para publicación SECOP II',
    tipo: 'Mejora',
    responsable: 'Ana Sofía Herrera',
    cargo: 'Profesional Universitario Contratación',
    email: 'ana.herrera@esap.edu.co',
    telefono: '601-2345678 ext. 105',
    fechaInicio: '2025-03-18',
    fechaFin: '2025-04-20',
    fechaVerificacion: '2025-04-30',
    estado: 'Vencida',
    estadoSemaforo: 'rojo',
    porcentajeAvance: 30,
    diasRestantes: -3,
    diasVencidos: 3,
    evidencias: [],
    evidenciasAceptadas: 0,
    evidenciasConObservaciones: 0,
    evidenciasPendientes: 0,
    indicadorCumplimiento: 'Tiempo promedio de publicación menor a 48 horas',
    observaciones: 'Acción vencida. Se requiere justificación del retraso.',
    ultimaActualizacion: '2025-04-15'
  }
];

const MOCK_PLANES: PlanSeguimiento[] = [
  {
    id: 'ps-001',
    codigo: 'PM-2025-001',
    codigoAuditoria: 'AUD-2025-001',
    procesoAuditable: 'Gestión Contractual',
    areaResponsable: 'Oficina Jurídica',
    jefeArea: 'María Pérez González',
    acciones: MOCK_ACCIONES,
    totalAcciones: 4,
    accionesCumplidas: 1,
    accionesEnProceso: 2,
    accionesPendientes: 0,
    accionesVencidas: 1,
    porcentajeAvanceGlobal: 60,
    estadoGeneral: 'amarillo',
    totalEvidencias: 3,
    evidenciasValidadas: 2,
    evidenciasPendientesValidacion: 1,
    alertasActivas: [
      {
        id: 'alert-001',
        accionId: 'acc-002',
        codigoAccion: 'ACC-002-PM-2025-001',
        diasRestantes: 8,
        fechaVencimiento: '2025-04-15',
        nivelAlerta: 'warning',
        notificada: true,
        fechaNotificacion: '2025-03-31'
      },
      {
        id: 'alert-002',
        accionId: 'acc-004',
        codigoAccion: 'ACC-004-PM-2025-001',
        diasRestantes: -3,
        fechaVencimiento: '2025-04-20',
        nivelAlerta: 'danger',
        notificada: true,
        fechaNotificacion: '2025-04-05'
      }
    ],
    notificacionesTrimestrales: [
      {
        id: 'not-trim-001',
        trimestre: 'Q1-2025',
        fechaEnvio: '2025-03-31',
        destinatarios: ['pedro.gomez@esap.edu.co', 'laura.martinez@esap.edu.co'],
        tipo: 'Recordatorio',
        mensaje: 'Recordatorio trimestral: Actualizar estado de avance de acciones del Plan PM-2025-001',
        estado: 'Respondida'
      }
    ],
    fechaAprobacion: '2025-03-14',
    fechaInicioSeguimiento: '2025-03-15',
    ultimaActualizacion: '2025-04-22'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function SeguimientoPlanesMejoramiento() {
  const [planes, setPlanes] = useState<PlanSeguimiento[]>(MOCK_PLANES);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanSeguimiento | null>(null);
  const [accionSeleccionada, setAccionSeleccionada] = useState<AccionSeguimiento | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle' | 'accion'>('lista');
  
  // ============ INTEGRACIÓN FASE 2 ============
  const { auditoria, guardarDocumento, notificarCambio } = useIntegracionControlInterno();
  const controlContext = useControlInterno();
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroSemaforo, setFiltroSemaforo] = useState('Todos');
  
  // Modales
  const [modalCargarEvidencia, setModalCargarEvidencia] = useState(false);
  const [modalValidarEvidencia, setModalValidarEvidencia] = useState(false);
  const [modalActualizarAvance, setModalActualizarAvance] = useState(false);
  const [modalVerificarEfectividad, setModalVerificarEfectividad] = useState(false);
  const [modalInformeSeguimiento, setModalInformeSeguimiento] = useState(false);
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<Evidencia | null>(null);

  // Estadísticas globales
  const stats = {
    totalPlanes: planes.length,
    totalAcciones: planes.reduce((sum, p) => sum + p.totalAcciones, 0),
    accionesCumplidas: planes.reduce((sum, p) => sum + p.accionesCumplidas, 0),
    accionesVencidas: planes.reduce((sum, p) => sum + p.accionesVencidas, 0),
    alertasActivas: planes.reduce((sum, p) => sum + p.alertasActivas.length, 0),
    evidenciasPendientes: planes.reduce((sum, p) => sum + p.evidenciasPendientesValidacion, 0)
  };

  const handleVerDetallePlan = (plan: PlanSeguimiento) => {
    setPlanSeleccionado(plan);
    setVistaActual('detalle');
  };

  const handleVerDetalleAccion = (accion: AccionSeguimiento) => {
    setAccionSeleccionada(accion);
    setVistaActual('accion');
  };

  const handleCargarEvidencia = async (evidencia: any) => {
    if (!accionSeleccionada) return;

    try {
      const nuevaEvidencia: Evidencia = {
        id: `ev-${Date.now()}`,
        nombre: evidencia.nombre,
        tipo: evidencia.tipo,
        tamano: evidencia.tamano,
        fechaCarga: new Date().toISOString().split('T')[0],
        horaCarga: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        cargadoPor: 'Usuario Actual',
        cargoUsuario: 'Responsable Acción',
        descripcion: evidencia.descripcion,
        estadoValidacion: 'Pendiente Validación',
        requiereAclaracion: false
      };

      // Actualizar acción con nueva evidencia
      setPlanes(planes.map(p => ({
        ...p,
        acciones: p.acciones.map(a =>
          a.id === accionSeleccionada.id
            ? {
                ...a,
                evidencias: [...a.evidencias, nuevaEvidencia],
                evidenciasPendientes: a.evidenciasPendientes + 1
              }
            : a
        )
      })));

      // ✅ INTEGRACIÓN: Guardar documento automáticamente en RF014
      if (evidencia.archivo && accionSeleccionada.hallazgoId) {
        await guardarDocumento({
          nombre: evidencia.nombre,
          tipo: "Evidencia Plan de Mejoramiento",
          archivo: evidencia.archivo,
          origenModulo: "Planes de Mejoramiento",
          origenId: accionSeleccionada.id,
          auditoriaId: accionSeleccionada.hallazgoId,
          codigoAuditoria: planSeleccionado?.codigoAuditoria || '',
          descripcion: `Evidencia de acción ${accionSeleccionada.codigo}: ${evidencia.descripcion}`,
          tags: ['evidencia', 'plan-mejoramiento', accionSeleccionada.codigo]
        });

        toast.success('Evidencia cargada y guardada automáticamente', {
          description: `${evidencia.nombre} sincronizada con RF014`
        });
      } else {
        toast.success('Evidencia cargada exitosamente');
      }

      setModalCargarEvidencia(false);
    } catch (error) {
      console.error('Error al cargar evidencia:', error);
      toast.error('Error al guardar evidencia');
    }
  };

  const handleValidarEvidencia = async (evidenciaId: string, decision: EstadoValidacion, comentarios: string, aclaracion?: string) => {
    if (!accionSeleccionada) return;

    try {
      setPlanes(planes.map(p => ({
        ...p,
        acciones: p.acciones.map(a =>
          a.id === accionSeleccionada.id
            ? {
                ...a,
                evidencias: a.evidencias.map(e =>
                  e.id === evidenciaId
                    ? {
                        ...e,
                        estadoValidacion: decision,
                        validadoPor: 'Carlos Martínez López',
                        cargoValidador: 'Jefe Oficina Control Interno',
                        fechaValidacion: new Date().toISOString().split('T')[0],
                        horaValidacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                        comentariosValidacion: comentarios,
                        requiereAclaracion: decision === 'Con Observaciones',
                        aclaracionSolicitada: aclaracion
                      }
                    : e
                ),
                evidenciasAceptadas: decision === 'Aceptado' ? a.evidenciasAceptadas + 1 : a.evidenciasAceptadas,
                evidenciasConObservaciones: decision === 'Con Observaciones' ? a.evidenciasConObservaciones + 1 : a.evidenciasConObservaciones,
                evidenciasPendientes: a.evidenciasPendientes - 1
              }
            : a
        )
      })));

      // ✅ INTEGRACIÓN: Notificar automáticamente al responsable
      if (decision === 'Con Observaciones' || decision === 'Rechazado') {
        await notificarCambio({
          tipo: 'evidencia-observacion',
          destinatarios: [accionSeleccionada.email],
          datos: {
            accion: accionSeleccionada.codigo,
            evidencia: evidenciaSeleccionada?.nombre,
            decision,
            comentarios,
            aclaracion,
            responsable: accionSeleccionada.responsable
          }
        });

        toast.warning(`Evidencia ${decision.toLowerCase()}`, {
          description: `Se ha notificado a ${accionSeleccionada.responsable}`
        });
      } else {
        toast.success('Evidencia validada exitosamente', {
          description: `Estado: ${decision}`
        });
      }

      setModalValidarEvidencia(false);
    } catch (error) {
      console.error('Error al validar evidencia:', error);
      toast.error('Error al validar evidencia');
    }
  };

  const handleActualizarAvance = (accionId: string, porcentaje: number, observaciones: string) => {
    const nuevoEstado: EstadoAccion = 
      porcentaje === 100 ? 'Cumplida' :
      porcentaje > 0 ? 'En Proceso' : 'Pendiente';

    setPlanes(planes.map(p => ({
      ...p,
      acciones: p.acciones.map(a =>
        a.id === accionId
          ? {
              ...a,
              porcentajeAvance: porcentaje,
              estado: nuevoEstado,
              observaciones: observaciones,
              ultimaActualizacion: new Date().toISOString().split('T')[0]
            }
          : a
      )
    })));

    setModalActualizarAvance(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Seguimiento a Planes de Mejoramiento
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF011 - Monitoreo, validación de evidencias y alertas automáticas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('lista')}
            variant={vistaActual === 'lista' ? 'default' : 'outline'}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Planes
          </Button>
          <Button
            onClick={() => setModalInformeSeguimiento(true)}
            size="sm"
            style={{ background: '#10B981' }}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Informe Consolidado
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS GLOBALES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Total Planes</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalPlanes}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">Total Acciones</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalAcciones}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-xs text-gray-600">Cumplidas</p>
          <p className="text-2xl font-black text-green-600">{stats.accionesCumplidas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-xs text-gray-600">Vencidas</p>
          <p className="text-2xl font-black text-red-600">{stats.accionesVencidas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">Alertas</p>
          <p className="text-2xl font-black text-amber-600">{stats.alertasActivas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#6B7280' }}>
          <p className="text-xs text-gray-600">Evidencias</p>
          <p className="text-2xl font-black text-gray-900">{stats.evidenciasPendientes}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, proceso o área..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filtroSemaforo}
            onChange={(e) => setFiltroSemaforo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los semáforos</option>
            <option value="verde">🟢 Verde (Al día)</option>
            <option value="amarillo">🟡 Amarillo (Próximo vencimiento)</option>
            <option value="rojo">🔴 Rojo (Vencido)</option>
          </select>
        </div>
      </Card>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'lista' && (
          <ListaPlanesView
            key="lista"
            planes={planes}
            onVerDetalle={handleVerDetallePlan}
          />
        )}

        {vistaActual === 'detalle' && planSeleccionado && (
          <DetallePlanView
            key="detalle"
            plan={planSeleccionado}
            onVolver={() => setVistaActual('lista')}
            onVerAccion={handleVerDetalleAccion}
          />
        )}

        {vistaActual === 'accion' && accionSeleccionada && (
          <DetalleAccionView
            key="accion"
            accion={accionSeleccionada}
            onVolver={() => setVistaActual('detalle')}
            onCargarEvidencia={() => setModalCargarEvidencia(true)}
            onValidarEvidencia={(ev) => {
              setEvidenciaSeleccionada(ev);
              setModalValidarEvidencia(true);
            }}
            onActualizarAvance={() => setModalActualizarAvance(true)}
          />
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AnimatePresence>
        {modalCargarEvidencia && accionSeleccionada && (
          <ModalCargarEvidencia
            accion={accionSeleccionada}
            onCargar={handleCargarEvidencia}
            onCerrar={() => setModalCargarEvidencia(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalValidarEvidencia && evidenciaSeleccionada && (
          <ModalValidarEvidencia
            evidencia={evidenciaSeleccionada}
            onValidar={handleValidarEvidencia}
            onCerrar={() => setModalValidarEvidencia(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalActualizarAvance && accionSeleccionada && (
          <ModalActualizarAvance
            accion={accionSeleccionada}
            onActualizar={handleActualizarAvance}
            onCerrar={() => setModalActualizarAvance(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: LISTA DE PLANES ============

interface ListaPlanesViewProps {
  planes: PlanSeguimiento[];
  onVerDetalle: (plan: PlanSeguimiento) => void;
}

function ListaPlanesView({ planes, onVerDetalle }: ListaPlanesViewProps) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const getSemaforoIcon = (semaforo: EstadoSemaforo) => {
    switch (semaforo) {
      case 'verde': return '🟢';
      case 'amarillo': return '🟡';
      case 'rojo': return '🔴';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {planes.map((plan) => (
        <Card key={plan.id} className="overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                    {plan.codigo}
                  </Badge>
                  <span className="text-2xl">{getSemaforoIcon(plan.estadoGeneral)}</span>
                  {plan.alertasActivas.length > 0 && (
                    <Badge style={{ background: '#EF4444', color: '#FFF' }}>
                      <Bell className="w-3 h-3 mr-1" />
                      {plan.alertasActivas.length} alertas
                    </Badge>
                  )}
                </div>
                <h3 className="font-black text-gray-900 mb-1">{plan.procesoAuditable}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {plan.areaResponsable}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inicio: {plan.fechaInicioSeguimiento}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {plan.porcentajeAvanceGlobal}% avance
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setExpandido(expandido === plan.id ? null : plan.id)}
                  variant="outline"
                  size="sm"
                >
                  {expandido === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">Progreso global del plan</span>
                <span className="font-bold text-gray-900">{plan.porcentajeAvanceGlobal}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${plan.porcentajeAvanceGlobal}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{
                    background: plan.porcentajeAvanceGlobal === 100 ? '#10B981' :
                               plan.porcentajeAvanceGlobal >= 75 ? '#3B82F6' :
                               plan.porcentajeAvanceGlobal >= 50 ? '#F59E0B' : '#EF4444'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contenido Expandible */}
          <AnimatePresence>
            {expandido === plan.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-lg font-black text-gray-900">{plan.totalAcciones}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#D1FAE5' }}>
                      <p className="text-xs text-gray-600">Cumplidas</p>
                      <p className="text-lg font-black text-green-900">{plan.accionesCumplidas}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <p className="text-xs text-gray-600">En Proceso</p>
                      <p className="text-lg font-black text-amber-900">{plan.accionesEnProceso}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                      <p className="text-xs text-gray-600">Vencidas</p>
                      <p className="text-lg font-black text-red-900">{plan.accionesVencidas}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: '#E0E7FF' }}>
                      <p className="text-xs text-gray-600">Evidencias</p>
                      <p className="text-lg font-black text-blue-900">{plan.totalEvidencias}</p>
                    </div>
                  </div>

                  {/* Alertas Activas */}
                  {plan.alertasActivas.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <p className="text-xs font-bold text-amber-900 uppercase mb-2">
                        ⚠️ Alertas Activas ({plan.alertasActivas.length})
                      </p>
                      <div className="space-y-1">
                        {plan.alertasActivas.map((alerta) => (
                          <div key={alerta.id} className="text-xs text-amber-800">
                            • {alerta.codigoAccion}: 
                            {alerta.diasRestantes > 0 
                              ? ` Vence en ${alerta.diasRestantes} días`
                              : ` Vencida hace ${Math.abs(alerta.diasRestantes)} días`
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={() => onVerDetalle(plan)} variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle Completo
                    </Button>
                    <Button size="sm" style={{ background: '#3B82F6' }}>
                      <Download className="w-4 h-4 mr-2" />
                      Informe de Seguimiento
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </motion.div>
  );
}

// ============ VISTA: DETALLE DEL PLAN (continuará en siguiente mensaje por límite de tokens) ============

interface DetallePlanViewProps {
  plan: PlanSeguimiento;
  onVolver: () => void;
  onVerAccion: (accion: AccionSeguimiento) => void;
}

function DetallePlanView({ plan, onVolver, onVerAccion }: DetallePlanViewProps) {
  const getSemaforoColor = (semaforo: EstadoSemaforo) => {
    switch (semaforo) {
      case 'verde': return '#10B981';
      case 'amarillo': return '#F59E0B';
      case 'rojo': return '#EF4444';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                {plan.codigo}
              </Badge>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: getSemaforoColor(plan.estadoGeneral) }}>
                <span className="text-white text-lg">●</span>
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">{plan.procesoAuditable}</h2>
            <p className="text-gray-600">Área: {plan.areaResponsable} - {plan.jefeArea}</p>
          </div>

          <div className="text-right">
            <p className="text-4xl font-black text-gray-900">{plan.porcentajeAvanceGlobal}%</p>
            <p className="text-xs text-gray-600">Avance global</p>
          </div>
        </div>
      </Card>

      {/* Acciones del Plan */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Acciones Correctivas ({plan.totalAcciones})
        </h3>

        <div className="space-y-3">
          {plan.acciones.map((accion) => (
            <AccionCard
              key={accion.id}
              accion={accion}
              onVerDetalle={onVerAccion}
            />
          ))}
        </div>
      </Card>

      {/* Notificaciones Trimestrales */}
      {plan.notificacionesTrimestrales.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Notificaciones Trimestrales
          </h3>

          <div className="space-y-2">
            {plan.notificacionesTrimestrales.map((not) => (
              <div key={not.id} className="p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{not.trimestre}</Badge>
                      <Badge style={{
                        background: not.estado === 'Respondida' ? '#10B981' :
                                   not.estado === 'Leída' ? '#F59E0B' : '#3B82F6',
                        color: '#FFF'
                      }}>
                        {not.estado}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">{not.mensaje}</p>
                    <p className="text-xs text-gray-500">Enviada: {not.fechaEnvio}</p>
                  </div>
                  <Bell className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE: CARD DE ACCIÓN ============

interface AccionCardProps {
  accion: AccionSeguimiento;
  onVerDetalle: (accion: AccionSeguimiento) => void;
}

function AccionCard({ accion, onVerDetalle }: AccionCardProps) {
  const getSemaforoColor = (semaforo: EstadoSemaforo) => {
    switch (semaforo) {
      case 'verde': return '#10B981';
      case 'amarillo': return '#F59E0B';
      case 'rojo': return '#EF4444';
    }
  };

  return (
    <div className="p-4 rounded-lg border" style={{ background: '#F9FAFB' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-black">{accion.codigo}</Badge>
            <Badge style={{
              background: accion.tipo === 'Correctiva' ? '#EF4444' :
                         accion.tipo === 'Preventiva' ? '#3B82F6' : '#10B981',
              color: '#FFF'
            }}>
              {accion.tipo}
            </Badge>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: getSemaforoColor(accion.estadoSemaforo) }}>
              <span className="text-white text-xs">●</span>
            </div>
            <Badge style={{
              background: accion.estado === 'Cumplida' ? '#10B981' :
                         accion.estado === 'Vencida' ? '#EF4444' :
                         accion.estado === 'En Proceso' ? '#F59E0B' : '#6B7280',
              color: '#FFF'
            }}>
              {accion.estado}
            </Badge>
          </div>

          <p className="text-sm font-bold text-gray-900 mb-2">{accion.descripcion}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Responsable</p>
              <p className="font-bold text-gray-900">{accion.responsable}</p>
            </div>
            <div>
              <p className="text-gray-600">Vencimiento</p>
              <p className="font-bold text-gray-900">{accion.fechaFin}</p>
            </div>
            <div>
              <p className="text-gray-600">Avance</p>
              <p className="font-bold text-gray-900">{accion.porcentajeAvance}%</p>
            </div>
            <div>
              <p className="text-gray-600">Evidencias</p>
              <p className="font-bold text-gray-900">{accion.evidencias.length}</p>
              {accion.evidenciasPendientes > 0 && (
                <Badge variant="outline" className="text-xs mt-1">
                  {accion.evidenciasPendientes} pendientes
                </Badge>
              )}
            </div>
          </div>

          {accion.diasRestantes <= 15 && accion.estado !== 'Cumplida' && (
            <div className="p-2 rounded" style={{ background: accion.estadoSemaforo === 'rojo' ? '#FEE2E2' : '#FEF3C7' }}>
              <p className="text-xs font-bold" style={{ color: accion.estadoSemaforo === 'rojo' ? '#991B1B' : '#92400E' }}>
                {accion.diasRestantes > 0 
                  ? `⚠️ Vence en ${accion.diasRestantes} días`
                  : `🔴 Vencida hace ${Math.abs(accion.diasRestantes)} días`
                }
              </p>
            </div>
          )}

          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${accion.porcentajeAvance}%`,
                  background: accion.porcentajeAvance === 100 ? '#10B981' : '#3B82F6'
                }}
              />
            </div>
          </div>
        </div>

        <Button onClick={() => onVerDetalle(accion)} variant="outline" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============ VISTA: DETALLE DE ACCIÓN (continuará en próximo mensaje) ============

interface DetalleAccionViewProps {
  accion: AccionSeguimiento;
  onVolver: () => void;
  onCargarEvidencia: () => void;
  onValidarEvidencia: (evidencia: Evidencia) => void;
  onActualizarAvance: () => void;
}

function DetalleAccionView({ accion, onVolver, onCargarEvidencia, onValidarEvidencia, onActualizarAvance }: DetalleAccionViewProps) {
  const [pestanaActiva, setPestanaActiva] = useState<'info' | 'evidencias' | 'seguimiento'>('info');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver al plan
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                {accion.codigo}
              </Badge>
              <Badge style={{
                background: accion.estado === 'Cumplida' ? '#10B981' :
                           accion.estado === 'Vencida' ? '#EF4444' : '#F59E0B',
                color: '#FFF'
              }}>
                {accion.estado}
              </Badge>
            </div>
            <h2 className="text-xl font-black text-gray-900">{accion.descripcion}</h2>
          </div>

          <div className="flex gap-2">
            <Button onClick={onCargarEvidencia} size="sm" style={{ background: '#3B82F6' }}>
              <Upload className="w-4 h-4 mr-2" />
              Cargar Evidencia
            </Button>
            <Button onClick={onActualizarAvance} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualizar Avance
            </Button>
          </div>
        </div>
      </Card>

      {/* Pestañas */}
      <Card className="p-2">
        <div className="flex gap-2">
          <Button
            onClick={() => setPestanaActiva('info')}
            variant={pestanaActiva === 'info' ? 'default' : 'ghost'}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Información
          </Button>
          <Button
            onClick={() => setPestanaActiva('evidencias')}
            variant={pestanaActiva === 'evidencias' ? 'default' : 'ghost'}
            size="sm"
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Evidencias ({accion.evidencias.length})
          </Button>
          <Button
            onClick={() => setPestanaActiva('seguimiento')}
            variant={pestanaActiva === 'seguimiento' ? 'default' : 'ghost'}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Seguimiento
          </Button>
        </div>
      </Card>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {pestanaActiva === 'info' && (
          <PestanaInfoAccion key="info" accion={accion} />
        )}
        {pestanaActiva === 'evidencias' && (
          <PestanaEvidencias
            key="evidencias"
            accion={accion}
            onValidar={onValidarEvidencia}
          />
        )}
        {pestanaActiva === 'seguimiento' && (
          <PestanaSeguimiento key="seguimiento" accion={accion} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ PESTAÑA: INFORMACIÓN ACCIÓN ============

function PestanaInfoAccion({ accion }: { accion: AccionSeguimiento }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Detalles de la Acción</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600">Responsable</p>
            <p className="font-bold text-gray-900">{accion.responsable}</p>
            <p className="text-xs text-gray-600">{accion.cargo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Contacto</p>
            <p className="text-gray-900">{accion.email}</p>
            <p className="text-gray-900">{accion.telefono}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Fecha Inicio</p>
            <p className="font-bold text-gray-900">{accion.fechaInicio}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Fecha Fin</p>
            <p className="font-bold text-gray-900">{accion.fechaFin}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Verificación OCI</p>
            <p className="font-bold text-gray-900">{accion.fechaVerificacion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Última Actualización</p>
            <p className="font-bold text-gray-900">{accion.ultimaActualizacion}</p>
          </div>
        </div>

        {accion.indicadorCumplimiento && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: '#DBEAFE' }}>
            <p className="text-xs font-bold text-blue-900 uppercase mb-1">Indicador de Cumplimiento</p>
            <p className="text-sm text-blue-800">{accion.indicadorCumplimiento}</p>
            {accion.valorIndicador && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-blue-700">Valor actual:</span>
                <Badge style={{ background: '#3B82F6', color: '#FFF' }}>{accion.valorIndicador}</Badge>
                {accion.metaIndicador && (
                  <>
                    <span className="text-xs text-blue-700">Meta:</span>
                    <Badge variant="outline">{accion.metaIndicador}</Badge>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {accion.observaciones && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
            <p className="text-xs font-bold text-gray-900 uppercase mb-1">Observaciones</p>
            <p className="text-sm text-gray-700">{accion.observaciones}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============ PESTAÑA: EVIDENCIAS ============

function PestanaEvidencias({ accion, onValidar }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            Evidencias Cargadas ({accion.evidencias.length})
          </h3>
          <div className="flex gap-2">
            <Badge variant="outline">
              <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
              {accion.evidenciasAceptadas} Aceptadas
            </Badge>
            <Badge variant="outline">
              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
              {accion.evidenciasConObservaciones} Con Observaciones
            </Badge>
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1 text-gray-600" />
              {accion.evidenciasPendientes} Pendientes
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {accion.evidencias.map((evidencia: Evidencia) => (
            <EvidenciaCard
              key={evidencia.id}
              evidencia={evidencia}
              onValidar={() => onValidar(evidencia)}
            />
          ))}

          {accion.evidencias.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Paperclip className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay evidencias cargadas</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE: CARD DE EVIDENCIA ============

function EvidenciaCard({ evidencia, onValidar }: any) {
  const [expandida, setExpandida] = useState(false);

  const getEstadoColor = (estado: EstadoValidacion) => {
    switch (estado) {
      case 'Aceptado': return '#10B981';
      case 'Con Observaciones': return '#F59E0B';
      case 'Rechazado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4" style={{ background: '#F9FAFB' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <p className="font-bold text-gray-900">{evidencia.nombre}</p>
              <Badge style={{ background: getEstadoColor(evidencia.estadoValidacion), color: '#FFF' }}>
                {evidencia.estadoValidacion}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
              <span>{evidencia.tipo}</span>
              <span>{evidencia.tamano}</span>
              <span>Cargada: {evidencia.fechaCarga} {evidencia.horaCarga}</span>
            </div>
            <p className="text-sm text-gray-700">{evidencia.descripcion}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setExpandida(!expandida)} variant="outline" size="sm">
              {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            {evidencia.estadoValidacion === 'Pendiente Validación' && (
              <Button onClick={onValidar} size="sm" style={{ background: '#3B82F6' }}>
                <ShieldCheck className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Información de validación */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="text-xs">
                <p className="text-gray-600">Cargado por:</p>
                <p className="font-bold text-gray-900">{evidencia.cargadoPor} - {evidencia.cargoUsuario}</p>
              </div>

              {evidencia.validadoPor && (
                <>
                  <div className="text-xs">
                    <p className="text-gray-600">Validado por:</p>
                    <p className="font-bold text-gray-900">{evidencia.validadoPor} - {evidencia.cargoValidador}</p>
                    <p className="text-gray-500">{evidencia.fechaValidacion} {evidencia.horaValidacion}</p>
                  </div>

                  {evidencia.comentariosValidacion && (
                    <div className="p-3 rounded-lg" style={{
                      background: evidencia.estadoValidacion === 'Aceptado' ? '#D1FAE5' :
                                 evidencia.estadoValidacion === 'Con Observaciones' ? '#FEF3C7' : '#FEE2E2'
                    }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{
                        color: evidencia.estadoValidacion === 'Aceptado' ? '#065F46' :
                              evidencia.estadoValidacion === 'Con Observaciones' ? '#92400E' : '#991B1B'
                      }}>
                        Comentarios del Auditor
                      </p>
                      <p className="text-sm" style={{
                        color: evidencia.estadoValidacion === 'Aceptado' ? '#047857' :
                              evidencia.estadoValidacion === 'Con Observaciones' ? '#B45309' : '#DC2626'
                      }}>
                        {evidencia.comentariosValidacion}
                      </p>
                    </div>
                  )}

                  {evidencia.requiereAclaracion && evidencia.aclaracionSolicitada && (
                    <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <p className="text-xs font-bold text-amber-900 uppercase mb-1">Aclaración Solicitada</p>
                      <p className="text-sm text-amber-800 mb-2">{evidencia.aclaracionSolicitada}</p>
                      {evidencia.aclaracionRespuesta && (
                        <>
                          <p className="text-xs font-bold text-amber-900 uppercase mb-1">Respuesta del Área</p>
                          <p className="text-sm text-amber-800">{evidencia.aclaracionRespuesta}</p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ PESTAÑA: SEGUIMIENTO ============

function PestanaSeguimiento({ accion }: { accion: AccionSeguimiento }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Historial de Seguimiento</h3>
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Funcionalidad en desarrollo</p>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ MODALES (continuará en próximo mensaje) ============

function ModalCargarEvidencia({ accion, onCargar, onCerrar }: any) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'PDF',
    tamano: '',
    descripcion: ''
  });

  return (
    <Modal titulo="Cargar Evidencia" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Nombre del Archivo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="documento_evidencia.pdf"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Describa brevemente el contenido de la evidencia..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onCargar({ ...formData, tamano: '1.5 MB' })}
            disabled={!formData.nombre || !formData.descripcion}
            className="flex-1"
            style={{ background: '#3B82F6' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Cargar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalValidarEvidencia({ evidencia, onValidar, onCerrar }: any) {
  const [decision, setDecision] = useState<EstadoValidacion>('Aceptado');
  const [comentarios, setComentarios] = useState('');
  const [aclaracion, setAclaracion] = useState('');

  return (
    <Modal titulo="Validar Evidencia" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-3 rounded-lg" style={{ background: '#F3F4F6' }}>
          <p className="text-xs text-gray-600 mb-1">Evidencia</p>
          <p className="font-bold text-gray-900">{evidencia.nombre}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Decisión <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setDecision('Aceptado')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Aceptado' ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-900">Aceptar Evidencia</span>
              </div>
            </button>

            <button
              onClick={() => setDecision('Con Observaciones')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Con Observaciones' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-gray-900">Con Observaciones</span>
              </div>
            </button>

            <button
              onClick={() => setDecision('Rechazado')}
              className={`w-full p-3 rounded-lg border-2 text-left ${
                decision === 'Rechazado' ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-600" />
                <span className="font-bold text-gray-900">Rechazar Evidencia</span>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Comentarios de Validación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Ingrese sus comentarios sobre la evidencia..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {decision === 'Con Observaciones' && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Aclaración Solicitada
            </label>
            <textarea
              value={aclaracion}
              onChange={(e) => setAclaracion(e.target.value)}
              placeholder="Especifique qué información o complemento se requiere..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onValidar(evidencia.id, decision, comentarios, aclaracion)}
            disabled={!comentarios.trim()}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar Validación
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalActualizarAvance({ accion, onActualizar, onCerrar }: any) {
  const [porcentaje, setPorcentaje] = useState(accion.porcentajeAvance);
  const [observaciones, setObservaciones] = useState('');

  return (
    <Modal titulo="Actualizar Avance" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Porcentaje de Avance: {porcentaje}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={porcentaje}
            onChange={(e) => setPorcentaje(Number(e.target.value))}
            className="w-full"
          />
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${porcentaje}%`,
                background: porcentaje === 100 ? '#10B981' : '#3B82F6'
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Observaciones <span className="text-red-500">*</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Describa el avance realizado..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onActualizar(accion.id, porcentaje, observaciones)}
            disabled={!observaciones.trim()}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
