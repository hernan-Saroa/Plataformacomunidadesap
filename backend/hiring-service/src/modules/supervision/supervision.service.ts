import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import { DataSource, EntityManager, In } from 'typeorm';

import { alMenos, Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  DesignarSupervisorDto,
  ReasignarSupervisorDto,
  RelevarSupervisorDto,
} from './dto/supervision.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';
import { PuestosService } from '../participacion/puestos.service';
import { AdjuntoCorreo, Campana } from '../notificaciones/campana';
import { STORAGE_PATH } from '../archivos';

/** Actividad 8.2 de la matriz: la designación del supervisor. */
export const NUMERAL_SUPERVISOR = '8.2';

/**
 * Si el contrato admite que se le designe supervisor.
 *
 * Aquí las dos fuentes se contradicen, y manda la matriz:
 *
 * - La matriz sitúa la designación en el puesto 2 de la etapa, antes de las
 *   garantías (8.4) y la ARL (8.5).
 * - La historia EFDS-1165 dice «dado un contrato legalizado», y legalizado
 *   significa precisamente que 8.4 y 8.5 ya están aprobadas.
 *
 * Exigir la legalización haría inalcanzable el puesto que la matriz le da: no
 * hay contrato legalizado en el momento 8.2. Se sigue la matriz, que es la
 * fuente funcional del flujo, y basta con que el contrato esté perfeccionado
 * —firmado por las dos partes—, que es lo que el puesto 2 supone.
 *
 * Queda como desviación consciente del criterio de EFDS-1165, anotada en la
 * historia para que la Dirección de Contratación resuelva cuál de las dos
 * fuentes corrige. Función pura para poder probar la regla sin base de datos.
 */
