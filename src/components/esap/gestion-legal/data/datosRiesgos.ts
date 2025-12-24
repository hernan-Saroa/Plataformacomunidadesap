/**
 * MOD-10: RIESGOS - Datos de ejemplo
 * Mapa de calor, DAFP, ISO 31000
 */

import type { Riesgo } from '../core/types';

export const riesgos: Riesgo[] = [
  {
    id: 'R-2025-001',
    codigo: 'R-001',
    etapa: 'TRATAMIENTO',
    proceso: 'Defensa Judicial',
    tipo: 'GESTION',
    nombre: 'Vencimiento de términos procesales',
    descripcion: 'Posibilidad de que se venzan términos legales en procesos judiciales por falta de seguimiento',
    causas: [
      'Alta carga de trabajo de abogados',
      'Falta de sistema de alertas automatizado',
      'Dependencia de seguimiento manual en Excel',
      'Rotación de personal'
    ],
    consecuencias: [
      'Pérdida de procesos judiciales',
      'Condenas económicas contra la entidad',
      'Sanciones disciplinarias a funcionarios',
      'Afectación reputacional'
    ],
    probabilidadInherente: 5,
    impactoInherente: 4,
    zonaInherente: 'EXTREMO',
    probabilidadResidual: 3,
    impactoResidual: 3,
    zonaResidual: 'MODERADO',
    controlesExistentes: [
      {
        id: 'C1',
        descripcion: 'Revisión semanal de expedientes (Manual)',
        efectividad: 40
      },
      {
        id: 'C2',
        descripcion: 'Alertas en calendario Outlook (Parcial)',
        efectividad: 30
      },
      {
        id: 'C3',
        descripcion: 'Reuniones de seguimiento quincenal',
        efectividad: 50
      }
    ],
    planTratamiento: [
      {
        accion: 'Implementar SIGL con alertas automáticas',
        responsable: 'OTIC',
        fechaLimite: new Date('2026-03-31'),
        estado: 'EN_CURSO',
        avance: 60
      },
      {
        accion: 'Contratar abogado adicional',
        responsable: 'Talento Humano',
        fechaLimite: new Date('2026-06-30'),
        estado: 'PENDIENTE',
        avance: 0
      }
    ],
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-01-20'),
    fechaActualizacion: new Date('2025-12-22'),
    estado: 'ACTIVO'
  },
  {
    id: 'R-2025-002',
    codigo: 'R-002',
    etapa: 'MONITOREO',
    proceso: 'Órganos de Control',
    tipo: 'CORRUPCION',
    nombre: 'Manipulación de información reportada a CGR',
    descripcion: 'Riesgo de alteración de datos en informes a organismos de control',
    causas: [
      'Presión por mostrar buenos resultados',
      'Falta de controles cruzados',
      'Concentración de funciones en una sola persona'
    ],
    consecuencias: [
      'Hallazgos fiscales',
      'Investigaciones penales',
      'Pérdida de credibilidad institucional',
      'Sanciones de la CGR'
    ],
    probabilidadInherente: 3,
    impactoInherente: 4,
    zonaInherente: 'ALTO',
    probabilidadResidual: 2,
    impactoResidual: 3,
    zonaResidual: 'MODERADO',
    controlesExistentes: [
      {
        id: 'C4',
        descripcion: 'Doble revisión de informes',
        efectividad: 60
      },
      {
        id: 'C5',
        descripcion: 'Trazabilidad en sistema SIGL',
        efectividad: 70
      },
      {
        id: 'C6',
        descripcion: 'Auditorías internas aleatorias',
        efectividad: 55
      }
    ],
    planTratamiento: [
      {
        accion: 'Implementar firma digital y trazabilidad completa',
        responsable: 'OTIC',
        fechaLimite: new Date('2026-02-28'),
        estado: 'EN_CURSO',
        avance: 45
      }
    ],
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-02-10'),
    fechaActualizacion: new Date('2025-12-20'),
    estado: 'ACTIVO'
  },
  {
    id: 'R-2025-003',
    codigo: 'R-003',
    etapa: 'VALORADO',
    proceso: 'Procesos Coactivos',
    tipo: 'FISCAL',
    nombre: 'Prescripción de obligaciones por falta de seguimiento',
    descripcion: 'Riesgo de pérdida del derecho de cobro por vencimiento del término de prescripción',
    causas: [
      'Desactualización de la cartera',
      'Falta de sistema de alertas de prescripción',
      'Demora en actuaciones procesales'
    ],
    consecuencias: [
      'Pérdida de recursos públicos',
      'Detrimento patrimonial',
      'Responsabilidad fiscal de funcionarios',
      'Hallazgos de CGR'
    ],
    probabilidadInherente: 4,
    impactoInherente: 3,
    zonaInherente: 'ALTO',
    probabilidadResidual: 2,
    impactoResidual: 3,
    zonaResidual: 'MODERADO',
    controlesExistentes: [
      {
        id: 'C7',
        descripcion: 'Matriz de seguimiento de cartera',
        efectividad: 50
      },
      {
        id: 'C8',
        descripcion: 'Revisión trimestral de prescripciones',
        efectividad: 45
      }
    ],
    planTratamiento: [
      {
        accion: 'Implementar módulo SIGL con alertas automáticas de prescripción',
        responsable: 'OTIC',
        fechaLimite: new Date('2026-04-30'),
        estado: 'PENDIENTE',
        avance: 0
      }
    ],
    responsable: 'Coordinador Procesos Coactivos',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-03-15'),
    fechaActualizacion: new Date('2025-12-18'),
    estado: 'ACTIVO'
  },
  {
    id: 'R-2025-004',
    codigo: 'R-004',
    etapa: 'MONITOREO',
    proceso: 'Asesoría Jurídica',
    tipo: 'GESTION',
    nombre: 'Conceptos jurídicos errados o desactualizados',
    descripcion: 'Riesgo de emitir conceptos jurídicos incorrectos por desactualización normativa',
    causas: [
      'Cambios normativos frecuentes',
      'Falta de capacitación continua',
      'Ausencia de base de datos jurisprudencial actualizada'
    ],
    consecuencias: [
      'Decisiones administrativas incorrectas',
      'Demandas contra la entidad',
      'Afectación de derechos de terceros',
      'Responsabilidad disciplinaria'
    ],
    probabilidadInherente: 3,
    impactoInherente: 3,
    zonaInherente: 'MODERADO',
    probabilidadResidual: 2,
    impactoResidual: 2,
    zonaResidual: 'BAJO',
    controlesExistentes: [
      {
        id: 'C9',
        descripcion: 'Revisión de conceptos por otro abogado',
        efectividad: 65
      },
      {
        id: 'C10',
        descripcion: 'Suscripción a actualizaciones normativas',
        efectividad: 60
      },
      {
        id: 'C11',
        descripcion: 'Capacitaciones semestrales',
        efectividad: 55
      }
    ],
    planTratamiento: [
      {
        accion: 'Adquirir base de datos jurisprudencial especializada',
        responsable: 'Jefe OJ',
        fechaLimite: new Date('2026-01-31'),
        estado: 'COMPLETADA',
        avance: 100
      }
    ],
    responsable: 'Coordinador Asesoría Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-04-20'),
    fechaActualizacion: new Date('2025-12-15'),
    estado: 'ACTIVO'
  },
  {
    id: 'R-2025-005',
    codigo: 'R-005',
    etapa: 'IDENTIFICADO',
    proceso: 'Planes de Mejoramiento',
    tipo: 'GESTION',
    nombre: 'Incumplimiento de planes de mejoramiento CGR',
    descripcion: 'Riesgo de no cerrar oportunamente acciones de planes de mejoramiento',
    causas: [
      'Falta de seguimiento periódico',
      'Dependencias responsables no reportan avances',
      'Falta de compromiso de los responsables'
    ],
    consecuencias: [
      'Nuevos hallazgos de CGR',
      'Afectación de calificaciones MIPG',
      'Sanciones administrativas',
      'Desgaste institucional'
    ],
    probabilidadInherente: 3,
    impactoInherente: 3,
    zonaInherente: 'MODERADO',
    probabilidadResidual: 2,
    impactoResidual: 2,
    zonaResidual: 'BAJO',
    controlesExistentes: [
      {
        id: 'C12',
        descripcion: 'Comité mensual de seguimiento',
        efectividad: 50
      }
    ],
    planTratamiento: [
      {
        accion: 'Implementar módulo SIGL de seguimiento automático',
        responsable: 'OTIC',
        fechaLimite: new Date('2026-05-31'),
        estado: 'PENDIENTE',
        avance: 0
      }
    ],
    responsable: 'Jefe Oficina Jurídica',
    documentos: [],
    timeline: [],
    fechaCreacion: new Date('2025-05-10'),
    fechaActualizacion: new Date('2025-12-10'),
    estado: 'ACTIVO'
  }
];
