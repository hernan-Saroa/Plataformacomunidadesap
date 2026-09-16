import { InformeDefinitivoService } from './informe-definitivo.service';

/**
 * Qué cambió entre el informe que se notificó y el que se adjudica (EFDS-1486).
 *
 * Es la pregunta que hace el oferente que no ganó, y el expediente tiene que
 * poder responderla sin que nadie ponga los dos jsonb lado a lado. Por eso se
 * resuelve al generar y se guarda, en vez de deducirse al consultar.
 */
function servicio() {
  return new InformeDefinitivoService({ manager: {} } as any);
}

const OFERENTES = [
  { id: 'of-1', numero: 1, nombre: 'Barata SAS' },
  { id: 'of-2', numero: 2, nombre: 'Completa SAS' },
] as any[];

/** El preliminar, con la ganadora que se le notificó a los oferentes. */
const preliminar = (resultadoId: string, ganadoraId: string) =>
  ({
    id: 'inf-1',
    resultadoId,
    resultado: { ganadora: { oferenteId: ganadoraId } },
  }) as any;

/**
 * El `em` que espera el servicio: los escritos presentados contra el
 * preliminar, y el resultado anterior por si hubo rectificación.
 */
function em(escritos: any[], rectificado: any = null) {
  return {
    getRepository: (entidad: any) => {
      const nombre = entidad?.name ?? '';
      if (nombre === 'Subsanacion') return { find: async () => escritos };
      return { findOne: async () => rectificado };
    },
  } as any;
}

const escrito = (parcial: any = {}) => ({
  id: 's-1',
  oferenteId: 'of-1',
  asunto: 'Aporta certificación de experiencia',
  aceptada: null,
  ...parcial,
});

describe('calcularCambios', () => {
  it('sin rectificación ni escritos, no hay nada que explicar', async () => {
    const cambios = await (servicio() as any).calcularCambios(
      em([]),
      preliminar('r-1', 'of-2'),
      { id: 'r-1', oferenteId: 'of-2' },
      OFERENTES,
    );

    expect(cambios).toMatchObject({
      huboRectificacion: false,
      cambioLaGanadora: false,
      escritosPresentados: 0,
      subsanacionesAceptadas: [],
    });
  });

  it('detecta que el comité rectificó y trae su motivo', async () => {
    // El resultado que se trasladó ya no es el vigente: su motivo es lo que
    // explica que el definitivo diga otra cosa.
    const cambios = await (servicio() as any).calcularCambios(
      em([], { id: 'r-1', motivoRectificacion: 'Se aceptó la certificación aportada' }),
      preliminar('r-1', 'of-2'),
      { id: 'r-2', oferenteId: 'of-2' },
      OFERENTES,
    );

    expect(cambios.huboRectificacion).toBe(true);
    expect(cambios.motivoRectificacion).toBe('Se aceptó la certificación aportada');
  });

  it('avisa cuando la ganadora del definitivo no es la que se notificó', async () => {
    // El caso que más importa: al oferente se le notificó que ganaba otro.
    const cambios = await (servicio() as any).calcularCambios(
      em([], { id: 'r-1', motivoRectificacion: 'Subsanación aceptada' }),
      preliminar('r-1', 'of-2'),
      { id: 'r-2', oferenteId: 'of-1' },
      OFERENTES,
    );

    expect(cambios.cambioLaGanadora).toBe(true);
  });

  it('lista solo lo aceptado, con el nombre del oferente', async () => {
    const escritos = [
      escrito({ id: 's-1', aceptada: true }),
      escrito({ id: 's-2', aceptada: false, asunto: 'Cuestiona el puntaje técnico' }),
      escrito({ id: 's-3', aceptada: null, asunto: 'Sin responder' }),
    ];

    const cambios = await (servicio() as any).calcularCambios(
      em(escritos),
      preliminar('r-1', 'of-2'),
      { id: 'r-1', oferenteId: 'of-2' },
      OFERENTES,
    );

    // Lo aceptado es lo que suele explicar el cambio; lo negado y lo pendiente
    // se cuentan, pero no explican nada.
    expect(cambios.subsanacionesAceptadas).toEqual([
      { id: 's-1', oferente: 'Barata SAS', asunto: 'Aporta certificación de experiencia' },
    ]);
    expect(cambios.escritosPresentados).toBe(3);
  });

  it('no se cae si el oferente que subsanó ya no está en la lista', async () => {
    const cambios = await (servicio() as any).calcularCambios(
      em([escrito({ oferenteId: 'of-borrada', aceptada: true })]),
      preliminar('r-1', 'of-2'),
      { id: 'r-1', oferenteId: 'of-2' },
      OFERENTES,
    );

    expect(cambios.subsanacionesAceptadas[0].oferente).toBe('Oferta retirada');
  });
});
