/**
 * FLUJO DE APROBACIÓN PTA - SISTEMA DE 3 NIVELES JERÁRQUICOS
 * 
 * Implementa el flujo de aprobación obligatorio de 3 niveles según normativa ESAP:
 * Nivel 1: Director territorial / Sub director Territorial
 * Nivel 2: Coordinador Académico / Decano
 * Nivel 3: Subdirección Nacional Académica (aprobación final)
 * 
 * Requerimiento: REQ-MOD-PTA-004.3 - Flujos de Aprobación Digital
 */

import { PlanTrabajoAcademico, EstadoPTA, ComponentePTA } from './MotorReglasPTA';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

/**
 * Niveles jerárquicos de aprobación
 */
export enum NivelAprobacion {
  NIVEL_1 = 1,  // Director territorial / Sub director Territorial
  NIVEL_2 = 2,  // Coordinador Académico / Decano
  NIVEL_3 = 3   // Subdirección Nacional Académica
}

/**
 * Tipo de acción en el flujo
 */
export enum TipoAccionAprobacion {
  ENVIAR = 'enviar',
  APROBAR = 'aprobar',
  RECHAZAR = 'rechazar',
  SOLICITAR_AJUSTES = 'solicitar-ajustes',
  REENVIAR = 'reenviar'
}

/**
 * Roles autorizados por nivel
 */
export const ROLES_POR_NIVEL = {
  [NivelAprobacion.NIVEL_1]: [
    'Director Territorial',
    'Subdirector Territorial'
  ],
  [NivelAprobacion.NIVEL_2]: [
    'Coordinador Académico',
    'Decano'
  ],
  [NivelAprobacion.NIVEL_3]: [
    'Subdirector Nacional Académico',
    'Director Subdirección Académica'
  ]
};

/**
 * Firmas específicas por área misional
 * Los directores técnicos firman ÚNICAMENTE los PTA con actividades en sus áreas
 */
export const FIRMAS_AREAS_ESPECIFICAS = {
  'investigacion': [
    'Director Subdirección de Investigación'
  ],
  'extension': [
    'Director Subdirección de Proyección Institucional',
    'Director Técnico de Capacitación',
    'Director Técnico de Fortalecimiento'
  ]
};

/**
 * Registro de firma digital
 */
export interface FirmaDigital {
  id: string;
  nivel: NivelAprobacion;
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorCargo: string;
  aprobadorEmail: string;
  accion: TipoAccionAprobacion;
  fecha: string;                      // ISO timestamp
  timestamp: number;                  // Unix timestamp para ordenamiento
  observaciones?: string;
  componentesRevisados?: ComponentePTA[];  // Para firmas específicas por área
  firmaHash?: string;                 // Hash de la firma digital (futuro)
  ipAddress?: string;                 // IP desde donde se firmó
  userAgent?: string;                 // Navegador/dispositivo
}

/**
 * Estado del flujo de aprobación
 */
export interface EstadoFlujo {
  nivelActual: NivelAprobacion | null;
  ultimaActualizacion: string;
  requiereFirmasEspecificas: boolean;
  firmasPendientes: string[];         // Lista de cargos pendientes
}

/**
 * PTA con flujo de aprobación completo
 */
export interface PTAConAprobacion extends PlanTrabajoAcademico {
  firmas: FirmaDigital[];
  estadoFlujo: EstadoFlujo;
  notificacionesEnviadas: NotificacionPTA[];
}

/**
 * Notificación del sistema PTA
 */
export interface NotificacionPTA {
  id: string;
  tipo: 'envio' | 'aprobacion' | 'rechazo' | 'recordatorio';
  destinatarioId: string;
  destinatarioEmail: string;
  asunto: string;
  mensaje: string;
  fechaEnvio: string;
  leida: boolean;
  ptaId: string;
}

/**
 * Resultado de una acción de aprobación
 */
export interface ResultadoAprobacion {
  exito: boolean;
  mensaje: string;
  nuevoEstado: EstadoPTA;
  siguienteNivel?: NivelAprobacion;
  notificacionesEnviadas: NotificacionPTA[];
  errores?: string[];
}

// ============================================================================
// GESTOR DE FLUJO DE APROBACIÓN
// ============================================================================

