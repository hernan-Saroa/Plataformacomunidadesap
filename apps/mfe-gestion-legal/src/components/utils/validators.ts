/**
 * VALIDADORES COMUNES - GESTIÓN LEGAL
 * Funciones de validación reutilizables
 */

import { toast } from 'sonner';

// ============================================================================
// VALIDACIONES DE TEXTO
// ============================================================================

/**
 * Validar que un campo de texto no esté vacío
 */
export const validarTextoRequerido = (
  valor: string,
  nombreCampo: string = 'Campo'
): boolean => {
  if (!valor.trim()) {
    toast.error('❌ Campo requerido', {
      description: `${nombreCampo} es obligatorio`,
      duration: 3000
    });
    return false;
  }
  return true;
};

/**
 * Validar longitud mínima de texto
 */
export const validarLongitudMinima = (
  valor: string,
  minimo: number,
  nombreCampo: string = 'Campo'
): boolean => {
  if (valor.trim().length < minimo) {
    toast.error('❌ Texto muy corto', {
      description: `${nombreCampo} debe tener al menos ${minimo} caracteres`,
      duration: 3000
    });
    return false;
  }
  return true;
};

/**
 * Validar longitud máxima de texto
 */
export const validarLongitudMaxima = (
  valor: string,
  maximo: number,
  nombreCampo: string = 'Campo'
): boolean => {
  if (valor.length > maximo) {
    toast.error('❌ Texto muy largo', {
      description: `${nombreCampo} debe tener máximo ${maximo} caracteres`,
      duration: 3000
    });
    return false;
  }
  return true;
};

// ============================================================================
// VALIDACIONES DE EMAIL
// ============================================================================

/**
 * Validar formato de email
 */
export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email.trim()) {
    toast.error('⚠️ Email requerido', {
      description: 'Ingresa una dirección de correo',
      duration: 3000
    });
    return false;
  }
  
  if (!regex.test(email)) {
    toast.error('❌ Email inválido', {
      description: 'El formato del email no es válido',
      duration: 3000
    });
    return false;
  }
  
  return true;
};

/**
 * Validar email corporativo ESAP
 */
export const validarEmailESAP = (email: string): boolean => {
  if (!validarEmail(email)) return false;
  
  if (!email.endsWith('@esap.edu.co')) {
    toast.error('❌ Email no corporativo', {
      description: 'Debe usar un email @esap.edu.co',
      duration: 3000
    });
    return false;
  }
  
  return true;
};

// ============================================================================
// VALIDACIONES DE FECHAS
// ============================================================================

/**
 * Validar que una fecha no esté vacía
 */
export const validarFechaRequerida = (
  fecha: Date | string | null | undefined,
  nombreCampo: string = 'Fecha'
): boolean => {
  if (!fecha) {
    toast.error('❌ Fecha requerida', {
      description: `${nombreCampo} es obligatoria`,
      duration: 3000
    });
    return false;
  }
  return true;
};

/**
 * Validar que una fecha sea futura
 */
export const validarFechaFutura = (
  fecha: Date | string,
  nombreCampo: string = 'Fecha'
): boolean => {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (fechaObj < hoy) {
    toast.error('❌ Fecha inválida', {
      description: `${nombreCampo} debe ser posterior a hoy`,
      duration: 3000
    });
    return false;
  }
  
  return true;
};

/**
 * Validar rango de fechas
 */
export const validarRangoFechas = (
  fechaInicio: Date | string,
  fechaFin: Date | string,
  nombreInicio: string = 'Fecha inicial',
  nombreFin: string = 'Fecha final'
): boolean => {
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
  
  if (fin < inicio) {
    toast.error('❌ Rango inválido', {
      description: `${nombreFin} debe ser posterior a ${nombreInicio}`,
      duration: 3000
    });
    return false;
  }
  
  return true;
};

// ============================================================================
// VALIDACIONES DE ARRAYS
// ============================================================================

/**
 * Validar que un array no esté vacío
 */
export const validarArrayNoVacio = <T>(
  array: T[],
  nombreCampo: string = 'Selección'
): boolean => {
  if (array.length === 0) {
    toast.error('⚠️ Sin elementos', {
      description: `Debe seleccionar al menos un elemento en ${nombreCampo}`,
      duration: 3000
    });
    return false;
  }
  return true;
};

/**
 * Validar cantidad mínima de elementos
 */
export const validarCantidadMinima = <T>(
  array: T[],
  minimo: number,
  nombreCampo: string = 'elementos'
): boolean => {
  if (array.length < minimo) {
    toast.error('⚠️ Cantidad insuficiente', {
      description: `Debe seleccionar al menos ${minimo} ${nombreCampo}`,
      duration: 3000
    });
    return false;
  }
  return true;
};

// ============================================================================
// VALIDACIONES DE ARCHIVOS
// ============================================================================

/**
 * Validar tamaño de archivo
 */
