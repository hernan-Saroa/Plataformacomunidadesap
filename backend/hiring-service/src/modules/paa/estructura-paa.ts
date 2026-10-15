import type { ValoresLineaPaa } from '../../entities/paa.entity';

/**
 * El formato del Plan Anual de Adquisiciones.
 *
 * Es el de SECOP, el mismo que la entidad publica cada año, y no se edita desde
 * el sistema: si Planeación cambia una columna, el archivo deja de pasar la
 * validación y hay que ajustar esto, no adivinar. Las claves son las que se
 * guardan en `paa_lineas.valores` y las que nombra la configuración de campos;
 * por eso no cambian aunque cambie la redacción del encabezado.
 */

export type TipoColumnaPaa = 'texto' | 'mes' | 'entero' | 'moneda' | 'si_no' | 'intervalo';

/**
 * - `identificador`: de ahí sale el código de la línea; no se puede ocultar.
 * - `proceso`: alimenta un dato del proceso o de la 3.1.
 * - `informativo`: se muestra si la región lo habilita, nada más.
 */
export type UsoColumnaPaa = 'identificador' | 'proceso' | 'informativo';

export interface ColumnaPaa {
  clave: string;
  encabezado: string;
  /** Lo que se muestra en el formulario si la región no le pone otro nombre. */
  etiqueta: string;
  tipo: TipoColumnaPaa;
  uso: UsoColumnaPaa;
  obligatoria: boolean;
}

export const NOMBRE_HOJA = 'Adquisiciones';

export const COLUMNAS_PAA: readonly ColumnaPaa[] = [
  { clave: 'unspsc', encabezado: 'Código UNSPSC (cada código separado por ;)', etiqueta: 'Códigos UNSPSC', tipo: 'texto', uso: 'informativo', obligatoria: true },
  { clave: 'descripcion', encabezado: 'Descripción', etiqueta: 'Descripción', tipo: 'texto', uso: 'identificador', obligatoria: true },
  { clave: 'mes_inicio', encabezado: 'Fecha estimada de inicio de proceso de selección (mes)', etiqueta: 'Mes estimado de inicio del proceso', tipo: 'mes', uso: 'informativo', obligatoria: true },
  { clave: 'mes_ofertas', encabezado: 'Fecha estimada de presentación de ofertas (mes)', etiqueta: 'Mes estimado de presentación de ofertas', tipo: 'mes', uso: 'informativo', obligatoria: true },
  { clave: 'duracion', encabezado: 'Duración del contrato (número)', etiqueta: 'Duración del contrato', tipo: 'entero', uso: 'proceso', obligatoria: true },
  { clave: 'duracion_intervalo', encabezado: 'Duración del contrato (intervalo: días, meses, años)', etiqueta: 'Unidad de la duración', tipo: 'intervalo', uso: 'proceso', obligatoria: true },
  { clave: 'modalidad', encabezado: 'Modalidad de selección', etiqueta: 'Modalidad de selección', tipo: 'texto', uso: 'proceso', obligatoria: true },
  { clave: 'fuente_recursos', encabezado: 'Fuente de los recursos', etiqueta: 'Fuente de los recursos', tipo: 'texto', uso: 'informativo', obligatoria: true },
  { clave: 'valor_total', encabezado: 'Valor total estimado', etiqueta: 'Valor total estimado', tipo: 'moneda', uso: 'proceso', obligatoria: true },
  { clave: 'valor_vigencia', encabezado: 'Valor estimado en la vigencia actual', etiqueta: 'Valor estimado en la vigencia', tipo: 'moneda', uso: 'informativo', obligatoria: true },
  { clave: 'requiere_vigencias_futuras', encabezado: '¿Se requieren vigencias futuras?', etiqueta: '¿Requiere vigencias futuras?', tipo: 'si_no', uso: 'informativo', obligatoria: true },
  { clave: 'estado_vigencias_futuras', encabezado: 'Estado de solicitud de vigencias futuras', etiqueta: 'Estado de las vigencias futuras', tipo: 'texto', uso: 'informativo', obligatoria: true },
  { clave: 'unidad_contratacion', encabezado: 'Unidad de contratación (referencia)', etiqueta: 'Unidad de contratación', tipo: 'texto', uso: 'identificador', obligatoria: true },
  { clave: 'ubicacion', encabezado: 'Ubicación', etiqueta: 'Ubicación', tipo: 'texto', uso: 'proceso', obligatoria: true },
  { clave: 'responsable_nombre', encabezado: 'Nombre del responsable', etiqueta: 'Responsable', tipo: 'texto', uso: 'proceso', obligatoria: true },
  { clave: 'responsable_telefono', encabezado: 'Teléfono del responsable', etiqueta: 'Teléfono del responsable', tipo: 'texto', uso: 'informativo', obligatoria: true },
  { clave: 'responsable_correo', encabezado: 'Correo electrónico del responsable', etiqueta: 'Correo del responsable', tipo: 'texto', uso: 'informativo', obligatoria: true },
  { clave: 'mipyme', encabezado: '¿Este proceso es susceptible de limitarse a MiPymes?', etiqueta: '¿Se puede limitar a MiPymes?', tipo: 'si_no', uso: 'informativo', obligatoria: true },
  { clave: 'lotes', encabezado: '¿Este proceso es susceptible de estructurarse por lotes o segmentos?', etiqueta: '¿Se puede estructurar por lotes?', tipo: 'si_no', uso: 'informativo', obligatoria: true },
  { clave: 'alimentos_30', encabezado: '¿Debe cumplir con invertir mínimo el 30% de los recursos del presupuesto destinados a comprar alimentos, cumpliendo con lo establecido en la Ley 2046 de 2020, reglamentada por el Decreto 248 de 2021?', etiqueta: '¿Aplica el 30 % de compras de alimentos (Ley 2046)?', tipo: 'si_no', uso: 'informativo', obligatoria: true },
  { clave: 'bienes_distintos_alimentos', encabezado: '¿El contrato incluye el suministro de bienes y servicios distintos a alimentos?', etiqueta: '¿Incluye bienes distintos a alimentos?', tipo: 'texto', uso: 'informativo', obligatoria: true },
];

