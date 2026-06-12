import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

@Injectable()
export class EstructuraOrganizacionalService {
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
    return this.sedeRepo.find({
      where: { idSeccional },
      relations: ['geopolitica'],
      order: { nomSede: 'ASC' },
    });
  }

  async findSedeById(id: number): Promise<Sede | null> {
    return this.sedeRepo.findOne({
      where: { idSede: id },
      relations: ['geopolitica', 'seccional', 'seccional.ubicacion'],
    });
  }

  // ==================== SECCIONALES ====================

  async findAllSeccionales(): Promise<Seccional[]> {
    return this.seccionalRepo.find({
      relations: ['ubicacion'],
      order: { nomSeccional: 'ASC' },
    });
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
      const seccional = this.seccionalRepo.create({
        ...dto,
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

    // Verificar si tiene sedes asociadas
    const sedesCount = await this.sedeRepo.count({ where: { idSeccional: id } });
    if (sedesCount > 0) {
      throw new ConflictException(`No se puede eliminar la seccional porque tiene ${sedesCount} sedes asociadas`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

          const tipo = dto.tipo || (seccional.codSeccional === 'SCENT' ? 'sede_central' : 'cetap');

          const cetapRows = await queryRunner.query(
            `INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, latitud, longitud, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, id_direccion_territorial = EXCLUDED.id_direccion_territorial, tipo = EXCLUDED.tipo, latitud = EXCLUDED.latitud, longitud = EXCLUDED.longitud, activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive]
          );
          const cetapDbId = cetapRows[0]?.id;

          // Si es activo, registrar la oferta en el periodo académico más reciente
          if (isActive && cetapDbId) {
            const periodRows = await queryRunner.query(
              'SELECT id FROM academic_work_plan.periodo_academico ORDER BY codigo DESC LIMIT 1'
            );
            const periodId = periodRows[0]?.id;

            if (periodId) {
              const activePrograms = await queryRunner.query(
                'SELECT id, cobertura_direcciones_territoriales FROM academic_work_plan.programa WHERE activo = TRUE'
              );

              const normSecNameLower = seccional.nomSeccional.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();

              for (const prog of activePrograms) {
                let matchesCoverage = false;
                if (prog.cobertura_direcciones_territoriales) {
                  const coverageList = prog.cobertura_direcciones_territoriales.split(';').map(c => 
                    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim()
                  );
                  matchesCoverage = coverageList.includes(normSecNameLower) || 
                                    (seccional.codSeccional === 'SCENT' && coverageList.some(c => c.includes('central') || c.includes('sc')));
                }

                if (matchesCoverage) {
                  await queryRunner.query(
                    `INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico, activa, cupos_estimados)
                     VALUES ($1, $2, $3, TRUE, 50)
                     ON CONFLICT DO NOTHING`,
                    [cetapDbId, prog.id, periodId]
                  );
                }
              }
            }
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

          const tipo = dto.tipo || (seccional.codSeccional === 'SCENT' ? 'sede_central' : 'cetap');

          if (oldCod && oldCod !== saved.codSede) {
            await queryRunner.query(
              `UPDATE academic_work_plan.cetap 
               SET codigo = $1, nombre = $2, nombre_normalizado = $3, id_direccion_territorial = $4, tipo = $5, latitud = $6, longitud = $7, activo = $8, updated_at = CURRENT_TIMESTAMP
               WHERE codigo = $9`,
              [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive, oldCod]
            );
          } else {
            await queryRunner.query(
              `INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, latitud, longitud, activo)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_normalizado = EXCLUDED.nombre_normalizado, id_direccion_territorial = EXCLUDED.id_direccion_territorial, tipo = EXCLUDED.tipo, latitud = EXCLUDED.latitud, longitud = EXCLUDED.longitud, activo = EXCLUDED.activo, updated_at = CURRENT_TIMESTAMP`,
              [saved.codSede, saved.nomSede, normSedeNameLower, dtId, tipo, dto.latitud || null, dto.longitud || null, isActive]
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

  async deleteSede(id: number): Promise<void> {
    const sede = await this.findSedeById(id);
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const codSede = sede.codSede;
      await queryRunner.manager.remove(Sede, sede);

      if (codSede) {
        await queryRunner.query(
          'UPDATE academic_work_plan.cetap SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE codigo = $1',
          [codSede]
        );

        const cetapRows = await queryRunner.query(
          'SELECT id FROM academic_work_plan.cetap WHERE codigo = $1 LIMIT 1',
          [codSede]
        );
        const cetapId = cetapRows[0]?.id;
        if (cetapId) {
          await queryRunner.query(
            'UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id_cetap = $1',
            [cetapId]
          );
        }
      }

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

      const processedSedeIds = new Set<string>();

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

        let seccionalId: string;
        const existingSec = await queryRunner.query(
          'SELECT id_seccional FROM auth.seccionales WHERE cod_seccional = $1 LIMIT 1',
          [codSeccional]
        );

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

        if (existingSec.length > 0) {
          seccionalId = existingSec[0].id_seccional;
          await queryRunner.query(
            'UPDATE auth.seccionales SET nom_seccional = $1, id_ubi_seccional = COALESCE($2, id_ubi_seccional), fec_ult_act = CURRENT_DATE WHERE id_seccional = $3',
            [nomSeccional, deptoGeoId, seccionalId]
          );
          seccionalesActualizadas++;
        } else {
          const maxSec = await queryRunner.query('SELECT MAX(id_seccional) as max_id FROM auth.seccionales');
          const nextSecId = (parseInt(maxSec[0]?.max_id) || 0) + 1;
          seccionalId = nextSecId.toString();

          await queryRunner.query(
            'INSERT INTO auth.seccionales (id_seccional, cod_seccional, nom_seccional, id_ubi_seccional, fec_creacion) VALUES ($1, $2, $3, $4, CURRENT_DATE)',
            [seccionalId, codSeccional, nomSeccional, deptoGeoId]
          );
          seccionalesCreadas++;
        }

        const normSecName = nomSeccional.toUpperCase().replace(/\s+/g, '_');
        const normSecNameLower = normalizeText(nomSeccional);
        const existingDT = await queryRunner.query(
          'SELECT id FROM academic_work_plan.direccion_territorial WHERE codigo = $1 LIMIT 1',
          [codSeccional]
        );

        let dtDbId: string;
        if (existingDT.length > 0) {
          dtDbId = existingDT[0].id;
          await queryRunner.query(
            'UPDATE academic_work_plan.direccion_territorial SET nombre = $1, nombre_normalizado = $2, activo = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [normSecName, normSecNameLower, dtDbId]
          );
        } else {
          const dtRows = await queryRunner.query(
            'INSERT INTO academic_work_plan.direccion_territorial (codigo, nombre, nombre_normalizado, activo, orden_visualizacion) VALUES ($1, $2, $3, TRUE, 999) RETURNING id',
            [codSeccional, normSecName, normSecNameLower]
          );
          dtDbId = dtRows[0].id;
        }

        if (!codSede || !nomSede) {
          continue;
        }

        let sedeId: string;
        const existingSede = await queryRunner.query(
          'SELECT id_sede FROM auth.sedes WHERE cod_sede = $1 LIMIT 1',
          [codSede]
        );

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

        if (existingSede.length > 0) {
          sedeId = existingSede[0].id_sede;
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
              sedeId
            ]
          );
          sedesActualizadas++;
        } else {
          const maxSede = await queryRunner.query('SELECT MAX(id_sede) as max_id FROM auth.sedes');
          const nextSedeId = (parseInt(maxSede[0]?.max_id) || 0) + 1;
          sedeId = nextSedeId.toString();

          const finalCapEst = capacidadEstudiantes !== null ? capacidadEstudiantes : (nomSede.toLowerCase().includes('central') ? 5000 : 150);
          const finalCapDoc = capacidadDocentes !== null ? capacidadDocentes : (nomSede.toLowerCase().includes('central') ? 500 : 15);

          await queryRunner.query(
            `INSERT INTO auth.sedes (
              id_sede, 
              cod_sede, 
              nom_sede, 
              id_seccional, 
              id_geopolitica, 
              fec_creacion, 
              sede_act, 
              capacidad_estudiantes, 
              capacidad_docentes
             ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
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
        }

        const normSedeNameLower = normalizeText(nomSede);
        const existingCetap = await queryRunner.query(
          'SELECT id FROM academic_work_plan.cetap WHERE codigo = $1 LIMIT 1',
          [codSede]
        );

        let cetapDbId: string;
        if (existingCetap.length > 0) {
          cetapDbId = existingCetap[0].id;
          await queryRunner.query(
            'UPDATE academic_work_plan.cetap SET nombre = $1, nombre_normalizado = $2, id_direccion_territorial = $3, activo = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
            [nomSede, normSedeNameLower, dtDbId, isRowActive, cetapDbId]
          );
        } else {
          const cetapRows = await queryRunner.query(
            'INSERT INTO academic_work_plan.cetap (codigo, nombre, nombre_normalizado, id_direccion_territorial, tipo, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [codSede, nomSede, normSedeNameLower, dtDbId, codSeccional === 'SCENT' ? 'sede_central' : 'cetap', isRowActive]
          );
          cetapDbId = cetapRows[0].id;
        }

        processedSedeIds.add(cetapDbId);

        if (isRowActive) {
          const activePrograms = await queryRunner.query(
            'SELECT id, cobertura_direcciones_territoriales FROM academic_work_plan.programa WHERE activo = TRUE'
          );

          for (const prog of activePrograms) {
            let matchesCoverage = false;
            if (prog.cobertura_direcciones_territoriales) {
              const coverageList = prog.cobertura_direcciones_territoriales.split(';').map(c => normalizeText(c));
              matchesCoverage = coverageList.includes(normSecNameLower) || 
                                (codSeccional === 'SCENT' && coverageList.some(c => c.includes('central') || c.includes('sc')));
            }

            if (matchesCoverage) {
              const existingOffer = await queryRunner.query(
                'SELECT id FROM academic_work_plan.oferta_cetap_programa WHERE id_cetap = $1 AND id_programa = $2 AND id_periodo_academico = $3 LIMIT 1',
                [cetapDbId, prog.id, periodId]
              );

              if (existingOffer.length > 0) {
                await queryRunner.query(
                  'UPDATE academic_work_plan.oferta_cetap_programa SET activa = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                  [existingOffer[0].id]
                );
              } else {
                await queryRunner.query(
                  'INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico, activa, cupos_estimados) VALUES ($1, $2, $3, TRUE, 50)',
                  [cetapDbId, prog.id, periodId]
                );
              }
              sedesActivadasPeriodo++;
            }
          }
        } else {
          await queryRunner.query(
            'UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id_cetap = $1 AND id_periodo_academico = $2',
            [cetapDbId, periodId]
          );
        }
      }

      if (processedSedeIds.size > 0) {
        const processedSedeIdsArray = Array.from(processedSedeIds);
        
        await queryRunner.query(
          `UPDATE academic_work_plan.cetap SET activo = FALSE, updated_at = CURRENT_TIMESTAMP 
           WHERE id NOT IN (${processedSedeIdsArray.map((_, i) => '$' + (i + 1)).join(',')})`,
          processedSedeIdsArray
        );

        await queryRunner.query(
          `UPDATE academic_work_plan.oferta_cetap_programa SET activa = FALSE, updated_at = CURRENT_TIMESTAMP 
           WHERE id_periodo_academico = $1 AND id_cetap NOT IN (${processedSedeIdsArray.map((_, i) => '$' + (i + 2)).join(',')})`,
          [periodId, ...processedSedeIdsArray]
        );
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
}
