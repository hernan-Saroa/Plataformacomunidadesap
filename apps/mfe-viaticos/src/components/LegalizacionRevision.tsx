import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  DetalleRevision,
  FiltroBandejaRevision,
  ItemBandejaRevision,
  legalizacionService,
  SoporteCargado,
} from '../services/api/legalizacionService';
import { formatearFechaLimite, formatearPesos } from './LegalizacionComisionado';

/**
 * EFDS-1310 — Revisión de legalizaciones por el analista de viáticos.
 *
 * Bandeja (por revisar / devueltas / cerradas), revisión soporte por soporte,
 * devolución con observación obligatoria, aprobación, exportación del CSV para
 * SIIF y registro del número SIIF, que pasa la comisión a LEGALIZADO y cierra
 * el expediente. Todo el estado es del servidor.
 */

const MIN_OBS = 10;

const PESTANAS: Array<{ id: FiltroBandejaRevision; etiqueta: string }> = [
  { id: 'POR_REVISAR', etiqueta: 'Por revisar' },
  { id: 'DEVUELTAS', etiqueta: 'Devueltas' },
  { id: 'CERRADAS', etiqueta: 'Legalizadas' },
];

const ACCION_TEXTO: Record<string, string> = {
  SOPORTE_APROBADO: 'Soporte aprobado',
  SOPORTE_RECHAZADO: 'Soporte rechazado',
  DEVOLUCION: 'Devuelta al comisionado',
  APROBACION: 'Revisión aprobada',
  EXPORTACION_SIIF: 'CSV exportado para SIIF',
  REGISTRO_SIIF_Y_CIERRE: 'Registrada en SIIF y cerrada',
};

function mensajeDeError(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Ocurrió un error inesperado.';
}

