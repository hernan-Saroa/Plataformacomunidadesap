/**
 * ============================================
 * MOD-04: JUZGAMIENTO DISCIPLINARIO - SIGL
 * ============================================
 * 
 * ESPECIFICACIÓN: REQ-MOD04-001
 * LEY: 734/2002 (Código Disciplinario Único)
 * WORKFLOW: 6 Etapas Obligatorias (NO se pueden saltar)
 * 
 * ETAPAS PROCESALES:
 * 1️⃣ Auto de Avocamiento (recepción formal)
 * 2️⃣ Traslado para Descargos (10 días TAXATIVOS)
 * 3️⃣ Práctica de Pruebas (variable)
 * 4️⃣ Alegatos de Conclusión (5 días recomendados)
 * 5️⃣ Fallo de Primera Instancia (ABSUELVE/CONDENA)
 * 6️⃣ Recurso de Apelación (10 días TAXATIVOS)
 * 
 * PLAZOS TAXATIVOS (Ley 734/2002 - NO editables):
 * - Descargos: 10 días hábiles
 * - Apelación: 10 días hábiles
 * - Prescripción: 5 años desde los hechos
 * 
 * EXCEPCIONES PROCESALES:
 * - Nulidad (vicio en procedimiento)
 * - Recusación (conflicto de interés)
 * - Falta de legitimidad
 * - Litis pendencia
 * - Cosa juzgada
 * - Prescripción
 * 
 * SANCIONES POSIBLES:
 * - Amonestación escrita
 * - Multa (hasta 180 días salario)
 * - Suspensión (1-12 meses)
 * - Destitución e inhabilidad
 * 
 * Oficina Asesora Jurídica - ESAP
 * Desarrollado: Diciembre 2025
 * Versión: 1.0.0
 */

