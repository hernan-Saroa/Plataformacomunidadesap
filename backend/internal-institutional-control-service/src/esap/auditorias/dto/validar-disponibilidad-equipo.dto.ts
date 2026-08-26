import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidarDisponibilidadEquipoDto {
  @IsArray()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value
          .map((item: any) => {
            if (!item) return '';
            if (typeof item === 'string') return item.trim();
            if (typeof item === 'object') {
              return String(item.personaId || item.id || item.idTercero || item.idPerson || '').trim();
            }
            return String(item).trim();
          })
          .filter((id): id is string => Boolean(id && id.length > 0))
      )
    );
  })
  @IsString({ each: true })
  @IsOptional()
  equipoAuditores?: string[];

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsUUID()
  @IsOptional()
  excludeAuditoriaId?: string;
}
