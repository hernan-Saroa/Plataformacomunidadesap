import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DisciplinaryBehaviorService } from '../services/disciplinary-behavior.service';
import {
  CreateDisciplinaryBehaviorDto,
  UpdateDisciplinaryBehaviorDto,
} from '../dtos/disciplinary-behavior.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Conductas Disciplinarias')
@Controller('disciplinary-behaviors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DisciplinaryBehaviorController {
  constructor(
    private readonly behaviorService: DisciplinaryBehaviorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las conductas disciplinarias',
    description: 'Retorna todas las conductas disciplinarias, incluyendo activas e inactivas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conductas disciplinarias obtenida exitosamente',
  })
  async findAll() {
    return this.behaviorService.findAll();
  }

  @Get('active')
  @ApiOperation({
    summary: 'Obtener conductas disciplinarias activas',
    description: 'Retorna solo las conductas disciplinarias activas, ordenadas por orden y nombre',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conductas disciplinarias activas obtenida exitosamente',
  })
  async findAllActive() {
    return this.behaviorService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener conducta disciplinaria por ID',
    description: 'Retorna una conducta disciplinaria específica por su ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la conducta disciplinaria',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Conducta disciplinaria encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Conducta disciplinaria no encontrada',
  })
  async findById(@Param('id') id: string) {
    return this.behaviorService.findById(id);
  }

  @Get('code/:codigo')
  @ApiOperation({
    summary: 'Obtener conducta disciplinaria por código',
    description: 'Retorna una conducta disciplinaria específica por su código único',
  })
  @ApiParam({
    name: 'codigo',
    description: 'Código único de la conducta disciplinaria',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Conducta disciplinaria encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Conducta disciplinaria no encontrada',
  })
  async findByCode(@Param('codigo') codigo: string) {
    const behavior = await this.behaviorService.findByCode(codigo);
    if (!behavior) {
      throw new Error(`Conducta disciplinaria con código ${codigo} no encontrada`);
    }
    return behavior;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nueva conducta disciplinaria',
    description: 'Crea una nueva conducta disciplinaria con los datos proporcionados',
  })
  @ApiBody({
    type: CreateDisciplinaryBehaviorDto,
    description: 'Datos para crear la conducta disciplinaria',
  })
  @ApiResponse({
    status: 201,
    description: 'Conducta disciplinaria creada exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: código o nombre ya existen',
  })
  async create(@Body() createDto: CreateDisciplinaryBehaviorDto) {
    return this.behaviorService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar conducta disciplinaria',
    description: 'Actualiza una conducta disciplinaria existente con los datos proporcionados',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la conducta disciplinaria a actualizar',
    type: 'string',
  })
  @ApiBody({
    type: UpdateDisciplinaryBehaviorDto,
    description: 'Datos para actualizar la conducta disciplinaria',
  })
  @ApiResponse({
    status: 200,
    description: 'Conducta disciplinaria actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Conducta disciplinaria no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: código o nombre ya existen',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryBehaviorDto,
  ) {
    return this.behaviorService.update(id, updateDto);
  }

  @Put(':id/toggle-status')
  @ApiOperation({
    summary: 'Alternar estado de conducta disciplinaria',
    description: 'Activa o desactiva una conducta disciplinaria',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la conducta disciplinaria',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la conducta disciplinaria alternado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Conducta disciplinaria no encontrada',
  })
  async toggleStatus(@Param('id') id: string) {
    return this.behaviorService.toggleStatus(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar conducta disciplinaria',
    description: 'Elimina permanentemente una conducta disciplinaria',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la conducta disciplinaria a eliminar',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Conducta disciplinaria eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Conducta disciplinaria no encontrada',
  })
  async remove(@Param('id') id: string) {
    await this.behaviorService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({
    summary: 'Reordenar conductas disciplinarias',
    description: 'Actualiza el orden de las conductas disciplinarias según la lista proporcionada',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista ordenada de IDs de conductas disciplinarias',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conductas disciplinarias reordenadas exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Lista de IDs inválida o IDs no existentes',
  })
  async reorder(@Body('ids') ids: string[]) {
    await this.behaviorService.reorder(ids);
    return { message: 'Conductas disciplinarias reordenadas exitosamente' };
  }
}
