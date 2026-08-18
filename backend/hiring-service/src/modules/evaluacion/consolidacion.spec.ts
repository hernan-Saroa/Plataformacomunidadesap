import {
  consolidar,
  CriterioAplicable,
  OfertaEvaluada,
  puntajeEconomico,
  puntajeMaximoDe,
} from './consolidacion';

/**
 * Casos conocidos de la consolidación (EFDS-1157).
 *
 * Se prueban aquí y no solo en el e2e porque son reglas de cálculo: qué pasa
 * con un habilitante incumplido, con una dimensión sin evaluar o con dos
 * ofertas al mismo precio no depende de la base, y verlo contra ejemplos
 * concretos es lo que evita que un cambio de fórmula pase inadvertido.
 */
describe('Consolidación de la evaluación', () => {
  const JURIDICO_HAB: CriterioAplicable = {
    id: 'c-jur',
    dimension: 'JURIDICO',
    tipo: 'HABILITANTE',
    nombre: 'Capacidad jurídica',
    puntajeMaximo: null,
  };
  const TECNICO_HAB: CriterioAplicable = {
    id: 'c-tec-hab',
    dimension: 'TECNICO',
    tipo: 'HABILITANTE',
    nombre: 'Experiencia mínima',
    puntajeMaximo: null,
  };
  const TECNICO_PON: CriterioAplicable = {
    id: 'c-tec-pon',
    dimension: 'TECNICO',
    tipo: 'PONDERABLE',
    nombre: 'Experiencia adicional',
    puntajeMaximo: 40,
  };
  const ECONOMICO: CriterioAplicable = {
    id: 'c-eco',
    dimension: 'ECONOMICO',
    tipo: 'PONDERABLE',
    nombre: 'Precio ofertado',
    puntajeMaximo: 60,
  };

  const CRITERIOS = [JURIDICO_HAB, TECNICO_HAB, TECNICO_PON, ECONOMICO];

  /** Una oferta con todo cumplido y el puntaje técnico que se le indique. */
  const completa = (id: string, valor: number | null, tecnico = 40): OfertaEvaluada => ({
    id,
    valorOfertado: valor,
    evaluaciones: [
      {
        dimension: 'JURIDICO',
        resultados: [{ criterioId: JURIDICO_HAB.id, cumple: true, puntaje: null, observacion: null }],
      },
      {
        dimension: 'TECNICO',
        resultados: [
          { criterioId: TECNICO_HAB.id, cumple: true, puntaje: null, observacion: null },
          { criterioId: TECNICO_PON.id, cumple: null, puntaje: tecnico, observacion: null },
        ],
      },
    ],
  });

  it('suma los máximos ponderables para el total contra el que se lee la nota', () => {
    expect(puntajeMaximoDe(CRITERIOS)).toBe(100);
  });

  it('habilita la oferta que cumple todo y le da el máximo si es la más barata', () => {
    const [barata, cara] = consolidar(
      [completa('barata', 40_000_000), completa('cara', 80_000_000)],
      CRITERIOS,
    );

    expect(barata.estado).toBe('HABILITADA');
    expect(barata.puntajePorDimension.ECONOMICO).toBe(60);
    expect(barata.puntajeTotal).toBe(100);

    // El doble de precio, la mitad del puntaje económico.
    expect(cara.puntajePorDimension.ECONOMICO).toBe(30);
    expect(cara.puntajeTotal).toBe(70);
  });

  it('deja fuera a quien incumple un habilitante, con el criterio y su motivo', () => {
    const fallida: OfertaEvaluada = {
      id: 'fallida',
      valorOfertado: 10_000_000,
      evaluaciones: [
        {
          dimension: 'JURIDICO',
          resultados: [
            {
              criterioId: JURIDICO_HAB.id,
              cumple: false,
              puntaje: null,
              observacion: 'No aportó el certificado de existencia',
            },
          ],
        },
      ],
    };

    const [consolidada] = consolidar([fallida], CRITERIOS);

    expect(consolidada.estado).toBe('NO_HABILITADA');
    expect(consolidada.incumplimientos).toHaveLength(1);
    expect(consolidada.incumplimientos[0].nombre).toBe('Capacidad jurídica');
    expect(consolidada.incumplimientos[0].motivo).toMatch(/certificado/i);
  });

  it('una oferta descartada no fija el precio de referencia de las demás', () => {
    // La más barata queda fuera por un habilitante: si siguiera contando como
    // base, las demás se compararían contra un precio que no está en carrera.
    const descartada: OfertaEvaluada = {
      ...completa('descartada', 10_000_000),
      evaluaciones: [
        {
          dimension: 'JURIDICO',
          resultados: [
            { criterioId: JURIDICO_HAB.id, cumple: false, puntaje: null, observacion: 'Inhabilitada' },
          ],
        },
      ],
    };

    const [, valida] = consolidar([descartada, completa('valida', 40_000_000)], CRITERIOS);

    // Es la más barata de las que siguen, así que se lleva el máximo.
    expect(valida.puntajePorDimension.ECONOMICO).toBe(60);
  });

  it('marca pendiente la dimensión que nadie ha evaluado', () => {
    const sinTecnico: OfertaEvaluada = {
      id: 'a-medias',
      valorOfertado: 40_000_000,
      evaluaciones: [
        {
          dimension: 'JURIDICO',
          resultados: [{ criterioId: JURIDICO_HAB.id, cumple: true, puntaje: null, observacion: null }],
        },
      ],
    };

    const [consolidada] = consolidar([sinTecnico], CRITERIOS);

    expect(consolidada.estado).toBe('PENDIENTE');
    expect(consolidada.dimensionesPendientes).toContain('TECNICO');
  });

  it('deja la económica pendiente cuando la oferta no tiene valor registrado', () => {
    const [consolidada] = consolidar([completa('sin-valor', null)], CRITERIOS);

    // Pendiente y no cero: sin precio no es que la oferta sea la más cara.
    expect(consolidada.dimensionesPendientes).toContain('ECONOMICO');
    expect(consolidada.puntajePorDimension.ECONOMICO).toBeUndefined();
    expect(consolidada.estado).toBe('PENDIENTE');
  });

  it('da el mismo puntaje económico a dos ofertas del mismo precio', () => {
    const [una, otra] = consolidar(
      [completa('una', 55_000_000), completa('otra', 55_000_000)],
      CRITERIOS,
    );

    expect(una.puntajeTotal).toBe(otra.puntajeTotal);
    expect(una.estado).toBe('HABILITADA');
  });

  it('no reparte puntaje económico si la modalidad no lo pondera', () => {
    const sinEconomico = CRITERIOS.filter((c) => c.dimension !== 'ECONOMICO');

    const [consolidada] = consolidar([completa('unica', 40_000_000)], sinEconomico);

    expect(consolidada.estado).toBe('HABILITADA');
    expect(consolidada.puntajeMaximo).toBe(40);
    expect(consolidada.puntajeTotal).toBe(40);
    expect(consolidada.dimensionesPendientes).toHaveLength(0);
  });

  describe('puntajeEconomico', () => {
    it('da el máximo a la más barata y baja en proporción', () => {
      expect(puntajeEconomico(100, 100, 60)).toBe(60);
      expect(puntajeEconomico(200, 100, 60)).toBe(30);
      expect(puntajeEconomico(400, 100, 60)).toBe(15);
    });

    it('no supera el máximo aunque la oferta sea menor que la base', () => {
      // No debería ocurrir —la base es la menor— pero un dato sucio no puede
      // producir una calificación por encima de lo posible.
      expect(puntajeEconomico(50, 100, 60)).toBe(60);
    });

    it('no rompe con valores en cero', () => {
      expect(puntajeEconomico(0, 100, 60)).toBe(0);
      expect(puntajeEconomico(100, 0, 60)).toBe(0);
    });
  });
});
