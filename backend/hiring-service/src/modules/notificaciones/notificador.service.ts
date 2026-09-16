import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PERMISO_PRESUPUESTO_GESTIONAR, PERMISO_PROCESO_TOMAR } from '../../auth/permisos';
import { AvisosService } from './avisos.service';
import { PasoDelFlujo, porEmpezar, SIN_PANEL } from './secuencia';
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
export class NotificadorService implements OnApplicationBootstrap {
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
    // Las personas nombradas llegan como id de persona: `cuentasDe` las traduce.
    candidatos.push(...aviso.personas);
    if (aviso.dependencias.length) candidatos.push(...(await this.personasDeDependencias(aviso.dependencias)));

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

  /**
   * Avisa «te toca» de las actividades que se acaban de habilitar (EFDS-1183).
   *
   * No hay un momento en el código donde una actividad «se habilita»: se
   * habilita porque otra se cerró, y se cierran por decenas de caminos —la
   * aprobación, el registro, cada panel con el suyo—. Por eso no se escucha un
   * evento, se mira el resultado: tras cada cambio confirmado en un proceso se
   * calcula qué se puede empezar, con la misma regla del riel, y se avisa lo
   * que no se había avisado antes.
   *
   * Lo avisado se anota aunque el aviso esté apagado, para que encenderlo
   * después no suelte de golpe todo lo que se habilitó mientras tanto.
   */
  async revisarHabilitadas(procesoId: string, actorId: string | null, actorNombre: string | null) {
    if (!motorDeAvisosEncendido()) return 0;

    const nuevas = await this.anotarHabilitadas(procesoId);
    return this.despachar(
      nuevas.map((numeral) => ({
        evento: 'HABILITADA' as const,
        numeral,
        procesoId,
        actorId,
        actorNombre,
        observaciones: null,
      })),
    );
  }

  /**
   * Al arrancar por primera vez, lo que ya estaba habilitado se da por avisado.
   *
   * El aviso de «te toca» viene encendido. Sin esto, la primera vez que alguien
   * tocara cada proceso existente saldría un «te toca» por una actividad que se
   * habilitó hace semanas, y el día del despliegue la campana de todos se
   * llenaría de avisos que ya no dicen nada. Solo corre con la tabla vacía: en
   * cuanto hay algo anotado, cada habilitación nueva se avisa en su momento.
   *
   * Fuera del arranque y sin bloquearlo: si falla, el servicio sigue.
   */
  onApplicationBootstrap() {
    setImmediate(() => {
      this.lineaBase()
        .then((n) => n && this.logger.log(`Línea base de «te toca»: ${n} actividades ya habilitadas`))
        .catch((error: any) => this.logger.warn(`No se pudo anotar la línea base de «te toca»: ${error.message}`));
    });
  }

  async lineaBase(): Promise<number> {
    if (!motorDeAvisosEncendido()) return 0;
    const [{ hay }] = await this.dataSource.query(
      `SELECT EXISTS (SELECT 1 FROM hiring.avisos_habilitacion) AS hay`,
    );
    if (hay) return 0;

    const procesos: { id: string }[] = await this.dataSource.query(`SELECT id FROM hiring.procesos`);
    let anotadas = 0;
    for (const { id } of procesos) anotadas += (await this.anotarHabilitadas(id)).length;
    return anotadas;
  }

