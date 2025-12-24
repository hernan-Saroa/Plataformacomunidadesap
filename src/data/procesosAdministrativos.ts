/**
 * PROCESOS ADMINISTRATIVOS ESAP
 * Control Interno Disciplinario, Control Interno de Gestión, Gestión Legal
 * Fecha: Diciembre 23, 2024
 */

// ============================================================================
// TIPOS Y ENUMS
// ============================================================================

export type TipoProceso = 'disciplinario' | 'gestion' | 'legal';
export type EstadoProceso = 'iniciado' | 'en_investigacion' | 'en_tramite' | 'resuelto' | 'archivado' | 'apelacion';
export type PrioridadProceso = 'baja' | 'media' | 'alta' | 'urgente';
export type TipoFalta = 'leve' | 'grave' | 'gravisima';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcesoBase {
  id: string;
  codigo: string;
  tipo: TipoProceso;
  titulo: string;
  descripcion: string;
  estado: EstadoProceso;
  prioridad: PrioridadProceso;
  fechaInicio: string;
  fechaEstimadaCierre: string;
  fechaCierre?: string;
  responsable: {
    nombre: string;
    cargo: string;
    email: string;
  };
  involucrados: PersonaInvolucrada[];
  documentos: Documento[];
  actividades: ActividadProceso[];
  observaciones: string;
  diasTranscurridos: number;
  diasRestantes: number;
}

export interface PersonaInvolucrada {
  id: string;
  nombre: string;
  documento: string;
  cargo: string;
  dependencia: string;
  rol: 'investigado' | 'quejoso' | 'testigo' | 'abogado' | 'otro';
  email: string;
}

export interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  fechaCarga: string;
  cargadoPor: string;
  url: string;
  tamaño: string;
}

export interface ActividadProceso {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  responsable: string;
  estado: 'completada' | 'pendiente' | 'en_progreso';
}

// ============================================================================
// CONTROL INTERNO DISCIPLINARIO
// ============================================================================

export interface ProcesoDisciplinario extends ProcesoBase {
  tipo: 'disciplinario';
  numeroQueja: string;
  tipoFalta: TipoFalta;
  hechos: string;
  normasPresuntamenteVioladas: string[];
  etapaActual: 'indagacion_preliminar' | 'investigacion' | 'juzgamiento' | 'segunda_instancia' | 'cerrado';
  sancionAplicada?: {
    tipo: 'amonestacion' | 'suspension' | 'destitucion' | 'multa' | 'ninguna';
    descripcion: string;
    fechaAplicacion?: string;
  };
  plazoLegal: number; // días
}

// ============================================================================
// CONTROL INTERNO DE GESTIÓN
// ============================================================================

export interface ProcesoGestion extends ProcesoBase {
  tipo: 'gestion';
  areaAfectada: string;
  tipoControl: 'preventivo' | 'detectivo' | 'correctivo';
  hallazgos: Hallazgo[];
  planMejoramiento?: PlanMejoramiento;
  nivelRiesgo: 'bajo' | 'moderado' | 'alto' | 'critico';
  auditoriaAsociada?: string;
}

export interface Hallazgo {
  id: string;
  descripcion: string;
  impacto: string;
  causa: string;
  recomendacion: string;
  responsable: string;
  fechaLimiteImplementacion: string;
  estado: 'identificado' | 'en_implementacion' | 'implementado' | 'verificado';
}

export interface PlanMejoramiento {
  id: string;
  acciones: AccionMejoramiento[];
  porcentajeAvance: number;
  fechaInicio: string;
  fechaFinEstimada: string;
}

export interface AccionMejoramiento {
  id: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  evidencias: string[];
}

// ============================================================================
// GESTIÓN LEGAL
// ============================================================================

export interface ProcesoLegal extends ProcesoBase {
  tipo: 'legal';
  tipoProcesoLegal: 'civil' | 'laboral' | 'contencioso_administrativo' | 'penal' | 'constitucional' | 'otro';
  juzgado: string;
  radicado: string;
  despacho: string;
  pretensiones: string;
  cuantia?: number;
  abogadoExterno?: {
    nombre: string;
    firma: string;
    contacto: string;
  };
  estadoProcesal: string;
  proximaAudiencia?: {
    fecha: string;
    tipo: string;
    lugar: string;
  };
  sentencia?: {
    fecha: string;
    sentido: 'favorable' | 'desfavorable' | 'parcialmente_favorable';
    resumen: string;
    apelada: boolean;
  };
}

// ============================================================================
// DATOS MOCK - PROCESOS DISCIPLINARIOS
// ============================================================================

