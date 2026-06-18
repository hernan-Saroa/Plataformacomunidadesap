import { BadRequestException } from '@nestjs/common';
import {
  normalizeAndValidateGraduateManagementUpdate,
  normalizeAndValidateGraduateReviewPayload,
  normalizeReviewNotes,
} from './graduation-review-validation';

const validPayload = {
  reviewNotes: 'Revision documental completa',
  fullName: "Ana María O'Connor",
  idNumber: 'AB12345',
  email: 'ana@example.com',
  numRegistro: '12345678901234567890',
  numFolio: '1234567890',
  numLibro: '9876543210',
};

describe('graduation review validation', () => {
  it('normalizes surrounding whitespace and accepts the documented limits', () => {
    expect(normalizeReviewNotes('  Revision valida  ')).toBe(
      'Revision valida',
    );

    expect(
      normalizeAndValidateGraduateReviewPayload({
        ...validPayload,
        fullName: '  Ana   María  ',
        email: '  ana@example.com ',
      }),
    ).toMatchObject({
      fullName: 'Ana María',
      email: 'ana@example.com',
      idNumber: 'AB12345',
      numRegistro: '12345678901234567890',
    });
  });

  it.each([
    ['nombre con numeros', { fullName: 'Ana 123' }],
    ['documento con caracteres especiales', { idNumber: 'AB-12345' }],
    ['email invalido', { email: 'correo-invalido' }],
    ['registro mayor a 20 digitos', { numRegistro: '1'.repeat(21) }],
    ['folio mayor a 10 digitos', { numFolio: '1'.repeat(11) }],
    ['libro con letras', { numLibro: 'LIBRO1' }],
  ])('rejects %s', (_caseName, changes) => {
    expect(() =>
      normalizeAndValidateGraduateReviewPayload({
        ...validPayload,
        ...changes,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects review notes outside 10 to 4000 characters', () => {
    expect(() => normalizeReviewNotes('corta')).toThrow(BadRequestException);
    expect(() => normalizeReviewNotes('x'.repeat(4001))).toThrow(
      BadRequestException,
    );
  });

  it('validates graduate management fields when registry fields are omitted from a partial update', () => {
    expect(
      normalizeAndValidateGraduateManagementUpdate(
        {
          firstName: ' Ana ',
          lastName: ' María ',
          idNumber: 'AB12345',
          email: ' ana@example.com ',
        },
        {},
      ),
    ).toMatchObject({
      fullName: 'Ana María',
      firstName: 'Ana',
      lastName: 'María',
      idNumber: 'AB12345',
      email: 'ana@example.com',
    });
  });

  it.each([
    ['nombre completo corto', { firstName: 'A', lastName: 'B' }],
    ['nombre con punto', { firstName: 'Ana.', lastName: 'María' }],
    ['documento con guion', { idNumber: 'AB-12345' }],
    ['correo corto', { email: 'a@b' }],
    ['registro vacio', { numRegistro: '' }],
    ['registro con letras', { numRegistro: 'REG1' }],
    ['folio vacio', { numFolio: '' }],
    ['folio mayor a 10 digitos', { numFolio: '1'.repeat(11) }],
    ['libro vacio', { numLibro: '' }],
  ])('rejects invalid management field: %s', (_caseName, changes) => {
    expect(() =>
      normalizeAndValidateGraduateManagementUpdate(
        changes,
        {
          firstName: 'Ana',
          lastName: 'María',
          fullName: 'Ana María',
          idNumber: 'AB12345',
          email: 'ana@example.com',
        },
      ),
    ).toThrow(BadRequestException);
  });
});
