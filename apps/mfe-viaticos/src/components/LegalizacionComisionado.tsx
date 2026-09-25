import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  DetalleLegalizacion,
  ItemChecklistLegalizacion,
  legalizacionService,
  ResumenLegalizacion,
  SemaforoLegalizacion,
} from '../services/api/legalizacionService';

/**
 * EFDS-1309 — Legalización de comisiones, vista del comisionado / enlace.
 *
 * Lista las comisiones con legalización abierta, con su plazo, y permite cargar
 * los soportes del checklist (PDF) y enviarla a revisión cuando está completa.
 * Todo el estado viene del servidor: no se guarda nada solo en el navegador.
 */

const SEMAFORO: Record<SemaforoLegalizacion, { etiqueta: string; clase: string }> = {
  VIGENTE: { etiqueta: 'En plazo', clase: 'bg-emerald-100 text-emerald-800' },
  POR_VENCER: { etiqueta: 'Por vencer', clase: 'bg-amber-100 text-amber-800' },
  VENCIDA: { etiqueta: 'Vencida', clase: 'bg-red-100 text-red-700' },
  ENVIADA: { etiqueta: 'Enviada a revisión', clase: 'bg-blue-100 text-blue-800' },
};

/** Fecha y hora en Colombia, sin depender de la zona del navegador. */
export function formatearFechaLimite(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mensajeDeError(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Ocurrió un error inesperado.';
}

/** Indicador visible: el cierre y la devolución (EFDS-1310) priman sobre el plazo. */
function indicador(leg: ResumenLegalizacion): { etiqueta: string; clase: string; semaforo: SemaforoLegalizacion } {
  if (leg.estadoSolicitud === 'LEGALIZADO') {
    return { etiqueta: 'Legalizada', clase: 'bg-emerald-600 text-white', semaforo: 'ENVIADA' };
  }
  if (leg.devuelta) {
    return { etiqueta: 'Devuelta', clase: 'bg-red-100 text-red-700', semaforo: 'VENCIDA' };
  }
  return { ...SEMAFORO[leg.semaforo], semaforo: leg.semaforo };
}

export function formatearPesos(v: string | number | null | undefined): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    Number(v ?? 0),
  );
}

