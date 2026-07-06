export enum FuncionPTA {
  DOCENCIA = 'DOCENCIA',
  INVESTIGACION = 'INVESTIGACION',
  EXTENSION = 'EXTENSION',
  COMPLEMENTARIAS = 'COMPLEMENTARIAS',
  ACADEMICO_ADMIN = 'ACADEMICO_ADMIN',
}

export interface HorasSolicitadas {
  [FuncionPTA.DOCENCIA]: number;
  [FuncionPTA.INVESTIGACION]: number;
  [FuncionPTA.EXTENSION]: number;
  [FuncionPTA.COMPLEMENTARIAS]: number;
  [FuncionPTA.ACADEMICO_ADMIN]: number;
}

export interface DetalleFuncion {
  funcion: string;
  solicitado: number;
  tope: number;
  asignado: number;
  excedido: number;
  prorrateada: boolean;
}

export interface ResultadoProrrateo {
  horasPta: number;
  detalle: DetalleFuncion[];
  totalSolicitado: number;
  totalAsignado: number;
  totalExcedido: number;
  huboProrrateo: boolean;
  porcentajeProgramacion: number;
  requiereRevisionPorDeficit: boolean;
}

export interface ProrrateoRules {
  max_pct_investigacion: number;
  max_pct_extension: number;
  max_pct_complementarias: number;
  // docencia y acad_admin no tienen tope porcentual, siempre es 1.0 (100%)
}

/**
 * Calcula el prorrateo aplicando el recorte independiente por función
 * (Truncamiento del excedente, igual al Excel vigente) y luego topando el total.
 */
export function calcularProrrateo(
  solicitadas: HorasSolicitadas,
  horasPta: number,
  rules?: ProrrateoRules
): ResultadoProrrateo {
  const safeRules = rules || { max_pct_investigacion: 50, max_pct_extension: 25, max_pct_complementarias: 25 };
  
  const factoresTope: Record<FuncionPTA, number> = {
    [FuncionPTA.DOCENCIA]: 1.0, // Sin tope, siempre 100%
    [FuncionPTA.INVESTIGACION]: safeRules.max_pct_investigacion / 100,
    [FuncionPTA.EXTENSION]: safeRules.max_pct_extension / 100,
    [FuncionPTA.COMPLEMENTARIAS]: safeRules.max_pct_complementarias / 100,
    [FuncionPTA.ACADEMICO_ADMIN]: 1.0, // Sin tope
  };

  const labels: Record<FuncionPTA, string> = {
    [FuncionPTA.DOCENCIA]: 'Docencia',
    [FuncionPTA.INVESTIGACION]: 'Investigación',
    [FuncionPTA.EXTENSION]: 'Extensión',
    [FuncionPTA.COMPLEMENTARIAS]: 'Complementarias',
    [FuncionPTA.ACADEMICO_ADMIN]: 'Académico-Admin',
  };

  const detalle: DetalleFuncion[] = Object.values(FuncionPTA).map((funcion) => {
    const fn = funcion as FuncionPTA;
    const solicitado = solicitadas[fn] || 0;
    const tope = Math.round(factoresTope[fn] * horasPta);
    const asignado = Math.min(solicitado, tope);
    const excedido = Math.max(solicitado - tope, 0);

    return {
      funcion: labels[fn],
      solicitado,
      tope,
      asignado,
      excedido,
      prorrateada: excedido > 0,
    };
  });

  const totalSolicitado = detalle.reduce((acc, d) => acc + d.solicitado, 0);
  const sumaAsignada = detalle.reduce((acc, d) => acc + d.asignado, 0);
  // El backend u otros pueden requerir que el PTA no exceda horasPta.
  // Pero aquí permitimos que si se pasa sumando los topes, se reporte tal cual, 
  // o lo topamos a horasPta globalmente?
  // Generalmente las reglas topan cada uno. Si la suma de topados excede horasPta,
  // el PTA form va a dejar pasar y reportarlo. Para reflejar la realidad del recorte:
  const totalAsignado = Math.min(sumaAsignada, horasPta);
  const totalExcedido = Math.max(totalSolicitado - totalAsignado, 0);

  return {
    horasPta,
    detalle,
    totalSolicitado,
    totalAsignado,
    totalExcedido,
    huboProrrateo: detalle.some((d) => d.prorrateada) || totalSolicitado > horasPta,
    porcentajeProgramacion: horasPta > 0 ? totalAsignado / horasPta : 0,
    requiereRevisionPorDeficit: totalSolicitado < horasPta,
  };
}
