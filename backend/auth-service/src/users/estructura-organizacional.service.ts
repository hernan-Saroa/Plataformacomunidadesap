import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, QueryRunner } from 'typeorm';
import { Geopolitica } from './geopolitica.entity';
import { Sede } from './sede.entity';
import { Seccional } from './seccional.entity';
import {
  CreateSeccionalDto,
  UpdateSeccionalDto,
  CreateSedeDto,
  UpdateSedeDto,
} from './estructura-organizacional.dto';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface OfficialTerritorialRow {
  codigo_dt: string;
  nombre_dt: string;
  nombre_normalizado: string;
  orden_visualizacion: number;
  activo: boolean;
}

interface OfficialCetapRow {
  codigo_cetap: string;
  nombre_cetap: string;
  nombre_normalizado: string;
  codigo_dt: string;
  nombre_dt: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
}

@Injectable()
export class EstructuraOrganizacionalService {
  private officialGeographicCatalog:
    | {
        territoriales: OfficialTerritorialRow[];
        cetaps: OfficialCetapRow[];
      }
    | null = null;

  private readonly officialTerritorialAliases: Record<string, string> = {
    SC: 'SC',
    SCENT: 'SC',
    ANT: 'DT-001',
    ATL: 'DT-002',
    BCS: 'DT-003',
    BOL: 'DT-003',
    BOY: 'DT-004',
    CAL: 'DT-005',
    CAU: 'DT-006',
    CHO: 'DT-007',
    CUN: 'DT-008',
    HUI: 'DT-009',
    MET: 'DT-010',
    NAR: 'DT-011',
    NSA: 'DT-012',
    NDS: 'DT-012',
    RIS: 'DT-013',
    SAN: 'DT-014',
    TOL: 'DT-015',
    VAL: 'DT-016',
  };

