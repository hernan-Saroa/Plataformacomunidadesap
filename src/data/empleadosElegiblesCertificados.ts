/**
 * STUB: Arrays y objetos vacíos - Agregar datos reales cuando se requieran
 */
export const EMPLEADOS_ELEGIBLES: EmpleadoElegible[] = [];
export const DATOS_LABORALES: Record<string, DatosLaborales> = {};

/**
 * Helper: Obtener datos laborales completos de un empleado
 */
export function getDatosLaboralesCompletos(empleadoId: string): DatosLaborales | undefined {
  return DATOS_LABORALES[empleadoId];
}

/**
 * Helper: Obtener empleado por ID
 */
export function getEmpleadoById(empleadoId: string): EmpleadoElegible | undefined {
  return EMPLEADOS_ELEGIBLES.find(e => e.id === empleadoId);
}

/**
 * Helper: Buscar empleados por nombre
 */
export function searchEmpleados(query: string): EmpleadoElegible[] {
  const lowerQuery = query.toLowerCase();
  return EMPLEADOS_ELEGIBLES.filter(e => 
    e.firstName.toLowerCase().includes(lowerQuery) ||
    e.lastName.toLowerCase().includes(lowerQuery) ||
    e.document.includes(query)
  );
}