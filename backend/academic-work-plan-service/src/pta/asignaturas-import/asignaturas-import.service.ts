import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ExcelParserService, AsignaturaRow, ProgramaRow } from './parsers/excel-parser.service';
import { ImportValidator } from './validators/import.validator';
import { mapModalidad, mapTipoExcepcion } from './mappers/import.mapper';
import { HorasPtaCalculator } from '../horas-pta.calculator';
import { ImportResultDto, ImportCountDto } from './dto/import-result.dto';

@Injectable()
export class AsignaturasImportService {
  private readonly logger = new Logger(AsignaturasImportService.name);

  // Mapeo de códigos territoriales antiguos (de la tabla Territorial) a códigos nuevos (de la tabla direccion_territorial)
  private readonly territorialCodeMap: Record<string, string> = {
    'SC': 'SC',
    'ANT': 'DT-001',
    'ATL': 'DT-002',
    'BCS': 'DT-003', // Bolívar-Córdoba-Sucre -> BOLÍVAR
    'BOY': 'DT-004',
    'CAL': 'DT-005',
    'CAU': 'DT-006',
    'CHO': 'DT-007',
    'CUN': 'DT-008',
    'HUI': 'DT-009',
    'MET': 'DT-010',
    'NAR': 'DT-011',
    'NSA': 'DT-012',
    'RIS': 'DT-013',
    'SAN': 'DT-014',
    'TOL': 'DT-015',
    'VAL': 'DT-016',
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly excelParser: ExcelParserService,
  ) {}

