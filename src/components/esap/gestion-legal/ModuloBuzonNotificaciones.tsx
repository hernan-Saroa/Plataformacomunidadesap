/**
 * ============================================
 * MOD-06: BUZÓN DE NOTIFICACIONES JUDICIALES
 * ============================================
 * 
 * Gestión centralizada de notificaciones judiciales recibidas por ESAP
 * Control de términos procesales y vencimientos críticos
 * 
 * FUNCIONALIDADES:
 * - Registro de notificaciones recibidas (físicas, electrónicas, correo)
 * - Control automático de términos procesales
 * - Alertas de vencimientos próximos
 * - Asignación automática a módulos/abogados
 * - Trazabilidad completa
 * - Integración con MOD-01 (Defensa Judicial)
 * - Dashboard de control de términos
 * 
 * MEDIOS DE NOTIFICACIÓN:
 * - Correo certificado
 * - Notificación electrónica (SAMAI, sistemas judiciales)
 * - Notificación personal
 * - Edicto
 * - Aviso
 * - Conducta concluyente
 * 
 * Versión: 1.0.0
 * Prioridad: CRÍTICA
 */

import { useState } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Calendar,
  Eye,
  X,
  FileText,
  User,
  Building2,
  Bell,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Archive,
  Send,
  Smartphone,
  Printer,
  Globe,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoNotificacion = 'pendiente' | 'asignada' | 'en_tramite' | 'resuelta' | 'archivo';

type MedioNotificacion = 
  | 'correo_certificado'
  | 'electronica'
  | 'personal'
  | 'edicto'
  | 'aviso'
  | 'conducta_concluyente';

type TipoDocumento =
  | 'auto'
  | 'sentencia'
  | 'providencia'
  | 'resolucion'
  | 'citacion'
  | 'requerimiento'
  | 'oficio'
  | 'otros';

type NivelUrgencia = 'critica' | 'alta' | 'media' | 'baja';

interface NotificacionJudicial {
  id: string;
  numeroRadicado: string;
  fechaRecepcion: string;
  horaRecepcion: string;
  medioNotificacion: MedioNotificacion;
  procesoRelacionado: {
    numero: string;
    modulo: string;
    despacho: string;
    radicado: string;
  };
  documento: {
    tipo: TipoDocumento;
    asunto: string;
    fechaDocumento: string;
    numeroFolios: number;
    adjuntos: number;
  };
  terminos: {
    tieneTermino: boolean;
    diasTermino: number;
    fechaVencimiento: string;
    diasRestantes: number;
    urgencia: NivelUrgencia;
  };
  estado: EstadoNotificacion;
  asignacion: {
    abogado: string;
    fechaAsignacion: string;
    modulo: string;
  } | null;
  observaciones: string;
  historial: {
    fecha: string;
    accion: string;
    usuario: string;
  }[];
}

// ============================================
// DATOS MOCK
// ============================================

