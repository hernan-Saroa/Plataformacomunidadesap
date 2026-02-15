/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSO AUDITABLE UNIFICADO - OCIG ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo único y completo que integra:
 * - Universo Auditable (DÓNDE se puede auditar)
 * - Programa Anual de Auditorías (CUÁNDO auditar)
 * - Vinculación con Plan Anual (QUÉ auditar)
 * - Integración con Auditorías OCIG (ejecución)
 * - Integración con Planes de Mejoramiento (hallazgos)
 * 
 * Base normativa:
 * - Decreto 648 de 2017 (Rol 4 - Evaluación del SCI)
 * - Guía de Auditoría Interna DAFP
 * - Modelo Estándar de Control Interno MECI
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Calendar as CalendarIcon, Target, Filter, Search, Download, Plus,
  BarChart3, Activity, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Users, FileText, Link2, Eye, Edit2, Trash2,
  ChevronRight, AlertCircle, Info, X, FileCheck, Save, XCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
// ✅ NUEVO: Cuestionario DAFP Visual SIMPLIFICADO - Implementación exacta según CUESTIONARIO_FLUJO_DAFP_VISUAL.md
import { FormularioProcesoDafpVisual as FormularioProcesoAuditable, type FormularioDafpData as ProcesoAuditableData } from './FormularioProcesoDafpVisualSimplificado';
import { ResponsiveTable, MobileCard, MobileCardRow, type Column } from '../../ui/responsive-table';
import { TabUniversoAuditableResponsive } from './TabUniversoAuditableResponsive';
import { CronogramaAuditoriasPremium } from './CronogramaAuditoriasPremium';

import { TooltipGuia } from './TooltipGuia';
import type { ProcesoAuditable } from '@/types/control-interno';
// ✅ ELIMINADO: import { PROCESOS_MOCK_CON_DAFP } from '@/data/procesos-mock-dafp';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - PROCESOS AUDITABLES
// ════════════════════════════════════════════════════════════════════════════

const PROCESOS_MOCK_CON_DAFP: ProcesoAuditable[] = [
  {
    id: 'proc-mock-001',
    nombre: 'Gestión Presupuestal',
    tipo: 'Apoyo',
    descripcion: 'Proceso de planeación, ejecución y control del presupuesto institucional',
    responsable: 'Dirección Financiera',
    nivelRiesgo: 'Alto',
    puntajeRiesgo: 85,
    calificacionDafp: 4.2,
    categoria: 'Financiero',
    auditable: true,
    ultimaAuditoria: '2025-06-15',
    frecuenciaAuditoria: 'Anual',
    activo: true
  },
  {
    id: 'proc-mock-002',
    nombre: 'Gestión Contractual',
    tipo: 'Apoyo',
    descripcion: 'Proceso de contratación y supervisión de contratos',
    responsable: 'Subdirección Administrativa',
    nivelRiesgo: 'Crítico',
    puntajeRiesgo: 92,
    calificacionDafp: 3.8,
    categoria: 'Administrativo',
    auditable: true,
    ultimaAuditoria: '2025-08-20',
    frecuenciaAuditoria: 'Anual',
    activo: true
  },
  {
    id: 'proc-mock-003',
    nombre: 'Gestión de Nómina',
    tipo: 'Apoyo',
    descripcion: 'Proceso de liquidación y pago de nómina a funcionarios',
    responsable: 'Talento Humano',
    nivelRiesgo: 'Alto',
    puntajeRiesgo: 78,
    calificacionDafp: 4.5,
    categoria: 'Financiero',
    auditable: true,
    ultimaAuditoria: '2025-09-10',
    frecuenciaAuditoria: 'Anual',
    activo: true
  },
  {
    id: 'proc-mock-004',
    nombre: 'Admisiones y Registro Académico',
    tipo: 'Misional',
    descripcion: 'Proceso de admisión de estudiantes y gestión de registros académicos',
    responsable: 'Dirección Académica',
    nivelRiesgo: 'Medio',
    puntajeRiesgo: 65,
    calificacionDafp: 4.7,
    categoria: 'Académico',
    auditable: true,
    ultimaAuditoria: '2024-11-05',
    frecuenciaAuditoria: 'Bienal',
    activo: true
  },
  {
    id: 'proc-mock-005',
    nombre: 'Docencia',
    tipo: 'Misional',
    descripcion: 'Proceso de planeación, ejecución y evaluación de actividades docentes',
    responsable: 'Vicerrectoría Académica',
    nivelRiesgo: 'Medio',
    puntajeRiesgo: 58,
    calificacionDafp: 4.8,
    categoria: 'Académico',
    auditable: true,
    ultimaAuditoria: '2025-03-12',
    frecuenciaAuditoria: 'Bienal',
    activo: true
  },
  {
    id: 'proc-mock-006',
    nombre: 'Seguridad de la Información',
    tipo: 'Apoyo',
    descripcion: 'Proceso de gestión de seguridad de la información y ciberseguridad',
    responsable: 'Dirección de Tecnología',
    nivelRiesgo: 'Crítico',
    puntajeRiesgo: 88,
    calificacionDafp: 4.1,
    categoria: 'Tecnológico',
    auditable: true,
    ultimaAuditoria: '2025-05-20',
    frecuenciaAuditoria: 'Anual',
    activo: true
  }
];

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TabActiva = 'universo' | 'programa' | 'vinculacion';
type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type EstadoAuditoria = 'PROGRAMADA' | 'EN_EJECUCION' | 'COMPLETADA' | 'CANCELADA';
type TipoAuditoria = 'CUMPLIMIENTO' | 'GESTION' | 'FINANCIERA' | 'TI' | 'ESPECIAL';
type TipoProceso = 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación';

