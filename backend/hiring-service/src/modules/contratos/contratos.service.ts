import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { TipologiaContrato } from '../../entities/tipologia-contrato.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AceptarContratoDto,
  GenerarContratoDto,
  RechazarContratoDto,
} from './dto/contrato.dto';

/** Actividad 8.1 de la matriz: la elaboración del contrato. */
export const NUMERAL_CONTRATO = '8.1';

/**
 * Qué respuestas admite un contrato según su estado.
 *
 * Función pura y exportada para poder probar la regla sin base de datos: es la
 * que garantiza que una minuta aceptada no se rechace después y que una
 * rechazada no reviva. El resto del servicio la consulta en vez de repetir las
 * comparaciones en cada método.
 */
export function puedeResponder(
  estado: EstadoContrato,
  respuesta: 'ACEPTAR' | 'RECHAZAR',
): boolean {
  // Solo un contrato recién generado admite respuesta. Aceptado y rechazado
  // son finales: cambiar la respuesta ya registrada borraría lo que el
  // proponente contestó, que es justo lo que el expediente tiene que probar.
  return estado === 'GENERADO' && (respuesta === 'ACEPTAR' || respuesta === 'RECHAZAR');
}

/**
 * Si la actividad 8.1 está cumplida.
 *
 * Generada la minuta la actividad queda en curso, no aprobada: un contrato que
 * el proponente no ha aceptado todavía no formaliza nada, y darlo por cumplido
 * haría que el riel mintiera.
 */
export function actividadCumplida(estado: EstadoContrato | null | undefined): boolean {
  return estado === 'ACEPTADO';
}

/**
 * Si el proceso está adjudicado, con el motivo cuando no lo está.
 *
 * La adjudicación formal es la etapa 7 (numerales 7.1 a 7.4) y todavía no tiene
 * módulo. Mientras llega, se toma como adjudicado el proceso cuya recepción de
 * ofertas cerró con al menos un oferente: es el hecho verificable más cercano
 * que el sistema conoce hoy.
 *
 * Cuando exista el acto de adjudicación (7.4), esta función pasa a mirarlo a
 * él. Está aislada y es pura para que el cambio sea de una función y no de todo
 * el servicio, y para poder probar el criterio 1 sin base de datos.
 */
