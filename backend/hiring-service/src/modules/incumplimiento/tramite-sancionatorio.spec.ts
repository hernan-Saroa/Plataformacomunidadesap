import {
  estadoTrasDecidir,
  porQueNoSePuedeAbrir,
  porQueNoSePuedeCaducar,
  porQueNoSePuedeCerrarAudiencia,
  porQueNoSePuedeDecidir,
  porQueNoSePuedeInstruir,
  terminaElContrato,
} from './tramite-sancionatorio';

/**
 * Criterios de EFDS-1181 (RF-INC-02):
 *
 * 1. «Dado un caso de presunto incumplimiento reportado, cuando el área
 *    jurídica tramita el proceso, entonces el sistema gestiona resoluciones y
 *    audiencias sancionatorias y su resultado.»
 * 2. «Dado un caso que deriva en caducidad, cuando se resuelve, entonces el
 *    sistema registra la caducidad como causal contractual.»
 *
 * Estas reglas son las que deciden si una entidad puede sancionar a un
 * contratista, y equivocarlas no falla ruidosamente: deja pasar una decisión
 * tomada sin haber oído a nadie. Por eso se prueban una por una.
 */
describe('apertura del trámite', () => {
  it('el caso reportado admite que se le abra trámite', () => {
    expect(porQueNoSePuedeAbrir('REPORTADO')).toBeNull();
  });

  it('uno ya en trámite no se abre otra vez', () => {
    // La resolución de apertura es única por caso mientras no se revoque, y la
    // migración lo impide con un índice parcial.
    expect(porQueNoSePuedeAbrir('EN_TRAMITE')).toMatch(/ya está abierto/);
  });

  it('uno resuelto tampoco: primero hay que revocar la decisión', () => {
    expect(porQueNoSePuedeAbrir('DECIDIDO')).toMatch(/revocar/);
    expect(porQueNoSePuedeAbrir('ARCHIVADO')).toMatch(/revocar/);
  });
});

describe('instrucción del trámite', () => {
  it('se cita y se celebra sobre el caso en trámite', () => {
    expect(porQueNoSePuedeInstruir('EN_TRAMITE')).toBeNull();
  });

  it('sobre el apenas reportado no: falta la resolución de apertura', () => {
    // Citar aquí convocaría al contratista a defenderse de un procedimiento
    // que nadie ha iniciado formalmente.
    expect(porQueNoSePuedeInstruir('REPORTADO')).toMatch(/apertura/);
  });

  it('sobre el ya resuelto tampoco', () => {
    expect(porQueNoSePuedeInstruir('DECIDIDO')).toMatch(/revocar/);
  });
});

describe('decisión del caso', () => {
  it('declarar el incumplimiento exige haber oído al contratista', () => {
    expect(porQueNoSePuedeDecidir('EN_TRAMITE', 'DECLARA_INCUMPLIMIENTO', 0)).toMatch(
      /audiencia/,
    );
    expect(porQueNoSePuedeDecidir('EN_TRAMITE', 'DECLARA_INCUMPLIMIENTO', 1)).toBeNull();
  });

  it('la caducidad, lo mismo: es la sanción más grave', () => {
    expect(porQueNoSePuedeDecidir('EN_TRAMITE', 'DECLARA_CADUCIDAD', 0)).toMatch(/audiencia/);
    expect(porQueNoSePuedeDecidir('EN_TRAMITE', 'DECLARA_CADUCIDAD', 2)).toBeNull();
  });

  it('archivar sí se puede sin audiencia', () => {
    // Si la entidad concluye que no hay nada que reprochar, obligarla a
    // celebrar una audiencia para poder cerrarlo dejaría al contratista citado
    // a defenderse de un caso que ya se iba a archivar.
    expect(porQueNoSePuedeDecidir('EN_TRAMITE', 'ARCHIVA', 0)).toBeNull();
  });

  it('nada se decide sin trámite abierto, ni siquiera archivar', () => {
    expect(porQueNoSePuedeDecidir('REPORTADO', 'ARCHIVA', 0)).toMatch(/apertura/);
    expect(porQueNoSePuedeDecidir('DECIDIDO', 'DECLARA_CADUCIDAD', 3)).toMatch(/revocar/);
  });

  it('archivar y sancionar dejan el caso en puntos distintos', () => {
    // Un caso archivado no es lo mismo que uno decidido: el expediente tiene
    // que poder distinguir el incumplimiento que se declaró del que se examinó
    // y no prosperó.
    expect(estadoTrasDecidir('ARCHIVA')).toBe('ARCHIVADO');
    expect(estadoTrasDecidir('DECLARA_INCUMPLIMIENTO')).toBe('DECIDIDO');
    expect(estadoTrasDecidir('DECLARA_CADUCIDAD')).toBe('DECIDIDO');
  });
});

/**
 * Segundo criterio: la caducidad es la causal contractual del bloque, y es lo
 * único del trámite que toca el contrato.
 */
describe('la caducidad como causal contractual', () => {
  it('solo la caducidad termina el contrato', () => {
    expect(terminaElContrato('DECLARA_CADUCIDAD')).toBe(true);
    // Declarar el incumplimiento puede imponer multa o cláusula penal y el
    // contrato sigue corriendo: confundirlas terminaría contratos que la
    // entidad quiere que se sigan ejecutando.
    expect(terminaElContrato('DECLARA_INCUMPLIMIENTO')).toBe(false);
    expect(terminaElContrato('ARCHIVA')).toBe(false);
  });

  it('se caduca lo que está en ejecución', () => {
    expect(porQueNoSePuedeCaducar('EJECUCION')).toBeNull();
  });

  it('un contrato suspendido también', () => {
    // Sigue vivo, y obligar a reanudarlo para poder caducarlo dejaría en el
    // expediente una ejecución que nunca se retomó. Mismo criterio que la
    // terminación anticipada (EFDS-1178).
    expect(porQueNoSePuedeCaducar('SUSPENDIDO')).toBeNull();
  });

  it('uno terminado o liquidado no: no hay ejecución que interrumpir', () => {
    expect(porQueNoSePuedeCaducar('TERMINADO')).toMatch(/terminado/);
    expect(porQueNoSePuedeCaducar('LIQUIDADO')).toMatch(/liquidado/);
    expect(porQueNoSePuedeCaducar('CERRADO')).toMatch(/liquidado/);
  });

  it('uno que no ha arrancado tampoco', () => {
    expect(porQueNoSePuedeCaducar('LEGALIZADO')).toMatch(/acta de inicio/);
    expect(porQueNoSePuedeCaducar('PERFECCIONADO')).toMatch(/acta de inicio/);
  });
});

describe('cierre de la audiencia', () => {
  it('la citada admite que se registre qué pasó', () => {
    expect(porQueNoSePuedeCerrarAudiencia('CITADA')).toBeNull();
  });

  it('la que ya se cerró no se vuelve a cerrar', () => {
    expect(porQueNoSePuedeCerrarAudiencia('CELEBRADA')).toMatch(/celebrada/);
    expect(porQueNoSePuedeCerrarAudiencia('SUSPENDIDA')).toMatch(/suspendida/);
    expect(porQueNoSePuedeCerrarAudiencia('CANCELADA')).toMatch(/cancelada/);
  });
});
