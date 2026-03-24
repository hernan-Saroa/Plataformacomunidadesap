/**
 * ============================================
 * TYPES - RECURSOS OCI Y AUDITORÍAS
 * ============================================
 * 
 * Definición de recursos disponibles en la OCI,
 * auditorías programadas e informes de ley
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

/**
 * ============================================
 * RECURSOS HUMANOS OCI
 * ============================================
 */
export interface AuditorOCI {
  id: string;
  nombreCompleto: string;
  cargo: 'Jefe OCI' | 'Auditor Senior' | 'Auditor' | 'Auditor Junior' | 'Profesional de Apoyo';
  email: string;
  telefono?: string;
  
  // Experiencia
  añosExperiencia: number;
  certificaciones: Certificacion[];
  especializaciones: EspecializacionAuditoria[];
  
  // Disponibilidad
  horasDisponiblesAño: number;          // Ej: 1,800 horas/año
  horasAsignadas: number;               // Horas ya comprometidas
  horasLibres: number;                  // Disponibles para asignar
  porcentajeOcupacion: number;          // 0-100
  
  // Estado
  activo: boolean;
  fechaIngreso: string;
  fechaRetiro?: string;
}

export interface Certificacion {
  nombre: string;
  entidadEmisora: string;
  fechaObtencion: string;
  vigencia?: string;
  estado: 'Vigente' | 'Vencida' | 'En Renovación';
}

export type EspecializacionAuditoria = 
  | 'Auditoría Financiera'
  | 'Auditoría de Desempeño'
  | 'Auditoría de Sistemas'
  | 'Auditoría de Cumplimiento'
  | 'Auditoría Forense'
  | 'Control Interno'
  | 'Gestión de Riesgos'
  | 'Contabilidad Pública'
  | 'Contratación Estatal'
  | 'Gestión Documental'
  | 'Ética Pública';

/**
 * ============================================
 * RECURSOS TÉCNICOS Y PRESUPUESTALES
 * ============================================
 */
export interface RecursosOCI {
  id: string;
  vigencia: number;
  
  // Recursos humanos
  personalOCI: AuditorOCI[];
  totalAuditores: number;
  horasTotalesDisponibles: number;
  horasTotalesAsignadas: number;
  porcentajeUtilizacion: number;
  
  // Presupuesto
  presupuestoAnual: number;
  presupuestoEjecutado: number;
  presupuestoDisponible: number;
  distribucionPresupuesto: DistribucionPresupuesto;
  
  // Recursos tecnológicos
  herramientas: HerramientaTecnologica[];
  sistemas: Sistema[];
  
  // Recursos materiales
  oficinas: string[];
  equipos: string[];
  
  // Capacitación
  planCapacitacion: PlanCapacitacion;
  presupuestoCapacitacion: number;
}

export interface DistribucionPresupuesto {
  personal: number;
  capacitacion: number;
  tecnologia: number;
  desplazamientos: number;
  papeleria: number;
  otros: number;
}

export interface HerramientaTecnologica {
  nombre: string;
  tipo: 'Software' | 'Plataforma' | 'Aplicativo';
  proveedor: string;
  licencias: number;
  costoAnual: number;
  uso: string;
}

export interface Sistema {
  nombre: string;
  descripcion: string;
  acceso: boolean;
  responsable: string;
}

export interface PlanCapacitacion {
  cursosProgramados: CursoCapacitacion[];
  presupuestoTotal: number;
  horasTotales: number;
}

export interface CursoCapacitacion {
  nombre: string;
  tema: EspecializacionAuditoria;
  proveedor: string;
  duracion: number;                     // Horas
  costo: number;
  fechaProgramada: string;
  participantes: string[];              // IDs auditores
}

/**
 * ============================================
 * AUDITORÍA PROGRAMADA
 * ============================================
 */
export interface AuditoriaProgramada {
  id: string;
  codigo: string;                       // AUD-2026-001
  
  // Identificación
  nombre: string;
  objetivo: string;
  alcance: string;
  tipo: TipoAuditoriaProgramada;
  
  // Unidad auditable
  unidadAuditableId: string;
  unidadAuditableNombre: string;
  riesgoAsociado: CategoriaRiesgoAuditoria;
  
  // Equipo auditor
  liderAuditoria: string;               // ID auditor
  equipoAuditor: string[];              // IDs auditores
  
  // Cronograma
  fechaInicioEstimada: string;
  fechaFinEstimada: string;
  duracionDias: number;
  horasEstimadas: number;
  
