import { Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RUND_PERMISSION_CODES } from '../auth/rund-permission-catalog';
import { AuthBulkPreview, AuthBulkPreviewQuery, isAuthBulkPreview } from './auth-bulk-preview.contract';

export interface AuthIdentity { personaId: string; documento: string; nombreCompleto: string | null }
export interface AuthPtaIdentity extends AuthIdentity { territorialId: string | null }
export interface AuthCoincidencia { personaId: string; documento: string | null; nombre: string | null; fechaNacimiento?: string }
type CoincidenciasConsulta = { tipo: 'unicidad'; documento: string | null; personaIds: string[] }
  | { tipo: 'nombre-fecha'; nombre: string; fechaNacimiento: string };
type DestinatarioConsulta = { clave: string };
type PermisosConsulta = { roles: string[]; codigos: string[] };
export interface AuthFichaPersona {
  personaId: string;
  num_identificacion: string | null;
  tip_identificacion: string | null;
  nom_largo: string | null;
  nom_tercero: string | null;
  pri_apellido: string | null;
  seg_apellido: string | null;
  gen_tercero: string | null;
  fec_nacimiento: string | null;
  dir_email: string | null;
  tel_celular: string | null;
}
type FichaResponse = { consulta: string; encontrada: boolean; persona: AuthFichaPersona | null };
const fichaFields = ['num_identificacion', 'tip_identificacion', 'nom_largo', 'nom_tercero', 'pri_apellido',
  'seg_apellido', 'gen_tercero', 'fec_nacimiento', 'dir_email', 'tel_celular'];
type PtaIdentityResponse = (AuthPtaIdentity & { encontrada: true }) | { encontrada: false; documento: string };
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const fichaPersona = (value: unknown): value is AuthFichaPersona => record(value) && uuid(value.personaId)
  && fichaFields.every(field => value[field] === null || typeof value[field] === 'string');

