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

const registro = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const texto = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const persona = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const nullableTexto = (value: unknown) => value === null || typeof value === 'string';
const horas = (value: unknown) => value === null ||
  ((typeof value === 'number' || texto(value)) && Number.isFinite(Number(value)) && Number(value) >= 0);
const fecha = (value: unknown) => {
  if (value === null) return true;
  if (!texto(value) || !/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  return Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
};

function esPerfil(value: unknown, documento: string): value is DocenteRundCrudo {
  return registro(value) && texto(value.idDocente) && persona(value.idPersona)
    && value.documento === documento && texto(value.nombreCompleto)
    && ['correoInstitucional', 'territorialCodigo', 'territorialNombre', 'tipoVinculacion', 'dedicacion',
      'escalafon', 'regimenNormativo', 'situacionAdministrativa', 'situacionCategoria', 'estado',
      'nivelFormacion', 'nucleoTematico'].every(key => nullableTexto(value[key]))
    && horas(value.horasAsignables) && (value.dedicacionHorasSemana === null ||
      (typeof value.dedicacionHorasSemana === 'number' && Number.isFinite(value.dedicacionHorasSemana) && value.dedicacionHorasSemana >= 0))
    && fecha(value.fechaInicioVinculacion) && fecha(value.fechaFinVinculacion);
}

function esFila(value: unknown): value is Record<string, any> {
  return registro(value) && texto(value.id) && persona(value.personaId) && nullableTexto(value.periodoCarga);
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
  private async obtener<T>(ruta: string, validar: (value: unknown) => value is T,
    opciones: { tolerar404?: boolean; mensaje404?: string } = {}): Promise<T | null> {
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
    try {
      const cuerpo: unknown = await res.json();
      if (!registro(cuerpo) || ('success' in cuerpo && cuerpo.success !== true)) throw new Error();
      const data = 'data' in cuerpo ? cuerpo.data : cuerpo;
      if (!validar(data)) throw new Error();
      return data;
    } catch {
      throw new ServiceUnavailableException('El RUND no confirmó una respuesta válida para la consulta.');
    }
  }

  async porDocumento(documento: string): Promise<DocenteRundCrudo> {
    const limpio = String(documento ?? '').trim();
    // Un documento inexistente es un caso normal (el programador se equivoca al teclear): 404, nunca 500.
    return (await this.obtener<DocenteRundCrudo>(`docentes/por-documento/${encodeURIComponent(limpio)}`,
      (value): value is DocenteRundCrudo => esPerfil(value, limpio), {
      mensaje404: `No existe un docente con documento ${limpio} en el RUND.`,
    })) as DocenteRundCrudo;
  }

  /** Página de docentes completos (todas las columnas) para mantener la copia local. */
  async paginaParaSincronizar(cursor: string | null, limite = 200): Promise<{ items: Record<string, any>[]; nextCursor: string | null }> {
    const q = `limite=${limite}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const tope = Math.min(Math.max(Number(limite) || 200, 1), 500);
    type Pagina = { items: Record<string, any>[]; nextCursor: string | null };
    return (await this.obtener<Pagina>(`docentes/sincronizacion?${q}`, (value): value is Pagina =>
      registro(value) && Array.isArray(value.items) && value.items.length <= tope
      && value.items.every(esFila) && new Set(value.items.map(row => row.id)).size === value.items.length
      && !value.items.some(row => row.id === cursor)
      && (value.nextCursor === null || (texto(value.nextCursor) && value.nextCursor !== cursor
        && value.items.length > 0 && value.nextCursor === value.items[value.items.length - 1].id)))) as Pagina;
  }

  /** Docente completo por id propio o id de persona; `null` si RUND no lo tiene. */
  resolver(clave: string, periodo?: string | null): Promise<Record<string, any> | null> {
    const key = String(clave ?? '').trim();
    const q = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    return this.obtener(`docentes/resolver/${encodeURIComponent(key)}${q}`,
      (value): value is Record<string, any> => esFila(value) && (value.id === key || value.personaId === key)
        && (!periodo || value.periodoCarga === periodo), { tolerar404: true });
  }

  /** Validación documental por campo, tal como la lleva RUND. */
  async validacion(docenteId: string): Promise<any> {
    return this.obtener(`docentes/${encodeURIComponent(String(docenteId))}/validacion`, (value): value is Record<string, any> =>
      registro(value) && texto(value.docenteId) && persona(value.personaId)
      && Number.isInteger(value.completitud) && value.completitud >= 0 && value.completitud <= 100
      && Array.isArray(value.validaciones) && value.validaciones.length > 0
      && value.validaciones.every(row => registro(row) && texto(row.campo_rund) && texto(row.estado_documento))
      && new Set(value.validaciones.map(row => row.campo_rund)).size === value.validaciones.length, {
      mensaje404: `Docente ${docenteId} no encontrado`,
    });
  }
}
