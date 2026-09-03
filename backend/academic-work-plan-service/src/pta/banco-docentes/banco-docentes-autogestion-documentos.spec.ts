import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('BancoDocentesService - autorización documental de autogestión', () => {
  const invitation = {
    id: 'invite-1',
    tokenAcceso: 'token-valido',
    correoInstitucional: 'docente@esap.edu.co',
    estado: 'Gestionada',
    fechaExpiracion: new Date(Date.now() + 60_000),
  };

  const build = (overrides: any = {}) => {
    const docenteRepo = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ id: 'docente-1' })
        .mockResolvedValueOnce({ id: 'docente-1', correoInstitucional: 'docente@esap.edu.co' }),
      ...overrides.docenteRepo,
    };
    const invitacionRepo = {
      findOne: jest.fn().mockResolvedValue(invitation),
      ...overrides.invitacionRepo,
    };
    return new BancoDocentesService(
      docenteRepo as any,
      {} as any,
      {} as any,
      invitacionRepo as any,
      {} as any,
      {} as any,
    );
  };

  it('autoriza únicamente la invitación gestionada que pertenece al perfil', async () => {
    await expect(build().authorizeAutogestionDocumentUpload('docente-1', 'token-valido'))
      .resolves.toBe('AUTOGESTION:invite-1');
  });

  it('rechaza tokens inexistentes', async () => {
    const service = build({ invitacionRepo: { findOne: jest.fn().mockResolvedValue(null) } });
    await expect(service.authorizeAutogestionDocumentUpload('docente-1', 'invalido'))
      .rejects.toThrow(ForbiddenException);
  });

  it('rechaza una invitación que no pertenece al docente', async () => {
    const service = build({
      docenteRepo: {
        findOne: jest.fn()
          .mockResolvedValueOnce({ id: 'docente-1' })
          .mockResolvedValueOnce({ id: 'docente-1', correoInstitucional: 'otra@esap.edu.co' }),
      },
    });
    await expect(service.authorizeAutogestionDocumentUpload('docente-1', 'token-valido'))
      .rejects.toThrow(ForbiddenException);
  });
});
