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
  const [paramsTiempo, setParamsTiempo] = useState<CatalogoItem[]>([]);
  const [diasPorCategoria, setDiasPorCategoria] = useState<Record<number, number>>({});
  const [guardandoTiempoIds, setGuardandoTiempoIds] = useState<Set<number>>(new Set());

  // Tab Reglas
  const [reglas, setReglas] = useState<CatalogoItem[]>([]);
  const [tecnicosCombo, setTecnicosCombo] = useState<CatalogoItem[]>([]);
  const [cargandoReglas, setCargandoReglas] = useState(true);
  const [editandoRegla, setEditandoRegla] = useState<Record<number, string>>({});
  const [guardandoRegla, setGuardandoRegla] = useState<number | null>(null);

  // Tab Técnicos
  const [tecnicos, setTecnicos] = useState<Array<CatalogoItem & { cargaVigente?: number }>>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);
  const [mostrarInactivos, setMostrarInactivos] = useState(true);

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
  const MAPA_CS_DEFAULT: Record<number, { cod: string; nombre: string }> = {
    47: { cod: 'CS_001', nombre: 'Cerrajería y Carpintería' },
    48: { cod: 'CS_002', nombre: 'Eléctricas y Electrónicas' },
    49: { cod: 'CS_003', nombre: 'Adecuación de Espacios y Apoyo a Eventos' },
    50: { cod: 'CS_004', nombre: 'Plomería y Fontanería' },
    51: { cod: 'CS_005', nombre: 'Mantenimiento Infraestructura Física y Obras Menores' },
    52: { cod: 'CS_006', nombre: 'Mantenimiento Zonas Exteriores y Jardinería' },
    53: { cod: 'CS_007', nombre: 'Traslados de Mobiliario y Bienes' },
    54: { cod: 'CS_008', nombre: 'Revisión y Mantenimiento Preventivo Equipos Críticos' },
  };
  const cargarTiempo = async () => {
    setCargandoParam(true);
    try {
      const filas = await infraestructuraService.listarParametrosTiempoPorCategoria();
      const arrRaw = Array.isArray(filas) ? filas : [];
      const mapaRecibidos = new Map<number, CatalogoItem>();
      arrRaw.forEach((p) => {
        const idCat = Number((p.metadata as any)?.idCategoria ?? 0);
        if (idCat >= 47 && idCat <= 54) mapaRecibidos.set(idCat, p);
      });
      const final: CatalogoItem[] = [];
      const mapaDias: Record<number, number> = {};
      for (let idCat = 47; idCat <= 54; idCat++) {
        if (mapaRecibidos.has(idCat)) {
          const p = mapaRecibidos.get(idCat)!;
          final.push(p);
          const meta = (p.metadata ?? {}) as any;
          const actual = Number(meta.actual ?? 2);
          mapaDias[idCat] = Math.max(1, Math.min(3, Number.isFinite(actual) ? actual : 2));
        } else {
          const info = MAPA_CS_DEFAULT[idCat] || { cod: `CS_${String(idCat).padStart(3, '0')}`, nombre: `Categoría ${idCat}` };
          const temp = {
            idCatalogo: -idCat,
            catalogo: 'PARAMETRO_UMI',
            codigo: `TIEMPO_RESP_DIAS_CAT_${String(idCat).padStart(2, '0')}`,
            nombre: `Tiempo respuesta ${info.nombre} (días 1..3) · Fallback local (ejecutar mig 010_02)`,
            descripcion: 'Fallback local IN-MEMORY: backend no devolvió este parámetro. Al guardar se crea en DB.',
            orden: 100 + (idCat - 46),
            isActivo: true,
            metadata: {
              idCategoria: idCat,
              codCategoriaCS: info.cod,
              nombreCategoriaCS: info.nombre,
              min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES',
              __flag: 'FALLBACK_FE_MIG_010_02_PENDIENTE',
            },
          } as CatalogoItem;
          final.push(temp);
          mapaDias[idCat] = 2;
        }
      }
      setParamsTiempo(final);
      setDiasPorCategoria(mapaDias);
    } catch (err) {
      setToast({ tipo: 'err', texto: 'No se pudo cargar parámetros tiempo respuesta por categoría.' });
    } finally {
      setCargandoParam(false);
    }
  };

  const guardarTiempoPorCategoria = async (idCategoria: number) => {
    if (guardandoTiempoIds.has(idCategoria)) return;
    const dias = Math.max(1, Math.min(3, Math.trunc(diasPorCategoria[idCategoria] ?? 2)));
    const nextSet = new Set(guardandoTiempoIds);
    nextSet.add(idCategoria);
    setGuardandoTiempoIds(nextSet);
    try {
      const result = await infraestructuraService.actualizarParametroTiempoRespuestaPorCategoria(idCategoria, dias);
      const idCat = Math.trunc(Number(idCategoria));
      const metaSaved = ((result as any)?.metadata ?? {}) as any;
      const actualSaved = Number(metaSaved.actual ?? dias);
      setParamsTiempo((prev) => {
        const next = [...prev];
        const idx = next.findIndex((x) => Number(((x as any).metadata ?? {}).idCategoria) === idCat);
        if (idx >= 0) next[idx] = result as CatalogoItem;
        return next;
      });
      setDiasPorCategoria((prev) => ({ ...prev, [idCat]: Math.max(1, Math.min(3, actualSaved)) }));
      const cat = (result as any)?.metadata?.nombreCategoriaCS || `Categoría ${idCategoria}`;
      setToast({ tipo: 'ok', texto: `${cat}: tiempo respuesta actualizado a ${dias} día${dias === 1 ? '' : 's'}.` });
      await cargarTiempo();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error guardando parámetro categoría.' });
    } finally {
      const limpio = new Set(guardandoTiempoIds);
      limpio.delete(idCategoria);
      setGuardandoTiempoIds(limpio);
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
  const parseBooleanoRobusto = (v: any): boolean => {
    if (v === true || v === false) return v;
    if (v === null || v === undefined) return true;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (s === 'false' || s === 'f' || s === 'no' || s === '0' || s === 'n' || s === '') return false;
    return true;
  };
  const cargarTecnicos = async (opts?: { incluirInactivos?: boolean }) => {
    setCargandoTecnicos(true);
    try {
      const rows = await infraestructuraService.getTecnicosConCargaVigente({
        incluirInactivos: opts?.incluirInactivos ?? true,
      });
      const normalizados = (Array.isArray(rows) ? rows : []).map((r) => ({
        ...r,
        isActivo: parseBooleanoRobusto((r as any).isActivo),
        cargaVigente: Number((r as any).cargaVigente ?? 0),
      }));
      setTecnicos(normalizados);
    } catch {
      setToast({ tipo: 'err', texto: 'No se pudo cargar listado de técnicos.' });
    } finally {
      setCargandoTecnicos(false);
    }
  };
  useEffect(() => { if (tab === 'tecnicos') cargarTecnicos({ incluirInactivos: true }); }, [tab]);

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
  const slaPreviewPorDias = (dias: number) => {
    const d = Math.max(1, Math.min(3, Number.isFinite(+dias) ? +dias : 2));
    const fechaFutura = new Date(Date.now() + d * 24 * 3600 * 1000);
    return clasificarSLA(fechaFutura);
  };

  const ToastGlobal = toast ? (
    <div className={`fixed top-4 right-4 z-[95] max-w-sm px-4 py-2.5 rounded-xl text-sm font-black border shadow-lg animate-in slide-in-from-top fade-in ${toast.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-pink-50 border-pink-300 text-pink-700'}`}>
      {toast.tipo === 'ok' ? '✅  ' : '❌  '}
      {toast.texto}
    </div>
  ) : null;

  const tabs: Array<{ k: TabActiva; label: string; icono: any; desc: string }> = [
    { k: 'tiempo', label: 'Tiempo respuesta', icono: Clock, desc: 'Configurar parametros por categoría' },
    { k: 'reglas', label: 'Reglas escalamiento', icono: Wand2, desc: 'Configurar reglas de escalamiento' },
    { k: 'tecnicos', label: 'Técnicos', icono: Users, desc: 'Configurar tecnicos' },
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
              Parámetros UMI
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
                  ? 'bg-gray-100 shadow-sm text-slate-700  ring-1 '
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
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-yellow-400 text-white flex items-center justify-center shadow-md ring-2 ring-indigo-100">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 tracking-tight">
                  Tiempo máximo de atención SLA
                </h3>
                <p className="text-[13px] mt-1 text-slate-600 leading-relaxed">
                  <span className="font-bold text-indigo-700">RF-INF-004 L104 · EFDS-1733-bis (HUECO1):</span> Define días naturales independientes POR CATEGORÍA (47..54 · CS_001..CS_008) para el SLA de atención UMI desde radicación. Rango permitido por categoría: <span className="font-mono font-bold">1, 2 ó 3 días</span> (24, 48 ó 72 h).
                </p>
              </div>
            </div>

            {cargandoParam && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Cargando 8 parámetros por categoría CS_001..CS_008…
              </div>
            )}

            {!cargandoParam && paramsTiempo.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  No se cargaron parámetros de tiempo por categoría. Asegúrate de ejecutar la migración 010_02 (EFDS-1733-bis) en la base de datos.
                </span>
              </div>
            )}

            {!cargandoParam && paramsTiempo.length > 0 && (
              <div className="space-y-3">
                {paramsTiempo
                  .slice()
                  .sort((a, b) => {
                    const ia = Number((a.metadata as any)?.idCategoria ?? 99);
                    const ib = Number((b.metadata as any)?.idCategoria ?? 99);
                    return ia - ib;
                  })
                  .map((p) => {
                    const meta = (p.metadata ?? {}) as any;
                    const idCat = Number(meta.idCategoria ?? 0);
                    const codCS = String(meta.codCategoriaCS ?? `CS_${String(idCat).padStart(3, '0')}`);
                    const nombreCS = String(meta.nombreCategoriaCS ?? `Categoría ${idCat}`);
                    const dias = Number(diasPorCategoria[idCat] ?? meta.actual ?? 2);
                    const esElectrica = idCat === 48;
                    const guardando = guardandoTiempoIds.has(idCat);
                    const preview = slaPreviewPorDias(dias);
                    return (
                      <div
                        key={`cat-${idCat}`}
                        className={`rounded-xl border bg-white p-4 md:p-5 space-y-3 ${
                          esElectrica ? 'border-purple-300 ring-1 ring-purple-100 bg-gradient-to-r from-purple-50/40 to-white' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-black text-xs ${
                              esElectrica
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {idCat}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                                  {codCS}
                                </span>
                                {esElectrica && (
                                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                                    ⚡ REGLA ESPECIALIZACIÓN OBLIGATORIA
                                  </span>
                                )}
                              </div>
                              <div className="font-black text-slate-900 mt-1 text-sm md:text-base">
                                {nombreCS}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                                Default seed: <span className="font-mono">{String(meta.default ?? 2)} día(s)</span> · Rango permitido: <span className="font-mono">{String(meta.min ?? 1)}..{String(meta.max ?? 3)}</span> · Unidad: <span className="font-mono">{String(meta.unidad ?? 'DIAS_NATURALES')}</span>
                              </div>
                            </div>
                          </div>

                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${cssBadgeSLA(preview.clase)}`}>
                            <Clock className="w-3.5 h-3.5" />
                            SLA: {preview.texto}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
                              <span className="font-mono">1 día · 24h</span>
                              <span className="font-mono">2 días · 48h</span>
                              <span className="font-mono">3 días · 72h</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={3}
                              step={1}
                              value={dias}
                              onChange={(e) => {
                                const v = Math.max(1, Math.min(3, Math.trunc(+e.target.value)));
                                setDiasPorCategoria({ ...diasPorCategoria, [idCat]: v });
                              }}
                              className={`w-full ${esElectrica ? 'accent-purple-600' : 'accent-indigo-600'}`}
                              disabled={guardando}
                            />
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                              <span>Valor actual en BD: <span className="font-mono font-bold text-slate-800">{String(meta.actual ?? '—')} día(s)</span></span>
                              <span className="font-mono font-bold">
                                {dias} día{dias === 1 ? '' : 's'} · {dias * 24} h
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end md:flex-col md:items-stretch">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 min-w-[200px]">
                              <div>Fecha límite si radicas hoy:</div>
                              <div className="font-mono font-bold text-slate-900 mt-0.5">
                                {new Date(Date.now() + dias * 24 * 3600 * 1000).toLocaleDateString('es-CO', {
                                  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                                })}{' · '}
                                {new Date(Date.now() + dias * 24 * 3600 * 1000).toLocaleTimeString('es-CO', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => guardarTiempoPorCategoria(idCat)}
                              disabled={guardando}
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-60 ${
                                esElectrica
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white ring-1 ring-purple-500'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-500'
                              }`}
                            >
                              <Save className="w-3.5 h-3.5" />
                              {guardando ? 'Guardando…' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={cargarTiempo}
                disabled={cargandoParam}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${cargandoParam ? 'animate-spin' : ''}`} />
                Recargar 8 categorías
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-sm text-slate-600">
                Catálogo técnico mantenimiento. La columna <span className="font-bold text-slate-800">Carga vigente</span> cuenta solicitudes UMI activas (RECIBIDA / ASIGNADA / EN_PROGRESO / EN_ANÁLISIS).
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Activos: {tecnicos.filter((x) => x.isActivo).length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Inactivos: {tecnicos.filter((x) => !x.isActivo).length}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                />
                Mostrar inactivos
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cargarTecnicos({ incluirInactivos: true })}
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
                  <th className="px-4 py-3 text-left font-semibold w-64">Carga vigente</th>
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
                {!cargandoTecnicos && tecnicos
                  .filter((t) => (mostrarInactivos ? true : !!t.isActivo))
                  .map((t) => {
                  const esp = Array.isArray(t.metadata?.especialidades)
                    ? (t.metadata.especialidades as string[])
                    : [];
                  const carga = Number(t.cargaVigente ?? 0);
                  const nivelCarga = carga === 0 ? 'OK' : carga <= 3 ? 'MEDIA' : 'ALTA';
                  const inactivo = !t.isActivo;
                  return (
                    <tr key={t.idCatalogo} className={`${inactivo ? 'bg-slate-50/80 hover:bg-slate-100 opacity-80' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className={`px-4 py-3 font-mono text-xs ${inactivo ? 'text-slate-400' : 'text-slate-500'}`}>{t.orden}</td>
                      <td className={`px-4 py-3 font-mono font-bold text-xs ${inactivo ? 'text-slate-500 line-through decoration-slate-400 decoration-1' : 'text-slate-900'}`}>{t.codigo}</td>
                      <td className={`px-4 py-3 font-semibold ${inactivo ? 'text-slate-500' : 'text-slate-900'}`}>
                        {t.nombre}
                        {inactivo && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-400 align-middle">
                            INACTIVO
                          </span>
                        )}
                        <div className={`md:hidden mt-0.5 text-[11px] font-normal ${inactivo ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t.metadata?.email as string}
                          {t.metadata?.telefono ? <span className="ml-2">· {t.metadata.telefono as string}</span> : null}
                        </div>
                      </td>
                      <td className={`px-4 py-3 hidden md:table-cell ${inactivo ? 'opacity-70' : ''}`}>
                        <div className={`text-xs ${inactivo ? 'text-slate-500' : 'text-slate-700'}`}>{(t.metadata?.email as string) || '—'}</div>
                        <div className={`text-[11px] ${inactivo ? 'text-slate-400' : 'text-slate-500'}`}>{(t.metadata?.telefono as string) || '—'}</div>
                      </td>
                      <td className={`px-4 py-3 hidden md:table-cell ${inactivo ? 'opacity-60' : ''}`}>
                        {esp.length === 0 ? (
                          <span className={`text-xs italic ${inactivo ? 'text-slate-400' : 'text-slate-400'}`}>Sin especialidades declaradas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {esp.map((e) => (
                              <span key={e} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                inactivo
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 align-top ${inactivo ? 'opacity-75' : ''}`}>
                        <div className="space-y-2 w-48">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <Users className={`w-4 h-4 ${
                                inactivo ? 'text-slate-400'
                                  : nivelCarga === 'OK' ? 'text-emerald-600'
                                  : nivelCarga === 'MEDIA' ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`} />
                              <span className={`text-2xl font-black tracking-tight leading-none ${
                                inactivo ? 'text-slate-500'
                                  : nivelCarga === 'OK' ? 'text-emerald-700'
                                  : nivelCarga === 'MEDIA' ? 'text-amber-800'
                                  : 'text-rose-700'
                              }`}>
                                {carga}
                              </span>
                              <span className={`text-xs font-semibold leading-none ${inactivo ? 'text-slate-400' : 'text-slate-500'}`}>
                                solicitud{carga === 1 ? '' : 'es'}
                                {inactivo ? ' · baja' : ''}
                              </span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              inactivo
                                ? 'bg-slate-200 text-slate-600 border-slate-400'
                                : nivelCarga === 'OK'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : nivelCarga === 'MEDIA'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              {inactivo ? 'SUSPENDIDO' : nivelCarga}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                            {(() => {
                              const LIMITE_BAJA = 1;
                              const LIMITE_MEDIA = 3;
                              const LIMITE_ALTA = 6;
                              const pctTotal = inactivo ? 0 : Math.min(100, Math.round((carga / LIMITE_ALTA) * 100));
                              const colorBar = inactivo
                                ? 'bg-slate-400'
                                : nivelCarga === 'OK'
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                : nivelCarga === 'MEDIA'
                                ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                : 'bg-gradient-to-r from-rose-500 to-rose-700';
                              return (
                                <div
                                  role="progressbar"
                                  aria-valuenow={inactivo ? 0 : carga}
                                  aria-valuemin={0}
                                  aria-valuemax={LIMITE_ALTA}
                                  className={`h-full ${colorBar} transition-all duration-500 ease-out`}
                                  style={{ width: `${pctTotal}%` }}
                                />
                              );
                            })()}
                          </div>
                          <div className={`flex items-center justify-between text-[10px] font-semibold leading-none px-0.5 ${inactivo ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="inline-flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${inactivo ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                              Baja ≤1
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${inactivo ? 'bg-slate-400' : 'bg-amber-500'}`} />
                              Media 2-3
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${inactivo ? 'bg-slate-400' : 'bg-red-500'}`} />
                              Alta ≥4
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleTec(t)}
                          title={t.isActivo ? 'Desactivar técnico (baja lógica, se excluye del motor de asignación)' : 'Reactivar técnico (incluir en motor de asignación nuevamente)'}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                            t.isActivo
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-400'
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
                            className={`p-2 rounded-lg transition-colors ${inactivo ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-indigo-50 text-indigo-700'}`}
                            aria-label="editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmElimTec(t)}
                            className={`p-2 rounded-lg transition-colors ${inactivo ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-red-50 text-red-600'}`}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
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
