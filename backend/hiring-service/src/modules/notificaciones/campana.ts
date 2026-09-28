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
 *
 * El correo sale por el mismo notifications-service que usa el resto de la
 * plataforma (`/api/v1/emails/send`, como PTA y certificados): la campana no lo
 * manda sola, aunque su DTO tenga un `enviar_email` que nadie lee.
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

  /**
   * Envía los avisos que no estén ya sin leer en la campana de su destinatario.
   *
   * Con `porCorreo`, cada aviso nuevo sale también al correo de su destinatario.
   * Solo los nuevos: un aviso repetido que la campana descarta no debe llegar
   * al correo como si fuera otro.
   */
  async enviar(
    avisos: AvisoCampana[],
    opciones: { porCorreo?: boolean } = {},
  ): Promise<{ enviados: number; repetidos: number; correos?: number; error?: string }> {
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

    const correos = opciones.porCorreo ? await this.porCorreo(nuevos) : 0;
    return { enviados: nuevos.length, repetidos, correos };
  }

  /**
   * El mismo aviso, al correo de cada destinatario.
   *
   * El correo es el de la persona y, si no lo tiene, el usuario cuando es un
   * correo: las cuentas institucionales entran con él. Cada envío es
   * independiente: que falle uno no detiene a los demás.
   */
  private async porCorreo(avisos: AvisoCampana[]): Promise<number> {
    let correos: Map<string, string>;
    try {
      const filas: { id: string; correo: string | null }[] = await this.dataSource.query(
        `SELECT u.id_user::text AS id,
                COALESCE(NULLIF(TRIM(p.dir_email), ''),
                         CASE WHEN u.username LIKE '%@%' THEN u.username END) AS correo
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE u.id_user::text = ANY($1::text[])`,
        [[...new Set(avisos.map((a) => a.id_usuario_destinatario))]],
      );
      correos = new Map(filas.filter((f) => f.correo).map((f) => [f.id, f.correo as string]));
    } catch (error: any) {
      this.logger.warn(`No se pudieron leer los correos: ${error.message}`);
      return 0;
    }

    const url = process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3009';
    let enviados = 0;
    for (const aviso of avisos) {
      const para = correos.get(aviso.id_usuario_destinatario);
      if (!para) continue;
      try {
        const respuesta = await fetch(`${url}/api/v1/emails/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: para,
            subject: `Contratación · ${aviso.titulo}`,
            text: `${aviso.mensaje}\n\nEste aviso también está en la campana de la plataforma.`,
            html: htmlDelAviso(aviso),
          }),
        });
        if (respuesta.ok) enviados++;
        else this.logger.warn(`El correo a ${para} no salió: ${respuesta.status}`);
      } catch (error: any) {
        this.logger.warn(`El correo a ${para} no salió: ${error.message}`);
      }
    }
    return enviados;
  }

  /**
   * El aviso, solo por correo, a quien no tiene cuenta en la plataforma (088).
   *
   * El contratista y los correos escritos a mano no tienen campana, así que el
   * correo es su único canal: sale aunque la actividad tenga el correo apagado
   * para sus usuarios, porque configurarlos ya es pedir que les llegue. El texto
   * no los manda a la plataforma, a la que no pueden entrar.
   */
  async aCorreosExternos(
    correos: string[],
    aviso: Pick<AvisoCampana, 'titulo' | 'mensaje'>,
  ): Promise<number> {
    const unicos = [...new Set(correos.map((c) => c.trim().toLowerCase()).filter(Boolean))];
    const url = process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3009';
    let enviados = 0;
    for (const para of unicos) {
      try {
        const respuesta = await fetch(`${url}/api/v1/emails/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: para,
            subject: `ESAP · ${aviso.titulo}`,
            text: aviso.mensaje,
            html: htmlDelAviso(aviso, { externo: true }),
          }),
        });
        if (respuesta.ok) enviados++;
        else this.logger.warn(`El correo externo a ${para} no salió: ${respuesta.status}`);
      } catch (error: any) {
        this.logger.warn(`El correo externo a ${para} no salió: ${error.message}`);
      }
    }
    return enviados;
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

/** Lo que escribió un usuario —unas observaciones— no puede volverse HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * El aviso con el aspecto del módulo: título, mensaje y el enlace a la plataforma.
 *
 * Con `externo`, sin el enlace ni la nota de la campana: quien lo recibe no
 * tiene cuenta, y mandarlo a la plataforma sería mandarlo a una puerta cerrada.
 */
export function htmlDelAviso(
  aviso: Pick<AvisoCampana, 'titulo' | 'mensaje'>,
  opciones: { externo?: boolean } = {},
): string {
  const portal = process.env.FRONTEND_URL;
  const enlace =
    portal && !opciones.externo
      ? `<p style="margin:20px 0 0"><a href="${escapar(portal)}" style="background:#003DA5;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;font-size:14px">Abrir la plataforma</a></p>`
      : '';
  const pie = opciones.externo
    ? 'Mensaje enviado por la Dirección de Contratación de la ESAP.'
    : 'Este aviso también está en la campana de la plataforma.';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#003DA5;color:#ffffff;padding:14px 20px;border-radius:8px 8px 0 0;font-weight:700;font-size:15px">Contratación · ESAP</div>
  <div style="border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px">
    <p style="font-size:16px;font-weight:700;margin:0 0 8px">${escapar(aviso.titulo)}</p>
    <p style="font-size:14px;line-height:1.5;margin:0">${escapar(aviso.mensaje)}</p>${enlace}
    <p style="font-size:12px;color:#64748b;margin:20px 0 0">${pie}</p>
  </div>
</div>`;
}
