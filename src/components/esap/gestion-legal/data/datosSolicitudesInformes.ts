/**
 * Datos Mock - Solicitudes de Informes (MOD-05)
 * Mock data para el módulo de Términos para Informes
 * 
 * 🔄 SINCRONIZACIÓN AUTOMÁTICA:
 * Este archivo combina:
 * 1. Términos AUTO-GENERADOS desde otros módulos (Defensa Judicial, Juzgamiento)
 * 2. Solicitudes directas de informes (Órganos de Control, PQRS, etc.)
 */

import { SolicitudInforme } from '../core/types';
import { expedientesJudicialesMock } from './datosExpedientesJudicialesExpandido';
import { sincronizarTodosLosTerminos } from '../services/sincronizacionTerminos';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

function fechaDentro(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

// Función para crear fecha específica en diciembre 2025
function fechaDiciembre(dia: number): Date {
  return new Date(2025, 11, dia); // 11 = diciembre (0-indexed)
}

export const solicitudesInformesMock: SolicitudInforme[] = [
  // ============ SOLICITUDES CRÍTICAS (≤2 días) - ROJAS ============
  {
    id: 'SI-2025-001',
    etapa: 'REVISIÓN',
    tipoInforme: 'Informe Procuraduría',
    enteSolicitante: 'Procuraduría General de la Nación',
    radicadoExterno: 'PGN-2025-156',
    asunto: 'Informe sobre procesos disciplinarios en curso',
    descripcion: 'Consolidado de procesos disciplinarios activos con estado actual',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(8),
    fechaVencimiento: fechaDiciembre(26), // 26 de diciembre - CRÍTICO
    diasTotales: 10,
    diasRestantes: 1,
    datosRequeridos: ['Procesos disciplinarios', 'Estado procesal'],
    // 🔗 INTEGRACIÓN TRANSVERSAL
    moduloOrigen: 'ORGANOS_CONTROL',
    tipoTermino: 'ENTE_CONTROL',
    esImprorrogable: true,
    baseNormativa: 'Ley 1952 de 2019 - Art. 52',
    consecuenciaIncumplimiento: 'Presunción de falta de colaboración con órgano de control'
  },
  {
    id: 'SI-2025-002',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Respuesta Tutela',
    enteSolicitante: 'Juzgado 10 Civil',
    radicadoExterno: 'TUT-2025-089',
    asunto: 'Respuesta a tutela sobre procesos laborales',
    descripcion: 'Informe urgente sobre estado de procesos laborales del peticionario',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(3),
    fechaVencimiento: fechaDiciembre(27), // 27 de diciembre - CRÍTICO
    diasTotales: 5,
    diasRestantes: 2,
    datosRequeridos: ['Procesos laborales', 'Estado actual'],
    // 🔗 INTEGRACIÓN TRANSVERSAL
    moduloOrigen: 'DEFENSA_JUDICIAL',
    tipoTermino: 'JUDICIAL',
    expedienteRelacionado: 'PJ-2025-089',
    esImprorrogable: true,
    baseNormativa: 'Decreto 2591 de 1991 - Art. 14',
    consecuenciaIncumplimiento: 'Desacato - Posible incidente penal y multa'
  },
  {
    id: 'SI-2025-003',
    etapa: 'RECIBIDA',
    tipoInforme: 'Derecho de Petición',
    enteSolicitante: 'Ciudadano',
    radicadoExterno: 'PET-2025-345',
    asunto: 'Solicitud información sobre contratación pública',
    responsable: 'Dr. Carlos Mendoza',
    fechaSolicitud: fechaHace(13),
    fechaVencimiento: fechaDiciembre(30), // 30 de diciembre - CRÍTICO
    diasTotales: 15,
    diasRestantes: 1,
    datosRequeridos: ['Contratos vigentes'],
    // 🔗 INTEGRACIÓN TRANSVERSAL
    moduloOrigen: 'CENTRO_COMUNICACIONES',
    tipoTermino: 'ADMINISTRATIVO',
    esImprorrogable: false,
    baseNormativa: 'Código Contencioso Administrativo - Art. 14',
    consecuenciaIncumplimiento: 'Silencio administrativo positivo'
  },

  // ============ SOLICITUDES URGENTES (3-5 días) - AMARILLAS ============
  {
    id: 'SI-2025-004',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Informe Ejecutivo',
    enteSolicitante: 'Dirección General ESAP',
    radicadoExterno: 'DG-2025-045',
    asunto: 'Estado de procesos judiciales críticos',
    descripcion: 'Reporte ejecutivo de procesos con alto riesgo económico',
    responsable: 'Dra. Ana González',
    fechaSolicitud: fechaHace(7),
    fechaVencimiento: fechaDiciembre(29), // 29 de diciembre - URGENTE
    diasTotales: 10,
    diasRestantes: 4,
    datosRequeridos: ['Procesos críticos', 'Riesgos', 'Provisiones']
  },
  {
    id: 'SI-2025-005',
    etapa: 'REVISIÓN',
    tipoInforme: 'Informe Contraloría',
    enteSolicitante: 'Contraloría General de la República',
    radicadoExterno: 'CGR-2025-0234',
    asunto: 'Informe trimestral de gestión legal Q4-2024',
    descripcion: 'Consolidado trimestral de procesos judiciales, sentencias y provisiones',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(10),
    fechaVencimiento: fechaDiciembre(28), // 28 de diciembre - URGENTE
    diasTotales: 15,
    diasRestantes: 3,
    datosRequeridos: ['Procesos activos', 'Sentencias', 'Provisiones']
  },
  {
    id: 'SI-2025-006',
    etapa: 'RECIBIDA',
    tipoInforme: 'Concepto Jurídico',
    enteSolicitante: 'Oficina de Planeación',
    radicadoExterno: 'PLAN-2025-067',
    asunto: 'Concepto sobre legalidad de proyecto de inversión',
    responsable: 'Dra. Patricia Rojas',
    fechaSolicitud: fechaHace(5),
    fechaVencimiento: fechaDiciembre(31), // 31 de diciembre - URGENTE
    diasTotales: 10,
    diasRestantes: 5,
    datosRequeridos: ['Normatividad aplicable', 'Riesgos legales']
  },

  // ============ SOLICITUDES EN TÉRMINO (>5 días) - VERDES ============
  {
    id: 'SI-2025-007',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe al Congreso',
    enteSolicitante: 'Congreso de la República',
    radicadoExterno: 'CONG-2025-012',
    asunto: 'Informe anual de gestión jurídica 2024',
    descripcion: 'Informe completo de gestión legal del año 2024 para el Congreso',
    responsable: 'Dr. Carlos Mendoza',
    fechaSolicitud: fechaHace(3),
    fechaVencimiento: new Date(2026, 0, 3), // 3 de enero 2026 - EN TÉRMINO
    diasTotales: 20,
    diasRestantes: 8,
    datosRequeridos: ['Gestión anual', 'Estadísticas', 'Resultados', 'Logros']
  },
  {
    id: 'SI-2025-008',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Informe Defensoria',
    enteSolicitante: 'Defensoría del Pueblo',
    radicadoExterno: 'DEF-2025-089',
    asunto: 'Informe sobre derechos humanos en procesos disciplinarios',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(2),
    fechaVencimiento: new Date(2026, 0, 5), // 5 de enero 2026 - EN TÉRMINO
    diasTotales: 15,
    diasRestantes: 10,
    datosRequeridos: ['Procesos disciplinarios', 'Garantías']
  },
  {
    id: 'SI-2025-009',
    etapa: 'RECIBIDA',
    tipoInforme: 'Respuesta Ente de Control',
    enteSolicitante: 'Auditoría General de la República',
    radicadoExterno: 'AUD-2025-123',
    asunto: 'Informe sobre hallazgos de auditoría jurídica',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(1),
    fechaVencimiento: new Date(2026, 0, 7), // 7 de enero 2026 - EN TÉRMINO
    diasTotales: 12,
    diasRestantes: 12,
    datosRequeridos: ['Hallazgos', 'Planes de mejora']
  },
  {
    id: 'SI-2025-010',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe Archivo General',
    enteSolicitante: 'Archivo General de la Nación',
    radicadoExterno: 'AGN-2025-023',
    asunto: 'Informe de gestión documental legal',
    descripcion: 'Reporte sobre organización y conservación de expedientes legales',
    responsable: 'Dra. Ana González',
    fechaSolicitud: fechaHace(0),
    fechaVencimiento: new Date(2026, 0, 10), // 10 de enero 2026 - EN TÉRMINO
    diasTotales: 15,
    diasRestantes: 15,
    datosRequeridos: ['Gestión documental', 'Inventario']
  },

  // ============ SOLICITUDES DISTRIBUIDAS EN DICIEMBRE ============
  {
    id: 'SI-2025-011',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe Trimestral',
    enteSolicitante: 'Ministerio de Hacienda',
    radicadoExterno: 'MHAC-2025-078',
    asunto: 'Informe de provisiones contables Q1-2025',
    responsable: 'Dr. Carlos Mendoza',
    fechaSolicitud: fechaHace(18),
    fechaVencimiento: fechaDiciembre(3), // 3 de diciembre
    diasTotales: 20,
    diasRestantes: -22,
    datosRequeridos: ['Provisiones', 'Contingencias']
  },
  {
    id: 'SI-2025-012',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Concepto Técnico',
    enteSolicitante: 'Oficina Jurídica Territorial',
    radicadoExterno: 'OJT-2025-156',
    asunto: 'Concepto sobre competencias territoriales',
    responsable: 'Dra. Patricia Rojas',
    fechaSolicitud: fechaHace(15),
    fechaVencimiento: fechaDiciembre(8), // 8 de diciembre
    diasTotales: 18,
    diasRestantes: -17,
    datosRequeridos: ['Normatividad', 'Precedentes']
  },
  {
    id: 'SI-2025-013',
    etapa: 'REVISIÓN',
    tipoInforme: 'Informe Mensual',
    enteSolicitante: 'Rectoría Nacional',
    radicadoExterno: 'RECT-2025-234',
    asunto: 'Informe mensual de gestión legal - Noviembre',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(10),
    fechaVencimiento: fechaDiciembre(12), // 12 de diciembre
    diasTotales: 15,
    diasRestantes: -13,
    datosRequeridos: ['Estadísticas mensuales']
  },
  {
    id: 'SI-2025-014',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Respuesta Derecho de Petición',
    enteSolicitante: 'Asociación de Usuarios',
    radicadoExterno: 'ASOU-2025-045',
    asunto: 'Información sobre procesos de responsabilidad fiscal',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(8),
    fechaVencimiento: fechaDiciembre(15), // 15 de diciembre
    diasTotales: 15,
    diasRestantes: -10,
    datosRequeridos: ['Procesos fiscales']
  },
  {
    id: 'SI-2025-015',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe Ejecutivo',
    enteSolicitante: 'Consejo Directivo',
    radicadoExterno: 'CD-2025-089',
    asunto: 'Estado de litigios de alto impacto',
    responsable: 'Dr. Carlos Mendoza',
    fechaSolicitud: fechaHace(5),
    fechaVencimiento: fechaDiciembre(18), // 18 de diciembre
    diasTotales: 12,
    diasRestantes: -7,
    datosRequeridos: ['Litigios críticos', 'Impacto económico']
  },
  {
    id: 'SI-2025-016',
    etapa: 'RECIBIDA',
    tipoInforme: 'Informe Estadístico',
    enteSolicitante: 'DANE',
    radicadoExterno: 'DANE-2025-123',
    asunto: 'Estadísticas de litigiosidad institucional',
    responsable: 'Dra. Ana González',
    fechaSolicitud: fechaHace(3),
    fechaVencimiento: fechaDiciembre(20), // 20 de diciembre
    diasTotales: 10,
    diasRestantes: -5,
    datosRequeridos: ['Estadísticas', 'Tendencias']
  },
  {
    id: 'SI-2025-017',
    etapa: 'EN_ELABORACIÓN',
    tipoInforme: 'Informe de Riesgos',
    enteSolicitante: 'Oficina de Control Interno',
    radicadoExterno: 'OCI-2025-067',
    asunto: 'Matriz de riesgos legales Q4-2024',
    responsable: 'Dr. Juan Pérez López',
    fechaSolicitud: fechaHace(2),
    fechaVencimiento: fechaDiciembre(23), // 23 de diciembre
    diasTotales: 8,
    diasRestantes: -2,
    datosRequeridos: ['Riesgos', 'Controles', 'Mitigación']
  },

  // ============ SOLICITUDES VENCIDAS (PASADAS) ============
  {
    id: 'SI-2025-018',
    etapa: 'ENVIADO',
    tipoInforme: 'Informe Mensual',
    enteSolicitante: 'Archivo General de la Nación',
    radicadoExterno: 'AGN-2025-001',
    asunto: 'Informe de gestión documental - Octubre',
    responsable: 'Dra. María Torres',
    fechaSolicitud: fechaHace(35),
    fechaVencimiento: fechaHace(20),
    diasTotales: 15,
    diasRestantes: -20,
    datosRequeridos: ['Gestión documental']
  },
];

// ============================================================================
// 🔄 AUTO-GENERACIÓN DE TÉRMINOS DESDE OTROS MÓDULOS
// ============================================================================

/**
 * Genera términos automáticamente desde expedientes de otros módulos
 * Esta función se ejecuta al cargar el módulo y consolida TODOS los términos activos
 */
export function generarTerminosConsolidados(): SolicitudInforme[] {
  // 1. Términos manuales (solicitudes directas de informes)
  const terminosManuales = [...solicitudesInformesMock];
  
  // 2. Términos auto-generados desde otros módulos (PJ, PD, AJ)
  const terminosAutoGenerados = sincronizarTodosLosTerminos();
  
  // 3. Combinar y ordenar por fecha de vencimiento
  const todosLosTerminos = [
    ...terminosManuales,
    ...terminosAutoGenerados
  ].sort((a, b) => {
    return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
  });
  
  return todosLosTerminos;
}

// ============================================================================
// EXPORT: Lista consolidada (manual + auto-generados)
// ============================================================================

// 🔄 SINCRONIZACIÓN AUTOMÁTICA ACTIVADA
// Esta lista combina solicitudes manuales + términos auto-generados desde otros módulos
export const solicitudesConsolidadas = generarTerminosConsolidados();

// Para testing/desarrollo, usar solo manuales:
// export const solicitudesConsolidadas = solicitudesInformesMock;

export const estadisticasTerminosInformes = {
  total: solicitudesConsolidadas.length,
  criticas: solicitudesConsolidadas.filter((s) => s.diasRestantes <= 2).length,
  urgentes: solicitudesConsolidadas.filter((s) => s.diasRestantes > 2 && s.diasRestantes <= 5).length,
  enTermino: solicitudesConsolidadas.filter((s) => s.diasRestantes > 5).length,
};