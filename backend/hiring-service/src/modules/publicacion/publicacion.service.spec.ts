import { BadRequestException } from '@nestjs/common';

import { PublicacionService } from './publicacion.service';

/** Servicio con la base de datos fuera del camino: aquí se prueban las reglas. */
function servicio() {
  return new PublicacionService({ manager: {} } as any);
}

/** El `em` que espera el servicio: sin expediente y sin días propios cargados. */
const em = {
  findOne: async () => null,
  getRepository: () => ({ find: async () => [] }),
} as any;

describe('calcularPlazo', () => {
  const conPlazo = (dias: number) => {
    const s = servicio();
    jest.spyOn(s, 'plazoDeLaModalidad').mockResolvedValue({
      modalidad: 'LICITACION_PUBLICA',
      diasHabiles: dias,
      confirmado: true,
    } as any);
    return s;
  };

  it('calcula el vencimiento con los festivos del año', async () => {
    const r = await (conPlazo(10) as any).calcularPlazo(em, 'LICITACION_PUBLICA', '2026-09-07');

    expect(r.plazoDiasHabiles).toBe(10);
    expect(r.fechaVencimiento).toBe('2026-09-21');
  });

  it('cuenta igual de bien en años que nadie sembró', async () => {
    // Era el techo del calendario a mano: en diciembre de 2027 el registro se
    // bloqueaba porque 2028 no estaba cargado. Con los festivos calculados no
    // hay año que se resista.
    const r = await (conPlazo(10) as any).calcularPlazo(em, 'LICITACION_PUBLICA', '2027-12-20');

    // Ese año Navidad y Año Nuevo caen los dos en sábado, así que no quitan
    // ningún día hábil: los diez se cumplen el lunes 3 de enero de 2028.
    expect(r.fechaVencimiento).toBe('2028-01-03');
  });

  it('registra sin plazo cuando la modalidad no lo tiene parametrizado', async () => {
    // Negarse a registrar por un parámetro que falta castigaría al usuario por
    // una tarea pendiente del equipo (EFDS-1385). El hecho ocurrió igual.
    const s = servicio();
    jest.spyOn(s, 'plazoDeLaModalidad').mockResolvedValue(null);

    const r = await (s as any).calcularPlazo(em, 'ABREVIADA_TVEC', '2026-09-07');
    expect(r).toEqual({ plazoDiasHabiles: null, fechaVencimiento: null });
  });
});

/**
 * La publicación es un hecho ya ocurrido, no una programación: una fecha futura
 * arrancaría un plazo que todavía no corre.
 */
describe('validarFecha', () => {
  const proceso = { id: 'p1' } as any;

  it('rechaza una fecha futura', async () => {
    await expect(
      (servicio() as any).validarFecha(em, proceso, '2099-01-01'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una publicación anterior a la apertura del expediente', async () => {
    const conExpediente = {
      findOne: async () => ({ fechaApertura: new Date('2026-06-01T10:00:00Z') }),
    } as any;

    await expect(
      (servicio() as any).validarFecha(conExpediente, proceso, '2026-05-30'),
    ).rejects.toThrow(/anterior a la apertura del expediente/);
  });

  it('acepta una fecha pasada posterior a la apertura', async () => {
    const conExpediente = {
      findOne: async () => ({ fechaApertura: new Date('2026-06-01T10:00:00Z') }),
    } as any;

    await expect(
      (servicio() as any).validarFecha(conExpediente, proceso, '2026-06-15'),
    ).resolves.toBeUndefined();
  });
});

/**
 * Los plazos de las modalidades distintas de licitación pública son
 * provisionales (EFDS-1385). Mostrarlos como si estuvieran confirmados haría
 * que alguien planeara la apertura contra una fecha que nadie validó.
 */
describe('advertenciaDelPlazo', () => {
  const advertencia = (plazo: any) => (servicio() as any).advertenciaDelPlazo(plazo);

  it('avisa cuando la modalidad no tiene plazo parametrizado', () => {
    expect(advertencia(null)).toMatch(/no tiene plazo de publicidad parametrizado/);
  });

  it('avisa cuando el plazo aún no está confirmado', () => {
    expect(advertencia({ diasHabiles: 5, confirmado: false })).toMatch(/provisional/);
  });

  it('calla cuando el plazo está confirmado', () => {
    expect(advertencia({ diasHabiles: 10, confirmado: true })).toBeNull();
  });
});
