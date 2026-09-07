import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { DeclaratoriaDesierta } from '../../entities/declaratoria-desierta.entity';
import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { ResultadoEvaluacion } from '../../entities/resultado-evaluacion.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Documento } from '../../entities/documento.entity';
import { Oferente } from '../../entities/oferente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AdjudicacionBase,
  ArchivoCargado,
  NUMERALES_ETAPA_7,
  NUMERAL_RECEPCION,
} from './adjudicacion.base';
import { DeclararDesiertoDto, PublicarDesiertaDto, RevocarDesiertaDto } from './dto/desierta.dto';

/**
 * Declaratoria desierta — etapa 7 (EFDS-1160, RF-ADJ-02).
 *
 * El otro desenlace posible: el proceso se adjudica (EFDS-1159) o se declara
 * desierto. Vive en este módulo porque es la misma etapa y comparte toda la
 * base —proceso, expediente, documentos, traza y riel—, pero **no cuelga del
 * traslado**, a diferencia del resto de la etapa.
 *
 * La razón es del modelo y conviene tenerla presente: cuando el comité no
 * habilita a ninguna oferta no hay resultado que registrar —`resultados_evaluacion`
 * exige nombrar una ganadora— y por tanto no hay informe preliminar ni traslado
 * que cerrar. Exigir aquí `exigirTrasladoCerrado` dejaría el camino principal de
 * esta historia sin salida. El veredicto del comité entra como documento propio
 * de la declaratoria.
 */
@Injectable()
export class DeclaratoriaDesiertaService extends AdjudicacionBase {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    // Dónde aplica se lee de la matriz y no de una lista en código: si la
    // modalidad no recibe ofertas (6.1) no hay nada que declarar desierto. Hoy
    // eso es solo contratación directa, pero la regla no es esa lista.
    const excluida = await this.excluida(em, proceso, NUMERAL_RECEPCION);

    const declaratorias = await em
      .getRepository(DeclaratoriaDesierta)
      .find({ where: { procesoId }, order: { declaradaAt: 'DESC' } });
    const vigente = declaratorias.find((d) => d.estado === 'VIGENTE') ?? null;

    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
    const ofertas = await this.ofertasDe(em, procesoId);
    const acto = await this.actoVigente(em, procesoId);
    const resultado = await this.resultadoVigente(em, procesoId);
    const ganadora = resultado ? await this.ofertaDe(em, resultado.oferenteId) : null;

