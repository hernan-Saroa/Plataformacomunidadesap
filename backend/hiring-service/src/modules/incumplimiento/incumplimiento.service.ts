import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { alMenos, Contrato, EstadoContrato } from '../../entities/contrato.entity';
import {
  CasoIncumplimiento,
  EstadoCasoIncumplimiento,
} from '../../entities/caso-incumplimiento.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ReportarIncumplimientoDto } from './dto/incumplimiento.dto';
import { SancionatorioService, TramiteDelCaso } from './sancionatorio.service';
import {
  porQueNoSePuedeAbrir,
  porQueNoSePuedeCaducar,
  porQueNoSePuedeDecidir,
  porQueNoSePuedeInstruir,
} from './tramite-sancionatorio';

/**
 * Si el contrato admite que se le reporte un presunto incumplimiento.
 *
 * El criterio de la historia empieza «dado un contrato en ejecución», y la
 * razón es material: antes de la reunión de inicio no ha corrido plazo que
 * incumplir. Reportar sobre un contrato apenas legalizado acusaría al
 * contratista de no cumplir algo que todavía no tenía que estar cumpliendo.
 *
 * Es la misma regla del seguimiento (EFDS-1168) y por el mismo motivo: las dos
 * actividades hablan de lo que ocurre mientras el contrato se ejecuta.
 */
