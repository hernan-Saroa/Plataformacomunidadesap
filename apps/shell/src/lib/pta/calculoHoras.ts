/**
 * MOTOR DE CÁLCULO DE HORAS - REPLICACIÓN EXACTA EXCEL v9
 * Basado en: Sistema_Gestion_Profesoral_5_Componentes_V7_Expandido.md
 * Fórmulas originales de Arley Carvajal
 */

export type TipoPrograma = 
  | 'AP'                  // Administración Pública (pregrado)
  | 'ECONOMIA_PUB'        // Economía Pública
  | 'Maestría'            // Maestría
  | 'APT'                 // Administración Pública Territorial (Tecnología)
  | 'ESP'                 // Especialización
  | 'DOCTORADO';          // Doctorado

export interface AsignaturaInfo {
  nombre: string;
  tipoPrograma: TipoPrograma;
  creditos: number;
  numeroGrupos?: number;
}

export interface CalculoHorasResult {
  horasClase: number;
  horasTotales: number;
  factorAplicado: number;
  formula: string;
}

/**
 * FÓRMULA K15 - Cálculo de Horas de Clase
 * =IF(F15="Seminario De Énfasis", 128,
 *     IF(K14="AP", 64,
 *         IF(K14="ECONOMIA_PUB", 64,
 *             IF(K14="Maestría", J15*12,
 *                 J15*16))))
 */
export function calcularHorasClase(
  nombreAsignatura: string,
  tipoPrograma: TipoPrograma,
  creditos: number
): number {
  // Caso especial: Seminario De Énfasis
  if (nombreAsignatura === 'Seminario De Énfasis') {
    return 128;
  }

  // Caso especial: Opciones De Grado AP
  if (nombreAsignatura === 'Opciones De Grado AP') {
    return 20; // Se maneja especial en horasTotales
  }

  // Caso especial: Seminario Opciones APT
  if (nombreAsignatura === 'Seminario Opciones APT') {
    return 144; // Se maneja especial en horasTotales
  }

  // Casos por tipo de programa
  switch (tipoPrograma) {
    case 'AP':
      return 64; // Fijo para pregrado AP
    
    case 'ECONOMIA_PUB':
      return 64; // Fijo para Economía Pública
    
    case 'Maestría':
      return creditos * 12; // Créditos × 12
    
    case 'APT':
    case 'ESP':
    case 'DOCTORADO':
      return creditos * 16; // Créditos × 16
    
    default:
      return creditos * 16; // Por defecto
  }
}

/**
 * FÓRMULA L15 - Cálculo de Total Horas (con factor ×3)
 * =IF(F15="Opciones De Grado AP", 20,
 *     IF(F15="Seminario Opciones APT", 144,
 *         K15*3))
 * 
 * Factor ×3 = 1 hora clase + 1 hora preparación + 1 hora acompañamiento
 */
export function calcularHorasTotales(
  nombreAsignatura: string,
  horasClase: number
): number {
  // Casos especiales sin factor ×3
  if (nombreAsignatura === 'Opciones De Grado AP') {
    return 20; // Horas fijas sin factor
  }

  if (nombreAsignatura === 'Seminario Opciones APT') {
    return 144; // Horas fijas sin factor
  }

  // Caso general: aplicar factor ×3
  return horasClase * 3;
}

/**
 * Función principal que replica exactamente el comportamiento del Excel v9
 */
export function calcularHoras(info: AsignaturaInfo): CalculoHorasResult {
  const { nombre, tipoPrograma, creditos, numeroGrupos = 1 } = info;

  // Paso 1: Calcular horas de clase (fórmula K15)
  const horasClasePorGrupo = calcularHorasClase(nombre, tipoPrograma, creditos);

  // Paso 2: Calcular horas totales con factor (fórmula L15)
  const horasTotalesPorGrupo = calcularHorasTotales(nombre, horasClasePorGrupo);

  // Paso 3: Multiplicar por número de grupos
  const horasClase = horasClasePorGrupo * numeroGrupos;
  const horasTotales = horasTotalesPorGrupo * numeroGrupos;

  // Determinar factor aplicado
  let factorAplicado = 3; // Por defecto
  if (nombre === 'Opciones De Grado AP' || nombre === 'Seminario Opciones APT') {
    factorAplicado = 1; // Sin factor para estos casos especiales
  }

  // Documentar fórmula utilizada
  let formula = '';
  if (nombre === 'Seminario De Énfasis') {
    formula = '128 horas fijas';
  } else if (nombre === 'Opciones De Grado AP') {
    formula = '20 horas fijas (sin factor)';
  } else if (nombre === 'Seminario Opciones APT') {
    formula = '144 horas fijas (sin factor)';
  } else if (tipoPrograma === 'AP' || tipoPrograma === 'ECONOMIA_PUB') {
    formula = `64 horas fijas × ${factorAplicado} = ${horasTotalesPorGrupo}h por grupo`;
  } else if (tipoPrograma === 'Maestría') {
    formula = `${creditos} créditos × 12 × ${factorAplicado} = ${horasTotalesPorGrupo}h por grupo`;
  } else {
    formula = `${creditos} créditos × 16 × ${factorAplicado} = ${horasTotalesPorGrupo}h por grupo`;
  }

  if (numeroGrupos > 1) {
    formula += ` × ${numeroGrupos} grupos = ${horasTotales}h total`;
  }

  return {
    horasClase,
    horasTotales,
    factorAplicado,
    formula
  };
}

/**
 * Tabla de referencia rápida según tipo de programa
 */
export const TABLA_HORAS_POR_PROGRAMA: Record<TipoPrograma, {
  horasPorCredito: number;
  factor: number;
  totalPorCredito: number;
  ejemplo3Creditos: number;
}> = {
  'AP': {
    horasPorCredito: 64, // Fijo, no depende de créditos
    factor: 3,
    totalPorCredito: 192, // 64 × 3
    ejemplo3Creditos: 192
  },
  'ECONOMIA_PUB': {
    horasPorCredito: 64, // Fijo, no depende de créditos
    factor: 3,
    totalPorCredito: 192, // 64 × 3
    ejemplo3Creditos: 192
  },
  'Maestría': {
    horasPorCredito: 12,
    factor: 3,
    totalPorCredito: 36, // 12 × 3
    ejemplo3Creditos: 108 // 3 × 36
  },
  'APT': {
    horasPorCredito: 16,
    factor: 3,
    totalPorCredito: 48, // 16 × 3
    ejemplo3Creditos: 144 // 3 × 48
  },
  'ESP': {
    horasPorCredito: 16,
    factor: 3,
    totalPorCredito: 48, // 16 × 3
    ejemplo3Creditos: 144 // 3 × 48
  },
  'DOCTORADO': {
    horasPorCredito: 16,
    factor: 3,
    totalPorCredito: 48, // 16 × 3
    ejemplo3Creditos: 144 // 3 × 48
  }
};

/**
 * Validar asignatura según catálogo
 */
export function validarAsignatura(nombre: string, creditos: number): { valid: boolean; error?: string } {
  if (!nombre || nombre.trim() === '') {
    return { valid: false, error: 'El nombre de la asignatura es requerido' };
  }

  if (creditos < 1 || creditos > 10) {
    return { valid: false, error: 'Los créditos deben estar entre 1 y 10' };
  }

  return { valid: true };
}

/**
 * Calcular horas totales para una lista de asignaturas
 */
export function calcularHorasTotalesDocencia(asignaturas: AsignaturaInfo[]): number {
  return asignaturas.reduce((total, asignatura) => {
    const calculo = calcularHoras(asignatura);
    return total + calculo.horasTotales;
  }, 0);
}