@Injectable()
export class AuthIdentityClient {
  private async read<T>(route: string, validate: (value: unknown) => value is T, consulta?: CoincidenciasConsulta | DestinatarioConsulta | PermisosConsulta | AuthBulkPreviewQuery): Promise<T | null> {
    const token = String(process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (!token) throw new ServiceUnavailableException('Falta la credencial interna de identidad Auth.');
    let url: URL;
    try {
      url = new URL(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/' + route;
    } catch { throw new ServiceUnavailableException('La dirección del servicio de identidad Auth no es válida.'); }
    try {
      const response = await fetch(url.toString(), { method: consulta ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'x-internal-service-token': token, Accept: 'application/json', ...(consulta ? { 'Content-Type': 'application/json' } : {}) },
        ...(consulta ? { body: JSON.stringify(consulta) } : {}) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!record(body) || ('success' in body && body.success !== true)) throw new Error();
      const data = 'data' in body ? body.data : body;
      if (!validate(data)) throw new Error();
      return data;
    } catch { throw new ServiceUnavailableException('No fue posible confirmar la identidad en Auth.'); }
  }

  async previsualizacionMasiva(documento: string, correo: string): Promise<AuthBulkPreview> {
    if (typeof documento !== 'string' || !documento.trim() || documento.includes('\0') || typeof correo !== 'string'
      || !correo || correo.includes('\0') || correo !== correo.trim().toLowerCase())
      throw new ServiceUnavailableException('No fue posible consultar la identidad del preview en Auth.');
    const consulta: AuthBulkPreviewQuery = { version: 1, documento, correo };
    const data = await this.read<AuthBulkPreview>('previsualizacion-masiva',
      (value): value is AuthBulkPreview => isAuthBulkPreview(value, consulta), consulta);
    if (!data) throw new ServiceUnavailableException('No fue posible consultar la identidad del preview en Auth.');
    return data;
  }

  async porDocumento(documento: string): Promise<AuthIdentity> {
    const data = await this.read<AuthIdentity>('por-documento/' + encodeURIComponent(documento),
      (value): value is AuthIdentity => record(value) && uuid(value.personaId) && value.documento === documento
        && (value.nombreCompleto === null || typeof value.nombreCompleto === 'string'));
    if (!data) throw new NotFoundException('Persona no encontrada en Auth.');
    return data;
  }

  async destinatarioAviso(clave: string): Promise<string | null> {
    const data = await this.read<{ consulta: string; encontrado: boolean; usuarioId: string | null }>('destinatario-aviso',
      (value): value is { consulta: string; encontrado: boolean; usuarioId: string | null } => record(value) && value.consulta === clave
        && ((value.encontrado === true && uuid(value.usuarioId)) || (value.encontrado === false && value.usuarioId === null)), { clave });
    // Un 404 aquí indica contrato ausente, no un solicitante inexistente.
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar el destinatario en Auth.');
    return data.usuarioId;
  }

  async permisosRoles(roles: string[]): Promise<string[]> {
    const consulta: PermisosConsulta = { roles: [...roles], codigos: [...RUND_PERMISSION_CODES] };
    const sameList = (value: unknown, expected: string[]) => Array.isArray(value)
      && value.length === expected.length && value.every((item, i) => item === expected[i]);
    const data = await this.read<{ items: Array<{ code: string }>; total: number }>('permisos-roles',
      (value): value is { items: Array<{ code: string }>; total: number } => record(value) && record(value.consulta)
        && sameList(value.consulta.roles, consulta.roles) && sameList(value.consulta.codigos, consulta.codigos)
        && Array.isArray(value.items) && value.items.every(item => record(item) && typeof item.code === 'string' && consulta.codigos.includes(item.code))
        && Number.isSafeInteger(value.total) && value.total === value.items.length
        && new Set(value.items.map(item => item.code)).size === value.items.length, consulta);
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar los permisos en Auth.');
    return data.items.map(item => item.code);
  }

  async resolver(clave: string): Promise<string | null> {
    const data = await this.read<{ personaId: string }>('resolver/' + encodeURIComponent(clave),
      (value): value is { personaId: string } => record(value) && uuid(value.personaId));
    return data?.personaId || null;
  }

  async perfilPta(cedula: string): Promise<AuthPtaIdentity | null> {
    const data = await this.read<PtaIdentityResponse>('perfil-pta/' + encodeURIComponent(cedula),
      (value): value is PtaIdentityResponse => record(value) && value.documento === cedula
        && (value.encontrada === false || (value.encontrada === true && uuid(value.personaId)
          && (value.nombreCompleto === null || typeof value.nombreCompleto === 'string')
          && (value.territorialId === null || (typeof value.territorialId === 'string' && /^(?:0|-?[1-9]\d*)$/.test(value.territorialId))))));
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar la identidad en Auth.');
    return data.encontrada ? data : null;
  }

  private async ficha(clave: string, porPersona: boolean): Promise<AuthFichaPersona | null> {
    const data = await this.read<FichaResponse>('ficha/' + (porPersona ? 'por-persona/' : 'por-documento/') + encodeURIComponent(clave),
      (value): value is FichaResponse => record(value) && value.consulta === clave
        && ((value.encontrada === false && value.persona === null)
          || (value.encontrada === true && fichaPersona(value.persona)
            && (porPersona ? value.persona.personaId.toLowerCase() === clave.toLowerCase() : value.persona.num_identificacion === clave))));
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar la ficha de identidad en Auth.');
    return data.persona;
  }

  fichaPorPersona(personaId: string): Promise<AuthFichaPersona | null> { return this.ficha(personaId, true); }
  fichaPorDocumento(documento: string): Promise<AuthFichaPersona | null> { return this.ficha(documento, false); }

  async personasPorAlias(clave: string): Promise<string[]> {
    const data = await this.read<{ clave: string; personaIds: string[]; total: number }>('por-alias/' + encodeURIComponent(clave),
      (value): value is { clave: string; personaIds: string[]; total: number } => record(value) && value.clave === clave
        && Array.isArray(value.personaIds) && value.personaIds.every(uuid)
        && Number.isSafeInteger(value.total) && value.total === value.personaIds.length
        && new Set(value.personaIds.map(id => id.toLowerCase())).size === value.personaIds.length);
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar los alias de identidad en Auth.');
    return data.personaIds;
  }

  private async coincidencias(consulta: CoincidenciasConsulta): Promise<AuthCoincidencia[]> {
    const sameQuery = (q: unknown) => record(q) && q.tipo === consulta.tipo && (consulta.tipo === 'unicidad'
      ? q.documento === consulta.documento && Array.isArray(q.personaIds) && q.personaIds.length === consulta.personaIds.length
        && q.personaIds.every((id, index) => id === consulta.personaIds[index])
      : q.nombre === consulta.nombre && q.fechaNacimiento === consulta.fechaNacimiento);
    const validItem = (item: unknown): item is AuthCoincidencia => record(item) && uuid(item.personaId)
      && (item.documento === null || typeof item.documento === 'string') && (item.nombre === null || typeof item.nombre === 'string')
      && (consulta.tipo !== 'nombre-fecha' || item.fechaNacimiento === consulta.fechaNacimiento);
    const data = await this.read<{ items: AuthCoincidencia[]; total: number }>('coincidencias',
      (value): value is { items: AuthCoincidencia[]; total: number } => record(value) && sameQuery(value.consulta)
        && Array.isArray(value.items) && value.items.every(validItem) && Number.isSafeInteger(value.total)
        && value.total === value.items.length
        && new Set(value.items.map(item => item.personaId.toLowerCase())).size === value.items.length, consulta);
    if (!data) throw new ServiceUnavailableException('No fue posible confirmar coincidencias de identidad en Auth.');
    return data.items;
  }

  coincidenciasUnicidad(documento: string | null, personaIds: string[]): Promise<AuthCoincidencia[]> {
    return this.coincidencias({ tipo: 'unicidad', documento, personaIds });
  }

  coincidenciasNombreFecha(nombre: string, fechaNacimiento: string): Promise<AuthCoincidencia[]> {
    return this.coincidencias({ tipo: 'nombre-fecha', nombre, fechaNacimiento });
  }

  async nombresPorPersonas(personaIds: string[]): Promise<Map<string, string | null>> {
    const ids = [...new Set(personaIds.map(id => id.toLowerCase()))];
    if (!ids.every(uuid)) throw new ServiceUnavailableException('No fue posible confirmar los nombres en Auth.');
    const nombres = new Map<string, string | null>();
    // Lotes acotados evitan superar el tamaño del body; nunca se trunca la entrada.
    // El llamador recibe el resultado solo después de confirmar todos los lotes.
    for (let offset = 0; offset < ids.length; offset += 500) {
      const batch = ids.slice(offset, offset + 500);
      const requested = new Set(batch);
      const items = await this.coincidenciasUnicidad(null, batch);
      for (const item of items) {
        const id = item.personaId.toLowerCase();
        if (!requested.has(id)) throw new ServiceUnavailableException('No fue posible confirmar los nombres en Auth.');
        nombres.set(id, item.nombre);
      }
    }
    return nombres;
  }
}

@Module({ providers: [AuthIdentityClient], exports: [AuthIdentityClient] })
export class AuthIdentityModule {}
