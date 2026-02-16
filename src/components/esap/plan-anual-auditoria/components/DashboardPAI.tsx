/**
 * ============================================
 * DASHBOARD PAI - PLAN ANUAL DE AUDITORÍA
 * ============================================
 * 
 * Dashboard ejecutivo del módulo PAI completamente
 * independiente. Reutiliza componentes existentes.
 * 
 * INTEGRACIÓN:
 * - Usa KPICard de control-interno
 * - Usa BadgeDecreto648 existente
 * - Usa VencimientosWidget
 * - Usa TimelineActividades
 * 
 * NO DUPLICA CÓDIGO
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, FileText, Users, TrendingUp, CheckCircle2, Clock, AlertTriangle, Download, Plus, Search, Filter, BarChart3, Shield, Target } from 'lucide-react';

// ✅ REUTILIZAR componentes existentes de control-interno
import { KPICard } from '../../control-interno/components/KPICard';
import { BadgeDecreto648 } from '../../control-interno/components/BadgeDecreto648';
import { VencimientosWidget } from '../../control-interno/components/VencimientosWidget';
import { TimelineActividades } from '../../control-interno/components/TimelineActividades';

// ✅ Servicio de exportación
import { exportarPlanAnual, validarPlanParaExportacion } from '../services/exportacionPAI';

// ✅ Types oficiales del PAI
import type { 
  PlanAnualAuditoria, 
  EstadoPAI,
  EstadisticasPAI,
  RolPAI,
  AuditoriaProgramada,
  InformeLey,
  ProximoVencimiento
} from './types';

interface DashboardPAIProps {
  planVigente?: PlanAnualAuditoria;
  onCrearNuevoPlan?: () => void;
  onVerPlan?: (planId: string) => void;
  onEditarPlan?: (planId: string) => void;
  onExportarPlan?: (planId: string, formato: 'Excel-EMFO001' | 'PDF-Corporativo' | 'Word-Editable') => void;
  onVerSeguimiento?: () => void;
  onVerInformesLey?: () => void;
}

/**
 * ============================================
 * DASHBOARD PRINCIPAL PAI
 * ============================================
 */
