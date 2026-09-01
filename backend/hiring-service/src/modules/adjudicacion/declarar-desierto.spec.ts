import { BadRequestException, ConflictException } from '@nestjs/common';

import { DeclaratoriaDesiertaService } from './declaratoria-desierta.service';

/**
 * Declarar desierto el proceso (EFDS-1510).
 *
 * Lo que se prueba aquí es que **la causal tiene que ser verdad contra el
 * propio expediente**: la declaratoria dice por qué el proceso no terminó en
 * contrato, y esa razón la va a leer un tercero. Que no cuadre con lo que el
 * expediente muestra es un error, no una advertencia.
 *
 * Servicio con la base de datos fuera del camino: aquí se prueba la regla.
 */
const OFERTAS = [
  { id: 'of-1', numero: 1, nombre: 'Barata SAS' },
  { id: 'of-2', numero: 2, nombre: 'Completa SAS' },
] as any[];

const dto = (parcial: any = {}) => ({
  causal: 'SIN_OFERTAS_HABILITADAS',
  motivo: 'Ninguna oferta acreditó la experiencia mínima exigida en el pliego',
  numeroActo: 'RES-2026-220',
  fechaActo: '2026-09-10',
  ...parcial,
});

interface Escenario {
  ofertas?: any[];
  recepcion?: any;
  actoVigente?: any;
  declaratoriaVigente?: any;
  resultado?: any;
}

function conEscenario(opciones: Escenario = {}) {
  const s = new DeclaratoriaDesiertaService({ manager: {} } as any) as any;
  const proceso = { id: 'p-1', modalidad: 'LICITACION_PUBLICA', estado: 'EN_CURSO' };

  s.exigirProceso = async () => proceso;
  s.exigirQueAplique = async () => undefined;
  s.ofertasDe = async () => opciones.ofertas ?? OFERTAS;
  s.declaratoriaVigente = async () => opciones.declaratoriaVigente ?? null;
  s.actoVigente = async () => opciones.actoVigente ?? null;
  s.resultadoVigente = async () => opciones.resultado ?? null;
  s.ofertaDe = async (_em: any, id: string) => OFERTAS.find((o) => o.id === id) ?? null;
  s.guardarDocumento = async () => ({ id: `doc-${Math.random()}` });
  s.marcarEtapaNoAplica = async () => undefined;
  s.marcarActividad = async () => undefined;
  s.traza = async () => undefined;
  s.estado = async () => ({ ok: true });

  const guardados: any[] = [];
  const em = {
    getRepository: () => ({
      findOne: async () =>
        opciones.recepcion === undefined ? { id: 'rec-1', estado: 'CERRADA' } : opciones.recepcion,
    }),
    create: (_entidad: any, datos: any) => datos,
    save: async (datos: any) => {
      guardados.push(datos);
      return { id: 'desierta-1', ...datos };
    },
  };
  s.dataSource = { transaction: async (fn: any) => fn(em) };

  return { servicio: s, guardados, proceso };
}

const acto = { filename: 'acto.pdf' } as any;
const informe = { filename: 'informe.pdf' } as any;
const acceso = { userName: 'Gestora', userId: 'u-1' } as any;

