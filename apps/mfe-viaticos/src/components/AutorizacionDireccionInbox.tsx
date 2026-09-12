import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
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
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudAutorizacion } from '../types/viaticos';
import { formatearMoneda } from '../utils/viaticosUtils';
import AutorizacionDireccionModal from './AutorizacionDireccionModal';

export const AutorizacionDireccionInbox: React.FC = () => {
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
      const response = await viaticosService.obtenerBandejaDireccionNacional(
        page,
        20,
        busqueda,
        filtroEstado || undefined,
      );
      setSolicitudes(response.data || []);
      setTotalRegistros(response.total || 0);
      setPaginaActual(response.page || page);
    } catch (err: any) {
      console.error('Error cargando bandeja de Dirección Nacional:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No fue posible cargar las comisiones extemporáneas para la Dirección Nacional.',
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

  // Métricas calculadas en la bandeja
  const pendientesDireccion = solicitudes.filter(
    (s) => s.estadoSolicitud === 'AUTORIZACION_DIRECCION' || s.estadoSolicitud === 'VERIFICADA',
  ).length;
  const autorizadasDireccion = solicitudes.filter(
    (s) => s.decisionDireccion === 'AUTORIZADA' || s.estadoSolicitud === 'EN_AUTORIZACION' || s.estadoSolicitud === 'AUTORIZADA',
  ).length;
  const rechazadasDireccion = solicitudes.filter(
    (s) => s.decisionDireccion === 'RECHAZADA' || s.estadoSolicitud === 'RECHAZADO',
  ).length;
  const montoTotalAcumulado = solicitudes.reduce(
    (acc, curr) => acc + (Number(curr.montoTotal) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Banner Institucional Dirección Nacional */}
      <div
        className="rounded-2xl p-5 sm:p-7 shadow-lg relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(135deg, #2E0854 0%, #581C87 50%, #7E22CE 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-purple-100 border border-white/20">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>ETAPA 6 · RF-AUT-002 · DIRECCIÓN NACIONAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bandeja de Comisiones Extemporáneas
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl font-medium">
              Ruta especial de autorización excepcional para solicitudes de comisión radicadas con menos de 14 días hábiles de anticipación. Tras su aval, continúan hacia la Subdirección de Gestión Corporativa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => cargarSolicitudes(paginaActual)}
            disabled={cargando}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar Bandeja</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Estado Ejecutivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pendientes Dirección
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{pendientesDireccion}</h3>
            <p className="text-xs text-purple-600 font-semibold mt-1">Por evaluar en Etapa 6</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avaladas Excepcionales
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{autorizadasDireccion}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Pasan a Subdirección</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rechazadas
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{rechazadasDireccion}</h3>
            <p className="text-xs text-rose-600 font-semibold mt-1">Extemporaneidad negada</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Presupuesto Extemporáneo
            </p>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              {formatearMoneda(montoTotalAcumulado)}
            </h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1">Total en comisiones</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por radicado, comisionado, cédula o ciudad destino..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold"
          >
            <option value="">Todos los Estados</option>
            <option value="AUTORIZACION_DIRECCION">Pendientes Dirección Nacional</option>
            <option value="EN_AUTORIZACION">Avaladas (En Subdirección)</option>
            <option value="AUTORIZADA">Autorizadas Corporativas</option>
            <option value="RECHAZADO">Rechazadas</option>
          </select>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => cargarSolicitudes(paginaActual)}
            className="text-rose-700 underline font-bold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenedor de Tabla / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <LoaderCircle className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-xs font-medium">Cargando comisiones extemporáneas...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              No hay comisiones extemporáneas pendientes
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Todas las comisiones de servicio radicadas con menos de 14 días hábiles han sido gestionadas o no se registran expedientes en esta etapa.
            </p>
          </div>
        ) : esMovil ? (
          /* Vista Móvil (Cards) */
          <div className="divide-y divide-slate-100 p-3 space-y-3">
            {solicitudes.map((sol) => (
              <div
                key={sol.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                    {sol.consecutivoUnico}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Extemporánea
                  </span>
                </div>

                <div>
                  <p className="text-xs font-black text-slate-900">
                    {sol.comisionado?.nombreCompleto || 'Sin comisionado'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    CC {sol.comisionado?.numeroDocumento || 'N/A'} · {sol.destinoCiudad}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200">
                  <span className="text-purple-700">{formatearMoneda(Number(sol.montoTotal) || 0)}</span>
                  <button
                    type="button"
                    onClick={() => abrirModal(sol)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Revisar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista Desktop (Tabla Corporativa) */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Radicado / Antelación</th>
                  <th className="py-3 px-4">Comisionado</th>
                  <th className="py-3 px-4">Destino y Vigencia</th>
                  <th className="py-3 px-4">Rubro / Tiquetes</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-center">Estado Decisión</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {solicitudes.map((sol) => {
                  const estaPendiente =
                    sol.estadoSolicitud === 'AUTORIZACION_DIRECCION' ||
                    sol.estadoSolicitud === 'VERIFICADA';
                  const esAvalada =
                    sol.decisionDireccion === 'AUTORIZADA' ||
                    sol.estadoSolicitud === 'EN_AUTORIZACION' ||
                    sol.estadoSolicitud === 'AUTORIZADA';
                  const esRechazada =
                    sol.decisionDireccion === 'RECHAZADA' ||
                    sol.estadoSolicitud === 'RECHAZADO';

                  return (
                    <tr
                      key={sol.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 block">
                          {sol.consecutivoUnico}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full mt-1">
                          <ShieldAlert className="w-3 h-3" />
                          &lt; 14 Días Hábiles
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {sol.comisionado?.nombreCompleto || 'Sin nombre'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          CC {sol.comisionado?.numeroDocumento || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">
                          {sol.destinoCiudad}, {sol.destinoDepartamento}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {sol.fechaInicio ? new Date(sol.fechaInicio).toLocaleDateString('es-CO') : ''} al{' '}
                          {sol.fechaFin ? new Date(sol.fechaFin).toLocaleDateString('es-CO') : ''} ({sol.diasComision || 1} d)
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 block">
                          {sol.rubroPresupuestal || 'C-Funcionamiento'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {sol.requiereTiquetes ? 'Requiere Pasajes' : 'Sin tiquetes'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-slate-900 block">
                          {formatearMoneda(Number(sol.montoTotal) || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Viáticos: {formatearMoneda(Number(sol.montoViaticos) || 0)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {estaPendiente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pendiente Dirección
                          </span>
                        )}
                        {esAvalada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Avalada Dirección
                          </span>
                        )}
                        {esRechazada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rechazada
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => abrirModal(sol)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{estaPendiente ? 'Revisar y Decidir' : 'Ver Detalles'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página {paginaActual} de {totalPaginas} ({totalRegistros} registros)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cargarSolicitudes(paginaActual - 1)}
                disabled={paginaActual <= 1 || cargando}
                className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => cargarSolicitudes(paginaActual + 1)}
                disabled={paginaActual >= totalPaginas || cargando}
                className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle y Decisión */}
      <AutorizacionDireccionModal
        solicitud={solicitudSeleccionada}
        isOpen={modalAbierta}
        onClose={() => {
          setModalAbierta(false);
          setSolicitudSeleccionada(null);
        }}
        onSuccess={() => {
          cargarSolicitudes(paginaActual);
        }}
      />
    </div>
  );
};

export default AutorizacionDireccionInbox;
