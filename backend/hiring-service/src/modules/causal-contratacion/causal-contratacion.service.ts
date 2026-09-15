import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Proceso } from '../../entities/proceso.entity';
import { CausalContratacion } from '../../entities/causal-contratacion.entity';
import { ActividadSalvedad } from '../../entities/actividad.entity';
import {
  EstadoActividad,
  NUMERAL_ESTUDIO_PREVIO,
  ProcesoActividad,
} from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ParticipacionService } from '../participacion/participacion.service';
import { CdpService } from '../cdp/cdp.service';
import { ElegirCausalDto } from './dto/causal-contratacion.dto';
import { NUMERAL_MODALIDAD } from '../modalidad-proceso/modalidad-proceso.service';

/** Actividad 3.6 de la matriz —su 3.5.1—: la causal de contratación. */
export const NUMERAL_CAUSAL = '3.6';

/** Etapa en la que se elige, y hasta la que se puede rectificar. */
export const ETAPA_CAUSAL = 3;

/**
 * El campo con el que el área adelanta la causal en el estudio previo (010).
 *
 * No es la causal: es texto libre y lo escribe quien radica. Se muestra en la
 * 3.6 como lo que el área propuso, para que el abogado decida mirándolo en vez
 * de tener que abrir la 3.1 en otra pestaña.
 */
export const CAMPO_CAUSAL_DEL_AREA = 'causal_normativa';

/** Qué impide elegir la causal, más allá de quién sea el que mira. */
export type MotivoNoElige = 'NO_APLICA' | 'MODALIDAD_SIN_RATIFICAR' | 'ETAPA_PASADA';

/**
 * Si la 3.6 está abierta para elegir o rectificar la causal.
 *
 * Tres cosas la cierran, y ninguna es «ya hay una elegida»: rectificar es la
 * forma de corregir una causal equivocada, y prohibirlo desde la primera
 * elección dejaría al abogado sin salida ante su propio error.
 *
 * - `NO_APLICA`: la modalidad no pasa por esta actividad. Nueve de las once.
 * - `MODALIDAD_SIN_RATIFICAR`: la 3.5 todavía puede cambiar la modalidad, y la
 *   causal se elige de la lista de *esa* modalidad. Elegirla antes dejaría en
 *   el expediente una causal de una modalidad que el proceso ya no tiene.
 *   Una 3.5 que la propia modalidad excluye —bolsa mercantil— no bloquea: no
 *   hay nada que ratificar ahí. Hoy no puede darse, porque esa modalidad
 *   también excluye la 3.6, pero la regla no depende de que eso siga así.
 * - `ETAPA_PASADA`: el proceso salió de la etapa 3. Cerrar la etapa es lo que
 *   radica la solicitud de CDP, así que a partir de ahí la causal ya sustentó
 *   una actuación y cambiarla reescribiría el expediente hacia atrás.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function motivoParaNoElegir(
  estadoCausal: EstadoActividad,
  estadoModalidad: EstadoActividad,
  etapa: number,
): MotivoNoElige | null {
  if (estadoCausal === 'NO_APLICA') return 'NO_APLICA';
  if (estadoModalidad !== 'APROBADO' && estadoModalidad !== 'NO_APLICA') {
    return 'MODALIDAD_SIN_RATIFICAR';
  }
  if (etapa > ETAPA_CAUSAL) return 'ETAPA_PASADA';
  return null;
}

/**
 * La causal de contratación — actividad 3.6, la 3.5.1 de la matriz (RF-EST-04).
 *
 * Es la única actividad de la etapa 3 que la matriz describe como un filtro:
 * «Causal de contratación · filtro según la modalidad». Solo la marca aplicable
 * en selección abreviada de menor cuantía y en contratación directa, y en esta
 * última la celda no dice SI sino «Numeral 4 Artículo 2 de la Ley 1150 de
 * 2007».
 *
 * Hasta ahora se cumplía con el registro de constancia: una fecha, una nota y
 * quizá un soporte. El expediente quedaba sabiendo que alguien escribió algo,
 * pero no cuál causal habilitaba contratar así —que es lo que después tiene que
 * sustentar el acto administrativo de justificación de la directa—.
 *
 * La elige el abogado que lleva el proceso y no el área, por lo mismo que la
 * 3.4 y la 3.5: es una calificación jurídica del objeto contra el Decreto
 * 1082/2015, no un dato que se diligencie. El área ya la adelanta en el campo
 * libre `causal_normativa` de la 3.1, y aquí se muestra como lo que propuso.
 *
 * Un solo acto, sin ida y vuelta: no hay nada que devolverle al área porque el
 * área no propuso nada formal. Elegir cierra la actividad.
 */
