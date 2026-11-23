/**
 * Normatividad aplicable a una auditoría (EFDS-2451).
 *
 * Antes cada norma era un texto suelto; ahora lleva identificación y tipo para que
 * el informe preliminar la separe en normas generales y específicas. Las auditorías
 * guardadas con textos sueltos siguen sirviendo: se leen como normas generales.
 */

export type TipoNorma = 'general' | 'especifica';

export type NormaAplicable = {
  identificacion: string;
  descripcion: string;
  tipo: TipoNorma;
};

/** Fila de la plantilla que no se cargó y por qué. */
export type FilaRechazada = { fila: number; motivo: string };

export const ETIQUETA_TIPO_NORMA: Record<TipoNorma, string> = {
  general: 'General',
  especifica: 'Específica',
};

const sinTildes = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** 'General' / 'Específica' (con o sin tilde, en cualquier caja) → tipo; otro valor → null. */
export function parsearTipoNorma(valor: unknown): TipoNorma | null {
  const t = sinTildes(valor);
  if (t === 'general') return 'general';
  if (t === 'especifica' || t === 'especifico') return 'especifica';
  return null;
}

/** Un ítem guardado (texto legado u objeto) como norma; null si no tiene descripción. */
export function normalizarNorma(item: unknown): NormaAplicable | null {
  if (typeof item === 'string') {
    const descripcion = item.trim();
    // Texto legado: va como general y el auditor puede corregirlo después
    return descripcion ? { identificacion: '', descripcion, tipo: 'general' } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const descripcion = String(o.descripcion ?? '').trim();
  const identificacion = String(o.identificacion ?? '').trim();
  if (!descripcion && !identificacion) return null;
  return {
    identificacion,
    descripcion,
    tipo: parsearTipoNorma(o.tipo) ?? 'general',
  };
}

export function normalizarNormas(lista: unknown): NormaAplicable[] {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizarNorma).filter((n): n is NormaAplicable => n !== null);
}

/** "Ley 87 de 1993 - Descripción" o solo la descripción si no hay identificación. */
export function textoNorma(norma: NormaAplicable): string {
  return [norma.identificacion, norma.descripcion].filter(Boolean).join(' - ');
}

/** Para los campos del backend que solo aceptan texto (DTO con @IsString). */
export function normasATexto(lista: unknown): string[] {
  return normalizarNormas(lista).map(textoNorma);
}

export function agruparNormasPorTipo(lista: unknown): {
  generales: NormaAplicable[];
  especificas: NormaAplicable[];
} {
  const normas = normalizarNormas(lista);
  return {
    generales: normas.filter((n) => n.tipo === 'general'),
    especificas: normas.filter((n) => n.tipo === 'especifica'),
  };
}

const claveNorma = (n: NormaAplicable) => `${sinTildes(n.identificacion)}|${sinTildes(n.descripcion)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla Excel
// ─────────────────────────────────────────────────────────────────────────────

const ENCABEZADOS_PLANTILLA = ['Identificación', 'Descripción', 'Tipo (General/Específica)'];
const FILAS_CON_LISTA_TIPO = 500;

/** Descarga la plantilla vacía para cargar la normatividad de una auditoría. */
export async function descargarPlantillaNormatividad(): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ESAP';
  workbook.created = new Date();
  const hoja = workbook.addWorksheet('Normatividad');
  hoja.columns = [{ width: 32 }, { width: 80 }, { width: 26 }];

  const encabezado = hoja.getRow(1);
  encabezado.values = ENCABEZADOS_PLANTILLA;
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
  });
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  // Lista desplegable para que el tipo llegue con un valor que el cargue reconoce
  for (let fila = 2; fila <= FILAS_CON_LISTA_TIPO + 1; fila++) {
    hoja.getCell(`C${fila}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"General,Específica"'],
      showErrorMessage: true,
      errorTitle: 'Tipo de norma',
      error: 'Seleccione General o Específica',
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Plantilla_Normatividad_Aplicable.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lee la plantilla diligenciada. Devuelve las normas válidas y las filas que no se
 * cargaron con su número de fila en el Excel y el motivo (CA-03). Las normas que
 * ya están en la auditoría o que se repiten en el archivo no se duplican.
 */
export async function leerPlantillaNormatividad(
  archivo: File,
  yaRegistradas: NormaAplicable[] = [],
): Promise<{ normas: NormaAplicable[]; rechazadas: FilaRechazada[] }> {
  const XLSX = await import('xlsx');
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja || !hoja['!ref']) {
    throw new Error('El archivo no tiene datos');
  }
  const filaInicial = XLSX.utils.decode_range(hoja['!ref']).s.r;
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  });

  // Se ubica la fila de encabezados por su texto, no por posición, para tolerar
  // títulos encima de la tabla o columnas en otro orden.
  let idxEncabezado = -1;
  let colId = 0;
  let colDesc = 1;
  let colTipo = 2;
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const celdas = (filas[i] || []).map(sinTildes);
    const d = celdas.findIndex((c) => c.startsWith('descripcion'));
    if (d === -1) continue;
    idxEncabezado = i;
    colDesc = d;
    colId = celdas.findIndex((c) => c.startsWith('identificacion') || c.startsWith('numero') || c === 'no.' || c === 'no');
    colTipo = celdas.findIndex((c) => c.startsWith('tipo'));
    break;
  }
  if (idxEncabezado === -1) {
    throw new Error('No se encontró la fila de encabezados (Identificación | Descripción | Tipo)');
  }
  if (colTipo === -1) {
    throw new Error('La plantilla no tiene la columna Tipo (General/Específica)');
  }

  const vistas = new Map<string, number>(yaRegistradas.map((n) => [claveNorma(n), 0]));
  const normas: NormaAplicable[] = [];
  const rechazadas: FilaRechazada[] = [];

  for (let i = idxEncabezado + 1; i < filas.length; i++) {
    const celdas = filas[i] || [];
    const texto = (col: number) => (col >= 0 ? String(celdas[col] ?? '').replace(/\s+/g, ' ').trim() : '');
    const identificacion = texto(colId);
    const descripcion = texto(colDesc);
    const tipoCrudo = texto(colTipo);
    if (!identificacion && !descripcion && !tipoCrudo) continue; // fila vacía

    const fila = filaInicial + i + 1;
    if (!descripcion) {
      rechazadas.push({ fila, motivo: 'Sin descripción' });
      continue;
    }
    const tipo = parsearTipoNorma(tipoCrudo);
    if (!tipo) {
      rechazadas.push({
        fila,
        motivo: tipoCrudo
          ? `Tipo "${tipoCrudo}" no válido (debe ser General o Específica)`
          : 'Sin tipo (debe ser General o Específica)',
      });
      continue;
    }
    const norma: NormaAplicable = { identificacion, descripcion, tipo };
    const clave = claveNorma(norma);
    if (vistas.has(clave)) {
      const filaPrevia = vistas.get(clave);
      rechazadas.push({
        fila,
        motivo: filaPrevia ? `Repetida (igual a la fila ${filaPrevia})` : 'Ya está registrada en la auditoría',
      });
      continue;
    }
    vistas.set(clave, fila);
    normas.push(norma);
  }

  return { normas, rechazadas };
}
