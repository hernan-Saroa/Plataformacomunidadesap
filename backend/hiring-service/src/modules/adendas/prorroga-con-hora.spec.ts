import { BadRequestException } from '@nestjs/common';

import { AdendasService } from './adendas.service';

/**
 * La adenda de cronograma extiende el cierre de ofertas con su hora (revisión
 * de QA de EFDS-1155): pasarlo de las 10:00 a las 17:00 del mismo día también
 * es prorrogarlo, y adelantarlo no.
 */
describe('AdendasService · prórroga del cierre con hora', () => {
  const service = new AdendasService({} as any, {} as any, {} as any);
  const validar = (nuevo: string, hora: string | null, ventana: Record<string, unknown>) =>
    (service as any).validarNuevoVencimiento(nuevo, hora, {
      publicacion: { fechaPublicacion: '2026-10-01' },
      ...ventana,
    });

  const cierre = { vencimiento: '2026-10-15', hora: '10:00:00' };

  it('admite el mismo día a una hora posterior', () => {
    expect(() => validar('2026-10-15', '17:00', cierre)).not.toThrow();
  });

  it('rechaza el mismo día a una hora anterior', () => {
    expect(() => validar('2026-10-15', '09:00', cierre)).toThrow(BadRequestException);
  });

  it('sin hora conserva la del cronograma: el mismo día no prorroga', () => {
    expect(() => validar('2026-10-15', null, cierre)).toThrow(BadRequestException);
    expect(() => validar('2026-10-16', null, cierre)).not.toThrow();
  });

  it('el plazo de observaciones, sin hora, se sigue comparando por día', () => {
    const observaciones = { vencimiento: '2026-10-15', hora: null };
    expect(() => validar('2026-10-15', null, observaciones)).toThrow(BadRequestException);
    expect(() => validar('2026-10-16', null, observaciones)).not.toThrow();
  });
});
