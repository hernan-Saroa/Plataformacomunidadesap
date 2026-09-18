import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  Save,
  Settings,
  AlertCircle,
  AlertTriangle,
  Clock,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  infraestructuraService,
  CatalogoItem,
  TecnicoMantenimientoPayload,
  clasificarSLA,
} from '../services/infraestructuraService';

type TabActiva = 'tiempo' | 'reglas' | 'tecnicos';

type ModalModoTecnico = 'crear' | 'editar' | null;

interface FormTecnico {
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  especialidades: string;
  orden: string;
  isActivo: boolean;
}

const TEC_VACIO: FormTecnico = {
  codigo: '',
  nombre: '',
  email: '',
  telefono: '',
  especialidades: '',
  orden: '',
  isActivo: true,
};

const cssBadgeSLA = (clase: string): string => {
  if (clase === 'vencido') return 'bg-red-100 text-red-800 border border-red-300';
  if (clase === 'alerta') return 'bg-amber-100 text-amber-900 border border-amber-300';
  if (clase === 'ok') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
};

export const AdminParametrosUMI: React.FC = () => {
  const [tab, setTab] = useState<TabActiva>('tiempo');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  // Tab Tiempo
  const [cargandoParam, setCargandoParam] = useState(true);
  const [paramTiempo, setParamTiempo] = useState<CatalogoItem | null>(null);
  const [diasSlider, setDiasSlider] = useState(2);
  const [guardandoTiempo, setGuardandoTiempo] = useState(false);

  // Tab Reglas
  const [reglas, setReglas] = useState<CatalogoItem[]>([]);
  const [tecnicosCombo, setTecnicosCombo] = useState<CatalogoItem[]>([]);
  const [cargandoReglas, setCargandoReglas] = useState(true);
  const [editandoRegla, setEditandoRegla] = useState<Record<number, string>>({});
  const [guardandoRegla, setGuardandoRegla] = useState<number | null>(null);

  // Tab Técnicos
  const [tecnicos, setTecnicos] = useState<Array<CatalogoItem & { cargaVigente?: number }>>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);

  const [modoTec, setModoTec] = useState<ModalModoTecnico>(null);
  const [idTecEdit, setIdTecEdit] = useState<number | null>(null);
  const [formTec, setFormTec] = useState<FormTecnico>(TEC_VACIO);
  const [erroresTec, setErroresTec] = useState<Record<string, string>>({});
  const [errFormTec, setErrFormTec] = useState<string | null>(null);
  const [guardandoTec, setGuardandoTec] = useState(false);

  const [confirmElimTec, setConfirmElimTec] = useState<CatalogoItem | null>(null);
  const [eliminandoTec, setEliminandoTec] = useState(false);

  const inputBase =
    'w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ';

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------------- Tab Tiempo cargar ----------------
  const cargarTiempo = async () => {
    setCargandoParam(true);
    try {
      const p = await infraestructuraService.getParametroTiempoRespuesta();
      setParamTiempo(p);
      const actual = Number(p?.metadata?.actual ?? 2);
      const dias = Math.max(1, Math.min(3, Number.isFinite(actual) ? actual : 2));
      setDiasSlider(dias);
    } catch (err) {
      setToast({ tipo: 'err', texto: 'No se pudo cargar parámetro tiempo respuesta.' });
    } finally {
      setCargandoParam(false);
    }
  };

  const guardarTiempo = async () => {
    setGuardandoTiempo(true);
    try {
      const d = Math.max(1, Math.min(3, Math.trunc(diasSlider)));
      await infraestructuraService.setParametroTiempoRespuesta(d);
      setToast({ tipo: 'ok', texto: `Tiempo respuesta actualizado a ${d} día${d === 1 ? '' : 's'}.` });
      await cargarTiempo();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error guardando parámetro.' });
    } finally {
      setGuardandoTiempo(false);
    }
  };

  useEffect(() => { if (tab === 'tiempo') cargarTiempo(); }, [tab]);

  // ---------------- Tab Reglas cargar ----------------
  const cargarReglas = async () => {
    setCargandoReglas(true);
    try {
      const [rs, tecs] = await Promise.all([
        infraestructuraService.getReglasEscalamiento(),
        infraestructuraService.getTecnicos(true),
      ]);
      setReglas(Array.isArray(rs) ? rs : []);
      setTecnicosCombo(Array.isArray(tecs) ? tecs : []);
    } catch {
      setToast({ tipo: 'err', texto: 'Error cargando reglas escalamiento.' });
    } finally {
      setCargandoReglas(false);
    }
  };
  useEffect(() => { if (tab === 'reglas') cargarReglas(); }, [tab]);

  const patchRegla = async (r: CatalogoItem, tecnicoCodigo: string | null) => {
    setGuardandoRegla(r.idCatalogo);
    try {
      await infraestructuraService.actualizarReglaEscalamiento(r.idCatalogo, { tecnicoCodigo });
      setToast({ tipo: 'ok', texto: 'Regla actualizada correctamente.' });
      setEditandoRegla({ ...editandoRegla, [r.idCatalogo]: '' });
      await cargarReglas();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error guardando regla.' });
    } finally {
      setGuardandoRegla(null);
    }
  };

  // ---------------- Tab Técnicos cargar ----------------
  const cargarTecnicos = async () => {
    setCargandoTecnicos(true);
    try {
      const rows = await infraestructuraService.getTecnicosConCargaVigente();
      setTecnicos(Array.isArray(rows) ? rows : []);
    } catch {
      setToast({ tipo: 'err', texto: 'No se pudo cargar listado de técnicos.' });
    } finally {
      setCargandoTecnicos(false);
    }
  };
  useEffect(() => { if (tab === 'tecnicos') cargarTecnicos(); }, [tab]);

  const abrirCrearTec = () => {
    setModoTec('crear');
    setIdTecEdit(null);
    setFormTec({ ...TEC_VACIO, orden: String(((tecnicos.at(-1)?.orden) ?? 0) + 1) });
    setErroresTec({});
    setErrFormTec(null);
  };

  const abrirEditarTec = (t: CatalogoItem) => {
    const esp = Array.isArray(t.metadata?.especialidades)
      ? (t.metadata.especialidades as string[]).join(', ')
      : '';
    setModoTec('editar');
    setIdTecEdit(t.idCatalogo);
    setFormTec({
      codigo: t.codigo,
      nombre: t.nombre,
      email: (t.metadata?.email as string) ?? '',
      telefono: (t.metadata?.telefono as string) ?? '',
      especialidades: esp,
      orden: String(t.orden ?? ''),
      isActivo: !!t.isActivo,
    });
    setErroresTec({});
    setErrFormTec(null);
  };

  const cerrarModalTec = () => {
    setModoTec(null);
    setIdTecEdit(null);
    setFormTec(TEC_VACIO);
    setErroresTec({});
    setErrFormTec(null);
  };

  const validarTec = (): boolean => {
    const e: Record<string, string> = {};
    if (!formTec.codigo.trim()) e.codigo = 'Código requerido.';
    else if (formTec.codigo.trim().length < 4) e.codigo = 'Mínimo 4 caracteres.';
    if (!formTec.nombre.trim()) e.nombre = 'Nombre requerido.';
    else if (formTec.nombre.trim().length < 4) e.nombre = 'Mínimo 4 caracteres.';
    if (formTec.orden !== '' && !Number.isInteger(+formTec.orden)) e.orden = 'Número entero.';
    setErroresTec(e);
    return Object.keys(e).length === 0;
  };

  const payloadTec = (): TecnicoMantenimientoPayload => {
    const esp = formTec.especialidades
      .split(',').map((s) => s.trim()).filter(Boolean);
    return {
      codigo: formTec.codigo.trim(),
      nombre: formTec.nombre.trim(),
      email: formTec.email.trim() || undefined,
      telefono: formTec.telefono.trim() || undefined,
      especialidades: esp.length ? esp : undefined,
      orden: formTec.orden !== '' && Number.isInteger(+formTec.orden) ? Number(formTec.orden) : undefined,
      isActivo: formTec.isActivo,
    };
  };

  const guardarTec = async () => {
    if (!validarTec()) return;
    setGuardandoTec(true);
    setErrFormTec(null);
    try {
      if (modoTec === 'crear') {
        await infraestructuraService.crearTecnico(payloadTec());
        setToast({ tipo: 'ok', texto: 'Técnico creado correctamente.' });
      } else if (modoTec === 'editar' && idTecEdit != null) {
        await infraestructuraService.actualizarTecnico(idTecEdit, payloadTec());
        setToast({ tipo: 'ok', texto: 'Técnico actualizado correctamente.' });
      }
      await cargarTecnicos();
      cerrarModalTec();
    } catch (err: any) {
      const m = err?.message || 'Error guardando técnico.';
      setToast({ tipo: 'err', texto: m });
      setErrFormTec(m);
    } finally {
      setGuardandoTec(false);
    }
  };

  const toggleTec = async (t: CatalogoItem) => {
    try {
      await infraestructuraService.toggleTecnico(t.idCatalogo);
      setToast({ tipo: 'ok', texto: t.isActivo ? 'Técnico desactivado.' : 'Técnico activado.' });
      await cargarTecnicos();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error toggle técnico.' });
    }
  };

  const confirmEliminarTec = async () => {
    if (!confirmElimTec || eliminandoTec) return;
    setEliminandoTec(true);
    try {
      await infraestructuraService.eliminarTecnico(confirmElimTec.idCatalogo);
      setToast({ tipo: 'ok', texto: 'Técnico eliminado correctamente.' });
      setConfirmElimTec(null);
      await cargarTecnicos();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error eliminando técnico.' });
    } finally {
      setEliminandoTec(false);
    }
  };

  // ---------------- Derivados ----------------
  const slaPreview = useMemo(() => {
    const fechaFutura = new Date(Date.now() + (diasSlider || 2) * 24 * 3600 * 1000);
    return clasificarSLA(fechaFutura);
  }, [diasSlider]);

  const ToastGlobal = toast ? (
    <div className={`fixed top-4 right-4 z-[95] max-w-sm px-4 py-2.5 rounded-xl text-sm font-black border shadow-lg animate-in slide-in-from-top fade-in ${toast.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-pink-50 border-pink-300 text-pink-700'}`}>
      {toast.tipo === 'ok' ? '✅  ' : '❌  '}
      {toast.texto}
    </div>
  ) : null;

  const tabs: Array<{ k: TabActiva; label: string; icono: any; desc: string }> = [
    { k: 'tiempo', label: 'Tiempo respuesta', icono: Clock, desc: 'Parámetro global 1..3 días (24..72h). Control SLA.' },
    { k: 'reglas', label: 'Reglas escalamiento', icono: Wand2, desc: 'ESPECIALIZACIÓN (eléctricas) vs EQUIDAD (resto 7 categorías).' },
    { k: 'tecnicos', label: 'Técnicos', icono: Users, desc: 'Catálogo UMI, carga vigente, altas/bajas y especialidades.' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-5 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md ring-2 ring-blue-100">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Parámetros UMI · EFDS-1733
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Tiempo SLA, reglas de asignación y personal técnico mantenimiento.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => {
          const Icono = t.icono;
          const activo = tab === t.k;
          return (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              title={t.desc}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activo
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icono className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB TIEMPO */}
      {tab === 'tiempo' && (
        <div className="space-y-5 pt-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900">
                  Tiempo máximo de atención SLA
                </h3>
                <p className="text-[13px] mt-1 text-slate-600 leading-relaxed">
                  RF-INF-004. Define la cantidad de días naturales que tiene UMI para atender una solicitud desde su radicación, antes de que quede marcada como <span className="font-bold text-slate-900">vencida</span>. Rango permitido: 1, 2 o 3 días (24, 48 o 72 horas).
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span className="font-mono">1 día (24h)</span>
                  <span className="font-mono">2 días (48h)</span>
                  <span className="font-mono">3 días (72h)</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={diasSlider}
                  onChange={(e) => setDiasSlider(Math.max(1, Math.min(3, Math.trunc(+e.target.value))))}
                  className="w-full accent-indigo-600"
                  disabled={cargandoParam || guardandoTiempo}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Selecciona el valor (enteros)</span>
                  <span className="font-mono">{diasSlider} día{diasSlider === 1 ? '' : 's'} · {diasSlider * 24} h</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500">Preview SLA</div>
                <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${cssBadgeSLA(slaPreview.clase)}`}>
                  {slaPreview.texto}
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Si radicas hoy, la fecha límite sería <span className="font-bold text-slate-800 font-mono">{new Date(Date.now() + (diasSlider * 24 * 3600 * 1000)).toLocaleString()}</span>.
                </div>
              </div>
            </div>

            {(paramTiempo?.metadata) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  ['Valor actual', `${(paramTiempo.metadata as any).actual ?? '—'} día(s)`],
                  ['Por defecto seed', `${(paramTiempo.metadata as any).default ?? '—'}`],
                  ['Rango permitido', `${(paramTiempo.metadata as any).min ?? 1}..${(paramTiempo.metadata as any).max ?? 3}`],
                  ['Unidad', String((paramTiempo.metadata as any).unidad ?? 'DIAS_NATURALES')],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="text-slate-500 font-semibold">{k}</div>
                    <div className="text-slate-800 font-mono mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cargarTiempo}
                disabled={cargandoParam || guardandoTiempo}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${cargandoParam ? 'animate-spin' : ''}`} />
                Recargar
              </button>
              <button
                type="button"
                onClick={guardarTiempo}
                disabled={cargandoParam || guardandoTiempo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md ring-1 ring-blue-500 transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardandoTiempo ? 'Guardando…' : 'Guardar valor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB REGLAS */}
      {tab === 'reglas' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Las reglas definen el comportamiento del motor de sugerencia al momento de asignar un técnico a la solicitud.
            </p>
            <button
              type="button"
              onClick={cargarReglas}
              disabled={cargandoReglas}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${cargandoReglas ? 'animate-spin' : ''}`} />
              Recargar
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-16">#</th>
                  <th className="px-4 py-3 text-left font-semibold w-28">Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Regla</th>
                  <th className="px-4 py-3 text-left font-semibold w-28">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold w-64">Técnico especialista ligado</th>
                  <th className="px-4 py-3 text-left font-semibold w-24">Activa</th>
                  <th className="px-4 py-3 text-right font-semibold w-32">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {cargandoReglas && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                      Cargando reglas…
                    </td>
                  </tr>
                )}
                {!cargandoReglas && reglas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No hay reglas. Aplica migración 010 y seed inicial.
                    </td>
                  </tr>
                )}
                {!cargandoReglas &&
                  reglas.map((r) => {
                    const codTecActual = String((r.metadata as any)?.tecnicoCodigo ?? '');
                    const nomTecActual = String((r.metadata as any)?.tecnicoNombreDisplay ?? '');
                    const reglaTipo = String((r.metadata as any)?.regla || '');
                    const editando = editandoRegla[r.idCatalogo] != null;
                    const valorSel = editando ? editandoRegla[r.idCatalogo] : codTecActual;
                    const idsCats = Array.isArray((r.metadata as any)?.idsCategorias)
                      ? ((r.metadata as any).idsCategorias as number[])
                      : [];
                    const idCat = Number((r.metadata as any)?.idCategoria || 0);
                    const categoriasLabel =
                      idCat > 0
                        ? `idCategoria = ${idCat}`
                        : idsCats.length
                        ? `idsCategorias = [${idsCats.join(', ')}]`
                        : '—';
                    return (
                      <tr key={r.idCatalogo} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.orden}</td>
                        <td className="px-4 py-3 font-mono text-slate-900 font-semibold text-xs">{r.codigo}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">
                          <div>{r.nombre}</div>
                          <div className="text-[11px] mt-0.5 text-slate-500 leading-relaxed">
                            {r.descripcion}
                          </div>
                          <div className="text-[11px] mt-1 text-slate-500 font-mono">
                            {categoriasLabel}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {reglaTipo === 'ESPECIALIZACION' ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              ESPECIALIZACIÓN
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              EQUIDAD CARGA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {reglaTipo !== 'ESPECIALIZACION' ? (
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Automática · no aplica selector
                            </span>
                          ) : (
                            <div className="space-y-2 max-w-sm">
                              <select
                                className={inputBase + 'border-slate-200'}
                                value={valorSel}
                                disabled={guardandoRegla === r.idCatalogo}
                                onChange={(e) => setEditandoRegla({ ...editandoRegla, [r.idCatalogo]: e.target.value })}
                              >
                                <option value="">— Sin técnico especialista asignado —</option>
                                {tecnicosCombo.map((t) => (
                                  <option key={t.idCatalogo} value={t.codigo}>
                                    {t.codigo} · {t.nombre}
                                    {Array.isArray(t.metadata?.especialidades) && t.metadata.especialidades.length > 0
                                      ? ` (${(t.metadata.especialidades as string[]).join('/')})`
                                      : ''}
                                  </option>
                                ))}
                              </select>
                              {!editando && codTecActual && (
                                <div className="text-[11px] text-slate-500">
                                  Actual: <span className="font-bold text-slate-800 font-mono">{codTecActual}</span> · {nomTecActual}
                                </div>
                              )}
                              {editando && !valorSel && (
                                <div className="text-[11px] text-amber-700 font-bold">
                                  ⚠  Guardar con vacío = desligar técnico de esta regla
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              r.isActivo
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {r.isActivo ? 'ACTIVA' : 'INACTIVA'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {reglaTipo === 'ESPECIALIZACION' && (
                            <button
                              type="button"
                              disabled={guardandoRegla === r.idCatalogo}
                              onClick={() => {
                                const fin = valorSel === '' ? null : valorSel;
                                patchRegla(r, fin);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-60"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {guardandoRegla === r.idCatalogo ? 'Guardando…' : 'Guardar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB TÉCNICOS */}
      {tab === 'tecnicos' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Catálogo técnico mantenimiento. La columna <span className="font-bold text-slate-800">Carga vigente</span> cuenta solicitudes UMI activas (RECIBIDA / ASIGNADA / EN_PROGRESO / EN_ANÁLISIS).
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cargarTecnicos}
                disabled={cargandoTecnicos}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${cargandoTecnicos ? 'animate-spin' : ''}`} />
                Recargar
              </button>
              <button
                type="button"
                onClick={abrirCrearTec}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md ring-1 ring-blue-500"
              >
                <Plus className="w-4 h-4" />
                Nuevo técnico
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-16">#</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold w-28 hidden md:table-cell">Contacto</th>
                  <th className="px-4 py-3 text-left font-semibold w-56 hidden md:table-cell">Especialidades</th>
                  <th className="px-4 py-3 text-left font-semibold w-28">Carga vigente</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">Activo</th>
                  <th className="px-4 py-3 text-right font-semibold w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {cargandoTecnicos && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                      Cargando técnicos…
                    </td>
                  </tr>
                )}
                {!cargandoTecnicos && tecnicos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No hay técnicos dados de alta. Crea el primero.
                    </td>
                  </tr>
                )}
                {!cargandoTecnicos && tecnicos.map((t) => {
                  const esp = Array.isArray(t.metadata?.especialidades)
                    ? (t.metadata.especialidades as string[])
                    : [];
                  const carga = Number(t.cargaVigente ?? 0);
                  const nivelCarga = carga === 0 ? 'OK' : carga <= 3 ? 'MEDIA' : 'ALTA';
                  return (
                    <tr key={t.idCatalogo} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.orden}</td>
                      <td className="px-4 py-3 font-mono text-slate-900 font-bold text-xs">{t.codigo}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold">
                        {t.nombre}
                        <div className="md:hidden mt-0.5 text-[11px] text-slate-500 font-normal">
                          {t.metadata?.email as string}
                          {t.metadata?.telefono ? <span className="ml-2">· {t.metadata.telefono as string}</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-slate-700">{(t.metadata?.email as string) || '—'}</div>
                        <div className="text-[11px] text-slate-500">{(t.metadata?.telefono as string) || '—'}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {esp.length === 0 ? (
                          <span className="text-slate-400 text-xs italic">Sin especialidades declaradas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {esp.map((e) => (
                              <span key={e} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          nivelCarga === 'OK'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : nivelCarga === 'MEDIA'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                          {carga} solicitud{carga === 1 ? '' : 'es'} · {nivelCarga}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleTec(t)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                            t.isActivo
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {t.isActivo ? (<><ToggleRight className="w-4 h-4" /> Sí</>) : (<><ToggleLeft className="w-4 h-4" /> No</>)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEditarTec(t)}
                            className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-700 transition-colors"
                            aria-label="editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmElimTec(t)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            aria-label="eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {modoTec && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-black text-slate-900 text-lg">
                {modoTec === 'crear' ? 'Nuevo técnico de mantenimiento' : 'Editar técnico'}
              </h3>
              <button
                type="button"
                onClick={cerrarModalTec}
                disabled={guardandoTec}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errFormTec && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-pink-50 border border-pink-300 text-pink-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errFormTec}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Código <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTec.codigo}
                    onChange={(e) => setFormTec({ ...formTec, codigo: e.target.value })}
                    placeholder="Ej: TEC-ELC-003"
                    className={inputBase + (erroresTec.codigo ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                  />
                  {erroresTec.codigo && <p className="mt-1 text-[11px] text-red-600 font-semibold">{erroresTec.codigo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Orden</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formTec.orden}
                    onChange={(e) => setFormTec({ ...formTec, orden: e.target.value })}
                    placeholder="Entero"
                    className={inputBase + (erroresTec.orden ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                  />
                  {erroresTec.orden && <p className="mt-1 text-[11px] text-red-600 font-semibold">{erroresTec.orden}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formTec.nombre}
                  onChange={(e) => setFormTec({ ...formTec, nombre: e.target.value })}
                  placeholder="Ej: Carlos Andrés Peréz Perdomo"
                  className={inputBase + (erroresTec.nombre ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                />
                {erroresTec.nombre && <p className="mt-1 text-[11px] text-red-600 font-semibold">{erroresTec.nombre}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formTec.email}
                    onChange={(e) => setFormTec({ ...formTec, email: e.target.value })}
                    placeholder="correo@esap.edu.co"
                    className={inputBase + 'border-slate-200'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={formTec.telefono}
                    onChange={(e) => setFormTec({ ...formTec, telefono: e.target.value })}
                    placeholder="+57 3XX XXX XXXX"
                    className={inputBase + 'border-slate-200'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Especialidades (separar por coma)
                </label>
                <input
                  type="text"
                  value={formTec.especialidades}
                  onChange={(e) => setFormTec({ ...formTec, especialidades: e.target.value })}
                  placeholder="Ej: ELECTRICA, LUMINARIAS, TOMACORRIENTES"
                  className={inputBase + 'border-slate-200'}
                />
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={formTec.isActivo}
                  onChange={(e) => setFormTec({ ...formTec, isActivo: e.target.checked })}
                  className="w-4 h-4 peer rounded-md"
                />
                <span className="text-sm font-semibold text-slate-700">Técnico activo en el turno UMI</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 border-t">
              <button
                type="button"
                onClick={cerrarModalTec}
                disabled={guardandoTec}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarTec}
                disabled={guardandoTec}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardandoTec ? 'Guardando…' : modoTec === 'crear' ? 'Crear técnico' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmElimTec && (
        <div className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-base tracking-tight">Eliminar técnico UMI</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                    ¿Estás seguro que deseas eliminar al técnico{' '}
                    <span className="font-bold text-slate-900">&ldquo;{confirmElimTec.nombre}&rdquo;</span>{' '}
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] align-baseline">
                      ({confirmElimTec.codigo})
                    </span>
                    ?
                  </p>
                  <p className="mt-2 text-[12px] font-bold text-pink-700 bg-pink-50 border border-pink-300 rounded-lg px-2.5 py-1.5 shadow-sm">
                    Esta acción no se puede deshacer. Usa mejor el toggle inactivo si en el futuro retorna.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 border-t">
              <button
                type="button"
                onClick={() => setConfirmElimTec(null)}
                disabled={eliminandoTec}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold disabled:opacity-50 shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmEliminarTec}
                disabled={eliminandoTec}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-red-600 bg-red-600 text-white text-sm font-bold shadow-md"
                style={{ opacity: eliminandoTec ? 0.7 : 1 }}
              >
                <Trash2 className="w-4 h-4" />
                {eliminandoTec ? 'Eliminando…' : 'Sí, eliminar técnico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastGlobal}
    </div>
  );
};
