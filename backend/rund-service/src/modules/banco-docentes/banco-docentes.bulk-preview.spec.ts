import { BancoDocentesService, normalizeBancoDocentePayload } from './banco-docentes.service';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { planRundNativeProfile } from './rund-native-profile-plan';
import { planRundAuthPersona } from './rund-auth-persona-plan';
import { ServiceUnavailableException } from '@nestjs/common';

const row = { DOCUMENTO_IDENTIDAD: '9000000001', TIPO_DOCUMENTO: 'CC', NOMBRE_COMPLETO: 'DOCENTE FICTICIO',
  GENERO: 'M', FECHA_NACIMIENTO: '1980-01-01', CORREO_INSTITUCIONAL: 'ficticio@example.test',
  VINCULACION: 'CARRERA', TERRITORIAL: 'Sede Central', DEDICACION: 'TIEMPO_COMPLETO',
  CATEGORIA_ESCALAFON: 'ASOCIADO', INICIO_VINCULACION: '2026-01-01', ACTO_ADMINISTRATIVO: 'ACTO FICTICIO',
  NIVEL_FORMACION: 'MAESTRIA', TITULO_PREGRADO: 'ADMINISTRACION PUBLICA', NUCLEO_TEMATICO: 'GESTION PUBLICA',
  PERFIL_ACADEMICO: 'DOCENCIA', HORAS_PTA: 720, PERIODO_CARGA: '2026-2' };
const personaId = '11111111-1111-4111-8111-111111111111', userId = '22222222-2222-4222-8222-222222222222';
const territorial = { id: '9007199254740993', nombre: 'Sede Central', codigo: null };
const normalization = { formatDateOnly: (v: any) => v ? new Date(v).toISOString().slice(0, 10) : null,
  splitFullName: () => ({ primer_nombre: 'DOCENTE', primer_apellido: 'FICTICIO' }), normalizeLookupText: (v: any) => String(v).toLowerCase() };
