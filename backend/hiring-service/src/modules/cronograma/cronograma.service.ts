import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { ParametrosAlertaService } from '../alertas/parametros-alerta.service';
import {
  ETAPAS_DEL_CRONOGRAMA,
  estadoDeLaEtapa,
  NOMBRE_ETAPA,
  NUMERAL_CRONOGRAMA,
  SQL_ETAPA_CUMPLIDA,
} from './cronograma-etapas';
import {
  EtapaCronogramaDto,
  GuardarActividadesCronogramaDto,
  GuardarCronogramaDto,
} from './dto/cronograma.dto';
import {
  ActividadProgramada,
  CambioDeAdenda,
  cambiosDeFechas,
  FechasProgramadas,
  SQL_ACTIVIDAD_CUMPLIDA,
  validarActividades,
  validarCambiosDeAdenda,
} from './cronograma-actividades';

/**
 * Cronograma del proceso por etapas macro (5.2, migración 135).
 *
 * Opcional: la 5.2 se cumple con su soporte, como antes, y esto no la cierra
 * ni la bloquea. Lo que añade es una fecha de fin por etapa contra la que
 * alertar (alerta CRONOGRAMA_ETAPA).
 */
@Injectable()
export class CronogramaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly parametros: ParametrosAlertaService,
  ) {}

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  async estado(procesoId: string) {
    await this.exigirProceso(procesoId);

    const filas: any[] = await this.dataSource.query(
      `SELECT c.etapa, c.fecha_inicio::text AS fecha_inicio, c.fecha_fin::text AS fecha_fin,
              c.nota, c.updated_by, c.updated_at, ${SQL_ETAPA_CUMPLIDA} AS cumplida
         FROM hiring.cronograma_etapas c
         JOIN hiring.procesos p ON p.id = c.proceso_id
        WHERE c.proceso_id = $1`,
      [procesoId],
    );
    const { anticipacion_cronograma: anticipacion } = await this.parametros.valores();
    const hoy = this.hoy();

    return {
      anticipacion,
      /** El cronograma por actividad (138), con la alerta de cada una. */
      actividades: await this.actividades(procesoId, anticipacion, hoy),
      /** Los cambios de fechas, con la adenda que los originó si la hubo (138). */
      historial: await this.historial(procesoId),
      etapas: ETAPAS_DEL_CRONOGRAMA.map((etapa) => {
        const fila = filas.find((f) => Number(f.etapa) === etapa);
        const fechaFin: string | null = fila?.fecha_fin ?? null;
        return {
          etapa,
          nombre: NOMBRE_ETAPA[etapa],
          fechaInicio: (fila?.fecha_inicio as string | undefined) ?? null,
          fechaFin,
          nota: (fila?.nota as string | undefined) ?? null,
          actualizadoPor: (fila?.updated_by as string | undefined) ?? null,
          actualizadoAt: (fila?.updated_at as Date | undefined) ?? null,
          ...estadoDeLaEtapa(fechaFin, !!fila?.cumplida, hoy, anticipacion),
        };
      }),
    };
  }

  /**
   * Guarda el cronograma entero.
   *
   * Las etapas que llegan sin fecha de fin se quitan: dejarlas con solo el
   * inicio sería programar algo contra lo que no se puede alertar.
   */
  async guardar(procesoId: string, dto: GuardarCronogramaDto, acceso: HiringAccess) {
    await this.exigirProceso(procesoId);
    validarEtapas(dto.etapas);
    await this.exigirAdenda(procesoId, dto.adendaId);

    const conFecha = dto.etapas.filter((e) => !!e.fechaFin);

    await this.dataSource.transaction(async (em) => {
      const previas: any[] = await em.query(
        `SELECT etapa, fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
           FROM hiring.cronograma_etapas WHERE proceso_id = $1`,
        [procesoId],
      );
      await this.registrarCambios(
        em,
        procesoId,
        'ETAPA',
        new Map(previas.map((f) => [String(f.etapa), { fechaInicio: f.fecha_inicio, fechaFin: f.fecha_fin }])),
        new Map(conFecha.map((e) => [String(e.etapa), { fechaInicio: e.fechaInicio || null, fechaFin: e.fechaFin! }])),
        dto.adendaId ?? null,
        dto.motivo ?? null,
        acceso,
      );

      await em.query(
        `DELETE FROM hiring.cronograma_etapas
          WHERE proceso_id = $1 AND NOT (etapa = ANY($2::smallint[]))`,
        [procesoId, conFecha.map((e) => e.etapa)],
      );

      for (const e of conFecha) {
        await em.query(
          `INSERT INTO hiring.cronograma_etapas
                  (proceso_id, etapa, fecha_inicio, fecha_fin, nota, updated_by, updated_by_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (proceso_id, etapa) DO UPDATE
              SET fecha_inicio = EXCLUDED.fecha_inicio,
                  fecha_fin = EXCLUDED.fecha_fin,
                  nota = EXCLUDED.nota,
                  updated_by = EXCLUDED.updated_by,
                  updated_by_id = EXCLUDED.updated_by_id,
                  updated_at = now()`,
          [
            procesoId,
            e.etapa,
            e.fechaInicio || null,
            e.fechaFin,
            e.nota?.trim() || null,
            acceso.userName ?? null,
            acceso.userId || null,
          ],
        );
      }

      await em.query(
        `INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre, usuario_id)
         VALUES ($1::uuid, $1::uuid, 'cronograma_etapas', 'GUARDAR', $2::jsonb, $3, $4)`,
        [
          procesoId,
          JSON.stringify({
            actividad: NUMERAL_CRONOGRAMA,
            etapas: conFecha.map((e) => ({
              etapa: e.etapa,
              fechaInicio: e.fechaInicio || null,
              fechaFin: e.fechaFin,
            })),
          }),
          acceso.userName ?? null,
          acceso.userId || null,
        ],
      );
    });

    return this.estado(procesoId);
  }

  // ------------------------------------------- cronograma por actividad --

  /**
   * Las actividades de las etapas 5 a 10 que aplican al proceso, con su
   * programación si la tienen (138), y después las propias del proceso (139),
   * cada una en su etapa.
   */
  private async actividades(procesoId: string, anticipacionGeneral: number, hoy: string) {
    const catalogo = await CronogramaService.catalogo(this.dataSource, procesoId);
    const filas: any[] = await this.dataSource
      .query(
        `SELECT c.id::text AS id, c.numeral, c.nombre, c.etapa,
                c.fecha_inicio::text AS fecha_inicio, c.fecha_fin::text AS fecha_fin,
                c.dias_antes, c.avisar_a, c.canal, c.correos, c.nota, c.updated_by, c.updated_at,
                c.cumplida_at, c.cumplida_por, ${SQL_ACTIVIDAD_CUMPLIDA} AS cumplida
           FROM hiring.cronograma_actividades c
           JOIN hiring.procesos p ON p.id = c.proceso_id
          WHERE c.proceso_id = $1
          ORDER BY c.fecha_fin ASC, c.created_at ASC`,
        [procesoId],
      )
      // Sin la 138 y la 139 aplicadas no hay cronograma por actividad que mostrar.
      .catch(() => []);
    const porNumeral = new Map(filas.filter((f) => f.numeral).map((f) => [f.numeral, f]));

    const armar = (
      base: { id: string | null; numeral: string | null; nombre: string; etapa: number; propia: boolean },
      f: any | undefined,
    ) => {
      const fechaFin: string | null = f?.fecha_fin ?? null;
      const diasAntes = f?.dias_antes ?? null;
      return {
        ...base,
        fechaInicio: (f?.fecha_inicio as string | undefined) ?? null,
        fechaFin,
        diasAntes,
        avisarA: (f?.avisar_a as string[] | undefined) ?? [],
        canal: (f?.canal as string | undefined) ?? 'CAMPANA',
        correos: (f?.correos as string[] | undefined) ?? [],
        nota: (f?.nota as string | undefined) ?? null,
        actualizadoPor: (f?.updated_by as string | undefined) ?? null,
        actualizadoAt: (f?.updated_at as Date | undefined) ?? null,
        /** Solo las propias se marcan a mano (139); las del flujo lo derivan. */
        cumplidaAt: (f?.cumplida_at as Date | undefined) ?? null,
        cumplidaPor: (f?.cumplida_por as string | undefined) ?? null,
        ...estadoDeLaEtapa(fechaFin, !!f?.cumplida, hoy, diasAntes ?? anticipacionGeneral),
      };
    };

    const delFlujo = catalogo.map((a) =>
      armar(
        { id: null, numeral: a.numeral, nombre: a.nombre, etapa: Number(a.etapa), propia: false },
        porNumeral.get(a.numeral),
      ),
    );
    const propias = filas
      .filter((f) => !f.numeral)
      .map((f) => armar({ id: f.id, numeral: null, nombre: f.nombre, etapa: Number(f.etapa), propia: true }, f));

    // Orden estable: en cada etapa, primero las del flujo y luego las propias.
    return [...delFlujo, ...propias].sort((x, y) => x.etapa - y.etapa);
  }

  /** Los cambios de fechas del cronograma, del más reciente al primero (138). */
  private async historial(procesoId: string) {
    const filas: any[] = await this.dataSource
      .query(
        `SELECT h.ambito, h.clave, h.fecha_inicio_antes::text AS fecha_inicio_antes,
                h.fecha_fin_antes::text AS fecha_fin_antes, h.fecha_inicio_nueva::text AS fecha_inicio_nueva,
                h.fecha_fin_nueva::text AS fecha_fin_nueva, h.adenda_id, ad.numero AS adenda_numero,
                h.motivo, h.usuario_nombre, h.created_at,
                COALESCE(h.nombre, act.numeral || ' · ' || act.nombre) AS nombre
           FROM hiring.cronograma_cambios h
           LEFT JOIN hiring.adendas ad ON ad.id = h.adenda_id
           LEFT JOIN hiring.actividades act ON h.ambito = 'ACTIVIDAD' AND act.numeral = h.clave
          WHERE h.proceso_id = $1
          ORDER BY h.created_at DESC
          LIMIT 200`,
        [procesoId],
      )
      .catch(() => []);
    return filas.map((h) => ({
      ambito: h.ambito as 'ETAPA' | 'ACTIVIDAD',
      clave: h.clave as string,
      /** Cómo se lee: «Etapa 6 · …», «6.1 · …» o el nombre de la propia (139). */
      nombre:
        (h.nombre as string | null) ??
        (h.ambito === 'ETAPA' ? `Etapa ${h.clave} · ${NOMBRE_ETAPA[Number(h.clave)] ?? ''}` : (h.clave as string)),
      antes: { fechaInicio: h.fecha_inicio_antes, fechaFin: h.fecha_fin_antes },
      despues: { fechaInicio: h.fecha_inicio_nueva, fechaFin: h.fecha_fin_nueva },
      adenda: h.adenda_id ? { id: h.adenda_id as string, numero: h.adenda_numero as string | null } : null,
      motivo: h.motivo as string | null,
      usuario: h.usuario_nombre as string | null,
      fecha: h.created_at as Date,
    }));
  }

  /**
   * Guarda el cronograma por actividad entero (138).
   *
   * Como el de etapas: lo del flujo que llega sin fecha de fin se quita, y las
   * propias que no llegan se borran (139). Los cambios de fechas quedan en el
   * historial, con la adenda de cronograma que los originó si la hubo.
   */
  async guardarActividades(procesoId: string, dto: GuardarActividadesCronogramaDto, acceso: HiringAccess) {
    await this.exigirProceso(procesoId);
    await this.exigirAdenda(procesoId, dto.adendaId);
    const { anticipacion_cronograma: anticipacion } = await this.parametros.valores();
    const delProceso = await this.actividades(procesoId, anticipacion, this.hoy());
    validarActividades(
      dto.actividades,
      new Set(delProceso.filter((a) => !a.propia).map((a) => a.numeral!)),
      new Set(delProceso.filter((a) => a.propia).map((a) => a.id!)),
    );
    const nombreDelFlujo = new Map(delProceso.filter((a) => !a.propia).map((a) => [a.numeral!, a.nombre]));

    const delFlujo = dto.actividades.filter((a) => a.numeral && a.fechaFin);
    const propias = dto.actividades.filter((a) => !a.numeral);

    await this.dataSource.transaction(async (em) => {
      const previas: any[] = await em.query(
        `SELECT id::text AS id, numeral, nombre, fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
           FROM hiring.cronograma_actividades WHERE proceso_id = $1`,
        [procesoId],
      );
      const nombres = new Map<string, string>();
      for (const f of previas) {
        nombres.set(f.numeral ?? f.id, f.numeral ? `${f.numeral} · ${nombreDelFlujo.get(f.numeral) ?? ''}` : f.nombre);
      }

      await em.query(
        `DELETE FROM hiring.cronograma_actividades
          WHERE proceso_id = $1 AND numeral IS NOT NULL AND NOT (numeral = ANY($2::text[]))`,
        [procesoId, delFlujo.map((a) => a.numeral)],
      );
      await em.query(
        `DELETE FROM hiring.cronograma_actividades
          WHERE proceso_id = $1 AND numeral IS NULL AND NOT (id = ANY($2::uuid[]))`,
        [procesoId, propias.filter((a) => a.id).map((a) => a.id)],
      );

      const despues = new Map<string, FechasProgramadas>();
      for (const a of delFlujo) {
        await em.query(
          `INSERT INTO hiring.cronograma_actividades
                  (proceso_id, numeral, fecha_inicio, fecha_fin, dias_antes, avisar_a, canal, correos, nota,
                   updated_by, updated_by_id)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10, $11)
           ON CONFLICT (proceso_id, numeral) DO UPDATE
              SET fecha_inicio = EXCLUDED.fecha_inicio,
                  fecha_fin = EXCLUDED.fecha_fin,
                  dias_antes = EXCLUDED.dias_antes,
                  avisar_a = EXCLUDED.avisar_a,
                  canal = EXCLUDED.canal,
                  correos = EXCLUDED.correos,
                  nota = EXCLUDED.nota,
                  updated_by = EXCLUDED.updated_by,
                  updated_by_id = EXCLUDED.updated_by_id,
                  updated_at = now()`,
          [procesoId, a.numeral, a.fechaInicio || null, a.fechaFin, ...valoresDelAviso(a), ...quien(acceso)],
        );
        despues.set(a.numeral!, { fechaInicio: a.fechaInicio || null, fechaFin: a.fechaFin! });
        nombres.set(a.numeral!, `${a.numeral} · ${nombreDelFlujo.get(a.numeral!) ?? ''}`);
      }

      for (const a of propias) {
        const nombre = a.nombre!.trim();
        let id = a.id ?? null;
        if (id) {
          await em.query(
            `UPDATE hiring.cronograma_actividades
                SET nombre = $3, etapa = $4, fecha_inicio = $5, fecha_fin = $6, dias_antes = $7,
                    avisar_a = $8::jsonb, canal = $9, correos = $10::jsonb, nota = $11,
                    updated_by = $12, updated_by_id = $13, updated_at = now()
              WHERE id = $1 AND proceso_id = $2 AND numeral IS NULL`,
            [id, procesoId, nombre, a.etapa, a.fechaInicio || null, a.fechaFin, ...valoresDelAviso(a), ...quien(acceso)],
          );
        } else {
          const [nueva] = await em.query(
            `INSERT INTO hiring.cronograma_actividades
                    (proceso_id, nombre, etapa, fecha_inicio, fecha_fin, dias_antes, avisar_a, canal, correos, nota,
                     updated_by, updated_by_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12)
             RETURNING id::text AS id`,
            [procesoId, nombre, a.etapa, a.fechaInicio || null, a.fechaFin, ...valoresDelAviso(a), ...quien(acceso)],
          );
          id = nueva.id as string;
        }
        despues.set(id, { fechaInicio: a.fechaInicio || null, fechaFin: a.fechaFin! });
        nombres.set(id, nombre);
      }

      await this.registrarCambios(
        em,
        procesoId,
        'ACTIVIDAD',
        new Map(previas.map((f) => [f.numeral ?? f.id, { fechaInicio: f.fecha_inicio, fechaFin: f.fecha_fin }])),
        despues,
        dto.adendaId ?? null,
        dto.motivo ?? null,
        acceso,
        nombres,
      );

      await em.query(
        `INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre, usuario_id)
         VALUES ($1::uuid, $1::uuid, 'cronograma_actividades', 'GUARDAR', $2::jsonb, $3, $4)`,
        [
          procesoId,
          JSON.stringify({
            actividad: NUMERAL_CRONOGRAMA,
            actividades: [...despues.entries()].map(([clave, f]) => ({
              actividad: nombres.get(clave) ?? clave,
              fechaFin: f.fechaFin,
            })),
            ...(dto.adendaId ? { adenda: dto.adendaId } : {}),
          }),
          ...quien(acceso),
        ],
      );
    });

    return this.estado(procesoId);
  }

  /**
   * Marca o desmarca cumplida una actividad propia (139).
   *
   * Las del flujo no: se cumplen cuando la actividad se aprueba, y marcarlas a
   * mano dejaría el cronograma diciendo una cosa y el proceso otra.
   */
  async marcarCumplida(procesoId: string, actividadId: string, cumplida: boolean, acceso: HiringAccess) {
    await this.exigirProceso(procesoId);
    const [fila] = await this.dataSource.query(
      `SELECT numeral, nombre FROM hiring.cronograma_actividades WHERE id = $1 AND proceso_id = $2`,
      [actividadId, procesoId],
    );
    if (!fila) throw new NotFoundException('La actividad no está en el cronograma de este proceso');
    if (fila.numeral) {
      throw new BadRequestException(
        `La ${fila.numeral} es del flujo: se da por cumplida sola cuando se aprueba o queda como no aplica`,
      );
    }

    await this.dataSource.transaction(async (em) => {
      await em.query(
        `UPDATE hiring.cronograma_actividades
            SET cumplida_at = CASE WHEN $3 THEN now() END,
                cumplida_por = CASE WHEN $3 THEN $4 END,
                updated_at = now()
          WHERE id = $1 AND proceso_id = $2`,
        [actividadId, procesoId, cumplida, acceso.userName ?? null],
      );
      await em.query(
        `INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre, usuario_id)
         VALUES ($1::uuid, $2::uuid, 'cronograma_actividades', 'EDITAR', $3::jsonb, $4, $5)`,
        [
          procesoId,
          actividadId,
          JSON.stringify({ actividad: NUMERAL_CRONOGRAMA, propia: fila.nombre, cumplida }),
          ...quien(acceso),
        ],
      );
    });

    return this.estado(procesoId);
  }

  // ------------------------------------------------- cambios por adenda --

  /** Las actividades del flujo de las etapas 5 a 10 que aplican a la modalidad del proceso. */
  static async catalogo(
    em: Consultor,
    procesoId: string,
  ): Promise<{ numeral: string; nombre: string; etapa: number }[]> {
    return em.query(
      `SELECT a.numeral, a.nombre, a.etapa
         FROM hiring.actividades a
         JOIN hiring.procesos p ON p.id = $1
        WHERE a.activa AND a.etapa BETWEEN 5 AND 10
          AND NOT EXISTS (SELECT 1 FROM hiring.actividades_excluidas x
                           WHERE x.numeral = a.numeral AND x.modalidad = p.modalidad)
        ORDER BY a.etapa, a.orden`,
      [procesoId],
    );
  }

  /**
   * Revisa las fechas que trae una adenda de cronograma al emitirse (139) y
   * les pone el nombre con el que se van a mostrar.
   *
   * Cada una tiene que ser una etapa del cronograma, una actividad del flujo
   * del proceso o una propia que el proceso tenga. Una actividad del flujo
   * todavía sin programar vale: la adenda le pone fecha.
   */
  static async resolverCambiosDeAdenda(
    em: Consultor,
    procesoId: string,
    cambios: CambioDeAdenda[],
    mueveElCierre: boolean,
  ): Promise<CambioDeAdenda[]> {
    validarCambiosDeAdenda(cambios, mueveElCierre);
    if (!cambios.length) return [];

    const catalogo = await CronogramaService.catalogo(em, procesoId);
    const propias: { id: string; nombre: string }[] = await em.query(
      `SELECT id::text AS id, nombre FROM hiring.cronograma_actividades
        WHERE proceso_id = $1 AND numeral IS NULL`,
      [procesoId],
    );

    return cambios.map((c) => {
      let nombre: string;
      if (c.ambito === 'ETAPA') {
        const etapa = Number(c.clave);
        if (!(ETAPAS_DEL_CRONOGRAMA as readonly number[]).includes(etapa)) {
          throw new BadRequestException(`La etapa ${c.clave} no está en el cronograma: van de la 5 a la 10`);
        }
        nombre = `Etapa ${etapa} · ${NOMBRE_ETAPA[etapa]}`;
      } else {
        const delFlujo = catalogo.find((a) => a.numeral === c.clave);
        const propia = delFlujo ? null : propias.find((p) => p.id === c.clave);
        if (!delFlujo && !propia) {
          throw new BadRequestException(`${c.nombre ?? c.clave} no es una actividad del cronograma de este proceso`);
        }
        nombre = delFlujo ? `${delFlujo.numeral} · ${delFlujo.nombre}` : propia!.nombre;
      }
      return {
        ambito: c.ambito,
        clave: c.ambito === 'ETAPA' ? String(Number(c.clave)) : c.clave,
        nombre,
        fechaInicio: c.fechaInicio || null,
        fechaFin: c.fechaFin,
        antes: null,
      };
    });
  }

  /**
   * Aplica al cronograma las fechas de una adenda que se está publicando
   * (139), en la misma transacción de la publicación: una adenda publicada
   * cuyo cronograma no se movió diría una cosa y las alertas contarían otra.
   *
   * Sin fecha de inicio nueva se conserva la que había. Lo que no estaba
   * programado se programa, con el aviso por defecto (a quien la hace, por la
   * campanita). Devuelve los cambios con la fecha anterior de cada uno.
   */
  static async aplicarCambiosDeAdenda(
    em: Consultor,
    procesoId: string,
    cambios: CambioDeAdenda[],
    adenda: { id: string; numero: number },
    acceso: HiringAccess,
  ): Promise<CambioDeAdenda[]> {
    const aplicados: CambioDeAdenda[] = [];
    const motivo = `Adenda ${adenda.numero} de cronograma`;

    for (const c of cambios) {
      const propia = c.ambito === 'ACTIVIDAD' && !NUMERAL.test(c.clave);
      const [fila] =
        c.ambito === 'ETAPA'
          ? await em.query(
              `SELECT fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
                 FROM hiring.cronograma_etapas WHERE proceso_id = $1 AND etapa = $2`,
              [procesoId, Number(c.clave)],
            )
          : await em.query(
              `SELECT fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
                 FROM hiring.cronograma_actividades
                WHERE proceso_id = $1 AND ${propia ? 'id::text = $2 AND numeral IS NULL' : 'numeral = $2'}`,
              [procesoId, c.clave],
            );
      if (propia && !fila) {
        throw new ConflictException(
          `«${c.nombre}» ya no está en el cronograma: se quitó después de emitir la adenda. Anúlala y emite otra`,
        );
      }

      const inicio = c.fechaInicio || (fila?.fecha_inicio as string | null) || null;
      if (inicio && inicio > c.fechaFin) {
        throw new BadRequestException(
          `${c.nombre ?? c.clave}: con la nueva fecha de fin, el inicio (${inicio}) quedaría después. La adenda tiene que fijar también la fecha de inicio`,
        );
      }

      if (c.ambito === 'ETAPA') {
        await em.query(
          `INSERT INTO hiring.cronograma_etapas (proceso_id, etapa, fecha_inicio, fecha_fin, updated_by, updated_by_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (proceso_id, etapa) DO UPDATE
              SET fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin,
                  updated_by = EXCLUDED.updated_by, updated_by_id = EXCLUDED.updated_by_id, updated_at = now()`,
          [procesoId, Number(c.clave), inicio, c.fechaFin, ...quien(acceso)],
        );
      } else if (propia || fila) {
        await em.query(
          `UPDATE hiring.cronograma_actividades
              SET fecha_inicio = $3, fecha_fin = $4, updated_by = $5, updated_by_id = $6, updated_at = now()
            WHERE proceso_id = $1 AND ${propia ? 'id::text = $2 AND numeral IS NULL' : 'numeral = $2'}`,
          [procesoId, c.clave, inicio, c.fechaFin, ...quien(acceso)],
        );
      } else {
        // Del flujo y sin programar: la adenda le pone fecha, con el aviso por defecto.
        await em.query(
          `INSERT INTO hiring.cronograma_actividades
                  (proceso_id, numeral, fecha_inicio, fecha_fin, updated_by, updated_by_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [procesoId, c.clave, inicio, c.fechaFin, ...quien(acceso)],
        );
      }

      const antes = fila
        ? { fechaInicio: (fila.fecha_inicio as string | null) ?? null, fechaFin: fila.fecha_fin as string }
        : null;
      if (antes?.fechaInicio !== inicio || antes?.fechaFin !== c.fechaFin) {
        await em.query(
          `INSERT INTO hiring.cronograma_cambios
                  (proceso_id, ambito, clave, nombre, fecha_inicio_antes, fecha_fin_antes, fecha_inicio_nueva,
                   fecha_fin_nueva, adenda_id, motivo, usuario_nombre, usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            procesoId,
            c.ambito,
            c.clave,
            c.nombre ?? null,
            antes?.fechaInicio ?? null,
            antes?.fechaFin ?? null,
            inicio,
            c.fechaFin,
            adenda.id,
            motivo,
            ...quien(acceso),
          ],
        );
      }
      aplicados.push({ ...c, fechaInicio: inicio, antes });
    }

    return aplicados;
  }

  /**
   * Mueve la fecha de una actividad programada desde otro módulo: la adenda
   * de cronograma que prorroga el cierre de ofertas (6.1). Si la actividad no
   * estaba programada no hace nada: el cronograma es opcional.
   */
  static async moverPorAdenda(
    em: Consultor,
    procesoId: string,
    numeral: string,
    fechaFinNueva: string,
    adendaId: string,
    acceso: HiringAccess,
  ) {
    const [fila] = await em.query(
      `SELECT fecha_inicio::text AS fecha_inicio, fecha_fin::text AS fecha_fin
         FROM hiring.cronograma_actividades WHERE proceso_id = $1 AND numeral = $2`,
      [procesoId, numeral],
    );
    if (!fila || fila.fecha_fin === fechaFinNueva) return;
    await em.query(
      `UPDATE hiring.cronograma_actividades
          SET fecha_fin = $3, updated_by = $4, updated_by_id = $5, updated_at = now()
        WHERE proceso_id = $1 AND numeral = $2`,
      [procesoId, numeral, fechaFinNueva, ...quien(acceso)],
    );
    await em.query(
      `INSERT INTO hiring.cronograma_cambios
              (proceso_id, ambito, clave, nombre, fecha_inicio_antes, fecha_fin_antes, fecha_inicio_nueva,
               fecha_fin_nueva, adenda_id, motivo, usuario_nombre, usuario_id)
       VALUES ($1, 'ACTIVIDAD', $2,
               (SELECT numeral || ' · ' || nombre FROM hiring.actividades WHERE numeral = $2),
               $3, $4, $3, $5, $6, 'Prórroga del cierre por adenda de cronograma', $7, $8)`,
      [procesoId, numeral, fila.fecha_inicio, fila.fecha_fin, fechaFinNueva, adendaId, ...quien(acceso)],
    );
  }

  private async registrarCambios(
    em: Consultor,
    procesoId: string,
    ambito: 'ETAPA' | 'ACTIVIDAD',
    antes: Map<string, FechasProgramadas>,
    despues: Map<string, FechasProgramadas>,
    adendaId: string | null,
    motivo: string | null,
    acceso: HiringAccess,
    nombres: Map<string, string> = new Map(),
  ) {
    for (const c of cambiosDeFechas(antes, despues)) {
      await em.query(
        `INSERT INTO hiring.cronograma_cambios
                (proceso_id, ambito, clave, nombre, fecha_inicio_antes, fecha_fin_antes, fecha_inicio_nueva,
                 fecha_fin_nueva, adenda_id, motivo, usuario_nombre, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          procesoId,
          ambito,
          c.clave,
          nombres.get(c.clave) ??
            (ambito === 'ETAPA' ? `Etapa ${c.clave} · ${NOMBRE_ETAPA[Number(c.clave)] ?? ''}` : null),
          c.antes?.fechaInicio ?? null,
          c.antes?.fechaFin ?? null,
          c.despues?.fechaInicio ?? null,
          c.despues?.fechaFin ?? null,
          adendaId,
          motivo?.trim() || null,
          ...quien(acceso),
        ],
      );
    }
  }

  /** La adenda que se cita tiene que ser de cronograma, del proceso y publicada. */
  private async exigirAdenda(procesoId: string, adendaId?: string) {
    if (!adendaId) return;
    const [adenda] = await this.dataSource.query(
      `SELECT tipo, estado FROM hiring.adendas WHERE id = $1 AND proceso_id = $2`,
      [adendaId, procesoId],
    );
    if (!adenda || adenda.tipo !== 'CRONOGRAMA' || adenda.estado !== 'PUBLICADA') {
      throw new BadRequestException('La adenda que origina el cambio tiene que ser de cronograma, de este proceso y publicada');
    }
  }

  private async exigirProceso(procesoId: string) {
    const [proceso] = await this.dataSource.query(`SELECT id FROM hiring.procesos WHERE id = $1`, [
      procesoId,
    ]);
    if (!proceso) throw new NotFoundException('El proceso no existe');
  }
}

/** Lo que el formulario no puede mandar aunque cada campo sea válido por sí solo. */
export function validarEtapas(etapas: EtapaCronogramaDto[]) {
  const vistas = new Set<number>();
  for (const e of etapas) {
    if (vistas.has(e.etapa)) {
      throw new BadRequestException(`La etapa ${e.etapa} viene dos veces`);
    }
    vistas.add(e.etapa);
    if (e.fechaInicio && !e.fechaFin) {
      throw new BadRequestException(
        `Etapa ${e.etapa}: falta la fecha de fin, que es contra la que se alerta`,
      );
    }
    if (e.fechaInicio && e.fechaFin && e.fechaInicio > e.fechaFin) {
      throw new BadRequestException(
        `Etapa ${e.etapa}: la fecha de inicio no puede ser posterior a la de fin`,
      );
    }
  }
}

/** Lo que tienen en común el DataSource y el EntityManager de una transacción. */
type Consultor = { query: (sql: string, params?: unknown[]) => Promise<any> };

/** El numeral de una actividad del flujo; una propia se identifica por su id. */
const NUMERAL = /^\d+\.\d+(\.\d+)?$/;

/** Los campos del aviso de una actividad, en el orden de los INSERT y UPDATE. */
function valoresDelAviso(a: ActividadProgramada) {
  return [
    a.diasAntes ?? null,
    JSON.stringify(a.avisarA ?? []),
    a.canal || 'CAMPANA',
    JSON.stringify((a.correos ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean)),
    a.nota?.trim() || null,
  ];
}

/** Quien hace el cambio, para las columnas de autoría. */
function quien(acceso: HiringAccess) {
  return [acceso.userName ?? null, acceso.userId || null];
}
