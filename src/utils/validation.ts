/**
 * ============================================
 * UTILIDADES DE VALIDACIÓN - SISTEMA SIGL
 * ============================================
 * 
 * Funciones reutilizables para validación de formularios
 * en el módulo de Control Interno de Gestión.
 * 
 * CARACTERÍSTICAS:
 * 1. Validaciones tipadas con TypeScript
 * 2. Mensajes de error descriptivos
 * 3. Validaciones síncronas y asíncronas
 * 4. Reutilizables en todos los módulos
 */

// ============ TIPOS ============

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'length' | 'range' | 'custom';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============ VALIDACIONES BÁSICAS ============

/**
 * Valida que un campo no esté vacío
 */
export const validateRequired = (
  value: any,
  fieldName: string,
  customMessage?: string
): ValidationError | null => {
  if (value === null || value === undefined || value === '') {
    return {
      field: fieldName,
      message: customMessage || `El campo ${fieldName} es obligatorio`,
      type: 'required'
    };
  }
  
  // Para arrays
  if (Array.isArray(value) && value.length === 0) {
    return {
      field: fieldName,
      message: customMessage || `Debe seleccionar al menos un ${fieldName}`,
      type: 'required'
    };
  }
  
  // Para strings con espacios
  if (typeof value === 'string' && value.trim() === '') {
    return {
      field: fieldName,
      message: customMessage || `El campo ${fieldName} no puede estar vacío`,
      type: 'required'
    };
  }
  
  return null;
};

/**
 * Valida la longitud mínima de un texto
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): ValidationError | null => {
  if (value && value.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} debe tener al menos ${minLength} caracteres`,
      type: 'length'
    };
  }
  return null;
};

/**
 * Valida la longitud máxima de un texto
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): ValidationError | null => {
  if (value && value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} no puede exceder ${maxLength} caracteres`,
      type: 'length'
    };
  }
  return null;
};

/**
 * Valida formato de email
 */
export const validateEmail = (
  email: string,
  fieldName: string = 'Email'
): ValidationError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email && !emailRegex.test(email)) {
    return {
      field: fieldName,
      message: 'El formato del email no es válido',
      type: 'format'
    };
  }
  
  return null;
};

/**
 * Valida formato de número de identificación colombiano
 */
export const validateIdentificacion = (
  numero: string,
  tipo: 'CC' | 'CE' | 'TI' | 'PA',
  fieldName: string = 'Número de identificación'
): ValidationError | null => {
  if (!numero) {
    return {
      field: fieldName,
      message: 'El número de identificación es obligatorio',
      type: 'required'
    };
  }
  
  // Cédula de Ciudadanía: 6-10 dígitos
  if (tipo === 'CC') {
    if (!/^\d{6,10}$/.test(numero)) {
      return {
        field: fieldName,
        message: 'La cédula debe tener entre 6 y 10 dígitos',
        type: 'format'
      };
    }
  }
  
  // Cédula de Extranjería: formato variable
  if (tipo === 'CE') {
    if (!/^\d{6,10}$/.test(numero)) {
      return {
        field: fieldName,
        message: 'La cédula de extranjería debe tener entre 6 y 10 dígitos',
        type: 'format'
      };
    }
  }
  
  // Tarjeta de Identidad: 10-11 dígitos
  if (tipo === 'TI') {
    if (!/^\d{10,11}$/.test(numero)) {
      return {
        field: fieldName,
        message: 'La tarjeta de identidad debe tener 10 u 11 dígitos',
        type: 'format'
      };
    }
  }
  
  return null;
};

/**
 * Valida que una fecha no sea futura
 */
export const validateNotFutureDate = (
  fecha: string | Date,
  fieldName: string = 'Fecha'
): ValidationError | null => {
  const fechaInput = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (fechaInput > hoy) {
    return {
      field: fieldName,
      message: `${fieldName} no puede ser futura`,
      type: 'range'
    };
  }
  
  return null;
};

/**
 * Valida que una fecha sea futura
 */
export const validateFutureDate = (
  fecha: string | Date,
  fieldName: string = 'Fecha'
): ValidationError | null => {
  const fechaInput = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (fechaInput < hoy) {
    return {
      field: fieldName,
      message: `${fieldName} debe ser una fecha futura`,
      type: 'range'
    };
  }
  
  return null;
};

/**
 * Valida que una fecha esté dentro de un rango
 */
export const validateDateInRange = (
  fecha: string | Date,
  minDate: Date,
  maxDate: Date,
  fieldName: string = 'Fecha'
): ValidationError | null => {
  const fechaInput = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  if (fechaInput < minDate || fechaInput > maxDate) {
    return {
      field: fieldName,
      message: `${fieldName} debe estar entre ${minDate.toLocaleDateString('es-CO')} y ${maxDate.toLocaleDateString('es-CO')}`,
      type: 'range'
    };
  }
  
  return null;
};

