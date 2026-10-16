import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualMailStatusService } from './auth-identity-manual-mail-status.service';

describe('Consulta de correo manual por actor sin efectos', () => {
  const request = 'abcdef00-1111-4111-8111-111111111111', actorId = 'abcdef00-2222-4222-8222-222222222222';
  const actor = () => ({ actorId, roles: ['OPERADOR'], fullAccess: false, expiresAt: Date.now() / 1000 + 60 });
  function setup() {
    const row: any = { solicitud_id: request, intencion_id: actorId, capturada: true, estado_nativo: 'CONFIRMADA',
      estado_auth: 'AUTH_APLICADA', decision: 'EN_CURSO', contexto_coincide: true, recibo_completo: true,
      cuenta_nativa_nueva: true, cuenta_auth_nueva: true, aviso_registrado: true, estado_correo: 'PENDIENTE' };
    const query = jest.fn(async (_sql: string, _params?: any[]) => [row]), transaction = jest.fn();
    const identities = { permisosRoles: jest.fn().mockResolvedValue(['banco-docentes.rund.manage']) };
    return { row, query, transaction, identities, service: new AuthIdentityManualMailStatusService({ query, transaction } as any, identities as any) };
  }
  it.each(['PENDIENTE', 'ENVIANDO', 'ENVIADO', 'INCIERTO'])('devuelve %s con seis campos y sin mutaciones', async estado => {
    const s = setup(); s.row.estado_correo = estado;
    expect(await s.service.consultar(request.toUpperCase(), actor())).toEqual({ version: 1, solicitudId: request,
      intencionId: actorId, estado, registroConfirmado: true, requiereRevision: estado === 'INCIERTO' });
    expect(s.query.mock.calls[0][1]).toEqual([actorId, request]); expect(s.transaction).not.toHaveBeenCalled();
    expect(s.query.mock.calls[0][0]).not.toMatch(/UPDATE|INSERT|DELETE|FOR UPDATE|SELECT \*/i);
    expect(s.identities.permisosRoles).toHaveBeenCalledTimes(2);
  });
  it('cuenta existente confirmada sin aviso es NO_APLICA, nunca un correo enviado', async () => {
    const s = setup(); Object.assign(s.row, { cuenta_nativa_nueva: false, cuenta_auth_nueva: false, aviso_registrado: false, estado_correo: null });
    expect((await s.service.consultar(request, actor())).estado).toBe('NO_APLICA');
  });
  it.each([null, 'PREPARADA'])('contexto %s sin confirmar no acredita encolado', async estado => {
    const s = setup(); Object.assign(s.row, { estado_nativo: estado, aviso_registrado: false, estado_correo: null });
    expect(await s.service.consultar(request, actor())).toEqual({ version: 1, solicitudId: request, intencionId: actorId,
      estado: 'SIN_CONFIRMAR', registroConfirmado: false, requiereRevision: false });
  });
  it.each(['ausente', 'estado', 'cuenta', 'contexto', 'recibo', 'auth', 'aborto', 'intencion', 'ajena', 'no-aplica-con-aviso', 'sin-confirmar-con-aviso'])('%s incoherente no fabrica un resultado', async field => {
    const s = setup();
    if (field === 'ausente') Object.assign(s.row, { aviso_registrado: false, estado_correo: null });
    if (field === 'estado') s.row.estado_correo = 'ACEPTADO';
    if (field === 'cuenta') s.row.cuenta_auth_nueva = false;
    if (field === 'contexto') s.row.contexto_coincide = false;
    if (field === 'recibo') s.row.recibo_completo = false;
    if (field === 'auth') s.row.estado_auth = 'AUTH_REGISTRADA';
    if (field === 'aborto') s.row.decision = 'ABORTADA';
    if (field === 'intencion') s.row.intencion_id = 'NO';
    if (field === 'ajena') s.row.solicitud_id = actorId;
    if (field === 'no-aplica-con-aviso') s.row.cuenta_auth_nueva = s.row.cuenta_nativa_nueva = false;
    if (field === 'sin-confirmar-con-aviso') s.row.estado_nativo = 'PREPARADA';
    await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('solicitud ausente devuelve 404 y captura histórica ausente 409', async () => {
    const s = setup(); s.query.mockResolvedValueOnce([]);
    await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(NotFoundException);
    s.row.capturada = false; await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(ConflictException);
  });
  it('identificadores o expiración inválidos no consultan hechos de correo', async () => {
    const s = setup(); await expect(s.service.consultar('NO', actor())).rejects.toBeInstanceOf(BadRequestException);
    for (const expiresAt of [undefined, NaN, Infinity, Date.now() / 1000 - 1])
      await expect(s.service.consultar(request, { ...actor(), expiresAt } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(s.service.consultar(request, { ...actor(), actorId: 'PERSONA' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.query).not.toHaveBeenCalled();
  });
  it('grant ausente o propietario inaccesible deniega antes de consultar la solicitud', async () => {
    const s = setup(); s.identities.permisosRoles.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('PRIVADO'));
    await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(ForbiddenException); expect(s.query).not.toHaveBeenCalled();
  });
  it('revocación durante SQL impide entregar un estado ya leído', async () => {
    const s = setup(); s.identities.permisosRoles.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.consultar(request, actor())).rejects.toBeInstanceOf(ForbiddenException); expect(s.query).toHaveBeenCalledTimes(1);
  });
  it('vencimiento durante lectura también bloquea los roles de gestión', async () => {
    const s = setup(), current = { ...actor(), roles: ['GESTION_PROFESORAL'] }; const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValue(now + 120_000);
    try { await expect(s.service.consultar(request, current)).rejects.toBeInstanceOf(UnauthorizedException); }
    finally { clock.mockRestore(); }
  });
  it('fallo SQL no expone consulta, parámetros o una ausencia inventada', async () => {
    const s = setup(); s.query.mockRejectedValueOnce(Object.assign(new Error('SQL PRIVADO'), { parameters: ['PRIVADO'] }));
    await expect(s.service.consultar(request, actor())).rejects.toThrow('No fue posible consultar');
  });
});
