/**
 * RF014 - SISTEMA DE NOTIFICACIONES
 * Centro de notificaciones con alertas automáticas y preferencias
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, BellRing, BellOff, Check, CheckCheck, X, Archive,
  AlertCircle, AlertTriangle, Info, CheckCircle, Calendar,
  Clock, FileText, Send, Mail, Smartphone, Monitor, Settings,
  Filter, Search, Trash2, Eye, EyeOff, Volume2, VolumeX,
  User, Users, Target, ClipboardCheck, TrendingUp, FileCheck,
  Download, MessageSquare, Star, Flag, Circle, Dot, ChevronRight,
  Package, Shield, Zap, XCircle, PlayCircle, PauseCircle, Upload,
  Edit
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';

// ============ TIPOS ============

type TipoNotificacion =
  | 'Anuncio de Auditoría'
  | 'Recordatorio de Plazo'
  | 'Vencimiento Crítico'
  | 'Hallazgo Identificado'
  | 'Solicitud de Evidencia'
  | 'Confirmación de Recepción'
  | 'Aprobación de Plan'
  | 'Rechazo de Plan'
  | 'Información General'
  | 'Alerta del Sistema';

type EstadoNotificacion = 'No Leída' | 'Leída' | 'Archivada';

type PrioridadNotificacion = 'Baja' | 'Media' | 'Alta' | 'Crítica';

type CanalNotificacion = 'Sistema' | 'Email' | 'SMS';

interface Accion {
  id: string;
  label: string;
  url?: string;
  callback?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  
  // Origen
  origenModulo: string;
  origenId?: string;
  
  // Destinatarios
  destinatario: string;
  destinatarioEmail: string;
  
  // Fechas
  fechaCreacion: string;
  horaCreacion: string;
  fechaVencimiento?: string;
  
  // Estado
  estado: EstadoNotificacion;
  fechaLectura?: string;
  
  // Canales
  canales: CanalNotificacion[];
  enviadoPorEmail: boolean;
  enviadoPorSMS: boolean;
  
  // Metadata
  creadoPor: string;
  acciones?: Accion[];
  datos?: any;
  
  // Agrupación
  agrupable: boolean;
  grupoId?: string;
}

interface PreferenciaNotificacion {
  tipo: TipoNotificacion;
  habilitado: boolean;
  canales: {
    sistema: boolean;
    email: boolean;
    sms: boolean;
  };
  frecuencia: 'Inmediata' | 'Diaria' | 'Semanal';
  horaEnvio?: string;
}

interface ConfiguracionUsuario {
  usuarioId: string;
  nombre: string;
  email: string;
  telefono?: string;
  
  // Preferencias generales
  notificacionesPausadas: boolean;
  soloUrgentes: boolean;
  sonidosHabilitados: boolean;
  
  // Preferencias por tipo
  preferencias: PreferenciaNotificacion[];
  
  // Configuración de resumen
  resumenDiario: boolean;
  horaResumen: string;
}

// ============ DATOS MOCK ============

const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 'not-001',
    tipo: 'Anuncio de Auditoría',
    prioridad: 'Alta',
    titulo: 'Nueva Auditoría: Gestión Contractual 2025',
    mensaje: 'Se ha programado una auditoría a su proceso. El memorando de asignación ha sido enviado oficialmente. Por favor, prepare la documentación solicitada.',
    origenModulo: 'Gestión de Auditorías',
    origenId: 'aud-001',
    destinatario: 'Director de Gestión Contractual',
    destinatarioEmail: 'director.contractual@esap.edu.co',
    fechaCreacion: '2025-05-10',
    horaCreacion: '09:30',
    fechaVencimiento: '2025-05-20',
    estado: 'No Leída',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Sistema Automático',
    acciones: [
      {
        id: 'acc-001',
        label: 'Ver Memorando',
        icon: <FileText className="w-4 h-4" />,
        variant: 'primary'
      },
      {
        id: 'acc-002',
        label: 'Ver Cronograma',
        icon: <Calendar className="w-4 h-4" />,
        variant: 'secondary'
      }
    ],
    datos: {
      codigoAuditoria: 'AUD-2025-001',
      fechaInicio: '2025-05-20',
      auditorLider: 'Ana García Torres'
    },
    agrupable: false
  },
  {
    id: 'not-002',
    tipo: 'Recordatorio de Plazo',
    prioridad: 'Media',
    titulo: 'Recordatorio: Vence Plan de Mejoramiento en 7 días',
    mensaje: 'El plan de mejoramiento PM-2025-003 vence el 17/05/2025. Por favor, asegúrese de cargar las evidencias pendientes.',
    origenModulo: 'Seguimiento de Planes',
    origenId: 'pm-003',
    destinatario: 'Coordinador de Talento Humano',
    destinatarioEmail: 'coord.talento@esap.edu.co',
    fechaCreacion: '2025-05-10',
    horaCreacion: '08:00',
    fechaVencimiento: '2025-05-17',
    estado: 'No Leída',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Sistema Automático',
    acciones: [
      {
        id: 'acc-003',
        label: 'Cargar Evidencias',
        icon: <Upload className="w-4 h-4" />,
        variant: 'primary'
      },
      {
        id: 'acc-004',
        label: 'Ver Plan',
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary'
      }
    ],
    datos: {
      codigoPlan: 'PM-2025-003',
      accionesPendientes: 2,
      diasRestantes: 7
    },
    agrupable: true,
    grupoId: 'recordatorios-planes'
  },
  {
    id: 'not-003',
    tipo: 'Vencimiento Crítico',
    prioridad: 'Crítica',
    titulo: '¡URGENTE! Informe de Ley vencido',
    mensaje: 'El Informe Pormenorizado Q1 2025 venció hace 2 días. Se requiere acción inmediata para justificar el retraso y completar el informe.',
    origenModulo: 'Informes de Ley',
    origenId: 'inf-gen-001',
    destinatario: 'Jefe Oficina Control Interno',
    destinatarioEmail: 'jefe.oci@esap.edu.co',
    fechaCreacion: '2025-05-10',
    horaCreacion: '07:00',
    fechaVencimiento: '2025-05-08',
    estado: 'Leída',
    fechaLectura: '2025-05-10 08:30',
    canales: ['Sistema', 'Email', 'SMS'],
    enviadoPorEmail: true,
    enviadoPorSMS: true,
    creadoPor: 'Sistema Automático',
    acciones: [
      {
        id: 'acc-005',
        label: 'Completar Informe',
        icon: <FileCheck className="w-4 h-4" />,
        variant: 'danger'
      }
    ],
    datos: {
      codigoInforme: 'INF-PORC-CI-2025-Q1',
      diasVencido: 2
    },
    agrupable: false
  },
  {
    id: 'not-004',
    tipo: 'Hallazgo Identificado',
    prioridad: 'Alta',
    titulo: 'Hallazgo identificado en su proceso',
    mensaje: 'Se identificó un hallazgo de tipo "No Conformidad" en la auditoría de Gestión Contractual. Puede consultar el detalle en el sistema.',
    origenModulo: 'Gestión de Hallazgos',
    origenId: 'hal-005',
    destinatario: 'Director de Gestión Contractual',
    destinatarioEmail: 'director.contractual@esap.edu.co',
    fechaCreacion: '2025-05-09',
    horaCreacion: '15:45',
    estado: 'Leída',
    fechaLectura: '2025-05-09 16:20',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Ana García Torres',
    acciones: [
      {
        id: 'acc-006',
        label: 'Ver Hallazgo',
        icon: <AlertTriangle className="w-4 h-4" />,
        variant: 'primary'
      },
      {
        id: 'acc-007',
        label: 'Formular Plan',
        icon: <ClipboardCheck className="w-4 h-4" />,
        variant: 'secondary'
      }
    ],
    datos: {
      codigoHallazgo: 'HAL-2025-005',
      gravedad: 'Alta',
      proceso: 'Gestión Contractual'
    },
    agrupable: false
  },
  {
    id: 'not-005',
    tipo: 'Solicitud de Evidencia',
    prioridad: 'Media',
    titulo: 'Solicitud de evidencia para acción correctiva',
    mensaje: 'Se requiere que cargue la evidencia de cumplimiento para la acción "Actualización de formatos de estudios previos" del plan PM-2025-003.',
    origenModulo: 'Seguimiento de Planes',
    origenId: 'acc-012',
    destinatario: 'Coordinador de Talento Humano',
    destinatarioEmail: 'coord.talento@esap.edu.co',
    fechaCreacion: '2025-05-08',
    horaCreacion: '10:00',
    fechaVencimiento: '2025-05-15',
    estado: 'Leída',
    fechaLectura: '2025-05-08 11:15',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Sistema Automático',
    acciones: [
      {
        id: 'acc-008',
        label: 'Cargar Evidencia',
        icon: <Upload className="w-4 h-4" />,
        variant: 'primary'
      }
    ],
    datos: {
      codigoPlan: 'PM-2025-003',
      accionId: 'ACC-012',
      plazo: '2025-05-15'
    },
    agrupable: true,
    grupoId: 'solicitudes-evidencia'
  },
  {
    id: 'not-006',
    tipo: 'Confirmación de Recepción',
    prioridad: 'Baja',
    titulo: 'Documento recibido correctamente',
    mensaje: 'Se ha recibido y registrado correctamente el documento "Plan de Mejoramiento PM-2025-004.pdf". El equipo de Control Interno procederá con la revisión.',
    origenModulo: 'Planes de Mejoramiento',
    origenId: 'pm-004',
    destinatario: 'Director Administrativo',
    destinatarioEmail: 'director.admin@esap.edu.co',
    fechaCreacion: '2025-05-07',
    horaCreacion: '14:30',
    estado: 'Leída',
    fechaLectura: '2025-05-07 15:00',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Sistema Automático',
    datos: {
      codigoPlan: 'PM-2025-004',
      nombreArchivo: 'Plan de Mejoramiento PM-2025-004.pdf'
    },
    agrupable: true,
    grupoId: 'confirmaciones-recepcion'
  },
  {
    id: 'not-007',
    tipo: 'Aprobación de Plan',
    prioridad: 'Media',
    titulo: '✓ Plan de Mejoramiento Aprobado',
    mensaje: 'El plan de mejoramiento PM-2025-002 ha sido aprobado por la Oficina de Control Interno. Puede iniciar la ejecución de las acciones correctivas.',
    origenModulo: 'Planes de Mejoramiento',
    origenId: 'pm-002',
    destinatario: 'Director Financiero',
    destinatarioEmail: 'director.financiero@esap.edu.co',
    fechaCreacion: '2025-05-06',
    horaCreacion: '16:00',
    estado: 'Leída',
    fechaLectura: '2025-05-06 16:45',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Carlos Martínez López',
    acciones: [
      {
        id: 'acc-009',
        label: 'Ver Plan Aprobado',
        icon: <CheckCircle className="w-4 h-4" />,
        variant: 'primary'
      }
    ],
    datos: {
      codigoPlan: 'PM-2025-002',
      aprobadoPor: 'Carlos Martínez López',
      fechaAprobacion: '2025-05-06'
    },
    agrupable: false
  },
  {
    id: 'not-008',
    tipo: 'Rechazo de Plan',
    prioridad: 'Alta',
    titulo: '✗ Plan de Mejoramiento Rechazado',
    mensaje: 'El plan de mejoramiento PM-2025-005 ha sido rechazado. Motivo: "Las acciones correctivas propuestas no abordan la causa raíz del hallazgo". Por favor, revise los comentarios y presente una nueva versión.',
    origenModulo: 'Planes de Mejoramiento',
    origenId: 'pm-005',
    destinatario: 'Coordinador de Sistemas',
    destinatarioEmail: 'coord.sistemas@esap.edu.co',
    fechaCreacion: '2025-05-05',
    horaCreacion: '11:20',
    estado: 'Archivada',
    fechaLectura: '2025-05-05 12:00',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Ana García Torres',
    acciones: [
      {
        id: 'acc-010',
        label: 'Ver Observaciones',
        icon: <MessageSquare className="w-4 h-4" />,
        variant: 'primary'
      },
      {
        id: 'acc-011',
        label: 'Editar Plan',
        icon: <Edit className="w-4 h-4" />,
        variant: 'secondary'
      }
    ],
    datos: {
      codigoPlan: 'PM-2025-005',
      rechazadoPor: 'Ana García Torres',
      observaciones: 'Las acciones correctivas propuestas no abordan la causa raíz del hallazgo'
    },
    agrupable: false
  },
  {
    id: 'not-009',
    tipo: 'Información General',
    prioridad: 'Baja',
    titulo: 'Actualización del sistema disponible',
    mensaje: 'Se ha publicado una nueva versión del sistema de Control Interno con mejoras en el módulo de Gestión Documental. Los cambios estarán disponibles el próximo lunes.',
    origenModulo: 'Sistema',
    destinatario: 'Todos los usuarios',
    destinatarioEmail: 'usuarios@esap.edu.co',
    fechaCreacion: '2025-05-04',
    horaCreacion: '09:00',
    estado: 'Archivada',
    fechaLectura: '2025-05-04 10:30',
    canales: ['Sistema'],
    enviadoPorEmail: false,
    enviadoPorSMS: false,
    creadoPor: 'Administrador del Sistema',
    agrupable: true,
    grupoId: 'info-sistema'
  },
  {
    id: 'not-010',
    tipo: 'Recordatorio de Plazo',
    prioridad: 'Media',
    titulo: 'Recordatorio: Vence Plan de Mejoramiento en 7 días',
    mensaje: 'El plan de mejoramiento PM-2025-001 vence el 18/05/2025. Actualmente tiene 3 acciones pendientes de evidencia.',
    origenModulo: 'Seguimiento de Planes',
    origenId: 'pm-001',
    destinatario: 'Director Académico',
    destinatarioEmail: 'director.academico@esap.edu.co',
    fechaCreacion: '2025-05-11',
    horaCreacion: '08:00',
    fechaVencimiento: '2025-05-18',
    estado: 'No Leída',
    canales: ['Sistema', 'Email'],
    enviadoPorEmail: true,
    enviadoPorSMS: false,
    creadoPor: 'Sistema Automático',
    acciones: [
      {
        id: 'acc-012',
        label: 'Ver Estado',
        icon: <TrendingUp className="w-4 h-4" />,
        variant: 'primary'
      }
    ],
    datos: {
      codigoPlan: 'PM-2025-001',
      accionesPendientes: 3,
      diasRestantes: 7
    },
    agrupable: true,
    grupoId: 'recordatorios-planes'
  }
];

const MOCK_CONFIGURACION: ConfiguracionUsuario = {
  usuarioId: 'usr-001',
  nombre: 'Carlos Martínez López',
  email: 'carlos.martinez@esap.edu.co',
  telefono: '+57 300 123 4567',
  notificacionesPausadas: false,
  soloUrgentes: false,
  sonidosHabilitados: true,
  resumenDiario: true,
  horaResumen: '08:00',
  preferencias: [
    {
      tipo: 'Anuncio de Auditoría',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Recordatorio de Plazo',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Vencimiento Crítico',
      habilitado: true,
      canales: { sistema: true, email: true, sms: true },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Hallazgo Identificado',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Solicitud de Evidencia',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Diaria',
      horaEnvio: '09:00'
    },
    {
      tipo: 'Confirmación de Recepción',
      habilitado: true,
      canales: { sistema: true, email: false, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Aprobación de Plan',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Rechazo de Plan',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    },
    {
      tipo: 'Información General',
      habilitado: true,
      canales: { sistema: true, email: false, sms: false },
      frecuencia: 'Semanal'
    },
    {
      tipo: 'Alerta del Sistema',
      habilitado: true,
      canales: { sistema: true, email: true, sms: false },
      frecuencia: 'Inmediata'
    }
  ]
};

// ============ COMPONENTE PRINCIPAL ============

export function SistemaNotificaciones() {
  const [vistaActual, setVistaActual] = useState<'panel' | 'configuracion'>('panel');
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(MOCK_NOTIFICACIONES);
  const [configuracion, setConfiguracion] = useState<ConfiguracionUsuario>(MOCK_CONFIGURACION);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | EstadoNotificacion>('Todas');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoNotificacion>('Todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<'Todas' | PrioridadNotificacion>('Todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Modales
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<Notificacion | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);

  // Estadísticas
  const stats = {
    noLeidas: notificaciones.filter(n => n.estado === 'No Leída').length,
    criticas: notificaciones.filter(n => n.prioridad === 'Crítica' && n.estado !== 'Archivada').length,
    hoy: notificaciones.filter(n => n.fechaCreacion === '2025-05-10').length,
    total: notificaciones.length
  };

  // Marcar como leída
  const marcarComoLeida = (id: string) => {
    setNotificaciones(notificaciones.map(n =>
      n.id === id ? { ...n, estado: 'Leída' as EstadoNotificacion, fechaLectura: new Date().toISOString() } : n
    ));
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = () => {
    setNotificaciones(notificaciones.map(n =>
      n.estado === 'No Leída' ? { ...n, estado: 'Leída' as EstadoNotificacion, fechaLectura: new Date().toISOString() } : n
    ));
  };

  // Archivar
  const archivar = (id: string) => {
    setNotificaciones(notificaciones.map(n =>
      n.id === id ? { ...n, estado: 'Archivada' as EstadoNotificacion } : n
    ));
  };

  // Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtroEstado !== 'Todas' && n.estado !== filtroEstado) return false;
    if (filtroTipo !== 'Todos' && n.tipo !== filtroTipo) return false;
    if (filtroPrioridad !== 'Todas' && n.prioridad !== filtroPrioridad) return false;
    if (busqueda && !n.titulo.toLowerCase().includes(busqueda.toLowerCase()) && !n.mensaje.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Sistema de Notificaciones
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF014 - Centro de notificaciones y alertas automáticas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('panel')}
            variant={vistaActual === 'panel' ? 'default' : 'outline'}
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Panel
          </Button>
          <Button
            onClick={() => setVistaActual('configuracion')}
            variant={vistaActual === 'configuracion' ? 'default' : 'outline'}
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-xs text-gray-600">No Leídas</p>
          <p className="text-2xl font-black text-red-600">{stats.noLeidas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#DC2626' }}>
          <p className="text-xs text-gray-600">Críticas</p>
          <p className="text-2xl font-black text-red-700">{stats.criticas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Hoy</p>
          <p className="text-2xl font-black text-blue-600">{stats.hoy}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#6B7280' }}>
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </Card>
      </div>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'panel' && (
          <VistaPanelNotificaciones
            key="panel"
            notificaciones={notificacionesFiltradas}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            filtroTipo={filtroTipo}
            setFiltroTipo={setFiltroTipo}
            filtroPrioridad={filtroPrioridad}
            setFiltroPrioridad={setFiltroPrioridad}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            onMarcarLeida={marcarComoLeida}
            onMarcarTodasLeidas={marcarTodasComoLeidas}
            onArchivar={archivar}
            onVerDetalle={(not) => {
              setNotificacionSeleccionada(not);
              setModalDetalle(true);
            }}
          />
        )}

        {vistaActual === 'configuracion' && (
          <VistaConfiguracionNotificaciones
            key="configuracion"
            configuracion={configuracion}
            onGuardar={setConfiguracion}
          />
        )}
      </AnimatePresence>

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {modalDetalle && notificacionSeleccionada && (
          <ModalDetalleNotificacion
            notificacion={notificacionSeleccionada}
            onCerrar={() => setModalDetalle(false)}
            onMarcarLeida={() => {
              marcarComoLeida(notificacionSeleccionada.id);
              setModalDetalle(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: PANEL DE NOTIFICACIONES ============

function VistaPanelNotificaciones({
  notificaciones,
  filtroEstado,
  setFiltroEstado,
  filtroTipo,
  setFiltroTipo,
  filtroPrioridad,
  setFiltroPrioridad,
  busqueda,
  setBusqueda,
  onMarcarLeida,
  onMarcarTodasLeidas,
  onArchivar,
  onVerDetalle
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificaciones..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todos los estados</option>
              <option value="No Leída">No Leídas</option>
              <option value="Leída">Leídas</option>
              <option value="Archivada">Archivadas</option>
            </select>

            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Todas las prioridades</option>
              <option value="Crítica">Crítica</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Anuncio de Auditoría">Anuncio de Auditoría</option>
              <option value="Recordatorio de Plazo">Recordatorio de Plazo</option>
              <option value="Vencimiento Crítico">Vencimiento Crítico</option>
              <option value="Hallazgo Identificado">Hallazgo Identificado</option>
              <option value="Solicitud de Evidencia">Solicitud de Evidencia</option>
              <option value="Confirmación de Recepción">Confirmación de Recepción</option>
              <option value="Aprobación de Plan">Aprobación de Plan</option>
              <option value="Rechazo de Plan">Rechazo de Plan</option>
              <option value="Información General">Información General</option>
              <option value="Alerta del Sistema">Alerta del Sistema</option>
            </select>

            <Button onClick={onMarcarTodasLeidas} variant="outline" size="sm">
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como leídas
            </Button>
          </div>
        </div>
      </Card>

      {/* LISTA DE NOTIFICACIONES */}
      <div className="space-y-3">
        {notificaciones.map((notificacion: Notificacion) => (
          <TarjetaNotificacion
            key={notificacion.id}
            notificacion={notificacion}
            onMarcarLeida={onMarcarLeida}
            onArchivar={onArchivar}
            onVerDetalle={onVerDetalle}
          />
        ))}

        {notificaciones.length === 0 && (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay notificaciones que coincidan con los filtros</p>
          </Card>
        )}
      </div>
    </motion.div>
  );
}

