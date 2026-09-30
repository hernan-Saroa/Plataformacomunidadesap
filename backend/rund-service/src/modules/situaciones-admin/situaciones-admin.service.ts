import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SituacionAdministrativaEntity } from '../../entities/situacion-administrativa.entity';

@Injectable()
export class SituacionesAdminService {
  constructor(
    @InjectRepository(SituacionAdministrativaEntity)
    private readonly situacionRepo: Repository<SituacionAdministrativaEntity>,
  ) {}

  async findAllByDocente(idDocente: string) {
    return this.situacionRepo.find({
      where: { idDocente },
      order: { fechaInicio: 'DESC' },
    });
  }

  async findActiveByDocente(idDocente: string) {
    return this.situacionRepo.find({
      where: { idDocente, estado: 'VIGENTE' },
      order: { fechaInicio: 'DESC' },
    });
  }

  async create(idDocente: string, data: Partial<SituacionAdministrativaEntity>, userId?: string) {
    const novedad = this.situacionRepo.create({
      ...data,
      idDocente,
      createdBy: userId,
    });
    return this.situacionRepo.save(novedad);
  }

  async update(idSituacion: string, data: Partial<SituacionAdministrativaEntity>) {
    const situacion = await this.situacionRepo.findOne({ where: { idSituacion } });
    if (!situacion) {
      throw new NotFoundException('Situación administrativa no encontrada');
    }
    Object.assign(situacion, data);
    return this.situacionRepo.save(situacion);
  }

  async remove(idSituacion: string) {
    await this.situacionRepo.delete({ idSituacion });
    return { success: true };
  }
}
