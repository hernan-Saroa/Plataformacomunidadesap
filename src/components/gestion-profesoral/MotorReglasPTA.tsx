/**
 * MOTOR DE REGLAS PTA - SISTEMA DE VALIDACIÓN NORMATIVA
 * 
 * Implementa las reglas de negocio según la Circular Dispositiva 003 de 2025
 * y normatividad vigente de la ESAP para el Plan de Trabajo Académico.
 * 
 * Requerimiento: REQ-MOD-PTA-004.1 - Motor de Reglas de Negocio
 */

import { toast } from 'sonner@2.0.3';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

/**
 * Tipo de vinculación docente
 */
export type TipoVinculacion = 
  | 'carrera' 
  | 'ocasional' 
  | 'periodo-prueba' 
  | 'visitante' 
  | 'especial';

/**
 * Dedicación horaria del docente
 */
export type TipoDedicacion = 
  | 'tiempo-completo'  // 40 horas semanales
  | 'medio-tiempo';    // 20 horas semanales

/**
 * Componentes del PTA según normativa
 */
export type ComponentePTA = 
  | 'docencia' 
  | 'investigacion' 
  | 'extension' 
  | 'academico-administrativo';

/**
 * Periodicidad del PTA (parametrizable)
 */
export type PeriodicidadPTA = 'semestral' | 'anual';

/**
 * Estados del PTA
 */
export type EstadoPTA = 
  | 'construccion'          // En proceso de creación/edición
  | 'en-aprobacion'        // Enviado al flujo de aprobación
  | 'devuelto-ajustes'     // Rechazado con observaciones
  | 'aprobado'             // Aprobado por los 3 niveles
  | 'en-firme';            // Bloqueado, no editable

/**
 * Configuración de periodicidad y horas totales
 */
export interface ConfiguracionPeriodo {
  periodicidad: PeriodicidadPTA;
  horasTotales: number;              // 800 semestral / 1600 anual (futuro)
  horasSemanales: number;            // 40 para tiempo completo, 20 para medio tiempo
  semanas: number;                   // 20 semanas por semestre
}

/**
 * Distribución de horas por componente según tipo de actividad académica
 */
export interface DistribucionComponente {
  componente: ComponentePTA;
  nombre: string;
  porcentajeMinimo: number;          // % mínimo requerido
  porcentajeMaximo: number;          // % máximo permitido
  horasMinimas: number;              // Horas mínimas calculadas
  horasMaximas: number;              // Horas máximas calculadas
  descripcion: string;
}

/**
 * Actividad del PTA
 */
export interface ActividadPTA {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  componente: ComponentePTA;
  horasAsignadas: number;
  horasPorSemana?: number;           // Calculado automáticamente
  esObligatoria: boolean;
  requiereEvidencia: boolean;
  evidencias?: string[];             // URLs o referencias a repositorios descentralizados
  observaciones?: string;
}

/**
 * Plan de Trabajo Académico completo
 */
export interface PlanTrabajoAcademico {
  id: string;
  docenteId: string;
  docenteNombre: string;
  periodo: string;                   // "2025-1", "2025-2", etc.
  tipoVinculacion: TipoVinculacion;
  tipoDedicacion: TipoDedicacion;
  estado: EstadoPTA;
  configuracion: ConfiguracionPeriodo;
  actividades: ActividadPTA[];
  horasTotalesAsignadas: number;     // Suma de todas las actividades
  distribucion: DistribucionComponente[];
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  observaciones?: string;
}

/**
 * Resultado de validación
 */
export interface ResultadoValidacion {
  esValido: boolean;
  errores: string[];
  advertencias: string[];
  detalles: {
    horasTotales: number;
    horasPendientes: number;
    distribucionActual: { [key in ComponentePTA]?: number };
  };
}

// ============================================================================
// CONFIGURACIONES PARAMETRIZABLES
// ============================================================================

/**
 * CONFIGURACIÓN ACTUAL: Semestral 800 horas
 * NOTA: Este sistema debe ser parametrizable para cambiar a anual cuando
 * se modifique el Estatuto Profesoral
 */
export const CONFIGURACION_ACTUAL: ConfiguracionPeriodo = {
  periodicidad: 'semestral',
  horasTotales: 800,
  horasSemanales: 40,  // Tiempo completo
  semanas: 20
};

