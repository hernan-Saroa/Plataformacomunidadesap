import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { EstructuraExcelParserService } from './parsers/estructura-excel-parser.service';
import { GeograficoValidator } from './validators/geografico.validator';
import { ImportGeograficoResultDto } from './dto/import-geografico-result.dto';

interface LegacySyncPlan {
  seccionalByDtCode: Map<string, any | null>;
  sedeByCetapCode: Map<string, any | null>;
  summary: ImportGeograficoResultDto['sincronizacion_legacy'];
  errors: string[];
}

@Injectable()
export class EstructuraImportService {
  private readonly logger = new Logger(EstructuraImportService.name);
  private readonly legacyTerritorialAliases: Record<string, string[]> = {
    SC: ['SC', 'SCENT'],
    'DT-001': ['ANT'],
    'DT-002': ['ATL'],
    'DT-003': ['BCS', 'BOL'],
    'DT-004': ['BOY'],
    'DT-005': ['CAL'],
    'DT-006': ['CAU'],
    'DT-007': ['CHO'],
    'DT-008': ['CUN'],
    'DT-009': ['HUI'],
    'DT-010': ['MET'],
    'DT-011': ['NAR'],
    'DT-012': ['NSA', 'NDS'],
    'DT-013': ['RIS'],
    'DT-014': ['SAN'],
    'DT-015': ['TOL'],
    'DT-016': ['VAL'],
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly excelParser: EstructuraExcelParserService,
  ) {}

  getTemplateBuffer(): Buffer {
    const fileName =
      '03062026 - CARGA_1_TERRITORIALES_CETAPS_DATOS.xlsx';
    const candidates = [
      process.env.ESTRUCTURA_GEOGRAFICA_TEMPLATE_PATH,
      path.resolve(process.cwd(), 'Plantillas', fileName),
      path.resolve(process.cwd(), '..', '..', 'Plantillas', fileName),
      path.resolve(__dirname, '..', '..', '..', '..', 'Plantillas', fileName),
    ].filter((candidate): candidate is string => Boolean(candidate));

    const templatePath = candidates.find((candidate) =>
      fs.existsSync(candidate),
    );
    if (!templatePath) {
      throw new BadRequestException(
        'La plantilla institucional de estructura geográfica no está disponible en este despliegue.',
      );
    }
    return fs.readFileSync(templatePath);
  }

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

    const legacyPlan = await this.buildLegacySyncPlan(
      dtToProcess,
      cetapsToProcess,
    );
    result.sincronizacion_legacy = legacyPlan.summary;
    const periodSync = await this.analyzePeriodSync(periodo);
    (result as any).sincronizacion_periodo = periodSync;

    if (legacyPlan.errors.length > 0 || periodSync.error) {
      result.success = false;
      result.preview_territoriales = dtToProcess;
      result.preview_cetaps = cetapsToProcess;
      result.tiempo_ms = Date.now() - startTime;
      result.errores.push(
        ...legacyPlan.errors.map((message) => ({
          hoja: 'SINCRONIZACION_LEGACY',
          mensaje: message,
          severity: 'error' as const,
        })),
      );
      if (periodSync.error) {
        result.errores.push({
          hoja: 'PERIODO_ACADEMICO',
          mensaje: periodSync.error,
          severity: 'error',
        });
      }

      if (!dryRun) {
        throw new BadRequestException({
          success: false,
          message:
            'La estructura nueva es válida, pero existen ambigüedades en la estructura organizacional actual.',
          errores: result.errores,
        });
      }
      return result;
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

    const legacyHasChanges =
      legacyPlan.summary.seccionales.creadas > 0 ||
      legacyPlan.summary.seccionales.actualizadas > 0 ||
      legacyPlan.summary.sedes.creadas > 0 ||
      legacyPlan.summary.sedes.actualizadas > 0;
    const allIdentical =
      (identicalDts.length > 0 || identicalCetaps.length > 0) &&
      newDts.length === 0 &&
      newCetaps.length === 0 &&
      modifiedDts.length === 0 &&
      modifiedCetaps.length === 0 &&
      !legacyHasChanges &&
      !periodSync.required;

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
      await queryRunner.query(
        `SELECT pg_advisory_xact_lock(hashtext('estructura-geografica-import'))`,
      );

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

        if (isNew) dtCreatedCount++;
        else dtUpdatedCount++;
      }

