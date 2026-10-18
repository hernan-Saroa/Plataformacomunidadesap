export interface AuthBulkPreviewQuery { version: 1; documento: string; correo: string }
export interface AuthBulkPreview {
  consulta: AuthBulkPreviewQuery;
  persona: { id_person: string; tip_identificacion: string | null; nom_largo: string | null;
    nom_tercero: string | null; pri_apellido: string | null; seg_apellido: string | null; gen_tercero: string | null;
    fec_nacimiento: string | null; dir_email: string | null; tel_celular: string | null; id_seccional: string | null } | null;
  usuario: { id_user: string; username: string | null } | null;
  rolDocenteDisponible: boolean;
  conflictoCorreo: boolean;
  reserva: false;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => record(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const texts = ['tip_identificacion', 'nom_largo', 'nom_tercero', 'pri_apellido', 'seg_apellido', 'gen_tercero',
  'fec_nacimiento', 'dir_email', 'tel_celular'];
export function isAuthBulkPreview(value: unknown, consulta: AuthBulkPreviewQuery): value is AuthBulkPreview {
  if (!exact(value, ['consulta', 'persona', 'usuario', 'rolDocenteDisponible', 'conflictoCorreo', 'reserva'])
    || !exact(value.consulta, ['version', 'documento', 'correo']) || Object.keys(consulta).some(k => value.consulta[k] !== consulta[k])
    || value.reserva !== false || typeof value.rolDocenteDisponible !== 'boolean' || typeof value.conflictoCorreo !== 'boolean') return false;
  const person = value.persona, user = value.usuario;
  if (person !== null && (!exact(person, ['id_person', ...texts, 'id_seccional']) || !uuid(person.id_person)
    || !texts.every(k => person[k] === null || typeof person[k] === 'string')
    || !(person.id_seccional === null || typeof person.id_seccional === 'string' && /^(?:0|-?[1-9]\d*)$/.test(person.id_seccional)
      && BigInt(person.id_seccional) >= -9223372036854775808n && BigInt(person.id_seccional) <= 9223372036854775807n))) return false;
  if (user !== null && (!person || !exact(user, ['id_user', 'username']) || !uuid(user.id_user)
    || !(user.username === null || typeof user.username === 'string'))) return false;
  return true;
}
