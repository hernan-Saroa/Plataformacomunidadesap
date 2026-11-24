/**
 * RUND-013 — Validación inmediata de los datos de contacto del cabezote.
 *
 * Es solo una ayuda para no viajar al servidor con un dato evidentemente
 * inválido: la validación que manda es la del backend
 * (`backend/academic-work-plan-service/src/pta/banco-docentes/rund-contacto.ts`),
 * cuyo mensaje se muestra tal cual si el servidor lo rechaza.
 */
import type { CabezoteContactoClave } from './rundPerfilCabezote';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const DOMINIO_INSTITUCIONAL = '@esap.edu.co';

export const CONTACTO_ERRORES = {
  institucionalVacio: 'El correo institucional es obligatorio.',
  institucional: `El correo institucional debe tener un formato válido y terminar en ${DOMINIO_INSTITUCIONAL}.`,
  personal: 'El correo personal no tiene un formato válido.',
  telefono: 'El teléfono debe tener entre 7 y 15 dígitos por número; puede indicar varios separados por coma o guion.',
} as const;

/** Devuelve el mensaje de error o `null` si el dato puede enviarse. */
export function validarContactoCabezote(clave: CabezoteContactoClave, valor: string): string | null {
  const texto = (valor || '').trim();
  if (clave === 'TELEFONO') {
    if (!texto) return null;
    const soloCaracteresValidos = /^[\d+\s().,;/\-‐-―−]+$/.test(texto);
    const hayDigitos = /\d{7}/.test(texto.replace(/[\s().-]/g, ''));
    return soloCaracteresValidos && hayDigitos ? null : CONTACTO_ERRORES.telefono;
  }
  if (clave === 'CORREO_INSTITUCIONAL') {
    if (!texto) return CONTACTO_ERRORES.institucionalVacio;
    return EMAIL.test(texto) && texto.toLowerCase().endsWith(DOMINIO_INSTITUCIONAL) ? null : CONTACTO_ERRORES.institucional;
  }
  if (!texto) return null;
  return EMAIL.test(texto) ? null : CONTACTO_ERRORES.personal;
}
