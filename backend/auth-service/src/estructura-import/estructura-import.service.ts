import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstructuraExcelParserService } from './parsers/estructura-excel-parser.service';
import { GeograficoValidator } from './validators/geografico.validator';
import { ImportGeograficoResultDto } from './dto/import-geografico-result.dto';

@Injectable()
export class EstructuraImportService {
  private readonly logger = new Logger(EstructuraImportService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly excelParser: EstructuraExcelParserService,
  ) {}

  async importGeografico(
    buffer: Buffer,
    dryRun: boolean,
    skipInvalid: boolean = false,
    user?: any,
    periodo?: string,
  ): Promise<ImportGeograficoResultDto> {
    const startTime = Date.now();

    // 1. Parse Excel
    const { territoriales, cetaps } = this.excelParser.parseExcel(buffer);

    // 2. Validate G1-G7
    const validation = GeograficoValidator.validarPreInsert(territoriales, cetaps);
    
    const result = new ImportGeograficoResultDto();
    result.dry_run = dryRun;
    result.skip_invalid = skipInvalid;
    result.has_blocking_errors = validation.hasBlockingErrors;
    result.errores = validation.errors;
    result.advertencias = validation.warnings;

    // Determinar qué filas se van a procesar
    let dtToProcess = validation.isValid ? territoriales : validation.validTerritoriales;
    let cetapsToProcess = validation.isValid ? cetaps : validation.validCetaps;

    // Si hay errores bloqueantes globales (G7), no se puede importar nada
    if (validation.hasBlockingErrors) {
      result.success = false;
      result.preview_territoriales = territoriales;
      result.preview_cetaps = cetaps;
      result.omitidas_territoriales = validation.invalidTerritoriales;
      result.omitidas_cetaps = validation.invalidCetaps;
      result.carga.direcciones_territoriales.creados = 0;
      result.carga.direcciones_territoriales.omitidos = validation.invalidTerritoriales.length;
      result.carga.cetaps.creados = 0;
      result.carga.cetaps.omitidos = validation.invalidCetaps.length;
      result.tiempo_ms = Date.now() - startTime;
      
      if (!dryRun) {
        throw new BadRequestException({
          success: false,
          message: 'Hay errores bloqueantes que impiden la importación. Corrija el archivo y reintente.',
          errores: validation.errors,
          advertencias: validation.warnings,
          has_blocking_errors: true,
        });
      }
      return result;
    }

    // Si hay errores NO bloqueantes y NO se pidió skip_invalid y NO es dry_run → bloquear
    if (!validation.isValid && !skipInvalid && !dryRun) {
      throw new BadRequestException({
        success: false,
        message: `El archivo tiene ${validation.errors.length} error(es). Use "Importar Solo Válidos" para cargar las filas correctas, o corrija el archivo.`,
        errores: validation.errors,
        advertencias: validation.warnings,
        has_blocking_errors: false,
        valid_count: {
          territoriales: validation.validTerritoriales.length,
          cetaps: validation.validCetaps.length,
        },
        invalid_count: {
          territoriales: validation.invalidTerritoriales.length,
          cetaps: validation.invalidCetaps.length,
        },
      });
    }

    // Si no hay errores, usar todas las filas
    if (validation.isValid) {
      dtToProcess = territoriales;
      cetapsToProcess = cetaps;
    }

    // Calcular indicadores
    const cetapsPorTipo: Record<string, number> = {};
    const cetapsPorDt: Record<string, number> = {};

    for (const c of cetapsToProcess) {
      cetapsPorTipo[c.tipo] = (cetapsPorTipo[c.tipo] || 0) + 1;
      const dtName = c.nombre_dt.toUpperCase();
      cetapsPorDt[dtName] = (cetapsPorDt[dtName] || 0) + 1;
    }

    result.indicadores.cetaps_por_tipo = cetapsPorTipo;
    result.indicadores.cetaps_por_dt = cetapsPorDt;

    // Detectar duplicados consultando la BD — comparación campo por campo
    const existingDtRows = await this.dataSource.query(
      'SELECT codigo, nombre, nombre_normalizado, orden_visualizacion, activo FROM academic_work_plan.direccion_territorial'
    );
    const existingDtMap = new Map<string, any>();
    for (const r of existingDtRows) {
      existingDtMap.set(r.codigo, r);
    }

    const existingCetapRows = await this.dataSource.query(
      'SELECT codigo, nombre, nombre_normalizado, tipo, latitud, longitud, activo FROM academic_work_plan.cetap'
    );
    const existingCetapMap = new Map<string, any>();
    for (const r of existingCetapRows) {
      existingCetapMap.set(r.codigo, r);
    }

    // Clasificar DTs: nuevos, modificados, idénticos
    const newDts: any[] = [];
    const modifiedDts: any[] = [];
    const identicalDts: any[] = [];
    for (const dt of dtToProcess) {
      const existing = existingDtMap.get(dt.codigo_dt);
      if (!existing) {
        newDts.push(dt);
      } else {
        const hasChange =
          existing.nombre !== dt.nombre_dt ||
          existing.nombre_normalizado !== dt.nombre_normalizado ||
          existing.orden_visualizacion !== dt.orden_visualizacion ||
          existing.activo !== dt.activo;
        if (hasChange) modifiedDts.push({ ...dt, _cambios: this.diffFields(existing, dt, 'dt') });
        else identicalDts.push(dt);
      }
    }

    // Clasificar CETAPs: nuevos, modificados, idénticos
    const newCetaps: any[] = [];
    const modifiedCetaps: any[] = [];
    const identicalCetaps: any[] = [];
    for (const c of cetapsToProcess) {
      const existing = existingCetapMap.get(c.codigo_cetap);
      if (!existing) {
        newCetaps.push(c);
      } else {
        const hasChange =
          existing.nombre !== c.nombre_cetap ||
          existing.nombre_normalizado !== c.nombre_normalizado ||
          existing.tipo !== c.tipo ||
          existing.activo !== c.activo;
        if (hasChange) modifiedCetaps.push({ ...c, _cambios: this.diffFields(existing, c, 'cetap') });
        else identicalCetaps.push(c);
      }
    }

    const allIdentical = (identicalDts.length > 0 || identicalCetaps.length > 0) && newDts.length === 0 && newCetaps.length === 0 && modifiedDts.length === 0 && modifiedCetaps.length === 0;

    // Populate result counts
    result.carga.direcciones_territoriales.creados = newDts.length;
    result.carga.direcciones_territoriales.actualizados = modifiedDts.length;
    result.carga.direcciones_territoriales.omitidos = validation.invalidTerritoriales.length + identicalDts.length;
    result.carga.cetaps.creados = newCetaps.length;
    result.carga.cetaps.actualizados = modifiedCetaps.length;
    result.carga.cetaps.omitidos = validation.invalidCetaps.length + identicalCetaps.length;
    result.omitidas_territoriales = validation.invalidTerritoriales;
    result.omitidas_cetaps = validation.invalidCetaps;

    // Resumen detallado de duplicados
    (result as any).analisis_duplicados = {
      territoriales: { nuevos: newDts.length, modificados: modifiedDts.length, identicos: identicalDts.length },
      cetaps: { nuevos: newCetaps.length, modificados: modifiedCetaps.length, identicos: identicalCetaps.length },
      total_identicos: identicalDts.length + identicalCetaps.length,
      total_modificados: modifiedDts.length + modifiedCetaps.length,
      total_nuevos: newDts.length + newCetaps.length,
      todo_identico: allIdentical,
      cambios_detectados: [...modifiedDts.map((d: any) => ({ tipo: 'DT', codigo: d.codigo_dt, cambios: d._cambios })), ...modifiedCetaps.map((c: any) => ({ tipo: 'CETAP', codigo: c.codigo_cetap, cambios: c._cambios }))],
    };

    if (dryRun) {
      // Si TODO es idéntico, bloquear
      if (allIdentical) {
        (result as any).blocked_reason = 'ALL_IDENTICAL';
        result.success = true; // Data is valid, just nothing new
      } else {
        result.success = validation.isValid || (skipInvalid && !validation.hasBlockingErrors);
      }
      result.tiempo_ms = Date.now() - startTime;
      // Siempre mostrar TODOS los datos en el preview
      result.preview_territoriales = dtToProcess;
      result.preview_cetaps = cetapsToProcess;
      return result;
    }

    // Si todo es idéntico, no ejecutar la transacción
    if (allIdentical) {
      result.success = true;
      result.tiempo_ms = Date.now() - startTime;
      (result as any).blocked_reason = 'ALL_IDENTICAL';
      result.preview_territoriales = dtToProcess;
      result.preview_cetaps = cetapsToProcess;
      return result;
    }

    // Solo procesar nuevos y modificados (no idénticos)
    const dtsToUpsert = [...newDts, ...modifiedDts];
    const cetapsToUpsert = [...newCetaps, ...modifiedCetaps];

    // 3. Ejecutar transacción con las filas válidas
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let dtCreatedCount = 0;
    let dtUpdatedCount = 0;
    let cetapCreatedCount = 0;
    let cetapUpdatedCount = 0;

    try {
      // a. Insertar/Actualizar Direcciones Territoriales (solo nuevos y modificados)
      for (const dt of dtsToUpsert) {
        const isNew = !existingDtMap.has(dt.codigo_dt);
        const SQL = `
          INSERT INTO academic_work_plan.direccion_territorial (
            codigo, nombre, nombre_normalizado, orden_visualizacion, activo
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            nombre_normalizado = EXCLUDED.nombre_normalizado,
            orden_visualizacion = EXCLUDED.orden_visualizacion,
            activo = EXCLUDED.activo,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id;
        `;
        await queryRunner.query(SQL, [
          dt.codigo_dt,
          dt.nombre_dt,
          dt.nombre_normalizado,
          dt.orden_visualizacion,
          dt.activo
        ]);
        
        // Sync to auth.seccionales
        const existingSec = await queryRunner.query('SELECT id_seccional FROM auth.seccionales WHERE cod_seccional = $1 LIMIT 1', [dt.codigo_dt]);
        if (existingSec.length > 0) {
          await queryRunner.query('UPDATE auth.seccionales SET nom_seccional = $1, usu_actualizacion = $2, fec_ult_act = CURRENT_TIMESTAMP WHERE id_seccional = $3', [dt.nombre_dt, 'sistema', existingSec[0].id_seccional]);
        } else {
          const maxSec = await queryRunner.query('SELECT MAX(id_seccional) as max_id FROM auth.seccionales');
          const nextSecId = (parseInt(maxSec[0]?.max_id) || 0) + 1;
          await queryRunner.query('INSERT INTO auth.seccionales (id_seccional, cod_seccional, nom_seccional, usu_creacion) VALUES ($1, $2, $3, $4)', [nextSecId, dt.codigo_dt, dt.nombre_dt, 'sistema']);
        }

        if (isNew) dtCreatedCount++;
        else dtUpdatedCount++;
      }

      // Obtener los IDs de DTs insertadas/actualizadas para mapear
      const dtRows = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.direccion_territorial');
      const dtIdMap = new Map<string, string>();
      for (const row of dtRows) {
        dtIdMap.set(row.codigo, row.id);
      }

      // b. Insertar CETAPs (solo nuevos y modificados)
      for (const c of cetapsToUpsert) {
        const dtId = dtIdMap.get(c.codigo_dt);
        if (!dtId) {
          this.logger.warn(`Omitiendo CETAP ${c.codigo_cetap}: No se encontró DT ${c.codigo_dt} en BD`);
          continue;
        }

        const SQL = `
          INSERT INTO academic_work_plan.cetap (
            codigo, nombre, nombre_normalizado, id_direccion_territorial,
            tipo, latitud, longitud, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            nombre_normalizado = EXCLUDED.nombre_normalizado,
            id_direccion_territorial = EXCLUDED.id_direccion_territorial,
            tipo = EXCLUDED.tipo,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            activo = EXCLUDED.activo,
            updated_at = CURRENT_TIMESTAMP
        `;
        await queryRunner.query(SQL, [
          c.codigo_cetap,
          c.nombre_cetap,
          c.nombre_normalizado,
          dtId,
          c.tipo,
          c.latitud,
          c.longitud,
          c.activo
        ]);

        // Find auth.seccionales ID
        const secRows = await queryRunner.query('SELECT id_seccional FROM auth.seccionales WHERE cod_seccional = $1 LIMIT 1', [c.codigo_dt]);
        const idSeccional = secRows.length > 0 ? secRows[0].id_seccional : null;
        
        // Sync to auth.sedes
        const sedeAct = c.activo ? 'ACTIVO' : 'INACTIVO';
        const existingSede = await queryRunner.query('SELECT id_sede FROM auth.sedes WHERE cod_sede = $1 LIMIT 1', [c.codigo_cetap]);
        if (existingSede.length > 0) {
          await queryRunner.query('UPDATE auth.sedes SET nom_sede = $1, id_seccional = $2, sede_act = $3, usu_actualizacion = $4, fec_ult_act = CURRENT_TIMESTAMP WHERE id_sede = $5', [c.nombre_cetap, idSeccional, sedeAct, 'sistema', existingSede[0].id_sede]);
        } else {
          const maxSede = await queryRunner.query('SELECT MAX(id_sede) as max_id FROM auth.sedes');
          const nextSedeId = (parseInt(maxSede[0]?.max_id) || 0) + 1;
          await queryRunner.query('INSERT INTO auth.sedes (id_sede, cod_sede, nom_sede, id_seccional, id_empresa, id_geopolitica, sede_act, usu_creacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [nextSedeId, c.codigo_cetap, c.nombre_cetap, idSeccional, 1, 172, sedeAct, 'sistema']);
        }

        if (!existingCetapMap.has(c.codigo_cetap)) cetapCreatedCount++;
        else cetapUpdatedCount++;
      }

      // Sincronizar con el periodo académico si fue proporcionado
      if (periodo) {
        await queryRunner.query('SAVEPOINT periodo_sync');
        try {
          const periodRows = await queryRunner.query(
            'SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1', [periodo]
          );
          if (periodRows.length > 0) {
            const periodId = periodRows[0].id;

            // Crear tabla periodo_cetap si no existe
            await queryRunner.query(`
              CREATE TABLE IF NOT EXISTS academic_work_plan.periodo_cetap (
                id BIGSERIAL PRIMARY KEY,
                id_periodo_academico BIGINT NOT NULL REFERENCES academic_work_plan.periodo_academico(id),
                id_cetap BIGINT NOT NULL REFERENCES academic_work_plan.cetap(id),
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(id_periodo_academico, id_cetap)
              )
            `);

            // Asociar todos los CETAPs activos al periodo
            const allCetaps = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.cetap WHERE activo = true');
            for (const cetap of allCetaps) {
              await queryRunner.query(
                `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo)
                 VALUES ($1, $2, TRUE)
                 ON CONFLICT (id_periodo_academico, id_cetap) DO UPDATE SET activo = TRUE`,
                [periodId, cetap.id]
              );
            }

            // Desactivar CETAPs que ya no están activos en este periodo
            const activeCetapIds = allCetaps.map((c: any) => c.id);
            if (activeCetapIds.length > 0) {
              await queryRunner.query(
                `UPDATE academic_work_plan.periodo_cetap SET activo = FALSE
                 WHERE id_periodo_academico = $1 AND id_cetap NOT IN (${activeCetapIds.map((_: any, i: number) => '$' + (i + 2)).join(',')})`,
                [periodId, ...activeCetapIds]
              );
            }

            this.logger.log(`Sincronizados ${allCetaps.length} CETAPs activos con periodo ${periodo}`);
          } else {
            this.logger.warn(`Periodo "${periodo}" no encontrado. Se omite sincronización.`);
          }
          await queryRunner.query('RELEASE SAVEPOINT periodo_sync');
        } catch (periodoError: any) {
          await queryRunner.query('ROLLBACK TO SAVEPOINT periodo_sync');
          this.logger.warn(`Error sincronizando periodo "${periodo}": ${periodoError.message}. Importación continúa.`);
        }
      }

      await queryRunner.commitTransaction();
      result.success = true;

    } catch (error: any) {
      this.logger.error(`Error en la transacción de importación geográfica: ${error.message}`, error.stack);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException({
        success: false,
        message: 'Error al persistir la estructura geográfica en la base de datos.',
        errores: [error.message],
      });
    } finally {
      await queryRunner.release();
    }

    result.carga.direcciones_territoriales.creados = dtCreatedCount;
    result.carga.direcciones_territoriales.actualizados = dtUpdatedCount;
    result.carga.cetaps.creados = cetapCreatedCount;
    result.carga.cetaps.actualizados = cetapUpdatedCount;
    result.tiempo_ms = Date.now() - startTime;
    return result;
  }

  // Helper: comparar campos y retornar diferencias
  private diffFields(existing: any, incoming: any, type: 'dt' | 'cetap'): string[] {
    const diffs: string[] = [];
    if (type === 'dt') {
      if (existing.nombre !== incoming.nombre_dt) diffs.push(`nombre: "${existing.nombre}" → "${incoming.nombre_dt}"`);
      if (existing.nombre_normalizado !== incoming.nombre_normalizado) diffs.push(`normalizado: "${existing.nombre_normalizado}" → "${incoming.nombre_normalizado}"`);
      if (existing.orden_visualizacion !== incoming.orden_visualizacion) diffs.push(`orden: ${existing.orden_visualizacion} → ${incoming.orden_visualizacion}`);
      if (existing.activo !== incoming.activo) diffs.push(`activo: ${existing.activo} → ${incoming.activo}`);
    } else {
      if (existing.nombre !== incoming.nombre_cetap) diffs.push(`nombre: "${existing.nombre}" → "${incoming.nombre_cetap}"`);
      if (existing.nombre_normalizado !== incoming.nombre_normalizado) diffs.push(`normalizado: "${existing.nombre_normalizado}" → "${incoming.nombre_normalizado}"`);
      if (existing.tipo !== incoming.tipo) diffs.push(`tipo: "${existing.tipo}" → "${incoming.tipo}"`);
      if (existing.activo !== incoming.activo) diffs.push(`activo: ${existing.activo} → ${incoming.activo}`);
    }
    return diffs;
  }

  async getStatus() {
    const counts = await this.dataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM academic_work_plan.direccion_territorial) AS dts,
        (SELECT COUNT(*) FROM academic_work_plan.cetap) AS cetaps
    `);

    const stats = counts[0] || {};
    return {
      success: true,
      direcciones_territoriales: parseInt(stats.dts || 0, 10),
      cetaps: parseInt(stats.cetaps || 0, 10),
      isReady: parseInt(stats.dts || 0, 10) >= 17 && parseInt(stats.cetaps || 0, 10) >= 288
    };
  }
}
