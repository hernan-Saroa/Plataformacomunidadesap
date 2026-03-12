import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { HallazgosService } from './hallazgos.service';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from './dto/update-hallazgo.dto';
import { DecisionAuditorDto } from './dto/decision-auditor.dto';
import { HallazgoCategoria } from './entities/hallazgo.entity';

@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  /**
   * GET /hallazgos
   * Lista de hallazgos con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_VIEW)
  findAll(
    @Query('categoria') categoria?: string,
    @Query('estado') estado?: string,
    @Query('area') area?: string,
  ) {
    return this.hallazgosService.findAll({ categoria, estado, area });
  }

  /**
   * GET /hallazgos/categoria/criticos
   */
  @Get('categoria/criticos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_VIEW)
  getCriticos() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.CRITICO);
  }

  /**
   * GET /hallazgos/categoria/controversias
   */
  @Get('categoria/controversias')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_VIEW)
  getControversias() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.CONTROVERSIA);
  }

  /**
   * GET /hallazgos/categoria/borradores
   */
  @Get('categoria/borradores')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_VIEW)
  getBorradores() {
    return this.hallazgosService.findByCategoria(HallazgoCategoria.BORRADOR);
  }

  /**
   * GET /hallazgos/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_VIEW)
  findOne(@Param('id') id: string) {
    return this.hallazgosService.findOne(id);
  }

  /**
   * POST /hallazgos
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_CREATE)
  create(@Body() createDto: CreateHallazgoDto) {
    return this.hallazgosService.create(createDto);
  }

  /**
   * POST /hallazgos/:id/aceptar
   * Área auditada acepta el hallazgo
   */
  @Post(':id/aceptar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_EDIT)
  aceptar(@Param('id') id: string) {
    return this.hallazgosService.aceptar(id);
  }

  /**
   * POST /hallazgos/:id/controversia
   * Área auditada presenta controversia (requiere subir documento antes vía POST /documentos)
   */
  @Post(':id/controversia')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_EDIT)
  presentarControversia(
    @Param('id') id: string,
    @Body() body: { argumentos: string; documentoId: string; documentoNombre: string },
  ) {
    const { argumentos, documentoId, documentoNombre } = body;
    if (!documentoId || !documentoNombre) {
      throw new BadRequestException(
        'documentoId y documentoNombre son obligatorios (subir archivo vía POST /documentos primero)',
      );
    }
    return this.hallazgosService.presentarControversia(id, argumentos, documentoId, documentoNombre);
  }

  /**
   * POST /hallazgos/:id/decision-auditor
   * Auditor toma decisión sobre controversia
   */
  @Post(':id/decision-auditor')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_EDIT)
  decisionAuditor(@Param('id') id: string, @Body() dto: DecisionAuditorDto) {
    return this.hallazgosService.decisionAuditor(
      id,
      dto.tipoDecision,
      dto.fundamentacionTecnica,
      dto.auditorId,
    );
  }

  /**
   * PUT /hallazgos/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateHallazgoDto) {
    return this.hallazgosService.update(id, updateDto);
  }

  /**
   * DELETE /hallazgos/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.HALLAZGO_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hallazgosService.delete(id);
  }
}

