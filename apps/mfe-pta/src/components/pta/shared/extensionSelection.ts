export interface ExtensionSelectionValue {
  columna: string;
  valor: string;
}

export interface ExtensionSelectionGroup {
  nombre: string;
  valores: ExtensionSelectionValue[];
}

export interface ExtensionSelectionInfo {
  etiqueta: string;
  nombre: string;
  detalles: ExtensionSelectionGroup[];
}

export interface HierarchySelectionBranch {
  clave: string;
  nombre: string;
  ruta: ExtensionSelectionValue[];
}

export interface HierarchySelectionInfo {
  clave: string;
  etiqueta: string;
  nombre: string;
  horas: number;
  ramificaciones: HierarchySelectionBranch[];
}

export interface HierarchyBranchTreeNode {
  clave: string;
  selectionKey: string;
  columna: string;
  valor: string;
  ruta: ExtensionSelectionValue[];
  branches: HierarchySelectionBranch[];
  children: HierarchyBranchTreeNode[];
}

const HIERARCHY_GROUP_KEY_PREFIX = 'grupo:';

function normalizeHierarchySelectionKeyPart(value: unknown): string {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'opcion';
}

/**
 * Clave estable para seleccionar un nivel intermedio completo (por ejemplo,
 * una Actividad) sin obligar a elegir sus Evidencias.
 */
export function getHierarchyGroupSelectionKey(
  levels: ExtensionSelectionValue[],
): string {
  const path = levels
    .map(level =>
      `${normalizeHierarchySelectionKeyPart(level.columna)}:${normalizeHierarchySelectionKeyPart(level.valor)}`,
    )
    .join('/');
  return `${HIERARCHY_GROUP_KEY_PREFIX}${path}`;
}

/**
 * Devuelve los niveles de una ramificación en el mismo orden en el que fueron
 * configurados: padre → hijo → hoja. `nombre` se conserva como respaldo para
 * instantáneas legacy que guardaban el padre fuera de `ruta`.
 */
export function getHierarchyBranchDisplayLevels(
  branch: Pick<HierarchySelectionBranch, 'nombre' | 'ruta'>,
): ExtensionSelectionValue[] {
  const levels = (Array.isArray(branch?.ruta) ? branch.ruta : [])
    .map(value => ({
      columna: String(value?.columna || '').trim(),
      valor: String(value?.valor || '').trim(),
    }))
    .filter(value => value.valor);
  const branchName = String(branch?.nombre || '').trim();
  if (!branchName) return levels;

  const normalizedName = branchName.toLocaleLowerCase('es');
  const nameAlreadyIncluded = levels.some(
    level => level.valor.toLocaleLowerCase('es') === normalizedName,
  );
  return nameAlreadyIncluded
    ? levels
    : [{ columna: '', valor: branchName }, ...levels];
}

/**
 * Agrupa las rutas que comparten padres para que una actividad con varias
 * evidencias se muestre una sola vez. Conserva el orden original de columnas,
 * valores y hojas; las claves seleccionables no se transforman.
 */
export function buildHierarchyBranchTree(
  branches: HierarchySelectionBranch[],
): HierarchyBranchTreeNode[] {
  const roots: HierarchyBranchTreeNode[] = [];

  branches.forEach(branch => {
    const levels = getHierarchyBranchDisplayLevels(branch);
    let siblings = roots;
    let parentKey = 'root';
    const path: ExtensionSelectionValue[] = [];

    levels.forEach((level, levelIndex) => {
      path.push(level);
      let node = siblings.find(candidate =>
        candidate.columna === level.columna && candidate.valor === level.valor,
      );
      if (!node) {
        node = {
          clave: `${parentKey}/${siblings.length}:${level.columna}:${level.valor}`,
          selectionKey: getHierarchyGroupSelectionKey(path),
          columna: level.columna,
          valor: level.valor,
          ruta: path.map(value => ({ ...value })),
          branches: [],
          children: [],
        };
        siblings.push(node);
      }
      if (levelIndex === levels.length - 1) node.branches.push(branch);
      parentKey = node.clave;
      siblings = node.children;
    });
  });

  return roots;
}

/**
 * Incluye hojas configuradas y grupos intermedios seleccionables. Se usa para
 * conservar y validar selecciones de actividad completa sin confundirlas con
 * evidencias individuales.
 */
export function getHierarchySelectableKeys(
  branches: HierarchySelectionBranch[],
): string[] {
  const keys: string[] = [];
  const visit = (node: HierarchyBranchTreeNode) => {
    if (node.children.length > 0) keys.push(node.selectionKey);
    node.branches.forEach(branch => keys.push(branch.clave));
    node.children.forEach(visit);
  };
  buildHierarchyBranchTree(branches).forEach(visit);
  return [...new Set(keys)];
}

/**
 * Convierte claves seleccionadas en la instantánea legible que viaja con el
 * PTA. Un grupo intermedio se conserva como su propia ruta y no expande ni
 * duplica sus descendientes.
 */
