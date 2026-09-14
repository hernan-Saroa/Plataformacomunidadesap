import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { alMenos, Contrato, EstadoContrato, TipoPersona } from '../../entities/contrato.entity';
import { Garantia } from '../../entities/garantia.entity';
import { Amparo, TipoAmparo } from '../../entities/amparo.entity';
import { AfiliacionArl } from '../../entities/afiliacion-arl.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  CargarGarantiaDto,
  RechazarGarantiaDto,
  RegistrarArlDto,
} from './dto/legalizacion.dto';
import {


} from '../../auth/hiring-access';
import { PERMISO_ACTIVIDAD_APROBAR, PERMISO_ACTIVIDAD_EDITAR, tienePermiso } from '../../auth/permisos';

/** Constitución de garantías (8.4) y registro de la ARL (8.5). */
export const NUMERAL_GARANTIAS = '8.4';
export const NUMERAL_ARL = '8.5';

/**
 * Si el contrato admite que se carguen garantías.
 *
 * Primer criterio de la historia: «dado un contrato suscrito». Cargar pólizas
 * de un contrato que las partes no han firmado sería asegurar una obligación
 * que todavía no existe.
 */
export function admiteLegalizacion(estado: EstadoContrato): boolean {
  return alMenos(estado, 'PERFECCIONADO');
}

/**
 * Si el contrato exige registro de ARL.
 *
 * Segundo criterio: se deriva del tipo de persona del contratista, guardado al
 * contratar. No es una casilla que el usuario marque, porque entonces la
 * exigencia dependería de que alguien se acordara de activarla.
 */
export function exigeArl(tipoPersona: TipoPersona): boolean {
  return tipoPersona === 'NATURAL';
}

/**
 * Si con este panorama el contrato queda legalizado.
 *
 * Los conteos son de garantías VIGENTES: las rechazadas no entran. Una póliza
 * devuelta es historia del expediente, no una obligación pendiente — si
 * contara, un solo rechazo bloquearía la legalización para siempre, porque el
 * estado RECHAZADA es final y la corrección llega como una póliza nueva.
 *
 * Hacen falta garantías vigentes —al menos una— y que todas estén aprobadas:
 * una cargada sin revisar deja la legalización incompleta, porque nadie ha
 * verificado que cubra lo que debe. Y la ARL cuando aplica.
 *
 * `every` sobre una lista vacía devuelve true, así que la comprobación de que
 * haya al menos una garantía no es redundante: sin ella, un contrato sin
 * ninguna póliza se daría por legalizado.
 */
export function estaLegalizado(panorama: {
  totalGarantias: number;
  garantiasAprobadas: number;
  requiereArl: boolean;
  arlRegistrada: boolean;
}): boolean {
  const garantiasListas =
    panorama.totalGarantias > 0 && panorama.garantiasAprobadas === panorama.totalGarantias;

  return garantiasListas && (!panorama.requiereArl || panorama.arlRegistrada);
}

/** Las que cuentan para legalizar: las rechazadas son historia, no pendiente. */
export function garantiasVigentes<T extends { estado: string }>(garantias: T[]): T[] {
  return garantias.filter((g) => g.estado !== 'RECHAZADA');
}

