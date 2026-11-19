import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { KlicService } from './klic.service';
import { KlicContratoDto } from './dto/klic-contrato.dto';
import {
  KlicPaginationQueryDto,
  PaginatedKlicContratosResponseDto,
} from './dto/klic-pagination.dto';

@ApiTags('klic')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('klic')
export class KlicController {
  constructor(private readonly klicService: KlicService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Verificar estado de la conexión a la base de datos Klic',
    description:
      'Comprueba si la base de datos de Klic (SQL Server 172.16.202.145) está accesible y responde a consultas.',
  })
  @ApiResponse({ status: 200, description: 'Estado de conexión retornado' })
  async checkHealth() {
    return this.klicService.checkHealth();
  }

  @Get('contratos/funcionario/:numeroIdentificacion')
  @ApiOperation({
    summary: 'Consultar contratos en Klic por número de identificación',
    description:
      'Obtiene la lista de contratos vinculados a una persona por su número de documento en la base de datos Klic.',
  })
  @ApiParam({
    name: 'numeroIdentificacion',
    description: 'Número de cédula o identificación del funcionario/contratista',
    example: '1118562823',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contratos encontrados',
    type: [KlicContratoDto],
  })
  async getContratosByIdentificacion(
    @Param('numeroIdentificacion') numeroIdentificacion: string,
  ): Promise<KlicContratoDto[]> {
    return this.klicService.getContratosByIdentificacion(numeroIdentificacion);
  }

  @Get('contratos')
  @ApiOperation({
    summary: 'Listado paginado de contratos en Klic',
    description:
      'Obtiene contratos registrados en Klic con soporte de paginación y búsqueda por identificación, nombre, contrato o área.',
  })
  @ApiResponse({
    status: 200,
    description: 'Registros paginados obtenidos',
    type: PaginatedKlicContratosResponseDto,
  })
  async getContratosPaginados(
    @Query() query: KlicPaginationQueryDto,
  ): Promise<PaginatedKlicContratosResponseDto> {
    return this.klicService.getContratosPaginados(query);
  }
}

