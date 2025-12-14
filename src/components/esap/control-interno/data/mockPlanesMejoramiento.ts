/**
 * MOCK DATA - PLANES DE MEJORAMIENTO Y EVIDENCIAS
 * Datos de ejemplo para testing del sistema de validación de evidencias
 */

export interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  fechaCarga: string;
  version: number;
  descripcion: string;
  estadoValidacion: 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada';
  responsableCarga: string;
  urlArchivo?: string;
  validacion?: ValidacionEvidencia;
  versiones?: VersionEvidencia[];
}

export interface ValidacionEvidencia {
  id: string;
  evidenciaId: string;
  auditorRevisor: string;
  fechaRevision: string;
  estado: 'Aprobada' | 'Rechazada';
  checklist: ItemChecklist[];
  comentarios: string;
  observaciones?: string;
}

export interface ItemChecklist {
  id: string;
  criterio: string;
  cumple: boolean;
  comentario?: string;
}

export interface VersionEvidencia {
  version: number;
  fechaCarga: string;
  responsable: string;
  nombreArchivo: string;
  cambios: string;
}

export interface PlanMejoramiento {
  id: string;
  hallazgoId: string;
  codigo: string;
  accionMejora: string;
  descripcion: string;
  responsable: string;
  areaResponsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'En Ejecución' | 'Completado' | 'Vencido' | 'Cancelado';
  avance: number;
  evidencias: Evidencia[];
  observaciones?: string;
}

// ========== PLANES DE MEJORAMIENTO ==========

