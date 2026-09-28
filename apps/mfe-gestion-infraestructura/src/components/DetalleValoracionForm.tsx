import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Plus, Trash2, Save, AlertCircle, Clock, Gauge, Zap,
  UploadCloud, FileText, ClipboardCheck, Package, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import {
  infraestructuraService,
  SolicitudMantenimiento,
  SolicitudValoracion,
  ValoracionInsumoPayload,
  UnidadMedidaInsumo,
  DisponibilidadInsumo,
  NivelRiesgoValoracion,
  SolicitudEvidencia,
} from '../services/infraestructuraService';

const UNIDADES_MEDIDA: { value: UnidadMedidaInsumo; label: string }[] = [
  { value: 'un', label: 'Unidad (un)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro cuadrado (m2)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'cj', label: 'Caja (cj)' },
  { value: 'paq', label: 'Paquete (paq)' },
  { value: 'rol', label: 'Rollo (rol)' },
  { value: 'glb', label: 'Galón (glb)' },
  { value: 'otro', label: 'Otro' },
];

const NIVELES_RIESGO: { value: NivelRiesgoValoracion; label: string; clase: string }[] = [
  { value: 'BAJO', label: 'Bajo', clase: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500' },
  { value: 'MEDIO', label: 'Medio', clase: 'bg-amber-100 text-amber-900 border-amber-300 ring-amber-500' },
  { value: 'ALTO', label: 'Alto', clase: 'bg-rose-100 text-rose-900 border-rose-300 ring-rose-500' },
];

const FILA_INSUMO_VACIA = (): ValoracionInsumoPayload & { _key: string } => ({
  _key: Math.random().toString(36).slice(2, 9),
  nombre: '',
  cantidad: 1,
  unidadMedida: 'un',
  costoUnitarioCop: 0,
  disponibilidad: 'DISPONIBLE_EN_BODEGA',
  tiempoAdquisicionDias: undefined,
});

export interface DetalleValoracionFormProps {
  open: boolean;
  onClose: () => void;
  idSolicitud: string;
  idValoracion?: string | null;
  idCategoria?: number | null;
  onSaved?: (r: { solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }) => void;
}

export const DetalleValoracionForm: React.FC<DetalleValoracionFormProps> = ({
  open,
  onClose,
  idSolicitud,
  idValoracion = null,
  idCategoria = null,
  onSaved,
}) => {
  const [diagnostico, setDiagnostico] = useState('');
  const [alcance, setAlcance] = useState('');
  const [tiempoHoras, setTiempoHoras] = useState<number>(1);
  const [nivelRiesgo, setNivelRiesgo] = useState<NivelRiesgoValoracion>('BAJO');
  const [requiereApagado, setRequiereApagado] = useState<boolean | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [insumos, setInsumos] = useState<Array<ValoracionInsumoPayload & { _key: string }>>([]);
  const [evidencias, setEvidencias] = useState<SolicitudEvidencia[]>([]);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string>('');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'warn' | 'err'; texto: string } | null>(null);

  const esCategoriaElectrica = idCategoria === 48;

  useEffect(() => {
    if (!open) return;
    setDiagnostico('');
    setAlcance('');
    setTiempoHoras(1);
    setNivelRiesgo('BAJO');
    setRequiereApagado(esCategoriaElectrica ? null : false);
    setObservaciones('');
    setInsumos([FILA_INSUMO_VACIA()]);
    setEvidencias([]);
    setErrorForm('');
    setToast(null);
    if (idValoracion) {
      infraestructuraService
        .listarValoracionesPorSolicitud(idSolicitud)
        .then((lista) => {
          const v = lista.find((x) => x.idValoracion === idValoracion);
          if (v) {
            setDiagnostico(v.diagnostico || '');
            setAlcance(v.alcanceIdentificado || '');
            setTiempoHoras(v.tiempoEstimadoHoras || 0.5);
            setNivelRiesgo(v.nivelRiesgo || 'BAJO');
            setRequiereApagado(v.requiereApagadoElectrico ?? (esCategoriaElectrica ? null : false));
            setObservaciones(v.observaciones || '');
            setEvidencias(Array.isArray(v.evidencias) ? v.evidencias : []);
            if (Array.isArray(v.insumos) && v.insumos.length > 0) {
              setInsumos(
                v.insumos.map((ins) => ({
                  _key: Math.random().toString(36).slice(2, 9),
                  codigoInsumo: ins.codigoInsumo,
                  nombre: ins.nombre,
                  cantidad: ins.cantidad,
                  unidadMedida: ins.unidadMedida,
                  costoUnitarioCop: ins.costoUnitarioCop ?? 0,
                  disponibilidad: ins.disponibilidad,
                  tiempoAdquisicionDias: ins.tiempoAdquisicionDias,
                })),
              );
            }
          }
        })
        .catch(() => {});
    }
  }, [open, idSolicitud, idValoracion, esCategoriaElectrica]);

  const agregarFila = () => {
    setInsumos((prev) => [...prev, FILA_INSUMO_VACIA()]);
  };

  const eliminarFila = (k: string) => {
    setInsumos((prev) => (prev.length <= 1 ? [FILA_INSUMO_VACIA()] : prev.filter((x) => x._key !== k)));
  };

  const actualizarFila = <K extends keyof ValoracionInsumoPayload>(
    k: string,
    campo: K,
    valor: ValoracionInsumoPayload[K],
  ) => {
    setInsumos((prev) => prev.map((f) => (f._key === k ? { ...f, [campo]: valor } : f)));
  };

  const totalEstimadoCop = useMemo(() => {
    return insumos.reduce((acc, f) => {
      const c = Number(f.cantidad || 0);
      const u = Number(f.costoUnitarioCop || 0);
      return isFinite(c) && isFinite(u) ? acc + c * u : acc;
    }, 0);
  }, [insumos]);

  const algunInsumoNoDisponible = useMemo(
    () => insumos.some((x) => x.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR'),
    [insumos],
  );

  const maxDiasAdquisicion = useMemo(() => {
    let mx = 0;
    for (const f of insumos) {
      if (f.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR') {
        const d = Number(f.tiempoAdquisicionDias || 0);
        if (isFinite(d) && d > mx) mx = d;
      }
    }
    return mx;
  }, [insumos]);

  const handleUploadEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (evidencias.length >= 5) {
      setToast({ tipo: 'warn', texto: 'Máximo 5 evidencias por valoración.' });
      return;
    }
    setSubiendoEvidencia(true);
    try {
      const subidas: SolicitudEvidencia[] = [];
      for (let i = 0; i < files.length && evidencias.length + subidas.length < 5; i++) {
        const ev = await infraestructuraService.uploadEvidencia(files[i], {
          idSolicitud,
          orden: evidencias.length + subidas.length + 1,
        });
        subidas.push(ev);
      }
      setEvidencias((prev) => [...prev, ...subidas]);
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error subiendo evidencia.' });
    } finally {
      setSubiendoEvidencia(false);
      if (e.target) e.target.value = '';
    }
  };

  const quitarEvidencia = (id: string) => {
    setEvidencias((prev) => prev.filter((e) => e.idEvidencia !== id));
  };

  const validar = (): string | null => {
    if (diagnostico.trim().length < 10) return 'Diagnóstico requiere al menos 10 caracteres.';
    if (alcance.trim().length < 10) return 'Alcance identificado requiere al menos 10 caracteres.';
    if (!isFinite(Number(tiempoHoras)) || Number(tiempoHoras) < 0.25) return 'Tiempo estimado debe ser >= 0.25 h.';
    if (esCategoriaElectrica && requiereApagado == null) {
      return 'Categoría CS_002 (Eléctricas): debe indicar si requiere apagado/aislamiento eléctrico.';
    }
    for (let i = 0; i < insumos.length; i++) {
      const f = insumos[i];
      if (!f.nombre || f.nombre.trim().length < 2) return `Fila ${i + 1}: nombre del material requiere al menos 2 caracteres.`;
      if (!isFinite(Number(f.cantidad)) || Number(f.cantidad) <= 0) return `Fila ${i + 1}: cantidad debe ser mayor que 0.`;
      if (f.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR') {
        const d = Number(f.tiempoAdquisicionDias);
        if (!isFinite(d) || d <= 0) return `Fila ${i + 1}: si requiere solicitar el material, debe indicar el tiempo de adquisición (días > 0).`;
      }
    }
    return null;
  };

  const handleGuardar = async () => {
    setErrorForm('');
    const err = validar();
    if (err) {
      setErrorForm(err);
      setToast({ tipo: 'err', texto: err });
      return;
    }
    if (!idValoracion) {
      setToast({ tipo: 'warn', texto: 'No hay valoración abierta. Cancele y use el botón Iniciar Valoración.' });
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        diagnostico: diagnostico.trim(),
        alcanceIdentificado: alcance.trim(),
        tiempoEstimadoHoras: Number(tiempoHoras),
        nivelRiesgo,
        requiereApagadoElectrico: esCategoriaElectrica ? !!requiereApagado : requiereApagado,
        observaciones: observaciones.trim() || undefined,
        evidencias: evidencias.map((e) => ({
          idEvidencia: e.idEvidencia,
          urlPresigned: e.urlPresigned,
          nombreOriginal: e.nombreOriginal,
          tamanoBytes: e.tamanoBytes,
        })),
        insumos: insumos.map<ValoracionInsumoPayload>((f) => ({
          codigoInsumo: f.codigoInsumo,
          nombre: f.nombre.trim(),
          cantidad: Number(f.cantidad),
          unidadMedida: f.unidadMedida,
          costoUnitarioCop: f.costoUnitarioCop == null ? 0 : Number(f.costoUnitarioCop),
          disponibilidad: f.disponibilidad,
          tiempoAdquisicionDias: f.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR'
            ? Number(f.tiempoAdquisicionDias)
            : undefined,
        })),
      };
      const r = await infraestructuraService.guardarValoracionCompleta(idValoracion, payload);
      setToast({
        tipo: 'ok',
        texto: r.solicitud.estado === 'EN_ESPERA_DE_INSUMOS'
          ? `Valoración guardada. Solicitud en espera de insumos (SLA extendido ${r.solicitud.diasExtendidosPorInsumos || 0} días).`
          : 'Valoración guardada. Solicitud pasó a En ejecución.',
      });
      onSaved?.(r);
      setTimeout(() => onClose(), 900);
    } catch (err: any) {
      const m = err?.message || 'Error al guardar la valoración.';
      setErrorForm(m);
      setToast({ tipo: 'err', texto: m });
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          position: 'fixed',
          top: 128,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(1100px, 92vw)',
          maxHeight: 'calc(100vh - 152px)',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 16px 60px rgba(15,23,42,0.22)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 leading-tight">
                Valoración Técnica en Campo · {idSolicitud.slice(0, 8)}..
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de diagnóstico, alcance, tiempos e insumos requeridos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {algunInsumoNoDisponible && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
                <Package className="w-3 h-3" />
                Espera materiales · +{maxDiasAdquisicion || 0} d
              </span>
            )}
            {!algunInsumoNoDisponible && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                Pasa a En ejecución
              </span>
            )}
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              onClick={onClose}
              aria-label="Cerrar"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {toast && (
            <div
              className={[
                'rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 border',
                toast.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                toast.tipo === 'warn' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                'bg-rose-50 text-rose-800 border-rose-200',
              ].join(' ')}
            >
              {toast.tipo === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
               toast.tipo === 'warn' ? <AlertTriangle className="w-3.5 h-3.5" /> :
               <AlertCircle className="w-3.5 h-3.5" />}
              {toast.texto}
            </div>
          )}

          {/* Sección 1: Diagnóstico / Alcance / Tiempo / Riesgo */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Diagnóstico técnico <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={3}
                placeholder="Hallazgos de la inspección, causa probable del daño, evidencia visual..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {diagnostico.length}/10 caracteres mínimos
              </p>
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alcance identificado <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                rows={3}
                placeholder="Trabajos concretos a realizar, repuestos, actividades, orden de ejecución..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {alcance.length}/10 caracteres mínimos
              </p>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-slate-500" />
                Tiempo estimado (horas) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="240"
                value={tiempoHoras}
                onChange={(e) => setTiempoHoras(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">Mínimo 0.25 h (15 min)</p>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <Gauge className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-slate-500" />
                Nivel de riesgo
              </label>
              <div className="flex gap-2">
                {NIVELES_RIESGO.map((n) => {
                  const sel = nivelRiesgo === n.value;
                  return (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setNivelRiesgo(n.value)}
                      className={[
                        'flex-1 rounded-md px-3 py-2 text-xs font-bold border transition',
                        sel
                          ? `${n.clase} ring-2 ring-offset-1`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <Zap className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-slate-500" />
                Apagado / aislamiento
                {esCategoriaElectrica && <span className="text-rose-600 ml-1">*</span>}
              </label>
              {esCategoriaElectrica ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRequiereApagado(true)}
                    className={[
                      'flex-1 rounded-md px-2 py-2 text-xs font-bold border transition',
                      requiereApagado === true
                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-500 ring-offset-1'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequiereApagado(false)}
                    className={[
                      'flex-1 rounded-md px-2 py-2 text-xs font-bold border transition',
                      requiereApagado === false
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500 ring-offset-1'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    No
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={!!requiereApagado}
                    onChange={(e) => setRequiereApagado(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  Requiere manipulación eléctrica
                </label>
              )}
            </div>
          </section>

          {/* Sección 2: Tabla dinámica insumos */}
          <section className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-600" />
                <h4 className="text-sm font-bold text-slate-800">Materiales y repuestos requeridos</h4>
                <span className="text-[11px] text-slate-500">
                  ({insumos.length} fila{insumos.length !== 1 ? 's' : ''} · total estimado{' '}
                  <span className="font-semibold text-slate-700">
                    ${totalEstimadoCop.toLocaleString('es-CO')} COP
                  </span>
                  )
                </span>
              </div>
              <button
                type="button"
                onClick={agregarFila}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar fila
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold w-10">#</th>
                    <th className="px-3 py-2 text-left font-bold min-w-[180px]">Material / Repuesto</th>
                    <th className="px-3 py-2 text-left font-bold w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left font-bold w-36">Unidad</th>
                    <th className="px-3 py-2 text-right font-bold w-32">Costo unitario (COP)</th>
                    <th className="px-3 py-2 text-right font-bold w-32">Subtotal</th>
                    <th className="px-3 py-2 text-left font-bold w-48">Disponibilidad</th>
                    <th className="px-3 py-2 text-right font-bold w-32">
                      Tiempo adquisición (días)
                    </th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((f, idx) => (
                    <tr key={f._key} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={f.nombre}
                          onChange={(e) => actualizarFila(f._key, 'nombre', e.target.value)}
                          placeholder="Ej: Tubería PVC 1/2 pulgada"
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={f.cantidad}
                          onChange={(e) => actualizarFila(f._key, 'cantidad', Number(e.target.value) as any)}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.unidadMedida}
                          onChange={(e) => actualizarFila(f._key, 'unidadMedida', e.target.value as any)}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {UNIDADES_MEDIDA.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={f.costoUnitarioCop ?? 0}
                          onChange={(e) => actualizarFila(f._key, 'costoUnitarioCop', Number(e.target.value) as any)}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">
                        $
                        {((Number(f.cantidad || 0) * Number(f.costoUnitarioCop || 0)) || 0).toLocaleString(
                          'es-CO',
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.disponibilidad}
                          onChange={(e) => actualizarFila(f._key, 'disponibilidad', e.target.value as any)}
                          className={[
                            'w-full rounded border px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-2',
                            f.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR'
                              ? 'bg-amber-50 border-amber-200 text-amber-800 focus:ring-amber-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-400',
                          ].join(' ')}
                        >
                          <option value="DISPONIBLE_EN_BODEGA">Disponible en bodega</option>
                          <option value="NO_DISPONIBLE_A_SOLICITAR">Requiere compra / solicitar</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          disabled={f.disponibilidad !== 'NO_DISPONIBLE_A_SOLICITAR'}
                          value={f.tiempoAdquisicionDias ?? ''}
                          onChange={(e) => actualizarFila(f._key, 'tiempoAdquisicionDias', Number(e.target.value) as any)}
                          placeholder={f.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR' ? 'Ej: 5' : '—'}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => eliminarFila(f._key)}
                          className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sección 3: Observaciones */}
          <section>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-slate-500" />
              Observaciones técnicas (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas adicionales, especificaciones de proveedor, instrucciones especiales..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </section>

          {/* Sección 4: Evidencias */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                <UploadCloud className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-slate-500" />
                Evidencias fotográficas / adjuntos
                <span className="font-normal text-slate-500 ml-1">(máximo 5)</span>
              </label>
              <label
                className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer',
                  subiendoEvidencia || evidencias.length >= 5
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white',
                ].join(' ')}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {subiendoEvidencia ? 'Subiendo...' : 'Adjuntar archivos'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  disabled={subiendoEvidencia || evidencias.length >= 5}
                  onChange={handleUploadEvidencia}
                  className="hidden"
                />
              </label>
            </div>
            {evidencias.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
                No hay evidencias adjuntas. Haga clic en Adjuntar archivos para subir hasta 5 fotos o documentos.
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {evidencias.map((ev) => (
                  <li
                    key={ev.idEvidencia}
                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 bg-white text-xs"
                  >
                    <div className="w-8 h-8 shrink-0 rounded bg-slate-100 text-slate-500 flex items-center justify-center overflow-hidden">
                      {ev.urlPresigned && (ev.mimeType || '').startsWith('image') ? (
                        <img src={ev.urlPresigned} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{ev.nombreOriginal}</p>
                      <p className="text-[10px] text-slate-500 tabular-nums">
                        {(ev.tamanoBytes ? (ev.tamanoBytes / 1024).toFixed(1) : 0) + ' KB'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarEvidencia(ev.idEvidencia)}
                      className="p-1 rounded text-rose-600 hover:bg-rose-50 shrink-0"
                      title="Quitar evidencia"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer sticky */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 gap-3">
          <div className="min-w-0 text-xs">
            {errorForm && (
              <p className="text-rose-600 font-semibold truncate">
                <AlertCircle className="w-3 h-3 inline mr-1 -mt-0.5" />
                {errorForm}
              </p>
            )}
            {!errorForm && (
              <p className="text-slate-500 truncate">
                Total insumos estimado: <span className="font-semibold text-slate-800">${totalEstimadoCop.toLocaleString('es-CO')} COP</span>
                {algunInsumoNoDisponible && (
                  <> · SLA se extiende <span className="font-semibold text-amber-700">{maxDiasAdquisicion || 0} días</span></>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setDiagnostico('');
                setAlcance('');
                setTiempoHoras(1);
                setNivelRiesgo('BAJO');
                setObservaciones('');
                setInsumos([FILA_INSUMO_VACIA()]);
                setEvidencias([]);
                setErrorForm('');
                setToast(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
            >
              Limpiar
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={handleGuardar}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold transition"
            >
              {guardando ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar valoración
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleValoracionForm;
