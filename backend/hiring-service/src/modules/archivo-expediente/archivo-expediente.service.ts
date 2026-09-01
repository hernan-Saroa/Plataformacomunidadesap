import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import {
  DestinoPublicacionActa,
  NUMERAL_ARCHIVO_EXPEDIENTE,
  PlazoPublicacionActa,
  PublicacionActa,
} from '../../entities/publicacion-acta.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { CierreFinanciero } from '../../entities/cierre-financiero.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  aYMD,
  diasHabilesRestantes,
  estadoDelPlazo,
  sumarDiasHabiles,
} from '../publicacion/dias-habiles';
import { festivosEntre } from '../publicacion/festivos-colombia';
import {
  construirIndice,
  exigirExpedienteAbierto,
  pendientesParaArchivar,
} from './expediente-archivado';
import {
  ArchivarExpedienteDto,
  PublicarActaDto,
  ReabrirExpedienteDto,
} from './dto/archivo-expediente.dto';

export { NUMERAL_ARCHIVO_EXPEDIENTE };

/** Los dos sitios donde puede quedar publicada el acta. */
const DESTINOS: DestinoPublicacionActa[] = ['SECOP_II', 'WEB_ESAP'];

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Publicación del acta y archivo del expediente — actividad 10.4
 * (EFDS-1174, RF-LIQ-04 y RF-SIS-04).
 *
 * Es la última actividad del proceso: liquidado y cerrado financieramente el
 * contrato, el Archivo de Gestión publica el acta y archiva el expediente, que
 * queda disponible para consulta y auditoría.
 *
 * **La plataforma no publica ni archiva por sí sola.** La publicación ocurre en
 * SECOP II y el archivo documental en Active Document; aquí se transcribe el
 * hecho con su soporte, igual que en toda la etapa 5 y en el cierre financiero.
 * Lo que sí hace la plataforma es congelar el índice de lo que el expediente
 * contenía ese día, que es lo que convierte el archivo en prueba.
 */
