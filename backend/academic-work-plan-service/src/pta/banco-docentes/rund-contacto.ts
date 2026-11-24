/**
 * RUND-013 — Edición directa de los datos de contacto desde el cabezote.
 *
 * Reglas puras, sin acceso a base de datos, para poder probarlas aparte:
 *  - Correo institucional: formato válido y dominio @esap.edu.co (misma regla
 *    que la carga y la edición general del perfil).
 *  - Correo personal: formato válido y distinto del institucional; vacío lo borra.
 *  - Teléfono: se normaliza con `normalizeRundPhones`, que admite varios números
 *    separados por coma, punto y coma, barra o guion espaciado ("3183918243 - 6452018").
 */
import { BadRequestException } from '@nestjs/common';
import { normalizeRundPhones, RUND_PHONE_ERROR } from './rund-phones';

export const RUND_CONTACTO_CAMPOS = ['CORREO_INSTITUCIONAL', 'CORREO_ALTERNATIVO', 'TELEFONO'] as const;
export type RundContactoCampo = typeof RUND_CONTACTO_CAMPOS[number];

export const RUND_CONTACTO_DOMINIO = '@esap.edu.co';
export const RUND_CONTACTO_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const RUND_CONTACTO_MENSAJES = {
  campo: 'El dato de contacto indicado no se puede editar. Use correo institucional, correo personal o teléfono.',
  institucionalVacio: 'El correo institucional es obligatorio.',
  institucional: `El correo institucional debe tener un formato válido y terminar en ${RUND_CONTACTO_DOMINIO}.`,
  personal: 'El correo personal no tiene un formato válido.',
  personalIgual: 'El correo personal debe ser diferente del institucional.',
  telefono: RUND_PHONE_ERROR,
} as const;

export function isRundContactoCampo(value: unknown): value is RundContactoCampo {
  return typeof value === 'string' && (RUND_CONTACTO_CAMPOS as readonly string[]).includes(value);
}

function fail(message: string, campo: RundContactoCampo, dato: string, esperado: string): never {
  throw new BadRequestException({ message, columna: campo, datoErrado: dato || '(vacío)', valorEsperado: esperado });
}

/**
 * Devuelve el valor listo para guardar (`null` = borrar el dato) o lanza
 * `BadRequestException` con el mensaje que se muestra en la tarjeta.
 *
 * `otroCorreo` es el correo con el que se compara la regla de "distinto":
 * el institucional vigente cuando se edita el personal, y viceversa.
 */
export function normalizarContacto(
  campo: RundContactoCampo,
  valor: unknown,
  otroCorreo?: string | null,
): string | null {
  const texto = valor === null || valor === undefined ? '' : String(valor).trim();

  if (campo === 'TELEFONO') {
    const normalizado = normalizeRundPhones(texto);
    if (normalizado === null) fail(RUND_CONTACTO_MENSAJES.telefono, campo, texto, RUND_CONTACTO_MENSAJES.telefono);
    return normalizado || null;
  }

  if (campo === 'CORREO_INSTITUCIONAL') {
    if (!texto) fail(RUND_CONTACTO_MENSAJES.institucionalVacio, campo, texto, `usuario${RUND_CONTACTO_DOMINIO}`);
    const correo = texto.toLowerCase();
    if (!RUND_CONTACTO_EMAIL_REGEX.test(correo) || !correo.endsWith(RUND_CONTACTO_DOMINIO)) {
      fail(RUND_CONTACTO_MENSAJES.institucional, campo, texto, `usuario${RUND_CONTACTO_DOMINIO}`);
    }
    if (otroCorreo && otroCorreo.trim().toLowerCase() === correo) {
      fail(RUND_CONTACTO_MENSAJES.personalIgual, campo, texto, 'Un correo diferente del personal');
    }
    return correo;
  }

  if (!texto) return null;
  const correo = texto.toLowerCase();
  if (!RUND_CONTACTO_EMAIL_REGEX.test(correo)) {
    fail(RUND_CONTACTO_MENSAJES.personal, campo, texto, 'correo@dominio.com');
  }
  if (otroCorreo && otroCorreo.trim().toLowerCase() === correo) {
    fail(RUND_CONTACTO_MENSAJES.personalIgual, campo, texto, 'Un correo diferente del institucional');
  }
  return correo;
}
