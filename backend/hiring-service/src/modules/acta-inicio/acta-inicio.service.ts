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
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { SuscripcionActaInicio } from '../../entities/suscripcion-acta-inicio.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { SuscribirActaDto, SuscribirActaInicioDto } from './dto/acta-inicio.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';
import { aplicaArl } from '../legalizacion/legalizacion.service';

/** Actividad 9.1 de la matriz: la reunión de inicio. */
export const NUMERAL_ACTA_INICIO = '9.1';

/**
 * Actividad 8.7: el acta de inicio suscrita, que cierra la legalización.
 *
 * Hasta la 089 se trataba como la misma reunión de la 9.1 contada dos veces, y
 * las dos casillas abrían la misma pantalla. Se separaron a pedido de la
 * Dirección: el acta se registra aquí, con su fecha de firma y su documento, y
 * la reunión la toma de aquí cuando la modalidad la exige.
 *
 * Queda un camino heredado: registrar la reunión adjuntando el acta en el
 * mismo paso, como antes, sigue cerrando las dos casillas. Es lo que usan los
 * procesos que ya venían así y las pruebas de extremo a extremo que arrancan
 * un contrato para probar lo que viene después.
 */
export const NUMERAL_ACTA_INICIO_LEGALIZACION = '8.7';

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
  constructor(
    private readonly dataSource: DataSource,
    private readonly cierre: CierreActividadService,
  ) {}

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
    const proceso = await this.dataSource
      .getRepository(Proceso)
      .findOne({ where: { id: procesoId } });

    // El acta de la 8.7: si la modalidad la exige y si ya se suscribió. La
    // reunión la toma de ahí, sin volver a pedirla.
    const actaAplica = await this.actaAplica(this.dataSource.manager, proceso?.modalidad ?? null);
    const suscripcion = await this.suscripcionDe(this.dataSource.manager, contrato.id);
    const faltaActa = actaAplica && !suscripcion && !acta;

    return {
      // Las dos condiciones por separado: la pantalla necesita decir cuál
      // falta, no solo que no se puede.
      legalizado,
      tieneSupervisor: !!supervisor,
      puedeIniciar: legalizado && !!supervisor && !acta && !faltaActa,
      motivoNoPuede:
        this.motivoNoPuede(contrato.estado, !!supervisor, !!acta) ??
        (faltaActa ? 'falta registrar el acta de inicio suscrita' : null),
      actaAplica,
      suscripcion: suscripcion ? await this.vistaSuscripcion(suscripcion) : null,
      // La ARL solo se exige a persona natural, y solo en las modalidades que
      // la matriz no excluye (EFDS-1183, EFDS-1164): sin esto, la pantalla no
      // tiene cómo distinguir si lo que falta son las garantías (8.4, que
      // aplica siempre) o la ARL (8.5, que ni la persona jurídica ni una
      // modalidad que la excluye van a pedir nunca).
      requiereArl: await aplicaArl(
        this.dataSource.manager,
        proceso?.modalidad ?? null,
        contrato.contratistaTipo,
      ),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        enEjecucion: enEjecucion(contrato.estado),
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

      if (await this.cierre.exigeFirma(em, NUMERAL_ACTA_INICIO)) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      /*
       * El acta, de donde venga.
       *
       * Si se suscribió en la 8.7, la reunión la toma de ahí y no la vuelve a
       * pedir. Si no, y llega adjunta, es el camino de antes (acta y reunión en
       * un solo paso). Si no hay ninguna de las dos, lo que manda es la matriz:
       * donde la 8.7 aplica, falta el acta; donde no, se arranca sin ella.
       */
      const proceso = await this.exigirProceso(em, procesoId);
      const suscripcion = await this.suscripcionDe(em, contrato.id);
      const aplica = await this.actaAplica(em, proceso.modalidad ?? null);
      const pactada = suscripcion ? true : archivo ? true : (dto.actaPactada ?? aplica) && aplica;
      if (pactada && !suscripcion && !archivo) {
        throw new BadRequestException(
          'Esta modalidad exige acta de inicio: regístrala suscrita en la actividad 8.7 antes de la reunión',
        );
      }

      // Por el camino de antes el acta llega aquí, pero se guarda como la de la
      // 8.7: si quedara colgada de la reunión, las dos casillas mostrarían el
      // mismo documento. La fecha de firma es la de la reunión, que es la
      // única que trae.
      if (!suscripcion && archivo && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · acta de inicio`,
          archivo,
          hash,
          acceso,
          NUMERAL_ACTA_INICIO_LEGALIZACION,
        );
        await em.save(
          em.create(SuscripcionActaInicio, {
            contratoId: contrato.id,
            fechaSuscripcion: dto.fechaInicio,
            actaDocumentoId: doc.id,
            registradoPor: acceso.userName ?? null,
          }),
        );
      }

      const acta = await em.save(
        em.create(ActaInicio, {
          contratoId: contrato.id,
          fechaInicio: dto.fechaInicio,
          temasTratados: dto.temasTratados.trim(),
          asistentes: dto.asistentes?.trim() || null,
          actaDocumentoId: null,
          actaPactada: pactada,
          registradoPor: acceso.userName,
        } as Partial<ActaInicio>),
      );

      // El estado no lo declara nadie: se deriva de que la reunión existe, como
      // el perfeccionamiento se deriva de las firmas.
      contrato.estado = 'EJECUCION';
      contrato.ejecucionDesde = dto.fechaInicio;
      await em.save(contrato);

      // Con el acta suscrita en la 8.7, esa casilla ya se cerró allá: la
      // reunión solo cierra la suya. Por el camino de antes cierra las dos.
      const numerales = suscripcion
        ? [NUMERAL_ACTA_INICIO]
        : [NUMERAL_ACTA_INICIO_LEGALIZACION, NUMERAL_ACTA_INICIO];
      await this.marcarActividad(em, procesoId, contrato.id, numerales, acceso, dto.firma);

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

  // ---------------------------------------------------- acta suscrita (8.7) --

  /** El acta de inicio del contrato: si aplica, si se puede registrar y la registrada. */
  async estadoActa(procesoId: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);
    const contrato = await this.contratoDelProceso(em, procesoId);
    const aplica = await this.actaAplica(em, proceso.modalidad ?? null);

    if (!contrato) {
      return {
        aplica,
        puedeRegistrar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        legalizado: false,
        requiereArl: false,
        suscripcion: null,
      };
    }

    const suscripcion = await this.suscripcionDe(em, contrato.id);
    // Con la reunión registrada sin acta ya no hay nada que suscribir aquí.
    const reunion = await em.getRepository(ActaInicio).findOne({ where: { contratoId: contrato.id } });
    const supervisor = await this.supervisorVigente(contrato.id);
    const motivo = this.motivoNoPuede(contrato.estado, !!supervisor, false);

    return {
      aplica,
      puedeRegistrar: aplica && !suscripcion && !reunion && !motivo,
      motivoNoPuede: suscripcion || reunion ? null : motivo,
      legalizado: admiteInicio(contrato.estado),
      requiereArl: await aplicaArl(em, proceso.modalidad ?? null, contrato.contratistaTipo),
      suscripcion: suscripcion ? await this.vistaSuscripcion(suscripcion) : null,
    };
  }

  /**
   * Registra el acta de inicio suscrita — actividad 8.7.
   *
   * Pide lo mismo que la reunión —contrato legalizado y con supervisor—, porque
   * el acta la firman el contratista y quien va a vigilar la ejecución. Cierra
   * la 8.7 y nada más: el contrato entra en ejecución con la reunión (9.1).
   */
  async registrarActa(
    procesoId: string,
    dto: SuscribirActaDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    if (!archivo || !hash) {
      throw new BadRequestException('Adjunta el acta de inicio firmada por las dos partes');
    }

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      if (!(await this.actaAplica(em, proceso.modalidad ?? null))) {
        throw new ConflictException('Esta modalidad no suscribe acta de inicio: la matriz la excluye');
      }

      const contrato = await this.exigirContratoLegalizado(em, procesoId);
      const supervisor = await this.supervisorVigente(contrato.id, em);
      if (!supervisor) {
        throw new ConflictException(
          'El contrato no tiene supervisor designado: el acta de inicio la suscribe quien va a vigilar la ejecución',
        );
      }

      if (await this.suscripcionDe(em, contrato.id)) {
        throw new ConflictException('El contrato ya tiene registrada su acta de inicio');
      }
      if (await em.getRepository(ActaInicio).findOne({ where: { contratoId: contrato.id } })) {
        throw new ConflictException('El acta de inicio llegó con la reunión de inicio, que ya está registrada');
      }

      this.validarFecha(dto.fechaSuscripcion, 'La fecha de suscripción no puede ser posterior a hoy');

      if (await this.cierre.exigeFirma(em, NUMERAL_ACTA_INICIO_LEGALIZACION)) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · acta de inicio`,
        archivo,
        hash,
        acceso,
        NUMERAL_ACTA_INICIO_LEGALIZACION,
      );

      const suscripcion = await em.save(
        em.create(SuscripcionActaInicio, {
          contratoId: contrato.id,
          fechaSuscripcion: dto.fechaSuscripcion,
          actaDocumentoId: doc.id,
          registradoPor: acceso.userName ?? null,
        }),
      );

      await this.cierre.resolverCierre(
        em,
        procesoId,
        NUMERAL_ACTA_INICIO_LEGALIZACION,
        proceso.modalidad ?? null,
        acceso,
        dto.firma,
      );

      await this.traza(em, procesoId, suscripcion.id, 'FIRMAR', acceso, {
        actividad: NUMERAL_ACTA_INICIO_LEGALIZACION,
        contrato: contrato.numero,
        fechaSuscripcion: dto.fechaSuscripcion,
      });
    });

    return this.estadoActa(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Si la modalidad suscribe acta de inicio.
   *
   * Lo dice la matriz SÍ/NO: la 8.7 excluida es una modalidad sin acta. Sin
   * modalidad se da por aplicable, que es lo que la matriz dice en casi todas.
   */
  private async actaAplica(em: EntityManager, modalidad: string | null): Promise<boolean> {
    if (!modalidad) return true;
    const excluida = await em
      .getRepository(ActividadExcluida)
      .findOne({ where: { numeral: NUMERAL_ACTA_INICIO_LEGALIZACION, modalidad } });
    return !excluida;
  }

  private suscripcionDe(em: EntityManager, contratoId: string) {
    return em.getRepository(SuscripcionActaInicio).findOne({ where: { contratoId } });
  }

  private async vistaSuscripcion(
    s: Pick<SuscripcionActaInicio, 'fechaSuscripcion' | 'actaDocumentoId' | 'registradoPor' | 'createdAt'>,
  ) {
    const documento = await this.dataSource
      .getRepository(Documento)
      .findOne({ where: { id: s.actaDocumentoId } });
    return {
      fechaSuscripcion: s.fechaSuscripcion,
      registradoPor: s.registradoPor,
      createdAt: s.createdAt,
      documento: documento
        ? {
            nombre: documento.archivoNombreOriginal ?? documento.nombre,
            url: documento.archivoUrl,
            mimeType: documento.archivoMimeType ?? null,
          }
        : null,
    };
  }

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
  private validarFecha(
    fecha: string,
    mensaje = 'La fecha de inicio no puede ser posterior a hoy: es la de la reunión ya celebrada',
  ) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(mensaje);
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
   *
   * Cierra las casillas que le digan: la 9.1 siempre, y la 8.7 cuando el acta
   * llegó en este mismo paso y no por su actividad (ver
   * `NUMERAL_ACTA_INICIO_LEGALIZACION`). Dejarla abierta en ese caso la
   * dejaría en BORRADOR sin nada pendiente, y el riel no dejaría avanzar.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    numerales: string[],
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const cumplida = !!(await em
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId } }));

    if (!cumplida) {
      for (const numeral of numerales) {
        const actividad = await em.getRepository(ProcesoActividad).findOne({
          where: { procesoId, numeral },
        });
        if (!actividad) {
          await em.save(
            em.create(ProcesoActividad, {
              procesoId,
              numeral,
              estado: 'BORRADOR' as any,
              datos: {},
            }),
          );
          continue;
        }
        actividad.estado = 'BORRADOR' as any;
        actividad.revisadoPor = null;
        actividad.revisadoAt = null;
        await em.save(actividad);
      }
      return;
    }

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    for (const numeral of numerales) {
      await this.cierre.resolverCierre(
        em,
        procesoId,
        numeral,
        proceso?.modalidad ?? null,
        acceso,
        firma,
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
    numeral = NUMERAL_ACTA_INICIO,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        numeral,
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
