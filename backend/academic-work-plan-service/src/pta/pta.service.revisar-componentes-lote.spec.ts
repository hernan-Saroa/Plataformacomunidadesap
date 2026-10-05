import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';
import { REVIEW_SUBSECCIONES_BY_COMPONENT } from './auth/pta-permissions.constants';

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

  const claves = Object.entries(REVIEW_SUBSECCIONES_BY_COMPONENT)
    .flatMap(([componente, subsecciones]) => subsecciones.map(subseccion => ({ componente, subseccion })));

  it.each(claves)('revisa $componente/$subseccion con permisos propios y conserva el rechazo territorial', async ({ componente, subseccion }) => {
    const service = createService();
    const permisos = { ...auth, allowedReviewSubsecciones: [`${componente}:${subseccion}`], roles: ['Docente'] };
    service.getComponentesRevision = jest.fn().mockResolvedValue([{ componente, subseccion, estado: 'pendiente' }]);
    service.revisarComponente = jest.fn(async (ptaId: string) => {
      if (ptaId === 'fuera-de-alcance') throw new ForbiddenException('Fuera de alcance territorial');
      return { review: { estado: 'revisado' } };
    });
    const result = await service.revisarComponentesLote({ ptaIds: ['autorizado', 'fuera-de-alcance'], revisiones: [`${componente}:${subseccion}`] }, permisos);
    expect(service.revisarComponente).toHaveBeenCalledWith('autorizado', expect.objectContaining({ componente, subseccion, estado: 'revisado' }), permisos);
    expect(result.resumen).toMatchObject({ total: 2, revisados: 1, fallidos: 1 });
    expect(result.resultados[1]).toMatchObject({ estado: 'fallido', motivo: 'Fuera de alcance territorial' });
  });

  it('entrega estados actualizados sin perder decisiones si falla la consulta de otro PTA', async () => {
    const service = createService();
    service.ptaRepo.exists.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('Consulta fallida'));
    service.getComponentesRevision = jest.fn().mockResolvedValue([{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }]);
    service.revisarComponente = jest.fn().mockResolvedValue({ review: { estado: 'revisado' } });
    service.getBulkUpdatedPtas = jest.fn().mockResolvedValue([{ id: 'pta-1', componentes_revision_usuario: [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' }] }]);
    const result = await service.revisarComponentesLote({ ptaIds: ['pta-1', 'pta-2'], revisiones: ['academica_pregrado:general'] }, auth);
    expect(result.resumen).toMatchObject({ total: 2, revisados: 1, fallidos: 1 });
    expect(service.getBulkUpdatedPtas).toHaveBeenCalledWith(['pta-1', 'pta-2'], auth);
    expect(result.ptasActualizados[0].componentes_revision_usuario[0].estado).toBe('revisado');
  });

  it.each([
    ['evento posterior', new Error('Evento fallido'), true, true],
    ['rechazo de permisos', new ForbiddenException('Sin permisos'), true, false],
    ['fuera de alcance', new Error('Evento fallido'), false, false],
  ])('confirma revisión persistida sin eludir autorización: %s', async (_label, error, enAlcance, revisado) => {
    const service = createService();
    service.getComponentesRevision = jest.fn().mockResolvedValue([{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }]);
    service.revisarComponente = jest.fn().mockRejectedValue(error);
    service.getBulkUpdatedPtas = jest.fn().mockResolvedValue([{ id: 'pta-1', componentes_revision_usuario: enAlcance
      ? [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' }] : [] }]);
    const result = await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: ['academica_pregrado:general'] }, auth);
    expect(result.resumen).toMatchObject({ revisados: revisado ? 1 : 0, fallidos: revisado ? 0 : 1 });
    expect(result.resultados[0].motivo).toContain(error.message);
  });

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
