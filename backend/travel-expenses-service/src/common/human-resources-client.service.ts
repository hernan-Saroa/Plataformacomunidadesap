import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface HumanResourcesSuggestedPerson {
  full_name: string | null;
  id_number: string | null;
  career_category?: string | null;
  position_category?: string | null;
  position_name?: string | null;
  organization_department?: string | null;
  internal_group?: string | null;
  cost_center?: string | null;
  email?: string | null;
  personal_email?: string | null;
  phone?: string | null;
  monthly_salary?: number | null;
  status?: string | null;
}

export interface HumanResourcesLookupResult {
  ok: boolean;
  found: boolean;
  document: string;
  total?: number;
  rows?: Array<{
    suggested_certificate_request?: HumanResourcesSuggestedPerson;
    [key: string]: any;
  }>;
}

@Injectable()
export class HumanResourcesClientService {
  private readonly logger = new Logger(HumanResourcesClientService.name);

  private getCertificationServiceUrl(): string {
    const isLocalhost = process.env.NODE_ENV !== 'production';
    return (
      process.env.CERTIFICATION_SERVICE_URL ||
      (isLocalhost
        ? 'http://localhost:3004'
        : 'http://certification-service:3004')
    ).replace(/\/+$/, '');
  }

  /**
   * Consulta el registro de talento humano (Oracle FNC / VW_INTEGRACIONFNC)
   * a través de certification-service. Si el servicio no responde, falla o
   * retorna 404/vacío, devuelve null de forma segura.
   */
  async consultarFuncionarioPorDocumento(
    documento: string,
    timeoutMs = 4000,
  ): Promise<HumanResourcesSuggestedPerson | null> {
    const docLimpio = String(documento || '').trim();
    if (!docLimpio) return null;

    const baseUrl = this.getCertificationServiceUrl();
    const endpointUrl = `${baseUrl}/certificates/integracion-fnc/documento/${encodeURIComponent(docLimpio)}?limit=1`;

    try {
      const responseData = await this.httpGet<HumanResourcesLookupResult>(
        endpointUrl,
        timeoutMs,
      );

      if (!responseData || !responseData.found || !Array.isArray(responseData.rows)) {
        return null;
      }

      const primerRegistro = responseData.rows[0];
      const sugerido = primerRegistro?.suggested_certificate_request;
      if (sugerido && sugerido.id_number) {
        return sugerido;
      }

      return null;
    } catch (error: any) {
      this.logger.warn(
        `[HumanResourcesClient] No se pudo consultar talento humano para documento ${docLimpio}: ${
          error?.message || error
        }`,
      );
      return null;
    }
  }

  /**
   * Búsqueda general de funcionarios por nombre o documento en Oracle FNC.
   */
  async buscarFuncionariosPorTermino(
    termino: string,
    limit = 20,
    timeoutMs = 6000,
  ): Promise<HumanResourcesSuggestedPerson[]> {

    const termLimpio = String(termino || '').trim();
    if (termLimpio.length < 3) return [];

    const baseUrl = this.getCertificationServiceUrl();
    const endpointUrl = `${baseUrl}/certificates/integracion-fnc/buscar?term=${encodeURIComponent(
      termLimpio,
    )}&limit=${Math.min(limit, 50)}`;

    try {
      const responseData = await this.httpGet<{
        ok?: boolean;
        total?: number;
        rows?: HumanResourcesSuggestedPerson[];
      }>(endpointUrl, timeoutMs);

      if (responseData && Array.isArray(responseData.rows)) {
        return responseData.rows;
      }
      return [];
    } catch (error: any) {
      this.logger.warn(
        `[HumanResourcesClient] Error en búsqueda de talento humano con término "${termLimpio}": ${
          error?.message || error
        }`,
      );
      return [];
    }
  }

  private httpGet<T>(targetUrl: string, timeoutMs: number): Promise<T | null> {

    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const transport = parsed.protocol === 'https:' ? https : http;

        const req = transport.request(
          parsed,
          {
            method: 'GET',
            timeout: timeoutMs,
            headers: {
              Accept: 'application/json',
            },
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              resolve(null);
              res.resume();
              return;
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                const parsedData = JSON.parse(data) as T;
                resolve(parsedData);
              } catch {
                resolve(null);
              }
            });
          },
        );

        req.on('timeout', () => {
          req.destroy(new Error(`Timeout de ${timeoutMs}ms agotado`));
          resolve(null);
        });

        req.on('error', (err) => {
          this.logger.debug?.(`Error HTTP hacia ${targetUrl}: ${err.message}`);
          resolve(null);
        });

        req.end();
      } catch (err: any) {
        this.logger.debug?.(`Error configurando request hacia ${targetUrl}: ${err.message}`);
        resolve(null);
      }
    });
  }
}
