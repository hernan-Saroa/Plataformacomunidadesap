import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanIndividual, EstadoPlanIndividual } from './entities/plan-individual.entity';
import { CreatePlanIndividualDto } from './dto/create-plan-individual.dto';
import { UpdatePlanIndividualDto } from './dto/update-plan-individual.dto';
import { AuditoriaProgramada } from '../programa-anual/entities/auditoria-programada.entity';

@Injectable()
export class PlanIndividualService {
  constructor(
    @InjectRepository(PlanIndividual)
    private readonly planRepository: Repository<PlanIndividual>,
    @InjectRepository(AuditoriaProgramada)
    private readonly auditoriaRepository: Repository<AuditoriaProgramada>,
  ) {}

  /**
   * Genera un código único para el plan individual
   */
  private async generarCodigo(auditoriaCodigo: string): Promise<string> {
    const prefix = `PI-${auditoriaCodigo}-`;
    const ultimo = await this.planRepository
      .createQueryBuilder('plan')
      .where('plan.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('plan.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo?.codigo) {
      const numero = parseInt(ultimo.codigo.split('-').pop() || '0', 10);
      if (!isNaN(numero)) {
        siguiente = numero + 1;
      }
    }

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
  }

  /**
   * Obtiene todos los planes individuales
   */
  async findAll(filters?: {
    auditoriaId?: string;
    estado?: string;
    search?: string;
  }): Promise<PlanIndividual[]> {
    const query = this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.auditoria', 'auditoria')
      .orderBy('plan.fechaCreacion', 'DESC');

    if (filters?.auditoriaId) {
      query.andWhere('plan.auditoriaId = :auditoriaId', { auditoriaId: filters.auditoriaId });
    }

    if (filters?.estado) {
      query.andWhere('plan.estado = :estado', { estado: filters.estado });
    }

    if (filters?.search) {
      query.andWhere(
        '(plan.nombre ILIKE :search OR plan.procesoAuditar ILIKE :search OR plan.codigo ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }

  /**
   * Obtiene un plan individual por ID
   */
  async findOne(id: string): Promise<PlanIndividual> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['auditoria'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan individual con ID ${id} no encontrado`);
    }

    return plan;
  }

  /**
   * Crea un nuevo plan individual
   */
  async create(createDto: CreatePlanIndividualDto): Promise<PlanIndividual> {
    // Verificar que la auditoría existe
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: createDto.auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${createDto.auditoriaId} no encontrada`);
    }

    // Verificar que no exista ya un plan para esta auditoría
    const existente = await this.planRepository.findOne({
      where: { auditoriaId: createDto.auditoriaId },
    });

    if (existente) {
      throw new BadRequestException('Ya existe un plan individual para esta auditoría');
    }

    // Generar código
    const codigo = await this.generarCodigo(auditoria.codigo);

    const plan = this.planRepository.create({
      codigo,
      auditoriaId: createDto.auditoriaId,
      auditoriaCodigo: auditoria.codigo,
      nombre: createDto.nombre,
      alcance: createDto.alcance,
      objetivo: createDto.objetivo,
      procesoAuditar: createDto.procesoAuditar,
      riesgos: createDto.riesgos,
      criteriosAuditoria: createDto.criteriosAuditoria,
      normativaAplicable: createDto.normativaAplicable,
      equipoAuditor: createDto.equipoAuditor,
      documentos: createDto.documentos,
      estado: EstadoPlanIndividual.BORRADOR,
      fechaCreacion: new Date(),
    });

    return this.planRepository.save(plan);
  }

  /**
   * Actualiza un plan individual
   */
  async update(id: string, updateDto: UpdatePlanIndividualDto): Promise<PlanIndividual> {
    const plan = await this.findOne(id);

    if (updateDto.nombre) plan.nombre = updateDto.nombre;
    if (updateDto.alcance) plan.alcance = updateDto.alcance;
    if (updateDto.objetivo) plan.objetivo = updateDto.objetivo;
    if (updateDto.procesoAuditar) plan.procesoAuditar = updateDto.procesoAuditar;
    if (updateDto.riesgos) plan.riesgos = updateDto.riesgos as any;
    if (updateDto.criteriosAuditoria) plan.criteriosAuditoria = updateDto.criteriosAuditoria as any;
    if (updateDto.normativaAplicable) plan.normativaAplicable = updateDto.normativaAplicable as any;
    if (updateDto.equipoAuditor) plan.equipoAuditor = updateDto.equipoAuditor as any;
    if (updateDto.documentos) plan.documentos = updateDto.documentos as any;

    return this.planRepository.save(plan);
  }

  /**
   * Envía el plan individual al área auditada
   */
  async enviar(id: string, enviadoPor: string): Promise<PlanIndividual> {
    const plan = await this.findOne(id);

    if (plan.estado !== EstadoPlanIndividual.BORRADOR) {
      throw new BadRequestException('Solo se pueden enviar planes en estado borrador');
    }

    plan.estado = EstadoPlanIndividual.ENVIADO;
    plan.fechaEnvio = new Date();
    plan.enviadoPor = enviadoPor;

    // Marcar documentos como enviados
    plan.documentos = plan.documentos.map((doc: any) => ({
      ...doc,
      estado: doc.estado === 'generado' ? 'enviado' : doc.estado,
    }));

    return this.planRepository.save(plan);
  }

  /**
   * Acepta el plan individual (por el área auditada)
   */
  async aceptar(id: string): Promise<PlanIndividual> {
    const plan = await this.findOne(id);

    if (plan.estado !== EstadoPlanIndividual.ENVIADO) {
      throw new BadRequestException('Solo se pueden aceptar planes que han sido enviados');
    }

    plan.estado = EstadoPlanIndividual.ACEPTADO;
    return this.planRepository.save(plan);
  }

  /**
   * Elimina un plan individual
   */
  async delete(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.planRepository.remove(plan);
  }

  /**
   * Obtiene planes por auditoría
   */
  async getPlanesPorAuditoria(auditoriaId: string): Promise<PlanIndividual[]> {
    return this.planRepository.find({
      where: { auditoriaId },
      relations: ['auditoria'],
      order: { fechaCreacion: 'DESC' },
    });
  }
}

