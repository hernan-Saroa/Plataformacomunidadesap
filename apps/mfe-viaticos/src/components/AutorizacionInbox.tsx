import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck,
  Filter,
  LoaderCircle,
  MapPin,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudAutorizacion } from '../types/viaticos';
import { formatearMoneda } from '../utils/viaticosUtils';
import AutorizacionGastoModal from './AutorizacionGastoModal';

export const AutorizacionInbox: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudAutorizacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudAutorizacion | null>(null);
  const [modalAbierta, setModalAbierta] = useState<boolean>(false);
  const [ancho, setAncho] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  useEffect(() => {
    const handleResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const esMovil = ancho < 768;

  const cargarSolicitudes = async (page: number = 1) => {
    setCargando(true);
    setError(null);
    try {
      const response = await viaticosService.obtenerBandejaAutorizacion(
        page,
        20,
        busqueda,
        filtroEstado || undefined,
      );
      setSolicitudes(response.data || []);
      setTotalRegistros(response.total || 0);
      setPaginaActual(response.page || page);
    } catch (err: any) {
      console.error('Error cargando bandeja de autorización:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No fue posible cargar las comisiones para autorización corporativa.',
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes(1);
  }, [busqueda, filtroEstado]);

  const abrirModal = (sol: SolicitudAutorizacion) => {
    setSolicitudSeleccionada(sol);
    setModalAbierta(true);
  };

  const totalPaginas = Math.ceil(totalRegistros / 20) || 1;

  // Métricas calculadas para la bandeja
  const pendientesAutorizacion = solicitudes.filter((s) => s.estadoSolicitud === 'EN_AUTORIZACION').length;
  const autorizadas = solicitudes.filter((s) => s.estadoSolicitud === 'AUTORIZADA').length;
  const montoTotalAcumulado = solicitudes.reduce((acc, curr) => acc + (Number(curr.montoTotal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner Institucional con Estilo Garantizado (Protegido contra fallos de clases Tailwind dinámicas) */}
      <div
        className="rounded-2xl p-5 sm:p-7 shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #002266 0%, #003DA5 55%, #155DFC 100%)',
          color: '#ffffff',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-blue-100 border border-white/20">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-200" />
              <span>Autorización Corporativa</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Bandeja de Autorizaciones
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-3xl leading-relaxed">
              Visto bueno institucional de gasto e itinerario para comisiones de servicio oficiales.
              Al aprobar una comisión en estado <strong>EN AUTORIZACIÓN</strong>, avanza a <strong>AUTORIZADA</strong>,
              se notifica al responsable de tiquetes y se envía automáticamente el PDF del itinerario al comisionado y enlace.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => cargarSolicitudes(paginaActual)}
              disabled={cargando}
              className="inline-flex items-center space-x-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 px-4 py-2.5 text-xs font-bold text-white transition-all border border-white/25 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-white ${cargando ? 'animate-spin' : ''}`} />
              <span>Actualizar Bandeja</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards — Resumen Ejecutivo de la Subdirección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pendientes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              En Autorización (Pendientes)
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {cargando ? '—' : pendientesAutorizacion}
            </h3>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              Requieren visto bueno corporativo
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Autorizadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Autorizadas (VoBo Vigente)
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {cargando ? '—' : autorizadas}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Habilitadas para presupuesto / tiquetes
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Total Comisiones */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total en Bandeja
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {cargando ? '—' : totalRegistros}
            </h3>
            <p className="text-[11px] text-[#003DA5] font-semibold mt-0.5">
              Expedientes registrados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#003DA5] flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Monto Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Monto Total en Gestión
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">
              {cargando ? '—' : formatearMoneda(montoTotalAcumulado)}
            </h3>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
              Viáticos + Gastos de viaje
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda Responsiva */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por radicado, pasajero, cédula o destino..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        {/* Filtros de Estado con botones claros y de alto contraste */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroEstado('')}
            style={
              filtroEstado === ''
                ? { backgroundColor: '#003DA5', color: '#ffffff', borderColor: '#003DA5' }
                : { backgroundColor: '#F8FAFC', color: '#334155', borderColor: '#E2E8F0' }
            }
            className="px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-xs cursor-pointer"
          >
            Todas ({totalRegistros})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('EN_AUTORIZACION')}
            style={
              filtroEstado === 'EN_AUTORIZACION'
                ? { backgroundColor: '#D97706', color: '#ffffff', borderColor: '#D97706' }
                : { backgroundColor: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' }
            }
            className="px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En Autorización</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('AUTORIZADA')}
            style={
              filtroEstado === 'AUTORIZADA'
                ? { backgroundColor: '#059669', color: '#ffffff', borderColor: '#059669' }
                : { backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }
            }
            className="px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Autorizadas</span>
          </button>
        </div>
      </div>

      {/* Estado de Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-900 flex items-center space-x-3 text-xs sm:text-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Contenedor Principal: Tabla en Desktop y Card View en Móvil */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {cargando ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#003DA5]" />
            <p className="text-xs font-semibold text-slate-600">Cargando comisiones de la Subdirección...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-bold text-slate-800">No hay comisiones pendientes de autorización</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">
              Todas las solicitudes en etapa 6 han sido tramitadas o no coinciden con los filtros seleccionados.
            </p>
          </div>
        ) : (
          esMovil ? (
            /* 1. Vista de Tarjetas para Móviles (< 768px) */
            <div className="divide-y divide-slate-100">
              {solicitudes.map((sol) => {
                const estaAutorizada = sol.estadoSolicitud === 'AUTORIZADA';
                return (
                  <div
                    key={sol.id}
                    onClick={() => abrirModal(sol)}
                    className="p-4 space-y-3 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {/* Fila 1: Consecutivo y Estado */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#003DA5] tracking-tight">
                        {sol.consecutivoUnico}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          estaAutorizada
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {estaAutorizada ? 'AUTORIZADA' : 'EN AUTORIZACIÓN'}
                      </span>
                    </div>

                    {/* Fila 2: Pasajero */}
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {sol.comisionado?.nombreCompleto || 'Sin nombre asignado'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          C.C. {sol.comisionado?.numeroDocumento || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Fila 3: Destino y Fechas */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-semibold block">Destino</span>
                        <div className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sol.destinoCiudad}, {sol.destinoDepartamento}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Fechas</span>
                        <div className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sol.diasComision} día(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Fila 4: Transporte y Monto */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {sol.requiereTiquetes ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <Plane className="h-3 w-3" />
                            <span>Aéreo / Tiquete</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            <span>Terrestre</span>
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Gasto</span>
                        <span className="text-sm font-black text-slate-900">
                          {formatearMoneda(sol.montoTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Botón táctil */}
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => abrirModal(sol)}
                        style={
                          estaAutorizada
                            ? { backgroundColor: '#F1F5F9', color: '#334155' }
                            : { backgroundColor: '#003DA5', color: '#ffffff' }
                        }
                        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {estaAutorizada ? (
                          <>
                            <Eye className="h-4 w-4" />
                            <span>Ver Itinerario y Trazabilidad</span>
                          </>
                        ) : (
                          <>
                            <FileCheck className="h-4 w-4 text-white" />
                            <span>Revisar y Autorizar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 2. Vista de Tabla para Pantallas Medianas y Grandes (>= 768px) */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Consecutivo</th>
                    <th className="py-3.5 px-4">Comisionado / Pasajero</th>
                    <th className="py-3.5 px-4">Destino e Itinerario</th>
                    <th className="py-3.5 px-4">Transporte</th>
                    <th className="py-3.5 px-4 text-right">Total Gasto</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {solicitudes.map((sol) => {
                    const estaAutorizada = sol.estadoSolicitud === 'AUTORIZADA';
                    return (
                      <tr
                        key={sol.id}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                        onClick={() => abrirModal(sol)}
                      >
                        {/* Consecutivo */}
                        <td className="py-3.5 px-4 font-black text-[#003DA5]">
                          {sol.consecutivoUnico}
                        </td>

                        {/* Pasajero */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-[#003DA5] transition-colors">
                            {sol.comisionado?.nombreCompleto || 'Sin nombre asignado'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            C.C. {sol.comisionado?.numeroDocumento || 'N/A'}
                          </div>
                        </td>

                        {/* Destino e Itinerario */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{sol.destinoCiudad}, {sol.destinoDepartamento}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>
                              {new Date(sol.fechaInicio).toLocaleDateString()} al{' '}
                              {new Date(sol.fechaFin).toLocaleDateString()} ({sol.diasComision}d)
                            </span>
                          </div>
                        </td>

                        {/* Transporte */}
                        <td className="py-3.5 px-4">
                          {sol.requiereTiquetes ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Plane className="h-3.5 w-3.5" />
                              <span>Aéreo / Tiquete</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                              <span>Terrestre</span>
                            </span>
                          )}
                        </td>

                        {/* Monto Total */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          {formatearMoneda(sol.montoTotal)}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                              estaAutorizada
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {estaAutorizada ? 'AUTORIZADA' : 'EN AUTORIZACIÓN'}
                          </span>
                        </td>

                        {/* Botón de acción */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => abrirModal(sol)}
                            style={
                              estaAutorizada
                                ? { backgroundColor: '#F1F5F9', color: '#334155' }
                                : { backgroundColor: '#003DA5', color: '#ffffff' }
                            }
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
                          >
                            {estaAutorizada ? (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                <span>Ver Itinerario</span>
                              </>
                            ) : (
                              <>
                                <FileCheck className="h-3.5 w-3.5 text-white" />
                                <span>Revisar y Autorizar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Paginación Responsiva */}
        {!cargando && solicitudes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 gap-3">
            <span className="text-center sm:text-left font-medium">
              Mostrando {solicitudes.length} de {totalRegistros} comisiones registradas
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => cargarSolicitudes(paginaActual - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                Anterior
              </button>
              <span className="font-bold text-slate-800 px-2">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => cargarSolicitudes(paginaActual + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Autorización */}
      <AutorizacionGastoModal
        solicitud={solicitudSeleccionada}
        isOpen={modalAbierta}
        onClose={() => setModalAbierta(false)}
        onSuccess={() => cargarSolicitudes(paginaActual)}
      />
    </div>
  );
};

export default AutorizacionInbox;
