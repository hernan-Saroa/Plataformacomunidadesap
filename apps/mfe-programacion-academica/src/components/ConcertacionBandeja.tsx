import { useEffect, useRef, useState } from 'react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import {
  aprobarConcertacion, devolverConcertacion, getBandejaConcertacion, revisarConcertacion,
  type ConcertacionBandeja as Item,
} from '../services/api/concertacionApi';
import { FirmaOtpModal } from './FirmaOtpModal';
import { EtapasConcertacion, RegistroFirmas } from './EtapasConcertacion';

/**
 * EFDS-2315 — Bandeja de la concertación para revisores y aprobadores.
 *
 * Muestra solo lo que el usuario puede decidir: el backend filtra por los
 * permisos del PTA (pta.review/approve.academica.<nivel>) y su alcance, y dice
 * qué puede hacer con cada una (`puede`). Revisar y aprobar se firman en el modal
 * de firma digital (el mismo del PTA). Devolver exige comentario.
 *
 * El orden es el del flujo: primero la REVISIÓN académica y después la APROBACIÓN. Antes, mientras la
 * concertación estaba solo enviada, el aprobador no veía ningún botón de aprobar (solo «Devolver») y
 * parecía que no podía aprobar. Ahora lo ve, deshabilitado, con el motivo.
 */
type Accion = { item: Item; tipo: 'revisar'; revision: string } | { item: Item; tipo: 'aprobar' };

export function ConcertacionBandeja({ idPeriodo, firmaSimulada }: { idPeriodo?: string; firmaSimulada: boolean }) {
  const revision = useRevisionProgramacion('concertacion');
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [devolviendo, setDevolviendo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [accion, setAccion] = useState<Accion | null>(null);
  // Periodo del que ya se cargó la lista: solo un periodo distinto la reemplaza por «Cargando». Si se
  // refresca tras una firma, la lista y el modal siguen montados (si no, el modal reaparecía en la verificación).
  const cargadoDe = useRef<string | undefined | null>(null);

  useEffect(() => {
    let vigente = true;
    if (cargadoDe.current !== idPeriodo) setCargando(true);
    getBandejaConcertacion(idPeriodo)
      .then((r) => { if (vigente) { setItems(r); setError(''); cargadoDe.current = idPeriodo; } })
      .catch((e) => { if (vigente) setError(e?.message || 'No se pudo cargar la bandeja.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idPeriodo, revision]);

  const devolver = async (id: string) => {
    setAviso(''); setOcupado(id);
    try { await devolverConcertacion(id, comentario); setDevolviendo(null); setComentario(''); }
    catch (e: any) { setAviso(e?.message || 'No se pudo devolver.'); }
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
      <p className="text-xs text-slate-500">
        Orden del flujo: el programador envía → el área académica revisa y firma → la jefatura aprueba y firma →
        el docente acepta y firma. Cualquiera de los dos puede devolverla al programador con un comentario.
      </p>
      {aviso && <p role="alert" className="text-sm text-red-700">{aviso}</p>}
      {items.length === 0 && <p className="text-sm text-slate-500">No tiene concertaciones por decidir.</p>}

      {items.map((c) => {
        const busy = ocupado === c.idConcertacion;
        const revisionesPendientes = c.estado === 'ENVIADA' ? c.puede.revisar : [];
        const aprobable = c.estado === 'REVISADA';
        return (
          <div key={c.idConcertacion} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <p className="font-semibold text-slate-800">{c.docente} <span className="text-xs text-slate-400">CC {c.documento}</span></p>
              <p className="text-xs text-slate-500">
                {c.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'} · {c.numFranjas} franja(s) · {c.horas} h
                {c.periodoCodigo ? ` · Periodo ${c.periodoCodigo}` : ''}
              </p>
            </div>
            <EtapasConcertacion estado={c.estado} />
            <ul className="text-xs text-slate-600 list-disc pl-5">
              {c.franjas.map((f) => <li key={f.idFranja}>{f.codigoAsignatura} · {f.asignatura} · {f.horas} h</li>)}
            </ul>
            <RegistroFirmas firmas={c.firmas} />

            <div className="flex flex-wrap items-center gap-2">
              {revisionesPendientes.map((tipo) => (
                <button key={tipo} type="button" disabled={busy}
                  onClick={() => { setAviso(''); setAccion({ item: c, tipo: 'revisar', revision: tipo }); }}
                  className="px-4 py-2 rounded-lg bg-[#003DA5] hover:bg-[#002d7a] text-white text-xs font-bold disabled:opacity-50">
                  Revisar y firmar ({tipo === 'academica' ? 'académica' : tipo})
                </button>
              ))}
              {c.puede.aprobar && (
                <button type="button" disabled={!aprobable || busy}
                  title={aprobable ? undefined : 'Se habilita cuando termine la revisión académica.'}
                  onClick={() => { setAviso(''); setAccion({ item: c, tipo: 'aprobar' }); }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 disabled:hover:bg-emerald-600">
                  Aprobar y firmar
                </button>
              )}
              {c.puede.devolver && devolviendo !== c.idConcertacion && (
                <button type="button" onClick={() => { setDevolviendo(c.idConcertacion); setComentario(''); }}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-bold">
                  Devolver al programador
                </button>
              )}
            </div>
            {c.puede.aprobar && !aprobable && (
              <p className="text-[11px] text-slate-500">«Aprobar» se habilita cuando termine la revisión académica.</p>
            )}

            {c.puede.devolver && devolviendo === c.idConcertacion && (
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Motivo de la devolución" value={comentario} onChange={(e) => setComentario(e.target.value)}
                  placeholder="Motivo de la devolución" className="flex-1 min-w-[200px] border border-slate-200 rounded px-2 py-1 text-sm" />
                <button type="button" disabled={!comentario.trim() || busy} onClick={() => devolver(c.idConcertacion)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-50">Confirmar devolución</button>
                <button type="button" onClick={() => setDevolviendo(null)} className="text-xs text-slate-500">Cancelar</button>
              </div>
            )}
          </div>
        );
      })}

      {accion && (
        <FirmaOtpModal
          etapaLabel={accion.tipo === 'revisar' ? 'Revisión académica de la docencia' : 'Aprobación de la docencia'}
          firmanteCargo={accion.tipo === 'revisar' ? 'Revisor académico' : 'Aprobador'}
          docenteNombre={accion.item.docente}
          periodo={accion.item.periodoCodigo || ''}
          totalHoras={accion.item.horas}
          referencia={accion.item.idConcertacion}
          firmaSimulada={firmaSimulada}
          textoConfirmar={accion.tipo === 'revisar' ? 'Firmar revisión' : 'Firmar y aprobar'}
          onFirmar={async (codigo) => {
            if (accion.tipo === 'revisar') await revisarConcertacion(accion.item.idConcertacion, codigo, accion.revision);
            else await aprobarConcertacion(accion.item.idConcertacion, codigo);
          }}
          onCerrar={() => setAccion(null)}
        />
      )}
    </div>
  );
}
