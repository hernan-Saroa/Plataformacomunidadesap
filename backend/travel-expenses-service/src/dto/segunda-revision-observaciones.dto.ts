import { IsOptional, IsString, Length } from 'class-validator';

/**
 * DTO compartido para las acciones de segunda revisión (RF-REV-002).
 *
 * - Aprobación (`verify-second-level`): el campo `observaciones` es opcional.
 *   El revisor puede dejar una nota de auditoría sin que el flujo sea bloqueado.
 * - Devolución (`return-to-analyst`): el campo `observaciones` es obligatorio
 *   y debe tener entre 3 y 1000 caracteres. La validación estricta se aplica
 *   en el servicio para evitar que un body vacío abra la transacción.
 */
export class SegundaRevisionObservacionesDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  observaciones?: string;
}
