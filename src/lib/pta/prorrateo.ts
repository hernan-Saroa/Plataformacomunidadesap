/**
 * ALGORITMO DE PRORRATEO - PTA
 * Basado en: Sistema_Gestion_Profesoral_5_Componentes_V7_Expandido.md
 * 
 * REGLA FUNDAMENTAL:
 * DOCENCIA ES SAGRADA - NUNCA SE MODIFICA
 * Solo se prorratean Investigación, Extensión y Complementarias
 */

export interface ComponentesPTA {
  docencia: number;
  investigacion: number;
  extension: number;
  complementarias: number;
}

export interface ResultadoProrrateo {
  original: ComponentesPTA;
  prorrateado: ComponentesPTA;
  factorProrrateo: number;
  seAplicoProrrateo: boolean;
  detalles: string[];
  horasBase: number;
  totalOriginal: number;
  totalFinal: number;
}

/**
 * ALGORITMO DE PRORRATEO
 * 
 * ENTRADA:
 * ├── Horas Base (800 o 1600)
 * ├── Total Docencia (FIJO, no se modifica)
 * ├── Total Investigación (antes de tope)
 * ├── Total Extensión (antes de tope)
 * └── Total Complementarias (antes de tope)
 * 
 * PROCESO:
 * 1. Calcular horas disponibles después de docencia:
 *    DISPONIBLES = HORAS_BASE - DOCENCIA
 * 
 * 2. Calcular suma de otros componentes:
 *    OTROS = INV + EXT + COMP
 * 
 * 3. SI OTROS > DISPONIBLES:
 *    ├── Factor = DISPONIBLES / OTROS
 *    ├── INV_FINAL = INV × Factor (respetando tope 50%)
 *    ├── EXT_FINAL = EXT × Factor (respetando tope 25%)
 *    └── COMP_FINAL = COMP × Factor (respetando tope 25%)
 * 
 * 4. DOCENCIA NUNCA SE MODIFICA
 * 
 * SALIDA:
 * ├── Docencia: Original
 * ├── Investigación: Prorrateada
 * ├── Extensión: Prorrateada
 * └── Complementarias: Prorrateada
 */