export function DashboardPAI({
  planVigente,
  onCrearNuevoPlan,
  onVerPlan,
  onEditarPlan,
  onExportarPlan,
  onVerSeguimiento,
  onVerInformesLey
}: DashboardPAIProps) {
  
  const [filtroEstado, setFiltroEstado] = useState<EstadoPAI | 'Todos'>('Todos');
  const [vistaActual, setVistaActual] = useState<'resumen' | 'cronograma' | 'roles' | 'informes'>('resumen');

  // ============================================
  // DATOS MOCK (Temporal - reemplazar con servicio)
  // ============================================
  const planMock: PlanAnualAuditoria | undefined = planVigente || {
    id: 'PAI-2026-001',
    codigo: 'PAI-2026-V1',
    estado: 'En Ejecución',
    datosGenerales: {
      vigencia: 2026,
      version: 1,
      codigoPlan: 'PAI-2026-V1',
      nombreInstitucion: 'ESAP',
      nit: '899.999.061-6',
      sector: 'Educación Superior',
      naturalezaJuridica: 'Establecimiento Público',
      jefeOCI: {
        id: 'OCI-001',
        nombreCompleto: 'Mario Oswaldo Bernal',
        cargo: 'Jefe Oficina Control Interno',
        email: 'mario.bernal@esap.edu.co',
        telefono: '601-2222800',
        activo: true,
        fechaNombramiento: '2020-01-15',
        resolucionNombramiento: 'Resolución 001-2020',
        perfilProfesional: 'Contador Público, Especialista en Control Interno'
      },
      fechaElaboracion: '2025-12-01',
      fechaAprobacion: '2025-12-15',
      fechaPublicacion: '2025-12-20',
      objetivoGeneral: 'Evaluar la gestión institucional mediante auditorías internas con enfoque preventivo, verificando el cumplimiento de metas, objetivos estratégicos y la efectividad del Sistema de Control Interno de la ESAP durante la vigencia 2026.',
      objetivosEspecificos: [
        'Evaluar la efectividad de los controles implementados en los procesos críticos',
        'Verificar el cumplimiento de la normatividad aplicable',
        'Identificar oportunidades de mejora en la gestión institucional',
        'Fortalecer la cultura de control y autocontrol'
      ],
      alcance: 'Todos los procesos estratégicos, misionales y de apoyo de la ESAP',
      misionESAP: 'Formar servidores públicos y desarrollar conocimiento especializado en administración pública.',
      visionESAP: 'Ser la institución líder en formación y conocimiento en administración pública en Colombia.',
      objetivosEstrategicosInstitucionales: [
        'Excelencia académica',
        'Investigación de alto impacto',
        'Gestión eficiente',
        'Transparencia y control'
      ]
    },
    rolesDecreto648: [] as RolPAI[],
    validacionDecreto648: {
      cumpleDecretoCompleto: true,
      puntajeTotal: 100,
      tieneCincoRoles: true,
      todosRolesTienenActividades: true,
      actividadesCumplenMinimo: true,
      fechasEstanCompletas: true,
      responsablesAsignados: true,
      seguimientosDefinidos: true,
      errores: [],
      advertencias: [],
      recomendaciones: []
    },
    estadisticas: {
      totalRoles: 5,
      rolesCompletados: 2,
      rolesEnProgreso: 3,
      totalActividades: 22,
      actividadesCompletadas: 7,
      actividadesEnEjecucion: 10,
      actividadesNoIniciadas: 5,
      actividadesRetrasadas: 0,
      totalHorasEstimadas: 9000,
      totalHorasEjecutadas: 4050,
      porcentajeHorasUtilizadas: 45,
      porcentajeAvanceGeneral: 45,
      porcentajeCumplimientoDecretoDecreto648: 100,
      estadisticasPorRol: [],
      actividadesCompletadasPorMes: [],
      distribucionEstados: []
    },
    modificaciones: [],
    historialEstados: [
      {
        estado: 'Borrador',
        fecha: '2025-12-01',
        responsable: 'Mario Oswaldo Bernal',
        observaciones: 'Inicio de elaboración'
      },
      {
        estado: 'En Revisión',
        fecha: '2025-12-10',
        responsable: 'Mario Oswaldo Bernal',
        observaciones: 'Enviado para revisión'
      },
      {
        estado: 'Aprobado',
        fecha: '2025-12-15',
        responsable: 'Director Nacional ESAP',
        observaciones: 'Aprobado sin observaciones'
      },
      {
        estado: 'En Ejecución',
        fecha: '2026-01-01',
        responsable: 'Mario Oswaldo Bernal',
        observaciones: 'Inicio de ejecución vigencia 2026'
      }
    ],
    creadoPor: 'mario.bernal@esap.edu.co',
    fechaCreacion: '2025-12-01',
    metadata: {
      formatoOficial: 'EMFO001 PAI 2025 V.6',
      versionFormato: '6.0',
      publicadoEnWeb: true,
      urlPublicacion: 'https://www.esap.edu.co/control-interno/pai-2026',
      decretosCumplidos: ['Decreto 648/2017', 'Ley 87/1993'],
      guiasAplicadas: ['Guía rol OCI DAFP', 'Guía evaluación de riesgos DAFP']
    }
  };

  // Auditorías programadas (mock)
  const auditoriasProgramadas: AuditoriaProgramada[] = [
    {
      id: 'AUD-2026-001',
      codigo: 'AUD-2026-001',
      nombre: 'Auditoría Gestión Financiera',
      objetivo: 'Evaluar controles financieros y presupuestales',
      alcance: 'Proceso financiero y contable',
      tipo: 'Auditoría Interna Regular',
      unidadAuditableId: 'UA-001',
      unidadAuditableNombre: 'Dirección Financiera',
      riesgoAsociado: 'Alto',
      liderAuditoria: 'AUD-001',
      equipoAuditor: ['AUD-002', 'AUD-003'],
      fechaInicioEstimada: '2026-01-15',
      fechaFinEstimada: '2026-02-28',
      duracionDias: 30,
      horasEstimadas: 120,
      estado: 'En Ejecución',
      fechaInicioReal: '2026-01-15',
      horasEjecutadas: 54,
      porcentajeAvance: 45,
      planMejoramientoGenerado: false,
      observaciones: '',
      documentos: []
    },
    {
      id: 'AUD-2026-002',
      codigo: 'AUD-2026-002',
      nombre: 'Auditoría Contratación',
      objetivo: 'Verificar cumplimiento normativa contractual',
      alcance: 'Proceso de contratación',
      tipo: 'Auditoría Interna Regular',
      unidadAuditableId: 'UA-002',
      unidadAuditableNombre: 'Gestión Contractual',
      riesgoAsociado: 'Crítico',
      liderAuditoria: 'AUD-001',
      equipoAuditor: ['AUD-004', 'AUD-005'],
      fechaInicioEstimada: '2026-03-01',
      fechaFinEstimada: '2026-04-30',
      duracionDias: 45,
      horasEstimadas: 150,
      estado: 'Programada',
      horasEjecutadas: 0,
      porcentajeAvance: 0,
      planMejoramientoGenerado: false,
      observaciones: '',
      documentos: []
    }
  ];

  // Informes próximos (mock)
  const proximosInformes: ProximoVencimiento[] = [
    {
      informeId: 'INF-001',
      informeNombre: 'Control Interno Contable',
      fechaVencimiento: '2026-02-28',
      diasFaltantes: 28,
      prioridad: 'Urgente',
      estado: 'En Elaboración'
    },
    {
      informeId: 'INF-002',
      informeNombre: 'Seguimiento Plan Mejoramiento CGR',
      fechaVencimiento: '2026-03-15',
      prioridad: 'Alta',
      estado: 'Pendiente'
    },
    {
      informeId: 'INF-003',
      informeNombre: 'Transparencia y Ética Pública',
      fechaVencimiento: '2026-04-30',
      diasFaltantes: 90,
      prioridad: 'Media',
      estado: 'Pendiente'
    }
  ];

  // ============================================
  // CÁLCULOS DERIVADOS
  // ============================================
  const estadisticas = useMemo(() => {
    if (!planMock) return null;
    return planMock.estadisticas;
  }, [planMock]);

  // ============================================
  // RENDER
  // ============================================
  if (!planMock) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gradient-to-br from-[#E0EDFF] to-white">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-[#003DA5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#003DA5]" />
          </div>
          <h3 className="text-2xl font-bold text-[#003DA5] mb-2">
            No hay Plan Anual vigente
          </h3>
          <p className="text-gray-600 mb-6">
            Para comenzar, crea el Plan Anual de Auditoría para la vigencia actual
          </p>
          <button
            onClick={onCrearNuevoPlan}
            className="px-6 py-3 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Crear Plan Anual {new Date().getFullYear()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#E0EDFF]">
      {/* ============================================
          HEADER DEL MÓDULO PAI
          ============================================ */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white px-8 py-6 shadow-xl">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  📋 Plan Anual de Auditoría Interna
                </h1>
                <p className="text-white text-opacity-90 text-lg">
                  Módulo Estratégico | Decreto 648/2017
                </p>
              </div>
            </div>
            
            {/* Badge Decreto 648 */}
            <div className="flex items-center space-x-3">
              <BadgeDecreto648 
                porcentajeCumplimiento={planMock.validacionDecreto648.puntajeTotal}
                size="lg"
              />
              <div className="px-4 py-2 bg-white bg-opacity-20 rounded-xl backdrop-blur">
                <div className="text-xs text-white text-opacity-80">Vigencia</div>
                <div className="text-xl font-bold">{planMock.datosGenerales.vigencia}</div>
              </div>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex space-x-2 mt-4">
            {[
              { id: 'resumen', label: '📊 Resumen', icon: BarChart3 },
              { id: 'cronograma', label: '📅 Cronograma', icon: Calendar },
              { id: 'roles', label: '🎯 Roles Decreto 648', icon: Target },
              { id: 'informes', label: '📄 Informes de Ley', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVistaActual(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                  vistaActual === tab.id
                    ? 'bg-white text-[#003DA5] shadow-lg'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================
          CONTENIDO PRINCIPAL
          ============================================ */}
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        
        {/* Vista: RESUMEN */}
        {vistaActual === 'resumen' && (
          <div className="space-y-6">
            
            {/* KPIs Principales - REUTILIZAMOS KPICard existente */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                titulo="PAI Vigente"
                valor={planMock.datosGenerales.vigencia.toString()}
                subtitulo={`Estado: ${planMock.estado}`}
                tendencia="neutral"
                icono={<FileText className="w-6 h-6" />}
                color="#003DA5"
              />
              
              <KPICard
                titulo="Cumplimiento Decreto 648"
                valor={`${planMock.validacionDecreto648.puntajeTotal}%`}
                subtitulo={`${estadisticas?.totalRoles}/5 Roles · ${estadisticas?.totalActividades}/22 Actividades`}
                tendencia="positive"
                icono={<Shield className="w-6 h-6" />}
                color="#10B981"
              />
              
              <KPICard
                titulo="Progreso Anual"
                valor={`${estadisticas?.porcentajeAvanceGeneral}%`}
                subtitulo={`${estadisticas?.actividadesCompletadas}/${estadisticas?.totalActividades} actividades completadas`}
                tendencia="positive"
                icono={<TrendingUp className="w-6 h-6" />}
                color="#2962FF"
              />
              
              <KPICard
                titulo="Auditorías"
                valor="15"
                subtitulo="7 Ejecutadas · 8 Pendientes"
                tendencia="neutral"
                icono={<CheckCircle2 className="w-6 h-6" />}
                color="#F57C00"
              />
            </div>

            {/* Segunda fila de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <KPICard
                titulo="Recursos OCI"
                valor="5"
                subtitulo="Auditores disponibles"
                tendencia="neutral"
                icono={<Users className="w-6 h-6" />}
                color="#8B5CF6"
              />
              
              <KPICard
                titulo="Horas Ejecutadas"
                valor={`${estadisticas?.totalHorasEjecutadas.toLocaleString()}`}
                subtitulo={`de ${estadisticas?.totalHorasEstimadas.toLocaleString()} horas (${estadisticas?.porcentajeHorasUtilizadas}%)`}
                tendencia="positive"
                icono={<Clock className="w-6 h-6" />}
                color="#003DA5"
              />
              
              <KPICard
                titulo="Informes de Ley"
                valor="28"
                subtitulo="✅ Al día"
                tendencia="positive"
                icono={<FileText className="w-6 h-6" />}
                color="#10B981"
              />
            </div>

            {/* Contenido de 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Columna izquierda (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Cronograma de Auditorías */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[#003DA5] flex items-center">
                      <Calendar className="w-6 h-6 mr-2" />
                      📆 Cronograma de Auditorías 2026
                    </h2>
                    <button className="px-4 py-2 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold hover:bg-[#003DA5] hover:text-white transition-all">
                      Ver Completo
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {auditoriasProgramadas.map(auditoria => (
                      <div 
                        key={auditoria.id}
                        className="p-4 bg-gradient-to-r from-[#E0EDFF] to-white rounded-xl border-2 border-[#003DA5] border-opacity-20 hover:border-opacity-100 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              auditoria.estado === 'En Ejecución' 
                                ? 'bg-[#2962FF] bg-opacity-20 text-[#2962FF]'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {auditoria.estado === 'En Ejecución' ? '▶️' : '⏸️'}
                            </div>
                            <div>
                              <h3 className="font-bold text-[#003DA5]">{auditoria.nombre}</h3>
                              <p className="text-sm text-gray-600">{auditoria.unidadAuditableNombre}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              auditoria.riesgoAsociado === 'Crítico' 
                                ? 'bg-red-100 text-red-700'
                                : auditoria.riesgoAsociado === 'Alto'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {auditoria.riesgoAsociado}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(auditoria.fechaInicioEstimada).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - {new Date(auditoria.fechaFinEstimada).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        {auditoria.estado === 'En Ejecución' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progreso</span>
                              <span className="font-semibold">{auditoria.porcentajeAvance}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#003DA5] to-[#2962FF]"
                                style={{ width: `${auditoria.porcentajeAvance}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                              <span>{auditoria.horasEjecutadas}h ejecutadas</span>
                              <span>{auditoria.horasEstimadas}h estimadas</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline de Actividades - REUTILIZAMOS componente existente */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-[#003DA5] flex items-center mb-6">
                    <Clock className="w-6 h-6 mr-2" />
                    ⏱️ Timeline de Actividades Recientes
                  </h2>
                  <TimelineActividades 
                    actividades={[
                      {
                        id: '1',
                        tipo: 'Auditoría iniciada',
                        descripcion: 'Se inició la Auditoría de Gestión Financiera',
                        fecha: '2026-01-15T08:00:00',
                        usuario: 'Mario Oswaldo Bernal',
                        icono: '🚀'
                      },
                      {
                        id: '2',
                        tipo: 'Informe entregado',
                        descripcion: 'Informe de evaluación independiente del Sistema de Control Interno',
                        fecha: '2026-01-10T14:30:00',
                        usuario: 'Mario Oswaldo Bernal',
                        icono: '📄'
                      },
                      {
                        id: '3',
                        tipo: 'Plan aprobado',
                        descripcion: 'PAI 2026 aprobado por Director Nacional',
                        fecha: '2025-12-15T10:00:00',
                        usuario: 'Director Nacional',
                        icono: '✅'
                      }
                    ]}
                  />
                </div>

              </div>

              {/* Columna derecha (1/3) */}
              <div className="space-y-6">
                
                {/* Widget de Vencimientos - REUTILIZAMOS componente existente */}
                <VencimientosWidget 
                  vencimientos={proximosInformes}
                  titulo="📋 Informes Próximos"
                />

                {/* Acciones Rápidas */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-[#003DA5] mb-4">
                    ⚡ Acciones Rápidas
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => onVerPlan?.(planMock.id)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Ver PAI 2026
                    </button>
                    
                    <button
                      onClick={() => onEditarPlan?.(planMock.id)}
                      className="w-full px-4 py-3 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold hover:bg-[#003DA5] hover:text-white transition-all flex items-center justify-center"
                    >
                      ✏️ Editar Plan
                    </button>
                    
                    <button
                      onClick={() => onExportarPlan?.(planMock.id, 'Excel-EMFO001')}
                      className="w-full px-4 py-3 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold hover:bg-[#10B981] hover:text-white transition-all flex items-center justify-center"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      📊 Exportar EMFO001
                    </button>
                    
                    <button
                      onClick={onVerSeguimiento}
                      className="w-full px-4 py-3 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold hover:bg-[#F57C00] hover:text-white transition-all flex items-center justify-center"
                    >
                      📈 Ver Seguimiento
                    </button>
                    
                    <button
                      onClick={onVerInformesLey}
                      className="w-full px-4 py-3 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold hover:bg-[#003DA5] hover:text-white transition-all flex items-center justify-center"
                    >
                      📄 Ver Informes de Ley
                    </button>
                  </div>
                </div>

                {/* Info del Jefe OCI */}
                <div className="bg-gradient-to-br from-[#003DA5] to-[#2962FF] rounded-2xl shadow-lg p-6 text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">Jefe OCI</h3>
                      <p className="text-sm text-white text-opacity-80">Responsable del PAI</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">{planMock.datosGenerales.jefeOCI.nombreCompleto}</p>
                    <p className="text-white text-opacity-80">{planMock.datosGenerales.jefeOCI.cargo}</p>
                    <p className="text-white text-opacity-80">{planMock.datosGenerales.jefeOCI.email}</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Vista: CRONOGRAMA */}
        {vistaActual === 'cronograma' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#003DA5] mb-6">
              📅 Cronograma Detallado de Auditorías
            </h2>
            <p className="text-gray-600 mb-4">
              Vista completa del cronograma anual de auditorías (por implementar)
            </p>
          </div>
        )}

        {/* Vista: ROLES */}
        {vistaActual === 'roles' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#003DA5] mb-6 flex items-center">
              <Target className="w-8 h-8 mr-3" />
              🎯 Roles y Actividades Decreto 648/2017
            </h2>
            <p className="text-gray-600 mb-4">
              Gestión de los 5 roles y 22 actividades obligatorias (por implementar)
            </p>
          </div>
        )}

        {/* Vista: INFORMES */}
        {vistaActual === 'informes' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#003DA5] mb-6">
              📄 Calendario de Informes de Ley
            </h2>
            <p className="text-gray-600 mb-4">
              Gestión de los 28 informes obligatorios de la OCI (por implementar)
            </p>
          </div>
        )}

      </div>
    </div>
  );
}