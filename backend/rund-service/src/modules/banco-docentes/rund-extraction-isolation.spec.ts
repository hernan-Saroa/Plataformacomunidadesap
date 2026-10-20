import { BadRequestException, ConflictException } from '@nestjs/common';
import { lockRundExtractionSuggestions } from './rund-extraccion-fields';
import { RundExtraccionService } from './rund-extraccion.service';
import { identityWritePlan } from './rund-identity-writer';
import { nativeBusinessContext, restoreNativeBusinessContext } from './rund-native-business-context';
import { BancoDocentesService } from './banco-docentes.service';

const id = '11111111-1111-4111-8111-111111111111';
const personaId = '22222222-2222-4222-8222-222222222222';
const identity = { personaId, num_identificacion: '12345678', tip_identificacion: 'CC', nom_largo: 'ANA PRUEBA', gen_tercero: 'F', fec_nacimiento: '1980-01-01' };
const suggestion = { id, campo: 'pregrado', valor: 'Administración Pública', valor_previo: 'Derecho', estado: 'PENDIENTE', documento_estado: 'ACTIVO', trabajo_estado: 'COMPLETADO' };
function manager(row: any = suggestion, profile: any = { id: 'perfil-legacy', personaId, pregrado: 'Derecho' }) {
  return { query: jest.fn(async (sql: string) => {
    if (/auth\./i.test(sql)) throw new Error('SQL sobre Auth prohibido');
    if (sql.includes('SELECT d.*')) return profile ? [profile] : [];
    if (sql.includes('SELECT s.*') || sql.includes('SELECT s.id,s.campo')) return row ? [row] : [];
    return [];
  }) };
}

