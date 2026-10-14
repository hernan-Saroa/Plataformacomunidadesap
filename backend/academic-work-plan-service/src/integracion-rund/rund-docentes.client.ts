import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

/** Perfil del docente como lo publica rund-service (dueño del dato): datos crudos. */
export interface DocenteRundCrudo {
  idDocente: string;
  idPersona: string;
  documento: string;
  nombreCompleto: string;
  correoInstitucional: string | null;
  territorialCodigo: string | null;
  territorialNombre: string | null;
  tipoVinculacion: string | null;
  dedicacion: string | null;
  dedicacionHorasSemana: number | null;
  escalafon: string | null;
  regimenNormativo: string | null;
  horasAsignables: number | string | null;
  fechaInicioVinculacion: string | Date | null;
  fechaFinVinculacion: string | Date | null;
  situacionAdministrativa: string | null;
  situacionCategoria: string | null;
  estado: string | null;
  nivelFormacion: string | null;
  nucleoTematico: string | null;
}

/**
 * Cliente de la API interna de rund-service. El RUND ya no vive en este servicio:
 * se consulta por HTTP con el token de servicio. Falla cerrado ante cualquier
 * respuesta distinta de 200/404.
 */
@Injectable()
export class RundDocentesClient {
  private get base(): string {
    return (process.env.RUND_SERVICE_URL || 'http://rund-service:3016').replace(/\/+$/, '');
  }

  private get token(): string {
    const token = process.env.INTERNAL_SERVICE_TOKEN || (process.env.NODE_ENV === 'production' ? '' : 'esap-internal-service-dev-token');
    if (!token) throw new ServiceUnavailableException('Falta INTERNAL_SERVICE_TOKEN para consultar el RUND.');
    return token;
  }

  /** GET a la API interna. 404 -> `null` si `tolerar404`; si no, NotFound. Cualquier otro fallo: ServiceUnavailable. */
  private async obtener<T>(ruta: string, opciones: { tolerar404?: boolean; mensaje404?: string } = {}): Promise<T | null> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/internal/rund/v1/${ruta}`, {
        headers: { 'x-internal-service-token': this.token },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('No se pudo consultar el RUND: el servicio no responde.');
    }
    if (res.status === 404) {
      if (opciones.tolerar404) return null;
      throw new NotFoundException(opciones.mensaje404 ?? 'No existe el recurso solicitado en el RUND.');
    }
    if (!res.ok) throw new ServiceUnavailableException(`No se pudo consultar el RUND (respondió ${res.status}).`);
    const cuerpo: any = await res.json();
    return (cuerpo?.data ?? cuerpo) as T;
  }

  async porDocumento(documento: string): Promise<DocenteRundCrudo> {
    const limpio = String(documento ?? '').trim();
    // Un documento inexistente es un caso normal (el programador se equivoca al teclear): 404, nunca 500.
    return (await this.obtener<DocenteRundCrudo>(`docentes/por-documento/${encodeURIComponent(limpio)}`, {
      mensaje404: `No existe un docente con documento ${limpio} en el RUND.`,
    })) as DocenteRundCrudo;
  }

  /** Página de docentes completos (todas las columnas) para mantener la copia local. */
  async paginaParaSincronizar(cursor: string | null, limite = 200): Promise<{ items: Record<string, any>[]; nextCursor: string | null }> {
    const q = `limite=${limite}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    return (await this.obtener(`docentes/sincronizacion?${q}`)) as { items: Record<string, any>[]; nextCursor: string | null };
  }

  /** Docente completo por id propio o id de persona; `null` si RUND no lo tiene. */
  resolver(clave: string, periodo?: string | null): Promise<Record<string, any> | null> {
    const q = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    return this.obtener(`docentes/resolver/${encodeURIComponent(String(clave))}${q}`, { tolerar404: true });
  }

  /** Validación documental por campo, tal como la lleva RUND. */
  async validacion(docenteId: string): Promise<any> {
    return this.obtener(`docentes/${encodeURIComponent(String(docenteId))}/validacion`, {
      mensaje404: `Docente ${docenteId} no encontrado`,
    });
  }
}
