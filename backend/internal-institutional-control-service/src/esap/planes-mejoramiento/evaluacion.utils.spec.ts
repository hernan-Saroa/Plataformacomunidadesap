/**
 * Tests para las fórmulas de evaluación de Planes de Mejoramiento.
 * Cubre CA-S2 (cumplimiento), CA-S3/CA-S4 (efectividad), y funciones auxiliares.
 *
 * Fuente normativa: EM-FO-002 v3 (spec §6).
 */
import {
  calcularCumplimiento,
  calcularEfectividad,
  calcularPuntaje,
  etiquetaCumplimiento,
  etiquetaEfectividad,
  colorSemaforo,
} from './evaluacion.utils';

describe('evaluacion.utils — Fórmulas EM-FO-002', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // CA-S2: Cumplimiento calculado (2/1/0)
  // ═══════════════════════════════════════════════════════════════════════

  describe('calcularCumplimiento', () => {
    it('retorna 2 (Cumple) cuando implementadas >= programadas', () => {
      expect(calcularCumplimiento(10, 10)).toBe(2);
      expect(calcularCumplimiento(15, 10)).toBe(2); // más de lo programado
    });

    it('retorna 1 (Parcial) cuando implementadas > 0 pero < programadas', () => {
      expect(calcularCumplimiento(1, 10)).toBe(1);
      expect(calcularCumplimiento(5, 10)).toBe(1);
      expect(calcularCumplimiento(9, 10)).toBe(1);
    });

    it('retorna 0 (No cumple) cuando implementadas = 0', () => {
      expect(calcularCumplimiento(0, 10)).toBe(0);
      expect(calcularCumplimiento(0, 1)).toBe(0);
    });

    it('retorna 0 cuando programadas <= 0 (borde)', () => {
      expect(calcularCumplimiento(0, 0)).toBe(0);
      expect(calcularCumplimiento(5, 0)).toBe(0);
      expect(calcularCumplimiento(0, -1)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CA-S3: Efectividad con dos criterios SI/NO
  // ═══════════════════════════════════════════════════════════════════════

  describe('calcularEfectividad', () => {
    it('retorna 2 (Efectiva) cuando ambos criterios son SI', () => {
      expect(calcularEfectividad(true, true)).toBe(2);
    });

    it('retorna 1 (Parcial) cuando solo un criterio es SI', () => {
      expect(calcularEfectividad(true, false)).toBe(1);
      expect(calcularEfectividad(false, true)).toBe(1);
    });

    it('retorna 0 (Inefectiva) cuando ambos criterios son NO', () => {
      expect(calcularEfectividad(false, false)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Puntaje ponderado
  // ═══════════════════════════════════════════════════════════════════════

  describe('calcularPuntaje', () => {
    it('calcula puntaje con ponderación por defecto (1)', () => {
      expect(calcularPuntaje(2)).toBe(2);
      expect(calcularPuntaje(1)).toBe(1);
      expect(calcularPuntaje(0)).toBe(0);
    });

    it('calcula puntaje con ponderación personalizada', () => {
      expect(calcularPuntaje(2, 0.5)).toBe(1);
      expect(calcularPuntaje(2, 2)).toBe(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Etiquetas legibles
  // ═══════════════════════════════════════════════════════════════════════

  describe('etiquetaCumplimiento', () => {
    it('mapea correctamente los niveles a etiquetas', () => {
      expect(etiquetaCumplimiento(2)).toBe('Cumple');
      expect(etiquetaCumplimiento(1)).toBe('Cumple parcialmente');
      expect(etiquetaCumplimiento(0)).toBe('No cumple');
    });
  });

  describe('etiquetaEfectividad', () => {
    it('mapea correctamente los niveles a etiquetas', () => {
      expect(etiquetaEfectividad(2)).toBe('Efectiva');
      expect(etiquetaEfectividad(1)).toBe('Parcialmente efectiva');
      expect(etiquetaEfectividad(0)).toBe('Inefectiva');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CA-S4: Semáforo de cumplimiento global
  // ═══════════════════════════════════════════════════════════════════════

  describe('colorSemaforo', () => {
    it('retorna verde cuando >= 80%', () => {
      expect(colorSemaforo(80)).toBe('verde');
      expect(colorSemaforo(100)).toBe('verde');
      expect(colorSemaforo(95)).toBe('verde');
    });

    it('retorna amarillo cuando >= 50% y < 80%', () => {
      expect(colorSemaforo(50)).toBe('amarillo');
      expect(colorSemaforo(79)).toBe('amarillo');
      expect(colorSemaforo(65)).toBe('amarillo');
    });

    it('retorna rojo cuando < 50%', () => {
      expect(colorSemaforo(0)).toBe('rojo');
      expect(colorSemaforo(49)).toBe('rojo');
      expect(colorSemaforo(25)).toBe('rojo');
    });
  });
});
