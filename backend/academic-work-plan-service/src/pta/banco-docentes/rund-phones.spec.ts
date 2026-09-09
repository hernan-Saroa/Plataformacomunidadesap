import { normalizeRundPhones, recoverOriginalRundPhone } from './rund-phones';
import { normalizePhoneForAuth } from './banco-docentes.service';

describe('Contactos RUND sin concatenar ni truncar', () => {
  it.each([
    ['3106791787 - 6723168', '3106791787 - 6723168'],
    ['3106791787-3001234567', '3106791787 - 3001234567'],
    ['3106791787 / 3001234567; 6723168', '3106791787 - 3001234567 - 6723168'],
    ['3106791787\u20133001234567', '3106791787 - 3001234567'],
    ['+57 (310) 6791787 - +57 3001234567', '+573106791787 - +573001234567'],
    ['310-679-1787', '3106791787'],
    ['601-1234567', '6011234567'],
    ['3106791787 3001234567', '3106791787 - 3001234567'],
    ['06723168', '06723168'],
    ['3106791787\n6723168', '3106791787 - 6723168'],
    ['3106791787\r\n6723168', '3106791787 - 6723168'],
  ])('conserva todos los numeros: %s', (raw, expected) => {
    expect(normalizeRundPhones(raw)).toBe(expected);
    expect(normalizePhoneForAuth(raw)).toBe(expected);
  });
  it.each(['31067917876723168', '3106791787 - 123', '3106791787 - ', '3106791787 - - 6723168', '310ABC1787', '3106791787 / / 6723168', '+57+3106791787', '1'.repeat(256)])('rechaza datos ambiguos o incompletos: %s', raw => {
    expect(normalizeRundPhones(raw)).toBeNull();
    expect(() => normalizePhoneForAuth(raw)).toThrow();
  });
  it('conserva extensiones y notas del archivo sin mezclarlas con el numero', () => {
    expect(normalizePhoneForAuth('Popayan 1234567 Ext. 123', true)).toBe('Popayan 1234567 Ext. 123');
    expect(() => normalizePhoneForAuth('1'.repeat(256), true)).toThrow();
  });
  it('permite dejar el contacto opcional vacio', () => {
    expect(normalizePhoneForAuth('')).toBeNull();
  });
  it('recupera solo la concatenacion o perdida comprobada con el original', () => {
    expect(recoverOriginalRundPhone('31067917876723168', '3106791787 - 6723168')).toBe('3106791787 - 6723168');
    expect(recoverOriginalRundPhone('31067917873001234567', '3106791787 - 3001234567')).toBe('3106791787 - 3001234567');
    expect(recoverOriginalRundPhone('3106791787', '3106791787 / 3001234567')).toBe('3106791787 - 3001234567');
    expect(recoverOriginalRundPhone('3009999999', '3106791787 - 6723168')).toBeNull();
    expect(recoverOriginalRundPhone('3106791787 - 6723168', '3106791787 - 6723168')).toBeNull();
    expect(recoverOriginalRundPhone('31067917876723168', null)).toBeNull();
  });
});