function BadgeLegalizacion({ leg }: { leg: ResumenLegalizacion }) {
  const s = indicador(leg);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.clase}`}>
      {s.semaforo === 'VENCIDA' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {s.etiqueta}
    </span>
  );
}

function TextoPlazo({ leg }: { leg: ResumenLegalizacion }) {
  if (leg.estadoSolicitud === 'LEGALIZADO') return <>Legalizada y cerrada</>;
  if (leg.semaforo === 'ENVIADA') return <>Enviada a revisión</>;
  const cuando = formatearFechaLimite(leg.fechaLimite);
  if (leg.semaforo === 'VENCIDA') return <>Venció el {cuando}</>;
  if (leg.diasHabilesRestantes === 0) return <>Vence hoy, {cuando}</>;
  return (
    <>
      Vence el {cuando} · {leg.diasHabilesRestantes} día{leg.diasHabilesRestantes === 1 ? '' : 's'} hábil
      {leg.diasHabilesRestantes === 1 ? '' : 'es'}
    </>
  );
}

function FilaSoporte({
  item,
  puedeEditar,
  cargando,
  onSubir,
  onEliminar,
  onVer,
}: {
  item: ItemChecklistLegalizacion;
  puedeEditar: boolean;
  cargando: boolean;
  onSubir: (item: ItemChecklistLegalizacion, archivo: File) => void;
  onEliminar: (soporteId: string) => void;
  onVer: (soporteId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <li className="rounded-xl border border-slate-200 p-4" data-testid={`item-${item.codigo}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.cumplido ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Cargado" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" aria-label="Pendiente" />
            )}
            <p className="text-sm font-bold text-slate-900">{item.nombre}</p>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                item.tipoRequisito === 'OBLIGATORIO' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.tipoRequisito === 'OBLIGATORIO' ? 'Obligatorio' : 'Opcional'}
            </span>
          </div>
          {item.descripcion && <p className="mt-1 text-xs text-slate-500">{item.descripcion}</p>}
        </div>
        {puedeEditar && (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              aria-label={`Archivo para ${item.nombre}`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSubir(item, f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={cargando}
              onClick={() => input.current?.click()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {item.soportes.length ? 'Agregar otro PDF' : 'Cargar PDF'}
            </button>
          </>
        )}
      </div>

      {item.soportes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {item.soportes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-700">
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{s.nombreArchivoOriginal}</span>
                <span className="shrink-0 text-slate-400">{tamanoLegible(s.tamanoBytes)}</span>
                {s.revision === 'APROBADO' && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Aprobado</span>
                )}
                {s.revision === 'RECHAZADO' && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                    Rechazado: {s.observacionRevision}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onVer(s.id)}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                  aria-label={`Ver ${s.nombreArchivoOriginal}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => onEliminar(s.id)}
                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-red-600"
                    aria-label={`Eliminar ${s.nombreArchivoOriginal}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DetalleView({ solicitudId, onVolver }: { solicitudId: string; onVolver: () => void }) {
  const [detalle, setDetalle] = useState<DetalleLegalizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargandoTipo, setCargandoTipo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEnvio, setConfirmarEnvio] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDetalle(await legalizacionService.detalle(solicitudId));
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [solicitudId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const subir = async (item: ItemChecklistLegalizacion, archivo: File) => {
    setError(null);
    setAviso(null);
    setCargandoTipo(item.tipoDocumentoSoporteId);
    try {
      await legalizacionService.subirSoporte(solicitudId, item.tipoDocumentoSoporteId, archivo);
      setAviso(`"${archivo.name}" cargado en ${item.nombre}.`);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoTipo(null);
    }
  };

  const eliminar = async (soporteId: string) => {
    setError(null);
    try {
      await legalizacionService.eliminarSoporte(solicitudId, soporteId);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const ver = async (soporteId: string) => {
    try {
      const url = await legalizacionService.abrirSoporte(solicitudId, soporteId);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await legalizacionService.enviar(solicitudId);
      setConfirmarEnvio(false);
      setAviso(`Legalización enviada a revisión con ${r.totalSoportes} soporte(s).`);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  if (!detalle) {
    return error ? (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    ) : (
      <div className="flex items-center justify-center p-10 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const { checklist } = detalle;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a mis legalizaciones
      </button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">{detalle.consecutivoUnico}</h3>
          <p className="text-xs text-slate-500">
            {detalle.comisionadoNombre} · {detalle.destino} · {detalle.fechaInicio} a {detalle.fechaFin}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            <TextoPlazo leg={detalle} />
          </p>
        </div>
        <BadgeLegalizacion leg={detalle} />
      </div>

      {detalle.devuelta && (
        <div role="note" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-bold">El analista devolvió la legalización.</p>
          <p className="mt-1">{detalle.observacionDevolucion}</p>
          <p className="mt-1">Reemplace los soportes rechazados y vuelva a enviarla.</p>
        </div>
      )}
      {detalle.estadoSolicitud === 'LEGALIZADO' && (
        <div role="note" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <p className="font-bold">Comisión legalizada. El expediente está cerrado.</p>
          <p className="mt-1">
            Registro SIIF {detalle.numeroRegistroSiif} del {detalle.fechaRegistroSiif} · Legalizado{' '}
            {formatearPesos(detalle.valorLegalizado)} de {formatearPesos(detalle.valorPagado)} pagados.
          </p>
          {Number(detalle.valorReintegro ?? 0) > 0 && (
            <p className="mt-1 font-bold">Valor a reintegrar: {formatearPesos(detalle.valorReintegro)}.</p>
          )}
        </div>
      )}

      {detalle.calendarioIncompleto && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          El plazo cruza un año sin festivos cargados: la fecha límite puede no tener en cuenta algún festivo.
        </div>
      )}
      {aviso && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          {aviso}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {checklist.sinConfiguracion ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
          No hay soportes de legalización configurados para este tipo de comisionado. Comuníquese con el Grupo de
          Viáticos.
        </div>
      ) : (
        <ul className="space-y-3">
          {checklist.items.map((item) => (
            <FilaSoporte
              key={item.tipoDocumentoSoporteId}
              item={item}
              puedeEditar={detalle.puedeEditar}
              cargando={cargandoTipo === item.tipoDocumentoSoporteId}
              onSubir={subir}
              onEliminar={eliminar}
              onVer={ver}
            />
          ))}
        </ul>
      )}

      {detalle.puedeEditar && !checklist.sinConfiguracion && (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {checklist.completo
              ? 'Todos los soportes obligatorios están cargados.'
              : `Faltan ${checklist.obligatoriosPendientes} soporte(s) obligatorio(s).`}
          </p>
          {confirmarEnvio ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Después de enviarla no podrá cambiar los soportes.</span>
              <button
                type="button"
                onClick={() => setConfirmarEnvio(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={enviando}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirmar envío
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!checklist.completo}
              onClick={() => setConfirmarEnvio(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-3.5 w-3.5" /> Enviar a revisión
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LegalizacionComisionado() {
  const [legalizaciones, setLegalizaciones] = useState<ResumenLegalizacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLegalizaciones(await legalizacionService.listarMias());
    } catch (e) {
      setError(mensajeDeError(e));
      setLegalizaciones([]);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Receipt className="h-5 w-5 text-amber-600" />
            Legalización de comisiones
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cargue los soportes de las comisiones pagadas dentro del plazo en días hábiles.
          </p>
        </div>
        {!seleccionada && (
          <button
            type="button"
            onClick={cargar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {seleccionada ? (
        <DetalleView
          solicitudId={seleccionada}
          onVolver={() => {
            setSeleccionada(null);
            void cargar();
          }}
        />
      ) : legalizaciones === null ? (
        <div className="flex items-center justify-center p-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : legalizaciones.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          <Receipt className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          No tiene comisiones pendientes de legalizar.
        </div>
      ) : (
        <ul className="space-y-2">
          {legalizaciones.map((l) => (
            <li key={l.legalizacionId}>
              <button
                type="button"
                onClick={() => setSeleccionada(l.solicitudId)}
                className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 p-4 text-left hover:border-slate-300 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{l.consecutivoUnico}</p>
                  <p className="truncate text-xs text-slate-500">
                    {l.comisionadoNombre} · {l.destino}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    <TextoPlazo leg={l} />
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {l.semaforo !== 'ENVIADA' && (l.obligatoriosPendientes ?? 0) > 0 && (
                    <span className="text-[11px] text-slate-500">
                      {l.obligatoriosPendientes} pendiente{l.obligatoriosPendientes === 1 ? '' : 's'}
                    </span>
                  )}
                  <BadgeLegalizacion leg={l} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
