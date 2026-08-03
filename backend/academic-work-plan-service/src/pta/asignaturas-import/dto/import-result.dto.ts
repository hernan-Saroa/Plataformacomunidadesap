export class ImportCountDto {
  creados: number = 0;
  actualizados: number = 0;
  omitidos: number = 0;
}

export class ImportCargaDto {
  programas: ImportCountDto = new ImportCountDto();
  nucleos_tematicos: ImportCountDto = new ImportCountDto();
  cetaps: ImportCountDto = new ImportCountDto();
  ofertas_cetap_programa: ImportCountDto = new ImportCountDto();
  asignaturas: ImportCountDto = new ImportCountDto();
}

export class IndicadoresPtaDto {
  asignaturas_modalidad_sin_definir: number = 0;
  asignaturas_con_excepcion: number = 0;
  horas_pta_calculadas_promedio: number = 0;
  asignaturas_disponibles_por_dt: Record<string, number> = {};
}

export class ProgramRelationDto {
  codigo_programa: string;
  nombre_programa: string;
  asignaturas: Array<{
    codigo: string;
    nombre: string;
    creditos: number;
    pensum: string | null;
    valida: boolean;
  }> = [];
  cetaps: Array<{
    codigo: string;
    nombre_dt: string;
    valido: boolean;
  }> = [];
  valido: boolean = true;
  errores: string[] = [];
}

export class ImportResultDto {
  success: boolean;
  dry_run: boolean;
  periodo: string;
  tiempo_ms: number;
  carga: ImportCargaDto = new ImportCargaDto();
  indicadores_pta: IndicadoresPtaDto = new IndicadoresPtaDto();
  advertencias: string[] = [];
  errores: string[] = [];
  relaciones_cruzadas: ProgramRelationDto[] = [];
}