      const legacySeccionalIdByDt = new Map<string, string>();
      let nextSeccionalId = await this.getNextLegacyId(
        queryRunner,
        'auth.seccionales',
        'id_seccional',
      );

      for (const dt of dtToProcess) {
        const matched = legacyPlan.seccionalByDtCode.get(dt.codigo_dt);
        let idSeccional: string;
        if (matched) {
          idSeccional = String(matched.id_seccional);
          await queryRunner.query(
            `UPDATE auth.seccionales
             SET cod_seccional = $1,
                 nom_seccional = $2,
                 usu_actualizacion = 'sistema',
                 fec_ult_act = CURRENT_DATE
             WHERE id_seccional = $3`,
            [dt.codigo_dt, this.formatLegacyTerritorialName(dt.nombre_dt), idSeccional],
          );
        } else {
          idSeccional = String(nextSeccionalId++);
          await queryRunner.query(
            `INSERT INTO auth.seccionales (
               id_seccional, cod_seccional, nom_seccional,
               fec_creacion, usu_creacion
             ) VALUES ($1, $2, $3, CURRENT_DATE, 'sistema')`,
            [idSeccional, dt.codigo_dt, this.formatLegacyTerritorialName(dt.nombre_dt)],
          );
        }
        legacySeccionalIdByDt.set(dt.codigo_dt, idSeccional);
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

        if (!existingCetapMap.has(c.codigo_cetap)) cetapCreatedCount++;
        else cetapUpdatedCount++;
      }

      let nextSedeId = await this.getNextLegacyId(
        queryRunner,
        'auth.sedes',
        'id_sede',
      );

      for (const c of cetapsToProcess) {
        const idSeccional = legacySeccionalIdByDt.get(c.codigo_dt);
        if (!idSeccional) {
          throw new Error(
            `No se pudo resolver la territorial ${c.codigo_dt} para el CETAP ${c.codigo_cetap}.`,
          );
        }

        const matched = legacyPlan.sedeByCetapCode.get(c.codigo_cetap);
        const sedeAct = c.activo ? 'ACTIVO' : 'INACTIVO';
        let idSede: string;
        if (matched) {
          idSede = String(matched.id_sede);
          const oldCode = String(matched.cod_sede || '').trim();
          await queryRunner.query(
            `UPDATE auth.sedes
             SET cod_sede = $1,
                 nom_sede = $2,
                 id_seccional = $3,
                 sede_act = $4,
                 num_latitud = $5,
                 num_longitud = $6,
                 cod_atributo = COALESCE(
                   NULLIF(BTRIM(cod_atributo), ''),
                   NULLIF($7, '')
                 ),
                 usu_actualizacion = 'sistema',
                 fec_ult_act = CURRENT_DATE
             WHERE id_sede = $8`,
            [
              c.codigo_cetap,
              c.nombre_cetap,
              idSeccional,
              sedeAct,
              c.latitud,
              c.longitud,
              oldCode && oldCode !== c.codigo_cetap
                ? oldCode.slice(0, 10)
                : '',
              idSede,
            ],
          );
        } else {
          idSede = String(nextSedeId++);
          await queryRunner.query(
            `INSERT INTO auth.sedes (
               id_sede, id_empresa, cod_sede, nom_sede,
               id_geopolitica, id_seccional, sede_act,
               num_latitud, num_longitud, fec_creacion, usu_creacion
             ) VALUES ($1, 1, $2, $3, 172, $4, $5, $6, $7, CURRENT_DATE, 'sistema')`,
            [
              idSede,
              c.codigo_cetap,
              c.nombre_cetap,
              idSeccional,
              sedeAct,
              c.latitud,
              c.longitud,
            ],
          );
        }

        await queryRunner.query(
          `INSERT INTO auth.sede_cetap_mapping (
             id_sede, id_cetap, origen, created_at, updated_at
           )
           SELECT $1, cetap.id, 'official', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             FROM academic_work_plan.cetap cetap
            WHERE cetap.codigo = $2
           ON CONFLICT (id_sede)
           DO UPDATE SET
             id_cetap = EXCLUDED.id_cetap,
             origen = 'official',
             updated_at = CURRENT_TIMESTAMP`,
          [idSede, c.codigo_cetap],
        );
      }

