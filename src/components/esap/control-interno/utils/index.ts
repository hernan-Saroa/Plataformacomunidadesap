/**
 * ÍNDICE DE UTILIDADES - MÓDULO CONTROL INTERNO
 * 
 * Exportaciones centralizadas de todas las utilidades, helpers,
 * validaciones y constantes del módulo.
 */

// Validaciones
export * from './validaciones';
export { default as validaciones } from './validaciones';

// Helpers
export * from './helpers';
export { default as helpers } from './helpers';

// Constantes
export * from './constantes';
export { default as constantes } from './constantes';

// Re-exportar funciones más utilizadas para acceso directo
export {
  // Validaciones más comunes
  validarCampoRequerido,
  validarCamposRequeridos,
  validarListaChequeo,
  validarDiligenciamientoLista,
  validarEntregaInforme,
  mostrarErroresValidacion,
  
  // Helpers más comunes
  formatearFecha,
  formatearFechaHora,
  formatearPorcentaje,
  formatearMoneda,
  calcularCumplimientoLista,
  calcularProgresoLista,
  calcularDiasRestantes,
  generarId,
  generarCodigo,
  
  // Constantes más usadas
  COLORES_ESAP,
  ESTADOS_AUDITORIA,
  ESTADOS_HALLAZGO,
  ESTADOS_LISTA_CHEQUEO,
  MENSAJES
} from './helpers';

// Importar las funciones desde sus módulos reales
import { 
  validarCampoRequerido,
  validarCamposRequeridos,
  validarListaChequeo,
  validarDiligenciamientoLista,
  validarEntregaInforme,
  mostrarErroresValidacion
} from './validaciones';

import {
  formatearFecha,
  formatearFechaHora,
  formatearPorcentaje,
  formatearMoneda,
  calcularCumplimientoLista,
  calcularProgresoLista,
  calcularDiasRestantes,
  generarId,
  generarCodigo
} from './helpers';

import {
  COLORES_ESAP,
  ESTADOS_AUDITORIA,
  ESTADOS_HALLAZGO,
  ESTADOS_LISTA_CHEQUEO,
  MENSAJES
} from './constantes';

// Re-exportar
export {
  validarCampoRequerido,
  validarCamposRequeridos,
  validarListaChequeo,
  validarDiligenciamientoLista,
  validarEntregaInforme,
  mostrarErroresValidacion,
  formatearFecha,
  formatearFechaHora,
  formatearPorcentaje,
  formatearMoneda,
  calcularCumplimientoLista,
  calcularProgresoLista,
  calcularDiasRestantes,
  generarId,
  generarCodigo,
  COLORES_ESAP,
  ESTADOS_AUDITORIA,
  ESTADOS_HALLAZGO,
  ESTADOS_LISTA_CHEQUEO,
  MENSAJES
};
