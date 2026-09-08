import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  FileText,
  LoaderCircle,
  Search,
  UserCheck,
  X,
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
};

export default function AnalystInbox() {
  const [solicitudes, setSolicitudes] = useState<SolicitudListaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
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
    const map = new Map<number, string>();
    dependencias.forEach((d) => map.set(d.idDependencia, d.nomDependencia));
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
      (s.comisionado?.numeroDocumento?.toLowerCase().includes(termino) ?? false)
    );
  });

  const nombreComisionado = (s: SolicitudListaResponse): string =>
    s.comisionado ? formatearNombreComisionado(s.comisionado as Comisionado) : 'N/A';

  const dependenciaOrigen = (s: SolicitudListaResponse): string => {
    const idDep = (s.comisionado as Comisionado | null | undefined)?.idDependencia;
    if (idDep != null) {
      const nombre = dependenciaLookup.get(Number(idDep));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#003DA5]" />
            Bandeja del Analista
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicitudes asignadas pendientes de verificación de soportes y exportación a SIIF.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarSolicitudes}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          Actualizar
        </button>
      </div>

      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por consecutivo, comisionado, documento, ciudad o estado..."
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
          No tienes solicitudes asignadas.
        </div>
      ) : (
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

                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono font-bold text-slate-800">{s.consecutivoUnico}</td>
                    <td className="py-2 px-2 text-slate-700">{nombre}</td>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.bg} ${ec.text}`}>
                        {ec.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleIniciarAuditoria(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#003DA5] text-white rounded-lg hover:bg-[#002a7d] transition-colors text-[11px] font-semibold"
                        title="Iniciar auditoría de soportes"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Auditoría</span>
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
