import { useEffect, useState } from 'react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import {
  aprobarConcertacion, devolverConcertacion, getBandejaConcertacion, revisarConcertacion,
  type ConcertacionBandeja as Item,
} from '../services/api/concertacionApi';

/**
 * EFDS-2315 — Bandeja de la concertación para revisores y aprobadores.
 *
 * Muestra solo lo que el usuario puede decidir: el backend filtra por los
 * permisos del PTA (pta.review/approve.academica.<nivel>) y su alcance, y dice
 * qué puede hacer con cada una (`puede`). Revisar y aprobar se firman con el
 * código de 6 dígitos (hoy simulado, pero registrado en el servidor). Devolver
 * exige comentario.
 */
export function ConcertacionBandeja({ idPeriodo, firmaSimulada }: { idPeriodo?: string; firmaSimulada: boolean }) {
  const revision = useRevisionProgramacion('concertacion');
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<Record<string, string>>({});
  const [devolviendo, setDevolviendo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    getBandejaConcertacion(idPeriodo)
      .then((r) => { if (vigente) { setItems(r); setError(''); } })
      .catch((e) => { if (vigente) setError(e?.message || 'No se pudo cargar la bandeja.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idPeriodo, revision]);

  const ejecutar = async (id: string, accion: () => Promise<unknown>) => {
    setAviso(''); setOcupado(id);
    try { await accion(); setCodigo((c) => ({ ...c, [id]: '' })); }
    catch (e: any) { setAviso(e?.message || 'No se pudo completar la acción.'); }
    finally { setOcupado(null); }
  };

  if (cargando) return <div className="flex items-center gap-2 text-sm text-slate-500">Cargando concertaciones…</div>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">Concertación de la docencia</h3>
        {firmaSimulada && <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">Firma simulada (pruebas)</span>}
      </div>
      {aviso && <p role="alert" className="text-sm text-red-700">{aviso}</p>}
      {items.length === 0 && <p className="text-sm text-slate-500">No tiene concertaciones por decidir.</p>}

      {items.map((c) => {
        const cod = codigo[c.idConcertacion] ?? '';
        const codigoValido = /^\d{6}$/.test(cod);
        const busy = ocupado === c.idConcertacion;
        return (
          <div key={c.idConcertacion} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{c.docente} <span className="text-xs text-slate-400">CC {c.documento}</span></p>
                <p className="text-xs text-slate-500">
                  {c.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'} · {c.numFranjas} franja(s) · {c.horas} h ·{' '}
                  <strong>{c.estado === 'ENVIADA' ? 'Enviada por el docente' : 'Revisada'}</strong>
                  {c.revisiones.length > 0 && ` · revisiones: ${c.revisiones.join(', ')}`}
                </p>
              </div>
            </div>
            <ul className="text-xs text-slate-600 list-disc pl-5">
              {c.franjas.map((f) => <li key={f.idFranja}>{f.codigoAsignatura} · {f.asignatura} · {f.horas} h</li>)}
            </ul>

            {(c.puede.revisar.length > 0 || c.puede.aprobar) && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  Código de firma
                  <input aria-label={`Código de firma de ${c.docente}`} inputMode="numeric" maxLength={6} value={cod}
                    onChange={(e) => setCodigo((x) => ({ ...x, [c.idConcertacion]: e.target.value.replace(/\D/g, '') }))}
                    className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" />
                </label>
                {c.estado === 'ENVIADA' && c.puede.revisar.map((tipo) => (
                  <button key={tipo} type="button" disabled={!codigoValido || busy}
                    onClick={() => ejecutar(c.idConcertacion, () => revisarConcertacion(c.idConcertacion, cod, tipo))}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold disabled:opacity-50">
                    Revisar ({tipo})
                  </button>
                ))}
                {c.estado === 'REVISADA' && c.puede.aprobar && (
                  <button type="button" disabled={!codigoValido || busy}
                    onClick={() => ejecutar(c.idConcertacion, () => aprobarConcertacion(c.idConcertacion, cod))}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                    Aprobar y firmar
                  </button>
                )}
              </div>
            )}

            {c.puede.devolver && (devolviendo === c.idConcertacion ? (
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Motivo de la devolución" value={comentario} onChange={(e) => setComentario(e.target.value)}
                  placeholder="Motivo de la devolución" className="flex-1 min-w-[200px] border border-slate-200 rounded px-2 py-1 text-sm" />
                <button type="button" disabled={!comentario.trim() || busy}
                  onClick={() => ejecutar(c.idConcertacion, async () => { await devolverConcertacion(c.idConcertacion, comentario); setDevolviendo(null); setComentario(''); })}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-50">Confirmar devolución</button>
                <button type="button" onClick={() => setDevolviendo(null)} className="text-xs text-slate-500">Cancelar</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setDevolviendo(c.idConcertacion); setComentario(''); }}
                className="text-xs text-amber-700 font-bold flex items-center gap-1">Devolver al docente</button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
