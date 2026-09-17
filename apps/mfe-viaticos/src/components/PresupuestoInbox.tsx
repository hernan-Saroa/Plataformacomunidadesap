import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertCircle,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SolicitudViatico } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import RegistrarRPModal from './RegistrarRPModal';
import CargaMasivaRPModal from './CargaMasivaRPModal';

export default function PresupuestoInbox() {
  const [solicitudes, setSolicitudes] = useState<SolicitudViatico[]>([]);
  const [kpis, setKpis] = useState({
    pendientesRp: 0,
    comprometidas: 0,
    totalComprometido: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'AUTORIZADA' | 'COMPROMETIDA' | 'TODOS'>('AUTORIZADA');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modales
  const [solicitudParaRp, setSolicitudParaRp] = useState<SolicitudViatico | null>(null);
  const [modalRpAbierto, setModalRpAbierto] = useState(false);
  const [modalCargaMasivaAbierto, setModalCargaMasivaAbierto] = useState(false);

  const puedeExpedirRp = useMemo(() => authService.canExpedirRp(), []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await viaticosService.obtenerBandejaPresupuesto({
        estado: filtroEstado,
        search: busqueda.trim() || undefined,
      });

      const itemsMapeados = (resp?.data || []).map((s: any) =>
        viaticosService.mapearSolicitudLista(s),
      );
      setSolicitudes(itemsMapeados);

      if (resp?.kpis) {
        setKpis(resp.kpis);
      }
    } catch (err) {
      console.error('Error al cargar bandeja de presupuesto:', err);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, busqueda]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirModalExpedirRp = (sol: SolicitudViatico) => {
    setSolicitudParaRp(sol);
    setModalRpAbierto(true);
  };

  const handleExitoRp = (solActualizada: any) => {
    setMensajeExito(`Registro Presupuestal expedido exitosamente para ${solActualizada.consecutivoUnico || 'la comisión'}. Recursos comprometidos.`);
    setTimeout(() => setMensajeExito(null), 5000);
    cargarDatos();
  };

  const handleExitoCargaMasiva = () => {
    setMensajeExito('Carga masiva procesada exitosamente. Comisiones actualizadas a estado COMPROMETIDA.');
    setTimeout(() => setMensajeExito(null), 5000);
    cargarDatos();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Etapa 7 · RF-PRE-001
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">SIIF Nación</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center space-x-2">
            <span>Bandeja del Grupo de Presupuesto</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Recepción de comisiones autorizadas y expedición de Registro Presupuestal (RP) bajo la nomenclatura <code>Fecha_RP_Número</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => cargarDatos()}
            disabled={cargando}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>

          {puedeExpedirRp && (
            <button
              type="button"
              onClick={() => setModalCargaMasivaAbierto(true)}
              style={{ backgroundColor: '#047857', color: '#ffffff' }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-white" />
              <span className="text-white">Carga Masiva de RPs</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Éxito */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPIs de la Etapa 7 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Pendientes de RP */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pendientes de RP
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {cargando ? '—' : kpis.pendientesRp}
              </h3>
              <p className="text-[11px] text-teal-700 mt-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 inline" />
                <span>En bandeja de Presupuesto</span>
              </p>
            </div>
            <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100">
              <Receipt className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        {/* KPI 2: Comprometidas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Comprometidas (RP Expedido)
              </p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">
                {cargando ? '—' : kpis.comprometidas}
              </h3>
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 inline" />
                <span>Recursos comprometidos en firme</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <FileCheck2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* KPI 3: Monto Total Comprometido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Comprometido en SIIF
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {cargando ? '—' : `$${Number(kpis.totalComprometido || 0).toLocaleString('es-CO')}`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500 inline" />
                <span>Vigencia institucional activa</span>
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <DollarSign className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Pestañas de Estado */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl space-x-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFiltroEstado('AUTORIZADA')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filtroEstado === 'AUTORIZADA'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Autorizadas / Pendientes RP ({kpis.pendientesRp})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('COMPROMETIDA')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filtroEstado === 'COMPROMETIDA'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Comprometidas ({kpis.comprometidas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filtroEstado === 'TODOS'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar radicado, comisionado, cédula, RP..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Tabla de Comisiones en Presupuesto */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Cargando bandeja de Presupuesto...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No hay comisiones en este criterio</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cuando los analistas remitan paquetes de comisiones autorizadas, aparecerán aquí para expedir su Registro Presupuestal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Consecutivo</th>
                  <th className="px-4 py-3.5">Comisionado</th>
                  <th className="px-4 py-3.5">Dependencia</th>
                  <th className="px-4 py-3.5">Valor Total a Liquidar</th>
                  <th className="px-4 py-3.5">Rubro</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Registro Presupuestal (RP)</th>
                  <th className="px-4 py-3.5">Modalidad de Pago</th>
                  <th className="px-4 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {solicitudes.map((sol) => {
                  const estaComprometida = sol.estado === 'COMPROMETIDA';
                  const valorMostrar =
                    sol.valorComprometido != null && Number(sol.valorComprometido) > 0
                      ? Number(sol.valorComprometido)
                      : Number(sol.montoTotal || sol.montoTotalEstimado || ((Number(sol.montoSolicitadoViaticos) || 0) + (Number(sol.montoSolicitadoGastosViaje) || 0)) || 0);

                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Consecutivo */}
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-700" />
                          <span>{sol.codigo}</span>
                        </div>
                      </td>

                      {/* Comisionado */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{sol.nombreComisionado}</div>
                        <div className="text-[11px] text-slate-500">C.C. {sol.cedulaComisionado}</div>
                      </td>

                      {/* Dependencia */}
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium">
                          {sol.dependencia || (sol as any).centroCostos || 'Subdirección de Gestión Corporativa'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {sol.ciudadDestino}
                        </div>
                      </td>

                      {/* Valor Total a Liquidar */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        ${valorMostrar.toLocaleString('es-CO')}
                      </td>

                      {/* Rubro */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-600 max-w-[150px] truncate" title={sol.rubroRp || (sol as any).rubroPresupuestal || ''}>
                          <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{sol.rubroRp || (sol as any).rubroPresupuestal || 'C-2101-01'}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        {estaComprometida ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
                            <span>COMPROMETIDA</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center space-x-1 w-fit">
                            <Clock className="w-3 h-3 text-teal-600" />
                            <span>EN PRESUPUESTO</span>
                          </span>
                        )}
                      </td>

                      {/* Información de RP */}
                      <td className="px-4 py-3">
                        {sol.codigoRp || sol.numeroRp ? (
                          <div className="font-mono text-[11px]">
                            <div className="font-bold text-indigo-900">{sol.codigoRp || `RP: ${sol.numeroRp}`}</div>
                            {sol.fechaExpedicionRp && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(sol.fechaExpedicionRp).toLocaleDateString('es-CO')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pendiente de expedición</span>
                        )}
                      </td>

                      {/* Modalidad de Pago (RF-PRE-003) */}
                      <td className="px-4 py-3">
                        {sol.modalidadPago === 'AVANCE' ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>AVANCE</span>
                            </span>
                            {sol.diasHabilesPrevios != null && (
                              <div className="text-[10px] text-emerald-700 font-medium pl-1">
                                {sol.diasHabilesPrevios} días hábiles disponibles
                              </div>
                            )}
                          </div>
                        ) : sol.modalidadPago === 'RECONOCIMIENTO_POSTERIOR' ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              <span>RECONOCIMIENTO POSTERIOR</span>
                            </span>
                            {sol.diasHabilesPrevios != null && (
                              <div className="text-[10px] text-amber-700 font-medium pl-1">
                                {sol.diasHabilesPrevios} {sol.diasHabilesPrevios === 1 ? 'día hábil previo' : 'días hábiles previos'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Por determinar al expedir</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        {!estaComprometida && puedeExpedirRp ? (
                          <button
                            type="button"
                            onClick={() => abrirModalExpedirRp(sol)}
                            style={{ backgroundColor: '#003DA5', color: '#ffffff' }}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:opacity-90 active:scale-95 flex items-center space-x-1.5 ml-auto cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-white" />
                            <span className="text-white">Registrar RP</span>
                          </button>
                        ) : estaComprometida ? (
                          <span className="text-[11px] text-indigo-700 font-semibold flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Comprometida</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <RegistrarRPModal
        solicitud={solicitudParaRp}
        abierto={modalRpAbierto}
        onCerrar={() => setModalRpAbierto(false)}
        onExito={handleExitoRp}
      />

      <CargaMasivaRPModal
        abierto={modalCargaMasivaAbierto}
        onCerrar={() => setModalCargaMasivaAbierto(false)}
        onExito={handleExitoCargaMasiva}
      />
    </div>
  );
}
