import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { PaaLinea, PaaRevision, type DecisionRevisionPaa } from '../../entities/paa.entity';
import { Proceso } from '../../entities/proceso.entity';
import { NUMERAL_ESTUDIO_PREVIO, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import type { HiringAccess } from '../../auth/hiring-access';
import { AlcanceService } from '../../auth/alcance.service';
import { EstudioPrevioService } from '../estudio-previo/estudio-previo.service';
import { PaaAdminService } from './paa-admin.service';
import { PaaActivacionService } from './paa-activacion.service';
import { lineaParaCrear } from './linea-para-crear';
import { origenDesdeLinea } from './estructura-paa';
import { planDeActualizacion } from './actualizacion-paa';
import type { DecidirRevisionPaaDto } from './dto/paa.dto';

/** Hasta dónde se puede devolver: la única devolución del flujo es la de la 3.4 a la 3.1. */
const ETAPA_DEVOLVIBLE = 3;

/**
 * Las revisiones que abre un cambio del PAA, y lo que decide el encargado.
 *
 * Las decide cualquiera que tenga `decidir` en `PAA.R` (109): ya no hay un
 * abogado del proceso que responda por ellas, y el endpoint ya exige ese
 * permiso.
 */
@Injectable()
export class PaaRevisionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: PaaAdminService,
    private readonly activacion: PaaActivacionService,
    private readonly estudioPrevio: EstudioPrevioService,
    private readonly alcance: AlcanceService,
  ) {}

  async listar(estado: 'PENDIENTE' | 'RESUELTA' | undefined, procesoId?: string) {
    const filas = await this.dataSource.query(
      `${SELECT_REVISION}
        WHERE ($1::text IS NULL OR r.estado = $1) AND ($2::uuid IS NULL OR r.proceso_id = $2)
        ORDER BY r.estado DESC, r.bloquea DESC, r.created_at ASC`,
      [estado ?? null, procesoId ?? null],
    );
    return filas.map(aVista);
  }

  async obtener(id: string, acceso: HiringAccess) {
    const [fila] = await this.dataSource.query(`${SELECT_REVISION} WHERE r.id = $1`, [id]);
    if (!fila) throw new NotFoundException('La revisión no existe');
    const revision = aVista(fila);
    const proceso = await this.dataSource.getRepository(Proceso).findOneOrFail({ where: { id: revision.procesoId } });
    return {
      ...revision,
      decisiones: await this.decisionesPosibles(revision.tipo, proceso, acceso),
      // El permiso lo exige el endpoint de decidir; aquí solo si sigue abierta.
      puedeDecidir: revision.estado === 'PENDIENTE',
    };
  }

  /**
   * Las que el caso admite, cada una con el porqué si no se puede.
   *
   * La pantalla las muestra todas para que se entienda por qué una falta:
   * migrar solo existe entre vigencias, y devolver solo mientras el proceso
   * está en la etapa 3.
   */
  private async decisionesPosibles(tipo: PaaRevision['tipo'], proceso: Proceso, acceso: HiringAccess) {
    const enCurso = proceso.estado === 'EN_CURSO';
    const noEnCurso = `El proceso ya no está en curso (${proceso.estado.toLowerCase()}).`;
    const puedeMigrar = await this.alcance.puedeEn(acceso, 'aprobar', 'PAA.R');
    return [
      { decision: 'CONTINUAR', disponible: true, motivo: null },
      {
        decision: 'DEVOLVER',
        disponible: enCurso && proceso.etapa === ETAPA_DEVOLVIBLE,
        motivo: !enCurso
          ? noEnCurso
          : proceso.etapa !== ETAPA_DEVOLVIBLE
            ? `El proceso está en la etapa ${proceso.etapa}: la única devolución del flujo es la del estudio previo, en la etapa 3.`
            : null,
      },
      {
        decision: 'MIGRAR',
        disponible: enCurso && tipo === 'CAMBIO_VIGENCIA' && puedeMigrar,
        motivo: tipo !== 'CAMBIO_VIGENCIA'
          ? 'Migrar es pasar el proceso a una línea del año nuevo; solo aplica a la evaluación por cambio de vigencia.'
          : !enCurso
            ? noEnCurso
            : !puedeMigrar
              ? 'Autorizar la migración entre vigencias exige aprobar en las revisiones del PAA.'
              : null,
      },
      { decision: 'CANCELAR', disponible: enCurso, motivo: enCurso ? null : noEnCurso },
    ] satisfies { decision: DecisionRevisionPaa; disponible: boolean; motivo: string | null }[];
  }

  async decidir(id: string, dto: DecidirRevisionPaaDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const revision = await em
        .createQueryBuilder(PaaRevision, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id })
        .getOne();
      if (!revision) throw new NotFoundException('La revisión no existe');
      if (revision.estado !== 'PENDIENTE') throw new ConflictException('La revisión ya se decidió');

      const proceso = await em.findOneOrFail(Proceso, { where: { id: revision.procesoId } });

      const posibles = await this.decisionesPosibles(revision.tipo, proceso, acceso);
      const elegida = posibles.find((d) => d.decision === dto.decision)!;
      if (!elegida.disponible) throw new ConflictException(elegida.motivo);

      const justificacion = dto.justificacion.trim();
      const motivoEnExpediente = `Revisión por cambio del PAA (${revision.codigo}): ${justificacion}`;
      let detalle: Record<string, unknown> = {};

      switch (dto.decision) {
        case 'CONTINUAR':
          break;
        case 'DEVOLVER':
          detalle = await this.devolver(em, proceso, revision, motivoEnExpediente, acceso);
          break;
        case 'MIGRAR':
          if (!dto.lineaDestinoId) throw new BadRequestException('Para migrar hay que elegir la línea del año nuevo');
          detalle = await this.migrar(em, proceso, revision, dto.lineaDestinoId, motivoEnExpediente, acceso);
          break;
        case 'CANCELAR':
          detalle = await this.cancelar(em, proceso, revision, justificacion, acceso);
          break;
      }

      Object.assign(revision, {
        estado: 'RESUELTA',
        decision: dto.decision,
        justificacion,
        lineaDestinoId: dto.decision === 'MIGRAR' ? dto.lineaDestinoId : null,
        decididaPor: acceso.userName,
        decididaPorId: acceso.userId || null,
        decididaAt: new Date(),
      });
      await em.save(revision);

      await this.admin.traza(
        em,
        'paa_revisiones',
        revision.id,
        dto.decision === 'CONTINUAR' ? 'CONTINUAR' : dto.decision === 'DEVOLVER' ? 'DEVOLVER' : dto.decision === 'MIGRAR' ? 'MIGRAR' : 'CANCELAR',
        acceso,
        { tipo: revision.tipo, codigo: revision.codigo, observaciones: justificacion, ...detalle },
        proceso.id,
      );

      return { id: revision.id, estado: revision.estado, decision: revision.decision, ...detalle };
    });
  }

  // -------------------------------------------------------------- decisiones --

  /**
   * La 3.1 vuelve al área y, si la línea sigue existiendo, con lo que el PAA
   * dice ahora en lo que el área no había corregido a mano.
   */
  private async devolver(
    em: EntityManager,
    proceso: Proceso,
    revision: PaaRevision,
    observaciones: string,
    acceso: HiringAccess,
  ) {
    const { estabaCerrado } = await this.estudioPrevio.devolverPorCambioDelPaa(em, proceso.id, observaciones, acceso);

    // Una línea eliminada no trae datos nuevos, y una evaluación anual sin
    // migrar conserva los del año en que nació: solo una modificación los trae.
    if (revision.tipo !== 'MODIFICACION' || !proceso.paaLineaId) return { estabaCerrado, aplicados: [] };

    const linea = await em.findOneOrFail(PaaLinea, { where: { id: proceso.paaLineaId } });
    const plan = await this.planHacia(em, proceso, linea);
    if (!plan.campos.length) return { estabaCerrado, aplicados: [] };

    await this.activacion.aplicarPlan(em, proceso.id, plan, linea.id, 'ACTUALIZACION', acceso, {
      codigo: linea.codigo,
      porDevolucion: revision.id,
    });
    return { estabaCerrado, aplicados: plan.campos.filter((c) => c.aplicado).map((c) => c.campo) };
  }

  /**
   * Pasa el proceso a una línea del año nuevo que eligió el encargado.
   *
   * Nunca por coincidencia de código: el encargado elige la línea, y se
   * comprueba que sea de la versión activa del año vigente, de la misma región
   * y que no la tenga otro proceso. Si el proceso sigue en la etapa 3, la 3.1
   * se devuelve con los datos de la línea nueva; si ya pasó, cambia solo la
   * referencia —sus documentos ya se produjeron con los datos de su año— y la
   * aplicación deja dicho que nada se aplicó y por qué.
   */
  private async migrar(
    em: EntityManager,
    proceso: Proceso,
    revision: PaaRevision,
    lineaDestinoId: string,
    observaciones: string,
    acceso: HiringAccess,
  ) {
    const destino = await lineaParaCrear(em, lineaDestinoId);
    if (destino.version.id !== revision.versionNuevaId) {
      throw new ConflictException('La línea elegida no es de la versión del año nuevo que abrió esta evaluación.');
    }
    if (destino.region.id !== proceso.paaRegionId) {
      throw new ConflictException(`La línea es de ${destino.region.nombre}: un proceso no se migra a otra región.`);
    }

    let estabaCerrado = false;
    if (proceso.etapa === ETAPA_DEVOLVIBLE) {
      ({ estabaCerrado } = await this.estudioPrevio.devolverPorCambioDelPaa(em, proceso.id, observaciones, acceso));
    }

    const plan = await this.planHacia(em, proceso, destino.linea);
    if (proceso.etapa !== ETAPA_DEVOLVIBLE) {
      // Fuera de la etapa 3 la 3.1 está cerrada: el plan ya trae cada campo como
      // no aplicado, con el motivo.
      plan.origen = { ...destino.origen };
    }

    await this.activacion.aplicarPlan(
      em,
      proceso.id,
      plan,
      destino.linea.id,
      'MIGRACION',
      acceso,
      { desde: `${revision.codigo} (${proceso.paaAnio})`, hacia: `${destino.linea.codigo} (${destino.vigencia.anio})` },
      { paaCodigo: destino.linea.codigo, paaRegionId: destino.region.id, paaAnio: destino.vigencia.anio },
    );

    return {
      estabaCerrado,
      hacia: { codigo: destino.linea.codigo, anio: destino.vigencia.anio },
      aplicados: plan.campos.filter((c) => c.aplicado).map((c) => c.campo),
    };
  }

  /**
   * El cuarto desenlace del proceso. Las demás revisiones pendientes del mismo
   * proceso se cierran con él: no queda nada que decidir sobre un proceso que
   * terminó.
   */
  private async cancelar(
    em: EntityManager,
    proceso: Proceso,
    revision: PaaRevision,
    justificacion: string,
    acceso: HiringAccess,
  ) {
    await em.update(
      Proceso,
      { id: proceso.id },
      {
        estado: 'CANCELADO',
        canceladoPor: acceso.userName,
        canceladoAt: new Date(),
        motivoCancelacion: `Revisión por cambio del PAA (${revision.codigo}): ${justificacion}`,
      },
    );

    const otras = await em
      .createQueryBuilder()
      .update(PaaRevision)
      .set({
        estado: 'RESUELTA',
        decision: 'CANCELAR',
        justificacion: `Se cerró al cancelar el proceso desde otra revisión: ${justificacion}`,
        decididaPor: acceso.userName,
        decididaPorId: acceso.userId || null,
        decididaAt: new Date(),
      })
      .where(`proceso_id = :proceso AND estado = 'PENDIENTE' AND id <> :id`, { proceso: proceso.id, id: revision.id })
      .execute();

    return { revisionesCerradas: otras.affected ?? 0 };
  }

  // ----------------------------------------------------------------------------

  private async planHacia(em: EntityManager, proceso: Proceso, linea: PaaLinea) {
    const estudio = await em.findOne(ProcesoActividad, {
      where: { procesoId: proceso.id, numeral: NUMERAL_ESTUDIO_PREVIO },
    });
    const plan = planDeActualizacion({
      origenAnterior: proceso.paaOrigen,
      origenNuevo: origenDesdeLinea(linea.codigo, linea.valores),
      proceso: { objeto: proceso.objeto, modalidad: proceso.modalidad, valorEstimado: proceso.valorEstimado },
      estudio: estudio?.datos ?? {},
      estadoEstudio: estudio?.estado ?? null,
    });
    await this.activacion.revisarUmbral(em, proceso, plan);
    return plan;
  }
}

