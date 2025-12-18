import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geopolitica } from './geopolitica.entity';
import { Sede } from './sede.entity';
import { Seccional } from './seccional.entity';
import {
  CreateSeccionalDto,
  UpdateSeccionalDto,
  CreateSedeDto,
  UpdateSedeDto,
} from './estructura-organizacional.dto';

@Injectable()
export class EstructuraOrganizacionalService {
  constructor(
    @InjectRepository(Geopolitica)
    private readonly geopoliticaRepo: Repository<Geopolitica>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(Seccional)
    private readonly seccionalRepo: Repository<Seccional>,
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

    const seccional = this.seccionalRepo.create({
      ...dto,
      fecCreacion: new Date(),
    });
    return this.seccionalRepo.save(seccional);
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

    Object.assign(seccional, dto, { fecUltAct: new Date() });
    return this.seccionalRepo.save(seccional);
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

    await this.seccionalRepo.remove(seccional);
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
    if (dto.idSeccional) {
      const seccional = await this.findSeccionalById(dto.idSeccional);
      if (!seccional) {
        throw new NotFoundException(`Seccional con ID ${dto.idSeccional} no encontrada`);
      }
    }

    // Obtener el próximo ID manualmente (la tabla no tiene auto-increment)
    const maxResult = await this.sedeRepo
      .createQueryBuilder('sede')
      .select('MAX(sede.idSede)', 'maxId')
      .getRawOne();
    const nextId = (parseInt(maxResult?.maxId) || 0) + 1;

    const sede = this.sedeRepo.create({
      ...dto,
      idSede: nextId,
      idEmpresa: 1,
      fecCreacion: new Date(),
    });
    return this.sedeRepo.save(sede);
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
    if (dto.idSeccional) {
      const seccional = await this.findSeccionalById(dto.idSeccional);
      if (!seccional) {
        throw new NotFoundException(`Seccional con ID ${dto.idSeccional} no encontrada`);
      }
    }

    Object.assign(sede, dto, { fecUltAct: new Date() });
    return this.sedeRepo.save(sede);
  }

  async deleteSede(id: number): Promise<void> {
    const sede = await this.findSedeById(id);
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }

    await this.sedeRepo.remove(sede);
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
}
