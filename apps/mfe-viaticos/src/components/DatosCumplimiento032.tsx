import React, { useEffect, useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { DatosCumplimiento, legalizacionService } from '../services/api/legalizacionService';

interface Props {
  solicitudId: string;
  cumplimiento: DatosCumplimiento | undefined;
  /** Fechas planeadas de la comisión: el formulario arranca con ellas. */
  fechaInicio: string;
  fechaFin: string;
  puedeEditar: boolean;
  onGuardado: () => Promise<void> | void;
}

const hoyColombia = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * EFDS-1309/1310 — Datos del formato GF-FO-032 V2 que el comisionado diligencia
 * al legalizar: las fechas en que realmente cumplió la comisión (con ellas se
 * calcula el reintegro por viaje más corto) y si la cumplió fuera de la ESAP
 * (entonces se exige el certificado de la entidad externa). El plazo de
 * legalización no cambia: sale de la fecha planeada.
 */
export default function DatosCumplimiento032({ solicitudId, cumplimiento, fechaInicio, fechaFin, puedeEditar, onGuardado }: Props) {
  const [inicio, setInicio] = useState(cumplimiento?.fechaInicioReal ?? fechaInicio);
  const [fin, setFin] = useState(cumplimiento?.fechaFinReal ?? fechaFin);
  const [externa, setExterna] = useState<boolean | null>(cumplimiento?.comisionExterna ?? null);
  const [entidad, setEntidad] = useState(cumplimiento?.entidadExterna ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInicio(cumplimiento?.fechaInicioReal ?? fechaInicio);
    setFin(cumplimiento?.fechaFinReal ?? fechaFin);
    setExterna(cumplimiento?.comisionExterna ?? null);
    setEntidad(cumplimiento?.entidadExterna ?? '');
  }, [cumplimiento, fechaInicio, fechaFin]);

  const registrado = Boolean(cumplimiento?.registrado);

  if (!puedeEditar) {
    return registrado ? (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-bold text-slate-900">Datos del GF-FO-032</p>
        <p className="mt-1">
          Cumplida del {cumplimiento!.fechaInicioReal} al {cumplimiento!.fechaFinReal}
          {cumplimiento!.comisionExterna ? ` · fuera de la ESAP: ${cumplimiento!.entidadExterna}` : ' · en la ESAP'}
        </p>
      </div>
    ) : null;
  }

  const invalida = !inicio || !fin || fin < inicio || fin > hoyColombia();
  const incompleto = externa === null || (externa && entidad.trim().length < 2);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await legalizacionService.registrarCumplimiento(solicitudId, {
        fechaInicioReal: inicio,
        fechaFinReal: fin,
        comisionExterna: Boolean(externa),
        entidadExterna: externa ? entidad.trim() : null,
      });
      await onGuardado();
    } catch (e: any) {
      setError(e?.message || 'No fue posible guardar los datos del GF-FO-032.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-032" className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div>
        <h4 id="titulo-032" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <CalendarCheck className="h-4 w-4 text-blue-700" /> Datos del formato GF-FO-032
        </h4>
        <p className="text-xs text-slate-600">
          Las fechas en que realmente cumplió la comisión, tal como quedan en el formato. Si regresó antes de lo
          planeado, se calcula el reintegro de los días no viajados.
        </p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-700">Fecha real de inicio
          <input type="date" value={inicio} max={hoyColombia()} onChange={(e) => setInicio(e.target.value)} disabled={guardando}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
        </label>
        <label className="text-xs text-slate-700">Fecha real de regreso
          <input type="date" value={fin} min={inicio} max={hoyColombia()} onChange={(e) => setFin(e.target.value)} disabled={guardando}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
        </label>
      </div>
      <fieldset className="text-xs text-slate-700">
        <legend className="mb-1">¿La comisión se cumplió fuera de la ESAP?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1">
            <input type="radio" name={`externa-${solicitudId}`} checked={externa === false} onChange={() => setExterna(false)} disabled={guardando} /> No
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name={`externa-${solicitudId}`} checked={externa === true} onChange={() => setExterna(true)} disabled={guardando} /> Sí
          </label>
        </div>
      </fieldset>
      {externa && (
        <label className="block text-xs text-slate-700">Entidad donde se cumplió
          <input value={entidad} onChange={(e) => setEntidad(e.target.value)} maxLength={200} disabled={guardando}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
          <span className="text-[11px] text-slate-500">Se exigirá el certificado de la entidad externa.</span>
        </label>
      )}
      {fin && inicio && fin < inicio && <p className="text-xs text-red-700">La fecha de regreso no puede ser anterior a la de inicio.</p>}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{registrado ? 'Datos registrados. Puede corregirlos antes de enviar.' : 'Pendiente de registrar.'}</p>
        <button type="button" onClick={() => void guardar()} disabled={guardando || invalida || incompleto}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
          {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Guardar datos del GF-FO-032
        </button>
      </div>
    </section>
  );
}
