import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, ILike, DataSource } from 'typeorm';
import { Auditoria, TipoAuditoria, FaseAuditoria, PrioridadAuditoria, RiesgoKanban, EstadoKanban } from './entities/auditoria.entity';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { CreateNotaDto } from './dto/create-nota.dto';
import { UpdateNotaDto } from './dto/update-nota.dto';
import { SolicitarAmpliacionPlazoDto } from './dto/solicitar-ampliacion-plazo.dto';
import { AprobarAmpliacionPlazoDto } from './dto/aprobar-ampliacion-plazo.dto';
import { RechazarAmpliacionPlazoDto } from './dto/rechazar-ampliacion-plazo.dto';
import { ObjetivoAuditoria } from './entities/objetivo-auditoria.entity';
import { EquipoAuditor } from './entities/equipo-auditor.entity';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import { HistorialAuditoria, TipoEvento } from './entities/historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from './entities/auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from './entities/auditoria-especial-info.entity';
import { CriterioAuditoria } from './entities/criterio-auditoria.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { AuditoriaKanbanDto, PersonaDto, ObjetivoDto } from './dto/auditoria-kanban.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

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
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly dataSource: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Valida si un string es un UUID válido
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Parsea una fecha string (YYYY-MM-DD) o Date a Date sin conversión de zona horaria
   * Esto evita que las fechas se desplacen por diferencias de zona horaria
   */
  private parseDateOnly(dateInput: string | Date): Date {
    // Si ya es un Date, retornarlo directamente
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      // Crear fecha en hora local (no UTC) para evitar desplazamientos
      return new Date(year, month, day);
    }
    // Fallback: usar new Date normal si el formato no es el esperado
    return new Date(dateInput);
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
   * Obtiene el id_tercero (bigint) desde el UUID del usuario
   * El UUID está en auth.user.id_user y la referencia directa está en auth.user.id_tercero
   */
  private async getUserIdTerceroFromUUID(userUUID: string): Promise<number | null> {
    try {
      // auth.user tiene el UUID (columna 'id_user') e 'id_tercero' que referencia a auth.personas.id_tercero
      const result = await this.dataSource.query(
        'SELECT id_tercero FROM auth."user" WHERE id_user = $1',
        [userUUID]
      );
      
      if (result && result.length > 0) {
        return Number(result[0].id_tercero);
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener id_tercero desde UUID:', error);
      return null;
    }
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
    const serialized: any = {
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

    // Los IDs son números (BIGINT) que referencian auth.personas.id_tercero
    if (auditoria.auditorLiderId !== null && auditoria.auditorLiderId !== undefined) {
      serialized.auditorLiderId = Number(auditoria.auditorLiderId);
    }
    if (auditoria.auditorAsignadoId !== null && auditoria.auditorAsignadoId !== undefined) {
      serialized.auditorAsignadoId = Number(auditoria.auditorAsignadoId);
    }
    if (auditoria.supervisorAsignadoId !== null && auditoria.supervisorAsignadoId !== undefined) {
      serialized.supervisorAsignadoId = Number(auditoria.supervisorAsignadoId);
    }

    // Serializar objetivos, criterios y equipoAuditores con IDs numéricos
    if (auditoria.objetivos && Array.isArray(auditoria.objetivos)) {
      serialized.objetivos = auditoria.objetivos.map(obj => ({
        ...obj,
        id: Number(obj.id),
      }));
    }

    if (auditoria.criterios && Array.isArray(auditoria.criterios)) {
      serialized.criterios = auditoria.criterios.map(crit => ({
        ...crit,
        id: Number(crit.id),
      }));
    }

    if (auditoria.equipoAuditores && Array.isArray(auditoria.equipoAuditores)) {
      serialized.equipoAuditores = auditoria.equipoAuditores.map(eq => ({
        ...eq,
        id: Number(eq.id),
        personaId: Number(eq.personaId),
      }));
    }

    return serialized;
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

    const auditoriaData: any = {
      nombre: createDto.nombre,
      tipo: createDto.tipo,
      territorial: createDto.territorial,
      sede: createDto.sede,
      responsable: createDto.responsable,
      codigo,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      fase: createDto.fase || FaseAuditoria.PLANEACION,
      prioridad: createDto.prioridad || PrioridadAuditoria.MEDIA,
      progreso: createDto.progreso ?? 0,
      hallazgos: 0,
      activa: true, // CRÍTICO: Asegurar que la auditoría esté activa para que aparezca en el Kanban
    };

    // Incluir campos opcionales si tienen valor
    if (createDto.descripcion) auditoriaData.descripcion = createDto.descripcion;
    if (createDto.areaObjetivo) auditoriaData.areaObjetivo = createDto.areaObjetivo;
    if (createDto.procesoAuditado) auditoriaData.procesoAuditado = createDto.procesoAuditado;
    if (createDto.alcance) auditoriaData.alcance = createDto.alcance;
    // Metodología se puede guardar en observaciones si no hay un campo específico
    if (createDto.metodologia) {
      // Si ya hay observaciones, concatenar metodología
      if (createDto.observacionesAdicionales) {
        auditoriaData.observacionesAdicionales = `${createDto.observacionesAdicionales}\n\nMetodología:\n${createDto.metodologia}`;
      } else {
        auditoriaData.observacionesAdicionales = `Metodología:\n${createDto.metodologia}`;
      }
    } else if (createDto.observacionesAdicionales) {
      auditoriaData.observacionesAdicionales = createDto.observacionesAdicionales;
    }
    if (createDto.nivelRiesgo) auditoriaData.calificacionRiesgo = createDto.nivelRiesgo;
    if (createDto.calificacionRiesgo) auditoriaData.calificacionRiesgo = createDto.calificacionRiesgo;
    // Asignar IDs de auditores (son números BIGINT que referencian auth.personas.id_tercero)
    console.log('[AuditoriasService.create] IDs recibidos:', {
      auditorLiderId: createDto.auditorLiderId,
      auditorAsignadoId: createDto.auditorAsignadoId,
      supervisorAsignadoId: createDto.supervisorAsignadoId
    });
    if (createDto.auditorLiderId !== undefined && createDto.auditorLiderId !== null) {
      // Convertir a número si viene como string
      const auditorLiderIdNum = typeof createDto.auditorLiderId === 'string' 
        ? parseInt(createDto.auditorLiderId, 10) 
        : Number(createDto.auditorLiderId);
      if (!isNaN(auditorLiderIdNum) && auditorLiderIdNum > 0) {
        auditoriaData.auditorLiderId = auditorLiderIdNum;
        console.log('[AuditoriasService.create] auditorLiderId asignado:', auditorLiderIdNum);
      } else {
        console.warn('[AuditoriasService.create] auditorLiderId inválido:', createDto.auditorLiderId);
      }
    }
    if (createDto.auditorAsignadoId !== undefined && createDto.auditorAsignadoId !== null) {
      const auditorAsignadoIdNum = typeof createDto.auditorAsignadoId === 'string' 
        ? parseInt(createDto.auditorAsignadoId, 10) 
        : Number(createDto.auditorAsignadoId);
      if (!isNaN(auditorAsignadoIdNum) && auditorAsignadoIdNum > 0) {
        auditoriaData.auditorAsignadoId = auditorAsignadoIdNum;
        console.log('[AuditoriasService.create] auditorAsignadoId asignado:', auditorAsignadoIdNum);
      } else {
        console.warn('[AuditoriasService.create] auditorAsignadoId inválido:', createDto.auditorAsignadoId);
      }
    }
    if (createDto.supervisorAsignadoId !== undefined && createDto.supervisorAsignadoId !== null) {
      const supervisorAsignadoIdNum = typeof createDto.supervisorAsignadoId === 'string' 
        ? parseInt(createDto.supervisorAsignadoId, 10) 
        : Number(createDto.supervisorAsignadoId);
      if (!isNaN(supervisorAsignadoIdNum) && supervisorAsignadoIdNum > 0) {
        auditoriaData.supervisorAsignadoId = supervisorAsignadoIdNum;
        console.log('[AuditoriasService.create] supervisorAsignadoId asignado:', supervisorAsignadoIdNum);
      } else {
        console.warn('[AuditoriasService.create] supervisorAsignadoId inválido:', createDto.supervisorAsignadoId);
      }
    }
    console.log('[AuditoriasService.create] IDs finales en auditoriaData:', {
      auditorLiderId: auditoriaData.auditorLiderId,
      auditorAsignadoId: auditoriaData.auditorAsignadoId,
      supervisorAsignadoId: auditoriaData.supervisorAsignadoId
    });
    if (createDto.responsableAreaNombre) auditoriaData.responsableAreaNombre = createDto.responsableAreaNombre;
    if (createDto.responsableAreaCargo) auditoriaData.responsableAreaCargo = createDto.responsableAreaCargo;
    if (createDto.responsableAreaEmail) auditoriaData.responsableAreaEmail = createDto.responsableAreaEmail;
    if (createDto.observacionesAdicionales) auditoriaData.observacionesAdicionales = createDto.observacionesAdicionales;
    if (createDto.programaAnualMetadata) auditoriaData.programaAnualMetadata = createDto.programaAnualMetadata;

    const auditoria = this.auditoriaRepository.create(auditoriaData);

    const saved = await this.auditoriaRepository.save(auditoria);
    // Serializar fechas para evitar problemas de zona horaria
    // Asegurar que saved es un objeto, no un array
    const auditoriaGuardada = Array.isArray(saved) ? saved[0] : saved;

    // Guardar objetivos si se proporcionan
    if (createDto.objetivos && Array.isArray(createDto.objetivos) && createDto.objetivos.length > 0) {
      const objetivos = createDto.objetivos
        .filter(descripcion => descripcion && descripcion.trim().length > 0)
        .map((descripcion, index) => {
          return this.objetivoRepository.create({
            auditoriaId: auditoriaGuardada.id,
            descripcion: descripcion.trim(),
            orden: index + 1,
          });
        });

      if (objetivos.length > 0) {
        await this.objetivoRepository.save(objetivos);
      }
    }

    // Guardar criterios si se proporcionan
    if (createDto.criteriosAuditoria && Array.isArray(createDto.criteriosAuditoria) && createDto.criteriosAuditoria.length > 0) {
      const criterios = createDto.criteriosAuditoria
        .filter(criterio => criterio && criterio.trim().length > 0)
        .map((criterio, index) => {
          return this.criterioRepository.create({
            auditoriaId: auditoriaGuardada.id,
            criterio: criterio.trim(),
            orden: index + 1,
          });
        });

      if (criterios.length > 0) {
        await this.criterioRepository.save(criterios);
      }
    }

    // Guardar equipo de auditores si se proporciona
    if (createDto.equipoAuditores && Array.isArray(createDto.equipoAuditores) && createDto.equipoAuditores.length > 0) {
      const equipo = createDto.equipoAuditores
        .filter(personaId => personaId)
        .map((personaId) => {
          // Convertir string a number si es necesario
          let personaIdNum: number;
          if (typeof personaId === 'string') {
            // Si viene como "aud-001", extraer el número
            if (personaId.startsWith('aud-')) {
              personaIdNum = parseInt(personaId.replace('aud-', ''), 10);
            } else {
              // Si es solo un número como string, convertir directamente
              personaIdNum = parseInt(personaId, 10);
            }
          } else {
            personaIdNum = Number(personaId);
          }
          
          // Validar que sea un número válido
          if (isNaN(personaIdNum)) {
            throw new BadRequestException(`ID de persona inválido: ${personaId}`);
          }
          
          return this.equipoRepository.create({
            auditoriaId: auditoriaGuardada.id,
            personaId: personaIdNum,
            rol: 'Auditor',
            activo: true,
          });
        });

      if (equipo.length > 0) {
        await this.equipoRepository.save(equipo);
      }
    }

    // Recargar la auditoría con las relaciones
    const auditoriaCompleta = await this.auditoriaRepository.findOne({
      where: { id: auditoriaGuardada.id },
      relations: ['objetivos', 'criterios', 'equipoAuditores'],
    });

    return this.serializeAuditoria(auditoriaCompleta || auditoriaGuardada) as any;
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
    // Asignar IDs de auditores (son números BIGINT que referencian auth.personas.id_tercero)
    if (updateDto.auditorLiderId !== undefined) {
      if (updateDto.auditorLiderId !== null) {
        const auditorLiderIdNum = typeof updateDto.auditorLiderId === 'string' 
          ? parseInt(updateDto.auditorLiderId, 10) 
          : Number(updateDto.auditorLiderId);
        if (!isNaN(auditorLiderIdNum) && auditorLiderIdNum > 0) {
          auditoria.auditorLiderId = auditorLiderIdNum;
        } else {
          auditoria.auditorLiderId = null;
        }
      } else {
        auditoria.auditorLiderId = null;
      }
    }
    if (updateDto.auditorAsignadoId !== undefined) {
      if (updateDto.auditorAsignadoId !== null) {
        const auditorAsignadoIdNum = typeof updateDto.auditorAsignadoId === 'string' 
          ? parseInt(updateDto.auditorAsignadoId, 10) 
          : Number(updateDto.auditorAsignadoId);
        if (!isNaN(auditorAsignadoIdNum) && auditorAsignadoIdNum > 0) {
          auditoria.auditorAsignadoId = auditorAsignadoIdNum;
        } else {
          auditoria.auditorAsignadoId = null;
        }
      } else {
        auditoria.auditorAsignadoId = null;
      }
    }
    if (updateDto.supervisorAsignadoId !== undefined) {
      if (updateDto.supervisorAsignadoId !== null) {
        const supervisorAsignadoIdNum = typeof updateDto.supervisorAsignadoId === 'string' 
          ? parseInt(updateDto.supervisorAsignadoId, 10) 
          : Number(updateDto.supervisorAsignadoId);
        if (!isNaN(supervisorAsignadoIdNum) && supervisorAsignadoIdNum > 0) {
          auditoria.supervisorAsignadoId = supervisorAsignadoIdNum;
        } else {
          auditoria.supervisorAsignadoId = null;
        }
      } else {
        auditoria.supervisorAsignadoId = null;
      }
    }
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
    try {
      const auditorias = await this.auditoriaRepository.find({
        where: { activa: true },
        relations: ['objetivos', 'equipoAuditores', 'territorialInfo', 'especialInfo'],
        order: { createdAt: 'DESC' },
      });

      // Si no hay auditorías, retornar array vacío
      if (!auditorias || auditorias.length === 0) {
        return [];
      }

      // Obtener información de personas desde auth.personas usando query raw
      const auditoriasConPersonas = await Promise.all(
        auditorias.map(async (auditoria) => {
          try {
            // Obtener datos de personas desde auth.personas
            let auditorLider: PersonaDto | undefined;
            let auditorAsignado: PersonaDto | undefined;

            if (auditoria.auditorLiderId) {
              try {
                const lider = await this.auditoriaRepository.query(
                  `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
                   FROM auth.personas 
                   WHERE id_tercero = $1`,
                  [auditoria.auditorLiderId]
                );
                if (lider && lider.length > 0 && lider[0]) {
                  const p = lider[0];
                  const nombreCompleto = p.nom_largo || 'Usuario Desconocido';
                  const iniciales = p.sig_tercero || this.getIniciales(nombreCompleto);
                  auditorLider = {
                    nombre: nombreCompleto,
                    cargo: 'Auditor Líder',
                    iniciales,
                    tipoIdentificacion: (p.tip_identificacion || 'CC') as 'CC' | 'CE' | 'TI' | 'PA',
                    numeroIdentificacion: p.num_identificacion || '',
                  };
                }
              } catch (error) {
                console.error(`Error al obtener auditor líder ${auditoria.auditorLiderId}:`, error);
                // Continuar sin auditor líder si hay error
              }
            }

            if (auditoria.auditorAsignadoId) {
              try {
                const asignado = await this.auditoriaRepository.query(
                  `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
                   FROM auth.personas 
                   WHERE id_tercero = $1`,
                  [auditoria.auditorAsignadoId]
                );
                if (asignado && asignado.length > 0 && asignado[0]) {
                  const p = asignado[0];
                  const nombreCompleto = p.nom_largo || 'Usuario Desconocido';
                  const iniciales = p.sig_tercero || this.getIniciales(nombreCompleto);
                  auditorAsignado = {
                    nombre: nombreCompleto,
                    cargo: 'Auditor',
                    iniciales,
                    tipoIdentificacion: (p.tip_identificacion || 'CC') as 'CC' | 'CE' | 'TI' | 'PA',
                    numeroIdentificacion: p.num_identificacion || '',
                  };
                }
              } catch (error) {
                console.error(`Error al obtener auditor asignado ${auditoria.auditorAsignadoId}:`, error);
                // Continuar sin auditor asignado si hay error
              }
            }

            // Obtener nombres del equipo de auditores
            const equipoActivo = auditoria.equipoAuditores?.filter(e => e.activo) || [];
            
            // Si no hay auditorLider pero hay equipoAuditores, usar el primero como auditor líder
            if (!auditorLider && equipoActivo.length > 0) {
              try {
                const primerMiembro = equipoActivo[0];
                if (primerMiembro.personaId) {
                  const lider = await this.auditoriaRepository.query(
                    `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
                     FROM auth.personas 
                     WHERE id_tercero = $1`,
                    [primerMiembro.personaId]
                  );
                  if (lider && lider.length > 0 && lider[0]) {
                    const p = lider[0];
                    const nombreCompleto = p.nom_largo || 'Usuario Desconocido';
                    const iniciales = p.sig_tercero || this.getIniciales(nombreCompleto);
                    auditorLider = {
                      nombre: nombreCompleto,
                      cargo: 'Auditor Líder',
                      iniciales,
                      tipoIdentificacion: (p.tip_identificacion || 'CC') as 'CC' | 'CE' | 'TI' | 'PA',
                      numeroIdentificacion: p.num_identificacion || '',
                    };
                  }
                }
              } catch (error) {
                console.error(`Error al obtener auditor líder del equipo ${equipoActivo[0]?.personaId}:`, error);
                // Continuar sin auditor líder si hay error
              }
            }
            
            const equipoNombres = await Promise.all(
              equipoActivo.map(async (equipo) => {
                try {
                  if (!equipo.personaId) return 'N/A';
                  const persona = await this.auditoriaRepository.query(
                    `SELECT nom_largo FROM auth.personas WHERE id_tercero = $1`,
                    [equipo.personaId]
                  );
                  return persona && persona.length > 0 && persona[0]?.nom_largo 
                    ? persona[0].nom_largo 
                    : 'N/A';
                } catch (error) {
                  console.error(`Error al obtener persona del equipo ${equipo.personaId}:`, error);
                  return 'N/A';
                }
              })
            );

            // Formatear fechas a DD/MM/YYYY con validación
            const fechaInicio = auditoria.fechaInicio 
              ? this.formatDateDDMMYYYY(auditoria.fechaInicio)
              : '';
            const fechaFin = auditoria.fechaFin 
              ? this.formatDateDDMMYYYY(auditoria.fechaFin)
              : '';

            // Mapear objetivos con validación
            const objetivos: ObjetivoDto[] = (auditoria.objetivos || [])
              .filter(obj => obj && obj.activo)
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map(obj => ({
                id: obj.id,
                descripcion: obj.descripcion || '',
              }));

            return {
              id: auditoria.id,
              codigo: auditoria.codigo || '',
              titulo: auditoria.nombre || '',
              descripcion: auditoria.descripcion || '',
              estado: auditoria.estadoKanban || this.mapFaseToEstadoKanban(auditoria.fase),
              riesgo: auditoria.riesgoKanban || 'Medio',
              semaforo: auditoria.semaforo || 'verde',
              territorial: auditoria.territorial || '',
              auditorLider,
              auditorAsignado,
              fechaInicio,
              fechaFin,
              progreso: auditoria.progreso ?? 0,
              hallazgos: auditoria.hallazgos ?? 0,
              diasRestantes: auditoria.diasRestantes ?? (auditoria.fechaFin ? this.calcularDiasRestantes(auditoria.fechaFin) : 0),
              porcentajeTiempo: auditoria.porcentajeTiempo ?? (auditoria.fechaInicio && auditoria.fechaFin ? this.calcularPorcentajeTiempo(auditoria.fechaInicio, auditoria.fechaFin) : 0),
              ultimaActuacion: auditoria.ultimaActuacion,
              objetivos,
              calificacionRiesgo: auditoria.calificacionRiesgo,
              documentos: auditoria.totalDocumentos ?? 0,
              informes: auditoria.totalInformes ?? 0,
              tareas: auditoria.totalTareas ?? 0,
              tipo: auditoria.tipo || 'Gestión',
              tipoKanban: auditoria.tipoKanban || 'regular',
              prioridad: auditoria.prioridadKanban || 'media',
              areaObjetivo: auditoria.areaObjetivo,
              permiteCambiarObjetivos: auditoria.permiteCambiarObjetivos ?? true,
              equipoAuditores: equipoNombres,
              territorialInfo: auditoria.territorialInfo ? {
                nombre: auditoria.territorialInfo.nombre || '',
                ciudad: auditoria.territorialInfo.ciudad || '',
                departamento: auditoria.territorialInfo.departamento || '',
              } : undefined,
              especial: auditoria.especialInfo ? {
                tipoMotivo: auditoria.especialInfo.tipoMotivo || '',
                solicitante: auditoria.especialInfo.solicitante || '',
                justificacion: auditoria.especialInfo.justificacion || '',
              } : undefined,
              actividadesCompletas: auditoria.actividadesCompletas ?? false,
              actividadesPendientes: auditoria.actividadesPendientes ?? 0,
              alcance: auditoria.alcance || '',
              observacionesAdicionales: auditoria.observacionesAdicionales || '', // ✅ CAMPO AGREGADO
              programaAnualMetadata: auditoria.programaAnualMetadata || undefined, // Incluir metadata del programa anual
            };
          } catch (error) {
            console.error(`Error al procesar auditoría ${auditoria.id}:`, error);
            // Retornar un objeto básico en caso de error
            return {
              id: auditoria.id,
              codigo: auditoria.codigo || '',
              titulo: auditoria.nombre || 'Auditoría sin nombre',
              descripcion: auditoria.descripcion || '',
              estado: auditoria.estadoKanban || this.mapFaseToEstadoKanban(auditoria.fase),
              riesgo: auditoria.riesgoKanban || 'Medio',
              semaforo: auditoria.semaforo || 'verde',
              territorial: auditoria.territorial || '',
              auditorLider: undefined,
              auditorAsignado: undefined,
              fechaInicio: auditoria.fechaInicio ? this.formatDateDDMMYYYY(auditoria.fechaInicio) : '',
              fechaFin: auditoria.fechaFin ? this.formatDateDDMMYYYY(auditoria.fechaFin) : '',
              progreso: auditoria.progreso ?? 0,
              hallazgos: auditoria.hallazgos ?? 0,
              diasRestantes: 0,
              porcentajeTiempo: 0,
              ultimaActuacion: undefined,
              objetivos: [],
              calificacionRiesgo: undefined,
              documentos: 0,
              informes: 0,
              tareas: 0,
              tipo: auditoria.tipo || 'Gestión',
              tipoKanban: auditoria.tipoKanban || 'regular',
              prioridad: auditoria.prioridadKanban || 'media',
              areaObjetivo: undefined,
              permiteCambiarObjetivos: true,
              equipoAuditores: [],
              territorialInfo: undefined,
              especial: undefined,
              actividadesCompletas: false,
              actividadesPendientes: 0,
              alcance: '',
              observacionesAdicionales: auditoria.observacionesAdicionales || '', // ✅ CAMPO AGREGADO EN FALLBACK
            };
          }
        })
      );

      return auditoriasConPersonas;
    } catch (error) {
      console.error('Error en findAllKanban:', error);
      // Si hay un error crítico, retornar array vacío en lugar de lanzar excepción
      // Esto permite que el frontend muestre un estado vacío en lugar de un error
      return [];
    }
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
        
        // Si no hay auditorLider pero hay equipoAuditores, usar el primero como auditor líder
        if (!auditorLider && equipoActivo.length > 0) {
          try {
            const primerMiembro = equipoActivo[0];
            if (primerMiembro.personaId) {
              const lider = await this.auditoriaRepository.query(
                `SELECT nom_largo, sig_tercero, tip_identificacion, num_identificacion 
                 FROM auth.personas 
                 WHERE id_tercero = $1`,
                [primerMiembro.personaId]
              );
              if (lider && lider.length > 0 && lider[0]) {
                const p = lider[0];
                const nombreCompleto = p.nom_largo || 'Usuario Desconocido';
                const iniciales = p.sig_tercero || this.getIniciales(nombreCompleto);
                auditorLider = {
                  nombre: nombreCompleto,
                  cargo: 'Auditor Líder',
                  iniciales,
                  tipoIdentificacion: (p.tip_identificacion || 'CC') as 'CC' | 'CE' | 'TI' | 'PA',
                  numeroIdentificacion: p.num_identificacion || '',
                };
              }
            }
          } catch (error) {
            console.error(`Error al obtener auditor líder del equipo ${equipoActivo[0]?.personaId}:`, error);
            // Continuar sin auditor líder si hay error
          }
        }
        
        const equipoNombres = await Promise.all(
          equipoActivo.map(async (equipo) => {
            try {
              if (!equipo.personaId) return 'N/A';
              const persona = await this.auditoriaRepository.query(
                `SELECT nom_largo FROM auth.personas WHERE id_tercero = $1`,
                [equipo.personaId]
              );
              return persona && persona.length > 0 ? persona[0].nom_largo : 'N/A';
            } catch (error) {
              console.error(`Error al obtener persona del equipo ${equipo.personaId}:`, error);
              return 'N/A';
            }
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
    if (!date) return '';
    
    // Si es string en formato YYYY-MM-DD, parsearlo directamente sin timezone
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Si es Date o string en otro formato
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

  /**
   * Calcula dinámicamente los contadores de documentos e informes para una auditoría
   */
  private async calcularContadoresDocumentos(auditoriaId: string): Promise<{ documentos: number; informes: number }> {
    try {
      // Contar documentos totales (solo versiones originales, no versiones anteriores)
      const totalDocumentos = await this.documentoRepository
        .createQueryBuilder('documento')
        .where('documento.auditoriaId = :auditoriaId', { auditoriaId })
        .andWhere('documento.versionAnteriorId IS NULL')
        .getCount();

      // Contar informes totales (solo versiones originales)
      const totalInformes = await this.documentoRepository
        .createQueryBuilder('documento')
        .where('documento.auditoriaId = :auditoriaId', { auditoriaId })
        .andWhere('documento.versionAnteriorId IS NULL')
        .andWhere('documento.tipoDocumento IN (:...tipos)', {
          tipos: ['informe_preliminar', 'informe_final', 'informe_ejecutivo'],
        })
        .getCount();

      return {
        documentos: totalDocumentos,
        informes: totalInformes,
      };
    } catch (error) {
      console.error(`Error al calcular contadores para auditoría ${auditoriaId}:`, error);
      return { documentos: 0, informes: 0 };
    }
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

  /**
   * Solicita ampliación de plazo de una auditoría en curso
   * Valida que no exceda 1 año desde fecha inicio
   * Envía solicitud al Jefe OCI para aprobación
   * Registra justificación, usuario, fecha en historial
   * RN-031.2: Solo pueden solicitar auditores con rol "Auditor Líder" asignado a esa auditoría
   */
  async solicitarAmpliacionPlazo(
    auditoriaId: string,
    solicitarDto: SolicitarAmpliacionPlazoDto,
    usuarioIdOrUUID?: number | string,
    userRoles?: string[],
  ): Promise<Auditoria> {
    // Convertir UUID a id_tercero si es necesario
    let usuarioIdTercero: number | null = null;
    
    if (typeof usuarioIdOrUUID === 'string') {
      // Es un UUID, convertir a id_tercero
      usuarioIdTercero = await this.getUserIdTerceroFromUUID(usuarioIdOrUUID);
      if (!usuarioIdTercero) {
        throw new NotFoundException(`Usuario con UUID ${usuarioIdOrUUID} no encontrado en auth.personas`);
      }
    } else if (typeof usuarioIdOrUUID === 'number') {
      // Ya es un id_tercero
      usuarioIdTercero = usuarioIdOrUUID;
    } else {
      usuarioIdTercero = 1; // Fallback
    }
    
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // RN-031.2: Validar que el usuario tenga rol AUDITOR_LIDER, ADMIN o SUPER_ADMIN
    // Los roles pueden venir como strings o como objetos con propiedad 'code'
    const extractRoleCodes = (roles?: any[]): string[] => {
      if (!roles) return [];
      return roles.map(r => typeof r === 'string' ? r : r?.code).filter(Boolean);
    };
    
    const roleCodes = extractRoleCodes(userRoles);
    const esAuditorLider = roleCodes.includes('AUDITOR_LIDER');
    const esAdmin = roleCodes.includes('ADMIN');
    const esSuperAdmin = roleCodes.includes('SUPER_ADMIN');
    
    // SUPER_ADMIN y ADMIN tienen acceso total sin restricciones
    if (!esSuperAdmin && !esAdmin) {
      if (!esAuditorLider) {
        throw new ForbiddenException('Solo los usuarios con rol "Auditor Líder", "Administrador" o "Super Administrador" pueden solicitar ampliación de plazo');
      }
      
      // Verificar que el auditor líder esté asignado a esta auditoría
      if (auditoria.auditorLiderId !== usuarioIdTercero) {
        throw new ForbiddenException('Solo el Auditor Líder asignado a esta auditoría puede solicitar ampliación de plazo');
      }
    }

    // Validar que la auditoría esté en curso
    // Puede estar en curso según fase O según estadoKanban (para compatibilidad con Kanban)
    const estaEnCurso = 
      auditoria.fase === FaseAuditoria.EN_CURSO || 
      auditoria.estadoKanban === EstadoKanban.EJECUCION;
    
    if (!estaEnCurso) {
      throw new BadRequestException('Solo se pueden solicitar ampliaciones de plazo para auditorías en curso');
    }

    // Parsear fechas
    const nuevaFechaFin = this.parseDateOnly(solicitarDto.nuevaFechaFin);
    const fechaInicio = this.parseDateOnly(auditoria.fechaInicio);
    const fechaFinActual = this.parseDateOnly(auditoria.fechaFin);

    // Validar que la nueva fecha sea posterior a la actual
    if (nuevaFechaFin <= fechaFinActual) {
      throw new BadRequestException('La nueva fecha de finalización debe ser posterior a la fecha actual');
    }

    // Validar que no exceda 1 año (365 días) desde fecha inicio
    const diferenciaDias = Math.floor((nuevaFechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    if (diferenciaDias > 365) {
      throw new BadRequestException('El plazo ampliado no puede exceder 1 año desde la fecha de inicio');
    }

    // Validar que no haya una solicitud pendiente
    const solicitudPendiente = await this.historialRepository.findOne({
      where: {
        auditoriaId,
        tipoEvento: TipoEvento.AMPLIACION_PLAZO,
      },
      order: { createdAt: 'DESC' },
    });

    if (solicitudPendiente) {
      // Verificar si la solicitud está pendiente (en observaciones se guarda el estado)
      const estadoMatch = solicitudPendiente.observaciones?.match(/ESTADO:([^|]+)/);
      const estadoSolicitud = estadoMatch ? estadoMatch[1] : '';
      if (estadoSolicitud === 'pendiente') {
        throw new BadRequestException('Ya existe una solicitud de ampliación de plazo pendiente para esta auditoría');
      }
    }

    // Registrar en el historial como solicitud pendiente
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const historial = new HistorialAuditoria();
    historial.auditoriaId = auditoriaId;
    historial.tipoEvento = TipoEvento.AMPLIACION_PLAZO;
    historial.fecha = new Date(fecha);
    historial.hora = hora;
    historial.usuarioId = usuarioIdTercero || 1;
    historial.accion = 'Solicitud de ampliación de plazo';
    historial.descripcion = `Solicitud de ampliación de plazo para auditoría ${auditoria.codigo}`;
    // Guardar estado y justificación en observaciones: "ESTADO:pendiente|JUSTIFICACION:..."
    // Usar formato estructurado para facilitar el parseo
    historial.observaciones = `ESTADO:pendiente|JUSTIFICACION:${solicitarDto.justificacion}`;
    historial.estadoAnterior = auditoria.estadoKanban || undefined;
    historial.estadoNuevo = auditoria.estadoKanban || undefined;
    
    // Guardar cambios en formato JSONB
    historial.cambios = [{
      campo: 'fechaFin',
      valorAnterior: this.serializeDate(auditoria.fechaFin),
      valorNuevo: this.serializeDate(nuevaFechaFin),
    }];

    // Save historial
    try {
      // Skip constraint validation - TypeORM will handle it
    } catch (err: any) {
      // Skip validation errors - continue with save
    }

    await this.historialRepository.save(historial);

    // Enviar notificación a Jefes de Control Interno
    try {
      await this.notificacionesService.notificarSolicitudAmpliacionPlazo(
        auditoriaId,
        auditoria.codigo,
        auditoria.nombre,
        `Usuario ${usuarioIdTercero}`,
        solicitarDto.justificacion,
      );
    } catch (error) {
      console.error('Error al enviar notificación de solicitud de ampliación:', error);
      // No fallar la operación por error en notificación
    }

    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Aprueba una solicitud de ampliación de plazo
   * Actualiza la fecha fin de la auditoría
   * Notifica al área auditada
   * Registra en historial
   * RN-031.3: Solo roles "Administrador" o "Jefe de Control Interno" pueden aprobar
   */
  async aprobarAmpliacionPlazo(
    auditoriaId: string,
    aprobarDto: AprobarAmpliacionPlazoDto,
    usuarioIdOrUUID?: number | string,
    userRoles?: string[],
  ): Promise<Auditoria> {
    // Convertir UUID a id_tercero numérico si es necesario
    let usuarioIdTercero: number;
    if (typeof usuarioIdOrUUID === 'string') {
      // Es un UUID, buscar el id_tercero usando el método existente
      const idTercero = await this.getUserIdTerceroFromUUID(usuarioIdOrUUID);
      
      if (idTercero) {
        usuarioIdTercero = idTercero;
      } else {
        console.warn(`Usuario con UUID ${usuarioIdOrUUID} no encontrado, usando fallback`);
        usuarioIdTercero = 1; // Fallback
      }
    } else if (typeof usuarioIdOrUUID === 'number') {
      // Ya es un id_tercero
      usuarioIdTercero = usuarioIdOrUUID;
    } else {
      usuarioIdTercero = 1; // Fallback
    }
    
    // RN-031.3: Validar que el usuario tenga rol SUPER_ADMIN o JEFE_CONTROL_INTERNO
    // Los roles pueden venir como strings o como objetos con propiedad 'code'
    const extractRoleCodes = (roles?: any[]): string[] => {
      if (!roles) return [];
      return roles.map(r => typeof r === 'string' ? r : r?.code).filter(Boolean);
    };
    
    const roleCodes = extractRoleCodes(userRoles);
    const puedeAprobar = roleCodes.includes('SUPER_ADMIN') || roleCodes.includes('JEFE_CONTROL_INTERNO');
    
    if (!puedeAprobar) {
      throw new ForbiddenException('Solo el Jefe de Control Interno o Administradores pueden aprobar ampliaciones de plazo');
    }

    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // Buscar la solicitud pendiente más reciente
    const solicitudPendiente = await this.historialRepository.findOne({
      where: {
        auditoriaId,
        tipoEvento: TipoEvento.AMPLIACION_PLAZO,
      },
      order: { createdAt: 'DESC' },
    });

    if (!solicitudPendiente) {
      throw new NotFoundException('No se encontró una solicitud de ampliación de plazo pendiente para esta auditoría');
    }

    // Verificar que esté pendiente
    const estadoMatch = solicitudPendiente.observaciones?.match(/ESTADO:([^|]+)/);
    const estadoSolicitud = estadoMatch ? estadoMatch[1] : '';
    if (estadoSolicitud !== 'pendiente') {
      throw new BadRequestException('La solicitud de ampliación ya fue procesada');
    }

    // Obtener la nueva fecha fin de los cambios
    const cambioFechaFin = solicitudPendiente.cambios?.find(c => c.campo === 'fechaFin');
    if (!cambioFechaFin) {
      throw new BadRequestException('No se encontró información de la nueva fecha en la solicitud');
    }

    const nuevaFechaFin = this.parseDateOnly(cambioFechaFin.valorNuevo);
    const fechaFinAnterior = auditoria.fechaFin;

    // Actualizar la fecha fin de la auditoría
    auditoria.fechaFin = nuevaFechaFin;

    // Guardar cambios
    await this.auditoriaRepository.save(auditoria);

    // Actualizar el registro de solicitud pendiente a aprobada
    solicitudPendiente.observaciones = solicitudPendiente.observaciones?.replace(
      /ESTADO:pendiente/,
      'ESTADO:aprobada'
    );
    await this.historialRepository.save(solicitudPendiente);

    // Actualizar el historial de la solicitud a aprobada
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    // Crear nuevo registro de historial para la aprobación
    const historialAprobacion = new HistorialAuditoria();
    historialAprobacion.auditoriaId = auditoriaId;
    historialAprobacion.tipoEvento = TipoEvento.AMPLIACION_PLAZO;
    historialAprobacion.fecha = new Date(fecha);
    historialAprobacion.hora = hora;
    historialAprobacion.usuarioId = usuarioIdTercero;
    historialAprobacion.accion = 'Aprobación de ampliación de plazo';
    historialAprobacion.descripcion = `Ampliación de plazo aprobada para auditoría ${auditoria.codigo}`;
    historialAprobacion.observaciones = `ESTADO:aprobada${aprobarDto.comentarios ? `|COMENTARIOS:${aprobarDto.comentarios}` : ''}`;
    historialAprobacion.estadoAnterior = auditoria.estadoKanban || undefined;
    historialAprobacion.estadoNuevo = auditoria.estadoKanban || undefined;
    historialAprobacion.cambios = [{
      campo: 'fechaFin',
      valorAnterior: this.serializeDate(fechaFinAnterior),
      valorNuevo: this.serializeDate(nuevaFechaFin),
    }];

    await this.historialRepository.save(historialAprobacion);

    // Notificar al auditor líder y área auditada
    try {
      if (auditoria.auditorLiderId) {
        await this.notificacionesService.notificarAmpliacionAprobada(
          auditoriaId,
          auditoria.codigo,
          auditoria.nombre,
          auditoria.auditorLiderId,
          this.serializeDate(nuevaFechaFin),
          aprobarDto.comentarios,
        );
      }
    } catch (error) {
      console.error('Error al enviar notificación de aprobación:', error);
      // No fallar la operación por error en notificación
    }

    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Rechaza una solicitud de ampliación de plazo
   * Registra justificación en historial
   * RN-031.3: Solo roles "Administrador" o "Jefe de Control Interno" pueden rechazar
   */
  async rechazarAmpliacionPlazo(
    auditoriaId: string,
    rechazarDto: RechazarAmpliacionPlazoDto,
    usuarioIdOrUUID?: number | string,
    userRoles?: string[],
  ): Promise<Auditoria> {
    // Convertir UUID a id_tercero numérico si es necesario
    let usuarioIdTercero: number;
    if (typeof usuarioIdOrUUID === 'string') {
      // Es un UUID, buscar el id_tercero usando el método existente
      const idTercero = await this.getUserIdTerceroFromUUID(usuarioIdOrUUID);
      
      if (idTercero) {
        usuarioIdTercero = idTercero;
      } else {
        console.warn(`Usuario con UUID ${usuarioIdOrUUID} no encontrado, usando fallback`);
        usuarioIdTercero = 1; // Fallback
      }
    } else if (typeof usuarioIdOrUUID === 'number') {
      // Ya es un id_tercero
      usuarioIdTercero = usuarioIdOrUUID;
    } else {
      usuarioIdTercero = 1; // Fallback
    }
    
    // RN-031.3: Validar que el usuario tenga rol SUPER_ADMIN o JEFE_CONTROL_INTERNO
    // Los roles pueden venir como strings o como objetos con propiedad 'code'
    const extractRoleCodes = (roles?: any[]): string[] => {
      if (!roles) return [];
      return roles.map(r => typeof r === 'string' ? r : r?.code).filter(Boolean);
    };
    
    const roleCodes = extractRoleCodes(userRoles);
    const puedeRechazar = roleCodes.includes('SUPER_ADMIN') || roleCodes.includes('JEFE_CONTROL_INTERNO');
    
    if (!puedeRechazar) {
      throw new ForbiddenException('Solo el Jefe de Control Interno o Administradores pueden rechazar ampliaciones de plazo');
    }

    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // Buscar la solicitud pendiente más reciente
    const solicitudPendiente = await this.historialRepository.findOne({
      where: {
        auditoriaId,
        tipoEvento: TipoEvento.AMPLIACION_PLAZO,
      },
      order: { createdAt: 'DESC' },
    });

    if (!solicitudPendiente) {
      throw new NotFoundException('No se encontró una solicitud de ampliación de plazo pendiente para esta auditoría');
    }

    // Verificar que esté pendiente
    const estadoMatch = solicitudPendiente.observaciones?.match(/ESTADO:([^|]+)/);
    const estadoSolicitud = estadoMatch ? estadoMatch[1] : '';
    if (estadoSolicitud !== 'pendiente') {
      throw new BadRequestException('La solicitud de ampliación ya fue procesada');
    }

    // Actualizar el registro de solicitud pendiente a rechazada
    solicitudPendiente.observaciones = solicitudPendiente.observaciones?.replace(
      /ESTADO:pendiente/,
      'ESTADO:rechazada'
    );
    await this.historialRepository.save(solicitudPendiente);

    // Registrar rechazo en historial
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    const historialRechazo = new HistorialAuditoria();
    historialRechazo.auditoriaId = auditoriaId;
    historialRechazo.tipoEvento = TipoEvento.AMPLIACION_PLAZO;
    historialRechazo.fecha = new Date(fecha);
    historialRechazo.hora = hora;
    historialRechazo.usuarioId = usuarioIdTercero;
    historialRechazo.accion = 'Rechazo de ampliación de plazo';
    historialRechazo.descripcion = `Ampliación de plazo rechazada para auditoría ${auditoria.codigo}`;
    historialRechazo.observaciones = `ESTADO:rechazada|JUSTIFICACION:${rechazarDto.justificacion}`;
    historialRechazo.estadoAnterior = auditoria.estadoKanban || undefined;
    historialRechazo.estadoNuevo = auditoria.estadoKanban || undefined;
    historialRechazo.cambios = solicitudPendiente.cambios || [];

    await this.historialRepository.save(historialRechazo);

    // Notificar al auditor líder del rechazo
    try {
      if (auditoria.auditorLiderId) {
        await this.notificacionesService.notificarAmpliacionRechazada(
          auditoriaId,
          auditoria.codigo,
          auditoria.nombre,
          auditoria.auditorLiderId,
          rechazarDto.justificacion,
        );
      }
    } catch (error) {
      console.error('Error al enviar notificación de rechazo:', error);
      // No fallar la operación por error en notificación
    }

    return this.serializeAuditoria(auditoria) as any;
  }

  /**
   * Obtiene las solicitudes de ampliación de plazo pendientes
   * Útil para que el Jefe OCI vea todas las solicitudes que requieren aprobación
   */
  async getSolicitudesAmpliacionPendientes(): Promise<Array<{
    id: string;
    auditoriaId: string;
    auditoriaCodigo: string;
    auditoriaNombre: string;
    fechaSolicitud: string;
    justificacion: string;
    fechaFinAnterior: string;
    fechaFinNueva: string;
    solicitanteId: number;
  }>> {
    // Buscar todos los registros de ampliación con estado pendiente
    const solicitudesPendientes = await this.historialRepository.find({
      where: {
        tipoEvento: TipoEvento.AMPLIACION_PLAZO,
      },
      order: { createdAt: 'DESC' },
      relations: ['auditoria'],
    });

    // Filtrar solo las pendientes y mapear los datos
    const solicitudes = solicitudesPendientes
      .filter(hist => {
        const estadoMatch = hist.observaciones?.match(/ESTADO:([^|]+)/);
        const estado = estadoMatch ? estadoMatch[1] : '';
        return estado === 'pendiente';
      })
      .map(hist => {
        // Extraer estado de las observaciones
        const estadoMatch = hist.observaciones?.match(/ESTADO:([^|]+)/);
        const estado = estadoMatch ? estadoMatch[1] : '';
        
        // Extraer justificación de las observaciones
        const justificacionMatch = hist.observaciones?.match(/JUSTIFICACION:(.+?)(?:\|ESTADO:|$)/s);
        const justificacion = justificacionMatch ? justificacionMatch[1].trim() : '';
        
        const cambioFechaFin = hist.cambios?.find(c => c.campo === 'fechaFin');

        return {
          id: hist.id,
          auditoriaId: hist.auditoriaId,
          auditoriaCodigo: hist.auditoria?.codigo || 'N/A',
          auditoriaNombre: hist.auditoria?.nombre || 'N/A',
          fechaSolicitud: `${hist.fecha}T${hist.hora}`,
          justificacion,
          fechaFinAnterior: cambioFechaFin?.valorAnterior || '',
          fechaFinNueva: cambioFechaFin?.valorNuevo || '',
          solicitanteId: hist.usuarioId,
        };
      });

    return solicitudes;
  }

  /**
   * Obtiene el historial completo de cambios de una auditoría
   */
  async getHistorialAuditoria(auditoriaId: string): Promise<any[]> {
    const historial = await this.historialRepository.find({
      where: { auditoriaId },
      order: { createdAt: 'DESC' },
    });

    // Enriquecer con datos de personas
    const historialEnriquecido = await Promise.all(
      historial.map(async (evento) => {
        let nombreUsuario = 'Usuario desconocido';
        let cargoUsuario = '';

        if (evento.usuarioId) {
          try {
            const personaResult = await this.dataSource.query(
              'SELECT nom_largo FROM auth.personas WHERE id_tercero = $1',
              [evento.usuarioId]
            );
            
            if (personaResult && personaResult.length > 0) {
              nombreUsuario = personaResult[0].nom_largo || nombreUsuario;
            }
          } catch (error) {
            console.error('Error obteniendo datos de persona:', error);
          }
        }

        return {
          id: evento.id,
          auditoriaId: evento.auditoriaId,
          tipo: evento.tipoEvento,
          fecha: this.serializeDate(evento.fecha),
          hora: evento.hora,
          usuario: nombreUsuario,
          cargoUsuario,
          accion: evento.accion,
          descripcion: evento.descripcion,
          cambios: evento.cambios || [],
          documentoAdjunto: evento.documentoAdjunto,
          observaciones: evento.observaciones,
          ipAddress: evento.ipAddress,
          estadoAnterior: evento.estadoAnterior,
          estadoNuevo: evento.estadoNuevo,
          createdAt: evento.createdAt,
        };
      })
    );

    return historialEnriquecido;
  }

  /**
   * Busca una persona en auth.personas por número de identificación
   * Retorna el ID_TERCERO (BIGINT) que se usa como FK en las tablas
   */
  async buscarPersonaPorNumeroIdentificacion(numeroIdentificacion: string): Promise<{ id_tercero: number; nombre: string; } | null> {
    try {
      const resultado = await this.auditoriaRepository.query(
        `SELECT id_tercero, nom_largo, sig_tercero, tip_identificacion, num_identificacion 
         FROM auth.personas 
         WHERE num_identificacion = $1 
         LIMIT 1`,
        [numeroIdentificacion]
      );

      if (resultado && resultado.length > 0) {
        return {
          id_tercero: Number(resultado[0].id_tercero),
          nombre: resultado[0].nom_largo || 'Usuario Desconocido'
        };
      }

      return null;
    } catch (error) {
      console.error(`Error al buscar persona con identificación ${numeroIdentificacion}:`, error);
      return null;
    }
  }

  /**
   * Obtiene todas las personas de auth.personas que pueden ser auditores
   * Retorna la lista completa para usar en selectores
   */
  async obtenerPersonasDisponibles(): Promise<any[]> {
    try {
      const personas = await this.auditoriaRepository.query(
        `SELECT 
          id_tercero,
          num_identificacion,
          tip_identificacion,
          nom_largo,
          sig_tercero,
          nom_tercero,
          pri_apellido,
          seg_apellido,
          seg_nombre,
          dir_email
         FROM auth.personas 
         WHERE id_tercero IS NOT NULL
         ORDER BY nom_largo ASC`
      );

      return personas.map((p: any) => ({
        id: String(p.id_tercero),
        idPersona: Number(p.id_tercero),
        nombre: p.nom_largo || 'Usuario Sin Nombre',
        iniciales: p.sig_tercero || this.getIniciales(p.nom_largo || 'US'),
        tipoIdentificacion: p.tip_identificacion || 'CC',
        numeroIdentificacion: p.num_identificacion || '',
        email: p.dir_email || '',
        cargo: 'Auditor', // Por defecto, se puede ajustar según rol
        especialidad: 'General',
        auditoriasConducto: 0, // Se puede calcular en el futuro
        disponibilidad: 'Disponible'
      }));
    } catch (error) {
      console.error('Error al obtener personas disponibles:', error);
      return [];
    }
  }
}