/** Hoy en Colombia (AAAA-MM-DD), para el valor por defecto de la fecha SIIF. */
function hoyColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function FilaSoporteRevision({
  soporte,
  puedeRevisar,
  onRevisar,
  onVer,
}: {
  soporte: SoporteCargado;
  puedeRevisar: boolean;
  onRevisar: (decision: 'APROBADO' | 'RECHAZADO', observacion?: string) => Promise<void>;
  onVer: () => void;
}) {
  const [rechazando, setRechazando] = useState(false);
  const [obs, setObs] = useState('');
  return (
    <li className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs text-slate-700">
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{soporte.nombreArchivoOriginal}</span>
          {soporte.revision === 'APROBADO' && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Aprobado</span>
          )}
          {soporte.revision === 'RECHAZADO' && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Rechazado</span>
          )}
          {soporte.revision == null && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">Sin revisar</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={onVer} aria-label={`Ver ${soporte.nombreArchivoOriginal}`}
            className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900">
            <Eye className="h-3.5 w-3.5" />
          </button>
          {puedeRevisar && (
            <>
              <button type="button" onClick={() => onRevisar('APROBADO')}
                aria-label={`Aprobar ${soporte.nombreArchivoOriginal}`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
              </button>
              <button type="button" onClick={() => setRechazando(true)}
                aria-label={`Rechazar ${soporte.nombreArchivoOriginal}`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50">
                <XCircle className="h-3.5 w-3.5" /> Rechazar
              </button>
            </>
          )}
        </span>
      </div>
      {soporte.revision === 'RECHAZADO' && soporte.observacionRevision && (
        <p className="mt-1 text-[11px] text-red-700">Motivo: {soporte.observacionRevision}</p>
      )}
      {rechazando && (
        <div className="mt-2 space-y-2">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            aria-label={`Motivo del rechazo de ${soporte.nombreArchivoOriginal}`}
            placeholder="Explique qué debe corregir el comisionado"
            className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setRechazando(false); setObs(''); }}
              className="rounded px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" disabled={obs.trim().length < MIN_OBS}
              onClick={async () => { await onRevisar('RECHAZADO', obs.trim()); setRechazando(false); setObs(''); }}
              className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white disabled:bg-slate-300">
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function DetalleRevisionView({ solicitudId, onVolver }: { solicitudId: string; onVolver: () => void }) {
  const [d, setD] = useState<DetalleRevision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [devolviendo, setDevolviendo] = useState(false);
  const [obsDevolucion, setObsDevolucion] = useState('');
  const [siif, setSiif] = useState({ numero: '', fecha: hoyColombia(), valor: '', dias: '', obs: '' });
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setD(await legalizacionService.detalleRevision(solicitudId));
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [solicitudId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (fn: () => Promise<unknown>, ok?: string) => {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      await fn();
      if (ok) setAviso(ok);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  if (!d) {
    return error ? (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    ) : (
      <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
    );
  }

  const cerrada = d.estadoSolicitud === 'LEGALIZADO';
  const valorLegalizado = Number(siif.valor);
  const reintegroPrevio =
    siif.valor !== '' && Number.isFinite(valorLegalizado) ? Number(d.valorPagado ?? 0) - valorLegalizado : null;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" /> Volver a la bandeja
      </button>

      <div>
        <h3 className="text-base font-black text-slate-900">{d.consecutivoUnico}</h3>
        <p className="text-xs text-slate-500">
          {d.comisionadoNombre} · {d.destino} · {d.fechaInicio} a {d.fechaFin}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Pagado {formatearPesos(d.valorPagado)} el {d.fechaPago} · Obligación {d.numeroObligacion} · RP {d.codigoRp}
        </p>
        {d.fechaEnvio && !cerrada && (
          <p className="mt-1 text-xs text-slate-600">
            Enviada el {formatearFechaLimite(d.fechaEnvio)} · plazo {formatearFechaLimite(d.fechaLimite)}
          </p>
        )}
      </div>

      {cerrada && (
        <div role="note" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Expediente cerrado: no admite cambios.</p>
            <p className="mt-1">
              Registro SIIF {d.numeroRegistroSiif} del {d.fechaRegistroSiif} · Legalizado {formatearPesos(d.valorLegalizado)}
              {Number(d.valorReintegro ?? 0) > 0 ? ` · Reintegro ${formatearPesos(d.valorReintegro)}` : ' · Sin reintegro'}
            </p>
          </div>
        </div>
      )}
      {d.devuelta && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Devuelta al comisionado: {d.observacionDevolucion} Esperando que la reenvíe.
        </div>
      )}
      {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{aviso}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

      <ul className="space-y-3">
        {d.checklist.items.map((item) => (
          <li key={item.tipoDocumentoSoporteId} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-900">
              {item.nombre}{' '}
              <span className="text-[10px] font-bold text-slate-500">
                {item.tipoRequisito === 'OBLIGATORIO' ? 'Obligatorio' : 'Opcional'}
              </span>
            </p>
            {item.soportes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Sin soportes cargados.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {item.soportes.map((s) => (
                  <FilaSoporteRevision
                    key={s.id}
                    soporte={s}
                    puedeRevisar={d.puedeRevisar && !trabajando}
                    onVer={async () => {
                      try {
                        window.open(await legalizacionService.abrirSoporte(solicitudId, s.id), '_blank', 'noopener');
                      } catch (e) {
                        setError(mensajeDeError(e));
                      }
                    }}
                    onRevisar={(decision, observacion) =>
                      ejecutar(() => legalizacionService.revisarSoporte(solicitudId, s.id, decision, observacion))
                    }
                  />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {d.puedeRevisar && (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          {devolviendo ? (
            <div className="space-y-2">
              <textarea value={obsDevolucion} onChange={(e) => setObsDevolucion(e.target.value)}
                aria-label="Observación para el comisionado" rows={3}
                placeholder="Qué debe corregir el comisionado (obligatorio)"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDevolviendo(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="button" disabled={obsDevolucion.trim().length < MIN_OBS || trabajando}
                  onClick={() => ejecutar(async () => {
                    await legalizacionService.devolver(solicitudId, obsDevolucion.trim());
                    setDevolviendo(false);
                  }, 'Legalización devuelta al comisionado.')}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
                  Confirmar devolución
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDevolviendo(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50">
                <RotateCcw className="h-3.5 w-3.5" /> Devolver al comisionado
              </button>
              <button type="button" disabled={!d.puedeAprobar || trabajando}
                onClick={() => ejecutar(() => legalizacionService.aprobarRevision(solicitudId), 'Revisión aprobada.')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Aprobar revisión
              </button>
            </div>
          )}
          {!d.puedeAprobar && (
            <p className="text-right text-[11px] text-slate-500">
              Para aprobar, todos los soportes deben estar revisados y aprobados.
            </p>
          )}
        </div>
      )}

      {d.puedeRegistrarSiif && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Registro en SIIF Nación</p>
            <button type="button" disabled={trabajando}
              onClick={() => ejecutar(async () => {
                const { nombre, url } = await legalizacionService.exportarSiif(solicitudId);
                const a = document.createElement('a');
                a.href = url;
                a.download = nombre;
                a.click();
              }, 'CSV para SIIF descargado.')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-800">
              <Download className="h-3.5 w-3.5" /> Exportar CSV para SIIF
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">Número del registro en SIIF
              <input value={siif.numero} onChange={(e) => setSiif({ ...siif, numero: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
            </label>
            <label className="text-xs text-slate-700">Fecha del registro
              <input type="date" value={siif.fecha} max={hoyColombia()}
                onChange={(e) => setSiif({ ...siif, fecha: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
            </label>
            <label className="text-xs text-slate-700">Valor legalizado (COP)
              <input inputMode="numeric" value={siif.valor} onChange={(e) => setSiif({ ...siif, valor: e.target.value.replace(/[^\d.]/g, '') })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
            </label>
            <label className="text-xs text-slate-700">Días reales de la comisión (opcional)
              <input inputMode="decimal" value={siif.dias} onChange={(e) => setSiif({ ...siif, dias: e.target.value.replace(/[^\d.]/g, '') })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
            </label>
          </div>
          {reintegroPrevio !== null && (
            <p className={`text-xs ${reintegroPrevio < 0 ? 'text-red-700' : 'text-slate-700'}`}>
              {reintegroPrevio < 0
                ? 'El valor legalizado no puede superar el pagado.'
                : reintegroPrevio > 0
                  ? `Viaje menor: el comisionado deberá reintegrar ${formatearPesos(reintegroPrevio)}.`
                  : 'Sin diferencia con lo pagado: no hay reintegro.'}
            </p>
          )}
          {confirmarCierre ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-slate-600">Al registrar, la comisión queda LEGALIZADO y el expediente se cierra sin posibilidad de cambios.</span>
              <button type="button" onClick={() => setConfirmarCierre(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="button" disabled={trabajando}
                onClick={() => ejecutar(async () => {
                  await legalizacionService.registrarSiif(solicitudId, {
                    numeroRegistroSiif: siif.numero.trim(),
                    fechaRegistroSiif: siif.fecha,
                    valorLegalizado: Number(siif.valor),
                    diasReales: siif.dias === '' ? null : Number(siif.dias),
                    observaciones: siif.obs || undefined,
                  });
                  setConfirmarCierre(false);
                }, 'Legalización registrada en SIIF. Comisión legalizada y expediente cerrado.')}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">
                Confirmar registro y cierre
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button"
                disabled={!siif.numero.trim() || !siif.fecha || siif.valor === '' || (reintegroPrevio ?? 0) < 0}
                onClick={() => setConfirmarCierre(true)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300">
                Registrar en SIIF y cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {d.historialRevision.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-bold text-slate-700">Trazabilidad de la revisión</p>
          <ol className="space-y-1 text-[11px] text-slate-600">
            {d.historialRevision.map((h) => (
              <li key={h.id}>
                {formatearFechaLimite(h.creadoEn)} — {ACCION_TEXTO[h.accion] ?? h.accion}
                {h.observacion ? `: ${h.observacion}` : ''}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function LegalizacionRevision() {
  const [filtro, setFiltro] = useState<FiltroBandejaRevision>('POR_REVISAR');
  const [items, setItems] = useState<ItemBandejaRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      setItems(await legalizacionService.bandejaRevision(filtro));
    } catch (e) {
      setError(mensajeDeError(e));
      setItems([]);
    }
  }, [filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            Revisión de legalizaciones
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Revise los soportes, registre en SIIF y cierre el expediente.</p>
        </div>
        {!seleccionada && (
          <button type="button" onClick={cargar} aria-label="Actualizar bandeja" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {seleccionada ? (
        <DetalleRevisionView solicitudId={seleccionada} onVolver={() => { setSeleccionada(null); void cargar(); }} />
      ) : (
        <>
          <div role="tablist" className="mb-3 flex gap-1">
            {PESTANAS.map((p) => (
              <button key={p.id} role="tab" aria-selected={filtro === p.id} type="button" onClick={() => setFiltro(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filtro === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {p.etiqueta}
              </button>
            ))}
          </div>
          {items === null ? (
            <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">No hay legalizaciones en esta bandeja.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.legalizacionId}>
                  <button type="button" onClick={() => setSeleccionada(i.solicitudId)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{i.consecutivoUnico}</p>
                      <p className="truncate text-xs text-slate-500">{i.comisionadoNombre} · {i.destino}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      {filtro === 'CERRADAS' ? (
                        <span>SIIF {i.numeroRegistroSiif}{Number(i.valorReintegro ?? 0) > 0 ? ` · reintegro ${formatearPesos(i.valorReintegro)}` : ''}</span>
                      ) : (
                        <>
                          <span>{i.soportes} soportes · {i.sinRevisar} sin revisar · {i.rechazados} rechazados</span>
                          {i.enviadaFueraDePlazo && <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">Enviada fuera de plazo</span>}
                          {i.revisionAprobadaEn && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">Aprobada, falta SIIF</span>}
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
