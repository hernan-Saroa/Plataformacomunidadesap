import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import {
  alMenos,
  Contrato,
  enEjecucion,
  EstadoContrato,
} from '../../entities/contrato.entity';
import { SeguimientoContrato } from '../../entities/seguimiento-contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CargarSeguimientoDto } from './dto/seguimiento.dto';

/** Actividad 9.2 de la matriz: la ejecución y supervisión del contrato. */
export const NUMERAL_SEGUIMIENTO = '9.2';

/**
 * Si el contrato admite que se le cargue seguimiento.
 *
 * Los dos criterios de la historia empiezan igual: «dado un contrato en
 * ejecución». Antes de la reunión de inicio no hay ejecución que seguir, y
 * cargar informes de algo que no ha empezado acreditaría un periodo inexistente.
 *
 * Se pregunta por `enEjecucion` y no por `alMenos(estado, 'EJECUCION')`, que es
 * lo que decía antes de que existieran los estados del final del ciclo
 * (EFDS-1184): «al menos en ejecución» lo cumple también un contrato terminado
 * o liquidado, y esos ya no tienen periodo que reportar. Un contrato
 * suspendido, en cambio, sí: la suspensión detiene el plazo, no la vigilancia.
 */
export function admiteSeguimiento(estado: EstadoContrato): boolean {
  return enEjecucion(estado);
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Seguimiento de la ejecución — actividad 9.2 (EFDS-1168).
 *
 * Los soportes van con su tipo y el periodo que cubren, no como adjuntos
 * sueltos: es lo que permite ver desde cuándo no se reporta nada. La consulta
 * responde además quién es responsable de qué, que es el segundo criterio.
 */
@Injectable()
export class SeguimientoService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        enEjecucion: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        responsables: null,
        soportes: [] as any[],
      };
    }

    const enEjecucion = admiteSeguimiento(contrato.estado);
    const supervisor = await this.supervisorVigente(contrato.id);
    const acta = await this.dataSource
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId: contrato.id } });

    const soportes = await this.dataSource.getRepository(SeguimientoContrato).find({
      where: { contratoId: contrato.id },
      order: { fechaSoporte: 'DESC', createdAt: 'DESC' },
    });

    const documentos = soportes.length
      ? await this.dataSource
          .getRepository(Documento)
          .findByIds(soportes.map((s) => s.documentoId))
      : [];

    return {
      enEjecucion,
      puedeCargar: enEjecucion,
      // El orden importa: un contrato terminado también pasó por la reunión de
      // inicio, así que preguntar primero por la legalización le respondería
      // que le falta algo que ya hizo. Lo que le pasa es que su ejecución
      // terminó, y eso va antes.
      motivoNoPuede: enEjecucion
        ? null
        : alMenos(contrato.estado, 'TERMINADO')
          ? 'la ejecución del contrato ya terminó'
          : alMenos(contrato.estado, 'LEGALIZADO')
            ? 'el contrato todavía no tiene registrada su reunión de inicio'
            : 'el contrato todavía no está legalizado',

      /**
       * El estado actual del contrato, que es la mitad del segundo criterio.
       * Se responde con lo que el expediente sabe y no con una etiqueta suelta:
       * desde cuándo corre y con qué respaldo empezó.
       */
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
        ejecucionDesde: contrato.ejecucionDesde,
        perfeccionadoAt: contrato.perfeccionadoAt,
        legalizadoAt: contrato.legalizadoAt,
      },

      /**
       * La otra mitad: quién responde por qué. El contratista ejecuta, el
       * supervisor vigila, y la reunión de inicio dice quién la registró.
       */
      responsables: {
        contratista: {
          nombre: contrato.contratistaNombre,
          tipo: contrato.contratistaTipo,
        },
        supervisor: supervisor
          ? {
              nombre: supervisor.nombre,
              cargo: supervisor.cargo,
              email: supervisor.email,
              desde: supervisor.fechaDesignacion,
            }
          : null,
        inicioRegistradoPor: acta?.registradoPor ?? null,
      },

      soportes: soportes.map((s) => {
        const doc = documentos.find((d) => d.id === s.documentoId);
        return {
          id: s.id,
          tipo: s.tipo,
          descripcion: s.descripcion,
          fechaSoporte: s.fechaSoporte,
          periodoDesde: s.periodoDesde,
          periodoHasta: s.periodoHasta,
          registradoPor: s.registradoPor,
          createdAt: s.createdAt,
          documento: doc
            ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl }
            : null,
        };
      }),

      resumen: {
        total: soportes.length,
        informes: soportes.filter((s) => s.tipo === 'INFORME').length,
        actas: soportes.filter((s) => s.tipo === 'ACTA').length,
        // Desde cuándo no se reporta: es lo que un seguimiento tiene que poder
        // responder, y con una lista plana habría que calcularlo a ojo.
        ultimoSoporte: soportes[0]?.fechaSoporte ?? null,
      },
    };
  }

  // ------------------------------------------------------------ carga --

  async cargar(
    procesoId: string,
    dto: CargarSeguimientoDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);

      this.validarFechas(dto);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · ${this.nombreDelTipo(dto.tipo)}`,
        archivo,
        hash,
        acceso,
      );

      // Quién respondía al cargarlo, no quién responde hoy: el supervisor puede
      // cambiar y el soporte se registró bajo la vigilancia de uno concreto.
      const supervisor = await this.supervisorVigente(contrato.id, em);

      const soporte = await em.save(
        em.create(SeguimientoContrato, {
          contratoId: contrato.id,
          tipo: dto.tipo,
          descripcion: dto.descripcion.trim(),
          fechaSoporte: dto.fechaSoporte,
          periodoDesde: dto.periodoDesde ?? null,
          periodoHasta: dto.periodoHasta ?? null,
          documentoId: doc.id,
          registradoPor: acceso.userName,
          supervisionId: supervisor?.id ?? null,
        } as Partial<SeguimientoContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, soporte.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_SEGUIMIENTO,
        contrato: contrato.numero,
        tipo: dto.tipo,
        fechaSoporte: dto.fechaSoporte,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  private nombreDelTipo(tipo: string): string {
    if (tipo === 'INFORME') return 'informe de supervisión';
    if (tipo === 'ACTA') return 'acta de la ejecución';
    return 'soporte de la ejecución';
  }

  /**
   * El soporte acredita algo que ya pasó, y su periodo también.
   *
   * El orden de las fechas lo garantiza además la base de datos; aquí se
   * comprueba para poder decirlo en palabras en vez de con un error de
   * restricción.
   */
  private validarFechas(dto: CargarSeguimientoDto) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (dto.fechaSoporte > hoy) {
      throw new BadRequestException(
        'La fecha del soporte no puede ser posterior a hoy: acredita algo ya ocurrido',
      );
    }

    const desde = dto.periodoDesde;
    const hasta = dto.periodoHasta;

    if (!!desde !== !!hasta) {
      throw new BadRequestException(
        'El periodo va completo o no va: una sola fecha no dice qué cubre el soporte',
      );
    }

    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'El periodo empieza después de terminar: revisa las fechas',
      );
    }
  }

  private async exigirContratoEnEjecucion(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteSeguimiento(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está en ejecución: sin reunión de inicio no hay ejecución que seguir',
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

  private async contratoDelProceso(em: EntityManager, procesoId: string) {
    await this.exigirProceso(em, procesoId);

    return em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'")
      .orderBy('c.created_at', 'DESC')
      .getOne();
  }

  private async exigirProceso(em: EntityManager, procesoId: string) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  /**
   * La actividad queda en curso, no aprobada.
   *
   * El seguimiento dura toda la ejecución: darlo por cumplido con el primer
   * informe haría que el riel dijera que ya no hay nada que hacer, cuando lo
   * que hay es un contrato que se vigila hasta que termine.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_SEGUIMIENTO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_SEGUIMIENTO,
          estado: 'BORRADOR' as any,
          datos: {},
          enviadoPor: acceso.userName,
          enviadoAt: new Date(),
        }),
      );
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
        numeral: NUMERAL_SEGUIMIENTO,
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
        entidad: 'seguimiento_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
