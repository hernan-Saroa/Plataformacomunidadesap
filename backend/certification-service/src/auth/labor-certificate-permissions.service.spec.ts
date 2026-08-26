import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LaborCertificatePermissionsService } from './labor-certificate-permissions.service';

describe('LaborCertificatePermissionsService', () => {
  const query = jest.fn();
  const service = new LaborCertificatePermissionsService({ query } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
  });

  it('permite la operación cuando uno de los roles firmados tiene el permiso activo', async () => {
    query.mockResolvedValue([{ allowed: true }]);

    await expect(
      service.assertRequestPermission(
        { user: { roles: ['COORDINADOR_CERT_LABORAL'] } },
        'certificados-laborales.correction.manage',
        'Acceso denegado',
      ),
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('permission.code = $2'),
      [
        ['COORDINADOR_CERT_LABORAL'],
        'certificados-laborales.correction.manage',
      ],
    );
  });

  it('rechaza la operación cuando el permiso está desmarcado', async () => {
    query.mockResolvedValue([{ allowed: false }]);

    await expect(
      service.assertRequestPermission(
        { user: { roles: ['ADMIN'] } },
        'certificados-laborales.functions.manage',
        'No tienes permiso para gestionar las funciones laborales.',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no confía en roles enviados manualmente por encabezados HTTP', async () => {
    await expect(
      service.assertRequestPermission(
        { headers: { 'x-user-roles': 'SUPER_ADMIN' }, user: { roles: [] } },
        'certificados-laborales.functions.manage',
        'Acceso denegado',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(query).not.toHaveBeenCalled();
  });
});