  /** Anota las actividades que se pueden empezar y devuelve las que no estaban anotadas. */
  private async anotarHabilitadas(procesoId: string): Promise<string[]> {
    const pasos: PasoDelFlujo[] = (
      await this.dataSource.query(
        `SELECT a.numeral,
                pa.estado,
                NOT EXISTS (
                  SELECT 1 FROM hiring.actividades_excluidas x
                   WHERE x.numeral = a.numeral AND x.modalidad = p.modalidad
                ) AND COALESCE(pa.estado, '') <> 'NO_APLICA' AS aplica
           FROM hiring.procesos p
           JOIN hiring.actividades a ON a.activa
           LEFT JOIN hiring.proceso_actividades pa
                  ON pa.proceso_id = p.id AND pa.numeral = a.numeral
          WHERE p.id = $1
          ORDER BY a.etapa, a.orden`,
        [procesoId],
      )
    ).map((f: any) => ({
      numeral: f.numeral,
      estado: f.estado ?? null,
      aplica: f.aplica === true,
      construida: !SIN_PANEL.has(f.numeral),
    }));
    if (!pasos.length) return [];

    const candidatas = porEmpezar(pasos);
    if (!candidatas.length) return [];

    // Se reclaman en la misma sentencia que se anotan: si dos cambios del mismo
    // proceso llegan juntos, solo uno se queda con cada actividad.
    const nuevas: { numeral: string }[] = await this.dataSource.query(
      `INSERT INTO hiring.avisos_habilitacion (proceso_id, numeral)
       SELECT $1, n FROM unnest($2::text[]) AS n
       ON CONFLICT (proceso_id, numeral) DO NOTHING
       RETURNING numeral`,
      [procesoId, candidatas],
    );
    return nuevas.map((n) => n.numeral);
  }

  /**
   * Las cuentas activas que tienen un permiso.
   *
   * Para lo que todavía no es de nadie —la bandeja de Contratación, la solicitud
   * de CDP—: se avisa a quien puede tomarlo, igual que la bandeja decide quién
   * lo ve.
   */
  private async cuentasConPermiso(permiso: string): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT DISTINCT u.id_user::text AS id
         FROM auth."user" u
         JOIN auth.user_roles ur       ON ur.id_user = u.id_user AND ur.is_active = true
         JOIN auth.role r              ON r.id = ur.id_rol AND r.is_active = true
         JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active = true
         JOIN auth.permission perm     ON perm.id_permission = rp.id_permission AND perm.is_active = true
        WHERE u.is_active = true AND perm.code = $1`,
      [permiso],
    );
    return filas.map((f: any) => f.id);
  }

  /**
   * Las personas de cada dependencia, según `auth.personas`.
   *
   * Es la dependencia que Gestión de Personas le asigna a cada una: si alguien
   * cambia de área allá, los avisos le siguen sin tocar la configuración.
   */
  private async personasDeDependencias(dependencias: string[]): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT id_person::text AS id
         FROM auth.personas
        WHERE id_dependencia::text = ANY($1::text[])`,
      [dependencias],
    );
    return filas.map((f: any) => f.id);
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
      case 'BANDEJA_CONTRATACION':
        return this.cuentasConPermiso(PERMISO_PROCESO_TOMAR);
      case 'EQUIPO_FINANCIERO':
        return this.cuentasConPermiso(PERMISO_PRESUPUESTO_GESTIONAR);
      case 'COMITE_EVALUADOR': {
        // Personas del comité vigente: la campana las traduce a sus cuentas.
        const filas = await this.dataSource.query(
          `SELECT m.persona_id::text AS id
             FROM hiring.comites_evaluadores c
             JOIN hiring.miembros_comite m ON m.comite_id = c.id
            WHERE c.proceso_id = $1 AND c.estado = 'VIGENTE' AND m.persona_id IS NOT NULL`,
          [ocurrido.procesoId],
        );
        return filas.map((f: any) => f.id);
      }
      case 'SUPERVISOR': {
        const filas = await this.dataSource.query(
          `SELECT s.persona_id::text AS id
             FROM hiring.supervisiones_contrato s
             JOIN hiring.contratos k ON k.id = s.contrato_id
            WHERE k.proceso_id = $1 AND s.estado = 'VIGENTE' AND s.persona_id IS NOT NULL`,
          [ocurrido.procesoId],
        );
        return filas.map((f: any) => f.id);
      }
    }
  }
}
