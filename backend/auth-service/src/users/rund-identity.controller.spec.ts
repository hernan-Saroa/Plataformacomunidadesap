import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RundIdentityController, RundIdentityGuard, RundIdentityService } from './rund-identity.controller';

const personaId = '11111111-1111-4111-8111-111111111111';
const context = (headers: Record<string, unknown> = {}) => ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

describe('Identidad interna de RUND en Auth', () => {
  const query = jest.fn();
  const service = new RundIdentityService({ query } as any);
  beforeEach(() => query.mockReset());

  it('permisos por roles conserva filtros y null activo, con roles/códigos parametrizados y sin mutaciones', async () => {
    const consulta = { roles: ['LECTOR', "ROL' OR true --"], codigos: ['rund.view', 'banco-docentes.rund.view'] };
    query.mockResolvedValue([{ code: 'rund.view' }]);
    await expect(new RundIdentityController(service).permisosRoles(consulta)).resolves.toEqual({ consulta, items: [{ code: 'rund.view' }], total: 1 });
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual([consulta.roles, consulta.codigos]);
    expect(sql).toContain('SELECT DISTINCT p.code');
    expect(sql).toContain('COALESCE(r.is_active, true) = true');
    expect(sql).toContain('COALESCE(p.is_active, true) = true');
    expect(sql).toContain('COALESCE(rp.is_active, true) = true');
    expect(sql).toContain('UPPER(r.code) = ANY($1::text[]) AND p.code = ANY($2::text[])');
    expect(sql).not.toContain(consulta.roles[1]); expect(sql).not.toMatch(/user_roles|auth\."user"|TRIM|INSERT|UPDATE|DELETE/);
  });
  it('permisos confirma conjunto vacío y conserva fallo de fuente como error', async () => {
    const consulta = { roles: [], codigos: ['rund.view'] }; query.mockResolvedValue([]);
    await expect(service.permisosRoles(consulta)).resolves.toEqual({ consulta, items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente caída')); await expect(service.permisosRoles(consulta)).rejects.toThrow('fuente caída');
  });
  it.each([null, [], {}, { roles: 'LECTOR', codigos: [] }, { roles: ['LECTOR'], codigos: null },
    { roles: [null], codigos: ['rund.view'] }, { roles: ['LECTOR'], codigos: [1] }])('permisos rechaza body incompatible antes de consultar SQL %s', async raw => {
    await expect(service.permisosRoles(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });

  it('sincronización resuelve un único rol DOCENTE activo sin recortar el código', async () => {
    query.mockResolvedValue([{ id: personaId }]);
    await expect(new RundIdentityController(service).rolDocenteSync()).resolves.toEqual({ rolId: personaId });
    expect(query).toHaveBeenCalledWith("SELECT id FROM auth.role WHERE UPPER(code) = 'DOCENTE' AND is_active = true");
  });
  it.each([{ rows: [] }, { rows: [{ id: personaId }, { id: personaId }] }])('rol ausente o ambiguo detiene la sincronización %s', async ({ rows }) => {
    query.mockResolvedValue(rows);
    await expect(service.rolDocenteSync()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('revalidación exige cuenta interna de la persona y asignación activa del rol solicitado', async () => {
    const consulta = { personaId, usuarioId: personaId, rolId: personaId };
    const identidad = { id_person: personaId, usuario_activo: null, rol_docente_activo: false };
    query.mockResolvedValue([identidad]);
    await expect(new RundIdentityController(service).revalidarSync(consulta)).resolves.toEqual({ consulta, encontrada: true, identidad });
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual([personaId, personaId, personaId]);
    expect(sql).toContain('p.id_person = $1 AND u.id_user = $2 LIMIT 1');
    expect(sql).toContain('ur.id_rol = $3 AND ur.is_active = true AND r.is_active = true');
    expect(sql).toContain('p.id_seccional::text AS territorial_id');
    expect(sql).not.toMatch(/COALESCE|public_id|INSERT|UPDATE|DELETE|rund\./);
  });
  it('revalidación ausente es explícita y no convierte fallos SQL en ausencia', async () => {
    const consulta = { personaId, usuarioId: personaId, rolId: personaId };
    query.mockResolvedValue([]);
    await expect(service.revalidarSync(consulta)).resolves.toEqual({ consulta, encontrada: false, identidad: null });
    query.mockRejectedValue(new Error('fuente caída'));
    await expect(service.revalidarSync(consulta)).rejects.toThrow('fuente caída');
  });
  it.each([null, [], {}, 'consulta', { personaId, usuarioId: personaId },
    { personaId, usuarioId: 'public-id', rolId: personaId }, { personaId: "' OR true --", usuarioId: personaId, rolId: personaId },
    { personaId, usuarioId: personaId, rolId: null }])('revalidación rechaza IDs inválidos antes de SQL %s', async raw => {
    await expect(service.revalidarSync(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });

  it('destinatario conserva usuario/persona/username, estado nulo activo y prioridad de usuario exacto', async () => {
    query.mockResolvedValue([{ id_user: personaId }]);
    const consulta = ' Usuario Con Espacios ';
    await expect(new RundIdentityController(service).destinatarioAviso({ clave: consulta })).resolves.toEqual({ consulta, encontrado: true, usuarioId: personaId });
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual([consulta]);
    expect(sql).toContain('COALESCE(is_active,true)=true');
    expect(sql).toContain('id_user::text=$1 OR id_person::text=$1 OR lower(username)=lower($1)');
    expect(sql).toContain('ORDER BY (id_user::text=$1) DESC LIMIT 1');
    expect(sql).not.toMatch(/personas|role|public_id|rund\.|INSERT|UPDATE|DELETE/);
  });
  it.each(['', ' ', "alias' OR true --"])('destinatario parametriza y conserva literalmente la clave %s', async clave => {
    query.mockResolvedValue([]);
    await expect(service.destinatarioAviso({ clave })).resolves.toEqual({ consulta: clave, encontrado: false, usuarioId: null });
    expect(query.mock.calls[0][1]).toEqual([clave]);
  });
  it('fallo de la fuente de destinatarios no se transforma en ausencia confirmada', async () => {
    query.mockRejectedValue(new Error('fuente caída'));
    await expect(service.destinatarioAviso({ clave: 'actor' })).rejects.toThrow('fuente caída');
  });
  it.each([null, [], {}, 'actor', { clave: null }, { clave: 1 }, { clave: ['actor'] }])('destinatario rechaza body inválido antes de SQL %s', async raw => {
    await expect(service.destinatarioAviso(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });

  it('devuelve solo identidad persistida, sin depender de un usuario activo o de un rol', async () => {
    const identity = { personaId, documento: '123', nombreCompleto: null };
    query.mockResolvedValue([identity]);
    await expect(new RundIdentityController(service).porDocumento(' 123 ')).resolves.toEqual(identity);
    expect(query.mock.calls[0][1]).toEqual(['123']);
    expect(query.mock.calls[0][0]).toContain('FROM auth.personas');
    expect(query.mock.calls[0][0]).not.toMatch(/is_active|user_roles|rund\./);
  });

  it('resuelve alias de usuario o persona en Auth mediante parámetros', async () => {
    query.mockResolvedValue([{ personaId }]);
    const alias = "alias' OR true --";
    await expect(new RundIdentityController(service).resolver(alias)).resolves.toEqual({ personaId });
    expect(query.mock.calls[0][1]).toEqual([alias]);
    expect(query.mock.calls[0][0]).not.toContain(alias);
    expect(query.mock.calls[0][0]).toContain('u.id_user::text=$1');
  });

  it.each(['porDocumento', 'resolver'] as const)('%s conserva 404 para identidad ausente', async method => {
    query.mockResolvedValue([]);
    await expect(service[method]('ausente')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no elige una persona arbitraria si el documento está duplicado', async () => {
    query.mockResolvedValue([{ personaId }, { personaId: 'otra' }]);
    await expect(service.porDocumento('123')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['', ' ', 'x'.repeat(257)])('rechaza claves inválidas antes de SQL', async value => {
    await expect(service.porDocumento(value)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resolver(value)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('acepta exclusivamente el token interno configurado', () => {
    const guard = new RundIdentityGuard({ get: () => 'interno-ficticio' } as any);
    expect(guard.canActivate(context({ 'x-internal-service-token': 'interno-ficticio' }))).toBe(true);
  });

  it('perfil PTA conserva documento normalizado, composición de nombre e ID de seccional sin exigir usuario', async () => {
    const identity = { personaId, documento: '0012345', nombreCompleto: 'Nombre compuesto', territorialId: '9007199254740993' };
    query.mockResolvedValue([identity]);
    await expect(new RundIdentityController(service).perfilPta('0012345')).resolves.toEqual({ encontrada: true, ...identity });
    expect(query.mock.calls[0][1]).toEqual(['0012345']);
    expect(query.mock.calls[0][0]).toContain("CONCAT_WS(' ', p.nom_tercero, p.pri_apellido, p.seg_apellido)");
    expect(query.mock.calls[0][0]).not.toMatch(/auth\."user"|user_roles|rund\.|salario|puntaje/);
  });

  it('perfil PTA confirma ausencia por contrato explícito, sin confundirla con ruta 404', async () => {
    query.mockResolvedValue([]);
    await expect(service.perfilPta('123')).resolves.toEqual({ encontrada: false, documento: '123' });
  });

  it('perfil PTA con documento normalizado duplicado no selecciona una persona arbitraria', async () => {
    query.mockResolvedValue([{ personaId }, { personaId: 'otra' }]);
    await expect(service.perfilPta('123')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['', 'abc', '1.23', '1'.repeat(21)])('perfil PTA rechaza cédula inválida antes de SQL: %s', async cedula => {
    await expect(service.perfilPta(cedula)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([{}, { authorization: 'Bearer jwt' }, { 'x-internal-service-token': '' },
    { 'x-internal-service-token': 'otro' }, { 'x-internal-service-token': ['interno-ficticio'] }])('rechaza credenciales insuficientes %s', headers => {
    const guard = new RundIdentityGuard({ get: () => 'interno-ficticio' } as any);
    expect(() => guard.canActivate(context(headers))).toThrow(UnauthorizedException);
  });

  it('ficha por persona proyecta columnas reales sin exigir usuario/rol ni consultar RUND', async () => {
    const persona = { personaId, num_identificacion: '001.23', nom_tercero: 'DOS NOMBRES' };
    query.mockResolvedValue([persona]);
    await expect(new RundIdentityController(service).fichaPorPersona(personaId)).resolves.toEqual({ consulta: personaId, encontrada: true, persona });
    const [sql, values] = query.mock.calls[0]; expect(values).toEqual([personaId]);
    expect(sql).toContain('p.nom_tercero'); expect(sql).toContain('p.tel_celular'); expect(sql).toContain('p.fec_nacimiento::text');
    expect(sql).not.toMatch(/primer_nombre|segundo_nombre|password|user_roles|auth\."user"|rund\./);
  });

  it('ficha por documento conserva comparación exacta sin trim ni normalización', async () => {
    query.mockResolvedValue([]);
    await expect(service.fichaPorDocumento(' 000.123 ')).resolves.toEqual({ consulta: ' 000.123 ', encontrada: false, persona: null });
    expect(query.mock.calls[0][1]).toEqual([' 000.123 ']);
    expect(query.mock.calls[0][0]).toContain('p.num_identificacion=$1');
    expect(query.mock.calls[0][0]).not.toMatch(/BTRIM|regexp_replace/);
  });

  it('ficha rechaza documento duplicado sin escoger una identidad arbitraria', async () => {
    query.mockResolvedValue([{ personaId }, { personaId: 'otra' }]);
    await expect(service.fichaPorDocumento('123')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['', 'no-uuid', 'x'.repeat(257)])('ficha por persona valida antes de SQL: %s', async id => {
    await expect(service.fichaPorPersona(id)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });

  it('alias conserva todas las personas candidatas sin filtrar roles/cuentas para que RUND elija el período', async () => {
    query.mockResolvedValue([{ personaId }, { personaId: 'otra' }]);
    const clave = " 001.23' ";
    await expect(new RundIdentityController(service).personasPorAlias(clave))
      .resolves.toEqual({ clave, personaIds: [personaId, 'otra'], total: 2 });
    const [sql, values] = query.mock.calls[0]; expect(values).toEqual([clave]);
    expect(sql).toContain('SELECT DISTINCT'); expect(sql).toContain('u.id_user::text=$1');
    expect(sql).not.toContain(clave); expect(sql).not.toMatch(/is_active|user_roles|LIMIT 1|rund\./);
  });

  it('alias confirma ausencia con lista y conteo explícitos', async () => {
    query.mockResolvedValue([]);
    await expect(service.personasPorAlias('ausente')).resolves.toEqual({ clave: 'ausente', personaIds: [], total: 0 });
  });

  it('coincidencias conserva todas las personas con documento normalizado o UUID solicitado sin rol/cuenta', async () => {
    const consulta = { tipo: 'unicidad', documento: ' 001.23 ', personaIds: [personaId] };
    const items = [{ personaId, documento: '00123', nombre: null }, { personaId: 'otra', documento: '001.23', nombre: 'Otra' }];
    query.mockResolvedValue(items);
    await expect(new RundIdentityController(service).coincidencias(consulta)).resolves.toEqual({ consulta, items, total: 2 });
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual([' 001.23 ', [personaId]]);
    expect(sql).toContain('ANY($2::uuid[])'); expect(sql).toContain('regexp_replace');
    expect(sql).not.toMatch(/LIMIT|rund\.|auth\."user"|user_roles|fec_nacimiento|tel_celular|dir_email/);
  });
  it('coincidencias de nombre/fecha conserva igualdad exacta, fecha civil y proyección mínima', async () => {
    const consulta = { tipo: 'nombre-fecha', nombre: 'NOMBRE EXACTO', fechaNacimiento: '1980-01-17' };
    query.mockResolvedValue([]);
    await expect(service.coincidencias(consulta)).resolves.toEqual({ consulta, items: [], total: 0 });
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual(['NOMBRE EXACTO', '1980-01-17']);
    expect(sql).toContain('UPPER(TRIM(p.nom_largo))=$1'); expect(sql).toContain('p.fec_nacimiento::date=$2::date');
    expect(sql).not.toMatch(/ILIKE|similarity|LIMIT|rund\./);
  });
  it.each([null, [], {}, { tipo: 'otro' }, { tipo: 'unicidad', documento: '1' },
    { tipo: 'unicidad', documento: null, personaIds: ['invalido'] },
    { tipo: 'unicidad', documento: null, personaIds: [personaId, personaId] },
    { tipo: 'unicidad', documento: 123, personaIds: [] },
    { tipo: 'nombre-fecha', nombre: 'N', fechaNacimiento: '1980-02-30' },
    { tipo: 'nombre-fecha', nombre: 'N', fechaNacimiento: 'invalida' },
    { tipo: 'nombre-fecha', nombre: 1, fechaNacimiento: '1980-01-17' }])('rechaza coincidencias inválidas antes de SQL %s', async consulta => {
    await expect(service.coincidencias(consulta)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])('sin token configurado falla cerrado, sin recurrir al JWT', token => {
    const guard = new RundIdentityGuard({ get: () => token } as any);
    expect(() => guard.canActivate(context({ authorization: 'Bearer jwt' }))).toThrow(ServiceUnavailableException);
  });
});
