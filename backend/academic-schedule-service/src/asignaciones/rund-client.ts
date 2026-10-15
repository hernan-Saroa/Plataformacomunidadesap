import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

/**
 * Perfil del docente tal como lo publica rund-service (dueño del dato). Son datos
 * crudos: la interpretación (categoría de vinculación, situación asignable) se
 * hace aquí, con la lógica de programación.
 */
export interface DocenteRund {
  idDocente: string;
  idPersona: string;
  documento: string;
  nombreCompleto: string;
  tipoVinculacion: string | null;
  escalafon: string | null;
  horasAsignables: number | string | null;
  investigacion: number | string | null;
  fechaInicioVinculacion: string | null;
  fechaFinVinculacion: string | null;
  situacionAdministrativa: string | null;
  situacionCategoria: string | null;
}

const texto = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nullableTexto = (value: unknown) => value === null || typeof value === 'string';
const horas = (value: unknown) => value === null ||
  ((typeof value === 'number' || texto(value)) && Number.isFinite(Number(value)) && Number(value) >= 0);
const fecha = (value: unknown) => {
  if (value === null) return true;
  if (!texto(value) || !/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  return Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
};

function esPerfil(value: unknown, documento: string): value is DocenteRund {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return texto(row.idDocente) && typeof row.idPersona === 'string'
    && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.idPersona)
    && row.documento === documento && texto(row.nombreCompleto)
    && ['tipoVinculacion', 'escalafon', 'situacionAdministrativa', 'situacionCategoria'].every(key => nullableTexto(row[key]))
    && horas(row.horasAsignables) && fecha(row.fechaInicioVinculacion) && fecha(row.fechaFinVinculacion)
    // El origen admite texto de investigación; no se transforma en horas ni cambia aquí.
    && (nullableTexto(row.investigacion) || (typeof row.investigacion === 'number' && Number.isFinite(row.investigacion)));
}

/**
 * Cliente de rund-service. El RUND es de solo lectura para Programación (RN-09) y
 * el dato vive en otro microservicio: se consulta por su API interna, no por SQL.
 *
 * Se FALLA CERRADO: sin poder leer al docente no se puede validar el bloqueo duro
 * ni el tope de horas, y asignar a ciegas es el error caro.
 */
@Injectable()
export class RundClient {
  private get base(): string {
    return (process.env.RUND_SERVICE_URL || 'http://rund-service:3016').replace(/\/+$/, '');
  }

  private get token(): string {
    const token = process.env.INTERNAL_SERVICE_TOKEN || (process.env.NODE_ENV === 'production' ? '' : 'esap-internal-service-dev-token');
    if (!token) throw new ServiceUnavailableException('Falta INTERNAL_SERVICE_TOKEN para consultar el RUND.');
    return token;
  }

  async docentePorDocumento(documento: string): Promise<DocenteRund> {
    const limpio = String(documento ?? '').trim();
    const url = `${this.base}/internal/rund/v1/docentes/por-documento/${encodeURIComponent(limpio)}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'x-internal-service-token': this.token }, signal: AbortSignal.timeout(10_000) });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('No se pudo consultar el RUND: el servicio no responde.');
    }
    if (res.status === 404) {
      throw new NotFoundException(`No existe un docente con documento ${limpio} en el RUND.`);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`No se pudo consultar el RUND (respondió ${res.status}).`);
    }
    try {
      const cuerpo: unknown = await res.json();
      if (!cuerpo || typeof cuerpo !== 'object' || ('success' in cuerpo && cuerpo.success !== true)) throw new Error();
      const data = 'data' in cuerpo ? cuerpo.data : cuerpo;
      if (!esPerfil(data, limpio)) throw new Error();
      return data;
    } catch {
      throw new ServiceUnavailableException('El RUND no confirmó un perfil válido para el documento solicitado.');
    }
  }
}