/**
 * Valida que la fecha fin sea posterior a la fecha inicio
 */
export const validateDateRange = (
  fechaInicio: string | Date,
  fechaFin: string | Date,
  fieldNameInicio: string = 'Fecha inicio',
  fieldNameFin: string = 'Fecha fin'
): ValidationError | null => {
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
  
  if (fin <= inicio) {
    return {
      field: fieldNameFin,
      message: `${fieldNameFin} debe ser posterior a ${fieldNameInicio}`,
      type: 'range'
    };
  }
  
  return null;
};

/**
 * Valida que un número esté en un rango
 */
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationError | null => {
  if (value < min || value > max) {
    return {
      field: fieldName,
      message: `${fieldName} debe estar entre ${min} y ${max}`,
      type: 'range'
    };
  }
  
  return null;
};

/**
 * Valida formato de código de auditoría
 */
export const validateCodigoAuditoria = (
  codigo: string,
  fieldName: string = 'Código de auditoría'
): ValidationError | null => {
  // Formato esperado: AUD-YYYY-NNN
  const codigoRegex = /^AUD-\d{4}-\d{3,}$/;
  
  if (!codigoRegex.test(codigo)) {
    return {
      field: fieldName,
      message: 'El código debe tener el formato AUD-YYYY-NNN (ej: AUD-2025-001)',
      type: 'format'
    };
  }
  
  return null;
};

/**
 * Valida que un porcentaje esté entre 0 y 100
 */
export const validatePercentage = (
  value: number,
  fieldName: string
): ValidationError | null => {
  return validateNumberRange(value, 0, 100, fieldName);
};

/**
 * Valida que un valor sea único en una lista
 */
export function validateUnique<T>(
  value: T,
  existingValues: T[],
  fieldName: string,
  compareFn?: (a: T, b: T) => boolean
): ValidationError | null {
  const compare = compareFn || ((a, b) => a === b);
  
  if (existingValues.some(existing => compare(existing, value))) {
    return {
      field: fieldName,
      message: `${fieldName} ya existe en el sistema`,
      type: 'custom'
    };
  }
  
  return null;
};

// ============ VALIDACIONES ESPECÍFICAS PARA AUDITORÍAS ============

export interface AuditoriaFormData {
  codigo?: string;
  tipoAuditoria?: 'regular' | 'territorial' | 'especial';
  titulo: string;
  descripcion: string;
  territorial: string;
  auditorLider: string;
  auditorAsignado: string;
  fechaInicio: string;
  fechaFin: string;
  objetivos: string[];
  alcance: string;
  riesgo: 'Alto' | 'Medio' | 'Bajo';
}

/**
 * Valida formulario completo de auditoría
 */
