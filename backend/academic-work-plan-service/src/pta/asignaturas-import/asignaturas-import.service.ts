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
    const { asignaturas: rawAsignaturas, programas: rawProgramas, matrizOferta } = this.excelParser.parseExcel(buffer);

    // PASO 2 - Reglas de validación pre-insert
    const preInsertReport = ImportValidator.validarPreInsert(rawAsignaturas, rawProgramas);
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
    result.advertencias = [...circularWarnings];

    // Obtener CETAPs válidos de la BD para validación estricta
    const dbCetaps = await this.dataSource.query('SELECT codigo FROM academic_work_plan.cetap');
    const validCetapsMap = new Map<string, boolean>();
    for (const c of dbCetaps) {
      validCetapsMap.set(c.codigo.toLowerCase().trim(), true);
    }

    this.buildRelationsAndSimulateCarga(rawAsignaturas, rawProgramas, matrizOferta, result, dryRun, validCetapsMap, omitErrors);

    if (dryRun) {
      // Calcular indicadores de simulación
      this.calculateIndicators(rawAsignaturas, rawProgramas, matrizOferta, result);
      result.success = true;
      result.tiempo_ms = Date.now() - startTime;
      return result;
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

      // 6. Cargar PROGRAMAS
      const programasMap = await this.loadProgramas(queryRunner, rawProgramas, result.carga.programas);

      // 7. Cargar NUCLEOS_TEMATICOS
      const nucleosMap = await this.loadNucleosTematicos(queryRunner, rawAsignaturas, result.carga.nucleos_tematicos);

      // 8. Cargar CETAPS desde la base de datos (se asume que ya existen por estructura-import)
      const cetaps = await queryRunner.query('SELECT id, codigo FROM academic_work_plan.cetap');
      const cetapsMap = new Map<string, string>();
      for (const c of cetaps) {
        cetapsMap.set(c.codigo.toLowerCase().trim(), c.id);
      }

      // 9. Cargar OFERTA_CETAP_PROGRAMA
      await this.loadOfertasCetapPrograma(
        queryRunner,
        matrizOferta,
        programasMap,
        cetapsMap,
        periodId,
        result.carga.ofertas_cetap_programa,
      );

      // 10. Cargar las 423 ASIGNATURAS
      await this.loadAsignaturas(
        queryRunner,
        rawAsignaturas,
        programasMap,
        nucleosMap,
        semestresMap,
        result.carga.asignaturas,
      );

      // Confirmar transacción
      await queryRunner.commitTransaction();
      result.success = true;

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
    const counts = await this.dataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM academic_work_plan.programa) AS programas,
        (SELECT COUNT(*) FROM academic_work_plan.nucleo_tematico) AS nucleos_tematicos,
        (SELECT COUNT(*) FROM academic_work_plan.cetap) AS cetaps,
        (SELECT COUNT(*) FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = (SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1)) AS ofertas,
        (SELECT COUNT(*) FROM academic_work_plan.asignatura) AS asignaturas
    `, [periodo]);

    const stats = counts[0] || {};
    return {
      success: true,
      periodo,
      counts: {
        programas: parseInt(stats.programas || 0, 10),
        nucleos_tematicos: parseInt(stats.nucleos_tematicos || 0, 10),
        cetaps: parseInt(stats.cetaps || 0, 10),
        ofertas_cetap_programa: parseInt(stats.ofertas || 0, 10),
        asignaturas: parseInt(stats.asignaturas || 0, 10),
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

      const SQL = `
        INSERT INTO academic_work_plan.programa (
          codigo, nombre, nombre_excel, nombre_corto, id_facultad, tipo, modalidad, horas_base_por_credito, horas_pregrado_central, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (codigo) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          nombre_excel = EXCLUDED.nombre_excel,
          nombre_corto = EXCLUDED.nombre_corto,
          id_facultad = EXCLUDED.id_facultad,
          tipo = EXCLUDED.tipo,
          modalidad = EXCLUDED.modalidad,
          horas_base_por_credito = EXCLUDED.horas_base_por_credito,
          horas_pregrado_central = EXCLUDED.horas_pregrado_central,
          activo = EXCLUDED.activo
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
        p.activo === 'true' || p.activo === true || p.activo === 1,
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

    let i = 1;
    for (const name of uniqueNucleos) {
      const code = `NT-${String(i).padStart(3, '0')}`;
      const SQL = `
        INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, descripcion, activo)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (nombre) DO UPDATE SET
          codigo = EXCLUDED.codigo
        RETURNING id;
      `;
      const rows = await queryRunner.query(SQL, [code, name, `Núcleo temático: ${name}`]);
      map.set(name.toLowerCase().trim(), rows[0].id);
      countDto.creados++;
      i++;
    }

    return map;
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

    if (dryRun) {
      result.carga.programas.creados = progCount;
      result.carga.asignaturas.creados = asigCount;
      result.carga.nucleos_tematicos.creados = nucleosSet.size;
      result.carga.cetaps.creados = 0; // Se asume que no se crean cetaps en la carga, solo ofertas
      result.carga.ofertas_cetap_programa.creados = ofertasCount;
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
      const validOfertados = [];
      for (const progOfertado of m.programas_ofertados) {
        const pCode = progOfertado.toLowerCase().trim();
        const pRelation = progMap.get(pCode);
        if (pRelation) {
          const mCode = m.codigo_cetap ? m.codigo_cetap.toLowerCase().trim() : '';
          const isValidCetap = validCetapsMap.has(mCode);
          
          if (!isValidCetap) {
            pRelation.valido = false;
            pRelation.errores.push(`El CETAP ${m.codigo_cetap} no existe en la base de datos.`);
            result.errores.push(`Programa ${progOfertado} intenta ofertarse en CETAP inexistente: ${m.codigo_cetap}`);
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
