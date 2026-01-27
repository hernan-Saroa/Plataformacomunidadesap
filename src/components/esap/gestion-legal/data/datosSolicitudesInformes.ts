/**
 * DATOS SOLICITUDES INFORMES - MOD-05
 * Control de Términos e Informes
 */

import { SolicitudInforme } from '../core/types';

/**
 * Solicitudes consolidadas con 3 alertas en diferentes estados (semáforo)
 */
export const solicitudesConsolidadas: SolicitudInforme[] = [
  // ========== ALERTA 1: ESTADO ROJO (Urgente - Vencido) ==========
  {
    id: 'SI-2025-001',
    etapa: 'EN_GESTION',
    tipoInforme: 'Informe Contraloría',
    enteSolicitante: 'Contraloría General de la República',
    radicadoExterno: 'CGR-2024-8765',
    asunto: 'Informe de ejecución presupuestal vigencia 2024',
    descripcion: 'Solicitud urgente de informe detallado sobre ejecución presupuestal del cuarto trimestre de 2024 con desglose por rubros y proyectos.',
    responsable: 'María Rodríguez',
    fechaSolicitud: new Date('2025-01-15'),
    fechaVencimiento: new Date('2025-01-25'), // Vencido (menos de 2 días)
    diasTotales: 10,
    diasRestantes: -1, // VENCIDO
    datosRequeridos: [
      'Ejecución presupuestal Q4 2024',
      'Certificaciones CDP/RP',
      'Informe de gestión financiera'
    ]
  },

  // ========== ALERTA 2: ESTADO AMARILLO (Próximo a vencer - 2-5 días) ==========
  {
    id: 'SI-2025-002',
    etapa: 'RECIBIDA',
    tipoInforme: 'Concepto Jurídico',
    enteSolicitante: 'Dirección de Contratación - ESAP',
    radicadoExterno: 'CONT-2025-0123',
    asunto: 'Concepto sobre viabilidad jurídica licitación pública LP-2025-004',
    descripcion: 'Solicitud de concepto jurídico sobre posibles inhabilidades e incompatibilidades de proponentes para la licitación pública de infraestructura tecnológica.',
    responsable: 'Carlos Méndez',
    fechaSolicitud: new Date('2025-01-20'),
    fechaVencimiento: new Date('2025-01-29'), // 3 días restantes (AMARILLO)
    diasTotales: 9,
    diasRestantes: 3,
    datosRequeridos: [
      'Pliego de condiciones',
      'Certificados RUP proponentes',
      'Antecedentes contractuales'
    ]
  },

  // ========== ALERTA 3: ESTADO VERDE (En término normal - más de 5 días) ==========
  {
    id: 'SI-2025-003',
    etapa: 'EN_REVISION',
    tipoInforme: 'Informe Procuraduría',
    enteSolicitante: 'Procuraduría General de la Nación',
    radicadoExterno: 'PGN-2025-1456',
    asunto: 'Informe de seguimiento a procesos disciplinarios internos',
    descripcion: 'Reporte consolidado de procesos disciplinarios adelantados por la Oficina de Control Interno Disciplinario durante el año 2024, con estado actual de cada caso.',
    responsable: 'Ana Patricia Gómez',
    fechaSolicitud: new Date('2025-01-18'),
    fechaVencimiento: new Date('2025-02-05'), // 10 días restantes (VERDE)
    diasTotales: 18,
    diasRestantes: 10,
    datosRequeridos: [
      'Relación de procesos disciplinarios 2024',
      'Estados procesales actualizados',
      'Sanciones impuestas'
    ]
  }
];

/**
 * Estadísticas del módulo
 */
export const estadisticasTerminosInformes = {
  totalSolicitudes: 3,
  enTermino: 1,      // Verde
  proximoVencer: 1,  // Amarillo
  vencidos: 1,       // Rojo
  cumplidos: 0
};
