import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hallazgo, HallazgoCategoria, HallazgoEstado } from './entities/hallazgo.entity';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from './dto/update-hallazgo.dto';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria, TipoEvento } from '../auditorias/entities/historial-auditoria.entity';

@Injectable()
export class HallazgosService {
  constructor(
    @InjectRepository(Hallazgo)
    private readonly hallazgoRepository: Repository<Hallazgo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(HistorialAuditoria)
    private readonly historialRepository: Repository<HistorialAuditoria>,
  ) {}

  /**
   * Registra evento en el historial de la auditoría
   */
  private async registrarHistorial(
    auditoriaId: string | null | undefined,
    tipoEvento: TipoEvento,
    accion: string,
    descripcion: string,
  ): Promise<void> {
    if (!auditoriaId) return;
    
    try {
      const ahora = new Date();
      const fecha = ahora.toISOString().split('T')[0];
      const hora = ahora.toTimeString().split(' ')[0];
      
      const historial = new HistorialAuditoria();
      historial.auditoriaId = auditoriaId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = new Date(fecha);
      historial.hora = hora;
      historial.usuarioId = 1; // TODO: Obtener del contexto de autenticación
      historial.accion = accion;
      historial.descripcion = descripcion;
      historial.cambios = [];
      
      await this.historialRepository.save(historial);
    } catch (err) {
      console.error('[HallazgosService] Error registrando historial:', err);
    }
  }

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
      fechaDecision: (hallazgo as any).fechaDecision
        ? new Date((hallazgo as any).fechaDecision).toISOString()
        : undefined,
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

