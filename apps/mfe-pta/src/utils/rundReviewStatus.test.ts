import { describe, expect, it } from 'vitest';
import { RUND_REQUIRED_BLOCKS, rundReviewStatus } from './rundReviewStatus';

const approvedBlocks = () => Object.fromEntries(RUND_REQUIRED_BLOCKS.map(block => [block, 'Aprobado']));

describe('Estado documental RUND y excepción de Contacto', () => {
  it('aprueba las cinco secciones documentales sin exigir Contacto', () => {
    expect(rundReviewStatus({ ...approvedBlocks(), CONTACTO: 'Pendiente' })).toMatchObject({ approved: true, count: 5, total: 5 });
  });
  it.each(RUND_REQUIRED_BLOCKS)('retira el aprobado si %s requiere otra revisión', block => {
    expect(rundReviewStatus({ ...approvedBlocks(), [block]: 'En revisión' })).toMatchObject({ approved: false, count: 4 });
  });
  it.each([...RUND_REQUIRED_BLOCKS, 'CONTACTO'])('conserva las correcciones solicitadas en %s', block => {
    expect(rundReviewStatus({ ...approvedBlocks(), [block]: 'Devuelto' })).toMatchObject({ approved: false, returned: true, label: 'Pendiente de corrección' });
  });
  it('no considera aprobado un perfil sin resumen o con bloques desconocidos', () => {
    expect(rundReviewStatus().approved).toBe(false);
    expect(rundReviewStatus({ CONTACTO: 'Aprobado', OTRO: 'Aprobado' })).toMatchObject({ approved: false, count: 0, total: 5 });
  });
});
