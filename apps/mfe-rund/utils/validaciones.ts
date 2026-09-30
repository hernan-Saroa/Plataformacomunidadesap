/**
 * ============================================
 * UTILIDADES DE VALIDACIÓN - MÓDULO GESTIÓN LEGAL
 * ============================================
 * 
 * Validaciones de negocio según especificaciones SIGL
 * Referencia: ESPECIFICACION_REQUERIMIENTOS_COMPLETA_11_MODULOS.md
 * 
 * Reglas de Negocio Implementadas:
 * - RN-002: Demandado DEBE incluir ESAP
 * - RN-003: Fecha Notificación ≤ TODAY()
 * - RN-004: Expediente Único por Combinación
 * - RN-005: Abogado DEBE ser ACTIVO + ABOGADO
 * - RN-009: Plazo NUNCA puede ser 0 o negativo
 */

// ============================================
// TIPOS
// ============================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  details?: any;
}

export interface Expediente {
  id?: string;
  demandante: string;
  demandado: string;
  fechaNotificacion: Date | string;
  [key: string]: any;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  status: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
}

// ============================================
// RN-002: VALIDAR DEMANDADO INCLUYE ESAP
// ============================================

/**
 * Valida que el demandado incluya "ESAP" en su nombre
 * 
 * RN-002: Demandado DEBE incluir ESAP
 * ├─ Si demandado = "" → Error
 * ├─ Si demandado no contiene "ESAP": Error
 * ├─ Excepción: ABOGADO_EXTERNO puede demandado ≠ ESAP
 * └─ Auditoría si excepción usada
 * 
 * @param demandado - Nombre del demandado
 * @param rolUsuario - Rol del usuario que crea el expediente
 * @returns Resultado de validación
 */
export function validarDemandadoIncluyeESAP(
  demandado: string,
  rolUsuario: string = 'ABOGADO'
): ValidationResult {
  // Validar campo no vacío
  if (!demandado || demandado.trim() === '') {
    return {
      isValid: false,
      error: 'El demandado es obligatorio',
    };
  }

  // Limpiar y normalizar
  const demandadoNormalizado = demandado.trim().toUpperCase();

  // Verificar si contiene "ESAP"
  const contieneESAP = demandadoNormalizado.includes('ESAP');

  if (!contieneESAP) {
    // Excepción para roles privilegiados
    if (rolUsuario === 'JEFE_OJ' || rolUsuario === 'ABOGADO_EXTERNO') {
      return {
        isValid: true,
        warning: 'El demandado no incluye "ESAP". Esta excepción será registrada en auditoría.',
        details: {
          requiereAuditoria: true,
          motivoExcepcion: `Usuario con rol ${rolUsuario} puede crear expedientes sin ESAP como demandado`,
        },
      };
    }

    // Error para usuarios normales
    return {
      isValid: false,
      error: 'El demandado debe incluir "ESAP". Si este no es el caso, contacte al Jefe de Oficina Jurídica.',
    };
  }

  // Validación exitosa
  return {
    isValid: true,
  };
}

/**
 * Valida variaciones comunes del nombre ESAP
 * 
 * @param demandado - Nombre del demandado
 * @returns true si es una variación válida de ESAP
 */
export function esVariacionValidaESAP(demandado: string): boolean {
  const demandadoNormalizado = demandado.trim().toUpperCase();
  
  const variacionesValidas = [
    'ESAP',
    'E.S.A.P',
    'E.S.A.P.',
    'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA',
    'ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA',
    'ESAP - ',
    'ESAP/',
  ];

  return variacionesValidas.some(variacion => 
    demandadoNormalizado.includes(variacion)
  );
}

// ============================================
// RN-003: VALIDAR FECHA NOTIFICACIÓN
// ============================================

/**
 * Valida que la fecha de notificación sea válida
 * 
 * RN-003: Fecha Notificación ≤ TODAY()
 * ├─ Si > TODAY(): Error "Fecha no puede ser futura"
 * └─ Sistema valida en cliente y servidor
 * 
 * Restricciones adicionales:
 * - No puede ser más de 2 años atrás (prevención de datos antiguos)
 * - No puede ser anterior al año 2000 (ESAP fundada en 1958, pero digital desde 2000)
 * 
 * @param fechaNotificacion - Fecha de notificación
 * @returns Resultado de validación
 */