export const procesosDisciplinarios: ProcesoDisciplinario[] = [
  {
    id: 'DISC-2024-001',
    codigo: 'DISC-2024-001',
    tipo: 'disciplinario',
    numeroQueja: 'Q-2024-125',
    titulo: 'Presunto incumplimiento de horario laboral',
    descripcion: 'Se investiga presunto incumplimiento reiterado de horario laboral por parte de funcionario de la Dirección Territorial de Antioquia.',
    tipoFalta: 'leve',
    estado: 'en_investigacion',
    prioridad: 'media',
    etapaActual: 'investigacion',
    fechaInicio: '2024-09-15',
    fechaEstimadaCierre: '2025-03-15',
    diasTranscurridos: 99,
    diasRestantes: 81,
    plazoLegal: 180,
    responsable: {
      nombre: 'Dra. Carolina Méndez',
      cargo: 'Jefe Oficina Control Interno Disciplinario',
      email: 'carolina.mendez@esap.edu.co'
    },
    involucrados: [
      {
        id: 'INV-001',
        nombre: 'Pedro Alonso Ramírez',
        documento: '70123456',
        cargo: 'Profesional Especializado',
        dependencia: 'Dirección Territorial Antioquia',
        rol: 'investigado',
        email: 'pedro.ramirez@esap.edu.co'
      },
      {
        id: 'INV-002',
        nombre: 'Luis Fernando Gómez',
        documento: '71234567',
        cargo: 'Director Territorial',
        dependencia: 'Dirección Territorial Antioquia',
        rol: 'quejoso',
        email: 'luis.gomez@esap.edu.co'
      }
    ],
    hechos: 'El funcionario Pedro Alonso Ramírez ha presentado reiteradas llegadas tardías a su lugar de trabajo durante los meses de julio y agosto de 2024, según consta en los registros biométricos.',
    normasPresuntamenteVioladas: [
      'Ley 734 de 2002 - Art. 34 Numeral 1 (Deberes)',
      'Decreto 1083 de 2015 - Cumplimiento de la jornada laboral'
    ],
    documentos: [
      {
        id: 'DOC-001',
        nombre: 'Queja formal DIR-ANT-2024-125.pdf',
        tipo: 'Queja',
        fechaCarga: '2024-09-15',
        cargadoPor: 'Carolina Méndez',
        url: '#',
        tamaño: '2.3 MB'
      },
      {
        id: 'DOC-002',
        nombre: 'Reporte biométrico Jul-Ago 2024.xlsx',
        tipo: 'Prueba',
        fechaCarga: '2024-09-20',
        cargadoPor: 'Carolina Méndez',
        url: '#',
        tamaño: '145 KB'
      },
      {
        id: 'DOC-003',
        nombre: 'Descargos funcionario.pdf',
        tipo: 'Descargos',
        fechaCarga: '2024-10-05',
        cargadoPor: 'Pedro Ramírez',
        url: '#',
        tamaño: '890 KB'
      }
    ],
    actividades: [
      {
        id: 'ACT-001',
        fecha: '2024-09-15',
        tipo: 'Recepción de queja',
        descripcion: 'Recepción formal de la queja Q-2024-125',
        responsable: 'Carolina Méndez',
        estado: 'completada'
      },
      {
        id: 'ACT-002',
        fecha: '2024-09-18',
        tipo: 'Auto de apertura',
        descripcion: 'Emisión de auto de apertura de investigación disciplinaria',
        responsable: 'Carolina Méndez',
        estado: 'completada'
      },
      {
        id: 'ACT-003',
        fecha: '2024-10-01',
        tipo: 'Notificación',
        descripcion: 'Notificación al investigado y traslado para descargos',
        responsable: 'Carolina Méndez',
        estado: 'completada'
      },
      {
        id: 'ACT-004',
        fecha: '2024-10-20',
        tipo: 'Práctica de pruebas',
        descripcion: 'Práctica de pruebas testimoniales',
        responsable: 'Carolina Méndez',
        estado: 'en_progreso'
      },
      {
        id: 'ACT-005',
        fecha: '2025-01-15',
        tipo: 'Calificación',
        descripcion: 'Evaluación de pruebas y calificación de la conducta',
        responsable: 'Carolina Méndez',
        estado: 'pendiente'
      }
    ],
    observaciones: 'El investigado presentó descargos argumentando problemas de movilidad por obras en la ciudad. Se están verificando testimonios.',
    sancionAplicada: undefined
  },
  {
    id: 'DISC-2024-002',
    codigo: 'DISC-2024-002',
    tipo: 'disciplinario',
    numeroQueja: 'Q-2024-089',
    titulo: 'Presunto uso indebido de recursos institucionales',
    descripcion: 'Investigación por presunto uso de vehículo institucional para fines personales.',
    tipoFalta: 'grave',
    estado: 'resuelto',
    prioridad: 'alta',
    etapaActual: 'cerrado',
    fechaInicio: '2024-06-10',
    fechaEstimadaCierre: '2024-12-10',
    fechaCierre: '2024-12-15',
    diasTranscurridos: 188,
    diasRestantes: 0,
    plazoLegal: 180,
    responsable: {
      nombre: 'Dr. Roberto Silva',
      cargo: 'Profesional Control Disciplinario',
      email: 'roberto.silva@esap.edu.co'
    },
    involucrados: [
      {
        id: 'INV-003',
        nombre: 'María Fernanda López',
        documento: '52345678',
        cargo: 'Coordinadora Administrativa',
        dependencia: 'Dirección Territorial Valle',
        rol: 'investigado',
        email: 'maria.lopez@esap.edu.co'
      }
    ],
    hechos: 'Se evidenció mediante GPS del vehículo institucional placa ABC-123 que fue utilizado en horarios no laborales y en zonas no relacionadas con actividades de ESAP.',
    normasPresuntamenteVioladas: [
      'Ley 734 de 2002 - Art. 48 Numeral 1 (Prohibiciones)',
      'Manual de contratación ESAP - Uso de bienes institucionales'
    ],
    documentos: [
      {
        id: 'DOC-004',
        nombre: 'Reporte GPS vehicular.pdf',
        tipo: 'Prueba',
        fechaCarga: '2024-06-12',
        cargadoPor: 'Roberto Silva',
        url: '#',
        tamaño: '3.1 MB'
      },
      {
        id: 'DOC-005',
        nombre: 'Auto de cargos.pdf',
        tipo: 'Auto',
        fechaCarga: '2024-07-20',
        cargadoPor: 'Roberto Silva',
        url: '#',
        tamaño: '1.2 MB'
      },
      {
        id: 'DOC-006',
        nombre: 'Fallo primera instancia.pdf',
        tipo: 'Fallo',
        fechaCarga: '2024-12-15',
        cargadoPor: 'Roberto Silva',
        url: '#',
        tamaño: '2.8 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-006',
        fecha: '2024-06-10',
        tipo: 'Apertura',
        descripcion: 'Apertura de investigación disciplinaria',
        responsable: 'Roberto Silva',
        estado: 'completada'
      },
      {
        id: 'ACT-007',
        fecha: '2024-07-20',
        tipo: 'Formulación de cargos',
        descripcion: 'Formulación de cargos por falta grave',
        responsable: 'Roberto Silva',
        estado: 'completada'
      },
      {
        id: 'ACT-008',
        fecha: '2024-09-30',
        tipo: 'Audiencia',
        descripcion: 'Audiencia de descargos y práctica de pruebas',
        responsable: 'Roberto Silva',
        estado: 'completada'
      },
      {
        id: 'ACT-009',
        fecha: '2024-12-15',
        tipo: 'Fallo',
        descripcion: 'Emisión de fallo de primera instancia',
        responsable: 'Roberto Silva',
        estado: 'completada'
      }
    ],
    observaciones: 'Proceso cerrado. Sanción aplicada: suspensión de 30 días sin goce de sueldo.',
    sancionAplicada: {
      tipo: 'suspension',
      descripcion: 'Suspensión de 30 días sin goce de sueldo por uso indebido de recursos institucionales',
      fechaAplicacion: '2024-12-20'
    }
  },
  {
    id: 'DISC-2024-003',
    codigo: 'DISC-2024-003',
    tipo: 'disciplinario',
    numeroQueja: 'Q-2024-156',
    titulo: 'Presunto acoso laboral',
    descripcion: 'Denuncia de presunto acoso laboral por parte de un directivo hacia subordinados.',
    tipoFalta: 'gravisima',
    estado: 'iniciado',
    prioridad: 'urgente',
    etapaActual: 'indagacion_preliminar',
    fechaInicio: '2024-11-20',
    fechaEstimadaCierre: '2025-05-20',
    diasTranscurridos: 33,
    diasRestantes: 147,
    plazoLegal: 180,
    responsable: {
      nombre: 'Dra. Ana María Rodríguez',
      cargo: 'Directora Control Interno Disciplinario',
      email: 'ana.rodriguez@esap.edu.co'
    },
    involucrados: [
      {
        id: 'INV-004',
        nombre: 'Carlos Andrés Pérez',
        documento: '79456123',
        cargo: 'Director Territorial',
        dependencia: 'Dirección Territorial Cundinamarca',
        rol: 'investigado',
        email: 'carlos.perez@esap.edu.co'
      },
      {
        id: 'INV-005',
        nombre: 'Laura Marcela González',
        documento: '52789456',
        cargo: 'Profesional Universitario',
        dependencia: 'Dirección Territorial Cundinamarca',
        rol: 'quejoso',
        email: 'laura.gonzalez@esap.edu.co'
      },
      {
        id: 'INV-006',
        nombre: 'Jorge Luis Martínez',
        documento: '80123789',
        cargo: 'Técnico Administrativo',
        dependencia: 'Dirección Territorial Cundinamarca',
        rol: 'testigo',
        email: 'jorge.martinez@esap.edu.co'
      }
    ],
    hechos: 'Se denuncia presunto trato denigrante, asignación excesiva de trabajo y amenazas verbales por parte del Director Territorial hacia varios funcionarios de la dependencia.',
    normasPresuntamenteVioladas: [
      'Ley 1010 de 2006 - Acoso Laboral',
      'Ley 734 de 2002 - Art. 48 Numeral 21',
      'Código de Integridad del Servicio Público'
    ],
    documentos: [
      {
        id: 'DOC-007',
        nombre: 'Denuncia inicial.pdf',
        tipo: 'Denuncia',
        fechaCarga: '2024-11-20',
        cargadoPor: 'Ana María Rodríguez',
        url: '#',
        tamaño: '1.5 MB'
      },
      {
        id: 'DOC-008',
        nombre: 'Correos electrónicos evidencia.pdf',
        tipo: 'Prueba',
        fechaCarga: '2024-11-25',
        cargadoPor: 'Laura González',
        url: '#',
        tamaño: '4.2 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-010',
        fecha: '2024-11-20',
        tipo: 'Recepción',
        descripcion: 'Recepción de denuncia formal de acoso laboral',
        responsable: 'Ana María Rodríguez',
        estado: 'completada'
      },
      {
        id: 'ACT-011',
        fecha: '2024-11-22',
        tipo: 'Indagación preliminar',
        descripcion: 'Inicio de indagación preliminar',
        responsable: 'Ana María Rodríguez',
        estado: 'en_progreso'
      },
      {
        id: 'ACT-012',
        fecha: '2024-12-15',
        tipo: 'Entrevistas',
        descripcion: 'Realización de entrevistas a testigos',
        responsable: 'Ana María Rodríguez',
        estado: 'pendiente'
      }
    ],
    observaciones: 'Caso en etapa inicial. Se está evaluando la procedencia de medidas cautelares.',
    sancionAplicada: undefined
  }
];

