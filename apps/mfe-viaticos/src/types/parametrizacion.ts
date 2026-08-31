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
}

export interface TipoDocumentoSoporte {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
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