export function validarFechaNotificacion(
  fechaNotificacion: Date | string
): ValidationResult {
  // Convertir a Date si es string
  const fecha = typeof fechaNotificacion === 'string' 
    ? new Date(fechaNotificacion) 
    : fechaNotificacion;

  // Validar que sea una fecha válida
  if (isNaN(fecha.getTime())) {
    return {
      isValid: false,
      error: 'La fecha de notificación no es válida',
    };
  }

  // Obtener fecha actual (sin horas)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Normalizar fecha de notificación (sin horas)
  const fechaNormalizada = new Date(fecha);
  fechaNormalizada.setHours(0, 0, 0, 0);

  // RN-003: No puede ser futura
  if (fechaNormalizada > hoy) {
    return {
      isValid: false,
      error: 'La fecha de notificación no puede ser futura',
      details: {
        fechaIngresada: fechaNormalizada.toISOString(),
        fechaMaxima: hoy.toISOString(),
      },
    };
  }

  // Restricción: No más de 2 años atrás
  const dosAñosAtras = new Date();
  dosAñosAtras.setFullYear(dosAñosAtras.getFullYear() - 2);
  dosAñosAtras.setHours(0, 0, 0, 0);

  if (fechaNormalizada < dosAñosAtras) {
    return {
      isValid: false,
      error: 'La fecha de notificación no puede ser mayor a 2 años atrás',
      details: {
        fechaIngresada: fechaNormalizada.toISOString(),
        fechaMinima: dosAñosAtras.toISOString(),
      },
    };
  }

  // Restricción: No antes del año 2000
  const año2000 = new Date('2000-01-01');
  año2000.setHours(0, 0, 0, 0);

  if (fechaNormalizada < año2000) {
    return {
      isValid: false,
      error: 'La fecha de notificación debe ser posterior al año 2000',
      warning: 'Si necesita ingresar un expediente anterior, contacte al administrador del sistema.',
    };
  }

  // Validación exitosa
  return {
    isValid: true,
  };
}

/**
 * Valida que la fecha de demanda sea coherente con la fecha de notificación
 * 
 * @param fechaNotificacion - Fecha de notificación
 * @param fechaDemanda - Fecha de presentación de demanda
 * @returns Resultado de validación
 */
export function validarFechaDemandaCoherente(
  fechaNotificacion: Date | string,
  fechaDemanda: Date | string
): ValidationResult {
  const fechaNotif = typeof fechaNotificacion === 'string' 
    ? new Date(fechaNotificacion) 
    : fechaNotificacion;
    
  const fechaDem = typeof fechaDemanda === 'string' 
    ? new Date(fechaDemanda) 
    : fechaDemanda;

  // Validar fechas válidas
  if (isNaN(fechaNotif.getTime()) || isNaN(fechaDem.getTime())) {
    return {
      isValid: false,
      error: 'Las fechas no son válidas',
    };
  }

  // La fecha de demanda puede ser antes, igual o después de la notificación
  // Solo validamos que no sea muy antigua (más de 5 años)
  const cincoAñosAtras = new Date();
  cincoAñosAtras.setFullYear(cincoAñosAtras.getFullYear() - 5);

  if (fechaDem < cincoAñosAtras) {
    return {
      isValid: false,
      error: 'La fecha de demanda no puede ser mayor a 5 años atrás',
    };
  }

  // No puede ser futura
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaDemNormalizada = new Date(fechaDem);
  fechaDemNormalizada.setHours(0, 0, 0, 0);

  if (fechaDemNormalizada > hoy) {
    return {
      isValid: false,
      error: 'La fecha de demanda no puede ser futura',
    };
  }

  return {
    isValid: true,
  };
}

// ============================================
// RN-004: DETECTAR EXPEDIENTES DUPLICADOS
// ============================================

/**
 * Verifica si un expediente es potencialmente duplicado
 * 
 * RN-004: Expediente Único por Combinación
 * ├─ (demandante, demandado, fecha_notificación) = UNIQUE
 * ├─ Si duplicado: Error con opción [VER EXISTENTE]
 * └─ Tolerance: ±1 día (por si hay 2 notificaciones misma demanda)
 * 
 * @param expediente - Expediente a verificar
 * @param expedientesExistentes - Lista de expedientes en BD
 * @returns Resultado de validación con expedientes duplicados encontrados
 */