export class GestorFlujoAprobacion {
  /**
   * Envía un PTA al flujo de aprobación
   */
  public enviarAprobacion(
    pta: PTAConAprobacion,
    docenteId: string,
    docenteEmail: string
  ): ResultadoAprobacion {
    // Validar que el PTA esté en estado correcto
    if (pta.estado !== 'construccion' && pta.estado !== 'devuelto-ajustes') {
      return {
        exito: false,
        mensaje: 'El PTA debe estar en estado "construcción" o "devuelto para ajustes"',
        nuevoEstado: pta.estado,
        notificacionesEnviadas: [],
        errores: ['Estado incorrecto para envío']
      };
    }

    // Crear registro de envío
    const registroEnvio: FirmaDigital = {
      id: `firma-${Date.now()}`,
      nivel: NivelAprobacion.NIVEL_1,
      aprobadorId: docenteId,
      aprobadorNombre: pta.docenteNombre,
      aprobadorCargo: 'Docente',
      aprobadorEmail: docenteEmail,
      accion: TipoAccionAprobacion.ENVIAR,
      fecha: new Date().toISOString(),
      timestamp: Date.now(),
      observaciones: 'PTA enviado para aprobación',
      ipAddress: this.obtenerIP(),
      userAgent: this.obtenerUserAgent()
    };

    // Determinar si requiere firmas específicas por área
    const requiereFirmasEspecificas = this.verificarFirmasEspecificas(pta);
    const firmasPendientes = this.calcularFirmasPendientes(pta, NivelAprobacion.NIVEL_1);

    // Actualizar estado del flujo
    pta.estadoFlujo = {
      nivelActual: NivelAprobacion.NIVEL_1,
      ultimaActualizacion: new Date().toISOString(),
      requiereFirmasEspecificas,
      firmasPendientes
    };

    // Agregar firma
    pta.firmas.push(registroEnvio);

    // Crear notificaciones para nivel 1
    const notificaciones = this.crearNotificacionesNivel(
      pta,
      NivelAprobacion.NIVEL_1,
      'envio'
    );

    return {
      exito: true,
      mensaje: 'PTA enviado correctamente al flujo de aprobación',
      nuevoEstado: 'en-aprobacion',
      siguienteNivel: NivelAprobacion.NIVEL_1,
      notificacionesEnviadas: notificaciones
    };
  }

  /**
   * Aprueba un PTA en un nivel específico
   */
  public aprobarPTA(
    pta: PTAConAprobacion,
    nivel: NivelAprobacion,
    aprobadorId: string,
    aprobadorNombre: string,
    aprobadorCargo: string,
    aprobadorEmail: string,
    observaciones?: string,
    componentesRevisados?: ComponentePTA[]
  ): ResultadoAprobacion {
    // Validar que el PTA esté en aprobación
    if (pta.estado !== 'en-aprobacion') {
      return {
        exito: false,
        mensaje: 'El PTA debe estar en estado "en aprobación"',
        nuevoEstado: pta.estado,
        notificacionesEnviadas: [],
        errores: ['Estado incorrecto']
      };
    }

    // Validar que sea el nivel correcto
    if (pta.estadoFlujo.nivelActual !== nivel) {
      return {
        exito: false,
        mensaje: `El PTA está en revisión del nivel ${pta.estadoFlujo.nivelActual}, no del nivel ${nivel}`,
        nuevoEstado: pta.estado,
        notificacionesEnviadas: [],
        errores: ['Nivel incorrecto']
      };
    }

    // Validar permisos del aprobador
    if (!this.validarPermisoAprobacion(aprobadorCargo, nivel)) {
      return {
        exito: false,
        mensaje: 'No tiene permisos para aprobar en este nivel',
        nuevoEstado: pta.estado,
        notificacionesEnviadas: [],
        errores: ['Permisos insuficientes']
      };
    }

    // Crear registro de firma
    const firma: FirmaDigital = {
      id: `firma-${Date.now()}`,
      nivel,
      aprobadorId,
      aprobadorNombre,
      aprobadorCargo,
      aprobadorEmail,
      accion: TipoAccionAprobacion.APROBAR,
      fecha: new Date().toISOString(),
      timestamp: Date.now(),
      observaciones,
      componentesRevisados,
      ipAddress: this.obtenerIP(),
      userAgent: this.obtenerUserAgent()
    };

    pta.firmas.push(firma);

    // Determinar siguiente nivel
    let nuevoEstado: EstadoPTA = 'en-aprobacion';
    let siguienteNivel: NivelAprobacion | undefined;

    if (nivel === NivelAprobacion.NIVEL_3) {
      // Última aprobación - pasar a aprobado
      nuevoEstado = 'aprobado';
      pta.estadoFlujo.nivelActual = null;
      pta.estadoFlujo.firmasPendientes = [];
    } else {
      // Pasar al siguiente nivel
      siguienteNivel = (nivel + 1) as NivelAprobacion;
      pta.estadoFlujo.nivelActual = siguienteNivel;
      pta.estadoFlujo.firmasPendientes = this.calcularFirmasPendientes(pta, siguienteNivel);
    }

    pta.estadoFlujo.ultimaActualizacion = new Date().toISOString();

    // Crear notificaciones
    const notificaciones: NotificacionPTA[] = [];

    if (nuevoEstado === 'aprobado') {
      // Notificar al docente que su PTA fue aprobado
      notificaciones.push(this.crearNotificacion(
        pta.docenteId,
        'aprobacion',
        `PTA ${pta.periodo} aprobado`,
        `Su Plan de Trabajo Académico para el periodo ${pta.periodo} ha sido aprobado por todos los niveles jerárquicos.`,
        pta.id
      ));
    } else if (siguienteNivel) {
      // Notificar al siguiente nivel
      notificaciones.push(...this.crearNotificacionesNivel(pta, siguienteNivel, 'envio'));
    }

    return {
      exito: true,
      mensaje: nivel === NivelAprobacion.NIVEL_3 
        ? 'PTA aprobado completamente' 
        : `PTA aprobado en Nivel ${nivel}, pasando a Nivel ${siguienteNivel}`,
      nuevoEstado,
      siguienteNivel,
      notificacionesEnviadas: notificaciones
    };
  }

