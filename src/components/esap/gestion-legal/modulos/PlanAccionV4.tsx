/**
 * ModuloPlanAccionV4 - MOD-09: Plan de Acción Institucional
 * REDISEÑO COMPLETO - Estructura profesional tipo SAP Fiori / Microsoft Planner
 * 4 VISTAS: Dashboard, Lista (por defecto), Timeline, Matriz
 * ✅ ESAP 2025 - Con modales profesionales integrados
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Progress } from '../../../ui/progress';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  Target, BarChart3, Activity, TrendingUp, Award, CheckCircle, AlertCircle,
  Calendar, Eye, Plus, Search, Filter, List, Clock, User, Download,
  MoreVertical, Edit, Trash2, TrendingDown, AlertTriangle, Grid3x3,
  ChevronDown, ChevronRight, FileText, PieChart, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
// Importar modales ESAP 2025
import { ModalNuevoIndicador } from './ModalNuevoIndicador';
import { ModalEditarIndicador } from './ModalEditarIndicador';
import { ModalCargarAvance } from './ModalCargarAvance';
import { ModalDetalleIndicador } from './ModalDetalleIndicador';

// ==================== TIPOS ====================
interface Indicador {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  ejeEstrategico: 'GESTION_INSTITUCIONAL' | 'TALENTO_HUMANO' | 'TRANSPARENCIA' | 'TECNOLOGIA';
  responsable: string;
  meta: number;
  valorActual: number;
  avance: number; // % de cumplimiento
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  periodicidad: 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  tipoIndicador: 'EFICIENCIA' | 'EFICACIA' | 'GESTION' | 'TRANSPARENCIA';
  unidadMedida: string;
  ultimaActualizacion: Date;
}

type VistaModulo = 'dashboard' | 'lista' | 'timeline' | 'matriz';

// ==================== DATOS MOCK ====================
const indicadoresMock: Indicador[] = [
  // GESTIÓN INSTITUCIONAL
  {
    id: 'IND-2025-001',
    codigo: 'GI-001',
    nombre: 'Reducción de términos vencidos en procesos judiciales',
    descripcion: 'Reducir en 20% los términos vencidos en defensa judicial',
    ejeEstrategico: 'GESTION_INSTITUCIONAL',
    responsable: 'Dr. Carlos Mendoza Torres',
    meta: 80,
    valorActual: 75,
    avance: 94, // (75/80) * 100
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'EN_TIEMPO',
    prioridad: 'ALTA',
    periodicidad: 'MENSUAL',
    tipoIndicador: 'EFICIENCIA',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-28')
  },
  {
    id: 'IND-2025-002',
    codigo: 'GI-002',
    nombre: 'Digitalización de expedientes judiciales activos',
    descripcion: 'Digitalizar el 90% de los expedientes judiciales activos',
    ejeEstrategico: 'GESTION_INSTITUCIONAL',
    responsable: 'Dra. Patricia Ruiz Gómez',
    meta: 90,
    valorActual: 62,
    avance: 69, // (62/90) * 100
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'EN_RIESGO',
    prioridad: 'ALTA',
    periodicidad: 'TRIMESTRAL',
    tipoIndicador: 'GESTION',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-15')
  },

  // TALENTO HUMANO
  {
    id: 'IND-2025-003',
    codigo: 'TH-001',
    nombre: 'Capacitación en normativa jurídica actualizada',
    descripcion: 'Capacitar al 100% del equipo jurídico en nuevas leyes 2025',
    ejeEstrategico: 'TALENTO_HUMANO',
    responsable: 'Dra. Ana María López',
    meta: 100,
    valorActual: 45,
    avance: 45,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-06-30'),
    estado: 'EN_RIESGO',
    prioridad: 'MEDIA',
    periodicidad: 'SEMESTRAL',
    tipoIndicador: 'GESTION',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-20')
  },
  {
    id: 'IND-2025-004',
    codigo: 'TH-002',
    nombre: 'Certificación en competencias jurídicas especializadas',
    descripcion: 'Lograr que el 80% del equipo obtenga certificación profesional',
    ejeEstrategico: 'TALENTO_HUMANO',
    responsable: 'Dr. Roberto Silva',
    meta: 80,
    valorActual: 28,
    avance: 35,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-11-30'),
    estado: 'VENCIDO',
    prioridad: 'ALTA',
    periodicidad: 'ANUAL',
    tipoIndicador: 'EFICACIA',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-01')
  },

  // TRANSPARENCIA
  {
    id: 'IND-2025-005',
    codigo: 'TR-001',
    nombre: 'Publicación de decisiones judiciales relevantes',
    descripcion: 'Publicar el 100% de decisiones en plataforma institucional',
    ejeEstrategico: 'TRANSPARENCIA',
    responsable: 'Dra. Laura Martínez',
    meta: 100,
    valorActual: 92,
    avance: 92,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'EN_TIEMPO',
    prioridad: 'ALTA',
    periodicidad: 'MENSUAL',
    tipoIndicador: 'TRANSPARENCIA',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-27')
  },
  {
    id: 'IND-2025-006',
    codigo: 'TR-002',
    nombre: 'Atención oportuna a derechos de petición',
    descripcion: 'Responder el 95% de derechos de petición dentro del término legal',
    ejeEstrategico: 'TRANSPARENCIA',
    responsable: 'Dr. Miguel Ángel Vargas',
    meta: 95,
    valorActual: 88,
    avance: 93,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'EN_TIEMPO',
    prioridad: 'ALTA',
    periodicidad: 'MENSUAL',
    tipoIndicador: 'EFICIENCIA',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-26')
  },

  // TECNOLOGÍA
  {
    id: 'IND-2025-007',
    codigo: 'TEC-001',
    nombre: 'Automatización de alertas de términos procesales',
    descripcion: 'Implementar sistema de alertas automáticas en el 100% de procesos',
    ejeEstrategico: 'TECNOLOGIA',
    responsable: 'Ing. Andrés Jiménez',
    meta: 100,
    valorActual: 78,
    avance: 78,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-09-30'),
    estado: 'EN_RIESGO',
    prioridad: 'ALTA',
    periodicidad: 'TRIMESTRAL',
    tipoIndicador: 'GESTION',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-22')
  },
  {
    id: 'IND-2025-008',
    codigo: 'TEC-002',
    nombre: 'Adopción de firma electrónica avanzada',
    descripcion: 'Lograr que el 90% de documentos se firmen electrónicamente',
    ejeEstrategico: 'TECNOLOGIA',
    responsable: 'Dra. Carolina Pérez',
    meta: 90,
    valorActual: 55,
    avance: 61,
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'EN_RIESGO',
    prioridad: 'MEDIA',
    periodicidad: 'TRIMESTRAL',
    tipoIndicador: 'EFICACIA',
    unidadMedida: '%',
    ultimaActualizacion: new Date('2025-12-18')
  }
];

// ==================== HELPERS ====================
const getEjeConfig = (eje: string) => {
  const configs = {
    GESTION_INSTITUCIONAL: {
      nombre: 'Gestión Institucional',
      color: '#2962FF',
      bgColor: '#E3F2FD',
      icon: '🏛️'
    },
    TALENTO_HUMANO: {
      nombre: 'Talento Humano',
      color: '#F57C00',
      bgColor: '#FFF3E0',
      icon: '👥'
    },
    TRANSPARENCIA: {
      nombre: 'Transparencia',
      color: '#00C853',
      bgColor: '#E8F5E9',
      icon: '🔍'
    },
    TECNOLOGIA: {
      nombre: 'Tecnología',
      color: '#9C27B0',
      bgColor: '#F3E5F5',
      icon: '💻'
    }
  };
  return configs[eje] || configs.GESTION_INSTITUCIONAL;
};

const getEstadoConfig = (estado: string) => {
  const configs = {
    EN_TIEMPO: {
      nombre: 'En Tiempo',
      color: '#10B981',
      bgColor: '#D1FAE5',
      iconType: 'check'
    },
    EN_RIESGO: {
      nombre: 'En Riesgo',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      iconType: 'alert'
    },
    VENCIDO: {
      nombre: 'Vencido',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      iconType: 'warning'
    },
    COMPLETADO: {
      nombre: 'Completado',
      color: '#059669',
      bgColor: '#D1FAE5',
      iconType: 'check'
    }
  };
  return configs[estado] || configs.EN_TIEMPO;
};

const getEstadoIcon = (iconType: string) => {
  if (iconType === 'check') return <CheckCircle className="w-3 h-3" />;
  if (iconType === 'alert') return <AlertCircle className="w-3 h-3" />;
  if (iconType === 'warning') return <AlertTriangle className="w-3 h-3" />;
  return <CheckCircle className="w-3 h-3" />;
};

const getSemaforoColor = (avance: number) => {
  if (avance >= 90) return '#10B981'; // Verde
  if (avance >= 50) return '#F59E0B'; // Amarillo
  return '#DC2626'; // Rojo
};

// ==================== COMPONENTE PRINCIPAL ====================
export function ModuloPlanAccionV4() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['GESTION_INSTITUCIONAL', 'TALENTO_HUMANO', 'TRANSPARENCIA', 'TECNOLOGIA']));

  // Estados para modales ESAP 2025
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalAvanceOpen, setModalAvanceOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [indicadorSeleccionado, setIndicadorSeleccionado] = useState<Indicador | null>(null);

  // Handlers para modales
  const handleVerDetalles = (indicador: Indicador) => {
    setIndicadorSeleccionado(indicador);
    setModalDetalleOpen(true);
  };

  const handleEditarIndicador = (indicador?: Indicador) => {
    if (indicador) {
      setIndicadorSeleccionado(indicador);
    }
    setModalDetalleOpen(false); // Cerrar detalle si está abierto
    setModalEditarOpen(true);
  };

  const handleCargarAvance = (indicador?: Indicador) => {
    if (indicador) {
      setIndicadorSeleccionado(indicador);
    }
    setModalDetalleOpen(false); // Cerrar detalle si está abierto
    setModalAvanceOpen(true);
  };

  const handleNuevoIndicador = () => {
    setModalNuevoOpen(true);
  };

  // Filtrar indicadores
  const indicadoresFiltrados = useMemo(() => {
    let resultado = [...indicadoresMock];

    if (busqueda) {
      resultado = resultado.filter(i =>
        i.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.responsable.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroEje !== 'TODOS') {
      resultado = resultado.filter(i => i.ejeEstrategico === filtroEje);
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(i => i.estado === filtroEstado);
    }

    return resultado;
  }, [busqueda, filtroEje, filtroEstado]);

  // Agrupar por eje estratégico
  const indicadoresAgrupados = useMemo(() => {
    const grupos = {
      GESTION_INSTITUCIONAL: [],
      TALENTO_HUMANO: [],
      TRANSPARENCIA: [],
      TECNOLOGIA: []
    };

    indicadoresFiltrados.forEach(ind => {
      grupos[ind.ejeEstrategico].push(ind);
    });

    return grupos;
  }, [indicadoresFiltrados]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const total = indicadoresMock.length;
    const avancePromedio = Math.round(
      indicadoresMock.reduce((sum, i) => sum + i.avance, 0) / total
    );
    const enTiempo = indicadoresMock.filter(i => i.estado === 'EN_TIEMPO').length;
    const enRiesgo = indicadoresMock.filter(i => i.estado === 'EN_RIESGO').length;
    const vencidos = indicadoresMock.filter(i => i.estado === 'VENCIDO').length;

    return { total, avancePromedio, enTiempo, enRiesgo, vencidos };
  }, []);

  const toggleGroup = (eje: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(eje)) {
      newExpanded.delete(eje);
    } else {
      newExpanded.add(eje);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        title={isMobile ? 'Plan de Acción' : 'Plan de Acción Institucional'}
        subtitle="Seguimiento a indicadores y objetivos estratégicos del PEI"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as VistaModulo),
          options: [
            { label: 'Dashboard', icon: '📊', value: 'dashboard' },
            { label: 'Lista', icon: '📋', value: 'lista' },
            { label: 'Timeline', icon: '📅', value: 'timeline' },
            { label: 'Matriz', icon: '⊞', value: 'matriz' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Indicador',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: handleNuevoIndicador,
            variant: 'primary'
          },
          {
            label: 'Exportar',
            labelMobile: 'Exportar',
            icon: <Download className="w-4 h-4" />,
            onClick: () => toast.info('Exportar Plan de Acción'),
            variant: 'outline'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Plan de Acción"
            variant="icon"
            sections={[
              {
                label: "🎯 Propósito del Módulo",
                content: "Seguimiento y control de indicadores del Plan Estratégico Institucional (PEI). Permite monitorear el cumplimiento de objetivos estratégicos, metas institucionales y compromisos de gestión.",
                type: "default"
              },
              {
                label: "📊 4 Vistas Disponibles",
                content: "• Dashboard: Visualización ejecutiva con gráficos y KPIs | • Lista: Tabla detallada agrupada por eje estratégico | • Timeline: Línea de tiempo de cumplimiento | • Matriz: Cuadro de mando integral",
                type: "premium"
              },
              {
                label: "🗂️ Ejes Estratégicos",
                content: "1️⃣ Gestión Institucional: Eficiencia en procesos | 2️⃣ Talento Humano: Capacitación y competencias | 3️⃣ Transparencia: Rendición de cuentas | 4️⃣ Tecnología: Transformación digital",
                type: "info"
              },
              {
                label: "🚦 Semáforo de Cumplimiento",
                content: "🟢 Verde (≥90%): Meta cumplida | 🟡 Amarillo (50-89%): En riesgo | 🔴 Rojo (<50%): Requiere acción inmediata",
                type: "warning"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total Indicadores',
            value: metricas.total.toString(),
            icon: <Target className="w-4 h-4" />,
            color: 'blue'
          },
          {
            label: 'Cumplimiento Promedio',
            value: `${metricas.avancePromedio}%`,
            icon: <Activity className="w-4 h-4" />,
            color: metricas.avancePromedio >= 90 ? 'green' : metricas.avancePromedio >= 50 ? 'yellow' : 'red'
          },
          {
            label: 'En Riesgo / Vencidos',
            value: `${metricas.enRiesgo + metricas.vencidos}`,
            icon: <AlertCircle className="w-4 h-4" />,
            color: metricas.vencidos > 0 ? 'red' : 'yellow'
          }
        ]}
      />

      {/* Filtros */}
      <Card className="border-2 border-gray-200 bg-white">
        <div className="p-4 space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nombre o responsable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2 border-gray-300 focus:border-blue-500"
            />
          </div>

          {/* Filtros en línea */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroEje}
              onChange={(e) => setFiltroEje(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="TODOS">Todos los Ejes</option>
              <option value="GESTION_INSTITUCIONAL">🏛️ Gestión Institucional</option>
              <option value="TALENTO_HUMANO">👥 Talento Humano</option>
              <option value="TRANSPARENCIA">🔍 Transparencia</option>
              <option value="TECNOLOGIA">💻 Tecnología</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="EN_TIEMPO">✅ En Tiempo</option>
              <option value="EN_RIESGO">⚠️ En Riesgo</option>
              <option value="VENCIDO">🔴 Vencido</option>
              <option value="COMPLETADO">🎉 Completado</option>
            </select>

            {(busqueda || filtroEje !== 'TODOS' || filtroEstado !== 'TODOS') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBusqueda('');
                  setFiltroEje('TODOS');
                  setFiltroEstado('TODOS');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-bold text-blue-600">{indicadoresFiltrados.length}</span> de {indicadoresMock.length} indicadores
            </p>
          </div>
        </div>
      </Card>

      {/* RENDERIZAR VISTAS */}
      {tipoVista === 'dashboard' && <VistaDashboard indicadores={indicadoresMock} />}
      {tipoVista === 'lista' && (
        <VistaLista
          indicadoresAgrupados={indicadoresAgrupados}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onVerDetalles={handleVerDetalles}
          onEditarIndicador={handleEditarIndicador}
          onCargarAvance={handleCargarAvance}
        />
      )}
      {tipoVista === 'timeline' && <VistaTimeline indicadores={indicadoresFiltrados} />}
      {tipoVista === 'matriz' && <VistaMatriz indicadores={indicadoresMock} />}

      {/* MODALES ESAP 2025 */}
      <ModalNuevoIndicador
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onGuardar={(data) => {
          console.log('Nuevo indicador:', data);
          // Aquí iría la lógica para guardar en el backend
        }}
      />

      <ModalEditarIndicador
        isOpen={modalEditarOpen}
        onClose={() => {
          setModalEditarOpen(false);
          setIndicadorSeleccionado(null);
        }}
        indicador={indicadorSeleccionado}
        onGuardar={(data) => {
          console.log('Indicador actualizado:', data);
          // Aquí iría la lógica para actualizar en el backend
        }}
      />

      <ModalCargarAvance
        isOpen={modalAvanceOpen}
        onClose={() => {
          setModalAvanceOpen(false);
          setIndicadorSeleccionado(null);
        }}
        indicador={indicadorSeleccionado}
        onGuardar={(data) => {
          console.log('Avance actualizado:', data);
          // Aquí iría la lógica para guardar el avance
        }}
      />

      <ModalDetalleIndicador
        isOpen={modalDetalleOpen}
        onClose={() => {
          setModalDetalleOpen(false);
          setIndicadorSeleccionado(null);
        }}
        indicador={indicadorSeleccionado}
        onEditar={() => handleEditarIndicador(indicadorSeleccionado!)}
        onCargarAvance={() => handleCargarAvance(indicadorSeleccionado!)}
      />
    </div>
  );
}

// ==================== VISTA LISTA (Por defecto) ====================
interface VistaListaProps {
  indicadoresAgrupados: Record<string, Indicador[]>;
  expandedGroups: Set<string>;
  toggleGroup: (eje: string) => void;
  onVerDetalles: (indicador: Indicador) => void;
  onEditarIndicador: (indicador: Indicador) => void;
  onCargarAvance: (indicador: Indicador) => void;
}

function VistaLista({ 
  indicadoresAgrupados, 
  expandedGroups, 
  toggleGroup,
  onVerDetalles,
  onEditarIndicador,
  onCargarAvance
}: VistaListaProps) {
  return (
    <div className="space-y-3">
      {Object.entries(indicadoresAgrupados).map(([eje, indicadores]: [string, Indicador[]]) => {
        const ejeConfig = getEjeConfig(eje);
        const isExpanded = expandedGroups.has(eje);
        const avanceEje = indicadores.length > 0
          ? Math.round(indicadores.reduce((sum, i) => sum + i.avance, 0) / indicadores.length)
          : 0;

        return (
          <Card key={eje} className="border-2 border-gray-200 bg-white overflow-hidden">
            {/* Header del grupo */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderLeft: `4px solid ${ejeConfig.color}` }}
              onClick={() => toggleGroup(eje)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <span className="text-2xl">{ejeConfig.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{ejeConfig.nombre}</h3>
                    <p className="text-sm text-gray-600">{indicadores.length} indicadores</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Barra de progreso del eje */}
                  <div className="hidden md:flex items-center gap-2">
                    <div className="w-32">
                      <Progress value={avanceEje} className="h-2" />
                    </div>
                    <span
                      className="text-sm font-bold min-w-[3rem] text-right"
                      style={{ color: getSemaforoColor(avanceEje) }}
                    >
                      {avanceEje}%
                    </span>
                  </div>

                  <Badge
                    className="font-bold"
                    style={{
                      backgroundColor: ejeConfig.bgColor,
                      color: ejeConfig.color
                    }}
                  >
                    {indicadores.length} IND
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tabla de indicadores */}
            {isExpanded && indicadores.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-y-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                        Código
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                        Indicador
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                        Responsable
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                        Meta
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                        Actual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                        % Cumplimiento
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                        Fecha Límite
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {indicadores.map((ind: Indicador) => {
                      const estadoConfig = getEstadoConfig(ind.estado);
                      return (
                        <tr
                          key={ind.id}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-bold" style={{ color: ejeConfig.color }}>
                              {ind.codigo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                {ind.nombre}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {ind.descripcion}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback
                                  className="text-xs"
                                  style={{
                                    backgroundColor: ejeConfig.bgColor,
                                    color: ejeConfig.color
                                  }}
                                >
                                  {ind.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-700 max-w-[150px] truncate">
                                {ind.responsable}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">
                              {ind.meta}{ind.unidadMedida}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="text-sm font-semibold text-blue-600">
                              {ind.valorActual}{ind.unidadMedida}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-[100px]">
                                <Progress value={ind.avance} className="h-2" />
                              </div>
                              <span
                                className="text-sm font-bold min-w-[3rem] text-right"
                                style={{ color: getSemaforoColor(ind.avance) }}
                              >
                                {ind.avance}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              className="text-xs font-semibold flex items-center gap-1 w-fit mx-auto"
                              style={{
                                backgroundColor: estadoConfig.bgColor,
                                color: estadoConfig.color,
                                border: `1px solid ${estadoConfig.color}`
                              }}
                            >
                              {getEstadoIcon(estadoConfig.iconType)}
                              {estadoConfig.nombre}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                              <Calendar className="w-3 h-3" />
                              {ind.fechaFin.toLocaleDateString('es-CO')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => onVerDetalles(ind)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onCargarAvance(ind)}>
                                    <Activity className="w-4 h-4 mr-2" />
                                    Actualizar Avance
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onEditarIndicador(ind)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toast.info('Descargar reporte')}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar Reporte
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toast.error('Eliminar indicador')}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {isExpanded && indicadores.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No hay indicadores en este eje estratégico
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ==================== VISTA DASHBOARD ====================
function VistaDashboard({ indicadores }: { indicadores: Indicador[] }) {
  // Calcular estadísticas por eje
  const estadisticasPorEje = useMemo(() => {
    const ejes = ['GESTION_INSTITUCIONAL', 'TALENTO_HUMANO', 'TRANSPARENCIA', 'TECNOLOGIA'];
    return ejes.map(eje => {
      const indsEje = indicadores.filter(i => i.ejeEstrategico === eje);
      const avancePromedio = indsEje.length > 0
        ? Math.round(indsEje.reduce((sum, i) => sum + i.avance, 0) / indsEje.length)
        : 0;
      return {
        eje,
        total: indsEje.length,
        avancePromedio,
        config: getEjeConfig(eje)
      };
    });
  }, [indicadores]);

  return (
    <div className="space-y-4">
      {/* Cards por eje estratégico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estadisticasPorEje.map(({ eje, total, avancePromedio, config }) => (
          <Card key={eje} className="border-2 border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{config.nombre}</h4>
                  <p className="text-xs text-gray-600">{total} indicadores</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={avancePromedio} className="h-3" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Cumplimiento</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: getSemaforoColor(avancePromedio) }}
                >
                  {avancePromedio}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Top indicadores en riesgo */}
      <Card className="border-2 border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-gray-900">Indicadores que Requieren Atención</h3>
        </div>
        <div className="space-y-2">
          {indicadores
            .filter(i => i.estado === 'EN_RIESGO' || i.estado === 'VENCIDO')
            .slice(0, 5)
            .map(ind => {
              const ejeConfig = getEjeConfig(ind.ejeEstrategico);
              const estadoConfig = getEstadoConfig(ind.estado);
              return (
                <div
                  key={ind.id}
                  className="p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: ejeConfig.bgColor,
                            color: ejeConfig.color
                          }}
                        >
                          {ind.codigo}
                        </Badge>
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: estadoConfig.bgColor,
                            color: estadoConfig.color
                          }}
                        >
                          {estadoConfig.nombre}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{ind.nombre}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        👤 {ind.responsable} • 📅 Vence: {ind.fechaFin.toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold" style={{ color: getSemaforoColor(ind.avance) }}>
                        {ind.avance}%
                      </div>
                      <div className="text-xs text-gray-600">
                        {ind.valorActual}/{ind.meta} {ind.unidadMedida}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}

// ==================== VISTA TIMELINE ====================
function VistaTimeline({ indicadores }: { indicadores: Indicador[] }) {
  const indicadoresOrdenados = [...indicadores].sort(
    (a, b) => a.fechaFin.getTime() - b.fechaFin.getTime()
  );

  return (
    <Card className="border-2 border-gray-200 bg-white p-6">
      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        Línea de Tiempo de Cumplimiento
      </h3>
      <div className="space-y-4">
        {indicadoresOrdenados.map((ind, index) => {
          const ejeConfig = getEjeConfig(ind.ejeEstrategico);
          const estadoConfig = getEstadoConfig(ind.estado);
          const diasRestantes = Math.ceil(
            (ind.fechaFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div key={ind.id} className="flex gap-4">
              {/* Timeline visual */}
              <div className="flex flex-col items-center">
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{
                    backgroundColor: ejeConfig.color,
                    borderColor: ejeConfig.color
                  }}
                />
                {index < indicadoresOrdenados.length - 1 && (
                  <div
                    className="w-0.5 flex-1 min-h-[60px]"
                    style={{ backgroundColor: '#E5E7EB' }}
                  />
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-6">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className="text-xs font-bold"
                          style={{
                            backgroundColor: ejeConfig.bgColor,
                            color: ejeConfig.color
                          }}
                        >
                          {ind.codigo}
                        </Badge>
                        <span className="text-xs text-gray-600">{ejeConfig.nombre}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{ind.nombre}</h4>
                      <p className="text-xs text-gray-600 mt-1">👤 {ind.responsable}</p>
                    </div>
                    <Badge
                      className="text-xs"
                      style={{
                        backgroundColor: estadoConfig.bgColor,
                        color: estadoConfig.color
                      }}
                    >
                      {estadoConfig.nombre}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <Progress value={ind.avance} className="h-2" />
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: getSemaforoColor(ind.avance) }}
                    >
                      {ind.avance}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-600">
                      📅 Vence: {ind.fechaFin.toLocaleDateString('es-CO')}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        diasRestantes < 0
                          ? 'text-red-600'
                          : diasRestantes < 30
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {diasRestantes < 0
                        ? `Vencido hace ${Math.abs(diasRestantes)} días`
                        : `${diasRestantes} días restantes`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ==================== VISTA MATRIZ ====================
function VistaMatriz({ indicadores }: { indicadores: Indicador[] }) {
  // Agrupar por eje y estado
  const matriz = useMemo(() => {
    const ejes = ['GESTION_INSTITUCIONAL', 'TALENTO_HUMANO', 'TRANSPARENCIA', 'TECNOLOGIA'];
    const estados = ['EN_TIEMPO', 'EN_RIESGO', 'VENCIDO'];

    return ejes.map(eje => {
      const ejeConfig = getEjeConfig(eje);
      return {
        eje,
        config: ejeConfig,
        estados: estados.map(estado => ({
          estado,
          indicadores: indicadores.filter(
            i => i.ejeEstrategico === eje && i.estado === estado
          )
        }))
      };
    });
  }, [indicadores]);

  return (
    <div className="space-y-4">
      <Card className="border-2 border-gray-200 bg-white p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-blue-600" />
          Cuadro de Mando Integral - Matriz por Estado
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-2 border-gray-300 px-4 py-3 text-left font-bold text-gray-900">
                  Eje Estratégico
                </th>
                <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-green-600">
                  ✅ En Tiempo
                </th>
                <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-orange-600">
                  ⚠️ En Riesgo
                </th>
                <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-red-600">
                  🔴 Vencido
                </th>
                <th className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {matriz.map(({ eje, config, estados }) => {
                const total = estados.reduce((sum, e) => sum + e.indicadores.length, 0);
                return (
                  <tr key={eje} className="hover:bg-gray-50">
                    <td
                      className="border-2 border-gray-300 px-4 py-3 font-bold"
                      style={{ color: config.color }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{config.icon}</span>
                        {config.nombre}
                      </div>
                    </td>
                    {estados.map(({ estado, indicadores }) => (
                      <td
                        key={estado}
                        className="border-2 border-gray-300 px-4 py-3 text-center"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl font-bold text-gray-900">
                            {indicadores.length}
                          </span>
                          {indicadores.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {indicadores.slice(0, 3).map(ind => (
                                <span
                                  key={ind.id}
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: config.bgColor,
                                    color: config.color
                                  }}
                                  title={ind.nombre}
                                >
                                  {ind.codigo}
                                </span>
                              ))}
                              {indicadores.length > 3 && (
                                <span className="text-xs text-gray-600">
                                  +{indicadores.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="border-2 border-gray-300 px-4 py-3 text-center">
                      <span className="text-xl font-bold text-gray-900">{total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="border-2 border-gray-300 px-4 py-3 font-bold text-gray-900">
                  TOTALES
                </td>
                <td className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-green-600">
                  {indicadores.filter(i => i.estado === 'EN_TIEMPO').length}
                </td>
                <td className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-orange-600">
                  {indicadores.filter(i => i.estado === 'EN_RIESGO').length}
                </td>
                <td className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-red-600">
                  {indicadores.filter(i => i.estado === 'VENCIDO').length}
                </td>
                <td className="border-2 border-gray-300 px-4 py-3 text-center font-bold text-gray-900">
                  {indicadores.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Leyenda */}
      <Card className="border-2 border-gray-200 bg-white p-4">
        <h4 className="font-bold text-gray-900 mb-3">📋 Leyenda de Estados</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700">
              <strong>En Tiempo:</strong> Cumplimiento ≥90% o avance según cronograma
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-700">
              <strong>En Riesgo:</strong> Cumplimiento 50-89% o retraso moderado
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-700">
              <strong>Vencido:</strong> Cumplimiento &lt;50% o plazo vencido
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}