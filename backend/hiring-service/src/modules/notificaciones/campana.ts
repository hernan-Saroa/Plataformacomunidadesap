import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Un aviso listo para la campana del portal. */
export interface AvisoCampana {
  id_usuario_destinatario: string;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  datos_adicionales?: Record<string, unknown>;
}

/**
 * La campana del portal, vista desde contratación.
 *
 * Tres cuidados que se aprendieron a golpes y aplican a cualquier aviso:
 *
 * - **El destinatario es la cuenta, no la persona.** La campana consulta
 *   `/users/:id_user/notifications`, así que un aviso escrito contra el
 *   `id_person` se guarda y nadie lo ve.
 * - **No se repite lo que sigue sin leer.** Dos eventos iguales seguidos dejaban
 *   dos copias idénticas.
 * - **Un fallo no rompe nada.** El proceso ya quedó guardado cuando se avisa; si
 *   notifications-service está caído se pierde el aviso, no el trabajo.
 */
export class Campana {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  /**
   * Traduce ids de persona o de cuenta a ids de cuenta.
   *
   * Lo que no se reconoce se conserva tal cual: puede ser ya una cuenta que la
   * consulta no alcanzó, y descartarlo perdería el aviso.
   */
  async cuentasDe(ids: string[]): Promise<string[]> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (!unicos.length) return [];

    try {
      const filas: { origen: string; id_user: string }[] = await this.dataSource.query(
        `SELECT u.id_person::text AS origen, u.id_user::text AS id_user
           FROM auth."user" u
          WHERE u.id_person::text = ANY($1::text[])
         UNION
         SELECT u.id_user::text, u.id_user::text
           FROM auth."user" u
          WHERE u.id_user::text = ANY($1::text[])`,
        [unicos],
      );
      const porOrigen = new Map(filas.map((f) => [f.origen, f.id_user]));
      return [...new Set(unicos.map((id) => porOrigen.get(id) ?? id))];
    } catch (error: any) {
      this.logger.warn(`No se pudieron resolver las cuentas: ${error.message}`);
      return unicos;
    }
  }

  /** Envía los avisos que no estén ya sin leer en la campana de su destinatario. */
  async enviar(avisos: AvisoCampana[]): Promise<{ enviados: number; repetidos: number; error?: string }> {
    if (!avisos.length) return { enviados: 0, repetidos: 0 };

    const nuevos = await this.sinAvisarYa(avisos);
    const repetidos = avisos.length - nuevos.length;
    if (!nuevos.length) return { enviados: 0, repetidos };

    const url = process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3009';

    try {
      const respuesta = await fetch(`${url}/notifications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: nuevos }),
      });
      if (!respuesta.ok) {
        this.logger.warn(`notifications-service respondió ${respuesta.status}`);
        return { enviados: 0, repetidos, error: 'no se pudo notificar' };
      }
    } catch (error: any) {
      this.logger.warn(`No se pudo avisar a notifications-service: ${error.message}`);
      return { enviados: 0, repetidos, error: 'no se pudo notificar' };
    }

    return { enviados: nuevos.length, repetidos };
  }

  /** Descarta los avisos idénticos que el destinatario todavía no ha leído. */
  private async sinAvisarYa(avisos: AvisoCampana[]): Promise<AvisoCampana[]> {
    try {
      const pendientes: { id_usuario_destinatario: string; mensaje: string }[] =
        await this.dataSource.query(
          `SELECT id_usuario_destinatario::text AS id_usuario_destinatario, mensaje
             FROM notifications.notificacion
            WHERE leida = false
              AND archivada = false
              AND id_usuario_destinatario::text = ANY($1::text[])`,
          [[...new Set(avisos.map((a) => a.id_usuario_destinatario))]],
        );
      const yaEsta = new Set(pendientes.map((p) => `${p.id_usuario_destinatario}|${p.mensaje}`));
      const vistos = new Set<string>();

      return avisos.filter((a) => {
        const clave = `${a.id_usuario_destinatario}|${a.mensaje}`;
        if (yaEsta.has(clave) || vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      });
    } catch (error: any) {
      // Un duplicado molesta; perder el aviso no. Ante la duda, se manda.
      this.logger.warn(`No se pudo comprobar si el aviso ya existía: ${error.message}`);
      return avisos;
    }
  }
}