export function detectarExpedienteDuplicado(
  expediente: Expediente,
  expedientesExistentes: Expediente[]
): ValidationResult {
  // Normalizar datos del expediente a verificar
  const demandanteNorm = expediente.demandante.trim().toUpperCase();
  const demandadoNorm = expediente.demandado.trim().toUpperCase();
  const fechaNotif = typeof expediente.fechaNotificacion === 'string'
    ? new Date(expediente.fechaNotificacion)
    : expediente.fechaNotificacion;
  
  fechaNotif.setHours(0, 0, 0, 0);

  // Calcular rango de fechas (±1 día)
  const fechaMin = new Date(fechaNotif);
  fechaMin.setDate(fechaMin.getDate() - 1);
  
  const fechaMax = new Date(fechaNotif);
  fechaMax.setDate(fechaMax.getDate() + 1);

  // Buscar duplicados
  const duplicados = expedientesExistentes.filter(exp => {
    // Normalizar datos del expediente existente
    const expDemandanteNorm = exp.demandante.trim().toUpperCase();
    const expDemandadoNorm = exp.demandado.trim().toUpperCase();
    const expFechaNotif = typeof exp.fechaNotificacion === 'string'
      ? new Date(exp.fechaNotificacion)
      : exp.fechaNotificacion;
    
    expFechaNotif.setHours(0, 0, 0, 0);

    // Verificar coincidencia de demandante (similitud alta)
    const demandanteCoincide = calcularSimilitud(demandanteNorm, expDemandanteNorm) > 0.8;
    
    // Verificar coincidencia de demandado (similitud alta)
    const demandadoCoincide = calcularSimilitud(demandadoNorm, expDemandadoNorm) > 0.8;
    
    // Verificar fecha en rango ±1 día
    const fechaEnRango = expFechaNotif >= fechaMin && expFechaNotif <= fechaMax;

    return demandanteCoincide && demandadoCoincide && fechaEnRango;
  });

  // Si hay duplicados
  if (duplicados.length > 0) {
    return {
      isValid: false,
      error: `Ya existe${duplicados.length > 1 ? 'n' : ''} ${duplicados.length} expediente${duplicados.length > 1 ? 's' : ''} similar${duplicados.length > 1 ? 'es' : ''}`,
      details: {
        duplicados: duplicados.map(dup => ({
          id: dup.id,
          demandante: dup.demandante,
          demandado: dup.demandado,
          fechaNotificacion: dup.fechaNotificacion,
        })),
        mensaje: duplicados.length === 1
          ? `Expediente existente: ${duplicados[0].id}`
          : `${duplicados.length} expedientes similares encontrados`,
      },
    };
  }

  // No hay duplicados
  return {
    isValid: true,
  };
}

/**
 * Calcula la similitud entre dos strings usando el algoritmo de Levenshtein
 * 
 * @param str1 - Primer string
 * @param str2 - Segundo string
 * @returns Valor entre 0 y 1 (1 = idéntico, 0 = completamente diferente)
 */
function calcularSimilitud(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Si uno está vacío
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Matriz de distancias
  const matrix: number[][] = [];

  // Inicializar primera fila y columna
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calcular distancia de Levenshtein
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // Eliminación
        matrix[i][j - 1] + 1,     // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      );
    }
  }

  // Convertir distancia a similitud (0-1)
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  const similarity = 1 - (distance / maxLen);

  return similarity;
}

// ============================================
// RN-005: VALIDAR ABOGADO ACTIVO
// ============================================

/**
 * Valida que el abogado asignado esté activo y tenga el rol correcto
 * 
 * RN-005: Abogado DEBE ser ACTIVO + ABOGADO
 * ├─ Validación: usuario.status = 'ACTIVO'
 * ├─ Validación: usuario.rol = 'ABOGADO'
 * └─ Si no: Error "Abogado no disponible"
 * 
 * @param abogadoId - ID del abogado
 * @param usuarios - Lista de usuarios (o función para obtener usuario)
 * @returns Resultado de validación
 */
