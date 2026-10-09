import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  PaaAplicacion,
  PaaComparacion,
  PaaLinea,
  PaaRevision,
  PaaVersion,
  PaaVigencia,
  type CambiosRevisionPaa,
  type TipoRevisionPaa,
} from '../../entities/paa.entity';
import { Proceso } from '../../entities/proceso.entity';
import { NUMERAL_ESTUDIO_PREVIO, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import type { HiringAccess } from '../../auth/hiring-access';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { UmbralesService } from '../umbrales/umbrales.service';
import { PaaAdminService } from './paa-admin.service';
import { diferencias } from './comparador-paa';
import { origenDesdeLinea } from './estructura-paa';
import { planDeActualizacion, type PlanDeActualizacion } from './actualizacion-paa';

/** Qué le pasa a un proceso cuando se activa una versión. */
export type Tratamiento = 'SIN_CAMBIOS' | 'ACTUALIZADO' | 'MODIFICADA_SIN_EFECTO' | 'ELIMINADA';

export interface ProcesoAfectado {
  procesoId: string;
  radicado: string;
  objeto: string;
  etapa: number;
  codigo: string;
  tratamiento: Tratamiento;
  /** Si queda una revisión pendiente, y si detiene el proceso. */
  revision: { tipo: TipoRevisionPaa; bloquea: boolean } | null;
  abogado: { id: string | null; nombre: string } | null;
  cambios: CambiosRevisionPaa;
  lineaNuevaId: string | null;
  plan: PlanDeActualizacion | null;
}

/** Los procesos cuyas líneas vienen en el Excel de un documento: los de los demás territorios no se tocan. */
const DE_LAS_REGIONES_DEL_DOCUMENTO =
  'p.paa_region_id IN (SELECT r.id FROM hiring.paa_regiones r WHERE r.documento_id = :documento)';

const MOTIVO_UMBRAL = 'La nueva cuantía no admite esta modalidad';

/**
 * Activa una versión del PAA y lleva sus cambios a los procesos.
 *
 * Todo en una transacción: si un proceso falla, la versión sigue validada y
 * ningún proceso queda a medio actualizar. Antes de activar, `afectados` dice
 * exactamente lo que va a pasar, con la misma lógica: lo que se muestra es lo
 * que se hace.
 */
@Injectable()
export class PaaActivacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: PaaAdminService,
    private readonly configuracion: ConfiguracionService,
    private readonly umbrales: UmbralesService,
  ) {}

  /** Lo que haría la activación, sin hacerlo. */
  async afectados(versionId: string) {
    const { version, vigencia, activa } = await this.cargar(this.dataSource.manager, versionId);
    const procesos = activa ? await this.evaluar(this.dataSource.manager, version, vigencia, activa) : [];
    return {
      version: { id: version.id, numero: version.numero, estado: version.estado },
      anio: vigencia.anio,
      versionActiva: activa ? { id: activa.id, numero: activa.numero } : null,
      resumen: contar(procesos),
      procesos: procesos.map(({ plan: _plan, ...p }) => p),
    };
  }

  async activar(versionId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      // La vigencia bloqueada: dos activaciones simultáneas no se pisan.
      const { version, vigencia, activa } = await this.cargar(em, versionId, true);
      if (version.estado !== 'VALIDADA') {
        throw new ConflictException(`La versión ${version.numero} no está validada: está ${version.estado.toLowerCase()}.`);
      }

      const comparacion = activa
        ? await em.findOne(PaaComparacion, { where: { versionBaseId: activa.id, versionNuevaId: version.id } })
        : null;
      if (activa && !comparacion) {
        throw new ConflictException(
          `La versión ${version.numero} se comparó con otra distinta de la activa (${activa.numero}). Cárguela de nuevo.`,
        );
      }
      if (comparacion && !comparacion.confiable) {
        throw new ConflictException(
          'La comparación con la versión activa no es confiable (códigos repetidos): activarla podría pegarle a un proceso los datos de otra línea.',
        );
      }

      const procesos = activa ? await this.evaluar(em, version, vigencia, activa) : [];

      const ahora = new Date();
      if (activa) {
        await em.update(PaaVersion, { id: activa.id }, { estado: 'REEMPLAZADA', reemplazadaAt: ahora });
      }
      await em.update(
        PaaVersion,
        { id: version.id },
        { estado: 'ACTIVA', activadaPor: acceso.userName, activadaAt: ahora },
      );

      for (const p of procesos) await this.aplicar(em, p, version, activa!, comparacion, acceso);

      const resumen = contar(procesos);
      await this.admin.traza(em, 'paa_versiones', version.id, 'ACTIVAR', acceso, {
        anio: vigencia.anio,
        numero: version.numero,
        reemplaza: activa?.numero ?? null,
        ...resumen,
      });

      return { version: { id: version.id, numero: version.numero }, anio: vigencia.anio, resumen };
    });
  }

  // --------------------------------------------------- cambio de vigencia --

  /** Los procesos en curso de años anteriores que entrarían a evaluación. */
  async afectadosPorCambioDeVigencia(vigenciaId: string) {
    const { vigencia, activa, anterior } = await this.paraDeclarar(this.dataSource.manager, vigenciaId);
    const procesos = await this.abiertosDeOtrosAnios(this.dataSource.manager, vigencia);
    const abogados = await this.abogados(this.dataSource.manager, procesos.map((p) => p.id));
    return {
      anio: vigencia.anio,
      version: activa ? { id: activa.id, numero: activa.numero } : null,
      vigenteActual: anterior ? { id: anterior.id, anio: anterior.anio } : null,
      procesos: procesos.map((p) => ({
        procesoId: p.id,
        radicado: p.radicado,
        objeto: p.objeto,
        etapa: p.etapa,
        codigo: p.paaCodigo,
        anio: p.paaAnio,
        abogado: abogados.get(p.id) ?? null,
      })),
    };
  }

  /**
   * Declara vigente un año nuevo del PAA (escenario B).
   *
   * No es una actualización: no modifica ningún proceso. Los del año anterior
   * que siguen en curso conservan su línea, su versión y sus datos, y a cada
   * uno se le abre una evaluación por cambio anual que lo detiene hasta que
   * alguien decida si continúa con las condiciones con que nació, se devuelve,
   * se migra a una línea del año nuevo o se cancela. Un código de un año no
   * equivale al del otro aunque se escriba igual, así que nada se empareja solo.
   */
  async declararVigente(vigenciaId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const { vigencia, activa, anterior } = await this.paraDeclarar(em, vigenciaId, true);
      if (!activa) {
        throw new ConflictException(`La vigencia ${vigencia.anio} no tiene una versión activa: primero se carga y se activa su PAA.`);
      }

      const ahora = new Date();
      // Primero se apaga la anterior: el índice admite una sola vigente.
      if (anterior) await em.update(PaaVigencia, { id: anterior.id }, { vigente: false });
      await em.update(
        PaaVigencia,
        { id: vigencia.id },
        { vigente: true, declaradaVigentePor: acceso.userName, declaradaVigenteAt: ahora },
      );

      const procesos = await this.abiertosDeOtrosAnios(em, vigencia);
      const abogados = await this.abogados(em, procesos.map((p) => p.id));
      const comparacion = await em.findOne(PaaComparacion, {
        where: { versionNuevaId: activa.id, tipo: 'CAMBIO_VIGENCIA' },
      });

      let abiertas = 0;
      for (const p of procesos) {
        const linea = await em.findOneOrFail(PaaLinea, { where: { id: p.paaLineaId! } });
        const abogado = abogados.get(p.id) ?? null;
        const abierta = await this.abrirRevision(
          em,
          {
            procesoId: p.id,
            comparacionId: comparacion?.id ?? null,
            versionAnteriorId: linea.versionId,
            versionNuevaId: activa.id,
            codigo: p.paaCodigo!,
            tipo: 'CAMBIO_VIGENCIA',
            cambios: { linea: [], proceso: [] },
            motivo:
              `Evaluación por cambio anual, no una actualización de la misma vigencia: el PAA ${vigencia.anio} ` +
              `reemplaza al de ${p.paaAnio}. El proceso conserva los datos de ${p.paaCodigo} (${p.paaAnio}) ` +
              'hasta que se decida si continúa, se devuelve, se migra o se cancela.',
            bloquea: true,
            responsableId: abogado?.id ?? null,
            responsableNombre: abogado?.nombre ?? null,
          },
          activa.numero,
          acceso,
        );
        if (abierta) abiertas++;
      }

      await this.admin.traza(em, 'paa_vigencias', vigencia.id, 'DECLARAR_VIGENTE', acceso, {
        anio: vigencia.anio,
        anterior: anterior?.anio ?? null,
        version: activa.numero,
        evaluaciones: abiertas,
      });

      return { anio: vigencia.anio, anterior: anterior?.anio ?? null, evaluaciones: abiertas };
    });
  }

  private async paraDeclarar(em: EntityManager, vigenciaId: string, bloquear = false) {
    const consulta = em.createQueryBuilder(PaaVigencia, 'v').where('v.id = :id', { id: vigenciaId });
    const vigencia = await (bloquear ? consulta.setLock('pessimistic_write') : consulta).getOne();
    if (!vigencia) throw new NotFoundException('La vigencia no existe');
    if (vigencia.vigente) throw new ConflictException(`La vigencia ${vigencia.anio} ya es la vigente.`);

    // La vigente del mismo documento: cada territorio cambia de año cuando
    // carga su PAA, sin arrastrar a los demás.
    const anterior = await em.findOne(PaaVigencia, { where: { documentoId: vigencia.documentoId, vigente: true } });
    if (anterior && anterior.anio > vigencia.anio) {
      throw new ConflictException(
        `La vigente es ${anterior.anio}: no se vuelve a un año anterior. Los procesos de ${vigencia.anio} siguen consultables sin declararla.`,
      );
    }
    const activa = await em.findOne(PaaVersion, { where: { vigenciaId, estado: 'ACTIVA' } });
    return { vigencia, activa, anterior };
  }

  /**
   * En curso, con origen en el PAA de un año anterior del mismo documento. Los
   * creados antes del PAA no tienen origen que evaluar, y los de otro
   * territorio cambian de año con el suyo.
   */
  private abiertosDeOtrosAnios(em: EntityManager, vigencia: PaaVigencia) {
    return em
      .createQueryBuilder(Proceso, 'p')
      .where(`p.estado = 'EN_CURSO' AND p.paa_linea_id IS NOT NULL AND p.paa_anio < :anio`, { anio: vigencia.anio })
      .andWhere(DE_LAS_REGIONES_DEL_DOCUMENTO, { documento: vigencia.documentoId })
      .orderBy('p.radicado', 'ASC')
      .getMany();
  }

  // ------------------------------------------------------------------------

  private async cargar(em: EntityManager, versionId: string, bloquear = false) {
    const version = await em.findOne(PaaVersion, { where: { id: versionId } });
    if (!version) throw new NotFoundException('La versión no existe');
    const vigencia = bloquear
      ? await em
          .createQueryBuilder(PaaVigencia, 'v')
          .setLock('pessimistic_write')
          .where('v.id = :id', { id: version.vigenciaId })
          .getOneOrFail()
      : await em.findOneOrFail(PaaVigencia, { where: { id: version.vigenciaId } });
    const activa = await em.findOne(PaaVersion, { where: { vigenciaId: vigencia.id, estado: 'ACTIVA' } });
    return { version, vigencia, activa: activa?.id === version.id ? null : activa };
  }

  /**
   * Cada proceso en curso que nació de esta vigencia —de ese año y de las
   * regiones de su documento—, frente a su línea en la versión nueva.
   *
   * Se cruza por código y no por id de línea: el proceso puede venir de una
   * versión más vieja que la activa si su línea desapareció y se decidió que
   * siguiera. Los adjudicados, desiertos, negados o cancelados ya terminaron
   * su selección y el PAA no los toca.
   */
  private async evaluar(
    em: EntityManager,
    version: PaaVersion,
    vigencia: PaaVigencia,
    activa: PaaVersion,
  ): Promise<ProcesoAfectado[]> {
    const procesos = await em
      .createQueryBuilder(Proceso, 'p')
      .where(`p.estado = 'EN_CURSO' AND p.paa_anio = :anio`, { anio: vigencia.anio })
      .andWhere(DE_LAS_REGIONES_DEL_DOCUMENTO, { documento: vigencia.documentoId })
      .orderBy('p.radicado', 'ASC')
      .getMany();
    const conLinea = procesos.filter((p) => p.paaLineaId && p.paaCodigo);
    if (!conLinea.length) return [];

    const [actuales, nuevas, estudios, abogados] = await Promise.all([
      em.find(PaaLinea, { where: { id: In(conLinea.map((p) => p.paaLineaId!)) } }),
      em.find(PaaLinea, { where: { versionId: version.id, codigo: In(conLinea.map((p) => p.paaCodigo!)) } }),
      em.find(ProcesoActividad, {
        where: { procesoId: In(conLinea.map((p) => p.id)), numeral: NUMERAL_ESTUDIO_PREVIO },
      }),
      this.abogados(em, conLinea.map((p) => p.id)),
    ]);
    const lineaActual = new Map(actuales.map((l) => [l.id, l]));
    const lineaNueva = new Map(nuevas.map((l) => [`${l.regionId}|${l.codigo}`, l]));
    const estudioDe = new Map(estudios.map((e) => [e.procesoId, e]));

    const resultado: ProcesoAfectado[] = [];
    for (const p of conLinea) {
      const actual = lineaActual.get(p.paaLineaId!);
      if (!actual) continue;
      const nueva = lineaNueva.get(`${p.paaRegionId}|${p.paaCodigo}`) ?? null;
      const base = {
        procesoId: p.id,
        radicado: p.radicado,
        objeto: p.objeto,
        etapa: p.etapa,
        codigo: p.paaCodigo!,
        abogado: abogados.get(p.id) ?? null,
        lineaNuevaId: nueva?.id ?? null,
      };

      if (!nueva) {
        // Solo la primera versión que la pierde abre la revisión. Si ya venía
        // de una versión vieja, eso ya se revisó.
        if (actual.versionId !== activa.id) continue;
        resultado.push({
          ...base,
          tratamiento: 'ELIMINADA',
          revision: { tipo: 'ELIMINACION', bloquea: true },
          cambios: { linea: [], proceso: [] },
          plan: null,
        });
        continue;
      }

      if (nueva.huella === actual.huella) {
        resultado.push({ ...base, tratamiento: 'SIN_CAMBIOS', revision: null, cambios: { linea: [], proceso: [] }, plan: null });
        continue;
      }

      const estudio = estudioDe.get(p.id) ?? null;
      const plan = planDeActualizacion({
        origenAnterior: p.paaOrigen,
        origenNuevo: origenDesdeLinea(nueva.codigo, nueva.valores),
        proceso: { objeto: p.objeto, modalidad: p.modalidad, valorEstimado: p.valorEstimado },
        estudio: estudio?.datos ?? {},
        estadoEstudio: estudio?.estado ?? null,
      });
      await this.revisarUmbral(em, p, plan);

      const relevante = plan.campos.length > 0;
      resultado.push({
        ...base,
        tratamiento: plan.campos.some((c) => c.aplicado) ? 'ACTUALIZADO' : 'MODIFICADA_SIN_EFECTO',
        // Si solo cambió lo informativo (un teléfono, un mes estimado), no hay
        // nada que decidir: se registra y se sigue.
        revision: relevante ? { tipo: 'MODIFICACION', bloquea: false } : null,
        cambios: { linea: diferencias(actual.valores, nueva.valores), proceso: plan.campos },
        plan,
      });
    }
    return resultado;
  }

  /**
   * La misma regla que al crear y al corregir la cuantía en la 3.1: si el valor
   * nuevo obliga a licitación, la modalidad de menor cuantía no se aplica. Ni
   * el valor ni la modalidad, porque van juntos: aplicar uno solo dejaría al
   * proceso en una combinación que la 3.1 no admitiría.
   */
  async revisarUmbral(em: EntityManager, proceso: Proceso, plan: PlanDeActualizacion) {
    if (plan.proceso.valorEstimado === undefined && plan.proceso.modalidad === undefined) return;
    const codigo = plan.proceso.modalidad ?? proceso.modalidad;
    const modalidad = codigo ? await em.findOne(Modalidad, { where: { codigo } }) : null;
    if (!modalidad) return;
    try {
      await this.umbrales.exigirModalidadPermitida(plan.proceso.valorEstimado ?? proceso.valorEstimado ?? 0, modalidad);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : MOTIVO_UMBRAL;
      for (const campo of plan.campos) {
        if (campo.aplicado && (campo.campo === 'valorEstimado' || campo.campo === 'modalidad')) {
          campo.aplicado = false;
          campo.motivo = `${MOTIVO_UMBRAL}: ${detalle}`;
          plan.origen[campo.campo] = campo.antes;
        }
      }
      delete plan.proceso.valorEstimado;
      delete plan.proceso.modalidad;
    }
  }

  private async aplicar(
    em: EntityManager,
    p: ProcesoAfectado,
    version: PaaVersion,
    anterior: PaaVersion,
    comparacion: PaaComparacion | null,
    acceso: HiringAccess,
  ) {
    if (p.tratamiento === 'SIN_CAMBIOS') {
      await em.update(Proceso, { id: p.procesoId }, { paaLineaId: p.lineaNuevaId });
      return;
    }

    if (p.tratamiento !== 'ELIMINADA' && p.plan) {
      await this.aplicarPlan(em, p.procesoId, p.plan, p.lineaNuevaId!, 'ACTUALIZACION', acceso, {
        codigo: p.codigo,
        versionAnterior: anterior.numero,
        versionNueva: version.numero,
      });
    }

    if (!p.revision) return;
    const motivo =
      p.revision.tipo === 'ELIMINACION'
        ? `La línea ${p.codigo} ya no está en la versión ${version.numero} del PAA. El proceso no avanza hasta que se decida si continúa o se cancela.`
        : `La línea ${p.codigo} cambió en la versión ${version.numero} del PAA en datos que usa el proceso.`;

    await this.abrirRevision(
      em,
      {
        procesoId: p.procesoId,
        comparacionId: comparacion?.id ?? null,
        versionAnteriorId: anterior.id,
        versionNuevaId: version.id,
        codigo: p.codigo,
        tipo: p.revision.tipo,
        cambios: p.cambios,
        motivo,
        bloquea: p.revision.bloquea,
        responsableId: p.abogado?.id ?? null,
        responsableNombre: p.abogado?.nombre ?? null,
      },
      version.numero,
      acceso,
    );
  }

  /**
   * Escribe en el proceso lo que dice un plan: proceso, 3.1, riel si cambió la
   * modalidad, la aplicación con su antes y después, y la traza.
   *
   * Lo usan la activación de una versión, y la migración y la devolución de una
   * revisión: las tres actualizan el proceso desde una línea, y tienen que
   * dejar el mismo rastro.
   */
  async aplicarPlan(
    em: EntityManager,
    procesoId: string,
    plan: PlanDeActualizacion,
    lineaDestinoId: string,
    tipo: 'ACTUALIZACION' | 'MIGRACION',
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
    referencia: Partial<Pick<Proceso, 'paaCodigo' | 'paaRegionId' | 'paaAnio'>> = {},
  ) {
    const proceso = await em.findOneOrFail(Proceso, { where: { id: procesoId } });
    const lineaOrigenId = proceso.paaLineaId;
    const modalidadAnterior = proceso.modalidad;
    Object.assign(proceso, plan.proceso, referencia, { paaLineaId: lineaDestinoId, paaOrigen: plan.origen });
    await em.save(Proceso, proceso);

    if (plan.proceso.modalidad && plan.proceso.modalidad !== modalidadAnterior) {
      await this.configuracion.reaplicarModalidad(em, procesoId, plan.proceso.modalidad);
    }
    if (Object.keys(plan.estudio).length) {
      const estudio = await em.findOneOrFail(ProcesoActividad, {
        where: { procesoId, numeral: NUMERAL_ESTUDIO_PREVIO },
      });
      estudio.datos = { ...estudio.datos, ...plan.estudio };
      // Quien tenga la 3.1 abierta tiene que recargar antes de guardar
      // encima de lo que acaba de traer el PAA.
      estudio.version += 1;
      await em.save(ProcesoActividad, estudio);
    }

    await em.save(PaaAplicacion, {
      procesoId,
      lineaOrigenId,
      lineaDestinoId,
      tipo,
      campos: plan.campos,
      aplicadoPor: acceso.userName,
    } as Partial<PaaAplicacion>);

    await this.admin.traza(
      em,
      'procesos',
      procesoId,
      tipo === 'MIGRACION' ? 'MIGRAR' : 'ACTUALIZAR_DESDE_PAA',
      acceso,
      {
        ...detalle,
        aplicados: plan.campos.filter((c) => c.aplicado).map((c) => c.campo),
        noAplicados: plan.campos.filter((c) => !c.aplicado).map((c) => c.campo),
      },
      procesoId,
    );
  }

  /**
   * Abre una revisión, salvo que esa misma versión ya le haya abierto una al
   * proceso: el índice único lo garantiza y `orIgnore` lo vuelve silencioso.
   */
  private async abrirRevision(
    em: EntityManager,
    datos: Partial<PaaRevision>,
    numeroVersion: number,
    acceso: HiringAccess,
  ): Promise<boolean> {
    const insertada = await em
      .createQueryBuilder()
      .insert()
      .into(PaaRevision)
      .values(datos)
      .orIgnore()
      .returning(['id'])
      .execute();

    const revisionId = insertada.raw?.[0]?.id;
    if (!revisionId) return false;
    await this.admin.traza(
      em,
      'paa_revisiones',
      revisionId,
      'ABRIR_REVISION_PAA',
      acceso,
      // `observaciones` es lo que el motor de avisos pone en el mensaje.
      { tipo: datos.tipo, codigo: datos.codigo, bloquea: datos.bloquea, version: numeroVersion, observaciones: datos.motivo },
      datos.procesoId!,
    );
    return true;
  }

  /** El abogado vigente de cada proceso: él decide la revisión. */
  async abogados(em: EntityManager, procesoIds: string[]) {
    if (!procesoIds.length) return new Map<string, { id: string | null; nombre: string }>();
    const filas: { proceso_id: string; usuario_id: string | null; usuario_nombre: string; nombre: string }[] =
      await em.query(
        `SELECT proceso_id, usuario_id::text AS usuario_id, usuario_nombre, nombre
           FROM hiring.participaciones_proceso
          WHERE proceso_id = ANY($1) AND papel = 'ABOGADO' AND estado = 'VIGENTE'`,
        [procesoIds],
      );
    return new Map(filas.map((f) => [f.proceso_id, { id: f.usuario_id, nombre: f.nombre || f.usuario_nombre }]));
  }
}

function contar(procesos: ProcesoAfectado[]) {
  const de = (t: Tratamiento) => procesos.filter((p) => p.tratamiento === t).length;
  return {
    procesos: procesos.length,
    sinCambios: de('SIN_CAMBIOS'),
    actualizados: de('ACTUALIZADO'),
    modificadosSinEfecto: de('MODIFICADA_SIN_EFECTO'),
    eliminados: de('ELIMINADA'),
    revisiones: procesos.filter((p) => p.revision).length,
    bloqueados: procesos.filter((p) => p.revision?.bloquea).length,
  };
}