// ============================================================================
// DATOS MOCK - PROCESOS DE GESTIÓN
// ============================================================================

export const procesosGestion: ProcesoGestion[] = [
  {
    id: 'GEST-2024-001',
    codigo: 'GEST-2024-001',
    tipo: 'gestion',
    titulo: 'Auditoría Proceso de Contratación',
    descripcion: 'Auditoría de control interno al proceso de contratación de la Sede Nacional.',
    estado: 'en_tramite',
    prioridad: 'alta',
    areaAfectada: 'Subdirección Administrativa y Financiera',
    tipoControl: 'detectivo',
    nivelRiesgo: 'alto',
    fechaInicio: '2024-10-01',
    fechaEstimadaCierre: '2025-01-31',
    diasTranscurridos: 83,
    diasRestantes: 39,
    auditoriaAsociada: 'AUD-2024-005',
    responsable: {
      nombre: 'Ing. Patricia Herrera',
      cargo: 'Jefe Oficina Control Interno',
      email: 'patricia.herrera@esap.edu.co'
    },
    involucrados: [
      {
        id: 'INV-007',
        nombre: 'Ricardo Sánchez',
        documento: '80345678',
        cargo: 'Subdirector Administrativo',
        dependencia: 'Subdirección Administrativa y Financiera',
        rol: 'otro',
        email: 'ricardo.sanchez@esap.edu.co'
      },
      {
        id: 'INV-008',
        nombre: 'Claudia Morales',
        documento: '52456789',
        cargo: 'Profesional Contratación',
        dependencia: 'Subdirección Administrativa y Financiera',
        rol: 'otro',
        email: 'claudia.morales@esap.edu.co'
      }
    ],
    hallazgos: [
      {
        id: 'HALL-001',
        descripcion: 'Falta de documentación completa en 15 procesos de contratación directa',
        impacto: 'Riesgo de observaciones por parte de entes de control externo',
        causa: 'Ausencia de procedimiento estandarizado de verificación documental',
        recomendacion: 'Implementar lista de chequeo obligatoria para todos los procesos',
        responsable: 'Ricardo Sánchez',
        fechaLimiteImplementacion: '2025-02-28',
        estado: 'en_implementacion'
      },
      {
        id: 'HALL-002',
        descripcion: 'Demoras en la publicación de actos administrativos en el SECOP',
        impacto: 'Incumplimiento de plazos legales de transparencia',
        causa: 'Sobrecarga de trabajo del área de contratación',
        recomendacion: 'Fortalecer el equipo de contratación con 2 profesionales adicionales',
        responsable: 'Ricardo Sánchez',
        fechaLimiteImplementacion: '2025-03-31',
        estado: 'identificado'
      },
      {
        id: 'HALL-003',
        descripcion: 'Estudios previos sin suficiente análisis del sector',
        impacto: 'Riesgo de sobreprecios o contratación inadecuada',
        causa: 'Falta de capacitación en elaboración de estudios previos',
        recomendacion: 'Programa de capacitación para funcionarios del área',
        responsable: 'Claudia Morales',
        fechaLimiteImplementacion: '2025-02-15',
        estado: 'implementado'
      }
    ],
    planMejoramiento: {
      id: 'PM-2024-001',
      porcentajeAvance: 40,
      fechaInicio: '2024-11-15',
      fechaFinEstimada: '2025-03-31',
      acciones: [
        {
          id: 'ACC-001',
          descripcion: 'Diseñar e implementar lista de chequeo documental',
          responsable: 'Claudia Morales',
          fechaInicio: '2024-11-15',
          fechaFin: '2024-12-31',
          estado: 'completada',
          evidencias: ['Lista_chequeo_v1.pdf', 'Acta_socializacion.pdf']
        },
        {
          id: 'ACC-002',
          descripcion: 'Solicitar ampliación de planta de personal',
          responsable: 'Ricardo Sánchez',
          fechaInicio: '2024-12-01',
          fechaFin: '2025-02-28',
          estado: 'en_progreso',
          evidencias: ['Solicitud_planta.pdf']
        },
        {
          id: 'ACC-003',
          descripcion: 'Realizar capacitación en estudios previos',
          responsable: 'Claudia Morales',
          fechaInicio: '2024-11-20',
          fechaFin: '2024-12-10',
          estado: 'completada',
          evidencias: ['Certificados_capacitacion.pdf', 'Material_formativo.pdf']
        }
      ]
    },
    documentos: [
      {
        id: 'DOC-009',
        nombre: 'Informe Auditoría Preliminar.pdf',
        tipo: 'Informe',
        fechaCarga: '2024-10-15',
        cargadoPor: 'Patricia Herrera',
        url: '#',
        tamaño: '5.2 MB'
      },
      {
        id: 'DOC-010',
        nombre: 'Matriz de Hallazgos.xlsx',
        tipo: 'Matriz',
        fechaCarga: '2024-10-20',
        cargadoPor: 'Patricia Herrera',
        url: '#',
        tamaño: '890 KB'
      },
      {
        id: 'DOC-011',
        nombre: 'Plan de Mejoramiento.pdf',
        tipo: 'Plan',
        fechaCarga: '2024-11-15',
        cargadoPor: 'Ricardo Sánchez',
        url: '#',
        tamaño: '2.1 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-013',
        fecha: '2024-10-01',
        tipo: 'Inicio',
        descripcion: 'Inicio de auditoría de control interno',
        responsable: 'Patricia Herrera',
        estado: 'completada'
      },
      {
        id: 'ACT-014',
        fecha: '2024-10-15',
        tipo: 'Análisis',
        descripcion: 'Análisis de expedientes de contratación',
        responsable: 'Patricia Herrera',
        estado: 'completada'
      },
      {
        id: 'ACT-015',
        fecha: '2024-11-15',
        tipo: 'Plan de mejoramiento',
        descripcion: 'Formulación y aprobación del plan de mejoramiento',
        responsable: 'Ricardo Sánchez',
        estado: 'completada'
      },
      {
        id: 'ACT-016',
        fecha: '2025-01-15',
        tipo: 'Seguimiento',
        descripcion: 'Primer seguimiento a la implementación',
        responsable: 'Patricia Herrera',
        estado: 'pendiente'
      }
    ],
    observaciones: 'El área ha mostrado compromiso con la implementación de las recomendaciones. Se evidencia avance en las acciones del plan de mejoramiento.'
  },
  {
    id: 'GEST-2024-002',
    codigo: 'GEST-2024-002',
    tipo: 'gestion',
    titulo: 'Seguimiento MECI Sistema de Control Interno',
    descripcion: 'Evaluación y seguimiento al Modelo Estándar de Control Interno - MECI.',
    estado: 'en_tramite',
    prioridad: 'media',
    areaAfectada: 'Todas las dependencias',
    tipoControl: 'preventivo',
    nivelRiesgo: 'moderado',
    fechaInicio: '2024-08-01',
    fechaEstimadaCierre: '2025-07-31',
    diasTranscurridos: 144,
    diasRestantes: 220,
    responsable: {
      nombre: 'Dra. Mónica Jiménez',
      cargo: 'Coordinadora MECI',
      email: 'monica.jimenez@esap.edu.co'
    },
    involucrados: [],
    hallazgos: [
      {
        id: 'HALL-004',
        descripcion: 'Mapas de riesgos desactualizados en 5 direcciones territoriales',
        impacto: 'Inadecuada gestión de riesgos institucionales',
        causa: 'Falta de cultura de actualización periódica',
        recomendacion: 'Establecer cronograma de actualización semestral obligatorio',
        responsable: 'Directores Territoriales',
        fechaLimiteImplementacion: '2025-03-31',
        estado: 'en_implementacion'
      },
      {
        id: 'HALL-005',
        descripcion: 'Bajo nivel de implementación de acciones de mejora',
        impacto: 'Riesgo de deterioro de la calidad institucional',
        causa: 'Falta de seguimiento y monitoreo efectivo',
        recomendacion: 'Implementar software de seguimiento a planes de mejoramiento',
        responsable: 'Oficina Control Interno',
        fechaLimiteImplementacion: '2025-06-30',
        estado: 'identificado'
      }
    ],
    planMejoramiento: undefined,
    documentos: [
      {
        id: 'DOC-012',
        nombre: 'Informe MECI 2024-I.pdf',
        tipo: 'Informe',
        fechaCarga: '2024-08-15',
        cargadoPor: 'Mónica Jiménez',
        url: '#',
        tamaño: '8.5 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-017',
        fecha: '2024-08-01',
        tipo: 'Diagnóstico',
        descripcion: 'Diagnóstico inicial del estado del MECI',
        responsable: 'Mónica Jiménez',
        estado: 'completada'
      },
      {
        id: 'ACT-018',
        fecha: '2025-02-01',
        tipo: 'Seguimiento',
        descripcion: 'Seguimiento semestral MECI',
        responsable: 'Mónica Jiménez',
        estado: 'pendiente'
      }
    ],
    observaciones: 'Se requiere mayor compromiso de los directivos territoriales en la actualización de sus mapas de riesgo.'
  }
];

