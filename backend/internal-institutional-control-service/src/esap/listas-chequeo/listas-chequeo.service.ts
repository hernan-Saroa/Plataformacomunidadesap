import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ListaChequeo } from './entities/lista-chequeo.entity';
import { ItemListaChequeo } from './entities/item-lista-chequeo.entity';
import { CreateListaChequeoDto } from './dto/create-lista-chequeo.dto';
import { UpdateListaChequeoDto } from './dto/update-lista-chequeo.dto';
import { Auditoria, EstadoKanban } from '../auditorias/entities/auditoria.entity';
import { EtapaKanban } from '../tableros-kanban/entities/etapa-kanban.entity';

/** Etapas del ciclo en las que aplica una lista de chequeo (alineado con Kanban OCI) */
const ETAPAS_LISTA_CHEQUEO_KANBAN: EstadoKanban[] = [
  EstadoKanban.PLANEACION,
  EstadoKanban.EJECUCION,
  EstadoKanban.COMUNICACION,
];

@Injectable()
export class ListasChequeoService {
  constructor(
    @InjectRepository(ListaChequeo)
    private readonly listaChequeoRepository: Repository<ListaChequeo>,
    @InjectRepository(ItemListaChequeo)
    private readonly itemRepository: Repository<ItemListaChequeo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(EtapaKanban)
    private readonly etapaKanbanRepository: Repository<EtapaKanban>,
  ) {}

  private normalizarNombreEtapa(s: string): string {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private nombresEtapaEquivalentes(a: string, b: string): boolean {
    return this.normalizarNombreEtapa(a) === this.normalizarNombreEtapa(b);
  }

  /** La auditoría debe estar en Planeación, Ejecución o Comunicación para registrar lista */
  private esEstadoAuditoriaPermitidoParaLista(estadoKanban?: EstadoKanban | string): boolean {
    if (!estadoKanban) return false;
    const s = String(estadoKanban);
    return ETAPAS_LISTA_CHEQUEO_KANBAN.some((perm) =>
      this.nombresEtapaEquivalentes(s, perm),
    );
  }

  /**
   * Valida auditoría y etapa Kanban indicada (sin exigir que coincida con la fase actual del tablero).
   */
  private async validarVinculacionAuditoriaEtapa(
    auditoriaId: string | undefined,
    etapaKanbanId: string | undefined,
    etapaNombreKanban: string | undefined,
  ): Promise<void> {
    if (!auditoriaId) {
      return;
    }

    const aud = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });
    if (!aud) {
      throw new NotFoundException(`Auditoría con id ${auditoriaId} no encontrada`);
    }

    const estadoActual = aud.estadoKanban;
    if (!this.esEstadoAuditoriaPermitidoParaLista(estadoActual)) {
      throw new BadRequestException(
        'Solo se pueden registrar listas de chequeo cuando la auditoría está en etapa Planeación, Ejecución o Comunicación (fase actual del Kanban de Auditorías OCI).',
      );
    }

    let nombreEtapaLista = etapaNombreKanban;
    if (etapaKanbanId) {
      const etapa = await this.etapaKanbanRepository.findOne({
        where: { id: etapaKanbanId },
      });
      if (!etapa) {
        throw new BadRequestException('La etapa Kanban indicada no existe.');
      }
      nombreEtapaLista = etapa.nombre;
    }