const SELECT_REVISION = `
  SELECT r.*, p.radicado, p.objeto, p.etapa, p.estado AS estado_proceso, p.paa_anio, p.paa_region_id,
         rg.nombre AS region, va.numero AS version_anterior, vn.numero AS version_nueva,
         ga.anio AS anio_anterior, gn.anio AS anio_nuevo
    FROM hiring.paa_revisiones r
    JOIN hiring.procesos p ON p.id = r.proceso_id
    LEFT JOIN hiring.paa_regiones rg ON rg.id = p.paa_region_id
    JOIN hiring.paa_versiones va ON va.id = r.version_anterior_id
    JOIN hiring.paa_vigencias ga ON ga.id = va.vigencia_id
    JOIN hiring.paa_versiones vn ON vn.id = r.version_nueva_id
    JOIN hiring.paa_vigencias gn ON gn.id = vn.vigencia_id`;

function aVista(f: any) {
  return {
    id: f.id as string,
    procesoId: f.proceso_id as string,
    radicado: f.radicado as string,
    objeto: f.objeto as string,
    etapa: Number(f.etapa),
    estadoProceso: f.estado_proceso as string,
    region: f.region as string | null,
    regionId: f.paa_region_id as string | null,
    codigo: f.codigo as string,
    tipo: f.tipo as PaaRevision['tipo'],
    porCambioAnual: f.tipo === 'CAMBIO_VIGENCIA',
    versionAnterior: { numero: Number(f.version_anterior), anio: Number(f.anio_anterior) },
    versionNueva: { numero: Number(f.version_nueva), anio: Number(f.anio_nuevo) },
    cambios: f.cambios,
    motivo: f.motivo as string,
    bloquea: f.bloquea as boolean,
    // Sin responsable fijo (109): la decide quien tenga el permiso.
    responsable: null,
    estado: f.estado as PaaRevision['estado'],
    decision: f.decision as DecisionRevisionPaa | null,
    justificacion: f.justificacion as string | null,
    decididaPor: f.decidida_por as string | null,
    decididaAt: f.decidida_at as Date | null,
    createdAt: f.created_at as Date,
  };
}
