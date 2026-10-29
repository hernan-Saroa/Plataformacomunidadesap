import {
  actividadCumplida,
  AdjudicacionVigente,
  contradiceElActo,
  estaSuscrito,
  evaluarAdjudicacion,
  puedeFirmarse,
  puedeResponder,
} from './contratos.service';
import { EstadoContrato } from '../../entities/contrato.entity';

/**
 * Criterio 1 de EFDS-1161: el contrato se genera sobre un proceso adjudicado.
 *
 * Lo dice el acto de adjudicación vigente de la 7.3, con convocatoria o sin
 * ella. Antes se miraba la recepción de ofertas, y la contratación directa, que
 * no recibe ofertas, no llegaba nunca al contrato.
 */
const ACTO: AdjudicacionVigente = {
  fuente: 'el acto RES-001',
  valor: 37_248_000,
  contratista: { nombre: 'Ana Pérez', documento: '1.020.304.050', tipo: 'NATURAL' },
};

describe('evaluarAdjudicacion', () => {
  it('da por adjudicado el proceso con acto vigente', () => {
    expect(evaluarAdjudicacion(ACTO)).toEqual({ adjudicado: true, motivo: null });
  });

  it('sin acto no deja contratar, y dice qué falta', () => {
    const resultado = evaluarAdjudicacion(null);

    expect(resultado.adjudicado).toBe(false);
    expect(resultado.motivo).toMatch(/falta el acto de adjudicación vigente \(7\.3\)/);
  });
});

describe('contradiceElActo', () => {
  it('acepta el contrato por lo adjudicado y con el mismo contratista', () => {
    // Los puntos y guiones del documento no lo hacen otro.
    expect(
      contradiceElActo({ valor: 37_248_000, contratistaDocumento: '1020304050' }, ACTO),
    ).toBeNull();
  });

  it('acepta un contrato por menos de lo adjudicado', () => {
    expect(
      contradiceElActo({ valor: 30_000_000, contratistaDocumento: '1020304050' }, ACTO),
    ).toBeNull();
  });

  it('rechaza el contrato por más de lo adjudicado', () => {
    expect(
      contradiceElActo({ valor: 123_213_213, contratistaDocumento: '1020304050' }, ACTO),
    ).toMatch(/supera el adjudicado/);
  });

  it('rechaza el contrato con otro contratista', () => {
    expect(contradiceElActo({ valor: 37_248_000, contratistaDocumento: '3213' }, ACTO)).toMatch(
      /no es a quien se adjudicó/,
    );
  });
});

/**
 * Criterio 2: el sistema registra la aceptación del proponente.
 *
 * Registrarla significa que queda en firme. Si una respuesta ya dada pudiera
 * cambiarse después, el expediente no probaría qué contestó el proponente, que
 * es justo para lo que sirve.
 */
describe('puedeResponder', () => {
  it('un contrato recién generado admite las dos respuestas', () => {
    expect(puedeResponder('GENERADO', 'ACEPTAR')).toBe(true);
    expect(puedeResponder('GENERADO', 'RECHAZAR')).toBe(true);
  });

  it('un contrato aceptado no se rechaza después', () => {
    // El salto que más tienta: se registró la aceptación por error y se quiere
    // deshacer. Deshacerla borraría el hecho de que el proponente aceptó.
    expect(puedeResponder('ACEPTADO', 'RECHAZAR')).toBe(false);
  });

  it('no se acepta dos veces', () => {
    expect(puedeResponder('ACEPTADO', 'ACEPTAR')).toBe(false);
  });

  it('un contrato rechazado no revive', () => {
    // Si el proponente no aceptó, la entidad genera otra minuta; no reabre la
    // que él rechazó.
    for (const respuesta of ['ACEPTAR', 'RECHAZAR'] as const) {
      expect(puedeResponder('RECHAZADO', respuesta)).toBe(false);
    }
  });
});

/**
 * La actividad 8.1 se cumple con el contrato suscrito, no con la generación ni
 * con la aceptación.
 *
 * Las firmas del ordenador y del contratista se registran en la misma
 * actividad: darla por cumplida antes haría que el riel mostrara como terminado
 * algo que todavía hay que diligenciar.
 */
