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
  /** Con `permitido: false` es la razón original (apagado, canal); el desvío no la reemplaza. */
  motivo?: MotivoOmision | 'compuerta_apagada' | 'sin_catalogo';
  modulo: string;
  /** Nombre legible del módulo, para el asunto y el aviso de los correos desviados. */
  modulo_nombre?: string;
  clave: string;
  /** La que debe llevar la notificación: la de la consola o, si no, la del código. */
  prioridad: string;
  canal: Canal;
  evento: EventoNotificacion | null;
  /**
   * Buzón al que debe ir lo que la configuración apagó. Solo viene cuando el
   * motivo es módulo o evento apagado y el módulo tiene `correo_desvio`; los
   * obligatorios y los motivos de canal nunca se desvían.
   */
  desvio?: string;
}

export interface DestinatarioAdicional {
  id_user: string;
  email: string | null;
}

interface Catalogo {
  modulos: Map<string, ModuloNotificacion>;
  alias: Map<string, string>;
  /** Indexado por `${codigo_modulo}:${clave}`: la misma clave puede vivir en varios módulos. */
  eventos: Map<string, EventoNotificacion>;
  /** Módulos donde existe cada clave, para los avisos que llegan sin módulo. */
  modulosPorClave: Map<string, string[]>;
  cargadoEn: number;
}

const MODULO_SIN_IDENTIFICAR = 'otros';
const PREFIJOS_DE_MODULO: Array<[string, string]> = [['contratacion_', 'contratacion']];

export const compuertaEncendida = (): boolean =>
  !['0', 'false', 'off', 'no'].includes((process.env.NOTIFICACIONES_COMPUERTA || '').trim().toLowerCase());

export const llaveEvento = (modulo: string, clave: string): string => `${modulo}:${clave}`;

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
 *   5. Si lo apagado es el módulo o el evento (no el canal) y el módulo tiene
 *      buzón de desvío, la decisión lo trae en `desvio` para que quien llama
 *      mande allí lo que habría salido. Los obligatorios nunca se desvían.
 *
 * El aviso se identifica por módulo + clave: la misma clave en dos módulos son
 * dos avisos distintos.
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
      const base = { modulo: modulo.codigo, modulo_nombre: modulo.nombre, clave, prioridad, canal, evento };

      let motivo: MotivoOmision | null = null;
      if (!evento.obligatorio) {
        if (!modulo.activo) motivo = 'modulo_inactivo';
        else if (!evento.activo) motivo = 'evento_inactivo';
        else if (entrada.canal === 'plataforma' && canal === 'correo') motivo = 'canal_solo_correo';
        else if (entrada.canal === 'correo' && canal === 'plataforma') motivo = 'canal_solo_plataforma';
      }

      if (motivo) {
        const desvio =
          (motivo === 'modulo_inactivo' || motivo === 'evento_inactivo') && modulo.correo_desvio
            ? modulo.correo_desvio
            : undefined;
        await this.registrarOmision(entrada, modulo.codigo, clave, desvio ? 'desviado' : motivo, desvio);
        return { ...base, permitido: false, motivo, ...(desvio ? { desvio } : {}) };
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
      eventos: new Map(eventos.map((e) => [llaveEvento(e.codigo_modulo, e.clave), e])),
      modulosPorClave: indexarPorClave(eventos),
      cargadoEn: Date.now(),
    };
    return this.catalogo;
  }

  /**
   * Correo del usuario para decirle al buzón de desvío a quién iba dirigida una
   * campana. Si no se encuentra (o la base falla) devuelve null y el aviso
   * nombra el id.
   */
  async resolverCorreoDeUsuario(idUsuario: string): Promise<string | null> {
    if (!idUsuario) return null;
    try {
      const filas: Array<{ email: string | null }> = await this.dataSource.query(
        `SELECT COALESCE(p.dir_email, u.username) AS email
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE u.id_user::text = $1
          LIMIT 1`,
        [String(idUsuario)],
      );
      return filas[0]?.email || null;
    } catch (error: any) {
      this.logger.warn(`No se resolvió el correo del usuario ${idUsuario}: ${error?.message}`);
      return null;
    }
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

    // Sin pistas del emisor: si la clave existe en un solo módulo es de ese.
    // En varios no se adivina (cada uno la gobierna por separado) y en ninguno
    // no hay a quién asignarla: cae en "otros".
    const duenos = catalogo.modulosPorClave.get(clave) ?? [];
    return duenos.length === 1 ? duenos[0] : MODULO_SIN_IDENTIFICAR;
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
    const llave = llaveEvento(modulo.codigo, clave);
    let evento = catalogo.eventos.get(llave);

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
          envia_campana: entrada.canal === 'plataforma',
          visto_en: new Date(),
        })
        .orIgnore()
        .execute();
      evento = await repo.findOneByOrFail({ codigo_modulo: modulo.codigo, clave });
      catalogo.eventos.set(llave, evento);
      const duenos = catalogo.modulosPorClave.get(clave) ?? [];
      if (!duenos.includes(modulo.codigo)) catalogo.modulosPorClave.set(clave, [...duenos, modulo.codigo]);
      this.vistos.set(llave, Date.now());
      this.logger.log(`Evento nuevo en el catálogo: ${modulo.codigo} / ${clave}`);
      return evento;
    }

    const cambios: Partial<EventoNotificacion> = {};
    if (entrada.canal === 'correo' && !evento.envia_correo) {
      cambios.envia_correo = true;
      evento.envia_correo = true;
    }
    if (entrada.canal === 'plataforma' && !evento.envia_campana) {
      cambios.envia_campana = true;
      evento.envia_campana = true;
    }
    // `visto_en` se refresca cada tanto, no en cada aviso, para no escribir por gusto.
    const ultimo = this.vistos.get(llave) ?? 0;
    if (Date.now() - ultimo > 5 * 60_000) {
      cambios.visto_en = new Date();
      this.vistos.set(llave, Date.now());
    }
    if (Object.keys(cambios).length) {
      repo.update({ codigo_modulo: modulo.codigo, clave }, cambios).catch(() => undefined);
    }
    return evento;
  }

  private async registrarOmision(
    entrada: EntradaCompuerta,
    codigoModulo: string,
    clave: string,
    motivo: MotivoOmision | 'desviado',
    desviadoA?: string,
  ): Promise<void> {
    try {
      await this.dataSource.getRepository(EnvioOmitido).insert({
        codigo_modulo: codigoModulo,
        clave_evento: clave,
        canal: entrada.canal,
        destinatario: entrada.destinatario ? String(entrada.destinatario).slice(0, 255) : null,
        motivo,
        desviado_a: desviadoA ?? null,
        titulo: entrada.titulo ? String(entrada.titulo).slice(0, 255) : null,
      });
    } catch (error: any) {
      this.logger.warn(`No se registró la omisión de "${clave}": ${error?.message}`);
    }
  }
}

function indexarPorClave(eventos: EventoNotificacion[]): Map<string, string[]> {
  const porClave = new Map<string, string[]>();
  for (const e of eventos) porClave.set(e.clave, [...(porClave.get(e.clave) ?? []), e.codigo_modulo]);
  return porClave;
}
