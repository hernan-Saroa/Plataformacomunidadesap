import { BadRequestException } from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';

describe('GraduationCertificatesService bulk numeric controls', () => {
  const graduateRepository = {
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const service = new GraduationCertificatesService(
    graduateRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as any;

  const validPayload = {
    fullName: 'Persona Graduada',
    idNumber: '1234567',
    programName: 'Programa de prueba',
    graduationDate: '2020-01-01',
    campus: 'Sede principal',
    seccionalName: 'Territorial central',
    numRegistro: '12345678901234567890',
    numFolio: '1234567890',
    numLibro: '9876543210',
  };

  it('acepta en carga masiva los mismos límites del formulario de revisión', async () => {
    const result = await service.buildGraduateCreateData(validPayload, {
      strictBulk: true,
    });

    expect(result.numRegistro).toBe('12345678901234567890');
    expect(result.numFolio).toBe('1234567890');
    expect(result.numLibro).toBe('9876543210');
  });

  it.each([
    ['REGISTRO vacío', { numRegistro: '' }],
    ['FOLIO vacío', { numFolio: '' }],
    ['LIBRO vacío', { numLibro: '' }],
    ['REGISTRO mayor a 20 dígitos', { numRegistro: '1'.repeat(21) }],
    ['FOLIO mayor a 10 dígitos', { numFolio: '1'.repeat(11) }],
    ['LIBRO mayor a 10 dígitos', { numLibro: '1'.repeat(11) }],
  ])('rechaza %s', async (_caseName, changes) => {
    await expect(
      service.buildGraduateCreateData(
        { ...validPayload, ...changes },
        { strictBulk: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
