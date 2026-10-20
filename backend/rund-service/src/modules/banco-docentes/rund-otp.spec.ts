import { hashOtp, otpMatches } from './rund-otp';

const original = { ...process.env };
beforeEach(() => { process.env.JWT_SECRET = 'secreto-de-prueba-0123456789'; delete process.env.RUND_OTP_SECRET; });
afterEach(() => { process.env = { ...original }; });

describe('Código OTP de autogestión protegido', () => {
  it('guarda un HMAC de 64 hex, nunca el código, y es determinista por invitación', () => {
    const h = hashOtp('inv-1', '123456');
    expect(h).toMatch(/^[a-f0-9]{64}$/); expect(h).not.toContain('123456');
    expect(hashOtp('inv-1', '123456')).toBe(h);
  });
  it('el mismo código en otra invitación produce otro valor', () => {
    expect(hashOtp('inv-1', '123456')).not.toBe(hashOtp('inv-2', '123456'));
  });
  it('depende del secreto del servicio (RUND_OTP_SECRET tiene prioridad)', () => {
    const a = hashOtp('inv-1', '123456'); process.env.RUND_OTP_SECRET = 'otro-secreto-distinto-9876543210';
    expect(hashOtp('inv-1', '123456')).not.toBe(a);
  });
  it('sin secreto configurado falla en lugar de proteger con una clave vacía', () => {
    delete process.env.JWT_SECRET; expect(() => hashOtp('inv-1', '123456')).toThrow(/JWT_SECRET/);
  });
  it('valida el código correcto y rechaza uno incorrecto, vacío o de otra invitación', () => {
    const stored = hashOtp('inv-1', '123456');
    expect(otpMatches(stored, 'inv-1', '123456')).toBe(true);
    expect(otpMatches(stored, 'inv-1', '123457')).toBe(false);
    expect(otpMatches(stored, 'inv-2', '123456')).toBe(false);
    expect(otpMatches(stored, 'inv-1', '')).toBe(false);
    expect(otpMatches(null, 'inv-1', '123456')).toBe(false); expect(otpMatches(undefined, 'inv-1', '123456')).toBe(false); expect(otpMatches('', 'inv-1', '')).toBe(false);
  });
  it('un código emitido antes del cambio (texto plano) sigue siendo válido durante su vigencia', () => {
    expect(otpMatches('654321', 'inv-1', '654321')).toBe(true); expect(otpMatches('654321', 'inv-1', '654322')).toBe(false);
  });
  it('acepta el código como número o texto', () => {
    expect(otpMatches(hashOtp('inv-1', '000123'), 'inv-1', '000123' as any)).toBe(true);
  });
});
