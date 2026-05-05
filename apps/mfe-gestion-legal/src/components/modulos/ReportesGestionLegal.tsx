/**
 * ReportesGestionLegal - Módulo de Reportes integrado al SIGL
 * Trazabilidad completa: procesos, comunicaciones, términos, disciplinario,
 * órganos de control y consultas jurídicas.
 * Diseño alineado al estándar world-class del sistema.
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Download, Search, Star, Filter, RefreshCw,
  Scale, Mail, CalendarClock, Gavel, Building2, FileQuestion,
  FileBarChart, Database, ChevronDown, Grid3x3, List,
  FileSpreadsheet, X, Layers
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { exportToCSV, exportToExcel, exportToPDF, generateReportData } from '../../../../utils/reportExport';

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────────────────────────

type CategoriaLegal =
  | 'todos'
  | 'procesos-judiciales'
  | 'comunicaciones'
  | 'terminos'
  | 'disciplinario'
  | 'organos-control'
  | 'asesoria';

type FormatoExport = 'csv' | 'excel' | 'pdf';
type EstadoReporte = 'disponible' | 'generando' | 'error';

interface ReporteLegal {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaLegal;
  registros: number;
  tamanoEstimado: string;
  campos: string[];
  filtrosDisponibles: string[];
  estado: EstadoReporte;
  favorito?: boolean;
  ultimaGeneracion?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE REPORTES LEGALES
// ──────────────────────────────────────────────────────────────────────────────

const REPORTES_LEGALES: ReporteLegal[] = [
  {
    id: 'GL-001',
    nombre: 'Trazabilidad de Procesos Judiciales',
    descripcion: 'Historial completo de expedientes judiciales: actuaciones, términos, estados y resultados por abogado y despacho.',
    categoria: 'procesos-judiciales',
    registros: 320,
    tamanoEstimado: '1.2 MB',
    campos: ['Radicado', 'Tipo Proceso', 'Demandante', 'Despacho', 'Etapa Actual', 'Fecha Inicio', 'Próximo Término', 'Abogado', 'Estado'],
    filtrosDisponibles: ['Tipo Proceso', 'Etapa', 'Abogado', 'Despacho', 'Rango de Fechas'],
    estado: 'disponible',
    favorito: true,
  },
  {
    id: 'GL-002',
    nombre: 'Comunicaciones y Centro de Despacho',
    descripcion: 'Trazabilidad de todas las comunicaciones recibidas, enviadas, reenviadas y respondidas con historial de acciones de la IA.',
    categoria: 'comunicaciones',
    registros: 1840,
    tamanoEstimado: '3.5 MB',
    campos: ['ID Correo', 'Tipo', 'Remitente', 'Asunto', 'Fecha Recepción', 'Clasificación IA', 'Módulo Sugerido', 'Estado', 'Respondido', 'Reenviado', 'Expediente Vinculado'],
    filtrosDisponibles: ['Tipo', 'Estado', 'Clasificación IA', 'Rango de Fechas', 'Expediente'],
    estado: 'disponible',
    favorito: true,
    ultimaGeneracion: 'Hace 1 hora',
  },
  {
    id: 'GL-003',
    nombre: 'Control de Términos Procesales',
    descripcion: 'Estado de todos los términos procesales con alertas de vencimiento y días hábiles restantes por responsable.',
    categoria: 'terminos',
    registros: 215,
    tamanoEstimado: '580 KB',
    campos: ['Número Radicado', 'Tipo Actuación', 'Expediente', 'Fecha Inicio', 'Fecha Vencimiento', 'Días Restantes', 'Estado', 'Responsable'],
    filtrosDisponibles: ['Estado', 'Responsable', 'Tipo Actuación', 'Rango Vencimiento'],
    estado: 'disponible',
  },
  {
    id: 'GL-004',
    nombre: 'Procesos Disciplinarios',
    descripcion: 'Seguimiento de procesos disciplinarios por etapa, funcionario involucrado y resultado del juzgamiento.',
    categoria: 'disciplinario',
    registros: 87,
    tamanoEstimado: '440 KB',
    campos: ['Número Proceso', 'Investigado', 'Cargo', 'Tipo Falta', 'Etapa', 'Quejoso', 'Fecha Apertura', 'Abogado', 'Estado'],
    filtrosDisponibles: ['Etapa', 'Tipo Falta', 'Abogado', 'Estado', 'Rango de Fechas'],
    estado: 'disponible',
  },
  {
    id: 'GL-005',
    nombre: 'Requerimientos de Órganos de Control',
    descripcion: 'Trazabilidad completa de requerimientos de Contraloría, Procuraduría, Personería y demás entes de control con fechas límite.',
    categoria: 'organos-control',
    registros: 142,
    tamanoEstimado: '620 KB',
    campos: ['ID Requerimiento', 'Organismo', 'Tipo', 'Fecha Recepción', 'Fecha Límite Respuesta', 'Responsable', 'Estado', 'Respuesta Enviada'],
    filtrosDisponibles: ['Organismo', 'Tipo', 'Estado', 'Responsable', 'Rango de Fechas'],
    estado: 'disponible',
    favorito: true,
  },
  {
    id: 'GL-006',
    nombre: 'Consultas de Asesoría Jurídica',
    descripcion: 'Registro completo de consultas jurídicas recibidas, asignadas y respondidas por área con tiempos de atención.',
    categoria: 'asesoria',
    registros: 394,
    tamanoEstimado: '870 KB',
    campos: ['ID Consulta', 'Área Solicitante', 'Tema', 'Fecha Solicitud', 'Abogado Asignado', 'Fecha Respuesta', 'Días de Atención', 'Estado'],
    filtrosDisponibles: ['Área Solicitante', 'Abogado', 'Estado', 'Rango de Fechas'],
    estado: 'disponible',
  },
  {
    id: 'GL-007',
    nombre: 'Historial de Acciones por Correo',
    descripcion: 'Log completo de acciones realizadas sobre cada comunicación: clasificación IA, reenvíos, respuestas y vinculación a expedientes.',
    categoria: 'comunicaciones',
    registros: 5210,
    tamanoEstimado: '4.1 MB',
    campos: ['ID Acción', 'ID Correo', 'Tipo Evento', 'Usuario', 'Fecha', 'Descripción', 'Detalle'],
    filtrosDisponibles: ['Tipo Evento', 'Usuario', 'Rango de Fechas'],
    estado: 'disponible',
    ultimaGeneracion: 'Hace 30 min',
  },
  {
    id: 'GL-008',
    nombre: 'Expedientes Electrónicos',
    descripcion: 'Estado y documentación de todos los expedientes electrónicos activos e históricos del área legal.',
    categoria: 'procesos-judiciales',
    registros: 178,
    tamanoEstimado: '2.8 MB',
    campos: ['ID Expediente', 'Número Radicado', 'Tipo', 'Módulo', 'Fecha Creación', 'Documentos', 'Tareas Pendientes', 'Responsable', 'Estado'],
    filtrosDisponibles: ['Tipo', 'Módulo', 'Estado', 'Responsable', 'Rango de Fechas'],
    estado: 'disponible',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CATEGORÍAS
// ──────────────────────────────────────────────────────────────────────────────

const CATEGORIAS_CONFIG: Record<CategoriaLegal, { label: string; icon: any; color: string; bgColor: string }> = {
  todos: { label: 'Todos', icon: Layers, color: '#003DA5', bgColor: '#EFF6FF' },
  'procesos-judiciales': { label: 'Procesos Judiciales', icon: Scale, color: '#10B981', bgColor: '#D1FAE5' },
  comunicaciones: { label: 'Comunicaciones', icon: Mail, color: '#3B82F6', bgColor: '#DBEAFE' },
  terminos: { label: 'Términos', icon: CalendarClock, color: '#6366F1', bgColor: '#EDE9FE' },
  disciplinario: { label: 'Disciplinario', icon: Gavel, color: '#DC2626', bgColor: '#FEE2E2' },
  'organos-control': { label: 'Órganos de Control', icon: Building2, color: '#2563EB', bgColor: '#DBEAFE' },
  asesoria: { label: 'Asesoría Jurídica', icon: FileQuestion, color: '#8B5CF6', bgColor: '#F5F3FF' },
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

export function ReportesGestionLegal() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaLegal>('todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [reportes, setReportes] = useState<ReporteLegal[]>(REPORTES_LEGALES);
  const [generando, setGenerando] = useState<string | null>(null);

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(r => {
      const matchCategoria = categoriaActiva === 'todos' || r.categoria === categoriaActiva;
      const matchBusqueda = !busqueda ||
        r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      return matchCategoria && matchBusqueda;
    });
  }, [reportes, categoriaActiva, busqueda]);

  const totalRegistros = reportes.reduce((sum, r) => sum + r.registros, 0);
  const totalFavoritos = reportes.filter(r => r.favorito).length;

  const handleGenerarReporte = async (reporte: ReporteLegal, formato: FormatoExport) => {
    setGenerando(reporte.id);
    toast.loading(`Generando "${reporte.nombre}"...`, { id: `gen-${reporte.id}` });

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      const reportConfig = {
        name: reporte.nombre,
        description: reporte.descripcion,
        source: `Gestión Legal - ${CATEGORIAS_CONFIG[reporte.categoria].label}`,
        fields: reporte.campos,
        filters: [],
        exportFormat: formato as any,
        dateRange: 'Últimos 12 meses',
      };

      const data = generateReportData(reportConfig);

      if (formato === 'csv') exportToCSV(data, reportConfig);
      else if (formato === 'excel') exportToExcel(data, reportConfig);
      else if (formato === 'pdf') exportToPDF(data, reportConfig);

      setReportes(prev => prev.map(r =>
        r.id === reporte.id ? { ...r, ultimaGeneracion: 'Ahora mismo' } : r
      ));

      toast.success(`✅ Reporte generado exitosamente`, {
        id: `gen-${reporte.id}`,
        description: `Formato: ${formato.toUpperCase()} · ${reporte.tamanoEstimado}`,
      });
    } catch {
      toast.error('Error al generar el reporte', { id: `gen-${reporte.id}` });
    } finally {
      setGenerando(null);
    }
  };

  const handleToggleFavorito = (id: string) => {
    setReportes(prev => prev.map(r =>
      r.id === id ? { ...r, favorito: !r.favorito } : r
    ));
    const r = reportes.find(r => r.id === id);
    toast.success(r?.favorito ? 'Quitado de favoritos' : 'Agregado a favoritos', { duration: 2000 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        title="Reportes"
        subtitle="Analítica avanzada y trazabilidad de todos los procesos del área legal"
        buttons={[]}
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Reportes Disponibles',
            value: reportes.length,
            icon: <FileText className="w-5 h-5 text-blue-600" />,
            color: '#003DA5',
          },
          {
            label: 'Total Registros',
            value: totalRegistros.toLocaleString('es-CO'),
            icon: <Database className="w-5 h-5 text-purple-600" />,
            color: '#7C3AED',
          },
          {
            label: 'Favoritos',
            value: totalFavoritos,
            icon: <Star className="w-5 h-5 text-yellow-500" />,
            color: '#F59E0B',
          },
          {
            label: 'Módulos Cubiertos',
            value: Object.keys(CATEGORIAS_CONFIG).length - 1,
            icon: <Layers className="w-5 h-5 text-green-600" />,
            color: '#10B981',
          },
        ]}
      />

      {/* Filtros de categoría */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CATEGORIAS_CONFIG) as [CategoriaLegal, typeof CATEGORIAS_CONFIG[CategoriaLegal]][]).map(([id, cfg]) => {
            const Icon = cfg.icon;
            const isActive = categoriaActiva === id;
            const count = id === 'todos' ? reportes.length : reportes.filter(r => r.categoria === id).length;
            return (
              <button
                key={id}
                onClick={() => setCategoriaActiva(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: cfg.color } : {}}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Barra de búsqueda y vista */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar reportes..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-10"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
          <Button
            variant={vistaGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVistaGrid(true)}
            className={vistaGrid ? 'bg-[#003DA5] text-white' : ''}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={!vistaGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVistaGrid(false)}
            className={!vistaGrid ? 'bg-[#003DA5] text-white' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contador de resultados */}
      <p className="text-sm text-gray-500 px-1">
        Mostrando {reportesFiltrados.length} reporte{reportesFiltrados.length !== 1 ? 's' : ''}
        {totalFavoritos > 0 && <span className="ml-2 text-yellow-600">· {totalFavoritos} favorito{totalFavoritos !== 1 ? 's' : ''}</span>}
      </p>

      {/* Grid / Lista de reportes */}
      {reportesFiltrados.length === 0 ? (
        <Card className="p-12 text-center">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No se encontraron reportes</p>
          <p className="text-sm text-gray-400 mt-1">Prueba con otra búsqueda o categoría</p>
        </Card>
      ) : (
        <div className={vistaGrid
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
          : 'flex flex-col gap-3'
        }>
          {reportesFiltrados.map((reporte, idx) => (
            <ReporteCard
              key={reporte.id}
              reporte={reporte}
              vistaGrid={vistaGrid}
              generando={generando === reporte.id}
              onGenerar={handleGenerarReporte}
              onToggleFavorito={handleToggleFavorito}
              delay={idx * 0.04}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CARD DE REPORTE
// ──────────────────────────────────────────────────────────────────────────────

interface ReporteCardProps {
  reporte: ReporteLegal;
  vistaGrid: boolean;
  generando: boolean;
  onGenerar: (reporte: ReporteLegal, formato: FormatoExport) => void;
  onToggleFavorito: (id: string) => void;
  delay: number;
}

function ReporteCard({ reporte, vistaGrid, generando, onGenerar, onToggleFavorito, delay }: ReporteCardProps) {
  const [showFormats, setShowFormats] = useState(false);
  const cfg = CATEGORIAS_CONFIG[reporte.categoria];
  const Icon = cfg.icon;

  const formatos: { id: FormatoExport; label: string; icon: any }[] = [
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'csv', label: 'CSV', icon: Database },
  ];

  if (vistaGrid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.25 }}
      >
        <Card className="p-5 h-full flex flex-col hover:shadow-md transition-shadow">
          {/* Header de la card */}
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.bgColor }}
            >
              <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            </div>
            <button
              onClick={() => onToggleFavorito(reporte.id)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={reporte.favorito ? 'Quitar favorito' : 'Marcar favorito'}
            >
              <Star
                className="w-4 h-4"
                fill={reporte.favorito ? '#F59E0B' : 'none'}
                stroke={reporte.favorito ? '#F59E0B' : '#9CA3AF'}
              />
            </button>
          </div>

          <div className="flex-1">
            <Badge
              className="text-xs mb-2"
              style={{ backgroundColor: cfg.bgColor, color: cfg.color, border: 'none' }}
            >
              {cfg.label}
            </Badge>
            <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{reporte.nombre}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{reporte.descripcion}</p>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                {reporte.registros.toLocaleString('es-CO')} registros
              </span>
              <span>{reporte.tamanoEstimado}</span>
            </div>

            {reporte.ultimaGeneracion && (
              <p className="text-xs text-gray-400 mb-3">
                Última generación: {reporte.ultimaGeneracion}
              </p>
            )}
          </div>

          {/* Botón de generación */}
          <div className="relative">
            <Button
              className="w-full text-sm"
              style={{ background: cfg.color, color: '#fff' }}
              disabled={generando}
              onClick={() => setShowFormats(!showFormats)}
            >
              {generando ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generando...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Generar y Descargar<ChevronDown className="w-4 h-4 ml-auto" /></>
              )}
            </Button>
            {showFormats && !generando && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                {formatos.map(fmt => {
                  const FmtIcon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => { setShowFormats(false); onGenerar(reporte, fmt.id); }}
                    >
                      <FmtIcon className="w-4 h-4 text-gray-500" />
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Vista lista
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-gray-900 text-sm truncate">{reporte.nombre}</h3>
              {reporte.favorito && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="#F59E0B" />}
            </div>
            <p className="text-xs text-gray-500 truncate">{reporte.descripcion}</p>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
            <span>{reporte.registros.toLocaleString('es-CO')} reg.</span>
            <span>{reporte.tamanoEstimado}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {formatos.map(fmt => {
              const FmtIcon = fmt.icon;
              return (
                <Button
                  key={fmt.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={generando}
                  onClick={() => onGenerar(reporte, fmt.id)}
                  title={`Descargar ${fmt.label}`}
                >
                  <FmtIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline ml-1">{fmt.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
