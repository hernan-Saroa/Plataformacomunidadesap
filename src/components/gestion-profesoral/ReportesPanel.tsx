import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3,
  FileText,
  Download,
  Calendar,
  Users,
  TrendingUp,
  Filter,
  Settings,
  CheckCircle,
  Clock,
  Award,
  BookOpen,
  Target
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface ReportesPanelProps {
  className?: string;
}

interface ReporteTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'Docentes' | 'PTAs' | 'Convocatorias' | 'Evaluación' | 'General';
  icono: any;
  parametros: Parametro[];
  formato: ('PDF' | 'Excel' | 'CSV')[];
}

interface Parametro {
  id: string;
  nombre: string;
  tipo: 'fecha' | 'select' | 'text' | 'number';
  requerido: boolean;
  opciones?: string[];
}

export function ReportesPanel({ className = '' }: ReportesPanelProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteTemplate | null>(null);
  const [parametrosReporte, setParametrosReporte] = useState<Record<string, any>>({});

  // Templates de reportes disponibles
  const reportesTemplates: ReporteTemplate[] = [
    {
      id: 'docentes-general',
      nombre: 'Listado General de Docentes',
      descripcion: 'Reporte completo con información de todos los docentes activos',
      categoria: 'Docentes',
      icono: Users,
      parametros: [
        { id: 'territorial', nombre: 'Territorial', tipo: 'select', requerido: false, opciones: ['Todas', 'Bogotá', 'Medellín', 'Cali'] },
        { id: 'estado', nombre: 'Estado', tipo: 'select', requerido: false, opciones: ['Todos', 'Activo', 'Inactivo', 'Licencia'] }
      ],
      formato: ['PDF', 'Excel', 'CSV']
    },
    {
      id: 'docentes-carga',
      nombre: 'Carga Académica por Docente',
      descripcion: 'Detalle de asignaciones y horas por docente',
      categoria: 'Docentes',
      icono: BookOpen,
      parametros: [
        { id: 'periodo', nombre: 'Periodo', tipo: 'select', requerido: true, opciones: ['2025-I', '2024-II', '2024-I'] },
        { id: 'departamento', nombre: 'Departamento', tipo: 'select', requerido: false, opciones: ['Todos', 'Derecho Público', 'Administración Pública'] }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'ptas-periodo',
      nombre: 'PTAs por Periodo',
      descripcion: 'Consolidado de Planes de Trabajo Académico',
      categoria: 'PTAs',
      icono: FileText,
      parametros: [
        { id: 'periodo', nombre: 'Periodo', tipo: 'select', requerido: true, opciones: ['2025-I', '2024-II', '2024-I'] },
        { id: 'estado', nombre: 'Estado', tipo: 'select', requerido: false, opciones: ['Todos', 'Aprobado', 'En Revisión', 'Pendiente'] }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'ptas-cumplimiento',
      nombre: 'Cumplimiento de PTAs',
      descripcion: 'Análisis de cumplimiento de componentes',
      categoria: 'PTAs',
      icono: Target,
      parametros: [
        { id: 'periodo', nombre: 'Periodo', tipo: 'select', requerido: true, opciones: ['2025-I', '2024-II', '2024-I'] },
        { id: 'territorial', nombre: 'Territorial', tipo: 'select', requerido: false, opciones: ['Todas', 'Bogotá', 'Medellín', 'Cali'] }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'convocatorias-historico',
      nombre: 'Histórico de Convocatorias',
      descripcion: 'Reporte de convocatorias realizadas y sus resultados',
      categoria: 'Convocatorias',
      icono: Calendar,
      parametros: [
        { id: 'fecha_inicio', nombre: 'Fecha Inicio', tipo: 'fecha', requerido: true },
        { id: 'fecha_fin', nombre: 'Fecha Fin', tipo: 'fecha', requerido: true },
        { id: 'tipo', nombre: 'Tipo', tipo: 'select', requerido: false, opciones: ['Todos', 'Concurso Público', 'Mérito', 'Ocasional'] }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'convocatorias-candidatos',
      nombre: 'Candidatos por Convocatoria',
      descripcion: 'Detalle de candidatos y calificaciones',
      categoria: 'Convocatorias',
      icono: Award,
      parametros: [
        { id: 'convocatoria', nombre: 'Convocatoria', tipo: 'text', requerido: true }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'evaluacion-consolidado',
      nombre: 'Consolidado de Evaluaciones',
      descripcion: 'Resultados de evaluación docente por periodo',
      categoria: 'Evaluación',
      icono: BarChart3,
      parametros: [
        { id: 'periodo', nombre: 'Periodo', tipo: 'select', requerido: true, opciones: ['2025-I', '2024-II', '2024-I'] },
        { id: 'departamento', nombre: 'Departamento', tipo: 'select', requerido: false, opciones: ['Todos', 'Derecho Público', 'Administración Pública'] }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'evaluacion-tendencias',
      nombre: 'Tendencias de Evaluación',
      descripcion: 'Análisis de tendencias en múltiples periodos',
      categoria: 'Evaluación',
      icono: TrendingUp,
      parametros: [
        { id: 'periodos', nombre: 'Cantidad de Periodos', tipo: 'number', requerido: true }
      ],
      formato: ['PDF', 'Excel']
    },
    {
      id: 'general-estadisticas',
      nombre: 'Estadísticas Generales',
      descripcion: 'Dashboard ejecutivo con indicadores clave',
      categoria: 'General',
      icono: BarChart3,
      parametros: [
        { id: 'periodo', nombre: 'Periodo', tipo: 'select', requerido: true, opciones: ['2025-I', '2024-II', '2024-I'] }
      ],
      formato: ['PDF']
    }
  ];

  const categorias = [
    { id: 'todos', label: 'Todos', count: reportesTemplates.length },
    { id: 'Docentes', label: 'Docentes', count: reportesTemplates.filter(r => r.categoria === 'Docentes').length },
    { id: 'PTAs', label: 'PTAs', count: reportesTemplates.filter(r => r.categoria === 'PTAs').length },
    { id: 'Convocatorias', label: 'Convocatorias', count: reportesTemplates.filter(r => r.categoria === 'Convocatorias').length },
    { id: 'Evaluación', label: 'Evaluación', count: reportesTemplates.filter(r => r.categoria === 'Evaluación').length },
    { id: 'General', label: 'General', count: reportesTemplates.filter(r => r.categoria === 'General').length }
  ];

  const reportesFiltrados = reportesTemplates.filter(
    r => categoriaSeleccionada === 'todos' || r.categoria === categoriaSeleccionada
  );

  const handleGenerarReporte = (formato: string) => {
    console.log('Generando reporte:', {
      reporte: reporteSeleccionado?.id,
      formato,
      parametros: parametrosReporte
    });
    // Aquí iría la lógica de generación
  };

  const handleParametroChange = (parametroId: string, value: any) => {
    setParametrosReporte({ ...parametrosReporte, [parametroId]: value });
  };

  const validateParametros = (): boolean => {
    if (!reporteSeleccionado) return false;
    
    const requeridos = reporteSeleccionado.parametros.filter(p => p.requerido);
    return requeridos.every(p => parametrosReporte[p.id]);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Centro de Reportes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Genera reportes personalizados del módulo profesoral
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoriaSeleccionada(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              categoriaSeleccionada === cat.id
                ? 'bg-[#1e5da8] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Reportes */}
        <div className="lg:col-span-2 space-y-3">
          {reportesFiltrados.map((reporte, index) => {
            const Icon = reporte.icono;
            const isSelected = reporteSeleccionado?.id === reporte.id;

            return (
              <motion.div
                key={reporte.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 border-[#1e5da8] shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setReporteSeleccionado(reporte)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[#1e5da8] text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{reporte.nombre}</h3>
                        <Badge variant="secondary" className="ml-2">
                          {reporte.categoria}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{reporte.descripcion}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Formatos disponibles:</span>
                        {reporte.formato.map((formato) => (
                          <Badge key={formato} variant="secondary" className="text-xs">
                            {formato}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle className="w-6 h-6 text-[#1e5da8] flex-shrink-0" />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Panel de Generación */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            {!reporteSeleccionado ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Selecciona un Reporte</h3>
                <p className="text-sm text-gray-600">
                  Elige un reporte de la lista para configurar sus parámetros y generarlo
                </p>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Configurar Parámetros</h3>
                  
                  <div className="space-y-4">
                    {reporteSeleccionado.parametros.map((parametro) => (
                      <div key={parametro.id}>
                        <Label htmlFor={parametro.id}>
                          {parametro.nombre}
                          {parametro.requerido && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {parametro.tipo === 'select' ? (
                          <select
                            id={parametro.id}
                            value={parametrosReporte[parametro.id] || ''}
                            onChange={(e) => handleParametroChange(parametro.id, e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Seleccionar...</option>
                            {parametro.opciones?.map((opcion) => (
                              <option key={opcion} value={opcion}>
                                {opcion}
                              </option>
                            ))}
                          </select>
                        ) : parametro.tipo === 'fecha' ? (
                          <Input
                            id={parametro.id}
                            type="date"
                            value={parametrosReporte[parametro.id] || ''}
                            onChange={(e) => handleParametroChange(parametro.id, e.target.value)}
                            className="mt-1"
                          />
                        ) : parametro.tipo === 'number' ? (
                          <Input
                            id={parametro.id}
                            type="number"
                            value={parametrosReporte[parametro.id] || ''}
                            onChange={(e) => handleParametroChange(parametro.id, e.target.value)}
                            className="mt-1"
                          />
                        ) : (
                          <Input
                            id={parametro.id}
                            type="text"
                            value={parametrosReporte[parametro.id] || ''}
                            onChange={(e) => handleParametroChange(parametro.id, e.target.value)}
                            className="mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Generar Reporte</h3>
                  
                  <div className="space-y-2">
                    {reporteSeleccionado.formato.map((formato) => (
                      <Button
                        key={formato}
                        onClick={() => handleGenerarReporte(formato)}
                        disabled={!validateParametros()}
                        className="w-full bg-[#1e5da8] hover:bg-[#1a4d8f]"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar como {formato}
                      </Button>
                    ))}
                  </div>

                  {!validateParametros() && (
                    <p className="text-xs text-amber-600 mt-3 flex items-start gap-1">
                      <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Completa los parámetros requeridos para generar el reporte</span>
                    </p>
                  )}
                </Card>

                {/* Reportes Recientes */}
                <Card className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Generados Recientemente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">Listado Docentes</p>
                        <Badge variant="secondary" className="text-xs">PDF</Badge>
                      </div>
                      <p className="text-xs text-gray-600">Hace 2 horas</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">PTAs 2025-I</p>
                        <Badge variant="secondary" className="text-xs">Excel</Badge>
                      </div>
                      <p className="text-xs text-gray-600">Ayer</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
