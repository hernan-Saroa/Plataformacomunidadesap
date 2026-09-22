import { ForbiddenException } from '@nestjs/common';
import { PTA_MANAGE_EDIT_REQUESTS_PERMISSION } from './auth/pta-permissions.constants';
import { PtaService } from './pta.service';

const auth = (permissions: string[]) => ({
  userId: 'revisor-1',
  name: 'Revisor Docencia - Pregrado',
  email: 'revisor@esap.edu.co',
  roles: ['REVISOR_DOCENCIA_PREGRADO'],
  territorialIds: [],
  cetapIds: [],
  isSuperUser: false,
  approvesAll: false,
  reviewsAll: false,
  permissions: new Set(permissions),
  allowedComponents: [],
  approvalLevels: [],
  allowedReviewSubsecciones: ['academica_pregrado:general'],
  allowedNivelesTerritorialAprobar: [],
  allowedNivelesTerritorialRevisar: [],
});

describe('PtaService - permiso de solicitudes de edición', () => {
  it('limita la bandeja a solicitudes de edición para el permiso funcional', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn().mockResolvedValue([]);

    await expect(service.getSolicitudesPTA(
      undefined,
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).resolves.toEqual([]);

    expect(qb.andWhere).toHaveBeenCalledWith(
      's.tipoSolicitud = :tipoSolicitud',
      { tipoSolicitud: 'edicion_componentes' },
    );
  });

  it('rechaza la bandeja para un revisor que no tiene el permiso funcional', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { createQueryBuilder: jest.fn() };

    await expect(service.getSolicitudesPTA(
      undefined,
      auth(['pta.review.academica.pregrado']),
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.solicitudRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('acepta resolver una solicitud de edición con el permiso funcional', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-1',
        tipoSolicitud: 'edicion_componentes',
        ptaId: 'pta-inexistente',
        estado: 'pendiente',
      }),
    };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue(null) };

    await expect(service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'aprobado' },
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).rejects.toThrow(/PTA asociado a la solicitud ya no existe/i);
  });

  it('no usa el permiso de edición para resolver solicitudes de creación', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-2',
        tipoSolicitud: 'creacion',
        estado: 'pendiente',
      }),
    };

    await expect(service.resolverSolicitudPTA(
      'sol-2',
      { decision: 'aprobado' },
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });
});

