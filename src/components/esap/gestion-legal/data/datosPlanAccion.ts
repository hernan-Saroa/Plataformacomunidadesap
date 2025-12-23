/**
 * MOD-09: PLAN DE ACCIÓN - Datos de ejemplo
 * Indicadores de gestión, FURAG, MIPG
 */

import type { IndicadorPlanAccion } from '../core/types';

export const indicadoresPlanAccion: IndicadorPlanAccion[] = [
  {
    id: 'IND-2025-001',
    codigo: 'IND-001',
    nombre: '% Cumplimiento términos procesales',
    objetivoPEI: 'Fortalecer la gestión jurídica institucional',
    formula: '(Procesos en término / Total procesos) * 100',
    meta: 98,
    lineaBase: 92,
    ejecutado: 97.2,
    cumplimiento: 99.2,
    periodicidad: 'TRIMESTRAL',
    responsable: 'Jefe Oficina Jurídica',
    etapa: 'EN_EJECUCION',
    avances: [
      {
        periodo: 'Q1-2025',
        valorEjecutado: 95.5,
        valorProgramado: 96,
        cumplimiento: 99.5,
        observaciones: 'Avance satisfactorio'
      },
      {
        periodo: 'Q2-2025',
        valorEjecutado: 96.8,
        valorProgramado: 97,
        cumplimiento: 99.8,
        observaciones: 'Mejora continua'
      },
      {
        periodo: 'Q3-2025',
        valorEjecutado: 97.2,
        valorProgramado: 98,
        cumplimiento: 99.2,
        observaciones: 'Cerca de la meta'
      }
    ],
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'IND-2025-002',
    codigo: 'IND-002',
    nombre: '% Asesorías respondidas en término (30 días)',
    objetivoPEI: 'Fortalecer la gestión jurídica institucional',
    formula: '(Asesorías en término / Total asesorías) * 100',
    meta: 95,
    lineaBase: 88,
    ejecutado: 96.2,
    cumplimiento: 101.3,
    periodicidad: 'MENSUAL',
    responsable: 'Coordinador Asesoría Jurídica',
    etapa: 'EN_EJECUCION',
    avances: [
      {
        periodo: 'Nov-2025',
        valorEjecutado: 95.8,
        valorProgramado: 95,
        cumplimiento: 100.8,
        observaciones: 'Superada la meta mensual'
      },
      {
        periodo: 'Dic-2025',
        valorEjecutado: 96.2,
        valorProgramado: 95,
        cumplimiento: 101.3,
        observaciones: 'Excelente desempeño'
      }
    ],
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'IND-2025-003',
    codigo: 'IND-003',
    nombre: '% Recuperación cartera coactiva',
    objetivoPEI: 'Mejorar la gestión financiera institucional',
    formula: '(Monto recaudado / Monto total cartera) * 100',
    meta: 80,
    lineaBase: 65,
    ejecutado: 71.5,
    cumplimiento: 89.4,
    periodicidad: 'TRIMESTRAL',
    responsable: 'Coordinador Procesos Coactivos',
    etapa: 'EN_EJECUCION',
    avances: [
      {
        periodo: 'Q1-2025',
        valorEjecutado: 68,
        valorProgramado: 75,
        cumplimiento: 90.7,
        observaciones: 'Bajo lo esperado'
      },
      {
        periodo: 'Q2-2025',
        valorEjecutado: 70,
        valorProgramado: 77.5,
        cumplimiento: 90.3,
        observaciones: 'Mejora leve'
      },
      {
        periodo: 'Q3-2025',
        valorEjecutado: 71.5,
        valorProgramado: 80,
        cumplimiento: 89.4,
        observaciones: 'Requiere plan de acción'
      }
    ],
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'IND-2025-004',
    codigo: 'IND-004',
    nombre: '% Tutelas falladas a favor de ESAP',
    objetivoPEI: 'Fortalecer la defensa judicial',
    formula: '(Tutelas ganadas / Total tutelas) * 100',
    meta: 85,
    lineaBase: 78,
    ejecutado: 92,
    cumplimiento: 108.2,
    periodicidad: 'SEMESTRAL',
    responsable: 'Coordinador Defensa Judicial',
    etapa: 'EN_EJECUCION',
    avances: [
      {
        periodo: 'S1-2025',
        valorEjecutado: 90,
        valorProgramado: 85,
        cumplimiento: 105.9,
        observaciones: 'Excelente desempeño'
      },
      {
        periodo: 'S2-2025',
        valorEjecutado: 92,
        valorProgramado: 85,
        cumplimiento: 108.2,
        observaciones: 'Meta superada significativamente'
      }
    ],
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'IND-2025-005',
    codigo: 'IND-005',
    nombre: 'Reducción tiempos de respuesta a org. control',
    objetivoPEI: 'Fortalecer relaciones con organismos de control',
    formula: '((Tiempo anterior - Tiempo actual) / Tiempo anterior) * 100',
    meta: -20, // Reducción del 20%
    lineaBase: 12.5,
    ejecutado: -8, // Reducción del 8%
    cumplimiento: 40,
    periodicidad: 'TRIMESTRAL',
    responsable: 'Jefe Oficina Jurídica',
    etapa: 'EN_EJECUCION',
    avances: [
      {
        periodo: 'Q1-2025',
        valorEjecutado: -6,
        valorProgramado: -15,
        cumplimiento: 40,
        observaciones: 'Rezagado - Incremento carga CGR'
      },
      {
        periodo: 'Q2-2025',
        valorEjecutado: -7,
        valorProgramado: -17.5,
        cumplimiento: 40,
        observaciones: 'Sin mejora significativa'
      },
      {
        periodo: 'Q3-2025',
        valorEjecutado: -8,
        valorProgramado: -20,
        cumplimiento: 40,
        observaciones: 'Requiere plan de mejora urgente'
      }
    ],
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  }
];