export const MOCK_PLANES_MEJORAMIENTO: PlanMejoramiento[] = [
  // ========== PLAN 1: EN EJECUCIÓN CON EVIDENCIAS PENDIENTES ==========
  {
    id: 'plan-001',
    hallazgoId: 'hall-001',
    codigo: 'PM-2025-001',
    accionMejora: 'Implementar checklist de verificación documental para contratos',
    descripcion:
      'Diseñar e implementar checklist obligatorio que deba diligenciarse antes del cierre de cada carpeta contractual. Incluir capacitación al personal responsable.',
    responsable: 'Catalina Rubio',
    areaResponsable: 'Gestión Contractual',
    fechaInicio: '2024-12-01',
    fechaFin: '2025-02-28',
    estado: 'En Ejecución',
    avance: 45,
    evidencias: [
      {
        id: 'ev-001',
        nombre: 'Formato_Checklist_Contratos_v1.xlsx',
        tipo: 'application/vnd.ms-excel',
        tamaño: '125 KB',
        fechaCarga: '2024-12-10',
        version: 1,
        descripcion:
          'Formato de checklist diseñado con todos los documentos requeridos según el Manual de Contratación. Incluye 15 items verificables.',
        estadoValidacion: 'Pendiente',
        responsableCarga: 'Catalina Rubio',
      },
      {
        id: 'ev-002',
        nombre: 'Acta_Socializacion_Checklist.pdf',
        tipo: 'application/pdf',
        tamaño: '2.1 MB',
        fechaCarga: '2024-12-12',
        version: 1,
        descripcion:
          'Acta de socialización del checklist con el equipo de contratación. Fecha: 12/dic/2024. Asistentes: 8 personas. Incluye firmas.',
        estadoValidacion: 'En Revisión',
        responsableCarga: 'Catalina Rubio',
      },
    ],
  },

  // ========== PLAN 2: EN EJECUCIÓN CON EVIDENCIAS APROBADAS Y RECHAZADAS ==========
  {
    id: 'plan-002',
    hallazgoId: 'hall-002',
    codigo: 'PM-2025-002',
    accionMejora: 'Implementar sistema de alertas automáticas para PQRS',
    descripcion:
      'Configurar sistema de alertas en plataforma PQRS que notifique al responsable 5 días antes del vencimiento. Contratar personal de apoyo temporal.',
    responsable: 'Sandra Montero',
    areaResponsable: 'Atención al Ciudadano',
    fechaInicio: '2024-11-28',
    fechaFin: '2025-01-31',
    estado: 'En Ejecución',
    avance: 70,
    evidencias: [
      {
        id: 'ev-003',
        nombre: 'Configuracion_Sistema_Alertas.pdf',
        tipo: 'application/pdf',
        tamaño: '850 KB',
        fechaCarga: '2024-12-05',
        version: 1,
        descripcion:
          'Documento técnico que evidencia la configuración de alertas automáticas en el sistema PQRS. Incluye pantallazos y parámetros.',
        estadoValidacion: 'Aprobada',
        responsableCarga: 'Sandra Montero',
        validacion: {
          id: 'val-001',
          evidenciaId: 'ev-003',
          auditorRevisor: 'Mario Oswaldo Bernal Rodriguez',
          fechaRevision: '2024-12-08',
          estado: 'Aprobada',
          checklist: [
            {
              id: 'check-1',
              criterio: 'El documento es legible y está completo',
              cumple: true,
            },
            {
              id: 'check-2',
              criterio: 'La evidencia corresponde a la acción de mejora comprometida',
              cumple: true,
            },
            {
              id: 'check-3',
              criterio: 'Las fechas son coherentes con el cronograma',
              cumple: true,
            },
            {
              id: 'check-4',
              criterio: 'Incluye firmas o aprobaciones requeridas',
              cumple: true,
            },
            {
              id: 'check-5',
              criterio: 'Demuestra la implementación efectiva de la acción',
              cumple: true,
            },
          ],
          comentarios:
            'La evidencia es válida y demuestra efectivamente la configuración del sistema de alertas. Los pantallazos son claros y muestran los parámetros correctamente configurados. Se verifica que las alertas se envían 5 días antes del vencimiento como se comprometió.',
        },
      },
      {
        id: 'ev-004',
        nombre: 'Contrato_Personal_Apoyo.pdf',
        tipo: 'application/pdf',
        tamaño: '1.5 MB',
        fechaCarga: '2024-12-08',
        version: 1,
        descripcion:
          'Contrato de prestación de servicios para personal de apoyo temporal en atención PQRS. Plazo: 3 meses.',
        estadoValidacion: 'Rechazada',
        responsableCarga: 'Sandra Montero',
        validacion: {
          id: 'val-002',
          evidenciaId: 'ev-004',
          auditorRevisor: 'Mario Oswaldo Bernal Rodriguez',
          fechaRevision: '2024-12-09',
          estado: 'Rechazada',
          checklist: [
            {
              id: 'check-1',
              criterio: 'El documento es legible y está completo',
              cumple: true,
            },
            {
              id: 'check-2',
              criterio: 'La evidencia corresponde a la acción de mejora comprometida',
              cumple: true,
            },
            {
              id: 'check-3',
              criterio: 'Las fechas son coherentes con el cronograma',
              cumple: true,
            },
            {
              id: 'check-4',
              criterio: 'Incluye firmas o aprobaciones requeridas',
              cumple: false,
              comentario: 'Falta la firma del supervisor del contrato',
            },
            {
              id: 'check-5',
              criterio: 'Demuestra la implementación efectiva de la acción',
              cumple: false,
              comentario: 'No se adjunta acta de inicio del contrato',
            },
          ],
          comentarios:
            'El contrato presentado NO incluye la firma del supervisor designado en la página 5. Adicionalmente, se requiere adjuntar el acta de inicio del contrato que demuestre que la persona efectivamente comenzó a prestar el servicio. Por favor, cargar una nueva versión del documento con estas correcciones.',
        },
      },
    ],
  },

  // ========== PLAN 3: COMPLETADO CON TODAS LAS EVIDENCIAS APROBADAS ==========
  {
    id: 'plan-003',
    hallazgoId: 'hall-003',
    codigo: 'PM-2024-018',
    accionMejora: 'Implementar conteos cíclicos trimestrales de inventario',
    descripcion:
      'Establecer procedimiento de conteos cíclicos trimestrales además del conteo anual. Actualizar procedimiento de Control de Inventarios.',
    responsable: 'William Ramírez',
    areaResponsable: 'Gestión de Almacén e Inventarios',
    fechaInicio: '2024-10-25',
    fechaFin: '2024-12-20',
    estado: 'Completado',
    avance: 100,
    evidencias: [
      {
        id: 'ev-005',
        nombre: 'Procedimiento_Conteos_Ciclicos_v2.pdf',
        tipo: 'application/pdf',
        tamaño: '1.8 MB',
        fechaCarga: '2024-11-15',
        version: 2,
        descripcion:
          'Procedimiento actualizado que incluye conteos cíclicos trimestrales. Aprobado por la Dirección Administrativa. Código: PR-ALM-003-v2.',
        estadoValidacion: 'Aprobada',
        responsableCarga: 'William Ramírez',
        validacion: {
          id: 'val-003',
          evidenciaId: 'ev-005',
          auditorRevisor: 'Lucila Villamil',
          fechaRevision: '2024-11-18',
          estado: 'Aprobada',
          checklist: [
            {
              id: 'check-1',
              criterio: 'El documento es legible y está completo',
              cumple: true,
            },
            {
              id: 'check-2',
              criterio: 'La evidencia corresponde a la acción de mejora comprometida',
              cumple: true,
            },
            {
              id: 'check-3',
              criterio: 'Las fechas son coherentes con el cronograma',
              cumple: true,
            },
            {
              id: 'check-4',
              criterio: 'Incluye firmas o aprobaciones requeridas',
              cumple: true,
            },
            {
              id: 'check-5',
              criterio: 'Demuestra la implementación efectiva de la acción',
              cumple: true,
            },
          ],
          comentarios:
            'Procedimiento aprobado satisfactoriamente. Se verifica que incluye la frecuencia trimestral de conteos, el responsable, la metodología y el formato de registro. Cuenta con las firmas de elaboración, revisión y aprobación requeridas. Cumple con lo comprometido en el plan de mejoramiento.',
        },
        versiones: [
          {
            version: 1,
            fechaCarga: '2024-11-10',
            responsable: 'William Ramírez',
            nombreArchivo: 'Procedimiento_Conteos_Ciclicos_v1.pdf',
            cambios: 'Versión inicial',
          },
          {
            version: 2,
            fechaCarga: '2024-11-15',
            responsable: 'William Ramírez',
            nombreArchivo: 'Procedimiento_Conteos_Ciclicos_v2.pdf',
            cambios: 'Incorporación de firmas de aprobación',
          },
        ],
      },
      {
        id: 'ev-006',
        nombre: 'Informe_Primer_Conteo_Ciclico_Q4.xlsx',
        tipo: 'application/vnd.ms-excel',
        tamaño: '485 KB',
        fechaCarga: '2024-12-05',
        version: 1,
        descripcion:
          'Informe del primer conteo cíclico realizado en diciembre 2024. Incluye listado de elementos contados, diferencias encontradas y ajustes realizados.',
        estadoValidacion: 'Aprobada',
        responsableCarga: 'William Ramírez',
        validacion: {
          id: 'val-004',
          evidenciaId: 'ev-006',
          auditorRevisor: 'Lucila Villamil',
          fechaRevision: '2024-12-08',
          estado: 'Aprobada',
          checklist: [
            {
              id: 'check-1',
              criterio: 'El documento es legible y está completo',
              cumple: true,
            },
            {
              id: 'check-2',
              criterio: 'La evidencia corresponde a la acción de mejora comprometida',
              cumple: true,
            },
            {
              id: 'check-3',
              criterio: 'Las fechas son coherentes con el cronograma',
              cumple: true,
            },
            {
              id: 'check-4',
              criterio: 'Incluye firmas o aprobaciones requeridas',
              cumple: true,
            },
            {
              id: 'check-5',
              criterio: 'Demuestra la implementación efectiva de la acción',
              cumple: true,
            },
          ],
          comentarios:
            'Evidencia aprobada. El informe demuestra que se realizó efectivamente el primer conteo cíclico trimestral en diciembre 2024. Se verificaron 250 elementos, se encontraron 3 diferencias menores que fueron ajustadas. El documento incluye las firmas del responsable del conteo y del jefe de almacén. Se evidencia la implementación efectiva de la mejora comprometida.',
        },
      },
      {
        id: 'ev-007',
        nombre: 'Capacitacion_Personal_Conteos.pdf',
        tipo: 'application/pdf',
        tamaño: '3.2 MB',
        fechaCarga: '2024-11-20',
        version: 1,
        descripcion:
          'Presentación utilizada en capacitación al personal sobre el nuevo procedimiento de conteos cíclicos. Incluye listado de asistencia y registro fotográfico.',
        estadoValidacion: 'Aprobada',
        responsableCarga: 'William Ramírez',
        validacion: {
          id: 'val-005',
          evidenciaId: 'ev-007',
          auditorRevisor: 'Lucila Villamil',
          fechaRevision: '2024-11-22',
          estado: 'Aprobada',
          checklist: [
            {
              id: 'check-1',
              criterio: 'El documento es legible y está completo',
              cumple: true,
            },
            {
              id: 'check-2',
              criterio: 'La evidencia corresponde a la acción de mejora comprometida',
              cumple: true,
            },
            {
              id: 'check-3',
              criterio: 'Las fechas son coherentes con el cronograma',
              cumple: true,
            },
            {
              id: 'check-4',
              criterio: 'Incluye firmas o aprobaciones requeridas',
              cumple: true,
            },
            {
              id: 'check-5',
              criterio: 'Demuestra la implementación efectiva de la acción',
              cumple: true,
            },
          ],
          comentarios:
            'Evidencia de capacitación aprobada. Se verifica que se capacitó al personal de almacén sobre el nuevo procedimiento. El listado de asistencia incluye 5 personas con sus firmas. El registro fotográfico confirma la realización de la actividad. Contenido de la presentación es claro y completo.',
        },
      },
    ],
  },

  // ========== PLAN 4: EN EJECUCIÓN SIN EVIDENCIAS ==========
  {
    id: 'plan-004',
    hallazgoId: 'hall-005',
    codigo: 'PM-2025-005',
    accionMejora: 'Reparar servidor de respaldos y restaurar ejecución automática de backups',
    descripcion:
      'Contratar mantenimiento correctivo del servidor de respaldos. Verificar ejecución automática diaria de backups. Documentar pruebas de restauración.',
    responsable: 'Flor Mireya Murcia',
    areaResponsable: 'Gestión de Tecnologías de la Información',
    fechaInicio: '2024-12-10',
    fechaFin: '2025-01-31',
    estado: 'En Ejecución',
    avance: 25,
    evidencias: [],
    observaciones:
      'Plan en fase inicial. Se está gestionando contratación del proveedor de mantenimiento.',
  },

  // ========== PLAN 5: VENCIDO (para demostración) ==========
  {
    id: 'plan-005',
    hallazgoId: 'hall-006',
    codigo: 'PM-2024-032',
    accionMejora: 'Actualizar programa de inducción incluyendo módulo de ética pública',
    descripcion:
      'Diseñar e incorporar módulo de 2 horas sobre código de ética y valores institucionales en el programa de inducción a nuevos funcionarios.',
    responsable: 'Nubia Pimiento',
    areaResponsable: 'Gestión de Talento Humano',
    fechaInicio: '2024-09-01',
    fechaFin: '2024-11-30',
    estado: 'Vencido',
    avance: 60,
    evidencias: [
      {
        id: 'ev-008',
        nombre: 'Borrador_Modulo_Etica.pptx',
        tipo: 'application/vnd.ms-powerpoint',
        tamaño: '8.5 MB',
        fechaCarga: '2024-10-15',
        version: 1,
        descripcion:
          'Borrador del módulo de ética pública para el programa de inducción. Pendiente de revisión y aprobación.',
        estadoValidacion: 'Pendiente',
        responsableCarga: 'Nubia Pimiento',
      },
    ],
    observaciones:
      'Plan vencido. Se solicitó prórroga hasta enero 2025 por demora en aprobaciones.',
  },
];