@Injectable()
export class CausalContratacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly participacion: ParticipacionService,
    private readonly cdp: CdpService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    const actividad = await this.actividad(em, procesoId);
    const estadoActual = actividad?.estado ?? 'BORRADOR';
    const estadoModalidad = await this.estadoDeLaModalidad(em, procesoId);

    const noElige = motivoParaNoElegir(estadoActual, estadoModalidad, proceso.etapa);
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);

    const causales = await this.causalesDe(em, proceso.modalidad);
    const elegida = proceso.causal
      ? await em.getRepository(CausalContratacion).findOne({ where: { codigo: proceso.causal } })
      : null;

    return {
      /** Si la matriz marca la actividad para la modalidad del proceso. */
      aplica: noElige !== 'NO_APLICA',
      estado: estadoActual,
      modalidad: proceso.modalidad,
      /**
       * El texto que la matriz escribe en la celda de esta modalidad, si lo
       * hay. En directa es la norma misma —«Numeral 4 Artículo 2 de la Ley
       * 1150 de 2007»— y es lo que explica de dónde sale la lista.
       */
      referenciaMatriz: await this.salvedadDeLaCelda(em, proceso.modalidad),
      causal: elegida
        ? {
            codigo: elegida.codigo,
            nombre: elegida.nombre,
            referenciaNormativa: elegida.referenciaNormativa,
          }
        : null,
      sustento: proceso.causalSustento,
      /** Lo que el área adelantó en el estudio previo, sin valor decisorio. */
      propuestaDelArea: await this.causalDelArea(em, procesoId),
      /** Las de la modalidad del proceso, y solo esas: el filtro de la matriz. */
      causales: causales.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        referenciaNormativa: c.referenciaNormativa,
        confirmada: c.confirmada,
      })),
      /** Si a quien mira le toca elegirla, y puede hacerlo ya. */
      puedeElegir: noElige === null && motivo === null,
      motivoNoElige: noElige,
      motivoNoDecide: motivo,
      abogado: abogado
        ? { nombre: abogado.nombre, usuarioNombre: abogado.usuarioNombre }
        : null,
    };
  }

  // ----------------------------------------------------------- el abogado --

  /**
   * Elige la causal, o rectifica la elegida mientras la etapa siga abierta.
   *
   * Cerrar esta actividad puede cerrar la etapa 3 —en menor cuantía es la
   * última que aplica, porque la matriz excluye ahí el comité—, y con ella
   * nace la solicitud de CDP. Por eso se pregunta dentro de la misma
   * transacción: si la solicitud falla, tampoco queda elegida la causal que la
   * habría provocado.
   */
  async elegir(procesoId: string, dto: ElegirCausalDto, acceso: HiringAccess) {
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);
    if (motivo === 'SIN_ABOGADO') {
      throw new ConflictException(
        'Este proceso todavía no tiene abogado asignado: se reparte en la actividad 3.3 y después se elige la causal',
      );
    }
    if (motivo === 'NO_ES_TUYO') {
      throw new ForbiddenException(
        `Este proceso lo lleva ${abogado!.nombre}: la causal la elige el abogado al que se le asignó`,
      );
    }
    if (motivo === 'SIN_PERMISO') {
      throw new ForbiddenException('No tienes permiso para resolver actividades del proceso');
    }

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);

      // Un proceso negado o ya terminado no cambia de causal: lo que acabó no
      // es la etapa, es la contratación.
      if (proceso.estado !== 'EN_CURSO') {
        throw new ConflictException(
          'El proceso ya no está en curso: la causal solo se elige mientras el trámite sigue',
        );
      }

      const actividad = await this.actividad(em, procesoId, true);
      const estadoModalidad = await this.estadoDeLaModalidad(em, procesoId);
      const noElige = motivoParaNoElegir(
        actividad?.estado ?? 'BORRADOR',
        estadoModalidad,
        proceso.etapa,
      );

      if (noElige === 'NO_APLICA') {
        throw new ConflictException(
          'La matriz no pide causal en esta modalidad: solo la marca en selección abreviada de menor cuantía y en contratación directa',
        );
      }
      if (noElige === 'MODALIDAD_SIN_RATIFICAR') {
        throw new ConflictException(
          'Primero hay que ratificar la modalidad en la 3.5: la causal se elige de la lista de la modalidad ratificada',
        );
      }
      if (noElige === 'ETAPA_PASADA') {
        throw new ConflictException(
          'El proceso ya pasó de la etapa 3 y la causal sustentó la solicitud de CDP: cambiarla ahora reescribiría el expediente',
        );
      }

      const causal = await em.getRepository(CausalContratacion).findOne({
        where: { codigo: dto.causal },
      });
      if (!causal || !causal.activa) {
        throw new BadRequestException('Esa causal no existe en el catálogo o ya no está vigente');
      }

      // El filtro de la matriz, comprobado donde importa. En la pantalla la
      // lista ya viene filtrada, pero la que decide qué queda en el expediente
      // es esta línea: una causal de otra modalidad no sustenta nada.
      if (causal.modalidad !== proceso.modalidad) {
        throw new BadRequestException(
          `Esa causal es de otra modalidad: la ${causal.modalidad} no es la del proceso`,
        );
      }

      const anterior = proceso.causal;
      proceso.causal = causal.codigo;
      proceso.causalSustento = dto.sustento?.trim() || null;
      await em.save(Proceso, proceso);

      await this.marcar(em, procesoId, acceso);

      // RECTIFICAR al cambiarla y no otro GUARDAR: la causal anterior sustentó
      // lo que el expediente ya diga, y la traza tiene que distinguir la
      // primera elección de la corrección de una equivocada.
      await this.traza(em, procesoId, anterior ? 'RECTIFICAR' : 'DECIDIR', acceso, {
        actividad: NUMERAL_CAUSAL,
        causal: causal.codigo,
        causalNombre: causal.nombre,
        referenciaNormativa: causal.referenciaNormativa,
        modalidad: proceso.modalidad,
        ...(anterior && anterior !== causal.codigo ? { causalAnterior: anterior } : {}),
      });

      // En menor cuantía esta es la última actividad de la etapa 3 que aplica:
      // la matriz excluye ahí el comité. Sin esta llamada, esa modalidad
      // cerraría la etapa sin que nadie radicara el CDP.
      await this.cdp.crearSolicitudSiCerroLaEtapa3(em, procesoId, acceso);
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- auxiliares ---

  /** Las causales vigentes de una modalidad, en el orden del catálogo. */
  private causalesDe(em: EntityManager, modalidad: string | null) {
    if (!modalidad) return Promise.resolve([] as CausalContratacion[]);
    return em.getRepository(CausalContratacion).find({
      where: { modalidad, activa: true },
      order: { orden: 'ASC' },
    });
  }

  /**
   * En qué va la 3.5, de la que depende la lista.
   *
   * Una actividad sin instanciar se lee como BORRADOR y no como aprobada: un
   * proceso anterior a la parametrización no tiene ratificada la modalidad,
   * solo no llegó a tener la fila.
   */
  private async estadoDeLaModalidad(
    em: EntityManager,
    procesoId: string,
  ): Promise<EstadoActividad> {
    const modalidad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_MODALIDAD },
    });
    return modalidad?.estado ?? 'BORRADOR';
  }

  /** El texto de la celda de la matriz para esta modalidad, si no dice SI. */
  private async salvedadDeLaCelda(em: EntityManager, modalidad: string | null) {
    if (!modalidad) return null;
    const salvedad = await em.getRepository(ActividadSalvedad).findOne({
      where: { numeral: NUMERAL_CAUSAL, modalidad },
    });
    return salvedad?.variante ?? null;
  }

  /** Lo que el área escribió en el campo libre de la 3.1, si escribió algo. */
  private async causalDelArea(em: EntityManager, procesoId: string): Promise<string | null> {
    // Del `datos` del estudio previo y no de `campos_formulario`: el valor
    // sigue ahí aunque el campo se desactive, como la 007 desactivó el de la
    // modalidad propuesta sin borrar lo ya diligenciado.
    const estudio = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ESTUDIO_PREVIO },
    });
    const valor = estudio?.datos?.[CAMPO_CAUSAL_DEL_AREA];
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(Proceso)
      .createQueryBuilder('p')
      .where('p.id = :procesoId', { procesoId });

    if (bloquear) consulta.setLock('pessimistic_write');

    const proceso = await consulta.getOne();
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private async actividad(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(ProcesoActividad)
      .createQueryBuilder('a')
      .where('a.proceso_id = :procesoId AND a.numeral = :numeral', {
        procesoId,
        numeral: NUMERAL_CAUSAL,
      });

    // Dentro de la transacción se bloquea: dos elecciones simultáneas dejarían
    // el proceso con una causal y la traza con la otra.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  /**
   * Deja la actividad cumplida y sellada por quien eligió.
   *
   * Cierra en APROBADO sin pasar por EN_REVISION: elegir la causal ya es la
   * decisión, y el único que puede tomarla es el abogado que responde por el
   * proceso. Un envío intermedio sería un paso que nadie resuelve.
   *
   * Si la fila no existe —un proceso anterior a que la matriz se instanciara—
   * se crea, porque para entonces la actividad ya se comprobó aplicable.
   */
  private async marcar(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_CAUSAL } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_CAUSAL,
          estado: 'APROBADO' as EstadoActividad,
          datos: {},
          enviadoPor: acceso.userName,
          enviadoPorId: acceso.userId ?? null,
          revisadoPor: acceso.userName,
          revisadoAt: new Date(),
        } as Partial<ProcesoActividad>),
      );
      return;
    }

    actividad.estado = 'APROBADO';
    actividad.enviadoPor = acceso.userName;
    actividad.enviadoPorId = acceso.userId ?? null;
    actividad.revisadoPor = acceso.userName;
    actividad.revisadoAt = new Date();
    await em.save(ProcesoActividad, actividad);
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidad: 'causal_contratacion',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
