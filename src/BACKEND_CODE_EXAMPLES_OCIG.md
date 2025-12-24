# 💻 EJEMPLOS DE CÓDIGO - BACKEND CONTROL INTERNO OCIG

## 📋 Índice

1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Ejemplos de Controladores](#ejemplos-de-controladores)
3. [Ejemplos de Servicios](#ejemplos-de-servicios)
4. [Ejemplos de Repositorios](#ejemplos-de-repositorios)
5. [Middlewares](#middlewares)
6. [Validadores](#validadores)
7. [Casos de Uso Completos](#casos-de-uso-completos)

---

## 1. Estructura del Proyecto

```
/backend
  /src
    /modules
      /auditorias
        /dto                      # Data Transfer Objects
          create-auditoria.dto.ts
          update-auditoria.dto.ts
          query-auditoria.dto.ts
        /entities                 # Entidades de base de datos
          auditoria.entity.ts
        /controllers
          auditorias.controller.ts
        /services
          auditorias.service.ts
        /repositories
          auditorias.repository.ts
        auditorias.module.ts
```

---

## 2. Ejemplos de Controladores

### 2.1 Controlador de Auditorías (NestJS)

```typescript
// src/modules/auditorias/controllers/auditorias.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditoriasService } from '../services/auditorias.service';
import { CreateAuditoriaDto } from '../dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from '../dto/update-auditoria.dto';
import { QueryAuditoriaDto } from '../dto/query-auditoria.dto';
import { ChangeEstadoDto } from '../dto/change-estado.dto';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermission } from '@/common/auth/permissions.decorator';
import { AuditLog } from '@/common/decorators/audit-log.decorator';

@ApiTags('Auditorías')
@ApiBearerAuth()
@Controller('auditorias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditoriasController {
  constructor(private readonly auditoriasService: AuditoriasService) {}

  /**
   * GET /auditorias
   * Obtener lista de auditorías con filtros y paginación
   */
  @Get()
  @RequirePermission('auditorias:read')
  @ApiOperation({ summary: 'Obtener lista de auditorías' })
  @ApiResponse({ status: 200, description: 'Lista de auditorías obtenida exitosamente' })
  async findAll(@Query() query: QueryAuditoriaDto, @Request() req) {
    const { page = 1, pageSize = 10, ...filters } = query;
    
    // Si el usuario es territorial, filtrar por su territorio
    if (req.user.territorialId) {
      filters.territorialId = req.user.territorialId;
    }
    
    const result = await this.auditoriasService.findAll({
      page,
      pageSize,
      filters,
    });
    
    return {
      success: true,
      data: result.data,
      pagination: {
        page,
        pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / pageSize),
        hasNextPage: page < Math.ceil(result.total / pageSize),
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /auditorias/:id
   * Obtener detalle de una auditoría
   */
  @Get(':id')
  @RequirePermission('auditorias:read')
  @ApiOperation({ summary: 'Obtener detalle de auditoría' })
  @ApiResponse({ status: 200, description: 'Auditoría encontrada' })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async findOne(@Param('id') id: string, @Request() req) {
    const auditoria = await this.auditoriasService.findOne(id, req.user);
    
    return {
      success: true,
      data: auditoria,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /auditorias
   * Crear nueva auditoría
   */
  @Post()
  @RequirePermission('auditorias:create')
  @AuditLog('auditoria', 'CREATE')
  @ApiOperation({ summary: 'Crear nueva auditoría' })
  @ApiResponse({ status: 201, description: 'Auditoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear auditorías' })
  async create(@Body() createDto: CreateAuditoriaDto, @Request() req) {
    const auditoria = await this.auditoriasService.create(createDto, req.user);
    
    return {
      success: true,
      data: auditoria,
      message: 'Auditoría creada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PUT /auditorias/:id
   * Actualizar auditoría
   */
  @Put(':id')
  @RequirePermission('auditorias:update')
  @AuditLog('auditoria', 'UPDATE')
  @ApiOperation({ summary: 'Actualizar auditoría' })
  @ApiResponse({ status: 200, description: 'Auditoría actualizada' })
  @ApiResponse({ status: 404, description: 'Auditoría no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuditoriaDto,
    @Request() req,
  ) {
    const auditoria = await this.auditoriasService.update(id, updateDto, req.user);
    
    return {
      success: true,
      data: auditoria,
      message: 'Auditoría actualizada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * DELETE /auditorias/:id
   * Eliminar auditoría (soft delete)
   */
  @Delete(':id')
  @RequirePermission('auditorias:delete')
  @AuditLog('auditoria', 'DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar auditoría' })
  @ApiResponse({ status: 200, description: 'Auditoría eliminada' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.auditoriasService.remove(id, req.user);
    
    return {
      success: true,
      message: 'Auditoría eliminada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PATCH /auditorias/:id/estado
   * Cambiar estado de auditoría
   */
  @Patch(':id/estado')
  @RequirePermission('auditorias:update')
  @AuditLog('auditoria', 'CHANGE_STATUS')
  @ApiOperation({ summary: 'Cambiar estado de auditoría' })
  async changeEstado(
    @Param('id') id: string,
    @Body() changeEstadoDto: ChangeEstadoDto,
    @Request() req,
  ) {
    const auditoria = await this.auditoriasService.changeEstado(
      id,
      changeEstadoDto.estado,
      changeEstadoDto.observaciones,
      req.user,
    );
    
    return {
      success: true,
      data: auditoria,
      message: `Estado cambiado a ${changeEstadoDto.estado}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PATCH /auditorias/:id/progreso
   * Actualizar progreso
   */
  @Patch(':id/progreso')
  @RequirePermission('auditorias:update')
  @ApiOperation({ summary: 'Actualizar progreso de auditoría' })
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { progreso: number },
    @Request() req,
  ) {
    const auditoria = await this.auditoriasService.updateProgress(
      id,
      body.progreso,
      req.user,
    );
    
    return {
      success: true,
      data: auditoria,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /auditorias/:id/hallazgos
   * Obtener hallazgos de una auditoría
   */
  @Get(':id/hallazgos')
  @RequirePermission('hallazgos:read')
  @ApiOperation({ summary: 'Obtener hallazgos de auditoría' })
  async getHallazgos(@Param('id') id: string, @Request() req) {
    const hallazgos = await this.auditoriasService.getHallazgos(id, req.user);
    
    return {
      success: true,
      data: hallazgos,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /auditorias/:id/hallazgos
   * Crear hallazgo para auditoría
   */
  @Post(':id/hallazgos')
  @RequirePermission('hallazgos:create')
  @AuditLog('hallazgo', 'CREATE')
  @ApiOperation({ summary: 'Crear hallazgo en auditoría' })
  async createHallazgo(
    @Param('id') id: string,
    @Body() createHallazgoDto: any,
    @Request() req,
  ) {
    const hallazgo = await this.auditoriasService.createHallazgo(
      id,
      createHallazgoDto,
      req.user,
    );
    
    return {
      success: true,
      data: hallazgo,
      message: 'Hallazgo creado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /auditorias/:id/documentos
   * Subir documento a auditoría
   */
  @Post(':id/documentos')
  @RequirePermission('auditorias:update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir documento a auditoría' })
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { tipo: string; descripcion?: string },
    @Request() req,
  ) {
    const documento = await this.auditoriasService.uploadDocument(
      id,
      file,
      body.tipo,
      body.descripcion,
      req.user,
    );
    
    return {
      success: true,
      data: documento,
      message: 'Documento cargado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## 3. Ejemplos de Servicios

### 3.1 Servicio de Auditorías

```typescript
// src/modules/auditorias/services/auditorias.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditoriasRepository } from '../repositories/auditorias.repository';
import { HallazgosService } from '@/modules/hallazgos/services/hallazgos.service';
import { NotificacionesService } from '@/modules/notificaciones/services/notificaciones.service';
import { S3Service } from '@/common/services/s3.service';
import { CreateAuditoriaDto } from '../dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from '../dto/update-auditoria.dto';
import { Auditoria, EstadoAuditoria } from '../entities/auditoria.entity';
import { User } from '@/modules/usuarios/entities/user.entity';

@Injectable()
export class AuditoriasService {
  constructor(
    private readonly auditoriasRepository: AuditoriasRepository,
    private readonly hallazgosService: HallazgosService,
    private readonly notificacionesService: NotificacionesService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Obtener todas las auditorías con filtros
   */
  async findAll(options: {
    page: number;
    pageSize: number;
    filters: any;
  }) {
    const { page, pageSize, filters } = options;
    
    const [data, total] = await this.auditoriasRepository.findAndCount({
      where: this.buildWhereClause(filters),
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { creadoEn: 'DESC' },
      relations: ['auditorLider', 'territorial'],
    });
    
    return { data, total };
  }

  /**
   * Obtener una auditoría por ID
   */
  async findOne(id: string, user: User): Promise<Auditoria> {
    const auditoria = await this.auditoriasRepository.findOne({
      where: { id, eliminadoEn: null },
      relations: ['auditorLider', 'territorial', 'areasAuditadas'],
    });
    
    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${id} no encontrada`);
    }
    
    // Validar acceso territorial
    if (user.territorialId && auditoria.idTerritorial !== user.territorialId) {
      throw new ForbiddenException('No tienes acceso a esta auditoría');
    }
    
    return auditoria;
  }

  /**
   * Crear nueva auditoría
   */
  async create(createDto: CreateAuditoriaDto, user: User): Promise<Auditoria> {
    // Generar código único
    const year = new Date().getFullYear();
    const codigo = await this.generateCodigo(year);
    
    // Validar fechas
    this.validateFechas(createDto);
    
    // Validar auditoría especial
    if (createDto.esAuditoriaEspecial) {
      this.validateAuditoriaEspecial(createDto);
    }
    
    // Crear auditoría
    const auditoria = this.auditoriasRepository.create({
      ...createDto,
      codigo,
      estado: EstadoAuditoria.PROGRAMADA,
      progresoPorcentaje: 0,
      totalHallazgos: 0,
      hallazgosCriticos: 0,
      hallazgosAltos: 0,
      hallazgosMedios: 0,
      hallazgosBajos: 0,
      creadoPor: user.id,
    });
    
    const saved = await this.auditoriasRepository.save(auditoria);
    
    // Notificar al auditor líder
    if (saved.idAuditorLider) {
      await this.notificacionesService.create({
        idUsuario: saved.idAuditorLider,
        tipo: 'info',
        prioridad: 'alta',
        titulo: 'Nueva Auditoría Asignada',
        mensaje: `Has sido asignado como auditor líder de la auditoría: ${saved.titulo}`,
        entidadTipo: 'auditoria',
        entidadId: saved.id,
        urlAccion: `/control-interno/auditorias/${saved.id}`,
        textoAccion: 'Ver Auditoría',
      });
    }
    
    return saved;
  }

  /**
   * Actualizar auditoría
   */
  async update(
    id: string,
    updateDto: UpdateAuditoriaDto,
    user: User,
  ): Promise<Auditoria> {
    const auditoria = await this.findOne(id, user);
    
    // Validar que no esté cerrada
    if (auditoria.estado === EstadoAuditoria.CERRADA) {
      throw new BadRequestException('No se puede modificar una auditoría cerrada');
    }
    
    // Validar fechas si se actualizan
    if (updateDto.fechaInicioPlaneada || updateDto.fechaFinPlaneada) {
      this.validateFechas({
        ...auditoria,
        ...updateDto,
      });
    }
    
    // Actualizar
    Object.assign(auditoria, updateDto);
    auditoria.actualizadoPor = user.id;
    auditoria.actualizadoEn = new Date();
    
    return await this.auditoriasRepository.save(auditoria);
  }

  /**
   * Eliminar auditoría (soft delete)
   */
  async remove(id: string, user: User): Promise<void> {
    const auditoria = await this.findOne(id, user);
    
    // Solo se puede eliminar si está programada
    if (auditoria.estado !== EstadoAuditoria.PROGRAMADA) {
      throw new BadRequestException(
        'Solo se pueden eliminar auditorías en estado "Programada"',
      );
    }
    
    auditoria.eliminadoEn = new Date();
    auditoria.actualizadoPor = user.id;
    
    await this.auditoriasRepository.save(auditoria);
  }

  /**
   * Cambiar estado de auditoría
   */
  async changeEstado(
    id: string,
    nuevoEstado: EstadoAuditoria,
    observaciones: string | undefined,
    user: User,
  ): Promise<Auditoria> {
    const auditoria = await this.findOne(id, user);
    
    // Validar transición de estado
    if (!this.isValidStateTransition(auditoria.estado, nuevoEstado)) {
      throw new BadRequestException(
        `No se puede cambiar de ${auditoria.estado} a ${nuevoEstado}`,
      );
    }
    
    // Validar que puede cerrarse
    if (nuevoEstado === EstadoAuditoria.CERRADA) {
      const validacion = await this.validateCanClose(auditoria);
      if (!validacion.valid) {
        throw new BadRequestException(validacion.reason);
      }
    }
    
    const estadoAnterior = auditoria.estado;
    auditoria.estado = nuevoEstado;
    auditoria.actualizadoPor = user.id;
    auditoria.actualizadoEn = new Date();
    
    if (observaciones) {
      auditoria.observacionesAprobacion = observaciones;
    }
    
    // Si se cierra, registrar fecha
    if (nuevoEstado === EstadoAuditoria.CERRADA) {
      auditoria.fechaFinReal = new Date();
    }
    
    const saved = await this.auditoriasRepository.save(auditoria);
    
    // Notificar cambio de estado
    await this.notificarCambioEstado(saved, estadoAnterior, nuevoEstado, user);
    
    return saved;
  }

  /**
   * Actualizar progreso
   */
  async updateProgress(
    id: string,
    progreso: number,
    user: User,
  ): Promise<Auditoria> {
    if (progreso < 0 || progreso > 100) {
      throw new BadRequestException('El progreso debe estar entre 0 y 100');
    }
    
    const auditoria = await this.findOne(id, user);
    auditoria.progresoPorcentaje = progreso;
    auditoria.actualizadoPor = user.id;
    auditoria.actualizadoEn = new Date();
    
    return await this.auditoriasRepository.save(auditoria);
  }

  /**
   * Obtener hallazgos de una auditoría
   */
  async getHallazgos(id: string, user: User) {
    await this.findOne(id, user); // Validar acceso
    
    return await this.hallazgosService.findByAuditoria(id);
  }

  /**
   * Crear hallazgo para auditoría
   */
  async createHallazgo(id: string, createDto: any, user: User) {
    const auditoria = await this.findOne(id, user);
    
    // Crear hallazgo
    const hallazgo = await this.hallazgosService.create({
      ...createDto,
      idAuditoria: id,
    }, user);
    
    // Actualizar contadores
    await this.updateHallazgosCount(auditoria, hallazgo.gravedad);
    
    return hallazgo;
  }

  /**
   * Subir documento
   */
  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    tipo: string,
    descripcion: string | undefined,
    user: User,
  ) {
    const auditoria = await this.findOne(id, user);
    
    // Validar archivo
    this.validateFile(file);
    
    // Subir a S3
    const url = await this.s3Service.upload({
      file,
      bucket: 'esap-control-interno',
      path: `auditorias/${id}/${tipo}`,
    });
    
    // Agregar a documentos
    const documento = {
      id: this.generateUuid(),
      nombre: file.originalname,
      url,
      tipo,
      descripcion,
      fecha: new Date(),
      cargadoPor: user.id,
    };
    
    if (!auditoria.documentosAdjuntos) {
      auditoria.documentosAdjuntos = [];
    }
    
    auditoria.documentosAdjuntos.push(documento);
    auditoria.actualizadoPor = user.id;
    auditoria.actualizadoEn = new Date();
    
    await this.auditoriasRepository.save(auditoria);
    
    return documento;
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Generar código único
   */
  private async generateCodigo(year: number): Promise<string> {
    const count = await this.auditoriasRepository.count({
      where: {
        codigo: Like(`AUD-${year}-%`),
      },
    });
    
    const numero = (count + 1).toString().padStart(3, '0');
    return `AUD-${year}-${numero}`;
  }

  /**
   * Validar fechas
   */
  private validateFechas(data: any): void {
    if (data.fechaInicioPlaneada && data.fechaFinPlaneada) {
      if (new Date(data.fechaFinPlaneada) < new Date(data.fechaInicioPlaneada)) {
        throw new BadRequestException(
          'La fecha fin debe ser posterior a la fecha inicio',
        );
      }
    }
    
    // No permitir fechas pasadas para auditorías normales
    if (!data.esAuditoriaEspecial && data.fechaInicioPlaneada) {
      if (new Date(data.fechaInicioPlaneada) < new Date()) {
        throw new BadRequestException(
          'No se pueden planificar auditorías en el pasado',
        );
      }
    }
  }

  /**
   * Validar auditoría especial
   */
  private validateAuditoriaEspecial(data: any): void {
    if (!data.origenSolicitud) {
      throw new BadRequestException(
        'Las auditorías especiales requieren origen de solicitud',
      );
    }
  }

  /**
   * Validar transición de estado
   */
  private isValidStateTransition(
    currentState: EstadoAuditoria,
    newState: EstadoAuditoria,
  ): boolean {
    const validTransitions = {
      [EstadoAuditoria.PROGRAMADA]: [
        EstadoAuditoria.EN_PLANEACION,
        EstadoAuditoria.CANCELADA,
      ],
      [EstadoAuditoria.EN_PLANEACION]: [
        EstadoAuditoria.EN_EJECUCION,
        EstadoAuditoria.PROGRAMADA,
        EstadoAuditoria.CANCELADA,
      ],
      [EstadoAuditoria.EN_EJECUCION]: [
        EstadoAuditoria.EN_COMUNICACION,
        EstadoAuditoria.CANCELADA,
      ],
      [EstadoAuditoria.EN_COMUNICACION]: [EstadoAuditoria.CERRADA],
      [EstadoAuditoria.CERRADA]: [],
      [EstadoAuditoria.CANCELADA]: [],
    };
    
    return validTransitions[currentState]?.includes(newState) ?? false;
  }

  /**
   * Validar que puede cerrarse
   */
  private async validateCanClose(
    auditoria: Auditoria,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Debe tener al menos un hallazgo
    if (auditoria.totalHallazgos === 0) {
      return {
        valid: false,
        reason: 'La auditoría debe tener al menos un hallazgo registrado',
      };
    }
    
    // Hallazgos críticos deben tener plan
    if (auditoria.hallazgosCriticos > 0) {
      const hallazgosSinPlan = await this.hallazgosService.countCriticosSinPlan(
        auditoria.id,
      );
      
      if (hallazgosSinPlan > 0) {
        return {
          valid: false,
          reason: `Hay ${hallazgosSinPlan} hallazgos críticos sin plan de mejoramiento`,
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Actualizar contadores de hallazgos
   */
  private async updateHallazgosCount(
    auditoria: Auditoria,
    gravedad: string,
  ): Promise<void> {
    auditoria.totalHallazgos += 1;
    
    switch (gravedad) {
      case 'Crítica':
        auditoria.hallazgosCriticos += 1;
        break;
      case 'Alta':
        auditoria.hallazgosAltos += 1;
        break;
      case 'Media':
        auditoria.hallazgosMedios += 1;
        break;
      case 'Baja':
        auditoria.hallazgosBajos += 1;
        break;
    }
    
    await this.auditoriasRepository.save(auditoria);
  }

  /**
   * Validar archivo
   */
  private validateFile(file: Express.Multer.File): void {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('El archivo no debe superar 10 MB');
    }
    
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten archivos PDF, Excel o Word',
      );
    }
  }

  /**
   * Notificar cambio de estado
   */
  private async notificarCambioEstado(
    auditoria: Auditoria,
    estadoAnterior: EstadoAuditoria,
    estadoNuevo: EstadoAuditoria,
    user: User,
  ): Promise<void> {
    const mensajes = {
      [EstadoAuditoria.EN_PLANEACION]: 'La auditoría ha pasado a planeación',
      [EstadoAuditoria.EN_EJECUCION]: 'La auditoría ha iniciado su ejecución',
      [EstadoAuditoria.EN_COMUNICACION]: 'La auditoría está en fase de comunicación de resultados',
      [EstadoAuditoria.CERRADA]: 'La auditoría ha sido cerrada',
      [EstadoAuditoria.CANCELADA]: 'La auditoría ha sido cancelada',
    };
    
    // Notificar a auditor líder
    if (auditoria.idAuditorLider && auditoria.idAuditorLider !== user.id) {
      await this.notificacionesService.create({
        idUsuario: auditoria.idAuditorLider,
        tipo: 'info',
        prioridad: 'media',
        titulo: `Auditoría: Cambio de Estado`,
        mensaje: `${auditoria.codigo} - ${mensajes[estadoNuevo]}`,
        entidadTipo: 'auditoria',
        entidadId: auditoria.id,
        urlAccion: `/control-interno/auditorias/${auditoria.id}`,
        textoAccion: 'Ver Auditoría',
      });
    }
  }

  /**
   * Construir cláusula WHERE para filtros
   */
  private buildWhereClause(filters: any): any {
    const where: any = { eliminadoEn: null };
    
    if (filters.estado) {
      where.estado = filters.estado;
    }
    
    if (filters.tipo) {
      where.tipoAuditoria = filters.tipo;
    }
    
    if (filters.auditorLider) {
      where.idAuditorLider = filters.auditorLider;
    }
    
    if (filters.territorialId) {
      where.idTerritorial = filters.territorialId;
    }
    
    if (filters.especial !== undefined) {
      where.esAuditoriaEspecial = filters.especial;
    }
    
    if (filters.search) {
      where.titulo = Like(`%${filters.search}%`);
    }
    
    return where;
  }
}
```

---

## 4. Ejemplos de Repositorios

### 4.1 Repositorio de Auditorías

```typescript
// src/modules/auditorias/repositories/auditorias.repository.ts

import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Auditoria } from '../entities/auditoria.entity';

@Injectable()
export class AuditoriasRepository extends Repository<Auditoria> {
  constructor(private dataSource: DataSource) {
    super(Auditoria, dataSource.createEntityManager());
  }

  /**
   * Encontrar auditorías por estado
   */
  async findByEstado(estado: string): Promise<Auditoria[]> {
    return await this.find({
      where: { estado, eliminadoEn: null },
      order: { creadoEn: 'DESC' },
    });
  }

  /**
   * Encontrar auditorías de un auditor
   */
  async findByAuditor(auditorId: string): Promise<Auditoria[]> {
    return await this.createQueryBuilder('auditoria')
      .where('auditoria.id_auditor_lider = :auditorId', { auditorId })
      .orWhere('auditoria.auditores @> :auditoresArray', {
        auditoresArray: JSON.stringify([{ id: auditorId }]),
      })
      .andWhere('auditoria.eliminado_en IS NULL')
      .orderBy('auditoria.creado_en', 'DESC')
      .getMany();
  }

  /**
   * Estadísticas de auditorías
   */
  async getEstadisticas(filters?: any) {
    const query = this.createQueryBuilder('auditoria')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN estado = :enEjecucion THEN 1 ELSE 0 END)', 'enEjecucion')
      .addSelect('SUM(CASE WHEN estado = :cerrada THEN 1 ELSE 0 END)', 'completadas')
      .addSelect('SUM(CASE WHEN estado = :programada THEN 1 ELSE 0 END)', 'programadas')
      .addSelect('AVG(progreso_porcentaje)', 'promedioProgreso')
      .where('eliminado_en IS NULL')
      .setParameters({
        enEjecucion: 'en-ejecucion',
        cerrada: 'cerrada',
        programada: 'programada',
      });
    
    if (filters?.year) {
      query.andWhere('EXTRACT(YEAR FROM fecha_inicio_planeada) = :year', {
        year: filters.year,
      });
    }
    
    return await query.getRawOne();
  }

  /**
   * Auditorías próximas a vencer
   */
  async findProximasAVencer(dias: number = 7): Promise<Auditoria[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    
    return await this.createQueryBuilder('auditoria')
      .where('auditoria.estado IN (:...estados)', {
        estados: ['en-planeacion', 'en-ejecucion'],
      })
      .andWhere('auditoria.fecha_fin_planeada <= :fechaLimite', { fechaLimite })
      .andWhere('auditoria.eliminado_en IS NULL')
      .orderBy('auditoria.fecha_fin_planeada', 'ASC')
      .getMany();
  }
}
```

---

## 5. Middlewares

### 5.1 Middleware de Autenticación JWT

```typescript
// src/common/auth/jwt-auth.guard.ts

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return user;
  }
}
```

### 5.2 Middleware de Permisos

```typescript
// src/common/auth/permissions.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );
    
    if (!requiredPermission) {
      return true; // No requiere permisos específicos
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.permissions) {
      throw new ForbiddenException('No tienes permisos suficientes');
    }
    
    const hasPermission = user.permissions.includes(requiredPermission);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `Se requiere el permiso: ${requiredPermission}`,
      );
    }
    
    return true;
  }
}

