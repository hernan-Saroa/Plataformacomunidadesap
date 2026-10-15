import { ServiceUnavailableException } from '@nestjs/common';

type Consulta = { personaId: string; usuarioId: string; rolId: string };
export type RundSyncIdentity = {
  id_person: string; num_identificacion: string | null; dir_email: string | null;
  territorial_id: string | null; territorial_nombre: string | null; sede_id: string | null;
  usuario_activo: boolean | null; rol_docente_activo: boolean;
};
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

/** Usa la misma base, credencial y plazo que /users; no consulta SQL de Auth. */
export class RundAuthSyncOwner {
  constructor(private readonly base: URL, private readonly token: string, private readonly timeout: number) {}

  private async read(route: string, consulta?: Consulta): Promise<any> {
    try {
      const url = new URL(this.base);
      url.pathname = url.pathname.replace(/\/$/, '') + '/internal/rund/v1/personas/sincronizacion/' + route;
      const response = await fetch(url, {
        method: consulta ? 'POST' : 'GET',
        headers: { 'x-internal-service-token': this.token, Accept: 'application/json',
          ...(consulta ? { 'Content-Type': 'application/json' } : {}) },
        ...(consulta ? { body: JSON.stringify(consulta) } : {}),
        redirect: 'error', signal: AbortSignal.timeout(this.timeout),
      });
      if (!response.ok) throw new Error();
      const text = await response.text();
      if (text.length > 1024 * 1024) throw new Error();
      const body = JSON.parse(text);
      if (!body || body.success === false) throw new Error();
      return body.data ?? body;
    } catch { throw new ServiceUnavailableException('No fue posible revalidar la sincronización con Auth.'); }
  }

  async rolDocente(): Promise<string> {
    const body = await this.read('rol-docente');
    if (!uuid(body?.rolId)) throw new ServiceUnavailableException('Auth devolvió un rol DOCENTE incompatible.');
    return body.rolId;
  }

  async revalidar(personaId: string, usuarioId: string, rolId: string): Promise<RundSyncIdentity | null> {
    const consulta = { personaId, usuarioId, rolId };
    const body = await this.read('revalidar', consulta);
    const validEcho = Object.entries(consulta).every(([key, value]) => body?.consulta?.[key] === value);
    const identity = body?.identidad;
    if (validEcho && body?.encontrada === false && identity === null) return null;
    const nullableText = (value: unknown) => value === null || typeof value === 'string';
    if (!validEcho || body?.encontrada !== true || !identity || !uuid(identity.id_person)
      || identity.id_person.toLowerCase() !== personaId.toLowerCase()
      || !['num_identificacion', 'dir_email', 'territorial_id', 'territorial_nombre', 'sede_id'].every(key => nullableText(identity[key]))
      || !(identity.usuario_activo === null || typeof identity.usuario_activo === 'boolean')
      || typeof identity.rol_docente_activo !== 'boolean') {
      throw new ServiceUnavailableException('Auth devolvió una revalidación de cuenta incompatible.');
    }
    return identity;
  }
}
