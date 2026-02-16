/**
 * ═══════════════════════════════════════════════════════════════════════
 * SISTEMA DE NOMENCLATURA ÚNICA - CONTROL INTERNO DISCIPLINARIO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Sistema centralizado para generar nomenclaturas únicas y consecutivas
 * para todos los documentos del módulo disciplinario.
 * 
 * FORMATO DE NOMENCLATURA:
 * - Autos:       AUT-NNN-YYYY  (ej: AUT-001-2025)
 * - Oficios:     OF-NNN-YYYY   (ej: OF-001-2025)
 * - Evidencias:  EV-NNN-YYYY   (ej: EV-001-2025)
 * - Actas:       ACT-NNN-YYYY  (ej: ACT-001-2025)
 * 
 * Donde:
 * - NNN: Número consecutivo de 3 dígitos (001, 002, ..., 999)
 * - YYYY: Año actual
 */

// ==================== TIPOS ====================
export type TipoDocumento = 'AUTO' | 'OFICIO' | 'EVIDENCIA' | 'ACTA';

export interface DocumentoNomenclatura {
  id: string;
  nomenclatura: string;
  tipoDocumento: TipoDocumento;
  numeroConsecutivo: number;
  año: number;
  fechaCreacion: string;
  procesoId: string;
  numeroProceso: string;
}

export interface ContadorDocumentos {
  AUTOS: number;
  OFICIOS: number;
  EVIDENCIAS: number;
  ACTAS: number;
  añoActual: number;
}

// ==================== CONFIGURACIÓN ====================
const PREFIJOS_DOCUMENTOS: Record<TipoDocumento, string> = {
  AUTO: 'AUT',
  OFICIO: 'OF',
  EVIDENCIA: 'EV',
  ACTA: 'ACT'
};

const NOMBRES_CONTADORES: Record<TipoDocumento, keyof Omit<ContadorDocumentos, 'añoActual'>> = {
  AUTO: 'AUTOS',
  OFICIO: 'OFICIOS',
  EVIDENCIA: 'EVIDENCIAS',
  ACTA: 'ACTAS'
};

// ==================== STORAGE KEYS ====================
const STORAGE_KEY_CONTADORES = 'disciplinario_contadores_documentos';
const STORAGE_KEY_NOMENCLATURAS = 'disciplinario_nomenclaturas_registradas';

// ==================== FUNCIONES AUXILIARES ====================
/**
 * Obtiene el año actual
 */
function obtenerAñoActual(): number {
  return new Date().getFullYear();
}

/**
 * Formatea un número a 3 dígitos con ceros a la izquierda
 */
function formatearConsecutivo(numero: number): string {
  return numero.toString().padStart(3, '0');
}

/**
 * Obtiene los contadores desde localStorage
 */
function obtenerContadores(): ContadorDocumentos {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONTADORES);
    if (!stored) {
      return inicializarContadores();
    }

    const contadores = JSON.parse(stored) as ContadorDocumentos;
    const añoActual = obtenerAñoActual();

    // Si el año cambió, reiniciar contadores
    if (contadores.añoActual !== añoActual) {
      return inicializarContadores();
    }

    return contadores;
  } catch (error) {
    console.error('Error al obtener contadores:', error);
    return inicializarContadores();
  }
}

/**
 * Inicializa los contadores en cero para el año actual
 */
function inicializarContadores(): ContadorDocumentos {
  const contadores: ContadorDocumentos = {
    AUTOS: 0,
    OFICIOS: 0,
    EVIDENCIAS: 0,
    ACTAS: 0,
    añoActual: obtenerAñoActual()
  };
  
  guardarContadores(contadores);
  return contadores;
}

/**
 * Guarda los contadores en localStorage
 */
function guardarContadores(contadores: ContadorDocumentos): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONTADORES, JSON.stringify(contadores));
  } catch (error) {
    console.error('Error al guardar contadores:', error);
  }
}

/**
 * Obtiene las nomenclaturas registradas desde localStorage
 */
