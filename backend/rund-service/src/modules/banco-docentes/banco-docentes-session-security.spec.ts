import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('Autogestión: sesión OTP, borradores y propiedad', () => {
  function build() {
    const invitation: any = { id: 'invite-1', correoInstitucional: 'prueba@example.test', tokenAcceso: 'enlace-publico',
      estado: 'Enviada', fechaExpiracion: new Date(Date.now() + 3600000),
      otpCodigo: '123456', otpExpiraEn: new Date(Date.now() + 60000), intentosOtp: 0,
      borradorJson: { documento_identidad: '1020304050', nombreCompleto: 'PRUEBA', puntajeSalarial: 145.5 },
    };
    const repo = {
      findOne: jest.fn(async ({ where }) => where.correoInstitucional === invitation.correoInstitucional
        || (where.sesionTokenHash && where.sesionTokenHash === invitation.sesionTokenHash) ? invitation : null),
      find: jest.fn().mockResolvedValue([invitation]),
      save: jest.fn(async (value) => value),
    };
    const db = { query: jest.fn().mockResolvedValue([]) };
    const service = Object.create(BancoDocentesService.prototype) as any;
    Object.assign(service, { invitacionRepo: repo, dataSource: db, docenteRepo: { findOne: jest.fn().mockResolvedValue(null) },
      logger: { log: jest.fn() }, sendEmail: jest.fn().mockResolvedValue({ sent: false }) });
    return { service: service as BancoDocentesService, invitation, repo, db };
  }

  it('el enlace del tablero no sirve como sesión, ni siquiera después de validar OTP', async () => {
    const { service, invitation } = build();
    await expect(service.getDraft(invitation.tokenAcceso)).rejects.toThrow(ForbiddenException);
    const { sessionToken } = await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionToken).not.toBe(invitation.tokenAcceso);
    expect(invitation.sesionTokenHash).not.toBe(sessionToken);
    await expect(service.getDraft(invitation.tokenAcceso)).rejects.toThrow(ForbiddenException);
    await expect(service.verifyOtpForEmail(invitation.correoInstitucional, '123456')).rejects.toThrow();
    const result = await service.getDraft(sessionToken);
    expect(result.draft.documento_identidad).toBe('******4050');
    expect(result.draft.puntajeSalarial).toBeNull();
  });

  it('reanuda y guarda una cédula nueva enmascarada sin persistir asteriscos ni puntaje', async () => {
    const { service, invitation, db } = build();
    const { sessionToken } = await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    const { draft } = await service.getDraft(sessionToken);
    await service.saveDraft(sessionToken, { ...draft, telefono: '3000000000', 'Puntaje Salarial': 9999 });
    expect(invitation.borradorJson.documento_identidad).toBe('1020304050');
    expect(invitation.borradorJson.telefono).toBe('3000000000');
    expect(invitation.borradorJson).not.toHaveProperty('puntajeSalarial');
    expect(invitation.borradorJson).not.toHaveProperty('Puntaje Salarial');
    expect(JSON.stringify(db.query.mock.calls)).not.toContain('1020304050');
    expect(JSON.stringify(db.query.mock.calls)).not.toContain(sessionToken);
  });

  it.each(['fechaExpiracion', 'sesionExpiraEn'])('rechaza la sesión con %s vencida en todas las operaciones', async (field) => {
    const { service, invitation } = build();
    const { sessionToken } = await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    invitation[field] = new Date(Date.now() - 1000);
    for (const op of [() => service.getDraft(sessionToken), () => service.saveDraft(sessionToken, {}),
      () => service.getAutogestionInfo(sessionToken), () => service.submitFromToken(sessionToken, {}),
      () => service.authorizeAutogestionDocumentUpload('docente-1', sessionToken)]) {
      await expect(op()).rejects.toThrow(ForbiddenException);
    }
  });

  it('no permite asociar la invitación nueva al documento de otro docente', async () => {
    const { service, invitation, db } = build();
    const { sessionToken } = await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    db.query.mockResolvedValue([{ id: 'docente-ajeno' }]);
    const upsert = jest.spyOn(service, 'upsertDocente');
    await expect(service.submitFromToken(sessionToken, { documentNumber: '9999999999', correoInstitucional: 'ajeno@example.test' }))
      .rejects.toThrow(ForbiddenException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('no devuelve un borrador cuando falla su auditoría', async () => {
    const { service, invitation, db } = build();
    const { sessionToken } = await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    db.query.mockRejectedValue(new Error('sin auditoría'));
    await expect(service.getDraft(sessionToken)).rejects.toThrow('No fue posible registrar el acceso');
  });

  it('el tablero conserva el enlace y el nombre, sin secretos de sesión ni datos del borrador', async () => {
    const { service, invitation } = build();
    await service.verifyOtpForEmail(invitation.correoInstitucional, '123456');
    const invitations = await service.getInvitaciones();
    expect(invitations[0].tokenAcceso).toBe('enlace-publico');
    expect(invitations[0].borradorJson.nombreCompleto).toBe('PRUEBA');
    expect(JSON.stringify(invitations)).not.toContain('1020304050');
    expect(JSON.stringify(invitations)).not.toContain(invitation.sesionTokenHash);
    expect(invitations[0]).not.toHaveProperty('otpCodigo');
  });

  it('no devuelve OTP en producción aunque falle el correo o esté habilitada la opción de desarrollo', async () => {
    const { service, invitation } = build();
    const previous = process.env.NODE_ENV;
    const previousDev = process.env.RUND_ENABLE_DEV_OTP;
    process.env.NODE_ENV = 'production'; process.env.RUND_ENABLE_DEV_OTP = 'true';
    try {
      const response = await service.requestOtpByEmail(invitation.correoInstitucional);
      expect(response.success).toBe(false);
      expect(response).not.toHaveProperty('devOtp');
      expect(JSON.stringify((service as any).logger.log.mock.calls)).not.toContain(invitation.otpCodigo);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
      if (previousDev === undefined) delete process.env.RUND_ENABLE_DEV_OTP; else process.env.RUND_ENABLE_DEV_OTP = previousDev;
    }
  });
});
