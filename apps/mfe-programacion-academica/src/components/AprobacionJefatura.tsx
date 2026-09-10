import { useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Check, RotateCcw } from 'lucide-react';

import {
  getPendientesJefatura, aprobarFranja, devolverFranja, type FranjaAprobacion,
} from '../services/api/catalogoApi';

/**
 * EFDS-1939 — Aprobación de la jefatura territorial.
 *
 * La jefatura ve SOLO las franjas tomadas por docentes de SU territorial (el
 * backend lo resuelve por el token) y las aprueba o las devuelve con un
 * comentario. Devolver deja la franja para que el docente la corrija; mientras
 * un docente tenga una devolución pendiente, aprobar el resto de sus franjas se
 * bloquea (el backend responde el motivo, que se muestra tal cual).
 *
 * ⚠️ La integración con el componente de Docencia del PTA NO entra (fase
 * posterior, decidido).
 */
const cap = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

export function AprobacionJefatura() {
  const [pendientes, setPendientes] = useState<FranjaAprobacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [devolviendo, setDevolviendo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  const recargar = () =>
    getPendientesJefatura()
      .then((p) => { setPendientes(p); setError(''); })
      .catch((e) => setError(e?.message || 'No se pudieron cargar las franjas.'));

  useEffect(() => { recargar().finally(() => setCargando(false)); }, []);

  const aprobar = async (f: FranjaAprobacion) => {
    setAviso(''); setOcupado(f.idFranja);
    try { await aprobarFranja(f.idFranja); await recargar(); }
    catch (err: any) { setAviso(err?.message || 'No se pudo aprobar.'); }
    finally { setOcupado(null); }
  };

  const confirmarDevolucion = async (f: FranjaAprobacion) => {
    setAviso(''); setOcupado(f.idFranja);
    try {
      await devolverFranja(f.idFranja, comentario);
      setDevolviendo(null); setComentario('');
      await recargar();
    } catch (err: any) { setAviso(err?.message || 'No se pudo devolver.'); }
    finally { setOcupado(null); }
  };

  // Agrupa por docente para que la jefatura decida por persona.
  const porDocente = pendientes.reduce<Record<string, FranjaAprobacion[]>>((acc, f) => {
    (acc[f.nombreDocente] ??= []).push(f); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-[#003DA5]" /> Aprobación territorial
        </h3>
        <p className="text-xs text-slate-500">
          Franjas tomadas por los docentes de tu territorial. Apruébalas o devuélvelas con un
          comentario. Una devolución pendiente bloquea aprobar el resto de ese docente.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}
      {aviso && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">{aviso}</div>}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando pendientes…
        </div>
      ) : pendientes.length === 0 && !error ? (
        <p className="text-sm text-slate-400 p-4">No hay franjas pendientes de aprobación en tu territorial.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDocente).map(([docente, franjas]) => (
            <div key={docente} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">{docente}</p>
                <p className="text-[11px] text-slate-400">Documento {franjas[0].documentoDocente} · {franjas.length} franja(s)</p>
              </div>
              <div className="divide-y divide-slate-100">
                {franjas.map((f) => (
                  <div key={f.idFranja} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{f.asignatura || 'Asignatura'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{f.programa || 'Programa'}</p>
                        <p className="text-[11px] text-slate-400">
                          {cap(f.diaSemana)} {f.horaInicio}–{f.horaFin}{f.aulaCodigo ? ` · Aula ${f.aulaCodigo}` : ' · Virtual'}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button type="button" onClick={() => aprobar(f)} disabled={ocupado === f.idFranja}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 transition-all">
                          {ocupado === f.idFranja ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Aprobar
                        </button>
                        <button type="button" onClick={() => { setDevolviendo(f.idFranja); setComentario(''); setAviso(''); }}
                          disabled={ocupado === f.idFranja}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-[#003DA5] border border-slate-200 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all">
                          <RotateCcw className="w-4 h-4" /> Devolver
                        </button>
                      </div>
                    </div>
                    {devolviendo === f.idFranja && (
                      <div className="flex items-center gap-2 pt-1">
                        <input autoFocus value={comentario} onChange={(e) => setComentario(e.target.value)}
                          placeholder="Motivo de la devolución (obligatorio)"
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => confirmarDevolucion(f)} disabled={!comentario.trim() || ocupado === f.idFranja}
                          className="px-3 py-2 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-40 active:scale-95 transition-all">
                          Confirmar
                        </button>
                        <button type="button" onClick={() => setDevolviendo(null)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