export function evaluarAdjudicacion(recepcion: {
  existe: boolean;
  cerrada: boolean;
  totalOferentes: number;
}): { adjudicado: boolean; motivo: string | null } {
  if (!recepcion.existe) {
    return { adjudicado: false, motivo: 'el proceso todavía no ha recibido ofertas' };
  }
  if (!recepcion.cerrada) {
    return { adjudicado: false, motivo: 'la recepción de ofertas sigue abierta' };
  }
  if (recepcion.totalOferentes === 0) {
    return { adjudicado: false, motivo: 'el proceso cerró sin ofertas recibidas' };
  }

  return { adjudicado: true, motivo: null };
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Contrato electrónico y aceptación del proponente — actividad 8.1 (EFDS-1161).
 *
 * El sistema no compone la minuta. Ofrece el formato del SIG de la tipología,
 * que se diligencia fuera, y guarda el documento resultante junto con el
 * registro de quién lo aceptó. Autogenerar exigiría un motor de plantillas y un
 * mapeo campo a campo que los documentos fuente no definen.
 */
@Injectable()
export class ContratosService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    await this.exigirProceso(this.dataSource.manager, procesoId);

    const contrato = await this.contratoVigente(procesoId);
    const tipologias = await this.dataSource.getRepository(TipologiaContrato).find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    const { adjudicado, motivo } = await this.estadoDeLaAdjudicacion(
      this.dataSource.manager,
      procesoId,
    );

    const minuta = contrato
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: contrato.minutaDocumentoId } })
      : null;

    // Los formatos de la actividad, para que la pantalla ofrezca la descarga
    // sin tener que pedirlos por separado.
    const formatos = await this.dataSource.getRepository(Plantilla).find({
      where: { numeral: NUMERAL_CONTRATO, activo: true },
      order: { nombre: 'ASC' },
    });

    return {
      // Las dos condiciones por separado: la pantalla necesita decir cuál
      // falta, no solo que no se puede.
      adjudicado,
      motivoNoAdjudicado: motivo,
      puedeGenerar: adjudicado && !contrato,
      tipologias: tipologias.map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        descripcion: t.descripcion,
        exigeGarantias: t.exigeGarantias,
      })),
      formatos: formatos.map((f) => ({
        id: f.id,
        codigo: f.codigo,
        nombre: f.nombre,
        version: f.version,
        archivoUrl: f.archivoUrl,
      })),
      contrato: contrato
        ? {
            id: contrato.id,
            tipologia: contrato.tipologia,
            tipologiaNombre:
              tipologias.find((t) => t.codigo === contrato.tipologia)?.nombre ??
              contrato.tipologia,
            numero: contrato.numero,
            objeto: contrato.objeto,
            valor: contrato.valor,
            plazoDias: contrato.plazoDias,
            contratista: {
              documento: contrato.contratistaDocumento,
              nombre: contrato.contratistaNombre,
              tipo: contrato.contratistaTipo,
            },
            estado: contrato.estado,
            generadoPor: contrato.generadoPor,
            generadoAt: contrato.generadoAt,
            aceptadoPor: contrato.aceptadoPor,
            aceptadoAt: contrato.aceptadoAt,
            aceptadoObservacion: contrato.aceptadoObservacion,
            minuta: minuta
              ? {
                  nombre: minuta.archivoNombreOriginal ?? minuta.nombre,
                  url: minuta.archivoUrl,
                }
              : null,
          }
        : null,
    };
  }

  // ------------------------------------------------------------ generación --

  /**
   * Registra el contrato con su minuta diligenciada.
   *
   * Se exige el proceso adjudicado porque un contrato sin adjudicación no tiene
   * a quién vincular: sería un documento sin contraparte.
   */
  async generar(
    procesoId: string,
    dto: GenerarContratoDto,
    minuta: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const { adjudicado, motivo } = await this.estadoDeLaAdjudicacion(em, procesoId);
      if (!adjudicado) {
        throw new ConflictException(
          `El proceso todavía no está adjudicado: ${motivo}`,
        );
      }

      if (await this.contratoVigente(procesoId, em)) {
        throw new ConflictException(
          'El proceso ya tiene contrato: para cambiarlo se registra el rechazo del proponente y se genera otro',
        );
      }

      const tipologia = await em
        .getRepository(TipologiaContrato)
        .findOne({ where: { codigo: dto.tipologia, activo: true } });
      if (!tipologia) {
        throw new BadRequestException(
          'La tipología del contrato no existe en el catálogo o está inactiva',
        );
      }

      // El número identifica el contrato en el archivo de la entidad. Se
      // comprueba aquí para responder con un mensaje de negocio y no con un
      // error de llave duplicada.
      const repetido = await em.getRepository(Contrato).findOne({
        where: { numero: dto.numero },
      });
      if (repetido) {
        throw new ConflictException(
          `Ya existe un contrato con el número ${dto.numero}`,
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${dto.numero} · minuta`,
        minuta,
        hash,
        acceso,
      );

      const contrato = await em.save(
        em.create(Contrato, {
          procesoId,
          tipologia: dto.tipologia,
          numero: dto.numero,
          objeto: dto.objeto,
          valor: dto.valor,
          plazoDias: dto.plazoDias ?? null,
          contratistaDocumento: dto.contratistaDocumento,
          contratistaNombre: dto.contratistaNombre,
          contratistaTipo: dto.contratistaTipo,
          minutaDocumentoId: doc.id,
          plantillaId: dto.plantillaId ?? null,
          estado: 'GENERADO' as const,
          generadoPor: acceso.userName,
          generadoAt: new Date(),
        } as Partial<Contrato>),
      );

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, contrato.id, 'CREAR', acceso, {
        actividad: NUMERAL_CONTRATO,
        numero: dto.numero,
        tipologia: dto.tipologia,
        valor: dto.valor,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------ aceptación --

  /**
   * Registra la aceptación del proponente.
   *
   * Segundo criterio de la historia. El nombre de quien acepta viene en el DTO
   * y no del usuario autenticado: quien opera el sistema es el gestor de la
   * entidad, y anotarlo a él como aceptante haría que el expediente dijera algo
   * que no ocurrió.
   */
  async aceptar(procesoId: string, dto: AceptarContratoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(procesoId, em);

      if (!puedeResponder(contrato.estado, 'ACEPTAR')) {
        throw new ConflictException('El proponente ya aceptó este contrato');
      }

      contrato.estado = 'ACEPTADO';
      contrato.aceptadoAt = new Date();
      contrato.aceptadoPor = dto.aceptadoPor;
      contrato.aceptadoObservacion = dto.observacion ?? null;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, contrato.id, 'ACEPTAR', acceso, {
        actividad: NUMERAL_CONTRATO,
        numero: contrato.numero,
        aceptadoPor: dto.aceptadoPor,
        // Queda constancia de que el registro lo hizo el gestor y la aceptación
        // es del proponente: son dos personas distintas y el expediente debe
        // poder distinguirlas.
        registradoPor: acceso.userName,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Registra que el proponente no acepta la minuta.
   *
   * No se borra el contrato: existió y se le presentó al proponente, así que el
   * expediente conserva la minuta rechazada y su motivo. Después se genera otra.
   */
  async rechazar(procesoId: string, dto: RechazarContratoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(procesoId, em);

      if (!puedeResponder(contrato.estado, 'RECHAZAR')) {
        throw new ConflictException(
          'El contrato ya fue aceptado: un contrato aceptado no se rechaza después',
        );
      }

      contrato.estado = 'RECHAZADO';
      contrato.rechazadoAt = new Date();
      contrato.rechazadoPor = dto.rechazadoPor;
      contrato.motivoRechazo = dto.motivo;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, contrato.id, 'RECHAZAR', acceso, {
        actividad: NUMERAL_CONTRATO,
        numero: contrato.numero,
        rechazadoPor: dto.rechazadoPor,
        motivo: dto.motivo,
        registradoPor: acceso.userName,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El contrato vigente del proceso, o nulo si no hay.
   *
   * Expuesto porque la suscripción (EFDS-1162) y la legalización (EFDS-1164)
   * trabajan sobre el mismo contrato, y duplicar la consulta dejaría tres sitios
   * donde recordar que un rechazado no cuenta.
   */
  contratoVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'")
      .getOne();
  }

  /** Exige que haya contrato vigente; lo usan las etapas siguientes. */
  async exigirContrato(procesoId: string, em?: EntityManager) {
    const contrato = await this.contratoVigente(procesoId, em);
    if (!contrato) {
      throw new NotFoundException('El proceso no tiene contrato generado');
    }
    return contrato;
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Lee la recepción de ofertas y le pasa los datos a `evaluarAdjudicacion`.
   *
   * Se leen las entidades de la actividad 6.1 en vez de llamar a su servicio: lo
   * que hace falta son tres datos, y pedirlos por el estado completo ataría esta
   * actividad a la forma de la respuesta de aquella.
   */
  private async estadoDeLaAdjudicacion(em: EntityManager, procesoId: string) {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });

    const totalOferentes = recepcion
      ? await em.getRepository(Oferente).count({ where: { recepcionId: recepcion.id } })
      : 0;

    return evaluarAdjudicacion({
      existe: !!recepcion,
      cerrada: recepcion?.estado === 'CERRADA',
      totalOferentes,
    });
  }

  /**
   * La actividad se cumple cuando el proponente acepta.
   *
   * Generada la minuta la actividad queda en curso, no aprobada: un contrato
   * que el proponente no ha aceptado todavía no formaliza nada, y darlo por
   * cumplido haría que el riel mintiera.
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const contrato = await this.contratoVigente(procesoId, em);
    const aprobado = actividadCumplida(contrato?.estado);
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_CONTRATO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_CONTRATO,
          estado: estado as any,
          datos: {},
          ...(aprobado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = aprobado ? acceso.userName : null;
    actividad.revisadoAt = aprobado ? new Date() : null;
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
        numeral: NUMERAL_CONTRATO,
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
        entidad: 'contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
