import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import {
  AudienciaSancionatoria,
  EstadoAudiencia,
  ResolucionSancionatoria,
  SentidoResolucion,
  TipoResolucion,
} from '../../entities/actuacion-sancionatoria.entity';
import { CasoIncumplimiento } from '../../entities/caso-incumplimiento.entity';
import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AbrirTramiteDto,
  CelebrarAudienciaDto,
  CerrarSinCelebrarDto,
  CitarAudienciaDto,
  DecidirCasoDto,
  NotificarResolucionDto,
  RevocarResolucionDto,
} from './dto/sancionatorio.dto';
import {
  estadoTrasDecidir,
  NOMBRE_SENTIDO,
  porQueNoSePuedeAbrir,
  porQueNoSePuedeCaducar,
  porQueNoSePuedeCerrarAudiencia,
  porQueNoSePuedeDecidir,
  porQueNoSePuedeInstruir,
  terminaElContrato,
} from './tramite-sancionatorio';

/** Un documento como lo pinta el panel: con qué nombre y de dónde se baja. */
interface DocumentoEnPanel {
  nombre: string;
  url: string | null;
}

/** Una audiencia del caso, como la lee la pantalla del bloque. */
export interface AudienciaEnPanel {
  id: string;
  citadaPara: Date;
  objeto: string | null;
  estado: EstadoAudiencia;
  celebradaEl: string | null;
  resumen: string | null;
  motivo: string | null;
  citadaPor: string | null;
  citacion: DocumentoEnPanel | null;
  acta: DocumentoEnPanel | null;
}

/** Una resolución del caso, como la lee la pantalla del bloque. */
export interface ResolucionEnPanel {
  id: string;
  tipo: TipoResolucion;
  numero: string;
  fechaExpedicion: string;
  sentido: SentidoResolucion | null;
  valorSancion: number | null;
  notificadaEl: string | null;
  firmeEl: string | null;
  expedidaPor: string | null;
  revocadaAt: Date | null;
  revocadaPor: string | null;
  motivoRevocacion: string | null;
  documento: DocumentoEnPanel | null;
}

/** Lo actuado en el caso: las audiencias y los actos administrativos. */
export interface TramiteDelCaso {
  audiencias: AudienciaEnPanel[];
  resoluciones: ResolucionEnPanel[];
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * El numeral al que se anclan los documentos del trámite.
 *
 * El bloque de Presunto Incumplimiento no tiene numeral propio en la matriz
 * —las 63 actividades van de 1.1 a 10.4—, así que sus documentos cuelgan del de
 * la ejecución, que es donde EFDS-1180 ya los puso y donde el expediente los va
 * a buscar.
 */
const NUMERAL_EJECUCION = '9.2';

/**
 * Trámite sancionatorio del presunto incumplimiento — RF-INC-02 (EFDS-1181).
 *
 * Va en su propio servicio y no dentro del de EFDS-1180 porque son dos
 * competencias distintas sobre el mismo caso: el supervisor constata y reporta;
 * el área jurídica instruye y decide. Meterlas juntas haría que la lista de
 * permisos de un método no dijera nada sobre la del siguiente.
 *
 * **El trámite tiene tres momentos y no uno.** Se abre con una resolución, se
 * instruye con audiencias y se decide con otra resolución. Sin esos pasos
 * separados no habría dónde impedir que se sancione a alguien que no fue oído,
 * que es el criterio de la historia: «surtir el debido proceso sancionatorio».
 *
 * Los métodos no devuelven el estado del panel: lo compone el controlador
 * llamando al servicio de EFDS-1180, que es el dueño de esa vista. La única
 * pieza que este servicio pone ahí es `tramiteDe`, que aquel consulta para
 * pintar lo actuado junto al reporte. La dependencia va en un solo sentido.
 */
@Injectable()
export class SancionatorioService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  /**
   * El trámite de cada caso, para pintarlo junto al reporte.
   *
   * Se resuelve en dos consultas y no en una por caso: un contrato puede tener
   * varios casos abiertos y el panel los pinta todos.
   */
  async tramiteDe(em: EntityManager, casoIds: string[]): Promise<Map<string, TramiteDelCaso>> {
    if (casoIds.length === 0) return new Map<string, TramiteDelCaso>();

    const [audiencias, resoluciones] = await Promise.all([
      em
        .getRepository(AudienciaSancionatoria)
        .createQueryBuilder('a')
        .where('a.caso_id IN (:...casoIds)', { casoIds })
        .orderBy('a.citada_para', 'ASC')
        .getMany(),
      em
        .getRepository(ResolucionSancionatoria)
        .createQueryBuilder('r')
        .where('r.caso_id IN (:...casoIds)', { casoIds })
        .orderBy('r.created_at', 'ASC')
        .getMany(),
    ]);

    const documentoIds = [
      ...audiencias.flatMap((a) => [a.citacionDocumentoId, a.actaDocumentoId]),
      ...resoluciones.map((r) => r.documentoId),
    ].filter((id): id is string => !!id);

    const documentos = documentoIds.length
      ? await em.getRepository(Documento).findByIds(documentoIds)
      : [];

    const verDocumento = (id: string | null) => {
      const doc = documentos.find((d) => d.id === id);
      return doc ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl } : null;
    };

