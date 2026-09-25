import {
  Comisionado,
  CreateSolicitudRequest,
  DocumentoFormItem,
  EstadoSolicitudViatico,
  FormNuevaSolicitud,
  Geopolitica,
  RutaItinerario,
  TarifaTransporteTerminal,
} from '../types/viaticos';

/**
 * Ayuda mostrada bajo el campo de descripción del objeto de comisión.
 * Las restricciones responden a la integración con el SIIF.
 */
export const AYUDA_OBJETO_SIIF =
  'No se permiten caracteres especiales, tildes ni la letra ñ';

/**
 * Estado inicial del formulario de nueva solicitud.
 * Los campos se alinean con el DTO backend `CreateSolicitudDto` (camelCase).
 */
export function formInicialNuevaSolicitud(): FormNuevaSolicitud {
  return {
    documentoComisionado: '',
    comisionadoId: '',
    objetoComision: '',
    origenCiudad: '',
    origenDepartamento: '',
    destinoCiudad: '',
    destinoDepartamento: '',
    fechaInicio: hoyISO(),
    fechaFin: siguienteDiaISO(),
    rubroPresupuestal: '',
    numeroCdp: '',
    fechaCdp: '',
    prioridad: 'MEDIA',
    requiereTiquetes: true,
    montoViaticos: 0,
    montoGastosViaje: 0,
    diasComision: 1,
    salarioBasico: 0,
    costoEstimadoTiquete: 0,
    aceptaHabeasData: false,
    tipoComision: 'TERRESTRE',
    esInternacional: false,
    camposAdicionales: {},
    itinerario: [],
  };
}

/**
 * Sanea el objeto de la comisión: normaliza las tildes (conservando la letra
 * base, p. ej. `gestión` → `gestion`), reemplaza `ñ` → `n`, elimina caracteres
 * especiales, colapsa espacios múltiples y recorta hasta 250 caracteres.
 * Espejo de `sanitizeObjetoComision` del backend.
 *
 * No recorta espacios finales en tiempo de escritura para preservar la
 * separación entre palabras al digitar; el recorte definitivo se aplica al
 * construir el payload (`mapearARequestCreacion`).
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
 * Normaliza y limpia cadenas de texto para el archivo plano SIIF:
 * Remueve tildes, eñes, saltos de línea, retornos de carro, tabuladores y punto y coma.
 */
