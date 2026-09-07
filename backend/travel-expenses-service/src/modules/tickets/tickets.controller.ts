import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketsService, TicketValidationResult } from './tickets.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import {
  ValidateTicketDto,
  CreateSaldoTiqueteDto,
  UpdateSaldoTiqueteDto,
  CreateRutaRestringidaDto,
  UpdateRutaRestringidaDto,
  CrearExcepcionTiqueteDto,
  ReservarSaldoTiqueteDto,
  LiberarSaldoTiqueteDto,
  UpdateHolguraTiqueteDto,
} from '../../dto/tickets/tickets.dto';

/**
 * API REST de gestión de tiquetes con restricciones y saldo presupuestal
 * (RF-LIQ-003 / RF-LIQ-004).
 *
 * Tag Swagger: `tickets`.
 */
@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Valida proactivamente si una solicitud de tiquete aéreo es viable
   * (ruta restringida + saldo presupuestal + holgura de mercado).
   * Usado por el frontend antes de permitir la radicación.
   */
  @Post('validate')
  @Permissions('travel_expenses:read')
  @ApiOperation({
    summary: 'Valida ruta restringida y saldo presupuestal para tiquetes',
    description:
      'Ejecuta las reglas de negocio RF-LIQ-003/004 y devuelve el nivel de ' +
      'semáforo (VERDE/AMARILLO/ROJO) junto con los flags que el frontend ' +
      'consume para forzar transporte terrestre o exigir PDF de excepción.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de validación (no muta el saldo).',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async validar(
    @Body() dto: ValidateTicketDto,
  ): Promise<TicketValidationResult> {
    return this.ticketsService.validarTiquete(dto);
  }

  /**
   * Reserva saldo presupuestal al radicar la comisión.
   * Usa `SELECT ... FOR UPDATE` para prevenir sobregiros concurrentes.
   */
  @Post('reservar')
  @Permissions('travel_expenses:create_request')
  @ApiOperation({ summary: 'Reserva saldo presupuestal con bloqueo pesimista' })
  @ApiResponse({ status: 200, description: 'Saldo actualizado correctamente.' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente.' })
  @ApiResponse({
    status: 404,
    description: 'Dependencia sin configuración de saldo.',
  })
  async reservarSaldo(@Body() dto: ReservarSaldoTiqueteDto) {
    return this.ticketsService.reservarSaldo(dto);
  }

  @Post('liberar')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Libera una reserva de saldo previa' })
  async liberarSaldo(@Body() dto: LiberarSaldoTiqueteDto) {
    return this.ticketsService.liberarSaldo(dto);
  }

  // ---------- Excepciones ----------

  @Post('excepciones')
  @Permissions('travel_expenses:create_request')
  @ApiOperation({
    summary: 'Registra una excepción (ruta corta o presupuesto agotado)',
  })
  registrarExcepcion(@Body() dto: CrearExcepcionTiqueteDto) {
    return this.ticketsService.registrarExcepcion(dto);
  }

  @Get('excepciones/:solicitudId')
  @Permissions('travel_expenses:read')
  @ApiOperation({
    summary: 'Lista las excepciones registradas para una solicitud',
  })
  listarExcepciones(@Param('solicitudId') solicitudId: string) {
    return this.ticketsService.obtenerExcepcionesPorSolicitud(solicitudId);
  }

  // ---------- Parámetro global de holgura (RF-LIQ-004) ----------

  @Get('config/holgura')
  @Permissions('travel_expenses:read')
  @ApiOperation({
    summary:
      'Obtiene el porcentaje de holgura global aplicado a las reservas de tiquetes',
    description:
      'RF-LIQ-004. Margen de holgura parametrizable (default 15%) que absorbe ' +
      'la volatilidad del precio del tiquete entre la radicación y la emisión.',
  })
  obtenerHolgura() {
    return this.ticketsService.obtenerParametroHolgura();
  }

  @Put('config/holgura')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({
    summary: 'Actualiza el porcentaje de holgura global (0-100)',
    description:
      'Persiste en travel_expenses.liquidation_params con clave ' +
      'HOLGURA_TIQUETES_PORCENTAJE. Aplica a todas las dependencias que ' +
      'no tengan un valor explícito en su columna holgura_porcentaje.',
  })
  @ApiResponse({ status: 200, description: 'Parámetro actualizado.' })
  @ApiResponse({ status: 400, description: 'Valor fuera del rango 0-100.' })
  actualizarHolgura(@Body() dto: UpdateHolguraTiqueteDto) {
    return this.ticketsService.actualizarParametroHolgura(dto.holguraPorcentaje);
  }

  // ---------- Saldos (CRUD) ----------

  @Get('saldos')
  @Permissions('travel_expenses:read')
  @ApiOperation({ summary: 'Lista los saldos de tiquetes por dependencia' })
  obtenerSaldos() {
    return this.ticketsService.obtenerSaldos();
  }

  @Get('saldos/:dependenciaId')
  @Permissions('travel_expenses:read')
  @ApiOperation({ summary: 'Obtiene el saldo de una dependencia específica' })
  obtenerSalporDep(@Param('dependenciaId') dependenciaId: string) {
    return this.ticketsService.obtenerSaldoPorDependencia(dependenciaId);
  }

  @Post('saldos')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Crea un saldo presupuestal para una dependencia' })
  crearSaldo(@Body() dto: CreateSaldoTiqueteDto) {
    return this.ticketsService.crearSaldo(dto);
  }

  @Put('saldos/:id')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({
    summary: 'Actualiza un saldo existente (cupo, holgura, activo)',
  })
  actualizarSaldo(@Param('id') id: string, @Body() dto: UpdateSaldoTiqueteDto) {
    return this.ticketsService.actualizarSaldo(id, dto);
  }

  @Delete('saldos/:id')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Desactiva un saldo' })
  eliminarSaldo(@Param('id') id: string) {
    return this.ticketsService.eliminarSaldo(id);
  }

  // ---------- Rutas restringidas (CRUD) ----------

  @Get('rutas-restringidas')
  @Permissions('travel_expenses:read')
  @ApiOperation({ summary: 'Lista las rutas restringidas activas' })
  obtenerRutas() {
    return this.ticketsService.obtenerRutasRestringidas();
  }

  @Post('rutas-restringidas')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Crea una nueva ruta restringida' })
  crearRuta(@Body() dto: CreateRutaRestringidaDto) {
    return this.ticketsService.crearRutaRestringida(dto);
  }

  @Put('rutas-restringidas/:id')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Actualiza una ruta restringida' })
  actualizarRuta(
    @Param('id') id: string,
    @Body() dto: UpdateRutaRestringidaDto,
  ) {
    return this.ticketsService.actualizarRutaRestringida(Number(id), dto);
  }

  @Delete('rutas-restringidas/:id')
  @Permissions('travel_expenses:manage_config')
  @ApiOperation({ summary: 'Desactiva una ruta restringida' })
  eliminarRuta(@Param('id') id: string) {
    return this.ticketsService.eliminarRutaRestringida(Number(id));
  }
}
