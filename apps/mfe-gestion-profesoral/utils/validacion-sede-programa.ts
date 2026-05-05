/**
 * Utilidades para validar disponibilidad de programas en sedes
 * Valida que un programa académico esté disponible en una sede específica
 */

import { PROGRAMAS_ESAP, SEDES_ESAP, type ProgramaESAP, type SedeESAP } from '../data/oferta-academica-esap';

/**
 * Valida si un programa está disponible en una sede específica
 */
export function isProgramaDisponibleEnSede(
  codigoPrograma: string,
  codigoSede: string
): boolean {
  const programa = PROGRAMAS_ESAP.find((p) => p.codigo === codigoPrograma);
  const sede = SEDES_ESAP.find((s) => s.codigo === codigoSede);

  if (!programa || !sede) {
    return false;
  }

  // Verificar si la sede está en la lista de sedes del programa
  return programa.sedes.includes(sede.ciudad) || programa.sedes.includes(sede.codigo);
}

/**
 * Obtiene todos los programas disponibles en una sede
 */
export function getProgramasDisponiblesEnSede(codigoSede: string): ProgramaESAP[] {
  const sede = SEDES_ESAP.find((s) => s.codigo === codigoSede);
  
  if (!sede) {
    return [];
  }

  return PROGRAMAS_ESAP.filter((programa) => {
    // Programas virtuales están disponibles en todas las sedes
    if (programa.modalidad === 'Virtual') {
      return true;
    }

    // Verificar si el código del programa está en la lista de programas ofrecidos por la sede
    return sede.programasOfrecidos?.includes(programa.codigo);
  });
}

/**
 * Obtiene todas las sedes donde está disponible un programa
 */
export function getSedesDisponiblesParaPrograma(codigoPrograma: string): SedeESAP[] {
  const programa = PROGRAMAS_ESAP.find((p) => p.codigo === codigoPrograma);
  
  if (!programa) {
    return [];
  }

  // Programas virtuales están disponibles en todas las sedes
  if (programa.modalidad === 'Virtual') {
    return SEDES_ESAP;
  }

  return SEDES_ESAP.filter((sede) => {
    return sede.programasOfrecidos?.includes(programa.codigo);
  });
}

/**
 * Valida asignaciones de sede-programa de un usuario
 * Retorna objeto con validación y errores
 */
export interface ValidacionSedePrograma {
  esValido: boolean;
  errores: string[];
  advertencias: string[];
}

export function validarAsignacionesSedePrograma(
  asignacionesSedes: Array<{ unidadId: string }>,
  asignacionesProgramas: Array<{ programaId: string }>
): ValidacionSedePrograma {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Si no hay programas asignados, no hay qué validar
  if (asignacionesProgramas.length === 0) {
    return { esValido: true, errores: [], advertencias: [] };
  }

  // Si hay programas pero no sedes, es un error
  if (asignacionesSedes.length === 0) {
    errores.push('El usuario tiene programas asignados pero no tiene sedes asignadas');
    return { esValido: false, errores, advertencias };
  }

  // Validar cada combinación de sede-programa
  asignacionesSedes.forEach((asignacionSede) => {
    asignacionesProgramas.forEach((asignacionPrograma) => {
      const programa = PROGRAMAS_ESAP.find((p) => p.codigo === asignacionPrograma.programaId);
      const sede = SEDES_ESAP.find((s) => s.codigo === asignacionSede.unidadId);

      if (!programa || !sede) {
        return;
      }

      // Programas virtuales son válidos en cualquier sede
      if (programa.modalidad === 'Virtual') {
        return;
      }

      // Verificar si el programa está disponible en la sede
      const disponible = sede.programasOfrecidos?.includes(programa.codigo);

      if (!disponible) {
        advertencias.push(
          `El programa "${programa.nombre}" no está oficialmente disponible en la sede "${sede.nombre}"`
        );
      }
    });
  });

  return {
    esValido: errores.length === 0,
    errores,
    advertencias,
  };
}

/**
 * Filtra programas compatibles con las sedes asignadas a un usuario
 */
export function getProgramasCompatiblesConSedes(codigosSedes: string[]): ProgramaESAP[] {
  if (codigosSedes.length === 0) {
    return PROGRAMAS_ESAP;
  }

  const programasCompatibles = new Set<string>();

  codigosSedes.forEach((codigoSede) => {
    const programasEnSede = getProgramasDisponiblesEnSede(codigoSede);
    programasEnSede.forEach((programa) => {
      programasCompatibles.add(programa.codigo);
    });
  });

  return PROGRAMAS_ESAP.filter((programa) => programasCompatibles.has(programa.codigo));
}

/**
 * Obtiene información de compatibilidad entre una sede y un programa
 */
export interface InfoCompatibilidadSedePrograma {
  compatible: boolean;
  razon?: string;
  modalidadPrograma: string;
  nivelSede: string;
}

export function getInfoCompatibilidadSedePrograma(
  codigoSede: string,
  codigoPrograma: string
): InfoCompatibilidadSedePrograma | null {
  const programa = PROGRAMAS_ESAP.find((p) => p.codigo === codigoPrograma);
  const sede = SEDES_ESAP.find((s) => s.codigo === codigoSede);

  if (!programa || !sede) {
    return null;
  }

  // Programas virtuales son compatibles con todas las sedes
  if (programa.modalidad === 'Virtual') {
    return {
      compatible: true,
      razon: 'Los programas virtuales están disponibles en todas las sedes',
      modalidadPrograma: programa.modalidad,
      nivelSede: sede.nivel,
    };
  }

  // Verificar disponibilidad oficial
  const disponible = sede.programasOfrecidos?.includes(programa.codigo);

  return {
    compatible: disponible,
    razon: disponible
      ? `El programa está oficialmente disponible en ${sede.nombre}`
      : `El programa no está oficialmente disponible en ${sede.nombre}. Modalidad: ${programa.modalidad}`,
    modalidadPrograma: programa.modalidad,
    nivelSede: sede.nivel,
  };
}
