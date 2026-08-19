import React, { useEffect, useState } from 'react';
import {
  Plane,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  DollarSign,
  MapPin,
  Calendar,
  User,
  Building,
  Receipt,
  FileCheck,
  Download,
  Eye,
  Send,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import { SolicitudViatico, ResumenEstadisticoViaticos } from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';

type Seccion = 'solicitudes' | 'tiquetes' | 'legalizaciones' | 'resoluciones';

export default function ViaticosModulePremium() {
  const [seccion, setSeccion] = useState<Seccion>('solicitudes');
  const [solicitudes, setSolicitudes] = useState<SolicitudViatico[]>([]);
  const [resumen, setResumen] = useState<ResumenEstadisticoViaticos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [modalNuevaAbierta, setModalNuevaAbierta] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudViatico | null>(null);

  // Formulario nueva solicitud
  const [pasoForm, setPasoForm] = useState(1);
  const [formDatos, setFormDatos] = useState({
    nombreComisionado: '',
    cedulaComisionado: '',
    cargoComisionado: '',
    dependencia: 'Subdirección Académica',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: '',
    departamentoDestino: '',
    fechaInicio: '',
    fechaFin: '',
    diasComision: 2,
    tipoComision: 'SERVICIOS_INSTITUCIONALES',
    medioTransporte: 'AEREO',
    justificacion: '',
    montoSolicitadoViaticos: 560000,
    montoSolicitadoGastosViaje: 120000,
    requiereTiqueteAereo: true,
  });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [list, res] = await Promise.all([
        viaticosService.obtenerSolicitudes(),
        viaticosService.obtenerResumenEstadistico(),
      ]);
      setSolicitudes(list);
      setResumen(res);
    } catch (e) {
      console.error('Error cargando viáticos:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const grupos: MenuGroup[] = [
    {
      title: 'GESTIÓN PRINCIPAL',
      items: [
        {
          id: 'solicitudes',
          label: 'Solicitudes y Comisiones',
          subtitle: 'Comisiones de servicios oficiales',
          icon: <Plane className="w-5 h-5" />,
          color: '#003DA5',
          badge: solicitudes.length,
        },
        {
          id: 'tiquetes',
          label: 'Pasajes y Alojamiento',
          subtitle: 'Reservas aéreas y terrestres',
          icon: <CreditCard className="w-5 h-5" />,
          color: '#059669',
        },
        {
          id: 'legalizaciones',
          label: 'Legalización de Gastos',
          subtitle: 'Carga de facturas y cumplidos',
          icon: <Receipt className="w-5 h-5" />,
          color: '#D97706',
        },
        {
          id: 'resoluciones',
          label: 'Resoluciones Institucionales',
          subtitle: 'Actos administrativos de comisión',
          icon: <FileCheck className="w-5 h-5" />,
          color: '#7C3AED',
        },
      ],
    },
  ];

  const handleCrearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await viaticosService.crearSolicitud({
        ...formDatos,
        tipoComision: formDatos.tipoComision as any,
        medioTransporte: formDatos.medioTransporte as any,
      });
      setModalNuevaAbierta(false);
      setPasoForm(1);
      cargarDatos();
    } catch (error) {
      console.error('Error guardando solicitud:', error);
    }
  };

  const solicitudesFiltradas = solicitudes.filter((sol) => {
    const cumpleBusqueda =
      sol.nombreComisionado.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.ciudadDestino.toLowerCase().includes(busqueda.toLowerCase()) ||
      sol.dependencia.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleEstado = filtroEstado === 'TODOS' || sol.estado === filtroEstado;
    return cumpleBusqueda && cumpleEstado;
  });

  const getBadgeEstado = (estado: string) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      BORRADOR: { label: 'Borrador', bg: 'bg-gray-100', text: 'text-gray-700' },
      SOLICITADO: { label: 'Solicitado', bg: 'bg-blue-100', text: 'text-blue-800' },
      APROBADO_JEFE: { label: 'Aprobado Jefe', bg: 'bg-indigo-100', text: 'text-indigo-800' },
      APROBADO_TALENTO_HUMANO: { label: 'Aprobado TH', bg: 'bg-purple-100', text: 'text-purple-800' },
      RESOLUCION_EMITIDA: { label: 'Resolución Emitida', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      TIQUETES_COMPRADOS: { label: 'Tiquetes Emitidos', bg: 'bg-cyan-100', text: 'text-cyan-800' },
      EN_COMISION: { label: 'En Comisión', bg: 'bg-amber-100', text: 'text-amber-800' },
      PENDIENTE_LEGALIZACION: { label: 'Por Legalizar', bg: 'bg-orange-100', text: 'text-orange-800' },
      LEGALIZADO: { label: 'Legalizado', bg: 'bg-green-100', text: 'text-green-800' },
      RECHAZADO: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
    };
    const c = config[estado] || { label: estado, bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <ModuleLayout
      moduleName="VIÁTICOS Y GASTOS DE VIAJE"
      moduleDescription="Gestión de Comisiones de Servicios y Tiquetes Institucionales · ESAP"
      moduleIcon={<Plane className="w-6 h-6" />}
      moduleColor="#003DA5"
      groups={grupos}
      activeSection={seccion}
      onSectionChange={(s) => setSeccion(s as Seccion)}
    >
      {/* ── KPI HEADER ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Solicitudes</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.totalSolicitudes || 0}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">Registradas en vigencia</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center font-bold">
            <Plane className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Aprobación</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.enProcesoAprobacion || 0}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Pendientes por VoBo</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Comisión</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{resumen?.enComisionActivas || 0}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Funcionarios en territorio</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Total Estimado</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              ${(resumen?.montoTotalEjecutado || 0).toLocaleString('es-CO')}
            </h3>
            <p className="text-xs text-purple-600 font-medium mt-1">Viáticos + Gastos de viaje</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {seccion === 'solicitudes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#003DA5]" />
                Solicitudes de Comisión y Viáticos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proceso de aprobación, emisión de tiquetes y resoluciones para comisiones institucionales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormDatos({
                  nombreComisionado: '',
                  cedulaComisionado: '',
                  cargoComisionado: '',
                  dependencia: 'Subdirección Académica',
                  sedeOrigen: 'Sede Central Bogotá',
                  ciudadDestino: '',
                  departamentoDestino: '',
                  fechaInicio: '',
                  fechaFin: '',
                  diasComision: 2,
                  tipoComision: 'SERVICIOS_INSTITUCIONALES',
                  medioTransporte: 'AEREO',
                  justificacion: '',
                  montoSolicitadoViaticos: 560000,
                  montoSolicitadoGastosViaje: 120000,
                  requiereTiqueteAereo: true,
                });
                setPasoForm(1);
                setModalNuevaAbierta(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud de Comisión
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 my-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por funcionario, código, ciudad o dependencia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="APROBADO_TALENTO_HUMANO">Aprobado TH</option>
                <option value="RESOLUCION_EMITIDA">Resolución Emitida</option>
                <option value="EN_COMISION">En Comisión</option>
                <option value="LEGALIZADO">Legalizado</option>
              </select>
            </div>
          </div>

          {/* Tabla de solicitudes */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Código / Solicitante</th>
                  <th className="px-4 py-3">Destino / Fechas</th>
                  <th className="px-4 py-3">Tipo & Transporte</th>
                  <th className="px-4 py-3">Monto Estimado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No se encontraron solicitudes de viáticos registradas.
                    </td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map((sol) => (
                    <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-blue-700">{sol.codigo}</span>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">{sol.nombreComisionado}</div>
                        <div className="text-[11px] text-slate-400">{sol.cargoComisionado} · {sol.dependencia}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          {sol.ciudadDestino} ({sol.departamentoDestino})
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {sol.fechaInicio} al {sol.fechaFin} ({sol.diasComision} días)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {sol.tipoComision.replace(/_/g, ' ')}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Plane className="w-3 h-3 text-blue-500" />
                          {sol.medioTransporte}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 text-sm">
                          ${sol.montoTotalEstimado.toLocaleString('es-CO')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Viáticos: ${sol.montoSolicitadoViaticos.toLocaleString('es-CO')}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getBadgeEstado(sol.estado)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSolicitudSeleccionada(sol)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'tiquetes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Reserva y Emisión de Pasajes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestión de itinerarios, pasajes aéreos y terrestres para funcionarios en comisión de servicios.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
              Convenio Marco Satena / Avianca / Clic
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700">TKT-2026-9481</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">EMITIDO</span>
              </div>
              <h4 className="font-bold text-slate-800 mt-2">Bogotá (BOG) ➔ Medellín (MDE)</h4>
              <p className="text-xs text-slate-500">Pasajero: Carlos Eduardo Ramírez (Docente Ocasional)</p>
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                <div>✈️ Avianca AV9320 · Salida: 2026-08-20 06:30 AM</div>
                <div>✈️ Avianca AV9325 · Regreso: 2026-08-23 07:15 PM</div>
                <div className="font-bold text-slate-800">Localizador: ESAP942A</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700">TKT-2026-9482</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[11px] font-bold">RESERVADO</span>
              </div>
              <h4 className="font-bold text-slate-800 mt-2">Bogotá (BOG) ➔ Cali (CLO)</h4>
              <p className="text-xs text-slate-500">Pasajero: Ana María Gómez (Asesora Planeación)</p>
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                <div>✈️ Clic Air CL4021 · Salida: 2026-08-25 08:00 AM</div>
                <div>✈️ Clic Air CL4028 · Regreso: 2026-08-27 06:00 PM</div>
                <div className="font-bold text-slate-800">Localizador: ESAP883B</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {seccion === 'legalizaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Legalización y Cumplido de Comisión
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Revisión de facturas, cumplidos firmados y cálculo de reintegros o devoluciones.
              </p>
            </div>
          </div>
          <div className="p-8 text-center text-slate-400 text-xs">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            Cargue de soportes de legalización activo para comisiones finalizadas.
          </div>
        </div>
      )}

      {seccion === 'resoluciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Resoluciones Institucionales de Comisión
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Actos administrativos oficializados por la Subdirección de Gestión Institucional.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Resolución N° RES-0452-2026</h4>
                  <p className="text-xs text-slate-500">Por la cual se autoriza comisión de servicios a Medellín - Carlos Ramírez</p>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA SOLICITUD DE COMISIÓN ── */}
      {modalNuevaAbierta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#003DA5] rounded-xl">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Nueva Solicitud de Comisión de Servicios</h3>
                  <p className="text-xs text-slate-400">Paso {pasoForm} de 3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevaAbierta(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearSolicitud} className="space-y-4">
              {pasoForm === 1 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                    1. Datos del Funcionario Comisionado
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. María Fernanda López"
                        value={formDatos.nombreComisionado}
                        onChange={(e) => setFormDatos({ ...formDatos, nombreComisionado: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cédula de Ciudadanía *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 1019283746"
                        value={formDatos.cedulaComisionado}
                        onChange={(e) => setFormDatos({ ...formDatos, cedulaComisionado: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cargo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Profesional Especializado"
                        value={formDatos.cargoComisionado}
                        onChange={(e) => setFormDatos({ ...formDatos, cargoComisionado: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Dependencia *</label>
                      <input
                        type="text"
                        required
                        value={formDatos.dependencia}
                        onChange={(e) => setFormDatos({ ...formDatos, dependencia: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setPasoForm(2)}
                      className="px-4 py-2 bg-[#003DA5] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {pasoForm === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                    2. Destino y Fechas de Comisión
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad Destino *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cartagena"
                        value={formDatos.ciudadDestino}
                        onChange={(e) => setFormDatos({ ...formDatos, ciudadDestino: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Departamento *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Bolívar"
                        value={formDatos.departamentoDestino}
                        onChange={(e) => setFormDatos({ ...formDatos, departamentoDestino: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Fecha Inicio *</label>
                      <input
                        type="date"
                        required
                        value={formDatos.fechaInicio}
                        onChange={(e) => setFormDatos({ ...formDatos, fechaInicio: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Fecha Fin *</label>
                      <input
                        type="date"
                        required
                        value={formDatos.fechaFin}
                        onChange={(e) => setFormDatos({ ...formDatos, fechaFin: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setPasoForm(1)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasoForm(3)}
                      className="px-4 py-2 bg-[#003DA5] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {pasoForm === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700">
                    3. Justificación y Estimación de Gastos
                  </h4>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Objeto / Justificación *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describa el objetivo institucional de la comisión..."
                      value={formDatos.justificacion}
                      onChange={(e) => setFormDatos({ ...formDatos, justificacion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Medio de Transporte</label>
                      <select
                        value={formDatos.medioTransporte}
                        onChange={(e) => setFormDatos({ ...formDatos, medioTransporte: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="AEREO">Aéreo</option>
                        <option value="TERRESTRE">Terrestre</option>
                        <option value="VEHICULO_INSTITUCIONAL">Vehículo Institucional</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Valor Estimado Viáticos ($)</label>
                      <input
                        type="number"
                        value={formDatos.montoSolicitadoViaticos}
                        onChange={(e) => setFormDatos({ ...formDatos, montoSolicitadoViaticos: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setPasoForm(2)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#003DA5] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Radicar Solicitud
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE DE SOLICITUD ── */}
      {solicitudSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700">{solicitudSeleccionada.codigo}</span>
                <h3 className="text-base font-black text-slate-900">{solicitudSeleccionada.nombreComisionado}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSolicitudSeleccionada(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold">Cargo:</span>
                <span className="font-semibold text-slate-800">{solicitudSeleccionada.cargoComisionado}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold">Dependencia:</span>
                <span className="font-semibold text-slate-800">{solicitudSeleccionada.dependencia}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold">Destino:</span>
                <span className="font-semibold text-slate-800">
                  {solicitudSeleccionada.ciudadDestino} ({solicitudSeleccionada.departamentoDestino})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold">Fechas:</span>
                <span className="font-semibold text-slate-800">
                  {solicitudSeleccionada.fechaInicio} al {solicitudSeleccionada.fechaFin}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-bold block mb-1">Justificación:</span>
                <p className="bg-slate-50 p-2.5 rounded-xl text-slate-700 leading-relaxed">
                  {solicitudSeleccionada.justificacion}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSolicitudSeleccionada(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
