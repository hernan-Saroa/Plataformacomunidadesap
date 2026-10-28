/**
 * Búsqueda de recursos del Centro de Ayuda. No distingue mayúsculas ni tildes
 * ("guia" encuentra "Guía") y exige que aparezcan todas las palabras escritas,
 * en cualquier orden, en el título, la descripción, el módulo, el texto, el
 * nombre del archivo o el nombre de su sección.
 */
import type { RecursoCentroAyuda } from '../../../services/api/centroAyuda.service';

export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function buscarRecursos(
  recursos: RecursoCentroAyuda[],
  consulta: string,
  nombreDeSeccion: (idSeccion: number) => string = () => '',
): RecursoCentroAyuda[] {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return recursos;
  return recursos.filter((r) => {
    const texto = normalizar(
      [r.titulo, r.descripcion, r.modulo, r.contenido, r.archivo?.nombre, nombreDeSeccion(r.idSeccion)]
        .filter(Boolean)
        .join(' '),
    );
    return palabras.every((p) => texto.includes(p));
  });
}
