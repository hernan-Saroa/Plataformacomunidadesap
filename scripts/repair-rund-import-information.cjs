// Recuperación acotada e idempotente. Por defecto simula y revierte toda la transacción.
// No cambia territorialId, personas.id_seccional, roles, PTA, horas, salario ni estados.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { readExcel, readProfiles, clean, calendar, config } = require('./audit-rund-excel.cjs');
const root = path.resolve(__dirname, '../backend/academic-work-plan-service');
require(path.join(root, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(root, 'tsconfig.json') });
const { capturarDatosCarga } = require(path.join(root, 'src/pta/banco-docentes/rund-carga-original.ts'));

function previousDay(date) { return new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0,10); }

async function main() {
  const [file, period, mode] = process.argv.slice(2);
  if (!file || !/^\d{4}-[12]$/.test(period || '') || (mode && mode !== '--apply')) {
    throw new Error('Uso: node scripts/repair-rund-import-information.cjs archivo.xlsx periodo [--apply]');
  }
  assert(['localhost','127.0.0.1','::1'].includes(config.host), 'Solo se permite ejecutar sobre PostgreSQL local.');
  const source = readExcel(file), client = new Client(config);
  const docs = new Set(source.rows.map(row => clean(row.DOCUMENTO_IDENTIDAD)));
  assert.equal(docs.size, source.rows.length, 'El archivo tiene documentos repetidos.');
  const result = { modo: mode === '--apply' ? 'APLICADO' : 'SIMULACION_REVERTIDA', periodo: period, filasArchivo: source.rows.length,
    perfilesRecuperados: 0, fechasNacimientoCorregidas: 0, iniciosCorregidos: 0, finesCorregidos: 0, yaRecuperados: 0 };
  try {
    await client.connect(); await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query(fs.readFileSync(path.resolve(__dirname, '../db/migrations/429_preserve_rund_import_information.sql'), 'utf8'));
    await client.query('SELECT id FROM academic_work_plan."Docente" WHERE "periodoCarga"=$1 FOR UPDATE', [period]);
    const profiles = await readProfiles(client, period);
    const actions = [];
    for (const row of source.rows) {
      const matches = profiles.filter(p => clean(p.num_identificacion) === clean(row.DOCUMENTO_IDENTIDAD));
      assert.equal(matches.length, 1, 'No hay una coincidencia única en el periodo; no se aplica ninguna corrección.');
      const profile = matches[0];
      assert.equal(clean(profile.nom_largo), clean(row.NOMBRE_COMPLETO), 'El nombre no coincide; se requiere revisión.');
      // Huella de la carga: no basta la identidad para asignar un archivo a otro periodo.
      for (const [column, field] of Object.entries({ VINCULACION:'vinculacionDisplay', DEDICACION:'dedicacionDisplay', CATEGORIA_ESCALAFON:'escalafon',
        REGIMEN_NORMATIVO:'regimenNormativo', HORAS_PTA:'horasAsignables', ACTO_ADMINISTRATIVO:'actoAdministrativoVinculacion',
        NIVEL_FORMACION:'nivelFormacion', TITULO_PREGRADO:'pregrado', PERFIL_ACADEMICO:'perfilAcademico', ULTIMA_EVALUACION:'ultimaEvaluacion' })) {
        assert.equal(clean(profile[field]), clean(row[column]), `La huella de carga difiere en ${column}; no se modifica ningún registro.`);
      }
      const snapshot = capturarDatosCarga(row);
      if (profile.datosCargaMasiva) {
        assert.deepEqual(profile.datosCargaMasiva, snapshot, 'Ya existe un archivo diferente asociado al perfil.');
      }
      assert(!profile.territorialReportada || clean(profile.territorialReportada) === clean(row.TERRITORIAL), 'Existe otra territorial informativa.');
      const dates = {};
      for (const [column, field] of [['FECHA_NACIMIENTO','nacimiento'],['INICIO_VINCULACION','inicio'],['FIN_VINCULACION','fin']]) {
        const expected = calendar(row[column]), saved = profile[field];
        if (expected === saved) continue;
        assert(expected && saved === previousDay(expected), `La fecha ${column} no presenta el desfase conocido; se requiere revisión.`);
        dates[field] = expected;
      }
      if (!profile.datosCargaMasiva || !profile.territorialReportada || Object.keys(dates).length) actions.push({ profile, row, snapshot, dates });
      else result.yaRecuperados++;
    }
    let supportId;
    if (actions.length) {
      supportId = randomUUID();
      await client.query(`INSERT INTO academic_work_plan."RundCargaMasiva"
        (id,nombre_archivo,tipo_mime,tamano_bytes,sha256,contenido,actor_id,justificacion,estado,resumen)
        VALUES ($1,$2,$3,$4,$5,$6,'SISTEMA',$7,'COMPLETADA',$8)`,
        [supportId, path.basename(file), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fs.statSync(file).size,
          source.sha256, fs.readFileSync(file), 'Recuperación informativa solicitada del archivo RUND y corrección del desfase de fechas; sin modificar asignaciones PTA.',
          JSON.stringify({ tipo:'RECUPERACION_INFORMATIVA', periodo:period, registros:actions.length })]);
    }
    for (const { profile, row, snapshot, dates } of actions) {
      const birth = dates.nacimiento;
      if (birth) {
        const updated = await client.query('UPDATE auth.personas SET fec_nacimiento=$2::date WHERE id_person::text=$1 AND fec_nacimiento=$3::date',
          [profile.personaId, birth, profile.nacimiento]);
        assert.equal(updated.rowCount,1); result.fechasNacimientoCorregidas++;
      }
      const updated = await client.query(`UPDATE academic_work_plan."Docente"
        SET "territorialReportada"=$2, "datosCargaMasiva"=$3::jsonb,
          "fechaInicioVinculacion"=CASE WHEN $4::date IS NOT NULL THEN $4::date::timestamp ELSE "fechaInicioVinculacion" END,
          "fechaFinVinculacion"=CASE WHEN $5::date IS NOT NULL THEN $5::date::timestamp ELSE "fechaFinVinculacion" END
        WHERE id=$1 AND "periodoCarga"=$6`, [profile.id,row.TERRITORIAL,JSON.stringify(snapshot),dates.inicio||null,dates.fin||null,period]);
      assert.equal(updated.rowCount,1); result.perfilesRecuperados++;
      if (dates.inicio) result.iniciosCorregidos++; if (dates.fin) result.finesCorregidos++;
      const before = { territorialReportada:profile.territorialReportada, nacimiento:profile.nacimiento, inicio:profile.inicio, fin:profile.fin };
      const after = { territorialReportada:row.TERRITORIAL, ...dates, datosCargaMasiva:'[PROTEGIDO]' };
      await client.query(`INSERT INTO academic_work_plan."RundAprobacionLog"
        (id,docente_id,bloque,accion,actor_id,canal_origen,campo_afectado,dato_previo,dato_nuevo,observacion,soporte_id,metadata)
        VALUES ($1,$2,'GENERAL','RECUPERAR_DATOS_CARGA','SISTEMA','MASIVO','DATOS_CARGA_MASIVA',$3,$4,$5,$6,$7)`,
        [randomUUID(),profile.id,JSON.stringify(before),JSON.stringify(after),'Recuperación comprobada por identidad y huella de carga. Territorial solo informativa; fechas corregidas por desfase de un día.',
          supportId,JSON.stringify({ sha256:source.sha256,periodo:period,territorialIdSinCambios:profile.territorialId,asignacionesPtaModificadas:false })]);
    }
    const afterProfiles = await readProfiles(client, period);
    for (const before of profiles) {
      const after = afterProfiles.find(p=>p.id===before.id);
      for (const field of ['personaId','territorialId','sedeId','cetapId','horasAsignables','estado','puntajeSalarial','periodoCarga','idRund','tipoVinculacion','dedicacion']) {
        assert.deepEqual(after[field],before[field], `Se alteró un campo operativo: ${field}`);
      }
    }
    await client.query(mode === '--apply' ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify(result,null,2));
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
  finally { await client.end(); }
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
