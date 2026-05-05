/**
 * MOTOR DE PRORRATEO AUTOMÁTICO - PTA ESAP
 * 
 * Implementación del algoritmo de prorrateo según:
 * Documento Maestro Integrado PTA ESAP v3.0 - Sección 14.2
 * 
 * REGLAS DE PRORRATEO (Circular 003/2025):
 * 1. DOCENCIA: NO se prorratean (sin límite máximo)
 * 2. INVESTIGACIÓN: Se reduce proporcionalmente hasta máx 400 hrs (50%)
 * 3. EXTENSIÓN ACADÉMICA: Se reduce proporcionalmente hasta máx 200 hrs (25%)
 * 4. ACTIVIDADES COMPLEMENTARIAS: Se reduce proporcionalmente hasta máx 200 hrs (25%)
 * 
 * Fecha: 23 de diciembre de 2024
 */

export interface ComponentesPTA {
  docencia: number;
  investigacion: number;
  extension: number;
  complementarias: number;
  administrativas?: number;
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
  exceso: number;
  excesoInvestigacion: number;
  excesoExtension: number;
  excesoComplementarias: number;
  reduccionAplicada: {
    investigacion: number;
    extension: number;
    complementarias: number;
  };
}

export interface LogProrrateo {
  timestamp: string;
  pta_id: string;
  docente_id: string;
  original: ComponentesPTA;
  prorrateado: ComponentesPTA;
  factorProrrateo: number;
  exceso: number;
  razon: string;
}

/**
 * ALGORITMO DE PRORRATEO (Documento Maestro Sección 14.2)
 * 
 * Cuando el total de horas del PTA supera las horas programables (800 o 720),
 * el sistema aplica prorrateo automático respetando los máximos establecidos.
 * 
 * PSEUDOCÓDIGO DEL DOCUMENTO:
 * ```
 * SI total_horas > horas_programables:
 *     exceso = total_horas - horas_programables
 *     
 *     # Calcular cuánto excede cada componente de su máximo
 *     exceso_inv = MAX(0, investigacion - 400)
 *     exceso_ext = MAX(0, extension - 200)
 *     exceso_comp = MAX(0, complementarias - 200)
 *     
 *     # Reducir proporcionalmente
 *     total_exceso = exceso_inv + exceso_ext + exceso_comp
 *     
 *     SI total_exceso > 0:
 *         investigacion = investigacion - (exceso_inv / total_exceso * exceso)
 *         extension = extension - (exceso_ext / total_exceso * exceso)
 *         complementarias = complementarias - (exceso_comp / total_exceso * exceso)
 * ```
 */
