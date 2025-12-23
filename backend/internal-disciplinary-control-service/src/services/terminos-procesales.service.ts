import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere, ILike } from 'typeorm';
import { TerminoProcesal, TerminoEstado } from '../entities/termino-procesal.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import {
  CreateTerminoDto,
  UpdateTerminoDto,
  MarcarCumplidoDto,
  ListarTerminosDto,
} from '../dtos/terminos-procesales.dto';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { transformTermino } from '../common/transformers';

@Injectable()
export class TerminosProcesalesService {
  constructor(
    @InjectRepository(TerminoProcesal)
    private terminosRepository: Repository<TerminoProcesal>,
    @InjectRepository(DisciplinaryProcess)
    private procesosRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepository: Repository<DisciplinaryProfessional>,
    private terminosCalculator: TerminosCalculatorService,
  ) {}

  /**
   * Crear nuevo término procesal
   */
  async crear(dto: CreateTerminoDto, creadoPorId: string): Promise<TerminoProcesal> {
    // Validar que el proceso existe
    const proceso = await this.procesosRepository.findOne({
      where: { id: dto.procesoId },
    });

    if (!proceso) {
      throw new NotFoundException(`Proceso con ID ${dto.procesoId} no encontrado`);
    }

    // Calcular fecha de vencimiento usando días hábiles
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaVencimiento = await this.terminosCalculator.sumarDiasHabiles(
      fechaInicio,
      dto.diasHabiles,
    );

    // Calcular días restantes desde hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasRestantes = await this.terminosCalculator.diasHabilesRestantes(
      fechaVencimiento,
    );

    // Determinar estado inicial
    let estado = TerminoEstado.PENDIENTE;
    if (diasRestantes < 0) {
      estado = TerminoEstado.VENCIDO;
    } else if (diasRestantes <= 3) {
      estado = TerminoEstado.PROXIMO_VENCER;
    }

    // Obtener información del responsable desde la base de datos
    let responsableNombre = `Responsable ${dto.responsableId.substring(0, 8)}`;
    let emailResponsable = `responsable-${dto.responsableId.substring(0, 8)}@esap.edu.co`;
    
    try {
      const profesional = await this.professionalRepository.findOne({
        where: { id: dto.responsableId }
      });
      
      if (profesional) {
        responsableNombre = profesional.nombreCompleto || responsableNombre;
        emailResponsable = profesional.email || emailResponsable;
      }
    } catch (error) {
      console.error('Error al obtener información del profesional:', error);
      // Continuar con valores por defecto si hay error
    }

    // Obtener proceso completo con noticia para nombre del denunciado
    const procesoCompleto = await this.procesosRepository.findOne({
      where: { id: dto.procesoId },
      relations: ['news'],
    });

    // Crear término
    const termino = this.terminosRepository.create({
      procesoId: dto.procesoId,
      numeroProceso: proceso.radicadoProceso,
      actuacion: dto.actuacion,
      responsableId: dto.responsableId,
      responsableNombre: responsableNombre, // TODO: Obtener nombre real
      emailResponsable: emailResponsable, // TODO: Obtener email real
      fechaInicio: fechaInicio,
      diasHabiles: dto.diasHabiles,
      fechaVencimiento: fechaVencimiento,
      diasRestantes: diasRestantes,
      estado: estado,
      alertaEnviada: false,
      creadoPorId: creadoPorId,
    });

    const terminoGuardado = await this.terminosRepository.save(termino);

    // Obtener proceso completo con noticia para nombre del denunciado
    const procesoConNoticia = await this.procesosRepository.findOne({
      where: { id: terminoGuardado.procesoId },
      relations: ['news'],
    });

    const nombreDenunciado = procesoConNoticia?.news?.disciplinable?.[0]?.nombre || 
                             proceso.radicadoProceso || 
                             'Proceso sin nombre';