/**
 * CONFIGURACIÓN FUTURA: Anual 1600 horas (cuando se modifique el Estatuto)
 */
export const CONFIGURACION_FUTURA_ANUAL: ConfiguracionPeriodo = {
  periodicidad: 'anual',
  horasTotales: 1600,
  horasSemanales: 40,
  semanas: 40
};

/**
 * Distribución de componentes según normativa vigente
 * NOTA: Estos porcentajes son parametrizables según tipo de actividad académica
 */
export const DISTRIBUCION_COMPONENTES_ESTANDAR: DistribucionComponente[] = [
  {
    componente: 'docencia',
    nombre: 'Docencia',
    porcentajeMinimo: 50,  // Mínimo 50% en docencia
    porcentajeMaximo: 70,  // Máximo 70% en docencia
    horasMinimas: 400,     // 50% de 800h
    horasMaximas: 560,     // 70% de 800h
    descripcion: 'Actividades de docencia directa, preparación, evaluación, dirección TG, atención estudiantes'
  },
  {
    componente: 'investigacion',
    nombre: 'Investigación',
    porcentajeMinimo: 10,  // Mínimo 10% en investigación
    porcentajeMaximo: 30,  // Máximo 30% en investigación
    horasMinimas: 80,      // 10% de 800h
    horasMaximas: 240,     // 30% de 800h
    descripcion: 'Proyectos de investigación, publicaciones, ponencias, semilleros, grupos MinCiencias'
  },
  {
    componente: 'extension',
    nombre: 'Extensión',
    porcentajeMinimo: 5,   // Mínimo 5% en extensión
    porcentajeMaximo: 20,  // Máximo 20% en extensión
    horasMinimas: 40,      // 5% de 800h
    horasMaximas: 160,     // 20% de 800h
    descripcion: 'Convenios, servicios especializados, educación continua, consultorías, proyección social'
  },
  {
    componente: 'academico-administrativo',
    nombre: 'Académico-Administrativo',
    porcentajeMinimo: 5,   // Mínimo 5% en administración
    porcentajeMaximo: 25,  // Máximo 25% en administración
    horasMinimas: 40,      // 5% de 800h
    horasMaximas: 200,     // 25% de 800h
    descripcion: 'Representación, acreditación, gestión curricular, comités, coordinaciones'
  }
];

/**
 * Catálogo de actividades permitidas por componente
 */
