import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsUUID,
  IsPositive,
  IsBoolean,
  Min,
  Max,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Tipos de transporte soportados por el endpoint de validación de tiquetes.
 * Coinciden con los valores del selector `MedioTransporte` del MFE.
 */
export type TipoTransporte = 'AEREO' | 'TERRESTRE';

/**
 * Payload de entrada del endpoint `POST /api/v1/tickets/validate`.
 * Ejecuta validación proactiva de ruta restringida y disponibilidad
 * presupuestal antes de la radicación de la comisión.
 */
export class ValidateTicketDto {
  @IsString()
  @Length(1, 100)
  dependenciaId: string;

  @IsString()
  @Length(1, 100)
  origenCiudad: string;

  @IsString()
  @Length(1, 100)
  destinoCiudad: string;

  @IsIn(['AEREO', 'TERRESTRE'])
  tipoTransporte: TipoTransporte;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoEstimadoTiquete: number;

  /**
   * Origen geográfico de la dependencia para ciudades con prefijo (ej. "Bogotá D.C.").
   * Se conserva como etiqueta informativa; la comparación contra `rutas_restringidas`
   * se hace en mayúsculas y sin acentos.
   */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  sedeOrigen?: string;
}

/**
 * Payload para reservar saldo presupuestal al radicar la comisión.
 * Se ejecuta dentro de la transacción de finalización para evitar
 * sobregiros concurrentes (SELECT ... FOR UPDATE).
 */
export class ReservarSaldoTiqueteDto {
  @IsUUID()
  solicitudId: string;

  @IsString()
  @Length(1, 100)
  dependenciaId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoEstimadoTiquete: number;
}

/**
 * Payload para liberar una reserva previa (p. ej. cuando se rechaza
 * o se anula una solicitud antes de la compra del tiquete).
 */
export class LiberarSaldoTiqueteDto {
  @IsUUID()
  solicitudId: string;

  @IsString()
  @Length(1, 100)
  dependenciaId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoEstimadoTiquete: number;
}

/**
 * Payload para registrar una excepción firmada por Dirección Nacional o Sindicato.
 */
export class CrearExcepcionTiqueteDto {
  @IsUUID()
  solicitudId: string;

  @IsIn(['RUTA_CORTA', 'PRESUPUESTO_AGOTADO'])
  tipoExcepcion: 'RUTA_CORTA' | 'PRESUPUESTO_AGOTADO';

  @IsIn(['DIRECTOR_NACIONAL', 'SINDICATO'])
  autorizadoPor: 'DIRECTOR_NACIONAL' | 'SINDICATO';

  @IsString()
  @Length(1, 100)
  numeroDocumentoSoporte: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  documentoSoporteUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comentarios?: string;
}

/**
 * DTOs para la administración de saldos (CRUD parametrizable).
 */
export class CreateSaldoTiqueteDto {
  @IsString()
  @Length(1, 100)
  dependenciaId: string;

  @IsString()
  @Length(1, 150)
  nombreDependencia: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  presupuestoInicial: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  holguraPorcentaje?: number;
}

export class UpdateSaldoTiqueteDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nombreDependencia?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  presupuestoInicial?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  holguraPorcentaje?: number;

  @IsOptional()
  activo?: boolean;
}

/**
 * DTOs para el CRUD de rutas restringidas (parametrización).
 *
 * `descripcionRestriccion` es opcional: si el cliente no la envía o envía
 * un string vacío, el servicio aplica un texto por defecto alineado con
 * la HU ("Ruta corta restringida. Requiere autorización del Director
 * Nacional o Sindicato."). Esto evita errores 400 del ValidationPipe
 * cuando el campo viene en blanco.
 */
export class CreateRutaRestringidaDto {
  @IsString()
  @Length(1, 100)
  origenCiudad: string;

  @IsString()
  @Length(1, 100)
  destinoCiudad: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(255)
  descripcionRestriccion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateRutaRestringidaDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  origenCiudad?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  destinoCiudad?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(255)
  descripcionRestriccion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/**
 * DTO para actualizar el porcentaje de holgura global aplicado a la
 * reserva presupuestal de tiquetes (RF-LIQ-004).
 *
 * Se persiste en `travel_expenses.liquidation_params` con la clave
 * `HOLGURA_TIQUETES_PORCENTAJE`. Aplica a todas las dependencias que no
 * tengan un valor explícito en su columna `holgura_porcentaje`.
 */
export class UpdateHolguraTiqueteDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  holguraPorcentaje: number;
}
