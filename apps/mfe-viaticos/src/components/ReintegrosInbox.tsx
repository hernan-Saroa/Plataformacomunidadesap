import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { EstadoReintegro, ReintegroComision } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { formatearMoneda } from '../utils/viaticosUtils';
import RegistrarReintegroModal from './RegistrarReintegroModal';

const ORIGEN_LABEL: Record<string, string> = {
  COMISION_NO_REALIZADA: 'Comisión no realizada',
  VIAJE_MENOR: 'Viaje por menos días',
};

const formatearFecha = (valor?: string | null): string => {
  if (!valor) return '—';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : '—';
};

/**
 * RF-PAG-004 — Bandeja de reintegros de comisiones pagadas por avance que no se
 * realizaron o se ejecutaron por menos días (Etapa 8).
 */
export default function ReintegrosInbox() {
  const [reintegros, setReintegros] = useState<ReintegroComision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoReintegro | 'TODOS'>('PENDIENTE');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [reintegroARegistrar, setReintegroARegistrar] = useState<ReintegroComision | null>(null);

  const puedeRegistrar = useMemo(
    () =>
      authService.isSuperAdmin() ||
      authService.hasPermission('travel_expenses:register_reintegro'),
    [],
  );

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setReintegros(await viaticosService.obtenerReintegros());
    } catch (err) {
      console.error('Error al cargar los reintegros:', err);
      setError('No fue posible cargar los reintegros. Intente nuevamente.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const pendientes = useMemo(
    () => reintegros.filter((r) => r.estado === 'PENDIENTE'),
    [reintegros],
  );
  const registrados = useMemo(
    () => reintegros.filter((r) => r.estado === 'REGISTRADO'),
    [reintegros],
  );
  const totalPendiente = useMemo(
    () => pendientes.reduce((acc, r) => acc + (Number(r.valorAReintegrar) || 0), 0),
    [pendientes],
  );

  const reintegrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return reintegros.filter((r) => {
      const cumpleEstado = filtroEstado === 'TODOS' || r.estado === filtroEstado;
      const cumpleBusqueda =
        !termino ||
        (r.consecutivoUnico || '').toLowerCase().includes(termino) ||
        (r.comisionado?.nombre || '').toLowerCase().includes(termino) ||
        (r.comisionado?.numeroDocumento || '').toLowerCase().includes(termino);
      return cumpleEstado && cumpleBusqueda;
    });
  }, [reintegros, filtroEstado, busqueda]);

  const handleExito = (actualizado: ReintegroComision) => {
    setMensajeExito(
      `Reintegro registrado exitosamente para ${actualizado?.consecutivoUnico || 'la comisión'}. Recursos liberados.`,
    );
    setTimeout(() => setMensajeExito(null), 5000);
    cargarDatos();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-700" />
            Reintegros de Comisiones — Etapa 8
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Comisiones pagadas por avance que no se realizaron o se ejecutaron por menos días.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarDatos}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {mensajeExito && (
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {mensajeExito}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div className="bg-white p-4 rounded-xl border border-amber-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
          <h3 className="text-2xl font-black text-amber-700 mt-1">{pendientes.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor por reintegrar</p>
          <h3 className="text-2xl font-black text-amber-700 mt-1">{formatearMoneda(totalPendiente)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registrados</p>
          <h3 className="text-2xl font-black text-emerald-800 mt-1">{registrados.length}</h3>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por consecutivo, comisionado o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <select
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoReintegro | 'TODOS')}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="REGISTRADO">Registrados</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>

      {cargando ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando reintegros...</div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : reintegrosFiltrados.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {filtroEstado === 'PENDIENTE'
              ? 'No hay reintegros pendientes por registrar.'
              : 'No hay reintegros para los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Comisionado</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Días (ejecutados / pagados)</th>
                <th className="px-4 py-3 text-right">Valor pagado</th>
                <th className="px-4 py-3 text-right">Valor a reintegrar</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reintegrosFiltrados.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-800 whitespace-nowrap">{r.consecutivoUnico || '—'}</span>
                    <div className="text-[11px] text-slate-400">
                      {r.destinoCiudad || '—'} · {formatearFecha(r.fechaInicio)} a {formatearFecha(r.fechaFin)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{r.comisionado?.nombre || '—'}</span>
                    <div className="text-[11px] text-slate-400">{r.comisionado?.numeroDocumento || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{ORIGEN_LABEL[r.origen] || r.origen}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.diasEjecutados ?? '—'} / {r.diasComision ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">{formatearMoneda(r.valorPagado)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                    {formatearMoneda(r.valorAReintegrar)}
                  </td>
                  <td className="px-4 py-3">
                    {r.estado === 'REGISTRADO' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Registrado
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatearMoneda(r.valorReintegrado ?? 0)} · {formatearFecha(r.fechaReintegro)}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.estado === 'PENDIENTE' && puedeRegistrar && (
                      <button
                        type="button"
                        onClick={() => setReintegroARegistrar(r)}
                        style={{ backgroundColor: '#047857', color: '#ffffff' }}
                        className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap"
                      >
                        Registrar reintegro
                      </button>
                    )}
                    {r.estado === 'REGISTRADO' && r.soportePath && (
                      <a
                        href={viaticosService.obtenerUrlArchivo(r.soportePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver soporte
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RegistrarReintegroModal
        abierta={Boolean(reintegroARegistrar)}
        reintegro={reintegroARegistrar}
        onCerrar={() => setReintegroARegistrar(null)}
        onExito={handleExito}
      />
    </div>
  );
}
