/**
 * ============================================
 * VALIDACIONES DE TRANSICIONES DE ESTADO
 * ============================================
 * 
 * REQ-MOD02-001: BLOQUE 3 - Validaciones de Transiciones
 * 
 * Sistema centralizado de validación para transiciones de estado
 * en requerimientos de Órganos de Control.
 * 
 * FUNCIONALIDADES:
 * ✅ B1: Validación RECIBIDO → EN_PREPARACION
 * ✅ B2: Validación EN_PREPARACION → EN_REVISION (requiere respuesta)
 * ✅ B3: Validación EN_REVISION → APROBADA (requiere rol Jefe OJ)
 * ✅ B4: Validación EN_REVISION → EN_PREPARACION (requiere observaciones)
 * ✅ B5: Validación APROBADA → ENVIADA (genera metadata de envío)
 * ✅ B6: Validación ENVIADA → RESUELTA (requiere confirmación)
 * ✅ Validaciones de Drag & Drop en Kanban
 * ✅ Mensajes de error descriptivos
 */

// ==================== TIPOS ====================

export type EstadoRequerimiento =
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RESUELTA';

export type RolUsuario = 'ABOGADO' | 'JEFE_OJ' | 'ADMIN';

export interface Requerimiento {
  id: string;
  estado: EstadoRequerimiento;
  respuestaDraft: string;
  observacionesRevision?: string;
  abogadoAsignado: string;
  fechaEnvio?: Date;
  emailEnvio?: string;
  linkActiveDocument?: string;
  [key: string]: any;
}

export interface TransicionValidacion {
  permitida: boolean;
  mensaje?: string;
  requiereConfirmacion?: boolean;
  mensajeConfirmacion?: string;
}

export interface UsuarioActual {
  nombre: string;
  rol: RolUsuario;
  email: string;
}

// ==================== CONFIGURACIÓN DE TRANSICIONES ====================

/**
 * Matriz de transiciones permitidas
 * Define qué estados pueden cambiar a qué otros estados
 */
const TRANSICIONES_PERMITIDAS: Record<EstadoRequerimiento, EstadoRequerimiento[]> = {
  RECIBIDO: ['EN_PREPARACION'],
  EN_PREPARACION: ['EN_REVISION', 'RECIBIDO'], // Puede volver a RECIBIDO si se descarta
  EN_REVISION: ['APROBADA', 'EN_PREPARACION'], // Aprobar o devolver
  APROBADA: ['ENVIADA', 'EN_REVISION'], // Enviar o volver a revisar
  ENVIADA: ['RESUELTA'],
  RESUELTA: [], // Estado final, no permite transiciones
};

/**
 * Transiciones que requieren rol específico
 */
const TRANSICIONES_CON_ROL: Record<string, RolUsuario[]> = {
  'EN_REVISION->APROBADA': ['JEFE_OJ', 'ADMIN'],
  'ENVIADA->RESUELTA': ['JEFE_OJ', 'ADMIN'],
  'APROBADA->ENVIADA': ['JEFE_OJ', 'ADMIN'], // Solo Jefe OJ puede enviar oficialmente
};

/**
 * Transiciones que requieren confirmación explícita
 */
const TRANSICIONES_CON_CONFIRMACION: Record<string, string> = {
  'ENVIADA->RESUELTA':
    '¿Está seguro de cerrar este requerimiento? Esta acción marcará el caso como resuelto y no permitirá más modificaciones.',
  'RECIBIDO->EN_PREPARACION':
    '¿Desea iniciar el análisis de este requerimiento? Se asignará a su cargo.',
  'APROBADA->ENVIADA':
    '¿Está seguro de enviar la respuesta oficial al órgano de control? Se generará el documento y se enviará por email.',
};

// ==================== FUNCIONES DE VALIDACIÓN POR TRANSICIÓN ====================

/**
 * B1: RECIBIDO → EN_PREPARACION
 * Abogado inicia trabajo
 */
