/**
 * DTO para el desglose diario del cálculo de viáticos.
 */
export class DesgloseDiaDto {
  dia: number;
  fecha: string;
  valor: number;
  pernocta: boolean;
}

/**
 * DTO de respuesta para la autoliquidación de viáticos.
 */
export class LiquidacionResponseDto {
  success: boolean;
  data: {
    salarioBaseAplicado: number;
    decretoAplicado: string;
    tarifaDiariaBase: number;
    factorComisionado: number;
    factorPernocta: number;
    tarifaFinalAplicadaDia: number;
    numeroDiasNoches: number;
    valorTotalViaticos: number;
    // Campos estructurados según Formato GF-FO-023
    diasPernoctados?: number;
    tarifaDiaPernoctado?: number;
    totalPernoctados?: number;
    diasNoPernoctados?: number;
    tarifaDiaNoPernoctado?: number;
    totalNoPernoctados?: number;
    // Sección 4 GF-FO-023: Liquidación de los Gastos de Desplazamiento
    transporteTerminalesAereos?: number;
    transporteTerrestreFluvial?: number;
    totalGastosDesplazamiento?: number;
    totalViaticosYDesplazamientos?: number;
    desgloseCalculo: DesgloseDiaDto[];
    alertas?: string[];
  };
}