export const CATALOGO_ACTIVIDADES = {
  docencia: [
    { codigo: 'DOC-001', nombre: 'Docencia directa (clases presenciales)', requiereEvidencia: true },
    { codigo: 'DOC-002', nombre: 'Docencia virtual (clases virtuales)', requiereEvidencia: true },
    { codigo: 'DOC-003', nombre: 'Seminarios y talleres', requiereEvidencia: true },
    { codigo: 'DOC-004', nombre: 'Tutorías académicas', requiereEvidencia: true },
    { codigo: 'DOC-005', nombre: 'Preparación de clases y materiales', requiereEvidencia: false },
    { codigo: 'DOC-006', nombre: 'Evaluación (exámenes, trabajos, proyectos)', requiereEvidencia: false },
    { codigo: 'DOC-007', nombre: 'Dirección de trabajos de grado', requiereEvidencia: true },
    { codigo: 'DOC-008', nombre: 'Dirección de tesis de posgrado', requiereEvidencia: true },
    { codigo: 'DOC-009', nombre: 'Atención a estudiantes (asesorías)', requiereEvidencia: false }
  ],
  investigacion: [
    { codigo: 'INV-001', nombre: 'Participación en proyecto de investigación aprobado', requiereEvidencia: true },
    { codigo: 'INV-002', nombre: 'Publicación de artículo en revista indexada', requiereEvidencia: true },
    { codigo: 'INV-003', nombre: 'Publicación de libro académico', requiereEvidencia: true },
    { codigo: 'INV-004', nombre: 'Publicación de capítulo de libro', requiereEvidencia: true },
    { codigo: 'INV-005', nombre: 'Ponencia en evento nacional', requiereEvidencia: true },
    { codigo: 'INV-006', nombre: 'Ponencia en evento internacional', requiereEvidencia: true },
    { codigo: 'INV-007', nombre: 'Dirección de semillero de investigación', requiereEvidencia: true },
    { codigo: 'INV-008', nombre: 'Participación en grupo reconocido MinCiencias', requiereEvidencia: true },
    { codigo: 'INV-009', nombre: 'Actividades de apoyo a la investigación', requiereEvidencia: false }
  ],
  extension: [
    { codigo: 'EXT-001', nombre: 'Gestión de convenio interinstitucional', requiereEvidencia: true },
    { codigo: 'EXT-002', nombre: 'Ejecución de convenio interinstitucional', requiereEvidencia: true },
    { codigo: 'EXT-003', nombre: 'Servicio especializado a la comunidad', requiereEvidencia: true },
    { codigo: 'EXT-004', nombre: 'Educación continua (diplomados, cursos)', requiereEvidencia: true },
    { codigo: 'EXT-005', nombre: 'Consultoría externa', requiereEvidencia: true },
    { codigo: 'EXT-006', nombre: 'Asesoría externa', requiereEvidencia: true },
    { codigo: 'EXT-007', nombre: 'Proyección social y comunitaria', requiereEvidencia: true }
  ],
  'academico-administrativo': [
    { codigo: 'ADM-001', nombre: 'Representación institucional', requiereEvidencia: true },
    { codigo: 'ADM-002', nombre: 'Proceso de acreditación', requiereEvidencia: true },
    { codigo: 'ADM-003', nombre: 'Autoevaluación institucional', requiereEvidencia: true },
    { codigo: 'ADM-004', nombre: 'Gestión curricular (creación programas)', requiereEvidencia: true },
    { codigo: 'ADM-005', nombre: 'Actualización curricular', requiereEvidencia: true },
    { codigo: 'ADM-006', nombre: 'Participación en comité institucional', requiereEvidencia: true },
    { codigo: 'ADM-007', nombre: 'Coordinación de programa académico', requiereEvidencia: true },
    { codigo: 'ADM-008', nombre: 'Coordinación de área', requiereEvidencia: true },
    { codigo: 'ADM-009', nombre: 'Coordinación de núcleo temático', requiereEvidencia: true }
  ]
};

// ============================================================================
// MOTOR DE REGLAS - CLASE PRINCIPAL
// ============================================================================

export class MotorReglasPTA {
  private configuracion: ConfiguracionPeriodo;
  private distribucion: DistribucionComponente[];

  constructor(
    configuracion: ConfiguracionPeriodo = CONFIGURACION_ACTUAL,
    distribucion: DistribucionComponente[] = DISTRIBUCION_COMPONENTES_ESTANDAR
  ) {
    this.configuracion = configuracion;
    this.distribucion = this.calcularHorasDistribucion(distribucion, configuracion.horasTotales);
  }

  /**
   * Calcula las horas mínimas y máximas de cada componente según las horas totales
   */
  private calcularHorasDistribucion(
    distribucion: DistribucionComponente[],
    horasTotales: number
  ): DistribucionComponente[] {
    return distribucion.map(comp => ({
      ...comp,
      horasMinimas: Math.round((comp.porcentajeMinimo / 100) * horasTotales),
      horasMaximas: Math.round((comp.porcentajeMaximo / 100) * horasTotales)
    }));
  }

  /**
   * Valida un PTA completo según todas las reglas de negocio
   */
  public validarPTA(pta: PlanTrabajoAcademico): ResultadoValidacion {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // 1. Validar horas totales
    const validacionHoras = this.validarHorasTotales(pta.actividades);
    if (!validacionHoras.esValido) {
      errores.push(...validacionHoras.errores);
    }
    advertencias.push(...validacionHoras.advertencias);

    // 2. Validar distribución por componente
    const validacionDistribucion = this.validarDistribucionComponentes(pta.actividades);
    if (!validacionDistribucion.esValido) {
      errores.push(...validacionDistribucion.errores);
    }
    advertencias.push(...validacionDistribucion.advertencias);

    // 3. Validar actividades obligatorias
    const validacionObligatorias = this.validarActividadesObligatorias(pta.actividades);
    if (!validacionObligatorias.esValido) {
      errores.push(...validacionObligatorias.errores);
    }

    // 4. Validar evidencias requeridas
    const validacionEvidencias = this.validarEvidencias(pta.actividades);
    if (!validacionEvidencias.esValido) {
      advertencias.push(...validacionEvidencias.advertencias);
    }

    // Calcular distribución actual
    const distribucionActual = this.calcularDistribucionActual(pta.actividades);
    const horasTotalesAsignadas = this.calcularHorasTotales(pta.actividades);

    return {
      esValido: errores.length === 0,
      errores,
      advertencias,
      detalles: {
        horasTotales: horasTotalesAsignadas,
        horasPendientes: this.configuracion.horasTotales - horasTotalesAsignadas,
        distribucionActual
      }
    };
  }

