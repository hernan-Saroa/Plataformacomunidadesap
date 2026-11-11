/** Recorre un listado paginado y devuelve todos los registros (para exportar lo filtrado, no solo la página visible). */
export async function recopilarTodasLasPaginas<T>(
  cargarPagina: (pagina: number) => Promise<{ items: T[]; pages: number } | null>,
  maxPaginas = 200,
): Promise<T[]> {
  const todos: T[] = [];
  let pagina = 1;
  let paginas = 1;
  while (pagina <= paginas && pagina <= maxPaginas) {
    const resultado = await cargarPagina(pagina);
    if (!resultado) throw new Error(`No fue posible leer la página ${pagina} del listado.`);
    todos.push(...resultado.items);
    paginas = Math.max(1, resultado.pages || 1);
    pagina += 1;
  }
  return todos;
}
