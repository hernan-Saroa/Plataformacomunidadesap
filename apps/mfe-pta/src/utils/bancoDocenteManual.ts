export type ManualDocenteForm = Record<string, string>;
export type ManualDocenteErrors = Record<string, string>;

export const MANUAL_DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
] as const;

export const MANUAL_VINCULACIONES = [
  { value: 'CARRERA1', label: 'Carrera 1 (Acuerdo 009/2004)' },
  { value: 'CARRERA2', label: 'Carrera 2 (Acuerdo 003/2018)' },
  { value: 'PERIODO_DE_PRUEBA', label: 'Período de Prueba' },
  { value: 'OCASIONAL', label: 'Ocasional' },
  { value: 'VISITANTE', label: 'Visitante' },
  { value: 'ESPECIAL', label: 'Especial' },
  { value: 'CATEDRA', label: 'Hora Cátedra' },
] as const;

export const MANUAL_DEDICACIONES = [
  { value: 'TC', label: 'Tiempo Completo' },
  { value: 'MT', label: 'Medio Tiempo' },
  { value: 'HC', label: 'Hora Cátedra' },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PERIOD_REGEX = /^20\d{2}-[12]$/;
const NAME_REGEX = /^[\p{L}\p{M}' -]+$/u;

const REQUIRED_BY_STEP: Record<number, Array<[string, string]>> = {
  0: [
    ['documento_identidad', 'El documento de identidad es obligatorio.'],
    ['tipo_identificacion', 'El tipo de documento es obligatorio.'],
    ['nombreCompleto', 'El nombre completo es obligatorio.'],
    ['periodoCarga', 'El período académico es obligatorio.'],
    ['territorialNombre', 'La territorial es obligatoria.'],
    ['tipoVinculacion', 'El tipo de vinculación es obligatorio.'],
    ['dedicacion', 'La dedicación es obligatoria.'],
    ['horasPta', 'Las horas programables PTA son obligatorias.'],
    ['escalafon', 'La categoría o escalafón es obligatoria.'],
    ['fechaInicioVinculacion', 'La fecha de inicio de vinculación es obligatoria.'],
    ['actoAdministrativoVinculacion', 'El acto administrativo de vinculación es obligatorio.'],
  ],
  1: [
    ['nivelFormacion', 'El nivel de formación es obligatorio.'],
    ['pregrado', 'El titulo de pregrado es obligatorio.'],
    ['nucleoTematico', 'El núcleo temático es obligatorio.'],
    ['perfilAcademico', 'El perfil académico es obligatorio.'],
  ],
  2: [
    ['correoInstitucional', 'El correo institucional es obligatorio.'],
  ],
  3: [
    ['genero', 'El género es obligatorio.'],
    ['fechaNacimiento', 'La fecha de nacimiento es obligatoria.'],
  ],
};

export function sanitizeManualDocument(value: string, documentType: string): string {
  if (documentType === 'PA') return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
  return value.replace(/\D/g, '').slice(0, 20);
}

export function sanitizeManualPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function sanitizeManualInteger(value: string, maxLength = 4): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function sanitizeManualDecimal(value: string): string {
  const clean = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [integer = '', ...decimals] = clean.split('.');
  return `${integer.slice(0, 8)}${decimals.length ? `.${decimals.join('').slice(0, 2)}` : ''}`;
}

export function normalizeManualGender(value: unknown): string {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'M') return 'Masculino';
  if (normalized === 'F') return 'Femenino';
  return String(value || '');
}

export function getManualRegimen(tipoVinculacion: string): string {
  if (tipoVinculacion === 'CARRERA1') return 'Acuerdo 009/2004';
  if (tipoVinculacion === 'CARRERA2') return 'Acuerdo 003/2018';
  if (['PERIODO_DE_PRUEBA', 'OCASIONAL', 'ESPECIAL', 'VISITANTE'].includes(tipoVinculacion)) {
    return 'Circular Dispositiva 003/2025';
  }
  return 'N/A';
}

export function getManualWeeklyHours(dedicacion: string): string {
  if (dedicacion === 'MT') return '20';
  if (dedicacion === 'HC') return '0';
  return '40';
}

export function getManualDefaultPtaHours(tipoVinculacion: string, dedicacion: string): string {
  if (tipoVinculacion === 'CARRERA1') return '720';
  if (dedicacion === 'MT') return '400';
  if (dedicacion === 'HC') return '0';
  return '800';
}

export function computeManualAge(dateValue: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const birthDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = today.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function computeManualAgeRange(age: number | null): string {
  if (age === null || age < 0) return '';
  if (age <= 25) return 'Hasta 25 años';
  if (age <= 35) return 'De 26 a 35 años';
  if (age <= 45) return 'De 36 a 45 años';
  if (age <= 55) return 'De 46 a 55 años';
  if (age <= 65) return 'De 56 a 65 años';
  return '66 años o más';
}

export function validateManualBancoDocenteStep(
  form: ManualDocenteForm,
  step: number,
  options: { isEditing?: boolean; supportFile?: File | null; sensitiveDataRestricted?: boolean } = {},
): ManualDocenteErrors {
  const errors: ManualDocenteErrors = {};
  for (const [field, message] of REQUIRED_BY_STEP[step] || []) {
    if (options.isEditing && options.sensitiveDataRestricted && field === 'documento_identidad') continue;
    if (!String(form[field] || '').trim()) errors[field] = message;
  }

  if (step === 0) {
    const document = form.documento_identidad || '';
    if (!options.sensitiveDataRestricted && document && (document.length < 5 || document.length > 20)) {
      errors.documento_identidad = 'Debe tener entre 5 y 20 caracteres.';
    } else if (!options.sensitiveDataRestricted && document && form.tipo_identificacion === 'PA' && !/^[A-Z0-9]+$/i.test(document)) {
      errors.documento_identidad = 'El pasaporte solo admite letras y números.';
    } else if (!options.sensitiveDataRestricted && document && form.tipo_identificacion !== 'PA' && !/^\d+$/.test(document)) {
      errors.documento_identidad = 'Este tipo de documento solo admite números.';
    }
    const fullName = String(form.nombreCompleto || '').trim();
    if (fullName && (fullName.length < 3 || fullName.length > 150 || !NAME_REGEX.test(fullName))) {
      errors.nombreCompleto = 'Use solo letras, espacios, apostrofes o guiones (3 a 150 caracteres).';
    }
    if (form.periodoCarga && !PERIOD_REGEX.test(form.periodoCarga)) {
      errors.periodoCarga = 'Use el formato AAAA-1 o AAAA-2, por ejemplo 2026-2.';
    }
    const hours = Number(form.horasPta);
    if (form.horasPta && (!Number.isInteger(hours) || hours < 0 || hours > 2000)) {
      errors.horasPta = 'Debe ser un entero entre 0 y 2000.';
    }
    const weeklyHours = Number(form.dedicacionHorasSemana);
    if (form.dedicacionHorasSemana && (!Number.isInteger(weeklyHours) || weeklyHours < 0 || weeklyHours > 168)) {
      errors.dedicacionHorasSemana = 'Debe ser un entero entre 0 y 168.';
    }
    if (!options.sensitiveDataRestricted && form.puntajeSalarial && (!Number.isFinite(Number(form.puntajeSalarial)) || Number(form.puntajeSalarial) < 0)) {
      errors.puntajeSalarial = 'Debe ser un número mayor o igual a cero.';
    }
    if (form.fechaInicioVinculacion && form.fechaFinVinculacion
      && form.fechaInicioVinculacion > form.fechaFinVinculacion) {
      errors.fechaFinVinculacion = 'Debe ser igual o posterior a la fecha de inicio.';
    }
    const visitante = form.tipoVinculacion === 'VISITANTE';
    const categoriaVisitante = String(form.escalafon || '').trim().toLowerCase() === 'visitante';
    if (visitante !== categoriaVisitante) {
      errors.escalafon = 'La vinculación Visitante exige categoría Visitante y viceversa.';
    }
  }

  if (step === 2) {
    const institutional = String(form.correoInstitucional || '').trim().toLowerCase();
    const alternative = String(form.correoAlternativo || '').trim().toLowerCase();
    if (institutional && (!EMAIL_REGEX.test(institutional) || !institutional.endsWith('@esap.edu.co'))) {
      errors.correoInstitucional = 'Debe ser un correo válido terminado en @esap.edu.co.';
    }
    if (alternative && !EMAIL_REGEX.test(alternative)) {
      errors.correoAlternativo = 'Ingrese un correo personal válido.';
    } else if (alternative && alternative === institutional) {
      errors.correoAlternativo = 'Debe ser diferente del correo institucional.';
    }
    if (form.telefono && !/^\d{7,15}$/.test(form.telefono)) {
      errors.telefono = 'Ingrese entre 7 y 15 dígitos, sin letras ni símbolos.';
    }
  }

  if (step === 3) {
    if (form.fechaNacimiento) {
      const age = computeManualAge(form.fechaNacimiento);
      if (age === null || age < 18 || age > 100) {
        errors.fechaNacimiento = 'La fecha debe corresponder a una edad entre 18 y 100 años.';
      }
    }
    if (options.isEditing) {
      if (!String(form.justificacionEdicion || '').trim()) {
        errors.justificacionEdicion = 'Explique brevemente el motivo de la edición.';
      }
      if (!options.supportFile) {
        errors.soporteEdicion = 'Adjunte el soporte documental obligatorio para editar.';
      }
    }
  }

  return errors;
}

export function validateManualBancoDocenteForm(
  form: ManualDocenteForm,
  options: { isEditing?: boolean; supportFile?: File | null; sensitiveDataRestricted?: boolean } = {},
): ManualDocenteErrors {
  return [0, 1, 2, 3].reduce(
    (all, step) => ({ ...all, ...validateManualBancoDocenteStep(form, step, options) }),
    {} as ManualDocenteErrors,
  );
}

export function getManualErrorStep(errors: ManualDocenteErrors): number {
  for (const step of [0, 1, 2, 3]) {
    if ((REQUIRED_BY_STEP[step] || []).some(([field]) => errors[field])) return step;
    if (step === 0 && ['dedicacionHorasSemana', 'puntajeSalarial', 'fechaFinVinculacion'].some((field) => errors[field])) return step;
    if (step === 2 && ['correoAlternativo', 'telefono'].some((field) => errors[field])) return step;
    if (step === 3 && ['soporteEdicion', 'justificacionEdicion'].some((field) => errors[field])) return step;
  }
  return 0;
}
