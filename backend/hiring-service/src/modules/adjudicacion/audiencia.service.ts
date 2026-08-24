import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';

import {
  AudienciaAdjudicacion,
  PiezaAudiencia,
} from '../../entities/audiencia-adjudicacion.entity';
import { SobreEconomico } from '../../entities/sobre-economico.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Oferente } from '../../entities/oferente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AdjudicacionBase,
  ArchivoCargado,
  NUMERAL_AUDIENCIA,
  NUMERAL_SOBRE_ECONOMICO,
} from './adjudicacion.base';
import {
  AbrirSobreDto,
  AnularAudienciaDto,
  CargarPiezaAudienciaDto,
  CelebrarAudienciaDto,
} from './dto/audiencia.dto';

/**
 * Audiencia de adjudicación y apertura del sobre económico — actividades 7.1 y
 * 7.2 (EFDS-1159, RF-ADJ-01).
 *
 * La audiencia es donde se oyen las observaciones al informe y, en licitación de
 * obra pública, donde se abre el sobre económico delante de todos. La plataforma
 * no la celebra ni la transmite: registra que ocurrió y guarda lo que la prueba.
 *
 * Va después de un traslado cerrado. Mientras el término corra o queden escritos
 * sin responder, la evaluación todavía se puede mover, y adjudicar sobre algo
 * que se puede mover es lo que el debido proceso quiere evitar.
 */
@Injectable()
export class AudienciaService extends AdjudicacionBase {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    const excluidaAudiencia = await this.excluida(em, proceso, NUMERAL_AUDIENCIA);
    const excluidaSobre = await this.excluida(em, proceso, NUMERAL_SOBRE_ECONOMICO);

    const modalidad = proceso.modalidad
      ? await em.getRepository(Modalidad).findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const audiencias = await em
      .getRepository(AudienciaAdjudicacion)
      .find({ where: { procesoId }, order: { celebradaAt: 'DESC' } });
    const vigente = audiencias.find((a) => a.estado !== 'ANULADA') ?? null;

    const piezas = vigente ? await this.piezasDe(em, vigente.id) : [];
    const sobres = vigente ? await this.sobresDe(em, vigente.id) : [];
    const ofertas = await this.ofertasDe(em, procesoId);
    const porOferta = new Map(ofertas.map((o) => [o.id, o]));

    const documentos = await this.documentosDe([
      ...audiencias.map((a) => a.actaDocumentoId),
      ...piezas.map((p) => p.documentoId),
      ...sobres.map((s) => s.evidenciaDocumentoId),
    ]);

    // Se consulta sin exigir nada para poder explicar qué falta, en vez de
    // devolver un error donde el usuario espera una pantalla.
    const trasladoCerrado = await this.trasladoCerrado(em, procesoId);

