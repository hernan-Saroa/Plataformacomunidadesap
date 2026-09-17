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

  describe('findActiveRecipientsWithPermission', () => {
    it('deduplica por correo cuando el usuario tiene el permiso por varios roles', async () => {
      query.mockResolvedValue([
        { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
        { email: 'COORDINADOR@esap.edu.co', name: null },
        { email: 'revisor@esap.edu.co', name: 'Revisor Dos' },
      ]);

      await expect(
        service.findActiveRecipientsWithPermission(
          'certificados-laborales.correction.manage',
        ),
      ).resolves.toEqual([
        { email: 'coordinador@esap.edu.co', name: 'Coordinador Uno' },
        { email: 'revisor@esap.edu.co', name: 'Revisor Dos' },
      ]);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('permission.code = $1'), [
        'certificados-laborales.correction.manage',
      ]);
    });

    it('descarta los usuarios sin un correo con formato válido', async () => {
      query.mockResolvedValue([
        { email: null, name: 'Sin correo' },
        { email: '   ', name: 'Solo espacios' },
        { email: 'usuario.sin.arroba', name: 'Username no es correo' },
        { email: ' valido@esap.edu.co ', name: ' Persona Válida ' },
      ]);

      await expect(
        service.findActiveRecipientsWithPermission(
          'certificados-laborales.correction.manage',
        ),
      ).resolves.toEqual([{ email: 'valido@esap.edu.co', name: 'Persona Válida' }]);
    });

    it('completa el nombre cuando la primera fila del mismo correo viene vacía', async () => {
      query.mockResolvedValue([
        { email: 'revisor@esap.edu.co', name: null },
        { email: 'revisor@esap.edu.co', name: 'Revisor Con Nombre' },
      ]);

      await expect(
        service.findActiveRecipientsWithPermission(
          'certificados-laborales.correction.manage',
        ),
      ).resolves.toEqual([
        { email: 'revisor@esap.edu.co', name: 'Revisor Con Nombre' },
      ]);
    });

    it('devuelve una lista vacía cuando nadie tiene el permiso', async () => {
      query.mockResolvedValue([]);

      await expect(
        service.findActiveRecipientsWithPermission(
          'certificados-laborales.correction.manage',
        ),
      ).resolves.toEqual([]);
    });
  });
});
