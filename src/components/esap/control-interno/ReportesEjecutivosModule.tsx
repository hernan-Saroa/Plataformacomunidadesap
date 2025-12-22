/**
 * ============================================
 * RF016: REPORTES EJECUTIVOS
 * ============================================
 * 
 * Sistema de generación automática de reportes ejecutivos
 * para la Dirección y organismos de control
 * 
 * CARACTERÍSTICAS:
 * - Reportes PDF automáticos
 * - Integración Power BI (placeholder)
 * - Dashboard ejecutivo consolidado
 * - Métricas clave (KPIs)
 * - Gráficos y visualizaciones
 * - Exportación múltiples formatos
 * - Programación de reportes
 * - Distribución automática
 * 
 * REPORTES PRINCIPALES:
 * 1. Informe Ejecutivo Trimestral
 * 2. Dashboard de Cumplimiento
 * 3. Estado de Planes de Mejoramiento
 * 4. Seguimiento de Auditorías
 * 5. Indicadores de Gestión
 * 6. Resumen para Dirección
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  FileSpreadsheet,
  Mail,
  Send,
  Filter,
  Search,
  Settings,
  Share2,
  Printer,
  ExternalLink
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { InputSIGL } from '../gestion-legal/design-system/Input';
import { toast } from 'sonner';

// ====================================
// TIPOS
// ====================================

interface ReporteDisponible {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'ejecutivo' | 'operacional' | 'cumplimiento' | 'indicadores';
  periodicidad: 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual' | 'bajo_demanda';
  formato: ('PDF' | 'Excel' | 'PowerBI')[];
  icon: React.ElementType;
  ultimaGeneracion?: string;
  destinatarios: string[];
}

interface KPI {
  id: string;
  nombre: string;
  valor: number;
  meta: number;
  unidad: string;
  tendencia: 'up' | 'down' | 'neutral';
  variacion: number; // porcentaje
  color: 'green' | 'yellow' | 'red';
}

// ====================================
// DATOS MOCK
// ====================================

const REPORTES_DISPONIBLES: ReporteDisponible[] = [
  {
    id: 'rep-001',
    nombre: 'Informe Ejecutivo Trimestral',
    descripcion: 'Resumen consolidado de todas las actividades del Control Interno de Gestión',
    categoria: 'ejecutivo',
    periodicidad: 'trimestral',
    formato: ['PDF', 'PowerBI'],
    icon: FileText,
    ultimaGeneracion: '2025-10-15',
    destinatarios: ['Director General', 'Secretaría General', 'Jefe OCI']
  },
  {
    id: 'rep-002',
    nombre: 'Dashboard de Cumplimiento',
    descripcion: 'Indicadores de cumplimiento de planes de mejoramiento y hallazgos',
    categoria: 'cumplimiento',
    periodicidad: 'mensual',
    formato: ['PDF', 'Excel', 'PowerBI'],
    icon: TrendingUp,
    ultimaGeneracion: '2025-12-01',
    destinatarios: ['Jefe OCI', 'Auditores']
  },
  {
    id: 'rep-003',
    nombre: 'Estado Planes de Mejoramiento',
    descripcion: 'Seguimiento detallado de acciones correctivas y preventivas',
    categoria: 'cumplimiento',
    periodicidad: 'trimestral',
    formato: ['PDF', 'Excel'],
    icon: Target,
    ultimaGeneracion: '2025-10-20',
    destinatarios: ['Todas las áreas', 'Jefe OCI']
  },
  {
    id: 'rep-004',
    nombre: 'Seguimiento de Auditorías',
    descripcion: 'Estado actual de todas las auditorías programadas y en ejecución',
    categoria: 'operacional',
    periodicidad: 'mensual',
    formato: ['PDF', 'Excel'],
    icon: Activity,
    ultimaGeneracion: '2025-12-15',
    destinatarios: ['Jefe OCI', 'Auditores Líderes']
  },
  {
    id: 'rep-005',
    nombre: 'Indicadores de Gestión (KPIs)',
    descripcion: 'Métricas clave de rendimiento del sistema de control interno',
    categoria: 'indicadores',
    periodicidad: 'mensual',
    formato: ['PDF', 'Excel', 'PowerBI'],
    icon: BarChart3,
    ultimaGeneracion: '2025-12-20',
    destinatarios: ['Director General', 'Jefe OCI']
  },
  {
    id: 'rep-006',
    nombre: 'Resumen para Dirección',
    descripcion: 'Informe ejecutivo simplificado para la alta dirección',
    categoria: 'ejecutivo',
    periodicidad: 'mensual',
    formato: ['PDF'],
    icon: Users,
    ultimaGeneracion: '2025-12-18',
    destinatarios: ['Director General', 'Consejo Directivo']
  }
];

const KPIS_ACTUALES: KPI[] = [
  {
    id: 'kpi-001',
    nombre: 'Auditorías Completadas',
    valor: 12,
    meta: 18,
    unidad: 'auditorías',
    tendencia: 'up',
    variacion: 15,
    color: 'yellow'
  },
  {
    id: 'kpi-002',
    nombre: 'Cumplimiento Planes de Mejoramiento',
    valor: 78,
    meta: 85,
    unidad: '%',
    tendencia: 'up',
    variacion: 8,
    color: 'yellow'
  },
  {
    id: 'kpi-003',
    nombre: 'Hallazgos Cerrados',
    valor: 45,
    meta: 50,
    unidad: 'hallazgos',
    tendencia: 'up',
    variacion: 12,
    color: 'green'
  },
  {
    id: 'kpi-004',
    nombre: 'Tiempo Promedio Auditoría',
    valor: 22,
    meta: 20,
    unidad: 'días',
    tendencia: 'down',
    variacion: -5,
    color: 'red'
  },
  {
    id: 'kpi-005',
    nombre: 'Satisfacción Áreas Auditadas',
    valor: 4.2,
    meta: 4.0,
    unidad: '/5',
    tendencia: 'up',
    variacion: 5,
    color: 'green'
  },
  {
    id: 'kpi-006',
    nombre: 'Informes Entregados a Tiempo',
    valor: 92,
    meta: 95,
    unidad: '%',
    tendencia: 'neutral',
    variacion: 0,
    color: 'green'
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ReportesEjecutivosModule() {
  const [vistaActiva, setVistaActiva] = useState<'catalogo' | 'kpis' | 'programados'>('catalogo');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [modalGenerarAbierto, setModalGenerarAbierto] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteDisponible | null>(null);

  const reportesFiltrados = useMemo(() => {
    return REPORTES_DISPONIBLES.filter(reporte => {
      const matchBusqueda = reporte.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                           reporte.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = categoriaFiltro === 'todos' || reporte.categoria === categoriaFiltro;
      return matchBusqueda && matchCategoria;
    });
  }, [busqueda, categoriaFiltro]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reportes Ejecutivos</h1>
              <p className="text-sm text-gray-500">
                Generación automática y distribución de informes
              </p>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-2">
            <ButtonSIGL
              variant={vistaActiva === 'catalogo' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('catalogo')}
            >
              <FileText className="w-4 h-4" />
              Catálogo de Reportes
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'kpis' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('kpis')}
            >
              <TrendingUp className="w-4 h-4" />
              Dashboard KPIs
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'programados' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('programados')}
            >
              <Clock className="w-4 h-4" />
              Reportes Programados
            </ButtonSIGL>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {vistaActiva === 'catalogo' && (
            <motion.div
              key="catalogo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CatalogoReportes
                reportes={reportesFiltrados}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                categoriaFiltro={categoriaFiltro}
                setCategoriaFiltro={setCategoriaFiltro}
                onGenerar={(reporte) => {
                  setReporteSeleccionado(reporte);
                  setModalGenerarAbierto(true);
                }}
              />
            </motion.div>
          )}

          {vistaActiva === 'kpis' && (
            <motion.div
              key="kpis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DashboardKPIs kpis={KPIS_ACTUALES} />
            </motion.div>
          )}

          {vistaActiva === 'programados' && (
            <motion.div
              key="programados"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ReportesProgramados reportes={REPORTES_DISPONIBLES} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Generar Reporte */}
        {modalGenerarAbierto && reporteSeleccionado && (
          <ModalGenerarReporte
            reporte={reporteSeleccionado}
            onClose={() => setModalGenerarAbierto(false)}
            onGenerar={(formato, destinatarios) => {
              toast.success(`Generando reporte en formato ${formato}...`);
              setModalGenerarAbierto(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ====================================
// SUB-COMPONENTE: CATÁLOGO DE REPORTES
// ====================================

const CatalogoReportes: React.FC<{
  reportes: ReporteDisponible[];
  busqueda: string;
  setBusqueda: (valor: string) => void;
  categoriaFiltro: string;
  setCategoriaFiltro: (valor: string) => void;
  onGenerar: (reporte: ReporteDisponible) => void;
}> = ({ reportes, busqueda, setBusqueda, categoriaFiltro, setCategoriaFiltro, onGenerar }) => {
  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <CardSIGL>
        <div className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <InputSIGL
                type="text"
                placeholder="Buscar reportes..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todas las categorías</option>
              <option value="ejecutivo">Ejecutivos</option>
              <option value="operacional">Operacionales</option>
              <option value="cumplimiento">Cumplimiento</option>
              <option value="indicadores">Indicadores</option>
            </select>
          </div>
        </div>
      </CardSIGL>

      {/* Grid de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportes.map((reporte, index) => (
          <motion.div
            key={reporte.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardSIGL>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    reporte.categoria === 'ejecutivo' ? 'bg-purple-100' :
                    reporte.categoria === 'operacional' ? 'bg-blue-100' :
                    reporte.categoria === 'cumplimiento' ? 'bg-green-100' :
                    'bg-yellow-100'
                  }`}>
                    <reporte.icon className={`w-6 h-6 ${
                      reporte.categoria === 'ejecutivo' ? 'text-purple-600' :
                      reporte.categoria === 'operacional' ? 'text-blue-600' :
                      reporte.categoria === 'cumplimiento' ? 'text-green-600' :
                      'text-yellow-600'
                    }`} />
                  </div>
                  <BadgeSIGL variant={
                    reporte.categoria === 'ejecutivo' ? 'info' :
                    reporte.categoria === 'cumplimiento' ? 'success' :
                    reporte.categoria === 'indicadores' ? 'warning' : 'default'
                  }>
                    {reporte.categoria}
                  </BadgeSIGL>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{reporte.nombre}</h3>
                <p className="text-sm text-gray-600 mb-4">{reporte.descripcion}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="capitalize">{reporte.periodicidad}</span>
                  </div>
                  {reporte.ultimaGeneracion && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      Última: {new Date(reporte.ultimaGeneracion).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {reporte.formato.map(formato => (
                      <BadgeSIGL key={formato} variant="default">
                        {formato}
                      </BadgeSIGL>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <ButtonSIGL
                    variant="primary"
                    onClick={() => onGenerar(reporte)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4" />
                    Generar
                  </ButtonSIGL>
                  <ButtonSIGL variant="default">
                    <Eye className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ====================================
// SUB-COMPONENTE: DASHBOARD KPIs
// ====================================

const DashboardKPIs: React.FC<{ kpis: KPI[] }> = ({ kpis }) => {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <CardSIGL>
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Indicadores de Gestión</h3>
              <p className="text-sm text-gray-600">
                Actualizado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardSIGL>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{kpi.nombre}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${
                        kpi.color === 'green' ? 'text-green-600' :
                        kpi.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {kpi.valor}
                      </span>
                      <span className="text-sm text-gray-500">{kpi.unidad}</span>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    kpi.color === 'green' ? 'bg-green-100' :
                    kpi.color === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {kpi.tendencia === 'up' && <TrendingUp className={`w-5 h-5 ${
                      kpi.color === 'green' ? 'text-green-600' :
                      kpi.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`} />}
                    {kpi.tendencia === 'down' && <TrendingUp className={`w-5 h-5 rotate-180 ${
                      kpi.color === 'green' ? 'text-green-600' :
                      kpi.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`} />}
                    {kpi.tendencia === 'neutral' && <Activity className="w-5 h-5 text-gray-600" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Meta:</span>
                    <span className="font-medium text-gray-900">{kpi.meta} {kpi.unidad}</span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        kpi.color === 'green' ? 'bg-green-500' :
                        kpi.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((kpi.valor / kpi.meta) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Variación:</span>
                    <span className={`font-medium ${
                      kpi.variacion > 0 ? 'text-green-600' : kpi.variacion < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {kpi.variacion > 0 ? '+' : ''}{kpi.variacion}%
                    </span>
                  </div>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      {/* Integración Power BI */}
      <CardSIGL>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dashboard Power BI</h3>
                <p className="text-sm text-gray-600">Visualizaciones avanzadas e interactivas</p>
              </div>
            </div>
            <ButtonSIGL variant="primary">
              <ExternalLink className="w-4 h-4" />
              Abrir Power BI
            </ButtonSIGL>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-8 text-center">
            <BarChart3 className="w-16 h-16 text-yellow-600 mx-auto mb-3" />
            <p className="text-sm text-gray-700">
              Los dashboards de Power BI se integrarán en esta sección
            </p>
            <p className="text-xs text-gray-500 mt-2">
              (Requiere configuración de Power BI Embedded)
            </p>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
};

// ====================================
// SUB-COMPONENTE: REPORTES PROGRAMADOS
// ====================================

const ReportesProgramados: React.FC<{ reportes: ReporteDisponible[] }> = ({ reportes }) => {
  return (
    <div className="space-y-4">
      <CardSIGL>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Reportes Programados</h3>
              <p className="text-sm text-gray-600">
                Generación y distribución automática según periodicidad
              </p>
            </div>
            <ButtonSIGL variant="primary">
              <Plus className="w-4 h-4" />
              Programar Nuevo
            </ButtonSIGL>
          </div>

          <div className="space-y-3">
            {reportes.filter(r => r.periodicidad !== 'bajo_demanda').map(reporte => (
              <div key={reporte.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      reporte.categoria === 'ejecutivo' ? 'bg-purple-100' :
                      reporte.categoria === 'operacional' ? 'bg-blue-100' :
                      reporte.categoria === 'cumplimiento' ? 'bg-green-100' :
                      'bg-yellow-100'
                    }`}>
                      <reporte.icon className={`w-5 h-5 ${
                        reporte.categoria === 'ejecutivo' ? 'text-purple-600' :
                        reporte.categoria === 'operacional' ? 'text-blue-600' :
                        reporte.categoria === 'cumplimiento' ? 'text-green-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{reporte.nombre}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="capitalize">{reporte.periodicidad}</span>
                        <span>•</span>
                        <span>{reporte.destinatarios.length} destinatarios</span>
                        {reporte.ultimaGeneracion && (
                          <>
                            <span>•</span>
                            <span>Última: {new Date(reporte.ultimaGeneracion).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeSIGL variant="success">
                      <CheckCircle2 className="w-3 h-3" />
                      Activo
                    </BadgeSIGL>
                    <ButtonSIGL variant="default">
                      <Settings className="w-4 h-4" />
                    </ButtonSIGL>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardSIGL>
    </div>
  );
};

// ====================================
// MODAL: GENERAR REPORTE
// ====================================

const ModalGenerarReporte: React.FC<{
  reporte: ReporteDisponible;
  onClose: () => void;
  onGenerar: (formato: string, destinatarios: string[]) => void;
}> = ({ reporte, onClose, onGenerar }) => {
  const [formatoSeleccionado, setFormatoSeleccionado] = useState(reporte.formato[0]);
  const [destinatarios, setDestinatarios] = useState(reporte.destinatarios);

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Generar Reporte"
      size="medium"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900">{reporte.nombre}</p>
          <p className="text-sm text-blue-700">{reporte.descripcion}</p>
        </div>

        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato de exportación *
          </label>
          <div className="flex gap-2">
            {reporte.formato.map(formato => (
              <button
                key={formato}
                onClick={() => setFormatoSeleccionado(formato)}
                className={`px-4 py-2 rounded-lg border ${
                  formatoSeleccionado === formato
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {formato}
              </button>
            ))}
          </div>
        </div>

        {/* Destinatarios */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinatarios
          </label>
          <div className="space-y-2">
            {destinatarios.map((dest, index) => (
              <div key={index} className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{dest}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="default" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => onGenerar(formatoSeleccionado, destinatarios)}
          >
            <Download className="w-4 h-4" />
            Generar Reporte
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

export default ReportesEjecutivosModule;
