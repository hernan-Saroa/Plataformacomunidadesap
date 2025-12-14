/**
 * RF002 - UNIVERSO DE AUDITORÍAS
 * Formulario automatizado basado en el formato DAFP (Departamento Administrativo de la Función Pública)
 * Evaluación y priorización de auditorías con cálculo automático de riesgo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  AlertTriangle,
  TrendingUp,
  Building2,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Download,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Calculator,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface ProcesoAuditable {
  id: string;
  nombreProceso: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string; // Si es territorial, cuál
  responsableProceso: string;
  
  // Evaluación de Impacto (1-5)
  impactoFinanciero: number;
  impactoOperacional: number;
  impactoReputacional: number;
  impactoLegal: number;
  impactoEstrategico: number;
  
  // Evaluación de Probabilidad (1-5)
  probabilidadOcurrencia: number;
  
  // Resultados calculados
  impactoTotal: number; // Promedio de impactos
  nivelRiesgo: number; // impacto × probabilidad
  clasificacionRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string; // Año 1, Año 1-2, etc.
  
  // Información adicional
  ultimaAuditoria: string; // Fecha
  observaciones: string;
  estado: 'Evaluado' | 'Pendiente' | 'En Revisión';
  fechaEvaluacion: string;
}

interface UniversoAuditorias {
  añoFiscal: number;
  version: string;
  fechaCreacion: string;
  responsable: string;
  estado: 'borrador' | 'aprobado' | 'vigente';
  procesos: ProcesoAuditable[];
}

// ============ CONSTANTES ============

const TERRITORIALES_ESAP = [
  'Antioquia',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Cauca',
  'Cesar',
  'Córdoba',
  'Cundinamarca',
  'Huila',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Santander',
  'Tolima'
];

const PROCESOS_ESAP = [
  // Procesos Misionales
  'Gestión de Programas Académicos',
  'Gestión de Investigación',
  'Gestión de Extensión y Proyección Social',
  'Gestión de Formación Virtual',
  
  // Procesos de Apoyo
  'Gestión Administrativa',
  'Gestión Financiera',
  'Gestión Contractual',
  'Gestión de Talento Humano',
  'Gestión de Tecnologías de la Información',
  'Gestión Documental',
  'Gestión Jurídica',
  'Gestión de Atención al Ciudadano',
  
  // Procesos Estratégicos
  'Direccionamiento Estratégico',
  'Gestión de Planeación Institucional',
  'Gestión de Comunicaciones',
  'Gestión de Calidad',
  
  // Proceso de Evaluación
  'Control Interno de Gestión'
];

const RESPONSABLES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Sandra Patricia Contreras Soto',
  'Catalina Rubio',
  'Fernando Ávila',
  'William Ramírez',
  'Sandra Montero',
  'Nubia Pimiento'
];

// ============ FUNCIONES DE CÁLCULO ============

function calcularImpactoTotal(proceso: Partial<ProcesoAuditable>): number {
  const impactos = [
    proceso.impactoFinanciero || 0,
    proceso.impactoOperacional || 0,
    proceso.impactoReputacional || 0,
    proceso.impactoLegal || 0,
    proceso.impactoEstrategico || 0
  ];
  return Math.round(impactos.reduce((sum, val) => sum + val, 0) / 5);
}

function calcularNivelRiesgo(impactoTotal: number, probabilidad: number): number {
  return impactoTotal * probabilidad;
}

function clasificarRiesgo(nivelRiesgo: number): 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO' {
  if (nivelRiesgo >= 1 && nivelRiesgo <= 4) return 'BAJO';
  if (nivelRiesgo >= 5 && nivelRiesgo <= 9) return 'MEDIO';
  if (nivelRiesgo >= 10 && nivelRiesgo <= 15) return 'ALTO';
  return 'CRÍTICO'; // 16-25
}

function priorizarPorAños(clasificacion: string): string {
  switch (clasificacion) {
    case 'CRÍTICO': return 'Año 1';
    case 'ALTO': return 'Año 1-2';
    case 'MEDIO': return 'Año 2-3';
    case 'BAJO': return 'Año 3-4';
    default: return 'Sin priorizar';
  }
}

function getColorRiesgo(clasificacion: string): string {
  switch (clasificacion) {
    case 'CRÍTICO': return '#DC2626';
    case 'ALTO': return '#F59E0B';
    case 'MEDIO': return '#3B82F6';
    case 'BAJO': return '#10B981';
    default: return '#6B7280';
  }
}

// ============ DATOS MOCK ============

const MOCK_UNIVERSO: UniversoAuditorias = {
  añoFiscal: 2025,
  version: '1.0',
  fechaCreacion: '2024-12-01',
  responsable: 'Mario Oswaldo Bernal Rodriguez',
  estado: 'vigente',
  procesos: [
    {
      id: '1',
      nombreProceso: 'Gestión Financiera',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      responsableProceso: 'Sandra Montero',
      impactoFinanciero: 5,
      impactoOperacional: 4,
      impactoReputacional: 5,
      impactoLegal: 5,
      impactoEstrategico: 4,
      probabilidadOcurrencia: 4,
      impactoTotal: 5,
      nivelRiesgo: 20,
      clasificacionRiesgo: 'CRÍTICO',
      añoPriorizacion: 'Año 1',
      ultimaAuditoria: '2024-06-15',
      observaciones: 'Proceso crítico por manejo de recursos públicos',
      estado: 'Evaluado',
      fechaEvaluacion: '2024-12-10'
    },
    {
      id: '2',
      nombreProceso: 'Gestión Contractual',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      responsableProceso: 'Fernando Ávila',
      impactoFinanciero: 5,
      impactoOperacional: 4,
      impactoReputacional: 5,
      impactoLegal: 5,
      impactoEstrategico: 3,
      probabilidadOcurrencia: 4,
      impactoTotal: 4,
      nivelRiesgo: 16,
      clasificacionRiesgo: 'CRÍTICO',
      añoPriorizacion: 'Año 1',
      ultimaAuditoria: '2024-03-20',
      observaciones: 'Alta rotación de contratistas',
      estado: 'Evaluado',
      fechaEvaluacion: '2024-12-10'
    },
    {
      id: '3',
      nombreProceso: 'Gestión de Talento Humano',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      responsableProceso: 'William Ramírez',
      impactoFinanciero: 3,
      impactoOperacional: 4,
      impactoReputacional: 3,
      impactoLegal: 4,
      impactoEstrategico: 3,
      probabilidadOcurrencia: 3,
      impactoTotal: 3,
      nivelRiesgo: 9,
      clasificacionRiesgo: 'MEDIO',
      añoPriorizacion: 'Año 2-3',
      ultimaAuditoria: '2023-09-10',
      observaciones: 'Cumplimiento normativo general satisfactorio',
      estado: 'Evaluado',
      fechaEvaluacion: '2024-12-10'
    },
    {
      id: '4',
      nombreProceso: 'Gestión Administrativa',
      tipoProceso: 'Apoyo',
      tipoSede: 'Territorial',
      territorial: 'Antioquia',
      responsableProceso: 'Catalina Rubio',
      impactoFinanciero: 4,
      impactoOperacional: 4,
      impactoReputacional: 3,
      impactoLegal: 4,
      impactoEstrategico: 3,
      probabilidadOcurrencia: 3,
      impactoTotal: 4,
      nivelRiesgo: 12,
      clasificacionRiesgo: 'ALTO',
      añoPriorizacion: 'Año 1-2',
      ultimaAuditoria: '2023-11-05',
      observaciones: 'Territorial con mayor presupuesto',
      estado: 'Evaluado',
      fechaEvaluacion: '2024-12-10'
    },
    {
      id: '5',
      nombreProceso: 'Gestión de Programas Académicos',
      tipoProceso: 'Misional',
      tipoSede: 'Sede Principal',
      responsableProceso: 'Nubia Pimiento',
      impactoFinanciero: 3,
      impactoOperacional: 5,
      impactoReputacional: 5,
      impactoLegal: 4,
      impactoEstrategico: 5,
      probabilidadOcurrencia: 2,
      impactoTotal: 4,
      nivelRiesgo: 8,
      clasificacionRiesgo: 'MEDIO',
      añoPriorizacion: 'Año 2-3',
      ultimaAuditoria: '2024-02-28',
      observaciones: 'Proceso misional estratégico',
      estado: 'Evaluado',
      fechaEvaluacion: '2024-12-10'
    }
  ]
};

// ============ COMPONENTE PRINCIPAL ============

export function UniversoAuditorias() {
  const [universo, setUniverso] = useState<UniversoAuditorias>(MOCK_UNIVERSO);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoAuditable | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'matriz'>('lista');
  const [filtroRiesgo, setFiltroRiesgo] = useState<string>('todos');
  const [filtroSede, setFiltroSede] = useState<string>('todas');

  // Form state
  const [formProceso, setFormProceso] = useState<Partial<ProcesoAuditable>>({
    nombreProceso: '',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    territorial: '',
    responsableProceso: '',
    impactoFinanciero: 3,
    impactoOperacional: 3,
    impactoReputacional: 3,
    impactoLegal: 3,
    impactoEstrategico: 3,
    probabilidadOcurrencia: 3,
    ultimaAuditoria: '',
    observaciones: '',
    estado: 'Pendiente'
  });

  const resetForm = () => {
    setFormProceso({
      nombreProceso: '',
      tipoProceso: 'Apoyo',
      tipoSede: 'Sede Principal',
      territorial: '',
      responsableProceso: '',
      impactoFinanciero: 3,
      impactoOperacional: 3,
      impactoReputacional: 3,
      impactoLegal: 3,
      impactoEstrategico: 3,
      probabilidadOcurrencia: 3,
      ultimaAuditoria: '',
      observaciones: '',
      estado: 'Pendiente'
    });
    setProcesoSeleccionado(null);
    setModoEdicion(false);
  };

  const handleAgregarProceso = () => {
    if (!formProceso.nombreProceso || !formProceso.responsableProceso) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    const impactoTotal = calcularImpactoTotal(formProceso);
    const nivelRiesgo = calcularNivelRiesgo(impactoTotal, formProceso.probabilidadOcurrencia!);
    const clasificacion = clasificarRiesgo(nivelRiesgo);
    const añoPriorizacion = priorizarPorAños(clasificacion);

    const nuevoProceso: ProcesoAuditable = {
      id: Date.now().toString(),
      nombreProceso: formProceso.nombreProceso!,
      tipoProceso: formProceso.tipoProceso!,
      tipoSede: formProceso.tipoSede!,
      territorial: formProceso.territorial,
      responsableProceso: formProceso.responsableProceso!,
      impactoFinanciero: formProceso.impactoFinanciero!,
      impactoOperacional: formProceso.impactoOperacional!,
      impactoReputacional: formProceso.impactoReputacional!,
      impactoLegal: formProceso.impactoLegal!,
      impactoEstrategico: formProceso.impactoEstrategico!,
      probabilidadOcurrencia: formProceso.probabilidadOcurrencia!,
      impactoTotal,
      nivelRiesgo,
      clasificacionRiesgo: clasificacion,
      añoPriorizacion,
      ultimaAuditoria: formProceso.ultimaAuditoria || '',
      observaciones: formProceso.observaciones || '',
      estado: 'Evaluado',
      fechaEvaluacion: new Date().toISOString().split('T')[0]
    };

    setUniverso({
      ...universo,
      procesos: [...universo.procesos, nuevoProceso]
    });

    toast.success(`Proceso agregado y clasificado como ${clasificacion}`);
    setModalFormulario(false);
    resetForm();
  };

  const handleEliminarProceso = (id: string) => {
    setUniverso({
      ...universo,
      procesos: universo.procesos.filter(p => p.id !== id)
    });
    toast.success('Proceso eliminado del universo');
  };

  const abrirModalNuevo = () => {
    resetForm();
    setModoEdicion(false);
    setModalFormulario(true);
  };

  const exportarExcel = () => {
    // Preparar datos para CSV compatible con Excel
    const csvRows: string[] = [];

    // Encabezado
    csvRows.push(`UNIVERSO DE AUDITORÍAS ${universo.añoFiscal} - FORMATO DAFP`);
    csvRows.push(`Versión: ${universo.version}`);
    csvRows.push(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
    csvRows.push(`Responsable: ${universo.responsable}`);
    csvRows.push('');

    // Encabezados de tabla
    csvRows.push([
      'N°',
      'Proceso',
      'Tipo',
      'Sede',
      'Territorial',
      'Responsable',
      'Impacto Financiero',
      'Impacto Operacional',
      'Impacto Reputacional',
      'Impacto Legal',
      'Impacto Estratégico',
      'Impacto Total',
      'Probabilidad',
      'Nivel Riesgo',
      'Clasificación',
      'Año Priorización',
      'Última Auditoría',
      'Observaciones'
    ].join(','));

    // Datos
    universo.procesos.forEach((proceso, index) => {
      const row = [
        index + 1,
        `"${proceso.nombreProceso}"`,
        proceso.tipoProceso,
        proceso.tipoSede,
        proceso.territorial || 'N/A',
        `"${proceso.responsableProceso}"`,
        proceso.impactoFinanciero,
        proceso.impactoOperacional,
        proceso.impactoReputacional,
        proceso.impactoLegal,
        proceso.impactoEstrategico,
        proceso.impactoTotal,
        proceso.probabilidadOcurrencia,
        proceso.nivelRiesgo,
        proceso.clasificacionRiesgo,
        proceso.añoPriorizacion,
        proceso.ultimaAuditoria || 'N/A',
        `"${proceso.observaciones}"`
      ].join(',');
      csvRows.push(row);
    });

    // Crear y descargar
    const csvContent = csvRows.join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Universo_Auditorias_${universo.añoFiscal}_DAF.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Universo exportado a Excel (formato DAFP)');
  };

  // Métricas calculadas
  const totalProcesos = universo.procesos.length;
  const procesosCriticos = universo.procesos.filter(p => p.clasificacionRiesgo === 'CRÍTICO').length;
  const procesosAltos = universo.procesos.filter(p => p.clasificacionRiesgo === 'ALTO').length;
  const procesosSedePrincipal = universo.procesos.filter(p => p.tipoSede === 'Sede Principal').length;
  const procesosTerritoriales = universo.procesos.filter(p => p.tipoSede === 'Territorial').length;

  // Filtrado
  let procesosFiltrados = universo.procesos;
  if (filtroRiesgo !== 'todos') {
    procesosFiltrados = procesosFiltrados.filter(p => p.clasificacionRiesgo === filtroRiesgo);
  }
  if (filtroSede !== 'todas') {
    procesosFiltrados = procesosFiltrados.filter(p => p.tipoSede === filtroSede);
  }

  // Cálculo del impacto total en tiempo real
  const impactoCalculado = calcularImpactoTotal(formProceso);
  const riesgoCalculado = calcularNivelRiesgo(impactoCalculado, formProceso.probabilidadOcurrencia || 3);
  const clasificacionCalculada = clasificarRiesgo(riesgoCalculado);
  const añoCalculado = priorizarPorAños(clasificacionCalculada);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black" style={{ color: '#1F2937' }}>
            Universo de Auditorías {universo.añoFiscal}
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#6B7280' }}>
            Evaluación y priorización basada en formato DAFP (Departamento Administrativo de la Función Pública)
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Badge 
            className="w-full sm:w-auto justify-center"
            style={{ background: '#EFF6FF', color: '#003DA5', padding: '8px 16px' }}
          >
            Versión {universo.version} • {universo.estado.toUpperCase()}
          </Badge>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={abrirModalNuevo}
              className="flex-1 sm:flex-none"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span>Evaluar Proceso</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
              className="flex-1 sm:flex-none border-2"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span>Exportar DAFP</span>
            </Button>
          </div>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Procesos"
          value={totalProcesos.toString()}
          icon={Target}
          iconColor="#3B82F6"
          iconBgColor="#EFF6FF"
          subtitle="Evaluados"
        />
        <MetricCard
          title="Riesgo Crítico"
          value={procesosCriticos.toString()}
          icon={AlertTriangle}
          iconColor="#DC2626"
          iconBgColor="#FEE2E2"
          subtitle="Año 1 obligatorio"
        />
        <MetricCard
          title="Riesgo Alto"
          value={procesosAltos.toString()}
          icon={TrendingUp}
          iconColor="#F59E0B"
          iconBgColor="#FEF3C7"
          subtitle="Año 1-2"
        />
        <MetricCard
          title="Sede Principal"
          value={procesosSedePrincipal.toString()}
          icon={Building2}
          iconColor="#10B981"
          iconBgColor="#F0FDF4"
          subtitle={`${procesosTerritoriales} territoriales`}
        />
      </div>

      {/* FILTROS Y VISTA */}
      <div className="rounded-2xl border-2 p-4 sm:p-6" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filtroRiesgo}
              onChange={(e) => setFiltroRiesgo(e.target.value)}
              className="px-3 py-2 rounded-lg border-2 text-sm"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="todos">Todos los riesgos</option>
              <option value="CRÍTICO">Solo CRÍTICO</option>
              <option value="ALTO">Solo ALTO</option>
              <option value="MEDIO">Solo MEDIO</option>
              <option value="BAJO">Solo BAJO</option>
            </select>

            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="px-3 py-2 rounded-lg border-2 text-sm"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="todas">Todas las sedes</option>
              <option value="Sede Principal">Sede Principal</option>
              <option value="Territorial">Territoriales</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setVistaActiva('lista')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                vistaActiva === 'lista' ? 'shadow-md' : 'opacity-60'
              }`}
              style={{
                background: vistaActiva === 'lista' ? '#F97316' : '#F3F4F6',
                color: vistaActiva === 'lista' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Lista
            </button>
            <button
              onClick={() => setVistaActiva('matriz')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                vistaActiva === 'matriz' ? 'shadow-md' : 'opacity-60'
              }`}
              style={{
                background: vistaActiva === 'matriz' ? '#F97316' : '#F3F4F6',
                color: vistaActiva === 'matriz' ? '#FFFFFF' : '#6B7280'
              }}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Matriz
            </button>
          </div>
        </div>

        {/* VISTA LISTA */}
        {vistaActiva === 'lista' && (
          <div className="space-y-3">
            {procesosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Info className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <p style={{ color: '#6B7280' }}>No hay procesos que coincidan con los filtros</p>
              </div>
            ) : (
              procesosFiltrados
                .sort((a, b) => b.nivelRiesgo - a.nivelRiesgo)
                .map((proceso, index) => (
                  <motion.div
                    key={proceso.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                    style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 flex-wrap">
                          <h4 className="text-base font-bold" style={{ color: '#1F2937' }}>
                            {proceso.nombreProceso}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className="text-xs"
                              style={{
                                background: getColorRiesgo(proceso.clasificacionRiesgo) + '20',
                                color: getColorRiesgo(proceso.clasificacionRiesgo)
                              }}
                            >
                              {proceso.clasificacionRiesgo} • Riesgo {proceso.nivelRiesgo}
                            </Badge>
                            <Badge className="text-xs" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                              {proceso.añoPriorizacion}
                            </Badge>
                            <Badge className="text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                              {proceso.tipoProceso}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm" style={{ color: '#6B7280' }}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {proceso.tipoSede}
                              {proceso.territorial && ` - ${proceso.territorial}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 flex-shrink-0" />
                            <span>Impacto: {proceso.impactoTotal} | Prob: {proceso.probabilidadOcurrencia}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span>Última: {proceso.ultimaAuditoria || 'Sin auditorías'}</span>
                          </div>
                        </div>

                        {proceso.observaciones && (
                          <p className="text-xs mt-2 italic" style={{ color: '#6B7280' }}>
                            {proceso.observaciones}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarProceso(proceso.id)}
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
            )}
          </div>
        )}

        {/* VISTA MATRIZ DE RIESGO */}
        {vistaActiva === 'matriz' && (
          <div className="overflow-x-auto">
            <div className="min-w-[600px] p-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Matriz de Riesgo DAFP
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Impacto (eje Y) × Probabilidad (eje X)
                </p>
              </div>

              {/* Matriz 5x5 */}
              <div className="grid grid-cols-6 gap-2">
                {/* Header vacío */}
                <div />
                {/* Headers Probabilidad */}
                {[1, 2, 3, 4, 5].map(prob => (
                  <div key={`prob-${prob}`} className="text-center text-sm font-bold p-2" style={{ color: '#6B7280' }}>
                    P={prob}
                  </div>
                ))}

                {/* Filas de Impacto (invertidas, 5 arriba) */}
                {[5, 4, 3, 2, 1].map(impacto => (
                  <>
                    <div key={`imp-${impacto}`} className="flex items-center justify-center text-sm font-bold" style={{ color: '#6B7280' }}>
                      I={impacto}
                    </div>
                    {[1, 2, 3, 4, 5].map(prob => {
                      const riesgo = impacto * prob;
                      const clasificacion = clasificarRiesgo(riesgo);
                      const procesosEnCelda = procesosFiltrados.filter(
                        p => p.impactoTotal === impacto && p.probabilidadOcurrencia === prob
                      );

                      return (
                        <div
                          key={`celda-${impacto}-${prob}`}
                          className="aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 relative"
                          style={{
                            background: getColorRiesgo(clasificacion) + '20',
                            borderColor: getColorRiesgo(clasificacion)
                          }}
                        >
                          <span className="text-xs font-bold" style={{ color: getColorRiesgo(clasificacion) }}>
                            {riesgo}
                          </span>
                          {procesosEnCelda.length > 0 && (
                            <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#FFFFFF', color: getColorRiesgo(clasificacion) }}>
                              {procesosEnCelda.length}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>

              {/* Leyenda */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                {(['CRÍTICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(nivel => (
                  <div key={nivel} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: getColorRiesgo(nivel) }} />
                    <span className="text-sm" style={{ color: '#6B7280' }}>
                      {nivel} ({nivel === 'CRÍTICO' ? '16-25' : nivel === 'ALTO' ? '10-15' : nivel === 'MEDIO' ? '5-9' : '1-4'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORMULARIO DAFP */}
      <ResponsiveModal
        isOpen={modalFormulario}
        onClose={() => {
          setModalFormulario(false);
          resetForm();
        }}
        title="Formulario de Evaluación DAFP"
        subtitle="Evaluación de riesgo para priorización de auditorías"
        icon={<Calculator className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="4xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleAgregarProceso}
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              Guardar Evaluación
            </button>
            <button
              onClick={() => {
                setModalFormulario(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-6 p-1">
          {/* SECCIÓN 1: Información General */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              1. Información General del Proceso
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Nombre del Proceso *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.nombreProceso}
                  onChange={(e) => setFormProceso({ ...formProceso, nombreProceso: e.target.value })}
                >
                  <option value="">Seleccione un proceso...</option>
                  {PROCESOS_ESAP.map(proc => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Tipo de Proceso *
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.tipoProceso}
                  onChange={(e) => setFormProceso({ ...formProceso, tipoProceso: e.target.value as any })}
                >
                  <option value="Misional">Misional</option>
                  <option value="Apoyo">Apoyo</option>
                  <option value="Estratégico">Estratégico</option>
                  <option value="Evaluación">Evaluación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Responsable del Proceso *
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.responsableProceso}
                  onChange={(e) => setFormProceso({ ...formProceso, responsableProceso: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {RESPONSABLES.map(resp => (
                    <option key={resp} value={resp}>{resp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Tipo de Sede *
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.tipoSede}
                  onChange={(e) => setFormProceso({ ...formProceso, tipoSede: e.target.value as any, territorial: '' })}
                >
                  <option value="Sede Principal">Sede Principal</option>
                  <option value="Territorial">Territorial</option>
                </select>
              </div>

              {formProceso.tipoSede === 'Territorial' && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                    Territorial *
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formProceso.territorial}
                    onChange={(e) => setFormProceso({ ...formProceso, territorial: e.target.value })}
                  >
                    <option value="">Seleccione territorial...</option>
                    {TERRITORIALES_ESAP.map(terr => (
                      <option key={terr} value={terr}>{terr}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: Evaluación de Impacto */}
          <div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
              2. Evaluación de Impacto
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Califique de 1 (Muy Bajo) a 5 (Muy Alto) el impacto potencial del proceso
            </p>

            <div className="space-y-4">
              {[
                { key: 'impactoFinanciero', label: 'Impacto Financiero', desc: 'Afectación económica y presupuestal' },
                { key: 'impactoOperacional', label: 'Impacto Operacional', desc: 'Afectación a operaciones y servicios' },
                { key: 'impactoReputacional', label: 'Impacto Reputacional', desc: 'Afectación a imagen institucional' },
                { key: 'impactoLegal', label: 'Impacto Legal', desc: 'Cumplimiento normativo y legal' },
                { key: 'impactoEstrategico', label: 'Impacto Estratégico', desc: 'Afectación a objetivos institucionales' }
              ].map(({ key, label, desc }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-semibold" style={{ color: '#4B5563' }}>
                        {label}
                      </label>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{desc}</p>
                    </div>
                    <span className="text-lg font-black px-3 py-1 rounded-lg" style={{ background: '#F3F4F6', color: '#F97316' }}>
                      {formProceso[key as keyof typeof formProceso] || 3}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formProceso[key as keyof typeof formProceso] as number || 3}
                    onChange={(e) => setFormProceso({ ...formProceso, [key]: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    <span>1 - Muy Bajo</span>
                    <span>3 - Medio</span>
                    <span>5 - Muy Alto</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIÓN 3: Probabilidad */}
          <div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
              3. Evaluación de Probabilidad
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Califique de 1 (Muy Baja) a 5 (Muy Alta) la probabilidad de ocurrencia de eventos de riesgo
            </p>

            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: '#4B5563' }}>
                Probabilidad de Ocurrencia
              </label>
              <span className="text-lg font-black px-3 py-1 rounded-lg" style={{ background: '#F3F4F6', color: '#F97316' }}>
                {formProceso.probabilidadOcurrencia || 3}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={formProceso.probabilidadOcurrencia || 3}
              onChange={(e) => setFormProceso({ ...formProceso, probabilidadOcurrencia: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
              <span>1 - Muy Baja</span>
              <span>3 - Media</span>
              <span>5 - Muy Alta</span>
            </div>
          </div>

          {/* SECCIÓN 4: Cálculo Automático */}
          <div className="rounded-xl p-4" style={{ background: '#F0FDF4', border: '2px solid #10B981' }}>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#065F46' }}>
              <Calculator className="w-5 h-5" />
              Cálculo Automático DAFP
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Impacto Promedio</p>
                <p className="text-2xl font-black" style={{ color: '#10B981' }}>
                  {impactoCalculado}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Nivel de Riesgo</p>
                <p className="text-2xl font-black" style={{ color: '#10B981' }}>
                  {riesgoCalculado}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Clasificación</p>
                <p className="text-base font-black" style={{ color: getColorRiesgo(clasificacionCalculada) }}>
                  {clasificacionCalculada}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Priorización</p>
                <p className="text-base font-black" style={{ color: '#3B82F6' }}>
                  {añoCalculado}
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: Información Adicional */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              4. Información Adicional
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Fecha de Última Auditoría
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.ultimaAuditoria}
                  onChange={(e) => setFormProceso({ ...formProceso, ultimaAuditoria: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formProceso.observaciones}
                  onChange={(e) => setFormProceso({ ...formProceso, observaciones: e.target.value })}
                  placeholder="Observaciones relevantes sobre el proceso..."
                />
              </div>
            </div>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}