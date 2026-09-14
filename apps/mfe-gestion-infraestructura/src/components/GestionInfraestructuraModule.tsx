import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Layers,
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  infraestructuraService,
  Sede,
  EspacioFisico,
  SolicitudMantenimiento,
  EstadisticasInfraestructura,
} from '../services/infraestructuraService';
import { MetricasInfraestructura } from './MetricasInfraestructura';
import { GestionSedes } from './GestionSedes';
import { GestionEspacios } from './GestionEspacios';
import { SolicitudesMantenimientoView } from './SolicitudesMantenimiento';
import { NuevaSolicitudForm } from './NuevaSolicitudForm';
import { DetalleSolicitudModal } from './DetalleSolicitudModal';

type TabActiva = 'espacios' | 'sedes' | 'mantenimiento';
type VistaMantenimiento = 'todas' | 'mias';

interface Toast {
  tipo: 'exito' | 'error';
  titulo: string;
  mensaje: string;
}

export const GestionInfraestructuraModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabActiva>('espacios');
  const [loading, setLoading] = useState<boolean>(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [mantenimientos, setMantenimientos] = useState<SolicitudMantenimiento[]>([]);
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudMantenimiento[]>([]);
  const [vistaMantenimiento, setVistaMantenimiento] = useState<VistaMantenimiento>('todas');
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [abrirDetalle, setAbrirDetalle] = useState<boolean>(false);
  const [idSolicitudSeleccionada, setIdSolicitudSeleccionada] = useState<string | null>(null);

  const [stats, setStats] = useState<EstadisticasInfraestructura>({
    total: 0,
    disponibles: 0,
    enMantenimiento: 0,
    reservadas: 0,
    porcentajeOcupacion: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sedesData, espaciosData, mantenimientosData, misSolicitudesData, statsData] =
        await Promise.all([
          infraestructuraService.getSedes(),
          infraestructuraService.getEspacios(),
          infraestructuraService.getMantenimientos(),
          infraestructuraService.getMisSolicitudes(),
          infraestructuraService.getEstadisticas(),
        ]);
      setSedes(sedesData);
      setEspacios(espaciosData);
      setMantenimientos(mantenimientosData);
      setMisSolicitudes(misSolicitudesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error al cargar datos de infraestructura:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const manejarExitoRadicacion = async (nueva: SolicitudMantenimiento) => {
    setMostrarFormulario(false);
    setToast({
      tipo: 'exito',
      titulo: 'Solicitud radicada con éxito',
      mensaje: `Su solicitud ${nueva.consecutivo} quedó en estado RECIBIDA y será analizada por el equipo UMI.`,
    });
    setVistaMantenimiento('mias');
    setActiveTab('mantenimiento');
    await fetchData();
  };

  const manejarGestionar = (idSolicitud: string) => {
    setIdSolicitudSeleccionada(idSolicitud);
    setAbrirDetalle(true);
  };

  const renderToast = () => {
    if (!toast) return null;
    const esExito = toast.tipo === 'exito';
    return (
      <div className="fixed top-4 right-4 z-[60] max-w-sm w-full animate-in slide-in-from-right duration-200">
        <div
          className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${
            esExito
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {esExito ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm">{toast.titulo}</p>
            <p className="text-xs mt-1 opacity-90">{toast.mensaje}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              esExito ? 'hover:bg-emerald-100' : 'hover:bg-rose-100'
            }`}
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 relative">
      {renderToast()}
      {mostrarFormulario && (
        <NuevaSolicitudForm
          onClose={() => setMostrarFormulario(false)}
          onExito={manejarExitoRadicacion}
        />
      )}
      <DetalleSolicitudModal
        open={abrirDetalle}
        idSolicitud={idSolicitudSeleccionada}
        onClose={() => {
          setAbrirDetalle(false);
          setIdSolicitudSeleccionada(null);
        }}
      />

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gestión de Infraestructura
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                ESAP Institucional
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Administración centralizada de sedes, bloques, aulas, laboratorios y órdenes de mantenimiento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/20 transition-all active:scale-95"
          >
            <Wrench className="w-4 h-4" />
            Radicar Solicitud
          </button>
        </div>
      </div>

      {/* Métricas Globales */}
      <MetricasInfraestructura stats={stats} />

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('espacios')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'espacios'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          Espacios y Aulas ({espacios.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sedes')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'sedes'
              ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Sedes Territoriales ({sedes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mantenimiento')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'mantenimiento'
              ? 'border-amber-600 text-amber-600 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Mantenimiento ({mantenimientos.length})
        </button>
      </div>

      {/* Vista de Contenido Activo */}
      <div className="transition-all duration-300">
        {activeTab === 'espacios' && <GestionEspacios espacios={espacios} />}
        {activeTab === 'sedes' && <GestionSedes sedes={sedes} />}
        {activeTab === 'mantenimiento' && (
          <SolicitudesMantenimientoView
            mantenimientos={mantenimientos}
            misSolicitudes={misSolicitudes}
            vista={vistaMantenimiento}
            onChangeVista={setVistaMantenimiento}
            onNuevaSolicitud={() => setMostrarFormulario(true)}
            onGestionar={manejarGestionar}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
};
