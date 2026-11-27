import {
  calcularAvancePorFasePhva,
  calcularCumplimientoPlan,
  calcularPesosAcciones,
  determinarEstadoPlanPorCumplimiento,
  etiquetaFasePhva,
  normalizarEstadoAccion,
  normalizarFasePhva,
} from './planes-mejoramiento-phva.util';

describe('planes-mejoramiento-phva.util', () => {
  describe('normalizarFasePhva y etiquetaFasePhva', () => {
    it('acepta las 4 fases del ciclo PHVA sin importar mayúsculas o espacios', () => {
      expect(normalizarFasePhva('Planear')).toBe('PLANEAR');
      expect(normalizarFasePhva(' hacer ')).toBe('HACER');
      expect(normalizarFasePhva('VERIFICAR')).toBe('VERIFICAR');
      expect(normalizarFasePhva('Actuar')).toBe('ACTUAR');
      expect(etiquetaFasePhva('PLANEAR')).toBe('Planear');
      expect(etiquetaFasePhva('ACTUAR')).toBe('Actuar');
    });

    it('retorna null para valores vacíos o inválidos', () => {
      expect(normalizarFasePhva('')).toBeNull();
      expect(normalizarFasePhva(null)).toBeNull();
      expect(normalizarFasePhva('EJECUTAR')).toBeNull();
    });
  });

  describe('calcularPesosAcciones', () => {
    it('retorna arreglo vacío si cantidad <= 0', () => {
      expect(calcularPesosAcciones(0)).toEqual([]);
      expect(calcularPesosAcciones(-2)).toEqual([]);
    });

    it('asigna pesos exactos cuando 100 es divisible entre N', () => {
      expect(calcularPesosAcciones(1)).toEqual([100]);
      expect(calcularPesosAcciones(2)).toEqual([50, 50]);
      expect(calcularPesosAcciones(4)).toEqual([25, 25, 25, 25]);
      expect(calcularPesosAcciones(5)).toEqual([20, 20, 20, 20, 20]);
    });

    it('ajusta decimales en la última acción para que la suma sea exactamente 100%', () => {
      const pesos3 = calcularPesosAcciones(3);
      expect(pesos3).toEqual([33.33, 33.33, 33.34]);
      expect(pesos3.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);

      const pesos6 = calcularPesosAcciones(6);
      expect(pesos6).toEqual([16.66, 16.66, 16.66, 16.66, 16.66, 16.7]);
      expect(Math.round(pesos6.reduce((a, b) => a + b, 0) * 100)).toBe(10000);

      const pesos7 = calcularPesosAcciones(7);
      expect(pesos7).toEqual([14.28, 14.28, 14.28, 14.28, 14.28, 14.28, 14.32]);
      expect(Math.round(pesos7.reduce((a, b) => a + b, 0) * 100)).toBe(10000);
    });
  });

  describe('calcularCumplimientoPlan', () => {
    it('suma el peso de las acciones ejecutadas y alcanza 100% cuando todas están ejecutadas', () => {
      const acciones = [
        { pesoPorcentual: 33.33, estado: 'EJECUTADA' },
        { pesoPorcentual: 33.33, estado: 'PENDIENTE' },
        { pesoPorcentual: 33.34, estado: 'PENDIENTE' },
      ];
      expect(calcularCumplimientoPlan(acciones)).toEqual({
        porcentaje: 33.33,
        todasEjecutadas: false,
        ejecutadas: 1,
        total: 3,
      });

      const todas = acciones.map((a) => ({ ...a, estado: 'EJECUTADA' }));
      expect(calcularCumplimientoPlan(todas)).toEqual({
        porcentaje: 100,
        todasEjecutadas: true,
        ejecutadas: 3,
        total: 3,
      });
    });

    it('soporta registros legados basados en porcentajeAvance >= 100', () => {
      expect(normalizarEstadoAccion(undefined, 100)).toBe('EJECUTADA');
      expect(normalizarEstadoAccion(undefined, 40)).toBe('PENDIENTE');
    });
  });

  describe('calcularAvancePorFasePhva', () => {
    it('calcula totales y avance por cada fase PHVA', () => {
      const resumen = calcularAvancePorFasePhva([
        { fasePhva: 'PLANEAR', pesoPorcentual: 25, estado: 'EJECUTADA' },
        { fasePhva: 'PLANEAR', pesoPorcentual: 25, estado: 'PENDIENTE' },
        { fasePhva: 'HACER', pesoPorcentual: 25, estado: 'EJECUTADA' },
        { fasePhva: 'VERIFICAR', pesoPorcentual: 25, estado: 'PENDIENTE' },
      ]);

      expect(resumen.PLANEAR).toMatchObject({ total: 2, ejecutadas: 1, porcentajeAvance: 50 });
      expect(resumen.HACER).toMatchObject({ total: 1, ejecutadas: 1, porcentajeAvance: 100 });
      expect(resumen.VERIFICAR).toMatchObject({ total: 1, ejecutadas: 0, porcentajeAvance: 0 });
      expect(resumen.ACTUAR).toMatchObject({ total: 0, ejecutadas: 0, porcentajeAvance: 0 });
    });
  });

  describe('determinarEstadoPlanPorCumplimiento', () => {
    it('cambia el plan a CERRADO al llegar a 100% y lo reabre a EN_EJECUCION si baja', () => {
      expect(
        determinarEstadoPlanPorCumplimiento('EN_EJECUCION', {
          porcentaje: 100,
          todasEjecutadas: true,
          ejecutadas: 3,
          total: 3,
        }),
      ).toBe('CERRADO');

      expect(
        determinarEstadoPlanPorCumplimiento('CERRADO', {
          porcentaje: 66.66,
          todasEjecutadas: false,
          ejecutadas: 2,
          total: 3,
        }),
      ).toBe('EN_EJECUCION');
    });
  });
});
