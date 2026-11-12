import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class BackofficeDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  private async cnt(sql: string): Promise<number> {
    return this.dataSource.query(sql).then((r: any[]) => +(r[0]?.c || 0)).catch(() => 0);
  }

  private toGroup(rows: { key: string; cnt: number }[]): Record<string, number> {
    const r: Record<string, number> = {};
    rows.forEach(row => {
      if (row.key) {
        const k = String(row.key);
        r[k] = (r[k] || 0) + (+row.cnt || 0);
      }
    });
    return r;
  }

  async getExecutiveStats() {
    const DOCENTES_VIGENTES_CTE = `
      WITH docentes_vigentes AS (
        SELECT DISTINCT ON (d."personaId")
          d.id,
          d."personaId",
          COALESCE(NULLIF(BTRIM(d."territorialId"), ''), p.id_seccional::text) AS territorial_ref,
          COALESCE(NULLIF(BTRIM(d."territorialReportada"), ''), '') AS territorial_reportada,
          COALESCE(NULLIF(BTRIM(d."sedeId"), ''), NULLIF(BTRIM(d."cetapId"), ''), p.id_sede::text) AS cetap_ref,
          d."tipoVinculacion",
          d."vinculacionDisplay",
          d.dedicacion,
          d."dedicacionDisplay",
          d.escalafon,
          d."nivelFormacion",
          d."rangoEdad",
          d."createdAt"
        FROM academic_work_plan."Docente" d
        LEFT JOIN auth.personas p ON p.id_person = d."personaId"
        WHERE COALESCE(d."eliminadoRund", false) = false
        ORDER BY
          d."personaId",
          CASE
            WHEN d."periodoCarga" = (
              SELECT pa.codigo
              FROM academic_work_plan.periodo_academico pa
              WHERE pa.estado = 'en_curso'
              ORDER BY pa.id DESC
              LIMIT 1
            ) THEN 0
            ELSE 1
          END,
          CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END,
          d."updatedAt" DESC NULLS LAST,
          d."createdAt" DESC NULLS LAST
      )
    `;

    // ── PHASE 1: parallel counts ──────────────────────────────────────────────
    const [
      totalPersonas, totalUsuarios, usuariosActivos,
      rawTerritoriales, rawCetaps,
      canonicalTerritoriales, canonicalCetaps,
      totalCarpetas,
      totalDocsCarpeta, totalDocsRund,
      totalRoles,
      totalDocentes, docentesSinCetap,
      totalPTAs, totalEvidencias,
      totalProgramasNew, totalProgramasOld,
      totalAsignaturasNew, totalAsignaturasOld,
      totalCertLaborales, totalCertGrado,
      totalAuditLogs,
      // Módulos adicionales desarrollados en la plataforma
      totalGraduados,
      totalGrupos, totalAulas, totalFranjasHorarias,
      totalEspaciosFisicos, totalSolicitudesMantenimiento,
      totalProcesosDisciplinarios, totalNoticiasDisciplinarias,
      totalAuditoriasInternas, totalHallazgosInternos, totalPlanesMejoramiento,
      totalExpedientesLegales, totalConsultasJuridicas, totalProcesosCoactivos, totalRequerimientosOc,
      totalProcesosContratacion, totalContratos,
      totalSolicitudesViaticos, totalComisionadosViaticos,
      totalConversacionesChatbot,
    ] = await Promise.all([
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth."user"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth."user" WHERE is_active = true`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.seccionales`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.sedes`),
      this.cnt(`
        SELECT COUNT(DISTINCT sec.id_seccional)::int AS c
        FROM auth.seccionales sec
        WHERE EXISTS (
          SELECT 1 FROM academic_work_plan.direccion_territorial dt
          WHERE dt.codigo = sec.cod_seccional AND dt.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM auth.sedes mapped_sede
          INNER JOIN auth.sede_cetap_mapping mapping ON mapping.id_sede = mapped_sede.id_sede
          WHERE mapped_sede.id_seccional = sec.id_seccional
        )
      `),
      this.cnt(`
        SELECT COUNT(DISTINCT sede.id_sede)::int AS c
        FROM auth.sedes sede
        WHERE EXISTS (
          SELECT 1 FROM academic_work_plan.cetap cetap
          WHERE cetap.codigo = sede.cod_sede AND cetap.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM auth.sede_cetap_mapping mapping
          WHERE mapping.id_sede = sede.id_sede
        )
      `),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.carpeta_digital`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.documento_carpeta_digital`),
      this.cnt(`
        SELECT COUNT(*)::int AS c
        FROM academic_work_plan."RundSoporteCampo" s
        WHERE NOT EXISTS (
          SELECT 1 FROM auth.documento_carpeta_digital dcd
          WHERE dcd.rund_soporte_id = s.id
        )
      `),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.role`),
      this.cnt(`${DOCENTES_VIGENTES_CTE} SELECT COUNT(*)::int AS c FROM docentes_vigentes`),
      this.cnt(`${DOCENTES_VIGENTES_CTE} SELECT COUNT(*)::int AS c FROM docentes_vigentes WHERE cetap_ref IS NULL`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."PlanTrabajoAcademico"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."PtaEvidencia"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan.programa WHERE deleted_at IS NULL`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan.programas`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan.asignatura`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."Asignatura"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM certification.certificates`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_registration.graduation_certificates`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM audit.request_logs`),
      // Módulos adicionales
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_registration.graduates`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM "academic-schedule".grupo`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM "academic-schedule".aula`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM "academic-schedule".franja_horaria`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM "infrastructure-management".espacio_fisico`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM "infrastructure-management".solicitud_mantenimiento`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM internal_disciplinary_control.disciplinary_processes`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM internal_disciplinary_control.disciplinary_news`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM control_interno.auditoria`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM control_interno.hallazgo`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM control_interno.plan_mejoramiento`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM legal_management.expedientes`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM legal_management.consultas_juridicas`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM legal_management.procesos_coactivos`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM legal_management.requerimientos_oc`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM hiring.procesos`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM hiring.contratos`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM travel_expenses.solicitudes_comision`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM travel_expenses.comisionados`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM chatbot.conversacion`),
    ]);

    const totalTerritoriales = canonicalTerritoriales > 0 ? canonicalTerritoriales : rawTerritoriales;
    const totalCetaps = canonicalCetaps > 0 ? canonicalCetaps : rawCetaps;
    const totalProgramas = totalProgramasNew > 0 ? totalProgramasNew : totalProgramasOld;
    const totalAsignaturas = totalAsignaturasNew > 0 ? totalAsignaturasNew : totalAsignaturasOld;
    const totalCertificados = totalCertLaborales + totalCertGrado;
    const totalDocumentos = totalDocsCarpeta + totalDocsRund;

    // ── PHASE 2: breakdowns ──────────────────────────────────────────────────
    const [
      docentesByVinculacion, docentesByDedicacion,
      docentesByEscalafon, docentesByNivelFormacion,
      docentesByRangoEdad,
      ptasByEstado,
      certLabByEstado, certGradoByEstado,
      certLabCorrectionReqByEstado, certGradoReqByEstado,
      rolesList, auditByModule,
      personasByGenero, carpetasByEstado,
      docsCarpetaByEstado, docsRundByEstado,
    ] = await Promise.all([
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT
          CASE
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%OCASIONAL%' THEN 'Ocasional'
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%PRUEBA%' THEN 'Periodo de Prueba'
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%CARRERA%' THEN 'Carrera'
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%ESPECIAL%' THEN 'Especial'
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%VISITANTE%' THEN 'Visitante'
            WHEN UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%CATEDRA%' OR UPPER(COALESCE("vinculacionDisplay", "tipoVinculacion", '')) LIKE '%CÁTEDRA%' THEN 'Hora Cátedra'
            ELSE COALESCE(NULLIF(BTRIM("vinculacionDisplay"), ''), NULLIF(BTRIM("tipoVinculacion"), ''), 'Sin especificar')
          END AS key,
          COUNT(*)::int AS cnt
        FROM docentes_vigentes
        GROUP BY 1 ORDER BY cnt DESC
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT
          CASE
            WHEN UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) IN ('TC', 'TIEMPO COMPLETO', 'TIEMPO_COMPLETO')
              OR UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) LIKE '%COMPLETO%' THEN 'Tiempo Completo'
            WHEN UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) IN ('MT', 'MEDIO TIEMPO', 'MEDIO_TIEMPO')
              OR UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) LIKE '%MEDIO%' THEN 'Medio Tiempo'
            WHEN UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) IN ('HC', 'HORA CATEDRA', 'HORA CÁTEDRA', 'CATEDRA', 'CÁTEDRA')
              OR UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) LIKE '%CATEDRA%'
              OR UPPER(COALESCE("dedicacionDisplay", dedicacion, '')) LIKE '%CÁTEDRA%' THEN 'Hora Cátedra'
            ELSE COALESCE(NULLIF(BTRIM("dedicacionDisplay"), ''), NULLIF(BTRIM(dedicacion), ''), 'Sin especificar')
          END AS key,
          COUNT(*)::int AS cnt
        FROM docentes_vigentes
        GROUP BY 1 ORDER BY cnt DESC
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT INITCAP(BTRIM(escalafon)) AS key, COUNT(*)::int AS cnt
        FROM docentes_vigentes
        WHERE escalafon IS NOT NULL AND BTRIM(escalafon) <> ''
        GROUP BY 1 ORDER BY cnt DESC
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT BTRIM("nivelFormacion") AS key, COUNT(*)::int AS cnt
        FROM docentes_vigentes
        WHERE "nivelFormacion" IS NOT NULL AND BTRIM("nivelFormacion") <> ''
        GROUP BY 1 ORDER BY cnt DESC
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT BTRIM("rangoEdad") AS key, COUNT(*)::int AS cnt
        FROM docentes_vigentes
        WHERE "rangoEdad" IS NOT NULL AND BTRIM("rangoEdad") <> ''
        GROUP BY 1 ORDER BY 1 ASC
      `).catch(() => []),
      this.dataSource.query(`SELECT estado AS key, COUNT(*)::int AS cnt FROM academic_work_plan."PlanTrabajoAcademico" GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM certification.certificates GROUP BY 1`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM academic_registration.graduation_certificates GROUP BY 1`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM certification.certificate_correction_requests GROUP BY 1`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM academic_registration.graduation_certificate_requests GROUP BY 1`).catch(() => []),
      this.dataSource.query(`
        SELECT r.id, r.name, r.type, r.is_active,
          (SELECT COUNT(*)::int FROM auth.user_roles ur WHERE ur.id_rol = r.id AND COALESCE(ur.is_active, true) = true) AS users_count,
          (SELECT COUNT(*)::int FROM auth.role_permissions rp INNER JOIN auth.permission p ON p.id_permission = rp.id_permission WHERE rp.id_rol = r.id AND COALESCE(rp.is_active, true) = true AND p.is_active = true) AS perms_count
        FROM auth.role r ORDER BY r.name
      `).catch(() => []),
      this.dataSource.query(`SELECT module AS key, COUNT(*)::int AS cnt FROM audit.request_logs WHERE module IS NOT NULL GROUP BY 1 ORDER BY cnt DESC LIMIT 20`).catch(() => []),
      this.dataSource.query(`
        SELECT
          CASE
            WHEN UPPER(BTRIM(COALESCE(gen_tercero, ''))) IN ('M', 'MASCUL', 'MASCULINO', 'HOMBRE') THEN 'Masculino'
            WHEN UPPER(BTRIM(COALESCE(gen_tercero, ''))) IN ('F', 'FEMENI', 'FEMENINO', 'MUJER') THEN 'Femenino'
            WHEN UPPER(BTRIM(COALESCE(gen_tercero, ''))) IN ('O', 'OTRO', 'NO BINARIO', 'NB') THEN 'Otro'
            ELSE 'No especificado'
          END AS key,
          COUNT(*)::int AS cnt
        FROM auth.personas
        GROUP BY 1 ORDER BY cnt DESC
      `).catch(() => []),
      this.dataSource.query(`SELECT estado AS key, COUNT(*)::int AS cnt FROM auth.carpeta_digital GROUP BY 1`).catch(() => []),
      this.dataSource.query(`SELECT LOWER(BTRIM(estado)) AS key, COUNT(*)::int AS cnt FROM auth.documento_carpeta_digital GROUP BY 1`).catch(() => []),
      this.dataSource.query(`
        SELECT LOWER(BTRIM(s.estado)) AS key, COUNT(*)::int AS cnt
        FROM academic_work_plan."RundSoporteCampo" s
        WHERE NOT EXISTS (
          SELECT 1 FROM auth.documento_carpeta_digital dcd
          WHERE dcd.rund_soporte_id = s.id
        )
        GROUP BY 1
      `).catch(() => []),
    ]);

    // ── PHASE 3: timelines and geo ─────────────────────────────────────────────
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const ago60 = new Date(Date.now() - 60 * 86400000).toISOString();

    const [
      personasTimeline, ptasTimeline, docentesTimeline,
      personasLast30, personasPrev30,
      terrCoverage, formacionAvanzada,
      programasDetalleNew,
    ] = await Promise.all([
      this.dataSource.query(`
        SELECT TO_CHAR(fec_creacion, 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM auth.personas WHERE fec_creacion >= NOW() - INTERVAL '12 months'
        GROUP BY mes ORDER BY mes
      `).catch(() => []),
      this.dataSource.query(`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM academic_work_plan."PlanTrabajoAcademico"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY mes ORDER BY mes
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT TO_CHAR("createdAt", 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM docentes_vigentes
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY mes ORDER BY mes
      `).catch(() => []),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas WHERE fec_creacion >= '${ago30}'`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas WHERE fec_creacion >= '${ago60}' AND fec_creacion < '${ago30}'`),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT
          COALESCE(sec.nom_seccional, dt.nombre, NULLIF(dv.territorial_reportada, ''), 'Sin territorial') AS territorial,
          COUNT(dv.id)::int AS total,
          COUNT(CASE WHEN dv.cetap_ref IS NULL THEN 1 END)::int AS sin_cetap,
          COUNT(CASE WHEN dv.cetap_ref IS NOT NULL THEN 1 END)::int AS con_cetap
        FROM docentes_vigentes dv
        LEFT JOIN LATERAL (
          SELECT s.nom_seccional
          FROM auth.seccionales s
          WHERE s.id_seccional::text = dv.territorial_ref
            OR (s.cod_seccional IS NOT NULL AND UPPER(s.cod_seccional) = UPPER(dv.territorial_ref))
          ORDER BY CASE WHEN s.id_seccional::text = dv.territorial_ref THEN 0 ELSE 1 END, s.id_seccional ASC
          LIMIT 1
        ) sec ON true
        LEFT JOIN LATERAL (
          SELECT d.nombre
          FROM academic_work_plan.direccion_territorial d
          WHERE UPPER(d.codigo) = UPPER(dv.territorial_ref) AND d.deleted_at IS NULL
          ORDER BY d.id ASC
          LIMIT 1
        ) dt ON true
        GROUP BY 1 ORDER BY total DESC
      `).catch(() => []),
      this.dataSource.query(`
        ${DOCENTES_VIGENTES_CTE}
        SELECT
          CASE
            WHEN "nivelFormacion" ILIKE '%posdoctor%' OR "nivelFormacion" ILIKE '%postdoctor%' THEN 'Posdoctorado'
            WHEN "nivelFormacion" ILIKE '%doctorado%' OR "nivelFormacion" ILIKE '%doctor%' THEN 'Doctorado'
            WHEN "nivelFormacion" ILIKE '%maestr%' OR "nivelFormacion" ILIKE '%magíster%' OR "nivelFormacion" ILIKE '%magister%' THEN 'Maestría'
            WHEN "nivelFormacion" ILIKE '%especializ%' THEN 'Especialización'
            WHEN "nivelFormacion" ILIKE '%pregrado%' OR "nivelFormacion" ILIKE '%profesional%' OR "nivelFormacion" ILIKE '%licenciat%' OR "nivelFormacion" ILIKE '%ingenier%' THEN 'Pregrado'
            ELSE 'Sin información'
          END AS nivel,
          COUNT(*)::int AS total
        FROM docentes_vigentes GROUP BY nivel ORDER BY total DESC
      `).catch(() => []),
      this.dataSource.query(`
        SELECT
          p.nombre,
          CASE LOWER(COALESCE(p.tipo, ''))
            WHEN 'pregrado' THEN 'Pregrado'
            WHEN 'especializacion' THEN 'Especialización'
            WHEN 'maestria' THEN 'Maestría'
            WHEN 'doctorado' THEN 'Doctorado'
            WHEN 'tecnico_profesional' THEN 'Técnico Profesional'
            WHEN 'tecnologico' THEN 'Tecnológico'
            ELSE COALESCE(p.tipo, 'Pregrado')
          END AS nivel,
          CASE WHEN COALESCE(p.activo, true) THEN 'ACTIVO' ELSE 'INACTIVO' END AS estado,
          COALESCE(f.nombre, '') AS facultad,
          (SELECT COUNT(*)::int FROM academic_work_plan.asignatura a WHERE a.id_programa = p.id) AS asignaturas,
          0 AS personas
        FROM academic_work_plan.programa p
        LEFT JOIN academic_work_plan.facultad f ON f.id = p.id_facultad
        WHERE p.deleted_at IS NULL
        ORDER BY p.nombre LIMIT 20
      `).catch(() => []),
    ]);

    const programasDetalle = programasDetalleNew;

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    const carpetaCoverage = totalPersonas > 0 ? (totalCarpetas / totalPersonas) * 100 : 0;
    const cetapCoverage = totalDocentes > 0 ? ((totalDocentes - docentesSinCetap) / totalDocentes) * 100 : 100;
    const avgDocentesPerTerr = totalTerritoriales > 0 ? totalDocentes / totalTerritoriales : 0;

    // Clasificación normalizada de estados PTA
    const normalizeKey = (val: unknown) =>
      String(val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');

    let ptaBorrador = 0;
    let ptaAprobado = 0;
    let ptaRechazado = 0;
    let ptaEnRevision = 0;
    const ptasEstadoNormalized: Record<string, number> = {};

    for (const row of ptasByEstado) {
      const cnt = +row.cnt || 0;
      const nk = normalizeKey(row.key);
      if (nk === 'BORRADOR' || nk === 'BORRADORES') {
        ptaBorrador += cnt;
        ptasEstadoNormalized['Borrador'] = (ptasEstadoNormalized['Borrador'] || 0) + cnt;
      } else if (['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'].includes(nk)) {
        ptaAprobado += cnt;
        ptasEstadoNormalized['Aprobado'] = (ptasEstadoNormalized['Aprobado'] || 0) + cnt;
      } else if (['RECHAZADO', 'CANCELADO', 'ANULADO'].includes(nk)) {
        ptaRechazado += cnt;
        ptasEstadoNormalized['Rechazado'] = (ptasEstadoNormalized['Rechazado'] || 0) + cnt;
      } else {
        ptaEnRevision += cnt;
        ptasEstadoNormalized['En Revisión'] = (ptasEstadoNormalized['En Revisión'] || 0) + cnt;
      }
    }

    // Clasificación normalizada de certificados (Laborales + Grado)
    const allCertsByEstado = [...certLabByEstado, ...certGradoByEstado];
    const allCertReqsByEstado = [...certLabCorrectionReqByEstado, ...certGradoReqByEstado];

    const certEmitidos = allCertsByEstado
      .filter((r: any) => ['VALID', 'EMITIDO', 'APROBADO', 'APPROVED', 'ISSUED', 'COMPLETED', 'CORREGIDO'].includes(normalizeKey(r.key)))
      .reduce((acc: number, r: any) => acc + (+r.cnt || 0), 0);

    const certPendientes = allCertsByEstado
      .filter((r: any) => ['PENDIENTE', 'PENDING', 'PROCESSING', 'NEEDS_REVIEW'].includes(normalizeKey(r.key)))
      .reduce((acc: number, r: any) => acc + (+r.cnt || 0), 0)
      + allCertReqsByEstado
        .filter((r: any) => ['PENDIENTE', 'PENDING', 'PROCESSING', 'NEEDS_REVIEW', 'EN_REVISION'].includes(normalizeKey(r.key)))
        .reduce((acc: number, r: any) => acc + (+r.cnt || 0), 0);

    const totalCertPipeline = Math.max(totalCertificados, certEmitidos + certPendientes);

    // Clasificación normalizada de documentos en Carpeta Digital + RUND
    const allDocsByEstado = [...docsCarpetaByEstado, ...docsRundByEstado];
    let docsPendientes = 0;
    let docsValidados = 0;
    let docsRechazados = 0;
    const documentosEstadoMap: Record<string, number> = {};
    for (const row of allDocsByEstado) {
      const cnt = +row.cnt || 0;
      const nk = normalizeKey(row.key);
      if (['VALIDADO', 'APROBADO', 'VIGENTE'].includes(nk)) {
        docsValidados += cnt;
        documentosEstadoMap['Validado'] = (documentosEstadoMap['Validado'] || 0) + cnt;
      } else if (['RECHAZADO', 'DEVUELTO', 'VENCIDO'].includes(nk)) {
        docsRechazados += cnt;
        documentosEstadoMap['Rechazado'] = (documentosEstadoMap['Rechazado'] || 0) + cnt;
      } else {
        docsPendientes += cnt;
        documentosEstadoMap['Pendiente'] = (documentosEstadoMap['Pendiente'] || 0) + cnt;
      }
    }
    const tasaDocValidacion = totalDocumentos > 0 ? (docsValidados / totalDocumentos) * 100 : 0;

    let healthScore = 100;
    const healthFactors: string[] = [];
    if (docentesSinCetap > 0) {
      healthScore -= Math.min(25, Math.round(docentesSinCetap / Math.max(totalDocentes, 1) * 40));
      healthFactors.push(`${docentesSinCetap} docentes sin CETAP`);
    }
    if (carpetaCoverage < 90 && totalPersonas > 0) {
      healthScore -= 10;
      healthFactors.push(`Cobertura carpetas: ${carpetaCoverage.toFixed(0)}%`);
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    const distribucionTerritorial = terrCoverage.map((t: any) => ({
      nombre: t.territorial,
      total: +t.total,
      sinCetap: +t.sin_cetap,
      conCetap: +t.con_cetap,
      cobertura: +t.total > 0 ? (+t.con_cetap / +t.total) * 100 : 0,
    }));

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const allMonths = new Set<string>();
    [...personasTimeline, ...ptasTimeline, ...docentesTimeline].forEach((r: any) => { if (r.mes) allMonths.add(r.mes); });
    const pMap: Record<string, number> = {};
    personasTimeline.forEach((r: any) => { pMap[r.mes] = +r.total; });
    const ptaMap: Record<string, number> = {};
    ptasTimeline.forEach((r: any) => { ptaMap[r.mes] = +r.total; });
    const docMap: Record<string, number> = {};
    docentesTimeline.forEach((r: any) => { docMap[r.mes] = +r.total; });

    const timelineData = Array.from(allMonths).sort().slice(-12).map(key => {
      const [y, m] = key.split('-');
      return {
        name: `${monthNames[parseInt(m) - 1]}'${y?.slice(2)}`,
        Personas: pMap[key] || 0,
        Docentes: docMap[key] || 0,
        Documentos: 0,
        PTAs: ptaMap[key] || 0,
      };
    });

    const alertas: any[] = [];
    if (docentesSinCetap > 0) alertas.push({ modulo: 'Estructura Organizacional', tipo: 'asignacion', descripcion: `${docentesSinCetap} docente(s) sin CETAP asignado`, cantidad: docentesSinCetap, severidad: docentesSinCetap > 100 ? 'critico' : docentesSinCetap > 30 ? 'alto' : 'medio', accion: 'estructura-organizacional' });
    if (ptaBorrador > 0) alertas.push({ modulo: 'PTA', tipo: 'borrador', descripcion: `${ptaBorrador} PTA(s) en borrador — requiere concertación`, cantidad: ptaBorrador, severidad: 'medio', accion: 'pta' });
    if (certPendientes > 0) alertas.push({ modulo: 'Certificados', tipo: 'emision', descripcion: `${certPendientes} certificado(s) pendientes de emisión`, cantidad: certPendientes, severidad: certPendientes > 20 ? 'alto' : 'medio', accion: 'certificate-requests' });

    const personasDelta = personasPrev30 > 0 ? ((personasLast30 - personasPrev30) / personasPrev30) * 100 : personasLast30 > 0 ? 100 : 0;

    const totalLegalItems = totalExpedientesLegales + totalConsultasJuridicas + totalProcesosCoactivos + totalRequerimientosOc;
    const totalDisciplinarioItems = totalProcesosDisciplinarios + totalNoticiasDisciplinarias;
    const totalControlInternoItems = totalAuditoriasInternas + totalHallazgosInternos + totalPlanesMejoramiento;
    const totalContratacionItems = totalProcesosContratacion + totalContratos;
    const totalViaticosItems = totalSolicitudesViaticos + totalComisionadosViaticos;
    const totalProgramacionItems = totalGrupos + totalFranjasHorarias + totalAulas;
    const totalInfraestructuraItems = totalEspaciosFisicos + totalSolicitudesMantenimiento;

    const saludModulos = {
      personas: { score: totalPersonas > 0 ? 100 : 0, estado: totalPersonas > 0 ? 'optimo' : 'critico', factores: totalPersonas === 0 ? ['Sin personas'] : [], total: totalPersonas, activos: usuariosActivos },
      docentes: { score: Math.round(cetapCoverage), estado: cetapCoverage >= 80 ? 'optimo' : cetapCoverage >= 50 ? 'alerta' : 'critico', factores: docentesSinCetap > 0 ? [`${docentesSinCetap} sin CETAP`] : [], total: totalDocentes, sinCetap: docentesSinCetap },
      estructura: { score: totalTerritoriales > 0 ? 100 : 0, estado: totalTerritoriales > 0 ? 'optimo' : 'critico', factores: [], territoriales: totalTerritoriales, cetaps: totalCetaps },
      carpetaDigital: { score: Math.round(carpetaCoverage), estado: carpetaCoverage >= 90 ? 'optimo' : carpetaCoverage >= 70 ? 'bueno' : 'alerta', factores: carpetaCoverage < 100 && totalPersonas > 0 ? [`Cobertura: ${carpetaCoverage.toFixed(0)}%`] : [], total: totalCarpetas, documentos: totalDocumentos },
      programas: { score: totalProgramas > 0 ? 100 : 0, estado: totalProgramas > 0 ? 'optimo' : 'critico', factores: totalProgramas === 0 ? ['Sin programas'] : [], total: totalProgramas, asignaturas: totalAsignaturas },
      pta: { score: totalPTAs > 0 ? Math.max(70, Math.round((ptaAprobado / totalPTAs) * 100)) : 50, estado: totalPTAs > 0 ? (ptaAprobado === totalPTAs ? 'optimo' : 'bueno') : 'alerta', factores: totalPTAs === 0 ? ['Sin PTAs creados'] : ptaBorrador > 0 ? [`${ptaBorrador} en borrador`] : [], total: totalPTAs, aprobados: ptaAprobado },
      roles: { score: 100, estado: 'optimo', factores: [], total: totalRoles, sistema: rolesList.filter((r: any) => r.type === 'sistema').length, personalizados: rolesList.filter((r: any) => r.type !== 'sistema').length },
      certificados: { score: certPendientes === 0 ? 100 : 75, estado: certPendientes === 0 ? 'optimo' : 'bueno', factores: certPendientes > 0 ? [`${certPendientes} pendientes`] : [], total: totalCertificados, emitidos: certEmitidos },
      graduados: { score: totalGraduados > 0 ? 100 : 70, estado: totalGraduados > 0 ? 'optimo' : 'bueno', factores: [], total: totalGraduados, certificados: totalCertGrado },
      programacionAcademica: { score: totalProgramacionItems > 0 ? 100 : 75, estado: totalProgramacionItems > 0 ? 'optimo' : 'bueno', factores: [], grupos: totalGrupos, franjas: totalFranjasHorarias, aulas: totalAulas },
      infraestructura: { score: totalInfraestructuraItems > 0 ? 100 : 75, estado: totalInfraestructuraItems > 0 ? 'optimo' : 'bueno', factores: [], espacios: totalEspaciosFisicos, mantenimientos: totalSolicitudesMantenimiento },
      contratacion: { score: totalContratacionItems > 0 ? 100 : 75, estado: totalContratacionItems > 0 ? 'optimo' : 'bueno', factores: [], procesos: totalProcesosContratacion, contratos: totalContratos },
      viaticos: { score: totalViaticosItems > 0 ? 100 : 75, estado: totalViaticosItems > 0 ? 'optimo' : 'bueno', factores: [], solicitudes: totalSolicitudesViaticos, comisionados: totalComisionadosViaticos },
      gestionLegal: { score: totalLegalItems > 0 ? 100 : 75, estado: totalLegalItems > 0 ? 'optimo' : 'bueno', factores: [], expedientes: totalExpedientesLegales, consultas: totalConsultasJuridicas, coactivos: totalProcesosCoactivos, requerimientosOc: totalRequerimientosOc },
      controlDisciplinario: { score: totalDisciplinarioItems > 0 ? 100 : 75, estado: totalDisciplinarioItems > 0 ? 'optimo' : 'bueno', factores: [], procesos: totalProcesosDisciplinarios, noticias: totalNoticiasDisciplinarias },
      controlInterno: { score: totalControlInternoItems > 0 ? 100 : 75, estado: totalControlInternoItems > 0 ? 'optimo' : 'bueno', factores: [], auditorias: totalAuditoriasInternas, hallazgos: totalHallazgosInternos, planes: totalPlanesMejoramiento },
    };

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        resumen: {
          totalPersonas, totalDocentes, totalTerritoriales, totalCetaps,
          totalProgramas, totalRoles, totalUsuarios, usuariosActivos, totalCarpetas,
          totalDocumentos, totalAsignaturas, totalPTAs, totalCertificados,
          totalAuditLogs, totalAlertas: alertas.length, totalEvidencias,
          docentesSinCetap,
          totalCertificadosLaborales: totalCertLaborales,
          totalCertificadosGrado: totalCertGrado,
          // Métricas de los nuevos módulos desarrollados
          totalGraduados,
          totalGrupos, totalAulas, totalFranjasHorarias,
          totalEspaciosFisicos, totalSolicitudesMantenimiento,
          totalProcesosDisciplinarios, totalNoticiasDisciplinarias,
          totalAuditoriasInternas, totalHallazgosInternos, totalPlanesMejoramiento,
          totalExpedientesLegales, totalConsultasJuridicas, totalProcesosCoactivos, totalRequerimientosOc,
          totalProcesosContratacion, totalContratos,
          totalSolicitudesViaticos, totalComisionadosViaticos,
          totalConversacionesChatbot,
        },
        saludGlobal: { score: healthScore, estado: healthScore >= 80 ? 'optimo' : healthScore >= 60 ? 'bueno' : healthScore >= 40 ? 'alerta' : 'critico', factores: healthFactors },
        saludModulos,
        alertas,
        eficiencia: {
          tasaPersonasActivas: totalUsuarios > 0 ? (usuariosActivos / totalUsuarios) * 100 : 0,
          tasaCarpetaCobertura: carpetaCoverage,
          tasaDocValidacion,
          tasaCetapCobertura: cetapCoverage,
          promedioDocentesPorTerritorial: avgDocentesPerTerr,
          desviacionDocentesTerritorial: 0,
          promedioCetapsPorTerritorial: totalTerritoriales > 0 ? totalCetaps / totalTerritoriales : 0,
          promedioAsignaturasPorPrograma: totalProgramas > 0 ? totalAsignaturas / totalProgramas : 0,
          tasaPtaAprobacion: totalPTAs > 0 ? (ptaAprobado / totalPTAs) * 100 : 0,
          tasaCertEmision: totalCertPipeline > 0 ? (certEmitidos / totalCertPipeline) * 100 : 0,
        },
        comparativa30d: {
          personasNuevas: { actual: personasLast30, anterior: personasPrev30, delta: Math.round(personasDelta * 10) / 10 },
        },
        distribucionTerritorial,
        vinculacion: this.toGroup(docentesByVinculacion),
        dedicacion: this.toGroup(docentesByDedicacion),
        escalafon: this.toGroup(docentesByEscalafon),
        nivelFormacion: this.toGroup(docentesByNivelFormacion),
        formacionAvanzada: formacionAvanzada.map((f: any) => ({ nivel: f.nivel, total: +f.total })),
        personasGenero: this.toGroup(personasByGenero),
        personasTipoUsuario: {},
        rangoEdad: this.toGroup(docentesByRangoEdad),
        documentosEstado: documentosEstadoMap,
        ptasEstado: ptasEstadoNormalized,
        certificadosEstado: this.toGroup(allCertsByEstado),
        carpetasEstado: this.toGroup(carpetasByEstado),
        auditModulo: this.toGroup(auditByModule),
        timelineData,
        ptaPipeline: { borrador: ptaBorrador, enRevision: ptaEnRevision, aprobado: ptaAprobado, rechazado: ptaRechazado, total: totalPTAs },
        docsPipeline: { pendientes: docsPendientes, validados: docsValidados, rechazados: docsRechazados, total: totalDocumentos },
        certPipeline: { pendientes: certPendientes, emitidos: certEmitidos, total: totalCertPipeline },
        programasDetalle: programasDetalle.map((p: any) => ({ nombre: p.nombre, nivel: p.nivel || '', estado: p.estado, facultad: p.facultad || '', asignaturas: +p.asignaturas, personas: 0 })),
        rolesDetalle: rolesList.map((r: any) => ({ nombre: r.name, isSystem: r.type === 'sistema', estado: r.is_active === false ? 'INACTIVO' : 'ACTIVO', usuarios: +r.users_count, permisos: +r.perms_count || 0 })),
      },
    };
  }

  async getDashboardTemplate(templateName: string): Promise<string> {
    const safeName = templateName.replace(/[^a-zA-Z0-9_-]/g, '');
    const validTemplates = ['panel_seguimiento', 'desarrollo_otic'];
    if (!validTemplates.includes(safeName)) {
      throw new NotFoundException(`Plantilla '${templateName}' no encontrada.`);
    }

    const fileName = `${safeName}.html`;
    const candidates = [
      join(__dirname, '..', '..', 'templates', fileName),
      join(__dirname, '..', 'templates', fileName),
      join(process.cwd(), 'backend', 'auth-service', 'templates', fileName),
      join(process.cwd(), 'templates', fileName),
      join(process.cwd(), 'auth-service', 'templates', fileName),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return readFileSync(candidate, 'utf-8');
      }
    }

    throw new NotFoundException(`El archivo para la plantilla '${templateName}' no existe.`);
  }

  async updateDashboardTemplate(templateName: string, htmlContent: string): Promise<{ success: boolean; message: string }> {
    const safeName = templateName.replace(/[^a-zA-Z0-9_-]/g, '');
    const validTemplates = ['panel_seguimiento', 'desarrollo_otic'];
    if (!validTemplates.includes(safeName)) {
      throw new BadRequestException(`Plantilla '${templateName}' no es válida.`);
    }

    if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
      throw new BadRequestException('El contenido HTML es requerido.');
    }

    const fileName = `${safeName}.html`;
    const candidates = [
      join(__dirname, '..', '..', 'templates', fileName),
      join(__dirname, '..', 'templates', fileName),
      join(process.cwd(), 'backend', 'auth-service', 'templates', fileName),
      join(process.cwd(), 'templates', fileName),
      join(process.cwd(), 'auth-service', 'templates', fileName),
    ];

    let written = false;
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        writeFileSync(candidate, htmlContent, 'utf-8');
        written = true;
      }
    }

    if (!written) {
      const defaultDir = existsSync(join(process.cwd(), 'templates'))
        ? join(process.cwd(), 'templates')
        : join(process.cwd(), 'backend', 'auth-service', 'templates');

      if (!existsSync(defaultDir)) {
        mkdirSync(defaultDir, { recursive: true });
      }
      writeFileSync(join(defaultDir, fileName), htmlContent, 'utf-8');
    }

    return {
      success: true,
      message: `Plantilla '${safeName}' actualizada exitosamente.`,
    };
  }
}
