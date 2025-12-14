/**
 * MOCK DATA - HALLAZGOS Y CONTROVERSIAS
 * Datos de ejemplo para testing del proceso de controversia
 */

export interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  criterio: string;
  condicion: string;
  causa: string;
  efecto: string;
  clasificacion: 'Hallazgo' | 'Observación' | 'Oportunidad de Mejora';
  gravedad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  estado: 'Abierto' | 'En Controversia' | 'Cerrado' | 'Rechazado';
  responsable: string;
  fechaIdentificacion: string;
  procesoAuditado: string;
  auditor: string;
  auditoriaId: string;
  controversia?: Controversia;
}

export interface Controversia {
  id: string;
  hallazgoId: string;
  fechaInicio: string;
  estado: 'Pendiente' | 'En Revisión' | 'Aceptada' | 'Rechazada';
  
  argumentosAuditado: string;
  evidenciasDescargo: EvidenciaDescargo[];
  responsableDescargo: string;
  
  respuestaAuditor?: string;
  auditorRevisor?: string;
  fechaRespuesta?: string;
  
  decisionFinal?: 'Mantener Hallazgo' | 'Modificar Hallazgo' | 'Anular Hallazgo';
  justificacionDecision?: string;
  fechaDecision?: string;
  
  timeline: EventoControversia[];
}

export interface EvidenciaDescargo {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  fecha: string;
  descripcion?: string;
}

export interface EventoControversia {
  id: string;
  tipo: 'inicio' | 'argumentacion' | 'evidencia' | 'respuesta' | 'decision';
  descripcion: string;
  usuario: string;
  fecha: string;
}

