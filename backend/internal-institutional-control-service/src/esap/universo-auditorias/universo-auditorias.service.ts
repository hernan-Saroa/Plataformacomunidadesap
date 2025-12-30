import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ProcesoAuditable, TipoProceso, NivelRiesgo } from './entities/proceso-auditable.entity';
import { CreateProcesoAuditableDto } from './dto/create-proceso-auditable.dto';
import { UpdateProcesoAuditableDto } from './dto/update-proceso-auditable.dto';

@Injectable()
export class UniversoAuditoriasService {
  constructor(
    @InjectRepository(ProcesoAuditable)
    private readonly procesoRepository: Repository<ProcesoAuditable>,
  ) {}

  /**
   * Calcula el riesgo inherente (probabilidad * impacto)
   */
  private calcularRiesgoInherente(probabilidad: number, impacto: number): number {
    return probabilidad * impacto;
  }

  /**
   * Calcula el riesgo residual (riesgo inherente * nivel de control)
   */
  private calcularRiesgoResidual(riesgoInherente: number, nivelControl: number): number {
    return riesgoInherente * nivelControl;
  }

  /**
   * Determina el nivel de riesgo según el riesgo residual
   */
  private determinarNivelRiesgo(riesgoResidual: number): NivelRiesgo {
    if (riesgoResidual >= 19) return NivelRiesgo.ALTO;
    if (riesgoResidual >= 10) return NivelRiesgo.MEDIO;
    return NivelRiesgo.BAJO;
  }

  /**
   * Calcula la priorización en años según el nivel de riesgo
   */
  private calcularPriorizacionAnos(nivelRiesgo: NivelRiesgo): number {
    switch (nivelRiesgo) {
      case NivelRiesgo.ALTO:
        return 1; // Auditoría anual obligatoria
      case NivelRiesgo.MEDIO:
        return 2; // Auditoría cada 2 años
      case NivelRiesgo.BAJO:
        return 3; // Auditoría cada 3 años
      default:
        return 4;
    }
  }

  /**
   * Calcula la prioridad numérica (inversa de años: menos años = mayor prioridad)
   */
  private calcularPrioridad(priorizacionAnos: number): number {
    return 5 - priorizacionAnos; // 1 año = prioridad 4, 2 años = 3, 3 años = 2, 4 años = 1
  }

  /**
   * Procesa y calcula todos los valores de riesgo automáticamente
   * Retorna tanto la evaluación de riesgo completa como los valores calculados para el proceso
   */
  private procesarEvaluacionRiesgo(evaluacionRiesgo: any): {
    evaluacionRiesgo: any;
    prioridad: number;
    priorizacionAnos: number;
  } {
    const probabilidad = evaluacionRiesgo.probabilidad;
    const impacto = evaluacionRiesgo.impacto;
    const nivelControl = evaluacionRiesgo.nivelControl;

    const riesgoInherente = this.calcularRiesgoInherente(probabilidad, impacto);
    const riesgoResidual = this.calcularRiesgoResidual(riesgoInherente, nivelControl);
    const nivelRiesgo = this.determinarNivelRiesgo(riesgoResidual);
    const priorizacionAnos = this.calcularPriorizacionAnos(nivelRiesgo);
    const prioridad = this.calcularPrioridad(priorizacionAnos);

    return {
      evaluacionRiesgo: {
        probabilidad,
        impacto,
        nivelControl,
        riesgoInherente,
        riesgoResidual,
        nivelRiesgo,
        madurezControl: evaluacionRiesgo.madurezControl,
        controles: evaluacionRiesgo.controles,
        factoresRiesgo: evaluacionRiesgo.factoresRiesgo || [],
      },
      prioridad,
      priorizacionAnos,
    };
  }

