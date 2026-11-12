import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface RawKlicContratoRow {
  'N CONTRATO'?: string | null;
  'N IDENTIFICACION'?: string | null;
  NOMBRE?: string | null;
  'FECHA INICIAL'?: Date | string | null;
  'FECHA FINAL'?: Date | string | null;
  CDP?: string | null;
  RP?: string | null;
  'VALOR CONTRATO'?: number | string | null;
  'ID AREA'?: number | string | null;
  ID_AREA?: number | string | null;
  AREA?: string | null;
  AFECTACIÓN?: string | null;
  AFECTACION?: string | null;
  'CUENTA BANCARIA'?: string | null;
  TotalCount?: number | null;
}

export class KlicContratoDto {
  @ApiProperty({ description: 'Número de contrato en Klic', example: 'BOG-1222-2024' })
  numeroContrato: string;

  @ApiProperty({ description: 'Número de identificación del contratista', example: '1118562823' })
  numeroIdentificacion: string;

  @ApiProperty({ description: 'Nombre completo del funcionario/contratista', example: 'JUAN DAVID MORALES ALFONSO' })
  nombre: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio del contrato', example: '2024-09-16T05:00:00.000Z' })
  fechaInicial?: string | null;

  @ApiPropertyOptional({ description: 'Fecha de terminación del contrato', example: '2024-12-31T05:00:00.000Z' })
  fechaFinal?: string | null;

  @ApiPropertyOptional({ description: 'Número de Certificado de Disponibilidad Presupuestal (CDP)', example: '157824' })
  cdp?: string | null;

  @ApiPropertyOptional({ description: 'Número de Registro Presupuestal (RP)', example: '480024' })
  rp?: string | null;

  @ApiPropertyOptional({ description: 'Valor total del contrato', example: 1000000 })
  valorContrato?: number | null;

  @ApiPropertyOptional({ description: 'ID interno del área en Klic', example: 14 })
  idArea?: number | string | null;

  @ApiPropertyOptional({ description: 'Área o dependencia asociada al contrato', example: 'OFICINA DE LAS TECNOLOGIAS DE LA INFORMACION' })
  area?: string | null;

  @ApiPropertyOptional({ description: 'Tipo de afectación de recursos', example: 'INVERSION' })
  afectacion?: string | null;

  @ApiPropertyOptional({ description: 'Número de cuenta bancaria registrada', example: '1234567890' })
  cuentaBancaria?: string | null;
}

export function mapRawRowToKlicContratoDto(row: RawKlicContratoRow): KlicContratoDto {
  const parseFecha = (val: Date | string | null | undefined): string | null => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    return String(val);
  };

  const parseNumero = (val: number | string | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  return {
    numeroContrato: String(row['N CONTRATO'] ?? '').trim(),
    numeroIdentificacion: String(row['N IDENTIFICACION'] ?? '').trim(),
    nombre: String(row.NOMBRE ?? '').trim(),
    fechaInicial: parseFecha(row['FECHA INICIAL']),
    fechaFinal: parseFecha(row['FECHA FINAL']),
    cdp: row.CDP !== null && row.CDP !== undefined ? String(row.CDP).trim() : null,
    rp: row.RP !== null && row.RP !== undefined ? String(row.RP).trim() : null,
    valorContrato: parseNumero(row['VALOR CONTRATO']),
    idArea: row['ID AREA'] ?? row.ID_AREA ?? null,
    area: row.AREA !== null && row.AREA !== undefined ? String(row.AREA).trim() : null,
    afectacion:
      row.AFECTACION !== null && row.AFECTACION !== undefined
        ? String(row.AFECTACION).trim()
        : row.AFECTACIÓN !== null && row.AFECTACIÓN !== undefined
          ? String(row.AFECTACIÓN).trim()
          : null,
    cuentaBancaria:
      row['CUENTA BANCARIA'] !== null && row['CUENTA BANCARIA'] !== undefined
        ? String(row['CUENTA BANCARIA']).trim()
        : null,
  };
}

