import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  IsArray,
} from 'class-validator';

export class CreateConfigJornadaLaboralDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener el formato HH:mm (24 horas)',
  })
  horaInicio: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin / corte debe tener el formato HH:mm (24 horas)',
  })
  horaFin: string;

  @IsArray()
  diasLaborales: number[];

  @IsInt()
  @Min(1)
  @Max(90)
  diasAnticipacionMinima: number;

  @IsInt()
  @Min(1)
  @Max(90)
  diasUmbralAvance: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class UpdateConfigJornadaLaboralDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener el formato HH:mm (24 horas)',
  })
  horaInicio?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin / corte debe tener el formato HH:mm (24 horas)',
  })
  horaFin?: string;

  @IsArray()
  @IsOptional()
  diasLaborales?: number[];

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  diasAnticipacionMinima?: number;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  diasUmbralAvance?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