export function admiteReporteIncumplimiento(estado: EstadoContrato): boolean {
  return alMenos(estado, 'EJECUCION');
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Presunto incumplimiento del contrato (EFDS-1180, RF-INC-01).
 *
 * El bloque no tiene numeral en la matriz —las 63 actividades van de 1.1 a
 * 10.4 y este es un bloque transversal, como las modificaciones—, así que no
 * marca ninguna `ProcesoActividad`: no hay casilla del riel que dar por
 * cumplida. El caso queda en el expediente y en la trazabilidad, que es donde
 * el área jurídica lo va a buscar.
 */
@Injectable()
export class IncumplimientoService {
  constructor(
    private readonly dataSource: DataSource,
    // El trámite (EFDS-1181) se pinta junto al reporte: es el mismo caso visto
    // por el área jurídica, y separarlo en otra pantalla obligaría a quien lo
    // instruye a leer el hecho en una y actuar en otra.
    private readonly sancionatorio: SancionatorioService,
  ) {}

  // ----------------------------------------------------------- consulta --

  /**
   * Los casos del contrato, lo actuado en cada uno y qué se puede hacer.
   *
   * Devuelve el poder y el motivo por separado —`puedeReportar` y
   * `motivoNoPuede`, y lo mismo dentro de cada caso— para que el panel pueda
   * decir qué falta, y no solo que la acción no está disponible.
   */
  async estado(procesoId: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const contrato = await this.contratoDelProceso(em, procesoId);

    // La reserva legal exige bitácora de quién consultó, no solo de quién
    // escribió (EFDS-1182, RNF-AUD-01). Se registra aunque no haya casos: el
    // acceso al módulo ya es el hecho auditable.
    await this.traza(em, procesoId, contrato?.id ?? procesoId, 'CONSULTAR', acceso, {
      bloque: 'Presunto Incumplimiento',
      contrato: contrato?.numero ?? null,
    });

    if (!contrato) {
      return {
        enEjecucion: false,
        puedeReportar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        casos: [],
      };
    }

    const enEjecucion = admiteReporteIncumplimiento(contrato.estado);

    const casos = await em.getRepository(CasoIncumplimiento).find({
      where: { contratoId: contrato.id },
      order: { fechaHecho: 'DESC', createdAt: 'DESC' },
    });

    const documentos = casos.some((c) => c.documentoId)
      ? await em.getRepository(Documento).findByIds(
          casos.map((c) => c.documentoId).filter((id): id is string => !!id),
        )
      : [];

    const tramites = await this.sancionatorio.tramiteDe(
      em,
      casos.map((caso) => caso.id),
    );

    return {
      enEjecucion,
      puedeReportar: enEjecucion,
      motivoNoPuede: enEjecucion
        ? null
        : alMenos(contrato.estado, 'LEGALIZADO')
          ? 'el contrato todavía no tiene registrada su reunión de inicio'
          : 'el contrato todavía no está legalizado',

      contrato: {
        numero: contrato.numero,
        estado: contrato.estado,
      },

      casos: casos.map((caso) => {
        const doc = documentos.find((d) => d.id === caso.documentoId);
        const tramite = tramites.get(caso.id) ?? { audiencias: [], resoluciones: [] };

        return {
          id: caso.id,
          motivo: caso.motivo,
          fechaHecho: caso.fechaHecho,
          estado: caso.estado,
          reportadoPor: caso.reportadoPor,
          createdAt: caso.createdAt,
          soporte: doc
            ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl }
            : null,
          tramite: this.comoVaElTramite(caso.estado, tramite, contrato.estado),
        };
      }),
    };
  }

  /**
   * Qué se puede hacer en el caso y qué falta para lo que no.
   *
   * Las reglas son las puras del trámite (EFDS-1181), no una segunda versión
   * escrita para la pantalla: si el panel dedujera por su cuenta cuándo se
   * puede decidir, tarde o temprano ofrecería un botón que el servidor rechaza.
   */
  private comoVaElTramite(
    estadoCaso: EstadoCasoIncumplimiento,
    tramite: TramiteDelCaso,
    estadoContrato: EstadoContrato,
  ) {
    const celebradas = tramite.audiencias.filter((a) => a.estado === 'CELEBRADA').length;
    const citada = tramite.audiencias.find((a) => a.estado === 'CITADA') ?? null;

    // Se pregunta por un sentido que sanciona: archivar es lo único que no
    // exige haber oído al contratista, y el panel lo dice aparte.
    const noPuedeSancionar = porQueNoSePuedeDecidir(estadoCaso, 'DECLARA_INCUMPLIMIENTO', celebradas);
    const noPuedeArchivar = porQueNoSePuedeDecidir(estadoCaso, 'ARCHIVA', celebradas);
    const noPuedeInstruir = porQueNoSePuedeInstruir(estadoCaso);
    const noPuedeAbrir = porQueNoSePuedeAbrir(estadoCaso);

    return {
      audiencias: tramite.audiencias,
      resoluciones: tramite.resoluciones,
      audienciasCelebradas: celebradas,
      /** La citada que está pendiente de que se registre qué pasó, si la hay. */
      audienciaPendiente: citada ? { id: citada.id, citadaPara: citada.citadaPara } : null,

      puedeAbrir: !noPuedeAbrir,
      motivoNoAbrir: noPuedeAbrir,

      // Citar exige que no haya otra pendiente: mal se cita a una segunda
      // audiencia sin haber dicho qué pasó con la primera.
      puedeCitar: !noPuedeInstruir && !citada,
      motivoNoCitar:
        noPuedeInstruir ??
        (citada ? 'ya hay una audiencia citada: registra primero qué pasó con ella' : null),

      puedeSancionar: !noPuedeSancionar,
      motivoNoSancionar: noPuedeSancionar,
      puedeArchivar: !noPuedeArchivar,
      motivoNoArchivar: noPuedeArchivar,

      // La caducidad depende además del contrato, que es de lo que el trámite
      // no sabe: interrumpe una ejecución, así que exige que la haya.
      motivoNoCaducar: porQueNoSePuedeCaducar(estadoContrato),
    };
  }

  // ------------------------------------------------------------ reporte --

  /**
   * Abre el caso.
   *
   * El soporte llega opcional: un incumplimiento se constata a veces sin
   * documento a la mano —una obra que no avanza, un entregable que no llega—,
   * y exigir uno dejaría al supervisor sin poder reportar lo que está viendo.
   */
  async reportar(
    procesoId: string,
    dto: ReportarIncumplimientoDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);

      this.validarFecha(dto);

      let documentoId: string | null = null;
      if (archivo && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · soporte del presunto incumplimiento`,
          archivo,
          hash,
          acceso,
        );
        documentoId = doc.id;
      }

      // Quién vigilaba al reportarlo, no quién vigila hoy: el supervisor puede
      // cambiar y el caso se abrió bajo la vigilancia de uno concreto.
      const supervisor = await this.supervisorVigente(contrato.id, em);

      const caso = await em.save(
        em.create(CasoIncumplimiento, {
          contratoId: contrato.id,
          motivo: dto.motivo.trim(),
          fechaHecho: dto.fechaHecho,
          documentoId,
          estado: 'REPORTADO',
          reportadoPor: acceso.userName,
          supervisionId: supervisor?.id ?? null,
        } as Partial<CasoIncumplimiento>),
      );

      await this.traza(em, procesoId, caso.id, 'REPORTAR', acceso, {
        bloque: 'Presunto Incumplimiento',
        contrato: contrato.numero,
        fechaHecho: dto.fechaHecho,
        conSoporte: !!documentoId,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- auxiliares --

  /**
   * El hecho ya ocurrió.
   *
   * Un incumplimiento futuro no es un incumplimiento: es una previsión, y
   * abrirle un caso pondría al contratista a responder por algo que todavía
   * puede cumplir.
   */
  private validarFecha(dto: ReportarIncumplimientoDto) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (dto.fechaHecho > hoy) {
      throw new BadRequestException(
        'La fecha del hecho no puede ser posterior a hoy: se reporta lo ya ocurrido, no lo que se teme',
      );
    }
  }

  private async exigirContratoEnEjecucion(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteReporteIncumplimiento(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está en ejecución: sin reunión de inicio no ha corrido plazo que incumplir',
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
        // El bloque no tiene numeral en la matriz, así que el documento se
        // ancla al de la ejecución: es donde el expediente lo va a buscar.
        numeral: '9.2',
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
        entidad: 'caso_incumplimiento',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
