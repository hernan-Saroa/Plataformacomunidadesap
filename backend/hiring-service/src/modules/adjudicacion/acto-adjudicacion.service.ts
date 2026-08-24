import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';

import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { InformeDefinitivo } from '../../entities/informe-definitivo.entity';
import { Documento } from '../../entities/documento.entity';
import { Oferente } from '../../entities/oferente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AdjudicacionBase,
  ArchivoCargado,
  NUMERAL_ACTO,
  NUMERAL_INFORME_DEFINITIVO,
} from './adjudicacion.base';
import { AdjudicarDto, PublicarActoDto, RevocarActoDto } from './dto/acto.dto';

/**
 * Acto de adjudicación — actividad 7.4 (EFDS-1159, RF-ADJ-01).
 *
 * La resolución del Ordenador del Gasto. Aquí termina el proceso de selección:
 * lo que sigue es contrato.
 *
 * Quién adjudica es el Ordenador del Gasto y no el gestor, con la misma
 * separación de la designación del comité (EFDS-1438): el gestor lleva el
 * trámite, pero comprometer a la entidad con un tercero es de quien ordena el
 * gasto. Aquí sí lo dice la historia, y no es un supuesto del equipo.
 */
@Injectable()
export class ActoAdjudicacionService extends AdjudicacionBase {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    const excluida = await this.excluida(em, proceso, NUMERAL_ACTO);

    const actos = await em
      .getRepository(ActoAdjudicacion)
      .find({ where: { procesoId }, order: { emitidoAt: 'DESC' } });
    const vigente = actos.find((a) => a.estado === 'VIGENTE') ?? null;

    const definitivo = await this.definitivoPublicado(em, procesoId);
    const ofertas = await this.ofertasDe(em, procesoId);
    const porOferta = new Map(ofertas.map((o) => [o.id, o]));

