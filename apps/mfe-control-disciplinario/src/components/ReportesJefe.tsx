/**
 * Reportes de Procesos, Etapas y Autos — rol Jefe.
 * Dos pestañas separadas (Procesos / Autos) para no mezclar la información —
 * cada una con sus propios filtros, KPIs, gráfica y tabla de detalle.
 * El Excel exportado trae SIEMPRE el dato completo (todos los procesos y todos
 * los Autos, sin filtrar), para que el usuario pueda armar sus propios filtros
 * o estadísticas en Excel.
 */

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

const COLORES = ['#003DA5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B', '#0891B2', '#EF4444'];

const ESTADO_AUTO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  REVISION_JEFE: 'En revisión',
  APROBADO: 'Aprobado',
  FIRMADO: 'Firmado',
  NOTIFICADO: 'Notificado',
  DEVUELTO: 'Devuelto',
};

const ESTADOS_AUTO_APROBADO = ['APROBADO', 'FIRMADO', 'NOTIFICADO'];

const humanizar = (etapa?: string) => (etapa || 'SIN ETAPA').replace(/_/g, ' ');

const nombreProfesional = (p: any): string =>
  p?.abogadoAsignado?.nombreCompleto || p?.abogadoAsignadoNombre || 'Sin asignar';

// Compara solo por día (ignora la hora) para que "Hasta" incluya todo ese día.
const fechaEnRango = (fecha: string | undefined, desde: string, hasta: string): boolean => {
  if (!fecha) return false;
  const soloFecha = fecha.slice(0, 10);
  if (desde && soloFecha < desde) return false;
  if (hasta && soloFecha > hasta) return false;
  return true;
};

interface FilaConteo {
  label: string;
  valor: number;
  color: string;
}

