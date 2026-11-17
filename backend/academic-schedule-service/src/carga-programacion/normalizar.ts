import { DIAS_SEMANA, TIPOS_SESION, type DiaSemana, type TipoSesion } from '../horarios/franja-horaria.entity.js';
import { MODALIDADES_GRUPO, TIPOS_OFERTA, type ModalidadGrupo, type TipoOferta } from '../grupos/grupo.entity.js';

/**
 * Normalización de una fila de la plantilla de programación. Acepta lo que escribe una
 * persona en Excel (tildes, minúsculas, «8:00 a. m.», «OFERTA REGULAR», 15/02/2026) y lo
 * lleva a los valores del sistema. Lo que no reconoce NO lo adivina: es un error de la fila.
 */
export interface FilaCarga {
  /** Número de fila en el Excel: es lo que el reporte le muestra a la persona. */
  fila: number;
  codigoAsignatura?: unknown;
  grupo?: unknown;
  tipoOferta?: unknown;
  modalidad?: unknown;
  cupo?: unknown;
  cetap?: unknown;
  fechaInicio?: unknown;
  fechaFin?: unknown;
  dia?: unknown;
  horaInicio?: unknown;
  horaFin?: unknown;
  tipoSesion?: unknown;
  aula?: unknown;
  documentoDocente?: unknown;
}

export interface FilaNormalizada {
  fila: number;
  codigoAsignatura: string;
  grupo: number;
  tipoOferta: TipoOferta;
  modalidad: ModalidadGrupo | null;
  cupo: number | null;
  cetap: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  /** null = fila sin sesión (solo grupos virtuales o a distancia). */
  sesion: { dia: DiaSemana; horaInicio: string; horaFin: string; tipoSesion: TipoSesion | null; aula: string | null } | null;
  documentoDocente: string | null;
}

const texto = (v: unknown) => (v == null ? '' : String(v).trim());
const sinTildes = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clave = (v: unknown) => sinTildes(texto(v)).toUpperCase().replace(/\s+/g, ' ');

export function normalizarDia(v: unknown): DiaSemana | null {
  const d = clave(v);
  return (DIAS_SEMANA as readonly string[]).includes(d) ? (d as DiaSemana) : null;
}

