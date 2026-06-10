import { AsignaturaRow, ProgramaRow } from '../parsers/excel-parser.service';
import { HorasPtaCalculator } from '../../horas-pta.calculator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ImportValidator {
  /**
   * Valida las reglas de negocio pre-inserción (R1-R6) de la carga del catálogo.
   *
   * @param asignaturas - Las filas de la hoja ASIGNATURAS
   * @param programas - Las filas de la hoja PROGRAMAS
   * @returns Un reporte con validez, errores bloqueantes y advertencias
   */
  // [BR-002] Conteos de referencia basados en Circular Dispositiva 003/2025
  static readonly REFERENCIA_ASIGNATURAS = 427;
  static readonly REFERENCIA_PROGRAMAS = 14;
  static readonly REFERENCIA_OFERTAS = 325;

  static validarPreInsert(asignaturas: AsignaturaRow[], programas: ProgramaRow[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // R1. [BR-001] La hoja ASIGNATURAS debe tener datos (mínimo 1, máximo razonable 2000)
    if (asignaturas.length === 0) {
      errors.push(`R1: La hoja ASIGNATURAS está vacía. Se requiere al menos 1 fila de datos.`);
    } else if (asignaturas.length > 2000) {
      errors.push(`R1: La hoja ASIGNATURAS tiene ${asignaturas.length} filas, excediendo el máximo razonable de 2000.`);
    } else if (asignaturas.length !== ImportValidator.REFERENCIA_ASIGNATURAS) {
      warnings.push(
        `[BR-002] La hoja ASIGNATURAS contiene ${asignaturas.length} filas. ` +
        `El valor de referencia (Circular 003) es ${ImportValidator.REFERENCIA_ASIGNATURAS}. Verifique si el catálogo es correcto.`
      );
    }

    // R2. [BR-001] La hoja PROGRAMAS debe tener datos
    if (programas.length === 0) {
      errors.push(`R2: La hoja PROGRAMAS está vacía. Se requiere al menos 1 fila de datos.`);
    } else if (programas.length !== ImportValidator.REFERENCIA_PROGRAMAS) {
      warnings.push(
        `[BR-002] La hoja PROGRAMAS contiene ${programas.length} filas. ` +
        `El valor de referencia (Circular 003) es ${ImportValidator.REFERENCIA_PROGRAMAS}. Verifique si el catálogo es correcto.`
      );
    }

    // R3. Todos los codigo_asignatura son únicos
    const codigosAsignaturas = new Set<string>();
    const codigosDuplicados = new Set<string>();
    for (const a of asignaturas) {
      if (!a.codigo_asignatura) {
        errors.push(`R3: Se encontró una asignatura sin código.`);
        continue;
      }
      if (codigosAsignaturas.has(a.codigo_asignatura)) {
        codigosDuplicados.add(a.codigo_asignatura);
      }
      codigosAsignaturas.add(a.codigo_asignatura);
    }
    if (codigosDuplicados.size > 0) {
      errors.push(`R3: Códigos de asignatura duplicados en el Excel: ${Array.from(codigosDuplicados).join(', ')}.`);
    }

    // R4. Todos los créditos están en rango 1-20
    const creditosFueraRango = asignaturas.filter(a => a.creditos < 1 || a.creditos > 20);
    if (creditosFueraRango.length > 0) {
      errors.push(`R4: ${creditosFueraRango.length} asignaturas tienen créditos fuera del rango 1-20.`);
    }

    // R5. Todos los valores de modalidad están en el enum/mapeo permitido
    const modalidadesValidas = new Set([
      'presencial diurno', 'presencial nocturno', 'presencial', 'virtual', 'distancia', 'mixta', 'por definir',
      'presencial_dia', 'presencial_noche', 'sin_definir'
    ]);
    const modalidadesInvalidas = new Set<string>();
    for (const a of asignaturas) {
      const modNormalized = String(a.modalidad || '').toLowerCase().trim();
      if (!modalidadesValidas.has(modNormalized)) {
        modalidadesInvalidas.add(a.modalidad);
      }
    }
    if (modalidadesInvalidas.size > 0) {
      errors.push(`R5: Se encontraron modalidades no soportadas en las asignaturas: ${Array.from(modalidadesInvalidas).join(', ')}.`);
    }

    // R6. Todos los valores de "programa" en ASIGNATURAS existen en la hoja PROGRAMAS
    const nombresProgramas = new Set(programas.map(p => p.nombre_programa.toLowerCase().trim()));
    const codigosProgramas = new Set(programas.map(p => p.codigo_programa.toLowerCase().trim()));
    const programasNoEncontrados = new Set<string>();

    for (const a of asignaturas) {
      const progNameLower = a.codigo_programa.toLowerCase().trim();
      if (!nombresProgramas.has(progNameLower) && !codigosProgramas.has(progNameLower)) {
        programasNoEncontrados.add(a.codigo_programa);
      }
    }
    if (programasNoEncontrados.size > 0) {
      errors.push(`R6: Se detectaron asignaturas asignadas a programas inexistentes en la hoja PROGRAMAS: ${Array.from(programasNoEncontrados).join(', ')}.`);
    }

    // Retornar si hay errores bloqueantes
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Realiza validaciones de horas de la Circular 003 y genera advertencias (no bloqueantes).
   *
   * @param asignaturas - Las filas de la hoja ASIGNATURAS
   * @param programas - Las filas de la hoja PROGRAMAS
   * @returns Lista de advertencias de desviación de horas
   */
  static validarCircular003(asignaturas: AsignaturaRow[], programas: ProgramaRow[]): string[] {
    const warnings: string[] = [];

    // Crear un mapa de programas para búsqueda rápida
    const programaMap = new Map<string, ProgramaRow>();
    for (const p of programas) {
      programaMap.set(p.nombre_programa.toLowerCase().trim(), p);
      programaMap.set(p.codigo_programa.toLowerCase().trim(), p);
    }

    for (const a of asignaturas) {
      const p = programaMap.get(a.codigo_programa.toLowerCase().trim());
      if (!p) continue;

      // Calcular horas esperadas de PTA
      const horasPtaEsperadas = HorasPtaCalculator.calcularHorasPTA(
        {
          creditos: a.creditos,
          tipoExcepcion: a.tipo_excepcion,
        },
        {
          horasBasePorCredito: p.horas_base_por_credito,
          horasPregradoCentral: p.horas_pregrado_central,
        }
      );

      // Comparar con el valor de horas_pta del Excel
      if (a.horas_pta !== horasPtaEsperadas) {
        warnings.push(
          `Desviación de horas PTA en ${a.codigo_asignatura} (${a.nombre_asignatura}): ` +
          `Esperado ${horasPtaEsperadas} horas (según Circular 003), pero el archivo contiene ${a.horas_pta} horas.`
        );
      }
    }

    return warnings;
  }
}