// ============ FUNCIONES AUXILIARES ============

export function obtenerEstadisticasPlanes() {
  return {
    total: MOCK_PLANES_MEJORAMIENTO.length,
    porEstado: {
      enEjecucion: MOCK_PLANES_MEJORAMIENTO.filter((p) => p.estado === 'En Ejecución').length,
      completados: MOCK_PLANES_MEJORAMIENTO.filter((p) => p.estado === 'Completado').length,
      vencidos: MOCK_PLANES_MEJORAMIENTO.filter((p) => p.estado === 'Vencido').length,
      cancelados: MOCK_PLANES_MEJORAMIENTO.filter((p) => p.estado === 'Cancelado').length,
    },
    evidencias: {
      total: MOCK_PLANES_MEJORAMIENTO.reduce((sum, p) => sum + p.evidencias.length, 0),
      pendientes: MOCK_PLANES_MEJORAMIENTO.reduce(
        (sum, p) => sum + p.evidencias.filter((e) => e.estadoValidacion === 'Pendiente').length,
        0
      ),
      enRevision: MOCK_PLANES_MEJORAMIENTO.reduce(
        (sum, p) => sum + p.evidencias.filter((e) => e.estadoValidacion === 'En Revisión').length,
        0
      ),
      aprobadas: MOCK_PLANES_MEJORAMIENTO.reduce(
        (sum, p) => sum + p.evidencias.filter((e) => e.estadoValidacion === 'Aprobada').length,
        0
      ),
      rechazadas: MOCK_PLANES_MEJORAMIENTO.reduce(
        (sum, p) => sum + p.evidencias.filter((e) => e.estadoValidacion === 'Rechazada').length,
        0
      ),
    },
    avancePromedio: Math.round(
      MOCK_PLANES_MEJORAMIENTO.reduce((sum, p) => sum + p.avance, 0) /
        MOCK_PLANES_MEJORAMIENTO.length
    ),
  };
}

export function obtenerPlanesPorResponsable(responsable: string) {
  return MOCK_PLANES_MEJORAMIENTO.filter((p) => p.responsable === responsable);
}

export function obtenerEvidenciasPendientesValidacion() {
  const evidencias: Array<{ plan: PlanMejoramiento; evidencia: Evidencia }> = [];

  MOCK_PLANES_MEJORAMIENTO.forEach((plan) => {
    plan.evidencias.forEach((evidencia) => {
      if (
        evidencia.estadoValidacion === 'Pendiente' ||
        evidencia.estadoValidacion === 'En Revisión'
      ) {
        evidencias.push({ plan, evidencia });
      }
    });
  });

  return evidencias;
}