/** Qué falta para legalizar, en palabras que la pantalla pueda mostrar. */
export function pendientesDeLegalizacion(panorama: {
  totalGarantias: number;
  garantiasAprobadas: number;
  requiereArl: boolean;
  arlRegistrada: boolean;
}): string[] {
  const faltan: string[] = [];

  if (panorama.totalGarantias === 0) {
    faltan.push('Falta constituir las garantías del contrato');
  } else if (panorama.garantiasAprobadas < panorama.totalGarantias) {
    const pendientes = panorama.totalGarantias - panorama.garantiasAprobadas;
    faltan.push(
      pendientes === 1
        ? 'Falta aprobar una póliza'
        : `Faltan por aprobar ${pendientes} pólizas`,
    );
  }

  if (panorama.requiereArl && !panorama.arlRegistrada) {
    faltan.push('Falta registrar la afiliación a la ARL, obligatoria para persona natural');
  }

  return faltan;
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Pólizas, garantías y ARL — actividades 8.4 y 8.5 (EFDS-1164).
 *
 * Los amparos van desglosados porque la matriz lo pide en 8.4: es lo que
 * permite controlar la fecha del que vence primero. Una póliza con una sola
 * vigencia no serviría para eso.
 */
@Injectable()
export class LegalizacionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    const tipos = await this.dataSource.getRepository(TipoAmparo).find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    // Qué puede hacer quien consulta, dicho por el servidor: la pantalla no
    // debe ofrecer un botón que va a responder 403.
    const puedeCargar = tienePermiso(acceso, PERMISO_ACTIVIDAD_EDITAR);
    const puedeAprobar = tienePermiso(acceso, PERMISO_ACTIVIDAD_APROBAR);

    if (!contrato) {
      return {
        suscrito: false,
        motivoNoSuscrito: 'el proceso todavía no tiene contrato generado',
        requiereArl: false,
        tiposAmparo: tipos.map((t) => ({ codigo: t.codigo, nombre: t.nombre })),
        garantias: [],
        arl: null,
        legalizado: false,
        pendientes: [] as string[],
        puedeCargar,
        puedeAprobar,
      };
    }

    const suscrito = admiteLegalizacion(contrato.estado);
    const garantias = await this.garantiasDe(this.dataSource.manager, contrato.id);
    const arl = await this.dataSource
      .getRepository(AfiliacionArl)
      .findOne({ where: { contratoId: contrato.id } });

    const requiereArl = exigeArl(contrato.contratistaTipo);
    const vigentes = garantiasVigentes(garantias);
    const panorama = {
      totalGarantias: vigentes.length,
      garantiasAprobadas: vigentes.filter((g) => g.estado === 'APROBADA').length,
      requiereArl,
      arlRegistrada: !!arl,
    };

    return {
      // Las condiciones por separado, para que la pantalla diga cuál falta en
      // vez de mostrar un botón apagado sin explicación.
      suscrito,
      motivoNoSuscrito: suscrito
        ? null
        : contrato.estado === 'RECHAZADO'
          ? 'el proponente no aceptó la minuta'
          : 'el contrato todavía no lo han firmado las dos partes',
      contratista: {
        nombre: contrato.contratistaNombre,
        tipo: contrato.contratistaTipo,
      },
      requiereArl,
      tiposAmparo: tipos.map((t) => ({ codigo: t.codigo, nombre: t.nombre })),
      garantias,
      arl: arl
        ? {
            afiliadoPor: arl.afiliadoPor,
            administradora: arl.administradora,
            numeroAfiliacion: arl.numeroAfiliacion,
            fechaAfiliacion: arl.fechaAfiliacion,
            registradaPor: arl.registradaPor,
          }
        : null,
      legalizado: alMenos(contrato.estado, 'LEGALIZADO'),
      pendientes: suscrito ? pendientesDeLegalizacion(panorama) : [],
      puedeCargar,
      puedeAprobar,
    };
  }

  // ------------------------------------------------------------ garantías --

  /** Registra una póliza con sus amparos desglosados. */
  async cargarGarantia(
    procesoId: string,
    dto: CargarGarantiaDto,
    poliza: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);

      // Solo choca contra las vigentes: la corrección de una póliza devuelta
      // llega con el mismo número, y bloquearla dejaría el rechazo sin salida.
      const repetida = await em
        .getRepository(Garantia)
        .createQueryBuilder('g')
        .where('g.contrato_id = :contratoId', { contratoId: contrato.id })
        .andWhere('g.numero_poliza = :numero', { numero: dto.numeroPoliza })
        .andWhere("g.estado <> 'RECHAZADA'")
        .getOne();
      if (repetida) {
        throw new ConflictException(
          `Este contrato ya tiene registrada la póliza ${dto.numeroPoliza}`,
        );
      }

      await this.validarAmparos(em, dto);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        NUMERAL_GARANTIAS,
        `Póliza ${dto.numeroPoliza} · ${dto.aseguradora}`,
        poliza,
        hash,
        acceso,
      );

      const garantia = await em.save(
        em.create(Garantia, {
          contratoId: contrato.id,
          aseguradora: dto.aseguradora,
          numeroPoliza: dto.numeroPoliza,
          documentoId: doc.id,
          estado: 'CARGADA' as const,
          cargadaPor: acceso.userName,
        } as Partial<Garantia>),
      );

      await em.save(
        dto.amparos.map((a) =>
          em.create(Amparo, {
            garantiaId: garantia.id,
            tipo: a.tipo,
            valorAsegurado: a.valorAsegurado,
            vigenciaDesde: a.vigenciaDesde,
            vigenciaHasta: a.vigenciaHasta,
          } as Partial<Amparo>),
        ),
      );

      await this.sincronizar(em, procesoId, contrato, acceso);

      await this.traza(em, procesoId, garantia.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_GARANTIAS,
        poliza: dto.numeroPoliza,
        aseguradora: dto.aseguradora,
        amparos: dto.amparos.map((a) => a.tipo),
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Aprueba una póliza.
   *
   * Es la revisión que pide el criterio 1: cargar no es aprobar. Con todas
   * aprobadas —y la ARL si aplica— el contrato queda legalizado.
   */
  async aprobarGarantia(procesoId: string, garantiaId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const garantia = await this.exigirGarantia(em, contrato.id, garantiaId);

      if (garantia.estado === 'APROBADA') {
        throw new ConflictException('Esta póliza ya fue aprobada');
      }
      if (garantia.estado === 'RECHAZADA') {
        throw new ConflictException(
          'Esta póliza fue devuelta: la corrección se carga como una póliza nueva, no se revive la devuelta',
        );
      }

      // Quien cargó la póliza no la aprueba: si la misma cuenta hiciera las dos
      // cosas, la revisión que pide el criterio 1 no sería una revisión.
      if (garantia.cargadaPor && garantia.cargadaPor === acceso.userName) {
        throw new ForbiddenException(
          'La póliza la aprueba alguien distinto de quien la cargó: es lo que hace que la revisión exista',
        );
      }

      garantia.estado = 'APROBADA';
      garantia.revisadaPor = acceso.userName;
      garantia.revisadaAt = new Date();
      garantia.motivoRechazo = null;
      await em.save(garantia);

      await this.sincronizar(em, procesoId, contrato, acceso);

      await this.traza(em, procesoId, garantia.id, 'APROBAR', acceso, {
        actividad: NUMERAL_GARANTIAS,
        poliza: garantia.numeroPoliza,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Devuelve una póliza con el motivo.
   *
   * No se borra: el contratista la presentó y la entidad la revisó, así que el
   * expediente conserva las dos cosas. Después se carga la corregida.
   */
  async rechazarGarantia(
    procesoId: string,
    garantiaId: string,
    dto: RechazarGarantiaDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const garantia = await this.exigirGarantia(em, contrato.id, garantiaId);

      garantia.estado = 'RECHAZADA';
      garantia.revisadaPor = acceso.userName;
      garantia.revisadaAt = new Date();
      garantia.motivoRechazo = dto.motivo;
      await em.save(garantia);

      await this.sincronizar(em, procesoId, contrato, acceso);

      await this.traza(em, procesoId, garantia.id, 'RECHAZAR', acceso, {
        actividad: NUMERAL_GARANTIAS,
        poliza: garantia.numeroPoliza,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------------ ARL --

  /** Registra la afiliación a riesgos laborales (actividad 8.5). */
  async registrarArl(
    procesoId: string,
    dto: RegistrarArlDto,
    soporte: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);

      if (!exigeArl(contrato.contratistaTipo)) {
        throw new BadRequestException(
          'La ARL se exige a los contratistas persona natural; este contrato es con persona jurídica',
        );
      }

      const existente = await em
        .getRepository(AfiliacionArl)
        .findOne({ where: { contratoId: contrato.id } });
      if (existente) {
        throw new ConflictException('Este contrato ya tiene registrada la afiliación a la ARL');
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        NUMERAL_ARL,
        `Afiliación ARL · ${dto.administradora}`,
        soporte,
        hash,
        acceso,
      );

      const arl = await em.save(
        em.create(AfiliacionArl, {
          contratoId: contrato.id,
          afiliadoPor: dto.afiliadoPor,
          administradora: dto.administradora,
          numeroAfiliacion: dto.numeroAfiliacion ?? null,
          fechaAfiliacion: dto.fechaAfiliacion,
          soporteDocumentoId: doc.id,
          registradaPor: acceso.userName,
        } as Partial<AfiliacionArl>),
      );

      await this.sincronizar(em, procesoId, contrato, acceso);

      await this.traza(em, procesoId, arl.id, 'CREAR', acceso, {
        actividad: NUMERAL_ARL,
        administradora: dto.administradora,
        afiliadoPor: dto.afiliadoPor,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Los amparos tienen que existir en el catálogo y no repetirse.
   *
   * Se comprueba aquí para responder con un mensaje de negocio en vez de con un
   * error de llave foránea o de restricción única.
   */
  private async validarAmparos(em: EntityManager, dto: CargarGarantiaDto) {
    const vistos = new Set<string>();

    for (const amparo of dto.amparos) {
      if (vistos.has(amparo.tipo)) {
        throw new BadRequestException(
          'La póliza repite un amparo: dos coberturas iguales no dirían cuál rige',
        );
      }
      vistos.add(amparo.tipo);

      if (amparo.vigenciaHasta <= amparo.vigenciaDesde) {
        throw new BadRequestException(
          'La vigencia de cada amparo debe terminar después de empezar',
        );
      }

      const tipo = await em
        .getRepository(TipoAmparo)
        .findOne({ where: { codigo: amparo.tipo, activo: true } });
      if (!tipo) {
        throw new BadRequestException(
          `El amparo ${amparo.tipo} no existe en el catálogo o está inactivo`,
        );
      }
    }
  }

  /**
   * Recalcula si el contrato ya está legalizado y marca las dos actividades.
   *
   * Se llama después de cada cambio y no solo al aprobar la última garantía:
   * rechazar una ya aprobada devuelve el contrato a no legalizado, y si eso no
   * se recalculara el estado quedaría mintiendo.
   */
  private async sincronizar(
    em: EntityManager,
    procesoId: string,
    contrato: Contrato,
    acceso: HiringAccess,
  ) {
    const garantias = await em.getRepository(Garantia).find({ where: { contratoId: contrato.id } });
    const arl = await em
      .getRepository(AfiliacionArl)
      .findOne({ where: { contratoId: contrato.id } });

    const requiereArl = exigeArl(contrato.contratistaTipo);
    const vigentes = garantiasVigentes(garantias);
    const legalizado = estaLegalizado({
      totalGarantias: vigentes.length,
      garantiasAprobadas: vigentes.filter((g) => g.estado === 'APROBADA').length,
      requiereArl,
      arlRegistrada: !!arl,
    });

    // Se compara con `alMenos` y no por igualdad: un contrato ya en ejecución
    // cumple la legalización de sobra, y volver a marcarlo LEGALIZADO al
    // aprobar otra garantía lo haría retroceder de etapa.
    if (legalizado && !alMenos(contrato.estado, 'LEGALIZADO')) {
      contrato.estado = 'LEGALIZADO';
      contrato.legalizadoAt = new Date();
      await em.save(contrato);
    } else if (!legalizado && contrato.estado === 'LEGALIZADO') {
      // Devolver una garantía ya aprobada deshace la legalización: el contrato
      // vuelve a estar suscrito pero sin las coberturas en firme.
      //
      // Solo desde LEGALIZADO: si ya arrancó la ejecución, deshacerla por una
      // garantía devuelta dejaría un contrato ejecutándose que el sistema dice
      // que no ha empezado. Ahí el problema se resuelve fuera, no cambiando el
      // estado por debajo.
      contrato.estado = 'PERFECCIONADO';
      contrato.legalizadoAt = null;
      await em.save(contrato);
    }

    const garantiasListas =
      vigentes.length > 0 && vigentes.every((g) => g.estado === 'APROBADA');

    await this.marcarActividad(em, procesoId, NUMERAL_GARANTIAS, garantiasListas, acceso);
    // La 8.5 solo se marca cuando aplica: darla por cumplida en un contrato con
    // persona jurídica mostraría como hecha una actividad que nadie realizó.
    if (requiereArl) {
      await this.marcarActividad(em, procesoId, NUMERAL_ARL, !!arl, acceso);
    }
  }

  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    aprobado: boolean,
    acceso: HiringAccess,
  ) {
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral,
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

  /** Las garantías del contrato con sus amparos, para pintarlas de una vez. */
  private async garantiasDe(em: EntityManager, contratoId: string) {
    const garantias = await em.getRepository(Garantia).find({
      where: { contratoId },
      order: { createdAt: 'ASC' },
    });

    const salida = [] as any[];
    for (const garantia of garantias) {
      const amparos = await em.getRepository(Amparo).find({
        where: { garantiaId: garantia.id },
        // Por vencimiento: el primero de la lista es el que hay que vigilar.
        order: { vigenciaHasta: 'ASC' },
      });

      salida.push({
        id: garantia.id,
        aseguradora: garantia.aseguradora,
        numeroPoliza: garantia.numeroPoliza,
        estado: garantia.estado,
        cargadaPor: garantia.cargadaPor,
        revisadaPor: garantia.revisadaPor,
        revisadaAt: garantia.revisadaAt,
        motivoRechazo: garantia.motivoRechazo,
        amparos: amparos.map((a) => ({
          tipo: a.tipo,
          valorAsegurado: a.valorAsegurado,
          vigenciaDesde: a.vigenciaDesde,
          vigenciaHasta: a.vigenciaHasta,
        })),
      });
    }

    return salida;
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    // Dentro de una transacción que va a recalcular el estado se bloquea la
    // fila: dos aprobaciones simultáneas derivarían cada una el estado con una
    // foto vieja de la otra y el LEGALIZADO podría perderse o duplicarse.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContratoSuscrito(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteLegalizacion(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está suscrito: las garantías se constituyen sobre un contrato firmado por las dos partes',
      );
    }

    return contrato;
  }

  private async exigirGarantia(em: EntityManager, contratoId: string, garantiaId: string) {
    const garantia = await em
      .getRepository(Garantia)
      .findOne({ where: { id: garantiaId, contratoId } });

    if (!garantia) throw new NotFoundException('La póliza no existe en este contrato');
    return garantia;
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    numeral: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
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
        entidad: 'legalizacion',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
