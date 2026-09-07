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
): ResultadoInforme {
  const ganadora = oferentes.find((o) => o.id === resultado.oferenteId);

  if (!ganadora) {
    throw new ConflictException(
      'La oferta ganadora ya no está en la lista del proceso: revisa el resultado de la evaluación',
    );
  }

  return {
    modalidad,
    resultadoId: resultado.id,
    ganadora: {
      oferenteId: ganadora.id,
      nombre: ganadora.nombre,
      identificacion: ganadora.identificacion,
    },
    puntajeObtenido: resultado.puntajeObtenido != null ? Number(resultado.puntajeObtenido) : null,
    puntajeMaximo: resultado.puntajeMaximo != null ? Number(resultado.puntajeMaximo) : null,
    valorEvaluado: resultado.valorEvaluado != null ? Number(resultado.valorEvaluado) : null,
    justificacion: resultado.justificacion,
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
      ganadora: o.id === ganadora.id,
    })),
  };
}
