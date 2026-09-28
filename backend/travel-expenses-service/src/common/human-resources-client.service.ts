import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
   * a través de certification-service. Si la integración está deshabilitada
   * o no disponible, lanza ServiceUnavailableException. Si no se encuentra
   * el funcionario, retorna null.
   */
  async consultarFuncionarioPorDocumento(
    documento: string,
    timeoutMs = 4000,
  ): Promise<HumanResourcesSuggestedPerson | null> {
    const docLimpio = String(documento || '').trim();
    if (!docLimpio) return null;

    const baseUrl = this.getCertificationServiceUrl();
    const endpointUrl = `${baseUrl}/certificates/integracion-fnc/documento/${encodeURIComponent(docLimpio)}?limit=1`;

    this.logger.log(
      `[HumanResourcesClient] Consultando documento ${docLimpio} en ${endpointUrl}`,
    );

    const res = await this.httpGet<HumanResourcesLookupResult>(
      endpointUrl,
      timeoutMs,
    );

    if (res.status && res.status >= 500) {
      const msg =
        res.errorMsg ||
        'El servicio de Talento Humano / Nómina no está disponible temporalmente.';
      this.logger.error(
        `[HumanResourcesClient] Falla en servicio de Talento Humano (HTTP ${res.status}): ${msg}`,
      );
      throw new ServiceUnavailableException(
        `Servicio de Talento Humano no disponible: ${msg}`,
      );
    }

    const responseData = res.data;
    if (!responseData || !responseData.found || !Array.isArray(responseData.rows)) {
      this.logger.warn(
        `[HumanResourcesClient] Sin registros para documento ${docLimpio} (found: ${responseData?.found})`,
      );
      return null;
    }

    const primerRegistro = responseData.rows[0];
    const sugerido = primerRegistro?.suggested_certificate_request;
    if (sugerido && sugerido.id_number) {
      this.logger.log(
        `[HumanResourcesClient] Documento ${docLimpio} encontrado: ${sugerido.full_name}`,
      );
      return sugerido;
    }

    this.logger.warn(
      `[HumanResourcesClient] Sin id_number válido para documento ${docLimpio}`,
    );
    return null;
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

    this.logger.log(
      `[HumanResourcesClient] Buscando término "${termLimpio}" en ${endpointUrl}`,
    );

    const res = await this.httpGet<{
      ok?: boolean;
      total?: number;
      rows?: HumanResourcesSuggestedPerson[];
    }>(endpointUrl, timeoutMs);

    if (res.status && res.status >= 500) {
      const msg =
        res.errorMsg ||
        'El servicio de Talento Humano / Nómina no está disponible temporalmente.';
      this.logger.error(
        `[HumanResourcesClient] Falla en servicio de Talento Humano al buscar "${termLimpio}" (HTTP ${res.status}): ${msg}`,
      );
      throw new ServiceUnavailableException(
        `Servicio de Talento Humano no disponible: ${msg}`,
      );
    }

    const responseData = res.data;
    if (responseData && Array.isArray(responseData.rows)) {
      this.logger.log(
        `[HumanResourcesClient] Búsqueda "${termLimpio}" - resultados: ${responseData.rows.length}`,
      );
      return responseData.rows;
    }

    return [];
  }

  private httpGet<T>(
    targetUrl: string,
    timeoutMs: number,
  ): Promise<{ data: T | null; status?: number; errorMsg?: string }> {
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
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 400) {
                this.logger.warn(
                  `[HumanResourcesClient] HTTP ${res.statusCode} para ${targetUrl} - body: ${data?.substring(0, 300)}`,
                );
                let message: string | undefined;
                try {
                  const errorObj = JSON.parse(data);
                  message = errorObj?.message || errorObj?.error;
                } catch {
                  message = data;
                }
                resolve({
                  data: null,
                  status: res.statusCode,
                  errorMsg: message,
                });
                return;
              }

              try {
                const parsedData = JSON.parse(data) as T;
                this.logger.log(
                  `[HumanResourcesClient] HTTP ${res.statusCode} - body: ${JSON.stringify(parsedData)?.substring(0, 500)}`,
                );
                resolve({ data: parsedData, status: res.statusCode });
              } catch {
                this.logger.warn(
                  `[HumanResourcesClient] HTTP ${res.statusCode} - body no JSON: ${data?.substring(0, 200)}`,
                );
                resolve({
                  data: null,
                  status: res.statusCode,
                  errorMsg: 'Respuesta no válida del servicio de talento humano',
                });
              }
            });
          },
        );

        req.on('timeout', () => {
          req.destroy(new Error(`Timeout de ${timeoutMs}ms agotado`));
          resolve({
            data: null,
            status: 504,
            errorMsg: `Timeout de ${timeoutMs}ms agotado al consultar servicio de talento humano`,
          });
        });

        req.on('error', (err) => {
          this.logger.warn(`Error HTTP hacia ${targetUrl}: ${err.message}`);
          resolve({
            data: null,
            status: 503,
            errorMsg: `No fue posible conectar con el servicio de talento humano (${err.message})`,
          });
        });

        req.end();
      } catch (err: any) {
        this.logger.warn(`Error configurando request hacia ${targetUrl}: ${err.message}`);
        resolve({
          data: null,
          status: 500,
          errorMsg: err.message,
        });
      }
    });
  }
}
