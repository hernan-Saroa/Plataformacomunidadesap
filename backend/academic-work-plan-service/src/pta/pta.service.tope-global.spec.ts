import { BadRequestException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('PtaService - tope global dinamico del PTA', () => {
  const service = Object.create(PtaService.prototype) as any;

  it('permite distribuir exactamente las 720h del docente', () => {
    expect(() => service.validateGlobalPtaHours(720, 720)).not.toThrow();
  });

  it('permite un PTA incompleto sin superar la bolsa', () => {
    expect(() => service.validateGlobalPtaHours(606, 720)).not.toThrow();
  });

  it('bloquea cualquier hora por encima de la bolsa dinamica', () => {
    expect(() => service.validateGlobalPtaHours(721, 720))
      .toThrow(BadRequestException);
    expect(() => service.validateGlobalPtaHours(721, 720))
      .toThrow(/721h \/ 720h/);
  });

  it('no depende de bolsas fijas de 720h u 800h', () => {
    expect(() => service.validateGlobalPtaHours(635, 635)).not.toThrow();
    expect(() => service.validateGlobalPtaHours(636, 635))
      .toThrow(/Redistribuya 1h/);
  });

  it('bloquea docencia adicional sobre una actividad que ya consume el 100%', () => {
    // Ejemplo: actividad exclusiva de 720h + una asignatura de 144h.
    expect(() => service.validateGlobalPtaHours(864, 720))
      .toThrow(/Redistribuya 144h/);
  });

  it('mantiene intactos los topes dinamicos 50%, 25% y 25% de los otros componentes', () => {
    const rules = {
      max_pct_investigacion: 50,
      max_horas_investigacion_global: 400,
      max_pct_extension: 25,
      max_horas_extension_global: 200,
      max_pct_complementarias: 25,
      max_horas_complementarias_global: 200,
    };

    expect(service.getScaledRuleLimit(
      rules, 720, 'max_pct_investigacion', 50, 'max_horas_investigacion_global', 400,
    )).toBe(360);
    expect(service.getScaledRuleLimit(
      rules, 720, 'max_pct_extension', 25, 'max_horas_extension_global', 200,
    )).toBe(180);
    expect(service.getScaledRuleLimit(
      rules, 720, 'max_pct_complementarias', 25, 'max_horas_complementarias_global', 200,
    )).toBe(180);
  });
});
