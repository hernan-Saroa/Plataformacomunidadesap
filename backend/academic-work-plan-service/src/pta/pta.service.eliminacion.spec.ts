import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PtaService } from './pta.service';
import { PtaController } from './pta.controller';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';

describe('eliminación administrativa del PTA', () => {
  const auth = { isSuperUser: true, userId: 'admin' } as any;
  function setup(estado = 'Pendiente Jefatura') {
    const service = Object.create(PtaService.prototype) as PtaService;
    const manager = {
      findOne: jest.fn().mockImplementation(async (entity) => entity === PlanTrabajoAcademicoEntity
        ? { id: 'pta-1', estado }
        : { id: 'solicitud-activa', ptaId: 'pta-1', estado: 'en_aprobacion' }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const transaction = jest.fn().mockImplementation(async (operation) => operation(manager));
    // Ningún repositorio fuera de la transacción está disponible para escribir.
    Object.assign(service, { ptaRepo: { manager: { transaction } } });
    return { service, manager, transaction };
  }

  it.each(['Borrador', 'Pendiente Jefatura', 'Pendiente Decanatura', 'Devuelto', 'Aprobado', 'EN_CONCERTACION', 'EN_EJECUCION', 'Terminado', 'Rechazado'])(
    'permite eliminar en estado %s, incluso con solicitud de edición activa', async (estado) => {
      const { service, manager, transaction } = setup(estado);
      await expect(service.deletePTAAdministrativo('pta-1', auth)).resolves.toEqual({ deleted: true });
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(manager.findOne).toHaveBeenCalledWith(PlanTrabajoAcademicoEntity, {
        where: { id: 'pta-1' }, lock: { mode: 'pessimistic_write' },
      });
      expect(manager.delete).toHaveBeenCalledWith(SolicitudPtaEntity, { ptaId: 'pta-1' });
      expect(manager.delete).toHaveBeenCalledWith(HistorialEstadoPtaEntity, { ptaId: 'pta-1' });
      expect(manager.delete).toHaveBeenCalledWith(PtaEvidenciaEntity, { ptaId: 'pta-1' });
      // Cada borrado apunta exclusivamente al PTA seleccionado, nunca al docente.
      for (const [entity, criteria] of manager.delete.mock.calls) {
        expect(criteria).toEqual(entity === PlanTrabajoAcademicoEntity ? { id: 'pta-1' } : { ptaId: 'pta-1' });
      }
      expect(manager.delete).toHaveBeenLastCalledWith(PlanTrabajoAcademicoEntity, { id: 'pta-1' });
    },
  );

  it.each([undefined, { isSuperUser: false }, { roles: ['admin'], permissions: ['pta.approve.academica.territorial'] }])(
    'rechaza usuarios sin autorización antes de consultar o borrar datos', async (user) => {
      const { service, transaction } = setup();
      await expect(service.deletePTAAdministrativo('pta-1', user as any)).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('conserva la protección de solicitudes activas para la depuración automática', async () => {
    const { service, manager } = setup();
    await expect(service.deletePTA('pta-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('mantiene operativa la depuración automática sin solicitudes activas', async () => {
    const { service, manager } = setup();
    manager.findOne.mockResolvedValueOnce({ id: 'pta-1' }).mockResolvedValueOnce(null);
    await expect(service.deletePTA('pta-1')).resolves.toEqual({ deleted: true });
  });

  it('propaga un fallo al límite transaccional para que TypeORM revierta toda la eliminación', async () => {
    const { service, manager, transaction } = setup();
    const failure = new Error('Fallo de integridad');
    manager.delete.mockImplementation(async (entity) => {
      if (entity === PlanTrabajoAcademicoEntity) throw failure;
      return { affected: 1 };
    });
    await expect(service.deletePTAAdministrativo('pta-1', auth)).rejects.toBe(failure);
    await expect(transaction.mock.results[0].value).rejects.toBe(failure);
  });

  it('no falla ni borra otros datos si otro administrador ya eliminó el PTA', async () => {
    const { service, manager } = setup();
    manager.findOne.mockResolvedValue(null);
    await expect(service.deletePTAAdministrativo('pta-1', auth)).resolves.toEqual({ deleted: true });
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('protege el endpoint y transmite la identidad verificada por el guard', async () => {
    const service = { deletePTAAdministrativo: jest.fn().mockResolvedValue({ deleted: true }) };
    const controller = new PtaController(service as any);
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.delete)).toContain(PtaAuthGuard);
    await expect(controller.delete('pta-1', { ptaAuth: auth } as any)).resolves.toEqual({ success: true, data: { deleted: true } });
    expect(service.deletePTAAdministrativo).toHaveBeenCalledWith('pta-1', auth);
  });
});
