/**
 * Resolución de la situación administrativa para decidir asignabilidad — EFDS-1372.
 *
 * ⚠️ COPIA SINCRONIZADA. La autoridad de esta clasificación es el contrato
 * PROG↔PTA (`academic-work-plan-service/.../situacion-administrativa.*`). No se
 * puede importar entre microservicios, así que se refleja aquí, igual que
 * `nivel-academico.ts` refleja `POSGRADO_PROGRAMA_TIPOS`. Si cambia la lista del
 * contrato, hay que cambiarla aquí; el canario del agregado sobre datos reales
 * está para delatar la divergencia.
 *
 * ⚠️ SE DECIDE SOBRE EL CAMPO ESTRUCTURADO. `situacionCategoria` es un valor
 * cerrado que el PTA ya pobló al ingerir el RUND; la asignabilidad se resuelve
 * sobre él. El texto libre (`descripcion`) solo aporta lo que no está
 * estructurado: la vigencia ("hasta 1-10-2026"). Fue justo la lección de los 4
 * cargos directivos, cuyo texto trae el nombre del cargo y ninguna señal de que
 * están en servicio: decidir por texto los mandaba al fail-closed.
 *
 * ⚠️ FAIL-CLOSED: categoría vacía o no reconocida ⇒ NO asignable. Asignarle carga
 * a un docente en un estado desconocido es peor que pedir revisión manual.
 */

export interface SituacionResuelta {
  categoria: string | null;
  asignable: boolean;
  motivo: string | null;
  vigenteHasta: string | null;
}

/** Categorías del RUND que impiden asignar, reconocidas por patrón (sin tildes). */
const NO_ASIGNABLES: { categoria: string; motivo: string; patrones: string[] }[] = [
  { categoria: 'ano_sabatico', motivo: 'El docente se encuentra en año sabático', patrones: ['sabatico'] },
  // Cubre comisión de servicios, de estudios y la forma corta "En comisión".
  { categoria: 'comision', motivo: 'El docente se encuentra en comisión', patrones: ['comision'] },
];

/** Categorías que SÍ permiten asignar. Se listan las CATEGORÍAS, no frases libres. */
const ASIGNABLES = [
  'servicio activo',
  'no aplica',
  'periodo de prueba',
  'dedicacion exclusiva',
  'cargo directivo',
];

/** Sin tildes, minúsculas, espacios colapsados. */
function normalizar(texto: string | null | undefined): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrae "hasta 1-10-2026" / "hasta 17/07/2025" → ISO, o null. */
export function extraerVigencia(texto: string | null | undefined): string | null {
  const m = normalizar(texto).match(/hasta\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!m) return null;
  const [, d, mes, anio] = m;
  const dia = Number(d);
  const numMes = Number(mes);
  if (dia < 1 || dia > 31 || numMes < 1 || numMes > 12) return null;
  return `${anio}-${String(numMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Una situación con vigencia vencida ya no bloquea. Sin vigencia, se asume vigente. */
export function sigueVigente(vigenteHasta: string | null, hoy: Date = new Date()): boolean {
  if (!vigenteHasta) return true;
  const fin = new Date(`${vigenteHasta}T23:59:59`);
  if (Number.isNaN(fin.getTime())) return true;
  return fin.getTime() >= hoy.getTime();
}

/**
 * Resuelve la asignabilidad sobre la categoría estructurada.
 *
 * @param categoria    `situacionCategoria`: el campo ESTRUCTURADO del RUND.
 * @param descripcion  texto libre; solo se usa para la vigencia.
 * @param hoy          fecha de referencia, inyectable para pruebas.
 */
export function resolverSituacion(
  categoria: string | null | undefined,
  descripcion: string | null | undefined,
  hoy: Date = new Date(),
): SituacionResuelta {
  const cat = normalizar(categoria);
  const vigenteHasta = extraerVigencia(descripcion);

  // Fail-closed: sin categoría no se puede afirmar que esté disponible.
  if (!cat) {
    return {
      categoria: null,
      asignable: false,
      motivo: 'El docente no tiene situación administrativa registrada en el RUND',
      vigenteHasta,
    };
  }

  // 1. ¿La categoría impide asignar?
  for (const s of NO_ASIGNABLES) {
    if (!s.patrones.some((p) => cat.includes(p))) continue;
    // La vigencia manda: si ya venció, deja de bloquear.
    if (!sigueVigente(vigenteHasta, hoy)) {
      return { categoria: s.categoria, asignable: true, motivo: null, vigenteHasta };
    }
    return {
      categoria: s.categoria,
      asignable: false,
      motivo: vigenteHasta ? `${s.motivo} hasta el ${vigenteHasta}` : s.motivo,
      vigenteHasta,
    };
  }

  // 2. ¿Es una categoría reconocida que sí permite asignar?
  const asignable = ASIGNABLES.find((s) => cat.includes(s));
  if (asignable) {
    return { categoria: asignable.replace(/ /g, '_'), asignable: true, motivo: null, vigenteHasta };
  }

  // 3. No reconocida. Fail-closed: revisión manual antes de asumir.
  return {
    categoria: null,
    asignable: false,
    motivo:
      'La situación administrativa del docente no está clasificada y requiere revisión '
      + 'antes de asignarle carga',
    vigenteHasta,
  };
}