function agrupar<T>(items: T[], keyFn: (item: T) => string): FilaConteo[] {
  const mapa = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    mapa.set(key, (mapa.get(key) || 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([label, valor], i) => ({ label, valor, color: COLORES[i % COLORES.length] }))
    .sort((a, b) => b.valor - a.valor);
}

function GraficaBarras({ titulo, filas }: { titulo: string; filas: FilaConteo[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="text-xs text-gray-400">Sin datos para los filtros seleccionados</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filas.map((fila) => (
            <div key={fila.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 min-w-[160px] truncate" title={fila.label}>
                {fila.label}
              </span>
              <div className="flex-1 h-4 rounded-lg bg-gray-100 overflow-hidden">
                <div
                  className="h-4 rounded-lg"
                  style={{ width: `${(fila.valor / max) * 100}%`, background: fila.color }}
                />
              </div>
              <span className="text-xs font-bold text-gray-800 w-8 text-right">{fila.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{valor}</p>
    </div>
  );
}

export function ReportesJefe() {
  const [loading, setLoading] = useState(true);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [autos, setAutos] = useState<any[]>([]);
  const [vista, setVista] = useState<'procesos' | 'autos'>('procesos');

  const [filtroProfesional, setFiltroProfesional] = useState('todos');
  const [filtroEtapa, setFiltroEtapa] = useState('todos');
  const [filtroTipoAuto, setFiltroTipoAuto] = useState('todos');
  const [filtroEstadoAuto, setFiltroEstadoAuto] = useState('todos');
  // Filtro por fecha de creación (desde/hasta), formato yyyy-mm-dd del <input type="date">
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [procesosRaw, autosRaw] = await Promise.all([
          disciplinaryService.getAllProcesos(),
          disciplinaryService.getAllAutos(),
        ]);
        setProcesos(Array.isArray(procesosRaw) ? procesosRaw : []);
        setAutos(Array.isArray(autosRaw) ? autosRaw : []);
      } catch (error) {
        console.error('Error al cargar datos de Reportes:', error);
        toast.error('No se pudieron cargar los datos de reportes');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const opcionesProfesional = useMemo(
    () => Array.from(new Set(procesos.map((p) => nombreProfesional(p)))).sort(),
    [procesos],
  );
  const opcionesEtapa = useMemo(
    () => Array.from(new Set(procesos.map((p) => p.etapaActual).filter(Boolean))).sort(),
    [procesos],
  );
  const opcionesTipoAuto = useMemo(
    () => Array.from(new Set(autos.map((a) => a.tipo).filter(Boolean))).sort(),
    [autos],
  );

  const procesosFiltrados = useMemo(
    () =>
      procesos.filter((p) => {
        if (filtroProfesional !== 'todos' && nombreProfesional(p) !== filtroProfesional) return false;
        if (filtroEtapa !== 'todos' && p.etapaActual !== filtroEtapa) return false;
        if ((filtroFechaDesde || filtroFechaHasta) && !fechaEnRango(p.createdAt, filtroFechaDesde, filtroFechaHasta)) return false;
        return true;
      }),
    [procesos, filtroProfesional, filtroEtapa, filtroFechaDesde, filtroFechaHasta],
  );

  const autosFiltrados = useMemo(
    () =>
      autos.filter((a) => {
        const profesionalAuto = nombreProfesional(a.process || {});
        if (filtroProfesional !== 'todos' && profesionalAuto !== filtroProfesional) return false;
        if (filtroEtapa !== 'todos' && a.process?.etapaActual !== filtroEtapa) return false;
        if (filtroTipoAuto !== 'todos' && a.tipo !== filtroTipoAuto) return false;
        if (filtroEstadoAuto !== 'todos' && a.estado !== filtroEstadoAuto) return false;
        if ((filtroFechaDesde || filtroFechaHasta) && !fechaEnRango(a.createdAt, filtroFechaDesde, filtroFechaHasta)) return false;
        return true;
      }),
    [autos, filtroProfesional, filtroEtapa, filtroTipoAuto, filtroEstadoAuto, filtroFechaDesde, filtroFechaHasta],
  );

  const autosAprobados = useMemo(
    () => autosFiltrados.filter((a) => ESTADOS_AUTO_APROBADO.includes(a.estado)),
    [autosFiltrados],
  );

  const porEtapa = useMemo(
    () => agrupar(procesosFiltrados, (p) => humanizar(p.etapaActual)),
    [procesosFiltrados],
  );
  const porProfesional = useMemo(
    () => agrupar(procesosFiltrados, (p) => nombreProfesional(p)),
    [procesosFiltrados],
  );
  const aprobadosPorTipo = useMemo(
    () => agrupar(autosAprobados, (a) => a.tipo || 'SIN TIPO'),
    [autosAprobados],
  );

  const detalleProcesos = useMemo(
    () =>
      [...procesosFiltrados].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [procesosFiltrados],
  );

  const detalleAutos = useMemo(
    () =>
      [...autosFiltrados].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [autosFiltrados],
  );

  // El Excel siempre exporta TODOS los procesos y TODOS los Autos (sin aplicar los
  // filtros de pantalla), con las columnas completas, para que el usuario pueda
  // filtrar/pivotear por su cuenta en Excel.
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    const resumen = [
      ['Reporte de Procesos, Etapas y Autos'],
      ['Generado el', new Date().toLocaleString('es-CO')],
      ['Incluye todos los procesos y Autos del sistema (sin aplicar los filtros de pantalla)'],
      [],
      ['Total de procesos', procesos.length],
      ['Total de Autos', autos.length],
      ['Total de Autos aprobados', autos.filter((a) => ESTADOS_AUTO_APROBADO.includes(a.estado)).length],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    wsResumen['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    const filasProcesos = procesos.map((p) => ({
      'Radicado': p.radicadoProceso,
      'Etapa': humanizar(p.etapaActual),
      'Profesional': nombreProfesional(p),
      'Estado': p.estado || '',
      'Fecha de Creación': p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '',
    }));
    const wsProcesos = XLSX.utils.json_to_sheet(filasProcesos);
    wsProcesos['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsProcesos, 'Procesos');

    const filasAutos = autos.map((a) => ({
      'ID / Número de Auto': a.numero || a.id,
      'Proceso': a.process?.radicadoProceso || a.processId,
      'Etapa del Proceso': humanizar(a.process?.etapaActual),
      'Profesional': nombreProfesional(a.process || {}),
      'Tipo de Auto': a.tipo,
      'Estado': ESTADO_AUTO_LABELS[a.estado] || a.estado,
      'Fecha': a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-CO') : '',
    }));
    const wsAutos = XLSX.utils.json_to_sheet(filasAutos);
    wsAutos['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsAutos, 'Autos');

    XLSX.writeFile(wb, `Reporte_Procesos_Autos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Reporte exportado con la información completa');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0891B2' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#0891B2' }} />
          <h2 className="text-lg font-bold text-gray-800">Reportes de Procesos, Etapas y Autos</h2>
        </div>
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-colors"
          style={{ background: '#0891B2', borderColor: '#0891B2', color: '#fff' }}
        >
          <Download className="w-4 h-4" />
          Exportar a Excel (información completa)
        </button>
      </div>

      {/* Pestañas: Procesos vs Autos — se ven y se filtran por separado, sin mezclarse */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['procesos', 'autos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setVista(tab)}
            className="px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors"
            style={
              vista === tab
                ? { color: '#0891B2', borderBottom: '2px solid #0891B2' }
                : { color: '#6B7280', borderBottom: '2px solid transparent' }
            }
          >
            {tab === 'procesos' ? 'Procesos' : 'Autos'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 mb-2">Filtros</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={filtroProfesional}
            onChange={(e) => setFiltroProfesional(e.target.value)}
            className="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="todos">Profesional: todos</option>
            {opcionesProfesional.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="todos">Etapa: todas</option>
            {opcionesEtapa.map((op) => (
              <option key={op} value={op}>{humanizar(op)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {vista === 'autos' && (
            <>
              <select
                value={filtroTipoAuto}
                onChange={(e) => setFiltroTipoAuto(e.target.value)}
                className="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="todos">Tipo de Auto: todos</option>
                {opcionesTipoAuto.map((op) => (
                  <option key={op} value={op}>{humanizar(op)}</option>
                ))}
              </select>
              <select
                value={filtroEstadoAuto}
                onChange={(e) => setFiltroEstadoAuto(e.target.value)}
                className="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="todos">Estado de Auto: todos</option>
                {Object.entries(ESTADO_AUTO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {vista === 'procesos' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label="Total de procesos" valor={procesosFiltrados.length} color="#003DA5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GraficaBarras titulo="Procesos por Etapa" filas={porEtapa} />
            <GraficaBarras titulo="Procesos por Profesional" filas={porProfesional} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Detalle de Procesos ({detalleProcesos.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">Radicado</th>
                  <th className="py-2 pr-3">Etapa</th>
                  <th className="py-2 pr-3">Profesional</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha de Creación</th>
                </tr>
              </thead>
              <tbody>
                {detalleProcesos.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap">{p.radicadoProceso}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{humanizar(p.etapaActual)}</td>
                    <td className="py-2 pr-3">{nombreProfesional(p)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.estado || ''}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : ''}
                    </td>
                  </tr>
                ))}
                {detalleProcesos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-gray-400">
                      Sin procesos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label="Total de Autos aprobados" valor={autosAprobados.length} color="#10B981" />
            <StatTile label="Total de Autos" valor={autosFiltrados.length} color="#0891B2" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <GraficaBarras titulo="Autos aprobados por Tipo" filas={aprobadosPorTipo} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Detalle de Autos ({detalleAutos.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">ID / Número</th>
                  <th className="py-2 pr-3">Proceso</th>
                  <th className="py-2 pr-3">Etapa</th>
                  <th className="py-2 pr-3">Profesional</th>
                  <th className="py-2 pr-3">Tipo de Auto</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {detalleAutos.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap">{a.numero || a.id}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.process?.radicadoProceso || a.processId}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{humanizar(a.process?.etapaActual)}</td>
                    <td className="py-2 pr-3">{nombreProfesional(a.process || {})}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{humanizar(a.tipo)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{ESTADO_AUTO_LABELS[a.estado] || a.estado}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-CO') : ''}
                    </td>
                  </tr>
                ))}
                {detalleAutos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-xs text-gray-400">
                      Sin autos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
