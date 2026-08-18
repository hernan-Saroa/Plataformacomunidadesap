import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { FirmaContrato } from '../../entities/firma-contrato.entity';
import { TipologiaContrato } from '../../entities/tipologia-contrato.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import {
  HiringAccess,
  ROL_ORDENADOR_GASTO,
  ROL_SUPER_ADMIN,
} from '../../auth/hiring-access';
import {
  AceptarContratoDto,
  FirmarContratoDto,
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
  // Solo un contrato recién generado admite respuesta. Aceptado, rechazado y
  // perfeccionado son finales: cambiar la respuesta ya registrada borraría lo
  // que el proponente contestó, que es justo lo que el expediente debe probar.
  return estado === 'GENERADO' && (respuesta === 'ACEPTAR' || respuesta === 'RECHAZAR');
}

/** Las dos partes que suscriben (EFDS-1162). */
export const PARTES_FIRMANTES = ['ORDENADOR', 'CONTRATISTA'] as const;

/**
 * Si el contrato ya quedó suscrito por las dos partes.
 *
 * LEGALIZADO cuenta: se alcanza desde PERFECCIONADO (EFDS-1164) y un contrato
 * legalizado sigue estando suscrito. Tratarlo como «no perfeccionado» haría
 * que la pantalla se contradijera justo al aprobar la última garantía.
 */
export function yaSuscrito(estado: EstadoContrato): boolean {
  return estado === 'PERFECCIONADO' || estado === 'LEGALIZADO';
}

/**
 * Si el contrato admite firmas.
 *
 * El orden es generar, aceptar y después firmar. Firmar una minuta que el
 * proponente no ha aceptado sería comprometer a la entidad con un texto que la
 * otra parte todavía no ha hecho suyo.
 */
export function puedeFirmarse(estado: EstadoContrato): boolean {
  return estado === 'ACEPTADO';
}

/**
 * Si con estas firmas el contrato queda perfeccionado.
 *
 * El perfeccionamiento no lo declara quien firma: se deriva de que estén las
 * dos partes. Dejarlo en manos del último que firme permitiría marcar como
 * suscrito un contrato al que le falta una firma.
 */
export function estaSuscrito(partesFirmadas: readonly string[]): boolean {
  return PARTES_FIRMANTES.every((parte) => partesFirmadas.includes(parte));
}

/**
 * Si la actividad 8.1 está cumplida.
 *
 * Generada la minuta la actividad queda en curso, no aprobada: un contrato que
 * el proponente no ha aceptado todavía no formaliza nada, y darlo por cumplido
 * haría que el riel mintiera.
 */
