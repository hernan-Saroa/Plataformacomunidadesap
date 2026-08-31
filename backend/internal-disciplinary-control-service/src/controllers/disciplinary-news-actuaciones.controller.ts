import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDisciplinaryProcessActuacionDto } from '../dtos/disciplinary-process-actuacion.dto';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessActuacionesService } from '../services/disciplinary-process-actuaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Actuaciones Noticia Disciplinaria')
@Controller('disciplinary-news/:id/actuaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DisciplinaryNewsActuacionesController {
  constructor(
    private readonly actuacionesService: DisciplinaryProcessActuacionesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar actuaciones registradas contra una noticia disciplinaria',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de actuaciones de la noticia',
    type: DisciplinaryProcessActuacion,
    isArray: true,
  })
  async list(@Param('id') newsId: string): Promise<DisciplinaryProcessActuacion[]> {
    return this.actuacionesService.listByNews(newsId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'JEFE_DE_LA_OCID', 'JEFE_OCID', 'SECRETARIA_RADICADOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar una actuacion contra una noticia disciplinaria',
    description:
      'Disponible desde la etapa de Radicacion. Restringido a los roles Radicador y Jefe de la OCID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Actuacion creada exitosamente',
    type: DisciplinaryProcessActuacion,
  })
  async create(
    @Param('id') newsId: string,
    @Body() dto: CreateDisciplinaryProcessActuacionDto,
  ): Promise<DisciplinaryProcessActuacion> {
    return this.actuacionesService.createForNews(newsId, dto);
  }
}