function obtenerNomenclaturas(): DocumentoNomenclatura[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOMENCLATURAS);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as DocumentoNomenclatura[];
  } catch (error) {
    console.error('Error al obtener nomenclaturas:', error);
    return [];
  }
}

/**
 * Guarda las nomenclaturas en localStorage
 */
function guardarNomenclaturas(nomenclaturas: DocumentoNomenclatura[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOMENCLATURAS, JSON.stringify(nomenclaturas));
  } catch (error) {
    console.error('Error al guardar nomenclaturas:', error);
  }
}

// ==================== FUNCIONES PÚBLICAS ====================
/**
 * Genera una nueva nomenclatura única para un documento
 * 
 * @param tipoDocumento - Tipo de documento (AUTO, OFICIO, EVIDENCIA, ACTA)
 * @param procesoId - ID del proceso asociado
 * @param numeroProceso - Número del proceso asociado (ej: P-120-2025)
 * @returns Objeto con la nomenclatura generada
 */
export function generarNomenclatura(
  tipoDocumento: TipoDocumento,
  procesoId: string,
  numeroProceso: string
): DocumentoNomenclatura {
  // Obtener contadores actuales
  const contadores = obtenerContadores();
  
  // Incrementar el contador del tipo de documento
  const nombreContador = NOMBRES_CONTADORES[tipoDocumento];
  const nuevoConsecutivo = contadores[nombreContador] + 1;
  contadores[nombreContador] = nuevoConsecutivo;
  
  // Guardar contadores actualizados
  guardarContadores(contadores);
  
  // Generar nomenclatura
  const prefijo = PREFIJOS_DOCUMENTOS[tipoDocumento];
  const consecutivo = formatearConsecutivo(nuevoConsecutivo);
  const año = contadores.añoActual;
  const nomenclatura = `${prefijo}-${consecutivo}-${año}`;
  
  // Crear objeto de nomenclatura
  const documentoNomenclatura: DocumentoNomenclatura = {
    id: `${tipoDocumento.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    nomenclatura,
    tipoDocumento,
    numeroConsecutivo: nuevoConsecutivo,
    año,
    fechaCreacion: new Date().toISOString(),
    procesoId,
    numeroProceso
  };
  
  // Registrar nomenclatura
  const nomenclaturas = obtenerNomenclaturas();
  nomenclaturas.push(documentoNomenclatura);
  guardarNomenclaturas(nomenclaturas);
  
  return documentoNomenclatura;
}

/**
 * Valida si una nomenclatura ya existe
 * 
 * @param nomenclatura - Nomenclatura a validar
 * @returns true si existe, false si no existe
 */
export function existeNomenclatura(nomenclatura: string): boolean {
  const nomenclaturas = obtenerNomenclaturas();
  return nomenclaturas.some(n => n.nomenclatura === nomenclatura);
}

/**
 * Busca un documento por su nomenclatura
 * 
 * @param nomenclatura - Nomenclatura a buscar
 * @returns Documento encontrado o null
 */
export function buscarPorNomenclatura(nomenclatura: string): DocumentoNomenclatura | null {
  const nomenclaturas = obtenerNomenclaturas();
  return nomenclaturas.find(n => n.nomenclatura === nomenclatura) || null;
}

/**
 * Obtiene todas las nomenclaturas de un proceso específico
 * 
 * @param procesoId - ID del proceso
 * @returns Array de nomenclaturas del proceso
 */
export function obtenerNomenclaturasPorProceso(procesoId: string): DocumentoNomenclatura[] {
  const nomenclaturas = obtenerNomenclaturas();
  return nomenclaturas.filter(n => n.procesoId === procesoId);
}

/**
 * Obtiene todas las nomenclaturas de un tipo de documento específico
 * 
 * @param tipoDocumento - Tipo de documento
 * @returns Array de nomenclaturas del tipo
 */
export function obtenerNomenclaturasPorTipo(tipoDocumento: TipoDocumento): DocumentoNomenclatura[] {
  const nomenclaturas = obtenerNomenclaturas();
  return nomenclaturas.filter(n => n.tipoDocumento === tipoDocumento);
}

/**
 * Obtiene los contadores actuales sin modificarlos
 * 
 * @returns Objeto con los contadores actuales
 */
export function obtenerContadoresActuales(): ContadorDocumentos {
  return obtenerContadores();
}

/**
 * Obtiene el próximo número consecutivo para un tipo de documento
 * (Sin incrementar el contador)
 * 
 * @param tipoDocumento - Tipo de documento
 * @returns Próximo número consecutivo
 */
export function obtenerProximoConsecutivo(tipoDocumento: TipoDocumento): number {
  const contadores = obtenerContadores();
  const nombreContador = NOMBRES_CONTADORES[tipoDocumento];
  return contadores[nombreContador] + 1;
}

/**
 * Genera una vista previa de la nomenclatura sin crear el registro
 * 
 * @param tipoDocumento - Tipo de documento
 * @returns Nomenclatura de vista previa
 */
export function previsualizarNomenclatura(tipoDocumento: TipoDocumento): string {
  const proximoConsecutivo = obtenerProximoConsecutivo(tipoDocumento);
  const prefijo = PREFIJOS_DOCUMENTOS[tipoDocumento];
  const consecutivo = formatearConsecutivo(proximoConsecutivo);
  const año = obtenerAñoActual();
  return `${prefijo}-${consecutivo}-${año}`;
}

/**
 * Elimina una nomenclatura (usado para rollback en caso de error)
 * ⚠️ Usar con precaución
 * 
 * @param id - ID del documento a eliminar
 * @returns true si se eliminó, false si no se encontró
 */
export function eliminarNomenclatura(id: string): boolean {
  try {
    const nomenclaturas = obtenerNomenclaturas();
    const index = nomenclaturas.findIndex(n => n.id === id);
    
    if (index === -1) {
      return false;
    }
    
    nomenclaturas.splice(index, 1);
    guardarNomenclaturas(nomenclaturas);
    return true;
  } catch (error) {
    console.error('Error al eliminar nomenclatura:', error);
    return false;
  }
}

/**
 * Resetea todos los contadores (Solo para desarrollo/testing)
 * ⚠️ NO USAR EN PRODUCCIÓN
 */
export function resetearContadores(): void {
  if (process.env.NODE_ENV === 'development') {
    localStorage.removeItem(STORAGE_KEY_CONTADORES);
    localStorage.removeItem(STORAGE_KEY_NOMENCLATURAS);
    console.warn('⚠️ Contadores reseteados - Solo disponible en desarrollo');
  } else {
    console.error('❌ resetearContadores() no está disponible en producción');
  }
}

/**
 * Exporta todas las nomenclaturas a JSON
 * 
 * @returns String JSON con todas las nomenclaturas
 */
export function exportarNomenclaturas(): string {
  const nomenclaturas = obtenerNomenclaturas();
  const contadores = obtenerContadores();
  
  return JSON.stringify({
    contadores,
    nomenclaturas,
    fechaExportacion: new Date().toISOString(),
    totalDocumentos: nomenclaturas.length
  }, null, 2);
}

/**
 * Obtiene estadísticas de nomenclaturas
 * 
 * @returns Objeto con estadísticas
 */
export function obtenerEstadisticas() {
  const nomenclaturas = obtenerNomenclaturas();
  const contadores = obtenerContadores();
  
  return {
    contadores,
    total: nomenclaturas.length,
    porTipo: {
      AUTOS: nomenclaturas.filter(n => n.tipoDocumento === 'AUTO').length,
      OFICIOS: nomenclaturas.filter(n => n.tipoDocumento === 'OFICIO').length,
      EVIDENCIAS: nomenclaturas.filter(n => n.tipoDocumento === 'EVIDENCIA').length,
      ACTAS: nomenclaturas.filter(n => n.tipoDocumento === 'ACTA').length
    },
    ultimasNomenclaturas: nomenclaturas.slice(-10).reverse(),
    añoActual: contadores.añoActual
  };
}
