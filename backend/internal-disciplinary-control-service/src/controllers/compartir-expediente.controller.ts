import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { CompartirExpedienteService } from '../services/compartir-expediente.service';
import { CrearCompartidoDto, AccederCompartidoDto } from '../dtos/compartir-expediente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('compartir-expediente')
export class CompartirExpedienteController {
  constructor(
    private readonly compartirService: CompartirExpedienteService,
  ) {}

  /**
   * Crear un nuevo enlace compartido
   */
  @UseGuards(JwtAuthGuard)
  @Post(':procesoId')
  async crearCompartido(
    @Param('procesoId') procesoId: string,
    @Body() dto: CrearCompartidoDto,
    @Request() req: any,
  ) {
    const usuarioId = req.user?.id;
    const compartido = await this.compartirService.crearCompartido(procesoId, dto, usuarioId);

    return {
      id: compartido.id,
      token: compartido.tokenAcceso,
      url: this.compartirService.generarUrlPublica(compartido.tokenAcceso),
      urlQR: this.compartirService.generarUrlQR(compartido.tokenAcceso),
      tipoCompartido: compartido.tipoCompartido,
      requiereClave: compartido.requiereClave,
      tiempoExpiracionHoras: compartido.tiempoExpiracionHoras,
      fechaExpiracion: compartido.fechaExpiracion,
      emailDestinatario: compartido.emailDestinatario,
      createdAt: compartido.createdAt,
    };
  }

  /**
   * Listar todos los enlaces compartidos de un proceso
   */
  @UseGuards(JwtAuthGuard)
  @Get('proceso/:procesoId')
  async listarPorProceso(@Param('procesoId') procesoId: string) {
    const enlaces = await this.compartirService.listarPorProceso(procesoId);
    return enlaces.map((enlace) => ({
      id: enlace.id,
      token: enlace.tokenAcceso.substring(0, 8) + '...',
      tipoCompartido: enlace.tipoCompartido,
      estado: enlace.estado,
      requiereClave: enlace.requiereClave,
      tiempoExpiracionHoras: enlace.tiempoExpiracionHoras,
      fechaExpiracion: enlace.fechaExpiracion,
      contadorAccesos: enlace.contadorAccesos,
      ultimoAcceso: enlace.ultimoAcceso,
      createdAt: enlace.createdAt,
    }));
  }

  /**
   * Desactivar un enlace compartido
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/desactivar')
  async desactivar(@Param('id') id: string) {
    const enlace = await this.compartirService.desactivar(id);
    return {
      id: enlace.id,
      estado: enlace.estado,
      message: 'Enlace compartido desactivado exitosamente',
    };
  }

  /**
   * Verificar acceso a un enlace compartido (público)
   */
  @Public()
  @Post('verificar')
  async verificarAcceso(
    @Body() dto: AccederCompartidoDto,
    @Ip() ip: string,
  ) {
    return this.compartirService.verificarAcceso(dto, ip);
  }

  /**
   * Obtener datos públicos del expediente compartido (sin autenticación)
   * Este endpoint es público y retorna información básica del proceso
   */
  @Public()
  @Get('publico/:token')
  async obtenerExpedientePublico(@Param('token') token: string) {
    return this.compartirService.obtenerExpedientePublico(token);
  }

  /**
   * Página pública para ver el expediente compartido
   * Este endpoint devuelve los datos necesarios para renderizar la página pública
   */
  @Public()
  @Get('vista/:token')
  async obtenerVistaPublica(@Param('token') token: string) {
    return this.compartirService.obtenerExpedientePublico(token);
  }
}