  // Ejecución
  estado: EstadoAuditoria;
  fechaInicioReal?: string;
  fechaFinReal?: string;
  horasEjecutadas: number;
  porcentajeAvance: number;
  
  // Resultados
  hallazgos?: Hallazgo[];
  recomendaciones?: string[];
  informeFinal?: string;                // URL o ID del documento
  
  // Seguimiento
  planMejoramientoGenerado: boolean;
  estadoPlanMejoramiento?: EstadoPlanMejoramiento;
  
  // Metadata
  observaciones: string;
  documentos: DocumentoAuditoria[];
}

export type TipoAuditoriaProgramada = 
  | 'Auditoría Interna Regular'
  | 'Auditoría Especial'
  | 'Auditoría de Cumplimiento'
  | 'Auditoría de Desempeño'
  | 'Auditoría de Sistemas'
  | 'Revisión de Control'
  | 'Seguimiento';

export type CategoriaRiesgoAuditoria = 
  | 'Crítico'
  | 'Alto'
  | 'Medio'
  | 'Bajo';

export type EstadoAuditoria = 
  | 'Programada'
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada'
  | 'Cancelada'
  | 'Suspendida';

export interface Hallazgo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  criterio: string;                     // Norma o criterio incumplido
  condicion: string;                    // Situación encontrada
  causa: string;
  efecto: string;
  recomendacion: string;
  responsable: string;
  fechaLimite: string;
  estado: EstadoHallazgo;
}

export type TipoHallazgo = 
  | 'Administrativo'
  | 'Financiero'
  | 'Operacional'
  | 'Cumplimiento'
  | 'Tecnológico'
  | 'Documental';

export type SeveridadHallazgo = 
  | 'Baja'
  | 'Media'
  | 'Alta'
  | 'Crítica';

export type EstadoHallazgo = 
  | 'Abierto'
  | 'En Corrección'
  | 'Cerrado'
  | 'Vencido';

export type EstadoPlanMejoramiento = 
  | 'No Aplica'
  | 'En Construcción'
  | 'En Ejecución'
  | 'Cerrado'
  | 'Vencido';

export interface DocumentoAuditoria {
  id: string;
  nombre: string;
  tipo: TipoDocumentoAuditoria;
  url: string;
  fechaCarga: string;
  cargadoPor: string;
}

export type TipoDocumentoAuditoria = 
  | 'Programa de Auditoría'
  | 'Papeles de Trabajo'
  | 'Informe Preliminar'
  | 'Informe Final'
  | 'Matriz de Hallazgos'
  | 'Plan de Mejoramiento'
  | 'Evidencias'
  | 'Comunicaciones'
  | 'Otro';

/**
 * ============================================
 * CRONOGRAMA ANUAL DE AUDITORÍAS
 * ============================================
 */
export interface CronogramaAnualAuditorias {
  vigencia: number;
  fechaAprobacion: string;
  aprobadoPor: string;
  
  // Auditorías
  auditoriasProgramadas: AuditoriaProgramada[];
  totalAuditorias: number;
  
  // Distribución temporal
  distribucionPorMes: DistribucionMensual[];
  distribucionPorTrimestre: DistribucionTrimestral[];
  
  // Recursos
  horasTotalesRequeridas: number;
  horasDisponibles: number;
  brechaRecursos: number;               // Positivo = sobran, Negativo = faltan
  
  // Cobertura
  unidadesCubiertas: number;
  unidadesTotales: number;
  porcentajeCobertura: number;
  
  // Estado
  estadoGeneral: EstadoCronograma;
}

export interface DistribucionMensual {
  mes: string;
  auditoriasProgramadas: number;
  auditoriasCompletadas: number;
  horasRequeridas: number;
  horasDisponibles: number;
}

export interface DistribucionTrimestral {
  trimestre: number;
  auditoriasProgramadas: number;
  auditoriasCompletadas: number;
  porcentajeCumplimiento: number;
}

export type EstadoCronograma = 
  | 'En Cumplimiento'
  | 'Con Retrasos Menores'
  | 'Con Retrasos Significativos'
  | 'Crítico';

/**
 * ============================================
 * INFORMES DE LEY (28 INFORMES OFICIALES)
 * ============================================
 */
export interface InformeLey {
  id: string;
  codigo: string;                       // INF-2026-001
  nombre: string;
  descripcion: string;
  
  // Normativa
  normasAplicables: string[];           // Ej: ["Ley 1474 de 2011 art. 9"]
  
