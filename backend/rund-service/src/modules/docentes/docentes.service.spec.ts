import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocentesService } from './docentes.service';

function buildRepo() {
  return {
    findOne: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => v),
  };
}

describe('DocentesService', () => {
  let repo: ReturnType<typeof buildRepo>;
  let service: DocentesService;

  beforeEach(() => {
    repo = buildRepo();
    service = new DocentesService(repo as any);
  });

  describe('findById', () => {
    it('devuelve el docente activo con sus relaciones', async () => {
      repo.findOne.mockResolvedValue({ idDocente: 'd1' });
      await expect(service.findById('d1')).resolves.toEqual({ idDocente: 'd1' });
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idDocente: 'd1', isActive: true } }),
      );
    });

    it('lanza NotFound si no existe o está inactivo', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('rechaza un documento duplicado sin guardar', async () => {
      repo.findOne.mockResolvedValue({ idDocente: 'previo' });
      await expect(service.create({ numeroDocumento: '123' } as any)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('genera tarjeta RUND del año vigente y registra al autor', async () => {
      repo.findOne.mockResolvedValue(null);
      const saved: any = await service.create({ numeroDocumento: '123', nombres: 'Ana' } as any, 'user-1');
      const anio = new Date().getFullYear();
      expect(saved.numeroTarjetaRund).toMatch(/^RUND-\d{4}-\d{6}$/);
      expect(saved.numeroTarjetaRund.startsWith(`RUND-${anio}-`)).toBe(true);
      expect(saved.createdBy).toBe('user-1');
      expect(saved.updatedBy).toBe('user-1');
      expect(saved.fechaExpedicionRund).toBeInstanceOf(Date);
    });
  });

  describe('update / changeEstado / remove', () => {
    beforeEach(() => repo.findOne.mockResolvedValue({ idDocente: 'd1', isActive: true, estadoRund: 'ACTIVO' }));

    it('update aplica cambios y deja trazado quién editó', async () => {
      const r: any = await service.update('d1', { nombres: 'Luisa' } as any, 'u2');
      expect(r.nombres).toBe('Luisa');
      expect(r.updatedBy).toBe('u2');
    });

    it('changeEstado cambia solo el estado', async () => {
      const r: any = await service.changeEstado('d1', 'INACTIVO', 'u3');
      expect(r.estadoRund).toBe('INACTIVO');
      expect(r.isActive).toBe(true);
    });

    it('remove es borrado lógico, no elimina la fila', async () => {
      await service.remove('d1', 'u4');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false, updatedBy: 'u4' }));
    });

    it('update sobre docente inexistente lanza NotFound', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('nope', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
