import { useEffect, useState } from 'react';
import { FileText, Clock, AlertTriangle, UserCheck, Search, MapPin } from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudListaResponse, EstadoSolicitudViatico } from '../types/viaticos';

const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  SOLICITADO: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Solicitado' },
  EN_VERIFICACION: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En Verificación' },
  VERIFICADA: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verificada' },
  APROBADO_JEFE: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Aprobado por Jefe' },
  APROBADO_TALENTO_HUMANO: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Aprobado por TH' },
  RESOLUCION_EMITIDA: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Resolución Emitida' },
  TIQUETES_COMPRADOS: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Tiquetes Comprados' },
  EN_COMISION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Comisión' },
  PENDIENTE_LEGALIZACION: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pendiente Legalización' },
  LEGALIZADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Legalizado' },
  RECHAZADO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
  RADICADA: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Radicada' },
  EXTEMPORANEA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Extemporánea' },
  DEVUELTA: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Devuelta' },
};

export default function SolicitudesAsignadasAnalista() {
  const [solicitudes, setSolicitudes] = useState<SolicitudListaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError(null);
    try {
      const fetcher =
        viaticosService.obtenerSolicitudesAsignadasAnalista ||
        viaticosService.obtenerSolicitudesAsignadas;
      const data = await fetcher.call(viaticosService);
      setSolicitudes(data || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las solicitudes asignadas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const termino = busqueda.toLowerCase().trim();
    const cOrigen = s.ciudadOrigen || (s as any).origenCiudad || s.sedeOrigen || 'Bogotá D.C.';
    return (
      !termino ||
      s.consecutivoUnico.toLowerCase().includes(termino) ||
      (s.comisionado?.primerNombre?.toLowerCase().includes(termino) ?? false) ||
      (s.comisionado?.primerApellido?.toLowerCase().includes(termino) ?? false) ||
      cOrigen.toLowerCase().includes(termino) ||
      (s.destinoCiudad && s.destinoCiudad.toLowerCase().includes(termino)) ||
      (s.destinoDepartamento && s.destinoDepartamento.toLowerCase().includes(termino)) ||
      s.estadoSolicitud.toLowerCase().includes(termino) ||
      viaticosService.resolverNombreDependencia?.(s)?.toLowerCase().includes(termino)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#003DA5]" />
            Mis Solicitudes Asignadas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Comisiones asignadas directamente para su validación documental y verificación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por consecutivo, comisionado, ciudad o estado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={cargarSolicitudes}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap px-2 py-2"
          >
            Actualizar
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando solicitudes...</div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-rose-500">{error}</div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">No tienes solicitudes asignadas.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-bold text-slate-500">Consecutivo</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Comisionado</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Dependencia</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Origen</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Destino</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Fechas</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Estado</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((s) => {
                const estadoConfig = ESTADO_CONFIG[s.estadoSolicitud] || {
                  bg: 'bg-gray-100',
                  text: 'text-gray-700',
                  label: s.estadoSolicitud,
                };
                const nombreComisionado = s.comisionado
                  ? `${s.comisionado.primerNombre} ${s.comisionado.primerApellido}`
                  : 'N/A';
                const dependenciaNom = viaticosService.resolverNombreDependencia?.(s) || 'Sede Central';
                const cOrigen = s.ciudadOrigen || (s as any).origenCiudad || s.sedeOrigen || 'Bogotá D.C.';

                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{s.consecutivoUnico}</span>
                        {Boolean(s.extemporanea || s.estadoSolicitud === 'EXTEMPORANEA') && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300"
                            title="Comisión Extemporánea (menos de 14 días hábiles)"
                          >
                            <Clock className="w-2.5 h-2.5 text-amber-700" />
                            Extemporánea
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-700">{nombreComisionado}</td>
                    <td className="py-2 px-2 text-slate-700">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]" title="Dependencia">
                        {dependenciaNom}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-medium text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cOrigen}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{s.destinoCiudad}</span>
                      </div>
                      {s.destinoDepartamento && (
                        <div className="text-[10px] text-slate-400 pl-4.5">
                          {s.destinoDepartamento}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-700">
                      {new Date(s.fechaInicio).toLocaleDateString()} - {new Date(s.fechaFin).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoConfig.bg} ${estadoConfig.text}`}>
                          {estadoConfig.label}
                        </span>
                        {Boolean(s.extemporanea || s.estadoSolicitud === 'EXTEMPORANEA') && s.estadoSolicitud !== 'EXTEMPORANEA' && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title="Extemporánea"
                          >
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            Extemporánea
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-700">{s.prioridad || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
