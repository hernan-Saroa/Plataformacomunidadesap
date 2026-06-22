import {
  AsignaturaRow,
  ProgramaRow,
} from '../parsers/excel-parser.service';
import { HorasPtaCalculator } from '../../horas-pta.calculator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ImportValidator {
  static readonly REFERENCIA_ASIGNATURAS = 427;
  static readonly REFERENCIA_PROGRAMAS = 14;
  static readonly REFERENCIA_OFERTAS = 325;

  private static readonly MODALIDADES_ASIGNATURA = new Set([
    'presencial diurno',
    'presencial nocturno',
    'presencial',
    'virtual',
    'distancia',
    'mixta',
    'mixto',
    'por definir',
    'presencial_dia',
    'presencial_noche',
    'sin_definir',
  ]);

  private static readonly MODALIDADES_PROGRAMA = new Set([
    'presencial',
    'distancia',
    'virtual',
    'mixta',
    'mixto',
  ]);

  private static readonly TIPOS_PROGRAMA = new Set([
    'pregrado',
    'especializacion',
    'maestria',
  ]);

  private static readonly FACULTADES = new Set([
    'pregrado',
    'posgrado-esp',
    'posgrado-maes',
  ]);

  private static readonly TIPOS_EXCEPCION = new Set([
    'seminario_enfasis',
    'opciones_grado_ap',
    'seminario_opciones_apt',
  ]);

  private static readonly SEMESTRES = new Set([
    ...Array.from({ length: 12 }, (_, index) => String(index + 1)),
    'primer semestre',
    'segundo semestre',
    'tercer semestre',
    'cuarto semestre',
    'quinto semestre',
    'sexto semestre',
    'séptimo semestre',
    'septimo semestre',
    'octavo semestre',
    'noveno semestre',
    'décimo semestre',
    'decimo semestre',
    'onceavo semestre',
    'doceavo semestre',
    'sem i',
    'sem ii',
    'sem iii',
    'sem iv',
    'semestre i',
    'semestre ii',
    'semestre iii',
    'semestre iv',
  ]);

  static validarPreInsert(
    asignaturas: AsignaturaRow[],
    programas: ProgramaRow[],
    matrizProgramCodes: string[] = [],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (asignaturas.length === 0) {
      errors.push(
        'R1: La hoja ASIGNATURAS está vacía. Se requiere al menos una fila.',
      );
    } else if (asignaturas.length > 2000) {
      errors.push(
        `R1: La hoja ASIGNATURAS tiene ${asignaturas.length} filas y excede el máximo de 2000.`,
      );
    } else if (
      asignaturas.length !== ImportValidator.REFERENCIA_ASIGNATURAS
    ) {
      warnings.push(
        `[BR-002] La hoja ASIGNATURAS contiene ${asignaturas.length} filas. ` +
          `El catálogo institucional de referencia contiene ${ImportValidator.REFERENCIA_ASIGNATURAS}.`,
      );
    }

    if (programas.length === 0) {
      errors.push(
        'R2: La hoja PROGRAMAS está vacía. Se requiere al menos una fila.',
      );
    } else if (programas.length !== ImportValidator.REFERENCIA_PROGRAMAS) {
      warnings.push(
        `[BR-002] La hoja PROGRAMAS contiene ${programas.length} filas. ` +
          `El catálogo institucional de referencia contiene ${ImportValidator.REFERENCIA_PROGRAMAS}.`,
      );
    }

    const programCodes = new Set<string>();
    const duplicateProgramCodes = new Set<string>();
    const duplicateProgramNames = new Set<string>();
    const programNames = new Set<string>();

    programas.forEach((programa, index) => {
      const row = index + 2;
      const code = programa.codigo_programa.trim();
      const normalizedCode = code.toLowerCase();
      const normalizedName = programa.nombre_programa.toLowerCase().trim();

      if (!code) {
        errors.push(`PROGRAMAS fila ${row}: falta codigo_programa.`);
      } else {
        if (!code.toUpperCase().startsWith('PRO-')) {
          errors.push(
            `PROGRAMAS fila ${row}: codigo_programa "${code}" debe iniciar por "PRO-".`,
          );
        }
        if (code.length > 20) {
          errors.push(
            `PROGRAMAS fila ${row}: codigo_programa supera 20 caracteres.`,
          );
        }
        if (programCodes.has(normalizedCode)) {
          duplicateProgramCodes.add(code);
        }
        programCodes.add(normalizedCode);
      }

      if (!programa.nombre_programa) {
        errors.push(`PROGRAMAS fila ${row}: falta nombre_programa.`);
      } else if (programa.nombre_programa.length > 100) {
        errors.push(
          `PROGRAMAS fila ${row}: nombre_programa supera 100 caracteres.`,
        );
      }

      if (normalizedName) {
        if (programNames.has(normalizedName)) {
          duplicateProgramNames.add(programa.nombre_programa);
        }
        programNames.add(normalizedName);
      }

      if (!programa.nombre_corto) {
        errors.push(`PROGRAMAS fila ${row}: falta nombre_corto.`);
      } else if (programa.nombre_corto.length > 30) {
        errors.push(
          `PROGRAMAS fila ${row}: nombre_corto supera 30 caracteres.`,
        );
      }

      if (
        !ImportValidator.TIPOS_PROGRAMA.has(
          programa.tipo_programa.toLowerCase().trim(),
        )
      ) {
        errors.push(
          `PROGRAMAS fila ${row}: tipo_programa "${programa.tipo_programa}" no es válido.`,
        );
      }

      if (
        !ImportValidator.FACULTADES.has(
          programa.codigo_facultad.toLowerCase().trim(),
        )
      ) {
        errors.push(
          `PROGRAMAS fila ${row}: codigo_facultad "${programa.codigo_facultad}" no es válido.`,
        );
      }

      if (
        !ImportValidator.MODALIDADES_PROGRAMA.has(
          programa.modalidad_principal.toLowerCase().trim(),
        )
      ) {
        errors.push(
          `PROGRAMAS fila ${row}: modalidad_principal "${programa.modalidad_principal}" no es válida.`,
        );
      }

      if (
        !Number.isInteger(programa.horas_base_por_credito) ||
        programa.horas_base_por_credito <= 0
      ) {
        errors.push(
          `PROGRAMAS fila ${row}: horas_base_por_credito debe ser un entero positivo.`,
        );
      }

      if (
        programa.horas_pregrado_central !== null &&
        (!Number.isInteger(programa.horas_pregrado_central) ||
          programa.horas_pregrado_central <= 0)
      ) {
        errors.push(
          `PROGRAMAS fila ${row}: horas_pregrado_central debe estar vacía o ser un entero positivo.`,
        );
      }

      if (!ImportValidator.isBooleanLike(programa.activo)) {
        errors.push(
          `PROGRAMAS fila ${row}: activo debe ser TRUE/FALSE, SI/NO o 1/0.`,
        );
      }
    });

    if (duplicateProgramCodes.size > 0) {
      errors.push(
        `PROGRAMAS: códigos duplicados: ${Array.from(duplicateProgramCodes).join(', ')}.`,
      );
    }
    if (duplicateProgramNames.size > 0) {
      warnings.push(
        `PROGRAMAS: nombres repetidos: ${Array.from(duplicateProgramNames).join(', ')}.`,
      );
    }

    const assignmentCodes = new Set<string>();
    const duplicateAssignmentCodes = new Set<string>();
    const missingProgramReferences = new Set<string>();
    const invalidAssignmentModalities = new Set<string>();
    const invalidSemesters = new Set<string>();
    const invalidExceptions = new Set<string>();

    asignaturas.forEach((asignatura, index) => {
      const row = index + 2;
      const code = asignatura.codigo_asignatura.trim();
      const normalizedCode = code.toLowerCase();

      if (!code) {
        errors.push(`ASIGNATURAS fila ${row}: falta codigo_asignatura.`);
      } else {
        if (code.length > 20) {
          errors.push(
            `ASIGNATURAS fila ${row}: codigo_asignatura supera 20 caracteres.`,
          );
        }
        if (assignmentCodes.has(normalizedCode)) {
          duplicateAssignmentCodes.add(code);
        }
        assignmentCodes.add(normalizedCode);
      }

      if (!asignatura.nombre_asignatura) {
        errors.push(`ASIGNATURAS fila ${row}: falta nombre_asignatura.`);
      } else if (asignatura.nombre_asignatura.length > 200) {
        errors.push(
          `ASIGNATURAS fila ${row}: nombre_asignatura supera 200 caracteres.`,
        );
      }

      if (
        !Number.isInteger(asignatura.creditos) ||
        asignatura.creditos < 1 ||
        asignatura.creditos > 20
      ) {
        errors.push(
          `ASIGNATURAS fila ${row}: creditos debe ser un entero entre 1 y 20.`,
        );
      }

      if (
        !Number.isFinite(asignatura.horas_clase) ||
        asignatura.horas_clase < 0
      ) {
        errors.push(
          `ASIGNATURAS fila ${row}: horas_clase debe ser un número mayor o igual a cero.`,
        );
      }
      if (
        !Number.isFinite(asignatura.horas_pta) ||
        asignatura.horas_pta < 0
      ) {
        errors.push(
          `ASIGNATURAS fila ${row}: horas_pta debe ser un número mayor o igual a cero.`,
        );
      }

      const modality = asignatura.modalidad.toLowerCase().trim();
      if (!ImportValidator.MODALIDADES_ASIGNATURA.has(modality)) {
        invalidAssignmentModalities.add(asignatura.modalidad || '(vacío)');
      }

      const semester = asignatura.semestre.toLowerCase().trim();
      if (!ImportValidator.SEMESTRES.has(semester)) {
        invalidSemesters.add(asignatura.semestre || '(vacío)');
      }

      if (!asignatura.nucleo_tematico) {
        errors.push(`ASIGNATURAS fila ${row}: falta nucleo_tematico.`);
      }

      const programCode = asignatura.codigo_programa.toLowerCase().trim();
      if (!programCodes.has(programCode)) {
        missingProgramReferences.add(
          asignatura.codigo_programa || '(vacío)',
        );
      }

      if (
        !ImportValidator.FACULTADES.has(
          asignatura.codigo_facultad.toLowerCase().trim(),
        )
      ) {
        errors.push(
          `ASIGNATURAS fila ${row}: codigo_facultad "${asignatura.codigo_facultad}" no es válido.`,
        );
      }

      if (
        asignatura.tipo_excepcion &&
        !ImportValidator.TIPOS_EXCEPCION.has(
          asignatura.tipo_excepcion.toLowerCase().trim(),
        )
      ) {
        invalidExceptions.add(asignatura.tipo_excepcion);
      }

      if (
        !ImportValidator.isBooleanLike(
          asignatura.requiere_revision_modalidad,
        )
      ) {
        errors.push(
          `ASIGNATURAS fila ${row}: requiere_revision_modalidad debe ser TRUE/FALSE, SI/NO o 1/0.`,
        );
      }
      if (!ImportValidator.isBooleanLike(asignatura.activa)) {
        errors.push(
          `ASIGNATURAS fila ${row}: activa debe ser TRUE/FALSE, SI/NO o 1/0.`,
        );
      }
    });

    if (duplicateAssignmentCodes.size > 0) {
      errors.push(
        `ASIGNATURAS: códigos duplicados: ${Array.from(duplicateAssignmentCodes).join(', ')}.`,
      );
    }
    if (invalidAssignmentModalities.size > 0) {
      errors.push(
        `ASIGNATURAS: modalidades no soportadas: ${Array.from(invalidAssignmentModalities).join(', ')}.`,
      );
    }
    if (invalidSemesters.size > 0) {
      errors.push(
        `ASIGNATURAS: semestres no soportados: ${Array.from(invalidSemesters).join(', ')}.`,
      );
    }
    if (missingProgramReferences.size > 0) {
      errors.push(
        `ASIGNATURAS: programas inexistentes en la hoja PROGRAMAS: ${Array.from(missingProgramReferences).join(', ')}.`,
      );
    }
    if (invalidExceptions.size > 0) {
      errors.push(
        `ASIGNATURAS: tipos de excepción no soportados: ${Array.from(invalidExceptions).join(', ')}.`,
      );
    }

    if (matrizProgramCodes.length > 0) {
      const matrixCodes = new Set(
        matrizProgramCodes.map((code) => code.toLowerCase().trim()),
      );
      const missingInMatrix = [...programCodes].filter(
        (code) => !matrixCodes.has(code),
      );
      const missingInPrograms = [...matrixCodes].filter(
        (code) => !programCodes.has(code),
      );

      if (missingInMatrix.length > 0) {
        errors.push(
          `MATRIZ_OFERTA: faltan columnas para estos programas: ${missingInMatrix.join(', ')}.`,
        );
      }
      if (missingInPrograms.length > 0) {
        errors.push(
          `MATRIZ_OFERTA: hay columnas de programas que no existen en PROGRAMAS: ${missingInPrograms.join(', ')}.`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validarCircular003(
    asignaturas: AsignaturaRow[],
    programas: ProgramaRow[],
  ): string[] {
    const warnings: string[] = [];
    const programaMap = new Map<string, ProgramaRow>();

    for (const programa of programas) {
      programaMap.set(
        programa.nombre_programa.toLowerCase().trim(),
        programa,
      );
      programaMap.set(
        programa.codigo_programa.toLowerCase().trim(),
        programa,
      );
    }

    for (const asignatura of asignaturas) {
      const programa = programaMap.get(
        asignatura.codigo_programa.toLowerCase().trim(),
      );
      if (!programa) continue;

      const horasPtaEsperadas = HorasPtaCalculator.calcularHorasPTA(
        {
          creditos: asignatura.creditos,
          tipoExcepcion: asignatura.tipo_excepcion,
        },
        {
          horasBasePorCredito: programa.horas_base_por_credito,
          horasPregradoCentral: programa.horas_pregrado_central,
        },
      );

      if (asignatura.horas_pta !== horasPtaEsperadas) {
        warnings.push(
          `Desviación de horas PTA en ${asignatura.codigo_asignatura} (${asignatura.nombre_asignatura}): ` +
            `se esperaban ${horasPtaEsperadas} horas según Circular 003 y el archivo contiene ${asignatura.horas_pta}.`,
        );
      }
    }

    return warnings;
  }

  private static isBooleanLike(value: unknown): boolean {
    if (typeof value === 'boolean') return true;
    if (value === 1 || value === 0) return true;
    const normalized = String(value ?? '').trim().toLowerCase();
    return [
      'true',
      'false',
      'si',
      'sí',
      'no',
      '1',
      '0',
      'activo',
      'inactivo',
    ].includes(normalized);
  }
}