    return {
      aplica: !excluidaAudiencia,
      motivoNoAplica: excluidaAudiencia?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      trasladoCerrado,
      // El sobre económico es de la licitación de obra pública: dónde aplica lo
      // dice la matriz, no una lista en el código.
      aplicaSobreEconomico: !excluidaSobre,
      motivoNoAplicaSobre: excluidaSobre?.motivo ?? null,
      puedeCelebrar: !excluidaAudiencia && trasladoCerrado && !vigente,
      audiencia: vigente
        ? this.presentar(vigente, documentos, piezas, sobres, porOferta)
        : null,
      // Las anuladas se muestran: explican por qué hubo que repetir la audiencia.
      anuladas: audiencias
        .filter((a) => a.estado === 'ANULADA')
        .map((a) => this.presentar(a, documentos, [], [], porOferta)),
      ofertas: ofertas.map((o) => ({
        id: o.id,
        numero: o.numero,
        nombre: o.nombre,
        identificacion: o.identificacion,
        valorOfertado: o.valorOfertado != null ? Number(o.valorOfertado) : null,
      })),
    };
  }

  // ------------------------------------------------------------ audiencia --

  /** Registra que la audiencia se celebró, con su acta. */
  async celebrar(
    procesoId: string,
    dto: CelebrarAudienciaDto,
    acta: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso, NUMERAL_AUDIENCIA);
      await this.exigirTrasladoCerrado(em, procesoId);

      if (await this.audienciaVigente(em, procesoId)) {
        throw new ConflictException(
          'El proceso ya tiene audiencia registrada: para rehacerla hay que anular la anterior',
        );
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERAL_AUDIENCIA,
        'Acta de la audiencia de adjudicación',
        acta,
        hash,
        acceso,
      );

      const audiencia = await em.save(
        em.create(AudienciaAdjudicacion, {
          procesoId,
          celebradaAt: new Date(dto.celebradaAt),
          presididaPor: dto.presididaPor.trim(),
          actaDocumentoId: doc.id,
          resumen: dto.resumen?.trim() || null,
          estado: 'CELEBRADA' as const,
          registradaPor: acceso.userName,
        }),
      );

      await this.marcarActividad(em, procesoId, NUMERAL_AUDIENCIA, true, acceso);
      await this.traza(em, procesoId, audiencia.id, 'audiencia_adjudicacion', 'CELEBRAR', acceso, {
        actividad: NUMERAL_AUDIENCIA,
        celebradaAt: dto.celebradaAt,
        presididaPor: dto.presididaPor.trim(),
      });
    });

    return this.estado(procesoId);
  }

  /** Suma una grabación, una observación con su respuesta, o un anexo. */
  async cargarPieza(
    procesoId: string,
    dto: CargarPiezaAudienciaDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const audiencia = await this.audienciaVigente(em, procesoId);
      if (!audiencia) {
        throw new ConflictException(
          'Primero se registra la audiencia con su acta; lo demás la documenta',
        );
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERAL_AUDIENCIA,
        dto.descripcion.trim(),
        archivo,
        hash,
        acceso,
      );

      const pieza = await em.save(
        em.create(PiezaAudiencia, {
          audienciaId: audiencia.id,
          documentoId: doc.id,
          tipo: dto.tipo,
          descripcion: dto.descripcion.trim(),
          cargadaPor: acceso.userName,
        }),
      );

      await this.traza(em, procesoId, pieza.id, 'pieza_audiencia', 'ADJUNTAR', acceso, {
        actividad: NUMERAL_AUDIENCIA,
        tipo: dto.tipo,
        descripcion: dto.descripcion.trim(),
      });
    });

    return this.estado(procesoId);
  }

  /**
   * Anula la audiencia registrada.
   *
   * No se borra: pudo haberse celebrado de verdad y tener acta pública. Queda
   * con su motivo, y con ella se van sus piezas y sus sobres, que documentaban
   * esa audiencia y no otra.
   */
  async anular(procesoId: string, dto: AnularAudienciaDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const audiencia = await this.audienciaVigente(em, procesoId);
      if (!audiencia) throw new NotFoundException('El proceso no tiene audiencia registrada');

      audiencia.estado = 'ANULADA';
      audiencia.anuladaAt = new Date();
      audiencia.motivoAnulacion = dto.motivo.trim();
      await em.save(audiencia);

      await this.marcarActividad(em, procesoId, NUMERAL_AUDIENCIA, false, acceso);
      await this.traza(em, procesoId, audiencia.id, 'audiencia_adjudicacion', 'ANULAR', acceso, {
        actividad: NUMERAL_AUDIENCIA,
        motivo: dto.motivo.trim(),
      });
    });

    return this.estado(procesoId);
  }

  // ------------------------------------------------------ sobre económico --

  /**
   * Abre el sobre económico de una oferta en la audiencia.
   *
   * Solo donde la modalidad lo tenga: la matriz deja la 7.2 para la licitación
   * de obra pública, y la aplicabilidad se lee de `actividades_excluidas`.
   */
  async abrirSobre(
    procesoId: string,
    dto: AbrirSobreDto,
    evidencia: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso, NUMERAL_SOBRE_ECONOMICO);

      const audiencia = await this.audienciaVigente(em, procesoId);
      if (!audiencia) {
        throw new ConflictException(
          'El sobre económico se abre en la audiencia: regístrala primero',
        );
      }

      const ofertas = await this.ofertasDe(em, procesoId);
      const oferta = ofertas.find((o) => o.id === dto.oferenteId);
      if (!oferta) {
        throw new NotFoundException('Esa oferta no está en la lista de este proceso');
      }

      const abierto = await em
        .getRepository(SobreEconomico)
        .findOne({ where: { audienciaId: audiencia.id, oferenteId: oferta.id } });
      if (abierto) {
        throw new ConflictException(
          `El sobre de la oferta ${oferta.numero} ya se abrió en esta audiencia`,
        );
      }

      const doc = evidencia
        ? await this.guardarDocumento(
            em,
            procesoId,
            NUMERAL_SOBRE_ECONOMICO,
            `Apertura del sobre económico de ${oferta.nombre}`,
            evidencia,
            hash as string,
            acceso,
          )
        : null;

      const sobre = await em.save(
        em.create(SobreEconomico, {
          audienciaId: audiencia.id,
          oferenteId: oferta.id,
          valorOfertado: String(dto.valorOfertado),
          evidenciaDocumentoId: doc?.id ?? null,
          observacion: dto.observacion?.trim() || null,
          abiertoPor: acceso.userName,
        }),
      );

      await this.marcarActividad(em, procesoId, NUMERAL_SOBRE_ECONOMICO, true, acceso);
      await this.traza(em, procesoId, sobre.id, 'sobre_economico', 'ABRIR', acceso, {
        actividad: NUMERAL_SOBRE_ECONOMICO,
        oferta: oferta.numero,
        valor: dto.valorOfertado,
        // Que el sobre traiga algo distinto de lo declarado es el hecho que hay
        // que poder ver después, así que queda en la traza.
        coincideConLoDeclarado:
          oferta.valorOfertado != null
            ? Number(oferta.valorOfertado) === dto.valorOfertado
            : null,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  private presentar(
    audiencia: AudienciaAdjudicacion,
    documentos: Map<string, Documento>,
    piezas: PiezaAudiencia[],
    sobres: SobreEconomico[],
    ofertas: Map<string, Oferente>,
  ) {
    const acta = documentos.get(audiencia.actaDocumentoId);

    return {
      id: audiencia.id,
      estado: audiencia.estado,
      celebradaAt: audiencia.celebradaAt,
      presididaPor: audiencia.presididaPor,
      resumen: audiencia.resumen,
      acta: acta ? { id: acta.id, nombre: acta.nombre, archivoUrl: acta.archivoUrl } : null,
      registradaPor: audiencia.registradaPor,
      registradaAt: audiencia.registradaAt,
      anuladaAt: audiencia.anuladaAt,
      motivoAnulacion: audiencia.motivoAnulacion,
      piezas: piezas.map((p) => {
        const doc = documentos.get(p.documentoId);
        return {
          id: p.id,
          tipo: p.tipo,
          descripcion: p.descripcion,
          cargadaPor: p.cargadaPor,
          cargadaAt: p.createdAt,
          archivoUrl: doc?.archivoUrl ?? null,
        };
      }),
      sobres: sobres.map((s) => {
        const oferta = ofertas.get(s.oferenteId);
        const declarado = oferta?.valorOfertado != null ? Number(oferta.valorOfertado) : null;
        const abierto = Number(s.valorOfertado);
        const evidencia = s.evidenciaDocumentoId
          ? documentos.get(s.evidenciaDocumentoId)
          : undefined;

        return {
          id: s.id,
          oferta: oferta ? { id: oferta.id, numero: oferta.numero, nombre: oferta.nombre } : null,
          valorOfertado: abierto,
          valorDeclarado: declarado,
          // Se dice explícitamente en vez de dejar que la pantalla compare: es
          // el hecho por el que se abre el sobre delante de todos.
          coincideConLoDeclarado: declarado == null ? null : declarado === abierto,
          observacion: s.observacion,
          abiertoPor: s.abiertoPor,
          abiertoAt: s.abiertoAt,
          evidenciaUrl: evidencia?.archivoUrl ?? null,
        };
      }),
    };
  }

  private audienciaVigente(em: EntityManager, procesoId: string) {
    return em
      .getRepository(AudienciaAdjudicacion)
      .findOne({ where: { procesoId, estado: Not('ANULADA') } });
  }

  private piezasDe(em: EntityManager, audienciaId: string) {
    return em
      .getRepository(PiezaAudiencia)
      .find({ where: { audienciaId }, order: { createdAt: 'ASC' } });
  }

  private sobresDe(em: EntityManager, audienciaId: string) {
    return em
      .getRepository(SobreEconomico)
      .find({ where: { audienciaId }, order: { abiertoAt: 'ASC' } });
  }

  /** Igual que `exigirTrasladoCerrado`, pero para responder y no para bloquear. */
  private async trasladoCerrado(em: EntityManager, procesoId: string): Promise<boolean> {
    try {
      await this.exigirTrasladoCerrado(em, procesoId);
      return true;
    } catch {
      return false;
    }
  }
}
