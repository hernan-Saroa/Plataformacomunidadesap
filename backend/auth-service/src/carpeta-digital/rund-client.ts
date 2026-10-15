import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface AccesoDocumentoRund {
  actorId: string;
  roles: string[];
  endpoint: string;
  recursoId: string;
  campos: string[];
  resultado: 'COMPLETO' | 'ENMASCARADO' | 'DENEGADO';
}

/** Lo que Carpeta Digital necesita de RUND para proteger sus documentos. */
export interface RundDocumentAccessApi {
  registrarAcceso(acceso: AccesoDocumentoRund): Promise<void>;
  esOriginalRund(url: string, recursoId: string, endpoints: string[]): Promise<boolean>;
}

/**
 * Cliente de la API interna de rund-service (token de servicio, no JWT de usuario).
 * El RUND ya no comparte esquema con auth: sus soportes y su bitácora de accesos se
 * consultan y se escriben por HTTP.
 */
@Injectable()
export class RundClient implements RundDocumentAccessApi {
  private get base(): string {
    return (process.env.RUND_SERVICE_URL || 'http://rund-service:3016').replace(/\/+$/, '');
  }

  private get headers(): Record<string, string> {
    const token = process.env.INTERNAL_SERVICE_TOKEN || (process.env.NODE_ENV === 'production' ? '' : 'esap-internal-service-dev-token');
    if (!token) throw new ServiceUnavailableException('Falta INTERNAL_SERVICE_TOKEN para consultar el RUND.');
    return { 'x-internal-service-token': token, 'content-type': 'application/json' };
  }

  private async llamar<T>(ruta: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/internal/rund/v1/${ruta}`, {
        method: init.method ?? 'GET',
        headers: this.headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('El servicio RUND no responde.');
    }
    if (!res.ok) throw new ServiceUnavailableException(`El servicio RUND respondió ${res.status}.`);
    try {
      const cuerpo: unknown = await res.json();
      if (!cuerpo || typeof cuerpo !== 'object') throw new Error();
      if ('success' in cuerpo && cuerpo.success !== true) throw new Error();
      // Una envoltura incompleta nunca se interpreta como una respuesta directa válida.
      const data = 'data' in cuerpo ? cuerpo.data : cuerpo;
      if (!data || typeof data !== 'object') throw new Error();
      return data as T;
    } catch {
      throw new ServiceUnavailableException('El servicio RUND no confirmó una respuesta válida.');
    }
  }

  /** Soportes RUND de la persona. */
  soportesPorPersona(personaId: string): Promise<any[]> {
    return this.llamar<any[]>(`soportes/por-persona/${encodeURIComponent(personaId)}`);
  }

  async registrarAcceso(acceso: AccesoDocumentoRund): Promise<void> {
    const result = await this.llamar<{ registrado: boolean }>('accesos-documentos', { method: 'POST', body: acceso });
    if (result.registrado !== true) {
      throw new ServiceUnavailableException('El servicio RUND no confirmó el registro del acceso.');
    }
  }

  async esOriginalRund(url: string, recursoId: string, endpoints: string[]): Promise<boolean> {
    const r = await this.llamar<{ esOriginalRund: boolean }>('originales/verificar', { method: 'POST', body: { url, recursoId, endpoints } });
    if (typeof r.esOriginalRund !== 'boolean') {
      throw new ServiceUnavailableException('El servicio RUND no confirmó la protección del documento.');
    }
    return r.esOriginalRund;
  }

  /** Agregados del RUND para el tablero del backoffice. */
  estadisticasBackoffice(): Promise<any> {
    return this.llamar('estadisticas/backoffice');
  }
}