describe('declarar desierto', () => {
  it('declara por ninguna habilitada y cierra el proceso', async () => {
    const { servicio: s, guardados, proceso } = conEscenario();

    await s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso);

    expect(guardados[0]).toMatchObject({
      causal: 'SIN_OFERTAS_HABILITADAS',
      numeroActo: 'RES-2026-220',
      // Se fotografían las ofertas del día del acto, como hacen los informes.
      ofertasRecibidas: 2,
      estado: 'VIGENTE',
    });
    expect(proceso.estado).toBe('DESIERTO');
  });

  it('declara por sin ofertas cuando no se presentó nadie, y no pide informe del comité', async () => {
    const { servicio: s, guardados } = conEscenario({ ofertas: [] });

    await s.declarar('p-1', dto({ causal: 'SIN_OFERTAS' }), acto, 'hash', null, null, acceso);

    expect(guardados[0]).toMatchObject({
      causal: 'SIN_OFERTAS',
      ofertasRecibidas: 0,
      informeComiteDocumentoId: null,
    });
  });

  it('rechaza "sin ofertas" cuando el proceso sí recibió ofertas', async () => {
    const { servicio: s } = conEscenario();

    // La causal es la razón que el acto le da a un tercero: no puede
    // contradecir la lista de oferentes del mismo expediente.
    await expect(
      s.declarar('p-1', dto({ causal: 'SIN_OFERTAS' }), acto, 'hash', null, null, acceso),
    ).rejects.toThrow(/2 oferta/);
  });

  it('rechaza "ninguna habilitada" cuando no se presentó nadie', async () => {
    const { servicio: s } = conEscenario({ ofertas: [] });

    await expect(
      s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige el informe del comité para declarar que ninguna quedó habilitada', async () => {
    const { servicio: s } = conEscenario();

    // Es la pieza que sustenta el veredicto, y hoy no tiene otro sitio donde
    // vivir: el resultado de evaluación exige nombrar una ganadora.
    await expect(
      s.declarar('p-1', dto(), acto, 'hash', null, null, acceso),
    ).rejects.toThrow(/informe del comité/i);
  });

  it('no declara desierto un proceso adjudicado: primero se revoca el acto', async () => {
    const { servicio: s } = conEscenario({ actoVigente: { id: 'acto-1', numeroActo: 'RES-114' } });

    await expect(
      s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no declara dos veces: primero se revoca la declaratoria vigente', async () => {
    const { servicio: s } = conEscenario({ declaratoriaVigente: { id: 'des-1' } });

    await expect(
      s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
    ).rejects.toThrow(/revocar/i);
  });

  it('no declara mientras la recepción siga abierta', async () => {
    const { servicio: s } = conEscenario({ recepcion: { id: 'rec-1', estado: 'ABIERTA' } });

    // Mientras el plazo corra, "no hay ofertas" es la foto de algo que todavía
    // puede cambiar.
    await expect(
      s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
    ).rejects.toThrow(/abierta/i);
  });

  it('no declara si el proceso nunca abrió recepción de ofertas', async () => {
    const { servicio: s } = conEscenario({ recepcion: null });

    await expect(
      s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('cuando el comité ya nombró una ganadora', () => {
    const RESULTADO = { id: 'res-1', oferenteId: 'of-2' };

    it('exige justificación y nombra a la ganadora del comité', async () => {
      const { servicio: s } = conEscenario({ resultado: RESULTADO });

      // Mismo criterio de adjudicar a alguien distinto del ganador: no se
      // impide, se pone la contradicción delante.
      await expect(
        s.declarar('p-1', dto(), acto, 'hash', informe, 'hash-2', acceso),
      ).rejects.toThrow(/Completa SAS/);
    });

    it('con justificación procede y deja dicho de qué resultado se apartó', async () => {
      const { servicio: s, guardados } = conEscenario({ resultado: RESULTADO });

      await s.declarar(
        'p-1',
        dto({ justificacion: 'La ganadora resultó inhabilitada sobrevinientemente' }),
        acto,
        'hash',
        informe,
        'hash-2',
        acceso,
      );

      expect(guardados[0]).toMatchObject({ resultadoContradichoId: 'res-1' });
    });

    it('una justificación en blanco no cuenta como justificación', async () => {
      const { servicio: s } = conEscenario({ resultado: RESULTADO });

      await expect(
        s.declarar('p-1', dto({ justificacion: '   ' }), acto, 'hash', informe, 'hash-2', acceso),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('revocar devuelve el proceso a en curso', async () => {
    const { servicio: s, proceso } = conEscenario({
      declaratoriaVigente: { id: 'des-1', numeroActo: 'RES-220', notificadaAt: new Date() },
    });

    await s.revocar('p-1', { motivo: 'Se repuso el término por decisión de fondo' }, acceso);

    expect(proceso.estado).toBe('EN_CURSO');
  });
});
