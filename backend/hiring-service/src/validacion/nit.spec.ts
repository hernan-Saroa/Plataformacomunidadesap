import { digitoVerificacion, problemaDelNit } from './nit';

describe('NIT y dígito de verificación (BUG-003)', () => {
  it('calcula el dígito como la DIAN', () => {
    // NIT de la DIAN (800197268-4) y de la ESAP (899999054-7).
    expect(digitoVerificacion('800197268')).toBe(4);
    expect(digitoVerificacion('899999054')).toBe(7);
    expect(digitoVerificacion('900123456')).toBe(8);
  });

  it('acepta el NIT con guion y su dígito', () => {
    expect(problemaDelNit('800197268-4')).toBeNull();
    expect(problemaDelNit(' 899999054-7 ')).toBeNull();
  });

  it('rechaza un dígito que no corresponde, y dice cuál es', () => {
    expect(problemaDelNit('800197268-5')).toMatch(/debería ser 4/);
  });

  it('rechaza el NIT sin guion, con puntos o demasiado largo', () => {
    expect(problemaDelNit('8001972684')).toMatch(/separado por un guion/);
    expect(problemaDelNit('800.197.268-4')).toMatch(/sin puntos/);
    expect(problemaDelNit('9999999999999999999999999')).toMatch(/a lo sumo 11/);
    expect(problemaDelNit('')).toMatch(/Indica el NIT/);
  });
});
