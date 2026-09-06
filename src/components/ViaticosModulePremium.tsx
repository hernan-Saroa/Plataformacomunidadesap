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
  Send,
  Undo2,
  Flag,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import SearchableSelect from './SearchableSelect';
import { SolicitudViatico, ResumenEstadisticoViaticos, SolicitudComisionResponse, DocumentoSoporte, ResultadoConsolidacion } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import ParametrizacionManager from './ParametrizacionManager';
import { formatearMoneda, getConfigEstado } from '../utils/viaticosUtils';

type Seccion = 'solicitudes' | 'tiquetes' | 'legalizaciones' | 'resoluciones' | 'configuracion';

type VistaBandeja = 'solicitante' | 'secretario' | 'analistas';

/**
 * Orden de la vista general de solicitudes por estado (segÃºn requerimiento):
 * 1) Radicadas, 2) ExtemporÃ¡neas, 3) Solicitadas (en revisiÃ³n), 4) Pendientes
 * (borradores) y el resto al final.
 */
const ORDEN_ESTADOS_TABLA: Record<string, number> = {
  RADICADA: 1,
  EXTEMPORANEA: 2,
  SOLICITADO: 3,
  PENDIENTE: 4,
};

function prioridadEstadoTabla(estado: string): number {
  return ORDEN_ESTADOS_TABLA[estado] ?? 5;
}

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
  const [vistaBandeja, setVistaBandeja] = useState<VistaBandeja>('solicitante');
  const [solicitudesSecretario, setSolicitudesSecretario] = useState<SolicitudListaResponse[]>([]);
  const [totalSecretario, setTotalSecretario] = useState(0);
  const [pageSecretario, setPageSecretario] = useState(1);
  const [limitSecretario] = useState(20);
  const [cargandoSecretario, setCargandoSecretario] = useState(false);
  const [filtroDependencia, setFiltroDependencia] = useState('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [solicitudEnRevision, setSolicitudEnRevision] = useState<SolicitudListaResponse | null>(null);
  const [prioridadSeleccionada, setPrioridadSeleccionada] = useState<string>('');
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [guardandoPrioridad, setGuardandoPrioridad] = useState(false);
  const [devolviendo, setDevolviendo] = useState(false);

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
      console.error('Error cargando viÃ¡ticos:', e);
    } finally {
      setCargando(false);
    }
  };

  const cargarBandejaSecretario = async () => {
    setCargandoSecretario(true);
    try {
      const resp = await viaticosService.obtenerBandejaSecretario({
        dependenciaId: filtroDependencia || undefined,
        fechaInicio: filtroFechaInicio || undefined,
        fechaFin: filtroFechaFin || undefined,
        page: pageSecretario,
        limit: limitSecretario,
      });
      setSolicitudesSecretario(resp.data);
      setTotalSecretario(resp.total);
    } catch (e) {
      console.error('Error cargando bandeja secretario:', e);
    } finally {
      setCargandoSecretario(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (vistaBandeja === 'secretario') {
      cargarBandejaSecretario();
    }
  }, [vistaBandeja, pageSecretario, filtroDependencia, filtroFechaInicio, filtroFechaFin]);

  const grupos: MenuGroup[] = [
    {
      title: 'GESTIÃ“N PRINCIPAL',
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
          subtitle: 'Reservas aÃ©reas y terrestres',
          icon: <CreditCard className="w-5 h-5" />,
          color: '#059669',
        },
        {
          id: 'legalizaciones',
          label: 'LegalizaciÃ³n de Gastos',
          subtitle: 'Carga de facturas y cumplidos',
          icon: <Receipt className="w-5 h-5" />,
          color: '#D97706',
        },
        {
          id: 'resoluciones',
          label: 'Resoluciones Institucionales',
          subtitle: 'Actos administrativos de comisiÃ³n',
          icon: <FileCheck className="w-5 h-5" />,
          color: '#7C3AED',
        },
        {
          id: 'configuracion',
          label: 'ConfiguraciÃ³n',
          subtitle: 'ParametrizaciÃ³n de formulario y documentos',
          icon: <Settings className="w-5 h-5" />,
          color: '#64748B',
        },
      ],
    },
  ];

  const solicitudesFiltradas = solicitudes
    .filter((sol) => {
      const termino = busqueda.toLowerCase();
      const cumpleBusqueda =
        !termino ||
        sol.nombreComisionado.toLowerCase().includes(termino) ||
        sol.codigo.toLowerCase().includes(termino) ||
        sol.ciudadDestino.toLowerCase().includes(termino) ||
        sol.dependencia.toLowerCase().includes(termino);
      const cumpleEstado = filtroEstado === 'TODOS' || sol.estado === filtroEstado;
      return cumpleBusqueda && cumpleEstado;
    })
    // Orden por prioridad de estado y, dentro del mismo estado, por fecha de
    // creaciÃ³n (mÃ¡s reciente primero).
    .sort(
      (a, b) =>
        prioridadEstadoTabla(a.estado) - prioridadEstadoTabla(b.estado) ||
        (a.creadoEn < b.creadoEn ? 1 : -1),
    );

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

  /**
   * RF-LIQ-004 â€” Maneja la consolidaciÃ³n exitosa del expediente: refresca la
   * bandeja y muestra el aviso de que el expediente quedÃ³ en revisiÃ³n del
   * Grupo de ViÃ¡ticos (estado SOLICITADO / solo lectura).
   */
  const handleSolicitudConsolidada = (
    resultado: ResultadoConsolidacion,
  ) => {
    const ref = resultado.consecutivoUnico || 'el expediente';
    setMensajeExito(
      `El expediente ${ref} fue consolidado y enviado a revisiÃ³n del Grupo de ViÃ¡ticos.`,
    );
    setSolicitudAResumir(null);
    cargarDatos();
  };

  /** Abre el modal en modo consolidaciÃ³n (Paso 4) para un expediente radicado. */
  const handleConsolidar = async (sol: SolicitudViatico) => {
    try {
      const completa = await viaticosService.obtenerSolicitudCompleta(sol.id);
      setSolicitudAResumir(completa);
    } catch (e) {
      console.error('Error abriendo consolidaciÃ³n:', e);
      setMensajeExito('No fue posible abrir el expediente para consolidaciÃ³n.');
    }
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

  const handleExportarPDF = async (solicitud: { id: string; codigo?: string; consecutivoUnico?: string }) => {
    setExportando(true);
    try {
      const codigo = solicitud.codigo || solicitud.consecutivoUnico || '';
      const blob = await viaticosService.exportarFormato023(solicitud.id, codigo);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setMensajeExito(`Formato 023 de la solicitud ${codigo} generado.`);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error al exportar Formato 023:', error);
      setMensajeExito('Error al exportar el Formato 023. Intente nuevamente.');
    } finally {
      setExportando(false);
    }
  };

  const handleGuardarPrioridad = async () => {
    if (!solicitudEnRevision || !prioridadSeleccionada) return;
    setGuardandoPrioridad(true);
    try {
      await viaticosService.actualizarPrioridad(solicitudEnRevision.id, prioridadSeleccionada);
      setMensajeExito(`Prioridad actualizada a ${prioridadSeleccionada} correctamente.`);
      cargarBandejaSecretario();
      setSolicitudEnRevision((prev) => prev ? { ...prev, prioridad: prioridadSeleccionada } : null);
    } catch (error) {
      console.error('Error guardando prioridad:', error);
      setMensajeExito('No fue posible actualizar la prioridad.');
    } finally {
      setGuardandoPrioridad(false);
    }
  };

  const handleDevolverSolicitud = async () => {
    if (!solicitudEnRevision || !motivoDevolucion.trim()) return;
    setDevolviendo(true);
    try {
      await viaticosService.devolverSolicitud(solicitudEnRevision.id, motivoDevolucion.trim());
      setMensajeExito('Solicitud devuelta a la dependencia correctamente.');
      setSolicitudEnRevision(null);
      setMotivoDevolucion('');
      cargarBandejaSecretario();
    } catch (error) {
      console.error('Error devolviendo solicitud:', error);
      setMensajeExito('No fue posible devolver la solicitud.');
    } finally {
      setDevolviendo(false);
    }
  };

  return (
    <ModuleLayout
      moduleName="VIÃTICOS Y GASTOS DE VIAJE"
      moduleDescription="GestiÃ³n de Comisiones de Servicios y Tiquetes Institucionales Â· ESAP"
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
            âœ•
          </button>
        </div>
      )}

      {esSuperAdmin && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-xs p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVistaBandeja('solicitante')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              vistaBandeja === 'solicitante'
                ? 'bg-[#003DA5] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Inbox className="w-4 h-4 inline mr-1.5" />
            Bandeja Solicitante
          </button>
          <button
            type="button"
            onClick={() => setVistaBandeja('secretario')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              vistaBandeja === 'secretario'
                ? 'bg-[#003DA5] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-1.5" />
            Bandeja Secretario
          </button>
          <button
            type="button"
            onClick={() => setVistaBandeja('analistas')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              vistaBandeja === 'analistas'
                ? 'bg-[#003DA5] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck className="w-4 h-4 inline mr-1.5" />
            Bandeja Analistas
          </button>
          <button
            type="button"
            onClick={() => setVistaBandeja('configuracion')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              vistaBandeja === 'configuracion'
                ? 'bg-[#003DA5] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1.5" />
            Configuraciones
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
          onSolicitudConsolidada={handleSolicitudConsolidada}
          solicitudAResumir={solicitudAResumir}
          esSuperAdmin={esSuperAdmin}
        />
      ) : (
        <>
          {(() => {
            if (esSuperAdmin && vistaBandeja === 'secretario') {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-[#003DA5]" />
                        Bandeja de Entrada — Secretario/a de Viáticos
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Solicitudes en estado SOLICITADO para revisiÃ³n y priorizaciÃ³n.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 my-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Buscar por funcionario, cÃ³digo, ciudad o dependencia..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={filtroFechaInicio}
                        onChange={(e) => setFiltroFechaInicio(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-400">al</span>
                      <input
                        type="date"
                        value={filtroFechaFin}
                        onChange={(e) => setFiltroFechaFin(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {cargandoSecretario ? (
                    <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Cargando bandeja...
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Consecutivo</th>
                            <th className="px-4 py-3">Comisionado</th>
                            <th className="px-4 py-3">Dependencia</th>
                            <th className="px-4 py-3">Fechas / Itinerario</th>
                            <th className="px-4 py-3">Extemporalidad</th>
                            <th className="px-4 py-3">Soportes</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {solicitudesSecretario.filter((sol) => {
                            const termino = busqueda.toLowerCase();
                            const cumpleBusqueda =
                              !termino ||
                              sol.consecutivoUnico.toLowerCase().includes(termino) ||
                              (sol.comisionado?.primerNombre || '').toLowerCase().includes(termino) ||
                              (sol.comisionado?.primerApellido || '').toLowerCase().includes(termino) ||
                              (sol.comisionado?.numeroDocumento || '').includes(termino) ||
                              sol.destinoCiudad.toLowerCase().includes(termino);
                            return cumpleBusqueda;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                No se encontraron solicitudes en la bandeja.
                              </td>
                            </tr>
                          ) : (
                            solicitudesSecretario
                              .filter((sol) => {
                                const termino = busqueda.toLowerCase();
                                const cumpleBusqueda =
                                  !termino ||
                                  sol.consecutivoUnico.toLowerCase().includes(termino) ||
                                  (sol.comisionado?.primerNombre || '').toLowerCase().includes(termino) ||
                                  (sol.comisionado?.primerApellido || '').toLowerCase().includes(termino) ||
                                  (sol.comisionado?.numeroDocumento || '').includes(termino) ||
                                  sol.destinoCiudad.toLowerCase().includes(termino);
                                return cumpleBusqueda;
                              })
                              .map((sol) => (
                              <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="font-mono text-[10px] text-slate-400 tracking-wide">{sol.consecutivoUnico}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-800 text-sm">
                                    {sol.comisionado
                                      ? `${sol.comisionado.primerNombre} ${sol.comisionado.primerApellido}`
                                      : 'Comisionado'}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {sol.comisionado?.numeroDocumento || ''}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-700">
                                    {sol.comisionado?.tipoComisionado || ''}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1 font-bold text-slate-700">
                                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                                    {sol.destinoCiudad} ({sol.destinoDepartamento})
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {sol.fechaInicio?.slice(0, 10)} al {sol.fechaFin?.slice(0, 10)}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {sol.extemporanea && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                      ExtemporÃ¡nea
                                    </span>
                                  )}
                                  {!sol.extemporanea && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                      A tiempo
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-600 font-semibold">
                                    {sol.documentosSoporte?.length || 0} / 5 PDF
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const completa = await viaticosService.obtenerSolicitudCompleta(sol.id);
                                      setSolicitudEnRevision(completa);
                                      setPrioridadSeleccionada(completa.prioridad || 'MEDIA');
                                      setMotivoDevolucion('');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                                  >
                                    Revisar
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            }

            if (esSuperAdmin && vistaBandeja === 'analistas') {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-purple-600" />
                        Bandeja de Analistas
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Vista en construcciÃ³n para el rol Analista de ViÃ¡ticos.
                      </p>
                    </div>
                  </div>
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    PrÃ³ximamente disponible.
                  </div>
                </div>
              );
            }

            if (esSuperAdmin && vistaBandeja === 'configuracion') {
              return <ParametrizacionManager />;
            }

            return (
              <>
                {/* â”€â”€ KPI HEADER â”€â”€ */}
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
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En AprobaciÃ³n</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.enProcesoAprobacion || 0}</h3>
                      <p className="text-xs text-amber-600 font-medium mt-1">Pendientes por VoBo</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En ComisiÃ³n</p>
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
                      <p className="text-xs text-purple-600 font-medium mt-1">ViÃ¡ticos + Gastos de viaje</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* â”€â”€ SOLICITUDES â”€â”€ */}
                {seccion === 'solicitudes' && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Plane className="w-5 h-5 text-[#003DA5]" />
                          Solicitudes de ComisiÃ³n y ViÃ¡ticos
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Proceso de aprobaciÃ³n, emisiÃ³n de tiquetes y resoluciones para comisiones institucionales.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalNuevaAbierta(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Nueva Solicitud de ComisiÃ³n
                      </button>
                    </div>

              {/* Filtros */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 my-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por funcionario, cÃ³digo, ciudad o dependencia..."
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
                      { value: 'RESOLUCION_EMITIDA', label: 'ResoluciÃ³n Emitida' },
                      { value: 'EN_COMISION', label: 'En ComisiÃ³n' },
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
                  <AlertCircle className="w-4 h-4" /> Cargando solicitudes de viÃ¡ticos...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">CÃ³digo / Solicitante</th>
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
                            No se encontraron solicitudes de viÃ¡ticos registradas.
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
                                    title="Radicada por mÃ­"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-slate-800 text-sm mt-0.5">{sol.nombreComisionado}</div>
                              <div className="text-[11px] text-slate-400">
                                {sol.cargoComisionado} Â· {sol.dependencia}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 font-bold text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                {sol.ciudadDestino} ({sol.departamentoDestino})
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {sol.fechaInicio} al {sol.fechaFin} ({sol.diasComision} dÃ­as)
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
                                ViÃ¡ticos: {formatearMoneda(sol.montoSolicitadoViaticos)}
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
                                  {['RADICADA', 'EXTEMPORANEA', 'DEVUELTA'].includes(sol.estado) && (
                                    <button
                                      type="button"
                                      onClick={() => void handleConsolidar(sol)}
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                      title="Consolidar y enviar a revisiÃ³n (RF-LIQ-004)"
                                      aria-label="Consolidar y enviar a revisiÃ³n"
                                    >
                                      <Send className="w-3.5 h-3.5" />
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

          {/* â”€â”€ TIQUETES â”€â”€ */}
          {seccion === 'tiquetes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    Reserva y EmisiÃ³n de Pasajes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    GestiÃ³n de itinerarios, pasajes aÃ©reos y terrestres para funcionarios en comisiÃ³n de servicios.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                  Convenio Marco Satena / Avianca / Clic
                </span>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                La gestiÃ³n de pasajes y alojamiento se habilita tras la emisiÃ³n de la resoluciÃ³n de comisiÃ³n.
              </div>
            </div>
          )}

          {/* â”€â”€ LEGALIZACIONES â”€â”€ */}
          {seccion === 'legalizaciones' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-600" />
                    LegalizaciÃ³n y Cumplido de ComisiÃ³n
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    RevisiÃ³n de facturas, cumplidos firmados y cÃ¡lculo de reintegros o devoluciones.
                  </p>
                </div>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Cargue de soportes de legalizaciÃ³n activo para comisiones finalizadas.
              </div>
            </div>
          )}

          {/* â”€â”€ RESOLUCIONES â”€â”€ */}
          {seccion === 'resoluciones' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                    Resoluciones Institucionales de ComisiÃ³n
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Actos administrativos oficializados por la SubdirecciÃ³n de GestiÃ³n Institucional.
                  </p>
                </div>
              </div>
              <div className="p-8 text-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Las resoluciones asociadas a cada solicitud aparecerÃ¡n aquÃ­ tras su aprobaciÃ³n.
              </div>
            </div>
          )}

          {/* â”€â”€ MODAL DETALLE DE SOLICITUD â”€â”€ */}
          {(solicitudSeleccionada || solicitudEnRevision) && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-6rem)]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 tracking-wide truncate">
                        {(solicitudEnRevision ?? solicitudSeleccionada)?.codigo}
                      </span>
                      {esSuperAdmin && (solicitudEnRevision ?? solicitudSeleccionada)?.esCreadoPorMi && (
                        <span
                          className="inline-flex items-center text-blue-500"
                          title="Radicada por mÃ­"
                        >
                          <UserCheck className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {(solicitudEnRevision ?? solicitudSeleccionada)?.nombreComisionado}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSolicitudSeleccionada(null);
                      setSolicitudEnRevision(null);
                      setMotivoDevolucion('');
                    }}
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
                      <span className="font-semibold text-slate-800 text-xs">{(solicitudEnRevision ?? solicitudSeleccionada)?.cargoComisionado}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Dependencia</span>
                      <span className="font-semibold text-slate-800 text-xs">{(solicitudEnRevision ?? solicitudSeleccionada)?.dependencia}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Destino</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {(solicitudEnRevision ?? solicitudSeleccionada)?.ciudadDestino} ({(solicitudEnRevision ?? solicitudSeleccionada)?.departamentoDestino})
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Fechas</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {(solicitudEnRevision ?? solicitudSeleccionada)?.fechaInicio} â†’ {(solicitudEnRevision ?? solicitudSeleccionada)?.fechaFin}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estado</span>
                    <span>{getBadgeEstado((solicitudEnRevision ?? solicitudSeleccionada)?.estado || '')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">JustificaciÃ³n</span>
                    <p className="bg-slate-50 p-2.5 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                      {(solicitudEnRevision ?? solicitudSeleccionada)?.justificacion}
                    </p>
                  </div>

                  {(solicitudEnRevision ?? solicitudSeleccionada)?.estado === 'SOLICITADO' && esSuperAdmin && (
                    <>
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block mb-2">Controles de RevisiÃ³n (Etapa 4)</span>
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700">Prioridad</span>
                        </div>
                        <select
                          value={prioridadSeleccionada}
                          onChange={(e) => setPrioridadSeleccionada(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ALTA">Alta</option>
                          <option value="MEDIA">Media</option>
                          <option value="BAJA">Baja</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleGuardarPrioridad}
                          disabled={guardandoPrioridad}
                          className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          {guardandoPrioridad ? 'Guardando...' : 'Guardar Prioridad'}
                        </button>
                      </div>

                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Undo2 className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-bold text-slate-700">Devolver a Dependencia</span>
                        </div>
                        <textarea
                          value={motivoDevolucion}
                          onChange={(e) => setMotivoDevolucion(e.target.value)}
                          placeholder="Escriba el motivo detallado de la devoluciÃ³n..."
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          onClick={handleDevolverSolicitud}
                          disabled={devolviendo || !motivoDevolucion.trim()}
                          className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          {devolviendo ? 'Devolviendo...' : 'Confirmar DevoluciÃ³n'}
                        </button>
                      </div>
                    </>
                  )}

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
                                    title="Abrir en nueva pestaÃ±a"
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
                    onClick={() => (solicitudEnRevision ?? solicitudSeleccionada) && handleExportarPDF(solicitudEnRevision ?? solicitudSeleccionada)}
                    disabled={exportando}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportando ? 'Exportando...' : 'Exportar PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSolicitudSeleccionada(null);
                      setSolicitudEnRevision(null);
                      setMotivoDevolucion('');
                    }}
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

      {/* â”€â”€ CONFIGURACIÃ“N â”€â”€ */}
      {seccion === 'configuracion' && <ParametrizacionManager />}
    </ModuleLayout>
  );
}
