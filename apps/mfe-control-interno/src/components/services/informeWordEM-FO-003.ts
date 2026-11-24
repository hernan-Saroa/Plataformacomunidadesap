/**
 * Informe preliminar en el formato oficial EM-FO-003 v03 (Word), EFDS-2455.
 *
 * El auditor genera el borrador con los datos registrados en la auditoría, lo
 * termina en Word fuera del sistema y luego sube el definitivo, que es el que se
 * notifica al área auditada. Lo que el sistema no tiene queda marcado para que el
 * auditor lo diligencie.
 */
import plantillaEmFo003 from '@/assets/plantillas/EM-FO-003-v03-informe-auditoria.docx?url';
import controlInternoService from '../../../../services/api/controlInternoService';
import { MARCA_AUDITOR, rellenarPlantillaWord, resaltado, type DatosPlantilla } from './plantillaWord';
import { agruparNormasPorTipo, type NormaAplicable } from './normatividad';
import { esAuditoriaTerritorial, nombreDireccionTerritorial } from './unidadAuditada';
import { tituloConUnidades, unidadesParaExportar } from '../utils/unidadesAuditables';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

type Fecha = { dia: number; mes: number; anio: number };

/** 'AAAA-MM-DD' (o ISO con hora) → partes, sin pasar por la zona horaria del navegador. */
function leerFecha(valor: unknown): Fecha | null {
  const m = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const fechaLarga = (f: Fecha, conAnio = true) =>
  `${dosDigitos(f.dia)} de ${MESES[f.mes - 1]}${conAnio ? ` de ${f.anio}` : ''}`;

/** "29 de julio – 01 de agosto de 2025": el año se escribe una vez si es el mismo. */
function rangoLargo(inicio: Fecha | null, fin: Fecha | null, separador: string): string | null {
  if (inicio && fin) return `${fechaLarga(inicio, inicio.anio !== fin.anio)}${separador}${fechaLarga(fin)}`;
  if (inicio) return fechaLarga(inicio);
  if (fin) return fechaLarga(fin);
  return null;
}

const fechaCorta = (f: Fecha) => `${dosDigitos(f.dia)}-${dosDigitos(f.mes)}-${f.anio}`;

const normalizar = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const textoLimpio = (s: unknown) => String(s ?? '').trim();

/** Nivel del proceso según el tipo del proceso auditable (Configuración → Procesos). */
const NIVELES: Record<string, { rotulo: string; casilla?: 'xEstrategico' | 'xMisional' | 'xApoyo' | 'xEvaluacion' }> = {
  estrategico: { rotulo: 'estratégico', casilla: 'xEstrategico' },
  misional: { rotulo: 'misional', casilla: 'xMisional' },
  apoyo: { rotulo: 'apoyo', casilla: 'xApoyo' },
  evaluacion: { rotulo: 'evaluación', casilla: 'xEvaluacion' },
  'evaluacion y control': { rotulo: 'evaluación', casilla: 'xEvaluacion' },
  transversal: { rotulo: 'transversal' },
};

/** `Ley 87 de 1993: "Por la cual…"`, o solo lo que tenga la norma. */
function textoNormaInforme(n: NormaAplicable): string {
  if (n.identificacion && n.descripcion) return `${n.identificacion}: "${n.descripcion}"`;
  return n.identificacion || n.descripcion;
}

/** Lista con al menos un ítem: si no hay datos, el texto indicado. */
const itemsOMarca = (lista: string[], vacio: string = MARCA_AUDITOR): DatosPlantilla[] =>
  (lista.length ? lista : [vacio]).map((texto) => ({ texto }));

export interface FuentesInformePreliminar {
  auditoria: any;
  hallazgos: any[];
  reunionApertura?: any;
  reunionCierre?: any;
  /** Lo que resuelve el backend: jefe de la OCI y nivel del proceso auditado */
  datosOficina?: { jefeOci?: string | null; nivelProceso?: string | null } | null;
  hoy?: Date;
}

/** Arma los datos del formato a partir de lo registrado en la auditoría. */
export function datosInformePreliminar(f: FuentesInformePreliminar): DatosPlantilla {
  const a = f.auditoria || {};
  const territorial = esAuditoriaTerritorial(a.territorial);
  const nombreTerritorial = territorial ? nombreDireccionTerritorial(a.territorial) : '';
  const proceso = textoLimpio(a.procesoAuditado) || textoLimpio(a.nombre);
  const unidades = unidadesParaExportar(a.nombre, a.unidadesAuditables);

  // Título: el nombre de la auditoría y la unidad auditable cuando el nombre no la trae
  const nombre = textoLimpio(a.nombre);
  const unidadAuditable = territorial ? nombreTerritorial : tituloConUnidades(proceso, unidades);
  const tituloAuditoria =
    unidadAuditable && !normalizar(nombre).includes(normalizar(unidadAuditable))
      ? [nombre, unidadAuditable].filter(Boolean).join(' – ')
      : nombre || unidadAuditable;

  const responsableNombre = textoLimpio(a.responsableAreaNombre);
  const responsableCargo = textoLimpio(a.responsableAreaCargo);
  const responsables = responsableNombre
    ? [responsableNombre, responsableCargo].filter(Boolean).join(' – ')
    : MARCA_AUDITOR;

  const ejecucion = rangoLargo(leerFecha(a.fechaInicioEjecucion), leerFecha(a.fechaFinEjecucion), ' – ');
  const lugar = territorial ? nombreTerritorial : 'Bogotá D.C.';
  const lugarFecha = `${lugar}, ${ejecucion ?? MARCA_AUDITOR}`;

  // Periodo auditado: el de la auditoría; si no lo tiene, el año anterior a la vigencia
  const vigencia = Number(a.planAnualVigencia) || leerFecha(a.fechaInicio)?.anio || null;
  const periodoRegistrado = rangoLargo(leerFecha(a.periodoInicio), leerFecha(a.periodoFin), ' al ');
  const periodo = periodoRegistrado ?? (vigencia ? `1 de enero al 31 de diciembre de ${vigencia - 1}` : MARCA_AUDITOR);

  // Equipo auditor: el líder no está en equipo_auditor, va primero con su rol
  const lider = textoLimpio(a.auditorLider?.nombre ?? (typeof a.auditorLider === 'string' ? a.auditorLider : ''));
  const rolLider = textoLimpio(a.auditorLider?.cargo) || 'Auditor Líder';
  const equipo = (Array.isArray(a.equipoAuditores) ? a.equipoAuditores : [])
    .map((e: any) => ({
      nombre: textoLimpio(typeof e === 'string' ? e : e?.nombre || e?.nombreCompleto || e?.persona?.nombre),
      rol: textoLimpio(e?.rol) || 'Auditor',
    }))
    .filter((e: { nombre: string }) => e.nombre && normalizar(e.nombre) !== normalizar(lider));
  const lineasEquipo = [...(lider ? [`${lider} – ${rolLider}`] : []), ...equipo.map((e: { nombre: string; rol: string }) => `${e.nombre} – ${e.rol}`)];
  const conSaltoInicial = (lineas: string[]) => (lineas.length > 1 ? `\n${lineas.join('\n')}` : lineas.join(''));

  const objetivos = (Array.isArray(a.objetivos) ? a.objetivos : [])
    .filter((o: any) => o && o.activo !== false)
    .sort((x: any, y: any) => (Number(x.orden) || 0) - (Number(y.orden) || 0))
    .map((o: any) => textoLimpio(typeof o === 'string' ? o : o.descripcion || o.objetivo))
    .filter(Boolean);

  const { generales, especificas } = agruparNormasPorTipo(a.programaAnualMetadata?.normatividadAplicable ?? a.normatividadAplicable);

  const nivel = NIVELES[normalizar(f.datosOficina?.nivelProceso)];
  const casilla = (c: string) => (nivel?.casilla === c ? '(X)' : '( )');
  const fechaReunion = (r: any) => {
    const fecha = leerFecha(r?.fecha);
    return fecha ? fechaCorta(fecha) : resaltado('DD-MM-AAAA');
  };

  // Hallazgos del preliminar: todos menos los retirados, en el orden en que se registraron
  const hallazgos = (f.hallazgos || [])
    .filter((h) => normalizar(h?.estado) !== 'retirado')
    .sort((x, y) => String(x.createdAt ?? '').localeCompare(String(y.createdAt ?? '')))
    .map((h, i) => {
      const descripcion = textoLimpio(h.descripcion);
      const tituloGuardado = textoLimpio(h.titulo);
      // El formulario guarda como título los primeros 100 caracteres de la descripción
      const titulo =
        !tituloGuardado || (tituloGuardado.length >= 100 && descripcion.length > tituloGuardado.length && descripcion.startsWith(tituloGuardado))
          ? descripcion
          : tituloGuardado;
      const recomendaciones = Array.isArray(h.recomendaciones) ? h.recomendaciones : h.recomendaciones ? [h.recomendaciones] : [];
      // El campo "Condición" del formulario se guarda en recomendaciones[0]
      const condicion = textoLimpio(recomendaciones[0]) || descripcion;
      return {
        n: String(i + 1),
        titulo: titulo || MARCA_AUDITOR,
        condicion: condicion || MARCA_AUDITOR,
        criterios: textoLimpio(h.criterioIncumplido) || MARCA_AUDITOR,
        causa: textoLimpio(h.causa) || MARCA_AUDITOR,
        efecto: textoLimpio(h.efecto) || MARCA_AUDITOR,
      };
    });

  const jefeOci = textoLimpio(f.datosOficina?.jefeOci);
  const hoy = f.hoy ?? new Date();
  const conclusiones = textoLimpio(a.conclusiones);
  const lista = (v: unknown) => (Array.isArray(v) ? v.map(textoLimpio).filter(Boolean) : []);

  return {
    tipoInforme: 'Informe preliminar de auditoría de evaluación y seguimiento.',
    tituloAuditoria: tituloAuditoria || MARCA_AUDITOR,
    responsables,
    lugarFecha,
    periodo,
    equipo: lineasEquipo.length ? conSaltoInicial(lineasEquipo) : MARCA_AUDITOR,
    objetivos: objetivos.length ? conSaltoInicial(objetivos) : MARCA_AUDITOR,
    alcance: textoLimpio(a.alcance) || MARCA_AUDITOR,
    // La carta de representación no se registra en el sistema
    fechaCarta: resaltado('DD-MM-AAAA'),
    unidadAuditada: territorial
      ? `la ${nombreTerritorial}`
      : `el proceso ${tituloConUnidades(proceso, unidades)}`,
    normasGenerales: itemsOMarca(generales.map(textoNormaInforme)),
    normasEspecificas: itemsOMarca(especificas.map(textoNormaInforme)),
    vigencia: vigencia ? String(vigencia) : resaltado('AAAA'),
    xEstrategico: casilla('xEstrategico'),
    xMisional: casilla('xMisional'),
    xApoyo: casilla('xApoyo'),
    xEvaluacion: casilla('xEvaluacion'),
    xSedeCentral: territorial ? '( )' : '(X)',
    xTerritorial: territorial ? '(X)' : '( )',
    fechaApertura: fechaReunion(f.reunionApertura),
    fechaCierre: fechaReunion(f.reunionCierre),
    nivelProceso: nivel?.rotulo ?? MARCA_AUDITOR,
    proceso: proceso || MARCA_AUDITOR,
    objetivoProceso: MARCA_AUDITOR,
    riesgoProceso: MARCA_AUDITOR,
    unidades: unidades.map((nombre) => ({ nombre, descripcion: resaltado('(Descripción de lo evidenciado)') })),
    sinUnidades: unidades.length ? [] : [{ descripcion: resaltado('(Descripción de lo evidenciado)') }],
    // Sin fortalezas el formato pide "no aplica"
    fortalezas: itemsOMarca(lista(a.fortalezas), 'No aplica.'),
    recomendaciones: itemsOMarca(lista(a.recomendacionesGenerales)),
    hallazgos,
    sinHallazgos: hallazgos.length ? [] : [{}],
    resumen: hallazgos.length
      ? hallazgos.map((h) => ({ n: h.n, titulo: h.titulo }))
      : [{ n: '—', titulo: 'No se identificaron hallazgos.' }],
    evaluacionControlInterno: resaltado('(se indica si es adecuado, en proceso de mejora, inadecuado)'),
    conclusiones:
      conclusiones ||
      resaltado(
        'Las conclusiones de auditoría deben dar respuesta de manera estricta al objetivo, alcance y posible materialización de riesgos de la auditoría y deben estar respaldadas en los hallazgos de auditoría.',
      ),
    fechaFirma: fechaLarga({ dia: hoy.getDate(), mes: hoy.getMonth() + 1, anio: hoy.getFullYear() }).replace(/^0/, ''),
    jefeOci: jefeOci || '(nombre y firma)',
    elaboro: equipo.length ? equipo.map((e: { nombre: string }) => e.nombre).join(', ') : lider,
    reviso: lider,
    aprobo: jefeOci,
  };
}

/** Consulta lo registrado en la auditoría y devuelve el informe preliminar en Word. */
export async function generarInformePreliminarWord(auditoriaId: string): Promise<{ blob: Blob; nombreArchivo: string }> {
  const [auditoria, hallazgos, reunionApertura, reunionCierre, datosOficina, plantilla] = await Promise.all([
    controlInternoService.getAuditoriaById(auditoriaId),
    controlInternoService.getHallazgosByAuditoria(auditoriaId),
    controlInternoService.getReunionApertura(auditoriaId).catch(() => null),
    controlInternoService.getReunionCierre(auditoriaId).catch(() => null),
    controlInternoService.getDatosInformePreliminar(auditoriaId).catch(() => null),
    // Relativa al módulo: el microfrontend puede servirse desde otro origen que el shell
    fetch(new URL(plantillaEmFo003, import.meta.url)).then((r) => {
      if (!r.ok) throw new Error('No se pudo cargar el formato EM-FO-003');
      return r.arrayBuffer();
    }),
  ]);
  const datos = datosInformePreliminar({
    auditoria,
    hallazgos: Array.isArray(hallazgos) ? hallazgos : [],
    reunionApertura,
    reunionCierre,
    datosOficina,
  });
  const blob = await rellenarPlantillaWord(plantilla, datos);
  const codigo = textoLimpio(auditoria?.codigo) || auditoriaId;
  return { blob, nombreArchivo: `Informe_Preliminar_${codigo}.docx` };
}
