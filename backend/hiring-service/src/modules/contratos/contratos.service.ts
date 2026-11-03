import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { alMenos, Contrato, EstadoContrato, TipoPersona } from '../../entities/contrato.entity';
import { FirmaContrato } from '../../entities/firma-contrato.entity';
import { TipologiaContrato } from '../../entities/tipologia-contrato.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { aplicaArl, aplicanGarantias } from '../legalizacion/legalizacion.service';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { InformeDefinitivo } from '../../entities/informe-definitivo.entity';
import { Oferente } from '../../entities/oferente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AlcanceService } from '../../auth/alcance.service';
import {
  AceptarContratoDto,
  FirmarContratoDto,
  GenerarContratoDto,
  RechazarContratoDto,
} from './dto/contrato.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';

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
 * Los estados posteriores cuentan: uno legalizado o en ejecución sigue estando
 * suscrito. Tratarlos como «no perfeccionado» haría que la pantalla se
 * contradijera justo al aprobar la última garantía.
 */
export function yaSuscrito(estado: EstadoContrato): boolean {
  return alMenos(estado, 'PERFECCIONADO');
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
 * Se cumple cuando el contrato queda suscrito por las dos partes. Generada la
 * minuta, y también aceptada, la actividad sigue en curso: antes se daba por
 * cumplida con la aceptación, y el riel la ponía en verde y mandaba a la 8.2
 * con las firmas todavía pendientes.
 */
export function actividadCumplida(estado: EstadoContrato | null | undefined): boolean {
  // Legalizado también la cumple: se llega desde perfeccionado, y marcarla en
  // curso al avanzar sería retroceder.
  return !!estado && yaSuscrito(estado);
}

/** El acto de adjudicación: donde la matriz lo excluye, vale el informe definitivo. */
const NUMERAL_ACTO_ADJUDICACION = '7.3';

/** Lo que la adjudicación vigente dice del contrato que sigue. */
export interface AdjudicacionVigente {
  /** De dónde sale, para los mensajes: «el acto RES-1» o «el informe definitivo (7.2)». */
  fuente: string;
  valor: number;
  contratista: {
    nombre: string;
    documento: string | null;
    tipo: TipoPersona | null;
  };
}

/**
 * Si el proceso está adjudicado, con el motivo cuando no lo está.
 *
 * Mira el acto de adjudicación vigente de la 7.3. Antes se tomaba como
 * adjudicado el proceso cuya recepción de ofertas (6.1) cerró con un oferente,
 * mientras la 7.3 no existía; con eso la contratación directa, que no recibe
 * ofertas, no llegaba nunca al contrato.
 */
export function evaluarAdjudicacion(
  acto: AdjudicacionVigente | null,
): { adjudicado: boolean; motivo: string | null } {
  if (!acto) {
    return {
      adjudicado: false,
      motivo: 'falta el acto de adjudicación vigente (7.3), o el informe definitivo publicado donde no hay acto',
    };
  }
  return { adjudicado: true, motivo: null };
}

/** Solo letras y dígitos: «900.123.456-7» y «9001234567» son el mismo NIT. */
const normalizarDocumento = (documento: string) => documento.replace(/[^0-9a-z]/gi, '').toUpperCase();

/**
 * Por qué el contrato no cuadra con el acto que lo sustenta, o nulo si cuadra.
 *
 * El contrato se llenaba a mano y nada lo comparaba con la adjudicación: podía
 * salir por más de lo adjudicado y con otro contratista.
 */
export function contradiceElActo(
  contrato: { valor: number; contratistaDocumento: string },
  acto: AdjudicacionVigente,
): string | null {
  if (contrato.valor > acto.valor) {
    return (
      `El valor del contrato ($ ${contrato.valor.toLocaleString('es-CO')}) supera el adjudicado ` +
      `en ${acto.fuente} ($ ${acto.valor.toLocaleString('es-CO')})`
    );
  }
  const documento = acto.contratista.documento;
  if (documento && normalizarDocumento(documento) !== normalizarDocumento(contrato.contratistaDocumento)) {
    return (
      `El contratista no es a quien se adjudicó: ${acto.fuente} adjudica a ` +
      `${acto.contratista.nombre} (${documento})`
    );
  }
  return null;
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
  constructor(
    private readonly dataSource: DataSource,
    private readonly cierre: CierreActividadService,
    /** Quién firma por la entidad (migración 083). */
    private readonly alcance: AlcanceService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    await this.exigirProceso(this.dataSource.manager, procesoId);

    const contrato = await this.contratoVigente(procesoId);
    const tipologias = await this.dataSource.getRepository(TipologiaContrato).find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    const { adjudicado, motivo, acto } = await this.estadoDeLaAdjudicacion(
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
      // Lo que fija el acto: la pantalla parte de aquí en vez de un formulario
      // en blanco, y el servidor rechaza el contrato que se aparte.
      adjudicacion: acto,
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

      const { adjudicado, motivo, acto } = await this.estadoDeLaAdjudicacion(em, procesoId);
      if (!adjudicado || !acto) {
        throw new ConflictException(
          `El proceso todavía no está adjudicado: ${motivo}`,
        );
      }

      const contradiccion = contradiceElActo(dto, acto);
      if (contradiccion) throw new BadRequestException(contradiccion);

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

      await this.marcarActividad(em, procesoId, acceso, dto.firma);

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
      // él quien compromete a la entidad, y eso es decidir la 8.1. El gestor
      // registra la del contratista, que no tiene cuenta —editar la 8.1—,
      // pero no puede firmar por la entidad.
      if (
        dto.parte === 'ORDENADOR' &&
        !(await this.alcance.puedeEn(acceso, 'decidir', NUMERAL_CONTRATO))
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
        // Sin garantías ni ARL que constituir (enajenación), firmado ya está
        // legalizado: no hay otra actividad que lo vaya a marcar.
        const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
        const modalidad = proceso?.modalidad ?? null;
        if (
          !(await aplicanGarantias(em, modalidad)) &&
          !(await aplicaArl(em, modalidad, contrato.contratistaTipo))
        ) {
          contrato.estado = 'LEGALIZADO';
          contrato.legalizadoAt = new Date();
        }
        // La evidencia de la última firma es el contrato con las dos firmas
        // incorporadas, así que es la que queda como documento suscrito.
        contrato.contratoFirmadoDocumentoId = doc.id;
        await em.save(contrato);
      }

      await this.marcarActividad(em, procesoId, acceso, dto.firma);

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
   * La adjudicación vigente, con el contratista y el valor que fija.
   *
   * Lo normal es el acto de la 7.3. Con convocatoria el contratista es la
   * oferta adjudicada; sin ella, lo que dice el acto. Donde la matriz excluye
   * la 7.3 —la TVEC, donde se compra por la tienda virtual sin acto
   * de adjudicación— vale el informe definitivo publicado (7.2) con su
   * ganadora: sin esto la TVEC no llegaba nunca al contrato.
   *
   * Se leen las entidades en vez de llamar a los servicios: hacen falta tres
   * datos, y pedirlos por el estado completo ataría esta actividad a la forma
   * de la respuesta de aquellas.
   */
  private async adjudicacionVigente(
    em: EntityManager,
    procesoId: string,
  ): Promise<AdjudicacionVigente | null> {
    const acto = await em
      .getRepository(ActoAdjudicacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });

    if (acto) {
      const oferta = acto.oferenteId
        ? await em.getRepository(Oferente).findOne({ where: { id: acto.oferenteId } })
        : null;
      return {
        fuente: `el acto ${acto.numeroActo}`,
        valor: Number(acto.valorAdjudicado),
        contratista: oferta
          ? { nombre: oferta.nombre, documento: oferta.identificacion ?? null, tipo: null }
          : {
              nombre: acto.contratistaNombre ?? '',
              documento: acto.contratistaDocumento,
              tipo: acto.contratistaTipo,
            },
      };
    }

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    const sinActo = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_ACTO_ADJUDICACION, modalidad: proceso?.modalidad ?? '' },
    });
    if (!sinActo) return null;

    const definitivo = await em
      .getRepository(InformeDefinitivo)
      .findOne({ where: { procesoId, estado: 'PUBLICADO' } });
    const ganadora = definitivo?.resultado?.ganadora;
    if (!definitivo || !ganadora) return null;

    const oferta = await em.getRepository(Oferente).findOne({ where: { id: ganadora.oferenteId } });
    const valor = definitivo.resultado.valorEvaluado ?? (oferta?.valorOfertado != null ? Number(oferta.valorOfertado) : null);
    if (valor == null) return null;

    return {
      fuente: 'el informe definitivo (7.2)',
      valor: Number(valor),
      contratista: { nombre: ganadora.nombre, documento: ganadora.identificacion ?? oferta?.identificacion ?? null, tipo: null },
    };
  }

  private async estadoDeLaAdjudicacion(em: EntityManager, procesoId: string) {
    const acto = await this.adjudicacionVigente(em, procesoId);
    return { ...evaluarAdjudicacion(acto), acto };
  }

  /**
   * La 8.1 se cumple con la segunda firma, cuando el contrato queda
   * perfeccionado. La matriz la da por hecha al aceptar la minuta, pero así el
   * riel la ponía en verde y la guía mandaba a la 8.2 con las firmas del
   * ordenador y del contratista todavía pendientes, que se hacen en esta misma
   * actividad.
   *
   * La aprobación o la firma (EFDS-1183, EFDS-2070) solo se preguntan
   * en la transición de BORRADOR a cumplida: si ya estaba decidida —aprobada
   * o en revisión—, cada firma que se registre después no vuelve a pedirla.
   * Rechazar la devuelve a BORRADOR, y ahí sí se vuelve a preguntar la próxima
   * vez que se complete.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const contrato = await this.contratoVigente(procesoId, em);
    const aprobado = actividadCumplida(contrato?.estado);

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_CONTRATO },
    });

    if (!aprobado) {
      if (!actividad) {
        await em.save(
          em.create(ProcesoActividad, {
            procesoId,
            numeral: NUMERAL_CONTRATO,
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

    // Ya se decidió cómo cierra: no se repite la decisión en cada firma.
    if (actividad && actividad.estado !== 'BORRADOR') return;

    if (await this.cierre.exigeFirma(em, NUMERAL_CONTRATO)) {
      this.cierre.exigirFirmaValida(firma);
    }

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    await this.cierre.resolverCierre(
      em,
      procesoId,
      NUMERAL_CONTRATO,
      proceso?.modalidad ?? null,
      acceso,
      firma,
    );
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