describe('Sugerencias con frontera SQL RUND', () => {
  it('confirma pregrado y su auditoría sin consultar Auth, con ambas posiciones de la bandera OCR', async () => {
    for (const enabled of [false, true]) {
      const db = manager();
      const service = new RundExtraccionService({ query: async () => [{ campo: 'pregrado' }], transaction: async (cb: any) => cb(db) } as any,
        {} as any, {} as any, { enabled, handles: () => false } as any);
      await expect(service.confirm('perfil-legacy', id, { actorId: 'GGP', roles: ['GESTION_PROFESORAL'], fullAccess: true }))
        .resolves.toMatchObject({ confirmed: true, changed: true });
      expect(db.query.mock.calls.some(([sql]) => sql.includes('SET pregrado=$2'))).toBe(true);
      expect(db.query.mock.calls.some(([sql]) => sql.includes('RundAprobacionLog'))).toBe(true);
      expect(db.query.mock.calls.some(([sql]) => /auth\./i.test(sql))).toBe(false);
    }
  });
  it.each([{ estado: 'APROBADA' }, { documento_estado: 'REEMPLAZADO' }, { trabajo_estado: 'PROCESANDO' }])('rechaza una revisión obsoleta %p', async change => {
    await expect(lockRundExtractionSuggestions(manager({ ...suggestion, ...change }), 'perfil-legacy', [id], { pregrado: suggestion.valor }))
      .rejects.toBeInstanceOf(ConflictException);
  });
  it('rechaza cambios concurrentes del dato nativo antes de confirmar', async () => {
    await expect(lockRundExtractionSuggestions(manager(suggestion, { personaId, pregrado: 'Otro título' }), 'perfil-legacy', [id], { pregrado: suggestion.valor }))
      .rejects.toBeInstanceOf(ConflictException);
  });
  it('una identidad distinta no autoriza el perfil y una revisión de identidad exige precondición Auth', async () => {
    await expect(lockRundExtractionSuggestions(manager(), 'perfil-legacy', [id], { pregrado: suggestion.valor }, { ...identity, personaId: id }))
      .rejects.toBeInstanceOf(ConflictException);
    const row = { ...suggestion, campo: 'nombreCompleto', valor_previo: identity.nom_largo };
    await expect(lockRundExtractionSuggestions(manager(row), 'perfil-legacy', [id], { nombreCompleto: 'ANA NUEVA' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(lockRundExtractionSuggestions(manager(row), 'perfil-legacy', [id], { nombreCompleto: 'ANA NUEVA' }, identity)).resolves.toHaveLength(1);
  });
  it('si el campo cambia entre la consulta y la confirmación, la frontera activa rechaza sin tocar Auth', async () => {
    const db = manager({ ...suggestion, campo: 'nombreCompleto' });
    const service = new RundExtraccionService({ query: async () => [{ campo: 'pregrado' }], transaction: async (cb: any) => cb(db) } as any,
      {} as any, {} as any, { enabled: true, handles: () => false } as any);
    await expect(service.confirm('perfil-legacy', id, { actorId: 'GGP', roles: ['GESTION_PROFESORAL'], fullAccess: true })).rejects.toBeInstanceOf(ConflictException);
    expect(db.query.mock.calls.some(([sql]) => /auth\./i.test(sql))).toBe(false);
  });
  it('un nombre heredado del prototipo no se interpreta como un campo OCR', async () => {
    const db = manager({ ...suggestion, campo: 'constructor' });
    const service = new RundExtraccionService({ transaction: async (cb: any) => cb(db) } as any, {} as any, {} as any);
    await expect(service.confirm('perfil-legacy', id, { actorId: 'GGP', roles: ['GESTION_PROFESORAL'], fullAccess: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe('Revisión congelada de edición con sugerencias', () => {
  const input = () => ({ payload: { documentNumber: identity.num_identificacion, documentType: 'CC', fullName: 'ANA NUEVA', periodoCarga: '2026-2', genero: 'F', fechaNacimiento: new Date('1980-01-01T00:00:00Z') },
    rawPayload: { canal_origen: 'MODAL' }, emailFinal: 'ana@example.test', phoneFinal: null, finalFullName: 'ANA NUEVA',
    options: { preserveTerritorial: true, audit: { actorId: 'GGP', canalOrigen: 'MODAL', observacion: 'Revisado con original',
      requiredSupport: { id: 'soporte', type: 'soporte_edicion_perfil', docenteId: 'perfil-legacy' }, sensitiveAccess: { fullAccess: true } },
    extractionReview: { docenteId: 'perfil-legacy', ids: [id], values: { nombreCompleto: 'Ana nueva' }, identity: { ...identity } } } }) as any;
  it('conserva valor previo y confirmado al serializar y reanudar; Auth recibe la misma identidad esperada', () => {
    const original = input(), plan = identityWritePlan(original); expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const stored = nativeBusinessContext(plan.command, plan.input);
    original.options.extractionReview.identity.nom_largo = 'CAMBIADO';
    expect(stored.comandoAuth.identidadEsperada.nom_largo).toBe('ANA PRUEBA');
    const restored = restoreNativeBusinessContext(JSON.parse(JSON.stringify(stored)));
    expect(restored.escritura.options.extractionReview.identity).toEqual(restored.comandoAuth.identidadEsperada);
  });
  it.each(['fechaNacimiento','fechaInicioVinculacion','fechaFinVinculacion'])('una sugerencia de %s se restaura con la misma fecha civil y huella', field => {
    const value = input(), date = '1980-01-01';
    value.payload[field] = new Date(date + 'T00:00:00Z');
    value.options.extractionReview.values = { [field]: date };
    const plan = identityWritePlan(value); expect(plan.ok).toBe(true); if (!plan.ok) return;
    const context = nativeBusinessContext(plan.command, plan.input);
    expect(() => restoreNativeBusinessContext(JSON.parse(JSON.stringify(context)))).not.toThrow();
  });
  it('updateDocente prepara la revisión con lecturas propias y llama al escritor sin transacción externa', async () => {
    const previous = process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API;
    process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true';
    try {
      const service = Object.create(BancoDocentesService.prototype);
      const db = manager({ ...suggestion, campo: 'nombreCompleto', valor_previo: identity.nom_largo });
      service.resolveDocenteId = jest.fn().mockResolvedValue('perfil-legacy');
      service.docenteRepo = { findOne: jest.fn().mockResolvedValue({ id: 'perfil-legacy', personaId, periodoCarga: '2026-2', estado: 'ACTIVO' }) };
      service.identities = { fichaPorPersona: jest.fn().mockResolvedValue(identity) };
      service.getTerritoriales = jest.fn().mockResolvedValue([]);
      service.dataSource = { query: jest.fn().mockResolvedValue([{ id: 'soporte' }]), transaction: jest.fn((cb: any) => cb(db)) };
      service.upsertDocente = jest.fn().mockResolvedValue({ docenteId: 'perfil-legacy' });
      await expect(service.updateDocente('perfil-legacy', { nombreCompleto: 'ANA NUEVA', soporteEdicionId: 'soporte',
        justificacionEdicion: 'Revisado con original', actorId: 'GGP', rundSuggestionIds: [id], rundSensitiveAccess: { fullAccess: true } }))
        .resolves.toEqual({ docenteId: 'perfil-legacy' });
      const [, options] = service.upsertDocente.mock.calls[0];
      expect(options.outerManager).toBeUndefined();
      expect(options.extractionReview).toMatchObject({ docenteId: 'perfil-legacy', identity, values: { nombreCompleto: 'ANA NUEVA' } });
      expect(db.query.mock.calls.some(([sql]) => /UPDATE|auth\./i.test(sql.replace(/FOR UPDATE/g, '')))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API; else process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = previous;
    }
  });
  it.each(['valor', 'persona', 'soporte', 'acceso', 'campo', 'seleccion'])('no publica un contexto de revisión inconsistente: %s', kind => {
    const value = input();
    if (kind === 'valor') value.finalFullName = 'OTRO NOMBRE';
    if (kind === 'persona') value.options.extractionReview.identity.personaId = 'no-uuid';
    if (kind === 'soporte') value.options.audit.requiredSupport.docenteId = 'otro-perfil';
    if (kind === 'acceso') value.options.audit.sensitiveAccess.fullAccess = false;
    if (kind === 'campo') value.options.extractionReview.values = { estado: 'ACTIVO' };
    if (kind === 'seleccion') value.options.extractionReview.ids = [id, id];
    expect(identityWritePlan(value).ok).toBe(false);
  });
});
