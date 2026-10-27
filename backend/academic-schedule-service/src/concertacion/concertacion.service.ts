import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { nivelDeProgramaTipo, type NivelAcademico } from '../catalogo/nivel-academico.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import {
  PERMISO_APROBAR,
  PERMISO_APROBAR_TERRITORIAL,
  PTA_APPROVE_ALL,
  PTA_REVIEW_ALL,
  REVISIONES_REQUERIDAS,
  concertacionHabilitada,
  desdePeriodo,
  firmaSimulada,
  periodoEnCorte,
} from './configuracion.js';
import { ContratoPtaClient } from './contrato-pta.client.js';
import { contextoFirma, huellaDe, verificarCodigo, type RolFirma } from './firma.js';
import { decide, normalizarSeccional, PermisosPtaService, type ContextoTerritorial, type PermisoPta } from './permisos-pta.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';

/** APROBADA: solo filas del orden anterior. Diagrama: INTEGRACION-claude.md §23.1. */
export type EstadoConcertacion = 'ENVIADA' | 'REVISADA' | 'POR_ACEPTAR' | 'ACEPTADA' | 'NOVEDAD' | 'DEVUELTA' | 'APROBADA';

/** Tipos de novedad que puede reportar el docente (EFDS-2374). */
export const TIPOS_NOVEDAD = ['investigacion', 'movilidad', 'perfil', 'otra'] as const;

/** Estados en los que la foto está en manos de otros: sus franjas no se reasignan. */
export const ESTADOS_EN_CURSO: readonly EstadoConcertacion[] = ['ENVIADA', 'REVISADA', 'POR_ACEPTAR'];

/** Estados que el docente ve en «Mi programación»: lo anterior es interno. */
const ESTADOS_DEL_DOCENTE: readonly EstadoConcertacion[] = ['POR_ACEPTAR', 'ACEPTADA', 'NOVEDAD', 'APROBADA'];

interface FilaConcertacion {
  id_concertacion: string;
  id_docente: string;
  periodo_ref: string;
  nivel: NivelAcademico;
  estado: EstadoConcertacion;
  horas: string;
  franjas: Array<{ idFranja: string; idGrupo: string; codigoAsignatura: string; asignatura: string; horas: number }>;
  huella: string;
}

/**
 * Concertación de la docencia — EFDS-2315, en el ORDEN NUEVO de EFDS-2374 (HU EFDS-2371).
 *
 *   1. el PROGRAMADOR envía lo asignado al docente            → ENVIADA
 *   2. los REVISORES requeridos revisan y firman             → REVISADA
 *   3. el APROBADOR aprueba y firma                           → POR_ACEPTAR
 *   4. el DOCENTE acepta y firma                              → ACEPTADA → franjas APROBADA → PTA
 *      o reporta una NOVEDAD (tipo + justificación)           → NOVEDAD (vuelve al programador)
 *   (2 o 3) revisor o aprobador pueden DEVOLVER con comentario → DEVUELTA (vuelve al programador)
 * El docente no modifica nada: acepta o reporta. Diagrama: INTEGRACION-claude.md §23.1.
 * Una concertación por (docente, periodo, nivel): pregrado y posgrado se
 * deciden por separado, como `academica_pregrado`/`academica_posgrado` del PTA.
 *
 * Lo firmado es la FOTO de la docencia al enviar (franjas y horas, con su
 * huella). Si las franjas cambian antes de aprobar o aceptar, se rechaza y hay
 * que volver a enviar: nadie aprueba ni acepta algo distinto de lo enviado.
 *
 * ⚠️ Apagada por defecto (configuracion.ts): toda escritura se rechaza.
 */
