import { normalizeBancoDocentePayload } from './banco-docentes.service';
import { claseDesdeHoras, normalizarClaseDocente, resolverClaseDocente } from './rund-clase-docente';
import { buildRundPerfilCabezote } from './rund-perfil-cabezote';

const FILA_BASE = {
  documentNumber: '1020304050', documentType: 'CC', nombreCompleto: 'DOCENTE DE PRUEBA',
  correoInstitucional: 'docente.prueba@esap.edu.co', tipoVinculacion: 'OCASIONAL', dedicacion: 'TC',
  territorialNombre: 'Sede Central', periodoCarga: '2026-2',
};

describe('claseDesdeHoras: horas PTA mayores que 0 = Planta; 0 o sin horas = Cátedra', () => {
  it.each([
    [800, 'PLANTA'], [720, 'PLANTA'], [400, 'PLANTA'], [1, 'PLANTA'], ['800', 'PLANTA'], ['720,5', 'PLANTA'],
    [0, 'CATEDRA'], ['0', 'CATEDRA'], [-5, 'CATEDRA'], ['', 'CATEDRA'], [null, 'CATEDRA'], [undefined, 'CATEDRA'], ['abc', 'CATEDRA'],
  ])('horas %p → %s', (horas, esperado) => {
    expect(claseDesdeHoras(horas)).toBe(esperado);
  });
});

describe('resolverClaseDocente / normalizarClaseDocente', () => {
  it('usa la clase guardada y solo admite Planta o Cátedra (con o sin tilde y mayúsculas)', () => {
    expect(resolverClaseDocente('PLANTA', 0)).toBe('PLANTA');
    expect(resolverClaseDocente('catedra', 800)).toBe('CATEDRA');
    expect(resolverClaseDocente('Cátedra', 800)).toBe('CATEDRA');
    expect(normalizarClaseDocente('Ocasional')).toBeNull();
    expect(normalizarClaseDocente('HC')).toBeNull();
  });

  it('en registros anteriores (sin clase guardada) la deduce de sus horas PTA', () => {
    expect(resolverClaseDocente(null, 800)).toBe('PLANTA');
    expect(resolverClaseDocente(undefined, 0)).toBe('CATEDRA');
  });

  it('sin clase y sin horas no inventa nada', () => {
    expect(resolverClaseDocente(null, null)).toBeNull();
    expect(resolverClaseDocente(undefined, undefined)).toBeNull();
    expect(resolverClaseDocente('', '')).toBeNull();
  });
});

describe('carga masiva: la clase sale de las horas PTA que trae la fila, sin importar vinculación ni dedicación', () => {
  const clase = (extra: Record<string, unknown>) => normalizeBancoDocentePayload({ ...FILA_BASE, ...extra }).claseDocente;

  it('HORAS_PTA mayor que 0 → Planta (800, 720 y cualquier otro número positivo)', () => {
    expect(clase({ HORAS_PTA: 800 })).toBe('PLANTA');
    expect(clase({ HORAS_PTA: 720, tipoVinculacion: 'CARRERA1' })).toBe('PLANTA');
    expect(clase({ HORAS_PTA: '400', dedicacion: 'MT' })).toBe('PLANTA');
  });

  it('un Ocasional de tiempo completo con 800 horas es de planta, independiente de su vinculación', () => {
    expect(clase({ HORAS_PTA: 800, tipoVinculacion: 'OCASIONAL', dedicacion: 'TC' })).toBe('PLANTA');
  });

  it('HORAS_PTA en 0 → Cátedra', () => {
    expect(clase({ HORAS_PTA: 0 })).toBe('CATEDRA');
    expect(clase({ HORAS_PTA: '0', tipoVinculacion: 'CARRERA2' })).toBe('CATEDRA');
  });

  it('sin la columna HORAS_PTA (o vacía) → Cátedra, aunque el sistema complete las horas por defecto', () => {
    const payload = normalizeBancoDocentePayload({ ...FILA_BASE });
    expect(payload.claseDocente).toBe('CATEDRA');
    // Las horas por defecto no cambian: el comportamiento de PTA con la fórmula anterior se conserva.
    expect(payload.horasAsignables).toBe(800);
    expect(clase({ HORAS_PTA: '' })).toBe('CATEDRA');
  });

  it('reconoce los encabezados alternos de la columna de horas', () => {
    expect(clase({ 'Horas PTA': 800 })).toBe('PLANTA');
    expect(clase({ horasPta: 720 })).toBe('PLANTA');
    expect(clase({ 'Horas Programables (PTA)': 0 })).toBe('CATEDRA');
  });

  it('al editar horas a 0 el docente se reclasifica a cátedra; con horas vuelve a planta', () => {
    expect(clase({ horasPta: 800 })).toBe('PLANTA');
    expect(clase({ horasPta: 0 })).toBe('CATEDRA');
    expect(clase({ horasPta: 720 })).toBe('PLANTA');
  });
});

describe('cabezote del perfil expone la clase', () => {
  it('toma la clase guardada o la deduce de las horas', () => {
    expect(buildRundPerfilCabezote({ clase_docente: 'PLANTA' }).clase_docente).toBe('PLANTA');
    expect(buildRundPerfilCabezote({ clase_docente: null, horas_programables: 0 }).clase_docente).toBe('CATEDRA');
    expect(buildRundPerfilCabezote({ claseDocente: 'CATEDRA', horasAsignables: 800 }).clase_docente).toBe('CATEDRA');
  });

  it('sin información devuelve null y no cambia los siete campos del contrato', () => {
    const cabezote = buildRundPerfilCabezote({});
    expect(cabezote.clase_docente).toBeNull();
    expect(cabezote.campos).toEqual(['NOMBRE_COMPLETO', 'TIPO_VINCULACION', 'CATEGORIA_ESCALAFON', 'TERRITORIAL', 'ESTADO_VINCULACION', 'PUNTAJE_SALARIAL', 'ULTIMA_EVALUACION']);
  });
});
