import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryBehavior } from '../entities/disciplinary-behavior.entity';
import {
  CreateDisciplinaryBehaviorDto,
  UpdateDisciplinaryBehaviorDto
} from '../dtos/disciplinary-behavior.dto';

@Injectable()
export class DisciplinaryBehaviorService {
  constructor(
    @InjectRepository(DisciplinaryBehavior)
    private behaviorRepository: Repository<DisciplinaryBehavior>,
  ) {}

  /**
   * Obtiene todas las conductas disciplinarias activas, ordenadas por orden
   */
  async findAllActive(): Promise<DisciplinaryBehavior[]> {
    return this.behaviorRepository.find({
      where: { estado: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * Obtiene todas las conductas disciplinarias (activas e inactivas)
   */
  async findAll(): Promise<DisciplinaryBehavior[]> {
    return this.behaviorRepository.find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * Obtiene una conducta por ID
   */
  async findById(id: string): Promise<DisciplinaryBehavior> {
    const behavior = await this.behaviorRepository.findOne({
      where: { id },
    });

    if (!behavior) {
      throw new NotFoundException(`Conducta disciplinaria con ID ${id} no encontrada`);
    }

    return behavior;
  }

  /**
   * Obtiene una conducta por código
   */
  async findByCode(codigo: string): Promise<DisciplinaryBehavior | null> {
    return this.behaviorRepository.findOne({
      where: { codigo },
    });
  }

  /**
   * Crea una nueva conducta disciplinaria
   */
  async create(createDto: CreateDisciplinaryBehaviorDto): Promise<DisciplinaryBehavior> {
    // Verificar que no exista una conducta con el mismo código
    const existingByCode = await this.findByCode(createDto.codigo);
    if (existingByCode) {
      throw new ConflictException(`Ya existe una conducta con el código ${createDto.codigo}`);
    }

    // Verificar que no exista una conducta con el mismo nombre
    const existingByName = await this.behaviorRepository.findOne({
      where: { nombre: createDto.nombre },
    });
    if (existingByName) {
      throw new ConflictException(`Ya existe una conducta con el nombre ${createDto.nombre}`);
    }

    // Si no se especifica orden, obtener el máximo actual + 1
    if (createDto.orden === undefined) {
      const maxOrder = await this.behaviorRepository
        .createQueryBuilder('db')
        .select('MAX(db.orden)', 'max')
        .getRawOne();

      createDto.orden = (maxOrder?.max || 0) + 1;
    }

    const behavior = this.behaviorRepository.create({
      ...createDto,
      estado: createDto.estado !== undefined ? createDto.estado : true,
    });

    return this.behaviorRepository.save(behavior);
  }

  /**
   * Actualiza una conducta disciplinaria existente
   */
  async update(id: string, updateDto: UpdateDisciplinaryBehaviorDto): Promise<DisciplinaryBehavior> {
    const behavior = await this.findById(id);

    // Verificar conflictos de unicidad si se están actualizando código o nombre
    if (updateDto.codigo && updateDto.codigo !== behavior.codigo) {
      const existingByCode = await this.findByCode(updateDto.codigo);
      if (existingByCode) {
        throw new ConflictException(`Ya existe una conducta con el código ${updateDto.codigo}`);
      }
    }

    if (updateDto.nombre && updateDto.nombre !== behavior.nombre) {
      const existingByName = await this.behaviorRepository.findOne({
        where: { nombre: updateDto.nombre },
      });
      if (existingByName) {
        throw new ConflictException(`Ya existe una conducta con el nombre ${updateDto.nombre}`);
      }
    }

    // Actualizar los campos proporcionados
    Object.assign(behavior, updateDto);

    return this.behaviorRepository.save(behavior);
  }

  /**
   * Elimina una conducta disciplinaria
   */
  async remove(id: string): Promise<void> {
    const behavior = await this.findById(id);
    await this.behaviorRepository.remove(behavior);
  }

  /**
   * Activa/desactiva una conducta disciplinaria
   */
  async toggleStatus(id: string): Promise<DisciplinaryBehavior> {
    const behavior = await this.findById(id);
    behavior.estado = !behavior.estado;
    return this.behaviorRepository.save(behavior);
  }

  /**
   * Reordena las conductas disciplinarias
   */
  async reorder(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('La lista de IDs no puede estar vacía');
    }

    // Verificar que todos los IDs existan
    const behaviors = await this.behaviorRepository.findByIds(ids);
    if (behaviors.length !== ids.length) {
      throw new BadRequestException('Algunos IDs de conductas no existen');
    }

    // Actualizar el orden de cada conducta
    const updatePromises = ids.map((id, index) =>
      this.behaviorRepository.update(id, { orden: index + 1 })
    );

    await Promise.all(updatePromises);
  }

  /**
   * Obtiene las conductas por estado
   */
  async findByStatus(estado: boolean): Promise<DisciplinaryBehavior[]> {
    return this.behaviorRepository.find({
      where: { estado },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }
}