export function aplicarProrrateo(
  horasBase: number,
  componentes: ComponentesPTA
): ResultadoProrrateo {
  const detalles: string[] = [];
  const original = { ...componentes };
  
  // Paso 1: Calcular total original
  const totalOriginal = 
    componentes.docencia + 
    componentes.investigacion + 
    componentes.extension + 
    componentes.complementarias;

  detalles.push(`PASO 1: Total original = ${totalOriginal}h`);
  detalles.push(`  • Docencia: ${componentes.docencia}h (INTOCABLE)`);
  detalles.push(`  • Investigación: ${componentes.investigacion}h`);
  detalles.push(`  • Extensión: ${componentes.extension}h`);
  detalles.push(`  • Complementarias: ${componentes.complementarias}h`);

  // Paso 2: Verificar si se necesita prorrateo
  if (totalOriginal <= horasBase) {
    detalles.push(`\nPASO 2: No se requiere prorrateo (${totalOriginal}h ≤ ${horasBase}h base)`);
    
    return {
      original,
      prorrateado: { ...componentes },
      factorProrrateo: 1.0,
      seAplicoProrrateo: false,
      detalles,
      horasBase,
      totalOriginal,
      totalFinal: totalOriginal
    };
  }

  detalles.push(`\nPASO 2: Se requiere prorrateo (${totalOriginal}h > ${horasBase}h base)`);
  
  // Paso 3: Calcular horas disponibles después de DOCENCIA
  const horasDisponibles = horasBase - componentes.docencia;
  detalles.push(`\nPASO 3: Horas disponibles después de Docencia`);
  detalles.push(`  DISPONIBLES = ${horasBase}h - ${componentes.docencia}h (docencia) = ${horasDisponibles}h`);

  if (horasDisponibles <= 0) {
    detalles.push(`\n⚠️ ADVERTENCIA: Docencia consume todas o más horas que las disponibles`);
    
    return {
      original,
      prorrateado: {
        docencia: componentes.docencia,
        investigacion: 0,
        extension: 0,
        complementarias: 0
      },
      factorProrrateo: 0,
      seAplicoProrrateo: true,
      detalles,
      horasBase,
      totalOriginal,
      totalFinal: componentes.docencia
    };
  }

  // Paso 4: Calcular suma de otros componentes
  const otrosComponentes = 
    componentes.investigacion + 
    componentes.extension + 
    componentes.complementarias;

  detalles.push(`\nPASO 4: Suma de otros componentes`);
  detalles.push(`  OTROS = ${componentes.investigacion}h + ${componentes.extension}h + ${componentes.complementarias}h = ${otrosComponentes}h`);

  // Paso 5: Calcular factor de prorrateo
  const factorProrrateo = horasDisponibles / otrosComponentes;
  detalles.push(`\nPASO 5: Calcular factor de prorrateo`);
  detalles.push(`  FACTOR = ${horasDisponibles}h (disponibles) / ${otrosComponentes}h (otros) = ${factorProrrateo.toFixed(4)}`);

  // Paso 6: Aplicar prorrateo respetando topes
  const topeInvestigacion = horasBase * 0.50; // 50%
  const topeExtension = horasBase * 0.25;     // 25%
  const topeComplementarias = horasBase * 0.25; // 25%

  detalles.push(`\nPASO 6: Aplicar prorrateo respetando topes`);
  detalles.push(`  Tope Investigación: ${topeInvestigacion}h (50% de ${horasBase}h)`);
  detalles.push(`  Tope Extensión: ${topeExtension}h (25% de ${horasBase}h)`);
  detalles.push(`  Tope Complementarias: ${topeComplementarias}h (25% de ${horasBase}h)`);

  // Investigación prorrateada
  const investigacionProrrateada = Math.min(
    componentes.investigacion * factorProrrateo,
    topeInvestigacion
  );
  
  // Extensión prorrateada
  const extensionProrrateada = Math.min(
    componentes.extension * factorProrrateo,
    topeExtension
  );
  
  // Complementarias prorrateadas
  const complementariasProrrateadas = Math.min(
    componentes.complementarias * factorProrrateo,
    topeComplementarias
  );

  detalles.push(`\nRESULTADO DEL PRORRATEO:`);
  detalles.push(`  • Docencia: ${componentes.docencia}h → ${componentes.docencia}h (INTOCABLE ✓)`);
  detalles.push(`  • Investigación: ${componentes.investigacion}h → ${investigacionProrrateada.toFixed(2)}h (${(factorProrrateo * 100).toFixed(1)}%)`);
  detalles.push(`  • Extensión: ${componentes.extension}h → ${extensionProrrateada.toFixed(2)}h (${(factorProrrateo * 100).toFixed(1)}%)`);
  detalles.push(`  • Complementarias: ${componentes.complementarias}h → ${complementariasProrrateadas.toFixed(2)}h (${(factorProrrateo * 100).toFixed(1)}%)`);

  const totalFinal = 
    componentes.docencia + 
    investigacionProrrateada + 
    extensionProrrateada + 
    complementariasProrrateadas;

  detalles.push(`\nTOTAL FINAL: ${totalFinal.toFixed(2)}h de ${horasBase}h base`);
  detalles.push(`Reducción: ${(totalOriginal - totalFinal).toFixed(2)}h (${(((totalOriginal - totalFinal) / totalOriginal) * 100).toFixed(1)}%)`);

  return {
    original,
    prorrateado: {
      docencia: componentes.docencia, // NUNCA CAMBIA
      investigacion: parseFloat(investigacionProrrateada.toFixed(2)),
      extension: parseFloat(extensionProrrateada.toFixed(2)),
      complementarias: parseFloat(complementariasProrrateadas.toFixed(2))
    },
    factorProrrateo,
    seAplicoProrrateo: true,
    detalles,
    horasBase,
    totalOriginal,
    totalFinal: parseFloat(totalFinal.toFixed(2))
  };
}

/**
 * Ejemplo de uso con los datos del documento
 */
