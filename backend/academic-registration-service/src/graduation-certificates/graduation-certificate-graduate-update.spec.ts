import { GraduationCertificatesService } from './graduation-certificates.service';

describe('GraduationCertificatesService graduate updates', () => {
  const currentGraduate = {
    id: 'graduate-request-1',
    personId: 'person-1',
    fullName: 'Aceptar prueba',
    firstName: 'Aceptar',
    lastName: 'prueba',
    idNumber: '4321231233',
    email: 'persona@correo.com',
    programName: 'ESPECIALIZACIÓN EN GESTIÓN PÚBLICA',
    degreeTitle: 'ESPECIALIZACIÓN EN GESTIÓN PÚBLICA',
    numRegistro: '789',
    numFolio: '14',
    numLibro: '12',
    createdBy: 'manual_review:Revisor',
  };

  const createService = (repository: Record<string, jest.Mock>) =>
    new GraduationCertificatesService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  it('permite cambiar el documento de un graduado creado por solicitud cuando no genera un duplicado', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ ...currentGraduate }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (graduate) => graduate),
    };
    const service = createService(repository);

    const updated = await service.actualizarGraduado('graduate-request-1', {
      idNumber: '11211232112',
    });

    expect(updated.idNumber).toBe('11211232112');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('explica el conflicto cuando el documento y el programa ya existen en otro registro', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ ...currentGraduate }),
      find: jest.fn().mockResolvedValue([
        {
          ...currentGraduate,
          id: 'graduate-request-2',
          idNumber: '11211232112',
        },
      ]),
      save: jest.fn(),
    };
    const service = createService(repository);

    await expect(
      service.actualizarGraduado('graduate-request-1', {
        idNumber: '11211232112',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        message:
          'No se puede guardar el documento 11211232112: ya existe otro graduado con este documento y el programa ESPECIALIZACIÓN EN GESTIÓN PÚBLICA.',
      }),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
