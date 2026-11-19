/**
 * Carga masiva de soportes de una carpeta del RUND (HU 2425).
 * Valida el nombre de cada archivo contra la nomenclatura de CODIFICACION.xlsx, decide a qué soporte va y qué
 * datos del nombre (año, folio, universidad o entidad, idioma y nivel…) quedan como descripción del soporte.
 * Todo es puro: la simulación («qué se cargaría») y la carga real usan el mismo plan.
 */

import { RUND_MAX_ARCHIVO_BYTES, RUND_MAX_ARCHIVO_MB } from './rundEvidenceRules';

export type GrupoCarga = {
  tipoSoporte: string;
  /** Archivos vigentes del soporte. */
  nombresArchivo: string[];
  /** Títulos registrados (solo diplomas de nivel), precargado primero. */
  titulos?: string[];
  /** El usuario puede cargar en este soporte (permiso y dato previo, igual que la tabla). */
  puedeCargar: boolean;
};

export type EstadoPlan = 'valido' | 'rechazado' | 'advertencia';

export type ArchivoPlan = {
  nombre: string;
  estado: EstadoPlan;
  /** Por qué no se carga (rechazado o advertencia). */
  motivo?: string;
  tipoSoporte?: string;
  /** Etiqueta legible del soporte destino. */
  soporte?: string;
  /** Posición dentro del soporte (1.1.2 → 2). */
  numero?: number;
  /** Título que se registra al cargar, cuando el docente aún no tiene el título de esa posición. */
  tituloNuevo?: string;
  /** Título ya registrado al que quedará asociado el archivo. */
  tituloExistente?: string;
  /** Datos extraídos del nombre; se guardan como descripción del soporte. */
  datos: string[];
};

type Analisis =
  | { ok: true; tipoSoporte: string; soporte: string; numero?: number; nivelNombre?: string; entidad?: string; datos: string[] }
  | { ok: false; motivo: string };

/** Carpetas cuya nomenclatura no se exige (08 y 09): se aceptan con cualquier nombre. */
export const CARPETAS_SIN_NOMENCLATURA_OBLIGATORIA = ['ESTUDIO_HOJA_VIDA', 'DOCUMENTOS_NO_VALIDOS'];

const NIVELES: Record<string, { palabra: string; tipoSoporte: string; nombre: string }> = {
  '0': { palabra: 'BACHILLER', tipoSoporte: 'diploma_bachiller', nombre: 'Bachiller' },
  '1': { palabra: 'PREGRADO', tipoSoporte: 'diploma_pregrado', nombre: 'Pregrado' },
  '2': { palabra: 'ESPECIALIZACION', tipoSoporte: 'diploma_especializacion', nombre: 'Especialización' },
  '3': { palabra: 'MAGISTER', tipoSoporte: 'diploma_maestria', nombre: 'Maestría' },
  '4': { palabra: 'DOCTORADO', tipoSoporte: 'diploma_doctorado', nombre: 'Doctorado' },
  '5': { palabra: 'POSDOCTORADO', tipoSoporte: 'certificado_posdoctoral', nombre: 'Posdoctorado' },
};

/** Mayúsculas y sin tildes, pero conserva la Ñ (NARIÑO) para mostrarla. */
const normalizar = (valor: string) => valor.normalize('NFC').toUpperCase().replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I').replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U');
const legible = (valor: string) => valor.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
const capitalizado = (valor: string) => legible(valor).toLowerCase().replace(/(^|\s)(\S)/g, (_t, espacio: string, letra: string) => espacio + letra.toUpperCase());

export const sinExtension = (nombre: string) => nombre.replace(/\.[^./\\]+$/, '');
export const esPdf = (nombre: string) => /\.pdf$/i.test(nombre);

const anioValido = (valor: string) => {
  const anio = Number(valor);
  return valor.length === 4 && anio >= 1950 && anio <= new Date().getFullYear() + 1;
};

const CONCEPTOS_NOVEDAD: Array<{ patron: RegExp; tipoSoporte: string; soporte: string }> = [
  { patron: /ESCALAFON|ASCENSO|RECATEGORIZ|CATEGORIA/, tipoSoporte: 'resolucion_escalafon', soporte: 'Resolución de escalafón' },
  { patron: /PUNTO|SALARIAL|SALARIO|BONIFIC/, tipoSoporte: 'resolucion_puntaje_salarial', soporte: 'Resolución de puntaje salarial' },
  { patron: /DEDICACION/, tipoSoporte: 'acto_administrativo_dedicacion', soporte: 'Acto administrativo de dedicación' },
  { patron: /CONVOCATORIA/, tipoSoporte: 'resolucion_convocatoria', soporte: 'Resolución de convocatoria' },
  { patron: /CONTRATO/, tipoSoporte: 'contrato', soporte: 'Contrato' },
  { patron: /TERRITORIAL|ADSCRIPCION|TRASLADO/, tipoSoporte: 'acto_adscripcion_territorial', soporte: 'Acto de adscripción territorial' },
  { patron: /VINCULACION|NOMBRAMIENTO|POSESION/, tipoSoporte: 'acto_administrativo_vinculacion', soporte: 'Acto administrativo de vinculación' },
];

