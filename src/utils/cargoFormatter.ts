export type CargoTemplateType = 'docente' | 'administrador';

const normalizarEspacios = (value?: string | null): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizarCodigo = (value?: string | number | null): string =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const normalizarTextoBusqueda = (value?: string | null): string => {
  const base = String(value || '').toLowerCase();
  const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
  return normalizado
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const esCargoDocente = (value?: string | null): boolean =>
  /\bdocen\w*\b|\bdoc\b/.test(normalizarTextoBusqueda(value));

interface FormatCargoDisplayOptions {
  cargoSource?: string | null;
  codCargo?: string | number | null;
  codGrade?: string | number | null;
  templateType?: CargoTemplateType | null;
  includeCodeLabel?: boolean;
  codeLabel?: string;
}

export const formatCargoDisplay = ({
  cargoSource,
  codCargo,
  codGrade,
  templateType,
  includeCodeLabel = false,
  codeLabel = 'Codigo',
}: FormatCargoDisplayOptions): string => {
  const cargoRaw = normalizarEspacios(cargoSource);
  const leadingMatch = cargoRaw.match(/^(\d+)\s+(.+)$/);
  const leadingCode = normalizarCodigo(leadingMatch?.[1]);
  let baseText = normalizarEspacios(leadingMatch ? leadingMatch[2] : cargoRaw);

  const gradeMatch = cargoRaw.match(/\bgrado\s*(\d{1,2})\b/i);
  const gradeFromText = normalizarCodigo(gradeMatch?.[1]);

  // Limpiar "Grado xx" del texto base para reconstruirlo de forma consistente.
  baseText = normalizarEspacios(baseText.replace(/\bgrado\s*\d{1,2}\b/gi, ''));

  let inferredCode = '';
  let inferredGrade = '';

  // Caso compacto administrativo: "... 202816" -> codigo 2028, grado 16.
  const compactAdminMatch = baseText.match(/^(.*?)(?:\s+)?(\d{4})(\d{2})$/);
  if (compactAdminMatch && /[A-Za-z\u00C0-\u00FF]/.test(compactAdminMatch[1] || '')) {
    inferredCode = compactAdminMatch[2];
    inferredGrade = compactAdminMatch[3];
    baseText = normalizarEspacios(compactAdminMatch[1]);
  } else {
    // Caso docente con codigo al final: "... 9030".
    const trailingCodeMatch = baseText.match(/^(.*?)(?:\s+)?(\d{4})$/);
    if (trailingCodeMatch && /[A-Za-z\u00C0-\u00FF]/.test(trailingCodeMatch[1] || '')) {
      inferredCode = trailingCodeMatch[2];
      baseText = normalizarEspacios(trailingCodeMatch[1]);
    }
  }

  let codCargoRaw = normalizarCodigo(codCargo) || leadingCode || inferredCode;
  let codGradeRaw = normalizarCodigo(codGrade) || gradeFromText || inferredGrade;

  const resolvedTemplate: CargoTemplateType =
    templateType || (esCargoDocente(`${cargoRaw} ${baseText}`) ? 'docente' : 'administrador');

  // Si cod_cargo llega compacto con grado incluido (ej. 202816), separarlo.
  if (
    codCargoRaw &&
    codGradeRaw &&
    codCargoRaw.length > codGradeRaw.length &&
    codCargoRaw.endsWith(codGradeRaw)
  ) {
    const cargoSoloCodigo = codCargoRaw.slice(0, -codGradeRaw.length);
    if (cargoSoloCodigo.length >= 3) {
      codCargoRaw = cargoSoloCodigo;
    }
  }

  // Fallback adicional para admin cuando cod_grade no viene separado.
  if (
    resolvedTemplate !== 'docente' &&
    !codGradeRaw &&
    /^\d{6}$/.test(codCargoRaw) &&
    /[A-Za-z\u00C0-\u00FF]/.test(baseText || cargoRaw)
  ) {
    codGradeRaw = codCargoRaw.slice(-2);
    codCargoRaw = codCargoRaw.slice(0, -2);
  }

  const baseFinal =
    baseText ||
    normalizarEspacios(
      cargoRaw
        .replace(/^\d+\s+/, '')
        .replace(/\bgrado\s*\d{1,2}\b/gi, ''),
    ) ||
    cargoRaw;

  const parts: string[] = [];
  if (baseFinal) parts.push(baseFinal);
  if (codCargoRaw && !new RegExp(`\\b${codCargoRaw}\\b`).test(baseFinal)) {
    parts.push(includeCodeLabel ? `${codeLabel} ${codCargoRaw}` : codCargoRaw);
  }
  if (resolvedTemplate !== 'docente' && codGradeRaw) {
    parts.push(`Grado ${codGradeRaw}`);
  }

  const cargo = normalizarEspacios(parts.join(' '));
  return cargo || cargoRaw || 'N/A';
};
