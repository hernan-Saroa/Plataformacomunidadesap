import { PtaService } from './pta.service';

function queryBuilderReturning(value: any) {
  const builder: any = {
    where: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    setParameter: jest.fn(() => builder),
    addOrderBy: jest.fn(() => builder),
    getOne: jest.fn().mockResolvedValue(value),
  };
  return builder;
}

describe('PtaService - normalización de identidad docente', () => {
  it('convierte el id interno de Docente a personaId antes de validar el rol en auth', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const vinculacion = {
      id: 'docente-row-2026-2',
      personaId: 'persona-auth-1',
    };
    const internalIdBuilder = queryBuilderReturning(vinculacion);
    const periodBuilder = queryBuilderReturning(vinculacion);

    service.docenteRepo = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(internalIdBuilder)
        .mockReturnValueOnce(periodBuilder),
    };
    service.fetchAuthDocenteInfo = jest.fn().mockResolvedValue({
      personId: 'persona-auth-1',
      email: 'docente@esap.edu.co',
      fullName: 'Docente Prueba',
    });

    const result = await service.resolveDocenteCompleto('docente-row-2026-2', {
      periodo: '2026-2',
    });

    expect(service.fetchAuthDocenteInfo).toHaveBeenCalledWith('persona-auth-1', {
      adminEdit: undefined,
    });
    expect(result).toEqual({
      personId: 'docente-row-2026-2',
      email: 'docente@esap.edu.co',
      fullName: 'Docente Prueba',
    });
  });

  it('conserva id_person/id_user cuando no corresponde a una fila interna de Docente', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const internalIdBuilder = queryBuilderReturning(null);
    const vinculacion = {
      id: 'docente-row-2026-2',
      personaId: 'persona-auth-1',
    };
    const periodBuilder = queryBuilderReturning(vinculacion);

    service.docenteRepo = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(internalIdBuilder)
        .mockReturnValueOnce(periodBuilder),
    };
    service.fetchAuthDocenteInfo = jest.fn().mockResolvedValue({
      personId: 'persona-auth-1',
      email: null,
      fullName: 'Docente Prueba',
    });

    await service.resolveDocenteCompleto('persona-o-usuario-1', {
      periodo: '2026-2',
    });

    expect(service.fetchAuthDocenteInfo).toHaveBeenCalledWith('persona-o-usuario-1', {
      adminEdit: undefined,
    });
  });
});
