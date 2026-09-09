import {
  AlertasService,
  diasParaVencer,
  estadoAlerta,
  finDeVigenciaFiscal,
  limiteLiquidacion,
} from './alertas.service';

/**
 * Criterio 1 de EFDS-1185: «dado un CDP, RP o póliza con fecha de vencimiento,
 * cuando se aproxima el vencimiento, el sistema notifica al responsable».
 */
describe('diasParaVencer', () => {
  it('cuenta los días que faltan', () => {
    expect(diasParaVencer('2026-09-30', '2026-09-01')).toBe(29);
  });

  it('lo que vence hoy no lleva días de sobra', () => {
    expect(diasParaVencer('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('lo ya vencido cuenta en negativo', () => {
    expect(diasParaVencer('2026-08-25', '2026-09-01')).toBe(-7);
  });

  it('cruza el cambio de año', () => {
    expect(diasParaVencer('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('estadoAlerta', () => {
  it('avisa cuando faltan menos días que la anticipación', () => {
    expect(estadoAlerta(10, 30)).toBe('POR_VENCER');
  });

  it('el día justo de la anticipación ya avisa', () => {
    // El límite entra: si la anticipación es 30, a 30 días se avisa.
    expect(estadoAlerta(30, 30)).toBe('POR_VENCER');
  });

  it('lo que vence hoy está por vencer, no vencido', () => {
    expect(estadoAlerta(0, 30)).toBe('POR_VENCER');
  });

  it('lo pasado está vencido', () => {
    expect(estadoAlerta(-1, 30)).toBe('VENCIDO');
  });

  it('lo lejano no molesta', () => {
    expect(estadoAlerta(31, 30)).toBe('VIGENTE');
    expect(estadoAlerta(400, 30)).toBe('VIGENTE');
  });
});

/**
 * Criterio 2: «dado un contrato terminado, cuando se aproxima el plazo legal de
 * liquidación, el sistema alerta del vencimiento».
 */
describe('limiteLiquidacion', () => {
  it('cuenta cuatro meses desde la terminación', () => {
    expect(limiteLiquidacion('2026-01-15')).toBe('2026-05-15');
  });

  it('cruza el año', () => {
    expect(limiteLiquidacion('2026-10-31')).toBe('2027-02-28');
  });

  it('cae en el mismo día del mes, no a 120 días', () => {
    // Contar en meses y no en días es lo que hace que febrero no corra la fecha.
    expect(limiteLiquidacion('2026-02-28')).toBe('2026-06-28');
  });
});

describe('finDeVigenciaFiscal', () => {
  it('el respaldo presupuestal vale hasta el cierre del año', () => {
    // El CDP y el RP se imputan a una vigencia, no a una fecha suelta.
    expect(finDeVigenciaFiscal(2026)).toBe('2026-12-31');
  });
});

/**
 * A quién llega el aviso y cuántas veces (EFDS-1183).
 *
 * Las dos cosas fallaban a la vez y en direcciones opuestas: la aprobación se
 * escribía contra un identificador que la campana no consulta —así que no
 * llegaba nunca— y se reescribía en cada pasada del cron, de modo que cuando
 * llegara lo haría multiplicada.
 */
describe('AlertasService · notificar', () => {
  const ACCESO = {
    userId: '5ba6437a-d35e-4afe-a21b-fb939717c0e3',
    userName: 'director@esap.edu.co',
    roles: ['DIRECTOR_CONTRATACION'],
    puedeEditar: true,
  };

  /**
   * Una aprobación pendiente y nada más: se sustituye `listar` porque lo que se
   * comprueba es el envío, no la consulta —que es SQL y se prueba contra la
   * base—, y así el caso queda legible.
   */
  const servicioCon = (pendientesSinLeer: any[] = []) => {
    const query = jest.fn().mockResolvedValue(pendientesSinLeer);
    const srv = new AlertasService({ query } as never);

    jest.spyOn(srv, 'listar').mockResolvedValue([
      {
        tipo: 'APROBACION_PENDIENTE',
        procesoId: 'p1',
        radicado: 'CTO-2026-0017',
        contrato: null,
        descripcion: '3.4 · Revisión y reparto',
        vence: '2026-09-09',
        diasRestantes: -2,
        estado: 'POR_VENCER',
        responsable: 'radicador@esap.edu.co',
        responsableEmail: null,
        responsableId: ACCESO.userId,
      },
    ] as never);

    return srv;
  };

  const cuerpoDe = (fetchSimulado: jest.Mock) =>
    JSON.parse(fetchSimulado.mock.calls[0][1].body);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('avisa al aprobador con el id de su cuenta, que es el que consulta la campana', async () => {
    // Antes se mandaba el `id_person`: la notificación se guardaba, pero el
    // portal pregunta por `/users/:id_user/notifications` y la campana salía
    // vacía con diez avisos en la base.
    const fetchSimulado = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSimulado as never;

    const resultado = await servicioCon().notificar(30, ACCESO as never);

    expect(resultado.notificadas).toBe(1);
    const [aviso] = cuerpoDe(fetchSimulado).notifications;
    expect(aviso.id_usuario_destinatario).toBe(ACCESO.userId);
    expect(aviso.tipo_notificacion).toBe('contratacion_aprobacion');
  });

  it('no repite un aviso que el aprobador ya tiene sin leer', async () => {
    // El cron corre a diario y la aprobación tarda días: sin esto el aprobador
    // acumulaba un mensaje idéntico por jornada hasta decidirse.
    const fetchSimulado = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSimulado as never;

    const yaEnLaCampana = [
      {
        id_usuario_destinatario: ACCESO.userId,
        mensaje:
          '3.4 · Revisión y reparto del proceso CTO-2026-0017 espera tu decisión, enviada por radicador@esap.edu.co.',
      },
    ];

    const resultado = await servicioCon(yaEnLaCampana).notificar(30, ACCESO as never);

    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(resultado.notificadas).toBe(0);
    expect(resultado.repetidas).toBe(1);
  });

  it('vuelve a avisar lo que ya se leyó y sigue sin resolverse', async () => {
    // La consulta solo trae lo no leído: que lo haya visto y no haya decidido
    // es justamente motivo para insistir.
    const fetchSimulado = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSimulado as never;

    const resultado = await servicioCon([]).notificar(30, ACCESO as never);

    expect(resultado.notificadas).toBe(1);
  });

  it('si no puede comprobar los repetidos, avisa igual', async () => {
    // Un duplicado molesta; perder la aprobación no. Ante la duda, se manda.
    const fetchSimulado = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSimulado as never;

    const query = jest.fn().mockRejectedValue(new Error('sin conexión'));
    const srv = new AlertasService({ query } as never);
    jest.spyOn(srv, 'listar').mockResolvedValue([
      {
        tipo: 'APROBACION_PENDIENTE',
        procesoId: 'p1',
        radicado: 'CTO-2026-0017',
        contrato: null,
        descripcion: '3.4 · Revisión y reparto',
        vence: '2026-09-09',
        diasRestantes: -2,
        estado: 'POR_VENCER',
        responsable: null,
        responsableEmail: null,
        responsableId: ACCESO.userId,
      },
    ] as never);

    const resultado = await srv.notificar(30, ACCESO as never);

    expect(resultado.notificadas).toBe(1);
  });

  it('si notifications-service está caído, las alertas se siguen viendo', async () => {
    // Best-effort a propósito: se pierde el aviso, no la alerta.
    global.fetch = jest.fn().mockRejectedValue(new Error('caído')) as never;

    const resultado = await servicioCon().notificar(30, ACCESO as never);

    expect(resultado.notificadas).toBe(0);
    expect(resultado.error).toBe('no se pudo notificar');
  });
});
