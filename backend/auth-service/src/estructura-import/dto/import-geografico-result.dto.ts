import { DataQualityError } from '../validators/geografico.validator';

export class ImportGeograficoResultDto {
  success: boolean;
  dry_run: boolean;
  tiempo_ms: number;
  carga: {
    direcciones_territoriales: { creados: number };
    cetaps: { creados: number };
  };
  indicadores: {
    cetaps_por_tipo: Record<string, number>;
    cetaps_por_dt: Record<string, number>;
  };
  advertencias: string[];
  errores: DataQualityError[];
  preview_territoriales: any[];
  preview_cetaps: any[];

  constructor() {
    this.success = false;
    this.dry_run = true;
    this.tiempo_ms = 0;
    this.carga = {
      direcciones_territoriales: { creados: 0 },
      cetaps: { creados: 0 },
    };
    this.indicadores = {
      cetaps_por_tipo: {},
      cetaps_por_dt: {},
    };
    this.advertencias = [];
    this.errores = [];
    this.preview_territoriales = [];
    this.preview_cetaps = [];
  }
}