/** «8:00», «08:00», «08:00:00», «8:00 a. m.», «2:30 p.m.» → «HH:MM». */
export function normalizarHora(v: unknown): string | null {
  const t = sinTildes(texto(v)).toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?(am|pm)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** «2026-02-15» o «15/02/2026» → «2026-02-15». Vacío → null. Inválida → undefined. */
export function normalizarFecha(v: unknown): string | null | undefined {
  const t = texto(v);
  if (!t) return null;
  let iso: string | null = null;
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (a) iso = `${a[1]}-${a[2]}-${a[3]}`;
  else if (b) iso = `${b[3]}-${b[2].padStart(2, '0')}-${b[1].padStart(2, '0')}`;
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? undefined : iso;
}

export function normalizarTipoOferta(v: unknown): TipoOferta | null | undefined {
  const t = clave(v).replace(/^OFERTA /, '');
  if (!t || t === 'REGULAR' || t === 'PERIODO REGULAR' || t === 'PERIODO_REGULAR') return null;
  if (t === 'INTERPERIODO') return 'interperiodo';
  if (t === 'CREDITOS VIRTUAL' || t === 'CREDITOS_VIRTUAL') return 'creditos_virtual';
  return (TIPOS_OFERTA as readonly string[]).includes(t.toLowerCase()) ? (t.toLowerCase() as TipoOferta) : undefined;
}

export function normalizarModalidad(v: unknown): ModalidadGrupo | null | undefined {
  const t = clave(v).toLowerCase();
  if (!t) return null;
  return (MODALIDADES_GRUPO as readonly string[]).includes(t) ? (t as ModalidadGrupo) : undefined;
}

export function normalizarTipoSesion(v: unknown): TipoSesion | null | undefined {
  const t = clave(v).toLowerCase();
  if (!t) return null;
  if (t === 'presencial') return 'presencial';
  if (t.startsWith('mediada') || t === 'virtual' || t === 'remota') return 'mediada_tecnologia';
  return (TIPOS_SESION as readonly string[]).includes(t) ? (t as TipoSesion) : undefined;
}

/** Normaliza una fila; devuelve sus errores (todos, no solo el primero). */
export function normalizarFila(f: FilaCarga): { fila?: FilaNormalizada; errores: string[] } {
  const errores: string[] = [];
  const codigoAsignatura = texto(f.codigoAsignatura).toUpperCase();
  if (!codigoAsignatura) errores.push('Falta el código de la asignatura.');
  const grupo = Number(texto(f.grupo));
  if (!texto(f.grupo)) errores.push('Falta el número de grupo.');
  else if (!Number.isInteger(grupo) || grupo < 1 || grupo > 999) errores.push(`El grupo «${texto(f.grupo)}» debe ser un número entero entre 1 y 999.`);
  const tipoOferta = normalizarTipoOferta(f.tipoOferta);
  if (tipoOferta === undefined) errores.push(`Tipo de oferta «${texto(f.tipoOferta)}» no reconocido (regular, interperiodo o creditos_virtual).`);
  const modalidad = normalizarModalidad(f.modalidad);
  if (modalidad === undefined) errores.push(`Modalidad «${texto(f.modalidad)}» no reconocida (presencial, virtual o distancia).`);
  let cupo: number | null = null;
  if (texto(f.cupo)) {
    cupo = Number(texto(f.cupo));
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 1000) errores.push(`El cupo «${texto(f.cupo)}» debe ser un entero entre 1 y 1000.`);
  }
  const fechaInicio = normalizarFecha(f.fechaInicio);
  const fechaFin = normalizarFecha(f.fechaFin);
  if (fechaInicio === undefined) errores.push(`Fecha de inicio «${texto(f.fechaInicio)}» inválida (AAAA-MM-DD o DD/MM/AAAA).`);
  if (fechaFin === undefined) errores.push(`Fecha de fin «${texto(f.fechaFin)}» inválida (AAAA-MM-DD o DD/MM/AAAA).`);
  if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) errores.push('Indique las dos fechas del grupo (inicio y fin) o ninguna.');
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) errores.push('La fecha de fin del grupo es anterior a la de inicio.');

  // Sesión: o vienen día y horas, o no viene nada (grupo sin horario: solo virtual/distancia).
  const hayAlgo = !!(texto(f.dia) || texto(f.horaInicio) || texto(f.horaFin));
  let sesion: FilaNormalizada['sesion'] = null;
  if (hayAlgo) {
    const dia = normalizarDia(f.dia);
    const horaInicio = normalizarHora(f.horaInicio);
    const horaFin = normalizarHora(f.horaFin);
    const tipoSesion = normalizarTipoSesion(f.tipoSesion);
    if (!dia) errores.push(`Día «${texto(f.dia)}» no reconocido (LUNES a DOMINGO).`);
    if (!horaInicio) errores.push(`Hora de inicio «${texto(f.horaInicio)}» inválida (HH:MM, 24 horas).`);
    if (!horaFin) errores.push(`Hora de fin «${texto(f.horaFin)}» inválida (HH:MM, 24 horas).`);
    if (tipoSesion === undefined) errores.push(`Tipo de sesión «${texto(f.tipoSesion)}» no reconocido (presencial o mediada_tecnologia).`);
    if (dia && horaInicio && horaFin && tipoSesion !== undefined) {
      sesion = { dia, horaInicio, horaFin, tipoSesion, aula: texto(f.aula) || null };
    }
  } else if (modalidad !== 'virtual' && modalidad !== 'distancia') {
    errores.push('Falta el día y las horas de la sesión (solo un grupo virtual o a distancia puede ir sin horario).');
  }
  const documentoDocente = texto(f.documentoDocente).replace(/\.0$/, '').replace(/[.\s]/g, '') || null;
  if (documentoDocente && !/^[0-9A-Za-z-]{3,20}$/.test(documentoDocente)) errores.push(`Documento del docente «${texto(f.documentoDocente)}» inválido.`);

  if (errores.length) return { errores };
  return {
    errores,
    fila: {
      fila: f.fila, codigoAsignatura, grupo, tipoOferta: tipoOferta ?? 'periodo_regular', modalidad: modalidad ?? null,
      cupo, cetap: texto(f.cetap).toUpperCase() || null, fechaInicio: fechaInicio ?? null, fechaFin: fechaFin ?? null,
      sesion, documentoDocente,
    },
  };
}