  /**
   * Rechaza un PTA y lo devuelve al docente para ajustes
   */
  public rechazarPTA(
    pta: PTAConAprobacion,
    nivel: NivelAprobacion,
    aprobadorId: string,
    aprobadorNombre: string,
    aprobadorCargo: string,
    aprobadorEmail: string,
    observaciones: string
  ): ResultadoAprobacion {
    // Validar que haya observaciones
    if (!observaciones || observaciones.trim().length === 0) {
      return {
        exito: false,
        mensaje: 'Debe proporcionar observaciones para rechazar el PTA',
        nuevoEstado: pta.estado,
        notificacionesEnviadas: [],
        errores: ['Faltan observaciones']
      };
    }

    // Crear registro de rechazo
    const firma: FirmaDigital = {
      id: `firma-${Date.now()}`,
      nivel,
      aprobadorId,
      aprobadorNombre,
      aprobadorCargo,
      aprobadorEmail,
      accion: TipoAccionAprobacion.RECHAZAR,
      fecha: new Date().toISOString(),
      timestamp: Date.now(),
      observaciones,
      ipAddress: this.obtenerIP(),
      userAgent: this.obtenerUserAgent()
    };

    pta.firmas.push(firma);

    // Actualizar estado
    pta.estadoFlujo.nivelActual = null;
    pta.estadoFlujo.ultimaActualizacion = new Date().toISOString();
    pta.estadoFlujo.firmasPendientes = [];

    // Notificar al docente
    const notificacion = this.crearNotificacion(
      pta.docenteId,
      'rechazo',
      `PTA ${pta.periodo} devuelto para ajustes`,
      `Su Plan de Trabajo Académico ha sido devuelto para ajustes por ${aprobadorNombre} (${aprobadorCargo}).\n\nObservaciones:\n${observaciones}`,
      pta.id
    );

    return {
      exito: true,
      mensaje: 'PTA devuelto al docente para ajustes',
      nuevoEstado: 'devuelto-ajustes',
      notificacionesEnviadas: [notificacion]
    };
  }

  /**
   * Verifica si un PTA requiere firmas específicas por área
   */
  private verificarFirmasEspecificas(pta: PlanTrabajoAcademico): boolean {
    // Verificar si tiene actividades de investigación o extensión
    const tieneInvestigacion = pta.actividades.some(a => a.componente === 'investigacion');
    const tieneExtension = pta.actividades.some(a => a.componente === 'extension');
    
    return tieneInvestigacion || tieneExtension;
  }

