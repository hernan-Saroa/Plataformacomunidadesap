import { BadRequestException } from '@nestjs/common';
import { upsertRundAuthIdentityWithManager, RundAuthWriteInput } from './rund-auth-identity-write';

describe('Escritura Auth con el manager de la operación RUND', () => {
  const input = (): RundAuthWriteInput => ({ payload: { documentNumber: '000123', documentType: 'CC', primer_nombre: 'PRUEBA',
    primer_apellido: 'FICTICIA', segundo_apellido: null, genero: 'F', fechaNacimiento: null },
    options: {}, territorial: { id: '9007199254740993' }, emailFinal: 'prueba@example.test', phoneFinal: null, finalFullName: 'PRUEBA FICTICIA' });
  const normalization = { formatDateOnly: (v: any) => v ? new Date(v).toISOString().slice(0, 10) : null,
    splitFullName: () => ({ primer_nombre: 'PRUEBA', primer_apellido: 'FICTICIA' }), normalizeLookupText: (v: any) => String(v).toLowerCase() };
  const person = () => ({ id_person: 'persona', tip_identificacion: 'CC', nom_largo: 'PRUEBA FICTICIA', nom_tercero: 'PRUEBA',
    pri_apellido: 'FICTICIA', seg_apellido: null, gen_tercero: 'F', fec_nacimiento: null, dir_email: 'prueba@example.test', tel_celular: null, id_seccional: '9007199254740993' });
  function manager(options: any = {}) {
    return { query: jest.fn(async (sql: string): Promise<any[]> => {
      const q = sql.replace(/\s+/g, ' ').trim();
      if (q.startsWith('SELECT * FROM auth.personas WHERE LOWER')) return options.byEmail ? [options.byEmail] : [];
      if (q.startsWith('SELECT * FROM auth.personas')) return options.person ? [options.person] : [];
      if (q.startsWith('SELECT owner_id')) return options.conflict ? [{ owner_id: 'otra-persona' }] : [];
      if (q.includes('information_schema.columns')) return options.noLegacyColumn ? [] : [{ column_default: options.sequence ? "nextval('auth.personas_seq')" : null }];
      if (q.startsWith('SELECT nextval') || q.startsWith('SELECT COALESCE(MAX')) return [{ next_id: '9007199254740995' }];
      if (q.startsWith('SELECT * FROM auth."user"')) return options.user ? [options.user] : [];
      if (q.includes('FROM auth.role')) return options.noRole ? [] : [{ id: 'rol-docente' }];
      return [];
    }) };
  }
  it('conserva ID bigint textual, creación inactiva y contraseña temporal sin abrir otra transacción', async () => {
    const db = manager({ sequence: true }), result = await upsertRundAuthIdentityWithManager(db, input(), normalization);
    expect(result.authUserCreated).toBe(true); expect(result.authPersonId).toMatch(/^[0-9a-f-]{36}$/);
    const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO auth.personas')) as any[];
    expect(insert[1]).toContain('9007199254740995'); expect(insert[1]).toContain('9007199254740993');
    const user = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO auth."user"')) as any[];
    expect(user[0]).toContain('false, true, now(), now()'); expect(user[1][3]).toMatch(/^\$2[aby]\$10\$/);
    expect(db.query.mock.calls.some(([sql]) => /BEGIN|COMMIT|ROLLBACK/.test(sql))).toBe(false);
  });
  it('reimportar identidad y usuario iguales conserva contraseña, estado y campos sin generar actualizaciones', async () => {
    const db = manager({ person: person(), user: { id_user: 'usuario', username: 'PRUEBA@example.test' } });
    const result = await upsertRundAuthIdentityWithManager(db, input(), normalization);
    expect(result.authUserCreated).toBe(false); expect(result.personaChangedFields).toEqual([]); expect(result.profileChanges).toEqual({});
    expect(db.query.mock.calls.some(([sql]) => /UPDATE auth\.|INSERT INTO auth\.personas|INSERT INTO auth\."user"/.test(sql))).toBe(false);
  });
  it('cambios de nombre y username conservan sus valores anteriores para auditoría sin cambiar contraseña', async () => {
    const db = manager({ person: { ...person(), nom_largo: 'ANTERIOR' }, user: { id_user: 'usuario', username: 'anterior@example.test' } });
    const result = await upsertRundAuthIdentityWithManager(db, input(), normalization);
    expect(result.personaChangedFields).toEqual(['nom_largo', 'username']);
    expect(result.profileChanges.username).toEqual({ anterior: 'anterior@example.test', nuevo: 'prueba@example.test' });
    expect(db.query.mock.calls.some(([sql]) => /password_hash\s*=/.test(sql))).toBe(false);
  });
  it('conflicto de correo conserva el error de negocio y detiene las escrituras', async () => {
    const db = manager({ conflict: true });
    await expect(upsertRundAuthIdentityWithManager(db, input(), normalization)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query.mock.calls.some(([sql]) => /INSERT|UPDATE|LOCK|nextval/.test(sql))).toBe(false);
  });
  it('solo la opción interna de autogestión permite resolver la persona por email', async () => {
    const data = input(), db = manager({ byEmail: person(), user: { id_user: 'usuario', username: data.emailFinal } });
    data.options.relaxValidation = true;
    expect((await upsertRundAuthIdentityWithManager(db, data, normalization)).authPersonId).toBe('persona');
    expect(db.query.mock.calls.some(([sql]) => sql.includes('WHERE LOWER(dir_email)'))).toBe(true);
    const manual = manager({ person: person(), user: { id_user: 'usuario', username: data.emailFinal } });
    await upsertRundAuthIdentityWithManager(manual, input(), normalization);
    expect(manual.query.mock.calls.some(([sql]) => sql.includes('WHERE LOWER(dir_email)'))).toBe(false);
  });
  it('preservar territorial no reasigna la seccional anterior', async () => {
    const data = input(); data.options.preserveTerritorial = true;
    const db = manager({ person: { ...person(), id_seccional: '123' }, user: { id_user: 'usuario', username: data.emailFinal } });
    expect((await upsertRundAuthIdentityWithManager(db, data, normalization)).personaChangedFields).toEqual([]);
  });
  it('sin default de secuencia conserva LOCK TABLE y MAX+1 con el mismo manager', async () => {
    const db = manager(); await upsertRundAuthIdentityWithManager(db, input(), normalization);
    const calls = db.query.mock.calls.map(([sql]) => sql);
    const lock = calls.findIndex(sql => sql.includes('LOCK TABLE auth.personas IN EXCLUSIVE MODE'));
    expect(lock).toBeGreaterThan(0); expect(calls[lock + 1]).toContain('MAX(id_tercero)');
  });
  it('sin columna legacy no reserva ni inserta id_tercero', async () => {
    const db = manager({ noLegacyColumn: true }); await upsertRundAuthIdentityWithManager(db, input(), normalization);
    expect(db.query.mock.calls.some(([sql]) => /LOCK TABLE|nextval/.test(sql))).toBe(false);
    expect(db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO auth.personas'))?.[0]).not.toContain('id_tercero');
  });
  it('rol faltante falla para que el llamador revierta persona y cuenta, sin confirmar cambios', async () => {
    const db = manager({ noRole: true });
    await expect(upsertRundAuthIdentityWithManager(db, input(), normalization)).rejects.toThrow('No existe el rol DOCENTE en auth.role.');
    expect(db.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO auth.user_roles'))).toBe(false);
    expect(db.query.mock.calls.some(([sql]) => /COMMIT|ROLLBACK/.test(sql))).toBe(false);
  });
  it('el error SQL se propaga sin compensaciones ni reintentos que dupliquen efectos', async () => {
    const query = jest.fn().mockRejectedValue(new Error('SQL no disponible'));
    await expect(upsertRundAuthIdentityWithManager({ query }, input(), normalization)).rejects.toThrow('SQL no disponible'); expect(query).toHaveBeenCalledTimes(1);
  });
});
