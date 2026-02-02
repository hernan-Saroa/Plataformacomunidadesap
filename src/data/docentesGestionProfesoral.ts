/**
 * DOCENTES GESTIÓN PROFESORAL - STUB
 * ⚠️ Datos eliminados para reducir tamaño del proyecto
 */

export interface DocenteGestionProfesoral {
  id: string;
  personaId: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono?: string;
  direccion?: string;
  tipoVinculacion: 'planta' | 'hora-catedra' | 'ocasional';
  estado: 'activo' | 'inactivo' | 'licencia' | 'retirado';
}

/**
 * STUB: Array vacío - Agregar datos reales cuando se requieran
 */
export const TODOS_LOS_DOCENTES: DocenteGestionProfesoral[] = [];
