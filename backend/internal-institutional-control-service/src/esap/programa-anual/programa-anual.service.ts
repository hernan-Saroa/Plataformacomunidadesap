import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ProgramaAnual } from './entities/programa-anual.entity';
import { AuditoriaProgramada, EstadoAuditoriaProgramada } from './entities/auditoria-programada.entity';
import { CreateProgramaAnualDto } from './dto/create-programa-anual.dto';
import { UpdateProgramaAnualDto } from './dto/update-programa-anual.dto';
import { CreateAuditoriaProgramadaDto } from './dto/create-auditoria-programada.dto';
import { UpdateAuditoriaProgramadaDto } from './dto/update-auditoria-programada.dto';
import { AmpliarPlazoDto } from './dto/ampliar-plazo.dto';
import { ProcesoAuditable } from '../universo-auditorias/entities/proceso-auditable.entity';

@Injectable()
export class ProgramaAnualService {
  constructor(
    @InjectRepository(ProgramaAnual)
    private readonly programaRepository: Repository<ProgramaAnual>,
    @InjectRepository(AuditoriaProgramada)
    private readonly auditoriaRepository: Repository<AuditoriaProgramada>,
    @InjectRepository(ProcesoAuditable)
    private readonly procesoRepository: Repository<ProcesoAuditable>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Genera un código único para la auditoría programada
   */
  private async generarCodigoAuditoria(año: number): Promise<string> {
    const prefix = `AUD-PROG-${año}-`;
    const ultima = await this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .where('auditoria.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('auditoria.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultima?.codigo) {
      const numero = parseInt(ultima.codigo.split('-')[3], 10);
      if (!isNaN(numero)) {
        siguiente = numero + 1;
      }
    }

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
  }

  /**
   * Calcula duraciones diferenciadas para territoriales vs sede principal
   */
  private calcularDuracionesEtapas(esTerritorial: boolean, duracionTotal: number) {
    if (esTerritorial) {
      // Territoriales: etapas más cortas
      // Planeación: 15%, Ejecución: 4 días (semana), Comunicación: 10%
      const ejecucionDias = 4; // Una semana
      const planeacionDias = Math.max(2, Math.round(duracionTotal * 0.15));
      const comunicacionDias = Math.max(2, Math.round(duracionTotal * 0.10));
      return {
        planeacion: planeacionDias,
        ejecucion: ejecucionDias,
        comunicacion: comunicacionDias,
      };
    } else {
      // Sede principal: distribución estándar
      // Planeación: 25%, Ejecución: 60%, Comunicación: 15%
      return {
        planeacion: Math.max(5, Math.round(duracionTotal * 0.25)),
        ejecucion: Math.max(10, Math.round(duracionTotal * 0.60)),
        comunicacion: Math.max(3, Math.round(duracionTotal * 0.15)),
      };
    }
  }

  /**
   * Obtiene todos los programas anuales
   */
  async findAll(year?: number): Promise<ProgramaAnual[]> {
    const query = this.programaRepository
      .createQueryBuilder('programa')
      .leftJoinAndSelect('programa.auditorias', 'auditorias')
      .orderBy('programa.año', 'DESC');

    if (year) {
      query.where('programa.año = :year', { year });
    }

    return query.getMany();
  }

  /**
   * Obtiene un programa anual por ID
   */
  async findOne(id: string): Promise<ProgramaAnual> {
    const programa = await this.programaRepository.findOne({
      where: { id },
      relations: ['auditorias', 'auditorias.proceso'],
    });

    if (!programa) {
      throw new NotFoundException(`Programa anual con ID ${id} no encontrado`);
    }

    return programa;
  }

  /**
   * Crea un nuevo programa anual
   */
  async create(createDto: CreateProgramaAnualDto): Promise<ProgramaAnual> {
    // Verificar que no exista un programa para ese año
    const existente = await this.programaRepository.findOne({
      where: { año: createDto.año },
    });

    if (existente) {
      throw new BadRequestException(`Ya existe un programa anual para el año ${createDto.año}`);
    }

    const programa = this.programaRepository.create({
      año: createDto.año,
      nombre: createDto.nombre || `Programa Anual de Auditoría ${createDto.año}`,
      estado: 'borrador',
      fechaCreacion: new Date(),
      creadoPor: createDto.creadoPor,
      version: createDto.version || '1.0',
      totalActividades: 0,
      actividadesCompletadas: 0,
      porcentajeCumplimiento: 0,
    });

    return this.programaRepository.save(programa);
  }

  /**
   * Actualiza un programa anual
   */
  async update(id: string, updateDto: UpdateProgramaAnualDto): Promise<ProgramaAnual> {
    const programa = await this.findOne(id);

    if (updateDto.nombre) programa.nombre = updateDto.nombre;
    if (updateDto.version) programa.version = updateDto.version;
    if (updateDto.estado) programa.estado = updateDto.estado as any;

    if (updateDto.estado === 'aprobado' && !programa.fechaAprobacion) {
      programa.fechaAprobacion = new Date();
    }

    return this.programaRepository.save(programa);
  }

  /**
   * Elimina un programa anual
   */
  async delete(id: string): Promise<void> {
    const programa = await this.findOne(id);
    await this.programaRepository.remove(programa);
  }

  /**
   * Importa auditorías priorizadas desde el Universo de Auditorías
   */
  async importarAuditorias(programaId: string, procesoIds: string[]): Promise<AuditoriaProgramada[]> {
    const programa = await this.findOne(programaId);
    const procesos = await this.procesoRepository.find({
      where: { id: In(procesoIds) },
    });

    if (procesos.length !== procesoIds.length) {
      throw new BadRequestException('Algunos procesos no fueron encontrados');
    }

    const auditorias: AuditoriaProgramada[] = [];

    for (const proceso of procesos) {
      const codigo = await this.generarCodigoAuditoria(programa.año);
      
      // Calcular duraciones según tipo
      const duraciones = this.calcularDuracionesEtapas(
        proceso.territorial ? true : false,
        proceso.priorizacionAnos * 365, // Aproximación
      );

      const fechaInicio = new Date(programa.año, 0, 1);
      const fechaFinPlaneacion = new Date(fechaInicio);
      fechaFinPlaneacion.setDate(fechaFinPlaneacion.getDate() + duraciones.planeacion);

      const fechaInicioEjecucion = new Date(fechaFinPlaneacion);
      const fechaFinEjecucion = new Date(fechaInicioEjecucion);
      fechaFinEjecucion.setDate(fechaFinEjecucion.getDate() + duraciones.ejecucion);

      const fechaInicioComunicacion = new Date(fechaFinEjecucion);
      const fechaFinComunicacion = new Date(fechaInicioComunicacion);
      fechaFinComunicacion.setDate(fechaFinComunicacion.getDate() + duraciones.comunicacion);

      const auditoria = this.auditoriaRepository.create({
        codigo,
        nombre: `Auditoría ${proceso.nombre}`,
        procesoId: proceso.id,
        procesoCodigo: proceso.codigo,
        procesoNombre: proceso.nombre,
        tipo: 'gestion' as any,
        alcance: proceso.descripcion,
        procesoAuditar: proceso.nombre,
        auditorLider: '',
        equipoAuditor: {
          auditores: [],
          profesionalesEspecializados: [],
          profesionalesUniversitarios: [],
          tecnicos: [],
        },
        fechaInicioPlaneada: fechaInicio,
        fechaFinPlaneada: fechaFinComunicacion,
        duracionDias: duraciones.planeacion + duraciones.ejecucion + duraciones.comunicacion,
        prioridad: proceso.evaluacionRiesgo.nivelRiesgo === 'alto' ? 'alta' : 
                  proceso.evaluacionRiesgo.nivelRiesgo === 'medio' ? 'media' : 'baja' as any,
        riesgoInherente: proceso.evaluacionRiesgo.nivelRiesgo as any,
        estado: EstadoAuditoriaProgramada.PLANEADA,
        esTerritorial: !!proceso.territorial,
        territorial: proceso.territorial,
        esEspecial: false,
        etapas: {
          planeacion: {
            fechaInicio: fechaInicio.toISOString(),
            fechaFin: fechaFinPlaneacion.toISOString(),
            duracionDias: duraciones.planeacion,
            estado: 'pendiente',
          },
          ejecucion: {
            fechaInicio: fechaInicioEjecucion.toISOString(),
            fechaFin: fechaFinEjecucion.toISOString(),
            duracionDias: duraciones.ejecucion,
            estado: 'pendiente',
          },
          comunicacion: {
            fechaInicio: fechaInicioComunicacion.toISOString(),
            fechaFin: fechaFinComunicacion.toISOString(),
            duracionDias: duraciones.comunicacion,
            estado: 'pendiente',
          },
        },
        fechaLimiteOriginal: fechaFinComunicacion,
        fechaLimiteActual: fechaFinComunicacion,
        programaAnualId: programa.id,
      });

      auditorias.push(await this.auditoriaRepository.save(auditoria));
    }

    // Recalcular estadísticas del programa
    await this.recalcularEstadisticas(programaId);

    return auditorias;
  }

  /**
   * Obtiene las auditorías de un programa
   */
  async getAuditoriasPrograma(programaId: string): Promise<AuditoriaProgramada[]> {
    await this.findOne(programaId); // Verificar que existe
    return this.auditoriaRepository.find({
      where: { programaAnualId: programaId },
      relations: ['proceso'],
      order: { fechaInicioPlaneada: 'ASC' },
    });
  }

  /**
   * Obtiene el cronograma de un programa
   */
  async getCronograma(programaId: string): Promise<any> {
    const programa = await this.findOne(programaId);
    const auditorias = await this.getAuditoriasPrograma(programaId);

    return {
      programa: {
        id: programa.id,
        año: programa.año,
        nombre: programa.nombre,
        estado: programa.estado,
      },
      auditorias: auditorias.map(a => ({
        id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        proceso: a.procesoNombre,
        fechaInicio: a.fechaInicioPlaneada,
        fechaFin: a.fechaFinPlaneada,
        etapas: a.etapas,
        estado: a.estado,
        esTerritorial: a.esTerritorial,
        territorial: a.territorial,
      })),
    };
  }

  /**
   * Amplía el plazo de una auditoría (máximo 1 año desde fecha inicio)
   */
  async ampliarPlazo(auditoriaId: string, ampliarDto: AmpliarPlazoDto): Promise<AuditoriaProgramada> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    const fechaLimiteNueva = new Date(ampliarDto.fechaLimiteNueva);
    const fechaInicio = new Date(auditoria.fechaInicioPlaneada);
    const diferenciaDias = Math.floor((fechaLimiteNueva.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

    // Validar que no exceda 1 año (365 días)
    if (diferenciaDias > 365) {
      throw new BadRequestException('El plazo ampliado no puede exceder 1 año desde la fecha de inicio');
    }

    // Validar que la nueva fecha sea posterior a la actual
    if (fechaLimiteNueva <= auditoria.fechaLimiteActual) {
      throw new BadRequestException('La nueva fecha límite debe ser posterior a la fecha límite actual');
    }

    // Crear registro de ampliación
    const ampliacion = {
      fechaSolicitud: new Date().toISOString(),
      fechaAutorizacion: new Date().toISOString(),
      justificacion: ampliarDto.justificacion,
      autorizadoPor: ampliarDto.autorizadoPor,
      fechaLimiteAnterior: auditoria.fechaLimiteActual.toISOString(),
      fechaLimiteNueva: fechaLimiteNueva.toISOString(),
      duracionDiasAnterior: auditoria.duracionDias,
      duracionDiasNueva: ampliarDto.duracionDiasNueva,
    };

    auditoria.ampliaciones = [...(auditoria.ampliaciones || []), ampliacion];
    auditoria.fechaLimiteActual = fechaLimiteNueva;
    auditoria.duracionDias = ampliarDto.duracionDiasNueva;

    // Actualizar fecha fin de la etapa de comunicación
    if (auditoria.etapas.comunicacion) {
      auditoria.etapas.comunicacion.fechaFin = fechaLimiteNueva.toISOString();
      auditoria.etapas.comunicacion.duracionDias = ampliarDto.duracionDiasNueva - 
        (auditoria.etapas.planeacion.duracionDias + auditoria.etapas.ejecucion.duracionDias);
    }

    return this.auditoriaRepository.save(auditoria);
  }

  /**
   * Actualiza una auditoría programada
   * Solo permite edición si el programa tiene estado 'aprobado' o 'borrador'
   */
  async updateAuditoria(auditoriaId: string, updateDto: UpdateAuditoriaProgramadaDto): Promise<AuditoriaProgramada> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
      relations: ['programa'],
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // Verificar el programa asociado para validar permisos según estado
    const programa = await this.programaRepository.findOne({
      where: { id: auditoria.programaAnualId },
    });

    if (!programa) {
      throw new NotFoundException('Programa anual asociado no encontrado');
    }

    // Solo permitir edición en estados: borrador, aprobado
    // No permitir edición si el programa está cerrado o en revisión
    const estadosEditables = ['borrador', 'aprobado', 'vigente'];
    if (!estadosEditables.includes(programa.estado)) {
      throw new BadRequestException(
        `No se puede editar la auditoría. El programa está en estado "${programa.estado}". ` +
        `Solo se permite edición cuando el programa está en: ${estadosEditables.join(', ')}`
      );
    }

    // Aplicar actualizaciones
    if (updateDto.nombre !== undefined) auditoria.nombre = updateDto.nombre;
    if (updateDto.tipo !== undefined) auditoria.tipo = updateDto.tipo;
    if (updateDto.alcance !== undefined) auditoria.alcance = updateDto.alcance;
    if (updateDto.procesoAuditar !== undefined) auditoria.procesoAuditar = updateDto.procesoAuditar;
    if (updateDto.auditorLider !== undefined) auditoria.auditorLider = updateDto.auditorLider;
    if (updateDto.equipoAuditor !== undefined) {
      auditoria.equipoAuditor = { ...auditoria.equipoAuditor, ...updateDto.equipoAuditor };
    }
    if (updateDto.fechaInicioPlaneada !== undefined) {
      auditoria.fechaInicioPlaneada = new Date(updateDto.fechaInicioPlaneada);
    }
    if (updateDto.fechaFinPlaneada !== undefined) {
      auditoria.fechaFinPlaneada = new Date(updateDto.fechaFinPlaneada);
      auditoria.fechaLimiteActual = new Date(updateDto.fechaFinPlaneada);
    }
    if (updateDto.duracionDias !== undefined) auditoria.duracionDias = updateDto.duracionDias;
    if (updateDto.prioridad !== undefined) auditoria.prioridad = updateDto.prioridad;
    if (updateDto.riesgoInherente !== undefined) auditoria.riesgoInherente = updateDto.riesgoInherente;
    if (updateDto.esTerritorial !== undefined) auditoria.esTerritorial = updateDto.esTerritorial;
    if (updateDto.territorial !== undefined) auditoria.territorial = updateDto.territorial;
    if (updateDto.esEspecial !== undefined) auditoria.esEspecial = updateDto.esEspecial;
    if (updateDto.etapas !== undefined) {
      auditoria.etapas = {
        ...auditoria.etapas,
        ...(updateDto.etapas.planeacion && { planeacion: { ...auditoria.etapas.planeacion, ...updateDto.etapas.planeacion } }),
        ...(updateDto.etapas.ejecucion && { ejecucion: { ...auditoria.etapas.ejecucion, ...updateDto.etapas.ejecucion } }),
        ...(updateDto.etapas.comunicacion && { comunicacion: { ...auditoria.etapas.comunicacion, ...updateDto.etapas.comunicacion } }),
      };
    }

    return this.auditoriaRepository.save(auditoria);
  }

  /**
   * Elimina una auditoría programada
   * Solo permite eliminación si el programa tiene estado 'aprobado' o 'borrador'
   * Y la auditoría no está en ejecución o completada
   */
  async deleteAuditoria(auditoriaId: string): Promise<void> {
    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    // Verificar el programa asociado
    const programa = await this.programaRepository.findOne({
      where: { id: auditoria.programaAnualId },
    });

    if (!programa) {
      throw new NotFoundException('Programa anual asociado no encontrado');
    }

    // Solo permitir eliminación en estados: borrador, aprobado
    const estadosEditables = ['borrador', 'aprobado', 'vigente'];
    if (!estadosEditables.includes(programa.estado)) {
      throw new BadRequestException(
        `No se puede eliminar la auditoría. El programa está en estado "${programa.estado}". ` +
        `Solo se permite eliminación cuando el programa está en: ${estadosEditables.join(', ')}`
      );
    }

    // No permitir eliminar auditorías en ejecución o completadas
    const estadosNoEliminables = [
      EstadoAuditoriaProgramada.EN_CURSO,
      EstadoAuditoriaProgramada.COMPLETADA,
      EstadoAuditoriaProgramada.CANCELADA,
    ];
    if (estadosNoEliminables.includes(auditoria.estado)) {
      throw new BadRequestException(
        `No se puede eliminar la auditoría porque está en estado "${auditoria.estado}". ` +
        `Solo se pueden eliminar auditorías planeadas o reprogramadas.`
      );
    }

    const programaId = auditoria.programaAnualId;
    await this.auditoriaRepository.remove(auditoria);

    // Recalcular estadísticas del programa
    if (programaId) {
      await this.recalcularEstadisticas(programaId);
    }
  }

  /**
   * Recalcula las estadísticas del programa
   */
  private async recalcularEstadisticas(programaId: string): Promise<void> {
    const auditorias = await this.getAuditoriasPrograma(programaId);
    const totalActividades = auditorias.length;
    const actividadesCompletadas = auditorias.filter(a => a.estado === EstadoAuditoriaProgramada.COMPLETADA).length;
    const porcentajeCumplimiento = totalActividades > 0
      ? Math.round((actividadesCompletadas / totalActividades) * 100)
      : 0;

    await this.programaRepository.update(programaId, {
      totalActividades,
      actividadesCompletadas,
      porcentajeCumplimiento,
    });
  }
}