function analizar(bloque: string, nombreArchivo: string): Analisis {
  const nombre = sinExtension(nombreArchivo);
  const nombreNormal = normalizar(nombre);
  const falla = (motivo: string): Analisis => ({ ok: false, motivo });

  if (bloque === 'DOCUMENTOS_NO_VALIDOS') return { ok: true, tipoSoporte: 'documento_no_valido', soporte: 'Documento no válido', datos: [] };
  if (bloque === 'ESTUDIO_HOJA_VIDA') {
    const tipo = /^ESTUDIO_HV/.test(nombreNormal) ? 'Estudio de hoja de vida' : /^EVALUACION/.test(nombreNormal) ? 'Evaluación docente' : /^MICROCURRICULO/.test(nombreNormal) ? 'Microcurrículo' : null;
    return { ok: true, tipoSoporte: 'estudio_hoja_vida', soporte: 'Estudio hoja de vida', datos: tipo ? [tipo] : [] };
  }

  if (bloque === 'IDENTIDAD') {
    const cedula = /^(CC|CE)_(\d{4,20})$/.exec(nombreNormal);
    if (cedula) return { ok: true, tipoSoporte: 'documento_identidad', soporte: 'Documento de identidad', datos: [cedula[1] === 'CC' ? 'Cédula de ciudadanía' : 'Cédula de extranjería', `N° ${cedula[2]}`] };
    if (/^FOTO(_|$)/.test(nombreNormal)) return falla('La foto no es un soporte documental: se carga desde el panel de foto del docente.');
    const tarjeta = /^TP_([A-Z0-9]+)(?:_([A-Z0-9]+))?$/.exec(nombreNormal);
    if (tarjeta) return { ok: true, tipoSoporte: 'tarjeta_profesional', soporte: 'Tarjeta profesional', datos: tarjeta[2] ? [`Folio ${tarjeta[1]}`, `Tarjeta ${tarjeta[2]}`] : [`Tarjeta ${tarjeta[1]}`] };
    if (/^HV_[A-Z0-9_ÑÜ]+$/.test(nombreNormal)) return { ok: true, tipoSoporte: 'hoja_vida', soporte: 'Hoja de vida', datos: [] };
    return falla('No cumple la nomenclatura de 00. Datos básicos: CC_número, CE_número, TP_número, HV_NOMBRE_DOCENTE (FOTO_ se carga desde el panel de foto).');
  }

  if (bloque === 'FORMACION') {
    const coincide = /^1\.([0-5])\.(\d{1,2})_([A-Z]+)(_ADICIONAL)?(?:_(.+))?$/.exec(nombreNormal);
    if (!coincide) return falla('No cumple la nomenclatura de 01. Títulos: 1.1.1_PREGRADO_UNIVERSIDAD, 1.1.2_PREGRADO_ADICIONAL_UNIVERSIDAD, 1.2.1_ESPECIALIZACION_…, 1.3.1_MAGISTER_…, 1.4.1_DOCTORADO_…, 1.5.1_POSDOCTORADO_….');
    const [, digito, posicion, palabra, adicional, resto] = coincide;
    const nivel = NIVELES[digito];
    const numero = Number(posicion);
    if (numero < 1) return falla('El número de posición del título debe ser 1 o mayor (1.1.1, 1.1.2…).');
    if (palabra !== nivel.palabra) return falla(`El código 1.${digito} corresponde a ${nivel.palabra}, pero el nombre dice ${palabra}.`);
    if (numero === 1 && adicional) return falla(`El título principal es 1.${digito}.1_${nivel.palabra}_…; ADICIONAL se usa desde 1.${digito}.2.`);
    if (numero > 1 && !adicional) return falla(`Los títulos adicionales llevan ADICIONAL: 1.${digito}.${numero}_${nivel.palabra}_ADICIONAL_….`);
    const entidad = resto ? capitalizado(resto) : undefined;
    return { ok: true, tipoSoporte: nivel.tipoSoporte, soporte: `${nivel.nombre}${numero > 1 ? ' adicional' : ''}`, numero, nivelNombre: nivel.nombre, entidad, datos: entidad ? [entidad] : [] };
  }

  if (['EXPERIENCIA_DOCENTE', 'EXPERIENCIA_LABORAL', 'ACADEMICO'].includes(bloque)) {
    const coincide = /^(\d{4})_(\d+)_(.+)$/.exec(nombreNormal);
    const [tipoSoporte, soporte, patron] = bloque === 'EXPERIENCIA_DOCENTE' ? ['experiencia_docente', 'Experiencia docente', 'AÑO_FOLIO_UNIVERSIDAD (2002_1_ESAP)']
      : bloque === 'EXPERIENCIA_LABORAL' ? ['experiencia_laboral', 'Experiencia laboral', 'AÑO_FOLIO_ENTIDAD (2002_1_FUNDEPAZ)']
        : ['experiencia_investigativa', 'Experiencia investigativa', 'AÑO_FOLIO_UNIVERSIDAD (2016_1_UNIVERSIDAD_AUTONOMA)'];
    if (!coincide) return falla(`No cumple la nomenclatura. Use ${patron}.`);
    if (!anioValido(coincide[1])) return falla(`El año ${coincide[1]} no es válido.`);
    return { ok: true, tipoSoporte, soporte, entidad: capitalizado(coincide[3]), datos: [`Año ${coincide[1]}`, `Folio ${Number(coincide[2])}`, capitalizado(coincide[3])] };
  }

  if (bloque === 'PRODUCTIVIDAD_ACADEMICA') {
    const coincide = /^(\d{4})_(\d+)_(.+)$/.exec(nombreNormal);
    if (!coincide) return falla('No cumple la nomenclatura de 05. Use AÑO_FOLIO_TIPO DE PRODUCTO_APELLIDOS (2004_1_LIBRO_MARIN_TABORDA).');
    if (!anioValido(coincide[1])) return falla(`El año ${coincide[1]} no es válido.`);
    return { ok: true, tipoSoporte: 'productividad_academica', soporte: 'Productividad académica', datos: [`Año ${coincide[1]}`, `Folio ${Number(coincide[2])}`, capitalizado(coincide[3])] };
  }

  if (bloque === 'SEGUNDA_LENGUA') {
    const coincide = /^([A-Z]+)_([ABC][12])(?:_(\d+))?_(.+)$/.exec(nombreNormal);
    if (!coincide) return falla('No cumple la nomenclatura de 06. Use IDIOMA_NIVEL_NOMBRE DOCENTE (INGLES_C1_NOMBRE_APELLIDO; varias: INGLES_C1_2_NOMBRE_APELLIDO).');
    return { ok: true, tipoSoporte: 'dominio_segunda_lengua', soporte: 'Dominio de segunda lengua', datos: [capitalizado(coincide[1]), `Nivel ${coincide[2]}`] };
  }

  if (bloque === 'FORMACION_NO_FORMAL') {
    const coincide = /^([A-Z]+)_(\d{4})_(.+)$/.exec(nombreNormal);
    if (!coincide) return falla('No cumple la nomenclatura de 07. Use TIPOLOGÍA_AÑO_NOMBRE DOCENTE (DIPLOMADO_2001_LUIS_MIGUEL_CABRERA).');
    if (!anioValido(coincide[2])) return falla(`El año ${coincide[2]} no es válido.`);
    return { ok: true, tipoSoporte: 'formacion_no_formal', soporte: 'Formación no formal', datos: [capitalizado(coincide[1]), `Año ${coincide[2]}`] };
  }

  if (bloque === 'VINCULACION') {
    const coincide = /^(\d{4})_(\d+)_(.+)$/.exec(nombreNormal);
    if (!coincide) return falla('No cumple la nomenclatura de 10. Use AÑO_FOLIO_CONCEPTO BREVE_APELLIDOS (2007_3_ASCENSO_A_TITULAR_MARIN_TABORDA).');
    if (!anioValido(coincide[1])) return falla(`El año ${coincide[1]} no es válido.`);
    const concepto = CONCEPTOS_NOVEDAD.find(item => item.patron.test(coincide[3])) ?? { tipoSoporte: 'acto_administrativo_situacion', soporte: 'Acto administrativo de situación' };
    return { ok: true, tipoSoporte: concepto.tipoSoporte, soporte: concepto.soporte, datos: [`Año ${coincide[1]}`, `Folio ${Number(coincide[2])}`, capitalizado(coincide[3])] };
  }

  return falla('Esta carpeta no admite carga masiva.');
}