  /**
   * Valida que las horas totales sean exactamente las configuradas
   */
  private validarHorasTotales(actividades: ActividadPTA[]): ResultadoValidacion {
    const horasTotales = this.calcularHorasTotales(actividades);
    const errores: string[] = [];
    const advertencias: string[] = [];

    if (horasTotales > this.configuracion.horasTotales) {
      errores.push(
        `Las horas totales asignadas (${horasTotales}h) exceden el límite de ${this.configuracion.horasTotales}h ${this.configuracion.periodicidad}`
      );
    } else if (horasTotales < this.configuracion.horasTotales) {
      const faltantes = this.configuracion.horasTotales - horasTotales;
      advertencias.push(
        `Faltan ${faltantes}h para completar las ${this.configuracion.horasTotales}h ${this.configuracion.periodicidad} requeridas`
      );
    }

    return {
      esValido: errores.length === 0,
      errores,
      advertencias,
      detalles: {
        horasTotales,
        horasPendientes: this.configuracion.horasTotales - horasTotales,
        distribucionActual: {}
      }
    };
  }

  /**
   * Valida que la distribución por componente cumpla los rangos permitidos
   */
  private validarDistribucionComponentes(actividades: ActividadPTA[]): ResultadoValidacion {
    const distribucionActual = this.calcularDistribucionActual(actividades);
    const errores: string[] = [];
    const advertencias: string[] = [];

    this.distribucion.forEach(comp => {
      const horasActuales = distribucionActual[comp.componente] || 0;

      if (horasActuales < comp.horasMinimas) {
        errores.push(
          `El componente "${comp.nombre}" tiene ${horasActuales}h asignadas, pero requiere mínimo ${comp.horasMinimas}h (${comp.porcentajeMinimo}%)`
        );
      } else if (horasActuales > comp.horasMaximas) {
        errores.push(
          `El componente "${comp.nombre}" tiene ${horasActuales}h asignadas, pero el máximo permitido es ${comp.horasMaximas}h (${comp.porcentajeMaximo}%)`
        );
      } else if (horasActuales === comp.horasMinimas) {
        advertencias.push(
          `El componente "${comp.nombre}" está en el mínimo permitido (${comp.horasMinimas}h)`
        );
      }
    });

    return {
      esValido: errores.length === 0,
      errores,
      advertencias,
      detalles: {
        horasTotales: this.calcularHorasTotales(actividades),
        horasPendientes: 0,
        distribucionActual
      }
    };
  }

  /**
   * Valida que todas las actividades obligatorias estén incluidas
   */
  private validarActividadesObligatorias(actividades: ActividadPTA[]): ResultadoValidacion {
    const errores: string[] = [];
    const actividadesObligatorias = actividades.filter(a => a.esObligatoria);

    // Validar que al menos haya actividades de docencia (siempre obligatorias)
    const actividadesDocencia = actividades.filter(a => a.componente === 'docencia');
    if (actividadesDocencia.length === 0) {
      errores.push('Debe incluir al menos una actividad de Docencia (componente obligatorio)');
    }

    return {
      esValido: errores.length === 0,
      errores,
      advertencias: [],
      detalles: {
        horasTotales: this.calcularHorasTotales(actividades),
        horasPendientes: 0,
        distribucionActual: {}
      }
    };
  }

