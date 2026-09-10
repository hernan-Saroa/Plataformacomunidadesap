import { useEffect, useState } from 'react';
import { FileText, Clock, AlertTriangle, UserCheck, Search } from 'lucide-react';
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
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await viaticosService.obtenerSolicitudesAsignadas();
      setSolicitudes(data);
    } catch (err) {
      setError('Error al cargar las solicitudes asignadas.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const termino = busqueda.toLowerCase();
    return (
      !termino ||
      s.consecutivoUnico.toLowerCase().includes(termino) ||
      s.comisionado?.primerNombre?.toLowerCase().includes(termino) ||
      s.comisionado?.primerApellido?.toLowerCase().includes(termino) ||
      s.destinoCiudad.toLowerCase().includes(termino) ||
      s.estadoSolicitud.toLowerCase().includes(termino)
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
            Solicitudes pendientes de revisión asignadas a usted.
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
          placeholder="Buscar por consecutivo, comisionado, ciudad o estado..."
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
        <div className="py-8 text-center text-xs text-slate-400">No tienes solicitudes asignadas.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-bold text-slate-500">Consecutivo</th>
                <th className="text-left py-2 px-2 font-bold text-slate-500">Comisionado</th>
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

                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono font-bold text-slate-800">{s.consecutivoUnico}</td>
                    <td className="py-2 px-2 text-slate-700">{nombreComisionado}</td>
                    <td className="py-2 px-2 text-slate-700">
                      {s.destinoCiudad}, {s.destinoDepartamento}
                    </td>
                    <td className="py-2 px-2 text-slate-700">
                      {new Date(s.fechaInicio).toLocaleDateString()} - {new Date(s.fechaFin).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoConfig.bg} ${estadoConfig.text}`}>
                        {estadoConfig.label}
                      </span>
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
