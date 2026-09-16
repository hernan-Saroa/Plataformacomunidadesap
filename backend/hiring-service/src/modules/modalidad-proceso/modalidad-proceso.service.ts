import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Proceso } from '../../entities/proceso.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { DecisionRevision, Revision } from '../../entities/revision.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_ACTIVIDAD_EDITAR, tienePermiso } from '../../auth/permisos';
import { ParticipacionService } from '../participacion/participacion.service';
import { UmbralesService } from '../umbrales/umbrales.service';
import { CambiarModalidadDto, DecidirModalidadDto } from './dto/modalidad-proceso.dto';

/** Actividad 3.5 de la matriz: definir la modalidad de contratación. */
export const NUMERAL_MODALIDAD = '3.5';

/**
 * En qué queda la 3.5 según lo que decidió el abogado (EFDS-1183).
 *
 * Dos desenlaces, y esto la separa del estudio previo. Aquí devolver es *la*
 * corrección —el área vuelve a elegir modalidad y la manda otra vez— y no
 * existe el «esto no procede», porque un proceso siempre se tramita por alguna
 * modalidad. Si ninguna sirve, lo que no procede es la contratación, y eso se
 * niega en la 3.4.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function estadoTrasDecidirLaModalidad(decision: DecisionRevision): string {
  return decision === 'APROBADO' ? 'APROBADO' : 'DEVUELTO';
}

/**
 * La modalidad del proceso y su ratificación — actividad 3.5 (EFDS-1183).
 *
 * La modalidad se elige al crear el proceso, porque de ella depende qué
 * actividades recorre. La 3.5 no la vuelve a elegir: la **ratifica**. El
 * abogado que recibió el proceso mira la que el área puso, contra el objeto y
 * la cuantía, y la aprueba o la devuelve para que la corrijan.
 *
 * Hasta ahora era el panel genérico de constancia —fecha, documento y
 * observaciones—, así que la modalidad se daba por definida subiendo un papel,
 * sin que nadie hubiera mirado si era la que correspondía.
 */
