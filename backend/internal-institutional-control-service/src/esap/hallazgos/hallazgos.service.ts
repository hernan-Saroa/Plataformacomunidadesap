import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hallazgo, HallazgoCategoria, HallazgoEstado } from './entities/hallazgo.entity';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from './dto/update-hallazgo.dto';
import { Auditoria } from '../auditorias/entities/auditoria.entity';

@Injectable()
export class HallazgosService {
  constructor(
    @InjectRepository(Hallazgo)
    private readonly hallazgoRepository: Repository<Hallazgo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  /**
   * Parsea una fecha string (YYYY-MM-DD) a Date sin conversión de zona horaria
   * Esto evita que las fechas se desplacen por diferencias de zona horaria
   */
  private parseDateOnly(dateString: string): Date {
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      // Crear fecha en hora local (no UTC) para evitar desplazamientos
      return new Date(year, month, day);
    }
    // Fallback: usar new Date normal si el formato no es el esperado
    return new Date(dateString);
  }

  /**
   * Serializa una fecha Date o string a string YYYY-MM-DD para evitar problemas de zona horaria
   */
  private serializeDate(date: Date | string | undefined | null): string | undefined {
    if (!date) return undefined;
    
    // Si ya es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof date === 'string') {
      // Si viene como ISO string (ej: "2024-12-29T00:00:00.000Z"), extraer solo la fecha
      const dateOnly = date.split('T')[0];
      // Validar formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return dateOnly;
      }
      // Si no tiene el formato esperado, intentar parsearlo
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date; // Fallback: devolver el string original
    }
    
    // Si es un objeto Date
    if (date instanceof Date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: convertir a string y extraer fecha
    const dateStr = String(date);
    const dateOnly = dateStr.split('T')[0];
    return dateOnly || dateStr;
  }

  /**
   * Serializa un hallazgo para la respuesta JSON
   */
  private serializeHallazgo(hallazgo: Hallazgo): any {
    return {
      ...hallazgo,
      fechaDeteccion: this.serializeDate(hallazgo.fechaDeteccion),
      fechaNotificacion: this.serializeDate(hallazgo.fechaNotificacion),
      fechaLimiteCorreccion: this.serializeDate(hallazgo.fechaLimiteCorreccion),
    };
  }

  /**
   * Genera un código único para el hallazgo en formato HAL-YYYY-###
   */
  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HAL-${year}-`;

    const ultimo = await this.hallazgoRepository
      .createQueryBuilder('hallazgo')
      .where('hallazgo.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('hallazgo.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo?.codigo) {
      const numero = parseInt(ultimo.codigo.split('-')[2], 10);
      if (!isNaN(numero)) {
        siguiente = numero + 1;
      }
    }

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
  }

  /**
   * Ajusta el contador de hallazgos en la auditoría relacionada
   */
  private async ajustarContadorAuditoria(auditoriaId: string | undefined | null, delta: number) {
    if (!auditoriaId) return;
    const auditoria = await this.auditoriaRepository.findOne({ where: { id: auditoriaId } });
    if (!auditoria) return;

    const nuevoTotal = Math.max(0, (auditoria.hallazgos ?? 0) + delta);
    auditoria.hallazgos = nuevoTotal;
    await this.auditoriaRepository.save(auditoria);
  }

  async findAll(filters?: { categoria?: string; estado?: string; area?: string }): Promise<Hallazgo[]> {
    const query = this.hallazgoRepository.createQueryBuilder('hallazgo')
      .leftJoinAndSelect('hallazgo.auditoriaEntity', 'auditoria')
      .orderBy('hallazgo.createdAt', 'DESC');

    if (filters?.categoria) {
      query.andWhere('hallazgo.categoria = :categoria', { categoria: filters.categoria });
    }

    if (filters?.estado) {
      query.andWhere('hallazgo.estado = :estado', { estado: filters.estado });
    }

    if (filters?.area) {
      query.andWhere('hallazgo.area ILIKE :area', { area: `%${filters.area}%` });
    }

    const hallazgos = await query.getMany();
    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
  }

  async findOne(id: string): Promise<Hallazgo> {
    const hallazgo = await this.hallazgoRepository.findOne({
      where: { id },
      relations: ['auditoriaEntity'],
    });

    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo con ID ${id} no encontrado`);
    }

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeHallazgo(hallazgo) as any;
  }

  async findByCodigo(codigo: string): Promise<Hallazgo | null> {
    const hallazgo = await this.hallazgoRepository.findOne({
      where: { codigo },
      relations: ['auditoriaEntity'],
    });
    
    if (!hallazgo) {
      return null;
    }
    
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeHallazgo(hallazgo) as any;
  }

  async create(createDto: CreateHallazgoDto): Promise<Hallazgo> {
    const codigo = await this.generarCodigo();

    // Intentar enlazar la auditoría por ID o por código
    let auditoriaId: string | null = createDto.auditoriaId || null;
    if (!auditoriaId && createDto.auditoria) {
      const auditoria = await this.auditoriaRepository.findOne({
        where: { codigo: createDto.auditoria },
      });
      auditoriaId = auditoria?.id ?? null;
    }

    const hallazgo = this.hallazgoRepository.create({
      ...createDto,
      codigo,
      titulo: createDto.titulo || createDto.descripcion?.split('.')[0] || 'Hallazgo sin título',
      auditoriaId,
      categoria: createDto.categoria || HallazgoCategoria.BORRADOR,
      estado: createDto.estado || HallazgoEstado.BORRADOR,
      normativaRelacionada: createDto.normativaRelacionada || [],
      evidencias: createDto.evidencias || [],
      recomendaciones: createDto.recomendaciones || [],
      // Parsear fechas sin conversión de zona horaria
      fechaDeteccion: createDto.fechaDeteccion ? this.parseDateOnly(createDto.fechaDeteccion) : new Date(),
      fechaNotificacion: createDto.fechaNotificacion ? this.parseDateOnly(createDto.fechaNotificacion) : undefined,
      fechaLimiteCorreccion: createDto.fechaLimiteCorreccion ? this.parseDateOnly(createDto.fechaLimiteCorreccion) : undefined,
    });

    const saved = await this.hallazgoRepository.save(hallazgo);
    await this.ajustarContadorAuditoria(saved.auditoriaId, 1);

    return this.findOne(saved.id);
  }

  async update(id: string, updateDto: UpdateHallazgoDto): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    const auditoriaAnterior = hallazgo.auditoriaId;

    // Resolver nueva auditoría si se envía
    let nuevoAuditoriaId = hallazgo.auditoriaId;
    let nuevoCodigoAuditoria = hallazgo.auditoria;
    if (updateDto.auditoriaId) {
      const auditoria = await this.auditoriaRepository.findOne({
        where: { id: updateDto.auditoriaId },
      });
      if (!auditoria) {
        throw new BadRequestException(`Auditoría con ID ${updateDto.auditoriaId} no existe`);
      }
      nuevoAuditoriaId = auditoria.id;
      nuevoCodigoAuditoria = auditoria.codigo;
    } else if (updateDto.auditoria) {
      const auditoria = await this.auditoriaRepository.findOne({
        where: { codigo: updateDto.auditoria },
      });
      if (!auditoria) {
        throw new BadRequestException(`Auditoría con código ${updateDto.auditoria} no existe`);
      }
      nuevoAuditoriaId = auditoria.id;
      nuevoCodigoAuditoria = auditoria.codigo;
    }

    // Validar y parsear fechas sin conversión de zona horaria
    if (updateDto.fechaNotificacion) {
      const notif = this.parseDateOnly(updateDto.fechaNotificacion);
      if (isNaN(notif.getTime())) {
        throw new BadRequestException('fechaNotificacion no es una fecha válida');
      }
      hallazgo.fechaNotificacion = notif;
    }

    if (updateDto.fechaLimiteCorreccion) {
      const limite = this.parseDateOnly(updateDto.fechaLimiteCorreccion);
      if (isNaN(limite.getTime())) {
        throw new BadRequestException('fechaLimiteCorreccion no es una fecha válida');
      }
      hallazgo.fechaLimiteCorreccion = limite;
    }

    if (updateDto.fechaDeteccion) {
      const deteccion = this.parseDateOnly(updateDto.fechaDeteccion);
      if (isNaN(deteccion.getTime())) {
        throw new BadRequestException('fechaDeteccion no es una fecha válida');
      }
      hallazgo.fechaDeteccion = deteccion;
    }

    // Actualizar campos básicos primero
    if (updateDto.titulo !== undefined) hallazgo.titulo = updateDto.titulo;
    if (updateDto.descripcion !== undefined) hallazgo.descripcion = updateDto.descripcion;
    if (updateDto.criterioIncumplido !== undefined) hallazgo.criterioIncumplido = updateDto.criterioIncumplido;
    if (updateDto.categoria !== undefined) hallazgo.categoria = updateDto.categoria as any;
    if (updateDto.estado !== undefined) hallazgo.estado = updateDto.estado as any;
    if (updateDto.area !== undefined) hallazgo.area = updateDto.area;
    if (updateDto.responsable !== undefined) hallazgo.responsable = updateDto.responsable;
    if (updateDto.normativaRelacionada !== undefined) hallazgo.normativaRelacionada = updateDto.normativaRelacionada;
    if (updateDto.evidencias !== undefined) hallazgo.evidencias = updateDto.evidencias;
    if (updateDto.recomendaciones !== undefined) hallazgo.recomendaciones = updateDto.recomendaciones;
    
    // SIEMPRE actualizar auditoría y auditoriaId con los valores resueltos
    hallazgo.auditoria = nuevoCodigoAuditoria;
    hallazgo.auditoriaId = nuevoAuditoriaId;
    
    // Asegurar que el título tenga un valor por defecto si no se proporcionó
    if (!hallazgo.titulo) {
      hallazgo.titulo = hallazgo.descripcion?.split('.')[0] || 'Hallazgo sin título';
    }

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    // Ajustar contadores si cambió la auditoría
    if (auditoriaAnterior && auditoriaAnterior !== nuevoAuditoriaId) {
      await this.ajustarContadorAuditoria(auditoriaAnterior, -1);
    }
    if (nuevoAuditoriaId && auditoriaAnterior !== nuevoAuditoriaId) {
      await this.ajustarContadorAuditoria(nuevoAuditoriaId, 1);
    }

    return this.findOne(actualizado.id);
  }

  async delete(id: string): Promise<void> {
    const hallazgo = await this.findOne(id);
    await this.hallazgoRepository.remove(hallazgo);
    await this.ajustarContadorAuditoria(hallazgo.auditoriaId, -1);
  }

  async findByCategoria(categoria: HallazgoCategoria): Promise<Hallazgo[]> {
    const hallazgos = await this.hallazgoRepository.find({
      where: { categoria },
      order: { createdAt: 'DESC' },
      relations: ['auditoriaEntity'],
    });
    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
  }
}

