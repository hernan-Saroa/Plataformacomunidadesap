import { BadRequestException, NotImplementedException } from '@nestjs/common';
import { createHash } from 'crypto';

import { firmaSimulada } from './configuracion.js';

export type RolFirma = 'docente' | 'revisor' | 'aprobador';

/** Huella (sha256) de lo que se firma: la foto de la docencia, en JSON canónico. */
export function huellaDe(documento: unknown): string {
  return createHash('sha256').update(canonico(documento)).digest('hex');
}

function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort()
      .map((k) => `${JSON.stringify(k)}:${canonico((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Contexto del OTP, el mismo formato que usará auth-service con la firma real. */
export function contextoFirma(idConcertacion: string, huella: string, rol: RolFirma): string {
  return `prog-docencia:${idConcertacion}:${huella}:${rol}`;
}

/**
 * Verifica el código de firma. Hoy SIMULADO (decisión de Tomás): cualquier
 * código de 6 dígitos pasa, como en el PTA. Lo que no se simula es el registro:
 * quien llama guarda la firma en `concertacion_firma`.
 *
 * Con la simulación apagada, la firma real todavía no existe: se rechaza con 501
 * en vez de dejar pasar sin verificar.
 */
export function verificarCodigo(codigo: unknown): 'simulado' {
  if (!/^\d{6}$/.test(String(codigo ?? '').trim())) {
    throw new BadRequestException('El código de firma debe tener 6 dígitos.');
  }
  if (!firmaSimulada()) {
    throw new NotImplementedException(
      'La firma real con OTP de auth-service aún no está habilitada para la concertación.',
    );
  }
  return 'simulado';
}
