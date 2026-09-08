import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';

/** Cuántos días antes se avisa, si nadie lo dice. */
export const ANTICIPACION_POR_DEFECTO = 30;

/**
 * Plazo legal para liquidar de común acuerdo: cuatro meses desde que el
 * contrato terminó (Ley 1150 de 2007, art. 11).
 */
export const MESES_LIQUIDACION_BILATERAL = 4;

export type EstadoAlerta = 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';

export type TipoAlerta =
  | 'AMPARO'
  | 'CDP'
  | 'REGISTRO_PRESUPUESTAL'
  | 'LIQUIDACION'
  /**
   * Una actividad esperando que la apruebe quien está leyendo (EFDS-1183).
   *
   * Va en la misma lista que los vencimientos y no en una pantalla aparte: son
   * las dos cosas que le reclaman atención al usuario, y separarlas lo
   * obligaría a mirar en dos sitios para saber qué le espera.
   */
  | 'APROBACION_PENDIENTE';

/**
 * Días que faltan para la fecha. Negativo si ya pasó.
 *
 * Se calcula sobre fechas sin hora: un amparo que vence hoy vence hoy entero,
 * y restar milisegundos haría que a las 15:00 dijera que faltan 0,3 días.
 */
export function diasParaVencer(fecha: string, hoy: string): number {
  const unDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(fecha) - Date.parse(hoy)) / unDia);
}

/** En qué punto está la alerta según los días que falten. */
export function estadoAlerta(dias: number, anticipacion: number): EstadoAlerta {
  if (dias < 0) return 'VENCIDO';
  if (dias <= anticipacion) return 'POR_VENCER';
  return 'VIGENTE';
}

/**
 * Hasta cuándo se puede liquidar de común acuerdo.
 *
 * Se cuenta en meses y no en días para que caiga en el mismo día del mes, que
 * es como está redactado el plazo legal.
 */
export function limiteLiquidacion(fechaTerminacion: string): string {
  const fecha = new Date(`${fechaTerminacion}T00:00:00Z`);
  const dia = fecha.getUTCDate();

  fecha.setUTCDate(1);
  fecha.setUTCMonth(fecha.getUTCMonth() + MESES_LIQUIDACION_BILATERAL);

  // El día se fija después de mover el mes y sin pasarse del último: sumarle
  // cuatro meses al 31 de octubre daría «31 de febrero», que JavaScript
  // desborda a marzo y correría el plazo tres días a favor de la entidad.
  const ultimoDelMes = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0),
  ).getUTCDate();
  fecha.setUTCDate(Math.min(dia, ultimoDelMes));

  return fecha.toISOString().slice(0, 10);
}

/**
 * El CDP y el RP se imputan a una vigencia fiscal, no a una fecha: valen hasta
 * el 31 de diciembre de ese año.
 */
export function finDeVigenciaFiscal(anio: number): string {
  return `${anio}-12-31`;
}

export interface Alerta {
  tipo: TipoAlerta;
  procesoId: string;
  radicado: string | null;
  contrato: string | null;
  descripcion: string;
  vence: string;
  diasRestantes: number;
  estado: EstadoAlerta;
  responsable: string | null;
  responsableEmail: string | null;
  /** `id_person` del supervisor vigente; a él va la notificación. */
  responsableId: string | null;
}

/**
 * Alertas de vencimiento (EFDS-1185, RF-SIS-03).
 *
 * No hay tabla de alertas: se calculan al consultar. Guardarlas duplicaría la
 * fecha que ya vive en el amparo o el CDP, y una copia se desincroniza en
 * cuanto alguien renueva la póliza.
 */
