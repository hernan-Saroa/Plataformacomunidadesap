import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TarjetaDigitalService } from './tarjeta-digital.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions, Public } from '../../auth/auth.decorators';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';

@ApiTags('Tarjeta Digital RUND')
@Controller('tarjeta-digital')
export class TarjetaDigitalController {
  constructor(private readonly tarjetaService: TarjetaDigitalService) {}

  @Post('docente/:idDocente/emitir')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('rund.export')
  @ApiOperation({ summary: 'Emitir y generar Tarjeta Digital RUND con código QR' })
  async emitirTarjeta(
    @Param('idDocente') idDocente: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tarjetaService.emitirTarjeta(idDocente, user?.id);
  }

  @Get('verificar/:codigoVerificacion')
  @Public()
  @ApiOperation({ summary: 'Verificación pública de autenticidad de tarjeta RUND por código' })
  async verificarTarjeta(@Param('codigoVerificacion') codigoVerificacion: string) {
    return this.tarjetaService.verificarTarjeta(codigoVerificacion);
  }
}