function validarRecibidoAPreparacion(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Cualquier abogado puede iniciar análisis
  return {
    permitida: true,
    requiereConfirmacion: true,
    mensajeConfirmacion: TRANSICIONES_CON_CONFIRMACION['RECIBIDO->EN_PREPARACION'],
  };
}

/**
 * B2: EN_PREPARACION → EN_REVISION
 * Validar que existe respuesta_draft (no vacío)
 */
function validarPreparacionARevision(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Validar que existe respuesta
  if (!requerimiento.respuestaDraft || requerimiento.respuestaDraft.trim().length === 0) {
    return {
      permitida: false,
      mensaje:
        '❌ No puede enviar a revisión sin respuesta. Debe escribir la respuesta en el campo "Respuesta Draft".',
    };
  }

  // Validar longitud mínima (50 caracteres)
  if (requerimiento.respuestaDraft.trim().length < 50) {
    return {
      permitida: false,
      mensaje: `❌ La respuesta debe tener al menos 50 caracteres. Actual: ${requerimiento.respuestaDraft.trim().length}`,
    };
  }

  return {
    permitida: true,
    mensaje: '✅ Enviado a revisión del Jefe de Oficina Jurídica',
  };
}

/**
 * B3: EN_REVISION → APROBADA
 * Solo Jefe OJ puede aprobar
 */
function validarRevisionAAprobada(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Verificar rol
  if (usuario.rol !== 'JEFE_OJ' && usuario.rol !== 'ADMIN') {
    return {
      permitida: false,
      mensaje: '❌ Solo el Jefe de Oficina Jurídica puede aprobar respuestas.',
    };
  }

  // Verificar que existe respuesta
  if (!requerimiento.respuestaDraft || requerimiento.respuestaDraft.trim().length === 0) {
    return {
      permitida: false,
      mensaje: '❌ No hay respuesta para aprobar.',
    };
  }

  return {
    permitida: true,
    mensaje: '✅ Respuesta aprobada exitosamente',
  };
}

/**
 * B4: EN_REVISION → EN_PREPARACION (Devolución)
 * Campo "Observaciones de Revisión" (REQUIRED)
 */
function validarRevisionAPreparacion(
  requerimiento: Requerimiento,
  usuario: UsuarioActual,
  observaciones?: string
): TransicionValidacion {
  // Verificar rol (solo Jefe OJ puede devolver)
  if (usuario.rol !== 'JEFE_OJ' && usuario.rol !== 'ADMIN') {
    return {
      permitida: false,
      mensaje: '❌ Solo el Jefe de Oficina Jurídica puede devolver requerimientos.',
    };
  }

  // Verificar observaciones
  if (!observaciones || observaciones.trim().length === 0) {
    return {
      permitida: false,
      mensaje: '❌ Debe escribir observaciones para devolver el requerimiento al abogado.',
    };
  }

  // Validar longitud mínima de observaciones (20 caracteres)
  if (observaciones.trim().length < 20) {
    return {
      permitida: false,
      mensaje: `❌ Las observaciones deben tener al menos 20 caracteres para ser claras. Actual: ${observaciones.trim().length}`,
    };
  }

  return {
    permitida: true,
    mensaje: '⚠️ Devuelto al abogado para correcciones',
  };
}

/**
 * B5: APROBADA → ENVIADA
 * Genera PDF/DOC, envía email, registra fecha_envio
 */
function validarAprobadaAEnviada(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Verificar rol (solo Jefe OJ puede enviar oficialmente)
  if (usuario.rol !== 'JEFE_OJ' && usuario.rol !== 'ADMIN') {
    return {
      permitida: false,
      mensaje: '❌ Solo el Jefe de Oficina Jurídica puede enviar respuestas oficiales.',
    };
  }

  // Verificar que existe respuesta aprobada
  if (!requerimiento.respuestaDraft || requerimiento.respuestaDraft.trim().length === 0) {
    return {
      permitida: false,
      mensaje: '❌ No hay respuesta aprobada para enviar.',
    };
  }

  return {
    permitida: true,
    requiereConfirmacion: true,
    mensajeConfirmacion: TRANSICIONES_CON_CONFIRMACION['APROBADA->ENVIADA'],
    mensaje: '✅ Respuesta enviada al órgano de control',
  };
}

