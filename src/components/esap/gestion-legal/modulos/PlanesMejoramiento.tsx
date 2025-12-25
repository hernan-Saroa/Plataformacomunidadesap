/**
 * MOD-11: Planes de Mejoramiento
 * DISEÑO 100% COHERENTE CON DEFENSA JUDICIAL
 * Gestión de planes de mejoramiento derivados de hallazgos
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, Clock, ChevronDown,
  AlertCircle, CheckCircle, List, Columns3,
  ClipboardCheck, Filter, Search, Download,
  MessageSquare, FileCheck, Send, Archive, Calendar,
  Eye, AlertTriangle, TrendingUp, Target
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Progress } from '../../../ui/progress';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';

// Types
interface AccionMejoramiento {
  id: string;
  numeroPlan: string;
  hallazgo: string;
  accionPropuesta: string;
  responsable: string;
  fechaInicio: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  diasTotales: number;
  etapa: 'PLANEACION' | 'EJECUCION' | 'SEGUIMIENTO' | 'CERRADO';
  avance: number;
  tipoHallazgo: 'AUDITORIA_INTERNA' | 'AUDITORIA_EXTERNA' | 'CONTROL_INTERNO' | 'ORGANO_CONTROL';
  origen: string;
  ultimaActuacion?: string;
  evidencias?: number;
}

// Datos mock
const accionesMejoramientoMock: AccionMejoramiento[] = [
  {
    id: 'PM-2024-001',
    numeroPlan: 'PLAN-CGR-2024-01',
    hallazgo: 'Debilidad en control documental de contratos',
    accionPropuesta: 'Implementar sistema digital de gestión documental para contratos',
    responsable: 'Dra. María Fernández',
    fechaInicio: new Date('2024-11-01'),
    fechaVencimiento: new Date('2025-02-28'),
    diasRestantes: 65,
    diasTotales: 120,
    etapa: 'EJECUCION',
    avance: 45,
    tipoHallazgo: 'ORGANO_CONTROL',
    origen: 'Contraloría General - Auditoría 2024',
    ultimaActuacion: 'Adquisición de software completada, en fase de implementación',
    evidencias: 8
  },
  {
    id: 'PM-2024-002',
    numeroPlan: 'PLAN-AUD-INT-2024-03',
    hallazgo: 'Falta de procedimiento documentado para gestión de riesgos legales',
    accionPropuesta: 'Elaborar y aprobar procedimiento de identificación y gestión de riesgos legales',
    responsable: 'Dr. Carlos Méndez',
    fechaInicio: new Date('2024-12-01'),
    fechaVencimiento: new Date('2025-01-15'),
    diasRestantes: 21,
    diasTotales: 45,
    etapa: 'EJECUCION',
    avance: 60,
    tipoHallazgo: 'AUDITORIA_INTERNA',
    origen: 'Auditoría Interna - Control Legal Q4',
    ultimaActuacion: 'Procedimiento en revisión con comité de calidad',
    evidencias: 5
  },
  {
    id: 'PM-2024-003',
    numeroPlan: 'PLAN-CI-2024-02',
    hallazgo: 'Ausencia de matriz de seguimiento a términos judiciales',
    accionPropuesta: 'Diseñar e implementar matriz de control de términos con alertas automáticas',
    responsable: 'Dra. Laura González',
    fechaInicio: new Date('2024-10-15'),
    fechaVencimiento: new Date('2024-12-30'),
    diasRestantes: 5,
    diasTotales: 75,
    etapa: 'SEGUIMIENTO',
    avance: 85,
    tipoHallazgo: 'CONTROL_INTERNO',
    origen: 'Control Interno - Evaluación procesos',
    ultimaActuacion: 'Matriz implementada, en periodo de prueba y ajustes',
    evidencias: 12
  },
  {
    id: 'PM-2024-004',
    numeroPlan: 'PLAN-EXT-2024-01',
    hallazgo: 'Capacitación insuficiente del equipo en normativa disciplinaria',
    accionPropuesta: 'Ejecutar plan de capacitación en normativa disciplinaria actualizada',
    responsable: 'Dr. Juan Pérez',
    fechaInicio: new Date('2024-09-01'),
    fechaVencimiento: new Date('2024-12-20'),
    diasRestantes: -5,
    diasTotales: 110,
    etapa: 'CERRADO',
    avance: 100,
    tipoHallazgo: 'AUDITORIA_EXTERNA',
    origen: 'Auditoría Externa - ICONTEC ISO 9001',
    ultimaActuacion: 'Capacitación completada el 18/12/2024, certificados emitidos',
    evidencias: 15
  },
  {
    id: 'PM-2024-005',
    numeroPlan: 'PLAN-CGR-2024-02',
    hallazgo: 'Demora en respuestas a derechos de petición',
    accionPropuesta: 'Crear flujo automatizado de radicación y seguimiento de derechos de petición',
    responsable: 'Dra. Ana López',
    fechaInicio: new Date('2024-12-10'),
    fechaVencimiento: new Date('2025-03-10'),
    diasRestantes: 75,
    diasTotales: 90,
    etapa: 'PLANEACION',
    avance: 15,
    tipoHallazgo: 'ORGANO_CONTROL',
    origen: 'Contraloría - Hallazgo gestión PQRS',
    ultimaActuacion: 'Levantamiento de requisitos funcionales completado',
    evidencias: 3
  },
];

export function PlanesMejoramiento() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Agrupar por etapa
  const accionesPorEtapa = {
    PLANEACION: accionesMejoramientoMock.filter(a => a.etapa === 'PLANEACION'),
    EJECUCION: accionesMejoramientoMock.filter(a => a.etapa === 'EJECUCION'),
    SEGUIMIENTO: accionesMejoramientoMock.filter(a => a.etapa === 'SEGUIMIENTO'),
    CERRADO: accionesMejoramientoMock.filter(a => a.etapa === 'CERRADO'),
  };

  // Estadísticas
  const totalAcciones = accionesMejoramientoMock.length;
  const enRiesgo = accionesMejoramientoMock.filter(a => a.diasRestantes <= 10 && a.diasRestantes > 0).length;
  const vencidas = accionesMejoramientoMock.filter(a => a.diasRestantes < 0 && a.etapa !== 'CERRADO').length;
  const avancePromedio = Math.round(accionesMejoramientoMock.reduce((sum, a) => sum + a.avance, 0) / totalAcciones);

  const etapas = [
    { 
      nombre: 'Planeación', 
      color: '#6B7280', 
      icono: <FileCheck className="w-4 h-4 text-gray-600" />, 
      diasEstimados: 15,
      acciones: accionesPorEtapa.PLANEACION
    },
    { 
      nombre: 'Ejecución', 
      color: '#F59E0B', 
      icono: <Target className="w-4 h-4 text-amber-600" />, 
      diasEstimados: 60,
      acciones: accionesPorEtapa.EJECUCION
    },
    { 
      nombre: 'Seguimiento', 
      color: '#3B82F6', 
      icono: <TrendingUp className="w-4 h-4 text-blue-600" />, 
      diasEstimados: 30,
      acciones: accionesPorEtapa.SEGUIMIENTO
    },
    { 
      nombre: 'Cerrado', 
      color: '#10B981', 
      icono: <CheckCircle className="w-4 h-4 text-green-600" />, 
      diasEstimados: 0,
      acciones: accionesPorEtapa.CERRADO
    },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <ModuleHeader
            title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
            subtitle="Gestión de planes de mejoramiento institucional"
            toggleView={{
              current: tipoVista,
              onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
              options: [
                { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
                { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
              ]
            }}
            buttons={[
              {
                label: 'Nuevo Plan',
                labelMobile: 'Nuevo',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => toast.info('Nuevo Plan de Mejoramiento'),
                variant: 'primary'
              }
            ]}
          />
        </div>
        
        {/* Info Tooltip */}
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip
            title="Guía de Planes de Mejoramiento"
            variant="icon"
            sections={[
              {
                label: "📋 Propósito del Módulo",
                content: "Gestión de planes de mejoramiento derivados de hallazgos identificados por auditorías internas, auditorías externas, órganos de control (CGR, Contraloría, Procuraduría) y sistema de control interno. Permite planear, ejecutar, monitorear y cerrar acciones correctivas para mejorar procesos institucionales.",
                type: "default"
              },
              {
                label: "🔍 Origen de los Hallazgos",
                content: "Los hallazgos provienen de: 🔎 AUDITORÍA INTERNA: Revisiones del equipo de control interno de ESAP | 🏛️ AUDITORÍA EXTERNA: Certificadoras ISO, firmas de auditoría | 🚨 ÓRGANOS DE CONTROL: CGR, Contraloría, Procuraduría, Fiscalía | ✅ CONTROL INTERNO: Autoevaluación de procesos.",
                type: "info"
              },
              {
                label: "🔄 Etapas del Ciclo de Mejoramiento (4 Fases)",
                content: "1️⃣ PLANEACIÓN (15 días): Formulación del plan, asignación de responsables, definición de cronograma → 2️⃣ EJECUCIÓN (60 días): Implementación de acciones correctivas y preventivas → 3️⃣ SEGUIMIENTO (30 días): Verificación de cumplimiento y efectividad → 4️⃣ CERRADO: Plan completado y validado por el auditor/órgano de control.",
                type: "premium"
              },
              {
                label: "🚦 Semáforo de Términos",
                content: "🔴 VENCIDA (<0 días): Incumplimiento del plazo - riesgo de sanciones por órganos de control | 🟡 URGENTE (1-10 días): Acción inmediata requerida | 🟢 EN TÉRMINO (>10 días): Cumplimiento normal del cronograma. El sistema alerta automáticamente cuando se acercan vencimientos.",
                type: "warning"
              },
              {
                label: "📊 Avance y Evidencias",
                content: "Cada acción tiene: • % de Avance: Indica progreso de implementación (0-100%) | • Evidencias: Documentos probatorios (actas, informes, registros, capturas de pantalla, correos). Mínimo 3 evidencias por acción para cierre exitoso.",
                type: "default"
              },
              {
                label: "📋 Marco Normativo",
                content: "Los planes de mejoramiento son OBLIGATORIOS según: Ley 87/1993 (Control Interno), Decreto 943/2014 (MECI), Ley 610/2000 (Responsabilidad fiscal). El incumplimiento puede generar hallazgos fiscales y sanciones a funcionarios responsables.",
                type: "warning"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Los planes se vinculan con: • Riesgos (acciones correctivas para riesgos extremos/altos) • Órganos de Control (hallazgos de CGR, Contraloría) • Plan de Acción (indicadores de cumplimiento de PEI) • Juzgamiento (acciones disciplinarias por incumplimiento).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nuevo Plan' cuando llegue un hallazgo de auditoría → 2️⃣ Arrastra tarjetas entre etapas según avance (Planeación → Ejecución → Seguimiento → Cerrado) → 3️⃣ Actualiza % de avance semanalmente → 4️⃣ Adjunta evidencias en botón 'Evidencias' → 5️⃣ Solicita cierre cuando esté 100% completo.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Los planes cerrados se archivan para auditorías futuras. Las lecciones aprendidas se incorporan al módulo 'Riesgos' para prevenir recurrencia. Los informes de cumplimiento se presentan trimestralmente a Órganos de Control y al Comité de Control Interno.",
                type: "info"
              }
            ]}
          />
        </div>
      </div>

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total',
            value: totalAcciones,
            icon: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
            color: 'blue'
          },
          {
            label: 'En Riesgo',
            value: enRiesgo,
            icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
            color: 'orange'
          },
          {
            label: 'Vencidas',
            value: vencidas,
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            color: 'red'
          },
          {
            label: 'Avance',
            value: `${avancePromedio}%`,
            icon: <TrendingUp className="w-5 h-5 text-green-600" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        filters={[
          {
            label: 'Etapa',
            options: [
              { value: 'PLANEACION', label: 'Planeación' },
              { value: 'EJECUCION', label: 'Ejecución' },
              { value: 'SEGUIMIENTO', label: 'Seguimiento' },
              { value: 'CERRADO', label: 'Cerrado' }
            ]
          },
          {
            label: 'Tipo de Hallazgo',
            options: [
              { value: 'AUDITORIA_INTERNA', label: 'Auditoría Interna' },
              { value: 'AUDITORIA_EXTERNA', label: 'Auditoría Externa' },
              { value: 'CONTROL_INTERNO', label: 'Control Interno' },
              { value: 'ORGANO_CONTROL', label: 'Órgano de Control' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban */}
      {tipoVista === 'kanban' && (
        <div className="relative">
          {(isMobile || isTablet) && (
            <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
              <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                Desliza
              </p>
            </div>
          )}
          
          <div 
            className={`flex gap-3 md:gap-4 overflow-x-auto pb-4 ${isMobile ? '-mx-4 px-4' : ''} scroll-smooth`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 #F7FAFC',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {etapas.map((etapa) => (
              <ColumnaKanban key={etapa.nombre} etapa={etapa} isMobile={isMobile} isTablet={isTablet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Columna Kanban
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    acciones: AccionMejoramiento[];
  };
  isMobile: boolean;
  isTablet: boolean;
}

function ColumnaKanban({ etapa, isMobile, isTablet }: ColumnaKanbanProps) {
  return (
    <motion.div className="flex-shrink-0" initial={{ width: 320 }} animate={{ width: 320 }}>
      <Card className="h-full border border-gray-200 bg-white">
        <div className={`${isMobile ? 'p-3' : 'p-4'} border-b bg-gray-50`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}>
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                  {etapa.nombre}
                </h3>
                {etapa.diasEstimados > 0 && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {etapa.diasEstimados} días
                  </p>
                )}
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.acciones.length}
            </Badge>
          </div>
        </div>

        <div 
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`} 
          style={{ maxHeight: isMobile ? 'calc(100vh - 400px)' : 'calc(100vh - 300px)' }}
        >
          {etapa.acciones.map((accion) => (
            <TarjetaAccion key={accion.id} accion={accion} isMobile={isMobile} />
          ))}

          {etapa.acciones.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">Sin acciones en {etapa.nombre}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Componente Tarjeta Acción
interface TarjetaAccionProps {
  accion: AccionMejoramiento;
  isMobile: boolean;
}

function TarjetaAccion({ accion, isMobile }: TarjetaAccionProps) {
  const getSemaforoColor = (diasRestantes: number, avance: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', label: 'Vencida' };
    if (diasRestantes <= 10) return { color: '#F59E0B', label: 'Urgente' };
    if (avance >= 80) return { color: '#10B981', label: 'En término' };
    return { color: '#3B82F6', label: 'Normal' };
  };

  const semaforo = getSemaforoColor(accion.diasRestantes, accion.avance);

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
      <div className="h-1" style={{ background: '#003DA5' }} />

      <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`} style={{ background: '#E0EDFF' }}>
              <ClipboardCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                {accion.id}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {accion.numeroPlan}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-2 pb-2 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">📋 Hallazgo:</p>
          <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-2`}>
            {accion.hallazgo}
          </p>
        </div>

        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
              <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                {accion.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
              <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                {accion.responsable}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <Badge className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200" style={{ color: semaforo.color }}>
            <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
            {Math.abs(accion.diasRestantes)} días {accion.diasRestantes < 0 ? 'vencido' : 'restantes'}
          </Badge>
        </div>

        {/* Barra de progreso */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Avance:</span>
            <span className="text-xs font-bold text-gray-900">{accion.avance}%</span>
          </div>
          <Progress value={accion.avance} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{accion.evidencias || 0}</p>
            <p className="text-xs text-gray-500">Evidencias</p>
          </div>
          <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
            <p className="text-xs font-bold text-gray-700">{accion.diasTotales - accion.diasRestantes}</p>
            <p className="text-xs text-gray-500">Días</p>
          </div>
        </div>

        <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
          <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
            ÚLTIMA ACTUACIÓN
          </p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
            {accion.ultimaActuacion || 'Sin actuaciones registradas'}
          </p>
          <p className="text-xs text-gray-500">
            📅 {accion.fechaInicio.toLocaleDateString('es-CO')}
          </p>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-200">
          <Button
            onClick={() => toast.info('Ver Plan', { description: accion.id })}
            size="sm"
            className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
            Ver Plan
          </Button>

          <div className="grid grid-cols-2 gap-1">
            <Button
              onClick={() => toast.info('Evidencias')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Evidencias
            </Button>
            
            <Button
              onClick={() => toast.info('Seguimiento')}
              size="sm"
              variant="outline"
              className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
            >
              <TrendingUp className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
              Seguimiento
            </Button>
          </div>

          <Button
            onClick={() => toast.info('Comentarios')}
            size="sm"
            className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
            Comentarios
          </Button>
        </div>
      </div>
    </Card>
  );
}