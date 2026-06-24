/**
 * Mapea la modalidad del archivo Excel al enum de la base de datos.
 */
export function mapModalidad(excelModalidad: string): string {
  const norm = String(excelModalidad || '').toLowerCase().trim();
  switch (norm) {
    case 'presencial diurno':
    case 'presencial_dia':
      return 'presencial_dia';
    case 'presencial nocturno':
    case 'presencial_noche':
      return 'presencial_noche';
    case 'presencial':
      return 'presencial';
    case 'virtual':
      return 'virtual';
    case 'distancia':
      return 'distancia';
    case 'mixta':
    case 'mixto':
      return 'mixta';
    case 'por definir':
    case 'sin_definir':
    default:
      return 'sin_definir';
  }
}

/**
 * Mapea el tipo de excepción del archivo Excel al tipo compatible con la base de datos.
 */
export function mapTipoExcepcion(excelExcepcion: string | null): string | null {
  if (!excelExcepcion) return null;
  const norm = String(excelExcepcion).toLowerCase().trim();
  if (norm === '' || norm === 'null') return null;

  switch (norm) {
    case 'seminario_enfasis':
      return 'seminario_enfasis';
    case 'opciones_grado_ap':
      return 'opciones_grado_ap';
    case 'seminario_opciones_apt':
      return 'seminario_opciones_apt';
    default:
      return null;
  }
}