/**
 * B6: ENVIADA → RESUELTA
 * Solo Jefe OJ puede cerrar, requiere confirmación
 */
function validarEnviadaAResuelta(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Verificar rol
  if (usuario.rol !== 'JEFE_OJ' && usuario.rol !== 'ADMIN') {
    return {
      permitida: false,
      mensaje: '❌ Solo el Jefe de Oficina Jurídica puede cerrar requerimientos.',
    };
  }

  // Verificar que se haya enviado (debe tener fecha de envío)
  if (!requerimiento.fechaEnvio) {
    return {
      permitida: false,
      mensaje: '❌ No se puede cerrar un requerimiento que no ha sido enviado.',
    };
  }

  return {
    permitida: true,
    requiereConfirmacion: true,
    mensajeConfirmacion: TRANSICIONES_CON_CONFIRMACION['ENVIADA->RESUELTA'],
    mensaje: '✅ Requerimiento cerrado exitosamente',
  };
}

// ==================== FUNCIÓN PRINCIPAL DE VALIDACIÓN ====================

/**
 * Valida si una transición de estado es permitida
 * 
 * @param estadoActual - Estado actual del requerimiento
 * @param estadoNuevo - Estado al que se quiere transicionar
 * @param requerimiento - Datos completos del requerimiento
 * @param usuario - Usuario que intenta hacer la transición
 * @param datosAdicionales - Datos adicionales (ej: observaciones)
 * @returns Resultado de validación con mensaje
 */
export function validarTransicion(
  estadoActual: EstadoRequerimiento,
  estadoNuevo: EstadoRequerimiento,
  requerimiento: Requerimiento,
  usuario: UsuarioActual,
  datosAdicionales?: {
    observaciones?: string;
    [key: string]: any;
  }
): TransicionValidacion {
  // 1. Verificar que no sea el mismo estado
  if (estadoActual === estadoNuevo) {
    return {
      permitida: false,
      mensaje: '❌ El requerimiento ya está en este estado.',
    };
  }

  // 2. Verificar que la transición esté permitida
  const transicionesPermitidas = TRANSICIONES_PERMITIDAS[estadoActual] || [];
  if (!transicionesPermitidas.includes(estadoNuevo)) {
    return {
      permitida: false,
      mensaje: `❌ No se puede cambiar de "${estadoActual}" a "${estadoNuevo}". Transición no permitida.`,
    };
  }

  // 3. Verificar si el estado es RESUELTA (estado final)
  if (estadoActual === 'RESUELTA') {
    return {
      permitida: false,
      mensaje: '❌ No se puede modificar un requerimiento resuelto (caso cerrado).',
    };
  }

  // 4. Verificar rol si la transición lo requiere
  const claveTransicion = `${estadoActual}->${estadoNuevo}`;
  const rolesRequeridos = TRANSICIONES_CON_ROL[claveTransicion];
  if (rolesRequeridos && !rolesRequeridos.includes(usuario.rol)) {
    return {
      permitida: false,
      mensaje: `❌ No tiene permisos para realizar esta transición. Se requiere rol: ${rolesRequeridos.join(' o ')}.`,
    };
  }

  // 5. Aplicar validaciones específicas por transición
  let resultado: TransicionValidacion;

  switch (claveTransicion) {
    case 'RECIBIDO->EN_PREPARACION':
      resultado = validarRecibidoAPreparacion(requerimiento, usuario);
      break;

    case 'EN_PREPARACION->EN_REVISION':
      resultado = validarPreparacionARevision(requerimiento, usuario);
      break;

    case 'EN_REVISION->APROBADA':
      resultado = validarRevisionAAprobada(requerimiento, usuario);
      break;

    case 'EN_REVISION->EN_PREPARACION':
      resultado = validarRevisionAPreparacion(
        requerimiento,
        usuario,
        datosAdicionales?.observaciones
      );
      break;

    case 'APROBADA->ENVIADA':
      resultado = validarAprobadaAEnviada(requerimiento, usuario);
      break;

    case 'ENVIADA->RESUELTA':
      resultado = validarEnviadaAResuelta(requerimiento, usuario);
      break;

    default:
      // Transición permitida pero sin validación específica
      resultado = { permitida: true };
  }

  return resultado;
}

