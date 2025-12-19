import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TerminosProcesalesService } from '../services/terminos-procesales.service';
import {
  CreateTerminoDto,
  UpdateTerminoDto,
  MarcarCumplidoDto,
  ListarTerminosDto,
} from '../dtos/terminos-procesales.dto';
import { TerminoProcesal } from '../entities/termino-procesal.entity';

@ApiTags('Términos Procesales')
@Controller('terminos-procesales')
@ApiBearerAuth()
export class TerminosProcesalesController {
  constructor(
    private terminosService: TerminosProcesalesService,
  ) {}

  /**
   * Listar términos con filtros y paginación
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar términos procesales',
    description: 'Retorna lista de términos con filtros, paginación y estadísticas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de términos procesales',
  })
  async listar(@Query() query: ListarTerminosDto) {
    return await this.terminosService.listar(query);
  }

  /**
   * Obtener término por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener término por ID',
    description: 'Retorna información completa de un término procesal',
  })
  @ApiResponse({
    status: 200,
    description: 'Término procesal encontrado',
    type: TerminoProcesal,
  })
  @ApiResponse({ status: 404, description: 'Término no encontrado' })
  async obtenerPorId(@Param('id') id: string) {
    return await this.terminosService.obtenerPorId(id);
  }

  /**
   * Crear nuevo término procesal
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear término procesal',
    description: 'Crea un nuevo término procesal con cálculo automático de fechas',
  })
  @ApiResponse({
    status: 201,
    description: 'Término creado exitosamente',
    type: TerminoProcesal,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async crear(
    @Body() dto: CreateTerminoDto,
    @Request() req: any,
  ): Promise<TerminoProcesal> {
    // TODO: Obtener userId del token JWT
    // UUID del sistema cuando no hay usuario autenticado
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    const creadoPorId = req.user?.id || SYSTEM_USER_ID;
    return await this.terminosService.crear(dto, creadoPorId);
  }

  /**
   * Actualizar término
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar término procesal',
    description: 'Actualiza un término procesal. Si cambia fecha o días, recalcula automáticamente',
  })
  @ApiResponse({
    status: 200,
    description: 'Término actualizado',
    type: TerminoProcesal,
  })
  @ApiResponse({ status: 404, description: 'Término no encontrado' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateTerminoDto,
  ): Promise<TerminoProcesal> {
    return await this.terminosService.actualizar(id, dto);
  }

  /**
   * Marcar término como cumplido
   */
  @Patch(':id/marcar-cumplido')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar término como cumplido',
    description: 'Marca un término como cumplido con fecha y observaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Término marcado como cumplido',
    type: TerminoProcesal,
  })
  @ApiResponse({ status: 400, description: 'Término ya cumplido' })
  @ApiResponse({ status: 404, description: 'Término no encontrado' })
  async marcarCumplido(
    @Param('id') id: string,
    @Body() dto: MarcarCumplidoDto,
  ): Promise<TerminoProcesal> {
    return await this.terminosService.marcarCumplido(id, dto);
  }

  /**
   * Recalcular todos los términos activos
   */
  @Post('recalcular')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recalcular términos',
    description: 'Recalcula todos los términos activos (excepto cumplidos) con fechas y estados actualizados',
  })
  @ApiResponse({
    status: 200,
    description: 'Recálculo completado',
  })
  async recalcular() {
    return await this.terminosService.recalcularTodos();
  }

  /**
   * Eliminar término
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar término',
    description: 'Elimina un término procesal (solo si está cumplido)',
  })
  @ApiResponse({ status: 204, description: 'Término eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar término no cumplido' })
  @ApiResponse({ status: 404, description: 'Término no encontrado' })
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.terminosService.eliminar(id);
  }
}

