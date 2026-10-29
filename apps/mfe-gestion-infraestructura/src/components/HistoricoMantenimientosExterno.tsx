import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database, UploadCloud, FileSpreadsheet, Search, Filter,
  CheckCircle2, Clock, Calendar, Users, FileText, ChevronLeft,
  ChevronRight, RefreshCw, AlertCircle, Info, X, ExternalLink,
  Layers, Sparkles, Check, ArrowDownToLine, Loader2, ShieldCheck,
  Trash2, AlertTriangle, UserCheck, FilterX, CalendarRange,
} from 'lucide-react';
import {
  infraestructuraService,
  MantenimientoHistoricoItem,
  HistoricoEstadisticas,
  ResumenImportacionHistorico,
} from '../services/infraestructuraService';

interface HistoricoMantenimientosExternoProps {
  esRolReportes?: boolean;
}

export const HistoricoMantenimientosExterno: React.FC<HistoricoMantenimientosExternoProps> = ({
  esRolReportes = true,
}) => {
  // Estados de datos
  const [items, setItems] = useState<MantenimientoHistoricoItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [semanasDisponibles, setSemanasDisponibles] = useState<Array<{ semana: string; cantidad: number }>>([]);
  const [estadisticas, setEstadisticas] = useState<HistoricoEstadisticas | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string>('TODAS');
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<string>('TODOS');
  const [solicitanteSeleccionado, setSolicitanteSeleccionado] = useState<string>('TODOS');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [tecnicosDisponibles, setTecnicosDisponibles] = useState<Array<{ tecnico: string; cantidad: number }>>([]);
  const [solicitantesDisponibles, setSolicitantesDisponibles] = useState<Array<{ solicitante: string; cantidad: number }>>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Modales
  const [modalImportarAbierto, setModalImportarAbierto] = useState<boolean>(false);
  const [modalVaciarAbierto, setModalVaciarAbierto] = useState<boolean>(false);
  const [vaciando, setVaciando] = useState<boolean>(false);
  const [mensajeExitoVaciar, setMensajeExitoVaciar] = useState<string | null>(null);
  const [mensajeExitoImportacion, setMensajeExitoImportacion] = useState<string | null>(null);
  const [progresoImportacion, setProgresoImportacion] = useState<number>(0);
  const [itemSeleccionado, setItemSeleccionado] = useState<MantenimientoHistoricoItem | null>(null);

  // Estados de carga de archivo
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [importando, setImportando] = useState<boolean>(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResumenImportacionHistorico | null>(null);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);
  const [descargandoExcel, setDescargandoExcel] = useState<boolean>(false);

  // Cargar datos principales
  const cargarHistorico = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [resList, resStats] = await Promise.all([
        infraestructuraService.getHistorico({
          page,
          limit,
          search: busqueda.trim() || undefined,
          semana: semanaSeleccionada !== 'TODAS' ? semanaSeleccionada : undefined,
          tecnico: tecnicoSeleccionado !== 'TODOS' ? tecnicoSeleccionado : undefined,
          solicitante: solicitanteSeleccionado !== 'TODOS' ? solicitanteSeleccionado : undefined,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
        }),
        infraestructuraService.getHistoricoEstadisticas(),
      ]);
      setItems(resList.data || []);
      setTotal(resList.total || 0);
      setTotalPages(resList.totalPages || 1);
      setSemanasDisponibles(resList.semanasDisponibles || []);
      if (resList.tecnicosDisponibles) setTecnicosDisponibles(resList.tecnicosDisponibles);
      if (resList.solicitantesDisponibles) setSolicitantesDisponibles(resList.solicitantesDisponibles);
      setEstadisticas(resStats);
    } catch (err: any) {
      setErrorCarga(err?.message || 'Error cargando datos del histórico.');
    } finally {
      setCargando(false);
    }
  }, [page, limit, busqueda, semanaSeleccionada, tecnicoSeleccionado, solicitanteSeleccionado, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarHistorico();
  }, [cargarHistorico]);

  // Manejo de importación de archivo con barra de progreso y auto-cierre
  const handleImportarArchivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoSeleccionado) return;
    setImportando(true);
    setProgresoImportacion(15);
    setErrorImportacion(null);
    setResultadoImportacion(null);

    const progressInterval = setInterval(() => {
      setProgresoImportacion((prev) => {
        if (prev < 40) return prev + 15;
        if (prev < 75) return prev + 8;
        if (prev < 90) return prev + 4;
        return prev;
      });
    }, 250);

    try {
      const res = await infraestructuraService.importarHistoricoArchivo(archivoSeleccionado);
      clearInterval(progressInterval);
      setProgresoImportacion(100);
      setResultadoImportacion(res);
      setArchivoSeleccionado(null);

      // Cierre automático del modal y feedback en vista principal
      setTimeout(() => {
        setModalImportarAbierto(false);
        setProgresoImportacion(0);
        setMensajeExitoImportacion(
          `¡Importación completada con éxito! Se procesaron ${res.totalFilas.toLocaleString('es-CO')} registros históricos.`
        );
        cargarHistorico();
        setTimeout(() => setMensajeExitoImportacion(null), 6000);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgresoImportacion(0);
      setErrorImportacion(err?.message || 'Error al procesar el archivo Excel.');
    } finally {
      setImportando(false);
    }
  };

  // Cargar plantilla por defecto del servidor en 1 clic con progreso y auto-cierre
  const handleCargarDesdeServidor = async () => {
    setImportando(true);
    setProgresoImportacion(15);
    setErrorImportacion(null);
    setResultadoImportacion(null);

    const progressInterval = setInterval(() => {
      setProgresoImportacion((prev) => {
        if (prev < 40) return prev + 15;
        if (prev < 75) return prev + 8;
        if (prev < 90) return prev + 4;
        return prev;
      });
    }, 250);

    try {
      const res = await infraestructuraService.cargarHistoricoDesdeServidor();
      clearInterval(progressInterval);
      setProgresoImportacion(100);
      setResultadoImportacion(res);

      // Cierre automático del modal y feedback en vista principal
      setTimeout(() => {
        setModalImportarAbierto(false);
        setProgresoImportacion(0);
        setMensajeExitoImportacion(
          `¡Carga oficial completada con éxito! Se procesaron ${res.totalFilas.toLocaleString('es-CO')} registros históricos en ${(res.tiempoMs / 1000).toFixed(2)}s.`
        );
        cargarHistorico();
        setTimeout(() => setMensajeExitoImportacion(null), 6000);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgresoImportacion(0);
      setErrorImportacion(err?.message || 'Error al importar desde el archivo oficial del servidor.');
    } finally {
      setImportando(false);
    }
  };

  // Vaciar histórico con confirmación
  const handleVaciarHistorico = async () => {
    setVaciando(true);
    try {
      const res = await infraestructuraService.vaciarHistorico();
      setModalVaciarAbierto(false);
      setPage(1);
      setBusqueda('');
      setSemanaSeleccionada('TODAS');
      setTecnicoSeleccionado('TODOS');
      setSolicitanteSeleccionado('TODOS');
      setFechaDesde('');
      setFechaHasta('');
      setMensajeExitoVaciar(`Se vaciaron exitosamente ${res.eliminados.toLocaleString('es-CO')} registros históricos.`);
      await cargarHistorico();
      setTimeout(() => setMensajeExitoVaciar(null), 6000);
    } catch (err: any) {
      alert('Error al vaciar los registros históricos: ' + (err?.message || err));
    } finally {
      setVaciando(false);
    }
  };

  // Descarga de Excel respetando los filtros activos (semana, técnico, solicitante, fecha)
  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    try {
      const blob = await infraestructuraService.descargarHistoricoExcel({
        search: busqueda.trim() || undefined,
        semana: semanaSeleccionada !== 'TODAS' ? semanaSeleccionada : undefined,
        tecnico: tecnicoSeleccionado !== 'TODOS' ? tecnicoSeleccionado : undefined,
        solicitante: solicitanteSeleccionado !== 'TODOS' ? solicitanteSeleccionado : undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Historico_Mantenimientos_Planner_2026_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Error descargando el archivo Excel: ' + (err?.message || err));
    } finally {
      setDescargandoExcel(false);
    }
  };

  // Formateador de fechas
  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return '—';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return fechaStr;
    }
  };

  // Desglosar lista de técnicos
  const renderTecnicosPills = (texto?: string | null) => {
    if (!texto) return <span className="text-slate-400 italic text-[11px]">Sin asignar</span>;
    const nombres = texto.split(';').map((n) => n.trim()).filter(Boolean);
    if (nombres.length === 0) return <span className="text-slate-400 italic text-[11px]">Sin asignar</span>;

    const colores = [
      'bg-sky-50 text-sky-800 border-sky-200',
      'bg-indigo-50 text-indigo-800 border-indigo-200',
      'bg-purple-50 text-purple-800 border-purple-200',
      'bg-emerald-50 text-emerald-800 border-emerald-200',
    ];

    return (
      <div className="flex flex-wrap gap-1">
        {nombres.map((nombre, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colores[idx % colores.length]}`}
          >
            <Users className="w-2.5 h-2.5 opacity-60" />
            <span className="truncate max-w-[140px]" title={nombre}>
              {nombre}
            </span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ===================================================================== */}
      {/* BANNER INFORMATIVO DE AISLAMIENTO AUDITOR */}
      {/* ===================================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-white text-slate-800 p-6 shadow-sm border border-slate-200/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Repositorio Histórico de Mantenimientos (Planner / GLPI)
            </h3>
            <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
              Consolidado histórico de órdenes de trabajo ejecutadas en <strong>Microsoft Planner</strong> durante la vigencia 2026.
              Este módulo opera en <strong>modo de solo lectura para auditoría y consulta retrospectiva</strong>, protegiendo las estadísticas,
              tiempos de respuesta (SLA) y la máquina de estados de las solicitudes radicadas en la plataforma ESAP.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {esRolReportes && (
              <>
                <button
                  type="button"
                  onClick={() => setModalImportarAbierto(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>Importar Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalVaciarAbierto(true)}
                  disabled={vaciando}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Vaciar todos los registros históricos para probar la importación nuevamente"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Vaciar Registros</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={descargandoExcel || total === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {descargandoExcel ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              )}
              <span>{descargandoExcel ? 'Generando…' : 'Exportar Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de importación exitosa */}
      {mensajeExitoImportacion && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{mensajeExitoImportacion}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExitoImportacion(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerta de vaciado exitoso */}
      {mensajeExitoVaciar && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{mensajeExitoVaciar}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExitoVaciar(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TARJETAS KPI DE RESUMEN HISTÓRICO */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Casos */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tareas</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {estadisticas ? estadisticas.totalRegistros.toLocaleString('es-CO') : '…'}
            </h4>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              Microsoft Planner 2026
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Semanas Operativas */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Semanas Registradas</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {estadisticas ? estadisticas.totalSemanas : '…'}
            </h4>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              Agrupadas por Depósito
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Cuadrilla Técnica */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Técnicos de Campo</p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {estadisticas ? estadisticas.totalTecnicos : '…'}
            </h4>
            <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              Cuadrilla Asignada
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Cumplimiento */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tasa Finalización</p>
            <h4 className="text-2xl font-black text-emerald-700 mt-1">
              {estadisticas ? `${estadisticas.tasaCumplimiento}%` : '…'}
            </h4>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              100% Completadas
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BARRA DE HERRAMIENTAS Y FILTROS AVANZADOS */}
      {/* ===================================================================== */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        {/* Fila 1: Buscador y Filtros Principales (Semana, Técnico, Solicitante) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Buscador */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por tarea, técnico, solicitante..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => { setBusqueda(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Semana / Depósito */}
          <div className="md:col-span-3">
            <select
              value={semanaSeleccionada}
              onChange={(e) => {
                setSemanaSeleccionada(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100/60 transition-colors focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none cursor-pointer"
            >
              <option value="TODAS">Todas las Semanas ({semanasDisponibles.length})</option>
              {semanasDisponibles.map((s, idx) => (
                <option key={idx} value={s.semana}>
                  {s.semana} ({s.cantidad})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Asignado a (Técnico) */}
          <div className="md:col-span-3">
            <select
              value={tecnicoSeleccionado}
              onChange={(e) => {
                setTecnicoSeleccionado(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100/60 transition-colors focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Asignados ({tecnicosDisponibles.length})</option>
              {tecnicosDisponibles.map((t, idx) => (
                <option key={idx} value={t.tecnico}>
                  {t.tecnico} ({t.cantidad})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Solicitante (Creado por) */}
          <div className="md:col-span-2">
            <select
              value={solicitanteSeleccionado}
              onChange={(e) => {
                setSolicitanteSeleccionado(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100/60 transition-colors focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none cursor-pointer"
            >
              <option value="TODOS">Solicitantes ({solicitantesDisponibles.length})</option>
              {solicitantesDisponibles.map((s, idx) => (
                <option key={idx} value={s.solicitante}>
                  {s.solicitante} ({s.cantidad})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Rango de Fechas y Acciones de Filtro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Filtrar Fechas:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPage(1);
                }}
                className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPage(1);
                }}
                className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>

            {/* Botón limpiar filtros si alguno está activo */}
            {(busqueda || semanaSeleccionada !== 'TODAS' || tecnicoSeleccionado !== 'TODOS' || solicitanteSeleccionado !== 'TODOS' || fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  setSemanaSeleccionada('TODAS');
                  setTecnicoSeleccionado('TODOS');
                  setSolicitanteSeleccionado('TODOS');
                  setFechaDesde('');
                  setFechaHasta('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors shadow-2xs"
                title="Limpiar todos los filtros"
              >
                <X className="w-3 h-3 text-slate-500" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={cargarHistorico}
              disabled={cargando}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-sky-600' : ''}`} />
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Mostrando <strong>{items.length}</strong> de <strong>{total.toLocaleString('es-CO')}</strong> registros
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TABLA PRINCIPAL DE REGISTROS HISTÓRICOS */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <p className="text-xs font-semibold text-slate-600">Cargando registros históricos de Planner…</p>
          </div>
        ) : errorCarga ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 text-rose-600">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs font-bold">{errorCarga}</p>
            <button
              type="button"
              onClick={cargarHistorico}
              className="mt-2 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-100"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm">No se encontraron registros históricos</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No hay coincidencias con los filtros aplicados o aún no se ha ejecutado la ingesta de Planner 2026.
              </p>
            </div>
            {esRolReportes && (
              <button
                type="button"
                onClick={() => setModalImportarAbierto(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Cargar Archivo Planner
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[280px]">Tarea / Actividad</th>
                  <th className="py-3 px-4 min-w-[160px]">Semana / Depósito</th>
                  <th className="py-3 px-4 min-w-[220px]">Asignado a</th>
                  <th className="py-3 px-4 min-w-[150px]">Solicitante</th>
                  <th className="py-3 px-4 min-w-[130px]">Fechas</th>
                  <th className="py-3 px-4 w-28 text-center">Estado</th>
                  <th className="py-3 px-4 w-16 text-center">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr
                    key={item.idHistorico}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setItemSeleccionado(item)}
                  >
                    {/* Fila */}
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {item.numeroFilaOrigen || (page - 1) * limit + idx + 1}
                    </td>

                    {/* Título de la tarea */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2">
                        {item.tituloTarea}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.idTareaExterna}
                      </div>
                    </td>

                    {/* Semana / Depósito */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[180px]">
                          {item.semanaNormalizada || item.depositoSemana || 'Sin semana'}
                        </span>
                      </span>
                    </td>

                    {/* Asignado a */}
                    <td className="py-3 px-4">
                      {renderTecnicosPills(item.asignadoATexto)}
                    </td>

                    {/* Solicitante / Creado por */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="truncate block max-w-[150px]" title={item.creadoPorTexto || ''}>
                        {item.creadoPorTexto || '—'}
                      </span>
                    </td>

                    {/* Fechas */}
                    <td className="py-3 px-4">
                      <div className="text-[11px] font-medium text-slate-700">
                        {formatearFecha(item.fechaFinalizacion || item.fechaCreacion)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Inicio: {formatearFecha(item.fechaInicio)}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3" />
                        {item.estadoOriginal || item.estadoHomologado}
                      </span>
                    </td>

                    {/* Ficha */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setItemSeleccionado(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Ver ficha completa"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: FICHA DETALLADA DEL REGISTRO HISTÓRICO */}
      {/* ===================================================================== */}
      {itemSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 className="font-bold text-sm">Ficha Histórica del Mantenimiento</h4>
                  <p className="text-[11px] text-slate-400">{itemSeleccionado.idTareaExterna}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemSeleccionado(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Descripción / Tarea</label>
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {itemSeleccionado.tituloTarea}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Depósito / Semana</label>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {itemSeleccionado.semanaNormalizada || itemSeleccionado.depositoSemana || '—'}
                  </p>
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Estado Original</label>
                  <div className="mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3" />
                      {itemSeleccionado.estadoOriginal || itemSeleccionado.estadoHomologado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Técnicos Asignados</label>
                <div>{renderTecnicosPills(itemSeleccionado.asignadoATexto)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Creado por</label>
                  <p className="font-medium text-slate-800 mt-0.5">{itemSeleccionado.creadoPorTexto || '—'}</p>
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Completado por</label>
                  <p className="font-medium text-slate-800 mt-0.5">{itemSeleccionado.completadoPorTexto || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Fecha Creación</label>
                  <p className="font-medium text-slate-800 mt-0.5">{formatearFecha(itemSeleccionado.fechaCreacion)}</p>
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Fecha Inicio</label>
                  <p className="font-medium text-slate-800 mt-0.5">{formatearFecha(itemSeleccionado.fechaInicio)}</p>
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Fecha Finalización</label>
                  <p className="font-medium text-slate-800 mt-0.5">{formatearFecha(itemSeleccionado.fechaFinalizacion)}</p>
                </div>
              </div>

              {/* Metadatos de auditoría */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px] text-slate-500">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Traza de Ingesta y Origen:
                </div>
                <div>Archivo fuente: <code>{itemSeleccionado.nombreArchivoOrigen}</code> (Fila #{itemSeleccionado.numeroFilaOrigen})</div>
                <div>Fecha de ingesta en plataforma: {new Date(itemSeleccionado.fechaIngesta).toLocaleString('es-CO')}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setItemSeleccionado(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: IMPORTACIÓN MASIVA DESDE EXCEL */}
      {/* ===================================================================== */}
      {modalImportarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-200" />
                <h4 className="font-bold text-sm">Importación Masiva de Mantenimientos</h4>
              </div>
              <button
                type="button"
                onClick={() => setModalImportarAbierto(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleImportarArchivo} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 flex items-start gap-2.5 text-sky-900">
                <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div className="leading-relaxed text-[11px]">
                  <strong>Plantilla soportada:</strong> Formato exportado de Microsoft Planner o GLPI (12 columnas base: Tarea, Depósito, Estado, Asignado a, Creado por, Fechas).
                </div>
              </div>

              {/* Botón rápido: cargar plantilla oficial 2026 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-indigo-950 text-xs">Plantilla Oficial ESAP 2026</h5>
                    <p className="text-[11px] text-indigo-700"><code>Mantenimientos_Infraestructura_2026.xlsx</code> (1.107 registros)</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCargarDesdeServidor}
                    disabled={importando}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    className="px-4 py-2 rounded-xl text-white font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{importando ? 'Procesando…' : 'Cargar en 1 Clic'}</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold">O subir archivo manual</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Dropzone / Input file */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)}
                  className="hidden"
                  id="excel-historico-input"
                />
                <label htmlFor="excel-historico-input" className="cursor-pointer block">
                  <FileSpreadsheet className="w-9 h-9 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700 text-xs">
                    {archivoSeleccionado ? archivoSeleccionado.name : 'Haz clic para seleccionar el archivo Excel'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Formatos válidos: .xlsx o .xls</p>
                </label>
              </div>

              {/* Barra de progreso de importación */}
              {importando && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Importando y estructurando registros...
                    </span>
                    <span className="font-mono text-blue-700">{progresoImportacion}%</span>
                  </div>
                  <div className="w-full bg-blue-200/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progresoImportacion}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-700 leading-tight">
                    Procesando registros de Microsoft Planner / GLPI. La ventana se cerrará automáticamente al finalizar.
                  </p>
                </div>
              )}

              {/* Resultado de importación */}
              {resultadoImportacion && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px]">
                    <p className="font-bold">¡Importación completada con éxito!</p>
                    <p className="mt-0.5">
                      Se procesaron <strong>{resultadoImportacion.totalFilas}</strong> filas en {(resultadoImportacion.tiempoMs / 1000).toFixed(2)}s.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorImportacion && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px]">
                    <p className="font-bold">Error en la importación</p>
                    <p className="mt-0.5">{errorImportacion}</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalImportarAbierto(false)}
                  disabled={importando}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!archivoSeleccionado || importando}
                  style={
                    !archivoSeleccionado || importando
                      ? { backgroundColor: '#e2e8f0', color: '#64748b' }
                      : { backgroundColor: '#16a34a', color: '#ffffff' }
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed hover:brightness-110"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{importando ? 'Importando…' : 'Iniciar Importación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: CONFIRMACIÓN PARA VACIAR REGISTROS HISTÓRICOS */}
      {/* ===================================================================== */}
      {modalVaciarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight">Confirmar Vaciado de Registros</h4>
                  <p className="text-[10px] text-rose-100">Acción destructiva irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !vaciando && setModalVaciarAbierto(false)}
                disabled={vaciando}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-950 text-xs">
                    ¿Estás seguro de que deseas vaciar todos los registros históricos?
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Actualmente hay <strong className="text-rose-700 font-extrabold">{total.toLocaleString('es-CO')} órdenes históricas</strong> almacenadas en el repositorio aislado de Planner / GLPI.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Seguridad del Sistema:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                  <li>La tabla histórica volverá a quedar en cero registros.</li>
                  <li>Podrás volver a cargar el archivo Excel <code>Mantenimientos_Infraestructura_2026.xlsx</code> para probar el flujo de importación cuantas veces desees.</li>
                  <li><strong>Tus solicitudes radicadas en ESAP permanecen 100% intactas</strong> (aislamiento de datos activo).</li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalVaciarAbierto(false)}
                  disabled={vaciando}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleVaciarHistorico}
                  disabled={vaciando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {vaciando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Vaciando base de datos…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sí, Vaciar Todo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