// ==================== VALIDACIÓN SIMPLIFICADA POR ROL ====================

/**
 * Validación simplificada que solo verifica el rol
 * Útil para UX rápida en botones
 */
export function validarTransicionSimple(
  estadoActual: EstadoRequerimiento,
  estadoNuevo: EstadoRequerimiento,
  rolUsuario: RolUsuario
): boolean {
  const claveTransicion = `${estadoActual}->${estadoNuevo}`;
  const rolesRequeridos = TRANSICIONES_CON_ROL[claveTransicion];
  
  if (!rolesRequeridos || rolesRequeridos.length === 0) {
    return true; // Sin restricciones de rol
  }
  
  return rolesRequeridos.includes(rolUsuario);
}

// ==================== VALIDACIONES PARA DRAG & DROP ====================

/**
 * Valida si un drag & drop en el Kanban es permitido
 * Versión simplificada para UX inmediata
 */
export function validarDragDrop(
  estadoActual: EstadoRequerimiento,
  estadoNuevo: EstadoRequerimiento,
  usuario: UsuarioActual
): TransicionValidacion {
  // Permitir drag & drop solo para transiciones básicas
  // Transiciones complejas deben hacerse desde el modal de detalle

  const claveTransicion = `${estadoActual}->${estadoNuevo}`;

  // Transiciones permitidas por drag & drop (sin validaciones complejas)
  const dragDropPermitido = [
    'RECIBIDO->EN_PREPARACION', // Iniciar análisis
    'EN_PREPARACION->RECIBIDO', // Cancelar análisis
  ];

  if (!dragDropPermitido.includes(claveTransicion)) {
    return {
      permitida: false,
      mensaje:
        '⚠️ Esta transición requiere validaciones. Use el botón "Ver Detalles" para cambiar el estado.',
    };
  }

  return { permitida: true };
}

// ==================== HELPER: GENERAR METADATA DE ENVÍO ====================

/**
 * Genera metadata cuando se envía una respuesta (APROBADA → ENVIADA)
 */
export function generarMetadataEnvio(
  requerimiento: Requerimiento,
  usuario: UsuarioActual
): {
  fechaEnvio: Date;
  emailEnvio: string;
  linkActiveDocument: string;
  usuarioEnvio: string;
} {
  const fechaEnvio = new Date();
  const timestamp = Date.now();

  return {
    fechaEnvio,
    emailEnvio: usuario.email || 'oficialjuridica@esap.edu.co',
    linkActiveDocument: `#documento-${requerimiento.id}-${timestamp}`, // Mock - en producción sería URL real
    usuarioEnvio: usuario.nombre,
  };
}

// ==================== HELPER: GENERAR ENTRADA DE HISTORIAL ====================

/**
 * Genera entrada de historial para cada transición
 */
export function generarEntradaHistorial(
  estadoAnterior: EstadoRequerimiento,
  estadoNuevo: EstadoRequerimiento,
  usuario: UsuarioActual,
  detalles?: string
): {
  id: string;
  fecha: Date;
  accion: string;
  usuario: string;
  estadoAnterior: EstadoRequerimiento;
  estadoNuevo: EstadoRequerimiento;
  detalles?: string;
} {
  // Mapeo de acciones según transición
  const mapaAcciones: Record<string, string> = {
    'RECIBIDO->EN_PREPARACION': 'Análisis Iniciado',
    'EN_PREPARACION->EN_REVISION': 'Enviado a Revisión',
    'EN_REVISION->APROBADA': 'Respuesta Aprobada',
    'EN_REVISION->EN_PREPARACION': 'Devuelto para Correcciones',
    'APROBADA->ENVIADA': 'Respuesta Enviada',
    'ENVIADA->RESUELTA': 'Requerimiento Cerrado',
  };

  const claveTransicion = `${estadoAnterior}->${estadoNuevo}`;
  const accion = mapaAcciones[claveTransicion] || `Cambio de Estado: ${estadoAnterior} → ${estadoNuevo}`;

  return {
    id: `H-${Date.now()}`,
    fecha: new Date(),
    accion,
    usuario: usuario.nombre,
    estadoAnterior,
    estadoNuevo,
    detalles,
  };
}

