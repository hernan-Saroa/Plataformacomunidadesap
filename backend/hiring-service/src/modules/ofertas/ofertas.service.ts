import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { ETAPA_RECEPCION, RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { PlazoOfertas } from '../../entities/plazo-ofertas.entity';
import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { festivosEntre } from '../publicacion/festivos-colombia';
import { diasHabilesRestantes, estadoDelPlazo, sumarDiasHabiles } from '../publicacion/dias-habiles';
import { FijarPlazoOfertasDto, RegistrarOferenteDto } from './dto/ofertas.dto';

/** Actividad 6.1 de la matriz: la recepción de ofertas y su cierre. */
export const NUMERAL_OFERTAS = '6.1';

/**
 * Hora a la que vence el plazo cuando lo calcula la plataforma.
 *
 * SUPUESTO POR CONFIRMAR: el plazo parametrizado da días, no horas, y ningún
 * documento fuente dice a qué hora cierra la recepción. Se toma el final del
 * último día para no recortarle término a nadie, y el gestor puede fijar la
 * hora exacta del cronograma con `fijarPlazo`.
 *
 * El desfase va escrito (`-05:00`) y no se deja a la zona del servidor: en UTC,
 * las 23:59 de Bogotá son ya el día siguiente, y ahí un día de diferencia es un
 * plazo mal contado.
 */
const FIN_DEL_DIA_BOGOTA = 'T23:59:59.999-05:00';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class OfertasService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_OFERTAS, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const recepcion = await this.recepcionDe(procesoId);
    const plazoModalidad = await this.plazoDeLaModalidad(proceso.modalidad);
    const apertura = await this.dataSource
      .getRepository(AperturaProceso)
      .findOne({ where: { procesoId } });

    const oferentes = recepcion
      ? await this.dataSource.getRepository(Oferente).find({
          where: { recepcionId: recepcion.id },
          order: { numero: 'ASC' },
        })
      : [];

    const documentos = await this.archivosDe(oferentes.map((o) => o.soporteDocumentoId));

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      etapa: ETAPA_RECEPCION,
      // Sin resolución de apertura no hay convocatoria a la que presentarse.
      abierto: !!apertura,
      // La ausencia de recepción con el proceso ya abierto significa que la
      // modalidad no tiene plazo parametrizado y hay que fijarlo a mano.
      plazoParametrizado: !!plazoModalidad,
      plazoConfirmado: plazoModalidad?.confirmado ?? false,
      recepcion: recepcion
        ? { ...this.verRecepcion(recepcion), ...(await this.plazoConDias(recepcion)) }
        : null,
      puedeRegistrar: !excluida && !!recepcion && recepcion.estado === 'ABIERTA',
      // El cierre solo puede intentarse con el plazo vencido; la pantalla usa
      // esto para decir por qué el botón no está disponible, en vez de dejarlo
      // apagado sin explicación.
      puedeCerrar:
        !excluida &&
        !!recepcion &&
        recepcion.estado === 'ABIERTA' &&
        Date.now() > recepcion.vencimiento.getTime(),
      // Lo que vuelve pública la lista es el cierre: a partir de ahí ya no
      // admite cambios.
      listaPublicada: recepcion?.estado === 'CERRADA',
      oferentes: oferentes.map((o) => ({
        id: o.id,
        numero: o.numero,
        nombre: o.nombre,
        identificacion: o.identificacion,
        fechaRadicacion: o.fechaRadicacion,
        registradoPor: o.registradoPor,
        soporte: this.verArchivo(documentos.get(o.soporteDocumentoId)),
      })),
    };
  }

  // ------------------------------------------------------- plazo de ofertas --

  /**
   * Abre la recepción al abrirse el proceso.
   *
   * La llama la apertura (5.7) dentro de su misma transacción: es ahí donde
   * queda fijado el plazo, contado desde la fecha de la resolución. Si la
   * modalidad no tiene plazo parametrizado no se crea la recepción —no hay de
   * dónde sacar el vencimiento— y el gestor lo fija a mano; negarse a abrir el
   * proceso por un parámetro que el equipo no ha confirmado castigaría al
   * usuario por una tarea pendiente nuestra, con el criterio de EFDS-1385.
   */
  async abrirRecepcion(procesoId: string, acceso: HiringAccess, em: EntityManager) {
    const proceso = await this.exigirProceso(em, procesoId);

    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_OFERTAS, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) return null;

    // `procesos.etapa` no se toca a propósito. La apertura la deja en 5
    // (EFDS-1152) y ninguna de las dos historias dice cuándo pasa a 6; moverla
    // aquí redefiniría por la puerta de atrás lo que otras actividades dan por
    // cierto. Lo que marca que la etapa 6 está en curso es que exista esta
    // recepción, no el número.
    const yaExiste = await this.recepcionDe(procesoId, em);
    if (yaExiste) return yaExiste;

    const apertura = await em.getRepository(AperturaProceso).findOne({ where: { procesoId } });
    if (!apertura) return null;

    const plazo = await this.plazoDeLaModalidad(proceso.modalidad, em);
    if (!plazo) return null;

    const festivos = await this.calendario(em, apertura.resolucionFecha);
    const ultimoDia = sumarDiasHabiles(apertura.resolucionFecha, plazo.diasHabiles, festivos);

    const recepcion = await em.save(
      em.create(RecepcionOfertas, {
        procesoId,
        vencimiento: new Date(`${ultimoDia}${FIN_DEL_DIA_BOGOTA}`),
        plazoDiasHabiles: plazo.diasHabiles,
        estado: 'ABIERTA' as const,
      }),
    );

    await this.marcarActividad(em, procesoId, acceso);

    await this.traza(em, procesoId, recepcion.id, 'CREAR', acceso, {
      actividad: NUMERAL_OFERTAS,
      desde: apertura.resolucionFecha,
      diasHabiles: plazo.diasHabiles,
      vencimiento: recepcion.vencimiento,
    });

    return recepcion;
  }

  /**
   * Fija o corrige el vencimiento a mano.
   *
   * Hace falta en dos casos: cuando la modalidad no tiene plazo parametrizado, y
   * cuando el cronograma del proceso fija una hora distinta del final del día
   * que calcula la plataforma. Solo con la recepción abierta: mover el plazo de
   * una recepción cerrada cambiaría la regla después de aplicarla.
   */
  async fijarPlazo(procesoId: string, dto: FijarPlazoOfertasDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const apertura = await em.getRepository(AperturaProceso).findOne({ where: { procesoId } });
      if (!apertura) {
        throw new ConflictException(
          'El proceso todavía no se ha abierto: el plazo de ofertas corre desde la apertura',
        );
      }

      const vencimiento = new Date(dto.vencimiento);
      const recepcion = await this.recepcionDe(procesoId, em);

      if (recepcion?.estado === 'CERRADA') {
        throw new ConflictException(
          'La recepción ya se cerró: el plazo no puede moverse después de aplicarlo',
        );
      }

      const anterior = recepcion?.vencimiento ?? null;

      if (recepcion) {
        recepcion.vencimiento = vencimiento;
        // Deja de ser el plazo calculado: a partir de aquí manda la fecha que
        // fijó el gestor, y guardar los días sugeriría que sigue derivándose
        // de ellos.
        recepcion.plazoDiasHabiles = null;
        await em.save(recepcion);
      } else {
        await em.save(
          em.create(RecepcionOfertas, {
            procesoId,
            vencimiento,
            plazoDiasHabiles: null,
            estado: 'ABIERTA' as const,
          }),
        );
      }

      const actual = await this.recepcionDe(procesoId, em);
      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, actual!.id, 'GUARDAR', acceso, {
        actividad: NUMERAL_OFERTAS,
        vencimientoAnterior: anterior,
        vencimientoNuevo: vencimiento,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- oferentes --

  /**
   * Registra una oferta recibida, con su soporte.
   *
   * El gestor transcribe lo que llegó a ventanilla: no hay integración con
   * SECOP II ni está prevista, así que la plataforma no puede saber por su
   * cuenta cuándo ni de quién llegó una oferta.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarOferenteDto,
    soporte: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const recepcion = await this.recepcionDe(procesoId, em);
      if (!recepcion) {
        throw new ConflictException(
          'La recepción de ofertas no está abierta: falta fijar el plazo del proceso',
        );
      }
      if (recepcion.estado === 'CERRADA') {
        throw new ConflictException(
          'La recepción ya se cerró: la lista de oferentes publicada no admite nuevas ofertas',
        );
      }

      const radicacion = new Date(dto.fechaRadicacion);
      this.validarRadicacion(radicacion, recepcion);

      const repetido = await em.getRepository(Oferente).findOne({
        where: { recepcionId: recepcion.id, identificacion: dto.identificacion },
      });
      if (repetido) {
        throw new ConflictException(
          `El oferente ${dto.identificacion} ya está registrado como número ${repetido.numero}: para corregirlo, retíralo y vuelve a registrarlo`,
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Oferta de ${dto.nombre}`,
        soporte,
        hash,
        acceso,
      );

      const oferente = await em.save(
        em.create(Oferente, {
          recepcionId: recepcion.id,
          numero: await this.siguienteNumero(em, recepcion.id),
          nombre: dto.nombre,
          identificacion: dto.identificacion,
          fechaRadicacion: radicacion,
          soporteDocumentoId: doc.id,
          registradoPor: acceso.userName,
        }),
      );

      await this.traza(em, procesoId, oferente.id, 'CREAR', acceso, {
        actividad: NUMERAL_OFERTAS,
        oferente: oferente.numero,
        identificacion: dto.identificacion,
        fechaRadicacion: dto.fechaRadicacion,
      });
    });

    return this.estado(procesoId);
  }

  /**
   * Retira una oferta registrada por error.
   *
   * Solo con la recepción abierta: después del cierre la lista ya está
   * publicada, y quitar un oferente de una lista publicada no es una corrección
   * sino cambiar el registro de lo que ocurrió. El soporte cargado se queda en
   * el expediente y el retiro queda en la trazabilidad.
   */
  async retirar(procesoId: string, oferenteId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const recepcion = await this.recepcionDe(procesoId, em);
      if (!recepcion) throw new NotFoundException('El proceso no tiene recepción de ofertas');

      if (recepcion.estado === 'CERRADA') {
        throw new ConflictException(
          'La recepción ya se cerró: la lista publicada no puede modificarse',
        );
      }

      const oferente = await em.getRepository(Oferente).findOne({
        where: { id: oferenteId, recepcionId: recepcion.id },
      });
      if (!oferente) throw new NotFoundException('La oferta no existe en este proceso');

      await em.getRepository(Oferente).delete({ id: oferente.id });

      await this.traza(em, procesoId, oferente.id, 'RETIRAR', acceso, {
        actividad: NUMERAL_OFERTAS,
        oferente: oferente.numero,
        identificacion: oferente.identificacion,
      });
    });

    return this.estado(procesoId);
  }

  // -------------------------------------------------------------- cierre --

  /**
   * Cierra la recepción al vencimiento y con ello publica la lista de
   * oferentes.
   *
   * Es el criterio 1 de la historia. Publicar no es copiar la lista a otra
   * tabla: lo que la vuelve pública es el cierre, porque a partir de ahí ya no
   * admite cambios. Antes del cierre la lista es provisional —pueden entrar
   * ofertas, pueden retirarse— y después es el registro formal de lo que se
   * recibió.
   */
  async cerrar(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const recepcion = await this.recepcionDe(procesoId, em);
      if (!recepcion) {
        throw new ConflictException(
          'La recepción de ofertas no está abierta: falta fijar el plazo del proceso',
        );
      }

      // Cerrar dos veces no es un error: el segundo clic pide lo que ya está
      // hecho. Se devuelve la lista tal cual quedó, sin tocar la fecha del
      // cierre, que es la que prueba cuándo dejó de recibirse.
      if (recepcion.estado === 'CERRADA') return;

      if (Date.now() <= recepcion.vencimiento.getTime()) {
        const { diasHabilesRestantes: faltan } = await this.plazoConDias(recepcion);
        throw new ConflictException(
          `El plazo sigue vigente hasta el ${this.enBogota(recepcion.vencimiento)}` +
            (faltan > 0 ? ` (faltan ${faltan} días hábiles)` : ' (vence hoy)') +
            ': cerrar antes dejaría fuera ofertas que todavía pueden presentarse',
        );
      }

      recepcion.estado = 'CERRADA';
      recepcion.cerradaAt = new Date();
      recepcion.cerradaPor = acceso.userName;
      await em.save(recepcion);

      const oferentes = await em.getRepository(Oferente).count({
        where: { recepcionId: recepcion.id },
      });

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, recepcion.id, 'CERRAR', acceso, {
        actividad: NUMERAL_OFERTAS,
        vencimiento: recepcion.vencimiento,
        // Cero es un resultado, no un fallo: que no llegara ninguna oferta es
        // justo el hecho que hay que dejar registrado. Declarar desierto el
        // proceso es otra historia.
        oferentes,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Una oferta se radica dentro del plazo y no en el futuro.
   *
   * Las dos son el mismo criterio del resto del módulo: el gestor transcribe un
   * hecho ya ocurrido. Registrar una oferta posterior al vencimiento la haría
   * pasar por presentada en término, que es justo lo que la lista publicada
   * tiene que poder probar que no pasó.
   */
  private validarRadicacion(radicacion: Date, recepcion: RecepcionOfertas) {
    if (radicacion.getTime() > Date.now()) {
      throw new BadRequestException(
        'La radicación no puede ser futura: es la hora en que la oferta llegó a la entidad',
      );
    }

    if (radicacion.getTime() > recepcion.vencimiento.getTime()) {
      throw new BadRequestException(
        `La oferta se radicó después del vencimiento (${this.enBogota(recepcion.vencimiento)}): fuera de plazo no entra a la lista`,
      );
    }
  }

  /** Cómo se lee el plazo en la interfaz: cuándo vence y si ya pasó. */
  private verRecepcion(recepcion: RecepcionOfertas) {
    const vencimientoYMD = this.diaEnBogota(recepcion.vencimiento);
    const vencido = Date.now() > recepcion.vencimiento.getTime();

    return {
      id: recepcion.id,
      estado: recepcion.estado,
      vencimiento: recepcion.vencimiento,
      // El día en Bogotá, que es la zona en la que corren los términos del
      // proceso; el instante de arriba lo lee la máquina, este lo lee el gestor.
      vencimientoDia: vencimientoYMD,
      plazoDiasHabiles: recepcion.plazoDiasHabiles,
      vencido,
      cerradaAt: recepcion.cerradaAt,
      cerradaPor: recepcion.cerradaPor,
    };
  }

  private async plazoConDias(recepcion: RecepcionOfertas) {
    const hoy = this.diaEnBogota(new Date());
    const dia = this.diaEnBogota(recepcion.vencimiento);
    const festivos = await this.calendario(undefined, hoy, dia);
    const restantes = diasHabilesRestantes(hoy, dia, festivos);

    return { diasHabilesRestantes: restantes, estadoPlazo: estadoDelPlazo(restantes) };
  }

  private async exigirQueAplique(em: EntityManager, proceso: Proceso) {
    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_OFERTAS, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) {
      throw new BadRequestException(
        `Esta modalidad no recibe ofertas: ${excluida.motivo}`,
      );
    }
  }

  private recepcionDe(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
  }

  private plazoDeLaModalidad(modalidad: string | null, em?: EntityManager) {
    if (!modalidad) return Promise.resolve(null);
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(PlazoOfertas).findOne({ where: { modalidad } });
  }

  private async siguienteNumero(em: EntityManager, recepcionId: string): Promise<number> {
    // Sobre el máximo de las que hay, así que una oferta retirada libera su
    // número. Se puede: retirar solo es posible con la recepción abierta, y
    // hasta el cierre la lista es provisional, de modo que ningún consecutivo
    // se ha citado todavía fuera de la plataforma. Después del cierre no se
    // retira nada, y ahí los números ya no se mueven.
    const [{ maximo }] = await em.query(
      `SELECT COALESCE(MAX(numero), 0)::int AS maximo FROM hiring.oferentes WHERE recepcion_id = $1`,
      [recepcionId],
    );
    return maximo + 1;
  }

  /**
   * Días no hábiles del rango, con el mismo criterio de la actividad 5.2: los
   * festivos nacionales se calculan y la tabla aporta los que declare la
   * entidad por su cuenta.
   */
  private async calendario(em: EntityManager | undefined, ...fechas: string[]): Promise<Set<string>> {
    const manager = em ?? this.dataSource.manager;
    const anios = fechas.map((f) => Number(f.slice(0, 4)));
    const dias = festivosEntre(Math.min(...anios), Math.max(...anios) + 1);

    for (const propio of await manager.getRepository(DiaNoHabil).find()) {
      dias.add(propio.fecha);
    }
    return dias;
  }

  /** El día calendario en Bogotá, que es la zona en la que corren los términos. */
  private diaEnBogota(instante: Date): string {
    return instante.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /** Fecha y hora legibles en Bogotá, para los mensajes de error. */
  private enBogota(instante: Date): string {
    return instante.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  }

  /**
   * La actividad se da por cumplida cuando la recepción se cierra.
   *
   * Mientras está abierta queda en curso: hay plazo corriendo y ofertas que
   * pueden seguir llegando, así que el trabajo no está terminado.
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const recepcion = await this.recepcionDe(procesoId, em);
    const aprobado = recepcion?.estado === 'CERRADA';
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_OFERTAS },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_OFERTAS,
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

  private verArchivo(doc: Documento | undefined) {
    return doc ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl } : null;
  }

  private async archivosDe(ids: string[]): Promise<Map<string, Documento>> {
    if (ids.length === 0) return new Map();

    const documentos = await this.dataSource.getRepository(Documento).find({
      where: { id: In(ids) },
    });
    return new Map(documentos.map((d) => [d.id, d]));
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
        numeral: NUMERAL_OFERTAS,
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
        entidad: 'ofertas',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
