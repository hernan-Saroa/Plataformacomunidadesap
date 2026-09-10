import { useEffect, useState } from 'react';
import { Search, UserCheck, AlertTriangle } from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { CargaAnalista, ColorSemaforoAnalista } from '../types/viaticos';

const COLOR_SEMAFORO: Record<ColorSemaforoAnalista, { bg: string; text: string; ring: string; label: string }> = {
  VERDE: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    ring: 'ring-emerald-400',
    label: 'Baja carga',
  },
  AMARILLO: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    ring: 'ring-amber-400',
    label: 'Carga moderada',
  },
  ROJO: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    ring: 'ring-red-400',
    label: 'Saturación',
  },
};

interface TableroCargaAnalistasProps {
  analistaSeleccionadoId: string | null;
  onSeleccionarAnalista: (analistaId: string) => void;
  analistaAsignadoId?: string | null;
  solicitudId?: string | null;
}

export default function TableroCargaAnalistas({
  analistaSeleccionadoId,
  onSeleccionarAnalista,
  analistaAsignadoId,
  solicitudId,
}: TableroCargaAnalistasProps) {
  const [analistas, setAnalistas] = useState<CargaAnalista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarCarga = async () => {
    setCargando(true);
    try {
      const response = await viaticosService.obtenerCargaAnalistas(solicitudId || undefined);
      setAnalistas(response.data);
    } catch (error) {
      console.error('Error cargando tablero de carga:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCarga();
  }, [solicitudId]);

  const analistasFiltrados = analistas.filter((a) => {
    const termino = busqueda.toLowerCase();
    return (
      !termino ||
      a.nombreCompleto.toLowerCase().includes(termino) ||
      a.username.toLowerCase().includes(termino) ||
      (a.identificacion && a.identificacion.toLowerCase().includes(termino))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="p-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#003DA5]" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Analistas disponibles</h3>
            <p className="text-[11px] text-slate-500">Filtrados por dependencia de la solicitud.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargarCarga}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap"
        >
          Actualizar
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {cargando ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">Cargando analistas...</div>
      ) : analistasFiltrados.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">No se encontraron analistas.</div>
      ) : (
        <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
          {analistasFiltrados.map((analista) => {
            const color = COLOR_SEMAFORO[analista.colorSemaforo];
            const estaSeleccionado = analistaSeleccionadoId === analista.usuarioId;

            return (
              <button
                key={analista.usuarioId}
                type="button"
                onClick={() => onSeleccionarAnalista(analista.usuarioId)}
                title={
                  analista.asignacionesActivas > 0
                    ? `Asignaciones activas: ${analista.asignacionesActivas} (Altas: ${analista.altas}, Medias: ${analista.medias}, Bajas: ${analista.bajas}). Puntaje total: ${analista.puntajeTotal}`
                    : 'Sin asignaciones activas'
                }
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  estaSeleccionado
                    ? 'border-[#003DA5] bg-blue-50 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ring-2 ${color.ring} ${color.bg}`}
                  >
                    <span className={`text-[11px] font-black ${color.text}`}>
                      {analista.colorSemaforo.charAt(0)}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {analista.nombreCompleto}
                    </span>
                    {analistaAsignadoId === analista.usuarioId && (
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">@{analista.username}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${color.bg} ${color.text}`}>
                      {color.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {analista.asignacionesActivas > 0
                        ? `${analista.asignacionesActivas} activas`
                        : 'Sin carga'}
                    </span>
                  </div>
                </div>

                {analista.puntajeTotal > 12 && (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" title="Saturación" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
