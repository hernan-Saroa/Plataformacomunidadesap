import { BadRequestException } from '@nestjs/common';
import { hasRundData } from './rund-evidence-data';
import {
  MAX_LONGITUD_TITULO, MAX_TITULOS_ADICIONALES_POR_NIVEL, limpiarTitulosNivel, type NivelTitulo,
} from './rund-titulos-adicionales';

/**
 * Registro del título desde la tabla de soportes: el usuario carga el diploma y escribe a qué título corresponde.
 * Si el nivel no tiene título (la plantilla no lo trajo) pasa a ser el título precargado; si ya lo tiene, se suma
 * a los títulos adicionales. Así el soporte nunca queda huérfano del dato que acredita.
 */
export const NIVEL_POR_SOPORTE_TITULO: Record<string, NivelTitulo> = {
  diploma_pregrado: 'pregrado',
  diploma_especializacion: 'especializacion',
  diploma_maestria: 'maestria',
  diploma_doctorado: 'doctorado',
  certificado_posdoctoral: 'posDoctorado',
};

export type DecisionTitulo = {
  destino: 'principal' | 'adicional';
  principal: string | null;
  adicionales: string[];
  titulo: string;
};

const clave = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function decidirTituloSoporte(principal: unknown, adicionales: string[], tituloBruto: unknown): DecisionTitulo {
  const titulo = String(tituloBruto ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!titulo) throw new BadRequestException('Escriba el título al que corresponde el documento.');
  if (titulo.length > MAX_LONGITUD_TITULO) {
    throw new BadRequestException(`El título admite máximo ${MAX_LONGITUD_TITULO} caracteres.`);
  }
  const actual = hasRundData(principal) ? String(principal).trim() : null;
  if (!actual) return { destino: 'principal', principal: titulo, adicionales: limpiarTitulosNivel(adicionales, titulo), titulo };
  const guardados = limpiarTitulosNivel(adicionales, actual);
  if (clave(actual) === clave(titulo) || guardados.some(item => clave(item) === clave(titulo))) {
    // El archivo se empareja con su título por posición: repetir el título dejaría un archivo sin fila propia.
    throw new BadRequestException('Ese título ya está registrado. Cargue el documento desde la fila de ese título.');
  }
  if (guardados.length >= MAX_TITULOS_ADICIONALES_POR_NIVEL) {
    throw new BadRequestException(`Solo se admiten ${MAX_TITULOS_ADICIONALES_POR_NIVEL} títulos adicionales por nivel.`);
  }
  return { destino: 'adicional', principal: actual, adicionales: [...guardados, titulo], titulo };
}

export type CambioTitulo = {
  destino: 'principal' | 'adicional';
  principal: string | null;
  adicionales: string[];
  anterior: string;
  nuevo: string | null;
};

const limpiar = (valor: unknown) => String(valor ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Ubica un título del nivel por su texto (sin importar tildes ni mayúsculas): el precargado o uno de los adicionales. */
function ubicarTitulo(principal: unknown, adicionales: string[], titulo: unknown) {
  const buscado = clave(limpiar(titulo));
  if (!buscado) throw new BadRequestException('Indique el título que desea modificar.');
  const actual = hasRundData(principal) ? limpiar(principal) : null;
  const guardados = limpiarTitulosNivel(adicionales, actual);
  if (actual && clave(actual) === buscado) return { donde: 'principal' as const, indice: -1, actual, guardados };
  const indice = guardados.findIndex(item => clave(item) === buscado);
  if (indice < 0) throw new BadRequestException('El título ya no existe. Actualice la ficha e intente de nuevo.');
  return { donde: 'adicional' as const, indice, actual, guardados };
}

/** Cambia el texto de un título (precargado o adicional) conservando su posición; rechaza vacíos, largos y repetidos. */
export function renombrarTitulo(principal: unknown, adicionales: string[], anterior: unknown, nuevoBruto: unknown): CambioTitulo {
  const nuevo = limpiar(nuevoBruto);
  if (!nuevo) throw new BadRequestException('Escriba el nuevo título.');
  if (nuevo.length > MAX_LONGITUD_TITULO) throw new BadRequestException(`El título admite máximo ${MAX_LONGITUD_TITULO} caracteres.`);
  const ubicado = ubicarTitulo(principal, adicionales, anterior);
  const textoAnterior = ubicado.donde === 'principal' ? ubicado.actual! : ubicado.guardados[ubicado.indice];
  // Cambiar solo mayúsculas o tildes del mismo título se permite; contra los demás títulos no puede repetirse.
  const otros = [ubicado.actual, ...ubicado.guardados].filter((t): t is string => !!t && clave(t) !== clave(textoAnterior));
  if (otros.some(t => clave(t) === clave(nuevo))) throw new BadRequestException('Ya existe un título con ese nombre en este nivel.');
  if (ubicado.donde === 'principal') {
    return { destino: 'principal', principal: nuevo, adicionales: ubicado.guardados, anterior: textoAnterior, nuevo };
  }
  const adicionalesNuevos = ubicado.guardados.map((t, i) => (i === ubicado.indice ? nuevo : t));
  return { destino: 'adicional', principal: ubicado.actual, adicionales: adicionalesNuevos, anterior: textoAnterior, nuevo };
}

/** Quita un título. Si era el precargado, el primer adicional pasa a ocupar su lugar para no alterar el orden de la lista. */
export function quitarTitulo(principal: unknown, adicionales: string[], titulo: unknown): CambioTitulo {
  const ubicado = ubicarTitulo(principal, adicionales, titulo);
  if (ubicado.donde === 'principal') {
    const [siguiente, ...resto] = ubicado.guardados;
    return { destino: 'principal', principal: siguiente ?? null, adicionales: resto, anterior: ubicado.actual!, nuevo: null };
  }
  const textoAnterior = ubicado.guardados[ubicado.indice];
  return { destino: 'adicional', principal: ubicado.actual, adicionales: ubicado.guardados.filter((_, i) => i !== ubicado.indice), anterior: textoAnterior, nuevo: null };
}