const NOTIFICACIONES_MOCK: NotificacionJudicial[] = [
  {
    id: '1',
    numeroRadicado: 'NOT-2024-001',
    fechaRecepcion: '2024-12-16',
    horaRecepcion: '14:30',
    medioNotificacion: 'electronica',
    procesoRelacionado: {
      numero: 'EXP-2024-145',
      modulo: 'MOD-01',
      despacho: 'Juzgado 30 Administrativo de Bogotá',
      radicado: '11001-33-33-030-2024-00145-00',
    },
    documento: {
      tipo: 'auto',
      asunto: 'Auto admisorio de demanda - Acción de nulidad y restablecimiento del derecho',
      fechaDocumento: '2024-12-15',
      numeroFolios: 8,
      adjuntos: 2,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 10,
      fechaVencimiento: '2024-12-26',
      diasRestantes: 10,
      urgencia: 'critica',
    },
    estado: 'pendiente',
    asignacion: null,
    observaciones: 'Requiere atención urgente - Término para contestar demanda',
    historial: [
      {
        fecha: '2024-12-16 14:30',
        accion: 'Notificación recibida por correo electrónico SAMAI',
        usuario: 'Sistema Automático',
      },
    ],
  },
  {
    id: '2',
    numeroRadicado: 'NOT-2024-002',
    fechaRecepcion: '2024-12-15',
    horaRecepcion: '09:15',
    medioNotificacion: 'correo_certificado',
    procesoRelacionado: {
      numero: 'EXP-2024-089',
      modulo: 'MOD-01',
      despacho: 'Tribunal Administrativo de Cundinamarca',
      radicado: '25000-23-33-000-2024-00089-01',
    },
    documento: {
      tipo: 'sentencia',
      asunto: 'Sentencia de primera instancia - Acción popular',
      fechaDocumento: '2024-12-10',
      numeroFolios: 45,
      adjuntos: 5,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 10,
      fechaVencimiento: '2024-12-25',
      diasRestantes: 9,
      urgencia: 'critica',
    },
    estado: 'asignada',
    asignacion: {
      abogado: 'Dra. María Fernanda López',
      fechaAsignacion: '2024-12-15',
      modulo: 'MOD-01',
    },
    observaciones: 'Sentencia desfavorable - Evaluar recurso de apelación',
    historial: [
      {
        fecha: '2024-12-15 10:00',
        accion: 'Asignado a Dra. María Fernanda López',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-15 09:15',
        accion: 'Notificación recibida por correo certificado',
        usuario: 'Recepción',
      },
    ],
  },
  {
    id: '3',
    numeroRadicado: 'NOT-2024-003',
    fechaRecepcion: '2024-12-14',
    horaRecepcion: '16:45',
    medioNotificacion: 'personal',
    procesoRelacionado: {
      numero: 'EXP-2024-234',
      modulo: 'MOD-02',
      despacho: 'Contraloría General de la República',
      radicado: 'CGR-2024-234-HAL',
    },
    documento: {
      tipo: 'requerimiento',
      asunto: 'Requerimiento ordinario - Proceso de responsabilidad fiscal',
      fechaDocumento: '2024-12-12',
      numeroFolios: 120,
      adjuntos: 15,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 20,
      fechaVencimiento: '2025-01-03',
      diasRestantes: 18,
      urgencia: 'alta',
    },
    estado: 'en_tramite',
    asignacion: {
      abogado: 'Dr. Carlos Andrés Martínez',
      fechaAsignacion: '2024-12-14',
      modulo: 'MOD-02',
    },
    observaciones: 'Proceso de responsabilidad fiscal - Requiere respuesta documentada',
    historial: [
      {
        fecha: '2024-12-15 09:00',
        accion: 'Inicio de elaboración de respuesta',
        usuario: 'Dr. Carlos Andrés Martínez',
      },
      {
        fecha: '2024-12-14 17:00',
        accion: 'Asignado a Dr. Carlos Andrés Martínez',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-14 16:45',
        accion: 'Notificación personal en oficina jurídica',
        usuario: 'Secretaría Jurídica',
      },
    ],
  },
  {
    id: '4',
    numeroRadicado: 'NOT-2024-004',
    fechaRecepcion: '2024-12-13',
    horaRecepcion: '11:20',
    medioNotificacion: 'electronica',
    procesoRelacionado: {
      numero: 'EXP-2024-456',
      modulo: 'MOD-03',
      despacho: 'Ministerio de Educación Nacional',
      radicado: 'MEN-2024-456-789',
    },
    documento: {
      tipo: 'oficio',
      asunto: 'Solicitud de concepto jurídico - Interpretación normativa',
      fechaDocumento: '2024-12-11',
      numeroFolios: 5,
      adjuntos: 1,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 15,
      fechaVencimiento: '2024-12-28',
      diasRestantes: 12,
      urgencia: 'media',
    },
    estado: 'en_tramite',
    asignacion: {
      abogado: 'Dr. Luis Fernando Vargas',
      fechaAsignacion: '2024-12-13',
      modulo: 'MOD-03',
    },
    observaciones: 'Concepto sobre aplicación de normas de educación superior',
    historial: [
      {
        fecha: '2024-12-14 10:00',
        accion: 'Revisión de normativa aplicable',
        usuario: 'Dr. Luis Fernando Vargas',
      },
      {
        fecha: '2024-12-13 12:00',
        accion: 'Asignado a Dr. Luis Fernando Vargas',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-13 11:20',
        accion: 'Notificación electrónica recibida',
        usuario: 'Sistema Automático',
      },
    ],
  },
  {
    id: '5',
    numeroRadicado: 'NOT-2024-005',
    fechaRecepcion: '2024-12-12',
    horaRecepcion: '15:00',
    medioNotificacion: 'correo_certificado',
    procesoRelacionado: {
      numero: 'EXP-2024-178',
      modulo: 'MOD-01',
      despacho: 'Juzgado 15 Civil del Circuito de Bogotá',
      radicado: '11001-31-03-015-2024-00178-00',
    },
    documento: {
      tipo: 'providencia',
      asunto: 'Providencia que ordena exhibición de documentos',
      fechaDocumento: '2024-12-08',
      numeroFolios: 3,
      adjuntos: 0,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 5,
      fechaVencimiento: '2024-12-17',
      diasRestantes: 1,
      urgencia: 'critica',
    },
    estado: 'en_tramite',
    asignacion: {
      abogado: 'Dra. Sandra Patricia Ruiz',
      fechaAsignacion: '2024-12-12',
      modulo: 'MOD-01',
    },
    observaciones: '¡URGENTE! Vence mañana - Exhibición de documentos contables',
    historial: [
      {
        fecha: '2024-12-16 08:00',
        accion: 'Preparación de documentos para exhibición',
        usuario: 'Dra. Sandra Patricia Ruiz',
      },
      {
        fecha: '2024-12-12 15:30',
        accion: 'Asignado a Dra. Sandra Patricia Ruiz',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-12 15:00',
        accion: 'Notificación recibida por correo certificado',
        usuario: 'Recepción',
      },
    ],
  },
  {
    id: '6',
    numeroRadicado: 'NOT-2024-006',
    fechaRecepcion: '2024-12-10',
    horaRecepcion: '10:30',
    medioNotificacion: 'electronica',
    procesoRelacionado: {
      numero: 'EXP-2024-567',
      modulo: 'MOD-04',
      despacho: 'Procuraduría General de la Nación',
      radicado: 'PGN-2024-567-IUS',
    },
    documento: {
      tipo: 'auto',
      asunto: 'Auto de apertura de investigación disciplinaria',
      fechaDocumento: '2024-12-09',
      numeroFolios: 25,
      adjuntos: 8,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 15,
      fechaVencimiento: '2024-12-25',
      diasRestantes: 9,
      urgencia: 'alta',
    },
    estado: 'resuelta',
    asignacion: {
      abogado: 'Dr. Jorge Enrique Mora',
      fechaAsignacion: '2024-12-10',
      modulo: 'MOD-04',
    },
    observaciones: 'Descargos presentados exitosamente el 2024-12-15',
    historial: [
      {
        fecha: '2024-12-15 16:00',
        accion: 'Descargos presentados ante Procuraduría',
        usuario: 'Dr. Jorge Enrique Mora',
      },
      {
        fecha: '2024-12-12 14:00',
        accion: 'Elaboración de descargos',
        usuario: 'Dr. Jorge Enrique Mora',
      },
      {
        fecha: '2024-12-10 11:00',
        accion: 'Asignado a Dr. Jorge Enrique Mora',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-10 10:30',
        accion: 'Notificación electrónica recibida',
        usuario: 'Sistema Automático',
      },
    ],
  },
  {
    id: '7',
    numeroRadicado: 'NOT-2024-007',
    fechaRecepcion: '2024-12-09',
    horaRecepcion: '08:45',
    medioNotificacion: 'edicto',
    procesoRelacionado: {
      numero: 'EXP-2024-890',
      modulo: 'MOD-01',
      despacho: 'Juzgado 12 Laboral del Circuito de Bogotá',
      radicado: '11001-31-05-012-2024-00890-00',
    },
    documento: {
      tipo: 'citacion',
      asunto: 'Citación a audiencia de conciliación',
      fechaDocumento: '2024-12-05',
      numeroFolios: 2,
      adjuntos: 1,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 30,
      fechaVencimiento: '2025-01-08',
      diasRestantes: 23,
      urgencia: 'media',
    },
    estado: 'asignada',
    asignacion: {
      abogado: 'Dra. María Fernanda López',
      fechaAsignacion: '2024-12-09',
      modulo: 'MOD-01',
    },
    observaciones: 'Audiencia de conciliación - Proceso laboral',
    historial: [
      {
        fecha: '2024-12-09 09:30',
        accion: 'Asignado a Dra. María Fernanda López',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-09 08:45',
        accion: 'Notificación por edicto publicado',
        usuario: 'Sistema Judicial',
      },
    ],
  },
  {
    id: '8',
    numeroRadicado: 'NOT-2024-008',
    fechaRecepcion: '2024-12-08',
    horaRecepcion: '13:15',
    medioNotificacion: 'personal',
    procesoRelacionado: {
      numero: 'EXP-2024-345',
      modulo: 'MOD-02',
      despacho: 'Procuraduría Provincial de Cundinamarca',
      radicado: 'PPC-2024-345-VIG',
    },
    documento: {
      tipo: 'resolucion',
      asunto: 'Resolución que impone sanción disciplinaria',
      fechaDocumento: '2024-12-06',
      numeroFolios: 67,
      adjuntos: 12,
    },
    terminos: {
      tieneTermino: true,
      diasTermino: 10,
      fechaVencimiento: '2024-12-18',
      diasRestantes: 2,
      urgencia: 'critica',
    },
    estado: 'en_tramite',
    asignacion: {
      abogado: 'Dr. Carlos Andrés Martínez',
      fechaAsignacion: '2024-12-08',
      modulo: 'MOD-02',
    },
    observaciones: 'URGENTE - Evaluar recurso de apelación',
    historial: [
      {
        fecha: '2024-12-16 11:00',
        accion: 'Recurso de apelación en elaboración',
        usuario: 'Dr. Carlos Andrés Martínez',
      },
      {
        fecha: '2024-12-08 14:00',
        accion: 'Asignado a Dr. Carlos Andrés Martínez',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-08 13:15',
        accion: 'Notificación personal en oficina jurídica',
        usuario: 'Secretaría Jurídica',
      },
    ],
  },
  {
    id: '9',
    numeroRadicado: 'NOT-2024-009',
    fechaRecepcion: '2024-12-05',
    horaRecepcion: '16:00',
    medioNotificacion: 'electronica',
    procesoRelacionado: {
      numero: 'EXP-2024-123',
      modulo: 'MOD-03',
      despacho: 'Secretaría General ESAP',
      radicado: 'SG-ESAP-2024-123',
    },
    documento: {
      tipo: 'oficio',
      asunto: 'Solicitud de revisión de contrato',
      fechaDocumento: '2024-12-04',
      numeroFolios: 12,
      adjuntos: 3,
    },
    terminos: {
      tieneTermino: false,
      diasTermino: 0,
      fechaVencimiento: '',
      diasRestantes: 0,
      urgencia: 'baja',
    },
    estado: 'resuelta',
    asignacion: {
      abogado: 'Dr. Luis Fernando Vargas',
      fechaAsignacion: '2024-12-05',
      modulo: 'MOD-03',
    },
    observaciones: 'Revisión completada - Concepto emitido',
    historial: [
      {
        fecha: '2024-12-07 15:00',
        accion: 'Concepto jurídico emitido y enviado',
        usuario: 'Dr. Luis Fernando Vargas',
      },
      {
        fecha: '2024-12-05 17:00',
        accion: 'Asignado a Dr. Luis Fernando Vargas',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-12-05 16:00',
        accion: 'Notificación electrónica recibida',
        usuario: 'Sistema Automático',
      },
    ],
  },
  {
    id: '10',
    numeroRadicado: 'NOT-2024-010',
    fechaRecepcion: '2024-11-28',
    horaRecepcion: '09:00',
    medioNotificacion: 'correo_certificado',
    procesoRelacionado: {
      numero: 'EXP-2024-678',
      modulo: 'MOD-01',
      despacho: 'Consejo de Estado - Sección Segunda',
      radicado: 'CE-2024-678-SEC2',
    },
    documento: {
      tipo: 'sentencia',
      asunto: 'Sentencia de segunda instancia',
      fechaDocumento: '2024-11-20',
      numeroFolios: 89,
      adjuntos: 20,
    },
    terminos: {
      tieneTermino: false,
      diasTermino: 0,
      fechaVencimiento: '',
      diasRestantes: 0,
      urgencia: 'baja',
    },
    estado: 'archivo',
    asignacion: {
      abogado: 'Dra. María Fernanda López',
      fechaAsignacion: '2024-11-28',
      modulo: 'MOD-01',
    },
    observaciones: 'Sentencia favorable - Proceso archivado',
    historial: [
      {
        fecha: '2024-12-01 10:00',
        accion: 'Proceso enviado a archivo',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-11-29 14:00',
        accion: 'Análisis de sentencia favorable',
        usuario: 'Dra. María Fernanda López',
      },
      {
        fecha: '2024-11-28 10:00',
        accion: 'Asignado a Dra. María Fernanda López',
        usuario: 'Coordinador Jurídico',
      },
      {
        fecha: '2024-11-28 09:00',
        accion: 'Notificación recibida por correo certificado',
        usuario: 'Recepción',
      },
    ],
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloBuzonNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<NotificacionJudicial[]>(NOTIFICACIONES_MOCK);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<NotificacionJudicial | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotificacion | 'todas'>('todas');
  const [filtroUrgencia, setFiltroUrgencia] = useState<NivelUrgencia | 'todas'>('todas');
  const [filtroMedio, setFiltroMedio] = useState<MedioNotificacion | 'todos'>('todos');

  // Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(n => {
    const cumpleBusqueda = busqueda === '' || 
      n.numeroRadicado.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.procesoRelacionado.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.documento.asunto.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todas' || n.estado === filtroEstado;
    const cumpleUrgencia = filtroUrgencia === 'todas' || n.terminos.urgencia === filtroUrgencia;
    const cumpleMedio = filtroMedio === 'todos' || n.medioNotificacion === filtroMedio;
    
    return cumpleBusqueda && cumpleEstado && cumpleUrgencia && cumpleMedio;
  });

  // Métricas
  const totalNotificaciones = notificaciones.length;
  const notificacionesPendientes = notificaciones.filter(n => n.estado === 'pendiente').length;
  const notificacionesCriticas = notificaciones.filter(n => 
    n.terminos.tieneTermino && n.terminos.diasRestantes <= 5 && n.estado !== 'resuelta' && n.estado !== 'archivo'
  ).length;
  const notificacionesVencidas = notificaciones.filter(n => 
    n.terminos.tieneTermino && n.terminos.diasRestantes < 0 && n.estado !== 'resuelta' && n.estado !== 'archivo'
  ).length;

  // Distribución por estado
  const porEstado = {
    pendiente: notificaciones.filter(n => n.estado === 'pendiente').length,
    asignada: notificaciones.filter(n => n.estado === 'asignada').length,
    en_tramite: notificaciones.filter(n => n.estado === 'en_tramite').length,
    resuelta: notificaciones.filter(n => n.estado === 'resuelta').length,
    archivo: notificaciones.filter(n => n.estado === 'archivo').length,
  };

  const getEstadoColor = (estado: EstadoNotificacion) => {
    switch (estado) {
      case 'pendiente': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Pendiente' };
      case 'asignada': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Asignada' };
      case 'en_tramite': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Trámite' };
      case 'resuelta': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Resuelta' };
      case 'archivo': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archivo' };
    }
  };

  const getUrgenciaColor = (urgencia: NivelUrgencia) => {
    switch (urgencia) {
      case 'critica': return { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴', label: 'CRÍTICA' };
      case 'alta': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🟠', label: 'ALTA' };
      case 'media': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡', label: 'MEDIA' };
      case 'baja': return { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢', label: 'BAJA' };
    }
  };

  const getMedioIcon = (medio: MedioNotificacion) => {
    switch (medio) {
      case 'correo_certificado': return <Mail className="w-4 h-4" />;
      case 'electronica': return <Smartphone className="w-4 h-4" />;
      case 'personal': return <User className="w-4 h-4" />;
      case 'edicto': return <Printer className="w-4 h-4" />;
      case 'aviso': return <Bell className="w-4 h-4" />;
      case 'conducta_concluyente': return <FileText className="w-4 h-4" />;
    }
  };

  const getMedioLabel = (medio: MedioNotificacion) => {
    switch (medio) {
      case 'correo_certificado': return 'Correo Certificado';
      case 'electronica': return 'Electrónica';
      case 'personal': return 'Personal';
      case 'edicto': return 'Edicto';
      case 'aviso': return 'Aviso';
      case 'conducta_concluyente': return 'Conducta Concluyente';
    }
  };

  const getTipoDocumentoLabel = (tipo: TipoDocumento) => {
    switch (tipo) {
      case 'auto': return 'Auto';
      case 'sentencia': return 'Sentencia';
      case 'providencia': return 'Providencia';
      case 'resolucion': return 'Resolución';
      case 'citacion': return 'Citación';
      case 'requerimiento': return 'Requerimiento';
      case 'oficio': return 'Oficio';
      case 'otros': return 'Otros';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Inbox className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-06: Buzón de Notificaciones Judiciales
          </h1>
          <p className="text-gray-600 mt-1">
            Control centralizado de notificaciones y términos procesales
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Inbox className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{totalNotificaciones}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Notificaciones</p>
          <p className="text-xs text-gray-500 mt-1">{notificacionesPendientes} pendientes</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{notificacionesCriticas}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Alertas Críticas</p>
          <p className="text-xs text-gray-500 mt-1">Vencen en 5 días o menos</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-black text-orange-600">{notificacionesVencidas}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Términos Vencidos</p>
          <p className="text-xs text-gray-500 mt-1">Requieren atención urgente</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{porEstado.resuelta}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Resueltas</p>
          <p className="text-xs text-gray-500 mt-1">
            {((porEstado.resuelta / totalNotificaciones) * 100).toFixed(1)}% efectividad
          </p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEstado.pendiente}</div>
            <div className="text-xs text-gray-600">Pendiente</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <Send className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{porEstado.asignada}</div>
            <div className="text-xs text-gray-600">Asignada</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{porEstado.en_tramite}</div>
            <div className="text-xs text-gray-600">En Trámite</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{porEstado.resuelta}</div>
            <div className="text-xs text-gray-600">Resuelta</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Archive className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{porEstado.archivo}</div>
            <div className="text-xs text-gray-600">Archivo</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Radicado, proceso..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="todas">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="asignada">Asignada</option>
              <option value="en_tramite">En Trámite</option>
              <option value="resuelta">Resuelta</option>
              <option value="archivo">Archivo</option>
            </select>
          </div>

          {/* Filtro por Urgencia */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Urgencia
            </label>
            <select
              value={filtroUrgencia}
              onChange={(e) => setFiltroUrgencia(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="todas">Todas las urgencias</option>
              <option value="critica">🔴 Crítica</option>
              <option value="alta">🟠 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
          </div>

          {/* Filtro por Medio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Medio
            </label>
            <select
              value={filtroMedio}
              onChange={(e) => setFiltroMedio(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="todos">Todos los medios</option>
              <option value="electronica">Electrónica</option>
              <option value="correo_certificado">Correo Certificado</option>
              <option value="personal">Personal</option>
              <option value="edicto">Edicto</option>
              <option value="aviso">Aviso</option>
              <option value="conducta_concluyente">Conducta Concluyente</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm">
            + Registrar Notificación
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('todas');
              setFiltroUrgencia('todas');
              setFiltroMedio('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{notificacionesFiltradas.length}</strong> de <strong>{totalNotificaciones}</strong> notificaciones
          </div>
        </div>
      </div>

      {/* TABLA DE NOTIFICACIONES */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Radicado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Proceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Medio
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Término
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Asignado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notificacionesFiltradas.map((notificacion) => {
                const estadoColor = getEstadoColor(notificacion.estado);
                const urgenciaColor = notificacion.terminos.tieneTermino 
                  ? getUrgenciaColor(notificacion.terminos.urgencia)
                  : null;
                
                return (
                  <tr key={notificacion.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{notificacion.numeroRadicado}</div>
                      <div className="text-xs text-gray-500">
                        {notificacion.fechaRecepcion} {notificacion.horaRecepcion}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{notificacion.procesoRelacionado.numero}</div>
                      <div className="text-xs text-gray-500">{notificacion.procesoRelacionado.modulo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {getTipoDocumentoLabel(notificacion.documento.tipo)}
                      </div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {notificacion.documento.asunto}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getMedioIcon(notificacion.medioNotificacion)}
                        <span className="text-sm text-gray-700">
                          {getMedioLabel(notificacion.medioNotificacion)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notificacion.terminos.tieneTermino ? (
                        <div>
                          <div className={`px-2 py-1 ${urgenciaColor?.bg} ${urgenciaColor?.text} text-xs font-bold rounded mb-1 inline-block`}>
                            {urgenciaColor?.icon} {notificacion.terminos.diasRestantes} días
                          </div>
                          <div className="text-xs text-gray-500">
                            Vence: {notificacion.terminos.fechaVencimiento}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin término</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 ${estadoColor.bg} ${estadoColor.text} text-xs font-bold rounded-full`}>
                        {estadoColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {notificacion.asignacion ? (
                        <div className="text-sm text-gray-900">{notificacion.asignacion.abogado}</div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setNotificacionSeleccionada(notificacion);
                          setMostrarModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {notificacionesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron notificaciones</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && notificacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{notificacionSeleccionada.numeroRadicado}</h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    Recibida: {notificacionSeleccionada.fechaRecepcion} a las {notificacionSeleccionada.horaRecepcion}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Alerta de Urgencia */}
              {notificacionSeleccionada.terminos.tieneTermino && notificacionSeleccionada.terminos.diasRestantes <= 5 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900">⚠️ ALERTA CRÍTICA - TÉRMINO PRÓXIMO A VENCER</p>
                      <p className="text-sm text-red-700 mt-1">
                        Quedan solo {notificacionSeleccionada.terminos.diasRestantes} días para responder. Vence el {notificacionSeleccionada.terminos.fechaVencimiento}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información del Proceso */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Proceso Relacionado
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Número de Proceso</p>
                    <p className="font-semibold text-gray-900">{notificacionSeleccionada.procesoRelacionado.numero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Módulo</p>
                    <p className="font-semibold text-gray-900">{notificacionSeleccionada.procesoRelacionado.modulo}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Despacho Judicial</p>
                    <p className="font-semibold text-gray-900">{notificacionSeleccionada.procesoRelacionado.despacho}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Radicado</p>
                    <p className="font-semibold text-gray-900">{notificacionSeleccionada.procesoRelacionado.radicado}</p>
                  </div>
                </div>
              </div>

              {/* Información del Documento */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Documento Notificado
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tipo de Documento</p>
                      <p className="font-semibold text-gray-900">
                        {getTipoDocumentoLabel(notificacionSeleccionada.documento.tipo)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha del Documento</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.documento.fechaDocumento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Número de Folios</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.documento.numeroFolios}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Anexos</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.documento.adjuntos}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Asunto</p>
                    <p className="font-semibold text-gray-900">{notificacionSeleccionada.documento.asunto}</p>
                  </div>
                </div>
              </div>

              {/* Información de Términos */}
              {notificacionSeleccionada.terminos.tieneTermino && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Control de Términos
                  </h3>
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Término Legal</p>
                        <p className="text-2xl font-bold text-gray-900">{notificacionSeleccionada.terminos.diasTermino}</p>
                        <p className="text-xs text-gray-500">días</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                        <p className="text-2xl font-bold text-orange-600">{notificacionSeleccionada.terminos.diasRestantes}</p>
                        <p className="text-xs text-gray-500">días</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Fecha de Vencimiento</p>
                        <p className="text-lg font-bold text-red-600">{notificacionSeleccionada.terminos.fechaVencimiento}</p>
                        <p className="text-xs text-gray-500">
                          {getUrgenciaColor(notificacionSeleccionada.terminos.urgencia).icon}{' '}
                          {getUrgenciaColor(notificacionSeleccionada.terminos.urgencia).label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Asignación */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Asignación
                </h3>
                {notificacionSeleccionada.asignacion ? (
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Abogado Responsable</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.asignacion.abogado}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Módulo</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.asignacion.modulo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha Asignación</p>
                      <p className="font-semibold text-gray-900">{notificacionSeleccionada.asignacion.fechaAsignacion}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 font-semibold">⚠️ Notificación sin asignar</p>
                    <p className="text-sm text-yellow-600 mt-1">Requiere asignación urgente</p>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              {notificacionSeleccionada.observaciones && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">📝 Observaciones</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-900">{notificacionSeleccionada.observaciones}</p>
                  </div>
                </div>
              )}

              {/* Historial */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Historial de Actuaciones
                </h3>
                <div className="space-y-3">
                  {notificacionSeleccionada.historial.map((evento, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-32 text-right">
                        <span className="text-xs font-semibold text-gray-500">{evento.fecha}</span>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold text-gray-900">{evento.accion}</p>
                        <p className="text-sm text-gray-600">{evento.usuario}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              {notificacionSeleccionada.estado === 'pendiente' && (
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                  Asignar Abogado
                </button>
              )}
              {notificacionSeleccionada.estado !== 'resuelta' && notificacionSeleccionada.estado !== 'archivo' && (
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                  Registrar Actuación
                </button>
              )}
              <button className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
                Ver Expediente Digital
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
