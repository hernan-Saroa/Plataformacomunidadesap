import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class BackofficeDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  private async cnt(sql: string): Promise<number> {
    return this.dataSource.query(sql).then((r: any[]) => +(r[0]?.c || 0)).catch(() => 0);
  }

  private toGroup(rows: { key: string; cnt: number }[]): Record<string, number> {
    const r: Record<string, number> = {};
    rows.forEach(row => { if (row.key) r[String(row.key)] = +row.cnt; });
    return r;
  }

  async getExecutiveStats() {
    // ── PHASE 1: parallel counts ──────────────────────────────────────────────
    const [
      totalPersonas, totalUsuarios, usuariosActivos,
      totalTerritoriales, totalCetaps,
      totalCarpetas,
      totalRoles,
      totalDocentes, docentesSinCetap,
      totalPTAs, totalEvidencias,
      totalProgramas, totalAsignaturas,
      totalCertificados,
      totalAuditLogs,
    ] = await Promise.all([
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth."user"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth."user" WHERE is_active = true`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.seccionales`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.sedes`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.carpeta_digital`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.role`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."Docente"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."Docente" WHERE "sedeId" IS NULL`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."PlanTrabajoAcademico"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."PtaEvidencia"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan.programas`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM academic_work_plan."Asignatura"`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM certification.certificates`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM audit.request_logs`),
    ]);

    // ── PHASE 2: breakdowns ──────────────────────────────────────────────────
    const [
      docentesByVinculacion, docentesByDedicacion,
      docentesByEscalafon, docentesByNivelFormacion,
      ptasByEstado, certByEstado, certRequestsByEstado,
      rolesList, auditByModule,
      personasByGenero, carpetasByEstado,
    ] = await Promise.all([
      this.dataSource.query(`SELECT "tipoVinculacion" AS key, COUNT(*)::int AS cnt FROM academic_work_plan."Docente" GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT dedicacion AS key, COUNT(*)::int AS cnt FROM academic_work_plan."Docente" GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT escalafon AS key, COUNT(*)::int AS cnt FROM academic_work_plan."Docente" WHERE escalafon IS NOT NULL GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT "nivelFormacion" AS key, COUNT(*)::int AS cnt FROM academic_work_plan."Docente" WHERE "nivelFormacion" IS NOT NULL GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT estado AS key, COUNT(*)::int AS cnt FROM academic_work_plan."PlanTrabajoAcademico" GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM certification.certificates GROUP BY 1`).catch(() => []),
      this.dataSource.query(`SELECT status AS key, COUNT(*)::int AS cnt FROM certification.certificate_requests GROUP BY 1`).catch(() => []),
      this.dataSource.query(`
        SELECT r.id, r.name, r.type,
          (SELECT COUNT(*)::int FROM auth.user_roles ur WHERE ur.id_rol = r.id) AS users_count
        FROM auth.role r ORDER BY r.name
      `).catch(() => []),
      this.dataSource.query(`SELECT module AS key, COUNT(*)::int AS cnt FROM audit.request_logs WHERE module IS NOT NULL GROUP BY 1 ORDER BY cnt DESC LIMIT 20`).catch(() => []),
      this.dataSource.query(`SELECT gen_tercero AS key, COUNT(*)::int AS cnt FROM auth.personas GROUP BY 1 ORDER BY cnt DESC`).catch(() => []),
      this.dataSource.query(`SELECT estado AS key, COUNT(*)::int AS cnt FROM auth.carpeta_digital GROUP BY 1`).catch(() => []),
    ]);

    // ── PHASE 3: timelines and geo ─────────────────────────────────────────────
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const ago60 = new Date(Date.now() - 60 * 86400000).toISOString();

    const [
      personasTimeline, ptasTimeline,
      personasLast30, personasPrev30,
      terrCoverage, formacionAvanzada,
      programasDetalle,
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
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas WHERE fec_creacion >= '${ago30}'`),
      this.cnt(`SELECT COUNT(*)::int AS c FROM auth.personas WHERE fec_creacion >= '${ago60}' AND fec_creacion < '${ago30}'`),
      this.dataSource.query(`
        SELECT s.nom_seccional AS territorial,
          COUNT(d.id)::int AS total,
          COUNT(CASE WHEN d."sedeId" IS NULL THEN 1 END)::int AS sin_cetap,
          COUNT(CASE WHEN d."sedeId" IS NOT NULL THEN 1 END)::int AS con_cetap
        FROM academic_work_plan."Docente" d
        JOIN auth.seccionales s ON d."territorialId" = s.id_seccional::text
        GROUP BY s.nom_seccional ORDER BY total DESC
      `).catch(() => []),
      this.dataSource.query(`
        SELECT
          CASE
            WHEN "nivelFormacion" ILIKE '%doctorado%' OR "nivelFormacion" ILIKE '%doctor%' THEN 'Doctorado'
            WHEN "nivelFormacion" ILIKE '%maestr%' OR "nivelFormacion" ILIKE '%magíster%' OR "nivelFormacion" ILIKE '%magister%' THEN 'Maestría'
            WHEN "nivelFormacion" ILIKE '%especializ%' THEN 'Especialización'
            WHEN "nivelFormacion" ILIKE '%pregrado%' OR "nivelFormacion" ILIKE '%licenciat%' OR "nivelFormacion" ILIKE '%ingenier%' THEN 'Pregrado'
            ELSE 'Sin información'
          END AS nivel,
          COUNT(*)::int AS total
        FROM academic_work_plan."Docente" GROUP BY nivel ORDER BY total DESC
      `).catch(() => []),
      this.dataSource.query(`
        SELECT nombre, "nivelFormacion" AS nivel, estado, facultad,
          (SELECT COUNT(*)::int FROM academic_work_plan."Asignatura" a WHERE a."programaId" = p.id) AS asignaturas,
          0 AS personas
        FROM academic_work_plan.programas p ORDER BY nombre LIMIT 20
      `).catch(() => []),
    ]);

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    const carpetaCoverage = totalPersonas > 0 ? (totalCarpetas / totalPersonas) * 100 : 0;
    const cetapCoverage = totalDocentes > 0 ? ((totalDocentes - docentesSinCetap) / totalDocentes) * 100 : 100;
    const avgDocentesPerTerr = totalTerritoriales > 0 ? totalDocentes / totalTerritoriales : 0;

    const ptaBorrador = ptasByEstado.find((r: any) => r.key === 'BORRADOR')?.cnt || 0;
    const ptaEnRevision = ptasByEstado.find((r: any) => ['EN_REVISION', 'REVISION'].includes(r.key))?.cnt || 0;
    const ptaAprobado = ptasByEstado.find((r: any) => r.key === 'APROBADO')?.cnt || 0;

    const certPendientes = (certByEstado.find((r: any) => ['PENDIENTE', 'pending'].includes(r.key))?.cnt || 0)
      + (certRequestsByEstado.find((r: any) => ['PENDIENTE', 'pending'].includes(r.key))?.cnt || 0);
    const certEmitidos = certByEstado.find((r: any) => ['EMITIDO', 'APROBADO', 'approved', 'issued'].includes(r.key))?.cnt || 0;

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
    [...personasTimeline, ...ptasTimeline].forEach((r: any) => allMonths.add(r.mes));
    const pMap: Record<string, number> = {};
    personasTimeline.forEach((r: any) => { pMap[r.mes] = +r.total; });
    const ptaMap: Record<string, number> = {};
    ptasTimeline.forEach((r: any) => { ptaMap[r.mes] = +r.total; });

    const timelineData = Array.from(allMonths).sort().slice(-12).map(key => {
      const [y, m] = key.split('-');
      return {
        name: `${monthNames[parseInt(m) - 1]}'${y?.slice(2)}`,
        Personas: pMap[key] || 0,
        Docentes: 0,
        Documentos: 0,
        PTAs: ptaMap[key] || 0,
      };
    });

    const alertas: any[] = [];
    if (docentesSinCetap > 0) alertas.push({ modulo: 'Estructura Organizacional', tipo: 'asignacion', descripcion: `${docentesSinCetap} docente(s) sin CETAP asignado`, cantidad: docentesSinCetap, severidad: docentesSinCetap > 100 ? 'critico' : docentesSinCetap > 30 ? 'alto' : 'medio', accion: 'estructura-organizacional' });
    if (ptaBorrador > 0) alertas.push({ modulo: 'PTA', tipo: 'borrador', descripcion: `${ptaBorrador} PTA(s) en borrador — requiere concertación`, cantidad: ptaBorrador, severidad: 'medio', accion: 'pta' });
    if (certPendientes > 0) alertas.push({ modulo: 'Certificados', tipo: 'emision', descripcion: `${certPendientes} certificado(s) pendientes de emisión`, cantidad: certPendientes, severidad: certPendientes > 20 ? 'alto' : 'medio', accion: 'certificate-requests' });

    const personasDelta = personasPrev30 > 0 ? ((personasLast30 - personasPrev30) / personasPrev30) * 100 : personasLast30 > 0 ? 100 : 0;

    const saludModulos = {
      personas: { score: totalPersonas > 0 ? 100 : 0, estado: totalPersonas > 0 ? 'optimo' : 'critico', factores: totalPersonas === 0 ? ['Sin personas'] : [], total: totalPersonas, activos: usuariosActivos },
      docentes: { score: Math.round(cetapCoverage), estado: cetapCoverage >= 80 ? 'optimo' : cetapCoverage >= 50 ? 'alerta' : 'critico', factores: docentesSinCetap > 0 ? [`${docentesSinCetap} sin CETAP`] : [], total: totalDocentes, sinCetap: docentesSinCetap },
      estructura: { score: totalTerritoriales > 0 ? 100 : 0, estado: totalTerritoriales > 0 ? 'optimo' : 'critico', factores: [], territoriales: totalTerritoriales, cetaps: totalCetaps },
      carpetaDigital: { score: Math.round(carpetaCoverage), estado: carpetaCoverage >= 90 ? 'optimo' : carpetaCoverage >= 70 ? 'bueno' : 'alerta', factores: carpetaCoverage < 100 && totalPersonas > 0 ? [`Cobertura: ${carpetaCoverage.toFixed(0)}%`] : [] },
      programas: { score: totalProgramas > 0 ? 80 : 0, estado: totalProgramas > 0 ? 'bueno' : 'critico', factores: totalProgramas === 0 ? ['Sin programas'] : [], total: totalProgramas },
      roles: { score: 100, estado: 'optimo', factores: [], total: totalRoles, sistema: rolesList.filter((r: any) => r.type === 'sistema').length, personalizados: rolesList.filter((r: any) => r.type !== 'sistema').length },
      certificados: { score: certPendientes === 0 ? 100 : 60, estado: certPendientes === 0 ? 'optimo' : 'alerta', factores: certPendientes > 0 ? [`${certPendientes} pendientes`] : [] },
    };

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        resumen: {
          totalPersonas, totalDocentes, totalTerritoriales, totalCetaps,
          totalProgramas, totalRoles, totalUsuarios, totalCarpetas,
          totalDocumentos: 0, totalAsignaturas, totalPTAs, totalCertificados,
          totalAuditLogs, totalAlertas: alertas.length, totalEvidencias,
          docentesSinCetap, totalCertificadosLaborales: totalCertificados,
        },
        saludGlobal: { score: healthScore, estado: healthScore >= 80 ? 'optimo' : healthScore >= 60 ? 'bueno' : healthScore >= 40 ? 'alerta' : 'critico', factores: healthFactors },
        saludModulos,
        alertas,
        eficiencia: {
          tasaPersonasActivas: totalUsuarios > 0 ? (usuariosActivos / totalUsuarios) * 100 : 0,
          tasaCarpetaCobertura: carpetaCoverage,
          tasaDocValidacion: 0,
          tasaCetapCobertura: cetapCoverage,
          promedioDocentesPorTerritorial: avgDocentesPerTerr,
          desviacionDocentesTerritorial: 0,
          promedioCetapsPorTerritorial: totalTerritoriales > 0 ? totalCetaps / totalTerritoriales : 0,
          promedioAsignaturasPorPrograma: totalProgramas > 0 ? totalAsignaturas / totalProgramas : 0,
          tasaPtaAprobacion: totalPTAs > 0 ? (ptaAprobado / totalPTAs) * 100 : 0,
          tasaCertEmision: totalCertificados > 0 ? (certEmitidos / totalCertificados) * 100 : 0,
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
        rangoEdad: {},
        documentosEstado: {},
        ptasEstado: this.toGroup(ptasByEstado),
        certificadosEstado: this.toGroup(certByEstado),
        carpetasEstado: this.toGroup(carpetasByEstado),
        auditModulo: this.toGroup(auditByModule),
        timelineData,
        ptaPipeline: { borrador: ptaBorrador, enRevision: ptaEnRevision, aprobado: ptaAprobado, total: totalPTAs },
        docsPipeline: { pendientes: 0, validados: 0, rechazados: 0, total: 0 },
        certPipeline: { pendientes: certPendientes, emitidos: certEmitidos, total: totalCertificados },
        programasDetalle: programasDetalle.map((p: any) => ({ nombre: p.nombre, nivel: p.nivel || '', estado: p.estado, facultad: p.facultad || '', asignaturas: +p.asignaturas, personas: 0 })),
        rolesDetalle: rolesList.map((r: any) => ({ nombre: r.name, isSystem: r.type === 'sistema', estado: 'ACTIVO', usuarios: +r.users_count, permisos: 0 })),
      },
    };
  }
}
