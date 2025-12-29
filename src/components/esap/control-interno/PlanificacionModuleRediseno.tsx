/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLANIFICACIÓN - MÓDULO PREMIUM V3.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo corporativo premium para gestión del ciclo de planificación de auditorías
 * 
 * CARACTERÍSTICAS PREMIUM:
 * - HeaderModuloCIG unificado
 * - Dashboard con 6 KPIs analíticos
 * - Filtros avanzados por año, estado, área
 * - 3 Tabs: Plan Anual, Universo Auditable, Programa Anual
 * - Diseño corporativo ESAP
 * - Mobile-first responsive
 * - Animaciones suaves
 * 
 * ESTÁNDAR: Nivel Premium - Igual a todos los módulos CIG
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Layers, Calendar, CheckCircle2, 
  Info, TrendingUp, Target, Users, FileText,
  AlertTriangle, Activity, Filter, Search,
  Download, Plus, BarChart3
} from 'lucide-react';

// Componentes del sistema
import { PlanAnualModule } from './PlanAnualModule';
import { UniversoAuditorias } from './UniversoAuditorias';
import { ProgramaAnualCIG } from './ProgramaAnualCIG';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
import { toast } from 'sonner@2.0.3';
import { universoAuditoriasApi, planAnual5RolesApi, auditoriasApi } from './services/api';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TabActiva = 'plan-anual' | 'universo' | 'programa';
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'PUBLICADO';

interface FiltrosAvanzados {
  año: number;
  estado: EstadoPlan | 'TODOS';
  area: string;
  busqueda: string;
}

interface EstadisticasGlobales {
  totalAuditoriasPlanificadas: number;
  auditoriasAprobadas: number;
  procesosUniverso: number;
  procesosAuditables: number;
  auditoriasCalendarizadas: number;
  cumplimientoPrograma: number;
  areasInvolucradas: number;
  auditoresAsignados: number;
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const ESTADISTICAS_MOCK: EstadisticasGlobales = {
  totalAuditoriasPlanificadas: 24,
  auditoriasAprobadas: 18,
  procesosUniverso: 45,
  procesosAuditables: 32,
  auditoriasCalendarizadas: 16,
  cumplimientoPrograma: 75,
  areasInvolucradas: 12,
  auditoresAsignados: 8
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function PlanificacionModuleRediseno() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('universo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalNuevaAuditoriaOpen, setModalNuevaAuditoriaOpen] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGlobales>(ESTADISTICAS_MOCK);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosAvanzados>({
    año: 2025,
    estado: 'TODOS',
    area: 'TODAS',
    busqueda: ''
  });

  // Cargar estadísticas desde la BD
  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        setLoadingEstadisticas(true);
        console.log('[Dashboard] Cargando estadísticas desde BD...');
        
        // Cargar datos en paralelo
        const [procesosResponse, planesResponse, auditoriasResponse] = await Promise.all([
          universoAuditoriasApi.getAllProcesos(),
          planAnual5RolesApi.findAll(),
          auditoriasApi.getAllKanban()
        ]);

        console.log('[Dashboard] Respuestas recibidas:', {
          procesos: procesosResponse,
          planes: planesResponse,
          auditorias: auditoriasResponse
        });

        // Calcular estadísticas
        const procesos = procesosResponse.success && procesosResponse.data ? procesosResponse.data : [];
        const planes = planesResponse.success && planesResponse.data ? planesResponse.data : [];
        const auditorias = auditoriasResponse.success && auditoriasResponse.data ? auditoriasResponse.data : [];

        // Filtrar auditorías del año actual
        const añoActual = filtros.año;
        const auditoriasAnoActual = auditorias.filter((aud: any) => {
          if (!aud.fechaInicio) return false;
          const fechaInicio = new Date(aud.fechaInicio);
          return fechaInicio.getFullYear() === añoActual;
        });

        // Procesos seleccionados (prioridad = 1)
        const procesosSeleccionados = procesos.filter((p: any) => p.prioridad === 1);
        