export async function validarAbogadoActivo(
  abogadoId: string,
  usuarios: Usuario[] | ((id: string) => Promise<Usuario | null>)
): Promise<ValidationResult> {
  // Obtener usuario
  let abogado: Usuario | null = null;

  if (Array.isArray(usuarios)) {
    abogado = usuarios.find(u => u.id === abogadoId) || null;
  } else {
    abogado = await usuarios(abogadoId);
  }

  // Verificar que existe
  if (!abogado) {
    return {
      isValid: false,
      error: 'El abogado seleccionado no existe en el sistema',
    };
  }

  // RN-005: Verificar que está activo
  if (abogado.status !== 'ACTIVO') {
    return {
      isValid: false,
      error: `El abogado "${abogado.nombre}" no está activo (Estado: ${abogado.status})`,
      details: {
        abogadoId: abogado.id,
        nombre: abogado.nombre,
        status: abogado.status,
      },
    };
  }

  // RN-005: Verificar que tiene rol de abogado
  const rolesValidos = ['ABOGADO', 'JEFE_OJ', 'ABOGADO_SENIOR'];
  
  if (!rolesValidos.includes(abogado.rol)) {
    return {
      isValid: false,
      error: `El usuario "${abogado.nombre}" no tiene rol de abogado (Rol: ${abogado.rol})`,
      details: {
        abogadoId: abogado.id,
        nombre: abogado.nombre,
        rol: abogado.rol,
        rolesValidos,
      },
    };
  }

  // Validación exitosa
  return {
    isValid: true,
    details: {
      abogadoId: abogado.id,
      nombre: abogado.nombre,
      rol: abogado.rol,
      status: abogado.status,
    },
  };
}

/**
 * Valida que el abogado no tenga más de X expedientes activos asignados
 * 
 * Restricción de carga de trabajo:
 * - ABOGADO: máximo 50 expedientes activos
 * - JEFE_OJ: máximo 30 expedientes activos (tiene otras responsabilidades)
 * - ABOGADO_SENIOR: máximo 70 expedientes activos
 * 
 * @param abogadoId - ID del abogado
 * @param expedientesActivos - Cantidad de expedientes activos del abogado
 * @param rolAbogado - Rol del abogado
 * @returns Resultado de validación
 */
export function validarCargaTrabajoAbogado(
  abogadoId: string,
  expedientesActivos: number,
  rolAbogado: string
): ValidationResult {
  const limites: Record<string, number> = {
    ABOGADO: 50,
    JEFE_OJ: 30,
    ABOGADO_SENIOR: 70,
  };

  const limite = limites[rolAbogado] || 50;

  if (expedientesActivos >= limite) {
    return {
      isValid: false,
      error: `El abogado tiene ${expedientesActivos} expedientes activos (límite: ${limite})`,
      warning: 'Considere asignar a otro abogado con menor carga de trabajo.',
      details: {
        abogadoId,
        expedientesActivos,
        limite,
        porcentajeCarga: Math.round((expedientesActivos / limite) * 100),
      },
    };
  }

  // Warning si está cerca del límite (>80%)
  if (expedientesActivos > limite * 0.8) {
    return {
      isValid: true,
      warning: `El abogado tiene ${expedientesActivos} expedientes activos (${Math.round((expedientesActivos / limite) * 100)}% del límite)`,
      details: {
        abogadoId,
        expedientesActivos,
        limite,
        porcentajeCarga: Math.round((expedientesActivos / limite) * 100),
      },
    };
  }

  return {
    isValid: true,
    details: {
      abogadoId,
      expedientesActivos,
      limite,
      porcentajeCarga: Math.round((expedientesActivos / limite) * 100),
    },
  };
}

// ============================================
// RN-009: VALIDAR PLAZO
// ============================================

/**
 * Valida que el plazo sea válido
 * 
 * RN-009: Plazo NUNCA puede ser 0 o negativo
 * ├─ Si usuario intenta: Error "Plazo debe ser > 0 días"
 * └─ Sistema rechaza
 * 
 * @param plazo - Plazo en días
 * @returns Resultado de validación
 */
