import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, UploadCloud, FileText, AlertCircle, CheckCircle2, Image as ImageIcon, Trash2, Clock, Banknote, Eye, CheckSquare, Square,
} from 'lucide-react';
import {
  infraestructuraService,
  SolicitudMantenimiento,
  EvidenciaCierreFoto,
  CierreTecnicoResponse,
} from '../services/infraestructuraService';

export interface DetalleCierreEjecucionFormProps {
  open: boolean;
  onClose: () => void;
  idSolicitud: string;
  solicitud?: SolicitudMantenimiento | null;
  onSaved?: (r: SolicitudMantenimiento) => void;
  forzarModoEdicionReapertura?: boolean;
}

const MAX_EVIDENCIAS = 5;
const MIN_EVIDENCIAS = 1;
const MIN_TRABAJO_LEN = 15;

export const DetalleCierreEjecucionForm: React.FC<DetalleCierreEjecucionFormProps> = ({
  open,
  onClose,
  idSolicitud,
  solicitud,
  onSaved,
  forzarModoEdicionReapertura,
}) => {
  const [trabajoRealizado, setTrabajoRealizado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [costoFinalCop, setCostoFinalCop] = useState<number>(0);
  const [requiereSeguimiento, setRequiereSeguimiento] = useState(false);
  const [evidencias, setEvidencias] = useState<EvidenciaCierreFoto[]>([]);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [ejecutandoCierre, setEjecutandoCierre] = useState(false);
  const [errorForm, setErrorForm] = useState<string>('');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'warn' | 'err'; texto: string } | null>(null);
  const [resumenCierre, setResumenCierre] = useState<CierreTecnicoResponse | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const dragActiveRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yaCerrado = useMemo(() => {
    if (forzarModoEdicionReapertura) return false;
    if (resumenCierre?.cerrado) return true;
    if (solicitud?.fechaCierreTecnico) return true;
    const estados = ['COMPLETADA', 'CERRADA', 'CERRADA_SIN_ATENCION', 'RECHAZADA'];
    if (solicitud?.estado && estados.includes(solicitud.estado)) return true;
    return false;
  }, [resumenCierre, solicitud, forzarModoEdicionReapertura]);

  const modoLectura = yaCerrado;

  useEffect(() => {
    if (!open) return;
    setTrabajoRealizado('');
    setObservaciones('');
    setCostoFinalCop(0);
    setRequiereSeguimiento(false);
    setEvidencias([]);
    setErrorForm('');
    setToast(null);
    setResumenCierre(null);
    if (!forzarModoEdicionReapertura && (solicitud?.trabajoRealizado || solicitud?.fechaCierreTecnico)) {
      setTrabajoRealizado(solicitud.trabajoRealizado || '');
      setObservaciones(solicitud.observacionesCierre || '');
      setCostoFinalCop(Number(solicitud.costoFinalEfectivoCop || 0));
      setRequiereSeguimiento(!!solicitud.requiereSeguimiento);
      setEvidencias(Array.isArray(solicitud.evidenciasCierre) ? (solicitud.evidenciasCierre as EvidenciaCierreFoto[]) : []);
    }
    setLeyendo(true);
    infraestructuraService
      .obtenerCierreTecnico(idSolicitud)
      .then((r) => {
        setResumenCierre(r);
        if (!forzarModoEdicionReapertura && r?.cerrado) {
          setTrabajoRealizado(r.trabajoRealizado || '');
          setObservaciones(r.observacionesCierre || '');
          setCostoFinalCop(Number(r.costoFinalEfectivoCop || 0));
          setRequiereSeguimiento(!!r.requiereSeguimiento);
          setEvidencias(Array.isArray(r.evidenciasCierre) ? r.evidenciasCierre : []);
        }
      })
      .catch(() => {})
      .finally(() => setLeyendo(false));
  }, [open, idSolicitud, solicitud, forzarModoEdicionReapertura]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, MAX_EVIDENCIAS - evidencias.length);
    if (arr.length === 0) {
      if (evidencias.length >= MAX_EVIDENCIAS) {
        setToast({ tipo: 'warn', texto: `Máximo ${MAX_EVIDENCIAS} evidencias de cierre por solicitud.` });
      }
      return;
    }
    setSubiendoEvidencia(true);
    const subidas: EvidenciaCierreFoto[] = [];
    try {
      for (let i = 0; i < arr.length; i++) {
        const ev = await infraestructuraService.uploadEvidencia(arr[i], { idSolicitud });
        subidas.push({
          name: ev.nombreOriginal || `foto-${Date.now()}-${i}.jpg`,
          size: Number(ev.tamanoBytes || 0),
          type: ev.tipoContenido || 'image/jpeg',
          url: (ev.urlPresigned || ev.url || ev.nombreOriginal || '') as string,
          bucket: (ev as any).bucket,
          key: (ev as any).objectKey || (ev as any).key,
        });
      }
      setEvidencias((prev) => [...prev, ...subidas]);
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error subiendo evidencias al storage.' });
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragActiveRef.current = false;
    if (modoLectura) return;
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  };

  const quitarEvidencia = (idx: number) => {
    if (modoLectura) return;
    setEvidencias((prev) => prev.filter((_, i) => i !== idx));
  };

  const validar = (): string | null => {
    if (evidencias.length < MIN_EVIDENCIAS) return `Evidencia fotográfica obligatoria (mínimo ${MIN_EVIDENCIAS} archivo).`;
    if (trabajoRealizado.trim().length < MIN_TRABAJO_LEN) {
      return `Trabajo realizado requiere al menos ${MIN_TRABAJO_LEN} caracteres.`;
    }
    if (!isFinite(Number(costoFinalCop)) || Number(costoFinalCop) < 0) {
      return 'Costo final efectivo debe ser 0 o positivo.';
    }
    return null;
  };

  const handleConfirmarCierre = async () => {
    if (modoLectura) return;
    setErrorForm('');
    const err = validar();
    if (err) {
      setErrorForm(err);
      setToast({ tipo: 'err', texto: err });
      return;
    }
    setEjecutandoCierre(true);
    try {
      const response = await infraestructuraService.cerrarTecnicamente(idSolicitud, {
        evidencias: evidencias.map((e) => ({ ...e })),
        trabajoRealizado: trabajoRealizado.trim(),
        observaciones: observaciones.trim() || undefined,
        costoFinalEfectivoCop: Number(costoFinalCop),
        requiereSeguimiento: !!requiereSeguimiento,
      });
      setToast({ tipo: 'ok', texto: 'Cierre técnico registrado correctamente. Solicitud en estado COMPLETADA.' });
      setTimeout(() => {
        if (onSaved) onSaved(response);
      }, 400);
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'No fue posible registrar el cierre técnico.' });
    } finally {
      setEjecutandoCierre(false);
    }
  };

  const consecutivoDisplay = solicitud?.consecutivo || resumenCierre?.consecutivo || '—';
  const nombreTecnicoDisplay =
    resumenCierre?.responsableCierreDisplay ||
    solicitud?.responsableCierreDisplay ||
    solicitud?.responsableAsignado ||
    'Técnico asignado';

  const categoriaTxt = useMemo(() => {
    if (solicitud?.idCategoria === 48) return 'CS_002 · Eléctricas especializado';
    if (!solicitud?.idCategoria) return '—';
    return `Categoría ${solicitud.idCategoria}`;
  }, [solicitud]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop inline — z-10001 por encima del modal padre DetalleSolicitud (z-9999) */}
      <div
        data-testid="cierre-backdrop"
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[10001]"
        onClick={() => !ejecutandoCierre && !subiendoEvidencia && onClose()}
        aria-hidden="true"
      />
      {/* Centrado wrapper */}
      <div
        data-testid="cierre-wrapper"
        className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto p-4 md:p-8 pt-8 pb-16"
      >
        {/* Panel */}
        <div
          data-testid="cierre-panel"
          className="w-full max-w-3xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                  Cierre técnico de ejecución
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                    {consecutivoDisplay}
                  </span>
                  {modoLectura && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 font-medium">
                      Modo lectura · COMPLETADA
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Registro oficial de la finalización del trabajo. Adjunte evidencia fotográfica y describa el trabajo
                  realizado. Este paso pasa la solicitud al estado COMPLETADA.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !ejecutandoCierre && !subiendoEvidencia && onClose()}
              disabled={ejecutandoCierre || subiendoEvidencia}
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
                  {modoLectura ? 'COMPLETADA / Cierre registrado' : solicitud?.estado || '—'}
                </p>
              </div>
            </section>

            {/* Trabajo realizado */}
            <section>
              <label className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Trabajo realizado
                </span>
                <span className={`text-[11px] font-medium ${trabajoRealizado.trim().length < MIN_TRABAJO_LEN ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {trabajoRealizado.trim().length}/{MIN_TRABAJO_LEN}+
                </span>
              </label>
              <textarea
                value={trabajoRealizado}
                onChange={(e) => !modoLectura && setTrabajoRealizado(e.target.value)}
                disabled={modoLectura}
                rows={4}
                placeholder="Describa el trabajo ejecutado: diagnóstico, reparación, pruebas, entrega, recomendaciones…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600"
              />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Observaciones */}
              <section>
                <label className="flex items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                    Observaciones adicionales
                    <span className="text-[11px] font-normal text-slate-500 ml-1">(opcional)</span>
                  </span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => !modoLectura && setObservaciones(e.target.value)}
                  disabled={modoLectura}
                  rows={3}
                  placeholder="Comentarios para seguimiento, estado de conformidad, información de contacto o notas de BI."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600"
                />
              </section>

              {/* Costo final + checkbox */}
              <section className="space-y-4">
                <div>
                  <label className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-slate-500" />
                      Costo final efectivo (COP)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">$</span>
                    <input
                      type="number"
                      min={0}
                      step="100"
                      value={costoFinalCop}
                      onChange={(e) => !modoLectura && setCostoFinalCop(Number(e.target.value))}
                      disabled={modoLectura}
                      placeholder="0 · Dejar 0 si se usaron materiales de inventario y MO interna"
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Incluye materiales propios y MO si aplica. Reportes BI EFDS-1739 usan este valor vs costoEstimado.
                  </p>
                </div>

                <label className={`flex items-start gap-2 rounded-lg border p-3 select-none ${modoLectura ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-emerald-50/50 border-emerald-200 cursor-pointer hover:bg-emerald-50'}`}>
                  <button
                    type="button"
                    onClick={() => !modoLectura && setRequiereSeguimiento((v) => !v)}
                    disabled={modoLectura}
                    className="mt-0.5 shrink-0 text-emerald-700 disabled:opacity-70"
                    aria-pressed={requiereSeguimiento}
                  >
                    {requiereSeguimiento ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">Requiere seguimiento futuro</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                      Marque si se necesita re-visitar (conformidad HU-1737, seguimiento BI o re-ajuste por garantía).
                    </p>
                  </div>
                </label>
              </section>
            </div>

            {/* Evidencias dropzone */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  Evidencia fotográfica de finalización
                </label>
                <span className={`text-[11px] font-medium ${evidencias.length < MIN_EVIDENCIAS ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {evidencias.length}/{MAX_EVIDENCIAS} · m&iacute;nimo {MIN_EVIDENCIAS}
                </span>
              </div>
              {!modoLectura ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); dragActiveRef.current = true; }}
                  onDragLeave={() => { dragActiveRef.current = false; }}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group rounded-lg border-2 border-dashed p-5 transition-all text-center cursor-pointer ${subiendoEvidencia ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50/60 border-slate-300 hover:bg-emerald-50/60 hover:border-emerald-400'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    multiple
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                    disabled={subiendoEvidencia || evidencias.length >= MAX_EVIDENCIAS}
                  />
                  <UploadCloud className={`mx-auto w-8 h-8 mb-2 ${subiendoEvidencia ? 'text-indigo-600 animate-pulse' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                  <p className="text-xs font-medium text-slate-700">
                    {subiendoEvidencia
                      ? 'Subiendo evidencias al storage…'
                      : evidencias.length >= MAX_EVIDENCIAS
                        ? `Máximo ${MAX_EVIDENCIAS} archivos alcanzado.`
                        : 'Arrastre imágenes/videos aquí o haga clic para seleccionar archivos.'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Hasta {MAX_EVIDENCIAS} archivos. PNG/JPG/PDF/MP4. M&iacute;nimo {MIN_EVIDENCIAS} evidencia obligatoria (ERF).
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-600">
                  Evidencias cargadas en el cierre técnico oficial (solo lectura).
                </div>
              )}

              {/* Preview grid */}
              {evidencias.length > 0 && (
                <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {evidencias.map((ev, idx) => (
                    <li
                      key={idx}
                      className="group relative rounded-lg overflow-hidden ring-1 ring-slate-200 bg-white aspect-square"
                    >
                      {String(ev.type || '').startsWith('image/') && ev.url ? (
                        <img
                          src={ev.url}
                          alt={ev.name || `evidencia-${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-2 text-center">
                          <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                          <p className="text-[10px] font-medium truncate max-w-full">
                            {ev.name || `Archivo ${idx + 1}`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {Math.max(0, Math.round(Number(ev.size || 0) / 1024))} KB
                          </p>
                        </div>
                      )}
                      {/* Caption overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/75 to-transparent px-2 py-1.5">
                        <p className="text-[10px] text-white truncate font-medium">
                          {idx + 1}. {ev.name || `evidencia-${idx + 1}`}
                        </p>
                      </div>
                      {/* Ver / Eliminar */}
                      {!modoLectura && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md bg-white/95 shadow ring-1 ring-slate-200 text-slate-700 hover:text-blue-700"
                              title="Abrir evidencia"
                              aria-label="Ver"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); quitarEvidencia(idx); }}
                            disabled={subiendoEvidencia}
                            className="p-1.5 rounded-md bg-white/95 shadow ring-1 ring-slate-200 text-slate-700 hover:text-rose-700 disabled:opacity-50"
                            title="Quitar evidencia"
                            aria-label="Eliminar evidencia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {modoLectura && ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-white/95 shadow ring-1 ring-slate-200 text-slate-700 hover:text-blue-700"
                          aria-label="Ver"
                          title="Abrir en nueva pestaña"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Banner error */}
            {errorForm && !modoLectura && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorForm}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 rounded-b-xl bg-slate-50/80">
            <div className="min-w-0 text-[11px] text-slate-500 hidden sm:block">
              {modoLectura ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {resumenCierre?.fechaCierreTecnico
                    ? `Cierre ejecutado ${new Date(resumenCierre.fechaCierreTecnico).toLocaleString()}`
                    : 'Cierre técnico registrado. Paso a conformidad EFDS-1737.'}
                </span>
              ) : (
                <span>Al confirmar se pasa la solicitud a COMPLETADA y se envía para conformidad del usuario final.</span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => !ejecutandoCierre && !subiendoEvidencia && onClose()}
                disabled={ejecutandoCierre || subiendoEvidencia}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                {modoLectura ? 'Cerrar vista' : 'Cancelar'}
              </button>
              {!modoLectura && (
                <button
                  type="button"
                  onClick={handleConfirmarCierre}
                  disabled={ejecutandoCierre || subiendoEvidencia || evidencias.length < MIN_EVIDENCIAS}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-900/10 inline-flex items-center gap-2 disabled:bg-emerald-400 disabled:shadow-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {ejecutandoCierre
                    ? 'Registrando cierre…'
                    : evidencias.length < MIN_EVIDENCIAS
                      ? `Cargar ${MIN_EVIDENCIAS - evidencias.length} evidencia(s)`
                      : 'Confirmar cierre técnico'}
                </button>
              )}
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

export default DetalleCierreEjecucionForm;
