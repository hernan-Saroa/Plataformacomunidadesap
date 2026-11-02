import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Canal,
  EnvioOmitido,
  EventoNotificacion,
  ModuloAlias,
  ModuloNotificacion,
} from './entities/configuracion.entities';

export type CanalSolicitado = 'plataforma' | 'correo';

export type MotivoOmision =
  | 'modulo_inactivo'
  | 'evento_inactivo'
  | 'canal_solo_correo'
  | 'canal_solo_plataforma';

export interface EntradaCompuerta {
  /** `tipo_notificacion` de la campana o `evento` del correo. */
  clave: string;
  canal: CanalSolicitado;
  modulo?: string | null;
  categoria?: string | null;
  prioridad?: string | null;
  /** id de usuario o correo; solo para la bitácora de omitidas. */
  destinatario?: string | null;
  titulo?: string | null;
}

export interface Decision {
  permitido: boolean;
  motivo?: MotivoOmision | 'compuerta_apagada' | 'sin_catalogo';
  modulo: string;
  clave: string;
  /** La que debe llevar la notificación: la de la consola o, si no, la del código. */
  prioridad: string;
  canal: Canal;
  evento: EventoNotificacion | null;
}

export interface DestinatarioAdicional {
  id_user: string;
  email: string | null;
}

interface Catalogo {
  modulos: Map<string, ModuloNotificacion>;
  alias: Map<string, string>;
  eventos: Map<string, EventoNotificacion>;
  cargadoEn: number;
}

const MODULO_SIN_IDENTIFICAR = 'otros';
const PREFIJOS_DE_MODULO: Array<[string, string]> = [['contratacion_', 'contratacion']];

export const compuertaEncendida = (): boolean =>
  !['0', 'false', 'off', 'no'].includes((process.env.NOTIFICACIONES_COMPUERTA || '').trim().toLowerCase());

export const normalizarCodigo = (valor: string | null | undefined): string =>
  String(valor ?? '').trim().toLowerCase();

/** 'pta_pendiente_aprobacion' → 'Pta pendiente aprobacion'. */
export const nombreDesdeClave = (clave: string): string => {
  const texto = clave.replace(/[_-]+/g, ' ').trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : clave;
};

/**
 * La puerta por la que pasa cada notificación y cada correo con evento antes
 * de guardarse o enviarse (EFDS-2406). Reglas:
 *
 *   1. Sin catálogo, o con el interruptor NOTIFICACIONES_COMPUERTA apagado,
 *      todo pasa como antes. Ante cualquier error de base también: la
 *      compuerta nunca es la razón de que un aviso legítimo se pierda.
 *   2. Un evento desconocido se registra activo la primera vez que llega.
 *   3. Módulo inactivo o evento inactivo → se omite, salvo que el evento sea
 *      obligatorio.
 *   4. El canal del evento (o el del módulo si el evento no define uno)
 *      decide si se guarda en la campana, se manda el correo, o ambos.
 */
@Injectable()
export class CompuertaService {
  private readonly logger = new Logger(CompuertaService.name);
  private catalogo: Catalogo | null = null;
  private cargando: Promise<Catalogo> | null = null;
  private readonly vistos = new Map<string, number>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Cuánto vive el catálogo en memoria antes de releerse. */
  private get ttlMs(): number {
    const valor = Number(process.env.NOTIFICACIONES_CACHE_MS);
    return Number.isFinite(valor) && valor >= 0 ? valor : 10_000;
  }

  invalidar(): void {
    this.catalogo = null;
  }

