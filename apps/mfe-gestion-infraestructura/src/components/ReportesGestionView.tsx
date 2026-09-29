import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FolderDown,
} from 'lucide-react';
import {
  infraestructuraService,
  ReporteGestionDto,
  ReporteGestionPorCategoriaItem,
  FiltrosReporteGestionParams,
  SolicitudMantenimiento,
  Sede,
  CatalogoItem,
} from '../services/infraestructuraService';
import { DetalleSolicitudModal } from './DetalleSolicitudModal';

interface FiltrosUI {
  fechaDesde: string;
  fechaHasta: string;
  idSede: string;
  idCategoria: string;
  areaResponsable: string;
  codigoTecnico: string;
  estado: string;
}

const buildParamsDesdeUI = (u: FiltrosUI): FiltrosReporteGestionParams => {
  const out: FiltrosReporteGestionParams = {};
  if (u.fechaDesde) out.fechaDesde = new Date(u.fechaDesde + 'T00:00:00').toISOString();
  if (u.fechaHasta) out.fechaHasta = new Date(u.fechaHasta + 'T23:59:59').toISOString();
  if (u.idSede) out.idSede = u.idSede;
  if (u.idCategoria) out.idCategoria = Number(u.idCategoria);
  if (u.areaResponsable) out.areaResponsable = u.areaResponsable;
  if (u.codigoTecnico) out.codigoTecnico = u.codigoTecnico;
  if (u.estado) out.estado = u.estado;
  return out;
};

const defaultFiltros = (): FiltrosUI => {
  const hoy = new Date();
  const hace90 = new Date();
  hace90.setDate(hoy.getDate() - 90);
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    fechaDesde: iso(hace90),
    fechaHasta: iso(hoy),
    idSede: '',
    idCategoria: '',
    areaResponsable: '',
    codigoTecnico: '',
    estado: '',
  };
};

const variacion = (delta: number) => {
  const signo = delta > 0 ? '+' : delta < 0 ? '' : '';
  const texto = `${signo}${delta.toFixed(2)}%`;
  const clase = delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-500';
  const flecha = delta > 0 ? '▲' : delta < 0 ? '▼' : '■';
  return { texto, clase, flecha };
};

const porcentajeColor = (pct: number) => {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
};

