import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { PlanIndividualService } from './plan-individual.service';
import { CreatePlanIndividualDto } from './dto/create-plan-individual.dto';
import { UpdatePlanIndividualDto } from './dto/update-plan-individual.dto';

@Controller('plan-individual')
export class PlanIndividualController {
  constructor(private readonly planIndividualService: PlanIndividualService) {}

  /**
   * GET /plan-individual
   * Lista todos los planes individuales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('auditoriaId') auditoriaId?: string,
    @Query('estado') estado?: string,
    @Query('search') search?: string,
  ) {
    return this.planIndividualService.findAll({
      auditoriaId,
      estado,
      search,
    });
  }

  /**
   * GET /plan-individual/:id
   * Obtiene un plan individual por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.planIndividualService.findOne(id);
  }

  /**
   * POST /plan-individual
   * Crea un nuevo plan individual
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreatePlanIndividualDto) {
    return this.planIndividualService.create(createDto);
  }

  /**
   * PUT /plan-individual/:id
   * Actualiza un plan individual
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdatePlanIndividualDto) {
    return this.planIndividualService.update(id, updateDto);
  }

  /**
   * DELETE /plan-individual/:id
   * Elimina un plan individual
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.planIndividualService.delete(id);
  }

  /**
   * POST /plan-individual/:id/enviar
   * Envía el plan individual al área auditada
   */
  @Post(':id/enviar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  enviar(@Param('id') id: string, @Body() body: { enviadoPor: string }) {
    return this.planIndividualService.enviar(id, body.enviadoPor);
  }

  /**
   * POST /plan-individual/:id/aceptar
   * Acepta el plan individual
   */
  @Post(':id/aceptar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  aceptar(@Param('id') id: string) {
    return this.planIndividualService.aceptar(id);
  }

  /**
   * GET /plan-individual/auditoria/:auditoriaId
   * Obtiene planes por auditoría
   */
  @Get('auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getPlanesPorAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.planIndividualService.getPlanesPorAuditoria(auditoriaId);
  }
}