// Decorador de permisos
export const RequirePermission = (permission: string) => {
  return SetMetadata('permission', permission);
};
```

### 5.3 Decorador de Auditoría de Cambios

```typescript
// src/common/decorators/audit-log.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  entityType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'CHANGE_STATUS';
}

export const AuditLog = (entityType: string, operation: AuditLogMetadata['operation']) =>
  SetMetadata(AUDIT_LOG_KEY, { entityType, operation });


// Interceptor de auditoría
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaCambiosService } from '@/modules/auditoria-cambios/services/auditoria-cambios.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditoriaCambiosService: AuditoriaCambiosService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );
    
    if (!metadata) {
      return next.handle();
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;
    const params = request.params;
    
    return next.handle().pipe(
      tap(async (response) => {
        await this.auditoriaCambiosService.logChange({
          entidadTipo: metadata.entityType,
          entidadId: params.id || response.data?.id,
          operacion: metadata.operation,
          idUsuario: user.id,
          nombreUsuario: user.nombre,
          emailUsuario: user.email,
          datosNuevos: body,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          modulo: 'control-interno',
        });
      }),
    );
  }
}
```

---

## 6. Validadores (DTOs)

### 6.1 DTO para Crear Auditoría

```typescript
// src/modules/auditorias/dto/create-auditoria.dto.ts

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDate,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum TipoAuditoria {
  GESTION = 'Gestión',
  CUMPLIMIENTO = 'Cumplimiento',
  DESEMPENO = 'Desempeño',
  SISTEMAS = 'Sistemas',
  FINANCIERA = 'Financiera',
  SEGUIMIENTO = 'Seguimiento',
}

class AreaAuditadaDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  responsable: string;
}

export class CreateAuditoriaDto {
  @ApiProperty({ description: 'Título de la auditoría', example: 'Auditoría de Gestión al Proceso de Contratación' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  titulo: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descripcion?: string;

  @ApiProperty({ description: 'Tipo de auditoría', enum: TipoAuditoria })
  @IsEnum(TipoAuditoria)
  tipoAuditoria: TipoAuditoria;

  @ApiPropertyOptional({ description: 'Alcance de la auditoría' })
  @IsString()
  @IsOptional()
  alcance?: string;

  @ApiPropertyOptional({ description: 'Objetivos de la auditoría', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objetivos?: string[];

  @ApiPropertyOptional({ description: 'Fecha de inicio planeada' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fechaInicioPlaneada?: Date;

  @ApiPropertyOptional({ description: 'Fecha de fin planeada' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fechaFinPlaneada?: Date;

  @ApiPropertyOptional({ description: '¿Es auditoría especial?', default: false })
  @IsBoolean()
  @IsOptional()
  esAuditoriaEspecial?: boolean;

  @ApiPropertyOptional({ description: '¿Está vinculada al plan anual?', default: false })
  @IsBoolean()
  @IsOptional()
  vinculadaPlanAnual?: boolean;

  @ApiPropertyOptional({ description: 'ID del plan anual' })
  @IsUUID()
  @IsOptional()
  idPlanAnual?: string;

  @ApiPropertyOptional({ description: 'Periodicidad (para auditorías especiales)' })
  @IsString()
  @IsOptional()
  periodicidad?: string;

  @ApiPropertyOptional({ description: 'Origen de la solicitud (para auditorías especiales)' })
  @IsString()
  @IsOptional()
  origenSolicitud?: string;

  @ApiPropertyOptional({ description: '¿Es auditoría territorial?', default: false })
  @IsBoolean()
  @IsOptional()
  esAuditoriaTerritorial?: boolean;

  @ApiPropertyOptional({ description: 'ID de la territorial' })
  @IsUUID()
  @IsOptional()
  idTerritorial?: string;

  @ApiPropertyOptional({ description: 'ID del auditor líder' })
  @IsUUID()
  @IsOptional()
  idAuditorLider?: string;

  @ApiPropertyOptional({ description: 'Áreas auditadas', type: [AreaAuditadaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaAuditadaDto)
  @IsOptional()
  areasAuditadas?: AreaAuditadaDto[];

  @ApiPropertyOptional({ description: 'Prioridad', enum: ['baja', 'media', 'alta', 'crítica'] })
  @IsString()
  @IsOptional()
  prioridad?: string;

  @ApiPropertyOptional({ description: 'Tags para búsqueda', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

---

## 7. Casos de Uso Completos

### 7.1 Caso de Uso: Crear Auditoría con Workflow Completo

```typescript
// Ejemplo de flujo completo desde el frontend

// 1. Frontend hace POST /auditorias
const response = await fetch('https://api.esap.edu.co/v1/control-interno/auditorias', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    titulo: 'Auditoría de Gestión al Proceso de Contratación',
    descripcion: 'Evaluación del cumplimiento normativo',
    tipoAuditoria: 'Gestión',
    fechaInicioPlaneada: '2025-02-01',
    fechaFinPlaneada: '2025-02-28',
    idAuditorLider: 'uuid-auditor',
    areasAuditadas: [
      {
        id: 'uuid-area',
        nombre: 'Gestión Contractual',
        responsable: 'Carlos Rodríguez'
      }
    ],
    prioridad: 'alta'
  })
});

const data = await response.json();
// data = { success: true, data: { id: 'uuid-auditoria', codigo: 'AUD-2025-001', ... } }

// 2. Backend crea la auditoría
// - Genera código AUD-2025-001
// - Estado inicial: 'programada'
// - Notifica al auditor líder

// 3. Cambiar a planeación
await fetch(`https://api.esap.edu.co/v1/control-interno/auditorias/${data.data.id}/estado`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    estado: 'en-planeacion',
    observaciones: 'Iniciando fase de planeación'
  })
});

// 4. Agregar hallazgo durante ejecución
await fetch(`https://api.esap.edu.co/v1/control-interno/auditorias/${data.data.id}/hallazgos`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    titulo: 'Contratos sin supervisión designada',
    descripcion: 'Se identificaron 5 contratos que no tienen supervisión formalmente designada',
    tipoHallazgo: 'No Conformidad',
    gravedad: 'Alta',
    condicion: 'Contratos activos sin supervisión',
    criterio: 'Manual de Contratación - Sección 4.5',
    causa: 'Falta de proceso formal de designación',
    efecto: 'Riesgo de incumplimiento contractual'
  })
});

// 5. Backend actualiza contadores automáticamente
// - totalHallazgos += 1
// - hallazgosAltos += 1
// - Notifica a responsable del área
```

### 7.2 Caso de Uso: Workflow de Plan de Mejoramiento

```typescript
// 1. Crear Plan de Mejoramiento para un Hallazgo
const planResponse = await fetch('https://api.esap.edu.co/v1/control-interno/hallazgos/uuid-hallazgo/plan-mejoramiento', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nombre: 'Plan de Mejoramiento - Supervisión Contractual',
    descripcion: 'Establecer proceso formal de designación de supervisores',
    fechaInicio: '2025-03-01',
    fechaFinEsperada: '2025-06-30',
    idResponsable: 'uuid-responsable',
    causaRaiz: 'No existe procedimiento documentado para designación de supervisores',
    indicadorCumplimiento: 'Porcentaje de contratos con supervisor designado',
    metaIndicador: '100%'
  })
});

// 2. Agregar Acciones al Plan
const accion1 = await fetch(`https://api.esap.edu.co/v1/control-interno/planes-mejoramiento/${planResponse.data.id}/acciones`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    descripcion: 'Elaborar procedimiento de designación de supervisores',
    tipoAccion: 'Correctiva',
    fechaInicio: '2025-03-01',
    fechaFinEsperada: '2025-03-31',
    idResponsable: 'uuid-responsable-accion'
  })
});

const accion2 = await fetch(`https://api.esap.edu.co/v1/control-interno/planes-mejoramiento/${planResponse.data.id}/acciones`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    descripcion: 'Capacitar personal sobre el procedimiento',
    tipoAccion: 'Preventiva',
    fechaInicio: '2025-04-01',
    fechaFinEsperada: '2025-04-15',
    idResponsable: 'uuid-responsable-accion'
  })
});

// 3. Actualizar Progreso de Acción
await fetch(`https://api.esap.edu.co/v1/control-interno/acciones-mejoramiento/${accion1.data.id}/progreso`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    porcentajeAvance: 50,
    observaciones: 'Procedimiento en revisión legal'
  })
});

// 4. Backend calcula automáticamente progreso del plan
// Promedio de todas las acciones
```

---

Este documento proporciona ejemplos prácticos de implementación para que el equipo de desarrollo backend tenga código de referencia listo para adaptar.
