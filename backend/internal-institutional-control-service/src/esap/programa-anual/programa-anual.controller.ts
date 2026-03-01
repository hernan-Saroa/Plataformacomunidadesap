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
import { ProgramaAnualService } from './programa-anual.service';
import { CreateProgramaAnualDto } from './dto/create-programa-anual.dto';
import { UpdateProgramaAnualDto } from './dto/update-programa-anual.dto';
import { CreateAuditoriaProgramadaDto } from './dto/create-auditoria-programada.dto';
import { AmpliarPlazoDto } from './dto/ampliar-plazo.dto';

@Controller('programa-anual')
export class ProgramaAnualController {
  constructor(private readonly programaAnualService: ProgramaAnualService) {}

  /**
   * GET /programa-anual
   * Lista todos los programas anuales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  findAll(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.programaAnualService.findAll(yearNum);
  }

  /**
   * GET /programa-anual/:id
   * Obtiene un programa anual por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  findOne(@Param('id') id: string) {
    return this.programaAnualService.findOne(id);
  }

  /**
   * POST /programa-anual
   * Crea un nuevo programa anual
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProgramaAnualDto) {
    return this.programaAnualService.create(createDto);
  }

  /**
   * PUT /programa-anual/:id
   * Actualiza un programa anual
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateProgramaAnualDto) {
    return this.programaAnualService.update(id, updateDto);
  }

  /**
   * DELETE /programa-anual/:id
   * Elimina un programa anual
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.programaAnualService.delete(id);
  }

  /**
   * POST /programa-anual/:id/importar-auditorias
   * Importa auditorías priorizadas desde el Universo de Auditorías
   */
  @Post(':id/importar-auditorias')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  importarAuditorias(
    @Param('id') id: string,
    @Body() body: { procesoIds: string[] },
  ) {
    return this.programaAnualService.importarAuditorias(id, body.procesoIds);
  }

  /**
   * GET /programa-anual/:id/auditorias
   * Obtiene las auditorías de un programa
   */
  @Get(':id/auditorias')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  getAuditoriasPrograma(@Param('id') id: string) {
    return this.programaAnualService.getAuditoriasPrograma(id);
  }

  /**
   * GET /programa-anual/:id/cronograma
   * Obtiene el cronograma de un programa
   */
  @Get(':id/cronograma')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  getCronograma(@Param('id') id: string) {
    return this.programaAnualService.getCronograma(id);
  }

  /**
   * POST /programa-anual/auditorias/:auditoriaId/ampliar-plazo
   * Amplía el plazo de una auditoría
   */
  @Post('auditorias/:auditoriaId/ampliar-plazo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_APPROVE)
  ampliarPlazo(
    @Param('auditoriaId') auditoriaId: string,
    @Body() ampliarDto: AmpliarPlazoDto,
  ) {
    return this.programaAnualService.ampliarPlazo(auditoriaId, ampliarDto);
  }
}

