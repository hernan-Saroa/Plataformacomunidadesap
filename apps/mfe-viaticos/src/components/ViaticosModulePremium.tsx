import { useEffect, useState } from 'react';
import {
  Plane,
  FileText,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  DollarSign,
  MapPin,
  Calendar,
  Receipt,
  FileCheck,
  Eye,
  CreditCard,
  X,
  UserCheck,
  Settings,
  Download,
} from 'lucide-react';
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import SearchableSelect from './SearchableSelect';
import { SolicitudViatico, ResumenEstadisticoViaticos, SolicitudComisionResponse, DocumentoSoporte } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import ParametrizacionManager from './ParametrizacionManager';
import { formatearMoneda, getConfigEstado } from '../utils/viaticosUtils';

type Seccion = 'solicitudes' | 'tiquetes' | 'legalizaciones' | 'resoluciones' | 'configuracion';

export default function ViaticosModulePremium() {
  const [seccion, setSeccion] = useState<Seccion>('solicitudes');
  const [solicitudes, setSolicitudes] = useState<SolicitudViatico[]>([]);
  const [resumen, setResumen] = useState<ResumenEstadisticoViaticos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [modalNuevaAbierta, setModalNuevaAbierta] = useState(false);
  const [solicitudAResumir, setSolicitudAResumir] = useState<SolicitudComisionResponse | null>(null);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudViatico | null>(null);
  const [documentosSoporte, setDocumentosSoporte] = useState<DocumentoSoporte[]>([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { solicitudes: list, esSuperAdmin: esSuperAdminResp } = await viaticosService.obtenerSolicitudes();
      console.log('[ViaticosModulePremium] solicitudes cargadas=', list.length, 'esSuperAdmin=', esSuperAdminResp);
      setSolicitudes(list);
      setEsSuperAdmin(esSuperAdminResp);
      const res = await viaticosService.obtenerResumenEstadistico();
      setResumen(res);
    } catch (e) {
      console.error('Error cargando viáticos:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const grupos: MenuGroup[] = [
    {
      title: 'GESTIÓN PRINCIPAL',
      items: [
        {
          id: 'solicitudes',
          label: 'Solicitudes y Comisiones',
          subtitle: 'Comisiones de servicios oficiales',
          icon: <Plane className="w-5 h-5" />,
          color: '#003DA5',
        },
        {
          id: 'tiquetes',
          label: 'Pasajes y Alojamiento',
          subtitle: 'Reservas aéreas y terrestres',
          icon: <CreditCard className="w-5 h-5" />,
          color: '#059669',
        },
        {
          id: 'legalizaciones',
          label: 'Legalización de Gastos',
          subtitle: 'Carga de facturas y cumplidos',
          icon: <Receipt className="w-5 h-5" />,
          color: '#D97706',
        },
        {
          id: 'resoluciones',
          label: 'Resoluciones Institucionales',
          subtitle: 'Actos administrativos de comisión',
          icon: <FileCheck className="w-5 h-5" />,
          color: '#7C3AED',
        },
        {
          id: 'configuracion',
          label: 'Configuración',
          subtitle: 'Parametrización de formulario y documentos',
          icon: <Settings className="w-5 h-5" />,
          color: '#64748B',
        },
      ],
    },
  ];

  const solicitudesFiltradas = solicitudes.filter((sol) => {
    const termino = busqueda.toLowerCase();
    const cumpleBusqueda =
      !termino ||
      sol.nombreComisionado.toLowerCase().includes(termino) ||
      sol.codigo.toLowerCase().includes(termino) ||
      sol.ciudadDestino.toLowerCase().includes(termino) ||
      sol.dependencia.toLowerCase().includes(termino);
    const cumpleEstado = filtroEstado === 'TODOS' || sol.estado === filtroEstado;
    return cumpleBusqueda && cumpleEstado;
  });

  const getBadgeEstado = (estado: string) => {
    const c = getConfigEstado(estado);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const handleSolicitudCreada = (solicitud: SolicitudComisionResponse) => {
    const ref = solicitud.consecutivoUnico || 'su solicitud';
    setMensajeExito(`La solicitud ${ref} fue radicada correctamente.`);
    cargarDatos();
  };

  const handleVerDetalle = async (sol: SolicitudViatico) => {
    setSolicitudSeleccionada(sol);
    setCargandoDocumentos(true);
    setDocumentosSoporte([]);
    try {
      const completa = await viaticosService.obtenerSolicitudCompleta(sol.id);
      setDocumentosSoporte(completa.documentosSoporte || []);
    } catch (e) {
      console.error('Error cargando documentos de soporte:', e);
    } finally {
      setCargandoDocumentos(false);
    }
  };

  const handleExportarPDF = async (solicitud: SolicitudViatico) => {
    setExportando(true);
    try {
      const blob = await viaticosService.exportarFormato023(solicitud.id, solicitud.codigo);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setMensajeExito(`Formato 023 de la solicitud ${solicitud.codigo} generado.`);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error al exportar Formato 023:', error);
      setMensajeExito('Error al exportar el Formato 023. Intente nuevamente.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <ModuleLayout
      moduleName="VIÁTICOS Y GASTOS DE VIAJE"
      moduleDescription="Gestión de Comisiones de Servicios y Tiquetes Institucionales · ESAP"
      moduleIcon={<Plane className="w-6 h-6" />}
      moduleColor="#003DA5"
      groups={grupos}
      activeSection={seccion}
      onSectionChange={(s) => {
        setSeccion(s as Seccion);
        setModalNuevaAbierta(false);
        setSolicitudSeleccionada(null);
      }}
    >
      {mensajeExito && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {mensajeExito}
          </span>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {modalNuevaAbierta || solicitudAResumir ? (
        <NuevaSolicitudModal
          abierta={modalNuevaAbierta || Boolean(solicitudAResumir)}
          onCerrar={() => {
            setModalNuevaAbierta(false);
            setSolicitudAResumir(null);
          }}
          onSolicitudCreada={handleSolicitudCreada}
          solicitudAResumir={solicitudAResumir}
        />
      ) : (
        <>
          {/* ── KPI HEADER ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Solicitudes</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.totalSolicitudes || 0}</h3>
                <p className="text-xs text-blue-600 font-medium mt-1">Registradas en vigencia</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center font-bold">
                <Plane className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Aprobación</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.enProcesoAprobacion || 0}</h3>
                <p className="text-xs text-amber-600 font-medium mt-1">Pendientes por VoBo</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Comisión</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.enComisionActivas || 0}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Funcionarios en territorio</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <MapPin className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Total Estimado</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {formatearMoneda(resumen?.montoTotalEjecutado || 0)}
                </h3>
                <p className="text-xs text-purple-600 font-medium mt-1">Viáticos + Gastos de viaje</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ── SOLICITUDES ── */}
          {seccion === 'solicitudes' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-[#003DA5]" />
                    Solicitudes de Comisión y Viáticos
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proceso de aprobación, emisión de tiquetes y resoluciones para comisiones institucionales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevaAbierta(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Solicitud de Comisión
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 my-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por funcionario, código, ciudad o dependencia..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <SearchableSelect
                    id="filtroEstado"
                    options={[
                      { value: 'TODOS', label: 'Todos los Estados' },
                      { value: 'PENDIENTE', label: 'Pendiente (borrador)' },
                      { value: 'SOLICITADO', label: 'Solicitado' },
                      { value: 'APROBADO_TALENTO_HUMANO', label: 'Aprobado TH' },
                      { value: 'RESOLUCION_EMITIDA', label: 'Resolución Emitida' },
                      { value: 'EN_COMISION', label: 'En Comisión' },
                      { value: 'LEGALIZADO', label: 'Legalizado' },
                    ]}
                    value={filtroEstado}
                    onChange={(valor) => setFiltroEstado(valor)}
                    placeholder="Filtrar por estado"
                  />
                </div>
              </div>

              {cargando && solicitudes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Cargando solicitudes de viáticos...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Código / Solicitante</th>
                        <th className="px-4 py-3">Destino / Fechas</th>
                        <th className="px-4 py-3">Tipo & Transporte</th>
                        <th className="px-4 py-3">Monto Estimado</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {solicitudesFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No se encontraron solicitudes de viáticos registradas.
                          </td>
                        </tr>
                      ) : (
                        solicitudesFiltradas.map((sol) => (
                          <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-slate-400 tracking-wide">{sol.codigo}</span>
                                {esSuperAdmin && sol.esCreadoPorMi && (
                                  <span
                                    className="inline-flex items-center text-blue-500"
                                    title="Radicada por mí"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-slate-800 text-sm mt-0.5">{sol.nombreComisionado}</div>
                              <div className="text-[11px] text-slate-400">
                                {sol.cargoComisionado} · {sol.dependencia}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 font-bold text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                {sol.ciudadDestino} ({sol.departamentoDestino})
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {sol.fechaInicio} al {sol.fechaFin} ({sol.diasComision} días)
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {sol.tipoComision.replace(/_/g, ' ')}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <Plane className="w-3 h-3 text-blue-500" />
                                {sol.medioTransporte}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black text-slate-900 text-sm">
                                {formatearMoneda(sol.montoTotalEstimado)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Viáticos: {formatearMoneda(sol.montoSolicitadoViaticos)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {getBadgeEstado(sol.estado)}
                                {sol.radicadoFueraJornada && (
                                  <span
                                    className="inline-flex items-center text-amber-600"
                                    title="Radicado fuera de jornada"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </td>
                             <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleExportarPDF(sol)}
                                    disabled={exportando}
                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors disabled:opacity-50"
                                    title="Exportar Formato 023"
                                    aria-label="Exportar Formato 023"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                    <button
                                      type="button"
                                      onClick={() => handleVerDetalle(sol)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    title="Ver Detalle"
                                    aria-label="Ver Detalle"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  </button>
                                  {sol.estado === 'PENDIENTE' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const completa = await viaticosService.obtenerSolicitudCompleta(sol.id);
                                        setSolicitudAResumir(completa);
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                      title="Continuar solicitud en borrador"
                                      aria-label="Continuar solicitud"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                             </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TIQUETES ── */}
          {seccion === 'tiquetes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    Reserva y Emisión de Pasajes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gestión de itinerarios, pasajes aéreos y terrestres para funcionarios en comisión de servicios.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                  Convenio Marco Satena / Avianca / Clic
                </span>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                La gestión de pasajes y alojamiento se habilita tras la emisión de la resolución de comisión.
              </div>
            </div>
          )}

          {/* ── LEGALIZACIONES ── */}
          {seccion === 'legalizaciones' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-600" />
                    Legalización y Cumplido de Comisión
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revisión de facturas, cumplidos firmados y cálculo de reintegros o devoluciones.
                  </p>
                </div>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Cargue de soportes de legalización activo para comisiones finalizadas.
              </div>
            </div>
          )}

          {/* ── RESOLUCIONES ── */}
          {seccion === 'resoluciones' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                    Resoluciones Institucionales de Comisión
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Actos administrativos oficializados por la Subdirección de Gestión Institucional.
                  </p>
                </div>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Las resoluciones asociadas a cada solicitud aparecerán aquí tras su aprobación.
              </div>
            </div>
          )}

          {/* ── MODAL DETALLE DE SOLICITUD ── */}
          {solicitudSeleccionada && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-6rem)]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 tracking-wide truncate">{solicitudSeleccionada.codigo}</span>
                      {esSuperAdmin && solicitudSeleccionada.esCreadoPorMi && (
                        <span
                          className="inline-flex items-center text-blue-500"
                          title="Radicada por mí"
                        >
                          <UserCheck className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-slate-900 truncate">{solicitudSeleccionada.nombreComisionado}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSolicitudSeleccionada(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                    aria-label="Cerrar detalle"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-2.5 text-xs overflow-y-auto flex-1 min-h-0 scrollbar-thin">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Cargo</span>
                      <span className="font-semibold text-slate-800 text-xs">{solicitudSeleccionada.cargoComisionado}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Dependencia</span>
                      <span className="font-semibold text-slate-800 text-xs">{solicitudSeleccionada.dependencia}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Destino</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {solicitudSeleccionada.ciudadDestino} ({solicitudSeleccionada.departamentoDestino})
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Fechas</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {solicitudSeleccionada.fechaInicio} → {solicitudSeleccionada.fechaFin}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estado</span>
                    <span>{getBadgeEstado(solicitudSeleccionada.estado)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Justificación</span>
                    <p className="bg-slate-50 p-2.5 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                      {solicitudSeleccionada.justificacion}
                    </p>
                  </div>
                  {cargandoDocumentos ? (
                    <div className="py-2 text-xs text-slate-400">Cargando archivos...</div>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Archivos adjuntos</span>
                      {documentosSoporte.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay documentos adjuntos.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {documentosSoporte.map((doc) => {
                            const urlArchivo = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
                            return (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{doc.nombreArchivoOriginal}</p>
                                  <p className="text-[10px] text-slate-500">{doc.tipoDocumento}</p>
                                </div>
                                <div className="shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => window.open(urlArchivo, '_blank', 'noopener,noreferrer')}
                                    className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200"
                                    title="Abrir en nueva pestaña"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => solicitudSeleccionada && handleExportarPDF(solicitudSeleccionada)}
                    disabled={exportando}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportando ? 'Exportando...' : 'Exportar PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolicitudSeleccionada(null)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CONFIGURACIÓN ── */}
      {seccion === 'configuracion' && <ParametrizacionManager />}
    </ModuleLayout>
  );
}
