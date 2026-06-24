import { AsignaturaEntity } from './entities/asignatura.entity';
import { ProgramaEntity } from './entities/programa.entity';

/**
 * Calculadora de horas de PTA según la Circular Dispositiva 003 de 2025 (Tabla 1).
 * Esta lógica calcula las horas clase e impacto final en el PTA (horas totales = horas clase * 3).
 */
export class HorasPtaCalculator {
  /**
   * Calcula las horas totales del PTA para una asignatura y programa específicos.
   * Aplica las excepciones de la Circular 003 y multiplicadores de créditos.
   *
   * @param asignatura - La asignatura del catálogo
   * @param programa - El programa académico al que pertenece la asignatura
   * @returns El total de horas asignadas en el PTA
   */
  static calcularHorasPTA(
    asignatura: { creditos: number; tipoExcepcion?: string | null; horasFijasPta?: number | null },
    programa: { horasBasePorCredito: number; horasPregradoCentral?: number | null }
  ): number {
    // 1. Excepciones con horas fijas (Circular 003)
    if (asignatura.tipoExcepcion === 'seminario_enfasis') return 384;
    if (asignatura.tipoExcepcion === 'opciones_grado_ap') return 20;
    if (asignatura.tipoExcepcion === 'seminario_opciones_apt') return 144;

    // 2. Pregrados centrales con horas fijas de clase (por ejemplo, AP_Diurno/Nocturno/Economía Pública: 64h de clase)
    if (programa.horasPregradoCentral !== null && programa.horasPregradoCentral !== undefined) {
      return programa.horasPregradoCentral * 3;
    }

    // 3. Resto de asignaturas: créditos * factor * 3 (el factor 16 o 12 viene parametrizado en la base de datos)
    const factor = programa.horasBasePorCredito || 16;
    return asignatura.creditos * factor * 3;
  }
}
