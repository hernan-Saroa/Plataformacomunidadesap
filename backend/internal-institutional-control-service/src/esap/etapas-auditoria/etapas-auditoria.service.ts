import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReunionApertura } from '../auditorias/entities/reunion-apertura.entity';
import { ReunionCierre } from '../auditorias/entities/reunion-cierre.entity';
import { RegistrarReunionDto } from './dto/registrar-reunion.dto';

@Injectable()
export class EtapasAuditoriaService {
  constructor(
    @InjectRepository(ReunionApertura)
    private readonly reunionAperturaRepo: Repository<ReunionApertura>,
    @InjectRepository(ReunionCierre)
    private readonly reunionCierreRepo: Repository<ReunionCierre>,
  ) {}

  async getReunionApertura(auditoriaId: string): Promise<ReunionApertura | null> {
    return this.reunionAperturaRepo.findOne({ where: { auditoriaId } });
  }

  async getReunionCierre(auditoriaId: string): Promise<ReunionCierre | null> {
    return this.reunionCierreRepo.findOne({ where: { auditoriaId } });
  }

  async registrarReunionApertura(auditoriaId: string, dto: RegistrarReunionDto): Promise<ReunionApertura> {
    const fechaCompleta = dto.hora
      ? new Date(`${dto.fecha}T${dto.hora}`)
      : new Date(dto.fecha);

    const modalidad = (dto.modalidad === 'hibrida' ? dto.modalidad : dto.modalidad) as 'presencial' | 'virtual' | 'hibrida';
    const participantes = dto.participantes
      ? dto.participantes.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    const agenda = dto.temasTratados ? { temasTratados: dto.temasTratados } : undefined;

    const existing = await this.reunionAperturaRepo.findOne({ where: { auditoriaId } });
    if (existing) {
      existing.fecha = fechaCompleta;
      existing.modalidad = modalidad;
      existing.lugar = dto.lugar ?? undefined;
      existing.participantes = participantes as any;
      existing.agenda = agenda;
      existing.observaciones = dto.observaciones ?? undefined;
      existing.elaboradoPor = dto.elaboradoPor ?? undefined;
      existing.revisadoPor = dto.revisadoPor ?? undefined;
      existing.documentoBibliotecaId = dto.actaBibliotecaId ?? undefined;
      return this.reunionAperturaRepo.save(existing);
    }

    const entity = this.reunionAperturaRepo.create({
      auditoriaId,
      fecha: fechaCompleta,
      modalidad,
      lugar: dto.lugar,
      participantes: participantes as any,
      agenda,
      observaciones: dto.observaciones,
      elaboradoPor: dto.elaboradoPor,
      revisadoPor: dto.revisadoPor,
      documentoBibliotecaId: dto.actaBibliotecaId,
      estadoActa: 'pendiente',
    });
    return this.reunionAperturaRepo.save(entity);
  }

  async registrarReunionCierre(auditoriaId: string, dto: RegistrarReunionDto): Promise<ReunionCierre> {
    const fechaCompleta = dto.hora
      ? new Date(`${dto.fecha}T${dto.hora}`)
      : new Date(dto.fecha);

    const modalidad = (dto.modalidad === 'hibrida' ? dto.modalidad : dto.modalidad) as 'presencial' | 'virtual' | 'hibrida';
    const participantes = dto.participantes
      ? dto.participantes.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    const agenda = dto.temasTratados ? { temasTratados: dto.temasTratados } : undefined;

    const existing = await this.reunionCierreRepo.findOne({ where: { auditoriaId } });
    if (existing) {
      existing.fecha = fechaCompleta;
      existing.modalidad = modalidad;
      existing.lugar = dto.lugar ?? undefined;
      existing.participantes = participantes as any;
      existing.agenda = agenda;
      existing.observaciones = dto.observaciones ?? undefined;
      existing.elaboradoPor = dto.elaboradoPor ?? undefined;
      existing.revisadoPor = dto.revisadoPor ?? undefined;
      existing.documentoBibliotecaId = dto.actaBibliotecaId ?? undefined;
      return this.reunionCierreRepo.save(existing);
    }

    const entity = this.reunionCierreRepo.create({
      auditoriaId,
      fecha: fechaCompleta,
      modalidad,
      lugar: dto.lugar,
      participantes: participantes as any,
      agenda,
      observaciones: dto.observaciones,
      elaboradoPor: dto.elaboradoPor,
      revisadoPor: dto.revisadoPor,
      documentoBibliotecaId: dto.actaBibliotecaId,
      estadoActa: 'pendiente',
    });
    return this.reunionCierreRepo.save(entity);
  }
}
