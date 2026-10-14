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
    const cuerpo: any = await res.json();
    return (cuerpo?.data ?? cuerpo) as DocenteRund;
  }
}
