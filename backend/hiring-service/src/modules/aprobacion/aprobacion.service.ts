import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { Revision } from '../../entities/revision.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';

/** Quién puede aprobar una actividad, tal como se configuró. */
export interface Aprobadores {
  roles: string[];
  personas: string[];
}

/**
 * La aprobación de una actividad, cuando el área la configuró (EFDS-1183).
 *
 * Siete actividades del módulo se aprueban con lógica propia —las garantías
 * exigen contrato suscrito, el aval del pago que seas el supervisor vigente— y
 * este servicio no las toca: resuelve el caso genérico, el de las actividades
 * que no tienen ciclo propio y que el área decide que necesitan un visto bueno.
 *
 * Vive aparte y no dentro de `configuracion` porque son cosas distintas: allí
 * se declara qué exige cada actividad, aquí se ejecuta el trámite.
 */
@Injectable()
export class AprobacionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------ la configuración --

  /**
   * Quién aprueba esta actividad, o null si no requiere aprobación.
   *
   * Se resuelve por actividad y modalidad: la matriz permite que una actividad
   * exija aprobación en licitación y no en mínima cuantía, y la regla lo
   * respeta porque `reglas_actividad` ya distingue por modalidad.
   */
  async aprobadoresDe(
    numeral: string,
    modalidad: string | null,
    em?: EntityManager,
  ): Promise<Aprobadores | null> {
    const manager = em ?? this.dataSource.manager;

    const reglas = await manager.getRepository(ReglaActividad).find({
      where: [
        { numeral, tipo: 'EXIGE_APROBACION', modalidad: IsNull(), vigenteHasta: IsNull() },
        {
          numeral,
          tipo: 'EXIGE_APROBACION',
          modalidad: modalidad ?? undefined,
          vigenteHasta: IsNull(),
        },
      ],
    });

    if (!reglas.length) return null;

    // Si hay una específica de la modalidad manda sobre la general: es el mismo
    // criterio con el que la matriz permite que una modalidad se salte lo que
    // las demás cumplen.
    const regla = reglas.find((r) => r.modalidad) ?? reglas[0];
    const config = (regla.config ?? {}) as Record<string, unknown>;

    const roles = Array.isArray(config.roles) ? (config.roles as string[]) : [];
    const personas = Array.isArray(config.personas) ? (config.personas as string[]) : [];

    // Una regla sin aprobadores no exige nada: bloquearía la actividad sin que
    // nadie pudiera desbloquearla.
    if (!roles.length && !personas.length) return null;

    return { roles, personas };
  }

  /** Si el usuario está entre los aprobadores configurados. */
  puedeAprobar(aprobadores: Aprobadores, acceso: HiringAccess): boolean {
    if (acceso.roles?.includes('SUPER_ADMIN')) return true;
    if (aprobadores.personas.includes(acceso.userId)) return true;
    return aprobadores.roles.some((rol) => acceso.roles?.includes(rol));
  }

  // ------------------------------------------------------------ el trámite --

  /**
   * Envía la actividad a aprobación.
   *
   * Se guarda quién la envió —con su id y no solo su nombre— porque es lo que
   * permite después impedir que se la apruebe él mismo.
   */
  async enviar(procesoId: string, numeral: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const { actividad, proceso } = await this.exigirActividad(em, procesoId, numeral);

      const aprobadores = await this.aprobadoresDe(numeral, proceso.modalidad, em);
      if (!aprobadores) {
        throw new BadRequestException(
          'Esta actividad no requiere aprobación: se cierra directamente',
        );
      }

      if (actividad.estado === 'EN_REVISION') {
        throw new ConflictException('La actividad ya está esperando aprobación');
      }
      if (actividad.estado === 'APROBADO') {
        throw new ConflictException('La actividad ya fue aprobada');
      }

      actividad.estado = 'EN_REVISION';
      actividad.enviadoPor = acceso.userName;
      (actividad as any).enviadoPorId = acceso.userId;
      await em.save(actividad);

      await this.traza(em, procesoId, actividad.id, 'ENVIAR', acceso, { numeral });

      return { estado: actividad.estado, aprobadores };
    });
  }

  /**
   * Retira la actividad de aprobación para poder corregirla.
   *
   * Solo quien la envió: si cualquiera pudiera retirarla, el aprobador vería
   * desaparecer de su bandeja algo que estaba a punto de resolver.
   */
  async retirar(procesoId: string, numeral: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const { actividad } = await this.exigirActividad(em, procesoId, numeral);

      if (actividad.estado !== 'EN_REVISION') {
        throw new ConflictException('La actividad no está esperando aprobación');
      }

      const suya =
        (actividad as any).enviadoPorId === acceso.userId ||
        actividad.enviadoPor === acceso.userName;
      if (!suya && !acceso.roles?.includes('SUPER_ADMIN')) {
        throw new ForbiddenException('Solo quien la envió puede retirarla de aprobación');
      }

      actividad.estado = 'BORRADOR';
      await em.save(actividad);

      await this.traza(em, procesoId, actividad.id, 'RETIRAR', acceso, { numeral });

      return { estado: actividad.estado };
    });
  }

  /** Aprueba la actividad. Las observaciones son opcionales. */
  async aprobar(
    procesoId: string,
    numeral: string,
    observaciones: string | undefined,
    acceso: HiringAccess,
  ) {
    return this.decidir(procesoId, numeral, 'APROBADO', observaciones, acceso);
  }

  /**
   * Devuelve la actividad a quien la envió.
   *
   * Las observaciones son obligatorias: devolver sin decir qué corregir deja al
   * gestor adivinando, y es la misma regla que ya aplica el estudio previo.
   */
  async devolver(
    procesoId: string,
    numeral: string,
    observaciones: string,
    acceso: HiringAccess,
  ) {
    if (!observaciones?.trim()) {
      throw new BadRequestException(
        'Explica qué debe corregirse: sin observaciones quien la trabajó no sabe qué cambiar',
      );
    }
    return this.decidir(procesoId, numeral, 'DEVUELTO', observaciones, acceso);
  }

  private async decidir(
    procesoId: string,
    numeral: string,
    decision: 'APROBADO' | 'DEVUELTO',
    observaciones: string | undefined,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const { actividad, proceso } = await this.exigirActividad(em, procesoId, numeral);

      if (actividad.estado !== 'EN_REVISION') {
        throw new ConflictException(
          'La actividad no está esperando aprobación: no hay nada que decidir',
        );
      }

      const aprobadores = await this.aprobadoresDe(numeral, proceso.modalidad, em);
      if (!aprobadores) {
        throw new ConflictException(
          'Esta actividad ya no requiere aprobación: retírala de revisión para cerrarla',
        );
      }

      if (!this.puedeAprobar(aprobadores, acceso)) {
        throw new ForbiddenException(
          'Tu rol no está entre los que aprueban esta actividad',
        );
      }

      /*
       * Quien ejecutó la actividad no la aprueba, aunque tenga el rol.
       *
       * Es la misma regla que ya protege las garantías —«si la misma cuenta
       * hiciera las dos cosas, la revisión no sería una revisión»— y aquí se
       * aplica a cualquier actividad configurada. No es configurable a
       * propósito: si se pudiera desmarcar desde una pantalla dejaría de ser
       * un control.
       */
      const esSuyaPropia =
        (actividad as any).enviadoPorId === acceso.userId ||
        actividad.enviadoPor === acceso.userName;
      if (esSuyaPropia) {
        throw new ForbiddenException(
          'La aprueba alguien distinto de quien la trabajó: es lo que hace que la revisión exista',
        );
      }

      actividad.estado = decision;
      actividad.revisadoPor = acceso.userName;
      (actividad as any).revisadoPorId = acceso.userId;
      await em.save(actividad);

      // La versión revisada queda atada a la decisión: editar el documento
      // después no arrastra la aprobación.
      await em.save(
        em.create(Revision, {
          procesoActividadId: actividad.id,
          decision,
          observaciones: observaciones?.trim() || null,
          versionRevisada: (actividad as any).version ?? 1,
          revisadoPor: acceso.userName,
          revisadoPorId: acceso.userId,
        } as Partial<Revision>),
      );

      await this.traza(
        em,
        procesoId,
        actividad.id,
        decision === 'APROBADO' ? 'APROBAR' : 'DEVOLVER',
        acceso,
        { numeral, observaciones: observaciones?.trim() || null },
      );

      return { estado: actividad.estado, decision, observaciones: observaciones ?? null };
    });
  }

  // ---------------------------------------------------------------- común --

  private async exigirActividad(em: EntityManager, procesoId: string, numeral: string) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });
    if (!actividad) {
      throw new NotFoundException(`La actividad ${numeral} no está instanciada en el proceso`);
    }
    if (actividad.estado === 'NO_APLICA') {
      throw new ConflictException('Esta actividad no aplica a la modalidad del proceso');
    }

    return { actividad, proceso };
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
        entidad: 'aprobacion_actividad',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
