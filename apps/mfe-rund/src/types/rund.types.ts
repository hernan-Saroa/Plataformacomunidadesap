export interface DocenteRund {
  idDocente: string;
  idPersona?: string;
  numeroDocumento: string;
  tipoDocumento: string;
  nombres: string;
  apellidos: string;
  correoInstitucional?: string;
  correoPersonal?: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  departamentoCodigo?: string;
  departamentoNombre?: string;
  municipioCodigo?: string;
  municipioNombre?: string;
  escalafonDocente: 'INSTRUCTOR' | 'ASISTENTE' | 'ASOCIADO' | 'TITULAR';
  categoriaMinciencias: 'INVESTIGADOR_JUNIOR' | 'ASOCIADO' | 'INVESTIGADOR_SENIOR' | 'EMERITO' | 'SIN_CATEGORIA';
  estadoRund: 'ACTIVO' | 'INACTIVO' | 'EN_REVISION' | 'PENDIENTE_VALIDACION' | 'SUSPENDIDO';
  numeroTarjetaRund?: string;
  fechaExpedicionRund?: string;
  horasSemanalesMax: number;
  sedePrincipalId?: string;
  sedePrincipalNombre?: string;
  fechaIngresoEsap?: string;
  esParEvaluador: boolean;
  fotoPerfilUrl?: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  formaciones?: FormacionAcademica[];
  experiencias?: ExperienciaDocente[];
  producciones?: ProduccionIntelectual[];
  situaciones?: SituacionAdministrativa[];
  soportes?: SoporteDocumental[];
}

export interface FormacionAcademica {
  idFormacion: string;
  idDocente: string;
  nivelEducativo: string;
  tituloObtenido: string;
  institucion: string;
  pais: string;
  anoGraduacion?: number;
  convalidadMineducacion: boolean;
  numeroResolucionConvalidacion?: string;
  soporteUrl?: string;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OBSERVADO';
  observaciones?: string;
  createdAt: string;
}

export interface ExperienciaDocente {
  idExperiencia: string;
  idDocente: string;
  tipoExperiencia: string;
  institucionEmpresa: string;
  cargoAsignatura: string;
  fechaInicio: string;
  fechaFin?: string;
  esActual: boolean;
  horasSemanales: number;
  soporteUrl?: string;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OBSERVADO';
  observaciones?: string;
  createdAt: string;
}

export interface ProduccionIntelectual {
  idProduccion: string;
  idDocente: string;
  tipoProduccion: string;
  titulo: string;
  autores?: string;
  revistaEditorial?: string;
  issnIsbn?: string;
  anoPublicacion?: number;
  indexacionTipo?: string;
  linkDoi?: string;
  soporteUrl?: string;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OBSERVADO';
  createdAt: string;
}

export interface SituacionAdministrativa {
  idSituacion: string;
  idDocente: string;
  tipoNovedad: string;
  fechaInicio: string;
  fechaFin?: string;
  numeroActoAdministrativo?: string;
  fechaActo?: string;
  soporteUrl?: string;
  estado: 'VIGENTE' | 'FINALIZADA' | 'CANCELADA';
  observaciones?: string;
  createdAt: string;
}

export interface SoporteDocumental {
  idSoporte: string;
  idDocente: string;
  tipoDocumento: string;
  categoria: string;
  nombreArchivo: string;
  rutaArchivo: string;
  mimetype: string;
  tamanoBytes?: number;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OBSERVADO';
  validadoPor?: string;
  fechaValidacion?: string;
  observaciones?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalDocentes: number;
  activos: number;
  enRevision: number;
  pendientesValidacion: number;
  soportesPendientes: number;
  novedadesVigentes: number;
  porEscalafon: { escalafon: string; total: number }[];
  porMinciencias: { categoria: string; total: number }[];
}