export const MOCK_HALLAZGOS: Hallazgo[] = [
  // ========== HALLAZGO 1: ABIERTO (sin controversia) ==========
  {
    id: 'hall-001',
    codigo: 'H-2025-001',
    titulo: 'Falta de documentación en procesos de contratación',
    descripcion: 'Se identificaron contratos sin la documentación de soporte completa',
    criterio: 'Manual de Contratación ESAP, Artículo 12.3',
    condicion: 'Se revisaron 25 contratos del año 2024 y 8 de ellos (32%) no cuentan con la totalidad de los documentos requeridos en la carpeta contractual',
    causa: 'No existe un checklist de verificación documental antes del cierre de las carpetas. El personal rotó y no hubo empalme adecuado',
    efecto: 'Riesgo legal y dificultad para demostrar cumplimiento normativo en caso de requerimientos de entes de control',
    clasificacion: 'Hallazgo',
    gravedad: 'Alta',
    estado: 'Abierto',
    responsable: 'Catalina Rubio',
    fechaIdentificacion: '2024-11-15',
    procesoAuditado: 'Gestión Contractual',
    auditor: 'Fernando Ávila',
    auditoriaId: 'AUD-2025-002'
  },

  // ========== HALLAZGO 2: EN CONTROVERSIA ==========
  {
    id: 'hall-002',
    codigo: 'H-2025-002',
    titulo: 'Incumplimiento de plazos de respuesta a solicitudes ciudadanas',
    descripcion: 'Se observó que un 40% de las solicitudes ciudadanas excedieron el término legal de respuesta',
    criterio: 'Ley 1755 de 2015, Artículo 14 (15 días hábiles)',
    condicion: 'Durante el mes de octubre 2024 se registraron 120 solicitudes PQRS. De estas, 48 tuvieron respuesta después del día 15 hábil',
    causa: 'Sobrecarga de trabajo del personal de atención al ciudadano y ausencia de sistema de alertas automáticas',
    efecto: 'Posibles quejas ante la Defensoría del Pueblo y afectación a la imagen institucional',
    clasificacion: 'Hallazgo',
    gravedad: 'Media',
    estado: 'En Controversia',
    responsable: 'Sandra Montero',
    fechaIdentificacion: '2024-11-20',
    procesoAuditado: 'Atención al Ciudadano',
    auditor: 'Mario Oswaldo Bernal Rodriguez',
    auditoriaId: 'AUD-2025-001',
    controversia: {
      id: 'cont-002',
      hallazgoId: 'hall-002',
      fechaInicio: '2024-11-25',
      estado: 'Pendiente',
      
      argumentosAuditado: `Respetuosamente me permito presentar los siguientes argumentos de descargo:

1. CONTEXTO: Durante el mes de octubre 2024 se presentó una situación excepcional con la implementación del nuevo sistema de información SIGEF, lo cual generó un aumento atípico de consultas técnicas por parte de los usuarios.

2. ANÁLISIS DE LAS 48 SOLICITUDES:
   - 32 correspondían a consultas técnicas del nuevo sistema (no clasificables como PQRS según Circular 001-2024)
   - 12 fueron solicitudes de información que requirieron validación con otras dependencias
   - Solo 4 casos efectivamente excedieron el plazo sin justificación válida

3. EVIDENCIAS:
   - Circular 001-2024 que excluye consultas técnicas del cómputo de PQRS
   - Reportes del sistema SIGEF que demuestran el pico de consultas
   - Actas de reunión con las dependencias consultadas

4. MEDIDAS ADOPTADAS:
   - Se implementó sistema de alertas automático desde noviembre
   - Se contrató personal de apoyo temporal
   - Se creó sección de preguntas frecuentes en portal web

Por lo anterior, solicito se modifique el hallazgo para reflejar que solo 4 casos (3.3%) excedieron el plazo sin causa justificada.`,
      
      evidenciasDescargo: [
        {
          id: 'ev-001',
          nombre: 'Circular_001-2024_Clasificacion_PQRS.pdf',
          tipo: 'application/pdf',
          tamaño: '850 KB',
          fecha: '2024-11-25',
          descripcion: 'Circular que excluye consultas técnicas'
        },
        {
          id: 'ev-002',
          nombre: 'Reporte_SIGEF_Octubre_2024.xlsx',
          tipo: 'application/vnd.ms-excel',
          tamaño: '1.2 MB',
          fecha: '2024-11-25',
          descripcion: 'Estadísticas de consultas técnicas'
        },
        {
          id: 'ev-003',
          nombre: 'Actas_Reuniones_Coordinacion.pdf',
          tipo: 'application/pdf',
          tamaño: '2.4 MB',
          fecha: '2024-11-25',
          descripcion: 'Reuniones de coordinación interáreas'
        }
      ],
      
      responsableDescargo: 'Sandra Montero',
      
      timeline: [
        {
          id: 'tl-001',
          tipo: 'inicio',
          descripcion: 'Controversia iniciada por el responsable del proceso',
          usuario: 'Sandra Montero',
          fecha: '2024-11-25 10:30'
        },
        {
          id: 'tl-002',
          tipo: 'argumentacion',
          descripcion: 'Argumentos de descargo presentados',
          usuario: 'Sandra Montero',
          fecha: '2024-11-25 10:45'
        },
        {
          id: 'tl-003',
          tipo: 'evidencia',
          descripcion: 'Se adjuntaron 3 documentos de soporte',
          usuario: 'Sandra Montero',
          fecha: '2024-11-25 11:00'
        }
      ]
    }
  },

  // ========== HALLAZGO 3: CONTROVERSIA RESUELTA (MODIFICADA) ==========
  {
    id: 'hall-003',
    codigo: 'H-2025-003',
    titulo: 'Debilidades en el control de inventarios',
    descripcion: 'Se encontraron diferencias entre el inventario físico y el registro en sistema',
    criterio: 'Procedimiento de Control de Inventarios, numeral 5.2',
    condicion: 'En el inventario anual se detectaron 15 elementos registrados en sistema que no se encontraron físicamente',
    causa: 'No se realizan conteos periódicos intermedios durante el año, solo el conteo anual',
    efecto: 'Riesgo de pérdida de activos y estados financieros con información inexacta',
    clasificacion: 'Hallazgo',
    gravedad: 'Media',
    estado: 'Cerrado',
    responsable: 'William Ramírez',
    fechaIdentificacion: '2024-10-10',
    procesoAuditado: 'Gestión de Almacén e Inventarios',
    auditor: 'Lucila Villamil',
    auditoriaId: 'AUD-2024-018',
    controversia: {
      id: 'cont-003',
      hallazgoId: 'hall-003',
      fechaInicio: '2024-10-15',
      estado: 'Aceptada',
      
      argumentosAuditado: `Solicito respetuosamente considerar los siguientes hechos:

De los 15 elementos señalados:
- 10 fueron dados de baja formalmente en marzo 2024 por obsolescencia, pero el acta de baja no se cruzó con sistemas
- 3 están en préstamo a territoriales según formato F-ALM-05 del 15/09/2024
- 2 efectivamente no se ubicaron y se reportaron como pérdida

Adjunto soportes documentales. Solicito ajustar el hallazgo a 2 elementos no ubicados (0.1% del inventario total de 2,000 elementos).`,
      
      evidenciasDescargo: [
        {
          id: 'ev-004',
          nombre: 'Acta_Baja_Marzo_2024.pdf',
          tipo: 'application/pdf',
          tamaño: '650 KB',
          fecha: '2024-10-15'
        },
        {
          id: 'ev-005',
          nombre: 'Formato_Prestamo_Territoriales.pdf',
          tipo: 'application/pdf',
          tamaño: '420 KB',
          fecha: '2024-10-15'
        }
      ],
      
      responsableDescargo: 'William Ramírez',
      
      respuestaAuditor: `Revisados los argumentos y evidencias presentadas, se verifica que:

1. El acta de baja de marzo 2024 es válida y está debidamente autorizada
2. Los formatos de préstamo a territoriales están completos y firmados
3. Se confirma que solo 2 elementos no fueron ubicados

Sin embargo, persiste la debilidad del control, ya que la falta de cruce de información entre actas de baja y sistema demuestra que el proceso no es suficientemente robusto.

DECISIÓN: Se modifica el hallazgo para ajustar la cifra a 2 elementos no ubicados, pero se mantiene la observación sobre la debilidad del proceso de actualización del sistema.`,
      
      auditorRevisor: 'Lucila Villamil',
      fechaRespuesta: '2024-10-20',
      
      decisionFinal: 'Modificar Hallazgo',
      justificacionDecision: 'Se ajusta la cantidad de elementos no ubicados de 15 a 2, pero se mantiene el hallazgo sobre la debilidad del proceso de actualización del sistema de inventarios. Se recomienda implementar procedimiento de cruce automático entre actas de baja y sistema.',
      fechaDecision: '2024-10-20',
      
      timeline: [
        {
          id: 'tl-004',
          tipo: 'inicio',
          descripcion: 'Controversia iniciada',
          usuario: 'William Ramírez',
          fecha: '2024-10-15 09:00'
        },
        {
          id: 'tl-005',
          tipo: 'argumentacion',
          descripcion: 'Argumentos presentados con soportes',
          usuario: 'William Ramírez',
          fecha: '2024-10-15 09:30'
        },
        {
          id: 'tl-006',
          tipo: 'respuesta',
          descripcion: 'Auditor emitió respuesta y análisis',
          usuario: 'Lucila Villamil',
          fecha: '2024-10-20 14:00'
        },
        {
          id: 'tl-007',
          tipo: 'decision',
          descripcion: 'Decisión: Modificar Hallazgo',
          usuario: 'Lucila Villamil',
          fecha: '2024-10-20 14:15'
        }
      ]
    }
  },

  // ========== HALLAZGO 4: CONTROVERSIA RESUELTA (ANULADA) ==========
  {
    id: 'hall-004',
    codigo: 'H-2025-004',
    titulo: 'Ausencia de actas de comité de compras',
    descripcion: 'No se encontraron actas de 3 sesiones del comité de compras del segundo trimestre',
    criterio: 'Reglamento Interno de Compras, Art. 8',
    condicion: 'Se solicitaron las actas de las sesiones de abril, mayo y junio del comité de compras y no fueron presentadas',
    causa: 'Posible falta de diligencia del secretario técnico del comité',
    efecto: 'No hay trazabilidad de las decisiones adoptadas',
    clasificacion: 'Hallazgo',
    gravedad: 'Alta',
    estado: 'Rechazado',
    responsable: 'Alexandra Triviño',
    fechaIdentificacion: '2024-09-05',
    procesoAuditado: 'Gestión de Compras',
    auditor: 'Natalia Cañon',
    auditoriaId: 'AUD-2024-012',
    controversia: {
      id: 'cont-004',
      hallazgoId: 'hall-004',
      fechaInicio: '2024-09-08',
      estado: 'Aceptada',
      
      argumentosAuditado: `Con todo respeto me permito manifestar:

Las actas SÍ EXISTEN y fueron debidamente elaboradas y aprobadas. Se presentó un error de comunicación durante la auditoría:

1. Las actas se solicitaron al correo institucional antiguo del secretario técnico (que estaba inactivo por cambio de personal)
2. El nuevo secretario técnico no fue contactado durante la auditoría
3. Las actas están archivadas físicamente en la Oficina de Compras y digitalmente en el SharePoint institucional

EVIDENCIAS:
- Actas firmadas de las 3 sesiones (abril, mayo, junio)
- Listados de asistencia
- Certificación del área de sistemas sobre existencia en SharePoint
- Correo del 15/ago donde se informó cambio de secretario técnico

Solicito anular el hallazgo ya que no existe incumplimiento, solo hubo un error de comunicación.`,
      
      evidenciasDescargo: [
        {
          id: 'ev-006',
          nombre: 'Actas_Comite_Q2_2024.pdf',
          tipo: 'application/pdf',
          tamaño: '3.2 MB',
          fecha: '2024-09-08',
          descripcion: 'Actas de abril, mayo y junio'
        },
        {
          id: 'ev-007',
          nombre: 'Certificacion_Sistemas_SharePoint.pdf',
          tipo: 'application/pdf',
          tamaño: '580 KB',
          fecha: '2024-09-08'
        },
        {
          id: 'ev-008',
          nombre: 'Correo_Cambio_Secretario.pdf',
          tipo: 'application/pdf',
          tamaño: '320 KB',
          fecha: '2024-09-08'
        }
      ],
      
      responsableDescargo: 'Alexandra Triviño',
      
      respuestaAuditor: `Revisada la controversia presentada y verificadas las evidencias:

VERIFICACIÓN:
1. Se confirmó la existencia de las 3 actas en el SharePoint institucional con las fechas correctas
2. Las actas están debidamente firmadas y cumplen con todos los requisitos formales
3. Se verificó el correo del 15 de agosto donde se informó el cambio de secretario técnico
4. El error fue de comunicación durante el proceso de auditoría

CONCLUSIÓN:
No existe incumplimiento normativo. Las actas existen, están completas y cumplen requisitos. El hallazgo se originó por un error de comunicación durante la fase de ejecución de la auditoría.

LECCIÓN APRENDIDA:
Se debe mejorar el protocolo de solicitud de información para verificar destinatarios actualizados.`,
      
      auditorRevisor: 'Natalia Cañon',
      fechaRespuesta: '2024-09-12',
      
      decisionFinal: 'Anular Hallazgo',
      justificacionDecision: 'Se anula el hallazgo. Las actas del comité de compras existen y cumplen con todos los requisitos normativos. El problema fue un error de comunicación durante la auditoría al solicitar información a un correo institucional inactivo. No existe incumplimiento normativo.',
      fechaDecision: '2024-09-12',
      
      timeline: [
        {
          id: 'tl-008',
          tipo: 'inicio',
          descripcion: 'Controversia iniciada',
          usuario: 'Alexandra Triviño',
          fecha: '2024-09-08 08:00'
        },
        {
          id: 'tl-009',
          tipo: 'argumentacion',
          descripcion: 'Argumentos y evidencias presentadas',
          usuario: 'Alexandra Triviño',
          fecha: '2024-09-08 08:45'
        },
        {
          id: 'tl-010',
          tipo: 'respuesta',
          descripcion: 'Auditor verificó las evidencias',
          usuario: 'Natalia Cañon',
          fecha: '2024-09-12 10:00'
        },
        {
          id: 'tl-011',
          tipo: 'decision',
          descripcion: 'Decisión: Anular Hallazgo',
          usuario: 'Natalia Cañon',
          fecha: '2024-09-12 10:30'
        }
      ]
    }
  },

  // ========== HALLAZGO 5: ABIERTO (sin controversia) ==========
  {
    id: 'hall-005',
    codigo: 'H-2025-005',
    titulo: 'Deficiencias en copias de seguridad de información crítica',
    descripcion: 'El proceso de backups no se ejecuta con la periodicidad establecida',
    criterio: 'Política de Seguridad de la Información, numeral 6.4',
    condicion: 'Se verificaron los logs de backups y se encontró que durante el último trimestre solo se ejecutaron 8 de 13 backups programados',
    causa: 'Fallas en el servidor de respaldos sin atención oportuna',
    efecto: 'Riesgo de pérdida de información crítica en caso de incidente',
    clasificacion: 'Hallazgo',
    gravedad: 'Crítica',
    estado: 'Abierto',
    responsable: 'Flor Mireya Murcia',
    fechaIdentificacion: '2024-12-01',
    procesoAuditado: 'Gestión de Tecnologías de la Información',
    auditor: 'Mario Oswaldo Bernal Rodriguez',
    auditoriaId: 'AUD-2025-003'
  },

  // ========== HALLAZGO 6: OBSERVACIÓN ==========
  {
    id: 'hall-006',
    codigo: 'O-2025-001',
    titulo: 'Oportunidad de mejora en procesos de inducción',
    descripcion: 'El proceso de inducción actual no incluye módulo sobre ética pública',
    criterio: 'Buena práctica recomendada (no es requisito obligatorio)',
    condicion: 'Se revisó el programa de inducción y no incluye contenido específico sobre código de ética',
    causa: 'El programa de inducción no se ha actualizado desde 2022',
    efecto: 'Oportunidad de fortalecer cultura ética institucional',
    clasificacion: 'Oportunidad de Mejora',
    gravedad: 'Baja',
    estado: 'Abierto',
    responsable: 'Nubia Pimiento',
    fechaIdentificacion: '2024-11-28',
    procesoAuditado: 'Gestión de Talento Humano',
    auditor: 'Fernando Ávila',
    auditoriaId: 'AUD-2025-004'
  }
];