    return transformTermino(terminoGuardado, nombreDenunciado);
  }

  /**
   * Listar términos con filtros y paginación
   */
  async listar(dto: ListarTerminosDto): Promise<{
    terminos: TerminoProcesal[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      pendientes: number;
      proximosVencer: number;
      vencidos: number;
      cumplidos: number;
    };
  }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where: FindOptionsWhere<TerminoProcesal> = {};

    if (dto.estado) {
      where.estado = dto.estado;
    }

    if (dto.procesoId) {
      where.procesoId = dto.procesoId;
    }

    if (dto.responsableId) {
      where.responsableId = dto.responsableId;
    }

    if (dto.fechaDesde || dto.fechaHasta) {
      where.fechaInicio = Between(
        dto.fechaDesde ? new Date(dto.fechaDesde) : new Date('1900-01-01'),
        dto.fechaHasta ? new Date(dto.fechaHasta) : new Date('2100-12-31'),
      );
    }

    // Query base
    const queryBuilder = this.terminosRepository
      .createQueryBuilder('termino')
      .leftJoinAndSelect('termino.proceso', 'proceso')
      .where(where);

    // Búsqueda por texto
    if (dto.search) {
      queryBuilder.andWhere(
        '(termino.actuacion ILIKE :search OR termino.numeroProceso ILIKE :search OR termino.responsableNombre ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    // Contar total
    const total = await queryBuilder.getCount();

    // Obtener resultados paginados con relación al proceso
    const terminos = await queryBuilder
      .leftJoinAndSelect('proceso.news', 'news')
      .orderBy('termino.fechaVencimiento', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Transformar para incluir nombre del proceso (denunciado) y formato correcto
    // También actualizar datos del responsable si están desactualizados
    const terminosTransformados = await Promise.all(terminos.map(async (termino) => {
      // Obtener nombre del denunciado desde la noticia
      const nombreDenunciado = termino.proceso?.news?.disciplinable?.[0]?.nombre || 
                               termino.numeroProceso || 
                               'Proceso sin nombre';
      
      // Actualizar datos del responsable si están desactualizados (tienen formato placeholder)
      if (termino.responsableId && 
          (termino.responsableNombre?.includes('Responsable 00000000') || 
           termino.emailResponsable?.includes('responsable-00000000'))) {
        try {
          const profesional = await this.professionalRepository.findOne({
            where: { id: termino.responsableId }
          });
          
          if (profesional) {
            // Actualizar en la base de datos
            termino.responsableNombre = profesional.nombreCompleto || termino.responsableNombre;
            termino.emailResponsable = profesional.email || termino.emailResponsable;
            await this.terminosRepository.save(termino);
          }
        } catch (error) {
          console.error('Error al actualizar datos del responsable:', error);
          // Continuar sin actualizar si hay error
        }
      }
      
      return transformTermino(termino, nombreDenunciado);
    }));

    // Calcular estadísticas
    const stats = {
      pendientes: await this.terminosRepository.count({
        where: { estado: TerminoEstado.PENDIENTE },
      }),
      proximosVencer: await this.terminosRepository.count({
        where: { estado: TerminoEstado.PROXIMO_VENCER },
      }),
      vencidos: await this.terminosRepository.count({
        where: { estado: TerminoEstado.VENCIDO },
      }),
      cumplidos: await this.terminosRepository.count({
        where: { estado: TerminoEstado.CUMPLIDO },
      }),
    };

    return {
      terminos: terminosTransformados,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      stats,
    };
  }

  /**
   * Obtener término por ID
   */
  async obtenerPorId(id: string): Promise<TerminoProcesal> {
    const termino = await this.terminosRepository.findOne({
      where: { id },
      relations: ['proceso', 'proceso.news', 'alertas'],
    });

    if (!termino) {
      throw new NotFoundException(`Término con ID ${id} no encontrado`);
    }

    // Obtener nombre del denunciado desde la noticia
    const nombreDenunciado = termino.proceso?.news?.disciplinable?.[0]?.nombre || 
                             termino.numeroProceso || 
                             'Proceso sin nombre';

    return transformTermino(termino, nombreDenunciado);
  }

  /**
   * Actualizar término
   */
  async actualizar(
    id: string,
    dto: UpdateTerminoDto,
  ): Promise<TerminoProcesal> {
    const termino = await this.terminosRepository.findOne({
      where: { id },
      relations: ['proceso', 'proceso.news'],
    });

    if (!termino) {
      throw new NotFoundException(`Término con ID ${id} no encontrado`);
    }

    // Si se actualiza fechaInicio o diasHabiles, recalcular
    if (dto.fechaInicio || dto.diasHabiles) {
      const fechaInicio = dto.fechaInicio
        ? new Date(dto.fechaInicio)
        : termino.fechaInicio;
      const diasHabiles = dto.diasHabiles || termino.diasHabiles;

      const fechaVencimiento = await this.terminosCalculator.sumarDiasHabiles(
        fechaInicio,
        diasHabiles,
      );

      const diasRestantes = await this.terminosCalculator.diasHabilesRestantes(
        fechaVencimiento,
      );

      // Determinar nuevo estado (solo si NO está cumplido)
      // No cambiar el estado si ya está marcado como cumplido
      if (termino.estado !== TerminoEstado.CUMPLIDO) {
        let estado = TerminoEstado.PENDIENTE;
        if (diasRestantes < 0) {
          estado = TerminoEstado.VENCIDO;
        } else if (diasRestantes <= 3) {
          estado = TerminoEstado.PROXIMO_VENCER;
        }
        termino.estado = estado;
      }

      termino.fechaInicio = fechaInicio;
      termino.diasHabiles = diasHabiles;
      termino.fechaVencimiento = fechaVencimiento;
      termino.diasRestantes = diasRestantes;
    }

    if (dto.actuacion) {
      termino.actuacion = dto.actuacion;
    }

    if (dto.responsableId) {
      termino.responsableId = dto.responsableId;
      
      // Obtener información del responsable desde la base de datos
      try {
        const profesional = await this.professionalRepository.findOne({
          where: { id: dto.responsableId }
        });
        
        if (profesional) {
          termino.responsableNombre = profesional.nombreCompleto || `Responsable ${dto.responsableId.substring(0, 8)}`;
          termino.emailResponsable = profesional.email || `responsable-${dto.responsableId.substring(0, 8)}@esap.edu.co`;
        } else {
          // Si no se encuentra el profesional, usar valores por defecto
          termino.responsableNombre = `Responsable ${dto.responsableId.substring(0, 8)}`;
          termino.emailResponsable = `responsable-${dto.responsableId.substring(0, 8)}@esap.edu.co`;
        }
      } catch (error) {
        console.error('Error al obtener información del profesional:', error);
        // Continuar con valores por defecto si hay error
        termino.responsableNombre = `Responsable ${dto.responsableId.substring(0, 8)}`;
        termino.emailResponsable = `responsable-${dto.responsableId.substring(0, 8)}@esap.edu.co`;
      }
    }

    const terminoGuardado = await this.terminosRepository.save(termino);

    // Obtener proceso completo con noticia para nombre del denunciado
    const procesoCompleto = await this.procesosRepository.findOne({
      where: { id: terminoGuardado.procesoId },
      relations: ['news'],
    });

    const nombreDenunciado = procesoCompleto?.news?.disciplinable?.[0]?.nombre || 
                             terminoGuardado.numeroProceso || 
                             'Proceso sin nombre';

    return transformTermino(terminoGuardado, nombreDenunciado);
  }

  /**
   * Marcar término como cumplido
   */
  async marcarCumplido(
    id: string,
    dto: MarcarCumplidoDto,
  ): Promise<TerminoProcesal> {
    const termino = await this.terminosRepository.findOne({
      where: { id },
      relations: ['proceso', 'proceso.news'],
    });

    if (!termino) {
      throw new NotFoundException(`Término con ID ${id} no encontrado`);
    }

    if (termino.estado === TerminoEstado.CUMPLIDO) {
      throw new BadRequestException('El término ya está marcado como cumplido');
    }

    termino.estado = TerminoEstado.CUMPLIDO;
    termino.fechaCumplimiento = new Date(dto.fechaCumplimiento);
    termino.observaciones = dto.observaciones || termino.observaciones;

    const terminoGuardado = await this.terminosRepository.save(termino);

    // Obtener proceso completo con noticia para nombre del denunciado
    const procesoCompleto = await this.procesosRepository.findOne({
      where: { id: terminoGuardado.procesoId },
      relations: ['news'],
    });

    const nombreDenunciado = procesoCompleto?.news?.disciplinable?.[0]?.nombre || 
                             terminoGuardado.numeroProceso || 
                             'Proceso sin nombre';

    return transformTermino(terminoGuardado, nombreDenunciado);
  }

  /**
   * Recalcular todos los términos activos
   */
  async recalcularTodos(): Promise<{
    terminosActualizados: number;
    cambiosEstado: {
      pendiente: number;
      proximo_vencer: number;
      vencido: number;
    };
  }> {
    // Obtener todos excepto cumplidos
    const terminosActivos = await this.terminosRepository
      .createQueryBuilder('termino')
      .where('termino.estado != :estado', { estado: TerminoEstado.CUMPLIDO })
      .getMany();

    const cambiosEstado = {
      pendiente: 0,
      proximo_vencer: 0,
      vencido: 0,
    };

    for (const termino of terminosActivos) {
      // Actualizar datos del responsable si están desactualizados
      if (termino.responsableId && 
          (termino.responsableNombre?.includes('Responsable 00000000') || 
           termino.emailResponsable?.includes('responsable-00000000'))) {
        try {
          const profesional = await this.professionalRepository.findOne({
            where: { id: termino.responsableId }
          });
          
          if (profesional) {
            termino.responsableNombre = profesional.nombreCompleto || termino.responsableNombre;
            termino.emailResponsable = profesional.email || termino.emailResponsable;
          }
        } catch (error) {
          console.error('Error al actualizar datos del responsable en recálculo:', error);
        }
      }

      // Recalcular fecha de vencimiento
      const fechaVencimiento = await this.terminosCalculator.sumarDiasHabiles(
        termino.fechaInicio,
        termino.diasHabiles,
      );

      // Recalcular días restantes
      const diasRestantes = await this.terminosCalculator.diasHabilesRestantes(
        fechaVencimiento,
      );

      // Determinar nuevo estado (solo si NO está cumplido)
      // El estado CUMPLIDO solo se asigna manualmente
      if (termino.estado !== TerminoEstado.CUMPLIDO) {
        let nuevoEstado = TerminoEstado.PENDIENTE;
        if (diasRestantes < 0) {
          nuevoEstado = TerminoEstado.VENCIDO;
          cambiosEstado.vencido++;
        } else if (diasRestantes <= 3) {
          nuevoEstado = TerminoEstado.PROXIMO_VENCER;
          cambiosEstado.proximo_vencer++;
        } else {
          cambiosEstado.pendiente++;
        }
        termino.estado = nuevoEstado;
      }

      // Actualizar término
      termino.fechaVencimiento = fechaVencimiento;
      termino.diasRestantes = diasRestantes;

      await this.terminosRepository.save(termino);
    }

    return {
      terminosActualizados: terminosActivos.length,
      cambiosEstado,
    };
  }

  /**
   * Eliminar término
   */
  async eliminar(id: string): Promise<void> {
    const termino = await this.obtenerPorId(id);

    if (termino.estado !== TerminoEstado.CUMPLIDO) {
      throw new BadRequestException(
        'Solo se pueden eliminar términos cumplidos',
      );
    }

    await this.terminosRepository.delete(id);
  }
}

