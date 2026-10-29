import type { CambioDeLinea, TipoComparacionPaa, ValoresLineaPaa } from '../../entities/paa.entity';
import { etiquetaDe } from './estructura-paa';

/** Lo mínimo de una línea para compararla. */
export interface LineaComparable {
  codigo: string;
  regionId: string;
  valores: ValoresLineaPaa;
  huella: string;
}

export type CambioDeCampo = CambioDeLinea;

export interface LineaResumida {
  codigo: string;
  regionId: string;
  objeto: string | null;
}

export interface LineaModificada extends LineaResumida {
  cambios: CambioDeCampo[];
}

export interface DetalleComparacion {
  nuevas: LineaResumida[];
  eliminadas: LineaResumida[];
  modificadas: LineaModificada[];
  columnasNuevas: string[];
  columnasRetiradas: string[];
  /** Por qué la comparación no es confiable, o qué hay que tener en cuenta al leerla. */
  avisos: string[];
}

export interface ResumenComparacion {
  nuevas: number;
  eliminadas: number;
  modificadas: number;
  sinCambios: number;
  columnasNuevas: number;
  columnasRetiradas: number;
  porRegion: Record<string, { nuevas: number; eliminadas: number; modificadas: number }>;
}

export interface Comparacion {
  tipo: TipoComparacionPaa;
  confiable: boolean;
  resumen: ResumenComparacion;
  detalle: DetalleComparacion;
}

/**
 * La descripción no se compara: es la suma del código, el código interno y el
 * objeto, que sí se comparan por separado. Compararla también duplicaría cada
 * cambio de objeto en el reporte.
 */
const NO_SE_COMPARAN = new Set(['descripcion']);

/**
 * Qué cambió de una versión a otra, cruzando por código.
 *
 * Función pura: no sabe de base de datos, así que lo que diga aquí es lo mismo
 * que se guarda y lo mismo que se muestra antes de activar.
 *
 * Si alguna de las dos trae un código repetido, la comparación sale marcada
 * como no confiable: cruzar por código podría pegarle a un proceso los datos de
 * otra línea, y eso no se arregla con una advertencia.
 */
export function compararVersiones(
  base: LineaComparable[],
  nueva: LineaComparable[],
  tipo: TipoComparacionPaa,
): Comparacion {
  const avisos: string[] = [];
  const repetidosBase = repetidos(base);
  const repetidosNueva = repetidos(nueva);
  if (repetidosBase.length) {
    avisos.push(`La versión anterior repite códigos (${repetidosBase.join(', ')}): no se puede saber qué línea corresponde a cada proceso.`);
  }
  if (repetidosNueva.length) {
    avisos.push(`La versión nueva repite códigos (${repetidosNueva.join(', ')}): no se puede saber qué línea corresponde a cada proceso.`);
  }
  if (tipo === 'CAMBIO_VIGENCIA') {
    avisos.push(
      'Comparación informativa entre vigencias: un código de un año no equivale al del otro aunque se escriba igual. Ningún proceso se actualiza por esta comparación.',
    );
  }

  const antes = new Map(base.map((l) => [l.codigo, l]));
  const despues = new Map(nueva.map((l) => [l.codigo, l]));

  const nuevas: LineaResumida[] = [];
  const eliminadas: LineaResumida[] = [];
  const modificadas: LineaModificada[] = [];
  let sinCambios = 0;

  for (const linea of nueva) {
    const anterior = antes.get(linea.codigo);
    if (!anterior) {
      nuevas.push(resumida(linea));
    } else if (anterior.huella === linea.huella) {
      sinCambios++;
    } else {
      const cambios = diferencias(anterior.valores, linea.valores);
      if (cambios.length) modificadas.push({ ...resumida(linea), cambios });
      else sinCambios++;
    }
  }
  for (const linea of base) {
    if (!despues.has(linea.codigo)) eliminadas.push(resumida(linea));
  }

  const clavesBase = clavesDe(base);
  const clavesNueva = clavesDe(nueva);
  const columnasNuevas = [...clavesNueva].filter((c) => !clavesBase.has(c)).sort();
  const columnasRetiradas = [...clavesBase].filter((c) => !clavesNueva.has(c)).sort();

  const porRegion: ResumenComparacion['porRegion'] = {};
  const contar = (regionId: string, clave: 'nuevas' | 'eliminadas' | 'modificadas') => {
    porRegion[regionId] ??= { nuevas: 0, eliminadas: 0, modificadas: 0 };
    porRegion[regionId][clave]++;
  };
  nuevas.forEach((l) => contar(l.regionId, 'nuevas'));
  eliminadas.forEach((l) => contar(l.regionId, 'eliminadas'));
  modificadas.forEach((l) => contar(l.regionId, 'modificadas'));

  return {
    tipo,
    confiable: !repetidosBase.length && !repetidosNueva.length,
    resumen: {
      nuevas: nuevas.length,
      eliminadas: eliminadas.length,
      modificadas: modificadas.length,
      sinCambios,
      columnasNuevas: columnasNuevas.length,
      columnasRetiradas: columnasRetiradas.length,
      porRegion,
    },
    detalle: { nuevas, eliminadas, modificadas, columnasNuevas, columnasRetiradas, avisos },
  };
}

/** Los campos que cambiaron entre dos juegos de valores de la misma línea. */
export function diferencias(antes: ValoresLineaPaa, despues: ValoresLineaPaa): CambioDeCampo[] {
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  const cambios: CambioDeCampo[] = [];
  for (const campo of claves) {
    if (NO_SE_COMPARAN.has(campo)) continue;
    const a = antes[campo] ?? null;
    const d = despues[campo] ?? null;
    if (a !== d) cambios.push({ campo, etiqueta: etiquetaDe(campo), antes: a, despues: d });
  }
  return cambios.sort((x, y) => x.campo.localeCompare(y.campo));
}

function resumida(linea: LineaComparable): LineaResumida {
  return { codigo: linea.codigo, regionId: linea.regionId, objeto: (linea.valores.objeto as string) ?? null };
}

function repetidos(lineas: LineaComparable[]): string[] {
  const vistos = new Set<string>();
  const dobles = new Set<string>();
  for (const l of lineas) {
    if (vistos.has(l.codigo)) dobles.add(l.codigo);
    vistos.add(l.codigo);
  }
  return [...dobles];
}

function clavesDe(lineas: LineaComparable[]): Set<string> {
  const claves = new Set<string>();
  for (const l of lineas) for (const k of Object.keys(l.valores)) claves.add(k);
  return claves;
}
