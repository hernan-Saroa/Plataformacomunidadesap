import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';
import { BancoDocentesController } from './banco-docentes.controller';

const personaId = '11111111-1111-4111-8111-111111111111', docenteId = '22222222-2222-4222-8222-222222222222';
const ficha = { personaId, num_identificacion: '0012345678', tip_identificacion: 'CC', nom_largo: '',
  nom_tercero: 'DOS NOMBRES', pri_apellido: 'APELLIDO', seg_apellido: 'SEGUNDO', gen_tercero: 'F',
  fec_nacimiento: '1980-01-17', dir_email: 'personal@example.test', tel_celular: '3001234567' };
function build() {
  const s = Object.create(BancoDocentesService.prototype) as any;
  s.identities = { fichaPorPersona: jest.fn().mockResolvedValue(ficha), fichaPorDocumento: jest.fn().mockResolvedValue(ficha),
    personasPorAlias: jest.fn().mockResolvedValue([personaId]) };
  s.docenteRepo = { findOne: jest.fn().mockResolvedValue({ id: docenteId, personaId, correoInstitucional: 'institucional@example.test',
    correoAlternativo: 'alternativo@example.test', territorialReportada: 'META', puntajeSalarial: 0, periodoCarga: '2026-2' }) };
  s.dataSource = { query: jest.fn().mockResolvedValue([]) };
  s.getBloques = jest.fn().mockResolvedValue([]);
  s.list = jest.fn().mockResolvedValue({ data: [] });
  s.requireAutogestionSession = jest.fn().mockResolvedValue({ id: 'invite', correoInstitucional: 'institucional@example.test' });
  s.logSensitiveDataAccess = jest.fn().mockResolvedValue(undefined);
  return s;
}
describe('Identidad puntual de autogestión y tarjeta RUND', () => {
  it('tarjeta conserva columnas, fecha civil, ceros y estructura sin leer Auth por SQL', async () => {
    const s = build(), card = await s.getTarjetaRUND(docenteId);
    expect(card.bloques.IDENTIDAD.campos).toEqual(expect.arrayContaining([
      { campo: 'DOCUMENTO_IDENTIDAD', valor: ficha.num_identificacion, editable: false },
      { campo: 'FECHA_NACIMIENTO', valor: '1980-01-17', editable: false },
      { campo: 'GENERO', valor: 'F', editable: false },
    ]));
    expect(card.bloques.CONTACTO.campos).toContainEqual({ campo: 'TELEFONO', valor: ficha.tel_celular, editable: true });
    expect(card.bloques.VINCULACION.campos).toContainEqual({ campo: 'PUNTAJE_SALARIAL', valor: 0, editable: true });
    expect(s.identities.fichaPorPersona).toHaveBeenCalledWith(personaId);
    expect(s.dataSource.query.mock.calls.every(([sql]) => !/auth\./.test(sql))).toBe(true);
  });
  it('tarjeta conserva nulos solamente ante ausencia confirmada de persona', async () => {
    const s = build(); s.identities.fichaPorPersona.mockResolvedValue(null);
    expect((await s.getTarjetaRUND(docenteId)).bloques.IDENTIDAD.campos)
      .toContainEqual({ campo: 'DOCUMENTO_IDENTIDAD', valor: null, editable: false });
  });
  it('tarjeta falla antes de consultar bloques/soportes si Auth no confirma la identidad', async () => {
    const s = build(); s.identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.getTarjetaRUND(docenteId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.getBloques).not.toHaveBeenCalled(); expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('autogestión directa usa nombres/contactos reales de Auth y enmascara la cédula', async () => {
    const s = build(), info = await s.getAutogestionInfo('sesion');
    expect(info).toMatchObject({ nombre_completo: 'DOS NOMBRES APELLIDO', primer_nombre: 'DOS NOMBRES',
      primer_apellido: 'APELLIDO', segundo_nombre: null, segundo_apellido: 'SEGUNDO',
      correo_personal: ficha.dir_email, telefono: ficha.tel_celular, documento_identidad: '******5678', puntaje_salarial: null });
    expect(s.identities.fichaPorPersona).toHaveBeenCalledWith(personaId);
    expect(s.logSensitiveDataAccess).toHaveBeenCalledWith([expect.objectContaining({ fullAccess: false, endpoint: 'AUTOGESTION_MI_PERFIL' })]);
    expect(s.dataSource.query.mock.calls.every(([sql]) => !/auth\./.test(sql))).toBe(true);
  });
  it('autogestión con coincidencia del listado no pide una segunda ficha', async () => {
    const s = build(); s.list.mockResolvedValue({ data: [{ docente_id: docenteId, correo_institucional: 'institucional@example.test' }] });
    await s.getAutogestionInfo('sesion'); expect(s.identities.fichaPorPersona).not.toHaveBeenCalled();
  });
  it('autogestión conserva respaldo nativo cuando Auth confirma persona ausente', async () => {
    const s = build(); s.identities.fichaPorPersona.mockResolvedValue(null);
    expect(await s.getAutogestionInfo('sesion')).toMatchObject({ nombre_completo: 'institucional@example.test',
      documento_identidad: null, correo_personal: 'alternativo@example.test' });
  });
  it('autogestión no audita ni devuelve un perfil parcial ante fallo de identidad', async () => {
    const s = build(); s.identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.getAutogestionInfo('sesion')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.dataSource.query).not.toHaveBeenCalled(); expect(s.logSensitiveDataAccess).not.toHaveBeenCalled();
  });
  it('sesión inválida bloquea autogestión antes de consultar cualquier identidad', async () => {
    const s = build(); s.requireAutogestionSession.mockRejectedValue(new ForbiddenException());
    await expect(s.getAutogestionInfo('sesion')).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.list).not.toHaveBeenCalled(); expect(s.identities.fichaPorPersona).not.toHaveBeenCalled();
  });
  it('alias conserva todas las personas candidatas y selección de período/fecha en RUND', async () => {
    const s = build(); s.dataSource.query.mockResolvedValue([{ id: docenteId }]);
    await expect(s.resolveDocenteId(' 001.234.567.8 ', '2026-2')).resolves.toBe(docenteId);
    expect(s.identities.personasPorAlias).toHaveBeenCalledWith(' 001.234.567.8 ');
    const [sql, params] = s.dataSource.query.mock.calls[0];
    expect(params).toEqual([[personaId], '2026-2']); expect(sql).toContain('d."updatedAt" DESC NULLS LAST');
    expect(sql).not.toMatch(/auth\.|::uuid/);
  });
  it('ID nativo UUID sigue resolviendo sin depender de Auth', async () => {
    const s = build(); await expect(s.resolveDocenteId(docenteId)).resolves.toBe(docenteId);
    expect(s.identities.personasPorAlias).not.toHaveBeenCalled(); expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('alias confirmado ausente conserva el ID original sin SQL adicional', async () => {
    const s = build(); s.identities.personasPorAlias.mockResolvedValue([]);
    await expect(s.resolveDocenteId('DOC-TEXTUAL')).resolves.toBe('DOC-TEXTUAL');
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('alias no confirmado falla sin consultas alternativas', async () => {
    const s = build(); s.identities.personasPorAlias.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.resolveDocenteId('documento')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('tarjeta por documento exige comparación exacta y conserva perfil/período', async () => {
    const s = build(); s.getTarjetaRUND = jest.fn().mockResolvedValue({ docenteId });
    await expect(s.getTarjetaRUNDByPersona(' 001.23 ', '2025-1')).resolves.toEqual({ docenteId });
    expect(s.identities.fichaPorDocumento).toHaveBeenCalledWith(' 001.23 ');
    expect(s.docenteRepo.findOne).toHaveBeenCalledWith({ where: { personaId, periodoCarga: '2025-1' } });
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('aprovisionamiento conserva payload/reglas existentes usando identidad confirmada del propietario', async () => {
    const s = build(); s.docenteRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: docenteId });
    s.upsertDocente = jest.fn().mockResolvedValue({ docenteId }); s.getTarjetaRUND = jest.fn().mockResolvedValue({ docenteId });
    await s.getTarjetaRUNDByPersona(personaId, '2026-2');
    expect(s.upsertDocente).toHaveBeenCalledWith(expect.objectContaining({ personaId, documentNumber: ficha.num_identificacion,
      correo_institucional: ficha.dir_email, territorial: 'Sede Central', vinculacion: 'Ocasional', estado: 'Inactivo', periodoCarga: '2026-2' }),
    expect.objectContaining({ rejectExisting: false, audit: expect.objectContaining({ soporteId: 'AUTH_PROFILE' }) }));
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('persona ausente no aprovisiona y falla explícitamente si la identidad no se puede confirmar', async () => {
    const s = build(); s.docenteRepo.findOne.mockResolvedValue(null); s.upsertDocente = jest.fn();
    s.identities.fichaPorPersona.mockResolvedValue(null);
    await expect(s.getTarjetaRUNDByPersona(personaId)).resolves.toBeNull();
    s.identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.getTarjetaRUNDByPersona(personaId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.upsertDocente).not.toHaveBeenCalled();
  });
  it('controlador devuelve 503 ante Auth caído en ambas rutas de tarjeta', async () => {
    const service = { getTarjetaRUND: jest.fn().mockRejectedValue(new ServiceUnavailableException()),
      getTarjetaRUNDByPersona: jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
    const c = new BancoDocentesController(service as any, {} as any);
    await expect(c.getTarjetaRUND(docenteId, {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(c.getTarjetaRUNDByPersona(personaId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
