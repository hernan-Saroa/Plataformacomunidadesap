/**
 * REGLAS DE NEGOCIO - CONTROL INTERNO DE GESTIÓN (OCIG)
 * 
 * ATENCIÓN: Este archivo contiene normas estructurales y requerimientos legales (Ej: Ley 648 de 2017)
 * que rigen el comportamiento, los permisos y flujos de trabajo del módulo de Control Interno.
 * 
 * ⚠️ NO SE DEBEN MODIFICAR ESTAS REGLAS SIN INSTRUCCIÓN EXPLÍCITA, YA QUE ESTÁN
 * VINCULADAS AL CUMPLIMIENTO NORMATIVO Y AL FLUJO DE AUDITORÍA OFICIAL.
 */

export const REGLAS_NEGOCIO_OCIG = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. REGLAS PARA LA DIRECCIÓN DEL PLAN ANUAL DE AUDITORÍA
  // Solo ciertos roles están autorizados para ser "Responsables del Plan Anual".
  // ──────────────────────────────────────────────────────────────────────────
  ROLES_RESPONSABLES_PLAN_ANUAL: {
    nombresRequeridos: ['jefe oci', 'jefe ocig', 'jefe oficina control interno', 'auditor lider', 'auditor líder', 'auditor lìder'],
    
    /**
     * Valida si el cargo otorgado a un usuario de control interno
     * tiene autoridad suficiente para ser listado como Responsable del Plan Anual.
     */
    esAutorizadoParaResponsablePlan: (cargo: string | undefined | null): boolean => {
      if (!cargo) return false;
      const cargoMin = cargo.toLowerCase();
      
      const esJefeOCI = cargoMin.includes('jefe') && (
        cargoMin.includes('oci') || 
        cargoMin.includes('ocig') || 
        cargoMin.includes('control interno')
      );
      const esAuditorLider = cargoMin.includes('auditor') && (cargoMin.includes('lider') || cargoMin.includes('líder') || cargoMin.includes('lìder'));
      
      return esJefeOCI || esAuditorLider;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. REGLAS COMITÉ INSTITUCIONAL DE COORDINACIÓN DE CONTROL INTERNO
  // Ley 648 de 2017: Define quiénes tienen la potestad de "Aprobador PAI" y
  // cómo deben ser buscados en el sistema de acuerdo al rol otorgado.
  // ──────────────────────────────────────────────────────────────────────────
  COMITE_INSTITUCIONAL: {
    rolesAutorizados: ['aprobador pai'], // Miembros Decreto 648
    
    /**
     * Identifica si un usuario pertenece al Comité Institucional
     * y por ende tiene la capacidad de Aprobar el Plan Anual.
     */
    esAprobadorComite: (cargo: string | undefined | null): boolean => {
      if (!cargo) return false;
      return cargo.toLowerCase().includes('aprobador pai');
    }
  }
};
