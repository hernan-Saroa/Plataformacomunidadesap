/**
 * REGLAS DE NEGOCIO - CONTROL INTERNO DE GESTIÓN (OCI)
 *
 * ATENCIÓN: Este archivo contiene normas estructurales y requerimientos legales (Ej: Ley 648 de 2017)
 * que rigen el comportamiento, los permisos y flujos de trabajo del módulo de Control Interno.
 *
 * ⚠️ NO SE DEBEN MODIFICAR ESTAS REGLAS SIN INSTRUCCIÓN EXPLÍCITA, YA QUE ESTÁN
 * VINCULADAS AL CUMPLIMIENTO NORMATIVO Y AL FLUJO DE AUDITORÍA OFICIAL.
 *
 * Los roles son los de Asignar Profesional (Configuraciones > Profesionales OCI):
 * Jefe OCI, Auditor y Aprobador Plan Anual (EFDS-2197). Se compara el rol
 * configurado, no un texto parecido en el cargo.
 */

import { ROL_OCI_AUDITOR, ROL_OCI_JEFE, tieneRolOci } from './roles-ocig-operativos';

export const REGLAS_NEGOCIO_OCIG = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. REGLAS PARA LA DIRECCIÓN DEL PLAN ANUAL DE AUDITORÍA Y EL EQUIPO AUDITOR
  // ──────────────────────────────────────────────────────────────────────────
  ROLES_RESPONSABLES_PLAN_ANUAL: {
    /**
     * Puede ser Responsable del Plan Anual: rol Jefe OCI o Auditor. Antes eran
     * Jefe OCIG y Auditor Líder; el Auditor Líder pasó a ser Auditor (EFDS-2197).
     */
    esAutorizadoParaResponsablePlan: (cargo: string | undefined | null): boolean =>
      tieneRolOci(cargo, ROL_OCI_JEFE) || tieneRolOci(cargo, ROL_OCI_AUDITOR),

    /** Campo "Jefe OCI / Supervisor" de la auditoría: solo el rol Jefe OCI. */
    esJefeOCISupervisor: (cargo: string | undefined | null): boolean =>
      tieneRolOci(cargo, ROL_OCI_JEFE),

    /** Campo "Auditor Líder" de la auditoría: solo el rol Auditor. */
    puedeLiderarAuditoria: (cargo: string | undefined | null): boolean =>
      tieneRolOci(cargo, ROL_OCI_AUDITOR),

    /**
     * "Equipo Auditor Adicional": solo el rol Auditor. Quien ya quedó como
     * Auditor Líder se excluye por ID en el componente.
     */
    esEquipoAuditor: (cargo: string | undefined | null): boolean =>
      tieneRolOci(cargo, ROL_OCI_AUDITOR),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. COMITÉ DE APROBACIÓN DEL PAI (Decreto 648 / Ley 648 de 2017)
  // Los miembros del comité se eligen entre los profesionales con rol
  // "Aprobador Plan Anual" (ver GET aprobadores-plan-anual); aprobar exige además
  // el permiso control-interno.plan-anual.approve.
  // ──────────────────────────────────────────────────────────────────────────
  COMITE_INSTITUCIONAL: {
    permisoRequerido: 'control-interno.plan-anual.approve',
  },
};
