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
import { decide, type ContextoTerritorial, type PermisoPta } from './permisos-pta.service.js';
import { TerritorialService } from '../acceso/territorial.service.js';

export type EstadoConcertacion = 'ENVIADA' | 'REVISADA' | 'APROBADA' | 'DEVUELTA';

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
 * Concertación de la docencia — EFDS-2315.
 *
 * Igual a la concertación del PTA, con sus roles y su orden:
 *   1. el DOCENTE envía su docencia del periodo y firma  → ENVIADA
 *   2. los REVISORES requeridos revisan y firman        → REVISADA
 *   3. el APROBADOR aprueba y firma                      → APROBADA
 *   (2 o 3) cualquiera de ellos puede DEVOLVER con comentario → DEVUELTA;
 *   el docente corrige y vuelve a enviar.
 * Una concertación por (docente, periodo, nivel): pregrado y posgrado se
 * deciden por separado, como `academica_pregrado`/`academica_posgrado` del PTA.
 *
 * Lo firmado es la FOTO de la docencia al enviar (franjas y horas, con su
 * huella). Si las franjas cambian antes de aprobar, la aprobación se rechaza y
 * hay que volver a enviar: nadie aprueba algo distinto de lo que firmó el docente.
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

  /** Concertaciones del docente en el periodo, con su estado y comentario. */
  async delDocente(idDocente: string, periodoRef: string) {
    return this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.nivel, c.estado, c.horas::float AS horas,
              c.comentario, c.updated_at AS "actualizadaEn",
              (SELECT COALESCE(json_agg(json_build_object('rol', f.rol, 'firmadoEn', f.firmado_en, 'modoOtp', f.modo_otp)
                        ORDER BY f.firmado_en), '[]'::json)
                 FROM "academic-schedule".concertacion_firma f WHERE f.id_concertacion = c.id_concertacion) AS firmas
         FROM "academic-schedule".concertacion_docencia c
        WHERE c.id_docente = $1 AND c.periodo_ref = $2
        ORDER BY c.nivel`,
      [idDocente, periodoRef],
    );
  }

  /**
   * El docente envía su docencia del periodo y firma. Una concertación por nivel
   * con docencia. Rechaza si tiene franjas devueltas sin resolver.
   */
  async enviar(
    docente: { idPerson: string; idUser: string; vinculacion: string | null },
    periodoRef: string,
    codigo: unknown,
    token: string | null,
  ) {
    await this.exigirHabilitada();
    const modo = verificarCodigo(codigo);

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

    const devueltas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE f.id_docente = $1 AND f.estado = 'DEVUELTA'
          AND COALESCE(g.id_periodo_academico::text, g.id_periodo::text) = $2`,
      [docente.idPerson, periodoRef]);
    if (devueltas[0].n > 0) {
      throw new ConflictException(
        `Tiene ${devueltas[0].n} franja(s) devuelta(s) en este periodo: vuelva a tomarlas o suéltelas antes de enviar.`);
    }

    const fotos = await this.fotoPorNivel(docente.idPerson, docente.vinculacion, periodoRef, token);
    if (fotos.size === 0) {
      throw new BadRequestException('No tiene franjas tomadas en este periodo para concertar.');
    }

    const resultado: string[] = [];
    await this.dataSource.transaction(async (m) => {
      for (const [nivel, foto] of fotos) {
        const previa: FilaConcertacion[] = await m.query(
          `SELECT * FROM "academic-schedule".concertacion_docencia
            WHERE id_docente = $1 AND periodo_ref = $2 AND nivel = $3 FOR UPDATE`,
          [docente.idPerson, periodoRef, nivel]);
        if (previa.length && previa[0].estado !== 'DEVUELTA') {
          throw new ConflictException(
            `La docencia de ${nivel} de este periodo ya fue enviada (estado ${previa[0].estado}).`);
        }
        const huella = huellaDe({ docente: docente.idPerson, periodo: periodoRef, nivel, franjas: foto.franjas });
        let id: string;
        if (previa.length) {
          id = previa[0].id_concertacion;
          await m.query(
            `UPDATE "academic-schedule".concertacion_docencia
                SET estado = 'ENVIADA', horas = $2, franjas = $3::jsonb, huella = $4, comentario = NULL,
                    notificada_pta_en = NULL, error_notificacion = NULL, updated_at = NOW()
              WHERE id_concertacion = $1`,
            [id, foto.horas, JSON.stringify(foto.franjas), huella]);
          await m.query(`DELETE FROM "academic-schedule".concertacion_revision WHERE id_concertacion = $1`, [id]);
        } else {
          const r = await m.query(
            `INSERT INTO "academic-schedule".concertacion_docencia (id_docente, periodo_ref, nivel, estado, horas, franjas, huella)
             VALUES ($1, $2, $3, 'ENVIADA', $4, $5::jsonb, $6) RETURNING id_concertacion`,
            [docente.idPerson, periodoRef, nivel, foto.horas, JSON.stringify(foto.franjas), huella]);
          id = r[0].id_concertacion;
        }
        await this.firmar(m, id, 'docente', docente.idUser, huella, modo);
        await this.historial(m, id, 'ENVIAR', previa[0]?.estado ?? null, 'ENVIADA', docente.idUser, null);
        resultado.push(id);
      }
    });
    return this.delDocente(docente.idPerson, periodoRef);
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
   * Qué puede hacer el usuario con la docencia de un nivel, según sus permisos
   * del PTA y la territorial del docente (equivalencia explícita, migración 038).
   * Territorial no mapeada: solo decide un alcance global.
   */
  private puede(permisos: readonly PermisoPta[], nivel: NivelAcademico, ctx: ContextoTerritorial) {
    const revisar = REVISIONES_REQUERIDAS
      .filter((r) => decide(permisos, [r.permiso[nivel], PTA_REVIEW_ALL], ctx))
      .map((r) => r.tipo);
    const aprobar = decide(permisos, [PERMISO_APROBAR[nivel], PTA_APPROVE_ALL], ctx);
    return { revisar, aprobar, devolver: revisar.length > 0 || aprobar };
  }

  private async contexto(idDocente: string, seccionalesUsuario: readonly string[]): Promise<ContextoTerritorial> {
    return { seccionalDocente: await this.territorial.seccionalDeDocente(idDocente), seccionalesUsuario };
  }

  /** Bandeja: concertaciones por decidir en los niveles donde el usuario decide. */
  async bandeja(permisos: readonly PermisoPta[], idUser: string, periodoRef?: string) {
    const filas = await this.dataSource.query(
      `SELECT c.id_concertacion AS "idConcertacion", c.id_docente::text AS "idDocente", c.periodo_ref AS "idPeriodo", c.nivel, c.estado,
              c.horas::float AS horas, jsonb_array_length(c.franjas) AS "numFranjas", c.franjas,
              p.nom_largo AS docente, p.num_identificacion AS documento, c.updated_at AS "actualizadaEn",
              (SELECT COALESCE(array_agg(r.tipo), '{}') FROM "academic-schedule".concertacion_revision r
                WHERE r.id_concertacion = c.id_concertacion) AS revisiones
         FROM "academic-schedule".concertacion_docencia c
         JOIN auth.personas p ON p.id_person = c.id_docente
        WHERE c.estado IN ('ENVIADA', 'REVISADA')
          AND ($1::text IS NULL OR c.periodo_ref = $1)
        ORDER BY c.updated_at`,
      [periodoRef ?? null]);
    const seccionales = await this.territorial.seccionalesDeUsuario(idUser);
    const visibles: any[] = [];
    for (const f of filas) {
      const { idDocente, ...resto } = f;
      const puede = this.puede(permisos, f.nivel, await this.contexto(idDocente, seccionales));
      if (puede.devolver) visibles.push({ ...resto, puede });
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
      const ctx = await this.contexto(c.id_docente, await this.territorial.seccionalesDeUsuario(idUser));
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
      const ctx = await this.contexto(c.id_docente, await this.territorial.seccionalesDeUsuario(idUser));
      if (!this.puede(permisos, c.nivel, ctx).devolver) throw new ForbiddenException(`No tiene permiso para decidir la docencia de ${c.nivel}.`);
      await m.query(
        `UPDATE "academic-schedule".concertacion_docencia SET estado = 'DEVUELTA', comentario = $2, updated_at = NOW()
          WHERE id_concertacion = $1`, [id, texto]);
      // Las franjas de la foto vuelven al docente con el comentario, igual que la
      // devolución de la jefatura: el portal ya sabe mostrarlas y re-tomarlas.
      await m.query(
        `UPDATE "academic-schedule".franja_horaria
            SET estado = 'DEVUELTA', comentario_jefatura = $3, updated_at = NOW()
          WHERE id_franja = ANY($1::uuid[]) AND id_docente = $2 AND estado = 'TOMADA'`,
        [c.franjas.map((f) => f.idFranja), c.id_docente, texto]);
      await this.historial(m, id, 'DEVOLVER', c.estado, 'DEVUELTA', idUser, texto);
    });
    return this.detalle(id);
  }

  async aprobar(id: string, idUser: string, permisos: readonly PermisoPta[], codigo: unknown, token: string | null) {
    await this.exigirHabilitada();
    const modo = verificarCodigo(codigo);
    await this.dataSource.transaction(async (m) => {
      const c = await this.cargar(m, id);
      if (c.estado !== 'REVISADA') throw new ConflictException(`No se puede aprobar: la concertación está ${c.estado} (requiere las revisiones).`);
      const ctx = await this.contexto(c.id_docente, await this.territorial.seccionalesDeUsuario(idUser));
      if (!this.puede(permisos, c.nivel, ctx).aprobar) throw new ForbiddenException(`No tiene permiso para aprobar la docencia de ${c.nivel}.`);

      // Lo que se aprueba es lo que firmó el docente: si las franjas cambiaron, no.
      const ids = c.franjas.map((f) => f.idFranja);
      const vigentes = await m.query(
        `SELECT COUNT(*)::int AS n FROM "academic-schedule".franja_horaria
          WHERE id_franja = ANY($1::uuid[]) AND id_docente = $2 AND estado = 'TOMADA'`, [ids, c.id_docente]);
      if (vigentes[0].n !== ids.length) {
        throw new ConflictException('La docencia cambió desde que el docente la envió: debe volver a enviarla.');
      }
      await m.query(
        `UPDATE "academic-schedule".franja_horaria SET estado = 'APROBADA', comentario_jefatura = NULL, updated_at = NOW()
          WHERE id_franja = ANY($1::uuid[])`, [ids]);
      await m.query(`UPDATE "academic-schedule".concertacion_docencia SET estado = 'APROBADA', updated_at = NOW() WHERE id_concertacion = $1`, [id]);
      await this.firmar(m, id, 'aprobador', idUser, c.huella, modo);
      await this.historial(m, id, 'APROBAR', c.estado, 'APROBADA', idUser, null);
    });
    await this.notificarPta(id, token);
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
        WHERE c.id_concertacion = $1 AND c.estado = 'APROBADA'`, [id]))[0];
    if (!c) return;
    const firmas = await this.dataSource.query(
      `SELECT rol, id_user::text AS "idUser", firmado_en AS "firmadoEn", modo_otp AS "modoOtp"
         FROM "academic-schedule".concertacion_firma WHERE id_concertacion = $1 ORDER BY firmado_en`, [id]);
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
    const asignaturas = grupos.map((g) => ({ ...g, horas: horasPorGrupo.get(g.idGrupo) ?? 0 }));
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
