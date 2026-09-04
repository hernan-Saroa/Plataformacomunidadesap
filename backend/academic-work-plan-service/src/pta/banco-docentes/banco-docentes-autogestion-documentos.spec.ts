import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('BancoDocentesService - autorización documental de autogestión', () => {
  const DOCENTE_ID = '11111111-1111-4111-8111-111111111111';
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
        .mockResolvedValueOnce({ id: DOCENTE_ID })
        .mockResolvedValueOnce({ id: DOCENTE_ID, correoInstitucional: 'docente@esap.edu.co' }),
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
    await expect(build().authorizeAutogestionDocumentUpload(DOCENTE_ID, 'token-valido'))
      .resolves.toBe('AUTOGESTION:invite-1');
  });

  it('rechaza tokens inexistentes', async () => {
    const service = build({ invitacionRepo: { findOne: jest.fn().mockResolvedValue(null) } });
    await expect(service.authorizeAutogestionDocumentUpload(DOCENTE_ID, 'invalido'))
      .rejects.toThrow(ForbiddenException);
  });

  it('rechaza una invitación que no pertenece al docente', async () => {
    const service = build({
      docenteRepo: {
        findOne: jest.fn()
          .mockResolvedValueOnce({ id: DOCENTE_ID })
          .mockResolvedValueOnce({ id: DOCENTE_ID, correoInstitucional: 'otra@esap.edu.co' }),
      },
    });
    await expect(service.authorizeAutogestionDocumentUpload(DOCENTE_ID, 'token-valido'))
      .rejects.toThrow(ForbiddenException);
  });
});