  async evaluar(entrada: EntradaCompuerta): Promise<Decision> {
    const clave = String(entrada.clave ?? '').trim();
    const prioridadCodigo = entrada.prioridad || 'Media';
    const pasa = (motivo: Decision['motivo'], modulo = MODULO_SIN_IDENTIFICAR): Decision => ({
      permitido: true,
      motivo,
      modulo,
      clave,
      prioridad: prioridadCodigo,
      canal: 'ambos',
      evento: null,
    });

    if (!compuertaEncendida() || !clave) return pasa('compuerta_apagada');

    try {
      const catalogo = await this.obtenerCatalogo();
      const codigoModulo = this.resolverModulo(catalogo, entrada, clave);
      const modulo = await this.asegurarModulo(catalogo, codigoModulo);
      const evento = await this.asegurarEvento(catalogo, modulo, clave, entrada);

      const canal: Canal = evento.canal ?? modulo.canal_defecto ?? 'ambos';
      const prioridad = evento.prioridad ?? prioridadCodigo;
      const base = { modulo: modulo.codigo, clave, prioridad, canal, evento };

      let motivo: MotivoOmision | null = null;
      if (!evento.obligatorio) {
        if (!modulo.activo) motivo = 'modulo_inactivo';
        else if (!evento.activo) motivo = 'evento_inactivo';
        else if (entrada.canal === 'plataforma' && canal === 'correo') motivo = 'canal_solo_correo';
        else if (entrada.canal === 'correo' && canal === 'plataforma') motivo = 'canal_solo_plataforma';
      }

      if (motivo) {
        await this.registrarOmision(entrada, modulo.codigo, clave, motivo);
        return { ...base, permitido: false, motivo };
      }
      return { ...base, permitido: true };
    } catch (error: any) {
      this.logger.warn(`La compuerta no pudo evaluar "${clave}" y deja pasar: ${error?.message || error}`);
      return pasa('sin_catalogo');
    }
  }

  /**
   * Usuarios que el administrador sumó al evento por rol, dependencia o sede
   * (función 4). Se agregan a los que decide el código, nunca los reemplazan.
   */
  async destinatariosAdicionales(evento: EventoNotificacion | null): Promise<DestinatarioAdicional[]> {
    if (!evento) return [];
    const roles = (evento.roles_adicionales || []).map((r) => r.toUpperCase());
    const dependencias = (evento.dependencias_adicionales || []).map(String);
    const sedes = (evento.sedes_adicionales || []).map(String);
    if (!roles.length && !dependencias.length && !sedes.length) return [];
    try {
      return await this.dataSource.query(
        `SELECT DISTINCT u.id_user::text AS id_user,
                COALESCE(p.dir_email, u.username) AS email
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE COALESCE(u.is_active, true) = true
            AND (
              (cardinality($1::text[]) > 0 AND EXISTS (
                 SELECT 1 FROM auth.user_roles ur
                   JOIN auth.role r ON r.id = ur.id_rol
                  WHERE ur.id_user = u.id_user
                    AND COALESCE(ur.is_active, true) = true
                    AND UPPER(r.code) = ANY($1::text[])))
              OR (cardinality($2::bigint[]) > 0 AND p.id_dependencia = ANY($2::bigint[]))
              OR (cardinality($3::bigint[]) > 0 AND p.id_sede = ANY($3::bigint[]))
            )`,
        [roles, dependencias, sedes],
      );
    } catch (error: any) {
      this.logger.warn(`No se resolvieron los destinatarios adicionales de "${evento.clave}": ${error?.message}`);
      return [];
    }
  }

  // ── Catálogo en memoria ───────────────────────────────────────────────────

  private async obtenerCatalogo(): Promise<Catalogo> {
    if (this.catalogo && Date.now() - this.catalogo.cargadoEn < this.ttlMs) return this.catalogo;
    if (!this.cargando) {
      this.cargando = this.cargarCatalogo().finally(() => (this.cargando = null));
    }
    return this.cargando;
  }

  private async cargarCatalogo(): Promise<Catalogo> {
    const [modulos, alias, eventos] = await Promise.all([
      this.dataSource.getRepository(ModuloNotificacion).find(),
      this.dataSource.getRepository(ModuloAlias).find(),
      this.dataSource.getRepository(EventoNotificacion).find(),
    ]);
    this.catalogo = {
      modulos: new Map(modulos.map((m) => [m.codigo, m])),
      alias: new Map(alias.map((a) => [normalizarCodigo(a.alias), a.codigo_modulo])),
      eventos: new Map(eventos.map((e) => [e.clave, e])),
      cargadoEn: Date.now(),
    };
    return this.catalogo;
  }

