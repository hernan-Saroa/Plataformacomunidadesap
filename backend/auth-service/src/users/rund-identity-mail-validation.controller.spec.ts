import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RundIdentityMailValidationService } from './rund-identity-mail-validation.controller';
import { identityWriteFingerprint } from './rund-identity-command';
jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('Vigencia propietaria de correo de bienvenida RUND', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111';
  const command = { version: 1 as const, actorId: id,
    payload: { documentNumber: '12345', documentType: 'CC', primer_nombre: 'DOCENTE', primer_apellido: 'FICTICIO', segundo_apellido: null, genero: null, fechaNacimiento: null },
    options: { relaxValidation: false, preserveTerritorial: true }, territorial: null,
    emailFinal: 'ficticio@example.test', phoneFinal: null, finalFullName: 'DOCENTE FICTICIO' };
  const hash = identityWriteFingerprint(command), body = () => ({ comando: command, huellaComando: hash });
  function setup() {
    const fields = ['tip_identificacion','nom_largo','nom_tercero','pri_apellido','seg_apellido','gen_tercero',
      'fec_nacimiento','dir_email','tel_celular','id_seccional','fec_modificacion'];
    const row: any = { estado: 'APLICADA', huella_comando: hash, huella_efecto: hash,
      resultado: { personaId: id, usuarioId: id, usuarioCreado: true }, persona_id: id, usuario_id: id, resuelta: false,
      preimagen: { version: 1, persona: null, usuarios: [], roles: [] },
      postimagen: { version: 1, persona: { id, revision: '12', datos: Object.fromEntries(fields.map(f => [f, null])) },
        usuarios: [{ id, revision: '12', datos: { username: command.emailFinal, updated_at: null } }], roles: [] },
      id_person: id, num_identificacion: '12345', dir_email: command.emailFinal, revision_persona: '12',
      id_user: id, persona_usuario: id, username: command.emailFinal, password_temp: true, is_active: false,
      password_hash: '$2b$10$' + 'a'.repeat(53), revision_usuario: '12', rol_docente: true, conflicto: false };
    const query = jest.fn(async () => JSON.parse(JSON.stringify([row])));
    return { row, query, service: new RundIdentityMailValidationService({ query } as any) };
  }
  beforeEach(() => { jest.clearAllMocks(); (bcrypt.compare as jest.Mock).mockResolvedValue(true); });
  it.each([null, {}, [], { ...body(), extra: true }, { ...body(), comando: {} }])('rechaza cuerpo inválido %j sin SQL', async raw => {
    const s = setup(); await expect(s.service.validar(id, raw)).rejects.toBeInstanceOf(BadRequestException); expect(s.query).not.toHaveBeenCalled();
  });
  it('ID o huella inválidos no consultan identidad', async () => {
    const s = setup(); await expect(s.service.validar('NO', body())).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.validar(id, { ...body(), huellaComando: 'a'.repeat(64) })).rejects.toBeInstanceOf(ConflictException);
    expect(s.query).not.toHaveBeenCalled();
  });
  it('ausencia y operación de otro comando no se presentan como aptas', async () => {
    const s = setup(); s.query.mockResolvedValueOnce([]);
    await expect(s.service.validar(id, body())).rejects.toBeInstanceOf(NotFoundException);
    s.row.huella_comando = 'b'.repeat(64); await expect(s.service.validar(id, body())).rejects.toBeInstanceOf(ConflictException);
  });
  it('alta intacta, inactiva y temporal usa bcrypt en Auth y devuelve solo cinco campos', async () => {
    const s = setup(), result = await s.service.validar(id.toUpperCase(), body());
    expect(result).toEqual({ validacion: { version: 1, operacionId: id, huellaComando: hash, apta: true, motivo: null } });
    expect(bcrypt.compare).toHaveBeenCalledWith('12345', s.row.password_hash); expect(s.query).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toMatch(/12345|ficticio@|password|postimagen|preimagen/);
    expect(s.query.mock.calls.every(([sql]: any) => !/\b(INSERT|UPDATE|DELETE|LOCK)\b/.test(sql))).toBe(true);
  });
  it.each(['estado', 'resuelta', 'existente', 'efecto', 'preimagen', 'postimagen', 'cuenta-previa', 'resultado'])('bloquea operación no elegible: %s', async field => {
    const s = setup();
    if (field === 'estado') s.row.estado = 'REGISTRADA';
    if (field === 'resuelta') s.row.resuelta = true;
    if (field === 'existente') s.row.resultado.usuarioCreado = false;
    if (field === 'efecto') s.row.huella_efecto = null;
    if (field === 'preimagen') s.row.preimagen = {};
    if (field === 'postimagen') s.row.postimagen = {};
    if (field === 'cuenta-previa') s.row.preimagen = s.row.postimagen;
    if (field === 'resultado') s.row.resultado.personaId = 'otra';
    expect((await s.service.validar(id, body())).validacion).toMatchObject({ apta: false, motivo: 'OPERACION_NO_ELEGIBLE' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
  it.each(['id_person','id_user','persona_usuario','num_identificacion','dir_email','username','revision_persona','rol_docente','conflicto'])('bloquea identidad modificada: %s', async field => {
    const s = setup(); s.row[field] = field === 'rol_docente' ? false : field === 'conflicto' ? true : 'otro';
    expect((await s.service.validar(id, body())).validacion).toMatchObject({ apta: false, motivo: 'IDENTIDAD_NO_VIGENTE' });
  });
  it.each(['is_active','password_temp','password_hash','revision_usuario','comparacion'])('bloquea credenciales cambiadas: %s', async field => {
    const s = setup();
    if (field === 'comparacion') (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    else s.row[field] = field === 'is_active' ? true : field === 'password_temp' ? false : 'otro';
    expect((await s.service.validar(id, body())).validacion).toMatchObject({ apta: false, motivo: 'CREDENCIALES_NO_VIGENTES' });
  });
  it('un cambio durante bcrypt o una fila desaparecida impide confirmar apta', async () => {
    for (const next of [[], [{ resuelta: true }]]) {
      const s = setup(); s.query.mockResolvedValueOnce(JSON.parse(JSON.stringify([s.row]))).mockResolvedValueOnce(next);
      expect((await s.service.validar(id, body())).validacion).toMatchObject({ apta: false, motivo: 'IDENTIDAD_NO_VIGENTE' });
    }
  });
  it('SQL y bcrypt fallidos no devuelven parámetros, hash o excepción original', async () => {
    const s = setup(); s.query.mockRejectedValueOnce(new Error('SQL PRIVADO'));
    await expect(s.service.validar(id, body())).rejects.toBeInstanceOf(ServiceUnavailableException);
    (bcrypt.compare as jest.Mock).mockRejectedValueOnce(new Error('HASH PRIVADO'));
    await expect(s.service.validar(id, body())).rejects.toThrow('Auth no confirma la vigencia');
  });
});
