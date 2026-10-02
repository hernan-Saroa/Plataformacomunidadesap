import React, { useEffect, useMemo, useState } from 'react';
import {
  X, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2, Clock, FileText, Star,
} from 'lucide-react';
import {
  infraestructuraService,
  SolicitudMantenimiento,
} from '../services/infraestructuraService';

export type ModoConformidad = 'confirmar' | 'rechazar';
// OQ-1 default: rating opcional. Si mañana aprobamos obligatorio, cambiar a false.
const CALIFICACION_SERVICIO_OPCIONAL = true as const;
const CALIFICACION_VALORES: readonly (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5] as const;
const ETIQUETA_CALIFICACION: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Muy buena',
};

export interface DetalleConformidadFormProps {
  open: boolean;
  onClose: () => void;
  idSolicitud: string;
  solicitud?: SolicitudMantenimiento | null;
  modo: ModoConformidad;
  onSaved?: (r: SolicitudMantenimiento) => void;
}

const MIN_RECHAZO_LEN = 20;
const MAX_RECHAZO_LEN = 2000;
const MAX_CONFIRMAR_LEN = 500;

export const DetalleConformidadForm: React.FC<DetalleConformidadFormProps> = ({
  open,
  onClose,
  idSolicitud,
  solicitud,
  modo,
  onSaved,
}) => {
  const [observaciones, setObservaciones] = useState('');
  // EFDS-1738 RF-INF-009 Calificación servicio 1-5 editable solo en modo confirmar
  const [ratingSeleccionado, setRatingSeleccionado] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [ratingHover, setRatingHover] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string>('');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'warn' | 'err'; texto: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setObservaciones('');
    setRatingSeleccionado(null);
    setRatingHover(0);
    setErrorForm('');
    setToast(null);
  }, [open, modo]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const maxLen = modo === 'rechazar' ? MAX_RECHAZO_LEN : MAX_CONFIRMAR_LEN;
  const minLen = modo === 'rechazar' ? MIN_RECHAZO_LEN : 0;

  const validar = (): string | null => {
    const obs = observaciones.trim();
    if (modo === 'rechazar') {
      if (obs.length < MIN_RECHAZO_LEN) {
        return `Las observaciones de rechazo requieren al menos ${MIN_RECHAZO_LEN} caracteres.`;
      }
      if (obs.length > MAX_RECHAZO_LEN) {
        return `Máximo ${MAX_RECHAZO_LEN} caracteres para observaciones de rechazo.`;
      }
    } else if (obs.length > MAX_CONFIRMAR_LEN) {
      return `Máximo ${MAX_CONFIRMAR_LEN} caracteres para comentarios de conformidad.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    setErrorForm('');
    const err = validar();
    if (err) {
      setErrorForm(err);
      setToast({ tipo: 'err', texto: err });
      return;
    }
    // EFDS-1738 OQ-1 guardia rating obligatorio (solo modo confirmar)
    if (modo === 'confirmar' && !CALIFICACION_SERVICIO_OPCIONAL && ratingSeleccionado === null) {
      const msg = 'Calificación del servicio es requerida para confirmar conformidad (1 a 5 estrellas).';
      setErrorForm(msg);
      setToast({ tipo: 'err', texto: msg });
      return;
    }
    setEnviando(true);
    try {
      let res: SolicitudMantenimiento;
      if (modo === 'confirmar') {
        const payload: {
          observacionesConformidad?: string;
          calificacionServicio?: 1 | 2 | 3 | 4 | 5;
        } = { observacionesConformidad: observaciones.trim() || undefined };
        if (ratingSeleccionado !== null) {
          payload.calificacionServicio = ratingSeleccionado;
        }
        res = await infraestructuraService.confirmarConformidad(idSolicitud, payload);
        setToast({ tipo: 'ok', texto: 'Conformidad confirmada. Solicitud cerrada exitosamente.' });
      } else {
        res = await infraestructuraService.rechazarConformidad(idSolicitud, {
          observacionesConformidad: observaciones.trim(),
        });
        setToast({ tipo: 'ok', texto: 'Solicitud devuelta para reejecución. Nuevo SLA 24 horas.' });
      }
      setTimeout(() => {
        if (onSaved) onSaved(res);
      }, 400);
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'No fue posible registrar la conformidad.' });
    } finally {
      setEnviando(false);
    }
  };

  const consecutivoDisplay = solicitud?.consecutivo || '—';
  const nombreTecnicoDisplay =
    solicitud?.responsableCierreDisplay ||
    solicitud?.responsableAsignado ||
    'Técnico asignado';

  const categoriaTxt = useMemo(() => {
    if (solicitud?.idCategoria === 48) return 'CS_002 · Eléctricas especializado';
    if (!solicitud?.idCategoria) return '—';
    return `Categoría ${solicitud.idCategoria}`;
  }, [solicitud]);

  const uiConfig = useMemo(() => {
    if (modo === 'confirmar') {
      return {
        headerBg: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        headerIcon: ThumbsUp,
        title: 'Confirmar conformidad del servicio',
        subtitle:
          'Usted como solicitante confirma que el trabajo fue realizado de forma satisfactoria y cierra definitivamente la solicitud.',
        btnLabel: 'Confirmar conformidad',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10 disabled:bg-emerald-400',
        modoBadge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
        modoBadgeLabel: 'Modo confirmar · pasa a CERRADA',
        obsLabel: 'Comentarios adicionales',
        obsPlaceholder:
          'Felicitaciones y comentarios para el técnico UMI, o detalles de conformidad. Campo opcional.',
        obsOpcional: true,
        focusRing: 'focus:ring-emerald-500/30 focus:border-emerald-500',
      };
    }
    return {
      headerBg: 'bg-amber-100 text-amber-700 ring-amber-200',
      headerIcon: ThumbsDown,
      title: 'Devolver solicitud por observaciones',
      subtitle:
        'Rechace la conformidad y devuelva la solicitud al técnico para reejecución. Debe explicar detalladamente qué fue lo que no quedó conforme.',
      btnLabel: 'Devolver para reejecución',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10 disabled:bg-amber-400',
      modoBadge: 'bg-amber-100 text-amber-800 ring-amber-200',
      modoBadgeLabel: 'Modo devolver · pasa a EN_PROGRESO',
      obsLabel: 'Observaciones o motivos de rechazo',
      obsPlaceholder:
        'Describa qué puntos requieren reajuste, corrección o re-ejecución. Sea específico y detallado (diagnóstico errado, falla persistente, limpieza, repuestos equivocados, normativa, etc.).',
      obsOpcional: false,
      focusRing: 'focus:ring-amber-500/30 focus:border-amber-500',
    };
  }, [modo]);

  if (!open) return null;

  const HeaderIcon = uiConfig.headerIcon;
  const counterCls = observaciones.trim().length < minLen
    ? 'text-rose-600'
    : observaciones.trim().length > maxLen
      ? 'text-rose-600'
      : modo === 'rechazar'
        ? observaciones.trim().length >= MIN_RECHAZO_LEN
          ? 'text-emerald-600'
          : 'text-amber-600'
        : 'text-emerald-600';
  const submitDisabled =
    enviando ||
    (modo === 'rechazar' && observaciones.trim().length < MIN_RECHAZO_LEN) ||
    (modo === 'confirmar' && !CALIFICACION_SERVICIO_OPCIONAL && ratingSeleccionado === null);

  return (
    <>
      {/* Backdrop inline — z-10001 por encima del modal padre DetalleSolicitud (z-9999) */}
      <div
        data-testid="conformidad-backdrop"
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[10001]"
        onClick={() => !enviando && onClose()}
        aria-hidden="true"
      />
      {/* Centrado wrapper */}
      <div
        data-testid="conformidad-wrapper"
        className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto p-4 md:p-8 pt-8 pb-16"
      >
        {/* Panel */}
        <div
          data-testid="conformidad-panel"
          className="w-full max-w-2xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`shrink-0 mt-0.5 p-2 rounded-lg ring-1 ${uiConfig.headerBg}`}>
                <HeaderIcon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                  {uiConfig.title}
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                    {consecutivoDisplay}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ring-1 font-medium ${uiConfig.modoBadge}`}>
                    {uiConfig.modoBadgeLabel}
                  </span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {uiConfig.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !enviando && onClose()}
              disabled={enviando}
              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Resumen solicitud */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Categoría</p>
                <p className="text-xs font-medium text-slate-800 truncate">{categoriaTxt}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                  Técnico responsable
                </p>
                <p className="text-xs font-medium text-slate-800 truncate">{nombreTecnicoDisplay}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Estado actual</p>
                <p className="text-xs font-semibold text-slate-800">
                  COMPLETADA · En conformidad
                </p>
              </div>
            </section>

            {/* EFDS-1738 RF-INF-009 Calificación servicio recibido 1-5 (solo modo confirmar) */}
            {modo === 'confirmar' && (
              <section aria-label="Calificación del servicio recibido">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      Califica el servicio recibido
                      <span className="text-[11px] font-normal text-slate-500 ml-1">
                        ({CALIFICACION_SERVICIO_OPCIONAL ? 'opcional' : '* obligatorio'})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Marca 1 (muy mala) a 5 (muy buena) estrellas según la calidad de la atención recibida por el técnico.
                    </p>
                  </div>
                </div>
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  role="radiogroup"
                  aria-label="Calificación del servicio recibido de 1 a 5 estrellas"
                  aria-required={!CALIFICACION_SERVICIO_OPCIONAL}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {CALIFICACION_VALORES.map((i) => {
                      const activo = (ratingHover || ratingSeleccionado || 0) >= i;
                      const isChecked = ratingSeleccionado === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          role="radio"
                          aria-checked={isChecked}
                          aria-label={`Calificación ${i} de 5: ${ETIQUETA_CALIFICACION[i]}`}
                          tabIndex={isChecked || (!ratingSeleccionado && i === 3) ? 0 : -1}
                          onClick={() => setRatingSeleccionado(i)}
                          onMouseEnter={() => setRatingHover(i)}
                          onMouseLeave={() => setRatingHover(0)}
                          onFocus={() => setRatingHover(i)}
                          onBlur={() => setRatingHover(0)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowRight') {
                              e.preventDefault();
                              const sig = Math.min(5, (ratingSeleccionado || 0) + 1) as 1 | 2 | 3 | 4 | 5;
                              setRatingSeleccionado(sig);
                              setRatingHover(sig);
                              return;
                            }
                            if (e.key === 'ArrowLeft') {
                              e.preventDefault();
                              const ant = Math.max(1, (ratingSeleccionado || 1) - 1) as 1 | 2 | 3 | 4 | 5;
                              setRatingSeleccionado(ant);
                              setRatingHover(ant);
                              return;
                            }
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setRatingSeleccionado(i);
                            }
                          }}
                          className={`group p-1.5 rounded-md ring-1 transition-all ${
                            activo
                              ? 'ring-amber-300 bg-amber-50 hover:bg-amber-100'
                              : 'ring-slate-200 bg-white hover:bg-slate-50'
                          } ${isChecked ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              activo ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                            }`}
                            strokeWidth={activo ? 1.8 : 2}
                          />
                          <span className="sr-only">
                            {i} estrella{i > 1 ? 's' : ''} - {ETIQUETA_CALIFICACION[i]}
                          </span>
                        </button>
                      );
                    })}
                    <div className="ml-2 min-h-6 flex items-center">
                      {(ratingSeleccionado || ratingHover) ? (
                        <span className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded-md ring-1 ring-slate-200">
                          {ETIQUETA_CALIFICACION[
                            ((ratingHover || ratingSeleccionado) as 1 | 2 | 3 | 4 | 5)
                          ]} · {ratingHover || ratingSeleccionado}/5
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {CALIFICACION_SERVICIO_OPCIONAL
                            ? 'Puedes omitir esta calificación'
                            : 'Debes seleccionar una calificación'}
                        </span>
                      )}
                    </div>
                  </div>
                  {!CALIFICACION_SERVICIO_OPCIONAL && ratingSeleccionado === null && (
                    <p className="mt-2 text-[11px] text-rose-600 inline-flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Calificación requerida para confirmar conformidad.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Observaciones */}
            <section>
              <label className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  {uiConfig.obsLabel}
                  {uiConfig.obsOpcional && (
                    <span className="text-[11px] font-normal text-slate-500">(opcional)</span>
                  )}
                  {!uiConfig.obsOpcional && (
                    <span className="text-[11px] font-normal text-rose-600">(* obligatorio)</span>
                  )}
                </span>
                <span className={`text-[11px] font-medium ${counterCls}`}>
                  {observaciones.trim().length}/{modo === 'rechazar' ? `${MIN_RECHAZO_LEN}-${MAX_RECHAZO_LEN}` : `max ${MAX_CONFIRMAR_LEN}`}
                </span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={enviando}
                rows={modo === 'rechazar' ? 6 : 4}
                placeholder={uiConfig.obsPlaceholder}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 ${uiConfig.focusRing} outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600`}
                maxLength={maxLen + 50}
              />
              {modo === 'rechazar' && observaciones.trim().length > 0 && observaciones.trim().length < MIN_RECHAZO_LEN && (
                <p className="mt-1.5 text-[11px] text-rose-600 inline-flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Faltan {MIN_RECHAZO_LEN - observaciones.trim().length} caracteres mínimos para poder devolver.
                </p>
              )}
            </section>

            {/* Banner error */}
            {errorForm && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorForm}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 rounded-b-xl bg-slate-50/80">
            <div className="min-w-0 text-[11px] text-slate-500 hidden sm:block">
              {modo === 'confirmar' ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Al confirmar la conformidad la solicitud pasa a CERRADA y no admite reaperturas automáticas.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Al devolver se genera un nuevo ciclo de SLA de 24 horas y el técnico debe re-ejecutar. Las evidencias del cierre técnico se preservan.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => !enviando && onClose()}
                disabled={enviando}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm inline-flex items-center gap-2 disabled:shadow-none ${uiConfig.btnBg}`}
              >
                {modo === 'confirmar' ? (
                  <ThumbsUp className="w-4 h-4" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                {enviando
                  ? modo === 'confirmar' ? 'Confirmando…' : 'Devolviendo…'
                  : observaciones.trim().length < minLen && modo === 'rechazar'
                    ? `Faltan ${minLen - observaciones.trim().length} caracteres`
                    : uiConfig.btnLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-5 right-5 z-[10011]">
          <div
            className={`shadow-xl rounded-lg ring-1 px-3.5 py-2.5 text-xs font-medium inline-flex items-center gap-2 max-w-sm ${toast.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : toast.tipo === 'warn'
                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                : 'bg-rose-50 text-rose-800 ring-rose-200'}`}
            role="status"
          >
            {toast.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.tipo === 'warn' ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="truncate">{toast.texto}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default DetalleConformidadForm;
