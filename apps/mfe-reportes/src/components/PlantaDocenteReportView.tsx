/**
 * Reporte de Planta Docente — REQ-RUND-F019
 *
 * Permite a GGP/Dirección/consultores autorizados generar el reporte de planta
 * docente combinando filtros por territorial, tipo de vinculación, categoría,
 * género, nivel de formación, núcleo temático y período académico. Muestra los
 * datos agregados (conteos por dimensión) y el detalle paginado según el filtro
 * aplicado. El backend (banco-docentes/stats y banco-docentes) ya aplica RBAC
 * y enmascara datos sensibles individuales.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Filter, Download, RefreshCw, FileSpreadsheet, FileText,
  Building2, GraduationCap, Layers, X,
} from 'lucide-react';
import { Card, Badge } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { apiClient } from '../services/api/apiClient';
import { exportToCSV, exportToExcel } from '../utils/reportExport';
import { UnifiedStatsCards, type StatCardData } from './UnifiedStatsCards';
import { PaginationPremium } from '../shared/PaginationPremium';
import { EmptyStatePremium } from './EmptyStatesPremium';

const BD_BASE = '/pta/api/v1/pta/banco-docentes';

interface FiltrosPlantaDocente {
  territorial: string;
  vinculacion: string;
  categoria: string;
  genero: string;
  nivelFormacion: string;
  nucleoTematico: string;
  periodoCarga: string;
}

const FILTROS_VACIOS: FiltrosPlantaDocente = {
  territorial: '',
  vinculacion: '',
  categoria: '',
  genero: '',
  nivelFormacion: '',
  nucleoTematico: '',
  periodoCarga: '',
};

interface StatsResponse {
  total: number;
  activos: number;
  inactivos: number;
  total_horas: number;
  promedio_horas: number;
  por_territorial: { territorial: string; total: number }[];
  por_categoria: { categoria: string; total: number }[];
  por_vinculacion: { vinculacion: string; total: number }[];
  por_nivel_formacion: { nivel_formacion: string; total: number }[];
  por_genero: { genero: string; total: number }[];
  por_nucleo_tematico: { nucleo_tematico: string; total: number }[];
  por_sede: { sede: string; total: number }[];
}

async function fetchStats(filters: Partial<FiltrosPlantaDocente>): Promise<StatsResponse | null> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const raw = await apiClient.get<any>(`${BD_BASE}/stats`, params);
  return raw?.data ?? raw ?? null;
}

async function fetchDetalle(filters: Partial<FiltrosPlantaDocente>, page: number, limit: number) {
  const params = { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page, limit };
  const raw = await apiClient.get<any>(BD_BASE, params);
  return {
    items: Array.isArray(raw?.items) ? raw.items : [],
    total: raw?.total ?? 0,
    pages: raw?.pages ?? 1,
  };
}

function distinctSorted(rows: { total: number }[] | undefined, key: string): string[] {
  if (!rows) return [];
  return [...new Set(rows.map((r: any) => String(r[key] ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

function AggregationTable({
  title,
  icon: Icon,
  rows,
  labelKey,
}: {
  title: string;
  icon: any;
  rows: { total: number; [key: string]: any }[];
  labelKey: string;
}) {
  const total = rows.reduce((sum, r) => sum + (r.total || 0), 0);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#003DA5]" />
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">Sin datos para el filtro aplicado.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {rows.map((row, idx) => {
            const pct = total > 0 ? Math.round(((row.total || 0) / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate pr-2" title={String(row[labelKey])}>
                  {row[labelKey]}
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{pct}%</span>
                  <Badge variant="outline" className="text-xs">{row.total}</Badge>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function PlantaDocenteReportView({ onClose }: { onClose?: () => void }) {
  const [filterOptions, setFilterOptions] = useState<{
    territoriales: string[];
    vinculaciones: string[];
    categorias: string[];
    generos: string[];
    nivelesFormacion: string[];
    nucleosTematicos: string[];
  }>({ territoriales: [], vinculaciones: [], categorias: [], generos: [], nivelesFormacion: [], nucleosTematicos: [] });

  const [filtros, setFiltros] = useState<FiltrosPlantaDocente>(FILTROS_VACIOS);
  const [appliedFiltros, setAppliedFiltros] = useState<FiltrosPlantaDocente>(FILTROS_VACIOS);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [detalle, setDetalle] = useState<{ items: any[]; total: number; pages: number }>({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const limit = 20;

  // Catálogo inicial de valores distintos (sin filtros) para poblar los selects.
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchStats({});
        if (!data) return;
        setFilterOptions({
          territoriales: distinctSorted(data.por_territorial, 'territorial'),
          vinculaciones: distinctSorted(data.por_vinculacion, 'vinculacion'),
          categorias: distinctSorted(data.por_categoria, 'categoria'),
          generos: distinctSorted(data.por_genero, 'genero'),
          nivelesFormacion: distinctSorted(data.por_nivel_formacion, 'nivel_formacion'),
          nucleosTematicos: distinctSorted(data.por_nucleo_tematico, 'nucleo_tematico'),
        });
        setStats(data);
      } catch (error) {
        console.error('[PlantaDocenteReportView] Error cargando catálogo de filtros:', error);
        toast.error('No se pudo cargar el catálogo de filtros del reporte.');
      }
    })();
  }, []);

  const generarReporte = async () => {
    setAppliedFiltros(filtros);
    setPage(1);
    setLoadingStats(true);
    setLoadingDetalle(true);
    try {
      const [statsData, detalleData] = await Promise.all([
        fetchStats(filtros),
        fetchDetalle(filtros, 1, limit),
      ]);
      setStats(statsData);
      setDetalle(detalleData);
    } catch (error: any) {
      toast.error('Error al generar el reporte', { description: error?.message });
      console.error('[PlantaDocenteReportView] Error generando reporte:', error);
    } finally {
      setLoadingStats(false);
      setLoadingDetalle(false);
    }
  };

  const cambiarPagina = async (nuevaPagina: number) => {
    setPage(nuevaPagina);
    setLoadingDetalle(true);
    try {
      const detalleData = await fetchDetalle(appliedFiltros, nuevaPagina, limit);
      setDetalle(detalleData);
    } catch (error: any) {
      toast.error('Error al cargar la página del detalle', { description: error?.message });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
  };

  const filtrosActivos = useMemo(
    () => Object.values(appliedFiltros).filter(Boolean).length,
    [appliedFiltros],
  );

  const summaryCards: StatCardData[] = stats
    ? [
        { id: 'total', title: 'Total docentes', value: stats.total, icon: Users, gradient: 'linear-gradient(135deg, #1e5da8 0%, #164a85 100%)', lightBg: '#EFF6FF', iconColor: '#1e5da8', description: `${filtrosActivos} filtro(s) aplicado(s)`, trend: 'neutral' as const },
        { id: 'activos', title: 'Activos', value: stats.activos, icon: Users, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', lightBg: '#D1FAE5', iconColor: '#10b981', description: `${stats.inactivos} inactivos`, trend: 'neutral' as const },
        { id: 'horas', title: 'Total horas asignadas', value: stats.total_horas, icon: Layers, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', lightBg: '#EDE9FE', iconColor: '#8b5cf6', description: 'Suma de horas programables', trend: 'neutral' as const },
        { id: 'promedio', title: 'Promedio de horas', value: stats.promedio_horas, icon: GraduationCap, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', lightBg: '#FEF3C7', iconColor: '#f59e0b', description: 'Por docente', trend: 'neutral' as const },
      ]
    : [];

  const exportarAgregados = (formato: 'csv' | 'excel') => {
    if (!stats) return;
    const rows = [
      { dimension: 'Total', valor: 'Total', total: stats.total },
      ...stats.por_territorial.map((r) => ({ dimension: 'Territorial', valor: r.territorial, total: r.total })),
      ...stats.por_vinculacion.map((r) => ({ dimension: 'Tipo de vinculación', valor: r.vinculacion, total: r.total })),
      ...stats.por_categoria.map((r) => ({ dimension: 'Categoría', valor: r.categoria, total: r.total })),
      ...stats.por_genero.map((r) => ({ dimension: 'Género', valor: r.genero, total: r.total })),
      ...stats.por_nivel_formacion.map((r) => ({ dimension: 'Nivel de formación', valor: r.nivel_formacion, total: r.total })),
      ...stats.por_nucleo_tematico.map((r) => ({ dimension: 'Núcleo temático', valor: r.nucleo_tematico, total: r.total })),
    ];
    if (formato === 'csv') exportToCSV(rows, 'reporte-planta-docente-agregado');
    else exportToExcel(rows, 'reporte-planta-docente-agregado');
    toast.success('Reporte agregado exportado');
  };

  const exportarDetalle = (formato: 'csv' | 'excel') => {
    if (!detalle.items.length) {
      toast.info('No hay detalle para exportar con el filtro actual');
      return;
    }
    if (formato === 'csv') exportToCSV(detalle.items, 'reporte-planta-docente-detalle');
    else exportToExcel(detalle.items, 'reporte-planta-docente-detalle');
    toast.success('Detalle exportado (página actual)');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#003DA5]" />
            Reporte de planta docente
          </h2>
          <p className="text-sm text-gray-500">
            Filtra por territorial, tipo de vinculación, categoría, género, nivel de formación, núcleo
            temático y período académico. Los filtros son combinables.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FiltroSelect
            label="Territorial"
            value={filtros.territorial}
            options={filterOptions.territoriales}
            onChange={(v) => setFiltros((f) => ({ ...f, territorial: v }))}
          />
          <FiltroSelect
            label="Tipo de vinculación"
            value={filtros.vinculacion}
            options={filterOptions.vinculaciones}
            onChange={(v) => setFiltros((f) => ({ ...f, vinculacion: v }))}
          />
          <FiltroSelect
            label="Categoría"
            value={filtros.categoria}
            options={filterOptions.categorias}
            onChange={(v) => setFiltros((f) => ({ ...f, categoria: v }))}
          />
          <FiltroSelect
            label="Género"
            value={filtros.genero}
            options={filterOptions.generos}
            onChange={(v) => setFiltros((f) => ({ ...f, genero: v }))}
          />
          <FiltroSelect
            label="Nivel de formación"
            value={filtros.nivelFormacion}
            options={filterOptions.nivelesFormacion}
            onChange={(v) => setFiltros((f) => ({ ...f, nivelFormacion: v }))}
          />
          <FiltroSelect
            label="Núcleo temático"
            value={filtros.nucleoTematico}
            options={filterOptions.nucleosTematicos}
            onChange={(v) => setFiltros((f) => ({ ...f, nucleoTematico: v }))}
          />
          <div>
            <label htmlFor="filtro-periodo-academico" className="text-xs font-medium text-gray-600 mb-1 block">Período académico</label>
            <input
              id="filtro-periodo-academico"
              type="text"
              placeholder="ej. 2025-2"
              value={filtros.periodoCarga}
              onChange={(e) => setFiltros((f) => ({ ...f, periodoCarga: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={generarReporte}
            disabled={loadingStats}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003DA5] text-white text-sm font-semibold hover:bg-[#00337f] transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            Generar reporte
          </button>
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 rounded-lg border-2 border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </Card>

      {/* Resumen agregado */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <UnifiedStatsCards stats={summaryCards} columns={4} />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => exportarAgregados('excel')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-200 text-sm hover:bg-gray-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar agregado (Excel)
            </button>
            <button
              onClick={() => exportarAgregados('csv')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-200 text-sm hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 text-blue-600" /> CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AggregationTable title="Por territorial" icon={Building2} rows={stats.por_territorial} labelKey="territorial" />
            <AggregationTable title="Por tipo de vinculación" icon={Layers} rows={stats.por_vinculacion} labelKey="vinculacion" />
            <AggregationTable title="Por categoría" icon={Layers} rows={stats.por_categoria} labelKey="categoria" />
            <AggregationTable title="Por género" icon={Users} rows={stats.por_genero} labelKey="genero" />
            <AggregationTable title="Por nivel de formación" icon={GraduationCap} rows={stats.por_nivel_formacion} labelKey="nivel_formacion" />
            <AggregationTable title="Por núcleo temático" icon={Layers} rows={stats.por_nucleo_tematico} labelKey="nucleo_tematico" />
          </div>

          {/* Detalle */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-sm">
                Detalle ({detalle.total} docente{detalle.total !== 1 ? 's' : ''})
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarDetalle('excel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar página (Excel)
                </button>
              </div>
            </div>

            {loadingDetalle ? (
              <p className="text-sm text-gray-400 py-6 text-center">Cargando detalle…</p>
            ) : detalle.items.length === 0 ? (
              <EmptyStatePremium type="no-results" title="Sin resultados" description="No hay docentes que coincidan con el filtro aplicado." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="py-2 pr-3">Nombre</th>
                        <th className="py-2 pr-3">Territorial</th>
                        <th className="py-2 pr-3">Vinculación</th>
                        <th className="py-2 pr-3">Categoría</th>
                        <th className="py-2 pr-3">Género</th>
                        <th className="py-2 pr-3">Nivel formación</th>
                        <th className="py-2 pr-3">Núcleo temático</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((row: any, idx: number) => (
                        <tr key={row.docente_id || row.persona_id || idx} className="border-b border-gray-50">
                          <td className="py-2 pr-3">{row.nombre_completo || '—'}</td>
                          <td className="py-2 pr-3">{row.territorial || '—'}</td>
                          <td className="py-2 pr-3">{row.vinculacion || '—'}</td>
                          <td className="py-2 pr-3">{row.categoria || '—'}</td>
                          <td className="py-2 pr-3">{row.genero || '—'}</td>
                          <td className="py-2 pr-3">{row.nivel_formacion || '—'}</td>
                          <td className="py-2 pr-3">{row.nucleo_tematico || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <PaginationPremium
                    currentPage={page}
                    totalPages={detalle.pages}
                    onPageChange={cambiarPagina}
                    itemsPerPage={limit}
                    totalItems={detalle.total}
                  />
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `filtro-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#003DA5] bg-white"
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
