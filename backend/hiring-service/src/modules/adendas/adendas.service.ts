import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { Adenda } from '../../entities/adenda.entity';
import { PublicacionPliego } from '../../entities/publicacion-pliego.entity';
import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AnularAdendaDto, EmitirAdendaDto, PublicarAdendaDto } from './dto/adendas.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';
import { ParticipacionService } from '../participacion/participacion.service';

/** Actividad 5.13 de la matriz: las adendas del proceso. */
export const NUMERAL_ADENDAS = '5.13';

/** La apertura del proceso: desde ella se emiten adendas (matriz, 5.13). */
const NUMERAL_APERTURA = '5.7';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AdendasService {
  constructor(
    private readonly dataSource: DataSource,
    /** Si la 5.13 exige firmar con el token institucional al cerrarse (EFDS-2070). */
    private readonly cierre: CierreActividadService,
    /** Solo el abogado dueño del proceso genera adendas (revisión de QA de EFDS-1154). */
    private readonly participacion: ParticipacionService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso?: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_ADENDAS, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const ventana = await this.ventana(this.dataSource.manager, proceso);
    const motivoDuenio = acceso ? await this.motivoNoEsDuenio(procesoId, acceso) : null;
    const esDuenio = !!acceso && motivoDuenio === null;

    const adendas = await this.dataSource.getRepository(Adenda).find({
      where: { procesoId },
      order: { numero: 'ASC' },
    });

    const documentos = await this.archivosDe(
      adendas.flatMap((a) => [a.documentoId, a.evidenciaDocumentoId].filter(Boolean) as string[]),
    );

    const archivo = (id: string | null) => {
      const doc = id ? documentos.get(id) : undefined;
      return doc ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl } : null;
    };

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      // Desde la 112, como en la matriz: «a partir de la apertura pueden
      // generarse en cualquier momento», hasta que se cierran las ofertas.
      publicado: !!ventana.publicacion,
      abierto: !!ventana.apertura,
      puedeEmitir: !excluida && !ventana.motivo && esDuenio,
      motivoNoPuedeEmitir: excluida ? null : (ventana.motivo ?? motivoDuenio),
      /** Cerrada la recepción solo quedan las de cronograma, sin fecha que mover. */
      soloCronograma: !ventana.motivo && !!ventana.motivoFondo,
      /** Si quien mira es el abogado dueño: los demás solo consultan. */
      puedeGestionar: esDuenio,
      motivoNoFondo: ventana.motivoFondo,
      // La fecha que mueve una adenda de cronograma: el cierre de ofertas si
      // el proceso ya se abrió, o el plazo de observaciones donde no hay
      // apertura.
      vencimientoVigente: ventana.vencimiento,
      mueve: ventana.recepcion ? 'CIERRE_OFERTAS' : 'PLAZO_OBSERVACIONES',
      adendas: adendas.map((a) => ({
        id: a.id,
        numero: a.numero,
        tipo: a.tipo,
        objeto: a.objeto,
        estado: a.estado,
        emitidaPor: a.emitidaPor,
        emitidaAt: a.createdAt,
        fechaPublicacion: a.fechaPublicacion,
        publicadaPor: a.publicadaPor,
        vencimientoAnterior: a.vencimientoAnterior,
        vencimientoNuevo: a.vencimientoNuevo,
        motivoAnulacion: a.motivoAnulacion,
        documento: archivo(a.documentoId),
        evidencia: archivo(a.evidenciaDocumentoId),
      })),
    };
  }

  // -------------------------------------------------------------- emisión --

  /**
   * Registra una adenda con su documento firmado.
   *
   * Emitir no publica: la adenda queda en el expediente con su consecutivo,
   * pero no produce efectos hasta que se publique. Es lo que permite prepararla
   * y publicarla el día que corresponda.
   */
  async emitir(
    procesoId: string,
    dto: EmitirAdendaDto,
    documento: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.exigirDuenio(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const excluida = await em.getRepository(ActividadExcluida).findOne({
        where: { numeral: NUMERAL_ADENDAS, modalidad: proceso.modalidad ?? '' },
      });
      if (excluida) {
        throw new BadRequestException(`Esta modalidad no admite adendas: ${excluida.motivo}`);
      }

      const ventana = await this.ventana(em, proceso);
      if (ventana.motivo) throw new ConflictException(ventana.motivo);
      if (dto.tipo === 'FONDO' && ventana.motivoFondo) {
        throw new ConflictException(ventana.motivoFondo);
      }

      // Cerrada la recepción, la de cronograma no mueve ninguna fecha que la
      // plataforma controle (las de evaluación y adjudicación van en el
      // documento): se registra y se publica sin nuevo vencimiento.
      const sinFechaQueMover = dto.tipo === 'CRONOGRAMA' && !!ventana.motivoFondo;
      if (dto.tipo === 'CRONOGRAMA' && !sinFechaQueMover && !dto.vencimientoNuevo) {
        throw new BadRequestException(
          'Una adenda de cronograma necesita la nueva fecha de vencimiento (YYYY-MM-DD)',
        );
      }

      if (dto.tipo === 'CRONOGRAMA' && !sinFechaQueMover) {
        // Abierto el proceso, lo que se prorroga es el cierre de ofertas. Si la
        // modalidad no lo tiene parametrizado y nadie lo ha fijado, no hay
        // fecha que mover; tomar la del plazo de observaciones movería otra.
        if (ventana.apertura && !ventana.recepcion) {
          throw new ConflictException(
            'Todavía no hay plazo de ofertas que prorrogar: fíjalo primero en la recepción de ofertas (6.1)',
          );
        }
        this.validarNuevoVencimiento(dto.vencimientoNuevo!, ventana);
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Adenda ${dto.tipo === 'FONDO' ? 'de requisitos' : 'de cronograma'}`,
        documento,
        hash,
        acceso,
      );

      const adenda = await em.save(
        em.create(Adenda, {
          procesoId,
          numero: await this.siguienteNumero(em, procesoId),
          tipo: dto.tipo,
          objeto: dto.objeto,
          documentoId: doc.id,
          estado: 'EMITIDA' as const,
          emitidaPor: acceso.userName,
          vencimientoNuevo:
            dto.tipo === 'CRONOGRAMA' && !sinFechaQueMover ? dto.vencimientoNuevo! : null,
        }),
      );

      // La actividad queda en curso: hay adendas, pero mientras alguna esté sin
      // publicar el trabajo no está terminado.
      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, adenda.id, 'CREAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        tipo: dto.tipo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- publicación --

  /**
   * Publica una adenda emitida y, si es de cronograma, mueve el plazo.
   *
   * Aquí es donde la adenda produce efectos: el segundo criterio de la historia
   * dice que al publicarse una de cronograma el sistema actualiza las fechas
   * del proceso. Se hace en la misma transacción que la publicación, porque una
   * adenda publicada cuyo plazo no se movió dejaría el expediente diciendo una
   * cosa y el control de términos contando otra.
   */
  async publicar(
    procesoId: string,
    adendaId: string,
    dto: PublicarAdendaDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.exigirDuenio(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const adenda = await em.getRepository(Adenda).findOne({ where: { id: adendaId, procesoId } });
      if (!adenda) throw new NotFoundException('La adenda no existe en este proceso');

      if (adenda.estado === 'PUBLICADA') {
        throw new ConflictException(`La adenda ${adenda.numero} ya fue publicada`);
      }
      if (adenda.estado === 'ANULADA') {
        throw new ConflictException(`La adenda ${adenda.numero} fue anulada`);
      }

      const proceso = await this.exigirProceso(em, procesoId);
      const ventana = await this.ventana(em, proceso);
      if (ventana.motivo) throw new ConflictException(ventana.motivo);
      if (adenda.tipo === 'FONDO' && ventana.motivoFondo) {
        throw new ConflictException(ventana.motivoFondo);
      }
      const publicacion = ventana.publicacion!;

      this.validarFechaPublicacion(dto.fechaPublicacion, publicacion.fechaPublicacion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const soporte = await this.guardarDocumento(
        em,
        expediente.id,
        `Evidencia de la publicación de la adenda ${adenda.numero}`,
        evidencia,
        hash,
        acceso,
      );

      adenda.estado = 'PUBLICADA';
      adenda.fechaPublicacion = dto.fechaPublicacion;
      adenda.evidenciaDocumentoId = soporte.id;
      adenda.publicadaPor = acceso.userName;

      if (adenda.tipo === 'CRONOGRAMA' && adenda.vencimientoNuevo) {
        // Se revalida contra el vencimiento de hoy y no contra el de cuando se
        // emitió: entre una cosa y otra pudo publicarse otra adenda.
        if (ventana.apertura && !ventana.recepcion) {
          throw new ConflictException(
            'Todavía no hay plazo de ofertas que prorrogar: fíjalo primero en la recepción de ofertas (6.1)',
          );
        }
        this.validarNuevoVencimiento(adenda.vencimientoNuevo!, ventana);

        adenda.vencimientoAnterior = ventana.vencimiento;
        if (ventana.recepcion) {
          // Con el proceso abierto, lo que la adenda prorroga es el cierre de
          // ofertas. Se conserva la hora del cronograma: la adenda mueve el
          // día, no la hora a la que cierra la recepción.
          const recepcion = ventana.recepcion;
          recepcion.vencimiento = new Date(
            `${adenda.vencimientoNuevo}T${horaEnBogota(recepcion.vencimiento)}-05:00`,
          );
          // Deja de ser el plazo calculado, igual que al fijarlo a mano.
          recepcion.plazoDiasHabiles = null;
          await em.save(recepcion);
        } else {
          publicacion.fechaVencimiento = adenda.vencimientoNuevo;
          await em.save(publicacion);
        }
      }

      await em.save(adenda);
      await this.marcarActividad(em, procesoId, acceso, dto.firma);

      await this.traza(em, procesoId, adenda.id, 'PUBLICAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        tipo: adenda.tipo,
        fechaPublicacion: dto.fechaPublicacion,
        ...(adenda.tipo === 'CRONOGRAMA' && adenda.vencimientoNuevo
          ? {
              vencimientoAnterior: adenda.vencimientoAnterior,
              vencimientoNuevo: adenda.vencimientoNuevo,
            }
          : {}),
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Anula una adenda emitida por error.
   *
   * Solo antes de publicarla: una vez publicada ya produjo efectos frente a
   * terceros, y deshacerla es otra adenda, no un borrado.
   */
  async anular(procesoId: string, adendaId: string, dto: AnularAdendaDto, acceso: HiringAccess) {
    await this.exigirDuenio(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const adenda = await em.getRepository(Adenda).findOne({ where: { id: adendaId, procesoId } });
      if (!adenda) throw new NotFoundException('La adenda no existe en este proceso');

      if (adenda.estado === 'PUBLICADA') {
        throw new ConflictException(
          `La adenda ${adenda.numero} ya fue publicada: para dejarla sin efecto se emite otra adenda`,
        );
      }
      if (adenda.estado === 'ANULADA') {
        throw new ConflictException(`La adenda ${adenda.numero} ya está anulada`);
      }

      adenda.estado = 'ANULADA';
      adenda.anuladaAt = new Date();
      adenda.anuladaPor = acceso.userName;
      adenda.motivoAnulacion = dto.motivo;
      await em.save(adenda);

      await this.marcarActividad(em, procesoId, acceso, dto.firma);

      await this.traza(em, procesoId, adenda.id, 'ANULAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Si hoy se pueden emitir y publicar adendas, y qué fecha mueve una de
   * cronograma.
   *
   * La matriz (5.13): «a partir de la apertura pueden generarse en cualquier
   * momento». Hasta la 112 era al revés —se emitían antes de abrir y la
   * apertura las cerraba—. Ahora:
   *
   *   · Hace falta el pliego publicado: una adenda modifica algo público.
   *   · Donde la modalidad tiene apertura, hace falta la apertura. Donde no la
   *     tiene —mínima cuantía, 092— basta la publicación.
   *   · Se acaban al cerrar la recepción de ofertas: después ya no hay pliego
   *     sobre el que ofertar, y mover el cierre cambiaría una regla ya aplicada.
   *
   * Con el proceso abierto, una de cronograma prorroga el cierre de ofertas;
   * sin apertura, el plazo de observaciones, como antes.
   */
  private async ventana(em: EntityManager, proceso: Proceso) {
    const procesoId = proceso.id;
    const [publicacion, apertura, recepcion, sinApertura, acto] = await Promise.all([
      this.publicacionVigente(procesoId, em),
      em.getRepository(AperturaProceso).findOne({ where: { procesoId } }),
      em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } }),
      em.getRepository(ActividadExcluida).findOne({
        where: { numeral: NUMERAL_APERTURA, modalidad: proceso.modalidad ?? '' },
      }),
      em.getRepository(ActoAdjudicacion).findOne({ where: { procesoId, estado: 'VIGENTE' } }),
    ]);

    // Revisión de QA de EFDS-1154: las adendas se generan cuando se
    // necesiten, no en una actividad fija. Las de fondo cambian el pliego y
    // se acaban con el cierre de ofertas; las de cronograma siguen hasta el
    // acto de adjudicación, porque mueven fechas de la evaluación.
    let motivo: string | null = null;
    let motivoFondo: string | null = null;
    if (!publicacion) {
      motivo = 'No hay pliego publicado: una adenda modifica algo que ya se hizo público';
    } else if (!sinApertura && !apertura) {
      motivo = 'El proceso todavía no se ha abierto: las adendas se emiten a partir de la apertura (5.7)';
    } else if (acto) {
      motivo = 'El proceso ya se adjudicó: después del acto de adjudicación no se emiten adendas';
    } else if (recepcion?.estado === 'CERRADA') {
      motivoFondo =
        'La recepción de ofertas ya se cerró: después del cierre solo caben adendas de cronograma';
    }

    const vencimiento =
      recepcion && recepcion.estado !== 'CERRADA'
        ? fechaEnBogota(recepcion.vencimiento)
        : recepcion || apertura
          ? null
          : (publicacion?.fechaVencimiento ?? null);

    return { publicacion, apertura, recepcion, motivo, motivoFondo, vencimiento };
  }

  /**
   * Una adenda de cronograma prorroga: no puede llevar el vencimiento al
   * pasado ni acortarlo.
   *
   * Acortar un plazo ya anunciado recortaría el término de quien todavía puede
   * observar el pliego o presentar su oferta, y el módulo cuenta lo que llega
   * fuera de término contra esa misma fecha.
   */
  private validarNuevoVencimiento(
    nuevo: string,
    ventana: { publicacion: PublicacionPliego | null; vencimiento: string | null },
  ) {
    if (ventana.publicacion && nuevo <= ventana.publicacion.fechaPublicacion) {
      throw new BadRequestException(
        'El nuevo vencimiento debe ser posterior a la fecha de publicación del pliego',
      );
    }

    if (ventana.vencimiento && nuevo <= ventana.vencimiento) {
      throw new BadRequestException(
        `El nuevo vencimiento (${nuevo}) debe ser posterior al vigente (${ventana.vencimiento}): una adenda de cronograma prorroga el plazo`,
      );
    }
  }

  /** La adenda se publica el día que se publica; no en el futuro. */
  private validarFechaPublicacion(fecha: string, fechaPublicacionPliego: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de publicación de la adenda no puede ser posterior a hoy',
      );
    }
    if (fecha < fechaPublicacionPliego) {
      throw new BadRequestException(
        'La adenda no puede publicarse antes que el pliego que modifica',
      );
    }
  }

  private async siguienteNumero(em: EntityManager, procesoId: string): Promise<number> {
    // Cuenta todas, incluidas las anuladas: el consecutivo de una adenda que
    // llegó a existir no se reutiliza, o dos documentos distintos acabarían
    // citándose como "adenda 2".
    const [{ maximo }] = await em.query(
      `SELECT COALESCE(MAX(numero), 0)::int AS maximo FROM hiring.adendas WHERE proceso_id = $1`,
      [procesoId],
    );
    return maximo + 1;
  }

  private publicacionVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(PublicacionPliego).findOne({
      where: { procesoId, anuladaAt: IsNull() },
    });
  }

  /**
   * La actividad se da por cumplida cuando ninguna adenda queda sin publicar.
   *
   * Un proceso sin adendas no la necesita, así que solo se marca desde que se
   * emite la primera: antes de eso no hay nada pendiente que señalar.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const pendientes = await em.getRepository(Adenda).count({
      where: { procesoId, estado: 'EMITIDA' },
    });

    const estado = pendientes === 0 ? 'APROBADO' : 'BORRADOR';
    const aprobado = estado === 'APROBADO';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ADENDAS },
    });

    // Solo se pide firma al cerrar: si ya estaba cerrada, no se repite el
    // pedido (EFDS-2070).
    if (aprobado && actividad?.estado !== 'APROBADO' && (await this.cierre.exigeFirma(em, NUMERAL_ADENDAS))) {
      this.cierre.exigirFirmaValida(firma);
    }

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_ADENDAS,
          estado: estado as any,
          datos: aprobado && firma ? { firma } : {},
          ...(aprobado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = aprobado ? acceso.userName : null;
    actividad.revisadoAt = aprobado ? new Date() : null;
    if (aprobado && firma) {
      actividad.datos = { ...(actividad.datos ?? {}), firma };
    }
    await em.save(actividad);
  }

  private async archivosDe(ids: string[]): Promise<Map<string, Documento>> {
    if (ids.length === 0) return new Map();

    const documentos = await this.dataSource.getRepository(Documento).find({
      where: { id: In(ids) },
    });
    return new Map(documentos.map((d) => [d.id, d]));
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        numeral: NUMERAL_ADENDAS,
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

  /**
   * Por qué quien mira no puede generar adendas, o null si puede.
   *
   * Las genera el abogado dueño del proceso: quien ocupa el puesto que la
   * regla «quién la hace» de la 5.13 nombra (abogado estructurador, 129). Los
   * demás solo las consultan.
   */
  private async motivoNoEsDuenio(procesoId: string, acceso: HiringAccess): Promise<string | null> {
    const { responsable, puesto, motivo } = await this.participacion.quienHace(
      procesoId,
      acceso,
      NUMERAL_ADENDAS,
    );
    if (motivo === 'SIN_ASIGNAR') {
      return `Las adendas las genera quien ocupe el puesto ${puesto} y en este proceso todavía no hay nadie: se asigna en la 3.3`;
    }
    if (motivo === 'NO_ES_TUYO') {
      return `Las adendas las genera ${responsable?.nombre ?? 'el abogado del proceso'}${puesto ? ` (${puesto})` : ''}`;
    }
    if (motivo === 'SIN_PERMISO') return 'No tienes permiso para generar adendas';
    return null;
  }

  private async exigirDuenio(procesoId: string, acceso: HiringAccess) {
    const motivo = await this.motivoNoEsDuenio(procesoId, acceso);
    if (motivo) throw new ForbiddenException(motivo);
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
        entidad: 'adendas',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

/** El día de un instante, en Bogotá. */
function fechaEnBogota(instante: Date): string {
  return instante.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/** La hora de un instante en Bogotá, como HH:MM:SS. */
function horaEnBogota(instante: Date): string {
  return instante.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour12: false });
}
