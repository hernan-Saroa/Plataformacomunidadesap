import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { ESTADOS_VIVOS, Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { CadenaAprobacionService } from '../cadena-aprobacion/cadena-aprobacion.service';

/** Lo que queda en `datos` de la actividad mientras siga reabierta. */
export interface Reapertura {
  motivo: string;
  por: string;
  porId: string | null;
  at: string;
}

/** Una actividad del proceso, como la lista la pantalla de reabrir. */
export interface ActividadReabrible {
  numeral: string;
  nombre: string;
  etapa: number;
  /** APROBADO: se puede reabrir. DEVUELTO con `reapertura`: se puede deshacer. */
  estado: string;
  reapertura: Reapertura | null;
}

/**
 * Si la actividad está en condiciones de reabrirse, o por qué no.
 *
 * Solo lo aprobado: lo que sigue en curso no está cerrado, lo devuelto ya está
 * en manos de quien corrige, y lo negado o lo que no aplica no tiene nada que
 * corregir. Y solo en un proceso vivo: en uno cancelado o desierto, corregir
 * una actividad no le devuelve la vida, es trabajo que se pide para nada.
 *
 * Función pura para fijar la regla sin base de datos.
 */
export function motivoParaNoReabrir(
  estadoProceso: string,
  estadoActividad: string | null,
): string | null {
  if (!(ESTADOS_VIVOS as readonly string[]).includes(estadoProceso)) {
    return 'El proceso ya terminó: no hay actividad que valga la pena reabrir';
  }
  if (estadoActividad !== 'APROBADO') {
    return 'Solo se reabre una actividad ya cerrada (aprobada)';
  }
  return null;
}

/**
 * Reabrir actividades ya cerradas (migración 153).
 *
 * Un error humano en una actividad aprobada —un dato mal transcrito, el
 * soporte equivocado— no tenía por dónde corregirse, y si lo que sigue
 * depende de ella el proceso se quedaba quieto. Esto hace lo mismo que el
 * comité cuando observa (EFDS-2068), sin limitarse a la 3.1 y la 3.6: la
 * actividad vuelve a DEVUELTO con una revisión que dice qué corregir, quien la
 * trabajó la corrige y pasa otra vez por su aprobación.
 *
 * Lo que vino después no se toca: rehacerlo sería destruir trabajo que pudo
 * publicarse en el SECOP, y casi nunca es lo que el error exige.
 *
 * Si la reapertura sobró —se eligió mal, o el panel no deja corregir lo que
 * se esperaba—, se deshace mientras la actividad siga devuelta: vuelve a
 * APROBADO y nadie queda esperando una corrección que no va a llegar.
 */
@Injectable()
export class ReaperturaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cadenas: CadenaAprobacionService,
  ) {}

  /** Las actividades del proceso que se pueden reabrir o cuya reapertura se puede deshacer. */
  async listar(procesoId: string): Promise<ActividadReabrible[]> {
    const em = this.dataSource.manager;
    await this.exigirProceso(em, procesoId);

    const filas: {
      numeral: string;
      nombre: string | null;
      etapa: number | null;
      estado: string;
      datos: Record<string, any> | null;
    }[] = await em.query(
      `SELECT pa.numeral, a.nombre, a.etapa, pa.estado, pa.datos
         FROM hiring.proceso_actividades pa
         LEFT JOIN hiring.actividades a ON a.numeral = pa.numeral
        WHERE pa.proceso_id = $1
          AND (pa.estado = 'APROBADO' OR (pa.estado = 'DEVUELTO' AND pa.datos ? 'reapertura'))
        ORDER BY a.etapa NULLS LAST, a.orden NULLS LAST, pa.numeral`,
      [procesoId],
    );

    return filas.map((f) => ({
      numeral: f.numeral,
      nombre: f.nombre ?? f.numeral,
      etapa: f.etapa ?? Number(f.numeral.split('.')[0]),
      estado: f.estado,
      reapertura: f.estado === 'DEVUELTO' ? (f.datos?.reapertura ?? null) : null,
    }));
  }

  /** Reabre una o más actividades cerradas, todas o ninguna. */
  async reabrir(procesoId: string, numerales: string[], motivo: string, acceso: HiringAccess) {
    const texto = motivo?.trim();
    if (!texto) {
      throw new BadRequestException('Explica qué hay que corregir: es lo que va a leer quien la reabra');
    }
    const elegidos = [...new Set(numerales ?? [])];
    if (!elegidos.length) {
      throw new BadRequestException('Elige al menos una actividad para reabrir');
    }

    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);

      const reabiertas: string[] = [];
      for (const numeral of elegidos) {
        const actividad = await em
          .getRepository(ProcesoActividad)
          .findOne({ where: { procesoId, numeral }, lock: { mode: 'pessimistic_write' } });
        if (!actividad) {
          throw new NotFoundException(`El proceso no tiene la actividad ${numeral}`);
        }
        const motivoNo = motivoParaNoReabrir(proceso.estado, actividad.estado);
        if (motivoNo) {
          throw new ConflictException(`${numeral}: ${motivoNo}`);
        }

        const reapertura: Reapertura = {
          motivo: texto,
          por: acceso.userName,
          porId: acceso.userId ?? null,
          at: new Date().toISOString(),
        };
        actividad.estado = 'DEVUELTO';
        actividad.revisadoPor = acceso.userName;
        actividad.revisadoAt = new Date();
        actividad.datos = { ...(actividad.datos ?? {}), reapertura };
        await em.save(ProcesoActividad, actividad);

        // La revisión es lo que cada panel ya lee para mostrar qué corregir.
        await em.save(
          em.create(Revision, {
            procesoActividadId: actividad.id,
            decision: 'DEVUELTO',
            observaciones: texto,
            versionRevisada: actividad.version,
            revisadoPor: acceso.userName,
            revisadoPorId: acceso.userId,
          } as Partial<Revision>),
        );
        // Una ronda que quedara abierta de antes ya no aplica a esta vuelta.
        await this.cadenas.cancelarRonda(em, actividad.id, 'CANCELADA');

        await this.traza(em, procesoId, actividad.id, 'REABRIR', acceso, {
          numeral,
          motivo: texto,
          origen: 'reapertura',
        });
        reabiertas.push(numeral);
      }

      return { reabiertas };
    });
  }

  /** Deshace la reapertura: la actividad vuelve a APROBADO como estaba. */
  async deshacer(procesoId: string, numeral: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);

      const actividad = await em
        .getRepository(ProcesoActividad)
        .findOne({ where: { procesoId, numeral }, lock: { mode: 'pessimistic_write' } });
      if (!actividad) {
        throw new NotFoundException(`El proceso no tiene la actividad ${numeral}`);
      }
      // Solo mientras siga devuelta por una reapertura: si ya la corrigieron
      // y la reenviaron, o la devolvió un revisor, no es esta llave la que la
      // tiene que cerrar.
      if (actividad.estado !== 'DEVUELTO' || !actividad.datos?.reapertura) {
        throw new ConflictException(
          `La actividad ${numeral} no está reabierta: no hay reapertura que deshacer`,
        );
      }

      const { reapertura, ...resto } = actividad.datos;
      actividad.estado = 'APROBADO';
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = new Date();
      actividad.datos = resto;
      await em.save(ProcesoActividad, actividad);

      await em.save(
        em.create(Revision, {
          procesoActividadId: actividad.id,
          decision: 'APROBADO',
          observaciones: `Se deshizo la reapertura («${reapertura.motivo}»)`,
          versionRevisada: actividad.version,
          revisadoPor: acceso.userName,
          revisadoPorId: acceso.userId,
        } as Partial<Revision>),
      );

      await this.traza(em, procesoId, actividad.id, 'ANULAR', acceso, {
        numeral,
        origen: 'reapertura',
        motivoReapertura: reapertura.motivo,
      });

      return { numeral, estado: actividad.estado };
    });
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({
      where: { id: procesoId },
      ...(bloquear ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    return proceso;
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string | null,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'proceso_actividad',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