  /**
   * Procesa la importación del catálogo desde el buffer de un archivo Excel.
   *
   * @param buffer - Buffer del archivo Excel subido
   * @param dryRun - Indica si es solo validación o ejecución real
   * @param periodCodigo - Código del periodo académico (por ejemplo '2025-2')
   * @param user - Usuario autenticado que realiza la carga
   * @returns Un reporte detallado con conteos, indicadores, advertencias y errores
   */
  async importCatalog(
    buffer: Buffer,
    dryRun: boolean,
    periodCodigo: string = '2025-2',
    user?: any,
    omitErrors: boolean = false,
  ): Promise<ImportResultDto> {
    const startTime = Date.now();

    // PASO 1 - Parsear el Excel
    const {
      asignaturas: rawAsignaturas,
      programas: rawProgramas,
      matrizOferta,
      matrizProgramCodes,
    } = this.excelParser.parseExcel(buffer);

    // PASO 2 - Reglas de validación pre-insert
    const preInsertReport = ImportValidator.validarPreInsert(
      rawAsignaturas,
      rawProgramas,
      matrizProgramCodes,
    );
    if (!preInsertReport.isValid) {
      throw new BadRequestException({
        success: false,
        message: 'Validación del Excel fallida (Reglas bloqueantes R1-R6).',
        errors: preInsertReport.errors,
      });
    }

    // PASO 3 - Validaciones de Circular 003 (Advertencias de horas)
    const circularWarnings = ImportValidator.validarCircular003(rawAsignaturas, rawProgramas);

    // Inicializar reporte de respuesta
    const result = new ImportResultDto();
    result.dry_run = dryRun;
    result.periodo = periodCodigo;
    result.advertencias = [
      ...preInsertReport.warnings,
      ...circularWarnings,
    ];

    // Obtener CETAPs y catálogos de la BD para validación estricta y comparación de duplicados
    const dbCetaps = await this.dataSource.query('SELECT id, codigo FROM academic_work_plan.cetap');
    const validCetapsMap = new Map<string, boolean>();
    const cetapsMap = new Map<string, string>();
    for (const c of dbCetaps) {
      validCetapsMap.set(c.codigo.toLowerCase().trim(), true);
      cetapsMap.set(c.codigo.toLowerCase().trim(), c.id);
    }

    const existingProgramas = await this.dataSource.query('SELECT * FROM academic_work_plan.programa');
    const existingAsignaturas = await this.dataSource.query('SELECT * FROM academic_work_plan.asignatura');
    const existingNucleos = await this.dataSource.query('SELECT id, nombre FROM academic_work_plan.nucleo_tematico');
    const semestres = await this.dataSource.query('SELECT id, codigo, etiqueta FROM academic_work_plan.ubicacion_semestral');
    const dbFacultades = await this.dataSource.query('SELECT id, codigo FROM academic_work_plan.facultad');

    const existingProgMap = new Map<string, any>();
    for (const p of existingProgramas) {
      existingProgMap.set(p.codigo.toLowerCase().trim(), p);
    }
    const existingAsigMap = new Map<string, any>();
    for (const a of existingAsignaturas) {
      existingAsigMap.set(a.codigo.toLowerCase().trim(), a);
    }
    const existingNtMap = new Map<string, string>();
    for (const nt of existingNucleos) {
      existingNtMap.set(nt.nombre.toLowerCase().trim(), nt.id);
    }
    const semestresMap = new Map<string, number>();
    for (const r of semestres) {
      semestresMap.set(r.codigo.toLowerCase().trim(), parseInt(r.id, 10));
      semestresMap.set(r.etiqueta.toLowerCase().trim(), parseInt(r.id, 10));
    }
    const facMap = new Map<string, string>();
    for (const f of dbFacultades) {
      facMap.set(f.codigo.toLowerCase().trim(), f.id);
    }

    // Clasificar programas
    const newProgs: any[] = [];
    const modifiedProgs: any[] = [];
    const identicalProgs: any[] = [];

    const getResolvedFacId = (codigoFacultad: string, tipoPrograma: string): string => {
      let facId = facMap.get(codigoFacultad.toLowerCase().trim());
      if (!facId) {
        if (tipoPrograma.toLowerCase().includes('maestria')) facId = '3';
        else if (tipoPrograma.toLowerCase().includes('especializacion')) facId = '2';
        else facId = '1';
      }
      return facId;
    };

    for (const p of rawProgramas) {
      const existing = existingProgMap.get(p.codigo_programa.toLowerCase().trim());
      const resolvedFacId = getResolvedFacId(p.codigo_facultad, p.tipo_programa);

      if (!existing) {
        newProgs.push(p);
      } else {
        const diffs = this.diffProgramFields(existing, p, resolvedFacId);
        if (diffs) {
          modifiedProgs.push({ ...p, _cambios: diffs, dbId: existing.id });
        } else {
          identicalProgs.push({ ...p, dbId: existing.id });
        }
      }
    }

    // Clasificar asignaturas
    const newAsigs: any[] = [];
    const modifiedAsigs: any[] = [];
    const identicalAsigs: any[] = [];

    const progIdLookupMap = new Map<string, string>();
    for (const p of existingProgramas) {
      progIdLookupMap.set(p.codigo.toLowerCase().trim(), p.id);
    }
    for (const p of newProgs) {
      progIdLookupMap.set(p.codigo_programa.toLowerCase().trim(), 'NEW_PROG');
    }

    for (const a of rawAsignaturas) {
      const existing = existingAsigMap.get(a.codigo_asignatura.toLowerCase().trim());
      const resolvedProgId = progIdLookupMap.get(a.codigo_programa.toLowerCase().trim()) || 'NOT_FOUND';
      
      let resolvedNtId = existingNtMap.get(a.nucleo_tematico.toLowerCase().trim()) || 'NEW_NT';
      
      let resolvedSemId = semestresMap.get(a.semestre.toLowerCase().trim());
      if (!resolvedSemId) {
        const numSem = parseInt(a.semestre, 10);
        if (!isNaN(numSem) && numSem >= 1 && numSem <= 12) {
          resolvedSemId = numSem;
        } else {
          resolvedSemId = 1;
        }
      }

      const resolvedFacId = facMap.get(a.codigo_facultad.toLowerCase().trim()) || '1';

      if (!existing) {
        newAsigs.push(a);
      } else {
        const diffs = this.diffAsignaturaFields(
          existing,
          a,
          resolvedProgId,
          resolvedNtId,
          resolvedSemId,
          resolvedFacId
        );
        if (diffs) {
          modifiedAsigs.push({ ...a, _cambios: diffs, dbId: existing.id });
        } else {
          identicalAsigs.push({ ...a, dbId: existing.id });
        }
      }
    }

    const allIdentical = (identicalProgs.length > 0 || identicalAsigs.length > 0) && newProgs.length === 0 && modifiedProgs.length === 0 && newAsigs.length === 0 && modifiedAsigs.length === 0;

    // Poblar estadísticas
    result.carga.programas.creados = newProgs.length;
    result.carga.programas.actualizados = modifiedProgs.length;
    result.carga.programas.omitidos = identicalProgs.length;

    result.carga.asignaturas.creados = newAsigs.length;
    result.carga.asignaturas.actualizados = modifiedAsigs.length;
    result.carga.asignaturas.omitidos = identicalAsigs.length;

    const uniqueNucleos = new Set(rawAsignaturas.map(a => a.nucleo_tematico.trim().toUpperCase()).filter(Boolean));
    let newNucleosCount = 0;
    for (const name of uniqueNucleos) {
      if (!existingNtMap.has(name.toLowerCase().trim())) {
        newNucleosCount++;
      }
    }
    result.carga.nucleos_tematicos.creados = newNucleosCount;
    result.carga.nucleos_tematicos.actualizados = 0;
    result.carga.nucleos_tematicos.omitidos = uniqueNucleos.size - newNucleosCount;

    let ofertasCount = 0;
    const cetapsSet = new Set<string>();
    for (const m of matrizOferta) {
      if (m.codigo_cetap) cetapsSet.add(m.codigo_cetap.trim().toUpperCase());
      ofertasCount += m.programas_ofertados.length;
    }

    // AUTO-CREACIÓN DE CETAPs: los CETAPs de la MATRIZ_OFERTA que aún no existan
    // se crearán durante la importación con los datos del propio archivo, por lo que
    // se consideran válidos aquí (no se bloquea ni se descartan sus ofertas).
    const cetapsNuevosCodigos = [...cetapsSet].filter(
      (code) => !validCetapsMap.has(code.toLowerCase().trim()),
    );
    for (const code of cetapsSet) {
      validCetapsMap.set(code.toLowerCase().trim(), true);
    }

    let newOfertasCount = 0;
    let existingOfertasCount = 0;
    const dbPeriodo = await this.dataSource.query('SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1', [periodCodigo]);
    let periodIdTemp = dbPeriodo[0]?.id;

    if (periodIdTemp) {
      const dbOfertas = await this.dataSource.query('SELECT id_cetap, id_programa FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1', [periodIdTemp]);
      const dbOfertaMap = new Set<string>();
      for (const o of dbOfertas) {
        dbOfertaMap.add(`${o.id_cetap}::${o.id_programa}`);
      }

      for (const m of matrizOferta) {
        const cetapId = cetapsMap.get(m.codigo_cetap.toLowerCase().trim());
        if (!cetapId) {
          // CETAP nuevo (se creará durante la importación): todas sus ofertas son nuevas.
          newOfertasCount += m.programas_ofertados.length;
          continue;
        }
        for (const progCode of m.programas_ofertados) {
          const progId = progIdLookupMap.get(progCode.toLowerCase().trim());
          if (!progId || progId === 'NEW_PROG') {
            newOfertasCount++;
          } else {
            const key = `${cetapId}::${progId}`;
            if (dbOfertaMap.has(key)) {
              existingOfertasCount++;
            } else {
              newOfertasCount++;
            }
          }
        }
      }
    } else {
      newOfertasCount = matrizOferta.reduce(
        (count, row) =>
          validCetapsMap.has(row.codigo_cetap.toLowerCase().trim())
            ? count + row.programas_ofertados.length
            : count,
        0,
      );
    }
    result.carga.ofertas_cetap_programa.creados = newOfertasCount;
    result.carga.ofertas_cetap_programa.actualizados = 0;
    result.carga.ofertas_cetap_programa.omitidos = existingOfertasCount;

    // Todos los CETAPs del archivo cuentan como válidos (los faltantes se crearán),
    // por lo que todas las ofertas con "X" son válidas.
    const validOffersCount = matrizOferta.reduce(
      (count, row) =>
        validCetapsMap.has(row.codigo_cetap.toLowerCase().trim())
          ? count + row.programas_ofertados.length
          : count,
      0,
    );

    result.carga.cetaps.creados = cetapsNuevosCodigos.length;
    result.carga.cetaps.actualizados = 0;
    result.carga.cetaps.omitidos = cetapsSet.size - cetapsNuevosCodigos.length;

    if (cetapsNuevosCodigos.length > 0) {
      const examples = cetapsNuevosCodigos.slice(0, 10).join(', ');
      result.advertencias.push(
        `Se crearán ${cetapsNuevosCodigos.length} CETAP nuevos a partir de la MATRIZ_OFERTA del archivo` +
          ` (ej.: ${examples}${cetapsNuevosCodigos.length > 10 ? ', ...' : ''}).`,
      );
    }
    if (validOffersCount === 0) {
      result.errores.push(
        'La MATRIZ_OFERTA no contiene ninguna oferta (ningún programa marcado con "X").',
      );
    }

    // Resumen detallado de duplicados
    (result as any).analisis_duplicados = {
      programas: { nuevos: newProgs.length, modificados: modifiedProgs.length, identicos: identicalProgs.length },
      asignaturas: { nuevos: newAsigs.length, modificados: modifiedAsigs.length, identicos: identicalAsigs.length },
      total_identicos: identicalProgs.length + identicalAsigs.length,
      total_modificados: modifiedProgs.length + modifiedAsigs.length,
      total_nuevos: newProgs.length + newAsigs.length,
      todo_identico: allIdentical,
    };

    this.buildRelationsAndSimulateCarga(rawAsignaturas, rawProgramas, matrizOferta, result, dryRun, validCetapsMap, omitErrors);

    // allIdentical sólo bloquea si además no hay ofertas nuevas para ESTE periodo.
    // Si los programas/asignaturas ya existen pero es un periodo nuevo, las
    // oferta_cetap_programa todavía deben crearse para el nuevo periodo.
    if (
      allIdentical &&
      newOfertasCount === 0 &&
      result.errores.length === 0
    ) {
      (result as any).blocked_reason = 'ALL_IDENTICAL';
      result.success = true; // El archivo es válido, pero no hay nada nuevo
      result.tiempo_ms = Date.now() - startTime;
      this.calculateIndicators(rawAsignaturas, rawProgramas, matrizOferta, result);
      return result;
    }

    if (dryRun) {
      this.calculateIndicators(rawAsignaturas, rawProgramas, matrizOferta, result);
      result.success = result.errores.length === 0;
      result.tiempo_ms = Date.now() - startTime;
      return result;
    }

    if (result.errores.length > 0 && !omitErrors) {
      throw new BadRequestException({
        success: false,
        message:
          'La importación no puede continuar hasta corregir los errores de validación.',
        errors: result.errores,
      });
    }

    if (validOffersCount === 0) {
      throw new BadRequestException({
        success: false,
        message:
          'La importación no puede continuar sin al menos una oferta territorial válida.',
        errors: result.errores,
      });
    }

    // PASO 4 - Iniciar transacción manual
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 5. Crear catálogos pre-existentes
      await this.seedFacultades(queryRunner);
      const semestresMap = await this.seedUbicacionesSemestrales(queryRunner);
      const periodId = await this.seedPeriodoAcademico(queryRunner, periodCodigo);

      // Dummy counts to pass to database loaders
      const dummyCount = new ImportCountDto();

      // 6. Cargar PROGRAMAS (solo nuevos y modificados)
      const dbProgramasMap = await this.loadProgramas(queryRunner, [...newProgs, ...modifiedProgs], dummyCount, periodId);
      const programasMapBase = new Map<string, string>();
      for (const p of existingProgramas) {
        programasMapBase.set(p.nombre.toLowerCase().trim(), p.id);
        programasMapBase.set(p.codigo.toLowerCase().trim(), p.id);
      }
      const programasMap = new Map<string, string>([
        ...programasMapBase.entries(),
        ...dbProgramasMap.entries()
      ]);

      // 7. Cargar NUCLEOS_TEMATICOS (solo basados en asignaturas a cargar)
      const dbNucleosMap = await this.loadNucleosTematicos(queryRunner, [...newAsigs, ...modifiedAsigs], dummyCount);
      const nucleosMapBase = new Map<string, string>();
      for (const nt of existingNucleos) {
        nucleosMapBase.set(nt.nombre.toLowerCase().trim(), nt.id);
      }
      const nucleosMap = new Map<string, string>([
        ...nucleosMapBase.entries(),
        ...dbNucleosMap.entries()
      ]);

      // 8. Cargar CETAPs desde la base de datos (se asume que ya existen por estructura-import)
      const cetaps = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.cetap');
      const cetapsMapTransaction = new Map<string, string>();
      for (const c of cetaps) {
        cetapsMapTransaction.set(c.codigo.toLowerCase().trim(), c.id);
      }

      // 8.5. Crear los CETAPs (y su Dirección Territorial) de la MATRIZ_OFERTA que
      // aún no existan, a partir de los datos del propio archivo. Así ninguna oferta
      // se descarta por "CETAP inexistente".
      await this.ensureCetapsFromMatriz(queryRunner, matrizOferta, cetapsMapTransaction);

      // 9. Cargar OFERTA_CETAP_PROGRAMA
      await this.loadOfertasCetapPrograma(
        queryRunner,
        matrizOferta,
        programasMap,
        cetapsMapTransaction,
        periodId,
        dummyCount,
      );

      // 10. Cargar ASIGNATURAS del catálogo (solo nuevas y modificadas)
      await this.loadAsignaturas(
        queryRunner,
        [...newAsigs, ...modifiedAsigs],
        programasMap,
        nucleosMap,
        semestresMap,
        dummyCount,
      );

      // 11. [BR-002] Validación post-carga: la tabla oferta_cetap_programa NO puede quedar vacía
      const postLoadCounts = await queryRunner.query(`
        SELECT 
          (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1) AS ofertas_count,
          (SELECT COUNT(*) FROM academic_work_plan.asignatura) AS asignaturas_count,
          (SELECT COUNT(*) FROM academic_work_plan.programa) AS programas_count
      `, [periodId]);
      
      const ofertasPostCarga = parseInt(postLoadCounts[0]?.ofertas_count || '0', 10);
      const asignaturasPostCarga = parseInt(postLoadCounts[0]?.asignaturas_count || '0', 10);
      
      if (ofertasPostCarga === 0) {
        this.logger.error(`[BR-002] Validación post-carga falló: oferta_cetap_programa tiene 0 registros para periodo ${periodCodigo}. Ejecutando rollback.`);
        throw new Error(
          `[BR-002] La tabla de oferta territorial quedó vacía (0 registros). ` +
          `Esto indica que ningún CETAP del archivo Excel coincide con la estructura organizacional cargada. ` +
          `Verifique que los códigos de CETAP en la hoja MATRIZ_OFERTA sean correctos.`
        );
      }

      if (asignaturasPostCarga === 0) {
        this.logger.error(`[BR-002] Validación post-carga falló: asignaturas tiene 0 registros. Ejecutando rollback.`);
        throw new Error(
          `[BR-002] La tabla de asignaturas quedó vacía (0 registros). Verifique la hoja ASIGNATURAS del archivo Excel.`
        );
      }

      this.logger.log(`[BR-002] Validación post-carga OK: ${ofertasPostCarga} ofertas, ${asignaturasPostCarga} asignaturas.`);

      // Confirmar transacción
      await queryRunner.commitTransaction();
      result.success = true;

      // Resumen REAL del período tras la importación: lo que QUEDÓ en este período
      // (no solo lo "creado" en la BD). Así, reimportar el mismo catálogo en otro
      // período muestra el total correcto en el aviso, no ceros.
      try {
        const resumen = await this.dataSource.query(
          `WITH per AS (
             SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1
           ),
           progs AS (
             SELECT p.id FROM academic_work_plan.programa p CROSS JOIN per
             WHERE EXISTS (
                     SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp
                     WHERE ocp.id_programa = p.id AND ocp.activa = TRUE
                       AND ocp.id_periodo_academico = per.id
                   )
                OR p.id_periodo_academico = per.id
           )
           SELECT
             (SELECT COUNT(*) FROM progs) AS programas,
             (SELECT COUNT(*) FROM academic_work_plan.asignatura a
               WHERE a.id_programa IN (SELECT id FROM progs) AND a.activa = TRUE) AS asignaturas,
             (SELECT COUNT(DISTINCT id_cetap) FROM academic_work_plan.oferta_cetap_programa
               WHERE id_periodo_academico = (SELECT id FROM per) AND activa = TRUE) AS cetaps,
             (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa
               WHERE id_periodo_academico = (SELECT id FROM per) AND activa = TRUE) AS ofertas`,
          [periodCodigo],
        );
        (result as any).resumen_periodo = {
          programas: parseInt(resumen[0]?.programas || '0', 10),
          asignaturas: parseInt(resumen[0]?.asignaturas || '0', 10),
          cetaps: parseInt(resumen[0]?.cetaps || '0', 10),
          ofertas: parseInt(resumen[0]?.ofertas || '0', 10),
        };
      } catch (e: any) {
        this.logger.warn(`No se pudo calcular el resumen del período: ${e.message}`);
      }

      // Calcular indicadores finales con datos reales
      this.calculateIndicators(rawAsignaturas, rawProgramas, matrizOferta, result);

      // 12. Registrar auditoría (no bloqueante)
      this.logAudit(startTime, result, periodCodigo, user);

    } catch (error: any) {
      this.logger.error(`Error en la transacción de importación del catálogo: ${error.message}`, error.stack);
      await queryRunner.rollbackTransaction();
      throw new BadRequestException({
        success: false,
        message: `Error al persistir el catálogo en la base de datos: ${error.message}`,
        errors: [error.message],
      });
    } finally {
      await queryRunner.release();
    }

