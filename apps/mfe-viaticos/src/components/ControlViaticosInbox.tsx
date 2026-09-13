import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import {
  Comisionado,
  Dependencia,
  PrioridadSolicitud,
  SolicitudComisionResponse,
  SolicitudListaResponse,
  SolicitudControlViaticosResponse,
  BandejaControlViaticosResponse,
} from '../types/viaticos';
import { formatearNombreComisionado } from '../utils/viaticosUtils';
import ControlViaticosModal from './ControlViaticosModal';

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

export default function ControlViaticosInbox() {
  const [solicitudes, setSolicitudes] = useState<SolicitudControlViaticosResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [modalAbierta, setModalAbierta] = useState(false);
  const [solicitudModal, setSolicitudModal] = useState<SolicitudControlViaticosResponse | null>(null);
  const [cargandoModal, setCargandoModal] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const cargarSolicitudes = async (page = 1) => {
    setCargando(true);
    setError(null);
    try {
      const response = await viaticosService.obtenerBandejaControlViaticos({ page, limit: 20 });
      setSolicitudes(response.data);
      setTotalRegistros(response.total);
      setTotalPaginas(Math.ceil(response.total / 20));
      setPaginaActual(response.page);
    } catch (err) {
      setError('Error al cargar las solicitudes de Control Viáticos.');
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

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const termino = busqueda.toLowerCase();
    if (!termino) return true;
    return (
      s.consecutivoUnico.toLowerCase().includes(termino) ||
      (s.comisionado?.primerNombre?.toLowerCase().includes(termino) ?? false) ||
      (s.comisionado?.primerApellido?.toLowerCase().includes(termino) ?? false) ||
      s.destinoCiudad.toLowerCase().includes(termino) ||
      s.estadoSolicitud.toLowerCase().includes(termino) ||
      (s.comisionado?.numeroDocumento?.toLowerCase().includes(termino) ?? false) ||
      (s.analistaVerificadorNombre?.toLowerCase().includes(termino) ?? false)
    );
  });

  const nombreComisionado = (s: SolicitudControlViaticosResponse): string =>
    s.comisionado ? formatearNombreComisionado(s.comisionado as Comisionado) : 'N/A';

  const dependenciaOrigen = (s: SolicitudControlViaticosResponse): string => {
    const idDep = (s as any)?.idDependencia ?? (s.comisionado as Comisionado | null | undefined)?.idDependencia;
    if (idDep != null) {
      const nombre = dependenciaLookup.get(String(idDep));
      if (nombre) return nombre;
    }
    return 'N/A';
  };

  const prioridadConfig = (s: SolicitudControlViaticosResponse) =>
    PRIORIDAD_CONFIG[(s.prioridad || '').toUpperCase()] || PRIORIDAD_CONFIG.MEDIA;

  const estadoConfig = (s: SolicitudControlViaticosResponse) => {
    const key = (s.estadoSolicitud || 'RADICADA').toUpperCase();
    return ESTADO_CONFIG[key] || { bg: 'bg-gray-100', text: 'text-gray-700', label: s.estadoSolicitud };
  };

  const handleIniciarControlCruzado = async (solicitud: SolicitudControlViaticosResponse) => {
    setCargandoModal(true);
    setSolicitudModal(null);
    try {
      const full = await viaticosService.obtenerSolicitudControlViaticos(solicitud.id);
      setSolicitudModal(full);
    } catch (err) {
      console.error('Error cargando solicitud completa para Control Cruzado:', err);
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
    void cargarSolicitudes(paginaActual);
  };

  const handleCambiarPagina = (page: number) => {
    if (page >= 1 && page <= totalPaginas) {
      void cargarSolicitudes(page);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#003DA5]" />
            Control Viáticos — Bandeja de Segundo Nivel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicitudes en estado SOLICITADA_SIIF pendientes de control cruzado y verificación de segundo nivel.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefrescar}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          Actualizar
        </button>
      </div>

      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por consecutivo, comisionado, documento, ciudad, analista 1er nivel o estado..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      {cargando ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando solicitudes...</div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-500">{error}</div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No hay solicitudes en estado SOLICITADA_SIIF pendientes de control cruzado.
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Consecutivo</th>
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Comisionado</th>
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Analista Verificador 1er Nivel</th>
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Dependencia</th>
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Fechas de viaje</th>
                  <th className="text-left py-2 px-2 font-bold text-slate-500">Prioridad</th>
                  <th className="text-center py-2 px-2 font-bold text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesFiltradas.map((s) => {
                  const pc = prioridadConfig(s);
                  const ec = estadoConfig(s);
                  const nombre = nombreComisionado(s);
                  const dep = dependenciaOrigen(s);

                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono font-bold text-slate-800">{s.consecutivoUnico}</td>
                      <td className="py-2 px-2 text-slate-700">{nombre}</td>
                      <td className="py-2 px-2 text-slate-700">
                        {s.analistaVerificadorNombre ? (
                          <>
                            <div className="font-medium">{s.analistaVerificadorNombre}</div>
                            {s.fechaVerificacionPrimerNivel && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(s.fechaVerificacionPrimerNivel).toLocaleString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Sin asignar</span>
                        )}
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
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleIniciarControlCruzado(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors text-[11px] font-semibold ${
                            s.estadoSolicitud === 'VERIFICADA'
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-[#003DA5] text-white hover:bg-[#002a7d]'
                          }`}
                          title={
                            s.estadoSolicitud === 'VERIFICADA'
                              ? 'Consultar Expediente Verificado'
                              : 'Realizar Control Cruzado'
                          }
                        >
                          {s.estadoSolicitud === 'VERIFICADA' ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span className="hidden sm:inline">Verificado</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Control Cruzado</span>
                              <FileText className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Mostrando {solicitudesFiltradas.length} de {totalRegistros} registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed font-semibold"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-xs text-slate-700 font-semibold">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => handleCambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed font-semibold"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ControlViaticosModal
        abierta={modalAbierta}
        solicitud={solicitudModal}
        cargando={cargandoModal}
        onCerrar={handleCerrarModal}
        onRefrescar={handleRefrescar}
      />
    </div>
  );
}