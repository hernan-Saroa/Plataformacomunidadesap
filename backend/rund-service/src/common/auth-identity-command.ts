import { createHash } from 'crypto';

export interface IdentityWriteCommand {
  version: 1; actorId: string;
  payload: { documentNumber: string; documentType: string | null; primer_nombre: string | null; primer_apellido: string | null;
    segundo_apellido: string | null; genero: string | null; fechaNacimiento: string | null };
  options: { relaxValidation: boolean; preserveTerritorial: boolean };
  territorial: { id: string } | null;
  emailFinal: string; phoneFinal: string | null; finalFullName: string;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => record(v) && Object.keys(v).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(v,key));
const text = (v: unknown): v is string => typeof v === 'string' && !v.includes('\0');
const nullable = (v: unknown): v is string | null => v === null || text(v);

/** Orden explícito y fechas civiles: misma canonicalización en propietario y consumidor. */
export function identityWriteCommand(raw: unknown): IdentityWriteCommand {
  if (!exact(raw,['version','actorId','payload','options','territorial','emailFinal','phoneFinal','finalFullName']) || raw.version !== 1
    || !text(raw.actorId) || !raw.actorId.trim() || !text(raw.emailFinal) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.emailFinal)
    || raw.emailFinal !== raw.emailFinal.trim().toLowerCase() || !nullable(raw.phoneFinal)
    || !text(raw.finalFullName) || !raw.finalFullName.trim()
    || !exact(raw.payload,['documentNumber','documentType','primer_nombre','primer_apellido','segundo_apellido','genero','fechaNacimiento'])
    || !exact(raw.options,['relaxValidation','preserveTerritorial'])) throw new Error('Comando de identidad inválido.');
  const p=raw.payload,o=raw.options;
  if (!text(p.documentNumber) || !p.documentNumber.trim() || ![p.documentType,p.primer_nombre,p.primer_apellido,p.segundo_apellido,p.genero].every(nullable)
    || typeof o.relaxValidation !== 'boolean' || typeof o.preserveTerritorial !== 'boolean') throw new Error('Comando de identidad inválido.');
  if (p.fechaNacimiento !== null && (!text(p.fechaNacimiento) || !/^\d{4}-\d\d-\d\d$/.test(p.fechaNacimiento)
    || !Number.isFinite(Date.parse(p.fechaNacimiento)) || new Date(p.fechaNacimiento).toISOString().slice(0,10) !== p.fechaNacimiento)) throw new Error('Fecha civil inválida.');
  if (raw.territorial !== null && (!exact(raw.territorial,['id']) || !text(raw.territorial.id) || !/^[+-]?\d+$/.test(raw.territorial.id)
    || BigInt(raw.territorial.id) < -9223372036854775808n || BigInt(raw.territorial.id) > 9223372036854775807n)) throw new Error('Seccional inválida.');
  return { version:1,actorId:raw.actorId,payload:{documentNumber:p.documentNumber,documentType:p.documentType as string|null,
    primer_nombre:p.primer_nombre as string|null,primer_apellido:p.primer_apellido as string|null,segundo_apellido:p.segundo_apellido as string|null,
    genero:p.genero as string|null,fechaNacimiento:p.fechaNacimiento as string|null},
    options:{relaxValidation:o.relaxValidation,preserveTerritorial:o.preserveTerritorial},
    territorial:raw.territorial===null?null:{id:(raw.territorial as {id:string}).id},emailFinal:raw.emailFinal,phoneFinal:raw.phoneFinal,finalFullName:raw.finalFullName };
}
export function identityWriteFingerprint(raw: unknown): string {
  return createHash('sha256').update(JSON.stringify(identityWriteCommand(raw))).digest('hex');
}
