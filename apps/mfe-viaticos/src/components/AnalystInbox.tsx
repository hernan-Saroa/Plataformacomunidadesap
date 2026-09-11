import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Inbox,
  RotateCcw,
  Search,
  UserCheck,
  Zap,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import {
  Comisionado,
  Dependencia,
  PrioridadSolicitud,
  SolicitudComisionResponse,
  SolicitudListaResponse,
} from '../types/viaticos';
import { formatearNombreComisionado } from '../utils/viaticosUtils';
import VerificacionSIIFModal from './VerificacionSIIFModal';

const PRIORIDAD_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  ALTA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
  MEDIA: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media' },
  BAJA: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Baja' },
};

const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  SOLICITADO: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Solicitado' },
  APROBADO_JEFE: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Aprobado Jefe' },
  APROBADO_TALENTO_HUMANO: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Aprobado TH' },
  RESOLUCION_EMITIDA: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Resolución Emitida' },
  TIQUETES_COMPRADOS: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Tiquetes Comprados' },
  EN_COMISION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Comisión' },
  PENDIENTE_LEGALIZACION: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pendiente Legalización' },
  LEGALIZADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Legalizado' },
  RECHAZADO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
  RADICADA: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Radicada' },
  EXTEMPORANEA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Extemporánea' },
  DEVUELTA: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Devuelta' },
  SOLICITADA_SIIF: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', label: 'Solicitada SIIF' },
  VERIFICADA: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verificada' },
};

export type TabAnalista = 'TODAS' | 'PENDIENTES' | 'DEVOLUCIONES';

