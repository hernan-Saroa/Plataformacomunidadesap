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

  describe('calcularPlazo — corre desde GREATEST(regreso, pago)', () => {
    const base = { plazoDiasHabiles: 5, horaCorte: '16:30', festivos: FESTIVOS_2026 };

    it('avance (pago antes del viaje): vence el quinto día hábil después del regreso', () => {
      const r = calcularPlazo({ ...base, fechaFinComisionYmd: '2026-09-05', fechaPagoYmd: '2026-08-28' }); // regreso sábado
      // 7, 8, 9, 10, 11 de septiembre.
      expect(r.fechaLimite.toISOString()).toBe(instanteColombia('2026-09-11', '16:30').toISOString());
      expect(r.fechaLimite.toISOString()).toBe('2026-09-11T21:30:00.000Z');
      expect(r.fechaBasePlazo.toISOString()).toBe(instanteColombia('2026-09-05', '23:59', '59').toISOString());
    });

    it('reconocimiento posterior (pago después del regreso): corre desde el pago y no nace vencida', () => {
      const r = calcularPlazo({ ...base, fechaFinComisionYmd: '2026-09-05', fechaPagoYmd: '2026-09-24' }); // pago jueves
      expect(fechaColombia(r.fechaBasePlazo)).toBe('2026-09-24');
      // 25, 28, 29, 30 de septiembre y 1 de octubre.
      expect(fechaColombia(r.fechaLimite)).toBe('2026-10-01');
      const alPagar = instanteColombia('2026-09-24', '15:00');
      expect(calcularSemaforo({ fechaLimite: r.fechaLimite, fechaEnvio: null }, alPagar, 2, FESTIVOS_2026)).not.toBe('VENCIDA');
    });

    it('pago el mismo día del regreso: da lo mismo cualquiera de las dos', () => {
      const r = calcularPlazo({ ...base, fechaFinComisionYmd: '2026-10-02', fechaPagoYmd: '2026-10-02' });
      expect(fechaColombia(r.fechaLimite)).toBe('2026-10-09');
    });

    it('legalización abierta antes del pago (sin fecha de pago): corre desde el regreso', () => {
      const r = calcularPlazo({ ...base, fechaFinComisionYmd: '2026-10-02', fechaPagoYmd: null }); // viernes
      expect(fechaColombia(r.fechaBasePlazo)).toBe('2026-10-02');
      // 5, 6, 7, 8, 9 de octubre.
      expect(fechaColombia(r.fechaLimite)).toBe('2026-10-09');
    });

    it('salta festivos: regreso el viernes 9 de octubre y el lunes 12 es festivo', () => {
      const r = calcularPlazo({ ...base, fechaFinComisionYmd: '2026-10-09', fechaPagoYmd: '2026-10-01' });
      // 13, 14, 15, 16, 19 de octubre.
      expect(fechaColombia(r.fechaLimite)).toBe('2026-10-19');
    });

    it('la fecha límite siempre es posterior a la base (CHECK de la migración 450)', () => {
      for (let plazo = 1; plazo <= 15; plazo++) {
        const r = calcularPlazo({
          ...base, fechaFinComisionYmd: '2026-09-05', fechaPagoYmd: '2026-09-20', plazoDiasHabiles: plazo, horaCorte: '00:00',
        });
        expect(r.fechaLimite.getTime()).toBeGreaterThan(r.fechaBasePlazo.getTime());
      }
    });

    it('no depende de la zona horaria del proceso (el contenedor corre en UTC)', () => {
      const original = process.env.TZ;
      const resultados: string[] = [];
      try {
        for (const tz of ['UTC', 'America/Bogota', 'Asia/Tokyo', 'Pacific/Honolulu']) {
          process.env.TZ = tz;
          resultados.push(
            calcularPlazo({ ...base, fechaFinComisionYmd: '2026-09-05', fechaPagoYmd: '2026-09-24' }).fechaLimite.toISOString(),
          );
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
