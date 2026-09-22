import { plazoDeActividad } from './plazos-actividad';

/**
 * El plazo de una actividad en días hábiles (EFDS-1183).
 *
 * Septiembre de 2026: el 14 es lunes y no hay festivos en la semana.
 */
describe('plazoDeActividad', () => {
  it('cuenta días hábiles desde el día en que le tocó, sin el fin de semana', () => {
    // Le tocó el jueves 10: cinco días hábiles son vie 11, lun 14, mar 15, mié 16 y jue 17.
    expect(plazoDeActividad('2026-09-10', 5, 2, '2026-09-11').vence).toBe('2026-09-17');
  });

  it('no cuenta los festivos', () => {
    // El lunes 12 de octubre de 2026 es festivo: del viernes 9, un día hábil es el martes 13.
    expect(plazoDeActividad('2026-10-09', 1, 0, '2026-10-09').vence).toBe('2026-10-13');
  });

  it('con tiempo de sobra está vigente', () => {
    expect(plazoDeActividad('2026-09-10', 10, 2, '2026-09-11').estado).toBe('VIGENTE');
  });

  it('a los días de aviso configurados pasa a por vencer', () => {
    const plazo = plazoDeActividad('2026-09-10', 5, 2, '2026-09-15');
    expect(plazo).toMatchObject({ estado: 'POR_VENCER', restantes: 2 });
  });

  it('el mismo día que vence todavía no está vencido', () => {
    expect(plazoDeActividad('2026-09-10', 5, 2, '2026-09-17')).toMatchObject({ estado: 'POR_VENCER', restantes: 0 });
  });

  it('pasado el último día está vencido, con los días hábiles que lleva', () => {
    expect(plazoDeActividad('2026-09-10', 5, 2, '2026-09-21')).toMatchObject({ estado: 'VENCIDO', restantes: -2 });
  });

  it('sin días de aviso configurados avisa a dos días hábiles, como el resto del módulo', () => {
    expect(plazoDeActividad('2026-09-10', 5, null, '2026-09-15').estado).toBe('POR_VENCER');
    expect(plazoDeActividad('2026-09-10', 5, null, '2026-09-14').estado).toBe('VIGENTE');
  });
});
