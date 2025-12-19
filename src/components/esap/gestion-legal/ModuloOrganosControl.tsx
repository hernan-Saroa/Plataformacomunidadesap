/**
 * MÓDULO DE ÓRGANOS DE CONTROL - REQ-MOD02-001
 * Sistema de gestión de requerimientos de órganos de control
 * Oficina Asesora Jurídica - ESAP
 * 
 * ÓRGANOS DE CONTROL:
 * - Contraloría General de la República
 * - Procuraduría General de la Nación
 * - Defensoría del Pueblo
 * - DANE (Estadísticas)
 * - Archivo General de la Nación
 * - Otros organismos de control
 * 
 * FUNCIONES:
 * 1. Registrar requerimientos recibidos
 * 2. Calcular plazos automáticos por órgano
 * 3. Preparar y aprobar respuestas
 * 4. Enviar respuestas oficiales
 * 5. Seguimiento post-envío
 * 6. Sistema de alertas automáticas (VERDE/AMARILLO/ROJO/VENCIDO)
 * 7. Auditoría completa
 */

import { useState, useEffect } from 'react';
import { 
  Shield,
  FileText,
  Upload,
  Download,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  User,
  Calendar,
  Send,
  MessageSquare,
  Paperclip,
  Search,
  Filter,
  TrendingUp,
  Building2,
  Mail,
  FileCheck,
  ArrowRight,
  History,
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

type OrganoControl = 
  | 'CONTRALORIA'
  | 'PROCURADURIA'
  | 'DEFENSORIA'
  | 'DANE'
  | 'ARCHIVO_GENERAL'
  | 'SUPERINTENDENCIA'
  | 'OTRO';

type TipoRequerimiento = 'INFORMACION' | 'AJUSTE';

type EstadoRequerimiento = 
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RESUELTA'
  | 'VENCIDA';

type NivelAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface OrganoControlInfo {
  id: OrganoControl;
  nombre: string;
  nombreCompleto: string;
  plazoEstandar: number; // días hábiles
  plazoAjuste: number; // días hábiles para requerimientos de ajuste
  color: string;
  icon: any;
  contacto: string;
  email: string;
}

interface DocumentoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaSubida: string;
  subidoPor: string;
  url: string;
  categoria: 'REQUERIMIENTO' | 'RESPUESTA' | 'SOPORTE';
}

interface Requerimiento {
  id: string;
  numero: string; // OC-YYYY-NNNNN
  organo: OrganoControl;
  tipo: TipoRequerimiento;
  asunto: string;
  descripcion: string;
  fechaRecepcion: string;
  fechaVencimiento: string;
  plazoTotal: number; // días hábiles
  diasTranscurridos: number;
  diasRestantes: number;
  porcentajeRestante: number;
  nivelAlerta: NivelAlerta;
  estado: EstadoRequerimiento;
  abogadoAsignado: {
    id: string;
    nombre: string;
    email: string;
  };
  documentosRequerimiento: DocumentoAdjunto[];
  respuestaDraft?: string;
  documentosRespuesta: DocumentoAdjunto[];
  fechaEnvio?: string;
  comentariosRevision?: string;
  revisadoPor?: {
    id: string;
    nombre: string;
    fecha: string;
  };
  fechaCierre?: string;
  observacionesCierre?: string;
  historialEstados: Array<{
    estado: EstadoRequerimiento;
    fecha: string;
    usuario: string;
    comentario?: string;
  }>;
}

// ========== CONFIGURACIÓN ÓRGANOS ==========

const ORGANOS_CONTROL: Record<OrganoControl, OrganoControlInfo> = {
  CONTRALORIA: {
    id: 'CONTRALORIA',
    nombre: 'Contraloría',
    nombreCompleto: 'Contraloría General de la República',
    plazoEstandar: 30,
    plazoAjuste: 10,
    color: '#DC3545',
    icon: Shield,
    contacto: 'Contraloría General',
    email: 'contraloria@contraloria.gov.co',
  },
  PROCURADURIA: {
    id: 'PROCURADURIA',
    nombre: 'Procuraduría',
    nombreCompleto: 'Procuraduría General de la Nación',
    plazoEstandar: 20,
    plazoAjuste: 8,
    color: '#6610F2',
    icon: Shield,
    contacto: 'Procuraduría General',
    email: 'procuraduria@procuraduria.gov.co',
  },
  DEFENSORIA: {
    id: 'DEFENSORIA',
    nombre: 'Defensoría',
    nombreCompleto: 'Defensoría del Pueblo',
    plazoEstandar: 15,
    plazoAjuste: 7,
    color: '#28A745',
    icon: Shield,
    contacto: 'Defensoría del Pueblo',
    email: 'defensoria@defensoria.gov.co',
  },
  DANE: {
    id: 'DANE',
    nombre: 'DANE',
    nombreCompleto: 'Departamento Administrativo Nacional de Estadística',
    plazoEstandar: 30,
    plazoAjuste: 10,
    color: '#17A2B8',
    icon: Building2,
    contacto: 'DANE',
    email: 'contacto@dane.gov.co',
  },
  ARCHIVO_GENERAL: {
    id: 'ARCHIVO_GENERAL',
    nombre: 'Archivo General',
    nombreCompleto: 'Archivo General de la Nación',
    plazoEstandar: 30,
    plazoAjuste: 10,
    color: '#FD7E14',
    icon: Building2,
    contacto: 'Archivo General',
    email: 'contacto@archivogeneral.gov.co',
  },
  SUPERINTENDENCIA: {
    id: 'SUPERINTENDENCIA',
    nombre: 'Superintendencia',
    nombreCompleto: 'Superintendencia de Educación Superior',
    plazoEstandar: 30,
    plazoAjuste: 10,
    color: '#E83E8C',
    icon: Building2,
    contacto: 'Superintendencia',
    email: 'contacto@mineducacion.gov.co',
  },
  OTRO: {
    id: 'OTRO',
    nombre: 'Otro',
    nombreCompleto: 'Otro Organismo de Control',
    plazoEstandar: 30,
    plazoAjuste: 10,
    color: '#6C757D',
    icon: Building2,
    contacto: 'Por definir',
    email: '',
  },
};