@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(private readonly dataSource: DataSource) {}

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /**
   * Todo lo que vence dentro de la anticipación pedida, y lo ya vencido.
   *
   * Una sola consulta por tipo y no una por proceso: quien vigila los
   * vencimientos los mira todos juntos, no proceso por proceso.
   */
  async listar(anticipacion: number, acceso: HiringAccess): Promise<Alerta[]> {
    const hoy = this.hoy();

    const [amparos, presupuestales, liquidaciones, aprobaciones] = await Promise.all([
      this.amparosPorVencer(),
      this.respaldosPorVencer(),
      this.liquidacionesPendientes(),
      this.aprobacionesPendientes(acceso),
    ]);

    const vencimientos = [...amparos, ...presupuestales, ...liquidaciones]
      .map((fila) => {
        // pg devuelve las columnas `date` como Date; aquí todo es AAAA-MM-DD.
        const vence =
          typeof fila.vence === 'string'
            ? fila.vence.slice(0, 10)
            : new Date(fila.vence).toISOString().slice(0, 10);
        const diasRestantes = diasParaVencer(vence, hoy);
        return { ...fila, vence, diasRestantes, estado: estadoAlerta(diasRestantes, anticipacion) };
      })
      .filter((a) => a.estado !== 'VIGENTE');

    return [...aprobaciones, ...vencimientos]
      // Lo más urgente primero: lo vencido arriba, y dentro de eso lo que lleva
      // más tiempo vencido. Las aprobaciones usan el mismo número en negativo
      // —los días que llevan esperando—, así que una que lleva una semana sin
      // resolverse sube por encima de una póliza que vence dentro de un mes.
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  /**
   * Actividades esperando la aprobación de quien consulta (EFDS-1183).
   *
   * Solo las suyas: se cruzan las reglas `EXIGE_APROBACION` vigentes con los
   * roles del usuario y con su id, que es como la configuración declara a los
   * aprobadores. Ver las de los demás no le sirve de nada y le escondería las
   * propias.
   *
   * Quien envió la actividad no la ve aquí aunque tenga el rol: no puede
   * aprobar lo que él mismo trabajó, así que ofrecérsela sería ofrecerle un
   * botón que va a rechazarle el servicio.
   */
  private async aprobacionesPendientes(
    acceso: HiringAccess,
  ): Promise<Omit<Alerta, never>[]> {
    const roles = acceso.roles ?? [];
    const esSuperAdmin = roles.includes('SUPER_ADMIN');

    const filas = await this.dataSource.query(
      `
      SELECT p.id                AS proceso_id,
             p.radicado          AS radicado,
             pa.numeral          AS numeral,
             a.nombre            AS actividad,
             pa.enviado_por      AS enviado_por,
             pa.updated_at       AS desde
        FROM hiring.proceso_actividades pa
        JOIN hiring.procesos p ON p.id = pa.proceso_id
        JOIN hiring.actividades a ON a.numeral = pa.numeral
        JOIN hiring.reglas_actividad r
              ON r.numeral = pa.numeral
             AND r.tipo = 'EXIGE_APROBACION'
             AND r.vigente_hasta IS NULL
             AND (r.modalidad IS NULL OR r.modalidad = p.modalidad)
       WHERE pa.estado = 'EN_REVISION'
         -- Quien la envió no la aprueba, así que no se le ofrece.
         AND ($3 = true OR pa.enviado_por_id IS DISTINCT FROM $2)
         AND (
           $3 = true
           OR (r.config -> 'personas') ? $2
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(COALESCE(r.config -> 'roles', '[]'::jsonb)) rol
              WHERE rol = ANY($1::text[])
           )
         )
       ORDER BY pa.updated_at ASC
      `,
      [roles, acceso.userId ?? '', esSuperAdmin],
    );

    return filas.map((f: any) => {
      const desde = f.desde instanceof Date ? f.desde : new Date(f.desde);
      const diasEsperando = Math.floor((Date.now() - desde.getTime()) / (24 * 60 * 60 * 1000));

      return {
        tipo: 'APROBACION_PENDIENTE' as TipoAlerta,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: null,
        descripcion: `${f.numeral} · ${f.actividad}`,
        vence: desde.toISOString().slice(0, 10),
        // En negativo, como lo vencido: es lo que la ordena arriba y crece con
        // los días que lleva esperando.
        diasRestantes: -diasEsperando,
        estado: 'POR_VENCER' as EstadoAlerta,
        responsable: f.enviado_por ?? null,
        responsableEmail: null,
        responsableId: null,
      };
    });
  }

  /**
   * Criterio 1: pólizas con fecha de vencimiento.
   *
   * Se consultan los amparos y no las garantías porque el desglose de la 8.4
   * existe justo para esto: no todos vencen a la vez.
   */
  private async amparosPorVencer(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const filas = await this.dataSource.query(`
      SELECT p.id            AS proceso_id,
             p.radicado      AS radicado,
             c.numero        AS contrato,
             a.tipo          AS tipo_amparo,
             a.vigencia_hasta AS vence,
             s.persona_id    AS responsable_id,
             s.nombre        AS responsable,
             s.email         AS responsable_email
        FROM hiring.amparos a
        JOIN hiring.garantias g ON g.id = a.garantia_id
        JOIN hiring.contratos c ON c.id = g.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
        LEFT JOIN hiring.supervisiones_contrato s
               ON s.contrato_id = c.id AND s.estado = 'VIGENTE'
       WHERE g.estado = 'APROBADA'
         AND c.estado NOT IN ('RECHAZADO', 'LIQUIDADO', 'CERRADO')
    `);

    return filas.map((f: any) => ({
      tipo: 'AMPARO' as const,
      procesoId: f.proceso_id,
      radicado: f.radicado,
      contrato: f.contrato,
      descripcion: `Amparo de ${f.tipo_amparo}`,
      vence: f.vence,
      responsable: f.responsable,
      responsableEmail: f.responsable_email,
      responsableId: f.responsable_id ?? null,
    }));
  }

  /** Criterio 1: CDP y RP, que valen hasta el cierre de su vigencia fiscal. */
  private async respaldosPorVencer(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const cdps = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, cdp.numero, cdp.vigencia_fiscal
        FROM hiring.cdp cdp
        JOIN hiring.procesos p ON p.id = cdp.proceso_id
       WHERE cdp.estado = 'EXPEDIDO' AND cdp.vigencia_fiscal IS NOT NULL
    `);

    const rps = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, rp.numero, rp.vigencia_fiscal,
             c.numero AS contrato
        FROM hiring.registros_presupuestales rp
        JOIN hiring.contratos c ON c.id = rp.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE rp.estado = 'EXPEDIDO' AND rp.vigencia_fiscal IS NOT NULL
         AND c.estado NOT IN ('RECHAZADO', 'LIQUIDADO', 'CERRADO')
    `);

    return [
      ...cdps.map((f: any) => ({
        tipo: 'CDP' as const,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: null,
        descripcion: `CDP ${f.numero ?? ''} de la vigencia ${f.vigencia_fiscal}`.trim(),
        vence: finDeVigenciaFiscal(f.vigencia_fiscal),
        responsable: null,
        responsableEmail: null,
        responsableId: null,
      })),
      ...rps.map((f: any) => ({
        tipo: 'REGISTRO_PRESUPUESTAL' as const,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: f.contrato,
        descripcion: `RP ${f.numero ?? ''} de la vigencia ${f.vigencia_fiscal}`.trim(),
        vence: finDeVigenciaFiscal(f.vigencia_fiscal),
        responsable: null,
        responsableEmail: null,
        responsableId: null,
      })),
    ];
  }

  /**
   * Criterio 2: contratos terminados acercándose al plazo de liquidación.
   *
   * La fecha de terminación sale de la modificación que lo terminó; si no la
   * hay —el contrato terminó por vencimiento del plazo— se toma la última
   * actualización del contrato, que es cuando cambió de estado.
   */
  private async liquidacionesPendientes(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const filas = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, c.numero AS contrato,
             COALESCE(m.fecha_efecto, c.updated_at::date) AS termino,
             s.persona_id AS responsable_id, s.nombre AS responsable, s.email AS responsable_email
        FROM hiring.contratos c
        JOIN hiring.procesos p ON p.id = c.proceso_id
        LEFT JOIN hiring.modificaciones_contrato m
               ON m.contrato_id = c.id
              AND m.tipo = 'TERMINACION_ANTICIPADA'
              AND m.estado = 'APROBADA'
        LEFT JOIN hiring.supervisiones_contrato s
               ON s.contrato_id = c.id AND s.estado = 'VIGENTE'
       WHERE c.estado = 'TERMINADO'
    `);

    return filas.map((f: any) => ({
      tipo: 'LIQUIDACION' as const,
      procesoId: f.proceso_id,
      radicado: f.radicado,
      contrato: f.contrato,
      descripcion: 'Plazo para liquidar de común acuerdo',
      vence: limiteLiquidacion(
        typeof f.termino === 'string' ? f.termino : f.termino.toISOString().slice(0, 10),
      ),
      responsable: f.responsable,
      responsableEmail: f.responsable_email,
      responsableId: f.responsable_id ?? null,
    }));
  }

  /**
   * Avisa al responsable de cada alerta.
   *
   * Se delega en notifications-service, que es de otro equipo y ya lo consume
   * certification-service igual. Best-effort a propósito: si está caído, las
   * alertas se siguen viendo en pantalla y no se pierde el aviso, solo el
   * correo.
   */
  async notificar(anticipacion: number, acceso: HiringAccess) {
    const alertas = await this.listar(anticipacion, acceso);
    // Con id de persona: es lo que notifications-service usa como destinatario.
    const conDestinatario = alertas.filter((a) => a.responsableId);

    if (!conDestinatario.length) {
      return { alertas: alertas.length, notificadas: 0, sinDestinatario: alertas.length };
    }

    const url = process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3009';

    try {
      const respuesta = await fetch(`${url}/notifications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifications: conDestinatario.map((a) => ({
            id_usuario_destinatario: a.responsableId,
            tipo_notificacion: 'contratacion_vencimiento',
            titulo: a.estado === 'VENCIDO' ? 'Vencimiento cumplido' : 'Vencimiento próximo',
            mensaje: `${a.descripcion} del contrato ${a.contrato ?? a.radicado}: ${
              a.estado === 'VENCIDO'
                ? `vencido hace ${Math.abs(a.diasRestantes)} días`
                : `vence en ${a.diasRestantes} días`
            } (${a.vence})`,
          })),
        }),
      });

      if (!respuesta.ok) {
        this.logger.warn(`notifications-service respondió ${respuesta.status}`);
        return { alertas: alertas.length, notificadas: 0, error: 'no se pudo notificar' };
      }
    } catch (error: any) {
      this.logger.warn(`No se pudo avisar a notifications-service: ${error.message}`);
      return { alertas: alertas.length, notificadas: 0, error: 'no se pudo notificar' };
    }

    return {
      alertas: alertas.length,
      notificadas: conDestinatario.length,
      sinDestinatario: alertas.length - conDestinatario.length,
    };
  }
}
