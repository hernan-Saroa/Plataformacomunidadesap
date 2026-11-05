import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { permisosDeRoles } from '../auth/permisos.guard';
import { EmailsService } from '../emails/emails.service';
import { esOmitida, NotificationsService } from '../notifications/notifications.service';
import { CompuertaService, compuertaEncendida } from './compuerta.service';
import { ActualizarEventoDto, ActualizarModuloDto } from './dto/configuracion.dto';
import {
  ConfiguracionHistorial,
  EnvioOmitido,
  EventoNotificacion,
  ModuloNotificacion,
} from './entities/configuracion.entities';

export const PERMISO_GESTIONAR = 'notificaciones.configuracion.gestionar';

export interface UsuarioConsola {
  userId: string;
  username?: string;
  email?: string;
  roles?: unknown;
}

export interface ModuloResumen extends ModuloNotificacion {
  eventos: number;
  eventos_activos: number;
  omitidas_7d: number;
}

const CAMPOS_MODULO: Array<keyof ActualizarModuloDto> = ['activo', 'canal_defecto', 'nombre', 'correo_desvio'];
const CAMPOS_EVENTO: Array<keyof ActualizarEventoDto> = [
  'activo', 'canal', 'obligatorio', 'prioridad', 'nombre', 'descripcion',
  'roles_adicionales', 'dependencias_adicionales', 'sedes_adicionales',
];

const quien = (u: UsuarioConsola): string => u.username || u.email || u.userId;

