import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TravelExpensesService } from './travel-expenses.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateSolicitudDto } from '../dto/create-solicitud.dto';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TravelExpensesController {
  constructor(private readonly service: TravelExpensesService) {}

  @Get('comisionados/:documento')
  consultarComisionado(@Param('documento') documento: string) {
    return this.service.consultarComisionado(documento);
  }

  @Post('requests')
  @Permissions('travel_expenses:create_request')
  crearSolicitud(@Body() dto: CreateSolicitudDto) {
    return this.service.crearSolicitud(dto);
  }

  @Post('requests/:id/documentos')
  @Permissions('travel_expenses:create_request')
  subirDocumento(
    @Param('id') id: string,
    @Body() dto: UploadDocumentoDto,
  ) {
    return this.service.subirDocumento(id, dto);
  }
}