  /**
   * Obtiene todos los procesos auditables con filtros opcionales
   */
  async findAll(filters?: {
    tipo?: string;
    macroproceso?: string;
    nivelRiesgo?: string;
    territorial?: string;
    search?: string;
  }): Promise<ProcesoAuditable[]> {
    const query = this.procesoRepository.createQueryBuilder('proceso')
      .orderBy('proceso.prioridad', 'DESC')
      .addOrderBy('proceso.createdAt', 'DESC');

    if (filters?.tipo) {
      query.andWhere('proceso.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.macroproceso) {
      query.andWhere('proceso.macroproceso = :macroproceso', { macroproceso: filters.macroproceso });
    }

    if (filters?.nivelRiesgo) {
      query.andWhere("proceso.evaluacion_riesgo->>'nivelRiesgo' = :nivelRiesgo", { nivelRiesgo: filters.nivelRiesgo });
    }

    if (filters?.territorial) {
      query.andWhere('proceso.territorial = :territorial', { territorial: filters.territorial });
    }

    if (filters?.search) {
      query.andWhere(
        '(proceso.nombre ILIKE :search OR proceso.codigo ILIKE :search OR proceso.descripcion ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }

  /**
   * Obtiene un proceso auditable por ID
   */
  async findOne(id: string): Promise<ProcesoAuditable> {
    const proceso = await this.procesoRepository.findOne({
      where: { id },
    });

    if (!proceso) {
      throw new NotFoundException(`Proceso auditable con ID ${id} no encontrado`);
    }

    return proceso;
  }

  /**
   * Busca un proceso por código
   */
  async findByCodigo(codigo: string): Promise<ProcesoAuditable | null> {
    return this.procesoRepository.findOne({
      where: { codigo },
    });
  }

  /**
   * Crea un nuevo proceso auditable
   */
  async create(createDto: CreateProcesoAuditableDto): Promise<ProcesoAuditable> {
    // Verificar que no exista un proceso con el mismo código
    const existente = await this.findByCodigo(createDto.codigo);
    if (existente) {
      throw new BadRequestException(`Ya existe un proceso con el código ${createDto.codigo}`);
    }

    // Procesar evaluación de riesgo
    const { evaluacionRiesgo: evaluacionRiesgoCompleta, prioridad, priorizacionAnos } = 
      this.procesarEvaluacionRiesgo(createDto.evaluacionRiesgo);

    const proceso = this.procesoRepository.create({
      codigo: createDto.codigo,
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      tipo: createDto.tipo,
      macroproceso: createDto.macroproceso,
      responsable: createDto.responsable,
      dependencia: createDto.dependencia,
      territorial: createDto.territorial,
      evaluacionRiesgo: evaluacionRiesgoCompleta,
      frecuenciaAuditoria: createDto.frecuenciaAuditoria,
      ultimaAuditoria: createDto.ultimaAuditoria ? new Date(createDto.ultimaAuditoria) : undefined,
      proximaAuditoria: createDto.proximaAuditoria ? new Date(createDto.proximaAuditoria) : undefined,
      prioridad,
      priorizacionAnos,
    });

    return this.procesoRepository.save(proceso);
  }

  /**
   * Actualiza un proceso auditable existente
   */
  async update(id: string, updateDto: UpdateProcesoAuditableDto): Promise<ProcesoAuditable> {
    const proceso = await this.findOne(id);

    // Si se actualiza el código, verificar que no exista otro con ese código
    if (updateDto.codigo && updateDto.codigo !== proceso.codigo) {
      const existente = await this.findByCodigo(updateDto.codigo);
      if (existente) {
        throw new BadRequestException(`Ya existe un proceso con el código ${updateDto.codigo}`);
      }
      proceso.codigo = updateDto.codigo;
    }

    // Actualizar campos básicos
    if (updateDto.nombre) proceso.nombre = updateDto.nombre;
    if (updateDto.descripcion) proceso.descripcion = updateDto.descripcion;
    if (updateDto.tipo) proceso.tipo = updateDto.tipo as TipoProceso;
    if (updateDto.macroproceso) proceso.macroproceso = updateDto.macroproceso;
    if (updateDto.responsable) proceso.responsable = updateDto.responsable;
    if (updateDto.dependencia) proceso.dependencia = updateDto.dependencia;
    if (updateDto.territorial !== undefined) proceso.territorial = updateDto.territorial;
    if (updateDto.frecuenciaAuditoria) proceso.frecuenciaAuditoria = updateDto.frecuenciaAuditoria;
    if (updateDto.ultimaAuditoria) proceso.ultimaAuditoria = new Date(updateDto.ultimaAuditoria);
    if (updateDto.proximaAuditoria) proceso.proximaAuditoria = new Date(updateDto.proximaAuditoria);

    // Si se actualiza la evaluación de riesgo, recalcular todo
    if (updateDto.evaluacionRiesgo) {
      const { evaluacionRiesgo: evaluacionRiesgoCompleta, prioridad, priorizacionAnos } = 
        this.procesarEvaluacionRiesgo(updateDto.evaluacionRiesgo);
      proceso.evaluacionRiesgo = evaluacionRiesgoCompleta;
      proceso.prioridad = prioridad;
      proceso.priorizacionAnos = priorizacionAnos;
    }

    // Si se actualiza la prioridad directamente (sin cambiar evaluación de riesgo)
    if (updateDto.prioridad !== undefined) {
      proceso.prioridad = updateDto.prioridad;
      // Recalcular priorizacionAnos basado en la prioridad
      // prioridad 1 = 4 años, 2 = 3 años, 3 = 2 años, 4 = 1 año
      proceso.priorizacionAnos = 5 - updateDto.prioridad;
    }

    return this.procesoRepository.save(proceso);
  }

  /**
   * Elimina un proceso auditable
   */
  async delete(id: string): Promise<void> {
    const proceso = await this.findOne(id);
    await this.procesoRepository.remove(proceso);
  }

  /**
   * Obtiene la evaluación de riesgo de un proceso
   */
  async getEvaluacionRiesgo(procesoId: string): Promise<any> {
    const proceso = await this.findOne(procesoId);
    return proceso.evaluacionRiesgo;
  }

  /**
   * Evalúa el riesgo de un proceso (actualiza la evaluación)
   */
  async evaluarRiesgo(procesoId: string, evaluacionRiesgo: any): Promise<ProcesoAuditable> {
    return this.update(procesoId, { evaluacionRiesgo });
  }

  /**
   * Obtiene la matriz de riesgo (agrupada por nivel)
   */
  async getMatrizRiesgo(): Promise<{
    alto: ProcesoAuditable[];
    medio: ProcesoAuditable[];
    bajo: ProcesoAuditable[];
  }> {
    const procesos = await this.findAll();
    
    return {
      alto: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.ALTO),
      medio: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.MEDIO),
      bajo: procesos.filter(p => p.evaluacionRiesgo.nivelRiesgo === NivelRiesgo.BAJO),
    };
  }

  /**
   * Obtiene la priorización de auditorías
   */
  async getPriorizacion(): Promise<{
    anual: ProcesoAuditable[];
    bienal: ProcesoAuditable[];
    trienal: ProcesoAuditable[];
    cuatrienal: ProcesoAuditable[];
  }> {
    const procesos = await this.findAll();
    
    return {
      anual: procesos.filter(p => p.priorizacionAnos === 1),
      bienal: procesos.filter(p => p.priorizacionAnos === 2),
      trienal: procesos.filter(p => p.priorizacionAnos === 3),
      cuatrienal: procesos.filter(p => p.priorizacionAnos === 4),
    };
  }
}