export function sanitizeTextoPlano(texto: string, maxLength = 250): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/;/g, ',')
    .replace(/[^a-zA-Z0-9\s\-.,_/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeParaSIIF(texto: string, maxLength = 250): string {
  return sanitizeTextoPlano(texto, maxLength);
}

/**
 * Limpia números de documento (cédulas/NIT):
 * Remueve puntos, comas, espacios y guiones para formato numérico limpio en SIIF.
 */
export function sanitizeDocumento(documento: string): string {
  if (!documento) return '';
  return documento.replace(/[^a-zA-Z0-9]/g, '').trim();
}

/**
 * Limpia nombres propios para SIIF:
 * Remueve tildes, convierte a mayúsculas limpias y elimina caracteres extraños.
 */
export function sanitizeNombre(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'N')
    .replace(/Ñ/g, 'N')
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Construye el nombre completo del comisionado a partir de sus nombres y apellidos.
 */
export function formatearNombreComisionado(comisionado: Comisionado): string {
  return [
    comisionado.primerNombre,
    comisionado.segundoNombre,
    comisionado.primerApellido,
    comisionado.segundoApellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Calcula los días de comisión entre dos fechas ISO (yyyy-mm-dd) según Formato GF-FO-023:
 * - Mismo día (sin pernocta): 0.5 días (medio día liquidado al 50%).
 * - Con pernocta: N noches + medio día (0.5) de retorno (ej. 01 al 02 = 1.5 días).
 */
export function calcularDiasComision(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0;
  const ini = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return 0;
  const diff = Math.round((fin.getTime() - ini.getTime()) / 86_400_000);
  if (diff <= 0) return 0.5;
  return diff + 0.5;
}

/**
 * Calcula los días de un tramo/ruta individual a partir de sus fechas.
 * Aplica la misma lógica que calcularDiasComision (mismo día = 0.5 días, con noche = N noches + 0.5 día retorno).
 */
export function calcularDiasRuta(fechaSalida: string, fechaLlegada: string): number {
  if (!fechaSalida || !fechaLlegada) return 0;
  const ini = new Date(`${fechaSalida}T00:00:00`);
  const fin = new Date(`${fechaLlegada}T00:00:00`);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return 0;
  const diff = Math.round((fin.getTime() - ini.getTime()) / 86_400_000);
  if (diff <= 0) return 0.5;
  return diff + 0.5;
}

/**
 * Formatea un horario militar HH:mm de forma legible.
 * Ej: '07:30' → '07:30 h'
 */
export function formatearHorarioMilitar(horario: string): string {
  if (!horario) return '—';
  return `${horario} h`;
}

/**
 * Valida que una cadena tenga formato horario militar HH:mm.
 */
export function esHorarioMilitarValido(horario: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(horario || '');
}

/**
 * Construye una representación legible de la ruta general a partir del itinerario,
 * mostrando la secuencia continua de ciudades (ej. "Bogotá → Medellín → Cali").
 */
export function construirRutaGeneral(itinerario: RutaItinerario[]): string {
  if (!itinerario || itinerario.length === 0) return '';
  const ciudadesSecuencia: string[] = [];
  for (const ruta of itinerario) {
    const orig = (ruta.origenCiudad || '').trim();
    const dest = (ruta.destinoCiudad || '').trim();
    if (orig && (ciudadesSecuencia.length === 0 || ciudadesSecuencia[ciudadesSecuencia.length - 1] !== orig)) {
      ciudadesSecuencia.push(orig);
    }
    if (dest) {
      ciudadesSecuencia.push(dest);
    }
  }
  return ciudadesSecuencia.join(' → ');
}

/**
 * Valida la coherencia de fechas y horas entre tramos consecutivos del itinerario.
 * Regla: el inicio de la siguiente ruta no puede ser inferior a la fecha del tramo anterior.
 * Si es el mismo día, la hora estimada no puede ser anterior a la del tramo anterior.
 */
export function validarSecuenciaItinerario(itinerario: RutaItinerario[]): {
  valida: boolean;
  error?: string;
  indexInvalido?: number;
} {
  if (!itinerario || itinerario.length <= 1) {
    return { valida: true };
  }

  for (let i = 1; i < itinerario.length; i++) {
    const prev = itinerario[i - 1];
    const curr = itinerario[i];

    if (curr.fechaSalida && prev.fechaSalida && curr.fechaSalida < prev.fechaSalida) {
      return {
        valida: false,
        error: `El inicio de la ruta ${i + 1} (${curr.fechaSalida}) no puede ser inferior a la fecha de salida del tramo anterior (${prev.fechaSalida}).`,
        indexInvalido: i,
      };
    }

    if (curr.fechaSalida && prev.fechaLlegada && curr.fechaSalida < prev.fechaLlegada) {
      return {
        valida: false,
        error: `El inicio de la ruta ${i + 1} (${curr.fechaSalida}) no puede ser inferior a la fecha de llegada del tramo anterior (${prev.fechaLlegada}).`,
        indexInvalido: i,
      };
    }

    if (
      curr.fechaSalida &&
      prev.fechaLlegada &&
      curr.fechaSalida === prev.fechaLlegada &&
      curr.horarioEstimadoMilitar &&
      prev.horarioEstimadoMilitar &&
      curr.horarioEstimadoMilitar < prev.horarioEstimadoMilitar
    ) {
      return {
        valida: false,
        error: `Para el mismo día (${curr.fechaSalida}), la hora estimada del tramo ${i + 1} (${curr.horarioEstimadoMilitar}) no puede ser anterior a la del tramo previo (${prev.horarioEstimadoMilitar}).`,
        indexInvalido: i,
      };
    }

    if (curr.fechaSalida && curr.fechaLlegada && curr.fechaLlegada < curr.fechaSalida) {
      return {
        valida: false,
        error: `La fecha de llegada del tramo ${i + 1} (${curr.fechaLlegada}) no puede ser inferior a su fecha de salida (${curr.fechaSalida}).`,
        indexInvalido: i,
      };
    }
  }

  return { valida: true };
}

/**
 * Sincroniza los campos globales del formulario a partir del itinerario:
 * - fechaInicio: fecha de salida de la PRIMERA ruta.
 * - fechaFin: fecha de llegada de la ÚLTIMA ruta.
 * - origen/destino: origen del primer tramo y destino del último tramo.
 * - rutaGeneral: descripción secuencial de la ruta general.
 * - horaEstimadaGeneral: rango consolidado de horas estimadas (primer tramo a último tramo).
 * - diasComision: suma de diasRuta o cálculo entre fechaInicio y fechaFin.
 */
export function sincronizarItinerarioFormulario(
  itinerario: RutaItinerario[],
): {
  fechaInicio: string;
  fechaFin: string;
  diasComision: number;
  origenCiudad: string;
  origenDepartamento: string;
  destinoCiudad: string;
  destinoDepartamento: string;
  rutaGeneral: string;
  horaEstimadaSalida: string;
  horaEstimadaLlegada: string;
  horaEstimadaGeneral: string;
  transporteTerminalesAereos: number;
  tieneTransporteAereo: boolean;
} {
  if (itinerario.length === 0) {
    return {
      fechaInicio: hoyISO(),
      fechaFin: siguienteDiaISO(),
      diasComision: 1,
      origenCiudad: '',
      origenDepartamento: '',
      destinoCiudad: '',
      destinoDepartamento: '',
      rutaGeneral: '',
      horaEstimadaSalida: '',
      horaEstimadaLlegada: '',
      horaEstimadaGeneral: '',
      transporteTerminalesAereos: 0,
      tieneTransporteAereo: false,
    };
  }

  // La fecha inicio es del primer tramo, y la fecha fin es la del último tramo
  const primeraRuta = itinerario[0];
  const ultimaRuta = itinerario[itinerario.length - 1];

  const fInicio = primeraRuta.fechaSalida || hoyISO();
  const fFin = ultimaRuta.fechaLlegada || primeraRuta.fechaLlegada || siguienteDiaISO();

  let diasTotal = 0;
  let totalTerminalesAereos = 0;
  let tieneAereo = false;

  for (const ruta of itinerario) {
    diasTotal += ruta.diasRuta || calcularDiasRuta(ruta.fechaSalida, ruta.fechaLlegada);

    if (ruta.tipoTransporte === 'AEREO') {
      tieneAereo = true;
      const tarifa = calcularTarifaTerminalAereoRuta(
        ruta.destinoDepartamento,
        ruta.destinoCiudad,
        ruta.tipoTrayecto,
        undefined,
        ruta.destinoDepartamentoId,
      );
      totalTerminalesAereos += tarifa.totalTramo;
    }
  }

  const horaSalida = primeraRuta.horarioEstimadoMilitar || '';
  const horaLlegada = ultimaRuta.horarioEstimadoMilitar || '';

  let horaGeneral = '';
  if (itinerario.length === 1) {
    horaGeneral = horaSalida ? formatearHorarioMilitar(horaSalida) : '';
  } else if (horaSalida && horaLlegada) {
    horaGeneral = `${formatearHorarioMilitar(horaSalida)} → ${formatearHorarioMilitar(horaLlegada)}`;
  } else if (horaSalida) {
    horaGeneral = formatearHorarioMilitar(horaSalida);
  } else if (horaLlegada) {
    horaGeneral = formatearHorarioMilitar(horaLlegada);
  }

  // ── Detección de viaje de ida y vuelta ───────────────────────────────────
  // Si hay más de un tramo y el destino del último tramo coincide con el
  // origen del primero, significa que el comisionado ya regresó al punto de
  // partida. En ese caso el "destino" de la comisión es el origen del último
  // tramo (el punto más alejado al que se viajó antes del retorno).
  const normalizarCiudad = (txt?: string) =>
    (txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const esViajeIdaVuelta =
    itinerario.length > 1 &&
    normalizarCiudad(ultimaRuta.destinoCiudad) === normalizarCiudad(primeraRuta.origenCiudad) &&
    ultimaRuta.destinoCiudad !== '';

  const destinoCiudadFinal = esViajeIdaVuelta
    ? ultimaRuta.origenCiudad || ''
    : ultimaRuta.destinoCiudad || '';
  const destinoDepartamentoFinal = esViajeIdaVuelta
    ? ultimaRuta.origenDepartamento || ''
    : ultimaRuta.destinoDepartamento || '';

  return {
    fechaInicio: fInicio,
    fechaFin: fFin,
    diasComision: diasTotal > 0 ? diasTotal : calcularDiasComision(fInicio, fFin),
    origenCiudad: primeraRuta.origenCiudad || '',
    origenDepartamento: primeraRuta.origenDepartamento || '',
    destinoCiudad: destinoCiudadFinal,
    destinoDepartamento: destinoDepartamentoFinal,
    rutaGeneral: construirRutaGeneral(itinerario),
    horaEstimadaSalida: horaSalida,
    horaEstimadaLlegada: horaLlegada,
    horaEstimadaGeneral: horaGeneral,
    transporteTerminalesAereos: totalTerminalesAereos,
    tieneTransporteAereo: tieneAereo,
  };
}

/**
 * Formatea el conteo de días de forma amigable al usuario.
 * Ejemplos:
 *  - 1.5 -> "1 día y medio"
 *  - 2.5 -> "2 días y medio"
 *  - 0.5 -> "Medio día"
 *  - 1   -> "1 día"
 *  - 3   -> "3 días"
 */
export function formatearDiasComision(dias: number): string {
  if (dias === null || dias === undefined || isNaN(dias) || dias <= 0) {
    return '0 días';
  }
  const entero = Math.floor(dias);
  const decimal = Math.round((dias - entero) * 10) / 10;

  if (decimal === 0.5) {
    if (entero === 0) return 'Medio día';
    if (entero === 1) return '1 día y medio';
    return `${entero} días y medio`;
  }

  if (dias === 1) return '1 día';
  return `${dias} días`;
}

import {
  esDiaHabil as esDiaHabilStd,
  contarDiasHabiles as contarDiasHabilesStd,
  validarAnticipacionRadicacion as validarAnticipacionRadicacionStd,
} from './diasHabilesUtils';

export * from './diasHabilesUtils';

export function esDiaHabil(
  fecha: Date | string,
  festivos?: ReadonlySet<string> | string[],
): boolean {
  return esDiaHabilStd(fecha, festivos);
}

export function contarDiasHabilesEntre(
  fechaInicio: Date | string,
  fechaFin: Date | string,
  festivos?: ReadonlySet<string> | string[],
): number {
  return contarDiasHabilesStd(fechaInicio, fechaFin, festivos, { modo: 'rango_completo' });
}

export function validarAnticipacionRadicacion(
  fechaInicio: string,
  festivos?: ReadonlySet<string> | string[],
) {
  return validarAnticipacionRadicacionStd(fechaInicio, festivos);
}

/**
 * Fecha de hoy en formato yyyy-mm-dd (hora local).
 */
export function hoyISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

/**
 * Fecha del día siguiente en formato yyyy-mm-dd (hora local).
 * Se usa como fecha fin por defecto en el formulario de nueva solicitud.
 */
export function siguienteDiaISO(): string {
  const dia = new Date();
  dia.setDate(dia.getDate() + 1);
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
}

/**
 * Valida el rango de fechas de la solicitud.
 * 1. Deben estar definidas.
 * 2. La fecha de inicio no puede ser anterior a hoy.
 * 3. La fecha fin no puede ser anterior a la fecha inicio.
 *
 * Devuelve el primer error encontrado o `null` si las fechas son correctas.
 */
export function validarFechasSolicitud(fechaInicio: string, fechaFin: string): string | null {
  if (!fechaInicio || !fechaFin) return 'Debe indicar las fechas de inicio y fin de la comisión.';
  if (fechaInicio < hoyISO()) return 'La fecha de inicio no puede ser anterior a hoy.';
  if (fechaFin < fechaInicio) return 'Debe ser posterior o igual a fecha inicio';
  return null;
}

/**
 * Mapea el formulario al payload `CreateSolicitudRequest` (camelCase) que
 * consume `viaticosService.crearSolicitudComision`, alineado con el DTO
 * backend `CreateSolicitudDto`.
 */
export function mapearARequestCreacion(
  form: FormNuevaSolicitud,
  comisionado: Comisionado,
  creadoPorUsuarioId: string,
  modoBorrador = false,
  tipoComision = 'TERRESTRE',
): CreateSolicitudRequest {
  const aceptaHabeasData = form.aceptaHabeasData || comisionado.autorizacionHabeasData;
  const documentos: DocumentoFormItem[] = (form.documentos || []).map((d) => ({
    tipoDocumento: d.tipoDocumento,
    nombreArchivoOriginal: d.nombreArchivoOriginal,
    nombreArchivoSeguro: d.nombreArchivoSeguro,
    urlRepositorio: d.urlRepositorio,
    tipoMime: d.tipoMime,
  }));

  // Determinar tipo de comisión según los transportes del itinerario
  const tipoComisionCalculado = (() => {
    if (form.esInternacional) return 'INTERNACIONAL';
    const tramos = form.itinerario || [];
    const tieneAereo = tramos.some((r) => r.tipoTransporte === 'AEREO');
    const tieneTerrestre = tramos.some((r) => r.tipoTransporte === 'TERRESTRE');
    if (tieneAereo && tieneTerrestre) return 'MIXTO';
    if (tieneAereo) return 'AEREO';
    if (tieneTerrestre) return 'TERRESTRE';
    // fallback al tipoComision pasado si no hay itinerario
    return ['TERRESTRE', 'AEREO', 'MIXTO', 'INTERNACIONAL', 'ACTO_ADMINISTRATIVO'].includes(tipoComision)
      ? tipoComision
      : 'TERRESTRE';
  })();

  return {
    comisionadoId: comisionado.id,
    destinoCiudad: form.destinoCiudad.trim(),
    destinoDepartamento: form.destinoDepartamento.trim(),
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
    objetoComision: sanitizeObjetoComision(form.objetoComision).trim(),
    prioridad: form.prioridad,
    rubroPresupuestal: form.rubroPresupuestal.trim(),
    numeroCdp: form.numeroCdp?.trim() || undefined,
    fechaCdp: form.fechaCdp?.trim() || undefined,
    requiereTiquetes: form.requiereTiquetes,
    montoViaticos: form.montoViaticos,
    montoGastosViaje: form.montoGastosViaje,
    diasComision: form.diasComision,
    salarioBasico: form.salarioBasico ?? 0,
    costoEstimadoTiquete: form.costoEstimadoTiquete ?? 0,
    creadoPorUsuarioId: creadoPorUsuarioId,
    aceptaHabeasData: aceptaHabeasData,
    ipRegistroHabeasData: aceptaHabeasData ? '127.0.0.1' : comisionado.ipRegistroHabeasData,
    modoBorrador,
    tipoComision: tipoComisionCalculado,
    esInternacional: Boolean(form.esInternacional),
    documentos,
    camposAdicionales: form.camposAdicionales ?? {},
    itinerario: (form.itinerario || []).map((r) => {
      // Excluir campos de UI que el backend no acepta
      const {
        guardada,
        origenDepartamentoId,
        destinoDepartamentoId,
        horaEstimadaSalida,
        horaEstimadaLlegada,
        tarifaTerminalAereo,
        ...cleanRuta
      } = r;
      return cleanRuta;
    }),
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
  PENDIENTE: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  SOLICITADO: { label: 'Solicitado', bg: 'bg-blue-100', text: 'text-blue-800' },
  APROBADO_JEFE: { label: 'Aprobado Jefe', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  APROBADO_TALENTO_HUMANO: { label: 'Aprobado TH', bg: 'bg-purple-100', text: 'text-purple-800' },
  RESOLUCION_EMITIDA: { label: 'Resolución Emitida', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  TIQUETES_COMPRADOS: { label: 'Tiquetes Emitidos', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  EN_COMISION: { label: 'En Comisión', bg: 'bg-amber-100', text: 'text-amber-800' },
  PENDIENTE_LEGALIZACION: { label: 'Por Legalizar', bg: 'bg-orange-100', text: 'text-orange-800' },
  LEGALIZADO: { label: 'Legalizado', bg: 'bg-green-100', text: 'text-green-800' },
  RECHAZADO: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-800' },
  RADICADA: { label: 'Radicada', bg: 'bg-slate-100', text: 'text-slate-700' },
  EXTEMPORANEA: { label: 'Extemporánea', bg: 'bg-red-100', text: 'text-red-700' },
  DEVUELTA: {
    label: 'Devuelta (subsanar)',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
  },
  SOLICITADA_SIIF: {
    label: 'Solicitada SIIF',
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-800',
  },
  VERIFICADA: {
    label: 'Verificada',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
  },
  EN_VERIFICACION: {
    label: 'En Verificación',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
  },
  AUTORIZACION_DIRECCION: {
    label: 'Aut. Dirección Nacional',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
  },
  EN_AUTORIZACION: {
    label: 'En Autorización',
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
  },
  AUTORIZADA: {
    label: 'Autorizada',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: 'bg-rose-100',
    text: 'text-rose-800',
  },
  EN_PRESUPUESTO: {
    label: 'En Presupuesto',
    bg: 'bg-teal-100',
    text: 'text-teal-800',
  },
  COMPROMETIDA: {
    label: 'Comprometida (RP)',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-800 dark:text-indigo-300',
  },
  OBLIGADA: {
    label: 'Obligada (Lista para Pago)',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
};


export function getConfigEstado(estado: string): ConfigEstado {
  return CONFIG_ESTADOS[estado as EstadoSolicitudViatico] || {
    label: estado,
    bg: 'bg-gray-100',
    text: 'text-gray-800',
  };
}

/**
 * Formatea un valor numérico o numérico-string como moneda colombiana.
 */
export function formatearMoneda(valor: number | string): string {
  const num = typeof valor === 'string' ? Number(valor) : valor;
  if (!Number.isFinite(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-CO')}`;
}

/**
 * Conserva únicamente dígitos (para campos numéricos que no permiten texto).
 */
export function soloNumeros(valor: string): string {
  return valor.replace(/[^0-9]/g, '');
}

/**
 * Infiere el tipo MIME de un archivo a partir de su nombre.
 * Solo se reconoce PDF explícitamente; cualquier otra extensión
 * retorna `application/octet-stream` (genérico).
 */
export function inferirTipoMime(nombreArchivo: string): string {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
  if (extension === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

/**
 * Indica si un tipo MIME corresponde a un PDF válido.
 */
export function esPdfMime(tipoMime: string): boolean {
  if (!tipoMime) return false;
  const mime = tipoMime.toLowerCase();
  return mime === 'application/pdf' || mime === 'pdf' || mime.endsWith('/pdf');
}

/**
 * Catálogo de departamentos de Colombia con sus ciudades principales.
 * Se usa para los selectores dependientes departamento → ciudad.
 */
export const DEPARTAMENTOS_COLOMBIA: Record<string, string[]> = {
  'Amazonas': ['Leticia', 'Puerto Nariño'],
  'Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Apartadó', 'Turbo'],
  'Arauca': ['Arauca', 'Saravena'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Sabanagrande'],
  'Bogotá D.C.': ['Bogotá D.C.'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
  'Caldas': ['Manizales', 'Villamaría', 'Chinchiná'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán'],
  'Casanare': ['Yopal', 'Aguazul'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
  'Cesar': ['Valledupar', 'Aguachica', 'Codazzi'],
  'Chocó': ['Quibdó', 'Istmina'],
  'Córdoba': ['Montería', 'Cereté', 'Sahagún'],
  'Cundinamarca': ['Soacha', 'Zipaquirá', 'Chía', 'Facatativá', 'Girardot', 'Fusagasugá', 'Mosquera', 'Madrid', 'Cajicá'],
  'Guainía': ['Inírida'],
  'Guaviare': ['San José del Guaviare'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
  'Putumayo': ['Mocoa', 'Puerto Asís'],
  'Quindío': ['Armenia', 'Calarcá'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar'],
  'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Yumbo', 'Buga'],
  'Vaupés': ['Mitú'],
  'Vichada': ['Puerto Carreño'],
};

/**
 * Códigos DANE oficiales de cada departamento. Se usan en el catálogo estático
 * para que coincida con `auth.geopolitica.cod_departamento` (p. ej. Risaralda=66)
 * y el llamado de ciudades use el mismo código que la BD real.
 */
export const COD_DANE_DEPARTAMENTOS: Record<string, number> = {
  Amazonas: 91,
  Antioquia: 5,
  Arauca: 81,
  'Atlántico': 8,
  'Bogotá D.C.': 11,
  Bolívar: 13,
  Boyacá: 15,
  Caldas: 17,
  Caquetá: 18,
  Casanare: 85,
  Cauca: 19,
  Cesar: 20,
  Chocó: 27,
  Córdoba: 23,
  Cundinamarca: 25,
  Guainía: 94,
  Guaviare: 95,
  Huila: 41,
  'La Guajira': 44,
  Magdalena: 47,
  Meta: 50,
  Nariño: 52,
  'Norte de Santander': 54,
  Putumayo: 86,
  Quindío: 63,
  Risaralda: 66,
  'San Andrés y Providencia': 88,
  Santander: 68,
  Sucre: 70,
  Tolima: 73,
  'Valle del Cauca': 76,
  Vaupés: 97,
  Vichada: 99,
};

/**
 * Lista ordenada de departamentos para los selectores.
 */
export function departamentosDisponibles(): string[] {
  return Object.keys(DEPARTAMENTOS_COLOMBIA).sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

/**
 * Ciudades de un departamento dado (vacío si el departamento no existe).
 */
export function ciudadesDeDepartamento(departamento: string): string[] {
  if (!departamento) return [];
  if (DEPARTAMENTOS_COLOMBIA[departamento]) {
    return DEPARTAMENTOS_COLOMBIA[departamento];
  }
  const clean = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  const target = clean(departamento);
  const foundKey = Object.keys(DEPARTAMENTOS_COLOMBIA).find(
    (k) => clean(k) === target,
  );
  return foundKey ? DEPARTAMENTOS_COLOMBIA[foundKey] : [];
}

/**
 * Construye una lista plana de `Geopolitica` a partir del catálogo estático.
 * Se usa como respaldo cuando el microservicio de auth (auth.geopolitica) no
 * está disponible; asigna identificadores sintéticos estables.
 */
export function fallbackGeopolitica(): Geopolitica[] {
  const lista: Geopolitica[] = [];
  let id = 1;
  departamentosDisponibles().forEach((depto) => {
    // Código DANE real del departamento (66 = Risaralda, 5 = Antioquia, …). Se
    // usa como codDepartamento para que el respaldo coincida con auth.geopolitica
    // y el llamado de ciudades sea estable (no depender de un id sintético).
    const codDane = COD_DANE_DEPARTAMENTOS[depto] ?? id;
    const deptoId = id++;
    lista.push({
      idGeopolitica: deptoId,
      codGeopolitica: String(codDane),
      codDepartamento: codDane,
      nomDivGeopolitica: depto,
      tipDivision: 'DEPTO',
    });
    (DEPARTAMENTOS_COLOMBIA[depto] || []).forEach((ciudad) => {
      lista.push({
        idGeopolitica: id++,
        codGeopolitica: String(codDane),
        codDepartamento: codDane,
        nomDivGeopolitica: ciudad,
        tipDivision: 'CIUDAD',
        idPadre: deptoId,
      });
    });
  });
  return lista;
}

/**
 * Tarifas estándar de transporte a terminales aéreos según resolución GF-FO-023.
 */
export const TARIFAS_TERMINALES_AEREAS_DEFAULT: Array<{
  departamento: string;
  departamentoId?: number;
  ciudadAeropuerto: string;
  valorMaximo: number;
}> = [
  { departamento: 'Antioquia', departamentoId: 5, ciudadAeropuerto: 'ANTIOQUIA (Rionegro)', valorMaximo: 162634 },
  { departamento: 'Atlántico', departamentoId: 8, ciudadAeropuerto: 'ATLANTICO (Soledad)', valorMaximo: 130704 },
  { departamento: 'Córdoba', departamentoId: 23, ciudadAeropuerto: 'CORDOBA (Los Garzones)', valorMaximo: 118731 },
  { departamento: 'Magdalena', departamentoId: 47, ciudadAeropuerto: 'MAGDALENA (Santa Marta)', valorMaximo: 129708 },
  { departamento: 'Nariño', departamentoId: 52, ciudadAeropuerto: 'NARIÑO (Chachagui)', valorMaximo: 186581 },
  { departamento: 'Otros', departamentoId: undefined, ciudadAeropuerto: 'Otros', valorMaximo: 50689 },
  { departamento: 'Putumayo', departamentoId: 86, ciudadAeropuerto: 'PUTUMAYO (Puerto Asís)', valorMaximo: 93788 },
  { departamento: 'Quindío', departamentoId: 63, ciudadAeropuerto: 'QUNDIO (La Tebaida)', valorMaximo: 186581 },
  { departamento: 'Santander', departamentoId: 68, ciudadAeropuerto: 'SANTANDER (Lebrija)', valorMaximo: 186581 },
  { departamento: 'Sucre', departamentoId: 70, ciudadAeropuerto: 'SUCRE (Corozal)', valorMaximo: 162634 },
  { departamento: 'Valle del Cauca', departamentoId: 76, ciudadAeropuerto: 'VALLE DEL CAUCA (Palmira)', valorMaximo: 186581 },
];

/**
 * Calcula la tarifa de transporte a terminal aérea aplicable para una ruta dada.
 * Prioriza la coincidencia por departamentoId (código DANE de geopolítica en auth),
 * luego por nombre de departamento, ciudad, y finalmente Otros ($50.689).
 */
export function calcularTarifaTerminalAereoRuta(
  departamento?: string,
  ciudad?: string,
  tipoTrayecto?: 'SOLO_IDA' | 'IDA_Y_VUELTA' | string,
  tarifasPersonalizadas?: TarifaTransporteTerminal[],
  departamentoId?: number | null,
): {
  departamento: string;
  ciudadAeropuerto: string;
  valorMaximoPorTrayecto: number;
  factorTrayecto: number;
  totalTramo: number;
} {
  const norm = (s?: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const deptoNorm = norm(departamento);
  const ciudadNorm = norm(ciudad);

  const lista = (tarifasPersonalizadas && tarifasPersonalizadas.length > 0)
    ? (tarifasPersonalizadas as any[])
    : TARIFAS_TERMINALES_AEREAS_DEFAULT;

  let match: any = undefined;

  // 1. Coincidencia prioritaria por departamentoId (código DANE geopolítica)
  if (departamentoId != null) {
    match = lista.find((t: any) => {
      const tId = t.departamentoId ?? t.departamento_id;
      return tId != null && Number(tId) === Number(departamentoId);
    });
  }

  // 2. Coincidencia por nombre de departamento o ciudad si no hubo match por ID
  if (!match) {
    match = lista.find((t: any) => {
      const tDepto = norm(t.departamento || t.ciudad);
      const tCiudad = norm(t.ciudad);
      const tAero = norm(t.ciudadAeropuerto);
      if (tDepto === 'otros' || tCiudad === 'otros') return false;

      if (deptoNorm && (tDepto === deptoNorm || tDepto.includes(deptoNorm) || deptoNorm.includes(tDepto))) {
        return true;
      }
      if (ciudadNorm && (tDepto.includes(ciudadNorm) || tCiudad.includes(ciudadNorm) || tAero.includes(ciudadNorm))) {
        return true;
      }
      return false;
    });
  }

  const otros: any = lista.find((t: any) => norm(t.departamento || t.ciudad).includes('otros'));
  const valorUnitario = match
    ? Number(match.valorMaximoTrayecto ?? match.valorMaximo ?? 50689)
    : (otros ? Number(otros.valorMaximoTrayecto ?? otros.valorMaximo ?? 50689) : 50689);
  const factor = tipoTrayecto === 'IDA_Y_VUELTA' ? 2 : 1;

  return {
    departamento: match ? (match.departamento || match.ciudad) : 'Otros',
    ciudadAeropuerto: match ? match.ciudadAeropuerto : 'Otros',
    valorMaximoPorTrayecto: valorUnitario,
    factorTrayecto: factor,
    totalTramo: valorUnitario * factor,
  };
}