interface ProcesoAuditable {
  id: string;
  nombre: string;
  tipo: TipoProceso;
  descripcion: string;
  responsable: string;
  nivelRiesgo: NivelRiesgo;
  puntajeRiesgo: number; // 0-100
  calificacionDafp: number; // 1-5
  categoria: string;
  auditable: boolean;
  ultimaAuditoria?: string;
  frecuenciaAuditoria: 'Anual' | 'Semestral' | 'Bienal' | 'Trienal';
  activo: boolean;
}

interface AuditoriaProgramada {
  id: string;
  procesoId: string;
  proceso: ProcesoAuditable;
  tipo: TipoAuditoria;
  nombre: string;
  objetivo: string;
  alcance: string;
  fechaInicio: string;
  fechaFin: string;
  trimestre: 1 | 2 | 3 | 4;
  auditorLider: string;
  equipo: string[];
  estado: EstadoAuditoria;
  avance: number;
  horasEstimadas: number;
  horasReales: number;
  auditoriaOCIGId?: string; // Vinculación con módulo de Auditorías
  planMejoramientoId?: string; // Vinculación con Planes de Mejoramiento
  hallazgosCount: number;
}

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  especialidad: string[];
}

interface Estadisticas {
  // Universo Auditable
  totalProcesos: number;
  procesosAuditables: number;
  procesosCriticos: number;
  procesosAltos: number;
  procesosMedios: number;
  procesosBajos: number;
  
  // Programa Anual
  totalProgramadas: number;
  completadas: number;
  enEjecucion: number;
  programadas: number;
  coberturaCriticos: number;
  coberturaAltos: number;
  horasTotales: number;
  horasEjecutadas: number;
  