// Función helper para obtener estadísticas
export function obtenerEstadisticasHallazgos() {
  return {
    total: MOCK_HALLAZGOS.length,
    porEstado: {
      abiertos: MOCK_HALLAZGOS.filter(h => h.estado === 'Abierto').length,
      enControversia: MOCK_HALLAZGOS.filter(h => h.estado === 'En Controversia').length,
      cerrados: MOCK_HALLAZGOS.filter(h => h.estado === 'Cerrado').length,
      rechazados: MOCK_HALLAZGOS.filter(h => h.estado === 'Rechazado').length,
    },
    porGravedad: {
      critica: MOCK_HALLAZGOS.filter(h => h.gravedad === 'Crítica').length,
      alta: MOCK_HALLAZGOS.filter(h => h.gravedad === 'Alta').length,
      media: MOCK_HALLAZGOS.filter(h => h.gravedad === 'Media').length,
      baja: MOCK_HALLAZGOS.filter(h => h.gravedad === 'Baja').length,
    },
    porClasificacion: {
      hallazgos: MOCK_HALLAZGOS.filter(h => h.clasificacion === 'Hallazgo').length,
      observaciones: MOCK_HALLAZGOS.filter(h => h.clasificacion === 'Observación').length,
      oportunidades: MOCK_HALLAZGOS.filter(h => h.clasificacion === 'Oportunidad de Mejora').length,
    },
    conControversia: MOCK_HALLAZGOS.filter(h => h.controversia).length,
  };
}