export function ejemploProrrateo(): ResultadoProrrateo {
  /**
   * CASO: PTA 800 horas, Docencia consume 600h
   * 
   * ANTES DEL PRORRATEO:
   * ├── Docencia: 600h (registradas)
   * ├── Investigación: 300h (solicitadas)
   * ├── Extensión: 150h (solicitadas)
   * └── Complementarias: 100h (solicitadas)
   *     TOTAL: 1,150h (EXCEDE en 350h)
   * 
   * DISPONIBLES = 800 - 600 = 200h para distribuir
   * OTROS = 300 + 150 + 100 = 550h solicitadas
   * FACTOR = 200 / 550 = 0.3636
   * 
   * DESPUÉS DEL PRORRATEO:
   * ├── Docencia: 600h (INTOCABLE)
   * ├── Investigación: 300 × 0.3636 = 109h
   * ├── Extensión: 150 × 0.3636 = 55h
   * └── Complementarias: 100 × 0.3636 = 36h
   *     TOTAL: 800h (EXACTO)
   */
  return aplicarProrrateo(800, {
    docencia: 600,
    investigacion: 300,
    extension: 150,
    complementarias: 100
  });
}

/**
 * Validar que el resultado del prorrateo es válido
 */
export function validarProrrateo(resultado: ResultadoProrrateo): boolean {
  const { prorrateado, horasBase } = resultado;
  
  const total = 
    prorrateado.docencia + 
    prorrateado.investigacion + 
    prorrateado.extension + 
    prorrateado.complementarias;

  // Verificar que no excede horas base (con tolerancia de 0.01h para redondeo)
  if (total > horasBase + 0.01) {
    return false;
  }

  // Verificar que DOCENCIA no cambió
  if (prorrateado.docencia !== resultado.original.docencia) {
    return false;
  }

  // Verificar topes
  const topeInvestigacion = horasBase * 0.50;
  const topeExtension = horasBase * 0.25;
  const topeComplementarias = horasBase * 0.25;

  if (prorrateado.investigacion > topeInvestigacion + 0.01) return false;
  if (prorrateado.extension > topeExtension + 0.01) return false;
  if (prorrateado.complementarias > topeComplementarias + 0.01) return false;

  return true;
}

/**
 * Formatear resultado para mostrar al usuario
 */
export function formatearResultadoProrrateo(resultado: ResultadoProrrateo): string {
  const { original, prorrateado, seAplicoProrrateo, totalOriginal, totalFinal, horasBase } = resultado;

  if (!seAplicoProrrateo) {
    return `No se requiere prorrateo. Total: ${totalOriginal}h de ${horasBase}h base.`;
  }

  let texto = '🔄 PRORRATEO APLICADO\n\n';
  texto += `PTA Original: ${totalOriginal}h → PTA Final: ${totalFinal}h (base: ${horasBase}h)\n\n`;
  texto += 'Componente           Original  →  Final    Cambio\n';
  texto += '─────────────────────────────────────────────────\n';
  texto += `Docencia             ${original.docencia.toFixed(0).padStart(4)}h  →  ${prorrateado.docencia.toFixed(0).padStart(4)}h  ✓ INTOCABLE\n`;
  
  const cambioInv = prorrateado.investigacion - original.investigacion;
  const cambioExt = prorrateado.extension - original.extension;
  const cambioComp = prorrateado.complementarias - original.complementarias;

  texto += `Investigación        ${original.investigacion.toFixed(0).padStart(4)}h  →  ${prorrateado.investigacion.toFixed(0).padStart(4)}h  ${cambioInv.toFixed(0)}h\n`;
  texto += `Extensión            ${original.extension.toFixed(0).padStart(4)}h  →  ${prorrateado.extension.toFixed(0).padStart(4)}h  ${cambioExt.toFixed(0)}h\n`;
  texto += `Complementarias      ${original.complementarias.toFixed(0).padStart(4)}h  →  ${prorrateado.complementarias.toFixed(0).padStart(4)}h  ${cambioComp.toFixed(0)}h\n`;
  texto += '─────────────────────────────────────────────────\n';
  texto += `TOTAL                ${totalOriginal.toFixed(0).padStart(4)}h  →  ${totalFinal.toFixed(0).padStart(4)}h\n`;

  return texto;
}
