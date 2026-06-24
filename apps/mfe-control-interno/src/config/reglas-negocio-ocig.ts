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
    },

    /**
     * Valida si es Jefe OCI o Supervisor
     * Requerimiento: Jefe de la OCI o la OCIG, o Supervisor.
     */
    esJefeOCISupervisor: (cargo: string | undefined | null): boolean => {
      if (!cargo) return false;
      const cargoMin = cargo.toLowerCase();
      return cargoMin.includes('jefe oci') || 
             cargoMin.includes('jefe ocig') || 
             cargoMin.includes('jefe de oci') ||
             cargoMin.includes('jefe de la oci') ||
             cargoMin.includes('jefe oficina control interno') ||
             cargoMin.includes('supervisor');
    },

    /**
     * Valida si es Auditor Líder
     * Requerimiento: Solo profesionales con rol "Auditor Líder" en Configuraciones > Profesionales OCI.
     */
    esAuditorLider: (cargo: string | undefined | null): boolean => {
      if (!cargo) return false;
      const cargoMin = cargo.toLowerCase();
      return cargoMin.includes('auditor') && (
        cargoMin.includes('lider') || 
        cargoMin.includes('líder') || 
        cargoMin.includes('lìder')
      );
    },

    /**
     * Valida si es parte del equipo auditor adicional.
     * Todos los profesionales configurados en OCI pueden participar como equipo auditor.
     * Los que ya están asignados como Jefe OCI o Auditor Líder se excluyen por ID en el componente.
     */
    esEquipoAuditor: (_cargo: string | undefined | null): boolean => {
      return true;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. COMITÉ DE APROBACIÓN DEL PAI (Decreto 648 / Ley 648 de 2017)
  // Los miembros del comité se eligen entre usuarios con permiso
  // control-interno.plan-anual.approve (ver GET aprobadores-plan-anual).
  // No se usa el rol OCIG "Aprobador PAI" en configuracion_profesionales_ocig.
  // ──────────────────────────────────────────────────────────────────────────
  COMITE_INSTITUCIONAL: {
    permisoRequerido: 'control-interno.plan-anual.approve',
  },
};