// ============ COMPONENTE: TARJETA DE NOTIFICACIÓN ============

function TarjetaNotificacion({ notificacion, onMarcarLeida, onArchivar, onVerDetalle }: any) {
  const getIconoTipo = (tipo: TipoNotificacion) => {
    switch (tipo) {
      case 'Anuncio de Auditoría': return <ClipboardCheck className="w-5 h-5" />;
      case 'Recordatorio de Plazo': return <Clock className="w-5 h-5" />;
      case 'Vencimiento Crítico': return <AlertTriangle className="w-5 h-5" />;
      case 'Hallazgo Identificado': return <AlertCircle className="w-5 h-5" />;
      case 'Solicitud de Evidencia': return <FileText className="w-5 h-5" />;
      case 'Confirmación de Recepción': return <CheckCircle className="w-5 h-5" />;
      case 'Aprobación de Plan': return <CheckCircle className="w-5 h-5" />;
      case 'Rechazo de Plan': return <XCircle className="w-5 h-5" />;
      case 'Información General': return <Info className="w-5 h-5" />;
      case 'Alerta del Sistema': return <Bell className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColorPrioridad = (prioridad: PrioridadNotificacion) => {
    switch (prioridad) {
      case 'Crítica': return '#DC2626';
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getColorTipo = (tipo: TipoNotificacion) => {
    switch (tipo) {
      case 'Anuncio de Auditoría': return '#3B82F6';
      case 'Recordatorio de Plazo': return '#F59E0B';
      case 'Vencimiento Crítico': return '#DC2626';
      case 'Hallazgo Identificado': return '#EF4444';
      case 'Solicitud de Evidencia': return '#8B5CF6';
      case 'Confirmación de Recepción': return '#10B981';
      case 'Aprobación de Plan': return '#10B981';
      case 'Rechazo de Plan': return '#EF4444';
      case 'Información General': return '#6B7280';
      case 'Alerta del Sistema': return '#F97316';
      default: return '#6B7280';
    }
  };

  return (
    <Card
      className={`p-4 border-l-4 cursor-pointer transition-all hover:shadow-lg ${
        notificacion.estado === 'No Leída' ? 'bg-blue-50' : ''
      }`}
      style={{ borderLeftColor: getColorPrioridad(notificacion.prioridad) }}
      onClick={() => {
        if (notificacion.estado === 'No Leída') {
          onMarcarLeida(notificacion.id);
        }
        onVerDetalle(notificacion);
      }}
    >
      <div className="flex items-start gap-3">
        {/* Indicador de estado */}
        <div className="mt-1">
          {notificacion.estado === 'No Leída' && (
            <Dot className="w-6 h-6 text-blue-600 fill-blue-600" />
          )}
          {notificacion.estado === 'Leída' && (
            <Check className="w-5 h-5 text-gray-400" />
          )}
          {notificacion.estado === 'Archivada' && (
            <Archive className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Icono de tipo */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${getColorTipo(notificacion.tipo)}20`, color: getColorTipo(notificacion.tipo) }}
        >
          {getIconoTipo(notificacion.tipo)}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge style={{ background: getColorTipo(notificacion.tipo), color: '#FFF' }}>
                  {notificacion.tipo}
                </Badge>
                <Badge
                  variant="outline"
                  style={{ borderColor: getColorPrioridad(notificacion.prioridad), color: getColorPrioridad(notificacion.prioridad) }}
                >
                  {notificacion.prioridad}
                </Badge>
                {notificacion.fechaVencimiento && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Vence: {notificacion.fechaVencimiento}
                  </Badge>
                )}
              </div>
              <h3 className={`font-bold text-gray-900 mb-1 ${notificacion.estado === 'No Leída' ? 'font-black' : ''}`}>
                {notificacion.titulo}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {notificacion.mensaje}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {notificacion.fechaCreacion} {notificacion.horaCreacion}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {notificacion.destinatario}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {notificacion.origenModulo}
            </span>
          </div>

          {/* Canales */}
          <div className="flex items-center gap-2 mt-2">
            {notificacion.canales.includes('Sistema') && (
              <Badge variant="outline" className="text-xs">
                <Monitor className="w-3 h-3 mr-1" />
                Sistema
              </Badge>
            )}
            {notificacion.enviadoPorEmail && (
              <Badge variant="outline" className="text-xs">
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Badge>
            )}
            {notificacion.enviadoPorSMS && (
              <Badge variant="outline" className="text-xs">
                <Smartphone className="w-3 h-3 mr-1" />
                SMS
              </Badge>
            )}
          </div>

          {/* Acciones */}
          {notificacion.acciones && notificacion.acciones.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              {notificacion.acciones.map((accion: Accion) => (
                <Button
                  key={accion.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Acción:', accion.label);
                  }}
                  size="sm"
                  variant="outline"
                >
                  {accion.icon}
                  <span className="ml-2">{accion.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Acciones de la notificación */}
        <div className="flex flex-col gap-1">
          {notificacion.estado !== 'Archivada' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchivar(notificacion.id);
              }}
              className="p-1 rounded hover:bg-gray-100"
              title="Archivar"
            >
              <Archive className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============ VISTA: CONFIGURACIÓN (continúa en siguiente archivo) ============

function VistaConfiguracionNotificaciones({ configuracion, onGuardar }: any) {
  const [config, setConfig] = useState(configuracion);

  const togglePreferencia = (tipo: TipoNotificacion, campo: string, valor: any) => {
    setConfig({
      ...config,
      preferencias: config.preferencias.map((p: PreferenciaNotificacion) =>
        p.tipo === tipo ? { ...p, [campo]: valor } : p
      )
    });
  };

  const toggleCanal = (tipo: TipoNotificacion, canal: 'sistema' | 'email' | 'sms') => {
    setConfig({
      ...config,
      preferencias: config.preferencias.map((p: PreferenciaNotificacion) =>
        p.tipo === tipo ? { ...p, canales: { ...p.canales, [canal]: !p.canales[canal] } } : p
      )
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Configuración General */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Configuración General</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {config.notificacionesPausadas ? <BellOff className="w-5 h-5 text-gray-600" /> : <Bell className="w-5 h-5 text-blue-600" />}
              <div>
                <p className="font-bold text-gray-900">Pausar todas las notificaciones</p>
                <p className="text-sm text-gray-600">No recibirás ninguna notificación temporalmente</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.notificacionesPausadas}
                onChange={(e) => setConfig({ ...config, notificacionesPausadas: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-bold text-gray-900">Solo notificaciones urgentes</p>
                <p className="text-sm text-gray-600">Recibe únicamente notificaciones de prioridad Alta y Crítica</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.soloUrgentes}
                onChange={(e) => setConfig({ ...config, soloUrgentes: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {config.sonidosHabilitados ? <Volume2 className="w-5 h-5 text-green-600" /> : <VolumeX className="w-5 h-5 text-gray-600" />}
              <div>
                <p className="font-bold text-gray-900">Sonidos de notificación</p>
                <p className="text-sm text-gray-600">Reproducir sonido al recibir notificaciones</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.sonidosHabilitados}
                onChange={(e) => setConfig({ ...config, sonidosHabilitados: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-bold text-gray-900">Resumen diario por email</p>
                <p className="text-sm text-gray-600">Recibe un resumen de notificaciones una vez al día</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={config.horaResumen}
                onChange={(e) => setConfig({ ...config, horaResumen: e.target.value })}
                disabled={!config.resumenDiario}
                className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
              />
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.resumenDiario}
                  onChange={(e) => setConfig({ ...config, resumenDiario: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferencias por Tipo de Notificación */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Preferencias por Tipo de Notificación</h3>
        
        <div className="space-y-3">
          {config.preferencias.map((pref: PreferenciaNotificacion) => (
            <div key={pref.tipo} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 mb-1">{pref.tipo}</p>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.canales.sistema}
                        onChange={() => toggleCanal(pref.tipo, 'sistema')}
                        className="w-4 h-4"
                      />
                      <Monitor className="w-4 h-4 text-gray-600" />
                      Sistema
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.canales.email}
                        onChange={() => toggleCanal(pref.tipo, 'email')}
                        className="w-4 h-4"
                      />
                      <Mail className="w-4 h-4 text-gray-600" />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.canales.sms}
                        onChange={() => toggleCanal(pref.tipo, 'sms')}
                        className="w-4 h-4"
                      />
                      <Smartphone className="w-4 h-4 text-gray-600" />
                      SMS
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={pref.frecuencia}
                    onChange={(e) => togglePreferencia(pref.tipo, 'frecuencia', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="Inmediata">Inmediata</option>
                    <option value="Diaria">Diaria</option>
                    <option value="Semanal">Semanal</option>
                  </select>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.habilitado}
                      onChange={(e) => togglePreferencia(pref.tipo, 'habilitado', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button onClick={() => onGuardar(config)} style={{ background: '#10B981' }} className="flex-1">
          <Check className="w-4 h-4 mr-2" />
          Guardar Configuración
        </Button>
        <Button variant="outline" className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </motion.div>
  );
}

// ============ MODAL: DETALLE DE NOTIFICACIÓN ============

function ModalDetalleNotificacion({ notificacion, onCerrar, onMarcarLeida }: any) {
  return (
    <Modal titulo="Detalle de Notificación" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg" style={{ background: '#F3F4F6' }}>
          <div className="flex items-center gap-2 mb-2">
            <Badge style={{ background: '#3B82F6', color: '#FFF' }}>{notificacion.tipo}</Badge>
            <Badge variant="outline">{notificacion.prioridad}</Badge>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{notificacion.titulo}</h3>
          <p className="text-gray-700">{notificacion.mensaje}</p>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase mb-1">Origen</p>
            <p className="text-sm text-gray-900">{notificacion.origenModulo}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase mb-1">Creado por</p>
            <p className="text-sm text-gray-900">{notificacion.creadoPor}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase mb-1">Fecha y hora</p>
            <p className="text-sm text-gray-900">{notificacion.fechaCreacion} {notificacion.horaCreacion}</p>
          </div>
          {notificacion.fechaVencimiento && (
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase mb-1">Vencimiento</p>
              <p className="text-sm text-gray-900">{notificacion.fechaVencimiento}</p>
            </div>
          )}
        </div>

        {/* Datos adicionales */}
        {notificacion.datos && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-bold text-gray-900 uppercase mb-2">Información Adicional</p>
            <div className="text-sm text-gray-700 space-y-1">
              {Object.entries(notificacion.datos).map(([key, value]: any) => (
                <div key={key} className="flex justify-between">
                  <span className="font-bold">{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        {notificacion.acciones && notificacion.acciones.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {notificacion.acciones.map((accion: Accion) => (
              <Button key={accion.id} variant="outline">
                {accion.icon}
                <span className="ml-2">{accion.label}</span>
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          {notificacion.estado === 'No Leída' && (
            <Button onClick={onMarcarLeida} style={{ background: '#3B82F6' }} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Marcar como Leída
            </Button>
          )}
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cerrar
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
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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