/**
 * MOD-11: PLANES DE MEJORAMIENTO - Datos de ejemplo
 * Hallazgos CGR, Control Interno, Autoevaluación
 */

import type { PlanMejoramiento } from '../core/types';

export const planesMejoramiento: PlanMejoramiento[] = [
  {
    id: 'PM-2025-001',
    codigoHallazgo: 'H-CGR-2024-001',
    etapa: 'EN_EJECUCION',
    fuente: 'CGR',
    tipo: 'ADMINISTRATIVO',
    auditoriaOrigen: 'Auditoría de Cumplimiento 2024',
    descripcionHallazgo: 'Debilidades en seguimiento de términos procesales',
    causaRaiz: 'Falta de sistema automatizado de alertas y dependencia de seguimiento manual',
    fechaHallazgo: new Date('2024-09-15'),
    fechaLimite: new Date('2025-06-30'),
    diasRestantes: 190,
    acciones: [
      {
        id: 'ACC-001',
        descripcion: 'Implementar módulo SIGL con alertas automáticas',
        tipo: 'CORRECTIVA',
        responsable: 'OTIC',
        fechaInicio: new Date('2024-10-01'),
        fechaFin: new Date('2025-03-31'),
        estado: 'EN_CURSO',
        avance: 75,
        evidencias: []
      },
      {
        id: 'ACC-002',
        descripcion: 'Capacitar equipo jurídico en uso del sistema',
        tipo: 'PREVENTIVA',
        responsable: 'Jefe OJ',
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-04-30'),
        estado: 'EN_CURSO',
        avance: 50,
        evidencias: []
      },
      {
        id: 'ACC-003',
        descripcion: 'Documentar procedimiento de seguimiento',
        tipo: 'CORRECTIVA',
        responsable: 'Coordinador Defensa Judicial',
        fechaInicio: new Date('2025-02-01'),
        fechaFin: new Date('2025-05-31'),
        estado: 'PENDIENTE',
        avance: 0,
        evidencias: []
      }
    ],
    avanceGlobal: 62.5,
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2024-09-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'PM-2025-002',
    codigoHallazgo: 'H-CGR-2024-002',
    etapa: 'VERIFICACION',
    fuente: 'CGR',
    tipo: 'ADMINISTRATIVO',
    auditoriaOrigen: 'Auditoría Financiera 2024',
    descripcionHallazgo: 'Falta de conciliación contable mensual entre Oficina Jurídica y Contabilidad',
    causaRaiz: 'Ausencia de procedimiento formal de conciliación y periodicidad definida',
    fechaHallazgo: new Date('2024-08-20'),
    fechaLimite: new Date('2025-02-28'),
    diasRestantes: 68,
    acciones: [
      {
        id: 'ACC-004',
        descripcion: 'Establecer procedimiento de conciliación mensual',
        tipo: 'CORRECTIVA',
        responsable: 'Jefe OJ + Director Financiero',
        fechaInicio: new Date('2024-09-01'),
        fechaFin: new Date('2024-11-30'),
        estado: 'CERRADA',
        avance: 100,
        evidencias: []
      },
      {
        id: 'ACC-005',
        descripcion: 'Ejecutar conciliaciones mensuales vigencia 2025',
        tipo: 'CORRECTIVA',
        responsable: 'Coordinador Defensa Judicial',
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-12-15'),
        estado: 'EN_CURSO',
        avance: 92,
        evidencias: []
      },
      {
        id: 'ACC-006',
        descripcion: 'Capacitar personal en nuevo procedimiento',
        tipo: 'PREVENTIVA',
        responsable: 'Talento Humano',
        fechaInicio: new Date('2024-10-01'),
        fechaFin: new Date('2024-12-15'),
        estado: 'CERRADA',
        avance: 100,
        evidencias: []
      }
    ],
    avanceGlobal: 97.3,
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2024-08-20'),
    fechaActualizacion: new Date('2025-12-20'),
    estado: 'ACTIVO'
  },
  {
    id: 'PM-2025-003',
    codigoHallazgo: 'H-CGR-2023-015',
    etapa: 'EN_EJECUCION',
    fuente: 'CGR',
    tipo: 'FISCAL',
    auditoriaOrigen: 'Auditoría Especial Contratación 2023',
    descripcionHallazgo: 'Contrato interadministrativo No. 2022-IA-001 sin liquidar dentro del término legal',
    causaRaiz: 'Falta de seguimiento sistemático a ejecución contractual y ausencia de alertas de vencimiento',
    fechaHallazgo: new Date('2024-01-15'),
    fechaLimite: new Date('2025-01-15'),
    diasRestantes: 24,
    acciones: [
      {
        id: 'ACC-007',
        descripcion: 'Liquidar contrato 2022-IA-001',
        tipo: 'CORRECTIVA',
        responsable: 'Dr. López',
        fechaInicio: new Date('2024-02-01'),
        fechaFin: new Date('2024-04-30'),
        estado: 'CERRADA',
        avance: 100,
        evidencias: []
      },
      {
        id: 'ACC-008',
        descripcion: 'Implementar matriz de seguimiento contractual',
        tipo: 'PREVENTIVA',
        responsable: 'Dra. García',
        fechaInicio: new Date('2024-03-01'),
        fechaFin: new Date('2024-06-30'),
        estado: 'CERRADA',
        avance: 100,
        evidencias: []
      },
      {
        id: 'ACC-009',
        descripcion: 'Capacitar equipo en supervisión contractual',
        tipo: 'PREVENTIVA',
        responsable: 'Jefe OJ',
        fechaInicio: new Date('2024-06-01'),
        fechaFin: new Date('2024-08-31'),
        estado: 'CERRADA',
        avance: 100,
        evidencias: []
      },
      {
        id: 'ACC-010',
        descripcion: 'Implementar módulo SIGL para alertas de liquidación',
        tipo: 'PREVENTIVA',
        responsable: 'OTIC',
        fechaInicio: new Date('2024-07-01'),
        fechaFin: new Date('2024-12-31'),
        estado: 'EN_CURSO',
        avance: 80,
        evidencias: []
      },
      {
        id: 'ACC-011',
        descripcion: 'Depurar contratos pendientes de liquidación (histórico)',
        tipo: 'CORRECTIVA',
        responsable: 'Secretaría General',
        fechaInicio: new Date('2024-09-01'),
        fechaFin: new Date('2025-01-15'),
        estado: 'EN_CURSO',
        avance: 70,
        evidencias: []
      }
    ],
    avanceGlobal: 90,
    responsable: 'Jefe Oficina Jurídica',
    cuantia: 125000000,
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2024-01-15'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'PM-2025-004',
    codigoHallazgo: 'H-CI-2025-003',
    etapa: 'FORMULACION',
    fuente: 'AUDITORIA_INTERNA',
    tipo: 'OBSERVACION',
    auditoriaOrigen: 'Auditoría Interna Proceso Jurídico Q3-2025',
    descripcionHallazgo: 'Ausencia de indicadores de gestión del proceso jurídico',
    causaRaiz: 'Falta de definición de indicadores en el marco del MIPG',
    fechaHallazgo: new Date('2025-10-15'),
    fechaLimite: new Date('2026-04-15'),
    diasRestantes: 295,
    acciones: [
      {
        id: 'ACC-012',
        descripcion: 'Definir batería de indicadores del proceso jurídico',
        tipo: 'MEJORA_CONTINUA',
        responsable: 'Jefe OJ + Planeación',
        fechaInicio: new Date('2025-11-01'),
        fechaFin: new Date('2026-01-31'),
        estado: 'EN_CURSO',
        avance: 40,
        evidencias: []
      },
      {
        id: 'ACC-013',
        descripcion: 'Implementar módulo de indicadores en SIGL',
        tipo: 'MEJORA_CONTINUA',
        responsable: 'OTIC',
        fechaInicio: new Date('2026-02-01'),
        fechaFin: new Date('2026-04-15'),
        estado: 'PENDIENTE',
        avance: 0,
        evidencias: []
      }
    ],
    avanceGlobal: 20,
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-10-15'),
    fechaActualizacion: new Date('2025-12-20'),
    estado: 'ACTIVO'
  },
  {
    id: 'PM-2025-005',
    codigoHallazgo: 'H-AUTO-2025-001',
    etapa: 'APROBADO',
    fuente: 'AUTOEVALUACION',
    tipo: 'OBSERVACION',
    auditoriaOrigen: 'Autoevaluación MIPG 2025',
    descripcionHallazgo: 'Baja calificación en dimensión de Gestión del Conocimiento',
    causaRaiz: 'Ausencia de repositorio centralizado de conceptos jurídicos y jurisprudencia',
    fechaHallazgo: new Date('2025-11-01'),
    fechaLimite: new Date('2026-03-31'),
    diasRestantes: 220,
    acciones: [
      {
        id: 'ACC-014',
        descripcion: 'Adquirir base de datos jurisprudencial',
        tipo: 'MEJORA_CONTINUA',
        responsable: 'Jefe OJ',
        fechaInicio: new Date('2025-12-01'),
        fechaFin: new Date('2026-01-31'),
        estado: 'PENDIENTE',
        avance: 0,
        evidencias: []
      },
      {
        id: 'ACC-015',
        descripcion: 'Crear repositorio de conceptos jurídicos en SharePoint',
        tipo: 'MEJORA_CONTINUA',
        responsable: 'OTIC',
        fechaInicio: new Date('2026-01-01'),
        fechaFin: new Date('2026-02-28'),
        estado: 'PENDIENTE',
        avance: 0,
        evidencias: []
      }
    ],
    avanceGlobal: 0,
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-11-01'),
    fechaActualizacion: new Date('2025-12-15'),
    estado: 'ACTIVO'
  }
];
