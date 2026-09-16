import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * EFDS-1374 :: AC-02 :: RN-07 es confidencialidad en el DTO, no en la UI.
 *
 * Canario ESTRUCTURAL: la disponibilidad de un aula no debe seleccionar id_grupo,
 * asignatura ni docente. Si alguien agrega esos campos a la consulta "para la
 * UI", este test lo delata — es el mismo criterio que ya se aplicó al mensaje de
 * cruce de 1372, extendido al aula.
 */
describe('EFDS-1374 :: RN-07 :: la disponibilidad de aula no revela quién la ocupa', () => {
  const fuente = readFileSync(join(__dirname, 'aulas.service.ts'), 'utf8');

  // Aísla el cuerpo del método disponibilidad para inspeccionar su SELECT.
  const cuerpo = (() => {
    const i = fuente.indexOf('async disponibilidad');
    const j = fuente.indexOf('async publicarGrupo');
    return fuente.slice(i, j);
  })();

  it('el SELECT de ocupación NO trae id_grupo', () => {
    expect(cuerpo).not.toMatch(/id_grupo/);
  });

  it('el SELECT de ocupación NO trae asignatura ni programa', () => {
    expect(cuerpo.toLowerCase()).not.toMatch(/asignatura|programa|id_asignatura/);
  });

  it('el SELECT de ocupación NO trae docente', () => {
    expect(cuerpo.toLowerCase()).not.toMatch(/docente|id_docente|id_person/);
  });

  it('sí trae día y hora (lo único que puede viajar)', () => {
    expect(cuerpo).toMatch(/dia_semana/);
    expect(cuerpo).toMatch(/hora_inicio/);
    expect(cuerpo).toMatch(/hora_fin/);
  });
});
