import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: { laborales: {}, plantilla: {} },
}));

import { formatAssociationDate } from './LaborFunctionsManager';

/**
 * Las fechas laborales representan un DÍA, no un instante. Guardadas como
 * 'YYYY-MM-DD' o como timestamp a medianoche UTC, al formatearlas en horario de
 * Bogotá (UTC-5) retrocedían un día: una vinculación del 14/05/2024 se mostraba
 * como 13/05/2024 en los modales.
 */
describe('formatAssociationDate — sin desfase de día', () => {
  it('conserva el día de una fecha sin hora', () => {
    expect(formatAssociationDate('2024-05-14')).toBe('14/05/2024');
  });

  it('conserva el día de un timestamp a medianoche UTC', () => {
    expect(formatAssociationDate('2025-05-01T00:00:00.000Z')).toBe('01/05/2025');
  });

  it('reproduce los casos reales que salían corridos', () => {
    // MIGUEL: hiring_date 2024-05-14 se veía como 13/05/2024.
    expect(formatAssociationDate('2024-05-14')).toBe('14/05/2024');
    // DIANA: hiring_date 2025-05-01 se veía como 30/04/2025.
    expect(formatAssociationDate('2025-05-01')).toBe('01/05/2025');
  });

  it('no corre el día en un primero de mes', () => {
    expect(formatAssociationDate('2025-04-01')).toBe('01/04/2025');
    expect(formatAssociationDate('2026-01-01')).toBe('01/01/2026');
  });

  it('respeta un timestamp con hora real', () => {
    // 09:06 UTC = 04:06 en Bogotá, mismo día.
    expect(formatAssociationDate('2026-04-15T09:06:34.000Z')).toBe('15/04/2026');
  });

  it('devuelve guion cuando no hay fecha o es inválida', () => {
    expect(formatAssociationDate(null)).toBe('—');
    expect(formatAssociationDate(undefined)).toBe('—');
    expect(formatAssociationDate('')).toBe('—');
    expect(formatAssociationDate('no-es-fecha')).toBe('—');
  });
});
