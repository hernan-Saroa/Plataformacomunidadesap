import {
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

