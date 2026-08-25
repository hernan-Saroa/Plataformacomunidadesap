import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import {
  DestinoPublicacion,
  PlazoPublicacionContrato,
  PublicacionContrato,
} from '../../entities/publicacion-contrato.entity';
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
import { PublicarContratoDto } from './dto/publicacion-contrato.dto';

/** Actividad 8.8 de la matriz: la publicación del contrato. */
export const NUMERAL_PUBLICACION_CONTRATO = '8.8';

/**
 * Si el contrato admite publicarse.
 *
 * Aquí la matriz y la historia coinciden, al revés de lo que pasa en 8.2.
 *
 * La matriz sitúa la publicación en el último puesto de la etapa, así que
 * leerla como flujo lineal significa exigir cumplidas las anteriores; la
 * historia lo enuncia como «dado un contrato perfeccionado y legalizado», que
 * es la misma condición dicha por el estado. Legalizado es precisamente haber
 * pasado por las garantías (8.4) y la ARL (8.5), las últimas actividades con
 * implementación antes de esta.
 *
 * Publicar antes anunciaría como firme un contrato al que aún pueden faltarle
 * las coberturas.
 *
 * Con una salvedad: la 8.6 —comunicación de inicio— y la 8.7 —acta de inicio—
 * están entre medias en la matriz y no tienen implementación, la primera
 * porque no tiene historia asignada y la segunda porque Jira la ubica en la
 * etapa 9. Cuando existan, esta regla tendrá que mirarlas.
 */
export function admitePublicacion(estado: EstadoContrato): boolean {
  return estado === 'LEGALIZADO';
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Publicación del contrato — actividad 8.8 (EFDS-1166).
 *
 * Se registra el destino porque las fuentes no coinciden: la historia habla de
 * SECOP II y la matriz llama a la actividad «Publicación en página web ESAP».
 * Registrar el sitio reconcilia las dos lecturas sin decidir por Contratación.
 *
 * El cálculo del plazo reutiliza el de la publicidad del pliego (EFDS-1150):
 * los días hábiles y los festivos colombianos ya están resueltos ahí, y tener
 * dos implementaciones del mismo calendario garantizaría que se separaran.
 */
@Injectable()
export class PublicacionContratoService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);
    const plazo = await this.plazoConfigurado();

    if (!contrato) {
      return {
        legalizado: false,
        motivoNoLegalizado: 'el proceso todavía no tiene contrato generado',
        plazo,
        publicaciones: [] as any[],
        pendientes: [] as DestinoPublicacion[],
      };
    }

    const legalizado = admitePublicacion(contrato.estado);
    const publicaciones = await this.dataSource.getRepository(PublicacionContrato).find({
      where: { contratoId: contrato.id },
      order: { fechaPublicacion: 'ASC' },
    });

    const festivos = await this.festivos();
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    return {
      legalizado,
      motivoNoLegalizado: legalizado
        ? null
        : contrato.estado === 'PERFECCIONADO'
          ? 'al contrato le faltan las garantías o la ARL'
          : 'el contrato todavía no lo han firmado las dos partes',
      contrato: { numero: contrato.numero, objeto: contrato.objeto },
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
          // Se dice si llegó a tiempo, que es lo que el criterio pide
          // controlar: publicar tarde es un hallazgo, no un detalle.
          aTiempo: p.fechaLimite ? p.fechaPublicacion <= p.fechaLimite : null,
          diasHabilesRestantes: restantes,
          estadoPlazo: estadoDelPlazo(restantes),
        };
      }),
      // Qué destinos faltan, dicho por el servidor: la pantalla no tiene por
      // qué conocer la lista ni cómo se compara.
      pendientes: (['SECOP_II', 'WEB_ESAP'] as DestinoPublicacion[]).filter(
        (d) => !publicaciones.some((p) => p.destino === d),
      ),
    };
  }

  // ----------------------------------------------------------- publicación --

  async publicar(
    procesoId: string,
    dto: PublicarContratoDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);

      const repetida = await em.getRepository(PublicacionContrato).findOne({
        where: { contratoId: contrato.id, destino: dto.destino },
      });
      if (repetida) {
        throw new ConflictException(
          dto.destino === 'SECOP_II'
            ? 'El contrato ya se registró como publicado en SECOP II'
            : 'El contrato ya se registró como publicado en la página web de la ESAP',
        );
      }

      this.validarFecha(dto.fechaPublicacion);

      const plazo = await this.plazoConfigurado();
      const festivos = await this.festivos();

      // El plazo corre desde el perfeccionamiento, que es cuando el contrato
      // quedó suscrito y nació la obligación de publicarlo.
      const desde = contrato.perfeccionadoAt
        ? aYMD(contrato.perfeccionadoAt)
        : dto.fechaPublicacion;
      const fechaLimite = sumarDiasHabiles(desde, plazo.diasHabiles, festivos);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · evidencia de publicación`,
        evidencia,
        hash,
        acceso,
      );

      const publicacion = await em.save(
        em.create(PublicacionContrato, {
          contratoId: contrato.id,
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
        } as Partial<PublicacionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, publicacion.id, 'PUBLICAR', acceso, {
        actividad: NUMERAL_PUBLICACION_CONTRATO,
        contrato: contrato.numero,
        destino: dto.destino,
        fechaPublicacion: dto.fechaPublicacion,
        fechaLimite,
        aTiempo: dto.fechaPublicacion <= fechaLimite,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  private async plazoConfigurado() {
    const plazo = await this.dataSource
      .getRepository(PlazoPublicacionContrato)
      .findOne({ where: { id: 1 } });

    // Si la fila no está sembrada se usa el plazo legal, marcado sin confirmar:
    // dejar el módulo sin plazo lo volvería inutilizable.
    return {
      diasHabiles: plazo?.diasHabiles ?? 3,
      fundamento: plazo?.fundamento ?? null,
      confirmado: plazo?.confirmado ?? false,
    };
  }

  /**
   * Los días no hábiles del calendario, festivos colombianos incluidos.
   *
   * Se toman del mismo sitio que la publicidad del pliego: dos calendarios
   * distintos terminarían dando dos respuestas para la misma fecha.
   */
  private async festivos(): Promise<ReadonlySet<string>> {
    const anio = new Date().getFullYear();
    const calculados = festivosEntre(anio - 1, anio + 2);

    const registrados = await this.dataSource.getRepository(DiaNoHabil).find();
    for (const dia of registrados) calculados.add(dia.fecha);

    return calculados;
  }

  /** La publicación ya ocurrió; no se registra hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de publicación no puede ser posterior a hoy: es la del hecho ya ocurrido',
      );
    }
  }

  /**
   * La actividad se cumple con la publicación en SECOP II.
   *
   * Es la que la historia exige (RF-LEG-05); la de la página web de la ESAP
   * queda registrada pero no condiciona el cierre, porque las fuentes no
   * coinciden en si son dos publicaciones o una sola.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const secop = await em
      .getRepository(PublicacionContrato)
      .findOne({ where: { contratoId, destino: 'SECOP_II' } });

    const aprobado = !!secop;
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_PUBLICACION_CONTRATO } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_PUBLICACION_CONTRATO,
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

  private async exigirContratoLegalizado(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admitePublicacion(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está legalizado: publicarlo anunciaría como firme algo que aún puede cambiar',
      );
    }

    return contrato;
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
        numeral: NUMERAL_PUBLICACION_CONTRATO,
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
        entidad: 'publicacion_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
