import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { alMenos, Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { SuscribirActaInicioDto } from './dto/acta-inicio.dto';

/** Actividad 9.1 de la matriz: la reunión de inicio. */
export const NUMERAL_ACTA_INICIO = '9.1';

/**
 * Si el contrato admite que se le registre la reunión de inicio.
 *
 * La historia pide «un contrato legalizado con supervisor designado»: no se
 * arranca la ejecución de un contrato al que le faltan las coberturas, ni sin
 * alguien que la vigile. El supervisor lo comprueba el servicio, porque no se
 * deduce del estado.
 *
 * Se admite también EJECUCION para que la regla no se contradiga consigo misma
 * al consultarla después de haber arrancado: el contrato sigue cumpliendo la
 * condición que lo llevó ahí.
 */
export function admiteInicio(estado: EstadoContrato): boolean {
  return alMenos(estado, 'LEGALIZADO');
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Reunión y acta de inicio del contrato — actividad 9.1 (EFDS-1167).
 *
 * Lo que arranca la ejecución es la reunión, no el papel. La matriz describe el
 * acta como «firmada por ambas partes, si fue pactada en el contrato», así que
 * hay contratos que empiezan sin ella; exigirla siempre bloquearía a los que la
 * ley no obliga a suscribirla, y no exigirla nunca dejaría arrancar sin soporte
 * a los que sí la pactaron. Se registra la reunión siempre y el acta cuando el
 * contrato la pactó.
 */
@Injectable()
export class ActaInicioService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        puedeIniciar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        acta: null,
        supervisor: null,
      };
    }

    const legalizado = admiteInicio(contrato.estado);
    const supervisor = await this.supervisorVigente(contrato.id);
    const acta = await this.dataSource
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId: contrato.id } });

    const documento = acta?.actaDocumentoId
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: acta.actaDocumentoId } })
      : null;

    return {
      // Las dos condiciones por separado: la pantalla necesita decir cuál
      // falta, no solo que no se puede.
      legalizado,
      tieneSupervisor: !!supervisor,
      puedeIniciar: legalizado && !!supervisor && !acta,
      motivoNoPuede: this.motivoNoPuede(contrato.estado, !!supervisor, !!acta),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        enEjecucion: contrato.estado === 'EJECUCION',
        ejecucionDesde: contrato.ejecucionDesde,
      },
      supervisor: supervisor
        ? { nombre: supervisor.nombre, cargo: supervisor.cargo }
        : null,
      acta: acta
        ? {
            id: acta.id,
            fechaInicio: acta.fechaInicio,
            temasTratados: acta.temasTratados,
            asistentes: acta.asistentes,
            actaPactada: acta.actaPactada,
            registradoPor: acta.registradoPor,
            createdAt: acta.createdAt,
            documento: documento
              ? {
                  nombre: documento.archivoNombreOriginal ?? documento.nombre,
                  url: documento.archivoUrl,
                }
              : null,
          }
        : null,
    };
  }

  // --------------------------------------------------------------- inicio --

  async suscribir(
    procesoId: string,
    dto: SuscribirActaInicioDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);

      const supervisor = await this.supervisorVigente(contrato.id, em);
      if (!supervisor) {
        throw new ConflictException(
          'El contrato no tiene supervisor designado: la ejecución no arranca sin quien la vigile',
        );
      }

      const existente = await em
        .getRepository(ActaInicio)
        .findOne({ where: { contratoId: contrato.id } });
      if (existente) {
        throw new ConflictException('El contrato ya tiene registrada su reunión de inicio');
      }

      this.validarFecha(dto.fechaInicio);

      // Por defecto se da por pactada: es lo habitual, y suponer lo contrario
      // dejaría arrancar sin acta a quien sí debía suscribirla.
      const pactada = dto.actaPactada ?? true;
      if (pactada && !archivo) {
        throw new BadRequestException(
          'Adjunta el acta firmada por ambas partes, o indica que el contrato no la pactó',
        );
      }

      let documentoId: string | null = null;
      if (archivo && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · acta de inicio`,
          archivo,
          hash,
          acceso,
        );
        documentoId = doc.id;
      }

      const acta = await em.save(
        em.create(ActaInicio, {
          contratoId: contrato.id,
          fechaInicio: dto.fechaInicio,
          temasTratados: dto.temasTratados.trim(),
          asistentes: dto.asistentes?.trim() || null,
          actaDocumentoId: documentoId,
          actaPactada: pactada,
          registradoPor: acceso.userName,
        } as Partial<ActaInicio>),
      );

      // El estado no lo declara nadie: se deriva de que la reunión existe, como
      // el perfeccionamiento se deriva de las firmas.
      contrato.estado = 'EJECUCION';
      contrato.ejecucionDesde = dto.fechaInicio;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, acta.id, 'INICIAR', acceso, {
        actividad: NUMERAL_ACTA_INICIO,
        contrato: contrato.numero,
        fechaInicio: dto.fechaInicio,
        actaPactada: pactada,
        supervisor: supervisor.nombre,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------- lo que consumen otras --

  /** Si el contrato ya arrancó, para las actividades que lo exigen (9.2, 9.3). */
  async enEjecucion(procesoId: string, em?: EntityManager): Promise<boolean> {
    const contrato = await this.contratoDelProceso(em ?? this.dataSource.manager, procesoId);
    return contrato?.estado === 'EJECUCION';
  }

  // ----------------------------------------------------------- auxiliares --

  /** Por qué no se puede todavía, dicho por el servidor y no deducido en pantalla. */
  private motivoNoPuede(
    estado: EstadoContrato,
    tieneSupervisor: boolean,
    yaIniciado: boolean,
  ): string | null {
    if (yaIniciado) return null;
    if (!admiteInicio(estado)) {
      return estado === 'PERFECCIONADO'
        ? 'al contrato le faltan las garantías o la ARL'
        : 'el contrato todavía no lo han firmado las dos partes';
    }
    if (!tieneSupervisor) return 'el contrato todavía no tiene supervisor designado';
    return null;
  }

  /** La reunión ya ocurrió; no se arranca la ejecución hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser posterior a hoy: es la de la reunión ya celebrada',
      );
    }
  }

  private async exigirContratoLegalizado(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteInicio(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está legalizado: la ejecución empieza con las coberturas en firme',
      );
    }

    return contrato;
  }

  private supervisorVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(SupervisionContrato)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    await this.exigirProceso(em, procesoId);

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'")
      .orderBy('c.created_at', 'DESC');

    // Dentro de la transacción se bloquea la fila: dos registros simultáneos
    // leerían ambos «sin reunión de inicio» y el índice único rechazaría el
    // segundo con un error de llave, no de negocio.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirProceso(em: EntityManager, procesoId: string) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  /**
   * La actividad se cumple cuando la reunión está registrada.
   *
   * No hay vuelta atrás como en la supervisión: la ejecución empieza una vez y
   * la reunión no se «desconvoca».
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const cumplida = !!(await em
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId } }));
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ACTA_INICIO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_ACTA_INICIO,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = cumplida ? acceso.userName : null;
    actividad.revisadoAt = cumplida ? new Date() : null;
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
        numeral: NUMERAL_ACTA_INICIO,
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
        entidad: 'acta_inicio',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
