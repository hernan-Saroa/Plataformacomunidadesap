import { identityWriteCommandFor, identityWritePlan, identityWriteViaAuthEnabled, normalizeIdentityWriteInput } from './rund-identity-writer';

const audit = { actorId: 'actor-1', canalOrigen: 'MASIVO', metadata: { fuente: 'FICTICIA' } };
const payload = { documentNumber: '1020304050', documentType: 'CC', primer_nombre: 'PERSONA', primer_apellido: 'FICTICIA', segundo_apellido: null,
  genero: 'Femenino', fechaNacimiento: new Date('1980-01-17T00:00:00Z'), periodoCarga: '2026-2', correoInstitucional: 'prueba@esap.edu.co' };
const input = (extra: Record<string, unknown> = {}) => ({ payload, rawPayload: { DOCUMENTO_IDENTIDAD: '1020304050', canal_origen: 'MASIVO', cargadoPor: 'actor-1' },
  options: { bulkImport: true, preserveTerritorial: true, audit, ...(extra.options as object) }, emailFinal: 'prueba@esap.edu.co', phoneFinal: null,
  finalFullName: 'PERSONA FICTICIA', ...(extra.top as object) }) as any;

describe('Plan de escritura de identidad por Auth', () => {
  afterEach(() => { delete process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API; });

  it('solo se activa con RUND_IDENTITY_WRITE_VIA_AUTH_API=true', () => {
    expect(identityWriteViaAuthEnabled()).toBe(false);
    for (const value of ['false', '1', 'TRUE', '']) { process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = value; expect(identityWriteViaAuthEnabled()).toBe(false); }
    process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true'; expect(identityWriteViaAuthEnabled()).toBe(true);
  });

  it('construye el comando que Auth necesita: fecha civil UTC, nombres nulos explícitos y opciones booleanas', () => {
    const command = identityWriteCommandFor(input());
    expect(command).toEqual({ version: 1, actorId: 'actor-1', payload: { documentNumber: '1020304050', documentType: 'CC', primer_nombre: 'PERSONA',
      primer_apellido: 'FICTICIA', segundo_apellido: null, genero: 'Femenino', fechaNacimiento: '1980-01-17' },
    options: { relaxValidation: false, preserveTerritorial: true }, territorial: null, emailFinal: 'prueba@esap.edu.co', phoneFinal: null, finalFullName: 'PERSONA FICTICIA' });
  });

  it('una fecha de nacimiento nula, el territorial numérico y el teléfono se transportan sin perder datos', () => {
    const plan = identityWritePlan(input({ top: { payload: { ...payload, fechaNacimiento: null }, territorial: { id: 31, nombre: 'Norte', codigo: '001' }, phoneFinal: '3001234567' } }));
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.command.payload.fechaNacimiento).toBeNull(); expect(plan.command.phoneFinal).toBe('3001234567');
      expect(plan.command.territorial).toEqual({ id: '31' }); expect(plan.input.territorial).toEqual({ id: '31', nombre: 'Norte', codigo: '001' });
    }
  });

  it('un identificador territorial de ocho bytes se conserva como texto sin perder precisión', () => {
    const plan = identityWritePlan(input({ top: { territorial: { id: '9007199254740993', nombre: 'Norte' } } }));
    expect(plan.ok).toBe(true); if (plan.ok) expect(plan.command.territorial).toEqual({ id: '9007199254740993' });
  });

  it('descarta las opciones internas del llamador (territoriales, outerManager, previewOnly) y conserva solo las del contexto', () => {
    const normalized = normalizeIdentityWriteInput(input({ options: { territoriales: [{ id: 1 }], outerManager: {}, previewOnly: false, rejectExisting: true, relaxValidation: false } }));
    expect(Object.keys(normalized.options).sort()).toEqual(['audit', 'bulkImport', 'preserveTerritorial', 'rejectExisting', 'relaxValidation']);
    expect(identityWritePlan(input({ options: { territoriales: [{ id: 1 }], outerManager: {} } })).ok).toBe(true);
  });

  it('autogestión conserva el alta parcial sin período y puede reanudarla sin recurrir al escritor SQL', () => {
    const plan = identityWritePlan(input({ top: { payload: { ...payload, periodoCarga: null },
      rawPayload: { canal_origen: 'AUTOGESTION', cargadoPor: 'AUTOGESTION:sesion' } },
      options: { relaxValidation: true, audit: { actorId: 'AUTOGESTION:sesion', canalOrigen: 'AUTOGESTION' } } }));
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.input.payload.periodoCarga).toBeNull();
  });

  it.each([
    ['sin auditoría', { options: { audit: undefined } }],
    ['actor distinto en la auditoría', { top: { rawPayload: { cargadoPor: 'otro' } } }],
    ['canal distinto en el cuerpo', { top: { rawPayload: { canal_origen: 'MODAL' } } }],
    ['canal de auditoría no admitido', { options: { audit: { ...audit, canalOrigen: 'OTRO' } } }],
    ['sin período de carga', { top: { payload: { ...payload, periodoCarga: '' } } }],
    ['soporte requerido incompleto', { options: { audit: { ...audit, requiredSupport: { type: 'soporte_edicion_perfil' } } } }],
    ['correo inválido', { top: { emailFinal: 'no-es-correo' } }],
  ])('rechaza un contexto incompatible antes de escribir: %s', (_name, extra) => {
    const plan = identityWritePlan(input(extra as any));
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect((plan as { reason: string }).reason.length).toBeGreaterThan(0);
  });
});
