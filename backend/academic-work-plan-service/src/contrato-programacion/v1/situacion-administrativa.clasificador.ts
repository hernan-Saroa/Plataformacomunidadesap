import type { SituacionDocenteDto } from './dto/docente-programacion.dto';
import {
  SITUACIONES_ASIGNABLES,
  SITUACIONES_NO_ASIGNABLES,
} from './situacion-administrativa.config';

/**
 * Clasifica la situación administrativa del RUND — EFDS-1372, subtarea 6.
 *
 * El campo NO es un enumerado: llega como frase libre con la resolución y la
 * vigencia dentro ("En Año Sabático hasta 1-10-2026 Resol.2052 30-09-2024").
 * Por eso hay que reconocerlo por patrones y extraer la fecha del texto.
 *
 * ⚠️ FAIL-CLOSED: un texto que no se pueda clasificar se trata como NO asignable.
 * Es una situación administrativa que nadie previó, y asignarle carga a un
 * docente en un estado desconocido es peor que pedir revisión manual.
 */

/** Sin tildes, minúsculas y espacios colapsados, para comparar frases libres. */
function normalizar(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae la vigencia del texto: "hasta 1-10-2026", "hasta 17/07/2025".
 * Devuelve ISO (YYYY-MM-DD) o null si la frase no declara fecha.
 */
export function extraerVigencia(texto: string): string | null {
  const t = normalizar(texto);
  const m = t.match(/hasta\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!m) return null;
  const [, d, mes, anio] = m;
  const dia = Number(d);
  const numMes = Number(mes);
  if (dia < 1 || dia > 31 || numMes < 1 || numMes > 12) return null;
  return `${anio}-${String(numMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * ¿La situación sigue vigente en la fecha dada?
 *
 * Una situación con vigencia VENCIDA ya no bloquea: el docente que estuvo en año
 * sabático hasta octubre es asignable en noviembre. Sin vigencia declarada se
 * asume vigente, porque no hay nada que indique que terminó.
 */
export function sigueVigente(vigenteHasta: string | null, hoy: Date = new Date()): boolean {
  if (!vigenteHasta) return true;
  const fin = new Date(`${vigenteHasta}T23:59:59`);
  if (Number.isNaN(fin.getTime())) return true;
  return fin.getTime() >= hoy.getTime();
}

/**
 * @param descripcion  texto libre del RUND (trae la vigencia y la resolucion)
 * @param hoy          fecha de referencia, inyectable para pruebas
 * @param categoria    situacionCategoria: el campo ESTRUCTURADO del RUND
 *
 * ⚠️ La categoria manda sobre el texto libre. En los cargos directivos el texto
 * trae el NOMBRE DEL CARGO --"Subdirectora Nacional Academica"-- y ninguna
 * palabra revela que la persona esta en servicio: clasificar solo por texto los
 * mandaba al fail-closed. La descripcion se sigue usando para la vigencia,
 * porque la fecha vive dentro de esa frase y no en la categoria.
 */
export function clasificarSituacion(
  descripcion: string | null | undefined,
  hoy: Date = new Date(),
  categoria?: string | null,
): SituacionDocenteDto {
  const original = descripcion ?? null;
  // Se evalua la categoria primero y el texto como respaldo.
  const texto = normalizar([categoria || '', descripcion || ''].join(' '));

  // Sin dato: no se puede afirmar que esté disponible. Fail-closed.
  if (!texto) {
    return {
      descripcion: original,
      categoria: null,
      asignable: false,
      motivo: 'El docente no tiene situación administrativa registrada en el RUND',
      vigenteHasta: null,
    };
  }

  const vigenteHasta = extraerVigencia(texto);

  // 1. ¿Coincide con alguna situación que impide asignar?
  for (const situacion of SITUACIONES_NO_ASIGNABLES) {
    const coincide = situacion.patrones.some((p) => texto.includes(normalizar(p)));
    if (!coincide) continue;

    // La vigencia manda: si ya venció, deja de bloquear.
    if (!sigueVigente(vigenteHasta, hoy)) {
      return {
        descripcion: original,
        categoria: situacion.categoria,
        asignable: true,
        motivo: null,
        vigenteHasta,
      };
    }
    return {
      descripcion: original,
      categoria: situacion.categoria,
      asignable: false,
      motivo: vigenteHasta
        ? `${situacion.motivo} hasta el ${vigenteHasta}`
        : situacion.motivo,
      vigenteHasta,
    };
  }

  // 2. ¿Es una situación reconocida que sí permite asignar?
  const asignableConocida = SITUACIONES_ASIGNABLES.find((s) => texto.includes(normalizar(s)));
  if (asignableConocida) {
    return {
      descripcion: original,
      categoria: normalizar(asignableConocida).replace(/ /g, '_'),
      asignable: true,
      motivo: null,
      vigenteHasta,
    };
  }

  // 3. No se reconoce. Fail-closed: se pide revisión en vez de asumir.
  return {
    descripcion: original,
    categoria: null,
    asignable: false,
    motivo:
      'La situación administrativa del docente no está clasificada y requiere revisión '
      + 'antes de asignarle carga',
    vigenteHasta,
  };
}