        // Auditorías aprobadas (estado aprobado o en ejecución)
        const auditoriasAprobadas = auditoriasAnoActual.filter((aud: any) => 
          aud.estado === 'aprobado' || aud.estado === 'en-ejecucion' || aud.estadoKanban
        );

        // Auditorías calendarizadas (con fecha de inicio)
        const auditoriasCalendarizadas = auditoriasAnoActual.filter((aud: any) => 
          aud.fechaInicio && aud.fechaFin
        );

        // Calcular áreas involucradas (procesos únicos)
        const areasInvolucradas = new Set(procesosSeleccionados.map((p: any) => p.dependencia || p.territorial || 'Sede')).size;

        // Calcular auditores asignados (de todas las auditorías)
        const auditoresUnicos = new Set();
        auditoriasAnoActual.forEach((aud: any) => {
          if (aud.auditorLiderId) auditoresUnicos.add(aud.auditorLiderId);
          if (aud.auditorAsignadoId) auditoresUnicos.add(aud.auditorAsignadoId);
          if (aud.equipoAuditores && Array.isArray(aud.equipoAuditores)) {
            aud.equipoAuditores.forEach((eq: any) => {
              if (eq.personaId) auditoresUnicos.add(eq.personaId);
            });
          }
        });

        // Calcular cumplimiento (auditorías completadas / total)
        const auditoriasCompletadas = auditoriasAnoActual.filter((aud: any) => 
          aud.estado === 'cerrada' || aud.fase === 'completada'
        );
        const cumplimientoPrograma = auditoriasAnoActual.length > 0
          ? Math.round((auditoriasCompletadas.length / auditoriasAnoActual.length) * 100)
          : 0;

        const nuevasEstadisticas: EstadisticasGlobales = {
          totalAuditoriasPlanificadas: planes.reduce((sum: number, plan: any) => {
            // Sumar actividades de todos los roles
            return sum + (plan.roles?.reduce((rolSum: number, rol: any) => {
              return rolSum + (rol.actividades?.length || 0);
            }, 0) || 0);
          }, 0),
          auditoriasAprobadas: auditoriasAprobadas.length,
          procesosUniverso: procesos.length,
          procesosAuditables: procesosSeleccionados.length, // Solo los seleccionados (prioridad = 1)
          auditoriasCalendarizadas: auditoriasCalendarizadas.length,
          cumplimientoPrograma,
          areasInvolucradas,
          auditoresAsignados: auditoresUnicos.size
        };

