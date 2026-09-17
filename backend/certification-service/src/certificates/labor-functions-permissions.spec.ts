import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LaborFunctionsController } from './labor-functions.controller';
import { LaborCertificatePermissionsService } from '../auth/labor-certificate-permissions.service';

const VIEW = 'certificados-laborales.functions.view';
const MANAGE = 'certificados-laborales.functions.manage';

/**
 * El acceso al modulo y su escritura son permisos distintos:
 *
 *   view   -> ver el boton, entrar y consultar la matriz.
 *   manage -> crear, editar, eliminar y la CARGA MASIVA.
 *
 * Gestionar incluye consultar, para que no haya que marcar los dos permisos.
 */
describe('Funciones laborales: lectura y escritura son permisos distintos', () => {
  const laborFunctions = {
    list: jest.fn().mockResolvedValue({ items: [] }),
    listAllForSelection: jest.fn().mockResolvedValue({ items: [] }),
    lookupPerson: jest.fn().mockResolvedValue({ items: [] }),
    findOne: jest.fn().mockResolvedValue({ id: 'perfil' }),
    create: jest.fn().mockResolvedValue({ id: 'perfil' }),
    update: jest.fn().mockResolvedValue({ id: 'perfil' }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
    removeMany: jest.fn().mockResolvedValue({ ok: true }),
    bulk: jest.fn().mockResolvedValue({ ok: true }),
    validateBulk: jest.fn().mockResolvedValue({ ok: true }),
  };

  const build = () => {
    const permissions = {
      assertRequestAnyPermission: jest.fn().mockResolvedValue(undefined),
      assertRequestPermission: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new LaborFunctionsController(
      laborFunctions as any,
      permissions as any,
      { resolveRequestUsedForCertificate: jest.fn() } as any,
    );
    return { controller, permissions };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['list', (c: LaborFunctionsController) => c.list({})],
    ['selection', (c: LaborFunctionsController) => c.listAllForSelection({})],
    ['person-lookup', (c: LaborFunctionsController) => c.lookupPerson({}, '123')],
    ['findOne', (c: LaborFunctionsController) => c.findOne('perfil', {})],
  ])('la consulta %s acepta el permiso de lectura o el de gestion', async (_name, call) => {
    const { controller, permissions } = build();

    await call(controller);

    expect(permissions.assertRequestAnyPermission).toHaveBeenCalledWith(
      {},
      [VIEW, MANAGE],
      expect.any(String),
    );
    expect(permissions.assertRequestPermission).not.toHaveBeenCalled();
  });

  it.each([
    ['carga masiva', (c: LaborFunctionsController) => c.bulk({ rows: [] }, {})],
    ['validación de carga masiva', (c: LaborFunctionsController) => c.validateBulk({ rows: [] }, {})],
    ['creación', (c: LaborFunctionsController) => c.create({} as any, {})],
    ['edición', (c: LaborFunctionsController) => c.update('perfil', {} as any, {})],
    ['eliminación', (c: LaborFunctionsController) => c.remove('perfil', {})],
    ['eliminación masiva', (c: LaborFunctionsController) => c.removeMany({ ids: [] }, {})],
  ])('la escritura (%s) exige el permiso de gestión', async (_name, call) => {
    const { controller, permissions } = build();

    await call(controller);

    expect(permissions.assertRequestPermission).toHaveBeenCalledWith(
      {},
      MANAGE,
      expect.any(String),
    );
    expect(permissions.assertRequestAnyPermission).not.toHaveBeenCalled();
  });

  it('un rol de solo lectura no puede ejecutar la carga masiva', async () => {
    const { controller, permissions } = build();
    permissions.assertRequestPermission.mockRejectedValue(
      new ForbiddenException('No tienes permiso para gestionar las funciones laborales.'),
    );

    await expect(controller.bulk({ rows: [] }, {})).rejects.toThrow(ForbiddenException);
    expect(laborFunctions.bulk).not.toHaveBeenCalled();
  });

  it('sin ninguno de los dos permisos tampoco se puede consultar', async () => {
    const { controller, permissions } = build();
    permissions.assertRequestAnyPermission.mockRejectedValue(
      new ForbiddenException('No tienes permiso para consultar las funciones laborales.'),
    );

    await expect(controller.list({})).rejects.toThrow(ForbiddenException);
    expect(laborFunctions.list).not.toHaveBeenCalled();
  });
});

describe('assertRequestAnyPermission', () => {
  const query = jest.fn();
  const service = new LaborCertificatePermissionsService(
    { query } as unknown as DataSource,
  );

  beforeEach(() => query.mockReset());

  it('consulta los dos códigos en una sola verificación contra la base', async () => {
    query.mockResolvedValue([{ allowed: true }]);

    await expect(
      service.assertRequestAnyPermission(
        { user: { roles: ['COORDINADOR_CERT_LABORAL'] } },
        [VIEW, MANAGE],
        'Acceso denegado',
      ),
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('permission.code = ANY($2::text[])'),
      [['COORDINADOR_CERT_LABORAL'], [VIEW, MANAGE]],
    );
  });

  it('rechaza cuando el rol no tiene ninguno de los permisos', async () => {
    query.mockResolvedValue([{ allowed: false }]);

    await expect(
      service.assertRequestAnyPermission(
        { user: { roles: ['ADMIN'] } },
        [VIEW, MANAGE],
        'Acceso denegado',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no confía en los roles enviados por encabezados HTTP', async () => {
    await expect(
      service.assertRequestAnyPermission(
        { headers: { 'x-user-roles': 'SUPER_ADMIN' }, user: { roles: [] } },
        [VIEW, MANAGE],
        'Acceso denegado',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(query).not.toHaveBeenCalled();
  });
});
