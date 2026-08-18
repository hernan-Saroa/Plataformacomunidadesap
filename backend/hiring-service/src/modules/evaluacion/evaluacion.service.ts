import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import {
  CriterioEvaluacion,
  DimensionEvaluacion,
  DIMENSION_CALCULADA,
} from '../../entities/criterio-evaluacion.entity';
import { EvaluacionOferta } from '../../entities/evaluacion-oferta.entity';
import { EvaluacionCriterio } from '../../entities/evaluacion-criterio.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ComiteService } from '../comite/comite.service';
import { consolidar, CriterioAplicable, puntajeMaximoDe } from './consolidacion';
import { EvaluarOfertaDto, ResultadoCriterioDto } from './dto/evaluacion.dto';

/** Actividad 6.3 de la matriz: la evaluación de las ofertas. */
export const NUMERAL_EVALUACION = '6.3';

/** Las dimensiones que califica una persona; la económica se calcula. */
const DIMENSIONES_MANUALES: DimensionEvaluacion[] = ['JURIDICO', 'FINANCIERO', 'TECNICO'];

@Injectable()
export class EvaluacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly comite: ComiteService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_EVALUACION, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const criterios = await this.criteriosDe(proceso.modalidad);
    const { recepcionCerrada, oferentes } = await this.ofertasPublicadas(
      this.dataSource.manager,
      procesoId,
    );

    const misDimensiones = await this.comite.dimensionesDe(procesoId, acceso);
    const comiteDesignado = (await this.comite.estado(procesoId, acceso)).designado;

    const evaluaciones = await this.evaluacionesDe(oferentes.map((o) => o.id));

    // La consolidación se calcula al consultar y no se guarda: corregir una
    // evaluación tiene que reflejarse sin rehacer nada, y un resultado
    // congelado se desincronizaría del juicio que lo sustenta.
    const aplicables: CriterioAplicable[] = criterios.map((c) => ({
      id: c.id,
      dimension: c.dimension,
      tipo: c.tipo,
      nombre: c.nombre,
      puntajeMaximo: c.puntajeMaximo != null ? Number(c.puntajeMaximo) : null,
    }));

    const consolidado = consolidar(
      oferentes.map((oferta) => ({
        id: oferta.id,
        valorOfertado: oferta.valorOfertado != null ? Number(oferta.valorOfertado) : null,
        evaluaciones: (evaluaciones.get(oferta.id) ?? []).map((e) => ({
          dimension: e.evaluacion.dimension,
          resultados: e.resultados.map((r) => ({
            criterioId: r.criterioId,
            cumple: r.cumple,
            puntaje: r.puntaje != null ? Number(r.puntaje) : null,
            observacion: r.observacion,
          })),
        })),
      })),
      aplicables,
    );

    const porOferta = new Map(consolidado.map((c) => [c.ofertaId, c]));

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      recepcionCerrada,
      comiteDesignado,
      // Las dimensiones en las que este usuario puede calificar, ya cruzadas
      // con las que se registran a mano: la económica no la llena nadie.
      misDimensiones: misDimensiones.filter((d) => DIMENSIONES_MANUALES.includes(d)),
      puedeEvaluar: !excluida && recepcionCerrada && comiteDesignado && misDimensiones.length > 0,
      // Los criterios sin confirmar se marcan para que la pantalla no los
      // presente como regla establecida.
      criteriosSinConfirmar: criterios.some((c) => !c.confirmado),
      puntajeMaximo: puntajeMaximoDe(aplicables),
      criterios: criterios.map((c) => ({
        id: c.id,
        dimension: c.dimension,
        tipo: c.tipo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        puntajeMaximo: c.puntajeMaximo != null ? Number(c.puntajeMaximo) : null,
        confirmado: c.confirmado,
      })),
      ofertas: oferentes.map((oferta) => ({
        id: oferta.id,
        numero: oferta.numero,
        nombre: oferta.nombre,
        identificacion: oferta.identificacion,
        valorOfertado: oferta.valorOfertado != null ? Number(oferta.valorOfertado) : null,
        // Habilitada, no habilitada o pendiente, con el criterio que la dejó
        // fuera y el puntaje por dimensión.
        consolidado: porOferta.get(oferta.id) ?? null,
        evaluaciones: (evaluaciones.get(oferta.id) ?? []).map((e) => ({
          dimension: e.evaluacion.dimension,
          evaluadaPor: e.evaluacion.evaluadaPor,
          evaluadaAt: e.evaluacion.updatedAt,
          resultados: e.resultados.map((r) => ({
            criterioId: r.criterioId,
            cumple: r.cumple,
            puntaje: r.puntaje != null ? Number(r.puntaje) : null,
            observacion: r.observacion,
          })),
        })),
      })),
    };
  }

  // ------------------------------------------------------------ evaluación --

  /**
   * Registra el juicio de un evaluador sobre una oferta en su dimensión.
   *
   * Reevaluar sustituye el juicio anterior por completo: media evaluación
   * mezclada con la vieja no sería el juicio de nadie.
   */
  async evaluar(
    procesoId: string,
    oferenteId: string,
    dto: EvaluarOfertaDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      // Sin comité no arranca la evaluación: es el segundo criterio de
      // EFDS-1156, ya construido y probado allí. No se repite la regla.
      await this.comite.exigirComiteParaEvaluar(procesoId, em);

      const { recepcionCerrada, oferentes } = await this.ofertasPublicadas(em, procesoId);
      if (!recepcionCerrada) {
        throw new ConflictException(
          'La recepción de ofertas sigue abierta: evaluar ahora sería calificar una lista que todavía puede cambiar',
        );
      }

      const oferta = oferentes.find((o) => o.id === oferenteId);
      if (!oferta) throw new NotFoundException('La oferta no está en la lista de este proceso');

      await this.exigirQuePuedaEvaluar(procesoId, dto.dimension, acceso);

      const criterios = await this.criteriosDe(proceso.modalidad, dto.dimension, em);
      if (criterios.length === 0) {
        throw new ConflictException(
          `No hay criterios de evaluación ${dto.dimension.toLowerCase()} configurados para esta modalidad`,
        );
      }

      this.validarResultados(dto.resultados, criterios);

      const evaluacion = await this.reemplazarEvaluacion(em, oferenteId, dto, acceso);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, evaluacion.id, 'GUARDAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        oferta: oferta.numero,
        dimension: dto.dimension,
        criterios: dto.resultados.length,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Evalúa quien está en el comité de **este** proceso y en **esa** dimensión.
   *
   * El rol del token solo abre la pantalla. Un evaluador jurídico designado en
   * otro proceso llega hasta aquí y no puede calificar, que es lo correcto:
   * evaluar es una condición de la persona en el proceso, no una credencial.
   */
  private async exigirQuePuedaEvaluar(
    procesoId: string,
    dimension: DimensionEvaluacion,
    acceso: HiringAccess,
  ) {
    if (dimension === DIMENSION_CALCULADA) {
      throw new BadRequestException(
        'La evaluación económica se calcula sobre el valor ofertado; no la registra un evaluador',
      );
    }

    const mias = await this.comite.dimensionesDe(procesoId, acceso);

    if (mias.length === 0) {
      throw new ForbiddenException(
        'No fuiste designado en el comité evaluador de este proceso',
      );
    }
    if (!mias.includes(dimension)) {
      throw new ForbiddenException(
        `Fuiste designado para la evaluación ${mias.join(' y ').toLowerCase()}, no para la ${dimension.toLowerCase()}`,
      );
    }
  }

  /**
   * El juicio tiene que cubrir la dimensión entera y respetar el tipo de cada
   * criterio.
   *
   * Un habilitante con puntaje o un ponderable con "cumple" no son un descuido
   * de forma: significan que quien evalúa entendió otra cosa de la que el
   * catálogo dice, y el resultado consolidado saldría mal.
   */
  private validarResultados(resultados: ResultadoCriterioDto[], criterios: CriterioEvaluacion[]) {
    const porId = new Map(criterios.map((c) => [c.id, c]));
    const vistos = new Set<string>();

    for (const resultado of resultados) {
      const criterio = porId.get(resultado.criterioId);
      if (!criterio) {
        throw new BadRequestException(
          'Uno de los criterios evaluados no pertenece a esta dimensión o no aplica a la modalidad',
        );
      }
      if (vistos.has(criterio.id)) {
        throw new BadRequestException(`El criterio "${criterio.nombre}" viene dos veces`);
      }
      vistos.add(criterio.id);

      if (criterio.tipo === 'HABILITANTE') {
        if (resultado.cumple === undefined) {
          throw new BadRequestException(
            `"${criterio.nombre}" es habilitante: se cumple o no se cumple`,
          );
        }
        if (resultado.puntaje !== undefined) {
          throw new BadRequestException(
            `"${criterio.nombre}" es habilitante y no lleva puntaje: deja pasar la oferta, no la califica`,
          );
        }
        // Quedar fuera sin motivo escrito es justo lo que el oferente reclama.
        if (resultado.cumple === false && !resultado.observacion?.trim()) {
          throw new BadRequestException(
            `Explica por qué "${criterio.nombre}" no se cumple: es lo que sustenta dejar la oferta fuera`,
          );
        }
        continue;
      }

      if (resultado.puntaje === undefined) {
        throw new BadRequestException(`"${criterio.nombre}" es ponderable y necesita un puntaje`);
      }
      if (resultado.cumple !== undefined) {
        throw new BadRequestException(
          `"${criterio.nombre}" es ponderable: se califica con puntaje, no con cumple`,
        );
      }

      const maximo = Number(criterio.puntajeMaximo);
      if (resultado.puntaje > maximo) {
        throw new BadRequestException(
          `"${criterio.nombre}" admite hasta ${maximo} puntos y se asignaron ${resultado.puntaje}`,
        );
      }
    }

    // Una dimensión a medias no es una evaluación: se leería como criterios
    // incumplidos cuando en realidad están sin mirar.
    const faltantes = criterios.filter((c) => !vistos.has(c.id));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Falta calificar: ${faltantes.map((c) => c.nombre).join(', ')}`,
      );
    }
  }

  /** Sustituye la evaluación de esa dimensión, si ya existía. */
  private async reemplazarEvaluacion(
    em: EntityManager,
    oferenteId: string,
    dto: EvaluarOfertaDto,
    acceso: HiringAccess,
  ) {
    const repo = em.getRepository(EvaluacionOferta);
    const previa = await repo.findOne({ where: { oferenteId, dimension: dto.dimension } });

    if (previa) {
      await em.getRepository(EvaluacionCriterio).delete({ evaluacionId: previa.id });
    }

    const evaluacion = await repo.save(
      repo.create({
        ...(previa ? { id: previa.id, createdAt: previa.createdAt } : {}),
        oferenteId,
        dimension: dto.dimension,
        personaId: await this.comite.personaDe(acceso),
        evaluadaPor: acceso.userName,
      }),
    );

    await em.save(
      dto.resultados.map((r) =>
        em.create(EvaluacionCriterio, {
          evaluacionId: evaluacion.id,
          criterioId: r.criterioId,
          cumple: r.cumple ?? null,
          puntaje: r.puntaje != null ? String(r.puntaje) : null,
          observacion: r.observacion?.trim() || null,
        }),
      ),
    );

    return evaluacion;
  }

  /**
   * Los criterios activos que aplican a la modalidad.
   *
   * Los de modalidad nula aplican a todas: la historia dice que los ponderables
   * varían por modalidad sin cifrar cómo, y repetir el mismo criterio once
   * veces para decir "aplica siempre" haría el catálogo ilegible.
   */
  private async criteriosDe(
    modalidad: string | null,
    dimension?: DimensionEvaluacion,
    em?: EntityManager,
  ): Promise<CriterioEvaluacion[]> {
    const manager = em ?? this.dataSource.manager;
    const repo = manager.getRepository(CriterioEvaluacion);

    const comunes = await repo.find({
      where: { activo: true, modalidad: IsNull(), ...(dimension ? { dimension } : {}) },
      order: { orden: 'ASC' },
    });

    const propios = modalidad
      ? await repo.find({
          where: { activo: true, modalidad, ...(dimension ? { dimension } : {}) },
          order: { orden: 'ASC' },
        })
      : [];

    return [...comunes, ...propios].sort((a, b) => a.orden - b.orden);
  }

  /** La lista de oferentes publicada, y si la recepción ya cerró. */
  private async ofertasPublicadas(em: EntityManager, procesoId: string) {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });

    if (!recepcion) return { recepcionCerrada: false, oferentes: [] as Oferente[] };

    const oferentes = await em.getRepository(Oferente).find({
      where: { recepcionId: recepcion.id },
      order: { numero: 'ASC' },
    });

    return { recepcionCerrada: recepcion.estado === 'CERRADA', oferentes };
  }

  private async evaluacionesDe(oferenteIds: string[]) {
    if (oferenteIds.length === 0) return new Map<string, EvaluacionAgrupada[]>();

    const evaluaciones = await this.dataSource.getRepository(EvaluacionOferta).find({
      where: { oferenteId: In(oferenteIds) },
    });

    const resultados = evaluaciones.length
      ? await this.dataSource.getRepository(EvaluacionCriterio).find({
          where: { evaluacionId: In(evaluaciones.map((e) => e.id)) },
        })
      : [];

    const porEvaluacion = new Map<string, EvaluacionCriterio[]>();
    for (const r of resultados) {
      porEvaluacion.set(r.evaluacionId, [...(porEvaluacion.get(r.evaluacionId) ?? []), r]);
    }

    const agrupadas = new Map<string, EvaluacionAgrupada[]>();
    for (const evaluacion of evaluaciones) {
      agrupadas.set(evaluacion.oferenteId, [
        ...(agrupadas.get(evaluacion.oferenteId) ?? []),
        { evaluacion, resultados: porEvaluacion.get(evaluacion.id) ?? [] },
      ]);
    }
    return agrupadas;
  }

  private async exigirQueAplique(em: EntityManager, proceso: Proceso) {
    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_EVALUACION, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) {
      throw new BadRequestException(`Esta modalidad no evalúa ofertas: ${excluida.motivo}`);
    }
  }

  /**
   * La actividad queda en curso mientras alguna oferta esté sin evaluar del
   * todo; darla por cumplida es cosa del informe de evaluación (EFDS-1158).
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_EVALUACION },
    });

    if (actividad) {
      actividad.estado = 'BORRADOR' as any;
      await em.save(actividad);
      return;
    }

    await em.save(
      em.create(ProcesoActividad, {
        procesoId,
        numeral: NUMERAL_EVALUACION,
        estado: 'BORRADOR' as any,
        datos: {},
      }),
    );
  }

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'evaluacion_ofertas',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

interface EvaluacionAgrupada {
  evaluacion: EvaluacionOferta;
  resultados: EvaluacionCriterio[];
}