export const ReportesGestionView: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosUI>(defaultFiltros());
  const [reporte, setReporte] = useState<ReporteGestionDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);
  const [tecnicos, setTecnicos] = useState<CatalogoItem[]>([]);

  const [detalleAbrir, setDetalleAbrir] = useState<boolean>(false);
  const [catSeleccionada, setCatSeleccionada] = useState<ReporteGestionPorCategoriaItem | null>(null);
  const [listaDetalle, setListaDetalle] = useState<SolicitudMantenimiento[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [idSolicitudSeleccionada, setIdSolicitudSeleccionada] = useState<string | null>(null);
  const [abrirDetalleSolicitud, setAbrirDetalleSolicitud] = useState<boolean>(false);
  const [catExpandida, setCatExpandida] = useState<string | number | null>(null);

  const cargarCatalogos = async () => {
    const [s, c, t] = await Promise.allSettled([
      infraestructuraService.getSedesAlcanceUMI(),
      infraestructuraService.getCategoriasServicio({ soloActivos: true }),
      infraestructuraService.getTecnicos(false),
    ]);
    const sedesOk = s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : [];
    const catsOk = c.status === 'fulfilled' && Array.isArray(c.value) ? c.value : [];
    const tecOk = t.status === 'fulfilled' && Array.isArray(t.value) ? t.value : [];
    setSedes(sedesOk);
    setCategorias(catsOk);
    setTecnicos(tecOk);
  };

  const cargarReporte = async () => {
    setCargando(true);
    setError(null);
    try {
      const params = buildParamsDesdeUI(filtros);
      const data = await infraestructuraService.getReporteGestion(params);
      setReporte(data);
    } catch (err: any) {
      setError(err?.message ?? 'Error cargando reporte');
      setReporte(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    cargarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const params = useMemo(() => buildParamsDesdeUI(filtros), [filtros]);

  const descargarExcel = async () => {
    try {
      const blob = await infraestructuraService.descargarExcelReporte(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sufijo = new Date().toISOString().slice(0, 10);
      a.download = `Reporte_Gestion_Infraestructura_UMI_${sufijo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Error descargando Excel');
    }
  };

  const descargarPdf = async () => {
    try {
      const blob = await infraestructuraService.descargarPdfReporte(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sufijo = new Date().toISOString().slice(0, 10);
      a.download = `Reporte_Gestion_Infraestructura_UMI_${sufijo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Error descargando PDF');
    }
  };

  const abrirDetalleCategoria = async (cat: ReporteGestionPorCategoriaItem) => {
    setCatSeleccionada(cat);
    setListaDetalle([]);
    setCargandoDetalle(true);
    setDetalleAbrir(true);
    try {
      const todas = await infraestructuraService.getMantenimientos({ idCategoria: Number(cat.idCategoria) });
      const fd = filtros.fechaDesde ? new Date(filtros.fechaDesde + 'T00:00:00').getTime() : -Infinity;
      const fh = filtros.fechaHasta ? new Date(filtros.fechaHasta + 'T23:59:59').getTime() : Infinity;
      const filtradas = todas.filter((s) => {
        const t = s.fechaRadicacion ? new Date(s.fechaRadicacion).getTime() : 0;
        return t >= fd && t <= fh;
      });
      setListaDetalle(filtradas);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const descargarZipDetalle = async (idSolicitud: string, consecutivo?: string) => {
    try {
      const blob = await infraestructuraService.descargarZipEvidenciasSolicitud(idSolicitud);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Evidencias_${consecutivo ?? idSolicitud.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Error descargando ZIP');
    }
  };

  const totalRadicados = reporte?.totalCasos.totalRadicados ?? null;
  const radicadosDelta = totalRadicados ? variacion(totalRadicados.variacionPorcentual) : null;
  const promHoras = useMemo(() => {
    if (!reporte) return null;
    let suma = 0;
    let casos = 0;
    for (const t of reporte.tiemposAtencionVsMeta) {
      const casosCat = (t.casosCumplenSLA || 0) + (t.casosExcedenSLA || 0);
      if (casosCat > 0 && Number.isFinite(t.promedioRealDias)) {
        suma += t.promedioRealDias * casosCat;
        casos += casosCat;
      }
    }
    return casos > 0 ? (suma / casos) * 24 : 0;
  }, [reporte]);
  const pctSla = useMemo(() => {
    if (!reporte) return { valor: 0, casos: '0/0' };
    let cumplen = 0;
    let total = 0;
    for (const t of reporte.tiemposAtencionVsMeta) {
      cumplen += t.casosCumplenSLA || 0;
      total += (t.casosCumplenSLA || 0) + (t.casosExcedenSLA || 0);
    }
    return { valor: total > 0 ? (cumplen / total) * 100 : 0, casos: `${cumplen}/${total}` };
  }, [reporte]);
  const califPromedio = reporte?.percepcionServicio?.promedioGlobal ?? 0;
  const totalCalif = reporte?.percepcionServicio?.totalCalificaciones ?? 0;

  return (
    <div className="space-y-6 p-4">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reportes e Indicadores de Gestión</h2>
            <p className="text-xs text-slate-500">
              Vista consolidada de operaciones, SLA, percepción y rendimiento de técnicos ·{' '}
              {reporte?.periodo.fechaDesdeISO ? `del ${reporte.periodo.fechaDesdeISO.slice(0, 10)} al ${reporte.periodo.fechaHastaISO?.slice(0, 10)}` : '…'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarReporte}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Calendar className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button
            type="button"
            onClick={descargarExcel}
            disabled={cargando}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={descargarPdf}
            disabled={cargando}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
          >
            <FileText className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Fecha desde</span>
          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Fecha hasta</span>
          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Sede</span>
          <select
            value={filtros.idSede}
            onChange={(e) => setFiltros({ ...filtros, idSede: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          >
            <option value="">Todas</option>
            {sedes.map((s) => (
              <option key={s.idSede} value={s.idSede}>{s.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Categoría servicio</span>
          <select
            value={filtros.idCategoria}
            onChange={(e) => setFiltros({ ...filtros, idCategoria: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.idCatalogo} value={c.idCatalogo}>{c.codigo} · {c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Área responsable</span>
          <select
            value={filtros.areaResponsable}
            onChange={(e) => setFiltros({ ...filtros, areaResponsable: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          >
            <option value="">Por defecto (UMI)</option>
            <option value="TODAS">Todas (incluye TI)</option>
            <option value="UMI">UMI</option>
            <option value="TI">Tecnologías (TI)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Técnico (prefijo)</span>
          <input
            type="text"
            placeholder="TEC-..."
            value={filtros.codigoTecnico}
            onChange={(e) => setFiltros({ ...filtros, codigoTecnico: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Estado</span>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          >
            <option value="">Todos (UMI)</option>
            <option value="RECIBIDA">RECIBIDA</option>
            <option value="ASIGNADA">ASIGNADA</option>
            <option value="EN_PROGRESO">EN_PROGRESO</option>
            <option value="COMPLETADA">COMPLETADA</option>
            <option value="PENDIENTE_CONFORMIDAD">PENDIENTE_CONFORMIDAD</option>
            <option value="CERRADA">CERRADA</option>
          </select>
        </label>
      </div>

      {/* Estado carga/error */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-xs flex-1">
            <p className="font-semibold">No se pudo completar la consulta</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {cargando && !reporte && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando reporte de gestión…
        </div>
      )}

      {reporte && !cargando && (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Total radicados</p>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">Periodo actual</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900">{totalRadicados?.valorActual ?? 0}</p>
                {radicadosDelta && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${radicadosDelta.clase}`}>
                    <span>{radicadosDelta.flecha}</span>
                    {radicadosDelta.texto}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Anterior: {totalRadicados?.valorAnterior ?? 0} · Δ abs: {(totalRadicados?.variacionAbsoluta ?? 0) > 0 ? '+' : ''}{totalRadicados?.variacionAbsoluta ?? 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Tiempo promedio atención</p>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">Horas</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{promHoras != null ? promHoras.toFixed(1) : '-'}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Cálculo ponderado por categoría usando días reales vs meta SLA
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">% Cumplimiento SLA</p>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">{pctSla.casos}</span>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-black text-slate-900">{pctSla.valor.toFixed(1)}%</p>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${porcentajeColor(pctSla.valor)}`} style={{ width: `${Math.min(100, Math.max(0, pctSla.valor))}%` }} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Casos evaluados contra meta días por categoría</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Calificación servicio</p>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">{totalCalif} calificaciones</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{califPromedio.toFixed(2)} <span className="text-sm font-semibold text-slate-400">/ 5</span></p>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-xs ${s <= Math.round(califPromedio) ? 'text-amber-500' : 'text-slate-200'}`}>★</span>
                ))}
              </div>
            </div>
          </div>

          {/* MiniBarChart inline · Radicados / Completados por categoría */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Volumen por categoría (Radicados vs Completados)</h3>
                <p className="text-xs text-slate-500">Barra inline de porcentaje · máximo local por categoría</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500" /> Radicados</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Completados</span>
              </div>
            </div>
            <div className="space-y-2">
              {reporte.porCategoria.map((c) => {
                const maxLocal = Math.max(1, c.radicados || 0);
                const wRad = ((c.radicados || 0) / maxLocal) * 100;
                const wCompl = ((c.completados || 0) / maxLocal) * 100;
                return (
                  <div key={String(c.idCategoria ?? c.nombreCategoria)} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <div className="col-span-3 font-semibold text-slate-700 truncate">
                      {c.codigoCategoria ?? ''} {c.nombreCategoria}
                    </div>
                    <div className="col-span-8 flex flex-col gap-1">
                      <div className="h-2 bg-slate-50 rounded overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${wRad}%` }} />
                      </div>
                      <div className="h-2 bg-slate-50 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${wCompl}%` }} />
                      </div>
                    </div>
                    <div className="col-span-1 text-right text-slate-500 tabular-nums">{c.radicados}</div>
                  </div>
                );
              })}
              {reporte.porCategoria.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">Sin datos de categorías en el periodo</p>
              )}
            </div>
          </div>

          {/* Tablas agregadas */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Tabla 1: Por Categoría */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Por Categoría de Servicio</h3>
                <span className="text-[11px] font-semibold text-slate-500">{reporte.porCategoria.length} filas</span>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="p-2 font-semibold">Nombre</th>
                      <th className="p-2 font-semibold text-right">Rad</th>
                      <th className="p-2 font-semibold text-right">Compl</th>
                      <th className="p-2 font-semibold text-right">Curso</th>
                      <th className="p-2 font-semibold text-right">Venc</th>
                      <th className="p-2 font-semibold text-right">Calif</th>
                      <th className="p-2 font-semibold text-right">Acc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.porCategoria.map((c) => (
                      <tr key={String(c.idCategoria ?? c.nombreCategoria)} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-2 text-slate-800 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="truncate">{c.codigoCategoria ? `${c.codigoCategoria} · ` : ''}{c.nombreCategoria}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right tabular-nums">{c.radicados}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-700">{c.completados}</td>
                        <td className="p-2 text-right tabular-nums text-amber-700">{c.enCurso}</td>
                        <td className="p-2 text-right tabular-nums text-rose-700">{c.vencidos}</td>
                        <td className="p-2 text-right tabular-nums">{c.promedioCalificacion.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => abrirDetalleCategoria(c)}
                            className="text-[11px] px-2 py-1 rounded-md border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold inline-flex items-center gap-1"
                          >
                            {catExpandida === (c.idCategoria ?? c.nombreCategoria) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 2: Rendimiento Técnicos */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Rendimiento Técnicos</h3>
                <span className="text-[11px] font-semibold text-slate-500">{reporte.porTecnico.length} técnicos</span>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="p-2 font-semibold">Técnico</th>
                      <th className="p-2 font-semibold text-right">Asign</th>
                      <th className="p-2 font-semibold text-right">Compl</th>
                      <th className="p-2 font-semibold text-right">Curso</th>
                      <th className="p-2 font-semibold text-right">Carga HOY</th>
                      <th className="p-2 font-semibold text-right">Calif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.porTecnico.map((t) => (
                      <tr key={String(t.codigoTecnico ?? t.nombreTecnico)} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-2 text-slate-800 font-medium">
                          <span className="text-[10px] font-bold text-indigo-600 mr-1 bg-indigo-50 px-1.5 py-0.5 rounded">{t.codigoTecnico ?? '—'}</span>
                          {t.nombreTecnico}
                        </td>
                        <td className="p-2 text-right tabular-nums">{t.asignados}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-700">{t.completados}</td>
                        <td className="p-2 text-right tabular-nums text-amber-700">{t.enCurso}</td>
                        <td className="p-2 text-right tabular-nums text-slate-700">{t.cargaVigente}</td>
                        <td className="p-2 text-right tabular-nums">{t.promedioCalificacion.toFixed(2)}</td>
                      </tr>
                    ))}
                    {reporte.porTecnico.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">Sin asignaciones en el periodo</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 3: Tiempos Atención vs Meta SLA */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Tiempos Atención vs Meta SLA</h3>
                <span className="text-[11px] font-semibold text-slate-500">{reporte.tiemposAtencionVsMeta.length} categorías</span>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="p-2 font-semibold">Categoría</th>
                      <th className="p-2 font-semibold text-right">Meta (días)</th>
                      <th className="p-2 font-semibold text-right">Cumplen</th>
                      <th className="p-2 font-semibold text-right">Exceden</th>
                      <th className="p-2 font-semibold text-right">% Cumpl</th>
                      <th className="p-2 font-semibold text-right">Real (días)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.tiemposAtencionVsMeta.map((t) => (
                      <tr key={String(t.idCategoria ?? t.nombreCategoria)} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-2 text-slate-800 font-medium">{t.nombreCategoria}</td>
                        <td className="p-2 text-right tabular-nums">{t.metaSlaDias}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-700">{t.casosCumplenSLA}</td>
                        <td className="p-2 text-right tabular-nums text-rose-700">{t.casosExcedenSLA}</td>
                        <td className="p-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className={`font-bold ${t.porcentajeCumplimiento >= 85 ? 'text-emerald-700' : t.porcentajeCumplimiento >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
                              {t.porcentajeCumplimiento.toFixed(1)}%
                            </span>
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${porcentajeColor(t.porcentajeCumplimiento)}`} style={{ width: `${Math.min(100, Math.max(0, t.porcentajeCumplimiento))}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-right tabular-nums">{t.promedioRealDias.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 4: Percepción Servicio */}
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Percepción del Servicio</h3>
                <span className="text-[11px] font-semibold text-slate-500">{totalCalif} calificaciones · prom {reporte.percepcionServicio.promedioGlobal.toFixed(2)}/5</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-600 mb-1">Distribución buckets</p>
                  <div className="flex items-end gap-1 h-16">
                    {[1, 2, 3, 4, 5].map((b) => {
                      const cnt = (reporte.percepcionServicio.porDistribucion as any)[b] ?? 0;
                      const max = Math.max(1, ...(Object.values(reporte.percepcionServicio.porDistribucion) as number[]));
                      const h = (cnt / max) * 100;
                      return (
                        <div key={b} className="flex-1 flex flex-col items-center justify-end gap-1">
                          <div className="w-full rounded-t-md bg-amber-400" style={{ height: `${h}%`, minHeight: cnt > 0 ? '6px' : '2px' }} title={`${cnt} calificaciones · ${b}★`} />
                          <span className="text-[10px] text-slate-500 font-bold">{b}★</span>
                          <span className="text-[10px] tabular-nums text-slate-700">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600">
                        <th className="p-2 font-semibold">Grupo</th>
                        <th className="p-2 font-semibold text-right">N</th>
                        <th className="p-2 font-semibold text-right">Prom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.percepcionServicio.porCategoria.map((c) => (
                        <tr key={`cat-${String(c.idGrupo)}`} className="border-t border-slate-100">
                          <td className="p-2 text-slate-800"><span className="text-[10px] text-violet-600 font-bold mr-1">CAT</span>{c.nombreGrupo}</td>
                          <td className="p-2 text-right tabular-nums">{c.numeroCalificaciones}</td>
                          <td className="p-2 text-right tabular-nums">{c.promedio.toFixed(2)}</td>
                        </tr>
                      ))}
                      {reporte.percepcionServicio.porTecnico.map((c) => (
                        <tr key={`tec-${String(c.idGrupo)}`} className="border-t border-slate-100">
                          <td className="p-2 text-slate-800"><span className="text-[10px] text-blue-600 font-bold mr-1">TEC</span>{c.nombreGrupo}</td>
                          <td className="p-2 text-right tabular-nums">{c.numeroCalificaciones}</td>
                          <td className="p-2 text-right tabular-nums">{c.promedio.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla 5: Rollup Geográfico full width */}
          <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Rollup Geográfico por Sede / Piso</h3>
              <span className="text-[11px] font-semibold text-slate-500">{reporte.rollupGeografico.length} sedes</span>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-slate-600">
                    <th className="p-2 font-semibold">Sede</th>
                    <th className="p-2 font-semibold text-right">Radicados</th>
                    <th className="p-2 font-semibold text-right">Completados</th>
                    <th className="p-2 font-semibold text-right">En curso</th>
                    <th className="p-2 font-semibold">Detalle por piso</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.rollupGeografico.map((g) => (
                    <tr key={String(g.idSede ?? g.nombreSede)} className="border-t border-slate-100 align-top">
                      <td className="p-2 text-slate-800 font-medium">{g.nombreSede}</td>
                      <td className="p-2 text-right tabular-nums">{g.radicados}</td>
                      <td className="p-2 text-right tabular-nums text-emerald-700">{g.completados}</td>
                      <td className="p-2 text-right tabular-nums text-amber-700">{g.enCurso}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(g.porPiso ?? []).map((p, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {p.piso || 'N/A'}
                              <span className="tabular-nums text-slate-500">· {p.cantidad}</span>
                            </span>
                          ))}
                          {(!g.porPiso || g.porPiso.length === 0) && <span className="text-[10px] text-slate-400 italic">Sin detalle de piso</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal detalle categoría */}
      {detalleAbrir && catSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detalle casos · {catSeleccionada.codigoCategoria ?? ''} {catSeleccionada.nombreCategoria}</h3>
                  <p className="text-[11px] text-slate-500">
                    {listaDetalle.length} solicitudes en rango {filtros.fechaDesde || '…'} → {filtros.fechaHasta || '…'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetalleAbrir(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cargandoDetalle ? (
                <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Cargando listado de casos…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600">
                        <th className="p-2 font-semibold">Consecutivo</th>
                        <th className="p-2 font-semibold">Fecha radicación</th>
                        <th className="p-2 font-semibold">Estado</th>
                        <th className="p-2 font-semibold">Técnico</th>
                        <th className="p-2 font-semibold text-right">Calif</th>
                        <th className="p-2 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaDetalle.map((s) => (
                        <tr key={s.idSolicitud} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="p-2 font-semibold text-slate-900">{s.consecutivo}</td>
                          <td className="p-2 text-slate-600 tabular-nums">{s.fechaRadicacion?.slice(0, 10) ?? '-'}</td>
                          <td className="p-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{s.estado}</span>
                          </td>
                          <td className="p-2 text-slate-700 truncate max-w-[200px]">{s.responsableAsignado ?? '—'}</td>
                          <td className="p-2 text-right tabular-nums">{s.calificacionServicio ?? '-'}</td>
                          <td className="p-2 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => { setIdSolicitudSeleccionada(s.idSolicitud); setAbrirDetalleSolicitud(true); }}
                              className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => descargarZipDetalle(s.idSolicitud, s.consecutivo)}
                              className="text-[11px] px-2 py-1 rounded-md border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 font-semibold inline-flex items-center gap-1"
                            >
                              <Package className="w-3 h-3" /> ZIP
                            </button>
                          </td>
                        </tr>
                      ))}
                      {listaDetalle.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">Sin solicitudes en el periodo para esta categoría</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {abrirDetalleSolicitud && idSolicitudSeleccionada && (
        <DetalleSolicitudModal
          idSolicitud={idSolicitudSeleccionada}
          onClose={() => { setAbrirDetalleSolicitud(false); setIdSolicitudSeleccionada(null); }}
        />
      )}
    </div>
  );
};