/**
 * Datos que no son una columna sino que se sacan de una: la descripción trae
 * pegados el código, el código interno de la dependencia y el objeto.
 */
export const DERIVADOS_PAA: readonly Omit<ColumnaPaa, 'encabezado' | 'obligatoria'>[] = [
  { clave: 'codigo_interno', etiqueta: 'Código interno', tipo: 'texto', uso: 'informativo' },
  { clave: 'objeto', etiqueta: 'Objeto', tipo: 'texto', uso: 'proceso' },
  { clave: 'modalidad_codigo', etiqueta: 'Modalidad (catálogo)', tipo: 'texto', uso: 'proceso' },
];

/** Prefijo de las columnas que el archivo trae de más: se guardan, no se validan. */
export const PREFIJO_EXTRA = 'extra:';

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Cuántos días vale cada unidad de duración, como cuenta la 3.1 el plazo. */
export const DIAS_POR_INTERVALO: Record<string, number> = { dias: 1, meses: 30, anos: 360 };

/**
 * Para comparar textos del Excel: sin tildes, sin mayúsculas, sin signos de
 * apertura y con los espacios colapsados. El archivo real trae «Modalidad de
 * selección » con un espacio al final y la hoja se llama «Adquisiciones  ».
 */
export function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿¡]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function etiquetaDe(clave: string): string {
  if (clave.startsWith(PREFIJO_EXTRA)) return clave.slice(PREFIJO_EXTRA.length);
  return (
    COLUMNAS_PAA.find((c) => c.clave === clave)?.etiqueta ??
    DERIVADOS_PAA.find((c) => c.clave === clave)?.etiqueta ??
    clave
  );
}

/** Todas las claves que puede tener una línea, en el orden del formulario. */
export function clavesConocidas(): string[] {
  return [
    'descripcion',
    ...DERIVADOS_PAA.map((d) => d.clave),
    ...COLUMNAS_PAA.filter((c) => c.clave !== 'descripcion').map((c) => c.clave),
  ];
}

