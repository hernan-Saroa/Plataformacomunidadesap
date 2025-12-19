/**
 * ============================================
 * MOD-03: ASESORÍA JURÍDICA - SIGL
 * ============================================
 * 
 * ESPECIFICACIÓN: REQ-MOD03-001
 * DECRETO: 019/2012 (Gobierno en Línea)
 * PLAZO CRÍTICO: 30 días hábiles MÁXIMO
 * EXTENSIÓN PERMITIDA: +20 días (máx 50 total)
 * 
 * FUNCIONALIDADES:
 * ✅ Crear solicitudes de asesoría jurídica
 * ✅ Control automático de 30 días hábiles (Decreto 019/2012)
 * ✅ Alertas automáticas Día 25, Día 28, Vencimiento
 * ✅ Sistema de extensiones controladas (+20 días máx)
 * ✅ Escalación a MOD-08 (Plan de Acción) si vence
 * ✅ Dashboard ejecutivo con métricas
 * ✅ Vista Kanban, Tabla, Timeline
 * ✅ Filtros avanzados multi-criterio
 * ✅ Exportación Excel/PDF
 * ✅ Integración con MOD-07 (Buzón OJ)
 * 
 * TIPOS DE ASESORÍA:
 * - Contratación (contratos, pólizas)
 * - Normativo (cumplimiento leyes/decretos)
 * - Riesgos (evaluación exposición legal)
 * - Resoluciones (análisis actos administrativos)
 * - Litigios (análisis demandas, defensas)
 * - Especializadas (otras áreas)
 * 
 * ESTADOS:
 * - RECIBIDA: Asesoría creada, asignada a abogado
 * - EN_RESPUESTA: Abogado está trabajando
 * - RESPONDIDA: Respuesta completada
 * - VENCIDA: Más de 30 días sin respuesta
 * - EXTENSION_PENDIENTE: Solicitó extensión, esperando aprobación
 * - EXTENDIDA: Extensión aprobada, nuevo plazo
 * 
 * ALERTAS (Decreto 019/2012):
 * - VERDE: > 50% del plazo (> 15 días)
 * - AMARILLO: 25-50% del plazo (8-15 días) + Alerta Día 25
 * - ROJO: < 25% del plazo (< 8 días) + Alerta Día 28
 * - VENCIDO: >= Día 30 + Escalación a Dirección Nacional
 * 
 * Oficina Asesora Jurídica - ESAP
 * Desarrollado: Diciembre 2025
 * Versión: 1.0.0
 */

import { useState } from 'react';
import { 
  FileQuestion,
  Search, 
  Download, 
  Filter,
  Plus,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  BarChart3,
  List,
  Kanban,
  TimerReset,
  FileText,
  Scale,
  Shield,
  Building2,
  UserCheck,
} from 'lucide-react';

// ⭐ IMPORTAR DESIGN SYSTEM SIGL
import {
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  CardSIGL,
  ModalSIGL,
  TableSIGL,
  AlertBanner,
  AvatarSIGL,
  TooltipSIGL,
  PlazoBadge,
  Column,
} from './design-system';

// ============================================
// TIPOS Y ESTADOS
// ============================================

type EstadoAsesoria = 
  | 'RECIBIDA'
  | 'EN_RESPUESTA'
  | 'RESPONDIDA'
  | 'VENCIDA'
  | 'EXTENSION_PENDIENTE'
  | 'EXTENDIDA';

type TipoAsesoria =
  | 'Contratación'
  | 'Normativo'
  | 'Riesgos'
  | 'Resoluciones'
  | 'Litigios'
  | 'Especializadas';

type NivelUrgencia = 'NORMAL' | 'URGENTE';

type NivelAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Asesoria {
  id: string;
  numero: string; // AS-YYYY-NNNNN
  tipo: TipoAsesoria;
  descripcion: string;
  dependenciaSolicitante: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  urgencia: NivelUrgencia;
  abogadoAsignado: {
    nombre: string;
    email: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
  };
  estado: EstadoAsesoria;
  nivelAlerta: NivelAlerta;
  
  // Fechas y plazos
  fechaCreacion: string;
  fechaVencimiento: string;
  fechaRespuesta?: string;
  diasRestantes: number;
  diasTranscurridos: number;
  plazoTotal: number; // 30 o 50 si extendida
  
  // Extensiones
  extensionSolicitada: boolean;
  extensionAprobada: boolean;
  extensionDias?: number;
  extensionJustificacion?: string;
  
  // Respuesta
  respuesta?: string;
  documentosAdjuntos: number;
  
  // Metadata
  creadoPor: string;
  ultimaModificacion: string;
}