@Injectable()
export class ModalidadProcesoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly participacion: ParticipacionService,
    private readonly umbrales: UmbralesService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    const actividad = await this.actividad(this.dataSource.manager, procesoId);

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);
    const estadoActual = actividad?.estado ?? 'BORRADOR';

    const revisiones = actividad
      ? await this.dataSource.getRepository(Revision).find({
          where: { procesoActividadId: actividad.id },
          order: { createdAt: 'DESC' },
        })
      : [];

    return {
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      valorEstimado: proceso.valorEstimado,
      estado: estadoActual,
      /**
       * Si quien mira puede cambiarla y mandarla a revisar.
       *
       * El área que radicó, mientras esté en borrador o se la hayan devuelto.
       * Ratificada no se toca: cambiar la modalidad después alteraría qué
       * actividades recorre un proceso que ya avanzó por otras.
       */
      puedeCorregir:
        (estadoActual === 'BORRADOR' || estadoActual === 'DEVUELTO') &&
        (await this.esDelArea(proceso, acceso)),
      puedeDecidir: estadoActual === 'EN_REVISION' && motivo === null,
      abogado: abogado
        ? { nombre: abogado.nombre, usuarioNombre: abogado.usuarioNombre }
        : null,
      motivoNoDecide: motivo,
      /** Lo que el abogado dijo cada vez, que es lo que permite corregir. */
      revisiones: revisiones.map((r) => ({
        decision: r.decision,
        observaciones: r.observaciones,
        revisadoPor: r.revisadoPor,
        createdAt: r.createdAt,
      })),
    };
  }

  // -------------------------------------------------------------- el área --

  /**
   * Propone la modalidad, o la corrige tras una devolución.
   *
   * La cambia y la manda a revisar en un solo acto. En dos pasos el área podía
   * dejarla cambiada y sin mandar, y el abogado vería una modalidad distinta de
   * la que aprobó sin que nada dijera que estaba pendiente: aquí corregir *es*
   * volver a proponer.
   */
  async proponer(procesoId: string, dto: CambiarModalidadDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);

      if (!(await this.esDelArea(proceso, acceso))) {
        throw new ForbiddenException(
          'La modalidad la propone el área que radicó el proceso: tener permiso de editar no da acceso a los expedientes de otras áreas',
        );
      }

      const actividad = await this.actividad(em, procesoId);
      if (actividad?.estado === 'EN_REVISION') {
        throw new ConflictException('La modalidad ya está en revisión: espera la decisión');
      }
      if (actividad?.estado === 'APROBADO') {
        throw new ConflictException(
          'La modalidad ya fue ratificada: cambiarla ahora alteraría las actividades que el proceso ya recorrió',
        );
      }

      const modalidad = await em
        .getRepository(Modalidad)
        .findOne({ where: { codigo: dto.modalidad } });
      if (!modalidad) throw new BadRequestException('Esa modalidad no existe en el catálogo');

      // La misma regla que al crear el proceso: si la cuantía obliga a
      // licitación pública, corregir a una de menor cuantía no puede colarse
      // solo porque venga por otra puerta.
      await this.umbrales.exigirModalidadPermitida(proceso.valorEstimado ?? 0, modalidad);

      const anterior = proceso.modalidad;
      proceso.modalidad = modalidad.codigo;
      await em.save(Proceso, proceso);

      await this.marcar(em, procesoId, 'EN_REVISION', acceso);

      await this.traza(em, procesoId, 'ENVIAR', acceso, {
        actividad: NUMERAL_MODALIDAD,
        modalidad: modalidad.codigo,
        modalidadNombre: modalidad.nombre,
        ...(anterior && anterior !== modalidad.codigo ? { modalidadAnterior: anterior } : {}),
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- el abogado --

  /**
   * Ratifica la modalidad, o la devuelve para que el área la corrija.
   *
   * Devolver exige motivo: sin él el área no sabe qué modalidad se esperaba y
   * el ciclo se repetiría con la misma equivocación.
   */
  async decidir(procesoId: string, dto: DecidirModalidadDto, acceso: HiringAccess) {
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);
    if (motivo === 'SIN_ABOGADO') {
      throw new ConflictException(
        'Este proceso todavía no tiene abogado asignado: se reparte en la actividad 3.3 y después se revisa',
      );
    }
    if (motivo === 'NO_ES_TUYO') {
      throw new ForbiddenException(
        `Este proceso lo revisa ${abogado!.nombre}: la modalidad la ratifica el abogado al que se le asignó`,
      );
    }
    if (motivo === 'SIN_PERMISO') {
      throw new ForbiddenException('No tienes permiso para resolver revisiones');
    }

    if (dto.decision === 'DEVUELTO' && !dto.observaciones?.trim()) {
      throw new BadRequestException(
        'Explica qué modalidad corresponde: sin motivo el área repetiría la misma elección',
      );
    }

    await this.dataSource.transaction(async (em) => {
      const actividad = await this.actividad(em, procesoId, true);
      if (!actividad || actividad.estado !== 'EN_REVISION') {
        throw new ConflictException('La modalidad no está en revisión');
      }

      await em.save(Revision, {
        procesoActividadId: actividad.id,
        decision: dto.decision,
        observaciones: dto.observaciones?.trim() || null,
        versionRevisada: actividad.version ?? 1,
        revisadoPor: acceso.userName,
        revisadoPorId: acceso.userId,
      } as Partial<Revision>);

      await this.marcar(
        em,
        procesoId,
        estadoTrasDecidirLaModalidad(dto.decision),
        acceso,
        dto.decision === 'APROBADO',
      );

      await this.traza(
        em,
        procesoId,
        dto.decision === 'APROBADO' ? 'APROBAR' : 'DEVOLVER',
        acceso,
        { actividad: NUMERAL_MODALIDAD, observaciones: dto.observaciones },
      );
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Si el proceso es del área de quien lo toca.
   *
   * Mismo criterio que el estudio previo: lo radicó, o está en el proceso. Lo
   * segundo cubre a la Dirección, que puede corregir la modalidad si el área se
   * equivocó y ya está encima del expediente.
   */
  private async esDelArea(proceso: Proceso, acceso: HiringAccess): Promise<boolean> {
    if (!tienePermiso(acceso, PERMISO_ACTIVIDAD_EDITAR)) return false;

    const loRadico =
      !!proceso.createdBy &&
      !!acceso.userName &&
      proceso.createdBy.trim().toLowerCase() === acceso.userName.trim().toLowerCase();

    if (loRadico) return true;
    return (await this.participacion.procesosDe(acceso)).includes(proceso.id);
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
        numeral: NUMERAL_MODALIDAD,
      });

    // Dentro de la transacción se bloquea: dos decisiones simultáneas
    // registrarían ambas su revisión sobre el mismo envío.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async marcar(
    em: EntityManager,
    procesoId: string,
    estado: string,
    acceso: HiringAccess,
    cierra = false,
  ) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_MODALIDAD } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_MODALIDAD,
          estado: estado as any,
          datos: {},
          enviadoPor: acceso.userName,
          ...(cierra ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        } as Partial<ProcesoActividad>),
      );
      return;
    }

    actividad.estado = estado as any;
    if (estado === 'EN_REVISION') {
      actividad.enviadoPor = acceso.userName;
      actividad.enviadoPorId = acceso.userId ?? null;
    }
    // Solo quien decide queda sellado como revisor: en EN_REVISION nadie ha
    // decidido, y al devolver la actividad vuelve a estar abierta.
    actividad.revisadoPor = cierra ? acceso.userName : (null as any);
    actividad.revisadoAt = cierra ? new Date() : (null as any);
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
        entidad: 'modalidad_proceso',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
