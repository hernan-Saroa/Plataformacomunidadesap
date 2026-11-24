/**
 * Territorial académica del PTA (donde se dictan sus asignaturas).
 * `territorial` identifica la vinculación del docente y puede ser distinta.
 */
export function getPtaAssignmentTerritorialLabel(pta: any): string {
  const references = [...(Array.isArray(pta?.asignaturas) ? pta.asignaturas : []), pta].map(toTerritorialReference);
  const territoriales = Array.isArray(pta?.territorialesAsignaturas)
    ? Array.from(new Set<string>(pta.territorialesAsignaturas
        .map((value: unknown) => getTerritorialDisplayName(value, references))
        .filter((value: string | null): value is string => Boolean(value))))
    : [];

  const docencia = pta?.docencia_por_componente;
  const tieneClasificacionDocencia = docencia && typeof docencia === 'object'
    && ['academica_pregrado', 'academica_posgrado', 'academica_territorial']
      .some(key => Object.prototype.hasOwnProperty.call(docencia, key));

  if (tieneClasificacionDocencia) {
    const horasCentrales = (Number(docencia.academica_pregrado) || 0)
      + (Number(docencia.academica_posgrado) || 0);
    const horasTerritoriales = Number(docencia.academica_territorial) || 0;

    if (horasCentrales > 0 || horasTerritoriales > 0) {
      const ubicaciones: string[] = [];
      if (horasCentrales > 0) ubicaciones.push('Sede Central');
      if (horasTerritoriales > 0) {
        const territorialesReales = territoriales.filter(value => value.toLowerCase() !== 'sede central');
        if (territorialesReales.length > 0) {
          ubicaciones.push(...territorialesReales);
        } else {
          const vinculacion = getTerritorialDisplayName(toTerritorialReference(pta), references);
          if (vinculacion) ubicaciones.push(vinculacion);
        }
      }
      return Array.from(new Set(ubicaciones)).join(', ');
    }
  }

  if (territoriales.length > 0) return territoriales.join(', ');
  return getTerritorialDisplayName(toTerritorialReference(pta), references) || '';
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readableName(value: unknown): string | null {
  const name = text(value);
  return name && !UUID.test(name) && !/^\d+$/.test(name) ? name : null;
}

function referenceIds(value: any): string[] {
  return [value?.territorial_id, value?.territorialId, value?.territorial?.id,
    value?.id, value?.codigo, typeof value?.territorial === 'string' ? value.territorial : null]
    .map(text).filter(Boolean).map(value => value.toLowerCase());
}

function referenceName(value: any): string | null {
  return [value?.territorial_nombre, value?.territorialNombre, value?.territorial_nombre_actual,
    value?.territorial?.nombre, value?.nombre, value?.territorial]
    .map(readableName).find(Boolean) || null;
}

/** Extrae solo los datos territoriales; nombre/id de un docente o asignatura son distintos. */
export function toTerritorialReference(value: any) {
  return {
    id: value?.territorial_id || value?.territorialId || value?.territorial?.id || text(value?.territorial),
    nombre: [value?.territorial_nombre, value?.territorialNombre, value?.territorial_nombre_actual,
      value?.territorial?.nombre, value?.territorial].map(readableName).find(Boolean) || null,
  };
}

/** Resuelve etiquetas desde el catálogo del ambiente; nunca muestra UUID o códigos numéricos. */
export function getTerritorialDisplayName(value: any, references: readonly any[] = []): string | null {
  const ids = typeof value === 'object' ? referenceIds(value) : [text(value).toLowerCase()].filter(Boolean);
  for (const reference of references) {
    if (referenceIds(reference).some(id => ids.includes(id))) {
      const name = referenceName(reference);
      if (name) return name;
    }
  }
  return typeof value === 'object'
    ? referenceName(value) || [value?.territorial_id, value?.territorialId, value?.id, value?.codigo]
      .map(readableName).find(Boolean) || null
    : readableName(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// EFDS-2336 (reabierto en preproducción): UNA sola función resuelve una territorial
// a su nombre, en todas las tarjetas del detalle. Reglas:
//   · Solo se busca en el CATÁLOGO DEL AMBIENTE (`/catalogos/territoriales`), por
//     id o por código, y la correspondencia tiene que ser ÚNICA. Nunca en los
//     objetos del PTA ni de sus asignaturas: un id de otra cosa no es una territorial.
//   · Un identificador sin correspondencia (o con dos: un id de un registro que es
//     código de otro) → «Territorial no identificada». NUNCA otro valor por defecto
//     (ni la del docente, ni Sede Central, ni el primero del catálogo).
//   · Un NOMBRE ya registrado (datos históricos guardan el nombre, no el id) se
//     muestra tal cual: no es un valor por defecto, es lo que quedó registrado.
// ─────────────────────────────────────────────────────────────────────────────
export const TERRITORIAL_NO_IDENTIFICADA = 'Territorial no identificada';

/** UUID, número o código estructurado (p. ej. DT-013): identificadores, no nombres. */
const PARECE_IDENTIFICADOR = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|[a-z]{1,5}-?\d{1,6})$/i;

/** El valor a resolver de una fila (par territorial, referencia, aprobación de jefatura) o de un texto. */
export function claveTerritorial(value: any): string {
  if (value == null) return '';
  if (typeof value !== 'object') return text(value);
  return [value.territorialId, value.territorial_id, value.territorial?.id, value.id,
    value.territorialNombre, value.territorial_nombre, value.nombre].map(text).find(Boolean) || '';
}

/** Nombre de una territorial a partir de su identificador estructurado. Siempre devuelve texto. */
export function resolverTerritorial(value: unknown, catalogo: readonly any[] = []): string {
  const clave = text(value);
  if (!clave) return TERRITORIAL_NO_IDENTIFICADA;
  const k = clave.toLowerCase();
  const coincidencias = new Set(catalogo.filter(t =>
    text(t?.id).toLowerCase() === k || (text(t?.codigo) !== '' && text(t?.codigo).toLowerCase() === k)));
  if (coincidencias.size === 1) return readableName([...coincidencias][0]?.nombre) || TERRITORIAL_NO_IDENTIFICADA;
  if (coincidencias.size > 1) return TERRITORIAL_NO_IDENTIFICADA;
  return PARECE_IDENTIFICADOR.test(clave) ? TERRITORIAL_NO_IDENTIFICADA : clave;
}

const COMPONENTES_POR_TERRITORIAL: Record<string, string> = {
  academica_territorial: 'Territorial de la docencia',
  complementarias_territorial: 'Territorial de las complementarias',
};

/**
 * Qué territorial muestra la tarjeta de una decisión, y con qué rótulo.
 *
 * · Docencia (Territorial) y Complementarias (Territorial) se deciden por PAR
 *   (territorial donde se dictan las asignaturas, nivel). La tarjeta muestra la
 *   territorial de esos pares, NO la del docente: un docente de Cauca puede dictar
 *   en Tolima, y quien aprueba es el aprobador de Tolima.
 * · Los demás componentes no tienen territorial propia: la tarjeta muestra la del
 *   DOCENTE (la del PTA) y lo dice en el rótulo.
 */
export function territorialDeLaDecision(
  approval: any,
  pares: readonly any[],
  catalogo: readonly any[],
  pta: any,
): { rotulo: string; valor: string } {
  const componente = String(approval?.componente || '');
  const rotuloPar = COMPONENTES_POR_TERRITORIAL[componente];
  if (rotuloPar) {
    const delComponente = pares.filter(p => String(p?.componente || 'academica_territorial') === componente);
    const delEstado = delComponente.filter(p => p?.estado === approval?.estado);
    const filas = delEstado.length ? delEstado : delComponente;
    const nombres = [...new Set(filas.map(p => resolverTerritorial(claveTerritorial(p), catalogo)))];
    return { rotulo: rotuloPar, valor: nombres.length ? nombres.join(', ') : TERRITORIAL_NO_IDENTIFICADA };
  }
  // No se usa `scopeId`: lo escribe la pantalla al decidir y su significado cambia según quién decide
  // («Sede Nacional» para Gestión Profesoral, la territorial del docente para los demás, el id de una
  // solicitud de edición…). La territorial del docente es la del PTA.
  return { rotulo: 'Territorial del docente', valor: resolverTerritorial(claveTerritorial(toTerritorialReference(pta)), catalogo) };
}