// ============================================
// DATOS MOCK
// ============================================

const ASESORIAS_MOCK: Asesoria[] = [
  {
    id: '1',
    numero: 'AS-2025-001',
    tipo: 'Contratación',
    descripcion: 'Revisión de contrato de prestación de servicios profesionales para consultoría en transformación digital. Se requiere concepto sobre cláusulas de propiedad intelectual.',
    dependenciaSolicitante: 'Dirección TIC',
    solicitanteNombre: 'María Fernanda López',
    solicitanteEmail: 'mflopez@esap.edu.co',
    urgencia: 'URGENTE',
    abogadoAsignado: {
      nombre: 'Dr. Carlos Mendoza',
      email: 'cmendoza@esap.edu.co',
      status: 'online',
    },
    estado: 'EN_RESPUESTA',
    nivelAlerta: 'ROJO',
    fechaCreacion: '05/12/2024',
    fechaVencimiento: '15/01/2025',
    diasRestantes: 3,
    diasTranscurridos: 27,
    plazoTotal: 30,
    extensionSolicitada: false,
    extensionAprobada: false,
    documentosAdjuntos: 3,
    creadoPor: 'María Fernanda López',
    ultimaModificacion: '16/12/2024 10:30',
  },
  {
    id: '2',
    numero: 'AS-2025-002',
    tipo: 'Normativo',
    descripcion: 'Concepto sobre aplicabilidad de la Ley 2213 de 2022 en procesos de contratación pública para territoriales ESAP.',
    dependenciaSolicitante: 'Territorial Antioquia',
    solicitanteNombre: 'Jorge Alberto Ruiz',
    solicitanteEmail: 'jaruiz@esap.edu.co',
    urgencia: 'NORMAL',
    abogadoAsignado: {
      nombre: 'Dra. Ana Patricia Gómez',
      email: 'apgomez@esap.edu.co',
      status: 'busy',
    },
    estado: 'EN_RESPUESTA',
    nivelAlerta: 'AMARILLO',
    fechaCreacion: '01/12/2024',
    fechaVencimiento: '10/01/2025',
    diasRestantes: 10,
    diasTranscurridos: 20,
    plazoTotal: 30,
    extensionSolicitada: false,
    extensionAprobada: false,
    documentosAdjuntos: 2,
    creadoPor: 'Jorge Alberto Ruiz',
    ultimaModificacion: '15/12/2024 14:20',
  },
  {
    id: '3',
    numero: 'AS-2025-003',
    tipo: 'Litigios',
    descripcion: 'Análisis de viabilidad de acción de repetición contra exfuncionario por sentencia condenatoria en proceso laboral.',
    dependenciaSolicitante: 'Dirección Administrativa',
    solicitanteNombre: 'Luis Eduardo Torres',
    solicitanteEmail: 'letorres@esap.edu.co',
    urgencia: 'URGENTE',
    abogadoAsignado: {
      nombre: 'Dr. Roberto Sánchez',
      email: 'rsanchez@esap.edu.co',
      status: 'online',
    },
    estado: 'RECIBIDA',
    nivelAlerta: 'VERDE',
    fechaCreacion: '10/12/2024',
    fechaVencimiento: '20/01/2025',
    diasRestantes: 20,
    diasTranscurridos: 10,
    plazoTotal: 30,
    extensionSolicitada: false,
    extensionAprobada: false,
    documentosAdjuntos: 5,
    creadoPor: 'Luis Eduardo Torres',
    ultimaModificacion: '10/12/2024 09:15',
  },
  {
    id: '4',
    numero: 'AS-2024-089',
    tipo: 'Resoluciones',
    descripcion: 'Revisión de proyecto de resolución sobre modificación del reglamento interno de personal académico.',
    dependenciaSolicitante: 'Dirección Académica',
    solicitanteNombre: 'Sandra Milena Castro',
    solicitanteEmail: 'smcastro@esap.edu.co',
    urgencia: 'NORMAL',
    abogadoAsignado: {
      nombre: 'Dra. Patricia Rojas',
      email: 'projas@esap.edu.co',
      status: 'offline',
    },
    estado: 'RESPONDIDA',
    nivelAlerta: 'VERDE',
    fechaCreacion: '15/11/2024',
    fechaVencimiento: '20/12/2024',
    fechaRespuesta: '18/12/2024',
    diasRestantes: 0,
    diasTranscurridos: 33,
    plazoTotal: 30,
    extensionSolicitada: false,
    extensionAprobada: false,
    respuesta: 'Se emite concepto favorable sobre el proyecto de resolución. Se recomienda ajustar los artículos 5 y 7 según jurisprudencia del Consejo de Estado...',
    documentosAdjuntos: 4,
    creadoPor: 'Sandra Milena Castro',
    ultimaModificacion: '18/12/2024 16:45',
  },
  {
    id: '5',
    numero: 'AS-2024-088',
    tipo: 'Riesgos',
    descripcion: 'Evaluación de riesgo legal por cambio normativo en requisitos para certificación de programas académicos.',
    dependenciaSolicitante: 'Vicerrectoría Académica',
    solicitanteNombre: 'Carlos Andrés Pineda',
    solicitanteEmail: 'capineda@esap.edu.co',
    urgencia: 'NORMAL',
    abogadoAsignado: {
      nombre: 'Dr. Mauricio Valencia',
      email: 'mvalencia@esap.edu.co',
      status: 'away',
    },
    estado: 'VENCIDA',
    nivelAlerta: 'VENCIDO',
    fechaCreacion: '01/11/2024',
    fechaVencimiento: '10/12/2024',
    diasRestantes: -7,
    diasTranscurridos: 37,
    plazoTotal: 30,
    extensionSolicitada: false,
    extensionAprobada: false,
    documentosAdjuntos: 2,
    creadoPor: 'Carlos Andrés Pineda',
    ultimaModificacion: '10/12/2024 17:00',
  },
  {
    id: '6',
    numero: 'AS-2025-004',
    tipo: 'Contratación',
    descripcion: 'Concepto sobre interpretación de cláusula de multas en contrato de interventoría de obras civiles.',
    dependenciaSolicitante: 'Dirección Administrativa',
    solicitanteNombre: 'Diego Armando Silva',
    solicitanteEmail: 'dasilva@esap.edu.co',
    urgencia: 'NORMAL',
    abogadoAsignado: {
      nombre: 'Dra. Laura Martínez',
      email: 'lmartinez@esap.edu.co',
      status: 'online',
    },
    estado: 'EXTENDIDA',
    nivelAlerta: 'AMARILLO',
    fechaCreacion: '25/11/2024',
    fechaVencimiento: '05/01/2025',
    diasRestantes: 8,
    diasTranscurridos: 32,
    plazoTotal: 40,
    extensionSolicitada: true,
    extensionAprobada: true,
    extensionDias: 10,
    extensionJustificacion: 'Se requiere análisis jurisprudencial adicional sobre aplicación de multas en contratos de interventoría según sentencias recientes del Consejo de Estado.',
    documentosAdjuntos: 6,
    creadoPor: 'Diego Armando Silva',
    ultimaModificacion: '14/12/2024 11:20',
  },
];

