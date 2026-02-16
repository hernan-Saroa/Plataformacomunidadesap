/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLANIFICACIÓN OCIG - MÓDULOS SEPARADOS V4.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 ESTRUCTURA MODULAR:
 * Este componente se divide en DOS módulos independientes:
 * 
 * 1. **UNIVERSO AUDITABLE** (con Programa Anual):
 *    - Tab 1: Universo Auditable - DÓNDE se puede auditar (45 procesos)
 *    - Tab 2: Programa Anual - CUÁNDO auditar (16 calendarizadas)
 * 
 * 2. **PLAN ANUAL** (independiente):
 *    - Plan Anual - Qué procesos se auditarán (24 auditorías)
 * 
 * 🔄 INTEGRACIÓN CON OTROS MÓDULOS:
 *    - Kanban de Auditorías (ejecución)
 *    - Planes de Mejoramiento (hallazgos y acciones)
 *    - Expedientes (archivo documental)
 *    - Listas de Chequeo (requisitos digitales)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Layers, Calendar, CheckCircle2, 
  Info, FileText, AlertTriangle, Filter, Search,
  Download, Plus, BarChart3, Activity
} from 'lucide-react';

// Componentes del sistema
import { PlanAnualAuditoriaDefinitivo as PlanAnualOperativo } from './PlanAnualAuditoriaDefinitivo';
import { UniversoAuditorias } from './UniversoAuditorias';
import { ProgramaAnualCIG } from './ProgramaAnualCIG';
import { HeaderModuloCIG } from './HeaderModuloCIG';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type VistaModulo = 'universo-programa' | 'plan-operativo';
type TabActiva = 'plan-anual' | 'universo' | 'programa';
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'PUBLICADO';

interface PlanificacionModuleProps {
  vista?: VistaModulo; // 'universo-programa' o 'plan-operativo'
}

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

export function PlanificacionModuleRediseno({ vista = 'universo-programa' }: PlanificacionModuleProps) {
  // Determinar tab inicial según la vista
  const tabInicial: TabActiva = vista === 'plan-operativo' ? 'plan-anual' : 'universo';
  
  const [tabActiva, setTabActiva] = useState<TabActiva>(tabInicial);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosAvanzados>({
    año: 2025,
    estado: 'TODOS',
    area: 'TODAS',
    busqueda: ''
  });

  const estadisticas = ESTADISTICAS_MOCK;

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
      descripcion: 'Define qué procesos se auditarán - Selección de auditorías a ejecutar',
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

  // Filtrar tabs según la vista del módulo
  const tabsVisibles = vista === 'plan-operativo' 
    ? tabs.filter(t => t.id === 'plan-anual') // Solo Plan Operativo
    : tabs.filter(t => t.id === 'universo' || t.id === 'programa'); // Universo + Programa

  const tabActual = tabsVisibles.find(t => t.id === tabActiva);

  // Determinar título y subtítulo según la vista
  const tituloModulo = vista === 'plan-operativo' 
    ? 'Plan Anual de Auditoría OCIG' 
    : 'Universo Auditable';
  
  const subtituloModulo = vista === 'plan-operativo'
    ? 'Gestión del Plan Anual de Auditoría Interna - Qué procesos se auditarán'
    : 'Identificación del Universo Auditable y Programación Anual';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER PREMIUM CON HEADERMODULOCIG */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <HeaderModuloCIG
            titulo={tituloModulo}
            subtitulo={subtituloModulo}
          />
        </div>

        {/* Barra de Filtros y Acciones - SOLO para Universo y Programa */}
        {vista !== 'plan-operativo' && (
          <>
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

                {/* ⭐ NO HAY BOTÓN DE CREAR AUDITORÍAS - El Plan Anual gestiona roles y actividades del Decreto 648/2017 */}
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
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABS NAVEGACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {vista !== 'plan-operativo' && (
        <>
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6">
              <div className="flex gap-1 overflow-x-auto scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
                {tabsVisibles.map((tab) => (
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
        </>
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
            {tabActiva === 'plan-anual' && <PlanAnualOperativo />}
            {tabActiva === 'universo' && <UniversoAuditorias />}
            {tabActiva === 'programa' && <ProgramaAnualCIG />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER CON INDICADORES - Solo para Universo/Programa */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {vista !== 'plan-operativo' && (
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
      )}
    </div>
  );
}