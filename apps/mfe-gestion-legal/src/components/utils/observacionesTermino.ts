/**
 * DESCRIPCIÓN EDITABLE vs. HISTORIAL DENTRO DE `observaciones`
 *
 * La columna `observaciones` de un término no guarda solo la descripción: es un campo de
 * texto al que el sistema le va anexando cosas a lo largo de la vida del informe.
 *
 *   - Los comentarios se agregan como bloques separados por "\n\n---\n"
 *     (`TerminosService.update()` con `nuevoComentario`).
 *   - Los adjuntos dejan una línea de metadatos "[ARCHIVO_ADJUNTO] nombre|archivo|tamaño|fecha"
 *     (`TerminosService.addDocumentoLogico()`), que es de donde el detalle saca la lista de
 *     documentos del término.
 *
 * Por eso el formulario de edición NO puede mandar el textarea tal cual como `observaciones`:
 * eso borraría el historial de comentarios y —peor— dejaría huérfanos los documentos ya
 * cargados, que desaparecerían del detalle. Estas funciones separan la parte realmente
 * editable (la descripción original) del resto, y la vuelven a componer al guardar.
 */

const SEPARADOR_COMENTARIO = '\n\n---\n';
const LINEA_ADJUNTO = /^\[ARCHIVO_ADJUNTO\].*$/;

export interface ObservacionesSeparadas {
    /** Descripción original del informe: lo único que el formulario deja editar. */
    descripcionBase: string;
    /** Bloques de comentarios ya existentes, sin el separador inicial. */
    comentarios: string[];
    /** Líneas de metadatos de documentos adjuntos, tal cual. */
    adjuntos: string[];
}

export function separarObservaciones(observaciones: string | null | undefined): ObservacionesSeparadas {
    const texto = observaciones || '';

    // Los adjuntos se extraen primero y en cualquier posición: `addDocumentoLogico` los anexa
    // al final del texto en el momento de la carga, así que pueden haber quedado intercalados
    // entre comentarios según el orden en que ocurrieron las dos cosas.
    const adjuntos: string[] = [];
    const sinAdjuntos = texto
        .split('\n')
        .filter((linea) => {
            if (LINEA_ADJUNTO.test(linea.trim())) {
                adjuntos.push(linea.trim());
                return false;
            }
            return true;
        })
        .join('\n');

    const partes = sinAdjuntos.split(/\n{0,2}---\n/);
    const descripcionBase = (partes[0] || '').trim();
    const comentarios = partes.slice(1).map((p) => p.trim()).filter(Boolean);

    return { descripcionBase, comentarios, adjuntos };
}

/**
 * Reconstruye el valor completo de `observaciones` con una descripción nueva, conservando
 * intactos los comentarios y las líneas de adjuntos que ya tenía el término.
 */
export function componerObservaciones(nuevaDescripcion: string, original: ObservacionesSeparadas): string {
    const bloques = [nuevaDescripcion.trim(), ...original.comentarios];
    let resultado = bloques.filter(Boolean).join(SEPARADOR_COMENTARIO);
    if (original.adjuntos.length > 0) {
        resultado = resultado ? `${resultado}\n${original.adjuntos.join('\n')}` : original.adjuntos.join('\n');
    }
    return resultado;
}