// ============================================================================
// DATOS MOCK - PROCESOS LEGALES
// ============================================================================

export const procesosLegales: ProcesoLegal[] = [
  {
    id: 'LEG-2024-001',
    codigo: 'LEG-2024-001',
    tipo: 'legal',
    tipoProcesoLegal: 'laboral',
    titulo: 'Demanda laboral - Reconocimiento prestaciones sociales',
    descripcion: 'Demanda laboral interpuesta por ex-funcionario por presunto no pago de prestaciones sociales.',
    juzgado: 'Juzgado Laboral del Circuito de Bogotá',
    radicado: '110013105001202400123',
    despacho: 'Juzgado 15 Laboral del Circuito',
    pretensiones: 'Reconocimiento y pago de prima de servicios, cesantías y vacaciones no compensadas por valor de $45.000.000',
    cuantia: 45000000,
    estado: 'en_tramite',
    prioridad: 'media',
    estadoProcesal: 'Etapa probatoria',
    fechaInicio: '2024-03-15',
    fechaEstimadaCierre: '2025-03-15',
    diasTranscurridos: 282,
    diasRestantes: 83,
    responsable: {
      nombre: 'Dr. Andrés Felipe Vargas',
      cargo: 'Jefe Oficina Jurídica',
      email: 'andres.vargas@esap.edu.co'
    },
    abogadoExterno: {
      nombre: 'Dra. Sandra Liliana Castro',
      firma: 'Castro & Asociados Abogados',
      contacto: 'slcastro@castroabogados.com'
    },
    involucrados: [
      {
        id: 'INV-009',
        nombre: 'Hernando Pérez Gutiérrez',
        documento: '79123456',
        cargo: 'Ex-funcionario',
        dependencia: 'N/A',
        rol: 'otro',
        email: 'hernando.perez@gmail.com'
      }
    ],
    proximaAudiencia: {
      fecha: '2025-02-10',
      tipo: 'Audiencia de interrogatorio de parte',
      lugar: 'Palacio de Justicia - Sala 301'
    },
    documentos: [
      {
        id: 'DOC-013',
        nombre: 'Demanda.pdf',
        tipo: 'Demanda',
        fechaCarga: '2024-03-20',
        cargadoPor: 'Andrés Vargas',
        url: '#',
        tamaño: '3.2 MB'
      },
      {
        id: 'DOC-014',
        nombre: 'Contestacion_demanda.pdf',
        tipo: 'Contestación',
        fechaCarga: '2024-04-15',
        cargadoPor: 'Sandra Castro',
        url: '#',
        tamaño: '4.1 MB'
      },
      {
        id: 'DOC-015',
        nombre: 'Pruebas_ESAP.pdf',
        tipo: 'Pruebas',
        fechaCarga: '2024-06-01',
        cargadoPor: 'Sandra Castro',
        url: '#',
        tamaño: '12.5 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-019',
        fecha: '2024-03-15',
        tipo: 'Notificación',
        descripcion: 'Notificación de la demanda',
        responsable: 'Andrés Vargas',
        estado: 'completada'
      },
      {
        id: 'ACT-020',
        fecha: '2024-04-15',
        tipo: 'Contestación',
        descripcion: 'Presentación de contestación de la demanda',
        responsable: 'Sandra Castro',
        estado: 'completada'
      },
      {
        id: 'ACT-021',
        fecha: '2024-06-01',
        tipo: 'Pruebas',
        descripcion: 'Solicitud y decreto de pruebas',
        responsable: 'Sandra Castro',
        estado: 'completada'
      },
      {
        id: 'ACT-022',
        fecha: '2025-02-10',
        tipo: 'Audiencia',
        descripcion: 'Audiencia de interrogatorio de parte',
        responsable: 'Sandra Castro',
        estado: 'pendiente'
      }
    ],
    observaciones: 'La estrategia de defensa se centra en demostrar que las prestaciones fueron liquidadas y pagadas oportunamente según certificación de Talento Humano.',
    sentencia: undefined
  },
  {
    id: 'LEG-2024-002',
    codigo: 'LEG-2024-002',
    tipo: 'legal',
    tipoProcesoLegal: 'contencioso_administrativo',
    titulo: 'Acción de nulidad y restablecimiento del derecho - Concurso docente',
    descripcion: 'Acción de nulidad contra resolución que declaró desierta una convocatoria docente.',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    radicado: '250002325000202400456',
    despacho: 'Sección Primera - Subsección A',
    pretensiones: 'Nulidad de la Resolución 234 de 2024 y ordenar reposición del proceso de selección',
    estado: 'en_tramite',
    prioridad: 'alta',
    estadoProcesal: 'Admitida la demanda - Traslado para contestar',
    fechaInicio: '2024-07-20',
    fechaEstimadaCierre: '2026-07-20',
    diasTranscurridos: 156,
    diasRestantes: 574,
    responsable: {
      nombre: 'Dra. Juliana Ramírez',
      cargo: 'Asesora Jurídica',
      email: 'juliana.ramirez@esap.edu.co'
    },
    abogadoExterno: undefined,
    involucrados: [
      {
        id: 'INV-010',
        nombre: 'Dr. Felipe Márquez',
        documento: '80789456',
        cargo: 'Aspirante',
        dependencia: 'N/A',
        rol: 'otro',
        email: 'felipe.marquez@gmail.com'
      }
    ],
    proximaAudiencia: undefined,
    documentos: [
      {
        id: 'DOC-016',
        nombre: 'Accion_nulidad.pdf',
        tipo: 'Demanda',
        fechaCarga: '2024-07-25',
        cargadoPor: 'Juliana Ramírez',
        url: '#',
        tamaño: '2.8 MB'
      },
      {
        id: 'DOC-017',
        nombre: 'Auto_admisorio.pdf',
        tipo: 'Auto',
        fechaCarga: '2024-09-10',
        cargadoPor: 'Juliana Ramírez',
        url: '#',
        tamaño: '450 KB'
      }
    ],
    actividades: [
      {
        id: 'ACT-023',
        fecha: '2024-07-20',
        tipo: 'Notificación',
        descripcion: 'Notificación de la acción de nulidad',
        responsable: 'Juliana Ramírez',
        estado: 'completada'
      },
      {
        id: 'ACT-024',
        fecha: '2024-09-10',
        tipo: 'Admisión',
        descripcion: 'Auto admisorio de la demanda',
        responsable: 'Tribunal Administrativo',
        estado: 'completada'
      },
      {
        id: 'ACT-025',
        fecha: '2025-01-30',
        tipo: 'Contestación',
        descripcion: 'Vencimiento término para contestar demanda',
        responsable: 'Juliana Ramírez',
        estado: 'pendiente'
      }
    ],
    observaciones: 'Se está preparando la contestación de la demanda. El argumento principal es que el proceso se ajustó a la normativa vigente.',
    sentencia: undefined
  },
  {
    id: 'LEG-2023-015',
    codigo: 'LEG-2023-015',
    tipo: 'legal',
    tipoProcesoLegal: 'contencioso_administrativo',
    titulo: 'Acción de reparación directa - Accidente de tránsito',
    descripcion: 'Acción de reparación directa por accidente de tránsito en vehículo institucional.',
    juzgado: 'Tribunal Administrativo de Antioquia',
    radicado: '050012331000202300789',
    despacho: 'Sección Tercera',
    pretensiones: 'Indemnización por perjuicios materiales e inmateriales por $120.000.000',
    cuantia: 120000000,
    estado: 'resuelto',
    prioridad: 'alta',
    estadoProcesal: 'Sentencia ejecutoriada',
    fechaInicio: '2023-04-10',
    fechaEstimadaCierre: '2024-10-10',
    fechaCierre: '2024-11-05',
    diasTranscurridos: 574,
    diasRestantes: 0,
    responsable: {
      nombre: 'Dr. Miguel Ángel Torres',
      cargo: 'Coordinador Jurídico Territorial',
      email: 'miguel.torres@esap.edu.co'
    },
    abogadoExterno: {
      nombre: 'Dr. Carlos Ramírez',
      firma: 'Ramírez & Asociados',
      contacto: 'cramirez@ramirezabogados.com'
    },
    involucrados: [],
    proximaAudiencia: undefined,
    documentos: [
      {
        id: 'DOC-018',
        nombre: 'Sentencia_primera_instancia.pdf',
        tipo: 'Sentencia',
        fechaCarga: '2024-08-15',
        cargadoPor: 'Miguel Torres',
        url: '#',
        tamaño: '6.7 MB'
      },
      {
        id: 'DOC-019',
        nombre: 'Sentencia_segunda_instancia.pdf',
        tipo: 'Sentencia',
        fechaCarga: '2024-11-05',
        cargadoPor: 'Miguel Torres',
        url: '#',
        tamaño: '5.2 MB'
      }
    ],
    actividades: [
      {
        id: 'ACT-026',
        fecha: '2024-08-15',
        tipo: 'Sentencia',
        descripcion: 'Sentencia de primera instancia',
        responsable: 'Tribunal',
        estado: 'completada'
      },
      {
        id: 'ACT-027',
        fecha: '2024-09-01',
        tipo: 'Apelación',
        descripcion: 'Presentación de recurso de apelación',
        responsable: 'Carlos Ramírez',
        estado: 'completada'
      },
      {
        id: 'ACT-028',
        fecha: '2024-11-05',
        tipo: 'Sentencia',
        descripcion: 'Sentencia de segunda instancia',
        responsable: 'Consejo de Estado',
        estado: 'completada'
      }
    ],
    observaciones: 'Proceso finalizado. Sentencia parcialmente favorable. Se ordenó el pago de $35.000.000 por concepto de perjuicios materiales.',
    sentencia: {
      fecha: '2024-11-05',
      sentido: 'parcialmente_favorable',
      resumen: 'Se reconoció responsabilidad parcial de ESAP y se ordenó el pago de $35.000.000 por perjuicios materiales. Se negaron los perjuicios morales.',
      apelada: false
    }
  }
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene todos los procesos combinados
 */
export function obtenerTodosLosProcesos(): ProcesoBase[] {
  return [
    ...procesosDisciplinarios,
    ...procesosGestion,
    ...procesosLegales
  ];
}

/**
 * Obtiene procesos por tipo
 */
export function obtenerProcesosPorTipo(tipo: TipoProceso): ProcesoBase[] {
  switch (tipo) {
    case 'disciplinario':
      return procesosDisciplinarios;
    case 'gestion':
      return procesosGestion;
    case 'legal':
      return procesosLegales;
    default:
      return [];
  }
}

/**
 * Obtiene procesos por estado
 */
export function obtenerProcesosPorEstado(estado: EstadoProceso): ProcesoBase[] {
  return obtenerTodosLosProcesos().filter(p => p.estado === estado);
}

/**
 * Obtiene procesos urgentes
 */
export function obtenerProcesosUrgentes(): ProcesoBase[] {
  return obtenerTodosLosProcesos().filter(p => p.prioridad === 'urgente');
}

/**
 * Calcula estadísticas generales
 */
export function calcularEstadisticasProcesos() {
  const todos = obtenerTodosLosProcesos();
  
  return {
    total: todos.length,
    porTipo: {
      disciplinarios: procesosDisciplinarios.length,
      gestion: procesosGestion.length,
      legales: procesosLegales.length
    },
    porEstado: {
      iniciados: todos.filter(p => p.estado === 'iniciado').length,
      enInvestigacion: todos.filter(p => p.estado === 'en_investigacion').length,
      enTramite: todos.filter(p => p.estado === 'en_tramite').length,
      resueltos: todos.filter(p => p.estado === 'resuelto').length,
      archivados: todos.filter(p => p.estado === 'archivado').length
    },
    porPrioridad: {
      urgentes: todos.filter(p => p.prioridad === 'urgente').length,
      altas: todos.filter(p => p.prioridad === 'alta').length,
      medias: todos.filter(p => p.prioridad === 'media').length,
      bajas: todos.filter(p => p.prioridad === 'baja').length
    }
  };
}

/**
 * Obtiene procesos próximos a vencer (menos de 30 días)
 */
export function obtenerProcesosPorVencer(): ProcesoBase[] {
  return obtenerTodosLosProcesos().filter(p => 
    p.estado !== 'resuelto' && 
    p.estado !== 'archivado' && 
    p.diasRestantes > 0 && 
    p.diasRestantes <= 30
  );
}