export default function AnalystInbox() {
  const [solicitudes, setSolicitudes] = useState<SolicitudListaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [tabActual, setTabActual] = useState<TabAnalista>('TODAS');
  const [modalAbierta, setModalAbierta] = useState(false);
  const [solicitudModal, setSolicitudModal] = useState<SolicitudComisionResponse | null>(null);
  const [cargandoModal, setCargandoModal] = useState(false);

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerSolicitudesAsignadasAnalista();
      setSolicitudes(data);
    } catch (err) {
      setError('Error al cargar las solicitudes asignadas.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const cargarDependencias = async () => {
    try {
      const data = await viaticosService.obtenerDependencias();
      setDependencias(data);
    } catch {
      setDependencias([]);
    }
  };

  useEffect(() => {
    void cargarSolicitudes();
    void cargarDependencias();
  }, []);

  const dependenciaLookup = useMemo(() => {
    const map = new Map<string, string>();
    dependencias.forEach((d) => {
      const key = String(d.idDependencia ?? '');
      if (key) map.set(key, d.nomDependencia);
    });
    return map;
  }, [dependencias]);

  // Clasificación por categorías / tabs
  const { devueltas, pendientes } = useMemo(() => {
    const devList: SolicitudListaResponse[] = [];
    const pendList: SolicitudListaResponse[] = [];

    solicitudes.forEach((s) => {
      const esDevuelta =
        s.estadoSolicitud === 'DEVUELTA' ||
        Boolean(s.motivoDevolucion && s.motivoDevolucion.trim().length > 0) ||
        Boolean((s as any).observacionesSegundaRevision && String((s as any).observacionesSegundaRevision).trim().length > 0);

      if (esDevuelta) {
        devList.push(s);
      } else if (['SOLICITADO', 'EN_VERIFICACION'].includes(s.estadoSolicitud)) {
        pendList.push(s);
      }
    });

    return { devueltas: devList, pendientes: pendList };
  }, [solicitudes]);

  const solicitudesPorTab = useMemo(() => {
    if (tabActual === 'DEVOLUCIONES') return devueltas;
    if (tabActual === 'PENDIENTES') return pendientes;
    return solicitudes;
  }, [tabActual, solicitudes, devueltas, pendientes]);

  const solicitudesFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return solicitudesPorTab;
    return solicitudesPorTab.filter((s) => {
      return (
        s.consecutivoUnico.toLowerCase().includes(termino) ||
        (s.comisionado?.primerNombre?.toLowerCase().includes(termino) ?? false) ||
        (s.comisionado?.primerApellido?.toLowerCase().includes(termino) ?? false) ||
        s.destinoCiudad.toLowerCase().includes(termino) ||
        s.estadoSolicitud.toLowerCase().includes(termino) ||
        (s.motivoDevolucion?.toLowerCase().includes(termino) ?? false) ||
        ((s as any).observacionesSegundaRevision?.toLowerCase().includes(termino) ?? false) ||
        (s.comisionado?.numeroDocumento?.toLowerCase().includes(termino) ?? false)
      );
    });
  }, [solicitudesPorTab, busqueda]);

  const nombreComisionado = (s: SolicitudListaResponse): string =>
    s.comisionado ? formatearNombreComisionado(s.comisionado as Comisionado) : 'N/A';

  const dependenciaOrigen = (s: SolicitudListaResponse): string => {
    const idDep = (s as any)?.idDependencia ?? (s.comisionado as Comisionado | null | undefined)?.idDependencia;
    if (idDep != null) {
      const nombre = dependenciaLookup.get(String(idDep));
      if (nombre) return nombre;
    }
    return 'N/A';
  };

  const prioridadConfig = (s: SolicitudListaResponse) =>
    PRIORIDAD_CONFIG[(s.prioridad || '').toUpperCase()] || PRIORIDAD_CONFIG.MEDIA;

  const estadoConfig = (s: SolicitudListaResponse) => {
    const key = (s.estadoSolicitud || 'RADICADA').toUpperCase();
    return ESTADO_CONFIG[key] || { bg: 'bg-gray-100', text: 'text-gray-700', label: s.estadoSolicitud };
  };

  const esContratistaFacturador = (s: SolicitudListaResponse) => {
    const tipo = (s.comisionado?.tipoComisionado || '').toUpperCase();
    const facturador = Boolean(s.comisionado?.esFacturadorElectronico || s.consultaRutFacturador);
    return tipo === 'CONTRATISTA' && facturador;
  };

  const obtenerResponsableDevolucion = (s: SolicitudListaResponse): string => {
    if (s.revisorControlNombre) return s.revisorControlNombre;
    if (s.revisorControl?.username) return s.revisorControl.username;
    if (s.estadoSolicitud === 'EN_VERIFICACION') return 'Revisor de Control Viáticos';
    if (s.estadoSolicitud === 'DEVUELTA') return 'Analista de Viáticos';
    return 'Equipo de Viáticos';
  };

  const obtenerMotivoDevolucion = (s: SolicitudListaResponse): string => {
    return (
      s.motivoDevolucion ||
      (s as any).observacionesSegundaRevision ||
      'Devolución registrada para subsanación de observaciones.'
    );
  };

  const handleIniciarAuditoria = async (solicitud: SolicitudListaResponse) => {
    setCargandoModal(true);
    setSolicitudModal(null);
    try {
      const full = await viaticosService.obtenerSolicitudCompleta(solicitud.id);
      setSolicitudModal(full);
    } catch (err) {
      console.error('Error cargando solicitud completa para auditoría:', err);
      setSolicitudModal(null);
    } finally {
      setCargandoModal(false);
    }
    setModalAbierta(true);
  };

  const handleCerrarModal = () => {
    setModalAbierta(false);
    setSolicitudModal(null);
  };

  const handleRefrescar = () => {
    void cargarSolicitudes();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#003DA5]" />
            Bandeja del Analista — Etapa 5
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de comisiones asignadas, verificación de soportes, devoluciones y exportación a SIIF Nación.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarSolicitudes}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {/* Pestañas / Tabs */}
      <div className="flex border-b border-slate-200 mt-4 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTabActual('TODAS')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            tabActual === 'TODAS'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Todas las Asignadas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tabActual === 'TODAS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {solicitudes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActual('PENDIENTES')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            tabActual === 'PENDIENTES'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pendientes de Verificación</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tabActual === 'PENDIENTES' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {pendientes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActual('DEVOLUCIONES')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            tabActual === 'DEVOLUCIONES'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Bandeja de Devoluciones</span>
          {devueltas.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
              {devueltas.length}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
              0
            </span>
          )}
        </button>
      </div>

      {/* Buscador */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por consecutivo, comisionado, documento, motivo u observaciones..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      {/* Contenido de la bandeja */}
      {cargando ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando solicitudes asignadas...</div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-500">{error}</div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            {tabActual === 'DEVOLUCIONES' ? <RotateCcw className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {tabActual === 'DEVOLUCIONES'
              ? 'No hay comisiones devueltas ni observaciones pendientes de subsanar.'
              : tabActual === 'PENDIENTES'
              ? 'No hay solicitudes pendientes de verificación inicial.'
              : 'No tienes solicitudes asignadas en este momento.'}
          </p>
        </div>
      ) : tabActual === 'DEVOLUCIONES' ? (
        /* =================== Vista Especializada: Bandeja de Devoluciones =================== */
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-rose-50/50">
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Consecutivo</th>
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Comisionado</th>
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Tipo Devolución</th>
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Responsable</th>
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Motivo / Observación</th>
                <th className="text-left py-2.5 px-3 font-bold text-slate-600">Fecha</th>
                <th className="text-center py-2.5 px-3 font-bold text-slate-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((s) => {
                const nombre = nombreComisionado(s);
                const responsable = obtenerResponsableDevolucion(s);
                const motivo = obtenerMotivoDevolucion(s);
                const esFacturador = esContratistaFacturador(s);
                const tipoPaso =
                  s.estadoSolicitud === 'DEVUELTA'
                    ? 'Devuelta a Enlace'
                    : 'Devuelta por Control Viáticos';
                const fechaDev = s.fechaSegundaRevision || s.actualizadoEn;

                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{s.consecutivoUnico}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{nombre}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>CC: {s.comisionado?.numeroDocumento || 'N/A'}</span>
                        {esFacturador && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Zap className="w-2.5 h-2.5 text-indigo-600" />
                            Facturador Electrónico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.estadoSolicitud === 'DEVUELTA'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        {tipoPaso}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                      <span className="text-slate-800 font-semibold">{responsable}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs">
                      <div
                        className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-2 text-[11px] text-rose-950 font-mono line-clamp-2"
                        title={motivo}
                      >
                        {motivo}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {fechaDev ? new Date(fechaDev).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleIniciarAuditoria(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-[11px] font-semibold shadow-xs"
                        title="Subsanar observaciones y verificar soportes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Subsanar / Auditar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* =================== Vista Estándar: Todas / Pendientes =================== */
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-bold text-slate-500">Consecutivo</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Comisionado</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Dependencia de origen</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Fechas del viaje</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Prioridad</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Estado</th>
                <th className="text-center py-2 px-2 font-bold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((s) => {
                const pc = prioridadConfig(s);
                const ec = estadoConfig(s);
                const nombre = nombreComisionado(s);
                const dep = dependenciaOrigen(s);
                const esFacturador = esContratistaFacturador(s);
                const tieneDevolucion =
                  s.estadoSolicitud === 'DEVUELTA' ||
                  Boolean(s.motivoDevolucion || (s as any).observacionesSegundaRevision);

                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2 font-mono font-bold text-slate-800">{s.consecutivoUnico}</td>
                    <td className="py-2 px-2 text-slate-700">
                      <div className="font-semibold text-slate-800">{nombre}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          CC: {s.comisionado?.numeroDocumento || 'N/A'}
                        </span>
                        {esFacturador && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Zap className="w-2.5 h-2.5 text-indigo-600" />
                            Facturador Electrónico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-700">{dep}</td>
                    <td className="py-2 px-2 text-slate-700">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(s.fechaInicio).toLocaleDateString()} – {new Date(s.fechaFin).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.bg} ${pc.text}`}>
                        {pc.label}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.bg} ${ec.text}`}>
                          {ec.label}
                        </span>
                        {tieneDevolucion && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 max-w-[180px] truncate"
                            title={`Devuelta con observación: ${s.motivoDevolucion || (s as any).observacionesSegundaRevision}`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                            <span className="truncate">{s.motivoDevolucion || (s as any).observacionesSegundaRevision}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {s.estadoSolicitud === 'SOLICITADA_SIIF' || s.estadoSolicitud === 'VERIFICADA' ? (
                        <button
                          type="button"
                          onClick={() => handleIniciarAuditoria(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors text-[11px] font-semibold"
                          title="Consultar expediente y datos SIIF"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Consultar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleIniciarAuditoria(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#003DA5] text-white rounded-lg hover:bg-[#002a7d] transition-colors text-[11px] font-semibold shadow-xs"
                          title="Iniciar auditoría de soportes"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Auditoría</span>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Auditoría / Verificación SIIF */}
      <VerificacionSIIFModal
        abierta={modalAbierta}
        solicitud={solicitudModal}
        cargando={cargandoModal}
        onCerrar={handleCerrarModal}
        onRefrescar={handleRefrescar}
      />
    </div>
  );
}