  // Vinculación
  vinculadasOCIG: number;
  conHallazgos: number;
  conPlanesMejoramiento: number;
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - AUDITORES
// ════════════════════════════════════════════════════════════════════════════

const AUDITORES: Auditor[] = [
  { id: '1', nombre: 'Mario Oswaldo Bernal', cargo: 'Jefe de Control Interno', especialidad: ['Gestión', 'Estrategia'] },
  { id: '2', nombre: 'Ana María López', cargo: 'Auditora sénior', especialidad: ['Financiera', 'Cumplimiento'] },
  { id: '3', nombre: 'Carlos Mendoza', cargo: 'Auditor', especialidad: ['TI', 'Gestión'] },
  { id: '4', nombre: 'Laura Rodríguez', cargo: 'Auditora', especialidad: ['Cumplimiento', 'Gestión'] },
  { id: '5', nombre: 'Juan Pablo García', cargo: 'Auditor júnior', especialidad: ['Gestión'] }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - AUDITORÍAS PROGRAMADAS
// ════════════════════════════════════════════════════════════════════════════

const AUDITORIAS_PROGRAMADAS: AuditoriaProgramada[] = [
  {
    id: 'aud-2026-001',
    procesoId: 'proc-mock-001',
    proceso: PROCESOS_MOCK_CON_DAFP.find(p => p.id === 'proc-mock-001')!,
    tipo: 'FINANCIERA',
    nombre: 'Auditoría de Gestión Presupuestal 2026',
    objetivo: 'Evaluar el cumplimiento normativo y la eficiencia en la ejecución presupuestal',
    alcance: 'Ejecución presupuestal de ingresos y gastos del primer trimestre 2026',
    fechaInicio: '2026-03-01',
    fechaFin: '2026-03-31',
    trimestre: 1,
    auditorLider: 'Ana María López',
    equipo: ['Carlos Mendoza', 'Juan Pablo García'],
    estado: 'EN_EJECUCION',
    avance: 45,
    horasEstimadas: 140,
    horasReales: 65,
    auditoriaOCIGId: 'ocig-2026-001',
    hallazgosCount: 3
  },
  {
    id: 'aud-2026-002',
    procesoId: 'proc-mock-002',
    proceso: PROCESOS_MOCK_CON_DAFP.find(p => p.id === 'proc-mock-002')!,
    tipo: 'CUMPLIMIENTO',
    nombre: 'Auditoría de Gestión Contractual',
    objetivo: 'Evaluar el cumplimiento de la normativa de contratación pública',
    alcance: 'Contratos adjudicados en el segundo semestre 2025',
    fechaInicio: '2026-02-01',
    fechaFin: '2026-02-28',
    trimestre: 1,
    auditorLider: 'Mario Oswaldo Bernal',
    equipo: ['Laura Rodríguez'],
    estado: 'COMPLETADA',
    avance: 100,
    horasEstimadas: 120,
    horasReales: 125,
    auditoriaOCIGId: 'ocig-2026-002',
    planMejoramientoId: 'pm-2026-001',
    hallazgosCount: 5
  },
  {
    id: 'aud-2026-003',
    procesoId: 'proc-mock-003',
    proceso: PROCESOS_MOCK_CON_DAFP.find(p => p.id === 'proc-mock-003')!,
    tipo: 'CUMPLIMIENTO',
    nombre: 'Auditoría de Gestión de Nómina',
    objetivo: 'Verificar cumplimiento normativo en liquidación de nómina',
    alcance: 'Nómina y prestaciones sociales del año 2025',
    fechaInicio: '2026-04-01',
    fechaFin: '2026-04-30',
    trimestre: 2,
    auditorLider: 'Ana María López',
    equipo: ['Laura Rodríguez', 'Juan Pablo García'],
    estado: 'PROGRAMADA',
    avance: 0,
    horasEstimadas: 160,
    horasReales: 0,
    hallazgosCount: 0
  },
  {
    id: 'aud-2026-004',
    procesoId: 'proc-mock-005',
    proceso: PROCESOS_MOCK_CON_DAFP.find(p => p.id === 'proc-mock-005')!,
    tipo: 'GESTION',
    nombre: 'Auditoría al Proceso de Docencia',
    objetivo: 'Evaluar la calidad y efectividad del proceso de docencia',
    alcance: 'Programas académicos de pregrado y posgrado 2025',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    trimestre: 2,
    auditorLider: 'Carlos Mendoza',
    equipo: ['Laura Rodríguez'],
    estado: 'PROGRAMADA',
    avance: 0,
    horasEstimadas: 150,
    horasReales: 0,
    hallazgosCount: 0
  },
  {
    id: 'aud-2026-005',
    procesoId: 'proc-mock-006',
    proceso: PROCESOS_MOCK_CON_DAFP.find(p => p.id === 'proc-mock-006')!,
    tipo: 'TI',
    nombre: 'Auditoría de Seguridad de la Información',
    objetivo: 'Evaluar los controles de seguridad de la información y ciberseguridad',
    alcance: 'Infraestructura tecnológica y sistemas de información críticos',
    fechaInicio: '2026-06-01',
    fechaFin: '2026-06-30',
    trimestre: 2,
    auditorLider: 'Carlos Mendoza',
    equipo: ['Juan Pablo García'],
    estado: 'PROGRAMADA',
    avance: 0,
    horasEstimadas: 120,
    horasReales: 0,
    hallazgosCount: 0
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UniversoAuditableUnificadoProps {
  vigencia?: number;
  onVolver?: () => void;
}

export function UniversoAuditableUnificado({ vigencia = 2026, onVolver }: UniversoAuditableUnificadoProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('universo');
  const [filtroNivelRiesgo, setFiltroNivelRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS');
  const [filtroTipoProceso, setFiltroTipoProceso] = useState<TipoProceso | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // 🆕 Estados para gestionar procesos auditables
  // ✅ USANDO DATOS MOCK CON EVALUACIONES DAFP
  const [procesos, setProcesos] = useState<ProcesoAuditable[]>(PROCESOS_MOCK_CON_DAFP);
  const [mostrarFormularioProceso, setMostrarFormularioProceso] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoAuditable | null>(null);
  
  // Estadísticas calculadas
  const estadisticas: Estadisticas = useMemo(() => {
    const procesosAuditables = procesos.filter(p => p.auditable);
    
    return {
      totalProcesos: procesos.length,
      procesosAuditables: procesosAuditables.length,
      procesosCriticos: procesosAuditables.filter(p => p.nivelRiesgo === 'Crítico').length,
      procesosAltos: procesosAuditables.filter(p => p.nivelRiesgo === 'Alto').length,
      procesosMedios: procesosAuditables.filter(p => p.nivelRiesgo === 'Medio').length,
      procesosBajos: procesosAuditables.filter(p => p.nivelRiesgo === 'Bajo').length,
      
      totalProgramadas: AUDITORIAS_PROGRAMADAS.length,
      completadas: AUDITORIAS_PROGRAMADAS.filter(a => a.estado === 'COMPLETADA').length,
      enEjecucion: AUDITORIAS_PROGRAMADAS.filter(a => a.estado === 'EN_EJECUCION').length,
      programadas: AUDITORIAS_PROGRAMADAS.filter(a => a.estado === 'PROGRAMADA').length,
      
      coberturaCriticos: Math.round(
        (AUDITORIAS_PROGRAMADAS.filter(a => a.proceso.nivelRiesgo === 'Crítico').length / 
        procesosAuditables.filter(p => p.nivelRiesgo === 'Crítico').length) * 100
      ),
      coberturaAltos: Math.round(
        (AUDITORIAS_PROGRAMADAS.filter(a => a.proceso.nivelRiesgo === 'Alto').length / 
        procesosAuditables.filter(p => p.nivelRiesgo === 'Alto').length) * 100
      ),
      
      horasTotales: AUDITORIAS_PROGRAMADAS.reduce((sum, a) => sum + a.horasEstimadas, 0),
      horasEjecutadas: AUDITORIAS_PROGRAMADAS.reduce((sum, a) => sum + a.horasReales, 0),
      
      vinculadasOCIG: AUDITORIAS_PROGRAMADAS.filter(a => a.auditoriaOCIGId).length,
      conHallazgos: AUDITORIAS_PROGRAMADAS.filter(a => a.hallazgosCount > 0).length,
      conPlanesMejoramiento: AUDITORIAS_PROGRAMADAS.filter(a => a.planMejoramientoId).length
    };
  }, [procesos]);
  
  // Filtrar procesos
  const procesosFiltrados = useMemo(() => {
    return procesos.filter(proceso => {
      const cumpleFiltroRiesgo = filtroNivelRiesgo === 'TODOS' || proceso.nivelRiesgo === filtroNivelRiesgo;
      const cumpleFiltroTipo = filtroTipoProceso === 'TODOS' || proceso.tipo === filtroTipoProceso;
      const cumpleBusqueda = busqueda === '' || 
        proceso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        proceso.responsable.toLowerCase().includes(busqueda.toLowerCase());
      
      return cumpleFiltroRiesgo && cumpleFiltroTipo && cumpleBusqueda;
    });
  }, [procesos, filtroNivelRiesgo, filtroTipoProceso, busqueda]);
  
  // 🆕 Handlers para gestionar procesos
  const handleAgregarProceso = (nuevoProceso: ProcesoAuditableData) => {
    const proceso: ProcesoAuditable = {
      ...nuevoProceso,
      id: `proc-${Date.now()}`
    };
    setProcesos(prev => [...prev, proceso]);
    toast.success('✅ Proceso agregado al Universo Auditable');
  };
  
  const handleEditarProceso = (procesoData: ProcesoAuditableData, id: string) => {
    const procesoEditado: ProcesoAuditable = { ...procesoData, id };
    setProcesos(prev => prev.map(p => p.id === id ? procesoEditado : p));
    toast.success('✅ Proceso actualizado exitosamente');
  };
  
  const handleEliminarProceso = (id: string) => {
    setProcesos(prev => prev.filter(p => p.id !== id));
    toast.success('✅ Proceso eliminado del Universo Auditable');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black mb-2" style={{ color: '#003DA5' }}>
                Universo Auditable {vigencia}
              </h1>
              <p className="text-gray-600 text-lg">
                Gestión integral del universo auditable y programa anual de auditorías
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toast.success('Exportando universo auditable...')}
                className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-600 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              {onVolver && (
                <button
                  onClick={onVolver}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  Volver
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTabActiva('universo')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'universo'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Universo Auditable
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'universo' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.procesosAuditables}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('programa')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'programa'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Programa Anual
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'programa' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.totalProgramadas}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('vinculacion')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'vinculacion'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Vinculación
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'vinculacion' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.vinculadasOCIG}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {tabActiva === 'universo' && (
            <TabUniversoAuditable
              key="universo"
              procesos={procesosFiltrados}
              estadisticas={estadisticas}
              filtroRiesgo={filtroNivelRiesgo}
              filtroTipo={filtroTipoProceso}
              busqueda={busqueda}
              onFiltroRiesgoChange={setFiltroNivelRiesgo}
              onFiltroTipoChange={setFiltroTipoProceso}
              onBusquedaChange={setBusqueda}
              onAgregarProceso={() => {
                setProcesoSeleccionado(null);
                setMostrarFormularioProceso(true);
              }}
              onEditarProceso={(proceso) => {
                setProcesoSeleccionado(proceso);
                setMostrarFormularioProceso(true);
              }}
              onEliminarProceso={handleEliminarProceso}
            />
          )}
          {tabActiva === 'programa' && (
            <TabProgramaAnual
              key="programa"
              auditorias={AUDITORIAS_PROGRAMADAS}
              estadisticas={estadisticas}
              mostrarFormulario={mostrarFormulario}
              setMostrarFormulario={setMostrarFormulario}
            />
          )}
          {tabActiva === 'vinculacion' && (
            <TabVinculacion
              key="vinculacion"
              auditorias={AUDITORIAS_PROGRAMADAS}
              estadisticas={estadisticas}
            />
          )}
        </AnimatePresence>
      </div>

      {/* MODALES */}
      {/* Formulario para gestionar auditorías programadas */}
      {mostrarFormulario && (
        <FormularioAuditoriaUnificado
          open={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          onSubmit={(data: AuditoriaUnificadaFormData) => {
            console.log('Nueva auditoría programada:', data);
            toast.success('Auditoría programada exitosamente');
            setMostrarFormulario(false);
          }}
          mode="create"
        />
      )}
      
      {/* Formulario para gestionar procesos del Universo Auditable */}
      {mostrarFormularioProceso && (
        <FormularioProcesoAuditable
          open={mostrarFormularioProceso}
          onClose={() => {
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
          }}
          onSubmit={(proceso) => {
            if (procesoSeleccionado) {
              handleEditarProceso(proceso, procesoSeleccionado.id);
            } else {
              handleAgregarProceso(proceso);
            }
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
          }}
          procesoInicial={procesoSeleccionado}
          mode={procesoSeleccionado ? 'edit' : 'create'}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1: UNIVERSO AUDITABLE
// ════════════════════════════════════════════════════════════════════════════

interface TabUniversoAuditableProps {
  procesos: ProcesoAuditable[];
  estadisticas: Estadisticas;
  filtroRiesgo: NivelRiesgo | 'TODOS';
  filtroTipo: TipoProceso | 'TODOS';
  busqueda: string;
  onFiltroRiesgoChange: (filtro: NivelRiesgo | 'TODOS') => void;
  onFiltroTipoChange: (filtro: TipoProceso | 'TODOS') => void;
  onBusquedaChange: (busqueda: string) => void;
  onAgregarProceso: () => void;
  onEditarProceso: (proceso: ProcesoAuditable) => void;
  onEliminarProceso: (id: string) => void;
}

function TabUniversoAuditable({
  procesos,
  estadisticas,
  filtroRiesgo,
  filtroTipo,
  busqueda,
  onFiltroRiesgoChange,
  onFiltroTipoChange,
  onBusquedaChange,
  onAgregarProceso,
  onEditarProceso,
  onEliminarProceso
}: TabUniversoAuditableProps) {
  // ✅ DELEGAMOS TODO AL COMPONENTE RESPONSIVE WORLD-CLASS
  return (
    <TabUniversoAuditableResponsive
      procesos={procesos}
      estadisticas={estadisticas}
      busqueda={busqueda}
      filtroRiesgo={filtroRiesgo}
      filtroTipo={filtroTipo}
      onBusquedaChange={onBusquedaChange}
      onFiltroRiesgoChange={onFiltroRiesgoChange}
      onFiltroTipoChange={onFiltroTipoChange}
      onAgregarProceso={onAgregarProceso}
      onEditarProceso={onEditarProceso}
      onEliminarProceso={onEliminarProceso}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2: PROGRAMA ANUAL
// ════════════════════════════════════════════════════════════════════════════

interface TabProgramaAnualProps {
  auditorias: AuditoriaProgramada[];
  estadisticas: Estadisticas;
  mostrarFormulario: boolean;
  setMostrarFormulario: (mostrar: boolean) => void;
}

function TabProgramaAnual({ auditorias, estadisticas, mostrarFormulario, setMostrarFormulario }: TabProgramaAnualProps) {
  const [vistaProgramaAnual, setVistaProgramaAnual] = useState<'lista' | 'cronograma'>('cronograma'); // 🆕 Estado para alternar vista
  
  const getColorEstado = (estado: EstadoAuditoria) => {
    const colores = {
      'PROGRAMADA': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'EN_EJECUCION': { bg: '#FEF08A', text: '#854D0E', icon: Activity },
      'COMPLETADA': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle2 },
      'CANCELADA': { bg: '#FEE2E2', text: '#991B1B', icon: X }
    };
    return colores[estado];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Estadísticas del programa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">Total Programadas</span>
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{estadisticas.totalProgramadas}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">{estadisticas.completadas} completadas</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-yellow-700">En Ejecución</span>
            <Activity className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-black text-yellow-700">{estadisticas.enEjecucion}</p>
          <p className="text-xs text-yellow-600 mt-1">Auditorías activas</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-700">Cobertura Críticos</span>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-700">{estadisticas.coberturaCriticos}%</p>
          <p className="text-xs text-purple-600 mt-1">de procesos críticos</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-700">Horas Ejecutadas</span>
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-700">{estadisticas.horasEjecutadas}</p>
          <p className="text-xs text-green-600 mt-1">de {estadisticas.horasTotales} estimadas</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOGGLE: VISTA LISTA vs CRONOGRAMA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Programa Anual de Auditorías
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {vistaProgramaAnual === 'cronograma' 
                  ? 'Vista de cronograma interactivo con múltiples vistas temporales' 
                  : 'Auditorías calendarizadas por trimestre'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Vista */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border-2 border-gray-300">
                <button
                  onClick={() => setVistaProgramaAnual('lista')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    vistaProgramaAnual === 'lista'
                      ? 'bg-white text-[#003DA5] shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Lista
                </button>
                <button
                  onClick={() => setVistaProgramaAnual('cronograma')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    vistaProgramaAnual === 'cronograma'
                      ? 'bg-white text-[#003DA5] shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Cronograma
                </button>
              </div>
              
              <button
                onClick={() => setMostrarFormulario(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Programar Auditoría
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTENIDO DINÁMICO: LISTA O CRONOGRAMA */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {vistaProgramaAnual === 'cronograma' ? (
            <motion.div
              key="cronograma"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <CronogramaAuditoriasPremium 
                auditorias={auditorias}
                vigencia={new Date().getFullYear()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="lista"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              {auditorias.map((auditoria) => {
                const colorEstado = getColorEstado(auditoria.estado);
                const IconoEstado = colorEstado.icon;
                
                return (
                  <div
                    key={auditoria.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-black text-gray-900">
                            {auditoria.nombre}
                          </h3>
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                            style={{ backgroundColor: colorEstado.bg, color: colorEstado.text }}
                          >
                            <IconoEstado className="w-3 h-3" />
                            {auditoria.estado.replace('_', ' ')}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                            Q{auditoria.trimestre} {new Date(auditoria.fechaInicio).getFullYear()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{auditoria.objetivo}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Proceso:</span>
                            <span className="ml-2 font-semibold text-gray-900">{auditoria.proceso.nombre}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Auditor Líder:</span>
                            <span className="ml-2 font-semibold text-gray-900">{auditoria.auditorLider}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Periodo:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')} - {new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Horas:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {auditoria.horasReales} / {auditoria.horasEstimadas}h
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center ml-6">
                        <div className="text-3xl font-black text-blue-600 mb-1">{auditoria.avance}%</div>
                        <div className="text-xs text-gray-500">Avance</div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all"
                        style={{ width: `${auditoria.avance}%` }}
                      ></div>
                    </div>

                    {/* Etiquetas de vinculación */}
                    <div className="flex items-center gap-2">
                      {auditoria.auditoriaOCIGId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Vinculada OCIG
                        </span>
                      )}
                      {auditoria.hallazgosCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          {auditoria.hallazgosCount} Hallazgos
                        </span>
                      )}
                      {auditoria.planMejoramientoId && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Plan de Mejoramiento
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3: VINCULACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface TabVinculacionProps {
  auditorias: AuditoriaProgramada[];
  estadisticas: Estadisticas;
}

function TabVinculacion({ auditorias, estadisticas }: TabVinculacionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Estadísticas de vinculación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">Vinculadas OCIG</span>
            <Link2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{estadisticas.vinculadasOCIG}</p>
          <p className="text-xs text-blue-600 mt-1">de {estadisticas.totalProgramadas} programadas</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-red-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-red-700">Con Hallazgos</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-700">{estadisticas.conHallazgos}</p>
          <p className="text-xs text-red-600 mt-1">auditorías con hallazgos</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-700">Planes Mejoramiento</span>
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-700">{estadisticas.conPlanesMejoramiento}</p>
          <p className="text-xs text-green-600 mt-1">planes activos</p>
        </div>
      </div>

      {/* Mapa de vinculación */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-black text-gray-900 mb-4">
          Mapa de Integración
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Visualización de la integración entre el Programa Anual, Auditorías OCIG y Planes de Mejoramiento
        </p>

        <div className="space-y-4">
          {auditorias.filter(a => a.auditoriaOCIGId).map((auditoria) => (
            <div key={auditoria.id} className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-6">
                {/* Programa Anual */}
                <div className="flex-1 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">PROGRAMA ANUAL</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{auditoria.nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">{auditoria.proceso.nombre}</p>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

                {/* Auditoría OCIG */}
                <div className="flex-1 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-700">AUDITORÍA OCIG</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">ID: {auditoria.auditoriaOCIGId}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-bold">
                      {auditoria.estado}
                    </span>
                    <span className="text-xs text-gray-600">{auditoria.avance}% avance</span>
                  </div>
                </div>

                {auditoria.planMejoramientoId && (
                  <>
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    
                    {/* Plan de Mejoramiento */}
                    <div className="flex-1 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-bold text-green-700">PLAN MEJORAMIENTO</span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">ID: {auditoria.planMejoramientoId}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-bold">
                          {auditoria.hallazgosCount} Hallazgos
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}