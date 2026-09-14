import {
  contarDiasHabiles,
  diasHabilesRestantes,
  esDiaHabil,
  estadoDelPlazo,
  sumarDiasHabiles,
} from './dias-habiles';

/**
 * Festivos que tocan los casos de prueba. No es el calendario completo: cada
 * test dice qué festivo está ejercitando, y meter los treinta y seis de 2026 y
 * 2027 escondería cuál es el que mueve la fecha.
 */
const FESTIVOS = new Set([
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-08-07', // Batalla de Boyacá (viernes, fecha fija)
  '2026-12-25', // Navidad (viernes)
  '2027-01-01', // Año Nuevo (viernes)
]);

/** Semana de septiembre de 2026 sin festivos: el caso base. */
describe('sumarDiasHabiles', () => {
  it('cuenta los 10 días hábiles de la licitación pública', () => {
    // Lunes 7 de septiembre de 2026, sin festivos de por medio. El día de la
    // publicación no cuenta: el conteo arranca al día siguiente.
    expect(sumarDiasHabiles('2026-09-07', 10, FESTIVOS)).toBe('2026-09-21');
  });

  it('salta el fin de semana cuando se publica en viernes', () => {
    // Viernes 11 → el primer día hábil del plazo es el lunes 14.
    expect(sumarDiasHabiles('2026-09-11', 5, FESTIVOS)).toBe('2026-09-18');
  });

  it('salta semana santa', () => {
    // Sin jueves y viernes santo el vencimiento caería el 6 de abril. Contar
    // esos dos días correría el plazo dos días hábiles antes de lo debido.
    expect(sumarDiasHabiles('2026-03-30', 5, FESTIVOS)).toBe('2026-04-08');
    expect(esDiaHabil('2026-04-02', FESTIVOS)).toBe(false);
  });

  it('cruza el fin de año con sus dos festivos', () => {
    // Navidad (viernes 25) y Año Nuevo (viernes 1) caen dentro del plazo.
    expect(sumarDiasHabiles('2026-12-23', 8, FESTIVOS)).toBe('2027-01-06');
  });

  it('devuelve la misma fecha si no hay plazo que contar', () => {
    expect(sumarDiasHabiles('2026-09-07', 0, FESTIVOS)).toBe('2026-09-07');
  });

  it('no se corre un día por la zona horaria del servidor', () => {
    // Con aritmética de Date local, un servidor al oeste de UTC devuelve el día
    // anterior. Un día de diferencia es un plazo legal incumplido.
    expect(sumarDiasHabiles('2026-09-07', 1, FESTIVOS)).toBe('2026-09-08');
  });
});

/**
 * Contar y sumar tienen que ser inversas: una calcula el vencimiento y la otra
 * los días que faltan. Si se desfasaran, el contador de la pantalla no llegaría
 * a cero el día correcto.
 */
describe('contarDiasHabiles', () => {
  it('es la inversa de sumarDiasHabiles', () => {
    for (const desde of ['2026-03-30', '2026-09-07', '2026-09-11', '2026-12-23']) {
      for (const dias of [1, 5, 10, 20]) {
        const vencimiento = sumarDiasHabiles(desde, dias, FESTIVOS);
        expect(contarDiasHabiles(desde, vencimiento, FESTIVOS)).toBe(dias);
      }
    }
  });

  it('no cuenta hacia atrás', () => {
    expect(contarDiasHabiles('2026-09-21', '2026-09-07', FESTIVOS)).toBe(0);
    expect(contarDiasHabiles('2026-09-07', '2026-09-07', FESTIVOS)).toBe(0);
  });
});

describe('diasHabilesRestantes', () => {
  it('cuenta lo que falta mientras el plazo corre', () => {
    expect(diasHabilesRestantes('2026-09-14', '2026-09-21', FESTIVOS)).toBe(5);
  });

  it('da cero el día del vencimiento', () => {
    expect(diasHabilesRestantes('2026-09-21', '2026-09-21', FESTIVOS)).toBe(0);
  });

  it('da negativo cuando ya venció', () => {
    // "Venció hace tres días" y "vence hoy" no son la misma noticia para quien
    // gestiona el proceso, así que el signo se conserva.
    expect(diasHabilesRestantes('2026-09-24', '2026-09-21', FESTIVOS)).toBe(-3);
  });
});

describe('estadoDelPlazo', () => {
  it('avisa cuando quedan dos días o menos', () => {
    expect(estadoDelPlazo(5)).toBe('VIGENTE');
    expect(estadoDelPlazo(3)).toBe('VIGENTE');
    expect(estadoDelPlazo(2)).toBe('POR_VENCER');
    expect(estadoDelPlazo(0)).toBe('POR_VENCER');
  });

  it('distingue vencido de por vencer', () => {
    expect(estadoDelPlazo(-1)).toBe('VENCIDO');
  });

  it('sin plazo parametrizado no inventa un estado', () => {
    // La modalidad puede no tener plazo definido todavía (EFDS-1385). Decirlo
    // es distinto de decir que está vigente.
    expect(estadoDelPlazo(null)).toBe('SIN_PLAZO');
  });
});

