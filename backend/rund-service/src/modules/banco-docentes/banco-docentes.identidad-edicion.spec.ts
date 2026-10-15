import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

const person = '11111111-1111-4111-8111-111111111111', id = '22222222-2222-4222-8222-222222222222';
const support = '33333333-3333-4333-8333-333333333333';
const edit = { soporteEdicionId: support, justificacionEdicion: 'Corregir teléfono', periodoCarga: '2026-2', telefono: '3001234567' };
function build() {
  const s = Object.create(BancoDocentesService.prototype) as any;
  const invitation = { id: 'invite', correoInstitucional: 'alternativo@example.test', estado: 'OTP validado' };
  s.resolveDocenteId = jest.fn().mockResolvedValue(id);
  s.docenteRepo = { findOne: jest.fn().mockResolvedValue({ id, personaId: person, periodoCarga: '2026-2', estado: 'ACTIVO',
    correoInstitucional: 'institucional@example.test' }) };
  s.identities = { fichaPorPersona: jest.fn().mockResolvedValue({ personaId: person, num_identificacion: '1020304050' }),
    fichaPorDocumento: jest.fn().mockResolvedValue({ personaId: person, num_identificacion: '1020304050' }) };
  s.dataSource = { query: jest.fn().mockResolvedValue([{ id: support }]), transaction: jest.fn() };
  s.catalogos = { territorialesBanco: jest.fn().mockResolvedValue([]) };
  s.upsertDocente = jest.fn().mockResolvedValue({ docenteId: id, documentNumber: '1020304050' });
  s.invitacionRepo = { save: jest.fn(async value => value) };
  s.requireAutogestionSession = jest.fn().mockResolvedValue(invitation);
  return { s, invitation };
}
describe('Identidad confiable en edición y envío OTP por API Auth', () => {
  it.each(['1020304050', '1.020.304.050', '******4050'])('edición %s mantiene cédula del propietario y requisitos de soporte/período', async documentNumber => {
    const { s } = build(); await s.updateDocente(id, { ...edit, documentNumber });
    expect(s.identities.fichaPorPersona).toHaveBeenCalledWith(person);
    expect(s.upsertDocente).toHaveBeenCalledWith(expect.objectContaining({ documentNumber: '1020304050', periodoCarga: '2026-2' }),
      expect.objectContaining({ audit: expect.objectContaining({ requiredSupport: { id: support, type: 'soporte_edicion_perfil', docenteId: id } }) }));
    expect(s.dataSource.query.mock.calls.every(([sql]) => !/auth\./.test(sql))).toBe(true);
  });
  it('edición rechaza cambio de identidad aunque se envíe un alias distinto', async () => {
    const { s } = build();
    await expect(s.updateDocente(id, { ...edit, DOCUMENTO_IDENTIDAD: '9999999999' })).rejects.toBeInstanceOf(BadRequestException);
    expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it('soporte ajeno o inexistente bloquea antes de consultar Auth', async () => {
    const { s } = build(); s.dataSource.query.mockResolvedValue([]);
    await expect(s.updateDocente(id, edit)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.identities.fichaPorPersona).not.toHaveBeenCalled(); expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it.each([null, { num_identificacion: '' }])('edición sin identidad confirmada %s no usa el body ni abre transacciones', async identity => {
    const { s } = build(); s.identities.fichaPorPersona.mockResolvedValue(identity);
    await expect(s.updateDocente(id, { ...edit, documentNumber: '9999999999' })).rejects.toBeInstanceOf(NotFoundException);
    expect(s.dataSource.transaction).not.toHaveBeenCalled(); expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it('Auth caído bloquea edición antes de catálogo, sugerencias o escrituras', async () => {
    const { s } = build(); s.identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.updateDocente(id, { ...edit, rundSuggestionIds: [support], rundSensitiveAccess: { fullAccess: true } }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled(); expect(s.dataSource.transaction).not.toHaveBeenCalled();
    expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it.each(['documentNumber', 'documento_identidad', 'DOCUMENTO_IDENTIDAD'])('OTP sustituye %s por cédula confiable y conserva correo institucional al invitar al alternativo', async field => {
    const { s, invitation } = build();
    const body = { [field]: '9999999999', email: 'ajeno@example.test', puntajeSalarial: 999, PUNTAJE_SALARIAL: 999, telefono: '3001234567' };
    const original = { ...body }; const result = await s.submitFromToken('sesion', body);
    const [payload, options] = s.upsertDocente.mock.calls[0];
    expect(payload).toMatchObject({ documentNumber: '1020304050', documento_identidad: '1020304050',
      CORREO_INSTITUCIONAL: 'institucional@example.test', correoInstitucional: 'institucional@example.test', canal_origen: 'AUTOGESTION' });
    expect(payload).not.toHaveProperty('puntajeSalarial'); expect(payload).not.toHaveProperty('PUNTAJE_SALARIAL');
    expect(payload).not.toHaveProperty('email'); expect(options).toMatchObject({ relaxValidation: true, rejectExisting: false,
      audit: { soporteId: 'invite', sensitiveAccess: { fullAccess: false, endpoint: 'AUTOGESTION_ENVIAR_PERFIL' } } });
    expect(result.documentNumber).toBe('******4050'); expect(invitation.estado).toBe('Gestionada'); expect(body).toEqual(original);
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it.each([null, { num_identificacion: null }, { num_identificacion: '' }, { num_identificacion: '   ' }])
  ('OTP con perfil existente sin cédula confiable %s falla cerrado y conserva invitación', async identity => {
    const { s, invitation } = build(); s.identities.fichaPorPersona.mockResolvedValue(identity);
    await expect(s.submitFromToken('sesion', { documentNumber: '9999999999' })).rejects.toBeInstanceOf(NotFoundException);
    expect(s.upsertDocente).not.toHaveBeenCalled(); expect(s.invitacionRepo.save).not.toHaveBeenCalled();
    expect(invitation.estado).toBe('OTP validado');
  });
  it('OTP con perfil existente no puede continuar durante un fallo de Auth', async () => {
    const { s } = build(); s.identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.submitFromToken('sesion', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.upsertDocente).not.toHaveBeenCalled(); expect(s.invitacionRepo.save).not.toHaveBeenCalled();
  });
  it('OTP nuevo rechaza perfil de cualquier período perteneciente al documento confirmado', async () => {
    const { s } = build(); s.docenteRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'historico' });
    await expect(s.submitFromToken('sesion', { documentNumber: '1.020.304.050' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.identities.fichaPorDocumento).toHaveBeenCalledWith('1020304050');
    expect(s.docenteRepo.findOne).toHaveBeenLastCalledWith({ where: { personaId: person }, select: { id: true } });
    expect(s.dataSource.query).not.toHaveBeenCalled(); expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it.each([null, { personaId: person, num_identificacion: '1020304050' }])
  ('OTP nuevo conserva alta permitida cuando no existe perfil nativo: %s', async identity => {
    const { s } = build(); s.docenteRepo.findOne.mockResolvedValue(null); s.identities.fichaPorDocumento.mockResolvedValue(identity);
    await s.submitFromToken('sesion', { documentNumber: '1020304050' });
    expect(s.upsertDocente).toHaveBeenCalledTimes(1); expect(s.invitacionRepo.save).toHaveBeenCalledTimes(1);
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('OTP nuevo falla ante identidad ambigua/no disponible sin convertirla en ausencia', async () => {
    const { s } = build(); s.docenteRepo.findOne.mockResolvedValue(null);
    s.identities.fichaPorDocumento.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.submitFromToken('sesion', { documentNumber: '1020304050' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.upsertDocente).not.toHaveBeenCalled(); expect(s.invitacionRepo.save).not.toHaveBeenCalled();
  });
  it('sesión OTP inválida no consulta identidad ni escribe datos', async () => {
    const { s } = build(); s.requireAutogestionSession.mockRejectedValue(new ForbiddenException());
    await expect(s.submitFromToken('sesion', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.docenteRepo.findOne).not.toHaveBeenCalled(); expect(s.identities.fichaPorPersona).not.toHaveBeenCalled();
    expect(s.identities.fichaPorDocumento).not.toHaveBeenCalled(); expect(s.upsertDocente).not.toHaveBeenCalled();
  });
});
