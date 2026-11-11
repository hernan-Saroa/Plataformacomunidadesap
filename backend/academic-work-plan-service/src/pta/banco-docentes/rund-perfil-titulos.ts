import { NIVELES_TITULO, NivelTitulo, TitulosAdicionales, limpiarTitulosNivel } from './rund-titulos-adicionales';

/**
 * RUND-003 — Títulos deducidos de PERFIL_ACADEMICO.
 *
 * En la plantilla de cargue la columna PERFIL_ACADEMICO trae todos los títulos del docente separados por coma
 * ("Abogado, Magíster en Ciencia Política, Doctor en Ciencia Política"). No vienen clasificados por nivel, así que se
 * deduce por palabras clave. Solo se asigna un nivel cuando es inequívoco: lo que no se puede clasificar con certeza
 * NO se guarda como título (queda únicamente en el perfil académico) y se informa como «sin clasificar».
 */
export interface TitulosDePerfil {
  porNivel: TitulosAdicionales;
  sinClasificar: string[];
}

const sinTildes = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');
const base = (value: string) => sinTildes(value).toLowerCase();

// Orden importa: posdoctorado antes que doctorado.
const NIVELES_POSGRADO: Array<{ nivel: NivelTitulo; patron: RegExp }> = [
  { nivel: 'posDoctorado', patron: /\b(?:pos|post)\s?-?\s?doctor/ },
  { nivel: 'doctorado', patron: /\b(?:doctor(?:a|ado)?|phd|ph\.d)\b/ },
  { nivel: 'maestria', patron: /\b(?:magister|master|maestr(?:ia|o|a))\b/ },
  { nivel: 'especializacion', patron: /\b(?:especialista|especializacion)\b/ },
];

// Profesiones de pregrado reconocidas. Es lista cerrada a propósito: lo que no esté aquí queda «sin clasificar».
const PREGRADO = /\b(?:abogad|economist|administrador|contador|ingenier|licenciad|politolog|sociolog|psicolog|historiador|filosof|fisic[oa]|matematic|arquitect|medic[oa]|comunicador|periodista|trabajador(?:a)? social|antropolog|geograf|biolog|quimic|estadistic|profesional en|tecnolog|odontolog|enfermer|veterinari|zootecnist|nutricionista|bibliotecolog|archivist|lingüist|linguist|traductor|negociador|internacionalista|administracion (?:publica|de empresas))/;

const CONECTORES_INICIALES = /^(?:y|e|o|de|del|en|con|para|por|la|el|las|los|a)\b/;

function nivelDe(fragmento: string): NivelTitulo | null {
  const texto = base(fragmento);
  // "Posgrado" no dice si es especialización o maestría: no se adivina.
  if (/\bposgrado\b/.test(texto) && !NIVELES_POSGRADO.some(({ patron }) => patron.test(texto))) return null;
  for (const { nivel, patron } of NIVELES_POSGRADO) if (patron.test(texto)) return nivel;
  return PREGRADO.test(texto) ? 'pregrado' : null;
}

function limpiarFragmento(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/^(?:y|e)\s+/i, '').replace(/^[\s.;:\-–—]+|[\s.;:,]+$/g, '').trim();
}

/** Parte la celda por comas, pero une al fragmento anterior los que son continuación del mismo título ("…, de la Paz"). */
export function separarTitulosDePerfil(perfil: unknown): string[] {
  // Celdas con títulos pegados sin coma ("…PúblicaDoctor en…"): se separan antes de dividir.
  const texto = String(perfil ?? '').replace(/([a-záéíóúñ.])(?=(?:Doctor|Doctora|Magíster|Magister|Especialista|Abogad[oa])\b)/g, '$1, ');
  const crudos = texto.split(/[,;\n\r|]+/).map(limpiarFragmento).filter(Boolean);
  const titulos: string[] = [];
  for (const fragmento of crudos) {
    const esContinuacion = titulos.length > 0 && nivelDe(fragmento) === null && (CONECTORES_INICIALES.test(base(fragmento)) || /^[a-záéíóúñ]/.test(fragmento));
    if (esContinuacion) titulos[titulos.length - 1] = `${titulos[titulos.length - 1]}, ${fragmento}`;
    else titulos.push(fragmento);
  }
  return titulos;
}

export function clasificarTitulosDePerfil(perfil: unknown): TitulosDePerfil {
  const porNivel: TitulosAdicionales = {};
  const sinClasificar: string[] = [];
  const vistos = new Set<string>();
  for (const titulo of separarTitulosDePerfil(perfil)) {
    const clave = base(titulo).replace(/\s+/g, ' ');
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const nivel = nivelDe(titulo);
    if (!nivel) { sinClasificar.push(titulo); continue; }
    (porNivel[nivel] ||= []).push(titulo);
  }
  return { porNivel, sinClasificar };
}

const VACIAS = new Set(['de', 'del', 'en', 'y', 'la', 'el', 'los', 'las', 'e', 'con', 'para', 'por']);
const raices = (titulo: string) => new Set(base(titulo).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !VACIAS.has(t)).map(t => t.slice(0, 5)));

/**
 * ¿Es el mismo título aunque cambie el género o la forma ("Administración Pública" ↔ "Administrador Público")?
 * Compara raíces de 5 letras; exige coincidencia casi total para no confundir "Derecho" con "Derechos Humanos".
 */
export function mismoTitulo(a: string, b: string): boolean {
  const ra = raices(a);
  const rb = raices(b);
  if (!ra.size || !rb.size) return false;
  const comunes = [...ra].filter(r => rb.has(r)).length;
  return comunes / new Set([...ra, ...rb]).size >= 0.75;
}

export interface DeduccionTitulos {
  /** Títulos adicionales que se agregarían (ya sin repetir el precargado ni lo que ya existe). */
  adicionales: TitulosAdicionales;
  deducidos: number;
  sinClasificar: string[];
}

/**
 * Deduce los títulos adicionales de la fila de la plantilla: de cada nivel, todo lo que aparece en PERFIL_ACADEMICO
 * y no es el título precargado de ese nivel. Se UNE con lo ya registrado (no borra títulos agregados a mano).
 */
export function deducirTitulosAdicionales(
  perfil: unknown,
  precargados: Partial<Record<NivelTitulo, string | null>>,
  existentes: TitulosAdicionales = {},
): DeduccionTitulos {
  const { porNivel, sinClasificar } = clasificarTitulosDePerfil(perfil);
  const adicionales: TitulosAdicionales = {};
  let deducidos = 0;
  for (const nivel of NIVELES_TITULO) {
    const previos = existentes[nivel] || [];
    const nuevos = (porNivel[nivel] || []).filter(titulo => {
      if (precargados[nivel] && mismoTitulo(titulo, precargados[nivel]!)) return false;
      return !previos.some(previo => mismoTitulo(titulo, previo));
    });
    deducidos += nuevos.length;
    const total = limpiarTitulosNivel([...previos, ...nuevos], precargados[nivel]);
    if (total.length) adicionales[nivel] = total;
  }
  return { adicionales, deducidos, sinClasificar };
}
