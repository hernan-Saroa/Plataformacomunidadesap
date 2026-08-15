import { actividadCumplida, evaluarAdjudicacion, puedeResponder } from './contratos.service';
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