describe('actividadCumplida', () => {
  it('aceptar no la cierra: faltan las firmas de las dos partes', () => {
    // Cerrarla aquí ponía la 8.1 en verde y mandaba a la 8.2 con el contrato
    // todavía sin suscribir.
    expect(actividadCumplida('ACEPTADO')).toBe(false);
  });

  it('la cierra el contrato suscrito por las dos partes', () => {
    expect(actividadCumplida('PERFECCIONADO')).toBe(true);
  });

  it('generar la minuta deja la actividad en curso', () => {
    expect(actividadCumplida('GENERADO')).toBe(false);
  });

  it('un rechazo tampoco la cierra', () => {
    expect(actividadCumplida('RECHAZADO')).toBe(false);
  });

  it('sin contrato la actividad no está cumplida', () => {
    // El proceso puede no tener contrato todavía; `marcarActividad` consulta el
    // vigente y ese puede venir nulo.
    for (const vacio of [null, undefined] as (EstadoContrato | null | undefined)[]) {
      expect(actividadCumplida(vacio)).toBe(false);
    }
  });
});

/**
 * Criterio de EFDS-1162: firman el ordenador del gasto y el contratista, y con
 * eso el contrato queda perfeccionado.
 *
 * El orden importa. Firmar es comprometer a la entidad, y hacerlo sobre una
 * minuta que el proponente todavía no ha aceptado sería vincularla a un texto
 * que la otra parte no ha hecho suyo.
 */
describe('puedeFirmarse', () => {
  it('un contrato aceptado admite firmas', () => {
    expect(puedeFirmarse('ACEPTADO')).toBe(true);
  });

  it('no se firma antes de que el proponente acepte', () => {
    expect(puedeFirmarse('GENERADO')).toBe(false);
  });

  it('no se firma una minuta rechazada', () => {
    expect(puedeFirmarse('RECHAZADO')).toBe(false);
  });

  it('un contrato ya perfeccionado no admite más firmas', () => {
    // Las dos partes ya firmaron: una tercera firma sería un acto sin sitio.
    expect(puedeFirmarse('PERFECCIONADO')).toBe(false);
  });
});

/**
 * El perfeccionamiento se deriva de que estén las dos firmas.
 *
 * No lo declara quien firma de último: dejarlo en sus manos permitiría marcar
 * como suscrito un contrato al que le falta una parte.
 */
describe('estaSuscrito', () => {
  it('con las dos partes el contrato queda perfeccionado', () => {
    expect(estaSuscrito(['ORDENADOR', 'CONTRATISTA'])).toBe(true);
  });

  it('no depende del orden en que hayan firmado', () => {
    // El ordenador puede firmar primero o después; el contrato se perfecciona
    // igual. Si dependiera del orden, media entidad quedaría bloqueada.
    expect(estaSuscrito(['CONTRATISTA', 'ORDENADOR'])).toBe(true);
  });

  it('con una sola firma todavía no está suscrito', () => {
    expect(estaSuscrito(['ORDENADOR'])).toBe(false);
    expect(estaSuscrito(['CONTRATISTA'])).toBe(false);
  });

  it('sin firmas no está suscrito', () => {
    expect(estaSuscrito([])).toBe(false);
  });

  it('no se perfecciona repitiendo la firma de una misma parte', () => {
    // La base lo impide con una restricción única, pero la regla también tiene
    // que sostenerse sola: dos firmas no son dos partes.
    expect(estaSuscrito(['ORDENADOR', 'ORDENADOR'])).toBe(false);
  });
});

/**
 * LEGALIZADO llega desde PERFECCIONADO (EFDS-1164) y sigue siendo un contrato
 * suscrito: las guardas posteriores tienen que tratarlo como tal.
 */
describe('estado LEGALIZADO', () => {
  it('no admite firmas: ya las tiene', () => {
    expect(puedeFirmarse('LEGALIZADO')).toBe(false);
  });

  it('mantiene la actividad 8.1 cumplida', () => {
    // Aprobar la última garantía no puede hacer retroceder el riel.
    expect(actividadCumplida('LEGALIZADO')).toBe(true);
  });

  it('no admite respuestas del proponente', () => {
    expect(puedeResponder('LEGALIZADO', 'ACEPTAR')).toBe(false);
    expect(puedeResponder('LEGALIZADO', 'RECHAZAR')).toBe(false);
  });
});