  private resolverModulo(catalogo: Catalogo, entrada: EntradaCompuerta, clave: string): string {
    const explicito = normalizarCodigo(entrada.modulo);
    if (explicito) return catalogo.alias.get(explicito) ?? explicito;

    const categoria = normalizarCodigo(entrada.categoria);
    if (categoria) {
      const porAlias = catalogo.alias.get(categoria);
      if (porAlias) return porAlias;
      if (catalogo.modulos.has(categoria)) return categoria;
    }

    const claveNormalizada = normalizarCodigo(clave);
    for (const [prefijo, modulo] of PREFIJOS_DE_MODULO) {
      if (claveNormalizada.startsWith(prefijo)) return modulo;
    }
    return MODULO_SIN_IDENTIFICAR;
  }

  private async asegurarModulo(catalogo: Catalogo, codigo: string): Promise<ModuloNotificacion> {
    const existente = catalogo.modulos.get(codigo);
    if (existente) return existente;
    const repo = this.dataSource.getRepository(ModuloNotificacion);
    await repo
      .createQueryBuilder()
      .insert()
      .values({ codigo, nombre: nombreDesdeClave(codigo), activo: true, canal_defecto: 'ambos', orden: 500 })
      .orIgnore()
      .execute();
    const modulo = await repo.findOneByOrFail({ codigo });
    catalogo.modulos.set(codigo, modulo);
    return modulo;
  }

  private async asegurarEvento(
    catalogo: Catalogo,
    modulo: ModuloNotificacion,
    clave: string,
    entrada: EntradaCompuerta,
  ): Promise<EventoNotificacion> {
    const repo = this.dataSource.getRepository(EventoNotificacion);
    let evento = catalogo.eventos.get(clave);

    if (!evento) {
      await repo
        .createQueryBuilder()
        .insert()
        .values({
          clave,
          codigo_modulo: modulo.codigo,
          nombre: nombreDesdeClave(clave),
          activo: true,
          obligatorio: false,
          prioridad_codigo: entrada.prioridad || null,
          envia_correo: entrada.canal === 'correo',
          visto_en: new Date(),
        })
        .orIgnore()
        .execute();
      evento = await repo.findOneByOrFail({ clave });
      catalogo.eventos.set(clave, evento);
      this.vistos.set(clave, Date.now());
      this.logger.log(`Evento nuevo en el catálogo: ${modulo.codigo} / ${clave}`);
      return evento;
    }

    const cambios: Partial<EventoNotificacion> = {};
    if (entrada.canal === 'correo' && !evento.envia_correo) {
      cambios.envia_correo = true;
      evento.envia_correo = true;
    }
    // `visto_en` se refresca cada tanto, no en cada aviso, para no escribir por gusto.
    const ultimo = this.vistos.get(clave) ?? 0;
    if (Date.now() - ultimo > 5 * 60_000) {
      cambios.visto_en = new Date();
      this.vistos.set(clave, Date.now());
    }
    if (Object.keys(cambios).length) {
      repo.update({ clave }, cambios).catch(() => undefined);
    }
    return evento;
  }

  private async registrarOmision(
    entrada: EntradaCompuerta,
    codigoModulo: string,
    clave: string,
    motivo: MotivoOmision,
  ): Promise<void> {
    try {
      await this.dataSource.getRepository(EnvioOmitido).insert({
        codigo_modulo: codigoModulo,
        clave_evento: clave,
        canal: entrada.canal,
        destinatario: entrada.destinatario ? String(entrada.destinatario).slice(0, 255) : null,
        motivo,
        titulo: entrada.titulo ? String(entrada.titulo).slice(0, 255) : null,
      });
    } catch (error: any) {
      this.logger.warn(`No se registró la omisión de "${clave}": ${error?.message}`);
    }
  }
}