    const documentos = await this.documentosDe(
      declaratorias.flatMap((d) => [
        d.actoDocumentoId,
        d.informeComiteDocumentoId,
        d.evidenciaDocumentoId,
      ]),
    );

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      // La recepción tiene que estar cerrada: mientras siga abierta, "no hay
      // ofertas" no es un hecho, es la foto de un plazo que todavía corre.
      recepcionCerrada: recepcion?.estado === 'CERRADA',
      ofertasRecibidas: ofertas.length,
      // Qué causal cabe según lo que el expediente muestra. La pantalla no
      // ofrece la que va a ser rechazada.
      causalesPosibles:
        recepcion?.estado === 'CERRADA'
          ? ofertas.length === 0
            ? ['SIN_OFERTAS']
            : ['SIN_OFERTAS_HABILITADAS']
          : [],
      // Un proceso adjudicado y desierto a la vez es una contradicción que el
      // expediente no puede sostener.
      adjudicado: !!acto,
      // Si el comité nombró una ganadora, declarar desierto se aparta de él.
      // No se impide: se exige sustentarlo, y la pantalla lo pone delante.
      ganadoraDelComite: ganadora
        ? { oferenteId: ganadora.id, numero: ganadora.numero, nombre: ganadora.nombre }
        : null,
      puedeDeclarar:
        !excluida && recepcion?.estado === 'CERRADA' && !acto && !vigente,
      declaratoria: vigente ? this.presentar(vigente, documentos) : null,
      // Las revocadas se muestran: explican por qué el proceso siguió después
      // de haberse declarado desierto, y a un tercero le constó la primera.
      revocadas: declaratorias
        .filter((d) => d.estado === 'REVOCADA')
        .map((d) => this.presentar(d, documentos)),
    };
  }

  // -------------------------------------------------------- declaratoria --

  /**
   * Declara desierto el proceso y lo cierra.
   *
   * El informe del comité llega como segundo archivo y solo cuando la causal es
   * que ninguna oferta quedó habilitada: sin ofertas no hay comité que haya
   * evaluado nada.
   */
  async declarar(
    procesoId: string,
    dto: DeclararDesiertoDto,
    acto: ArchivoCargado,
    hashActo: string,
    informeComite: ArchivoCargado | null,
    hashInforme: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso, NUMERAL_RECEPCION);

      if (await this.declaratoriaVigente(em, procesoId)) {
        throw new ConflictException(
          'El proceso ya está declarado desierto: para declararlo de nuevo hay que revocar la declaratoria vigente',
        );
      }

      const adjudicado = await this.actoVigente(em, procesoId);
      if (adjudicado) {
        throw new ConflictException(
          `El proceso está adjudicado con la resolución ${adjudicado.numeroActo}: revócala antes de declararlo desierto`,
        );
      }

      const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
      if (!recepcion) {
        throw new BadRequestException(
          'El proceso no abrió recepción de ofertas: no hay nada que declarar desierto (6.1)',
        );
      }
      if (recepcion.estado !== 'CERRADA') {
        throw new BadRequestException(
          'La recepción de ofertas sigue abierta: mientras el plazo corra, "no hay ofertas" todavía no es un hecho',
        );
      }

      const ofertas = await this.ofertasDe(em, procesoId);

      // Que la causal no cuadre con lo que el expediente muestra es un error y
      // no una advertencia: la declaratoria dice por qué, y esa razón tiene que
      // ser verdad contra el propio expediente.
      if (dto.causal === 'SIN_OFERTAS' && ofertas.length > 0) {
        throw new BadRequestException(
          `El proceso recibió ${ofertas.length} oferta(s): la causal es que ninguna quedó habilitada, no que no se presentó nadie`,
        );
      }
      if (dto.causal === 'SIN_OFERTAS_HABILITADAS' && ofertas.length === 0) {
        throw new BadRequestException(
          'El proceso no recibió ninguna oferta: la causal es que no se presentó nadie',
        );
      }
      if (dto.causal === 'SIN_OFERTAS_HABILITADAS' && !informeComite) {
        throw new BadRequestException(
          'Adjunta el informe del comité: es lo que sustenta que ninguna oferta quedó habilitada',
        );
      }

      // El comité nombró una ganadora y aun así se declara desierto. Puede
      // haber razones —mismo criterio de adjudicar a alguien distinto del
      // ganador (EFDS-1487)— pero no puede pasar en silencio.
      const resultado = await this.resultadoVigente(em, procesoId);
      if (resultado && !dto.justificacion?.trim()) {
        const ganadora = await this.ofertaDe(em, resultado.oferenteId);
        throw new BadRequestException(
          `El comité registró a ${ganadora?.nombre ?? 'una oferta'} como ganadora: si aun así se declara desierto, di por qué`,
        );
      }

      const docActo = await this.guardarDocumento(
        em,
        procesoId,
        // Se archiva bajo la última actividad de la etapa: la declaratoria no
        // tiene numeral propio y el acto de adjudicación es la pieza que viene
        // a reemplazar.
        NUMERALES_ETAPA_7[NUMERALES_ETAPA_7.length - 1],
        `Declaratoria desierta ${dto.numeroActo.trim()}`,
        acto,
        hashActo,
        acceso,
      );

      const docInforme =
        informeComite && hashInforme
          ? await this.guardarDocumento(
              em,
              procesoId,
              NUMERALES_ETAPA_7[NUMERALES_ETAPA_7.length - 1],
              'Informe del comité: ninguna oferta habilitada',
              informeComite,
              hashInforme,
              acceso,
            )
          : null;

      const guardada = await em.save(
        em.create(DeclaratoriaDesierta, {
          procesoId,
          causal: dto.causal,
          motivo: dto.motivo.trim(),
          numeroActo: dto.numeroActo.trim(),
          fechaActo: dto.fechaActo,
          actoDocumentoId: docActo.id,
          informeComiteDocumentoId: docInforme?.id ?? null,
          ofertasRecibidas: ofertas.length,
          resultadoContradichoId: resultado?.id ?? null,
          estado: 'VIGENTE' as const,
          declaradaPor: acceso.userName,
        }),
      );

      await this.cerrarProceso(em, proceso, 'DESIERTO');
      await this.marcarEtapaNoAplica(em, procesoId);

      await this.traza(
        em,
        procesoId,
        guardada.id,
        'declaratoria_desierta',
        'DECLARAR_DESIERTO',
        acceso,
        {
          causal: dto.causal,
          numeroActo: dto.numeroActo.trim(),
          ofertasRecibidas: ofertas.length,
          // Que la declaratoria se apartara del comité es lo primero que se
          // busca cuando alguien revisa el expediente.
          seApartaDelResultado: !!resultado,
          justificacion: resultado ? dto.justificacion?.trim() : null,
        },
      );
    });

    return this.estado(procesoId);
  }

  /** Registra la notificación y la publicación de la declaratoria, con su evidencia. */
  async publicar(
    procesoId: string,
    dto: PublicarDesiertaDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const declaratoria = await this.declaratoriaVigente(em, procesoId);
      if (!declaratoria) {
        throw new NotFoundException('El proceso no tiene declaratoria desierta vigente');
      }
      if (declaratoria.publicadaAt) {
        throw new ConflictException('Esta declaratoria ya se publicó');
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERALES_ETAPA_7[NUMERALES_ETAPA_7.length - 1],
        'Evidencia de la publicación de la declaratoria desierta',
        evidencia,
        hash,
        acceso,
      );

      const ahora = new Date();
      declaratoria.notificadaAt = dto.notificadaAt ? new Date(dto.notificadaAt) : ahora;
      declaratoria.publicadaAt = ahora;
      declaratoria.evidenciaDocumentoId = doc.id;
      await em.save(declaratoria);

      await this.traza(
        em,
        procesoId,
        declaratoria.id,
        'declaratoria_desierta',
        'PUBLICAR',
        acceso,
        {
          medio: dto.medioPublicacion.trim(),
          notificadaAt: declaratoria.notificadaAt,
        },
      );
    });

    return this.estado(procesoId);
  }

  /**
   * Revoca la declaratoria vigente y el proceso vuelve a quedar en curso.
   *
   * No se borra, con el mismo criterio del acto de adjudicación: la
   * declaratoria pudo notificarse y publicarse, y hay terceros que la
   * conocieron.
   *
   * Las actividades de la etapa vuelven a BORRADOR y no al estado que tenían:
   * reconstruir eso exigiría guardar la foto del riel, y lo que sí es cierto es
   * que quedan otra vez por adelantar.
   */
  async revocar(procesoId: string, dto: RevocarDesiertaDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const declaratoria = await this.declaratoriaVigente(em, procesoId);
      if (!declaratoria) {
        throw new NotFoundException('El proceso no tiene declaratoria desierta vigente');
      }

      declaratoria.estado = 'REVOCADA';
      declaratoria.revocadaAt = new Date();
      declaratoria.revocadaPor = acceso.userName;
      declaratoria.motivoRevocacion = dto.motivo.trim();
      await em.save(declaratoria);

      await this.cerrarProceso(em, proceso, 'EN_CURSO');
      for (const numeral of NUMERALES_ETAPA_7) {
        await this.marcarActividad(em, procesoId, numeral, false, acceso);
      }

      await this.traza(
        em,
        procesoId,
        declaratoria.id,
        'declaratoria_desierta',
        'REVOCAR_DECLARATORIA',
        acceso,
        {
          numeroActo: declaratoria.numeroActo,
          motivo: dto.motivo.trim(),
          // Si ya se había notificado, revocar afecta a quien la conoció.
          estabaNotificada: !!declaratoria.notificadaAt,
        },
      );
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  private presentar(declaratoria: DeclaratoriaDesierta, documentos: Map<string, Documento>) {
    const pieza = (id: string | null) => {
      const doc = id ? documentos.get(id) : undefined;
      return doc ? { id: doc.id, nombre: doc.nombre, archivoUrl: doc.archivoUrl } : null;
    };

    return {
      id: declaratoria.id,
      estado: declaratoria.estado,
      causal: declaratoria.causal,
      motivo: declaratoria.motivo,
      numeroActo: declaratoria.numeroActo,
      fechaActo: declaratoria.fechaActo,
      ofertasRecibidas: declaratoria.ofertasRecibidas,
      seApartaDelResultado: !!declaratoria.resultadoContradichoId,
      acto: pieza(declaratoria.actoDocumentoId),
      informeComite: pieza(declaratoria.informeComiteDocumentoId),
      evidencia: pieza(declaratoria.evidenciaDocumentoId),
      notificadaAt: declaratoria.notificadaAt,
      publicadaAt: declaratoria.publicadaAt,
      declaradaPor: declaratoria.declaradaPor,
      declaradaAt: declaratoria.declaradaAt,
      revocadaPor: declaratoria.revocadaPor,
      revocadaAt: declaratoria.revocadaAt,
      motivoRevocacion: declaratoria.motivoRevocacion,
    };
  }

  private declaratoriaVigente(em: EntityManager, procesoId: string) {
    return em
      .getRepository(DeclaratoriaDesierta)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private actoVigente(em: EntityManager, procesoId: string) {
    return em.getRepository(ActoAdjudicacion).findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private resultadoVigente(em: EntityManager, procesoId: string) {
    return em
      .getRepository(ResultadoEvaluacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private ofertaDe(em: EntityManager, oferenteId: string) {
    return em.getRepository(Oferente).findOne({ where: { id: oferenteId } });
  }

  private async cerrarProceso(em: EntityManager, proceso: Proceso, estado: Proceso['estado']) {
    proceso.estado = estado;
    await em.save(proceso);
  }

  /**
   * Las actividades de la etapa 7 que ya no se van a adelantar.
   *
   * NO_APLICA y no BORRADOR: no es que estén pendientes, es que no van a
   * ocurrir. Es el mismo estado con que el riel marca lo que la modalidad
   * excluye (migración 027), y aquí lo que las excluye es el desenlace.
   */
  private async marcarEtapaNoAplica(em: EntityManager, procesoId: string) {
    for (const numeral of NUMERALES_ETAPA_7) {
      const actividad = await em
        .getRepository(ProcesoActividad)
        .findOne({ where: { procesoId, numeral } });

      if (!actividad) {
        await em.save(
          em.create(ProcesoActividad, {
            procesoId,
            numeral,
            estado: 'NO_APLICA' as any,
            datos: {},
          }),
        );
        continue;
      }

      actividad.estado = 'NO_APLICA' as any;
      actividad.revisadoPor = null;
      actividad.revisadoAt = null;
      await em.save(actividad);
    }
  }
}
