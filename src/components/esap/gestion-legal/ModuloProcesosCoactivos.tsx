/**
 * ============================================
 * MOD-05: PROCESOS COACTIVOS
 * ============================================
 * 
 * Gestión de cobro coactivo de cartera vencida a favor de ESAP
 * Ley 1066/2006 - Proceso de Cobro Coactivo
 * 
 * ETAPAS DEL PROCESO:
 * 1. Etapa Persuasiva (Pre-coactiva)
 * 2. Etapa Prejudicial (Notificación)
 * 3. Etapa Coactiva (Mandamiento de Pago)
 * 
 * FUNCIONALIDADES:
 * - Gestión de deudores y obligaciones
 * - Mandamientos de pago
 * - Embargos y medidas cautelares
 * - Control de provisiones contables
 * - Seguimiento de recuperación de cartera
 * - Integración con contabilidad
 * 
 * Versión: 1.0.0
 * Prioridad: ALTA
 */

import { useState } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Mail,
  Building2,
  CreditCard,
  Ban,
  Scale,
  Eye,
  X,
  ChevronDown,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EtapaCoactivo = 'persuasiva' | 'prejudicial' | 'coactiva' | 'recuperado' | 'incobrable';

type TipoDeuda = 
  | 'matricula'
  | 'certificado'
  | 'multa'
  | 'contrato'
  | 'servicio'
  | 'otros';

interface ProcesoCoactivo {
  id: string;
  numero: string;
  deudor: {
    nombre: string;
    identificacion: string;
    tipo: 'persona_natural' | 'persona_juridica';
    email: string;
    telefono: string;
    direccion: string;
  };
  obligacion: {
    tipo: TipoDeuda;
    descripcion: string;
    valorOriginal: number;
    intereses: number;
    costas: number;
    valorTotal: number;
    fechaVencimiento: string;
    diasMora: number;
  };
  etapa: EtapaCoactivo;
  fechaInicio: string;
  fechaUltimaActuacion: string;
  abogadoAsignado: string;
  acciones: {
    fecha: string;
    tipo: string;
    descripcion: string;
  }[];
  medidas: {
    tipo: 'embargo_salarial' | 'embargo_bancario' | 'embargo_inmueble' | 'secuestro';
    fechaDecretada: string;
    estado: 'vigente' | 'levantada';
  }[];
  probabilidadRecuperacion: number;
  provision: number;
}

// ============================================
// DATOS MOCK
// ============================================