export const validarTamañoArchivo = (
  archivo: File,
  maxSizeMB: number = 10
): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (archivo.size > maxSizeBytes) {
    toast.error('📦 Archivo muy grande', {
      description: `El archivo debe pesar menos de ${maxSizeMB}MB`,
      duration: 3000
    });
    return false;
  }
  
  return true;
};

/**
 * Validar extensión de archivo
 */
export const validarExtensionArchivo = (
  archivo: File,
  extensionesPermitidas: string[]
): boolean => {
  const extension = `.${archivo.name.split('.').pop()?.toLowerCase()}`;
  
  if (!extensionesPermitidas.includes(extension)) {
    toast.error('❌ Tipo de archivo no permitido', {
      description: `Permitidos: ${extensionesPermitidas.join(', ')}`,
      duration: 4000
    });
    return false;
  }
  
  return true;
};

/**
 * Validar múltiples archivos
 */
export const validarArchivos = (
  archivos: File[],
  opciones?: {
    maxSize?: number;
    allowedExtensions?: string[];
    maxFiles?: number;
  }
): boolean => {
  const maxSize = opciones?.maxSize || 10;
  const allowedExtensions = opciones?.allowedExtensions || ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
  const maxFiles = opciones?.maxFiles || 20;
  
  // Validar cantidad
  if (archivos.length > maxFiles) {
    toast.error('⚠️ Demasiados archivos', {
      description: `Máximo ${maxFiles} archivos permitidos`,
      duration: 3000
    });
    return false;
  }
  
  // Validar cada archivo
  for (const archivo of archivos) {
    if (!validarTamañoArchivo(archivo, maxSize)) return false;
    if (!validarExtensionArchivo(archivo, allowedExtensions)) return false;
  }
  
  return true;
};

// ============================================================================
// VALIDACIONES DE NÚMEROS
// ============================================================================

/**
 * Validar número positivo
 */
export const validarNumeroPositivo = (
  valor: number,
  nombreCampo: string = 'Valor'
): boolean => {
  if (valor <= 0) {
    toast.error('❌ Valor inválido', {
      description: `${nombreCampo} debe ser mayor a cero`,
      duration: 3000
    });
    return false;
  }
  return true;
};

/**
 * Validar rango numérico
 */
export const validarRangoNumerico = (
  valor: number,
  minimo: number,
  maximo: number,
  nombreCampo: string = 'Valor'
): boolean => {
  if (valor < minimo || valor > maximo) {
    toast.error('❌ Valor fuera de rango', {
      description: `${nombreCampo} debe estar entre ${minimo} y ${maximo}`,
      duration: 3000
    });
    return false;
  }
  return true;
};

// ============================================================================
// VALIDACIONES DE FORMULARIOS
// ============================================================================

/**
 * Validar formulario completo
 * @returns true si todos los campos son válidos
 */
export const validarFormulario = (
  validaciones: Array<{ condicion: boolean; mensaje: string }>
): boolean => {
  for (const validacion of validaciones) {
    if (!validacion.condicion) {
      toast.error('❌ Error de validación', {
        description: validacion.mensaje,
        duration: 3000
      });
      return false;
    }
  }
  return true;
};

/**
 * Validar campos requeridos de un objeto
 */
export const validarCamposRequeridos = (
  objeto: Record<string, any>,
  camposRequeridos: Array<{ campo: string; nombre: string }>
): boolean => {
  for (const { campo, nombre } of camposRequeridos) {
    const valor = objeto[campo];
    
    if (valor === null || valor === undefined || (typeof valor === 'string' && !valor.trim())) {
      toast.error('❌ Campo requerido', {
        description: `${nombre} es obligatorio`,
        duration: 3000
      });
      return false;
    }
  }
  return true;
};

// ============================================================================
// VALIDACIONES ESPECÍFICAS LEGALES
// ============================================================================

/**
 * Validar número de radicado
 */
export const validarRadicado = (radicado: string): boolean => {
  if (!radicado.trim()) {
    toast.error('❌ Radicado requerido', {
      description: 'Debe ingresar el número de radicado',
      duration: 3000
    });
    return false;
  }
  
  // Validar formato básico (ajustar según el formato real)
  const regex = /^[A-Z0-9\-]+$/;
  if (!regex.test(radicado)) {
    toast.error('❌ Formato inválido', {
      description: 'El radicado solo puede contener letras, números y guiones',
      duration: 3000
    });
    return false;
  }
  
  return true;
};

/**
 * Validar cuantía
 */
export const validarCuantia = (cuantia: number | string): boolean => {
  const valor = typeof cuantia === 'string' ? parseFloat(cuantia) : cuantia;
  
  if (isNaN(valor) || valor < 0) {
    toast.error('❌ Cuantía inválida', {
      description: 'La cuantía debe ser un número positivo',
      duration: 3000
    });
    return false;
  }
  
  return true;
};
