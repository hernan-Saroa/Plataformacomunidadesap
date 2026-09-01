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

import { ModificacionesService, TipoRespaldo } from './modificaciones.service';
import {
  AprobarModificacionDto,
  ExpedirRespaldoDto,
  PublicarModificacionDto,
  RechazarModificacionDto,
  RechazarRespaldoDto,
  RevocarModificacionDto,
  SolicitarAclaratorioDto,
  SolicitarAdicionDto,
  SolicitarCesionDto,
  SolicitarProrrogaDto,
  SolicitarReanudacionDto,
  SolicitarSuspensionDto,
  SolicitarTerminacionDto,
  SolicitarRespaldoDto,
} from './dto/modificaciones.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_EJECUCION,
  ROLES_MODIFICACIONES,
  ROLES_RESPALDO_ADICION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { ObjetoInmutableGuard } from './objeto-inmutable.guard';

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1176).
 *
 * Dos competencias en la misma actividad, y a propósito: el trámite de la
 * modificación es de la Dirección de Contratación, pero el CDP y el RP que la
 * respaldan son de la Dirección Financiera, igual que los del contrato. La
 * adición no cambia de quién es cada cosa.
 */
@ApiTags('Etapa 9 · Modificaciones contractuales')
@Controller('procesos/:id/modificaciones')
// La regla del objeto (RF-MOD-04, EFDS-1179) cubre el controlador entero y no
// ruta por ruta: el criterio es «cualquier trámite de modificación
// contractual», y una ruta nueva queda protegida sin acordarse de ella.
@UseGuards(ObjetoInmutableGuard)
export class ModificacionesController {
  constructor(private readonly service: ModificacionesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Estado de las modificaciones del contrato',
    description:
      'El tope, cuánto cabe todavía y las modificaciones con su respaldo presupuestal y su publicación.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('adiciones')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Solicitar una adición en dinero',
    description:
      'Sobre un contrato en ejecución. Queda en trámite: aprobarla exige después el CDP y el RP expedidos.',
  })
  solicitarAdicion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarAdicionDto,
    @Req() req: any,
  ) {
    return this.service.solicitarAdicion(procesoId, dto, getHiringAccess(req));
  }

  // ------------------------------- los demas tipos (EFDS-1177 y EFDS-1178) --

  @Post('prorrogas')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Solicitar una prórroga en tiempo',
    description:
      'Extiende el plazo con justificación técnica y sin tocar el presupuesto (RF-MOD-02): no pide CDP ni RP.',
  })
  solicitarProrroga(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarProrrogaDto,
    @Req() req: any,
  ) {
    return this.service.solicitarProrroga(procesoId, dto, getHiringAccess(req));
  }

  @Post('cesiones')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Solicitar la cesión del contrato',
    description:
      'El contratista solo cambia al aprobarla, y el cedente queda registrado para saber a quién sustituyó.',
  })
  solicitarCesion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarCesionDto,
    @Req() req: any,
  ) {
    return this.service.solicitarCesion(procesoId, dto, getHiringAccess(req));
  }

  @Post('aclaratorios')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Solicitar un aclaratorio',
    description:
      'Precisa lo que el contrato ya dice: no cambia plazo, valor ni partes. Lo sustenta el acto que se adjunta al aprobarlo.',
  })
  solicitarAclaratorio(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarAclaratorioDto,
    @Req() req: any,
  ) {
    return this.service.solicitarAclaratorio(procesoId, dto, getHiringAccess(req));
  }

  @Post('suspensiones')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Solicitar la suspensión del contrato',
    description:
      'Al aprobarla el contrato queda SUSPENDIDO (RF-SIS-01) y deja de admitir pagos y liquidación hasta que se reanude.',
  })
  solicitarSuspension(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarSuspensionDto,
    @Req() req: any,
  ) {
    return this.service.solicitarSuspension(procesoId, dto, getHiringAccess(req));
  }

  @Post('reanudaciones')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Reanudar el contrato suspendido',
    description:
      'Levanta la suspensión vigente, devuelve el contrato a ejecución y le suma al plazo los días que estuvo detenido.',
  })
  solicitarReanudacion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarReanudacionDto,
    @Req() req: any,
  ) {
    return this.service.solicitarReanudacion(procesoId, dto, getHiringAccess(req));
  }

  @Post('terminaciones')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Actividad 9.5 · Terminar el contrato anticipadamente',
    description:
      'Por mutuo acuerdo o por decisión unilateral motivada. Al aprobarla el contrato queda TERMINADO y lo que sigue es liquidar lo ejecutado. Terminar por incumplimiento no es esto: es el proceso sancionatorio.',
  })
  solicitarTerminacion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarTerminacionDto,
    @Req() req: any,
  ) {
    return this.service.solicitarTerminacion(procesoId, dto, getHiringAccess(req));
  }

  // ------------------------------------------- el CDP y el RP de la adición --

  @Post(':modificacionId/respaldo/:tipo')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_RESPALDO_ADICION)
  @ApiOperation({
    summary: 'Solicitar el CDP o el RP de la adición',
    description:
      'Mismo ciclo que el CDP del proceso y el RP del contrato: solicitar, verificar, expedir o rechazar.',
  })
  solicitarRespaldo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Param('tipo') tipo: string,
    @Body() dto: SolicitarRespaldoDto,
    @Req() req: any,
  ) {
    return this.service.solicitarRespaldo(
      procesoId,
      modificacionId,
      this.exigirTipo(tipo),
      dto,
      getHiringAccess(req),
    );
  }

  @Post(':modificacionId/respaldo/:tipo/verificar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_RESPALDO_ADICION)
  @ApiOperation({ summary: 'Verificar la disponibilidad del CDP o del RP de la adición' })
  verificarRespaldo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Param('tipo') tipo: string,
    @Req() req: any,
  ) {
    return this.service.verificarRespaldo(
      procesoId,
      modificacionId,
      this.exigirTipo(tipo),
      getHiringAccess(req),
    );
  }

  @Post(':modificacionId/respaldo/:tipo/expedir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_RESPALDO_ADICION)
  @ApiOperation({ summary: 'Expedir el CDP o el RP de la adición' })
  expedirRespaldo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Param('tipo') tipo: string,
    @Body() dto: ExpedirRespaldoDto,
    @Req() req: any,
  ) {
    return this.service.expedirRespaldo(
      procesoId,
      modificacionId,
      this.exigirTipo(tipo),
      dto,
      getHiringAccess(req),
    );
  }

  @Post(':modificacionId/respaldo/:tipo/rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_RESPALDO_ADICION)
  @ApiOperation({
    summary: 'Rechazar el CDP o el RP de la adición',
    description: 'Por falta de disponibilidad en el rubro. Se puede volver a solicitar.',
  })
  rechazarRespaldo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Param('tipo') tipo: string,
    @Body() dto: RechazarRespaldoDto,
    @Req() req: any,
  ) {
    return this.service.rechazarRespaldo(
      procesoId,
      modificacionId,
      this.exigirTipo(tipo),
      dto,
      getHiringAccess(req),
    );
  }

  // ------------------------------------------------------------ aprobación --

  @Post(':modificacionId/aprobar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acto de la modificación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Aprobar la modificación',
    description:
      'Exige el CDP y el RP expedidos y que la adición quepa en el tope. Aumenta el valor del contrato.',
  })
  async aprobar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: AprobarModificacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El acto firmado es obligatorio: aprobar sin documento dejaría al
    // expediente afirmando algo que no puede probar.
    if (!file) {
      throw new BadRequestException(
        'Adjunta el otrosí o el acto administrativo firmado que soporta la modificación',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.aprobar(
        procesoId,
        modificacionId,
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

  @Post(':modificacionId/rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({ summary: 'Rechazar una modificación en trámite' })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: RechazarModificacionDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, modificacionId, dto, getHiringAccess(req));
  }

  @Post(':modificacionId/revocar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @ApiOperation({
    summary: 'Revocar una modificación aprobada',
    description:
      'El valor del contrato vuelve atrás. Los informes y las actas ya firmados no cambian: congelaron lo que era cierto ese día.',
  })
  revocar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: RevocarModificacionDto,
    @Req() req: any,
  ) {
    return this.service.revocar(procesoId, modificacionId, dto, getHiringAccess(req));
  }

  // ------------------------------------------------- publicación (RF-MOD-05) --

  @Post(':modificacionId/publicar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_MODIFICACIONES)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'La evidencia de la publicación se carga en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar la publicación de la modificación en SECOP II',
    description:
      'La publicación ocurre por fuera y aquí se transcribe con su soporte, que es obligatorio (RF-MOD-05).',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: PublicarModificacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la evidencia: sin soporte no hay publicación registrada, solo la afirmación de que se hizo',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.publicar(
        procesoId,
        modificacionId,
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

  /**
   * CDP o RP, y nada más.
   *
   * Va en la ruta y no en el cuerpo porque son dos trámites distintos sobre la
   * misma adición; validarlo aquí evita que un typo cree un respaldo de un tipo
   * que no existe.
   */
  private exigirTipo(tipo: string): TipoRespaldo {
    const normalizado = tipo?.toUpperCase();
    if (normalizado !== 'CDP' && normalizado !== 'RP') {
      throw new BadRequestException('El respaldo de la adición es CDP o RP');
    }
    return normalizado;
  }
}
