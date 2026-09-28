import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('PtaService.revisarComponentesLote', () => {
  function createService() {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { exists: jest.fn().mockResolvedValue(true) };
    return service;
  }

  const auth = {
    userId: 'revisor-1',
    isSuperUser: false,
    reviewsAll: false,
    allowedReviewSubsecciones: ['academica_pregrado:general'],
  } as any;

  it('exige autenticación y una clave componente:subseccion válida', async () => {
    const service = createService();
    await expect(service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: ['academica_pregrado:general'] }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: ['academica_pregrado:no_existe'] }, auth))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('revisa solo lo pendiente y conserva la validación individual de permisos', async () => {
    const service = createService();
    service.getComponentesRevision = jest.fn(async (ptaId: string) => ptaId === 'pta-1'
      ? [
          { componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' },
          { componente: 'investigacion', subseccion: 'general', estado: 'revisado' },
        ]
      : [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }]);
    service.revisarComponente = jest.fn(async (ptaId: string, body: any) => {
      if (ptaId === 'pta-2') throw new ForbiddenException('No tiene permisos para revisar este componente');
      return { review: { ...body }, estadoGeneral: 'Pendiente Jefatura' };
    });

    const result = await service.revisarComponentesLote({
      ptaIds: ['pta-1', 'pta-2'],
      revisiones: ['academica_pregrado:general', 'investigacion:general'],
      comentarios: 'Revisión de lote',
      revisorRol: 'Revisor Pregrado',
    }, auth);

    expect(service.revisarComponente).toHaveBeenCalledWith('pta-1', expect.objectContaining({
      componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado',
      comentarios: 'Revisión de lote', revisorRol: 'Revisor Pregrado',
    }), auth);
    expect(result.resultados).toEqual([
      { ptaId: 'pta-1', componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' },
      { ptaId: 'pta-1', componente: 'investigacion', subseccion: 'general', estado: 'omitido', motivo: 'Ya estaba revisado' },
      { ptaId: 'pta-2', componente: 'academica_pregrado', subseccion: 'general', estado: 'fallido', motivo: 'No tiene permisos para revisar este componente' },
      { ptaId: 'pta-2', componente: 'investigacion', subseccion: 'general', estado: 'omitido', motivo: 'No aplica a este PTA' },
    ]);
    expect(result.resumen).toEqual({ total: 4, revisados: 1, devueltos: 0, omitidos: 2, fallidos: 1 });
  });
});
