import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { Cdp, EstadoCdp, ESTADOS_CDP_EN_CURSO } from '../../entities/cdp.entity';
import { Actividad, ActividadExcluida, ETAPA_CDP } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';

/** Transiciones válidas del ciclo. Lo que no esté aquí, no se puede hacer. */
const TRANSICIONES: Record<EstadoCdp, EstadoCdp[]> = {
  SOLICITADO: ['VERIFICADO', 'RECHAZADO', 'ANULADO'],
  VERIFICADO: ['EXPEDIDO', 'RECHAZADO', 'ANULADO'],
  EXPEDIDO: ['ANULADO'],
  RECHAZADO: [],
  ANULADO: [],
};

/**
 * Valida un salto de estado del CDP.
 *
 * Función pura y exportada: es la regla que impide, por ejemplo, expedir un CDP
 * que nadie verificó, y conviene poder probarla sin base de datos.
 */
export function puedeTransicionar(desde: EstadoCdp, hacia: EstadoCdp): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}

/**
 * El CDP debe cubrir el valor estimado del proceso.
 *
 * Un CDP por debajo del estimado no alcanza a respaldar el gasto, y el error es
 * fácil de cometer al teclear una cifra larga. Se avisa en vez de bloquear: la
 * cuantía definitiva puede bajar respecto del estimado, y esa decisión es de la
 * Dirección Financiera, no del sistema.
 */
export function cdpCubreElProceso(
  valorCdp: number | null,
  valorEstimado: number | null,
): { cubre: boolean; advertencia: string | null } {
  if (valorCdp === null || valorEstimado === null) {
    return { cubre: true, advertencia: null };
  }
  if (valorCdp >= valorEstimado) return { cubre: true, advertencia: null };
  return {
    cubre: false,
    advertencia:
      'El valor del CDP es inferior al valor estimado del proceso; confirma que el respaldo presupuestal alcanza',
  };
}

@Injectable()
export class CdpService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Si la modalidad del proceso pasa por el CDP.
   *
   * Se resuelve contra la matriz y no con una constante: enajenación por
   * subasta es hoy la única exenta, pero la exclusión es un dato de la matriz y
   * mañana puede cambiar sin tocar código.
   */
  async aplicaCdp(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return true;
    const repo = (em ?? this.dataSource.manager).getRepository(ActividadExcluida);
    const excluidas = await repo.count({
      where: { modalidad, numeral: In(await this.numeralesEtapa4(em)) },
    });
    // Excluida de todas las actividades de la etapa: la modalidad no lleva CDP.
    return excluidas === 0;
  }

  private async numeralesEtapa4(em?: EntityManager): Promise<string[]> {
    const repo = (em ?? this.dataSource.manager).getRepository(Actividad);
    const filas = await repo.find({ where: { etapa: ETAPA_CDP }, order: { orden: 'ASC' } });
    return filas.map((a) => a.numeral);
  }

  /** Actividades de la etapa 4 que aplican a la modalidad del proceso. */
  async actividadesDeLaEtapa(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const actividades = await manager.getRepository(Actividad).find({
      where: { etapa: ETAPA_CDP, activa: true },
      order: { orden: 'ASC' },
    });
    if (!modalidad) return actividades;

    const excluidas = new Set(
      (await manager.getRepository(ActividadExcluida).find({ where: { modalidad } })).map(
        (e) => e.numeral,
      ),
    );
    return actividades.filter((a) => !excluidas.has(a.numeral));
  }

  /**
   * Crea las actividades 4.1 a 4.4 del proceso.
   *
   * Idempotente: la tabla tiene único (proceso, numeral), y volver a llamarlo
   * tras un reintento no debe duplicar ni fallar.
   */
  async instanciarEtapa4(em: EntityManager, proceso: Proceso): Promise<ProcesoActividad[]> {
    const actividades = await this.actividadesDeLaEtapa(proceso.modalidad, em);
    if (actividades.length === 0) return [];

    const existentes = new Set(
      (
        await em.getRepository(ProcesoActividad).find({
          where: { procesoId: proceso.id, numeral: In(actividades.map((a) => a.numeral)) },
        })
      ).map((a) => a.numeral),
    );

    const nuevas = actividades
      .filter((a) => !existentes.has(a.numeral))
      .map((a) =>
        em.create(ProcesoActividad, {
          procesoId: proceso.id,
          numeral: a.numeral,
          estado: 'BORRADOR' as const,
          datos: {},
        }),
      );

    return nuevas.length > 0 ? em.save(nuevas) : [];
  }

  /** CDP en curso del proceso, o null si nunca se solicitó o quedó cerrado. */
  async delProceso(procesoId: string, em?: EntityManager): Promise<Cdp | null> {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(Cdp).findOne({
      where: { procesoId, estado: In(ESTADOS_CDP_EN_CURSO) },
    });
  }

  /**
   * Estado del respaldo presupuestal del proceso, en la forma que necesitan las
   * validaciones de apertura (EFDS-1340) y de contratación directa (EFDS-1341).
   */
  async estadoRespaldo(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await manager.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const aplica = await this.aplicaCdp(proceso.modalidad, em);
    if (!aplica) {
      return { aplica: false, cdp: null, expedido: true as const, motivo: null };
    }

    const cdp = await this.delProceso(procesoId, em);
    const expedido = cdp?.estado === 'EXPEDIDO';

    return {
      aplica: true,
      cdp,
      expedido,
      motivo: expedido
        ? null
        : cdp
          ? `El CDP del proceso está en estado ${cdp.estado} y aún no ha sido expedido`
          : 'El proceso no tiene CDP solicitado',
    };
  }

  /** Cambia el estado del CDP validando que el salto sea legítimo. */
  async transicionar(cdp: Cdp, hacia: EstadoCdp) {
    if (!puedeTransicionar(cdp.estado, hacia)) {
      throw new BadRequestException(
        `Un CDP en estado ${cdp.estado} no puede pasar a ${hacia}`,
      );
    }
    cdp.estado = hacia;
    cdp.updatedAt = new Date();
    return cdp;
  }
}
