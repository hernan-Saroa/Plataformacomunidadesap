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
    user?: any,
  ): Promise<ImportGeograficoResultDto> {
    const startTime = Date.now();

    // 1. Parse Excel
    const { territoriales, cetaps } = this.excelParser.parseExcel(buffer);

    // 2. Validate G1-G7
    const validation = GeograficoValidator.validarPreInsert(territoriales, cetaps);
    
    const result = new ImportGeograficoResultDto();
    result.dry_run = dryRun;

    if (!validation.isValid) {
      if (dryRun) {
        result.success = false;
        result.errores = validation.errors;
        result.preview_territoriales = territoriales;
        result.preview_cetaps = cetaps;
        result.tiempo_ms = Date.now() - startTime;
        result.carga.direcciones_territoriales.creados = territoriales.length;
        result.carga.cetaps.creados = cetaps.length;
        return result;
      } else {
        throw new BadRequestException({
          success: false,
          message: 'Validación del Excel fallida (Reglas G1-G7).',
          errores: validation.errors,
        });
      }
    }

    // Calcular indicadores
    const cetapsPorTipo: Record<string, number> = {};
    const cetapsPorDt: Record<string, number> = {};

    for (const c of cetaps) {
      cetapsPorTipo[c.tipo] = (cetapsPorTipo[c.tipo] || 0) + 1;
      const dtName = c.nombre_dt.toUpperCase();
      cetapsPorDt[dtName] = (cetapsPorDt[dtName] || 0) + 1;
    }

    result.indicadores.cetaps_por_tipo = cetapsPorTipo;
    result.indicadores.cetaps_por_dt = cetapsPorDt;

    if (dryRun) {
      result.success = true;
      result.tiempo_ms = Date.now() - startTime;
      result.carga.direcciones_territoriales.creados = territoriales.length;
      result.carga.cetaps.creados = cetaps.length;
      result.preview_territoriales = territoriales;
      result.preview_cetaps = cetaps;
      return result;
    }

    // 3. Ejecutar transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // a. Insertar Direcciones Territoriales
      for (const dt of territoriales) {
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

        result.carga.direcciones_territoriales.creados++;
      }

      // Obtener los IDs de DTs insertadas/actualizadas para mapear
      const dtRows = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.direccion_territorial');
      const dtIdMap = new Map<string, string>();
      for (const row of dtRows) {
        dtIdMap.set(row.codigo, row.id);
      }

      // b. Insertar CETAPs
      for (const c of cetaps) {
        const dtId = dtIdMap.get(c.codigo_dt);
        if (!dtId) {
          throw new BadRequestException(`No se encontró el ID de la DT ${c.codigo_dt} al insertar CETAP ${c.codigo_cetap}`);
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

        result.carga.cetaps.creados++;
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

    result.tiempo_ms = Date.now() - startTime;
    return result;
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
