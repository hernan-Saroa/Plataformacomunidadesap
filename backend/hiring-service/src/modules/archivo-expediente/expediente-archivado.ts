import { ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Documento } from '../../entities/documento.entity';
import { EntradaIndice, Expediente, IndiceDocumental } from '../../entities/expediente.entity';

/**
 * Lo que falta para poder archivar el expediente.
 *
 * Devuelve la lista en el orden en que hay que resolverla, no un booleano: al
 * Archivo de Gestión le sirve saber qué le falta, y un «no se puede» seco lo
 * obligaría a adivinar.
 *
 * **La regla es más estricta que la historia.** El criterio de aceptación dice
 * «dado un contrato liquidado», pero la matriz pone el cierre (10.3) antes del
 * archivo (10.4), y archivar con el saldo del RP sin liberar dejaría plata
 * amarrada a un contrato que ya nadie va a mirar. Criterio del equipo, no de la
 * fuente.
 *
 * Función pura para poder probarla sin base de datos.
 */
export function pendientesParaArchivar(estado: {
  actaVigente: boolean;
  publicadaEnSecop: boolean;
  cierreVigente: boolean;
}): string[] {
  const pendientes: string[] = [];

  if (!estado.actaVigente) {
    pendientes.push('el contrato todavía no tiene acta de liquidación vigente (10.2)');
  } else if (!estado.publicadaEnSecop) {
    // Solo tiene sentido pedir la publicación cuando hay acta que publicar.
    pendientes.push('el acta de liquidación no se ha publicado en SECOP II');
  }

  if (!estado.cierreVigente) {
    pendientes.push('el contrato no tiene cierre financiero vigente (10.3)');
  }

  return pendientes;
}

/**
 * Un expediente archivado no recibe documentos.
 *
 * Es la custodia de la que habla la matriz de roles: el expediente ya se
 * declaró completo ante entes de control, y agregarle o quitarle algo después
 * dejaría al índice congelado mintiendo. Para volver a moverlo hay que
 * reabrirlo con motivo, y eso queda en trazabilidad.
 */
export async function exigirExpedienteAbierto(em: EntityManager, procesoId: string) {
  const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });

  if (expediente?.estado === 'ARCHIVADO') {
    throw new ConflictException(
      'El expediente está archivado: reábrelo si necesitas modificar sus documentos',
    );
  }

  return expediente ?? null;
}

/**
 * El índice de lo que el expediente contiene ahora mismo.
 *
 * Lleva el hash de cada documento y no solo el nombre: un documento sustituido
 * conserva el nombre y cambia el hash, y el índice está para notar exactamente
 * eso.
 */
export async function construirIndice(
  em: EntityManager,
  expedienteId: string,
): Promise<IndiceDocumental> {
  const documentos = await em.getRepository(Documento).find({
    where: { expedienteId },
    order: { createdAt: 'ASC' },
  });

  return {
    generadoAt: new Date().toISOString(),
    totalDocumentos: documentos.length,
    documentos: documentos.map<EntradaIndice>((d) => ({
      id: d.id,
      nombre: d.archivoNombreOriginal ?? d.nombre,
      numeral: d.numeral ?? null,
      hashSha256: d.hashSha256,
      createdAt: d.createdAt?.toISOString?.() ?? String(d.createdAt),
    })),
  };
}