      // Sincronizar con los periodos académicos.
      if (periodo) {
        const periodRows = await queryRunner.query(
          'SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1',
          [periodo],
        );
        if (periodRows.length === 0) {
          throw new Error(
            `El periodo académico "${periodo}" no existe. No se realizó ningún cambio.`,
          );
        }

        // Los CETAP del catálogo quedan disponibles (ACTIVOS) en TODOS los periodos,
        // no solo en el periodo activo. Cada periodo es independiente: solo se INSERTA
        // cuando la fila no existe (ON CONFLICT DO NOTHING), de modo que NO se pisan
        // las inactivaciones manuales que ya se hayan hecho en cada periodo.
        await queryRunner.query(
          `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo)
           SELECT pa.id, c.id, TRUE
             FROM academic_work_plan.periodo_academico pa
             CROSS JOIN academic_work_plan.cetap c
            WHERE c.activo = TRUE
           ON CONFLICT (id_periodo_academico, id_cetap) DO NOTHING`,
        );
      }

      const postValidation = await queryRunner.query(
        `SELECT
           (SELECT COUNT(DISTINCT codigo)
              FROM academic_work_plan.direccion_territorial
             WHERE codigo = ANY($1::text[])) AS catalog_dts,
           (SELECT COUNT(DISTINCT codigo)
              FROM academic_work_plan.cetap
             WHERE codigo = ANY($2::text[])) AS catalog_cetaps,
           (SELECT COUNT(DISTINCT cod_seccional)
              FROM auth.seccionales
             WHERE cod_seccional = ANY($1::text[])) AS legacy_dts,
           (SELECT COUNT(DISTINCT cod_sede)
              FROM auth.sedes
             WHERE cod_sede = ANY($2::text[])) AS legacy_cetaps`,
        [
          dtToProcess.map((dt) => dt.codigo_dt),
          cetapsToProcess.map((cetap) => cetap.codigo_cetap),
        ],
      );
      const post = postValidation[0] || {};
      if (
        Number(post.catalog_dts) !== dtToProcess.length ||
        Number(post.catalog_cetaps) !== cetapsToProcess.length ||
        Number(post.legacy_dts) !== dtToProcess.length ||
        Number(post.legacy_cetaps) !== cetapsToProcess.length
      ) {
        throw new Error(
          'La verificación final de sincronización no coincidió con el archivo. Se revirtieron todos los cambios.',
        );
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

  private async analyzePeriodSync(
    periodo?: string,
  ): Promise<{
    periodo: string | null;
    required: boolean;
    activos_catalogo: number;
    activos_periodo: number;
    error?: string;
  }> {
    if (!periodo) {
      return {
        periodo: null,
        required: false,
        activos_catalogo: 0,
        activos_periodo: 0,
      };
    }

    const rows = await this.dataSource.query(
      `SELECT
         p.id,
         (SELECT COUNT(*)
            FROM academic_work_plan.cetap c
           WHERE c.activo = TRUE) AS activos_catalogo,
         (SELECT COUNT(*)
            FROM academic_work_plan.periodo_cetap pc
            INNER JOIN academic_work_plan.cetap c ON c.id = pc.id_cetap
           WHERE pc.id_periodo_academico = p.id
             AND pc.activo = TRUE
             AND c.activo = TRUE) AS activos_periodo,
         (SELECT COUNT(*)
            FROM academic_work_plan.periodo_cetap pc
            INNER JOIN academic_work_plan.cetap c ON c.id = pc.id_cetap
           WHERE pc.id_periodo_academico = p.id
             AND pc.activo = TRUE
             AND c.activo = FALSE) AS activos_incorrectos
       FROM academic_work_plan.periodo_academico p
       WHERE p.codigo = $1
       LIMIT 1`,
      [periodo],
    );

    if (rows.length === 0) {
      return {
        periodo,
        required: false,
        activos_catalogo: 0,
        activos_periodo: 0,
        error: `El periodo académico "${periodo}" no existe.`,
      };
    }

    const activosCatalogo = Number(rows[0].activos_catalogo || 0);
    const activosPeriodo = Number(rows[0].activos_periodo || 0);
    const activosIncorrectos = Number(rows[0].activos_incorrectos || 0);
    return {
      periodo,
      required:
        activosCatalogo !== activosPeriodo || activosIncorrectos > 0,
      activos_catalogo: activosCatalogo,
      activos_periodo: activosPeriodo,
    };
  }

  private async buildLegacySyncPlan(
    territoriales: any[],
    cetaps: any[],
  ): Promise<LegacySyncPlan> {
    const seccionales = await this.dataSource.query(
      `SELECT id_seccional, cod_seccional, nom_seccional
         FROM auth.seccionales`,
    );
    const sedes = await this.dataSource.query(
      `SELECT id_sede, cod_sede, nom_sede, id_seccional,
              sede_act, num_latitud, num_longitud
         FROM auth.sedes`,
    );

    const seccionalByDtCode = new Map<string, any | null>();
    const sedeByCetapCode = new Map<string, any | null>();
    const errors: string[] = [];
    const selectedSeccionalIds = new Set<string>();

    const bySecCode = new Map<string, any>();
    for (const seccional of seccionales) {
      const code = String(seccional.cod_seccional || '').trim().toUpperCase();
      if (code) bySecCode.set(code, seccional);
    }

    let secCreated = 0;
    let secUpdated = 0;
    let secUnchanged = 0;

    for (const dt of territoriales) {
      const code = dt.codigo_dt.toUpperCase();
      const aliases = [
        code,
        ...(this.legacyTerritorialAliases[code] || []),
      ];
      let matched: any | null = null;

      for (const alias of aliases) {
        const candidate = bySecCode.get(alias.toUpperCase());
        if (
          candidate &&
          !selectedSeccionalIds.has(String(candidate.id_seccional))
        ) {
          matched = candidate;
          break;
        }
      }

      if (!matched) {
        const candidates = seccionales.filter(
          (row: any) =>
            !selectedSeccionalIds.has(String(row.id_seccional)) &&
            this.normalizeLegacyName(row.nom_seccional) ===
              this.normalizeLegacyName(dt.nombre_dt),
        );
        if (candidates.length === 1) {
          matched = candidates[0];
        } else if (candidates.length > 1) {
          errors.push(
            `La territorial ${dt.codigo_dt} (${dt.nombre_dt}) coincide con varias seccionales existentes.`,
          );
        }
      }

      seccionalByDtCode.set(dt.codigo_dt, matched);
      if (!matched) {
        secCreated++;
        continue;
      }

      selectedSeccionalIds.add(String(matched.id_seccional));
      const expectedName = this.formatLegacyTerritorialName(dt.nombre_dt);
      if (
        String(matched.cod_seccional || '').trim() !== dt.codigo_dt ||
        String(matched.nom_seccional || '').trim() !== expectedName
      ) {
        secUpdated++;
      } else {
        secUnchanged++;
      }
    }

    const sedesByCode = new Map<string, any>();
    for (const sede of sedes) {
      const code = String(sede.cod_sede || '').trim().toUpperCase();
      if (code) sedesByCode.set(code, sede);
    }

    const selectedSedeIds = new Set<string>();
    let sedeCreated = 0;
    let sedeUpdated = 0;
    let sedeUnchanged = 0;

    for (const cetap of cetaps) {
      const targetSec = seccionalByDtCode.get(cetap.codigo_dt);
      const targetSecId = targetSec
        ? String(targetSec.id_seccional)
        : `NEW:${cetap.codigo_dt}`;
      let matched = sedesByCode.get(cetap.codigo_cetap.toUpperCase()) || null;

      if (matched && selectedSedeIds.has(String(matched.id_sede))) {
        errors.push(
          `El código ${cetap.codigo_cetap} apunta a una sede ya utilizada por otra fila.`,
        );
        matched = null;
      }

      if (!matched && targetSec) {
        const expectedName = this.normalizeLegacySedeName(
          cetap.nombre_cetap,
        );
        const candidates = sedes.filter(
          (row: any) =>
            String(row.id_seccional) === targetSecId &&
            !selectedSedeIds.has(String(row.id_sede)) &&
            this.normalizeLegacySedeName(row.nom_sede) === expectedName,
        );

        if (candidates.length === 1) {
          matched = candidates[0];
        } else if (candidates.length > 1) {
          errors.push(
            `El CETAP ${cetap.codigo_cetap} (${cetap.nombre_cetap}) coincide con varias sedes existentes.`,
          );
        } else if (cetap.tipo === 'sede_central') {
          const centralCandidates = sedes.filter(
            (row: any) =>
              String(row.id_seccional) === targetSecId &&
              !selectedSedeIds.has(String(row.id_sede)) &&
              /central|principal/.test(
                this.normalizeLegacySedeName(row.nom_sede),
              ),
          );
          if (centralCandidates.length === 1) {
            matched = centralCandidates[0];
          }
        }
      }

      sedeByCetapCode.set(cetap.codigo_cetap, matched);
      if (!matched) {
        sedeCreated++;
        continue;
      }

      selectedSedeIds.add(String(matched.id_sede));
      const expectedActive = cetap.activo ? 'ACTIVO' : 'INACTIVO';
      if (
        String(matched.cod_sede || '').trim() !== cetap.codigo_cetap ||
        String(matched.nom_sede || '').trim() !== cetap.nombre_cetap ||
        String(matched.id_seccional) !== targetSecId ||
        !this.sameLegacyStatus(matched.sede_act, expectedActive) ||
        !this.sameNullableNumber(matched.num_latitud, cetap.latitud) ||
        !this.sameNullableNumber(matched.num_longitud, cetap.longitud)
      ) {
        sedeUpdated++;
      } else {
        sedeUnchanged++;
      }
    }

    return {
      seccionalByDtCode,
      sedeByCetapCode,
      errors,
      summary: {
        seccionales: {
          creadas: secCreated,
          actualizadas: secUpdated,
          sin_cambios: secUnchanged,
        },
        sedes: {
          creadas: sedeCreated,
          actualizadas: sedeUpdated,
          sin_cambios: sedeUnchanged,
        },
        registros_legacy_conservados: {
          seccionales: Math.max(
            0,
            seccionales.length - (secUpdated + secUnchanged),
          ),
          sedes: Math.max(0, sedes.length - (sedeUpdated + sedeUnchanged)),
        },
      },
    };
  }

  private normalizeLegacyName(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^seccional\s+/, '')
      .replace(/^territorial\s+/, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private normalizeLegacySedeName(value: unknown): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/^cetap\s+/, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private formatLegacyTerritorialName(name: string): string {
    if (name === 'SEDE_CENTRAL') return 'Sede Central';
    return name
      .toLocaleLowerCase('es-CO')
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CO'));
  }

  private sameLegacyStatus(current: unknown, expected: string): boolean {
    const normalized = String(current || '').trim().toUpperCase();
    if (expected === 'ACTIVO') {
      return normalized === 'ACTIVO' || normalized === 'ACTIVA';
    }
    return normalized === 'INACTIVO' || normalized === 'INACTIVA';
  }

  private sameNullableNumber(left: unknown, right: unknown): boolean {
    if (
      (left === null || left === undefined || left === '') &&
      (right === null || right === undefined || right === '')
    ) {
      return true;
    }
    return Number(left) === Number(right);
  }

  private async getNextLegacyId(
    queryRunner: any,
    table: string,
    column: string,
  ): Promise<number> {
    const rows = await queryRunner.query(
      `SELECT COALESCE(MAX(${column}), 0) + 1 AS next_id FROM ${table}`,
    );
    return Number(rows[0]?.next_id || 1);
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
        (SELECT COUNT(*)
           FROM academic_work_plan.direccion_territorial
          WHERE codigo = 'SC' OR codigo ~ '^DT-[0-9]{3}$') AS dts,
        (SELECT COUNT(*)
           FROM academic_work_plan.cetap
          WHERE codigo ~ '^CET-[0-9]{4}$') AS cetaps,
        (SELECT COUNT(*) FROM auth.seccionales) AS seccionales,
        (SELECT COUNT(*) FROM auth.sedes) AS sedes
    `);

    const stats = counts[0] || {};
    const direccionesTerritoriales = parseInt(stats.dts || 0, 10);
    const cetaps = parseInt(stats.cetaps || 0, 10);
    const seccionalesExistentes = parseInt(stats.seccionales || 0, 10);
    const sedesExistentes = parseInt(stats.sedes || 0, 10);
    const isReady = direccionesTerritoriales >= 17 && cetaps >= 290;
    const hasExistingStructure =
      seccionalesExistentes > 0 || sedesExistentes > 0;

    return {
      success: true,
      direcciones_territoriales: direccionesTerritoriales,
      cetaps,
      seccionales_existentes: seccionalesExistentes,
      sedes_existentes: sedesExistentes,
      hasExistingStructure,
      requiresSynchronization: hasExistingStructure && !isReady,
      isReady,
      message:
        hasExistingStructure && !isReady
          ? `La Estructura Organizacional sí contiene ${seccionalesExistentes} seccionales y ${sedesExistentes} sedes, pero el catálogo geográfico oficial todavía no está sincronizado.`
          : undefined,
    };
  }
}
