import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DisciplinaryProcessReassignmentService } from '../services/disciplinary-process-reassignment.service';
import { CreateReassignmentRequestDto } from '../dtos/create-reassignment-request.dto';
import { ApproveReassignmentRequestDto } from '../dtos/approve-reassignment-request.dto';

@ApiTags('Solicitudes de Reasignación de Procesos')
@Controller('disciplinary-process-reassignment')
export class DisciplinaryProcessReassignmentController {
  constructor(
    private readonly reassignmentService: DisciplinaryProcessReassignmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una solicitud de reasignación de proceso' })
  @ApiResponse({
    status: 201,
    description: 'Solicitud creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o proceso sin profesional asignado',
  })
  @ApiResponse({
    status: 404,
    description: 'Proceso o profesional no encontrado',
  })
  createReassignmentRequest(@Body() dto: CreateReassignmentRequestDto) {
    return this.reassignmentService.createReassignmentRequest(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las solicitudes de reasignación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las solicitudes',
  })
  getAllRequests() {
    return this.reassignmentService.getAllRequests();
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar o rechazar una solicitud de reasignación' })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La solicitud ya fue procesada',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada',
  })
  approveReassignmentRequest(
    @Param('id') id: string,
    @Body() dto: ApproveReassignmentRequestDto,
  ) {
    return this.reassignmentService.approveReassignmentRequest(id, dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de reasignación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes',
  })
  getPendingRequests() {
    return this.reassignmentService.getPendingRequests();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una solicitud de reasignación por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada',
  })
  getRequestById(@Param('id') id: string) {
    return this.reassignmentService.getRequestById(id);
  }

  @Get('process/:processId')
  @ApiOperation({
    summary: 'Obtener todas las solicitudes de reasignación de un proceso',
  })
  @ApiParam({ name: 'processId', description: 'UUID del proceso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del proceso',
  })
  getRequestsByProcess(@Param('processId') processId: string) {
    return this.reassignmentService.getRequestsByProcess(processId);
  }
}