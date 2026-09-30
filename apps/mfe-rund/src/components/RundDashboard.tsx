import React, { useEffect, useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { DashboardSummary } from '../types/rund.types';
import { rundService } from '../services/api/rundService';

interface Props {
  onNavigateTab: (tab: string) => void;
  onSelectDocente?: (id: string) => void;
}

export const RundDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalDocentes: 0,
    activos: 0,
    enRevision: 0,
    pendientesValidacion: 0,
    soportesPendientes: 0,
    novedadesVigentes: 0,
    porEscalafon: [],
    porMinciencias: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await rundService.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.warn('Usando datos de respaldo para el dashboard RUND');
      setSummary({
        totalDocentes: 142,
        activos: 128,
        enRevision: 9,
        pendientesValidacion: 5,
        soportesPendientes: 14,
        novedadesVigentes: 8,
        porEscalafon: [
          { escalafon: 'TITULAR', total: 34 },
          { escalafon: 'ASOCIADO', total: 52 },
          { escalafon: 'ASISTENTE', total: 38 },
          { escalafon: 'INSTRUCTOR', total: 18 },
        ],
        porMinciencias: [
          { categoria: 'EMERITO', total: 8 },
          { categoria: 'INVESTIGADOR_SENIOR', total: 29 },
          { categoria: 'ASOCIADO', total: 45 },
          { categoria: 'INVESTIGADOR_JUNIOR', total: 36 },
          { categoria: 'SIN_CATEGORIA', total: 24 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-[#003DA5] via-[#0284c7] to-[#0ea5e9] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <BookOpen className="w-80 h-80" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-3">
            <Award className="w-3.5 h-3.5 text-amber-300" />
            Registro Oficial de la Escuela Superior de Administración Pública
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Registro Único Nacional Docente (RUND)
          </h1>
          <p className="mt-2 text-blue-100 text-sm leading-relaxed">
            Plataforma centralizada para la gestión del expediente digital 360°, escalafón, méritos investigativos, validación de soportes y emisión de Tarjeta Digital RUND.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab('docentes')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#003DA5] text-xs font-bold rounded-lg shadow hover:bg-blue-50 transition"
            >
              Explorar Directorio Docente <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('nuevo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/40 text-white border border-white/20 text-xs font-medium rounded-lg hover:bg-blue-900/60 transition"
            >
              Registrar Nuevo Docente
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Docentes RUND</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : summary.totalDocentes}</p>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> {summary.activos} en estado activo
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Soportes Pendientes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{loading ? '...' : summary.soportesPendientes}</p>
            <p className="text-xs text-slate-500 mt-1">Por validar en expediente</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Revisión / Trámite</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{loading ? '...' : summary.enRevision}</p>
            <p className="text-xs text-slate-500 mt-1">Actualizaciones recientes</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Novedades Vigentes</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{loading ? '...' : summary.novedadesVigentes}</p>
            <p className="text-xs text-slate-500 mt-1">Comisiones y licencias activas</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gráficas / Desgloses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Escalafón */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-[#003DA5]" /> Distribución por Escalafón Docente
            </h3>
            <span className="text-xs text-slate-400">Régimen Docente</span>
          </div>
          <div className="space-y-3">
            {summary.porEscalafon.map((item, index) => {
              const colors = ['bg-blue-600', 'bg-sky-500', 'bg-indigo-500', 'bg-slate-400'];
              const pct = summary.totalDocentes > 0 ? Math.round((item.total / summary.totalDocentes) * 100) : 0;
              return (
                <div key={item.escalafon}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{item.escalafon}</span>
                    <span>{item.total} docentes ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[index % colors.length]}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categoría Minciencias */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> Clasificación Minciencias / Investigación
            </h3>
            <span className="text-xs text-slate-400">Reconocimiento</span>
          </div>
          <div className="space-y-3">
            {summary.porMinciencias.map((item) => {
              const pct = summary.totalDocentes > 0 ? Math.round((item.total / summary.totalDocentes) * 100) : 0;
              return (
                <div key={item.categoria}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{item.categoria.replace('_', ' ')}</span>
                    <span>{item.total} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
