import { HorasPtaCalculator } from '../../horas-pta.calculator';

describe('HorasPtaCalculator', () => {
  it('debe retornar 384 horas para la excepción seminario_enfasis', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 3, tipoExcepcion: 'seminario_enfasis', horasFijasPta: null },
      { horasBasePorCredito: 16, horasPregradoCentral: null }
    );
    expect(result).toBe(384);
  });

  it('debe retornar 20 horas para la excepción opciones_grado_ap', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 2, tipoExcepcion: 'opciones_grado_ap', horasFijasPta: null },
      { horasBasePorCredito: 16, horasPregradoCentral: null }
    );
    expect(result).toBe(20);
  });

  it('debe retornar 144 horas para la excepción seminario_opciones_apt', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 4, tipoExcepcion: 'seminario_opciones_apt', horasFijasPta: null },
      { horasBasePorCredito: 16, horasPregradoCentral: null }
    );
    expect(result).toBe(144);
  });

  it('debe calcular las horas para programas de pregrado central con horas clase fijas', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 4, tipoExcepcion: null, horasFijasPta: null },
      { horasBasePorCredito: 16, horasPregradoCentral: 64 }
    );
    expect(result).toBe(192); // 64 * 3 = 192
  });

  it('debe calcular las horas según créditos y factor base del programa para pregrados generales (APT)', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 3, tipoExcepcion: null, horasFijasPta: null },
      { horasBasePorCredito: 16, horasPregradoCentral: null }
    );
    expect(result).toBe(144); // 3 * 16 * 3 = 144
  });

  it('debe calcular las horas según créditos y factor base de maestría', () => {
    const result = HorasPtaCalculator.calcularHorasPTA(
      { creditos: 4, tipoExcepcion: null, horasFijasPta: null },
      { horasBasePorCredito: 12, horasPregradoCentral: null }
    );
    expect(result).toBe(144); // 4 * 12 * 3 = 144
  });
});