  // Periodicidad
  periodicidad: PeriodicidadInforme;
  fechasVencimiento: string[];          // Fechas de entrega en el año
  
  // Destinatario
  destinatario: DestinatarioInforme;
  destinatarioEspecifico?: string;      // Nombre específico si aplica
  
  // Responsable
  responsableElaboracion: string;
  responsableAprobacion: string;
  
  // Estado
  estadosEntregas: EstadoEntregaInforme[];
  
  // Observaciones
  observaciones: string;
  formatoOficial?: string;              // Ej: "Formato FURAG"
  plataformaEntrega?: string;           // Ej: "SIRECI"
}

export type PeriodicidadInforme = 
  | 'Mensual'
  | 'Bimestral'
  | 'Trimestral'
  | 'Cuatrimestral'
  | 'Semestral'
  | 'Anual'
  | 'Eventual';

export type DestinatarioInforme = 
  | 'Representante Legal'
  | 'DAFP'
  | 'Contraloría General de la República'
  | 'Contaduría General de la Nación'
  | 'Archivo General de la Nación'
  | 'Agencia de Defensa Jurídica del Estado'
  | 'Dirección Nacional de Derecho de Autor'
  | 'Congreso'
  | 'Entes de Control'
  | 'Interno';

export interface EstadoEntregaInforme {
  periodo: string;                      // Ej: "Enero 2026"
  fechaVencimiento: string;
  fechaEntrega?: string;
  estado: EstadoInforme;
  responsable: string;
  documentoEntregado?: string;          // URL o ID
  observaciones: string;
}

export type EstadoInforme = 
  | 'Pendiente'
  | 'En Elaboración'
  | 'En Revisión'
  | 'Entregado'
  | 'Vencido'
  | 'No Aplica';

/**
 * ============================================
 * CALENDARIO DE INFORMES
 * ============================================
 */
export interface CalendarioInformesLey {
  vigencia: number;
  
  informes: InformeLey[];
  totalInformes: number;
  
  // Próximos vencimientos
  proximosVencimientos: ProximoVencimiento[];
  
  // Estado general
  informesAlDia: number;
  informesPendientes: number;
  informesVencidos: number;
  porcentajeCumplimiento: number;
}

export interface ProximoVencimiento {
  informeId: string;
  informeNombre: string;
  fechaVencimiento: string;
  diasFaltantes: number;
  prioridad: 'Urgente' | 'Alta' | 'Media' | 'Baja';
  estado: EstadoInforme;
}

/**
 * ============================================
 * HELPERS Y UTILIDADES
 * ============================================
 */

// Crear auditoría programada
export interface CrearAuditoriaInput {
  nombre: string;
  objetivo: string;
  alcance: string;
  tipo: TipoAuditoriaProgramada;
  unidadAuditableId: string;
  liderAuditoria: string;
  equipoAuditor: string[];
  fechaInicioEstimada: string;
  duracionDias: number;
  horasEstimadas: number;
}

// Actualizar estado auditoría
export interface ActualizarEstadoAuditoriaInput {
  auditoriaId: string;
  nuevoEstado: EstadoAuditoria;
  porcentajeAvance?: number;
  horasEjecutadas?: number;
  observaciones?: string;
}

// Registrar hallazgo
export interface RegistrarHallazgoInput {
  auditoriaId: string;
  titulo: string;
  descripcion: string;
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  criterio: string;
  condicion: string;
  causa: string;
  efecto: string;
  recomendacion: string;
  responsable: string;
  fechaLimite: string;
}

/**
 * ============================================
 * GUARDS (Type Guards)
 * ============================================
 */
export function esAuditoriaRetrasada(auditoria: AuditoriaProgramada): boolean {
  if (auditoria.estado === 'Finalizada' || auditoria.estado === 'Cancelada') {
    return false;
  }
  
  const hoy = new Date();
  const fechaFin = new Date(auditoria.fechaFinEstimada);
  
  return hoy > fechaFin;
}

export function esInformeVencido(estadoEntrega: EstadoEntregaInforme): boolean {
  if (estadoEntrega.estado === 'Entregado' || estadoEntrega.estado === 'No Aplica') {
    return false;
  }
  
  const hoy = new Date();
  const fechaVencimiento = new Date(estadoEntrega.fechaVencimiento);
  
  return hoy > fechaVencimiento;
}

export function calcularDiasParaVencimiento(fecha: string): number {
  const hoy = new Date();
  const fechaVencimiento = new Date(fecha);
  const diff = fechaVencimiento.getTime() - hoy.getTime();
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