export const validateAuditoriaForm = (
  data: AuditoriaFormData,
  existingCodigos: string[] = []
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Código (opcional en creación, pero debe validarse si existe)
  if (data.codigo) {
    const codigoError = validateCodigoAuditoria(data.codigo);
    if (codigoError) errors.push(codigoError);
    
    const uniqueError = validateUnique(
      data.codigo,
      existingCodigos,
      'Código de auditoría'
    );
    if (uniqueError) errors.push(uniqueError);
  }
  
  // Título
  const tituloRequiredError = validateRequired(data.titulo, 'Título');
  if (tituloRequiredError) {
    errors.push(tituloRequiredError);
  } else {
    const tituloMinError = validateMinLength(data.titulo, 10, 'Título');
    if (tituloMinError) errors.push(tituloMinError);
    
    const tituloMaxError = validateMaxLength(data.titulo, 200, 'Título');
    if (tituloMaxError) errors.push(tituloMaxError);
  }
  
  // Descripción
  const descripcionRequiredError = validateRequired(data.descripcion, 'Descripción');
  if (descripcionRequiredError) {
    errors.push(descripcionRequiredError);
  } else {
    const descripcionMinError = validateMinLength(data.descripcion, 20, 'Descripción');
    if (descripcionMinError) errors.push(descripcionMinError);
    
    const descripcionMaxError = validateMaxLength(data.descripcion, 500, 'Descripción');
    if (descripcionMaxError) errors.push(descripcionMaxError);
  }
  
  // Territorial
  const territorialError = validateRequired(data.territorial, 'Territorial');
  if (territorialError) errors.push(territorialError);
  
  // Auditor Líder
  const auditorLiderError = validateRequired(data.auditorLider, 'Auditor Líder');
  if (auditorLiderError) errors.push(auditorLiderError);
  
  // Auditor Asignado
  const auditorAsignadoError = validateRequired(data.auditorAsignado, 'Auditor Asignado');
  if (auditorAsignadoError) errors.push(auditorAsignadoError);
  
  // Validar que no sea el mismo auditor
  if (data.auditorLider && data.auditorAsignado && data.auditorLider === data.auditorAsignado) {
    errors.push({
      field: 'auditorAsignado',
      message: 'El auditor asignado no puede ser el mismo que el auditor líder',
      type: 'custom'
    });
  }
  
  // Fecha Inicio
  const fechaInicioError = validateRequired(data.fechaInicio, 'Fecha de inicio');
  if (fechaInicioError) {
    errors.push(fechaInicioError);
  }
  
  // Fecha Fin
  const fechaFinError = validateRequired(data.fechaFin, 'Fecha de fin');
  if (fechaFinError) {
    errors.push(fechaFinError);
  } else if (data.fechaInicio) {
    // Validar rango de fechas
    const dateRangeError = validateDateRange(
      data.fechaInicio,
      data.fechaFin,
      'Fecha de inicio',
      'Fecha de fin'
    );
    if (dateRangeError) errors.push(dateRangeError);
  }
  
  // Objetivos
  const objetivosError = validateRequired(data.objetivos, 'Objetivos');
  if (objetivosError) {
    errors.push(objetivosError);
  } else if (data.objetivos.length < 1) {
    errors.push({
      field: 'objetivos',
      message: 'Debe definir al menos un objetivo',
      type: 'required'
    });
  } else {
    // Validar cada objetivo
    data.objetivos.forEach((objetivo, index) => {
      const objetivoError = validateMinLength(
        objetivo,
        10,
        `Objetivo ${index + 1}`
      );
      if (objetivoError) errors.push(objetivoError);
    });
  }
  
  // Alcance
  const alcanceRequiredError = validateRequired(data.alcance, 'Alcance');
  if (alcanceRequiredError) {
    errors.push(alcanceRequiredError);
  } else {
    const alcanceMinError = validateMinLength(data.alcance, 20, 'Alcance');
    if (alcanceMinError) errors.push(alcanceMinError);
  }
  
  // Riesgo
  const riesgoError = validateRequired(data.riesgo, 'Nivel de riesgo');
  if (riesgoError) errors.push(riesgoError);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============ VALIDACIONES PARA NOTAS ============

export interface NotaFormData {
  contenido: string;
  categoria: string;
}

export const validateNotaForm = (data: NotaFormData): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Contenido
  const contenidoError = validateRequired(data.contenido, 'Contenido de la nota');
  if (contenidoError) {
    errors.push(contenidoError);
  } else {
    const minError = validateMinLength(data.contenido, 10, 'Contenido de la nota');
    if (minError) errors.push(minError);
    
    const maxError = validateMaxLength(data.contenido, 1000, 'Contenido de la nota');
    if (maxError) errors.push(maxError);
  }
  
  // Categoría
  const categoriaError = validateRequired(data.categoria, 'Categoría');
  if (categoriaError) errors.push(categoriaError);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============ VALIDACIONES PARA APROBACIONES ============

export interface AprobacionFormData {
  accion: 'aprobar' | 'rechazar' | 'modificacion';
  comentarios: string;
}

export const validateAprobacionForm = (data: AprobacionFormData): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Acción
  const accionError = validateRequired(data.accion, 'Acción');
  if (accionError) errors.push(accionError);
  
  // Comentarios (obligatorios para rechazo y modificación)
  if (data.accion === 'rechazar' || data.accion === 'modificacion') {
    const comentariosError = validateRequired(data.comentarios, 'Comentarios');
    if (comentariosError) {
      errors.push(comentariosError);
    } else {
      const minError = validateMinLength(data.comentarios, 20, 'Comentarios');
      if (minError) errors.push(minError);
    }
  }
  
  // Validar longitud máxima
  if (data.comentarios) {
    const maxError = validateMaxLength(data.comentarios, 1000, 'Comentarios');
    if (maxError) errors.push(maxError);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============ UTILIDADES DE FORMATO ============

/**
 * Obtiene el primer error de un campo específico
 */
export const getFieldError = (
  errors: ValidationError[],
  fieldName: string
): string | null => {
  const error = errors.find(e => e.field === fieldName);
  return error ? error.message : null;
};

/**
 * Verifica si un campo tiene errores
 */
export const hasFieldError = (
  errors: ValidationError[],
  fieldName: string
): boolean => {
  return errors.some(e => e.field === fieldName);
};

/**
 * Obtiene todos los errores de un campo
 */
export const getFieldErrors = (
  errors: ValidationError[],
  fieldName: string
): string[] => {
  return errors
    .filter(e => e.field === fieldName)
    .map(e => e.message);
};