@Injectable()
export class ConcertacionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly docencia: DocenciaService,
    private readonly contratoPta: ContratoPtaClient,
    private readonly territorial: TerritorialService,
    private readonly permisosPta: PermisosPtaService,
  ) {}

  /** Caché corta del interruptor del PTA: no se consulta en cada petición. */
  private ptaCache: { valor: boolean; en: number } | null = null;

  /**
   * ¿Está encendida en los DOS lados? Solo si aquí lo está se consulta al PTA.
   * Lanza si el PTA no responde: el llamador decide (fallar cerrado).
   */
  private async habilitadaEnAmbos(): Promise<boolean> {
    if (!concertacionHabilitada()) return false;
    const ahora = Date.now();
    if (this.ptaCache && ahora - this.ptaCache.en < 30_000) return this.ptaCache.valor;
    const valor = await this.contratoPta.ptaHabilitada();
    this.ptaCache = { valor, en: ahora };
    return valor;
  }

  /** Configuración EFECTIVA: encendida solo si lo está en los dos servicios. */
  async configuracion() {
    let habilitada = false;
    let motivo: string | null = null;
    if (!concertacionHabilitada()) {
      motivo = 'Apagada en Programación Académica.';
    } else {
      try {
        habilitada = await this.habilitadaEnAmbos();
        if (!habilitada) motivo = 'Encendida aquí pero apagada en el PTA: el PTA sigue aprobando la Docencia.';
      } catch (e: any) {
        motivo = `No se pudo verificar el PTA: ${e?.message ?? e}`;
      }
    }
    return {
      habilitada,
      motivo,
      desdePeriodo: desdePeriodo(),
      firmaSimulada: firmaSimulada(),
      revisionesRequeridas: REVISIONES_REQUERIDAS.map((r) => r.tipo),
    };
  }

  /** Toda escritura exige el régimen nuevo encendido en ambos lados. */
  private async exigirHabilitada(): Promise<void> {
    let ok = false;
    try { ok = await this.habilitadaEnAmbos(); }
    catch (e: any) {
      throw new ConflictException(`No se pudo verificar que el PTA tenga la concertación encendida: ${e?.message ?? e}`);
    }
    if (!ok) {
      throw new ConflictException(
        'La concertación de la docencia está apagada: el PTA todavía aprueba la Docencia.',
      );
    }
  }

  /** Código del periodo (plataforma); null si es legado o no existe. */
  private async codigoPeriodo(periodoRef: string): Promise<string | null> {
    if (!/^\d+$/.test(periodoRef)) return null;
    const f = await this.dataSource.query(
      `SELECT codigo FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [periodoRef]);
    return f[0]?.codigo ?? null;
  }

  // ── Docente ────────────────────────────────────────────────────────────────

  /**
   * «Mi programación» (EFDS-2374): las concertaciones del docente desde que se
   * aprobaron por dentro. ENVIADA, REVISADA y DEVUELTA son internas y no aparecen.
   */
  async delDocente(idDocente: string, periodoRef: string) {
    return this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.nivel, c.estado, c.horas::float AS horas,
              c.franjas, c.comentario, c.updated_at AS "actualizadaEn",
              (SELECT json_build_object('tipo', n.tipo, 'justificacion', n.justificacion, 'creadaEn', n.creada_en)
                 FROM "academic-schedule".concertacion_novedad n
                WHERE n.id_concertacion = c.id_concertacion AND n.huella = c.huella
                ORDER BY n.creada_en DESC LIMIT 1) AS novedad,
              (SELECT COALESCE(json_agg(json_build_object('rol', f.rol, 'firmadoEn', f.firmado_en, 'modoOtp', f.modo_otp)
                        ORDER BY f.firmado_en), '[]'::json)
                 FROM "academic-schedule".concertacion_firma f WHERE f.id_concertacion = c.id_concertacion) AS firmas
         FROM "academic-schedule".concertacion_docencia c
        WHERE c.id_docente = $1 AND c.periodo_ref = $2 AND c.estado = ANY($3::text[])
        ORDER BY c.nivel`,
      [idDocente, periodoRef, ESTADOS_DEL_DOCENTE],
    );
  }

  /**
   * Concertaciones de los niveles que el programador asigna, con lo que le
   * devolvieron (comentario) o le reportó el docente (novedad).
   */
  async delProgramador(niveles: readonly NivelAcademico[], periodoRef: string) {
    return this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.nivel, c.estado, c.horas::float AS horas,
              p.num_identificacion AS documento, p.nom_largo AS docente,
              jsonb_array_length(c.franjas) AS "numFranjas", c.comentario, c.updated_at AS "actualizadaEn",
              (SELECT json_build_object('tipo', n.tipo, 'justificacion', n.justificacion, 'creadaEn', n.creada_en)
                 FROM "academic-schedule".concertacion_novedad n
                WHERE n.id_concertacion = c.id_concertacion AND n.atendida_en IS NULL
                ORDER BY n.creada_en DESC LIMIT 1) AS novedad
         FROM "academic-schedule".concertacion_docencia c
         JOIN auth.personas p ON p.id_person = c.id_docente
        WHERE c.periodo_ref = $1 AND c.nivel = ANY($2::text[])
        ORDER BY (c.estado IN ('NOVEDAD', 'DEVUELTA')) DESC, c.updated_at DESC`,
      [periodoRef, niveles],
    );
  }

  /**
   * El PROGRAMADOR envía a revisión lo asignado al docente en el periodo (EFDS-2374):
   * una concertación por nivel con docencia, en los niveles que él asigna. Se puede
   * reenviar desde DEVUELTA o NOVEDAD (la novedad queda atendida). Sin firma: firman
   * el aprobador y, al final, el docente.
   */
  async enviar(
    programador: { idUser: string; niveles: readonly NivelAcademico[] },
    documento: string,
    periodoRef: string,
    token: string | null,
  ) {
    await this.exigirHabilitada();
    const filasDocente = await this.dataSource.query(
      `SELECT p.id_person::text AS "idPerson", d."tipoVinculacion" AS vinculacion
         FROM auth.personas p
         JOIN academic_work_plan."Docente" d ON d."personaId" = p.id_person
        WHERE p.num_identificacion = $1
        ORDER BY d."updatedAt" DESC NULLS LAST LIMIT 1`, [String(documento ?? '').trim()]);
    if (!filasDocente.length) throw new NotFoundException(`No existe un docente con documento ${documento} en el RUND.`);
    const docente = { idPerson: filasDocente[0].idPerson as string, vinculacion: (filasDocente[0].vinculacion ?? null) as string | null };

    // Solo en el corte: en un periodo anterior (o legado) la Docencia la sigue
    // aprobando el PTA, y concertarla aquí sería doble aprobación.
    const codigoPeriodo = await this.codigoPeriodo(periodoRef);
    if (!periodoEnCorte(codigoPeriodo)) {
      throw new ConflictException(
        `La concertación aplica desde el periodo ${desdePeriodo()}. En ${codigoPeriodo ?? 'este periodo'} la Docencia la aprueba el PTA.`);
    }

    // El PTA exige las fechas del ciclo de cada asignatura: sin ciclo no se envía.
    const sinCiclo = await this.dataSource.query(
      `SELECT DISTINCT a.nombre
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
        WHERE f.id_docente = $1 AND f.estado = 'TOMADA'
          AND COALESCE(g.id_periodo_academico::text, g.id_periodo::text) = $2
          AND (g.fecha_inicio IS NULL OR g.fecha_fin IS NULL)`,
      [docente.idPerson, periodoRef]);
    if (sinCiclo.length) {
      throw new ConflictException(
        `Defina el ciclo (fechas) del grupo antes de enviar: ${sinCiclo.map((x: any) => x.nombre).join(', ')}.`);
    }

    // EFDS-2315: el PTA decide el aprobador por la territorial de cada asignatura,
    // que sale de la oferta CETAP del grupo. Sin oferta (o sin territorial que
    // cruce), o con un aula presencial de otro CETAP, no se concerta: falla cerrado.
    const sinDonde: Array<{ nombre: string; numero: number; motivo: string }> = await this.dataSource.query(
      `SELECT DISTINCT a.nombre, g.numero_grupo AS numero,
              CASE WHEN g.id_oferta_cetap IS NULL THEN 'sin oferta CETAP'
                   WHEN dt.codigo IS NULL
                     OR (SELECT COUNT(*) FROM auth.seccionales sc WHERE sc.cod_seccional = dt.codigo) <> 1
                     THEN 'su CETAP no tiene territorial'
                   ELSE 'aula de otro CETAP' END AS motivo
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         LEFT JOIN academic_work_plan.oferta_cetap_programa o ON o.id = g.id_oferta_cetap
         LEFT JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
         LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
        WHERE f.id_docente = $1 AND f.estado = 'TOMADA'
          AND COALESCE(g.id_periodo_academico::text, g.id_periodo::text) = $2
          AND (g.id_oferta_cetap IS NULL
               OR dt.codigo IS NULL
               OR (SELECT COUNT(*) FROM auth.seccionales sc WHERE sc.cod_seccional = dt.codigo) <> 1
               OR EXISTS (SELECT 1 FROM "academic-schedule".franja_horaria f2
                            JOIN "academic-schedule".aula au ON au.codigo = f2.aula_codigo
                           WHERE f2.id_grupo = g.id_grupo AND f2.tipo_sesion = 'presencial'
                             AND au.codigo_cetap IS DISTINCT FROM c.codigo))`,
      [docente.idPerson, periodoRef]);
    if (sinDonde.length) {
      throw new ConflictException(
        'No se puede concertar sin saber dónde se dicta cada grupo (de ahí sale quién aprueba): '
        + sinDonde.map((x) => `${x.nombre} grupo ${x.numero} (${x.motivo})`).join('; ') + '.');
    }

    const devueltas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE f.id_docente = $1 AND f.estado = 'DEVUELTA'
          AND COALESCE(g.id_periodo_academico::text, g.id_periodo::text) = $2`,
      [docente.idPerson, periodoRef]);
    if (devueltas[0].n > 0) {
      throw new ConflictException(
        `El docente tiene ${devueltas[0].n} franja(s) devuelta(s) del flujo anterior en este periodo: reasígnelas antes de enviar.`);
    }

    // Solo los niveles que el programador asigna (RN-08): pregrado no envía posgrado.
    const fotos = new Map([...(await this.fotoPorNivel(docente.idPerson, docente.vinculacion, periodoRef, token))]
      .filter(([nivel]) => programador.niveles.includes(nivel)));
    if (fotos.size === 0) {
      throw new BadRequestException('El docente no tiene docencia asignada en este periodo en los niveles que usted asigna.');
    }

    await this.dataSource.transaction(async (m) => {
      for (const [nivel, foto] of fotos) {
        const previa: FilaConcertacion[] = await m.query(
          `SELECT * FROM "academic-schedule".concertacion_docencia
            WHERE id_docente = $1 AND periodo_ref = $2 AND nivel = $3 FOR UPDATE`,
          [docente.idPerson, periodoRef, nivel]);
        if (previa.length && !['DEVUELTA', 'NOVEDAD'].includes(previa[0].estado)) {
          throw new ConflictException(
            `La docencia de ${nivel} de este periodo ya fue enviada (estado ${previa[0].estado}).`);
        }
        const huella = huellaDe({ docente: docente.idPerson, periodo: periodoRef, nivel, franjas: foto.franjas });
        let id: string;
        if (previa.length) {
          id = previa[0].id_concertacion;
          await m.query(
            `UPDATE "academic-schedule".concertacion_docencia
                SET estado = 'ENVIADA', horas = $2, franjas = $3::jsonb, huella = $4, comentario = NULL, enviada_por = $5,
                    notificada_pta_en = NULL, error_notificacion = NULL, updated_at = NOW()
              WHERE id_concertacion = $1`,
            [id, foto.horas, JSON.stringify(foto.franjas), huella, programador.idUser]);
          await m.query(`DELETE FROM "academic-schedule".concertacion_revision WHERE id_concertacion = $1`, [id]);
          // Reenviar es atender la novedad: vuelve a pasar por revisión con la foto nueva.
          await m.query(
            `UPDATE "academic-schedule".concertacion_novedad SET atendida_en = NOW(), atendida_por = $2
              WHERE id_concertacion = $1 AND atendida_en IS NULL`, [id, programador.idUser]);
        } else {
          const r = await m.query(
            `INSERT INTO "academic-schedule".concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella, enviada_por)
             VALUES ($1, $2, $3, 'ENVIADA', $4, $5::jsonb, $6, $7) RETURNING id_concertacion`,
            [docente.idPerson, periodoRef, nivel, foto.horas, JSON.stringify(foto.franjas), huella, programador.idUser]);
          id = r[0].id_concertacion;
        }
        await this.historial(m, id, 'ENVIAR', previa[0]?.estado ?? null, 'ENVIADA', programador.idUser, null);
      }
    });
    return this.delProgramador(programador.niveles, periodoRef);
  }

  /** Foto de la docencia TOMADA del docente en el periodo, separada por nivel. */
  private async fotoPorNivel(idDocente: string, vinculacion: string | null, periodoRef: string, token: string | null) {
    const grupos = (await this.docencia.porGrupo(idDocente, vinculacion, token))
      .filter((g) => g.idPeriodo === periodoRef);
    const fotos = new Map<NivelAcademico, { horas: number; franjas: FilaConcertacion['franjas'] }>();
    if (!grupos.length) return fotos;

    const franjas: Array<{ idFranja: string; idGrupo: string; tipo: string }> = await this.dataSource.query(
      `SELECT f.id_franja::text AS "idFranja", f.id_grupo::text AS "idGrupo", pr.tipo
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g     ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         JOIN academic_work_plan.programa pr  ON pr.id = a.id_programa
        WHERE f.id_docente = $1 AND f.estado = 'TOMADA' AND f.id_grupo = ANY($2::uuid[])
        ORDER BY f.id_franja`,
      [idDocente, grupos.map((g) => g.idGrupo)]);

    for (const g of grupos) {
      const delGrupo = franjas.filter((f) => f.idGrupo === g.idGrupo);
      if (!delGrupo.length) continue; // ya aprobadas o sin tomar: no entran a esta foto
      const nivel = nivelDeProgramaTipo(delGrupo[0].tipo);
      const foto = fotos.get(nivel) ?? { horas: 0, franjas: [] };
      for (const f of delGrupo) {
        foto.franjas.push({
          idFranja: f.idFranja, idGrupo: g.idGrupo, codigoAsignatura: g.codigoAsignatura,
          asignatura: g.asignatura, horas: Math.round((g.horas / delGrupo.length) * 10) / 10,
        });
      }
      foto.horas = Math.round((foto.horas + g.horas) * 10) / 10;
      fotos.set(nivel, foto);
    }
    return fotos;
  }

  // ── Revisores y aprobadores (roles del PTA) ────────────────────────────────

  /**
   * Qué puede hacer el usuario con la docencia de un nivel: los permisos del PTA
   * y su alcance personal, con la misma regla del PTA (permisos-pta.service.ts).
   */
  private puede(permisos: readonly PermisoPta[], nivel: NivelAcademico, ctx: ContextoTerritorial) {
    // Como el PTA (clasificarAsignaturasDocencia): una asignatura de una Dirección
    // Territorial (seccional que no es Sede Central) va a academica_territorial,
    // con sus propios permisos; el resto, al componente de su nivel. Quien decide
    // debe poder decidir CADA parte que trae la concertación.
    const esTerritorial = (t: string | null) => !!t && normalizarSeccional(ctx.nombres.get(t)) !== 'sedecentral';
    const parte = (territorial: boolean): ContextoTerritorial => ({
      ...ctx, territorialesAsignaturas: ctx.territorialesAsignaturas.filter((t) => esTerritorial(t) === territorial),
    });
    const partes = [false, true].filter((territorial) => parte(territorial).territorialesAsignaturas.length > 0);
    if (!partes.length) partes.push(false);
    const decidePartes = (codigo: (territorial: boolean) => string, todos: string) =>
      partes.every((territorial) => decide(permisos, [codigo(territorial), todos], parte(territorial)));
    const revisar = REVISIONES_REQUERIDAS
      .filter((r) => decidePartes((t) => (t ? r.permisoTerritorial : r.permiso)[nivel], PTA_REVIEW_ALL))
      .map((r) => r.tipo);
    const aprobar = decidePartes((t) => (t ? PERMISO_APROBAR_TERRITORIAL : PERMISO_APROBAR)[nivel], PTA_APPROVE_ALL);
    return { revisar, aprobar, devolver: revisar.length > 0 || aprobar };
  }

  /** Territorial de cada asignatura (grupo) concertada y la del usuario, como en el PTA. */
  private async contexto(franjas: FilaConcertacion['franjas'], seccionalesUsuario: readonly string[]): Promise<ContextoTerritorial> {
    const porGrupo = await this.territorial.territorialesDeGrupos([...new Set(franjas.map((f) => f.idGrupo))]);
    const territorialesAsignaturas = [...porGrupo.values()];
    const nombres = await this.permisosPta.nombresDeSeccionales(
      [...seccionalesUsuario, ...territorialesAsignaturas.filter((t): t is string => !!t)]);
    return { seccionalesUsuario, territorialesAsignaturas, nombres };
  }

  /** Bandeja: concertaciones por decidir en los niveles donde el usuario decide. */
  async bandeja(permisos: readonly PermisoPta[], idUser: string, periodoRef?: string) {
    const filas = await this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.periodo_ref AS "idPeriodo", c.nivel, c.estado,
              (SELECT COALESCE(
                 (SELECT pa.codigo FROM academic_work_plan.periodo_academico pa WHERE pa.id::text = c.periodo_ref),
                 (SELECT pp.codigo FROM "academic-schedule".periodo_programacion pp WHERE pp.id_periodo::text = c.periodo_ref))
              ) AS "periodoCodigo",
              c.horas::float AS horas, jsonb_array_length(c.franjas) AS "numFranjas", c.franjas,
              p.nom_largo AS docente, p.num_identificacion AS documento, c.updated_at AS "actualizadaEn",
              (SELECT COALESCE(array_agg(r.tipo), '{}') FROM "academic-schedule".concertacion_revision r
                WHERE r.id_concertacion = c.id_concertacion) AS revisiones,
              -- Registro de firmas (rol, cuándo, modo del código): el revisor y el aprobador ven quién firmó antes.
              (SELECT COALESCE(json_agg(json_build_object('rol', f.rol, 'firmadoEn', f.firmado_en, 'modoOtp', f.modo_otp)
                        ORDER BY f.firmado_en), '[]'::json)
                 FROM "academic-schedule".concertacion_firma f WHERE f.id_concertacion = c.id_concertacion) AS firmas
         FROM "academic-schedule".concertacion_docencia c
         JOIN auth.personas p ON p.id_person = c.id_docente
        WHERE c.estado IN ('ENVIADA', 'REVISADA')
          AND ($1::text IS NULL OR c.periodo_ref = $1)
        ORDER BY c.updated_at`,
      [periodoRef ?? null]);
    const seccionales = await this.permisosPta.seccionalesDeUsuario(idUser);
    const visibles: any[] = [];
    for (const f of filas) {
      const puede = this.puede(permisos, f.nivel, await this.contexto(f.franjas, seccionales));
      if (puede.devolver) visibles.push({ ...f, puede });
    }
    return visibles;
  }

  private async cargar(m: EntityManager, id: string): Promise<FilaConcertacion> {
    const filas = await m.query(
      `SELECT * FROM "academic-schedule".concertacion_docencia WHERE id_concertacion = $1 FOR UPDATE`, [id]);
    if (!filas.length) throw new NotFoundException('La concertación no existe.');
    return filas[0];
  }

  async revisar(id: string, tipo: string, idUser: string, permisos: readonly PermisoPta[], codigo: unknown) {
    await this.exigirHabilitada();
    const modo = verificarCodigo(codigo);
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargar(m, id);
      if (c.estado !== 'ENVIADA') throw new ConflictException(`No se puede revisar: la concertación está ${c.estado}.`);
      const ctx = await this.contexto(c.franjas, await this.permisosPta.seccionalesDeUsuario(idUser));
      if (!this.puede(permisos, c.nivel, ctx).revisar.includes(tipo as any)) {
        throw new ForbiddenException(`No tiene permiso para la revisión ${tipo} de ${c.nivel}.`);
      }
      const hecha = await m.query(
        `INSERT INTO "academic-schedule".concertacion_revision (id_concertacion, tipo, id_user)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING tipo`, [id, tipo, idUser]);
      if (!hecha.length) throw new ConflictException(`La revisión ${tipo} ya fue hecha.`);
      await this.firmar(m, id, 'revisor', idUser, c.huella, modo);

      const hechas: string[] = (await m.query(
        `SELECT tipo FROM "academic-schedule".concertacion_revision WHERE id_concertacion = $1`, [id])).map((r: any) => r.tipo);
      const completa = REVISIONES_REQUERIDAS.every((r) => hechas.includes(r.tipo));
      if (completa) {
        await m.query(`UPDATE "academic-schedule".concertacion_docencia SET estado = 'REVISADA', updated_at = NOW() WHERE id_concertacion = $1`, [id]);
      }
      await this.historial(m, id, `REVISAR_${tipo.toUpperCase()}`, c.estado, completa ? 'REVISADA' : c.estado, idUser, null);
    });
    return this.detalle(id);
  }

  async devolver(id: string, idUser: string, permisos: readonly PermisoPta[], comentario: unknown) {
    await this.exigirHabilitada();
    const texto = String(comentario ?? '').trim();
    if (!texto) throw new BadRequestException('Para devolver debe explicar el motivo.');
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargar(m, id);
      if (!['ENVIADA', 'REVISADA'].includes(c.estado)) throw new ConflictException(`No se puede devolver: la concertación está ${c.estado}.`);
      const ctx = await this.contexto(c.franjas, await this.permisosPta.seccionalesDeUsuario(idUser));
      if (!this.puede(permisos, c.nivel, ctx).devolver) throw new ForbiddenException(`No tiene permiso para decidir la docencia de ${c.nivel}.`);
      // Vuelve al PROGRAMADOR (EFDS-2374), no al docente: las franjas siguen TOMADA con
      // su docente y el programador decide qué cambia antes de reenviar.
      await m.query(
        `UPDATE "academic-schedule".concertacion_docencia SET estado = 'DEVUELTA', comentario = $2, updated_at = NOW()
          WHERE id_concertacion = $1`, [id, texto]);
      await this.historial(m, id, 'DEVOLVER', c.estado, 'DEVUELTA', idUser, texto);
    });
    return this.detalle(id);
  }

  async aprobar(id: string, idUser: string, permisos: readonly PermisoPta[], codigo: unknown) {
    await this.exigirHabilitada();
    const modo = verificarCodigo(codigo);
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargar(m, id);
      if (c.estado !== 'REVISADA') throw new ConflictException(`No se puede aprobar: la concertación está ${c.estado} (requiere las revisiones).`);
      const ctx = await this.contexto(c.franjas, await this.permisosPta.seccionalesDeUsuario(idUser));
      if (!this.puede(permisos, c.nivel, ctx).aprobar) throw new ForbiddenException(`No tiene permiso para aprobar la docencia de ${c.nivel}.`);

      // Lo que se aprueba es lo que envió el programador: si las franjas cambiaron, no.
      await this.exigirFotoVigente(m, c);
      // Aprobada por dentro: ahora la ve el docente para aceptarla (EFDS-2374). Las
      // franjas pasan a APROBADA y la decisión va al PTA solo cuando el docente acepta.
      await m.query(`UPDATE "academic-schedule".concertacion_docencia SET estado = 'POR_ACEPTAR', updated_at = NOW() WHERE id_concertacion = $1`, [id]);
      await this.firmar(m, id, 'aprobador', idUser, c.huella, modo);
      await this.historial(m, id, 'APROBAR', c.estado, 'POR_ACEPTAR', idUser, null);
    });
    return this.detalle(id);
  }

  /** Las franjas de la foto siguen con el mismo docente y TOMADA; si no, hay que reenviar. */
  private async exigirFotoVigente(m: EntityManager, c: FilaConcertacion): Promise<void> {
    const ids = c.franjas.map((f) => f.idFranja);
    const vigentes = await m.query(
      `SELECT COUNT(*)::int AS n FROM "academic-schedule".franja_horaria
        WHERE id_franja = ANY($1::uuid[]) AND id_docente = $2 AND estado = 'TOMADA'`, [ids, c.id_docente]);
    if (vigentes[0].n !== ids.length) {
      throw new ConflictException('La docencia cambió desde que se envió: el programador debe volver a enviarla.');
    }
  }

  // ── Docente: aceptar o reportar novedad (EFDS-2374) ────────────────────────

  /** Solo el docente dueño, y solo con la concertación por aceptar. */
  private async cargarDelDocente(m: EntityManager, id: string, idPerson: string): Promise<FilaConcertacion> {
    const c = await this.cargar(m, id);
    if (c.id_docente !== idPerson) throw new ForbiddenException('Esta programación no es suya.');
    if (c.estado !== 'POR_ACEPTAR') throw new ConflictException(`No se puede decidir: la programación está ${c.estado}.`);
    return c;
  }

  /**
   * El docente ACEPTA su programación aprobada y firma: las franjas pasan a APROBADA
   * y la decisión, con las firmas del aprobador y del docente, va al PTA.
   */
  async aceptar(id: string, docente: { idPerson: string; idUser: string }, codigo: unknown, token: string | null) {
    await this.exigirHabilitada();
    const modo = verificarCodigo(codigo);
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargarDelDocente(m, id, docente.idPerson);
      await this.exigirFotoVigente(m, c);
      await m.query(
        `UPDATE "academic-schedule".franja_horaria SET estado = 'APROBADA', comentario_jefatura = NULL, updated_at = NOW()
          WHERE id_franja = ANY($1::uuid[])`, [c.franjas.map((f) => f.idFranja)]);
      await m.query(`UPDATE "academic-schedule".concertacion_docencia SET estado = 'ACEPTADA', updated_at = NOW() WHERE id_concertacion = $1`, [id]);
      await this.firmar(m, id, 'docente', docente.idUser, c.huella, modo);
      await this.historial(m, id, 'ACEPTAR', c.estado, 'ACEPTADA', docente.idUser, null);
    });
    await this.notificarPta(id, token);
    return this.detalle(id);
  }

  /**
   * El docente reporta una NOVEDAD (tipo + justificación obligatoria). No cambia
   * nada de la programación: vuelve al programador, que decide y reenvía.
   */
  async reportarNovedad(id: string, docente: { idPerson: string; idUser: string }, tipo: unknown, justificacion: unknown) {
    await this.exigirHabilitada();
    const t = String(tipo ?? '').trim().toLowerCase();
    if (!(TIPOS_NOVEDAD as readonly string[]).includes(t)) {
      throw new BadRequestException(`El tipo de novedad debe ser uno de: ${TIPOS_NOVEDAD.join(', ')}.`);
    }
    const texto = String(justificacion ?? '').trim();
    if (texto.length < 10) throw new BadRequestException('Explique la novedad (mínimo 10 caracteres).');
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargarDelDocente(m, id, docente.idPerson);
      await m.query(
        `INSERT INTO "academic-schedule".concertacion_novedad (id_concertacion, tipo, justificacion, huella, id_user)
         VALUES ($1, $2, $3, $4, $5)`, [id, t, texto, c.huella, docente.idUser]);
      await m.query(`UPDATE "academic-schedule".concertacion_docencia SET estado = 'NOVEDAD', updated_at = NOW() WHERE id_concertacion = $1`, [id]);
      await this.historial(m, id, 'NOVEDAD', c.estado, 'NOVEDAD', docente.idUser, `${t}: ${texto}`);
    });
    return this.detalle(id);
  }

  /** Entrega la decisión al PTA. Si falla, queda pendiente y se puede reintentar. */
  async notificarPta(id: string, token: string | null): Promise<void> {
    const c = (await this.dataSource.query(
      `SELECT c.*, p.num_identificacion AS documento,
              COALESCE(pa.codigo, pp.codigo) AS periodo_codigo
         FROM "academic-schedule".concertacion_docencia c
         JOIN auth.personas p ON p.id_person = c.id_docente
         LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id::text = c.periodo_ref
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo::text = c.periodo_ref
        WHERE c.id_concertacion = $1 AND c.estado IN ('ACEPTADA', 'APROBADA')`, [id]))[0];
    if (!c) return;
    const firmas = await this.dataSource.query(
      `SELECT rol, "idUser", "firmadoEn", "modoOtp" FROM (
         SELECT DISTINCT ON (rol) rol, id_user::text AS "idUser", firmado_en AS "firmadoEn", modo_otp AS "modoOtp"
           FROM "academic-schedule".concertacion_firma WHERE id_concertacion = $1 AND huella = $2
          ORDER BY rol, firmado_en DESC) ultimas
          ORDER BY "firmadoEn", CASE rol WHEN 'revisor' THEN 1 WHEN 'aprobador' THEN 2 ELSE 3 END`,
      // Solo las firmas de la foto vigente, la última de cada rol: tras una novedad la foto
      // cambia, y si se reenvía igual, revisor y aprobador firman otra vez la MISMA docencia.
      // Las anteriores siguen en el registro, pero no viajan al PTA.
      [id, c.huella]);
    // Una asignatura por GRUPO, con lo que el PTA exige al validar el envío:
    // ids de catálogo, pensum, créditos, fechas del ciclo y horas > 0.
    const horasPorGrupo = new Map<string, number>();
    for (const f of c.franjas as FilaConcertacion['franjas']) {
      horasPorGrupo.set(f.idGrupo, Math.round(((horasPorGrupo.get(f.idGrupo) ?? 0) + f.horas) * 10) / 10);
    }
    const grupos: any[] = await this.dataSource.query(
      `SELECT g.id_grupo::text AS "idGrupo", a.id::text AS "asignaturaId", a.codigo, a.nombre,
              a.id_programa::text AS "programaId", a.pensum, a.creditos::float AS creditos,
              us.orden AS semestre, a.modalidad,
              to_char(g.fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio", to_char(g.fecha_fin, 'YYYY-MM-DD') AS "fechaFin"
         FROM "academic-schedule".grupo g
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         LEFT JOIN academic_work_plan.ubicacion_semestral us ON us.id = a.id_ubicacion_semestral
        WHERE g.id_grupo = ANY($1::uuid[])`, [[...horasPorGrupo.keys()]]);
    // territorialId: el mismo dato que el PTA guarda en asignaturas[].territorial_id.
    const territoriales = await this.territorial.territorialesDeGrupos([...horasPorGrupo.keys()]);
    const asignaturas = grupos.map((g) => ({
      ...g, territorialId: territoriales.get(g.idGrupo) ?? null, horas: horasPorGrupo.get(g.idGrupo) ?? 0,
    }));
    try {
      const r = await this.contratoPta.registrarDecision({
        idConcertacion: id, documentoDocente: c.documento, periodo: c.periodo_codigo, nivel: c.nivel,
        horas: Number(c.horas), huella: c.huella, asignaturas,
        firmas: firmas.map((f: any) => ({ ...f, firmadoEn: new Date(f.firmadoEn).toISOString() })),
      }, token);
      await this.dataSource.query(
        `UPDATE "academic-schedule".concertacion_docencia
            SET notificada_pta_en = NOW(), error_notificacion = NULL, aplicacion_pta = $2
          WHERE id_concertacion = $1`, [id, r?.estadoAplicacion ?? null]);
    } catch (e: any) {
      await this.dataSource.query(
        `UPDATE "academic-schedule".concertacion_docencia SET error_notificacion = $2 WHERE id_concertacion = $1`,
        [id, String(e?.message ?? e).slice(0, 500)]);
    }
  }

  async detalle(id: string) {
    const filas = await this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.periodo_ref AS "idPeriodo", c.nivel, c.estado,
              c.horas::float AS horas, c.franjas, c.huella, c.comentario,
              c.notificada_pta_en AS "notificadaPtaEn", c.error_notificacion AS "errorNotificacion",
              c.aplicacion_pta AS "aplicacionPta",
              (SELECT COALESCE(json_agg(json_build_object('rol', f.rol, 'idUser', f.id_user, 'firmadoEn', f.firmado_en,
                        'modoOtp', f.modo_otp, 'contexto', f.contexto) ORDER BY f.firmado_en), '[]'::json)
                 FROM "academic-schedule".concertacion_firma f WHERE f.id_concertacion = c.id_concertacion) AS firmas,
              (SELECT COALESCE(array_agg(r.tipo), '{}') FROM "academic-schedule".concertacion_revision r
                WHERE r.id_concertacion = c.id_concertacion) AS revisiones
         FROM "academic-schedule".concertacion_docencia c WHERE c.id_concertacion = $1`, [id]);
    if (!filas.length) throw new NotFoundException('La concertación no existe.');
    return filas[0];
  }

  // ── Registro ───────────────────────────────────────────────────────────────

  private firmar(m: EntityManager, id: string, rol: RolFirma, idUser: string, huella: string, modo: 'simulado' | 'real') {
    return m.query(
      `INSERT INTO "academic-schedule".concertacion_firma (id_concertacion, rol, id_user, modo_otp, huella, contexto)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, rol, idUser, modo, huella, contextoFirma(id, huella, rol)]);
  }

  private historial(m: EntityManager, id: string, accion: string, antes: string | null, despues: string, idUser: string, comentario: string | null) {
    return m.query(
      `INSERT INTO "academic-schedule".concertacion_historial (id_concertacion, accion, estado_anterior, estado_nuevo, id_user, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, accion, antes, despues, idUser, comentario]);
  }
}
