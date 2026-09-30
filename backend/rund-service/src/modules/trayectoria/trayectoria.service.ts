import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormacionAcademicaEntity } from '../../entities/formacion-academica.entity';
import { ExperienciaDocenteEntity } from '../../entities/experiencia-docente.entity';
import { ProduccionIntelectualEntity } from '../../entities/produccion-intelectual.entity';

@Injectable()
export class TrayectoriaService {
  constructor(
    @InjectRepository(FormacionAcademicaEntity)
    private readonly formacionRepo: Repository<FormacionAcademicaEntity>,
    @InjectRepository(ExperienciaDocenteEntity)
    private readonly experienciaRepo: Repository<ExperienciaDocenteEntity>,
    @InjectRepository(ProduccionIntelectualEntity)
    private readonly produccionRepo: Repository<ProduccionIntelectualEntity>,
  ) {}

  // ================= FORMACION =================
  async getFormacionesByDocente(idDocente: string) {
    return this.formacionRepo.find({
      where: { idDocente },
      order: { anoGraduacion: 'DESC' },
    });
  }

  async addFormacion(idDocente: string, data: Partial<FormacionAcademicaEntity>) {
    const formacion = this.formacionRepo.create({ ...data, idDocente });
    return this.formacionRepo.save(formacion);
  }

  async updateFormacion(idFormacion: string, data: Partial<FormacionAcademicaEntity>) {
    const formacion = await this.formacionRepo.findOne({ where: { idFormacion } });
    if (!formacion) throw new NotFoundException('Formación académica no encontrada');
    Object.assign(formacion, data);
    return this.formacionRepo.save(formacion);
  }

  async deleteFormacion(idFormacion: string) {
    await this.formacionRepo.delete({ idFormacion });
    return { success: true };
  }

  // ================= EXPERIENCIA =================
  async getExperienciasByDocente(idDocente: string) {
    return this.experienciaRepo.find({
      where: { idDocente },
      order: { fechaInicio: 'DESC' },
    });
  }

  async addExperiencia(idDocente: string, data: Partial<ExperienciaDocenteEntity>) {
    const exp = this.experienciaRepo.create({ ...data, idDocente });
    return this.experienciaRepo.save(exp);
  }

  async updateExperiencia(idExperiencia: string, data: Partial<ExperienciaDocenteEntity>) {
    const exp = await this.experienciaRepo.findOne({ where: { idExperiencia } });
    if (!exp) throw new NotFoundException('Experiencia no encontrada');
    Object.assign(exp, data);
    return this.experienciaRepo.save(exp);
  }

  async deleteExperiencia(idExperiencia: string) {
    await this.experienciaRepo.delete({ idExperiencia });
    return { success: true };
  }

  // ================= PRODUCCION =================
  async getProduccionesByDocente(idDocente: string) {
    return this.produccionRepo.find({
      where: { idDocente },
      order: { anoPublicacion: 'DESC' },
    });
  }

  async addProduccion(idDocente: string, data: Partial<ProduccionIntelectualEntity>) {
    const prod = this.produccionRepo.create({ ...data, idDocente });
    return this.produccionRepo.save(prod);
  }

  async updateProduccion(idProduccion: string, data: Partial<ProduccionIntelectualEntity>) {
    const prod = await this.produccionRepo.findOne({ where: { idProduccion } });
    if (!prod) throw new NotFoundException('Producción no encontrada');
    Object.assign(prod, data);
    return this.produccionRepo.save(prod);
  }

  async deleteProduccion(idProduccion: string) {
    await this.produccionRepo.delete({ idProduccion });
    return { success: true };
  }
}
