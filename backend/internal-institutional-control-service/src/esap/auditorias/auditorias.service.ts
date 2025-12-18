import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, ILike } from 'typeorm';
import { Auditoria, TipoAuditoria, FaseAuditoria, PrioridadAuditoria } from './entities/auditoria.entity';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';

@Injectable()
export class AuditoriasService {
  constructor(
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
   * Genera un código único para la auditoría en formato AUD-YYYY-###
   */
  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;

    // Buscar el último código del año
    const ultimaAuditoria = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('auditoria.codigo', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (ultimaAuditoria) {
      const lastNumber = parseInt(ultimaAuditoria.codigo.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Serializa una fecha Date o string a string YYYY-MM-DD para evitar problemas de zona horaria
   */
  private serializeDate(date: Date | string): string {
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
   * Serializa una auditoría para la respuesta JSON
   */
  private serializeAuditoria(auditoria: Auditoria): any {
    return {
      ...auditoria,
      fechaInicio: this.serializeDate(auditoria.fechaInicio),
      fechaFin: this.serializeDate(auditoria.fechaFin),
    };
  }

  /**
   * Obtiene todas las auditorías con filtros opcionales
   */
  async findAll(filters?: {
    tipo?: string;
    fase?: string;
    prioridad?: string;
    territorial?: string;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<Auditoria[]> {
    const query = this.auditoriaRepository.createQueryBuilder('auditoria')
      .orderBy('auditoria.createdAt', 'DESC');

    if (filters?.tipo) {
      query.andWhere('auditoria.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.fase) {
      query.andWhere('auditoria.fase = :fase', { fase: filters.fase });
    }

    if (filters?.prioridad) {
      query.andWhere('auditoria.prioridad = :prioridad', { prioridad: filters.prioridad });
    }

    if (filters?.territorial) {
      query.andWhere('auditoria.territorial = :territorial', { territorial: filters.territorial });
    }

    if (filters?.search) {
      query.andWhere(
        '(auditoria.nombre ILIKE :search OR auditoria.codigo ILIKE :search OR auditoria.responsable ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters?.fechaDesde) {
      query.andWhere('auditoria.fechaInicio >= :fechaDesde', { fechaDesde: filters.fechaDesde });
    }

    if (filters?.fechaHasta) {
      query.andWhere('auditoria.fechaFin <= :fechaHasta', { fechaHasta: filters.fechaHasta });
    }

    const auditorias = await query.getMany();
    // Serializar fechas para evitar problemas de zona horaria
    return auditorias.map(aud => this.serializeAuditoria(aud));
  }

  /**
   * Obtiene una auditoría por ID
   */
  async findOne(id: string): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Busca una auditoría por código
   */
  async findByCodigo(codigo: string): Promise<Auditoria | null> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { codigo },
    });
    
    if (!auditoria) {
      return null;
    }
    
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Crea una nueva auditoría
   */
  async create(createDto: CreateAuditoriaDto): Promise<Auditoria> {
    // Parsear fechas sin conversión de zona horaria
    const fechaInicio = this.parseDateOnly(createDto.fechaInicio);
    const fechaFin = this.parseDateOnly(createDto.fechaFin);

    // Validar que fechaFin sea posterior a fechaInicio
    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha de finalización debe ser posterior a la fecha de inicio');
    }

    // Generar código automático
    const codigo = await this.generarCodigo();

    // Verificar que no exista un código duplicado (por si acaso)
    const existente = await this.findByCodigo(codigo);
    if (existente) {
      throw new BadRequestException(`Ya existe una auditoría con el código ${codigo}`);
    }

    const auditoria = this.auditoriaRepository.create({
      ...createDto,
      codigo,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      fase: createDto.fase || FaseAuditoria.PLANEACION,
      prioridad: createDto.prioridad || PrioridadAuditoria.MEDIA,
      progreso: createDto.progreso ?? 0,
      hallazgos: 0,
    });

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Actualiza una auditoría existente
   */
  async update(id: string, updateDto: UpdateAuditoriaDto): Promise<Auditoria> {
    const auditoria = await this.findOne(id);

    // Validar fechas si se actualizan
    if (updateDto.fechaInicio || updateDto.fechaFin) {
      const fechaInicio = updateDto.fechaInicio 
        ? this.parseDateOnly(updateDto.fechaInicio) 
        : auditoria.fechaInicio;
      const fechaFin = updateDto.fechaFin 
        ? this.parseDateOnly(updateDto.fechaFin) 
        : auditoria.fechaFin;

      if (fechaFin < fechaInicio) {
        throw new BadRequestException('La fecha de finalización debe ser posterior a la fecha de inicio');
      }
    }

    // Actualizar campos
    if (updateDto.nombre) auditoria.nombre = updateDto.nombre;
    if (updateDto.tipo) auditoria.tipo = updateDto.tipo as TipoAuditoria;
    if (updateDto.fase) auditoria.fase = updateDto.fase as FaseAuditoria;
    if (updateDto.territorial) auditoria.territorial = updateDto.territorial;
    if (updateDto.sede) auditoria.sede = updateDto.sede;
    if (updateDto.responsable) auditoria.responsable = updateDto.responsable;
    if (updateDto.fechaInicio) auditoria.fechaInicio = this.parseDateOnly(updateDto.fechaInicio);
    if (updateDto.fechaFin) auditoria.fechaFin = this.parseDateOnly(updateDto.fechaFin);
    if (updateDto.progreso !== undefined) auditoria.progreso = updateDto.progreso;
    if (updateDto.prioridad) auditoria.prioridad = updateDto.prioridad as PrioridadAuditoria;
    if (updateDto.hallazgos !== undefined) auditoria.hallazgos = updateDto.hallazgos;

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Elimina una auditoría
   */
  async delete(id: string): Promise<void> {
    const auditoria = await this.findOne(id);
    await this.auditoriaRepository.remove(auditoria);
  }

  /**
   * Obtiene estadísticas de auditorías
   */
  async getEstadisticas(): Promise<{
    totalAuditorias: number;
    enCurso: number;
    completadas: number;
    hallazgosTotal: number;
    porFase: { fase: string; cantidad: number }[];
    porTipo: { tipo: string; cantidad: number }[];
    porPrioridad: { prioridad: string; cantidad: number }[];
  }> {
    const totalAuditorias = await this.auditoriaRepository.count();
    const enCurso = await this.auditoriaRepository.count({ where: { fase: FaseAuditoria.EN_CURSO } });
    const completadas = await this.auditoriaRepository.count({ where: { fase: FaseAuditoria.COMPLETADA } });

    const auditorias = await this.auditoriaRepository.find();
    const hallazgosTotal = auditorias.reduce((sum, a) => sum + a.hallazgos, 0);

    // Estadísticas por fase
    const porFase = [
      { fase: FaseAuditoria.PLANEACION, cantidad: 0 },
      { fase: FaseAuditoria.EN_CURSO, cantidad: 0 },
      { fase: FaseAuditoria.REVISION, cantidad: 0 },
      { fase: FaseAuditoria.COMPLETADA, cantidad: 0 },
    ];

    auditorias.forEach(a => {
      const fase = porFase.find(pf => pf.fase === a.fase);
      if (fase) fase.cantidad++;
    });

    // Estadísticas por tipo
    const tipos = Object.values(TipoAuditoria);
    const porTipo = tipos.map(tipo => ({
      tipo,
      cantidad: auditorias.filter(a => a.tipo === tipo).length,
    }));

    // Estadísticas por prioridad
    const prioridades = Object.values(PrioridadAuditoria);
    const porPrioridad = prioridades.map(prioridad => ({
      prioridad,
      cantidad: auditorias.filter(a => a.prioridad === prioridad).length,
    }));

    return {
      totalAuditorias,
      enCurso,
      completadas,
      hallazgosTotal,
      porFase,
      porTipo,
      porPrioridad,
    };
  }

  /**
   * Obtiene auditorías por fase (útil para el Kanban)
   */
  async findByFase(fase: FaseAuditoria): Promise<Auditoria[]> {
    const auditorias = await this.auditoriaRepository.find({
      where: { fase },
      order: { createdAt: 'DESC' },
    });
    // Serializar fechas para evitar problemas de zona horaria
    return auditorias.map(aud => this.serializeAuditoria(aud));
  }

  /**
   * Actualiza el progreso de una auditoría
   */
  async updateProgreso(id: string, progreso: number): Promise<Auditoria> {
    if (progreso < 0 || progreso > 100) {
      throw new BadRequestException('El progreso debe estar entre 0 y 100');
    }

    const auditoria = await this.auditoriaRepository.findOne({ where: { id } });
    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }
    
    auditoria.progreso = progreso;

    // Si el progreso llega a 100, cambiar fase a completada
    if (progreso === 100 && auditoria.fase !== FaseAuditoria.COMPLETADA) {
      auditoria.fase = FaseAuditoria.COMPLETADA;
    }

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Actualiza la fase de una auditoría
   */
  async updateFase(id: string, fase: FaseAuditoria): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({ where: { id } });
    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }
    
    auditoria.fase = fase;

    // Si se completa, asegurar progreso al 100%
    if (fase === FaseAuditoria.COMPLETADA) {
      auditoria.progreso = 100;
    }

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Incrementa el contador de hallazgos
   */
  async incrementarHallazgos(id: string): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({ where: { id } });
    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }
    
    auditoria.hallazgos += 1;
    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Decrementa el contador de hallazgos
   */
  async decrementarHallazgos(id: string): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({ where: { id } });
    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }
    
    if (auditoria.hallazgos > 0) {
      auditoria.hallazgos -= 1;
    }
    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }
}












