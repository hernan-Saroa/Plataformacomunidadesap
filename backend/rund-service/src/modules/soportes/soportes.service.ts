import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoporteDocumentalEntity } from '../../entities/soporte-documental.entity';

@Injectable()
export class SoportesService {
  constructor(
    @InjectRepository(SoporteDocumentalEntity)
    private readonly soporteRepo: Repository<SoporteDocumentalEntity>,
  ) {}

  async findByDocente(idDocente: string) {
    return this.soporteRepo.find({
      where: { idDocente },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<SoporteDocumentalEntity>) {
    const soporte = this.soporteRepo.create(data);
    return this.soporteRepo.save(soporte);
  }

  async validateSoporte(
    idSoporte: string,
    estadoValidacion: 'APROBADO' | 'RECHAZADO' | 'OBSERVADO',
    observaciones?: string,
    validadoPor?: string,
  ) {
    const soporte = await this.soporteRepo.findOne({ where: { idSoporte } });
    if (!soporte) {
      throw new NotFoundException('Soporte documental no encontrado');
    }
    soporte.estadoValidacion = estadoValidacion;
    soporte.observaciones = observaciones;
    soporte.validadoPor = validadoPor;
    soporte.fechaValidacion = new Date();

    return this.soporteRepo.save(soporte);
  }

  async delete(idSoporte: string) {
    await this.soporteRepo.delete({ idSoporte });
    return { success: true };
  }
}
