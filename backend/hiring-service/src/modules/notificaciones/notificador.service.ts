import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AvisosService } from './avisos.service';
import { Campana } from './campana';
import {
  AvisoConfigurado,
  destinatariosFinales,
  EventoOcurrido,
  mensajeDeAviso,
  PapelAviso,
} from './eventos';

/** Si el motor está encendido. Se apaga con `NOTIFICACIONES_CONFIGURABLES=false`. */
export const motorDeAvisosEncendido = () =>
  (process.env.NOTIFICACIONES_CONFIGURABLES ?? 'true').toLowerCase() !== 'false';

/**
 * Convierte lo que pasó en un proceso en avisos, según lo que configuró la
 * Dirección (EFDS-1183).
 *
 * Corre después de que el cambio quedó confirmado, así que nada de lo que haga
 * puede deshacer el trabajo del usuario: cada error se registra y se sigue. Lo
 * peor que pasa si falla es que alguien no se entera, que es exactamente lo que
 * pasaba antes de que existiera.
 */
@Injectable()
export class NotificadorService {
  private readonly logger = new Logger(NotificadorService.name);
  private readonly campana: Campana;
  private readonly avisos: AvisosService;

  constructor(
    private readonly dataSource: DataSource,
    @Optional() avisos?: AvisosService,
  ) {
    this.campana = new Campana(dataSource, this.logger);
    this.avisos = avisos ?? new AvisosService(dataSource);
  }

  async despachar(ocurridos: EventoOcurrido[]): Promise<number> {
    if (!motorDeAvisosEncendido() || !ocurridos.length) return 0;

    // Un mismo hecho puede quedar dos veces en la trazabilidad —el servicio del
    // panel y la aprobación genérica—; se avisa una sola.
    const unicos = new Map<string, EventoOcurrido>();
    for (const o of ocurridos) unicos.set(`${o.procesoId}|${o.numeral}|${o.evento}`, o);

    let enviados = 0;
    for (const ocurrido of unicos.values()) {
      try {
        // Lo que la Dirección configuró en esa actividad o, si nadie lo tocó, lo sugerido.
        const aviso = await this.avisos.queRige(ocurrido.numeral, ocurrido.evento);
        if (!aviso.activo) continue;
        enviados += await this.avisar(ocurrido, aviso);
      } catch (error: any) {
        this.logger.warn(
          `No se pudo avisar ${ocurrido.evento} en ${ocurrido.numeral}: ${error.message}`,
        );
      }
    }
    return enviados;
  }

  private async avisar(ocurrido: EventoOcurrido, aviso: AvisoConfigurado): Promise<number> {
    const [proceso] = await this.dataSource.query(
      `SELECT modalidad, radicado FROM hiring.procesos WHERE id = $1`,
      [ocurrido.procesoId],
    );
    if (!proceso) return 0;

    const candidatos: string[] = [];
    for (const papel of aviso.papeles) {
      candidatos.push(...(await this.quienCumple(papel, ocurrido, proceso.modalidad ?? null)));
    }
    if (aviso.roles.length) candidatos.push(...(await this.cuentasConRol(aviso.roles)));

    // Las personas designadas llegan como id de persona; la campana necesita la cuenta.
    const cuentas = await this.campana.cuentasDe(candidatos);
    const destinatarios = destinatariosFinales(cuentas, ocurrido.actorId);
    if (!destinatarios.length) return 0;

    const [actividad] = await this.dataSource.query(
      `SELECT nombre FROM hiring.actividades WHERE numeral = $1`,
      [ocurrido.numeral],
    );
    const { titulo, mensaje, prioridad } = mensajeDeAviso(
      ocurrido,
      actividad?.nombre ?? null,
      proceso.radicado ?? null,
    );

    const resultado = await this.campana.enviar(
      destinatarios.map((id) => ({
        id_usuario_destinatario: id,
        tipo_notificacion: `contratacion_${ocurrido.evento.toLowerCase()}`,
        titulo,
        mensaje,
        prioridad,
        // Para que la campana pueda llevar al proceso cuando lo soporte.
        datos_adicionales: {
          modulo: 'contratacion',
          procesoId: ocurrido.procesoId,
          numeral: ocurrido.numeral,
          evento: ocurrido.evento,
        },
      })),
    );
    return resultado.enviados;
  }

  private async cuentasConRol(roles: string[]): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT DISTINCT ur.id_user::text AS id
         FROM auth.user_roles ur
         JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = ANY($1::text[])`,
      [roles],
    );
    return filas.map((f: any) => f.id);
  }

  private async quienCumple(
    papel: PapelAviso,
    ocurrido: EventoOcurrido,
    modalidad: string | null,
  ): Promise<string[]> {
    switch (papel) {
      case 'ABOGADO':
      case 'CONTRATACION': {
        const filas = await this.dataSource.query(
          `SELECT usuario_id::text AS id
             FROM hiring.participaciones_proceso
            WHERE proceso_id = $1 AND papel = $2 AND estado = 'VIGENTE' AND usuario_id IS NOT NULL`,
          [ocurrido.procesoId, papel],
        );
        return filas.map((f: any) => f.id);
      }
      case 'RADICADOR': {
        const filas = await this.dataSource.query(
          `SELECT u.id_user::text AS id
             FROM hiring.procesos p
             JOIN auth."user" u ON u.username = p.created_by
            WHERE p.id = $1`,
          [ocurrido.procesoId],
        );
        return filas.map((f: any) => f.id);
      }
      case 'QUIEN_ENVIO': {
        const filas = await this.dataSource.query(
          /*
           * Las actividades enviadas antes de que se guardara la cuenta solo
           * dejaron el nombre de usuario: se traduce, o a quien las envió no le
           * llegaría nunca el aviso de que se las devolvieron.
           */
          `SELECT COALESCE(pa.enviado_por_id, u.id_user::text) AS id
             FROM hiring.proceso_actividades pa
             LEFT JOIN auth."user" u ON u.username = pa.enviado_por
            WHERE pa.proceso_id = $1
              AND pa.numeral = $2
              AND COALESCE(pa.enviado_por_id, u.id_user::text) IS NOT NULL`,
          [ocurrido.procesoId, ocurrido.numeral],
        );
        return filas.map((f: any) => f.id);
      }
      case 'QUIEN_APRUEBA': {
        /*
         * Los que la pestaña de Aprobación designó para esta actividad. La regla
         * de la modalidad manda sobre la general, igual que al aprobar: avisar a
         * alguien distinto de quien puede decidir sería mandarlo a un botón que
         * no le va a funcionar.
         */
        const reglas: { modalidad: string | null; config: any }[] = await this.dataSource.query(
          `SELECT modalidad, config
             FROM hiring.reglas_actividad
            WHERE tipo = 'EXIGE_APROBACION'
              AND vigente_hasta IS NULL
              AND numeral = $1
              AND (modalidad IS NULL OR modalidad = $2)`,
          [ocurrido.numeral, modalidad],
        );
        const regla = reglas.find((r) => r.modalidad) ?? reglas[0];
        if (!regla) return [];

        const roles: string[] = Array.isArray(regla.config?.roles) ? regla.config.roles : [];
        const personas: string[] = Array.isArray(regla.config?.personas) ? regla.config.personas : [];
        return [...(roles.length ? await this.cuentasConRol(roles) : []), ...personas];
      }
    }
  }
}
