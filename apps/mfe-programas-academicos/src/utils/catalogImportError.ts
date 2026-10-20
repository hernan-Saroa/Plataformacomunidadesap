export interface CatalogImportProblem {
  sheet?: string;
  row?: string;
  reference?: string;
  message: string;
}

export interface CatalogImportFailure {
  kind: 'validation' | 'connection' | 'request';
  title: string;
  description: string;
  notification: string;
  problems: CatalogImportProblem[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];

function problemFromMessage(message: string): CatalogImportProblem {
  const match = message.match(/^(ASIGNATURAS|PROGRAMAS|MATRIZ_OFERTA)(?:\s+fila\s+(\d+))?(?:\s*\(([^)]*)\))?:\s*([\s\S]+)$/i);
  const body = match?.[4] ?? message;
  return {
    sheet: match?.[1].toUpperCase(), row: match?.[2], reference: match?.[3],
    message: body.replace(/nombre_programa/g, 'Nombre del programa')
      .replace(/codigo_programa/g, 'Código del programa')
      .replace(/Corrija la asociación entre código y nombre del programa antes de importar\./g,
        'Corrige el código o el nombre del programa en esta fila y vuelve a cargar el archivo.'),
  };
}

/** Conserva los problemas del archivo separados del resumen que se muestra en la notificación. */
export function describeCatalogImportError(error: unknown): CatalogImportFailure {
  const err = error as any;
  const data = err?.response?.data;
  const nested = data?.message && typeof data.message === 'object' && !Array.isArray(data.message) ? data.message : data;
  const status = Number(err?.status ?? err?.response?.status);
  const details = [...new Set([
    ...strings(nested?.errors), ...strings(nested?.errores), ...strings(nested?.message),
  ])];
  const message = typeof nested?.message === 'string' ? nested.message
    : typeof err?.message === 'string' ? err.message : typeof error === 'string' ? error : '';

  if (status >= 500) {
    return { kind: 'request', title: 'No pudimos completar la carga',
      description: 'El servicio no está disponible en este momento. Consulta el estado del período antes de volver a intentarlo.',
      notification: 'Consulta la información en pantalla e inténtalo más tarde.', problems: [] };
  }
  if (status === 401 || status === 403) {
    return { kind: 'request', title: status === 401 ? 'Tu sesión ha vencido' : 'No tienes permiso para realizar esta carga',
      description: status === 401 ? 'Inicia sesión nuevamente antes de cargar el archivo.' : 'Solicita acceso a la importación de Programas Académicos.',
      notification: 'Consulta la información en pantalla.', problems: [] };
  }
  if (status === 413) {
    return { kind: 'request', title: 'El archivo supera el tamaño permitido',
      description: 'Reduce el tamaño del archivo Excel y vuelve a cargarlo.',
      notification: 'Selecciona un archivo de menor tamaño.', problems: [] };
  }
  if ((!Number.isFinite(status) || status === 0) &&
      /\b(red|network|fetch|timeout)\b|tiempo de espera|cancelad/i.test(message) && !details.length) {
    return { kind: 'connection', title: 'No pudimos confirmar la carga',
      description: 'Revisa tu conexión y el estado del período antes de volver a intentarlo.',
      notification: 'Revisa tu conexión. Encontrarás las indicaciones en pantalla.', problems: [] };
  }

  if (details.length || status === 400 || status === 422) {
    const problems = (details.length ? details : [message || 'Revisa que el archivo tenga el formato y las hojas de la plantilla.'])
      .map(problemFromMessage);
    return { kind: 'validation', title: 'El archivo necesita ajustes',
      description: 'Corrige los problemas indicados y vuelve a cargar el Excel para validarlo.',
      notification: `${problems.length === 1 ? 'Hay 1 problema por corregir' : `Hay ${problems.length} problemas por corregir`}. Consulta el detalle en pantalla.`,
      problems };
  }
  return { kind: 'request', title: 'No pudimos procesar el archivo',
    description: 'Comprueba que sea un archivo Excel válido. Si el problema continúa, vuelve a intentarlo más tarde.',
    notification: 'Consulta las indicaciones en pantalla.', problems: [] };
}
