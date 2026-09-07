import { useEffect, useState } from 'react';
import { Building, Loader2, Lock } from 'lucide-react';

import { getAulas, getDisponibilidadAula, type Aula, type FranjaOcupadaAula } from '../services/api/catalogoApi';

/**
 * EFDS-1374 — Disponibilidad de aulas.
 *
 * ⚠️ RN-07: la ocupación muestra solo día y hora, nunca qué grupo ni qué
 * asignatura la ocupa. Eso NO lo garantiza esta pantalla, sino el backend, que
 * no envía esos campos: aquí simplemente no hay nada más que pintar. Los datos
 * de aulas son provisionales (C-4) hasta que llegue el catálogo oficial.
 *
 * Estética ESAP: azul institucional #003DA5.
 */
export function DisponibilidadAulas() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [sel, setSel] = useState<string>('');
  const [ocupada, setOcupada] = useState<FranjaOcupadaAula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAulas()
      .then((a) => { setAulas(a); if (a[0]) setSel(a[0].codigo); })
      .catch((e) => setError(e?.message || 'No se pudieron cargar las aulas.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    getDisponibilidadAula(sel).then((r) => setOcupada(r.ocupada)).catch(() => setOcupada([]));
  }, [sel]);

  const aula = aulas.find((a) => a.codigo === sel);

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <Building className="w-4 h-4 text-[#003DA5]" /> Disponibilidad de Aulas
        </h3>
        <p className="text-xs text-slate-500">
          Ocupación por espacio físico. Se muestra el día y la hora de lo ocupado; no qué grupo lo ocupa.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando aulas…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lista de aulas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aulas
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {aulas.map((a) => (
                <button
                  key={a.codigo}
                  onClick={() => setSel(a.codigo)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${sel === a.codigo ? 'bg-blue-50 text-[#003DA5] font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{a.nombre}</span>
                    {a.provisional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">PROV.</span>}
                  </div>
                  {a.capacidad != null && <span className="text-[11px] text-slate-400">Capacidad: {a.capacidad}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ocupación del aula seleccionada */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">{aula?.nombre || 'Aula'}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Lock className="w-3 h-3" /> Solo día y hora (RN-07)
              </span>
            </div>
            {ocupada.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Sin franjas ocupadas registradas para esta aula.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <tr><th className="px-4 py-3">Día</th><th className="px-4 py-3">Desde</th><th className="px-4 py-3">Hasta</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ocupada.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-700 capitalize">{f.diaSemana.toLowerCase()}</td>
                      <td className="px-4 py-3 text-[#003DA5] font-semibold">{f.horaInicio}</td>
                      <td className="px-4 py-3 text-[#003DA5] font-semibold">{f.horaFin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
