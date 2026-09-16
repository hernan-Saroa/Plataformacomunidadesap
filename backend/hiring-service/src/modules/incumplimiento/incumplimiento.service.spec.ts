import { admiteReporteIncumplimiento } from './incumplimiento.service';

/**
 * Criterio de EFDS-1180: «dado un contrato en ejecución, cuando el supervisor
 * reporta un presunto incumplimiento, entonces el sistema registra el reporte
 * e inicia el caso en el módulo de incumplimiento».
 *
 * La regla es la misma del seguimiento (EFDS-1168) y por el mismo motivo: las
 * dos hablan de lo que ocurre mientras el contrato se ejecuta. Antes de la
 * reunión de inicio no ha corrido plazo que incumplir, y reportar ahí acusaría
 * al contratista de no cumplir algo que todavía no tenía que estar cumpliendo.
 */
describe('admiteReporteIncumplimiento', () => {
  it('un contrato en ejecución admite que se le reporte', () => {
    expect(admiteReporteIncumplimiento('EJECUCION')).toBe(true);
  });

  it('uno legalizado todavía no: le falta la reunión de inicio', () => {
    // Legalizado es tener las coberturas en firme, no haber empezado. No hay
    // obligación vencida de la que responder.
    expect(admiteReporteIncumplimiento('LEGALIZADO')).toBe(false);
  });

  it('ni uno apenas suscrito', () => {
    expect(admiteReporteIncumplimiento('PERFECCIONADO')).toBe(false);
  });

  it('ni antes de las firmas', () => {
    // Sin contrato firmado no hay obligación que incumplir, solo una minuta.
    expect(admiteReporteIncumplimiento('GENERADO')).toBe(false);
    expect(admiteReporteIncumplimiento('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteReporteIncumplimiento('RECHAZADO')).toBe(false);
  });
});
