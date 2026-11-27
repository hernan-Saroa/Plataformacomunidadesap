import { ConflictException } from '@nestjs/common';

import { CdpService, NUMERAL_CARGUE_CDP } from './cdp.service';
import { Cdp, respaldoDeLosCdp } from '../../entities/cdp.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';

/**
 * Desde la 103 el CDP se tramita por fuera y el área lo carga en la 4.2. Lo
 * que se fija aquí es que la llamada deja el certificado completo —estado,
 * datos y soporte— y cierra solo la 4.2; y, desde la 152, que mientras la 4.2
 * siga en manos del área se pueden cargar uno o más.
 */
describe('CdpService.cargar', () => {
  const acceso = { userId: 'u-1', userName: 'ana.area@esap.edu.co' } as any;
  const soporte = {
    archivo: { filename: 'abc.pdf', originalname: 'cdp.pdf', mimetype: 'application/pdf', size: 10 },
    hash: 'hash',
  };
  const dto = { numero: 'CDP-12', valor: 1_500_000, fechaExpedicion: '2026-10-05', rubro: 'A-02' };

  const montar = (existentes: Partial<Cdp>[] = [], cargue: string | null = 'BORRADOR') => {
    const cdps = existentes.map(
      (e, i) =>
        ({ id: `cdp-${i + 1}`, procesoId: 'p-1', rubro: null, documentoId: null, ...e }) as unknown as Cdp,
    );
    const proceso = { id: 'p-1', modalidad: 'MINIMA_CUANTIA', valorEstimado: 2_000_000, etapa: 4 } as Proceso;
    const actividad = cargue ? { numeral: NUMERAL_CARGUE_CDP, estado: cargue } : null;
    const trazas: string[] = [];
    const guardados: any[] = [];

    const em: any = {
      getRepository: (entidad: unknown) => ({
        findOne: async () =>
          entidad === Proceso ? proceso : entidad === ProcesoActividad ? actividad : null,
        // Lo que está en curso: lo de antes y lo que se haya guardado aquí.
        find: async () =>
          entidad === Cdp
            ? [...cdps, ...guardados.filter((g) => g?.estado && !cdps.includes(g))].filter((c) =>
                ['SOLICITADO', 'VERIFICADO', 'EXPEDIDO'].includes(c.estado),
              )
            : [],
        count: async () => 0,
      }),
      findOne: async () => ({ id: 'exp-1' }),
      create: (_: unknown, datos: any) => ({ ...datos }),
      save: async (a: any, b?: any) => {
        const guardado = b ?? a;
        if (guardado?.accion) trazas.push(guardado.accion);
        else if (!guardados.includes(guardado)) guardados.push(guardado);
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
    const alcance = { puedeEn: jest.fn().mockResolvedValue(true) };
    const service = new CdpService(dataSource, cierre as any, alcance as any);
    jest.spyOn(service, 'aplicaCdp').mockResolvedValue(true);
    jest.spyOn(service, 'instanciarEtapa4').mockResolvedValue([]);
    return { service, cdps, cierre, trazas, guardados };
  };

  it('sin CDP previo, lo crea expedido y con el soporte vinculado', async () => {
    const { service, cierre, trazas } = montar();

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
    const { service, cdps } = montar([{ estado: 'SOLICITADO', origen: 'ETAPA_4' }]);

    await service.cargar('p-1', dto, soporte, acceso);

    expect(cdps[0]).toMatchObject({ estado: 'EXPEDIDO', numero: 'CDP-12', rubro: 'A-02' });
  });

  it('con la 4.2 ya enviada, no carga otro', async () => {
    const { service, cierre } = montar(
      [{ estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3', numero: 'CDP-1' }],
      'APROBADO',
    );

    await expect(service.cargar('p-1', dto, soporte, acceso)).rejects.toBeInstanceOf(ConflictException);
    expect(cierre.resolverCierre).not.toHaveBeenCalled();
  });

  it('con la 4.2 abierta, agrega otro CDP y el respaldo es la suma (152)', async () => {
    const { service, cdps } = montar([
      { estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-11', valor: 500_000, rubro: 'A-01' },
    ]);

    const r = await service.cargar('p-1', dto, soporte, acceso);

    expect(cdps[0]).toMatchObject({ numero: 'CDP-11', estado: 'EXPEDIDO' });
    expect(r).toMatchObject({ numero: 'CDP-12', valorTotal: 2_000_000, cubreValorEstimado: true });
  });

  it('sin enviar, el CDP queda cargado y la 4.2 sigue abierta', async () => {
    const { service, cierre } = montar();

    await service.cargar('p-1', { ...dto, enviar: false }, soporte, acceso);

    expect(cierre.resolverCierre).not.toHaveBeenCalled();
  });

  it('no carga dos veces el mismo número', async () => {
    const { service } = montar([{ estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: ' cdp-12' }]);

    await expect(service.cargar('p-1', dto, soporte, acceso)).rejects.toThrow(/ya está cargado/);
  });

  it('enviar la 4.2 exige al menos un CDP cargado', async () => {
    const { service, cierre } = montar();

    await expect(service.enviarCargue('p-1', undefined, acceso)).rejects.toBeInstanceOf(ConflictException);
    expect(cierre.resolverCierre).not.toHaveBeenCalled();
  });

  it('enviar la 4.2 con los CDP cargados la cierra una vez', async () => {
    const { service, cierre } = montar([
      { estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-11', valor: 500_000 },
      { estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-12', valor: 700_000 },
    ]);
    jest.spyOn(service, 'estadoRespaldo').mockResolvedValue({} as any);

    await service.enviarCargue('p-1', undefined, acceso);

    expect(cierre.resolverCierre).toHaveBeenCalledTimes(1);
  });

  it('quita uno de los CDP de la 4.2 abierta, sin tocar los demás', async () => {
    const { service, cdps, trazas } = montar([
      { estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-11' },
      { estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-12' },
    ]);
    jest.spyOn(service, 'estadoRespaldo').mockResolvedValue({} as any);

    await service.quitar('p-1', 'cdp-2', 'Sobraba', acceso);

    expect(cdps.map((c) => c.estado)).toEqual(['EXPEDIDO', 'ANULADO']);
    expect(trazas).toEqual(['ANULAR']);
  });

  it('no quita lo de la 4.2 una vez enviada', async () => {
    const { service, cdps } = montar([{ estado: 'EXPEDIDO', origen: 'ETAPA_4', numero: 'CDP-11' }], 'EN_REVISION');

    await expect(service.quitar('p-1', 'cdp-1', undefined, acceso)).rejects.toBeInstanceOf(ConflictException);
    expect(cdps[0].estado).toBe('EXPEDIDO');
  });
});

describe('respaldoDeLosCdp', () => {
  it('suma solo los expedidos y junta sus números', () => {
    const r = respaldoDeLosCdp([
      { estado: 'EXPEDIDO', numero: 'CDP-1', valor: 1_000, rubro: 'A-01' },
      { estado: 'EXPEDIDO', numero: 'CDP-2', valor: 2_500, rubro: 'A-02' },
      { estado: 'SOLICITADO', numero: null, valor: 9_999, rubro: 'A-03' },
    ] as any);
    expect(r).toEqual({ numero: 'CDP-1, CDP-2', valor: 3_500, rubro: null, rubros: ['A-01', 'A-02'], cantidad: 2 });
  });

  it('con un solo rubro, ese es el rubro del respaldo', () => {
    const r = respaldoDeLosCdp([
      { estado: 'EXPEDIDO', numero: 'CDP-1', valor: 1_000, rubro: 'A-01' },
      { estado: 'EXPEDIDO', numero: 'CDP-2', valor: 1_000, rubro: ' A-01 ' },
    ] as any);
    expect(r.rubro).toBe('A-01');
  });

  it('sin expedidos no hay valor', () => {
    expect(respaldoDeLosCdp([]).valor).toBeNull();
  });
});
