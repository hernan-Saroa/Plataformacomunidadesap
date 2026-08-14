declare module 'estructura_org/Module' {
  const Module: React.ComponentType;
  export { Module as EstructuraOrganizacionalModule };
  export default Module;
}

declare module 'gestion_profesoral/Module' {
  const Module: React.ComponentType<any>;
  export { Module as GestionProfesoralApp };
  export default Module;
}

declare module 'programas_academicos/Module' {
  const Module: React.ComponentType;
  export { Module as ProgramasAcademicosModule };
  export default Module;
}

declare module 'gestion_personas/Module' {
  const Module: React.ComponentType;
  export { Module as UsersPersonsModulePremium };
  export default Module;
}

declare module 'gestion_personas/Roles' {
  const Module: React.ComponentType;
  export { Module as RolesAdministrationModulePremium };
  export default Module;
}

declare module 'auditoria/Module' {
  const Module: React.ComponentType;
  export { Module as AuditModulePremium };
  export default Module;
}

declare module 'reportes/Module' {
  const Module: React.ComponentType;
  export { Module as ReportsModuleV2 };
  export default Module;
}

declare module 'registro_academico/Enrollment' {
  const Module: React.ComponentType;
  export { Module as EnrollmentManagementModule };
  export default Module;
}

declare module 'registro_academico/Graduates' {
  const Module: React.ComponentType;
  export { Module as GraduatesManagementModule };
  export default Module;
}

declare module 'certificados_laborales/Router' {
  interface CertificadosLaboralesRouterProps {
    userRoles: string[];
    userEmail: string;
  }
  const Module: React.ComponentType<CertificadosLaboralesRouterProps>;
  export { Module as CertificadosLaboralesRouter };
  export default Module;
}

declare module 'firma_electronica/Module' {
  const Module: React.ComponentType;
  export { Module as ModuloFirmaElectronicaWorldClass };
  export default Module;
}

declare module 'control_interno/Module' {
  const Module: React.ComponentType;
  export { Module as ControlInternoFull };
  export default Module;
}

declare module 'control_disciplinario/Module' {
  const Module: React.ComponentType;
  export { Module as ControlDisciplinarioFull };
  export default Module;
}

declare module 'gestion_legal/Module' {
  const Module: React.ComponentType;
  export { Module as GestionLegalFull };
  export default Module;
}

declare module 'pta/Module' {
  const Module: React.ComponentType<any>;
  export { Module as PTAModule };
  export { Module as PTAKanbanModule };
  export default Module;
}

declare module 'pta/Portal' {
  const Module: React.ComponentType<any>;
  export { Module as PTAPortalModule };
  export default Module;
}

declare module 'contratacion/Module' {
  const Module: React.ComponentType;
  export { Module as ContratacionModulePremium };
  export default Module;
}

declare module 'viaticos/Module' {
  const Module: React.ComponentType;
  export { Module as ViaticosModulePremium };
  export default Module;
}
