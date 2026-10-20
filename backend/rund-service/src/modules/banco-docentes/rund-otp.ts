import { createHmac, timingSafeEqual } from 'crypto';

/**
 * El código OTP de autogestión no se guarda en claro: se almacena un HMAC-SHA256 ligado a la invitación
 * (la columna es text, sin migración). Una filtración de la base no revela códigos vigentes ni sirve en otra invitación.
 */
const HASH = /^[a-f0-9]{64}$/;
const secret = () => String(process.env.RUND_OTP_SECRET || process.env.JWT_SECRET || '');

export function hashOtp(invitacionId: string, otp: string): string {
  const key = secret();
  if (!key) throw new Error('Falta JWT_SECRET (o RUND_OTP_SECRET) para proteger los códigos OTP.');
  return createHmac('sha256', key).update(`${invitacionId}:${String(otp)}`).digest('hex');
}

const equal = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Compara en tiempo constante. Un código emitido antes de este cambio (texto plano, vigente ≤10 min) sigue siendo válido. */
export function otpMatches(stored: string | null | undefined, invitacionId: string, otp: string): boolean {
  if (!stored) return false;
  return HASH.test(stored) ? equal(stored, hashOtp(invitacionId, otp)) : equal(stored, String(otp));
}
