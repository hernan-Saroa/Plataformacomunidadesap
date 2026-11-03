import { ConflictException } from '@nestjs/common';

import { ResultadoInforme } from '../../entities/informe-evaluacion.entity';
import { ResultadoEvaluacion } from '../../entities/resultado-evaluacion.entity';
import { EvidenciaEvaluacion } from '../../entities/evidencia-evaluacion.entity';
import { Oferente } from '../../entities/oferente.entity';

/**
 * La fotografía del resultado del comité, con todo lo que hace falta para leer
 * un informe sin volver a consultar nada.
 *
 * Función pura y sin acceso a base de datos: quien la llama trae las ofertas y
 * las evidencias. Está aquí y no dentro de un servicio porque **los dos
 * informes la usan** —el preliminar del traslado (EFDS-1463) y el definitivo de
 * la adjudicación (EFDS-1486)—, y la regla que aplican es exactamente la misma:
 * copiar en vez de referenciar, para que lo notificado se lea igual dentro de un
 * año.
 *
 * Lo que cambia entre los dos es **cuál** resultado congelan, no cómo: el
 * preliminar congela el que estaba vigente al trasladar y el definitivo el que
 * está vigente al adjudicar, que pueden ser distintos si el comité rectificó.
 */
export function congelarResultado(
  modalidad: string | null,
  resultado: ResultadoEvaluacion,
  oferentes: Oferente[],
  evidencias: EvidenciaEvaluacion[],
  /**
   * La ganadora, cuando la decide quien congela y no el resultado: el informe
   * definitivo la elige (EFDS-1157). Sin ella se toma la del resultado, que
   * desde la 120 no la trae: la evaluación de la 6.3 es preliminar.
   */
  decision?: { oferenteId: string; valorEvaluado?: number | null; justificacion?: string | null },
): ResultadoInforme {
  const ganadoraId = decision?.oferenteId ?? resultado.oferenteId;
  const ganadora = ganadoraId ? (oferentes.find((o) => o.id === ganadoraId) ?? null) : null;

  if (ganadoraId && !ganadora) {
    throw new ConflictException(
      'La oferta ganadora ya no está en la lista del proceso: revisa el resultado de la evaluación',
    );
  }

  // Si quien decide no corrigió la cifra, el valor es el que la oferta presentó.
  const valorDecidido =
    decision?.valorEvaluado ??
    (ganadora?.valorOfertado != null ? Number(ganadora.valorOfertado) : null);

  return {
    modalidad,
    resultadoId: resultado.id,
    ganadora: ganadora
      ? {
          oferenteId: ganadora.id,
          nombre: ganadora.nombre,
          identificacion: ganadora.identificacion,
        }
      : null,
    puntajeObtenido: resultado.puntajeObtenido != null ? Number(resultado.puntajeObtenido) : null,
    puntajeMaximo: resultado.puntajeMaximo != null ? Number(resultado.puntajeMaximo) : null,
    valorEvaluado: decision
      ? valorDecidido
      : resultado.valorEvaluado != null
        ? Number(resultado.valorEvaluado)
        : null,
    justificacion: decision ? decision.justificacion?.trim() || null : resultado.justificacion,
    informeDocumentoId: resultado.informeDocumentoId,
    evidencias: evidencias.map((e) => ({
      documentoId: e.documentoId,
      descripcion: e.descripcion,
    })),
    ofertas: oferentes.map((o) => ({
      oferenteId: o.id,
      numero: o.numero,
      nombre: o.nombre,
      identificacion: o.identificacion,
      valorOfertado: o.valorOfertado != null ? Number(o.valorOfertado) : null,
      ganadora: !!ganadora && o.id === ganadora.id,
    })),
  };
}