const tituloNuevoDe = (nivelNombre: string, numero: number, entidad?: string) => {
  const base = numero > 1 ? `${nivelNombre} adicional${numero > 2 ? ` ${numero - 1}` : ''}` : nivelNombre;
  return entidad ? `${base} (${entidad})` : base;
};

const comparar = (a: File, b: File) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });

/**
 * Plan de carga de los archivos elegidos para una carpeta. Ordena por nombre para que 1.1.1 se procese antes que
 * 1.1.2: cada archivo queda emparejado con el título de su posición. Solo se cargan los `valido`.
 */
export function planificarCarga(bloque: string, archivos: File[], grupos: GrupoCarga[]): Array<ArchivoPlan & { file: File }> {
  const porTipo = new Map(grupos.map(grupo => [grupo.tipoSoporte, {
    cantidad: grupo.nombresArchivo.length, titulos: grupo.titulos?.length ?? 0, nombres: new Set(grupo.nombresArchivo.map(item => item.toLowerCase())), grupo,
  }]));
  const nombresEnLote = new Set<string>();

  return [...archivos].sort(comparar).map(file => {
    const nombre = file.name;
    const base = { file, nombre, datos: [] as string[] };
    if (!esPdf(nombre)) return { ...base, estado: 'rechazado' as const, motivo: /^FOTO_/i.test(nombre) ? 'La foto se carga desde el panel de foto del docente; aquí solo se admiten PDF.' : 'Solo se admiten archivos PDF.' };
    if (!file.size) return { ...base, estado: 'rechazado' as const, motivo: 'El archivo está vacío.' };
    if (file.size > RUND_MAX_ARCHIVO_BYTES) return { ...base, estado: 'rechazado' as const, motivo: `El archivo supera el máximo de ${RUND_MAX_ARCHIVO_MB} MB.` };
    const clave = nombre.toLowerCase();
    if (nombresEnLote.has(clave)) return { ...base, estado: 'advertencia' as const, motivo: 'El archivo está repetido en la selección; solo se carga uno.' };
    nombresEnLote.add(clave);

    const analisis = analizar(bloque, nombre);
    if (!analisis.ok) return { ...base, estado: 'rechazado' as const, motivo: analisis.motivo };
    const estado = porTipo.get(analisis.tipoSoporte);
    if (!estado) return { ...base, estado: 'rechazado' as const, soporte: analisis.soporte, motivo: `Esta carpeta no tiene espacio para «${analisis.soporte}».` };
    if (!estado.grupo.puedeCargar) return { ...base, estado: 'rechazado' as const, soporte: analisis.soporte, motivo: `No se puede cargar en «${analisis.soporte}»: registra primero el dato en Editar datos o solicita el permiso.` };
    const comun = { ...base, tipoSoporte: analisis.tipoSoporte, soporte: analisis.soporte, numero: analisis.numero, datos: analisis.datos };
    if (estado.nombres.has(clave)) return { ...comun, estado: 'advertencia' as const, motivo: 'Ya existe un documento con ese nombre; no se duplica.' };

    if (analisis.numero !== undefined && analisis.nivelNombre && analisis.tipoSoporte !== 'diploma_bachiller') {
      const codigo = `1.${Object.entries(NIVELES).find(([, nivel]) => nivel.tipoSoporte === analisis.tipoSoporte)?.[0]}`;
      if (analisis.numero <= estado.cantidad) return { ...comun, estado: 'advertencia' as const, motivo: `El soporte ${codigo}.${analisis.numero} ya tiene documento; no se duplica. Edítelo o elimínelo desde la tabla.` };
      if (analisis.numero > estado.cantidad + 1) return { ...comun, estado: 'rechazado' as const, motivo: `Falta el documento ${codigo}.${estado.cantidad + 1}: cárguelo primero (o en este mismo lote) para que cada título quede con su archivo.` };
      const tituloExistente = estado.titulos >= analisis.numero ? grupoTitulo(estado.grupo, analisis.numero) : undefined;
      const tituloNuevo = tituloExistente ? undefined : tituloNuevoDe(analisis.nivelNombre, analisis.numero, analisis.entidad);
      estado.cantidad += 1;
      if (!tituloExistente) estado.titulos = Math.max(estado.titulos, analisis.numero);
      estado.nombres.add(clave);
      return { ...comun, estado: 'valido' as const, tituloExistente, tituloNuevo };
    }
    estado.cantidad += 1;
    estado.nombres.add(clave);
    return { ...comun, estado: 'valido' as const };
  });
}

const grupoTitulo = (grupo: GrupoCarga, numero: number) => grupo.titulos?.[numero - 1];

/** Texto que se guarda como descripción del soporte: origen de la carga y datos leídos del nombre del archivo. */
export const descripcionCargaMasiva = (plan: Pick<ArchivoPlan, 'nombre' | 'datos'>) =>
  ['Carga masiva', plan.nombre, ...plan.datos].join(' · ').slice(0, 1000);

export const resumenPlan = (plan: ArchivoPlan[]) => ({
  total: plan.length,
  validos: plan.filter(item => item.estado === 'valido').length,
  rechazados: plan.filter(item => item.estado === 'rechazado').length,
  advertencias: plan.filter(item => item.estado === 'advertencia').length,
});