export function aplicarProrrateoDocumentoMaestro(
  horasBase: number,
  componentes: ComponentesPTA
): ResultadoProrrateo {
  const detalles: string[] = [];
  const original = { ...componentes };
  
  // Máximos según documento (Sección 5.1)
  const MAX_INVESTIGACION = horasBase * 0.50; // 50% = 400h para 800h base
  const MAX_EXTENSION = horasBase * 0.25;     // 25% = 200h para 800h base
  const MAX_COMPLEMENTARIAS = horasBase * 0.25; // 25% = 200h para 800h base
  
  detalles.push('═══════════════════════════════════════════════════════');
  detalles.push('  MOTOR DE PRORRATEO AUTOMÁTICO - PTA ESAP');
  detalles.push('  Documento Maestro v3.0 - Sección 14.2');
  detalles.push('═══════════════════════════════════════════════════════');
  detalles.push('');
  
  // PASO 1: Calcular total original
  const totalOriginal = 
    componentes.docencia + 
    componentes.investigacion + 
    componentes.extension + 
    componentes.complementarias +
    (componentes.administrativas || 0);
  
  detalles.push('PASO 1: ANÁLISIS INICIAL');
  detalles.push(`  Horas programables base: ${horasBase}h`);
  detalles.push(`  Total horas solicitadas: ${totalOriginal}h`);
  detalles.push('');
  detalles.push('  Distribución actual:');
  detalles.push(`    • Docencia:         ${componentes.docencia}h (SIN LÍMITE)`);
  detalles.push(`    • Investigación:    ${componentes.investigacion}h (máx ${MAX_INVESTIGACION}h)`);
  detalles.push(`    • Extensión:        ${componentes.extension}h (máx ${MAX_EXTENSION}h)`);
  detalles.push(`    • Complementarias:  ${componentes.complementarias}h (máx ${MAX_COMPLEMENTARIAS}h)`);
  if (componentes.administrativas && componentes.administrativas > 0) {
    detalles.push(`    • Administrativas:  ${componentes.administrativas}h`);
  }
  detalles.push('');
  
  // PASO 2: Verificar si se necesita prorrateo
  if (totalOriginal <= horasBase) {
    detalles.push('PASO 2: RESULTADO');
    detalles.push(`  ✓ No se requiere prorrateo (${totalOriginal}h ≤ ${horasBase}h)`);
    detalles.push('  El PTA está dentro del límite permitido.');
    
    return {
      original,
      prorrateado: { ...componentes },
      factorProrrateo: 1.0,
      seAplicoProrrateo: false,
      detalles,
      horasBase,
      totalOriginal,
      totalFinal: totalOriginal,
      exceso: 0,
      excesoInvestigacion: 0,
      excesoExtension: 0,
      excesoComplementarias: 0,
      reduccionAplicada: {
        investigacion: 0,
        extension: 0,
        complementarias: 0
      }
    };
  }
  
  const exceso = totalOriginal - horasBase;
  
  detalles.push('PASO 2: DETECCIÓN DE EXCESO');
  detalles.push(`  ⚠️ EXCESO DETECTADO: ${exceso}h`);
  detalles.push(`  ${totalOriginal}h solicitadas - ${horasBase}h base = ${exceso}h de exceso`);
  detalles.push('');
  
  // PASO 3: Calcular cuánto excede cada componente de su máximo
  const excesoInvestigacion = Math.max(0, componentes.investigacion - MAX_INVESTIGACION);
  const excesoExtension = Math.max(0, componentes.extension - MAX_EXTENSION);
  const excesoComplementarias = Math.max(0, componentes.complementarias - MAX_COMPLEMENTARIAS);
  
  detalles.push('PASO 3: ANÁLISIS DE EXCESOS POR COMPONENTE');
  detalles.push(`  Investigación:    ${componentes.investigacion}h - ${MAX_INVESTIGACION}h = ${excesoInvestigacion}h de exceso`);
  detalles.push(`  Extensión:        ${componentes.extension}h - ${MAX_EXTENSION}h = ${excesoExtension}h de exceso`);
  detalles.push(`  Complementarias:  ${componentes.complementarias}h - ${MAX_COMPLEMENTARIAS}h = ${excesoComplementarias}h de exceso`);
  detalles.push('');
  
  const totalExceso = excesoInvestigacion + excesoExtension + excesoComplementarias;
  
  detalles.push('PASO 4: CÁLCULO DE REDUCCIÓN PROPORCIONAL');
  detalles.push(`  Total de excesos: ${totalExceso}h`);
  detalles.push('');
  
  let investigacionFinal = componentes.investigacion;
  let extensionFinal = componentes.extension;
  let complementariasFinal = componentes.complementarias;
  
  if (totalExceso > 0) {
    // Aplicar reducción proporcional según el documento
    const reduccionInvestigacion = (excesoInvestigacion / totalExceso) * exceso;
    const reduccionExtension = (excesoExtension / totalExceso) * exceso;
    const reduccionComplementarias = (excesoComplementarias / totalExceso) * exceso;
    
    investigacionFinal = componentes.investigacion - reduccionInvestigacion;
    extensionFinal = componentes.extension - reduccionExtension;
    complementariasFinal = componentes.complementarias - reduccionComplementarias;
    
    detalles.push('  Fórmula de reducción proporcional:');
    detalles.push(`    reducción_componente = (exceso_componente / total_exceso) × exceso_total`);
    detalles.push('');
    detalles.push('  Reducciones calculadas:');
    detalles.push(`    • Investigación:    -${reduccionInvestigacion.toFixed(2)}h`);
    detalles.push(`    • Extensión:        -${reduccionExtension.toFixed(2)}h`);
    detalles.push(`    • Complementarias:  -${reduccionComplementarias.toFixed(2)}h`);
    detalles.push('');
  } else {
    // Si ningún componente excede su máximo, pero el total sí excede
    // Reducir proporcionalmente basándose en los valores actuales
    detalles.push('  Ningún componente excede su máximo individual.');
    detalles.push('  Aplicando reducción proporcional basada en valores actuales...');
    detalles.push('');
    
    const totalReducibles = componentes.investigacion + componentes.extension + componentes.complementarias;
    
    if (totalReducibles > 0) {
      const factorReduccion = (totalReducibles - exceso) / totalReducibles;
      
      investigacionFinal = componentes.investigacion * factorReduccion;
      extensionFinal = componentes.extension * factorReduccion;
      complementariasFinal = componentes.complementarias * factorReduccion;
      
      detalles.push(`  Factor de reducción: ${factorReduccion.toFixed(4)}`);
      detalles.push('');
    }
  }
  
  // PASO 5: Asegurar que no se excedan los máximos
  investigacionFinal = Math.min(investigacionFinal, MAX_INVESTIGACION);
  extensionFinal = Math.min(extensionFinal, MAX_EXTENSION);
  complementariasFinal = Math.min(complementariasFinal, MAX_COMPLEMENTARIAS);
  
  detalles.push('PASO 5: RESULTADO DEL PRORRATEO');
  detalles.push('');
  detalles.push('┌─────────────────────┬──────────┬──────────┬──────────┐');
  detalles.push('│ Componente          │ Original │ Final    │ Cambio   │');
  detalles.push('├─────────────────────┼──────────┼──────────┼──────────┤');
  detalles.push(`│ Docencia            │ ${componentes.docencia.toFixed(0).padStart(6)}h │ ${componentes.docencia.toFixed(0).padStart(6)}h │    ✓ OK │`);
  detalles.push(`│ Investigación       │ ${componentes.investigacion.toFixed(0).padStart(6)}h │ ${investigacionFinal.toFixed(0).padStart(6)}h │ ${(investigacionFinal - componentes.investigacion).toFixed(0).padStart(6)}h │`);
  detalles.push(`│ Extensión           │ ${componentes.extension.toFixed(0).padStart(6)}h │ ${extensionFinal.toFixed(0).padStart(6)}h │ ${(extensionFinal - componentes.extension).toFixed(0).padStart(6)}h │`);
  detalles.push(`│ Complementarias     │ ${componentes.complementarias.toFixed(0).padStart(6)}h │ ${complementariasFinal.toFixed(0).padStart(6)}h │ ${(complementariasFinal - componentes.complementarias).toFixed(0).padStart(6)}h │`);
  detalles.push('└─────────────────────┴──────────┴──────────┴──────────┘');
  detalles.push('');
  
  const totalFinal = 
    componentes.docencia + 
    investigacionFinal + 
    extensionFinal + 
    complementariasFinal +
    (componentes.administrativas || 0);
  
  detalles.push(`  Total Original: ${totalOriginal.toFixed(2)}h`);
  detalles.push(`  Total Final:    ${totalFinal.toFixed(2)}h`);
  detalles.push(`  Reducción:      ${(totalOriginal - totalFinal).toFixed(2)}h (${(((totalOriginal - totalFinal) / totalOriginal) * 100).toFixed(1)}%)`);
  detalles.push('');
  detalles.push('═══════════════════════════════════════════════════════');
  detalles.push('  ✓ PRORRATEO COMPLETADO EXITOSAMENTE');
  detalles.push('═══════════════════════════════════════════════════════');
  
  return {
    original,
    prorrateado: {
      docencia: componentes.docencia, // NUNCA CAMBIA
      investigacion: parseFloat(investigacionFinal.toFixed(2)),
      extension: parseFloat(extensionFinal.toFixed(2)),
      complementarias: parseFloat(complementariasFinal.toFixed(2)),
      administrativas: componentes.administrativas
    },
    factorProrrateo: totalFinal / totalOriginal,
    seAplicoProrrateo: true,
    detalles,
    horasBase,
    totalOriginal,
    totalFinal: parseFloat(totalFinal.toFixed(2)),
    exceso,
    excesoInvestigacion,
    excesoExtension,
    excesoComplementarias,
    reduccionAplicada: {
      investigacion: parseFloat((componentes.investigacion - investigacionFinal).toFixed(2)),
      extension: parseFloat((componentes.extension - extensionFinal).toFixed(2)),
      complementarias: parseFloat((componentes.complementarias - complementariasFinal).toFixed(2))
    }
  };
}