    if (!nombreEtapaLista) {
      throw new BadRequestException(
        'Debe indicar la etapa Kanban (etapaKanbanId / etapaNombreKanban).',
      );
    }
  }

  private async resolverPlanAnualLista(
    auditoriaId: string | undefined,
    planAnualVigencia?: number,
    planAnualId?: string,
  ): Promise<{ planAnualVigencia?: number; planAnualId?: string }> {
    if (planAnualVigencia != null && planAnualId) {
      return { planAnualVigencia, planAnualId };
    }
    if (!auditoriaId) {
      return { planAnualVigencia, planAnualId };
    }
    const aud = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
      select: ['id', 'planAnualVigencia', 'planAnualId'],
    });
    if (!aud) {
      return { planAnualVigencia, planAnualId };
    }
    return {
      planAnualVigencia: planAnualVigencia ?? aud.planAnualVigencia ?? undefined,
      planAnualId: planAnualId ?? aud.planAnualId ?? undefined,
    };
  }

  /**
   * Obtener todas las listas de chequeo (excluyendo eliminadas)
   */
  async findAll(
    includeInactive: boolean = false,
    filters?: { planAnualVigencia?: number; planAnualId?: string },
  ): Promise<ListaChequeo[]> {
    try {
      const queryBuilder = this.listaChequeoRepository
        .createQueryBuilder('lista')
        .leftJoinAndSelect('lista.items', 'items')
        .where('lista.deleted_at IS NULL');

      if (!includeInactive) {
        queryBuilder.andWhere('lista.activa = :activa', { activa: true });
      }

      if (filters?.planAnualId) {
        queryBuilder.andWhere('lista.planAnualId = :planAnualId', {
          planAnualId: filters.planAnualId,
        });
      } else if (filters?.planAnualVigencia != null) {
        queryBuilder
          .andWhere('lista.planAnualVigencia IS NOT NULL')
          .andWhere('lista.planAnualVigencia = :planAnualVigencia', {
            planAnualVigencia: filters.planAnualVigencia,
          });
      }

      queryBuilder
        .orderBy('lista.created_at', 'DESC')
        .addOrderBy('items.orden', 'ASC');

      return await queryBuilder.getMany();
    } catch (error) {
      console.error('Error en findAll listas-chequeo:', error);
      const qb = this.listaChequeoRepository
        .createQueryBuilder('lista')
        .where('lista.deleted_at IS NULL');
      if (!includeInactive) {
        qb.andWhere('lista.activa = :activa', { activa: true });
      }
      if (filters?.planAnualId) {
        qb.andWhere('lista.planAnualId = :planAnualId', {
          planAnualId: filters.planAnualId,
        });
      } else if (filters?.planAnualVigencia != null) {
        qb.andWhere('lista.planAnualVigencia IS NOT NULL').andWhere(
          'lista.planAnualVigencia = :planAnualVigencia',
          { planAnualVigencia: filters.planAnualVigencia },
        );
      }
      return qb.orderBy('lista.created_at', 'DESC').getMany();
    }
  }

  /**
   * Obtener una lista de chequeo por ID
   */
  async findOne(id: string): Promise<ListaChequeo> {
    try {
      const lista = await this.listaChequeoRepository
        .createQueryBuilder('lista')
        .leftJoinAndSelect('lista.items', 'items')
        .where('lista.id = :id', { id })
        .andWhere('lista.deleted_at IS NULL')
        .orderBy('items.orden', 'ASC')
        .getOne();

      if (!lista) {
        throw new NotFoundException(`Lista de chequeo con ID ${id} no encontrada`);
      }

      return lista;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error en findOne lista-chequeo:', error);
      // Fallback sin relaciones
      const lista = await this.listaChequeoRepository.findOne({
        where: { id },
      });
      if (!lista) {
        throw new NotFoundException(`Lista de chequeo con ID ${id} no encontrada`);
      }
      return lista;
    }
  }

  /**
   * Obtener una lista de chequeo por código
   */
  async findByCodigo(codigo: string): Promise<ListaChequeo | null> {
    try {
      return await this.listaChequeoRepository
        .createQueryBuilder('lista')
        .leftJoinAndSelect('lista.items', 'items')
        .where('lista.codigo = :codigo', { codigo })
        .andWhere('lista.deleted_at IS NULL')
        .getOne();
    } catch (error) {
      console.error('Error en findByCodigo:', error);
      return this.listaChequeoRepository.findOne({
        where: { codigo },
      });
    }
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

    await this.validarVinculacionAuditoriaEtapa(
      createDto.auditoriaId,
      createDto.etapaKanbanId,
      createDto.etapaNombreKanban,
    );

    const planResuelto = await this.resolverPlanAnualLista(
      createDto.auditoriaId,
      createDto.planAnualVigencia,
      createDto.planAnualId,
    );

    // Crear la lista con valores por defecto para campos requeridos
    const lista = this.listaChequeoRepository.create({
      codigo: createDto.codigo.toUpperCase(),
      nombre: createDto.nombre,
      descripcion: createDto.descripcion || '',
      categoria: createDto.categoria || 'General',
      tipo: createDto.tipo || 'cumplimiento', // Valor por defecto compatible con BD
      // Campos obligatorios en BD existente
      version: createDto.version || '1.0',
      estado: createDto.estado || 'activa',
      aplicablePara: createDto.aplicablePara || ['gestion', 'cumplimiento'],
      createdBy: createDto.createdBy || 'sistema',
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
      noCumplimientos: 0,
      noAplica: 0,
      hallazgosGenerados: 0,
      // ✅ FASES QUE IMPACTA LA LISTA
      fasePlaneacion: createDto.fasePlaneacion || false,
      faseEjecucion: createDto.faseEjecucion || false,
      faseComunicacion: createDto.faseComunicacion || false,
      faseSeguimiento: createDto.faseSeguimiento || false,
      // ✅ VINCULACIÓN CON ETAPA KANBAN DINÁMICA
      etapaKanbanId: createDto.etapaKanbanId,
      etapaNombreKanban: createDto.etapaNombreKanban,
      planAnualVigencia: planResuelto.planAnualVigencia,
      planAnualId: planResuelto.planAnualId,
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
          documentoBibliotecaId: itemDto.documentoBibliotecaId || null,
          documentoNombre: itemDto.documentoNombre || null,
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

    const auditoriaIdResultado =
      updateDto.auditoriaId !== undefined ? updateDto.auditoriaId : lista.auditoriaId;
    const etapaIdResultado =
      updateDto.etapaKanbanId !== undefined
        ? updateDto.etapaKanbanId
        : lista.etapaKanbanId;
    const etapaNombreResultado =
      updateDto.etapaNombreKanban !== undefined
        ? updateDto.etapaNombreKanban
        : lista.etapaNombreKanban;

    await this.validarVinculacionAuditoriaEtapa(
      auditoriaIdResultado || undefined,
      etapaIdResultado || undefined,
      etapaNombreResultado || undefined,
    );

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
    // ✅ VINCULACIÓN CON ETAPA KANBAN DINÁMICA
    if (updateDto.etapaKanbanId !== undefined) lista.etapaKanbanId = updateDto.etapaKanbanId;
    if (updateDto.etapaNombreKanban !== undefined) lista.etapaNombreKanban = updateDto.etapaNombreKanban;

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
            documentoBibliotecaId: itemDto.documentoBibliotecaId || null,
            documentoNombre: itemDto.documentoNombre || null,
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

    // Soft delete — se permite eliminar sin importar los usos programados
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
   * Persiste el estado de completado en la base de datos.
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

    // ✅ Usar SQL RAW para asegurar que la columna se actualiza correctamente
    const completado = updateData.completado ?? false;
    const fechaCompletado = completado 
      ? (updateData.fechaCompletado ? new Date(updateData.fechaCompletado) : new Date())
      : null;
    const completadoPor = completado ? (updateData.responsable || null) : null;
    const observaciones = updateData.observaciones ?? null;

    console.log(`[ListasChequeo] UPDATE RAW SQL: completado=${completado}, fechaCompletado=${fechaCompletado}, completadoPor=${completadoPor}`);

    // ✅ Ejecutar UPDATE con SQL raw para evitar cualquier problema de TypeORM
    await this.itemRepository.query(
      `UPDATE control_interno.item_lista_chequeo 
       SET completado = $1, 
           fecha_completado = $2, 
           completado_por = $3, 
           observaciones = $4,
           updated_at = NOW()
       WHERE id = $5 AND lista_chequeo_id = $6`,
      [completado, fechaCompletado, completadoPor, observaciones, itemId, listaId]
    );

    // Verificar con SQL raw que se guardó
    const verificar = await this.itemRepository.query(
      `SELECT id, completado, fecha_completado, completado_por FROM control_interno.item_lista_chequeo WHERE id = $1`,
      [itemId]
    );
    console.log(`[ListasChequeo] ✅ Verificación SQL raw después de UPDATE:`, verificar[0]);

    // Recargar el item de la BD para obtener datos frescos
    const freshItem = await this.itemRepository.findOne({ where: { id: itemId } });
    
    console.log(`[ListasChequeo] ✅ Item ${itemId} con findOne después de UPDATE: completado=${freshItem?.completado}`);

    // Actualizar el conteo de items completados en la lista padre
    // ⚠️ IMPORTANTE: Usar SQL directo para evitar que TypeORM haga cascade y sobreescriba los items
    const countResult = await this.itemRepository.query(
      `SELECT COUNT(*) as count FROM control_interno.item_lista_chequeo WHERE lista_chequeo_id = $1 AND completado = true`,
      [listaId]
    );
    const itemsCompletados = parseInt(countResult[0]?.count || '0', 10);
    
    // Actualizar solo el campo itemsCompletados sin cascade
    await this.listaChequeoRepository.query(
      `UPDATE control_interno.lista_chequeo SET items_completados = $1, updated_at = NOW() WHERE id = $2`,
      [itemsCompletados, listaId]
    );
    
    console.log(`[ListasChequeo] ✅ Lista ${listaId} actualizada: itemsCompletados=${itemsCompletados}`);

    return freshItem || item;
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

    // 🔍 DEBUG: Verificar estado del item específico en BD directamente
    const debugItem = await this.itemRepository.query(
      `SELECT id, completado, fecha_completado, updated_at 
       FROM control_interno.item_lista_chequeo 
       WHERE id = 'fce008f3-22c2-402f-9fb2-9b4abeb930b1'`
    );
    console.log(`[ListasChequeo] 🔍 DEBUG - Estado item en BD al inicio de findByAuditoria:`, debugItem[0]);

    // Validar que el auditoriaId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!auditoriaId || !uuidRegex.test(auditoriaId)) {
      console.log(`[ListasChequeo] ⚠️ auditoriaId inválido (no es UUID): ${auditoriaId}`);
      return [];
    }

    // ✅ Obtener listas sin items primero
    const listas = await this.listaChequeoRepository
      .createQueryBuilder('lista')
      .leftJoinAndSelect('lista.tipoAuditoria', 'tipoAuditoria')
      .where('lista.auditoria_id = :auditoriaId', { auditoriaId })
      .andWhere('lista.deleted_at IS NULL')
      .andWhere('lista.activa = :activa', { activa: true })
      .orderBy('lista.created_at', 'DESC')
      .getMany();

    // ✅ Cargar items con SQL RAW para evitar cache de TypeORM
    for (const lista of listas) {
      const items = await this.itemRepository.query(
        `SELECT id, lista_chequeo_id as "listaChequeoId", texto, categoria, obligatorio, orden, 
                completado, fecha_completado as "fechaCompletado", completado_por as "completadoPor", 
                observaciones, documento_biblioteca_id as "documentoBibliotecaId",
                documento_nombre as "documentoNombre",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM control_interno.item_lista_chequeo 
         WHERE lista_chequeo_id = $1 
         ORDER BY orden ASC`,
        [lista.id]
      );
      
      lista.items = items;
      
      // Debug: Log del estado de completado de cada item
      console.log(`[ListasChequeo] Lista: ${lista.nombre} (${lista.id})`);
      items.forEach((item: any) => {
        console.log(`  - Item ${item.id}: completado=${item.completado}, fechaCompletado=${item.fechaCompletado}`);
      });
    }

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
