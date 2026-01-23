/**
 * DATOS RIESGOS
 * Datos de ejemplo para demostración de Gestión de Riesgos Jurídicos
 */

export const riesgos: any[] = [
  {
    id: 'RIESGO-001',
    consecutivo: 'RJ-2024-001',
    tipo: 'judicial',
    descripcion: 'Riesgo de condena en proceso laboral por reintegro',
    probabilidad: 'media',
    impacto: 'alto',
    nivelRiesgo: 'alto',
    valorEstimado: 85000000,
    expedienteRelacionado: 'EXP-JUD-001',
    estado: 'activo',
    responsable: 'Dra. María Fernanda Rodríguez',
    fechaIdentificacion: '2024-01-15',
    controlesImplementados: [
      'Revisión permanente de jurisprudencia',
      'Preparación exhaustiva de audiencias',
      'Constitución de provisión contable'
    ],
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'RIESGO-002',
    consecutivo: 'RJ-2024-002',
    tipo: 'contractual',
    descripcion: 'Riesgo de pago por incumplimiento contractual obra de infraestructura',
    probabilidad: 'baja',
    impacto: 'alto',
    nivelRiesgo: 'medio',
    valorEstimado: 250000000,
    expedienteRelacionado: 'EXP-JUD-002',
    estado: 'activo',
    responsable: 'Dr. Carlos Eduardo Martínez',
    fechaIdentificacion: '2023-08-22',
    controlesImplementados: [
      'Seguimiento permanente al proceso judicial',
      'Revisión de cláusulas contractuales',
      'Análisis de viabilidad de conciliación'
    ],
    sede: 'Territorial Antioquia'
  },
  {
    id: 'RIESGO-003',
    consecutivo: 'RJ-2024-003',
    tipo: 'administrativo',
    descripcion: 'Riesgo de sanción por órgano de control por presuntas irregularidades contratación',
    probabilidad: 'baja',
    impacto: 'medio',
    nivelRiesgo: 'bajo',
    valorEstimado: 15000000,
    estado: 'en-evaluacion',
    responsable: 'Dr. Jorge Andrés López',
    fechaIdentificacion: '2024-01-20',
    controlesImplementados: [
      'Revisión de procesos contractuales',
      'Fortalecimiento de controles internos',
      'Capacitación a funcionarios'
    ],
    sede: 'Territorial Valle del Cauca'
  },
  {
    id: 'RIESGO-004',
    consecutivo: 'RJ-2023-015',
    tipo: 'disciplinario',
    descripcion: 'Riesgo de destitución de funcionario por proceso disciplinario',
    probabilidad: 'media',
    impacto: 'medio',
    nivelRiesgo: 'medio',
    valorEstimado: 0,
    estado: 'mitigado',
    responsable: 'Dra. María Fernanda Rodríguez',
    fechaIdentificacion: '2023-12-10',
    fechaMitigacion: '2024-01-10',
    controlesImplementados: [
      'Debido proceso garantizado',
      'Derecho de defensa respetado',
      'Documentación completa del expediente'
    ],
    sede: 'Sede Central Bogotá'
  }
];
