import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  aYMD,
  aFechaUtc,
  esFinDeSemana,
  esDiaFestivo,
  esDiaHabil,
  siguienteDia,
  siguienteDiaHabil,
  contarDiasHabiles,
  calcularDiasHabilesPrevios,
  sumarDiasHabiles,
  calcularDiasHabilesRestantes,
  clasificarEstadoPlazo,
  calcularTiempoLimite,
  validarAnticipacionRadicacion,
  obtenerFestivosAuth,
  limpiarCacheFestivos,
  DIAS_HABILES_ANTICIPACION_MINIMA,
  DIAS_HABILES_UMBRAL_AVANCE_RP,
} from './diasHabilesUtils';
import apiClient from '../services/api/apiClient';

vi.mock('../services/api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('diasHabilesUtils — Cómputo estándar de Días Hábiles y Tiempo Límite en Viáticos', () => {
  // Festivos oficiales de prueba (Colombia 2026)
  const FESTIVOS_COLOMBIA_2026 = new Set([
    '2026-01-01', // Año Nuevo
    '2026-01-12', // Reyes Magos
    '2026-03-23', // San José
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajo
    '2026-05-18', // Ascensión del Señor
    '2026-06-08', // Corpus Christi
    '2026-07-20', // Día de la Independencia
    '2026-08-07', // Batalla de Boyacá
    '2026-12-25', // Navidad
  ]);

  beforeEach(() => {
    limpiarCacheFestivos();
    vi.clearAllMocks();
  });

  describe('1. Normalización de fechas y validación de fin de semana', () => {
    it('normaliza fechas ISO y Date a YYYY-MM-DD sin desvíos', () => {
      expect(aYMD('2026-07-20')).toBe('2026-07-20');
      expect(aYMD('2026-07-20T00:00:00.000Z')).toBe('2026-07-20');
      expect(aYMD(new Date(2026, 6, 20))).toBe('2026-07-20');
    });

    it('identifica correctamente sábados y domingos (esFinDeSemana)', () => {
      // 2026-09-19 es Sábado, 2026-09-20 es Domingo
      expect(esFinDeSemana('2026-09-19')).toBe(true);
      expect(esFinDeSemana('2026-09-20')).toBe(true);

      // 2026-09-18 es Viernes, 2026-09-21 es Lunes
      expect(esFinDeSemana('2026-09-18')).toBe(false);
      expect(esFinDeSemana('2026-09-21')).toBe(false);
    });

    it('identifica festivos y días hábiles', () => {
      // 2026-07-20 es Lunes pero es festivo patrio
      expect(esDiaFestivo('2026-07-20', FESTIVOS_COLOMBIA_2026)).toBe(true);
      expect(esDiaHabil('2026-07-20', FESTIVOS_COLOMBIA_2026)).toBe(false);

      // 2026-07-21 es Martes hábil ordinario
      expect(esDiaFestivo('2026-07-21', FESTIVOS_COLOMBIA_2026)).toBe(false);
      expect(esDiaHabil('2026-07-21', FESTIVOS_COLOMBIA_2026)).toBe(true);

      // Sábado festivo o no festivo nunca es día hábil
      expect(esDiaHabil('2026-09-19', FESTIVOS_COLOMBIA_2026)).toBe(false);
    });

    it('obtiene el siguiente día hábil saltando fines de semana y festivos', () => {
      // Viernes 2026-07-17 -> Siguiente día hábil debe saltar Sábado 18, Domingo 19 y Lunes 20 (Festivo) -> Martes 21
      const sigHabil = siguienteDiaHabil('2026-07-17', FESTIVOS_COLOMBIA_2026);
      expect(sigHabil).toBe('2026-07-21');
    });
  });

  describe('2. Conteo de Días Hábiles (contarDiasHabiles y calcularDiasHabilesPrevios)', () => {
    it('modo "previos": cuenta estrictamente los días intermedios (excluye inicio y fin)', () => {
      // Lunes 2026-09-21 al Lunes 2026-09-28 (sin festivos):
      // Días intermedios: Mar 22, Mié 23, Jue 24, Vie 25 (4 días hábiles; Sáb 26 y Dom 27 excluidos)
      const dias = contarDiasHabiles('2026-09-21', '2026-09-28', FESTIVOS_COLOMBIA_2026, {
        modo: 'previos',
      });
      expect(dias).toBe(4);
    });

    it('descuenta festivos de Colombia en el conteo de días hábiles previos', () => {
      // Semana Santa 2026:
      // Lunes 2026-03-30 a Lunes 2026-04-06
      // Días intermedios:
      // Mar 31 (hábil), Mié 01 (hábil), Jue 02 (Jueves Santo: festivo), Vie 03 (Viernes Santo: festivo),
      // Sáb 04 (fin de semana), Dom 05 (fin de semana).
      // Total días hábiles previos: 2 (solo Mar 31 y Mié 01)
      const diasSemanaSanta = contarDiasHabiles(
        '2026-03-30',
        '2026-04-06',
        FESTIVOS_COLOMBIA_2026,
        { modo: 'previos' },
      );
      expect(diasSemanaSanta).toBe(2);
    });

    it('modo "rango_completo": incluye inicio y fin para duración de comisión', () => {
      // Viernes 2026-07-17 a Martes 2026-07-21:
      // Vie 17 (hábil), Sáb 18 (no), Dom 19 (no), Lun 20 (Festivo: no), Mar 21 (hábil)
      // Total: 2 días hábiles
      const dias = contarDiasHabiles('2026-07-17', '2026-07-21', FESTIVOS_COLOMBIA_2026, {
        modo: 'rango_completo',
      });
      expect(dias).toBe(2);
    });

    it('aplica correctamente el umbral de 5 días hábiles previos para modalidad de pago RP (RF-PRE-003)', () => {
      // Si RP se expide el 2026-09-14 para viaje el 2026-09-22:
      // Intermedios hábiles: Mar 15, Mié 16, Jue 17, Vie 18, Lun 21 = 5 días hábiles previos
      const dias5 = calcularDiasHabilesPrevios('2026-09-14', '2026-09-22', FESTIVOS_COLOMBIA_2026);
      expect(dias5).toBe(5);
      expect(dias5 >= DIAS_HABILES_UMBRAL_AVANCE_RP).toBe(true); // AVANCE

      // Si RP se expide el 2026-09-15 para viaje el 2026-09-22:
      // Intermedios hábiles: Mié 16, Jue 17, Vie 18, Lun 21 = 4 días hábiles previos
      const dias4 = calcularDiasHabilesPrevios('2026-09-15', '2026-09-22', FESTIVOS_COLOMBIA_2026);
      expect(dias4).toBe(4);
      expect(dias4 >= DIAS_HABILES_UMBRAL_AVANCE_RP).toBe(false); // RECONOCIMIENTO_POSTERIOR
    });
  });

  describe('3. Suma de días hábiles y proyección de fecha límite', () => {
    it('suma días hábiles saltando fines de semana y festivos', () => {
      // A partir de Jueves 2026-07-16, sumar 3 días hábiles:
      // 1: Vie 17
      // Salta Sáb 18, Dom 19, Lun 20 (Festivo)
      // 2: Mar 21
      // 3: Mié 22
      const fechaVencimiento = sumarDiasHabiles('2026-07-16', 3, FESTIVOS_COLOMBIA_2026);
      expect(fechaVencimiento).toBe('2026-07-22');
    });

    it('calcula días restantes con signo (calcularDiasHabilesRestantes)', () => {
      // Hoy: 2026-07-21, Vence: 2026-07-24 (Mié 22, Jue 23, Vie 24 = 3 días restantes)
      const restantes = calcularDiasHabilesRestantes('2026-07-24', '2026-07-21', FESTIVOS_COLOMBIA_2026);
      expect(restantes).toBe(3);

      // Mismo día = 0
      expect(calcularDiasHabilesRestantes('2026-07-21', '2026-07-21', FESTIVOS_COLOMBIA_2026)).toBe(0);

      // Ya vencido hace 2 días hábiles (Hoy: 2026-07-23, Vencía: 2026-07-21) -> -2
      const vencidos = calcularDiasHabilesRestantes('2026-07-21', '2026-07-23', FESTIVOS_COLOMBIA_2026);
      expect(vencidos).toBe(-2);
    });

    it('clasifica el estado del plazo (VIGENTE, POR_VENCER, VENCIDO)', () => {
      expect(clasificarEstadoPlazo(5, 2)).toBe('VIGENTE');
      expect(clasificarEstadoPlazo(2, 2)).toBe('POR_VENCER');
      expect(clasificarEstadoPlazo(1, 2)).toBe('POR_VENCER');
      expect(clasificarEstadoPlazo(0, 2)).toBe('POR_VENCER');
      expect(clasificarEstadoPlazo(-1, 2)).toBe('VENCIDO');
      expect(clasificarEstadoPlazo(null)).toBe('SIN_PLAZO');
    });

    it('calcula integralmente el tiempo límite (calcularTiempoLimite)', () => {
      const tl = calcularTiempoLimite('2026-07-16', 5, FESTIVOS_COLOMBIA_2026, 2, '2026-07-21');
      // Vence: Vie 17(1), Mar 21(2), Mié 22(3), Jue 23(4), Vie 24(5) -> 2026-07-24
      expect(tl.fechaVencimiento).toBe('2026-07-24');
      // De 2026-07-21 a 2026-07-24: 3 días hábiles restantes
      expect(tl.diasRestantes).toBe(3);
      expect(tl.estado).toBe('VIGENTE');
    });
  });

  describe('4. Validación de Anticipación de Radicación (Regla de 14 días hábiles)', () => {
    it('determina ordinaria si faltan 14 o más días hábiles', () => {
      // Radicación: Lunes 2026-09-07 a las 10:00 AM (dentro de jornada)
      const fechaRadicacion = new Date(2026, 8, 7, 10, 0, 0);
      // Inicio viaje: Lunes 2026-09-28 (14 días hábiles previos intermedios exactos)
      const val = validarAnticipacionRadicacion('2026-09-28', FESTIVOS_COLOMBIA_2026, fechaRadicacion);

      expect(val).not.toBeNull();
      expect(val?.radicadoFueraJornada).toBe(false);
      expect(val?.diasHabiles).toBeGreaterThanOrEqual(DIAS_HABILES_ANTICIPACION_MINIMA);
      expect(val?.extemporanea).toBe(false);
    });

    it('determina extemporánea si faltan menos de 14 días hábiles', () => {
      // Radicación: Lunes 2026-09-07 a las 10:00 AM
      const fechaRadicacion = new Date(2026, 8, 7, 10, 0, 0);
      // Inicio viaje: Viernes 2026-09-18 (faltan solo 9 días hábiles)
      const val = validarAnticipacionRadicacion('2026-09-18', FESTIVOS_COLOMBIA_2026, fechaRadicacion);

      expect(val).not.toBeNull();
      expect(val?.diasHabiles).toBeLessThan(DIAS_HABILES_ANTICIPACION_MINIMA);
      expect(val?.extemporanea).toBe(true);
    });

    it('aplica el corte de horario laboral (después de 16:30 o fin de semana salta al sig. día hábil)', () => {
      // Radicación: Viernes 2026-09-04 a las 17:00 (fuera de jornada)
      const fechaRadicacion = new Date(2026, 8, 4, 17, 0, 0);
      const val = validarAnticipacionRadicacion('2026-09-28', FESTIVOS_COLOMBIA_2026, fechaRadicacion);

      expect(val?.radicadoFueraJornada).toBe(true);
      // La fecha efectiva debe ser el siguiente día hábil: Lunes 2026-09-07
      expect(val?.fechaEfectivaRadicacion).toBe('2026-09-07');
    });
  });

  describe('5. Carga de festivos desde Auth con caché', () => {
    it('consulta festivos de la API de Auth y los almacena en caché', async () => {
      const mockApiFestivos = [
        { fecha: '2026-01-01', descripcion: 'Año Nuevo' },
        { fecha: '2026-05-01', descripcion: 'Día del Trabajo' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiFestivos as any);

      const festivos = await obtenerFestivosAuth(2026);
      expect(festivos.has('2026-01-01')).toBe(true);
      expect(festivos.has('2026-05-01')).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/api/v1/ajustes-generales/festivos', {
        year: '2026',
      });

      // La segunda llamada inmediata debe resolver desde la memoria sin otra llamada HTTP
      const festivosSegundaLlamada = await obtenerFestivosAuth(2026);
      expect(festivosSegundaLlamada).toBe(festivos);
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('maneja fallos de red sin lanzar excepción y devuelve un conjunto seguro', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));
      const festivos = await obtenerFestivosAuth(2026);
      expect(festivos).toBeInstanceOf(Set);
      expect(festivos.size).toBe(0);
    });
  });
});
