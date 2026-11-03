import { ConflictException } from '@nestjs/common';

import { CdpService, NUMERAL_CARGUE_CDP } from './cdp.service';
import { Cdp } from '../../entities/cdp.entity';
import { Proceso } from '../../entities/proceso.entity';

/**
 * Desde la 103 el CDP se tramita por fuera y el área lo carga en la 4.2. Lo
 * que se fija aquí es que la llamada única deja el certificado completo
 * —estado, datos y soporte— y cierra solo la 4.2.
 */
describe('CdpService.cargar', () => {
  const acceso = { userId: 'u-1', userName: 'ana.area@esap.edu.co' } as any;
  const soporte = {
    archivo: { filename: 'abc.pdf', originalname: 'cdp.pdf', mimetype: 'application/pdf', size: 10 },
    hash: 'hash',
  };
  const dto = { numero: 'CDP-12', valor: 1_500_000, fechaExpedicion: '2026-10-05', rubro: 'A-02' };

  const montar = (existente: Partial<Cdp> | null) => {
    const cdp = existente
      ? ({ id: 'cdp-1', procesoId: 'p-1', rubro: null, documentoId: null, ...existente } as unknown as Cdp)
      : null;
    const proceso = { id: 'p-1', modalidad: 'MINIMA_CUANTIA', valorEstimado: 2_000_000, etapa: 4 } as Proceso;
    const trazas: string[] = [];
    const guardados: any[] = [];

    const em: any = {
      getRepository: (entidad: unknown) => ({
        findOne: async () => (entidad === Proceso ? proceso : entidad === Cdp ? cdp : null),
        find: async () => [],
        count: async () => 0,
      }),
      findOne: async () => ({ id: 'exp-1' }),
      create: (_: unknown, datos: any) => ({ ...datos }),
      save: async (a: any, b?: any) => {
        const guardado = b ?? a;
        if (guardado?.accion) trazas.push(guardado.accion);
        else guardados.push(guardado);
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
    return { service, cdp, cierre, trazas, guardados };
  };

  it('sin CDP previo, lo crea expedido y con el soporte vinculado', async () => {
    const { service, cierre, trazas } = montar(null);

    const r = await service.cargar('p-1', dto, soporte, acceso);

    expect(r).toMatchObject({
      estado: 'EXPEDIDO',
      origen: 'ETAPA_4',
      numero: 'CDP-12',
      valor: 1_500_000,
      rubro: 'A-02',
      vigenciaFiscal: 2026,
      expedidoPor: 'ana.area@esap.edu.co',
      documentoId: 'doc-1',
    });
    expect(trazas).toEqual(['EXPEDIR', 'ADJUNTAR']);
    expect(cierre.resolverCierre).toHaveBeenCalledTimes(1);
    expect(cierre.resolverCierre.mock.calls[0][2]).toBe(NUMERAL_CARGUE_CDP);
    // Por debajo del estimado: se dice, no se bloquea.
    expect(r.cubreValorEstimado).toBe(false);
  });

  it('completa la solicitud que quedó de antes de la 103', async () => {
    const { service, cdp } = montar({ estado: 'SOLICITADO', origen: 'ETAPA_4' });

    await service.cargar('p-1', dto, soporte, acceso);

    expect(cdp).toMatchObject({ estado: 'EXPEDIDO', numero: 'CDP-12', rubro: 'A-02' });
  });

  it('no carga otro encima de uno ya cargado', async () => {
    const { service, cierre } = montar({ estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' });

    await expect(service.cargar('p-1', dto, soporte, acceso)).rejects.toBeInstanceOf(ConflictException);
    expect(cierre.resolverCierre).not.toHaveBeenCalled();
  });
});
