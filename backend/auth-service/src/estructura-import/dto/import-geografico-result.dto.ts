import { DataQualityError } from '../validators/geografico.validator';

export class ImportGeograficoResultDto {
  success: boolean;
  message?: string;
  dry_run: boolean;
  skip_invalid: boolean;
  tiempo_ms: number;
  carga: {
    direcciones_territoriales: { creados: number; actualizados: number; omitidos: number };
    cetaps: { creados: number; actualizados: number; omitidos: number };
  };
  indicadores: {
    cetaps_por_tipo: Record<string, number>;
    cetaps_por_dt: Record<string, number>;
  };
  advertencias: DataQualityError[];
  errores: DataQualityError[];
  has_blocking_errors: boolean;
  preview_territoriales: any[];
  preview_cetaps: any[];
  /** Filas que se omitieron por errores */
  omitidas_territoriales: any[];
  omitidas_cetaps: any[];
  sincronizacion_legacy: {
    seccionales: { creadas: number; actualizadas: number; sin_cambios: number };
    sedes: { creadas: number; actualizadas: number; sin_cambios: number };
    registros_legacy_conservados: {
      seccionales: number;
      sedes: number;
    };
  };

  constructor() {
    this.success = false;
    this.dry_run = true;
    this.skip_invalid = false;
    this.tiempo_ms = 0;
    this.carga = {
      direcciones_territoriales: { creados: 0, actualizados: 0, omitidos: 0 },
      cetaps: { creados: 0, actualizados: 0, omitidos: 0 },
    };
    this.indicadores = {
      cetaps_por_tipo: {},
      cetaps_por_dt: {},
    };
    this.advertencias = [];
    this.errores = [];
    this.has_blocking_errors = false;
    this.preview_territoriales = [];
    this.preview_cetaps = [];
    this.omitidas_territoriales = [];
    this.omitidas_cetaps = [];
    this.sincronizacion_legacy = {
      seccionales: { creadas: 0, actualizadas: 0, sin_cambios: 0 },
      sedes: { creadas: 0, actualizadas: 0, sin_cambios: 0 },
      registros_legacy_conservados: { seccionales: 0, sedes: 0 },
    };
  }
}