// ========== DATA MOCK ==========

const REQUERIMIENTOS_MOCK: Requerimiento[] = [
  {
    id: '1',
    numero: 'OC-2025-00001',
    organo: 'CONTRALORIA',
    tipo: 'INFORMACION',
    asunto: 'Solicitud de información sobre contratación 2024',
    descripcion: 'La Contraloría General solicita información detallada sobre todos los procesos de contratación del año 2024, incluyendo contratos, órdenes de servicio y adiciones.',
    fechaRecepcion: '2025-01-10',
    fechaVencimiento: '2025-02-18',
    plazoTotal: 30,
    diasTranscurridos: 7,
    diasRestantes: 23,
    porcentajeRestante: 76.7,
    nivelAlerta: 'VERDE',
    estado: 'EN_PREPARACION',
    abogadoAsignado: {
      id: 'a1',
      nombre: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@esap.edu.co',
    },
    documentosRequerimiento: [
      {
        id: 'd1',
        nombre: 'Oficio_Contraloria_2025-001.pdf',
        tipo: 'pdf',
        tamaño: 1200000,
        fechaSubida: '2025-01-10 09:30:00',
        subidoPor: 'Asistente Administrativa',
        url: '#',
        categoria: 'REQUERIMIENTO',
      },
    ],
    respuestaDraft: 'En atención a su oficio radicado...',
    documentosRespuesta: [
      {
        id: 'd2',
        nombre: 'Respuesta_Contratacion_2024.xlsx',
        tipo: 'xlsx',
        tamaño: 3500000,
        fechaSubida: '2025-01-15 14:20:00',
        subidoPor: 'Dr. Carlos Mendoza',
        url: '#',
        categoria: 'RESPUESTA',
      },
    ],
    historialEstados: [
      {
        estado: 'RECIBIDO',
        fecha: '2025-01-10 09:30:00',
        usuario: 'Sistema',
        comentario: 'Requerimiento recibido y registrado',
      },
      {
        estado: 'EN_PREPARACION',
        fecha: '2025-01-10 10:00:00',
        usuario: 'Dr. Carlos Mendoza',
        comentario: 'Iniciando preparación de respuesta',
      },
    ],
  },
  {
    id: '2',
    numero: 'OC-2025-00002',
    organo: 'PROCURADURIA',
    tipo: 'AJUSTE',
    asunto: 'Ajuste a información de nómina previamente enviada',
    descripcion: 'La Procuraduría requiere ajustar la información de nómina enviada anteriormente, corrigiendo datos de algunos funcionarios.',
    fechaRecepcion: '2025-01-14',
    fechaVencimiento: '2025-01-24',
    plazoTotal: 8,
    diasTranscurridos: 3,
    diasRestantes: 5,
    porcentajeRestante: 62.5,
    nivelAlerta: 'AMARILLO',
    estado: 'EN_REVISION',
    abogadoAsignado: {
      id: 'a2',
      nombre: 'Dra. María Torres',
      email: 'maria.torres@esap.edu.co',
    },
    documentosRequerimiento: [
      {
        id: 'd3',
        nombre: 'Oficio_Procuraduria_Ajuste.pdf',
        tipo: 'pdf',
        tamaño: 850000,
        fechaSubida: '2025-01-14 11:00:00',
        subidoPor: 'Asistente Administrativa',
        url: '#',
        categoria: 'REQUERIMIENTO',
      },
    ],
    respuestaDraft: 'Respetado señor Procurador, en atención a su solicitud de ajuste...',
    documentosRespuesta: [
      {
        id: 'd4',
        nombre: 'Nomina_Corregida_Enero_2025.xlsx',
        tipo: 'xlsx',
        tamaño: 2100000,
        fechaSubida: '2025-01-16 16:30:00',
        subidoPor: 'Dra. María Torres',
        url: '#',
        categoria: 'RESPUESTA',
      },
    ],
    comentariosRevision: 'Revisar que todos los datos de nómina estén completos antes de enviar',
    revisadoPor: {
      id: 'j1',
      nombre: 'Jefe OJ',
      fecha: '2025-01-17 09:00:00',
    },
    historialEstados: [
      {
        estado: 'RECIBIDO',
        fecha: '2025-01-14 11:00:00',
        usuario: 'Sistema',
      },
      {
        estado: 'EN_PREPARACION',
        fecha: '2025-01-14 14:00:00',
        usuario: 'Dra. María Torres',
      },
      {
        estado: 'EN_REVISION',
        fecha: '2025-01-17 09:00:00',
        usuario: 'Jefe OJ',
        comentario: 'En revisión antes de aprobación',
      },
    ],
  },
  {
    id: '3',
    numero: 'OC-2025-00003',
    organo: 'DEFENSORIA',
    tipo: 'INFORMACION',
    asunto: 'Información sobre quejas y reclamos de estudiantes',
    descripcion: 'La Defensoría del Pueblo solicita información sobre el tratamiento de quejas y reclamos de estudiantes durante el año 2024.',
    fechaRecepcion: '2025-01-05',
    fechaVencimiento: '2025-01-23',
    plazoTotal: 15,
    diasTranscurridos: 12,
    diasRestantes: 3,
    porcentajeRestante: 20,
    nivelAlerta: 'ROJO',
    estado: 'APROBADA',
    abogadoAsignado: {
      id: 'a3',
      nombre: 'Dr. Luis Ramírez',
      email: 'luis.ramirez@esap.edu.co',
    },
    documentosRequerimiento: [
      {
        id: 'd5',
        nombre: 'Solicitud_Defensoria.pdf',
        tipo: 'pdf',
        tamaño: 950000,
        fechaSubida: '2025-01-05 08:00:00',
        subidoPor: 'Asistente Administrativa',
        url: '#',
        categoria: 'REQUERIMIENTO',
      },
    ],
    respuestaDraft: 'Respetada Defensora del Pueblo, adjunto encontrará la información solicitada...',
    documentosRespuesta: [
      {
        id: 'd6',
        nombre: 'Informe_Quejas_Reclamos_2024.pdf',
        tipo: 'pdf',
        tamaño: 4200000,
        fechaSubida: '2025-01-16 10:00:00',
        subidoPor: 'Dr. Luis Ramírez',
        url: '#',
        categoria: 'RESPUESTA',
      },
      {
        id: 'd7',
        nombre: 'Anexo_Estadisticas.xlsx',
        tipo: 'xlsx',
        tamaño: 1800000,
        fechaSubida: '2025-01-16 10:05:00',
        subidoPor: 'Dr. Luis Ramírez',
        url: '#',
        categoria: 'RESPUESTA',
      },
    ],
    revisadoPor: {
      id: 'j1',
      nombre: 'Jefe OJ',
      fecha: '2025-01-17 08:00:00',
    },
    historialEstados: [
      {
        estado: 'RECIBIDO',
        fecha: '2025-01-05 08:00:00',
        usuario: 'Sistema',
      },
      {
        estado: 'EN_PREPARACION',
        fecha: '2025-01-05 10:00:00',
        usuario: 'Dr. Luis Ramírez',
      },
      {
        estado: 'EN_REVISION',
        fecha: '2025-01-16 15:00:00',
        usuario: 'Dr. Luis Ramírez',
      },
      {
        estado: 'APROBADA',
        fecha: '2025-01-17 08:00:00',
        usuario: 'Jefe OJ',
        comentario: 'Aprobada para envío',
      },
    ],
  },
  {
    id: '4',
    numero: 'OC-2024-00098',
    organo: 'DANE',
    tipo: 'INFORMACION',
    asunto: 'Estadísticas de matrícula y graduados 2024',
    descripcion: 'El DANE solicita información estadística sobre matrícula de estudiantes y graduados del año 2024 para censo nacional.',
    fechaRecepcion: '2024-12-15',
    fechaVencimiento: '2025-01-16',
    plazoTotal: 30,
    diasTranscurridos: 31,
    diasRestantes: -1,
    porcentajeRestante: -3.3,
    nivelAlerta: 'VENCIDO',
    estado: 'VENCIDA',
    abogadoAsignado: {
      id: 'a4',
      nombre: 'Dra. Patricia González',
      email: 'patricia.gonzalez@esap.edu.co',
    },
    documentosRequerimiento: [
      {
        id: 'd8',
        nombre: 'Solicitud_DANE_Censo.pdf',
        tipo: 'pdf',
        tamaño: 760000,
        fechaSubida: '2024-12-15 14:00:00',
        subidoPor: 'Asistente Administrativa',
        url: '#',
        categoria: 'REQUERIMIENTO',
      },
    ],
    respuestaDraft: '',
    documentosRespuesta: [],
    historialEstados: [
      {
        estado: 'RECIBIDO',
        fecha: '2024-12-15 14:00:00',
        usuario: 'Sistema',
      },
      {
        estado: 'VENCIDA',
        fecha: '2025-01-17 06:00:00',
        usuario: 'Sistema Automático',
        comentario: 'Plazo vencido - Requiere atención inmediata',
      },
    ],
  },
  {
    id: '5',
    numero: 'OC-2025-00004',
    organo: 'ARCHIVO_GENERAL',
    tipo: 'INFORMACION',
    asunto: 'Remisión de Tablas de Retención Documental',
    descripcion: 'Archivo General de la Nación solicita remisión de las Tablas de Retención Documental actualizadas de la entidad.',
    fechaRecepcion: '2025-01-08',
    fechaVencimiento: '2025-02-15',
    plazoTotal: 30,
    diasTranscurridos: 9,
    diasRestantes: 21,
    porcentajeRestante: 70,
    nivelAlerta: 'VERDE',
    estado: 'ENVIADA',
    abogadoAsignado: {
      id: 'a1',
      nombre: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@esap.edu.co',
    },
    documentosRequerimiento: [
      {
        id: 'd9',
        nombre: 'Oficio_Archivo_General.pdf',
        tipo: 'pdf',
        tamaño: 620000,
        fechaSubida: '2025-01-08 11:00:00',
        subidoPor: 'Asistente Administrativa',
        url: '#',
        categoria: 'REQUERIMIENTO',
      },
    ],
    respuestaDraft: 'Cordial saludo, adjunto las Tablas de Retención Documental...',
    documentosRespuesta: [
      {
        id: 'd10',
        nombre: 'TRD_ESAP_2025.pdf',
        tipo: 'pdf',
        tamaño: 5600000,
        fechaSubida: '2025-01-12 16:00:00',
        subidoPor: 'Dr. Carlos Mendoza',
        url: '#',
        categoria: 'RESPUESTA',
      },
    ],
    fechaEnvio: '2025-01-13 09:00:00',
    revisadoPor: {
      id: 'j1',
      nombre: 'Jefe OJ',
      fecha: '2025-01-12 17:00:00',
    },
    historialEstados: [
      {
        estado: 'RECIBIDO',
        fecha: '2025-01-08 11:00:00',
        usuario: 'Sistema',
      },
      {
        estado: 'EN_PREPARACION',
        fecha: '2025-01-08 14:00:00',
        usuario: 'Dr. Carlos Mendoza',
      },
      {
        estado: 'EN_REVISION',
        fecha: '2025-01-12 16:30:00',
        usuario: 'Dr. Carlos Mendoza',
      },
      {
        estado: 'APROBADA',
        fecha: '2025-01-12 17:00:00',
        usuario: 'Jefe OJ',
      },
      {
        estado: 'ENVIADA',
        fecha: '2025-01-13 09:00:00',
        usuario: 'Dr. Carlos Mendoza',
        comentario: 'Respuesta enviada por correo oficial',
      },
    ],
  },
];