// ==================== HELPER: OBTENER PRÓXIMAS ACCIONES ====================

/**
 * Obtiene las acciones disponibles para un estado dado
 * Útil para mostrar botones en UI
 */
export function obtenerAccionesDisponibles(
  estado: EstadoRequerimiento,
  usuario: UsuarioActual
): Array<{
  estadoDestino: EstadoRequerimiento;
  label: string;
  icono: string;
  color: string;
  requiereRol?: RolUsuario[];
}> {
  const acciones: Array<{
    estadoDestino: EstadoRequerimiento;
    label: string;
    icono: string;
    color: string;
    requiereRol?: RolUsuario[];
  }> = [];

  switch (estado) {
    case 'RECIBIDO':
      acciones.push({
        estadoDestino: 'EN_PREPARACION',
        label: 'Iniciar Análisis',
        icono: 'PlayCircle',
        color: 'blue',
      });
      break;

    case 'EN_PREPARACION':
      acciones.push({
        estadoDestino: 'EN_REVISION',
        label: 'Enviar a Revisión',
        icono: 'ArrowRight',
        color: 'purple',
      });
      break;

    case 'EN_REVISION':
      acciones.push({
        estadoDestino: 'APROBADA',
        label: 'Aprobar',
        icono: 'CheckCheck',
        color: 'green',
        requiereRol: ['JEFE_OJ', 'ADMIN'],
      });
      acciones.push({
        estadoDestino: 'EN_PREPARACION',
        label: 'Devolver',
        icono: 'XCircle',
        color: 'orange',
        requiereRol: ['JEFE_OJ', 'ADMIN'],
      });
      break;

    case 'APROBADA':
      acciones.push({
        estadoDestino: 'ENVIADA',
        label: 'Enviar Respuesta',
        icono: 'Send',
        color: 'green',
        requiereRol: ['JEFE_OJ', 'ADMIN'],
      });
      break;

    case 'ENVIADA':
      acciones.push({
        estadoDestino: 'RESUELTA',
        label: 'Marcar como Resuelta',
        icono: 'CheckCircle',
        color: 'gray',
        requiereRol: ['JEFE_OJ', 'ADMIN'],
      });
      break;

    case 'RESUELTA':
      // Estado final, no hay acciones
      break;
  }

  return acciones;
}

// ==================== HELPER: VERIFICAR PERMISOS ====================

/**
 * Verifica si un usuario tiene permisos para una acción específica
 */
export function tienePermiso(
  accion: string,
  usuario: UsuarioActual,
  rolesRequeridos?: RolUsuario[]
): boolean {
  if (!rolesRequeridos || rolesRequeridos.length === 0) {
    return true; // Sin restricciones de rol
  }

  return rolesRequeridos.includes(usuario.rol);
}

// ==================== EXPORTACIONES ADICIONALES ====================

/**
 * Obtiene el nombre legible de un estado
 */
export function obtenerNombreEstado(estado: EstadoRequerimiento): string {
  const nombres: Record<EstadoRequerimiento, string> = {
    RECIBIDO: 'Recibido',
    EN_PREPARACION: 'En Análisis',
    EN_REVISION: 'En Revisión',
    APROBADA: 'Aprobada',
    ENVIADA: 'Enviada',
    RESUELTA: 'Resuelta',
  };

  return nombres[estado] || estado;
}

/**
 * Verifica si un estado es final (no permite más transiciones)
 */
export function esEstadoFinal(estado: EstadoRequerimiento): boolean {
  return estado === 'RESUELTA';
}

/**
 * Verifica si un estado permite edición
 */
export function permiteEdicion(estado: EstadoRequerimiento): boolean {
  return !['ENVIADA', 'RESUELTA'].includes(estado);
}