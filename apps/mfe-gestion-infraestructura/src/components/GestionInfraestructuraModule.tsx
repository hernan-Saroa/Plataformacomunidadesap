import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  Wrench,
  RefreshCw,
  SlidersHorizontal,
  HardHat,
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

export const GestionInfraestructuraModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'espacios' | 'sedes' | 'mantenimiento'>('espacios');
  const [loading, setLoading] = useState<boolean>(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [mantenimientos, setMantenimientos] = useState<SolicitudMantenimiento[]>([]);
  const [stats, setStats] = useState<EstadisticasInfraestructura>({
    total: 0,
    disponibles: 0,
    enMantenimiento: 0,
    reservadas: 0,
    porcentajeOcupacion: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sedesData, espaciosData, mantenimientosData, statsData] = await Promise.all([
        infraestructuraService.getSedes(),
        infraestructuraService.getEspacios(),
        infraestructuraService.getMantenimientos(),
        infraestructuraService.getEstadisticas(),
      ]);
      setSedes(sedesData);
      setEspacios(espaciosData);
      setMantenimientos(mantenimientosData);
      setStats(statsData);
    } catch (err) {
      console.error('Error al cargar datos de infraestructura:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
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
        </div>
      </div>

      {/* Métricas Globales */}
      <MetricasInfraestructura stats={stats} />

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('espacios')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
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
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
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
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
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
        {activeTab === 'mantenimiento' && <SolicitudesMantenimientoView mantenimientos={mantenimientos} />}
      </div>
    </div>
  );
};