    result.tiempo_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Obtiene el reporte de la última carga ejecutada consultando la base de datos.
   */
  async getLastImport(periodo: string = '2025-2'): Promise<any> {
    let stats: any = {};
    try {
      // Conteo REAL del período (mismo criterio que el listado y el detalle):
      // un programa pertenece al período si tiene oferta activa en él, si fue
      // creado para él (id_periodo_academico), o —solo en el período activo—
      // si no tiene período propio ni ofertas.
      const counts = await this.dataSource.query(`
        WITH per AS (
          SELECT id, (estado = 'en_curso') AS activo
          FROM academic_work_plan.periodo_academico
          WHERE codigo = $1
          LIMIT 1
        ),
        progs AS (
          SELECT p.id
          FROM academic_work_plan.programa p
          CROSS JOIN per
          WHERE EXISTS (
                  SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp
                  WHERE ocp.id_programa = p.id AND ocp.activa = TRUE
                    AND ocp.id_periodo_academico = per.id
                )
             OR p.id_periodo_academico = per.id
             OR (
                  per.activo
                  AND p.id_periodo_academico IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM academic_work_plan.oferta_cetap_programa o
                    WHERE o.id_programa = p.id AND o.activa = TRUE
                  )
                )
        )
        SELECT
          (SELECT COUNT(*) FROM progs) AS programas,
          (SELECT COUNT(*) FROM academic_work_plan.asignatura a
            WHERE a.id_programa IN (SELECT id FROM progs) AND a.activa = TRUE) AS asignaturas,
          (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa
            WHERE id_periodo_academico = (SELECT id FROM per)) AS ofertas,
          -- CETAPs del período = SOLO los que OFRECEN programas (oferta activa),
          -- mismo criterio que el detalle. NO se cuentan los CETAP de la activación
          -- estructural (periodo_cetap): en este módulo un CETAP sin programas no
          -- tiene sentido, por eso un período sin ofertas muestra 0 CETAP.
          (SELECT COUNT(DISTINCT o.id_cetap)
             FROM academic_work_plan.oferta_cetap_programa o
            WHERE o.id_periodo_academico = (SELECT id FROM per) AND o.activa = TRUE
              AND NOT EXISTS (
                SELECT 1 FROM academic_work_plan.periodo_cetap ov
                 WHERE ov.id_periodo_academico = o.id_periodo_academico
                   AND ov.id_cetap = o.id_cetap AND ov.activo = FALSE)
          ) AS cetaps
      `, [periodo]);
      stats = counts[0] || {};
    } catch (e) {
      // Respaldo si la columna id_periodo_academico no existe (migración no aplicada):
      // conteo basado solo en ofertas, como antes.
      const counts = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(DISTINCT ocp.id_programa)
           FROM academic_work_plan.oferta_cetap_programa ocp
           WHERE ocp.id_periodo_academico = (SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1)) AS programas,
          (SELECT COUNT(*)
           FROM academic_work_plan.asignatura a
           WHERE a.id_programa IN (
             SELECT DISTINCT ocp2.id_programa
             FROM academic_work_plan.oferta_cetap_programa ocp2
             WHERE ocp2.id_periodo_academico = (SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1)
           )) AS asignaturas,
          (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = (SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1)) AS ofertas,
          (SELECT COUNT(DISTINCT o.id_cetap)
             FROM academic_work_plan.oferta_cetap_programa o
            WHERE o.id_periodo_academico = (SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1) AND o.activa = TRUE
              AND NOT EXISTS (
                SELECT 1 FROM academic_work_plan.periodo_cetap ov
                 WHERE ov.id_periodo_academico = o.id_periodo_academico
                   AND ov.id_cetap = o.id_cetap AND ov.activo = FALSE)
          ) AS cetaps
      `, [periodo]);
      stats = counts[0] || {};
    }

    return {
      success: true,
      periodo,
      counts: {
        programas: parseInt(stats.programas || 0, 10),
        ofertas_cetap_programa: parseInt(stats.ofertas || 0, 10),
        asignaturas: parseInt(stats.asignaturas || 0, 10),
        // CETAPs activos reales del período (coincide con el detalle).
        cetaps: parseInt(stats.cetaps || 0, 10),
      },
    };
  }

  // --- MÉTODOS DE BASE DE DATOS INTERNOS ---

  private async seedFacultades(queryRunner: QueryRunner): Promise<void> {
    const SQL = `
      INSERT INTO academic_work_plan.facultad (id, codigo, nombre, activo) VALUES
        (1, 'PREGRADO', 'Pregrado', TRUE),
        (2, 'POSGRADO-ESP', 'Posgrado - Especializaciones', TRUE),
        (3, 'POSGRADO-MAES', 'Posgrado - Maestrías', TRUE)
      ON CONFLICT (id) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        codigo = EXCLUDED.codigo;
    `;
    await queryRunner.query(SQL);
  }

  private async seedDireccionesTerritoriales(queryRunner: QueryRunner): Promise<Map<string, string>> {
    const SQL = `
      INSERT INTO academic_work_plan.direccion_territorial (id, codigo, nombre, nombre_normalizado, activo, orden_visualizacion) VALUES
        (1, 'SC', 'SEDE_CENTRAL', 'sedecentral', TRUE, 1),
        (2, 'DT-001', 'ANTIOQUIA', 'antioquia', TRUE, 2),
        (3, 'DT-002', 'ATLÁNTICO', 'atlantico', TRUE, 3),
        (4, 'DT-003', 'BOLÍVAR', 'bolivar', TRUE, 4),
        (5, 'DT-004', 'BOYACÁ', 'boyaca', TRUE, 5),
        (6, 'DT-005', 'CALDAS', 'caldas', TRUE, 6),
        (7, 'DT-006', 'CAUCA', 'cauca', TRUE, 7),
        (8, 'DT-007', 'CHOCÓ', 'choco', TRUE, 8),
        (9, 'DT-008', 'CUNDINAMARCA', 'cundinamarca', TRUE, 9),
        (10, 'DT-009', 'HUILA', 'huila', TRUE, 10),
        (11, 'DT-010', 'META', 'meta', TRUE, 11),
        (12, 'DT-011', 'NARIÑO', 'narino', TRUE, 12),
        (13, 'DT-012', 'NORTE DE SANTANDER', 'nortedesantander', TRUE, 13),
        (14, 'DT-013', 'RISARALDA', 'risaralda', TRUE, 14),
        (15, 'DT-014', 'SANTANDER', 'santander', TRUE, 15),
        (16, 'DT-015', 'TOLIMA', 'tolima', TRUE, 16),
        (17, 'DT-016', 'VALLE', 'valle', TRUE, 17)
      ON CONFLICT (id) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        codigo = EXCLUDED.codigo,
        nombre_normalizado = EXCLUDED.nombre_normalizado;
    `;
    await queryRunner.query(SQL);

    const rows = await queryRunner.query('SELECT id, nombre FROM academic_work_plan.direccion_territorial');
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.nombre.toLowerCase().trim(), r.id);
    }
    return map;
  }

  private async seedUbicacionesSemestrales(queryRunner: QueryRunner): Promise<Map<string, number>> {
    const SQL = `
      INSERT INTO academic_work_plan.ubicacion_semestral (id, codigo, etiqueta, tipo_programa, orden) VALUES
        (1, '1', 'Primer semestre', 'pregrado', 1),
        (2, '2', 'Segundo semestre', 'pregrado', 2),
        (3, '3', 'Tercer semestre', 'pregrado', 3),
        (4, '4', 'Cuarto semestre', 'pregrado', 4),
        (5, '5', 'Quinto semestre', 'pregrado', 5),
        (6, '6', 'Sexto semestre', 'pregrado', 6),
        (7, '7', 'Séptimo semestre', 'pregrado', 7),
        (8, '8', 'Octavo semestre', 'pregrado', 8),
        (9, '9', 'Noveno semestre', 'pregrado', 9),
        (10, '10', 'Décimo semestre', 'pregrado', 10),
        (11, '11', 'Onceavo semestre', 'pregrado', 11),
        (12, '12', 'Doceavo semestre', 'pregrado', 12),
        (13, 'Sem I', 'Semestre I', 'posgrado', 13),
        (14, 'Sem II', 'Semestre II', 'posgrado', 14),
        (15, 'Sem III', 'Semestre III', 'posgrado', 15),
        (16, 'Sem IV', 'Semestre IV', 'posgrado', 16)
      ON CONFLICT (id) DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        etiqueta = EXCLUDED.etiqueta,
        tipo_programa = EXCLUDED.tipo_programa,
        orden = EXCLUDED.orden;
    `;
    await queryRunner.query(SQL);

    const rows = await queryRunner.query('SELECT id, codigo, etiqueta FROM academic_work_plan.ubicacion_semestral');
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.codigo.toLowerCase().trim(), parseInt(r.id, 10));
      map.set(r.etiqueta.toLowerCase().trim(), parseInt(r.id, 10));
    }
    return map;
  }

  private async seedPeriodoAcademico(queryRunner: QueryRunner, periodCodigo: string): Promise<string> {
    const year = parseInt(periodCodigo.split('-')[0], 10) || 2025;
    const semester = parseInt(periodCodigo.split('-')[1], 10) || 2;

    const SQL = `
      INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado) 
      VALUES ($1, $2, $3, $4, $5, 'en_curso')
      ON CONFLICT (codigo) DO UPDATE SET 
        anio = EXCLUDED.anio, 
        semestre = EXCLUDED.semestre
      RETURNING id;
    `;
    const rows = await queryRunner.query(SQL, [periodCodigo, year, semester, `${year}-08-01`, `${year}-12-15`]);
    return rows[0].id;
  }

  private async loadProgramas(
    queryRunner: QueryRunner,
    rawProgramas: ProgramaRow[],
    countDto: ImportCountDto,
    periodId: string,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    // Obtener mapa de facultades para resolver FK
    const facultades = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.facultad');
    const facMap = new Map<string, string>();
    for (const f of facultades) {
      facMap.set(f.codigo.toLowerCase().trim(), f.id);
    }

    for (const p of rawProgramas) {
      let facId = facMap.get(p.codigo_facultad.toLowerCase().trim());
      if (!facId) {
        // Fallback genérico por tipo
        if (p.tipo_programa.toLowerCase().includes('maestria')) facId = '3';
        else if (p.tipo_programa.toLowerCase().includes('especializacion')) facId = '2';
        else facId = '1';
      }

      // Se asigna id_periodo_academico = período de la importación. En re-importaciones
      // se usa COALESCE para conservar el período propio que ya tenga el programa
      // (no se "mueve" un programa que ya pertenece a otro período).
      const SQL = `
        INSERT INTO academic_work_plan.programa AS p (
          codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo, id_periodo_academico
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (codigo) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          nombre_excel = EXCLUDED.nombre_excel,
          nombre_corto = EXCLUDED.nombre_corto,
          id_facultad = EXCLUDED.id_facultad,
          tipo = EXCLUDED.tipo,
          modalidad = EXCLUDED.modalidad,
          horas_base_por_credito = EXCLUDED.horas_base_por_credito,
          horas_pregrado_central = EXCLUDED.horas_pregrado_central,
          activo = EXCLUDED.activo,
          id_periodo_academico = COALESCE(p.id_periodo_academico, EXCLUDED.id_periodo_academico)
        RETURNING id;
      `;
      const rows = await queryRunner.query(SQL, [
        p.codigo_programa,
        p.nombre_programa,
        p.nombre_excel_origen || p.nombre_programa, // nombre_excel
        p.nombre_corto || p.nombre_programa.substring(0, 30), // nombre_corto
        facId,
        p.tipo_programa.toLowerCase().trim(),
        p.modalidad_principal.toLowerCase().trim() === 'mixta' ? 'mixto' : p.modalidad_principal.toLowerCase().trim(),
        p.horas_base_por_credito,
        p.horas_pregrado_central,
        p.activo === false || p.activo === 0 || String(p.activo).toLowerCase().trim() === 'false' || String(p.activo).toLowerCase().trim() === 'no' || String(p.activo).toLowerCase().trim() === 'inactivo' ? false : true,
        periodId,
      ]);

      const insertedId = rows[0].id;
      map.set(p.nombre_programa.toLowerCase().trim(), insertedId);
      map.set(p.codigo_programa.toLowerCase().trim(), insertedId);

      countDto.creados++;
    }

    return map;
  }

  private async loadNucleosTematicos(
    queryRunner: QueryRunner,
    rawAsignaturas: AsignaturaRow[],
    countDto: ImportCountDto,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const uniqueNucleos = new Set<string>();

    for (const a of rawAsignaturas) {
      if (a.nucleo_tematico) {
        let name = a.nucleo_tematico.trim();
        // Aplicar corrección ortográfica oficial
        if (name === 'Ata Dirección del Estado - ESP') {
          name = 'Alta Dirección del Estado - ESP';
        }
        uniqueNucleos.add(name);
      }
    }

    // Los núcleos temáticos son GLOBALES (no por período). Se reutilizan los que ya
    // existen (por nombre) sin reasignar su código, y los nuevos se numeran a partir
    // del máximo NT-### existente. Así no se choca con «nucleo_tematico_codigo_key»
    // al reimportar o al importar en otro período.
    const existentes = await queryRunner.query(
      'SELECT id, codigo, nombre FROM academic_work_plan.nucleo_tematico',
    );
    const nucleosPorNombre = new Map<string, string>();
    let maxNum = 0;
    for (const nt of existentes) {
      nucleosPorNombre.set(String(nt.nombre).toLowerCase().trim(), nt.id);
      const m = /^NT-(\d+)$/i.exec(String(nt.codigo || ''));
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }

    let next = maxNum + 1;
    for (const name of uniqueNucleos) {
      const key = name.toLowerCase().trim();

      // Si ya existe (por nombre), se reutiliza sin tocar su código.
      const existenteId = nucleosPorNombre.get(key);
      if (existenteId) {
        map.set(key, existenteId);
        continue;
      }

      // Núcleo nuevo: código siguiente disponible (no colisiona con los existentes).
      const code = `NT-${String(next).padStart(3, '0')}`;
      next++;
      const SQL = `
        INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, descripcion, activo)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id;
      `;
      const rows = await queryRunner.query(SQL, [code, name, `Núcleo temático: ${name}`]);
      map.set(key, rows[0].id);
      nucleosPorNombre.set(key, rows[0].id);
      countDto.creados++;
    }

    return map;
  }

  private normalizarNombre(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Crea (si no existen) los CETAPs y Direcciones Territoriales referenciados en la
   * MATRIZ_OFERTA, usando los datos del propio archivo, y actualiza `cetapsMap`
   * (codigo_cetap en minúsculas -> id). Es aditivo: si ya existen, los reutiliza.
   */
  private async ensureCetapsFromMatriz(
    queryRunner: QueryRunner,
    matrizOferta: import('./parsers/matriz-oferta.parser').OfertaMatrizResult[],
    cetapsMap: Map<string, string>,
  ): Promise<void> {
    const dtRows = await queryRunner.query(
      'SELECT id, codigo FROM academic_work_plan.direccion_territorial',
    );
    const dtMap = new Map<string, string>();
    for (const dt of dtRows) {
      dtMap.set(String(dt.codigo).toLowerCase().trim(), dt.id);
    }

    for (const m of matrizOferta) {
      const cetapKey = m.codigo_cetap.toLowerCase().trim();
      if (cetapsMap.has(cetapKey)) continue;

      const dtKey = (m.codigo_dt || '').toLowerCase().trim();
      let dtId = dtMap.get(dtKey);
      if (!dtId) {
        dtId = await this.ensureDireccionTerritorial(queryRunner, m.codigo_dt, m.nombre_dt);
        dtMap.set(dtKey, dtId);
      }

      const cetapId = await this.ensureCetap(queryRunner, m.codigo_cetap, m.nombre_cetap, dtId);
      cetapsMap.set(cetapKey, cetapId);
    }
  }

  private async ensureDireccionTerritorial(
    queryRunner: QueryRunner,
    codigo: string,
    nombre: string,
  ): Promise<string> {
    const cod = (codigo || '').trim();
    const nom = (nombre || '').trim() || cod;
    const norm = this.normalizarNombre(nom);

    let rows = await queryRunner.query(
      'SELECT id FROM academic_work_plan.direccion_territorial WHERE codigo = $1 LIMIT 1',
      [cod],
    );
    if (rows.length) return rows[0].id;
    rows = await queryRunner.query(
      'SELECT id FROM academic_work_plan.direccion_territorial WHERE nombre_normalizado = $1 LIMIT 1',
      [norm],
    );
    if (rows.length) return rows[0].id;

    rows = await queryRunner.query(
      `INSERT INTO academic_work_plan.direccion_territorial
         (codigo, nombre, nombre_normalizado, activo, orden_visualizacion)
       VALUES ($1, $2, $3, TRUE, 999)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [cod, nom, norm],
    );
    return rows[0].id;
  }

  private async ensureCetap(
    queryRunner: QueryRunner,
    codigo: string,
    nombre: string,
    dtId: string,
  ): Promise<string> {
    const cod = (codigo || '').trim();
    const nom = (nombre || '').trim() || cod;
    const norm = this.normalizarNombre(nom);

    let rows = await queryRunner.query(
      'SELECT id FROM academic_work_plan.cetap WHERE codigo = $1 LIMIT 1',
      [cod],
    );
    if (rows.length) return rows[0].id;
    rows = await queryRunner.query(
      'SELECT id FROM academic_work_plan.cetap WHERE id_direccion_territorial = $1 AND nombre_normalizado = $2 LIMIT 1',
      [dtId, norm],
    );
    if (rows.length) return rows[0].id;

    rows = await queryRunner.query(
      `INSERT INTO academic_work_plan.cetap
         (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, activo)
       VALUES ($1, $2, $3, $4, 'cetap', TRUE)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [cod, nom, norm, dtId],
    );
    return rows[0].id;
  }

  // El método syncCetaps se ha eliminado porque ya no es necesario;
  // los CETAPs vienen listos de estructura-import.

  private async loadOfertasCetapPrograma(
    queryRunner: QueryRunner,
    matrizOferta: import('./parsers/matriz-oferta.parser').OfertaMatrizResult[],
    programasMap: Map<string, string>,
    cetapsMap: Map<string, string>,
    periodId: string,
    countDto: ImportCountDto,
  ): Promise<void> {
    for (const matriz of matrizOferta) {
      const cetapId = cetapsMap.get(matriz.codigo_cetap.toLowerCase().trim());
      if (!cetapId) continue;

      for (const progCode of matriz.programas_ofertados) {
        const progId = programasMap.get(progCode.toLowerCase().trim());
        if (!progId) continue;

        await queryRunner.query(`
          INSERT INTO academic_work_plan.oferta_cetap_programa (
            id_cetap, id_programa, id_periodo_academico, cupos_estimados, activa
          ) VALUES ($1, $2, $3, 100, TRUE)
          ON CONFLICT (id_cetap, id_programa, id_periodo_academico) DO NOTHING;
        `, [cetapId, progId, periodId]);

        countDto.creados++;
      }
    }
  }

  private async loadAsignaturas(
    queryRunner: QueryRunner,
    rawAsignaturas: AsignaturaRow[],
    programasMap: Map<string, string>,
    nucleosMap: Map<string, string>,
    semestresMap: Map<string, number>,
    countDto: ImportCountDto,
  ): Promise<void> {
    // Resolver facultades pre-existentes
    const facultades = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.facultad');
    const facMap = new Map<string, string>();
    for (const f of facultades) {
      facMap.set(f.codigo.toLowerCase().trim(), f.id);
    }

    for (const a of rawAsignaturas) {
      const progId = programasMap.get(a.codigo_programa.toLowerCase().trim());
      if (!progId) continue;

      let facId = facMap.get(a.codigo_facultad.toLowerCase().trim());
      if (!facId) {
        // Fallback
        facId = '1';
      }

      // Buscar nucleo tematico
      let ntId = nucleosMap.get(a.nucleo_tematico.toLowerCase().trim());
      if (!ntId) {
        // Asignar núcleo genérico si no existía
        const rows = await queryRunner.query(
          `INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, activo) 
           VALUES ($1, $2, TRUE) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
          [`NT-GEN-${a.codigo_asignatura}`, a.nucleo_tematico || 'General']
        );
        ntId = rows[0]?.id as string;
        if (!ntId) {
          throw new Error(`No se pudo crear el núcleo temático para ${a.nucleo_tematico}`);
        }
        nucleosMap.set(a.nucleo_tematico.toLowerCase().trim(), ntId);
      }

      // Buscar semestre (ubicacion_semestral)
      let semId = semestresMap.get(a.semestre.toLowerCase().trim());
      if (!semId) {
        // Intentar parsear el número de semestre si viene como string directo
        const numSem = parseInt(a.semestre, 10);
        if (!isNaN(numSem) && numSem >= 1 && numSem <= 12) {
          semId = numSem;
        } else {
          semId = 1; // Default
        }
      }

      const mappedMod = mapModalidad(a.modalidad);
      const mappedExcep = mapTipoExcepcion(a.tipo_excepcion);

      // Calcular horas_fijas_pta
      let horasFijas: number | null = null;
      if (mappedExcep === 'seminario_enfasis') horasFijas = 384;
      else if (mappedExcep === 'opciones_grado_ap') horasFijas = 20;
      else if (mappedExcep === 'seminario_opciones_apt') horasFijas = 144;

      const SQL = `
        INSERT INTO academic_work_plan.asignatura (
          codigo, nombre, nombre_base, modalidad_sufijo, modalidad, requiere_revision_modalidad,
          creditos, id_ubicacion_semestral, id_programa, id_nucleo_tematico, id_facultad,
          horas_fijas_pta, tipo_excepcion, activa
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (codigo) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          nombre_base = EXCLUDED.nombre_base,
          modalidad_sufijo = EXCLUDED.modalidad_sufijo,
          modalidad = EXCLUDED.modalidad,
          requiere_revision_modalidad = EXCLUDED.requiere_revision_modalidad,
          creditos = EXCLUDED.creditos,
          id_ubicacion_semestral = EXCLUDED.id_ubicacion_semestral,
          id_programa = EXCLUDED.id_programa,
          id_nucleo_tematico = EXCLUDED.id_nucleo_tematico,
          id_facultad = EXCLUDED.id_facultad,
          horas_fijas_pta = EXCLUDED.horas_fijas_pta,
          tipo_excepcion = EXCLUDED.tipo_excepcion,
          activa = EXCLUDED.activa;
      `;
      await queryRunner.query(SQL, [
        a.codigo_asignatura,
        a.nombre_asignatura,
        a.nombre_base,
        a.modalidad, // modalidad_sufijo
        mappedMod,
        a.requiere_revision_modalidad === 'true' || a.requiere_revision_modalidad === true || String(a.requiere_revision_modalidad).trim().toLowerCase() === 'si',
        a.creditos,
        semId,
        progId,
        ntId,
        facId,
        horasFijas,
        mappedExcep,
        a.activa === 'true' || a.activa === true || a.activa === 1 || String(a.activa).trim().toLowerCase() === 'si',
      ]);

      countDto.creados++;
    }
  }

  // --- MÉTODOS DE SOPORTE E INDICADORES ---

  private calculateIndicators(
    asignaturas: AsignaturaRow[],
    programas: ProgramaRow[],
    matrizOferta: import('./parsers/matriz-oferta.parser').OfertaMatrizResult[],
    result: ImportResultDto,
  ): void {
    // 1. Asignaturas con modalidad 'sin_definir'
    result.indicadores_pta.asignaturas_modalidad_sin_definir = asignaturas.filter(
      a => mapModalidad(a.modalidad) === 'sin_definir'
    ).length;

    // 2. Asignaturas con excepción circular 003
    result.indicadores_pta.asignaturas_con_excepcion = asignaturas.filter(
      a => mapTipoExcepcion(a.tipo_excepcion) !== null
    ).length;

    // 3. Promedio de horas calculadas
    let totalHoras = 0;
    const progMap = new Map<string, ProgramaRow>();
    for (const p of programas) {
      progMap.set(p.codigo_programa.toLowerCase().trim(), p);
    }

    for (const a of asignaturas) {
      const p = progMap.get(a.codigo_programa.toLowerCase().trim());
      if (p) {
        const horasPta = HorasPtaCalculator.calcularHorasPTA(
          { creditos: a.creditos, tipoExcepcion: a.tipo_excepcion },
          { horasBasePorCredito: p.horas_base_por_credito, horasPregradoCentral: p.horas_pregrado_central }
        );
        totalHoras += horasPta;
      }
    }
    result.indicadores_pta.horas_pta_calculadas_promedio = asignaturas.length > 0 
      ? Math.round(totalHoras / asignaturas.length) 
      : 0;

    // 4. Asignaturas disponibles por DT
    const dtMap: Record<string, number> = {};
    
    for (const matriz of matrizOferta) {
      const dtName = matriz.nombre_dt.trim().toUpperCase();
      if (!dtName) continue;

      for (const progCode of matriz.programas_ofertados) {
        // Count how many asignaturas belong to this programa
        const asigCount = asignaturas.filter(a => a.codigo_programa.toLowerCase().trim() === progCode.toLowerCase().trim()).length;
        dtMap[dtName] = (dtMap[dtName] || 0) + asigCount;
      }
    }
    
    result.indicadores_pta.asignaturas_disponibles_por_dt = dtMap;
  }

  private buildRelationsAndSimulateCarga(
    asignaturas: AsignaturaRow[],
    programas: ProgramaRow[],
    matrizOferta: import('./parsers/matriz-oferta.parser').OfertaMatrizResult[],
    result: ImportResultDto,
    dryRun: boolean,
    validCetapsMap: Map<string, boolean>,
    omitErrors: boolean = false
  ): void {
    const relaciones: import('./dto/import-result.dto').ProgramRelationDto[] = [];
    const asigCount = asignaturas.length;
    const progCount = programas.length;
    const nucleosSet = new Set(asignaturas.map(a => a.nucleo_tematico.trim().toUpperCase()).filter(Boolean));
    const cetapsSet = new Set<string>();
    let ofertasCount = 0;

    for (const m of matrizOferta) {
      if (m.codigo_cetap) cetapsSet.add(m.codigo_cetap.trim().toUpperCase());
      ofertasCount += m.programas_ofertados.length;
    }

    const progMap = new Map<string, import('./dto/import-result.dto').ProgramRelationDto>();

    for (const p of programas) {
      const pCode = p.codigo_programa.toLowerCase().trim();
      const relation: import('./dto/import-result.dto').ProgramRelationDto = {
        codigo_programa: p.codigo_programa,
        nombre_programa: p.nombre_programa,
        asignaturas: [],
        cetaps: [],
        valido: true,
        errores: []
      };
      progMap.set(pCode, relation);
      relaciones.push(relation);
    }

    for (const a of asignaturas) {
      const pCode = a.codigo_programa.toLowerCase().trim();
      const pRelation = progMap.get(pCode);
      if (pRelation) {
        pRelation.asignaturas.push({
          codigo: a.codigo_asignatura,
          nombre: a.nombre_asignatura,
          creditos: a.creditos,
          valida: true
        });
      }
    }

    for (const m of matrizOferta) {
      const validOfertados: string[] = [];
      for (const progOfertado of m.programas_ofertados) {
        const pCode = progOfertado.toLowerCase().trim();
        const pRelation = progMap.get(pCode);
        if (pRelation) {
          const mCode = m.codigo_cetap ? m.codigo_cetap.toLowerCase().trim() : '';
          const isValidCetap = validCetapsMap.has(mCode);
          
          if (!isValidCetap) {
            pRelation.valido = false;
            const relationError = `El CETAP ${m.codigo_cetap} no existe en la base de datos.`;
            if (!pRelation.errores.includes(relationError)) {
              pRelation.errores.push(relationError);
            }
            if (!omitErrors) {
              validOfertados.push(progOfertado);
            }
          } else {
            validOfertados.push(progOfertado);
          }

          pRelation.cetaps.push({
            codigo: m.codigo_cetap,
            nombre_dt: m.nombre_dt,
            valido: isValidCetap
          });
        }
      }
      
      if (omitErrors) {
        m.programas_ofertados = validOfertados;
      }
    }

    for (const rel of relaciones) {
      if (rel.asignaturas.length === 0) {
        rel.valido = false;
        rel.errores.push('El programa no tiene asignaturas asociadas en la carga.');
      }
      if (rel.cetaps.length === 0) {
        rel.valido = false; // Se marca como no válido (para llamar la atención en la UI) pero es sólo advertencia general
        rel.errores.push('El programa no tiene oferta territorial en ningún CETAP según la Matriz.');
      }
    }

    result.relaciones_cruzadas = relaciones;
  }

  private diffProgramFields(existing: any, parsed: any, resolvedFacId: number | string): string[] | null {
    const diffs: string[] = [];
    
    const parsedNombre = parsed.nombre_programa;
    const parsedNombreExcel = parsed.nombre_excel_origen || parsed.nombre_programa;
    const parsedNombreCorto = parsed.nombre_corto || parsed.nombre_programa.substring(0, 30);
    const parsedTipo = parsed.tipo_programa.toLowerCase().trim();
    const parsedModalidad = parsed.modalidad_principal.toLowerCase().trim() === 'mixta' ? 'mixto' : parsed.modalidad_principal.toLowerCase().trim();
    const parsedHorasBase = parsed.horas_base_por_credito;
    const parsedHorasCentral = parsed.horas_pregrado_central;
    const parsedActivo = parsed.activo === 'true' || parsed.activo === true || parsed.activo === 1;

    if (String(existing.nombre || '').trim() !== String(parsedNombre || '').trim()) diffs.push(`nombre: ${existing.nombre} -> ${parsedNombre}`);
    if (String(existing.nombre_excel || '').trim() !== String(parsedNombreExcel || '').trim()) diffs.push(`nombre_excel: ${existing.nombre_excel} -> ${parsedNombreExcel}`);
    if (String(existing.nombre_corto || '').trim() !== String(parsedNombreCorto || '').trim()) diffs.push(`nombre_corto: ${existing.nombre_corto} -> ${parsedNombreCorto}`);
    if (String(existing.id_facultad) !== String(resolvedFacId)) diffs.push(`id_facultad: ${existing.id_facultad} -> ${resolvedFacId}`);
    if (String(existing.tipo || '').trim() !== String(parsedTipo || '').trim()) diffs.push(`tipo: ${existing.tipo} -> ${parsedTipo}`);
    if (String(existing.modalidad || '').trim() !== String(parsedModalidad || '').trim()) diffs.push(`modalidad: ${existing.modalidad} -> ${parsedModalidad}`);
    if (String(existing.horas_base_por_credito) !== String(parsedHorasBase)) diffs.push(`horas_base: ${existing.horas_base_por_credito} -> ${parsedHorasBase}`);
    if (String(existing.horas_pregrado_central) !== String(parsedHorasCentral)) diffs.push(`horas_central: ${existing.horas_pregrado_central} -> ${parsedHorasCentral}`);
    if (Boolean(existing.activo) !== Boolean(parsedActivo)) diffs.push(`activo: ${existing.activo} -> ${parsedActivo}`);

    return diffs.length > 0 ? diffs : null;
  }

  private diffAsignaturaFields(
    existing: any,
    parsed: any,
    resolvedProgId: number | string,
    resolvedNtId: number | string,
    resolvedSemId: number,
    resolvedFacId: number | string
  ): string[] | null {
    const diffs: string[] = [];

    const parsedNombre = parsed.nombre_asignatura;
    const parsedNombreBase = parsed.nombre_base;
    const parsedModSufijo = parsed.modalidad;
    const parsedMod = mapModalidad(parsed.modalidad);
    const parsedRevMod = parsed.requiere_revision_modalidad === 'true' || parsed.requiere_revision_modalidad === true || String(parsed.requiere_revision_modalidad).trim().toLowerCase() === 'si';
    const parsedCreditos = parsed.creditos;
    const parsedExcep = mapTipoExcepcion(parsed.tipo_excepcion);
    
    let parsedHorasFijas: number | null = null;
    if (parsedExcep === 'seminario_enfasis') parsedHorasFijas = 384;
    else if (parsedExcep === 'opciones_grado_ap') parsedHorasFijas = 20;
    else if (parsedExcep === 'seminario_opciones_apt') parsedHorasFijas = 144;

    const parsedActiva = parsed.activa === 'true' || parsed.activa === true || parsed.activa === 1 || String(parsed.activa).trim().toLowerCase() === 'si';

    if (String(existing.nombre || '').trim() !== String(parsedNombre || '').trim()) diffs.push(`nombre: ${existing.nombre} -> ${parsedNombre}`);
    if (String(existing.nombre_base || '').trim() !== String(parsedNombreBase || '').trim()) diffs.push(`nombre_base: ${existing.nombre_base} -> ${parsedNombreBase}`);
    if (String(existing.modalidad_sufijo || '').trim() !== String(parsedModSufijo || '').trim()) diffs.push(`modalidad_sufijo: ${existing.modalidad_sufijo} -> ${parsedModSufijo}`);
    if (String(existing.modalidad || '').trim() !== String(parsedMod || '').trim()) diffs.push(`modalidad: ${existing.modalidad} -> ${parsedMod}`);
    if (Boolean(existing.requiere_revision_modalidad) !== Boolean(parsedRevMod)) diffs.push(`requiere_revision_modalidad: ${existing.requiere_revision_modalidad} -> ${parsedRevMod}`);
    if (String(existing.creditos) !== String(parsedCreditos)) diffs.push(`creditos: ${existing.creditos} -> ${parsedCreditos}`);
    if (String(existing.id_ubicacion_semestral) !== String(resolvedSemId)) diffs.push(`id_ubicacion_semestral: ${existing.id_ubicacion_semestral} -> ${resolvedSemId}`);
    if (String(existing.id_programa) !== String(resolvedProgId)) diffs.push(`id_programa: ${existing.id_programa} -> ${resolvedProgId}`);
    if (String(existing.id_nucleo_tematico) !== String(resolvedNtId)) diffs.push(`id_nucleo_tematico: ${existing.id_nucleo_tematico} -> ${resolvedNtId}`);
    if (String(existing.id_facultad) !== String(resolvedFacId)) diffs.push(`id_facultad: ${existing.id_facultad} -> ${resolvedFacId}`);
    if (String(existing.horas_fijas_pta) !== String(parsedHorasFijas)) diffs.push(`horas_fijas_pta: ${existing.horas_fijas_pta} -> ${parsedHorasFijas}`);
    if (String(existing.tipo_excepcion || '').trim() !== String(parsedExcep || '').trim()) diffs.push(`tipo_excepcion: ${existing.tipo_excepcion} -> ${parsedExcep}`);
    if (Boolean(existing.activa) !== Boolean(parsedActiva)) diffs.push(`activa: ${existing.activa} -> ${parsedActiva}`);

    return diffs.length > 0 ? diffs : null;
  }

  private async logAudit(startTime: number, result: ImportResultDto, periodo: string, user: any): Promise<void> {
    const logData = {
      method: 'POST',
      url: `/api/v1/asignaturas-import/upload`,
      path: `/api/v1/asignaturas-import/upload`,
      module: 'academic-work-plan',
      submodule: 'asignaturas-import',
      action: 'upload',
      userId: user?.id || 1,
      userEmail: user?.email || 'admin@esap.edu.co',
      userRole: user?.role || 'GESTION_PROFESORAL',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      entityName: 'asignatura',
      newData: {
        periodo,
        programas_cargados: result.carga.programas.creados,
        asignaturas_cargadas: result.carga.asignaturas.creados,
        cetaps_ofertados: result.carga.ofertas_cetap_programa.creados,
      },
    };

    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || 'http://localhost:3011';
    try {
      await fetch(`${auditServiceUrl}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (e: any) {
      this.logger.warn(`No se pudo enviar registro al audit-service: ${e.message}`);
    }
  }
}
