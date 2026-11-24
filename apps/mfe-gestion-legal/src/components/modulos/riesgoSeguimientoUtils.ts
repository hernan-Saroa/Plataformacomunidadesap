/**
 * Utilidades puras del seguimiento cuatrimestral de controles de riesgos (EFDS-2416).
 * Sin React: se prueban de forma aislada y las usan el formulario, la pestaña Controles y la exportación.
 */
import type {
  EstadoCorteSeguimiento,
  ResultadoSeguimientoControl,
  RiesgoSeguimientosAPI,
  SeguimientoControlAPI,
} from '../../../../services/api/legal.service';

export const RESULTADO_OPCIONES: { value: ResultadoSeguimientoControl; label: string }[] = [
  { value: 'APLICADO', label: 'Aplicado' },
  { value: 'APLICADO_PARCIALMENTE', label: 'Aplicado parcialmente' },
  { value: 'NO_APLICADO', label: 'No aplicado' },
];

export const RESULTADO_LABEL: Record<ResultadoSeguimientoControl, string> = {
  APLICADO: 'Aplicado',
  APLICADO_PARCIALMENTE: 'Aplicado parcialmente',
  NO_APLICADO: 'No aplicado',
};

export const ESTADO_CORTE_CONFIG: Record<EstadoCorteSeguimiento, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  REGISTRADO: { label: 'Registrado', className: 'bg-green-100 text-green-700 border-green-300' },
  VENCIDO: { label: 'Vencido', className: 'bg-red-100 text-red-700 border-red-300' },
};

export interface FormularioSeguimiento {
  cuatrimestre: number | null;
  fechaEjecucion: string;
  comentarios: string;
  resultado: ResultadoSeguimientoControl | '';
  efectividad: string;
}

export type ErroresSeguimiento = Partial<Record<keyof FormularioSeguimiento | 'evidencias', string>>;

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i + 1).toLowerCase() : '';
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date (evita el corrimiento de un día por zona horaria). */
export function formatearFechaISO(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

export function validarEvidenciasNuevas(
  archivos: { name: string; size: number }[],
  maxMb: number,
  extensiones: string[],
): string | undefined {
  for (const a of archivos) {
    if (!extensiones.includes(extensionDe(a.name))) {
      return `"${a.name}": tipo no permitido (use PDF, Word, Excel o imágenes)`;
    }
    if (a.size > maxMb * 1024 * 1024) {
      return `"${a.name}": supera el tamaño máximo de ${maxMb} MB`;
    }
  }
  return undefined;
}

export function validarFormularioSeguimiento(
  form: FormularioSeguimiento,
  ctx: { hoy: string; inicio: string | null; fin: string | null; archivos: { name: string; size: number }[]; maxMb: number; extensiones: string[] },
): ErroresSeguimiento {
  const errores: ErroresSeguimiento = {};

  if (!form.cuatrimestre) errores.cuatrimestre = 'Seleccione el cuatrimestre';

  if (!form.fechaEjecucion) {
    errores.fechaEjecucion = 'La fecha de ejecución es obligatoria';
  } else if (form.fechaEjecucion > ctx.hoy) {
    errores.fechaEjecucion = 'La fecha de ejecución no puede ser posterior a la fecha actual';
  } else if (ctx.inicio && ctx.fin && (form.fechaEjecucion < ctx.inicio || form.fechaEjecucion > ctx.fin)) {
    errores.fechaEjecucion = `Debe estar dentro del cuatrimestre (${formatearFechaISO(ctx.inicio)} a ${formatearFechaISO(ctx.fin)})`;
  }

  if (!form.comentarios.trim()) errores.comentarios = 'Los comentarios / observaciones son obligatorios';
  if (!form.resultado) errores.resultado = 'Seleccione el resultado del control';

  const efectividad = form.efectividad.trim() === '' ? NaN : Number(form.efectividad);
  if (!Number.isInteger(efectividad) || efectividad < 0 || efectividad > 100) {
    errores.efectividad = 'Ingrese un porcentaje entero entre 0 y 100';
  }

  const errorArchivos = validarEvidenciasNuevas(ctx.archivos, ctx.maxMb, ctx.extensiones);
  if (errorArchivos) errores.evidencias = errorArchivos;

  return errores;
}

export function construirFormDataSeguimiento(
  form: FormularioSeguimiento,
  archivos: File[],
  conservar?: string[],
): FormData {
  const fd = new FormData();
  fd.append('cuatrimestre', String(form.cuatrimestre ?? ''));
  fd.append('fechaEjecucion', form.fechaEjecucion);
  fd.append('comentarios', form.comentarios.trim());
  fd.append('resultado', form.resultado);
  fd.append('efectividad', form.efectividad.trim());
  if (conservar) fd.append('evidenciasConservar', JSON.stringify(conservar));
  archivos.forEach(a => fd.append('evidencias', a));
  return fd;
}

export function resumenSeguimiento(s: SeguimientoControlAPI): string {
  return `${s.cuatrimestreLabel} ${s.vigencia} · ${formatearFechaISO(s.fechaEjecucion)} · ${RESULTADO_LABEL[s.resultado]} · ${s.efectividad}% · ${s.responsable}`;
}

/** Sección de la ficha exportada con los seguimientos registrados de cada control. */
export function textoSeguimientosExportacion(vista: RiesgoSeguimientosAPI | null): string {
  if (!vista) return 'No se pudo consultar el seguimiento de controles';
  if (vista.controles.length === 0) return 'No hay controles para hacer seguimiento';

  return vista.controles.map((control, i) => {
    const propios = vista.historial.filter(s => s.controlId === control.controlId);
    const cabecera = `${i + 1}. ${control.descripcion} (efectividad actual: ${control.efectividad}%)`;
    if (propios.length === 0) return `${cabecera}\n     Sin seguimientos registrados`;
    const lineas = propios.map(s => {
      const evidencias = s.evidencias.length > 0 ? s.evidencias.map(e => e.nombre).join(', ') : 'sin evidencias';
      return `     - ${resumenSeguimiento(s)}\n       Comentarios: ${s.comentarios}\n       Evidencias: ${evidencias}`;
    });
    return `${cabecera}\n${lineas.join('\n')}`;
  }).join('\n');
}
