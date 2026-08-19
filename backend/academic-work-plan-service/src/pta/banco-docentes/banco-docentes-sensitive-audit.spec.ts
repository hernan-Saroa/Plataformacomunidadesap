import { BancoDocentesService } from './banco-docentes.service';

describe('BancoDocentesService - auditoría de accesos sensibles', () => {
  it('registra actor, campos, endpoint y resultado sin copiar los valores sensibles', async () => {
    const auditLogRepo = {
      create: jest.fn((entry) => entry),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.auditLogRepo = auditLogRepo;

    await service.logSensitiveDataAccess([{
      docenteId: '11111111-1111-4111-8111-111111111111',
      actorId: 'ggp-1',
      roles: ['GESTION_PROFESORAL'],
      fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      endpoint: 'PERFIL_RUND_POR_ID',
      fullAccess: true,
      ip: '127.0.0.1',
    }]);

    expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'CONSULTAR_DATOS_SENSIBLES',
      actorId: 'ggp-1',
      campoAfectado: 'DOCUMENTO_IDENTIDAD,PUNTAJE_SALARIAL',
      datoPrevio: null,
      datoNuevo: null,
      ip: '127.0.0.1',
      metadata: expect.objectContaining({
        endpoint: 'PERFIL_RUND_POR_ID',
        resultado: 'COMPLETO',
        valoresIncluidosEnLog: false,
      }),
    }));
    expect(auditLogRepo.save).toHaveBeenCalledWith([expect.any(Object)]);
  });
});
