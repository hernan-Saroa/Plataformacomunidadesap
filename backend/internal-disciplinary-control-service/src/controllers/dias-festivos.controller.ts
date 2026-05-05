import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DiasFestivosService } from '../services/dias-festivos.service';
import {
  CreateFestivoDto,
  UpdateFestivoDto,
  ListarFestivosDto,
} from '../dtos/dias-festivos.dto';
import { DiaFestivo } from '../entities/dia-festivo.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Días Festivos')
@Controller('dias-festivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DiasFestivosController {
  constructor(
    private festivosService: DiasFestivosService,
  ) {}

  /**
   * Listar días festivos
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar días festivos',
    description: 'Retorna lista de días festivos con filtros opcionales',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de días festivos',
  })
  async listar(@Query() query: ListarFestivosDto) {
    return await this.festivosService.listar(query);
  }

  /**
   * Obtener festivo por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener día festivo por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Día festivo encontrado',
    type: DiaFestivo,
  })
  @ApiResponse({ status: 404, description: 'Festivo no encontrado' })
  async obtenerPorId(@Param('id') id: string) {
    return await this.festivosService.obtenerPorId(id);
  }

  /**
   * Crear nuevo día festivo
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear día festivo',
    description: 'Crea un nuevo día festivo (nacional, regional o institucional)',
  })
  @ApiResponse({
    status: 201,
    description: 'Día festivo creado exitosamente',
    type: DiaFestivo,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Festivo duplicado' })
  async crear(
    @Body() dto: CreateFestivoDto,
    @Request() req: any,
  ): Promise<DiaFestivo> {
    // UUID del sistema cuando no hay usuario autenticado
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const creadoPorId = req.user?.id || SYSTEM_USER_ID;
    return await this.festivosService.crear(dto, creadoPorId);
  }

  /**
   * Actualizar día festivo
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar día festivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Día festivo actualizado',
    type: DiaFestivo,
  })
  @ApiResponse({ status: 404, description: 'Festivo no encontrado' })
  @ApiResponse({ status: 409, description: 'Festivo duplicado' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateFestivoDto,
  ): Promise<DiaFestivo> {
    return await this.festivosService.actualizar(id, dto);
  }

  /**
   * Eliminar día festivo (desactiva en lugar de eliminar)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar día festivo',
    description: 'Desactiva un día festivo en lugar de eliminarlo físicamente',
  })
  @ApiResponse({ status: 204, description: 'Festivo desactivado' })
  @ApiResponse({ status: 404, description: 'Festivo no encontrado' })
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.festivosService.eliminar(id);
  }
}