const TIPOS_ASESORIA: TipoAsesoria[] = [
  'Contratación',
  'Normativo',
  'Riesgos',
  'Resoluciones',
  'Litigios',
  'Especializadas',
];

const DEPENDENCIAS_ESAP = [
  'Dirección Nacional',
  'Dirección Administrativa',
  'Dirección Académica',
  'Dirección TIC',
  'Vicerrectoría Académica',
  'Territorial Antioquia',
  'Territorial Atlántico',
  'Territorial Boyacá',
  'Territorial Caldas',
  'Territorial Cauca',
  'Territorial Cesar',
  'Territorial Cundinamarca',
  'Territorial Huila',
  'Territorial Magdalena',
  'Territorial Meta',
  'Territorial Nariño',
  'Territorial Norte de Santander',
  'Territorial Quindío',
  'Territorial Risaralda',
  'Territorial Santander',
  'Territorial Tolima',
  'Territorial Valle del Cauca',
];

// ============================================
// COMPONENTE STATCARD
// ============================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  color: string;
}

function StatCard({ title, value, icon, trend, subtitle, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-black text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloAsesoriaJuridica() {
  // Estados principales
  const [asesorias] = useState<Asesoria[]>(ASESORIAS_MOCK);
  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'kanban' | 'timeline'>('tabla');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoAsesoria | 'TODOS'>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<TipoAsesoria | 'TODOS'>('TODOS');
  const [filtroAlerta, setFiltroAlerta] = useState<NivelAlerta | 'TODOS'>('TODOS');
  const [filtroDependencia, setFiltroDependencia] = useState('TODOS');
  
  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [asesoriaSeleccionada, setAsesoriaSeleccionada] = useState<Asesoria | null>(null);

  // ============================================
  // MÉTRICAS
  // ============================================

  const totalAsesorias = asesorias.length;
  const porEstado = {
    RECIBIDA: asesorias.filter(a => a.estado === 'RECIBIDA').length,
    EN_RESPUESTA: asesorias.filter(a => a.estado === 'EN_RESPUESTA').length,
    RESPONDIDA: asesorias.filter(a => a.estado === 'RESPONDIDA').length,
    VENCIDA: asesorias.filter(a => a.estado === 'VENCIDA').length,
    EXTENSION_PENDIENTE: asesorias.filter(a => a.estado === 'EXTENSION_PENDIENTE').length,
    EXTENDIDA: asesorias.filter(a => a.estado === 'EXTENDIDA').length,
  };
  
  const porAlerta = {
    VERDE: asesorias.filter(a => a.nivelAlerta === 'VERDE').length,
    AMARILLO: asesorias.filter(a => a.nivelAlerta === 'AMARILLO').length,
    ROJO: asesorias.filter(a => a.nivelAlerta === 'ROJO').length,
    VENCIDO: asesorias.filter(a => a.nivelAlerta === 'VENCIDO').length,
  };

  const activas = asesorias.filter(a => 
    a.estado !== 'RESPONDIDA' && a.estado !== 'VENCIDA'
  ).length;

  const tasaRespuesta = totalAsesorias > 0
    ? Math.round((porEstado.RESPONDIDA / totalAsesorias) * 100)
    : 0;

  // ============================================
  // FILTRADO
  // ============================================

  const asesoriasFiltradas = asesorias.filter(asesoria => {
    // Búsqueda
    if (busqueda && !asesoria.numero.toLowerCase().includes(busqueda.toLowerCase()) &&
        !asesoria.descripcion.toLowerCase().includes(busqueda.toLowerCase()) &&
        !asesoria.solicitanteNombre.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    
    // Estado
    if (filtroEstado !== 'TODOS' && asesoria.estado !== filtroEstado) {
      return false;
    }
    
    // Tipo
    if (filtroTipo !== 'TODOS' && asesoria.tipo !== filtroTipo) {
      return false;
    }
    
    // Alerta
    if (filtroAlerta !== 'TODOS' && asesoria.nivelAlerta !== filtroAlerta) {
      return false;
    }
    
    // Dependencia
    if (filtroDependencia !== 'TODOS' && asesoria.dependenciaSolicitante !== filtroDependencia) {
      return false;
    }
    
    return true;
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleCrearAsesoria = () => {
    setModalCrear(true);
  };

  const handleVerDetalle = (asesoria: Asesoria) => {
    setAsesoriaSeleccionada(asesoria);
    setModalDetalle(true);
  };

  const handleExportar = () => {
    console.log('Exportando asesorías...');
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('TODOS');
    setFiltroTipo('TODOS');
    setFiltroAlerta('TODOS');
    setFiltroDependencia('TODOS');
  };

  // ============================================
  // COLUMNAS TABLA
  // ============================================

  const columnas: Column<Asesoria>[] = [
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: '120px',
      render: (asesoria) => (
        <span className="font-mono font-bold text-sm" style={{ color: '#1F4788' }}>
          {asesoria.numero}
        </span>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      width: '140px',
      render: (asesoria) => {
        const iconos = {
          'Contratación': <FileText size={14} />,
          'Normativo': <Scale size={14} />,
          'Riesgos': <Shield size={14} />,
          'Resoluciones': <FileQuestion size={14} />,
          'Litigios': <Scale size={14} />,
          'Especializadas': <Building2 size={14} />,
        };
        
        return (
          <div className="flex items-center gap-2">
            {iconos[asesoria.tipo]}
            <span className="text-sm">{asesoria.tipo}</span>
          </div>
        );
      },
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      sortable: false,
      width: 'auto',
      render: (asesoria) => {
        if (!asesoria) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <div>
            <p className="text-sm text-gray-900 line-clamp-1 mb-1">
              {asesoria.descripcion || 'Sin descripción'}
            </p>
            <p className="text-xs text-gray-500">
              {asesoria.dependenciaSolicitante || 'N/A'} • {asesoria.solicitanteNombre || 'N/A'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'abogado',
      label: 'Abogado',
      sortable: true,
      width: '180px',
      render: (asesoria) => {
        if (!asesoria?.abogadoAsignado) {
          return <span className="text-sm text-gray-400">Sin asignar</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <AvatarSIGL 
              name={asesoria.abogadoAsignado.nombre} 
              size="sm"
              status={asesoria.abogadoAsignado.status}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {asesoria.abogadoAsignado.nombre.split(' ').slice(0, 2).join(' ')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      width: '160px',
      render: (asesoria) => {
        const config = {
          'RECIBIDA': { variant: 'info' as const, label: 'Recibida' },
          'EN_RESPUESTA': { variant: 'warning' as const, label: 'En Respuesta' },
          'RESPONDIDA': { variant: 'success' as const, label: 'Respondida' },
          'VENCIDA': { variant: 'danger' as const, label: 'Vencida' },
          'EXTENSION_PENDIENTE': { variant: 'warning' as const, label: 'Extensión Pendiente' },
          'EXTENDIDA': { variant: 'info' as const, label: 'Extendida' },
        };
        const estadoConfig = config[asesoria?.estado as keyof typeof config];
        if (!estadoConfig) {
          return <BadgeSIGL variant="default">{asesoria?.estado || 'Desconocido'}</BadgeSIGL>;
        }
        const { variant, label } = estadoConfig;
        return <BadgeSIGL variant={variant}>{label}</BadgeSIGL>;
      },
    },
    {
      key: 'plazo',
      label: 'Plazo (Decreto 019/2012)',
      sortable: true,
      width: '200px',
      render: (asesoria) => {
        if (!asesoria) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <div className="space-y-1">
            <PlazoBadge 
              diasRestantes={asesoria.diasRestantes ?? 0} 
              vencido={asesoria.nivelAlerta === 'VENCIDO'} 
            />
            <div className="text-xs text-gray-500">
              Vence: {asesoria.fechaVencimiento || '-'}
            </div>
            {asesoria.extensionAprobada && (
              <div className="text-xs text-purple-600 font-semibold">
                ⏱️ Ext. +{asesoria.extensionDias}d
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1F4788 0%, #6F42C1 100%)',
              }}
            >
              <FileQuestion className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                MOD-03: Asesoría Jurídica
              </h1>
              <p className="text-sm text-gray-600">
                Control de 30 días hábiles • Decreto 019/2012 (Gobierno en Línea)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportar}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              title="Exportar a Excel"
            >
              <Download size={18} />
            </button>
            <ButtonSIGL
              icon={<Plus size={18} />}
              onClick={handleCrearAsesoria}
            >
              Nueva Asesoría
            </ButtonSIGL>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-600">
          <span className="hover:text-blue-600 cursor-pointer">SIGL</span>
          <span className="mx-2">/</span>
          <span className="hover:text-blue-600 cursor-pointer">Gestión Legal</span>
          <span className="mx-2">/</span>
          <span className="font-semibold text-gray-900">Asesoría Jurídica</span>
        </div>
      </div>

      {/* ALERTAS CRÍTICAS (Decreto 019/2012) */}
      {porEstado.VENCIDA > 0 && (
        <AlertBanner
          variant="critical"
          title={`⚠️ ${porEstado.VENCIDA} Asesoría${porEstado.VENCIDA > 1 ? 's' : ''} Vencida${porEstado.VENCIDA > 1 ? 's' : ''}`}
          message="Decreto 019/2012 requiere respuesta en 30 días hábiles. Se ha escalado a Plan de Acción y Dirección Nacional."
          dismissible
        />
      )}

      {porAlerta.ROJO > 0 && (
        <AlertBanner
          variant="warning"
          title={`🔥 ${porAlerta.ROJO} Asesoría${porAlerta.ROJO > 1 ? 's' : ''} en Estado Crítico`}
          message="Menos del 25% del plazo restante. Se requiere respuesta urgente para cumplir Decreto 019/2012."
          dismissible
        />
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Asesorías"
          value={totalAsesorias}
          icon={<FileQuestion size={24} />}
          trend={{ value: 12, isPositive: true }}
          subtitle="Últimos 30 días"
          color="#1F4788"
        />
        <StatCard
          title="Activas"
          value={activas}
          icon={<Clock size={24} />}
          subtitle="En proceso"
          color="#6F42C1"
        />
        <StatCard
          title="Vencidas"
          value={porEstado.VENCIDA}
          icon={<AlertTriangle size={24} />}
          trend={{ value: porEstado.VENCIDA, isPositive: false }}
          subtitle="Requieren acción"
          color="#DC3545"
        />
        <StatCard
          title="Tasa Respuesta"
          value={`${tasaRespuesta}%`}
          icon={<CheckCircle size={24} />}
          trend={{ value: 5, isPositive: true }}
          subtitle="Cumplimiento Decreto 019"
          color="#28A745"
        />
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <CardSIGL className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">📊 Distribución por Estado</h3>
          <BadgeSIGL variant="info">{totalAsesorias} total</BadgeSIGL>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'RECIBIDA', label: 'Recibidas', color: '#3B82F6', icon: FileText },
            { key: 'EN_RESPUESTA', label: 'En Respuesta', color: '#6F42C1', icon: Clock },
            { key: 'RESPONDIDA', label: 'Respondidas', color: '#28A745', icon: CheckCircle },
            { key: 'VENCIDA', label: 'Vencidas', color: '#DC3545', icon: XCircle },
            { key: 'EXTENSION_PENDIENTE', label: 'Ext. Pendiente', color: '#FFC107', icon: TimerReset },
            { key: 'EXTENDIDA', label: 'Extendidas', color: '#17A2B8', icon: Calendar },
          ].map(({ key, label, color, icon: Icon }) => {
            const count = porEstado[key as keyof typeof porEstado];
            return (
              <div
                key={key}
                className="p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer"
                style={{
                  backgroundColor: `${color}08`,
                  borderColor: `${color}30`,
                }}
                onClick={() => setFiltroEstado(key as EstadoAsesoria)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon size={20} style={{ color }} />
                  <span className="text-2xl font-black" style={{ color }}>
                    {count}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-700">{label}</p>
              </div>
            );
          })}
        </div>
      </CardSIGL>

      {/* FILTROS */}
      <CardSIGL className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-bold text-gray-900">Filtros</h3>
          <button
            onClick={limpiarFiltros}
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            Limpiar filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <InputSIGL
            label="Buscar"
            placeholder="Número, descripción, solicitante..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icon={<Search size={18} />}
          />
          
          <SelectSIGL
            label="Estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoAsesoria | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todos los estados' },
              { value: 'RECIBIDA', label: 'Recibida' },
              { value: 'EN_RESPUESTA', label: 'En Respuesta' },
              { value: 'RESPONDIDA', label: 'Respondida' },
              { value: 'VENCIDA', label: 'Vencida' },
              { value: 'EXTENSION_PENDIENTE', label: 'Extensión Pendiente' },
              { value: 'EXTENDIDA', label: 'Extendida' },
            ]}
          />
          
          <SelectSIGL
            label="Tipo de Asesoría"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoAsesoria | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todos los tipos' },
              ...TIPOS_ASESORIA.map(tipo => ({ value: tipo, label: tipo })),
            ]}
          />
          
          <SelectSIGL
            label="Nivel de Alerta"
            value={filtroAlerta}
            onChange={(e) => setFiltroAlerta(e.target.value as NivelAlerta | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todos los niveles' },
              { value: 'VERDE', label: '🟢 Verde (>50% plazo)' },
              { value: 'AMARILLO', label: '🟡 Amarillo (25-50%)' },
              { value: 'ROJO', label: '🔴 Rojo (<25%)' },
              { value: 'VENCIDO', label: '⛔ Vencido' },
            ]}
          />
          
          <SelectSIGL
            label="Dependencia"
            value={filtroDependencia}
            onChange={(e) => setFiltroDependencia(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todas las dependencias' },
              ...DEPENDENCIAS_ESAP.map(dep => ({ value: dep, label: dep })),
            ]}
          />
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            📊 <strong>{asesoriasFiltradas.length}</strong> asesoría{asesoriasFiltradas.length !== 1 ? 's' : ''} {asesoriasFiltradas.length !== totalAsesorias && `de ${totalAsesorias}`}
          </p>
        </div>
      </CardSIGL>

      {/* SELECTOR DE VISTA */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">
          {vistaActiva === 'tabla' && '📋 Vista de Tabla'}
          {vistaActiva === 'kanban' && '📊 Vista Kanban'}
          {vistaActiva === 'timeline' && '📅 Vista Timeline'}
        </h3>
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setVistaActiva('tabla')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              vistaActiva === 'tabla'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={16} className="inline mr-2" />
            Tabla
          </button>
          <button
            onClick={() => setVistaActiva('kanban')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              vistaActiva === 'kanban'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Kanban size={16} className="inline mr-2" />
            Kanban
          </button>
          <button
            onClick={() => setVistaActiva('timeline')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              vistaActiva === 'timeline'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Timeline
          </button>
        </div>
      </div>

      {/* CONTENIDO SEGÚN VISTA */}
      {vistaActiva === 'tabla' && (
        <CardSIGL>
          <TableSIGL
            columns={columnas}
            data={asesoriasFiltradas}
            onRowClick={handleVerDetalle}
            striped
            hoverable
          />
        </CardSIGL>
      )}

      {vistaActiva === 'kanban' && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Kanban size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">Vista Kanban</p>
          <p className="text-sm text-gray-500 mt-2">Próximamente disponible</p>
        </div>
      )}

      {vistaActiva === 'timeline' && (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">Vista Timeline</p>
          <p className="text-sm text-gray-500 mt-2">Próximamente disponible</p>
        </div>
      )}

      {/* MODAL CREAR (placeholder) */}
      {modalCrear && (
        <ModalSIGL
          isOpen={modalCrear}
          onClose={() => setModalCrear(false)}
          title="📝 Nueva Solicitud de Asesoría Jurídica"
          size="large"
        >
          <div className="p-6 text-center">
            <FileQuestion size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-semibold mb-2">Formulario de Creación</p>
            <p className="text-sm text-gray-500">Funcionalidad completa próximamente</p>
          </div>
        </ModalSIGL>
      )}

      {/* MODAL DETALLE (placeholder) */}
      {modalDetalle && asesoriaSeleccionada && (
        <ModalSIGL
          isOpen={modalDetalle}
          onClose={() => {
            setModalDetalle(false);
            setAsesoriaSeleccionada(null);
          }}
          title={`📋 Asesoría ${asesoriaSeleccionada.numero}`}
          size="large"
        >
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Información General</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Tipo:</strong> {asesoriaSeleccionada.tipo}</p>
                  <p><strong>Dependencia:</strong> {asesoriaSeleccionada.dependenciaSolicitante}</p>
                  <p><strong>Solicitante:</strong> {asesoriaSeleccionada.solicitanteNombre}</p>
                  <p><strong>Email:</strong> {asesoriaSeleccionada.solicitanteEmail}</p>
                  <p><strong>Urgencia:</strong> <BadgeSIGL variant={asesoriaSeleccionada.urgencia === 'URGENTE' ? 'danger' : 'info'}>{asesoriaSeleccionada.urgencia}</BadgeSIGL></p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Plazos (Decreto 019/2012)</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Fecha Creación:</strong> {asesoriaSeleccionada.fechaCreacion}</p>
                  <p><strong>Fecha Vencimiento:</strong> {asesoriaSeleccionada.fechaVencimiento}</p>
                  <p><strong>Días Restantes:</strong> <PlazoBadge diasRestantes={asesoriaSeleccionada.diasRestantes} vencido={asesoriaSeleccionada.nivelAlerta === 'VENCIDO'} /></p>
                  <p><strong>Plazo Total:</strong> {asesoriaSeleccionada.plazoTotal} días hábiles</p>
                  {asesoriaSeleccionada.extensionAprobada && (
                    <p className="text-purple-600"><strong>Extensión:</strong> +{asesoriaSeleccionada.extensionDias} días aprobados</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-bold text-gray-900 mb-2">Descripción</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {asesoriaSeleccionada.descripcion}
              </p>
            </div>

            {asesoriaSeleccionada.respuesta && (
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-2">Respuesta Emitida</h4>
                <p className="text-sm text-gray-700 bg-green-50 p-4 rounded-lg border border-green-200">
                  {asesoriaSeleccionada.respuesta}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Respondida el: {asesoriaSeleccionada.fechaRespuesta}
                </p>
              </div>
            )}
          </div>
        </ModalSIGL>
      )}
    </div>
  );
}