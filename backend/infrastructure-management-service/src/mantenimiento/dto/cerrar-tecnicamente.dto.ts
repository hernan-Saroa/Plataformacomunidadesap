import {
  IsString,
  IsOptional,
  IsNumber,
  MinLength,
  Min,
  IsArray,
  IsBoolean,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EvidenciaCierreDto {
  @ApiProperty({ example: 'foto-antes.jpg' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 204800 })
  @IsNumber()
  size: number;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  type: string;

  @ApiProperty({
    example:
      'https://minio.esap.local:9100/mantenimiento/cierre-tecnico/9d970cb4/foto-antes.jpg',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'mantenimiento' })
  @IsString()
  @IsOptional()
  bucket?: string;

  @ApiPropertyOptional({
    example: 'cierre-tecnico/9d970cb4/foto-antes.jpg',
  })
  @IsString()
  @IsOptional()
  key?: string;
}

export class CerrarTecnicamenteDto {
  @ApiProperty({
    type: [EvidenciaCierreDto],
    description:
      'Evidencia fotográfica/video de finalización. Mínimo 1 archivo, máximo 5. Subidos vía mantenimiento/evidencias/upload MinIO.',
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Evidencia fotográfica obligatoria: mínimo 1 archivo',
  })
  @ValidateNested({ each: true })
  @Type(() => EvidenciaCierreDto)
  evidencias: EvidenciaCierreDto[];

  @ApiProperty({
    example:
      'Se cambió tomacorriente defectuoso, se probó conectividad energética OK y se entregó llave cerradura. Todo OK.',
    minLength: 15,
  })
  @IsString()
  @MinLength(15, {
    message: 'Descripción del trabajo realizado mínimo 15 caracteres',
  })
  trabajoRealizado: string;

  @ApiPropertyOptional({
    example: 'Usuario reporta que en horas nocturnas hay ruido en la ventana',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({
    example: 0,
    description:
      'Costo final real en COP (incluye MO y materiales propios). Si 0 indicar materiales de inventario UMI.',
    default: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Costo final efectivo no puede ser negativo' })
  costoFinalEfectivoCop: number;

  @ApiProperty({
    example: false,
    description:
      'True si este cierre requiere seguimiento futuro en conformidad (EFDS-1737) o BI.',
    default: false,
  })
  @IsBoolean()
  requiereSeguimiento: boolean;
}

export class CierreTecnicoResponse {
  cerrado: boolean;
  idSolicitud: string;
  consecutivo?: string;
  fechaCierreTecnico?: Date;
  usuarioCierreTecnicoId?: string;
  responsableCierreDisplay?: string;
  trabajoRealizado?: string;
  observacionesCierre?: string;
  costoFinalEfectivoCop: number;
  evidenciasCierre: Array<Record<string, any>>;
  requiereSeguimiento: boolean;
}
