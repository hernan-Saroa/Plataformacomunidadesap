import {
  Comisionado,
  CreateSolicitudRequest,
  EstadoSolicitudViatico,
  FormNuevaSolicitud,
  PrioridadSolicitud,
} from '../types/viaticos';

/**
 * Identificador por defecto del usuario que radica la solicitud.
 * Debe reemplazarse por el id de la sesión autenticada del portal
 * (p. ej. `authService.getCurrentUser()?.id`).
 */
export const USUARIO_ACTUAL_ID = 'USUARIO_NO_AUTENTICADO';

/**
 * Estado inicial del formulario de nueva solicitud.
 * Los campos se alinean con el DTO backend `CreateSolicitudDto`.
 */
export function formInicialNuevaSolicitud(): FormNuevaSolicitud {
  return {
    documentoComisionado: '',
    comisionadoId: '',
    objetoComision: '',
    destinoCiudad: '',
    destinoDepartamento: '',
    fechaInicio: '',
    fechaFin: '',
    rubroPresupuestal: '',
    prioridad: 'MEDIA',
    requiereTiquetes: true,
    aceptaHabeasData: false,
  };
}

/**
 * Sanea el objeto de la comisión: normaliza las tildes (conservando la
 * letra base, p. ej. `gestión` → `gestion`), reemplaza `ñ` → `n`, elimina
 * caracteres especiales, colapsa espacios múltiples y recorta hasta 250
 * caracteres. Espejo de `sanitizeObjetoComision` del backend.
 *
 * No recorta espacios finales en tiempo de escritura para preservar la
 * separación entre palabras al digitar; el recorte definitivo se aplica
 * al construir el payload (`mapearARequestCreacion`).
 *
 * @example sanitizeObjetoComision('Comisión de gestión @#$%') // 'Comision de gestion '
 */
export function sanitizeObjetoComision(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/ {2,}/g, ' ')
    .slice(0, 250);
}

/**
 * Construye el nombre completo del comisionado a partir de sus nombres y apellidos.
 */
export function formatearNombreComisionado(comisionado: Comisionado): string {
  return [comisionado.primer_nombre, comisionado.segundo_nombre, comisionado.primer_apellido, comisionado.segundo_apellido]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Calcula los días de comisión (inclusive) entre dos fechas ISO (yyyy-mm-dd).
 */
export function calcularDiasComision(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0;
  const ini = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return 0;
  const diff = Math.round((fin.getTime() - ini.getTime()) / 86_400_000);
  return Math.max(0, diff + 1);
}

/**
 * Valida el rango de fechas de la solicitud.
 * Devuelve un mensaje de error o `null` si las fechas son correctas.
 */
export function validarFechasSolicitud(fechaInicio: string, fechaFin: string): string | null {
  if (!fechaInicio || !fechaFin) return 'Debe indicar las fechas de inicio y fin de la comisión.';
  if (fechaFin < fechaInicio) return 'Debe ser posterior o igual a fecha inicio';
  return null;
}

/**
 * Mapea el formulario (snake_case, alineado a `CreateSolicitudDto`) al payload
 * `CreateSolicitudRequest` que consume `viaticosService.crearSolicitudComision`.
 */
export function mapearARequestCreacion(
  form: FormNuevaSolicitud,
  comisionado: Comisionado,
  creadoPorUsuarioId: string = USUARIO_ACTUAL_ID,
): CreateSolicitudRequest {
  const aceptaHabeasData = form.aceptaHabeasData || comisionado.autorizacion_habeas_data;
  return {
    comisionado_id: comisionado.id,
    destino_ciudad: form.destinoCiudad.trim(),
    destino_departamento: form.destinoDepartamento.trim(),
    fecha_inicio: form.fechaInicio,
    fecha_fin: form.fechaFin,
    objeto_comision: sanitizeObjetoComision(form.objetoComision).trim(),
    prioridad: form.prioridad as PrioridadSolicitud,
    rubro_presupuestal: form.rubroPresupuestal.trim(),
    requiere_tiquetes: form.requiereTiquetes,
    creado_por_usuario_id: creadoPorUsuarioId,
    acepta_habeas_data: aceptaHabeasData,
    ip_registro_habeas_data: aceptaHabeasData ? '127.0.0.1' : comisionado.ip_registro_habeas_data,
    documentos: [],
  };
}

export interface ConfigEstado {
  label: string;
  bg: string;
  text: string;
}

/**
 * Configuración de presentación (badge) para cada estado de solicitud.
 */
export const CONFIG_ESTADOS: Record<EstadoSolicitudViatico, ConfigEstado> = {
  BORRADOR: { label: 'Borrador', bg: 'bg-gray-100', text: 'text-gray-700' },
  SOLICITADO: { label: 'Solicitado', bg: 'bg-blue-100', text: 'text-blue-800' },
  APROBADO_JEFE: { label: 'Aprobado Jefe', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  APROBADO_TALENTO_HUMANO: { label: 'Aprobado TH', bg: 'bg-purple-100', text: 'text-purple-800' },
  RESOLUCION_EMITIDA: { label: 'Resolución Emitida', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  TIQUETES_COMPRADOS: { label: 'Tiquetes Emitidos', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  EN_COMISION: { label: 'En Comisión', bg: 'bg-amber-100', text: 'text-amber-800' },
  PENDIENTE_LEGALIZACION: { label: 'Por Legalizar', bg: 'bg-orange-100', text: 'text-orange-800' },
  LEGALIZADO: { label: 'Legalizado', bg: 'bg-green-100', text: 'text-green-800' },
  RECHAZADO: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
};

export function getConfigEstado(estado: string): ConfigEstado {
  return CONFIG_ESTADOS[estado as EstadoSolicitudViatico] || {
    label: estado,
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };
}

/**
 * Formatea un valor numérico como moneda colombiana.
 */
export function formatearMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}