/**
 * Validar que el resultado del prorrateo cumple todas las reglas
 */
export function validarProrrateo(resultado: ResultadoProrrateo): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  const { prorrateado, horasBase, original } = resultado;
  
  // 1. Verificar que DOCENCIA no cambió
  if (prorrateado.docencia !== original.docencia) {
    errores.push('ERROR: La docencia fue modificada (debe ser intocable)');
  }
  
  // 2. Verificar que no excede horas base (tolerancia 0.5h para redondeo)
  const total = 
    prorrateado.docencia + 
    prorrateado.investigacion + 
    prorrateado.extension + 
    prorrateado.complementarias +
    (prorrateado.administrativas || 0);
  
  if (total > horasBase + 0.5) {
    errores.push(`ERROR: Total ${total}h excede horas base ${horasBase}h`);
  }
  
  // 3. Verificar topes máximos
  const MAX_INVESTIGACION = horasBase * 0.50;
  const MAX_EXTENSION = horasBase * 0.25;
  const MAX_COMPLEMENTARIAS = horasBase * 0.25;
  
  if (prorrateado.investigacion > MAX_INVESTIGACION + 0.5) {
    errores.push(`ERROR: Investigación ${prorrateado.investigacion}h excede máximo ${MAX_INVESTIGACION}h`);
  }
  
  if (prorrateado.extension > MAX_EXTENSION + 0.5) {
    errores.push(`ERROR: Extensión ${prorrateado.extension}h excede máximo ${MAX_EXTENSION}h`);
  }
  
  if (prorrateado.complementarias > MAX_COMPLEMENTARIAS + 0.5) {
    errores.push(`ERROR: Complementarias ${prorrateado.complementarias}h excede máximo ${MAX_COMPLEMENTARIAS}h`);
  }
  
  // 4. Verificar que ningún componente es negativo
  if (prorrateado.investigacion < 0 || 
      prorrateado.extension < 0 || 
      prorrateado.complementarias < 0) {
    errores.push('ERROR: Algún componente tiene valor negativo');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Crear log de auditoría del prorrateo
 */
export function crearLogProrrateo(
  ptaId: string,
  docenteId: string,
  resultado: ResultadoProrrateo,
  razon: string
): LogProrrateo {
  return {
    timestamp: new Date().toISOString(),
    pta_id: ptaId,
    docente_id: docenteId,
    original: resultado.original,
    prorrateado: resultado.prorrateado,
    factorProrrateo: resultado.factorProrrateo,
    exceso: resultado.exceso,
    razon
  };
}

/**
 * Formatear resultado para mostrar al usuario
 */
export function formatearResultadoUsuario(resultado: ResultadoProrrateo): string {
  const { original, prorrateado, seAplicoProrrateo, exceso, reduccionAplicada } = resultado;
  
  if (!seAplicoProrrateo) {
    return '✓ Tu PTA está dentro del límite de horas. No se requiere ajuste.';
  }
  
  let mensaje = '⚠️ Tu PTA excede el límite de horas programables.\n\n';
  mensaje += `Se ha aplicado un ajuste automático para reducir ${exceso}h:\n\n`;
  
  if (reduccionAplicada.investigacion > 0) {
    mensaje += `• Investigación: ${original.investigacion}h → ${prorrateado.investigacion}h (-${reduccionAplicada.investigacion}h)\n`;
  }
  
  if (reduccionAplicada.extension > 0) {
    mensaje += `• Extensión: ${original.extension}h → ${prorrateado.extension}h (-${reduccionAplicada.extension}h)\n`;
  }
  
  if (reduccionAplicada.complementarias > 0) {
    mensaje += `• Complementarias: ${original.complementarias}h → ${prorrateado.complementarias}h (-${reduccionAplicada.complementarias}h)\n`;
  }
  
  mensaje += `\n✓ Tu componente de Docencia (${prorrateado.docencia}h) no fue modificado.`;
  
  return mensaje;
}

/**
 * Ejemplo de uso - Caso real del documento
 */
export function ejemploDocumentoMaestro(): ResultadoProrrateo {
  /**
   * CASO DE PRUEBA:
   * PTA de 800 horas con exceso en todos los componentes
   * 
   * Docencia: 500h (dentro del límite, sin tope)
   * Investigación: 450h (excede máx 400h en 50h)
   * Extensión: 250h (excede máx 200h en 50h)
   * Complementarias: 220h (excede máx 200h en 20h)
   * TOTAL: 1,420h (excede 800h en 620h)
   */
  return aplicarProrrateoDocumentoMaestro(800, {
    docencia: 500,
    investigacion: 450,
    extension: 250,
    complementarias: 220
  });
}

// Mantener compatibilidad con código existente
export const aplicarProrrateo = aplicarProrrateoDocumentoMaestro;
