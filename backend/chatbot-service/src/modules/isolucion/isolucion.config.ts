import { ConfigService } from '@nestjs/config';

export class IsolucionError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function identifier(value: string): string {
  // Los identificadores provienen solo de configuración o del catálogo SQL.
  if (!value || value.length > 128 || /[\u0000-\u001f]/.test(value)) {
    throw new IsolucionError('INVALID_IDENTIFIER');
  }
  return `[${value.replace(/\]/g, ']]')}]`;
}

export function isolucionConfig(config: ConfigService) {
  const get = (name: string, fallback = '') => String(config.get(`CHATBOT_ISOLUCION_${name}`) ?? fallback).trim();
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const value = Number(get(name, String(fallback)));
    if (!Number.isInteger(value) || value < min || value > max) throw new IsolucionError('INVALID_CONFIG');
    return value;
  };
  const enabled = get('ENABLED', 'false') === 'true';
  const searchEnabled = get('SEARCH_ENABLED', 'false') === 'true';
  const schema = get('SCHEMA');
  const view = get('VIEW', 'VW_LISTADOMAESTRODOCUMENTOS');
  if (schema) identifier(schema);
  identifier(view);
  return {
    enabled, searchEnabled, schema, view,
    server: get('SERVER'), database: get('DATABASE', 'Isolucion5Esap'), user: get('USER'),
    // No recortar ni interpolar la contraseña: puede contener espacios o $.
    password: String(config.get('CHATBOT_ISOLUCION_PASSWORD') ?? ''),
    port: integer('PORT', 1433, 1, 65535),
    encrypt: get('ENCRYPT', 'true') !== 'false',
    trustServerCertificate: get('TRUST_SERVER_CERTIFICATE', 'false') === 'true',
    columns: {
      id: get('ID_COLUMN'), title: get('TITLE_COLUMN'), text: get('TEXT_COLUMN'),
      url: get('URL_COLUMN'), version: get('VERSION_COLUMN'), allowed: get('ALLOWED_COLUMN'),
    },
    allowedValue: get('ALLOWED_VALUE'),
  };
}

export type IsolucionConfig = ReturnType<typeof isolucionConfig>;
