/**
 * GESTIÓN DE ACTUACIONES PROCESALES - REQ-MOD01-003 (Implícito)
 * Sistema de registro y seguimiento de actuaciones procesales por expediente
 * Oficina Asesora Jurídica - ESAP
 * 
 * FUNCIONES:
 * 1. Registrar actuaciones procesales por expediente
 * 2. Clasificar por tipo (escrito, recurso, audiencia, prueba, etc.)
 * 3. Adjuntar documentos por actuación
 * 4. Timeline cronológico de actuaciones
 * 5. Integración con calendario de audiencias
 * 6. Generación automática de próximas acciones
 * 7. Auditoría completa de cada actuación
 */

import { useState, useEffect } from 'react';
import { 
  FileText,
  Calendar,
  Upload,
  Download,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Tag,
  Search,
  Filter,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Archive,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import {
  ButtonSIGL,
  CardSIGL,
  BadgeSIGL,
  InputSIGL,
  SelectSIGL,
  ModalSIGL,
  TableSIGL,
  AlertBanner,
  AvatarSIGL,
  useToast,
  ToastProvider,
  Column,
} from './design-system';

// ========== TIPOS ==========

type TipoActuacion = 
  | 'DEMANDA'
  | 'CONTESTACION'
  | 'RECURSO'
  | 'ESCRITO'
  | 'AUDIENCIA'
  | 'PRUEBA'
  | 'ALEGATOS'
  | 'SENTENCIA'
  | 'NOTIFICACION'
  | 'OTRO';

type EstadoActuacion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

interface DocumentoAdjunto {
  id: string;
  nombre: string;
  tipo: string; // pdf, docx, etc
  tamaño: number; // bytes
  fechaSubida: string;
  subidoPor: string;
  url: string;
}

interface ActuacionProcesal {
  id: string;
  expedienteId: string;
  expedienteNumero: string;
  tipo: TipoActuacion;
  titulo: string;
  descripcion: string;
  fechaActuacion: string;
  fechaRegistro: string;
  abogadoResponsable: {
    id: string;
    nombre: string;
    email: string;
  };
  estado: EstadoActuacion;
  documentosAdjuntos: DocumentoAdjunto[];
  observaciones: string;
  proximaAccion?: {
    descripcion: string;
    fechaLimite: string;
  };
  etiquetas: string[];
  esUrgente: boolean;
  notificadoContraparte: boolean;
}

interface ProximaAccion {
  id: string;
  actuacionId: string;
  expediente: string;
  descripcion: string;
  fechaLimite: string;
  responsable: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'VENCIDA';
}

// ========== DATA MOCK ==========

const ACTUACIONES_MOCK: ActuacionProcesal[] = [
  {
    id: '1',
    expedienteId: 'exp-1',
    expedienteNumero: 'PJ-2025-00001',
    tipo: 'DEMANDA',
    titulo: 'Presentación de Demanda',
    descripcion: 'Demanda de nulidad y restablecimiento del derecho contra acto administrativo que ordenó destitución del cargo',
    fechaActuacion: '2025-01-10',
    fechaRegistro: '2025-01-10 14:30:00',
    abogadoResponsable: {
      id: 'a1',
      nombre: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@esap.edu.co',
    },
    estado: 'COMPLETADA',
    documentosAdjuntos: [
      {
        id: 'd1',
        nombre: 'Demanda_PJ-2025-00001.pdf',
        tipo: 'pdf',
        tamaño: 2500000,
        fechaSubida: '2025-01-10 14:35:00',
        subidoPor: 'Dr. Carlos Mendoza',
        url: '#',
      },
      {
        id: 'd2',
        nombre: 'Poder_Representante.pdf',
        tipo: 'pdf',
        tamaño: 850000,
        fechaSubida: '2025-01-10 14:40:00',
        subidoPor: 'Dr. Carlos Mendoza',
        url: '#',
      },
    ],
    observaciones: 'Demanda presentada en término. Se adjuntó copia del acto administrativo cuestionado.',
    proximaAccion: {
      descripcion: 'Esperar auto admisorio del juzgado',
      fechaLimite: '2025-01-25',
    },
    etiquetas: ['Nulidad', 'Acto Administrativo', 'Destitución'],
    esUrgente: false,
    notificadoContraparte: true,
  },
  {
    id: '2',
    expedienteId: 'exp-2',
    expedienteNumero: 'PJ-2025-00002',
    tipo: 'CONTESTACION',
    titulo: 'Contestación de Demanda',
    descripcion: 'Respuesta a demanda laboral interpuesta por ex-funcionario por despido injustificado',
    fechaActuacion: '2025-01-15',
    fechaRegistro: '2025-01-15 09:20:00',
    abogadoResponsable: {
      id: 'a2',
      nombre: 'Dra. María Torres',
      email: 'maria.torres@esap.edu.co',
    },
    estado: 'COMPLETADA',
    documentosAdjuntos: [
      {
        id: 'd3',
        nombre: 'Contestacion_Demanda.pdf',
        tipo: 'pdf',
        tamaño: 1800000,
        fechaSubida: '2025-01-15 09:25:00',
        subidoPor: 'Dra. María Torres',
        url: '#',
      },
      {
        id: 'd4',
        nombre: 'Pruebas_Documentales.pdf',
        tipo: 'pdf',
        tamaño: 3200000,
        fechaSubida: '2025-01-15 09:30:00',
        subidoPor: 'Dra. María Torres',
        url: '#',
      },
    ],
    observaciones: 'Se presentó contestación dentro del término. Se adjuntaron 15 pruebas documentales.',
    proximaAccion: {
      descripcion: 'Preparar para audiencia de conciliación',
      fechaLimite: '2025-01-28',
    },
    etiquetas: ['Laboral', 'Despido', 'Contestación'],
    esUrgente: false,
    notificadoContraparte: false,
  },
  {
    id: '3',
    expedienteId: 'exp-3',
    expedienteNumero: 'PJ-2025-00003',
    tipo: 'RECURSO',
    titulo: 'Recurso de Apelación',
    descripcion: 'Recurso de apelación contra sentencia de primera instancia desfavorable',
    fechaActuacion: '2025-01-16',
    fechaRegistro: '2025-01-16 16:45:00',
    abogadoResponsable: {
      id: 'a3',
      nombre: 'Dr. Luis Ramírez',
      email: 'luis.ramirez@esap.edu.co',
    },
    estado: 'EN_PROCESO',
    documentosAdjuntos: [
      {
        id: 'd5',
        nombre: 'Recurso_Apelacion.docx',
        tipo: 'docx',
        tamaño: 450000,
        fechaSubida: '2025-01-16 16:50:00',
        subidoPor: 'Dr. Luis Ramírez',
        url: '#',
      },
    ],
    observaciones: 'Recurso en revisión por Jefe de Oficina Jurídica antes de presentación',
    proximaAccion: {
      descripcion: 'Presentar recurso ante el juzgado',
      fechaLimite: '2025-01-20',
    },
    etiquetas: ['Recurso', 'Apelación', 'Segunda Instancia'],
    esUrgente: true,
    notificadoContraparte: false,
  },
  {
    id: '4',
    expedienteId: 'exp-4',
    expedienteNumero: 'PJ-2025-00004',
    tipo: 'AUDIENCIA',
    titulo: 'Audiencia de Juzgamiento',
    descripcion: 'Audiencia de juzgamiento programada ante el Tribunal Administrativo',
    fechaActuacion: '2025-01-22',
    fechaRegistro: '2025-01-08 11:00:00',
    abogadoResponsable: {
      id: 'a4',
      nombre: 'Dra. Patricia González',
      email: 'patricia.gonzalez@esap.edu.co',
    },
    estado: 'PENDIENTE',
    documentosAdjuntos: [
      {
        id: 'd6',
        nombre: 'Citacion_Audiencia.pdf',
        tipo: 'pdf',
        tamaño: 320000,
        fechaSubida: '2025-01-08 11:05:00',
        subidoPor: 'Dra. Patricia González',
        url: '#',
      },
      {
        id: 'd7',
        nombre: 'Preparacion_Audiencia.docx',
        tipo: 'docx',
        tamaño: 580000,
        fechaSubida: '2025-01-15 15:20:00',
        subidoPor: 'Dra. Patricia González',
        url: '#',
      },
    ],
    observaciones: 'Audiencia programada para el 22 de enero a las 10:00 AM. Se requiere preparar alegatos finales.',
    proximaAccion: {
      descripcion: 'Asistir a audiencia de juzgamiento',
      fechaLimite: '2025-01-22',
    },
    etiquetas: ['Audiencia', 'Juzgamiento', 'Oral'],
    esUrgente: true,
    notificadoContraparte: false,
  },
  {
    id: '5',
    expedienteId: 'exp-1',
    expedienteNumero: 'PJ-2025-00001',
    tipo: 'NOTIFICACION',
    titulo: 'Notificación Auto Admisorio',
    descripcion: 'Notificación del auto admisorio de la demanda por parte del juzgado',
    fechaActuacion: '2025-01-17',
    fechaRegistro: '2025-01-17 10:15:00',
    abogadoResponsable: {
      id: 'a1',
      nombre: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@esap.edu.co',
    },
    estado: 'COMPLETADA',
    documentosAdjuntos: [
      {
        id: 'd8',
        nombre: 'Auto_Admisorio.pdf',
        tipo: 'pdf',
        tamaño: 680000,
        fechaSubida: '2025-01-17 10:20:00',
        subidoPor: 'Dr. Carlos Mendoza',
        url: '#',
      },
    ],
    observaciones: 'Auto admisorio recibido. Demanda admitida a trámite.',
    proximaAccion: {
      descripcion: 'Esperar contestación de la demandada',
      fechaLimite: '2025-02-07',
    },
    etiquetas: ['Notificación', 'Auto', 'Admisión'],
    esUrgente: false,
    notificadoContraparte: false,
  },
];

const PROXIMAS_ACCIONES_MOCK: ProximaAccion[] = [
  {
    id: 'pa1',
    actuacionId: '3',
    expediente: 'PJ-2025-00003',
    descripcion: 'Presentar recurso ante el juzgado',
    fechaLimite: '2025-01-20',
    responsable: 'Dr. Luis Ramírez',
    estado: 'PENDIENTE',
  },
  {
    id: 'pa2',
    actuacionId: '4',
    expediente: 'PJ-2025-00004',
    descripcion: 'Asistir a audiencia de juzgamiento',
    fechaLimite: '2025-01-22',
    responsable: 'Dra. Patricia González',
    estado: 'PENDIENTE',
  },
  {
    id: 'pa3',
    actuacionId: '1',
    expediente: 'PJ-2025-00001',
    descripcion: 'Esperar auto admisorio del juzgado',
    fechaLimite: '2025-01-25',
    responsable: 'Dr. Carlos Mendoza',
    estado: 'COMPLETADA',
  },
];

// ========== HELPERS ==========

const getTipoActuacionConfig = (tipo: TipoActuacion) => {
  const configs = {
    DEMANDA: { color: '#1F4788', icon: FileText, label: 'Demanda' },
    CONTESTACION: { color: '#6F42C1', icon: MessageSquare, label: 'Contestación' },
    RECURSO: { color: '#DC3545', icon: TrendingUp, label: 'Recurso' },
    ESCRITO: { color: '#17A2B8', icon: Edit3, label: 'Escrito' },
    AUDIENCIA: { color: '#FFC107', icon: Calendar, label: 'Audiencia' },
    PRUEBA: { color: '#28A745', icon: Archive, label: 'Prueba' },
    ALEGATOS: { color: '#E83E8C', icon: MessageSquare, label: 'Alegatos' },
    SENTENCIA: { color: '#6610F2', icon: CheckCircle, label: 'Sentencia' },
    NOTIFICACION: { color: '#FD7E14', icon: AlertCircle, label: 'Notificación' },
    OTRO: { color: '#6C757D', icon: FileText, label: 'Otro' },
  };
  return configs[tipo];
};

const getEstadoConfig = (estado: EstadoActuacion) => {
  const configs = {
    PENDIENTE: { variant: 'warning' as const, label: 'Pendiente' },
    EN_PROCESO: { variant: 'info' as const, label: 'En Proceso' },
    COMPLETADA: { variant: 'success' as const, label: 'Completada' },
    CANCELADA: { variant: 'danger' as const, label: 'Cancelada' },
  };
  return configs[estado];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ========== COMPONENTE PRINCIPAL ==========

function GestionActuacionesProcesalesContent() {
  const { showToast } = useToast();
  const [actuaciones, setActuaciones] = useState<ActuacionProcesal[]>(ACTUACIONES_MOCK);
  const [proximasAcciones, setProximasAcciones] = useState<ProximaAccion[]>(PROXIMAS_ACCIONES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroExpediente, setFiltroExpediente] = useState('');
  const [showModalNuevaActuacion, setShowModalNuevaActuacion] = useState(false);
  const [showModalDetalleActuacion, setShowModalDetalleActuacion] = useState(false);
  const [actuacionSeleccionada, setActuacionSeleccionada] = useState<ActuacionProcesal | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'timeline'>('tabla');

  // Filtrar actuaciones
  const actuacionesFiltradas = actuaciones.filter(act => {
    if (busqueda && !act.titulo.toLowerCase().includes(busqueda.toLowerCase()) && 
        !act.descripcion.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    if (filtroTipo && act.tipo !== filtroTipo) return false;
    if (filtroEstado && act.estado !== filtroEstado) return false;
    if (filtroExpediente && act.expedienteNumero !== filtroExpediente) return false;
    return true;
  });

  // Métricas
  const totalActuaciones = actuaciones.length;
  const actuacionesPendientes = actuaciones.filter(a => a.estado === 'PENDIENTE').length;
  const actuacionesUrgentes = actuaciones.filter(a => a.esUrgente).length;
  const proximasAccionesPendientes = proximasAcciones.filter(a => a.estado === 'PENDIENTE').length;

  // Expedientes únicos
  const expedientesUnicos = [...new Set(actuaciones.map(a => a.expedienteNumero))];

  // Handlers
  const handleVerDetalle = (actuacion: ActuacionProcesal) => {
    setActuacionSeleccionada(actuacion);
    setShowModalDetalleActuacion(true);
  };

  const handleNuevaActuacion = () => {
    setShowModalNuevaActuacion(true);
  };

  const handleGuardarNuevaActuacion = () => {
    showToast({
      variant: 'success',
      title: '✅ Actuación Registrada',
      message: 'La actuación procesal se ha registrado correctamente',
    });
    setShowModalNuevaActuacion(false);
  };

  const handleDescargarDocumento = (doc: DocumentoAdjunto) => {
    showToast({
      variant: 'info',
      title: '📥 Descargando',
      message: `Descargando ${doc.nombre}...`,
    });
  };

  // Columnas de tabla
  const columns: Column<ActuacionProcesal>[] = [
    {
      key: 'fechaActuacion',
      label: 'Fecha',
      width: '110px',
      sortable: true,
      render: (value) => (
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {new Date(value).toLocaleDateString('es-CO', { 
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'expedienteNumero',
      label: 'Expediente',
      width: '140px',
      sortable: true,
      render: (value) => (
        <span style={{ 
          fontFamily: 'monospace', 
          color: '#1F4788', 
          fontWeight: 600,
          fontSize: '13px'
        }}>
          {value}
        </span>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      width: '130px',
      sortable: true,
      render: (value) => {
        const config = getTipoActuacionConfig(value);
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} style={{ color: config.color }} />
            <span style={{ fontSize: '13px', color: config.color, fontWeight: 600 }}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'titulo',
      label: 'Título',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-900 text-sm">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {row.descripcion}
          </div>
        </div>
      ),
    },
    {
      key: 'abogadoResponsable',
      label: 'Responsable',
      width: '180px',
      render: (value) => (
        <div className="flex items-center gap-2">
          <AvatarSIGL name={value.nombre} size="sm" />
          <span className="text-sm">{value.nombre}</span>
        </div>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      width: '120px',
      align: 'center',
      sortable: true,
      render: (value) => {
        const config = getEstadoConfig(value);
        return <BadgeSIGL variant={config.variant}>{config.label}</BadgeSIGL>;
      },
    },
    {
      key: 'documentosAdjuntos',
      label: 'Docs',
      width: '80px',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center gap-1">
          <Paperclip size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">{value.length}</span>
        </div>
      ),
    },
    {
      key: 'esUrgente',
      label: 'Urgente',
      width: '80px',
      align: 'center',
      render: (value) => value ? (
        <AlertTriangle size={18} className="text-red-600" />
      ) : null,
    },
    {
      key: 'id',
      label: 'Acciones',
      width: '100px',
      align: 'center',
      render: (value, row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleVerDetalle(row)}
            className="p-1.5 rounded hover:bg-blue-50 transition-colors"
            title="Ver detalle"
          >
            <Eye size={16} className="text-blue-600" />
          </button>
          <button
            onClick={() => {
              showToast({
                variant: 'info',
                title: 'Editar',
                message: 'Función en desarrollo',
              });
            }}
            className="p-1.5 rounded hover:bg-green-50 transition-colors"
            title="Editar"
          >
            <Edit3 size={16} className="text-green-600" />
          </button>
        </div>
      ),
    },
  ];

  // Columnas próximas acciones
  const columnasProximasAcciones: Column<ProximaAccion>[] = [
    {
      key: 'expediente',
      label: 'Expediente',
      width: '140px',
      render: (value) => (
        <span style={{ fontFamily: 'monospace', color: '#1F4788', fontWeight: 600 }}>
          {value}
        </span>
      ),
    },
    {
      key: 'descripcion',
      label: 'Próxima Acción',
    },
    {
      key: 'fechaLimite',
      label: 'Fecha Límite',
      width: '140px',
      sortable: true,
      render: (value) => {
        const fecha = new Date(value);
        const hoy = new Date();
        const diferencia = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div>
            <div className="text-sm font-semibold" style={{ 
              color: diferencia <= 3 ? '#DC3545' : diferencia <= 7 ? '#FFC107' : '#28A745'
            }}>
              {fecha.toLocaleDateString('es-CO', { 
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-500">
              {diferencia > 0 ? `En ${diferencia} días` : diferencia === 0 ? 'Hoy' : 'Vencida'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'responsable',
      label: 'Responsable',
      width: '180px',
    },
    {
      key: 'estado',
      label: 'Estado',
      width: '120px',
      align: 'center',
      render: (value) => {
        const configs = {
          PENDIENTE: { variant: 'warning' as const, label: 'Pendiente' },
          COMPLETADA: { variant: 'success' as const, label: 'Completada' },
          VENCIDA: { variant: 'danger' as const, label: 'Vencida' },
        };
        const config = configs[value];
        return <BadgeSIGL variant={config.variant}>{config.label}</BadgeSIGL>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Gestión de Actuaciones Procesales
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                REQ-MOD01-003 - Registro y seguimiento de actuaciones por expediente
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ButtonSIGL
            variant="secondary"
            icon={<Filter size={16} />}
            onClick={() => {
              setBusqueda('');
              setFiltroTipo('');
              setFiltroEstado('');
              setFiltroExpediente('');
              showToast({
                variant: 'info',
                title: 'Filtros Limpiados',
                message: 'Se han eliminado todos los filtros',
              });
            }}
          >
            Limpiar Filtros
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleNuevaActuacion}
          >
            Nueva Actuación
          </ButtonSIGL>
        </div>
      </div>

      {/* Alertas */}
      {actuacionesUrgentes > 0 && (
        <AlertBanner
          variant="warning"
          title={`⚠️ ${actuacionesUrgentes} Actuación${actuacionesUrgentes > 1 ? 'es' : ''} Urgente${actuacionesUrgentes > 1 ? 's' : ''}`}
          message="Requieren atención prioritaria"
          dismissable
        />
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSIGL>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Actuaciones</p>
              <p className="text-3xl font-bold text-gray-900">{totalActuaciones}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600">{actuacionesPendientes}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Urgentes</p>
              <p className="text-3xl font-bold text-red-600">{actuacionesUrgentes}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </CardSIGL>

        <CardSIGL>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Próximas Acciones</p>
              <p className="text-3xl font-bold text-purple-600">{proximasAccionesPendientes}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
        </CardSIGL>
      </div>

      {/* Filtros y Búsqueda */}
      <CardSIGL>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar actuaciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <SelectSIGL
            label=""
            placeholder="Todos los tipos"
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'DEMANDA', label: 'Demanda' },
              { value: 'CONTESTACION', label: 'Contestación' },
              { value: 'RECURSO', label: 'Recurso' },
              { value: 'ESCRITO', label: 'Escrito' },
              { value: 'AUDIENCIA', label: 'Audiencia' },
              { value: 'PRUEBA', label: 'Prueba' },
              { value: 'SENTENCIA', label: 'Sentencia' },
              { value: 'NOTIFICACION', label: 'Notificación' },
            ]}
            value={filtroTipo}
            onChange={setFiltroTipo}
          />

          <SelectSIGL
            label=""
            placeholder="Todos los estados"
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'PENDIENTE', label: 'Pendiente' },
              { value: 'EN_PROCESO', label: 'En Proceso' },
              { value: 'COMPLETADA', label: 'Completada' },
              { value: 'CANCELADA', label: 'Cancelada' },
            ]}
            value={filtroEstado}
            onChange={setFiltroEstado}
          />

          <SelectSIGL
            label=""
            placeholder="Todos los expedientes"
            options={[
              { value: '', label: 'Todos los expedientes' },
              ...expedientesUnicos.map(exp => ({ value: exp, label: exp })),
            ]}
            value={filtroExpediente}
            onChange={setFiltroExpediente}
          />
        </div>
      </CardSIGL>

      {/* Tabs Vista */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setVistaActiva('tabla')}
          className={`px-4 py-2 font-semibold transition-colors ${
            vistaActiva === 'tabla'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vista Tabla
        </button>
        <button
          onClick={() => setVistaActiva('timeline')}
          className={`px-4 py-2 font-semibold transition-colors ${
            vistaActiva === 'timeline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vista Timeline
        </button>
      </div>

      {/* Tabla o Timeline */}
      {vistaActiva === 'tabla' ? (
        <CardSIGL>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Actuaciones Registradas ({actuacionesFiltradas.length})
            </h3>
          </div>
          <TableSIGL
            columns={columns}
            data={actuacionesFiltradas}
            sortable
            pagination
            pageSize={10}
            striped
            hoverable
          />
        </CardSIGL>
      ) : (
        <CardSIGL>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Timeline de Actuaciones
          </h3>
          <div className="space-y-4">
            {actuacionesFiltradas
              .sort((a, b) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime())
              .map((actuacion, index) => {
                const config = getTipoActuacionConfig(actuacion.tipo);
                const Icon = config.icon;
                
                return (
                  <div key={actuacion.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon size={20} style={{ color: config.color }} />
                      </div>
                      {index < actuacionesFiltradas.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 mt-2" style={{ minHeight: '40px' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                           onClick={() => handleVerDetalle(actuacion)}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{actuacion.titulo}</span>
                              {actuacion.esUrgente && <AlertTriangle size={16} className="text-red-600" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="font-mono text-blue-600">{actuacion.expedienteNumero}</span>
                              <span>•</span>
                              <span>{new Date(actuacion.fechaActuacion).toLocaleDateString('es-CO')}</span>
                              <span>•</span>
                              <span>{actuacion.abogadoResponsable.nombre}</span>
                            </div>
                          </div>
                          <BadgeSIGL variant={getEstadoConfig(actuacion.estado).variant}>
                            {getEstadoConfig(actuacion.estado).label}
                          </BadgeSIGL>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{actuacion.descripcion}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Paperclip size={14} />
                            <span>{actuacion.documentosAdjuntos.length} documento(s)</span>
                          </div>
                          {actuacion.etiquetas.map(etiqueta => (
                            <span key={etiqueta} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {etiqueta}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardSIGL>
      )}

      {/* Próximas Acciones */}
      <CardSIGL>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Próximas Acciones Programadas ({proximasAccionesPendientes} pendientes)
        </h3>
        <TableSIGL
          columns={columnasProximasAcciones}
          data={proximasAcciones}
          sortable
          striped
          hoverable
        />
      </CardSIGL>

      {/* Modal Nueva Actuación */}
      <ModalSIGL
        isOpen={showModalNuevaActuacion}
        onClose={() => setShowModalNuevaActuacion(false)}
        title="📝 Registrar Nueva Actuación Procesal"
        size="large"
      >
        <div className="space-y-4">
          <SelectSIGL
            label="Expediente"
            placeholder="Seleccione expediente"
            options={expedientesUnicos.map(exp => ({ value: exp, label: exp }))}
            required
          />

          <SelectSIGL
            label="Tipo de Actuación"
            placeholder="Seleccione tipo"
            options={[
              { value: 'DEMANDA', label: 'Demanda' },
              { value: 'CONTESTACION', label: 'Contestación' },
              { value: 'RECURSO', label: 'Recurso' },
              { value: 'ESCRITO', label: 'Escrito' },
              { value: 'AUDIENCIA', label: 'Audiencia' },
              { value: 'PRUEBA', label: 'Prueba' },
              { value: 'ALEGATOS', label: 'Alegatos' },
              { value: 'SENTENCIA', label: 'Sentencia' },
              { value: 'NOTIFICACION', label: 'Notificación' },
              { value: 'OTRO', label: 'Otro' },
            ]}
            required
          />

          <InputSIGL
            label="Título"
            placeholder="Título breve de la actuación"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Describa detalladamente la actuación procesal..."
            />
          </div>

          <InputSIGL
            label="Fecha de Actuación"
            type="date"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documentos Adjuntos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Haga clic o arrastre archivos aquí
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX, JPG - Máximo 10MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="urgente" className="w-5 h-5 text-blue-600 rounded" />
            <label htmlFor="urgente" className="text-sm text-gray-700">
              Marcar como urgente
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <ButtonSIGL variant="secondary" onClick={() => setShowModalNuevaActuacion(false)}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL variant="primary" onClick={handleGuardarNuevaActuacion}>
              Registrar Actuación
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>

      {/* Modal Detalle Actuación */}
      {actuacionSeleccionada && (
        <ModalSIGL
          isOpen={showModalDetalleActuacion}
          onClose={() => {
            setShowModalDetalleActuacion(false);
            setActuacionSeleccionada(null);
          }}
          title={`Detalle de Actuación - ${actuacionSeleccionada.expedienteNumero}`}
          size="large"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const config = getTipoActuacionConfig(actuacionSeleccionada.tipo);
                    const Icon = config.icon;
                    return (
                      <>
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon size={20} style={{ color: config.color }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {actuacionSeleccionada.titulo}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {config.label} • {new Date(actuacionSeleccionada.fechaActuacion).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {actuacionSeleccionada.esUrgente && (
                  <BadgeSIGL variant="danger">Urgente</BadgeSIGL>
                )}
                <BadgeSIGL variant={getEstadoConfig(actuacionSeleccionada.estado).variant}>
                  {getEstadoConfig(actuacionSeleccionada.estado).label}
                </BadgeSIGL>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h4>
              <p className="text-gray-900">{actuacionSeleccionada.descripcion}</p>
            </div>

            {/* Información */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Expediente</h4>
                <p className="font-mono text-blue-600 font-semibold">{actuacionSeleccionada.expedienteNumero}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</h4>
                <p className="text-gray-900">{new Date(actuacionSeleccionada.fechaRegistro).toLocaleString('es-CO')}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Abogado Responsable</h4>
                <div className="flex items-center gap-2">
                  <AvatarSIGL name={actuacionSeleccionada.abogadoResponsable.nombre} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{actuacionSeleccionada.abogadoResponsable.nombre}</p>
                    <p className="text-xs text-gray-500">{actuacionSeleccionada.abogadoResponsable.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Notificado Contraparte</h4>
                <p className="text-gray-900">
                  {actuacionSeleccionada.notificadoContraparte ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle size={16} /> Sí
                    </span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </p>
              </div>
            </div>

            {/* Etiquetas */}
            {actuacionSeleccionada.etiquetas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Etiquetas</h4>
                <div className="flex flex-wrap gap-2">
                  {actuacionSeleccionada.etiquetas.map(etiqueta => (
                    <span key={etiqueta} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {etiqueta}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Documentos Adjuntos ({actuacionSeleccionada.documentosAdjuntos.length})
              </h4>
              <div className="space-y-2">
                {actuacionSeleccionada.documentosAdjuntos.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Paperclip size={18} className="text-gray-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{doc.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.tamaño)} • {new Date(doc.fechaSubida).toLocaleDateString('es-CO')} • {doc.subidoPor}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDescargarDocumento(doc)}
                      className="p-2 rounded hover:bg-white transition-colors"
                      title="Descargar"
                    >
                      <Download size={18} className="text-blue-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Próxima Acción */}
            {actuacionSeleccionada.proximaAccion && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Próxima Acción Programada
                </h4>
                <p className="text-sm text-purple-800 mb-1">
                  {actuacionSeleccionada.proximaAccion.descripcion}
                </p>
                <p className="text-xs text-purple-600">
                  Fecha límite: {new Date(actuacionSeleccionada.proximaAccion.fechaLimite).toLocaleDateString('es-CO')}
                </p>
              </div>
            )}

            {/* Observaciones */}
            {actuacionSeleccionada.observaciones && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Observaciones</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {actuacionSeleccionada.observaciones}
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <ButtonSIGL
                variant="secondary"
                onClick={() => {
                  setShowModalDetalleActuacion(false);
                  setActuacionSeleccionada(null);
                }}
              >
                Cerrar
              </ButtonSIGL>
              <ButtonSIGL variant="primary" icon={<Edit3 size={16} />}>
                Editar Actuación
              </ButtonSIGL>
            </div>
          </div>
        </ModalSIGL>
      )}
    </div>
  );
}

// Export con ToastProvider
export function GestionActuacionesProcesales() {
  return (
    <ToastProvider maxToasts={3}>
      <GestionActuacionesProcesalesContent />
    </ToastProvider>
  );
}
