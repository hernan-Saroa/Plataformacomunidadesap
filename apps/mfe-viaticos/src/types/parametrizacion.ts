export type TipoCampoFormulario =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'DATE'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'CURRENCY'
  | 'DOCUMENT';

export type GrupoCampoFormulario = 'comisionado' | 'comision' | 'valores' | 'soportes';

export interface CampoFormulario {
  id: string;
  clave: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormulario;
  placeholder: string | null;
  opciones: Array<{ value: string; label: string }> | null;
  grupo: GrupoCampoFormulario | null;
  orden: number;
  activo: boolean;
  limiteCaracteres?: number | null;
}

export interface TipoDocumentoSoporte {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  instruccionesValidacion?: string | null;
  camposAValidar?: string[];
  activo: boolean;
}

export interface ConfigTipoComisionadoDocumento {
  id: string;
  configTipoComisionadoId: string;
  tipoDocumentoSoporteId: string;
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';
  tipoDocumentoSoporte: TipoDocumentoSoporte;
}

export interface ConfigTipoComisionado {
  id: string;
  tipoComisionado: string;
  codigoFormulario: string;
  camposObligatorios: string[];
  camposOpcionales: string[];
  camposOcultos: string[];
  activo: boolean;
  documentos: ConfigTipoComisionadoDocumento[];
}

export interface ParametrizacionFormulario {
  campos: CampoFormulario[];
  configuraciones: Record<string, ConfigTipoComisionado>;
}

// DTOs para crear/actualizar
export interface CrearCampoFormularioDTO {
  clave: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormulario;
  placeholder?: string;
  opciones?: Array<{ value: string; label: string }>;
  grupo?: GrupoCampoFormulario;
  orden?: number;
  activo?: boolean;
  limiteCaracteres?: number | null;
}

export interface ActualizarCampoFormularioDTO {
  etiqueta?: string;
  tipoCampo?: TipoCampoFormulario;
  placeholder?: string;
  opciones?: Array<{ value: string; label: string }>;
  grupo?: GrupoCampoFormulario;
  orden?: number;
  activo?: boolean;
  limiteCaracteres?: number | null;
}

export interface CrearConfigTipoComisionadoDTO {
  tipoComisionado: string;
  codigoFormulario: string;
  camposObligatorios: string[];
  camposOpcionales?: string[];
  camposOcultos?: string[];
  documentosObligatorios?: string[];
  documentosOpcionales?: string[];
  activo?: boolean;
}

export interface ActualizarConfigTipoComisionadoDTO {
  codigoFormulario?: string;
  camposObligatorios?: string[];
  camposOpcionales?: string[];
  camposOcultos?: string[];
  documentosObligatorios?: string[];
  documentosOpcionales?: string[];
  activo?: boolean;
}

export interface CrearTipoDocumentoSoporteDTO {
  codigo: string;
  nombre: string;
  descripcion?: string;
  instruccionesValidacion?: string;
  camposAValidar?: string[];
  activo?: boolean;
}

export interface ActualizarTipoDocumentoSoporteDTO {
  nombre?: string;
  descripcion?: string;
  instruccionesValidacion?: string;
  camposAValidar?: string[];
  activo?: boolean;
}

export interface EscalaViatico {
  id: number;
  decretoVigente: string;
  anoVigencia: number;
  rangoMinimo: number;
  rangoMaximo: number;
  tarifaDiaria: number;
  creadoEn: string;
}

export interface TarifaInvestigador {
  id: number;
  categoriaInvestigador: string;
  tarifaDiaria: number;
  creadoEn: string;
}

export interface TarifaRegionalExcepcion {
  id: number;
  departamento: string;
  esNuevoDepartamento: boolean;
  tarifaDiaria: number;
  decretoReferencia: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface TarifaTransporteTerminal {
  id?: number;
  departamento: string;
  departamentoId?: number | null;
  ciudad?: string;
  ciudadAeropuerto: string;
  valorMaximoTrayecto: number;
  incrementoIncluido?: boolean;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiquidationParam {
  id: number;
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ConfigJornadaLaboral {
  id: number;
  codigo: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  diasLaborales: number[];
  diasAnticipacionMinima: number;
  diasUmbralAvance: number;
  activo: boolean;
  descripcion?: string | null;
  actualizadoPor?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CrearConfigJornadaLaboralDTO {
  codigo: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  diasLaborales: number[];
  diasAnticipacionMinima: number;
  diasUmbralAvance: number;
  activo?: boolean;
  descripcion?: string;
}

export interface ActualizarConfigJornadaLaboralDTO {
  nombre?: string;
  horaInicio?: string;
  horaFin?: string;
  diasLaborales?: number[];
  diasAnticipacionMinima?: number;
  diasUmbralAvance?: number;
  activo?: boolean;
  descripcion?: string;
}