  /**
   * Obtiene todos los hallazgos de una auditoría
   */
  async findByAuditoria(auditoriaId: string): Promise<Hallazgo[]> {
    const hallazgos = await this.hallazgoRepository.find({
      where: { auditoriaId },
      relations: ['auditoriaEntity'],
      order: { createdAt: 'DESC' },
    });

    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
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

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      saved.auditoriaId,
      TipoEvento.HALLAZGO,
      'Hallazgo creado',
      `Se creó el hallazgo ${saved.codigo} - ${saved.titulo}`,
    );

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

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      actualizado.auditoriaId,
      TipoEvento.HALLAZGO,
      'Hallazgo actualizado',
      `Se actualizó el hallazgo ${actualizado.codigo} - ${actualizado.titulo}`,
    );

    return this.findOne(actualizado.id);
  }

  async delete(id: string): Promise<void> {
    const hallazgo = await this.findOne(id);
    const auditoriaId = hallazgo.auditoriaId;
    const codigo = hallazgo.codigo;
    const titulo = hallazgo.titulo;
    
    await this.hallazgoRepository.remove(hallazgo);
    await this.ajustarContadorAuditoria(auditoriaId, -1);

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      auditoriaId,
      TipoEvento.ELIMINACION,
      'Hallazgo eliminado',
      `Se eliminó el hallazgo ${codigo} - ${titulo}`,
    );
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

  /**
   * Área auditada acepta el hallazgo (estado → ACEPTADO)
   */
  async aceptar(id: string): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    if (hallazgo.estado !== HallazgoEstado.NOTIFICADO) {
      throw new BadRequestException(
        `Solo se puede aceptar un hallazgo en estado "notificado". Estado actual: ${hallazgo.estado}`,
      );
    }

    hallazgo.estado = HallazgoEstado.ACEPTADO;
    const actualizado = await this.hallazgoRepository.save(hallazgo);

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      'Hallazgo aceptado',
      `El área auditada aceptó el hallazgo ${hallazgo.codigo}`,
    );

    return this.findOne(actualizado.id);
  }

  /**
   * Área auditada presenta controversia (argumentos + documento adjunto)
   */
  async presentarControversia(
    id: string,
    argumentos: string,
    documentoId: string,
    documentoNombre: string,
  ): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    if (hallazgo.estado !== HallazgoEstado.NOTIFICADO) {
      throw new BadRequestException(
        `Solo se puede presentar controversia sobre un hallazgo en estado "notificado". Estado actual: ${hallazgo.estado}`,
      );
    }

    if (!argumentos || !argumentos.trim()) {
      throw new BadRequestException('Los argumentos técnicos son obligatorios');
    }

    (hallazgo as any).argumentosControversia = argumentos.trim();
    (hallazgo as any).observacionesControversia = argumentos.trim(); // Compatibilidad
    (hallazgo as any).documentoControversiaUrl = documentoId; // ID para URL de descarga
    (hallazgo as any).documentoControversiaNombre = documentoNombre;
    hallazgo.estado = HallazgoEstado.EN_CONTROVERSIA;

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      'Controversia presentada',
      `El área auditada presentó controversia sobre el hallazgo ${hallazgo.codigo}`,
    );

    return this.findOne(actualizado.id);
  }

  /**
   * Auditor toma decisión sobre controversia: ratificado | modificado | retirado
   */
  async decisionAuditor(
    id: string,
    tipoDecision: 'ratificado' | 'modificado' | 'retirado',
    fundamentacionTecnica: string,
    auditorId?: number,
  ): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    if (hallazgo.estado !== HallazgoEstado.EN_CONTROVERSIA) {
      throw new BadRequestException(
        `Solo se puede tomar decisión sobre un hallazgo en estado "en-controversia". Estado actual: ${hallazgo.estado}`,
      );
    }

    if (!fundamentacionTecnica || !fundamentacionTecnica.trim()) {
      throw new BadRequestException('La fundamentación técnica es obligatoria');
    }

    const estadoMap = {
      ratificado: HallazgoEstado.RATIFICADO,
      modificado: HallazgoEstado.MODIFICADO,
      retirado: HallazgoEstado.RETIRADO,
    };

    (hallazgo as any).decisionAuditor = tipoDecision;
    (hallazgo as any).fundamentacionTecnica = fundamentacionTecnica.trim();
    (hallazgo as any).fechaDecision = new Date();
    (hallazgo as any).auditorDecisionId = auditorId ?? 1;
    hallazgo.estado = estadoMap[tipoDecision];

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      `Decisión del auditor: ${tipoDecision}`,
      `El auditor ${tipoDecision} el hallazgo ${hallazgo.codigo}. Fundamentación: ${fundamentacionTecnica.substring(0, 100)}...`,
    );

    return this.findOne(actualizado.id);
  }

  /**
   * Verifica si hay controversias pendientes de decisión en una auditoría
   */
  async hayControversiasPendientes(auditoriaId: string): Promise<boolean> {
    const count = await this.hallazgoRepository.count({
      where: {
        auditoriaId,
        estado: HallazgoEstado.EN_CONTROVERSIA,
      },
    });
    return count > 0;
  }

  /**
   * Notifica hallazgos (actualiza BORRADOR → NOTIFICADO) al generar informe preliminar.
   * Solo los que están en BORRADOR pasan a NOTIFICADO. Los ya en aceptado/ratificado/modificado/retirado no se tocan.
   */
  async notificarHallazgosAuditoria(auditoriaId: string): Promise<{ count: number; total: number }> {
    const [pendientes, todos] = await Promise.all([
      this.hallazgoRepository.find({ where: { auditoriaId, estado: HallazgoEstado.BORRADOR } }),
      this.hallazgoRepository.count({ where: { auditoriaId } }),
    ]);
    const hoy = new Date();
    for (const h of pendientes) {
      h.estado = HallazgoEstado.NOTIFICADO;
      h.fechaNotificacion = hoy;
      await this.hallazgoRepository.save(h);
    }
    await this.registrarHistorial(
      auditoriaId,
      TipoEvento.HALLAZGO,
      'Informe preliminar generado',
      `${pendientes.length} hallazgos notificados al área auditada`,
    );
    return { count: pendientes.length, total: todos };
  }
}

