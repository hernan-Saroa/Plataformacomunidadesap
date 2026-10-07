import { BadRequestException } from '@nestjs/common';

import { CdpService, NUMERAL_EXPEDICION_CDP } from './cdp.service';
import { Cdp } from '../../entities/cdp.entity';
import { Proceso } from '../../entities/proceso.entity';

/**
 * Desde la 096 la Financiera verifica, expide y adjunta el CDP en la 4.2, con
 * una sola confirmación. Lo que se fija aquí es que la llamada única deja el
 * certificado completo —estado, datos y soporte— y cierra solo la 4.2.
 */
describe('CdpService.expedirConSoporte', () => {
  const acceso = { userId: 'u-1', userName: 'marta.ruiz@esap.edu.co' } as any;
  const archivo = { filename: 'abc.pdf', originalname: 'cdp.pdf', mimetype: 'application/pdf', size: 10 };
  const dto = { numero: 'CDP-12', valor: 1_500_000, fechaExpedicion: '2026-10-05', rubro: 'A-02' };

  const montar = (estado: 'SOLICITADO' | 'VERIFICADO', rubro: string | null = null) => {
    const cdp = { id: 'cdp-1', procesoId: 'p-1', estado, rubro, documentoId: null } as unknown as Cdp;
    const proceso = { id: 'p-1', modalidad: 'MINIMA_CUANTIA', valorEstimado: 2_000_000 } as Proceso;
    const trazas: string[] = [];

    const em: any = {
      getRepository: (entidad: unknown) => ({
        findOne: async () => (entidad === Proceso ? proceso : entidad === Cdp ? cdp : null),
      }),
      findOne: async () => ({ id: 'exp-1' }),
      create: (_: unknown, datos: any) => datos,
      save: async (a: any, b?: any) => {
        const guardado = b ?? a;
        if (guardado?.accion) trazas.push(guardado.accion);
        if (guardado?.archivoUrl) return { ...guardado, id: 'doc-1' };
        return guardado;
      },
    };
    const cierre = {
      exigeFirma: jest.fn().mockResolvedValue(false),
      exigirFirmaValida: jest.fn(),
      resolverCierre: jest.fn().mockResolvedValue({ estado: 'APROBADO', cierra: true }),
    };
    const dataSource: any = { transaction: (fn: any) => fn(em), manager: em };
    const service = new CdpService(dataSource, cierre as any, {} as any);
    return { service, cdp, cierre, trazas };
  };

  it('de solicitado a expedido, con el soporte vinculado, en una sola llamada', async () => {
    const { service, cdp, cierre, trazas } = montar('SOLICITADO');

    const r = await service.expedirConSoporte('p-1', dto, archivo, 'hash', acceso);

    expect(cdp).toMatchObject({
      estado: 'EXPEDIDO',
      numero: 'CDP-12',
      valor: 1_500_000,
      rubro: 'A-02',
      documentoId: 'doc-1',
    });
    expect(trazas).toEqual(['VERIFICAR', 'EXPEDIR', 'ADJUNTAR']);
    expect(cierre.resolverCierre).toHaveBeenCalledTimes(1);
    expect(cierre.resolverCierre.mock.calls[0][2]).toBe(NUMERAL_EXPEDICION_CDP);
    // Por debajo del estimado: se dice, no se bloquea.
    expect(r.cubreValorEstimado).toBe(false);
  });

  it('un CDP que ya venía verificado no se vuelve a verificar', async () => {
    const { service, cdp, trazas } = montar('VERIFICADO', 'A-01');

    await service.expedirConSoporte('p-1', { ...dto, rubro: undefined } as any, archivo, 'hash', acceso);

    expect(cdp.estado).toBe('EXPEDIDO');
    expect(cdp.rubro).toBe('A-01');
    expect(trazas).toEqual(['EXPEDIR', 'ADJUNTAR']);
  });

  it('sin rubro no expide', async () => {
    const { service, cdp } = montar('SOLICITADO');

    await expect(
      service.expedirConSoporte('p-1', { ...dto, rubro: '  ' }, archivo, 'hash', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cdp.estado).toBe('SOLICITADO');
  });
});