/**
 * Las que la configuración no deja ocultar: sin el objeto no se sabe qué se
 * eligió. El código no está aquí porque el formulario lo muestra siempre como
 * título, no como un campo más.
 */
export const CLAVES_SIEMPRE_VISIBLES = ['objeto'];

/**
 * Las que nacen ocultas mientras la región no configure otra cosa: repiten
 * algo que ya se ve (la descripción es código más objeto; el código de la
 * modalidad es la modalidad), son de control interno, o son datos de contacto
 * de una persona que no hace falta exhibir a quien solo elige la línea.
 */
export const OCULTAS_POR_DEFECTO = [
  'descripcion',
  'modalidad_codigo',
  'unidad_contratacion',
  'responsable_telefono',
  'responsable_correo',
  'estado_vigencias_futuras',
  'alimentos_30',
  'bienes_distintos_alimentos',
];

/** Para qué sirve una clave, incluidas las derivadas y las que sobran en el archivo. */
export function usoDe(clave: string): UsoColumnaPaa {
  if (clave.startsWith(PREFIJO_EXTRA)) return 'informativo';
  return (
    COLUMNAS_PAA.find((c) => c.clave === clave)?.uso ??
    DERIVADOS_PAA.find((c) => c.clave === clave)?.uso ??
    'informativo'
  );
}

// ----------------------------------------------- lo que el PAA le da al proceso --

/**
 * Un dato del proceso que controla el PAA.
 *
 * `destino` dice dónde vive: en el proceso (objeto, modalidad, valor, que la
 * 3.1 muestra desde ahí) o en los datos de la 3.1. Todo lo que no está en esta
 * lista —tipología, causal, documentos, observaciones, decisiones— es del
 * proceso y ninguna versión del PAA lo toca.
 */
export interface CampoControlado {
  campo: string;
  etiqueta: string;
  destino: 'proceso' | 'estudio_previo';
  desde: (valores: ValoresLineaPaa) => string | number | null;
}

export function plazoEnDias(valores: ValoresLineaPaa): number | null {
  const n = Number(valores.duracion);
  const factor = DIAS_POR_INTERVALO[normalizar(valores.duracion_intervalo)];
  if (!Number.isFinite(n) || !factor) return null;
  return n * factor;
}

export const CAMPOS_CONTROLADOS: readonly CampoControlado[] = [
  { campo: 'objeto', etiqueta: 'Objeto del proceso', destino: 'proceso', desde: (v) => (v.objeto as string) ?? null },
  { campo: 'modalidad', etiqueta: 'Modalidad de selección', destino: 'proceso', desde: (v) => (v.modalidad_codigo as string) ?? null },
  { campo: 'valorEstimado', etiqueta: 'Valor estimado', destino: 'proceso', desde: (v) => (v.valor_total as number) ?? null },
  { campo: 'objeto_contratar', etiqueta: 'Objeto del contrato (3.1)', destino: 'estudio_previo', desde: (v) => (v.objeto as string) ?? null },
  { campo: 'linea_paa', etiqueta: 'Línea del PAA (3.1)', destino: 'estudio_previo', desde: (v) => (v.codigo as string) ?? null },
  { campo: 'plazo_ejecucion_dias', etiqueta: 'Plazo de ejecución en días (3.1)', destino: 'estudio_previo', desde: plazoEnDias },
  { campo: 'lugar_ejecucion', etiqueta: 'Lugar de ejecución (3.1)', destino: 'estudio_previo', desde: (v) => (v.ubicacion as string) ?? null },
  { campo: 'responsable_area', etiqueta: 'Responsable del área (3.1)', destino: 'estudio_previo', desde: (v) => (v.responsable_nombre as string) ?? null },
];

/** Lo que el PAA pone en el proceso, por campo: es lo que se guarda en `paa_origen`. */
export function origenDesdeLinea(codigo: string, valores: ValoresLineaPaa): Record<string, string | number | null> {
  const conCodigo = { ...valores, codigo };
  return Object.fromEntries(CAMPOS_CONTROLADOS.map((c) => [c.campo, c.desde(conCodigo)]));
}