// ========== HELPERS ==========

const getOrganoInfo = (organo: OrganoControl) => ORGANOS_CONTROL[organo];

const getEstadoConfig = (estado: EstadoRequerimiento) => {
  const configs = {
    RECIBIDO: { variant: 'info' as const, label: 'Recibido' },
    EN_PREPARACION: { variant: 'warning' as const, label: 'En Preparación' },
    EN_REVISION: { variant: 'info' as const, label: 'En Revisión' },
    APROBADA: { variant: 'success' as const, label: 'Aprobada' },
    ENVIADA: { variant: 'success' as const, label: 'Enviada' },
    RESUELTA: { variant: 'success' as const, label: 'Resuelta' },
    VENCIDA: { variant: 'danger' as const, label: 'Vencida' },
  };
  return configs[estado];
};

const getNivelAlertaConfig = (nivel: NivelAlerta) => {
  const configs = {
    VERDE: {
      color: '#28A745',
      bgColor: '#D4EDDA',
      icon: CheckCircle,
      label: 'En Plazo',
    },
    AMARILLO: {
      color: '#FFC107',
      bgColor: '#FFF3CD',
      icon: AlertCircle,
      label: 'Precaución',
    },
    ROJO: {
      color: '#DC3545',
      bgColor: '#F8D7DA',
      icon: AlertTriangle,
      label: 'Urgente',
    },
    VENCIDO: {
      color: '#000000',
      bgColor: '#E9ECEF',
      icon: XCircle,
      label: 'Vencido',
    },
  };
  return configs[nivel];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ========== COMPONENTE PRINCIPAL ==========

function ModuloOrganosControlContent() {
  const { showToast } = useToast();
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>(REQUERIMIENTOS_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroOrgano, setFiltroOrgano] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroNivelAlerta, setFiltroNivelAlerta] = useState('');
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalRespuesta, setShowModalRespuesta] = useState(false);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<Requerimiento | null>(null);

  // Nuevo requerimiento - estado del formulario
  const [nuevoRequerimiento, setNuevoRequerimiento] = useState({
    organo: '',
    tipo: 'INFORMACION' as TipoRequerimiento,
    asunto: '',
    descripcion: '',
    fechaRecepcion: '',
    abogadoAsignado: '',
  });

  // Filtrar requerimientos
  const requerimientosFiltrados = requerimientos.filter(req => {
    if (busqueda && !req.asunto.toLowerCase().includes(busqueda.toLowerCase()) && 
        !req.numero.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    if (filtroOrgano && req.organo !== filtroOrgano) return false;
    if (filtroEstado && req.estado !== filtroEstado) return false;
    if (filtroNivelAlerta && req.nivelAlerta !== filtroNivelAlerta) return false;
    return true;
  });

  // Métricas
  const totalRequerimientos = requerimientos.length;
  const porEstado = {
    RECIBIDO: requerimientos.filter(r => r.estado === 'RECIBIDO').length,
    EN_PREPARACION: requerimientos.filter(r => r.estado === 'EN_PREPARACION').length,
    EN_REVISION: requerimientos.filter(r => r.estado === 'EN_REVISION').length,
    APROBADA: requerimientos.filter(r => r.estado === 'APROBADA').length,
    ENVIADA: requerimientos.filter(r => r.estado === 'ENVIADA').length,
    RESUELTA: requerimientos.filter(r => r.estado === 'RESUELTA').length,
    VENCIDA: requerimientos.filter(r => r.estado === 'VENCIDA').length,
  };
  const porNivel = {
    VERDE: requerimientos.filter(r => r.nivelAlerta === 'VERDE').length,
    AMARILLO: requerimientos.filter(r => r.nivelAlerta === 'AMARILLO').length,
    ROJO: requerimientos.filter(r => r.nivelAlerta === 'ROJO').length,
    VENCIDO: requerimientos.filter(r => r.nivelAlerta === 'VENCIDO').length,
  };

  // Handlers
  const handleVerDetalle = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setShowModalDetalle(true);
  };

  const handlePrepararRespuesta = (req: Requerimiento) => {
    setRequerimientoSeleccionado(req);
    setShowModalRespuesta(true);
  };

  const handleEnviarRespuesta = (req: Requerimiento) => {
    showToast({
      variant: 'success',
      title: '📧 Respuesta Enviada',
      message: `Respuesta al ${getOrganoInfo(req.organo).nombre} enviada correctamente`,
    });
    
    // Actualizar estado
    setRequerimientos(prev => prev.map(r => 
      r.id === req.id ? { ...r, estado: 'ENVIADA' as EstadoRequerimiento, fechaEnvio: new Date().toISOString() } : r
    ));
  };

  const handleCrearRequerimiento = () => {
    if (!nuevoRequerimiento.organo || !nuevoRequerimiento.asunto || 
        !nuevoRequerimiento.descripcion || !nuevoRequerimiento.fechaRecepcion ||
        !nuevoRequerimiento.abogadoAsignado) {
      showToast({
        variant: 'danger',
        title: 'Error de Validación',
        message: 'Todos los campos son requeridos',
      });
      return;
    }

    showToast({
      variant: 'success',
      title: '✅ Requerimiento Registrado',
      message: 'El requerimiento ha sido registrado exitosamente',
    });

    setShowModalNuevo(false);
    setNuevoRequerimiento({
      organo: '',
      tipo: 'INFORMACION',
      asunto: '',
      descripcion: '',
      fechaRecepcion: '',
      abogadoAsignado: '',
    });
  };

  // Columnas de tabla
  const columns: Column<Requerimiento>[] = [
    {
      key: 'numero',
      label: 'Número',
      width: '130px',
      sortable: true,
      render: (value) => (
        <span style={{ fontFamily: 'monospace', color: '#1F4788', fontWeight: 600, fontSize: '13px' }}>
          {value}
        </span>
      ),
    },
    {
      key: 'organo',
      label: 'Órgano',
      width: '150px',
      sortable: true,
      render: (value) => {
        const info = getOrganoInfo(value);
        const Icon = info.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} style={{ color: info.color }} />
            <span style={{ fontSize: '13px', color: info.color, fontWeight: 600 }}>
              {info.nombre}
            </span>
          </div>
        );
      },
    },
    {
      key: 'asunto',
      label: 'Asunto',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-900 text-sm">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {row.tipo === 'AJUSTE' ? '🔄 Ajuste' : '📄 Información'}
          </div>
        </div>
      ),
    },
    {
      key: 'fechaRecepcion',
      label: 'Recepción',
      width: '110px',
      sortable: true,
      render: (value) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString('es-CO', { 
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: 'diasRestantes',
      label: 'Días Rest.',
      align: 'center',
      width: '100px',
      sortable: true,
      render: (value) => (
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: value <= 0 ? '#DC3545' : value <= 5 ? '#FFC107' : '#28A745'
        }}>
          {value}
        </span>
      ),
    },
    {
      key: 'nivelAlerta',
      label: 'Alerta',
      align: 'center',
      width: '120px',
      sortable: true,
      render: (value) => {
        const config = getNivelAlertaConfig(value);
        const Icon = config.icon;
        return (
          <div className="flex items-center justify-center gap-1">
            <Icon size={14} style={{ color: config.color }} />
            <span style={{ fontSize: '12px', color: config.color, fontWeight: 600 }}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      width: '130px',
      align: 'center',
      sortable: true,
      render: (value) => {
        const config = getEstadoConfig(value);
        return <BadgeSIGL variant={config.variant}>{config.label}</BadgeSIGL>;
      },
    },
    {
      key: 'abogadoAsignado',
      label: 'Responsable',
      width: '180px',
      render: (value) => (
        <div className="flex items-center gap-2">
          <AvatarSIGL name={value.nombre} size="sm" />
          <span className="text-sm">{value.nombre.split(' ')[0]}</span>
        </div>
      ),
    },
    {
      key: 'id',
      label: 'Acciones',
      width: '140px',
      align: 'center',
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleVerDetalle(row)}
            className="p-1.5 rounded hover:bg-blue-50 transition-colors"
            title="Ver detalle"
          >
            <Eye size={16} className="text-blue-600" />
          </button>
          {(row.estado === 'RECIBIDO' || row.estado === 'EN_PREPARACION') && (
            <button
              onClick={() => handlePrepararRespuesta(row)}
              className="p-1.5 rounded hover:bg-green-50 transition-colors"
              title="Preparar respuesta"
            >
              <Edit3 size={16} className="text-green-600" />
            </button>
          )}
          {row.estado === 'APROBADA' && (
            <button
              onClick={() => handleEnviarRespuesta(row)}
              className="p-1.5 rounded hover:bg-purple-50 transition-colors"
              title="Enviar respuesta"
            >
              <Send size={16} className="text-purple-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Órganos de Control
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                REQ-MOD02-001 - Gestión de requerimientos de órganos de control
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
              setFiltroOrgano('');
              setFiltroEstado('');
              setFiltroNivelAlerta('');
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
            onClick={() => setShowModalNuevo(true)}
          >
            Nuevo Requerimiento
          </ButtonSIGL>
        </div>
      </div>

      {/* Alertas */}
      {porNivel.VENCIDO > 0 && (
        <AlertBanner
          variant="critical"
          title={`⚠️ ${porNivel.VENCIDO} Requerimiento${porNivel.VENCIDO > 1 ? 's' : ''} Vencido${porNivel.VENCIDO > 1 ? 's' : ''}`}
          message="Requieren respuesta inmediata. Riesgo de sanción por parte del órgano de control."
          dismissible
        />
      )}

      {porNivel.ROJO > 0 && (
        <AlertBanner
          variant="warning"
          title={`🔥 ${porNivel.ROJO} Requerimiento${porNivel.ROJO > 1 ? 's' : ''} en Estado Urgente`}
          message="Menos del 25% del plazo restante. Se requiere atención prioritaria."
          dismissible
        />
      )}

      {/* Métricas por Nivel de Alerta */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['VERDE', 'AMARILLO', 'ROJO', 'VENCIDO'] as NivelAlerta[]).map(nivel => {
          const config = getNivelAlertaConfig(nivel);
          const Icon = config.icon;
          const cantidad = porNivel[nivel];

          return (
            <CardSIGL key={nivel}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{config.label}</p>
                  <p className="text-3xl font-bold" style={{ color: config.color }}>
                    {cantidad}
                  </p>
                </div>
                <Icon className="w-10 h-10" style={{ color: config.color }} />
              </div>
            </CardSIGL>
          );
        })}
      </div>

      {/* Distribución por Órgano */}
      <CardSIGL>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Distribución por Órgano de Control
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(ORGANOS_CONTROL)
            .filter(org => org.id !== 'OTRO')
            .map(organo => {
              const Icon = organo.icon;
              const cantidad = requerimientos.filter(r => r.organo === organo.id).length;
              
              return (
                <div
                  key={organo.id}
                  className="p-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                  style={{ borderColor: organo.color }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={18} style={{ color: organo.color }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: organo.color }}>
                      {organo.nombre}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: organo.color }}>
                      {cantidad}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Plazo: {organo.plazoEstandar}d
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </CardSIGL>

      {/* Filtros */}
      <CardSIGL>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar requerimientos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <SelectSIGL
            label=""
            placeholder="Todos los órganos"
            options={[
              { value: '', label: 'Todos los órganos' },
              ...Object.values(ORGANOS_CONTROL).map(org => ({
                value: org.id,
                label: org.nombre,
              })),
            ]}
            value={filtroOrgano}
            onChange={setFiltroOrgano}
          />

          <SelectSIGL
            label=""
            placeholder="Todos los estados"
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'RECIBIDO', label: 'Recibido' },
              { value: 'EN_PREPARACION', label: 'En Preparación' },
              { value: 'EN_REVISION', label: 'En Revisión' },
              { value: 'APROBADA', label: 'Aprobada' },
              { value: 'ENVIADA', label: 'Enviada' },
              { value: 'RESUELTA', label: 'Resuelta' },
              { value: 'VENCIDA', label: 'Vencida' },
            ]}
            value={filtroEstado}
            onChange={setFiltroEstado}
          />

          <SelectSIGL
            label=""
            placeholder="Todos los niveles"
            options={[
              { value: '', label: 'Todos los niveles' },
              { value: 'VERDE', label: 'Verde' },
              { value: 'AMARILLO', label: 'Amarillo' },
              { value: 'ROJO', label: 'Rojo' },
              { value: 'VENCIDO', label: 'Vencido' },
            ]}
            value={filtroNivelAlerta}
            onChange={setFiltroNivelAlerta}
          />
        </div>
      </CardSIGL>

      {/* Tabla de Requerimientos */}
      <CardSIGL>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Requerimientos Registrados ({requerimientosFiltrados.length})
          </h3>
        </div>
        <TableSIGL
          columns={columns}
          data={requerimientosFiltrados}
          sortable
          pagination
          pageSize={10}
          striped
          hoverable
        />
      </CardSIGL>

      {/* Modal Nuevo Requerimiento */}
      <ModalSIGL
        isOpen={showModalNuevo}
        onClose={() => setShowModalNuevo(false)}
        title="📝 Registrar Nuevo Requerimiento"
        size="large"
      >
        <div className="space-y-4">
          <SelectSIGL
            label="Órgano de Control"
            placeholder="Seleccione órgano"
            options={Object.values(ORGANOS_CONTROL).map(org => ({
              value: org.id,
              label: org.nombreCompleto,
            }))}
            value={nuevoRequerimiento.organo}
            onChange={(value) => setNuevoRequerimiento(prev => ({ ...prev, organo: value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Requerimiento <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="INFORMACION"
                  checked={nuevoRequerimiento.tipo === 'INFORMACION'}
                  onChange={(e) => setNuevoRequerimiento(prev => ({ 
                    ...prev, 
                    tipo: e.target.value as TipoRequerimiento 
                  }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Solicitud de Información</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="AJUSTE"
                  checked={nuevoRequerimiento.tipo === 'AJUSTE'}
                  onChange={(e) => setNuevoRequerimiento(prev => ({ 
                    ...prev, 
                    tipo: e.target.value as TipoRequerimiento 
                  }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Requerimiento de Ajuste</span>
              </label>
            </div>
          </div>

          <InputSIGL
            label="Asunto"
            placeholder="Asunto del requerimiento"
            value={nuevoRequerimiento.asunto}
            onChange={(value) => setNuevoRequerimiento(prev => ({ ...prev, asunto: value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Describa detalladamente el requerimiento del órgano de control..."
              value={nuevoRequerimiento.descripcion}
              onChange={(e) => setNuevoRequerimiento(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          <InputSIGL
            label="Fecha de Recepción"
            type="date"
            value={nuevoRequerimiento.fechaRecepcion}
            onChange={(value) => setNuevoRequerimiento(prev => ({ ...prev, fechaRecepcion: value }))}
            required
          />

          <SelectSIGL
            label="Abogado Asignado"
            placeholder="Seleccione abogado"
            options={[
              { value: 'a1', label: 'Dr. Carlos Mendoza' },
              { value: 'a2', label: 'Dra. María Torres' },
              { value: 'a3', label: 'Dr. Luis Ramírez' },
              { value: 'a4', label: 'Dra. Patricia González' },
            ]}
            value={nuevoRequerimiento.abogadoAsignado}
            onChange={(value) => setNuevoRequerimiento(prev => ({ ...prev, abogadoAsignado: value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documentos del Requerimiento
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Haga clic o arrastre archivos aquí
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX - Máximo 10MB
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <ButtonSIGL variant="secondary" onClick={() => setShowModalNuevo(false)}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL variant="primary" onClick={handleCrearRequerimiento}>
              Registrar Requerimiento
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>

      {/* Modal Detalle */}
      {requerimientoSeleccionado && (
        <ModalSIGL
          isOpen={showModalDetalle}
          onClose={() => {
            setShowModalDetalle(false);
            setRequerimientoSeleccionado(null);
          }}
          title={`Detalle - ${requerimientoSeleccionado.numero}`}
          size="large"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const info = getOrganoInfo(requerimientoSeleccionado.organo);
                    const Icon = info.icon;
                    return (
                      <>
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${info.color}20` }}
                        >
                          <Icon size={20} style={{ color: info.color }} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {requerimientoSeleccionado.asunto}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {info.nombreCompleto}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <BadgeSIGL variant={getEstadoConfig(requerimientoSeleccionado.estado).variant}>
                  {getEstadoConfig(requerimientoSeleccionado.estado).label}
                </BadgeSIGL>
                {(() => {
                  const config = getNivelAlertaConfig(requerimientoSeleccionado.nivelAlerta);
                  return (
                    <div className="flex items-center gap-1" style={{ color: config.color }}>
                      <config.icon size={16} />
                      <span className="text-sm font-semibold">{config.label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Información del Requerimiento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Número</h4>
                <p className="font-mono text-blue-600 font-semibold">{requerimientoSeleccionado.numero}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Tipo</h4>
                <p className="text-gray-900">
                  {requerimientoSeleccionado.tipo === 'AJUSTE' ? '🔄 Requerimiento de Ajuste' : '📄 Solicitud de Información'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Fecha Recepción</h4>
                <p className="text-gray-900">
                  {new Date(requerimientoSeleccionado.fechaRecepcion).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Fecha Vencimiento</h4>
                <p className="text-gray-900 font-semibold" style={{ 
                  color: requerimientoSeleccionado.diasRestantes <= 0 ? '#DC3545' : '#28A745'
                }}>
                  {new Date(requerimientoSeleccionado.fechaVencimiento).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Plazo Total</h4>
                <p className="text-gray-900">{requerimientoSeleccionado.plazoTotal} días hábiles</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Días Restantes</h4>
                <p className="text-2xl font-bold" style={{ 
                  color: requerimientoSeleccionado.diasRestantes <= 0 ? '#DC3545' : 
                         requerimientoSeleccionado.diasRestantes <= 5 ? '#FFC107' : '#28A745'
                }}>
                  {requerimientoSeleccionado.diasRestantes}
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h4>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                {requerimientoSeleccionado.descripcion}
              </p>
            </div>

            {/* Responsable */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Abogado Responsable</h4>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <AvatarSIGL name={requerimientoSeleccionado.abogadoAsignado.nombre} size="md" />
                <div>
                  <p className="font-semibold text-gray-900">{requerimientoSeleccionado.abogadoAsignado.nombre}</p>
                  <p className="text-sm text-gray-600">{requerimientoSeleccionado.abogadoAsignado.email}</p>
                </div>
              </div>
            </div>

            {/* Documentos del Requerimiento */}
            {requerimientoSeleccionado.documentosRequerimiento.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Documentos del Requerimiento ({requerimientoSeleccionado.documentosRequerimiento.length})
                </h4>
                <div className="space-y-2">
                  {requerimientoSeleccionado.documentosRequerimiento.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip size={18} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.tamaño)} • {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 rounded hover:bg-white transition-colors">
                        <Download size={18} className="text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respuesta */}
            {requerimientoSeleccionado.respuestaDraft && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Respuesta Preparada</h4>
                <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  {requerimientoSeleccionado.respuestaDraft}
                </p>
              </div>
            )}

            {/* Documentos de Respuesta */}
            {requerimientoSeleccionado.documentosRespuesta.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Documentos de Respuesta ({requerimientoSeleccionado.documentosRespuesta.length})
                </h4>
                <div className="space-y-2">
                  {requerimientoSeleccionado.documentosRespuesta.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip size={18} className="text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.tamaño)} • {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 rounded hover:bg-white transition-colors">
                        <Download size={18} className="text-green-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <History size={16} />
                Historial de Estados
              </h4>
              <div className="space-y-2">
                {requerimientoSeleccionado.historialEstados.map((hist, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {getEstadoConfig(hist.estado).label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(hist.fecha).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{hist.usuario}</p>
                      {hist.comentario && (
                        <p className="text-xs text-gray-500 mt-1 italic">{hist.comentario}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <ButtonSIGL
                variant="secondary"
                onClick={() => {
                  setShowModalDetalle(false);
                  setRequerimientoSeleccionado(null);
                }}
              >
                Cerrar
              </ButtonSIGL>
              {(requerimientoSeleccionado.estado === 'RECIBIDO' || 
                requerimientoSeleccionado.estado === 'EN_PREPARACION') && (
                <ButtonSIGL
                  variant="primary"
                  icon={<Edit3 size={16} />}
                  onClick={() => {
                    setShowModalDetalle(false);
                    handlePrepararRespuesta(requerimientoSeleccionado);
                  }}
                >
                  Preparar Respuesta
                </ButtonSIGL>
              )}
              {requerimientoSeleccionado.estado === 'APROBADA' && (
                <ButtonSIGL
                  variant="success"
                  icon={<Send size={16} />}
                  onClick={() => {
                    handleEnviarRespuesta(requerimientoSeleccionado);
                    setShowModalDetalle(false);
                    setRequerimientoSeleccionado(null);
                  }}
                >
                  Enviar Respuesta
                </ButtonSIGL>
              )}
            </div>
          </div>
        </ModalSIGL>
      )}
    </div>
  );
}

// Export con ToastProvider
export function ModuloOrganosControl() {
  return (
    <ToastProvider maxToasts={3}>
      <ModuloOrganosControlContent />
    </ToastProvider>
  );
}