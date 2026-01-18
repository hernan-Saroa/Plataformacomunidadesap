/**
 * Interface para graduado (estructura del módulo de Registro Académico)
 */
export interface Graduate {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: 'Graduado';
  programa: string;
  estado: 'Graduado';
  fechaIngreso: string;
  fechaGrado: string;
  documento: string;
  fechaExpedicionDocumento?: string;  // ✅ NUEVO: Fecha de expedición del documento
  direccion: string;
  ciudad: string;
  promedio: number;
  tituloObtenido: string;
  modalidadGrado: string;
  certificateDownloads?: number;
}

import { MOCK_USERS_WITH_SEDES, type UserWithSedes } from './mockUsersWithSedes';

/**
 * Mapea un usuario del sistema a un graduado del módulo académico
 */
function mapUserToGraduate(user: UserWithSedes): Graduate | null {
  // Verificar si el usuario tiene rol de Graduado o Egresado
  const isGraduate = user.roles.some(role => 
    role.name === 'Graduado' || 
    role.name === 'Egresado' ||
    role.code === 'GRADUADO' ||
    role.code === 'EGRESADO'
  );

  if (!isGraduate) {
    return null;
  }

  // Calcular fechas (ejemplo: si no tiene, usar fechas por defecto)
  const enrollmentDate = user.enrollmentDate || '2020-01-15';
  const graduationDate = user.lastLogin || '2024-06-15';

  return {
    id: user.id,
    nombre: user.firstName,
    apellido: user.lastName,
    email: user.email,
    telefono: user.phone,
    rol: 'Graduado',
    programa: user.program || 'Administración Pública',
    estado: 'Graduado',
    fechaIngreso: enrollmentDate,
    fechaGrado: graduationDate,
    documento: user.documentNumber,
    fechaExpedicionDocumento: user.documentIssueDate,  // ✅ Fecha de expedición del documento
    direccion: user.address || 'Sin dirección registrada',
    ciudad: user.location,
    promedio: 4.5, // Valor por defecto - debería venir del perfil académico
    tituloObtenido: `Profesional en ${user.program || 'Administración Pública'}`,
    modalidadGrado: 'Trabajo de Grado',
    certificateDownloads: 0
  };
}

/**
 * Obtiene todos los graduados sincronizados desde Gestión de Personas
 * Esta es la fuente única de verdad (Single Source of Truth)
 */
export function getSyncedGraduates(): Graduate[] {
  return MOCK_USERS_WITH_SEDES
    .map(mapUserToGraduate)
    .filter((graduate): graduate is Graduate => graduate !== null);
}

/**
 * Busca un graduado por cédula
 */
export function findGraduateByCedula(cedula: string): Graduate | undefined {
  const graduates = getSyncedGraduates();
  return graduates.find(grad => grad.documento === cedula);
}

/**
 * Busca graduados por nombre
 */
export function findGraduatesByName(searchTerm: string): Graduate[] {
  const graduates = getSyncedGraduates();
  const term = searchTerm.toLowerCase();
  
  return graduates.filter(grad => 
    grad.nombre.toLowerCase().includes(term) ||
    grad.apellido.toLowerCase().includes(term) ||
    `${grad.nombre} ${grad.apellido}`.toLowerCase().includes(term)
  );
}

/**
 * Obtiene estadísticas de graduados
 */
export function getGraduatesStats() {
  const graduates = getSyncedGraduates();
  
  return {
    total: graduates.length,
    porPrograma: graduates.reduce((acc, grad) => {
      acc[grad.programa] = (acc[grad.programa] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    porCiudad: graduates.reduce((acc, grad) => {
      acc[grad.ciudad] = (acc[grad.ciudad] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    promedioGeneral: graduates.length > 0
      ? graduates.reduce((sum, grad) => sum + grad.promedio, 0) / graduates.length
      : 0,
    certificadosDescargados: graduates.reduce((sum, grad) => sum + (grad.certificateDownloads || 0), 0)
  };
}

/**
 * Verifica si existe un graduado con la cédula especificada
 */
export function existsGraduateWithCedula(cedula: string): boolean {
  return findGraduateByCedula(cedula) !== undefined;
}

/**
 * Valida un graduado usando los 3 campos del servicio público:
 * - Cédula
 * - Fecha de Grado
 * - Apellido
 * 
 * Esta es la función que coordina el servicio público de "Certificación de Títulos"
 * con el módulo de "Gestión de Graduados" del backoffice.
 */
export function validateGraduateForPublicService(
  cedula: string,
  fechaGrado: string,
  apellido: string
): { isValid: boolean; graduate?: Graduate; error?: string } {
  // 1. Buscar graduado por cédula
  const graduate = findGraduateByCedula(cedula);
  
  if (!graduate) {
    return {
      isValid: false,
      error: 'No se encontró un graduado con esta cédula en nuestros registros'
    };
  }

  // 2. Validar apellido (case insensitive)
  const apellidoNormalizado = apellido.toLowerCase().trim();
  const apellidoGraduadoNormalizado = graduate.apellido.toLowerCase().trim();
  
  if (apellidoGraduadoNormalizado !== apellidoNormalizado) {
    return {
      isValid: false,
      error: 'El apellido no coincide con nuestros registros'
    };
  }

  // 3. Validar fecha de grado (comparar solo la fecha, sin hora)
  const fechaGradoInput = new Date(fechaGrado).toISOString().split('T')[0];
  const fechaGradoRegistro = new Date(graduate.fechaGrado).toISOString().split('T')[0];
  
  if (fechaGradoInput !== fechaGradoRegistro) {
    return {
      isValid: false,
      error: 'La fecha de grado no coincide con nuestros registros'
    };
  }

  // ✅ TODOS LOS DATOS COINCIDEN
  return {
    isValid: true,
    graduate: graduate
  };
}