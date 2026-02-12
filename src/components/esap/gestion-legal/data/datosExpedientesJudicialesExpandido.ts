/**
 * DATOS MOCK EXPANDIDOS - MÓDULO DEFENSA JUDICIAL
 * Base de datos completa para pruebas con cliente
 * Incluye casos variados con todas las etapas del proceso judicial
 */

import type { ExpedienteJudicial } from '../core/types';

export const expedientesJudicialesMock: ExpedienteJudicial[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: NOTIFICADA (Demandas recién notificadas - Requiere contestación urgente)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2025-001',
    radicado: '25000-23-33-001-2025-00045-00',
    demandante: 'María Rodríguez López',
    tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
    estado: 'ACTIVO',
    etapa: 'NOTIFICADA',
    prioridad: 'ALTA',
    fechaNotificacion: '2025-01-20',
    fechaVencimiento: '2025-02-20',
    juzgado: 'Juzgado 12 Administrativo de Bogotá',
    abogadoResponsable: 'Dra. Ana María López',
    cuantia: '85000000',
    pretensiones: 'Nulidad del acto administrativo por el cual se declaró insubsistencia del cargo y restablecimiento del derecho con reintegro y pago de salarios dejados de percibir.',
    demandantes: [
      {
        id: 'DEM-001',
        nombre: 'María Rodríguez López',
        tipoPersona: 'natural',
        identificacion: '52123456'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-001',
        nombre: 'ESAP - Escuela Superior de Administración Pública',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2025-002',
    radicado: '25000-33-10-001-2025-00123-00',
    demandante: 'Carlos Andrés Pérez',
    tipoAccion: 'ACCION DE TUTELA',
    estado: 'ACTIVO',
    etapa: 'NOTIFICADA',
    prioridad: 'URGENTE',
    fechaNotificacion: '2025-01-28',
    fechaVencimiento: '2025-02-02',
    juzgado: 'Juzgado 33 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Roberto Jiménez',
    cuantia: '0',
    pretensiones: 'Amparo del derecho fundamental a la educación por presunta vulneración en proceso de matrícula académica.',
    demandantes: [
      {
        id: 'DEM-002',
        nombre: 'Carlos Andrés Pérez',
        tipoPersona: 'natural',
        identificacion: '1012345678'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-002',
        nombre: 'ESAP - Escuela Superior de Administración Pública',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2025-003',
    radicado: '25000-05-23-001-2025-00067-00',
    demandante: 'Asociación de Estudiantes ESAP',
    tipoAccion: 'ACCION POPULAR',
    estado: 'ACTIVO',
    etapa: 'NOTIFICADA',
    prioridad: 'MEDIA',
    fechaNotificacion: '2025-01-25',
    fechaVencimiento: '2025-02-25',
    juzgado: 'Juzgado 5 Administrativo de Cundinamarca',
    abogadoResponsable: 'Dra. Claudia Torres',
    cuantia: '0',
    pretensiones: 'Protección de derechos colectivos relacionados con la moralidad administrativa en proceso de contratación.',
    demandantes: [
      {
        id: 'DEM-003',
        nombre: 'Asociación de Estudiantes ESAP',
        tipoPersona: 'juridica',
        identificacion: '900123456-7'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-003',
        nombre: 'ESAP - Escuela Superior de Administración Pública',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: CONTESTADA (Contestación presentada - Esperando trámite procesal)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2024-089',
    radicado: '25000-23-31-001-2024-00234-00',
    demandante: 'Jorge Luis Martínez',
    tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
    estado: 'ACTIVO',
    etapa: 'CONTESTADA',
    prioridad: 'MEDIA',
    fechaNotificacion: '2024-11-10',
    fechaVencimiento: '2024-12-10',
    juzgado: 'Juzgado 31 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Fernando Sánchez',
    cuantia: '120000000',
    pretensiones: 'Nulidad de la resolución por la cual se impuso sanción disciplinaria y restablecimiento del buen nombre.',
    demandantes: [
      {
        id: 'DEM-004',
        nombre: 'Jorge Luis Martínez',
        tipoPersona: 'natural',
        identificacion: '79456123'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-004',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2024-092',
    radicado: '11001-03-15-001-2024-00456-00',
    demandante: 'Sandra Patricia Gómez',
    tipoAccion: 'ACCION DE CUMPLIMIENTO',
    estado: 'ACTIVO',
    etapa: 'CONTESTADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2024-12-05',
    fechaVencimiento: '2025-01-05',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    abogadoResponsable: 'Dra. Laura Mendoza',
    cuantia: '0',
    pretensiones: 'Cumplimiento de normas sobre transparencia y acceso a la información pública.',
    demandantes: [
      {
        id: 'DEM-005',
        nombre: 'Sandra Patricia Gómez',
        tipoPersona: 'natural',
        identificacion: '52987654'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-005',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: EN PRUEBAS (Periodo probatorio en curso)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2024-067',
    radicado: '25000-23-24-001-2024-00789-00',
    demandante: 'Luis Alberto Ramírez',
    tipoAccion: 'NULIDAD SIMPLE',
    estado: 'ACTIVO',
    etapa: 'EN PRUEBAS',
    prioridad: 'MEDIA',
    fechaNotificacion: '2024-08-15',
    fechaVencimiento: '2024-09-15',
    juzgado: 'Juzgado 24 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Andrés Castro',
    cuantia: '0',
    pretensiones: 'Declaratoria de nulidad del acto administrativo que modificó el reglamento estudiantil.',
    demandantes: [
      {
        id: 'DEM-006',
        nombre: 'Luis Alberto Ramírez',
        tipoPersona: 'natural',
        identificacion: '1019876543'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-006',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2024-071',
    radicado: '25000-23-18-001-2024-00345-00',
    demandante: 'Patricia Elena Vargas',
    tipoAccion: 'REPARACION DIRECTA',
    estado: 'ACTIVO',
    etapa: 'EN PRUEBAS',
    prioridad: 'ALTA',
    fechaNotificacion: '2024-09-20',
    fechaVencimiento: '2024-10-20',
    juzgado: 'Juzgado 18 Administrativo de Bogotá',
    abogadoResponsable: 'Dra. Carolina Restrepo',
    cuantia: '250000000',
    pretensiones: 'Reparación de daños causados por demora injustificada en expedición de diploma de grado.',
    demandantes: [
      {
        id: 'DEM-007',
        nombre: 'Patricia Elena Vargas',
        tipoPersona: 'natural',
        identificacion: '52345678'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-007',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: ALEGATOS (Presentación de alegatos de conclusión)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2024-045',
    radicado: '25000-23-27-001-2024-00567-00',
    demandante: 'Diego Fernando Herrera',
    tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
    estado: 'ACTIVO',
    etapa: 'ALEGATOS',
    prioridad: 'ALTA',
    fechaNotificacion: '2024-05-10',
    fechaVencimiento: '2024-06-10',
    juzgado: 'Juzgado 27 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Miguel Ángel Ruiz',
    cuantia: '95000000',
    pretensiones: 'Nulidad de resolución de terminación de contrato laboral y reintegro.',
    demandantes: [
      {
        id: 'DEM-008',
        nombre: 'Diego Fernando Herrera',
        tipoPersona: 'natural',
        identificacion: '79234567'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-008',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2024-051',
    radicado: '11001-03-27-001-2024-00890-00',
    demandante: 'Consorcio Infraestructura SAS',
    tipoAccion: 'CONTROVERSIAS CONTRACTUALES',
    estado: 'ACTIVO',
    etapa: 'ALEGATOS',
    prioridad: 'URGENTE',
    fechaNotificacion: '2024-06-15',
    fechaVencimiento: '2024-07-15',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    abogadoResponsable: 'Dr. Pablo Guerrero',
    cuantia: '850000000',
    pretensiones: 'Declaratoria de incumplimiento contractual y reconocimiento de perjuicios.',
    demandantes: [
      {
        id: 'DEM-009',
        nombre: 'Consorcio Infraestructura SAS',
        tipoPersona: 'juridica',
        identificacion: '900456789-1'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-009',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: SENTENCIA I INSTANCIA (Sentencia de primera instancia emitida)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2024-028',
    radicado: '25000-23-15-001-2024-00234-00',
    demandante: 'Gloria Inés Martínez',
    tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
    estado: 'ACTIVO',
    etapa: 'SENTENCIA I INSTANCIA',
    prioridad: 'ALTA',
    fechaNotificacion: '2024-03-01',
    fechaVencimiento: '2024-04-01',
    juzgado: 'Juzgado 15 Administrativo de Bogotá',
    abogadoResponsable: 'Dra. Mariana Ospina',
    cuantia: '75000000',
    pretensiones: 'Nulidad de acto administrativo sancionatorio y restablecimiento de derechos.',
    demandantes: [
      {
        id: 'DEM-010',
        nombre: 'Gloria Inés Martínez',
        tipoPersona: 'natural',
        identificacion: '52678901'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-010',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2023-156',
    radicado: '25000-23-09-001-2023-01234-00',
    demandante: 'Ricardo Alonso Pérez',
    tipoAccion: 'REPARACION DIRECTA',
    estado: 'ACTIVO',
    etapa: 'SENTENCIA I INSTANCIA',
    prioridad: 'MEDIA',
    fechaNotificacion: '2023-11-10',
    fechaVencimiento: '2023-12-10',
    juzgado: 'Juzgado 9 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Gustavo Moreno',
    cuantia: '180000000',
    pretensiones: 'Indemnización de perjuicios por falla en el servicio educativo.',
    demandantes: [
      {
        id: 'DEM-011',
        nombre: 'Ricardo Alonso Pérez',
        tipoPersona: 'natural',
        identificacion: '79890123'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-011',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: SEGUNDA INSTANCIA (En apelación ante tribunal)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2023-134',
    radicado: '11001-03-15-001-2023-00987-00',
    demandante: 'Mónica Andrea Salazar',
    tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
    estado: 'ACTIVO',
    etapa: 'SEGUNDA INSTANCIA',
    prioridad: 'ALTA',
    fechaNotificacion: '2023-09-05',
    fechaVencimiento: '2023-10-05',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    abogadoResponsable: 'Dr. Hernán Díaz',
    cuantia: '110000000',
    pretensiones: 'Nulidad de evaluación de desempeño y reintegro laboral.',
    demandantes: [
      {
        id: 'DEM-012',
        nombre: 'Mónica Andrea Salazar',
        tipoPersona: 'natural',
        identificacion: '52456789'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-012',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2023-145',
    radicado: '11001-03-24-001-2023-01456-00',
    demandante: 'Empresa Tecnología y Servicios SAS',
    tipoAccion: 'CONTROVERSIAS CONTRACTUALES',
    estado: 'ACTIVO',
    etapa: 'SEGUNDA INSTANCIA',
    prioridad: 'URGENTE',
    fechaNotificacion: '2023-10-20',
    fechaVencimiento: '2023-11-20',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    abogadoResponsable: 'Dra. Isabel Ramírez',
    cuantia: '450000000',
    pretensiones: 'Reconocimiento económico por trabajos adicionales no contemplados en contrato.',
    demandantes: [
      {
        id: 'DEM-013',
        nombre: 'Empresa Tecnología y Servicios SAS',
        tipoPersona: 'juridica',
        identificacion: '900567890-2'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-013',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: EJECUTORIADA (Sentencia en firme - Proceso finalizado)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2023-089',
    radicado: '25000-23-11-001-2023-00456-00',
    demandante: 'Alberto José Ramírez',
    tipoAccion: 'ACCION DE TUTELA',
    estado: 'FINALIZADO',
    etapa: 'EJECUTORIADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2023-07-10',
    fechaVencimiento: '2023-07-20',
    juzgado: 'Juzgado 11 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Carlos Mendoza',
    cuantia: '0',
    pretensiones: 'Amparo del derecho de petición.',
    demandantes: [
      {
        id: 'DEM-014',
        nombre: 'Alberto José Ramírez',
        tipoPersona: 'natural',
        identificacion: '1015678901'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-014',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2023-067',
    radicado: '25000-23-08-001-2023-00234-00',
    demandante: 'Claudia Fernanda Torres',
    tipoAccion: 'NULIDAD SIMPLE',
    estado: 'FINALIZADO',
    etapa: 'EJECUTORIADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2023-05-15',
    fechaVencimiento: '2023-06-15',
    juzgado: 'Juzgado 8 Administrativo de Bogotá',
    abogadoResponsable: 'Dra. Beatriz Gómez',
    cuantia: '0',
    pretensiones: 'Nulidad de resolución administrativa por vicios de forma.',
    demandantes: [
      {
        id: 'DEM-015',
        nombre: 'Claudia Fernanda Torres',
        tipoPersona: 'natural',
        identificacion: '52234567'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-015',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2022-234',
    radicado: '25000-23-19-001-2022-01789-00',
    demandante: 'Fundación Transparencia Colombia',
    tipoAccion: 'ACCION POPULAR',
    estado: 'FINALIZADO',
    etapa: 'EJECUTORIADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2022-10-01',
    fechaVencimiento: '2022-11-01',
    juzgado: 'Juzgado 19 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Javier Ruiz',
    cuantia: '0',
    pretensiones: 'Protección de derechos colectivos sobre acceso a la información.',
    demandantes: [
      {
        id: 'DEM-016',
        nombre: 'Fundación Transparencia Colombia',
        tipoPersona: 'juridica',
        identificacion: '900345678-9'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-016',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA: ARCHIVADA (Procesos archivados - Desistimientos, transacciones, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'DJ-2024-012',
    radicado: '25000-23-22-001-2024-00123-00',
    demandante: 'Andrés Felipe García',
    tipoAccion: 'ACCION DE TUTELA',
    estado: 'ARCHIVADO',
    etapa: 'ARCHIVADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2024-01-15',
    fechaVencimiento: '2024-01-25',
    juzgado: 'Juzgado 22 Administrativo de Bogotá',
    abogadoResponsable: 'Dra. Sandra Rojas',
    cuantia: '0',
    pretensiones: 'Tutela por presunta vulneración de derechos (DESISTIDA).',
    demandantes: [
      {
        id: 'DEM-017',
        nombre: 'Andrés Felipe García',
        tipoPersona: 'natural',
        identificacion: '1016789012'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-017',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  },
  {
    id: 'DJ-2023-178',
    radicado: '25000-23-14-001-2023-00678-00',
    demandante: 'Servicios Integrales Ltda',
    tipoAccion: 'CONTROVERSIAS CONTRACTUALES',
    estado: 'ARCHIVADO',
    etapa: 'ARCHIVADA',
    prioridad: 'BAJA',
    fechaNotificacion: '2023-12-01',
    fechaVencimiento: '2024-01-01',
    juzgado: 'Juzgado 14 Administrativo de Bogotá',
    abogadoResponsable: 'Dr. Eduardo Vargas',
    cuantia: '320000000',
    pretensiones: 'Reclamación contractual (CONCILIACIÓN EXITOSA).',
    demandantes: [
      {
        id: 'DEM-018',
        nombre: 'Servicios Integrales Ltda',
        tipoPersona: 'juridica',
        identificacion: '900234567-3'
      }
    ],
    demandados: [
      {
        id: 'DEMAN-018',
        nombre: 'ESAP',
        tipoPersona: 'juridica',
        identificacion: '899999061-4'
      }
    ]
  }
];
