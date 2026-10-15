import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { AccionEscalon, RondaAprobacion } from '../../entities/cadena-aprobacion.entity';
import { NUMERAL_ESTUDIO_PREVIO, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';
import { soportesDeDevolucion } from '../documentos-actividad/documentos-actividad.service';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { CadenaResuelta, esResponsable } from '../cadena-aprobacion/cadena';
import { CadenaAprobacionService, NOMBRE_PAPEL } from '../cadena-aprobacion/cadena-aprobacion.service';
import { CdpService } from '../cdp/cdp.service';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { DocumentosActividadService } from '../documentos-actividad/documentos-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';

/**
 * La aprobación de una actividad, cuando el área la configuró (EFDS-1183).
 *
 * Siete actividades del módulo se aprueban con lógica propia —las garantías
 * exigen contrato suscrito, el aval del pago que seas el supervisor vigente— y
 * este servicio no las toca: resuelve el caso genérico, el de las actividades
 * que no tienen ciclo propio y que el área decide que necesitan un visto bueno.
 *
 * Desde la migración 101 ese visto bueno puede tener varios escalones. Quién
 * decide cada uno y en qué queda la ronda lo resuelve `CadenaAprobacionService`;
 * aquí queda el trámite alrededor: los documentos que faltan, la firma, la
 * trazabilidad y lo que dispara la aprobación definitiva.
 *
 * Vive aparte y no dentro de `configuracion` porque son cosas distintas: allí
 * se declara qué exige cada actividad, aquí se ejecuta el trámite.
 */
@Injectable()
export class AprobacionService {
  constructor(
    private readonly dataSource: DataSource,
    /**
     * Aprobar una actividad puede cerrar la etapa 3, y entonces nace el CDP.
     *
     * Es el tercero de los tres caminos por los que una actividad de esa etapa
     * queda cerrada —los otros dos son la revisión del estudio previo y tomar
     * el proceso de la bandeja—, y los tres tienen que preguntarlo.
     */
    private readonly cdp: CdpService,
    /** Si la actividad exige firmar con el token institucional al aprobarla (EFDS-2070). */
    private readonly cierre: CierreActividadService,
    /** Qué documentos le faltan a la actividad, del catálogo único (EFDS-2066). */
    private readonly catalogo: DocumentosActividadService,
    /** Quién decide y en qué orden: la cadena de escalones (migración 101). */
    private readonly cadenas: CadenaAprobacionService,
  ) {}

  // ------------------------------------------------------ la configuración --

  /**
   * La cadena que aprueba esta actividad, o null si no requiere aprobación.
   *
   * Se resuelve por actividad y modalidad: la matriz permite que una actividad
   * exija aprobación en licitación y no en mínima cuantía. Una regla de un
   * solo aprobador llega como una cadena de un escalón.
   */
  aprobadoresDe(
    numeral: string,
    modalidad: string | null,
    em?: EntityManager,
  ): Promise<CadenaResuelta | null> {
    return this.cadenas.cadenaPara(numeral, modalidad, em);
  }

  /**
   * Abre la ronda de una actividad que entró en revisión por otro camino que
   * `enviar`: el registro con soporte la manda a revisión al guardarlo.
   */
  abrirRonda(
    em: EntityManager,
    actividad: ProcesoActividad,
    cadena: CadenaResuelta,
    acceso: HiringAccess,
  ) {
    return this.cadenas.iniciar(em, actividad, cadena, acceso);
  }

  /**
   * Todo lo que el panel necesita para pintar el pie de la actividad.
   *
   * En una sola consulta y no repartido entre endpoints: la pantalla necesita a
   * la vez si requiere aprobación, en qué escalón va, qué puede hacer quien
   * mira y qué observaciones le dejaron. Pedirlo por partes obligaría a varias
   * llamadas para dibujar un botón.
   */
  async estadoDeAprobacion(procesoId: string, numeral: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    const cadena = await this.aprobadoresDe(numeral, proceso?.modalidad ?? null, em);
    const ronda = actividad ? await this.cadenas.rondaParaMostrar(actividad, acceso) : null;

    /*
     * Todas las decisiones, no solo la última, y de todas las rondas: quien va
     * a decidir ve qué se pidió corregir antes. De la más nueva a la más
     * vieja, porque la última es la que manda sobre el estado actual.
     */
    const revisiones = actividad
      ? await em.getRepository(Revision).find({
          where: { procesoActividadId: actividad.id },
          order: { createdAt: 'DESC' },
        })
      : [];
    const rondas = actividad
      ? await em.getRepository(RondaAprobacion).find({ where: { procesoActividadId: actividad.id } })
      : [];
    const numeroDeRonda = new Map(rondas.map((r) => [r.id, r.ronda]));
    const ultima = revisiones[0] ?? null;
    const soportes = await soportesDeDevolucion(
      em,
      revisiones.flatMap((r) => r.soportesDocumentoIds ?? []),
    );

    const enviadoPorId = actividad?.enviadoPorId;
    const esMia =
      !!actividad &&
      (enviadoPorId
        ? enviadoPorId === acceso.userId
        : actividad.enviadoPor === acceso.userName);

    // A quién se espera: el escalón pendiente si la ronda está viva; si no, el
    // primero de la cadena que rige, para decir de antemano quién la revisa.
    const pendiente =
      ronda?.estado === 'EN_CURSO' ? ronda.escalones.find((e) => e.estado === 'PENDIENTE') : undefined;
    const primero = cadena?.escalones[0];
    const nombresDeRoles = await this.cadenas.nombresDeRoles(primero?.roles ?? []);
    const nombresDePersonas = await this.cadenas.nombresDePersonas(primero?.personas ?? []);

    return {
      requiereAprobacion: cadena !== null,
      aprobadores: pendiente
        ? { roles: pendiente.responsables, personas: [] }
        : primero
          ? {
              roles: [
                ...primero.roles.map((r) => nombresDeRoles.get(r) ?? r),
                ...primero.papeles.map((p) => NOMBRE_PAPEL[p] ?? p),
              ],
              // Con su nombre, no con el identificador: una actividad designada
              // solo a una persona decía «aún no se ha designado quién aprueba».
              personas: primero.personas.map((p) => nombresDePersonas.get(p) ?? p),
            }
          : null,
      /** La cadena que rige hoy: cómo se llama y sus escalones, en orden. */
      cadena: cadena ? { nombre: cadena.nombre, escalones: cadena.escalones.map((e) => e.nombre) } : null,
      /** La ronda en curso o la última, con el estado de cada escalón. */
      ronda,
      // Se resuelve aquí y no en el cliente: la pantalla no debería replicar la
      // regla de quién puede decidir, porque quedaría desactualizada.
      acciones: (ronda?.acciones ?? []) as AccionEscalon[],
      puedoAprobar: ronda?.acciones.includes('APROBAR') ?? false,
      /** Por qué quien es responsable no puede aprobar ahora, si es el caso. */
      motivo: ronda?.motivo ?? null,
      estado: actividad?.estado ?? 'BORRADOR',
      // Ya no apaga nada: quien la trabajó la aprueba si tiene el rol. Sigue
      // publicándose porque es lo que habilita retirarla de revisión.
      esMia,
      observaciones: ultima && ultima.decision !== 'APROBADO' ? ultima.observaciones : null,
      decididaPor: ultima?.revisadoPor ?? null,
      /*
       * El recorrido completo del trámite, con la ronda y el escalón de cada
       * decisión. Se manda siempre, aunque la pantalla lo pinte plegado: son
       * unas pocas filas y pedirlas aparte obligaría a una segunda consulta
       * justo cuando el aprobador va a decidir.
       */
      revisiones: revisiones.map((r) => ({
        decision: r.decision,
        observaciones: r.observaciones ?? null,
        revisadoPor: r.revisadoPor,
        versionRevisada: r.versionRevisada,
        fecha: r.createdAt,
        ronda: r.aprobacionId ? (numeroDeRonda.get(r.aprobacionId) ?? null) : null,
        escalon: r.escalon ?? null,
        soportes: (r.soportesDocumentoIds ?? []).flatMap((id) => soportes.get(id) ?? []),
      })),
    };
  }

  /**
   * Los documentos obligatorios que la actividad pide y nadie ha entregado.
   *
   * Devuelve sus nombres y no un número: «falta cargar el memorando de
   * solicitud» le dice a quien aprueba qué pedir, y «falta 1 documento» no.
   */
  private async documentosPendientes(
    em: EntityManager,
    procesoId: string,
    numeral: string,
  ): Promise<string[]> {
    return (await this.catalogo.faltantes(procesoId, numeral, em)).map((r) => r.nombre);
  }

  /**
   * Si el usuario está entre los aprobadores de un escalón de roles y personas.
   *
   * Basta con estar en uno de los grupos: designar dos roles y una persona es
   * decir que cualquiera de ellos puede resolverla. Es la misma regla con la
   * que la cadena decide cada escalón, `esResponsable`.
   *
   * `personaId` y no `userId`: el buscador guarda el `id_person` del
   * directorio, mientras que la sesión trae el `id_user` de la cuenta. Son
   * distintos, así que compararlos entre sí nunca coincidía.
   */
  puedeAprobar(
    aprobadores: { roles: string[]; personas: string[] },
    acceso: HiringAccess,
    personaId?: string | null,
  ): boolean {
    return esResponsable(
      { roles: aprobadores.roles, personas: aprobadores.personas, papeles: [], puestos: [] },
      { roles: acceso.roles ?? [], personaId: personaId ?? null, papeles: [] },
    );
  }

  // ------------------------------------------------------------ el trámite --

  /**
   * Envía la actividad a aprobación: abre una ronda en el primer escalón.
   *
   * Se guarda quién la envió —con su id y no solo su nombre—: es a quien
   * regresa cualquier devolución, porque es el único que la corrige.
   */
  async enviar(procesoId: string, numeral: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const { actividad, proceso } = await this.exigirActividad(em, procesoId, numeral);

      const cadena = await this.aprobadoresDe(numeral, proceso.modalidad, em);
      if (!cadena) {
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
      if (actividad.estado === 'NEGADO') {
        throw new ConflictException('La actividad fue negada: no se puede volver a enviar');
      }

      actividad.estado = 'EN_REVISION';
      actividad.enviadoPor = acceso.userName;
      actividad.enviadoPorId = acceso.userId ?? null;
      actividad.enviadoAt = new Date();
      await em.save(actividad);

      const ronda = await this.cadenas.iniciar(em, actividad, cadena, acceso);

      await this.traza(em, procesoId, actividad.id, 'ENVIAR', acceso, {
        numeral,
        ronda: ronda.ronda,
      });

      return { estado: actividad.estado, aprobadores: cadena };
    });
  }

  /**
   * Retira la actividad de aprobación para poder corregirla.
   *
   * Solo quien la envió: si cualquiera pudiera retirarla, el aprobador vería
   * desaparecer de su bandeja algo que estaba a punto de resolver. La ronda
   * queda RETIRADA con lo que alcanzó a decidirse.
   */
  async retirar(procesoId: string, numeral: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const { actividad } = await this.exigirActividad(em, procesoId, numeral);

      if (actividad.estado !== 'EN_REVISION') {
        throw new ConflictException('La actividad no está esperando aprobación');
      }

      const suya =
        actividad.enviadoPorId === acceso.userId ||
        actividad.enviadoPor === acceso.userName;
      if (!suya && !acceso.roles?.includes('SUPER_ADMIN')) {
        throw new ForbiddenException('Solo quien la envió puede retirarla de aprobación');
      }

      actividad.estado = 'BORRADOR';
      await em.save(actividad);
      await this.cadenas.cancelarRonda(em, actividad.id, 'RETIRADA');

      await this.traza(em, procesoId, actividad.id, 'RETIRAR', acceso, { numeral });

      return { estado: actividad.estado };
    });
  }

  /**
   * Aprueba el escalón que le toca a quien decide. Las observaciones son
   * opcionales. Si era el último, la actividad queda aprobada.
   *
   * `firma` es la evidencia de quien da la aprobación definitiva, y solo se
   * exige si la actividad quedó configurada con `EXIGE_FIRMA` (EFDS-2070).
   */
  async aprobar(
    procesoId: string,
    numeral: string,
    observaciones: string | undefined,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    return this.decidir(procesoId, numeral, 'APROBAR', observaciones, acceso, firma);
  }

  /**
   * Devuelve la actividad a quien la envió, desde cualquier escalón: es el
   * único que la corrige, y al reenviarla la cadena empieza otra vez.
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
    return this.decidir(procesoId, numeral, 'DEVOLVER', observaciones, acceso);
  }

  /**
   * Niega la actividad: no procede, y el proceso termina ahí, igual que cuando
   * el abogado niega el estudio previo. Solo puede hacerlo un escalón al que
   * la configuración le dio esa acción.
   */
  async negar(
    procesoId: string,
    numeral: string,
    observaciones: string,
    acceso: HiringAccess,
  ) {
    if (!observaciones?.trim()) {
      throw new BadRequestException(
        'El motivo es obligatorio al negar: a quien le niegan algo hay que decirle por qué',
      );
    }
    return this.decidir(procesoId, numeral, 'NEGAR', observaciones, acceso);
  }

  private async decidir(
    procesoId: string,
    numeral: string,
    accion: AccionEscalon,
    observaciones: string | undefined,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    // El estudio previo lo decide en la 3.4 el abogado asignado en la 3.3, con
    // su propio trámite; por aquí lo podría resolver cualquiera con el rol.
    if (numeral === NUMERAL_ESTUDIO_PREVIO) {
      throw new ConflictException(
        'El estudio previo se decide en la revisión de la 3.4, por el abogado asignado al proceso',
      );
    }

    return this.dataSource.transaction(async (em) => {
      const { actividad, proceso } = await this.exigirActividad(em, procesoId, numeral);

      // Comprueba que le toque a quien decide y calcula en qué queda todo, sin
      // escribir: lo que sigue depende de si es la aprobación definitiva.
      const preparada = await this.cadenas.prepararDecision(
        em,
        actividad,
        proceso.modalidad ?? null,
        accion,
        acceso,
      );
      const { tras, decision } = preparada;

      /*
       * Quien trabaja la actividad sí puede aprobarla si tiene el rol: la 3.3
       * y la 3.4 las ejecuta la misma Dirección que las aprueba. Lo que la
       * cadena impide es que una misma persona apruebe dos escalones de la
       * misma ronda, salvo que la plantilla lo permita.
       */

      /*
       * No se aprueba con documentos obligatorios sin entregar, en ningún
       * escalón: dar un visto bueno intermedio a algo sin su soporte es pasarle
       * el problema al siguiente. Devolver sí sigue permitido, porque es
       * exactamente el caso para el que sirve.
       */
      if (accion === 'APROBAR') {
        const faltan = await this.documentosPendientes(em, procesoId, numeral);
        if (faltan.length) {
          throw new ConflictException(
            `Falta cargar ${faltan.join(', ')}: la actividad no puede aprobarse sin su soporte`,
          );
        }
      }

      // La firma es de quien da la aprobación definitiva, no de quien envió:
      // cada uno firma su propia acción (EFDS-2070).
      if (tras.aprobacionDefinitiva && (await this.cierre.exigeFirma(em, numeral))) {
        this.cierre.exigirFirmaValida(firma);
      }

      const texto = observaciones?.trim() || null;
      await this.cadenas.registrarDecision(em, preparada, texto, acceso);

      if (tras.aprobacionDefinitiva && firma) {
        actividad.datos = { ...(actividad.datos ?? {}), firmaAprobacion: firma };
        await em.save(actividad);
      }

      await this.traza(
        em,
        procesoId,
        actividad.id,
        decision === 'APROBADO' ? 'APROBAR' : decision === 'NEGADO' ? 'RECHAZAR' : 'DEVOLVER',
        acceso,
        {
          numeral,
          observaciones: texto,
          ronda: preparada.ronda.ronda,
          escalon: preparada.escalon.orden,
          escalonNombre: preparada.escalon.nombre,
          // Lo que necesitan los avisos para no tomar una aprobación
          // intermedia por la definitiva: si cerró, y a quién le toca ahora.
          definitiva: tras.aprobacionDefinitiva,
          activado: tras.activado,
        },
      );

      // Si esta era la última que quedaba abierta en la etapa 3, el proceso
      // pasa solo a la etapa 4. Solo con la aprobación definitiva: una
      // intermedia no cierra nada.
      if (tras.aprobacionDefinitiva) {
        await this.cdp.abrirEtapa4SiCerroLaEtapa3(em, procesoId, acceso);
      }

      // Negar termina el proceso, como la negación del estudio previo: dejarlo
      // vivo haría que el listado lo contara como un expediente en curso.
      if (decision === 'NEGADO') {
        await em.update(Proceso, { id: procesoId }, { estado: 'NEGADO' });
      }

      return {
        estado: actividad.estado,
        decision,
        observaciones: texto,
        escalon: preparada.escalon.orden,
        definitiva: tras.aprobacionDefinitiva,
        siguiente: tras.activado,
      };
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
