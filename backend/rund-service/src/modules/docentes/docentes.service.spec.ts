import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocentesService } from './docentes.service';

function buildRepo() {
  return {
    findOne: jest.fn(),
    query: jest.fn().mockResolvedValue([{ correlativo: '1' }]),
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
      expect(repo.query).not.toHaveBeenCalled();
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
      expect(saved.numeroTarjetaRund).toBe(`RUND-${anio}-000001`);
    });

    it.each(['1000000', '9007199254740993'])('conserva el correlativo %s sin truncarlo ni perder precision', async (correlativo) => {
      repo.findOne.mockResolvedValue(null);
      repo.query.mockResolvedValue([{ correlativo }]);
      const saved: any = await service.create({ numeroDocumento: '123' } as any);
      expect(saved.numeroTarjetaRund).toBe(`RUND-${new Date().getFullYear()}-${correlativo}`);
    });

    it('reserva otro numero si la tarjeta fue ocupada sin sobrescribir el registro previo', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.query.mockResolvedValueOnce([{ correlativo: '1' }]).mockResolvedValueOnce([{ correlativo: '2' }]);
      repo.save.mockRejectedValueOnce({ driverError: { code: '23505', constraint: 'docente_numero_tarjeta_rund_key' } });
      const saved: any = await service.create({ numeroDocumento: '123' } as any);
      expect(saved.numeroTarjetaRund).toBe(`RUND-${new Date().getFullYear()}-000002`);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('no reintenta conflictos de documento ni otros errores de persistencia', async () => {
      repo.findOne.mockResolvedValue(null);
      const error = { driverError: { code: '23505', constraint: 'uq_rund_docente_documento' } };
      repo.save.mockRejectedValue(error);
      await expect(service.create({ numeroDocumento: '123' } as any)).rejects.toBe(error);
      expect(repo.query).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('detiene los reintentos si cinco reservas estan ocupadas', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue({ code: '23505', constraint: 'docente_numero_tarjeta_rund_key' });
      await expect(service.create({ numeroDocumento: '123' } as any)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.query).toHaveBeenCalledTimes(5);
    });

    it('propaga el fallo de la secuencia sin generar un numero aleatorio ni guardar', async () => {
      repo.findOne.mockResolvedValue(null);
      const error = new Error('secuencia no disponible');
      repo.query.mockRejectedValue(error);
      await expect(service.create({ numeroDocumento: '123' } as any)).rejects.toBe(error);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update / changeEstado / remove', () => {
    beforeEach(() => repo.findOne.mockResolvedValue({ idDocente: 'd1', isActive: true, estadoRund: 'ACTIVO' }));

    it('update aplica cambios y deja trazado quién editó', async () => {
      const r: any = await service.update('d1', { nombres: 'Luisa' } as any, 'u2');
      expect(r.nombres).toBe('Luisa');
      expect(r.updatedBy).toBe('u2');
    });

    it('editar conserva la tarjeta emitida y no consume secuencia', async () => {
      repo.findOne.mockResolvedValue({ idDocente: 'd1', numeroTarjetaRund: 'RUND-2024-923456', isActive: true });
      const saved: any = await service.update('d1', { nombres: 'Luisa' } as any, 'u2');
      expect(saved.numeroTarjetaRund).toBe('RUND-2024-923456');
      expect(repo.query).not.toHaveBeenCalled();
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
