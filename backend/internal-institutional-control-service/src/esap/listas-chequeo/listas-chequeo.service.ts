import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ListaChequeo, TipoListaChequeo } from './entities/lista-chequeo.entity';
import { ItemListaChequeo } from './entities/item-lista-chequeo.entity';
import { CreateListaChequeoDto } from './dto/create-lista-chequeo.dto';
import { UpdateListaChequeoDto } from './dto/update-lista-chequeo.dto';

@Injectable()
export class ListasChequeoService {
  constructor(
    @InjectRepository(ListaChequeo)
    private readonly listaChequeoRepository: Repository<ListaChequeo>,
    @InjectRepository(ItemListaChequeo)
    private readonly itemRepository: Repository<ItemListaChequeo>,
  ) {}

  /**
   * Obtener todas las listas de chequeo (excluyendo eliminadas)
   */
  async findAll(includeInactive: boolean = false): Promise<ListaChequeo[]> {
    const where: any = {
      deletedAt: IsNull(),
    };

    if (!includeInactive) {
      where.activa = true;
    }

    return this.listaChequeoRepository.find({
      where,
      relations: ['items', 'tipoAuditoria'],
      order: {
        createdAt: 'DESC',
        items: {
          orden: 'ASC',
        },
      },
    });
  }

  /**
   * Obtener una lista de chequeo por ID
   */
  async findOne(id: string): Promise<ListaChequeo> {
    const lista = await this.listaChequeoRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items', 'tipoAuditoria'],
      order: {
        items: {
          orden: 'ASC',
        },
      },
    });

    if (!lista) {
      throw new NotFoundException(`Lista de chequeo con ID ${id} no encontrada`);
    }

    return lista;
  }

  /**
   * Obtener una lista de chequeo por código
   */
  async findByCodigo(codigo: string): Promise<ListaChequeo | null> {
    return this.listaChequeoRepository.findOne({
      where: { codigo, deletedAt: IsNull() },
      relations: ['items', 'tipoAuditoria'],
    });
  }

  /**
   * Crear una nueva lista de chequeo
   */
  async create(createDto: CreateListaChequeoDto): Promise<ListaChequeo> {
    // Verificar que el código no exista
    const existe = await this.findByCodigo(createDto.codigo);
    if (existe) {
      throw new ConflictException(
        `Ya existe una lista de chequeo con el código ${createDto.codigo}`,
      );
    }

    // Crear la lista con valores por defecto para campos requeridos
    const lista = this.listaChequeoRepository.create({
      codigo: createDto.codigo.toUpperCase(),
      nombre: createDto.nombre,
      descripcion: createDto.descripcion || '',
      categoria: createDto.categoria || 'General', // Valor por defecto 'General' si no viene
      tipo: createDto.tipo || TipoListaChequeo.EJECUCION, // Valor por defecto si no viene
      tipoAuditoriaId: createDto.tipoAuditoriaId,
      activa: createDto.activa !== undefined ? createDto.activa : true,
      usosProgramados: 0,
    });

    const listaGuardada = await this.listaChequeoRepository.save(lista);

    // Crear los items
    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map((itemDto, index) =>
        this.itemRepository.create({
          listaChequeoId: listaGuardada.id,
          texto: itemDto.texto,
          categoria: itemDto.categoria || 'General', // Valor por defecto 'General' si no viene
          obligatorio: itemDto.obligatorio !== undefined ? itemDto.obligatorio : false,
          orden: itemDto.orden !== undefined ? itemDto.orden : index,
        }),
      );
      await this.itemRepository.save(items);
    }

    return this.findOne(listaGuardada.id);
  }

  /**
   * Actualizar una lista de chequeo
   */
  async update(id: string, updateDto: UpdateListaChequeoDto): Promise<ListaChequeo> {
    const lista = await this.findOne(id);

    // Si se actualiza el código, verificar que no exista otro con ese código
    if (updateDto.codigo && updateDto.codigo !== lista.codigo) {
      const existe = await this.findByCodigo(updateDto.codigo);
      if (existe) {
        throw new ConflictException(
          `Ya existe una lista de chequeo con el código ${updateDto.codigo}`,
        );
      }
      lista.codigo = updateDto.codigo.toUpperCase();
    }

    // Actualizar campos básicos
    if (updateDto.nombre !== undefined) lista.nombre = updateDto.nombre;
    if (updateDto.descripcion !== undefined) lista.descripcion = updateDto.descripcion;
    if (updateDto.categoria !== undefined) lista.categoria = updateDto.categoria;
    if (updateDto.tipo !== undefined) lista.tipo = updateDto.tipo;
    if (updateDto.tipoAuditoriaId !== undefined) lista.tipoAuditoriaId = updateDto.tipoAuditoriaId;
    if (updateDto.activa !== undefined) lista.activa = updateDto.activa;

    await this.listaChequeoRepository.save(lista);

    // Si se actualizan los items, eliminar los anteriores y crear los nuevos
    if (updateDto.items !== undefined) {
      // Eliminar items existentes
      const itemsExistentes = await this.itemRepository.find({
        where: { listaChequeoId: id },
      });
      if (itemsExistentes.length > 0) {
        await this.itemRepository.remove(itemsExistentes);
      }

      // Crear nuevos items
      if (updateDto.items.length > 0) {
        const items = updateDto.items.map((itemDto, index) =>
          this.itemRepository.create({
            listaChequeoId: id,
            texto: itemDto.texto,
            categoria: itemDto.categoria || 'General', // Valor por defecto 'General' si no viene
            obligatorio: itemDto.obligatorio !== undefined ? itemDto.obligatorio : false,
            orden: itemDto.orden !== undefined ? itemDto.orden : index,
          }),
        );
        await this.itemRepository.save(items);
      }
    }

    return this.findOne(id);
  }

  /**
   * Eliminar una lista de chequeo (soft delete)
   */
  async remove(id: string): Promise<void> {
    const lista = await this.findOne(id);

    // Verificar que no tenga usos programados
    if (lista.usosProgramados > 0) {
      throw new BadRequestException(
        `No se puede eliminar la lista de chequeo porque tiene ${lista.usosProgramados} usos programados`,
      );
    }

    // Soft delete
    lista.deletedAt = new Date();
    await this.listaChequeoRepository.save(lista);
  }

  /**
   * Restaurar una lista de chequeo eliminada
   */
  async restore(id: string): Promise<ListaChequeo> {
    const lista = await this.listaChequeoRepository
      .createQueryBuilder('lista')
      .withDeleted()
      .where('lista.id = :id', { id })
      .getOne();

    if (!lista) {
      throw new NotFoundException(`Lista de chequeo con ID ${id} no encontrada`);
    }

    if (!lista.deletedAt) {
      throw new BadRequestException('La lista de chequeo no está eliminada');
    }

    lista.deletedAt = undefined;
    await this.listaChequeoRepository.save(lista);

    return this.findOne(id);
  }

  /**
   * Incrementar contador de usos programados
   */
  async incrementarContador(id: string): Promise<void> {
    const lista = await this.findOne(id);
    lista.usosProgramados += 1;
    await this.listaChequeoRepository.save(lista);
  }

  /**
   * Decrementar contador de usos programados
   */
  async decrementarContador(id: string): Promise<void> {
    const lista = await this.findOne(id);
    lista.usosProgramados = Math.max(0, lista.usosProgramados - 1);
    await this.listaChequeoRepository.save(lista);
  }
}
