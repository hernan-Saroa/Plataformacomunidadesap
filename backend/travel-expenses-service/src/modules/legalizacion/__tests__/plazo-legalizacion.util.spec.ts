import {
  calcularPlazo,
  calcularSemaforo,
  diasHabilesRestantes,
  fechaColombia,
  instanteColombia,
  sumarDiasHabiles,
} from '../plazo-legalizacion.util';

/** Festivos reales de 2026 cargados en auth.festivos_colombia (los del segundo semestre). */
const FESTIVOS_2026 = new Set([
  '2026-10-12',
  '2026-11-02',
  '2026-11-16',
  '2026-12-08',
  '2026-12-25',
]);

describe('EFDS-1309 — plazo de legalización (días hábiles, hora Colombia)', () => {
  describe('fechaColombia', () => {
    it('las 22:00 de Colombia siguen siendo el mismo día aunque en UTC ya sea el siguiente', () => {
      expect(fechaColombia(new Date('2026-09-24T03:00:00Z'))).toBe('2026-09-23');
    });
    it('desde las 00:00 de Colombia es el día siguiente', () => {
      expect(fechaColombia(new Date('2026-09-24T05:00:00Z'))).toBe('2026-09-24');
    });
  });

  describe('sumarDiasHabiles', () => {
    it('salta el fin de semana: viernes + 1 = lunes', () => {
      expect(sumarDiasHabiles('2026-09-25', 1, FESTIVOS_2026).fecha).toBe('2026-09-28');
    });

    it('salta un festivo: el lunes 12 de octubre (Día de la Raza) no cuenta', () => {
      // Viernes 9 de octubre + 1 día hábil = martes 13 (sábado, domingo y lunes festivo no cuentan).
      expect(sumarDiasHabiles('2026-10-09', 1, FESTIVOS_2026).fecha).toBe('2026-10-13');
    });

    it('cuenta estrictamente desde el día siguiente a la base', () => {
      // Jueves 24 → 25 (1), 28 (2), 29 (3), 30 (4), 1-oct (5).
      expect(sumarDiasHabiles('2026-09-24', 5, FESTIVOS_2026).fecha).toBe('2026-10-01');
    });

    it('marca calendario incompleto si el plazo cruza a un año sin festivos cargados', () => {
      const r = sumarDiasHabiles('2026-12-28', 5, FESTIVOS_2026);
      expect(r.calendarioIncompleto).toBe(true);
      // 1 de enero de 2027 es festivo, pero no está cargado: cuenta como hábil.
      expect(r.fecha).toBe('2027-01-04');
    });

    it('no marca calendario incompleto dentro de un año con festivos cargados', () => {
      expect(sumarDiasHabiles('2026-09-24', 5, FESTIVOS_2026).calendarioIncompleto).toBe(false);
    });

    it.each([0, -1, 2.5, NaN])('rechaza un plazo no entero positivo (%p)', (n) => {
      expect(() => sumarDiasHabiles('2026-09-24', n as number, FESTIVOS_2026)).toThrow();
    });
  });

  describe('calcularPlazo', () => {
    it('comisión ya terminada al pagarse: el plazo corre desde el pago', () => {
      const r = calcularPlazo({
        fechaFinComisionYmd: '2026-09-05',
        fechaDisparo: new Date('2026-09-24T15:00:00Z'), // 10:00 Colombia, jueves 24
        plazoDiasHabiles: 5,
        horaCorte: '16:30',
        festivos: FESTIVOS_2026,
      });
      expect(r.fechaBasePlazo.toISOString()).toBe('2026-09-24T15:00:00.000Z');
      expect(r.fechaLimite.toISOString()).toBe(instanteColombia('2026-10-01', '16:30').toISOString());
      expect(r.fechaLimite.toISOString()).toBe('2026-10-01T21:30:00.000Z');
    });

    it('comisión pagada antes de viajar (avance): el plazo corre desde el fin de la comisión', () => {
      const r = calcularPlazo({
        fechaFinComisionYmd: '2026-10-02', // viernes
        fechaDisparo: new Date('2026-09-24T15:00:00Z'),
        plazoDiasHabiles: 5,
        horaCorte: '16:30',
        festivos: FESTIVOS_2026,
      });
      expect(fechaColombia(r.fechaBasePlazo)).toBe('2026-10-02');
      // 5, 6, 7, 8, 9 de octubre.
      expect(fechaColombia(r.fechaLimite)).toBe('2026-10-09');
    });

    it('un pago a las 23:30 de Colombia cuenta desde ese día, no desde el siguiente en UTC', () => {
      const r = calcularPlazo({
        fechaFinComisionYmd: '2026-09-05',
        fechaDisparo: new Date('2026-09-24T04:30:00Z'), // 23:30 del miércoles 23 en Colombia
        plazoDiasHabiles: 5,
        horaCorte: '16:30',
        festivos: FESTIVOS_2026,
      });
      // Miércoles 23 → 24, 25, 28, 29, 30.
      expect(fechaColombia(r.fechaLimite)).toBe('2026-09-30');
    });

    it('la fecha límite siempre es posterior a la base (CHECK de la migración 450)', () => {
      for (let plazo = 1; plazo <= 15; plazo++) {
        const r = calcularPlazo({
          fechaFinComisionYmd: '2026-09-05',
          fechaDisparo: new Date('2026-09-25T21:00:00Z'),
          plazoDiasHabiles: plazo,
          horaCorte: '00:00',
          festivos: FESTIVOS_2026,
        });
        expect(r.fechaLimite.getTime()).toBeGreaterThan(r.fechaBasePlazo.getTime());
      }
    });

    it('no depende de la zona horaria del proceso (el contenedor corre en UTC)', () => {
      const original = process.env.TZ;
      const params = {
        fechaFinComisionYmd: '2026-09-05',
        fechaDisparo: new Date('2026-09-24T04:30:00Z'),
        plazoDiasHabiles: 5,
        horaCorte: '16:30',
        festivos: FESTIVOS_2026,
      };
      const resultados: string[] = [];
      try {
        for (const tz of ['UTC', 'America/Bogota', 'Asia/Tokyo', 'Pacific/Honolulu']) {
          process.env.TZ = tz;
          resultados.push(calcularPlazo(params).fechaLimite.toISOString());
        }
      } finally {
        process.env.TZ = original;
      }
      expect(new Set(resultados).size).toBe(1);
    });
  });

  describe('semáforo y días restantes', () => {
    const fechaLimite = instanteColombia('2026-10-01', '16:30'); // jueves

    it('ENVIADA en cuanto tiene fecha de envío, aunque esté vencida', () => {
      expect(
        calcularSemaforo({ fechaLimite, fechaEnvio: new Date() }, new Date('2026-12-01T12:00:00Z'), 2, FESTIVOS_2026),
      ).toBe('ENVIADA');
    });

    it('VENCIDA un minuto después de la hora de corte del último día', () => {
      const ahora = new Date(fechaLimite.getTime() + 60_000);
      expect(calcularSemaforo({ fechaLimite, fechaEnvio: null }, ahora, 2, FESTIVOS_2026)).toBe('VENCIDA');
    });

    it('POR_VENCER el mismo día del vencimiento, antes del corte', () => {
      const ahora = instanteColombia('2026-10-01', '09:00');
      expect(diasHabilesRestantes(ahora, fechaLimite, FESTIVOS_2026)).toBe(0);
      expect(calcularSemaforo({ fechaLimite, fechaEnvio: null }, ahora, 2, FESTIVOS_2026)).toBe('POR_VENCER');
    });

    it('POR_VENCER con 2 días hábiles restantes y aviso configurado en 2', () => {
      const ahora = instanteColombia('2026-09-29', '09:00'); // martes → quedan 30 y 1
      expect(diasHabilesRestantes(ahora, fechaLimite, FESTIVOS_2026)).toBe(2);
      expect(calcularSemaforo({ fechaLimite, fechaEnvio: null }, ahora, 2, FESTIVOS_2026)).toBe('POR_VENCER');
    });

    it('VIGENTE con 3 días hábiles restantes y aviso en 2', () => {
      const ahora = instanteColombia('2026-09-28', '09:00'); // lunes → 29, 30, 1
      expect(diasHabilesRestantes(ahora, fechaLimite, FESTIVOS_2026)).toBe(3);
      expect(calcularSemaforo({ fechaLimite, fechaEnvio: null }, ahora, 2, FESTIVOS_2026)).toBe('VIGENTE');
    });
  });
});
