import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity.js';
import { BloqueEdificio } from './bloque.entity.js';
import { CreateSedeDto, CreateBloqueDto } from './dto/create-sede.dto.js';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(BloqueEdificio)
    private readonly bloqueRepo: Repository<BloqueEdificio>,
  ) {}

  async findAllSedes(): Promise<Sede[]> {
    return this.sedeRepo.find({
      where: { isActivo: true },
      relations: ['bloques'],
      order: { nombre: 'ASC' },
    });
  }

  async findSedeById(id: string): Promise<Sede> {
    const sede = await this.sedeRepo.findOne({
      where: { idSede: id },
      relations: ['bloques', 'bloques.espacios'],
    });
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }
    return sede;
  }

  async createSede(dto: CreateSedeDto): Promise<Sede> {
    const sede = this.sedeRepo.create(dto);
    return this.sedeRepo.save(sede);
  }

  async findAllBloques(): Promise<BloqueEdificio[]> {
    return this.bloqueRepo.find({
      where: { isActivo: true },
      relations: ['sede'],
      order: { nombre: 'ASC' },
    });
  }

  async createBloque(dto: CreateBloqueDto): Promise<BloqueEdificio> {
    const bloque = this.bloqueRepo.create(dto);
    return this.bloqueRepo.save(bloque);
  }
}