const PROCESOS_MOCK: ProcesoCoactivo[] = [
  {
    id: '1',
    numero: 'PC-2024-001',
    deudor: {
      nombre: 'Juan Carlos Rodríguez Pérez',
      identificacion: '1234567890',
      tipo: 'persona_natural',
      email: 'jrodriguez@email.com',
      telefono: '3001234567',
      direccion: 'Calle 45 #23-15, Bogotá',
    },
    obligacion: {
      tipo: 'matricula',
      descripcion: 'Matrícula programa Especialización en Gestión Pública 2023-2',
      valorOriginal: 4500000,
      intereses: 450000,
      costas: 150000,
      valorTotal: 5100000,
      fechaVencimiento: '2023-09-15',
      diasMora: 457,
    },
    etapa: 'coactiva',
    fechaInicio: '2024-01-15',
    fechaUltimaActuacion: '2024-11-28',
    abogadoAsignado: 'Dra. María Fernanda López',
    acciones: [
      { fecha: '2024-11-28', tipo: 'Embargo salarial', descripcion: 'Decretado embargo del 50% salario' },
      { fecha: '2024-10-15', tipo: 'Mandamiento de pago', descripcion: 'Notificado mandamiento de pago' },
      { fecha: '2024-08-20', tipo: 'Notificación prejudicial', descripcion: 'Enviada notificación por correo certificado' },
    ],
    medidas: [
      { tipo: 'embargo_salarial', fechaDecretada: '2024-11-28', estado: 'vigente' },
    ],
    probabilidadRecuperacion: 75,
    provision: 1275000,
  },
  {
    id: '2',
    numero: 'PC-2024-002',
    deudor: {
      nombre: 'Constructora ABC S.A.S.',
      identificacion: '900123456-7',
      tipo: 'persona_juridica',
      email: 'legal@constructoraabc.com',
      telefono: '6012345678',
      direccion: 'Carrera 15 #100-50 Piso 5, Bogotá',
    },
    obligacion: {
      tipo: 'contrato',
      descripcion: 'Incumplimiento contrato de obra No. 2023-045',
      valorOriginal: 25000000,
      intereses: 3750000,
      costas: 500000,
      valorTotal: 29250000,
      fechaVencimiento: '2023-06-30',
      diasMora: 534,
    },
    etapa: 'coactiva',
    fechaInicio: '2023-12-10',
    fechaUltimaActuacion: '2024-12-05',
    abogadoAsignado: 'Dr. Carlos Andrés Martínez',
    acciones: [
      { fecha: '2024-12-05', tipo: 'Embargo bancario', descripcion: 'Decretado embargo de cuentas bancarias' },
      { fecha: '2024-09-20', tipo: 'Mandamiento de pago', descripcion: 'Notificado mandamiento de pago' },
    ],
    medidas: [
      { tipo: 'embargo_bancario', fechaDecretada: '2024-12-05', estado: 'vigente' },
    ],
    probabilidadRecuperacion: 60,
    provision: 11700000,
  },
  {
    id: '3',
    numero: 'PC-2024-003',
    deudor: {
      nombre: 'Ana María Gómez Castro',
      identificacion: '9876543210',
      tipo: 'persona_natural',
      email: 'amgomez@email.com',
      telefono: '3109876543',
      direccion: 'Transversal 30 #67-89, Medellín',
    },
    obligacion: {
      tipo: 'certificado',
      descripcion: 'Certificados de estudios pendientes de pago',
      valorOriginal: 320000,
      intereses: 48000,
      costas: 50000,
      valorTotal: 418000,
      fechaVencimiento: '2024-05-20',
      diasMora: 205,
    },
    etapa: 'prejudicial',
    fechaInicio: '2024-09-01',
    fechaUltimaActuacion: '2024-11-30',
    abogadoAsignado: 'Dr. Luis Fernando Vargas',
    acciones: [
      { fecha: '2024-11-30', tipo: 'Segunda notificación', descripcion: 'Enviada segunda notificación prejudicial' },
      { fecha: '2024-10-15', tipo: 'Primera notificación', descripcion: 'Enviada primera notificación prejudicial' },
    ],
    medidas: [],
    probabilidadRecuperacion: 85,
    provision: 62700,
  },
  {
    id: '4',
    numero: 'PC-2024-004',
    deudor: {
      nombre: 'Pedro Antonio Salazar',
      identificacion: '5432167890',
      tipo: 'persona_natural',
      email: 'psalazar@email.com',
      telefono: '3157654321',
      direccion: 'Avenida 68 #45-23, Bogotá',
    },
    obligacion: {
      tipo: 'multa',
      descripcion: 'Multa por daños a propiedad institucional',
      valorOriginal: 1200000,
      intereses: 180000,
      costas: 100000,
      valorTotal: 1480000,
      fechaVencimiento: '2024-03-10',
      diasMora: 276,
    },
    etapa: 'persuasiva',
    fechaInicio: '2024-10-15',
    fechaUltimaActuacion: '2024-12-10',
    abogadoAsignado: 'Dra. Sandra Patricia Ruiz',
    acciones: [
      { fecha: '2024-12-10', tipo: 'Llamada telefónica', descripcion: 'Contacto telefónico con deudor' },
      { fecha: '2024-11-20', tipo: 'Correo electrónico', descripcion: 'Enviado correo recordatorio de pago' },
      { fecha: '2024-10-15', tipo: 'Carta de cobro', descripcion: 'Enviada carta inicial de cobro persuasivo' },
    ],
    medidas: [],
    probabilidadRecuperacion: 90,
    provision: 148000,
  },
  {
    id: '5',
    numero: 'PC-2023-089',
    deudor: {
      nombre: 'Servicios Integrales XYZ Ltda.',
      identificacion: '800987654-3',
      tipo: 'persona_juridica',
      email: 'cobranzas@serviciosxyz.com',
      telefono: '6017654321',
      direccion: 'Calle 100 #20-30 Of 402, Bogotá',
    },
    obligacion: {
      tipo: 'servicio',
      descripcion: 'Servicios de consultoría no pagados',
      valorOriginal: 8500000,
      intereses: 1700000,
      costas: 350000,
      valorTotal: 10550000,
      fechaVencimiento: '2023-12-15',
      diasMora: 362,
    },
    etapa: 'recuperado',
    fechaInicio: '2024-03-20',
    fechaUltimaActuacion: '2024-11-15',
    abogadoAsignado: 'Dr. Jorge Enrique Mora',
    acciones: [
      { fecha: '2024-11-15', tipo: 'Pago total', descripcion: 'Deudor realizó pago completo de la obligación' },
      { fecha: '2024-10-01', tipo: 'Acuerdo de pago', descripcion: 'Firmado acuerdo de pago en 3 cuotas' },
      { fecha: '2024-08-15', tipo: 'Embargo bancario', descripcion: 'Decretado embargo de cuentas' },
    ],
    medidas: [
      { tipo: 'embargo_bancario', fechaDecretada: '2024-08-15', estado: 'levantada' },
    ],
    probabilidadRecuperacion: 100,
    provision: 0,
  },
  {
    id: '6',
    numero: 'PC-2024-005',
    deudor: {
      nombre: 'María Alejandra Torres',
      identificacion: '1122334455',
      tipo: 'persona_natural',
      email: 'matorres@email.com',
      telefono: '3201122334',
      direccion: 'Carrera 50 #12-34, Cali',
    },
    obligacion: {
      tipo: 'matricula',
      descripcion: 'Matrícula Diplomado en Contratación Estatal',
      valorOriginal: 2300000,
      intereses: 230000,
      costas: 80000,
      valorTotal: 2610000,
      fechaVencimiento: '2024-08-20',
      diasMora: 113,
    },
    etapa: 'persuasiva',
    fechaInicio: '2024-11-01',
    fechaUltimaActuacion: '2024-12-12',
    abogadoAsignado: 'Dr. Luis Fernando Vargas',
    acciones: [
      { fecha: '2024-12-12', tipo: 'Correo electrónico', descripcion: 'Enviado segundo recordatorio' },
      { fecha: '2024-11-15', tipo: 'Carta de cobro', descripcion: 'Enviada carta de cobro persuasivo' },
    ],
    medidas: [],
    probabilidadRecuperacion: 80,
    provision: 522000,
  },
  {
    id: '7',
    numero: 'PC-2022-145',
    deudor: {
      nombre: 'Inversiones del Sur S.A.',
      identificacion: '900555666-8',
      tipo: 'persona_juridica',
      email: 'juridica@inversionesdelsur.com',
      telefono: '6025556677',
      direccion: 'Calle 85 #15-25 Torre B, Bogotá',
    },
    obligacion: {
      tipo: 'contrato',
      descripcion: 'Incumplimiento contrato de suministros 2022',
      valorOriginal: 45000000,
      intereses: 12000000,
      costas: 2000000,
      valorTotal: 59000000,
      fechaVencimiento: '2022-10-30',
      diasMora: 773,
    },
    etapa: 'incobrable',
    fechaInicio: '2023-05-15',
    fechaUltimaActuacion: '2024-09-20',
    abogadoAsignado: 'Dr. Carlos Andrés Martínez',
    acciones: [
      { fecha: '2024-09-20', tipo: 'Declaración incobrable', descripcion: 'Empresa en liquidación, sin bienes embargables' },
      { fecha: '2024-06-10', tipo: 'Embargo fallido', descripcion: 'Intento de embargo sin éxito, empresa en insolvencia' },
      { fecha: '2023-11-15', tipo: 'Mandamiento de pago', descripcion: 'Notificado mandamiento de pago' },
    ],
    medidas: [],
    probabilidadRecuperacion: 5,
    provision: 59000000,
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloProcesosCoactivos() {
  const [procesos, setProcesos] = useState<ProcesoCoactivo[]>(PROCESOS_MOCK);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaCoactivo | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoDeuda | 'todos'>('todos');

  // Filtrar procesos
  const procesosFiltrados = procesos.filter(p => {
    const cumpleBusqueda = busqueda === '' || 
      p.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.deudor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.deudor.identificacion.includes(busqueda);
    
    const cumpleEtapa = filtroEtapa === 'todas' || p.etapa === filtroEtapa;
    const cumpleTipo = filtroTipo === 'todos' || p.obligacion.tipo === filtroTipo;
    
    return cumpleBusqueda && cumpleEtapa && cumpleTipo;
  });

  // Métricas
  const totalProcesos = procesos.length;
  const procesosActivos = procesos.filter(p => 
    p.etapa !== 'recuperado' && p.etapa !== 'incobrable'
  ).length;
  const carteraTotal = procesos.reduce((sum, p) => sum + p.obligacion.valorTotal, 0);
  const carteraRecuperada = procesos
    .filter(p => p.etapa === 'recuperado')
    .reduce((sum, p) => sum + p.obligacion.valorTotal, 0);
  const carteraEnCobro = procesos
    .filter(p => p.etapa !== 'recuperado' && p.etapa !== 'incobrable')
    .reduce((sum, p) => sum + p.obligacion.valorTotal, 0);
  const provisionTotal = procesos.reduce((sum, p) => sum + p.provision, 0);

  // Distribución por etapa
  const porEtapa = {
    persuasiva: procesos.filter(p => p.etapa === 'persuasiva').length,
    prejudicial: procesos.filter(p => p.etapa === 'prejudicial').length,
    coactiva: procesos.filter(p => p.etapa === 'coactiva').length,
    recuperado: procesos.filter(p => p.etapa === 'recuperado').length,
    incobrable: procesos.filter(p => p.etapa === 'incobrable').length,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEtapaColor = (etapa: EtapaCoactivo) => {
    switch (etapa) {
      case 'persuasiva': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Persuasiva' };
      case 'prejudicial': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Prejudicial' };
      case 'coactiva': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Coactiva' };
      case 'recuperado': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Recuperado' };
      case 'incobrable': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Incobrable' };
    }
  };

  const getTipoDeudaLabel = (tipo: TipoDeuda) => {
    switch (tipo) {
      case 'matricula': return 'Matrícula';
      case 'certificado': return 'Certificado';
      case 'multa': return 'Multa';
      case 'contrato': return 'Contrato';
      case 'servicio': return 'Servicio';
      case 'otros': return 'Otros';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-05: Procesos Coactivos
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de cobro coactivo de cartera vencida • Ley 1066/2006
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{totalProcesos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Procesos</p>
          <p className="text-xs text-gray-500 mt-1">{procesosActivos} activos</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-lg font-black text-green-600">{formatCurrency(carteraRecuperada)}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Cartera Recuperada</p>
          <p className="text-xs text-gray-500 mt-1">
            {((carteraRecuperada / carteraTotal) * 100).toFixed(1)}% del total
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-600" />
            <span className="text-lg font-black text-orange-600">{formatCurrency(carteraEnCobro)}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">En Cobro</p>
          <p className="text-xs text-gray-500 mt-1">{procesosActivos} procesos</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-purple-600" />
            <span className="text-lg font-black text-purple-600">{formatCurrency(provisionTotal)}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Provisión Total</p>
          <p className="text-xs text-gray-500 mt-1">Cartera de difícil cobro</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ETAPA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Etapa del Proceso</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{porEtapa.persuasiva}</div>
            <div className="text-xs text-gray-600">Persuasiva</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{porEtapa.prejudicial}</div>
            <div className="text-xs text-gray-600">Prejudicial</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <Scale className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEtapa.coactiva}</div>
            <div className="text-xs text-gray-600">Coactiva</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{porEtapa.recuperado}</div>
            <div className="text-xs text-gray-600">Recuperado</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Ban className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{porEtapa.incobrable}</div>
            <div className="text-xs text-gray-600">Incobrable</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar Proceso
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Número, deudor o identificación..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por Etapa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Etapa
            </label>
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="todas">Todas las etapas</option>
              <option value="persuasiva">Persuasiva</option>
              <option value="prejudicial">Prejudicial</option>
              <option value="coactiva">Coactiva</option>
              <option value="recuperado">Recuperado</option>
              <option value="incobrable">Incobrable</option>
            </select>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Deuda
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="todos">Todos los tipos</option>
              <option value="matricula">Matrícula</option>
              <option value="certificado">Certificado</option>
              <option value="multa">Multa</option>
              <option value="contrato">Contrato</option>
              <option value="servicio">Servicio</option>
              <option value="otros">Otros</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm">
            + Nuevo Proceso
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEtapa('todas');
              setFiltroTipo('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{procesosFiltrados.length}</strong> de <strong>{totalProcesos}</strong> procesos
          </div>
        </div>
      </div>

      {/* TABLA DE PROCESOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Deudor
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Días Mora
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Etapa
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Abogado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {procesosFiltrados.map((proceso) => {
                const etapaColor = getEtapaColor(proceso.etapa);
                return (
                  <tr key={proceso.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{proceso.numero}</div>
                      <div className="text-xs text-gray-500">{proceso.fechaInicio}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{proceso.deudor.nombre}</div>
                      <div className="text-xs text-gray-500">{proceso.deudor.identificacion}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                        {getTipoDeudaLabel(proceso.obligacion.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(proceso.obligacion.valorTotal)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Capital: {formatCurrency(proceso.obligacion.valorOriginal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-red-600">{proceso.obligacion.diasMora}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 ${etapaColor.bg} ${etapaColor.text} text-xs font-bold rounded-full`}>
                        {etapaColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{proceso.abogadoAsignado}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setProcesoSeleccionado(proceso);
                          setMostrarModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 font-semibold text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {procesosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron procesos coactivos</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && procesoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{procesoSeleccionado.numero}</h2>
                  <p className="text-green-100 text-sm mt-1">Proceso Coactivo - {getEtapaColor(procesoSeleccionado.etapa).label}</p>
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
              {/* Información del Deudor */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Información del Deudor
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre / Razón Social</p>
                    <p className="font-semibold text-gray-900">{procesoSeleccionado.deudor.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Identificación</p>
                    <p className="font-semibold text-gray-900">{procesoSeleccionado.deudor.identificacion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{procesoSeleccionado.deudor.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                    <p className="font-semibold text-gray-900">{procesoSeleccionado.deudor.telefono}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Dirección</p>
                    <p className="font-semibold text-gray-900">{procesoSeleccionado.deudor.direccion}</p>
                  </div>
                </div>
              </div>

              {/* Información de la Obligación */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Detalle de la Obligación
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-3">{procesoSeleccionado.obligacion.descripcion}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Original</p>
                      <p className="font-bold text-gray-900">{formatCurrency(procesoSeleccionado.obligacion.valorOriginal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Intereses</p>
                      <p className="font-bold text-orange-600">{formatCurrency(procesoSeleccionado.obligacion.intereses)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Costas Procesales</p>
                      <p className="font-bold text-purple-600">{formatCurrency(procesoSeleccionado.obligacion.costas)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                      <p className="font-bold text-green-600 text-lg">{formatCurrency(procesoSeleccionado.obligacion.valorTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha de Vencimiento</p>
                      <p className="font-semibold text-gray-900">{procesoSeleccionado.obligacion.fechaVencimiento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Días en Mora</p>
                      <p className="font-bold text-red-600 text-lg">{procesoSeleccionado.obligacion.diasMora} días</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medidas Cautelares */}
              {procesoSeleccionado.medidas.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-green-600" />
                    Medidas Cautelares Decretadas
                  </h3>
                  <div className="space-y-2">
                    {procesoSeleccionado.medidas.map((medida, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {medida.tipo.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-600">Decretada: {medida.fechaDecretada}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          medida.estado === 'vigente' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {medida.estado === 'vigente' ? '🔴 VIGENTE' : '✓ LEVANTADA'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Acciones */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Historial de Actuaciones
                </h3>
                <div className="space-y-3">
                  {procesoSeleccionado.acciones.map((accion, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-24 text-right">
                        <span className="text-xs font-semibold text-gray-500">{accion.fecha}</span>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold text-gray-900">{accion.tipo}</p>
                        <p className="text-sm text-gray-600">{accion.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información Adicional */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Abogado Asignado</p>
                  <p className="font-semibold text-gray-900">{procesoSeleccionado.abogadoAsignado}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Probabilidad Recuperación</p>
                  <p className="font-bold text-green-600 text-lg">{procesoSeleccionado.probabilidadRecuperacion}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Provisión Contable</p>
                  <p className="font-bold text-purple-600">{formatCurrency(procesoSeleccionado.provision)}</p>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                Registrar Actuación
              </button>
              <button className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
                Decretar Medida
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
