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

export interface ConfigTipoComisionado {
  id: string;
  tipoComisionado: string;
  camposObligatorios: string[];
  camposOpcionales: string[];
  camposOcultos: string[];
  documentosObligatorios: string[];
  documentosOpcionales: string[];
  activo: boolean;
}

export interface ParametrizacionFormulario {
  campos: CampoFormulario[];
  configuraciones: Record<string, ConfigTipoComisionado>;
}
