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
      // ✅ VINCULACIÓN CON AUDITORÍA
      auditoriaId: createDto.auditoriaId,
      nombreAuditoria: createDto.nombreAuditoria,
      auditorResponsable: createDto.auditorResponsable,
      fechaAplicacion: createDto.auditoriaId ? new Date() : undefined,
      itemsCompletados: 0,
      cumplimiento: 0,
      // ✅ FASES QUE IMPACTA LA LISTA
      fasePlaneacion: createDto.fasePlaneacion || false,
      faseEjecucion: createDto.faseEjecucion || false,
      faseComunicacion: createDto.faseComunicacion || false,
      faseSeguimiento: createDto.faseSeguimiento || false,
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
    // ✅ VINCULACIÓN CON AUDITORÍA
    if (updateDto.auditoriaId !== undefined) lista.auditoriaId = updateDto.auditoriaId;
    if (updateDto.nombreAuditoria !== undefined) lista.nombreAuditoria = updateDto.nombreAuditoria;
    if (updateDto.auditorResponsable !== undefined) lista.auditorResponsable = updateDto.auditorResponsable;
    // ✅ FASES QUE IMPACTA LA LISTA
    if (updateDto.fasePlaneacion !== undefined) lista.fasePlaneacion = updateDto.fasePlaneacion;
    if (updateDto.faseEjecucion !== undefined) lista.faseEjecucion = updateDto.faseEjecucion;
    if (updateDto.faseComunicacion !== undefined) lista.faseComunicacion = updateDto.faseComunicacion;
    if (updateDto.faseSeguimiento !== undefined) lista.faseSeguimiento = updateDto.faseSeguimiento;

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

  // ════════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE ITEMS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener los items de una lista
   */
  async getItems(listaId: string): Promise<ItemListaChequeo[]> {
    await this.findOne(listaId); // Verificar que la lista existe
    return this.itemRepository.find({
      where: { listaChequeoId: listaId },
      order: { orden: 'ASC' }
    });
  }

  /**
   * Agregar un item a una lista
   */
  async addItem(listaId: string, itemData: {
    texto: string;
    categoria?: string;
    obligatorio?: boolean;
    orden?: number;
  }): Promise<ItemListaChequeo> {
    await this.findOne(listaId); // Verificar que la lista existe

    // Obtener el último orden
    const lastItem = await this.itemRepository.findOne({
      where: { listaChequeoId: listaId },
      order: { orden: 'DESC' }
    });
    const nextOrden = lastItem ? lastItem.orden + 1 : 0;

    const item = this.itemRepository.create({
      listaChequeoId: listaId,
      texto: itemData.texto,
      categoria: itemData.categoria || 'General',
      obligatorio: itemData.obligatorio ?? false,
      orden: itemData.orden ?? nextOrden
    });

    return this.itemRepository.save(item);
  }

  /**
   * Actualizar un item de una lista (completar/pendiente)
   * Nota: Por ahora el estado de completado se maneja en el frontend.
   * TODO: Agregar campo 'completado' a item_lista_chequeo si se necesita persistencia.
   */
  async updateItem(listaId: string, itemId: string, updateData: {
    completado?: boolean;
    responsable?: string;
    fechaCompletado?: string;
    observaciones?: string;
    auditoriaId?: string;
  }): Promise<ItemListaChequeo> {
    const lista = await this.findOne(listaId); // Verificar que la lista existe

    const item = await this.itemRepository.findOne({
      where: { id: itemId, listaChequeoId: listaId }
    });

    if (!item) {
      throw new NotFoundException(`Item con ID ${itemId} no encontrado en la lista ${listaId}`);
    }

    // Si se envía auditoriaId, verificar que la lista pertenece a esa auditoría
    if (updateData.auditoriaId && lista.auditoriaId !== updateData.auditoriaId) {
      throw new BadRequestException(
        `La lista ${listaId} no está vinculada a la auditoría ${updateData.auditoriaId}`
      );
    }

    // TODO: Si se implementa persistencia de estado de items, actualizar aquí
    // Por ahora, el estado se maneja en el frontend

    console.log(`[ListasChequeo] Item ${itemId} actualizado: completado=${updateData.completado}`);
    return item;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE AUDITORÍA
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener listas de chequeo vinculadas a una auditoría específica
   * Filtra por el campo auditoria_id de la tabla lista_chequeo
   */
  async findByAuditoria(auditoriaId: string): Promise<ListaChequeo[]> {
    console.log(`[ListasChequeo] Buscando listas para auditoría ${auditoriaId}`);

    // Buscar listas que tienen esta auditoría vinculada directamente
    const listas = await this.listaChequeoRepository.find({
      where: {
        auditoriaId,
        deletedAt: IsNull(),
        activa: true,
      },
      relations: ['items', 'tipoAuditoria'],
      order: {
        createdAt: 'DESC',
        items: {
          orden: 'ASC',
        },
      },
    });

    console.log(`[ListasChequeo] ✅ Encontradas ${listas.length} listas para auditoría ${auditoriaId}`);
    return listas;
  }

  /**
   * Vincular una lista existente a una auditoría
   */
  async vincularAuditoria(
    listaId: string,
    data: {
      auditoriaId: string;
      nombreAuditoria?: string;
      auditorResponsable?: string;
    },
  ): Promise<ListaChequeo> {
    const lista = await this.findOne(listaId);

    // Verificar si ya está vinculada a otra auditoría
    if (lista.auditoriaId && lista.auditoriaId !== data.auditoriaId) {
      throw new ConflictException(
        `Esta lista ya está vinculada a otra auditoría. Crea una copia para la nueva auditoría.`,
      );
    }

    lista.auditoriaId = data.auditoriaId;
    lista.nombreAuditoria = data.nombreAuditoria;
    lista.auditorResponsable = data.auditorResponsable;
    lista.fechaAplicacion = new Date();

    await this.listaChequeoRepository.save(lista);
    console.log(`[ListasChequeo] ✅ Lista ${lista.nombre} vinculada a auditoría ${data.auditoriaId}`);

    return this.findOne(listaId);
  }

  /**
   * Desvincular una lista de una auditoría
   */
  async desvincularAuditoria(listaId: string): Promise<ListaChequeo> {
    const lista = await this.findOne(listaId);

    lista.auditoriaId = undefined;
    lista.nombreAuditoria = undefined;
    lista.auditorResponsable = undefined;

    await this.listaChequeoRepository.save(lista);
    console.log(`[ListasChequeo] ✅ Lista ${lista.nombre} desvinculada de auditoría`);

    return this.findOne(listaId);
  }

  /**
   * Actualizar el progreso de completitud de una lista
   */
  async actualizarProgreso(listaId: string): Promise<ListaChequeo> {
    const lista = await this.findOne(listaId);
    const items = lista.items || [];

    // Contar items completados (basado en algún campo de estado)
    // Por ahora, el progreso se calcula en el frontend
    const totalItems = items.length;
    const cumplimiento = totalItems > 0 ? Math.round((lista.itemsCompletados / totalItems) * 100) : 0;

    lista.cumplimiento = cumplimiento;
    await this.listaChequeoRepository.save(lista);

    return lista;
  }

  /**
   * @deprecated Usar vincularAuditoria en su lugar
   * Aplicar una lista a una auditoría (legacy - actualiza campo auditoriaId)
   */
  async aplicarAuditoria(data: {
    listaChequeoId: string;
    auditoriaId: string;
    aplicadoPor: string;
    etapaKanban?: string;
  }): Promise<{ success: boolean; message: string }> {
    const lista = await this.findOne(data.listaChequeoId);

    // Verificar si ya está vinculada a otra auditoría
    if (lista.auditoriaId && lista.auditoriaId !== data.auditoriaId) {
      throw new ConflictException(
        `La lista "${lista.nombre}" ya está vinculada a otra auditoría`,
      );
    }

    // Vincular la lista a la auditoría
    lista.auditoriaId = data.auditoriaId;
    lista.auditorResponsable = data.aplicadoPor;
    lista.fechaAplicacion = new Date();
    await this.listaChequeoRepository.save(lista);

    // Incrementar contador de usos
    await this.incrementarContador(data.listaChequeoId);

    console.log(`[ListasChequeo] ✅ Lista ${lista.nombre} aplicada a auditoría ${data.auditoriaId} por ${data.aplicadoPor}`);

    return {
      success: true,
      message: `Lista "${lista.nombre}" aplicada exitosamente`,
    };
  }

  /**
   * Desvincular una lista de una auditoría
   */
  async desaplicarAuditoria(listaChequeoId: string, auditoriaId: string): Promise<void> {
    const lista = await this.findOne(listaChequeoId);

    if (!lista.auditoriaId || lista.auditoriaId !== auditoriaId) {
      throw new NotFoundException(
        `La lista no está vinculada a esta auditoría`,
      );
    }

    lista.auditoriaId = undefined;
    lista.nombreAuditoria = undefined;
    lista.auditorResponsable = undefined;
    await this.listaChequeoRepository.save(lista);

    // Decrementar contador
    await this.decrementarContador(listaChequeoId);
  }
}