function setup(existing = false) {
  const payload = normalizeBancoDocentePayload(row);
  const persona: any = { id_person: personaId, num_identificacion: payload.documentNumber, tip_identificacion: payload.documentType,
    nom_largo: payload.fullName, nom_tercero: payload.primer_nombre || 'DOCENTE', pri_apellido: payload.primer_apellido || 'FICTICIO',
    seg_apellido: payload.segundo_apellido, gen_tercero: 'M', fec_nacimiento: '1980-01-01', dir_email: payload.correoInstitucional,
    tel_celular: null, id_seccional: territorial.id };
  const input: any = { payload, rawPayload: row, options: { bulkImport: true }, territorial,
    emailFinal: payload.correoInstitucional, phoneFinal: null, finalFullName: payload.fullName,
    identity: { authPersonId: personaId, authUser: { id_user: userId }, authUserCreated: false, personaChangedFields: [], profileChanges: {} } };
  const profile: any = { ...planRundNativeProfile(input, null, 'RUND-0100').docenteData, id: 'PERFIL-FICTICIO' };
  const state: any = { persona: existing ? persona : null, user: existing ? { id_user: userId, username: payload.correoInstitucional } : null,
    profile: existing ? profile : null, conflict: false, role: true, failure: false };
  const query = jest.fn(async () => { throw new Error('SQL DE IDENTIDAD PROHIBIDO EN RUND'); });
  const identities = { previsualizacionMasiva: jest.fn(async (documento: string, correo: string) => {
    if (state.failure) throw new ServiceUnavailableException('No fue posible consultar la identidad del preview en Auth.');
    return { consulta: { version: 1, documento, correo }, persona: state.persona, usuario: state.user,
      conflictoCorreo: state.conflict, rolDocenteDisponible: state.role, reserva: false };
  }) };
  const manager = { query, findOne: jest.fn(async (entity: any, options: any) => {
    expect(entity).toBe(BancoDocenteEntity);
    return !options.where.periodoCarga || options.where.periodoCarga === state.profile?.periodoCarga ? state.profile : null;
  }), save: jest.fn(() => { throw new Error('GUARDADO PROHIBIDO'); }) };
  const dataSource = { manager, query: jest.fn(() => { throw new Error('SOPORTE PROHIBIDO'); }),
    transaction: jest.fn(() => { throw new Error('TRANSACCION PROHIBIDA'); }) };
  const catalogos = { territorialesBanco: jest.fn(async () => [territorial]), periodoActivo: jest.fn(async () => '2026-2') };
  const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
  Object.assign(service, { dataSource, catalogos, identities });
  const persist = jest.spyOn(service, 'persistirPerfilNativoConManager').mockImplementation(() => { throw new Error('ESCRITOR PROHIBIDO'); });
  const mail = jest.spyOn(service as any, 'sendWelcomeEmail').mockImplementation(() => { throw new Error('CORREO PROHIBIDO'); });
  return { service, state, manager, dataSource, catalogos, persist, mail, input, persona, profile, identities };
}
async function preview(s: ReturnType<typeof setup>, rows: any[] = [row], options: any = {}) {
  const result = await s.service.bulkUpsert(rows, { ...options, dryRun: true });
  expect(s.dataSource.transaction).not.toHaveBeenCalled(); expect(s.dataSource.query).not.toHaveBeenCalled();
  expect(s.manager.save).not.toHaveBeenCalled(); expect(s.persist).not.toHaveBeenCalled(); expect(s.mail).not.toHaveBeenCalled();
  expect(s.manager.query).not.toHaveBeenCalled();
  expect(result.soporteCargaMasivaId).toBeNull(); return result;
}
describe('Preview masivo sin escrituras, rollback o secuencias', () => {
  it('predice alta sin fabricar IDs, crear credenciales, consumir secuencias o guardar soporte', async () => {
    const s = setup(), result = await preview(s);
    expect(result).toMatchObject({ total: 1, created: 1, updated: 0, unchanged: 0, errors: 0 });
    expect(result.results[0]).toMatchObject({ action: 'insert', personaId: null, docenteId: null, usuarioId: null,
      authUserCreated: true, welcomeEmail: { sent: false, skipped: false }, sourceRowNumber: 2 });
    expect(s.manager.findOne).not.toHaveBeenCalled();
  });
  it('clasifica una fila idéntica con las mismas propuestas de persona/perfil del escritor', async () => {
    const s = setup(true), result = await preview(s);
    expect(result).toMatchObject({ created: 0, updated: 0, unchanged: 1, errors: 0 });
    expect(result.results[0]).toMatchObject({ personaId, docenteId: 'PERFIL-FICTICIO', usuarioId: userId, authUserCreated: false });
  });
  it.each([
    ['HORAS_PTA', 800], ['PUNTAJE_SALARIAL', 222], ['CATEGORIA_ESCALAFON', 'TITULAR'],
    ['CORREO_INSTITUCIONAL', 'nuevo@example.test'], ['NOMBRE_COMPLETO', 'OTRO NOMBRE FICTICIO'],
    ['TERRITORIAL', 'Territorial no catalogada'], ['INICIO_VINCULACION', '2026-02-01'],
    ['TELEFONO', '3001234567'], ['FECHA_NACIMIENTO', '1981-02-03'], ['GENERO', 'F'],
  ])('detecta cambio de %s sin modificar el estado previo', async (key, value) => {
    const s = setup(true), before = JSON.stringify(s.state);
    const result = await preview(s, [{ ...row, [key]: value }]); expect(result.updated).toBe(1); expect(result.errors).toBe(0);
    expect(JSON.stringify(s.state)).toBe(before);
  });
  it('el cambio de username cuenta como actualización aunque persona y perfil coincidan', async () => {
    const s = setup(true); s.state.user.username = 'anterior@example.test'; expect((await preview(s)).updated).toBe(1);
  });
  it('persona sin usuario se conserva y solo predice el usuario pendiente', async () => {
    const s = setup(true); s.state.user = null; const result = await preview(s);
    expect(result.results[0]).toMatchObject({ personaId, usuarioId: null, docenteId: 'PERFIL-FICTICIO', authUserCreated: true });
    expect(result.unchanged).toBe(1); // Conserva la clasificación anterior: usuario nuevo sin cambios de perfil/persona.
  });
  it('persona existente en otro período predice un perfil nuevo y conserva los IDs existentes', async () => {
    const s = setup(true), result = await preview(s, [{ ...row, PERIODO_CARGA: '2025-1' }]);
    expect(result.created).toBe(1); expect(result.results[0]).toMatchObject({ personaId, usuarioId: userId, docenteId: null });
    expect(s.manager.findOne).toHaveBeenCalledWith(BancoDocenteEntity, { where: { personaId, periodoCarga: '2025-1' } });
  });
  it('perfil sin ID RUND requiere asignación futura, sin calcular o reservar el número', async () => {
    const s = setup(true); s.state.profile.idRund = null; expect((await preview(s)).updated).toBe(1);
    expect(s.manager.query).not.toHaveBeenCalled();
  });
  it('respeta rejectExisting y conserva la ubicación del error', async () => {
    const s = setup(true), result = await preview(s, [{ ...row, __sourceRowNumber: 17 }], { rejectExisting: true });
    expect(result.errors).toBe(1); expect(result.errorDetails[0]).toMatchObject({ row: 17, fila: 17, columna: 'DOCUMENTO_IDENTIDAD', blocking: true });
  });
  it('duplicados del archivo se bloquean antes de leer identidad', async () => {
    const s = setup(), result = await preview(s, [row, { ...row }]);
    expect(result.errors).toBe(2); expect(result.results).toEqual([]); expect(s.manager.query).not.toHaveBeenCalled();
    expect(result.errorDetails[0]).toMatchObject({ tipo: 'DUPLICADO_DOCUMENTO', filasDuplicadas: [2, 3] });
  });
  it('la misma cédula en períodos distintos conserva dos propuestas independientes', async () => {
    const s = setup(), result = await preview(s, [row, { ...row, PERIODO_CARGA: '2025-1' }]);
    expect(result.created).toBe(2); expect(result.errors).toBe(0);
  });
  it('una fila inválida no bloquea la siguiente y mantiene el contrato de errores', async () => {
    const s = setup(), result = await preview(s, [{ ...row, DOCUMENTO_IDENTIDAD: '99999', CORREO_INSTITUCIONAL: 'inválido' }, row]);
    expect(result).toMatchObject({ total: 2, created: 1, errors: 1 });
    expect(result.errorDetails[0]).toMatchObject({ row: 2, hoja: 'CARGA_DOCENTES', columna: 'CORREO_INSTITUCIONAL', blocking: true });
    expect(result.results[0].sourceRowNumber).toBe(3);
  });
  it.each(['conflict', 'role', 'failure'])('fallo %s no devuelve compatibilidad o detalles SQL', async kind => {
    const s = setup(); s.state[kind] = kind !== 'role'; const result = await preview(s);
    expect(result.errors).toBe(1); expect(result.results).toEqual([]); expect(JSON.stringify(result)).not.toContain('SQL PRIVADO');
  });
  it('no muta filas originales ni acepta flags/IDs de preview elegidos por el archivo', async () => {
    const s = setup(), rows = [{ ...row, previewOnly: false, personaId: userId, usuarioId: userId, __previewId: 'fila-local' }];
    const before = JSON.stringify(rows), result = await preview(s, rows);
    expect(JSON.stringify(rows)).toBe(before); expect(result.results[0]).toMatchObject({ previewId: 'fila-local', personaId: null, usuarioId: null });
  });
  it('teléfono no normalizable conserva la observación de revisión de formato y predice actualización', async () => {
    const s = setup(true), result = await preview(s, [{ ...row, TELEFONO: 'extensión pendiente' }]);
    expect(result.updated).toBe(1); expect(result.errors).toBe(0);
  });
  it('la propuesta de persona preserva bigint y comparación civil de fechas', () => {
    const s = setup(true), proposal = planRundAuthPersona(s.input, normalization, s.persona);
    expect(proposal.authSeccionalId).toBe('9007199254740993'); expect(proposal.personaChangedFields).toEqual([]);
  });
});
