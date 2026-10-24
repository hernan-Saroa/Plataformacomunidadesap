import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/**
 * Cliente del contrato PROG↔PTA — EFDS-1373.
 *
 * ⚠️ EL CÁLCULO DE HORAS ES LÓGICA, NO DATO: se consume por el contrato, no se
 * copia. `situacionCategoria` se lee directo de la base compartida porque es un
 * dato; el cálculo pasa por aquí porque es la misma lógica del PTA y debe ser
 * una sola para los dos módulos (así lo aprobó Nicolás).
 *
 * Si el contrato no responde, se FALLA CERRADO: sin poder calcular el impacto no
 * se puede validar el tope, y asignar a ciegas violaría el bloqueo duro.
 */

export interface CalculoHoras {
  horasClase: number;
  horasPtaCarrera: number;
  factorVinculacion: number;
  categoriaVinculacion: string;
  horasImpacto: number;
  tipoExcepcion: string | null;
}

@Injectable()
export class ContratoClient {
  private readonly base =
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003';

  /**
   * Impacto en horas de una asignatura para una vinculación, calculado por el
   * PTA. `token` se reenvía porque el contrato exige autenticación.
   */
  /**
   * Resultados recientes por asignatura y vinculación. Los candidatos (EFDS-2341)
   * evalúan decenas de docentes con las mismas asignaturas: sin esto serían cientos
   * de llamadas iguales. Vida corta: un cambio en el PTA se ve en segundos. Los
   * errores no se guardan (se sigue fallando cerrado).
   */
  private readonly recientes = new Map<string, { valor: CalculoHoras; hasta: number }>();
  private static readonly VIDA_MS = 30_000;

  async calcularImpacto(
    codigoAsignatura: string,
    vinculacion: string | null,
    token: string | null,
  ): Promise<CalculoHoras> {
    const clave = `${codigoAsignatura}|${vinculacion ?? ''}`;
    const guardado = this.recientes.get(clave);
    if (guardado && guardado.hasta > Date.now()) return guardado.valor;
    const valor = await this.pedirImpacto(codigoAsignatura, vinculacion, token);
    this.recientes.set(clave, { valor, hasta: Date.now() + ContratoClient.VIDA_MS });
    return valor;
  }

  private async pedirImpacto(
    codigoAsignatura: string,
    vinculacion: string | null,
    token: string | null,
  ): Promise<CalculoHoras> {
    const q = vinculacion ? `?vinculacion=${encodeURIComponent(vinculacion)}` : '';
    const url = `${this.base}/contrato-programacion/v1/calculo/asignatura/${encodeURIComponent(codigoAsignatura)}${q}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo calcular el impacto en el PTA: el servicio de contrato no responde.',
      );
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `No se pudo calcular el impacto en el PTA (contrato respondió ${res.status}).`,
      );
    }
    const cuerpo: any = await res.json();
    return (cuerpo?.data ?? cuerpo) as CalculoHoras;
  }
}