  constructor(
    @InjectRepository(Geopolitica)
    private readonly geopoliticaRepo: Repository<Geopolitica>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(Seccional)
    private readonly seccionalRepo: Repository<Seccional>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== GEOPOLITICA ====================

  async findDepartamentos(): Promise<Geopolitica[]> {
    return this.geopoliticaRepo.find({
      where: { tipDivision: 'DEPTO' },
      order: { nomDivGeopolitica: 'ASC' },
    });
  }

  async findCiudadesByDepartamento(idDepartamento: number): Promise<Geopolitica[]> {
    return this.geopoliticaRepo.find({
      where: {
        tipDivision: 'CIUDAD',
        idPadre: idDepartamento,
      },
      order: { nomDivGeopolitica: 'ASC' },
    });
  }

  async findGeopoliticaById(id: number): Promise<Geopolitica | null> {
    return this.geopoliticaRepo.findOne({
      where: { idGeopolitica: id },
      relations: ['padre'],
    });
  }

  // ==================== SEDES ====================

  async findAllSedes(filters?: {
    idSeccional?: number;
    search?: string;
  }): Promise<Sede[]> {
    const query = this.sedeRepo.createQueryBuilder('sede')
      .leftJoinAndSelect('sede.geopolitica', 'geopolitica')
      .leftJoinAndSelect('sede.seccional', 'seccional');

    if (await this.hasCanonicalGeographicCatalog()) {
      query.andWhere(`(
        EXISTS (
          SELECT 1
            FROM academic_work_plan.cetap catalog_cetap
           WHERE catalog_cetap.codigo = sede.cod_sede
        )
        OR EXISTS (
          SELECT 1
            FROM auth.sede_cetap_mapping mapping
           WHERE mapping.id_sede = sede.id_sede
        )
      )`);
    }

    if (filters?.idSeccional) {
      query.andWhere('sede.idSeccional = :idSeccional', {
        idSeccional: filters.idSeccional,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(sede.nomSede ILIKE :search OR sede.codSede ILIKE :search OR geopolitica.nomDivGeopolitica ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('sede.nomSede', 'ASC');

    return query.getMany();
  }

  async findSedesBySeccional(idSeccional: number): Promise<Sede[]> {
    const query = this.sedeRepo
      .createQueryBuilder('sede')
      .leftJoinAndSelect('sede.geopolitica', 'geopolitica')
      .where('sede.id_seccional = :idSeccional', { idSeccional });
    if (await this.hasCanonicalGeographicCatalog()) {
      query.andWhere(`(
        EXISTS (
          SELECT 1
            FROM academic_work_plan.cetap catalog_cetap
           WHERE catalog_cetap.codigo = sede.cod_sede
        )
        OR EXISTS (
          SELECT 1
            FROM auth.sede_cetap_mapping mapping
           WHERE mapping.id_sede = sede.id_sede
        )
      )`);
    }
    return query.orderBy('sede.nom_sede', 'ASC').getMany();
  }

  async findSedeById(id: number): Promise<Sede | null> {
    return this.sedeRepo.findOne({
      where: { idSede: id },
      relations: ['geopolitica', 'seccional', 'seccional.ubicacion'],
    });
  }

  // ==================== SECCIONALES ====================

  async findAllSeccionales(): Promise<Seccional[]> {
    const query = this.seccionalRepo
      .createQueryBuilder('seccional')
      .leftJoinAndSelect('seccional.ubicacion', 'ubicacion');
    if (await this.hasCanonicalGeographicCatalog()) {
      query.andWhere(`(
        EXISTS (
          SELECT 1
            FROM academic_work_plan.direccion_territorial catalog_dt
           WHERE catalog_dt.codigo = seccional.cod_seccional
        )
        OR EXISTS (
          SELECT 1
            FROM auth.sedes mapped_sede
            INNER JOIN auth.sede_cetap_mapping mapping
                    ON mapping.id_sede = mapped_sede.id_sede
           WHERE mapped_sede.id_seccional = seccional.id_seccional
        )
      )`);
    }
    return query.orderBy('seccional.nom_seccional', 'ASC').getMany();
  }

  async findSeccionalById(id: number): Promise<Seccional | null> {
    return this.seccionalRepo.findOne({
      where: { idSeccional: id },
      relations: ['ubicacion'],
    });
  }

  async createSeccional(dto: CreateSeccionalDto): Promise<Seccional> {
    // Verificar si ya existe una seccional con el mismo código
    if (dto.codSeccional) {
      const existing = await this.seccionalRepo.findOne({
        where: { codSeccional: dto.codSeccional },
      });
      if (existing) {
        throw new ConflictException(`Ya existe una seccional con el código ${dto.codSeccional}`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SELECT pg_advisory_xact_lock(hashtext('estructura-seccional-create'))`,
      );
      const [maxRow] = await queryRunner.query(
        `SELECT COALESCE(MAX(id_seccional), 0) + 1 AS next_id
           FROM auth.seccionales`,
      );
      const seccional = this.seccionalRepo.create({
        ...dto,
        idSeccional: Number(maxRow?.next_id || 1),
        fecCreacion: new Date(),
      });
      const saved = await queryRunner.manager.save(Seccional, seccional);

      // Sync to academic_work_plan.direccion_territorial
      if (saved.codSeccional) {
        const normSecName = saved.nomSeccional.toUpperCase().replace(/\s+/g, '_');
        const normSecNameLower = saved.nomSeccional.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

        await queryRunner.query(
          `INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, activo, orden_visualizacion)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, activo = EXCLUDED.activo, orden_visualizacion = EXCLUDED.orden_visualizacion, updated_at = CURRENT_TIMESTAMP`,
          [saved.codSeccional, normSecName, normSecNameLower, dto.activo ?? true, dto.ordenVisualizacion ?? 999]
        );
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSeccional(id: number, dto: UpdateSeccionalDto): Promise<Seccional> {
    const seccional = await this.findSeccionalById(id);
    if (!seccional) {
      throw new NotFoundException(`Seccional con ID ${id} no encontrada`);
    }

    // Verificar código duplicado si se está actualizando
    if (dto.codSeccional && dto.codSeccional !== seccional.codSeccional) {
      const existing = await this.seccionalRepo.findOne({
        where: { codSeccional: dto.codSeccional },
      });
      if (existing) {
        throw new ConflictException(`Ya existe una seccional con el código ${dto.codSeccional}`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldCod = seccional.codSeccional;
      Object.assign(seccional, dto, { fecUltAct: new Date() });
      const saved = await queryRunner.manager.save(Seccional, seccional);

      // Sync to academic_work_plan.direccion_territorial
      if (saved.codSeccional) {
        const normSecName = saved.nomSeccional.toUpperCase().replace(/\s+/g, '_');
        const normSecNameLower = saved.nomSeccional.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

        if (oldCod && oldCod !== saved.codSeccional) {
          await queryRunner.query(
            `UPDATE academic_work_plan.direccion_territorial 
             SET codigo = $1, nombre = $2, nombre_normalizado = $3, activo = $4, orden_visualizacion = $5, updated_at = CURRENT_TIMESTAMP 
             WHERE codigo = $6`,
            [saved.codSeccional, normSecName, normSecNameLower, dto.activo ?? true, dto.ordenVisualizacion ?? 999, oldCod]
          );
        } else {
          await queryRunner.query(
            `INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, activo, orden_visualizacion)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, activo = EXCLUDED.activo, orden_visualizacion = EXCLUDED.orden_visualizacion, updated_at = CURRENT_TIMESTAMP`,
            [saved.codSeccional, normSecName, normSecNameLower, dto.activo ?? true, dto.ordenVisualizacion ?? 999]
          );
        }
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteSeccional(id: number): Promise<void> {
    const seccional = await this.findSeccionalById(id);
    if (!seccional) {
      throw new NotFoundException(`Seccional con ID ${id} no encontrada`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Eliminación EN CASCADA: primero se borran TODAS las sedes asociadas
      // (con la misma limpieza que el borrado individual de sede) y luego la
      // seccional. Todo dentro de una sola transacción: si algo falla no se borra
      // nada (operación atómica), evitando estados a medias o inconsistentes.
      const sedes = await queryRunner.manager.find(Sede, {
        where: { idSeccional: id },
      });
      for (const sede of sedes) {
        await this.removeSedeInTransaction(queryRunner, sede);
      }

      const codSeccional = seccional.codSeccional;
      await queryRunner.manager.remove(Seccional, seccional);

      if (codSeccional) {
        await queryRunner.query(
          'UPDATE academic_work_plan.direccion_territorial SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE codigo = $1',
          [codSeccional]
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== SEDES CRUD ====================

  async createSede(dto: CreateSedeDto): Promise<Sede> {
    // Verificar si ya existe una sede con el mismo código
    if (dto.codSede) {
      const existing = await this.sedeRepo.findOne({
        where: { codSede: dto.codSede },
      });
      if (existing) {
        throw new ConflictException(`Ya existe una sede con el código ${dto.codSede}`);
      }
    }

    // Verificar que la seccional existe si se proporciona
    let seccional: Seccional | null = null;
    if (dto.idSeccional) {
      seccional = await this.findSeccionalById(dto.idSeccional);
      if (!seccional) {
        throw new NotFoundException(`Seccional con ID ${dto.idSeccional} no encontrada`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SELECT pg_advisory_xact_lock(hashtext('estructura-sede-create'))`,
      );
      // Obtener el próximo ID manualmente (la tabla no tiene auto-increment)
      const maxResult = await queryRunner.manager
        .createQueryBuilder(Sede, 'sede')
        .select('MAX(sede.idSede)', 'maxId')
        .getRawOne();
      const nextId = (parseInt(maxResult?.maxId) || 0) + 1;

      const sede = this.sedeRepo.create({
        ...dto,
        idSede: nextId,
        idEmpresa: 1,
        codSede: dto.codSede?.trim() || `SEDE-${nextId}`,
        idGeopolitica:
          dto.idGeopolitica ?? seccional?.idUbiSeccional ?? 172,
        numLatitud: dto.latitud,
        numLongitud: dto.longitud,
        fecCreacion: new Date(),
      });
      const saved = await queryRunner.manager.save(Sede, sede);

      // Sincronizar con academic_work_plan.cetap
      if (saved.codSede && seccional?.codSeccional) {
        const dtRows = await queryRunner.query(
          'SELECT id FROM academic_work_plan.direccion_territorial WHERE codigo = $1 LIMIT 1',
          [seccional.codSeccional]
        );
        const dtId = dtRows[0]?.id;

        if (dtId) {
          const normSedeNameLower = saved.nomSede.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
          const isActive = saved.sedeAct === 'ACTIVA' || saved.sedeAct === 'ACTIVO';

          const tipo = dto.tipo || (['SC', 'SCENT'].includes(seccional.codSeccional) ? 'sede_central' : 'cetap');

          const cetapRows = await queryRunner.query(
            `INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, latitud, longitud, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, id_direccion_territorial = EXCLUDED.id_direccion_territorial, tipo = EXCLUDED.tipo, latitud = EXCLUDED.latitud, longitud = EXCLUDED.longitud, activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive]
          );
          const cetapDbId = cetapRows[0]?.id;
          if (cetapDbId) {
            await queryRunner.query(
              `INSERT INTO auth.sede_cetap_mapping (
                 id_sede, id_cetap, origen, created_at, updated_at
               ) VALUES ($1, $2, 'legacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT (id_sede)
               DO UPDATE SET
                 id_cetap = EXCLUDED.id_cetap,
                 origen = EXCLUDED.origen,
                 updated_at = CURRENT_TIMESTAMP`,
              [saved.idSede, cetapDbId],
            );

            // La sede/CETAP queda disponible (ACTIVA) en TODOS los periodos, igual
            // que en la importación. Cada periodo es independiente: ON CONFLICT DO
            // NOTHING respeta cualquier estado/inactivación previa por periodo.
            await queryRunner.query(
              `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo)
               SELECT pa.id, $1, TRUE
                 FROM academic_work_plan.periodo_academico pa
               ON CONFLICT (id_periodo_academico, id_cetap) DO NOTHING`,
              [cetapDbId],
            );
          }

        }
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSede(id: number, dto: UpdateSedeDto): Promise<Sede> {
    const sede = await this.findSedeById(id);
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }

    // Verificar código duplicado si se está actualizando
    if (dto.codSede && dto.codSede !== sede.codSede) {
      const existing = await this.sedeRepo.findOne({
        where: { codSede: dto.codSede },
      });
      if (existing) {
        throw new ConflictException(`Ya existe una sede con el código ${dto.codSede}`);
      }
    }

    // Verificar que la seccional existe si se está actualizando
    let seccional: Seccional | null = null;
    const targetSeccionalId = dto.idSeccional || sede.idSeccional;
    if (targetSeccionalId) {
      seccional = await this.findSeccionalById(targetSeccionalId);
      if (!seccional) {
        throw new NotFoundException(`Seccional con ID ${targetSeccionalId} no encontrada`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldCod = sede.codSede;
      Object.assign(sede, dto, {
        numLatitud: dto.latitud !== undefined ? dto.latitud : sede.numLatitud,
        numLongitud: dto.longitud !== undefined ? dto.longitud : sede.numLongitud,
        fecUltAct: new Date()
      });
      const saved = await queryRunner.manager.save(Sede, sede);

      // Sincronizar con academic_work_plan.cetap
      if (saved.codSede && seccional?.codSeccional) {
        const dtRows = await queryRunner.query(
          'SELECT id FROM academic_work_plan.direccion_territorial WHERE codigo = $1 LIMIT 1',
          [seccional.codSeccional]
        );
        const dtId = dtRows[0]?.id;

        if (dtId) {
          const normSedeNameLower = saved.nomSede.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
          const isActive = saved.sedeAct === 'ACTIVA' || saved.sedeAct === 'ACTIVO';

          const tipo = dto.tipo || (['SC', 'SCENT'].includes(seccional.codSeccional) ? 'sede_central' : 'cetap');

          let cetapRows: any[];
          if (oldCod && oldCod !== saved.codSede) {
            cetapRows = await queryRunner.query(
              `UPDATE academic_work_plan.cetap 
               SET codigo = $1, nombre = $2, nombre_normalizado = $3, id_direccion_territorial = $4, tipo = $5, latitud = $6, longitud = $7, activo = $8, updated_at = CURRENT_TIMESTAMP
               WHERE codigo = $9
               RETURNING id`,
              [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive, oldCod]
            );
          } else {
            cetapRows = await queryRunner.query(
              `INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, latitud, longitud, activo)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, id_direccion_territorial = EXCLUDED.id_direccion_territorial, tipo = EXCLUDED.tipo, latitud = EXCLUDED.latitud, longitud = EXCLUDED.longitud, activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP
               RETURNING id`,
              [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive]
            );
          }
          const cetapDbId = cetapRows[0]?.id;
          if (cetapDbId) {
            await queryRunner.query(
              `INSERT INTO auth.sede_cetap_mapping (
                 id_sede, id_cetap, origen, created_at, updated_at
               ) VALUES ($1, $2, 'legacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT (id_sede)
               DO UPDATE SET
                 id_cetap = EXCLUDED.id_cetap,
                 origen = EXCLUDED.origen,
                 updated_at = CURRENT_TIMESTAMP`,
              [saved.idSede, cetapDbId],
            );

            // La sede/CETAP queda disponible (ACTIVA) en TODOS los periodos, igual
            // que en la importación. Cada periodo es independiente: ON CONFLICT DO
            // NOTHING respeta cualquier estado/inactivación previa por periodo.
            await queryRunner.query(
              `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo)
               SELECT pa.id, $1, TRUE
                 FROM academic_work_plan.periodo_academico pa
               ON CONFLICT (id_periodo_academico, id_cetap) DO NOTHING`,
              [cetapDbId],
            );
          }
        }
      }

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Limpieza de una sede DENTRO de una transacción ya abierta: elimina la sede del
   * catálogo maestro (auth.sedes) y desactiva su CETAP espejo en el plan académico,
   * incluyendo su oferta y su activación por periodo (periodo_cetap).
   *
   * Se reutiliza tanto en el borrado individual de una sede como en el borrado en
   * cascada de una seccional, para garantizar EXACTAMENTE el mismo comportamiento
   * en ambos casos y no dejar activaciones de periodo huérfanas.
   */
  private async removeSedeInTransaction(
    queryRunner: QueryRunner,
    sede: Sede,
  ): Promise<void> {
    const id = sede.idSede;
    const codSede = sede.codSede;

    const mappingRows = await queryRunner.query(
      `SELECT id_cetap
         FROM auth.sede_cetap_mapping
        WHERE id_sede = $1
        LIMIT 1`,
      [id],
    );
    await queryRunner.manager.remove(Sede, sede);

    let cetapId = mappingRows[0]?.id_cetap;
    if (!cetapId && codSede) {
      const cetapRows = await queryRunner.query(
        'SELECT id FROM academic_work_plan.cetap WHERE codigo = $1 LIMIT 1',
        [codSede],
      );
      cetapId = cetapRows[0]?.id;
    }

    if (cetapId) {
      await queryRunner.query(
        'UPDATE academic_work_plan.cetap SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [cetapId],
      );
      await queryRunner.query(
        'UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id_cetap = $1',
        [cetapId],
      );
      await queryRunner.query(
        'UPDATE academic_work_plan.periodo_cetap SET activo = FALSE WHERE id_cetap = $1',
        [cetapId],
      );
    }
  }

  async deleteSede(id: number): Promise<void> {
    const sede = await this.findSedeById(id);
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.removeSedeInTransaction(queryRunner, sede);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== ESTADÍSTICAS ====================

  async getEstadisticas(): Promise<{
    totalSeccionales: number;
    totalSedes: number;
    totalEstudiantes: number;
    totalDocentes: number;
    sedesPorSeccional: { seccional: string; count: string }[];
  }> {
    if (await this.hasCanonicalGeographicCatalog()) {
      const rows = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(DISTINCT sec.id_seccional)
             FROM auth.seccionales sec
            WHERE EXISTS (
                    SELECT 1
                      FROM academic_work_plan.direccion_territorial dt
                     WHERE dt.codigo = sec.cod_seccional
                  )
               OR EXISTS (
                    SELECT 1
                      FROM auth.sedes mapped_sede
                      INNER JOIN auth.sede_cetap_mapping mapping
                              ON mapping.id_sede = mapped_sede.id_sede
                     WHERE mapped_sede.id_seccional = sec.id_seccional
                  )) AS total_seccionales,
          (SELECT COUNT(DISTINCT sede.id_sede)
             FROM auth.sedes sede
            WHERE EXISTS (
                    SELECT 1
                      FROM academic_work_plan.cetap cetap
                     WHERE cetap.codigo = sede.cod_sede
                  )
               OR EXISTS (
                    SELECT 1
                      FROM auth.sede_cetap_mapping mapping
                     WHERE mapping.id_sede = sede.id_sede
                  )) AS total_sedes,
          (SELECT COALESCE(SUM(sede.capacidad_estudiantes), 0)
             FROM auth.sedes sede
            WHERE EXISTS (
                    SELECT 1
                      FROM academic_work_plan.cetap cetap
                     WHERE cetap.codigo = sede.cod_sede
                  )
               OR EXISTS (
                    SELECT 1
                      FROM auth.sede_cetap_mapping mapping
                     WHERE mapping.id_sede = sede.id_sede
                  )) AS total_estudiantes,
          (SELECT COALESCE(SUM(sede.capacidad_docentes), 0)
             FROM auth.sedes sede
            WHERE EXISTS (
                    SELECT 1
                      FROM academic_work_plan.cetap cetap
                     WHERE cetap.codigo = sede.cod_sede
                  )
               OR EXISTS (
                    SELECT 1
                      FROM auth.sede_cetap_mapping mapping
                     WHERE mapping.id_sede = sede.id_sede
                  )) AS total_docentes
      `);
      const sedesPorSeccional = await this.dataSource.query(`
        SELECT sec.nom_seccional AS seccional, COUNT(sede.id_sede)::text AS count
          FROM auth.seccionales sec
          LEFT JOIN auth.sedes sede
                 ON sede.id_seccional = sec.id_seccional
         WHERE (
                 EXISTS (
                   SELECT 1
                     FROM academic_work_plan.direccion_territorial dt
                    WHERE dt.codigo = sec.cod_seccional
                 )
                 OR EXISTS (
                   SELECT 1
                     FROM auth.sedes mapped_sede
                     INNER JOIN auth.sede_cetap_mapping mapping
                             ON mapping.id_sede = mapped_sede.id_sede
                    WHERE mapped_sede.id_seccional = sec.id_seccional
                 )
               )
           AND (
                 sede.id_sede IS NULL
                 OR EXISTS (
                   SELECT 1
                     FROM academic_work_plan.cetap cetap
                    WHERE cetap.codigo = sede.cod_sede
                 )
                 OR EXISTS (
                   SELECT 1
                     FROM auth.sede_cetap_mapping mapping
                    WHERE mapping.id_sede = sede.id_sede
                 )
               )
         GROUP BY sec.id_seccional, sec.nom_seccional
         ORDER BY sec.nom_seccional
      `);
      const stats = rows[0] || {};
      return {
        totalSeccionales: Number(stats.total_seccionales || 0),
        totalSedes: Number(stats.total_sedes || 0),
        totalEstudiantes: Number(stats.total_estudiantes || 0),
        totalDocentes: Number(stats.total_docentes || 0),
        sedesPorSeccional,
      };
    }

    const totalSeccionales = await this.seccionalRepo.count();
    const totalSedes = await this.sedeRepo.count();

    // Obtener totales de capacidad de estudiantes y docentes
    const capacidadTotales = await this.sedeRepo
      .createQueryBuilder('sede')
      .select('COALESCE(SUM(sede.capacidadEstudiantes), 0)', 'totalEstudiantes')
      .addSelect('COALESCE(SUM(sede.capacidadDocentes), 0)', 'totalDocentes')
      .getRawOne();

    const sedesPorSeccional = await this.sedeRepo
      .createQueryBuilder('sede')
      .leftJoin('sede.seccional', 'seccional')
      .select('seccional.nomSeccional', 'seccional')
      .addSelect('COUNT(sede.idSede)', 'count')
      .groupBy('seccional.nomSeccional')
      .getRawMany();

    return {
      totalSeccionales,
      totalSedes,
      totalEstudiantes: parseInt(capacidadTotales?.totalEstudiantes) || 0,
      totalDocentes: parseInt(capacidadTotales?.totalDocentes) || 0,
      sedesPorSeccional,
    };
  }

  private async hasCanonicalGeographicCatalog(): Promise<boolean> {
    const rows = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*)
           FROM academic_work_plan.direccion_territorial
          WHERE codigo = 'SC' OR codigo ~ '^DT-[0-9]{3}$') AS dts,
        (SELECT COUNT(*)
           FROM academic_work_plan.cetap
          WHERE codigo ~ '^CET-[0-9]{4}$') AS cetaps
    `);
    return (
      Number(rows[0]?.dts || 0) >= 17 &&
      Number(rows[0]?.cetaps || 0) >= 290
    );
  }

  async importarEstructura(fileBuffer: Buffer, periodoCodigo: string) {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (e) {
      throw new BadRequestException('El archivo no es un libro de Excel válido (.xlsx o .xls).');
    }

    const sheetName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('estructura') ||
      name.toLowerCase().includes('cetap') ||
      name.toLowerCase().includes('sede') ||
      name.toLowerCase().includes('seccional')
    ) || workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('No se encontró ninguna hoja en el archivo Excel.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any>(sheet, { defval: null });

    if (rows.length === 0) {
      throw new BadRequestException('La hoja de cálculo está vacía.');
    }

    const normalizedRows = rows.map(row => {
      const normalizedRow: any = {};
      for (const key of Object.keys(row)) {
        const normKey = key.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '')
          .trim();
        normalizedRow[normKey] = row[key];
      }
      return normalizedRow;
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let seccionalesCreadas = 0;
    let seccionalesActualizadas = 0;
    let sedesCreadas = 0;
    let sedesActualizadas = 0;
    let sedesActivadasPeriodo = 0;
    const warnings: string[] = [];

    try {
      const periodRows = await queryRunner.query(
        'SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1',
        [periodoCodigo]
      );
      if (periodRows.length === 0) {
        throw new BadRequestException(`El periodo académico con código ${periodoCodigo} no existe.`);
      }
      const periodId = periodRows[0].id;

      const geopoliticaRows = await queryRunner.query(
        `SELECT id_geopolitica, nom_div_geopolitica, tip_division, id_padre FROM auth.geopolitica WHERE tip_division IN ('DEPTO', 'CIUDAD')`
      );

      const normalizeText = (text: string): string => {
        if (!text) return '';
        return text.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();
      };

      const deptosMap = new Map<string, any>();
      const citiesMap = new Map<string, any>();

      for (const g of geopoliticaRows) {
        const normName = normalizeText(g.nom_div_geopolitica);
        if (g.tip_division === 'DEPTO') {
          deptosMap.set(normName, g);
        } else if (g.tip_division === 'CIUDAD') {
          citiesMap.set(`${normName}_${g.id_padre}`, g);
        }
      }

      // 1. Cargar e indexar seccionales
      const dbSeccionales = await queryRunner.query('SELECT id_seccional, cod_seccional, nom_seccional FROM auth.seccionales');
      const existingSecMapByCode = new Map<string, any>();
      const existingSecMapByName = new Map<string, any>();
      for (const s of dbSeccionales) {
        if (s.cod_seccional) {
          existingSecMapByCode.set(s.cod_seccional.trim(), s);
        }
        existingSecMapByName.set(normalizeText(s.nom_seccional), s);
      }

      // 2. Cargar e indexar DTs
      const dbDTs = await queryRunner.query('SELECT id, codigo, nombre, nombre_normalizado FROM academic_work_plan.direccion_territorial');
      const existingDTMapByCode = new Map<string, any>();
      const existingDTMapByName = new Map<string, any>();
      for (const dt of dbDTs) {
        if (dt.codigo) {
          existingDTMapByCode.set(dt.codigo.trim(), dt);
        }
        existingDTMapByName.set(dt.nombre_normalizado || normalizeText(dt.nombre), dt);
      }

      // Helper para limpiar el nombre de las sedes (quitar "cetap ")
      const cleanSedeName = (name: string): string => {
        if (!name) return '';
        let cleaned = name.toLowerCase().trim();
        if (cleaned.startsWith('cetap ')) {
          cleaned = cleaned.substring(6).trim();
        }
        return normalizeText(cleaned);
      };

      // 3. Cargar e indexar sedes
      const dbSedes = await queryRunner.query('SELECT id_sede, cod_sede, nom_sede, id_seccional FROM auth.sedes');
      const existingSedeMapByCode = new Map<string, any>();
      const existingSedeMapByNameAndSec = new Map<string, any>();
      for (const s of dbSedes) {
        if (s.cod_sede) {
          existingSedeMapByCode.set(s.cod_sede.trim(), s);
        }
        const nameKey = `${cleanSedeName(s.nom_sede)}_${s.id_seccional}`;
        existingSedeMapByNameAndSec.set(nameKey, s);
      }

      // 4. Cargar e indexar cetaps
      const dbCetaps = await queryRunner.query('SELECT id, codigo, nombre, nombre_normalizado, id_direccion_territorial FROM academic_work_plan.cetap');
      const existingCetapMapByCode = new Map<string, any>();
      const existingCetapMapByNameAndDT = new Map<string, any>();
      for (const c of dbCetaps) {
        if (c.codigo) {
          existingCetapMapByCode.set(c.codigo.trim(), c);
        }
        const key = `${c.nombre_normalizado || normalizeText(c.nombre)}_${c.id_direccion_territorial}`;
        existingCetapMapByNameAndDT.set(key, c);
      }

      for (let idx = 0; idx < normalizedRows.length; idx++) {
        const row = normalizedRows[idx];
        
        const codSeccional = (row.codigo_seccional || row.cod_seccional || row.codigo_territorial || '').toString().trim();
        const nomSeccional = (row.nombre_seccional || row.nom_seccional || row.nombre_territorial || row.territorial || '').toString().trim();
        const codSede = (row.codigo_sede || row.cod_sede || row.codigo_cetap || '').toString().trim();
        const nomSede = (row.nombre_sede || row.nom_sede || row.nombre_cetap || row.cetap || '').toString().trim();
        const departamento = (row.departamento || row.depto || '').toString().trim();
        const municipio = (row.municipio || row.ciudad || '').toString().trim();
        const activoVal = row.activo !== undefined ? row.activo : row.activa;
        const isRowActive = activoVal === undefined || activoVal === null || 
          ['si', 's', 'true', '1', 'activo', 'activa'].includes(activoVal.toString().toLowerCase().trim());

        if (!codSeccional || !nomSeccional) {
          warnings.push(`Fila ${idx + 2}: Seccional vacía, se omitió.`);
          continue;
        }

        let deptoGeoId: number | null = null;
        if (departamento) {
          const normDepto = normalizeText(departamento);
          const deptoGeo = deptosMap.get(normDepto);
          if (deptoGeo) {
            deptoGeoId = parseInt(deptoGeo.id_geopolitica, 10);
          } else {
            warnings.push(`Fila ${idx + 2}: No se encontró el departamento "${departamento}" en geopolítica.`);
          }
        }

        let seccionalId: string;
        let matchedSec = existingSecMapByCode.get(codSeccional);
        if (!matchedSec) {
          matchedSec = existingSecMapByName.get(normalizeText(nomSeccional));
          if (matchedSec) {
            await queryRunner.query(
              'UPDATE auth.seccionales SET cod_seccional = $1, nom_seccional = $2, id_ubi_seccional = COALESCE($3, id_ubi_seccional), fec_ult_act = CURRENT_DATE WHERE id_seccional = $4',
              [codSeccional, nomSeccional, deptoGeoId, matchedSec.id_seccional]
            );
            seccionalesActualizadas++;
            matchedSec.cod_seccional = codSeccional;
            matchedSec.nom_seccional = nomSeccional;
            existingSecMapByCode.set(codSeccional, matchedSec);
          }
        } else {
          await queryRunner.query(
            'UPDATE auth.seccionales SET nom_seccional = $1, id_ubi_seccional = COALESCE($2, id_ubi_seccional), fec_ult_act = CURRENT_DATE WHERE id_seccional = $3',
            [nomSeccional, deptoGeoId, matchedSec.id_seccional]
          );
          seccionalesActualizadas++;
        }

        if (matchedSec) {
          seccionalId = matchedSec.id_seccional;
        } else {
          const maxSec = await queryRunner.query('SELECT MAX(id_seccional) as max_id FROM auth.seccionales');
          const nextSecId = (parseInt(maxSec[0]?.max_id) || 0) + 1;
          seccionalId = nextSecId.toString();

          await queryRunner.query(
            'INSERT INTO auth.seccionales (id_seccional, cod_seccional, nom_seccional, id_ubi_seccional, fec_creacion) VALUES ($1, $2, $3, $4, CURRENT_DATE)',
            [seccionalId, codSeccional, nomSeccional, deptoGeoId]
          );
          seccionalesCreadas++;

          const newSec = { id_seccional: seccionalId, cod_seccional: codSeccional, nom_seccional: nomSeccional };
          existingSecMapByCode.set(codSeccional, newSec);
          existingSecMapByName.set(normalizeText(nomSeccional), newSec);
        }

        const normSecName = nomSeccional.toUpperCase().replace(/\s+/g, '_');
        const normSecNameLower = normalizeText(nomSeccional);

        let dtDbId: string;
        let matchedDT = existingDTMapByCode.get(codSeccional);
        if (!matchedDT) {
          matchedDT = existingDTMapByName.get(normSecNameLower);
          if (matchedDT) {
            await queryRunner.query(
              'UPDATE academic_work_plan.direccion_territorial SET codigo = $1, nombre = $2, nombre_normalizado = $3, activo = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
              [codSeccional, normSecName, normSecNameLower, matchedDT.id]
            );
            matchedDT.codigo = codSeccional;
            matchedDT.nombre = normSecName;
            matchedDT.nombre_normalizado = normSecNameLower;
            existingDTMapByCode.set(codSeccional, matchedDT);
          }
        } else {
          await queryRunner.query(
            'UPDATE academic_work_plan.direccion_territorial SET nombre = $1, nombre_normalizado = $2, activo = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [normSecName, normSecNameLower, matchedDT.id]
          );
        }

        if (matchedDT) {
          dtDbId = matchedDT.id;
        } else {
          const dtRows = await queryRunner.query(
            'INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, activo, orden_visualizacion) VALUES ($1, $2, $3, TRUE, 999) RETURNING id',
            [codSeccional, normSecName, normSecNameLower]
          );
          dtDbId = dtRows[0].id;

          const newDT = { id: dtDbId, codigo: codSeccional, nombre: normSecName, nombre_normalizado: normSecNameLower };
          existingDTMapByCode.set(codSeccional, newDT);
          existingDTMapByName.set(normSecNameLower, newDT);
        }

        if (!codSede || !nomSede) {
          continue;
        }

        let cityGeoId: number | null = null;
        if (municipio && deptoGeoId) {
          const normCity = normalizeText(municipio);
          const cityGeo = citiesMap.get(`${normCity}_${deptoGeoId}`);
          if (cityGeo) {
            cityGeoId = parseInt(cityGeo.id_geopolitica, 10);
          } else {
            const globalCity = geopoliticaRows.find(g => g.tip_division === 'CIUDAD' && normalizeText(g.nom_div_geopolitica) === normCity);
            if (globalCity) {
              cityGeoId = parseInt(globalCity.id_geopolitica, 10);
            } else {
              warnings.push(`Fila ${idx + 2}: No se encontró el municipio "${municipio}" en geopolítica.`);
            }
          }
        }

        const inputCapEst = row.capacidad_estudiantes || row.capacidad_estudiante || row.capacidadestudiantes || row.capacidadestudiante || row.estudiantes;
        const inputCapDoc = row.capacidad_docentes || row.capacidad_docente || row.capacidaddocentes || row.capacidaddocente || row.docentes;

        const capacidadEstudiantes = inputCapEst !== undefined && inputCapEst !== null && inputCapEst !== '' ? parseInt(inputCapEst, 10) : null;
        const capacidadDocentes = inputCapDoc !== undefined && inputCapDoc !== null && inputCapDoc !== '' ? parseInt(inputCapDoc, 10) : null;

        let sedeId: string;
        let matchedSede = existingSedeMapByCode.get(codSede);
        if (!matchedSede) {
          const nameKey = `${cleanSedeName(nomSede)}_${seccionalId}`;
          matchedSede = existingSedeMapByNameAndSec.get(nameKey);
          if (matchedSede) {
            await queryRunner.query(
              `UPDATE auth.sedes 
               SET cod_sede = $1,
                   nom_sede = $2, 
                   id_seccional = $3, 
                   id_geopolitica = COALESCE($4, id_geopolitica), 
                   fec_ult_act = CURRENT_DATE, 
                   sede_act = $5,
                   capacidad_estudiantes = COALESCE($6, capacidad_estudiantes),
                   capacidad_docentes = COALESCE($7, capacidad_docentes)
               WHERE id_sede = $8`,
              [
                codSede,
                nomSede,
                seccionalId,
                cityGeoId,
                isRowActive ? 'ACTIVA' : 'INACTIVA',
                capacidadEstudiantes,
                capacidadDocentes,
                matchedSede.id_sede
              ]
            );
            sedesActualizadas++;
            matchedSede.cod_sede = codSede;
            matchedSede.nom_sede = nomSede;
            matchedSede.id_seccional = seccionalId;
            existingSedeMapByCode.set(codSede, matchedSede);
          }
        } else {
          await queryRunner.query(
            `UPDATE auth.sedes 
             SET nom_sede = $1, 
                 id_seccional = $2, 
                 id_geopolitica = COALESCE($3, id_geopolitica), 
                 fec_ult_act = CURRENT_DATE, 
                 sede_act = $4,
                 capacidad_estudiantes = COALESCE($5, capacidad_estudiantes),
                 capacidad_docentes = COALESCE($6, capacidad_docentes)
             WHERE id_sede = $7`,
            [
              nomSede,
              seccionalId,
              cityGeoId,
              isRowActive ? 'ACTIVA' : 'INACTIVA',
              capacidadEstudiantes,
              capacidadDocentes,
              matchedSede.id_sede
            ]
          );
          sedesActualizadas++;
        }

        if (matchedSede) {
          sedeId = matchedSede.id_sede;
        } else {
          const maxSede = await queryRunner.query('SELECT MAX(id_sede) as max_id FROM auth.sedes');
          const nextSedeId = (parseInt(maxSede[0]?.max_id) || 0) + 1;
          sedeId = nextSedeId.toString();

          const finalCapEst = capacidadEstudiantes !== null ? capacidadEstudiantes : (nomSede.toLowerCase().includes('central') ? 5000 : 150);
          const finalCapDoc = capacidadDocentes !== null ? capacidadDocentes : (nomSede.toLowerCase().includes('central') ? 500 : 15);

          await queryRunner.query(
            `INSERT INTO auth.sedes (
              id_sede, 
              id_empresa,
              cod_sede, 
              nom_sede, 
              id_seccional, 
              id_geopolitica, 
              fec_creacion, 
              sede_act, 
              capacidad_estudiantes, 
              capacidad_docentes
             ) VALUES ($1, 1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
            [
              sedeId,
              codSede,
              nomSede,
              seccionalId,
              cityGeoId,
              isRowActive ? 'ACTIVA' : 'INACTIVA',
              finalCapEst,
              finalCapDoc
            ]
          );
          sedesCreadas++;

          const newSede = { id_sede: sedeId, cod_sede: codSede, nom_sede: nomSede, id_seccional: seccionalId };
          existingSedeMapByCode.set(codSede, newSede);
          existingSedeMapByNameAndSec.set(`${cleanSedeName(nomSede)}_${seccionalId}`, newSede);
        }

        const normSedeNameLower = normalizeText(nomSede);

        let cetapDbId: string;
        let matchedCetap = existingCetapMapByCode.get(codSede);
        if (!matchedCetap) {
          const key = `${normSedeNameLower}_${dtDbId}`;
          matchedCetap = existingCetapMapByNameAndDT.get(key);
          if (matchedCetap) {
            await queryRunner.query(
              'UPDATE academic_work_plan.cetap SET codigo = $1, nombre = $2, nombre_normalizado = $3, id_direccion_territorial = $4, activo = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
              [codSede, nomSede, normSedeNameLower, dtDbId, isRowActive, matchedCetap.id]
            );
            matchedCetap.codigo = codSede;
            matchedCetap.nombre = nomSede;
            matchedCetap.nombre_normalizado = normSedeNameLower;
            matchedCetap.id_direccion_territorial = dtDbId;
            existingCetapMapByCode.set(codSede, matchedCetap);
          }
        } else {
          await queryRunner.query(
            'UPDATE academic_work_plan.cetap SET nombre = $1, nombre_normalizado = $2, id_direccion_territorial = $3, activo = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
            [nomSede, normSedeNameLower, dtDbId, isRowActive, matchedCetap.id]
          );
        }

        if (matchedCetap) {
          cetapDbId = matchedCetap.id;
        } else {
          const cetapRows = await queryRunner.query(
            'INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [codSede, nomSede, normSedeNameLower, dtDbId, ['SC', 'SCENT'].includes(codSeccional) ? 'sede_central' : 'cetap', isRowActive]
          );
          cetapDbId = cetapRows[0].id;

          const newCetap = { id: cetapDbId, codigo: codSede, nombre: nomSede, nombre_normalizado: normSedeNameLower, id_direccion_territorial: dtDbId };
          existingCetapMapByCode.set(codSede, newCetap);
          existingCetapMapByNameAndDT.set(`${normSedeNameLower}_${dtDbId}`, newCetap);
        }

        await queryRunner.query(
          `INSERT INTO auth.sede_cetap_mapping (
             id_sede, id_cetap, origen, created_at, updated_at
           ) VALUES ($1, $2, 'legacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (id_sede)
           DO UPDATE SET
             id_cetap = EXCLUDED.id_cetap,
             updated_at = CURRENT_TIMESTAMP`,
          [sedeId, cetapDbId],
        );
        await queryRunner.query(
          `INSERT INTO academic_work_plan.periodo_cetap (
             id_periodo_academico, id_cetap, activo, created_at
           ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT ON CONSTRAINT uq_periodo_cetap_periodo_cetap
           DO UPDATE SET activo = EXCLUDED.activo`,
          [periodId, cetapDbId, isRowActive],
        );
        if (isRowActive) {
          sedesActivadasPeriodo++;
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Importación y sincronización de estructura organizacional completada',
        data: {
          seccionales: { creadas: seccionalesCreadas, actualizadas: seccionalesActualizadas },
          sedes: { creadas: sedesCreadas, actualizadas: sedesActualizadas },
          periodo: { codigo: periodoCodigo, totalOfertasActivas: sedesActivadasPeriodo },
          warnings,
        }
      };

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Error en la importación de estructura: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== ASIGNACIÓN DE USUARIOS ====================

  async getUsuariosSinAsignar(): Promise<{ success: boolean; data: any[] }> {
    try {
      const query = `
        SELECT 
          u.id_user as "id",
          p.num_identificacion as "identificacion",
          p.nom_largo as "nombre",
          p.dir_email as "email",
          p.id_seccional as "territorialId",
          sec.nom_seccional as "territorialNombre",
          p.id_sede as "cetapId",
          s.nom_sede as "cetapNombre",
          CASE WHEN p.id_seccional IS NULL THEN TRUE ELSE FALSE END as "sinTerritorial"
        FROM auth."user" u
        INNER JOIN auth.personas p ON u.id_person = p.id_person
        LEFT JOIN auth.seccionales sec ON p.id_seccional = sec.id_seccional
        LEFT JOIN auth.sedes s ON p.id_sede = s.id_sede
        WHERE p.id_seccional IS NULL OR p.id_sede IS NULL
        ORDER BY p.nom_largo ASC
      `;
      
      const rawUsers = await this.dataSource.query(query);
      
      const data = rawUsers.map((u: any) => ({
        ...u,
        vinculacion: 'Pendiente', // Fallback
      }));

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al obtener usuarios sin asignar:', error);
      return {
        success: false,
        data: [],
      };
    }
  }

  async asignarSeleccionados(
    ids: string[],
    territorialId: string,
    cetapId?: string,
  ): Promise<{ success: boolean; actualizados: number }> {
    if (!ids || ids.length === 0) {
      return { success: false, actualizados: 0 };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let actualizados = 0;
      
      const idSeccionalNum = territorialId ? Number(territorialId) : null;
      const idSedeNum = cetapId ? Number(cetapId) : null;

      for (const idUser of ids) {
        const userRows = await queryRunner.query(
          'SELECT id_person FROM auth."user" WHERE id_user = $1 LIMIT 1',
          [idUser]
        );

        if (userRows.length > 0 && userRows[0].id_person) {
          const idPerson = userRows[0].id_person;
          
          await queryRunner.query(
            `UPDATE auth.personas 
             SET id_seccional = $1, id_sede = $2, fec_modificacion = CURRENT_TIMESTAMP 
             WHERE id_person = $3`,
            [idSeccionalNum, idSedeNum, idPerson]
          );
          
          actualizados++;
        }
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        actualizados,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al asignar usuarios:', error);
      return {
        success: false,
        actualizados: 0,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Relaciona una sede histórica con el catálogo académico sin cambiar sus
   * datos maestros. Usa la plantilla oficial cuando hay coincidencia exacta y
   * crea un registro LEGACY aislado cuando la sede no pertenece a esa plantilla.
   */
  private async ensureCetapIdForSede(
    queryRunner: any,
    sede: Sede,
  ): Promise<string | null> {
    const mapped = await queryRunner.query(
      `SELECT mapping.id_cetap AS id
         FROM auth.sede_cetap_mapping mapping
         INNER JOIN academic_work_plan.cetap cetap
                 ON cetap.id = mapping.id_cetap
        WHERE mapping.id_sede = $1
        LIMIT 1`,
      [sede.idSede],
    );
    if (mapped.length > 0) {
      return String(mapped[0].id);
    }

    if (sede.codSede) {
      const existingByCode = await queryRunner.query(
        `SELECT id
           FROM academic_work_plan.cetap
          WHERE codigo = $1
          LIMIT 1`,
        [sede.codSede],
      );
      if (existingByCode.length > 0) {
        const cetapId = String(existingByCode[0].id);
        await queryRunner.query(
          `INSERT INTO auth.sede_cetap_mapping (
             id_sede, id_cetap, origen, created_at, updated_at
           ) VALUES ($1, $2, 'legacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (id_sede)
           DO UPDATE SET
             id_cetap = EXCLUDED.id_cetap,
             updated_at = CURRENT_TIMESTAMP`,
          [sede.idSede, cetapId],
        );
        return cetapId;
      }
    }

    if (!sede.idSeccional) {
      return null;
    }

    const secRows = await queryRunner.query(
      `SELECT cod_seccional, nom_seccional
         FROM auth.seccionales
        WHERE id_seccional = $1
        LIMIT 1`,
      [sede.idSeccional],
    );
    const seccional = secRows[0];
    if (!seccional) {
      return null;
    }

    const catalog = this.getOfficialGeographicCatalog();
    const legacyTerritorialCode = String(
      seccional.cod_seccional || '',
    ).trim().toUpperCase();
    const officialDtCode =
      this.officialTerritorialAliases[legacyTerritorialCode] ||
      (catalog.territoriales.some(
        (territorial) => territorial.codigo_dt === legacyTerritorialCode,
      )
        ? legacyTerritorialCode
        : null);
    const normalizedSedeName = this.normalizeCatalogName(sede.nomSede, true);

    let officialCetap: OfficialCetapRow | null = null;
    if (officialDtCode) {
      const territorialMatches = catalog.cetaps.filter(
        (cetap) =>
          cetap.codigo_dt === officialDtCode &&
          this.normalizeCatalogName(cetap.nombre_cetap, true) ===
            normalizedSedeName,
      );
      if (territorialMatches.length === 1) {
        officialCetap = territorialMatches[0];
      }
    }
    if (!officialCetap) {
      const globalMatches = catalog.cetaps.filter(
        (cetap) =>
          this.normalizeCatalogName(cetap.nombre_cetap, true) ===
          normalizedSedeName,
      );
      if (globalMatches.length === 1) {
        officialCetap = globalMatches[0];
      }
    }

    const officialDt = officialCetap
      ? catalog.territoriales.find(
          (territorial) =>
            territorial.codigo_dt === officialCetap?.codigo_dt,
        )
      : officialDtCode
        ? catalog.territoriales.find(
            (territorial) => territorial.codigo_dt === officialDtCode,
          )
        : null;
    const origin = officialCetap ? 'official' : 'legacy';
    const dtCode =
      officialDt?.codigo_dt || `LEGACY-DT-${sede.idSeccional}`;
    const dtName =
      officialDt?.nombre_dt || `LEGACY_DT_${sede.idSeccional}`;
    const dtNormalized =
      officialDt?.nombre_normalizado || `legacydt${sede.idSeccional}`;
    const dtOrder = officialDt?.orden_visualizacion || 999;

    let dtRows = await queryRunner.query(
      `SELECT id, codigo
         FROM academic_work_plan.direccion_territorial
        WHERE codigo = $1 OR nombre_normalizado = $2
        ORDER BY CASE WHEN codigo = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [dtCode, dtNormalized],
    );
    let dtId: string;
    if (dtRows.length > 0) {
      dtId = String(dtRows[0].id);
      if (String(dtRows[0].codigo) !== dtCode) {
        await queryRunner.query(
          `UPDATE academic_work_plan.direccion_territorial
              SET codigo = $1,
                  nombre = $2,
                  nombre_normalizado = $3,
                  orden_visualizacion = $4,
                  activo = TRUE,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $5`,
          [dtCode, dtName, dtNormalized, dtOrder, dtId],
        );
      }
    } else {
      dtRows = await queryRunner.query(
        `INSERT INTO academic_work_plan.direccion_territorial (
           codigo, nombre, nombre_normalizado, activo, orden_visualizacion
         ) VALUES ($1, $2, $3, TRUE, $4)
         RETURNING id`,
        [dtCode, dtName, dtNormalized, dtOrder],
      );
      dtId = String(dtRows[0].id);
    }

    const cetapCode =
      officialCetap?.codigo_cetap || `LEGACY-${sede.idSede}`;
    const cetapName = officialCetap?.nombre_cetap || sede.nomSede;
    const cetapNormalized =
      officialCetap?.nombre_normalizado || `legacycetap${sede.idSede}`;
    const cetapType =
      officialCetap?.tipo ||
      (officialDt?.codigo_dt === 'SC' ? 'sede_central' : 'cetap');

    let cetapRows = await queryRunner.query(
      `SELECT id
         FROM academic_work_plan.cetap
        WHERE codigo = $1
           OR (id_direccion_territorial = $2 AND nombre_normalizado = $3)
        ORDER BY CASE WHEN codigo = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [cetapCode, dtId, cetapNormalized],
    );
    let cetapId: string;
    if (cetapRows.length > 0) {
      cetapId = String(cetapRows[0].id);
      await queryRunner.query(
        `UPDATE academic_work_plan.cetap
            SET codigo = $1,
                nombre = $2,
                nombre_normalizado = $3,
                id_direccion_territorial = $4,
                tipo = $5,
                latitud = $6,
                longitud = $7,
                activo = TRUE,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $8`,
        [
          cetapCode,
          cetapName,
          cetapNormalized,
          dtId,
          cetapType,
          officialCetap?.latitud ?? sede.numLatitud ?? null,
          officialCetap?.longitud ?? sede.numLongitud ?? null,
          cetapId,
        ],
      );
    } else {
      cetapRows = await queryRunner.query(
        `INSERT INTO academic_work_plan.cetap (
           codigo, nombre, nombre_normalizado, id_direccion_territorial,
           tipo, latitud, longitud, activo
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         RETURNING id`,
        [
          cetapCode,
          cetapName,
          cetapNormalized,
          dtId,
          cetapType,
          officialCetap?.latitud ?? sede.numLatitud ?? null,
          officialCetap?.longitud ?? sede.numLongitud ?? null,
        ],
      );
      cetapId = String(cetapRows[0].id);
    }

    await queryRunner.query(
      `INSERT INTO auth.sede_cetap_mapping (
         id_sede, id_cetap, origen, created_at, updated_at
       ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id_sede)
       DO UPDATE SET
         id_cetap = EXCLUDED.id_cetap,
         origen = EXCLUDED.origen,
         updated_at = CURRENT_TIMESTAMP`,
      [sede.idSede, cetapId, origin],
    );
    return cetapId;
  }

  private normalizeCatalogName(
    value: unknown,
    removeCetapPrefix = false,
  ): string {
    let normalized = String(value || '').trim().toLowerCase();
    if (removeCetapPrefix) {
      normalized = normalized.replace(/^cetap\s+/, '');
    }
    return normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private getOfficialGeographicCatalog(): {
    territoriales: OfficialTerritorialRow[];
    cetaps: OfficialCetapRow[];
  } {
    if (this.officialGeographicCatalog) {
      return this.officialGeographicCatalog;
    }

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
        'No está disponible la plantilla institucional necesaria para relacionar la sede con el catálogo académico.',
      );
    }

    const workbook = xlsx.readFile(templatePath);
    const territorialesSheet =
      workbook.Sheets['DIRECCIONES_TERRITORIALES'];
    const cetapsSheet = workbook.Sheets['CETAPS'];
    if (!territorialesSheet || !cetapsSheet) {
      throw new BadRequestException(
        'La plantilla institucional no contiene las hojas geográficas requeridas.',
      );
    }

    const parseBoolean = (value: unknown) =>
      ['true', '1', 'si', 'sí', 's'].includes(
        String(value || '').trim().toLowerCase(),
      );
    const parseCoordinate = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    };

    this.officialGeographicCatalog = {
      territoriales: xlsx.utils
        .sheet_to_json<any>(territorialesSheet, { defval: null })
        .map((row) => ({
          codigo_dt: String(row.codigo_dt || '').trim(),
          nombre_dt: String(row.nombre_dt || '').trim(),
          nombre_normalizado: String(
            row.nombre_normalizado || '',
          ).trim(),
          orden_visualizacion: Number(row.orden_visualizacion || 999),
          activo: parseBoolean(row.activo),
        })),
      cetaps: xlsx.utils
        .sheet_to_json<any>(cetapsSheet, { defval: null })
        .map((row) => ({
          codigo_cetap: String(row.codigo_cetap || '').trim(),
          nombre_cetap: String(row.nombre_cetap || '').trim(),
          nombre_normalizado: String(
            row.nombre_normalizado || '',
          ).trim(),
          codigo_dt: String(row.codigo_dt || '').trim(),
          nombre_dt: String(row.nombre_dt || '').trim(),
          tipo: String(row.tipo || 'cetap').trim(),
          latitud: parseCoordinate(row.latitud),
          longitud: parseCoordinate(row.longitud),
          activo: parseBoolean(row.activo),
        })),
    };
    return this.officialGeographicCatalog;
  }

  async getSedePeriodStatus(periodoCodigo: string): Promise<{
    periodoCodigo: string;
    idSedesActivas: number[];
    idSedesMiembro: number[];
    totalActivas: number;
    totalMiembro: number;
  }> {
    const periodRows = await this.dataSource.query(
      `SELECT id
         FROM academic_work_plan.periodo_academico
        WHERE codigo = $1
        LIMIT 1`,
      [periodoCodigo],
    );
    if (periodRows.length === 0) {
      throw new NotFoundException(
        `Periodo académico con código ${periodoCodigo} no encontrado`,
      );
    }
    const idPeriodo = periodRows[0].id;

    // Mapea los CETAP del periodo a IDs de sede (auth.sedes).
    // - soloActivos = true  -> sedes ACTIVAS en el periodo (periodo_cetap.activo = TRUE)
    // - soloActivos = false -> sedes MIEMBRO del periodo (tienen fila en periodo_cetap,
    //   sin importar el flag activo). La membresía es lo que define si una sede
    //   "pertenece" al periodo: una sede solo existe en el periodo donde se agregó.
    const mapCetapsAPeriodo = async (soloActivos: boolean): Promise<number[]> => {
      const rows = await this.dataSource.query(
        `WITH sel_cetaps AS (
           SELECT pc.id_cetap
             FROM academic_work_plan.periodo_cetap pc
            WHERE pc.id_periodo_academico = $1
              ${soloActivos ? 'AND pc.activo = TRUE' : ''}
         )
         SELECT DISTINCT s.id_sede
           FROM (
             SELECT mapping.id_sede
               FROM auth.sede_cetap_mapping mapping
               INNER JOIN sel_cetaps sc
                       ON sc.id_cetap = mapping.id_cetap
             UNION
             SELECT sede.id_sede
               FROM auth.sedes sede
               INNER JOIN academic_work_plan.cetap cetap
                       ON cetap.codigo = sede.cod_sede
               INNER JOIN sel_cetaps sc
                       ON sc.id_cetap = cetap.id
           ) s
          ORDER BY s.id_sede`,
        [idPeriodo],
      );
      return rows.map((row: any) => Number(row.id_sede));
    };

    const idSedesActivas = await mapCetapsAPeriodo(true);
    const idSedesMiembro = await mapCetapsAPeriodo(false);
    return {
      periodoCodigo,
      idSedesActivas,
      idSedesMiembro,
      totalActivas: idSedesActivas.length,
      totalMiembro: idSedesMiembro.length,
    };
  }

  /**
   * Resuelve el id del CETAP espejo de una sede SIN crearlo (solo lectura).
   * Devuelve null si la sede no tiene CETAP asociado.
   */
  private async resolveCetapId(
    queryRunner: QueryRunner,
    sede: Sede,
  ): Promise<number | null> {
    const mappingRows = await queryRunner.query(
      `SELECT id_cetap FROM auth.sede_cetap_mapping WHERE id_sede = $1 LIMIT 1`,
      [sede.idSede],
    );
    let cetapId = mappingRows[0]?.id_cetap;
    if (!cetapId && sede.codSede) {
      const cetapRows = await queryRunner.query(
        'SELECT id FROM academic_work_plan.cetap WHERE codigo = $1 LIMIT 1',
        [sede.codSede],
      );
      cetapId = cetapRows[0]?.id;
    }
    return cetapId ?? null;
  }

  /**
   * Quita una sede de UN periodo (elimina su fila en periodo_cetap para ese
   * periodo). NO toca el catálogo maestro ni otros periodos: la sede sigue
   * existiendo globalmente y en los demás periodos donde sea miembro.
   */
  async removeSedeFromPeriod(
    idSede: number,
    periodoCodigo: string,
  ): Promise<{ success: boolean }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const periodRes = await queryRunner.query(
        `SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1`,
        [periodoCodigo],
      );
      if (!periodRes || periodRes.length === 0) {
        throw new NotFoundException(
          `Periodo académico con código ${periodoCodigo} no encontrado`,
        );
      }
      const idPeriodo = periodRes[0].id;

      const sede = await queryRunner.manager.findOne(Sede, { where: { idSede } });
      if (!sede) {
        throw new NotFoundException(`Sede con ID ${idSede} no encontrada`);
      }

      const idCetap = await this.resolveCetapId(queryRunner, sede);
      if (idCetap) {
        await queryRunner.query(
          `DELETE FROM academic_work_plan.periodo_cetap
            WHERE id_periodo_academico = $1 AND id_cetap = $2`,
          [idPeriodo, idCetap],
        );
      }

      await queryRunner.commitTransaction();
      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Quita una seccional (territorial) de UN periodo: elimina de periodo_cetap,
   * para ese periodo, las filas de TODAS sus sedes. NO borra del catálogo maestro
   * ni afecta a otros periodos.
   */
  async removeSeccionalFromPeriod(
    idSeccional: number,
    periodoCodigo: string,
  ): Promise<{ success: boolean; quitadas: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const periodRes = await queryRunner.query(
        `SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1`,
        [periodoCodigo],
      );
      if (!periodRes || periodRes.length === 0) {
        throw new NotFoundException(
          `Periodo académico con código ${periodoCodigo} no encontrado`,
        );
      }
      const idPeriodo = periodRes[0].id;

      const sedes = await queryRunner.manager.find(Sede, {
        where: { idSeccional },
      });

      let quitadas = 0;
      for (const sede of sedes) {
        const idCetap = await this.resolveCetapId(queryRunner, sede);
        if (idCetap) {
          const res = await queryRunner.query(
            `DELETE FROM academic_work_plan.periodo_cetap
              WHERE id_periodo_academico = $1 AND id_cetap = $2`,
            [idPeriodo, idCetap],
          );
          // pg devuelve [rows, count] en DELETE sin RETURNING
          quitadas += Array.isArray(res) ? (res[1] ?? 0) : 0;
        }
      }

      await queryRunner.commitTransaction();
      return { success: true, quitadas };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async toggleSedePeriodStatus(idSede: number, periodoCodigo: string, activo: boolean): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `SELECT pg_advisory_xact_lock(hashtext('estructura-periodo-activation'))`,
      );
      const sede = await queryRunner.manager.findOne(Sede, { where: { idSede } });
      if (!sede) {
        throw new NotFoundException(`Sede con ID ${idSede} no encontrada`);
      }

      const idCetap = await this.ensureCetapIdForSede(queryRunner, sede);
      if (!idCetap) {
        throw new NotFoundException(
          `No se pudo vincular la sede "${sede.nomSede}" con el catálogo académico (la sede no tiene código o seccional asignada).`,
        );
      }

      // Buscar ID del periodo por código
      const periodRes = await queryRunner.query(
        `SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1`,
        [periodoCodigo]
      );
      if (!periodRes || periodRes.length === 0) {
        throw new NotFoundException(`Periodo académico con código ${periodoCodigo} no encontrado`);
      }
      const idPeriodo = periodRes[0].id;

      // Insertar o actualizar en academic_work_plan.periodo_cetap
      await queryRunner.query(
        `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT ON CONSTRAINT uq_periodo_cetap_periodo_cetap
         DO UPDATE SET activo = EXCLUDED.activo`,
        [idPeriodo, idCetap, activo]
      );

      await queryRunner.commitTransaction();
      return { success: true, idSede, idCetap, idPeriodo, activo };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Activa/desactiva en bloque la activación por periodo de múltiples sedes (o todas).
   * Todo se ejecuta en una sola transacción. Las sedes cuyo CETAP no exista en el
   * plan académico se omiten (no abortan el lote) y se reportan en `omitidos`.
   */
  async bulkToggleSedePeriodStatus(
    periodoCodigo: string,
    activo: boolean,
    idSedes?: number[],
  ): Promise<{ success: boolean; actualizados: number; omitidos: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `SELECT pg_advisory_xact_lock(hashtext('estructura-periodo-activation'))`,
      );
      // Resolver el periodo una sola vez
      const periodRes = await queryRunner.query(
        `SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1`,
        [periodoCodigo]
      );
      if (!periodRes || periodRes.length === 0) {
        throw new NotFoundException(`Periodo académico con código ${periodoCodigo} no encontrado`);
      }
      const idPeriodo = periodRes[0].id;

      let sedes: Sede[];
      if (idSedes && idSedes.length > 0) {
        sedes = await queryRunner.manager.find(Sede, {
          where: { idSede: In(idSedes) },
        });
      } else {
        sedes = await queryRunner.manager.find(Sede);
      }

      let actualizados = 0;
      let omitidos = 0;

      for (const sede of sedes) {
        const idCetap = await this.ensureCetapIdForSede(queryRunner, sede);
        if (!idCetap) {
          omitidos++;
          continue;
        }

        await queryRunner.query(
          `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT ON CONSTRAINT uq_periodo_cetap_periodo_cetap
           DO UPDATE SET activo = EXCLUDED.activo`,
          [idPeriodo, idCetap, activo]
        );
        actualizados++;
      }

      await queryRunner.commitTransaction();
      return { success: true, actualizados, omitidos };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
