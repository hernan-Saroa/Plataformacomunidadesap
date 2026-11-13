import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Link2, Link2Off, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  cambiarInteroperabilidad, getInteroperabilidad, type EstadoInteroperabilidad, type ResultadoEncendido,
} from '../../../services/api/interoperabilidadApi';

const CORTE = /^\d{4}-[12]$/;
const ORIGEN: Record<EstadoInteroperabilidad['origen'], string> = {
  base: 'Guardado por un administrador', variable_entorno: 'Valor inicial del ambiente', por_defecto: 'Valor por defecto (apagado)',
};

function fecha(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * PTA → Configuración → Interoperabilidad con Programación Académica (EFDS-2435).
 * Encendido: la Docencia Directa llega de Programación Académica (solo lectura).
 * Apagado: el docente la registra a mano. Un solo interruptor global, con motivo y auditoría;
 * el servidor valida permiso, motivo y confirmación.
 */
export function TabInteroperabilidad() {
  const [estado, setEstado] = useState<EstadoInteroperabilidad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corte, setCorte] = useState('');
  const [confirmar, setConfirmar] = useState<null | { habilitada: boolean }>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEncendido | null>(null);

  const cargar = useCallback(async () => {
    try {
      const e = await getInteroperabilidad();
      setEstado(e); setCorte(e.desdePeriodo); setError(null);
    } catch (e: any) {
      setError(e?.status === 403 || e?.response?.status === 403
        ? 'No tiene permiso para ver ni cambiar la interoperabilidad con Programación Académica.'
        : 'No se pudo consultar el estado de la interoperabilidad. Intente de nuevo.');
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrir = (habilitada: boolean) => { setMotivo(''); setErrorModal(null); setConfirmar({ habilitada }); };
  const corteValido = CORTE.test(corte.trim());
  const cambioDeCorte = !!estado && corte.trim() !== estado.desdePeriodo;

  const aplicar = async () => {
    if (!confirmar || !estado) return;
    if (motivo.trim().length < 10) { setErrorModal('Explique el motivo del cambio (mínimo 10 caracteres).'); return; }
    setEnviando(true); setErrorModal(null);
    try {
      const r = await cambiarInteroperabilidad({ habilitada: confirmar.habilitada, desdePeriodo: corte.trim(), motivo: motivo.trim() });
      setEstado({ ...r.config, impacto: r.impacto }); setCorte(r.config.desdePeriodo);
      setResultado(r.resultado); setConfirmar(null);
      toast.success(confirmar.habilitada ? 'Interoperabilidad encendida.' : 'Interoperabilidad apagada: la Docencia Directa se registra a mano.');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.data?.message ?? e?.message;
      setErrorModal(Array.isArray(msg) ? msg.join(' ') : (msg || 'No se pudo guardar el cambio.'));
    } finally { setEnviando(false); }
  };

  if (error) return <p role="alert" className="p-6 text-sm text-amber-800">{error}</p>;
  if (!estado) return <p role="status" className="p-6 text-sm text-slate-500">Cargando…</p>;

  const encendida = estado.habilitada;
  const destino = confirmar?.habilitada;
  return (
    <section aria-labelledby="interop-titulo" className="max-w-3xl space-y-5">
      <header>
        <h3 id="interop-titulo" className="text-lg font-black text-slate-900">Interoperabilidad con Programación Académica</h3>
        <p className="text-sm text-slate-600 mt-1">
          Decide cómo se llena la <strong>Docencia Directa</strong> del PTA. Programación Académica funciona completa siempre
          (asignar, revisar, aprobar, aceptar); este interruptor solo controla si lo aceptado llega al PTA.
        </p>
      </header>

      <div className={`rounded-2xl border p-5 ${encendida ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            {encendida ? <Link2 className="w-6 h-6 text-emerald-600 mt-0.5" /> : <Link2Off className="w-6 h-6 text-slate-500 mt-0.5" />}
            <div>
              <div className="text-sm font-black text-slate-900">{encendida ? 'Encendida — la docencia llega de Programación Académica' : 'Apagada — la docencia se registra a mano'}</div>
              <div className="text-xs text-slate-600 mt-1">
                {encendida
                  ? 'Docencia Directa en solo lectura desde el periodo de corte; se aprueba en la concertación.'
                  : 'El docente registra sus asignaturas y horas, como antes. El PTA no consulta a Programación Académica.'}
              </div>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={encendida} aria-label="Interoperabilidad con Programación Académica"
            onClick={() => abrir(!encendida)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold border border-slate-300 bg-white hover:bg-slate-100">
            {encendida ? 'Apagar…' : 'Encender…'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-bold text-slate-500 uppercase">Periodo de corte (AAAA-S)</span>
            <input value={corte} onChange={(e) => setCorte(e.target.value)} inputMode="numeric" placeholder="2026-1"
              aria-invalid={!corteValido}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/20" />
            <span className="text-[0.7rem] text-slate-500">Desde este periodo la Docencia llega de Programación Académica (con el interruptor encendido).</span>
          </label>
          <div className="flex items-end">
            <button type="button" disabled={!cambioDeCorte || !corteValido} onClick={() => abrir(encendida)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white disabled:opacity-40">
              Guardar periodo de corte…
            </button>
          </div>
        </div>
      </div>

      <dl className="text-xs text-slate-600 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
        <dt className="font-bold">Origen del valor</dt><dd>{ORIGEN[estado.origen]}</dd>
        <dt className="font-bold">Último cambio</dt><dd>{fecha(estado.cambiadoEn)}{estado.cambiadoPor ? ` · usuario ${estado.cambiadoPor}` : ''}</dd>
        <dt className="font-bold">Motivo</dt><dd>{estado.motivo ?? '—'}</dd>
      </dl>

      {resultado && (
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Al encender se aplicó lo pendiente:</strong> {resultado.aplicadas} aplicada(s), {resultado.conflicto} en conflicto
          (docencia cargada a mano: no se pisó), {resultado.omitidas} omitida(s) (PTA enviado, firmado o sin PTA).
          {resultado.errores.length > 0 && <div className="mt-1 text-xs text-amber-800">Con error: {resultado.errores.length}.</div>}
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { if (!enviando) setConfirmar(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="interop-confirmar"
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 id="interop-confirmar" className="text-base font-black text-slate-900">
                {destino === encendida && cambioDeCorte ? 'Cambiar el periodo de corte' : destino ? 'Encender la interoperabilidad' : 'Apagar la interoperabilidad'}
              </h3>
              <button type="button" aria-label="Cerrar" disabled={enviando} onClick={() => setConfirmar(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm text-slate-700">
              {destino === encendida && cambioDeCorte && <p>El periodo de corte pasará de <strong>{estado.desdePeriodo}</strong> a <strong>{corte.trim()}</strong>.</p>}
              {destino && !encendida && (
                <p>Se aplicarán al PTA las decisiones aceptadas mientras estuvo apagada ({estado.impacto.decisionesPendientes} pendiente(s)). Un PTA con docencia cargada a mano
                  <strong> no se pisa</strong> (queda en conflicto) y uno enviado o firmado no se toca.</p>
              )}
              {!destino && encendida && (
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>{estado.impacto.concertacionesEnCurso}</strong> concertación(es) en curso: siguen su camino.</li>
                  <li><strong>{estado.impacto.ptasConDocenciaAplicada}</strong> PTA con docencia aplicada desde Programación Académica: se conserva y pasa a ser editable.</li>
                  <li>No se borra nada. Lo que se acepte desde ahora queda pendiente hasta que se vuelva a encender.</li>
                </ul>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-[0.7rem] font-bold text-slate-500 uppercase">Motivo del cambio (obligatorio, mínimo 10 caracteres)</span>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} autoFocus
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <p className="text-xs text-slate-500">Queda auditado: quién, cuándo, valor anterior y nuevo, y este motivo.</p>
              {errorModal && <p role="alert" className="flex items-start gap-2 text-xs text-amber-800"><AlertCircle className="w-4 h-4 shrink-0" />{errorModal}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button type="button" disabled={enviando} onClick={() => setConfirmar(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="button" disabled={enviando || motivo.trim().length < 10 || !corteValido} onClick={() => void aplicar()}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40">
                {enviando ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
