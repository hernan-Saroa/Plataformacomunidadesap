import { EstadoContrato } from '../../entities/contrato.entity';
import { TipoModificacion } from '../../entities/modificacion-contrato.entity';
import {
  diasEntre,
  diasSuspendidos,
  plazoConMasDias,
  porQueNoAdmiteTipo,
  TIPOS_CON_TRAMITE,
} from './reglas-por-tipo';

const enEjecucion = { estado: 'EJECUCION' as EstadoContrato, suspendido: false };
const suspendido = { estado: 'SUSPENDIDO' as EstadoContrato, suspendido: true };

describe('porQueNoAdmiteTipo · qué modificación cabe ahora', () => {
  it('el contrato en ejecución admite todo menos reanudar', () => {
    for (const tipo of TIPOS_CON_TRAMITE) {
      const motivo = porQueNoAdmiteTipo(enEjecucion, tipo);
      if (tipo === 'REANUDACION') {
        expect(motivo).toMatch(/no está suspendido/i);
      } else {
        expect(motivo).toBeNull();
      }
    }
  });

  it('el contrato suspendido solo admite reanudar o terminarse', () => {
    for (const tipo of TIPOS_CON_TRAMITE) {
      const motivo = porQueNoAdmiteTipo(suspendido, tipo);
      if (tipo === 'REANUDACION' || tipo === 'TERMINACION_ANTICIPADA') {
        expect(motivo).toBeNull();
      } else {
        expect(motivo).toMatch(/está suspendido/i);
      }
    }
  });

  it('deja terminar un contrato en pausa sin obligar a reanudarlo antes', () => {
    // Es el desenlace típico de una suspensión cuya causa no se supera:
    // reanudar un día para terminar al siguiente dejaría en el expediente una
    // ejecución que nunca se retomó.
    expect(porQueNoAdmiteTipo(suspendido, 'TERMINACION_ANTICIPADA')).toBeNull();
  });

  it('no deja adicionar un contrato en pausa', () => {
    // El caso que motiva la regla: mientras está detenido no se le suma plata
    // ni plazo, porque el acto que lo reactiva todavía no existe.
    expect(porQueNoAdmiteTipo(suspendido, 'ADICION')).toMatch(/primero hay que reanudarlo/i);
  });

  it('no deja modificar un contrato liquidado ni uno cerrado', () => {
    for (const estado of ['LIQUIDADO', 'CERRADO'] as EstadoContrato[]) {
      expect(porQueNoAdmiteTipo({ estado, suspendido: false }, 'PRORROGA')).toMatch(
        /ya está liquidado/i,
      );
    }
  });

  it('no deja modificar un contrato que todavía no arrancó', () => {
    for (const estado of ['GENERADO', 'ACEPTADO', 'PERFECCIONADO', 'LEGALIZADO'] as EstadoContrato[]) {
      expect(porQueNoAdmiteTipo({ estado, suspendido: false }, 'PRORROGA')).toMatch(
        /todavía no está en ejecución/i,
      );
    }
  });

  it('los siete tipos de la matriz tienen trámite', () => {
    expect(TIPOS_CON_TRAMITE).toHaveLength(7);
    expect(TIPOS_CON_TRAMITE).toContain('TERMINACION_ANTICIPADA' as TipoModificacion);
  });

  it('un contrato terminado ya no se modifica', () => {
    // Lo que queda por hacer es liquidar lo ejecutado. Si la terminación no
    // debió darse, el camino es revocarla, no modificar por encima de ella.
    for (const tipo of TIPOS_CON_TRAMITE) {
      expect(porQueNoAdmiteTipo({ estado: 'TERMINADO', suspendido: false }, tipo)).toMatch(
        /terminado anticipadamente/i,
      );
    }
  });

  it('el estado manda sobre el tipo: liquidado no admite ni reanudar', () => {
    expect(porQueNoAdmiteTipo({ estado: 'LIQUIDADO', suspendido: true }, 'REANUDACION')).toMatch(
      /ya está liquidado/i,
    );
  });
});

describe('diasEntre · calendario, no días hábiles', () => {
  it('cuenta los días corridos', () => {
    expect(diasEntre('2026-09-01', '2026-09-30')).toBe(29);
  });

  it('cuenta a través del cambio de mes y de año', () => {
    expect(diasEntre('2026-12-28', '2027-01-04')).toBe(7);
  });

  it('no se le va un día en el cambio de horario ni por la zona', () => {
    // Se compara en UTC a propósito: restando fechas locales, un rango que
    // cruce un cambio de hora devuelve 29.958… y se redondea mal.
    expect(diasEntre('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('el mismo día son cero', () => {
    expect(diasEntre('2026-09-01', '2026-09-01')).toBe(0);
  });
});

describe('diasSuspendidos · lo que la pausa le devuelve al plazo', () => {
  it('son los días entre la suspensión y la reanudación real', () => {
    expect(diasSuspendidos('2026-09-01', '2026-09-16')).toBe(15);
  });

  it('reanudar el mismo día no devuelve nada', () => {
    expect(diasSuspendidos('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('una fecha anterior no acorta el plazo', () => {
    // Un error de digitación no puede quitarle días al contratista.
    expect(diasSuspendidos('2026-09-10', '2026-09-01')).toBe(0);
  });
});

describe('plazoConMasDias · el plazo después de la modificación', () => {
  it('suma los días al plazo vigente', () => {
    expect(plazoConMasDias(180, 30)).toEqual({ antes: 180, despues: 210 });
  });

  it('no inventa plazo donde no lo había', () => {
    // Prorrogar treinta días un contrato sin plazo daría un plazo de treinta
    // días que nadie pactó.
    expect(plazoConMasDias(null, 30)).toEqual({ antes: null, despues: null });
  });

  it('sumar cero deja el plazo igual y lo deja dicho', () => {
    expect(plazoConMasDias(180, 0)).toEqual({ antes: 180, despues: 180 });
  });
});
