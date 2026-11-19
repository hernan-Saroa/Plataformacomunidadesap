import {
  claveIdempotenciaHistorial,
  esEstadoPtaEnFirme,
  exigirPtaEnFirme,
  normalizarEstadoPta,
  normalizarRegistrosHistorial,
  RUND_HISTORIAL_MAX_REGISTROS,
  validarCedulaHistorial,
  validarPeriodoHistorial,
} from './rund-historial-academico';

const registro = (extra: Record<string, unknown> = {}) => ({
  setup: 'CETAP Villavicencio', territorial: 'Meta', programa: 'Administración Pública',
  asignatura: 'Gestión Pública', asignatura_codigo: 'GP-101', nucleo_tematico: 'Gestión', ...extra,
});

describe('REQ-RUND-F016: reglas puras del historial académico', () => {
  it.each(['En Firme', 'EN_FIRME', ' en  firme ', 'En firme'])('acepta «%s» como En Firme', (estado) => {
    expect(esEstadoPtaEnFirme(estado)).toBe(true);
    expect(() => exigirPtaEnFirme(estado)).not.toThrow();
  });

  it.each(['Borrador', 'BORRADOR', 'APROBADO', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'Firme', 'EN_FIRMEZA'])(
    'rechaza «%s» con 422 RUND_HISTORIAL_PTA_NO_EN_FIRME', (estado) => {
      expect(() => exigirPtaEnFirme(estado)).toThrow(expect.objectContaining({ status: 422, response: expect.objectContaining({ code: 'RUND_HISTORIAL_PTA_NO_EN_FIRME' }) }));
    },
  );

  it.each([undefined, null, '', '   ', 5])('exige estado_pta: %p → 400', (estado) => {
    expect(() => exigirPtaEnFirme(estado)).toThrow(expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'RUND_HISTORIAL_ESTADO_REQUERIDO' }) }));
  });

  it('normaliza el estado sin tildes ni espacios', () => {
    expect(normalizarEstadoPta('  En   Firme ')).toBe('EN_FIRME');
    expect(normalizarEstadoPta(null)).toBe('');
  });

  it('valida cédula y periodo (ceros iniciales conservados)', () => {
    expect(validarCedulaHistorial('001020304050')).toBe('001020304050');
    for (const mala of ['', '12.345', '12 3', 'abc', '1'.repeat(21), undefined, 123]) {
      expect(() => validarCedulaHistorial(mala)).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'RUND_CEDULA_INVALIDA' }) }));
    }
    expect(validarPeriodoHistorial('2026-2')).toBe('2026-2');
    for (const malo of ['2026-3', '2026', '26-1', '', undefined, 2026]) {
      expect(() => validarPeriodoHistorial(malo)).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'RUND_PERIODO_INVALIDO' }) }));
    }
  });

  it('la clave de idempotencia ignora tildes, mayúsculas y espacios, y distingue periodo, sede, programa y asignatura', () => {
    const base = { setup: 'CETAP Bogotá', programa: 'Administración Pública', asignaturaCodigo: null, asignatura: 'Gestión Pública' };
    const k = claveIdempotenciaHistorial('100', '2026-2', base);
    expect(claveIdempotenciaHistorial('100', '2026-2', { ...base, setup: ' cetap  BOGOTA ', asignatura: 'GESTION PUBLICA' })).toBe(k);
    expect(claveIdempotenciaHistorial('100', '2026-1', base)).not.toBe(k);
    expect(claveIdempotenciaHistorial('101', '2026-2', base)).not.toBe(k);
    expect(claveIdempotenciaHistorial('100', '2026-2', { ...base, setup: 'CETAP Tunja' })).not.toBe(k);
    expect(claveIdempotenciaHistorial('100', '2026-2', { ...base, programa: 'Otro' })).not.toBe(k);
    expect(claveIdempotenciaHistorial('100', '2026-2', { ...base, asignatura: 'Otra' })).not.toBe(k);
    expect(claveIdempotenciaHistorial('100', '2026-2', { ...base, asignaturaCodigo: 'GP-1' })).not.toBe(k);
  });

  it('normaliza registros y consolida repetidos del mismo envío', () => {
    const r = normalizarRegistrosHistorial('100', '2026-2', [registro(), registro({ nucleo_tematico: 'Otro núcleo', setup: ' CETAP  villavicencio ' }), registro({ asignatura: 'Ética', asignatura_codigo: 'ET-1' })]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.asignaturaCodigo === 'GP-101')).toMatchObject({ programa: 'Administración Pública', nucleoTematico: 'Otro núcleo', setup: 'CETAP villavicencio' });
  });

  it('el orden de salida no depende del orden de entrada (evita interbloqueos entre envíos concurrentes)', () => {
    const a = registro({ asignatura: 'A', asignatura_codigo: 'A1' });
    const b = registro({ asignatura: 'B', asignatura_codigo: 'B1' });
    const c = registro({ asignatura: 'C', asignatura_codigo: 'C1' });
    const claves = (xs: unknown[]) => normalizarRegistrosHistorial('100', '2026-2', xs).map((x) => x.clave);
    expect(claves([a, b, c])).toEqual(claves([c, a, b]));
    expect(claves([a, b, c])).toEqual([...claves([a, b, c])].sort());
  });

  it('rechaza el carácter NUL (PostgreSQL no lo admite) en cualquier campo de texto', () => {
    for (const campo of ['setup', 'territorial', 'programa', 'asignatura', 'asignatura_codigo', 'nucleo_tematico']) {
      expect(() => normalizarRegistrosHistorial('100', '2026-2', [registro({ [campo]: 'mal\u0000dato' })])).toThrow(
        expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'RUND_HISTORIAL_REGISTRO_INVALIDO' }) }),
      );
    }
  });

  it('campos opcionales vacíos quedan en null y los obligatorios se exigen', () => {
    const [r] = normalizarRegistrosHistorial('100', '2026-2', [{ programa: 'P', asignatura: 'A', setup: '  ', territorial: null }]);
    expect(r).toMatchObject({ setup: null, territorial: null, asignaturaCodigo: null, nucleoTematico: null });
    for (const mal of [{ asignatura: 'A' }, { programa: 'P' }, { programa: ' ', asignatura: 'A' }, { programa: 'P', asignatura: 5 }, { programa: 'P', asignatura: 'A', setup: 7 }, { programa: 'P', asignatura: 'x'.repeat(301) }, 'texto', null, []]) {
      expect(() => normalizarRegistrosHistorial('100', '2026-2', [mal])).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'RUND_HISTORIAL_REGISTRO_INVALIDO' }) }));
    }
  });

  it('rechaza registros ausentes, vacíos o en exceso', () => {
    for (const mal of [undefined, [], 'x', {}]) {
      expect(() => normalizarRegistrosHistorial('100', '2026-2', mal)).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'RUND_HISTORIAL_REGISTROS_REQUERIDOS' }) }));
    }
    const muchos = Array.from({ length: RUND_HISTORIAL_MAX_REGISTROS + 1 }, (_, i) => registro({ asignatura: `A${i}`, asignatura_codigo: `C${i}` }));
    expect(() => normalizarRegistrosHistorial('100', '2026-2', muchos)).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'RUND_HISTORIAL_REGISTROS_EXCEDIDOS' }) }));
    expect(normalizarRegistrosHistorial('100', '2026-2', muchos.slice(0, RUND_HISTORIAL_MAX_REGISTROS))).toHaveLength(RUND_HISTORIAL_MAX_REGISTROS);
  });
});
