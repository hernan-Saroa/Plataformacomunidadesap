import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, ILike } from 'typeorm';
import { Auditoria, TipoAuditoria, FaseAuditoria, PrioridadAuditoria, RiesgoKanban, EstadoKanban } from './entities/auditoria.entity';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { CreateNotaDto } from './dto/create-nota.dto';
import { UpdateNotaDto } from './dto/update-nota.dto';
import { ObjetivoAuditoria } from './entities/objetivo-auditoria.entity';
import { EquipoAuditor } from './entities/equipo-auditor.entity';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import { HistorialAuditoria, TipoEvento } from './entities/historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from './entities/auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from './entities/auditoria-especial-info.entity';
import { CriterioAuditoria } from './entities/criterio-auditoria.entity';
import { AuditoriaKanbanDto, PersonaDto, ObjetivoDto } from './dto/auditoria-kanban.dto';

@Injectable()
export class AuditoriasService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(ObjetivoAuditoria)
    private readonly objetivoRepository: Repository<ObjetivoAuditoria>,
    @InjectRepository(EquipoAuditor)
    private readonly equipoRepository: Repository<EquipoAuditor>,
    @InjectRepository(NotaAuditoria)
    private readonly notaRepository: Repository<NotaAuditoria>,
    @InjectRepository(HistorialAuditoria)
    private readonly historialRepository: Repository<HistorialAuditoria>,
    @InjectRepository(AuditoriaTerritorialInfo)
    private readonly territorialInfoRepository: Repository<AuditoriaTerritorialInfo>,
    @InjectRepository(AuditoriaEspecialInfo)
    private readonly especialInfoRepository: Repository<AuditoriaEspecialInfo>,
    @InjectRepository(CriterioAuditoria)
    private readonly criterioRepository: Repository<CriterioAuditoria>,
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
      // Asegurar que checklistCompletados se devuelva como objeto (no string)
      checklistCompletados: auditoria.checklistCompletados 
        ? (typeof auditoria.checklistCompletados === 'string' 
            ? JSON.parse(auditoria.checklistCompletados) 
            : auditoria.checklistCompletados)
        : {},
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
      activa: true, // CRÍTICO: Asegurar que la auditoría esté activa para que aparezca en el Kanban
    });

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(saved) as any;
  }

  /**
   * Actualiza una auditoría existente
   */
  async update(id: string, updateDto: UpdateAuditoriaDto): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({ 
      where: { id },
      relations: ['objetivos', 'criterios']
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }

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

    // Actualizar campos básicos
    if (updateDto.nombre !== undefined) auditoria.nombre = updateDto.nombre;
    // Permitir actualizar descripción incluso si es string vacío
    if (updateDto.descripcion !== undefined) {
      auditoria.descripcion = updateDto.descripcion;
    }
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

    // Actualizar campos del Kanban
    if (updateDto.estadoKanban !== undefined) auditoria.estadoKanban = updateDto.estadoKanban;
    // Actualizar riesgoKanban - asegurar que se guarde incluso si viene como string
    if (updateDto.riesgoKanban !== undefined) {
      // Validar que el valor sea uno de los permitidos
      const riesgoValido = ['Alto', 'Medio', 'Bajo'].includes(updateDto.riesgoKanban as string);
      if (riesgoValido) {
        auditoria.riesgoKanban = updateDto.riesgoKanban as RiesgoKanban;
      } else {
        console.warn(`[AuditoriasService] Valor de riesgoKanban inválido: ${updateDto.riesgoKanban}`);
      }
    }
    if (updateDto.semaforo !== undefined) auditoria.semaforo = updateDto.semaforo;
    if (updateDto.tipoKanban !== undefined) auditoria.tipoKanban = updateDto.tipoKanban;
    if (updateDto.prioridadKanban !== undefined) auditoria.prioridadKanban = updateDto.prioridadKanban;
    if (updateDto.areaObjetivo !== undefined) auditoria.areaObjetivo = updateDto.areaObjetivo;
    if (updateDto.permiteCambiarObjetivos !== undefined) auditoria.permiteCambiarObjetivos = updateDto.permiteCambiarObjetivos;
    if (updateDto.calificacionRiesgo !== undefined) auditoria.calificacionRiesgo = updateDto.calificacionRiesgo;
    if (updateDto.ultimaActuacion !== undefined) auditoria.ultimaActuacion = updateDto.ultimaActuacion;
    if (updateDto.diasRestantes !== undefined) auditoria.diasRestantes = updateDto.diasRestantes;
    if (updateDto.porcentajeTiempo !== undefined) auditoria.porcentajeTiempo = updateDto.porcentajeTiempo;
    if (updateDto.totalDocumentos !== undefined) auditoria.totalDocumentos = updateDto.totalDocumentos;
    if (updateDto.totalInformes !== undefined) auditoria.totalInformes = updateDto.totalInformes;
    if (updateDto.totalTareas !== undefined) auditoria.totalTareas = updateDto.totalTareas;
    if (updateDto.actividadesCompletas !== undefined) auditoria.actividadesCompletas = updateDto.actividadesCompletas;
    if (updateDto.actividadesPendientes !== undefined) auditoria.actividadesPendientes = updateDto.actividadesPendientes;
    if (updateDto.auditorLiderId !== undefined) auditoria.auditorLiderId = updateDto.auditorLiderId;
    if (updateDto.auditorAsignadoId !== undefined) auditoria.auditorAsignadoId = updateDto.auditorAsignadoId;
    if (updateDto.supervisorAsignadoId !== undefined) auditoria.supervisorAsignadoId = updateDto.supervisorAsignadoId;
    // Actualizar alcance - asegurar que se guarde incluso si está vacío
    if (updateDto.alcance !== undefined) {
      auditoria.alcance = updateDto.alcance;
      console.log(`[AuditoriasService] Actualizando alcance: "${updateDto.alcance}"`);
    }
    if (updateDto.procesoAuditado !== undefined) auditoria.procesoAuditado = updateDto.procesoAuditado;
    if (updateDto.responsableAreaNombre !== undefined) auditoria.responsableAreaNombre = updateDto.responsableAreaNombre;
    if (updateDto.responsableAreaCargo !== undefined) auditoria.responsableAreaCargo = updateDto.responsableAreaCargo;
    if (updateDto.responsableAreaEmail !== undefined) auditoria.responsableAreaEmail = updateDto.responsableAreaEmail;
    if (updateDto.fechaReunionApertura) {
      auditoria.fechaReunionApertura = new Date(updateDto.fechaReunionApertura);
    }
    if (updateDto.observacionesAdicionales !== undefined) {
      auditoria.observacionesAdicionales = updateDto.observacionesAdicionales;
    }

    // Actualizar metadata del programa anual
    if (updateDto.programaAnualMetadata !== undefined) {
      console.log('[AuditoriasService] Actualizando programaAnualMetadata:', updateDto.programaAnualMetadata);
      auditoria.programaAnualMetadata = updateDto.programaAnualMetadata;
      console.log('[AuditoriasService] programaAnualMetadata asignado a auditoría:', auditoria.programaAnualMetadata);
    }

    // Actualizar estado de checkboxes de actividades
    if (updateDto.checklistCompletados !== undefined) {
      // Si ya existe, mergear con el existente, si no, crear nuevo
      const estadoActual = auditoria.checklistCompletados || {};
      auditoria.checklistCompletados = {
        ...estadoActual,
        ...updateDto.checklistCompletados,
      };
    }

    // Actualizar campos de archivo
    if (updateDto.archivada !== undefined) {
      auditoria.archivada = updateDto.archivada;
      // Si se archiva, también desactivar y establecer fecha de archivo
      if (updateDto.archivada) {
        auditoria.activa = false;
        auditoria.fechaArchivo = new Date();
      } else {
        // Si se desarchiva, reactivar
        auditoria.activa = true;
        auditoria.fechaArchivo = undefined;
      }
    }
    if (updateDto.fechaArchivo !== undefined && updateDto.fechaArchivo) {
      auditoria.fechaArchivo = new Date(updateDto.fechaArchivo);
    }
    if (updateDto.activa !== undefined) {
      auditoria.activa = updateDto.activa;
    }

    // Log para depuración
    console.log('[AuditoriasService.update] Datos recibidos:', {
      alcance: updateDto.alcance,
      riesgoKanban: updateDto.riesgoKanban,
      auditorLiderId: updateDto.auditorLiderId,
      auditorAsignadoId: updateDto.auditorAsignadoId,
    });
    console.log('[AuditoriasService.update] Valores antes de guardar:', {
      alcance: auditoria.alcance,
      riesgoKanban: auditoria.riesgoKanban,
      auditorLiderId: auditoria.auditorLiderId,
      auditorAsignadoId: auditoria.auditorAsignadoId,
    });

    // Guardar cambios en la auditoría
    // Log antes de guardar
    console.log('[AuditoriasService.update] programaAnualMetadata antes de save:', auditoria.programaAnualMetadata);
    
    const saved = await this.auditoriaRepository.save(auditoria);
    
    console.log('[AuditoriasService.update] Valores después de guardar:', {
      alcance: saved.alcance,
      programaAnualMetadata: saved.programaAnualMetadata,
      riesgoKanban: saved.riesgoKanban,
      auditorLiderId: saved.auditorLiderId,
      auditorAsignadoId: saved.auditorAsignadoId,
    });

    // Actualizar objetivos si se proporcionan
    if (updateDto.objetivos && Array.isArray(updateDto.objetivos)) {
      // Eliminar objetivos existentes
      if (auditoria.objetivos && auditoria.objetivos.length > 0) {
        await this.objetivoRepository.remove(auditoria.objetivos);
      }

      // Crear nuevos objetivos
      const nuevosObjetivos = updateDto.objetivos
        .filter(descripcion => descripcion && descripcion.trim().length > 0)
        .map((descripcion, index) => {
          return this.objetivoRepository.create({
            auditoriaId: saved.id,
            descripcion: descripcion.trim(),
            orden: index + 1,
          });
        });

      if (nuevosObjetivos.length > 0) {
        await this.objetivoRepository.save(nuevosObjetivos);
      }
    }

    // Actualizar criterios si se proporcionan
    if (updateDto.criterios && Array.isArray(updateDto.criterios)) {
      // Eliminar criterios existentes
      if (auditoria.criterios && auditoria.criterios.length > 0) {
        await this.criterioRepository.remove(auditoria.criterios);
      }

      // Crear nuevos criterios
      const nuevosCriterios = updateDto.criterios
        .filter(criterio => criterio && criterio.trim().length > 0)
        .map((criterio, index) => {
          return this.criterioRepository.create({
            auditoriaId: saved.id,
            criterio: criterio.trim(),
            orden: index + 1,
          });
        });

      if (nuevosCriterios.length > 0) {
        await this.criterioRepository.save(nuevosCriterios);
      }
    }

    // Recargar la auditoría con relaciones actualizadas
    const auditoriaActualizada = await this.auditoriaRepository.findOne({
      where: { id: saved.id },
      relations: ['objetivos', 'criterios', 'equipoAuditores', 'territorialInfo', 'especialInfo'],
    });

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeAuditoria(auditoriaActualizada || saved) as any;
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

  /**
   * Obtiene todas las auditorías para el Kanban con todas las relaciones
   */
  async findAllKanban(): Promise<AuditoriaKanbanDto[]> {
    const auditorias = await this.auditoriaRepository.find({
      where: { activa: true },
      relations: ['objetivos', 'equipoAuditores', 'territorialInfo', 'especialInfo'],
      order: { createdAt: 'DESC' },
    });

    // Obtener información de personas desde auth.personas usando query raw
    const auditoriasConPersonas = await Promise.all(
      auditorias.map(async (auditoria) => {
        // Obtener datos de personas desde auth.personas
        let auditorLider: PersonaDto | undefined;
        let auditorAsignado: PersonaDto | undefined;

        if (auditoria.auditorLiderId) {
          const lider = await this.auditoriaRepository.query(
            `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
             FROM auth.personas 
             WHERE id_tercero = $1`,
            [auditoria.auditorLiderId]
          );
          if (lider && lider.length > 0) {
            const p = lider[0];
            const iniciales = p.sig_tercero || this.getIniciales(p.nom_largo);
            auditorLider = {
              nombre: p.nom_largo,
              cargo: 'Auditor Líder', // TODO: Obtener desde auditor_perfil
              iniciales,
              tipoIdentificacion: p.tip_identificacion || 'CC',
              numeroIdentificacion: p.num_identificacion,
            };
          }
        }

        if (auditoria.auditorAsignadoId) {
          const asignado = await this.auditoriaRepository.query(
            `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
             FROM auth.personas 
             WHERE id_tercero = $1`,
            [auditoria.auditorAsignadoId]
          );
          if (asignado && asignado.length > 0) {
            const p = asignado[0];
            const iniciales = p.sig_tercero || this.getIniciales(p.nom_largo);
            auditorAsignado = {
              nombre: p.nom_largo,
              cargo: 'Auditor', // TODO: Obtener desde auditor_perfil
              iniciales,
              tipoIdentificacion: p.tip_identificacion || 'CC',
              numeroIdentificacion: p.num_identificacion,
            };
          }
        }

        // Obtener nombres del equipo de auditores
        const equipoActivo = auditoria.equipoAuditores?.filter(e => e.activo) || [];
        const equipoNombres = await Promise.all(
          equipoActivo.map(async (equipo) => {
            const persona = await this.auditoriaRepository.query(
              `SELECT nom_largo FROM auth.personas WHERE id_tercero = $1`,
              [equipo.personaId]
            );
            return persona && persona.length > 0 ? persona[0].nom_largo : 'N/A';
          })
        );

        // Formatear fechas a DD/MM/YYYY
        const fechaInicio = this.formatDateDDMMYYYY(auditoria.fechaInicio);
        const fechaFin = this.formatDateDDMMYYYY(auditoria.fechaFin);

        // Mapear objetivos
        const objetivos: ObjetivoDto[] = (auditoria.objetivos || [])
          .filter(obj => obj.activo)
          .sort((a, b) => a.orden - b.orden)
          .map(obj => ({
            id: obj.id,
            descripcion: obj.descripcion,
          }));

        return {
          id: auditoria.id,
          codigo: auditoria.codigo,
          titulo: auditoria.nombre,
          descripcion: auditoria.descripcion,
          estado: auditoria.estadoKanban || this.mapFaseToEstadoKanban(auditoria.fase),
          riesgo: auditoria.riesgoKanban || 'Medio',
          semaforo: auditoria.semaforo || 'verde',
          territorial: auditoria.territorial,
          auditorLider,
          auditorAsignado,
          fechaInicio,
          fechaFin,
          progreso: auditoria.progreso,
          hallazgos: auditoria.hallazgos,
          diasRestantes: auditoria.diasRestantes || this.calcularDiasRestantes(auditoria.fechaFin),
          porcentajeTiempo: auditoria.porcentajeTiempo || this.calcularPorcentajeTiempo(auditoria.fechaInicio, auditoria.fechaFin),
          ultimaActuacion: auditoria.ultimaActuacion,
          objetivos,
          calificacionRiesgo: auditoria.calificacionRiesgo,
          documentos: auditoria.totalDocumentos,
          informes: auditoria.totalInformes,
          tareas: auditoria.totalTareas,
          tipo: auditoria.tipo || 'Gestión', // Usar el tipo real de la auditoría, no tipoKanban
          tipoKanban: auditoria.tipoKanban || 'regular', // Mantener tipoKanban separado
          prioridad: auditoria.prioridadKanban || 'media',
          areaObjetivo: auditoria.areaObjetivo,
          permiteCambiarObjetivos: auditoria.permiteCambiarObjetivos,
          equipoAuditores: equipoNombres,
          territorialInfo: auditoria.territorialInfo ? {
            nombre: auditoria.territorialInfo.nombre,
            ciudad: auditoria.territorialInfo.ciudad,
            departamento: auditoria.territorialInfo.departamento,
          } : undefined,
          especial: auditoria.especialInfo ? {
            tipoMotivo: auditoria.especialInfo.tipoMotivo,
            solicitante: auditoria.especialInfo.solicitante,
            justificacion: auditoria.especialInfo.justificacion,
          } : undefined,
          actividadesCompletas: auditoria.actividadesCompletas,
          actividadesPendientes: auditoria.actividadesPendientes,
          alcance: auditoria.alcance || '', // Agregar alcance al DTO
        };
      })
    );

    return auditoriasConPersonas;
  }

  /**
   * Obtiene todas las auditorías archivadas para el Kanban
   */
  async findAllKanbanArchivadas(): Promise<AuditoriaKanbanDto[]> {
    const auditorias = await this.auditoriaRepository.find({
      where: { archivada: true },
      relations: ['objetivos', 'equipoAuditores', 'territorialInfo', 'especialInfo'],
      order: { fechaArchivo: 'DESC' },
    });

    // Obtener información de personas desde auth.personas usando query raw
    const auditoriasConPersonas = await Promise.all(
      auditorias.map(async (auditoria) => {
        // Obtener datos de personas desde auth.personas
        let auditorLider: PersonaDto | undefined;
        let auditorAsignado: PersonaDto | undefined;

        if (auditoria.auditorLiderId) {
          const lider = await this.auditoriaRepository.query(
            `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
             FROM auth.personas 
             WHERE id_tercero = $1`,
            [auditoria.auditorLiderId]
          );
          if (lider && lider.length > 0) {
            const p = lider[0];
            const iniciales = p.sig_tercero || this.getIniciales(p.nom_largo);
            auditorLider = {
              nombre: p.nom_largo,
              cargo: 'Auditor Líder',
              iniciales,
              tipoIdentificacion: p.tip_identificacion || 'CC',
              numeroIdentificacion: p.num_identificacion,
            };
          }
        }

        if (auditoria.auditorAsignadoId) {
          const asignado = await this.auditoriaRepository.query(
            `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
             FROM auth.personas 
             WHERE id_tercero = $1`,
            [auditoria.auditorAsignadoId]
          );
          if (asignado && asignado.length > 0) {
            const p = asignado[0];
            const iniciales = p.sig_tercero || this.getIniciales(p.nom_largo);
            auditorAsignado = {
              nombre: p.nom_largo,
              cargo: 'Auditor',
              iniciales,
              tipoIdentificacion: p.tip_identificacion || 'CC',
              numeroIdentificacion: p.num_identificacion,
            };
          }
        }

        // Obtener nombres del equipo de auditores
        const equipoActivo = auditoria.equipoAuditores?.filter(e => e.activo) || [];
        const equipoNombres = await Promise.all(
          equipoActivo.map(async (equipo) => {
            const persona = await this.auditoriaRepository.query(
              `SELECT nom_largo FROM auth.personas WHERE id_tercero = $1`,
              [equipo.personaId]
            );
            return persona && persona.length > 0 ? persona[0].nom_largo : 'N/A';
          })
        );

        // Formatear fechas a DD/MM/YYYY
        const fechaInicio = this.formatDateDDMMYYYY(auditoria.fechaInicio);
        const fechaFin = this.formatDateDDMMYYYY(auditoria.fechaFin);

        // Mapear objetivos
        const objetivos: ObjetivoDto[] = (auditoria.objetivos || [])
          .filter(obj => obj.activo)
          .sort((a, b) => a.orden - b.orden)
          .map(obj => ({
            id: obj.id,
            descripcion: obj.descripcion,
          }));

        return {
          id: auditoria.id,
          codigo: auditoria.codigo,
          titulo: auditoria.nombre,
          descripcion: auditoria.descripcion,
          estado: auditoria.estadoKanban || this.mapFaseToEstadoKanban(auditoria.fase),
          riesgo: auditoria.riesgoKanban || 'Medio',
          semaforo: auditoria.semaforo || 'verde',
          territorial: auditoria.territorial,
          auditorLider,
          auditorAsignado,
          fechaInicio,
          fechaFin,
          progreso: auditoria.progreso,
          hallazgos: auditoria.hallazgos,
          diasRestantes: auditoria.diasRestantes || this.calcularDiasRestantes(auditoria.fechaFin),
          porcentajeTiempo: auditoria.porcentajeTiempo || this.calcularPorcentajeTiempo(auditoria.fechaInicio, auditoria.fechaFin),
          ultimaActuacion: auditoria.ultimaActuacion,
          objetivos,
          calificacionRiesgo: auditoria.calificacionRiesgo,
          documentos: auditoria.totalDocumentos,
          informes: auditoria.totalInformes,
          tareas: auditoria.totalTareas,
          tipo: auditoria.tipo || 'Gestión',
          tipoKanban: auditoria.tipoKanban || 'regular',
          prioridad: auditoria.prioridadKanban || 'media',
          areaObjetivo: auditoria.areaObjetivo,
          permiteCambiarObjetivos: auditoria.permiteCambiarObjetivos,
          equipoAuditores: equipoNombres,
          territorialInfo: auditoria.territorialInfo ? {
            nombre: auditoria.territorialInfo.nombre,
            ciudad: auditoria.territorialInfo.ciudad,
            departamento: auditoria.territorialInfo.departamento,
          } : undefined,
          especial: auditoria.especialInfo ? {
            tipoMotivo: auditoria.especialInfo.tipoMotivo,
            solicitante: auditoria.especialInfo.solicitante,
            justificacion: auditoria.especialInfo.justificacion,
          } : undefined,
          actividadesCompletas: auditoria.actividadesCompletas,
          actividadesPendientes: auditoria.actividadesPendientes,
          alcance: auditoria.alcance || '',
        };
      })
    );

    return auditoriasConPersonas;
  }

  /**
   * Helper: Obtiene iniciales de un nombre
   */
  private getIniciales(nombre: string): string {
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  /**
   * Helper: Formatea fecha a DD/MM/YYYY
   */
  private formatDateDDMMYYYY(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Helper: Mapea fase a estado Kanban
   */
  private mapFaseToEstadoKanban(fase: FaseAuditoria): string {
    const mapping = {
      [FaseAuditoria.PLANEACION]: 'Planeación',
      [FaseAuditoria.EN_CURSO]: 'Ejecución',
      [FaseAuditoria.REVISION]: 'Comunicación',
      [FaseAuditoria.COMPLETADA]: 'Finalizada',
    };
    return mapping[fase] || 'Planeación';
  }

  /**
   * Helper: Calcula días restantes
   */
  private calcularDiasRestantes(fechaFin: Date | string): number {
    const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  /**
   * Helper: Calcula porcentaje de tiempo transcurrido
   */
  private calcularPorcentajeTiempo(fechaInicio: Date | string, fechaFin: Date | string): number {
    const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
    const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
    const hoy = new Date();
    
    const total = fin.getTime() - inicio.getTime();
    const transcurrido = hoy.getTime() - inicio.getTime();
    
    if (total <= 0) return 100;
    const porcentaje = Math.round((transcurrido / total) * 100);
    return Math.max(0, Math.min(100, porcentaje));
  }

  // ============ MÉTODOS PARA NOTAS ============

  /**
   * Obtiene todas las notas de una auditoría
   */
  async getNotasByAuditoria(auditoriaId: string): Promise<NotaAuditoria[]> {
    // Verificar que la auditoría existe
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    const notas = await this.notaRepository.find({
      where: {
        auditoriaId,
        activo: true,
      },
      order: {
        fecha: 'DESC',
        hora: 'DESC',
        createdAt: 'DESC',
      },
    });

    // Obtener información de los autores desde auth.personas
    const notasConAutores = await Promise.all(
      notas.map(async (nota) => {
        let autorNombre = 'Usuario Desconocido';
        let autorCargo = 'N/A';

        if (nota.autorId) {
          const autor = await this.auditoriaRepository.query(
            `SELECT nom_largo, sig_tercero FROM auth.personas WHERE id_tercero = $1`,
            [nota.autorId]
          );
          if (autor && autor.length > 0) {
            autorNombre = autor[0].nom_largo || 'Usuario Desconocido';
            autorCargo = 'Auditor'; // TODO: Obtener desde auditor_perfil
          }
        }

        return {
          ...nota,
          autorNombre,
          autorCargo,
        };
      })
    );

    return notasConAutores as any;
  }

  /**
   * Crea una nueva nota para una auditoría
   */
  async createNota(auditoriaId: string, createDto: CreateNotaDto, autorId?: number): Promise<NotaAuditoria> {
    // Verificar que la auditoría existe
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const nota = this.notaRepository.create({
      auditoriaId,
      contenido: createDto.contenido,
      categoria: createDto.categoria,
      importante: createDto.importante || false,
      autorId: autorId || createDto.autorId || 1, // TODO: Obtener del contexto de autenticación
      fecha: new Date(fecha),
      hora,
      editada: false,
      activo: true,
    });

    const saved = await this.notaRepository.save(nota);

    // Obtener información del autor
    let autorNombre = 'Usuario Desconocido';
    let autorCargo = 'N/A';
    if (saved.autorId) {
      const autor = await this.auditoriaRepository.query(
        `SELECT nom_largo, sig_tercero FROM auth.personas WHERE id_tercero = $1`,
        [saved.autorId]
      );
      if (autor && autor.length > 0) {
        autorNombre = autor[0].nom_largo || 'Usuario Desconocido';
        autorCargo = 'Auditor'; // TODO: Obtener desde auditor_perfil
      }
    }

    return {
      ...saved,
      autorNombre,
      autorCargo,
    } as any;
  }

  /**
   * Actualiza una nota existente
   */
  async updateNota(auditoriaId: string, notaId: string, updateDto: UpdateNotaDto, editorId?: number): Promise<NotaAuditoria> {
    const nota = await this.notaRepository.findOne({
      where: {
        id: notaId,
        auditoriaId,
        activo: true,
      },
    });

    if (!nota) {
      throw new NotFoundException(`Nota con ID ${notaId} no encontrada para la auditoría ${auditoriaId}`);
    }

    if (updateDto.contenido !== undefined) {
      nota.contenido = updateDto.contenido;
    }
    if (updateDto.categoria !== undefined) {
      nota.categoria = updateDto.categoria;
    }
    if (updateDto.importante !== undefined) {
      nota.importante = updateDto.importante;
    }

    // Si se actualiza el contenido, marcar como editada
    if (updateDto.contenido !== undefined && updateDto.contenido !== nota.contenido) {
      nota.editada = true;
      nota.fechaEdicion = new Date();
      nota.editorId = editorId || nota.autorId; // TODO: Obtener del contexto de autenticación
    }

    const saved = await this.notaRepository.save(nota);

    // Obtener información del autor
    let autorNombre = 'Usuario Desconocido';
    let autorCargo = 'N/A';
    if (saved.autorId) {
      const autor = await this.auditoriaRepository.query(
        `SELECT nom_largo, sig_tercero FROM auth.personas WHERE id_tercero = $1`,
        [saved.autorId]
      );
      if (autor && autor.length > 0) {
        autorNombre = autor[0].nom_largo || 'Usuario Desconocido';
        autorCargo = 'Auditor'; // TODO: Obtener desde auditor_perfil
      }
    }

    return {
      ...saved,
      autorNombre,
      autorCargo,
    } as any;
  }

  /**
   * Elimina una nota (soft delete)
   */
  async deleteNota(auditoriaId: string, notaId: string): Promise<void> {
    const nota = await this.notaRepository.findOne({
      where: {
        id: notaId,
        auditoriaId,
        activo: true,
      },
    });

    if (!nota) {
      throw new NotFoundException(`Nota con ID ${notaId} no encontrada para la auditoría ${auditoriaId}`);
    }

    nota.activo = false;
    await this.notaRepository.save(nota);
  }

  /**
   * Marca o desmarca una nota como importante
   */
  async toggleImportanteNota(auditoriaId: string, notaId: string): Promise<NotaAuditoria> {
    const nota = await this.notaRepository.findOne({
      where: {
        id: notaId,
        auditoriaId,
        activo: true,
      },
    });

    if (!nota) {
      throw new NotFoundException(`Nota con ID ${notaId} no encontrada para la auditoría ${auditoriaId}`);
    }

    nota.importante = !nota.importante;
    const saved = await this.notaRepository.save(nota);

    // Obtener información del autor
    let autorNombre = 'Usuario Desconocido';
    let autorCargo = 'N/A';
    if (saved.autorId) {
      const autor = await this.auditoriaRepository.query(
        `SELECT nom_largo, sig_tercero FROM auth.personas WHERE id_tercero = $1`,
        [saved.autorId]
      );
      if (autor && autor.length > 0) {
        autorNombre = autor[0].nom_largo || 'Usuario Desconocido';
        autorCargo = 'Auditor'; // TODO: Obtener desde auditor_perfil
      }
    }

    return {
      ...saved,
      autorNombre,
      autorCargo,
    } as any;
  }

  /**
   * Aprueba una auditoría y registra el evento en el historial
   */
  async aprobarAuditoria(
    auditoriaId: string,
    comentarios?: string,
    usuarioId?: number,
  ): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // Determinar el nuevo estado según el estado actual
    const estadoAnterior = auditoria.estadoKanban;
    let estadoNuevo: EstadoKanban | undefined = estadoAnterior;

    // Si está en Comunicación, avanza a Seguimiento
    if (estadoAnterior === EstadoKanban.COMUNICACION) {
      estadoNuevo = EstadoKanban.SEGUIMIENTO;
      auditoria.estadoKanban = EstadoKanban.SEGUIMIENTO;
    }
    // Si está en Seguimiento, avanza a Finalizada
    else if (estadoAnterior === EstadoKanban.SEGUIMIENTO) {
      estadoNuevo = EstadoKanban.FINALIZADA;
      auditoria.estadoKanban = EstadoKanban.FINALIZADA;
      auditoria.progreso = 100; // Marcar como completada
    }

    // Guardar cambios en la auditoría
    await this.auditoriaRepository.save(auditoria);

    // Registrar en el historial
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const historial = new HistorialAuditoria();
    historial.auditoriaId = auditoriaId;
    historial.tipoEvento = TipoEvento.APROBACION;
    historial.fecha = new Date(fecha);
    historial.hora = hora;
    historial.usuarioId = usuarioId || 1; // TODO: Obtener del contexto de autenticación
    historial.accion = 'Aprobación de auditoría';
    historial.descripcion = `Auditoría ${auditoria.codigo} aprobada${estadoNuevo !== estadoAnterior ? ` y avanzada a ${estadoNuevo}` : ''}`;
    historial.observaciones = comentarios || undefined;
    historial.estadoAnterior = estadoAnterior || undefined;
    historial.estadoNuevo = estadoNuevo || undefined;

    await this.historialRepository.save(historial);

    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Rechaza una auditoría y registra el evento en el historial
   */
  async rechazarAuditoria(
    auditoriaId: string,
    justificacion: string,
    usuarioId?: number,
  ): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    if (!justificacion || justificacion.trim().length < 20) {
      throw new BadRequestException('La justificación debe tener al menos 20 caracteres');
    }

    // Registrar en el historial
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const historial = new HistorialAuditoria();
    historial.auditoriaId = auditoriaId;
    historial.tipoEvento = TipoEvento.ACTUALIZACION; // Usamos actualizacion para rechazo
    historial.fecha = new Date(fecha);
    historial.hora = hora;
    historial.usuarioId = usuarioId || 1; // TODO: Obtener del contexto de autenticación
    historial.accion = 'Rechazo de auditoría';
    historial.descripcion = `Auditoría ${auditoria.codigo} rechazada`;
    historial.observaciones = justificacion;
    historial.estadoAnterior = auditoria.estadoKanban || undefined;
    historial.estadoNuevo = auditoria.estadoKanban || undefined;

    await this.historialRepository.save(historial);

    return auditoria;
  }

  /**
   * Solicita modificación de una auditoría y registra el evento en el historial
   */
  async solicitarModificacionAuditoria(
    auditoriaId: string,
    observaciones: string,
    usuarioId?: number,
  ): Promise<Auditoria> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    if (!observaciones || observaciones.trim().length < 20) {
      throw new BadRequestException('Las observaciones deben tener al menos 20 caracteres');
    }

    // Registrar en el historial
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const historial = new HistorialAuditoria();
    historial.auditoriaId = auditoriaId;
    historial.tipoEvento = TipoEvento.ACTUALIZACION;
    historial.fecha = new Date(fecha);
    historial.hora = hora;
    historial.usuarioId = usuarioId || 1; // TODO: Obtener del contexto de autenticación
    historial.accion = 'Solicitud de modificación';
    historial.descripcion = `Solicitud de modificación para auditoría ${auditoria.codigo}`;
    historial.observaciones = observaciones;
    historial.estadoAnterior = auditoria.estadoKanban || undefined;
    historial.estadoNuevo = auditoria.estadoKanban || undefined;

    await this.historialRepository.save(historial);

    return auditoria;
  }
}












