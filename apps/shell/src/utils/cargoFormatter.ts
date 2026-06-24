export type CargoTemplateType = 'docente' | 'administrador';

const normalizarEspacios = (value?: string | null): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizarCodigo = (value?: string | number | null): string =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .trim();

const esCodigoCero = (value: string): boolean =>
  Boolean(value) && /^0+$/.test(value);

const recortarCodigoCargo = (value: string): string => {
  if (!value || value.length <= 4 || esCodigoCero(value)) {
    return value;
  }
  return value.slice(0, 4);
};

const normalizarTextoBusqueda = (value?: string | null): string => {
  const base = String(value || '').toLowerCase();
  const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
  return normalizado
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizarEncargo = (value?: string | null): 'E' | 'N' | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'E' || normalized.startsWith('E')) return 'E';
  if (normalized === 'N' || normalized.startsWith('N')) return 'N';
  return null;
};

const agregarSufijoEncargo = (
  cargo: string,
  encargo: 'E' | 'N' | null,
): string => {
  const base = normalizarEspacios(cargo);
  if (!base || base === 'N/A' || encargo !== 'E') {
    return base;
  }
  if (/\(\s*E\s*\)$/i.test(base)) {
    return base.replace(/\(\s*E\s*\)$/i, '(E)');
  }
  if (/\sE$/i.test(base)) {
    return base.replace(/\sE$/i, ' (E)');
  }
  return `${base} (E)`;
};

export const esCargoDocente = (value?: string | null): boolean =>
  /\bdocen\w*\b|\bdoc\b/.test(normalizarTextoBusqueda(value));

export const selectPreferredCargoCode = (
  ...values: Array<string | number | null | undefined>
): string => {
  const normalized = values
    .map((value) => {
      if (value === null || value === undefined) return '';
      const raw = String(value).trim();
      if (!raw) return '';
      return normalizarCodigo(raw);
    })
    .filter(Boolean);

  if (!normalized.length) {
    return '';
  }

  return normalized.sort((left, right) => {
    if (left.length !== right.length) {
      return right.length - left.length;
    }
    const leftHasLeadingZero = left.startsWith('0') ? 1 : 0;
    const rightHasLeadingZero = right.startsWith('0') ? 1 : 0;
    return rightHasLeadingZero - leftHasLeadingZero;
  })[0];
};

interface FormatCargoDisplayOptions {
  cargoSource?: string | null;
  codCargo?: string | number | null;
  codGrade?: string | number | null;
  templateType?: CargoTemplateType | null;
  includeCodeLabel?: boolean;
  codeLabel?: string;
  observations?: string | null;
  encargoFlag?: string | null;
}

export const formatCargoDisplay = ({
  cargoSource,
  codCargo,
  codGrade,
  templateType,
  includeCodeLabel = false,
  codeLabel = 'Código',
  observations,
  encargoFlag,
}: FormatCargoDisplayOptions): string => {
  const cargoRaw = normalizarEspacios(cargoSource);
  const encargo = normalizarEncargo(observations ?? encargoFlag);
  const leadingMatch = cargoRaw.match(/^(\d+)\s+(.+)$/);
  const leadingCode = normalizarCodigo(leadingMatch?.[1]);
  let baseText = normalizarEspacios(leadingMatch ? leadingMatch[2] : cargoRaw);

  const gradeMatch = cargoRaw.match(/\bgrado\s*(\d{1,2})\b/i);
  const gradeFromText = normalizarCodigo(gradeMatch?.[1]);

  // Limpiar "Grado xx" del texto base para reconstruirlo de forma consistente.
  baseText = normalizarEspacios(baseText.replace(/\bgrado\s*\d{1,2}\b/gi, ''));

  let inferredCode = '';
  let inferredGrade = '';

  // Caso compacto administrativo: "... 202816" -> código 2028, grado 16.
  const compactAdminMatch = baseText.match(/^(.*?)(?:\s+)?(\d{4})(\d{2})$/);
  if (compactAdminMatch && /[A-Za-z\u00C0-\u00FF]/.test(compactAdminMatch[1] || '')) {
    inferredCode = compactAdminMatch[2];
    inferredGrade = compactAdminMatch[3];
    baseText = normalizarEspacios(compactAdminMatch[1]);
  } else {
    // Caso docente/administrativo con código al final: "... Código 40640".
    const trailingCodeMatch = baseText.match(
      /^(.*?)(?:\s+)?(?:c[oó]digo\s+)?(\d{4,5})$/i,
    );
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
    const cargoSoloCodigo =
      codCargoRaw.length >= 4
        ? codCargoRaw.slice(0, 4)
        : codCargoRaw.slice(0, -codGradeRaw.length);
    if (cargoSoloCodigo.length >= 3) {
      codCargoRaw = cargoSoloCodigo;
    }
  }

  // Fallback adicional para admin cuando cod_grade no viene separado.
  if (
    resolvedTemplate !== 'docente' &&
    !codGradeRaw &&
    /^\d{5,6}$/.test(codCargoRaw) &&
    /[A-Za-z\u00C0-\u00FF]/.test(baseText || cargoRaw)
  ) {
    codGradeRaw = codCargoRaw.slice(-2);
    codCargoRaw = codCargoRaw.slice(0, 4);
  }

  codCargoRaw = recortarCodigoCargo(codCargoRaw);

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
  return agregarSufijoEncargo(cargo || cargoRaw || 'N/A', encargo);
};
