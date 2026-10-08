import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSignature,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Plane,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { authService, UsuarioActual } from '../services/api/authService';
import {
  DocumentoSoporte,
  EstadoFirmasResponse,
  EstadoSolicitudViatico,
  SolicitudComisionResponse,
  SolicitudViatico,
} from '../types/viaticos';
import { ViaticoModal } from './ViaticoModal';

export interface ComisionadoInboxProps {
  /** Callback opcional para navegar directamente a la pestaña de legalizaciones */
  onIrALegalizacion?: (solicitudId?: string) => void;
}

export function formatearPesosCOP(v: number | string | null | undefined): string {
  const num = Number(v ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
}

export function formatearFecha(iso?: string | null): string {
  if (!iso) return 'Sin fecha';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

interface EstadoVisual {
  etiqueta: string;
  badgeClase: string;
  dotClase: string;
  descripcion: string;
  etapaNumero: number;
}

export function getEstadoComisionVisual(estado: EstadoSolicitudViatico | string): EstadoVisual {
  switch (estado) {
    case 'PENDIENTE':
    case 'BORRADOR':
      return {
        etiqueta: 'Borrador / Pendiente',
        badgeClase: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClase: 'bg-slate-400',
        descripcion: 'Solicitud en diligenciamiento preliminar.',
        etapaNumero: 1,
      };
    case 'PENDIENTE_FIRMAS':
      return {
        etiqueta: 'Pendiente de Firmas (023)',
        badgeClase: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClase: 'bg-amber-500',
        descripcion: 'En trámite de firmas electrónicas de Jefe / Gerente y Subdirector.',
        etapaNumero: 1,
      };
    case 'RADICADA':
      return {
        etiqueta: 'Radicada',
        badgeClase: 'bg-blue-50 text-blue-800 border-blue-200',
        dotClase: 'bg-blue-500',
        descripcion: 'Firmas completas. En cola de asignación a analista de viáticos.',
        etapaNumero: 2,
      };
    case 'EN_VERIFICACION':
      return {
        etiqueta: 'En Verificación Técnica',
        badgeClase: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClase: 'bg-sky-500',
        descripcion: 'El analista de viáticos está verificando requisitos y cálculo.',
        etapaNumero: 2,
      };
    case 'SOLICITADA_SIIF':
    case 'VERIFICADA':
      return {
        etiqueta: 'Verificada (Control Viáticos)',
        badgeClase: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClase: 'bg-indigo-500',
        descripcion: 'Verificación técnica aprobada. En revisión por Control de Viáticos.',
        etapaNumero: 3,
      };
    case 'AUTORIZACION_DIRECCION':
    case 'EN_AUTORIZACION':
      return {
        etiqueta: 'En Autorización Corporativa',
        badgeClase: 'bg-purple-50 text-purple-800 border-purple-200',
        dotClase: 'bg-purple-500',
        descripcion: 'Pendiente de visto bueno de gasto por la Subdirección / Dirección.',
        etapaNumero: 3,
      };
    case 'AUTORIZADA':
      return {
        etiqueta: 'Autorizada por Ordenación',
        badgeClase: 'bg-violet-50 text-violet-800 border-violet-200',
        dotClase: 'bg-violet-500',
        descripcion: 'Visto bueno corporativo emitido. Pasa a asignación presupuestal.',
        etapaNumero: 4,
      };
    case 'EN_PRESUPUESTO':
    case 'COMPROMETIDA':
      return {
        etiqueta: 'Con Registro Presupuestal (RP)',
        badgeClase: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClase: 'bg-emerald-500',
        descripcion: 'RP expedido en SIIF Nación. Recursos comprometidos para la comisión.',
        etapaNumero: 4,
      };
    case 'OBLIGADA':
      return {
        etiqueta: 'Obligada en SIIF (Lista para Pago)',
        badgeClase: 'bg-teal-50 text-teal-800 border-teal-200',
        dotClase: 'bg-teal-500',
        descripcion: 'Obligación presupuestal radicada. En turno de desembolso por Tesorería.',
        etapaNumero: 5,
      };
    case 'PAGADA':
      return {
        etiqueta: 'Pagada / Desembolsada',
        badgeClase: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        dotClase: 'bg-emerald-600',
        descripcion: 'Viáticos pagados en cuenta bancaria. Pendiente de ejecución de viaje.',
        etapaNumero: 5,
      };
    case 'EN_COMISION':
      return {
        etiqueta: 'En Comisión Activa',
        badgeClase: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
        dotClase: 'bg-blue-600',
        descripcion: 'El funcionario se encuentra actualmente en cumplimiento de la comisión.',
        etapaNumero: 5,
      };
    case 'PENDIENTE_LEGALIZACION':
      return {
        etiqueta: 'Requiere Legalización de Gastos',
        badgeClase: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse',
        dotClase: 'bg-amber-600',
        descripcion: 'Comisión finalizada. Debe cargar cumplido GF-FO-032 y soportes (10 días hábiles).',
        etapaNumero: 6,
      };
    case 'LEGALIZADO':
      return {
        etiqueta: 'Legalización Aprobada',
        badgeClase: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClase: 'bg-emerald-500',
        descripcion: 'Comisión y legalización concluidas exitosamente a satisfacción.',
        etapaNumero: 6,
      };
    case 'DEVUELTA':
      return {
        etiqueta: 'Devuelta para Ajustes',
        badgeClase: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClase: 'bg-rose-500',
        descripcion: 'La solicitud requiere subsanar observaciones antes de continuar.',
        etapaNumero: 2,
      };
    case 'RECHAZADO':
    case 'CANCELADA':
      return {
        etiqueta: 'Cancelada / Rechazada',
        badgeClase: 'bg-red-50 text-red-800 border-red-200',
        dotClase: 'bg-red-500',
        descripcion: 'Trámite cancelado administrativamente.',
        etapaNumero: 0,
      };
    default:
      return {
        etiqueta: String(estado).replace(/_/g, ' '),
        badgeClase: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClase: 'bg-slate-400',
        descripcion: 'Estado operativo del trámite.',
        etapaNumero: 1,
      };
  }
}

export default function ComisionadoInbox({ onIrALegalizacion }: ComisionadoInboxProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudViatico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTab, setFiltroTab] = useState<'TODAS' | 'TRAMITE' | 'PAGADAS' | 'LEGALIZAR' | 'FINALIZADAS'>('TODAS');

  // Detalle Modal
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudViatico | null>(null);
  const [solicitudCompleta, setSolicitudCompleta] = useState<SolicitudComisionResponse | null>(null);
  const [estadoFirmas, setEstadoFirmas] = useState<EstadoFirmasResponse | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [documentosSoporte, setDocumentosSoporte] = useState<DocumentoSoporte[]>([]);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const user = authService.getCurrentUserSync();
      setUsuario(user);

      const res = await viaticosService.obtenerSolicitudesComisionado();
      setSolicitudes(res.solicitudes || []);
    } catch (err: any) {
      console.error('[ComisionadoInbox] Error cargando solicitudes del comisionado:', err);
      setError('No fue posible cargar las solicitudes de comisión asociadas a su perfil.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirDetalle = async (sol: SolicitudViatico) => {
    setSolicitudSeleccionada(sol);
    setCargandoDetalle(true);
    setSolicitudCompleta(null);
    setEstadoFirmas(null);
    setDocumentosSoporte([]);

    try {
      const [completa, firmas] = await Promise.all([
        viaticosService.obtenerSolicitudCompleta(sol.id).catch(() => null),
        viaticosService.obtenerEstadoFirmas(sol.id).catch(() => null),
      ]);
      setSolicitudCompleta(completa);
      setEstadoFirmas(firmas);
      setDocumentosSoporte(completa?.documentosSoporte || []);
    } catch (e) {
      console.error('[ComisionadoInbox] Error cargando detalle de solicitud:', e);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleDescargar023 = async (sol: { id: string; codigo?: string }) => {
    setDescargandoPdf(true);
    try {
      const blob = await viaticosService.exportarFormato023(sol.id, sol.codigo || '023');
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('[ComisionadoInbox] Error descargando Formato 023:', e);
      alert('No fue posible generar el documento PDF del Formato 023 en este momento.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = solicitudes.length;
    const enTramite = solicitudes.filter((s) =>
      [
        'PENDIENTE_FIRMAS',
        'RADICADA',
        'EN_VERIFICACION',
        'VERIFICADA',
        'SOLICITADA_SIIF',
        'AUTORIZACION_DIRECCION',
        'EN_AUTORIZACION',
        'AUTORIZADA',
        'EN_PRESUPUESTO',
        'COMPROMETIDA',
        'OBLIGADA',
      ].includes(s.estado),
    ).length;

    const pagadas = solicitudes.filter((s) => s.estado === 'PAGADA' || s.estado === 'EN_COMISION').length;
    const porLegalizar = solicitudes.filter((s) => s.estado === 'PENDIENTE_LEGALIZACION').length;
    const legalizadas = solicitudes.filter((s) => s.estado === 'LEGALIZADO').length;

    const totalViaticos = solicitudes.reduce((acc, s) => acc + (Number(s.montoTotalEstimado) || 0), 0);

    return { total, enTramite, pagadas, porLegalizar, legalizadas, totalViaticos };
  }, [solicitudes]);

  // Filtro
  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((sol) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        sol.codigo.toLowerCase().includes(q) ||
        sol.ciudadDestino.toLowerCase().includes(q) ||
        (sol.departamentoDestino && sol.departamentoDestino.toLowerCase().includes(q)) ||
        (sol.ciudadOrigen && sol.ciudadOrigen.toLowerCase().includes(q)) ||
        sol.dependencia.toLowerCase().includes(q) ||
        (sol.justificacion && sol.justificacion.toLowerCase().includes(q));

      if (!coincideBusqueda) return false;

      if (filtroTab === 'TRAMITE') {
        return [
          'PENDIENTE_FIRMAS',
          'RADICADA',
          'EN_VERIFICACION',
          'VERIFICADA',
          'SOLICITADA_SIIF',
          'AUTORIZACION_DIRECCION',
          'EN_AUTORIZACION',
          'AUTORIZADA',
          'EN_PRESUPUESTO',
          'COMPROMETIDA',
          'OBLIGADA',
          'DEVUELTA',
        ].includes(sol.estado);
      }
      if (filtroTab === 'PAGADAS') {
        return sol.estado === 'PAGADA' || sol.estado === 'EN_COMISION';
      }
      if (filtroTab === 'LEGALIZAR') {
        return sol.estado === 'PENDIENTE_LEGALIZACION';
      }
      if (filtroTab === 'FINALIZADAS') {
        return sol.estado === 'LEGALIZADO';
      }
      return true;
    });
  }, [solicitudes, busqueda, filtroTab]);

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-2xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
              <User className="w-3.5 h-3.5" />
              <span>Bandeja del Comisionado</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Rol Comisionado Activo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Mis Comisiones de Servicios
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Consulte el estado, asignación presupuestal, desembolso y legalización de todas las solicitudes de
              comisión expedidas a su nombre institucional en la ESAP (Formato GF-FO-023).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cargarDatos}
              disabled={cargando}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            {kpis.porLegalizar > 0 && onIrALegalizacion && (
              <button
                type="button"
                onClick={() => onIrALegalizacion()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
              >
                <Receipt className="w-4 h-4 text-slate-950" />
                <span>Legalizar ({kpis.porLegalizar})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div
          onClick={() => setFiltroTab('TODAS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTab === 'TODAS'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Registradas</span>
            <div className="p-2 rounded-lg bg-blue-100 text-[#003DA5]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{kpis.total}</span>
            <span className="text-[11px] font-semibold text-slate-400">Comisiones</span>
          </div>
        </div>

        {/* En Trámite */}
        <div
          onClick={() => setFiltroTab('TRAMITE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTab === 'TRAMITE'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">En Trámite</span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-800">{kpis.enTramite}</span>
            <span className="text-[11px] font-semibold text-blue-600">En revisión</span>
          </div>
        </div>

        {/* Pagadas */}
        <div
          onClick={() => setFiltroTab('PAGADAS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTab === 'PAGADAS'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Pagadas</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-800">{kpis.pagadas}</span>
            <span className="text-[11px] font-semibold text-emerald-600">Desembolsadas</span>
          </div>
        </div>

        {/* Pendientes Legalización */}
        <div
          onClick={() => setFiltroTab('LEGALIZAR')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroTab === 'LEGALIZAR'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : kpis.porLegalizar > 0
              ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Por Legalizar</span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-800">{kpis.porLegalizar}</span>
            <span className="text-[11px] font-semibold text-amber-600">Cumplido 032</span>
          </div>
        </div>

        {/* Legalizadas */}
        <div
          onClick={() => setFiltroTab('FINALIZADAS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            filtroTab === 'FINALIZADAS'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Legalizadas</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800">{kpis.legalizadas}</span>
            <span className="text-[11px] font-semibold text-slate-500">Cerradas</span>
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y TABS DE ESTADO ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Pills de Filtrado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            type="button"
            onClick={() => setFiltroTab('TODAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filtroTab === 'TODAS'
                ? 'bg-[#003DA5] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({kpis.total})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTab('TRAMITE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filtroTab === 'TRAMITE'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            En Trámite ({kpis.enTramite})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTab('PAGADAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filtroTab === 'PAGADAS'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pagadas ({kpis.pagadas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTab('LEGALIZAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filtroTab === 'LEGALIZAR'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Por Legalizar ({kpis.porLegalizar})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTab('FINALIZADAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filtroTab === 'FINALIZADAS'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Legalizadas ({kpis.legalizadas})
          </button>
        </div>

        {/* Input Buscador */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, destino..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── ALERTA SI HAY LEGALIZACIONES PENDIENTES ── */}
      {kpis.porLegalizar > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <div className="p-2 rounded-xl bg-amber-200/70 text-amber-900 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-950">
              Tiene {kpis.porLegalizar} comisión(es) pendiente(s) de legalización de gastos
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              De conformidad con la normativa de viáticos de la ESAP, dispone de un plazo máximo de 10 días hábiles
              posteriores al regreso de la comisión para cargar el certificado de cumplimiento de metas y actividades
              (Formato GF-FO-032) y los soportes requeridos.
            </p>
          </div>
          {onIrALegalizacion && (
            <button
              type="button"
              onClick={() => onIrALegalizacion()}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Ir a Legalizar
            </button>
          )}
        </div>
      )}

      {/* ── LISTADO / TABLA DE COMISIONES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {cargando ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#003DA5] animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Cargando comisiones a su nombre...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">Error al consultar sus comisiones</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{error}</p>
            <button
              type="button"
              onClick={cargarDatos}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {busqueda ? 'No se encontraron comisiones que coincidan con la búsqueda' : 'No tiene comisiones registradas en esta vista'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {busqueda
                ? 'Intente buscar con otro término, código o ajuste el filtro de estado.'
                : 'Cuando el enlace de su dependencia radique una solicitud de comisión (Formato 023) a su nombre, aparecerá reflejada aquí con su avance en tiempo real.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Radicado / Código</th>
                  <th className="py-3.5 px-4">Destino e Itinerario</th>
                  <th className="py-3.5 px-4">Fechas y Duración</th>
                  <th className="py-3.5 px-4">Monto Liquidado</th>
                  <th className="py-3.5 px-4">Estado del Trámite</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {solicitudesFiltradas.map((sol) => {
                  const visual = getEstadoComisionVisual(sol.estado);
                  const esPorLegalizar = sol.estado === 'PENDIENTE_LEGALIZACION';

                  return (
                    <tr
                      key={sol.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => abrirDetalle(sol)}
                    >
                      {/* Código */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-[#003DA5]">{sol.codigo}</span>
                          {sol.extemporanea && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              EXT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{sol.dependencia}</span>
                        </div>
                      </td>

                      {/* Destino */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{sol.ciudadDestino}</span>
                          {sol.departamentoDestino && (
                            <span className="text-slate-400 font-normal">({sol.departamentoDestino})</span>
                          )}
                        </div>
                        {sol.ciudadOrigen && (
                          <div className="text-[11px] text-slate-400 mt-0.5 pl-5">
                            Origen: {sol.ciudadOrigen}
                          </div>
                        )}
                        {sol.justificacion && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic max-w-xs">
                            "{sol.justificacion}"
                          </p>
                        )}
                      </td>

                      {/* Fechas */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {formatearFecha(sol.fechaInicio)} — {formatearFecha(sol.fechaFin)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 pl-5">
                          {sol.diasComision} {sol.diasComision === 1 ? 'día hábil' : 'días de comisión'}
                        </div>
                      </td>

                      {/* Monto */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900">
                          {formatearPesosCOP(sol.montoTotalEstimado)}
                        </div>
                        {sol.numeroRp && (
                          <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                            RP: {sol.numeroRp}
                          </div>
                        )}
                        {sol.numeroObligacion && (
                          <div className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block ml-1 mt-1">
                            OBL: {sol.numeroObligacion}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 align-top">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${visual.badgeClase}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${visual.dotClase}`} />
                          <span>{visual.etiqueta}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-tight">
                          {visual.descripcion}
                        </p>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(sol)}
                            className="p-2 rounded-xl text-slate-500 hover:text-[#003DA5] hover:bg-blue-50 transition-colors"
                            title="Ver detalle completo de la comisión"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDescargar023(sol)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Descargar Formato 023 (PDF)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {esPorLegalizar && onIrALegalizacion && (
                            <button
                              type="button"
                              onClick={() => onIrALegalizacion(sol.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow-xs"
                              title="Legalizar esta comisión"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Legalizar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL DETALLE DE LA COMISIÓN ── */}
      {solicitudSeleccionada && (
        <ViaticoModal
          open={Boolean(solicitudSeleccionada)}
          onClose={() => setSolicitudSeleccionada(null)}
          title={`Comisión de Servicios ${solicitudSeleccionada.codigo}`}
          eyebrow="Detalle y Trazabilidad de la Comisión · ESAP"
          description={`Comisionado: ${solicitudSeleccionada.nombreComisionado} · Destino: ${solicitudSeleccionada.ciudadDestino}`}
          size="xl"
          icon={<Plane className="w-5 h-5 text-[#003DA5]" />}
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <span>Estado actual:</span>
                <span className="font-bold text-slate-700">
                  {getEstadoComisionVisual(solicitudSeleccionada.estado).etiqueta}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDescargar023(solicitudSeleccionada)}
                  disabled={descargandoPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>{descargandoPdf ? 'Generando...' : 'Descargar Formato 023'}</span>
                </button>
                {solicitudSeleccionada.estado === 'PENDIENTE_LEGALIZACION' && onIrALegalizacion && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = solicitudSeleccionada.id;
                      setSolicitudSeleccionada(null);
                      onIrALegalizacion(id);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all shadow-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Cargar Legalización (GF-FO-032)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSolicitudSeleccionada(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          }
        >
          <div className="p-6 space-y-6">
            {cargandoDetalle ? (
              <div className="py-16 text-center">
                <Loader2 className="w-7 h-7 text-[#003DA5] animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Cargando expediente institucional de la comisión...</p>
              </div>
            ) : (
              <>
                {/* ── STEPPER DE ETAPAS OPERATIVAS ── */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Flujo Institucional del Trámite (Etapas 1 a 9)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      {
                        num: 1,
                        titulo: 'Radicación & Firmas',
                        activo: ['PENDIENTE_FIRMAS', 'RADICADA', 'EN_VERIFICACION', 'VERIFICADA', 'SOLICITADA_SIIF', 'AUTORIZADA', 'COMPROMETIDA', 'OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: solicitudSeleccionada.estado === 'PENDIENTE_FIRMAS',
                      },
                      {
                        num: 2,
                        titulo: 'Revisión Técnica',
                        activo: ['RADICADA', 'EN_VERIFICACION', 'VERIFICADA', 'SOLICITADA_SIIF', 'AUTORIZADA', 'COMPROMETIDA', 'OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: ['RADICADA', 'EN_VERIFICACION'].includes(solicitudSeleccionada.estado),
                      },
                      {
                        num: 3,
                        titulo: 'Control & Autorización',
                        activo: ['VERIFICADA', 'SOLICITADA_SIIF', 'AUTORIZACION_DIRECCION', 'AUTORIZADA', 'COMPROMETIDA', 'OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: ['VERIFICADA', 'SOLICITADA_SIIF', 'AUTORIZACION_DIRECCION', 'AUTORIZADA'].includes(solicitudSeleccionada.estado),
                      },
                      {
                        num: 4,
                        titulo: 'Presupuesto SIIF (RP)',
                        activo: ['COMPROMETIDA', 'OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: ['COMPROMETIDA', 'OBLIGADA'].includes(solicitudSeleccionada.estado),
                      },
                      {
                        num: 5,
                        titulo: 'Pago Tesorería',
                        activo: ['PAGADA', 'EN_COMISION', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: ['PAGADA', 'EN_COMISION'].includes(solicitudSeleccionada.estado),
                      },
                      {
                        num: 6,
                        titulo: 'Legalización (032)',
                        activo: ['LEGALIZADO'].includes(solicitudSeleccionada.estado),
                        actual: solicitudSeleccionada.estado === 'PENDIENTE_LEGALIZACION',
                      },
                    ].map((step) => (
                      <div
                        key={step.num}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          step.actual
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                            : step.activo
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-slate-100/60 border-slate-200/60 text-slate-400'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 mx-auto rounded-full text-[10px] font-black flex items-center justify-center mb-1 ${
                            step.actual
                              ? 'bg-[#003DA5] text-white'
                              : step.activo
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {step.activo && !step.actual ? <Check className="w-3 h-3" /> : step.num}
                        </div>
                        <p className="text-[11px] font-bold leading-tight">{step.titulo}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── TARJETAS DE INFORMACIÓN GENERAL Y LIQUIDACIÓN ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Datos del Itinerario */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Destino e Itinerario</span>
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Ciudad Destino:</span>
                        <span className="font-bold text-slate-800">
                          {solicitudSeleccionada.ciudadDestino} ({solicitudSeleccionada.departamentoDestino || 'N/A'})
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Sede / Ciudad Origen:</span>
                        <span className="font-semibold text-slate-700">
                          {solicitudSeleccionada.ciudadOrigen || solicitudSeleccionada.sedeOrigen || 'Sede Central'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Período de Comisión:</span>
                        <span className="font-semibold text-slate-700">
                          {formatearFecha(solicitudSeleccionada.fechaInicio)} al {formatearFecha(solicitudSeleccionada.fechaFin)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Duración:</span>
                        <span className="font-semibold text-slate-700">
                          {solicitudSeleccionada.diasComision} día(s)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Dependencia:</span>
                        <span className="font-semibold text-slate-700">{solicitudSeleccionada.dependencia}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-medium">Cargo Comisionado:</span>
                        <span className="font-semibold text-slate-700">
                          {solicitudSeleccionada.cargoComisionado || 'Funcionario'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Liquidación Económica */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Liquidación y Presupuesto</span>
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Viáticos Diarios Calculados:</span>
                        <span className="font-semibold text-slate-800">
                          {formatearPesosCOP(
                            solicitudSeleccionada.montoViaticos ?? solicitudSeleccionada.montoSolicitadoViaticos,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Gastos de Transporte / Terminal:</span>
                        <span className="font-semibold text-slate-800">
                          {formatearPesosCOP(
                            solicitudSeleccionada.montoGastosViaje ?? solicitudSeleccionada.montoSolicitadoGastosViaje,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-200 bg-slate-50 px-2 rounded-lg">
                        <span className="text-slate-800 font-bold">Total Liquidado:</span>
                        <span className="font-black text-slate-900 text-sm text-[#003DA5]">
                          {formatearPesosCOP(solicitudSeleccionada.montoTotalEstimado)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Registro Presupuestal (RP):</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {solicitudSeleccionada.numeroRp || 'Pendiente de expedición'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400 font-medium">Obligación Presupuestal SIIF:</span>
                        <span className="font-mono font-bold text-teal-700">
                          {solicitudSeleccionada.numeroObligacion || 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-medium">Modalidad de Pago:</span>
                        <span className="font-semibold text-slate-700">
                          {solicitudSeleccionada.modalidadPago || 'AVANCE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── OBJETO DE LA COMISIÓN ── */}
                {solicitudSeleccionada.justificacion && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Objeto Oficial de la Comisión</span>
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {solicitudSeleccionada.justificacion}
                    </p>
                  </div>
                )}

                {/* ── FIRMAS DEL FORMATO 023 ── */}
                {estadoFirmas && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSignature className="w-3.5 h-3.5 text-purple-600" />
                      <span>Firmas Digitales del Formato GF-FO-023</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Firma 1: Jefe / Gerente */}
                      <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">1. Visto Bueno Dependencia</span>
                          {estadoFirmas.jefeFirmado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Firmado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                        {estadoFirmas.jefeNombre && (
                          <p className="text-[11px] text-slate-500 mt-1">Por: {estadoFirmas.jefeNombre}</p>
                        )}
                        {estadoFirmas.jefeFirmadoEn && (
                          <p className="text-[10px] text-slate-400">Fecha: {formatearFecha(estadoFirmas.jefeFirmadoEn)}</p>
                        )}
                      </div>

                      {/* Firma 2: Subdirección / Ordenador */}
                      <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">2. Ordenación del Gasto</span>
                          {estadoFirmas.subdirectorFirmado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Firmado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                        {estadoFirmas.subdirectorNombre && (
                          <p className="text-[11px] text-slate-500 mt-1">Por: {estadoFirmas.subdirectorNombre}</p>
                        )}
                        {estadoFirmas.subdirectorFirmadoEn && (
                          <p className="text-[10px] text-slate-400">
                            Fecha: {formatearFecha(estadoFirmas.subdirectorFirmadoEn)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DOCUMENTOS DE SOPORTE ── */}
                {documentosSoporte.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Documentos de Soporte Radicados ({documentosSoporte.length})</span>
                    </h5>
                    <div className="divide-y divide-slate-100">
                      {documentosSoporte.map((doc) => (
                        <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-800">{doc.nombreArchivoOriginal}</p>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {doc.tipoDocumento.replace(/_/g, ' ').toLowerCase()}
                              </p>
                            </div>
                          </div>
                          {doc.urlRepositorio && (
                            <a
                              href={doc.urlRepositorio}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-[#003DA5] hover:underline"
                            >
                              Ver archivo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ViaticoModal>
      )}
    </div>
  );
}
