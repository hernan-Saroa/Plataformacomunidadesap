/**
 * Configuración de notificaciones por módulo (EFDS-2406).
 *
 * Desde "Configuración General > Notificaciones" se activa o desactiva lo que
 * avisa cada módulo, por evento, con su canal, prioridad y destinatarios
 * adicionales. Vive en notifications-service; el catálogo de eventos se llena
 * solo con el primer aviso que llega de cada tipo.
 */
import { apiClient } from './apiClient';

const BASE = '/notificaciones/api/v1/configuracion';

export type Canal = 'plataforma' | 'correo' | 'ambos';
export type Prioridad = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export const CANALES: { id: Canal; nombre: string; ayuda: string }[] = [
  { id: 'ambos', nombre: 'Plataforma y correo', ayuda: 'Campana y correo institucional, si el evento manda correo.' },
  { id: 'plataforma', nombre: 'Solo plataforma', ayuda: 'Solo la campana; el correo del evento no sale.' },
  { id: 'correo', nombre: 'Solo correo', ayuda: 'Solo el correo; no aparece en la campana.' },
];

export const PRIORIDADES: Prioridad[] = ['Baja', 'Media', 'Alta', 'Crítica'];

export interface PermisosNotificaciones {
  gestionar: boolean;
  compuerta_encendida: boolean;
}

export interface ModuloNotificaciones {
  codigo: string;
  nombre: string;
  activo: boolean;
  canal_defecto: Canal;
  orden: number;
  actualizado_en: string;
  actualizado_por: string | null;
  eventos: number;
  eventos_activos: number;
  omitidas_7d: number;
}

export interface EventoNotificaciones {
  clave: string;
  codigo_modulo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  canal: Canal | null;
  obligatorio: boolean;
  prioridad: Prioridad | null;
  prioridad_codigo: string | null;
  envia_correo: boolean;
  roles_adicionales: string[];
  dependencias_adicionales: string[];
  sedes_adicionales: string[];
  visto_en: string | null;
  verificado_en: string | null;
  verificado_por: string | null;
  actualizado_en: string;
  actualizado_por: string | null;
}

export interface CambioConfiguracion {
  id: string;
  entidad: 'modulo' | 'evento';
  clave: string;
  anterior: Record<string, unknown> | null;
  nuevo: Record<string, unknown> | null;
  usuario: string | null;
  fecha: string;
}

export interface EnvioOmitido {
  id: string;
  codigo_modulo: string;
  clave_evento: string;
  canal: 'plataforma' | 'correo';
  destinatario: string | null;
  motivo: string;
  titulo: string | null;
  fecha: string;
}

export interface ResultadoPrueba {
  plataforma: { estado: 'enviado' | 'omitido'; motivo?: string };
  correo: { estado: 'enviado' | 'omitido' | 'sin_correo' | 'error'; motivo?: string };
  verificado: boolean;
}

export type CambiosModulo = Partial<Pick<ModuloNotificaciones, 'activo' | 'canal_defecto' | 'nombre'>>;
export type CambiosEvento = Partial<{
  activo: boolean;
  canal: Canal | null;
  obligatorio: boolean;
  prioridad: Prioridad | null;
  nombre: string;
  descripcion: string | null;
  roles_adicionales: string[];
  dependencias_adicionales: number[];
  sedes_adicionales: number[];
}>;

export const MOTIVOS: Record<string, string> = {
  modulo_inactivo: 'Módulo desactivado',
  evento_inactivo: 'Evento desactivado',
  canal_solo_correo: 'El evento es solo de correo',
  canal_solo_plataforma: 'El evento es solo de plataforma',
};

function extraerData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).data as T;
  }
  return res as T;
}

const lista = <T>(res: unknown): T[] => {
  const datos = extraerData<T[]>(res);
  return Array.isArray(datos) ? datos : [];
};

export const notificacionesConfigService = {
  async misPermisos(): Promise<PermisosNotificaciones> {
    return extraerData<PermisosNotificaciones>(await apiClient.get<unknown>(`${BASE}/permisos`));
  },

  async listarModulos(): Promise<ModuloNotificaciones[]> {
    return lista<ModuloNotificaciones>(await apiClient.get<unknown>(`${BASE}/modulos`));
  },

  async actualizarModulo(codigo: string, cambios: CambiosModulo): Promise<ModuloNotificaciones> {
    return extraerData<ModuloNotificaciones>(
      await apiClient.patch<unknown>(`${BASE}/modulos/${encodeURIComponent(codigo)}`, cambios),
    );
  },

  async listarEventos(codigoModulo: string): Promise<EventoNotificaciones[]> {
    return lista<EventoNotificaciones>(
      await apiClient.get<unknown>(`${BASE}/modulos/${encodeURIComponent(codigoModulo)}/eventos`),
    );
  },

  async actualizarEvento(clave: string, cambios: CambiosEvento): Promise<EventoNotificaciones> {
    return extraerData<EventoNotificaciones>(
      await apiClient.patch<unknown>(`${BASE}/eventos/${encodeURIComponent(clave)}`, cambios),
    );
  },

  async probar(clave: string): Promise<ResultadoPrueba> {
    return extraerData<ResultadoPrueba>(
      await apiClient.post<unknown>(`${BASE}/eventos/${encodeURIComponent(clave)}/prueba`, {}),
    );
  },

  async historial(limite = 100): Promise<CambioConfiguracion[]> {
    return lista<CambioConfiguracion>(await apiClient.get<unknown>(`${BASE}/historial`, { limite }));
  },

  async omitidas(limite = 100, modulo?: string): Promise<EnvioOmitido[]> {
    return lista<EnvioOmitido>(
      await apiClient.get<unknown>(`${BASE}/omitidas`, modulo ? { limite, modulo } : { limite }),
    );
  },
};

export default notificacionesConfigService;