    const documentos = await this.documentosDe(
      actos.flatMap((a) => [a.actoDocumentoId, a.evidenciaDocumentoId]),
    );

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      // Sin informe definitivo publicado no se adjudica: firmar sobre una
      // evaluación que todavía se puede mover es lo que hay que evitar.
      informeDefinitivoPublicado: !!definitivo,
      // La ganadora que propone el informe. El acto puede apartarse de ella,
      // pero entonces tiene que decir por qué.
      ganadoraPropuesta: definitivo
        ? {
            oferenteId: definitivo.resultado.ganadora.oferenteId,
            nombre: definitivo.resultado.ganadora.nombre,
            valorEvaluado: definitivo.resultado.valorEvaluado,
          }
        : null,
      puedeAdjudicar: !excluida && !!definitivo && !vigente,
      acto: vigente ? this.presentar(vigente, documentos, porOferta) : null,
      // Los revocados se muestran: explican que el proceso se adjudicara dos
      // veces, y a un tercero le consta el primero.
      revocados: actos
        .filter((a) => a.estado === 'REVOCADO')
        .map((a) => this.presentar(a, documentos, porOferta)),
      ofertas: ofertas.map((o) => ({
        id: o.id,
        numero: o.numero,
        nombre: o.nombre,
        identificacion: o.identificacion,
        valorOfertado: o.valorOfertado != null ? Number(o.valorOfertado) : null,
      })),
    };
  }

  // ----------------------------------------------------------------- acto --

  /** Emite la resolución de adjudicación. */
  async adjudicar(
    procesoId: string,
    dto: AdjudicarDto,
    acto: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueNoEsteDesierto(em, procesoId);
      await this.exigirQueAplique(em, proceso, NUMERAL_ACTO);

      const definitivo = await this.definitivoPublicado(em, procesoId);
      if (!definitivo) {
        throw new ConflictException(
          `El informe de evaluación definitivo no se ha publicado: adjudicar sin él sería firmar sobre una evaluación que todavía se puede mover (${NUMERAL_INFORME_DEFINITIVO})`,
        );
      }

      if (await this.actoVigente(em, procesoId)) {
        throw new ConflictException(
          'El proceso ya está adjudicado: para adjudicar de nuevo hay que revocar el acto vigente',
        );
      }

      const ofertas = await this.ofertasDe(em, procesoId);
      const adjudicatario = ofertas.find((o) => o.id === dto.oferenteId);
      if (!adjudicatario) {
        throw new NotFoundException(
          'Esa oferta no está en la lista de este proceso: solo se adjudica a quien presentó oferta',
        );
      }

      // Apartarse de la ganadora es legítimo —el ganador que no firma, por
      // ejemplo— pero no puede pasar sin que quede dicho por qué. El sistema no
      // lo impide: pone la contradicción delante y exige sustentarla.
      const esLaGanadora = definitivo.resultado.ganadora.oferenteId === adjudicatario.id;
      if (!esLaGanadora && !dto.justificacion?.trim()) {
        throw new BadRequestException(
          `El informe definitivo propone a ${definitivo.resultado.ganadora.nombre}: si se adjudica a otro, di por qué`,
        );
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERAL_ACTO,
        `Acto de adjudicación ${dto.numeroActo.trim()}`,
        acto,
        hash,
        acceso,
      );

      const guardado = await em.save(
        em.create(ActoAdjudicacion, {
          procesoId,
          informeDefinitivoId: definitivo.id,
          oferenteId: adjudicatario.id,
          numeroActo: dto.numeroActo.trim(),
          fechaActo: dto.fechaActo,
          valorAdjudicado: String(dto.valorAdjudicado),
          actoDocumentoId: doc.id,
          estado: 'VIGENTE' as const,
          emitidoPor: acceso.userName,
        }),
      );

      await this.marcarActividad(em, procesoId, NUMERAL_ACTO, true, acceso);
      // El proceso de selección terminó: lo que sigue es contrato. El estado lo
      // trajo EFDS-1160 para poder decir "desierto"; adjudicar es el otro
      // desenlace y dejarlo EN_CURSO haría que la columna mintiera.
      proceso.estado = 'ADJUDICADO';
      await em.save(proceso);
      await this.traza(em, procesoId, guardado.id, 'acto_adjudicacion', 'ADJUDICAR', acceso, {
        actividad: NUMERAL_ACTO,
        numeroActo: dto.numeroActo.trim(),
        adjudicatario: adjudicatario.numero,
        valorAdjudicado: dto.valorAdjudicado,
        // Que el acto se apartara del informe es lo primero que se busca
        // cuando alguien revisa el expediente.
        esLaGanadoraDelInforme: esLaGanadora,
        justificacion: esLaGanadora ? null : dto.justificacion?.trim(),
      });
    });

    return this.estado(procesoId);
  }

  /** Registra la notificación y la publicación del acto, con su evidencia. */
  async publicar(
    procesoId: string,
    dto: PublicarActoDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const acto = await this.actoVigente(em, procesoId);
      if (!acto) throw new NotFoundException('El proceso no tiene acto de adjudicación vigente');
      if (acto.publicadoAt) {
        throw new ConflictException('Este acto ya se publicó');
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERAL_ACTO,
        'Evidencia de la publicación del acto de adjudicación',
        evidencia,
        hash,
        acceso,
      );

      const ahora = new Date();
      acto.notificadoAt = dto.notificadoAt ? new Date(dto.notificadoAt) : ahora;
      acto.publicadoAt = ahora;
      acto.evidenciaDocumentoId = doc.id;
      await em.save(acto);

      await this.traza(em, procesoId, acto.id, 'acto_adjudicacion', 'PUBLICAR', acceso, {
        actividad: NUMERAL_ACTO,
        medio: dto.medioPublicacion.trim(),
        notificadoAt: acto.notificadoAt,
      });
    });

    return this.estado(procesoId);
  }

  /**
   * Revoca el acto vigente.
   *
   * No se borra: el acto pudo notificarse y publicarse, y hay terceros que lo
   * conocieron. Queda con su motivo, y el proceso vuelve a quedar sin adjudicar
   * hasta que se emita otro.
   */
  async revocar(procesoId: string, dto: RevocarActoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const acto = await this.actoVigente(em, procesoId);
      if (!acto) throw new NotFoundException('El proceso no tiene acto de adjudicación vigente');

      acto.estado = 'REVOCADO';
      acto.revocadoAt = new Date();
      acto.revocadoPor = acceso.userName;
      acto.motivoRevocacion = dto.motivo.trim();
      await em.save(acto);

      await this.marcarActividad(em, procesoId, NUMERAL_ACTO, false, acceso);
      // Revocado el acto, el proceso vuelve a estar sin desenlace: puede
      // adjudicarse a otro o declararse desierto.
      proceso.estado = 'EN_CURSO';
      await em.save(proceso);
      await this.traza(em, procesoId, acto.id, 'acto_adjudicacion', 'REVOCAR_ACTO', acceso, {
        actividad: NUMERAL_ACTO,
        numeroActo: acto.numeroActo,
        motivo: dto.motivo.trim(),
        // Si ya se había notificado, revocar afecta a un tercero que lo conoció.
        estabaNotificado: !!acto.notificadoAt,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  private presentar(
    acto: ActoAdjudicacion,
    documentos: Map<string, Documento>,
    ofertas: Map<string, Oferente>,
  ) {
    const adjudicatario = ofertas.get(acto.oferenteId);
    const doc = documentos.get(acto.actoDocumentoId);
    const evidencia = acto.evidenciaDocumentoId
      ? documentos.get(acto.evidenciaDocumentoId)
      : undefined;

    return {
      id: acto.id,
      estado: acto.estado,
      informeDefinitivoId: acto.informeDefinitivoId,
      adjudicatario: adjudicatario
        ? {
            id: adjudicatario.id,
            numero: adjudicatario.numero,
            nombre: adjudicatario.nombre,
            identificacion: adjudicatario.identificacion,
          }
        : null,
      numeroActo: acto.numeroActo,
      fechaActo: acto.fechaActo,
      valorAdjudicado: Number(acto.valorAdjudicado),
      acto: doc ? { id: doc.id, nombre: doc.nombre, archivoUrl: doc.archivoUrl } : null,
      evidencia: evidencia
        ? { id: evidencia.id, nombre: evidencia.nombre, archivoUrl: evidencia.archivoUrl }
        : null,
      notificadoAt: acto.notificadoAt,
      publicadoAt: acto.publicadoAt,
      emitidoPor: acto.emitidoPor,
      emitidoAt: acto.emitidoAt,
      revocadoPor: acto.revocadoPor,
      revocadoAt: acto.revocadoAt,
      motivoRevocacion: acto.motivoRevocacion,
    };
  }

  private actoVigente(em: EntityManager, procesoId: string) {
    return em
      .getRepository(ActoAdjudicacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private async definitivoPublicado(em: EntityManager, procesoId: string) {
    const informes = await em
      .getRepository(InformeDefinitivo)
      .find({ where: { procesoId, estado: Not('ANULADO') } });

    return informes.find((i) => i.estado === 'PUBLICADO') ?? null;
  }
}