export function admiteSupervisor(estado: EstadoContrato): boolean {
  return alMenos(estado, 'PERFECCIONADO');
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Un documento que se le manda al supervisor, ya con su hash calculado. */
export interface AnexoCargado {
  archivo: ArchivoCargado;
  hash: string;
}

/**
 * Cuánto pueden pesar los adjuntos de un correo (124).
 *
 * notifications-service recibe el JSON hasta 45 MB y el base64 engorda un
 * tercio; los buzones institucionales suelen rechazar más de 25 MB. Lo que no
 * cabe no detiene el correo: sale sin ese archivo y el texto lo dice.
 */
export const MAX_BYTES_CORREO = 25 * 1024 * 1024;

/** Lo que un documento del expediente necesita para viajar en el correo. */
export interface DocumentoParaCorreo {
  nombre: string;
  tamano: number;
}

/**
 * Qué documentos caben en el correo, en el orden en que llegan.
 *
 * El acto va primero: es lo que lo designa. Si uno no cabe se sigue con los
 * demás, que quizá sí; los que quedan fuera se nombran en el mensaje para que
 * el supervisor sepa que existen y los pida o los busque en la plataforma.
 */
export function repartirEnElCorreo<T extends DocumentoParaCorreo>(
  documentos: T[],
  presupuesto = MAX_BYTES_CORREO,
): { caben: T[]; quedanFuera: T[] } {
  const caben: T[] = [];
  const quedanFuera: T[] = [];
  let usado = 0;
  for (const doc of documentos) {
    if (usado + doc.tamano <= presupuesto) {
      caben.push(doc);
      usado += doc.tamano;
    } else {
      quedanFuera.push(doc);
    }
  }
  return { caben, quedanFuera };
}

/** Si el correo salió, y a quién; sin correo, por qué. */
export interface ResultadoCorreo {
  enviado: boolean;
  para: string | null;
  adjuntos: string[];
  quedanFuera: string[];
  motivo: string | null;
}

/**
 * Designación del supervisor del contrato — actividad 8.2 (EFDS-1165).
 *
 * Mismo modelo que el comité evaluador (EFDS-1156): el acto administrativo no
 * es un adjunto más, es lo que convierte un nombre en un supervisor.
 */
@Injectable()
export class SupervisionService {
  private readonly logger = new Logger(SupervisionService.name);
  private readonly campana: Campana;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cierre: CierreActividadService,
    private readonly puestos: PuestosService,
  ) {
    this.campana = new Campana(dataSource, this.logger);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        admiteSupervisor: false,
        motivoNoAdmite: 'el proceso todavía no tiene contrato generado',
        supervisor: null,
        historial: [] as any[],
        avisoPendiente: false,
      };
    }

    const admite = admiteSupervisor(contrato.estado);
    const vigente = await this.supervisorVigente(contrato.id);
    const puesto = await this.puestos.puestoDelSupervisor(procesoId);

    // El historial completo: quien vigiló los primeros meses respondió por
    // ellos, así que el expediente conserva a los relevados con su motivo.
    const todas = await this.dataSource.getRepository(SupervisionContrato).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });

    const acto = vigente
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: vigente.actoDocumentoId } })
      : null;
    const anexos = vigente?.anexosCorreo?.length
      ? await this.dataSource
          .getRepository(Documento)
          .find({ where: { id: In(vigente.anexosCorreo) }, order: { createdAt: 'ASC' } })
      : [];

    return {
      admiteSupervisor: admite,
      motivoNoAdmite: admite
        ? null
        : 'el contrato todavía no lo han firmado las dos partes',
      contrato: { numero: contrato.numero, objeto: contrato.objeto },
      /**
       * El puesto que llena la designación: el que avala la 9.4 en el flujo
       * (121). Sin él, avala cualquiera con el permiso y la designación solo
       * deja constancia de quién vigila.
       */
      puesto: puesto ? { id: puesto.id, nombre: puesto.nombre } : null,
      puedeDesignar: admite && !vigente,
      supervisor: vigente
        ? {
            id: vigente.id,
            personaId: vigente.personaId,
            usuarioId: vigente.usuarioId,
            nombre: vigente.nombre,
            cargo: vigente.cargo,
            email: vigente.email,
            fechaDesignacion: vigente.fechaDesignacion,
            designadoPor: vigente.designadoPor,
            alertaEnviadaAt: vigente.alertaEnviadaAt,
            acto: acto
              ? { nombre: acto.archivoNombreOriginal ?? acto.nombre, url: acto.archivoUrl }
              : null,
            /** Lo que se le mandó en el correo además del acto (124). */
            anexos: anexos.map((d) => ({
              nombre: d.archivoNombreOriginal ?? d.nombre,
              url: d.archivoUrl,
            })),
            mensajeCorreo: vigente.mensajeCorreo,
          }
        : null,
      /**
       * La matriz pide en 8.2 que se le alerte al supervisor. Lo hace el
       * correo de la designación (124); si no salió, el aviso sigue pendiente
       * y se dice, en vez de callarlo: quien designa tiene que comunicarlo.
       */
      avisoPendiente: !!vigente && !vigente.alertaEnviadaAt,
      historial: todas
        .filter((s) => s.estado === 'RELEVADO')
        .map((s) => ({
          nombre: s.nombre,
          cargo: s.cargo,
          fechaDesignacion: s.fechaDesignacion,
          relevadoAt: s.relevadoAt,
          motivoRelevo: s.motivoRelevo,
        })),
    };
  }

  /** A quién se puede designar: los candidatos del puesto que avala la 9.4. */
  candidatos(procesoId: string, termino: string) {
    return this.puestos.candidatosASupervisor(procesoId, termino);
  }

  // ---------------------------------------------------------- designación --

  async designar(
    procesoId: string,
    dto: DesignarSupervisorDto,
    acto: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
    anexos: AnexoCargado[] = [],
  ) {
    const supervisionId = await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);

      if (await this.supervisorVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene supervisor designado: para cambiarlo se releva al actual y se designa otro',
        );
      }

      this.validarFecha(dto.fechaDesignacion);
      const cuenta = await this.puestos.exigirCandidatoASupervisor(em, procesoId, dto.usuarioId);

      if (await this.cierre.exigeFirma(em, NUMERAL_SUPERVISOR)) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const puestoId = await this.puestos.ocuparPorDesignacion(
        em,
        procesoId,
        cuenta,
        'Se designó otro supervisor en la 8.2',
        acceso,
      );

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · designación de supervisor`,
        acto,
        hash,
        acceso,
      );

      const anexosCorreo = await this.guardarAnexos(em, expediente.id, contrato.numero, anexos, acceso);

      const supervision = await em.save(
        em.create(SupervisionContrato, {
          contratoId: contrato.id,
          actoDocumentoId: doc.id,
          fechaDesignacion: dto.fechaDesignacion,
          personaId: cuenta.personaId,
          usuarioId: cuenta.usuarioId,
          puestoId,
          nombre: cuenta.nombre,
          cargo: dto.cargo ?? null,
          email: cuenta.email,
          designadoPor: acceso.userName,
          estado: 'VIGENTE' as const,
          anexosCorreo,
          mensajeCorreo: dto.mensaje?.trim() || null,
        } as Partial<SupervisionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso, dto.firma);

      await this.traza(em, procesoId, supervision.id, 'DESIGNAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        contrato: contrato.numero,
        supervisor: cuenta.nombre,
        fechaDesignacion: dto.fechaDesignacion,
      });

      return supervision.id;
    });

    // Fuera de la transacción: la designación ya quedó, y si el correo no
    // sale el aviso sigue pendiente en la pantalla, no se pierde el acto.
    const correo = await this.enviarCorreo(procesoId, supervisionId, acceso);
    return { ...(await this.estado(procesoId, acceso)), correo };
  }

  /**
   * Releva al supervisor vigente.
   *
   * No se borra: quien vigiló hasta hoy respondió por ese periodo, y el
   * expediente conserva los dos actos con el motivo del cambio.
   */
  async relevar(procesoId: string, dto: RelevarSupervisorDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene supervisor designado');

      vigente.estado = 'RELEVADO';
      vigente.relevadoAt = new Date();
      vigente.relevadoPor = acceso.userName;
      vigente.motivoRelevo = dto.motivo;
      await em.save(vigente);
      // El puesto queda vacío con él: nadie avala hasta que se designe otro.
      await this.puestos.liberarPorDesignacion(em, procesoId, dto.motivo, acceso);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, vigente.id, 'REVOCAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        contrato: contrato.numero,
        supervisor: vigente.nombre,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Reasigna la supervisión: releva al vigente y designa al nuevo (EFDS-1169).
   *
   * En un solo acto y no en dos pasos. Relevar y designar por separado deja el
   * contrato sin quien lo vigile entre una cosa y otra, y si el segundo paso
   * falla queda así indefinidamente. La historia habla de «reasignar», que es
   * un cambio de responsable, no una baja seguida de un alta.
   *
   * El acto administrativo es obligatorio, igual que en la designación: el
   * criterio dice «reasigna el supervisor por acto administrativo», y sin él
   * habría un cambio de nombre sin nada que lo respalde.
   *
   * Sobre cuándo puede hacerse: el criterio dice «dado un contrato en
   * ejecución», pero la historia y la matriz (9.3) dicen «en cualquier
   * momento». Se sigue la matriz —como en 8.2— y basta con que haya supervisor
   * designado: si el titular se va entre la designación y el acta de inicio,
   * exigir la ejecución dejaría el contrato con un supervisor que ya no está.
   */
  async reasignar(
    procesoId: string,
    dto: ReasignarSupervisorDto,
    acto: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
    anexos: AnexoCargado[] = [],
  ) {
    const supervisionId = await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);

      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) {
        throw new NotFoundException(
          'El contrato no tiene supervisor designado: no hay a quién reasignar, se designa uno',
        );
      }

      if (vigente.usuarioId === dto.usuarioId) {
        throw new ConflictException(
          'Esa persona ya es el supervisor del contrato: reasignar exige designar a otra',
        );
      }

      this.validarFecha(dto.fechaDesignacion);
      const cuenta = await this.puestos.exigirCandidatoASupervisor(em, procesoId, dto.usuarioId);

      if (await this.cierre.exigeFirma(em, NUMERAL_SUPERVISOR)) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      // Releva al que ocupaba el puesto con el mismo motivo del acto.
      const puestoId = await this.puestos.ocuparPorDesignacion(em, procesoId, cuenta, dto.motivo, acceso);

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · reasignación de supervisor`,
        acto,
        hash,
        acceso,
      );

      // El anterior no se borra: respondió por su periodo, y el expediente
      // conserva los dos actos con el motivo del cambio.
      vigente.estado = 'RELEVADO';
      vigente.relevadoAt = new Date();
      vigente.relevadoPor = acceso.userName;
      vigente.motivoRelevo = dto.motivo;
      await em.save(vigente);

      const anexosCorreo = await this.guardarAnexos(em, expediente.id, contrato.numero, anexos, acceso);

      const nueva = await em.save(
        em.create(SupervisionContrato, {
          contratoId: contrato.id,
          actoDocumentoId: doc.id,
          fechaDesignacion: dto.fechaDesignacion,
          personaId: cuenta.personaId,
          usuarioId: cuenta.usuarioId,
          puestoId,
          nombre: cuenta.nombre,
          cargo: dto.cargo ?? null,
          email: cuenta.email,
          designadoPor: acceso.userName,
          estado: 'VIGENTE' as const,
          anexosCorreo,
          mensajeCorreo: dto.mensaje?.trim() || null,
        } as Partial<SupervisionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso, dto.firma);

      await this.traza(em, procesoId, nueva.id, 'DESIGNAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        contrato: contrato.numero,
        reasignacion: true,
        supervisorAnterior: vigente.nombre,
        supervisor: cuenta.nombre,
        motivo: dto.motivo,
        fechaDesignacion: dto.fechaDesignacion,
      });

      return nueva.id;
    });

    const correo = await this.enviarCorreo(procesoId, supervisionId, acceso);
    return { ...(await this.estado(procesoId, acceso)), correo };
  }

  /**
   * Vuelve a mandarle el correo al supervisor vigente (124).
   *
   * Para cuando no salió —la cuenta no tenía correo, notifications-service
   * estaba caído— o para mandarle documentos que faltaban: los nuevos quedan
   * en el expediente y se suman a los que ya se le habían mandado, así que el
   * correo siempre lleva el paquete completo.
   */
  async reenviarCorreo(
    procesoId: string,
    mensaje: string | undefined,
    anexos: AnexoCargado[],
    acceso: HiringAccess,
  ) {
    const supervisionId = await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene supervisor designado');

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const nuevos = await this.guardarAnexos(em, expediente.id, contrato.numero, anexos, acceso);
      vigente.anexosCorreo = [...(vigente.anexosCorreo ?? []), ...nuevos];
      if (mensaje?.trim()) vigente.mensajeCorreo = mensaje.trim();
      await em.save(vigente);
      return vigente.id;
    });

    // Sin lanzar si no sale: los documentos nuevos ya quedaron en el
    // expediente, y la pantalla dice por qué no salió.
    const correo = await this.enviarCorreo(procesoId, supervisionId, acceso);
    return { ...(await this.estado(procesoId, acceso)), correo };
  }

  /**
   * Deja constancia de que se le avisó al supervisor por fuera de la plataforma.
   *
   * La matriz lo pide en 8.2. Lo normal es que lo marque el correo (124);
   * esto queda para cuando el correo no salió y se le avisó de otra forma.
   */
  async registrarAviso(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene supervisor designado');

      if (vigente.alertaEnviadaAt) {
        throw new ConflictException('Ya quedó constancia de que se le avisó al supervisor');
      }

      vigente.alertaEnviadaAt = new Date();
      await em.save(vigente);

      await this.traza(em, procesoId, vigente.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        supervisor: vigente.nombre,
        aviso: 'comunicado',
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El supervisor vigente del contrato, o nulo si no hay.
   *
   * Lo consultará la etapa 9 (EFDS-1167 y EFDS-1168) para saber quién puede
   * suscribir el acta de inicio y cargar los informes de seguimiento.
   */
  supervisorVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(SupervisionContrato)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  // ----------------------------------------------------------- auxiliares --

  /** El acto ya se firmó; no se designa hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de designación no puede ser posterior a hoy: es la del acto ya firmado',
      );
    }
  }

  /**
   * La actividad se cumple cuando hay supervisor vigente.
   *
   * Al relevar vuelve a quedar en curso: el contrato se queda sin quien lo
   * vigile hasta que se designe otro, y el riel tiene que decirlo.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const aprobado = !!(await this.supervisorVigente(contratoId, em));

    if (!aprobado) {
      const actividad = await em.getRepository(ProcesoActividad).findOne({
        where: { procesoId, numeral: NUMERAL_SUPERVISOR },
      });
      if (!actividad) {
        await em.save(
          em.create(ProcesoActividad, {
            procesoId,
            numeral: NUMERAL_SUPERVISOR,
            estado: 'BORRADOR' as any,
            datos: {},
          }),
        );
        return;
      }
      actividad.estado = 'BORRADOR' as any;
      actividad.revisadoPor = null;
      actividad.revisadoAt = null;
      await em.save(actividad);
      return;
    }

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    await this.cierre.resolverCierre(
      em,
      procesoId,
      NUMERAL_SUPERVISOR,
      proceso?.modalidad ?? null,
      acceso,
      firma,
    );
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    // Dentro de la transacción se bloquea la fila: dos designaciones
    // simultáneas leerían ambas «no hay supervisor» y el índice parcial
    // rechazaría la segunda con un error de llave, no de negocio.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContratoSuscrito(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteSupervisor(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está perfeccionado: el supervisor se designa sobre un contrato que ya firmaron las dos partes',
      );
    }

    return contrato;
  }

  /** Los documentos para el supervisor: al expediente, en la 8.2, como cualquier soporte. */
  private async guardarAnexos(
    em: EntityManager,
    expedienteId: string,
    numeroContrato: string,
    anexos: AnexoCargado[],
    acceso: HiringAccess,
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const { archivo, hash } of anexos) {
      const doc = await this.guardarDocumento(
        em,
        expedienteId,
        `Contrato ${numeroContrato} · para el supervisor · ${archivo.originalname}`,
        archivo,
        hash,
        acceso,
      );
      ids.push(doc.id);
    }
    return ids;
  }

  /**
   * El correo de la designación, con el acto y los documentos (124).
   *
   * Nunca lanza: corre después de que la designación quedó guardada, y un
   * correo que no sale no puede deshacer un acto administrativo. Si sale, deja
   * la constancia del aviso que pide la matriz; si no, el aviso sigue
   * pendiente y la pantalla ofrece reenviarlo o marcarlo a mano.
   */
  private async enviarCorreo(
    procesoId: string,
    supervisionId: string,
    acceso: HiringAccess,
  ): Promise<ResultadoCorreo> {
    const sinEnviar = (para: string | null, motivo: string): ResultadoCorreo => ({
      enviado: false,
      para,
      adjuntos: [],
      quedanFuera: [],
      motivo,
    });

    try {
      const supervision = await this.dataSource
        .getRepository(SupervisionContrato)
        .findOne({ where: { id: supervisionId } });
      if (!supervision) return sinEnviar(null, 'la designación no existe');
      if (!supervision.email) {
        return sinEnviar(null, `la cuenta de ${supervision.nombre} no tiene correo registrado`);
      }

      const contrato = await this.dataSource
        .getRepository(Contrato)
        .findOne({ where: { id: supervision.contratoId } });
      const proceso = await this.dataSource.getRepository(Proceso).findOne({ where: { id: procesoId } });

      // El acto primero: es lo que lo designa.
      const ids = [supervision.actoDocumentoId, ...(supervision.anexosCorreo ?? [])];
      const filas = await this.dataSource.getRepository(Documento).find({ where: { id: In(ids) } });
      const documentos = ids
        .map((id) => filas.find((d) => d.id === id))
        .filter((d): d is Documento => !!d && !!d.archivoUrl)
        .map((d) => ({
          doc: d,
          nombre: d.archivoNombreOriginal ?? d.nombre,
          tamano: Number(d.archivoTamano ?? 0),
        }));

      const { caben, quedanFuera } = repartirEnElCorreo(documentos);
      const adjuntos: AdjuntoCorreo[] = [];
      const noLeidos: string[] = [];
      for (const { doc, nombre } of caben) {
        try {
          const contenido = await readFile(join(STORAGE_PATH, basename(doc.archivoUrl)));
          adjuntos.push({
            filename: nombre,
            contentBase64: contenido.toString('base64'),
            ...(doc.archivoMimeType ? { contentType: doc.archivoMimeType } : {}),
          });
        } catch (error: any) {
          this.logger.warn(`No se pudo leer ${nombre} para el correo: ${error.message}`);
          noLeidos.push(nombre);
        }
      }
      const fuera = [...quedanFuera.map((d) => d.nombre), ...noLeidos];

      const aviso = textoDelCorreo({
        nombre: supervision.nombre,
        contrato: contrato?.numero ?? null,
        objeto: contrato?.objeto ?? null,
        radicado: proceso?.radicado ?? null,
        fechaDesignacion: supervision.fechaDesignacion,
        mensaje: supervision.mensajeCorreo,
        adjuntos: adjuntos.map((a) => a.filename),
        fuera,
      });

      const salio = await this.campana.correoConAdjuntos(supervision.email, aviso, adjuntos);
      if (!salio) return sinEnviar(supervision.email, 'el servicio de correo no lo aceptó');

      supervision.alertaEnviadaAt = new Date();
      await this.dataSource.getRepository(SupervisionContrato).save(supervision);
      await this.traza(this.dataSource.manager, procesoId, supervision.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        supervisor: supervision.nombre,
        aviso: 'correo',
        para: supervision.email,
        adjuntos: adjuntos.map((a) => a.filename),
        ...(fuera.length ? { quedanFuera: fuera } : {}),
      });

      // También a la campana: es donde mira lo que le toca en la plataforma.
      if (supervision.usuarioId) {
        await this.campana.enviar([
          {
            id_usuario_destinatario: supervision.usuarioId,
            tipo_notificacion: 'contratacion_supervisor_designado',
            titulo: aviso.titulo,
            mensaje: `Te designaron supervisor${contrato?.numero ? ` del contrato ${contrato.numero}` : ''}. El acto te llegó por correo.`,
            prioridad: 'Alta',
            datos_adicionales: { modulo: 'contratacion', procesoId, numeral: NUMERAL_SUPERVISOR },
          },
        ]);
      }

      return {
        enviado: true,
        para: supervision.email,
        adjuntos: adjuntos.map((a) => a.filename),
        quedanFuera: fuera,
        motivo: null,
      };
    } catch (error: any) {
      this.logger.warn(`No se pudo mandar el correo al supervisor: ${error.message}`);
      return sinEnviar(null, 'ocurrió un error al prepararlo');
    }
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
        numeral: NUMERAL_SUPERVISOR,
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
        entidad: 'supervision_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

/**
 * El texto del correo de la designación (124). Función pura para probarla.
 *
 * Dice lo mínimo para que el supervisor sepa qué vigila desde cuándo, y nombra
 * los documentos que no cupieron para que no crea que le llegó todo.
 */
export function textoDelCorreo(datos: {
  nombre: string;
  contrato: string | null;
  objeto: string | null;
  radicado: string | null;
  fechaDesignacion: string;
  mensaje: string | null;
  adjuntos: string[];
  fuera: string[];
}): { titulo: string; mensaje: string } {
  const titulo = datos.contrato
    ? `Designación como supervisor del contrato ${datos.contrato}`
    : 'Designación como supervisor de contrato';

  const partes = [
    `${datos.nombre}, se le designó supervisor${datos.contrato ? ` del contrato ${datos.contrato}` : ''}${
      datos.radicado ? ` (proceso ${datos.radicado})` : ''
    } mediante memorando de designación del ${datos.fechaDesignacion}, que va adjunto.`,
    // Revisión de QA de EFDS-1165: el correo hace las veces de la comunicación
    // formal de la designación (redacción por confirmar con Contratación).
    'Este correo es la comunicación formal de su designación como supervisor.',
  ];
  if (datos.objeto) partes.push(`Objeto: ${datos.objeto}.`);
  if (datos.mensaje) partes.push(datos.mensaje);
  if (datos.adjuntos.length) partes.push(`Adjuntos: ${datos.adjuntos.join(', ')}.`);
  if (datos.fuera.length) {
    partes.push(
      `No cupieron en el correo y están en el expediente del proceso: ${datos.fuera.join(', ')}.`,
    );
  }
  return { titulo, mensaje: partes.join(' ') };
}