import { useState } from 'react';
import { 
  Gavel,
  Search, 
  Download, 
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  FileText,
  Scale,
  Shield,
  AlertCircle,
  Ban,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  Lock,
  Unlock,
  File,
  UserX,
  DollarSign,
  Timer,
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

type EtapaProceso = 
  | 'ETAPA_1_AVOCAMIENTO'
  | 'ETAPA_2_DESCARGOS'
  | 'ETAPA_3_PRUEBAS'
  | 'ETAPA_4_ALEGATOS'
  | 'ETAPA_5_FALLO'
  | 'ETAPA_6_APELACION';

type EstadoProceso =
  | 'ACTIVO'
  | 'SUSPENDIDO'
  | 'RESUELTA'
  | 'APELADA'
  | 'PRESCRITA'
  | 'ARCHIVADO';

type TipoFalta =
  | 'Leve'
  | 'Grave'
  | 'Gravísima';

type TipoSancion =
  | 'Amonestación'
  | 'Multa'
  | 'Suspensión'
  | 'Destitución';

type DecisionFallo =
  | 'ABSUELVE'
  | 'CONDENA'
  | 'PENDIENTE';

type TipoExcepcion =
  | 'Nulidad'
  | 'Recusación'
  | 'Falta de Legitimidad'
  | 'Litis Pendencia'
  | 'Cosa Juzgada'
  | 'Prescripción';

interface ProcesoDisciplinario {
  id: string;
  numero: string; // PD-YYYY-NNNNN
  etapaActual: EtapaProceso;
  numeroEtapa: number; // 1-6
  estado: EstadoProceso;
  
  // Investigado
  investigado: {
    nombre: string;
    cedula: string;
    cargo: string;
    dependencia: string;
    email: string;
  };
  
  // Información del proceso
  tipoFalta: TipoFalta;
  hechosImputados: string;
  normasVioladas: string[];
  fechaHechos: string;
  
  // Abogado sustanciador
  abogadoAsignado: {
    nombre: string;
    email: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
  };
  
  // Plazos y fechas
  fechaInicio: string;
  fechaUltimaActuacion: string;
  diasDesdeInicio: number;
  
  // Etapa 1: Avocamiento
  autoAvocamiento?: {
    fecha: string;
    completado: boolean;
  };
  
  // Etapa 2: Descargos
  traslado?: {
    fechaNotificacion: string;
    fechaVencimiento: string;
    diasRestantes: number;
    descargosRecibidos: boolean;
    fechaRespuesta?: string;
  };
  
  // Etapa 3: Pruebas
  pruebas?: {
    cantidad: number;
    tipos: string[];
    completadas: number;
  };
  
  // Etapa 4: Alegatos
  alegatos?: {
    fecha?: string;
    completado: boolean;
  };
  
  // Etapa 5: Fallo
  fallo?: {
    decision: DecisionFallo;
    fecha?: string;
    sancion?: TipoSancion;
    montoMulta?: number;
    mesesSuspension?: number;
    fundamentacion?: string;
  };
  
  // Etapa 6: Apelación
  apelacion?: {
    plazoInicio: string;
    plazoVencimiento: string;
    diasRestantes: number;
    apeloInvestigado: boolean;
    fechaApelacion?: string;
    decisionSegundaInstancia?: string;
  };
  
  // Excepciones procesales
  excepciones: {
    tipo: TipoExcepcion;
    fecha: string;
    aceptada: boolean;
    resolucion: string;
  }[];
  
  // Prescripción
  prescripcion: {
    fechaLimite: string;
    diasHastaPrescrip: number;
    riesgo: boolean;
  };
  
  // Metadata
  creadoPor: string;
  ultimaModificacion: string;
}

// ============================================
// DATOS MOCK
// ============================================

const PROCESOS_MOCK: ProcesoDisciplinario[] = [
  {
    id: '1',
    numero: 'PD-2024-001',
    etapaActual: 'ETAPA_2_DESCARGOS',
    numeroEtapa: 2,
    estado: 'ACTIVO',
    investigado: {
      nombre: 'Carlos Andrés Martínez',
      cedula: '80.123.456',
      cargo: 'Coordinador Académico',
      dependencia: 'Territorial Antioquia',
      email: 'cmartinez@esap.edu.co',
    },
    tipoFalta: 'Grave',
    hechosImputados: 'Presunta irregularidad en proceso de selección de docentes cátedra segundo semestre 2024. Se habría favorecido a candidatos sin cumplir requisitos mínimos del concurso.',
    normasVioladas: ['Ley 734/2002 Art. 48 num. 1', 'Código de Ética ESAP Art. 15'],
    fechaHechos: '15/08/2024',
    abogadoAsignado: {
      nombre: 'Dra. Patricia Rojas',
      email: 'projas@esap.edu.co',
      status: 'online',
    },
    fechaInicio: '05/11/2024',
    fechaUltimaActuacion: '15/12/2024',
    diasDesdeInicio: 42,
    autoAvocamiento: {
      fecha: '10/11/2024',
      completado: true,
    },
    traslado: {
      fechaNotificacion: '12/12/2024',
      fechaVencimiento: '27/12/2024',
      diasRestantes: 5,
      descargosRecibidos: false,
    },
    excepciones: [],
    prescripcion: {
      fechaLimite: '15/08/2029',
      diasHastaPrescrip: 1703,
      riesgo: false,
    },
    creadoPor: 'Control Interno Disciplinario',
    ultimaModificacion: '15/12/2024 10:30',
  },
  {
    id: '2',
    numero: 'PD-2024-002',
    etapaActual: 'ETAPA_5_FALLO',
    numeroEtapa: 5,
    estado: 'ACTIVO',
    investigado: {
      nombre: 'María Fernanda López',
      cedula: '52.987.654',
      cargo: 'Asistente Administrativa',
      dependencia: 'Dirección Administrativa',
      email: 'mflopez@esap.edu.co',
    },
    tipoFalta: 'Leve',
    hechosImputados: 'Retraso reiterado en entrega de informes mensuales (octubre y noviembre 2024) sin justificación válida.',
    normasVioladas: ['Ley 734/2002 Art. 34 num. 5'],
    fechaHechos: '30/11/2024',
    abogadoAsignado: {
      nombre: 'Dr. Roberto Sánchez',
      email: 'rsanchez@esap.edu.co',
      status: 'busy',
    },
    fechaInicio: '25/10/2024',
    fechaUltimaActuacion: '16/12/2024',
    diasDesdeInicio: 52,
    autoAvocamiento: {
      fecha: '28/10/2024',
      completado: true,
    },
    traslado: {
      fechaNotificacion: '30/10/2024',
      fechaVencimiento: '13/11/2024',
      diasRestantes: 0,
      descargosRecibidos: true,
      fechaRespuesta: '10/11/2024',
    },
    pruebas: {
      cantidad: 3,
      tipos: ['Documental', 'Testimonial'],
      completadas: 3,
    },
    alegatos: {
      fecha: '05/12/2024',
      completado: true,
    },
    fallo: {
      decision: 'CONDENA',
      fecha: '16/12/2024',
      sancion: 'Amonestación',
      fundamentacion: 'Se comprobó incumplimiento reiterado de deberes funcionales.',
    },
    excepciones: [],
    prescripcion: {
      fechaLimite: '30/11/2029',
      diasHastaPrescrip: 1778,
      riesgo: false,
    },
    creadoPor: 'Control Interno Disciplinario',
    ultimaModificacion: '16/12/2024 16:45',
  },
  {
    id: '3',
    numero: 'PD-2024-003',
    etapaActual: 'ETAPA_3_PRUEBAS',
    numeroEtapa: 3,
    estado: 'ACTIVO',
    investigado: {
      nombre: 'Jorge Luis Ramírez',
      cedula: '79.456.123',
      cargo: 'Coordinador Financiero',
      dependencia: 'Territorial Cauca',
      email: 'jlramirez@esap.edu.co',
    },
    tipoFalta: 'Gravísima',
    hechosImputados: 'Presunto uso indebido de recursos públicos para gastos personales (viáticos no ejecutados). Monto involucrado: $8.500.000.',
    normasVioladas: ['Ley 734/2002 Art. 48 num. 25', 'Código Penal Art. 397'],
    fechaHechos: '20/09/2024',
    abogadoAsignado: {
      nombre: 'Dr. Carlos Mendoza',
      email: 'cmendoza@esap.edu.co',
      status: 'online',
    },
    fechaInicio: '10/10/2024',
    fechaUltimaActuacion: '14/12/2024',
    diasDesdeInicio: 67,
    autoAvocamiento: {
      fecha: '15/10/2024',
      completado: true,
    },
    traslado: {
      fechaNotificacion: '18/10/2024',
      fechaVencimiento: '04/11/2024',
      diasRestantes: 0,
      descargosRecibidos: true,
      fechaRespuesta: '02/11/2024',
    },
    pruebas: {
      cantidad: 8,
      tipos: ['Documental', 'Pericial', 'Testimonial'],
      completadas: 5,
    },
    excepciones: [],
    prescripcion: {
      fechaLimite: '20/09/2029',
      diasHastaPrescrip: 1708,
      riesgo: false,
    },
    creadoPor: 'Control Interno Disciplinario',
    ultimaModificacion: '14/12/2024 11:20',
  },
  {
    id: '4',
    numero: 'PD-2024-004',
    etapaActual: 'ETAPA_6_APELACION',
    numeroEtapa: 6,
    estado: 'APELADA',
    investigado: {
      nombre: 'Sandra Milena Castro',
      cedula: '63.789.012',
      cargo: 'Docente Cátedra',
      dependencia: 'Territorial Cundinamarca',
      email: 'smcastro@esap.edu.co',
    },
    tipoFalta: 'Grave',
    hechosImputados: 'Incumplimiento de horarios de clase (inasistencia a 6 sesiones sin justificación válida).',
    normasVioladas: ['Estatuto Docente ESAP Art. 22', 'Ley 734/2002 Art. 34 num. 1'],
    fechaHechos: '15/07/2024',
    abogadoAsignado: {
      nombre: 'Dra. Ana Patricia Gómez',
      email: 'apgomez@esap.edu.co',
      status: 'offline',
    },
    fechaInicio: '05/09/2024',
    fechaUltimaActuacion: '10/12/2024',
    diasDesdeInicio: 96,
    autoAvocamiento: {
      fecha: '10/09/2024',
      completado: true,
    },
    traslado: {
      fechaNotificacion: '15/09/2024',
      fechaVencimiento: '30/09/2024',
      diasRestantes: 0,
      descargosRecibidos: true,
      fechaRespuesta: '28/09/2024',
    },
    pruebas: {
      cantidad: 4,
      tipos: ['Documental', 'Testimonial'],
      completadas: 4,
    },
    alegatos: {
      fecha: '20/10/2024',
      completado: true,
    },
    fallo: {
      decision: 'CONDENA',
      fecha: '05/11/2024',
      sancion: 'Suspensión',
      mesesSuspension: 3,
      fundamentacion: 'Incumplimiento grave de deberes docentes afecta calidad académica.',
    },
    apelacion: {
      plazoInicio: '06/11/2024',
      plazoVencimiento: '22/11/2024',
      diasRestantes: 0,
      apeloInvestigado: true,
      fechaApelacion: '18/11/2024',
      decisionSegundaInstancia: 'En estudio por Dirección Nacional',
    },
    excepciones: [],
    prescripcion: {
      fechaLimite: '15/07/2029',
      diasHastaPrescrip: 1641,
      riesgo: false,
    },
    creadoPor: 'Control Interno Disciplinario',
    ultimaModificacion: '10/12/2024 09:15',
  },
  {
    id: '5',
    numero: 'PD-2020-045',
    etapaActual: 'ETAPA_2_DESCARGOS',
    numeroEtapa: 2,
    estado: 'ACTIVO',
    investigado: {
      nombre: 'Luis Eduardo Torres',
      cedula: '91.234.567',
      cargo: 'Auxiliar Administrativo',
      dependencia: 'Territorial Valle del Cauca',
      email: 'letorres@esap.edu.co',
    },
    tipoFalta: 'Grave',
    hechosImputados: 'Presunta adulteración de documentos internos (certificaciones de asistencia).',
    normasVioladas: ['Ley 734/2002 Art. 48 num. 10'],
    fechaHechos: '10/01/2020',
    abogadoAsignado: {
      nombre: 'Dra. Laura Martínez',
      email: 'lmartinez@esap.edu.co',
      status: 'away',
    },
    fechaInicio: '15/01/2020',
    fechaUltimaActuacion: '17/12/2024',
    diasDesdeInicio: 1797,
    autoAvocamiento: {
      fecha: '20/01/2020',
      completado: true,
    },
    traslado: {
      fechaNotificacion: '10/12/2024',
      fechaVencimiento: '27/12/2024',
      diasRestantes: 7,
      descargosRecibidos: false,
    },
    excepciones: [
      {
        tipo: 'Prescripción',
        fecha: '12/12/2024',
        aceptada: false,
        resolucion: 'Excepción rechazada. Proceso estuvo suspendido por pandemia COVID-19 (marzo 2020 - dic 2021), término de prescripción también suspendido.',
      },
    ],
    prescripcion: {
      fechaLimite: '10/01/2025',
      diasHastaPrescrip: 24,
      riesgo: true, // ⚠️ RIESGO ALTO
    },
    creadoPor: 'Control Interno Disciplinario',
    ultimaModificacion: '17/12/2024 14:20',
  },
];

const ETAPAS_INFO = [
  {
    numero: 1,
    id: 'ETAPA_1_AVOCAMIENTO',
    nombre: 'Auto de Avocamiento',
    descripcion: 'Recepción formal del proceso',
    icono: FileText,
    color: '#3B82F6',
    plazoTaxativo: false,
  },
  {
    numero: 2,
    id: 'ETAPA_2_DESCARGOS',
    nombre: 'Traslado para Descargos',
    descripcion: '10 días hábiles (TAXATIVO)',
    icono: Scale,
    color: '#6F42C1',
    plazoTaxativo: true,
  },
  {
    numero: 3,
    id: 'ETAPA_3_PRUEBAS',
    nombre: 'Práctica de Pruebas',
    descripcion: 'Variable según cantidad',
    icono: Shield,
    color: '#17A2B8',
    plazoTaxativo: false,
  },
  {
    numero: 4,
    id: 'ETAPA_4_ALEGATOS',
    nombre: 'Alegatos de Conclusión',
    descripcion: '~5 días (recomendado)',
    icono: File,
    color: '#FD7E14',
    plazoTaxativo: false,
  },
  {
    numero: 5,
    id: 'ETAPA_5_FALLO',
    nombre: 'Fallo Primera Instancia',
    descripcion: 'Absuelve o Condena',
    icono: Gavel,
    color: '#DC3545',
    plazoTaxativo: false,
  },
  {
    numero: 6,
    id: 'ETAPA_6_APELACION',
    nombre: 'Recurso de Apelación',
    descripcion: '10 días hábiles (TAXATIVO)',
    icono: RefreshCw,
    color: '#28A745',
    plazoTaxativo: true,
  },
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

export function ModuloJuzgamientoDisciplinario() {
  // Estados principales
  const [procesos] = useState<ProcesoDisciplinario[]>(PROCESOS_MOCK);
  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'etapas'>('tabla');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaProceso | 'TODOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoProceso | 'TODOS'>('TODOS');
  const [filtroFalta, setFiltroFalta] = useState<TipoFalta | 'TODOS'>('TODOS');
  
  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoDisciplinario | null>(null);

  // ============================================
  // MÉTRICAS
  // ============================================

  const totalProcesos = procesos.length;
  const porEtapa = {
    1: procesos.filter(p => p.numeroEtapa === 1).length,
    2: procesos.filter(p => p.numeroEtapa === 2).length,
    3: procesos.filter(p => p.numeroEtapa === 3).length,
    4: procesos.filter(p => p.numeroEtapa === 4).length,
    5: procesos.filter(p => p.numeroEtapa === 5).length,
    6: procesos.filter(p => p.numeroEtapa === 6).length,
  };
  
  const porEstado = {
    ACTIVO: procesos.filter(p => p.estado === 'ACTIVO').length,
    APELADA: procesos.filter(p => p.estado === 'APELADA').length,
    RESUELTA: procesos.filter(p => p.estado === 'RESUELTA').length,
    SUSPENDIDO: procesos.filter(p => p.estado === 'SUSPENDIDO').length,
    PRESCRITA: procesos.filter(p => p.estado === 'PRESCRITA').length,
  };

  const riesgoPrescripcion = procesos.filter(p => p.prescripcion.riesgo).length;
  const conExcepciones = procesos.filter(p => p.excepciones.length > 0).length;

  // ============================================
  // FILTRADO
  // ============================================

  const procesosFiltrados = procesos.filter(proceso => {
    // Búsqueda
    if (busqueda && 
        !proceso.numero.toLowerCase().includes(busqueda.toLowerCase()) &&
        !proceso.investigado.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !proceso.hechosImputados.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    
    // Etapa
    if (filtroEtapa !== 'TODOS' && proceso.etapaActual !== filtroEtapa) {
      return false;
    }
    
    // Estado
    if (filtroEstado !== 'TODOS' && proceso.estado !== filtroEstado) {
      return false;
    }
    
    // Falta
    if (filtroFalta !== 'TODOS' && proceso.tipoFalta !== filtroFalta) {
      return false;
    }
    
    return true;
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleCrearProceso = () => {
    setModalCrear(true);
  };

  const handleVerDetalle = (proceso: ProcesoDisciplinario) => {
    setProcesoSeleccionado(proceso);
    setModalDetalle(true);
  };

  const handleExportar = () => {
    console.log('Exportando procesos...');
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEtapa('TODOS');
    setFiltroEstado('TODOS');
    setFiltroFalta('TODOS');
  };

  // ============================================
  // COLUMNAS TABLA
  // ============================================

  const columnas: Column<ProcesoDisciplinario>[] = [
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: '120px',
      render: (proceso) => (
        <span className="font-mono font-bold text-sm" style={{ color: '#1F4788' }}>
          {proceso.numero}
        </span>
      ),
    },
    {
      key: 'investigado',
      label: 'Investigado',
      sortable: true,
      width: '200px',
      render: (proceso) => {
        if (!proceso?.investigado) {
          return <span className="text-sm text-gray-400">Sin información</span>;
        }
        return (
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {proceso.investigado.nombre}
            </p>
            <p className="text-xs text-gray-500">
              {proceso.investigado.cargo}
            </p>
          </div>
        );
      },
    },
    {
      key: 'hechos',
      label: 'Hechos Imputados',
      sortable: false,
      width: 'auto',
      render: (proceso) => {
        if (!proceso) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <div>
            <p className="text-sm text-gray-900 line-clamp-2 mb-1">
              {proceso.hechosImputados || 'Sin información'}
            </p>
            <div className="flex items-center gap-2">
              <BadgeSIGL 
                variant={
                  proceso.tipoFalta === 'Gravísima' ? 'danger' :
                  proceso.tipoFalta === 'Grave' ? 'warning' :
                  'info'
                }
              >
                {proceso.tipoFalta || 'N/A'}
              </BadgeSIGL>
              {proceso.prescripcion?.riesgo && (
                <TooltipSIGL content="Riesgo de prescripción">
                  <span className="text-red-600 text-xs font-bold flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Prescripción
                  </span>
                </TooltipSIGL>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'abogado',
      label: 'Abogado',
      sortable: true,
      width: '180px',
      render: (proceso) => {
        if (!proceso?.abogadoAsignado) {
          return <span className="text-sm text-gray-400">Sin asignar</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <AvatarSIGL 
              name={proceso.abogadoAsignado.nombre} 
              size="sm"
              status={proceso.abogadoAsignado.status}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {proceso.abogadoAsignado.nombre.split(' ').slice(0, 2).join(' ')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'etapa',
      label: 'Etapa Actual',
      sortable: true,
      width: '160px',
      render: (proceso) => {
        if (!proceso?.numeroEtapa) {
          return <span className="text-sm text-gray-400">Sin etapa definida</span>;
        }
        const etapaInfo = ETAPAS_INFO[proceso.numeroEtapa - 1];
        if (!etapaInfo) {
          return <span className="text-sm text-gray-400">Etapa desconocida</span>;
        }
        const Icon = etapaInfo.icono;
        return (
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${etapaInfo.color}15` }}
            >
              <Icon size={16} style={{ color: etapaInfo.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Etapa {proceso.numeroEtapa}
              </p>
              <p className="text-xs text-gray-500">
                {etapaInfo.nombre}
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
      width: '120px',
      render: (proceso) => {
        const config = {
          'ACTIVO': { variant: 'success' as const, label: 'Activo' },
          'SUSPENDIDO': { variant: 'warning' as const, label: 'Suspendido' },
          'RESUELTA': { variant: 'info' as const, label: 'Resuelta' },
          'APELADA': { variant: 'warning' as const, label: 'Apelada' },
          'PRESCRITA': { variant: 'danger' as const, label: 'Prescrita' },
          'ARCHIVADO': { variant: 'default' as const, label: 'Archivado' },
        };
        const estadoConfig = config[proceso?.estado as keyof typeof config];
        if (!estadoConfig) {
          return <BadgeSIGL variant="default">{proceso?.estado || 'Desconocido'}</BadgeSIGL>;
        }
        const { variant, label } = estadoConfig;
        return <BadgeSIGL variant={variant}>{label}</BadgeSIGL>;
      },
    },
    {
      key: 'dias',
      label: 'Tiempo',
      sortable: true,
      width: '120px',
      render: (proceso) => (
        <div className="text-sm">
          <p className="text-gray-900 font-semibold">
            {proceso?.diasDesdeInicio ?? 0} días
          </p>
          <p className="text-xs text-gray-500">
            Desde inicio
          </p>
        </div>
      ),
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
                background: 'linear-gradient(135deg, #DC3545 0%, #FD7E14 100%)',
              }}
            >
              <Gavel className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                MOD-04: Juzgamiento Disciplinario
              </h1>
              <p className="text-sm text-gray-600">
                6 Etapas Obligatorias • Ley 734/2002 (Código Disciplinario Único)
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
              onClick={handleCrearProceso}
            >
              Nuevo Proceso
            </ButtonSIGL>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-600">
          <span className="hover:text-blue-600 cursor-pointer">SIGL</span>
          <span className="mx-2">/</span>
          <span className="hover:text-blue-600 cursor-pointer">Gestión Legal</span>
          <span className="mx-2">/</span>
          <span className="font-semibold text-gray-900">Juzgamiento Disciplinario</span>
        </div>
      </div>

      {/* ALERTAS CRÍTICAS */}
      {riesgoPrescripcion > 0 && (
        <AlertBanner
          variant="critical"
          title={`⚠️ ${riesgoPrescripcion} Proceso${riesgoPrescripcion > 1 ? 's' : ''} en Riesgo de Prescripción`}
          message="Ley 734/2002: Los procesos prescriben a los 5 años desde los hechos. Se requiere acción inmediata para evitar archivo."
          dismissible
        />
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Procesos"
          value={totalProcesos}
          icon={<Gavel size={24} />}
          trend={{ value: 8, isPositive: true }}
          subtitle="Últimos 30 días"
          color="#DC3545"
        />
        <StatCard
          title="Activos"
          value={porEstado.ACTIVO}
          icon={<Clock size={24} />}
          subtitle="En trámite"
          color="#28A745"
        />
        <StatCard
          title="Riesgo Prescripción"
          value={riesgoPrescripcion}
          icon={<AlertTriangle size={24} />}
          trend={{ value: riesgoPrescripcion, isPositive: false }}
          subtitle="Requieren atención"
          color="#FD7E14"
        />
        <StatCard
          title="Con Excepciones"
          value={conExcepciones}
          icon={<AlertCircle size={24} />}
          subtitle="Procesales presentadas"
          color="#6F42C1"
        />
      </div>

      {/* DISTRIBUCIÓN POR ETAPA */}
      <CardSIGL className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">📊 Distribución por Etapa Procesal</h3>
          <BadgeSIGL variant="info">{totalProcesos} total</BadgeSIGL>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ETAPAS_INFO.map((etapa) => {
            const Icon = etapa.icono;
            const count = porEtapa[etapa.numero as keyof typeof porEtapa];
            return (
              <div
                key={etapa.id}
                className="p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer relative"
                style={{
                  backgroundColor: `${etapa.color}08`,
                  borderColor: `${etapa.color}30`,
                }}
                onClick={() => setFiltroEtapa(etapa.id as EtapaProceso)}
              >
                {etapa.plazoTaxativo && (
                  <div className="absolute top-2 right-2">
                    <TooltipSIGL content="Plazo TAXATIVO (Ley 734/2002)">
                      <Lock size={14} className="text-red-600" />
                    </TooltipSIGL>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <Icon size={20} style={{ color: etapa.color }} />
                  <span className="text-2xl font-black" style={{ color: etapa.color }}>
                    {count}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Etapa {etapa.numero}
                </p>
                <p className="text-xs text-gray-600">
                  {etapa.nombre}
                </p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputSIGL
            label="Buscar"
            placeholder="Número, investigado, hechos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icon={<Search size={18} />}
          />
          
          <SelectSIGL
            label="Etapa"
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value as EtapaProceso | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todas las etapas' },
              ...ETAPAS_INFO.map(e => ({ 
                value: e.id, 
                label: `Etapa ${e.numero}: ${e.nombre}` 
              })),
            ]}
          />
          
          <SelectSIGL
            label="Estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoProceso | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todos los estados' },
              { value: 'ACTIVO', label: 'Activo' },
              { value: 'SUSPENDIDO', label: 'Suspendido' },
              { value: 'RESUELTA', label: 'Resuelta' },
              { value: 'APELADA', label: 'Apelada' },
              { value: 'PRESCRITA', label: 'Prescrita' },
            ]}
          />
          
          <SelectSIGL
            label="Tipo de Falta"
            value={filtroFalta}
            onChange={(e) => setFiltroFalta(e.target.value as TipoFalta | 'TODOS')}
            options={[
              { value: 'TODOS', label: 'Todos los tipos' },
              { value: 'Leve', label: 'Leve' },
              { value: 'Grave', label: 'Grave' },
              { value: 'Gravísima', label: 'Gravísima' },
            ]}
          />
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            📊 <strong>{procesosFiltrados.length}</strong> proceso{procesosFiltrados.length !== 1 ? 's' : ''} {procesosFiltrados.length !== totalProcesos && `de ${totalProcesos}`}
          </p>
        </div>
      </CardSIGL>

      {/* CONTENIDO - TABLA */}
      <CardSIGL>
        <TableSIGL
          columns={columnas}
          data={procesosFiltrados}
          onRowClick={handleVerDetalle}
          striped
          hoverable
        />
      </CardSIGL>

      {/* MODAL CREAR (placeholder) */}
      {modalCrear && (
        <ModalSIGL
          isOpen={modalCrear}
          onClose={() => setModalCrear(false)}
          title="📝 Nuevo Proceso Disciplinario"
          size="large"
        >
          <div className="p-6 text-center">
            <Gavel size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-semibold mb-2">Formulario de Creación</p>
            <p className="text-sm text-gray-500">Funcionalidad completa próximamente</p>
          </div>
        </ModalSIGL>
      )}

      {/* MODAL DETALLE */}
      {modalDetalle && procesoSeleccionado && (
        <ModalSIGL
          isOpen={modalDetalle}
          onClose={() => {
            setModalDetalle(false);
            setProcesoSeleccionado(null);
          }}
          title={`📋 Proceso ${procesoSeleccionado.numero}`}
          size="large"
        >
          <div className="p-6">
            {/* Timeline de Etapas */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-4">Progreso de Etapas</h4>
              <div className="flex items-center gap-2">
                {ETAPAS_INFO.map((etapa, index) => {
                  const completada = procesoSeleccionado.numeroEtapa > etapa.numero;
                  const actual = procesoSeleccionado.numeroEtapa === etapa.numero;
                  const Icon = etapa.icono;
                  
                  return (
                    <div key={etapa.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                            completada 
                              ? 'bg-green-500 border-green-500' 
                              : actual
                              ? 'bg-white border-blue-500'
                              : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          {completada ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : (
                            <Icon 
                              size={20} 
                              className={actual ? 'text-blue-600' : 'text-gray-400'}
                            />
                          )}
                        </div>
                        <p className={`text-xs mt-2 text-center font-semibold ${
                          actual ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          Etapa {etapa.numero}
                        </p>
                      </div>
                      {index < ETAPAS_INFO.length - 1 && (
                        <div 
                          className={`flex-1 h-0.5 ${
                            completada ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Información del Investigado */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Investigado</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Nombre:</strong> {procesoSeleccionado.investigado.nombre}</p>
                  <p><strong>Cédula:</strong> {procesoSeleccionado.investigado.cedula}</p>
                  <p><strong>Cargo:</strong> {procesoSeleccionado.investigado.cargo}</p>
                  <p><strong>Dependencia:</strong> {procesoSeleccionado.investigado.dependencia}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Información del Proceso</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Tipo de Falta:</strong> <BadgeSIGL variant={
                    procesoSeleccionado.tipoFalta === 'Gravísima' ? 'danger' :
                    procesoSeleccionado.tipoFalta === 'Grave' ? 'warning' :
                    'info'
                  }>{procesoSeleccionado.tipoFalta}</BadgeSIGL></p>
                  <p><strong>Fecha de los Hechos:</strong> {procesoSeleccionado.fechaHechos}</p>
                  <p><strong>Días desde inicio:</strong> {procesoSeleccionado.diasDesdeInicio} días</p>
                  <p><strong>Estado:</strong> <BadgeSIGL variant="success">{procesoSeleccionado.estado}</BadgeSIGL></p>
                </div>
              </div>
            </div>

            {/* Hechos Imputados */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-2">Hechos Imputados</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {procesoSeleccionado.hechosImputados}
              </p>
            </div>

            {/* Normas Violadas */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-2">Normas Presuntamente Violadas</h4>
              <div className="flex flex-wrap gap-2">
                {procesoSeleccionado.normasVioladas.map((norma, idx) => (
                  <BadgeSIGL key={idx} variant="info">{norma}</BadgeSIGL>
                ))}
              </div>
            </div>

            {/* Excepciones Procesales */}
            {procesoSeleccionado.excepciones.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-2">⚠️ Excepciones Procesales</h4>
                {procesoSeleccionado.excepciones.map((exc, idx) => (
                  <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{exc.tipo}</span>
                      <BadgeSIGL variant={exc.aceptada ? 'success' : 'danger'}>
                        {exc.aceptada ? 'Aceptada' : 'Rechazada'}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-gray-700">{exc.resolucion}</p>
                    <p className="text-xs text-gray-500 mt-1">Fecha: {exc.fecha}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Prescripción */}
            {procesoSeleccionado.prescripcion.riesgo && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  <h4 className="font-bold text-red-900">⚠️ RIESGO DE PRESCRIPCIÓN</h4>
                </div>
                <p className="text-sm text-red-800">
                  Este proceso prescribe el <strong>{procesoSeleccionado.prescripcion.fechaLimite}</strong> (en {procesoSeleccionado.prescripcion.diasHastaPrescrip} días).
                  Se requiere acción urgente para evitar archivo por prescripción.
                </p>
              </div>
            )}
          </div>
        </ModalSIGL>
      )}
    </div>
  );
}