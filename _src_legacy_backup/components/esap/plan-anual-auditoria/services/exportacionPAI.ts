/**
 * ============================================
 * SERVICIO DE EXPORTACIÓN PAI
 * ============================================
 * 
 * Exportación del Plan Anual de Auditoría a:
 * - Excel formato EMFO001 PAI 2025 V.6 (oficial)
 * - PDF corporativo ESAP
 * - Word editable
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

import type { PlanAnualAuditoria, FormatoExportacion } from '../types';

/**
 * Opciones de exportación
 */
export interface OpcionesExportacionPAI {
  incluirPortada?: boolean;
  incluirFirmas?: boolean;
  incluirAnexos?: boolean;
  marcaDeAgua?: boolean;
  logotipo?: boolean;
  nombreArchivo?: string;
  autor?: string;
}

/**
 * Resultado de la exportación
 */
export interface ResultadoExportacion {
  exito: boolean;
  formato: FormatoExportacion;
  nombreArchivo: string;
  tamanoKB: number;
  url?: string;
  error?: string;
  advertencias?: string[];
}

/**
 * ============================================
 * FUNCIÓN PRINCIPAL DE EXPORTACIÓN
 * ============================================
 */
export async function exportarPlanAnual(
  plan: PlanAnualAuditoria,
  formato: FormatoExportacion,
  opciones: OpcionesExportacionPAI = {}
): Promise<ResultadoExportacion> {
  
  try {
    console.log(`📤 Iniciando exportación PAI en formato ${formato}...`);
    
    // Opciones por defecto
    const opcionesFinal: OpcionesExportacionPAI = {
      incluirPortada: true,
      incluirFirmas: true,
      incluirAnexos: true,
      marcaDeAgua: formato === 'PDF-Corporativo',
      logotipo: true,
      nombreArchivo: generarNombreArchivo(plan, formato),
      autor: plan.datosGenerales.jefeOCI.nombreCompleto,
      ...opciones
    };

    let resultado: ResultadoExportacion;

    switch (formato) {
      case 'Excel-EMFO001':
        resultado = await exportarExcelEMFO001(plan, opcionesFinal);
        break;
        
      case 'PDF-Corporativo':
        resultado = await exportarPDFCorporativo(plan, opcionesFinal);
        break;
        
      case 'Word-Editable':
        resultado = await exportarWordEditable(plan, opcionesFinal);
        break;
        
      default:
        throw new Error(`Formato no soportado: ${formato}`);
    }

    console.log(`✅ Exportación completada: ${resultado.nombreArchivo}`);
    return resultado;
    
  } catch (error) {
    console.error('❌ Error al exportar PAI:', error);
    return {
      exito: false,
      formato,
      nombreArchivo: '',
      tamanoKB: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * ============================================
 * EXPORTACIÓN A EXCEL EMFO001
 * ============================================
 */
async function exportarExcelEMFO001(
  plan: PlanAnualAuditoria,
  opciones: OpcionesExportacionPAI
): Promise<ResultadoExportacion> {
  
  // Importar dinámicamente para no cargar la librería hasta que se necesite
  const { exportarExcelEMFO001Completo } = await import('./exportarExcelEMFO001');
  
  return exportarExcelEMFO001Completo(plan, opciones);
}

/**
 * ============================================
 * EXPORTACIÓN A PDF CORPORATIVO
 * ============================================
 */
async function exportarPDFCorporativo(
  plan: PlanAnualAuditoria,
  opciones: OpcionesExportacionPAI
): Promise<ResultadoExportacion> {
  
  // Importar dinámicamente
  const { exportarPDFCorporativoCompleto } = await import('./exportarPDFCorporativo');
  
  return exportarPDFCorporativoCompleto(plan, opciones);
}

/**
 * ============================================
 * EXPORTACIÓN A WORD EDITABLE
 * ============================================
 */
async function exportarWordEditable(
  plan: PlanAnualAuditoria,
  opciones: OpcionesExportacionPAI
): Promise<ResultadoExportacion> {
  
  // TODO: Implementar exportación a Word
  throw new Error('Exportación a Word no implementada aún');
}

/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

/**
 * Generar nombre de archivo
 */
function generarNombreArchivo(
  plan: PlanAnualAuditoria,
  formato: FormatoExportacion
): string {
  const fecha = new Date().toISOString().split('T')[0];
  const vigencia = plan.datosGenerales.vigencia;
  
  const extension = formato === 'Excel-EMFO001' 
    ? 'xlsx' 
    : formato === 'PDF-Corporativo' 
    ? 'pdf' 
    : 'docx';
  
  return `PAI_${vigencia}_ESAP_${fecha}.${extension}`;
}

/**
 * Validar plan antes de exportar
 */
export function validarPlanParaExportacion(plan: PlanAnualAuditoria): {
  valido: boolean;
  errores: string[];
  advertencias: string[];
} {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Validaciones críticas
  if (!plan.datosGenerales.vigencia) {
    errores.push('Vigencia no definida');
  }
  
  if (!plan.datosGenerales.jefeOCI.nombreCompleto) {
    errores.push('Jefe OCI no definido');
  }
  
  if (!plan.datosGenerales.objetivoGeneral) {
    errores.push('Objetivo general no definido');
  }
  
  if (plan.rolesDecreto648.length !== 5) {
    errores.push('No se cumple con los 5 roles del Decreto 648/2017');
  }

  // Validaciones de advertencia
  if (!plan.datosGenerales.fechaAprobacion) {
    advertencias.push('No tiene fecha de aprobación');
  }
  
  if (!plan.datosGenerales.fechaPublicacion) {
    advertencias.push('No tiene fecha de publicación');
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Obtener estadísticas de exportación
 */
export function obtenerEstadisticasExportacion(plan: PlanAnualAuditoria): {
  totalRoles: number;
  totalActividades: number;
  totalUnidadesAuditables: number;
  totalAuditorias: number;
  porcentajeCompletado: number;
} {
  return {
    totalRoles: plan.rolesDecreto648.length,
    totalActividades: plan.rolesDecreto648.reduce(
      (sum, rol) => sum + rol.actividades.length, 
      0
    ),
    totalUnidadesAuditables: 0, // TODO: Obtener del plan
    totalAuditorias: 0, // TODO: Obtener del plan
    porcentajeCompletado: plan.estadisticas.porcentajeAvanceGeneral
  };
}

/**
 * ============================================
 * FORMATEADORES
 * ============================================
 */

/**
 * Formatear fecha para exportación
 */
export function formatearFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatear moneda COP
 */
export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
}

/**
 * Formatear número con separadores
 */
export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CO').format(valor);
}

/**
 * Formatear porcentaje
 */
export function formatearPorcentaje(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */
export {
  exportarExcelEMFO001,
  exportarPDFCorporativo,
  exportarWordEditable
};
