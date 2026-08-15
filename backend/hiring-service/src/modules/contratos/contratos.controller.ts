import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { ContratosService } from './contratos.service';
import {
  AceptarContratoDto,
  GenerarContratoDto,
  RechazarContratoDto,
} from './dto/contrato.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_CONTRATO,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Contrato electrónico — actividad 8.1 (EFDS-1161).
 *
 * Generar y registrar la aceptación son dos actuaciones distintas y por eso son
 * dos endpoints: la primera la hace la entidad, la segunda la protagoniza el
 * proponente aunque la registre el gestor.
 */
@ApiTags('Etapa 8 · Contrato electrónico')
@Controller('procesos/:id/contrato')
export class ContratosController {
  constructor(private readonly service: ContratosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Contrato del proceso',
    description:
      'Si el proceso está adjudicado, las tipologías disponibles, los formatos del SIG y el contrato con su estado de aceptación.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CONTRATO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: la minuta es el documento contractual.
      opcionesDeCarga(MIME_DOCUMENTOS, 'La minuta se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.1 · Generar el contrato',
    description:
      'Con la minuta diligenciada a partir del formato de la tipología. Solo sobre un proceso ya adjudicado.',
  })
  async generar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: GenerarContratoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la minuta: descarga el formato de la tipología, diligéncialo y súbelo aquí',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.generar(
        procesoId,
        dto,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('aceptar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CONTRATO)
  @ApiOperation({
    summary: 'Registrar la aceptación del proponente',
    description:
      'Deja constancia de quién aceptó y cuándo. Con la aceptación el contrato queda formalizado y la actividad cumplida.',
  })
  aceptar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AceptarContratoDto,
    @Req() req: any,
  ) {
    return this.service.aceptar(procesoId, dto, getHiringAccess(req));
  }

  @Post('rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CONTRATO)
  @ApiOperation({
    summary: 'Registrar que el proponente no acepta la minuta',
    description:
      'La minuta rechazada se conserva en el expediente con su motivo. Después se genera otra.',
  })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RechazarContratoDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, dto, getHiringAccess(req));
  }
}
