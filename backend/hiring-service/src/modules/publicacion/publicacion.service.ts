import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import {
  ETAPA_PUBLICACION,
  PublicacionPliego,
} from '../../entities/publicacion-pliego.entity';
import { PlazoPublicacion } from '../../entities/plazo-publicacion.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  HiringAccess,
  ROLES_ADMIN_PLAZOS,
  ROLES_PUBLICACION_PLIEGO,
} from '../../auth/hiring-access';
import { diasHabilesRestantes, estadoDelPlazo, sumarDiasHabiles } from './dias-habiles';
import { festivosEntre } from './festivos-colombia';
import {
  AnularPublicacionDto,
  GuardarPlazoDto,
  RegistrarPublicacionDto,
} from './dto/publicacion.dto';

/** Actividad 5.2 de la matriz: la publicación del proyecto de pliego. */
export const NUMERAL_PUBLICACION = '5.2';

@Injectable()
export class PublicacionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------- calendario ------

  /**
   * Días no hábiles que aplican a un rango de años.
   *
   * Los festivos nacionales se calculan (ver `festivos-colombia`), así que el
   * calendario no tiene tope: no hay un año a partir del cual el módulo deje de
   * poder contar. La tabla aporta solo los días que la entidad declare por su
   * cuenta —una semana de receso institucional, por ejemplo—, que sí hay que
   * cargar a mano porque no se deducen de la ley.
   */
  private async calendario(
    desdeAnio: number,
    hastaAnio: number,
    em?: EntityManager,
  ): Promise<Set<string>> {
    const manager = em ?? this.dataSource.manager;
    const dias = festivosEntre(desdeAnio, hastaAnio);

    for (const propio of await manager.getRepository(DiaNoHabil).find()) {
      dias.add(propio.fecha);
    }
    return dias;
  }

  /** Calendario que cubre las fechas dadas, con un año de margen por delante. */
  private calendarioPara(em: EntityManager | undefined, ...fechas: string[]) {
    const anios = fechas.map((f) => Number(f.slice(0, 4)));
    return this.calendario(Math.min(...anios), Math.max(...anios) + 1, em);
  }

  /**
   * Un instante como fecha de calendario en Bogotá, que es la zona en la que
   * corren los términos del proceso.
   *
   * Pasar por UTC daría el día siguiente para cualquier hora posterior a las
   * 19:00 locales, y ahí un día de diferencia es un plazo mal contado.
   */
  private enBogota(instante: Date): string {
    return instante.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  private hoy(): string {
    return this.enBogota(new Date());
  }

  // --------------------------------------------------------- aplicabilidad -

  /**
   * Si la modalidad del proceso lleva proyecto de pliego que publicar.
   *
   * Se resuelve contra la matriz y no con una lista en el código, igual que el
   * CDP: qué modalidades quedan fuera es un dato de la matriz y cambia sin que
   * cambie la regla.
   */
  async aplicaPublicacion(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return true;
    const manager = em ?? this.dataSource.manager;
    const excluida = await manager.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_PUBLICACION, modalidad },
    });
    return !excluida;
  }

  /** Plazo de publicidad de la modalidad, o null si no está parametrizado. */
  async plazoDeLaModalidad(
    modalidad: string | null,
    em?: EntityManager,
  ): Promise<PlazoPublicacion | null> {
    if (!modalidad) return null;
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(PlazoPublicacion).findOne({ where: { modalidad } });
  }

  // ------------------------------------------- administración de plazos ----

  /**
   * Todas las modalidades con su plazo, tengan fila o no (EFDS-1387).
   *
   * Se devuelven las once y no solo las configuradas: "esta modalidad no tiene
   * plazo" es justamente lo que hay que poder ver y corregir, y una lista que
   * omitiera las vacías escondería el trabajo pendiente.
   *
   * Las modalidades sin proyecto de pliego se marcan pero no se ocultan, por la
   * misma razón que las actividades excluidas se tachan en vez de desaparecer.
   */
  async plazosVigentes(acceso?: HiringAccess, em?: EntityManager) {
    // Recibe el manager como el resto de consultas del servicio: al llamarla
    // desde dentro de la transacción de `guardarPlazo`, leer por fuera devolvía
    // el estado anterior y la respuesta contradecía lo que se acababa de
    // guardar. La fila estaba bien; lo que mentía era el acuse de recibo.
    const manager = em ?? this.dataSource.manager;

    const [modalidades, plazos, excluidas] = await Promise.all([
      manager.getRepository(Modalidad).find({ order: { orden: 'ASC' } }),
      manager.getRepository(PlazoPublicacion).find(),
      manager
        .getRepository(ActividadExcluida)
        .find({ where: { numeral: NUMERAL_PUBLICACION } }),
    ]);

    const porModalidad = new Map(plazos.map((p) => [p.modalidad, p]));
    const sinPliego = new Map(excluidas.map((e) => [e.modalidad, e.motivo]));

    return {
      // Lo decide el backend, que ya tiene los roles del token: replicar la
      // matriz de permisos en el cliente la dejaría desactualizada en cuanto
      // cambie aquí, y la pantalla ofrecería acciones que la API rechaza.
      puedeEditar: ROLES_ADMIN_PLAZOS.some((r) => acceso?.roles.includes(r) ?? false),
      modalidades: modalidades.map((m) => {
        const plazo = porModalidad.get(m.codigo);
        return {
          modalidad: m.codigo,
          nombre: m.nombre,
          orden: m.orden,
          /** False cuando la modalidad no lleva proyecto de pliego que publicar. */
          aplicaPublicacion: !sinPliego.has(m.codigo),
          motivoExclusion: sinPliego.get(m.codigo) ?? null,
          plazo: plazo
            ? {
                diasHabiles: plazo.diasHabiles,
                fundamento: plazo.fundamento,
                confirmado: plazo.confirmado,
                actualizadoEn: plazo.updatedAt,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Fija el plazo de una modalidad, creándolo si no existía.
   *
   * A diferencia de los umbrales, el plazo se edita en vez de cerrarse y
   * abrirse de nuevo: no hace falta historial de vigencias porque cada
   * publicación ya congela el plazo que le aplicó el día del registro. Los
   * procesos ya publicados no se enteran de este cambio, que es justo lo que
   * debe pasar.
   */
  async guardarPlazo(modalidad: string, dto: GuardarPlazoDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const catalogo = await em.getRepository(Modalidad).findOne({
        where: { codigo: modalidad },
      });
      if (!catalogo) throw new NotFoundException(`La modalidad ${modalidad} no existe`);

      const repo = em.getRepository(PlazoPublicacion);
      const anterior = await repo.findOne({ where: { modalidad } });

      const plazo = anterior ?? repo.create({ modalidad });
      const antes = anterior
        ? { diasHabiles: anterior.diasHabiles, confirmado: anterior.confirmado }
        : null;

      plazo.diasHabiles = dto.diasHabiles;
      if (dto.fundamento !== undefined) plazo.fundamento = dto.fundamento;
      // Sin decir nada, un plazo que alguien acaba de tocar deja de estar
      // confirmado: la confirmación es sobre una cifra concreta, no sobre la
      // fila. Se marca explícitamente o no se marca.
      plazo.confirmado = dto.confirmado ?? false;
      plazo.updatedAt = new Date();

      await em.save(plazo);

      // De esta cifra dependen los términos legales de todo lo que se publique
      // después, así que quién la movió y cuándo tiene que quedar registrado.
      await em.save(Trazabilidad, {
        procesoId: null,
        entidad: 'plazo_publicacion',
        entidadId: null,
        accion: 'GUARDAR' as AccionTraza,
        detalle: { modalidad, antes, ahora: { diasHabiles: plazo.diasHabiles, confirmado: plazo.confirmado } },
        usuarioId: acceso.userId,
        usuarioNombre: acceso.userName,
      } as Partial<Trazabilidad>);

      return this.plazosVigentes(acceso, em);
    });
  }

  /** Publicación vigente del proceso, o null si nunca se registró o se anuló. */
  async delProceso(procesoId: string, em?: EntityManager): Promise<PublicacionPliego | null> {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(PublicacionPliego).findOne({
      where: { procesoId, anuladaAt: IsNull() },
    });
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Estado de la publicación y de su plazo, en la forma que consume la pantalla.
   *
   * El conteo se hace aquí y no en el microfrontend a propósito: es la fecha que
   * queda en el expediente, y dos implementaciones del mismo conteo terminan
   * discrepando el día que más importa.
   */
  async estadoPublicacion(procesoId: string, em?: EntityManager, acceso?: HiringAccess) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    // Quién puede hacer qué lo responde el backend, que ya tiene los roles del
    // token. Si la pantalla lo dedujera, ofrecería un botón que la API rechaza.
    const puedeRegistrar = ROLES_PUBLICACION_PLIEGO.some(
      (r) => acceso?.roles.includes(r) ?? false,
    );

    const aplica = await this.aplicaPublicacion(proceso.modalidad, em);
    if (!aplica) {
      return {
        aplica: false,
        publicacion: null,
        plazo: null,
        diasHabilesRestantes: null,
        estadoPlazo: 'SIN_PLAZO' as const,
        advertencia: null,
        puedeRegistrar,
      };
    }

    const plazoModalidad = await this.plazoDeLaModalidad(proceso.modalidad, em);
    const plazo = plazoModalidad
      ? {
          diasHabiles: plazoModalidad.diasHabiles,
          confirmado: plazoModalidad.confirmado,
          fundamento: plazoModalidad.fundamento,
        }
      : null;

    const publicacion = await this.delProceso(procesoId, em);
    if (!publicacion) {
      return {
        aplica: true,
        publicacion: null,
        plazo,
        diasHabilesRestantes: null,
        estadoPlazo: 'SIN_PLAZO' as const,
        advertencia: this.advertenciaDelPlazo(plazoModalidad),
        puedeRegistrar,
      };
    }

    // El plazo congelado en la publicación manda sobre el de la modalidad: si
    // el parámetro cambió después, este proceso se sigue explicando con la
    // regla que estaba vigente el día en que se publicó.
    let restantes: number | null = null;
    if (publicacion.fechaVencimiento) {
      const hoy = this.hoy();
      const festivos = await this.calendarioPara(em, hoy, publicacion.fechaVencimiento);
      restantes = diasHabilesRestantes(hoy, publicacion.fechaVencimiento, festivos);
    }

    return {
      aplica: true,
      publicacion,
      plazo,
      diasHabilesRestantes: restantes,
      estadoPlazo: estadoDelPlazo(restantes),
      advertencia: this.advertenciaDelPlazo(plazoModalidad),
      puedeRegistrar,
    };
  }

  /** Por qué el plazo mostrado puede no ser de fiar. */
  private advertenciaDelPlazo(plazo: PlazoPublicacion | null): string | null {
    if (!plazo) {
      return 'Esta modalidad no tiene plazo de publicidad parametrizado: la publicación se registra pero no hay término que contar';
    }
    if (!plazo.confirmado) {
      return 'El plazo de esta modalidad es provisional y está pendiente de confirmación por la Dirección de Contratación';
    }
    return null;
  }

  // ------------------------------------------------------------ registro ---

  /**
   * Actividad 5.2: se registra que el proyecto de pliego quedó publicado.
   *
   * La evidencia entra en la misma operación y no como paso posterior: sin
   * integración con SECOP II es lo único que sostiene el registro, y el
   * registro arranca un plazo legal. Dejarla para después habría permitido
   * procesos con el término corriendo y nada que probara que se publicaron.
   *
   * No mueve el proceso a la etapa 5 a propósito. La apertura (5.7) usa
   * `proceso.etapa >= 5` como marca de "ya se abrió", así que adelantarla aquí
   * dejaría el proceso imposible de abrir. La etapa la sigue moviendo la
   * apertura; esto solo cierra su actividad.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarPublicacionDto,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
    hash: string,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      if (!(await this.aplicaPublicacion(proceso.modalidad, em))) {
        throw new BadRequestException(
          'Esta modalidad no tiene proyecto de pliego que publicar',
        );
      }

      const vigente = await this.delProceso(procesoId, em);
      if (vigente) {
        throw new ConflictException(
          `El proceso ya tiene registrada la publicación del ${vigente.fechaPublicacion}. Anúlala si necesitas corregirla.`,
        );
      }

      await this.validarFecha(em, proceso, dto.fechaPublicacion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const { plazoDiasHabiles, fechaVencimiento } = await this.calcularPlazo(
        em,
        proceso.modalidad,
        dto.fechaPublicacion,
      );

      const documento = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_PUBLICACION,
          tipo: 'ADJUNTO',
          nombre: archivo.originalname,
          archivoUrl: `hiring/files/${archivo.filename}`,
          archivoNombreOriginal: archivo.originalname,
          archivoMimeType: archivo.mimetype,
          archivoTamano: archivo.size,
          hashSha256: hash,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );

      const publicacion = await em.save(
        em.create(PublicacionPliego, {
          procesoId,
          fechaPublicacion: dto.fechaPublicacion,
          plazoDiasHabiles,
          fechaVencimiento,
          secopNumero: dto.secopNumero ?? null,
          secopUrl: dto.secopUrl ?? null,
          // El vínculo va en el dato y no por convención de numeral: una
          // publicación anulada y su reemplazo conservan cada una la suya.
          documentoId: documento.id,
          publicadoPor: acceso.userName,
        }),
      );

      // Se cierra de una: el registro ya trae su evidencia, que era lo único
      // que faltaba para darla por cumplida.
      await this.marcarActividad(em, procesoId, 'APROBADO', acceso);

      await this.traza(em, procesoId, publicacion.id, 'PUBLICAR', acceso, {
        fechaPublicacion: dto.fechaPublicacion,
        plazoDiasHabiles,
        fechaVencimiento,
        documento: documento.id,
        evidencia: archivo.originalname,
      });

      return { ...(await this.estadoPublicacion(procesoId, em, acceso)), documento };
    });
  }

  /**
   * Vencimiento del plazo a partir de la fecha de publicación.
   *
   * Si la modalidad no tiene plazo parametrizado se devuelven nulos y la
   * publicación se registra igual: el hecho ocurrió, y negarse a registrarlo
   * por un parámetro faltante castigaría al usuario por una tarea pendiente del
   * equipo (EFDS-1385).
   */
  private async calcularPlazo(em: EntityManager, modalidad: string | null, desde: string) {
    const plazo = await this.plazoDeLaModalidad(modalidad, em);
    if (!plazo) return { plazoDiasHabiles: null, fechaVencimiento: null };

    // El margen de un año que da `calendarioPara` sobra: ningún plazo de
    // publicidad se acerca a los doce meses.
    const festivos = await this.calendarioPara(em, desde);
    const vencimiento = sumarDiasHabiles(desde, plazo.diasHabiles, festivos);

    return { plazoDiasHabiles: plazo.diasHabiles, fechaVencimiento: vencimiento };
  }

  /**
   * La publicación es un hecho ya ocurrido, no una programación.
   *
   * Una fecha futura arrancaría un plazo que todavía no corre; una anterior a
   * la apertura del expediente describiría algo que pasó antes de que el
   * proceso existiera.
   */
  private async validarFecha(em: EntityManager, proceso: Proceso, fecha: string) {
    if (fecha > this.hoy()) {
      throw new BadRequestException(
        'La fecha de publicación no puede ser futura: se registra lo que ya se publicó',
      );
    }

    const expediente = await em.findOne(Expediente, { where: { procesoId: proceso.id } });
    if (expediente) {
      const apertura = this.enBogota(new Date(expediente.fechaApertura));
      if (fecha < apertura) {
        throw new BadRequestException(
          `La fecha de publicación (${fecha}) es anterior a la apertura del expediente (${apertura})`,
        );
      }
    }
  }

  // -------------------------------------------------------------- anulación -

  /**
   * Deja sin efecto la publicación registrada para poder corregirla.
   *
   * No se edita ni se borra: una fecha de publicación mal digitada ya movió el
   * vencimiento del plazo, y el expediente tiene que conservar el rastro de esa
   * corrección.
   */
  async anular(procesoId: string, dto: AnularPublicacionDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const publicacion = await this.exigirPublicacion(em, procesoId);

      publicacion.anuladaAt = new Date();
      publicacion.anuladaPor = acceso.userName;
      publicacion.motivoAnulacion = dto.motivo;
      publicacion.updatedAt = new Date();
      await em.save(publicacion);

      // La actividad vuelve a quedar abierta: el proceso ya no tiene una
      // publicación vigente que la respalde.
      await this.marcarActividad(em, procesoId, 'BORRADOR', acceso);

      await this.traza(em, procesoId, publicacion.id, 'ANULAR', acceso, {
        motivo: dto.motivo,
        fechaPublicacionAnulada: publicacion.fechaPublicacion,
      });

      return this.estadoPublicacion(procesoId, em, acceso);
    });
  }

  // ------------------------------------------------------------- auxiliares -

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private async exigirPublicacion(
    em: EntityManager,
    procesoId: string,
  ): Promise<PublicacionPliego> {
    const publicacion = await this.delProceso(procesoId, em);
    if (!publicacion) {
      throw new NotFoundException(
        'El proceso no tiene registrada la publicación del proyecto de pliego',
      );
    }
    return publicacion;
  }

  /**
   * Deja la actividad 5.2 en el estado dado, creándola si no existía.
   *
   * Crea y actualiza en el mismo sitio porque la 5.2 no se instancia en ningún
   * momento previo: el proceso llega a la etapa 5 sin ella, y el registro de la
   * publicación es lo primero que la hace existir. Un `update` que no
   * encontrara fila la habría dejado invisible en el riel.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    estado: 'BORRADOR' | 'APROBADO',
    acceso: HiringAccess,
  ) {
    const cumplida = estado === 'APROBADO';
    const revisadoPor = (cumplida ? acceso.userName : null) as any;
    const revisadoAt = (cumplida ? new Date() : null) as any;

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_PUBLICACION },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_PUBLICACION,
          estado,
          datos: {},
          revisadoPor,
          revisadoAt,
        }),
      );
      return;
    }

    actividad.estado = estado;
    actividad.revisadoPor = revisadoPor;
    actividad.revisadoAt = revisadoAt;
    await em.save(actividad);
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    publicacionId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle?: Record<string, any>,
  ) {
    return em.save(Trazabilidad, {
      procesoId,
      entidad: 'publicacion_pliego',
      entidadId: publicacionId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}

export { ETAPA_PUBLICACION };