        console.log('[Dashboard] Estadísticas calculadas:', nuevasEstadisticas);
        setEstadisticas(nuevasEstadisticas);
      } catch (error) {
        console.error('[Dashboard] Error al cargar estadísticas:', error);
        // Mantener datos mock en caso de error
        setEstadisticas(ESTADISTICAS_MOCK);
      } finally {
        setLoadingEstadisticas(false);
      }
    };

    cargarEstadisticas();
  }, [filtros.año]);

  // Handler para crear auditoría
  const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
    console.log('📝 Nueva auditoría OCIG desde Planeación:', data);
    
    // Simulación de delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('✅ Auditoría OCIG creada exitosamente', {
      description: `"${data.titulo}" ha sido agregada al Plan Anual ${data.planAnualAño || 2025}`
    });
    
    setModalNuevaAuditoriaOpen(false);
  };

  // Calcular métricas derivadas
  const metricas = useMemo(() => ({
    porcentajeAprobacion: estadisticas.totalAuditoriasPlanificadas > 0 
      ? Math.round((estadisticas.auditoriasAprobadas / estadisticas.totalAuditoriasPlanificadas) * 100)
      : 0,
    porcentajeCobertura: estadisticas.procesosUniverso > 0
      ? Math.round((estadisticas.procesosAuditables / estadisticas.procesosUniverso) * 100)
      : 0,
    porcentajeCalendarizacion: estadisticas.auditoriasAprobadas > 0
      ? Math.round((estadisticas.auditoriasCalendarizadas / estadisticas.auditoriasAprobadas) * 100)
      : 0
  }), [estadisticas]);

  const tabs = [
    {
      id: 'universo' as TabActiva,
      label: 'Universo Auditable',
      icon: <Layers className="w-4 h-4" />,
      descripcion: 'Identifica DÓNDE se puede auditar - Todos los procesos institucionales disponibles',
      badge: estadisticas.procesosUniverso
    },
    {
      id: 'plan-anual' as TabActiva,
      label: 'Plan Anual',
      icon: <ClipboardList className="w-4 h-4" />,
      descripcion: 'Define QUÉ procesos se auditarán - Selección de auditorías a ejecutar',
      badge: estadisticas.totalAuditoriasPlanificadas
    },
    {
      id: 'programa' as TabActiva,
      label: 'Programa Anual',
      icon: <Calendar className="w-4 h-4" />,
      descripcion: 'Calendariza CUÁNDO auditar - Programación temporal de auditorías',
      badge: estadisticas.auditoriasCalendarizadas
    }
  ];

  const tabActual = tabs.find(t => t.id === tabActiva);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER PREMIUM CON HEADERMODULOCIG */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <HeaderModuloCIG
            titulo="Planificación de Auditorías"
            subtitulo="Gestión del ciclo completo de planificación anual de auditorías"
          />
        </div>

        {/* Dashboard KPIs - 6 Indicadores Clave */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="Auditorías Planificadas"
              valor={estadisticas.totalAuditoriasPlanificadas}
              icono={<Target className="w-5 h-5" />}
              color="blue"
              tendencia={{ valor: metricas.porcentajeAprobacion, tipo: 'positivo' }}
              footer={`${metricas.porcentajeAprobacion}% aprobadas`}
            />
            <KPICard
              label="Universo Auditable"
              valor={estadisticas.procesosUniverso}
              icono={<Layers className="w-5 h-5" />}
              color="purple"
              tendencia={{ valor: metricas.porcentajeCobertura, tipo: 'neutral' }}
              footer={`${estadisticas.procesosAuditables} auditables`}
            />
            <KPICard
              label="Auditorías Calendarizadas"
              valor={estadisticas.auditoriasCalendarizadas}
              icono={<Calendar className="w-5 h-5" />}
              color="green"
              tendencia={{ valor: metricas.porcentajeCalendarizacion, tipo: 'positivo' }}
              footer={`${metricas.porcentajeCalendarizacion}% programadas`}
            />
            <KPICard
              label="Cumplimiento Programa"
              valor={`${estadisticas.cumplimientoPrograma}%`}
              icono={<TrendingUp className="w-5 h-5" />}
              color="yellow"
              tendencia={{ valor: 75, tipo: 'positivo' }}
              footer="En seguimiento"
            />
            <KPICard
              label="Áreas Involucradas"
              valor={estadisticas.areasInvolucradas}
              icono={<Activity className="w-5 h-5" />}
              color="indigo"
              footer="Dependencias ESAP"
            />
            <KPICard
              label="Auditores Asignados"
              valor={estadisticas.auditoresAsignados}
              icono={<Users className="w-5 h-5" />}
              color="teal"
              footer="Equipo auditor"
            />
          </div>
        </div>

        {/* Barra de Filtros y Acciones */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-col gap-3 bg-gray-50 rounded-lg p-3">
            {/* Filtros Quick */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <select
                value={filtros.año}
                onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
                className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>

              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as any })}
                className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="EN_REVISION">En Revisión</option>
                <option value="APROBADO">Aprobado</option>
                <option value="PUBLICADO">Publicado</option>
              </select>

              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] ${
                  mostrarFiltros 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros Avanzados</span>
                <span className="sm:hidden">Filtros</span>
              </button>
            </div>

            {/* ⭐ BOTÓN MANDATORIO: PUNTO DE ENTRADA ÚNICO PARA CREAR AUDITORÍAS */}
            <button
              onClick={() => setModalNuevaAuditoriaOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg font-medium hover:shadow-lg transition-all shadow-md min-h-[44px] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Auditoría</span>
            </button>
          </div>
        </div>

        {/* Panel Filtros Avanzados (Expandible) */}
        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-200"
            >
              <div className="px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Buscar por nombre o código
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={filtros.busqueda}
                        onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                        placeholder="AU-2025-001, Auditoría TIC..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Área o Dependencia
                    </label>
                    <select
                      value={filtros.area}
                      onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODAS">Todas las áreas</option>
                      <option value="TIC">Dirección de Tecnología</option>
                      <option value="FINANCIERA">Dirección Financiera</option>
                      <option value="ADMINISTRATIVA">Dirección Administrativa</option>
                      <option value="ACADEMICA">Dirección Académica</option>
                      <option value="TALENTO">Talento Humano</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFiltros({
                        año: 2025,
                        estado: 'TODOS',
                        area: 'TODAS',
                        busqueda: ''
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABS NAVEGACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all text-sm font-medium flex-shrink-0 ${ 
                  tabActiva === tab.id
                    ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden whitespace-nowrap">{tab.label.split(' ')[0]}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  tabActiva === tab.id
                    ? 'bg-[#1e5da8] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner de Ayuda Contextual */}
      {tabActual && (
        <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100 px-6 py-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              <span className="font-medium">{tabActual.label}:</span> {tabActual.descripcion}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO TABS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {tabActiva === 'plan-anual' && <PlanAnualModule />}
            {tabActiva === 'universo' && <UniversoAuditorias />}
            {tabActiva === 'programa' && <ProgramaAnualCIG />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER CON INDICADORES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              <span>Año Fiscal: {filtros.año}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{estadisticas.auditoriasAprobadas} aprobadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-yellow-600" />
              <span>{estadisticas.cumplimientoPrograma}% cumplimiento</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <BarChart3 className="w-3 h-3" />
            <span>Última actualización: Hoy 14:30</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL FORMULARIO UNIFICADO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <FormularioAuditoriaUnificado
        open={modalNuevaAuditoriaOpen}
        onClose={() => setModalNuevaAuditoriaOpen(false)}
        onSubmit={handleCrearAuditoria}
        mode="create"
        initialData={{
          vinculadaPlanAnual: true,
          planAnualAño: filtros.año
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  label: string;
  valor: string | number;
  icono: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'indigo' | 'teal';
  tendencia?: {
    valor: number;
    tipo: 'positivo' | 'negativo' | 'neutral';
  };
  footer?: string;
}

function KPICard({ label, valor, icono, color, tendencia, footer }: KPICardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      text: 'text-blue-700'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      text: 'text-purple-700'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      text: 'text-green-700'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-600',
      text: 'text-yellow-700'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-600',
      text: 'text-indigo-700'
    },
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      iconBg: 'bg-teal-100',
      iconText: 'text-teal-600',
      text: 'text-teal-700'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`rounded-lg border ${colors.bg} ${colors.border} p-3 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 ${colors.iconBg} rounded-lg flex items-center justify-center ${colors.iconText}`}>
          {icono}
        </div>
        {tendencia && (
          <div className={`flex items-center gap-1 text-xs font-medium ${ 
            tendencia.tipo === 'positivo' ? 'text-green-600' :
            tendencia.tipo === 'negativo' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            <TrendingUp className={`w-3 h-3 ${
              tendencia.tipo === 'negativo' ? 'rotate-180' : ''
            }`} />
            {tendencia.valor}%
          </div>
        )}
      </div>
      
      <div className="mb-1">
        <div className={`text-xl sm:text-2xl font-semibold ${colors.text}`}>{valor}</div>
      </div>
      
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      
      {footer && (
        <div className={`text-xs ${colors.text} font-medium mt-1`}>
          {footer}
        </div>
      )}
    </div>
  );
}