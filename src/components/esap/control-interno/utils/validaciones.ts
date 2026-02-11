/**
 * UTILIDADES DE VALIDACIÓN - MÓDULO CONTROL INTERNO
 * 
 * Sistema centralizado de validaciones para todos los componentes del módulo.
 * Incluye validaciones para listas de chequeo, informes de ley, planes de mejoramiento,
 * auditorías, etc.
 */

import { toast } from 'sonner@2.0.3';

// ==================== TIPOS ====================

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  advertencias?: string[];
}

export interface CampoRequerido {
  nombre: string;
  valor: any;
  mensaje?: string;
}

// ==================== VALIDACIONES GENERALES ====================

/**
 * Valida que un campo no esté vacío
 */
export function validarCampoRequerido(
  valor: any,
  nombreCampo: string,
  mensajeCustom?: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  if (valor === undefined || valor === null || valor === '') {
    errores.push(mensajeCustom || `El campo "${nombreCampo}" es requerido`);
  }
  
  if (typeof valor === 'string' && valor.trim() === '') {
    errores.push(mensajeCustom || `El campo "${nombreCampo}" no puede estar vacío`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida múltiples campos requeridos
 */
export function validarCamposRequeridos(campos: CampoRequerido[]): ResultadoValidacion {
  const errores: string[] = [];
  
  campos.forEach(campo => {
    const resultado = validarCampoRequerido(campo.valor, campo.nombre, campo.mensaje);
    if (!resultado.valido) {
      errores.push(...resultado.errores);
    }
  });
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida longitud mínima de texto
 */
export function validarLongitudMinima(
  texto: string,
  longitudMinima: number,
  nombreCampo: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!texto || texto.trim().length < longitudMinima) {
    errores.push(`El campo "${nombreCampo}" debe tener al menos ${longitudMinima} caracteres`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida longitud máxima de texto
 */
export function validarLongitudMaxima(
  texto: string,
  longitudMaxima: number,
  nombreCampo: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  if (texto && texto.length > longitudMaxima) {
    errores.push(`El campo "${nombreCampo}" no puede exceder ${longitudMaxima} caracteres`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida formato de email
 */
export function validarEmail(email: string): ResultadoValidacion {
  const errores: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    errores.push('El formato del email no es válido');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida rango de fechas
 */
export function validarRangoFechas(
  fechaInicio: string,
  fechaFin: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  if (inicio > fin) {
    errores.push('La fecha de inicio no puede ser posterior a la fecha de fin');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida que una fecha no sea futura
 */
export function validarFechaNoPosterior(fecha: string): ResultadoValidacion {
  const errores: string[] = [];
  const fechaValidar = new Date(fecha);
  const hoy = new Date();
  
  if (fechaValidar > hoy) {
    errores.push('La fecha no puede ser posterior a hoy');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// ==================== VALIDACIONES ESPECÍFICAS DE LISTAS DE CHEQUEO ====================

export interface ListaChequeoValidacion {
  nombre: string;
  proceso: string;
  categoria: string;
  secciones: any[];
}

/**
 * Valida una lista de chequeo completa
 */
export function validarListaChequeo(lista: ListaChequeoValidacion): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  // Validar información general
  const camposRequeridos = validarCamposRequeridos([
    { nombre: 'Nombre', valor: lista.nombre },
    { nombre: 'Proceso', valor: lista.proceso },
    { nombre: 'Categoría', valor: lista.categoria }
  ]);
  
  if (!camposRequeridos.valido) {
    errores.push(...camposRequeridos.errores);
  }
  
  // Validar que tenga al menos una sección
  if (!lista.secciones || lista.secciones.length === 0) {
    errores.push('La lista debe tener al menos una sección');
  }
  
  // Validar cada sección
  let totalItems = 0;
  lista.secciones?.forEach((seccion, index) => {
    if (!seccion.nombre || seccion.nombre.trim() === '') {
      errores.push(`La sección ${index + 1} debe tener un nombre`);
    }
    
    if (!seccion.items || seccion.items.length === 0) {
      advertencias.push(`La sección "${seccion.nombre}" no tiene ítems`);
    } else {
      totalItems += seccion.items.length;
    }
    
    // Validar cada ítem
    seccion.items?.forEach((item: any, itemIndex: number) => {
      if (!item.criterio || item.criterio.trim() === '') {
        errores.push(`Ítem ${itemIndex + 1} de "${seccion.nombre}" debe tener un criterio`);
      }
    });
  });
  
  if (totalItems === 0) {
    errores.push('La lista debe tener al menos un ítem de verificación');
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Valida el diligenciamiento de una lista
 */
export function validarDiligenciamientoLista(lista: any): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  let itemsCriticosPendientes = 0;
  let itemsNoCumpleSinObservaciones = 0;
  let itemsNoCumpleSinEvidencias = 0;
  
  lista.secciones?.forEach((seccion: any) => {
    seccion.items?.forEach((item: any) => {
      // Validar ítems críticos
      if (item.esCritico && !item.respuesta) {
        itemsCriticosPendientes++;
        errores.push(`Ítem crítico "${item.numero}: ${item.criterio}" debe ser respondido`);
      }
      
      // Validar observaciones en no cumple
      if (item.respuesta === 'no-cumple') {
        if (!item.observaciones || item.observaciones.trim() === '') {
          itemsNoCumpleSinObservaciones++;
          errores.push(`Ítem "${item.numero}" marcado como "No Cumple" requiere observaciones`);
        }
      }
      
      // Validar evidencias si son requeridas
      if (lista.requiereEvidencias && item.respuesta && item.respuesta !== 'no-aplica') {
        if (!item.evidencias || item.evidencias.length === 0) {
          itemsNoCumpleSinEvidencias++;
          advertencias.push(`Ítem "${item.numero}" no tiene evidencias adjuntas`);
        }
      }
    });
  });
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

// ==================== VALIDACIONES DE INFORMES DE LEY ====================

export interface EntregaInformeValidacion {
  informeId: string;
  periodo: string;
  archivoNombre?: string;
}

/**
 * Valida una entrega de informe
 */
export function validarEntregaInforme(entrega: EntregaInformeValidacion): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  // Validar campos requeridos
  const camposRequeridos = validarCamposRequeridos([
    { nombre: 'Informe', valor: entrega.informeId },
    { nombre: 'Período', valor: entrega.periodo }
  ]);
  
  if (!camposRequeridos.valido) {
    errores.push(...camposRequeridos.errores);
  }
  
  // Validar formato de período
  if (entrega.periodo) {
    const formatosValidos = [
      /^\d{4}-\d{2}$/,           // Mensual: 2025-01
      /^\d{4}-Q[1-4]$/,          // Trimestral: 2025-Q1
      /^\d{4}-S[1-2]$/,          // Semestral: 2025-S1
      /^\d{4}$/                  // Anual: 2025
    ];
    
    const formatoValido = formatosValidos.some(regex => regex.test(entrega.periodo));
    
    if (!formatoValido) {
      errores.push('El formato del período no es válido (use: 2025-01, 2025-Q1, 2025-S1, o 2025)');
    }
  }
  
  // Advertir si no hay archivo
  if (!entrega.archivoNombre) {
    advertencias.push('No se ha adjuntado ningún archivo');
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Valida fecha de vencimiento de informe
 */
export function validarVencimientoInforme(fechaVencimiento: string): {
  vencido: boolean;
  diasRestantes: number;
  nivelAlerta: 'seguro' | 'atencion' | 'urgente' | 'vencido';
} {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  
  const diffTime = vencimiento.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let nivelAlerta: 'seguro' | 'atencion' | 'urgente' | 'vencido';
  
  if (diffDays < 0) {
    nivelAlerta = 'vencido';
  } else if (diffDays <= 3) {
    nivelAlerta = 'urgente';
  } else if (diffDays <= 7) {
    nivelAlerta = 'atencion';
  } else {
    nivelAlerta = 'seguro';
  }
  
  return {
    vencido: diffDays < 0,
    diasRestantes: diffDays,
    nivelAlerta
  };
}

// ==================== VALIDACIONES DE PLANES DE MEJORAMIENTO ====================

export interface AccionMejoramientoValidacion {
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
}

/**
 * Valida una acción de mejoramiento
 */
export function validarAccionMejoramiento(accion: AccionMejoramientoValidacion): ResultadoValidacion {
  const errores: string[] = [];
  
  // Campos requeridos
  const camposRequeridos = validarCamposRequeridos([
    { nombre: 'Descripción', valor: accion.descripcion },
    { nombre: 'Responsable', valor: accion.responsable },
    { nombre: 'Fecha de inicio', valor: accion.fechaInicio },
    { nombre: 'Fecha de fin', valor: accion.fechaFin }
  ]);
  
  if (!camposRequeridos.valido) {
    errores.push(...camposRequeridos.errores);
  }
  
  // Validar rango de fechas
  if (accion.fechaInicio && accion.fechaFin) {
    const rangoFechas = validarRangoFechas(accion.fechaInicio, accion.fechaFin);
    if (!rangoFechas.valido) {
      errores.push(...rangoFechas.errores);
    }
  }
  
  // Validar longitud de descripción
  if (accion.descripcion) {
    const longitud = validarLongitudMinima(accion.descripcion, 10, 'Descripción');
    if (!longitud.valido) {
      errores.push(...longitud.errores);
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida el avance de una acción
 */
export function validarAvanceAccion(avance: number): ResultadoValidacion {
  const errores: string[] = [];
  
  if (avance < 0 || avance > 100) {
    errores.push('El avance debe estar entre 0 y 100');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// ==================== UTILIDADES DE VALIDACIÓN ====================

/**
 * Muestra los errores de validación como toasts
 */
export function mostrarErroresValidacion(resultado: ResultadoValidacion): void {
  if (!resultado.valido) {
    resultado.errores.forEach(error => {
      toast.error('Error de validación', {
        description: error
      });
    });
  }
  
  if (resultado.advertencias && resultado.advertencias.length > 0) {
    resultado.advertencias.forEach(advertencia => {
      toast.warning('Advertencia', {
        description: advertencia
      });
    });
  }
}

/**
 * Muestra un resumen de validación
 */
export function mostrarResumenValidacion(resultado: ResultadoValidacion): void {
  if (resultado.valido) {
    toast.success('Validación exitosa', {
      description: 'Todos los campos son válidos'
    });
  } else {
    toast.error('Validación fallida', {
      description: `Se encontraron ${resultado.errores.length} errores`
    });
    
    // Mostrar primer error
    if (resultado.errores.length > 0) {
      toast.error(resultado.errores[0]);
    }
  }
}

/**
 * Valida formato de código
 */
export function validarCodigoFormato(
  codigo: string,
  patron: RegExp,
  ejemplo: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!patron.test(codigo)) {
    errores.push(`El código no tiene el formato correcto. Ejemplo: ${ejemplo}`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida que un número esté en un rango
 */
export function validarRangoNumerico(
  valor: number,
  min: number,
  max: number,
  nombreCampo: string
): ResultadoValidacion {
  const errores: string[] = [];
  
  if (valor < min || valor > max) {
    errores.push(`${nombreCampo} debe estar entre ${min} y ${max}`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida porcentaje (0-100)
 */
export function validarPorcentaje(valor: number, nombreCampo: string = 'Porcentaje'): ResultadoValidacion {
  return validarRangoNumerico(valor, 0, 100, nombreCampo);
}

/**
 * Combina múltiples resultados de validación
 */
export function combinarValidaciones(...resultados: ResultadoValidacion[]): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  resultados.forEach(resultado => {
    if (!resultado.valido) {
      errores.push(...resultado.errores);
    }
    if (resultado.advertencias) {
      advertencias.push(...resultado.advertencias);
    }
  });
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias: advertencias.length > 0 ? advertencias : undefined
  };
}

// ==================== VALIDACIONES DE ARCHIVOS ====================

/**
 * Valida extensión de archivo
 */
export function validarExtensionArchivo(
  nombreArchivo: string,
  extensionesPermitidas: string[]
): ResultadoValidacion {
  const errores: string[] = [];
  
  const extension = nombreArchivo.split('.').pop()?.toLowerCase();
  
  if (!extension || !extensionesPermitidas.includes(extension)) {
    errores.push(
      `El archivo debe tener una de las siguientes extensiones: ${extensionesPermitidas.join(', ')}`
    );
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Valida tamaño de archivo (en MB)
 */
export function validarTamanoArchivo(
  tamanoBytes: number,
  maxTamanoMB: number
): ResultadoValidacion {
  const errores: string[] = [];
  
  const tamanoMB = tamanoBytes / (1024 * 1024);
  
  if (tamanoMB > maxTamanoMB) {
    errores.push(`El archivo no puede exceder ${maxTamanoMB} MB (tamaño actual: ${tamanoMB.toFixed(2)} MB)`);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// ==================== VALIDACIONES DE AUDITORÍAS ====================

/**
 * Valida equipo auditor
 */
export function validarEquipoAuditor(equipo: any[]): ResultadoValidacion {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  if (!equipo || equipo.length === 0) {
    errores.push('Debe asignar al menos un auditor al equipo');
  }
  
  // Verificar que haya un auditor líder
  const tieneAuditorLider = equipo.some(miembro => miembro.rol === 'Auditor Líder');
  if (!tieneAuditorLider) {
    errores.push('Debe designar un Auditor Líder');
  }
  
  // Advertir si el equipo es muy pequeño
  if (equipo.length === 1) {
    advertencias.push('Se recomienda tener al menos 2 auditores en el equipo');
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Valida hallazgo
 */
export function validarHallazgo(hallazgo: any): ResultadoValidacion {
  const errores: string[] = [];
  
  const camposRequeridos = validarCamposRequeridos([
    { nombre: 'Título', valor: hallazgo.titulo },
    { nombre: 'Descripción', valor: hallazgo.descripcion },
    { nombre: 'Tipo', valor: hallazgo.tipo },
    { nombre: 'Criterio', valor: hallazgo.criterio },
    { nombre: 'Condición', valor: hallazgo.condicion }
  ]);
  
  if (!camposRequeridos.valido) {
    errores.push(...camposRequeridos.errores);
  }
  
  // Validar longitud de descripción
  if (hallazgo.descripcion) {
    const longitud = validarLongitudMinima(hallazgo.descripcion, 20, 'Descripción');
    if (!longitud.valido) {
      errores.push(...longitud.errores);
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

export default {
  validarCampoRequerido,
  validarCamposRequeridos,
  validarLongitudMinima,
  validarLongitudMaxima,
  validarEmail,
  validarRangoFechas,
  validarFechaNoPosterior,
  validarListaChequeo,
  validarDiligenciamientoLista,
  validarEntregaInforme,
  validarVencimientoInforme,
  validarAccionMejoramiento,
  validarAvanceAccion,
  mostrarErroresValidacion,
  mostrarResumenValidacion,
  validarCodigoFormato,
  validarRangoNumerico,
  validarPorcentaje,
  combinarValidaciones,
  validarExtensionArchivo,
  validarTamanoArchivo,
  validarEquipoAuditor,
  validarHallazgo
};