export function resolveHierarchySelectionBranches(
  branches: HierarchySelectionBranch[],
  selectedKeys: ReadonlySet<string>,
): HierarchySelectionBranch[] {
  const selected: HierarchySelectionBranch[] = [];
  const visit = (node: HierarchyBranchTreeNode) => {
    if (node.children.length > 0 && selectedKeys.has(node.selectionKey)) {
      selected.push({
        clave: node.selectionKey,
        nombre: node.valor,
        ruta: node.ruta.map(value => ({ ...value })),
      });
      return;
    }
    node.branches.forEach(branch => {
      if (selectedKeys.has(branch.clave)) selected.push(branch);
    });
    node.children.forEach(visit);
  };
  buildHierarchyBranchTree(branches).forEach(visit);
  return selected;
}

/**
 * Normaliza la nueva instantánea multiselección, compartida por Extensión y
 * Complementarias. Los textos viajan con el PTA para mantener su trazabilidad
 * aunque la configuración administrativa cambie después.
 */
export function getHierarchySelectionInfo(activity: any): HierarchySelectionInfo[] {
  const raw = Array.isArray(activity?.seleccion_jerarquica)
    ? activity.seleccion_jerarquica
    : [];
  const normalized = raw
    .map((selection: any, index: number) => ({
      clave: String(selection?.clave || `seleccion-${index + 1}`),
      etiqueta: String(selection?.etiqueta || 'Opción seleccionada').trim(),
      nombre: String(selection?.nombre || '').trim(),
      horas: Math.max(0, Number(selection?.horas) || 0),
      ramificaciones: (Array.isArray(selection?.ramificaciones) ? selection.ramificaciones : [])
        .map((branch: any, branchIndex: number) => ({
          clave: String(branch?.clave || `ramificacion-${branchIndex + 1}`),
          nombre: String(branch?.nombre || '').trim(),
          ruta: (Array.isArray(branch?.ruta) ? branch.ruta : [])
            .map((value: any) => ({
              columna: String(value?.columna || value?.column || '').trim(),
              valor: String(value?.valor || value?.value || '').trim(),
            }))
            .filter((value: ExtensionSelectionValue) => value.valor),
        }))
        .filter((branch: HierarchySelectionBranch) => branch.nombre || branch.ruta.length > 0),
    }))
    .filter((selection: HierarchySelectionInfo) => selection.nombre);
  if (normalized.length > 0) return normalized;

  const legacy = getExtensionSelectionInfo(activity);
  if (!legacy) return [];
  return [{
    clave: 'legacy-extension-selection',
    etiqueta: legacy.etiqueta,
    nombre: legacy.nombre,
    horas: Math.max(0, Number(activity?.horas) || 0),
    ramificaciones: legacy.detalles.map((detail, index) => ({
      clave: `legacy-detail-${index + 1}`,
      nombre: detail.nombre,
      ruta: detail.valores,
    })),
  }];
}

export function formatHierarchyBranchPath(branch: HierarchySelectionBranch): string {
  return getHierarchyBranchDisplayLevels(branch)
    .map(value => value.columna ? `${value.columna}: ${value.valor}` : value.valor)
    .join(' › ');
}

/**
 * Convierte la instantánea jerárquica en texto ordenado para exportaciones
 * tabulares (Excel/PDF). Agrupa padres compartidos para no repetir una actividad
 * por cada evidencia y nunca altera ni vuelve a sumar las horas.
 */
export function formatHierarchySelectionText(activity: any): string {
  const selections = getHierarchySelectionInfo(activity);
  const formatNodes = (nodes: HierarchyBranchTreeNode[]): string =>
    nodes.map(node => {
      const label = node.columna ? `${node.columna}: ${node.valor}` : node.valor;
      const children = formatNodes(node.children);
      return children ? `${label} → ${children}` : label;
    }).filter(Boolean).join('; ');

  return selections.map(selection => {
    const branches = formatNodes(buildHierarchyBranchTree(selection.ramificaciones));
    return branches
      ? `${selection.etiqueta}: ${selection.nombre} → ${branches}`
      : `${selection.etiqueta}: ${selection.nombre}`;
  }).join(' | ');
}

/**
 * Normaliza la instantánea legible que entrega el backend para una selección
 * jerárquica de Extensión. Devuelve null para actividades simples.
 */
export function getExtensionSelectionInfo(activity: any): ExtensionSelectionInfo | null {
  const nombre = String(activity?.fila_seleccionada_nombre || '').trim();
  if (!nombre) return null;

  const detalles = (Array.isArray(activity?.fila_seleccionada_detalles)
    ? activity.fila_seleccionada_detalles
    : [])
    .map((group: any) => ({
      nombre: String(group?.nombre || group?.name || '').trim(),
      valores: (Array.isArray(group?.valores) ? group.valores : (Array.isArray(group?.values) ? group.values : []))
        .map((value: any) => ({
          columna: String(value?.columna || value?.column || '').trim(),
          valor: String(value?.valor || value?.value || '').trim(),
        }))
        .filter((value: ExtensionSelectionValue) => value.valor),
    }))
    .filter((group: ExtensionSelectionGroup) => group.nombre || group.valores.length > 0);

  return {
    etiqueta: String(activity?.fila_seleccionada_etiqueta || 'Opción seleccionada').trim(),
    nombre,
    detalles,
  };
}