const DOMINIO_DESVIO_POR_DEFECTO = 'esap.edu.co';
const FORMATO_CORREO = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Dominios que pueden recibir lo desviado: NOTIFICACIONES_DOMINIOS_DESVIO, separados por comas. */
export const dominiosDesvioPermitidos = (): string[] => {
  const lista = (process.env.NOTIFICACIONES_DOMINIOS_DESVIO || '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return lista.length ? lista : [DOMINIO_DESVIO_POR_DEFECTO];
};

/**
 * El buzón de desvío recibe lo que habría ido a personas reales: solo puede
 * ser una dirección válida de un dominio de la institución, para que un error
 * de tipeo (o un abuso) no saque avisos a un correo ajeno. Vacío lo borra.
 */
export function validarCorreoDesvio(valor: string | null | undefined): string | null {
  const correo = String(valor ?? '').trim().toLowerCase();
  if (!correo) return null;
  if (!FORMATO_CORREO.test(correo) || correo.length > 150) {
    throw new BadRequestException('El buzón de desvío no es un correo válido.');
  }
  const permitidos = dominiosDesvioPermitidos();
  if (!permitidos.includes(correo.slice(correo.lastIndexOf('@') + 1))) {
    throw new BadRequestException(
      `El buzón de desvío debe ser de un dominio permitido: ${permitidos.map((d) => `@${d}`).join(', ')}.`,
    );
  }
  return correo;
}

/** La consola de administración (EFDS-2406): lo que lee y escribe la pantalla. */
@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(ModuloNotificacion) private readonly modulos: Repository<ModuloNotificacion>,
    @InjectRepository(EventoNotificacion) private readonly eventos: Repository<EventoNotificacion>,
    @InjectRepository(ConfiguracionHistorial) private readonly historial: Repository<ConfiguracionHistorial>,
    @InjectRepository(EnvioOmitido) private readonly omitidas: Repository<EnvioOmitido>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly compuerta: CompuertaService,
    private readonly notificaciones: NotificationsService,
    private readonly correos: EmailsService,
  ) {}

  /** Qué puede hacer el usuario en la consola, según los permisos de sus roles. */
  async permisosDe(roles: string[]): Promise<{ gestionar: boolean; compuerta_encendida: boolean }> {
    const tiene = await permisosDeRoles(this.dataSource, roles, [PERMISO_GESTIONAR]);
    return { gestionar: tiene.length > 0, compuerta_encendida: compuertaEncendida() };
  }

  listarModulos(): Promise<ModuloResumen[]> {
    return this.dataSource.query(
      `SELECT m.*,
              (SELECT COUNT(*)::int FROM notifications.evento_notificacion e
                WHERE e.codigo_modulo = m.codigo) AS eventos,
              (SELECT COUNT(*)::int FROM notifications.evento_notificacion e
                WHERE e.codigo_modulo = m.codigo AND e.activo) AS eventos_activos,
              (SELECT COUNT(*)::int FROM notifications.envio_omitido o
                WHERE o.codigo_modulo = m.codigo AND o.fecha > NOW() - INTERVAL '7 days') AS omitidas_7d
         FROM notifications.modulo_notificacion m
        ORDER BY m.orden, m.nombre`,
    );
  }

  async actualizarModulo(codigo: string, cambios: ActualizarModuloDto, usuario: UsuarioConsola): Promise<ModuloNotificacion> {
    const modulo = await this.modulos.findOneBy({ codigo });
    if (!modulo) throw new NotFoundException('El módulo no existe en la configuración de notificaciones.');

    if (cambios.correo_desvio !== undefined) {
      cambios = { ...cambios, correo_desvio: validarCorreoDesvio(cambios.correo_desvio) };
    }

    const { anterior, nuevo } = diferencias(modulo, cambios, CAMPOS_MODULO);
    if (Object.keys(nuevo).length === 0) return modulo;

    Object.assign(modulo, nuevo, { actualizado_por: quien(usuario) });
    await this.modulos.save(modulo);
    await this.registrarCambio('modulo', codigo, codigo, anterior, nuevo, usuario);
    this.compuerta.invalidar();
    return modulo;
  }

  listarEventos(codigoModulo: string): Promise<EventoNotificacion[]> {
    return this.eventos.find({ where: { codigo_modulo: codigoModulo }, order: { clave: 'ASC' } });
  }

  async actualizarEvento(
    codigoModulo: string,
    clave: string,
    cambios: ActualizarEventoDto,
    usuario: UsuarioConsola,
  ): Promise<EventoNotificacion> {
    const evento = await this.eventos.findOneBy({ codigo_modulo: codigoModulo, clave });
    if (!evento) throw new NotFoundException('El evento no existe en la configuración de notificaciones.');

    if (cambios.canal === 'correo' && !evento.envia_correo) {
      throw new BadRequestException(
        'Este evento no manda correo desde el código; elija "plataforma" o "ambos".',
      );
    }
    // Un evento obligatorio nunca está apagado (RN3).
    const obligatorio = cambios.obligatorio ?? evento.obligatorio;
    if (obligatorio) cambios = { ...cambios, obligatorio: true, activo: true };
    if (cambios.roles_adicionales) {
      cambios = { ...cambios, roles_adicionales: cambios.roles_adicionales.map((r) => r.trim().toUpperCase()).filter(Boolean) };
    }

    const { anterior, nuevo } = diferencias(evento, cambios, CAMPOS_EVENTO);
    if (Object.keys(nuevo).length === 0) return evento;

    Object.assign(evento, nuevo, { actualizado_por: quien(usuario) });
    await this.eventos.save(evento);
    await this.registrarCambio('evento', codigoModulo, clave, anterior, nuevo, usuario);
    this.compuerta.invalidar();
    return evento;
  }

  private registrarCambio(
    entidad: 'modulo' | 'evento',
    codigoModulo: string,
    clave: string,
    anterior: Record<string, unknown>,
    nuevo: Record<string, unknown>,
    usuario: UsuarioConsola,
  ): Promise<unknown> {
    return this.historial.insert({ entidad, codigo_modulo: codigoModulo, clave, anterior: anterior as any, nuevo: nuevo as any, usuario: quien(usuario) });
  }

  listarHistorial(limite = 100): Promise<ConfiguracionHistorial[]> {
    return this.historial.find({ order: { fecha: 'DESC' }, take: Math.min(Math.max(limite, 1), 500) });
  }

  listarOmitidas(limite = 100, codigoModulo?: string): Promise<EnvioOmitido[]> {
    return this.omitidas.find({
      where: codigoModulo ? { codigo_modulo: codigoModulo } : {},
      order: { fecha: 'DESC' },
      take: Math.min(Math.max(limite, 1), 500),
    });
  }

  /**
   * Envío de prueba (función 15): el evento se dispara contra quien está en la
   * consola, por el camino normal, así que respeta módulo, evento y canal. Si
   * la plataforma lo recibió, el evento queda marcado como verificado.
   */
  async enviarPrueba(codigoModulo: string, clave: string, usuario: UsuarioConsola) {
    const evento = await this.eventos.findOneBy({ codigo_modulo: codigoModulo, clave });
    if (!evento) throw new NotFoundException('El evento no existe en la configuración de notificaciones.');

    const titulo = `Prueba: ${evento.nombre}`;
    const mensaje = `Notificación de prueba del evento "${evento.clave}" (${evento.codigo_modulo}) enviada desde la consola por ${quien(usuario)}.`;

    const plataforma = await this.notificaciones.create({
      id_usuario_destinatario: usuario.userId,
      tipo_notificacion: evento.clave,
      titulo,
      mensaje,
      modulo: evento.codigo_modulo,
      categoria: evento.codigo_modulo,
      prioridad: evento.prioridad ?? (evento.prioridad_codigo as any) ?? 'Media',
      icono: 'bell',
      tiene_accion: false,
      datos_adicionales: { prueba: true, consola: true },
    });

    let correo: { estado: 'enviado' | 'omitido' | 'sin_correo' | 'error'; motivo?: string } = { estado: 'sin_correo' };
    if (evento.envia_correo && usuario.email) {
      try {
        const r = await this.correos.enviarSiPermitido({
          to: usuario.email,
          subject: titulo,
          text: mensaje,
          evento: evento.clave,
          modulo: evento.codigo_modulo,
        });
        correo = r.omitida ? { estado: 'omitido', motivo: r.motivo } : { estado: 'enviado' };
      } catch (error: any) {
        correo = { estado: 'error', motivo: error?.message || 'No se pudo enviar el correo' };
      }
    }

    const recibida = !esOmitida(plataforma);
    if (recibida) {
      await this.eventos.update({ codigo_modulo: codigoModulo, clave }, { verificado_en: new Date(), verificado_por: quien(usuario) });
      this.compuerta.invalidar();
    }

    return {
      plataforma: recibida ? { estado: 'enviado' as const } : { estado: 'omitido' as const, motivo: (plataforma as any).motivo },
      correo,
      verificado: recibida,
    };
  }
}

/** Qué campos cambian de verdad: el historial guarda solo esos, antes y después. */
function diferencias<T extends object>(
  actual: T,
  cambios: Partial<Record<keyof T, unknown>> | object,
  campos: Array<keyof any>,
): { anterior: Record<string, unknown>; nuevo: Record<string, unknown> } {
  const anterior: Record<string, unknown> = {};
  const nuevo: Record<string, unknown> = {};
  for (const campo of campos as string[]) {
    if (!(campo in cambios) || (cambios as any)[campo] === undefined) continue;
    const antes = (actual as any)[campo];
    const despues = (cambios as any)[campo];
    if (JSON.stringify(normalizar(antes)) === JSON.stringify(normalizar(despues))) continue;
    anterior[campo] = antes ?? null;
    nuevo[campo] = despues;
  }
  return { anterior, nuevo };
}

const normalizar = (v: unknown) => (Array.isArray(v) ? v.map(String) : v ?? null);