  /**
   * Calcula las firmas pendientes para un nivel
   */
  private calcularFirmasPendientes(
    pta: PlanTrabajoAcademico,
    nivel: NivelAprobacion
  ): string[] {
    const firmasPendientes: string[] = [];

    // Agregar roles estándar del nivel
    firmasPendientes.push(...ROLES_POR_NIVEL[nivel]);

    // Agregar firmas específicas si es nivel 2 o 3
    if (nivel >= NivelAprobacion.NIVEL_2) {
      if (pta.actividades.some(a => a.componente === 'investigacion')) {
        firmasPendientes.push(...FIRMAS_AREAS_ESPECIFICAS['investigacion']);
      }
      if (pta.actividades.some(a => a.componente === 'extension')) {
        firmasPendientes.push(...FIRMAS_AREAS_ESPECIFICAS['extension']);
      }
    }

    return firmasPendientes;
  }

  /**
   * Valida si un cargo tiene permisos para aprobar en un nivel
   */
  private validarPermisoAprobacion(cargo: string, nivel: NivelAprobacion): boolean {
    const rolesPermitidos = ROLES_POR_NIVEL[nivel];
    
    // Verificar roles estándar
    if (rolesPermitidos.includes(cargo)) {
      return true;
    }

    // Verificar roles específicos por área
    for (const area in FIRMAS_AREAS_ESPECIFICAS) {
      if (FIRMAS_AREAS_ESPECIFICAS[area as keyof typeof FIRMAS_AREAS_ESPECIFICAS].includes(cargo)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Crea notificaciones para un nivel específico
   */
  private crearNotificacionesNivel(
    pta: PlanTrabajoAcademico,
    nivel: NivelAprobacion,
    tipo: 'envio' | 'aprobacion'
  ): NotificacionPTA[] {
    const notificaciones: NotificacionPTA[] = [];
    const roles = ROLES_POR_NIVEL[nivel];

    roles.forEach(rol => {
      notificaciones.push(this.crearNotificacion(
        `usuario-${rol.toLowerCase().replace(/ /g, '-')}`,
        tipo,
        `Nuevo PTA para revisión - ${pta.docenteNombre}`,
        `Tiene un Plan de Trabajo Académico pendiente de revisión del periodo ${pta.periodo} del docente ${pta.docenteNombre}.`,
        pta.id
      ));
    });

    return notificaciones;
  }

  /**
   * Crea una notificación individual
   */
  private crearNotificacion(
    destinatarioId: string,
    tipo: NotificacionPTA['tipo'],
    asunto: string,
    mensaje: string,
    ptaId: string
  ): NotificacionPTA {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      destinatarioId,
      destinatarioEmail: `${destinatarioId}@esap.edu.co`,
      asunto,
      mensaje,
      fechaEnvio: new Date().toISOString(),
      leida: false,
      ptaId
    };
  }

  /**
   * Obtiene la IP del usuario (simulado)
   */
  private obtenerIP(): string {
    return '192.168.1.1'; // En producción, obtener del servidor
  }

  /**
   * Obtiene el User Agent del navegador
   */
  private obtenerUserAgent(): string {
    return typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
  }

  /**
   * Obtiene el historial completo de firmas ordenado cronológicamente
   */
  public obtenerHistorialFirmas(pta: PTAConAprobacion): FirmaDigital[] {
    return [...pta.firmas].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Verifica si un usuario puede aprobar el PTA
   */
  public puedeAprobar(
    pta: PTAConAprobacion,
    usuarioCargo: string
  ): { puede: boolean; razon?: string } {
    if (pta.estado !== 'en-aprobacion') {
      return {
        puede: false,
        razon: 'El PTA no está en estado de aprobación'
      };
    }

    if (!pta.estadoFlujo.nivelActual) {
      return {
        puede: false,
        razon: 'No hay nivel de aprobación activo'
      };
    }

    if (!this.validarPermisoAprobacion(usuarioCargo, pta.estadoFlujo.nivelActual)) {
      return {
        puede: false,
        razon: 'No tiene permisos para aprobar en este nivel'
      };
    }

    return { puede: true };
  }

  /**
   * Genera un resumen del estado de aprobación
   */
  public obtenerResumenAprobacion(pta: PTAConAprobacion): {
    nivel1: { completado: boolean; fecha?: string; aprobador?: string };
    nivel2: { completado: boolean; fecha?: string; aprobador?: string };
    nivel3: { completado: boolean; fecha?: string; aprobador?: string };
    firmasEspecificas: { componente: string; firmado: boolean }[];
  } {
    const firmasAprobacion = pta.firmas.filter(f => f.accion === TipoAccionAprobacion.APROBAR);

    const nivel1 = firmasAprobacion.find(f => f.nivel === NivelAprobacion.NIVEL_1);
    const nivel2 = firmasAprobacion.find(f => f.nivel === NivelAprobacion.NIVEL_2);
    const nivel3 = firmasAprobacion.find(f => f.nivel === NivelAprobacion.NIVEL_3);

    return {
      nivel1: {
        completado: !!nivel1,
        fecha: nivel1?.fecha,
        aprobador: nivel1?.aprobadorNombre
      },
      nivel2: {
        completado: !!nivel2,
        fecha: nivel2?.fecha,
        aprobador: nivel2?.aprobadorNombre
      },
      nivel3: {
        completado: !!nivel3,
        fecha: nivel3?.fecha,
        aprobador: nivel3?.aprobadorNombre
      },
      firmasEspecificas: []
    };
  }
}

// ============================================================================
// TRANSICIONES DE ESTADO
// ============================================================================

/**
 * Diagrama de transiciones permitidas del PTA
 */
export const TRANSICIONES_PERMITIDAS: Record<EstadoPTA, EstadoPTA[]> = {
  'construccion': ['en-aprobacion'],
  'en-aprobacion': ['aprobado', 'devuelto-ajustes'],
  'devuelto-ajustes': ['construccion', 'en-aprobacion'],
  'aprobado': ['en-firme'],
  'en-firme': []  // No se puede modificar
};

/**
 * Verifica si una transición de estado es válida
 */
export function esTransicionValida(estadoActual: EstadoPTA, nuevoEstado: EstadoPTA): boolean {
  return TRANSICIONES_PERMITIDAS[estadoActual]?.includes(nuevoEstado) || false;
}

/**
 * Obtiene las acciones disponibles según el estado actual
 */
export function obtenerAccionesDisponibles(
  pta: PTAConAprobacion,
  usuarioRol: string
): TipoAccionAprobacion[] {
  const acciones: TipoAccionAprobacion[] = [];

  switch (pta.estado) {
    case 'construccion':
    case 'devuelto-ajustes':
      if (usuarioRol === 'Docente') {
        acciones.push(TipoAccionAprobacion.ENVIAR);
      }
      break;

    case 'en-aprobacion':
      if (pta.estadoFlujo.nivelActual) {
        const gestor = new GestorFlujoAprobacion();
        const { puede } = gestor.puedeAprobar(pta, usuarioRol);
        if (puede) {
          acciones.push(TipoAccionAprobacion.APROBAR, TipoAccionAprobacion.RECHAZAR);
        }
      }
      break;

    case 'aprobado':
      // Solo el sistema puede pasar a "en-firme" automáticamente
      break;

    case 'en-firme':
      // No se permiten acciones
      break;
  }

  return acciones;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Crea un PTA con aprobación vacío
 */
export function crearPTAConAprobacion(
  docenteId: string,
  docenteNombre: string,
  periodo: string
): PTAConAprobacion {
  return {
    id: `pta-${Date.now()}`,
    docenteId,
    docenteNombre,
    periodo,
    tipoVinculacion: 'carrera',
    tipoDedicacion: 'tiempo-completo',
    estado: 'construccion',
    configuracion: {
      periodicidad: 'semestral',
      horasTotales: 800,
      horasSemanales: 40,
      semanas: 20
    },
    actividades: [],
    horasTotalesAsignadas: 0,
    distribucion: [],
    fechaCreacion: new Date().toISOString(),
    fechaUltimaModificacion: new Date().toISOString(),
    firmas: [],
    estadoFlujo: {
      nivelActual: null,
      ultimaActualizacion: new Date().toISOString(),
      requiereFirmasEspecificas: false,
      firmasPendientes: []
    },
    notificacionesEnviadas: []
  };
}

/**
 * Obtiene el nombre descriptivo de un nivel
 */
export function obtenerNombreNivel(nivel: NivelAprobacion): string {
  switch (nivel) {
    case NivelAprobacion.NIVEL_1:
      return 'Nivel 1: Dirección Territorial';
    case NivelAprobacion.NIVEL_2:
      return 'Nivel 2: Coordinación Académica';
    case NivelAprobacion.NIVEL_3:
      return 'Nivel 3: Subdirección Nacional Académica';
    default:
      return 'Nivel desconocido';
  }
}

/**
 * Obtiene el color asociado a un nivel
 */
export function obtenerColorNivel(nivel: NivelAprobacion): string {
  switch (nivel) {
    case NivelAprobacion.NIVEL_1:
      return 'bg-blue-500';
    case NivelAprobacion.NIVEL_2:
      return 'bg-purple-500';
    case NivelAprobacion.NIVEL_3:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}
