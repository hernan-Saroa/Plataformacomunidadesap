import { ConflictException } from '@nestjs/common';

import { TrasladoService } from './traslado.service';

/**
 * Lo que decide el modelo del traslado es qué se congela (EFDS-1462).
 *
 * El informe es la pieza que se le notifica al oferente, y tiene que leerse
 * igual dentro de un año, cuando el comité ya rectificó su resultado y quizá la
 * ganadora es otra. Estas pruebas fijan eso: que la fotografía se lea sola, sin
 * volver a consultar nada.
 *
 * Servicio con la base de datos fuera del camino, igual que en `publicacion`.
 */
function servicio() {
  return new TrasladoService({ manager: {} } as any);
}

const proceso = { id: 'p1', modalidad: 'ABREVIADA_MENOR_CUANTIA' } as any;

const resultado = {
  id: 'r1',
  oferenteId: 'of2',
  informeDocumentoId: 'doc-informe',
  puntajeObtenido: '92.50',
  puntajeMaximo: '100.00',
  valorEvaluado: '4500000.00',
  justificacion: 'Mayor puntaje técnico con el precio más bajo entre las habilitadas',
} as any;

const oferentes = [
  {
    id: 'of1',
    numero: 1,
    nombre: 'Constructora Andina SAS',
    identificacion: '900111222',
    valorOfertado: '4800000.00',
  },
  {
    id: 'of2',
    numero: 2,
    nombre: 'Ingeniería del Norte Ltda',
    identificacion: '900333444',
    valorOfertado: '4600000.00',
  },
];

/** El `em` que espera el servicio, con la recepción y sus ofertas cargadas. */
function em(ofertas = oferentes, evidencias: any[] = []) {
  return {
    getRepository: (entidad: any) => {
      const nombre = entidad?.name ?? '';
      if (nombre === 'RecepcionOfertas') return { findOne: async () => ({ id: 'rec1' }) };
      if (nombre === 'Oferente') return { find: async () => ofertas };
      if (nombre === 'EvidenciaEvaluacion') return { find: async () => evidencias };
      return { find: async () => [], findOne: async () => null };
    },
  } as any;
}

describe('congelar', () => {
  it('copia los nombres en vez de referenciarlos', async () => {
    const foto = await (servicio() as any).congelar(em(), proceso, resultado);

    // El nombre y la identificación viajan con la copia: si mañana se corrige
    // el registro del oferente, el informe notificado no cambia detrás de él.
    expect(foto.ganadora).toEqual({
      oferenteId: 'of2',
      nombre: 'Ingeniería del Norte Ltda',
      identificacion: '900333444',
    });
    expect(foto.resultadoId).toBe('r1');
    expect(foto.justificacion).toBe(resultado.justificacion);
  });

  it('convierte a número las cifras que Postgres devuelve como texto', async () => {
    const foto = await (servicio() as any).congelar(em(), proceso, resultado);

    // `numeric` llega como string por el driver. Si se guardara así, el jsonb
    // del informe tendría "92.50" y la pantalla lo compararía como texto.
    expect(foto.puntajeObtenido).toBe(92.5);
    expect(foto.puntajeMaximo).toBe(100);
    expect(foto.valorEvaluado).toBe(4500000);
    expect(foto.ofertas[0].valorOfertado).toBe(4800000);
  });

  it('marca cuál de las ofertas recibidas es la ganadora', async () => {
    const foto = await (servicio() as any).congelar(em(), proceso, resultado);

    // Todas las ofertas van en el informe, no solo la ganadora: el traslado es
    // para los que no ganaron, y tienen que verse en la lista.
    expect(foto.ofertas).toHaveLength(2);
    expect(foto.ofertas.map((o: any) => o.ganadora)).toEqual([false, true]);
  });

  it('lleva las evidencias con su descripción', async () => {
    const evidencias = [
      { documentoId: 'd1', descripcion: 'Verificación jurídica' },
      { documentoId: 'd2', descripcion: 'Cuadro comparativo' },
    ];

    const foto = await (servicio() as any).congelar(em(oferentes, evidencias), proceso, resultado);

    expect(foto.evidencias).toEqual([
      { documentoId: 'd1', descripcion: 'Verificación jurídica' },
      { documentoId: 'd2', descripcion: 'Cuadro comparativo' },
    ]);
    // El informe del comité es lo que se traslada, así que va en la copia.
    expect(foto.informeDocumentoId).toBe('doc-informe');
  });

  it('se niega a congelar si la ganadora ya no está en la lista', async () => {
    // Pasa si se retira una oferta después de registrado el resultado. Generar
    // el informe igual dejaría notificada una ganadora que el proceso ya no
    // tiene, y eso no se arregla después.
    await expect(
      (servicio() as any).congelar(em([oferentes[0]]), proceso, resultado),
    ).rejects.toThrow(ConflictException);
  });

  it('cuenta las ofertas recibidas, no las habilitadas', async () => {
    const foto = await (servicio() as any).congelar(em(), proceso, resultado);

    // Quién queda habilitado lo decide el comité por fuera (EFDS-1157): lo que
    // el informe puede afirmar es cuántas ofertas recibió el proceso.
    expect(foto.ofertas).toHaveLength(2);
  });
});