@Injectable()
export class ArchivoExpedienteService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const contrato = await this.contratoDelProceso(em, procesoId);
    const plazo = await this.plazoConfigurado();

    if (!contrato) {
      return {
        contrato: null,
        acta: null,
        plazo,
        publicaciones: [] as unknown[],
        pendientesPublicacion: [] as DestinoPublicacionActa[],
        expediente: await this.verExpediente(em, procesoId),
        puedeArchivar: false,
        pendientesArchivo: ['el proceso todavía no tiene contrato generado'],
      };
    }

    const acta = await this.actaVigente(em, contrato.id);
    const publicaciones = acta
      ? await em.getRepository(PublicacionActa).find({
          where: { actaId: acta.id },
          order: { fechaPublicacion: 'ASC' },
        })
      : [];

    const cierre = await this.cierreVigente(em, contrato.id);
    const expediente = await this.verExpediente(em, procesoId);

    const pendientes = pendientesParaArchivar({
      actaVigente: !!acta,
      publicadaEnSecop: publicaciones.some((p) => p.destino === 'SECOP_II'),
      cierreVigente: !!cierre,
    });

    const festivos = await this.festivos();
    const hoy = this.hoy();

    return {
      contrato: { numero: contrato.numero, objeto: contrato.objeto, estado: contrato.estado },
      acta: acta
        ? { id: acta.id, tipo: acta.tipo, fechaActa: acta.fechaActa }
        : null,
      plazo,
      publicaciones: publicaciones.map((p) => {
        const restantes = p.fechaLimite
          ? diasHabilesRestantes(hoy, p.fechaLimite, festivos)
          : null;

        return {
          id: p.id,
          destino: p.destino,
          fechaPublicacion: p.fechaPublicacion,
          fechaLimite: p.fechaLimite,
          plazoDiasHabiles: p.plazoDiasHabiles,
          secopNumero: p.secopNumero,
          secopUrl: p.secopUrl,
          publicadoPor: p.publicadoPor,
          // Publicar tarde es un hallazgo, no un detalle: se dice.
          aTiempo: p.fechaLimite ? p.fechaPublicacion <= p.fechaLimite : null,
          diasHabilesRestantes: restantes,
          estadoPlazo: estadoDelPlazo(restantes),
        };
      }),
      // Qué destinos faltan lo dice el servidor: la pantalla no tiene por qué
      // conocer la lista ni cómo se compara.
      pendientesPublicacion: acta
        ? DESTINOS.filter((d) => !publicaciones.some((p) => p.destino === d))
        : [],
      expediente,
      puedeArchivar: pendientes.length === 0 && expediente?.estado !== 'ARCHIVADO',
      pendientesArchivo: pendientes,
    };
  }

  // ---------------------------------------------------------- publicación --

  /**
   * Registra que el acta se publicó.
   *
   * El plazo se cuenta desde la fecha del acta y no desde la liquidación
   * registrada en el sistema: lo que obliga a publicar es la expedición del
   * documento.
   */
  async publicar(
    procesoId: string,
    dto: PublicarActaDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const acta = await this.actaVigente(em, contrato.id);
      if (!acta) {
        throw new ConflictException(
          'El contrato todavía no tiene acta de liquidación vigente: no hay acta que publicar (10.2)',
        );
      }

      const repetida = await em.getRepository(PublicacionActa).findOne({
        where: { actaId: acta.id, destino: dto.destino },
      });
      if (repetida) {
        throw new ConflictException(
          dto.destino === 'SECOP_II'
            ? 'El acta ya se registró como publicada en SECOP II'
            : 'El acta ya se registró como publicada en la página web de la ESAP',
        );
      }

      this.validarFecha(dto.fechaPublicacion);

      const expediente = await exigirExpedienteAbierto(em, procesoId);
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const plazo = await this.plazoConfigurado();
      const festivos = await this.festivos();
      const fechaLimite = sumarDiasHabiles(
        acta.fechaActa ?? dto.fechaPublicacion,
        plazo.diasHabiles,
        festivos,
      );

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Acta de liquidación · evidencia de publicación (${dto.destino === 'SECOP_II' ? 'SECOP II' : 'web ESAP'})`,
        evidencia,
        hash,
        acceso,
      );

      const publicacion = await em.save(
        em.create(PublicacionActa, {
          actaId: acta.id,
          destino: dto.destino,
          fechaPublicacion: dto.fechaPublicacion,
          // Congelado: si mañana cambia el parámetro, esta publicación se
          // siguió juzgando con el plazo de su momento.
          plazoDiasHabiles: plazo.diasHabiles,
          fechaLimite,
          secopNumero: dto.secopNumero ?? null,
          secopUrl: dto.secopUrl ?? null,
          documentoId: doc.id,
          publicadoPor: acceso.userName,
        } as Partial<PublicacionActa>),
      );

      await this.traza(em, procesoId, publicacion.id, 'publicacion_acta', 'PUBLICAR', acceso, {
        actividad: NUMERAL_ARCHIVO_EXPEDIENTE,
        contrato: contrato.numero,
        destino: dto.destino,
        fechaPublicacion: dto.fechaPublicacion,
        fechaLimite,
        aTiempo: dto.fechaPublicacion <= fechaLimite,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------- archivo --

  /**
   * Archiva el expediente y congela su índice documental.
   *
   * El índice es la mitad del acto: sin él, «archivado» sería una etiqueta que
   * no prueba nada, y RF-SIS-04 pide un expediente trazable ante auditoría.
   */
  async archivar(procesoId: string, dto: ArchivarExpedienteDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const acta = await this.actaVigente(em, contrato.id);
      const publicadaEnSecop = acta
        ? !!(await em
            .getRepository(PublicacionActa)
            .findOne({ where: { actaId: acta.id, destino: 'SECOP_II' } }))
        : false;

      const pendientes = pendientesParaArchivar({
        actaVigente: !!acta,
        publicadaEnSecop,
        cierreVigente: !!(await this.cierreVigente(em, contrato.id)),
      });

      if (pendientes.length > 0) {
        throw new ConflictException(
          `Todavía no se puede archivar el expediente: ${pendientes.join('; ')}`,
        );
      }

      const expediente = await em
        .getRepository(Expediente)
        .createQueryBuilder('e')
        .where('e.proceso_id = :procesoId', { procesoId })
        .setLock('pessimistic_write')
        .getOne();

      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');
      if (expediente.estado === 'ARCHIVADO') {
        throw new ConflictException('El expediente ya está archivado');
      }

      const indice = await construirIndice(em, expediente.id);

      expediente.estado = 'ARCHIVADO';
      expediente.archivadoAt = new Date();
      expediente.archivadoPor = acceso.userName;
      expediente.indiceDocumental = indice;
      expediente.radicadoActiveDocument = dto.radicadoActiveDocument ?? null;
      expediente.observacionesArchivo = dto.observaciones ?? null;
      await em.save(expediente);

      await this.marcarActividad(em, procesoId, true, acceso);

      await this.traza(em, procesoId, expediente.id, 'expediente', 'ARCHIVAR', acceso, {
        actividad: NUMERAL_ARCHIVO_EXPEDIENTE,
        contrato: contrato.numero,
        expediente: expediente.numeroExpediente,
        totalDocumentos: indice.totalDocumentos,
        radicadoActiveDocument: dto.radicadoActiveDocument ?? null,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Reabre un expediente archivado.
   *
   * **El índice no se toca.** Sigue diciendo qué había el día del archivo, que
   * es justamente lo que permite ver qué se movió después. Se sobrescribe solo
   * cuando el expediente se vuelve a archivar.
   */
  async reabrir(procesoId: string, dto: ReabrirExpedienteDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const expediente = await em
        .getRepository(Expediente)
        .createQueryBuilder('e')
        .where('e.proceso_id = :procesoId', { procesoId })
        .setLock('pessimistic_write')
        .getOne();

      if (!expediente) throw new NotFoundException('El proceso no tiene expediente');
      if (expediente.estado !== 'ARCHIVADO') {
        throw new ConflictException('El expediente no está archivado');
      }

      expediente.estado = 'ABIERTO';
      expediente.reabiertoAt = new Date();
      expediente.reabiertoPor = acceso.userName;
      expediente.motivoReapertura = dto.motivo;
      await em.save(expediente);

      await this.marcarActividad(em, procesoId, false, acceso);

      await this.traza(em, procesoId, expediente.id, 'expediente', 'REABRIR', acceso, {
        actividad: NUMERAL_ARCHIVO_EXPEDIENTE,
        expediente: expediente.numeroExpediente,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  private async verExpediente(em: EntityManager, procesoId: string) {
    const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
    if (!expediente) return null;

    return {
      id: expediente.id,
      numeroExpediente: expediente.numeroExpediente,
      estado: expediente.estado,
      fechaApertura: expediente.fechaApertura,
      archivadoAt: expediente.archivadoAt,
      archivadoPor: expediente.archivadoPor,
      radicadoActiveDocument: expediente.radicadoActiveDocument,
      observacionesArchivo: expediente.observacionesArchivo,
      indiceDocumental: expediente.indiceDocumental,
      reabiertoAt: expediente.reabiertoAt,
      reabiertoPor: expediente.reabiertoPor,
      motivoReapertura: expediente.motivoReapertura,
    };
  }

  private async plazoConfigurado() {
    const plazo = await this.dataSource
      .getRepository(PlazoPublicacionActa)
      .findOne({ where: { id: 1 } });

    // Si la fila no está sembrada se usa el plazo general del SECOP, marcado
    // sin confirmar: dejar la actividad sin plazo la volvería inutilizable.
    return {
      diasHabiles: plazo?.diasHabiles ?? 3,
      fundamento: plazo?.fundamento ?? null,
      confirmado: plazo?.confirmado ?? false,
    };
  }

  /**
   * El calendario de días hábiles, festivos colombianos incluidos.
   *
   * Se toma del mismo sitio que la publicidad del pliego y la publicación del
   * contrato: tres calendarios distintos terminarían dando tres respuestas para
   * la misma fecha.
   */
  private async festivos(): Promise<ReadonlySet<string>> {
    const anio = new Date().getFullYear();
    const calculados = festivosEntre(anio - 1, anio + 2);

    const registrados = await this.dataSource.getRepository(DiaNoHabil).find();
    for (const dia of registrados) calculados.add(dia.fecha);

    return calculados;
  }

  private hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /** La publicación ya ocurrió; no se registra hacia el futuro. */
  private validarFecha(fecha: string) {
    if (fecha > this.hoy()) {
      throw new BadRequestException(
        'La fecha de publicación no puede ser posterior a hoy: es la del hecho ya ocurrido',
      );
    }
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContrato(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');
    return contrato;
  }

  private actaVigente(em: EntityManager, contratoId: string) {
    return em
      .getRepository(ActaLiquidacion)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private cierreVigente(em: EntityManager, contratoId: string) {
    return em
      .getRepository(CierreFinanciero)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  /**
   * La actividad 10.4 en el riel del proceso.
   *
   * La cumple el archivo del expediente, no la publicación: publicar es el
   * trámite, archivar es el hecho que cierra el proceso. Reabrir la devuelve a
   * borrador, porque mientras el expediente esté abierto vuelve a estar en
   * curso.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    archivado: boolean,
    acceso: HiringAccess,
  ) {
    const estado = archivado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_ARCHIVO_EXPEDIENTE } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_ARCHIVO_EXPEDIENTE,
          estado: estado as any,
          datos: {},
          ...(archivado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = archivado ? acceso.userName : null;
    actividad.revisadoAt = archivado ? new Date() : null;
    await em.save(actividad);
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
        numeral: NUMERAL_ARCHIVO_EXPEDIENTE,
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
    entidad: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad,
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
