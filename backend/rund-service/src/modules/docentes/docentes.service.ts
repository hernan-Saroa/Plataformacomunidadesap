import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { DocenteEntity } from '../../entities/docente.entity';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocenteDto } from './dto/filter-docente.dto';

@Injectable()
export class DocentesService {
  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepository: Repository<DocenteEntity>,
  ) {}

  async findAll(filter: FilterDocenteDto) {
    const { q, estadoRund, escalafonDocente, categoriaMinciencias, sedePrincipalId, page = 1, limit = 10 } = filter;
    const queryBuilder = this.docenteRepository
      .createQueryBuilder('docente')
      .leftJoinAndSelect('docente.formaciones', 'formaciones')
      .leftJoinAndSelect('docente.experiencias', 'experiencias')
      .leftJoinAndSelect('docente.producciones', 'producciones')
      .leftJoinAndSelect('docente.situaciones', 'situaciones')
      .leftJoinAndSelect('docente.soportes', 'soportes')
      .where('docente.isActive = :isActive', { isActive: true });

    if (q) {
      queryBuilder.andWhere(
        '(LOWER(docente.nombres) LIKE LOWER(:q) OR LOWER(docente.apellidos) LIKE LOWER(:q) OR docente.numeroDocumento LIKE :qExact OR LOWER(docente.correoInstitucional) LIKE LOWER(:q))',
        { q: `%${q}%`, qExact: `%${q}%` },
      );
    }

    if (estadoRund) {
      queryBuilder.andWhere('docente.estadoRund = :estadoRund', { estadoRund });
    }

    if (escalafonDocente) {
      queryBuilder.andWhere('docente.escalafonDocente = :escalafonDocente', { escalafonDocente });
    }

    if (categoriaMinciencias) {
      queryBuilder.andWhere('docente.categoriaMinciencias = :categoriaMinciencias', { categoriaMinciencias });
    }

    if (sedePrincipalId) {
      queryBuilder.andWhere('docente.sedePrincipalId = :sedePrincipalId', { sedePrincipalId });
    }

    queryBuilder
      .orderBy('docente.apellidos', 'ASC')
      .addOrderBy('docente.nombres', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<DocenteEntity> {
    const docente = await this.docenteRepository.findOne({
      where: { idDocente: id, isActive: true },
      relations: ['formaciones', 'experiencias', 'producciones', 'situaciones', 'soportes', 'tarjetasLog'],
    });

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${id} no encontrado`);
    }

    return docente;
  }

  async findByDocumento(numeroDocumento: string): Promise<DocenteEntity | null> {
    return this.docenteRepository.findOne({
      where: { numeroDocumento, isActive: true },
      relations: ['formaciones', 'experiencias', 'producciones', 'situaciones', 'soportes', 'tarjetasLog'],
    });
  }

  async create(createDto: CreateDocenteDto, userId?: string): Promise<DocenteEntity> {
    const existing = await this.docenteRepository.findOne({
      where: { numeroDocumento: createDto.numeroDocumento },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un docente con el número de documento ${createDto.numeroDocumento}`);
    }

    // Generar código RUND si no existe
    const anio = new Date().getFullYear();
    const correlativo = Math.floor(100000 + Math.random() * 900000);
    const numeroTarjetaRund = `RUND-${anio}-${correlativo}`;

    const docente = this.docenteRepository.create({
      ...createDto,
      numeroTarjetaRund,
      fechaExpedicionRund: new Date(),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.docenteRepository.save(docente);
  }

  async update(id: string, updateDto: UpdateDocenteDto, userId?: string): Promise<DocenteEntity> {
    const docente = await this.findById(id);

    Object.assign(docente, updateDto);
    if (userId) {
      docente.updatedBy = userId;
    }

    return this.docenteRepository.save(docente);
  }

  async changeEstado(id: string, nuevoEstado: string, userId?: string): Promise<DocenteEntity> {
    const docente = await this.findById(id);
    docente.estadoRund = nuevoEstado;
    if (userId) {
      docente.updatedBy = userId;
    }
    return this.docenteRepository.save(docente);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const docente = await this.findById(id);
    docente.isActive = false;
    if (userId) {
      docente.updatedBy = userId;
    }
    await this.docenteRepository.save(docente);
  }
}
