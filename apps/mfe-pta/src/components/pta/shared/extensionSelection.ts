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

