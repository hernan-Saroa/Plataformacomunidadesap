import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DecisionRevisionPaa, DetalleRevisionPaa, LineaEncontradaPaa } from '../../types';
import { useDialogo } from '../shared/useDialogo';
import { DECISION, TIPO_REVISION, fechaCorta, pesos, valorPaa } from './formato';

interface Props {
  revisionId: string;
  /** A dónde lleva «volver», con el nombre de la pantalla. */
  volverA: string;
  onVolver: () => void;
  onVerProceso: (procesoId: string) => void;
}

/** Lo mínimo para que la justificación explique algo: queda en el expediente. */
const MINIMO_JUSTIFICACION = 10;

/**
 * Una revisión abierta por un cambio del Plan Anual de Adquisiciones.
 *
 * Dice qué cambió en la línea del proceso, qué se le aplicó ya y qué no —con el
 * motivo—, y deja decidir entre lo que el caso admite. Las decisiones que no
 * aplican se muestran apagadas con su porqué en vez de esconderse: que migrar
 * no aparezca en una línea modificada se entiende solo si se dice que migrar es
 * cosa del cambio de año.
 */
export function RevisionDelPaa({ revisionId, volverA, onVolver, onVerProceso }: Props) {
  const dialogo = useDialogo();
  const [revision, setRevision] = useState<DetalleRevisionPaa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionRevisionPaa | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [destino, setDestino] = useState<LineaEncontradaPaa | null>(null);
  const [enviando, setEnviando] = useState(false);

  const leer = () =>
    contratacionService.paa
      .revision(revisionId)
      .then(setRevision)
      .catch((err: any) => setError(err.message));

  useEffect(() => {
    leer();
  }, [revisionId]);

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!revision) return <p className="text-xs text-gray-400 m-0">Cargando la revisión…</p>;

  const listo =
    decision !== null &&
    justificacion.trim().length >= MINIMO_JUSTIFICACION &&
    (decision !== 'MIGRAR' || destino !== null);

  const decidir = async () => {
    if (!decision) return;
    if (decision === 'CANCELAR') {
      const ok = await dialogo.confirmar({
        titulo: `Cancelar el proceso ${revision.radicado}`,
        descripcion: 'El proceso termina y no admite más cambios. Su expediente sigue consultable. No tiene vuelta atrás.',
        confirmar: 'Cancelar el proceso',
        tono: 'peligro',
      });
      if (!ok) return;
    }
    setEnviando(true);
    try {
      await contratacionService.paa.decidir(revision.id, decision, justificacion.trim(), destino?.id);
      toast.success(`Revisión resuelta: ${DECISION[decision].etiqueta.toLowerCase()}`);
      await leer();
    } catch (err: any) {
      toast.error('No se registró la decisión', { description: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      {dialogo.elemento}

      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#003DA5] hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Volver a {volverA}
      </button>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold text-gray-500">Revisión por cambio del Plan Anual de Adquisiciones</p>
            <h2 className="m-0 text-base font-extrabold text-slate-900">{TIPO_REVISION[revision.tipo]}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {revision.bloquea && revision.estado === 'PENDIENTE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                <Lock className="w-3 h-3" aria-hidden="true" />
                Detiene el proceso
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                revision.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {revision.estado === 'PENDIENTE' ? 'Pendiente' : 'Resuelta'}
            </span>
          </div>
        </div>

        {revision.porCambioAnual && (
          <p className="m-0 flex items-start gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            <CalendarClock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Evaluación por cambio anual, no una actualización de la misma vigencia: el PAA {revision.versionNueva.anio} reemplaza
            al de {revision.versionAnterior.anio}, y un código de un año no equivale al del otro aunque se escriba igual.
          </p>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 m-0">
          <Dato etiqueta="Proceso">
            <button type="button" onClick={() => onVerProceso(revision.procesoId)} className="font-bold text-[#003DA5] hover:underline">
              {revision.radicado}
            </button>
            <span className="block text-slate-600 line-clamp-2">{revision.objeto}</span>
          </Dato>
          <Dato etiqueta="Línea del PAA">
            <span className="font-mono font-bold">{revision.codigo}</span> · {revision.region ?? '—'}
          </Dato>
          <Dato etiqueta="Versiones">
            PAA {revision.versionAnterior.anio} v{revision.versionAnterior.numero} → PAA {revision.versionNueva.anio} v
            {revision.versionNueva.numero}
          </Dato>
          <Dato etiqueta="Decide">
            {revision.responsable?.nombre ?? 'Sin abogado: cualquiera que pueda decidir revisiones del PAA'}
          </Dato>
          <Dato etiqueta="Abierta">{fechaCorta(revision.createdAt)}</Dato>
          <Dato etiqueta="Etapa del proceso">Etapa {revision.etapa}</Dato>
        </dl>

        <p className="m-0 text-sm text-slate-700">{revision.motivo}</p>
      </section>

      {(revision.cambios.linea.length > 0 || revision.cambios.proceso.length > 0) && (
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {revision.cambios.proceso.length > 0 && (
            <div>
              <h3 className="m-0 mb-1.5 text-sm font-extrabold text-slate-800">Lo que el cambio le hizo al proceso</h3>
              <ul className="cambios-paa m-0 space-y-1">
                {revision.cambios.proceso.map((c) => (
                  <li key={c.campo} className="text-xs">
                    <span className={`font-bold ${c.aplicado ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {c.aplicado ? 'Aplicado' : 'No aplicado'}
                    </span>{' '}
                    · {c.etiqueta}: {valorPaa(c.campo, c.antes)} → {valorPaa(c.campo, c.despues)}
                    {c.motivo && <span className="block text-gray-500">{c.motivo}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {revision.cambios.linea.length > 0 && (
            <div>
              <h3 className="m-0 mb-1.5 text-sm font-extrabold text-slate-800">Lo que cambió en la línea</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-gray-500">
                    <tr>
                      <th className="px-2.5 py-1.5 font-bold">Campo</th>
                      <th className="px-2.5 py-1.5 font-bold">Antes</th>
                      <th className="px-2.5 py-1.5 font-bold">Ahora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {revision.cambios.linea.map((c) => (
                      <tr key={c.campo}>
                        <td className="px-2.5 py-1.5 font-bold">{c.etiqueta}</td>
                        <td className="px-2.5 py-1.5 text-red-700 break-words">{valorPaa(c.campo, c.antes)}</td>
                        <td className="px-2.5 py-1.5 text-emerald-700 break-words">{valorPaa(c.campo, c.despues)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {revision.estado === 'RESUELTA' ? (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="m-0 flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            {DECISION[revision.decision!].etiqueta}
          </p>
          <p className="m-0 mt-1 text-xs text-gray-500">
            {revision.decididaPor} · {fechaCorta(revision.decididaAt)}
          </p>
          <p className="m-0 mt-2 text-sm text-slate-700">{revision.justificacion}</p>
        </section>
      ) : !revision.puedeDecidir ? (
        <p className="m-0 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Esta revisión la decide {revision.responsable?.nombre ?? 'quien pueda decidir revisiones del PAA'}.
        </p>
      ) : (
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="m-0 text-sm font-extrabold text-slate-800">Decisión</h3>
          <div className="space-y-2" role="radiogroup" aria-label="Decisión">
            {revision.decisiones.map((d) => (
              <label
                key={d.decision}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                  d.disponible ? 'cursor-pointer border-gray-200 hover:bg-slate-50' : 'border-gray-100 opacity-50'
                } ${decision === d.decision ? 'border-[#003DA5] bg-[#003DA5]/5' : ''}`}
              >
                <input
                  type="radio"
                  name="decision-paa"
                  value={d.decision}
                  checked={decision === d.decision}
                  disabled={!d.disponible}
                  onChange={() => setDecision(d.decision)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{DECISION[d.decision].etiqueta}</span>
                  <span className="block text-xs text-gray-500">{d.motivo ?? DECISION[d.decision].ayuda}</span>
                </span>
              </label>
            ))}
          </div>

          {decision === 'MIGRAR' && revision.regionId && (
            <BuscarDestino
              regionId={revision.regionId}
              anio={revision.versionNueva.anio}
              elegida={destino}
              onElegir={setDestino}
            />
          )}

          <div>
            <label htmlFor="justificacion-paa" className="block text-xs font-bold text-gray-600 mb-1">
              Justificación <span className="text-red-600">*</span>
            </label>
            <textarea
              id="justificacion-paa"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Por qué se toma esta decisión. Queda en el expediente."
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={decidir}
              disabled={!listo || enviando}
              className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
            >
              {enviando ? 'Registrando…' : 'Registrar la decisión'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-gray-500">{etiqueta}</dt>
      <dd className="m-0 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

/** La línea del año nuevo a la que se migra: la elige el encargado, nunca se empareja sola. */
function BuscarDestino({
  regionId,
  anio,
  elegida,
  onElegir,
}: {
  regionId: string;
  anio: number;
  elegida: LineaEncontradaPaa | null;
  onElegir: (l: LineaEncontradaPaa | null) => void;
}) {
  const [q, setQ] = useState('');
  const [lineas, setLineas] = useState<LineaEncontradaPaa[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      contratacionService.paa
        .buscarLineas(regionId, q, 1, anio)
        .then((r) => setLineas(r.lineas))
        .catch((err: any) => toast.error('No se pudo buscar en el PAA', { description: err.message }));
    }, 300);
    return () => clearTimeout(t);
  }, [regionId, anio, q]);

  if (elegida) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#003DA5] bg-[#003DA5]/5 px-3 py-2">
        <p className="m-0 text-xs">
          Migrar a <span className="font-mono font-bold text-[#003DA5]">{elegida.codigo}</span> (PAA {anio}) ·{' '}
          {elegida.objeto}
        </p>
        <button type="button" onClick={() => onElegir(null)} className="text-xs font-bold text-[#003DA5] hover:underline">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="destino-paa" className="block text-xs font-bold text-gray-600 mb-1">
        Línea del PAA {anio} a la que pasa el proceso
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        <input
          id="destino-paa"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Código u objeto"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        />
      </div>
      <div className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {lineas.map((l) => (
          <button
            key={l.id}
            type="button"
            disabled={!!l.enUso}
            onClick={() => onElegir(l)}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-50 flex items-start gap-3"
          >
            <span className="font-mono text-xs font-bold text-[#003DA5] whitespace-nowrap">{l.codigo}</span>
            <span className="min-w-0 flex-1 text-xs text-slate-700">
              <span className="block line-clamp-2">{l.objeto}</span>
              <span className="block text-gray-500">
                {pesos(l.valorTotal)}
                {l.enUso && ` · ya la usa ${l.enUso.radicado}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
