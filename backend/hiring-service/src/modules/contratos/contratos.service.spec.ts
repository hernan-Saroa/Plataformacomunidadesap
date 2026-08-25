import {
  actividadCumplida,
  estaSuscrito,
  evaluarAdjudicacion,
  puedeFirmarse,
  puedeResponder,
} from './contratos.service';
import { EstadoContrato } from '../../entities/contrato.entity';

/**
 * Criterio 1 de EFDS-1161: el contrato se genera sobre un proceso adjudicado.
 *
 * La adjudicación formal es la etapa 7 y todavía no tiene módulo, así que la
 * condición se comprueba contra la recepción de ofertas cerrada con oferentes.
 * Cuando exista el acto de adjudicación (7.4), lo que cambia es esta función y
 * estas pruebas, no el resto del servicio.
 */
describe('evaluarAdjudicacion', () => {
  it('da por adjudicado el proceso que cerró con ofertas', () => {
    expect(evaluarAdjudicacion({ existe: true, cerrada: true, totalOferentes: 2 })).toEqual({
      adjudicado: true,
      motivo: null,
    });
  });

  it('no deja contratar mientras la recepción siga abierta', () => {
    // Generar el contrato antes del cierre sería elegir contratista sobre una
    // lista de ofertas que todavía puede cambiar.
    const resultado = evaluarAdjudicacion({ existe: true, cerrada: false, totalOferentes: 3 });

    expect(resultado.adjudicado).toBe(false);
    expect(resultado.motivo).toBe('la recepción de ofertas sigue abierta');
  });

  it('no deja contratar si el proceso cerró desierto', () => {
    // Un contrato sin proponente no tiene con quién formalizarse.
    const resultado = evaluarAdjudicacion({ existe: true, cerrada: true, totalOferentes: 0 });

    expect(resultado.adjudicado).toBe(false);
    expect(resultado.motivo).toBe('el proceso cerró sin ofertas recibidas');
  });

  it('no deja contratar un proceso que ni siquiera abrió la recepción', () => {
    const resultado = evaluarAdjudicacion({ existe: false, cerrada: false, totalOferentes: 0 });

    expect(resultado.adjudicado).toBe(false);
    expect(resultado.motivo).toBe('el proceso todavía no ha recibido ofertas');
  });

  it('siempre explica por qué no se puede', () => {
    // La pantalla muestra este motivo. Un `false` sin explicación dejaría al
    // usuario ante un botón apagado sin saber qué le falta.
    const casos = [
      { existe: false, cerrada: false, totalOferentes: 0 },
      { existe: true, cerrada: false, totalOferentes: 1 },
      { existe: true, cerrada: true, totalOferentes: 0 },
    ];

    for (const caso of casos) {
      const resultado = evaluarAdjudicacion(caso);
      expect(resultado.adjudicado).toBe(false);
      expect(resultado.motivo).toBeTruthy();
    }
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
 * La actividad 8.1 se cumple con la aceptación, no con la generación.
 *
 * Un contrato que el proponente no ha aceptado todavía no formaliza nada: darlo
 * por cumplido haría que el riel del proceso mostrara como terminada una etapa
 * que sigue pendiente de respuesta.
 */
describe('actividadCumplida', () => {
  it('solo la aceptación cierra la actividad', () => {
    expect(actividadCumplida('ACEPTADO')).toBe(true);
  });

  it('firmar no la reabre', () => {
    // Perfeccionado se alcanza desde aceptado: si dejara de contar como
    // cumplida, el riel retrocedería justo cuando el contrato se suscribe.
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