export function actividadCumplida(estado: EstadoContrato | null | undefined): boolean {
  // Perfeccionado y legalizado también la cumplen: son los estados a los que
  // se llega desde aceptado, y marcarla en curso al avanzar sería retroceder.
  return estado === 'ACEPTADO' || (!!estado && yaSuscrito(estado));
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

    // Las firmas van en el mismo estado y no en un endpoint aparte: la pantalla
    // muestra el contrato y su suscripción en un solo bloque, y pedirlas por
    // separado obligaría a dos peticiones para pintar una sola tarjeta.
    const firmas = contrato
      ? await this.dataSource.getRepository(FirmaContrato).find({
          where: { contratoId: contrato.id },
          order: { fechaFirma: 'ASC' },
        })
      : [];

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
            perfeccionadoAt: contrato.perfeccionadoAt,
            minuta: minuta
              ? {
                  nombre: minuta.archivoNombreOriginal ?? minuta.nombre,
                  url: minuta.archivoUrl,
                }
              : null,
          }
        : null,
      // La suscripción: qué partes firmaron y cuál falta (EFDS-1162).
      puedeFirmar: !!contrato && puedeFirmarse(contrato.estado),
      perfeccionado: !!contrato && yaSuscrito(contrato.estado),
      firmas: firmas.map((f) => ({
        parte: f.parte,
        firmanteNombre: f.firmanteNombre,
        firmanteDocumento: f.firmanteDocumento,
        fechaFirma: f.fechaFirma,
        registradaPor: f.registradaPor,
      })),
      // Cuáles faltan, dicho por el servidor: la pantalla no tiene por qué
      // conocer la lista de partes ni cómo se compara.
      partesPendientes: contrato
        ? PARTES_FIRMANTES.filter((parte) => !firmas.some((f) => f.parte === parte))
        : [],
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

  // ----------------------------------------------------------- suscripción --

  /**
   * Registra la firma de una de las partes (EFDS-1162).
   *
   * Con la segunda firma el contrato queda perfeccionado en la misma
   * transacción: el perfeccionamiento se deriva de que estén las dos, no lo
   * declara quien firma de último.
   *
   * Firma registrada, no criptográfica. La entidad todavía no ha elegido
   * proveedor de firma electrónica, así que lo que se guarda es quién firmó,
   * cuándo y con qué evidencia. Cuando haya proveedor, la verificación se
   * enchufa aquí sin tocar el resto del flujo.
   */
  async firmar(
    procesoId: string,
    dto: FirmarContratoDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(procesoId, em);

      if (!puedeFirmarse(contrato.estado)) {
        throw new ConflictException(
          yaSuscrito(contrato.estado)
            ? 'El contrato ya está suscrito por las dos partes'
            : 'El contrato todavía no lo ha aceptado el proponente: primero se acepta y después se firma',
        );
      }

      // La firma del ordenador la registra el propio Ordenador del Gasto: es
      // él quien compromete a la entidad. El gestor registra la del
      // contratista, que no tiene cuenta, pero no puede firmar por la entidad.
      if (
        dto.parte === 'ORDENADOR' &&
        !acceso.roles.includes(ROL_ORDENADOR_GASTO) &&
        !acceso.roles.includes(ROL_SUPER_ADMIN)
      ) {
        throw new ForbiddenException(
          'La firma del ordenador del gasto la registra él mismo: tu rol no puede comprometer a la entidad',
        );
      }

      const yaFirmadas = await em
        .getRepository(FirmaContrato)
        .find({ where: { contratoId: contrato.id } });

      if (yaFirmadas.some((f) => f.parte === dto.parte)) {
        throw new ConflictException(
          dto.parte === 'ORDENADOR'
            ? 'El ordenador del gasto ya firmó este contrato'
            : 'El contratista ya firmó este contrato',
        );
      }

      this.validarFecha(dto.fechaFirma);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · firma ${
          dto.parte === 'ORDENADOR' ? 'del ordenador del gasto' : 'del contratista'
        }`,
        evidencia,
        hash,
        acceso,
      );

      await em.save(
        em.create(FirmaContrato, {
          contratoId: contrato.id,
          parte: dto.parte,
          firmanteNombre: dto.firmanteNombre,
          firmanteDocumento: dto.firmanteDocumento ?? null,
          // Quién firmó y quién lo anotó son dos datos distintos: el gestor
          // registra la firma del contratista con su evidencia.
          registradaPor: acceso.userName,
          fechaFirma: dto.fechaFirma,
          evidenciaDocumentoId: doc.id,
          hashDocumento: hash,
        } as Partial<FirmaContrato>),
      );

      const partes = [...yaFirmadas.map((f) => f.parte), dto.parte];

      if (estaSuscrito(partes)) {
        contrato.estado = 'PERFECCIONADO';
        contrato.perfeccionadoAt = new Date();
        // La evidencia de la última firma es el contrato con las dos firmas
        // incorporadas, así que es la que queda como documento suscrito.
        contrato.contratoFirmadoDocumentoId = doc.id;
        await em.save(contrato);
      }

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, contrato.id, 'FIRMAR', acceso, {
        actividad: NUMERAL_CONTRATO,
        numero: contrato.numero,
        parte: dto.parte,
        firmante: dto.firmanteNombre,
        fechaFirma: dto.fechaFirma,
        perfeccionado: estaSuscrito(partes),
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
    const consulta = manager
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    // Dentro de una transacción se bloquea la fila. Sin esto, dos firmas
    // simultáneas leerían ambas «falta la otra parte» y el contrato quedaría
    // con las dos firmas pero sin perfeccionar, sin endpoint que lo repare; y
    // un aceptar y un rechazar concurrentes pasarían los dos la guarda y el
    // expediente registraría ambas respuestas a la vez.
    if (em) consulta.setLock('pessimistic_write');

    return consulta.getOne();
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

  /** El acto ya ocurrió; no se firma hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de la firma no puede ser posterior a hoy: es la del acto ya realizado',
      );
    }
  }

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