  /**
   * Valida que las actividades que requieren evidencia tengan al menos una evidencia
   */
  private validarEvidencias(actividades: ActividadPTA[]): ResultadoValidacion {
    const advertencias: string[] = [];

    actividades.forEach(actividad => {
      if (actividad.requiereEvidencia && (!actividad.evidencias || actividad.evidencias.length === 0)) {
        advertencias.push(
          `La actividad "${actividad.nombre}" requiere al menos una evidencia cargada`
        );
      }
    });

    return {
      esValido: true,
      errores: [],
      advertencias,
      detalles: {
        horasTotales: this.calcularHorasTotales(actividades),
        horasPendientes: 0,
        distribucionActual: {}
      }
    };
  }

  /**
   * Calcula el total de horas asignadas
   */
  private calcularHorasTotales(actividades: ActividadPTA[]): number {
    return actividades.reduce((total, act) => total + act.horasAsignadas, 0);
  }

  /**
   * Calcula la distribución actual de horas por componente
   */
  private calcularDistribucionActual(actividades: ActividadPTA[]): { [key in ComponentePTA]?: number } {
    const distribucion: { [key in ComponentePTA]?: number } = {};

    actividades.forEach(actividad => {
      if (!distribucion[actividad.componente]) {
        distribucion[actividad.componente] = 0;
      }
      distribucion[actividad.componente]! += actividad.horasAsignadas;
    });

    return distribucion;
  }

  /**
   * Calcula las horas por semana de una actividad
   */
  public calcularHorasPorSemana(horasTotales: number): number {
    return Math.round((horasTotales / this.configuracion.semanas) * 10) / 10;
  }

  /**
   * Obtiene la configuración actual
   */
  public getConfiguracion(): ConfiguracionPeriodo {
    return { ...this.configuracion };
  }

  /**
   * Obtiene la distribución de componentes
   */
  public getDistribucion(): DistribucionComponente[] {
    return [...this.distribucion];
  }

  /**
   * Verifica si es posible agregar una actividad sin exceder límites
   */
  public puedeAgregarActividad(
    actividadesActuales: ActividadPTA[],
    nuevaActividad: ActividadPTA
  ): { posible: boolean; razon?: string } {
    const actividadesTemp = [...actividadesActuales, nuevaActividad];
    const horasTotales = this.calcularHorasTotales(actividadesTemp);

    if (horasTotales > this.configuracion.horasTotales) {
      return {
        posible: false,
        razon: `Excedería el límite de ${this.configuracion.horasTotales}h (total: ${horasTotales}h)`
      };
    }

    const distribucion = this.calcularDistribucionActual(actividadesTemp);
    const comp = this.distribucion.find(d => d.componente === nuevaActividad.componente);

    if (comp && distribucion[comp.componente]! > comp.horasMaximas) {
      return {
        posible: false,
        razon: `Excedería el máximo de ${comp.horasMaximas}h para ${comp.nombre}`
      };
    }

    return { posible: true };
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Muestra el resultado de validación con toasts
 */
export function mostrarResultadoValidacion(resultado: ResultadoValidacion) {
  if (resultado.esValido) {
    toast.success('✅ PTA válido', {
      description: `Total: ${resultado.detalles.horasTotales}h asignadas`
    });
  } else {
    resultado.errores.forEach(error => {
      toast.error('❌ Error de validación', {
        description: error
      });
    });
  }

  resultado.advertencias.forEach(advertencia => {
    toast.warning('⚠️ Advertencia', {
      description: advertencia
    });
  });
}

/**
 * Genera un nuevo PTA vacío
 */
export function crearPTAVacio(
  docenteId: string,
  docenteNombre: string,
  periodo: string,
  tipoVinculacion: TipoVinculacion = 'carrera',
  tipoDedicacion: TipoDedicacion = 'tiempo-completo'
): PlanTrabajoAcademico {
  return {
    id: `pta-${Date.now()}`,
    docenteId,
    docenteNombre,
    periodo,
    tipoVinculacion,
    tipoDedicacion,
    estado: 'construccion',
    configuracion: CONFIGURACION_ACTUAL,
    actividades: [],
    horasTotalesAsignadas: 0,
    distribucion: DISTRIBUCION_COMPONENTES_ESTANDAR,
    fechaCreacion: new Date().toISOString(),
    fechaUltimaModificacion: new Date().toISOString()
  };
}
