import { NotFoundException } from '@nestjs/common';
import { SoportesService } from './soportes.service';

describe('SoportesService', () => {
  const repo = { find: jest.fn(), create: jest.fn((v) => ({ ...v })), save: jest.fn(async (v) => v), findOne: jest.fn(), delete: jest.fn() };
  const service = new SoportesService(repo as any);

  beforeEach(() => jest.clearAllMocks());

  it('lista los soportes del docente del más reciente al más antiguo', async () => {
    repo.find.mockResolvedValue([]);
    await service.findByDocente('d1');
    expect(repo.find).toHaveBeenCalledWith({ where: { idDocente: 'd1' }, order: { createdAt: 'DESC' } });
  });

  it('validar registra estado, observación, validador y fecha', async () => {
    repo.findOne.mockResolvedValue({ idSoporte: 's1' });
    const r: any = await service.validateSoporte('s1', 'RECHAZADO', 'ilegible', 'u1');
    expect(r).toMatchObject({ estadoValidacion: 'RECHAZADO', observaciones: 'ilegible', validadoPor: 'u1' });
    expect(r.fechaValidacion).toBeInstanceOf(Date);
  });

  it('validar un soporte inexistente lanza NotFound y no guarda', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.validateSoporte('x', 'APROBADO')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