    const porCaso = new Map<string, TramiteDelCaso>();
    for (const casoId of casoIds) porCaso.set(casoId, this.vacio());

    for (const a of audiencias) {
      porCaso.get(a.casoId)?.audiencias.push({
        id: a.id,
        citadaPara: a.citadaPara,
        objeto: a.objeto,
        estado: a.estado,
        celebradaEl: a.celebradaEl,
        resumen: a.resumen,
        motivo: a.motivo,
        citadaPor: a.citadaPor,
        citacion: verDocumento(a.citacionDocumentoId),
        acta: verDocumento(a.actaDocumentoId),
      });
    }

    for (const r of resoluciones) {
      porCaso.get(r.casoId)?.resoluciones.push({
        id: r.id,
        tipo: r.tipo,
        numero: r.numero,
        fechaExpedicion: r.fechaExpedicion,
        sentido: r.sentido,
        valorSancion: r.valorSancion,
        notificadaEl: r.notificadaEl,
        firmeEl: r.firmeEl,
        expedidaPor: r.expedidaPor,
        revocadaAt: r.revocadaAt,
        revocadaPor: r.revocadaPor,
        motivoRevocacion: r.motivoRevocacion,
        documento: verDocumento(r.documentoId),
      });
    }

    return porCaso;
  }

  private vacio(): TramiteDelCaso {
    return { audiencias: [], resoluciones: [] };
  }

  // -------------------------------------------------------------- apertura --

  /**
   * Abre el trámite con su resolución.
   *
   * Es lo que convierte un reporte en un procedimiento: hasta aquí hay un hecho
   * observado por el supervisor, y desde aquí hay una entidad que decidió
   * examinarlo formalmente.
   */
  async abrir(
    procesoId: string,
    casoId: string,
    dto: AbrirTramiteDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId);

      const motivo = porQueNoSePuedeAbrir(caso.estado);
      if (motivo) throw new ConflictException(`No se puede abrir el trámite: ${motivo}`);

      this.exigirFechaPasada(dto.fechaExpedicion, 'La fecha de la resolución');

      const resolucion = await this.guardarResolucion(
        em,
        procesoId,
        caso,
        contrato.numero,
        'APERTURA',
        dto.numero,
        dto.fechaExpedicion,
        archivo,
        hash,
        acceso,
      );

      caso.estado = 'EN_TRAMITE';
      await em.save(caso);

      await this.traza(em, procesoId, resolucion.id, 'ABRIR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        resolucion: dto.numero,
      });
    });
  }

  // ------------------------------------------------------------ audiencias --

  /**
   * Cita una audiencia.
   *
   * **La fecha mira al futuro**, y es lo único del módulo que lo hace: todo lo
   * demás transcribe hechos ya ocurridos. Una citación que no pudiera ser
   * futura no serviría para citar a nadie.
   */
  async citar(
    procesoId: string,
    casoId: string,
    dto: CitarAudienciaDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId);

      const motivo = porQueNoSePuedeInstruir(caso.estado);
      if (motivo) throw new ConflictException(`No se puede citar la audiencia: ${motivo}`);

      const pendiente = await em.getRepository(AudienciaSancionatoria).findOne({
        where: { casoId: caso.id, estado: 'CITADA' as EstadoAudiencia },
      });
      if (pendiente) {
        throw new ConflictException(
          'El caso ya tiene una audiencia citada: registra primero qué pasó con ella',
        );
      }

      const documento = await this.guardarDocumento(
        em,
        procesoId,
        `Contrato ${contrato.numero} · citación a audiencia sancionatoria`,
        archivo,
        hash,
        acceso,
      );

      const audiencia = await em.save(
        em.create(AudienciaSancionatoria, {
          casoId: caso.id,
          citadaPara: new Date(dto.citadaPara),
          citacionDocumentoId: documento.id,
          objeto: dto.objeto ?? null,
          estado: 'CITADA' as EstadoAudiencia,
          citadaPor: acceso.userName,
        } as Partial<AudienciaSancionatoria>),
      );

      await this.traza(em, procesoId, audiencia.id, 'CITAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        citadaPara: dto.citadaPara,
      });
    });
  }

  /**
   * Registra que la audiencia se celebró.
   *
   * El acta es obligatoria: es la prueba de que el contratista fue oído, y sin
   * ella la decisión posterior se apoyaría en una audiencia que el expediente
   * no puede mostrar.
   */
  async celebrar(
    procesoId: string,
    casoId: string,
    audienciaId: string,
    dto: CelebrarAudienciaDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId);
      const audiencia = await this.exigirAudienciaAbierta(em, caso.id, audienciaId);

      this.exigirFechaPasada(dto.celebradaEl, 'La fecha de la audiencia');

      const acta = await this.guardarDocumento(
        em,
        procesoId,
        `Contrato ${contrato.numero} · acta de audiencia sancionatoria`,
        archivo,
        hash,
        acceso,
      );

      audiencia.estado = 'CELEBRADA';
      audiencia.celebradaEl = dto.celebradaEl;
      audiencia.actaDocumentoId = acta.id;
      audiencia.resumen = dto.resumen;
      audiencia.registradaPor = acceso.userName;
      await em.save(audiencia);

      await this.traza(em, procesoId, audiencia.id, 'CELEBRAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        celebradaEl: dto.celebradaEl,
      });
    });
  }

  /**
   * Registra que la audiencia no se celebró.
   *
   * Suspenderla o cancelarla exige motivo: una audiencia que no se celebró y no
   * dice por qué es exactamente lo que un ente de control pregunta, y de ella
   * depende que el contratista pudiera defenderse.
   */
  async cerrarSinCelebrar(
    procesoId: string,
    casoId: string,
    audienciaId: string,
    estado: Extract<EstadoAudiencia, 'SUSPENDIDA' | 'CANCELADA'>,
    dto: CerrarSinCelebrarDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId);
      const audiencia = await this.exigirAudienciaAbierta(em, caso.id, audienciaId);

      audiencia.estado = estado;
      audiencia.motivo = dto.motivo;
      audiencia.registradaPor = acceso.userName;
      await em.save(audiencia);

      await this.traza(em, procesoId, audiencia.id, 'ANULAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        estado,
        motivo: dto.motivo,
      });
    });
  }

  // -------------------------------------------------------------- decisión --

  /**
   * Decide el caso: archiva, declara el incumplimiento o declara la caducidad.
   *
   * Es donde se cumplen los dos criterios de la historia. El primero, que el
   * sistema gestione el resultado del trámite; el segundo, que la caducidad
   * quede registrada como causal contractual, que es lo que hace que el
   * contrato termine.
   */
  async decidir(
    procesoId: string,
    casoId: string,
    dto: DecidirCasoDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId, true);

      const celebradas = await em.getRepository(AudienciaSancionatoria).count({
        where: { casoId: caso.id, estado: 'CELEBRADA' as EstadoAudiencia },
      });

      const motivo = porQueNoSePuedeDecidir(caso.estado, dto.sentido, celebradas);
      if (motivo) throw new ConflictException(`No se puede decidir el caso: ${motivo}`);

      this.exigirFechaPasada(dto.fechaExpedicion, 'La fecha de la resolución');

      const resolucion = await this.guardarResolucion(
        em,
        procesoId,
        caso,
        contrato.numero,
        'DECISION',
        dto.numero,
        dto.fechaExpedicion,
        archivo,
        hash,
        acceso,
        dto.sentido,
        dto.valorSancion ?? null,
      );

      // La caducidad es lo único que toca el contrato. Se comprueba aquí y no
      // en la regla del caso porque depende del contrato y no del trámite.
      if (terminaElContrato(dto.sentido)) {
        const noPuede = porQueNoSePuedeCaducar(contrato.estado);
        if (noPuede) {
          throw new ConflictException(`No se puede declarar la caducidad: ${noPuede}`);
        }

        resolucion.estadoContratoAntes = contrato.estado;
        contrato.estado = 'TERMINADO';
        await em.save(resolucion);
        await em.save(contrato);
      }

      caso.estado = estadoTrasDecidir(dto.sentido);
      await em.save(caso);

      await this.traza(em, procesoId, resolucion.id, 'DECIDIR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        resolucion: dto.numero,
        sentido: dto.sentido,
        // En palabras, para que la trazabilidad se lea sin el diccionario.
        resuelve: NOMBRE_SENTIDO[dto.sentido],
        valorSancion: dto.valorSancion ?? null,
        audienciasCelebradas: celebradas,
        ...(terminaElContrato(dto.sentido)
          ? { contratoAntes: resolucion.estadoContratoAntes, contratoDespues: 'TERMINADO' }
          : {}),
      });
    });
  }

  /** Registra la notificación de la resolución y, cuando la hay, su firmeza. */
  async notificar(
    procesoId: string,
    casoId: string,
    resolucionId: string,
    dto: NotificarResolucionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId);
      const resolucion = await this.exigirResolucion(em, caso.id, resolucionId);

      this.exigirFechaPasada(dto.notificadaEl, 'La fecha de la notificación');
      if (dto.firmeEl) {
        this.exigirFechaPasada(dto.firmeEl, 'La fecha de la firmeza');
        if (dto.firmeEl < dto.notificadaEl) {
          throw new BadRequestException(
            'La resolución no puede quedar en firme antes de notificarse',
          );
        }
      }

      resolucion.notificadaEl = dto.notificadaEl;
      resolucion.firmeEl = dto.firmeEl ?? null;
      await em.save(resolucion);

      await this.traza(em, procesoId, resolucion.id, 'NOTIFICAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        resolucion: resolucion.numero,
        notificadaEl: dto.notificadaEl,
        firmeEl: dto.firmeEl ?? null,
      });
    });
  }

  /**
   * Revoca una resolución y deshace lo que hizo.
   *
   * Es el camino cuando el recurso prospera o cuando la entidad reconsidera:
   * revocar la decisión devuelve el caso al trámite y, si declaraba la
   * caducidad, devuelve el contrato al estado guardado. La resolución no se
   * borra —se expidió y pudo notificarse— y queda en el expediente con su
   * motivo.
   */
  async revocar(
    procesoId: string,
    casoId: string,
    resolucionId: string,
    dto: RevocarResolucionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { caso, contrato } = await this.exigirCaso(em, procesoId, casoId, true);
      const resolucion = await this.exigirResolucion(em, caso.id, resolucionId);

      resolucion.revocadaAt = new Date();
      resolucion.revocadaPor = acceso.userName;
      resolucion.motivoRevocacion = dto.motivo;

      const deshecho: Record<string, unknown> = {};

      if (resolucion.tipo === 'DECISION') {
        // El caso vuelve al trámite: la apertura sigue viva y lo que se deshizo
        // es la decisión, no la instrucción.
        caso.estado = 'EN_TRAMITE';

        if (resolucion.sentido && terminaElContrato(resolucion.sentido)) {
          const vuelveA = (resolucion.estadoContratoAntes as EstadoContrato) ?? 'EJECUCION';
          contrato.estado = vuelveA;
          await em.save(contrato);
          deshecho.contratoVuelveA = vuelveA;
        }
      } else {
        // Revocar la apertura deshace el trámite entero: sin acto que lo abra
        // no hay procedimiento, y el caso vuelve a ser solo el reporte.
        caso.estado = 'REPORTADO';
        deshecho.casoVuelveA = 'REPORTADO';
      }

      await em.save(resolucion);
      await em.save(caso);

      await this.traza(em, procesoId, resolucion.id, 'REVOCAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        caso: caso.id,
        resolucion: resolucion.numero,
        tipo: resolucion.tipo,
        ...(resolucion.sentido ? { deshace: NOMBRE_SENTIDO[resolucion.sentido] } : {}),
        motivo: dto.motivo,
        ...deshecho,
      });
    });
  }

  // ----------------------------------------------------------- auxiliares --

  private async guardarResolucion(
    em: EntityManager,
    procesoId: string,
    caso: CasoIncumplimiento,
    numeroContrato: string,
    tipo: TipoResolucion,
    numero: string,
    fechaExpedicion: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
    sentido: SentidoResolucion | null = null,
    valorSancion: number | null = null,
  ) {
    const documento = await this.guardarDocumento(
      em,
      procesoId,
      `Contrato ${numeroContrato} · resolución ${numero}`,
      archivo,
      hash,
      acceso,
    );

    return em.save(
      em.create(ResolucionSancionatoria, {
        casoId: caso.id,
        tipo,
        numero,
        fechaExpedicion,
        documentoId: documento.id,
        sentido,
        // Una sanción pecuniaria con el caso archivado sería una contradicción
        // en el mismo acto, y el CHECK de la migración también lo impide.
        valorSancion: sentido === 'ARCHIVA' ? null : valorSancion,
        expedidaPor: acceso.userName,
      } as Partial<ResolucionSancionatoria>),
    );
  }

  private async exigirAudienciaAbierta(em: EntityManager, casoId: string, audienciaId: string) {
    const audiencia = await em
      .getRepository(AudienciaSancionatoria)
      .findOne({ where: { id: audienciaId, casoId } });

    if (!audiencia) throw new NotFoundException('La audiencia no existe en este caso');

    const motivo = porQueNoSePuedeCerrarAudiencia(audiencia.estado);
    if (motivo) throw new ConflictException(`No se puede registrar la audiencia: ${motivo}`);

    return audiencia;
  }

  private async exigirResolucion(em: EntityManager, casoId: string, resolucionId: string) {
    const resolucion = await em
      .getRepository(ResolucionSancionatoria)
      .findOne({ where: { id: resolucionId, casoId, revocadaAt: IsNull() } });

    if (!resolucion) {
      throw new NotFoundException('La resolución no existe en este caso o ya está revocada');
    }

    return resolucion;
  }

  /**
   * El caso y su contrato.
   *
   * `bloquear` toma el contrato para actualizarlo: la caducidad y su revocación
   * mueven su estado, y dos decisiones simultáneas sobre casos distintos del
   * mismo contrato no pueden pisarse.
   */
  private async exigirCaso(
    em: EntityManager,
    procesoId: string,
    casoId: string,
    bloquear = false,
  ) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'")
      .orderBy('c.created_at', 'DESC');

    if (bloquear) consulta.setLock('pessimistic_write');

    const contrato = await consulta.getOne();
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    const caso = await em
      .getRepository(CasoIncumplimiento)
      .findOne({ where: { id: casoId, contratoId: contrato.id } });

    if (!caso) throw new NotFoundException('El caso no existe en este contrato');

    return { caso, contrato };
  }

  /**
   * La fecha es la del hecho ya ocurrido.
   *
   * Vale para las resoluciones, las actas y las notificaciones. La única que se
   * escapa es la citación de la audiencia, que por definición mira adelante.
   */
  private exigirFechaPasada(fecha: string, que: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (fecha > hoy) {
      throw new BadRequestException(`${que} no puede ser posterior a hoy: se registra lo ya hecho`);
    }
  }

  private async guardarDocumento(
    em: EntityManager,
    procesoId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_EJECUCION,
        tipo: 'ADJUNTO',
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
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
        entidad: 'tramite_sancionatorio',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