export function validarPlazo(plazo: number | string): ValidationResult {
  const plazoNumerico = typeof plazo === 'string' ? parseInt(plazo) : plazo;

  // Validar que sea número
  if (isNaN(plazoNumerico)) {
    return {
      isValid: false,
      error: 'El plazo debe ser un número válido',
    };
  }

  // RN-009: No puede ser 0 o negativo
  if (plazoNumerico <= 0) {
    return {
      isValid: false,
      error: 'El plazo debe ser mayor a 0 días',
    };
  }

  // Warning si es muy largo (>365 días = 1 año)
  if (plazoNumerico > 365) {
    return {
      isValid: true,
      warning: `El plazo de ${plazoNumerico} días es muy extenso (más de 1 año). Verifique que sea correcto.`,
    };
  }

  // Warning si es muy corto (<5 días)
  if (plazoNumerico < 5) {
    return {
      isValid: true,
      warning: `El plazo de ${plazoNumerico} días es muy breve. Verifique que sea correcto.`,
    };
  }

  return {
    isValid: true,
  };
}

// ============================================
// VALIDACIONES COMBINADAS
// ============================================

/**
 * Valida todos los datos de un expediente antes de crear/actualizar
 * 
 * Ejecuta TODAS las validaciones en orden:
 * 1. Demandado incluye ESAP
 * 2. Fecha notificación válida
 * 3. Fecha demanda coherente
 * 4. Abogado activo
 * 5. Plazo válido
 * 6. Duplicados (opcional)
 * 
 * @param data - Datos del expediente
 * @param options - Opciones de validación
 * @returns Resultado consolidado de validación
 */
export async function validarExpedienteCompleto(
  data: {
    demandante: string;
    demandado: string;
    fechaNotificacion: Date | string;
    fechaDemandaPresentada: Date | string;
    abogadoId: string;
    plazo: number;
    rolUsuario?: string;
  },
  options: {
    usuarios: Usuario[] | ((id: string) => Promise<Usuario | null>);
    expedientesExistentes?: Expediente[];
    verificarDuplicados?: boolean;
  }
): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  details?: any;
}> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const details: any = {};

  // 1. Validar demandado incluye ESAP
  const validacionDemandado = validarDemandadoIncluyeESAP(
    data.demandado,
    data.rolUsuario
  );
  
  if (!validacionDemandado.isValid) {
    errors.demandado = validacionDemandado.error!;
  } else if (validacionDemandado.warning) {
    warnings.demandado = validacionDemandado.warning;
    details.demandado = validacionDemandado.details;
  }

  // 2. Validar fecha notificación
  const validacionFecha = validarFechaNotificacion(data.fechaNotificacion);
  
  if (!validacionFecha.isValid) {
    errors.fechaNotificacion = validacionFecha.error!;
  }

  // 3. Validar fecha demanda coherente
  const validacionFechaDemanda = validarFechaDemandaCoherente(
    data.fechaNotificacion,
    data.fechaDemandaPresentada
  );
  
  if (!validacionFechaDemanda.isValid) {
    errors.fechaDemandaPresentada = validacionFechaDemanda.error!;
  }

  // 4. Validar abogado activo
  const validacionAbogado = await validarAbogadoActivo(
    data.abogadoId,
    options.usuarios
  );
  
  if (!validacionAbogado.isValid) {
    errors.abogadoId = validacionAbogado.error!;
  } else {
    details.abogado = validacionAbogado.details;
  }

  // 5. Validar plazo
  const validacionPlazo = validarPlazo(data.plazo);
  
  if (!validacionPlazo.isValid) {
    errors.plazo = validacionPlazo.error!;
  } else if (validacionPlazo.warning) {
    warnings.plazo = validacionPlazo.warning;
  }

  // 6. Verificar duplicados (opcional)
  if (options.verificarDuplicados && options.expedientesExistentes) {
    const validacionDuplicado = detectarExpedienteDuplicado(
      {
        demandante: data.demandante,
        demandado: data.demandado,
        fechaNotificacion: data.fechaNotificacion,
      },
      options.expedientesExistentes
    );
    
    if (!validacionDuplicado.isValid) {
      errors.duplicado = validacionDuplicado.error!;
      details.duplicados = validacionDuplicado.details;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    details,
  };
}

// ============================================
// EXPORTS PARA TESTING
// ============================================

export const __testing__ = {
  calcularSimilitud,
  esVariacionValidaESAP,
};
