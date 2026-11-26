import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { EmitirAdendaDto } from './adendas.dto';

/**
 * La adenda viaja en multipart con su documento: las fechas del cronograma que
 * mueve llegan como JSON en un campo de texto (139, EFDS-1152).
 */
describe('EmitirAdendaDto · fechas del cronograma', () => {
  const armar = (cambios: unknown) =>
    plainToInstance(EmitirAdendaDto, {
      tipo: 'CRONOGRAMA',
      objeto: 'Se amplía el plazo de subsanaciones',
      cambiosCronograma: cambios,
    });

  it('lee las fechas que llegan como JSON del multipart', async () => {
    const dto = armar(JSON.stringify([{ ambito: 'ACTIVIDAD', clave: '6.6', fechaFin: '2026-12-15' }]));
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.cambiosCronograma).toEqual([expect.objectContaining({ ambito: 'ACTIVIDAD', clave: '6.6', fechaFin: '2026-12-15' })]);
  });

  it('rechaza una fecha mal formada o un ámbito que no existe', async () => {
    const errores = await validate(
      armar(JSON.stringify([{ ambito: 'PROCESO', clave: '6.6', fechaFin: '15/12/2026' }])),
    );
    expect(errores).toHaveLength(1);
    expect(JSON.stringify(errores[0])).toMatch(/etapa o de una actividad/);
    expect(JSON.stringify(errores[0])).toMatch(/AAAA-MM-DD/);
  });
});
