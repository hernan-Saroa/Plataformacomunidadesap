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

  /**
   * Todo lo que el panel necesita para pintar el pie de la actividad.
   *
   * En una sola consulta y no repartido entre endpoints: la pantalla necesita a
   * la vez si requiere aprobación, en qué estado está, si quien mira puede
   * decidir y qué observaciones le dejaron. Pedirlo por partes obligaría a
   * cuatro llamadas para dibujar un botón.
   */
  async estadoDeAprobacion(procesoId: string, numeral: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    const aprobadores = await this.aprobadoresDe(numeral, proceso?.modalidad ?? null, em);

    /*
     * Todas las decisiones, no solo la última.
     *
     * Una actividad puede devolverse varias veces antes de aprobarse, y hasta
     * ahora solo se leía la más reciente: quien iba a decidir no veía qué se
     * había pedido corregir en las rondas anteriores, aunque la base lo guarda
     * desde el principio. Se ordenan de la más nueva a la más vieja porque la
     * última es la que manda sobre el estado actual.
     */
    const revisiones = actividad
      ? await em.getRepository(Revision).find({
          where: { procesoActividadId: actividad.id },
          order: { createdAt: 'DESC' },
        })
      : [];
    const revision = revisiones[0] ?? null;

    const enviadoPorId = (actividad as any)?.enviadoPorId;
    const esMia =
      !!actividad &&
      (enviadoPorId
        ? enviadoPorId === acceso.userId
        : actividad.enviadoPor === acceso.userName);

    return {
      requiereAprobacion: aprobadores !== null,
      aprobadores: aprobadores
        ? {
            ...aprobadores,
            roles: await this.nombresDeRoles(aprobadores.roles),
            // Con su nombre, no con el identificador: una actividad designada
            // solo a una persona decía «aún no se ha designado quién aprueba».
            personas: await this.nombresDePersonas(aprobadores.personas),
          }
        : null,
      // Se resuelve aquí y no en el cliente: la pantalla no debería replicar la
      // regla de quién puede aprobar, porque quedaría desactualizada en cuanto
      // cambie aquí.
      puedoAprobar: aprobadores
        ? this.puedeAprobar(aprobadores, acceso, await this.personaDe(acceso.userId)) && !esMia
        : false,
      estado: actividad?.estado ?? 'BORRADOR',
      esMia,
      observaciones: revision?.decision === 'DEVUELTO' ? revision.observaciones : null,
      decididaPor: revision?.revisadoPor ?? null,
      /*
       * El recorrido completo del trámite.
       *
       * Se manda siempre, aunque la pantalla lo pinte plegado: son unas pocas
       * filas por actividad y pedirlas aparte obligaría a una segunda consulta
       * justo cuando el aprobador va a decidir.
       */
      revisiones: revisiones.map((r) => ({
        decision: r.decision,
        observaciones: r.observaciones ?? null,
        revisadoPor: r.revisadoPor,
        versionRevisada: r.versionRevisada,
        fecha: r.createdAt,
      })),
    };
  }

  /**
   * Los nombres legibles de unos códigos de rol, para decirlos en pantalla.
   *
   * «Espera a DIRECTOR_CONTRATACION» es el código de la base, no algo que el
   * gestor deba leer. Si un rol se borró después de configurarlo se deja su
   * código: es peor callar que hay algo roto.
   */
  private async nombresDeRoles(codigos: string[]): Promise<string[]> {
    if (!codigos.length) return [];

    const filas = await this.dataSource.query(
      `SELECT code, name FROM hiring.roles_del_modulo WHERE code = ANY($1::text[])`,
      [codigos],
    );

    return codigos.map(
      (c) => filas.find((f: any) => f.code === c)?.name ?? c,
    );
  }

  /**
   * Los nombres de las personas designadas como aprobadoras.
   *
   * Igual que con los roles: un identificador no es algo que el gestor deba
   * leer, y si la persona ya no está en el directorio se deja el suyo antes
   * que callar que la configuración apunta a alguien que no existe.
   */
  private async nombresDePersonas(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];

    const filas = await this.dataSource.query(
      `SELECT p.id_person AS id, COALESCE(p.nom_largo, p.nom_tercero) AS nombre
         FROM auth.personas p
        WHERE p.id_person = ANY($1::uuid[])`,
      [ids],
    );

    return ids.map((id) => filas.find((f: any) => f.id === id)?.nombre ?? id);
  }

  /**
   * Si el usuario está entre los aprobadores configurados.
   *
   * Basta con estar en uno de los grupos: designar dos roles y una persona es
   * decir que cualquiera de ellos puede resolverla, no que hagan falta las
   * tres firmas. Una aprobación conjunta —que varios tengan que decidir antes
   * de cerrar— no existe hoy y no se puede simular con esta lista.
   *
   * `personaId` y no `userId`: el buscador guarda el `id_person` del
   * directorio, mientras que la sesión trae el `id_user` de la cuenta. Son
   * distintos, así que compararlos entre sí nunca coincidía y designar a
   * alguien por su nombre no le daba la aprobación.
   */
  puedeAprobar(aprobadores: Aprobadores, acceso: HiringAccess, personaId?: string | null): boolean {
    if (acceso.roles?.includes('SUPER_ADMIN')) return true;
    if (personaId && aprobadores.personas.includes(personaId)) return true;
    return aprobadores.roles.some((rol) => acceso.roles?.includes(rol));
  }

  /**
   * La persona del directorio a la que pertenece la cuenta.
   *
   * `auth.user.id_person` es lo que enlaza una con otra; sin esa traducción,
   * un aprobador designado por su nombre no se reconoce al decidir.
   */
  private async personaDe(userId: string | undefined): Promise<string | null> {
    if (!userId) return null;

    const [fila] = await this.dataSource.query(
      `SELECT id_person FROM auth."user" WHERE id_user = $1`,
      [userId],
    );
    return fila?.id_person ?? null;
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

      if (!this.puedeAprobar(aprobadores, acceso, await this.personaDe(acceso.userId))) {
        throw new ForbiddenException(
          'No estás entre quienes aprueban esta actividad',
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
