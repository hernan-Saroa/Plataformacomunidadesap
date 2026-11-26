export interface EnteControlPMItem {
    id: string;
    nombre: string;
    descripcion?: string;
    icono?: string;
    color?: string;
    activo: boolean;
}

export interface ResultadoValidacionEntesPM {
    valido: boolean;
    error?: string;
    ids: Set<string>;
}

/**
 * Valida la estructura mínima de la lista de Entes de Control de Planes de Mejoramiento:
 * arreglo válido, cada elemento con id y nombre no vacíos, estado booleano y sin ids repetidos.
 */
export function validarEstructuraEntesControlPM(lista: unknown): ResultadoValidacionEntesPM {
    const ids = new Set<string>();
    if (!Array.isArray(lista)) {
        return { valido: false, error: 'La lista de entes de control es inválida.', ids };
    }

    for (const ente of lista) {
        const item = ente as Partial<EnteControlPMItem> | null | undefined;
        const id = typeof item?.id === 'string' ? item.id.trim() : '';
        const nombre = typeof item?.nombre === 'string' ? item.nombre.trim() : '';
        if (!id || !nombre || typeof item?.activo !== 'boolean') {
            return {
                valido: false,
                error: 'Cada ente de control debe tener id, nombre y estado Activo/Inactivo.',
                ids,
            };
        }
        if (ids.has(id)) {
            return {
                valido: false,
                error: `El ente de control "${id}" está repetido.`,
                ids,
            };
        }
        ids.add(id);
    }

    return { valido: true, ids };
}

/**
 * Devuelve los entes que estaban en `anterior` y ya no están en `idsNuevos`.
 */
export function detectarEntesEliminados(anterior: unknown, idsNuevos: Set<string>): EnteControlPMItem[] {
    if (!Array.isArray(anterior)) return [];
    return anterior.filter((e): e is EnteControlPMItem => Boolean(e?.id && !idsNuevos.has(e.id)));
}
