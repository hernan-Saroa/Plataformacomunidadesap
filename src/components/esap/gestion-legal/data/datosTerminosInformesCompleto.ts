/**
 * Datos Mock - Términos para Informes (MOD-05) - COMPLETO
 * 13 Informes Obligatorios según DISEÑO_UX_UI_SIGL_v5_MVP_CORREGIDO.md
 * Sección 2.1 punto 11 del Formulario de Necesidad
 */

import { TerminoInforme, EstadoTermino } from '../core/types';

// Función para crear fecha futura
function fechaDentro(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

// Función para crear fecha pasada
function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

/**
 * 13 INFORMES OBLIGATORIOS según documento
 */
export const terminosInformesObligatorios: TerminoInforme[] = [
  // ========================================
  // INFORMES MENSUALES (día 15 del mes siguiente)
  // ========================================
  {
    id: 'TI-2025-001',
    codigo: 'CONCIL-CONTABLE-DIC-2025',
    tipoInforme: '1. Conciliación Contable-Jurídica',
    enteControl: 'CONTRALORIA',
    descripcion: 'Informe mensual de conciliación entre provisiones contables y estado real de procesos judiciales. Incluye: 1) Provisiones vigentes, 2) Procesos finalizados para reversar, 3) Nuevos procesos para provisionar, 4) Ajustes requeridos.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Decreto 2270/2012 - Contabilidad Pública',
    fechaVencimiento: fechaDentro(9), // 15 del mes
    diasRestantes: 9,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García - Jefe Oficina Jurídica + Contador',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(15),
    prioridad: 'ALTA',
  },
  {
    id: 'TI-2025-002',
    codigo: 'DEMANDAS-CONTRA-ESAP-DIC-2025',
    tipoInforme: '2. Demandas en Contra de ESAP',
    enteControl: 'CONGRESO',
    descripcion: 'Informe mensual ejecutivo de demandas instauradas contra ESAP. Incluye: 1) Nuevas demandas radicadas, 2) Demandas en curso por jurisdicción, 3) Sentencias proferidas, 4) Cuantías comprometidas, 5) Riesgos identificados.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Ley 1437/2011 - CPACA',
    fechaVencimiento: fechaDentro(9),
    diasRestantes: 9,
    estado: 'EN_PREPARACION',
    responsable: 'Dr. Juan Pérez López - Coordinador Legal',
    observaciones: 'Borrador 60% completado. Pendiente consolidar información sede Cali.',
    ultimaActualizacion: fechaHace(2),
    documentosGenerados: [],
    fechaCreacion: fechaHace(15),
    prioridad: 'ALTA',
  },
  {
    id: 'TI-2025-003',
    codigo: 'DENUNCIAS-PENALES-DIC-2025',
    tipoInforme: '3. Denuncias Penales',
    enteControl: 'PROCURADURIA',
    descripcion: 'Informe mensual de denuncias penales presentadas por ESAP o contra funcionarios de ESAP. Incluye: 1) Denuncias instauradas por ESAP, 2) Denuncias contra funcionarios, 3) Estado de investigaciones, 4) Actuaciones de Fiscalía.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Ley 906/2004 - Código de Procedimiento Penal',
    fechaVencimiento: fechaDentro(9),
    diasRestantes: 9,
    estado: 'PENDIENTE',
    responsable: 'Dr. Pedro Gómez Sánchez - Abogado Penal',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(15),
    prioridad: 'MEDIA',
  },
  {
    id: 'TI-2025-004',
    codigo: 'ACCIONES-REPETICION-DIC-2025',
    tipoInforme: '4. Acciones de Repetición',
    enteControl: 'CONTRALORIA',
    descripcion: 'Informe mensual de acciones de repetición iniciadas o en curso. Incluye: 1) Sentencias que generan repetición, 2) Acciones de repetición iniciadas, 3) Estado de procesos de repetición, 4) Recuperaciones efectivas.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Ley 678/2001 - Acción de Repetición',
    fechaVencimiento: fechaDentro(9),
    diasRestantes: 9,
    estado: 'PENDIENTE',
    responsable: 'Dr. Carlos Ramírez Duarte - Abogado Litigante',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(15),
    prioridad: 'ALTA',
  },
  {
    id: 'TI-2025-005',
    codigo: 'COMITE-CONCILIACION-DIC-2025',
    tipoInforme: '5. Comité de Conciliación',
    enteControl: 'CONGRESO',
    descripcion: 'Acta e informe de sesión mensual del Comité de Conciliación. Incluye: 1) Casos estudiados, 2) Decisiones adoptadas (conciliar/defender), 3) Conciliaciones aprobadas, 4) Seguimiento a conciliaciones previas.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Ley 1285/2009 - Comités de Conciliación',
    fechaVencimiento: fechaHace(7), // VENCIDO
    diasRestantes: -7,
    estado: 'VENCIDO',
    responsable: 'Dra. Ana López García - Secretaria Técnica Comité',
    observaciones: '⚠️ VENCIDO. Sesión realizada 08/12. Pendiente firma de acta por Director.',
    ultimaActualizacion: fechaHace(1),
    documentosGenerados: ['Acta_Comite_Conciliacion_DIC_2025_Borrador.docx'],
    fechaCreacion: fechaHace(22),
    prioridad: 'ALTA',
  },

  // ========================================
  // INFORMES TRIMESTRALES
  // ========================================
  {
    id: 'TI-2025-006',
    codigo: 'SIRECI-CGR-Q4-2025',
    tipoInforme: '6. Procesos Judiciales SIRECI-CGR',
    enteControl: 'CONTRALORIA',
    descripcion: 'Informe trimestral de procesos judiciales para cargue en SIRECI (Sistema de Información de Responsabilidad Fiscal) de la Contraloría General. Incluye: 1) Procesos activos, 2) Cuantías, 3) Estados procesales, 4) Sentencias Q4.',
    periodicidad: 'TRIMESTRAL',
    baseNormativa: 'Decreto 403/2020 - SIRECI',
    fechaVencimiento: fechaDentro(15),
    diasRestantes: 15,
    estado: 'PENDIENTE',
    responsable: 'Dr. Juan Pérez López + Contador',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(75),
    prioridad: 'ALTA',
  },
  {
    id: 'TI-2025-007',
    codigo: 'FCEE-Q4-2025',
    tipoInforme: '8. FCEE (Fondo Contingencias Estados Extranjeros)',
    enteControl: 'MINISTERIO_EDUCACION',
    descripcion: 'Informe trimestral para el Ministerio de Hacienda sobre provisiones del Fondo de Contingencias. Incluye: 1) Provisiones vigentes, 2) Sentencias ejecutoriadas, 3) Pagos realizados, 4) Proyección próximo trimestre.',
    periodicidad: 'TRIMESTRAL',
    baseNormativa: 'Decreto 2270/2012',
    fechaVencimiento: fechaDentro(15),
    diasRestantes: 15,
    estado: 'EN_PREPARACION',
    responsable: 'Dra. María Fernández Torres + Dirección Financiera',
    observaciones: 'En coordinación con MinHacienda. Esperando formato actualizado.',
    ultimaActualizacion: fechaHace(3),
    documentosGenerados: [],
    fechaCreacion: fechaHace(75),
    prioridad: 'MEDIA',
  },
  {
    id: 'TI-2025-008',
    codigo: 'PLAN-ACCION-Q4-2025',
    tipoInforme: '11. Plan de Acción Institucional',
    enteControl: 'CONGRESO',
    descripcion: 'Informe trimestral de cumplimiento de metas del Plan de Acción Institucional en materia legal. Incluye: 1) Metas legales PAI, 2) Avance trimestral, 3) Indicadores de gestión, 4) Acciones de mejora.',
    periodicidad: 'TRIMESTRAL',
    baseNormativa: 'Decreto 1499/2017 - Sistema Gestión',
    fechaVencimiento: fechaDentro(20),
    diasRestantes: 20,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García + Oficina Planeación',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(75),
    prioridad: 'MEDIA',
  },

  // ========================================
  // INFORMES SEMESTRALES
  // ========================================
  {
    id: 'TI-2025-009',
    codigo: 'INFORME-GESTION-SEM2-2025',
    tipoInforme: '7. Informe de Gestión',
    enteControl: 'CONGRESO',
    descripcion: 'Informe semestral de gestión de la Oficina Jurídica. Incluye: 1) Defensa judicial (estadísticas), 2) Juzgamiento disciplinario, 3) Asesoría jurídica, 4) Logros y retos, 5) Proyección próximo semestre.',
    periodicidad: 'SEMESTRAL',
    baseNormativa: 'Estatuto ESAP',
    fechaVencimiento: fechaDentro(40),
    diasRestantes: 40,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García - Jefe Oficina Jurídica',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(165),
    prioridad: 'BAJA',
  },

  // ========================================
  // INFORMES ANUALES
  // ========================================
  {
    id: 'TI-2025-010',
    codigo: 'PLAN-ADQUISICIONES-2026',
    tipoInforme: '10. Plan de Adquisiciones',
    enteControl: 'CONGRESO',
    descripcion: 'Plan Anual de Adquisiciones para el año 2026. Incluye: 1) Necesidades de bienes y servicios OJ, 2) Estimaciones presupuestales, 3) Cronograma de contratación, 4) Publicación en SECOP.',
    periodicidad: 'ANUAL',
    baseNormativa: 'Ley 1150/2007 - Contratación Pública',
    fechaVencimiento: fechaDentro(45),
    diasRestantes: 45,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García + Almacén',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(320),
    prioridad: 'BAJA',
  },
  {
    id: 'TI-2025-011',
    codigo: 'PLAN-ESTRATEGICO-2026-2030',
    tipoInforme: '12. Plan Estratégico Institucional',
    enteControl: 'CONGRESO',
    descripcion: 'Plan Estratégico Institucional 2026-2030 - Componente Legal. Incluye: 1) Diagnóstico situación legal, 2) Objetivos estratégicos OJ, 3) Metas cuatrienio, 4) Indicadores de seguimiento.',
    periodicidad: 'ANUAL',
    baseNormativa: 'Decreto 1499/2017',
    fechaVencimiento: fechaDentro(60),
    diasRestantes: 60,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García + Dirección Nacional',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(340),
    prioridad: 'BAJA',
  },
  {
    id: 'TI-2025-012',
    codigo: 'FURAG-2025',
    tipoInforme: '13. FURAG (Formulario Único Reporte Avances Gestión)',
    enteControl: 'CONGRESO',
    descripcion: 'Formulario Único de Reporte de Avances de Gestión para el Departamento Administrativo de la Función Pública. Incluye: 1) Gestión legal institucional, 2) Cumplimiento normativo, 3) Transparencia, 4) Buen gobierno.',
    periodicidad: 'ANUAL',
    baseNormativa: 'Decreto 1083/2015 - Función Pública',
    fechaVencimiento: fechaDentro(55),
    diasRestantes: 55,
    estado: 'PENDIENTE',
    responsable: 'Dra. Ana López García + Control Interno',
    observaciones: '',
    ultimaActualizacion: new Date(),
    documentosGenerados: [],
    fechaCreacion: fechaHace(350),
    prioridad: 'MEDIA',
  },

  // ========================================
  // INFORMES CONTINUOS
  // ========================================
  {
    id: 'TI-2025-013',
    codigo: 'EKOGUI-CONTINUO-DIC-2025',
    tipoInforme: '9. EKOGUI (Sincronización Continua)',
    enteControl: 'ARCHIVO_GENERAL',
    descripcion: 'Sincronización continua de expedientes judiciales con plataforma EKOGUI de la Agencia Nacional de Defensa Jurídica del Estado (ANDJE). Cargue de actuaciones, documentos y estados procesales en tiempo real.',
    periodicidad: 'MENSUAL',
    baseNormativa: 'Resolución ANDJE 001/2020',
    fechaVencimiento: fechaDentro(9),
    diasRestantes: 9,
    estado: 'EN_PREPARACION',
    responsable: 'Dr. Juan Pérez López - Coordinador Legal',
    observaciones: 'Última sincronización: 20/12/2025. Pendiente cargar 5 actuaciones nuevas.',
    ultimaActualizacion: fechaHace(2),
    documentosGenerados: [],
    fechaCreacion: fechaHace(15),
    prioridad: 'ALTA',
  },
];

// Estadísticas
export const estadisticasTerminosCompleto = {
  total: terminosInformesObligatorios.length,
  porEstado: {
    PENDIENTE: terminosInformesObligatorios.filter(t => t.estado === 'PENDIENTE').length,
    EN_PREPARACION: terminosInformesObligatorios.filter(t => t.estado === 'EN_PREPARACION').length,
    ENVIADO: terminosInformesObligatorios.filter(t => t.estado === 'ENVIADO').length,
    VENCIDO: terminosInformesObligatorios.filter(t => t.estado === 'VENCIDO').length,
  },
  porEnte: {
    CONTRALORIA: terminosInformesObligatorios.filter(t => t.enteControl === 'CONTRALORIA').length,
    PROCURADURIA: terminosInformesObligatorios.filter(t => t.enteControl === 'PROCURADURIA').length,
    ARCHIVO_GENERAL: terminosInformesObligatorios.filter(t => t.enteControl === 'ARCHIVO_GENERAL').length,
    MINISTERIO_EDUCACION: terminosInformesObligatorios.filter(t => t.enteControl === 'MINISTERIO_EDUCACION').length,
    CONGRESO: terminosInformesObligatorios.filter(t => t.enteControl === 'CONGRESO').length,
  },
  porPeriodicidad: {
    MENSUAL: terminosInformesObligatorios.filter(t => t.periodicidad === 'MENSUAL').length,
    BIMESTRAL: 0,
    TRIMESTRAL: terminosInformesObligatorios.filter(t => t.periodicidad === 'TRIMESTRAL').length,
    SEMESTRAL: terminosInformesObligatorios.filter(t => t.periodicidad === 'SEMESTRAL').length,
    ANUAL: terminosInformesObligatorios.filter(t => t.periodicidad === 'ANUAL').length,
  },
  urgentes: terminosInformesObligatorios.filter(t => t.diasRestantes > 0 && t.diasRestantes <= 7 && t.estado !== 'ENVIADO' && t.estado !== 'VENCIDO'),
  vencidos: terminosInformesObligatorios.filter(t => t.estado === 'VENCIDO').length,
  proximoVencimiento: terminosInformesObligatorios
    .filter(t => t.estado === 'PENDIENTE' && t.diasRestantes > 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)[0],
  esMes: new Date().getMonth(),
  cumplimientoAnual: 96.5, // YTD
};